"""Pose helpers that work in the character's own (armature) space.

Armature space for a MakeHuman character: the character faces -Y, +Z is up and +X is the
character's left. Poses are described as directions ("arm points down and a bit forward")
instead of raw bone angles, which keeps keyframes readable and rig-independent.
"""
import math
import bpy
from mathutils import Quaternion, Vector

P = "mixamorig:"


def _rest_matrix(pb):
    """Armature-space matrix the bone would have with no local rotation (parent pose applied)."""
    if pb.parent is None:
        return pb.bone.matrix_local.copy()
    return pb.parent.matrix @ (pb.parent.bone.matrix_local.inverted() @ pb.bone.matrix_local)


def _update():
    bpy.context.view_layer.update()


def reset(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    _update()


def aim(arm, bone, direction, twist=0.0):
    """Rotate a bone so it points along `direction` (armature space)."""
    pb = arm.pose.bones[P + bone]
    _update()
    m0 = _rest_matrix(pb).to_3x3().normalized()
    y0 = m0.col[1].normalized()
    r = y0.rotation_difference(Vector(direction).normalized())
    q = m0.inverted().to_quaternion() @ r @ m0.to_quaternion()
    if twist:
        q = q @ Quaternion((0, 1, 0), twist)
    pb.rotation_quaternion = q
    _update()


def turn(arm, bone, axis, degrees):
    """Rotate a bone about an armature-space axis, on top of its parent's pose."""
    pb = arm.pose.bones[P + bone]
    _update()
    m0 = _rest_matrix(pb).to_3x3().normalized()
    r = Quaternion(Vector(axis).normalized(), math.radians(degrees))
    pb.rotation_quaternion = m0.inverted().to_quaternion() @ r @ m0.to_quaternion()
    _update()


def curl_fingers(arm, side, amount=1.0, skip=()):
    """Curl fingers by rotating each joint about its local X axis (amount 0..1)."""
    for f, base in (("Index", 18), ("Middle", 22), ("Ring", 26), ("Pinky", 30)):
        for j in (1, 2, 3):
            pb = arm.pose.bones[f"{P}{side}Hand{f}{j}"]
            ang = 0 if f in skip else math.radians(base * amount * (1.4 if j > 1 else 1.0))
            pb.rotation_quaternion = Quaternion((1, 0, 0), ang)
    t = arm.pose.bones[f"{P}{side}HandThumb2"]
    t.rotation_quaternion = Quaternion((1, 0, 0), math.radians(10 * amount))
    _update()


_LAST = {}


def key_all(arm, frame):
    for pb in arm.pose.bones:
        k = (arm.name, pb.name)
        q = pb.rotation_quaternion
        if k in _LAST and _LAST[k].dot(q) < 0:   # keep quaternion keys on the same hemisphere
            pb.rotation_quaternion = -q
        _LAST[k] = pb.rotation_quaternion.copy()
        pb.keyframe_insert("rotation_quaternion", frame=frame)
        if pb.parent is None:
            pb.keyframe_insert("location", frame=frame)


def ease_all(arm):
    act = arm.animation_data.action if arm.animation_data else None
    if not act:
        return
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = "BEZIER"
            kp.easing = "AUTO"
            kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


def _fcurves(act):
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])):
        return list(act.fcurves)
    out = []  # Blender 5 layered actions
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


# ------------------------------------------------------------------ named poses
def relaxed(arm, sway=0.0):
    """Standing, arms hanging, fingers softly curled."""
    for side, s in (("Left", 1), ("Right", -1)):
        aim(arm, f"{side}Arm", (0.17 * s, 0.03, -1))
        aim(arm, f"{side}ForeArm", (0.08 * s, -0.22, -1))
        aim(arm, f"{side}Hand", (0.06 * s, -0.25, -1))
        curl_fingers(arm, side, 0.9)
    turn(arm, "Spine1", (1, 0, 0), sway)


def look(arm, pitch=0.0, yaw=0.0):
    """Head/neck look: pitch > 0 looks up, yaw > 0 turns to the character's left."""
    turn(arm, "Neck", (1, 0, 0), -pitch * 0.4)
    pb = arm.pose.bones[P + "Neck"]
    q_neck = pb.rotation_quaternion.copy()
    yawq = Quaternion((0, 0, 1), math.radians(yaw * 0.4))
    m0 = _rest_matrix(pb).to_3x3().normalized()
    pb.rotation_quaternion = m0.inverted().to_quaternion() @ yawq @ m0.to_quaternion() @ q_neck
    _update()
    hb = arm.pose.bones[P + "Head"]
    m0 = _rest_matrix(hb).to_3x3().normalized()
    r = Quaternion((0, 0, 1), math.radians(yaw * 0.6)) @ Quaternion((1, 0, 0), math.radians(-pitch * 0.6))
    hb.rotation_quaternion = m0.inverted().to_quaternion() @ r @ m0.to_quaternion()
    _update()


def point(arm, side, direction):
    """Straight arm pointing along `direction` with the index finger out."""
    s = 1 if side == "Left" else -1
    d = Vector(direction).normalized()
    aim(arm, f"{side}Shoulder", (s * 1.0, 0.0, 0.25 + 0.35 * max(d.z, 0)))
    aim(arm, f"{side}Arm", d)
    aim(arm, f"{side}ForeArm", d + Vector((0, 0, 0.05)))
    aim(arm, f"{side}Hand", d + Vector((0, -0.05, 0.0)))
    curl_fingers(arm, side, 1.3, skip=("Index",))
