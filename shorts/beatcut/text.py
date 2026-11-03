"""Kinetic captions: one short line of explanation per shot, popped in word by
word on the beat, bouncing with the music and riding the camera shake so the
words feel attached to the picture rather than floating over it.

Markup in a caption line:
    *word*   accent colour (the word the viewer should remember)
    {n}      replaced by a count-up value (see shot "count" in the spec)
"""
import re
from functools import lru_cache

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"
FONT_SMALL = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"


def hex_bgr(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return (b, g, r)


def parse(line):
    """'IN *25 SECONDS*' -> [('IN', False), ('25', True), ('SECONDS', True)]"""
    words, hot = [], False
    for tok in re.split(r"(\*)", line):
        if tok == "*":
            hot = not hot
            continue
        for w in tok.split():
            words.append((w, hot))
    return words


@lru_cache(maxsize=512)
def sprite(word, size, color, font_path=FONT, stroke_ratio=0.085, shadow=True, tracking=0):
    """RGBA word sprite (BGRA numpy) with outline and soft drop shadow.
    Returns (bgra, anchor_x, anchor_y): the pixel in the sprite that sits on
    the text origin, so sprites line up on a shared baseline."""
    font = ImageFont.truetype(font_path, size)
    stroke = max(2, int(size * stroke_ratio))
    pad = stroke + int(size * 0.25)
    if tracking:
        widths = [font.getlength(c) for c in word]
        w = int(sum(widths) + tracking * (len(word) - 1))
    else:
        w = int(font.getlength(word))
    asc, desc = font.getmetrics()
    W, H = w + 2 * pad, asc + desc + 2 * pad
    fill = tuple(int(c) for c in color[::-1]) + (255,)  # BGR -> RGB
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def draw(dr, xy, fill_, stroke_fill):
        if tracking:
            x = xy[0]
            for c in word:
                dr.text((x, xy[1]), c, font=font, fill=fill_, stroke_width=stroke, stroke_fill=stroke_fill)
                x += font.getlength(c) + tracking
        else:
            dr.text(xy, word, font=font, fill=fill_, stroke_width=stroke, stroke_fill=stroke_fill)

    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        draw(ImageDraw.Draw(sh), (pad, pad + int(size * 0.07)), (0, 0, 0, 150), (0, 0, 0, 150))
        sh = sh.filter(ImageFilter.GaussianBlur(size * 0.09))
        img = Image.alpha_composite(img, sh)
        d = ImageDraw.Draw(img)
    draw(d, (pad, pad), fill, (8, 8, 12, 255))
    arr = np.array(img)[:, :, [2, 1, 0, 3]].copy()  # RGBA -> BGRA
    return arr, pad, pad


def ease_out_back(x, k=2.2):
    x = min(max(x, 0.0), 1.0)
    return 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def composite(frame, spr, cx, cy, scale=1.0, alpha=1.0):
    """Alpha-blend a BGRA sprite centred at (cx, cy) into a BGR uint8 frame."""
    if alpha <= 0.01:
        return
    if abs(scale - 1.0) > 0.003:
        spr = cv2.resize(spr, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
    h, w = spr.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    H, W = frame.shape[:2]
    sx0, sy0 = max(0, -x0), max(0, -y0)
    x0c, y0c = max(0, x0), max(0, y0)
    x1c, y1c = min(W, x0 + w), min(H, y0 + h)
    if x1c <= x0c or y1c <= y0c:
        return
    s = spr[sy0:sy0 + (y1c - y0c), sx0:sx0 + (x1c - x0c)]
    a = (s[:, :, 3:4].astype(np.float32) / 255.0) * alpha
    roi = frame[y0c:y1c, x0c:x1c].astype(np.float32)
    frame[y0c:y1c, x0c:x1c] = (roi * (1 - a) + s[:, :, :3].astype(np.float32) * a).astype(np.uint8)


class Caption:
    """Lays out a shot's lines once; draw() animates them for a given time."""

    def __init__(self, lines, size, width, accent, white=(255, 255, 255), kicker=None, count=None):
        self.lines_src = lines
        self.size = size
        self.max_w = width
        self.accent = accent
        self.white = white
        self.kicker = kicker
        self.count = count
        self.layout("" if count is None else self.fmt(count["to"]))

    def fmt(self, v):
        return self.count.get("fmt", "{:,.0f}").format(v)

    def layout(self, nstr):
        # shrink the font until the longest line fits the safe width
        size = self.size
        while True:
            font = ImageFont.truetype(FONT, size)
            space = font.getlength(" ")
            rows = []
            ok = True
            for line in self.lines_src:
                words = parse(line.replace("{n}", nstr))
                wl = [font.getlength(w) for w, _ in words]
                lw = sum(wl) + space * (len(words) - 1)
                if lw > self.max_w:
                    ok = False
                rows.append((words, wl, lw))
            if ok or size < 40:
                break
            size = int(size * 0.94)
        self.font_size = size
        lh = size * 1.06
        self.words = []  # (text, hot, x_offset_from_centre, y_offset_from_centre, is_count)
        n = len(rows)
        for r, (words, wl, lw) in enumerate(rows):
            x = -lw / 2
            y = (r - (n - 1) / 2) * lh
            for (w, hot), ww in zip(words, wl):
                self.words.append([w, hot, x + ww / 2, y, False])
                x += ww + space
        # mark the count-up word (the one that held {n})
        if self.count is not None:
            for wd in self.words:
                if nstr and nstr in wd[0]:
                    wd[4] = True
        self.half_h = n * lh / 2

    def draw(self, frame, cx, cy, age, spb, bounce=1.0, alpha=1.0, count_value=None, stagger=None):
        """age: seconds since the shot (caption) started. Words land on 8th
        notes unless the line is long (then faster) or a stagger is given."""
        if stagger is None:
            stagger = min(spb / 2, 1.6 * spb / max(1, len(self.words)))
        if self.kicker:
            k_spr, _, _ = sprite(self.kicker, int(self.font_size * 0.36), (235, 235, 235), FONT_SMALL, 0.12,
                                 True, int(self.font_size * 0.06))
            ka = ease_out(age / 0.15)
            composite(frame, k_spr, cx, cy - self.half_h - self.font_size * 0.34 + 14 * (1 - ka),
                      bounce, alpha * ka)
        for i, (w, hot, dx, dy, is_count) in enumerate(self.words):
            a = age - i * stagger
            if a < 0:
                continue
            pop = 1 + 0.5 * (1 - ease_out_back(a / 0.17))
            fade = min(1.0, a / 0.05)
            lift = 22 * (1 - ease_out(a / 0.17))
            txt = w
            if is_count and count_value is not None:
                txt = self.fmt(count_value) + w[len(self.fmt(self.count["to"])):]
            spr, _, _ = sprite(txt, self.font_size, self.accent if hot else self.white)
            composite(frame, spr, cx + dx * bounce, cy + (dy + lift) * bounce, pop * bounce, fade * alpha)
