"""SUV and pickup variants of the lightning car (same lofted-body code, different profiles).

car.py reads its profile constants at call time, so a variant is built by swapping them in."""
from contextlib import contextmanager
import bmesh
import bpy
from mathutils import Vector

import car as C
import sets as S


@contextmanager
def variant(**kw):
    old = {k: getattr(C, k) for k in kw}
    for k, v in kw.items():
        setattr(C, k, v)
    try:
        yield
    finally:
        for k, v in old.items():
            setattr(C, k, v)


def _scaled(prof, sx, dz):
    return [(x * sx, z + dz) for x, z in prof]


def build_suv(name, color, coll):
    sx = 2.4 / 2.35
    top = _scaled(C.TOP, sx, 0.17)
    top = [(x, z) for x, z in top if x > -2.0] + [(-2.17, 1.17), (-2.33, 1.06), (-2.4, 0.9)]
    cab = [(1.05 * sx, 0.93 + 0.17), (0.62, 1.42), (0.25, 1.66), (-0.3, 1.71), (-1.2, 1.71), (-1.8, 1.69),
           (-1.98, 1.6), (-2.06, 1.42), (-2.1, 1.18)]
    with variant(L2=2.4, W2=0.96, TOP=top, BOT=_scaled(C.BOT, sx, 0.1), CAB_TOP=cab, CAB_F=1.05 * sx,
                 CAB_R=-2.1, ROOF_F=0.3, ROOF_R=-1.96, AXLE=1.42):
        car = C.build_car(name, color, coll)
    car["root"].scale = (1.07,) * 3
    return car


def build_pickup(name, color, coll):
    sx = 2.75 / 2.35
    top = [(x * sx, z + 0.2) for x, z in C.TOP if x > 0.3] + [(-0.9, 1.16), (-1.6, 1.16), (-2.5, 1.16), (-2.68, 1.12),
                                                                (-2.75, 0.95)]
    cab = [(1.05 * sx, 0.93 + 0.2), (0.75, 1.42), (0.35, 1.68), (-0.2, 1.72), (-0.55, 1.71), (-0.72, 1.6),
           (-0.8, 1.38), (-0.84, 1.17)]
    with variant(L2=2.75, W2=0.98, TOP=top, BOT=_scaled(C.BOT, sx, 0.12), CAB_TOP=cab, CAB_F=1.05 * sx,
                 CAB_R=-0.84, ROOF_F=0.35, ROOF_R=-0.74, B_PILLAR=-0.66, AXLE=1.68):
        car = C.build_car(name, color, coll)
        _cut_bed(car, -2.62, -0.98)
    car["root"].scale = (1.06,) * 3
    return car


def _cut_bed(car, x0, x1):
    """Open the cargo bed: remove the body top behind the cab and add a floor."""
    body = car["body"]
    me = body.data
    bm = bmesh.new(); bm.from_mesh(me)
    kill = []
    for fa in bm.faces:
        c = fa.calc_center_median()
        if x0 < c.x < x1 and c.z > C.top(c.x) - 0.07 and abs(c.y) < C.half_w(c.x) - 0.07:
            kill.append(fa)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(me); bm.free()
    floor = S.box(car["root"].name + "BedFloor", (x0, -0.86, 0.62), (x1, 0.86, 0.66), car["mats"]["trim"], car["coll"], 0.0)
    floor.parent = car["root"]
    for side in (1, -1):
        wall = S.box(car["root"].name + f"BedWall{side}", (x0, side * 0.86 - 0.02, 0.62), (x1, side * 0.86 + 0.02, 1.14),
                     car["mats"]["trim"], car["coll"], 0.0)
        wall.parent = car["root"]
    for x in (x0, x1):
        wall = S.box(car["root"].name + f"BedEnd{x}", (x - 0.02, -0.86, 0.62), (x + 0.02, 0.86, 1.14), car["mats"]["trim"],
                     car["coll"], 0.0)
        wall.parent = car["root"]
