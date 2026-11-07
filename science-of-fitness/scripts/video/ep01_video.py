"""Render Episode 1 as a 1080p video, timed to the recorded voiceover.

    python3 ep01_video.py            # full render -> episodes/ep01-skinny-to-bulky/video/ep01-first-cut.mp4
    python3 ep01_video.py stills     # one still per scene for review -> video/stills/

Every visual element is triggered by the start time of the narration line it belongs to
(audio/timings.json), so picture and voice stay in sync. Host and rival are stand-in art
(video/art/) until the real characters are drawn; DRAFT adds a small "first cut" tag.
"""
import json, math, os, subprocess, sys, shutil
from functools import lru_cache
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
EP = os.path.join(ROOT, "episodes", "ep01-skinny-to-bulky")
ART = os.path.join(EP, "video", "art")
A = os.path.join(ROOT, "assets", "anatomy")
W, H, FPS = 1920, 1080, 30
DRAFT = True

STAGE = (10, 12, 16, 255)
INK = (236, 240, 244)
MUTED = (154, 163, 175)
DIM = (90, 98, 110)
TEAL = (38, 224, 196)
CORAL = (255, 84, 84)
AMBER = (255, 184, 48)
CARD = (18, 22, 28)
LINE = (40, 46, 56)
FONT = "/usr/share/fonts/opentype/inter/"

T = json.load(open(os.path.join(EP, "audio", "timings.json")))
SCENES = {s["scene"]: s for s in T["scenes"]}
LINES = {}
_k = 0
for s in T["scenes"]:
    LINES[s["scene"]] = [max(0.0, c["start"] - s["start"]) for c in T["lines"][_k:_k + s["lines"]]]
    _k += s["lines"]


# ------------------------------------------------------------------ primitives
@lru_cache(None)
def font(size, weight="Bold", display=True):
    fam = "InterDisplay" if display else "Inter"
    return ImageFont.truetype(f"{FONT}{fam}-{weight}.otf", size)


