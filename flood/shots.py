"""Performance, vehicle motion, water level, effects timing, cameras and visibility for the flood short.

Every shot is keyed on its own (hard cuts); keys that would interpolate across a cut are isolated by
scene.py. Vehicles are keyed every frame from motion functions; the characters are parented to anchors
that are keyed to the car's transform in the shots where they sit in it (poses are in car space).
"""
import math, random
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

import anim, human
from anim import V, rot, spine, head, shoulders, fingers, legs_stand, arms_hang, hand_to, foot_to, HIP_H
from posing import aim
import car as C
import storm as ST
import valley as VL
import sets as S
from timeline import FPS, END, f, s, e, w, SHOTS, SHOT, CUT_FRAMES

ROAD0 = VL.road_z(VL.CAR_X)
DRAFT = 0.33                       # how deep a floating sedan sits below the waterline
HIDE = Vector((0, 3000, -500))     # parking spot for vehicles that are not in a shot


def T(name, u):
    t0, t1, _ = SHOT[name]
    return t0 + (t1 - t0) * u


def ends(name):
    t0, t1, _ = SHOT[name]
    return f(t0), f(t1) - 1


def F(name, u):
    a, b = ends(name)
    return a + int(round((b - a) * u))


def shot_at(fr):
    t = (fr - 1) / FPS
    cur = SHOTS[0]
    for sh in SHOTS:
        if f(sh[1]) <= fr:
            cur = sh
    return cur[0], cur[3]


