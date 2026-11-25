#!/usr/bin/env python3
"""Contact sheets, so an agent can look at a video without watching it.

    python3 sheet.py VIDEO --out DIR [--measure DIR/measure.json] [--dense 36]
    python3 sheet.py VIDEO --out DIR --stills 0.5,12,33

Writes into DIR:
  hook.jpg    the first 3 seconds, 4 frames a second
  shots.jpg   one frame from the middle of every shot (needs --measure)
  dense.jpg   evenly spaced frames across the whole run
  end.jpg     the last 3 seconds, 2 frames a second
Every thumbnail carries its time in seconds. Raise --dense for a finer sheet
(to time captions, say). With --stills, writes only full-size frames at those
times (still_<t>.jpg) and leaves the sheets alone.
"""
import argparse
import io
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

THUMB_H = 420
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    return float(out.stdout.strip())


def frame(path, t, height=None):
    vf = ["-vf", f"scale=-2:{height}"] if height else []
    out = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(t, 0):.3f}", "-i", str(path),
                          "-frames:v", "1", *vf, "-f", "image2pipe", "-c:v", "png", "-"],
                         capture_output=True)
    if not out.stdout:
        return None
    return Image.open(io.BytesIO(out.stdout)).convert("RGB")


def grid(path, items, dest, cols):
    """items: list of (time, label)."""
    thumbs = []
    for t, label in items:
        im = frame(path, t, THUMB_H)
        if im is not None:
            thumbs.append((im, label))
    if not thumbs:
        return None
    tw, th = thumbs[0][0].size
    cols = min(cols, len(thumbs))
    rows = -(-len(thumbs) // cols)
    pad, bar = 6, 22
    sheet = Image.new("RGB", (cols * (tw + pad) + pad, rows * (th + bar + pad) + pad), (18, 18, 18))
    draw = ImageDraw.Draw(sheet)
    f = font(14)
    for i, (im, label) in enumerate(thumbs):
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + bar + pad)
        sheet.paste(im.resize((tw, th)), (x, y))
        draw.text((x + 2, y + th + 3), label, fill=(235, 235, 235), font=f)
    sheet.save(dest, quality=88)
    return dest


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", required=True)
    ap.add_argument("--measure", help="measure.json from measure.py, for the per-shot sheet")
    ap.add_argument("--stills", default="", help="comma-separated times for full-size frames")
    ap.add_argument("--dense", type=int, default=36, help="frames on the dense sheet")
    args = ap.parse_args()
    path = Path(args.video)
    if not path.is_file():
        sys.exit(f"no such file: {path}")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    dur = duration(path)
    wide = Image.open(io.BytesIO(subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-frames:v", "1", "-f", "image2pipe",
         "-c:v", "png", "-"], capture_output=True).stdout)).size
    cols = 6 if wide[1] >= wide[0] else 4
    made = []

    if args.stills:
        for t in [float(x) for x in args.stills.split(",") if x.strip()]:
            im = frame(path, min(t, dur - 0.05))
            if im is not None:
                dest = out / f"still_{t:g}.jpg"
                im.save(dest, quality=92)
                print(f"wrote {dest}")
        return

    hook = [(t / 4, f"{t / 4:.2f}s") for t in range(int(min(3.0, dur) * 4))]
    made.append(grid(path, hook, out / "hook.jpg", cols))

    if args.measure:
        shots = json.loads(Path(args.measure).read_text())["shots"]
        items = [((s["start"] + s["end"]) / 2,
                  f"shot {s['n']}  {s['start']:.2f}-{s['end']:.2f}s") for s in shots]
        made.append(grid(path, items, out / "shots.jpg", cols))

    n = max(2, min(args.dense, int(dur * 2)))
    dense = [((i + 0.5) * dur / n, f"{(i + 0.5) * dur / n:.2f}s") for i in range(n)]
    made.append(grid(path, dense, out / "dense.jpg", cols))

    start = max(0.0, dur - 3.0)
    end = [(min(start + i / 2, dur - 0.05), f"{min(start + i / 2, dur - 0.05):.2f}s")
           for i in range(int((dur - start) * 2) + 1)]
    made.append(grid(path, end, out / "end.jpg", cols))

    for m in made:
        if m:
            print(f"wrote {m}")


if __name__ == "__main__":
    main()
