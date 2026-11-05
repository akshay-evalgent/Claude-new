"""LANTERN: the 21 shots. Every time is in shot-local seconds; the beat is 0.75 s (80 BPM).

Each shot is fn(sc, t). It fills the Scene with sheets, lights and overlays,
sets the camera and the vertical focus. EVENTS lists the sound hits each shot
makes at local times; score.py reads them, so picture and sound share one clock.
"""
import math

import skia

from engine import (Scene, Cam, P, rect, circle, oval, poly, smooth_poly, capsule, mixc, scalec, argb, clamp, lerp,
                    ramp, smooth, ease_out, ease_in, pose, mixpose, walk, add_puppet, add_lantern, add_match,
                    add_tally_wall, tally_point, add_sky, hills_path, rain, fog_sheet, flicker, font, text_path,
                    paper_strip_text, plain_text, paint, rng, transformed, flame_path)
from sets import (room, front_band, father, WALL_REGION, DOOR, road, puddle_glow, exterior, school, school_fence,
                  flat, bed_with_sleeper, phone_paths)

H_AD = 430.0   # adult height in the room
FOOT = 860.0


# ------------------------------------------------------------------ helpers

def kf(t, keys):
    if t <= keys[0][0]:
        return keys[0][1]
    for (t0, v0), (t1, v1) in zip(keys, keys[1:]):
        if t <= t1:
            u = smooth((t - t0) / (t1 - t0)) if t1 > t0 else 1.0
            if isinstance(v0, tuple):
                return tuple(a + (b - a) * u for a, b in zip(v0, v1))
            return v0 + (v1 - v0) * u
    return keys[-1][1]


def aim(sc, x, y, D=1.0, z=0.3):
    sc.cam = Cam((1 + z) * (x - 960), (1 + z) * (y - 540), D)


def stand(**kw):
    p = pose(lean=2, head=0, sf=6, ef=12, sb=-6, eb=12, hf=3, kf=5, hb=-3, kb=5)
    p.update(kw)
    return p


def walker(x, H, moving, **kw):
    if moving:
        p = walk(x / (0.52 * H) * math.pi, stride=1.0, arms=0.8)
    else:
        p = stand()
    p.update(kw)
    return p


def lantern_hand(x, ground, H, f):
    """Where a hanging lantern is carried at the side."""
    return (x + f * 0.07 * H, ground - 0.43 * H)


def gait_swing(x, H):
    return 7.0 * math.sin(x / (0.52 * H) * math.pi)


def counter_overlay(value, a, y_h=0.15, y_v=0.2):
    def fn(c, W, H, fmt):
        k = W / (1920.0 if fmt == 'h' else 1080.0)
        f = font('play', (84 if fmt == 'h' else 110) * k, wght=600)
        y = H * (y_h if fmt == 'h' else y_v)
        paper_strip_text(c, f"{int(value):,}", f, W / 2, y, reveal=1.0, a=a, tracking=4 * k, col='#ffd79a', glow=0.9, pad=(44 * k, 24 * k))
    return fn


SHOTS = {}
EVENTS = {}


def shot(name, dur, events=()):
    def deco(fn):
        SHOTS[name] = (dur, fn)
        EVENTS[name] = list(events)
        return fn
    return deco


# ------------------------------------------------------------------ cold open

@shot('S01', 3.75, events=[(0.0, 'match'), (1.0, 'lantern_on'), (1.9, 'match_out'), (0.0, 'tick_bed')])
def s01(sc, t):
    T = sc.T
    lit = ramp(t, 1.0, 1.45)
    w = 0.12 + 0.88 * ramp(t, 1.0, 2.0)
    hb = kf(t, [(0, (905, 602)), (2.3, (905, 602)), (3.4, (918, 548))])
    globe = (hb[0], hb[1] + 41 * 1.3)
    tf = kf(t, [(0, (985, 640)), (0.15, (950, 612)), (0.5, (945, 620)), (0.95, (hb[0] + 22, globe[1] - 6)), (1.4, (hb[0] + 24, globe[1] - 4)), (1.9, (975, 640)), (3.75, (978, 650))])
    room(sc, w=w, T=T, count=0, light=(globe[0], globe[1], 520), bed='small', clock=(4, 30))
    j = father(sc, 0.22, 1000, FOOT, H_AD, stand(head=kf(t, [(0, 12), (2.4, 12), (3.4, 2)]), lean=6, tf=tf, tb=hb), facing=-1, eye='open',
               eye_a=0.35 + 0.6 * max(lit, math.exp(-t * 3)))
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.3, T=T, lit=lit, light_r=560, seed=1.0)
    if t < 1.9:
        add_match(sc, j['hand_f'][0], j['hand_f'][1], 0.205, 1.25, t, 0.0, ang=-28)
    front_band(sc, w=w)
    aim(sc, 930, 600, D=0.56, z=0.22)
    sc.vfocus, sc.vfocus_y, sc.vzoom = 920, 620, 0.62


@shot('S02', 3.75, events=[(1.6, 'scratch'), (2.65, 'door_open'), (3.45, 'door_close')])
def s02(sc, t):
    T = sc.T
    if t < 2.0:
        x = kf(t, [(0, 990), (1.1, 1215)])
        f = 1
    elif t < 2.5:
        x, f = 1215, -1
    else:
        x, f = kf(t, [(2.5, 1215), (3.3, 1495)]), 1
    moving = (t < 1.1) or (2.5 <= t < 3.3)
    mark = tally_point(0, WALL_REGION)
    reach = ramp(t, 1.05, 1.4) * (1 - ramp(t, 1.9, 2.2))
    scr = 6 * math.sin(t * 40) * (1 if 1.4 < t < 1.9 else 0)
    ps = walker(x, H_AD, moving, head=-10 if f < 0 else 0)
    if reach > 0.01:
        rest = (x + f * 30, FOOT - 0.38 * H_AD)
        ps['tf'] = (lerp(rest[0], mark[0], reach), lerp(rest[1], mark[1] + scr, reach))
        ps['tf_up'] = True
    ps['tb'] = lantern_hand(x, FOOT, H_AD, -f * 0.2)
    gone = ramp(t, 3.25, 3.55)
    w = 1.0 - 0.85 * gone
    count = 1 if t >= 1.62 else 0
    lx, ly = ps['tb'][0], ps['tb'][1] + 50
    room(sc, w=w, T=T, count=count, light=(lx, ly, 520), bed='small', clock=(4, 30),
         door_open=ramp(t, 2.6, 3.0) * (1 - ramp(t, 3.4, 3.75)))
    if 1.62 <= t < 2.1:
        fl = P(); circle(fl, mark[0], mark[1], 18)
        sc.items[-1].emit(fl, '#fff0c8', a=1 - ramp(t, 1.62, 2.1), bloom=1.2, sigma=18)
    j = father(sc, 0.22, x, FOOT, H_AD, ps, facing=f, eye='open', eye_a=0.8 * (1 - gone))
    j['item'].alpha = 1 - gone
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.25, T=T, lit=1 - gone, light_r=560,
                swing=gait_swing(x, H_AD) if moving else 0, seed=1.0)
    sc.items[-1].alpha = 1 - gone
    sc.items[-2].alpha = 1 - gone
    front_band(sc, w=w)
    aim(sc, 1150, 570, D=0.82)
    sc.vfocus = x if t < 3.3 else 1450


# ------------------------------------------------------------------ act one

@shot('S03', 6.75, events=[('steps', 0.0, 6.75, 150.0, 400.0), (0.0, 'rain_bed', 6.75, 0.45)])
def s03(sc, t):
    T = sc.T
    x = -200 + 150 * t
    H = 400.0
    g = 872.0
    road(sc, T, camx=x, w=1.0)
    ps = walker(x, H, True, lean=5)
    ps['tb'] = lantern_hand(x, g, H, 1)
    j = add_puppet(sc, 0.2, 'father', ps, x, g, H, 1, extras=('cap', 'mustache'))
    lt, fp = add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.195, s=1.15, T=T, swing=gait_swing(x, H), light_r=640, seed=2.0)
    puddle_glow(sc, fp.x() + 10, 905, 90, 1.0)
    rain(sc, 0.16, T, (x - 1400, -300, x + 1400, 1150), density=0.55, angle=10, col='#bcd0f2', a=0.5, seed=3)
    aim(sc, x + 80, 600, D=0.95)
    sc.vfocus = x + 20


