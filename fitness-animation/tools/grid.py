#!/usr/bin/env python3
"""Draw a labelled pixel grid over a plate so you can read coordinates for
highlight regions (assets/plates/plates.js) and for pins/arrows.

  python3 tools/grid.py assets/plates/arm-front.webp            -> arm-front.grid.png next to it
  python3 tools/grid.py assets/plates/arm-front.webp --step 25 --crop 0,900,896,2200

Red verticals every 100 px (labelled), blue horizontals every 100 px (labelled),
dim lines every --step px. Coordinates are in the image's own pixels, which is
what region paths use.

Requires: pillow
"""
import argparse
import os

from PIL import Image, ImageDraw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("--step", type=int, default=50)
    ap.add_argument("--crop", default=None, help="x0,y0,x1,y1 in image pixels")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    im = Image.open(a.image).convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 0, 0, 255))
    bg.alpha_composite(im)
    img = bg.convert("RGB")
    x0 = y0 = 0
    if a.crop:
        x0, y0, x1, y1 = [int(v) for v in a.crop.split(",")]
        img = img.crop((x0, y0, x1, y1))
    d = ImageDraw.Draw(img)
    w, h = img.size
    for x in range((x0 // a.step) * a.step, x0 + w, a.step):
        major = x % 100 == 0
        d.line([(x - x0, 0), (x - x0, h)], fill=(255, 40, 40) if major else (90, 0, 0))
        if major:
            d.text((x - x0 + 3, 3), str(x), fill=(255, 230, 0))
    for y in range((y0 // a.step) * a.step, y0 + h, a.step):
        major = y % 100 == 0
        d.line([(0, y - y0), (w, y - y0)], fill=(0, 170, 255) if major else (0, 60, 110))
        if major:
            d.text((3, y - y0 + 3), str(y), fill=(0, 255, 255))
    out = a.out or os.path.splitext(a.image)[0] + ".grid.png"
    img.save(out)
    print(out, img.size)


if __name__ == "__main__":
    main()
