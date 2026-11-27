"""Performance, machinery animation, cameras and visibility for the pool short (see timeline.py)."""
import math, random
import bpy
from mathutils import Vector, Euler, Matrix, Quaternion

import sets as S
import storm as ST
import anim
import posing
import car as C
from anim import hand_to, foot_to, spine, head, shoulders, fingers, rot, aim, arms_hang, legs_stand
import yard as Y
from timeline import FPS, SHOTS, SHOT, END, f


# ============================================================================= timing
def T(name, u):
    t0, t1, _ = SHOT[name]
    return t0 + (t1 - t0) * u


def ends(name):
    t0, t1, _ = SHOT[name]
    return f(t0), f(t1) - 1


def F(name, u):
    a, b = ends(name)
    return a + int(round((b - a) * u))


def _ease(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def _out(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 2


def _in(u):
    u = min(1.0, max(0.0, u))
    return u * u


def lerp(a, b, u):
    return Vector(a).lerp(Vector(b), u)


def V(*a):
    return Vector(a if len(a) == 3 else a[0])


def fwd(yaw):
    r = math.radians(yaw)
    return Vector((math.sin(r), -math.cos(r), 0))


def left(yaw):
    r = math.radians(yaw)
    return Vector((math.cos(r), math.sin(r), 0))


def yaw_to(src, dst):
    d = Vector(dst).to_2d() - Vector(src).to_2d()
    return math.degrees(math.atan2(d.x, -d.y))


# ============================================================================= actor
class Actor(anim.Character):
    def __init__(self, data):
        super().__init__(data)
        self.data = data
        self.hip = self.arm.data.bones["mixamorig:Hips"].head_local.z

    def pose(self, fr, loc, yaw, body, seated=False, pitch=0.0):
        """seated: loc is the world position of the hips; else loc is the floor point under the feet."""
        self.begin(fr)
        self.place(fr, V(loc), yaw, pitch, 0, self.hip if seated else None)
        self.yaw = yaw
        self.hips_w = V(loc) if seated else V(loc) + Vector((0, 0, self.hip))
        body(self)
        self.key(fr)

    def hand(self, side, world, pole=None, dir_world=None):
        sg = 1 if side == "Left" else -1
        pole = pole or (sg * 1.0, 0.35, -1.0)
        hand_to(self.arm, side, self.to_local(V(world)), pole=pole,
                hand_dir=self.dir_local(V(dir_world)) if dir_world is not None else None)

    def foot(self, side, world, foot_dir=(0, -1, -0.3), pole=None):
        sg = 1 if side == "Left" else -1
        foot_to(self.arm, side, self.to_local(V(world)), pole=pole or (sg * 0.1, -1.0, 0.6), foot_dir=foot_dir)

    def W(self, fx, lx, z):
        p = self.hips_w + fwd(self.yaw) * fx + left(self.yaw) * lx
        p.z = z
        return p


def show_in(objs, shots_visible):
    for name, t0, t1, v in SHOTS:
        show = name in shots_visible
        for o in objs:
            o.hide_render = not show
            o.keyframe_insert("hide_render", frame=f(t0))


def key_xf(obj, fr, loc=None, rot=None, scale=None):
    if loc is not None:
        obj.location = V(loc); obj.keyframe_insert("location", frame=fr)
    if rot is not None:
        obj.rotation_euler = rot; obj.keyframe_insert("rotation_euler", frame=fr)
    if scale is not None:
        obj.scale = (scale,) * 3 if isinstance(scale, (int, float)) else scale
        obj.keyframe_insert("scale", frame=fr)


def bone_world(arm, bone):
    bpy.context.view_layer.update()
    return arm.matrix_world @ arm.pose.bones[bone].matrix


# ============================================================================= body poses
def stand(a, look=(0, 0), arms="hang", lean=0, sway=0, spread=0.07):
    legs_stand(a.arm, spread)
    spine(a.arm, lean, sway, 0)
    if arms == "hang":
        arms_hang(a.arm, 0.0)
        fingers(a.arm, 0.5)
    elif arms == "hips":
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.02, sg * 0.2, a.hips_w.z + 0.03), pole=(sg * 1.0, 0.8, 0.0),
                   dir_world=fwd(a.yaw) * 0.4 + left(a.yaw) * (-sg * 0.5) + Vector((0, 0, -1)))
        fingers(a.arm, 0.6)
    head(a.arm, look[0], look[1], 0)


