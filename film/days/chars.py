"""30,000 DAYS: the cast. Paper puppets from the LANTERN engine plus a backlit face sheet
with cut features, so a silhouette can smile, tire, fear and decide."""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lantern'))
from engine import (P, rect, circle, oval, poly, smooth_poly, capsule, mixc, clamp, lerp, puppet, pose, scalec,  # noqa: E402
                    ADULT_HEAD, CHILD_HEAD)

DAYS = 30000


def days_left(age):
    return max(0, int(round(DAYS - age * 365.25)))


# kind, height, hair, extras
AGE = {
    1:  ('small', 150, 'kidhair', ()),
    7:  ('boy', 265, 'kidhair', ('shorts',)),
    16: ('teen', 395, 'hair', ('hoodie',)),
    26: ('son', 430, 'hair', ('bomber',)),
    41: ('son', 430, 'hair', ('coat', 'beard', 'glasses')),
    63: ('father', 420, 'thin', ('cardigan', 'beard', 'glasses')),
    82: ('old', 400, 'thin', ('coat', 'beard', 'glasses', 'cane')),
}

SCARF = '#a8452e'        # the scarf his mother knits: the one colour he keeps all his life
SKIN_LIT = '#e9bd92'
SKIN_DARK = '#2b1d15'
INK = '#120c0a'

# eye shape, brow (front lift, back lift), mouth (curve, open)
FACES = {
    'neutral':    ('almond', (0.00, 0.00), (0.00, 0.0)),
    'tired':      ('half', (-0.05, -0.02), (-0.02, 0.0)),
    'sad':        ('droop', (0.08, -0.04), (-0.06, 0.0)),
    'wide':       ('round', (0.12, 0.10), (0.0, 0.06)),
    'determined': ('almond', (-0.08, 0.03), (0.0, 0.0)),
    'happy':      ('arc', (0.05, 0.04), (0.07, 0.0)),
    'laugh':      ('arc', (0.09, 0.07), (0.06, 0.08)),
    'asleep':     ('closed', (0.0, 0.0), (0.01, 0.0)),
}

PLATE = [(-0.18, 0.78), (0.5, 0.74), (0.78, 0.38), (0.84, 0.2), (0.78, 0.1), (0.86, 0.02), (1.1, -0.2), (1.04, -0.27),
         (0.9, -0.3), (0.91, -0.4), (0.84, -0.47), (0.88, -0.55), (0.8, -0.7), (0.58, -0.82), (0.1, -0.78), (-0.22, -0.3)]
PLATE_KID = [(-0.2, 0.78), (0.5, 0.78), (0.86, 0.38), (0.9, 0.14), (0.88, 0.05), (1.0, -0.13), (0.92, -0.22), (0.92, -0.35),
             (0.86, -0.43), (0.88, -0.5), (0.78, -0.68), (0.52, -0.82), (0.08, -0.8), (-0.24, -0.3)]


def face_paths(j, expr='neutral', kid=False):
    """Face sheet and its cut features, in head-local coordinates."""
    at, r = j['at'], j['hr']
    eye, (bf, bb), (mc, mo) = FACES[expr]
    plate = P()
    smooth_poly(plate, [at(u, v) for (u, v) in (PLATE_KID if kid else PLATE)], 0.3)
    m = P()
    ex, ey = (0.5, 0.15) if not kid else (0.52, 0.12)
    s = 1.3 if kid else 1.15
    if eye == 'almond':
        smooth_poly(m, [at(ex - 0.14 * s, ey), at(ex, ey + 0.075 * s), at(ex + 0.13 * s, ey + 0.01), at(ex, ey - 0.06 * s)], 0.5)
    elif eye == 'half':
        smooth_poly(m, [at(ex - 0.14 * s, ey + 0.01), at(ex + 0.13 * s, ey + 0.02), at(ex, ey - 0.055 * s)], 0.4)
    elif eye == 'droop':
        smooth_poly(m, [at(ex - 0.15 * s, ey - 0.03), at(ex - 0.02, ey + 0.06 * s), at(ex + 0.13 * s, ey + 0.03), at(ex, ey - 0.07 * s)], 0.5)
    elif eye == 'round':
        circle(m, *at(ex, ey + 0.01), 0.1 * s * r)
    elif eye == 'arc':
        q = [at(ex - 0.14 * s, ey - 0.01), at(ex, ey + 0.07 * s), at(ex + 0.13 * s, ey)]
        for a_, b_ in zip(q, q[1:]):
            capsule(m, *a_, *b_, 0.045 * r)
    elif eye == 'closed':
        q = [at(ex - 0.14 * s, ey + 0.02), at(ex, ey - 0.04 * s), at(ex + 0.13 * s, ey + 0.02)]
        for a_, b_ in zip(q, q[1:]):
            capsule(m, *a_, *b_, 0.04 * r)
    # brow: a sliver of paper above the eye
    capsule(m, *at(ex - 0.2 * s, ey + 0.21 + bb), *at(ex + 0.18 * s, ey + 0.23 + bf), 0.075 * r, 0.055 * r)
    # mouth in profile: from the lips back toward the cheek
    mx, my = (0.9, -0.43) if not kid else (0.9, -0.4)
    back = (0.66, -0.43 + mc)
    capsule(m, *at(mx, my), *at(back[0], back[1]), 0.045 * r, 0.035 * r)
    if mo > 0:
        oval(m, *at(0.86, -0.46), 0.08 * r, mo * r)
    return plate, m


