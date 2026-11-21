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
        HumanService.set_character_skin(_asset('skins', spec['skin'], 'mhmat'), base, skin_type=spec.get('skin_type', 'ENHANCED_SSS'))
    HumanService.add_mhclo_asset(os.path.join(DATA, 'eyes', 'high-poly', 'high-poly.mhclo'), base, asset_type='Eyes', material_type='PROCEDURAL_EYES')
    iris = spec.get('iris', (0.09, 0.045, 0.02))                       # dark brown unless asked otherwise
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.name.endswith('high-poly'):
            for m in o.data.materials:
                for n in (m.node_tree.nodes if m and m.use_nodes else []):
                    for inp in n.inputs:
                        if 'iris' in inp.name.lower() and 'color' in inp.name.lower() and inp.type == 'RGBA':
                            inp.default_value = (*iris, 1)
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
                 origin=(0, 0, 0), heading_deg=0.0, keep_source=False, ground_lock=True, hand_twist=15.0, finger_curl=22.0, loop=False):
    """Bakes a CMU-style BVH clip onto an MPFB 'cmu_mb' rig.

    Each bone takes the clip's world rotation *change* from its rest. Arms and legs are first swung into the clip's
    T-pose (MakeHuman rests in an A-pose); spine, collarbones, neck, head and feet keep their own anatomy. The legs are
    then solved with two-bone IK so each ankle lands where the actor's did relative to his pelvis, scaled to this body,
    which stops the feet crossing when the actor's hips are wider. The hips travel with the clip, scaled to the
    character's leg length, turned so heading_deg=0 walks toward -Y, moved to origin, and kept on the ground.
    Pick clips with relaxed arms: CMU 35_01 and 39_02 walk naturally; some subjects hold their arms oddly."""
    before = set(bpy.data.objects)
    bpy.ops.import_anim.bvh(filepath=bvh_path, global_scale=1.0, update_scene_fps=False, update_scene_duration=False)
    src = [o for o in bpy.data.objects if o not in before and o.type == 'ARMATURE'][0]
    scene = bpy.context.scene
    act = src.animation_data.action
    f0, f1 = act.frame_range
    src_fps = 120.0                                                    # CMU clips are captured at 120 fps
    # CMU hand and finger data is noisy (markers on the back of the hand only), which twists the wrists.
    # Hands and fingers follow the forearm instead, in a relaxed pose.
    SKIP = {'LeftHand', 'RightHand', 'LThumb', 'RThumb', 'LeftFingerBase', 'RightFingerBase', 'LeftHandFinger1', 'RightHandFinger1',
            'LeftHandIndex1', 'RightHandIndex1'}
    names = [b.name for b in rig.data.bones if b.name in src.data.bones and b.name not in SKIP]
    tw, curl = math.radians(hand_twist), math.radians(finger_curl)
    RELAX = {'LeftHand': Quaternion((0, 1, 0), tw), 'RightHand': Quaternion((0, 1, 0), -tw),
             'LeftFingerBase': Quaternion((1, 0, 0), curl), 'RightFingerBase': Quaternion((1, 0, 0), curl),
             'LeftHandFinger1': Quaternion((1, 0, 0), curl), 'RightHandFinger1': Quaternion((1, 0, 0), curl),
             'LThumb': Quaternion((1, 0, 0), curl * 0.5), 'RThumb': Quaternion((1, 0, 0), curl * 0.5)}
    # rest data
    S_rest = {n: (src.matrix_world @ src.data.bones[n].matrix_local).to_quaternion() for n in names}
    T_rest = {b.name: (rig.matrix_world @ b.matrix_local).to_quaternion() for b in rig.data.bones}
    # Only the limbs differ by *pose* (MakeHuman rests in an A-pose, the clip in a T-pose), so only they are swung
    # to the clip's rest direction. Spine, collarbones, neck, head and feet differ by *anatomy*: forcing those to the
    # actor's directions hunches the shoulders and tips the torso back, so they take the motion as a change only.
    LIMBS = {f'{s}{b}' for s in ('Left', 'Right') for b in ('Arm', 'ForeArm', 'Hand', 'UpLeg', 'Leg')}
    T_tpose = {}
    for n in names:
        swing = _bone_dir(rig, rig.data.bones[n]).rotation_difference(_bone_dir(src, src.data.bones[n])) if n in LIMBS else Quaternion()
        T_tpose[n] = swing @ T_rest[n]
    hip_src_rest = (src.matrix_world @ src.data.bones['Hips'].head_local)
    hip_dst_rest = (rig.matrix_world @ rig.data.bones['Hips'].head_local)
    leg = lambda arm: (arm.matrix_world @ arm.data.bones['LeftUpLeg'].head_local - arm.matrix_world @ arm.data.bones['LeftFoot'].head_local).length
    scale = leg(rig) / leg(src)
    # loop=True repeats one stride of a cyclic clip (a run or walk) for as long as needed: the period is the lag at
    # which hands and feet return closest to where they were, and the hips advance by one stride per cycle
    P, stride = None, Vector((0, 0, 0))
    if loop:
        def sig(ts):
            sf_ = f0 + ts * src_fps; scene.frame_set(int(sf_), subframe=sf_ - int(sf_)); hp = src.pose.bones['Hips'].head
            return [src.pose.bones[n].head - hp for n in ('LeftFoot', 'RightFoot', 'LeftHand', 'RightHand')], (src.matrix_world @ hp).copy()
        s0, h0 = sig(src_start); best = None; clip_len = (f1 - f0) / src_fps
        for k in range(int(0.45 * src_fps), int(min(1.3, clip_len - src_start - 0.02) * src_fps)):
            s1, h1 = sig(src_start + k / src_fps); err = sum((a - b).length for a, b in zip(s0, s1))
            if best is None or err < best[0]: best = (err, k / src_fps, h1 - h0)
        P, stride = best[1], best[2]; stride.z = 0
    # face every clip the same way: heading 0 means walking toward -Y, whatever direction the actor walked
    scene.frame_set(int(f0 + src_start * src_fps)); a_ = src.matrix_world @ src.pose.bones['Hips'].head
    scene.frame_set(int(min(f1, f0 + (src_start + frames / fps * speed) * src_fps))); b_ = src.matrix_world @ src.pose.bones['Hips'].head
    travel = math.atan2(stride.y, stride.x) if loop else math.atan2(b_.y - a_.y, b_.x - a_.x)
    H = Quaternion((0, 0, 1), math.radians(heading_deg)) @ Quaternion((0, 0, 1), -math.pi / 2 - travel)
    rig_q = rig.matrix_world.to_quaternion().inverted()
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    # sample the clip
    first_hip = None
    order = [b for b in rig.data.bones]                                # parents come before children
    for i in range(frames):
        tau = i / fps * speed; ncyc = int(tau // P) if loop else 0
        sf = min(f1 - 1, f0 + (src_start + tau - ncyc * (P or 0)) * src_fps)
        scene.frame_set(int(sf), subframe=sf - int(sf))
        hip_w = src.matrix_world @ src.pose.bones['Hips'].head + stride * ncyc
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
                rot = (base_m.to_quaternion() @ RELAX.get(b.name, Quaternion())).to_matrix().to_4x4()
            if b.parent:
                m = rot.copy(); m.translation = base_m.translation
            else:
                d = H @ ((hip_w - first_hip) * scale)
                d.z = (hip_w.z - first_hip.z) * scale              # bob relative to the first frame; rest height from the character
                loc_w = Vector(origin) + Vector((d.x, d.y, 0)) + Vector((0, 0, hip_dst_rest.z + d.z))
                m = rot.copy(); m.translation = rig.matrix_world.inverted() @ loc_w
            M[b.name] = m
        # Legs: put each ankle where the actor's ankle is relative to his pelvis (scaled to this body), with the knee
        # bending toward the actor's knee. Copying thigh angles alone crosses the feet, because the actor's hips are wider.
        S_pelvis = src.matrix_world.to_quaternion() @ src.pose.bones['Hips'].matrix.to_quaternion()
        T_pelvis = M['Hips'].to_quaternion()
        to_t = lambda v: T_pelvis @ (rig_q @ H @ S_pelvis @ (S_rest['Hips'].inverted() @ T_rest['Hips']).inverted() @ S_pelvis.inverted()).inverted() @ v if False else (rig_q @ H) @ v
        p_s = src.matrix_world @ src.pose.bones['Hips'].head
        for side in ('Left', 'Right'):
            up, lo, ft = side + 'UpLeg', side + 'Leg', side + 'Foot'
            if up not in M or ft not in M: continue
            hip_s = src.matrix_world @ src.pose.bones[up].head; knee_s = src.matrix_world @ src.pose.bones[lo].head; ank_s = src.matrix_world @ src.pose.bones[ft].head
            hip_t = M[up].translation
            ank_t = M['Hips'].translation + to_t(ank_s - p_s) * scale
            a = rig.data.bones[up].length; bl = rig.data.bones[lo].length
            v = ank_t - hip_t; d = max(abs(a - bl) + 1e-4, min(a + bl - 1e-4, v.length)); axis = v.normalized()
            pole = to_t(knee_s - hip_s); pole = (pole - axis * pole.dot(axis)).normalized()
            x = (a * a - bl * bl + d * d) / (2 * d); hgt = math.sqrt(max(0.0, a * a - x * x))
            knee_t = hip_t + axis * x + pole * hgt; ank_t = hip_t + axis * d
            for name, start, end in ((up, hip_t, knee_t), (lo, knee_t, ank_t)):
                cur = M[name].to_3x3().col[1].normalized()
                q = cur.rotation_difference((end - start).normalized()) @ M[name].to_quaternion()
                m = q.to_matrix().to_4x4(); m.translation = start; M[name] = m
            m = M[ft].to_quaternion().to_matrix().to_4x4(); m.translation = ank_t; M[ft] = m
            for child in rig.data.bones[ft].children_recursive:          # toes follow the moved foot
                rr = child.parent.matrix_local.inverted() @ child.matrix_local
                m = M[child.name].to_quaternion().to_matrix().to_4x4(); m.translation = (M[child.parent.name] @ rr).translation; M[child.name] = m
        for b in order:
            R_b = b.matrix_local
            local = ((b.parent.matrix_local.inverted() @ R_b).inverted() @ M[b.parent.name].inverted() @ M[b.name]) if b.parent else (R_b.inverted() @ M[b.name])
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
        rest_low = min(heights[:max(1, min(frames, int(fps)))])               # the planted height in the first second is correct
        k = max(1, int(fps) // 3)
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