@shot('S04', 6.0, events=[(0.3, 'sack'), (1.7, 'sack_drop'), (2.0, 'bike_bed', 2.0), ('steps', 4.0, 6.0, 110.0, 400.0), (4.0, 'dusk_bed', 2.0)])
def s04(sc, t):
    T = sc.T
    if t < 2.0:
        # the warehouse: a single hanging bulb, sacks, the next sack on his shoulder
        add_sky(sc, 0.9, '#0a0807', '#120d0a')
        wall = P(); rect(wall, -1400, -700, 4800, 1560)
        wall.addRect(skia.Rect.MakeXYWH(1380, 380, 260, 470), skia.PathDirection.kCCW)
        outside = P(); rect(outside, 1380, 380, 260, 470)
        o = sc.add(0.62, outside, '#0b1328', trans=0.0, shadow=False, rim=False)
        sc.add(0.6, wall, '#3a2617', trans=0.6, shadow=False)
        for k in range(14):
            rib = P(); rect(rib, -600 + k * 190, -400, 22, 1260)
            sc.add(0.59, rib, '#2a1a0f', trans=0.3, shadow=True)
        fl = P(); rect(fl, -1400, 846, 4800, 900)
        sc.add(0.42, fl, '#20140b', trans=0.3)
        sk = P()
        for row in range(4):
            for k in range(6 - row):
                rect(sk, 120 + k * 120 + row * 60, 770 - row * 78, 118, 82, 34)
        sc.add(0.36, sk, '#1a1009', trans=0.25)
        cord = P(); rect(cord, 957, -300, 5, 560)
        bulb = P(); oval(bulb, 960, 282, 22, 28)
        sc.add(0.5, cord, '#0b0705', trans=0.0)
        b = sc.add(0.5, bulb, '#2a1a0f', trans=0.0, shadow=False)
        b.emit(bulb, '#ffe6b0', a=1.0, bloom=1.4, sigma=30)
        sc.light(960, 282, 0.5, 1100, 1.0, '#ffb45c', halo=0.5)
        x = kf(t, [(0, 520), (1.6, 820)])
        H = 430.0
        ps = walker(x, H, t < 1.6, lean=12, head=6)
        shp = (x + 0.06 * H, FOOT - 0.79 * H)
        ps['tf'] = (shp[0] - 10, shp[1] - 30)
        ps['tf_up'] = True
        j = add_puppet(sc, 0.22, 'father', ps, x, FOOT, H, 1, extras=('cap', 'mustache'))
        sack = P(); oval(sack, j['sh'][0] - 34, j['sh'][1] - 18, 70, 40)
        sc.add(0.215, sack, '#120a05', trans=0.1)
        aim(sc, 760, 560, D=0.85)
        sc.vfocus = x
    elif t < 4.0:
        u = t - 2.0
        camx = 3000 + u * 650
        road(sc, T, camx=camx, w=1.0, seed=4)
        x = camx
        H = 400.0
        g = 872.0
        ph = u * 7.0
        bike = P()
        wl, wr = (x - 115, g - 55), (x + 125, g - 55)
        for (cx, cy) in (wl, wr):
            rim_ = P(); circle(rim_, cx, cy, 58)
            rim_.addCircle(cx, cy, 50, skia.PathDirection.kCCW)
            bike.addPath(rim_)
            for k in range(8):
                a = ph * 1.6 + k * math.pi / 4
                capsule(bike, cx, cy, cx + math.cos(a) * 50, cy + math.sin(a) * 50, 2.2)
            circle(bike, cx, cy, 7)
        crank = (x + 5, g - 60)
        capsule(bike, wl[0], wl[1], crank[0], crank[1], 7)
        capsule(bike, crank[0], crank[1], x + 95, g - 170, 7)
        capsule(bike, wl[0], wl[1], x - 30, g - 160, 7)
        capsule(bike, x - 30, g - 160, x + 95, g - 170, 7)
        capsule(bike, x + 95, g - 170, wr[0], wr[1], 7)
        capsule(bike, x - 30, g - 160, x - 40, g - 178, 6)
        rect(bike, x - 66, g - 186, 56, 12, 6)
        capsule(bike, x + 95, g - 170, x + 100, g - 205, 6)
        capsule(bike, x + 82, g - 205, x + 122, g - 210, 6)
        sc.add(0.2, bike, '#06050a', trans=0.05)
        pa = ph
        lf = (crank[0] + math.cos(pa) * 26, crank[1] + math.sin(pa) * 26)
        lb = (crank[0] + math.cos(pa + math.pi) * 26, crank[1] + math.sin(pa + math.pi) * 26)
        ps = pose(lean=24, head=-14, lf=lf, lb=lb, tf=(x + 108, g - 210), tb=(x + 100, g - 206))
        j = add_puppet(sc, 0.198, 'father', ps, x, g, H, 1, extras=('cap', 'mustache'), hip=(x - 40, g - 196))
        add_lantern(sc, x + 112, g - 206, 0.19, s=1.0, T=T, swing=10 * math.sin(u * 5) + 6, light_r=560, seed=3.0)
        aim(sc, x + 30, 620, D=0.9)
        sc.vfocus = x + 20
    else:
        u = t - 4.0
        x = 300 + 110 * u
        H = 400.0
        g = 872.0
        road(sc, T, camx=x, w=0.0, dusk=1.0, seed=6)
        ps = walker(x, H, True, lean=10, head=8)
        ps['tb'] = lantern_hand(x, g, H, 1)
        j = add_puppet(sc, 0.2, 'father', ps, x, g, H, 1, extras=('cap', 'mustache'))
        add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.195, s=1.15, T=T, lit=0.0, swing=gait_swing(x, H))
        sc.light(x + 900, 300, 0.92, 1800, 0.55, '#ffb070', halo=0.3)
        aim(sc, x + 100, 600, D=1.0)
        sc.vfocus = x + 40


RITUAL = [(0.0, 2.25, 0, 365, 'small', 1), (2.25, 1.875, 365, 1100, 'small', 2), (4.125, 1.5, 1100, 1825, 'boy', 4),
          (5.625, 1.125, 1825, 2555, 'boy', 5), (6.75, 0.75, 2555, 3285, 'boy', 7)]


@shot('S05', 7.5, events=[(c0, 'match_soft') for (c0, d, *_rest) in RITUAL] + [(c0 + d * 0.5, 'scratch_run', d * 0.4) for (c0, d, *_r) in RITUAL])
def s05(sc, t):
    T = sc.T
    k = 0
    for i, (c0, d, *_r) in enumerate(RITUAL):
        if t >= c0:
            k = i
    c0, d, n0, n1, bed, hm = RITUAL[k]
    p = (t - c0) / d
    e = ramp(p, 0.0, 0.16) * (1 - ramp(p, 0.84, 1.0))
    lit_n = int(lerp(n0, n1, ramp(p, 0.15, 0.85)))
    mark = tally_point(max(0, lit_n - 1), WALL_REGION)
    f = 1
    x = mark[0] - 100
    if x < 120:
        x = mark[0] + 100
        f = -1
    reach = ramp(p, 0.1, 0.25) * (1 - ramp(p, 0.85, 1.0))
    ps = stand(head=-6)
    rest = (x + f * 30, FOOT - 0.38 * H_AD)
    ps['tf'] = (lerp(rest[0], mark[0], reach), lerp(rest[1], mark[1] + 5 * math.sin(T * 30), reach))
    ps['tf_up'] = True
    ps['tb'] = lantern_hand(x, FOOT, H_AD, -f * 0.2)
    w = 0.1 + 0.9 * e
    room(sc, w=w, T=T, count=n1, lit_count=lit_n, light=(ps['tb'][0], ps['tb'][1] + 50, 560 * max(e, 0.05)),
         bed=bed, clock=(4, 30), height_marks=hm, season='snow' if k in (1, 3) else None, a_dim=0.0)
    j = father(sc, 0.22, x, FOOT, H_AD, ps, facing=f, eye='open', eye_a=0.8 * e)
    j['item'].alpha = clamp(e * 1.4)
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.25, T=T, lit=e, light_r=560, seed=1.0)
    sc.items[-1].alpha = clamp(e * 1.4)
    sc.items[-2].alpha = clamp(e * 1.4)
    if p < 0.25:
        add_match(sc, j['hand_f'][0], j['hand_f'][1], 0.205, 1.2, t, c0, ang=-28)
    front_band(sc, w=w)
    aim(sc, 860, 540, D=1.0)
    sc.vfocus = x


