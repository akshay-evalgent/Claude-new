"""Performance, prop animation, cameras and visibility for the Apple short (30 shots, see timeline.py)."""
import math, random
import bpy
from mathutils import Vector, Euler, Matrix, Quaternion

import sets as S
import storm as ST
import anim
import posing
from anim import hand_to, foot_to, spine, head, shoulders, fingers, rot, aim, arms_hang, legs_stand
import props as P
import rooms as R
from timeline import FPS, SHOTS, SHOT, END, f

O, HO, ST_, SH, AU, NV = R.OFFICE, R.HOUSE, R.STAGE, R.SHOP, R.AUCTION, R.NEVADA
DESK_TOP = 0.788
WAYNE_SEAT = Vector((0.6, 2.06, 0.0))        # office chair behind the desk, facing -Y


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


def shot_at(fr):
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


def V(*a):
    return Vector(a if len(a) == 3 else a[0])


# ============================================================================= actor
def fwd(yaw):
    r = math.radians(yaw)
    return Vector((math.sin(r), -math.cos(r), 0))


def left(yaw):
    r = math.radians(yaw)
    return Vector((math.cos(r), math.sin(r), 0))


class Actor(anim.Character):
    def __init__(self, data):
        super().__init__(data)
        self.data = data
        self.hip = self.arm.data.bones["mixamorig:Hips"].head_local.z

    def pose(self, fr, loc, yaw, body, seated=False):
        """seated: loc is the world position of the hips; else loc is the floor point under the feet."""
        self.begin(fr)
        self.place(fr, V(loc), yaw, 0, 0, self.hip if seated else None)
        self.yaw = yaw
        self.hips_w = V(loc) if seated else V(loc) + Vector((0, 0, self.hip))
        body(self)
        self.key(fr)

    # helpers in world space ----------------------------------------------------
    def hand(self, side, world, pole=None, dir_world=None):
        sg = 1 if side == "Left" else -1
        pole = pole or (sg * 1.0, 0.35, -1.0)
        hand_to(self.arm, side, self.to_local(V(world)), pole=pole,
                hand_dir=self.dir_local(V(dir_world)) if dir_world is not None else None)

    def foot(self, side, world, foot_dir=(0, -1, -0.3)):
        sg = 1 if side == "Left" else -1
        foot_to(self.arm, side, self.to_local(V(world)), pole=(sg * 0.1, -1.0, 0.6), foot_dir=foot_dir)

    def legs_seated(self, spread=0.13, reach=0.46, ankle_z=0.075):
        Fw, L = fwd(self.yaw), left(self.yaw)
        for side, sg in (("Left", 1), ("Right", -1)):
            a = self.hips_w + Fw * reach + L * (sg * spread)
            a.z = ankle_z
            self.foot(side, a, (0, -1, -0.45))

    def W(self, fx, lx, z):
        """World point from (forward, left) offsets about the hips, absolute height z."""
        p = self.hips_w + fwd(self.yaw) * fx + left(self.yaw) * lx
        p.z = z
        return p


def hide_parts(actor, shots_visible):
    """Key render visibility of all of an actor's meshes: shown only in the given shots."""
    objs = actor.data["parts"]
    for name, t0, t1, st in SHOTS:
        show = name in shots_visible
        for o in objs:
            o.hide_render = not show
            o.keyframe_insert("hide_render", frame=f(t0))


def show_in(objs, shots_visible):
    for name, t0, t1, st in SHOTS:
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


def page_point(obj, u, v):
    """World point on a P.card (centre origin) at texture coords (u from left, v from top)."""
    bpy.context.view_layer.update()
    me = obj.data
    xs = [vv.co.x for vv in me.vertices]; ys = [vv.co.y for vv in me.vertices]
    x = min(xs) + (max(xs) - min(xs)) * u
    y = max(ys) - (max(ys) - min(ys)) * v
    return obj.matrix_world @ Vector((x, y, 0.0005))


# ============================================================================= body poses
def sit_desk(a, look=(0, 0), lean=4, twist=0, hands="desk", hand_pts=None, smile=0.0):
    """Wayne at his desk. hands: 'desk' (resting), 'pts' (explicit world targets {side: (pt, dir)})."""
    spine(a.arm, lean, twist, 0)
    shoulders(a.arm, 0.05, 0.05)
    a.legs_seated()
    if hands == "desk":
        for side, sg in (("Left", 1), ("Right", -1)):
            p = a.W(0.42, sg * 0.2, DESK_TOP + 0.045)
            a.hand(side, p, dir_world=fwd(a.yaw) * 1.0 + left(a.yaw) * (-sg * 0.35) + Vector((0, 0, -0.15)))
        fingers(a.arm, 0.5)
    elif hands == "lap":
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.28, sg * 0.12, a.hips_w.z + 0.08), dir_world=fwd(a.yaw) + Vector((0, 0, -0.4)))
        fingers(a.arm, 0.6)
    elif hands == "armrest":
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.12, sg * 0.3, a.hips_w.z + 0.2), dir_world=fwd(a.yaw) + Vector((0, 0, -0.2)))
        fingers(a.arm, 0.7)
    if hand_pts:
        for side, (pt, d, curl) in hand_pts.items():
            a.hand(side, pt, dir_world=d)
            posing.curl_fingers(a.arm, side, curl)
    head(a.arm, look[0], look[1], 0)


def stand(a, look=(0, 0), arms="hang", lean=0, sway=0, hand_pts=None, spread=0.07):
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
    elif arms == "cross":
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.2, -sg * 0.13, a.hips_w.z + 0.36 - 0.03 * sg), pole=(sg * 1.0, -0.4, -0.6),
                   dir_world=left(a.yaw) * (-sg) + Vector((0, 0, 0.05)))
        fingers(a.arm, 0.55)
    elif arms == "shrug":
        shoulders(a.arm, 0.5, 0.0)
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.3, sg * 0.36, a.hips_w.z + 0.08), pole=(sg * 1.0, 0.2, -1.0),
                   dir_world=fwd(a.yaw) * 0.6 + left(a.yaw) * sg * 0.6 + Vector((0, 0, 0.2)))
        fingers(a.arm, 0.15)
    if hand_pts:
        for side, (pt, d, curl) in hand_pts.items():
            a.hand(side, pt, dir_world=d)
            posing.curl_fingers(a.arm, side, curl)
    head(a.arm, look[0], look[1], 0)


