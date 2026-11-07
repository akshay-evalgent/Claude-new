"""30,000 DAYS, look B: an original character in a 2D anime-style look (big eyes, clean line art,
flat cel shading, screen-lit faces). Drawn as flat items on the LANTERN engine with paper effects off.

Not a copy of any existing character: our protagonist keeps the film's own signatures
(the red scarf his mother knits, the cowlick, the jar's gold) and wears a mustard hoodie.
"""
import math
import os
import sys

import skia

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lantern'))
from engine import P, rect, circle, oval, poly, smooth_poly, capsule, mixc, clamp, lerp, transformed, argb  # noqa: E402

LINE = '#1a1220'

HERO = dict(skin='#f4cfb2', skin_sh='#d99f86', hair='#3b2a22', hair_sh='#24180f', hair_hi='#7a5640', iris='#b8742a', iris_dk='#5a3410',
            hood='#c9962f', hood_sh='#94661c', scarf='#c8402e', scarf_sh='#8e2a1e', shirt='#ece4d8', freckles=True)
NEIGHBOUR = dict(skin='#e8c0a0', skin_sh='#c29076', hair='#d9d4cc', hair_sh='#a8a198', hair_hi='#ffffff', iris='#4a6a8a', iris_dk='#22344a',
                 hood='#3d4a6a', hood_sh='#26304a', scarf='#7a2a2a', scarf_sh='#4a1616', shirt='#efe8dc', freckles=False)

# eye: (open 0..1, lid tilt (+ = inner corner up / sad), lower lid raise, pupil scale, look x, look y)
EXPR = {
    'neutral':    dict(open=1.0, tilt=0.0, low=0.0, pupil=1.0, brow=(0.0, 0.0), mouth=('line', 0.0), bags=False, blush=0.0),
    'tired':      dict(open=0.55, tilt=-0.05, low=0.05, pupil=1.0, brow=(-0.03, -0.06), mouth=('line', -0.02), bags=True, blush=0.0),
    'sad':        dict(open=0.8, tilt=0.18, low=0.05, pupil=1.0, brow=(0.12, -0.08), mouth=('line', -0.06), bags=False, blush=0.2, tear=True),
    'wide':       dict(open=1.25, tilt=0.0, low=0.0, pupil=0.55, brow=(0.14, 0.14), mouth=('o', 0.05), bags=False, blush=0.0, sweat=True),
    'determined': dict(open=0.85, tilt=-0.15, low=0.18, pupil=1.0, brow=(-0.14, 0.06), mouth=('line', 0.0), bags=False, blush=0.0),
    'happy':      dict(open=0.0, tilt=0.0, low=0.0, pupil=1.0, brow=(0.06, 0.06), mouth=('smile', 0.08), bags=False, blush=0.6),
    'laugh':      dict(open=0.0, tilt=0.0, low=0.0, pupil=1.0, brow=(0.1, 0.1), mouth=('open', 0.14), bags=False, blush=0.7),
    'asleep':     dict(open=-1.0, tilt=0.0, low=0.0, pupil=1.0, brow=(0.0, 0.0), mouth=('line', 0.01), bags=False, blush=0.2),
}


def stroke(path, w, cap=True):
    p = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=w,
                   StrokeCap=skia.Paint.kRound_Cap if cap else skia.Paint.kButt_Cap, StrokeJoin=skia.Paint.kRound_Join)
    out = P()
    p.getFillPath(path, out)
    return out


def U(*paths):
    """Union of paths (clean single outline)."""
    out = None
    for q in paths:
        out = q if out is None else skia.Op(out, q, skia.PathOp.kUnion_PathOp)
    return out if out is not None else P()


def I(a, b):
    return skia.Op(a, b, skia.PathOp.kIntersect_PathOp)


def curve(pts):
    p = skia.Path()
    p.moveTo(*pts[0])
    if len(pts) == 3:
        p.quadTo(*pts[1], *pts[2])
    elif len(pts) == 4:
        p.cubicTo(*pts[1], *pts[2], *pts[3])
    else:
        for q in pts[1:]:
            p.lineTo(*q)
    return p


def flat(sc, z, path, col, a=1.0, shader=None):
    return sc.add(z, path, col, trans=0.0, shadow=False, rim=False, band=False, tex=False, alpha=a, shader=shader)