def storm(sc, t, kind, extras):
    T = sc.T
    H = 400.0
    g = 872.0
    if t < 1.5:
        x, f, mv = 150 * t, 1, True
    elif t < 4.2:
        x, f, mv = 225, (1 if t < 1.9 else -1), False
    else:
        x, f, mv = 225 + 140 * (t - 4.2), 1, True
    lit = 1 - 0.85 * ramp(t, 1.5, 1.9) + 0.85 * ramp(t, 3.0, 3.8)
    gust = ramp(t, 1.3, 1.7) * (1 - ramp(t, 3.6, 4.4))
    road(sc, T, camx=x, w=1.0, seed=8)
    if 1.9 <= t < 4.2:
        hunch = ramp(t, 1.9, 2.3)
        ps = stand(lean=lerp(2, 24, hunch), head=lerp(0, 18, hunch), hf=8, kf=18, hb=-10, kb=14)
        chest = (x + f * (0.09 * H), g - 0.62 * H + 8)
        ps['tf'] = (chest[0] + f * 22, chest[1] + 30)
        ps['tb'] = (chest[0] + f * 4, chest[1] - 14)
        sw = 4 * math.sin(T * 9)
    else:
        ps = walker(x, H, mv, lean=9 if t > 1.2 else 5)
        ps['tb'] = lantern_hand(x, g, H, f)
        sw = gait_swing(x, H) - 20 * gust * f
    j = add_puppet(sc, 0.2, kind, ps, x, g, H, f, extras=extras)
    lt, fp = add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.195, s=1.15, T=T, lit=lit, swing=sw, wind=-2.5 * gust,
                         light_r=620, seed=5.0)
    puddle_glow(sc, fp.x(), 905, 90, lit)
    rain(sc, 0.16, T, (x - 1500, -300, x + 1500, 1150), density=1.7, angle=-24 - 10 * gust, col='#c4d6f6', a=0.55, seed=5, speed=2300)
    rain(sc, 0.5, T, (x - 1700, -300, x + 1700, 1150), density=1.2, angle=-24, col='#8fa8d8', a=0.3, seed=6, speed=1900, length=30)
    aim(sc, x + 30, 610, D=0.8)
    sc.vfocus = x


@shot('S06', 6.0, events=[(0.0, 'storm_bed', 6.0), ('steps', 0.0, 1.5, 150.0, 400.0), (1.4, 'gust'), (3.0, 'flame_back'), ('steps', 4.2, 6.0, 140.0, 400.0)])
def s06(sc, t):
    storm(sc, t, 'father', ('cap', 'mustache'))


@shot('S07', 6.0, events=[(0.0, 'yard_bed', 6.0)])
def s07(sc, t):
    T = sc.T
    school(sc, T)
    # three boys walk in; ours stops, glances back, then hurries on
    kids = [(-70, 0.0, 0.36), (70, 0.15, 0.37), (0, 0.0, 0.35)]
    ours_x = None
    for i, (dx, dt, z) in enumerate(kids):
        if i == 2:
            if t < 2.2:
                x = kf(t, [(0, 560), (2.2, 820)])
                f, mv = 1, True
            elif t < 2.85:
                x, f, mv = 820, -1, False
            else:
                x, f, mv = kf(t, [(2.85, 820), (4.6, 1190)]), 1, True
            ours_x = x
        else:
            x = kf(t, [(0, 560 + dx), (4.4, 1200 + dx)])
            f, mv = 1, True
        alpha = 1 - ramp(x, 1160 + dx * 0.2, 1230)
        ps = walker(x, 280, mv, lean=3)
        j = add_puppet(sc, z, 'boy', ps, x, 850, 280, f, extras=('kidhair', 'backpack'), col='#2a3044', trans=0.0)
        j['item'].alpha = alpha
    school_fence(sc, 0.16)
    fx = 330
    wave = ramp(t, 1.0, 1.3) * (1 - ramp(t, 3.0, 4.2))
    ps = stand(head=-2, lean=2)
    H = 410.0
    g = 1030.0
    if wave > 0.01:
        up = (fx + 70 + 22 * math.sin(T * 7), g - 0.98 * H)
        rest = (fx + 25, g - 0.42 * H)
        ps['tf'] = (lerp(rest[0], up[0], wave), lerp(rest[1], up[1], wave))
        ps['tf_up'] = True
    ps['tb'] = lantern_hand(fx, g, H, -0.2)
    j = add_puppet(sc, 0.10, 'father', ps, fx, g, H, 1, extras=('cap', 'mustache'), col='#1a1d28', trans=0.0)
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.095, s=1.1, T=T, lit=0.0, col='#1a1d28')
    aim(sc, 820, 640, D=0.95)
    sc.vfocus = kf(t, [(0, 520), (1.8, 520), (2.4, 760), (4.5, 900)])
    sc.vig = 0.4


@shot('S08', 6.0, events=[(0.2, 'door_open'), ('steps', 0.6, 2.2, 470.0, 430.0), (2.6, 'phone_flip'), (3.75, 'scratch'),
                          ('steps', 4.3, 5.4, 600.0, 430.0), (5.4, 'door_close'), (0.0, 'phone_hum', 2.6)])
def s08(sc, t):
    T = sc.T
    n = 5110
    mark = tally_point(n, WALL_REGION)
    if t < 2.2:
        x, f = kf(t, [(0.0, 1500), (0.6, 1500), (2.2, 520)]), -1
        mv = 0.6 < t < 2.2
    elif t < 3.0:
        x, f, mv = 520, -1, False
    elif t < 4.3:
        x, f = kf(t, [(3.0, 520), (3.4, mark[0] + 110)]), -1
        mv = 3.0 < t < 3.4
    else:
        x, f = kf(t, [(4.3, mark[0] + 110), (5.4, 1500)]), 1
        mv = 4.3 < t < 5.4
    phone_on = 1 - ramp(t, 2.55, 2.7)
    presence = ramp(t, 0.35, 0.7) * (1 - ramp(t, 5.3, 5.7))
    w = 0.08 + 0.92 * presence
    ps = walker(x, H_AD, mv, head=4)
    ps['tb'] = lantern_hand(x, FOOT, H_AD, -f * 0.2)
    if 2.1 <= t < 2.9:
        u = ramp(t, 2.1, 2.45) * (1 - ramp(t, 2.7, 2.9))
        ps['tf'] = (lerp(x - 30, 255, u), lerp(FOOT - 0.4 * H_AD, 690, u))
    if 3.4 <= t < 4.3:
        u = ramp(t, 3.4, 3.6) * (1 - ramp(t, 4.0, 4.3))
        ps['tf'] = (lerp(x - 30, mark[0], u), lerp(FOOT - 0.4 * H_AD, mark[1] + 5 * math.sin(T * 40), u))
        ps['tf_up'] = True
    count = n + (1 if t >= 3.75 else 0)
    room(sc, w=w, T=T, count=count, light=(ps['tb'][0], ps['tb'][1] + 50, 520), bed='teen', clock=(4, 30),
         door_open=ramp(t, 0.2, 0.55) * (1 - ramp(t, 0.8, 1.2)) + ramp(t, 5.0, 5.3) * (1 - ramp(t, 5.6, 6.0)),
         height_marks=16)
    ph = P()
    rect(ph, 238, 668, 34, 58, 6)
    pit = sc.add(0.33, ph, '#0b0d18', trans=0.0, shadow=False)
    if phone_on > 0:
        scr = P(); rect(scr, 241, 672, 28, 50, 4)
        pit.emit(scr, '#bcd4ff', a=phone_on, bloom=1.0, sigma=26)
        sc.light(255, 690, 0.33, 420, 0.9 * phone_on, '#7ea6e8', halo=0.25)
    j = father(sc, 0.22, x, FOOT, H_AD, ps, facing=f, eye='open', eye_a=0.8 * presence)
    j['item'].alpha = presence
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.25, T=T, lit=presence, light_r=560,
                swing=gait_swing(x, H_AD) if mv else 0, seed=1.0)
    sc.items[-1].alpha = presence
    sc.items[-2].alpha = presence
    front_band(sc, w=w)
    aim(sc, 760, 560, D=0.9)
    sc.vfocus = kf(t, [(0, 1200), (2.2, 460), (4.0, 420), (5.4, 1250)])


