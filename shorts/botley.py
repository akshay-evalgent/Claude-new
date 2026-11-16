#!/usr/bin/env python3
"""Botley the AI intern: a code-animated robot character for tech-news skits.

Everything is drawn here (no external images): a glossy white robot with an
LED-matrix face (expressions + talking mouth driven by its voice), an office
desk, other characters as screens/silhouettes, news cards, captions, a premise
box, voices (Kokoro TTS, Botley gets a robot filter) and synthesized SFX.

    python3 botley.py skits/01_interview.json --out botley_01.mp4
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

W, H, FPS, SR = 1080, 1920, 30, 44100
F_BLACK = os.path.join(HERE, "fonts", "Montserrat-Black.ttf")
F_BOLD = os.path.join(HERE, "fonts", "OpenSans-ExtraBold.ttf")
F_REG = os.path.join(HERE, "fonts", "OpenSans-Bold.ttf")
CYAN = (70, 230, 255)


# ------------------------------------------------------------------ shading

def shade(mask, color, radius=60, gloss=50, light=(-0.45, -0.7, 0.55), spec=0.9):
    """Soft 3D plastic look for any 2D mask (bool array) -> RGBA image."""
    d = ndimage.gaussian_filter(ndimage.distance_transform_edt(mask), 2.5)
    r = max(4.0, radius)
    z = np.sqrt(np.clip(1 - (1 - np.clip(d / r, 0, 1)) ** 2, 0, 1)) * r
    z = ndimage.gaussian_filter(z, 2.0)
    gy, gx = np.gradient(z)
    n = np.stack([-gx, -gy, np.ones_like(z) * 0.9], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    L = np.array(light, float); L /= np.linalg.norm(L); Hh = L + [0, 0, 1]; Hh /= np.linalg.norm(Hh)
    lam = np.clip(n @ L, 0, 1); sp = np.clip(n @ Hh, 0, 1) ** gloss
    edge = np.clip(d / (r * 0.35), 0, 1) ** 0.5                     # soft darkening right at the rim
    col = np.array(color, float)
    rgb = col * (0.58 + 0.5 * lam)[..., None] * (0.82 + 0.18 * edge)[..., None] + 255 * spec * 0.55 * sp[..., None]
    a = ndimage.gaussian_filter(mask.astype(float), 1.0)
    return Image.fromarray(np.dstack([rgb.clip(0, 255), a[..., None] * 255]).astype(np.uint8), "RGBA")


def rrect_mask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), r, fill=255)
    return np.asarray(m) > 127


def capsule_mask(w, h):
    return rrect_mask(w, h, min(w, h) // 2)


# ------------------------------------------------------------------ LED face

GW, GH = 26, 15          # LED grid


def led_face(expr, t, mouth_open=0.0):
    """Return a GHxGW float array (0..1) for an expression at time t."""
    g = np.zeros((GH, GW))

    def rect(x0, y0, x1, y1, v=1.0):
        g[max(0, y0):min(GH, y1), max(0, x0):min(GW, x1)] = v

    blink = (t % 3.7) < 0.12 and expr in ("normal", "happy", "talk")
    ex = [6, 19]                                          # eye centres (x)
    if expr in ("normal", "talk", "nervous") and not blink:
        for cx in ex:
            rect(cx - 2, 3, cx + 2, 8)
    elif blink:
        for cx in ex:
            rect(cx - 2, 6, cx + 2, 7)
    elif expr == "happy":
        for cx in ex:
            rect(cx - 2, 5, cx - 1, 7); rect(cx - 1, 4, cx + 1, 5); rect(cx + 1, 5, cx + 2, 7)
    elif expr == "hearts":
        pulse = 1 + (math.sin(t * 10) > 0)
        heart = ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"]
        for cx in ex:
            for yy, row in enumerate(heart):
                for xx, c in enumerate(row):
                    if c == "1":
                        g[2 + yy, cx - 3 + xx] = 1.0 if pulse == 2 else 0.85
    elif expr == "dots":
        for cx in ex:
            rect(cx, 5, cx + 1, 6)
    elif expr == "wide":
        for cx in ex:
            rect(cx - 3, 2, cx + 3, 3); rect(cx - 3, 8, cx + 3, 9); rect(cx - 3, 2, cx - 2, 9); rect(cx + 2, 2, cx + 3, 9)
            rect(cx - 1, 5, cx + 1, 6)
    elif expr == "loading":
        rect(4, 5, 22, 6); rect(4, 9, 22, 10); rect(4, 5, 5, 10); rect(21, 5, 22, 10)
        k = int(min(1, (t % 2.2) / 1.8) * 16)
        rect(5, 6, 5 + k, 9, 0.9)
        return g
    elif expr == "spinner":
        for i in range(8):
            a = i / 8 * 2 * math.pi + t * 6
            x, y = int(round(13 + 4.5 * math.cos(a))), int(round(7 + 4.5 * math.sin(a)))
            if 0 <= y < GH and 0 <= x < GW:
                g[y, x] = 0.25 + 0.75 * (i / 7)
        return g
    elif expr == "flames":
        rng = np.random.default_rng(int(t * 12))
        for cx in ex:
            for x in range(cx - 3, cx + 4):
                hgt = 3 + rng.integers(0, 4)
                rect(x, 9 - hgt, x + 1, 9, 0.7 + 0.3 * rng.random())
    elif expr == "frozen":
        for cx in ex:
            rect(cx - 2, 3, cx + 2, 8)
    # mouths
    if expr in ("normal", "talk", "frozen", "hearts", "happy", "nervous", "dots", "wide", "flames"):
        if expr == "talk" or (mouth_open > 0.05 and expr not in ("frozen",)):
            hgt = int(round(1 + mouth_open * 3))
            rect(9, 11, 17, 11 + hgt)
        elif expr in ("frozen",):
            rect(8, 11, 18, 12); rect(7, 10, 8, 11); rect(18, 10, 19, 11)
        elif expr == "nervous":
            for x in range(8, 19):
                g[11 + (x % 2), x] = 1
        elif expr == "dots":
            rect(11, 11, 15, 12)
        elif expr == "wide":
            rect(11, 11, 15, 13)
        else:
            rect(9, 11, 17, 12); rect(8, 10, 9, 11); rect(17, 10, 18, 11)
    if expr == "nervous":
        drop = ["010", "111", "111", "010"]
        for yy, row in enumerate(drop):
            for xx, c in enumerate(row):
                if c == "1":
                    g[1 + yy, 23 + xx] = 0.8
    return g


def render_led(g, w, h):
    """LED matrix image (RGBA) for the screen area."""
    cell_w, cell_h = w / GW, h / GH
    base = Image.new("RGBA", (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(base)
    for y in range(GH):
        for x in range(GW):
            v = g[y, x]
            x0, y0 = x * cell_w + 1.5, y * cell_h + 1.5
            box = (x0, y0, x0 + cell_w - 3, y0 + cell_h - 3)
            if v > 0:
                c = tuple(int(CYAN[i] * (0.35 + 0.65 * v)) for i in range(3))
                d.rounded_rectangle(box, 3, fill=c + (255,))
            else:
                d.rounded_rectangle(box, 3, fill=(18, 30, 38, 255))
    glow = base.filter(ImageFilter.GaussianBlur(9))
    out = Image.alpha_composite(glow, base)
    return out


# ------------------------------------------------------------------ character

class Botley:
    def __init__(self):
        self.head = shade(rrect_mask(460, 350, 120), (240, 242, 247), radius=70)
        self.screen = shade(rrect_mask(370, 236, 60), (24, 26, 34), radius=30, gloss=80, spec=0.6)
        self.torso = shade(rrect_mask(330, 300, 110), (236, 238, 244), radius=80)
        self.arm = shade(capsule_mask(78, 230), (232, 234, 241), radius=34)
        self.ear = shade(rrect_mask(46, 120, 22), (160, 168, 182), radius=20)
        self.ball = shade(rrect_mask(46, 46, 23), (255, 120, 90), radius=23, gloss=40)
        self.badge = self._badge()

    def _badge(self):
        im = Image.new("RGBA", (120, 150), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, 119, 149), 14, fill=(255, 255, 255, 255), outline=(200, 205, 215, 255), width=3)
        d.rounded_rectangle((18, 22, 102, 92), 10, fill=(24, 26, 34, 255))
        for cx in (45, 75):
            d.rectangle((cx - 6, 46, cx + 6, 62), fill=CYAN + (255,))
        f = ImageFont.truetype(F_BLACK, 22); d.text(((120 - f.getlength("INTERN")) / 2, 104), "INTERN", font=f, fill=(30, 90, 220, 255))
        return im

    def draw(self, frame, cx, cy, t, expr="normal", mouth=0.0, lean=0.0, tilt=0.0, typing=False, scale=1.0):
        """cx, cy = centre of the head. Draws onto an RGBA frame."""
        s = scale * (1 + 0.07 * lean)
        bob = math.sin(t * 2.2) * 6
        cy = cy + bob + lean * 40
        layer = Image.new("RGBA", frame.size, (0, 0, 0, 0))

        def put(img, x, y, angle=0.0, sc=s):
            if sc != 1:
                img = img.resize((max(1, int(img.width * sc)), max(1, int(img.height * sc))), Image.LANCZOS)
            if angle:
                img = img.rotate(angle, resample=Image.BICUBIC, expand=True)
            layer.alpha_composite(img, (int(x - img.width / 2), int(y - img.height / 2)))

        ty = cy + 330 * s
        # arms (behind the desk / laptop), typing alternates
        for side in (-1, 1):
            k = (math.sin(t * 22 + (side > 0) * math.pi) * 0.5 + 0.5) if typing else 0.3
            put(self.arm, cx + side * 185 * s, ty + 60 * s - k * 22 * s, angle=side * (-24 + k * 6))
        put(self.torso, cx, ty)
        # lanyard + badge
        d = ImageDraw.Draw(layer)
        d.line([(cx - 70 * s, ty - 140 * s), (cx, ty + 20 * s), (cx + 70 * s, ty - 140 * s)], fill=(40, 100, 230, 255), width=int(12 * s))
        put(self.badge, cx, ty + 70 * s, sc=s * 0.85)
        # neck
        d.rounded_rectangle((cx - 40 * s, cy + 150 * s, cx + 40 * s, cy + 200 * s), 12, fill=(150, 158, 172, 255))
        # head group (ears, antenna, head, screen, LED) rotates together
        hg = Image.new("RGBA", (640, 620), (0, 0, 0, 0))
        hx, hy = 320, 360
        hg.alpha_composite(self.ear, (hx - 230 - 30, hy - 60)); hg.alpha_composite(self.ear, (hx + 230 - 16, hy - 60))
        dd = ImageDraw.Draw(hg); dd.rounded_rectangle((hx - 6, hy - 280, hx + 6, hy - 170), 5, fill=(150, 158, 172, 255))
        hg.alpha_composite(self.ball, (hx - 23, hy - 305))
        hg.alpha_composite(self.head, (hx - 230, hy - 175))
        hg.alpha_composite(self.screen, (hx - 185, hy - 128))
        led = render_led(led_face(expr, t, mouth), 330, 200)
        hg.alpha_composite(led, (hx - 165, hy - 110))
        put(hg, cx, cy - 20 * s, angle=tilt)
        frame.alpha_composite(layer)


# ------------------------------------------------------------------ scenes

def _blurred(draw_fn, blur=16):
    im = Image.new("RGB", (W // 2, H // 2)); draw_fn(ImageDraw.Draw(im), im)
    return im.filter(ImageFilter.GaussianBlur(blur // 2)).resize((W, H), Image.BICUBIC).convert("RGBA")


def bg_office():
    def f(d, im):
        w, h = im.size
        for y in range(h):                                      # warm wall gradient
            c = int(214 - y / h * 40); d.line([(0, y), (w, y)], fill=(c, c - 8, c - 20))
        d.rectangle((40, 120, 300, 620), fill=(250, 248, 236)); d.rectangle((166, 120, 174, 620), fill=(200, 196, 186))
        d.rectangle((40, 360, 300, 368), fill=(200, 196, 186))
        for x, y, r, c in ((420, 520, 70, (70, 120, 70)), (470, 470, 55, (90, 140, 80)), (390, 470, 50, (60, 110, 60))):
            d.ellipse((x - r, y - r, x + r, y + r), fill=c)
        d.rectangle((400, 560, 450, 700), fill=(150, 110, 80))
        for x in (60, 330):                                     # monitors on other desks
            d.rectangle((x, 640, x + 150, 730), fill=(40, 44, 54)); d.rectangle((x + 8, 648, x + 142, 722), fill=(90, 140, 190))
        d.rectangle((0, 760, w, h), fill=(170, 150, 128))
        for x in range(0, w, 180):
            d.ellipse((x + 30, 40, x + 110, 60), fill=(255, 255, 240))
    return _blurred(f, 26)


def bg_stage():
    def f(d, im):
        w, h = im.size
        d.rectangle((0, 0, w, h), fill=(12, 12, 20))
        d.polygon([(w / 2 - 60, 0), (w / 2 + 60, 0), (w / 2 + 330, h * 0.82), (w / 2 - 330, h * 0.82)], fill=(60, 58, 80))
        d.rectangle((60, 120, w - 60, 420), fill=(30, 60, 120))
        f2 = ImageFont.truetype(F_BLACK, 40); d.text((w / 2 - f2.getlength("DEMO DAY") / 2, 240), "DEMO DAY", font=f2, fill=(160, 200, 255))
        for i in range(60):
            x = (i * 53) % w; y = h * 0.84 + (i % 3) * 30
            d.ellipse((x - 26, y - 26, x + 26, y + 26), fill=(6, 6, 10))
    return _blurred(f, 10)


def bg_room():
    def f(d, im):
        w, h = im.size
        for y in range(h):
            c = int(200 - y / h * 50); d.line([(0, y), (w, y)], fill=(c - 10, c - 4, c + 6))
        for x in range(40, w, 120):
            d.rectangle((x, 700, x + 70, 760), fill=(70, 74, 90)); d.rectangle((x, 640, x + 70, 650), fill=(70, 74, 90))
        d.rectangle((0, 780, w, h), fill=(120, 120, 136))
    return _blurred(f, 18)


def desk_layer(laptop=True):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    d.rectangle((0, 1420, W, H), fill=(196, 160, 120, 255)); d.rectangle((0, 1420, W, 1432), fill=(222, 190, 150, 255))
    for y in range(1440, H, 40):
        d.line([(0, y), (W, y + 6)], fill=(186, 150, 112, 255), width=2)
    if laptop:
        lid = shade(rrect_mask(600, 340, 30), (214, 218, 226), radius=20, gloss=40)
        lay.alpha_composite(lid, (W // 2 - 300, 1110))
        sticker = Image.new("RGBA", (90, 90), (0, 0, 0, 0)); ImageDraw.Draw(sticker).ellipse((0, 0, 89, 89), fill=(255, 140, 60, 255))
        ImageDraw.Draw(sticker).text((22, 22), "</>", font=ImageFont.truetype(F_BLACK, 30), fill=(255, 255, 255, 255))
        lay.alpha_composite(sticker, (W // 2 - 45, 1230))
    return lay


def podium_layer():
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pod = shade(rrect_mask(620, 640, 30), (40, 44, 60), radius=26, gloss=60, spec=0.5)
    lay.alpha_composite(pod, (W // 2 - 310, 1300))
    d = ImageDraw.Draw(lay); f = ImageFont.truetype(F_BLACK, 46)
    d.text((W / 2 - f.getlength("DEMO DAY") / 2, 1420), "DEMO DAY", font=f, fill=(120, 170, 255, 255))
    return lay


def silhouette(frame, x, y, scale=1.0, alpha=230):
    """Out-of-focus person standing behind (manager / presenter)."""
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    s = scale
    d.ellipse((x - 85 * s, y - 85 * s, x + 85 * s, y + 85 * s), fill=(40, 34, 40, alpha))
    d.rounded_rectangle((x - 230 * s, y + 90 * s, x + 230 * s, y + 900 * s), int(140 * s), fill=(48, 44, 56, alpha))
    frame.alpha_composite(lay.filter(ImageFilter.GaussianBlur(10)))


# ------------------------------------------------------------------ screen UI (video call etc.)

def call_screen(t, who="Project Director", sub="Hiring · Video call", talking=0.0, chat=None, popup=None, progress=None, cursor=None):
    im = Image.new("RGBA", (W, H), (22, 24, 30, 255)); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, W, 110), fill=(32, 34, 42, 255))
    fb = ImageFont.truetype(F_BOLD, 34); fr = ImageFont.truetype(F_REG, 28)
    d.text((40, 32), "● meet.recruit-call.com", font=fr, fill=(140, 150, 170, 255))
    # caller tile
    d.rounded_rectangle((50, 300, W - 50, 1180), 36, fill=(52, 60, 78, 255))
    ring = 150 + talking * 40
    d.ellipse((W / 2 - ring, 640 - ring, W / 2 + ring, 640 + ring), outline=(90, 200, 140, int(80 + 175 * talking)), width=10)
    d.ellipse((W / 2 - 140, 500, W / 2 + 140, 780), fill=(214, 168, 130, 255))                 # face
    d.chord((W / 2 - 150, 470, W / 2 + 150, 700), 180, 360, fill=(60, 40, 30, 255))           # hair
    d.ellipse((W / 2 - 70, 610, W / 2 - 40, 640), fill=(40, 30, 30, 255)); d.ellipse((W / 2 + 40, 610, W / 2 + 70, 640), fill=(40, 30, 30, 255))
    d.arc((W / 2 - 60, 650, W / 2 + 60, 720), 20, 160, fill=(120, 50, 50, 255), width=8)
    d.pieslice((W / 2 - 260, 800, W / 2 + 260, 1260), 180, 360, fill=(40, 60, 110, 255))     # suit
    d.rounded_rectangle((80, 1100, 80 + fb.getlength(who) + 40, 1160), 14, fill=(0, 0, 0, 170))
    d.text((100, 1108), who, font=fb, fill=(255, 255, 255, 255))
    d.text((60, 220), sub, font=fr, fill=(150, 160, 180, 255))
    if chat:
        d.rounded_rectangle((60, 1230, W - 60, 1400), 26, fill=(44, 48, 60, 255))
        d.text((90, 1250), chat[0], font=fr, fill=(200, 210, 225, 255))
        d.rounded_rectangle((90, 1300, 560, 1380), 18, fill=(70, 120, 230, 255))
        d.text((120, 1318), "⬇  " + chat[1], font=fb, fill=(255, 255, 255, 255))
    if progress is not None:
        d.rounded_rectangle((90, 1420, W - 90, 1460), 20, fill=(50, 54, 66, 255))
        d.rounded_rectangle((90, 1420, 90 + (W - 180) * min(1, progress), 1460), 20, fill=(90, 210, 140, 255))
    if popup:
        d.rounded_rectangle((120, 820, W - 120, 1180), 30, fill=(245, 246, 250, 255), outline=(220, 70, 60, 255), width=6)
        d.text((170, 860), popup[0], font=ImageFont.truetype(F_BLACK, 40), fill=(200, 50, 40, 255))
        y = 930
        for line in popup[1].split("\n"):
            d.text((170, y), line, font=fr, fill=(40, 40, 50, 255)); y += 42
        d.rounded_rectangle((W - 420, 1080, W - 170, 1150), 18, fill=(220, 70, 60, 255))
        d.text((W - 370, 1092), "Allow", font=fb, fill=(255, 255, 255, 255))
    if cursor:
        x, y = cursor
        d.polygon([(x, y), (x, y + 60), (x + 16, y + 46), (x + 30, y + 74), (x + 40, y + 68), (x + 26, y + 42), (x + 46, y + 42)], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255))
    return im


def app_screen(t, mode="passports"):
    im = Image.new("RGBA", (W, H), (246, 247, 250, 255)); d = ImageDraw.Draw(im)
    fb = ImageFont.truetype(F_BOLD, 40); fr = ImageFont.truetype(F_REG, 30); fs = ImageFont.truetype(F_REG, 26)
    d.rectangle((0, 0, W, 330), fill=(124, 77, 255, 255))
    d.text((60, 250), "BotlyBook  ·  built in 1 weekend", font=fb, fill=(255, 255, 255, 255))
    rng = np.random.default_rng(4 if mode == "passports" else 9)
    names = ["A. Moreno", "J. Patel", "K. Okafor", "L. Chen", "M. Rossi", "S. Novak", "T. Berg"]
    y = 380
    k_show = int(min(len(names), 2 + t * 5))
    for i, nm in enumerate(names[:k_show]):
        d.rounded_rectangle((50, y, W - 50, y + 170), 24, fill=(255, 255, 255, 255), outline=(225, 228, 236, 255), width=2)
        if mode == "passports":
            d.rounded_rectangle((80, y + 25, 190, y + 145), 12, fill=(30, 60, 120, 255))
            d.ellipse((115, y + 60, 155, y + 100), outline=(220, 190, 90, 255), width=4)
            d.text((220, y + 30), f"{nm}  ·  Passport", font=fb, fill=(30, 30, 40, 255))
            num = "".join(str(rng.integers(0, 10)) for _ in range(9))
            d.text((220, y + 90), f"No. {num[:2]}•••••{num[-2:]}   Exp. 20{rng.integers(27, 35)}", font=fr, fill=(110, 115, 130, 255))
            d.rounded_rectangle((W - 260, y + 55, W - 80, y + 115), 16, fill=(232, 245, 236, 255))
            d.text((W - 240, y + 65), "PUBLIC", font=fr, fill=(30, 140, 70, 255))
        else:
            d.ellipse((80, y + 40, 170, y + 130), fill=tuple(int(c) for c in rng.integers(120, 230, 3)) + (255,))
            d.text((200, y + 30), nm, font=fb, fill=(30, 30, 40, 255))
            for j in range(2):
                ww = int(rng.integers(300, 640)); d.rounded_rectangle((200, y + 90 + j * 30, 200 + ww, y + 108 + j * 30), 9, fill=(214, 218, 228, 255))
            d.text((W - 230, y + 30), "private", font=fs, fill=(150, 150, 165, 255))
        y += 195
    return im


def news_card(source, date, headline, highlight, t):
    im = Image.new("RGBA", (W, H), (244, 241, 234, 255)); d = ImageDraw.Draw(im)
    fs = ImageFont.truetype(F_BLACK, 52); fd = ImageFont.truetype(F_REG, 30); fh = ImageFont.truetype(F_BOLD, 64)
    d.text((80, 470), source.upper(), font=fs, fill=(20, 20, 20, 255)); d.text((80, 540), date, font=fd, fill=(110, 110, 110, 255))
    d.line([(80, 600), (W - 80, 600)], fill=(20, 20, 20, 255), width=4)
    words = headline.split(); lines, cur = [], ""
    for w_ in words:
        if fh.getlength(cur + " " + w_) > W - 160:
            lines.append(cur.strip()); cur = w_
        else:
            cur += " " + w_
    lines.append(cur.strip()); y = 650
    k = min(1.0, max(0.0, (t - 0.5) / 0.6))
    for ln in lines:
        x = 80
        for w_ in ln.split():
            ww = fh.getlength(w_ + " ")
            if any(h_ in w_ for h_ in highlight.split()) and k > 0:
                d.rectangle((x - 6, y + 8, x - 6 + (ww - 4) * k, y + 80), fill=(255, 226, 0, 255))
            d.text((x, y), w_, font=fh, fill=(15, 15, 15, 255)); x += ww
        y += 88
    return im


# ------------------------------------------------------------------ overlays

def premise_box(frame, text):
    d = ImageDraw.Draw(frame); f = ImageFont.truetype(F_BOLD, 50)
    words = text.split(); lines, cur = [], ""
    for w_ in words:
        if f.getlength((cur + " " + w_).strip()) > 760:
            lines.append(cur.strip()); cur = w_
        else:
            cur += " " + w_
    lines.append(cur.strip())
    bw = max(f.getlength(l) for l in lines) + 70; bh = 66 * len(lines) + 40
    x0, y0 = (W - bw) / 2, 150
    d.rounded_rectangle((x0, y0, x0 + bw, y0 + bh), 22, fill=(255, 255, 255, 255))
    for i, l in enumerate(lines):
        d.text(((W - f.getlength(l)) / 2, y0 + 18 + i * 66), l, font=f, fill=(10, 10, 10, 255))


def caption(frame, text):
    if not text:
        return
    d = ImageDraw.Draw(frame); f = ImageFont.truetype(F_BOLD, 54)
    words = text.split(); lines, cur = [], ""
    for w_ in words:
        if f.getlength((cur + " " + w_).strip()) > 900:
            lines.append(cur.strip()); cur = w_
        else:
            cur += " " + w_
    lines.append(cur.strip())
    y = 1560 - 34 * (len(lines) - 1)
    for l in lines:
        x = (W - f.getlength(l)) / 2
        d.text((x, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(0, 0, 0, 255)); y += 70


# ------------------------------------------------------------------ audio

_kok = None


def voice(text, v, speed=1.0, robot=False):
    global _kok
    import hashlib
    cache = os.environ.get("TTS_CACHE", os.path.join(HERE, ".tts_cache")); os.makedirs(cache, exist_ok=True)
    key = hashlib.md5(f"{v}|{speed}|{text}".encode()).hexdigest()[:16]
    p = os.path.join(cache, f"bt_{key}.wav")
    if not os.path.exists(p):
        if _kok is None:
            from kokoro_onnx import Kokoro
            _kok = Kokoro(os.path.join(HERE, "models", "kokoro-v1.0.onnx"), os.path.join(HERE, "models", "voices-v1.0.bin"))
        a, sr = _kok.create(text, voice=v, speed=speed, lang="en-us")
        idx = np.where(np.abs(a) > 0.01)[0]
        a = a[max(0, idx[0] - 600): idx[-1] + 2000] if len(idx) else a
        sf.write(p, a, sr)
    a, sr = sf.read(p, dtype="float32")
    from scipy.signal import resample_poly
    if robot:                                       # pitch up a little + metallic ring + tiny comb
        a = resample_poly(a, 9, 10)                 # play back ~11% higher
        t = np.arange(len(a)) / sr
        a = a * (0.88 + 0.12 * np.sin(2 * np.pi * 55 * t))
        dly = int(0.004 * sr); a[dly:] += 0.2 * a[:-dly]
    a = resample_poly(a, SR, sr).astype(np.float32)
    return a / (np.sqrt(np.mean(a ** 2)) + 1e-9) * 0.09


def sfx(kind, rng):
    if kind == "type":
        n = int(1.0 * SR); y = np.zeros(n)
        for k in range(14):
            i = int(rng.uniform(0, 0.95) * SR); m = int(0.02 * SR)
            y[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.003 * SR)) * 0.5
        return y
    if kind == "click":
        m = int(0.04 * SR); return rng.standard_normal(m) * np.exp(-np.arange(m) / (0.004 * SR)) * 0.6
    if kind == "ding":
        t = np.arange(int(0.6 * SR)) / SR
        return (np.sin(2 * np.pi * 1320 * t) + 0.5 * np.sin(2 * np.pi * 1980 * t)) * np.exp(-t * 6) * 0.25
    if kind == "sting":                               # comic "uh-oh" descending tones
        out = []
        for f0 in (392, 370, 349, 311):
            t = np.arange(int(0.22 * SR)) / SR
            out.append(np.sign(np.sin(2 * np.pi * f0 * t)) * np.exp(-t * 3) * 0.12)
        return np.concatenate(out)
    if kind == "crickets":
        n = int(2.5 * SR); t = np.arange(n) / SR; y = np.zeros(n)
        for k in range(6):
            st = int((0.15 + k * 0.4) * SR); m = int(0.12 * SR); tt = np.arange(m) / SR
            chirp = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 45 * tt) > 0) * np.exp(-tt * 8)
            y[st:st + m] += chirp * 0.08
        return y
    if kind == "whoosh":
        n = int(0.35 * SR); x = ndimage.gaussian_filter1d(rng.standard_normal(n), 3)
        return x * np.sin(np.linspace(0, np.pi, n)) ** 2 * 0.5
    return np.zeros(1)


# ------------------------------------------------------------------ assembly

def render_skit(spec, out):
    rng = np.random.default_rng(1)
    bot = Botley()
    bgs = {"office": bg_office(), "stage": bg_stage(), "room": bg_room()}
    desk = desk_layer(True); desk_nolap = desk_layer(False); podium = podium_layer()
    voices = spec["voices"]
    # 1. audio per shot -> durations
    shots = spec["shots"]
    lines = []
    for sh in shots:
        if sh.get("line"):
            who, text = sh["line"][:2]
            say = sh["line"][2] if len(sh["line"]) > 2 else text
            v = voices[who]
            a = voice(say, v["voice"], v.get("speed", 1.0), v.get("robot", False))
            lines.append((who, text, a))
        else:
            lines.append(None)
    durs = []
    for sh, ln in zip(shots, lines):
        d = sh.get("dur", 1.5)
        if ln:
            d = max(d, sh.get("delay", 0.15) + len(ln[2]) / SR + sh.get("pad", 0.35))
        durs.append(d)
    total = sum(durs); n_audio = int(total * SR) + SR
    mix = np.zeros(n_audio, np.float32); bot_env = np.zeros(int(total * FPS) + 2)
    t0 = 0.0
    for sh, ln, d in zip(shots, lines, durs):
        i0 = int((t0 + sh.get("delay", 0.15)) * SR)
        if ln:
            a = ln[2][: n_audio - i0]; mix[i0:i0 + len(a)] += a
            if ln[0] == "botley":
                env = ndimage.uniform_filter1d(np.abs(a), int(SR / FPS))[:: int(SR / FPS)]
                f0 = int((t0 + sh.get("delay", 0.15)) * FPS)
                bot_env[f0:f0 + len(env)] = np.clip(env[: len(bot_env) - f0] / 0.12, 0, 1)
        for kind, at in sh.get("sfx", []):
            s = sfx(kind, rng); j = int((t0 + at) * SR); mix[j:j + len(s)] += s[: n_audio - j]
        t0 += d
    room = ndimage.gaussian_filter1d(rng.standard_normal(n_audio), 30) * 0.004
    mix = mix + room
    import pyloudnorm as pyln
    meter = pyln.Meter(SR); st = lambda x: np.stack([x, x], 1)            # measure as the stereo file we write
    mix = np.tanh(mix * 10 ** ((-14 - meter.integrated_loudness(st(mix))) / 20) * 1.05) / 1.05
    mix = mix * 10 ** ((-14 - meter.integrated_loudness(st(mix))) / 20)    # re-trim after the limiter
    wav = out + ".wav"; sf.write(wav, np.stack([mix, mix], 1).astype(np.float32), SR)
    # 2. video
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", out + ".v.mp4"],
                         stdin=subprocess.PIPE)
    fr_i = 0; t0 = 0.0
    for sh, ln, d in zip(shots, lines, durs):
        n = int(round(d * FPS))
        for k in range(n):
            t = k / FPS; T = t0 + t
            kind = sh["kind"]
            if kind == "bot":
                frame = bgs[sh.get("bg", "office")].copy()
                if sh.get("silhouette"):
                    silhouette(frame, *sh["silhouette"])
                mouth = float(bot_env[min(fr_i, len(bot_env) - 1)]) if ln and ln[0] == "botley" else 0.0
                expr = sh.get("expr", "normal")
                if isinstance(expr, list):                         # [[time, expr], ...]
                    e = expr[0][1]
                    for at, ex in expr:
                        if t >= at:
                            e = ex
                    expr = e
                lean = sh.get("lean", 0.0) * min(1, t / 0.5)
                tilt = sh.get("tilt", 0.0) * min(1, t / 0.8)
                zoom = 1 + sh.get("zoom", 0.0) * (t / max(d, 0.1))
                bot.draw(frame, W / 2, 820, T, expr=expr, mouth=mouth, lean=lean, tilt=tilt,
                         typing=sh.get("typing", False), scale=1.12)
                front = sh.get("front", "desk")
                if front == "podium":
                    frame.alpha_composite(podium)
                elif front != "none":
                    frame.alpha_composite(desk if sh.get("laptop", True) else desk_nolap)
                if zoom != 1:
                    zw, zh = W / zoom, H / zoom
                    frame = frame.resize((W, H), Image.BICUBIC, box=((W - zw) / 2, (H - zh) * 0.45, (W + zw) / 2, (H - zh) * 0.45 + zh))
            elif kind == "call":
                c = sh.get("call", {})
                talk = 0.0
                if ln and ln[0] != "botley":
                    talk = 0.5 + 0.5 * math.sin(T * 18)
                prog = None
                if "progress" in c:
                    a0, a1 = c["progress"]; prog = min(1, max(0, (t - a0) / (a1 - a0)))
                cur = None
                if "cursor" in c:
                    (x0, y0), (x1, y1), at = c["cursor"]; kk = min(1, t / max(0.01, at)); kk = kk * kk * (3 - 2 * kk)
                    cur = (x0 + (x1 - x0) * kk, y0 + (y1 - y0) * kk)
                popup = c.get("popup") if t >= c.get("popup_at", 0) else None
                frame = call_screen(T, c.get("who", "Project Director"), c.get("sub", "Hiring · Video call"),
                                    talking=talk, chat=c.get("chat"), popup=popup, progress=prog, cursor=cur)
            elif kind == "app":
                frame = app_screen(t, sh.get("mode", "passports"))
            elif kind == "news":
                frame = news_card(sh["source"], sh["date"], sh["headline"], sh["highlight"], t)
            premise_box(frame, spec["premise"])
            if sh.get("tag"):
                dtag = ImageDraw.Draw(frame); ft = ImageFont.truetype(F_BLACK, 38); tw = ft.getlength(sh["tag"])
                dtag.rounded_rectangle(((W - tw) / 2 - 24, 290, (W + tw) / 2 + 24, 350), 16, fill=(220, 40, 60, 255))
                dtag.text(((W - tw) / 2, 296), sh["tag"], font=ft, fill=(255, 255, 255, 255))
            caption(frame, ln[1] if (ln and t >= sh.get("delay", 0.15) - 0.05) else sh.get("caption"))
            p.stdin.write(frame.tobytes()); fr_i += 1
        t0 += d
    p.stdin.close(); p.wait()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out + ".v.mp4", "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], check=True)
    os.remove(out + ".v.mp4"); os.remove(wav)
    cover = os.path.splitext(out)[0] + "_cover.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(spec.get("cover_t", 1.0)), "-i", out, "-frames:v", "1", "-q:v", "2", cover], check=True)
    print(out, f"{total:.1f}s", ", ".join(f"{d:.1f}" for d in durs))


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("spec"); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    render_skit(json.load(open(a.spec)), a.out)
