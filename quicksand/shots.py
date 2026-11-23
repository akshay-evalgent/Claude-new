"""Shot list, character performance and cameras for the quicksand short, timed to the narration.

Every shot has: a time range (seconds), the set it plays on, a camera move, and the character's
performance (keyed poses, face, wetness). Shot boundaries are hard cuts; animation across a cut is
isolated so nothing drifts into a neighbouring shot.
"""
import math, os
import bpy
from mathutils import Euler, Vector

import anim, human, sets
from anim import (V, rot, spine, head, shoulders, fingers, legs_stand, arms_hang, hand_to, foot_to,
                  apply_walk, HIP_H, ANKLE_H)
from posing import aim, turn

from timeline import FPS, TIMING, LN, END, f, s, SHOTS, SHOT, CUT_FRAMES


# character positions (world)
STAND = Vector((0.1, 0.0, 0.0))        # where he gets stuck in P1
GET_UP = Vector((-0.3, 1.9, 0.0))      # where he stands up after rolling out
CAR_SPOT = sets.CAR + Vector((-2.67, 0.0, 0.0))


# ----------------------------------------------------------------------------- performance helpers
def T(name, u):
    """Absolute time at fraction u (0..1) of a shot, or u seconds after start if u > 1."""
    t0, t1, _ = SHOT[name]
    return t0 + (t1 - t0) * u if u <= 1.0 else t0 + u


def ends(name):
    t0, t1, _ = SHOT[name]
    return f(t0), f(t1) - 1


class Perf:
    def __init__(self, ch):
        self.ch = ch
        self.arm = ch.arm

    def pose(self, t, loc, body, yaw=90.0, pitch=0.0, roll=0.0, pivot=None, frame=None):
        fr = frame or f(t)
        self.ch.begin(fr)
        self.ch.place(fr, loc, yaw, pitch, roll, pivot)
        body(self.ch, self.arm)
        self.ch.key(fr)
        return fr

    def face(self, t, frame=None, **w):
        self.ch.face(frame or f(t), **w)

    def wet(self, t, level, frame=None):
        human.set_wet(self.ch.c, frame or f(t), level)


def sunk(depth, x=None, y=None):
    p = STAND.copy()
    if x is not None:
        p.x = x
    if y is not None:
        p.y = y
    p.z = -depth
    return p


def surface_hands(depth, spread=0.42, fwd=-0.28, lift=0.03, elbows=0.2):
    def body(ch, arm):
        for side, sg in (("Left", 1), ("Right", -1)):
            hand_to(arm, side, (sg * spread, fwd, depth + lift), pole=(sg * 1.0, 0.5, elbows),
                    hand_dir=(sg * 0.5, -1, -0.15))
    return body


def combine(*fns):
    def body(ch, arm):
        for fn in fns:
            fn(ch, arm)
    return body


def B_spine(fwd=0.0, twist=0.0, side=0.0):
    return lambda ch, arm: spine(arm, fwd, twist, side)


def B_head(pitch=0.0, yaw=0.0, tilt=0.0):
    return lambda ch, arm: head(arm, pitch, yaw, tilt)


def B_legs(spread=0.04, knee=0.0):
    return lambda ch, arm: legs_stand(arm, spread, knee)


def B_fingers(c=0.9):
    return lambda ch, arm: fingers(arm, c)


def B_arms_out(up=-0.2, fwd=-0.15, wobble=0.0, elbow=0.25):
    def body(ch, arm):
        for side, sg in (("Left", 1), ("Right", -1)):
            aim(arm, f"{side}Arm", (sg * 1.0, fwd + wobble * sg, up + wobble))
            aim(arm, f"{side}ForeArm", (sg * 1.0, fwd - elbow, up + 0.15 - wobble * sg))
            aim(arm, f"{side}Hand", (sg * 1.0, fwd - elbow, up + 0.1))
    return body


def B_arms_spread(z=0.0, back=0.15):
    def body(ch, arm):
        for side, sg in (("Left", 1), ("Right", -1)):
            aim(arm, f"{side}Arm", (sg * 1.0, back, z))
            aim(arm, f"{side}ForeArm", (sg * 1.0, back - 0.05, z + 0.02))
            aim(arm, f"{side}Hand", (sg * 1.0, back - 0.05, z))
    return body


def B_stride(fwd_leg=20.0, back_leg=-14.0):
    def body(ch, arm):
        for side, sg, ang in (("Left", 1, fwd_leg), ("Right", -1, back_leg)):
            a = math.radians(ang)
            aim(arm, f"{side}UpLeg", (sg * 0.04, -math.sin(a), -math.cos(a)))
            aim(arm, f"{side}Leg", (sg * 0.03, -math.sin(a) * 0.6 + 0.05, -1))
            aim(arm, f"{side}Foot", (sg * 0.03, -1, -0.28))
    return body


