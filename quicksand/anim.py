"""Character controller: places the armature per frame, solves simple two-bone IK for hands and
feet, and provides the named poses the quicksand short needs. Poses are built in the character's
own armature space (faces -Y, +X is the character's left, +Z up) and keyed per frame.
"""
import math
import bpy
from mathutils import Euler, Matrix, Quaternion, Vector

import posing
from posing import P, aim, turn, curl_fingers, key_all, _rest_matrix

HIP_H = 0.983          # Hips bone head height in rest pose
ANKLE_H = 0.072        # ankle height above the sole


def V(*a):
    return Vector(a if len(a) == 3 else a[0])


def _upd():
    bpy.context.view_layer.update()


def rot(arm, bone, *axis_deg):
    """Set a bone's rotation as a sequence of armature-space rotations (applied in order) on top of
    its parent's pose. Replaces any previous rotation of that bone."""
    pb = arm.pose.bones[P + bone]
    _upd()
    m0 = _rest_matrix(pb).to_3x3().normalized()
    r = Quaternion()
    for axis, deg in axis_deg:
        r = Quaternion(V(axis).normalized(), math.radians(deg)) @ r
    pb.rotation_quaternion = m0.inverted().to_quaternion() @ r @ m0.to_quaternion()
    _upd()


def two_bone(arm, upper, lower, target, pole, end_dir=None, end=None):
    """Aim `upper` and `lower` so the end of `lower` reaches `target` (armature space), bending
    toward `pole`. Optionally aim the end bone along `end_dir`."""
    _upd()
    pu, pl = arm.pose.bones[P + upper], arm.pose.bones[P + lower]
    a, b = pu.bone.length, pl.bone.length
    S = pu.head.copy()
    T = V(target)
    d = T - S
    dist = max(abs(a - b) + 1e-4, min(a + b - 1e-4, d.length))
    u = d.normalized()
    x = (a * a - b * b + dist * dist) / (2 * dist)
    h = math.sqrt(max(0.0, a * a - x * x))
    pv = V(pole)
    v = (pv - u * pv.dot(u))
    v = v.normalized() if v.length > 1e-6 else Vector((0, 0, 1))
    E = S + u * x + v * h
    aim(arm, upper, E - S)
    aim(arm, lower, (S + u * dist) - E)
    if end and end_dir is not None:
        aim(arm, end, end_dir)


def hand_to(arm, side, target, pole=None, hand_dir=None):
    s = 1 if side == "Left" else -1
    pole = pole if pole is not None else (s * 1.0, 0.6, -0.4)
    two_bone(arm, f"{side}Arm", f"{side}ForeArm", target, pole, hand_dir, f"{side}Hand" if hand_dir else None)


def foot_to(arm, side, target, pole=(0, -1, 0.1), foot_dir=(0, -1, -0.28)):
    s = 1 if side == "Left" else -1
    p = V(pole) + V((s * 0.15, 0, 0))
    two_bone(arm, f"{side}UpLeg", f"{side}Leg", target, p, foot_dir, f"{side}Foot")


def spine(arm, fwd=0.0, twist=0.0, side=0.0):
    """Distribute a forward bend (deg, + = forward), twist (+ = to the character's left) and side
    bend (+ = toward the character's left) over the three spine bones."""
    for b, k in (("Spine", 0.3), ("Spine1", 0.35), ("Spine2", 0.35)):
        rot(arm, b, ((1, 0, 0), fwd * k), ((0, 0, 1), twist * k), ((0, -1, 0), side * k))


def head(arm, pitch=0.0, yaw=0.0, tilt=0.0):
    """pitch > 0 looks up, yaw > 0 turns to the character's left, tilt > 0 toward the left shoulder."""
    rot(arm, "Neck", ((1, 0, 0), -pitch * 0.4), ((0, 0, 1), yaw * 0.4))
    rot(arm, "Head", ((1, 0, 0), -pitch * 0.6), ((0, 0, 1), yaw * 0.6), ((0, -1, 0), tilt))


def shoulders(arm, up=0.0, fwd=0.0):
    for side, s in (("Left", 1), ("Right", -1)):
        aim(arm, f"{side}Shoulder", (s * 1.0, -0.05 - fwd, -0.55 + up))


def fingers(arm, curl=0.9, spread_hand=None):
    for side in ("Left", "Right"):
        curl_fingers(arm, side, curl)


def legs_stand(arm, spread=0.04, knee=0.0):
    for side, s in (("Left", 1), ("Right", -1)):
        aim(arm, f"{side}UpLeg", (s * spread, -0.02 - knee, -1))
        aim(arm, f"{side}Leg", (s * spread * 0.6, 0.02 + knee, -1))
        aim(arm, f"{side}Foot", (s * 0.03, -1, -0.28))


def arms_hang(arm, sway=0.0):
    for side, s in (("Left", 1), ("Right", -1)):
        aim(arm, f"{side}Arm", (0.17 * s, 0.03 + sway * s, -1))
        aim(arm, f"{side}ForeArm", (0.08 * s, -0.22, -1))
        aim(arm, f"{side}Hand", (0.06 * s, -0.25, -1))