def sit_chair(a, look=(0, 0), lean=-8, hand_pts=None, hands="lap"):
    spine(a.arm, lean, 0, 0)
    a.legs_seated(spread=0.14, reach=0.5)
    if hands == "lap":
        for side, sg in (("Left", 1), ("Right", -1)):
            a.hand(side, a.W(0.3, sg * 0.1, a.hips_w.z + 0.1), dir_world=fwd(a.yaw) + Vector((0, 0, -0.5)))
        fingers(a.arm, 0.6)
    if hand_pts:
        for side, (pt, d, curl) in hand_pts.items():
            a.hand(side, pt, dir_world=d)
            posing.curl_fingers(a.arm, side, curl)
    head(a.arm, look[0], look[1], 0)


# ============================================================================= the performance
def perform(rig):
    sc = bpy.context.scene
    W, A_, B_ = rig.wayne, rig.steve_a, rig.steve_b
    OW, AUC, BID = rig.old_wayne, rig.auctioneer, rig.bidders
    seat_hip = WAYNE_SEAT + Vector((0, -0.06, 0.52))

    def at_desk(name, keys):
        """keys: list of (u, kwargs, face) for Wayne seated at the desk."""
        for u, kw, face in keys:
            fr = F(name, u)
            W.pose(fr, seat_hip, 0, lambda a, kw=kw: sit_desk(a, **kw), seated=True)
            W.face(fr, **face)

    # ---------------------------------------------------------------- intro: he holds up the contract
    held = rig.contract_held
    a, b = ends("intro")
    for fr in range(a, ends("contract10")[1] + 1):
        u = (fr - a) / max(1, b - a)
        p = O + Vector((0.6, 1.6, 0.93 + 0.008 * math.sin(fr * 0.25)))
        key_xf(held, fr, p, (math.radians(72), 0, math.radians(1.5 * math.sin(fr * 0.18))))
    for fr, face in ((F("intro", 0.0), {"calm": 0.4}), (F("intro", 0.5), {"smug": 0.4}), (F("intro", 1.0), {"smug": 0.7}),
                     (F("contract10", 1.0), {"smug": 0.6})):
        sc.frame_set(fr)
        bpy.context.view_layer.update()
        L = page_point(held, 0.97, 0.55); Rr = page_point(held, 0.03, 0.55)
        W.pose(fr, seat_hip, 0, lambda a, L=L, Rr=Rr: sit_desk(
            a, look=(2, 0), lean=6, hands=None,
            hand_pts={"Left": (L, Vector((0, 0, 1)) + Vector((-0.3, 0, 0)), 0.9),
                      "Right": (Rr, Vector((0, 0, 1)) + Vector((0.3, 0, 0)), 0.9)}), seated=True)
        W.face(fr, **face)

    # ---------------------------------------------------------------- contract10: the 10% line, circled
    # (camera close on the paper on the desk; ring draws on)
    ring = rig.ring
    a, b = ends("contract10")
    ring.data.bevel_factor_end = 0.0; ring.data.keyframe_insert("bevel_factor_end", frame=a + 6)
    ring.data.bevel_factor_end = 1.0; ring.data.keyframe_insert("bevel_factor_end", frame=a + 22)

    # ---------------------------------------------------------------- sold800: the fan of bills, a shrug
    for u, sh, face in ((0.0, 0.0, {"smug": 0.3}), (0.45, 0.6, {"smug": 0.8}), (1.0, 0.4, {"smug": 0.6})):
        fr = F("sold800", u)

        def body(a, sh=sh):
            spine(a.arm, 4, 0, 0); a.legs_seated()
            shoulders(a.arm, 0.15 + 0.45 * sh, 0.05)
            a.hand("Right", a.W(0.42, -0.1, 0.98 + 0.03 * sh), pole=(-1.0, 0.3, -1.0),
                   dir_world=Vector((0.15, -0.6, 0.8)))
            a.hand("Left", a.W(0.36, 0.3, 0.9 + 0.04 * sh), pole=(1.0, 0.3, -1.0),
                   dir_world=fwd(0) * 0.7 + left(0) * 0.5 + Vector((0, 0, -0.1)))
            posing.curl_fingers(a.arm, "Right", 1.1); posing.curl_fingers(a.arm, "Left", 0.1)
            head(a.arm, 2, 0, 8 * sh)
        W.pose(fr, seat_hip, 0, body, seated=True)
        W.face(fr, **face)

    # ---------------------------------------------------------------- atari / steves: they walk in
    at_desk("atari", [(0.0, {"hands": "desk", "look": (-18, 6)}, {"calm": 0.5}),
                      (1.0, {"hands": "desk", "look": (-14, 20)}, {"calm": 0.5})])
    at_desk("steves", [(0.0, {"hands": "desk", "look": (-6, 25)}, {"calm": 0.5}),
                       (1.0, {"hands": "desk", "look": (0, 30)}, {"worry": 0.2})])
    a, b = ends("atari")
    b2 = ends("steves")[1]
    for k, fr in enumerate(range(a, b2 + 1, 6)):
        wv = math.sin(k * 1.6)
        A_.pose(fr, O + Vector((-2.2, -0.9, 0)), 70, lambda a_, wv=wv: stand(a_, look=(4, -20), hand_pts={
            "Right": (a_.W(0.12, -0.32 - 0.05 * wv, 1.68), Vector((0, 0, 1)) + left(a_.yaw) * (-0.3 * wv), 0.1)}))
        B_.pose(fr, O + Vector((-2.75, -0.3, 0)), 75, lambda a_: stand(a_, look=(2, -14), arms="hips", sway=4))
        A_.face(fr, smug=0.8); B_.face(fr, smug=0.5)
    # ---------------------------------------------------------------- adult: Wayne frowns, the Steves goof off
    at_desk("adult", [(0.0, {"hands": "desk", "look": (-4, 22), "lean": 2}, {"worry": 0.3}),
                      (0.5, {"hands": "desk", "look": (-4, 26), "lean": 2}, {"worry": 0.5}),
                      (1.0, {"hands": "desk", "look": (-2, 24), "lean": 2}, {"worry": 0.5, "strain": 0.2})])
    arcB = O + Vector((-1.5, 3.15 - 0.95, 0))
    for u in (0.0, 0.33, 0.66, 1.0):
        fr = F("adult", u)
        jig = math.sin(u * 9) * 0.03
        B_.pose(fr, arcB, 180, lambda a, jig=jig: stand(
            a, look=(6, 0), lean=12,
            hand_pts={"Left": (O + Vector((-1.62 + jig, 2.68, 1.12)), Vector((0, 1, -0.3)), 1.0),
                      "Right": (O + Vector((-1.43, 2.68, 1.11 - jig)), Vector((0, 1, -0.6)), 0.4)}))
        A_.pose(fr, O + Vector((-2.0, 2.25, 0)), 20 + 6 * math.sin(u * 5), lambda a, u=u: stand(
            a, look=(4, -10), arms="cross", sway=6 * math.sin(u * 6)))
    for ch, face in ((A_, {"smug": 0.9}), (B_, {"smug": 0.6})):
        ch.face(F("adult", 0), **face); ch.face(F("adult", 1), **face)

    # ---------------------------------------------------------------- split45 / split10: the pie
    pie, slices = rig.pie, rig.slices
    p0 = O + Vector((0.6, 1.25, DESK_TOP + 0.002))
    a, b = ends("split45")
    key_xf(pie, a, p0, scale=(1, 1, 0.001))
    key_xf(pie, a + 8, p0, scale=(1, 1, 1.15))
    key_xf(pie, a + 12, p0, scale=(1, 1, 1))
    for s in slices:
        key_xf(s, a + 16, (0, 0, 0))
    for i, (s, toward) in enumerate(zip(slices[:2], ((-0.12, -0.12, 0), (0.12, -0.12, 0)))):
        key_xf(s, a + 30 + i * 4, toward)
        key_xf(s, ends("split10")[1], toward)
    key_xf(slices[2], ends("split10")[0] + 10, (0, 0, 0))
    key_xf(slices[2], ends("split10")[0] + 26, (0.0, 0.2, 0.0))
    # the Steves in front of the desk, facing it (yaw 180 = facing +Y)
    posA, posB = O + Vector((0.05, 0.55, 0)), O + Vector((1.15, 0.55, 0))
    for u in (0.0, 0.5, 1.0):
        fr = F("split45", u)
        A_.pose(fr, posA, 180, lambda a: stand(a, look=(-28, 0), arms="hips"))
        B_.pose(fr, posB, 180, lambda a: stand(a, look=(-28, 0), arms="hips"))
        A_.face(fr, smug=0.8); B_.face(fr, smug=0.8)
    at_desk("split45", [(0.0, {"hands": "desk", "look": (-28, 0)}, {"calm": 0.5}),
                        (1.0, {"hands": "desk", "look": (-28, 0)}, {"calm": 0.5})])
    # split10: they argue (face each other, point), Wayne raises a hand
    for u in (0.0, 0.3, 0.6, 1.0):
        fr = F("split10", u)
        w = math.sin(u * 14) * 0.05
        A_.pose(fr, posA, 125, lambda a, w=w: stand(a, look=(0, -8), lean=8, hand_pts={
            "Right": (a.W(0.55, -0.05, 1.42 + w), fwd(a.yaw), 0.3)}))
        B_.pose(fr, posB, -125, lambda a, w=w: stand(a, look=(0, 8), lean=8, hand_pts={
            "Left": (a.W(0.55, 0.05, 1.42 - w), fwd(a.yaw), 0.3)}))
        A_.face(fr, strain=0.7); B_.face(fr, strain=0.7)
    at_desk("split10", [(0.0, {"hands": "desk", "look": (-10, 15)}, {"calm": 0.5}),
                        (0.4, {"hands": None, "look": (-8, 0), "hand_pts": {
                            "Right": (O + Vector((0.45, 1.6, 1.32)), Vector((0, 0, 1)), 0.0)}}, {"calm": 0.7}),
                        (1.0, {"hands": None, "look": (-12, 0), "hand_pts": {
                            "Right": (O + Vector((0.45, 1.58, 1.3)), Vector((0, 0, 1)), 0.0)}}, {"smug": 0.4})])

    # ---------------------------------------------------------------- typewriter: typing the contract
    tw_lvl = rig.tw_reveal
    a, b = ends("typewriter")
    ST.key_value(tw_lvl, a - 1, 0.05); ST.key_value(tw_lvl, b + 1, 0.42)
    keys = rig.tw_keys
    rnd = random.Random(4)
    base_z = {k.name: k.location.z for k in keys}
    for fr in range(a, b + 1):
        for k in keys:
            k.location.z = base_z[k.name]
        for k in rnd.sample(keys, 2):
            k.location.z = base_z[k.name] - 0.006
        for k in keys:
            k.keyframe_insert("location", frame=fr, index=2)
    for k in keys:
        ST.set_interp(k, "CONSTANT")
    kb = rig.typewriter.matrix_world
    for u in (0.0, 0.25, 0.5, 0.75, 1.0):
        fr = F("typewriter", u)
        j = 0.01 * math.sin(u * 20)
        W.pose(fr, seat_hip, 0, lambda a, j=j: sit_desk(a, look=(-38, 0), lean=14, hands=None, hand_pts={
            "Left": (O + Vector((0.43 + j, 1.47, DESK_TOP + 0.13)), Vector((0, -1, -0.7)), 1.1),
            "Right": (O + Vector((0.27 - j, 1.47, DESK_TOP + 0.13 + j)), Vector((0, -1, -0.7)), 1.1)}), seated=True)
        W.face(fr, calm=0.6)

    # ---------------------------------------------------------------- sketch: the first logo, drawn
    sk_lvl, pen = rig.sketch_reveal, rig.pen
    paper = rig.sketch_paper
    a, b = ends("sketch")
    ST.key_value(sk_lvl, a, 0.08); ST.key_value(sk_lvl, b, 1.0)
    for fr in range(a, b + 1):
        u = (fr - a) / max(1, b - a)
        uu = 0.08 + 0.92 * u
        # pen tip follows the diagonal wipe front, scribbling across it
        k = math.sin(fr * 1.7) * 0.5 + 0.5
        tu = min(0.95, max(0.05, uu / 0.55 * k * 0.9))
        tv = min(0.95, max(0.05, (uu - 0.55 * tu) / 0.45))
        tip = page_point(paper, tu, tv)
        key_xf(pen, fr, tip, (math.radians(20), math.radians(-25), 0))
    for u in (0.0, 0.25, 0.5, 0.75, 1.0):
        fr = F("sketch", u)
        sc.frame_set(fr)
        tip = pen.matrix_world.translation
        axis = pen.matrix_world.to_3x3() @ Vector((0, 0, 1))
        grip = tip + axis * 0.06
        W.pose(fr, seat_hip, 0, lambda a, grip=grip, axis=axis: sit_desk(a, look=(-40, -10), lean=18, hands=None, hand_pts={
            "Right": (grip, axis * -1 + Vector((0, -0.3, 0)), 1.2),
            "Left": (O + Vector((0.95, 1.55, DESK_TOP + 0.04)), Vector((-0.3, -1, -0.2)), 0.4)}), seated=True)
        W.face(fr, calm=0.7)

    # ---------------------------------------------------------------- boards: the first order piles up
    boards = rig.boards
    a, b = ends("boards")
    for i, bd in enumerate(boards):
        land = a + 2 + i * 2
        stack = i // 8
        p_land = O + Vector((-3.25 + 0.0 * stack, -0.15 + 0.3 * stack, 0.905 + (i % 8) * 0.0065))
        key_xf(bd, a, p_land + Vector((0, 0, 0.6)), (0, 0, math.radians(random.Random(i).uniform(-8, 8))), scale=0.001)
        key_xf(bd, land - 3, p_land + Vector((0, 0, 0.35)), scale=1.0)
        key_xf(bd, land, p_land)
    for u in (0.0, 0.5, 1.0):
        fr = F("boards", u)
        A_.pose(fr, O + Vector((-2.55, 0.35, 0)), -100, lambda a: stand(a, look=(-8, -20), arms="hips", lean=4))
        A_.face(fr, smug=0.9)
    for u in (0.0, 1.0):
        B_.pose(F("boards", u), O + Vector((-2.65, 1.3, 0)), -110, lambda a: stand(a, look=(-14, 10), arms="cross"))
        B_.face(F("boards", u), smug=0.5)

    # ---------------------------------------------------------------- credit: he signs for $15,000
    cr_lvl, pen2, cr_page = rig.credit_sig_reveal, rig.pen2, rig.credit_page
    a, b = ends("credit")
    ST.key_value(cr_lvl, a + 6, 0.0); ST.key_value(cr_lvl, b - 6, 1.0)
    for fr in range(a, b + 1):
        u = min(1, max(0, (fr - a - 6) / max(1, b - a - 12)))
        tip = page_point(cr_page, 0.12 + 0.36 * u, 0.775 + 0.012 * math.sin(fr * 2.2))
        key_xf(pen2, fr, tip, (math.radians(25), math.radians(-30), 0))
    for u in (0.0, 0.3, 0.6, 1.0):
        fr = F("credit", u)
        sc.frame_set(fr)
        tip = pen2.matrix_world.translation; axis = pen2.matrix_world.to_3x3() @ Vector((0, 0, 1))
        A_.pose(fr, O + Vector((0.95, 0.5, 0)), 180, lambda a, tip=tip, axis=axis: stand(a, look=(-40, 0), lean=28, hand_pts={
            "Right": (tip + axis * 0.06, -axis + Vector((0, 0.3, 0)), 1.2),
            "Left": (O + Vector((1.2, 0.98, DESK_TOP + 0.03)), Vector((0.2, 1, -0.3)), 0.3)}))
        A_.face(fr, smug=0.6)

    # ---------------------------------------------------------------- hook: all three on the hook
    hooks = rig.hooks
    a, b = ends("hook")
    trio = [(A_, -0.8), (W, 0.0), (B_, 0.8)]
    drop = [a + 14, a + 24, a + 34]
    for (ch, x), hk, d in zip(trio, hooks, drop):
        belt = O + Vector((x - 0.06, -0.2, ch.hip + 0.02 + 0.47))   # hook origin is its eye: the bend sits at the belt
        key_xf(hk, a, belt + Vector((0, 0, 2.2)))
        key_xf(hk, d - 6, belt + Vector((0, 0, 1.6)))
        key_xf(hk, d, belt + Vector((0, 0, -0.04)))
        key_xf(hk, d + 3, belt + Vector((0, 0, 0.05)))
        key_xf(hk, b, belt + Vector((0, 0, 0.03)))
    for (ch, x), d in zip(trio, drop):
        base = O + Vector((x, 0.0, 0))
        for fr, lift, face in ((a, 0.0, {"calm": 0.3}), (d - 1, 0.0, {"calm": 0.3}), (d + 3, 0.05, {"shock": 0.9}),
                               (d + 8, 0.02, {"worry": 0.8}), (b, 0.01, {"worry": 0.9 if ch is W else 0.5})):
            if fr > b:
                continue
            ch.pose(fr, base + Vector((0, 0, lift)), 0, lambda a, lift=lift: stand(
                a, look=(-20 if lift else 2, 0), arms="hang", lean=6 if lift else 0))
            ch.face(fr, **face)

    # ---------------------------------------------------------------- pockets: nothing to lose
    lin = rig.linings
    a, b = ends("pockets")
    for ch, x, ls in ((A_, -0.42, lin[:2]), (B_, 0.42, lin[2:])):
        base = O + Vector((x, 0.35, 0))
        for fr, out in ((a, 0.0), (a + 10, 0.0), (a + 18, 1.0), (b, 1.0)):
            def body(a_, out=out):
                stand(a_, look=(0, 0), arms=None)
                shoulders(a_.arm, 0.5 * out, 0)
                for side, sg in (("Left", 1), ("Right", -1)):
                    p = a_.W(0.02 + 0.05 * out, sg * (0.2 + 0.06 * out), a_.hips_w.z - 0.08 - 0.1 * out)
                    a_.hand(side, p, pole=(sg * 1.0, 0.5, -0.3), dir_world=Vector((0, 0, -1)) + left(0) * sg * 0.3)
                fingers(a_.arm, 0.9)
                head(a_.arm, 0, 0, 6 * out)
            ch.pose(fr, base, 0, body)
            ch.face(fr, **({"smug": 0.5 * out, "worry": 0.4 * out}))
        for l in ls:
            key_xf(l, a, scale=0.001); key_xf(l, a + 12, scale=0.001); key_xf(l, a + 18, scale=1.0)

    # ---------------------------------------------------------------- house: "Wayne did."
    a, b = ends("house")
    for fr, face in ((a, {"worry": 0.6}), (b, {"worry": 1.0})):
        W.pose(fr, HO + Vector((0.3, -4.2, 0)), 4, lambda a: stand(a, look=(4, -4), arms="hang"))
        W.face(fr, **face)
    for i, tg in enumerate(rig.tags):
        t0 = a + 2 + i * 6
        key_xf(tg, a, scale=0.001); key_xf(tg, t0, scale=0.001); key_xf(tg, t0 + 3, scale=1.25); key_xf(tg, t0 + 5, scale=1.0)

    # ---------------------------------------------------------------- calendar: twelve days later
    a, b = ends("calendar")
    for i, hinge in enumerate(rig.cal_pages[:-1]):
        t0 = a + 3 + i * 2.3
        key_xf(hinge, int(t0), rot=(0, 0, 0))
        key_xf(hinge, int(t0) + 3, rot=(math.radians(-200), 0, 0))
    at_desk("calendar", [(0.0, {"hands": "desk"}, {"calm": 0.4}), (1.0, {"hands": "desk"}, {"calm": 0.4})])

    # ---------------------------------------------------------------- strike: his name crossed out
    st_line, pen3, cd = rig.strike, rig.pen3, rig.contract_desk
    a, b = ends("strike")
    key_xf(st_line, a, scale=(0.001, 1, 1)); key_xf(st_line, a + 4, scale=(0.001, 1, 1))
    key_xf(st_line, b - 4, scale=(1, 1, 1))
    for fr in range(a, b + 1):
        u = min(1, max(0, (fr - a - 4) / max(1, b - a - 8)))
        tip = page_point(cd, 0.09 + 0.44 * u, 0.877)
        key_xf(pen3, fr, tip, (math.radians(22), math.radians(-28), 0))
    for u in (0.0, 0.35, 0.7, 1.0):
        fr = F("strike", u)
        sc.frame_set(fr)
        tip = pen3.matrix_world.translation; axis = pen3.matrix_world.to_3x3() @ Vector((0, 0, 1))
        W.pose(fr, seat_hip, 0, lambda a, tip=tip, axis=axis: sit_desk(a, look=(-40, 0), lean=18, hands=None, hand_pts={
            "Right": (tip + axis * 0.06, -axis + Vector((0, -0.3, 0)), 1.2),
            "Left": (O + Vector((0.95, 1.5, DESK_TOP + 0.04)), Vector((-0.3, -1, -0.2)), 0.4)}), seated=True)
        W.face(fr, worry=0.4)

    # ---------------------------------------------------------------- cash800: eight bills land on the desk
    a, b = ends("cash800")
    for i, bl in enumerate(rig.falling_bills):
        land = a + 3 + i * 3
        rr = random.Random(i)
        p = O + Vector((0.42 + rr.uniform(-0.02, 0.02) + i * 0.008, 1.32 + rr.uniform(-0.02, 0.02), DESK_TOP + 0.002 + i * 0.0006))
        rz = math.radians(rr.uniform(-25, 25))
        key_xf(bl, a, p + Vector((0, 0, 0.5)), (0, 0, rz + 1.0), scale=0.001)
        key_xf(bl, land - 4, p + Vector((0.03, 0, 0.3)), (math.radians(20), 0, rz + 0.5), scale=1.0)
        key_xf(bl, land, p, (0, 0, rz))
    at_desk("cash800", [(0.0, {"hands": "desk", "look": (-35, 0)}, {"worry": 0.3}),
                        (1.0, {"hands": "desk", "look": (-35, 0)}, {"calm": 0.4})])

    # ---------------------------------------------------------------- check: $1,500 slides across
    chq = rig.cheque
    a, b = ends("check")
    key_xf(chq, a, O + Vector((0.55, 0.85, DESK_TOP + 0.002)), (0, 0, math.radians(185)))
    key_xf(chq, a + 14, O + Vector((0.6, 1.36, DESK_TOP + 0.002)), (0, 0, math.radians(180)))
    key_xf(chq, b, O + Vector((0.6, 1.37, DESK_TOP + 0.002)), (0, 0, math.radians(180)))
    at_desk("check", [(0.0, {"hands": "desk", "look": (-30, 0)}, {"calm": 0.3}),
                      (1.0, {"hands": "desk", "look": (-32, 0)}, {"smug": 0.3})])

    # ---------------------------------------------------------------- signoff: he signs and sits back
    a, b = ends("signoff")
    sg_lvl, pen4, wd = rig.withdraw_sig_reveal, rig.pen4, rig.withdrawal
    ST.key_value(sg_lvl, a, 0.2); ST.key_value(sg_lvl, a + 16, 1.0)
    for fr in range(a, a + 17):
        u = (fr - a) / 16
        tip = page_point(wd, 0.12 + 0.36 * (0.2 + 0.8 * u), 0.775 + 0.012 * math.sin(fr * 2.2))
        key_xf(pen4, fr, tip, (math.radians(22), math.radians(-28), 0))
    key_xf(pen4, a + 22, page_point(wd, 0.75, 0.6) + Vector((0, 0, 0.01)), (math.radians(80), 0, math.radians(20)))
    key_xf(pen4, b, page_point(wd, 0.75, 0.6) + Vector((0, 0, 0.0)), (math.radians(90), 0, math.radians(20)))
    for u in (0.0, 0.3):
        fr = F("signoff", u)
        sc.frame_set(fr)
        tip = pen4.matrix_world.translation; axis = pen4.matrix_world.to_3x3() @ Vector((0, 0, 1))
        W.pose(fr, seat_hip, 0, lambda a, tip=tip, axis=axis: sit_desk(a, look=(-36, 0), lean=16, hands=None, hand_pts={
            "Right": (tip + axis * 0.06, -axis + Vector((0, -0.3, 0)), 1.2),
            "Left": (O + Vector((0.95, 1.5, DESK_TOP + 0.04)), Vector((-0.3, -1, -0.2)), 0.4)}), seated=True)
        W.face(fr, calm=0.4)
    for u, face in ((0.62, {"exhale": 0.8}), (1.0, {"calm": 0.7, "smug": 0.2})):
        fr = F("signoff", u)
        W.pose(fr, seat_hip + Vector((0, 0.04, 0)), 0, lambda a: sit_desk(a, look=(4, 0), lean=-14, hands="armrest"),
               seated=True)
        W.face(fr, **face)

    # ---------------------------------------------------------------- stage: $5 trillion, then the slab
    a, b = ends("slab")
    slab = rig.slab
    key_xf(slab, ends("trillion")[0], slab.location.copy())
    key_xf(slab, a + 4, slab.location.copy())
    key_xf(slab, a + 34, slab.location + Vector((0, -7.0, 0)))
    key_xf(slab, b, slab.location + Vector((0, -7.4, 0)))
    wpos = ST_ + Vector((1.5, -16.5, 0))
    for sh in ("trillion", "slab"):
        for u, look in ((0.0, (30, 0)), (0.5, (34, -6)), (1.0, (22, -14))):
            fr = F(sh, u)

            def body(a_, look=look):
                legs_stand(a_.arm, 0.07); spine(a_.arm, -4, 0, 0)
                a_.hand("Right", a_.W(0.3, -0.16, 1.15), pole=(-1.0, 0.3, -1.0), dir_world=Vector((0.2, 0, 1)))
                arms_hang(a_.arm, 0.0) if False else None
                aim(a_.arm, "LeftArm", (0.17, 0.03, -1)); aim(a_.arm, "LeftForeArm", (0.08, -0.22, -1))
                posing.curl_fingers(a_.arm, "Right", 1.1)
                head(a_.arm, look[0], look[1], 0)
            W.pose(fr, wpos if sh == "trillion" else ST_ + Vector((29.5, -13.5, 0)), 180 if sh == "trillion" else 190,
                   body)
            W.face(fr, shock=0.6 if sh == "trillion" else 0.3, worry=0.0 if sh == "trillion" else 0.6)

    # ---------------------------------------------------------------- drawer: the copy he kept
    cdr, fold_front = rig.contract_drawer, rig.folder_front
    a, b = ends("drawer")
    fpos = O + Vector((0.6, 1.33, DESK_TOP + 0.003))
    key_xf(fold_front, a, rot=(0, 0, 0)); key_xf(fold_front, a + 8, rot=(math.radians(-170), 0, 0))
    key_xf(cdr, a + 8, fpos + Vector((0, 0, 0.004)), (0, 0, math.pi))
    key_xf(cdr, a + 26, O + Vector((0.6, 1.56, 0.93)), (math.radians(-48), 0, 0))
    key_xf(cdr, b, O + Vector((0.6, 1.57, 0.935)), (math.radians(-50), 0, 0))
    for u, face in ((0.0, {"calm": 0.4}), (0.3, {"calm": 0.5}), (0.6, {"smug": 0.5}), (1.0, {"smug": 0.7})):
        fr = F("drawer", u)
        sc.frame_set(fr)
        L = page_point(cdr, 0.96, 0.5); Rr = page_point(cdr, 0.04, 0.5)
        W.pose(fr, seat_hip, 0, lambda a, L=L, Rr=Rr: sit_desk(a, look=(-30 + 25 * u, 0), lean=10, hands=None, hand_pts={
            "Left": (L, Vector((-0.2, 0, 1)), 0.9), "Right": (Rr, Vector((0.2, 0, 1)), 0.9)}), seated=True)
        W.face(fr, **face)
    at_desk("signatures", [(0.0, {"hands": "desk", "look": (-30, 0)}, {"calm": 0.6}),
                           (1.0, {"hands": "desk", "look": (-30, 0)}, {"calm": 0.6})])

    # ---------------------------------------------------------------- sold500: across the counter
    a, b = ends("sold500")
    ctop = SH + Vector((0, 0, 0.95))
    cs = rig.contract_shop
    key_xf(cs, a, ctop + Vector((-0.05, -0.22, 0.002)), (0, 0, math.radians(8)))
    key_xf(cs, a + 20, ctop + Vector((0.0, 0.12, 0.002)), (0, 0, math.radians(-4)))
    key_xf(cs, b, ctop + Vector((0.0, 0.14, 0.002)), (0, 0, math.radians(-4)))
    for i, bl in enumerate(rig.shop_bills):
        land = a + 18 + i * 5
        p = ctop + Vector((-0.28 + i * 0.03, -0.12 + i * 0.006, 0.002 + i * 0.0006))
        key_xf(bl, a, p + Vector((0, 0.3, 0.3)), (0, 0, 0.4), scale=0.001)
        key_xf(bl, land - 3, p + Vector((0, 0.15, 0.08)), (0, 0, 0.2), scale=1.0)
        key_xf(bl, land, p, (0, 0, math.radians(-6 + i * 3)))
    shopkeeper = BID[0]
    for u in (0.0, 0.35, 0.7, 1.0):
        fr = F("sold500", u)
        sc.frame_set(fr)
        cpt = cs.matrix_world.translation
        W.pose(fr, SH + Vector((0.0, -0.75, 0)), 180, lambda a, cpt=cpt, u=u: stand(a, look=(-30, 0), lean=12, hand_pts={
            "Right": (cpt + Vector((0.02, -0.1, 0.03)) if u < 0.4 else ctop + Vector((0.12, -0.25, 0.04)),
                      Vector((0, 1, -0.4)), 0.4),
            "Left": (ctop + Vector((-0.25, -0.32, 0.04)), Vector((0.2, 1, -0.4)), 0.5)}))
        W.face(fr, calm=0.4)
        bp = ctop + Vector((-0.22 + 0.12 * u, -0.05, 0.05 + 0.04 * math.sin(u * 9)))
        shopkeeper.pose(fr, SH + Vector((0.0, 0.75, 0)), 0, lambda a, bp=bp: stand(a, look=(-30, 0), lean=14, hand_pts={
            "Right": (bp, Vector((0, -1, -0.3)), 0.7),
            "Left": (ctop + Vector((0.25, 0.2, 0.04)), Vector((0, -1, -0.3)), 0.5)}))
        shopkeeper.face(fr, smug=0.6)

    # ---------------------------------------------------------------- auction: paddles up, the price climbs
    a, b = ends("auction")
    faces = rig.board_faces
    stamps = [a, a + 7, a + 15, a + 24, a + 33, a + 42]
    for k, face in enumerate(faces):
        on_from = stamps[k] if k < 6 else ends("gavel")[0] + 10
        on_to = (stamps[k + 1] if k + 1 < 6 else ends("gavel")[0] + 10) if k < 6 else ends("gavel")[1] + 1
        face.hide_render = True; face.keyframe_insert("hide_render", frame=1)
        face.hide_render = False; face.keyframe_insert("hide_render", frame=on_from)
        face.hide_render = True; face.keyframe_insert("hide_render", frame=on_to)
    seats = rig.bidder_seats
    raise_at = [[a + 2, a + 25], [a + 9], [a + 16, a + 36], [a + 30]]
    for i, ch in enumerate(BID):
        sx, sy = seats[i]
        hip = AU + Vector((sx, sy + 0.02, 0.5))
        frames = sorted({a, ends("gavel")[1]} | {t for r in raise_at[i] for t in (r, r + 6, r + 10)})
        for fr in frames:
            up = any(r <= fr <= r + 6 for r in raise_at[i])
            ch.pose(fr, hip, 180, lambda a_, up=up: sit_chair(a_, look=(4, 0), lean=4, hands="lap" if not up else None,
                                                               hand_pts={"Right": (a_.W(0.2, -0.2, 1.65), Vector((0, 0, 1)), 1.0)} if up else
                                                               {"Right": (a_.W(0.32, -0.14, a_.hips_w.z + 0.18), Vector((0, 0.4, 1)), 1.0)}),
                    seated=True)
            ch.face(fr, calm=0.5)
    # auctioneer at the podium, gavel in his right hand
    apos = AU + Vector((2.2, 4.65, 0))
    gav_up = [(ends("auction")[0], 0.0), (ends("gavel")[0], 0.0), (ends("gavel")[0] + 6, 1.0), (ends("gavel")[0] + 10, -0.2),
              (ends("gavel")[0] + 12, 0.0), (ends("gavel")[1], 0.0)]
    for fr, g in gav_up:
        AUC.pose(fr, apos, 180 + 180, lambda a_, g=g: stand(a_, look=(-6, 0), lean=6, hand_pts={
            "Right": (AU + Vector((2.42, 4.05, 1.32 + 0.22 * g)), Vector((0, -0.2, 1)), 1.1),
            "Left": (AU + Vector((1.98, 4.15, 1.2)), Vector((0, -1, -0.2)), 0.4)}))
        AUC.face(fr, smug=0.6 if g >= 0 else 0.9)

    # ---------------------------------------------------------------- nevada: no regrets, the newspaper
    ohip = NV + Vector((0.55, 0.52, 0.48))
    a, b = ends("armchair")
    for fr, face in ((a, {"calm": 0.6}), (F("armchair", 0.5), {"smug": 0.5}), (b, {"smug": 0.6})):
        OW.pose(fr, ohip, 15, lambda a_: sit_chair(a_, look=(0, 0), lean=-12, hands="lap"), seated=True)
        OW.face(fr, **face)
    news = rig.newspaper
    a, b = ends("newspaper")
    b2 = ends("stare")[1]
    up_pos = ohip + fwd(15) * 0.42 + Vector((0, 0, 0.42))
    down_pos = ohip + fwd(15) * 0.45 + Vector((0, 0, 0.05))
    key_xf(news, a, up_pos, (0, 0, math.radians(15)))
    key_xf(news, b - 4, up_pos + Vector((0, 0, 0.01)), (0, 0, math.radians(15)))
    key_xf(news, b + 12, down_pos, (math.radians(-70), 0, math.radians(15)))
    key_xf(news, b2, down_pos, (math.radians(-72), 0, math.radians(15)))
    for fr, face, look in ((a, {"calm": 0.5}, (-4, 0)), (b - 4, {"worry": 0.3}, (-4, 0)), (b + 12, {"worry": 0.5}, (2, 0)),
                           (F("stare", 0.5), {"worry": 0.7, "exhale": 0.2}, (2, 0)), (b2, {"worry": 0.8}, (2, 0))):
        sc.frame_set(fr)
        Lp = news.matrix_world @ Vector((-0.2, 0, 0.0)); Rp = news.matrix_world @ Vector((0.2, 0, 0.0))
        OW.pose(fr, ohip, 15, lambda a_, Lp=Lp, Rp=Rp, look=look: sit_chair(a_, look=look, lean=-6, hands=None, hand_pts={
            "Left": (Lp, Vector((0, 0, 1)), 0.9), "Right": (Rp, Vector((0, 0, 1)), 0.9)}), seated=True)
        OW.face(fr, **face)