@lru_cache(4096)
def text(s, size=48, weight="Bold", color=INK, display=True, maxw=None, align="left", spacing=1.18):
    f = font(size, weight, display)
    lines = []
    for para in s.split("\n"):
        if maxw is None:
            lines.append(para); continue
        cur = ""
        for w in para.split():
            t = (cur + " " + w).strip()
            if f.getlength(t) <= maxw or not cur:
                cur = t
            else:
                lines.append(cur); cur = w
        lines.append(cur)
    lh = int(size * spacing)
    wmax = int(max(f.getlength(l) for l in lines)) + 8
    im = Image.new("RGBA", (wmax, lh * len(lines) + int(size * 0.3)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, l in enumerate(lines):
        x = 0 if align == "left" else ((wmax - f.getlength(l)) / 2 if align == "center" else wmax - f.getlength(l))
        d.text((x, i * lh), l, font=f, fill=color + (255,) if len(color) == 3 else color)
    return im


def rich(parts, size=60, weight="Black"):
    """One line with differently coloured words: [("PUSH THE ", INK), ("FLOOR", TEAL)]."""
    f = font(size, weight)
    wsum = int(sum(f.getlength(p) for p, _ in parts)) + 8
    im = Image.new("RGBA", (wsum, int(size * 1.3)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im); x = 0
    for p, c in parts:
        d.text((x, 0), p, font=f, fill=c + (255,)); x += f.getlength(p)
    return im


_LUT = {}


def faded(sp, a):
    if a >= 0.999:
        return sp
    a = max(0.0, a)
    key = int(a * 50)
    lut = _LUT.get(key)
    if lut is None:
        lut = [int(v * key / 50) for v in range(256)]; _LUT[key] = lut
    sp = sp.copy(); sp.putalpha(sp.getchannel("A").point(lut)); return sp


def put(fr, sp, x, y, a=1.0, anchor="lt", scale=1.0):
    if a <= 0.01 or sp is None:
        return
    if abs(scale - 1) > 1e-3:
        sp = sp.resize((max(1, int(sp.width * scale)), max(1, int(sp.height * scale))), Image.BILINEAR)
    if anchor[0] == "m": x -= sp.width / 2
    elif anchor[0] == "r": x -= sp.width
    if anchor[1] == "m": y -= sp.height / 2
    elif anchor[1] == "b": y -= sp.height
    x, y = int(round(x)), int(round(y))
    sx0, sy0 = max(0, -x), max(0, -y)
    sx1, sy1 = min(sp.width, W - x), min(sp.height, H - y)
    if sx1 <= sx0 or sy1 <= sy0:
        return
    if (sx0, sy0, sx1, sy1) != (0, 0, sp.width, sp.height):
        sp = sp.crop((sx0, sy0, sx1, sy1))
    fr.alpha_composite(faded(sp, a), (x + sx0, y + sy0))


@lru_cache(None)
def legs_glow(path):
    gl = glow(path, 2000, 980, CORAL, 30)
    a = np.asarray(gl.getchannel("A")).astype(np.float32)
    ramp = np.clip((np.arange(gl.height) / gl.height - 0.5) / 0.15, 0, 1)[:, None]  # fade in below the waist
    out = gl.copy(); out.putalpha(Image.fromarray((a * ramp).astype(np.uint8)))
    return out


def ease(x):
    x = min(max(x, 0.0), 1.0); return 1 - (1 - x) ** 3


def ap(t, t0, d=0.4):
    return ease((t - t0) / d)


def show(fr, sp, x, y, t, t0, anchor="lt", rise=24, d=0.4):
    """Fade and slide up from t0."""
    p = ap(t, t0, d)
    if p > 0:
        put(fr, sp, x, y + (1 - p) * rise, p, anchor)


def L(sc, i):
    ls = LINES[sc]
    return ls[min(i, len(ls) - 1)] if ls else 0.0


@lru_cache(None)
def load(path, maxw, maxh):
    im = Image.open(path).convert("RGBA")
    im.thumbnail((maxw, maxh), Image.LANCZOS)
    return im


@lru_cache(None)
def glow(path, maxw, maxh, color, radius=24):
    sp = load(path, maxw, maxh)
    a = sp.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    g = Image.new("RGBA", sp.size, color + (0,)); g.putalpha(a.point(lambda v: int(v * 0.8)))
    pad = radius * 2
    out = Image.new("RGBA", (sp.width + pad * 2, sp.height + pad * 2), (0, 0, 0, 0)); out.alpha_composite(g, (pad, pad))
    return out


@lru_cache(512)
def ring(frac_q, size, color, width=26, track=LINE):
    s2 = size * 2
    im = Image.new("RGBA", (s2, s2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    w2 = width * 2
    d.ellipse((w2 // 2, w2 // 2, s2 - w2 // 2, s2 - w2 // 2), outline=track + (255,), width=w2)
    if frac_q > 0:
        d.arc((w2 // 2, w2 // 2, s2 - w2 // 2, s2 - w2 // 2), -90, -90 + 360 * frac_q / 100, fill=color + (255,), width=w2)
    return im.resize((size, size), Image.LANCZOS)


def stat_ring(fr, t, t0, cx, cy, size, frac, big, sub, color=TEAL, big_size=120, count=None):
    p = ap(t, t0, 1.4)
    if p <= 0:
        return
    put(fr, ring(int(frac * p * 100), size, color), cx, cy, min(1, p * 3), "mm")
    val = big if count is None else count(p)
    put(fr, text(val, big_size, "Black"), cx, cy - 12, min(1, p * 3), "mm")
    put(fr, text(sub, 30, "SemiBold", MUTED, False, maxw=max(size, 520), align="center"), cx, cy + size / 2 + 24, min(1, p * 2), "mt")


@lru_cache(None)
def card(w, h, outline=LINE, fill=CARD, r=22, width=3):
    im = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((width, width, w * 2 - width, h * 2 - width), r * 2, fill=fill + (255,), outline=outline + (255,), width=width * 2)
    return im.resize((w, h), Image.LANCZOS)


@lru_cache(None)
def chip(s, color=TEAL, fg=(10, 12, 16), size=30):
    tx = text(s, size, "Bold", fg)
    im = card(tx.width + 44, tx.height + 22, color, color, r=(tx.height + 22) // 2, width=1).copy()
    im.alpha_composite(tx, (22, 10)); return im


# ------------------------------------------------------------------ icons (drawn at 2x, ink style)
@lru_cache(None)
def icon(name, size=220, color=INK, accent=AMBER):
    s = size * 2; im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    c = color + (255,); a = accent + (255,); lw = max(4, s // 40)
    u = s / 100
    def R(x0, y0, x1, y1): return (x0 * u, y0 * u, x1 * u, y1 * u)
    if name == "burger":
        d.chord(R(10, 18, 90, 70), 180, 360, outline=c, width=lw, fill=a)
        d.rounded_rectangle(R(8, 48, 92, 58), 6 * u, outline=c, width=lw, fill=(110, 70, 40, 255))
        d.line([(12 * u, 63 * u), (88 * u, 63 * u)], fill=TEAL + (255,), width=lw)
        d.rounded_rectangle(R(10, 68, 90, 82), 6 * u, outline=c, width=lw, fill=a)
    elif name == "fries":
        for i in range(6):
            d.rectangle(R(24 + i * 9, 14 + (i % 3) * 5, 30 + i * 9, 60), fill=a, outline=c, width=lw // 2)
        d.polygon([(20 * u, 45 * u), (80 * u, 45 * u), (72 * u, 90 * u), (28 * u, 90 * u)], fill=CORAL + (255,), outline=c)
    elif name == "drink":
        d.polygon([(28 * u, 22 * u), (72 * u, 22 * u), (66 * u, 92 * u), (34 * u, 92 * u)], outline=c, fill=(60, 66, 76, 255))
        d.line([(55 * u, 22 * u), (62 * u, 4 * u)], fill=c, width=lw)
        d.rectangle(R(26, 18, 74, 26), outline=c, width=lw // 2, fill=c)
    elif name == "glass":
        d.polygon([(28 * u, 12 * u), (72 * u, 12 * u), (66 * u, 92 * u), (34 * u, 92 * u)], outline=c, width=lw)
        d.polygon([(31 * u, 35 * u), (69 * u, 35 * u), (66 * u, 90 * u), (34 * u, 90 * u)], fill=(245, 245, 245, 255))
    elif name == "banana":
        d.arc(R(10, -10, 90, 80), 30, 150, fill=a, width=int(16 * u))
        d.arc(R(10, -10, 90, 80), 30, 150, fill=c, width=lw // 2)
    elif name == "egg":
        d.ellipse(R(26, 10, 74, 90), outline=c, width=lw, fill=(245, 245, 240, 255))
    elif name == "bowl":
        d.chord(R(8, 10, 92, 90), 0, 180, outline=c, width=lw, fill=a)
        d.line([(8 * u, 50 * u), (92 * u, 50 * u)], fill=c, width=lw)
    elif name == "plate":
        d.ellipse(R(6, 20, 94, 80), outline=c, width=lw); d.ellipse(R(20, 30, 80, 70), outline=c, width=lw // 2)
    elif name == "roti":
        d.ellipse(R(10, 10, 90, 90), outline=c, width=lw, fill=(225, 190, 130, 255))
        for x, y in ((35, 35), (60, 45), (45, 65), (65, 68)):
            d.ellipse(R(x - 4, y - 3, x + 4, y + 3), fill=(150, 100, 50, 255))
    elif name == "peanut":
        for x, y in ((30, 35), (62, 62)):
            d.ellipse(R(x - 22, y - 20, x + 22, y + 20), outline=c, width=lw, fill=a)
    elif name == "spoon":
        d.ellipse(R(12, 30, 52, 60), outline=c, width=lw, fill=a); d.line([(50 * u, 45 * u), (92 * u, 45 * u)], fill=c, width=lw)
    elif name == "chicken":
        d.ellipse(R(10, 15, 70, 65), outline=c, width=lw, fill=(200, 140, 80, 255))
        d.line([(60 * u, 55 * u), (85 * u, 80 * u)], fill=c, width=int(8 * u))
        d.ellipse(R(80, 72, 92, 84), fill=c); d.ellipse(R(84, 66, 96, 78), fill=c)
    elif name == "jar":
        d.rounded_rectangle(R(24, 22, 76, 92), 8 * u, outline=c, width=lw, fill=(170, 110, 60, 255))
        d.rectangle(R(22, 10, 78, 24), outline=c, width=lw, fill=a)
    elif name == "blender":
        d.polygon([(26 * u, 8 * u), (74 * u, 8 * u), (66 * u, 66 * u), (34 * u, 66 * u)], outline=c, width=lw)
        d.rounded_rectangle(R(24, 66, 76, 92), 6 * u, outline=c, width=lw, fill=(60, 66, 76, 255))
        d.ellipse(R(46, 74, 54, 82), fill=TEAL + (255,))
    elif name == "scale":
        d.rounded_rectangle(R(8, 30, 92, 90), 10 * u, outline=c, width=lw)
        d.rounded_rectangle(R(30, 40, 70, 56), 4 * u, fill=TEAL + (255,))
    elif name == "bricks":
        for row in range(3):
            for col in range(3 - (row % 2)):
                x0 = 8 + col * 30 + (15 if row % 2 else 0); y0 = 62 - row * 24
                d.rectangle(R(x0, y0, x0 + 26, y0 + 20), outline=c, width=lw // 2, fill=a)
    elif name == "stomach":
        pts = []
        for k in range(0, 361, 8):
            th = math.radians(k)
            r = 30 + 6 * math.cos(2 * th)
            pts.append(((52 + r * math.cos(th) * 1.15) * u, (58 + r * math.sin(th) * 0.8) * u))
        d.polygon(pts, outline=c, fill=CORAL + (255,))
        d.line([(36 * u, 6 * u), (40 * u, 36 * u)], fill=c, width=int(9 * u))
        d.line([(84 * u, 66 * u), (92 * u, 86 * u)], fill=c, width=int(7 * u))
    elif name == "moon":
        d.ellipse(R(15, 15, 85, 85), fill=c); d.ellipse(R(35, 5, 100, 70), fill=(10, 12, 16, 255))
    elif name == "phone":
        d.rounded_rectangle(R(28, 6, 72, 94), 8 * u, outline=c, width=lw, fill=(30, 34, 42, 255))
    elif name == "tub":
        d.rounded_rectangle(R(22, 20, 78, 92), 8 * u, outline=c, width=lw, fill=(60, 66, 76, 255))
        d.rectangle(R(20, 10, 80, 22), outline=c, width=lw, fill=c)
    elif name == "football":
        d.ellipse(R(8, 8, 92, 92), outline=c, width=lw, fill=(245, 245, 245, 255))
        d.regular_polygon((50 * u, 50 * u, 14 * u), 5, fill=(20, 20, 20, 255))
    elif name == "sandwich":
        d.polygon([(10 * u, 80 * u), (90 * u, 80 * u), (50 * u, 14 * u)], outline=c, width=lw, fill=(230, 200, 140, 255))
        d.line([(24 * u, 62 * u), (76 * u, 62 * u)], fill=TEAL + (255,), width=lw)
    elif name == "camera":
        d.rounded_rectangle(R(8, 28, 92, 82), 8 * u, outline=c, width=lw); d.ellipse(R(34, 36, 66, 72), outline=c, width=lw)
        d.rectangle(R(30, 18, 50, 28), fill=c)
    elif name == "oats":
        d.chord(R(8, 20, 92, 96), 0, 180, outline=c, width=lw, fill=(220, 200, 160, 255))
        for x in (30, 45, 60, 72):
            d.ellipse(R(x - 5, 50, x + 5, 56), fill=(170, 140, 90, 255))
    elif name == "dumbbell":
        d.rectangle(R(20, 44, 80, 56), fill=c)
        for x in (8, 76):
            d.rounded_rectangle(R(x, 26, x + 16, 74), 3 * u, fill=c)
    return im.resize((size, size), Image.LANCZOS)


# ------------------------------------------------------------------ characters
def character(fr, who, t, x, y_bottom, height=860, bob=6, a=1.0):
    path = os.path.join(ART, "host.png" if who == "host" else "rival.png")
    sp = load(path, 2000, height)
    put(fr, sp, x, y_bottom + math.sin(t * 2.2) * bob, a, "mb")


def speech(fr, t, who, s, t0=0.0, side="left"):
    cx = 420 if side == "left" else W - 420
    character(fr, who, t, cx, H - 20, 900, a=ap(t, t0, 0.3))
    bx = 860 if side == "left" else 140
    tx = text(s, 54, "Bold", (14, 16, 20), maxw=820)
    bw, bh = tx.width + 90, tx.height + 70
    p = ap(t, t0 + 0.1, 0.3)
    if p > 0:
        bub = card(bw, bh, INK, INK, r=40, width=2).copy(); bub.alpha_composite(tx, (45, 34))
        put(fr, bub, bx, 300, p, "lt", scale=0.92 + 0.08 * p)
        name = {"host": "[HOST]", "rival": "[RIVAL]"}[who]
        put(fr, text(name, 26, "Bold", MUTED, False), bx + 10, 300 - 44, p)


# ------------------------------------------------------------------ clips
class Clip:
    def __init__(self, path, w, h):
        self.w, self.h = w, h
        self.p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo",
                                   "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)
        self.i, self.last = -1, None

    def get(self, idx):
        while self.i < idx:
            b = self.p.stdout.read(self.w * self.h * 4)
            if len(b) < self.w * self.h * 4:
                break
            self.last = Image.frombuffer("RGBA", (self.w, self.h), b, "raw", "RGBA", 0, 1); self.i += 1
        return self.last


# ------------------------------------------------------------------ chrome
CHAPTER = {**{k: "REASON 1 · YOU REMEMBER THE BIG MEALS" for k in (5, 6, 7)},
           **{k: "REASON 2 · YOUR BODY BURNS IT OFF" for k in (8, 9)},
           **{k: "REASON 3 · NO REASON TO GROW" for k in (10, 11, 12)},
           **{k: "THE ECTOMORPH MYTH" for k in (13, 14)},
           **{k: "PART 2 · THE FOOD" for k in range(15, 22)},
           **{k: "PART 3 · THE WORKOUT" for k in range(22, 28)},
           **{k: "PART 4 · THE PLAN" for k in (28, 29)},
           **{k: "QUICK QUESTIONS" for k in (30, 31, 32)}}
PART = {**{k: 0 for k in range(5, 15)}, **{k: 1 for k in range(15, 22)}, **{k: 2 for k in range(22, 28)},
        **{k: 3 for k in (28, 29)}, **{k: 4 for k in (30, 31, 32)}}
SOURCE = {1: "Levine et al., Science, 1999", 2: "Levine et al., Science, 1999", 3: "Levine et al., Science, 1999",
          9: "Levine et al., Science, 1999", 14: "Hubal et al., Med Sci Sports Exerc, 2005", 16: "Iraki et al., Sports, 2019",
          18: "Morton et al., Br J Sports Med, 2018", 19: "Approx. values: USDA FoodData Central",
          20: "Approx. values: USDA FoodData Central", 21: "Approx. values: USDA FoodData Central",
          22: "Schoenfeld et al., J Sports Sci 2017; Sports Med 2016", 23: "Schoenfeld et al., J Strength Cond Res, 2017",
          27: "Lamon et al., Physiol Rep, 2021", 31: "Kreider et al., J Int Soc Sports Nutr, 2017"}
SAFETY = {24, 25, 26}


def chrome(fr, sc, t):
    d = ImageDraw.Draw(fr)
    if sc in CHAPTER:
        d.rectangle((56, 52, 61, 82), fill=TEAL + (255,))
        put(fr, text(CHAPTER[sc], 26, "SemiBold", MUTED, False), 76, 50)
    if sc in PART:
        for i in range(5):
            cx, cy, r = W - 70 - (4 - i) * 34, 66, 11
            if i == PART[sc]:
                d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=TEAL + (255,))
            else:
                d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=MUTED + (255,), width=2)
    if sc in SOURCE:
        put(fr, text("SOURCE  " + SOURCE[sc], 22, "Medium", MUTED, False), W - 56, H - 44, 1, "rb")
    if sc in SAFETY:
        put(fr, chip("⚠ GO SLOW. STOP IF IT HURTS.".replace("⚠ ", ""), AMBER, (10, 12, 16), 20), 56, H - 44, 1, "lb")
    if DRAFT:
        put(fr, text("FIRST CUT · STAND-IN ART", 18, "SemiBold", DIM, False), W - 56, 96, 1, "rt")


# ------------------------------------------------------------------ shared scene parts
@lru_cache(None)
def person(fill_q, glow_legs=False, h=330):
    """Small grey figure from the skin layer; fill_q = amber fat level 0..20."""
    sp = load(os.path.join(A, "body", "skin-front.png"), 2000, 1400)
    a = np.asarray(sp.getchannel("A")).astype(np.float32) / 255
    ys, xs = np.nonzero(a > 0.1); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    hh, ww = a.shape
    rgb = np.zeros((hh, ww, 3), np.float32) + np.array([88, 94, 104], np.float32)
    if fill_q:
        lvl = int(hh * (1 - 0.92 * fill_q / 20))
        fat = np.zeros_like(a); fat[lvl:, :] = 1
        rgb = rgb * (1 - fat[..., None] * 0.85) + np.array(AMBER, np.float32) * fat[..., None] * 0.85
    if glow_legs:
        legs = np.zeros_like(a); legs[int(hh * 0.58):, :] = 1
        rgb = rgb * (1 - legs[..., None] * 0.8) + np.array(TEAL, np.float32) * legs[..., None] * 0.8
    im = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), "RGBA")
    im.thumbnail((h, h), Image.LANCZOS); return im


FAT = [2, 9, 4, 16, 6, 3, 12, 20, 5, 8, 2, 14, 7, 10, 3, 18]


def crowd(fr, t, t0, fills=None, glow_low=False, y=560):
    for i in range(16):
        x = 150 + i * 108
        f = 0 if fills is None else int(fills[i])
        g = glow_low and FAT[i] <= 5
        sp = person(f, g)
        bob = math.sin(t * 6 + i) * 6 if g else 0
        show(fr, sp, x, y + bob, t, t0 + i * 0.05, "mt")


def kb(fr, path, t, D, box, zoom=(1.0, 1.08), a=1.0, anchor_xy=None):
    """Ken Burns: slow zoom on an image fitted into box=(x, y, w, h)."""
    x, y, w, h = box
    sp = load(path, int(w * zoom[1]), int(h * zoom[1]))
    z = zoom[0] + (zoom[1] - zoom[0]) * min(1, t / max(D, 0.01))
    s = z / zoom[1]
    cx, cy = (x + w / 2, y + h / 2) if anchor_xy is None else anchor_xy
    put(fr, sp, cx, cy, a, "mm", scale=s)


def title(fr, t, t0, s, size=96, color=INK, x=W / 2, y=H / 2, anchor="mm", maxw=1500):
    show(fr, text(s, size, "Black", color, maxw=maxw, align="center" if anchor[0] == "m" else "left"), x, y, t, t0, anchor)


def sub(fr, t, t0, s, x=W / 2, y=700, anchor="mt", size=40, color=MUTED, maxw=1400):
    show(fr, text(s, size, "SemiBold", color, False, maxw=maxw, align="center" if anchor[0] == "m" else "left"), x, y, t, t0, anchor)


# ------------------------------------------------------------------ scenes
def s1(fr, t, D, sc):
    if t < L(sc, 1):
        title(fr, t, L(sc, 0), "IMAGINE THIS.", 130)
    elif t < L(sc, 3):
        show(fr, rich([("+1,000 ", AMBER), ("CALORIES", INK)], 120), W / 2, 230, t, L(sc, 1), "mm")
        sub(fr, t, L(sc, 1) + 0.6, "every day · 8 weeks · 16 people", y=320)
        if t >= L(sc, 2):
            for i, n in enumerate(("burger", "fries", "drink")):
                show(fr, icon(n, 260), 560 + i * 400, 640, t, L(sc, 2) + i * 0.35, "mm")
            sub(fr, t, L(sc, 2) + 1.2, "≈ an extra burger, fries and a drink. Every. Single. Day.", y=820, color=INK, size=42)
    else:
        show(fr, rich([("+1,000 ", AMBER), ("CALORIES · 8 WEEKS", INK)], 70), W / 2, 150, t, L(sc, 3), "mm")
        crowd(fr, t, L(sc, 3))
        sub(fr, t, L(sc, 3) + 1.2, "No gym. Nothing special.", y=960, color=INK)


def s2(fr, t, D, sc):
    p = ease((t - L(sc, 1)) / 3.0)
    crowd(fr, t, -5, fills=[f * p for f in FAT])
    title(fr, t, L(sc, 1), "Some gained 10× more fat than others", 72, y=200)
    sub(fr, t, L(sc, 2), "Same food. Same 8 weeks.", y=960, color=INK, size=46)


def s3(fr, t, D, sc):
    hx = 560
    path = os.path.join(ART, "host.png")
    pulse = 0.5 + 0.5 * math.sin(t * 7)
    put(fr, legs_glow(path), hx, H - 20 + 60 + math.sin(t * 6.6) * 10, 0.45 + 0.45 * pulse, "mb")
    character(fr, "host", t * 3, hx, H - 20, 980, bob=10)
    if t < L(sc, 3):
        title(fr, t, L(sc, 0), "What was different?", 72, x=1000, y=240, anchor="lm")
        sub(fr, t, L(sc, 1), "Their bodies moved more. Without noticing.", x=1000, y=330, anchor="lt", color=INK, size=44, maxw=820)
        for i, s in enumerate(("Shaking their leg.", "Standing up more.", "Walking around.")):
            show(fr, text(s, 56, "Bold", TEAL), 1000, 520 + i * 90, t, L(sc, 2) + i * 0.8)
    else:
        stat_ring(fr, t, L(sc, 3), 1380, 440, 460, 0.85, "692", "extra calories a day, burned just by moving (one person)",
                  CORAL, 140, count=lambda p: f"{int(692 * p)}")
        sub(fr, t, L(sc, 4), "Their body burned off a big chunk of the extra food.", x=1380, y=820, color=INK, size=40, maxw=760)


def s4(fr, t, D, sc):
    character(fr, "host", t, 1450, H - 20, 980)
    title(fr, t, L(sc, 0), "WHY YOU'RE\nSKINNY", 150, x=140, y=330, anchor="lm")
    sub(fr, t, L(sc, 1), "3 reasons + a simple plan you can do at home", x=140, y=560, anchor="lt", color=TEAL, size=44, maxw=900)
    sub(fr, t, L(sc, 2), "Not medical advice · Sources on screen · Losing weight without trying? See a doctor.", x=140, y=900,
        anchor="lt", size=28, maxw=1000)


def s5(fr, t, D, sc):
    speech(fr, t, "rival", "Bro, I eat a LOT. I just have a fast metabolism.")


def s6(fr, t, D, sc):
    if t < L(sc, 3):
        title(fr, t, L(sc, 0), "Eating \"a lot\" is tricky.", 64, y=170)
        days = [("MON", "2 plates of biryani", AMBER, 1), ("TUE", "woke up late · no breakfast", MUTED, 2),
                ("WED", "lunch = a packet of chips", MUTED, 2), ("THU", "just not hungry", MUTED, 2)]
        for i, (d, s, col, li) in enumerate(days):
            t0 = L(sc, li) + (0 if li == 1 else (i - 1) * 1.6)
            c = card(380, 300, col if li == 1 else LINE).copy()
            c.alpha_composite(text(d, 44, "Black", col), (28, 24))
            c.alpha_composite(text(s, 32, "SemiBold", INK, False, maxw=320), (28, 100))
            show(fr, c, 130 + i * 430, 330, t, t0)
    else:
        vals = [95, 30, 35, 20, 55, 40, 45]
        base, top = 860, 280
        need = 62
        for i, v in enumerate(vals):
            p = ap(t, L(sc, 3) + i * 0.12, 0.6)
            hgt = (v / 100) * (base - top) * p
            x = 250 + i * 175
            col = AMBER if i == 0 else (80, 88, 100)
            ImageDraw.Draw(fr).rounded_rectangle((x, base - hgt, x + 110, base), 10, fill=col + (255,))
            put(fr, text("MTWTFSS"[i], 34, "Bold", MUTED), x + 55, base + 20, p, "mt")
        y = base - need / 100 * (base - top)
        p = ap(t, L(sc, 3) + 1.2, 0.5)
        if p > 0:
            d = ImageDraw.Draw(fr)
            for x in range(220, 1450, 40):
                d.line((x, y, x + 22, y), fill=TEAL + (255,), width=4)
            put(fr, text("needed to grow", 34, "Bold", TEAL), 1475, y, p, "lm")
        avg = sum(vals) / len(vals); ya = base - avg / 100 * (base - top)
        p2 = ap(t, L(sc, 4), 0.5)
        if p2 > 0:
            ImageDraw.Draw(fr).line((220, ya, 220 + 1230 * p2, ya), fill=CORAL + (255,), width=6)
            put(fr, text("your weekly average", 34, "Bold", CORAL), 1475, ya, p2, "lm")
        title(fr, t, L(sc, 3) + 0.3, "Your body counts the whole week, not your best day", 52, y=160)


def s7(fr, t, D, sc):
    kb(fr, os.path.join(A, "closeups", "brain-spine-nerves.png"), t, D, (980, 60, 900, 900), (1.0, 1.1))
    show(fr, icon("stomach", 300), 420, 640, t, 0, "mm")
    put(fr, text("stomach", 32, "Bold", MUTED), 420, 810, ap(t, 0.3), "mt")
    if t >= L(sc, 1):
        p = ease((t - L(sc, 1) - 0.8) / 2.2)
        x = 520 + (1300 - 520) * p; y = 560 - math.sin(p * math.pi) * 260 - 120 * p
        put(fr, chip("\"we're full, stop eating.\"", INK, (14, 16, 20), 34), x, y, ap(t, L(sc, 1) + 0.4), "mm")
    if t >= L(sc, 2):
        title(fr, t, L(sc, 2), "Some people get it\nearly and loud.", 60, x=110, y=170, anchor="lt")
    if t >= L(sc, 3):
        sub(fr, t, L(sc, 3), "Huge lunch → stuffed all afternoon → smaller dinner", x=110, y=910, anchor="lt", color=INK, size=36)
    if t >= L(sc, 4):
        sub(fr, t, L(sc, 4), "You just don't eat a lot EVERY day.", x=110, y=970, anchor="lt", color=TEAL, size=40)


def s8(fr, t, D, sc):
    title(fr, t, L(sc, 0), "Your daily energy = a phone battery", 64, y=200)
    x0, y0, w, h = 260, 380, 1300, 300
    d = ImageDraw.Draw(fr)
    if ap(t, L(sc, 0)) > 0:
        d.rounded_rectangle((x0, y0, x0 + w, y0 + h), 30, outline=INK + (255,), width=8)
        d.rounded_rectangle((x0 + w + 10, y0 + 100, x0 + w + 50, y0 + 200), 10, fill=INK + (255,))
    segs = [("staying alive", 0.6, (110, 120, 132), 1, "heart · brain · keeping warm"), ("digesting", 0.1, AMBER, 2, "food"),
            ("moving", 0.27, CORAL, 3, "walking · standing · fidgeting")]
    cx = x0 + 20
    for name, frac, col, li, note in segs:
        p = ap(t, L(sc, li), 0.8)
        ww = (w - 40) * frac * p
        if p > 0:
            d.rounded_rectangle((cx, y0 + 20, cx + ww, y0 + h - 20), 16, fill=col + (255,))
            ly = y0 - 110 if name == "digesting" else y0 + h + 30
            put(fr, text(name, 40, "Black", col if col != (110, 120, 132) else INK), cx, ly, p)
            put(fr, text(note, 28, "SemiBold", MUTED, False), cx, ly + 54, p)
        cx += (w - 40) * frac + 8
    put(fr, text("roughly", 26, "SemiBold", DIM, False), x0 + w, y0 - 40, ap(t, L(sc, 1)), "rt")


def s9(fr, t, D, sc):
    crowd(fr, t, -5, glow_low=True, y=420)
    title(fr, t, L(sc, 0), "Eat more → body moves more", 66, y=170)
    sub(fr, t, L(sc, 1), "(without you noticing)", y=250, color=TEAL)
    clip = CLIPS.get("nerves")
    if clip:
        fi = clip.get(int(t * FPS) % 119)
        if fi is not None:
            put(fr, card(500, 290, LINE), W - 560, 700, ap(t, 0.5))
            put(fr, fi, W - 550, 710, ap(t, 0.5))
    sub(fr, t, L(sc, 2), "Food works on you.", x=150, y=850, anchor="lt", color=INK, size=46)
    sub(fr, t, L(sc, 3), "You just need a little more than you think.", x=150, y=920, anchor="lt", color=TEAL, size=40)


def s10(fr, t, D, sc):
    clip = CLIPS.get("zoom")
    if t < 2.5 and clip:
        fi = clip.get(int(t * FPS))
        if fi is not None:
            put(fr, fi, 0, 0)
    else:
        kb(fr, os.path.join(A, "micro", "muscle-hierarchy.png"), t - 2.5, D - 2.5, (0, 120, W, 860), (1.0, 1.06))
    title(fr, t, L(sc, 0), "MUSCLE IS EXPENSIVE", 90, y=150)
    sub(fr, t, L(sc, 1), "Energy to build it. Energy to keep it.", y=900, color=INK, size=44)
    sub(fr, t, L(sc, 2), "No reason → no new muscle.", y=970, color=CORAL, size=44)


def s11(fr, t, D, sc):
    kb(fr, os.path.join(A, "micro", "mito-in-fibre.png"), t, D, (0, 60, W, 960), (1.0, 1.05), a=0.35)
    title(fr, t, L(sc, 0), "A building that's always being worked on", 60, y=160)
    show(fr, chip("BUILDERS · add new parts", TEAL, (10, 12, 16), 36), 300, 330, t, L(sc, 1))
    show(fr, chip("DEMOLITION · tear old parts down", CORAL, (10, 12, 16), 36), 1000, 330, t, L(sc, 1) + 0.6)
    # balance beam
    tilt = 0.0 if t < L(sc, 3) else -0.16 * ap(t, L(sc, 3) + 0.4, 1.0)
    cx, cy, half = W / 2, 640, 520
    d = ImageDraw.Draw(fr)
    d.polygon([(cx, cy + 10), (cx - 50, cy + 110), (cx + 50, cy + 110)], fill=INK + (255,))
    xl, yl = cx - half * math.cos(tilt), cy - half * math.sin(-tilt)
    xr, yr = cx + half * math.cos(tilt), cy - half * math.sin(tilt)
    d.line((xl, yl, xr, yr), fill=INK + (255,), width=14)
    d.ellipse((xl - 60, yl - 60, xl + 60, yl + 60), fill=TEAL + (255,)); d.ellipse((xr - 60, yr - 60, xr + 60, yr + 60), fill=CORAL + (255,))
    sub(fr, t, L(sc, 2), "No training: both crews work at the same speed. Nothing changes.", y=810, color=INK, size=40)
    if t >= L(sc, 3):
        sub(fr, t, L(sc, 3), "Training hard → builders speed up. Food + protein = their bricks.", y=880, color=TEAL, size=40)


def s12(fr, t, D, sc):
    path = os.path.join(A, "muscle-highlights", "chest-front.png")
    put(fr, load(path, 2000, 900), 520, 560 + math.sin(t * 4) * 4, 1, "mm")
    rep = 8 + min(5, int(max(0, t - 0.5) / 1.2))
    put(fr, text(f"REP {rep}", 150, "Black", INK), 1350, 330, ap(t, 0), "mm")
    eff = min(1, max(0, t - 0.5) / 6.5)
    d = ImageDraw.Draw(fr); d.rounded_rectangle((1050, 450, 1650, 490), 20, outline=LINE + (255,), width=3)
    d.rounded_rectangle((1050, 450, 1050 + 600 * eff, 490), 20, fill=(CORAL if eff > 0.8 else AMBER) + (255,))
    put(fr, text("effort", 28, "SemiBold", MUTED, False), 1050, 500, 1)
    title(fr, t, L(sc, 1), "Hard sets = the message", 64, x=1350, y=640)
    sub(fr, t, L(sc, 2), "No message → no new muscle", x=1350, y=730, color=INK, size=42)
    sub(fr, t, L(sc, 3), "Eat a ton without training → mostly fat", x=1350, y=800, color=AMBER, size=42)


def s13(fr, t, D, sc):
    speech(fr, t, "rival", "Face it, bro. You're an ectomorph. You were born skinny.")


HUBAL = np.sort(np.clip(np.random.default_rng(5).normal(19, 9.5, 585), -2, 59))


def s14(fr, t, D, sc):
    if t < L(sc, 1):
        c = card(760, 420, (140, 120, 90), (60, 50, 36)).copy()
        c.alpha_composite(text("1940s", 90, "Black", (230, 210, 170)), (40, 40))
        c.alpha_composite(text("A theory linking body type\nand personality", 40, "SemiBold", (230, 210, 170), False), (40, 180))
        show(fr, c, W / 2, 520, t, 0, "mm")
        p = ap(t, 1.2, 0.25)
        if p > 0:
            st = chip("MYTH", CORAL, (10, 12, 16), 90).rotate(-12, expand=True, resample=Image.BICUBIC)
            put(fr, st, W / 2 + 200, 420, p, "mm", scale=1.6 - 0.6 * p)
        return
    title(fr, t, L(sc, 1), "Same 12-week arm workout · 585 people", 58, y=150)
    x0, base, top = 160, 860, 300
    d = ImageDraw.Draw(fr)
    n = len(HUBAL); bw = (W - 320) / n
    p = ap(t, L(sc, 1) + 0.5, 2.0)
    zero = base - (0 + 2) / 61 * (base - top)
    for i in range(int(n * p)):
        v = HUBAL[i]; y = base - (v + 2) / 61 * (base - top)
        col = (80, 88, 100)
        if t >= L(sc, 2) and (i < 12 or i > n - 12):
            col = AMBER
        if t >= L(sc, 3) and 120 < i < 470:
            col = TEAL
        d.rectangle((x0 + i * bw, min(y, zero), x0 + i * bw + max(1, bw - 0.6), max(y, zero)), fill=col + (255,))
    d.line((x0, zero, W - 160, zero), fill=LINE + (255,), width=2)
    if t >= L(sc, 2):
        put(fr, text("−2%", 52, "Black", AMBER), x0, zero + 20, ap(t, L(sc, 2)))
        put(fr, text("+59%", 52, "Black", AMBER), W - 160, top - 70, ap(t, L(sc, 2)), "rt")
    if t >= L(sc, 3):
        put(fr, text("most people grew", 48, "Black", TEAL), W / 2, top + 40, ap(t, L(sc, 3)), "mt")
    put(fr, text("illustrative spread, real range", 24, "SemiBold", DIM, False), x0, base + 70, ap(t, L(sc, 1) + 1))
    sub(fr, t, L(sc, 4), "Train properly · eat enough · give it time", y=930, color=INK, size=44)


def s15(fr, t, D, sc):
    speech(fr, t, "rival", "Easy. Dirty bulk. Eat everything!")


def s16(fr, t, D, sc):
    if t < L(sc, 2):
        title(fr, t, L(sc, 0), "Your body builds muscle at a limited speed", 60, y=200)
        d = ImageDraw.Draw(fr)
        p = ap(t, L(sc, 0) + 1, 1.5)
        d.rounded_rectangle((460, 760 - 260 * p, 760, 760), 14, fill=TEAL + (255,))
        put(fr, text("muscle (capped)", 36, "Bold", TEAL), 610, 790, p, "mt")
        p2 = ap(t, L(sc, 0) + 2.2, 1.5)
        d.rounded_rectangle((1160, 760 - 420 * p2, 1460, 760), 14, fill=AMBER + (255,))
        put(fr, text("the extra → fat", 36, "Bold", AMBER), 1310, 790, p2, "mt")
        sub(fr, t, L(sc, 1), "So: a small extra amount of food, every day.", y=900, color=INK, size=46)
    else:
        stat_ring(fr, t, L(sc, 2), 600, 470, 500, 0.5, "0.25–0.5%", "of your body weight, per week", TEAL, 74)
        if t >= L(sc, 3):
            title(fr, t, L(sc, 3), "60 kg →", 80, x=1060, y=400, anchor="lm", color=MUTED)
            title(fr, t, L(sc, 3) + 0.4, "150–300 g\na week", 110, x=1060, y=580, anchor="lm")
        sub(fr, t, L(sc, 4), "Slow. Boring. Works.", x=1060, y=820, anchor="lt", color=TEAL, size=56)


def s17(fr, t, D, sc):
    show(fr, icon("scale", 260), 330, 330, t, 0, "mm")
    sub(fr, t, L(sc, 1), "Every morning · after the toilet · before breakfast", x=520, y=290, anchor="lt", color=INK, size=40, maxw=1300)
    vals = [60.2, 60.8, 60.1, 60.6, 61.0, 60.3, 60.7]
    x0, x1, y0, y1 = 300, 1620, 520, 860
    d = ImageDraw.Draw(fr)
    if t >= L(sc, 2):
        for i, v in enumerate(vals):
            p = ap(t, L(sc, 2) + i * 0.25, 0.3)
            if p <= 0:
                continue
            x = x0 + i * (x1 - x0) / 6; y = y1 - (v - 59.8) / 1.4 * (y1 - y0)
            d.ellipse((x - 14, y - 14, x + 14, y + 14), fill=INK + (255,))
            put(fr, text(f"{v:.1f}", 30, "Bold", MUTED), x, y - 30, p, "mb")
        p = ap(t, L(sc, 2) + 2.2, 0.8)
        if p > 0:
            ya = y1 - (sum(vals) / 7 - 59.8) / 1.4 * (y1 - y0)
            d.line((x0 - 40, ya, x0 - 40 + (x1 - x0 + 80) * p, ya), fill=TEAL + (255,), width=8)
            put(fr, text("weekly average", 34, "Bold", TEAL), x1 + 60, ya, p, "lm")
    if t >= L(sc, 3):
        show(fr, chip("Flat for 2 weeks? +300 calories a day", CORAL, (10, 12, 16), 38), W / 2, 960, t, L(sc, 3), "mm")
    if t >= L(sc, 4):
        for i, n in enumerate(("glass", "banana")):
            show(fr, icon(n, 170), 1450 + i * 190, 300, t, L(sc, 4) + i * 0.3, "mm")


def s18(fr, t, D, sc):
    show(fr, icon("bricks", 300), 420, 480, t, 0, "mm")
    title(fr, t, L(sc, 0), "PROTEIN = THE BRICKS", 64, x=420, y=720)
    if t >= L(sc, 1):
        stat_ring(fr, t, L(sc, 1), 1250, 430, 500, 0.75, "1.6 g", "of protein per kg of body weight, per day (49 studies)", TEAL, 120)
    if t >= L(sc, 2):
        title(fr, t, L(sc, 2), "60 kg → about 96 g a day", 64, x=1250, y=930, color=TEAL)


FOOD = [("Breakfast", "3 eggs + 2 toast", "egg", 22, 1), ("Lunch", "rice + dal + curd", "bowl", 20, 1),
        ("Dinner", "chicken or paneer + 2 rotis", "roti", 25, 2), ("Snack", "handful of roasted chana", "peanut", 9, 2),
        ("Shake", "milk · banana · peanut butter · oats", "blender", 23, 3)]


def s19(fr, t, D, sc):
    title(fr, t, L(sc, 0), "Sounds like a lot? It's not.", 64, y=150)
    total = 0
    for i, (meal, what, ic, g, li) in enumerate(FOOD):
        t0 = L(sc, li) + (i % 2) * 1.4 if li < 3 else L(sc, 3)
        p = ap(t, t0)
        if p <= 0:
            continue
        total += g * p
        y = 260 + i * 140
        c = card(1100, 120, LINE).copy()
        c.alpha_composite(icon(ic, 96), (16, 12))
        c.alpha_composite(text(meal, 36, "Black", AMBER), (130, 16))
        c.alpha_composite(text(what, 30, "SemiBold", INK, False), (130, 66))
        c.alpha_composite(text(f"{g} g", 44, "Black", TEAL), (960, 34))
        put(fr, c, 200, y + (1 - p) * 20, p)
    stat_ring(fr, t, L(sc, 1), 1600, 560, 400, min(1, total / 96), f"{int(total)} g", "protein (approx.)", TEAL, 90,
              count=lambda p: f"{int(total)} g")


def s20(fr, t, D, sc):
    show(fr, icon("blender", 420), 560, 560, t, 0, "mm")
    sub(fr, t, L(sc, 0), "Get full fast? Drink your calories.", x=W / 2, y=150, color=INK, size=52)
    items = [("glass", "300 ml milk"), ("banana", "1 banana"), ("jar", "2 spoons peanut butter"), ("oats", "40 g oats")]
    for i, (ic, lab) in enumerate(items):
        t0 = L(sc, 1) + i * 0.9
        p = ap(t, t0, 0.5)
        if p > 0:
            y = 300 + i * 170
            put(fr, icon(ic, 130), 1000, y, p, "lm")
            put(fr, text(lab, 38, "Bold", INK), 1150, y, p, "lm")
    if t >= L(sc, 2):
        c = card(820, 200, TEAL).copy()
        c.alpha_composite(text("≈ 640 calories · 23 g protein", 52, "Black", TEAL), (40, 64))
        show(fr, c, 1000, 960, t, L(sc, 2), "lm")
    if t >= L(sc, 3):
        put(fr, chip("CHEAT CODE", AMBER, (10, 12, 16), 40), 560, 870, ap(t, L(sc, 3)), "mm")


def s21(fr, t, D, sc):
    title(fr, t, L(sc, 0), "3 more easy tricks", 72, y=170)
    tiles = [("spoon", "Spoon of oil or ghee", "≈ 120 cal", 1), ("peanut", "Small handful of peanuts", "≈ 170 cal", 2),
             ("sandwich", "One snack, same time daily", "habits > motivation", 3)]
    for i, (ic, lab, val, li) in enumerate(tiles):
        p = ap(t, L(sc, li))
        if p <= 0:
            continue
        c = card(500, 560, AMBER).copy()
        c.alpha_composite(icon(ic, 240), (130, 40))
        c.alpha_composite(text(lab, 36, "Bold", INK, maxw=420, align="center"), (40, 320))
        c.alpha_composite(text(val, 46, "Black", AMBER), (40, 450))
        put(fr, c, 180 + i * 560, 300 + (1 - p) * 30, p)


def s22(fr, t, D, sc):
    title(fr, t, L(sc, 0), "Just 3 rules", 80, y=180)
    rules = [("1", "Make sets hard", "stop with 1–3 reps left"), ("2", "~10 hard sets", "per muscle, per week"),
             ("3", "2–3 times a week", "for each muscle, not once")]
    for i, (n, a, b) in enumerate(rules):
        p = ap(t, L(sc, i + 1))
        if p <= 0:
            continue
        c = card(520, 480, TEAL if i == min(2, max(0, sum(t >= L(sc, k + 1) for k in range(3)) - 1)) else LINE).copy()
        c.alpha_composite(text(n, 140, "Black", TEAL), (40, 30))
        c.alpha_composite(text(a, 50, "Black", INK, maxw=440), (40, 230))
        c.alpha_composite(text(b, 34, "SemiBold", MUTED, False, maxw=440), (40, 360))
        put(fr, c, 150 + i * 570, 330 + (1 - p) * 30, p)


def s23(fr, t, D, sc):
    path = os.path.join(A, "muscle-highlights", "chest-front.png")
    for i, (lab, ic) in enumerate((("YOUR BODY WEIGHT", None), ("DUMBBELLS", "dumbbell"))):
        x = 520 + i * 880
        put(fr, load(path, 2000, 640), x, 520, 1, "mm")
        put(fr, text(lab, 44, "Black", INK), x, 120, 1, "mt")
        if ic:
            put(fr, icon(ic, 160), x + 260, 300, 1, "mm")
    title(fr, t, L(sc, 1), "Both build muscle, if the set is hard", 54, y=980)
    sub(fr, t, L(sc, 2), "Your muscle only feels how hard it's working.", y=880, color=TEAL, size=40)


MOVES = [("PUSH-UP", "chest-front", "Body straight like a plank, elbows a bit in", "hands on a table", "feet on a chair + backpack"),
         ("DOOR ROW", "upper-back-back", "Lean back, pull your chest to the door", "stand more upright", "feet closer to the door"),
         ("SPLIT SQUAT", "quads-front", "Front knee follows your toes, go down slow", "hold a wall", "back foot on a chair"),
         ("PIKE PUSH-UP", "shoulders-front", "Hips high, head between your hands", "hands on a step", "feet on a chair"),
         ("SINGLE-LEG GLUTE BRIDGE", "glutes-back", "Push through your heel, pause at the top", "two legs", "shoulders on the sofa"),
         ("TOWEL CURL / CHIN-UP", "biceps-front", "Elbows stay by your sides", "lighter pull", "slower lowering")]


def s24(fr, t, D, sc):
    idx = sum(t >= L(sc, k) for k in range(1, 7)) - 1
    if t < L(sc, 1) or t >= L(sc, 7):
        title(fr, t, 0 if t < L(sc, 1) else L(sc, 7), "6 moves · whole body · no equipment", 60, y=150)
        for i, (name, img, *_r) in enumerate(MOVES):
            x = 220 + i * 296
            p = ap(t, 0.2 + i * 0.15 if t < L(sc, 1) else L(sc, 7))
            put(fr, load(os.path.join(A, "muscle-highlights", img + ".png"), 2000, 560), x, 540, p, "mm")
            put(fr, text(name, 26, "Black", INK, maxw=270, align="center"), x, 840, p, "mt")
        if t >= L(sc, 7):
            show(fr, chip("Too hard? → easier version", TEAL, (10, 12, 16), 34), 760, 960, t, L(sc, 7), "mm")
            show(fr, chip("Too easy? → harder version", CORAL, (10, 12, 16), 34), 1380, 960, t, L(sc, 7) + 1.2, "mm")
        return
    name, img, cue, easy, hard = MOVES[idx]
    t0 = L(sc, idx + 1)
    path = os.path.join(A, "muscle-highlights", img + ".png")
    put(fr, load(path, 2000, 900), 520, 560, ap(t, t0), "mm")
    put(fr, text(f"{idx + 1} / 6", 34, "Bold", MUTED), 1000, 220, ap(t, t0))
    show(fr, text(name, 84, "Black", INK, maxw=860), 1000, 270, t, t0)
    show(fr, text(cue, 46, "Bold", TEAL, maxw=820), 1000, 470, t, t0 + 0.6)
    show(fr, chip("EASIER: " + easy, LINE, INK, 32), 1000, 700, t, t0 + 1.4)
    show(fr, chip("HARDER: " + hard, CORAL, (10, 12, 16), 32), 1000, 790, t, t0 + 1.8)


def s25(fr, t, D, sc):
    title(fr, t, L(sc, 0), "How do you level up?", 72, y=170)
    lvl2 = t >= L(sc, 3)
    put(fr, chip("LEVEL 2 · feet on a chair" if lvl2 else "LEVEL 1 · push-up", CORAL if lvl2 else TEAL, (10, 12, 16), 40), W / 2, 300, 1, "mm")
    for s in range(3):
        y = 420 + s * 130
        reps = min(15, int(8 + max(0, t - L(sc, 1) - s * 0.6) * 2.2)) if t >= L(sc, 1) else 0
        if lvl2:
            reps = 8
        d = ImageDraw.Draw(fr)
        d.rounded_rectangle((420, y, 1500, y + 70), 35, outline=LINE + (255,), width=3)
        if reps:
            d.rounded_rectangle((420, y, 420 + 1080 * reps / 15, y + 70), 35, fill=(TEAL if reps < 15 else AMBER) + (255,))
        put(fr, text(f"SET {s + 1}", 34, "Bold", MUTED), 400, y + 35, 1, "rm")
        put(fr, text(f"{reps}/15", 40, "Black", INK), 1530, y + 35, 1, "lm")
    if t >= L(sc, 2) and not lvl2:
        put(fr, chip("15 on every set → LEVEL UP", AMBER, (10, 12, 16), 40), W / 2, 880, ap(t, L(sc, 2)), "mm")
    if lvl2:
        sub(fr, t, L(sc, 3), "Harder version, or books in a backpack", y=850, color=INK, size=44)
        sub(fr, t, L(sc, 4), "More reps → harder move. Like levelling up in a game.", y=930, color=TEAL, size=40)


def s26(fr, t, D, sc):
    remain = max(0, 120 - t * 120 / max(D, 1))
    put(fr, ring(int(remain / 120 * 100), 520, TEAL), 560, 560, 1, "mm")
    put(fr, text(f"{int(remain // 60)}:{int(remain % 60):02d}", 120, "Black", INK), 560, 545, 1, "mm")
    put(fr, text("rest", 34, "SemiBold", MUTED, False), 560, 640, 1, "mm")
    title(fr, t, L(sc, 0), "Two small things", 70, x=1040, y=260, anchor="lm")
    show(fr, chip("1 easy warm-up set first", AMBER, (10, 12, 16), 40), 1040, 420, t, L(sc, 1))
    show(fr, chip("Rest 1–3 minutes between sets", TEAL, (10, 12, 16), 40), 1040, 520, t, L(sc, 2))
    sub(fr, t, L(sc, 2) + 2.5, "Rushed rest = weak sets = no message", x=1040, y=640, anchor="lt", color=INK, size=40, maxw=820)


def s27(fr, t, D, sc):
    show(fr, icon("moon", 260), 420, 360, t, 0, "mm")
    sub(fr, t, 0.3, "z z z", x=600, y=240, anchor="lt", color=MUTED, size=60)
    if t >= L(sc, 1):
        stat_ring(fr, t, L(sc, 1), 1250, 420, 460, 0.18, "−18%", "muscle building after ONE night without sleep", CORAL, 120)
    if t >= L(sc, 2):
        ph = icon("phone", 260).copy(); tx = text("3:00", 34, "Black", CORAL); ph.alpha_composite(tx, ((260 - tx.width) // 2, 105))
        show(fr, ph, 420, 760, t, L(sc, 2), "mm")
        title(fr, t, L(sc, 2) + 1.0, "Sleep 7–9 hours", 72, x=1250, y=930, color=TEAL)


def s28(fr, t, D, sc):
    title(fr, t, L(sc, 0), "THE PLAN · screenshot this", 64, y=130)
    days = "MON TUE WED THU FRI SAT SUN".split()
    x0, y0, cw = 330, 230, 200
    for i, dname in enumerate(days):
        put(fr, text(dname, 32, "Black", MUTED), x0 + i * cw + cw / 2, y0, ap(t, L(sc, 0)), "mt")
    rows = [("TRAIN", 1), ("EAT", 3), ("CHECK", 4)]
    train = ["Workout", "Walk", "Workout", "Walk", "Workout", "Rest", "Rest"]
    for r, (lab, li) in enumerate(rows):
        y = y0 + 80 + r * 210
        p = ap(t, L(sc, li))
        if p <= 0:
            continue
        put(fr, text(lab, 38, "Black", TEAL), 290, y + 80, p, "rm")
        if lab == "TRAIN":
            for i, s in enumerate(train):
                col = CORAL if s == "Workout" else (LINE if s == "Rest" else TEAL)
                c = card(cw - 16, 160, col).copy(); c.alpha_composite(text(s, 30, "Bold", INK), (16, 60))
                put(fr, c, x0 + i * cw + 8, y, p)
        else:
            s = "Protein 1.6 g/kg · ~300 extra calories · the shake" if lab == "EAT" else "Weigh every morning · weekly average · flat 2 weeks → eat ~300 more"
            c = card(cw * 7 - 16, 160, AMBER if lab == "EAT" else LINE).copy()
            c.alpha_composite(text(s, 36, "Bold", INK, maxw=cw * 7 - 80), (30, 50))
            put(fr, c, x0 + 8, y, p)
    sub(fr, t, L(sc, 1) + 2, "Workout = 6 moves × 3 hard sets · Sleep 7–9 hours", y=930, color=MUTED, size=34)


def s29(fr, t, D, sc):
    title(fr, t, L(sc, 0), "What to expect", 72, y=150)
    x0, x1, y = 200, 1720, 330
    d = ImageDraw.Draw(fr)
    d.line((x0, y, x1, y), fill=LINE + (255,), width=10)
    split = x0 + (x1 - x0) * 4 / 12
    if t >= L(sc, 1):
        p = ap(t, L(sc, 1), 1.0); d.line((x0, y, x0 + (split - x0) * p, y), fill=TEAL + (255,), width=10)
        put(fr, text("WEEKS 1–4 · STRONGER", 40, "Black", TEAL), x0, y + 30, p)
        put(fr, text("your brain learns the moves", 30, "SemiBold", MUTED, False), x0, y + 84, p)
        cl = CLIPS.get("nerves")
        if cl:
            put(fr, cl.get(int(t * FPS) % 119), 200, 520, p)
    if t >= L(sc, 2):
        p = ap(t, L(sc, 2), 1.5); d.line((split, y, split + (x1 - split) * p, y), fill=CORAL + (255,), width=10)
        put(fr, text("WEEKS 4–12 · BIGGER", 40, "Black", CORAL), split + 20, y + 30, p)
        cl = CLIPS.get("turn")
        if cl:
            put(fr, cl.get(int((t - L(sc, 2)) * 24) % 95), 1020, 520, p)
    if t >= L(sc, 3):
        show(fr, chip("Take a photo on day one", AMBER, (10, 12, 16), 40), W / 2, 1000, t, L(sc, 3), "mm")


def qcard(fr, t, q, t0=0):
    c = card(1100, 130, TEAL).copy()
    c.alpha_composite(text("Q", 70, "Black", TEAL), (30, 20)); c.alpha_composite(text(q, 50, "Black", INK), (120, 34))
    show(fr, c, W / 2, 170, t, t0, "mm")


def s30(fr, t, D, sc):
    if t < L(sc, 1):
        speech(fr, t, "rival", "Won't I just get fat?"); return
    qcard(fr, t, "Won't I just get fat?", L(sc, 1))
    x0, y0, x1, y1 = 300, 860, 1500, 320
    d = ImageDraw.Draw(fr)
    d.line((x0, y0, x1, y0), fill=LINE + (255,), width=3); d.line((x0, y0, x0, y1), fill=LINE + (255,), width=3)
    p = ap(t, L(sc, 1) + 0.3, 2.5)
    d.line((x0, y0, x0 + (x1 - x0) * p, y0 - (y0 - y1) * 0.35 * p), fill=TEAL + (255,), width=10)
    d.line((x0, y0, x0 + (x1 - x0) * 0.55 * p, y0 - (y0 - y1) * 0.95 * p), fill=CORAL + (255,), width=10)
    put(fr, text("slow gain → mostly muscle", 36, "Black", TEAL), x1, y0 - (y0 - y1) * 0.35 - 24, p, "rb")
    put(fr, text("dirty bulk → mostly fat", 36, "Black", CORAL), x0 + (x1 - x0) * 0.55 + 20, y1 + 20, p, "lm")
    sub(fr, t, L(sc, 3), "Belly growing way faster than arms and chest? Eat a little less.", y=950, color=INK, size=40)


def s31(fr, t, D, sc):
    qcard(fr, t, "Do I need supplements?", 0)
    for i in range(5):
        x = 330 + i * 300
        is_c = i == 2
        tub = icon("tub", 220, accent=AMBER)
        put(fr, tub, x, 520, 1 if is_c or t < L(sc, 1) else 0.25, "mm")
        if is_c:
            put(fr, text("CREATINE", 30, "Black", AMBER), x, 650, ap(t, L(sc, 2)), "mt")
        elif t >= L(sc, 1):
            p = ap(t, L(sc, 1) + i * 0.15, 0.25)
            d = ImageDraw.Draw(fr)
            d.line((x - 90, 430, x - 90 + 180 * p, 430 + 180 * p), fill=CORAL + (255,), width=10)
    sub(fr, t, L(sc, 1), "No. Food and training do the real work.", y=760, color=INK, size=46)
    sub(fr, t, L(sc, 2), "Creatine: most researched · helps muscle gain with training · safe for healthy adults", y=840, color=AMBER, size=34)
    sub(fr, t, L(sc, 3), "Protein powder = food in a box. Useful, not required.", y=900, color=MUTED, size=34)
    sub(fr, t, L(sc, 4), "Health condition? Ask a doctor first.", y=960, color=MUTED, size=34)


def s32(fr, t, D, sc):
    qcard(fr, t, "Can I still play football?", 0)
    show(fr, icon("football", 300), 600, 560, t, 0.3, "mm")
    title(fr, t, L(sc, 1), "Yes.", 140, x=1100, y=480, anchor="lm", color=TEAL)
    sub(fr, t, L(sc, 1) + 1.0, "Sports and walking are great for you.", x=1100, y=600, anchor="lt", color=INK, size=42, maxw=760)
    sub(fr, t, L(sc, 2), "On days you play, eat a bit more.", x=1100, y=700, anchor="lt", color=AMBER, size=42, maxw=760)


def s33(fr, t, D, sc):
    if t < L(sc, 1):
        speech(fr, t, "rival", "So... eat a bit more, train hard, sleep. That's it?")
    else:
        speech(fr, t - L(sc, 1), "host", "That's it. For twelve weeks. Don't skip.", side="right")


def s34(fr, t, D, sc):
    character(fr, "host", t, 420, H - 20, 960)
    c = card(1100, 300, TEAL).copy()
    c.alpha_composite(text("COMMENT", 40, "Black", TEAL), (40, 30))
    c.alpha_composite(text("your height · weight · 12-week goal", 50, "Black", INK, maxw=1020), (40, 100))
    show(fr, c, 760, 200, t, 0)
    sub(fr, t, L(sc, 1), "Your questions become the next videos.", x=760, y=540, anchor="lt", color=MUTED, size=38)
    if t >= L(sc, 2):
        put(fr, card(1000, 340, LINE), 760, 640, ap(t, L(sc, 2)))
        put(fr, load(os.path.join(A, "micro", "mito-cutaway.png"), 520, 300), 790, 660, ap(t, L(sc, 2)))
        put(fr, text("NEXT", 34, "Black", MUTED), 1340, 680, ap(t, L(sc, 2)))
        put(fr, text("Why you run out of energy after 10 seconds", 40, "Black", INK, maxw=380), 1340, 730, ap(t, L(sc, 2)))
    put(fr, text("SCIENCE OF FITNESS", 30, "Black", TEAL), W - 60, H - 50, ap(t, 1), "rb")


SCENE_FN = {i: globals()[f"s{i}"] for i in range(1, 35)}
CLIPS = {}


def open_clips(sc):
    CLIPS.clear()
    if sc in (9, 29):
        CLIPS["nerves"] = Clip(os.path.join(A, "anim", "nerve-signals.mp4"), 480, 270)
    if sc == 10:
        CLIPS["zoom"] = Clip(os.path.join(A, "anim", "zoom-to-biceps.mp4"), W, H)
    if sc == 29:
        CLIPS["turn"] = Clip(os.path.join(A, "anim", "muscle-turntable.mp4"), 700, 394)


class LoopClip(Clip):
    """Clip that restarts when it runs out (for looping insets)."""


def frame(sc, t, D):
    fr = Image.new("RGBA", (W, H), STAGE)
    SCENE_FN[sc](fr, t, D, sc)
    chrome(fr, sc, t)
    return fr


def render_scene(sc):
    s = SCENES[sc]
    f0, f1 = round(s["start"] * FPS), round(s["end"] * FPS)
    n = f1 - f0
    out = os.path.join(EP, "video", "_seg", f"seg-{sc:02d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                          out], stdin=subprocess.PIPE)
    loop_clips(sc)
    for i in range(n):
        t = i / FPS
        p.stdin.write(frame(sc, t, n / FPS).convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    return sc, n


def loop_clips(sc):
    open_clips(sc)
    for k, c in list(CLIPS.items()):
        orig = c.get
        def looped(idx, c=c, k=k, sc=sc, orig=orig):
            if idx < c.i:  # reopen to loop
                path = {"nerves": "nerve-signals.mp4", "zoom": "zoom-to-biceps.mp4", "turn": "muscle-turntable.mp4"}[k]
                nc = Clip(os.path.join(A, "anim", path), c.w, c.h)
                c.p, c.i, c.last = nc.p, nc.i, nc.last
            return orig(idx)
        c.get = looped


def stills():
    d = os.path.join(EP, "video", "stills"); os.makedirs(d, exist_ok=True)
    for sc in SCENE_FN:
        loop_clips(sc)
        s = SCENES[sc]; D = s["end"] - s["start"]
        ls = LINES[sc]
        t = (ls[-1] + 1.8) if ls else D / 2
        t = min(t, D - 0.1)
        frame(sc, t, D).convert("RGB").save(os.path.join(d, f"scene-{sc:02d}.jpg"), quality=85)
    print("stills done")


def full():
    seg = os.path.join(EP, "video", "_seg"); os.makedirs(seg, exist_ok=True)
    order = sorted(SCENE_FN, key=lambda k: -(SCENES[k]["end"] - SCENES[k]["start"]))
    with Pool(4) as pool:
        for sc, n in pool.imap_unordered(render_scene, order):
            print(f"scene {sc} rendered ({n} frames)", flush=True)
    lst = os.path.join(seg, "list.txt")
    with open(lst, "w") as f:
        for sc in sorted(SCENE_FN):
            f.write(f"file 'seg-{sc:02d}.mp4'\n")
    out = os.path.join(EP, "video", "ep01-first-cut.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-i", os.path.join(EP, "audio", "vo-full.flac"), "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], check=True)
    shutil.rmtree(seg)
    print("wrote", out, flush=True)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "stills":
        stills()
    else:
        full()
