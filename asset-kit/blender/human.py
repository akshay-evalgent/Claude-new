"""Realistic, rigged humans from MPFB (MakeHuman for Blender, CC0 assets) and motion-capture retargeting.

Use inside Blender (4.2+) with the MPFB extension and the MakeHuman system asset pack installed
(see ../setup.sh):

    import sys; sys.path.append('/path/to/asset-kit/blender')
    import human
    h = human.build({'gender': 1.0, 'age': 0.6, 'race': 'african', 'skin': 'young_african_male',
                     'hair': 'short02', 'clothes': ['male_casualsuit04', 'shoes02'], 'eyes': 'brown'})
    human.retarget_bvh(h['rig'], '/path/to/asset-kit/mocap/02_01.bvh', frame_start=1, frames=96,
                       origin=(0, 4, 0), heading_deg=180)
"""
import bpy, math, os
from mathutils import Matrix, Quaternion, Vector

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService

DATA = LocationService.get_user_data()
RACES = {'african': (1.0, 0.0, 0.0), 'asian': (0.0, 1.0, 0.0), 'caucasian': (0.0, 0.0, 1.0)}


def _asset(kind, name, ext):
    p = os.path.join(DATA, kind, name, f'{name}.{ext}')
    if not os.path.isfile(p):
        raise FileNotFoundError(p)
    return p


def build(spec):
    """Creates a dressed, rigged human. spec keys (all optional):
    gender 0..1 (0 female, 1 male), age 0..1 (0.5 = 25 years), muscle, weight, height, proportions 0..1,
    race 'african'|'asian'|'caucasian' or a dict of weights, skin (a folder in data/skins), eyes (a colour in
    data/eyes/materials), hair, eyebrows, eyelashes, clothes (list of folders in data/clothes), rig ('cmu_mb')."""
    race = spec.get('race', 'caucasian')
    if isinstance(race, str):
        a, s, c = RACES[race]; race = {'african': a, 'asian': s, 'caucasian': c}
    macro = {'gender': spec.get('gender', 1.0), 'age': spec.get('age', 0.5), 'muscle': spec.get('muscle', 0.5),
             'weight': spec.get('weight', 0.5), 'proportions': spec.get('proportions', 0.5), 'height': spec.get('height', 0.5),
             'cupsize': spec.get('cupsize', 0.5), 'firmness': spec.get('firmness', 0.5), 'race': race}
    base = HumanService.create_human(macro_detail_dict=macro)
    rig = HumanService.add_builtin_rig(base, spec.get('rig', 'cmu_mb'))   # rig first, so every asset binds to it
    if spec.get('skin'):
        HumanService.set_character_skin(_asset('skins', spec['skin'], 'mhmat'), base, skin_type='ENHANCED_SSS')
    HumanService.add_mhclo_asset(os.path.join(DATA, 'eyes', 'high-poly', 'high-poly.mhclo'), base, asset_type='Eyes', material_type='PROCEDURAL_EYES')
    for kind, key, default in (('eyebrows', 'eyebrows', 'eyebrow001'), ('eyelashes', 'eyelashes', 'eyelashes01')):
        if spec.get(key, default):
            HumanService.add_mhclo_asset(_asset(kind, spec.get(key, default), 'mhclo'), base, asset_type=kind.capitalize())
    if spec.get('hair'):
        HumanService.add_mhclo_asset(_asset('hair', spec['hair'], 'mhclo'), base, asset_type='Hair')
    for c in spec.get('clothes', []):
        HumanService.add_mhclo_asset(_asset('clothes', c, 'mhclo'), base, asset_type='Clothes')
    # every mesh of the character, for later per-object settings
    parts = [o for o in bpy.data.objects if o.type == 'MESH' and (o == base or o.parent in (base, rig) or o.parent == base)]
    return {'base': base, 'rig': rig, 'parts': parts}


def _bone_dir(arm, bone):
    mw = arm.matrix_world
    return ((mw @ bone.tail_local) - (mw @ bone.head_local)).normalized()


