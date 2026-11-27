"""Check render of the cast (front and three-quarter)."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector
import sets as S
import people

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
b = people.builder(); n = people.neighbor()
for ch, x in ((b, -0.45), (n, 0.45)):
    ch["arm"].location.x += x
S.box("Floor", (-5, -5, -0.01), (5, 5, 0), S.flat("F", (0.5, 0.5, 0.5), 0.8))
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.8, 0.85, 0.95, 1)
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); sc.collection.objects.link(sun)
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(40), 0, math.radians(-30))
cd = bpy.data.cameras.new("C"); cd.lens = 50; cam = bpy.data.objects.new("C", cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 16; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 720, 640
sc.view_settings.view_transform = "AgX"
out = os.path.join(os.environ["QS_SCRATCH"], "test"); os.makedirs(out, exist_ok=True)
for tag, loc, tgt in (("front", (0, -4.2, 1.1), (0, 0, 0.95)), ("head", (-0.25, -1.1, 1.65), (-0.3, 0, 1.6)),
                      ("headn", (0.45, -1.1, 1.62), (0.45, 0, 1.55))):
    cam.location = loc
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(out, f"cast_{tag}.png")
    bpy.ops.render.render(write_still=True)