def lie(a, look=(0, 0), arms="head"):
    """On the lounger: body pitched back about the hips, legs along the seat."""
    for side, sg in (("Left", 1), ("Right", -1)):
        ankle = a.hips_w + fwd(a.yaw) * 0.92 + left(a.yaw) * (sg * 0.1)
        ankle.z = a.hips_w.z + 0.02
        knee_up = Vector((0, 0, 1))
        a.foot(side, ankle, (0, -0.3, 1.0), pole=(sg * 0.1, -1.0, 0.9))
    if arms == "head":
        for side, sg in (("Left", 1), ("Right", -1)):
            hd = bone_world(a.arm, "mixamorig:Head").translation
            a.hand(side, hd + left(a.yaw) * (sg * 0.1) - fwd(a.yaw) * 0.08 + Vector((0, 0, 0.02)), pole=(sg * 1.0, 0.6, 0.6),
                   dir_world=-left(a.yaw) * sg + Vector((0, 0, 0.2)))
        fingers(a.arm, 0.4)
    elif arms == "rest":
        for side, sg in (("Left", 1), ("Right", -1)):
            p = a.hips_w + fwd(a.yaw) * 0.12 + left(a.yaw) * (sg * 0.27)
            p.z = a.hips_w.z + 0.02
            a.hand(side, p, pole=(sg * 1.0, 0.2, -1.0), dir_world=fwd(a.yaw) + Vector((0, 0, -0.2)))
        fingers(a.arm, 0.6)
    head(a.arm, look[0], look[1], 0)


# ============================================================================= the machinery helpers
def key_tub(R, fr, lift_z):
    R["tub"]["root"].location = (0, 0, lift_z); R["tub"]["root"].keyframe_insert("location", index=2, frame=fr)
    for r in R["rams"]:
        r.key(fr, max(0.0, lift_z))


def key_car(R, fr, loc, roll_dist=None):
    car = R["car"]["root"]
    car.location = V(loc); car.keyframe_insert("location", frame=fr)
    if roll_dist is not None:
        for wh in R["car"]["wheels"]:
            wr = wh["root"]
            wr.rotation_euler.y = roll_dist / C.WHEEL_R
            wr.keyframe_insert("rotation_euler", index=1, frame=fr)


def key_value(sock, fr, v):
    sock.default_value = v; sock.keyframe_insert("default_value", frame=fr)