def _ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def _out(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 2


def lerp(a, b, u):
    return Vector(a).lerp(Vector(b), u)


# ============================================================================= water level per shot
DEPTH = {  # depth over the road at CAR_X: value or (start, end)
    "aerial_approach": 0.24, "water_flow": 0.24, "conv_cross": 0.24, "driver_watch": 0.25,
    "rise_gauge": (0.2, 0.62), "murky": 0.62, "depth_reveal": 0.62,
    "six_cut": 0.2, "underbody": 0.2, "stall_dash": 0.24, "foot_cut": (0.22, 0.38), "float_wide": 0.42,
    "air_box": 0.42, "air_box2": 0.42, "lift_arrows": (0.42, 0.45), "lift_close": 0.45, "tire_lift": (0.45, 0.5),
    "current_cut": 0.52, "swept": 0.6, "suv": 0.66, "truck": 0.66, "washout_surface": 0.5, "washout_cut": 0.5,
    "stranded": 0.72, "stranded_close": 0.72, "sign": 0.45, "turn_around": 0.45, "wade": 0.55, "high_ground": 0.58,
    "long_way": 0.5, "scenic": 0.5, "scenic_wide": 0.5,
}


def level_at(name, u):
    d = DEPTH[name]
    if isinstance(d, tuple):
        d = d[0] + (d[1] - d[0]) * u
    return ROAD0 + d


# ============================================================================= vehicle motion
def _float(x, y, W, t, draft=DRAFT, bob=1.0, seed=0.0):
    """Floating height: never below the road/ground, bobbing once afloat."""
    gz = VL.road_z(x) if abs(y) < VL.SHOULDER else VL.ground(x, y)
    zf = W - draft
    afloat = max(0.0, min(1.0, (zf - gz) / 0.05))
    b = afloat * bob
    z = max(gz, zf) + b * 0.015 * math.sin(2 * math.pi * t / 1.7 + seed)
    roll = b * math.radians(1.3) * math.sin(2 * math.pi * t / 2.3 + seed)
    pitch = b * math.radians(0.9) * math.sin(2 * math.pi * t / 1.9 + 1 + seed)
    return z, roll, pitch


def hero_xf(name, u, fr):
    """Hero sedan: (location, euler) or None (hidden)."""
    t = (fr - 1) / FPS
    W = level_at(name, u)
    if name == "aerial_approach":
        return VL.on_road(-52 + 20 * u, VL.LANE_Y)
    if name == "water_flow":
        return VL.on_road(-32 + 5.5 * _out(u), VL.LANE_Y)
    if name in ("conv_cross", "driver_watch", "rise_gauge", "murky", "depth_reveal"):
        return VL.on_road(-26.5, VL.LANE_Y)
    if name in ("six_cut", "underbody", "stall_dash", "foot_cut", "float_wide", "air_box", "air_box2", "lift_arrows",
                "lift_close", "tire_lift"):
        x, y = VL.CAR_X, VL.LANE_Y
        if name == "tire_lift":
            y -= 0.12 * u
        z, roll, pitch = _float(x, y, W, t)
        return Vector((x, y, z)), (roll, pitch, 0.0)
    if name == "current_cut":
        x, y = VL.CAR_X, VL.LANE_Y - 0.12 - 0.75 * _ease(u)
        z, roll, pitch = _float(x, y, W, t)
        return Vector((x, y, z)), (roll + math.radians(4.0 * _ease(u)), pitch, math.radians(-3 * u))
    if name == "swept":
        k = _ease(u * 0.9 + 0.1 * u * u)
        x = VL.CAR_X + 2.5 * k; y = VL.LANE_Y - 0.9 - 10.5 * k
        z, roll, pitch = _float(x, y, W, t, bob=1.6)
        return Vector((x, y, z)), (roll + math.radians(6 * math.sin(u * 5)), pitch, math.radians(-3 - 38 * k))
    if name == "sign":
        return VL.on_road(-33 + 7.5 * _out(min(1.0, u * 1.25)), VL.LANE_Y)
    if name == "turn_around":
        k = _ease(u)
        loc, r = VL.on_road(-25.5 - 3.2 * k, VL.LANE_Y + 1.6 * k * k, -38 * k)
        return loc, r
    if name in ("wade", "high_ground"):
        x, y = VL.CAR_X + 1.2, VL.LANE_Y - 1.3
        z, roll, pitch = _float(x, y, W, t, bob=0.6, seed=1.0)
        return Vector((x, y, z)), (roll + math.radians(3), pitch, math.radians(14))
    if name == "long_way":
        return VL.on_road(-64 - 21 * u, -VL.LANE_Y, 180.0)
    return None


def conv_xf(name, u, fr):
    t = (fr - 1) / FPS
    W = level_at(name, u)
    if name == "aerial_approach":
        return VL.on_road(-21 + 10 * u, VL.LANE_Y)
    if name == "water_flow":
        return VL.on_road(-11 + 8 * u, VL.LANE_Y)
    if name == "conv_cross":
        return VL.on_road(-7 + 11.5 * _out(u), VL.LANE_Y)
    if name == "driver_watch":
        return VL.on_road(13 + 6 * u, VL.LANE_Y)
    if name in ("scenic", "scenic_wide"):
        tt = T(name, u) - SHOT["scenic"][0]
        x, y = 1.5 + 0.12 * tt, -78.0 - 0.55 * tt
        z, roll, pitch = _float(x, y, W, t, draft=0.5, bob=0.7, seed=2.0)
        return Vector((x, y, z)), (roll + math.radians(2.5), pitch - math.radians(1.5), math.radians(158 + 3.5 * tt))
    return None


def suv_xf(name, u, fr):
    t = (fr - 1) / FPS
    W = level_at(name, u)
    if name == "suv":
        x, y = 2.0 - 1.4 * u, -21.0 - 8.0 * u
        z, roll, pitch = _float(x, y, W, t, draft=0.42, bob=2.0)
        return Vector((x, y, z)), (roll + math.radians(4), pitch, math.radians(38 + 26 * u))
    if name in ("stranded", "stranded_close"):
        z, roll, pitch = _float(-4.0, -58.0, W, t, draft=0.95, bob=0.3)
        return Vector((-4.0, -58.0, z)), (math.radians(7) + roll, math.radians(6) + pitch, math.radians(112))
    return None


def truck_xf(name, u, fr):
    t = (fr - 1) / FPS
    W = level_at(name, u)
    if name == "truck":
        x, y = 6.5 - 2.0 * u, -33.0 - 9.0 * u
        z, roll, pitch = _float(x, y, W, t, draft=0.46, bob=2.0, seed=0.7)
        return Vector((x, y, z)), (roll - math.radians(5), pitch, math.radians(-18 - 30 * u))
    if name in ("stranded", "stranded_close"):
        z, roll, pitch = _float(6.0, -65.0, W, t, draft=0.9, bob=0.3, seed=0.4)
        return Vector((6.0, -65.0, z)), (math.radians(-6) + roll, math.radians(-5) + pitch, math.radians(64))
    return None


# ============================================================================= the rig
class Rig:
    def __init__(self, **kw):
        self.__dict__.update(kw)


# ============================================================================= poses (car space)
WHEEL_C = Vector((0.47, C.DRIVER_Y, 0.86))
WHEEL_UP = Vector((0.469, 0, 0.883))
SEAT_H = Vector((C.SEAT_X + 0.02, C.DRIVER_Y, 0.47))


def wheel_point(clock_deg):
    a = math.radians(clock_deg)
    return WHEEL_C + (WHEEL_UP * math.cos(a) + Vector((0, 1, 0)) * math.sin(a)) * 0.185


def seated(ch, arm, lean=-14.0, look=(8.0, 0.0), tense=0.0, hands="wheel", twist=0.0, steer=0.0):
    spine(arm, lean + 10 * tense, twist, 0)
    shoulders(arm, 0.28 * tense, 0.02)
    for side, sg in (("Left", 1), ("Right", -1)):
        knee = Vector((0.27, C.DRIVER_Y + sg * 0.11, 0.6))
        ankle = Vector((0.6, C.DRIVER_Y + sg * 0.13, 0.36))
        foot_to(arm, side, ch.to_local(ankle), pole=(sg * 0.1, -1.0, 0.6), foot_dir=(0, -1, -0.5))
    if hands == "wheel":
        for side, sg, clock in (("Left", 1, 62 + 8 * tense + steer), ("Right", -1, -62 - 8 * tense + steer)):
            grip = wheel_point(clock)
            wrist = grip + Vector((-0.1, sg * 0.01, -0.06))
            hand_to(arm, side, ch.to_local(wrist), pole=(sg * 0.9, 0.4, -1.0),
                    hand_dir=ch.dir_local(Vector((0.6, -sg * 0.2, 0.75))))
            pb = arm.pose.bones["mixamorig:" + side + "Hand"]
            pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((0, 1, 0), math.radians(sg * 90))
        fingers(arm, 2.3)
    elif hands == "lap":
        for side, sg in (("Left", 1), ("Right", -1)):
            wrist = Vector((0.12, C.DRIVER_Y + sg * 0.12, 0.6))
            hand_to(arm, side, ch.to_local(wrist), pole=(sg * 1.0, 0.2, -1.0),
                    hand_dir=ch.dir_local(Vector((0.8, -sg * 0.3, -0.3))))
        fingers(arm, 0.5)
    elif hands == "back":      # right hand on the passenger headrest, looking back while reversing
        wrist = Vector((C.SEAT_X - 0.4, -C.DRIVER_Y + 0.05, 1.12))
        hand_to(arm, "Right", ch.to_local(wrist), pole=(-0.3, -1.0, 0.2), hand_dir=ch.dir_local(Vector((0, -1, 0.1))))
        grip = wheel_point(60)
        hand_to(arm, "Left", ch.to_local(grip + Vector((-0.1, 0.01, -0.06))), pole=(0.9, 0.4, -1.0),
                hand_dir=ch.dir_local(Vector((0.6, -0.2, 0.75))))
        pb = arm.pose.bones["mixamorig:LeftHand"]
        pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion((0, 1, 0), math.radians(90))
        fingers(arm, 1.6)
    head(arm, look[0] - 22 * tense, look[1], 0)


def standing(ch, arm, kind="hips", sway=0.0, look=(5.0, 0.0)):
    legs_stand(arm, 0.08)
    spine(arm, -6, sway, 0)
    shoulders(arm, 0.05, -0.05)
    if kind == "hips":
        for side, sg in (("Left", 1), ("Right", -1)):
            hand_to(arm, side, (sg * 0.19, 0.02, 1.0), pole=(sg * 1.0, 0.7, 0.0), hand_dir=(-sg * 0.4, 0.5, -1))
        fingers(arm, 0.6)
    else:
        arms_hang(arm, 0.0)
        fingers(arm, 0.4)
    head(arm, look[0], look[1], 0)


HOOD_H = Vector((1.72, 0.0, 0.93))   # convertible guy's hips sitting on the hood


def on_hood(ch, arm, look=(0.0, 0.0), lean=4.0, shake=0.0):
    """Sitting on the hood facing forward, legs over the front, arms crossed."""
    spine(arm, lean, shake, 0)
    shoulders(arm, 0.12, 0.05)
    for side, sg in (("Left", 1), ("Right", -1)):
        ankle = Vector((2.43, sg * 0.17, 0.5))
        foot_to(arm, side, ch.to_local(ankle), pole=(sg * 0.15, -1.0, 0.3), foot_dir=(0, -1, -0.4))
    for side, sg in (("Left", 1), ("Right", -1)):
        wrist = Vector((1.95, -sg * 0.13, 1.3 - 0.03 * sg))
        hand_to(arm, side, ch.to_local(wrist), pole=(sg * 1.0, -0.4, -0.6),
                hand_dir=ch.dir_local(Vector((0.1, -sg * 1.0, 0.05))))
    fingers(arm, 0.55)
    head(arm, look[0], look[1], 0)


class Perf:
    def __init__(self, ch):
        self.ch = ch
        self.arm = ch.arm

    def pose(self, fr, loc, body, yaw=90.0, pivot=None):
        self.ch.begin(fr)
        self.ch.place(fr, loc, yaw, 0, 0, pivot)
        body(self.ch, self.arm)
        self.ch.key(fr)

    def seat(self, fr, **kw):
        self.pose(fr, SEAT_H, lambda ch, arm: seated(ch, arm, **kw), 90.0, HIP_H)

    def hood(self, fr, **kw):
        self.pose(fr, HOOD_H, lambda ch, arm: on_hood(ch, arm, **kw), 90.0, HIP_H)

    def stand(self, fr, loc, yaw, **kw):
        self.pose(fr, loc, lambda ch, arm: standing(ch, arm, **kw), yaw)

    def face(self, fr, **wts):
        self.ch.face(fr, **wts)


# ============================================================================= keying helpers
def key_xf(obj, fr, xf):
    if xf is None:
        obj.location = HIDE
        obj.rotation_euler = (0, 0, 0)
    else:
        obj.location = xf[0]
        obj.rotation_euler = xf[1]
    obj.keyframe_insert("location", frame=fr)
    obj.keyframe_insert("rotation_euler", frame=fr)


def key_motion(rig):
    """Every vehicle (and the anchors riding in them) keyed every frame."""
    hero, conv, suv, truck = rig.car, rig.conv, rig.suv, rig.truck
    for o in (hero["root"], conv["root"], suv["root"], truck["root"], rig.anchor, rig.anchor2):
        o.rotation_mode = "XYZ"
    last = None
    dist = 0.0
    for fr in range(1, f(END) + 1):
        name, st = shot_at(fr)
        a, b = ends(name)
        u = (fr - a) / max(1, b - a)
        hx = hero_xf(name, u, fr)
        key_xf(hero["root"], fr, hx)
        cx = conv_xf(name, u, fr)
        key_xf(conv["root"], fr, cx)
        key_xf(suv["root"], fr, suv_xf(name, u, fr))
        key_xf(truck["root"], fr, truck_xf(name, u, fr))
        # anchors: in the car, except where the character stands outside
        if name in ("wade", "high_ground"):
            pass                                  # keyed by the performance
        else:
            key_xf(rig.anchor, fr, hx)
        if name not in ("scenic", "scenic_wide"):
            key_xf(rig.anchor2, fr, cx)
        else:
            key_xf(rig.anchor2, fr, cx)
        # wheels: rolling while driving, idling while afloat
        if hx is not None:
            if last is not None and last[0] == name:
                dist += (hx[0] - last[1]).length * (1 if name != "turn_around" else -1)
            if name in ("foot_cut", "float_wide", "lift_close", "tire_lift", "current_cut", "swept", "air_box",
                        "air_box2", "lift_arrows"):
                dist += 0.012
            last = (name, hx[0].copy())
        for wh in hero["wheels"]:
            wh["root"].rotation_euler = (0, dist / C.WHEEL_R, 0)
            wh["root"].keyframe_insert("rotation_euler", frame=fr)
    for o in (hero["root"], conv["root"], suv["root"], truck["root"], rig.anchor, rig.anchor2) + tuple(
            wh["root"] for wh in hero["wheels"]):
        ST.set_interp(o, "LINEAR")


def key_level(rig):
    lv = rig.valley.level
    for name, t0, t1, st in SHOTS:
        a, b = ends(name)
        for fr, u in ((a, 0.0), (b, 1.0)):
            lv.location = (0, 0, level_at(name, u)); lv.keyframe_insert("location", frame=fr, index=2)
    ST.set_interp(lv, "LINEAR")


def key_foam(rig):
    """The foam ring follows whichever vehicle is in the water in each shot."""
    fo = rig.valley.foam
    fo.rotation_mode = "XYZ"
    who = {"aerial_approach": "conv", "water_flow": "conv", "conv_cross": "conv", "driver_watch": None,
           "suv": "suv", "truck": "truck", "stranded": "suv", "stranded_close": "suv", "scenic": "conv",
           "scenic_wide": "conv", "sign": None, "turn_around": None, "long_way": None, "rise_gauge": None,
           "murky": None, "depth_reveal": None, "washout_surface": None, "washout_cut": None}
    fn = {"hero": hero_xf, "conv": conv_xf, "suv": suv_xf, "truck": truck_xf}
    for fr in range(1, f(END) + 1):
        name, st = shot_at(fr)
        a, b = ends(name)
        u = (fr - a) / max(1, b - a)
        k = who.get(name, "hero")
        xf = fn[k](name, u, fr) if k else None
        if xf is None:
            fo.location = (0, 900, 0); fo.rotation_euler = (0, 0, 0)
        else:
            fo.location = (xf[0].x, xf[0].y, 0.0); fo.rotation_euler = (0, 0, xf[1][2])
        fo.keyframe_insert("location", frame=fr); fo.keyframe_insert("rotation_euler", frame=fr)
    ST.set_interp(fo, "LINEAR")


# ============================================================================= performance + effects
def perform(rig):
    sc = bpy.context.scene
    p = Perf(rig.ch)
    q = Perf(rig.ch2)
    key_motion(rig)
    key_level(rig)
    key_foam(rig)

    # ---- hero in the car
    def seat_shot(name, a_kw, b_kw, a_face, b_face, mid=None):
        a, b = ends(name)
        p.seat(a, **a_kw); p.face(a, **a_face)
        if mid:
            m = F(name, mid[0]); p.seat(m, **mid[1]); p.face(m, **mid[2])
        p.seat(b, **b_kw); p.face(b, **b_face)

    seat_shot("aerial_approach", {}, {"look": (6, 4)}, {"calm": 0.5}, {"calm": 0.4})
    seat_shot("water_flow", {}, {}, {"calm": 0.4}, {"calm": 0.4})
    seat_shot("conv_cross", {"look": (6, 0)}, {"look": (6, 2)}, {"calm": 0.3}, {"calm": 0.3})
    seat_shot("driver_watch", {"look": (8, -4)}, {"look": (6, 2), "lean": -16}, {"worry": 0.3},
              {"smug": 0.9}, mid=(0.45, {"look": (8, 0)}, {"calm": 0.5}))
    for name in ("rise_gauge", "murky", "depth_reveal"):
        seat_shot(name, {"look": (12, 0)}, {"look": (12, 2)}, {"smug": 0.6}, {"smug": 0.6})
    for name in ("six_cut", "underbody"):
        seat_shot(name, {"look": (10, 0)}, {"look": (14, -6)}, {"calm": 0.5}, {"worry": 0.4})
    seat_shot("stall_dash", {"look": (-12, -8), "tense": 0.2}, {"look": (-16, -12), "tense": 0.5},
              {"worry": 0.6}, {"shock": 1.0}, mid=(0.5, {"look": (-14, -10), "tense": 0.3}, {"shock": 0.7}))
    seat_shot("foot_cut", {"tense": 0.4, "look": (4, 10)}, {"tense": 0.6, "look": (0, 20)}, {"worry": 0.8}, {"shock": 0.8})
    seat_shot("float_wide", {"tense": 0.6, "look": (2, 25)}, {"tense": 0.7, "look": (0, 35)}, {"worry": 0.9}, {"panic": 0.7})
    for name in ("air_box", "air_box2", "lift_arrows", "lift_close", "tire_lift"):
        seat_shot(name, {"tense": 0.6, "look": (0, 20)}, {"tense": 0.7, "look": (-2, 26)}, {"worry": 0.9}, {"worry": 1.0})
    seat_shot("current_cut", {"tense": 0.9, "look": (0, 40)}, {"tense": 1.0, "look": (-4, 50)}, {"panic": 0.8}, {"panic": 1.0})
    seat_shot("swept", {"tense": 1.0, "look": (0, 30)}, {"tense": 1.0, "look": (-6, -10)}, {"panic": 1.0}, {"panic": 1.0})
    seat_shot("sign", {"look": (6, 0)}, {"look": (10, -14), "lean": -16}, {"calm": 0.5}, {"calm": 0.9})
    seat_shot("turn_around", {"hands": "back", "twist": -18, "look": (4, -70)}, {"hands": "back", "twist": -22, "look": (2, -80)},
              {"smug": 0.5}, {"smug": 0.9})
    seat_shot("long_way", {"look": (6, 0), "lean": -16}, {"look": (6, 4), "lean": -16}, {"smug": 0.6}, {"smug": 0.8})
    # hero is out of the picture elsewhere: park the pose
    for name in ("suv", "truck", "washout_surface", "washout_cut", "stranded", "stranded_close", "scenic", "scenic_wide"):
        a, _ = ends(name)
        p.seat(a); p.face(a, calm=0.3)

    # ---- hero wading out and on high ground (anchor in world space)
    anc = rig.anchor
    a, b = ends("wade")
    W = level_at("wade", 0)
    start = Vector((VL.CAR_X + 0.2, VL.LANE_Y + 0.15, VL.road_z(VL.CAR_X)))
    for fr in (a, b):
        anc.location = start; anc.rotation_euler = (0, 0, math.pi); key_anchor(anc, fr)
    t0 = (a - 1) / FPS
    for fr in range(a, b + 1, 2):
        anim.apply_walk(rig.ch, fr, (fr - 1) / FPS, 0.0, t0, speed=0.85, period=1.25, y=0.0, yaw=90.0)
        p.face(fr, worry=0.9) if (fr - a) % 12 == 0 else None
    p.face(a, worry=1.0); p.face(b, worry=0.8)
    a, b = ends("high_ground")
    spot = Vector((-42.0, 5.2, VL.ground(-42.0, 5.2)))
    for fr in (a, b):
        anc.location = spot; anc.rotation_euler = (0, 0, 0); key_anchor(anc, fr)
    p.stand(a, (0, 0, 0), 106, kind="hips", look=(-12, 0)); p.face(a, exhale=0.9)
    p.stand(F("high_ground", 0.5), (0, 0, 0), 106, kind="hips", look=(-14, 6), sway=4); p.face(F("high_ground", 0.5), calm=0.8)
    p.stand(b, (0, 0, 0), 106, kind="hips", look=(-12, 8), sway=6); p.face(b, smug=0.5, calm=0.5)
    human.set_wet(rig.ch_data, 1, -1.0)
    human.set_wet(rig.ch_data, ends("wade")[0], 0.62)
    human.set_wet(rig.ch_data, ends("high_ground")[1] + 1, -1.0)

    # ---- the convertible guy
    for name in ("aerial_approach", "water_flow", "conv_cross", "driver_watch"):
        a, b = ends(name)
        q.seat(a, look=(6, 0)); q.seat(b, look=(6, 0), lean=-16)
        q.face(a, smug=0.7); q.face(b, smug=0.9)
    a, b = ends("scenic")
    q.hood(a, look=(-6, -8)); q.face(a, worry=0.4, smug=0.0)
    q.hood(F("scenic", 0.45), look=(-8, 10), shake=6); q.face(F("scenic", 0.45), worry=0.6)
    q.hood(F("scenic", 0.75), look=(-6, -12), shake=-6); q.face(F("scenic", 0.75), worry=0.5)
    q.hood(b, look=(-4, 0)); q.face(b, worry=0.3, calm=0.6)
    a, b = ends("scenic_wide")
    q.hood(a, look=(-4, 0)); q.hood(b, look=(-6, 14)); q.face(a, calm=0.6); q.face(b, calm=0.7, blink=0.0)
    for name in [n for n, *_ in SHOTS if n not in ("aerial_approach", "water_flow", "conv_cross", "driver_watch",
                                                    "scenic", "scenic_wide")]:
        a, _ = ends(name)
        q.seat(a); q.face(a, calm=0.3)

    # ---- world mode + exposure per shot
    expo = {"storm": 0.55, "cutY": 0.6, "cutX": 0.6, "xray": 0.45, "evening": -0.15}
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        rig.world.set_mode(fr, st == "evening")
        sc.view_settings.exposure = expo[st]
        sc.view_settings.keyframe_insert("exposure", frame=fr)
        ST.key_value(rig.valley.foam_k.outputs[0], fr, 1.0)

    # ---- hero lights: headlights on in the storm, the dash dies in stall_dash
    m = rig.car["mats"]
    head_s = m["head"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    gauge_s = m["gauges"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    a, b = ends("stall_dash")
    die = F("stall_dash", 0.5)
    ST.key_value(gauge_s, 1, 6.0); ST.key_value(gauge_s, die - 6, 6.0)
    for i, v in enumerate([2.0, 7.0, 0.5, 5.0, 0.0, 3.0, 0.0]):
        ST.key_value(gauge_s, die - 5 + i, v)
    ST.key_value(gauge_s, die + 3, 0.0)
    ST.key_value(gauge_s, ends("sign")[0], 6.0)          # reality again: everything works
    ST.key_value(head_s, 1, 6.0); ST.key_value(head_s, die, 6.0); ST.key_value(head_s, die + 1, 0.4)
    ST.key_value(head_s, die + 3, 0.0)
    ST.key_value(head_s, ends("sign")[0], 6.0)
    ST.key_value(head_s, ends("wade")[0], 0.0); ST.key_value(head_s, ends("long_way")[0], 6.0)
    ck = rig.check_engine.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    ST.key_value(ck, 1, 0.0); ST.key_value(ck, die - 2, 0.0); ST.key_value(ck, die - 1, 8.0)
    ST.key_value(ck, ends("sign")[0], 0.0)
    for lamp in rig.car["lamps"]:
        lamp.data.keyframe_insert("energy", frame=1)
        e0 = lamp.data.energy
        lamp.data.keyframe_insert("energy", frame=die)
        lamp.data.energy = 0.0; lamp.data.keyframe_insert("energy", frame=die + 1)
        lamp.data.energy = e0; lamp.data.keyframe_insert("energy", frame=ends("sign")[0])
        lamp.data.energy = 0.0; lamp.data.keyframe_insert("energy", frame=ends("wade")[0])
        lamp.data.energy = e0 if "Tail" not in lamp.name else e0; lamp.data.keyframe_insert("energy", frame=ends("long_way")[0])
    for idb in [m["head"].node_tree, m["gauges"].node_tree, rig.check_engine.node_tree] + [l.data for l in rig.car["lamps"]]:
        ST.set_interp(idb, "CONSTANT")
    # hazards: stranded vehicles blink, the floating ones too
    for car in (rig.suv, rig.truck):
        hz = car["mats"]["hazard"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
        on = True
        for fr in range(ends("suv")[0], f(END), 9):
            ST.key_value(hz, fr, 9.0 if on else 0.0); on = not on
        ST.set_interp(car["mats"]["hazard"].node_tree, "CONSTANT")
        for lamp in car["lamps"]:
            if "Dash" in lamp.name:
                lamp.data.energy = 0.0
    for lamp in rig.conv["lamps"]:
        lamp.data.keyframe_insert("energy", frame=1)
        e0 = lamp.data.energy
        lamp.data.energy = 0.0; lamp.data.keyframe_insert("energy", frame=ends("scenic")[0])
        ST.set_interp(lamp.data, "CONSTANT")
    cm = rig.conv["mats"]
    ST.key_value(cm["head"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"], ends("scenic")[0], 0.0)
    ST.set_interp(cm["head"].node_tree, "CONSTANT")
    # wipers
    tilt = Quaternion((0, 1, 0), math.radians(-32))
    for piv in rig.car["wipers"]:
        piv.rotation_mode = "QUATERNION"
        for fr in range(1, f(SHOT["depth_reveal"][1]), 2):
            ph = (fr - 1) / FPS * 2 * math.pi / 1.4
            piv.rotation_quaternion = tilt @ Quaternion((0, 0, 1), math.radians(4 + 78 * (0.5 - 0.5 * math.cos(ph))))
            piv.keyframe_insert("rotation_quaternion", frame=fr)
        piv.rotation_quaternion = tilt @ Quaternion((0, 0, 1), math.radians(4))
        piv.keyframe_insert("rotation_quaternion", frame=f(SHOT["depth_reveal"][1]) + 1)

    # ---- arrows and the box of air
    ab = rig.air_k
    for name, vals in (("air_box", (0.0, 1.0)), ("air_box2", (1.0, 1.3)), ("lift_arrows", (0.9, 0.9))):
        a, b = ends(name)
        ST.key_value(ab, a, vals[0]); ST.key_value(ab, F(name, 0.4), vals[1]); ST.key_value(ab, b, vals[1])
    for i, o in enumerate(rig.up_arrows):
        for name in ("lift_arrows", "lift_close"):
            a, b = ends(name)
            g0 = a + 4 + i * 3 if name == "lift_arrows" else a
            o.scale = (1, 1, 0.001) if name == "lift_arrows" else (1, 1, 1); o.keyframe_insert("scale", frame=a)
            o.scale = (1, 1, 0.001) if name == "lift_arrows" else (1, 1, 1); o.keyframe_insert("scale", frame=g0)
            o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=g0 + 10)
            o.scale = (1, 1, 1.12); o.keyframe_insert("scale", frame=b)
    for i, o in enumerate(rig.side_arrows):
        a, b = ends("current_cut")
        g0 = a + 3 + i * 3
        o.scale = (1, 1, 0.001); o.keyframe_insert("scale", frame=a); o.keyframe_insert("scale", frame=g0)
        o.scale = (1, 1, 1); o.keyframe_insert("scale", frame=g0 + 8)
        o.scale = (1, 1, 1.1); o.keyframe_insert("scale", frame=b)

    # ---- spray: the convertible's bow wave, the hero's car being swept, the SUV/truck
    spray = rig.spray_mat
    fx = rig.fx
    def bow(name, xf_fn, every=3, n=7, side_bias=1.0, tag="Bow", up=2.2):
        a, b = ends(name)
        k = 0
        for fr in range(a, b - 2, every):
            u = (fr - a) / max(1, b - a)
            xf = xf_fn(name, u, fr)
            if xf is None:
                continue
            loc, r = xf
            yaw = r[2]
            if VL.road_z(loc.x + 2.0 * math.cos(yaw)) > level_at(name, u) - 0.03:
                continue
            fwd = Vector((math.cos(yaw), math.sin(yaw), 0))
            left = Vector((-math.sin(yaw), math.cos(yaw), 0))
            for sd in (1, -1):
                origin = loc + fwd * 2.25 + left * sd * 0.8
                origin.z = level_at(name, u) + 0.02
                VL.spray_drops(f"{tag}{name}{k}", origin, fr, n, spray, fx, speed=(1.4, 3.6), life=(6, 12),
                               bias=(fwd * 0.6 + left * sd * 0.8 + Vector((0, 0, up))), spread=0.45, seed=k * 7 + sd)
                k += 1
    bow("conv_cross", conv_xf, every=2, n=14)
    bow("aerial_approach", conv_xf, every=3, n=8)
    a, b = ends("swept")
    for k, fr in enumerate(range(a, b - 4, 4)):
        u = (fr - a) / max(1, b - a)
        loc, r = hero_xf("swept", u, fr)
        origin = loc + Vector((0.0, 0.9, 0)); origin.z = level_at("swept", u) + 0.05
        VL.spray_drops(f"Slam{k}", origin, fr, 16, spray, fx, speed=(1.5, 3.8), life=(6, 12),
                       bias=Vector((0, 0.3, 1.6)), spread=0.6, seed=100 + k, size=(0.02, 0.05))
    a, b = ends("current_cut")
    for k, fr in enumerate(range(a, b - 4, 5)):
        origin = Vector((VL.CAR_X + 1.8, VL.LANE_Y + 0.85, level_at("current_cut", 0.5) + 0.03))
        VL.spray_drops(f"Pile{k}", origin, fr, 8, spray, fx, speed=(0.8, 2.0), life=(6, 10),
                       bias=Vector((0, -0.3, 1.5)), spread=0.5, seed=200 + k)
    return p


def key_anchor(anc, fr):
    anc.keyframe_insert("location", frame=fr)
    anc.keyframe_insert("rotation_euler", frame=fr)


# ============================================================================= cameras
def _look(loc, tgt, roll=0.0):
    q = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll:
        e.rotate_axis("Z", math.radians(roll))
    return e


def cam_plan():
    """name -> (lens, fn(u, fr) -> (loc, tgt), fstop, shake, roll)."""
    def hero(name, u, fr):
        return hero_xf(name, u, fr)[0]

    def conv(name, u, fr):
        return conv_xf(name, u, fr)[0]

    def lvl(name, u=0.5):
        return level_at(name, u)
    cx, ly = VL.CAR_X, VL.LANE_Y
    gauge = Vector(GAUGE[0])
    plan = {
        "aerial_approach": (22, lambda u, fr: (hero("aerial_approach", u, fr) + lerp((-13, 9.5, 11.5), (-11, 8.5, 9.5), u),
                                               hero("aerial_approach", u, fr) + Vector((22, -3, -2.2))), None, 0.5, 0),
        "water_flow": (26, lambda u, fr: (Vector((-13.8, -6.6, lvl("water_flow") + 0.32)) + lerp((0, 0, 0), (0.3, 0.2, 0.02), u),
                                          Vector((-30, 0.5, lvl("water_flow") + 0.9))), 4.0, 0.3, 0),
        "conv_cross": (30, lambda u, fr: (lerp((-7.5, -10.8, lvl("conv_cross") + 1.1), (-2.5, -10.2, lvl("conv_cross") + 0.9), u),
                                          conv("conv_cross", u, fr) + Vector((0.6, 0, 0.55))), None, 0.6, 0),
        "driver_watch": (28, lambda u, fr: (hero("driver_watch", u, fr) + lerp((1.95, 0.55, 1.2), (1.85, 0.45, 1.18), u),
                                            hero("driver_watch", u, fr) + Vector((-0.1, 0.37, 1.12))), 2.8, 0.25, 0),
        "rise_gauge": (40, lambda u, fr: (gauge + lerp((-0.7, -2.5, 0.5), (-0.6, -2.3, 0.55), u),
                                          gauge + Vector((0, 0, 0.3))), 3.0, 0.2, 0),
        "murky": (28, lambda u, fr: (lerp((-23.4, -0.9, lvl("murky") + 1.45), (-23.0, -0.8, lvl("murky") + 1.35), u),
                                     Vector((-20.4, -0.5, lvl("murky") - 0.55))), 5.0, 0.2, 0),
        "depth_reveal": (60, lambda u, fr: (lerp((-15.45, -5.9, lvl("depth_reveal") - 0.03), (-15.45, -5.6, lvl("depth_reveal") - 0.03), u),
                                            Vector((gauge.x, gauge.y, lvl("depth_reveal") - 0.03))), None, 0.05, 0),
        "six_cut": (30, lambda u, fr: (lerp((cx + 0.6, -8.6, ROAD0 + 0.75), (cx + 0.4, -8.0, ROAD0 + 0.7), u), Vector((cx, 0, ROAD0 + 0.3))), None, 0.15, 0),
        "underbody": (28, lambda u, fr: (Vector((cx + 2.6, ly - 3.3, lvl("underbody") + 0.16)) + lerp((0, 0, 0), (-0.2, 0.12, 0), u),
                                         Vector((cx + 0.7, ly - 0.7, lvl("underbody") + 0.06))), 4.0, 0.2, 0),
        "stall_dash": (20, lambda u, fr: (hero("stall_dash", u, fr) + lerp((-0.22, -0.32, 1.22), (-0.19, -0.3, 1.2), u),
                                          hero("stall_dash", u, fr) + Vector((0.66, 0.3, 0.9))), 1.6, 0.2, 0),
        "foot_cut": (32, lambda u, fr: (lerp((cx + 0.5, -8.4, ROAD0 + 0.75), (cx + 0.4, -8.0, ROAD0 + 0.72), u), Vector((cx, 0, ROAD0 + 0.35))), None, 0.15, 0),
        "float_wide": (30, lambda u, fr: (hero("float_wide", u, fr) + lerp((7.2, -6.2, 1.7), (6.6, -5.8, 1.6), u),
                                          hero("float_wide", u, fr) + Vector((0, 0, 0.55))), None, 0.4, 0),
        "air_box": (28, lambda u, fr: (Vector((cx, ly, ROAD0)) + Vector((6.6 * math.cos(math.radians(-118 + 38 * _ease(u))),
                                                                         6.6 * math.sin(math.radians(-118 + 38 * _ease(u))), 1.7)),
                                       Vector((cx, ly, ROAD0 + 0.6))), None, 0.15, 0),
        "air_box2": (30, lambda u, fr: (Vector((cx, ly, ROAD0)) + lerp((3.6, -4.6, 0.75), (3.2, -4.3, 0.7), u),
                                        Vector((cx - 0.2, ly, ROAD0 + 0.55))), None, 0.15, 0),
        "lift_arrows": (30, lambda u, fr: (lerp((cx + 0.3, -8.4, ROAD0 + 0.55), (cx + 0.2, -8.0, ROAD0 + 0.5), u), Vector((cx, 0, ROAD0 + 0.2))), None, 0.15, 0),
        "lift_close": (40, lambda u, fr: (lerp((cx + 1.8, -6.6, ROAD0 + 0.35), (cx + 1.6, -6.3, ROAD0 + 0.33), u), Vector((cx + 1.0, 0, ROAD0 + 0.12))), None, 0.1, 0),
        "tire_lift": (50, lambda u, fr: (lerp((cx + 1.7, -5.6, ROAD0 + 0.2), (cx + 1.65, -5.4, ROAD0 + 0.19), u), Vector((cx + 1.375, -2.55, ROAD0 + 0.12))), None, 0.1, 0),
        "current_cut": (34, lambda u, fr: (lerp((VL.X_CUT + 8.8, -0.9, ROAD0 + 0.8), (VL.X_CUT + 8.4, -1.1, ROAD0 + 0.75), u),
                                           Vector((cx, -1.25, ROAD0 + 0.35))), None, 0.25, 0),
        "swept": (28, lambda u, fr: (lerp((cx + 12, -15, 5.5), (cx + 13, -18, 5.0), u), hero("swept", u, fr) + Vector((0, 0, 0.3))), None, 0.6, 0),
        "suv": (32, lambda u, fr: (lerp((13, -17, lvl("suv") + 2.2), (12, -21, lvl("suv") + 2.0), u),
                                   suv_xf("suv", u, fr)[0] + Vector((0, 0, 0.7))), None, 0.5, 0),
        "truck": (32, lambda u, fr: (lerp((-6.5, -29, lvl("truck") + 1.9), (-7.5, -34, lvl("truck") + 1.8), u),
                                     truck_xf("truck", u, fr)[0] + Vector((0, 0, 0.7))), None, 0.5, 0),
        "washout_surface": (30, lambda u, fr: (lerp((-10, -2.7, lvl("washout_surface") + 0.55), (-8.5, -2.6, lvl("washout_surface") + 0.5), u),
                                               Vector((8, 0.2, lvl("washout_surface") - 0.05))), None, 0.2, 0),
        "washout_cut": (20, lambda u, fr: (lerp((5.8, -12.6, -0.7), (5.9, -11.8, -0.8), u), Vector((6.0, 0, -1.7))), None, 0.15, 0),
        "stranded": (26, lambda u, fr: (lerp((15, -37, 9.5), (14, -39, 8.8), u), Vector((1, -62, lvl("stranded") - 0.2))), None, 0.4, 0),
        "stranded_close": (35, lambda u, fr: (lerp((-0.2, -53.8, lvl("stranded_close") + 1.3), (-0.6, -54.3, lvl("stranded_close") + 1.2), u),
                                              Vector((-4, -58, lvl("stranded_close") + 0.35))), 4.0, 0.3, 0),
        "sign": (22, lambda u, fr: (lerp((-34.8, -10.0, VL.ground(-34.8, -10) + 1.3), (-34.3, -9.7, VL.ground(-34.3, -9.7) + 1.25), u),
                                    Vector((-23.5, -3.0, VL.ground(-23.5, -3.0) + 0.6))), None, 0.2, 0),
        "turn_around": (28, lambda u, fr: (lerp((-18.5, 6.5, 5.8), (-19.5, 6.0, 5.4), u), hero("turn_around", u, fr) + Vector((0, 0, 0.4))), None, 0.3, 0),
        "wade": (35, lambda u, fr: (Vector((cx - 5.8 + 0.6 * u, ly + 2.8, lvl("wade") + 0.95)),
                                    wade_target(u)), 4.0, 0.4, 0),
        "high_ground": (30, lambda u, fr: (lerp((-47.4, 6.7, VL.ground(-47.4, 6.7) + 1.9), (-47.0, 6.5, VL.ground(-47, 6.5) + 1.85), u),
                                           Vector((-12, -2.5, -0.9))), None, 0.25, 0),
        "long_way": (30, lambda u, fr: (hero("long_way", u, fr) + lerp((-6.5, 7.5, 1.3), (-6.0, 7.0, 1.25), u),
                                        hero("long_way", u, fr) + Vector((2.0, 0, 0.6))), None, 0.3, 0),
        "scenic": (35, lambda u, fr: (conv_pt("scenic", u, fr, (6.2, -3.4, 1.35)) + lerp((0, 0, 0), (-0.5, 0.3, -0.05), u),
                                      conv_pt("scenic", u, fr, (1.35, 0.0, 1.1))), 4.5, 0.15, 0),
        "scenic_wide": (26, lambda u, fr: (conv("scenic_wide", u, fr) + lerp((13, 19, 7), (15, 22, 10), _ease(u)),
                                           conv("scenic_wide", u, fr) + Vector((0, -2, 0.5))), None, 0.2, 0),
    }
    return plan


GAUGE = [None]


def conv_pt(name, u, fr, local):
    loc, r = conv_xf(name, u, fr)
    return loc + Euler(r, "XYZ").to_matrix() @ Vector(local)


def wade_target(u):
    return Vector((VL.CAR_X + 0.2 - 0.85 * T("wade", u) + 0.85 * SHOT["wade"][0], VL.LANE_Y + 0.15, level_at("wade", u) + 0.45))


def cameras(rig):
    sc = bpy.context.scene
    coll = S.collection("Cameras")
    plan = cam_plan()
    made = {}
    for name, t0, t1, st in SHOTS:
        lens, fn, fstop, shake, roll = plan[name]
        a, b = f(t0), f(t1) - 1
        cd = bpy.data.cameras.new("Cam_" + name)
        cd.lens = lens
        cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24.0
        cd.clip_start = 0.02; cd.clip_end = 3000
        cam = bpy.data.objects.new("Cam_" + name, cd); coll.objects.link(cam)
        tgt = bpy.data.objects.new("Tgt_" + name, None); coll.objects.link(tgt)
        r = random.Random(hash(name) % 1000)
        ph = [r.uniform(0, 6.28) for _ in range(6)]
        for fr in range(a, b + 1):
            u = (fr - a) / max(1, b - a)
            loc, g = fn(u, fr)
            t = fr / FPS
            jit = Vector((math.sin(t * 2.1 + ph[0]) + 0.5 * math.sin(t * 5.3 + ph[1]),
                          math.sin(t * 1.7 + ph[2]) + 0.5 * math.sin(t * 4.1 + ph[3]),
                          math.sin(t * 2.6 + ph[4]) + 0.5 * math.sin(t * 6.2 + ph[5]))) * 0.006 * shake
            cam.location = Vector(loc) + jit; cam.keyframe_insert("location", frame=fr)
            tgt.location = Vector(g); tgt.keyframe_insert("location", frame=fr)
            cam.rotation_euler = _look(cam.location, g, roll); cam.keyframe_insert("rotation_euler", frame=fr)
        if fstop:
            cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop
        m = sc.timeline_markers.new(name, frame=a)
        m.camera = cam
        made[name] = cam
    return made


# ============================================================================= visibility
def visibility(groups):
    """groups: {kind: (objects, rule)} where rule(shot_name, set) -> bool."""
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        for kind, (objs, rule) in groups.items():
            show = rule(name, st)
            for o in objs:
                o.hide_render = not show
                o.keyframe_insert("hide_render", frame=fr)


def rain_visibility(rain):
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        for other, planes in rain.items():
            for o in planes:
                o.hide_render = other != name
                o.keyframe_insert("hide_render", frame=fr)


def constant_hide(objs):
    for o in objs:
        ad = o.animation_data
        if ad and ad.action:
            for fc in ST._fcurves(ad.action):
                if fc.data_path == "hide_render":
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"
