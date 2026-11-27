"""Textures drawn with PIL into $QS_SCRATCH/gen: the pool mosaic (with a dark lane line variant), the
remote's button face and the dimension labels."""
import os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.environ["QS_SCRATCH"], "gen")
FONT_B = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"


def mosaic(path, size=1024, n=40, seed=3, line=False):
    """1 m of 2.5 cm glass mosaic: aqua tiles with slight colour jitter, white grout, a soft sheen."""
    r = random.Random(seed)
    im = Image.new("RGB", (size, size), (225, 232, 232))
    d = ImageDraw.Draw(im)
    s = size / n
    g = max(2, int(s * 0.1))
    for j in range(n):
        for i in range(n):
            base = (62, 168, 205) if r.random() > 0.12 else (44, 140, 190)
            if r.random() < 0.05:
                base = (110, 196, 222)
            if line and n // 2 - 2 <= i <= n // 2 + 1:
                base = (18, 48, 102)
            c = tuple(max(0, min(255, int(v + r.uniform(-9, 9)))) for v in base)
            x0, y0 = int(i * s) + g // 2, int(j * s) + g // 2
            d.rectangle((x0, y0, int((i + 1) * s) - g // 2, int((j + 1) * s) - g // 2), fill=c)
    im = im.filter(ImageFilter.GaussianBlur(0.6))
    im.save(path)


def button_face(path, size=256):
    im = Image.new("RGB", (size, size), (20, 20, 22))
    d = ImageDraw.Draw(im)
    d.ellipse((40, 40, size - 40, size - 40), fill=(200, 20, 18))
    d.ellipse((70, 60, size - 110, size - 140), fill=(240, 90, 80))
    im = im.filter(ImageFilter.GaussianBlur(1.5))
    im.save(path)


def make_all():
    os.makedirs(OUT, exist_ok=True)
    mosaic(os.path.join(OUT, "mosaic.png"))
    mosaic(os.path.join(OUT, "mosaic_line.png"), line=True)
    button_face(os.path.join(OUT, "button.png"))


if __name__ == "__main__":
    make_all()