@shot('S09', 6.75, events=[('steps', 0.3, 4.6, 190.0, 380.0), (5.6, 'door_close'), (0.0, 'dawn_bed', 6.75)])
def s09(sc, t):
    T = sc.T
    dawn = 0.3
    close = ramp(t, 5.6, 6.5)
    exterior(sc, T, dawn=dawn, door_light=1.0 - close, door_open=1.0 - close)
    # father in the lit doorway (a silhouette in a window)
    lift = ramp(t, 1.7, 2.2) * (1 - ramp(t, 3.6, 4.4))
    fps_ = stand(head=-4)
    Hf = 290.0
    fps_['tf'] = (950 + 30, 858 - 0.42 * Hf - 70 * lift)
    jf = add_puppet(sc, 0.46, 'father', fps_, 930, 858, Hf, 1, extras=('cap', 'mustache'), col='#0a0705')
    add_lantern(sc, jf['hand_f'][0], jf['hand_f'][1], 0.459, s=0.85, T=T, lit=1 - close, light_r=420, seed=4.0)
    # the son walks out of the gate and doesn't look back
    x = kf(t, [(0, 960), (0.3, 960), (4.6, 1780)])
    mv = 0.3 < t < 4.6
    ps = walker(x, 380, mv, lean=6)
    add_puppet(sc, 0.30, 'son', ps, x, 900, 380, 1, extras=('hair', 'bag'))
    aim(sc, 1060, 620, D=0.95)
    sc.vfocus = kf(t, [(0, 1050), (3.0, 1350), (4.2, 1000), (5.5, 940)])


# ------------------------------------------------------------------ act two

PHONE_FONT = ('sans', 600)


def phone_text(s, size, x, y, wght=600):
    p, _w = text_path(s, font('sans', size, wght=wght), x, y)
    return p


@shot('S10', 7.5, events=[(0.2, 'alarm', 0.9), (1.1, 'snooze'), (2.45, 'alarm', 0.9), (3.35, 'snooze'), (4.7, 'alarm', 0.9),
                          (5.6, 'snooze'), (6.0, 'blanket'), (0.0, 'city_bed', 7.5)])
def s10(sc, t):
    T = sc.T
    rings = [(0.2, 1.1, '7:30'), (2.45, 3.35, '7:39'), (4.7, 5.6, '7:48')]
    morning = 0.25 + 0.35 * ramp(t, 0, 7.5)
    flat(sc, T, morning=morning)
    head = bed_with_sleeper(sc, 0.36, 420, 600, col='#0c1226', blanket_up=ramp(t, 6.0, 6.6))
    ns = P(); rect(ns, 220, 740, 130, 106, 6); capsule(ns, 236, 846, 236, 820, 10); capsule(ns, 334, 846, 334, 820, 10)
    sc.add(0.35, ns, '#0b1124', trans=0.1)
    ring = 0.0
    label = '7:30'
    for (a, b, lab) in rings:
        if t >= a:
            label = lab
        if a <= t < b:
            ring = 1.0
    shake = 3 * math.sin(T * 70) * ring
    body, scr, m = phone_paths(285 + shake, 712, 52, 92, -8)
    pit = sc.add(0.34, body, '#070912', trans=0.0)
    glow = 0.35 + 0.65 * ring
    pit.emit(scr, '#a9c4f2', a=glow, bloom=0.5 + ring, sigma=20)
    tp = transformed(phone_text(label, 22, 0, 6), m)
    pit.emit(tp, '#071028', a=glow, bloom=0.0)
    sc.light(285, 700, 0.34, 380 + 160 * ring, 0.45 + 0.6 * ring, '#7ea6e8', halo=0.2 * ring)
    # his arm comes out to slap the snooze
    for (a, b, lab) in rings:
        u = ramp(t, b - 0.25, b - 0.05) * (1 - ramp(t, b + 0.1, b + 0.5))
        if u > 0.01:
            arm = P()
            hx, hy = lerp(head[0] + 40, 290, u), lerp(head[1] + 30, 700, u)
            capsule(arm, head[0] + 40, head[1] + 34, hx, hy, 24, 20)
            circle(arm, hx, hy, 15)
            sc.add(0.335, arm, '#0c1226', trans=0.1)
    front_band(sc, w=0.0)
    aim(sc, 640, 640, D=0.8)
    sc.vfocus = 420


