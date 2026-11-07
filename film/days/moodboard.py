"""30,000 DAYS: style frames and character sheets for the mood board.

  python3 moodboard.py            # renders everything into board/
  python3 moodboard.py lineup     # one sheet
"""
import math
import os
import sys

import skia

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lantern'))
from engine import (Scene, Cam, render, P, rect, circle, oval, poly, smooth_poly, capsule, mixc, clamp, lerp, pose, walk,  # noqa: E402
                    add_sky, hills_path, house_path, tree_path, font, text_path, paint, plain_text, paper_strip_text,
                    transformed, add_lantern, rng)
from chars import man, woman, neighbour, days_left, AGE, SCARF, FACES  # noqa: E402
from props import add_jar, falling_marble, star_field, river_of_stars, later_box, guitar_path, city_of_jars, GOLD  # noqa: E402

OUT = os.path.join(HERE, 'board')
W, H = 1920, 1080


def stand(**kw):
    p = pose(lean=2, head=0, sf=6, ef=12, sb=-6, eb=12, hf=3, kf=5, hb=-3, kb=5)
    p.update(kw)
    return p


def aim(sc, x, y, D=1.0, z=0.3):
    sc.cam = Cam((1 + z) * (x - 960), (1 + z) * (y - 540), D)


def label(c, s, x, y, size=30, col='#2a1a10', wght=600, a=1.0, align='center'):
    plain_text(c, s, font('play', size, wght=wght), x, y, col=col, a=a, align=align, shadow=0.0)


def paper_studio(sc, tone='#d8c3a0', floor_y=900, glow=(960, 420)):
    """A plain lit paper backdrop for model sheets."""
    add_sky(sc, 0.9, mixc(tone, '#ffffff', 0.15), mixc(tone, '#000000', 0.25))
    wall = P(); rect(wall, -1400, -700, 4800, 1600 + floor_y - 900)
    sc.add(0.6, wall, tone, trans=0.5, shadow=False)
    fl = P(); rect(fl, -1400, floor_y, 4800, 900)
    sc.add(0.42, fl, mixc(tone, '#3a2414', 0.45), trans=0.3)
    sc.light(glow[0], glow[1], 0.6, 1500, 0.5, '#fff0d8')
    sc.vig = 0.35


# ------------------------------------------------------------------ character sheets

def sheet_lineup():
    sc = Scene(1.0)
    paper_studio(sc)
    grid = P()
    for k in range(6):
        y = 900 - k * 90
        rect(grid, 80, y - 1, 1760, 2)
    sc.add(0.5, grid, '#b49a74', trans=0.0, shadow=False, rim=False, band=False)
    ages = [7, 16, 26, 41, 63, 82]
    faces = ['happy', 'tired', 'neutral', 'determined', 'happy', 'laugh']
    poses = [
        stand(lean=-2, head=-4, sf=20, ef=30, sb=-14, eb=20),
        stand(lean=-6, head=14, sf=-4, ef=4, sb=-2, eb=8),
        stand(lean=2, head=0),
        stand(lean=0, head=-4, sf=10, ef=60, sb=-8, eb=30),
        stand(lean=7, head=4, sf=4, ef=20, sb=-8, eb=20),
        stand(lean=16, head=10, sf=30, ef=20, sb=-10, eb=24, hf=8, kf=14, hb=-4, kb=12),
    ]
    for i, (a, f, ps) in enumerate(zip(ages, faces, poses)):
        man(sc, 0.25, a, ps, 230 + i * 292, 900, 1, face=f, lit=1.0, T=1.0 + i, wind=0.15)

    def ov(c, w, h, fmt):
        k = w / 1920
        label(c, 'HIM · one life, six ages', 960 * k, 80 * k, 42 * k, wght=700)
        label(c, 'The scarf his mother knits is the one colour he keeps from 7 to 82. The cowlick never lies down.', 960 * k, 124 * k, 22 * k, col='#5a4430', wght=500)
        for i, a in enumerate(ages):
            x = (230 + i * 292) * k
            label(c, f'{a}', x, 975 * k, 40 * k, wght=700)
            label(c, f'{days_left(a):,} days left', x, 1015 * k, 22 * k, col='#6a4a2a', wght=500)
    sc.overlay(ov)
    aim(sc, 960, 560, D=1.0)
    sc.cam.drift = 0
    return sc


