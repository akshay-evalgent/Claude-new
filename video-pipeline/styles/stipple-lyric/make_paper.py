#!/usr/bin/env python3
"""Make the paper ground for the stipple-lyric style.

    python3 make_paper.py [--ground e0d2bf] [--edge 29] [--folds 3] [--specks 320] [--size 1920x1080] [--out paper.jpg]

A scanned sheet, not a gradient. It is lightest near the middle and warmer and
darker toward the corners, but not evenly: one side is duller than the other and
the fall-off is lopsided. On top of that:

  mottling   patches a few levels lighter and darker, longer than they are wide,
             with fairly definite edges (--mottle, levels; about 2 to 4 reads as paper)
  creases    a few soft ridges down the sheet (--creases, --crease)
  folds      sharp lines where the sheet was folded: a dark hairline with a light
             flank, wandering a little, fading in and out (--folds, --fold)
  specks     small flecks in the pulp, most darker, a few lighter, none as dark as ink
             and none a dash (--specks)
  tooth      fine grain

--ground is the colour at the centre of the sheet, not the colour a palette
tool will report: the measured ground comes out a little darker. Check the
result with tools/palette.py, not the value typed. The mean of each ring from
centre to corner depends only on --ground and --edge: the unevenness, the
mottling, the folds and the specks are balanced so they do not move it by more
than about a level. Seeded: the same arguments always give the same sheet.
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
    ap.add_argument("--mottle", type=float, default=3.6, help="how far the patches stand from the sheet, in levels")
    ap.add_argument("--uneven", type=float, default=5.0, help="how lopsided the sheet is, in levels")
    ap.add_argument("--creases", type=int, default=4, help="how many soft ridges run down the sheet")
    ap.add_argument("--crease", type=float, default=4.5, help="how strongly they show, in levels of brightness; 0 for none")
    ap.add_argument("--folds", type=int, default=3, help="how many sharp fold lines: the third and every third after it runs across")
    ap.add_argument("--fold", type=float, default=11, help="how dark a fold's hairline is, in levels; 0 for none")
    ap.add_argument("--specks", type=int, default=320, help="how many flecks in the pulp")
    ap.add_argument("--seed", type=int, default=11)
    a = ap.parse_args()
    w, h = (int(v) for v in a.size.split("x"))
    k = w / 1920
    base = np.array([int(a.ground[i:i + 2], 16) for i in (0, 2, 4)], np.float32)
    rng = np.random.default_rng(a.seed)

    def aniso(cx, cy):
        """noise with lumps cx wide and cy tall, -0.5 to 0.5"""
        small = rng.random((max(2, int(h / (cy * k))), max(2, int(w / (cx * k))))).astype(np.float32)
        return np.asarray(Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) / 255 - 0.5

    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r2 = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2      # 1 at the middle of an edge, 2 at a corner

    # slow clouds, so no two parts of the sheet are quite the same tone
    clouds = 0.5 * layer(rng, w, h, 620) + 0.3 * layer(rng, w, h, 230) + 0.2 * layer(rng, w, h, 60)
    # mottling: patches longer than they are wide, pushed toward two tones so they have edges
    m = 0.55 * aniso(70, 210) + 0.3 * aniso(34, 90) + 0.15 * aniso(16, 30)
    m = np.tanh(m / (m.std() + 1e-6) * 1.5)
    m2 = aniso(150, 420)
    patches = m * (0.75 + 0.5 * (m2 / (np.abs(m2).max() + 1e-6)))
    # upright grain: the sheet's own fibre direction, a few levels at most
    strip = rng.random((1, max(2, w // 26))).astype(np.float32)
    laid = np.asarray(Image.fromarray((strip * 255).astype(np.uint8)).resize((w, 8), Image.BICUBIC), np.float32)[0] / 255 - 0.5
    laid = laid[None, :] * (0.75 + 0.5 * (layer(rng, w, h, 300) + 0.5))
    tooth = rng.normal(0, 1, (h, w)).astype(np.float32)

    # lopsided: the sheet is not lit or aged evenly. A tilt across it plus one slow lump, with
    # each ring's mean taken out again so the centre-to-corner fall-off stays what --edge says
    lop = 0.9 * (xx / w - 0.5) * -1.0 + 0.55 * (yy / h - 0.5) + 1.2 * layer(rng, w, h, 900)
    ring = np.minimum((r2 / 2 * 12).astype(np.int32), 11)
    for i in range(12):
        sel = ring == i
        if sel.any():
            lop[sel] -= lop[sel].mean()
    lop = lop / (np.abs(lop).max() + 1e-6) * (0.35 + 0.65 * np.clip(r2 / 1.2, 0, 1))      # grows toward the edges

    # creases: each a soft ridge, lit on one side and shaded on the other, wandering a little
    # as it runs down the sheet and fading in and out along its length
    crease = np.zeros((h, w), np.float32)
    for c in np.sort(rng.uniform(0.06, 0.94, a.creases)):
        lean = rng.uniform(-0.035, 0.035)
        sway = rng.uniform(4, 12) * k
        x0 = c * w + lean * (yy - h / 2) + sway * np.sin(yy / h * rng.uniform(2, 5) + rng.uniform(0, 6.3))
        d = (xx - x0) / (rng.uniform(5, 9) * k)
        along = 0.35 + 0.65 * np.clip(0.5 + 0.5 * np.sin(yy / h * rng.uniform(2.5, 6) + rng.uniform(0, 6.3)) * 1.6, 0, 1)
        crease += rng.uniform(0.6, 1.0) * along * (-d * np.exp(-d * d / 2) * 1.2 - 0.35 * np.exp(-d * d / 6))

    # folds: a dark hairline about 2 px wide with a light flank on one side, where the sheet was
    # folded flat and opened again. It wanders a pixel or two and comes and goes along its length
    fold = np.zeros((h, w), np.float32)
    down = [0.318, 0.704, 0.52, 0.12, 0.88]
    across = [0.742, 0.27]
    for i in range(a.folds):
        flat = i % 3 == 2
        u, v, n, span = (yy, xx, h, w) if flat else (xx, yy, w, h)             # u runs across the fold, v along it
        at = (across[(i // 3) % len(across)] if flat else down[(i - i // 3) % len(down)]) * n
        at = at + rng.uniform(-0.004, 0.004) * (v - span / 2) \
            + 1.6 * k * np.sin(v / (rng.uniform(60, 110) * k) + rng.uniform(0, 6.3)) \
            + 0.8 * k * np.sin(v / (rng.uniform(17, 31) * k) + rng.uniform(0, 6.3))
        d = (u - at) / k
        along = np.clip(0.62 + 0.5 * np.sin(v / span * rng.uniform(5, 9) + rng.uniform(0, 6.3))
                        + 0.25 * np.sin(v / span * rng.uniform(19, 33) + rng.uniform(0, 6.3)), 0.12, 1)
        side = 1 if rng.random() < 0.5 else -1
        fold += along * (-np.exp(-d * d / (2 * 0.95 ** 2)) + 0.42 * np.exp(-(d - side * 4.5) ** 2 / (2 * 2.6 ** 2)))

    # specks: flecks in the pulp. Small, roundish, brown not black; one in seven is a pale fibre end
    speck = np.zeros((h, w), np.float32)
    for _ in range(a.specks):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        rad = (0.55 + 1.5 * rng.random() ** 2.4) * k
        deep = (-1 if rng.random() > 1 / 7 else 0.45) * rng.uniform(7, 26) * (0.6 + 0.4 * min(1.0, 1.2 / (rad / k)))
        sx, sy = rad * rng.uniform(0.8, 1.35), rad * rng.uniform(0.8, 1.35)
        x0, x1 = int(max(0, cx - 4 * sx)), int(min(w, cx + 4 * sx + 1))
        y0, y1 = int(max(0, cy - 4 * sy)), int(min(h, cy + 4 * sy + 1))
        if x1 <= x0 or y1 <= y0:
            continue
        g = np.exp(-(((xx[y0:y1, x0:x1] - cx) / sx) ** 2 + ((yy[y0:y1, x0:x1] - cy) / sy) ** 2) / 2)
        speck[y0:y1, x0:x1] += deep * g

    fall = -a.edge * (r2 / 2) ** 1.3         # flat across the middle, steeper toward the corners

    tone = (clouds * 8 + patches * a.mottle + lop * a.uneven + laid * 2.6
            + crease * a.crease + fold * a.fold + speck + tooth * 1.5)
    tone -= (patches * a.mottle + fold * a.fold + speck).mean()               # what was added does not darken the sheet
    img = (base[None, None, :]
           + tone[:, :, None] * np.array([0.92, 1.0, 1.2], np.float32)
           + fall[:, :, None] * np.array([0.66, 1.04, 1.78], np.float32))
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(a.out, quality=93)
    print(f"wrote {a.out} {w}x{h}")


if __name__ == "__main__":
    main()
