#!/usr/bin/env python3
"""Shorts thumbnail maker (1080x1920).

Recipe (see RECIPE.md, "Thumbnails"):
  * one peak-emotion frame, full bleed (no card / black bars), face in the centre safe zone
  * 2-line hook: small white set-up line + BIG keyword line in a story colour with glow
  * hook text complements the title instead of repeating it
  * punchy grade + vignette + dark gradient behind the text, nothing in the bottom 22% (Shorts UI)

Usage:  python3 thumbnail.py thumbs.json  (SRC_DIR=folder with <id>.mp4, OUT_DIR=output folder)
"""
import json, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
FONT = os.path.join(HERE, "fonts", "Montserrat-Black.ttf")
COLORS = {"yellow": (255, 216, 34), "red": (255, 59, 59), "green": (77, 255, 102),
          "cyan": (46, 226, 255), "pink": (255, 107, 180), "white": (255, 255, 255)}


def grab(src, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", src, "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                           "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().split(",")
    w, h = int(info[0]), int(info[1])
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)


def crop_916(img, fx, fy, zoom):
    h, w = img.shape[:2]
    ch = h / zoom; cw = ch * 9 / 16
    if cw > w:                       # vertical source
        cw = w / zoom; ch = cw * 16 / 9
    cx = min(max(w * fx, cw / 2), w - cw / 2); cy = min(max(h * fy, ch / 2), h - ch / 2)
    x0, y0 = int(cx - cw / 2), int(cy - ch / 2)
    c = img[y0:y0 + int(ch), x0:x0 + int(cw)]
    return cv2.resize(c, (W, H), interpolation=cv2.INTER_LANCZOS4)


def grade(rgb, contrast=1.12, sat=1.25, warm=6):
    f = rgb.astype(np.float32)
    f = (f - 128) * contrast + 128
    hsv = cv2.cvtColor(f.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] *= sat
    f = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    f[..., 0] += warm; f[..., 2] -= warm
    # unsharp
    blur = cv2.GaussianBlur(f, (0, 0), 2.0)
    f = f + 0.6 * (f - blur)
    # vignette
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.7)) ** 2)
    f *= (1 - 0.45 * np.clip(d, 0, 1) ** 2)[..., None]
    return f.clip(0, 255).astype(np.uint8)


def fit_font(draw, text, max_w, start):
    size = start
    while size > 40:
        f = ImageFont.truetype(FONT, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 4
    return ImageFont.truetype(FONT, size)


def text_layer(lines, y_center, colour):
    """lines: [(text, style)] style in {'small','big'}; returns RGBA overlay with glow + stroke."""
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over); g = ImageDraw.Draw(glow)
    fonts, heights = [], []
    for txt, st in lines:
        f = fit_font(d, txt, 960, 82 if st == "small" else 190)
        bb = d.textbbox((0, 0), txt, font=f, stroke_width=10)
        fonts.append(f); heights.append(bb[3] - bb[1])
    total = sum(heights) + 18 * (len(lines) - 1)
    y = y_center - total / 2
    col = COLORS[colour]
    for (txt, st), f, hgt in zip(lines, fonts, heights):
        tw = d.textlength(txt, font=f); x = (W - tw) / 2
        fill = col if st == "big" else (255, 255, 255)
        sw = 12 if st == "big" else 7
        if st == "big":
            g.text((x, y), txt, font=f, fill=col + (255,), stroke_width=sw + 14, stroke_fill=col + (255,))
        d.text((x + 6, y + 8), txt, font=f, fill=(0, 0, 0, 160), stroke_width=sw, stroke_fill=(0, 0, 0, 160))
        d.text((x, y), txt, font=f, fill=fill + (255,), stroke_width=sw, stroke_fill=(0, 0, 0, 255))
        y += hgt + 18
    glow = glow.filter(ImageFilter.GaussianBlur(28))
    a = np.array(glow); a[..., 3] = (a[..., 3] * 0.55).astype(np.uint8)
    return Image.alpha_composite(Image.fromarray(a), over)


def make(spec, src_dir, out_dir):
    img = grab(os.path.join(src_dir, spec["source"] + ".mp4"), spec["t"])
    rgb = grade(crop_916(img, spec.get("fx", 0.5), spec.get("fy", 0.45), spec.get("zoom", 1.0)))
    base = Image.fromarray(rgb).convert("RGBA")
    # dark gradient band behind the text
    y = spec.get("text_y", 520)
    band = np.zeros((H, W, 4), np.uint8)
    prof = np.exp(-((np.arange(H) - y) / 330.0) ** 2) * 150
    band[..., 3] = prof[:, None].astype(np.uint8)
    base = Image.alpha_composite(base, Image.fromarray(band))
    base = Image.alpha_composite(base, text_layer(spec["lines"], y, spec.get("color", "yellow")))
    out = os.path.join(out_dir, spec["name"] + ".jpg")
    base.convert("RGB").save(out, quality=92)
    return out


if __name__ == "__main__":
    specs = json.load(open(sys.argv[1]))
    src, out = os.environ.get("SRC_DIR", "."), os.environ.get("OUT_DIR", "thumbs")
    os.makedirs(out, exist_ok=True)
    for s in specs:
        print(make(s, src, out))
