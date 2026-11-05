"""Reusable sets (stacks of paper sheets) for LANTERN."""
import math

import skia

from engine import (P, rect, circle, oval, poly, smooth_poly, capsule, mixc, scalec, argb, clamp, lerp, ramp,
                    smooth, hills_path, house_path, tree_path, add_sky, add_tally_wall, add_clock, add_lantern,
                    puppet, pose, rng, fog_sheet, transformed, add_puppet)

# Old house interior. Floor line y=860. Door at right, tally wall left of the door.
WALL_REGION = (-420.0, 290.0, 1350.0, 822.0)   # where the father's marks go (right to left)
DOOR = (1400.0, 400.0, 200.0, 460.0)           # x, y, w, h of the doorway
WINDOW = (640.0, 250.0, 190.0, 170.0)


def ladder(w, cool, warm):
    return mixc(cool, warm, w)


def room(sc, w=0.0, T=0.0, count=0, lit_count=None, light=None, door_open=0.0, window_sky=('#0a1330', '#1d2c56'),
         moon=True, bed='boy', sleeper=1.0, outside='night', season=None, z0=0.0, dawn=0.0, height_marks=0, wall_count_region=WALL_REGION,
         chair=False, stool=True, clock=(4, 30), clock_face=None, hook=True, warm_slits=None, pal=None, a_dim=0.32, backlight=0.0):
    """Draws the old-house room. w = warmth of the stack (0 cool night, 1 lantern-lit)."""
    # outside, seen through window and door
    sky_top = mixc(window_sky[0], '#2b2f5e', dawn)
    sky_bot = mixc(window_sky[1], '#d48a6a', dawn)
    add_sky(sc, z0 + 0.80, sky_top, sky_bot, stars=0 if dawn > 0.5 else 70, seed=5)
    if moon and dawn < 0.6:
        mp = P(); circle(mp, 760, 300, 34)
        it = sc.add(z0 + 0.79, mp, '#cfd9f2', trans=0.0, shadow=False, rim=False, band=False)
        it.emit(mp, '#e8eeff', a=0.9 * (1 - dawn), bloom=0.8, sigma=30)
    hp = hills_path(-600, 2600, 700, [(300, 260, 120), (900, 300, 90), (1500, 260, 140), (2100, 300, 80)])
    sc.add(z0 + 0.74, hp, mixc('#24365f', '#5a4a6a', dawn), trans=0.5)
    hz = P()
    for i, x in enumerate(range(-500, 2500, 230)):
        hz.addPath(house_path(x + (i * 37) % 60, 760, 90 + (i * 13) % 40, 60 + (i * 7) % 30))
    houses = sc.add(z0 + 0.70, hz, mixc('#16213f', '#3a2c40', dawn), trans=0.3)
    if outside == 'night':
        wp = P()
        r = rng(9)
        for x in range(-480, 2500, 230):
            if r.uniform() < 0.45:
                rect(wp, x + 30, 710, 14, 14)
        houses.emit(wp, '#ffc46a', a=0.8, bloom=0.6, sigma=8)
    if season == 'snow':
        sn = P()
        r = rng(int(T * 2) % 3 + 40)
        for i in range(140):
            yy = (r.uniform(-200, 900) + T * 60) % 1100 - 200
            circle(sn, r.uniform(-400, 2400), yy, r.uniform(1.5, 3.5))
        sc.add(z0 + 0.65, sn, '#e8eeff', trans=0.0, shadow=False, rim=False, band=False, alpha=0.8)

    # back wall with window and doorway holes
    wall = P()
    rect(wall, -1400, -600, 4800, 1460)
    dx, dy, dw, dh = DOOR
    wall.addRect(skia.Rect.MakeXYWH(dx, dy, dw, dh), skia.PathDirection.kCCW)
    wx, wy, ww, wh = WINDOW
    wall.addRect(skia.Rect.MakeXYWH(wx, wy, ww, wh), skia.PathDirection.kCCW)
    P_ = dict(wall=('#1f2d52', '#5e3820'), floor=('#0e1530', '#2c180c'), furn=('#0f1630', '#3b200f'), trim=('#141d38', '#4a2a16'), door=('#1a2547', '#5a3519'))
    if pal:
        P_.update(pal)
    wcol = ladder(w, *P_['wall'])
    if backlight > 0:
        sc.light(560, 420, z0 + 0.61, 1500, backlight, '#ffb468')
    wall_it = sc.add(z0 + 0.60, wall, wcol, trans=0.55, shadow=False)
    if count > 0:
        lx = light if light is not None else None
        add_tally_wall(sc, z0 + 0.60, count, '#ffd08a', wall_count_region, lit_count=lit_count, light_xy=lx,
                       warm=w if warm_slits is None else warm_slits, a_dim=a_dim)
    # window cross bars + frame
    fr = P()
    rect(fr, wx - 14, wy - 14, ww + 28, 14)
    rect(fr, wx - 14, wy + wh, ww + 28, 18)
    rect(fr, wx - 14, wy - 14, 14, wh + 28)
    rect(fr, wx + ww, wy - 14, 14, wh + 28)
    rect(fr, wx + ww / 2 - 4, wy, 8, wh)
    rect(fr, wx, wy + wh / 2 - 4, ww, 8)
    sc.add(z0 + 0.58, fr, ladder(w, *P_['trim']), trans=0.2)
    # door frame and door panel (hinged on the right edge, opens inward)
    df = P()
    rect(df, dx - 22, dy - 26, dw + 44, 26)
    rect(df, dx - 22, dy - 26, 22, dh + 26)
    rect(df, dx + dw, dy - 26, 22, dh + 26)
    sc.add(z0 + 0.58, df, ladder(w, *P_['trim']), trans=0.2)
    if door_open < 0.999:
        pw = dw * (1 - door_open)
        dp = P()
        rect(dp, dx + dw - pw, dy, pw, dh)
        door_it = sc.add(z0 + 0.57, dp, ladder(w, *P_['door']), trans=0.15)
        kb = P(); circle(kb, dx + dw - pw + 18, dy + dh * 0.52, 6)
        sc.add(z0 + 0.565, kb, '#0b0705', trans=0.0, shadow=False)
    if height_marks:
        hm = P()
        for k in range(height_marks):
            yy = 830 - 18 - k * 21
            capsule(hm, dx + dw + 30, yy, dx + dw + 58, yy, 3)
        wall2 = sc.items[[i for i, it in enumerate(sc.items) if it is wall_it][0]]
        wall2.emit(hm, '#ffd08a', a=0.85, bloom=0.5, sigma=8)
    if hook:
        hk = P()
        capsule(hk, 1366, 470, 1366, 490, 5)
        capsule(hk, 1366, 490, 1376, 482, 4)
        sc.add(z0 + 0.585, hk, '#0d0806', trans=0.0)

    # floor
    fl = P()
    rect(fl, -1400, 846, 4800, 900)
    sc.add(z0 + 0.42, fl, ladder(w, *P_['floor']), trans=0.3)
    # furniture
    if bed:
        bp = P()
        bx, bw = 150, 520 if bed != 'small' else 400
        rect(bp, bx, 720, bw, 70, 10)               # mattress
        rect(bp, bx - 18, 610, 26, 250, 6)           # headboard post
        rect(bp, bx + bw - 8, 690, 22, 170, 6)       # foot post
        rect(bp, bx, 780, bw, 22, 4)
        capsule(bp, bx + 10, 845, bx + 10, 800, 14)
        capsule(bp, bx + bw - 10, 845, bx + bw - 10, 800, 14)
        sc.add(z0 + 0.36, bp, ladder(w, *P_['furn']), trans=0.15)
        if sleeper > 0:
            hs = {'boy': 0.55, 'teen': 0.9, 'small': 0.45, 'adult': 1.0, 'child': 0.5}.get(bed, 0.6)
            sl = P()
            # blanket hump + pillow + head
            L = bw * (0.5 + 0.45 * hs)
            smooth_poly(sl, [(bx + 70, 735), (bx + 120, 680 - 20 * hs), (bx + 70 + L * 0.5, 672 - 30 * hs), (bx + 70 + L, 700), (bx + 80 + L, 735)], 0.5)
            oval(sl, bx + 55, 712, 44, 18)
            circle(sl, bx + 62, 690 - 4 * hs, 26 + 8 * hs)
            sc.add(z0 + 0.34, sl, ladder(w, '#0b1028', '#2b160b'), trans=0.15)
    if stool:
        st = P()
        rect(st, 735, 760, 110, 16, 4)
        capsule(st, 748, 776, 742, 846, 9)
        capsule(st, 832, 776, 838, 846, 9)
        sc.add(z0 + 0.33, st, ladder(w, *P_['furn']), trans=0.1)
        if clock is not None:
            fc = clock_face if clock_face is not None else mixc('#7d95c8', '#ffd9a0', w)
            add_clock(sc, 790, 760, z0 + 0.325, 0.95, clock[0], clock[1], ladder(w, '#0b1028', '#24120a'), face_col=fc, face_a=0.75 if w > 0.05 else 0.35)
    if chair:
        ch = P()
        rect(ch, 930, 560, 60, 290, 14)       # back
        rect(ch, 930, 700, 260, 70, 16)       # seat
        rect(ch, 1150, 640, 50, 120, 14)      # arm
        capsule(ch, 950, 770, 945, 846, 12)
        capsule(ch, 1170, 770, 1176, 846, 12)
        sc.add(z0 + 0.30, ch, ladder(w, *P_['furn']), trans=0.1)
    return wall_it