def head(sc, z, cx, cy, s, look=HERO, expr='neutral', yaw=0.0, glow=None, glow2=None, cowlick=True, hat=False, mustache=False,
         bangs='hero', age=26):
    """Front-facing anime head. (cx, cy) = face centre, s = half head height in px. Returns anchor points.

    glow = (x, y, radius, colour, strength) light painted over skin (a phone below, the jar to one side)."""
    E = EXPR[expr]
    dz = 0.0002

    def X(u):
        return cx + (u + yaw * 0.22) * s

    def Y(v):
        return cy + v * s

    def Pt(u, v):
        return (X(u), Y(v))
    near = 1.0 + 0.12 * yaw
    far = 1.0 - 0.12 * yaw
    # back hair mass
    bh = P()
    smooth_poly(bh, [Pt(-0.98, -0.25), Pt(-0.92, -0.9), Pt(-0.2, -1.22), Pt(0.6, -1.12), Pt(1.0, -0.6), Pt(1.0, 0.25), Pt(0.82, 0.55), Pt(-0.82, 0.55)], 0.35)
    flat(sc, z + 6 * dz, bh, look['hair_sh'])
    # neck
    nk = P()
    rect(nk, X(-0.26), Y(0.6), 0.52 * s, 0.75 * s, 0.1 * s)
    flat(sc, z + 5 * dz, nk, look['skin_sh'])
    # ears
    ear = P()
    oval(ear, X(-0.86), Y(0.12), 0.13 * s * far, 0.2 * s)
    oval(ear, X(0.86), Y(0.12), 0.13 * s * near, 0.2 * s)
    flat(sc, z + 4 * dz, ear, look['skin'])
    # face
    face = P()
    smooth_poly(face, [Pt(-0.84, -0.55), Pt(-0.86, 0.1), Pt(-0.72, 0.52), Pt(-0.38, 0.86), Pt(0.0, 1.0), Pt(0.38, 0.86), Pt(0.72, 0.52),
                       Pt(0.86, 0.1), Pt(0.84, -0.55), Pt(0.3, -0.95), Pt(-0.3, -0.95)], 0.3)
    flat(sc, z + 3 * dz, face, look['skin'])
    # cel shadow under the fringe and down one cheek
    sh = P()
    smooth_poly(sh, [Pt(-0.84, -0.55), Pt(0.84, -0.55), Pt(0.82, -0.25), Pt(0.4, -0.38), Pt(0.0, -0.3), Pt(-0.5, -0.36), Pt(-0.84, -0.2)], 0.35)
    smooth_poly(sh, [Pt(0.84, -0.1), Pt(0.86, 0.1), Pt(0.72, 0.52), Pt(0.4, 0.84), Pt(0.55, 0.5), Pt(0.7, 0.1)], 0.35)
    flat(sc, z + 2.8 * dz, sh, look['skin_sh'], a=0.8)
    # light over the skin
    for g in (glow, glow2):
        if g:
            gx, gy, gr, gc, ga = g

            def shd(m, gx=gx, gy=gy, gr=gr, gc=gc, ga=ga):
                return skia.GradientShader.MakeRadial(skia.Point(gx, gy), gr, [argb(gc, ga), argb(gc, ga * 0.5), argb(gc, 0)], [0.0, 0.5, 1.0])
            flat(sc, z + 2.7 * dz, face, '#ffffff', shader=shd)
    # blush, freckles, bags
    if E['blush'] > 0:
        bl = P()
        oval(bl, X(-0.5), Y(0.5), 0.18 * s, 0.07 * s)
        oval(bl, X(0.5), Y(0.5), 0.18 * s, 0.07 * s)
        flat(sc, z + 2.6 * dz, bl, '#ef8a80', a=0.5 * E['blush'])
    if look.get('freckles'):
        fr = P()
        for (u, v) in ((-0.55, 0.42), (-0.47, 0.47), (-0.62, 0.48), (0.55, 0.42), (0.47, 0.47), (0.62, 0.48)):
            circle(fr, X(u), Y(v), 0.016 * s)
        flat(sc, z + 2.5 * dz, fr, '#b8735a', a=0.7)
    # eyes
    lines = P()
    for side in (-1, 1):
        ex, ey = X(side * 0.4), Y(0.18)
        w = 0.27 * s * (near if side > 0 else far)
        hgt = 0.34 * s * max(0.0, E['open'])
        if E['open'] > 0.05:
            eye = P()
            top = ey - hgt * 0.95
            tilt = E['tilt'] * s * (1 if side < 0 else -1) * -1
            smooth_poly(eye, [(ex - w, ey + 0.02 * s), (ex - w * 0.6, top + tilt * 0.6), (ex + w * 0.5, top - tilt * 0.4), (ex + w, ey - 0.02 * s),
                              (ex + w * 0.55, ey + hgt * 0.5 - E['low'] * s), (ex - w * 0.5, ey + hgt * 0.5 - E['low'] * s)], 0.45)
            flat(sc, z + 2 * dz, eye, '#ffffff')
            ir = 0.19 * s
            ix, iy = ex + yaw * 0.05 * s, ey + 0.03 * s
            iris = P()
            circle(iris, ix, iy, ir)
            iris = I(iris, eye)
            iris_i = flat(sc, z + 1.8 * dz, iris, look['iris'],
                          shader=lambda m, ix=ix, iy=iy, ir=ir: skia.GradientShader.MakeLinear([skia.Point(ix, iy - ir), skia.Point(ix, iy + ir)],
                                                                                               [argb(look['iris_dk']), argb(look['iris'])], [0.15, 1.0]))
            pu = P()
            circle(pu, ix, iy, ir * 0.42 * E['pupil'])
            flat(sc, z + 1.7 * dz, I(pu, eye), '#120a08')
            ring = P()
            circle(ring, ix, iy, ir)
            ring.addCircle(ix, iy, ir * 0.86, skia.PathDirection.kCCW)
            flat(sc, z + 1.65 * dz, I(ring, eye), look['iris_dk'], a=0.9)
            hi = P()
            oval(hi, ix + ir * 0.38, iy - ir * 0.42, ir * 0.3, ir * 0.24)
            circle(hi, ix - ir * 0.42, iy + ir * 0.38, ir * 0.11)
            flat(sc, z + 1.6 * dz, I(hi, eye), '#ffffff')
            lidsh = P()
            rect(lidsh, ex - w * 1.2, top - 0.2 * s, w * 2.4, hgt * 0.38 + 0.2 * s)
            flat(sc, z + 1.55 * dz, I(lidsh, eye), look['skin_sh'], a=0.35)
            # clip iris to the eye: redraw eye outline mask by covering outside with skin is complex; keep iris inside by size
            ul = curve([(ex - w * 1.05, ey + 0.03 * s), (ex - w * 0.5, top + tilt * 0.6 - 0.02 * s), (ex + w * 0.6, top - tilt * 0.4 - 0.02 * s), (ex + w * 1.12, ey - 0.08 * s)])
            lines.addPath(stroke(ul, 0.075 * s))
            ll = curve([(ex - w * 0.6, ey + hgt * 0.55 - E['low'] * s), (ex, ey + hgt * 0.62 - E['low'] * s), (ex + w * 0.7, ey + hgt * 0.5 - E['low'] * s)])
            lines.addPath(stroke(ll, 0.025 * s))
            if E['bags']:
                bg = curve([(ex - w * 0.5, ey + 0.2 * s), (ex, ey + 0.26 * s), (ex + w * 0.5, ey + 0.2 * s)])
                lines.addPath(stroke(bg, 0.02 * s))
        elif E['open'] < -0.5:
            sl = curve([(ex - w, ey + 0.02 * s), (ex, ey + 0.1 * s), (ex + w, ey + 0.02 * s)])
            lines.addPath(stroke(sl, 0.06 * s))
        else:
            hp = curve([(ex - w, ey + 0.06 * s), (ex, ey - 0.1 * s), (ex + w, ey + 0.06 * s)])
            lines.addPath(stroke(hp, 0.065 * s))
        # brow
        bi, bo = E['brow']
        inner = (ex - side * w * 0.9, ey - 0.42 * s - bi * s)
        outer = (ex + side * w * 0.95, ey - 0.4 * s - bo * s)
        lines.addPath(stroke(curve([inner, ((inner[0] + outer[0]) / 2, min(inner[1], outer[1]) - 0.04 * s), outer]), 0.055 * s))
    # nose and mouth
    lines.addPath(stroke(curve([Pt(0.03, 0.5), Pt(0.07, 0.56), Pt(0.01, 0.58)]), 0.025 * s))
    kind, cv = E['mouth']
    if kind in ('line', 'smile'):
        lines.addPath(stroke(curve([Pt(-0.16, 0.76 - cv * 0.5), Pt(0.0, 0.76 + cv), Pt(0.16, 0.76 - cv * 0.5)]), 0.035 * s))
    else:
        mo = P()
        if kind == 'o':
            oval(mo, X(0.0), Y(0.78), 0.07 * s, 0.09 * s)
        else:
            smooth_poly(mo, [Pt(-0.2, 0.72), Pt(0.2, 0.72), Pt(0.12, 0.86), Pt(0.0, 0.9), Pt(-0.12, 0.86)], 0.4)
        flat(sc, z + 1.5 * dz, mo, '#7a2a2a')
        tg = P()
        oval(tg, X(0.0), Y(0.84 if kind != 'o' else 0.82), 0.08 * s if kind != 'o' else 0.04 * s, 0.035 * s)
        flat(sc, z + 1.45 * dz, tg, '#e07a7a')
        lines.addPath(stroke(mo, 0.03 * s))
    if E.get('tear'):
        tr = P()
        smooth_poly(tr, [Pt(-0.55, 0.36), Pt(-0.5, 0.5), Pt(-0.55, 0.56), Pt(-0.6, 0.5)], 0.5)
        flat(sc, z + 1.3 * dz, tr, '#bfe0ff', a=0.9)
    if E.get('sweat'):
        sw = P()
        smooth_poly(sw, [Pt(0.82, -0.5), Pt(0.9, -0.32), Pt(0.84, -0.26), Pt(0.78, -0.34)], 0.5)
        flat(sc, z + 1.3 * dz, sw, '#cfe6ff', a=0.95)
    if mustache:
        mu = P()
        smooth_poly(mu, [Pt(-0.32, 0.66), Pt(0.0, 0.62), Pt(0.32, 0.66), Pt(0.26, 0.74), Pt(0.0, 0.7), Pt(-0.26, 0.74)], 0.4)
        flat(sc, z + 1.2 * dz, mu, look['hair'])
    # fringe: pointed clumps, our own parting swept to his left, plus the cowlick
    if bangs == 'hero':
        cap_ = P()
        smooth_poly(cap_, [Pt(-1.0, -0.4), Pt(-0.96, -0.95), Pt(-0.4, -1.22), Pt(0.4, -1.2), Pt(0.96, -0.9), Pt(1.0, -0.4), Pt(0.5, -0.66), Pt(-0.5, -0.66)], 0.35)
        locks = []
        # (root u, tip u, tip v, width) swept toward his left
        for (ru, tu, tv, wd) in ((-0.95, -0.98, 0.05, 0.22), (-0.7, -0.62, -0.2, 0.28), (-0.4, -0.2, -0.3, 0.3), (-0.05, 0.22, -0.36, 0.3),
                                 (0.3, 0.55, -0.4, 0.28), (0.62, 0.86, -0.3, 0.24), (0.9, 1.0, 0.0, 0.18)):
            lk = P()
            smooth_poly(lk, [Pt(ru - wd / 2, -0.82), Pt(ru + wd / 2, -0.85), Pt((ru + tu) / 2 + wd * 0.25, (tv - 0.8) / 2), Pt(tu, tv),
                             Pt((ru + tu) / 2 - wd * 0.2, (tv - 0.75) / 2 + 0.05)], 0.4)
            locks.append(lk)
        parts = [cap_] + locks
    else:
        cap_ = P()
        smooth_poly(cap_, [Pt(-1.0, -0.4), Pt(-0.85, -0.92), Pt(-0.4, -1.05), Pt(0.4, -1.05), Pt(0.85, -0.92), Pt(1.0, -0.4), Pt(0.6, -0.7), Pt(-0.6, -0.7)], 0.35)
        sides = P()
        smooth_poly(sides, [Pt(-1.0, -0.5), Pt(-0.84, -0.5), Pt(-0.86, 0.05), Pt(-0.98, 0.0)], 0.3)
        smooth_poly(sides, [Pt(1.0, -0.5), Pt(0.84, -0.5), Pt(0.86, 0.05), Pt(0.98, 0.0)], 0.3)
        parts = [sides] if hat else [cap_, sides]
    if cowlick:
        ck = P()
        smooth_poly(ck, [Pt(-0.12, -1.12), Pt(-0.02, -1.42), Pt(0.3, -1.52), Pt(0.18, -1.34), Pt(0.2, -1.12)], 0.35)
        parts.append(ck)
    fr = U(*parts)
    flat(sc, z + 1.0 * dz, fr, look['hair'])
    hl = P()
    for (a0, a1, a2) in (((-0.78, -0.86), (-0.6, -1.02), (-0.4, -1.08)), ((-0.2, -1.12), (-0.02, -1.15), (0.14, -1.13))):
        hl.addPath(stroke(curve([Pt(*a0), Pt(*a1), Pt(*a2)]), 0.045 * s))
    flat(sc, z + 0.9 * dz, I(hl, fr), look['hair_hi'], a=0.55)
    lines.addPath(stroke(fr, 0.032 * s))
    lines.addPath(stroke(U(face, ear), 0.035 * s))
    if hat:
        brim = P()
        rect(brim, X(-1.22), Y(-0.74), 2.44 * s, 0.15 * s, 0.075 * s)
        crown = P()
        smooth_poly(crown, [Pt(-0.8, -0.68), Pt(-0.74, -1.28), Pt(0.0, -1.36), Pt(0.74, -1.28), Pt(0.8, -0.68)], 0.25)
        ht = U(brim, crown)
        flat(sc, z + 0.6 * dz, ht, '#2a2a36')
        band = P(); rect(band, X(-0.79), Y(-0.9), 1.58 * s, 0.14 * s)
        flat(sc, z + 0.55 * dz, band, '#7a2a2a')
        lines.addPath(stroke(ht, 0.03 * s))
    flat(sc, z + 0.4 * dz, lines, LINE)
    return dict(neck=(X(0), Y(0.95)), chin=Pt(0, 1.0), s=s, cx=cx, cy=cy)


