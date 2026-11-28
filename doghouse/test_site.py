"""Check renders of the site: the backyard, and the cutaway in the finished state."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector
import sets as S
import grounds as SITE
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
SITE.world_and_sun()
R = SITE.build_all()
C = R["C"]
C["t"].scale.x = 1.0
for o in [R["tripod"], *R["tripod"].children, R["chain"], R["rope"], R["bucket"], *R["clods"], R["newspaper"], R["pick"], R["laptop"]]:
    o.hide_render = True
for root in (R["pick"], R["laptop"], R["bucket"]) + ((R["spade"],) if R["spade"] else ()):
    for o in root.children_recursive:
        o.hide_render = True
for lt in R["lights1"]:
    lt.data.energy = 60
R["M"]["bulb"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 8
for k in range(7, SITE.N_RINGS):
    for o in R["rings1"][k][1]:
        o.hide_render = True
cd = bpy.data.cameras.new("C"); cd.lens = 20; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24
cam = bpy.data.objects.new("C", cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 360, 640
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
out = os.path.join(os.environ["QS_SCRATCH"], "test"); os.makedirs(out, exist_ok=True)


def shoot(tag, loc, tgt, lens=20):
    cd.lens = lens
    cam.location = loc
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(out, f"site_{tag}.png")
    bpy.ops.render.render(write_still=True)


shoot("ext", (3.4, -4.6, 0.9), (3.0, 0.0, 0.6), 26)
shoot("dog2", (22.5, -2.4, 2.7), (3.0, 0.4, 0.4), 22)
for o in SITE.FRONT:
    o.hide_render = True
shoot("cut1", (3.6, -13.0, -2.5), (3.8, 0.0, -2.6), 22)
shoot("cut2", (17.0, -9.0, -4.6), (17.0, 0.0, -4.8), 24)
shoot("tunnel", (10.5, -10.0, -2.8), (10.5, 0.0, -3.2), 22)
