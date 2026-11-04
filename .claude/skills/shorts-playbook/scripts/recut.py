#!/usr/bin/env python3
"""Re-cut a short from a JSON spec: keep segments, add a hook card, close the loop.

Then verify the render: length, every audio join inside a voice gap, last frame
matches first, loudness.

Spec (paths relative to the repo root, or absolute):
{
  "source": "film/input/draft.mp4",
  "output": "film/saroo/out/saroo-v2.mp4",
  "join_frames": 2,                 # dissolve + audio crossfade length, in frames
  "loop_seconds": 0.5,              # 0 = no loop dissolve
  "crf": 18,
  "segments": [[1.367, 12.1, "what is said"], ...],   # source seconds
  "hook": {                         # optional title card over the opening
    "seconds": 2.6, "fade": 0.3, "top": 150,
    "card": "#060a18", "border": "#ffd53f",
    "lines": [
      {"text": "THE TRUE STORY BEHIND LION", "size": 38, "weight": "Bold",
       "color": "#ebeef5", "spacing": 7},
      {"text": "HE FOUND HIS WAY HOME", "size": 84, "weight": "ExtraBold", "color": "#ffffff"},
      {"text": "ON GOOGLE EARTH", "size": 104, "weight": "Black", "color": "#ffd53f"}
    ]
  }
}
Cut points: take them from the audit's pauses.json ("mid" of a gap). Start each
segment 1-2 frames before its first word, so the fade-in finishes before speech.

Usage:
  python3 recut.py spec.json            # render + verify
  python3 recut.py spec.json --plan     # cut list and new length only
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_URL = ("https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/"
            "Montserrat%5Bwght%5D.ttf")
FONT_CACHE = os.path.expanduser("~/.cache/shorts-playbook/Montserrat-VF.ttf")
FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def repo_root() -> str:
    out = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True,
                         cwd=HERE).stdout.strip()
    return out or os.getcwd()


def resolve(p: str) -> str:
    return p if os.path.isabs(p) else os.path.join(repo_root(), p)


def probe(path):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                   "stream=codec_type,width,height,r_frame_rate:format=duration",
                                   "-of", "json", path], capture_output=True, text=True).stdout)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    n, d = v["r_frame_rate"].split("/")
    return float(n) / float(d), v["width"], v["height"], float(j["format"]["duration"])


def hexrgb(h: str):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(size, weight):
    from PIL import ImageFont
    if not os.path.exists(FONT_CACHE):
        try:
            os.makedirs(os.path.dirname(FONT_CACHE), exist_ok=True)
            urllib.request.urlretrieve(FONT_URL, FONT_CACHE)
        except OSError:
            return ImageFont.truetype(FALLBACK, size)
    f = ImageFont.truetype(FONT_CACHE, size)
    try:
        f.set_variation_by_name(weight)
    except Exception:
        pass
    return f


def hook_card(hook: dict, W: int, H: int, path: str) -> None:
    """Transparent PNG: rounded card at the top, lines centred, sized to fit."""
    from PIL import Image, ImageDraw, ImageFilter
    x0, x1, top, pad, gap = 48, W - 48, hook.get("top", 150), 46, 26
    probe_d = ImageDraw.Draw(Image.new("RGBA", (W, H)))
    max_w = (x1 - x0) - 88
    placed, y = [], top + pad
    for ln in hook["lines"]:
        size, weight, spacing = ln.get("size", 80), ln.get("weight", "ExtraBold"), ln.get("spacing", 0)
        f = font(size, weight)
        while size > 20 and probe_d.textlength(ln["text"], font=f) + spacing * len(ln["text"]) > max_w:
            size -= 2
            f = font(size, weight)
        l, t, r, b = probe_d.textbbox((0, 0), ln["text"], font=f, stroke_width=0 if spacing else 3)
        placed.append((ln["text"], f, hexrgb(ln.get("color", "#ffffff")), spacing, y - t))
        y += (b - t) + gap
    y1 = y - gap + pad
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0, top + 10, x1, y1 + 10), 36, fill=(0, 0, 0, 150))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(18)))
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle(
        (x0, top, x1, y1), 36, fill=hexrgb(hook.get("card", "#060a18")) + (255,),
        outline=hexrgb(hook.get("border", "#ffd53f")) + (255,), width=4)
    img = Image.alpha_composite(img, card)
    d = ImageDraw.Draw(img)
    for text, f, color, spacing, y in placed:
        if spacing:
            ws = [d.textlength(ch, font=f) for ch in text]
            x = (W - (sum(ws) + spacing * (len(text) - 1))) / 2
            for ch, wch in zip(text, ws):
                d.text((x, y), ch, font=f, fill=color)
                x += wch + spacing
        else:
            d.text(((W - d.textlength(text, font=f)) / 2, y), text, font=f, fill=color,
                   stroke_width=3, stroke_fill=(0, 0, 0))
    img.save(path)


def plan(spec, fps):
    xf = spec.get("join_frames", 2) / fps
    segs = [(round(a * fps) / fps, round(b * fps) / fps, txt) for a, b, txt in spec["segments"]]
    t, rows = 0.0, []
    for a, b, txt in segs:
        rows.append((a, b, t, t + b - a, txt))
        t += b - a - xf
    return segs, xf, t + xf, rows


def render(spec, spec_path):
    src, out = resolve(spec["source"]), resolve(spec["output"])
    fps, W, H, _ = probe(src)
    segs, xf, length, _ = plan(spec, fps)
    loop = spec.get("loop_seconds", 0.5)
    os.makedirs(os.path.dirname(out), exist_ok=True)

    parts = []
    for i, (a, b, _) in enumerate(segs):
        parts.append(f"[0:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,fps={fps:g}[v{i}]")
        parts.append(f"[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS,aresample=48000[a{i}]")
    vp, apr, L = "v0", "a0", segs[0][1] - segs[0][0]
    for i in range(1, len(segs)):
        off = L - xf
        parts.append(f"[{vp}][v{i}]xfade=transition=fade:duration={xf:.4f}:offset={off:.4f}[vx{i}]")
        parts.append(f"[{apr}][a{i}]acrossfade=d={xf:.4f}:c1=qsin:c2=qsin[ax{i}]")
        vp, apr, L = f"vx{i}", f"ax{i}", off + segs[i][1] - segs[i][0]

    inputs = ["-i", src]
    hook = spec.get("hook")
    if hook:
        card = os.path.join(os.path.dirname(out), ".hook_card.png")
        hook_card(hook, W, H, card)
        on, fade = hook.get("seconds", 2.6), hook.get("fade", 0.3)
        inputs += ["-loop", "1", "-framerate", f"{fps:g}", "-t", f"{on + fade + 0.1:.2f}", "-i", card]
        parts.append(f"[1:v]format=rgba,fade=t=out:st={on:.3f}:d={fade:.3f}:alpha=1[card]")
        parts.append(f"[{vp}][card]overlay=0:0:eof_action=pass,format=yuv420p[vh]")
        vp = "vh"
    if loop > 0:
        parts.append(f"[{vp}]split[main][ff]")
        parts.append(f"[ff]trim=end_frame=1,loop=loop={int(loop * fps) + 3}:size=1:start=0,"
                     f"setpts=N/{fps:g}/TB,fps={fps:g}[first]")
        # end one frame early so the final frame is exactly frame 0
        parts.append(f"[main][first]xfade=transition=fade:duration={loop:.4f}:"
                     f"offset={L - loop - 1 / fps:.4f}[vout]")
        parts.append(f"[{apr}]afade=t=out:st={L - loop:.4f}:d={loop:.4f},atrim=end={L:.4f}[aout]")
    else:
        parts.append(f"[{vp}]format=yuv420p[vout]")
        parts.append(f"[{apr}]atrim=end={L:.4f}[aout]")

    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(parts),
           "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "slow",
           "-crf", str(spec.get("crf", 18)), "-pix_fmt", "yuv420p", "-r", f"{fps:g}",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{L:.4f}",
           "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out, segs, xf, L, fps


def voice_env(path):
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", wav],
                       check=True)
        w = wave.open(wav)
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    win = 640
    band = (np.fft.rfftfreq(win, 1 / sr) > 250) & (np.fft.rfftfreq(win, 1 / sr) < 3500)

    def at(t):
        i = max(0, int(t * sr) - win // 2)
        seg = x[i:i + win]
        if len(seg) < win:
            return float("nan")
        return float(10 * np.log10((np.abs(np.fft.rfft(seg * np.hanning(win))) ** 2)[band].sum() + 1e-12))
    return at


def verify(src, out, segs, xf, L, fps, loop):
    print("\nVerify")
    _, _, _, dur = probe(out)
    flag = []
    print(f"  length {dur:.2f} s" + ("  <-- over 60 s" if dur > 60 else ""))
    if dur > 60:
        flag.append("over 60 s")
    src_at = voice_env(src)
    # source levels for scale: typical gap and speech
    probe_ts = np.linspace(0.5, segs[-1][1] - 0.5, 400)
    lv = np.array([src_at(t) for t in probe_ts])
    gap, speech = np.nanpercentile(lv, 25), np.nanpercentile(lv, 75)
    at = voice_env(out)
    limit = (gap + speech) / 2
    print(f"  audio joins (voice band dB; gaps ~{gap:.0f}, speech ~{speech:.0f}, flag above {limit:.0f})")
    t = segs[0][1] - segs[0][0]
    for i in range(1, len(segs)):
        a, b = t - xf, t
        vals = [at(a + 0.005), at((a + b) / 2), at(b - 0.005)]
        bad = max(vals) > limit
        print(f"    join {i}: {a:6.2f}-{b:6.2f} s  " + "  ".join(f"{v:5.1f}" for v in vals)
              + ("  <-- speech in the fade: move the cut into a gap" if bad else ""))
        if bad:
            flag.append(f"join {i}")
        t = t - xf + segs[i][1] - segs[i][0]
    if loop > 0:
        def grab(n):
            raw = subprocess.run(["ffmpeg", "-v", "error", "-i", out, "-vf",
                                  f"select=eq(n\\,{n}),scale=270:480", "-frames:v", "1",
                                  "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
            return np.frombuffer(raw, np.uint8).reshape(480, 270, 3).astype(int)
        n = int(round(dur * fps))
        diff = float(np.abs(grab(0) - grab(n - 1)).mean())
        print(f"  loop: last vs first frame {diff:.1f}/255" + ("  <-- jump" if diff > 3 else ""))
        if diff > 3:
            flag.append("loop")
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", out, "-af", "ebur128=peak=true",
                          "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
    i = re.findall(r"I:\s+(-?[0-9.]+) LUFS", err)
    p = re.findall(r"Peak:\s+(-?[0-9.]+) dBFS", err)
    print(f"  loudness {i[-1] if i else '?'} LUFS, peak {p[-1] if p else '?'} dBFS")
    print("  " + ("OK" if not flag else "CHECK: " + ", ".join(flag)))
    return not flag


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("spec")
    ap.add_argument("--plan", action="store_true")
    args = ap.parse_args()
    spec = json.load(open(args.spec))
    fps, *_ = probe(resolve(spec["source"]))
    segs, xf, length, rows = plan(spec, fps)
    print(f"{'#':>2} {'source':>15} {'new':>15}  line")
    for k, (a, b, n0, n1, txt) in enumerate(rows, 1):
        print(f"{k:>2} {a:6.2f}-{b:6.2f}s {n0:6.2f}-{n1:6.2f}s  {txt[:72]}")
    print(f"\nNew length {length:.2f} s")
    if args.plan:
        return
    out, segs, xf, L, fps = render(spec, args.spec)
    print(f"\nRendered {out}")
    ok = verify(resolve(spec["source"]), out, segs, xf, L, fps, spec.get("loop_seconds", 0.5))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