def bust(sc, z, cx, cy, s, look=HERO, expr='neutral', yaw=0.0, glow=None, glow2=None, scarf=True, hood=True, arms=None, **kw):
    """Head and shoulders: hoodie (hood behind the neck), the red scarf. s = half head height."""
    dz = 0.0002
    W = s * 2.35
    top = cy + 0.95 * s
    body = P()
    smooth_poly(body, [(cx - W * 0.3, top + 0.1 * s), (cx - W * 0.55, top + 0.42 * s), (cx - W * 0.63, top + 1.2 * s), (cx - W * 0.64, top + 3.4 * s),
                       (cx + W * 0.64, top + 3.4 * s), (cx + W * 0.63, top + 1.2 * s), (cx + W * 0.55, top + 0.42 * s), (cx + W * 0.3, top + 0.1 * s), (cx, top)], 0.3)
    flat(sc, z + 12 * dz, body, look['hood'])
    sh = P()
    smooth_poly(sh, [(cx + W * 0.2, top + 0.3 * s), (cx + W * 0.62, top + 0.7 * s), (cx + W * 0.7, top + 3.2 * s), (cx + W * 0.35, top + 3.2 * s)], 0.3)
    flat(sc, z + 11.9 * dz, sh, look['hood_sh'], a=0.8)
    if glow:
        gx, gy, gr, gc, ga = glow

        def shd(m, gx=gx, gy=gy, gr=gr, gc=gc, ga=ga):
            return skia.GradientShader.MakeRadial(skia.Point(gx, gy), gr * 1.4, [argb(gc, ga * 0.8), argb(gc, 0)], [0.0, 1.0])
        flat(sc, z + 11.8 * dz, body, '#ffffff', shader=shd)
    if hood:
        hd = P()
        smooth_poly(hd, [(cx - W * 0.4, top + 0.25 * s), (cx - W * 0.32, top - 0.25 * s), (cx + W * 0.32, top - 0.25 * s), (cx + W * 0.4, top + 0.25 * s), (cx, top + 0.45 * s)], 0.35)
        flat(sc, z + 12.5 * dz, hd, look['hood_sh'])
        st = P()
        st.addPath(stroke(curve([(cx - 0.18 * s, top + 0.4 * s), (cx - 0.2 * s, top + 1.3 * s)]), 0.045 * s))
        st.addPath(stroke(curve([(cx + 0.18 * s, top + 0.4 * s), (cx + 0.2 * s, top + 1.2 * s)]), 0.045 * s))
        flat(sc, z + 10 * dz, st, look['shirt'])
    if scarf:
        sf = P()
        smooth_poly(sf, [(cx - 0.62 * s, top - 0.05 * s), (cx + 0.62 * s, top - 0.05 * s), (cx + 0.7 * s, top + 0.32 * s), (cx - 0.7 * s, top + 0.32 * s)], 0.4)
        smooth_poly(sf, [(cx + 0.2 * s, top + 0.2 * s), (cx + 0.58 * s, top + 0.2 * s), (cx + 0.66 * s, top + 1.6 * s), (cx + 0.3 * s, top + 1.62 * s)], 0.3)
        flat(sc, z + 9 * dz, sf, look['scarf'])
        ss = P()
        for k in range(4):
            yy = top + (0.45 + k * 0.3) * s
            rect(ss, cx + 0.26 * s + k * 0.01 * s, yy, 0.36 * s, 0.05 * s)
        flat(sc, z + 8.9 * dz, ss, look['scarf_sh'], a=0.8)
        flat(sc, z + 8.8 * dz, stroke(sf, 0.03 * s), LINE)
    seams = P()
    seams.addPath(stroke(curve([(cx - W * 0.44, top + 0.55 * s), (cx - W * 0.47, top + 1.6 * s), (cx - W * 0.45, top + 3.4 * s)]), 0.03 * s))
    seams.addPath(stroke(curve([(cx + W * 0.44, top + 0.55 * s), (cx + W * 0.47, top + 1.6 * s), (cx + W * 0.45, top + 3.4 * s)]), 0.03 * s))
    flat(sc, z + 8.6 * dz, seams, LINE, a=0.55)
    flat(sc, z + 8.5 * dz, stroke(body, 0.035 * s), LINE)
    return head(sc, z, cx, cy, s, look, expr, yaw, glow, glow2, **kw)


