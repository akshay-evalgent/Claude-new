#!/usr/bin/env python3
"""Make the paper ground for the stipple-lyric style.

    python3 make_paper.py [--ground e0d2bf] [--edge 29] [--size 1920x1080] [--out paper.jpg]

A cream sheet that is lightest in the middle and warmer and darker toward the
corners, with slow mottling, a faint upright grain and fine tooth. Grown from
the ink-wash kit's generator; the difference is the edge: here the sheet falls
off from the centre outward (by --edge levels of brightness at the corners,
losing blue fastest), which is what gives the ground its three tones.

--ground is the colour at the centre of the sheet, not the colour a palette
tool will report: the measured ground comes out a little darker. Check the
result with tools/palette.py, not the value typed. Seeded: the same arguments
always give the same sheet.
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
    ap.add_argument("--ground", default="e0d2bf", help="colour at the centre of the sheet")
    ap.add_argument("--edge", type=float, default=29, help="levels of brightness lost at the corners")
    ap.add_argument("--size", default="1920x1080")
    ap.add_argument("--out", default="paper.jpg")
    ap.add_argument("--seed", type=int, default=11)
    a = ap.parse_args()
    w, h = (int(v) for v in a.size.split("x"))
    base = np.array([int(a.ground[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    rng = np.random.default_rng(a.seed)

    # slow clouds, so no two parts of the sheet are quite the same tone
    mottle = 0.5 * layer(rng, w, h, 620) + 0.3 * layer(rng, w, h, 230) + 0.2 * layer(rng, w, h, 60)
    # upright grain: the sheet's own fibre direction, a few levels at most
    strip = rng.random((1, max(2, w // 26))).astype(np.float32)
    laid = np.asarray(Image.fromarray((strip * 255).astype(np.uint8)).resize((w, 8), Image.BICUBIC), np.float32)[0] / 255 - 0.5
    laid = laid[None, :] * (0.75 + 0.5 * (layer(rng, w, h, 300) + 0.5))
    tooth = rng.normal(0, 1, (h, w)).astype(np.float32)

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r2 = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2      # 1 at the middle of an edge, 2 at a corner
    fall = -a.edge * (r2 / 2) ** 1.3         # flat across the middle, steeper toward the corners

    tone = mottle * 9 + laid * 2.6 + tooth * 1.5
    img = (base[None, None, :]
           + tone[:, :, None] * np.array([0.92, 1.0, 1.2], np.float32)
           + fall[:, :, None] * np.array([0.72, 1.04, 1.58], np.float32))
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(a.out, quality=92)
    print(f"wrote {a.out} {w}x{h}")


if __name__ == "__main__":
    main()