@shot('S11', 6.0, events=[(0.3, 'marker'), (1.2, 'rip'), (2.3, 'marker'), (3.2, 'rip'), (4.3, 'marker'), (5.2, 'rip'), (0.0, 'kitchen_bed', 6.0)])
def s11(sc, t):
    T = sc.T
    add_sky(sc, 0.9, '#0e1428', '#141c34')
    wall = P(); rect(wall, -1400, -700, 4800, 2000)
    sc.add(0.6, wall, '#1e2a48', trans=0.4, shadow=False)
    fr = P(); rect(fr, 520, -200, 880, 1500, 40)
    sc.add(0.42, fr, '#6f81a6', trans=0.35)
    hd = P(); rect(hd, 1330, 220, 26, 380, 12)
    sc.add(0.41, hd, '#3a4766', trans=0.1)
    # an old photo on the fridge: a man with a lantern
    ph = P(); rect(ph, 640, 160, 170, 210, 4)
    sc.add(0.405, ph, '#c9c2ae', trans=0.2)
    jph = add_puppet(sc, 0.404, 'father', stand(tb=(700, 330)), 725, 350, 150, -1, extras=('cap', 'mustache'), col='#3a3226', trans=0.0)
    add_lantern(sc, jph['hand_b'][0], jph['hand_b'][1], 0.403, s=0.4, T=T, lit=0.0, col='#3a3226')
    mg = P(); circle(mg, 725, 158, 14)
    sc.add(0.40, mg, '#a03a2a', trans=0.0)
    sc.light(960, -200, 0.6, 1500, 0.55, '#b9c9ea')
    k = min(2, int(max(0, t - 0.3) // 2.0))
    c0 = 0.3 + 2.0 * k
    nx, ny = 1000 + 30 * k, 520 - 10 * k
    u_draw = ramp(t, c0, c0 + 0.5)
    rip = ramp(t, c0 + 0.9, c0 + 1.6)
    # note
    m = skia.Matrix.Translate(nx, ny + 900 * rip * rip)
    m.preRotate(-3 + 50 * rip)
    note = P(); rect(note, -70, -70, 140, 140, 4)
    nit = sc.add(0.39, transformed(note, m), '#d9d39a', trans=0.3)
    if u_draw > 0:
        st = P()
        y0 = -40
        capsule(st, -10, y0, -10 - 4 * u_draw, y0 + 80 * u_draw, 9)
        sc.add(0.388, transformed(st, m), '#141822', trans=0.0, shadow=False, rim=False, band=False)
    # the hand: draws, then rips the note off
    if t > c0 - 0.2:
        if rip <= 0:
            hx, hy = nx - 10, ny - 40 + 80 * u_draw
        else:
            hx, hy = nx + 40 + 60 * rip, ny + 60 + 500 * rip * rip
        arm = P()
        capsule(arm, 2300, 1150, hx + 70, hy + 50, 120, 70)
        circle(arm, hx + 40, hy + 30, 52)
        capsule(arm, hx + 20, hy + 10, hx - 8, hy - 2, 26)
        sc.add(0.2, arm, '#0b0f1c', trans=0.05)
        mk = P(); capsule(mk, hx - 5, hy - 5, hx + 50, hy - 55, 18)
        sc.add(0.19, mk, '#111622', trans=0.0)
    aim(sc, 960, 540, D=0.72)
    sc.vfocus = 1000
    sc.overlays = []


@shot('S12', 7.5, events=[(0.0, 'fog_bed', 7.5)])
def s12(sc, t):
    T = sc.T
    flat(sc, T, morning=0.0)
    cz = P()
    rect(cz, 430, 640, 860, 120, 30); rect(cz, 430, 560, 90, 220, 30); rect(cz, 1200, 600, 90, 180, 30)
    capsule(cz, 470, 846, 470, 770, 14); capsule(cz, 1250, 846, 1250, 770, 14)
    sc.add(0.35, cz, '#0b1124', trans=0.15)
    ps = pose(lean=-16, head=24 + 3 * math.sin(T * 1.7), hf=84, kf=74, hb=80, kb=78, tf=(905, 650), tb=(895, 658))
    j = add_puppet(sc, 0.3, 'son', ps, 780, 846, 400, 1, extras=('hair',), hip=(760, 730))
    body, scr, m = phone_paths(908, 638, 34, 60, -22)
    pit = sc.add(0.29, body, '#05060c', trans=0.0)
    pit.emit(scr, '#c6dbff', a=0.95, bloom=1.0, sigma=24)
    feed = P()
    for k in range(5):
        yy = ((k * 22 - T * 46) % 110) - 50
        rect(feed, -12, yy, 24, 14, 2)
    pit.emit(transformed(feed, m), '#ffffff', a=0.6, bloom=0.2)
    flick = 0.85 + 0.15 * math.sin(T * 5.3) * math.sin(T * 2.1)
    sc.light(900, 630, 0.29, 460, 1.0 * flick, '#7ea6e8', halo=0.35)
    if t > 0:
        for i in range(8):
            side = -1 if i % 2 == 0 else 1
            z = 0.55 - i * 0.065
            prog = ramp(t, 0.0 + i * 0.4, 2.6 + i * 0.5)
            off = (1 - prog) * 1500
            x0 = (-1000 - off + i * 60) if side < 0 else (900 + off - i * 60)
            y0 = 120 + (i * 97) % 520 + 18 * math.sin(T * 0.4 + i)
            sh = fog_sheet(x0 + 20 * math.sin(T * 0.3 + i), y0, 1500, 300, seed=i)
            sc.add(z, sh, mixc('#20335f', '#4e6ca8', i / 8), trans=0.6, alpha=0.55 + 0.04 * i, shadow=True)
    front_band(sc, w=0.0)
    aim(sc, 850, 600, D=0.85)
    sc.vfocus = 860


@shot('S13', 6.75, events=[(0.0, 'call_ring', 1.8), (1.8, 'decline'), (3.0, 'call_ring', 1.6), (4.6, 'decline'), (5.0, 'notify')])
def s13(sc, t):
    T = sc.T
    second = t >= 3.0
    add_sky(sc, 0.9, '#0b0f1e' if not second else '#14101a', '#121a30' if not second else '#2a1c20')
    if second:
        desk = P(); rect(desk, -1400, 800, 4800, 900)
        sc.add(0.6, desk, '#1c1416', trans=0.4)
        lap = P(); rect(lap, 200, 380, 520, 330, 14)
        lp = sc.add(0.55, lap, '#0c0a10', trans=0.0)
        scr_ = P(); rect(scr_, 220, 400, 480, 290, 8)
        lp.emit(scr_, '#4a5a80', a=0.5, bloom=0.3, sigma=20)
    ring = (t < 1.8) or (3.0 <= t < 4.6)
    tt = t if not second else t - 3.0
    dec_t = 1.8 if not second else 1.6
    sx_, sy_ = 7 * math.sin(T * 0.9), 5 * math.sin(T * 1.3 + 1)
    body, scr, m = phone_paths(960 + sx_, 560 + sy_, 330, 640, -4 + 1.6 * math.sin(T * 0.7))
    pit = sc.add(0.15, body, '#06070c', trans=0.0)
    state = 'ring' if ring else ('missed' if t >= 5.0 else 'home')
    bg = {'ring': '#2f4f8f', 'home': '#162244', 'missed': '#1b2850'}[state]
    pit.emit(scr, bg, a=1.0, bloom=0.35, sigma=40)
    sc.light(960, 560, 0.15, 900, 0.8, '#7ea6e8', halo=0.15)
    ui = P()
    if state == 'ring':
        pulse = (tt * 1.2) % 1.0
        rr = P(); circle(rr, 0, -150, 70 + 60 * pulse); rr.addCircle(0, -150, 66 + 60 * pulse, skia.PathDirection.kCCW)
        pit.emit(transformed(rr, m), '#c9dcff', a=0.6 * (1 - pulse), bloom=0.3)
        av = P(); circle(av, 0, -150, 66)
        pit.emit(transformed(av, m), '#c9dcff', a=0.95, bloom=0.2)
        jj = add_puppet(sc, 0.149, 'father', stand(), 0, -84, 120, 1, extras=('cap', 'mustache'), col='#1d2e55', trans=0.0)
        jj['item'].path = transformed(jj['item'].path, m)
        jj['item'].shadow = False
        sc.items[-1].alpha = 1.0
        pit.emit(transformed(phone_text('Dad', 58, 0, -18, 600), m), '#f2f6ff', a=1.0, bloom=0.2)
        pit.emit(transformed(phone_text('calling…', 26, 0, 22, 400), m), '#c9dcff', a=0.9, bloom=0.0)
        red = P(); circle(red, -80, 200, 38)
        grn = P(); circle(grn, 80, 200, 38)
        press = ramp(tt, dec_t - 0.08, dec_t)
        pit.emit(transformed(red, m), '#e0574a', a=1.0, bloom=0.4 + press)
        pit.emit(transformed(grn, m), '#46b36a', a=1.0, bloom=0.3)
    elif state == 'missed':
        slide = -160 * (1 - ease_out(clamp((t - 5.0) / 0.45)))
        mc = skia.Matrix.Concat(m, skia.Matrix.Translate(0, slide))
        card = P(); rect(card, -130, -230, 260, 120, 18)
        pit.emit(transformed(card, mc), '#2e4378', a=0.95, bloom=0.2 + 0.2 * math.sin(T * 3) ** 2)
        pit.emit(transformed(phone_text('Missed calls', 26, 0, -182, 500), mc), '#dbe6ff', a=1.0, bloom=0.0)
        pit.emit(transformed(phone_text('Dad (2)', 40, 0, -136, 600), mc), '#ffffff', a=1.0, bloom=0.0)
        pit.emit(transformed(phone_text('9:12', 92, 0, 40, 300), m), '#9fb6e8', a=0.8, bloom=0.0)
    else:
        pit.emit(transformed(phone_text('9:12', 92, 0, -60, 300), m), '#9fb6e8', a=0.8, bloom=0.0)
    # the hand and thumb
    hand = P()
    capsule(hand, 1240, 1400, 1140 + sx_, 900 + sy_, 260, 200)
    smooth_poly(hand, [(780 + sx_, 760 + sy_), (760 + sx_, 960 + sy_), (900 + sx_, 1150 + sy_), (1180 + sx_, 1100 + sy_), (1210 + sx_, 880 + sy_), (1150 + sx_, 760 + sy_)], 0.4)
    sc.add(0.12, hand, '#070912', trans=0.08)
    if ring:
        u = ramp(tt, dec_t - 0.6, dec_t - 0.08) * (1 - ramp(tt, dec_t + 0.1, dec_t + 0.5))
    else:
        u = 0.0
    red_screen = m.mapXY(-80, 200)
    tx, ty = lerp(1150, red_screen.x() + 10, u), lerp(900, red_screen.y() + 14, u)
    th = P(); capsule(th, 1170 + sx_, 980 + sy_, tx + sx_ * (1 - u), ty + sy_ * (1 - u), 62, 50)
    sc.add(0.11, th, '#080a14', trans=0.08)
    aim(sc, 960, 580, D=0.62, z=0.15)
    sc.vfocus = 960


@shot('S14', 3.75, events=[(1.2, 'flicker'), (2.2, 'die')])
def s14(sc, t):
    T = sc.T
    flat(sc, T, morning=0.0, lights_off=0.05 + 0.9 * ramp(t, 2.45, 3.75))
    cz = P(); rect(cz, 430, 640, 860, 120, 30); rect(cz, 430, 560, 90, 220, 30)
    capsule(cz, 470, 846, 470, 770, 14); capsule(cz, 1250, 846, 1250, 770, 14)
    sc.add(0.35, cz, '#0a0f20', trans=0.1)
    br = math.sin(T * 1.6)
    ps = pose(lean=-8 + 2 * br, head=26 + 3 * br, hf=60, kf=120, hb=55, kb=118, tf=(840, 760 + 4 * br), tb=(835, 770 + 4 * br))
    add_puppet(sc, 0.3, 'son', ps, 720, 846, 400, 1, extras=('hair',), hip=(700, 830))
    on = 1.0
    if 1.2 < t < 1.35 or 1.6 < t < 1.7:
        on = 0.2
    if t >= 2.2:
        on = 0.0
    body, scr, m = phone_paths(845, 755, 30, 54, 30)
    pit = sc.add(0.29, body, '#05060c', trans=0.0)
    if on > 0:
        pit.emit(scr, '#8fa8d8', a=0.6 * on, bloom=0.6, sigma=16)
        bat = P(); rect(bat, -8, -4, 16 * 0.15, 8, 1)
        pit.emit(transformed(bat, m), '#e0574a', a=on, bloom=0.3)
        sc.light(845, 750, 0.29, 300, 0.6 * on, '#7ea6e8', halo=0.15)
    front_band(sc, w=0.0)
    aim(sc, 820, 640, D=0.9 - 0.08 * ramp(t, 0.0, 2.2) - 0.06 * ramp(t, 2.4, 3.75))
    sc.vfocus = 820
    sc.fade = 0.0 if t < 2.2 else (1.0 if t < 2.47 else 0.45)


# ------------------------------------------------------------------ the wall

@shot('S15', 13.5, events=[('steps', 0.0, 2.2, 300.0, 380.0), (2.2, 'door_open'), (3.1, 'lantern_lift'), (4.2, 'match'),
                           (4.9, 'lantern_on'), (5.8, 'cascade', 3.6), (8.6, 'reveal'), (0.0, 'night_out', 2.6), (2.6, 'room_tone', 10.9)])
def s15(sc, t):
    T = sc.T
    if t < 2.6:
        exterior(sc, T, dawn=0.0, door_light=0.0, door_open=ramp(t, 2.0, 2.4))
        x = kf(t, [(0, 250), (2.2, 900)])
        ps = walker(x, 380, t < 2.2, lean=8, head=4)
        j = add_puppet(sc, 0.30, 'son', ps, x, 900, 380, 1, extras=('hair', 'bag'))
        j['item'].alpha = 1 - ramp(t, 2.25, 2.6)
        aim(sc, 760, 620, D=0.95)
        sc.vfocus = x
        return
    lit = ramp(t, 4.9, 5.3)
    w = 0.06 + 0.94 * ramp(t, 4.95, 5.9)
    casc = 7300 * ease_in(clamp((t - 5.8) / 3.6) ** 0.85) if t >= 5.8 else 0
    casc = min(7300, casc)
    sx = 1240
    taken = t >= 3.35
    ps = stand(head=kf(t, [(2.6, 0), (5.5, 8), (6.5, -6)]))
    if not taken:
        u = ramp(t, 2.9, 3.3)
        ps['tf'] = (lerp(sx - 40, 1366, u), lerp(FOOT - 0.4 * H_AD, 480, u))
        ps['tf_up'] = True
    else:
        ps['tf'] = (sx - 70, FOOT - 0.55 * H_AD)
    if 4.0 <= t < 5.3:
        ps['tb'] = (sx - 60, FOOT - 0.5 * H_AD - 14)
    room(sc, w=w, T=T, count=7300, lit_count=int(casc), light=(sx - 70, FOOT - 0.55 * H_AD + 50, 700 + 900 * ramp(t, 5.8, 9.4)),
         bed='boy', sleeper=0.0, clock=(4, 30), chair=True, height_marks=18, a_dim=0.035, hook=not taken)
    # father asleep in the chair
    fps_ = pose(lean=14, head=34, hf=84, kf=84, hb=80, kb=82, tf=(1130, 690), tb=(1120, 700))
    jf = add_puppet(sc, 0.28, 'old', fps_, 1010, FOOT, 410, 1, extras=('cap', 'mustache'), hip=(1000, 712),
                    eye='closed', eye_a=0.7 * w)
    j = add_puppet(sc, 0.22, 'son', ps, sx, FOOT, H_AD, -1, extras=('hair',), eye='open', eye_a=0.9 * max(w, 0.3 if t > 4.2 else 0))
    if taken:
        add_lantern(sc, j['hand_f'][0], j['hand_f'][1], 0.205, s=1.25, T=T, lit=lit, light_r=620 + 700 * ramp(t, 5.8, 9.4), seed=6.0, halo=0.45)
    else:
        add_lantern(sc, 1366, 482, 0.584, s=1.2, T=T, lit=0.0)
    if 4.2 <= t < 5.6:
        add_match(sc, j['hand_b'][0], j['hand_b'][1], 0.2, 1.25, t, 4.2, ang=24)
    front_band(sc, w=w, left=t < 5.6)
    # camera: close on the match, then pull back to the whole wall
    if t < 4.0:
        aim(sc, 1180, 600, D=0.9)
    elif t < 5.6:
        aim(sc, 1200, 560, D=0.68)
    elif t < 9.6:
        u = smooth((t - 5.6) / 4.0)
        aim(sc, lerp(1200, 560, u), lerp(560, 520, u), D=lerp(0.68, 1.42, u))
    elif t < 11.4:
        aim(sc, 1060, 600, D=0.62)
    else:
        aim(sc, 560, 520, D=1.38)
    sc.vfocus = kf(t, [(2.6, 1240), (5.8, 1200), (9.6, 500), (9.61, 1060), (11.4, 1060), (11.41, 700)])
    sc.vzoom = 1.0 if t < 5.6 else lerp(1.0, 1.35, ramp(t, 5.8, 9.4))
    if t >= 8.6:
        a = ramp(t, 8.6, 9.0) * (1 - ramp(t, 12.6, 13.3))
        sc.overlay(counter_overlay(casc if t < 9.6 else 7300, a))


@shot('S16', 4.5, events=[(1.9, 'scratch'), (0.0, 'room_tone', 4.5)])
def s16(sc, t):
    T = sc.T
    mark = tally_point(7300, WALL_REGION)
    x = mark[0] + 110
    ps = stand(head=-4)
    u = ramp(t, 1.2, 1.6) * (1 - ramp(t, 2.6, 3.0))
    ps['tf'] = (lerp(x - 30, mark[0], u), lerp(FOOT - 0.4 * H_AD, mark[1] + 5 * math.sin(T * 40) * (1 if 1.6 < t < 2.2 else 0), u))
    ps['tf_up'] = True
    ps['tb'] = lantern_hand(x, FOOT, H_AD, 0.2)
    room(sc, w=1.0, T=T, count=7301 if t >= 1.95 else 7300, light=(ps['tb'][0], ps['tb'][1] + 50, 620), bed='boy', sleeper=0.0,
         clock=(4, 30), chair=True, height_marks=18, dawn=0.15)
    if 1.95 <= t < 2.5:
        fl = P(); circle(fl, mark[0], mark[1], 18)
        sc.items[-1].emit(fl, '#fff0c8', a=1 - ramp(t, 1.95, 2.5), bloom=1.2, sigma=18)
    fps_ = pose(lean=14, head=34, hf=84, kf=84, hb=80, kb=82, tf=(1130, 690), tb=(1120, 700))
    add_puppet(sc, 0.28, 'old', fps_, 1010, FOOT, 410, 1, extras=('cap', 'mustache'), hip=(1000, 712), eye='closed', eye_a=0.6)
    j = add_puppet(sc, 0.22, 'son', ps, x, FOOT, H_AD, -1, extras=('hair',), eye='open')
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.25, T=T, light_r=620, seed=6.0)
    front_band(sc, w=1.0, left=False)
    aim(sc, x - 60, 580, D=0.8)
    sc.vfocus = x - 40


def desk_scene(sc, t, T):
    flat(sc, T, morning=0.0, w=0.6)
    dk = P(); rect(dk, 520, 690, 760, 30, 6); capsule(dk, 560, 846, 560, 720, 12); capsule(dk, 1240, 846, 1240, 720, 12)
    sc.add(0.34, dk, '#1c1008', trans=0.15)
    lap = P(); rect(lap, 760, 560, 240, 150, 10)
    lp = sc.add(0.33, lap, '#08070a', trans=0.0)
    scr = P(); rect(scr, 772, 572, 216, 116, 6)
    lp.emit(scr, '#5d6f98', a=0.6, bloom=0.3, sigma=14)
    lp.emit(phone_text('4:30', 40, 880, 644, 300), '#e6ecff', a=0.85, bloom=0.0)
    ph = P(); rect(ph, 1020, 676, 70, 14, 4)
    sc.add(0.33, ph, '#05060a', trans=0.0)
    ps = pose(lean=16, head=8, hf=86, kf=80, hb=84, kb=82, tf=(870, 690), tb=(860, 694))
    add_puppet(sc, 0.3, 'son', ps, 640, 846, 400, 1, extras=('hair',), hip=(640, 720), eye='open')
    add_lantern(sc, 1170, 690 - 70 * 1.1, 0.32, s=1.1, T=T, light_r=650, seed=7.0)
    for i in range(6):
        side = -1 if i % 2 == 0 else 1
        push = ramp(t, 0.0, 1.8)
        x0 = (-900 - 700 * push - i * 40) if side < 0 else (1300 + 700 * push + i * 40)
        sh = fog_sheet(x0, 100 + i * 110, 1300, 280, seed=i + 10)
        sc.add(0.5 - i * 0.07, sh, '#2a3f70', trans=0.5, alpha=0.55)


@shot('S17', 8.25, events=[(0.0, 'typing', 2.06), (2.06, 'pushups', 2.06), (4.4, 'notes_run', 1.6), ('steps', 6.19, 8.25, 190.0, 400.0), (6.19, 'dawn_road', 2.06)])
def s17(sc, t):
    T = sc.T
    seg = 2.0625
    if t < seg:
        desk_scene(sc, t, T)
        aim(sc, 900, 600, D=0.86)
        sc.vfocus = 880
    elif t < 2 * seg:
        u = t - seg
        flat(sc, T, morning=0.0, w=0.7)
        cyc = 0.5 - 0.5 * math.cos(u * 2 * math.pi * 1.1)
        hip = (720, 790 - 26 * cyc)
        ps = pose(lean=lerp(74, 80, cyc), head=-62, lf=(470, 846), lb=(478, 846), tf=(920, 846), tb=(910, 846))
        add_puppet(sc, 0.3, 'son', ps, 700, 846, 400, 1, extras=('hair',), hip=hip, eye='open')
        add_lantern(sc, 1180, 846 - 70 * 1.1, 0.32, s=1.1, T=T, light_r=640, seed=7.0)
        front_band(sc, w=0.7)
        aim(sc, 860, 640, D=0.85)
        sc.vfocus = 820
    elif t < 3 * seg:
        u = t - 2 * seg
        add_sky(sc, 0.9, '#0e1428', '#141c34')
        wall = P(); rect(wall, -1400, -700, 4800, 2000)
        sc.add(0.6, wall, '#2a2430', trans=0.4, shadow=False)
        fr = P(); rect(fr, 520, -200, 880, 1500, 40)
        sc.add(0.42, fr, '#8a8090', trans=0.35)
        n = int(lerp(4, 30, ramp(u, 0.1, 1.7)))
        for i in range(n):
            cx, cy = 600 + (i % 6) * 125, 140 + (i // 6) * 150
            m = skia.Matrix.Translate(cx, cy)
            m.preRotate(((i * 37) % 9) - 4)
            note = P(); rect(note, -55, -55, 110, 110, 4)
            sc.add(0.39, transformed(note, m), '#e3d29a', trans=0.3)
            st = P(); capsule(st, -8, -32, -12, 32, 8)
            sc.add(0.388, transformed(st, m), '#141822', trans=0.0, shadow=False, rim=False, band=False)
        sc.light(1250, 700, 0.3, 900, 0.9, '#ffb45c', halo=0.2)
        aim(sc, 960, 460, D=0.78)
        sc.vfocus = 920
    else:
        u = t - 3 * seg
        x = 200 + 190 * u
        H = 400.0
        g = 872.0
        road(sc, T, camx=x, w=1.0, dawn=0.7, seed=9)
        ps = walker(x * 1.25, H, True, lean=8)
        ps['tb'] = lantern_hand(x, g, H, 1)
        j = add_puppet(sc, 0.2, 'son', ps, x, g, H, 1, extras=('hair',))
        add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.195, s=1.15, T=T, swing=gait_swing(x * 1.25, H), light_r=620, seed=8.0)
        aim(sc, x + 80, 600, D=0.95)
        sc.vfocus = x + 20


@shot('S18', 6.0, events=[(0.0, 'storm_bed', 6.0), ('steps', 0.0, 1.5, 150.0, 400.0), (1.4, 'gust'), (3.0, 'flame_back'), ('steps', 4.2, 6.0, 140.0, 400.0)])
def s18(sc, t):
    storm(sc, t, 'son', ('hair',))


# ------------------------------------------------------------------ act three

@shot('S19', 10.5, events=[('steps', 0.0, 3.0, 200.0, 380.0), (3.3, 'door_open'), (8.0, 'blow'), (5.5, 'birds', 5.0), (0.0, 'dawn_bed', 10.5)])
def s19(sc, t):
    T = sc.T
    dawn = 0.15 + 0.85 * ramp(t, 0.0, 9.0)
    sun = ramp(t, 4.5, 10.5)
    exterior(sc, T, dawn=dawn, door_light=0.45 * ramp(t, 3.3, 3.9), door_open=ramp(t, 3.3, 3.9), sun=sun)
    lit = 1 - ramp(t, 8.0, 8.4)
    sit = ramp(t, 4.8, 5.6)
    # son
    if t < 4.8:
        x = kf(t, [(0, 150), (3.0, 760)])
        ps = walker(x, 380, t < 3.0, lean=5)
        ps['tb'] = lantern_hand(x, 900, 380, 1)
        j = add_puppet(sc, 0.30, 'son', ps, x, 900, 380, 1, extras=('hair',))
        add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.295, s=1.05, T=T, lit=lit, swing=gait_swing(x, 380) if t < 3 else 0, light_r=560, seed=9.0)
    else:
        ps = pose(lean=4, head=-4, hf=86, kf=80, hb=84, kb=84, tf=(760, 822), tb=(650, 836))
        if 7.6 < t < 8.5:
            ps['head'] = 22
            ps['lean'] = 14
        add_puppet(sc, 0.30, 'son', ps, 700, 900, 380, 1, extras=('hair',), hip=(700, 852), eye='open', eye_a=0.6 * lit)
        add_lantern(sc, 640, 828, 0.295, s=1.05, T=T, lit=lit, light_r=560, seed=9.0)
        if t > 8.0:
            sm = P()
            u = t - 8.0
            for k in range(6):
                yy = 840 - u * 70 - k * 26
                xx = 640 + 10 * math.sin(u * 2 + k)
                circle(sm, xx, yy, 6 + k * 2.5)
            sc.add(0.294, sm, '#9a8a98', trans=0.3, alpha=clamp(0.5 - u * 0.2), shadow=False, rim=False)
    # father: in the doorway, then out on the step beside his son
    if t >= 3.4:
        swap = ramp(t, 4.1, 4.4)
        fdoor = add_puppet(sc, 0.46, 'old', stand(lean=10, head=6), 930, 858, 290, -1, extras=('cap', 'mustache'), col='#0a0705')
        fdoor['item'].alpha = 1 - swap
        fps_ = pose(lean=12, head=8, hf=86, kf=80, hb=84, kb=84, tf=(900, 818), tb=(884, 826))
        fs = add_puppet(sc, 0.29, 'old', fps_, 960, 900, 370, -1, extras=('cap', 'mustache'), hip=(965, 852), eye='open', eye_a=0.5)
        fs['item'].alpha = swap
    # two paper birds
    if t > 5.5:
        bp = P()
        for k in range(2):
            u = (t - 5.5) * 120
            bx, by = 300 + u + k * 90, 260 - u * 0.25 + k * 30
            fl_ = 14 * math.sin(T * 9 + k)
            poly(bp, [(bx - 22, by - fl_), (bx, by + 4), (bx + 22, by - fl_), (bx, by - 2)])
        sc.add(0.85, bp, '#2a1a28', trans=0.0, shadow=False)
    aim(sc, 860, 600, D=0.95)
    sc.vfocus = kf(t, [(0, 300), (3.0, 760), (5.0, 800)])


