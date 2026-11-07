"""30,000 DAYS: props and world pieces.

The jar is the film's light source: its marbles are holes the light shines through, so as the
days drain, his room gets darker. Spent days rise as bright stars; wasted days hang dim.
"""
import math
import os
import sys
from functools import lru_cache

import skia

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lantern'))
from engine import (P, rect, circle, oval, poly, smooth_poly, capsule, mixc, clamp, lerp, rng, font, text_path,  # noqa: E402
                    transformed, add_sky, hills_path, house_path)

GOLD = '#ffc566'
GOLD_HOT = '#fff0c4'
DIM_STAR = '#7d8fb8'


@lru_cache(maxsize=256)
def _marbles(x, base, w, h, fill_q, rr):
    """Packed marbles inside a jar body (hex grid), filled from the bottom up to fill_q/1000."""
    fill = fill_q / 1000.0
    p = P()
    top = base - h * fill
    r = rng(5)
    row = 0
    y = base - rr
    while y > top + rr * 0.3:
        off = rr if row % 2 else 0.0
        xx = x - w / 2 + rr + off
        while xx < x + w / 2 - rr * 0.6:
            circle(p, xx + r.uniform(-0.6, 0.6), y + r.uniform(-0.6, 0.6), rr * r.uniform(0.82, 0.98))
            xx += 2 * rr
        y -= rr * 1.72
        row += 1
    return p


def jar_paths(x, base, h):
    """Mason jar standing at (x, base). Returns glass rim, lid, body interior rect, label rect."""
    w = h * 0.62
    rim = P()
    outer = P()
    rect(outer, x - w / 2, base - h, w, h, w * 0.18)
    inner = skia.RRect.MakeRectXY(skia.Rect.MakeXYWH(x - w / 2 + 7, base - h + 7, w - 14, h - 14), w * 0.15, w * 0.15)
    outer.addRRect(inner, skia.PathDirection.kCCW)
    rim.addPath(outer)
    lid = P()
    rect(lid, x - w * 0.42, base - h - h * 0.12, w * 0.84, h * 0.13, 6)
    rect(lid, x - w * 0.36, base - h - h * 0.02, w * 0.72, h * 0.05, 3)
    return rim, lid, (x, base - 9, w - 18, h - 18), (x - w * 0.36, base - h * 0.58, w * 0.72, h * 0.26)


def add_jar(sc, x, base, z, h, left, T=0.0, glow=1.0, label=True, light=True, light_r=None, label_font=None):
    """The jar of days. `left` = days remaining (0..30000): it sets the fill, the glow and the number on the label."""
    fill = clamp(left / 30000.0)
    rim, lid, body, lab = jar_paths(x, base, h)
    bx, bb, bw, bh = body
    rr = max(3.2, h * 0.028)
    marbles = _marbles(round(bx, 1), round(bb, 1), round(bw, 1), round(bh, 1), int(fill * 1000), round(rr, 2))
    back = P()
    rect(back, bx - bw / 2, bb - bh, bw, bh, bw * 0.12)
    inside = sc.add(z + 0.002, back, '#0d0a10', trans=0.0, shadow=False, rim=False, band=False)
    fl = 1 + 0.04 * math.sin(T * 3.1) * math.sin(T * 1.7)
    inside.emit(marbles, GOLD, a=0.95 * glow, bloom=0.9 * glow * fl, sigma=10 + 20 * fill)
    # a hot core where the marbles are densest
    if fill > 0.02:
        core = P()
        oval(core, bx, bb - bh * fill * 0.45, bw * 0.38, max(6, bh * fill * 0.38))
        inside.emit(core, GOLD_HOT, a=0.35 * glow * fl, bloom=0.8, sigma=30)
    sc.add(z, rim, '#1a1210', trans=0.15)
    sc.add(z - 0.0005, lid, '#2a1c14', trans=0.1)
    if label:
        lx, ly, lw, lh = lab
        lp = P()
        rect(lp, lx, ly, lw, lh, 4)
        li = sc.add(z - 0.001, lp, '#e8dcc0', trans=0.4)
        f = label_font or font('play', lh * 0.52, wght=700)
        tp, _w = text_path(f'{int(left):,}', f, lx + lw / 2, ly + lh * 0.68)
        sc.add(z - 0.0015, tp, '#2a1a10', trans=0.0, shadow=False, rim=False, band=False)
    if light and fill > 0:
        sc.light(bx, bb - bh * fill * 0.5, z, (light_r or h * 6.5) * (0.35 + 0.65 * fill), (0.4 + 0.75 * fill) * glow * fl, '#ffb45c', halo=0.35 * glow)
    return body


def falling_marble(sc, x, y, z, rr, a=1.0, trail=0.0, col=GOLD):
    p = P()
    circle(p, x, y, rr)
    it = sc.add(z, p, '#000000', trans=0.0, shadow=False, rim=False, band=False, tex=False)
    it.emit(p, col, a=a, bloom=1.2, sigma=14)
    if trail > 0:
        t = P()
        capsule(t, x, y, x, y - trail, rr * 1.6, rr * 0.2)
        it.emit(t, col, a=a * 0.35, bloom=0.6, sigma=10)
    return it