# ============================================================================= cameras
def cam_plan(rig):
    """name -> (lens, fn(u, fr) -> (loc, tgt), fstop, shake, roll)."""
    o = O
    wh = WAYNE_SEAT + Vector((0, -0.1, 1.15))     # Wayne's head, seated
    plan = {
        "intro": (32, lambda u, fr: (lerp(o + V(0.6, -0.55, 1.28), o + V(0.6, 0.15, 1.22), _ease(u)),
                                    o + V(0.6, 1.8, 1.12)), 2.8, 0.25, 0),
        "contract10": (40, lambda u, fr: (lerp(o + V(0.6, 1.25, 1.03), o + V(0.6, 1.31, 1.01), _ease(u)),
                                         o + V(0.6005, 1.606, 0.948)), 4.0, 0.12, 0),
        "sold800": (35, lambda u, fr: (lerp(o + V(0.75, 0.25, 1.22), o + V(0.72, 0.45, 1.2), u),
                                      o + V(0.6, 1.95, 1.08)), 2.8, 0.25, 0),
        "atari": (20, lambda u, fr: (lerp(o + V(-0.6, -2.6, 1.65), o + V(-0.2, -2.5, 1.6), u),
                                    o + V(-0.6, 1.6, 1.05)), None, 0.2, 0),
        "steves": (24, lambda u, fr: (lerp(o + V(1.05, 2.65, 1.6), o + V(1.0, 2.55, 1.58), u),
                                     o + V(-1.6, -0.1, 1.2)), 3.5, 0.25, 0),
        "adult": (20, lambda u, fr: (lerp(o + V(1.65, 0.15, 1.32), o + V(1.55, 0.3, 1.3), u),
                                    o + V(-0.75, 2.4, 1.22)), 3.2, 0.2, 0),
        "split45": (22, lambda u, fr: (lerp(o + V(0.6, 2.75, 1.85), o + V(0.6, 2.62, 1.8), u),
                                      o + V(0.6, 0.85, 0.95)), None, 0.2, 0),
        "split10": (22, lambda u, fr: (lerp(o + V(0.6, -1.75, 1.45), o + V(0.6, -1.6, 1.43), u),
                                      o + V(0.6, 1.3, 1.15)), None, 0.2, 0),
        "typewriter": (35, lambda u, fr: (lerp(o + V(0.12, 1.95, 1.32), o + V(0.14, 1.9, 1.3), u),
                                         o + V(0.35, 1.12, 1.0)), 2.8, 0.15, 0),
        "sketch": (35, lambda u, fr: (lerp(o + V(0.92, 1.85, 1.22), o + V(0.92, 1.8, 1.18), u),
                                     o + V(0.92, 1.42, DESK_TOP)), 4.0, 0.12, 0),
        "boards": (20, lambda u, fr: (lerp(o + V(-2.3, -1.3, 1.45), o + V(-2.38, -1.12, 1.42), u),
                                     o + V(-2.9, 0.4, 1.05)), 3.5, 0.2, 0),
        "credit": (35, lambda u, fr: (lerp(o + V(1.02, 0.96, 2.2), o + V(1.02, 0.97, 2.12), u),
                                     o + V(1.02, 1.03, DESK_TOP)), 5.6, 0.12, 0),
        "hook": (17, lambda u, fr: (lerp(o + V(0.0, -2.85, 1.25), o + V(0.0, -2.7, 1.28), u),
                                   o + V(0.0, 0.0, 1.35)), None, 0.25, 0),
        "pockets": (28, lambda u, fr: (lerp(o + V(0.0, -1.85, 1.15), o + V(0.0, -1.7, 1.12), u),
                                      o + V(0.0, 0.35, 1.0)), 3.5, 0.2, 0),
        "house": (18, lambda u, fr: (lerp(HO + V(-0.5, -11.0, 1.6), HO + V(-0.5, -9.6, 1.6), _out(u)),
                                    HO + V(1.8, 0.0, 1.6)), None, 0.3, 0),
        "calendar": (35, lambda u, fr: (lerp(o + V(1.02, 0.6, 1.0), o + V(1.02, 0.64, 0.99), u),
                                       o + V(1.0, 1.0, 0.9)), 4.0, 0.12, 0),
        "strike": (35, lambda u, fr: (lerp(o + V(1.0, 1.62, 1.08), o + V(0.98, 1.6, 1.05), u),
                                     o + V(0.64, 1.47, DESK_TOP)), 4.0, 0.12, 0),
        "cash800": (30, lambda u, fr: (lerp(o + V(0.75, 1.85, 1.32), o + V(0.72, 1.8, 1.28), u),
                                      o + V(0.5, 1.3, DESK_TOP)), 4.0, 0.15, 0),
        "check": (30, lambda u, fr: (lerp(o + V(0.6, 1.5, 1.27), o + V(0.6, 1.46, 1.2), _ease(u)),
                                    o + V(0.6, 1.365, DESK_TOP)), 5.6, 0.12, 0),
        "signoff": (32, lambda u, fr: (lerp(o + V(0.35, 0.3, 1.25), o + V(0.4, 0.45, 1.25), u),
                                      o + V(0.6, 1.95, 1.05)), 2.8, 0.2, 0),
        "trillion": (16, lambda u, fr: _pullback(u, ST_), None, 0.3, 0),
        "slab": (16, lambda u, fr: (lerp(ST_ + V(38.6, -22.6, 2.1), ST_ + V(38.0, -22.0, 2.3), u),
                                   ST_ + V(25.9, -0.1, 10.3)), None, 0.3, 0),
        "drawer": (32, lambda u, fr: (lerp(o + V(0.85, 0.65, 1.2), o + V(0.82, 0.75, 1.2), u),
                                     o + V(0.6, 1.8, 1.05)), 2.8, 0.2, 0),
        "signatures": (34, lambda u, fr: (o + V(0.72 - 0.07 * _ease(u), 1.6, 1.2),
                                         o + V(0.7 - 0.07 * _ease(u), 1.475, DESK_TOP)), 5.6, 0.1, 0),
        "sold500": (26, lambda u, fr: (lerp(SH + V(0.02, -0.2, 1.9), SH + V(0.02, -0.16, 1.82), u),
                                      SH + V(-0.04, 0.0, 0.95)), 5.6, 0.15, 0),
        "auction": (24, lambda u, fr: (lerp(AU + V(3.2, -5.8, 2.1), AU + V(2.9, -5.0, 2.05), u),
                                      AU + V(0.4, 4.2, 1.8)), None, 0.2, 0),
        "gavel": (20, lambda u, fr: (lerp(AU + V(2.0, 1.05, 1.6), AU + V(2.05, 1.3, 1.6), u),
                                    AU + V(2.2, 4.6, 2.4)), None, 0.2, 0),
        "armchair": (30, lambda u, fr: (lerp(NV + V(-0.05, -1.55, 1.12), NV + V(0.0, -1.4, 1.1), u),
                                       NV + V(0.55, 0.6, 0.98)), 3.5, 0.15, 0),
        "newspaper": (28, lambda u, fr: (lerp(NV + V(0.4, -0.95, 1.05), NV + V(0.42, -0.85, 1.05), u),
                                        NV + V(0.62, 0.15, 0.98)), 4.0, 0.12, 0),
        "stare": (40, lambda u, fr: (lerp(NV + V(0.35, -0.55, 1.12), NV + V(0.38, -0.38, 1.12), _ease(u)),
                                    NV + V(0.52, 0.5, 1.1)), 3.2, 0.1, 0),
    }
    return plan


def _look(loc, tgt, roll=0.0):
    q = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll:
        e = (q @ Quaternion((0, 0, 1), math.radians(roll))).to_euler()
    return e


def _pullback(u, st):
    """From a few metres off the face of the cash (bundles readable) back to the whole block: the
    distance grows exponentially so the apparent zoom-out stays even."""
    e = _ease(u)
    t0, t1 = st + Vector((1.0, 2.1, 1.8)), st + Vector((-2.0, 25.0, 9.0))
    d0, d1 = Vector((0.25, -1.0, 0.05)).normalized(), Vector((-0.5, -1.0, 0.35)).normalized()
    g = t0.lerp(t1, e)
    d = d0.lerp(d1, e).normalized() * (4.5 * (105.0 / 4.5) ** e)
    return g + d, g


def cameras(rig):
    sc = bpy.context.scene
    coll = S.collection("Cameras")
    plan = cam_plan(rig)
    made = {}
    for name, t0, t1, st in SHOTS:
        lens, fn, fstop, shake, roll = plan[name]
        a, b = f(t0), f(t1) - 1
        cd = bpy.data.cameras.new("Cam_" + name)
        cd.lens = lens
        cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24.0
        cd.clip_start = 0.01; cd.clip_end = 3000
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