TEAL = dict(wall=('#163a44', '#5d4128'), floor=('#0a1d22', '#2a1a0c'), furn=('#0c2026', '#3a220f'), trim=('#0f2a31', '#4a2c16'), door=('#123038', '#5a3519'))


@shot('S20', 7.5, events=[(0.8, 'match'), (1.6, 'lantern_on'), ('steps', 2.4, 3.5, 300.0, 430.0), (4.2, 'scratch'), (6.0, 'door_open'),
                          (7.2, 'door_close')])
def s20(sc, t):
    T = sc.T
    lit = ramp(t, 1.6, 2.0)
    gone = ramp(t, 6.8, 7.2)
    w = 0.1 + 0.9 * ramp(t, 1.6, 2.4) * (1 - 0.85 * gone)
    if t < 2.4:
        x, f, mv = 960, -1, False
    elif t < 3.5:
        x, f, mv = kf(t, [(2.4, 960), (3.5, 1215)]), 1, True
    elif t < 4.8:
        x, f, mv = 1215, 1, False
    elif t < 5.6:
        x, f, mv = 1215, -1, False
    else:
        x, f, mv = kf(t, [(5.6, 1215), (6.8, 1495)]), 1, 5.6 < t < 6.8
    mark = tally_point(0, WALL_REGION)
    ps = walker(x, H_AD, mv, head=8 if t < 2.4 else 0)
    if t < 2.4:
        ps['tb'] = (905, 602)
        ps['tf'] = kf(t, [(0, (985, 640)), (0.8, (950, 612)), (1.4, (927, 650)), (2.0, (975, 640))])
    else:
        ps['tb'] = lantern_hand(x, FOOT, H_AD, -f * 0.2)
    u = ramp(t, 3.6, 3.9) * (1 - ramp(t, 4.5, 4.8))
    if u > 0.01:
        ps['tf'] = (lerp(x + 30, mark[0], u), lerp(FOOT - 0.38 * H_AD, mark[1] + 5 * math.sin(T * 40), u))
        ps['tf_up'] = True
    room(sc, w=w, T=T, count=1 if t >= 4.2 else 0, light=(ps['tb'][0], ps['tb'][1] + 50, 560), bed='small', clock=(4, 30), pal=TEAL,
         door_open=ramp(t, 6.0, 6.4) * (1 - ramp(t, 7.1, 7.5)))
    if 4.2 <= t < 4.8:
        fl = P(); circle(fl, mark[0], mark[1], 18)
        sc.items[-1].emit(fl, '#fff0c8', a=1 - ramp(t, 4.2, 4.8), bloom=1.2, sigma=18)
    j = add_puppet(sc, 0.22, 'son', ps, x, FOOT, H_AD, f, extras=('cap', 'beard'), eye='open', eye_a=0.8 * (1 - gone))
    j['item'].alpha = 1 - gone
    add_lantern(sc, j['hand_b'][0], j['hand_b'][1], 0.215, s=1.25 if t < 2.4 else 1.25, T=T, lit=lit * (1 - gone), light_r=560, seed=1.0)
    sc.items[-1].alpha = 1 - gone
    sc.items[-2].alpha = 1 - gone
    if 0.8 <= t < 2.0:
        add_match(sc, j['hand_f'][0], j['hand_f'][1], 0.205, 1.25, t, 0.8, ang=-28)
    front_band(sc, w=w)
    if t < 2.4:
        aim(sc, 930, 600, D=0.6, z=0.22)
    else:
        aim(sc, 1100, 570, D=0.85)
    sc.vfocus = 930 if t < 2.4 else x
    sc.vzoom = 0.7 if t < 2.4 else 1.0