# ----------------------------------------------------------------------------- controller
class Character:
    def __init__(self, char, sink_empty=None):
        self.c = char
        self.arm = char["arm"]
        self.arm.rotation_mode = "XYZ"
        self.sink = sink_empty
        self.keys = []
        for pb in self.arm.pose.bones:
            pb.rotation_mode = "QUATERNION"
        # speed: mesh modifiers are only needed for rendering
        for o in char["parts"]:
            for m in o.modifiers:
                m.show_viewport = False

    # world placement ------------------------------------------------------------
    @staticmethod
    def matrix(loc, yaw=0.0, pitch=0.0, roll=0.0):
        e = Euler((math.radians(pitch), math.radians(roll), math.radians(yaw)), "XYZ")
        return Matrix.Translation(V(loc)) @ e.to_matrix().to_4x4()

    def place(self, frame, loc, yaw=90.0, pitch=0.0, roll=0.0, pivot_h=None):
        """Key the armature transform. With pivot_h, `loc` is the world position of a point
        `pivot_h` metres above the feet (e.g. the hips) and rotations happen about it."""
        e = Euler((math.radians(pitch), math.radians(roll), math.radians(yaw)), "XYZ")
        loc = V(loc)
        if pivot_h is not None:
            loc = loc - e.to_matrix() @ Vector((0, 0, pivot_h))
        # values only: keys are inserted in key(), after posing (inserting keys mid-pose would make
        # the depsgraph re-apply the old animation over the pose being built)
        self.arm.location = loc
        self.arm.rotation_euler = e
        if self.sink is not None:
            hip = loc + e.to_matrix() @ Vector((0, 0, HIP_H))
            self.sink.location = (hip.x, hip.y, 0)
        self.M = Matrix.Translation(loc) @ e.to_matrix().to_4x4()
        return self.M

    def to_local(self, world_pt):
        return self.M.inverted() @ V(world_pt)

    def dir_local(self, world_dir):
        return self.M.to_3x3().inverted() @ V(world_dir)

    # posing ------------------------------------------------------------------------
    def begin(self, frame):
        bpy.context.scene.frame_set(frame)
        posing.reset(self.arm)

    def key(self, frame):
        self.arm.keyframe_insert("location", frame=frame)
        self.arm.keyframe_insert("rotation_euler", frame=frame)
        if self.sink is not None:
            self.sink.keyframe_insert("location", frame=frame)
        key_all(self.arm, frame)
        self.keys.append(frame)

    def face(self, frame, **weights):
        import human
        human.set_expression(self.c, frame, weights)


# ----------------------------------------------------------------------------- gait
def apply_walk(ch, frame, t, x0, t_plant, speed=1.22, period=1.1, y=0.0, yaw=90.0, freeze_at=None):
    """Key a walk frame. The path runs along +X from x0 (hip x at t_plant is x0)."""
    arm = ch.arm
    tt = t if freeze_at is None else min(t, freeze_at)
    phase = ((tt - t_plant) / period) % 1.0
    step = speed * period / 2
    hip_x = x0 + speed * (tt - t_plant)
    bob = 0.04 + 0.03 * (1 - math.cos(4 * math.pi * phase)) / 2
    ch.begin(frame)
    ch.place(frame, (hip_x, y, -bob), yaw)
    rot(arm, "Spine1", ((0, 0, 1), 4 * math.cos(2 * math.pi * phase)))
    for side, off, lat in (("Left", 0.0, 0.1), ("Right", 0.5, -0.1)):
        ph = (phase - off) % 1.0
        cyc = math.floor((tt - t_plant) / period - off)
        plant_x = x0 + speed * period * (cyc + off + 0.3)
        if ph < 0.6:
            fx, fz = plant_x, ANKLE_H
            toe = 0.0 if ph < 0.45 else (ph - 0.45) / 0.15
        else:
            sw = (ph - 0.6) / 0.4
            sm = sw * sw * (3 - 2 * sw)
            fx = plant_x + 2 * step * sm
            fz = ANKLE_H + math.sin(math.pi * sw) * 0.10
            toe = max(0.0, 1 - sw * 3)
        left = Vector((-math.sin(math.radians(yaw - 90)), math.cos(math.radians(yaw - 90)), 0))
        tgt = ch.to_local(Vector((fx, y, fz)) + left * lat)
        foot_to(arm, side, tgt, foot_dir=(0, -1, -0.28 - 0.9 * toe))
    for side, s, off in (("Left", 1, 0.5), ("Right", -1, 0.0)):
        sw = math.cos(2 * math.pi * (phase - off))
        aim(arm, f"{side}Arm", (0.14 * s, 0.32 * sw, -1))
        aim(arm, f"{side}ForeArm", (0.08 * s, 0.25 * sw - 0.35, -1))
        aim(arm, f"{side}Hand", (0.05 * s, 0.2 * sw - 0.4, -1))
    fingers(arm, 0.8)
    ch.key(frame)
    return hip_x