def sheet_faces():
    """Busts: each expression in its own lit frame, tiled 4 x 2."""
    names = ['neutral', 'tired', 'sad', 'wide', 'determined', 'happy', 'laugh', 'asleep']
    heads = {'sad': 10, 'tired': 12, 'asleep': 16, 'laugh': -12, 'wide': -4, 'determined': -2}
    tiles = []
    for i, nm in enumerate(names):
        sc = Scene(1.0 + i)
        add_sky(sc, 0.9, '#3a2a3a', '#1c1420')
        wall = P(); rect(wall, -1400, -700, 4800, 2400)
        sc.add(0.6, wall, '#2a1e2c', trans=0.6, shadow=False)
        sc.light(820, 380, 0.6, 1300, 0.9, '#ffb45c')
        man(sc, 0.25, 26, stand(head=heads.get(nm, 0)), 960, 1500, 1, face=nm, lit=1.0, T=i, scale=3.0)
        aim(sc, 1010, 470, D=0.2, z=0.25)
        sc.cam.drift = 0
        sc.vig = 0.5
        tiles.append((nm, sc))
    return tiles


def sheet_poses():
    sc = Scene(2.0)
    paper_studio(sc, tone='#cdb894')
    xs = [180, 450, 760, 1040, 1320, 1620]
    # walk
    man(sc, 0.25, 26, walk(1.2), xs[0], 900, 1, face='neutral', lit=1.0, T=2.0)
    # slumped on a couch with a phone
    cz = P(); rect(cz, xs[1] - 150, 760, 300, 90, 20); rect(cz, xs[1] - 150, 680, 60, 170, 20)
    sc.add(0.3, cz, '#5a4a3a', trans=0.2)
    man(sc, 0.25, 26, pose(lean=-18, head=26, hf=84, kf=74, hb=80, kb=78, tf=(xs[1] + 60, 700), tb=(xs[1] + 50, 708)), xs[1], 900, 1,
        face='tired', lit=0.9, hip=(xs[1] - 20, 770))
    ph = P(); rect(ph, xs[1] + 52, 680, 20, 34, 4)
    sc.add(0.24, ph, '#0b0d18', trans=0.0).emit(ph, '#bcd4ff', a=0.9, bloom=0.8, sigma=16)
    # reaching for the jar
    add_jar(sc, xs[2] + 140, 760, 0.27, 150, 18250, T=2.0, light_r=500)
    stl = P(); rect(stl, xs[2] + 70, 760, 140, 14, 4); capsule(stl, xs[2] + 80, 774, xs[2] + 80, 900, 8); capsule(stl, xs[2] + 200, 774, xs[2] + 200, 900, 8)
    sc.add(0.28, stl, '#4a3424', trans=0.2)
    man(sc, 0.25, 26, stand(lean=10, head=12, tf=(xs[2] + 110, 690), tf_up=False), xs[2], 900, 1, face='wide', lit=1.0)
    # running
    man(sc, 0.25, 26, walk(2.0, stride=1.6, arms=1.5, lean=14), xs[3], 900, 1, face='determined', lit=1.0, wind=1.0, T=2.0)
    # playing guitar
    gp, gh = guitar_path(xs[4] + 30, 700, 0.85, -62)
    man(sc, 0.25, 26, stand(lean=4, head=14, tf=(xs[4] + 40, 690), tb=(xs[4] + 110, 640)), xs[4], 900, 1, face='happy', lit=1.0)
    sc.add(0.245, gp, '#3a2414', trans=0.2)
    # the neighbour dancing
    neighbour(sc, 0.25, stand(lean=-6, head=-12, sf=70, ef=40, sb=160, eb=-20, hf=24, kf=30, hb=-18, kb=12), xs[5], 900, 1, face='laugh')

    def ov(c, w, h, fmt):
        k = w / 1920
        label(c, 'POSES · paper on a stick: joints rotate, nothing bends', 960 * k, 80 * k, 38 * k, wght=700)
        for x, s in zip(xs, ['walk', 'scroll', 'reach for the jar', 'run', 'play', 'the neighbour dances']):
            label(c, s, x * k, 990 * k, 26 * k, col='#4a3424', wght=600)
    sc.overlay(ov)
    aim(sc, 960, 560, D=1.0)
    sc.cam.drift = 0
    return sc