# ------------------------------------------------------------------ keepsake + end card

def keepsake_room(c, M, W, H, sc):
    """The real room around the lamp: dark wall, the lamp's spill. Returns the box opening clip (device)."""
    c.drawPaint(paint('#09080c'))
    m0 = M(0.0)
    cx, cy = m0.mapXY(960, 540).x(), m0.mapXY(960, 540).y()
    sh = skia.GradientShader.MakeRadial(skia.Point(cx, cy), max(W, H) * 0.7,
                                        [argb('#ffb060', 0.22 * sc.box['glow']), argb('#ffb060', 0.06 * sc.box['glow']), argb('#000000', 0)], [0.0, 0.45, 1.0])
    c.drawPaint(paint(None, 1.0, shader=sh))
    op = P(); rect(op, 0, 0, 1920, 1080)
    return transformed(op, m0)


def end_lines(t0):
    def fn(c, W, H, fmt):
        v = fmt == 'v'
        k = W / (1080.0 if v else 1920.0)
        y1 = H * (0.735 if v else 0.792)
        paper_strip_text(c, 'LANTERN', font('play', (78 if v else 58) * k, wght=600), W / 2, y1, reveal=ramp(T_end[0], t0, t0 + 0.8),
                         tracking=(20 if v else 16) * k, col='#ffd79a', glow=0.8, pad=(40 * k, 18 * k))
        a2 = ramp(T_end[0], t0 + 1.8, t0 + 2.4)
        plain_text(c, 'He gave you 7,300 mornings.', font('play', (54 if v else 40) * k, wght=500), W / 2, H * (0.80 if v else 0.887), col='#f3e6cf', a=a2)
        a3 = ramp(T_end[0], t0 + 3.6, t0 + 4.1)
        plain_text(c, 'Give him one.', font('play', (60 if v else 44) * k, wght=700), W / 2, H * (0.845 if v else 0.948), col='#ffbf66', a=a3)
    return fn