def _rect_path(x, y, w, h):
    p = P()
    rect(p, x, y, w, h)
    return p


def phone_hand(sc, z, x, y, s, screen='#cfe0ff', ang=-8.0, look=HERO):
    """A phone held up in a hand, screen toward the viewer's face (seen from the side/back)."""
    m = skia.Matrix.Translate(x, y)
    m.preRotate(ang)
    ph = P(); rect(ph, -0.55 * s, -1.0 * s, 1.1 * s, 2.0 * s, 0.18 * s)
    it = flat(sc, z, transformed(ph, m), '#14161e')
    hd = P()
    smooth_poly(hd, [(-0.62 * s, 0.1 * s), (-0.5 * s, 1.2 * s), (0.62 * s, 1.25 * s), (0.7 * s, 0.25 * s), (0.0, 0.05 * s)], 0.4)
    fingers = [hd]
    for k in range(4):
        f_ = P()
        y = -0.15 * s + k * 0.3 * s
        capsule(f_, 0.4 * s, y + 0.25 * s, 0.68 * s, y, 0.24 * s, 0.2 * s)
        fingers.append(f_)
    th = P()
    capsule(th, -0.45 * s, 0.6 * s, -0.62 * s, -0.25 * s, 0.26 * s, 0.2 * s)
    fingers.append(th)
    hand = transformed(U(*fingers), m)
    flat(sc, z - 0.0002, hand, look['skin'])
    flat(sc, z - 0.00025, I(hand, transformed(_rect_path(-2 * s, 0.4 * s, 4 * s, 2 * s), m)), look['skin_sh'], a=0.6)
    flat(sc, z - 0.0003, stroke(hand, 0.05 * s), LINE)
    return it