def front_band(sc, w=0.0, z=0.02, y=975, left=True, lx=0.0):
    p = P()
    smooth_poly(p, [(-1400, y + 20), (-200, y - 10), (500, y + 12), (1300, y - 6), (2200, y + 14), (3300, y), (3300, 2200), (-1400, 2200)], 0.4)
    if left:
        smooth_poly(p, [(-1400, -800), (-60 + lx, -800), (40 + lx, 120), (-10 + lx, 520), (60 + lx, 1000), (-1400, 1100)], 0.4)
    sc.add(z, p, mixc('#04060f', '#0c0603', w), trans=0.0)


def father(sc, z, x, ground, h, ps, facing=1, old=False, eye=None, eye_a=0.9):
    return add_puppet(sc, z, 'old' if old else 'father', ps, x, ground, h, facing, extras=('cap', 'mustache'), eye=eye, eye_a=eye_a)


# ------------------------------------------------------------------ outdoor sets

def road(sc, T, camx=0.0, w=1.0, dawn=0.0, dusk=0.0, wet=True, lamps=True, seed=0):
    """Night road for lateral travel. camx = design x the camera is centred on (sheets tile around it)."""
    sky_top = mixc(mixc('#070d22', '#2a2450', dawn), '#3a2a5c', dusk)
    sky_bot = mixc(mixc('#18264d', '#c9876a', dawn), '#e0905a', dusk)
    lo, hi = camx - 2600, camx + 2600
    add_sky(sc, 0.92, sky_top, sky_bot, stars=int(110 * (1 - max(dawn, dusk))), seed=21, x0=lo - 1200, x1=hi + 1200)
    far = hills_path(lo, hi, 640, [(x, 300, 90 + 60 * math.sin(x * 0.013)) for x in range(int(lo // 400) * 400, int(hi), 400)])
    sc.add(0.78, far, mixc(mixc('#2c4170', '#6a5a80', dawn), '#7a5a6a', dusk), trans=0.6)
    hz = P()
    wins = P()
    r = rng(seed + 3)
    for k in range(int(lo // 310), int(hi // 310) + 1):
        x = k * 310 + (k * 53) % 90
        hw = 120 + (k * 29) % 60
        hh = 80 + (k * 17) % 50
        hz.addPath(house_path(x, 720, hw, hh))
        if (k * 7) % 3 != 0:
            rect(wins, x + hw * 0.3, 720 - hh * 0.6, 16, 18)
    houses = sc.add(0.62, hz, mixc(mixc('#17223f', '#4a3a55', dawn), '#4a3040', dusk), trans=0.35)
    houses.emit(wins, '#ffc46a', a=0.8 * (1 - dawn * 0.6), bloom=0.6, sigma=8)
    tr = P()
    for k in range(int(lo // 520), int(hi // 520) + 1):
        x = k * 520 + (k * 131) % 200
        tr.addPath(tree_path(x, 790, 260 + (k * 37) % 120, 'pine' if k % 3 == 0 else 'round', seed=k))
    sc.add(0.42, tr, mixc(mixc('#0c1430', '#2a2238', dawn), '#2a1c28', dusk), trans=0.15)
    poles = P()
    for k in range(int(lo // 900), int(hi // 900) + 1):
        x = k * 900 + 200
        rect(poles, x, 420, 12, 420)
        rect(poles, x - 50, 440, 112, 9)
    wire = P()
    for k in range(int(lo // 900), int(hi // 900) + 1):
        x0 = k * 900 + 206
        q = P(); q.moveTo(x0, 448); q.quadTo(x0 + 450, 520, x0 + 900, 448)
        st = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=2.2)
        fp = P(); st.getFillPath(q, fp); wire.addPath(fp)
    poles.addPath(wire)
    sc.add(0.40, poles, '#05070f', trans=0.0, rim=False)
    ground = P()
    rect(ground, lo - 400, 840, hi - lo + 800, 1400)
    sc.add(0.30, ground, mixc('#0b1022', '#1c1420', dawn), trans=0.35)
    fence = P()
    for k in range(int(lo // 70), int(hi // 70) + 1):
        x = k * 70
        poly(fence, [(x, 1000), (x, 905), (x + 9, 890), (x + 18, 905), (x + 18, 1000)])
    rect(fence, lo, 925, hi - lo, 10)
    rect(fence, lo, 960, hi - lo, 10)
    sc.add(0.10, fence, '#04050b', trans=0.0)
    fg = P()
    for k in range(int(lo // 160), int(hi // 160) + 1):
        x = k * 160 + (k * 47) % 80
        poly(fg, [(x - 30, 1100), (x - 6, 990 - (k * 13) % 50), (x + 4, 1100)])
        poly(fg, [(x + 10, 1100), (x + 30, 1010 - (k * 7) % 40), (x + 40, 1100)])
    rect(fg, lo - 200, 1040, hi - lo + 400, 600)
    sc.add(0.03, fg, '#020308', trans=0.0)


def puddle_glow(sc, x, y, w, inten):
    p = P()
    oval(p, x, y, w, w * 0.12)
    it = sc.add(0.29, p, '#0b1022', trans=0.0, shadow=False, rim=False, band=False, tex=False)
    it.emit(p, '#ffb256', a=0.35 * inten, bloom=0.6, sigma=12)


def exterior(sc, T, dawn=0.0, door_light=1.0, door_open=1.0, sun=0.0, z0=0.0):
    """Front of the old house: door at x 860..1000, path to the gate at right."""
    sky_top = mixc('#0a1330', '#3a3a78', dawn)
    sky_bot = mixc('#1d2c56', '#f2a46a', dawn)
    add_sky(sc, z0 + 0.92, sky_top, sky_bot, stars=int(90 * (1 - dawn)), seed=8, star_a=1 - dawn)
    if sun > 0:
        sp = P(); circle(sp, 1420, 700 - 260 * sun, 70)
        it = sc.add(z0 + 0.86, sp, '#ffcf8a', trans=0.0, shadow=False, rim=False, band=False)
        it.emit(sp, '#ffe2a8', a=min(1.0, sun * 1.4), bloom=1.6, sigma=60)
        sc.light(1420, 700 - 260 * sun, z0 + 0.86, 1500, 0.9 * sun, '#ffb070', halo=0.6)
    far = hills_path(-1400, 3400, 700, [(200, 300, 150), (800, 260, 110), (1450, 320, 170), (2200, 260, 120)])
    sc.add(z0 + 0.80, far, mixc('#2c4170', '#8a6a8a', dawn), trans=0.7)
    mid = hills_path(-1400, 3400, 780, [(-100, 360, 80), (700, 400, 60), (1700, 420, 90)])
    sc.add(z0 + 0.66, mid, mixc('#1a2a50', '#5a4060', dawn), trans=0.45)
    # house
    hs = P()
    poly(hs, [(200, 860), (200, 420), (630, 220), (1060, 420), (1060, 860)])
    rect(hs, 860, 250, 60, 120)
    hs.addRect(skia.Rect.MakeXYWH(860, 560, 140, 300), skia.PathDirection.kCCW)
    hs.addRect(skia.Rect.MakeXYWH(380, 560, 150, 130), skia.PathDirection.kCCW)
    house = sc.add(z0 + 0.45, hs, mixc('#141d3a', '#3a2a3a', dawn), trans=0.3)
    # light in the doorway and the window (lit from inside)
    inside = P()
    rect(inside, 860, 560, 140, 300)
    rect(inside, 380, 560, 150, 130)
    ins = sc.add(z0 + 0.47, inside, '#140c06', trans=0.0, shadow=False, rim=False, band=False)
    if door_light > 0:
        ins.emit(inside, '#ffb256', a=0.85 * door_light, bloom=0.8, sigma=24)
        sc.light(930, 700, z0 + 0.47, 700, 0.8 * door_light, '#ffb35a', halo=0.2, reach=0.12)
    if door_open < 0.999:
        dp = P()
        pw = 140 * (1 - door_open)
        rect(dp, 860, 560, pw, 300)
        sc.add(z0 + 0.455, dp, mixc('#1a2547', '#4a3040', dawn), trans=0.1)
    step = P()
    rect(step, 830, 850, 200, 26, 4)
    rect(step, 800, 872, 260, 26, 4)
    sc.add(z0 + 0.40, step, mixc('#0e1530', '#2a1e2a', dawn), trans=0.1)
    ground = P()
    rect(ground, -1400, 880, 4800, 1400)
    sc.add(z0 + 0.38, ground, mixc('#0b1022', '#241a26', dawn), trans=0.3)
    gate = P()
    for k in range(10):
        x = 1350 + k * 46
        poly(gate, [(x, 1000), (x, 860), (x + 8, 846), (x + 16, 860), (x + 16, 1000)])
    rect(gate, 1330, 880, 520, 10)
    rect(gate, 1330, 930, 520, 10)
    for k in range(-14, -1):
        x = 1350 + k * 46
        poly(gate, [(x, 1000), (x, 870), (x + 8, 856), (x + 16, 870), (x + 16, 1000)])
    rect(gate, 650, 890, 650, 10)
    sc.add(z0 + 0.18, gate, mixc('#05070f', '#140c14', dawn), trans=0.0)
    tr = P()
    tr.addPath(tree_path(-120, 900, 520, 'round', seed=4))
    tr.addPath(tree_path(2050, 900, 600, 'round', seed=6))
    sc.add(z0 + 0.12, tr, mixc('#04060e', '#120a12', dawn), trans=0.0)
    fg = P()
    smooth_poly(fg, [(-1400, 1040), (300, 1010), (1100, 1050), (2000, 1012), (3400, 1040), (3400, 2200), (-1400, 2200)], 0.4)
    sc.add(z0 + 0.02, fg, '#020308', trans=0.0)
    return house


def school(sc, T):
    """Overcast morning: a pale ladder, the gate in front."""
    add_sky(sc, 0.92, '#8d9cb4', '#c9cfd8')
    far = hills_path(-1400, 3400, 640, [(300, 400, 80), (1300, 380, 60)])
    sc.add(0.82, far, '#9aa6ba', trans=0.4)
    bld = P()
    rect(bld, 700, 330, 1000, 520)
    poly(bld, [(1050, 330), (1200, 230), (1350, 330)])
    rect(bld, 1180, 160, 40, 80)
    for k in range(5):
        bld.addRect(skia.Rect.MakeXYWH(760 + k * 190, 420, 90, 110), skia.PathDirection.kCCW)
        bld.addRect(skia.Rect.MakeXYWH(760 + k * 190, 600, 90, 110), skia.PathDirection.kCCW)
    bld.addRect(skia.Rect.MakeXYWH(1140, 700, 120, 150), skia.PathDirection.kCCW)
    sc.add(0.62, bld, '#6b7690', trans=0.3)
    inner = P()
    rect(inner, 700, 330, 1000, 520)
    sc.add(0.64, inner, '#3a4258', trans=0.0, shadow=False, rim=False)
    yard = P()
    rect(yard, -1400, 850, 4800, 1400)
    sc.add(0.5, yard, '#7d8698', trans=0.2)
    tr = P()
    tr.addPath(tree_path(420, 860, 420, 'round', seed=2))
    tr.addPath(tree_path(1900, 860, 460, 'round', seed=3))
    sc.add(0.55, tr, '#5a6680', trans=0.2)
    sc.light(1100, 200, 0.9, 1800, 0.25, '#e8eef8')


def school_fence(sc, z=0.16):
    f = P()
    for k in range(-20, 50):
        x = k * 52
        if 560 < x < 760:
            continue
        rect(f, x, 700, 12, 330)
        poly(f, [(x - 4, 702), (x + 6, 680), (x + 16, 702)])
    rect(f, -1400, 740, 1960, 12)
    rect(f, 760, 740, 2600, 12)
    rect(f, -1400, 960, 1960, 12)
    rect(f, 760, 960, 2600, 12)
    rect(f, 548, 660, 20, 380)
    rect(f, 752, 660, 20, 380)
    sc.add(z, f, '#2a3042', trans=0.0)
    fg = P()
    smooth_poly(fg, [(-1400, 1050), (400, 1030), (1200, 1060), (3400, 1040), (3400, 2200), (-1400, 2200)], 0.4)
    sc.add(0.02, fg, '#3b4252', trans=0.0)


def flat(sc, T, part='bed', morning=0.0, lamp=0.0, lamp_xy=None, fog=0.0, w=0.0, lights_off=0.0):
    """The son's city flat. Cold ladder; a big window on the city."""
    add_sky(sc, 0.92, mixc('#070b1c', '#5d6f93', morning), mixc('#1a2546', '#a9b5c9', morning), stars=0)
    city = P()
    wins = P()
    r = rng(31)
    x = -800
    k = 0
    wl = []
    while x < 2900:
        bw = 90 + (k * 37) % 120
        bh = 260 + (k * 71) % 420
        rect(city, x, 860 - bh, bw, bh + 300)
        for yy in range(int(860 - bh + 30), 840, 38):
            for xx in range(int(x + 14), int(x + bw - 20), 30):
                if r.uniform() < 0.32:
                    wl.append((r.uniform(), xx, yy))
        x += bw + 18
        k += 1
    for (order, xx, yy) in wl:
        if order >= lights_off:
            rect(wins, xx, yy, 12, 16)
    cit = sc.add(0.80, city, mixc('#0e1530', '#5a6683', morning), trans=0.3)
    cit.emit(wins, '#ffd28a', a=0.75 * (1 - morning * 0.8), bloom=0.5, sigma=6)
    wall = P()
    rect(wall, -1400, -700, 4800, 1560)
    wall.addRect(skia.Rect.MakeXYWH(560, 180, 820, 520), skia.PathDirection.kCCW)
    sc.add(0.60, wall, mixc(mixc('#1a2442', '#4a5878', morning), '#4a2e1c', w), trans=0.45, shadow=False)
    fr = P()
    rect(fr, 545, 165, 850, 18)
    rect(fr, 545, 697, 850, 22)
    rect(fr, 545, 165, 18, 550)
    rect(fr, 1377, 165, 18, 550)
    rect(fr, 961, 180, 14, 520)
    sc.add(0.58, fr, mixc('#0f1630', '#2a3450', morning), trans=0.2)
    fl = P()
    rect(fl, -1400, 846, 4800, 900)
    sc.add(0.42, fl, mixc(mixc('#0c1228', '#323c56', morning), '#2a180c', w), trans=0.3)
    if morning > 0:
        sc.light(970, 440, 0.80, 1300, 0.45 * morning, '#c9d6ee')


def bed_with_sleeper(sc, z, x, w, kind='adult', col='#0b1028', blanket_up=0.0):
    bp = P()
    rect(bp, x, 720, w, 70, 10)
    rect(bp, x - 18, 600, 26, 260, 6)
    rect(bp, x + w - 8, 690, 22, 170, 6)
    capsule(bp, x + 10, 845, x + 10, 800, 14)
    capsule(bp, x + w - 10, 845, x + w - 10, 800, 14)
    sc.add(z, bp, col, trans=0.15)
    sl = P()
    L = w * 0.86
    smooth_poly(sl, [(x + 70, 735), (x + 120, 668), (x + 70 + L * 0.5, 655), (x + 70 + L, 690), (x + 80 + L, 735)], 0.5)
    oval(sl, x + 55, 712, 44, 18)
    head = (x + 70, 682 + 18 * blanket_up)
    if blanket_up < 0.95:
        circle(sl, head[0], head[1], 34)
    sc.add(z - 0.01, sl, col, trans=0.15)
    return head


def phone_paths(cx, cy, w, h, ang=0.0):
    m = skia.Matrix.Translate(cx, cy)
    m.preRotate(ang)
    body = P()
    rect(body, -w / 2, -h / 2, w, h, w * 0.14)
    screen = P()
    rect(screen, -w / 2 + w * 0.06, -h / 2 + w * 0.08, w * 0.88, h - w * 0.16, w * 0.08)
    return transformed(body, m), transformed(screen, m), m