T_end = [0.0]


@shot('S21', 15.75, events=[(1.4, 'lamp_click'), (6.0, 'paper_slide'), (10.5, 'call_out'), (0.0, 'end_bed', 15.75)])
def s21(sc, t):
    T = sc.T
    T_end[0] = t
    pull = smooth(clamp((t - 0.35) / 5.2))
    glow = ramp(t, 1.4, 2.4)
    w = 0.12 + 0.5 * glow
    fl_ = flicker(T, 3.0, 1.4)
    room(sc, w=w * (0.94 + 0.06 * fl_), T=T, count=1, light=(1327, 520, 380), bed='small', clock=(4, 30), pal=TEAL,
         backlight=0.55 * glow * fl_, a_dim=1.0)
    if glow > 0:
        # dust turning in the lamp's light, inside the box
        dp = P()
        r_ = rng(77)
        for k in range(46):
            px_ = 300 + r_.uniform(0, 1300) + 40 * math.sin(T * 0.5 + k)
            py_ = (r_.uniform(0, 900) - T * (8 + 6 * r_.uniform())) % 900 + 60
            circle(dp, px_, py_, r_.uniform(1.6, 3.4))
        d_it = sc.add(0.2, dp, '#000000', trans=0.0, shadow=False, rim=False, band=False, tex=False)
        d_it.emit(dp, '#ffd9a0', a=0.55 * glow, bloom=0.4, sigma=6)
    front_band(sc, w=w)
    sc.light(1327, 479, 0.6, 200, 0.6, '#ffb45c')
    vert = sc.fmt == 'v'
    Dk = lerp(1.0, 2.55 if vert else 2.35, pull) - 0.022 * max(0.0, t - 6.0)
    sc.cam = Cam(0.0, lerp(0.0, 190.0 if not vert else 260.0, pull), Dk, drift=0.6)
    sc.vfocus = None
    if pull > 0.0:
        sc.box = {'draw_room': keepsake_room, 'glow': glow}
        # wooden frame and black lining
        fr = P(); rect(fr, -120, -120, 2160, 1320, 30)
        fr.addRect(skia.Rect.MakeXYWH(0, 0, 1920, 1080), skia.PathDirection.kCCW)
        sc.add(-0.01, fr, '#3a2414', trans=0.2)
        ln = P(); rect(ln, 0, 0, 1920, 1080)
        ln.addRect(skia.Rect.MakeXYWH(34, 34, 1852, 1012), skia.PathDirection.kCCW)
        sc.add(-0.005, ln, '#060404', trans=0.0, shadow=False, rim=False)
        tb = P(); rect(tb, -1600, 1200, 5100, 140, 10)
        rect(tb, -1600, 1330, 5100, 900)
        sc.add(-0.06, tb, '#1d120b', trans=0.5)
        sc.light(960, 1150, -0.06, 1400, 0.7 * glow, '#ffb45c')
        # the phone on the table: it calls Dad
        body, scr, m = phone_paths(2350, 1215, 300, 90, 0)
        pit = sc.add(-0.08, body, '#06070c', trans=0.0)
        call = ramp(t, 10.5, 10.8)
        if call > 0:
            pulse = 0.75 + 0.25 * math.sin((t - 10.5) * 4.2)
            pit.emit(scr, '#2f6a4a', a=call * pulse, bloom=0.6 + 0.4 * pulse, sigma=30)
            pit.emit(transformed(phone_text('Calling Dad…', 40, 0, 12, 600), m), '#eafff0', a=call, bloom=0.0)
            sc.light(2350, 1215, -0.08, 600, 0.6 * call, '#7ed6a6', halo=0.15)
        else:
            pit.emit(scr, '#0c0f18', a=1.0, bloom=0.0)
    if t >= 6.0:
        sc.overlay(end_lines(6.0))
    sc.vig = 0.45
