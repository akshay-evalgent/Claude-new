"""Performance, the digging, cameras and visibility for the doghouse short (see timeline.py)."""
import math, random
import bpy
from mathutils import Vector, Euler, Matrix, Quaternion

import sets as S
import storm as ST
import anim
import posing
from anim import hand_to, foot_to, spine, head, shoulders, fingers, rot, aim, arms_hang, legs_stand
import grounds as G
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


# ============================================================================= helpers for this film
def tool_at(root, fr, p_lo, p_hi, lo_z, hi_z):
    """Key a tool so its local z = lo_z sits at p_lo and its local +Z points at p_hi."""
    d = (V(p_hi) - V(p_lo)).normalized()
    root.rotation_mode = "QUATERNION"
    root.rotation_quaternion = d.to_track_quat("Z", "Y")
    root.location = V(p_lo) - d * lo_z
    root.keyframe_insert("location", frame=fr); root.keyframe_insert("rotation_quaternion", frame=fr)


def key_value(sock, fr, v):
    sock.default_value = v; sock.keyframe_insert("default_value", frame=fr)


def key_scale_z(obj, fr, s):
    obj.scale = (1, 1, s); obj.keyframe_insert("scale", index=2, frame=fr)


def key_scale_x(obj, fr, s):
    obj.scale = (s, 1, 1); obj.keyframe_insert("scale", index=0, frame=fr)