def retarget_bvh(rig, bvh_path, *, frame_start=1, frames=96, fps=24, src_start=0.2, speed=1.0,
                 origin=(0, 0, 0), heading_deg=0.0, keep_source=False, ground_lock=True):
    """Bakes a CMU-style BVH clip onto an MPFB 'cmu_mb' rig.

    Each bone's world rotation change from the clip's T-pose rest is applied to the target bone after first
    swinging the target into the same T-pose, so arm and leg angles match even though MakeHuman rests in an A-pose.
    The hips travel with the clip, scaled to the character's leg length, turned by heading_deg and moved to origin."""
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(filepath=bvh_path, global_scale=1.0, update_scene_fps=False, update_scene_duration=False)
    src = [o for o in bpy.data.objects if o not in before and o.type == 'ARMATURE'][0]
    scene = bpy.context.scene
    act = src.animation_data.action
    f0, f1 = act.frame_range
    src_fps = 120.0                                                    # CMU clips are captured at 120 fps
    names = [b.name for b in rig.data.bones if b.name in src.data.bones]
    # rest data
    S_rest = {n: (src.matrix_world @ src.data.bones[n].matrix_local).to_quaternion() for n in names}
    T_rest = {b.name: (rig.matrix_world @ b.matrix_local).to_quaternion() for b in rig.data.bones}
    T_tpose = {}
    for n in names:
        swing = _bone_dir(rig, rig.data.bones[n]).rotation_difference(_bone_dir(src, src.data.bones[n]))
        T_tpose[n] = swing @ T_rest[n]
    hip_src_rest = (src.matrix_world @ src.data.bones['Hips'].head_local)
    hip_dst_rest = (rig.matrix_world @ rig.data.bones['Hips'].head_local)
    leg = lambda arm: (arm.matrix_world @ arm.data.bones['LeftUpLeg'].head_local - arm.matrix_world @ arm.data.bones['LeftFoot'].head_local).length
    scale = leg(rig) / leg(src)
    H = Quaternion((0, 0, 1), math.radians(heading_deg))
    rig_q = rig.matrix_world.to_quaternion().inverted()
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    # sample the clip
    first_hip = None
    order = [b for b in rig.data.bones]                                # parents come before children
    for i in range(frames):
        sf = f0 + (src_start + i / fps * speed) * src_fps
        scene.frame_set(int(sf), subframe=sf - int(sf))
        hip_w = src.matrix_world @ src.pose.bones['Hips'].head
        if first_hip is None: first_hip = hip_w.copy()
        M = {}
        for b in order:
            R_b = b.matrix_local
            if b.parent:
                R_p = b.parent.matrix_local; rest_rel = R_p.inverted() @ R_b; parent_pose = M[b.parent.name]
                base_m = parent_pose @ rest_rel
            else:
                rest_rel = None; base_m = R_b.copy()
            if b.name in S_rest:
                S_w = (src.matrix_world @ src.pose.bones[b.name].matrix).to_quaternion()
                T_w = H @ (S_w @ S_rest[b.name].inverted()) @ T_tpose[b.name]
                rot = (rig_q @ T_w).to_matrix().to_4x4()
            else:
                rot = base_m.to_quaternion().to_matrix().to_4x4()
            if b.parent:
                m = rot.copy(); m.translation = base_m.translation
            else:
                d = H @ ((hip_w - first_hip) * scale)
                d.z = (hip_w.z - first_hip.z) * scale              # bob relative to the first frame; rest height from the character
                loc_w = Vector(origin) + Vector((d.x, d.y, 0)) + Vector((0, 0, hip_dst_rest.z + d.z))
                m = rot.copy(); m.translation = rig.matrix_world.inverted() @ loc_w
            M[b.name] = m
            local = (rest_rel.inverted() @ M[b.parent.name].inverted() @ m) if b.parent else (R_b.inverted() @ m)
            pb = rig.pose.bones[b.name]
            pb.rotation_quaternion = local.to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=frame_start + i)
            if not b.parent:
                pb.location = local.translation; pb.keyframe_insert('location', frame=frame_start + i)
    if ground_lock:   # keep the lowest foot on the ground: mocap drifts up or down over a clip
        heights = []
        for i in range(frames):
            scene.frame_set(frame_start + i)
            heights.append(min((rig.matrix_world @ rig.pose.bones[n].head).z for n in ('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase') if n in rig.pose.bones))
        rest_low = min(heights[:max(1, min(frames, fps))])               # the planted height in the first second is correct
        k = max(1, fps // 3)
        smooth = [min(heights[max(0, i - k):i + k + 1]) for i in range(frames)]   # lowest point nearby = the planted foot
        hips = rig.pose.bones['Hips']
        for i in range(frames):
            scene.frame_set(frame_start + i)
            hips.location = hips.location + (rig.matrix_world.inverted().to_3x3() @ (hips.bone.matrix_local.inverted().to_3x3() @ Vector((0, 0, rest_low - smooth[i]))))
            hips.keyframe_insert('location', frame=frame_start + i)
    if not keep_source:
        bpy.data.objects.remove(src, do_unlink=True)
        if act.users == 0: bpy.data.actions.remove(act)
    return rig
