"""Performance, effects timing, cameras and visibility for the lightning short.

Everything is keyed per shot (hard cuts); animation that crosses a cut is isolated by scene.py.
Car space: +X forward, +Y left (driver side), +Z up. The character is parented to an anchor that
follows the car's position (not its tilt), so poses are written in car space.
"""
import math, random
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

import anim, human
from anim import V, rot, spine, head, shoulders, fingers, legs_stand, arms_hang, hand_to, foot_to, HIP_H
from posing import aim, turn, curl_fingers
import car as C
import storm as ST
import sets as S
from timeline import FPS, END, f, s, e, w, SHOTS, SHOT, CUT_FRAMES

CAR = ST.CAR_P
DRIVE_V = 11.0                     # m/s in the opening shots
DRIVE_X0 = -60.0
LANE_Y = -1.75
DRIVE_END = SHOT["tire_roll"][1]   # parked from the next shot on


def T(name, u):
    t0, t1, _ = SHOT[name]
    return t0 + (t1 - t0) * u


def ends(name):
    t0, t1, _ = SHOT[name]
    return f(t0), f(t1) - 1


def F(name, u):
    a, b = ends(name)
    return a + int(round((b - a) * u))


def drive_pos(t):
    return Vector((DRIVE_X0 + DRIVE_V * t, LANE_Y, 0.0))


def car_pos(fr):
    t = (fr - 1) / FPS
    return drive_pos(t) if t < DRIVE_END else CAR.copy()


def flicker_seq(rnd, n, lo=0.15, hi=1.0):
    return [rnd.uniform(lo, hi) if rnd.random() > 0.25 else 0.0 for _ in range(n)]


# ============================================================================= the rig
class Rig:
    """Everything the shots animate, collected by scene.build()."""

    def __init__(self, **kw):
        self.__dict__.update(kw)
        self.flash_targets = []   # (socket_or_light, base, peak) keyed together by flash()

    # ---- lighting events
    def flash(self, frames_vals, targets=None):
        """Key all flash targets: frames_vals = [(frame, 0..1), ...]."""
        for obj, path, base, peak in (targets or self.flash_targets):
            for fr, v in frames_vals:
                val = base + (peak - base) * v
                if path == "socket":
                    ST.key_value(obj, fr, val)
                else:
                    setattr(obj, path, val); obj.keyframe_insert(path, frame=fr)


def flash_curve(f0, pattern):
    """pattern: list of intensities, one per frame starting at f0, then back to 0."""
    out = [(f0 - 1, 0.0)] + [(f0 + i, v) for i, v in enumerate(pattern)] + [(f0 + len(pattern), 0.0)]
    return out


# ============================================================================= poses (car space)
WHEEL_C = Vector((0.47, C.DRIVER_Y, 0.86))
WHEEL_UP = Vector((0.469, 0, 0.883))
SEAT_H = Vector((C.SEAT_X + 0.02, C.DRIVER_Y, 0.47))


def wheel_point(clock_deg):
    """Point on the steering-wheel rim; clock_deg 0 = top, +60 = towards the driver's left."""
    a = math.radians(clock_deg)
    return WHEEL_C + (WHEEL_UP * math.cos(a) + Vector((0, 1, 0)) * math.sin(a)) * 0.185


def seated(ch, arm, lean=-14.0, look=(8.0, 0.0), tense=0.0, hands="wheel", twist=0.0):
    """Driver pose. tense 0..1 raises the shoulders and ducks the head (flinch)."""
    spine(arm, lean + 10 * tense, twist, 0)
    shoulders(arm, 0.28 * tense, 0.02)
    for side, sg in (("Left", 1), ("Right", -1)):
        knee = Vector((0.27, C.DRIVER_Y + sg * 0.11, 0.6))
        ankle = Vector((0.6, C.DRIVER_Y + sg * 0.13, 0.36))
        foot_to(arm, side, ch.to_local(ankle), pole=(sg * 0.1, -1.0, 0.6), foot_dir=(0, -1, -0.5))
    if hands == "wheel":
        for side, sg, clock in (("Left", 1, 62 + 8 * tense), ("Right", -1, -62 - 8 * tense)):
            grip = wheel_point(clock)
            wrist = grip + Vector((-0.06, sg * 0.02, -0.03))
            hand_to(arm, side, ch.to_local(wrist), pole=(sg * 0.9, 0.4, -1.0),
                    hand_dir=ch.dir_local(Vector((0.75, -sg * 0.25, 0.45))))
        fingers(arm, 0.85)
    elif hands == "lap":
        for side, sg in (("Left", 1), ("Right", -1)):
            wrist = Vector((0.12, C.DRIVER_Y + sg * 0.12, 0.6))
            hand_to(arm, side, ch.to_local(wrist), pole=(sg * 1.0, 0.2, -1.0),
                    hand_dir=ch.dir_local(Vector((0.8, -sg * 0.3, -0.3))))
        fingers(arm, 0.5)
    head(arm, look[0] - 22 * tense, look[1], 0)


def standing(ch, arm, kind="hips", sway=0.0, look=(5.0, 0.0), k=1.0):
    legs_stand(arm, 0.08)
    if kind == "stretch":
        spine(arm, -10 * k, 0, 0)
        shoulders(arm, 0.3 * k, 0.0)
        for side, sg in (("Left", 1), ("Right", -1)):
            aim(arm, f"{side}Arm", (sg * 0.35, 0.05, 1.0 * k - (1 - k) * 0.8))
            aim(arm, f"{side}ForeArm", (sg * 0.15, 0.08, 1.0 * k - (1 - k) * 0.5))
            aim(arm, f"{side}Hand", (sg * 0.1, 0.1, 1.0))
        fingers(arm, 0.3)
        head(arm, 18 * k, 0, 0)
        return
    spine(arm, -6, sway, 0)
    shoulders(arm, 0.05, -0.05)
    for side, sg in (("Left", 1), ("Right", -1)):
        hand_to(arm, side, (sg * 0.19, 0.02, 1.0), pole=(sg * 1.0, 0.7, 0.0), hand_dir=(-sg * 0.4, 0.5, -1))
    fingers(arm, 0.6)
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

    def stand(self, fr, loc, yaw, **kw):
        self.pose(fr, loc, lambda ch, arm: standing(ch, arm, **kw), yaw)

    def face(self, fr, **wts):
        self.ch.face(fr, **wts)