def star_field(sc, z, n_bright, n_dim, region, seed=1, T=0.0, bright_a=1.0, dim_a=0.7):
    x0, y0, x1, y1 = region
    r = rng(seed)
    bp, dp = P(), P()
    for i in range(n_bright):
        sx, sy = r.uniform(x0, x1), r.uniform(y0, y1)
        tw = 0.8 + 0.2 * math.sin(T * (1.5 + i % 5) + i)
        circle(bp, sx, sy, r.uniform(2.2, 4.4) * tw)
    for i in range(n_dim):
        circle(dp, r.uniform(x0, x1), r.uniform(y0, y1), r.uniform(1.0, 1.8))
    it = sc.add(z, P(), '#000000', trans=0.0, shadow=False, rim=False, band=False, tex=False)
    if n_dim:
        it.emit(dp, DIM_STAR, a=dim_a, bloom=0.2, sigma=3)
    if n_bright:
        it.emit(bp, '#fff4d8', a=bright_a, bloom=1.1, sigma=8)
    return it


def river_of_stars(sc, z, n, path_pts, width, seed=2, T=0.0):
    """A band of bright stars along a curve: a life of spent days."""
    r = rng(seed)
    p = P()
    segs = list(zip(path_pts, path_pts[1:]))
    for i in range(n):
        (ax, ay), (bx, by) = segs[int(r.uniform(0, len(segs)))]
        u = r.uniform()
        cx, cy = ax + (bx - ax) * u, ay + (by - ay) * u
        d = r.normal(0, width * 0.35)
        circle(p, cx + d * 0.3, cy + d, r.uniform(1.4, 3.8) * (0.85 + 0.15 * math.sin(T * 2 + i)))
    it = sc.add(z, P(), '#000000', trans=0.0, shadow=False, rim=False, band=False, tex=False)
    it.emit(p, '#fff1cc', a=1.0, bloom=1.0, sigma=9)
    return it


def later_box(sc, z, x, base, w, h, tilt=0.0, label=True, col='#7a5634'):
    m = skia.Matrix.Translate(x, base)
    m.preRotate(tilt)
    b = P()
    rect(b, -w / 2, -h, w, h, 3)
    poly(b, [(-w / 2, -h), (-w / 2 - w * 0.12, -h - h * 0.18), (-w * 0.05, -h - h * 0.12), (0, -h)])
    poly(b, [(w / 2, -h), (w / 2 + w * 0.1, -h - h * 0.16), (w * 0.05, -h - h * 0.1), (0, -h)])
    it = sc.add(z, transformed(b, m), col, trans=0.3)
    if label:
        f = font('display', h * 0.26, wght=850, wdth=80)
        tp, _w = text_path('LATER', f, 0, -h * 0.38)
        sc.add(z - 0.0008, transformed(tp, m), '#2a1a0e', trans=0.0, shadow=False, rim=False, band=False)
    return it


def guitar_path(x, y, s=1.0, ang=-30.0):
    m = skia.Matrix.Translate(x, y)
    m.preRotate(ang)
    m.preScale(s, s)
    g = P()
    circle(g, 0, 40, 46)
    circle(g, 0, -12, 36)
    rect(g, -8, -190, 16, 170, 4)
    rect(g, -13, -230, 26, 44, 6)
    hole = P()
    circle(hole, 0, 14, 13)
    return transformed(g, m), transformed(hole, m)


def city_of_jars(sc, z, x0, x1, base, seed=4, T=0.0, lit=1.0, wide=1.0):
    """Night blocks; in every lit window a small jar glows at its own level."""
    r = rng(seed)
    bl = P()
    jars_hot, jars_dim = P(), P()
    x = x0
    while x < x1:
        bw = r.uniform(140, 260) * wide
        bh = r.uniform(260, 620)
        rect(bl, x, base - bh, bw, bh + 800)
        yy = base - bh + 40
        while yy < base - 50:
            xx = x + 22
            while xx < x + bw - 40:
                if r.uniform() < 0.55:
                    lvl = r.uniform()
                    jh = 20
                    jx, jy = xx + 9, yy + 26
                    body = jars_hot if lvl > 0.35 else jars_dim
                    rect(body, jx - 5, jy - jh * lvl, 10, jh * max(0.15, lvl), 2)
                xx += 38
            yy += 52
        x += bw + r.uniform(10, 40)
    it = sc.add(z, bl, '#121a33', trans=0.3)
    it.emit(jars_hot, GOLD, a=0.9 * lit, bloom=0.7, sigma=7)
    it.emit(jars_dim, '#c98c4a', a=0.55 * lit, bloom=0.3, sigma=4)
    return it
