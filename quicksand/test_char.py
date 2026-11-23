"""Render character checks: full body and face close-ups with each expression."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import human, posing

OUT = os.path.join(os.environ["QS_SCRATCH"], "test")
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
ch = human.build_human()
arm = ch["arm"]
posing.reset(arm); posing.relaxed(arm)

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.6, 0.7, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(55), 0, math.radians(25))
fl = bpy.data.meshes.new("floor"); fl.from_pydata([(-5, -5, 0), (5, -5, 0), (5, 5, 0), (-5, 5, 0)], [], [(0, 1, 2, 3)])
sc.collection.objects.link(bpy.data.objects.new("floor", fl))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.render.resolution_x, sc.render.resolution_y = 480, 640
only = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

def shoot(tag, loc, rot, lens):
    cam.location = loc; cam.rotation_euler = [math.radians(a) for a in rot]; cam.data.lens = lens
    sc.render.filepath = os.path.join(OUT, f"char_{tag}.png")
    bpy.ops.render.render(write_still=True)

if not only or "body" in only:
    shoot("body_front", (0.3, -4.6, 1.0), (90, 0, 4), 45)
    shoot("body_34", (-2.6, -3.4, 1.3), (85, 0, -38), 50)
for e in (["neutral"] + list(human.EXPRESSIONS)) if not only or "face" in only else []:
    for o in [ch["body"]] + ch["face_proxies"]:
        for k in o.data.shape_keys.key_blocks[1:]:
            k.value = 1.0 if k.name == e else 0.0
    shoot("face_" + e, (0.12, -0.75, 1.68), (90, 0, 9), 70)
    if e == "neutral":
        shoot("eye_zoom", (0.03, -0.35, 1.66), (90, 0, 4), 90)
print("done")