# ----------------------------------------------------------------------------- performance
def perform(ch, car_pivot, macro_boot, grains, seep, tide):
    p = Perf(ch)
    arm = ch.arm

    # 1-2: walk in; the near (right) foot lands in the quicksand at t=2.0
    t_land = 2.0
    period, speed = 1.05, 1.1
    t_plant = t_land - 2.5 * period
    x0 = 0.25 - speed * period * 2.8
    fr0, fr1 = f(0.0), f(t_land)
    for fr in range(fr0, fr1 + 1, 2):
        apply_walk(ch, fr, (fr - 1) / FPS, x0, t_plant, speed, period)
    hip_land = x0 + speed * (t_land - t_plant)
    p.face(0.0, calm=0.0)
    p.wet(0.0, -1.0)
    # sudden drop to the ankle, stride frozen, arms jerk out
    stride = B_stride(-16, 18)
    p.pose(t_land + 0.12, (hip_land, 0, -0.16), combine(stride, B_spine(8), B_arms_out(-0.55, -0.1), B_head(-18), B_fingers(0.4)))
    p.pose(None, (hip_land, 0, -0.22), combine(stride, B_spine(10), B_arms_out(-0.45, -0.12, 0.05), B_head(-30), B_fingers(0.3)), frame=ends("boots")[1])
    p.face(2.05, frame=f(2.05), shock=0.0)
    p.face(2.2, shock=1.0)
    p.wet(2.0, 0.0); p.wet(None, 0.2, frame=ends("boots")[1])

    # 3: sinking to the knees, arms out for balance, looking down
    a, b = ends("sink_front")
    p.pose(None, (hip_land, 0, -0.24), combine(stride, B_spine(10), B_arms_out(-0.4, -0.12, 0.05), B_head(-32), B_fingers(0.3)), frame=a)
    p.pose(None, (STAND.x, 0, -0.38), combine(B_stride(-8, 10), B_spine(6, 6), B_arms_out(-0.15, -0.18, -0.08), B_head(-38, 8), B_fingers(0.3)), frame=(a + b) // 2)
    p.pose(None, sunk(0.5), combine(B_legs(), B_spine(4, -5), B_arms_out(-0.25, -0.2, 0.06), B_head(-35, -6), B_fingers(0.3)), frame=b)
    p.face(None, frame=a, shock=1.0); p.face(None, frame=(a + b) // 2, panic=1.0); p.face(None, frame=b, panic=1.0)
    p.wet(None, 0.2, frame=a); p.wet(None, 0.5, frame=b)

    # 4: grab the right thigh and yank, twice
    a, b = ends("yank")
    def reach(k):
        def body(ch, arm):
            spine(arm, 34 - 52 * k, -8 + 4 * k, 0)
            shoulders(arm, up=0.3 * k)
            hand_to(arm, "Right", (-0.2, -0.06 + 0.02 * k, 0.60 + 0.05 * k), pole=(-1, 0.6, 0.3), hand_dir=(0.3, 0.2, -1))
            hand_to(arm, "Left", (-0.07, -0.13 + 0.03 * k, 0.62 + 0.05 * k), pole=(0.6, 0.0, -0.8), hand_dir=(-0.6, -0.2, -1))
            head(arm, -28 + 40 * k, 0, 6 * k)
            fingers(arm, 0.9)
            legs_stand(arm)
        return body
    seq = [(0.0, 0), (0.2, 1), (0.37, 0.15), (0.58, 1), (0.75, 0.15), (1.0, 1)]
    for u, k in seq:
        fr = a + int(round((b - a) * u))
        p.pose(None, sunk(0.5 + 0.05 * u), reach(k), frame=fr)
        p.face(None, frame=fr, strain=1.0 if k > 0.5 else 0.6, panic=0.0 if k > 0.5 else 0.4)
    p.wet(None, 0.5, frame=a); p.wet(None, 0.55, frame=b)

    # 5: cross-section (front cut), knee deep, twisting and trying to lift a leg
    a, b = ends("section_knees")
    for i, u in enumerate((0.0, 0.33, 0.66, 1.0)):
        fr = a + int(round((b - a) * u))
        tw = 12 if i % 2 else -10
        lift = 12 if i % 2 else 0
        def body(ch, arm, tw=tw, lift=lift):
            spine(arm, 6, tw, 0)
            legs_stand(arm)
            aim(arm, "RightUpLeg", (-0.05, -math.sin(math.radians(lift)), -math.cos(math.radians(lift))))
            aim(arm, "RightLeg", (-0.03, 0.12 * (lift > 0), -1))
            surface_hands(0.55, 0.45, -0.3, 0.04)(ch, arm)
            head(arm, -15, -tw * 0.6)
            fingers(arm, 0.6)
        p.pose(None, sunk(0.55), body, frame=fr)
        p.face(None, frame=fr, strain=0.8 if i % 2 else 0.3, panic=0.0 if i % 2 else 0.7)
    p.wet(None, 0.55, frame=a)

    # 6: macro: the boot strains upwards a centimetre and is held
    a, b = ends("macro_lock")
    base = macro_boot.location.copy()
    for u, dz in ((0.0, 0.0), (0.25, 0.004), (0.45, 0.009), (0.6, 0.006), (0.8, 0.011), (1.0, 0.008)):
        macro_boot.location = base + Vector((0, 0, dz)); macro_boot.keyframe_insert("location", frame=a + int(round((b - a) * u)))
    grains.data.shape_keys.key_blocks["Loose"].value = 0.0
    grains.data.shape_keys.key_blocks["Loose"].keyframe_insert("value", frame=a)

    # 7: car: squat and lift the front of a car by the bumper
    a, b = ends("car")
    def lift(k):
        def body(ch, arm):
            spine(arm, 38 - 10 * k, 0, 0)
            shoulders(arm, up=0.2 + 0.15 * k)
            for side, sg in (("Left", 1), ("Right", -1)):
                foot_to(arm, side, ch.to_local(CAR_SPOT + Vector((0.15, sg * 0.21, ANKLE_H))), pole=(sg * 0.35, -1, 0.0), foot_dir=(sg * 0.25, -1, -0.28))
                hand_to(arm, side, ch.to_local(sets.CAR + Vector((-2.26, sg * 0.28, 0.40 + 0.05 * k))), pole=(sg * 1.0, 0.4, -0.3), hand_dir=(sg * 0.1, -0.3, -1))
            head(arm, 12 + 6 * k, 0)
            fingers(arm, 1.3)
        return body
    for u, k in ((0.0, 0.0), (0.3, 0.5), (0.55, 1.0), (0.78, 0.85), (1.0, 1.0)):
        fr = a + int(round((b - a) * u))
        p.pose(None, CAR_SPOT + Vector((0, 0, -0.36 + 0.05 * k)), lift(k), frame=fr)
        p.face(None, frame=fr, strain=1.0)
    p.wet(None, -1.0, frame=a); p.wet(None, -1.0, frame=b)
    car_pivot.rotation_euler = (0, 0, 0); car_pivot.keyframe_insert("rotation_euler", frame=a + int(0.25 * (b - a)))
    car_pivot.rotation_euler = (0, math.radians(1.3), 0); car_pivot.keyframe_insert("rotation_euler", frame=a + int(0.6 * (b - a)))
    car_pivot.rotation_euler = (0, math.radians(1.0), 0); car_pivot.keyframe_insert("rotation_euler", frame=b)

    # 8: orbit: sinking to the hips, panicking, arms flailing
    a, b = ends("orbit_sink")
    n = 7
    for i in range(n + 1):
        u = i / n
        fr = a + int(round((b - a) * u))
        ph = i % 2
        def body(ch, arm, ph=ph, u=u):
            spine(arm, 4, 14 if ph else -14, 5 if ph else -5)
            legs_stand(arm)
            for side, sg in (("Left", 1), ("Right", -1)):
                up = (0.55 if (ph == (sg > 0)) else -0.05)
                aim(arm, f"{side}Arm", (sg * 0.9, -0.35, up))
                aim(arm, f"{side}ForeArm", (sg * 0.6, -0.55, up + 0.45))
                aim(arm, f"{side}Hand", (sg * 0.5, -0.5, up + 0.6))
            head(arm, -10 + 18 * ph, 22 if ph else -22)
            fingers(arm, 0.2)
        p.pose(None, sunk(0.55 + 0.35 * u ** 0.8), body, frame=fr)
        p.face(None, frame=fr, panic=1.0)
    p.wet(None, 0.55, frame=a); p.wet(None, 0.9, frame=b)

    # 9: cross-section: settles at the waist (bobs once)
    a, b = ends("section_waist")
    for u, d in ((0.0, 0.9), (0.45, 1.03), (0.65, 0.97), (0.82, 1.0), (1.0, 1.0)):
        fr = a + int(round((b - a) * u))
        p.pose(None, sunk(d), combine(B_legs(), B_spine(5), surface_hands(d, 0.46, -0.3, 0.04), B_head(-10), B_fingers(0.5)), frame=fr)
    p.face(None, frame=a, panic=0.8); p.face(None, frame=a + int(0.6 * (b - a)), worry=1.0); p.face(None, frame=b, worry=0.6, calm=0.4)
    p.wet(None, 0.9, frame=a); p.wet(None, 1.03, frame=b)

    # 10: stops at the waist, relief
    a, b = ends("stop_waist")
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(6), surface_hands(1.0, 0.46, -0.3, 0.05), B_head(-5), B_fingers(0.6)), frame=a)
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(12), lambda ch, arm: shoulders(arm, -0.1), surface_hands(1.0, 0.44, -0.32, 0.03), B_head(-14, 0, 6), B_fingers(0.7)), frame=b)
    p.face(None, frame=a, worry=0.5); p.face(None, frame=a + 10, exhale=1.0); p.face(None, frame=b, exhale=0.6, calm=0.4)

    # 11: the bad news (close)
    a, b = ends("bad_news")
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(10), surface_hands(1.0, 0.44, -0.32, 0.03), B_head(-10, 0, 4), B_fingers(0.7)), frame=a)
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(4), surface_hands(1.0, 0.46, -0.3, 0.04), B_head(2, 0, 0), B_fingers(0.6)), frame=b)
    p.face(None, frame=a, calm=0.6); p.face(None, frame=a + 6, worry=1.0); p.face(None, frame=b, worry=1.0, shock=0.3)

    # 12: pushing on the sand, twisting: nothing
    a, b = ends("stuck_high")
    for i, u in enumerate((0.0, 0.3, 0.6, 1.0)):
        fr = a + int(round((b - a) * u))
        tw = (16, -16)[i % 2]
        p.pose(None, sunk(1.0), combine(B_legs(), B_spine(-4 if i % 2 else 10, tw), surface_hands(1.0, 0.4, -0.22, 0.0 if i % 2 else 0.05, 0.4), B_head(-20, -tw * 0.5), B_fingers(0.4)), frame=fr)
        p.face(None, frame=fr, strain=1.0 if i % 2 else 0.5, worry=0.0 if i % 2 else 0.5)

    # 13-14: the tide coming in
    for nm, pitch_h in (("tide_aerial", 0), ("tide_low", -8)):
        a, b = ends(nm)
        p.pose(None, sunk(1.0), combine(B_legs(), B_spine(6), surface_hands(1.0, 0.46, -0.3, 0.04), B_head(pitch_h, 0), B_fingers(0.6)), frame=a)
        p.pose(None, sunk(1.0), combine(B_legs(), B_spine(8), surface_hands(1.0, 0.45, -0.3, 0.04), B_head(pitch_h - 4, -6), B_fingers(0.6)), frame=b)
        p.face(None, frame=a, worry=1.0); p.face(None, frame=b, worry=0.7, panic=0.3)

    # 15: calm down: eyes close, breath out
    a, b = ends("calm_face")
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(6), surface_hands(1.0, 0.46, -0.3, 0.04), B_head(-4), B_fingers(0.6)), frame=a)
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(2), lambda ch, arm: shoulders(arm, 0.15), surface_hands(1.0, 0.46, -0.3, 0.06), B_head(6), B_fingers(0.6)), frame=a + int(0.4 * (b - a)))
    p.pose(None, sunk(1.0), combine(B_legs(), B_spine(6), lambda ch, arm: shoulders(arm, -0.1), surface_hands(1.0, 0.46, -0.3, 0.03), B_head(-2), B_fingers(0.7)), frame=b)
    p.face(None, frame=a, worry=0.8); p.face(None, frame=a + int(0.35 * (b - a)), exhale=1.0)
    p.face(None, frame=a + int(0.8 * (b - a)), exhale=0.7); p.face(None, frame=b, calm=1.0)

    # 16: lean back and spread the arms (pivot at the hips, at the surface)
    a, b = ends("lean_back")
    hip = Vector((STAND.x, STAND.y, -1.0 + HIP_H))
    for u, pitch, spr in ((0.0, 0, 0.0), (0.3, -12, 0.3), (0.75, -45, 1.0), (1.0, -50, 1.0)):
        fr = a + int(round((b - a) * u))
        def body(ch, arm, spr=spr):
            legs_stand(arm)
            if spr < 0.5:
                surface_hands(1.0, 0.46 + 0.2 * spr, -0.3 + 0.2 * spr, 0.04)(ch, arm)
            else:
                B_arms_spread(-0.08, 0.2)(ch, arm)
            head(arm, 18 * spr, 0)
            fingers(arm, 0.5)
        p.pose(None, hip, body, pitch=pitch, pivot=HIP_H, frame=fr)
    p.face(None, frame=a, calm=1.0); p.face(None, frame=b, calm=0.8)

    # 17: floating in a pool (match cut)
    a, b = ends("pool")
    for u, dz in ((0.0, 0.0), (0.5, 0.015), (1.0, -0.005)):
        fr = a + int(round((b - a) * u))
        p.pose(None, sets.POOL + Vector((0.3, 0, -0.05 + dz)), combine(B_legs(0.08), B_arms_spread(0.05, 0.25), B_head(10), B_fingers(0.4)),
               yaw=90.0, pitch=-88.0, pivot=HIP_H, frame=fr)
    p.face(None, frame=a, calm=1.0, exhale=0.3)
    p.wet(None, 1.03, frame=a)

    # 18: cross-section (side cut): legs wiggle slowly
    a, b = ends("section_wiggle")
    n = 6
    for i in range(n + 1):
        u = i / n
        fr = a + int(round((b - a) * u))
        ph = i % 2
        def body(ch, arm, ph=ph):
            for side, sg in (("Left", 1), ("Right", -1)):
                k = 1 if (ph == (sg > 0)) else -1
                aim(arm, f"{side}UpLeg", (sg * 0.06, -0.12 - 0.14 * k, -1))
                aim(arm, f"{side}Leg", (sg * 0.03, 0.08 + 0.18 * k, -1))
                aim(arm, f"{side}Foot", (sg * 0.03, -1, -0.28 - 0.3 * k))
            B_arms_spread(-0.08, 0.2)(ch, arm)
            head(arm, 18, 0)
            fingers(arm, 0.5)
        p.pose(None, hip, body, pitch=-50, pivot=HIP_H, frame=fr)
    p.face(None, frame=a, calm=1.0)

    # 19: macro: water seeps in, grains loosen, boot rises
    a, b = ends("macro_seep")
    seep.location = sets.MACRO + Vector((0, 0, 0.34)); seep.keyframe_insert("location", frame=a + 6)
    seep.location = sets.MACRO + Vector((0, 0, -0.47)); seep.keyframe_insert("location", frame=a + int(0.7 * (b - a)))
    kb = grains.data.shape_keys.key_blocks["Loose"]
    kb.value = 0.0; kb.keyframe_insert("value", frame=a + int(0.3 * (b - a)))
    kb.value = 1.0; kb.keyframe_insert("value", frame=a + int(0.85 * (b - a)))
    macro_boot.location = base; macro_boot.keyframe_insert("location", frame=a)
    macro_boot.location = base; macro_boot.keyframe_insert("location", frame=a + int(0.6 * (b - a)))
    macro_boot.location = base + Vector((0, 0, 0.07)); macro_boot.keyframe_insert("location", frame=b)

    # 20: floating up: legs rise to the surface
    a, b = ends("float_up")
    for u, pitch, hz in ((0.0, -55, -0.02), (0.5, -72, 0.04), (1.0, -84, 0.10)):
        fr = a + int(round((b - a) * u))
        p.pose(None, Vector((STAND.x, STAND.y, hz)), combine(B_legs(0.06), B_arms_spread(-0.05, 0.2), B_head(25 - 20 * u), B_fingers(0.5)),
               pitch=pitch, pivot=HIP_H, frame=fr)
    p.face(None, frame=a, calm=1.0); p.face(None, frame=b, calm=0.6, worry=0.2)

    # 21: roll onto solid ground (toward his left = world +Y)
    a, b = ends("roll_out")
    for u, roll, hy, hz in ((0.0, 0, 0.0, 0.10), (0.35, 70, 0.55, 0.17), (0.7, 160, 1.15, 0.14), (1.0, 178, 1.35, 0.12)):
        fr = a + int(round((b - a) * u))
        def body(ch, arm, u=u):
            legs_stand(arm, 0.05, 0.05)
            for side, sg in (("Left", 1), ("Right", -1)):
                aim(arm, f"{side}Arm", (sg * 0.35, -0.55, -0.7))
                aim(arm, f"{side}ForeArm", (-sg * 0.25, -0.8, 0.3))
            head(arm, 10 - 30 * u, 0)
            fingers(arm, 0.8)
        p.pose(None, Vector((STAND.x + 0.15, hy, hz)), body, pitch=-85, roll=roll, pivot=HIP_H, frame=fr)
    p.face(None, frame=a, strain=0.6); p.face(None, frame=b, exhale=1.0)

    # 22: get up, brush the hands off, hands on hips: the survival expert
    a, b = ends("hero")
    g = GET_UP
    def kneel(ch, arm):
        spine(arm, 22, 0, 0)
        foot_to(arm, "Left", ch.to_local(g + Vector((0.42, 0.12, ANKLE_H))), pole=(0.1, -1, 0.2))
        foot_to(arm, "Right", ch.to_local(g + Vector((-0.48, -0.12, 0.10))), pole=(-0.1, -1, -0.3), foot_dir=(0, 0.6, -1))
        hand_to(arm, "Left", ch.to_local(g + Vector((0.40, 0.18, 0.55))), pole=(1, 0.4, -0.2))
        hand_to(arm, "Right", ch.to_local(g + Vector((0.36, 0.02, 0.58))), pole=(-1, 0.4, -0.2))
        head(arm, -5, 0)
        fingers(arm, 0.7)
    def brush(k):
        def body(ch, arm):
            legs_stand(arm, 0.06)
            spine(arm, 8, 0, 0)
            hand_to(arm, "Left", (0.03, -0.33, 1.0 + 0.04 * k), pole=(1, 0.3, -0.6), hand_dir=(-1, -0.3, 0.1))
            hand_to(arm, "Right", (-0.03, -0.33, 1.0 - 0.04 * k), pole=(-1, 0.3, -0.6), hand_dir=(1, -0.3, -0.1))
            head(arm, -18, 0)
            fingers(arm, 0.1)
        return body
    def hips(sway):
        def body(ch, arm):
            legs_stand(arm, 0.09)
            spine(arm, -6, sway, 0)
            shoulders(arm, 0.05, -0.05)
            for side, sg in (("Left", 1), ("Right", -1)):
                hand_to(arm, side, (sg * 0.19, 0.02, 1.0), pole=(sg * 1.0, 0.7, 0.0), hand_dir=(-sg * 0.4, 0.5, -1))
            head(arm, 10, -sway * 0.5)
            fingers(arm, 0.6)
        return body
    seqs = [(0.0, g + Vector((0, 0, -0.46)), kneel), (0.28, g + Vector((0, 0, -0.02)), combine(B_legs(0.06), B_spine(10), lambda ch, arm: arms_hang(arm), B_head(-10), B_fingers(0.6))),
            (0.36, g, brush(1)), (0.44, g, brush(-1)), (0.52, g, brush(1)), (0.6, g, brush(-1)),
            (0.72, g, hips(-3)), (1.0, g, hips(3))]
    for u, loc, body in seqs:
        p.pose(None, loc, body, frame=a + int(round((b - a) * u)))
    p.face(None, frame=a, exhale=0.8); p.face(None, frame=a + int(0.3 * (b - a)), calm=0.8)
    p.face(None, frame=a + int(0.62 * (b - a)), calm=0.5); p.face(None, frame=a + int(0.75 * (b - a)), smug=1.0); p.face(None, frame=b, smug=1.0)
    p.wet(None, 1.03, frame=a)

    # 23: one confident step forward (right foot), still hands on hips
    a, b = ends("step")
    def step(k):
        def body(ch, arm):
            spine(arm, -6 + 4 * k, 0, 0)
            shoulders(arm, 0.05, -0.05)
            for side, sg in (("Left", 1), ("Right", -1)):
                hand_to(arm, side, (sg * 0.19, 0.02, 1.0), pole=(sg * 1.0, 0.7, 0.0), hand_dir=(-sg * 0.4, 0.5, -1))
            foot_to(arm, "Left", ch.to_local(g + Vector((0.0, 0.1, ANKLE_H))))
            sw = min(1.0, max(0.0, (k - 0.2) / 0.8))
            fx = -0.0 + 0.62 * (sw * sw * (3 - 2 * sw))
            foot_to(arm, "Right", ch.to_local(g + Vector((fx, -0.1, ANKLE_H + 0.13 * math.sin(math.pi * sw)))),
                    foot_dir=(0, -1, -0.28 + 0.3 * math.sin(math.pi * sw)))
            head(arm, 10 - 6 * k, 0)
            fingers(arm, 0.6)
        return body
    for u in (0.0, 0.45, 0.6, 0.75, 0.9, 1.0):
        k = max(0.0, (u - 0.45) / 0.55)
        p.pose(None, g + Vector((0.3 * k * k, 0, 0)), step(k), frame=a + int(round((b - a) * u)))
    p.face(None, frame=a, smug=1.0); p.face(None, frame=b, smug=1.0)

    # 24: straight down to the waist in the next patch. Deadpan.
    a, b = ends("drop")
    dl = g + Vector((0.32, 0, 0))
    drop = [(0, 0.0, "hips"), (2, 0.45, "up"), (4, 0.9, "up"), (6, 1.04, "up"), (10, 0.97, "rest"), (15, 1.0, "rest"), (b - a, 1.0, "rest")]
    for df, dd, kind in drop:
        def body(ch, arm, kind=kind, dd=dd):
            legs_stand(arm)
            if kind == "hips":
                spine(arm, -2, 0, 0)
                for side, sg in (("Left", 1), ("Right", -1)):
                    hand_to(arm, side, (sg * 0.19, 0.02, 1.0), pole=(sg * 1.0, 0.7, 0.0))
            elif kind == "up":
                spine(arm, -4, 0, 0)
                B_arms_out(0.35, -0.2, 0.0, 0.4)(ch, arm)
            else:
                spine(arm, 4, 0, 0)
                surface_hands(dd, 0.46, -0.3, 0.05)(ch, arm)
            head(arm, 0 if kind != "rest" else -3, 0)
            fingers(arm, 0.5)
        p.pose(None, dl + Vector((0, 0, -dd)), body, frame=a + df)
    p.face(None, frame=a, smug=1.0); p.face(None, frame=a + 3, shock=1.0); p.face(None, frame=a + 12, shock=0.2)
    blink = a + int(1.2 * FPS)
    p.face(None, frame=blink - 1); p.face(None, frame=blink + 2, blink=1.0); p.face(None, frame=blink + 5)
    p.face(None, frame=b)

    # tide front (linear)
    for t, x in ((0.0, 45.0), (SHOT["tide_aerial"][0], 16.0), (SHOT["tide_low"][1], 2.6), (END, 1.9)):
        tide.location.x = STAND.x + x
        tide.keyframe_insert("location", index=0, frame=f(t))
    for fc in _fcurves(tide):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"