def constant(idblock):
    ad = idblock.animation_data
    if ad and ad.action:
        for fc in ST._fcurves(ad.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "CONSTANT"


SPADE = (-0.5, 0.6)       # rusted_spade_01: blade end, handle end (local z)
PICK = (-0.35, 0.76)      # picke_dirty_01: handle end, head (local z)


def dig_pose(a_, down, blade, handle):
    legs_stand(a_.arm, 0.14, 0.18); spine(a_.arm, 24 if down else 8, 0 if down else -16, 0)
    mid = V(blade).lerp(V(handle), 0.55)
    a_.hand("Right", handle, pole=(-1.0, 0.3, -1.0))
    a_.hand("Left", mid, pole=(1.0, 0.2, -1.0))
    fingers(a_.arm, 1.3)
    head(a_.arm, -24 if down else -6, 0, 0)


# ============================================================================= the performance
def perform(rig):
    R = rig["site"]
    B, N = rig["builder"], rig["neighbor"]
    sc = bpy.context.scene
    M, C = R["M"], R["C"]
    names = [n for n, *_ in SHOTS]
    fin_end = ends("notdog")[1]              # the finished bunker is shown up to here
    b0 = ends("hole")[0]                     # then the build starts from nothing

    # ---------------------------------------------------------------- the digging (cutters)
    s1 = C["s1"]; L1 = -G.FLOOR + 0.25 - 0.02

    def shaft_depth(fr, d):
        key_scale_z(s1, fr, max(0.002, (0.25 + d) / L1))
    shaft_depth(1, -G.FLOOR); shaft_depth(fin_end, -G.FLOOR); shaft_depth(b0, 0.0)
    a, b = ends("hole"); shaft_depth(F("hole", 0.4), 0.0); shaft_depth(b, 0.45)
    a, b = ends("cavein"); shaft_depth(a, 2.8); shaft_depth(F("cavein", 0.3), 3.0)
    a, b = ends("rings"); shaft_depth(a - 1, 3.0); shaft_depth(a, -G.FLOOR - 0.02)
    for fc in ST._fcurves(s1.animation_data.action):        # jumps only at the cuts between stages
        for kp in fc.keyframe_points:
            if kp.co.x in (fin_end, ends("cavein")[0] - 1, ends("rings")[0] - 1, ends("hole")[1]):
                kp.interpolation = "CONSTANT"
    r1 = C["r1"]
    key_scale_x(r1, 1, 1.0); key_scale_x(r1, fin_end, 1.0); key_scale_x(r1, b0, 0.001)
    a, b = ends("dig"); key_scale_x(r1, a, 0.001); key_scale_x(r1, F("dig", 0.15), 0.05); key_scale_x(r1, F("dig", 0.95), 1.0)
    t = C["t"]
    full = 1.0; head_ = (G.R2[0] - G.WALL - 0.1 - C["t0"]) / C["t_len"]    # stops short of the neighbour's wall
    key_scale_x(t, 1, full); key_scale_x(t, fin_end, full); key_scale_x(t, b0, 0.001)
    a, b = ends("keepdig"); key_scale_x(t, a, 0.001); key_scale_x(t, F("keepdig", 0.45), 0.04); key_scale_x(t, b, 0.1)
    a, b = ends("garden"); key_scale_x(t, a, 0.1); key_scale_x(t, b, head_ - 0.04)
    a, b = ends("break"); key_scale_x(t, a, head_ - 0.04); key_scale_x(t, F("break", 0.38), head_)
    k_break = F("break", 0.42)
    key_scale_x(t, k_break, full)
    for fc in ST._fcurves(t.animation_data.action):
        for kp in fc.keyframe_points:
            if kp.co.x in (fin_end, b0, k_break - 0) or kp.co.x == F("break", 0.38):
                kp.interpolation = "CONSTANT"

    def tunnel_front(fr):
        sc.frame_set(fr)
        return C["t0"] + C["t_len"] * t.scale.x

    # ---------------------------------------------------------------- the doghouse moves aside and back
    dh = R["dh1"]; home = dh.location.copy()
    aside = home + Vector((-1.9, 2.4, 0.0))
    key_xf(dh, 1, loc=home, rot=(0, 0, 0)); key_xf(dh, b0, loc=home, rot=(0, 0, 0))
    key_xf(dh, F("hole", 0.12), loc=home, rot=(0, 0, 0))
    key_xf(dh, F("hole", 0.25), loc=home + Vector((0, 0.3, 0.25)), rot=(math.radians(-8), 0, 0))
    key_xf(dh, F("hole", 0.4), loc=aside, rot=(0, 0, math.radians(-25)))
    a = ends("vent")[0]
    key_xf(dh, a - 1, loc=aside, rot=(0, 0, math.radians(-25))); key_xf(dh, a, loc=home, rot=(0, 0, 0))

    # ---------------------------------------------------------------- rings drop in, bottom first
    rings1 = R["rings1"]
    a, b = ends("rings")
    n = len(rings1)
    for idx in range(n):
        k = n - 1 - idx                                   # ring 11 (deepest) first
        root, objs, z_fin = rings1[k]
        s0 = a + 2 + int((b - a - 10) * idx / n)
        key_xf(root, 1, loc=(root.location.x, root.location.y, z_fin), scale=1.0)
        key_xf(root, fin_end, loc=(root.location.x, root.location.y, z_fin), scale=1.0)
        key_xf(root, b0, loc=(root.location.x, root.location.y, 2.2), scale=0.001)
        key_xf(root, s0 - 1, loc=(root.location.x, root.location.y, 2.2), scale=0.001)
        key_xf(root, s0, loc=(root.location.x, root.location.y, 1.6), scale=1.0)
        key_xf(root, s0 + 5, loc=(root.location.x, root.location.y, z_fin))
        key_xf(root, s0 + 6, loc=(root.location.x, root.location.y, z_fin + 0.03))
        key_xf(root, s0 + 7, loc=(root.location.x, root.location.y, z_fin))

    # ---------------------------------------------------------------- the ladder slides down
    ld = R["ladder1"]
    key_xf(ld, 1, loc=(ld.location.x, ld.location.y, 0.0)); key_xf(ld, fin_end, loc=(ld.location.x, ld.location.y, 0.0))
    key_xf(ld, b0, loc=(ld.location.x, ld.location.y, 7.0))
    a, b = ends("ladder")
    key_xf(ld, a, loc=(ld.location.x, ld.location.y, 7.0)); key_xf(ld, F("ladder", 0.55), loc=(ld.location.x, ld.location.y, -0.05))
    key_xf(ld, F("ladder", 0.7), loc=(ld.location.x, ld.location.y, 0.0))
    for fc in ST._fcurves(ld.animation_data.action):
        for kp in fc.keyframe_points:
            if kp.co.x in (fin_end, b0):
                kp.interpolation = "CONSTANT"

    # ---------------------------------------------------------------- the room is poured
    shell = rig["shell1_root"]
    key_scale_z(shell, 1, 1.0); key_scale_z(shell, fin_end, 1.0); key_scale_z(shell, b0, 0.002)
    a, b = ends("pour"); key_scale_z(shell, a, 0.002); key_scale_z(shell, F("pour", 0.7), 1.0)
    constant_at = [fin_end]

    # ---------------------------------------------------------------- vent, chimney, cable, lights
    vr = R["vent"]
    key_scale_z(vr, 1, 1.0); key_scale_z(vr, fin_end, 1.0); key_scale_z(vr, b0, 0.001)
    a, b = ends("vent"); key_scale_z(vr, a, 0.001); key_scale_z(vr, F("vent", 0.12), 0.001); key_scale_z(vr, F("vent", 0.92), 1.0)
    ch = R["chimney1"]
    key_xf(ch, 1, scale=1.0); key_xf(ch, fin_end, scale=1.0); key_xf(ch, b0, scale=0.001)
    a, b = ends("chimney")
    key_xf(ch, F("chimney", 0.3), scale=0.001); key_xf(ch, F("chimney", 0.42), scale=(1, 1, 1.25)); key_xf(ch, F("chimney", 0.52), scale=(1, 1, 0.9))
    key_xf(ch, F("chimney", 0.6), scale=1.0)
    cu = R["cable"].data
    for fr, v in ((1, 1.0), (fin_end, 1.0), (b0, 0.0), (ends("power")[0] + 2, 0.0), (ends("power")[1] - 2, 1.0)):
        cu.bevel_factor_end = v; cu.keyframe_insert("bevel_factor_end", frame=fr)
    lon = ends("lights")[0] + 5
    for lt in R["lights1"]:
        for fr, e in ((1, 120.0), (fin_end, 120.0), (b0, 0.0), (lon - 1, 0.0), (lon, 120.0)):
            lt.data.energy = e; lt.data.keyframe_insert("energy", frame=fr)
        constant(lt.data)
    bulb = M["bulb"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    for fr, e in ((1, 12.0), (fin_end, 12.0), (b0, 0.0), (lon - 1, 0.0), (lon, 12.0)):
        key_value(bulb, fr, e)
    constant(M["bulb"].node_tree)
    led = M["led"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    key_value(led, 1, 0.0)
    for k, fr in enumerate(range(lon, f(END) + 1, 5)):
        key_value(led, fr, 25.0 if k % 3 != 1 else 3.0)
    constant(M["led"].node_tree)
    glow = R["shaftglow"].data
    for fr, e in ((1, 0.0), (ends("notdog")[0], 40.0), (b0, 0.0)):
        glow.energy = e; glow.keyframe_insert("energy", frame=fr)
    constant(glow)
    wl = R["worklight"].data
    for fr, e in ((1, 0.0), (ends("dig")[0], 90.0), (lon - 1, 90.0), (lon, 0.0)):
        wl.energy = e; wl.keyframe_insert("energy", frame=fr)
    constant(wl)
    for fc in ST._fcurves(cu.animation_data.action):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR" if kp.co.x == ends("power")[0] + 2 else "CONSTANT"
    # furniture pops in when the lights come on
    furn = rig["furniture1"]
    a, b = ends("lights")
    for i, root in enumerate(furn):
        s0 = lon + 2 + i * 2
        key_xf(root, 1, scale=1.0); key_xf(root, fin_end, scale=1.0); key_xf(root, b0, scale=0.001)
        key_xf(root, s0 - 1, scale=0.001); key_xf(root, s0 + 3, scale=1.12); key_xf(root, s0 + 5, scale=1.0)

    # ---------------------------------------------------------------- the tunnel liner follows the digger
    for pieces, x0 in R["liner"]:
        for o in pieces:
            key_xf(o, 1, scale=1.0); key_xf(o, fin_end, scale=1.0); key_xf(o, b0, scale=0.001)
    a0 = ends("keepdig")[0]; b1 = ends("break")[1]
    shown = set()
    for fr in range(a0, b1 + 1):
        front = tunnel_front(fr)
        for i, (pieces, x0) in enumerate(R["liner"]):
            if i not in shown and front > x0 + 0.9:
                shown.add(i)
                for o in pieces:
                    key_xf(o, fr - 1, scale=0.001); key_xf(o, fr + 2, scale=(1.0, 1.1, 1.1)); key_xf(o, fr + 4, scale=1.0)

    # ---------------------------------------------------------------- the wall bursts
    rr = random.Random(11)
    for root, o, c in R["chunks"]:
        key_xf(root, 1, loc=c, rot=(0, 0, 0)); key_xf(root, k_break - 1, loc=c, rot=(0, 0, 0))
        v = Vector((rr.uniform(2.2, 4.5), rr.uniform(-0.6, 1.2), rr.uniform(0.5, 2.2)))
        spin = Vector((rr.uniform(-9, 9), rr.uniform(-9, 9), rr.uniform(-9, 9)))
        p = c.copy(); vel = v.copy()
        for k in range(1, 30):
            dt = 1 / FPS
            vel.z -= 9.8 * dt
            p = p + vel * dt
            if p.z < G.FLOOR + 0.05:
                p.z = G.FLOOR + 0.05; vel.z = -vel.z * 0.3; vel.x *= 0.5; vel.y *= 0.5
            if p.x > G.R2[1] - 0.2:
                p.x = G.R2[1] - 0.2; vel.x = -vel.x * 0.3
            key_xf(root, k_break + k, loc=p, rot=tuple(spin * (k / FPS) * (1 if k < 18 else 18 / k)))

    # ---------------------------------------------------------------- props: bucket, tripod, clods
    bucket, rope = R["bucket"], R["rope"]
    a, b = ends("dig")
    for k, fr in enumerate(range(a, b + 1, 3)):
        u = (k % 6) / 5.0
        zb = G.FLOOR + 0.05 + (0.3 - (G.FLOOR + 0.05)) * (u if u <= 1 else 1)
        zb = G.FLOOR + 0.05 + (0.4 - G.FLOOR) * (math.sin(math.pi * (k % 6) / 6))
        key_xf(bucket, fr, loc=(G.D1.x + 0.1, 0.12, zb))
        top = 0.9
        rope.location = (G.D1.x + 0.1, 0.12, (zb + 0.55 + top) / 2); rope.scale = (1, 1, max(0.05, top - zb - 0.55))
        rope.keyframe_insert("location", frame=fr); rope.keyframe_insert("scale", frame=fr)
    rr = random.Random(5)
    clods = R["clods"]
    # cave-in: clods fall from the shaft wall onto him
    a, b = ends("cavein")
    for i, cl in enumerate(clods[:24]):
        s0 = F("cavein", 0.28) + int(i * 0.9)
        ang = rr.uniform(0.15, math.pi - 0.15)
        p0 = Vector((G.D1.x + 0.55 * math.cos(ang), 0.55 * math.sin(ang), rr.uniform(-2.6, -0.6)))
        p1 = Vector((G.D1.x + rr.uniform(-0.35, 0.35), rr.uniform(0.0, 0.35), -3.0 + rr.uniform(0.05, 0.25)))
        key_xf(cl, 1, loc=p0, scale=0.001); key_xf(cl, s0 - 1, loc=p0, scale=0.001)
        dur = max(4, int(math.sqrt(max(0.1, 2 * (p0.z - p1.z) / 9.8)) * FPS))
        for k in range(dur + 1):
            u = k / dur
            pp = p0.lerp(p1, u); pp.z = p0.z - (p0.z - p1.z) * u * u
            key_xf(cl, s0 + k, loc=pp, rot=(u * 5 + i, u * 3, i), scale=1.0)
    # digging the first spadefuls (hole): a few clods thrown to the side
    for i, cl in enumerate(clods[24:]):
        s0 = F("hole", 0.45) + i * 2
        p0 = Vector((G.D1.x + rr.uniform(-0.3, 0.3), rr.uniform(-0.3, 0.3), 0.05))
        p1 = Vector((G.D1.x + rr.uniform(1.0, 1.8), rr.uniform(-0.8, 0.8), 0.05))
        key_xf(cl, s0 - 1, loc=p0, scale=0.001)
        for k in range(9):
            u = k / 8
            pp = p0.lerp(p1, u); pp.z += math.sin(math.pi * u) * 0.9
            key_xf(cl, s0 + k, loc=pp, rot=(u * 4, u * 6, i), scale=1.0)

    # ---------------------------------------------------------------- the builder
    hat = B.data["hardhat"]; sun = B.data["sunglasses"]
    spade, pick = R["spade"], R["pick"]
    lamp = rig["headlamp"]
    D1 = G.D1

    # hole: push the doghouse back, then dig
    hp = Vector((D1.x + 0.05, -1.05, 0.0))
    for u in (0.0, 0.12, 0.3):
        fr = F("hole", u)

        def body(a_, u=u):
            legs_stand(a_.arm, 0.18, 0.1); spine(a_.arm, 20 + 25 * min(1, u / 0.12), 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.hand(side, Vector((D1.x + sg * 0.45, -0.68 + 0.4 * (u >= 0.3), 0.7 - 0.25 * (u >= 0.12))), pole=(sg * 1.0, -0.2, -1.0),
                        dir_world=Vector((0, 1, -0.2)))
            fingers(a_.arm, 0.6)
            head(a_.arm, -10, 0, 0)
        B.pose(fr, hp + Vector((0, 0.35 * (u >= 0.3), 0)), 180, body)
        B.face(fr, strain=0.6)
    for k, u in enumerate((0.42, 0.55, 0.68, 0.81, 0.94)):
        fr = F("hole", u); down = k % 2 == 0
        base = Vector((D1.x - 0.05, -0.75, 0.0))
        blade = Vector((D1.x, -0.2, -0.15)) if down else Vector((D1.x + 0.5, -0.35, 0.65))
        handle = blade + (Vector((0, -0.35, 1.0)) if down else Vector((-0.7, -0.2, 0.35)))
        B.pose(fr, base, 180, lambda a_, down=down, blade=blade, handle=handle: dig_pose(a_, down, blade, handle))
        tool_at(spade, fr, blade, handle, *SPADE)
        B.face(fr, calm=0.3)
    # cave-in: at the bottom of a 3 m hole; digging, then arms over the head
    cb = Vector((D1.x + 0.05, 0.1, -3.0))
    for k, u in enumerate((0.0, 0.14, 0.26)):
        fr = F("cavein", u); down = k % 2 == 0
        blade = cb + (Vector((0.0, -0.3, -0.05)) if down else Vector((0.3, -0.25, 0.6)))
        handle = blade + (Vector((0, -0.2, 1.0)) if down else Vector((-0.4, -0.1, 0.5)))
        B.pose(fr, cb, 0, lambda a_, down=down, blade=blade, handle=handle: dig_pose(a_, down, blade, handle))
        tool_at(spade, fr, blade, handle, *SPADE)
        B.face(fr, strain=0.4)
    for u in (0.36, 1.0):
        fr = F("cavein", u)

        def body(a_):
            legs_stand(a_.arm, 0.14, 0.25); spine(a_.arm, 18, 0, 0); shoulders(a_.arm, 0.5, 0.2)
            hd = bone_world(a_.arm, "mixamorig:Head").translation
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.hand(side, hd + Vector((sg * 0.12, -0.05, 0.16)), pole=(sg * 1.0, -0.4, 0.2), dir_world=Vector((-sg, 0, 0.3)))
            fingers(a_.arm, 0.4)
            head(a_.arm, -20, 0, 0)
        B.pose(fr, cb, 0, body)
        B.face(fr, panic=1.0)
    tool_at(spade, F("cavein", 0.36), cb + Vector((0.3, 0.2, 0.0)), cb + Vector((0.32, 0.3, 1.0)), *SPADE)
    # rings: at the surface, hauling on the hoist chain
    rp = Vector((D1.x + 1.15, 0.35, 0.0))
    for k, u in enumerate((0.0, 0.25, 0.5, 0.75, 1.0)):
        fr = F("rings", u); up = k % 2 == 0

        def body(a_, up=up):
            legs_stand(a_.arm, 0.12, 0.1); spine(a_.arm, -4 if up else 6, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.hand(side, Vector((D1.x + 0.75, 0.3 + sg * 0.05, (1.95 if up else 1.55) - 0.12 * (sg > 0))),
                        pole=(sg * 1.0, -0.3, -0.6), dir_world=Vector((0, 0, 1)))
            fingers(a_.arm, 1.6)
            head(a_.arm, 18, 0, 0)
        B.pose(fr, rp, yaw_to(rp, (D1.x, 0.3)), body)
        B.face(fr, strain=0.5)
    # sixm / ladder: leaning over the hole, looking down
    lp = Vector((D1.x + 0.95, 0.25, 0.0))
    for sh in ("sixm", "ladder"):
        for u in (0.0, 1.0):
            fr = F(sh, u)

            def body(a_):
                legs_stand(a_.arm, 0.16, 0.25); spine(a_.arm, 38, 0, 0)
                for side, sg in (("Left", 1), ("Right", -1)):
                    a_.hand(side, a_.W(0.12, sg * 0.14, 0.5), pole=(sg * 1.0, 0.3, -1.0), dir_world=Vector((0, 0, -1)))
                fingers(a_.arm, 0.5)
                head(a_.arm, -35, 0, 0)
            B.pose(fr, lp, yaw_to(lp, (D1.x, 0.25)), body)
            B.face(fr, worry=0.3 if sh == "sixm" else 0.0, calm=0.3)
    # nothideout: at the bottom of the finished shaft, cramped; looks around, shrugs
    bp = Vector((D1.x, 0.08, G.FLOOR))
    for u, look, arms in ((0.0, (0, 30), "tight"), (0.3, (0, -30), "tight"), (0.55, (8, 0), "tight"), (0.8, (4, 0), "shrug"),
                          (1.0, (4, 0), "shrug")):
        fr = F("nothideout", u)

        def body(a_, look=look, arms=arms):
            legs_stand(a_.arm, 0.05)
            if arms == "tight":
                for side, sg in (("Left", 1), ("Right", -1)):
                    a_.hand(side, a_.W(0.06, sg * 0.2, a_.hips_w.z - 0.05), pole=(sg * 0.3, 1.0, -0.4), dir_world=Vector((0, 0, -1)))
                fingers(a_.arm, 0.5)
            else:
                shoulders(a_.arm, 0.5, 0.0)
                for side, sg in (("Left", 1), ("Right", -1)):
                    a_.hand(side, a_.W(0.3, sg * 0.3, a_.hips_w.z + 0.12), pole=(sg * 1.0, 0.2, -1.0),
                            dir_world=fwd(a_.yaw) * 0.6 + left(a_.yaw) * sg * 0.6 + Vector((0, 0, 0.2)))
                fingers(a_.arm, 0.15)
            head(a_.arm, look[0], look[1], 0)
        B.pose(fr, bp, 0, body)
        B.face(fr, worry=0.6 if arms == "tight" else 0.3, smug=0.0)
    # dig: in the room, digging sideways
    a, b = ends("dig")
    for k, fr in enumerate(range(a, b + 1, 5)):
        down = k % 2 == 0
        base = Vector((D1.x + 1.35, 0.6, G.FLOOR))
        blade = base + (Vector((0.55, -0.05, 0.05)) if down else Vector((0.35, -0.3, 0.75)))
        handle = blade + (Vector((-0.3, -0.1, 1.0)) if down else Vector((-0.6, -0.2, 0.4)))
        B.pose(fr, base, 90, lambda a_, down=down, blade=blade, handle=handle: dig_pose(a_, down, blade, handle))
        tool_at(spade, fr, blade, handle, *SPADE)
        B.face(fr, strain=0.4)
    # pour / air / vent: standing in the room
    rpos = Vector((4.7, 1.0, G.FLOOR))
    for u in (0.0, 1.0):
        fr = F("pour", u)
        B.pose(fr, rpos, 10, lambda a_, u=u: stand(a_, (14, 20 - 30 * u), "hips"))
        B.face(fr, smug=0.4)
    for k, u in enumerate((0.0, 0.25, 0.5, 0.75, 1.0)):
        fr = F("air", u)

        def body(a_, k=k):
            legs_stand(a_.arm, 0.08); spine(a_.arm, 6, 0, 0)
            hd = bone_world(a_.arm, "mixamorig:Head").translation
            a_.hand("Right", hd + fwd(a_.yaw) * 0.25 + left(a_.yaw) * (-0.12 + 0.08 * (k % 2)) + Vector((0, 0, -0.08)),
                    pole=(-1.0, -0.3, -0.6), dir_world=Vector((0, 0, 1)) + left(a_.yaw) * (0.6 if k % 2 else -0.6))
            fingers(a_.arm, 0.1)
            a_.hand("Left", a_.W(0.05, 0.22, a_.hips_w.z - 0.08), pole=(1.0, 0.4, -1.0), dir_world=Vector((0, 0, -1)))
            head(a_.arm, -4, 0, 0)
        B.pose(fr, rpos, 0, body)
        B.face(fr, strain=0.7)
    for u in (0.0, 0.3, 1.0):
        fr = F("vent", u)

        def body(a_, u=u):
            legs_stand(a_.arm, 0.08); spine(a_.arm, -4, 0, 0)
            a_.hand("Right", a_.W(0.2, -0.25, a_.hips_w.z + 1.05), pole=(-1.0, -0.3, -0.3), dir_world=Vector((0, 0, 1)))
            posing.curl_fingers(a_.arm, "Right", 1.3, skip=("Index",))
            a_.hand("Left", a_.W(0.05, 0.22, a_.hips_w.z - 0.08), pole=(1.0, 0.4, -1.0), dir_world=Vector((0, 0, -1)))
            head(a_.arm, 32, 10, 0)
        B.pose(fr, Vector((4.2, 1.0, G.FLOOR)), 20, body)
        B.face(fr, smug=0.7)
    # lights: on the bed with the laptop; secondway: sits up and looks at the wall
    bedp = R["bed"].location
    lhip = Vector((bedp.x - 0.62, bedp.y, G.FLOOR + 0.62))
    for u in (0.0, 1.0):
        fr = F("lights", u)

        def body(a_):
            for side, sg in (("Left", 1), ("Right", -1)):
                ankle = a_.hips_w + fwd(a_.yaw) * 0.92 + left(a_.yaw) * (sg * 0.1); ankle.z = a_.hips_w.z + 0.0
                a_.foot(side, ankle, (0, -0.3, 1.0), pole=(sg * 0.1, -1.0, 0.9))
            for side, sg in (("Left", 1), ("Right", -1)):
                p = a_.hips_w + fwd(a_.yaw) * 0.42 + left(a_.yaw) * (sg * 0.13); p.z = G.FLOOR + 0.76
                a_.hand(side, p, pole=(sg * 1.0, 0.2, -1.0), dir_world=fwd(a_.yaw) + Vector((0, 0, -0.4)))
            fingers(a_.arm, 0.3)
            head(a_.arm, -18, 0, 0)
        B.pose(fr, lhip, 90, body, seated=True, pitch=-40)
        B.face(fr, smug=0.9)
    lap = R["laptop"]
    key_xf(lap, 1, loc=(lhip.x + 0.5, bedp.y, G.FLOOR + 0.66), rot=(0, 0, math.radians(90)), scale=0.7)
    for u, look, sit in ((0.0, (-10, 0), 0.0), (0.25, (0, 0), 1.0), (1.0, (0, -40), 1.0)):
        fr = F("secondway", u)

        def body(a_, look=look):
            spine(a_.arm, 8, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                ankle = a_.hips_w + fwd(a_.yaw) * 0.42 + left(a_.yaw) * (sg * 0.13); ankle.z = G.FLOOR + 0.08
                a_.foot(side, ankle, (0, -1, -0.45))
                a_.hand(side, a_.hips_w + fwd(a_.yaw) * 0.25 + left(a_.yaw) * (sg * 0.22) + Vector((0, 0, 0.02)),
                        pole=(sg * 1.0, 0.2, -1.0), dir_world=fwd(a_.yaw) + Vector((0, 0, -0.4)))
            fingers(a_.arm, 0.6)
            head(a_.arm, look[0], look[1], 0)
        B.pose(fr, Vector((bedp.x - 0.3, bedp.y - 0.35, G.FLOOR + 0.52)), 0, body, seated=True)
        B.face(fr, calm=0.4 if u < 0.5 else 0.0, smug=0.0 if u < 0.5 else 0.6)
    # keepdig / break: swinging the pick; garden: crawling down the tunnel
    def swing(a_, up, target):
        legs_stand(a_.arm, 0.18, 0.15); spine(a_.arm, 4 if up else 26, 0, 0)
        hp_ = a_.W(0.2, -0.05, a_.hips_w.z + (0.95 if up else 0.25))
        a_.hand("Right", hp_, pole=(-1.0, 0.2, -1.0)); a_.hand("Left", hp_ + Vector((0, 0, -0.14)), pole=(1.0, 0.2, -1.0))
        fingers(a_.arm, 1.5)
        head(a_.arm, 0 if up else -12, 0, 0)
    a, b = ends("keepdig")
    kd = Vector((G.R1[1] - 0.95, 0.45, G.FLOOR))
    for k, u in enumerate((0.0, 0.3, 0.45, 0.75, 0.9)):
        fr = F("keepdig", u); up = k % 2 == 0
        B.pose(fr, kd, 90, lambda a_, up=up: swing(a_, up, None))
        hand = kd + Vector((0.2, 0.05, (1.0 if up else 0.85) + (0.95 if up else 0.25) - 0.3))
        tool_at(pick, fr, hand, hand + (Vector((-0.4, 0, 1.0)) if up else Vector((1.0, 0, 0.1))), *PICK)
        B.face(fr, strain=0.6)
    a, b = ends("garden")
    for k, fr in enumerate(range(a, b + 1, 4)):
        front = tunnel_front(fr)
        x = front - 1.25
        hips = Vector((x, 0.05, G.TZ - 0.18))

        def body(a_, k=k, front=front):
            spine(a_.arm, 10, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                ph = 0.12 * math.sin(k * 1.6 + (0 if sg > 0 else math.pi))
                a_.hand(side, Vector((front - 0.35 + ph, sg * 0.18, G.TZ - T_R_FLOOR + 0.02)), pole=(sg * 0.6, 0.0, -1.0),
                        dir_world=Vector((1, 0, -0.3)))
                a_.foot(side, Vector((a_.hips_w.x - 0.55 - ph, sg * 0.14, G.TZ - T_R_FLOOR + 0.05)), (-0.2, 0, -1.0),
                        pole=(0.0, 0.0, -1.0))
            fingers(a_.arm, 0.7)
            head(a_.arm, 30, 0, 0)
        B.pose(fr, hips, 90, body, seated=True, pitch=72)
        B.face(fr, strain=0.4)
    bk = Vector((G.R2[0] - G.WALL - 0.95, 0.05, G.TZ - 0.3))
    for k, u in enumerate((0.0, 0.2, 0.38, 0.55, 0.75, 1.0)):
        fr = F("break", u); up = k in (1,)
        recoil = u >= 0.55

        def body(a_, up=up, recoil=recoil):
            spine(a_.arm, 6 if up else (-6 if recoil else 28), 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.foot(side, a_.hips_w + Vector((-0.45, sg * 0.14, -0.38)), (-0.3, 0, -1.0), pole=(0.0, 0.0, -1.0))
            hp_ = a_.hips_w + Vector((0.32, -0.05, 0.75 if up else 0.18))
            if recoil:
                hp_ = a_.hips_w + Vector((0.15, -0.05, 0.25))
            a_.hand("Right", hp_, pole=(-1.0, 0.2, -1.0)); a_.hand("Left", hp_ + Vector((-0.06, 0.06, -0.12)), pole=(1.0, 0.2, -1.0))
            fingers(a_.arm, 1.5)
            head(a_.arm, 4 if not recoil else 12, 0, 0)
        B.pose(fr, bk, 90, body, seated=True)
        hand = bk + Vector((0.32, -0.05, 0.75 if up else 0.18))
        tool_at(pick, fr, hand, hand + (Vector((-0.5, 0, 1.0)) if up else Vector((1.0, 0, 0.15))), *PICK)
        B.face(fr, **({"panic": 0.8} if recoil else {"strain": 0.7}))
    # neighbor: kneeling in the tunnel with his head through the hole
    nk = Vector((G.R2[0] - G.WALL + 0.02, 0.0, G.TZ - 0.32))
    for u, look in ((0.0, (6, 0)), (0.5, (6, -14)), (1.0, (4, -10))):
        fr = F("neighbor", u)

        def body(a_, look=look):
            spine(a_.arm, 40, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.foot(side, a_.hips_w + Vector((-0.45, sg * 0.14, -0.38)), (-0.3, 0, -1.0), pole=(0.0, 0.0, -1.0))
                a_.hand(side, Vector((G.R2[0] + 0.05, sg * 0.42, G.TZ - 0.1)), pole=(sg * 1.0, 0.0, -1.0),
                        dir_world=Vector((0.3, 0, 1)))
            fingers(a_.arm, 0.6)
            head(a_.arm, look[0], look[1], 0)
        B.pose(fr, nk, 90, body, seated=True)
        B.face(fr, shock=0.9)
    # dog2: his head pops out of the neighbour's doghouse
    D2 = G.D2
    for u, z, look in ((0.0, -1.0, (0, 0)), (0.5, -1.0, (0, 0)), (0.62, 0.0, (4, 0)), (0.8, 0.0, (4, 30)), (1.0, 0.0, (4, -25))):
        fr = F("dog2", u)

        def body(a_, look=look):
            spine(a_.arm, 50, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                a_.foot(side, a_.hips_w + Vector((sg * 0.14, 0.5, -0.4)), (0, -1, -0.5))
                a_.hand(side, Vector((D2.x + sg * 0.32, -0.55, 0.02)), pole=(sg * 1.0, 0.0, -1.0), dir_world=Vector((0, -1, -0.3)))
            fingers(a_.arm, 0.5)
            head(a_.arm, look[0] - 30, look[1], 0)
        B.pose(fr, Vector((D2.x, -0.22, 0.5 + z)), 0, body, seated=True)
        B.face(fr, smug=0.8)
    for fc in ST._fcurves(B.arm.animation_data.action):
        if fc.data_path == "location":
            for kp in fc.keyframe_points:
                if kp.co.x in (F("dog2", 0.0), F("dog2", 0.5)):
                    pass

    # props on the builder: the hard hat everywhere but the bed and the end; the head lamp in the tunnel
    # ---------------------------------------------------------------- the neighbour in his armchair
    nchair = Vector((16.3, 1.95, G.FLOOR + 0.5))
    paper = R["newspaper"]
    for u, low, look, face in ((0.0, 0.0, (-8, 0), {"calm": 0.6}), (0.3, 0.0, (-8, 0), {"calm": 0.6}),
                               (0.45, 1.0, (0, 45), {"shock": 1.0}), (1.0, 1.0, (0, 40), {"shock": 0.9})):
        fr = F("neighbor", u)
        pc = nchair + Vector((0, -0.42 + 0.05 * low, 0.48 - 0.32 * low))

        def body(a_, pc=pc, look=look):
            spine(a_.arm, -6, 0, 0)
            for side, sg in (("Left", 1), ("Right", -1)):
                ankle = a_.hips_w + fwd(a_.yaw) * 0.5 + left(a_.yaw) * (sg * 0.14); ankle.z = G.FLOOR + 0.09
                a_.foot(side, ankle, (0, -1, -0.45))
                a_.hand(side, pc + Vector((sg * 0.2, 0.02, -0.05)), pole=(sg * 1.0, 0.3, -1.0), dir_world=Vector((0, 0, 1)))
            fingers(a_.arm, 1.0)
            head(a_.arm, look[0], look[1], 0)
        N.pose(fr, nchair, 0, body, seated=True)
        N.face(fr, **face)
        key_xf(paper, fr, loc=pc, rot=(math.radians(80 - 30 * low), 0, 0))

    # ---------------------------------------------------------------- what is visible when
    want = rig["want"]

    def from_(name, extra=("intro", "notdog")):
        return set(names[names.index(name):]) | set(extra)
    bparts = [o for o in B.data["parts"] if o not in (hat, sun) and o.parent not in (sun,)]
    want(bparts, {"hole", "cavein", "rings", "sixm", "ladder", "nothideout", "dig", "pour", "air", "vent", "lights",
                  "secondway", "keepdig", "garden", "break", "neighbor", "dog2"})
    want([hat], {"hole", "cavein", "rings", "sixm", "ladder", "nothideout", "dig", "pour", "air", "vent", "keepdig",
                 "garden", "break", "neighbor", "dog2"})
    want([sun, *sun.children], set())
    want(lamp, {"keepdig", "garden", "break", "neighbor"})
    want(N.data["parts"], {"break", "neighbor"})
    want([paper], {"break", "neighbor"})
    want([o for o in spade.children_recursive if o.type == "MESH"], {"hole", "cavein", "dig"})
    want([o for o in pick.children_recursive if o.type == "MESH"], {"keepdig", "break"})
    want([o for o in R["laptop"].children_recursive if o.type == "MESH"], {"lights", "secondway"})
    want([bucket, rope] + [o for o in bucket.children_recursive if o.type == "MESH"], {"dig"})
    want([o for o in R["tripod"].children_recursive if o.type == "MESH"] + [R["chain"]], {"rings"})
    want(R["clods"], {"hole", "cavein"})
    want(R["dims"], {"sixm"})
    want(R["workbulb"], set(names[names.index("dig"):names.index("lights")]))
    for k, (root, objs, z) in enumerate(R["rings1"]):
        want(objs, (set(names[names.index("rings"):names.index("dig")]) if k >= 7 else from_("rings")))
    want([o for o in R["ladder1"].children_recursive if o.type == "MESH"], from_("ladder"))
    want(rig["shell1_objs"], from_("pour"))
    want([o for o in R["vent"].children_recursive if o.type == "MESH"], from_("vent"))
    want([o for o in R["chimney1"].children_recursive if o.type == "MESH"], from_("chimney"))
    want([R["cable"]], from_("power"))
    furn_meshes = [o for r in rig["furniture1"] for o in ([r] + list(r.children_recursive)) if o.type == "MESH"]
    want(furn_meshes, from_("lights"))
    for pieces, x0 in R["liner"]:
        want(pieces, from_("keepdig"))
    want([o for o, *_ in [(c[1],) for c in R["chunks"]]], from_("break"))
    return R


T_R_FLOOR = G.T_R - 0.02


# ============================================================================= cameras
def _fc_value(obj_or_data, path, index, fr):
    for fc in ST._fcurves(obj_or_data.animation_data.action):
        if fc.data_path == path and fc.array_index == index:
            return fc.evaluate(fr)
    return None


def track_helpers(rig):
    """Functions of the frame for the tracking cameras: the tunnel face x, the cable tip x."""
    C = rig["site"]["C"]
    cu = rig["site"]["cable"].data
    pts = [Vector(p.co[:3]) for p in cu.splines[0].points]
    seg = [(pts[i], pts[i + 1], (pts[i + 1] - pts[i]).length) for i in range(len(pts) - 1)]
    total = sum(l for _, _, l in seg)

    def tfront(fr):
        return C["t0"] + C["t_len"] * _fc_value(C["t"], "scale", 0, fr)

    def ctip(fr):
        d = _fc_value(cu, "bevel_factor_end", 0, fr) * total
        for a, b, l in seg:
            if d <= l:
                return (a + (b - a) * (d / max(l, 1e-6))).x
            d -= l
        return pts[-1].x
    rig["tfront"], rig["ctip"] = tfront, ctip


def cam_plan(rig):
    """name: (lens, fn(u, fr) -> (loc, target), fstop or None, shake)"""
    D1, D2 = G.D1, G.D2
    FL = G.FLOOR
    return {
        "intro": (30, lambda u, fr: (lerp((3.35, -4.6, 0.72), (3.2, -3.7, 0.7), _ease(u)), (3.0, 0.0, 0.62)), 4.0, 0.15),
        "notdog": (24, lambda u, fr: (lerp((3.0, -2.5, 0.56), (3.0, -1.0, 0.42), _in(u)), (3.0, 0.4, 0.12)), None, 0.15),
        "hole": (24, lambda u, fr: (lerp((6.4, -6.4, 2.7), (6.0, -5.8, 2.5), u), (2.6, 0.6, 0.3)), None, 0.2),
        "cavein": (26, lambda u, fr: (lerp((3.0, -6.9, -1.3), (3.0, -6.3, -1.6), u), (3.0, 0.0, -1.7)), None, lambda u: 0.15 + 1.2 * (u > 0.3)),
        "rings": (24, lambda u, fr: (lerp((3.6, -10.6, -1.4), (3.5, -10.1, -1.6), u), (3.15, 0.0, -2.0)), None, 0.15),
        "sixm": (26, lambda u, fr: (lerp((3.3, -7.2, 0.4), (3.3, -7.0, -4.4), _ease(u)), lerp((3.0, 0.0, 0.0), (3.0, 0.0, -5.0), _ease(u))), None, 0.1),
        "ladder": (22, lambda u, fr: (lerp((3.25, -6.8, -2.0), (3.2, -6.5, -2.4), u), (3.0, 0.0, -2.7)), None, 0.15),
        "nothideout": (30, lambda u, fr: (lerp((3.0, -3.4, -4.95), (3.0, -3.0, -5.0), u), (3.0, 0.0, -5.15)), None, 0.1),
        "dig": (24, lambda u, fr: (lerp((4.2, -8.8, -4.1), (4.3, -8.4, -4.3), u), (4.3, 0.0, -4.6)), None, 0.15),
        "pour": (24, lambda u, fr: (lerp((4.3, -8.4, -4.3), (4.4, -8.0, -4.4), u), (4.4, 0.0, -4.7)), None, 0.12),
        "air": (32, lambda u, fr: (lerp((4.75, -4.2, -4.75), (4.72, -3.9, -4.8), u), (4.7, 0.8, -4.85)), None, 0.1),
        "vent": (22, lambda u, fr: (lerp((3.8, -11.6, -2.6), (3.75, -11.3, -2.1), _ease(u)), (3.75, 0.0, -2.3)), None, 0.12),
        "chimney": (32, lambda u, fr: (lerp((4.9, -2.4, 1.62), (4.7, -2.15, 1.6), u), (3.66, 0.0, 1.5)), None, 0.15),
        "power": (24, lambda u, fr: ((min(1.9, max(-4.0, rig["ctip"](fr) - 0.4)), -7.0, -1.2), (min(2.1, max(-3.8, rig["ctip"](fr) - 0.2)), 0.0, -1.5)), None, 0.12),
        "lights": (24, lambda u, fr: (lerp((4.7, -7.2, -4.4), (4.75, -6.8, -4.5), u), (4.75, 0.5, -4.8)), None, 0.12),
        "secondway": (28, lambda u, fr: (lerp((5.4, -5.6, -4.6), (6.1, -3.8, -4.8), _ease(u)), lerp((5.8, 1.0, -4.9), (7.3, 1.0, -4.9), _ease(u))), None, 0.1),
        "keepdig": (28, lambda u, fr: (lerp((6.3, -4.8, -4.7), (6.45, -4.5, -4.75), u), (7.25, 0.5, -5.0)), None, 0.15),
        "garden": (22, lambda u, fr: ((rig["tfront"](fr) - 0.45, -6.9, -3.0), (rig["tfront"](fr) - 0.2, 0.0, -3.4)), None, 0.12),
        "break": (30, lambda u, fr: (lerp((12.9, -3.7, -5.0), (12.95, -3.4, -5.05), u), (13.6, 0.3, -5.2)), None, lambda u: 0.15 + 1.6 * (0.42 < u < 0.7)),
        "neighbor": (28, lambda u, fr: (lerp((15.05, -5.5, -4.6), (15.0, -5.1, -4.65), u), (15.05, 0.8, -4.95)), None, 0.12),
        "dog2": (22, lambda u, fr: (lerp((22.5, -2.6, 4.2), (21.7, -2.2, 3.5), _ease(u)), lerp((13.0, 0.8, 0.4), (15.0, 0.5, 0.5), _ease(u))), None, 0.15),
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
    track_helpers(rig)
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
                          math.sin(t * 2.6 + ph[4]) + 0.5 * math.sin(t * 6.2 + ph[5]))) * 0.006 * (shake(u) if callable(shake) else shake)
            cam.location = Vector(loc) + jit; cam.keyframe_insert("location", frame=fr)
            tgt.location = Vector(g); tgt.keyframe_insert("location", frame=fr)
            cam.rotation_euler = _look(cam.location, g); cam.keyframe_insert("rotation_euler", frame=fr)
        if fstop:
            cd.dof.use_dof = True; cd.dof.focus_object = tgt; cd.dof.aperture_fstop = fstop
        m = sc.timeline_markers.new(name, frame=a)
        m.camera = cam
