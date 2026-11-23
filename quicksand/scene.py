"""Build and render the quicksand short.

usage (with $QS_SCRATCH set, after fetch_assets.py and voiceover.py):
  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES STEP                         every STEP-th frame
  python3 -I scene.py render W H SAMPLES [START END]                   full frames (resumable)
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from mathutils import Matrix, Vector

import anim, human, sets, shots
from shots import f, SHOTS, SHOT, STAND

SCRATCH = os.environ["QS_SCRATCH"]


def boot_mesh(ch_data):
    """Static copy of the right boot + lower trouser leg, toe pointing +X, ankle on the origin."""
    bm = bmesh.new()
    for o in ch_data["clothes"]:
        if "boots" in o.name or "pants" in o.name:
            tmp = bmesh.new(); tmp.from_mesh(o.data)
            mat_offset = len(bm.verts)
            tmp.verts.ensure_lookup_table()
            rm = [v for v in tmp.verts if v.co.x > -0.02 or v.co.z > 0.42]
            bmesh.ops.delete(tmp, geom=rm, context="VERTS")
            me = bpy.data.meshes.new("tmp"); tmp.to_mesh(me); tmp.free()
            for m in o.data.materials:
                me.materials.append(m)
            bm.from_mesh(me)
    me = bpy.data.meshes.new("MacroBoot")
    bm.to_mesh(me); bm.free()
    # simple wet materials for the macro (no grit speckle at this scale)
    me.materials.clear()
    leather = sets.flat("MacroLeather", (0.06, 0.035, 0.02), 0.32)
    cloth = sets.flat("MacroCloth", (0.09, 0.075, 0.05), 0.5)
    me.materials.append(cloth); me.materials.append(leather)
    for p in me.polygons:
        p.material_index = 1 if p.center.z < 0.16 else 0
    ankle = Vector((-0.196, -0.019, 0.072))
    R = Matrix.Rotation(math.radians(90), 4, "Z")
    me.transform(Matrix.Translation(Vector((0, 0, -0.2))) @ R @ Matrix.Translation(-ankle))
    me.transform(Matrix.Scale(1.0, 4))
    for p in me.polygons:
        p.use_smooth = True
    return me


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = shots.FPS
    sc.frame_start, sc.frame_end = 1, f(shots.END) - 1
    sets.world()

    sink = bpy.data.objects.new("SinkRing", None); sets.link(sink)
    beach_coll, beach_plane = sets.beach([sink])
    tide = sets.tide(beach_coll)
    secx = sets.section_block("SectionX", STAND, "X", [sink])
    secy = sets.section_block("SectionY", STAND, "Y", [sink])
    car_coll, car_root = sets.car(sets.CAR, math.pi)
    pivot = bpy.data.objects.new("CarPivot", None); sets.link(pivot, car_coll)
    pivot.location = sets.CAR + Vector((1.32, 0, 0.33))
    bpy.context.view_layer.update()
    car_root.parent = pivot
    car_root.matrix_parent_inverse = pivot.matrix_world.inverted()
    pool_coll = sets.pool()

    ch_data = human.build_human()
    ch = anim.Character(ch_data, sink)
    seep = bpy.data.objects.new("SeepFront", None); sets.link(seep)
    seep.location = sets.MACRO + Vector((0, 0, 0.4))
    macro_coll, grains, boot = sets.macro_grains(boot_mesh(ch_data), seep)
    lamp = bpy.data.objects.new("MacroKey", bpy.data.lights.new("MacroKey", "AREA")); sets.link(lamp, macro_coll)
    lamp.data.energy = 10; lamp.data.size = 0.8; lamp.data.color = (1.0, 0.9, 0.78)
    lamp.location = sets.MACRO + Vector((0.35, -0.75, 0.45))
    lamp.rotation_euler = (Vector((0, 0, -0.05)) - Vector((0.35, -0.75, 0.45))).to_track_quat("-Z", "Y").to_euler()

    shots.perform(ch, pivot, boot, grains, seep, tide)
    shots.cameras()
    objs = lambda c: [o for o in c.all_objects]
    shots.visibility({"beach": [beach_plane], "tide": [tide], "section_x": objs(secx), "section_y": objs(secy),
                      "car": objs(car_coll), "pool": objs(pool_coll), "macro": objs(macro_coll)})
    wet_trees = [m.node_tree for o in ch_data["clothes"] + [ch_data["body"]] for m in o.data.materials
                 if m.node_tree.nodes.get("WetLevel")]
    keys = [ch.arm, sink] + [o.data.shape_keys for o in [ch_data["body"]] + ch_data["face_proxies"]] + wet_trees
    shots.isolate_cuts(keys)
    sc.frame_set(1)
    return ch


def render_settings(w, h, samples):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.04
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = 6
    sc.cycles.diffuse_bounces = 2
    sc.cycles.glossy_bounces = 2
    sc.cycles.transmission_bounces = 4
    sc.cycles.transparent_max_bounces = 10
    sc.cycles.volume_bounces = 0
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.15


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
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "quicksand.blend"))
    print("done")


if __name__ == "__main__":
    main()
