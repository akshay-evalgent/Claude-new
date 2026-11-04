"""Story edits cut to an existing soundtrack, timed in seconds.

Use this when the music comes from a reference edit: copy that edit's
transition times (they already sit on the song's hits) and drop your own
shots, captions and effects into the same slots.

    python3 -m beatcut.story episodes/messi-respect            # full render
    python3 -m beatcut.story episodes/messi-respect --stills   # one frame per shot

Spec (episode/story.json):
  size, fps, music.file
  shots:       [{clip, in, t0, t1, speed, focus, focus_to, zoom_keys, handheld}]
  transitions: [{t, type: white|leak|tvoff|cut|glitch, a, b}]   a/b = seconds before/after t
  captions:    [{t0, t1, lines, y, size, cps}]   cps 0 = all at once, else typed per letter
               word colours: ^w white ^y yellow ^r red ^c cyan ^m magenta ^g green ^x multicolour letters
  overlays:    arrow {t0, t1, tail, tip, bend}, sparkles {t0, t1, n}, heart {t, ...}
  flicker:     [[t0, t1], ...]   alternate-frame exposure flicker
  fade_in, fade_out: [t0, t1]
"""
import argparse
import json
import math
import subprocess
from functools import lru_cache
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .render import ClipReader, Look, affine, smoothstep, ease_out, ease_in, lerp

HERE = Path(__file__).resolve().parent.parent
FONT = str(HERE / "fonts" / "Poppins-ExtraBold.ttf")
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"

NEON = {"w": (255, 255, 255), "y": (255, 226, 30), "r": (255, 40, 48), "c": (45, 240, 255),
        "m": (255, 60, 215), "g": (60, 255, 95)}  # RGB
MULTI = ["c", "y", "w", "r", "y", "c", "w"]


# ---------------------------------------------------------------- frames

class BlendReader(ClipReader):
    """ClipReader that cross-fades neighbouring source frames, so slow motion
    from a low frame-rate source moves smoothly instead of stepping."""

    def get(self, t):
        p = (t - self.start) * self.fps
        k = int(math.floor(p + 1e-6))
        while self.k < k + 1:
            prev = self.frame
            if not self._read():
                break
            self.prev = prev
        if getattr(self, "prev", None) is None or self.k == 0:
            return self.frame
        a = min(max(p - (self.k - 1), 0.0), 1.0)
        return cv2.addWeighted(self.prev, 1 - a, self.frame, a, 0)


# ---------------------------------------------------------------- captions

QUOTES = "\u201c\u201d\"'"


def parse_words(line):
    """'\u201c^yHIS' -> ('\u201cHIS', 'y'): a colour code may follow an opening quote."""
    out = []
    for w in line.split():
        col = "w"
        lead = w[0] if w and w[0] in QUOTES else ""
        body = w[len(lead):]
        if body.startswith("^") and len(body) > 1:
            col, body = body[1], body[2:]
        out.append((lead + body, col))
    return out


def lighten(rgb, k=0.38):
    return tuple(int(c + (255 - c) * k) for c in rgb)


class NeonCaption:
    """Typewriter caption: letters appear one by one; each word glows in its colour."""

    def __init__(self, cfg, W, H):
        self.cfg = cfg
        self.t0, self.t1 = cfg["t0"], cfg["t1"]
        self.cps = cfg.get("cps", 15)
        size = int(cfg.get("size", 0.08) * W)
        rows = [parse_words(l) for l in cfg["lines"]]
        while True:  # shrink until the longest line fits 86 % of the width
            self.font = ImageFont.truetype(FONT, size)
            space = self.font.getlength(" ")
            longest = max(sum(self.font.getlength(w) for w, _ in ws) + space * (len(ws) - 1) for ws in rows)
            if longest <= 0.86 * W or size < 24:
                break
            size = int(size * 0.95)
        self.size = size
        # chars: (char, rgb, x, row) in reveal order
        self.chars = []
        lh = size * 1.12
        widths = []
        for words in rows:
            widths.append(sum(self.font.getlength(w) for w, _ in words) + space * (len(words) - 1))
        self.box_w = int(max(widths) + size * 1.6)
        self.box_h = int(len(rows) * lh + size * 1.2)
        for r, words in enumerate(rows):
            x = (self.box_w - widths[r]) / 2
            for wi, (w, col) in enumerate(words):
                for ci, ch in enumerate(w):
                    c = NEON[MULTI[(ci + wi) % len(MULTI)]] if col == "x" else NEON[col]
                    self.chars.append((ch, c, x + self.font.getlength(w[:ci]), r))
                x += self.font.getlength(w) + space
            self.chars.append((" ", NEON["w"], 0, r))  # a beat between lines
        self.lh = lh
        self.cx = W / 2
        self.cy = cfg.get("y", 0.6) * H

    def visible(self, t):
        if self.cps <= 0:
            return len(self.chars)
        return int((t - self.t0) * self.cps) + 1

    @lru_cache(maxsize=64)
    def layer(self, n):
        """BGRA layer with the first n characters, neon glow and soft shadow."""
        W, H = self.box_w, self.box_h
        core = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(core)
        top = self.size * 0.45
        for ch, c, x, r in self.chars[:n]:
            if ch == " ":
                continue
            d.text((x + self.size * 0.8, top + r * self.lh), ch, font=self.font, fill=lighten(c) + (255,))
        alpha = core.split()[3]
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        # colour glow: the coloured letters blurred wide and narrow
        col = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dc = ImageDraw.Draw(col)
        for ch, c, x, r in self.chars[:n]:
            if ch != " ":
                dc.text((x + self.size * 0.8, top + r * self.lh), ch, font=self.font, fill=c + (255,))
        wide = col.filter(ImageFilter.GaussianBlur(self.size * 0.22))
        tight = col.filter(ImageFilter.GaussianBlur(self.size * 0.07))
        shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(self.size * 0.06)).point(lambda v: int(v * 0.75)))
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for lay in (shadow, wide, wide, tight, core):
            out = Image.alpha_composite(out, lay)
        a = np.array(out)
        return a[:, :, [2, 1, 0, 3]].copy()

    def draw(self, frame, t, alpha=1.0):
        if not (self.t0 <= t < self.t1):
            return
        n = min(len(self.chars), self.visible(t))
        if n <= 0:
            return
        fade = min(1.0, (self.t1 - t) / self.cfg.get("fade", 0.12)) * alpha
        blend(frame, self.layer(n), self.cx, self.cy, fade)


