#!/usr/bin/env python3
"""Visual "reveal" clips (1030x900) for Repo Reveal Shorts; used as breakdown.py segment sources.

    python3 fx_clips.py pip   spec.json out.mp4   # demo video: main crop + picture-in-picture inset crop
    python3 fx_clips.py crop  spec.json out.mp4   # demo video: one region, slow push
    python3 fx_clips.py wipe  spec.json out.mp4   # before/after with a moving slider
    python3 fx_clips.py kenburns spec.json out.mp4  # still image: animated zoom/pan between two boxes
    python3 fx_clips.py flip  spec.json out.mp4   # fast flipbook of stills (punch-in on each)

Boxes are [x0, y0, x1, y1] in source pixels.
  pip:      {"video", "in", "dur", "main": box, "inset": box, "inset_label": "HER FACE"}
  crop:     {"video", "in", "dur", "box": box, "speed": 1.0}
  wipe:     {"before": img, "after": img} or {"pair": img (left=before, right=after)},
            "crop": box (optional, applied to both), "dur", "hold": 0.6, "labels": true
  kenburns: {"image", "from": box, "to": box, "dur"}
  flip:     {"images": [img, ...], "each": 0.45, "crop_to_card": true}
"""
import json
import math
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

CW, CH, FPS = 1030, 900, 30
FONT = __import__("os").path.join(__import__("os").path.dirname(__file__), "fonts", "OpenSans-ExtraBold.ttf")


def run(cmd):
    cmd = cmd[:1] + ["-nostdin"] + cmd[1:] if cmd[0] == "ffmpeg" else cmd
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode:
        sys.exit(r.stderr[-1500:])


def writer(out):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{CW}x{CH}",
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out],
                            stdin=subprocess.PIPE)


def fit_box(box, aspect=CW / CH):
    """Grow a box to the card aspect ratio around its centre."""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if w / h < aspect:
        w = h * aspect
    else:
        h = w / aspect
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, t)))


def pip(spec, out):
    x0, y0, x1, y1 = [int(v) for v in fit_box(spec["main"])]
    ix0, iy0, ix1, iy1 = [int(v) for v in spec["inset"]]
    iw = 300; ih = int(iw * (iy1 - iy0) / (ix1 - ix0)) // 2 * 2
    lab = spec.get("inset_label", "")
    fl = ImageFont.truetype(FONT, 30)
    # inset frame decoration (border + label) as a transparent PNG overlay
    deco = Image.new("RGBA", (iw + 16, ih + 16 + (46 if lab else 0)), (0, 0, 0, 0)); d = ImageDraw.Draw(deco)
    d.rounded_rectangle((0, 0, iw + 15, ih + 15), 22, outline=(255, 226, 0, 255), width=6)
    if lab:
        tw = fl.getlength(lab); d.rounded_rectangle(((iw + 16 - tw) / 2 - 14, ih + 18, (iw + 16 + tw) / 2 + 14, ih + 60), 12, fill=(0, 0, 0, 200))
        d.text(((iw + 16 - tw) / 2, ih + 20), lab, font=fl, fill=(255, 226, 0, 255))
    deco_p = out + ".deco.png"; deco.save(deco_p)
    fg = (f"[0:v]trim=start={spec['in']}:duration={spec['dur'] + 0.1},setpts=PTS-STARTPTS,fps={FPS},split[a][b];"
          f"[a]crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={CW}:{CH}:flags=lanczos[m];"
          f"[b]crop={ix1 - ix0}:{iy1 - iy0}:{ix0}:{iy0},scale={iw}:{ih}:flags=lanczos[i];"
          f"[m][i]overlay=36:{CH - ih - 36 - (46 if lab else 0)}[mi];[mi][1:v]overlay=28:{CH - ih - 44 - (46 if lab else 0)},"
          f"trim=duration={spec['dur']},format=yuv420p[v]")
    run(["ffmpeg", "-v", "error", "-y", "-i", spec["video"], "-loop", "1", "-i", deco_p, "-filter_complex", fg,
         "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-an", out])


def crop(spec, out):
    sp = spec.get("speed", 1.0)
    head = f"[0:v]trim=start={spec['in']}:duration={spec['dur'] * sp + 0.1},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
    if spec.get("fit") == "contain":
        x0, y0, x1, y1 = [int(v) for v in spec["box"]]
        fg = (head + f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},split[a][b];"
              f"[a]scale={CW}:{CH}:force_original_aspect_ratio=increase,crop={CW}:{CH},boxblur=30:2,eq=brightness=-0.18[bg];"
              f"[b]scale={CW}:{CH}:force_original_aspect_ratio=decrease:flags=lanczos[fg];"
              f"[bg][fg]overlay=(W-w)/2:(H-h)/2,trim=duration={spec['dur']},format=yuv420p[v]")
    else:
        x0, y0, x1, y1 = [int(v) for v in fit_box(spec["box"])]
        fg = head + f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={CW}:{CH}:flags=lanczos,trim=duration={spec['dur']},format=yuv420p[v]"
    run(["ffmpeg", "-v", "error", "-y", "-i", spec["video"], "-filter_complex", fg, "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-an", out])