# ============================================================================= the performance
def perform(rig):
    R = rig["yard"]
    B, N = rig["builder"], rig["neighbor"]
    sc = bpy.context.scene

    # ---------------------------------------------------------------- state across the film
    # tub: up in the hook, down for the build, up in rise..carup..driveout, sinks in sink
    a, b = ends("hook")
    key_tub(R, a, Y.RISE - 0.9); key_tub(R, b, Y.RISE)
    key_tub(R, b + 1, 0.0)                                     # (hidden until the tub shot)
    for r in R["rams"]:
        r.key(ends("rams")[0] - 1, 0.0)
    # rams test: extend and retract
    a, b = ends("rams")
    for r in R["rams"]:
        r.key(a, 0.0); r.key(F("rams", 0.42), 0.0); r.key(F("rams", 0.72), Y.RISE * 0.75); r.key(b, 0.15)
    # tub lowered by crane
    a, b = ends("tub")
    key_tub(R, a - 1, 0.0)
    R["tub"]["root"].location.z = 7.0; R["tub"]["root"].keyframe_insert("location", index=2, frame=a)
    R["tub"]["root"].location.z = 0.25; R["tub"]["root"].keyframe_insert("location", index=2, frame=F("tub", 0.78))
    R["tub"]["root"].location.z = 0.0; R["tub"]["root"].keyframe_insert("location", index=2, frame=F("tub", 0.92))
    for r in R["rams"]:
        r.key(a, 0.0)
    # rise
    a, b = ends("rise")
    key_tub(R, a, 0.0); key_tub(R, F("rise", 0.12), 0.0); key_tub(R, b, Y.RISE)
    key_tub(R, ends("carup")[1], Y.RISE)
    # sink (after the empty lift goes down)
    a, b = ends("sink")
    key_tub(R, a, Y.RISE); key_tub(R, F("sink", 0.38), Y.RISE); key_tub(R, F("sink", 0.86), 0.0)

    # water slosh when the pool rises (tiny tilt, decaying) and when it lands
    wr = R["tub"]["water_root"]
    for sh, amp in (("rise", 0.8), ("water", 0.6), ("sink", 0.5)):
        a, b = ends(sh)
        for k, fr in enumerate(range(a, b + 1, 4)):
            u = (fr - a) / max(1, b - a)
            wr.rotation_euler = (math.radians(amp * math.sin(fr * 0.45) * (1 - 0.6 * u)), 0, 0)
            wr.keyframe_insert("rotation_euler", index=0, frame=fr)
        wr.rotation_euler = (0, 0, 0); wr.keyframe_insert("rotation_euler", index=0, frame=b + 1)

    # water level and tiles
    a, b = ends("tilefill")
    wrt = R["tub"]["water_root"]
    for fr, s in ((1, 1.0), (ends("hook")[1], 1.0), (ends("hook")[1] + 1, 0.001), (F("tilefill", 0.38), 0.001),
                  (b, 1.0)):
        wrt.scale = (1, 1, s); wrt.keyframe_insert("scale", index=2, frame=fr)
    tl = R["M"]["tile_reveal"]
    key_value(tl, 1, 1.0); key_value(tl, ends("hook")[1] + 1, 0.0); key_value(tl, a, 0.0); key_value(tl, F("tilefill", 0.45), 1.0)
    ST.set_interp(R["M"]["tile"].node_tree, "CONSTANT")
    tl_fc = R["M"]["tile"].node_tree.animation_data.action
    # (constant steps except the sweep itself)
    _linear_between(R["M"]["tile"].node_tree, a, F("tilefill", 0.45))
    wW = R["M"]["water_w"]
    key_value(wW, 1, 0.0); key_value(wW, f(END) + 1, f(END) * 0.012)
    ST.set_interp(R["M"]["water"].node_tree, "LINEAR")

    # ---------------------------------------------------------------- lift and car
    # the car's z gets exactly the lift's keys (same frames and values, so the same curve) until it
    # drives off; x/y are keyed separately
    lift = R["lift"]
    carr = R["car"]["root"]
    da, db = ends("driveout")
    cy0 = Y.LIFT_C - 0.05

    def LK(fr, z):
        lift.key(fr, z)
        if fr < da:
            carr.location = (0.0, cy0, z); carr.keyframe_insert("location", frame=fr)
    LK(1, Y.LIFT_UP); LK(ends("hook")[1], Y.LIFT_UP); LK(ends("hook")[1] + 1, Y.LIFT_DOWN)
    a, b = ends("lift")
    LK(a, Y.LIFT_DOWN); LK(F("lift", 0.1), Y.LIFT_DOWN); LK(b, Y.LIFT_UP)
    a, b = ends("park")
    LK(a, Y.LIFT_UP); LK(F("park", 0.12), Y.LIFT_UP); LK(F("park", 0.95), Y.LIFT_DOWN)
    a, b = ends("carup")
    LK(a, Y.LIFT_DOWN); LK(F("carup", 0.08), Y.LIFT_DOWN); LK(F("carup", 0.92), Y.LIFT_UP)
    a, b = ends("sink")
    lift.key(a, Y.LIFT_UP); lift.key(F("sink", 0.34), Y.LIFT_DOWN)
    for wh in R["car"]["wheels"]:
        wh["root"].rotation_euler.y = 0.0; wh["root"].keyframe_insert("rotation_euler", index=1, frame=1)
    y0, y1 = cy0, 9.8
    for fr in range(da, db + 1):
        u = (fr - da) / (db - da)
        y = y0 + (y1 - y0) * (0.5 * u + 0.5 * _ease(u))
        key_car(R, fr, (0, y, Y.LIFT_UP), y - y0)
    key_car(R, db + 1, (0, y1, 0.01), y1 - y0)
    key_car(R, f(END), (0, y1, 0.01), y1 - y0)

    # ---------------------------------------------------------------- dig
    fill = R["fill_root"]
    a, b = ends("dig")
    key_xf(fill, 1, scale=(1, 1, 1)); key_xf(fill, a, scale=(1, 1, 1)); key_xf(fill, F("dig", 0.92), scale=(1, 1, 0.004))
    dirt = R["M"]["dirt_fac"]
    key_value(dirt, 1, 0.0); key_value(dirt, a, 1.0)
    ST.set_interp(R["M"]["dirt"].node_tree, "CONSTANT")
    pile = R["pile"]
    key_xf(pile, a, scale=(0.6, 0.8, 0.3)); key_xf(pile, b, scale=(3.2, 4.2, 2.4))
    rr = random.Random(9)
    clods = R["clods"]
    span = b - a - 16
    for i, cl in enumerate(clods):
        s0 = a + int(span * i / len(clods))
        u0 = (s0 - a) / (b - a)
        top = -(Y.PD + Y.SL) * min(1.0, _ease(u0 / 0.92)) + 0.1
        p0 = Vector((rr.uniform(-1.6, 1.6), rr.uniform(-3.5, 3.5), top))
        p1 = Vector((7.6 + rr.uniform(-1.5, 1.5), -1.0 + rr.uniform(-2.5, 2.5), 0.9))
        dur = 14
        key_xf(cl, s0 - 1, loc=p0, scale=0.001)
        for k in range(dur + 1):
            u = k / dur
            p = p0.lerp(p1, u); p.z += math.sin(math.pi * u) * (3.0 + abs(top) * 0.6)
            key_xf(cl, s0 + k, loc=p, rot=(u * 6 + i, u * 4, i), scale=1.0)
        key_xf(cl, s0 + dur + 1, scale=0.001)

    # ---------------------------------------------------------------- concrete
    slab_root, walls_root = rig["slab_root"], rig["walls_root"]
    a, b = ends("slab")
    key_xf(slab_root, a, scale=(1, 1, 0.02)); key_xf(slab_root, F("slab", 0.72), scale=(1, 1, 1))
    a, b = ends("walls")
    key_xf(walls_root, a, scale=(1, 1, 0.02)); key_xf(walls_root, F("walls", 0.8), scale=(1, 1, 1))

    # ---------------------------------------------------------------- deck boards drop in
    a, b = ends("deck")
    boards = R["boards"]
    order = sorted(range(len(boards)), key=lambda i: (boards[i][3], boards[i][2]))
    n = len(order)
    for rank, i in enumerate(order):
        holder, pieces, cx, cy = boards[i]
        s0 = a + int((b - a - 10) * rank / n)
        key_xf(holder, 1, loc=(cx, cy, Y.DECK), scale=1.0)
        key_xf(holder, ends("hook")[1], loc=(cx, cy, Y.DECK), scale=1.0)
        key_xf(holder, ends("hook")[1] + 1, loc=(cx, cy, Y.DECK + 1.6), scale=0.001)
        key_xf(holder, s0 - 1, loc=(cx, cy, Y.DECK + 1.6), scale=0.001)
        key_xf(holder, s0, loc=(cx, cy, Y.DECK + 1.6), scale=1.0)
        key_xf(holder, s0 + 5, loc=(cx, cy, Y.DECK))
        key_xf(holder, s0 + 7, loc=(cx, cy, Y.DECK + 0.03))
        key_xf(holder, s0 + 9, loc=(cx, cy, Y.DECK))

    # ---------------------------------------------------------------- the builder
    hat, sun = B.data["hardhat"], B.data["sunglasses"]
    spade = R["spade"]
    remote = R["remote"]
    glass = R["lemonade"]

    def spade_at(fr, blade, handle):
        """Place the spade with its blade end at `blade` and handle end at `handle` (world)."""
        d = (V(handle) - V(blade))
        mid = (V(handle) + V(blade)) / 2
        q = d.to_track_quat("Z", "Y")
        spade.rotation_mode = "QUATERNION"
        spade.location = mid + d.normalized() * 0.045; spade.rotation_quaternion = q
        spade.keyframe_insert("location", frame=fr); spade.keyframe_insert("rotation_quaternion", frame=fr)

    # hook: on the deck with the remote
    hp = Vector((4.45, -4.6, Y.DECK))
    for u in (0.0, 1.0):
        fr = F("hook", u)
        yw = yaw_to(hp, (0.0, 0.5))

        def body(a_, yw=yw):
            legs_stand(a_.arm, 0.09); spine(a_.arm, -2, 0, 0)
            a_.hand("Right", a_.W(0.42, -0.2, a_.hips_w.z + 0.42), pole=(-1.0, 0.0, -1.0),
                    dir_world=fwd(a_.yaw) + Vector((0, 0, 0.25)))
            posing.curl_fingers(a_.arm, "Right", 1.0)
            arms_hang(a_.arm, 0.0) if False else None
            a_.hand("Left", a_.W(0.06, 0.24, a_.hips_w.z - 0.05), pole=(1.0, 0.4, -1.0), dir_world=Vector((0, 0, -1)))
            head(a_.arm, 8, 0, 0)
        B.pose(fr, hp, yw, body)
        B.face(fr, smug=0.8)

    # yard: hands on the spade, on the lawn
    yp = Vector((0.15, -3.4, 0.0))
    for u in (0.0, 0.6, 1.0):
        fr = F("yard", u)
        blade = yp + Vector((0.05, -0.42, -0.12 if u < 0.6 else -0.22))
        handle = blade + Vector((0.0, 0.32, 1.02))

        def body(a_, handle=handle):
            legs_stand(a_.arm, 0.11); spine(a_.arm, 8, 0, 0)
            a_.hand("Right", handle + Vector((0.0, 0.03, -0.02)), pole=(-1.0, 0.3, -1.0), dir_world=Vector((0, -0.3, -1)))
            a_.hand("Left", handle + Vector((0.0, -0.14, -0.36)), pole=(1.0, 0.3, -1.0), dir_world=Vector((0.4, -0.6, -0.5)))
            fingers(a_.arm, 1.2)
            head(a_.arm, -10, 0, 0)
        B.pose(fr, yp, 0, body)
        spade_at(fr, blade, handle)
        B.face(fr, calm=0.4)

    # dig: in the hole, on the falling floor, two alternating strokes
    a, b = ends("dig")
    for k, fr in enumerate(range(a, b + 1, 5)):
        u = (fr - a) / (b - a)
        top = -(Y.PD + Y.SL) * min(1.0, _ease(u / 0.92))
        base = Vector((0.6, -2.2, top))
        down = k % 2 == 0
        blade = base + (Vector((0.0, -0.55, -0.1)) if down else Vector((0.55, -0.3, 0.7)))
        handle = blade + (Vector((0.0, 0.35, 1.0)) if down else Vector((-0.75, 0.15, 0.35)))

        def body(a_, handle=handle, blade=blade, down=down):
            legs_stand(a_.arm, 0.14, 0.15); spine(a_.arm, 22 if down else 8, 0 if down else -18, 0)
            mid = blade.lerp(handle, 0.55)
            a_.hand("Right", handle, pole=(-1.0, 0.3, -1.0))
            a_.hand("Left", mid, pole=(1.0, 0.2, -1.0))
            fingers(a_.arm, 1.3)
            head(a_.arm, -24 if down else -5, 0, 0)
        B.pose(fr, base, 0, body)
        spade_at(fr, blade, handle)
        B.face(fr, strain=0.5)

    # walls / rams: on the slab, hands on hips, looking up
    for sh, p, yw, look in (("walls", (0.9, -1.6, Y.FLOOR), 15, (28, 10)), ("rams", (0.2, -2.0, Y.FLOOR), 8, (34, -8))):
        for u in (0.0, 1.0):
            fr = F(sh, u)
            B.pose(fr, V(p), yw, lambda a_, look=look, u=u: stand(a_, (look[0], look[1] + 14 * u), "hips"))
            B.face(fr, calm=0.3, smug=0.3 * u)

    # trick: close up by the hole, hands on hips, leaning in with a grin
    tp = Vector((3.7, -6.5, 0.0))
    for u in (0.0, 1.0):
        fr = F("trick", u)
        B.pose(fr, tp, yaw_to(tp, (3.4, -8.3)), lambda a_, u=u: stand(a_, (4 - 6 * u, 0), "hips", lean=4 + 8 * u))
        B.face(fr, smug=1.0)

    # tub: guiding the crane, one arm up
    gp = Vector((-3.9, -6.6, 0.0))
    for u in (0.0, 0.5, 1.0):
        fr = F("tub", u)

        def body(a_, u=u):
            legs_stand(a_.arm, 0.1); spine(a_.arm, -6, 0, 0)
            a_.hand("Right", a_.W(0.25, -0.28, a_.hips_w.z + 1.05 - 0.25 * u), pole=(-1.0, -0.3, -0.5),
                    dir_world=Vector((0.2, 0.3, 1)))
            fingers(a_.arm, 0.2)
            a_.hand("Left", a_.W(0.04, 0.22, a_.hips_w.z - 0.1), pole=(1.0, 0.4, -1.0), dir_world=Vector((0, 0, -1)))
            head(a_.arm, 26 - 20 * u, 0, 0)
        B.pose(fr, gp, yaw_to(gp, (0, 0)), body)
        B.face(fr, calm=0.5)

    # on the lounger: justpool, button, rise, congrats, neighbor
    lz = Y.DECK + 0.56
    lhip = Vector((3.75, -2.35, lz))
    for sh, arms in (("justpool", "head"), ("button", "rest"), ("rise", "rest"), ("congrats", "rest"),
                     ("neighbor", "head")):
        for u in (0.0, 1.0):
            fr = F(sh, u)
            look = {"justpool": (4, 0), "button": (-6, -24), "rise": (14, -40), "congrats": (8, -12),
                    "neighbor": (4, 0)}[sh]
            B.pose(fr, lhip, 0, lambda a_, arms=arms, look=look: lie(a_, look, arms), seated=True, pitch=-38)
            B.face(fr, **({"smug": 0.8} if sh in ("justpool", "congrats", "neighbor") else {"calm": 0.6}))

    # in the car for the drive-out
    a, b = ends("driveout")
    for fr in (a, b):
        sc.frame_set(fr)
        bpy.context.view_layer.update()
        cm = R["car"]["root"].matrix_world
        hip = cm @ Vector((C.SEAT_X + 0.02, C.DRIVER_Y, 0.5))

        def body(a_, cm=cm):
            spine(a_.arm, -14, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                ankle = cm @ Vector((0.62, C.DRIVER_Y + sg * 0.13, 0.36))
                a_.foot(side, ankle, (0, -1, -0.5))
                grip = cm @ (Vector((0.47, C.DRIVER_Y, 0.86)) + Vector((0, sg * 0.17, 0.02)))
                a_.hand(side, grip + (cm.to_3x3() @ Vector((-0.1, 0, -0.06))), pole=(sg * 0.9, 0.4, -1.0))
            fingers(a_.arm, 1.6)
            head(a_.arm, 2, 0, 0)
        B.pose(fr, hip, 180, body, seated=True)
        B.face(fr, smug=0.9)

    # sink: beside the parked car, remote pointed at the pool
    kp = Vector((-1.65, 9.0, 0.0))
    for u in (0.0, 1.0):
        fr = F("sink", u)

        def body(a_):
            legs_stand(a_.arm, 0.09)
            a_.hand("Right", a_.W(0.48, -0.12, a_.hips_w.z + 0.48), pole=(-1.0, 0.0, -1.0),
                    dir_world=fwd(a_.yaw) + Vector((0, 0, 0.2)))
            posing.curl_fingers(a_.arm, "Right", 1.0)
            a_.hand("Left", a_.W(0.06, 0.24, a_.hips_w.z - 0.05), pole=(1.0, 0.4, -1.0), dir_world=Vector((0, 0, -1)))
            head(a_.arm, -4, 0, 0)
        B.pose(fr, kp, yaw_to(kp, (0, 0)), body)
        B.face(fr, smug=0.7)

    # props on the builder
    rig["bone_parent"](remote["root"], B.arm, "mixamorig:RightHand",
                       Matrix.Translation((0.0, 0.085, 0.03)) @ Euler((math.radians(90), 0, math.radians(180))).to_matrix().to_4x4())
    rig["bone_parent"](glass, B.arm, "mixamorig:RightHand",
                       Matrix.Translation((0.0, 0.08, 0.045)) @ Euler((math.radians(90), 0, 0)).to_matrix().to_4x4())
    # congrats: a toast towards the camera
    for u, up in ((0.0, 0.0), (0.4, 1.0), (1.0, 1.0)):
        fr = F("congrats", u)

        def body(a_, up=up):
            lie(a_, (10, -8), "rest")
            p = a_.hips_w + fwd(a_.yaw) * (0.28 + 0.2 * up) + left(a_.yaw) * (-0.3 + 0.06 * up) + Vector((0, 0, 0.2 + 0.32 * up))
            a_.hand("Right", p, pole=(-1.0, -0.3, -1.0), dir_world=Vector((0, 0, 1)) + fwd(a_.yaw) * 0.2)
            posing.curl_fingers(a_.arm, "Right", 1.1)
        B.pose(fr, lhip, 0, body, seated=True, pitch=-38)
        B.face(fr, smug=1.0)
    # the button press
    a, b = ends("button")
    btn, led = remote["button"], remote["led"]
    pz = btn.location.z
    key_xf(btn, F("button", 0.5), loc=(btn.location.x, btn.location.y, pz))
    key_xf(btn, F("button", 0.58), loc=(btn.location.x, btn.location.y, pz - 0.006))
    key_xf(btn, F("button", 0.8), loc=(btn.location.x, btn.location.y, pz))
    lm = led.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    key_value(lm, 1, 0.0); key_value(lm, F("button", 0.56), 0.0); key_value(lm, F("button", 0.6), 30.0)
    key_value(lm, ends("button")[1] + 1, 0.0)
    ST.set_interp(led.data.materials[0].node_tree, "CONSTANT")
    for u, curl in ((0.0, 0.0), (0.48, 0.0), (0.58, 1.0), (0.85, 0.0)):
        fr = F("button", u)
        sc.frame_set(fr)
        tb = B.arm.pose.bones["mixamorig:RightHandThumb2"]
        tb.rotation_quaternion = Quaternion((1, 0, 0), math.radians(10 + 30 * curl)) @ Quaternion((0, 0, 1), math.radians(-15 * curl))
        tb.keyframe_insert("rotation_quaternion", frame=fr)

    # ---------------------------------------------------------------- the neighbour peeks over the fence
    npos = Vector((11.95, 0.6, 0.0))
    for u, rise_, look, face in ((0.0, 0.0, (0, 10), {"strain": 0.2}), (0.25, 0.42, (-4, 14), {"strain": 0.5}),
                                 (0.6, 0.46, (-6, -6), {"strain": 0.7}), (1.0, 0.46, (-6, 6), {"strain": 0.65})):
        fr = F("neighbor", u)

        def body(a_, look=look):
            legs_stand(a_.arm, 0.08); spine(a_.arm, 6, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.hand(side, Vector((11.56, a_.hips_w.y + sg * 0.25, 1.9)), pole=(sg * 1.0, -0.3, -1.0),
                        dir_world=Vector((-1, 0, -0.3)))
            fingers(a_.arm, 1.4)
            head(a_.arm, look[0], look[1], 0)
        N.pose(fr, npos + Vector((0, 0, rise_)), -90, body)
        N.face(fr, **face)

    # ---------------------------------------------------------------- what is visible when
    want = rig["want"]
    names = [n for n, *_ in SHOTS]

    def from_(name, extra=("hook",)):
        return set(names[names.index(name):]) | set(extra)
    bparts = [o for o in B.data["parts"] if o not in (hat, sun) and o.parent not in (sun,)]
    want(bparts, {"hook", "yard", "dig", "walls", "trick", "rams", "tub", "justpool", "button", "rise",
                  "driveout", "sink", "congrats", "neighbor"})
    want([hat], {"yard", "dig", "walls", "trick", "rams", "tub"})
    want([sun, *sun.children], {"hook", "justpool", "button", "rise", "driveout", "sink", "congrats", "neighbor"})
    want(remote["root"].children, {"hook", "button", "sink"})
    want(glass.children, {"congrats"})
    want([o for o in spade.children_recursive if o.type == "MESH"], {"yard", "dig"})
    want(N.data["parts"], {"neighbor"})
    car_objs = [o for o in R["car"]["root"].children_recursive if o.type in ("MESH", "LIGHT")]
    want(car_objs, from_("park"))
    want(R["lift"].objs, from_("lift"))
    for r in R["rams"]:
        want([o for o in r.objs if o.type == "MESH"], from_("rams"))
    tub_meshes = [o for o in R["tub"]["root"].children_recursive if o.type == "MESH" and o not in R["crane"]]
    want([o for o in tub_meshes if o is not R["ball"]], from_("tub"))
    want([R["ball"]], from_("justpool"))
    want(R["crane"], {"tub"})
    want(R["hose"], {"tilefill"})
    want(R["pump"], {"slab"})
    for holder, pieces, cx, cy in R["boards"]:
        want(pieces, from_("deck"))
    want(R["fill"], {"yard", "dig"})
    want([R["pile"]], {"dig"})
    want(R["clods"], {"dig"})
    want([R["spray"]], {"yard"})
    want(R["dims"], {"dig"})
    want([o for l in R["loungers"] for o in l.children_recursive if o.type == "MESH"], from_("justpool"))
    want(rig["slab_objs"], from_("slab"))
    want(rig["wall_objs"], from_("walls"))
    want([o for o in R["garage"]["dressing"].all_objects if o.type in ("MESH", "LIGHT")], from_("park"))
    want([o for o in bpy.data.objects if o.name.startswith("BayLines")], from_("park"))
    return R


def _linear_between(nt, a, b):
    ad = nt.animation_data
    if not ad or not ad.action:
        return
    for fc in ST._fcurves(ad.action):
        for kp in fc.keyframe_points:
            if a <= kp.co.x < b:
                kp.interpolation = "LINEAR"


# ============================================================================= cameras
def cam_plan(rig):
    """name: (lens, fn(u, fr) -> (loc, target), fstop or None, shake)"""
    D = Y.DECK
    return {
        "hook": (20, lambda u, fr: (lerp((5.4, -10.6, 0.95), (4.8, -9.5, 1.15), _ease(u)), (0.5, 1.6, 1.4)), None, 0.25),
        "yard": (24, lambda u, fr: (lerp((5.2, -14.0, 6.6), (4.6, -12.8, 6.0), u), (0.0, -1.2, 0.0)), None, 0.2),
        "dig": (18, lambda u, fr: (lerp((6.6, -10.6, 7.6), (6.1, -9.8, 6.9), u), (0.0, 0.6, -2.6)), None, 0.2),
        "slab": (24, lambda u, fr: (lerp((0.0, -12.8, -0.9), (0.0, -12.2, -1.1), u), (0.0, 0.0, -3.0)), None, 0.15),
        "walls": (24, lambda u, fr: (lerp((0.4, -12.2, -1.0), (0.2, -11.6, -0.8), u), (0.0, 0.0, -2.3)), None, 0.15),
        "lift": (26, lambda u, fr: (lerp((1.2, -10.2, -0.5), (0.9, -9.6, -0.7), u), (0.0, 2.4, -2.0)), None, 0.15),
        "park": (26, lambda u, fr: (lerp((0.9, -9.6, -0.7), (0.7, -9.1, -1.1), u), (0.0, 2.4, -2.4)), None, 0.15),
        "trick": (40, lambda u, fr: (lerp((3.35, -8.4, 1.62), (3.4, -8.15, 1.62), u), (3.68, -6.5, 1.55)), 2.8, 0.2),
        "rams": (22, lambda u, fr: (lerp((0.0, -13.0, -0.6), (0.0, -12.4, -0.2), u), (0.0, 0.0, -1.5 + 1.0 * _ease(u))), None, 0.15),
        "tub": (20, lambda u, fr: (lerp((7.8, -11.5, 8.4), (7.2, -10.6, 7.4), u), (0.0, 0.0, 0.2)), None, 0.2),
        "tilefill": (22, lambda u, fr: (lerp((4.4, -8.8, 4.6), (4.1, -8.2, 4.2), u), (0.0, -0.8, -1.2)), None, 0.15),
        "deck": (20, lambda u, fr: (lerp((6.0, -13.4, 8.2), (5.6, -12.6, 7.6), u), (0.0, -0.4, 0.0)), None, 0.2),
        "edges": (38, lambda u, fr: (lerp((2.88, -3.6, 0.34), (2.86, -2.4, 0.3), u), lerp((2.47, -1.6, 0.02), (2.47, -0.4, 0.02), u)), 2.4, 0.1),
        "justpool": (20, lambda u, fr: (lerp((-6.4, -9.6, 2.5), (-6.0, -9.0, 2.3), u), (1.2, 0.4, 0.1)), None, 0.2),
        "button": (50, lambda u, fr: (rig["hand_cam"](u)), 2.8, 0.15),
        "rise": (20, lambda u, fr: (lerp((9.0, -12.2, 5.4), (8.6, -11.6, 5.8), u), (0.0, 0.0, 0.4 + 1.8 * _ease(u))), None, 0.25),
        "water": (22, lambda u, fr: (lerp((0.0, -12.9, 1.1), (0.0, -12.4, 1.0), u), (0.0, 0.0, 0.7)), None, 0.15),
        "carup": (22, lambda u, fr: (lerp((0.0, -12.6, -0.4), (0.0, -12.2, 0.1), u), (0.0, 1.5, -1.2 + 0.9 * _ease(u))), None, 0.15),
        "driveout": (24, lambda u, fr: (lerp((2.4, 14.6, 0.85), (2.2, 14.2, 0.9), u), (0.0, 4.2, 0.95)), None, 0.3),
        "sink": (22, lambda u, fr: (lerp((-3.6, 16.0, 2.4), (-3.3, 15.2, 2.2), u), (0.0, 0.0, 0.9 - 0.6 * _ease(u))), None, 0.2),
        "congrats": (40, lambda u, fr: (rig["face_cam"](u)), 2.8, 0.15),
        "neighbor": (42, lambda u, fr: (lerp((7.4, -1.2, 1.95), (7.9, -0.9, 2.0), _ease(u)), (11.7, 0.6, 2.25)), 3.2, 0.15),
    }


def _look(loc, tgt, roll=0.0):
    d = (Vector(tgt) - Vector(loc)).normalized()
    q = d.to_track_quat("-Z", "Y")
    if roll:
        q = q @ Quaternion((0, 0, 1), math.radians(roll))
    return q.to_euler()


def cameras(rig):
    sc = bpy.context.scene
    coll = S.collection("Cameras")
    plan = cam_plan(rig)
    for name, t0, t1, v in SHOTS:
        lens, fn, fstop, shake = plan[name]
        a, b = f(t0), f(t1) - 1
        cd = bpy.data.cameras.new("Cam_" + name)
        cd.lens = lens
        cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24.0
        cd.clip_start = 0.02; cd.clip_end = 2000
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
            cam.rotation_euler = _look(cam.location, g); cam.keyframe_insert("rotation_euler", frame=fr)
        if fstop:
            cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop
        m = sc.timeline_markers.new(name, frame=a)
        m.camera = cam