def sheet_cast():
    sc = Scene(3.0)
    paper_studio(sc, tone='#c9b08c')
    jm = woman(sc, 0.25, stand(head=16, tf=(300, 700), tb=(292, 708)), 230, 900, h=400, facing=1, face='happy', hair='bun', shawl=True)
    knit = P(); capsule(knit, 286, 690, 330, 650, 3); capsule(knit, 300, 700, 340, 672, 3)
    sc.add(0.245, knit, '#c9b08c', trans=0.0)
    yarn = P(); smooth_poly(yarn, [(296, 712), (330, 708), (338, 760), (300, 790), (286, 750)], 0.4)
    sc.add(0.244, yarn, '#a8452e', trans=0.3)
    jo = woman(sc, 0.25, stand(lean=12, head=4, tf=(585, 600), tf_up=True), 520, 900, h=380, facing=1, face='sad', hair='bun', shawl=True, kind='old')
    ph = P(); rect(ph, 578, 560, 18, 32, 4)
    sc.add(0.244, ph, '#0b0d18', trans=0.0).emit(ph, '#bcd4ff', a=0.9, bloom=0.6, sigma=12)
    neighbour(sc, 0.25, stand(lean=8, head=-6), 860, 900, 1, face='happy')
    woman(sc, 0.25, stand(lean=6, head=-6, sf=60, ef=30), 1130, 900, h=370, facing=-1, face='laugh', hair='bob', kind='old')
    woman(sc, 0.25, stand(head=-4, sf=30, ef=40, sb=-10, eb=30), 1440, 900, h=230, facing=1, face='happy', hair='pigtails', kind='boy')
    add_jar(sc, 1700, 900, 0.27, 210, 30000, T=3.0, light_r=600)

    def ov(c, w, h, fmt):
        k = w / 1920
        label(c, 'CAST', 960 * k, 80 * k, 42 * k, wght=700)
        rows = [(230, 'Mother', 'knits the scarf'), (520, 'Mother, later', 'a call he keeps postponing'),
                (860, 'The neighbour', '3 marbles left, dancing'), (1130, 'His wife', 'the brightest sky on the street'),
                (1440, 'Granddaughter', 'a new jar of 30,000'), (1700, 'The jar', 'the film’s only clock')]
        for x, a, b in rows:
            label(c, a, x * k, 975 * k, 28 * k, wght=700)
            label(c, b, x * k, 1012 * k, 20 * k, col='#5a4430', wght=500)
    sc.overlay(ov)
    aim(sc, 960, 560, D=1.0)
    sc.cam.drift = 0
    return sc


def sheet_props():
    sc = Scene(4.0)
    paper_studio(sc, tone='#2a2232', glow=(960, 520))
    for i, left in enumerate([30000, 20504, 6989, 3]):
        add_jar(sc, 240 + i * 300, 760, 0.27, 260, left, T=4.0 + i, light_r=500)
    later_box(sc, 0.27, 1430, 760, 230, 170)
    later_box(sc, 0.268, 1440, 590, 190, 140, tilt=-4)
    gp, gh = guitar_path(1720, 640, 1.0, -18)
    sc.add(0.27, gp, '#4a2c18', trans=0.3)
    for k_ in range(3):
        falling_marble(sc, 1210, 360 - k_ * 90, 0.26, 9 - k_ * 2, a=1.0 - k_ * 0.25, trail=40)
    star_field(sc, 0.29, 12, 0, (1140, 120, 1300, 200), seed=4, T=4.0)

    def ov(c, w, h, fmt):
        k = w / 1920
        label(c, 'PROPS · the jar is the light', 960 * k, 70 * k, 40 * k, col='#f3e6cf', wght=700)
        for i, (a, b) in enumerate([('Day 1', 'born'), ('Age 26', 'the turn'), ('Age 63', ''), ('3 left', 'the neighbour')]):
            label(c, a, (240 + i * 300) * k, 840 * k, 28 * k, col='#ffd9a0', wght=700)
            if b:
                label(c, b, (240 + i * 300) * k, 878 * k, 20 * k, col='#c9b8a0', wght=500)
        label(c, 'LATER', 1435 * k, 840 * k, 28 * k, col='#ffd9a0', wght=700)
        label(c, 'where he keeps his life', 1435 * k, 878 * k, 20 * k, col='#c9b8a0', wght=500)
        label(c, 'each night', 1210 * k, 440 * k, 22 * k, col='#ffd9a0', wght=600)
        label(c, 'a marble rises', 1210 * k, 470 * k, 22 * k, col='#ffd9a0', wght=600)
        label(c, 'and becomes a star', 1220 * k, 230 * k, 20 * k, col='#c9b8a0', wght=500)
    sc.overlay(ov)
    aim(sc, 960, 560, D=1.0)
    sc.cam.drift = 0
    sc.vig = 0.5
    return sc