def cowlick(p, j):
    at = j['at']
    smooth_poly(p, [at(-0.05, 1.0), at(0.02, 1.34), at(0.24, 1.48), at(0.2, 1.28), at(0.3, 1.04)], 0.35)


def glasses(m, j):
    at, r = j['at'], j['hr']
    c = at(0.52, 0.15)
    ring = P()
    circle(ring, c[0], c[1], 0.19 * r)
    ring.addCircle(c[0], c[1], 0.14 * r, __import__('skia').PathDirection.kCCW)
    m.addPath(ring)
    capsule(m, *at(0.33, 0.18), *at(-0.55, 0.24), 0.04 * r)


def scarf_path(j, wind=0.0, T=0.0, long=1.0):
    nk, sh, f, H = j['neck'], j['sh'], j['f'], j['H']
    p = P()
    cx, cy = (nk[0] + sh[0]) / 2, (nk[1] + sh[1]) / 2
    w = 0.075 * H
    smooth_poly(p, [(cx - w, cy - 0.012 * H), (cx + w, cy - 0.018 * H), (cx + w * 1.05, cy + 0.03 * H), (cx - w * 1.05, cy + 0.036 * H)], 0.4)
    base = (cx - f * w * 0.6, cy + 0.02 * H)
    flut = 0.03 * H * math.sin(T * 7.0) * (0.3 + wind)
    L = (0.2 + 0.08 * wind) * H * long
    tip = (base[0] - f * L * (0.35 + 0.6 * wind), base[1] + L * (0.95 - 0.7 * wind) + flut)
    mid = ((base[0] + tip[0]) / 2 - f * 0.02 * H, (base[1] + tip[1]) / 2 + flut * 0.5)
    smooth_poly(p, [(base[0] - 0.02 * H, base[1]), (base[0] + 0.03 * H, base[1]), (mid[0] + 0.025 * H, mid[1]), (tip[0] + 0.022 * H, tip[1]),
                    (tip[0] - 0.024 * H, tip[1] + 0.01 * H), (mid[0] - 0.025 * H, mid[1])], 0.4)
    return p


def hair_path(j, kind):
    at = j['at']
    p = P()
    if kind == 'kidhair':
        smooth_poly(p, [at(-1.02, -0.1), at(-1.0, 0.6), at(-0.6, 1.04), at(0.05, 1.14), at(0.58, 1.02), at(0.86, 0.7),
                        at(0.7, 0.62), at(0.42, 0.72), at(0.1, 0.58), at(-0.25, 0.62), at(-0.42, 0.2), at(-0.7, -0.35)], 0.3)
    elif kind == 'hair':
        smooth_poly(p, [at(-1.0, -0.42), at(-1.04, 0.4), at(-0.72, 0.95), at(-0.12, 1.16), at(0.42, 1.12), at(0.8, 0.88),
                        at(0.86, 0.66), at(0.6, 0.7), at(0.3, 0.62), at(-0.05, 0.68), at(-0.3, 0.42), at(-0.48, 0.0), at(-0.62, -0.5)], 0.3)
    elif kind == 'thin':
        smooth_poly(p, [at(-1.0, -0.4), at(-1.02, 0.35), at(-0.8, 0.72), at(-0.45, 0.8), at(-0.4, 0.55), at(-0.6, 0.2), at(-0.66, -0.45)], 0.3)
    # the ear
    oval(p, *at(-0.18, -0.02), 0.13 * j['hr'], 0.19 * j['hr'])
    return p