CLEAN = {"w": (255, 255, 255), "y": (255, 214, 10), "r": (255, 48, 48), "c": (60, 220, 255),
         "g": (80, 255, 110), "m": (255, 80, 220), "x": (255, 255, 255)}   # RGB, no neon lightening
FONT_LINE = str(HERE / "fonts" / "Poppins-ExtraBold.ttf")
FONT_PUNCH = str(HERE / "fonts" / "Poppins-BlackItalic.ttf")


def _flare(px):
    """Lens-flare sparkle (BGRA): bright core, soft halo, horizontal streak."""
    yy, xx = np.mgrid[-px:px + 1, -px:px + 1].astype(np.float32) / px
    r2 = xx ** 2 + yy ** 2
    core = np.exp(-r2 / 0.004) + 0.45 * np.exp(-r2 / 0.06)
    streak = np.exp(-(yy / 0.025) ** 2) * np.exp(-np.abs(xx) / 0.45) * 0.8
    v = np.clip(core + streak, 0, 1)
    bgr = np.stack([v * 255, v * 240, v * 225], -1)            # slightly cool white
    return np.dstack([bgr, v * 255]).astype(np.uint8)


class LineCaption:
    """Clean one-line caption typed fast: white words with coloured key words, a soft shadow,
    each letter pops in, and a sparkle rides the cursor while it types."""

    def __init__(self, cfg, W, H):
        self.cfg = cfg
        self.t0, self.t1 = cfg["t0"], cfg["t1"]
        self.cps = cfg.get("cps", 55)
        words = parse_words(" ".join(cfg["lines"]))
        size = int(cfg.get("size", 0.036) * W)
        while True:
            font = ImageFont.truetype(FONT_LINE, size)
            sp = font.getlength(" ")
            width = sum(font.getlength(w) for w, _ in words) + sp * (len(words) - 1)
            if width <= cfg.get("max_w", 0.9) * W or size < 16:
                break
            size = int(size * 0.95)
        self.font, self.size = font, size
        self.pad = pad = int(size * 0.5)
        self.box_w, self.box_h = int(width + 2 * pad), int(size * 1.9)
        self.chars, x = [], pad
        for w, col in words:
            for ci, ch in enumerate(w):
                self.chars.append((ch, CLEAN.get(col, CLEAN["w"]), x + font.getlength(w[:ci])))
            x += font.getlength(w) + sp
        asc, _ = font.getmetrics()
        self.ty = (self.box_h - asc) / 2 + asc * 0.12
        self.text_h = asc * 0.72
        self.cx, self.cy = W / 2, cfg.get("y", 0.2) * H
        self.flare = _flare(int(0.05 * W))

    def _draw(self, d, ch, rgb, x):
        st = max(1, self.size // 16)
        d.text((x, self.ty), ch, font=self.font, fill=rgb + (255,), stroke_width=st, stroke_fill=(10, 10, 14, 255))

    def _finish(self, img):
        a = img.split()[3]
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(a.filter(ImageFilter.GaussianBlur(self.size * 0.08)).point(lambda v: int(v * 0.7)))
        sh = sh.transform(sh.size, Image.AFFINE, (1, 0, 0, 0, 1, -int(self.size * 0.06)))
        out = Image.alpha_composite(sh, img)
        return np.array(out)[:, :, [2, 1, 0, 3]].copy()

    @lru_cache(maxsize=96)
    def layer(self, n):
        img = Image.new("RGBA", (self.box_w, self.box_h), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for ch, rgb, x in self.chars[:n]:
            if ch != " ":
                self._draw(d, ch, rgb, x)
        return self._finish(img)

    @lru_cache(maxsize=256)
    def char_sprite(self, i):
        ch, rgb, x = self.chars[i]
        cw = int(self.font.getlength(ch)) + 1
        img = Image.new("RGBA", (cw + 2 * self.pad, self.box_h), (0, 0, 0, 0))
        self._draw(ImageDraw.Draw(img), ch, rgb, self.pad)
        return self._finish(img), x + cw / 2

    def draw(self, frame, t, alpha=1.0):
        if not (self.t0 <= t < self.t1):
            return
        fade = min(1.0, (self.t1 - t) / self.cfg.get("fade", 0.06)) * alpha
        N = len(self.chars)
        n = N if self.cps <= 0 else min(N, int((t - self.t0) * self.cps) + 1)
        pop = self.cfg.get("pop", 0.1)
        settled = n if self.cps <= 0 else max(0, min(n, int((t - self.t0 - pop) * self.cps) + 1))
        x0 = self.cx - self.box_w / 2
        if settled > 0:
            blend(frame, self.layer(settled), self.cx, self.cy, fade)
        for i in range(settled, n):
            age = t - (self.t0 + i / self.cps)
            k = 1 + 0.7 * (1 - ease_out(age / pop))
            spr, ccx = self.char_sprite(i)
            spr = cv2.resize(spr, None, fx=k, fy=k, interpolation=cv2.INTER_LINEAR)
            blend(frame, spr, x0 + ccx, self.cy, fade * min(1.0, 0.3 + age / 0.03))
        if self.cfg.get("sparkle") and self.cps > 0 and n > 0:
            done = self.t0 + N / self.cps
            if t < done + 0.15:
                ch, _, x = self.chars[n - 1]
                cur = x0 + x + self.font.getlength(ch)
                k = 1.0 if t < done else max(0.0, 1 - (t - done) / 0.15)
                flick = 0.75 + 0.25 * math.sin(t * 90)
                blend(frame, self.flare, cur, self.cy - self.text_h * 0.15, k * flick, add=True)


class PunchCaption:
    """Punchline: big red heavy italic, revealed through red vertical streaks, then a red glow that pulses and fades."""

    def __init__(self, cfg, W, H):
        self.cfg = cfg
        self.t0, self.t1 = cfg["t0"], cfg["t1"]
        text = " ".join(cfg["lines"]).replace("^r", "").replace("^w", "")
        rgb = tuple(cfg.get("rgb", (255, 36, 36)))
        size = int(cfg.get("size", 0.058) * W)
        while True:
            font = ImageFont.truetype(FONT_PUNCH, size)
            width = font.getlength(text)
            if width <= cfg.get("max_w", 0.9) * W or size < 20:
                break
            size = int(size * 0.95)
        pad = int(size * 0.8)
        asc, _ = font.getmetrics()
        bw, bh = int(width + 2 * pad), int(size * 2.4)
        img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
        ImageDraw.Draw(img).text((pad, (bh - asc) / 2 + asc * 0.1), text, font=font, fill=rgb + (255,),
                                 stroke_width=max(1, size // 22), stroke_fill=(70, 0, 0, 255))
        a = np.array(img)[:, :, [2, 1, 0, 3]].copy()
        self.core = a
        self.glow = cv2.GaussianBlur(a, (0, 0), size * 0.28)
        self.size, self.box_w, self.box_h, self.pad, self.width = size, bw, bh, pad, width
        self.text_h = asc * 0.72
        self.rgb = rgb
        self.cx, self.cy = W / 2, cfg.get("y", 0.2) * H

    def draw(self, frame, t, alpha=1.0):
        if not (self.t0 <= t < self.t1):
            return
        d = t - self.t0
        rev = self.cfg.get("reveal", 0.15)
        if d < rev:
            r = np.random.default_rng(int(d * 120))
            lay = np.zeros((self.box_h, self.box_w, 4), np.uint8)
            col = (self.rgb[2], self.rgb[1], self.rgb[0], 255)
            for _ in range(28):
                x = int(self.pad + r.uniform(0, self.width))
                h = int(self.box_h * r.uniform(0.35, 0.8))
                y = int((self.box_h - h) / 2 + r.uniform(-0.1, 0.1) * self.box_h)
                cv2.line(lay, (x, y), (x, y + h), col, int(r.integers(1, 4)), cv2.LINE_AA)
            lay = cv2.GaussianBlur(lay, (0, 0), 1.2)
            blend(frame, lay, self.cx, self.cy, 0.9 * alpha, add=True)
            blend(frame, self.core, self.cx, self.cy, alpha * 0.35 * d / rev)
            return
        pulse = 0.0
        for b in self.cfg.get("beats", []):
            if t >= b:
                pulse = math.exp(-(t - b) / 0.16)
        glow = max(0.0, 1 - (d - rev) / self.cfg.get("glow_for", 2.2)) * (0.55 + 0.45 * pulse)
        if glow > 0.02:
            blend(frame, self.glow, self.cx, self.cy, glow * alpha, add=True)
        blend(frame, self.core, self.cx, self.cy, alpha)


def make_caption(cfg, W, H):
    return {"line": LineCaption, "punch": PunchCaption}.get(cfg.get("style"), NeonCaption)(cfg, W, H)


def grade(img, exposure=1.0, contrast=1.05, sat=1.1):
    """Light colour grade without vignette or grain (for the windowed layout)."""
    x = img.astype(np.float32) * (exposure / 255.0)
    luma = x @ np.array([0.114, 0.587, 0.299], np.float32)
    x = luma[:, :, None] + (x - luma[:, :, None]) * sat
    x = (x - 0.5) * contrast + 0.5
    return np.clip(x * 255.0, 0, 255).astype(np.uint8)


def blend(frame, bgra, cx, cy, alpha=1.0, add=False):
    h, w = bgra.shape[:2]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    H, W = frame.shape[:2]
    sx, sy = max(0, -x0), max(0, -y0)
    x0c, y0c, x1c, y1c = max(0, x0), max(0, y0), min(W, x0 + w), min(H, y0 + h)
    if x1c <= x0c or y1c <= y0c or alpha <= 0.01:
        return
    s = bgra[sy:sy + y1c - y0c, sx:sx + x1c - x0c].astype(np.float32)
    a = s[:, :, 3:4] / 255.0 * alpha
    roi = frame[y0c:y1c, x0c:x1c].astype(np.float32)
    if add:
        roi = roi + s[:, :, :3] * a
    else:
        roi = roi * (1 - a) + s[:, :, :3] * a
    frame[y0c:y1c, x0c:x1c] = np.clip(roi, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- overlays

class Arrow:
    """Hand-drawn style red arrow that draws itself on, pointing at something."""

    def __init__(self, cfg, W, H):
        self.cfg, self.W, self.H = cfg, W, H
        p0 = np.array(cfg["tail"], float) * [W, H]
        p3 = np.array(cfg["tip"], float) * [W, H]
        mid = (p0 + p3) / 2
        nrm = np.array([-(p3 - p0)[1], (p3 - p0)[0]])
        nrm /= np.linalg.norm(nrm) + 1e-9
        bend = cfg.get("bend", 0.35) * np.linalg.norm(p3 - p0)
        p1 = p0 + (mid - p0) * 0.6 + nrm * bend
        p2 = p3 + (mid - p3) * 0.6 + nrm * bend * 0.6
        s = np.linspace(0, 1, 60)[:, None]
        self.curve = (1 - s) ** 3 * p0 + 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s ** 2 * p2 + s ** 3 * p3
        self.th = max(4, int(cfg.get("width", 0.014) * W))

    def draw(self, frame, t):
        c = self.cfg
        if not (c["t0"] <= t < c["t1"]):
            return
        g = ease_out((t - c["t0"]) / c.get("draw", 0.14))
        n = max(2, int(g * len(self.curve)))
        pts = self.curve[:n]
        lay = np.zeros_like(frame)
        red = (40, 40, 255)
        cv2.polylines(lay, [np.round(pts * 4).astype(np.int32)], False, red, self.th, cv2.LINE_AA, shift=2)
        if g > 0.85:
            tip, back = self.curve[-1], self.curve[-6]
            d = (tip - back) / (np.linalg.norm(tip - back) + 1e-9)
            nrm = np.array([-d[1], d[0]])
            L = self.th * 3.0
            tri = np.array([tip + d * self.th * 0.6, tip - d * L + nrm * L * 0.7, tip - d * L - nrm * L * 0.7])
            cv2.fillPoly(lay, [np.round(tri * 4).astype(np.int32)], red, cv2.LINE_AA, shift=2)
        glow = cv2.GaussianBlur(lay, (0, 0), self.th * 1.2)
        core = cv2.addWeighted(lay, 1.0, np.full_like(lay, 255) * (lay > 0), 0.25, 0)
        out = frame.astype(np.float32) + glow.astype(np.float32) * 0.9
        m = cv2.GaussianBlur((lay.max(2) > 0).astype(np.float32), (0, 0), 0.8)[:, :, None]
        out = out * (1 - m) + core.astype(np.float32) * m
        frame[:] = np.clip(out, 0, 255).astype(np.uint8)


class Sparkles:
    """Drifting, twinkling white specks (the 'dust' over the ending)."""

    def __init__(self, cfg, W, H, seed=9):
        r = np.random.default_rng(seed)
        n = cfg.get("n", 46)
        self.cfg, self.W, self.H = cfg, W, H
        self.p = r.uniform([0, 0], [W, H], (n, 2))
        self.v = r.normal([0, -40], [25, 25], (n, 2))
        self.size = r.uniform(1.5, 4.5, n)
        self.ph = r.uniform(0, 2 * np.pi, n)
        self.f = r.uniform(2, 6, n)

    def draw(self, frame, t):
        c = self.cfg
        if not (c["t0"] <= t < c["t1"]):
            return
        d = t - c["t0"]
        lay = np.zeros(frame.shape[:2], np.float32)
        for (x, y), (vx, vy), s, ph, f in zip(self.p, self.v, self.size, self.ph, self.f):
            a = 0.5 + 0.5 * math.sin(ph + f * d * 2 * math.pi)
            px, py = (x + vx * d) % self.W, (y + vy * d) % self.H
            cv2.circle(lay, (int(px), int(py)), int(s), float(a), -1, cv2.LINE_AA)
        lay = cv2.GaussianBlur(lay, (0, 0), 1.6) * 1.6 + cv2.GaussianBlur(lay, (0, 0), 5) * 0.8
        out = frame.astype(np.float32) + (lay[:, :, None] * 255 * c.get("strength", 0.9))
        frame[:] = np.clip(out, 0, 255).astype(np.uint8)


@lru_cache(maxsize=4)
def emoji_sprite(seq, px):
    f = ImageFont.truetype(EMOJI, 109)
    im = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((30, 30), seq, font=f, embedded_color=True)
    im = im.crop(im.getbbox())
    w, h = im.size
    im = im.resize((px, int(px * h / w)), Image.LANCZOS)
    a = np.array(im)
    return a[:, :, [2, 1, 0, 3]].copy()


class HeartBurst:
    """Big mending heart bursts in on the hit, wobbles, flashes out into a ghost,
    and settles as a small heart above the closing word, pulsing on the beat."""

    SEQ = "❤️‍\U0001FA79"

    def __init__(self, cfg, W, H):
        self.cfg, self.W, self.H = cfg, W, H

    def draw(self, frame, t):
        c = self.cfg
        t0 = c["t"]
        if t < t0:
            return
        W, H = self.W, self.H
        big = int(c.get("big", 0.44) * W)
        small = int(c.get("small", 0.085) * W)
        hold = c.get("hold", 0.30)
        bx, by = c.get("big_at", [0.5, 0.46])
        sx, sy = c.get("small_at", [0.5, 0.555])
        d = t - t0
        if d < hold + 0.12:
            pop = lerp(0.45, 1.0, ease_out(d / 0.22)) * (1 + 0.03 * math.sin(d * 40))
            if d < hold:
                spr = emoji_sprite(self.SEQ, max(8, int(big * pop)))
                glow = cv2.GaussianBlur(spr, (0, 0), big * 0.06)
                blend(frame, glow, bx * W, by * H, 0.6, add=True)
                blend(frame, spr, bx * W + 6 * math.sin(d * 55), by * H, 1.0)
            else:
                # flash out: scale up and fade like a double exposure
                k = (d - hold) / 0.12
                spr = emoji_sprite(self.SEQ, int(big * (1 + 0.8 * ease_out(k))))
                blend(frame, spr, bx * W, by * H, 0.85 * (1 - k))
        if d >= hold + 0.04:
            beats = c.get("beats", [])
            pulse = 0.0
            for b in beats:
                if t >= b:
                    pulse = 0.16 * math.exp(-(t - b) / 0.09)
            k = ease_out((d - hold - 0.04) / 0.1)
            spr = emoji_sprite(self.SEQ, max(8, int(small * (0.6 + 0.4 * k) * (1 + pulse))))
            blend(frame, spr, sx * W, sy * H, 1.0)


class Circle:
    """Hand-drawn red ring that draws itself around a detail, then breathes."""

    def __init__(self, cfg, W, H):
        self.cfg, self.W, self.H = cfg, W, H
        r = np.random.default_rng(cfg.get("seed", 3))
        self.c = np.array(cfg["at"], float) * [W, H]
        rx = cfg.get("r", 0.12) * W
        ry = rx * cfg.get("aspect", 0.85)
        n = 96
        ang = np.linspace(0, 2 * np.pi * 1.1, n) + cfg.get("start", -2.2)   # overshoots, like a pen loop
        wob = 1 + 0.045 * np.sin(ang * 3 + r.uniform(0, 6)) + np.linspace(0, 0.07, n)
        self.pts = np.stack([np.cos(ang) * rx * wob, np.sin(ang) * ry * wob], 1)
        self.th = max(5, int(cfg.get("width", 0.011) * W))
        self.color = tuple(int(v) for v in cfg.get("bgr", (40, 40, 255)))

    def draw(self, frame, t):
        c = self.cfg
        if not (c["t0"] <= t < c["t1"]):
            return
        d = t - c["t0"]
        g = ease_out(d / c.get("draw", 0.22))
        n = max(2, int(g * len(self.pts)))
        k = 1 + (0.035 * math.sin((d - c.get("draw", 0.22)) * 11) if g >= 1 else 0)
        pts = self.pts[:n] * k + self.c
        lay = np.zeros_like(frame)
        cv2.polylines(lay, [np.round(pts * 4).astype(np.int32)], False, self.color, self.th, cv2.LINE_AA, shift=2)
        glow = cv2.GaussianBlur(lay, (0, 0), self.th * 1.3)
        out = frame.astype(np.float32) + glow.astype(np.float32) * 0.9
        m = cv2.GaussianBlur((lay.max(2) > 0).astype(np.float32), (0, 0), 0.8)[:, :, None]
        out = out * (1 - m) + lay.astype(np.float32) * m
        frame[:] = np.clip(out, 0, 255).astype(np.uint8)


class Stamp:
    """Verdict stamp that slams in on the drop: REAL (green), AI (red), UNVERIFIED (yellow)."""

    COLORS = {"REAL": (60, 255, 95), "AI": (255, 40, 48), "UNVERIFIED": (255, 226, 30)}   # RGB
    over = True

    def __init__(self, cfg, W, H):
        self.cfg, self.W, self.H = cfg, W, H
        text = cfg["text"]
        rgb = tuple(cfg.get("rgb", self.COLORS.get(text, (255, 255, 255))))
        size = int(cfg.get("size", 0.21 if len(text) <= 4 else 0.105) * W)
        font = ImageFont.truetype(FONT, size)
        tw = font.getlength(text)
        asc, desc = font.getmetrics()
        pad = int(size * 0.32)
        bw, bh = int(tw + 2 * pad), int(asc * 0.78 + 2 * pad)
        m = int(size * 0.4)
        img = Image.new("RGBA", (bw + 2 * m, bh + 2 * m), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([m, m, m + bw, m + bh], radius=int(size * 0.14), outline=rgb + (255,),
                            width=max(6, int(size * 0.085)))
        d.text((m + pad, m + pad - asc * 0.2), text, font=font, fill=rgb + (255,))
        img = img.rotate(cfg.get("rot", 8), resample=Image.BICUBIC, expand=True)
        a = np.array(img).astype(np.float32)
        r = np.random.default_rng(1)
        ink = cv2.GaussianBlur(r.random(a.shape[:2]).astype(np.float32), (0, 0), 2.5)
        ink = np.clip((ink - 0.5) * 6 + 0.75, 0.25, 1.0)                    # worn ink, like a rubber stamp
        a[:, :, 3] *= ink * (r.random(a.shape[:2]) > 0.04)
        bgra = a[:, :, [2, 1, 0, 3]].clip(0, 255).astype(np.uint8)
        self.spr = bgra
        self.glow = cv2.GaussianBlur(bgra, (0, 0), size * 0.12)

    def draw(self, frame, t):
        c = self.cfg
        d = t - c["t"]
        if d < 0 or t >= c.get("t1", 1e9):
            return
        k = d / 0.13
        scale = lerp(2.3, 1.0, ease_out(k)) if k < 1 else 1 + 0.04 * math.exp(-(d - 0.13) / 0.08)
        alpha = min(1.0, k * 2.5)
        x, y = c.get("at", [0.5, 0.42])
        spr = cv2.resize(self.spr, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        glow = cv2.resize(self.glow, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        blend(frame, glow, x * self.W, y * self.H, 0.8 * alpha, add=True)
        blend(frame, spr, x * self.W, y * self.H, alpha)


Sparkles.over = True


def build_overlays(cfgs, W, H):
    kinds = {"arrow": Arrow, "sparkles": Sparkles, "heart": HeartBurst, "circle": Circle, "stamp": Stamp}
    return [kinds[c["type"]](c, W, H) for c in cfgs]


# ---------------------------------------------------------------- transitions

def leak_texture(W, H, cx, cy, spread):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - cx) / W) ** 2 + ((yy - cy) / H) ** 2)
    core = np.clip(1 - r / spread, 0, 1) ** 1.5
    teal = np.array([205, 232, 70], np.float32) / 255.0   # BGR teal-cyan
    tex = teal[None, None, :] * (1 - core[:, :, None]) + core[:, :, None]
    return tex


class Transitions:
    def __init__(self, cfgs, W, H):
        self.cfgs = sorted(cfgs, key=lambda c: c["t"])
        self.W, self.H = W, H
        self.leak_cache = {}

    def weight(self, c, t):
        """0 -> 1 rising over [t-a, t], 1 -> 0 over [t, t+b]."""
        a, b = c.get("a", 0.1), c.get("b", 0.15)
        if c["t"] - a <= t < c["t"]:
            return (t - (c["t"] - a)) / max(a, 1e-6), "pre"
        if c["t"] <= t < c["t"] + b:
            return 1 - (t - c["t"]) / max(b, 1e-6), "post"
        return 0.0, None

    def zoom(self, t):
        """Incoming shots settle from a slight push after a flash."""
        z = 1.0
        for c in self.cfgs:
            if c["type"] in ("white", "leak") and c["t"] <= t < c["t"] + 0.3:
                z *= 1 + 0.07 * (1 - ease_out((t - c["t"]) / 0.3))
            if c["type"] == "glitch" and c["t"] <= t < c["t"] + 0.35:
                z *= 1 + 0.18 * (1 - ease_out((t - c["t"]) / 0.35))
            if c["type"] == "freeze" and c["t"] <= t < c["t"] + 0.15:
                z *= 1 + 0.06 * (1 - ease_out((t - c["t"]) / 0.15))
            if c["type"] == "impact" and c["t"] <= t < c["t"] + 0.3:
                z *= 1 + 0.1 * (1 - ease_out((t - c["t"]) / 0.3))
        return z

    def shake(self, t):
        """Camera shake from impacts: (dx, dy) in pixels."""
        dx = dy = 0.0
        for c in self.cfgs:
            if c["type"] == "impact" and c["t"] <= t < c["t"] + 0.8:
                a = c.get("shake", 30) * math.exp(-(t - c["t"]) / 0.18)
                dx += a * math.sin(t * 97)
                dy += a * math.cos(t * 83)
        return dx, dy

    def apply(self, img, t, frame_idx):
        H, W = img.shape[:2]
        x = img.astype(np.float32) / 255.0
        for c in self.cfgs:
            w, side = self.weight(c, t)
            if side is None:
                continue
            kind = c["type"]
            if kind == "white":
                w = smoothstep(w)
                x = x + (1 - x) * w * 0.97
            elif kind == "leak":
                w = smoothstep(w) * 0.96
                # the glow sweeps in from the lower left and blooms to almost white
                prog = w if side == "pre" else 1.0
                key = (round(prog, 2), side, W, H)
                if key not in self.leak_cache:
                    cx = W * lerp(-0.1, 0.45, prog)
                    cy = H * lerp(1.05, 0.5, prog)
                    self.leak_cache[key] = leak_texture(W, H, cx, cy, lerp(0.5, 1.3, prog))
                tex = self.leak_cache[key]
                x = 1 - (1 - x) * (1 - tex * w)
            elif kind == "tvoff":
                if side == "pre":
                    x = x * (1 - 0.9 * smoothstep(w))
                    lines = [0.33, 0.63]
                else:
                    x = x * (1 - 0.85 * w)
                    lines = [0.55] if w > 0.85 else [0.27, 0.72]
                lay = np.zeros((H, W), np.float32)
                for ly in lines:
                    y = int(ly * H)
                    cv2.line(lay, (0, y), (W, y), 1.0, 3)
                lay = lay + cv2.GaussianBlur(lay, (0, 0), 7) * 1.5
                x = x + lay[:, :, None] * (0.9 * w)
                if side == "post" and 0.3 < w < 0.62:
                    # sprocket band flicker as the picture comes back
                    band = np.zeros((H, W), np.float32)
                    y0 = int(0.26 * H)
                    for bx in range(0, W, 120):
                        cv2.rectangle(band, (bx + 20, y0), (bx + 80, y0 + 34), 0.8, -1)
                    band = cv2.GaussianBlur(band, (0, 0), 3)
                    x = x + band[:, :, None] * 0.7
            elif kind in ("freeze", "impact") and side == "post":
                x = x + (1 - x) * (w ** 2) * (0.55 if kind == "freeze" else 0.85)
            elif kind == "dip":
                # the held breath before a verdict: the picture sinks almost to black, then snaps back
                x = x * (1 - 0.88 * smoothstep(w))
            elif kind == "glitch" and side == "post":
                k = 1 - w   # 0 -> 1 across the glitch
                yy = np.linspace(-1, 1, H, dtype=np.float32)[:, None, None]
                vmask = np.clip(1.2 - np.abs(yy) * 1.1, 0, 1) ** 1.5
                bars = np.repeat(x[H // 2:H // 2 + 1], H, axis=0)          # one row stretched to full height
                bars = cv2.blur(bars, (5, 1))
                vblur = cv2.blur(x, (3, int(30 + 150 * (1 - k))))
                if k < 0.34:
                    x = bars * vmask * 0.85
                elif k < 0.67:
                    x = 0.5 * bars * vmask + 0.5 * vblur * 0.8
                else:
                    x = vblur
                    sh = 12
                    x[:, :, 2] = np.roll(x[:, :, 2], sh, axis=1)
                    x[:, :, 0] = np.roll(x[:, :, 0], -sh, axis=1)
        return np.clip(x * 255, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- render

def zoom_at(keys, tau):
    """Smooth piecewise zoom from [[shot_time, zoom], ...]."""
    if not keys:
        return 1.0
    if tau <= keys[0][0]:
        return keys[0][1]
    for ka, kb in zip(keys, keys[1:]):
        if ka[0] <= tau <= kb[0]:
            ease = kb[2] if len(kb) > 2 else "inout"   # how we arrive at kb
            x = (tau - ka[0]) / max(kb[0] - ka[0], 1e-6)
            x = {"in": ease_in(x), "out": ease_out(x), "linear": x}.get(ease, smoothstep(x))
            return lerp(ka[1], kb[1], x)
    return keys[-1][1]


def load_stereo(path, sr=44100):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def auto_cues(spec):
    """Sound design implied by the edit: shutter on freezes, impact on the verdict, whoosh on flashes,
    pop when a circle lands."""
    cues = []
    for c in spec.get("transitions", []):
        kind = {"freeze": "shutter", "impact": "impact", "white": "whoosh", "leak": "whoosh", "tvoff": "whoosh"}.get(c["type"])
        if kind:
            cues.append((c["t"], kind))
    for o in spec.get("overlays", []):
        if o["type"] == "circle":
            cues.append((o["t0"] + o.get("draw", 0.22) * 0.8, "pop"))
    return cues


def build_audio(spec, ep, out):
    """Returns (soundtrack for edit.mp4, soundtrack for edit_no_music.mp4 or None, duration)."""
    from . import music as mus
    m = spec.get("music", {})
    path = ep / m["file"] if m.get("file") else None
    if (path is None or not path.exists()) and m.get("synth"):
        y, sr = mus.compose(m["synth"]["bpm"], m["synth"]["sections"])
        path = path or ep / "clips" / "music.wav"
        path.parent.mkdir(exist_ok=True)
        mus.write_wav(path, mus.normalize(y), sr)
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", str(path)]))
    cues = [tuple(c) for c in spec.get("sfx", [])] + (auto_cues(spec) if spec.get("auto_sfx") else [])
    voice = spec.get("voice", [])
    if not cues and not voice:
        # the soundtrack as is, only peak-limited: loud reference edits often decode above 0 dBFS and clip
        lim = out / "music_limited.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-af",
                        "alimiter=limit=0.84:attack=2:release=60:level=0", "-ar", "48000", str(lim)], check=True)
        return lim, None, dur
    sr = mus.SR
    n = int(round(dur * sr))
    track = load_stereo(path, sr)[:n]
    track = np.pad(track, ((0, n - len(track)), (0, 0)))
    sfx = mus.sound_design(dur, cues=cues)[0][:n]
    sfx = np.pad(sfx, ((0, n - len(sfx)), (0, 0)))
    vo = np.zeros((n, 2), np.float32)
    duck = np.ones(n, np.float32)
    for v in voice:
        clip = load_stereo(ep / v["file"], sr) * v.get("gain", 1.0)
        i = int(v["t"] * sr)
        k = min(len(clip), n - i)
        vo[i:i + k] += clip[:k]
        ramp = int(0.08 * sr)
        lo, hi = max(0, i - ramp), min(n, i + k + ramp)
        duck[lo:hi] = np.minimum(duck[lo:hi], 0.32)
    duck = np.convolve(duck, np.ones(int(0.06 * sr)) / int(0.06 * sr), mode="same")
    mix = mus.normalize(track * duck[:, None] + sfx * spec.get("sfx_gain", 0.8) + vo)
    bed = sfx * spec.get("sfx_gain", 0.8) + vo
    mix_p, bed_p = out / "mix.wav", out / "no_music.wav"
    mus.write_wav(mix_p, mix, sr)
    mus.write_wav(bed_p, mus.normalize(bed, target_lufs=-16) if np.abs(bed).max() > 1e-4 else bed, sr)
    return mix_p, bed_p, dur


def render(ep_dir, stills=False, only=None):
    ep = Path(ep_dir)
    spec = json.loads((ep / "story.json").read_text())
    W, H = spec.get("size", [1080, 1350])
    fps = spec.get("fps", 30)
    out = ep / "out"
    out.mkdir(exist_ok=True)
    music, nomusic, dur = build_audio(spec, ep, out)
    nframes = int(round(dur * fps))
    shots = spec["shots"]
    look = Look(W, H)
    trans = Transitions(spec.get("transitions", []), W, H)
    caps = [make_caption(c, W, H) for c in spec.get("captions", [])]
    lay = spec.get("layout") or {}
    window = lay.get("type") == "window"
    if window:
        bx0, by0, bx1, by1 = lay["box"]
        win_w, win_h = (bx1 - bx0) * W, (by1 - by0) * H
        win_cx, win_cy = (bx0 + bx1) / 2 * W, (by0 + by1) / 2 * H
        bg = np.array(lay.get("bg", [0, 0, 0]), np.uint8)
    ovs = build_overlays(spec.get("overlays", []), W, H)
    flick = spec.get("flicker", [])
    rng = np.random.default_rng(4)
    ph = rng.uniform(0, 2 * np.pi, 6)

    if stills:
        todo = [int(((s["t0"] + s["t1"]) / 2) * fps) for s in shots]
        if only:
            todo = [todo[i] for i in only]
    else:
        todo = range(nframes)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                                "-r", str(fps), "-i", "-", "-i", str(music), "-map", "0:v", "-map", "1:a",
                                "-c:v", "libx264", "-preset", "slow", "-crf", str(spec.get("crf", 18)),
                                "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest",
                                "-movflags", "+faststart", str(out / "edit.mp4")], stdin=subprocess.PIPE)
    readers = {}
    for f in todo:
        t = f / fps
        si = max([i for i, s in enumerate(shots) if s["t0"] <= t + 1e-9] or [0])
        sh = shots[si]
        tau = t - sh["t0"]
        D = sh["t1"] - sh["t0"]
        src_t = sh["in"] + sh.get("speed", 1.0) * tau
        if stills:
            rd = ClipReader(ep / "clips" / f"{sh['clip']}.mp4", src_t)
            frame = rd.get(src_t)
            rd.close()
        else:
            if si not in readers:
                for k in list(readers):
                    readers.pop(k).close()
                readers[si] = BlendReader(ep / "clips" / f"{sh['clip']}.mp4", sh["in"])
            frame = readers[si].get(src_t)
        sw, shh = frame.shape[1], frame.shape[0]
        fx0, fy0 = sh.get("focus", [0.5, 0.5])
        fx1, fy1 = sh.get("focus_to", [fx0, fy0])
        e = smoothstep(tau / D)
        cx, cy = lerp(fx0, fx1, e) * sw, lerp(fy0, fy1, e) * shh
        if sh.get("focus_keys"):
            # [[shot_time, x, y, ease?], ...]: hold, then pan to read a line of on-screen text
            fk = sh["focus_keys"]
            cx = zoom_at([[k[0], k[1]] + k[3:] for k in fk], tau) * sw
            cy = zoom_at([[k[0], k[2]] + k[3:] for k in fk], tau) * shh
        z = zoom_at(sh.get("zoom_keys"), tau) * trans.zoom(t) * 1.04
        hh = sh.get("handheld", 0.0)
        dx = hh * (math.sin(2 * math.pi * 1.7 * t + ph[0]) + 0.6 * math.sin(2 * math.pi * 4.3 * t + ph[1]))
        dy = hh * (math.sin(2 * math.pi * 1.3 * t + ph[2]) + 0.6 * math.sin(2 * math.pi * 3.7 * t + ph[3]))
        rot = hh * 0.06 * math.sin(2 * math.pi * 1.1 * t + ph[4])
        sx, sy = trans.shake(t)
        dx, dy = dx + sx, dy + sy
        if window:
            sc = zoom_at(lay.get("scale_keys"), t)
            OW, OH = int(round(win_w * sc / 2)) * 2, int(round(win_h * sc / 2)) * 2
        else:
            OW, OH = W, H
        s = max(OW / sw, OH / shh) * z
        hw, hh2 = OW / (2 * s), OH / (2 * s)
        cx = min(max(cx, hw), sw - hw) if sw > 2 * hw else sw / 2
        cy = min(max(cy, hh2), shh - hh2) if shh > 2 * hh2 else shh / 2
        M = affine(cx, cy, s, rot, OW / 2 + dx, OH / 2 + dy)
        img = cv2.warpAffine(frame, M, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
        if s > 2.5:
            # big upscale (low-res preview): a touch of sharpening keeps edges readable
            img = cv2.addWeighted(img, 1.5, cv2.GaussianBlur(img, (0, 0), 2.2), -0.5, 0)
        if sh.get("fit"):
            # on-screen text (a letter, a phone): show the whole region [x0, y0, x1, y1] (fractions of the source)
            # over a blurred, dimmed fill of the same shot instead of cropping words off
            rx0, ry0, rx1, ry1 = sh["fit"]
            rw, rh = (rx1 - rx0) * sw, (ry1 - ry0) * shh
            sf = min(OW / rw, OH / rh) * zoom_at(sh.get("fit_zoom"), tau)
            fill = cv2.resize(img, (max(1, OW // 10), max(1, OH // 10)), interpolation=cv2.INTER_AREA)
            fill = cv2.resize(cv2.GaussianBlur(fill, (0, 0), 2.5), (OW, OH), interpolation=cv2.INTER_LINEAR)
            ox, oy = OW / 2 + dx, OH / 2 + dy
            fg = cv2.warpAffine(frame, affine((rx0 + rx1) / 2 * sw, (ry0 + ry1) / 2 * shh, sf, 0, ox, oy), (OW, OH),
                                flags=cv2.INTER_AREA if sf < 1 else cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
            img = (fill.astype(np.float32) * sh.get("fill_dim", 0.42)).astype(np.uint8)
            ax0, ax1 = int(max(0, ox - rw * sf / 2)), int(min(OW, ox + rw * sf / 2))
            ay0, ay1 = int(max(0, oy - rh * sf / 2)), int(min(OH, oy + rh * sf / 2))
            img[ay0:ay1, ax0:ax1] = fg[ay0:ay1, ax0:ax1]
        g = sh.get("grade", {})
        expo = g.get("exposure", 1.0)
        if any(a <= t < b for a, b in flick):
            expo *= 1.035 if f % 2 else 0.965
        if window:
            img = grade(img, expo, g.get("contrast", 1.05), g.get("sat", 1.1))
            img = trans.apply(img, t, f)                 # transitions stay inside the window
            canvas = np.empty((H, W, 3), np.uint8)
            canvas[:] = bg
            x0, y0 = int(round(win_cx - OW / 2)), int(round(win_cy - OH / 2))
            sx0, sy0 = max(0, -x0), max(0, -y0)
            cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x0 + OW), min(H, y0 + OH)
            canvas[cy0:cy1, cx0:cx1] = img[sy0:sy0 + cy1 - cy0, sx0:sx0 + cx1 - cx0]
            img = canvas
            for c in caps:
                if c.cfg.get("anchor") == "above_window":
                    c.cy = max(0, y0) - c.cfg.get("gap", 0.015) * H - getattr(c, "text_h", 0) / 2
        else:
            img = look.apply(img, f, exposure=expo, contrast=g.get("contrast", 1.06), sat=g.get("sat", 1.18),
                             grain=g.get("grain", 2.0))
        # graphics sit on the picture, so the flashes and leaks wash over them too
        for ov in ovs:
            if not getattr(ov, "over", False):
                ov.draw(img, t)
        for c in caps:
            c.draw(img, t)
        for ov in ovs:
            if getattr(ov, "over", False):
                ov.draw(img, t)
        if not window:
            img = trans.apply(img, t, f)
        fi, fo = spec.get("fade_in", [0, 0.1]), spec.get("fade_out")
        k = 1.0
        if t < fi[1]:
            k *= max(0.0, (t - fi[0]) / max(fi[1] - fi[0], 1e-6))
        if fo and t > fo[0]:
            k *= max(0.0, 1 - (t - fo[0]) / (fo[1] - fo[0]))
        if k < 1:
            img = (img.astype(np.float32) * k).astype(np.uint8)
        if stills:
            cv2.imwrite(str(out / f"still_{si + 1:02d}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
        else:
            enc.stdin.write(img.tobytes())
    for r in readers.values():
        r.close()
    if not stills:
        enc.stdin.close()
        enc.wait()
        # same picture with only sound design and voice, for adding a trending sound in the Shorts editor
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(out / "edit.mp4")]
        cmd += (["-i", str(nomusic), "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
                if nomusic else ["-an"])
        subprocess.run(cmd + ["-c:v", "copy", "-movflags", "+faststart", str(out / "edit_no_music.mp4")], check=True)
        print(f"wrote {out / 'edit.mp4'} and {out / 'edit_no_music.mp4'} ({dur:.2f}s, {nframes} frames)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--shots")
    a = ap.parse_args()
    render(a.episode, a.stills, [int(i) - 1 for i in a.shots.split(",")] if a.shots else None)
