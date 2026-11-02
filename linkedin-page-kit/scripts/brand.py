"""Shared brand tokens and drawing helpers for Zero Cost AI assets."""
from PIL import Image, ImageDraw, ImageFont

FONT_DIR = "/usr/share/fonts/opentype/inter/"
BG = (11, 18, 32)          # deep navy
BG2 = (17, 27, 46)         # card navy
GREEN = (34, 224, 122)     # money green accent
AMBER = (255, 176, 32)     # strike-through price
WHITE = (245, 247, 250)
MUTED = (150, 163, 184)
RED = (255, 92, 92)

def font(weight="Bold", size=48, display=False):
    fam = "InterDisplay" if display else "Inter"
    return ImageFont.truetype(f"{FONT_DIR}{fam}-{weight}.otf", size)

def wrap(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def text_block(draw, xy, text, fnt, fill, max_w, line_gap=1.15):
    x, y = xy
    for line in wrap(draw, text, fnt, max_w):
        draw.text((x, y), line, font=fnt, fill=fill)
        y += int(fnt.size * line_gap)
    return y

def pill(draw, xy, text, fnt, fg, bg, pad=(22, 12), radius=18):
    x, y = xy
    w = draw.textlength(text, font=fnt)
    box = (x, y, x + w + pad[0] * 2, y + fnt.size + pad[1] * 2)
    draw.rounded_rectangle(box, radius=radius, fill=bg)
    draw.text((x + pad[0], y + pad[1] - fnt.size * 0.08), text, font=fnt, fill=fg)
    return box

def zero_tag(draw, cx, cy, size, with_spark=True):
    """The brand mark: a rounded tag with '$0' and a small green spark."""
    r = size // 2
    draw.rounded_rectangle((cx - r, cy - r, cx + r, cy + r), radius=int(size * 0.22), fill=BG2, outline=GREEN, width=max(3, size // 40))
    f = font("Black", int(size * 0.5), display=True)
    t = "$0"
    w = draw.textlength(t, font=f)
    draw.text((cx - w / 2, cy - f.size * 0.62), t, font=f, fill=WHITE)
    if with_spark:
        s = size * 0.11
        sx, sy = cx + r * 0.55, cy - r * 0.55
        draw.polygon([(sx, sy - s), (sx + s * 0.35, sy - s * 0.2), (sx + s, sy), (sx + s * 0.35, sy + s * 0.2),
                      (sx, sy + s), (sx - s * 0.35, sy + s * 0.2), (sx - s, sy), (sx - s * 0.35, sy - s * 0.2)], fill=GREEN)

def grid(draw, w, h, step=60, color=(20, 30, 50)):
    for x in range(0, w, step):
        draw.line((x, 0, x, h), fill=color, width=1)
    for y in range(0, h, step):
        draw.line((0, y, w, y), fill=color, width=1)