def outfit(p, marks, j, kind, age_kind):
    """Tailored paper over the base body. Returns button positions: holes that glow."""
    sh, hp, f, H = j['sh'], j['hip'], j['f'], j['H']
    ux, uy = sh[0] - hp[0], sh[1] - hp[1]
    L = math.hypot(ux, uy) or 1.0
    ux, uy = ux / L, uy / L
    tl = L / H

    def B(a, b):  # a along the spine from the hip, b toward the facing side (both in H)
        return (hp[0] + ux * a * H + f * b * H, hp[1] + uy * a * H)
    holes = []
    if kind == 'hoodie':
        smooth_poly(p, [B(tl + 0.02, -0.06), B(tl + 0.09, -0.11), B(tl + 0.12, -0.04), B(tl + 0.05, 0.0)], 0.4)
        smooth_poly(p, [B(0.02, 0.06), B(0.12, 0.1), B(0.12, -0.02), B(0.02, -0.04)], 0.3)
        capsule(marks, *B(tl - 0.02, 0.07), *B(tl - 0.13, 0.072), 0.008 * H)
    elif kind == 'bomber':
        smooth_poly(p, [B(-0.02, -0.095), B(tl - 0.02, -0.1), B(tl + 0.02, 0.09), B(-0.02, 0.1)], 0.25)
        holes = [B(tl - 0.08 - 0.07 * k, 0.085) for k in range(3)]
    elif kind == 'coat':
        smooth_poly(p, [B(-0.17, -0.11), B(tl - 0.02, -0.1), B(tl + 0.02, 0.095), B(-0.17, 0.12)], 0.2)
        smooth_poly(p, [B(tl + 0.0, 0.02), B(tl + 0.04, 0.1), B(tl - 0.12, 0.1)], 0.3)
        holes = [B(tl - 0.1 - 0.09 * k, 0.092) for k in range(4)]
    elif kind == 'cardigan':
        smooth_poly(p, [B(-0.06, -0.1), B(tl - 0.02, -0.1), B(tl + 0.02, 0.092), B(-0.06, 0.105)], 0.25)
        holes = [B(tl - 0.08 - 0.07 * k, 0.09) for k in range(4)]
    return holes


def man(sc, z, age, ps, x, ground, facing=1, face='neutral', lit=1.0, wind=0.0, T=0.0, col=INK, scarf=True, hip=None, scale=1.0, alpha=1.0, cane=True):
    """Him, at any age. lit = how much light reaches his face sheet (0 dark, 1 full)."""
    kind, h, hair, extra = AGE[age]
    h *= scale
    path, j = puppet(kind, ps, x, ground, h, facing, (), hip=hip)
    marks_body = P()
    holes = []
    for o in ('hoodie', 'bomber', 'coat', 'cardigan', 'shorts'):
        if o in extra:
            holes = outfit(path, marks_body, j, o, kind)
    if 'cane' in extra and cane:
        hx, hy = j['hand_f']
        capsule(path, hx, hy, hx + facing * 0.05 * h, ground, 0.025 * h)
        capsule(path, hx - facing * 0.04 * h, hy - 0.01 * h, hx + facing * 0.02 * h, hy - 0.025 * h, 0.03 * h)
    body = sc.add(z, path, col, trans=0.05, alpha=alpha)
    if holes and lit > 0.05:
        bh = P()
        for (bx, by) in holes:
            circle(bh, bx, by, 0.009 * h)
        body.emit(bh, '#ffcf8a', a=0.55 * lit, bloom=0.3, sigma=4)
    if scarf and age >= 7:
        sc.add(z - 0.0008, scarf_path(j, wind, T, 1.0 if age < 63 else 0.85), mixc('#2a0f0a', SCARF, 0.25 + 0.75 * lit), trans=0.35, alpha=alpha)
    kidk = kind in ('small', 'boy')
    plate = P()
    prof = CHILD_HEAD if kidk else ADULT_HEAD
    at = j['at']
    smooth_poly(plate, [at(u * 0.97, v * 0.97) for (u, v) in prof], 0.3)
    _pl, marks = face_paths(j, face, kidk)
    if 'glasses' in extra:
        glasses(marks, j)
    top = hair_path(j, hair) if hair else P()
    cowlick(top, j)
    if 'beard' in extra:
        smooth_poly(top, [at(0.25, -0.5), at(0.92, -0.42), at(0.96, -0.74), at(0.66, -1.0), at(0.15, -0.92)], 0.35)
    sc.add(z - 0.0012, plate, mixc(SKIN_DARK, SKIN_LIT, lit), trans=0.55, shadow=False, rim=False, band=False, alpha=alpha)
    sc.add(z - 0.0014, top, col, trans=0.05, shadow=False, rim=True, band=False, alpha=alpha)
    if lit > 0.02:
        sc.add(z - 0.0016, marks, INK, trans=0.0, shadow=False, rim=False, band=False, alpha=alpha * clamp(lit * 3))
    j['item'] = body
    return j


