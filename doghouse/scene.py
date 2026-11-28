"""Build the doghouse short in Blender and render it.

  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES [STEP]                        low-res timing preview
  python3 -I scene.py render W H SAMPLES [START END]                    final frames
  python3 -I scene.py save                                               write doghouse.blend
"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "pool"), os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector, Matrix

import sets as S
import storm as ST
import grounds as G
import people
import shots
from shots import F, ends, key_xf, bone_world
import people
from timeline import FPS, SHOTS, SHOT, END, f

SCRATCH = os.environ["QS_SCRATCH"]
EXPOSURE = {"ext": 0.0, "cut": 0.25}
SHOT_EXPOSURE = {"notdog": 0.4, "nothideout": 0.3, "garden": 0.2, "break": 0.15}


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


def headlamp(ch):
    """A lamp on the front of the hard hat (emissive lens plus a spot), riding the head bone."""
    hat = ch["hardhat"]
    bpy.context.view_layer.update()
    c = hat.matrix_world.translation
    body = shots.G.P.cyl("Headlamp", 0.022, 0.03, shots.G.S.flat("HeadlampBody", (0.05, 0.05, 0.05), 0.4), None,
                         c + Vector((0, -0.14, 0.035)), rot=(math.radians(90), 0, 0))
    glass = shots.G.P.cyl("HeadlampGlass", 0.018, 0.004, bpy.data.materials["Headlamp"], None,
                          c + Vector((0, -0.157, 0.035)), rot=(math.radians(90), 0, 0))
    ld = bpy.data.lights.new("HeadlampSpot", "SPOT"); ld.energy = 0.0; ld.spot_size = math.radians(55); ld.spot_blend = 0.6
    ld.color = (1.0, 0.95, 0.85); ld.shadow_soft_size = 0.02
    sp = bpy.data.objects.new("HeadlampSpot", ld); S.link(sp); sp.location = c + Vector((0, -0.17, 0.035))
    sp.rotation_euler = (math.radians(90), 0, 0)
    out = [body, glass, sp]
    for o in out:
        people._ride_head(ch, o)
        ch["parts"].remove(o)
    return out


def root_at(name, objs, z):
    """An empty at height z that the objects hang from (to scale them from that height)."""
    r = bpy.data.objects.new(name, None); S.link(r); r.location = (0, 0, z)
    for o in objs:
        o.parent = r; o.matrix_parent_inverse = Matrix.Translation((0, 0, z)).inverted()
    return r


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    G.FRONT.clear()
    sun, bg = G.world_and_sun()
    R = G.build_all()
    shell_objs = [o for k, lst in R["shell1"].items() for o in lst]
    shell_root = root_at("Shell1Root", shell_objs, G.FLOOR - G.WALL)
    cast = S.collection("Cast")
    bd = people.builder(); nd = people.neighbor()
    lamp = headlamp(bd)
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
    furniture = [R["bed"], R["shelf"], *R["cans"], *R["jugs"], R["crate"], R["router"], R["radio"], *R["lamps1"]]
    rug = R["rug1"]
    rug_root = bpy.data.objects.new("Rug1Root", None); S.link(rug_root); rug_root.location = (4.3, 1.3, G.FLOOR)
    rug.parent = rug_root; rug.matrix_parent_inverse = Matrix.Translation(rug_root.location).inverted()
    furniture.append(rug_root)
    rig = {"site": R, "builder": B, "neighbor": N, "shell1_root": shell_root, "shell1_objs": shell_objs,
           "furniture1": furniture, "headlamp": lamp, "want": want}
    shots.perform(rig)
    # the head lamp lights up in the tunnel
    hl = bpy.data.materials["Headlamp"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    for name, t0, t1, v in SHOTS:
        on = name in ("keepdig", "garden", "break", "neighbor")
        hl.default_value = 30.0 if on else 0.0; hl.keyframe_insert("default_value", frame=f(t0))
        lamp[2].data.energy = 40.0 if on else 0.0; lamp[2].data.keyframe_insert("energy", frame=f(t0))
    ST.set_interp(bpy.data.materials["Headlamp"].node_tree, "CONSTANT"); ST.set_interp(lamp[2].data, "CONSTANT")
    shots.cameras(rig)

    # visibility: what each shot wants, minus everything in front of the section in the cutaways
    cut = {n for n, t0, t1, v in SHOTS if v == "cut"}
    for o in G.FRONT:
        VIS.setdefault(o, {n for n, *_ in SHOTS})
    for o, names in VIS.items():
        for name, t0, t1, v in SHOTS:
            show = name in names and not (name in cut and o in G.FRONT)
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
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "doghouse.blend"))
    print("done")


if __name__ == "__main__":
    main()
