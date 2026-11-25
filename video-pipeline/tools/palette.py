#!/usr/bin/env python3
"""Pull the colour palette out of a video or a set of images.

    python3 palette.py VIDEO_OR_IMAGES... --out DIR

Writes DIR/palette.json and DIR/palette.png. Reports the main colours by share
of the picture, plus the accent: the small amount of strong colour that a
by-share palette would miss (the one red mark on an ink drawing).
"""
import argparse
import colorsys
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

VIDEO_EXT = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi"}


def pixels_from(path):
    path = Path(path)
    if path.suffix.lower() in VIDEO_EXT:
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-an",
                              "-vf", "fps=2,scale=180:-2:flags=bilinear,format=rgb24",
                              "-f", "rawvideo", "-"], capture_output=True).stdout
        return np.frombuffer(raw, np.uint8).reshape(-1, 3)
    im = Image.open(path).convert("RGB")
    im.thumbnail((160, 160))
    return np.asarray(im).reshape(-1, 3)


def kmeans(x, k, seed=0, rounds=25):
    rng = np.random.default_rng(seed)
    cent = x[rng.choice(len(x), k, replace=False)].astype(np.float32)
    for _ in range(rounds):
        dist = ((x[:, None, :] - cent[None, :, :]) ** 2).sum(axis=2)
        lab = dist.argmin(axis=1)
        new = np.array([x[lab == j].mean(axis=0) if (lab == j).any() else cent[j] for j in range(k)])
        if np.allclose(new, cent, atol=0.5):
            break
        cent = new
    return cent, lab


def hexc(rgb):
    return "#%02x%02x%02x" % tuple(int(round(float(c))) for c in rgb)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("inputs", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("-k", type=int, default=6)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    px = np.concatenate([pixels_from(p) for p in args.inputs]).astype(np.float32)
    if len(px) < 100:
        sys.exit("no pixels read")
    rng = np.random.default_rng(0)
    sample = px[rng.choice(len(px), 60000, replace=False)] if len(px) > 60000 else px

    cent, lab = kmeans(sample, args.k)
    share = np.bincount(lab, minlength=args.k) / len(sample)
    order = np.argsort(-share)
    colours = [{"hex": hexc(cent[j]), "share": round(float(share[j]), 4)} for j in order if share[j] > 0]

    # the accent is looked for in every pixel: a sample would miss a small mark
    mx, mn = px.max(axis=1), px.min(axis=1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    val = mx / 255.0
    strong = (sat > 0.55) & (val > 0.35)
    accent = None
    if strong.mean() > 0.0002:
        sp = px[strong]
        sp = sp[rng.choice(len(sp), 4000, replace=False)] if len(sp) > 4000 else sp
        hues = np.array([colorsys.rgb_to_hsv(*(p / 255.0))[0] for p in sp])
        ang = hues * 2 * np.pi
        mean_h = (np.arctan2(np.sin(ang).mean(), np.cos(ang).mean()) / (2 * np.pi)) % 1.0
        near = np.abs(((hues - mean_h + 0.5) % 1.0) - 0.5) < 0.08
        base = sp[near] if near.any() else sp
        accent = {"hex": hexc(np.median(base, axis=0)), "share": round(float(strong.mean()), 5),
                  "hue_deg": round(float(mean_h * 360), 1),
                  "single_hue": bool(near.mean() > 0.8)}

    lum = 0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2]
    result = {
        "inputs": [str(p) for p in args.inputs],
        "colours": colours,
        "ground": colours[0]["hex"],
        "accent": accent,
        "luminance_mean": round(float(lum.mean()) / 255, 3),
        "saturation_mean": round(float(sat.mean()), 3),
        "dark_share": round(float((lum < 64).mean()), 4),
        "colourfulness": "monochrome with one accent" if sat.mean() < 0.2 and accent and accent["single_hue"]
        else "monochrome" if sat.mean() < 0.2 else "muted" if sat.mean() < 0.4 else "saturated",
    }
    (out / "palette.json").write_text(json.dumps(result, indent=1))

    sw, h = 150, 150
    row = colours + ([{"hex": accent["hex"], "share": accent["share"], "accent": True}] if accent else [])
    im = Image.new("RGB", (sw * len(row), h + 44), (24, 24, 24))
    dr = ImageDraw.Draw(im)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except OSError:
        f = ImageFont.load_default()
    for i, c in enumerate(row):
        dr.rectangle([i * sw, 0, (i + 1) * sw - 1, h], fill=c["hex"])
        dr.text((i * sw + 6, h + 4), c["hex"], fill=(235, 235, 235), font=f)
        dr.text((i * sw + 6, h + 23), ("accent " if c.get("accent") else "") + f"{c['share']:.1%}",
                fill=(170, 170, 170), font=f)
    im.save(out / "palette.png")

    print(f"ground {result['ground']}, {result['colourfulness']}, "
          f"accent {accent['hex'] if accent else 'none'}")
    print("  " + "  ".join(f"{c['hex']} {c['share']:.0%}" for c in colours))
    print(f"wrote {out / 'palette.json'} and {out / 'palette.png'}")


if __name__ == "__main__":
    main()