SHEETS = {'lineup': sheet_lineup, 'faces': sheet_faces, 'poses': sheet_poses, 'cast': sheet_cast, 'props': sheet_props}


def save(name, sc, w=W, h=H):
    os.makedirs(OUT, exist_ok=True)
    from PIL import Image, ImageDraw, ImageFont
    path = os.path.join(OUT, f'{name}.png')
    if isinstance(sc, list):
        tw, th = 480, 540
        big = Image.new('RGB', (tw * 4, th * 2), (20, 14, 20))
        fnt = ImageFont.truetype(os.path.join(HERE, '..', 'lantern', 'fonts', 'PlayfairDisplay-wght.ttf'), 34)
        for i, (nm, s_) in enumerate(sc):
            surf = skia.Surface(tw, th)
            render(s_, surf.getCanvas(), tw, th, 'h')
            tmp = path + f'.{i}.png'
            surf.makeImageSnapshot().save(tmp)
            im = Image.open(tmp).convert('RGB')
            big.paste(im, ((i % 4) * tw, (i // 4) * th))
            d = ImageDraw.Draw(big)
            d.text(((i % 4) * tw + 24, (i // 4) * th + th - 60), nm, font=fnt, fill=(255, 217, 160))
            os.remove(tmp)
        big.save(path)
    else:
        surf = skia.Surface(w, h)
        render(sc, surf.getCanvas(), w, h, 'h')
        surf.makeImageSnapshot().save(path)
    Image.open(path).convert('RGB').save(os.path.join(OUT, f'{name}.jpg'), quality=88)
    print('->', path)




# ------------------------------------------------------------------ style frames

import sets as LS  # noqa: E402  (LANTERN's sets: room, flat)


def crib(sc, z, x, base, w=360, h=200, col='#2a1a10'):
    p = P()
    rect(p, x - w / 2, base - h, w, 14, 5)
    rect(p, x - w / 2, base - 70, w, 16, 5)
    rect(p, x - w / 2 - 12, base - h - 40, 18, h + 40, 6)
    rect(p, x + w / 2 - 6, base - h - 40, 18, h + 40, 6)
    for k in range(1, 9):
        rect(p, x - w / 2 + k * w / 9 - 3, base - h + 10, 7, h - 80)
    sc.add(z, p, col, trans=0.15)
    b = P()
    smooth_poly(b, [(x - 100, base - 76), (x - 60, base - 120), (x + 40, base - 118), (x + 110, base - 84), (x + 100, base - 72)], 0.5)
    circle(b, x - 108, base - 100, 30)
    sc.add(z + 0.005, b, '#3a2618', trans=0.3)


def rooftop(sc, z, x0, x1, top, col='#0a0e1c'):
    p = P()
    rect(p, x0, top, x1 - x0, 1600)
    for k in range(int((x1 - x0) // 120)):
        rect(p, x0 + k * 120, top - 22, 70, 24, 2)
    sc.add(z, p, col, trans=0.1)


def frame_day1():
    sc = Scene(1.0)
    LS.room(sc, w=0.85, T=1.0, count=0, bed=None, stool=False, clock=None, hook=False,
            pal=dict(wall=('#1c2648', '#5a3a26'), floor=('#0e1430', '#2a170c'), furn=('#0f1630', '#3b200f'), trim=('#141d38', '#4a2a16'), door=('#1a2547', '#5a3519')))
    shelf = P(); rect(shelf, 1080, 640, 300, 18, 4); capsule(shelf, 1100, 658, 1110, 700, 7)
    sc.add(0.4, shelf, '#3a2414', trans=0.2)
    add_jar(sc, 1230, 640, 0.39, 230, 30000, T=1.0, light_r=900)
    crib(sc, 0.33, 720, 860)
    woman(sc, 0.25, stand(lean=26, head=30, tf=(700, 700), tb=(690, 712)), 860, 860, h=420, facing=-1, face='happy', hair='bun', shawl=True, lit=0.95)
    LS.front_band(sc, w=0.85)
    aim(sc, 930, 600, D=0.72)
    sc.cam.drift = 0

    def ov(c, w, h, fmt):
        k = w / 1920
        label(c, 'Day 1', 120 * k, 120 * k, 44 * k, col='#ffd9a0', wght=600, align='left')
    sc.overlay(ov)
    return sc


def frame_city():
    sc = Scene(2.0)
    add_sky(sc, 0.95, '#050a1e', '#1a2a55')
    star_field(sc, 0.94, 70, 380, (-900, -300, 2900, 560), seed=11, T=2.0)
    m = P(); circle(m, 1500, 170, 46)
    sc.add(0.93, m, '#cfd9f2', trans=0.0, shadow=False, rim=False, band=False).emit(m, '#eef2ff', a=0.9, bloom=0.8, sigma=30)
    city_of_jars(sc, 0.75, -900, 2900, 980, seed=3, T=2.0, wide=0.8)
    city_of_jars(sc, 0.55, -900, 2900, 1080, seed=8, T=2.0, wide=1.1)
    rooftop(sc, 0.3, -600, 2600, 860)
    add_jar(sc, 1180, 860, 0.29, 150, 20504, T=2.0, light_r=700)
    man(sc, 0.25, 26, stand(head=-10, lean=-2), 1060, 860, 1, face='neutral', lit=0.8, wind=0.4, T=2.0)
    aim(sc, 960, 520, D=1.0)
    sc.cam.drift = 0
    return sc


def frame_later():
    sc = Scene(3.0)
    LS.flat(sc, 3.0, morning=0.0)
    for (bx, by, bw, bh, tl) in [(640, 846, 260, 190, 0), (900, 846, 240, 200, 2), (1160, 846, 250, 180, -1), (1360, 846, 200, 170, 0),
                                 (700, 656, 220, 170, -3), (960, 646, 250, 180, 4), (1220, 666, 220, 160, -2), (820, 476, 230, 160, 2),
                                 (1080, 466, 240, 170, -4), (1300, 496, 200, 150, 3), (950, 306, 220, 150, -2), (700, 316, 200, 140, 5)]:
        later_box(sc, 0.5, bx, by, bw, bh, tilt=tl)
    gp, gh = guitar_path(1300, 330, 0.9, 12)
    sc.add(0.505, gp, '#3a2414', trans=0.2)
    cz = P(); rect(cz, 200, 700, 520, 110, 26); rect(cz, 200, 610, 80, 230, 26); capsule(cz, 230, 846, 230, 800, 12); capsule(cz, 690, 846, 690, 800, 12)
    sc.add(0.36, cz, '#141c36', trans=0.15)
    man(sc, 0.3, 26, pose(lean=-18, head=26, hf=84, kf=74, hb=80, kb=78, tf=(540, 650), tb=(530, 660)), 440, 846, 1, face='tired', lit=0.75, hip=(420, 710))
    ph = P(); rect(ph, 528, 622, 24, 40, 5)
    sc.add(0.29, ph, '#05060c', trans=0.0).emit(ph, '#c6dbff', a=1.0, bloom=1.0, sigma=22)
    sc.light(540, 640, 0.29, 460, 1.0, '#7ea6e8', halo=0.35)
    dk = P(); rect(dk, 1500, 700, 300, 22, 5); capsule(dk, 1520, 846, 1520, 722, 9); capsule(dk, 1780, 846, 1780, 722, 9)
    sc.add(0.34, dk, '#1c140e', trans=0.15)
    add_jar(sc, 1640, 700, 0.33, 150, 19012, T=3.0, light_r=520, glow=0.8)
    LS.front_band(sc, w=0.0)
    aim(sc, 960, 560, D=0.92)
    sc.cam.drift = 0
    return sc


def frame_neighbour():
    sc = Scene(4.0)
    add_sky(sc, 0.95, '#0b0820', '#2c1f4a')
    star_field(sc, 0.94, 10, 260, (-900, -300, 700, 560), seed=5, T=4.0, dim_a=0.6)
    river_of_stars(sc, 0.93, 900, [(700, 700), (1000, 300), (1400, 80), (2100, -100)], 260, seed=7, T=4.0)
    city_of_jars(sc, 0.7, -900, 2900, 1000, seed=9, T=4.0, lit=0.7)
    rooftop(sc, 0.3, -600, 2600, 860, col='#0b0a18')
    dr = P(); rect(dr, 120, 540, 200, 320, 6)
    dr.addRect(__import__('skia').Rect.MakeXYWH(150, 580, 140, 280), __import__('skia').PathDirection.kCCW)
    sc.add(0.31, dr, '#0e0c1a', trans=0.1)
    inside = P(); rect(inside, 150, 580, 140, 280)
    sc.add(0.32, inside, '#000000', trans=0.0, shadow=False).emit(inside, '#ffb256', a=0.55, bloom=0.5, sigma=20)
    man(sc, 0.305, 26, stand(head=-18, lean=-4), 220, 860, 1, face='wide', lit=0.7, T=4.0)
    neighbour(sc, 0.25, stand(lean=-4, head=-10, tf=(1180, 600), tb=(1150, 560), hf=20, kf=26, hb=-14, kb=10), 1110, 860, 1, face='laugh', lit=0.9)
    woman(sc, 0.25, stand(lean=-2, head=-8, tf=(1190, 610), tb=(1235, 560), hf=-10, kf=14, hb=18, kb=20), 1290, 860, h=370, facing=-1, face='laugh', hair='bob', kind='old', lit=0.9)
    add_jar(sc, 1560, 840, 0.29, 120, 3, T=4.0, light_r=420)
    aim(sc, 860, 500, D=1.0)
    sc.cam.drift = 0
    return sc


def frame_spend():
    sc = Scene(5.0)
    add_sky(sc, 0.95, '#3a2a5c', '#f2a46a')
    sun = P(); circle(sun, 1520, 690, 90)
    sc.add(0.9, sun, '#ffcf8a', trans=0.0, shadow=False, rim=False, band=False).emit(sun, '#ffe2a8', a=1.0, bloom=1.6, sigma=60)
    sc.light(1520, 690, 0.9, 1600, 0.9, '#ffb070', halo=0.5)
    star_field(sc, 0.94, 60, 30, (-900, -300, 2900, 260), seed=13, T=5.0, bright_a=0.7, dim_a=0.3)
    sc.add(0.8, hills_path(-1400, 3400, 760, [(200, 300, 150), (900, 260, 110), (1700, 320, 170)]), '#8a5a6a', trans=0.7)
    sc.add(0.62, hills_path(-1400, 3400, 840, [(-100, 360, 80), (800, 400, 70), (1800, 420, 90)]), '#5a3a4a', trans=0.45)
    gr = P(); smooth_poly(gr, [(-1400, 880), (300, 860), (900, 875), (1600, 855), (3400, 880), (3400, 2200), (-1400, 2200)], 0.4)
    sc.add(0.35, gr, '#2a1a22', trans=0.3)
    add_jar(sc, 560, 875, 0.33, 140, 17208, T=5.0, light_r=500)
    for k_, (mx, my) in enumerate([(560, 640), (600, 470), (650, 300), (720, 160)]):
        falling_marble(sc, mx, my, 0.32, 8 - k_, a=1.0 - k_ * 0.15, trail=30)
    gp, gh = guitar_path(860, 660, 0.85, -62)
    man(sc, 0.3, 26, stand(lean=4, head=-16, tf=(872, 660), tb=(940, 600), hf=10, kf=8), 840, 875, 1, face='laugh', lit=0.9, wind=0.8, T=5.0)
    sc.add(0.295, gp, '#3a2414', trans=0.2)
    aim(sc, 900, 560, D=0.95)
    sc.cam.drift = 0
    return sc


def frame_sky():
    sc = Scene(6.0)
    LS.room(sc, w=0.6, T=6.0, count=0, bed=None, stool=False, clock=None, hook=False, window_sky=('#03061a', '#0e1838'), moon=False,
            pal=dict(wall=('#121a38', '#4a3020'), floor=('#0a1028', '#24140a'), furn=('#0f1630', '#3b200f'), trim=('#0e1530', '#3a2212'), door=('#141d3a', '#4a2c16')))
    river_of_stars(sc, 0.79, 260, [(600, 420), (700, 300), (860, 240)], 50, seed=3, T=6.0)
    crib(sc, 0.36, 330, 860)
    add_jar(sc, 470, 860, 0.35, 180, 30000, T=6.0, light_r=700)
    man(sc, 0.25, 82, stand(lean=10, head=-24, tf=(770, 470), tb=(790, 500), tf_up=True, tb_up=True), 930, 860, -1, face='happy', lit=0.85, T=6.0, cane=False)
    bb = P(); smooth_poly(bb, [(700, 480), (725, 440), (790, 438), (812, 470), (770, 500)], 0.5); circle(bb, 708, 455, 22)
    sc.add(0.245, bb, '#3a2618', trans=0.3)
    add_jar(sc, 1180, 860, 0.3, 90, 50, T=6.0, light_r=300, glow=0.7)
    LS.front_band(sc, w=0.4)
    aim(sc, 760, 560, D=0.85)
    sc.cam.drift = 0

    def ov(c, w, h, fmt):
        k = w / 1920
        plain_text(c, 'You get about 30,000 days.', font('play', 46 * k, wght=500), 1500 * k, 250 * k, col='#f3e6cf')
        plain_text(c, 'Today is one of them.', font('play', 52 * k, wght=700), 1500 * k, 320 * k, col='#ffbf66')
    sc.overlay(ov)
    return sc


def frame_thumb():
    sc = Scene(7.0)
    LS.flat(sc, 7.0, morning=0.0)
    dk = P(); rect(dk, 700, 760, 700, 24, 6)
    sc.add(0.34, dk, '#1c140e', trans=0.15)
    add_jar(sc, 1090, 760, 0.33, 300, 20504, T=7.0, light_r=1000)
    man(sc, 0.3, 26, stand(lean=12, head=4, tf=(1010, 740)), 880, 1080, 1, face='wide', lit=1.0, scale=1.25)
    aim(sc, 990, 560, D=0.6)
    sc.cam.drift = 0
    sc.vig = 0.7

    def ov(c, w, h, fmt):
        k = w / 1920
        from engine import text_path as tp_, paint as pt_
        f = font('display', 132 * k, wght=900, wdth=78)
        for s_, y_, col_ in (('HOW MANY', 170, '#fff3dc'), ('DAYS LEFT?', 310, '#ffcf7a')):
            p_, _ = tp_(s_, f, 70 * k, y_ * k, 'left')
            c.drawPath(p_, pt_('#120a04', 1.0, stroke=12 * k))
            c.drawPath(p_, pt_(col_, 1.0))
    sc.overlay(ov)
    return sc


FRAMES = {'f1_day1': frame_day1, 'f2_city': frame_city, 'f3_later': frame_later, 'f4_neighbour': frame_neighbour,
          'f5_spend': frame_spend, 'f6_sky': frame_sky, 'f7_thumb': frame_thumb}


if __name__ == '__main__':
    allk = list(SHEETS) + list(globals().get('FRAMES', {}))
    for nm in (sys.argv[1:] or allk):
        fn = SHEETS.get(nm) or globals().get('FRAMES', {}).get(nm)
        save(nm, fn())