# ----------------------------------------------------------------------------- cameras
CAMS = {
    # name: (lens, loc0, target0, loc1, target1, fstop or None, shake)
    "walk_wide": (24, (-2.6, -3.9, 0.35), (-1.9, 0, 0.95), (-1.3, -3.7, 0.4), (-0.7, 0, 0.95), None, 0),
    "boots": (35, (-1.05, -1.35, 0.14), (-0.45, -0.1, 0.1), (-0.12, -1.25, 0.13), (0.18, -0.1, 0.04), 4.0, 0),
    "sink_front": (35, (2.6, -0.65, 1.2), (0.1, 0, 1.15), (1.95, -0.5, 1.0), (0.1, 0, 0.95), 5.6, 0),
    "yank": (30, (0.55, -1.75, 0.5), (0.0, 0, 0.6), (0.45, -1.5, 0.48), (0.0, 0, 0.58), 5.6, 0.6),
    "section_knees": (20, (3.3, 0.4, 0.35), (0.0, 0, -0.05), (2.8, 0.3, 0.3), (0.0, 0, -0.1), None, 0),
    "macro_lock": (40, (0.10, -0.80, -0.08), (0.0, 0, -0.17), (0.07, -0.66, -0.1), (0.0, 0, -0.17), 11.0, 0),
    "car": (24, (-1.7, -4.3, 0.95), (-2.15, 0, 0.72), (-1.95, -3.7, 0.85), (-2.2, 0, 0.7), None, 0.3),
    "orbit_sink": (30, None, None, None, None, 5.6, 0.2),
    "section_waist": (20, (3.3, 0.4, 0.1), (0.0, 0, -0.25), (2.8, 0.3, 0.0), (0.0, 0, -0.3), None, 0),
    "stop_waist": (35, (2.5, 0.6, 0.8), (0.1, 0, 0.42), (2.2, 0.5, 0.74), (0.1, 0, 0.4), 4.0, 0),
    "bad_news": (50, (1.2, 0.32, 0.72), (0.1, 0, 0.62), (1.05, 0.28, 0.7), (0.1, 0, 0.62), 2.8, 0),
    "stuck_high": (28, (1.5, -1.25, 2.45), (0.1, 0, 0.15), (1.3, -1.05, 2.25), (0.1, 0, 0.15), None, 0.2),
    "tide_aerial": (24, (-7.0, -9.5, 9.5), (5.0, 0, 0), (-6.2, -8.8, 9.0), (4.0, 0, 0), None, 0),
    "tide_low": (28, (-2.6, -1.9, 0.62), (5.0, 1.3, -0.25), (-2.35, -1.75, 0.58), (5.0, 1.3, -0.25), None, 0),
    "calm_face": (50, (1.15, -0.38, 0.72), (0.1, 0, 0.62), (1.0, -0.33, 0.7), (0.1, 0, 0.62), 2.8, 0),
    "lean_back": (30, (0.35, -2.7, 0.55), (0.0, 0, 0.25), (0.3, -2.35, 0.45), (-0.1, 0, 0.2), 5.6, 0),
    "pool": (30, None, None, None, None, None, 0),
    "section_wiggle": (20, (0.5, -3.5, 0.0), (0.25, 0, -0.2), (0.4, -3.0, -0.05), (0.25, 0, -0.25), None, 0),
    "macro_seep": (40, (-0.10, -0.82, -0.05), (0.0, 0, -0.15), (-0.02, -0.68, -0.07), (0.0, 0, -0.14), 11.0, 0),
    "float_up": (30, (0.55, 0.15, 3.1), (0.25, 0, 0), (0.55, 0.15, 3.5), (0.25, 0, 0), None, 0),
    "roll_out": (24, (1.9, -1.3, 0.38), (0.25, 0.6, 0.2), (1.8, -0.7, 0.33), (0.25, 1.1, 0.18), None, 0),
    "hero": (24, (1.6, 1.15, 0.25), (-0.3, 1.9, 1.05), (1.15, 1.35, 0.3), (-0.3, 1.9, 1.15), None, 0),
    "step": (35, (1.15, 1.25, 0.2), (0.15, 1.85, 0.08), (1.05, 1.3, 0.18), (0.3, 1.85, 0.06), 4.0, 0),
    "drop": (30, (3.2, 0.9, 0.85), (0.0, 1.9, 0.55), (3.0, 0.95, 0.8), (0.0, 1.9, 0.5), None, 0.9),
}


