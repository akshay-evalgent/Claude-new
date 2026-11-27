"""Build the pool short in Blender and render it.

  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES [STEP]                        low-res timing preview
  python3 -I scene.py render W H SAMPLES [START END]                    final frames
  python3 -I scene.py save                                               write pool.blend
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector, Matrix

import sets as S
import storm as ST
import gen
import yard as Y
import people
import shots
from shots import F, ends, key_xf, bone_world
from timeline import FPS, SHOTS, SHOT, END, f

SCRATCH = os.environ["QS_SCRATCH"]
EXPOSURE = {"ext": 0.0, "cut": 0.3}
SHOT_EXPOSURE = {"edges": 0.1, "button": 0.1}


def bone_parent(obj, arm, bone, local):
    """Parent obj to a pose bone with a fixed offset `local` (in the bone's space)."""
    obj.parent = arm; obj.parent_type = "BONE"; obj.parent_bone = bone
    bpy.context.view_layer.update()
    pb = arm.pose.bones[bone]
    # bone parenting puts the child at the bone's tail; express `local` from the bone's head
    obj.matrix_parent_inverse = Matrix.Translation((0, -pb.length, 0))
    obj.matrix_basis = local


def root_at(name, objs, z):
    """An empty at height z that the objects hang from (to scale them from that height)."""
    r = bpy.data.objects.new(name, None); S.link(r); r.location = (0, 0, z)
    for o in objs:
        o.parent = r; o.matrix_parent_inverse = Matrix.Translation((0, 0, z)).inverted()
    return r


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    gen.make_all()
    Y.FRONT.clear()
    sun, bg = Y.world_and_sun()
    R = Y.build_all()
    g = R["garage"]
    slab_root = root_at("SlabRoot", g["slab"], Y.FLOOR - Y.SL)
    walls_root = root_at("WallsRoot", g["walls"], Y.FLOOR)
    cast = S.collection("Cast")
    bd = people.builder(); nd = people.neighbor()
    for ch in (bd, nd):
        for o in ch["parts"] + [ch["arm"]]:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            cast.objects.link(o)
    B, N = shots.Actor(bd), shots.Actor(nd)

    VIS = {}

    def want(objs, names):
        for o in objs:
            VIS[o] = VIS.get(o, {n for n, *_ in SHOTS}) & set(names)
    rig = {"yard": R, "builder": B, "neighbor": N, "slab_root": slab_root, "walls_root": walls_root,
           "slab_objs": g["slab"], "wall_objs": g["walls"], "bone_parent": bone_parent, "want": want}
    shots.perform(rig)

    # close-up cameras that follow the hand and the face
    sc.frame_set(F("button", 0.5)); bpy.context.view_layer.update()
    rp = R["remote"]["root"].matrix_world.translation.copy()
    rig["hand_cam"] = lambda u, h=rp: (h + Vector((-0.22 + 0.03 * u, -0.3 + 0.04 * u, 0.26)), h + Vector((0.0, 0.0, 0.01)))
    sc.frame_set(F("congrats", 0.7)); bpy.context.view_layer.update()
    hd = bone_world(B.arm, "mixamorig:Head").translation.copy()
    rig["face_cam"] = lambda u, h=hd: (h + Vector((-0.35 + 0.08 * u, -1.75 + 0.15 * u, 0.55)), h + Vector((0.0, -0.32, -0.18)))
    shots.cameras(rig)

    # visibility: what each shot wants, minus the front of the ground in the cutaways
    cut = {n for n, t0, t1, v in SHOTS if v == "cut"}
    for o in Y.FRONT:
        VIS.setdefault(o, {n for n, *_ in SHOTS})
    for o, names in VIS.items():
        for name, t0, t1, v in SHOTS:
            show = name in names and not (name in cut and o in Y.FRONT)
            o.hide_render = not show
            o.keyframe_insert("hide_render", frame=f(t0))
        ad = o.animation_data
        if ad and ad.action:
            for fc in ST._fcurves(ad.action):
                if fc.data_path == "hide_render":
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"

    # exposure per shot
    for name, t0, t1, v in SHOTS:
        sc.view_settings.exposure = EXPOSURE[v] + SHOT_EXPOSURE.get(name, 0.0)
        sc.view_settings.keyframe_insert("exposure", frame=f(t0))
    ST.set_interp(sc, "CONSTANT")
    sc.frame_start, sc.frame_end = 1, f(END)
    sc.render.fps = FPS
    return rig


def render_settings(w, h, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"
    sc.cycles.samples = samples; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.05
    sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 8; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 3
    sc.cycles.transmission_bounces = 8; sc.cycles.transparent_max_bounces = 16; sc.cycles.volume_bounces = 1
    sc.cycles.sample_clamp_indirect = 6.0; sc.cycles.blur_glossy = 1.0
    sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.use_motion_blur = False
    sc.render.use_persistent_data = True


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "stills"
    args = sys.argv[2:]
    build()
    sc = bpy.context.scene
    if mode == "stills":
        w, h, smp = 360, 640, 12
        if "--res" in args:
            i = args.index("--res"); w, h = int(args[i + 1]), int(args[i + 2]); del args[i:i + 3]
        if "--samples" in args:
            i = args.index("--samples"); smp = int(args[i + 1]); del args[i:i + 2]
        render_settings(w, h, smp)
        out = os.path.join(SCRATCH, "stills"); os.makedirs(out, exist_ok=True)
        frames = []
        for a in args or [n for n, *_ in SHOTS]:
            if a.isdigit():
                frames.append((int(a), a))
            else:
                t0, t1, _ = SHOT[a]
                frames.append(((f(t0) + f(t1) - 1) // 2, a))
        for fr, tag in frames:
            sc.frame_set(fr)
            sc.render.filepath = os.path.join(out, f"{fr:04d}_{tag}.png")
            bpy.ops.render.render(write_still=True)
    elif mode in ("preview", "render"):
        w, h, smp = int(args[0]), int(args[1]), int(args[2])
        render_settings(w, h, smp)
        sub = "preview_frames" if mode == "preview" else "frames"
        out = os.path.join(SCRATCH, sub); os.makedirs(out, exist_ok=True)
        if mode == "preview":
            sc.frame_step = int(args[3]) if len(args) > 3 else 2
        elif len(args) > 4:
            sc.frame_start, sc.frame_end = int(args[3]), int(args[4])
        sc.render.use_overwrite = False
        sc.render.use_placeholder = True
        sc.render.filepath = os.path.join(out, "f####")
        bpy.ops.render.render(animation=True)
    elif mode == "save":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "pool.blend"))
    print("done")


if __name__ == "__main__":
    main()
