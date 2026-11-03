"""Check a finished render before posting.

    python3 -m beatcut.qa episodes/artemis-i

  - cut sync: finds every hard cut in the picture and reports how far it lands
    from the nearest beat (in frames)
  - loudness: integrated LUFS / true peak of each output
  - sheet.jpg: three frames per shot (in, middle, out)
  - safe.jpg: middle frames with the YouTube Shorts UI zones drawn on top
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"

# Approximate Shorts player overlays on a 1080x1920 frame (they vary by device):
# top bar, right-hand action buttons, bottom title/channel/sound strip.
UI_ZONES = [(0, 0, 1080, 150, "top bar"), (940, 960, 1080, 1700, "buttons"), (0, 1540, 1080, 1920, "title / channel")]


def frames_gray(path, w=108, h=192):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def detect_cuts(fr, fps):
    """A cut is a frame whose change from the previous frame is a large spike
    against its neighbourhood and whose structure decorrelates."""
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    cuts = []
    for i in range(1, len(d) - 1):
        lo, hi = max(0, i - 6), min(len(d), i + 7)
        neigh = np.median(np.r_[d[lo:i], d[i + 1:hi]])
        a, b = fr[i] - fr[i].mean(), fr[i + 1] - fr[i + 1].mean()
        corr = (a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-6)
        if d[i] > 8 and d[i] > 2.5 * neigh and corr < 0.75:
            cuts.append((i + 1) / fps)
    # merge cuts closer than 3 frames (transitions span a few frames)
    out = []
    for c in cuts:
        if not out or c - out[-1] > 3 / fps:
            out.append(c)
    return out


def loudness(path):
    err = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1]
    p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)[-1]
    return float(i), float(p)


def grab(path, t, w=270):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1",
                          "-vf", f"scale={w}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
                         capture_output=True, check=True).stdout
    import io
    return Image.open(io.BytesIO(raw)).convert("RGB")


def main(ep_dir):
    ep = Path(ep_dir)
    out = ep / "out"
    tl = json.loads((out / "timeline.json").read_text())
    video = out / "short.mp4"
    fps = 30
    fr = frames_gray(video)
    cuts = detect_cuts(fr, fps)
    beats = np.array(tl["beats"])
    print(f"duration {len(fr) / fps:.2f}s  bpm {tl['bpm']}  planned shot starts {len(tl['cuts'])}")
    print("detected cuts (s) -> nearest beat offset (frames):")
    offs = []
    for c in cuts:
        j = int(np.argmin(np.abs(beats - c)))
        off = (c - beats[j]) * fps
        offs.append(off)
        planned = "planned" if min(abs(np.array(tl["cuts"]) - c)) < 2.5 / fps else "in-shot"
        print(f"  {c:6.3f}s  beat {j:2d}  {off:+.1f} f  ({planned})")
    on = sum(abs(o) <= 1.0 for o in offs)
    print(f"cuts within 1 frame of a beat: {on}/{len(offs)}")
    for name in ("short.mp4", "short_app_sound.mp4"):
        i, p = loudness(out / name)
        print(f"{name}: {i:.1f} LUFS integrated, {p:.1f} dBFS true peak")

    # contact sheet: in / mid / out of every shot
    starts = tl["cuts"] + [tl["duration"]]
    font = ImageFont.truetype(FONT, 18)
    rows = []
    for k in range(len(starts) - 1):
        a, b = starts[k], starts[k + 1]
        ts = [a + 2 / fps, (a + b) / 2, b - 2 / fps]
        rows.append([(t, grab(video, t)) for t in ts])
    w, h = rows[0][0][1].size
    per_row = 3 * 3  # three shots per sheet row
    ncol = per_row
    nrow = (len(rows) + 2) // 3
    sheet = Image.new("RGB", (ncol * w + 2 * 12, nrow * h), "black")
    for k, row in enumerate(rows):
        for j, (t, im) in enumerate(row):
            d = ImageDraw.Draw(im)
            d.rectangle([0, 0, 92, 24], fill=(0, 0, 0))
            d.text((4, 2), f"{k + 1}  {t:.2f}", font=font, fill=(255, 220, 0))
            x = (k % 3) * (3 * w + 12) + j * w
            sheet.paste(im, (x, (k // 3) * h))
    sheet.save(out / "sheet.jpg", quality=86)

    # safe zones over the middle frame of each shot
    mids = [row[1][1].resize((270, 480)) for row in rows]
    safe = Image.new("RGB", (270 * 7, 480 * ((len(mids) + 6) // 7)), "black")
    for k, im in enumerate(mids):
        ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        for x0, y0, x1, y1, _ in UI_ZONES:
            d.rectangle([x0 / 4, y0 / 4, x1 / 4, y1 / 4], fill=(255, 40, 40, 70), outline=(255, 60, 60, 200))
        im = Image.alpha_composite(im.convert("RGBA"), ov).convert("RGB")
        safe.paste(im, ((k % 7) * 270, (k // 7) * 480))
    safe.save(out / "safe.jpg", quality=86)
    print(f"wrote {out / 'sheet.jpg'} and {out / 'safe.jpg'}")


if __name__ == "__main__":
    main(sys.argv[1])