def _look(loc, tgt, roll=0.0):
    d = V(tgt) - V(loc)
    q = d.to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll:
        e.rotate_axis("Z", math.radians(roll))
    return e


def cameras():
    sc = bpy.context.scene
    coll = sets.collection("Cameras")
    made = {}
    for name, t0, t1, st in SHOTS:
        lens, l0, g0, l1, g1, fstop, shake = CAMS[name]
        a, b = f(t0), f(t1) - 1
        if name == "orbit_sink":  # orbit around the stuck man
            keys = []
            for u in (0.0, 0.5, 1.0):
                ang = math.radians(-35 + 70 * u)
                c = STAND + Vector((2.7 * math.cos(ang), 2.7 * math.sin(ang), 1.05 - 0.25 * u))
                keys.append((a + int(round((b - a) * u)), c, STAND + Vector((0, 0, 0.55 - 0.25 * u))))
        elif name == "pool":
            keys = []
            for u in (0.0, 1.0):
                c = sets.POOL + Vector((0.3, 0.0, 4.2 - 0.3 * u))
                keys.append((a + int(round((b - a) * u)), c, sets.POOL + Vector((0.3, 0.001, 0))))
        else:
            off = sets.MACRO if st == "macro" else (sets.CAR if st == "car" else Vector((0, 0, 0)))
            keys = [(a, off + V(l0), off + V(g0)), (b, off + V(l1), off + V(g1))]
        cd = bpy.data.cameras.new("Cam_" + name)
        cd.lens = lens
        cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24.0
        cd.clip_start = 0.01 if st == "macro" else 0.05
        cd.clip_end = 2000
        cam = bpy.data.objects.new("Cam_" + name, cd); coll.objects.link(cam)
        tgt = bpy.data.objects.new("Tgt_" + name, None); coll.objects.link(tgt)
        for fr, c, g in keys:
            cam.location = c; cam.keyframe_insert("location", frame=fr)
            tgt.location = g; tgt.keyframe_insert("location", frame=fr)
            roll = {"pool": 90.0, "float_up": 90.0}.get(name, 0.0)
            cam.rotation_euler = _look(c, g, roll + (12 * (fr - a) / max(1, b - a) if name == "pool" else 0))
            cam.keyframe_insert("rotation_euler", frame=fr)
        for o in (cam, tgt):
            for fc in _fcurves(o):
                for kp in fc.keyframe_points:
                    kp.interpolation = "LINEAR"
        if fstop:
            cd.dof.use_dof = True
            cd.dof.focus_object = tgt
            cd.dof.aperture_fstop = fstop
        if shake:
            for fc in _fcurves(cam):
                if fc.data_path == "rotation_euler":
                    m = fc.modifiers.new("NOISE")
                    m.scale = 6.0; m.strength = 0.012 * shake; m.phase = hash(name) % 100 + fc.array_index * 13
        m = sc.timeline_markers.new(name, frame=a)
        m.camera = cam
        made[name] = cam
    return made


