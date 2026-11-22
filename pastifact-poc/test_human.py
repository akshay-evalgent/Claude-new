"""Quick check: build the character and render front/side stills."""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import human

OUT = os.path.join(os.environ["POC_SCRATCH"], "test")
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

arm, body, clothes = human.build_human("Man", human.DEFAULT_OUTFIT)
pose_arg = sys.argv[-1] if len(sys.argv) > 1 else ""
if pose_arg == "relax":
    pb = arm.pose.bones
    for side, s in (("Left", 1), ("Right", -1)):
        pb[f"mixamorig:{side}Arm"].rotation_mode = "XYZ"
        pb[f"mixamorig:{side}Arm"].rotation_euler = (0, 0, math.radians(float(os.environ.get("ARMZ", "0"))) * s)

# simple studio light
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.65, 0.75, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(30))
floor = bpy.data.meshes.new("floor"); floor.from_pydata([(-5, -5, 0), (5, -5, 0), (5, 5, 0), (-5, 5, 0)], [], [(0, 1, 2, 3)])
fo = bpy.data.objects.new("floor", floor); sc.collection.objects.link(fo)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 50
sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.use_denoising = True; sc.cycles.device = "CPU"
sc.render.resolution_x, sc.render.resolution_y = 540, 960
for nm, loc, rot in (("front", (0, -5.2, 1.0), (90, 0, 0)), ("side", (5.2, 0, 1.0), (90, 0, 90)),
                     ("face", (0, -1.3, 1.6), (90, 0, 0))):
    cam.location = loc; cam.rotation_euler = [math.radians(a) for a in rot]
    sc.render.filepath = os.path.join(OUT, f"human_{nm}_{pose_arg or 'rest'}.png")
    bpy.ops.render.render(write_still=True)
print("done")
