#!/usr/bin/env python3
"""Make the paper ground for the ink-wash style.

    python3 make_paper.py [--ground e9e1cd] [--size 1080x1920] [--out paper.jpg]

Warm paper with slow mottling, a soft vignette and fine grain. Seeded, so the
same arguments always give the same sheet.
"""
import argparse

import numpy as np
from PIL import Image


def layer(rng, w, h, cells):
    small = rng.random((max(2, h // cells), max(2, w // cells))).astype(np.float32)
    im = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im, np.float32) / 255 - 0.5


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ground", default="e9e1cd")
    ap.add_argument("--size", default="1080x1920")
    ap.add_argument("--out", default="paper.jpg")
    ap.add_argument("--seed", type=int, default=4)
    a = ap.parse_args()
    w, h = (int(v) for v in a.size.split("x"))
    base = np.array([int(a.ground[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    rng = np.random.default_rng(a.seed)
    mottle = 0.55 * layer(rng, w, h, 420) + 0.3 * layer(rng, w, h, 150) + 0.15 * layer(rng, w, h, 40)
    grain = rng.normal(0, 1, (h, w)).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    vignette = -np.clip(r - 0.75, 0, None) * 26
    lum = mottle * 15 + grain * 2.2 + vignette
    img = base[None, None, :] + lum[:, :, None] * np.array([1.0, 1.0, 1.12], np.float32)
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(a.out, quality=90)
    print(f"wrote {a.out} {w}x{h}")


if __name__ == "__main__":
    main()