# ----------------------------------------------------------------------------- visibility per set
def visibility(groups):
    """groups: {set kind -> list of objects visible only in that kind}; anything listed under
    'beach' is visible in beach and car shots, hidden in section shots."""
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        for kind, objs in groups.items():
            if kind == "beach":
                show = st in ("beach", "car", "macro", "pool")
            elif kind == "tide":
                show = st == "beach"
            else:
                show = st == kind
            for o in objs:
                o.hide_render = not show
                o.keyframe_insert("hide_render", frame=fr)
    for objs in groups.values():
        for o in objs:
            for fc in _fcurves(o):
                if fc.data_path == "hide_render":
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"


# ----------------------------------------------------------------------------- cut isolation
def _fcurves(idblock):
    ad = getattr(idblock, "animation_data", None)
    act = ad.action if ad else None
    if not act:
        return []
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])):
        return list(act.fcurves)
    out = []
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


def isolate_cuts(idblocks, cuts=None):
    """Make every shot's animation independent: the last key before a cut holds (CONSTANT) and the
    first/last keys of each shot get flat handles, so motion eases within the shot only."""
    cuts = set(cuts or CUT_FRAMES)
    for idb in idblocks:
        for fc in _fcurves(idb):
            kps = fc.keyframe_points
            n = len(kps)
            for i, kp in enumerate(kps):
                kp.interpolation = "BEZIER"
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            fc.update()
            for i, kp in enumerate(kps):
                fr = kp.co.x
                nxt = kps[i + 1].co.x if i + 1 < n else None
                prv = kps[i - 1].co.x if i > 0 else None
                cut_after = nxt is not None and any(fr < c <= nxt for c in cuts)
                cut_before = prv is not None and any(prv < c <= fr for c in cuts)
                if cut_after:
                    kp.interpolation = "CONSTANT"
                if cut_after or cut_before:
                    kp.handle_left_type = kp.handle_right_type = "FREE"
                    dl = (fr - prv) / 3 if prv is not None else 1
                    dr = (nxt - fr) / 3 if nxt is not None else 1
                    kp.handle_left = (fr - dl, kp.co.y)
                    kp.handle_right = (fr + dr, kp.co.y)
            fc.update()
