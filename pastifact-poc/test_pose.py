"""Render pose checks: relaxed and pointing-up poses from front, side and hand close-up."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import human, posing

OUT = os.path.join(os.environ["POC_SCRATCH"], "test")
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
arm, body, clothes = human.build_human("Man", human.DEFAULT_OUTFIT)

w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.65, 0.75, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30))
fl = bpy.data.meshes.new("floor"); fl.from_pydata([(-5, -5, 0), (5, -5, 0), (5, 5, 0), (-5, 5, 0)], [], [(0, 1, 2, 3)])
sc.collection.objects.link(bpy.data.objects.new("floor", fl))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 432, 768


def shoot(tag, views):
    for nm, loc, rot, lens in views:
        cam.location = loc; cam.rotation_euler = [math.radians(a) for a in rot]; cam.data.lens = lens
        sc.render.filepath = os.path.join(OUT, f"pose_{tag}_{nm}.png")
        bpy.ops.render.render(write_still=True)


FULL = [("front", (0, -5.2, 1.0), (90, 0, 0), 50), ("side", (-5.2, 0, 1.0), (90, 0, -90), 50)]
posing.reset(arm); posing.relaxed(arm)
shoot("relaxed", FULL + [("hand", (0.25, -0.9, 0.85), (90, 0, 0), 50)])
posing.reset(arm); posing.relaxed(arm)
posing.point(arm, "Right", (-0.25, 0.55, 1.0)); posing.look(arm, pitch=35, yaw=-10)
shoot("point", FULL + [("hand", (-0.6, -1.2, 2.1), (75, 0, 0), 50)])
print("done")
