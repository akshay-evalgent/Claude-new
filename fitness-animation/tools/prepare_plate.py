#!/usr/bin/env python3
"""Cut an engraved figure off a scanned book plate and put it on black.

Built for the public-domain plates in Paul Richer, "Anatomie artistique" (1890),
vol. 2, scanned on Wikimedia Commons, but it works on any line drawing that has
a closed outline on light paper.

What it does:
  1. finds the ink (dark pixels) and closes small gaps in the outline,
  2. fills everything the page border can't reach -> the figure's silhouette,
  3. opens the silhouette with a wide brush so label text and leader lines
     fall away, keeps the largest piece, then grows it back by a few pixels,
  4. writes a grey + alpha image: paper inside the figure toned to a light
     pencil grey with a soft edge falloff, everything outside transparent.

Usage:
  python tools/prepare_plate.py IN.png OUT.webp [--seal x1,y1,x2,y2 ...]
         [--crop x0,y0,x1,y1] [--height 2200] [--open 41] [--preview P.jpg]

  --seal draws a straight ink line (in source pixels) to close an outline that
  the plate leaves open, e.g. a torso cut off at the thighs.
  --crop limits the work to one figure on a plate that has several.

Requires: numpy, pillow, opencv-python-headless
"""
import argparse

import cv2
import numpy as np
from PIL import Image


def parse_box(s):
    return [int(round(float(v))) for v in s.split(",")]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--seal", action="append", default=[], help="x1,y1,x2,y2")
    ap.add_argument("--erase", action="append", default=[],
                    help="x0,y0,x1,y1 box to blank (paper) before cutting, e.g. a stray label")
    ap.add_argument("--crop", default=None, help="x0,y0,x1,y1")
    ap.add_argument("--ink", type=int, default=170, help="grey below this is ink")
    ap.add_argument("--close", type=int, default=9, help="gap-closing brush, px")
    ap.add_argument("--open", type=int, default=41, help="label-removing brush, px")
    ap.add_argument("--grow", type=int, default=0,
                    help="grow (+) or shrink (-) the silhouette, px; shrinking trims the paper halo")
    ap.add_argument("--feather", type=float, default=14, help="edge fade width, source px")
    ap.add_argument("--height", type=int, default=2200, help="output height, px")
    ap.add_argument("--paper", type=int, default=232, help="paper tone 0-255 inside the figure")
    ap.add_argument("--falloff", type=float, default=0.22, help="edge darkening 0-1")
    ap.add_argument("--preview", default=None, help="write a preview on black")
    a = ap.parse_args()

    g = np.array(Image.open(a.src).convert("L"))
    if a.crop:
        x0, y0, x1, y1 = parse_box(a.crop)
        g = g[y0:y1, x0:x1]
    else:
        x0 = y0 = 0
    g = g.copy()
    for box in a.erase:
        ex0, ey0, ex1, ey1 = parse_box(box)
        g[max(0, ey0 - y0):max(0, ey1 - y0), max(0, ex0 - x0):max(0, ex1 - x0)] = 255

    ink = (g < a.ink).astype(np.uint8) * 255
    for s in a.seal:
        sx1, sy1, sx2, sy2 = parse_box(s)
        cv2.line(ink, (sx1 - x0, sy1 - y0), (sx2 - x0, sy2 - y0), 255, 7)

    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (a.close, a.close))
    closed = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, k)

    # Flood the background from a padded border; whatever stays unreached is figure.
    h, w = closed.shape
    pad = np.zeros((h + 2, w + 2), np.uint8)
    pad[1:-1, 1:-1] = closed
    flood = pad.copy()
    mask = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(flood, mask, (0, 0), 128)
    sil = (flood[1:-1, 1:-1] != 128).astype(np.uint8) * 255

    ko = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (a.open, a.open))
    sil = cv2.morphologyEx(sil, cv2.MORPH_OPEN, ko)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(sil, 8)
    if n <= 1:
        raise SystemExit("no figure found: try --seal to close the outline or a lower --open")
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    sil = (lab == big).astype(np.uint8) * 255
    # fill any interior holes the opening created
    flood = np.zeros((h + 2, w + 2), np.uint8)
    inv = cv2.bitwise_not(sil)
    cv2.floodFill(inv, flood, (0, 0), 0)
    sil = cv2.bitwise_or(sil, inv)
    if a.grow:
        r = abs(a.grow)
        kg = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
        sil = cv2.dilate(sil, kg) if a.grow > 0 else cv2.erode(sil, kg)

    ys, xs = np.where(sil > 0)
    m = 24
    by0, by1 = max(0, ys.min() - m), min(h, ys.max() + m)
    bx0, bx1 = max(0, xs.min() - m), min(w, xs.max() + m)
    g = g[by0:by1, bx0:bx1].astype(np.float32) / 255.0
    sil = sil[by0:by1, bx0:bx1]

    # Paper -> pencil grey; ink stays ink. Darken toward the outline for volume.
    paper = a.paper / 255.0
    tone = g * paper
    dist = cv2.distanceTransform(sil, cv2.DIST_L2, 5)
    scale = max(8.0, 0.06 * min(sil.shape))
    vol = 1.0 - a.falloff * (1.0 - np.clip(dist / scale, 0, 1)) ** 1.6
    tone = np.clip(tone * vol, 0, 1)

    # Soft edge: fade the outermost pixels to black so the paper rim dissolves.
    f = max(1.0, a.feather)
    alpha = np.clip(dist / f, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    out = np.dstack([tone, alpha])
    img = Image.fromarray((out * 255).round().astype(np.uint8), "LA")
    if a.height and img.height > a.height:
        img = img.resize((round(img.width * a.height / img.height), a.height), Image.LANCZOS)
    rgba = img.convert("RGBA")
    rgba.save(a.out, quality=92, method=6) if a.out.endswith(".webp") else rgba.save(a.out)
    print(f"{a.out}: {rgba.width}x{rgba.height}  source box {bx0 + x0},{by0 + y0},{bx1 + x0},{by1 + y0}")

    if a.preview:
        bg = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
        bg.alpha_composite(rgba)
        p = bg.convert("RGB")
        p.thumbnail((900, 900))
        p.save(a.preview, quality=88)


if __name__ == "__main__":
    main()
