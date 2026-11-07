"""Look B boards: an original character in a 2D anime-style look.

  python3 anime_board.py            # renders board_b/*
"""
import math
import os
import sys

import skia

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lantern'))
from engine import Scene, Cam, render, P, rect, circle, oval, smooth_poly, capsule, add_sky, font, plain_text, paint, transformed, mixc, rng  # noqa: E402
from anime import bust, head, HERO, NEIGHBOUR, EXPR, flat, stroke, curve, phone_hand, LINE  # noqa: E402
from props import add_jar, falling_marble, star_field, river_of_stars, later_box  # noqa: E402

OUT = os.path.join(HERE, 'board_b')


def flat_scene(T=1.0, top='#0e1638', bot='#2a2350'):
    sc = Scene(T)
    sc.paper = 0.0
    sc.vig = 0.35
    add_sky(sc, 0.95, top, bot)
    sc.items[-1].tex = False
    return sc


def label(c, s, x, y, size, col='#f0e5cf', wght=600, align='center'):
    plain_text(c, s, font('play', size, wght=wght), x, y, col=col, align=align, shadow=0.0)


def sheet_faces():
    sc = flat_scene(1.0, '#1a1f44', '#2e2a58')
    names = ['neutral', 'tired', 'sad', 'wide', 'determined', 'happy', 'laugh', 'asleep']
    for i, nm in enumerate(names):
        cx = 260 + (i % 4) * 466
        cy = 300 + (i // 4) * 470
        bust(sc, 0.3 - i * 0.004, cx, cy, 120, HERO, nm, yaw=0.0, glow=(cx, cy + 260, 330, '#9fc0ff', 0.25))

    def ov(c, W, H, fmt):
        k = W / 1920
        for i, nm in enumerate(names):
            label(c, nm, (260 + (i % 4) * 466) * k, (520 + (i // 4) * 470) * k, 30 * k, col='#ffd79a')
    sc.overlay(ov)
    sc.cam = Cam(0, 0, 1.0, drift=0)
    return sc


def frame_two_lights():
    """His face between two lights: phone blue from below, jar gold from the side."""
    sc = flat_scene(2.0, '#070b20', '#141a3c')
    win = P(); rect(win, 1180, 120, 560, 520, 8)
    flat(sc, 0.8, win, '#0c1430')
    star_field(sc, 0.79, 6, 160, (1190, 130, 1730, 630), seed=3, T=2.0)
    fr = P(); rect(fr, 1170, 110, 580, 540, 10); fr.addRect(skia.Rect.MakeXYWH(1182, 122, 556, 516), skia.PathDirection.kCCW)
    flat(sc, 0.78, fr, '#1a1f3a')
    add_jar(sc, 1480, 900, 0.6, 330, 21236, T=2.0, light_r=1100)
    for it in sc.items:
        it.rim = False; it.band = False; it.tex = False; it.shadow = False
    bust(sc, 0.3, 760, 470, 190, HERO, 'tired', yaw=0.15, glow=(760, 900, 520, '#8fb6ff', 0.55), glow2=(1150, 520, 520, '#ffbf66', 0.45))
    phone_hand(sc, 0.2, 780, 960, 120, ang=-6)
    sc.light(780, 930, 0.2, 700, 1.0, '#7ea6e8', halo=0.5)
    sc.cam = Cam(0, 0, 1.0, drift=0)
    sc.vig = 0.55
    return sc


def frame_eye():
    sc = flat_scene(3.0, '#1a0a14', '#2a0e18')
    sk = P(); rect(sk, -200, -200, 2400, 1500)
    flat(sc, 0.6, sk, HERO['skin'])
    shd = P(); smooth_poly(shd, [(-200, -200), (2200, -200), (2200, 260), (1200, 180), (400, 230), (-200, 300)], 0.4)
    flat(sc, 0.59, shd, HERO['skin_sh'], a=0.85)
    eye = P(); smooth_poly(eye, [(330, 560), (650, 330), (1150, 290), (1600, 470), (1640, 560), (1500, 660), (1000, 760), (600, 720)], 0.45)
    flat(sc, 0.5, eye, '#ffffff')
    ir = P(); circle(ir, 990, 545, 230)
    flat(sc, 0.49, ir, HERO['iris'], shader=lambda m: skia.GradientShader.MakeLinear([skia.Point(990, 315), skia.Point(990, 775)],
                                                                                       [skia.Color4f(0.35, 0.2, 0.06, 1).toColor(), skia.Color4f(0.85, 0.55, 0.2, 1).toColor()], [0.1, 1.0]))
    pu = P(); circle(pu, 990, 545, 70)
    flat(sc, 0.48, pu, '#120a08')
    add_jar(sc, 990, 650, 0.475, 190, 14600, T=3.0, light_r=300, label=False)
    for it in sc.items[-6:]:
        it.rim = False; it.band = False; it.tex = False; it.shadow = False
    hi = P(); circle(hi, 1090, 430, 60); circle(hi, 900, 640, 22)
    flat(sc, 0.46, hi, '#ffffff', a=0.95)
    ln = P()
    ln.addPath(stroke(curve([(300, 570), (640, 300), (1160, 250), (1660, 450)]), 34))
    ln.addPath(stroke(curve([(560, 720), (1000, 790), (1500, 680)]), 10))
    ln.addPath(stroke(curve([(420, 200), (900, 90), (1520, 170)]), 46))
    flat(sc, 0.45, ln, LINE)
    sw = P(); smooth_poly(sw, [(1700, 320), (1740, 420), (1712, 470), (1680, 418)], 0.5)
    flat(sc, 0.44, sw, '#d6ecff', a=0.95)
    sc.cam = Cam(0, 0, 1.0, drift=0)
    sc.vig = 0.7
    return sc


def frame_neighbour():
    sc = flat_scene(4.0, '#0b0820', '#2c1f4a')
    river_of_stars(sc, 0.9, 900, [(-100, 700), (500, 350), (1200, 120), (2000, -60)], 260, seed=7, T=4.0)
    bust(sc, 0.3, 1180, 520, 150, NEIGHBOUR, 'laugh', yaw=-0.1, hat=True, mustache=True, bangs='neat', cowlick=False, scarf=True, hood=False,
         glow=(1180, 300, 600, '#fff1cc', 0.3))
    bust(sc, 0.32, 520, 560, 140, HERO, 'wide', yaw=0.2, glow=(900, 400, 600, '#fff1cc', 0.2))

    def ov(c, W, H, fmt):
        k = W / 1920
        for (x, y, t) in ((1180, 150, '24,880 stars · 3 days left'), (520, 210, '1,204 stars · 18,250 left')):
            f = font('play', 32 * k, wght=700)
            from engine import text_path
            p_, w_ = text_path(t, f, x * k, y * k)
            b = P(); rect(b, x * k - w_ / 2 - 20 * k, y * k - 38 * k, w_ + 40 * k, 52 * k, 10 * k)
            c.drawPath(b, paint('#0d0b12', 0.9))
            c.drawPath(p_, paint('#ffd79a', 1.0))
    sc.overlay(ov)
    sc.cam = Cam(0, 0, 1.0, drift=0)
    sc.vig = 0.5
    return sc


def frame_card():
    sc = flat_scene(5.0, '#0a1030', '#1c2350')
    add_jar(sc, 1500, 880, 0.6, 300, 18250, T=5.0, light_r=900)
    for k_ in range(6):
        later_box(sc, 0.5 - k_ * 0.002, 300 + (k_ % 3) * 230, 900 - (k_ // 3) * 170, 220, 160, tilt=(k_ * 7) % 9 - 4)
    for it in sc.items:
        it.rim = False; it.band = False; it.tex = False; it.shadow = False
    bust(sc, 0.3, 980, 560, 150, HERO, 'sad', yaw=-0.1, glow=(1500, 700, 700, '#ffbf66', 0.35))
    from moodboard import ui_card
    sc.overlay(ui_card('DAYS  LEFT', '18,250'))
    sc.cam = Cam(0, 0, 1.0, drift=0)
    return sc


def save(name, sc, w=1920, h=1080):
    os.makedirs(OUT, exist_ok=True)
    surf = skia.Surface(w, h)
    render(sc, surf.getCanvas(), w, h, 'h')
    path = os.path.join(OUT, f'{name}.png')
    surf.makeImageSnapshot().save(path)
    from PIL import Image
    Image.open(path).convert('RGB').save(os.path.join(OUT, f'{name}.jpg'), quality=88)
    print('->', path)


ALL = {'b_faces': sheet_faces, 'b_two_lights': frame_two_lights, 'b_eye': frame_eye, 'b_neighbour': frame_neighbour, 'b_card': frame_card}

if __name__ == '__main__':
    for nm in (sys.argv[1:] or list(ALL)):
        save(nm, ALL[nm]())