def contain(region):
    """Fit a region inside the card; fill the rest with a blurred, darkened copy of it."""
    s = min(CW / region.width, CH / region.height)
    fg = region.resize((max(1, round(region.width * s)), max(1, round(region.height * s))), Image.LANCZOS)
    if fg.size == (CW, CH):
        return fg.convert("RGB")
    sb = max(CW / region.width, CH / region.height)
    bg = region.resize((math.ceil(region.width * sb), math.ceil(region.height * sb)), Image.BILINEAR)
    l, t = (bg.width - CW) // 2, (bg.height - CH) // 2
    bg = bg.crop((l, t, l + CW, t + CH)).filter(ImageFilter.GaussianBlur(28))
    bg = Image.blend(bg.convert("RGB"), Image.new("RGB", (CW, CH), (0, 0, 0)), 0.45)
    bg.paste(fg.convert("RGB"), ((CW - fg.width) // 2, (CH - fg.height) // 2))
    return bg


def card_from(img, box=None, fit="cover"):
    if fit == "contain":
        return contain(img.crop([int(v) for v in box]) if box else img)
    if box:
        img = img.crop([int(v) for v in fit_box(box)])
    s = max(CW / img.width, CH / img.height)
    img = img.resize((math.ceil(img.width * s), math.ceil(img.height * s)), Image.LANCZOS)
    l, t = (img.width - CW) // 2, (img.height - CH) // 2
    return img.crop((l, t, l + CW, t + CH)).convert("RGB")


def wipe(spec, out):
    if "pair" in spec:
        p = Image.open(spec["pair"]).convert("RGB"); w = p.width // 2
        before, after = p.crop((0, 0, w, p.height)), p.crop((w, 0, 2 * w, p.height))
    else:
        before, after = Image.open(spec["before"]).convert("RGB"), Image.open(spec["after"]).convert("RGB")
    b, a = card_from(before, spec.get("crop")), card_from(after, spec.get("crop"))
    b = b.filter(ImageFilter.UnsharpMask(2, 60, 2)); a = a.filter(ImageFilter.UnsharpMask(2, 60, 2))
    dur, hold = spec.get("dur", 3.5), spec.get("hold", 0.6)
    n = int(dur * FPS); fl = ImageFont.truetype(FONT, 34)
    p = writer(out)
    for fr in range(n):
        t = fr / FPS
        x = int(CW * ease((t - hold) / max(0.1, dur - 2 * hold)))       # slider moves left -> right
        im = a.copy(); im.paste(b.crop((x, 0, CW, CH)), (x, 0))       # after on the left, before on the right
        d = ImageDraw.Draw(im)
        if 0 < x < CW:
            d.rectangle((x - 3, 0, x + 3, CH), fill=(255, 255, 255)); d.ellipse((x - 22, CH / 2 - 22, x + 22, CH / 2 + 22), fill=(255, 255, 255))
        if spec.get("labels", True):
            if x < CW - 220:
                d.rounded_rectangle((CW - 190, 24, CW - 24, 76), 14, fill=(0, 0, 0)); d.text((CW - 172, 30), "BEFORE", font=fl, fill=(255, 255, 255))
            if x > 220:
                d.rounded_rectangle((24, 24, 178, 76), 14, fill=(255, 226, 0)); d.text((42, 30), "AFTER", font=fl, fill=(0, 0, 0))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def kenburns(spec, out):
    img = Image.open(spec["image"]).convert("RGB")
    f0, f1 = spec["from"], spec["to"]; n = int(spec.get("dur", 4) * FPS)
    small = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)      # faster frames when zoomed out
    p = writer(out)
    for fr in range(n):
        k = ease(fr / max(1, n - 1))
        b = [f0[i] + (f1[i] - f0[i]) * k for i in range(4)]
        b = [max(0, b[0]), max(0, b[1]), min(img.width, b[2]), min(img.height, b[3])]
        src, sc = (small, 0.5) if (b[2] - b[0]) > 2 * CW else (img, 1.0)
        im = contain(src.crop(tuple(int(v * sc) for v in b)))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def flip(spec, out):
    each = spec.get("each", 0.45); n_each = int(each * FPS)
    cards = [card_from(Image.open(f).convert("RGB"), spec.get("crop"), spec.get("fit", "cover")) for f in spec["images"]]
    p = writer(out)
    for c in cards:
        for fr in range(n_each):
            z = 1.06 - 0.06 * ease(fr / max(1, n_each - 1))           # punch in, settle
            w, h = CW / z, CH / z
            im = c.resize((CW, CH), Image.LANCZOS, box=((CW - w) / 2, (CH - h) / 2, (CW + w) / 2, (CH + h) / 2))
            p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


if __name__ == "__main__":
    kind, spec, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    {"pip": pip, "crop": crop, "wipe": wipe, "kenburns": kenburns, "flip": flip}[kind](spec, out)
    print(out)