def woman(sc, z, ps, x, ground, h=410, facing=1, face='neutral', lit=1.0, hair='bun', col=INK, shawl=False, hip=None, kind='son', alpha=1.0, T=0.0):
    path, j = puppet(kind, ps, x, ground, h, facing, ('hair',), hip=hip)
    at = j['at']
    if hair == 'bun':
        circle(path, *at(-0.8, 0.72), 0.42 * j['hr'])
    elif hair == 'bob':
        smooth_poly(path, [at(-1.05, -0.5), at(-1.08, 0.6), at(-0.5, 1.12), at(0.4, 1.12), at(0.85, 0.7), at(0.6, 0.55), at(-0.2, 0.6), at(-0.6, -0.55)], 0.35)
    elif hair == 'pigtails':
        circle(path, *at(-0.95, 0.55), 0.35 * j['hr'])
        circle(path, *at(-0.75, 1.0), 0.3 * j['hr'])
    hp, H, f = j['hip'], j['H'], j['f']
    if hip is None:
        smooth_poly(path, [(hp[0] - 0.085 * H, hp[1] - 0.05 * H), (hp[0] + 0.085 * H, hp[1] - 0.05 * H), (hp[0] + 0.11 * H, hp[1] + 0.12 * H),
                           (hp[0] + 0.15 * H, hp[1] + 0.33 * H), (hp[0], hp[1] + 0.35 * H), (hp[0] - 0.15 * H, hp[1] + 0.33 * H), (hp[0] - 0.11 * H, hp[1] + 0.12 * H)], 0.35)
    if shawl:
        sh = j['sh']
        smooth_poly(path, [(sh[0] - 0.13 * H, sh[1] - 0.02 * H), (sh[0] + 0.12 * H, sh[1] - 0.03 * H), (sh[0] + 0.15 * H, sh[1] + 0.16 * H), (sh[0] - 0.16 * H, sh[1] + 0.2 * H)], 0.4)
    body = sc.add(z, path, col, trans=0.05, alpha=alpha)
    plate, marks = face_paths(j, face, kind in ('small', 'boy'))
    if lit > 0.02:
        sc.add(z - 0.0012, plate, mixc(SKIN_DARK, SKIN_LIT, lit), trans=0.55, shadow=False, rim=False, band=False, alpha=alpha)
        sc.add(z - 0.0016, marks, INK, trans=0.0, shadow=False, rim=False, band=False, alpha=alpha)
    j['item'] = body
    return j


def neighbour(sc, z, ps, x, ground, facing=1, face='laugh', lit=1.0, col=INK, alpha=1.0):
    """The old man next door: a brimmed hat and a bow tie; three marbles left and dancing."""
    path, j = puppet('old', ps, x, ground, 400, facing, ('mustache',))
    at, r = j['at'], j['hr']
    smooth_poly(path, [at(-1.25, 0.55), at(-1.2, 0.68), at(-0.7, 0.72), at(-0.62, 1.32), at(0.5, 1.32), at(0.62, 0.72), at(1.3, 0.66), at(1.32, 0.55)], 0.15)
    nk = j['neck']
    poly(path, [(nk[0] - 14, nk[1] - 4), (nk[0], nk[1] + 2), (nk[0] - 14, nk[1] + 10)])
    poly(path, [(nk[0] + 14, nk[1] - 4), (nk[0], nk[1] + 2), (nk[0] + 14, nk[1] + 10)])
    body = sc.add(z, path, col, trans=0.05, alpha=alpha)
    plate, marks = face_paths(j, face)
    if lit > 0.02:
        sc.add(z - 0.0012, plate, mixc(SKIN_DARK, SKIN_LIT, lit), trans=0.55, shadow=False, rim=False, band=False, alpha=alpha)
        sc.add(z - 0.0016, marks, INK, trans=0.0, shadow=False, rim=False, band=False, alpha=alpha)
    j['item'] = body
    return j