# ============================================================================= performance + effects
def perform(rig):
    sc = bpy.context.scene
    ch, car, conv = rig.ch, rig.car, rig.conv
    p = Perf(ch)
    rnd = random.Random(21)

    # ---- car motion: drive in the opening, then parked on the shoulder
    root = car["root"]
    a0, b0 = 1, f(DRIVE_END) - 1
    for fr in (a0, b0):
        root.location = drive_pos((fr - 1) / FPS); root.keyframe_insert("location", frame=fr)
        rig.anchor.location = root.location; rig.anchor.keyframe_insert("location", frame=fr)
        for wh in car["wheels"]:
            wh["root"].rotation_euler = (0, root.location.x / C.WHEEL_R, 0)
            wh["root"].keyframe_insert("rotation_euler", frame=fr)
    for o in [root, rig.anchor] + [wh["root"] for wh in car["wheels"]]:
        ST.set_interp(o, "LINEAR")
    fr = b0 + 1
    root.location = CAR; root.keyframe_insert("location", frame=fr)
    rig.anchor.location = CAR; rig.anchor.keyframe_insert("location", frame=fr)
    for wh in car["wheels"]:
        wh["root"].rotation_euler = (0, 0, 0); wh["root"].keyframe_insert("rotation_euler", frame=fr)
    for o in [root, rig.anchor] + [wh["root"] for wh in car["wheels"]]:
        ST.set_interp(o, "LINEAR")
        for fc in ST._fcurves(o.animation_data.action):
            for kp in fc.keyframe_points:
                if kp.co.x == b0:
                    kp.interpolation = "CONSTANT"
    # wipers sweep while driving (and once in driver_flash), parked = resting
    tilt = Quaternion((0, 1, 0), math.radians(-32))
    for piv in car["wipers"]:
        piv.rotation_mode = "QUATERNION"
        for fr in range(1, b0 + 2, 2):
            ph = (fr - 1) / FPS * 2 * math.pi / 1.3
            ang = math.radians(4 + 78 * (0.5 - 0.5 * math.cos(ph)))
            piv.rotation_quaternion = tilt @ Quaternion((0, 0, 1), ang)
            piv.keyframe_insert("rotation_quaternion", frame=fr)
        piv.rotation_quaternion = tilt @ Quaternion((0, 0, 1), math.radians(4))
        piv.keyframe_insert("rotation_quaternion", frame=b0 + 2)

    # ---- driver performance (storm part)
    a, b = ends("aerial_drive"); p.seat(a); p.seat(b, look=(6, 6))
    p.face(a, calm=0.4); p.face(b, worry=0.3)
    a, b = ends("driver_flash"); p.seat(a, look=(8, -4)); p.seat(a + 4, look=(14, -10), tense=0.4); p.seat(b, look=(12, -8), tense=0.3)
    p.face(a, worry=0.4); p.face(a + 3, shock=0.9); p.face(b, worry=0.8)
    a, b = ends("tire_roll"); p.seat(a, tense=0.2); p.seat(b, tense=0.2, look=(10, 4))
    a, b = ends("xray_reveal"); p.seat(a, hands="lap", look=(2, 0)); p.seat(b, hands="lap", look=(4, 6))
    p.face(a, worry=0.5); p.face(b, worry=0.6)
    for name in ("strike_wide", "antenna_hit", "xray_current", "tire_blast"):
        a, b = ends(name)
        p.seat(a, hands="lap", tense=1.0); p.seat(b, hands="lap", tense=0.95, look=(-6, 4))
        p.face(a, strain=1.0, blink=0.8); p.face(b, strain=1.0, blink=0.9)
    a, b = ends("xray_cabin"); p.seat(a, hands="lap", tense=1.0); p.seat(b, hands="lap", tense=0.9, look=(-4, -6))
    p.face(a, strain=1.0, blink=0.9); p.face(b, strain=0.9, blink=0.9)
    a, b = ends("driver_xray"); p.seat(a, hands="lap", tense=0.9); p.seat(F("driver_xray", 0.6), hands="lap", tense=0.7, look=(2, 10))
    p.seat(b, hands="lap", tense=0.6, look=(4, 14))
    p.face(a, strain=0.8, blink=0.9); p.face(F("driver_xray", 0.6), shock=0.7); p.face(b, worry=0.8)
    a, b = ends("car_smoke"); p.seat(a, hands="lap", tense=0.3, look=(2, 20)); p.seat(b, hands="lap", tense=0.2, look=(0, 28))
    p.face(a, worry=0.9); p.face(b, worry=1.0)
    a, b = ends("dash"); p.seat(a, hands="lap", look=(-10, -10)); p.seat(b, hands="lap", look=(-14, -18), tense=0.3)
    p.face(a, shock=0.8); p.face(F("dash", 0.6), shock=1.0); p.face(b, worry=0.9)
    a, b = ends("driver_fine"); p.seat(a, hands="lap", look=(0, 30)); p.seat(F("driver_fine", 0.5), hands="lap", lean=-18, look=(4, 34))
    p.seat(b, hands="lap", lean=-18, look=(4, 36))
    p.face(a, exhale=0.9); p.face(F("driver_fine", 0.5), calm=0.6); p.face(b, smug=0.8)
    a, b = ends("window_rain"); p.seat(a, hands="lap", lean=-18, look=(2, 40)); p.seat(b, hands="lap", lean=-18, look=(-2, 44))
    p.face(a, smug=0.6); p.face(F("window_rain", 0.5), smug=0.9, blink=0.0); p.face(b, smug=0.9)
    for name in ("tire_macro", "arc_jump", "shell_paint", "bolt_sky", "bolt_macro", "sun", "antenna_melt", "tire_pop",
                 "glass", "roof_crane", "convertible", "conv_xray"):
        a, b = ends(name)
        p.seat(a, hands="lap", tense=0.4 if name in ("antenna_melt", "tire_pop", "glass") else 0.0)
        p.face(a, worry=0.7)

    # ---- dawn: standing by the driver door
    DSTAND = Vector((0.45, 1.62, 0.0))
    def yaw_to(pt):
        d = Vector((pt[0], pt[1], 0.0)) - DSTAND
        return math.degrees(math.atan2(d.x, -d.y))
    yaw_cam = yaw_to((2.2, 4.6))
    a, b = ends("dawn_wide")
    p.stand(a, DSTAND, yaw_cam, kind="stretch", k=0.3); p.stand(F("dawn_wide", 0.45), DSTAND, yaw_cam, kind="stretch", k=1.0)
    p.stand(b, DSTAND, yaw_cam, kind="stretch", k=0.95)
    p.face(a, exhale=0.6); p.face(F("dawn_wide", 0.45), exhale=1.0); p.face(b, calm=0.8)
    a, b = ends("step_out")
    p.stand(a, DSTAND, yaw_cam, kind="stretch", k=0.6); p.stand(F("step_out", 0.35), DSTAND, yaw_cam, kind="hips", sway=-3)
    p.stand(b, DSTAND, yaw_cam, kind="hips", sway=3, look=(8, 0))
    p.face(a, calm=0.6); p.face(F("step_out", 0.4), smug=1.0); p.face(b, smug=1.0)
    a, b = ends("hubcap")
    p.stand(a, DSTAND, yaw_cam, kind="hips", sway=10, look=(-14, 40)); p.stand(F("hubcap", 0.5), DSTAND, yaw_cam, kind="hips", sway=26, look=(-12, 62))
    p.stand(b, DSTAND, yaw_cam, kind="hips", sway=30, look=(-10, 70))
    p.face(a, smug=0.6); p.face(F("hubcap", 0.4), shock=0.6); p.face(b, worry=0.9)
    a, b = ends("sag")
    p.stand(a, DSTAND, yaw_cam, kind="hips", sway=24, look=(-12, 55)); p.stand(F("sag", 0.45), DSTAND, yaw_cam, kind="hips", sway=12, look=(-14, 30))
    p.stand(F("sag", 0.7), DSTAND, yaw_cam, kind="hips", look=(4, 0)); p.stand(b, DSTAND, yaw_cam, kind="hips", look=(4, 0))
    p.face(a, worry=0.8); p.face(F("sag", 0.5), shock=0.7); p.face(F("sag", 0.72), smug=0.5, worry=0.6)
    p.face(F("sag", 0.85), blink=1.0, smug=0.4, worry=0.6); p.face(F("sag", 0.9), smug=0.5, worry=0.6); p.face(b, smug=0.5, worry=0.6)

    # ---- world mode per shot, exposure per shot
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        rig.world.set_mode(fr, st == "dawn")
        sc.view_settings.exposure = {"dawn": -0.35, "sun": -0.4}.get(st, 0.3)
        sc.view_settings.keyframe_insert("exposure", frame=fr)

    # ---- headlights / hazards / gauges ("fried" in the dash shot)
    m = car["mats"]
    hz = m["hazard"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    head_s = m["head"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    tail_s = m["tail"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    gauge_s = m["gauges"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    fry = F("dash", 0.62)
    on = True
    for fr in range(f(SHOT["tire_macro"][0]), fry, 8):
        ST.key_value(hz, fr, 8.0 if on else 0.0); on = not on
    ST.key_value(hz, fry, 0.0)
    for fr, v in ((1, 6.0), (fry - 1, 6.0), (fry, 0.0)):
        ST.key_value(head_s, fr, v); ST.key_value(tail_s, fr, v / 2)
    a, _ = ends("dash")
    seq = [6.0, 0.8, 8.0, 0.0, 5.0, 9.0, 0.0, 1.5, 7.0, 0.0, 0.0, 4.0, 0.0]
    ST.key_value(gauge_s, 1, 6.0); ST.key_value(gauge_s, a + 3, 6.0)
    for i, v in enumerate(seq):
        ST.key_value(gauge_s, a + 4 + i * 2, v)
    ST.key_value(gauge_s, fry, 0.0)
    for lamp in car["lamps"]:
        base = lamp.data.energy
        lamp.data.keyframe_insert("energy", frame=1)
        lamp.data.keyframe_insert("energy", frame=fry - 1)
        lamp.data.energy = 0.0; lamp.data.keyframe_insert("energy", frame=fry)
    for idb in [m["hazard"].node_tree, m["head"].node_tree, m["tail"].node_tree, m["gauges"].node_tree] + [l.data for l in car["lamps"]]:
        ST.set_interp(idb, "CONSTANT")
    for lamp in conv["lamps"]:
        lamp.data.energy = 0.0
    cm = conv["mats"]
    for k in ("head", "tail", "gauges"):
        cm[k].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0

    # ---- lightning flashes
    def strike_flash(f0, big=1.0, seed=0):
        r = random.Random(seed)
        pat = [1.0 * big, 0.35 * big, 0.9 * big, 0.6 * big, 0.15, 0.7 * big, 0.25, 0.1]
        pat = [v * r.uniform(0.85, 1.0) for v in pat]
        rig.flash(flash_curve(f0, pat))
        return pat

    def bolt_on(bolt_objs, f0, f1, core_peak, halo_peak, pattern=None, grow=None):
        for o in bolt_objs:
            o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
            o.hide_render = False; o.keyframe_insert("hide_render", frame=f0)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=f1 + 1)
            if grow:
                g0, g1 = grow
                o.data.bevel_factor_end = 0.0; o.data.keyframe_insert("bevel_factor_end", frame=g0)
                o.data.bevel_factor_end = 1.0; o.data.keyframe_insert("bevel_factor_end", frame=g1)
        pat = pattern or [1.0] * (f1 - f0 + 1)
        ST.key_value(rig.bolt_core, f0 - 1, 0.0); ST.key_value(rig.bolt_halo, f0 - 1, 0.0)
        for i, v in enumerate(pat):
            ST.key_value(rig.bolt_core, f0 + i, core_peak * max(v, 0.25)); ST.key_value(rig.bolt_halo, f0 + i, halo_peak * v)
        ST.key_value(rig.bolt_core, f1 + 1, 0.0); ST.key_value(rig.bolt_halo, f1 + 1, 0.0)

    # aerial: distant strike
    a, b = ends("aerial_drive")
    pat = strike_flash(a + 13, 0.7, 1)
    bolt_on(rig.bolts["far1"], a + 13, a + 18, 60, 6, [1, 0.3, 0.9, 0.5, 0.2, 0.6])
    # driver flash: lightning outside lights his face
    a, b = ends("driver_flash")
    strike_flash(a + 3, 0.9, 2)
    bolt_on(rig.bolts["far2"], a + 3, a + 8, 60, 6, [1, 0.3, 0.9, 0.5, 0.2, 0.6])
    # bolt_sky: the leader grows down over ~1.6 s, then the return stroke
    a, b = ends("bolt_sky")
    g0, g1 = a + 5, a + 44
    bolt_on(rig.bolts["hero"], g0, b, 25, 3, [0.35 + 0.1 * math.sin(i) for i in range(g1 - g0)] +
            [1.0, 0.4, 1.0, 0.7, 0.3, 0.9, 0.5] + [0.3] * (b - g1 - 6), grow=(g0, g1))
    rig.flash(flash_curve(g1, [1.0, 0.4, 1.0, 0.7, 0.3, 0.9, 0.5, 0.25, 0.1]))
    for fr in range(g0, g1, 3):
        rig.flash([(fr, 0.06 + 0.05 * rnd.random())])
    rig.flash([(g1 - 1, 0.05)])
    # the strike on the car
    a, b = ends("strike_wide")
    hit = a + 8
    strike_flash(hit, 1.0, 3)
    bolt_on(rig.bolts["strike"], hit, b, 40, 3, [1, 0.5, 1, 0.8, 0.4, 0.9, 0.6] + [0.7 + 0.3 * rnd.random() for _ in range(b - hit - 6)])
    for name, f0, pk in (("antenna_hit", None, 0.8), ("xray_current", None, 0.55), ("tire_blast", None, 0.6),
                         ("xray_cabin", None, 0.4), ("driver_xray", None, 0.4), ("bolt_macro", None, 0.7)):
        a, b = ends(name)
        pat = [pk * (0.55 + 0.45 * rnd.random()) for _ in range(b - a + 1)]
        rig.flash([(a + i, v) for i, v in enumerate(pat)] + [(b + 1, 0.0)])
        if name in ("antenna_hit", "xray_current", "bolt_macro"):
            bolt_on(rig.bolts["strike"], a, b, 30 if name != "bolt_macro" else 24, 1.2 if name == "xray_current" else 0.5,
                    [0.7 + 0.3 * rnd.random() for _ in range(b - a + 1)])
    # distant flickers in the calmer storm shots
    for name in ("shell_paint", "car_smoke", "window_rain", "convertible"):
        fr = F(name, 0.45)
        rig.flash(flash_curve(fr, [0.25, 0.08, 0.2, 0.05]))
    # convertible strike
    a, b = ends("conv_xray")
    hit = a + 6
    strike_flash(hit, 1.0, 4)
    bolt_on(rig.bolts["conv"], hit, b, 40, 3, [1, 0.5, 1, 0.8] + [0.6 + 0.4 * rnd.random() for _ in range(b - hit - 3)])

    # ---- current through the shell
    def current(curves, f_start, grow=5, stagger=4, hold_to=None, order_gap=6, mat_strength=None):
        for o, order in curves:
            g0 = f_start + order * order_gap + rnd.randint(0, stagger)
            o.data.bevel_factor_end = 0.0; o.data.keyframe_insert("bevel_factor_end", frame=g0)
            o.data.bevel_factor_end = 1.0; o.data.keyframe_insert("bevel_factor_end", frame=g0 + grow)
            if hold_to:
                o.data.keyframe_insert("bevel_factor_end", frame=hold_to)

    def show(objs, f0, f1):
        for o in objs:
            o.hide_render = False; o.keyframe_insert("hide_render", frame=f0)
            o.hide_render = True; o.keyframe_insert("hide_render", frame=f1 + 1)

    net = rig.net
    for o, _ in net:
        o.hide_render = True; o.keyframe_insert("hide_render", frame=1)
    a, b = ends("arc_jump")
    tire_fl = [(o, 0) for o, order in net if order >= 2 and o.name in rig.fl_paths]
    show([o for o, _ in tire_fl], a + 4, b); current(tire_fl, a + 4, grow=3, order_gap=0)
    a, b = ends("antenna_hit")
    roof = [(o, order) for o, order in net if order <= 1]
    show([o for o, _ in roof], a + 2, b); current(roof, a + 2, grow=14, order_gap=5)
    a, b = ends("xray_current")
    show([o for o, _ in net], a, b); current(net, a, grow=9, order_gap=8)
    a, b = ends("tire_blast")
    low = [(o, order - 2) for o, order in net if order >= 2]
    show([o for o, _ in net], a, b); current(low, a + 4, grow=5, order_gap=6)
    for name in ("xray_cabin", "driver_xray"):
        a, b = ends(name)
        show([o for o, _ in net], a, b); current([(o, 0) for o, _ in net], a, grow=2, order_gap=0)
    cur_s = rig.cur_strength
    ST.key_value(cur_s, 1, 0.0)
    for name in ("arc_jump", "antenna_hit", "xray_current", "tire_blast", "xray_cabin", "driver_xray"):
        a, b = ends(name)
        for fr in range(a, b + 1):
            ST.key_value(cur_s, fr, 18 + 22 * rnd.random() if rnd.random() > 0.12 else 4.0)
    # convertible: red current straight through the cabin
    a, b = ends("conv_xray")
    show([o for o, _ in rig.conv_net], a + 6, b); current(rig.conv_net, a + 7, grow=6, order_gap=5)
    for fr in range(a, b + 1):
        ST.key_value(rig.danger_strength, fr, 14 + 18 * rnd.random())
    ST.key_value(rig.danger_strength, 1, 0.0)

    # ---- strike light at the antenna
    sl = rig.strike_light.data
    sl.energy = 0.0; sl.keyframe_insert("energy", frame=1)
    for name, k in (("strike_wide", 1.0), ("antenna_hit", 0.5), ("xray_current", 0.35), ("tire_blast", 0.3),
                    ("xray_cabin", 0.25), ("driver_xray", 0.25), ("bolt_macro", 0.3)):
        a, b = ends(name)
        start = a + 8 if name == "strike_wide" else a
        sl.energy = 0.0; sl.keyframe_insert("energy", frame=start - 1)
        for fr in range(start, b + 1):
            sl.energy = 5000 * k * (0.4 + 0.6 * rnd.random()); sl.keyframe_insert("energy", frame=fr)
        sl.energy = 0.0; sl.keyframe_insert("energy", frame=b + 1)
    cl = rig.conv_light.data
    cl.energy = 0.0; cl.keyframe_insert("energy", frame=1)
    a, b = ends("conv_xray")
    for fr in range(a + 6, b + 1):
        cl.energy = 3000 * (0.4 + 0.6 * rnd.random()); cl.keyframe_insert("energy", frame=fr)
    cl.energy = 0.0; cl.keyframe_insert("energy", frame=b + 1)
    for idb in (sl, cl):
        ST.set_interp(idb, "CONSTANT")

    # ---- sparks, steam and smoke
    sp = rig.spark_mat
    tip_w = car["antenna_tip"]
    ST.spark_burst("SparkAnt", Vector((tip_w.x + 0.14, 0, C.cab_top(-0.55) + 0.04)), F("antenna_hit", 0.08), 36, sp,
                   rig.fx, car["root"], speed=(1.0, 3.5), bias=Vector((0, 0, 1)), spread=0.9, seed=1)
    for i, wh in enumerate(car["wheels"]):
        side = wh["side"]; x = C.AXLE if "WheelF" in wh["root"].name else -C.AXLE
        contact = Vector((x + 0.05, side * (C.TRACK + 0.12), 0.02))
        ST.spark_burst(f"SparkTire{i}", contact, F("tire_blast", 0.2) + i, 26, sp, rig.fx, car["root"],
                       speed=(1.5, 4.0), bias=Vector((0, side * 0.6, 1)), spread=0.8, seed=10 + i)
        ST.smoke(f"Steam{i}", contact + Vector((0, side * 0.1, 0)), F("tire_blast", 0.25), ends("tire_blast")[1] + 10, 6,
                 rig.smoke_mat, rig.fx, car["root"], rise=0.7, size=(0.08, 0.45), seed=20 + i, opacity=0.55)
    fl = car["wheels"][0]
    ST.spark_burst("SparkArc", Vector((C.AXLE + 0.05, C.TRACK + 0.12, 0.02)), F("arc_jump", 0.2), 20, sp, rig.fx,
                   car["root"], speed=(1.0, 3.0), bias=Vector((0, 0.6, 1)), spread=0.9, seed=30)
    # smoke after the strike: antenna base and the bonnet seams
    a, b = ends("car_smoke")
    ST.smoke("SmokeAnt", Vector((-0.6, 0, C.cab_top(-0.55) + 0.05)), a - 2, b + 6, 6, rig.smoke_mat, rig.fx, car["root"],
             rise=1.0, size=(0.05, 0.4), seed=40, opacity=0.35)
    ST.smoke("SmokeHood", Vector((1.6, 0, C.top(1.6) + 0.05)), a, b + 6, 8, rig.smoke_mat, rig.fx, car["root"],
             rise=1.0, size=(0.1, 0.6), seed=41, opacity=0.5)
    # antenna melt: glow + droop
    a, b = ends("antenna_melt")
    ant = car["antenna"]
    kb = ant.data.shape_keys.key_blocks["Melt"]
    kb.value = 0.0; kb.keyframe_insert("value", frame=1); kb.keyframe_insert("value", frame=a + 2)
    kb.value = 1.0; kb.keyframe_insert("value", frame=b - 2)
    glow = car["mats"]["antenna"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    ST.key_value(glow, 1, 0.0); ST.key_value(glow, a, 3.0); ST.key_value(glow, b - 6, 25.0); ST.key_value(glow, b + 1, 3.0)
    ST.key_value(glow, ends("dawn_wide")[0], 0.0)
    ST.smoke("SmokeMelt", Vector((-0.75, 0, C.cab_top(-0.55) + 0.3)), a + 4, b + 4, 6, rig.smoke_mat, rig.fx, car["root"],
             rise=0.8, size=(0.04, 0.3), seed=42, opacity=0.5)
    ST.spark_burst("SparkMelt", Vector((-0.66, 0, C.cab_top(-0.55) + 0.25)), a + 10, 12, sp, rig.fx, car["root"],
                   speed=(0.3, 1.0), bias=Vector((0, 0, -1)), spread=0.6, seed=43, life=(8, 16))
    # tire pop (front left): flat in a few frames, rubber dust puff
    a, b = ends("tire_pop")
    pop = a + 6
    fl_tire = car["wheels"][0]["tire"]
    k = fl_tire.data.shape_keys.key_blocks["Flat"]
    k.value = 0.0; k.keyframe_insert("value", frame=1); k.keyframe_insert("value", frame=pop)
    k.value = 1.0; k.keyframe_insert("value", frame=pop + 5)
    ST.smoke("PopPuff", Vector((C.AXLE, C.TRACK + 0.15, 0.15)), pop, b + 6, 7, rig.smoke_mat, rig.fx, car["root"],
             rise=0.4, size=(0.05, 0.5), seed=50, opacity=0.8, drift=Vector((0, 0.5, 0)))
    ST.spark_burst("Rubber", Vector((C.AXLE, C.TRACK + 0.12, 0.1)), pop, 18, rig.rubber_mat, rig.fx, car["root"],
                   speed=(1.5, 4.0), bias=Vector((0, 1, 0.6)), spread=0.7, seed=51, length=0.03)
    # rear window shatter (slow motion)
    a, b = ends("glass")
    burst = a + 3
    rear = car["rear"]
    rear.hide_render = False; rear.keyframe_insert("hide_render", frame=1)
    rear.hide_render = True; rear.keyframe_insert("hide_render", frame=burst)
    for i, sh in enumerate(rig.shards):
        sh.hide_render = True; sh.keyframe_insert("hide_render", frame=1)
        sh.hide_render = False; sh.keyframe_insert("hide_render", frame=burst)
        sh.hide_render = True; sh.keyframe_insert("hide_render", frame=b + 1)
        p0 = sh.location.copy()
        nrm = Vector((-0.75, 0, 0.66))
        v0 = (nrm * rnd.uniform(0.6, 1.6) + Vector((rnd.uniform(-0.3, -0.05), rnd.uniform(-0.6, 0.6), rnd.uniform(0, 0.6))))
        spin = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 6
        for k2 in range(0, b - burst + 2, 2):
            t = k2 / FPS
            sh.location = p0 + v0 * t + Vector((0, 0, -0.5 * 3.0 * t * t))
            sh.rotation_euler = Euler(spin * t)
            sh.keyframe_insert("location", frame=burst + k2); sh.keyframe_insert("rotation_euler", frame=burst + k2)
    ST.spark_burst("GlassGlint", Vector((-1.25, 0, 1.15)), burst, 16, rig.glint_mat, rig.fx, car["root"],
                   speed=(0.3, 1.2), bias=Vector((-0.7, 0, 0.6)), spread=0.8, seed=60, life=(10, 24), gravity=3.0, length=0.02)
    # dashboard sparks
    a, b = ends("dash")
    ST.spark_burst("SparkDash", Vector((0.68, 0.0, 0.84)), a + 8, 22, sp, rig.fx, car["root"],
                   speed=(0.5, 2.0), bias=Vector((-1, 0, 0.6)), spread=0.7, seed=70)
    ST.spark_burst("SparkDash2", Vector((0.69, C.DRIVER_Y, 0.88)), fry - 2, 16, sp, rig.fx, car["root"],
                   speed=(0.5, 1.8), bias=Vector((-1, 0, 0.5)), spread=0.7, seed=71)
    ST.smoke("SmokeDash", Vector((0.66, 0.1, 0.9)), fry, b + 4, 5, rig.smoke_mat, rig.fx, car["root"],
             rise=0.25, size=(0.03, 0.2), seed=72, opacity=0.35)
    # rain hitting the roof
    a, b = ends("roof_crane")
    rr = random.Random(80)
    pts = []
    for i in range(70):
        x = rr.uniform(C.ROOF_R + 0.1, C.ROOF_F - 0.05); y = rr.uniform(-0.55, 0.55)
        pts.append(Vector((x, y, C.cab_top(x) + 0.015)))
    for i in range(40):
        x = rr.uniform(1.15, 2.1); y = rr.uniform(-0.7, 0.7)
        pts.append(Vector((x, y, C.top(x) + 0.01)))
    ST.splash_pops("Splash", pts, (a, b + 1), rig.fx, car["root"], seed=81)
    # dawn: lingering wisps from the bonnet
    a, b = ends("dawn_wide")
    ST.smoke("Wisp", Vector((1.5, 0, C.top(1.5) + 0.04)), a, int(END * FPS), 5, rig.smoke_mat, rig.fx, car["root"],
             rise=0.9, size=(0.04, 0.28), seed=90, opacity=0.2)

    # ---- the punchline: hubcap rolls away, last tire goes flat, the car sags
    rr_w = car["wheels"][2]            # rear left (road side)
    hub = rr_w["hubcap"]
    a, b = ends("hubcap")
    pop = a + 8
    hub.rotation_mode = "YXZ"           # spin about its own axle first, then lean, then heading
    hub.keyframe_insert("location", frame=pop - 1); hub.keyframe_insert("rotation_euler", frame=pop - 1)
    centre = rr_w["root"].location.copy()
    n = b - pop + 14
    for k2 in range(0, n + 1, 2):
        t = k2 / n
        dist = 3.6 * (1 - (1 - t) ** 1.8)
        heading = math.radians(-48) * t ** 1.3          # curves out towards +Y (the road)
        loc = Vector((-dist * math.cos(heading * 0.6), 0.12 + dist * 0.62 * t ** 0.9, -0.13 * t ** 4))
        lean = math.radians(80) * t ** 4
        hub.location = loc
        hub.rotation_euler = (lean, -dist / 0.2, heading)
        hub.keyframe_insert("location", frame=pop + k2); hub.keyframe_insert("rotation_euler", frame=pop + k2)
    a, b = ends("sag")
    k = rr_w["tire"].data.shape_keys.key_blocks["Flat"]
    k.value = 0.0; k.keyframe_insert("value", frame=1); k.keyframe_insert("value", frame=a + 4)
    k.value = 1.0; k.keyframe_insert("value", frame=a + 22)
    root.rotation_euler = (0, 0, 0); root.keyframe_insert("rotation_euler", frame=1)
    # front-left already flat: slight nose-left dip from the dawn shots on
    da = ends("dawn_wide")[0]
    root.rotation_euler = (math.radians(-0.9), math.radians(0.7), 0); root.keyframe_insert("rotation_euler", frame=da)
    root.keyframe_insert("rotation_euler", frame=a + 4)
    root.rotation_euler = (math.radians(-3.6), math.radians(-0.4), 0); root.keyframe_insert("rotation_euler", frame=a + 24)
    root.location = CAR; root.keyframe_insert("location", frame=da)
    root.keyframe_insert("location", frame=a + 4)
    root.location = CAR + Vector((0, 0, -0.08)); root.keyframe_insert("location", frame=a + 24)
    # antenna gives up completely
    kb.value = 1.0; kb.keyframe_insert("value", frame=a + 26)
    return p


def wh_offset(wh):
    """Hubcap parent is the wheel root; convert car-space points to wheel-root space."""
    return wh["root"].location


# ============================================================================= cameras
def _look(loc, tgt, roll=0.0):
    q = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll:
        e.rotate_axis("Z", math.radians(roll))
    return e


def _ease(u):
    return u * u * (3 - 2 * u)


def lerp(a, b, u):
    return Vector(a).lerp(Vector(b), u)


def cam_plan():
    """name -> (lens, fn(u, fr) -> (loc, tgt), fstop, shake, roll)."""
    cw = lambda p: CAR + Vector(p)
    def moving(p):     # car space -> world, following the driving car
        return lambda fr: car_pos(fr) + Vector(p)
    tip = CAR + Vector(C_TIP[0])
    hero_top = HERO[0]; hero_end = HERO[1]
    plan = {
        "aerial_drive": (24, lambda u, fr: (car_pos(fr) + lerp((-15, 9, 10.5), (-10, 8, 8.0), u),
                                            car_pos(fr) + Vector((7, -1.5, -0.5))), None, 0.6, 0),
        "driver_flash": (28, lambda u, fr: (car_pos(fr) + lerp((1.95, 0.55, 1.18), (1.85, 0.42, 1.16), u),
                                            car_pos(fr) + Vector((-0.1, 0.37, 1.12))), 2.8, 0.4, 0),
        "tire_roll": (30, lambda u, fr: (car_pos(fr) + lerp((2.4, 2.05, 0.22), (1.9, 1.75, 0.2), u),
                                         car_pos(fr) + Vector((1.1, 0.9, 0.3))), 3.5, 0.5, 0),
        "bolt_sky": (20, lambda u, fr: (cw((3.0, -2.5, 1.6)),
                                        cw((3.0, -2.5, 1.6)) + lerp((0.12, 0.42, 1.0), (0.3, 1.0, 0.16), _ease(u)) * 10), None, 0.3, 0),
        "tire_macro": (45, lambda u, fr: (cw(lerp((2.35, 1.5, 0.16), (2.15, 1.38, 0.15), u)), cw((1.45, 0.93, 0.24))), 2.0, 0.2, 0),
        "arc_jump": (35, lambda u, fr: (cw(lerp((2.3, 2.4, 0.5), (2.15, 2.25, 0.45), u)), cw((1.4, 0.95, 0.35))), 3.0, 0.4, 0),
        "shell_paint": (32, lambda u, fr: (cw(lerp((2.4, 1.55, 0.95), (-1.2, 1.5, 1.25), _ease(u))), cw(lerp((0.9, 0.8, 0.85), (-1.9, 0.75, 1.05), _ease(u)))), 3.5, 0.2, 0),
        "xray_reveal": (30, lambda u, fr: (cw((5.2 * math.cos(math.radians(35 + 40 * u)), 5.2 * math.sin(math.radians(35 + 40 * u)), 2.1)), cw((0, 0, 0.85))), None, 0.2, 0),
        "strike_wide": (22, lambda u, fr: (cw(lerp((9.5, 6.8, 1.3), (8.8, 6.3, 1.25), u)), cw((-1.0, 0, 2.6))), None, 0.6, 0),
        "antenna_hit": (30, lambda u, fr: (cw(lerp((0.9, 1.9, 2.25), (0.75, 1.75, 2.15), u)), cw((-0.6, 0, 1.75))), 2.2, 0.8, 0),
        "xray_current": (28, lambda u, fr: (cw(lerp((4.0, 4.4, 3.4), (3.4, 4.0, 3.1), u)), cw((0, 0, 0.8))), None, 0.5, 0),
        "tire_blast": (24, lambda u, fr: (cw(lerp((2.7, 2.5, 0.3), (2.55, 2.35, 0.28), u)), cw((1.3, 0.9, 0.3))), 4.0, 1.0, 0),
        "xray_cabin": (32, lambda u, fr: (cw(lerp((-0.4, 3.6, 1.25), (0.0, 3.4, 1.2), u)), cw((-0.1, 0.2, 0.95))), None, 0.4, 0),
        "driver_xray": (40, lambda u, fr: (cw(lerp((0.9, 2.2, 1.35), (0.7, 2.0, 1.3), u)), cw((-0.15, 0.37, 1.05))), 3.0, 0.4, 0),
        "car_smoke": (30, lambda u, fr: (cw(lerp((5.6, 3.8, 1.6), (5.1, 3.5, 1.55), u)), cw((0, 0, 1.0))), None, 0.3, 0),
        "bolt_macro": (35, lambda u, fr: (MACRO_PT[0] + lerp((2.7, 2.2, 0.2), (2.3, 1.9, 0.1), u), MACRO_PT[0]), 2.0, 0.6, 0),
        "sun": (35, lambda u, fr: (ST.SUN_P + lerp((0, -900, 40), (0, -760, 30), u), ST.SUN_P + Vector((0, 0, 30))), None, 0.0, 0),
        "antenna_melt": (60, lambda u, fr: (cw(lerp((0.3, 0.95, 2.05), (0.2, 0.85, 2.0), u)), cw((-0.75, 0, 1.68))), 2.5, 0.2, 0),
        "tire_pop": (35, lambda u, fr: (cw(lerp((2.6, 2.15, 0.5), (2.5, 2.05, 0.48), u)), cw((1.375, 0.85, 0.3))), 3.2, 0.6, 0),
        "glass": (30, lambda u, fr: (cw(lerp((-4.6, 1.9, 2.3), (-4.4, 1.7, 2.2), u)), cw((-1.3, 0, 1.15))), 4.5, 0.4, 0),
        "dash": (18, lambda u, fr: (cw(lerp((-0.32, -0.45, 1.2), (-0.27, -0.43, 1.19), u)), cw((0.18, 0.4, 1.0))), 1.6, 0.3, 0),
        "driver_fine": (35, lambda u, fr: (cw(lerp((2.4, 0.5, 1.35), (2.2, 0.45, 1.3), u)), cw((-0.1, 0.37, 1.1))), 3.0, 0.2, 0),
        "window_rain": (45, lambda u, fr: (cw(lerp((-0.05, 1.75, 1.18), (0.0, 1.6, 1.16), u)), cw((-0.15, 0.37, 1.08))), 2.2, 0.2, 0),
        "roof_crane": (28, lambda u, fr: (cw(lerp((0.2, 2.6, 1.2), (-0.1, 1.5, 3.4), _ease(u))), cw(lerp((-0.2, 0.3, 1.2), (-0.25, 0.0, 1.35), _ease(u)))), None, 0.2, 0),
        "convertible": (28, lambda u, fr: (ST.CONV_P + lerp((4.6, 3.6, 1.9), (3.2, 4.3, 2.1), _ease(u)), ST.CONV_P + lerp((-0.2, 0.0, 0.95), (-0.5, 0.0, 1.05), _ease(u))), None, 0.2, 0),
        "conv_xray": (28, lambda u, fr: (ST.CONV_P + lerp((4.2, 4.4, 3.3), (3.6, 4.0, 3.0), u), ST.CONV_P + Vector((0, 0, 0.8))), None, 0.5, 0),
        "dawn_wide": (24, lambda u, fr: (cw(lerp((9.5, 7.8, 1.6), (8.8, 7.2, 1.5), u)), cw((0.0, 0.6, 0.9))), None, 0.15, 0),
        "step_out": (40, lambda u, fr: (cw(lerp((2.6, 5.2, 1.45), (2.4, 4.8, 1.4), u)), cw((0.45, 1.62, 1.25))), 4.0, 0.15, 0),
        "hubcap": (28, lambda u, fr: (cw(lerp((-6.9, 4.0, 1.45), (-6.6, 3.8, 1.4), u)), cw(lerp((-1.4, 1.3, 0.45), (-3.8, 2.4, 0.22), _ease(u)))), 5.0, 0.3, 0),
        "sag": (22, lambda u, fr: (cw(lerp((3.4, 8.4, 1.4), (3.1, 7.9, 1.36), u)), cw((-1.0, 0.6, 0.7))), None, 0.15, 0),
    }
    return plan


C_TIP = [None]       # set by scene.build(): (antenna tip in car space,)
MACRO_PT = [None]    # a point on the strike channel ~2.5 m above the antenna (world)
HERO = [None, None]  # hero bolt top / end (world)


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
        cd.clip_start = 0.02; cd.clip_end = 6000 if st == "sun" else 3000
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
    """groups: {kind: objects}; kinds map to the shot sets in which they render."""
    shows = {
        "env": {"storm", "xray", "conv", "conv_xray", "dawn"},
        "sedan_paint": {"storm", "dawn"},
        "sedan_xray": {"xray"},
        "sedan_rest": {"storm", "xray", "dawn"},
        "conv_paint": {"conv"},
        "conv_xray": {"conv_xray"},
        "conv_rest": {"conv", "conv_xray"},
        "driver": {"storm", "xray", "dawn"},
        "sun": {"sun"},
    }
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        for kind, objs in groups.items():
            if kind == "clouds":
                show = name == "bolt_sky"
            else:
                show = st in shows[kind]
            for o in objs:
                o.hide_render = not show
                o.keyframe_insert("hide_render", frame=fr)


def rain_visibility(cams, rain):
    """rain: {shot: [planes]} visible only in their own shot."""
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
