"""Three thumbnails for YouTube Test & Compare (1280x720).

Built for click-through at feed size (about 168x94 px on a phone): one warm light
in a dark frame, one human figure, at most three words of very large type.
"""
import os
import sys

import skia

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import engine  # noqa: E402
from engine import Scene, Cam, render, add_puppet, add_lantern, add_match, pose, font, text_path, paint, P, rect, circle  # noqa: E402
from sets import room, front_band, WALL_REGION  # noqa: E402
from shots import aim, stand, lantern_hand, FOOT  # noqa: E402

W, H = 1280, 720
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'thumbs')


def big_text(c, s, x, y, size, col='#fff3dc', align='left', stroke='#120a04', wdth=78):
    f = font('display', size, wght=900, wdth=wdth)
    tp, w = text_path(s, f, x, y, align)
    c.save(); c.translate(0, size * 0.05); c.drawPath(tp, paint('#000000', 0.6, blur=size * 0.08)); c.restore()
    st = paint(stroke, 1.0, stroke=size * 0.09)
    c.drawPath(tp, st)
    c.drawPath(tp, paint(col, 1.0))
    return w


def thumb_wall():
    sc = Scene(3.1)
    x = 760
    ps = stand(head=-6, lean=8)
    ps['tf'] = (x - 60, FOOT - 0.62 * 430)
    room(sc, w=0.6, T=3.1, count=7300, light=(x - 70, FOOT - 0.55 * 430, 950), bed=None, stool=False, clock=None, height_marks=18, hook=False)
    j = add_puppet(sc, 0.22, 'old', ps, x, FOOT, 430, -1, extras=('cap', 'mustache'), eye='open', eye_a=1.0)
    add_lantern(sc, j['hand_f'][0], j['hand_f'][1], 0.205, s=1.35, T=3.1, light_r=900, inten=1.25, halo=0.7)
    aim(sc, 690, 600, D=0.46)
    sc.cam.drift = 0

    def ov(c, w_, h_, fmt):
        big_text(c, '7,300', 46, 232, 220, col='#ffe7b8')
        big_text(c, 'MORNINGS', 52, 330, 88, col='#fff3dc', wdth=90)
    sc.overlay(ov)
    sc.vig = 0.7
    return sc


def thumb_lights():
    sc = Scene(2.0)
    engine_flat = __import__('sets').flat
    engine_flat(sc, 2.0, morning=0.0, w=0.3)
    x = 960
    ps = stand(head=4, lean=2)
    ps['tf'] = (x + 95, FOOT - 0.58 * 430)
    ps['tb'] = (x - 95, FOOT - 0.5 * 430)
    j = add_puppet(sc, 0.22, 'son', ps, x, FOOT, 430, 1, extras=('hair',), eye='open', eye_a=1.0)
    body = P(); rect(body, -22, -40, 44, 80, 8)
    m = skia.Matrix.Translate(j['hand_f'][0] + 10, j['hand_f'][1] - 30)
    m.preRotate(-12)
    ph = sc.add(0.21, engine.transformed(body, m), '#05060c', trans=0.0)
    scr = P(); rect(scr, -18, -35, 36, 70, 6)
    ph.emit(engine.transformed(scr, m), '#cfe0ff', a=1.0, bloom=1.4, sigma=30)
    sc.light(j['hand_f'][0] + 10, j['hand_f'][1] - 30, 0.21, 700, 1.3, '#6f9cf0', halo=0.8)
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.3, T=2.0, light_r=800, inten=1.2, halo=0.7)
    aim(sc, 960, 560, D=0.42, z=0.22)
    sc.cam.drift = 0

    def ov(c, w_, h_, fmt):
        big_text(c, 'HIS TURN.', w_ / 2, 140, 136, align='center')
    sc.overlay(ov)
    sc.vig = 0.75
    return sc


def thumb_clock():
    sc = Scene(0.05)
    ps = stand(head=10, lean=6)
    ps['tb'] = (905, 602)
    ps['tf'] = (950, 612)
    room(sc, w=0.35, T=0.05, count=0, light=(900, 650, 500), bed='small', clock=(4, 30))
    j = add_puppet(sc, 0.22, 'father', ps, 1000, FOOT, 430, -1, extras=('cap', 'mustache'), eye='open', eye_a=1.0)
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.3, T=0.05, lit=0.0)
    add_match(sc, j['hand_f'][0], j['hand_f'][1], 0.205, 1.4, 0.05, 0.0, ang=-28)
    aim(sc, 840, 690, D=0.3, z=0.3)
    sc.cam.drift = 0

    def ov(c, w_, h_, fmt):
        big_text(c, '4:30', 50, 200, 190, col='#ffcf7a')
        big_text(c, 'EVERY DAY.', 56, 300, 92)
    sc.overlay(ov)
    sc.vig = 0.65
    return sc


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in (('A_wall_7300', thumb_wall), ('B_two_lights', thumb_lights), ('C_every_day', thumb_clock)):
        surf = skia.Surface(W, H)
        render(fn(), surf.getCanvas(), W, H, 'h')
        img = surf.makeImageSnapshot()
        png = os.path.join(OUT, f'{name}.png')
        img.save(png)
        from PIL import Image
        Image.open(png).convert('RGB').save(os.path.join(OUT, f'{name}.jpg'), quality=92)
        small = Image.open(png).convert('RGB').resize((168, 94), Image.LANCZOS)
        small.save(os.path.join(OUT, f'{name}_feed_preview.png'))
        print(name)
