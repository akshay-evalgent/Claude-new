"""Check renders of the yard: exterior, cutaway (front pieces hidden), tub raised with the car up."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector
import sets as S
import gen
import yard as Y

gen.make_all()
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
Y.world_and_sun()
R = Y.build_all()
for o in [R["pile"], R["spray"], *R["dims"], *R["clods"], *R["crane"], *R["hose"], R["fill_root"], *R["fill"]]:
    o.hide_render = True
cd = bpy.data.cameras.new("C"); cd.lens = 20; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24
cam = bpy.data.objects.new("C", cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.engine = "CYCLES"; sc.cycles.samples = 12; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 360, 640
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
out = os.path.join(os.environ["QS_SCRATCH"], "test"); os.makedirs(out, exist_ok=True)
which = sys.argv[1:] or ["ext", "cut", "up", "upext"]


def shoot(tag, loc, tgt, lens=20):
    cd.lens = lens
    cam.location = loc
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(out, f"yard_{tag}.png")
    bpy.ops.render.render(write_still=True)


if "ext" in which:
    R["car"]["root"].location = (0, Y.LIFT_C, Y.LIFT_DOWN); R["lift"].set(Y.LIFT_DOWN)
    shoot("ext", (5.5, -12.5, 5.0), (0, 0.5, -0.5), 22)
if "cut" in which or "up" in which:
    for o in Y.FRONT:
        o.hide_render = True
    if "cut" in which:
        shoot("cut", (0.0, -13.2, -0.9), (0, 0, -1.8), 24)
    R["tub"]["root"].location.z = Y.RISE
    for r in R["rams"]:
        r.set(Y.RISE)
    R["lift"].set(Y.LIFT_UP)
    R["car"]["root"].location = (0, Y.LIFT_C, Y.LIFT_UP)
    if "up" in which:
        shoot("up", (0.0, -13.6, 0.4), (0, 0, -0.1), 22)
    for o in Y.FRONT:
        o.hide_render = False
    if "upext" in which:
        shoot("upext", (7.5, 15.0, 3.0), (0, 2.0, 1.2), 22)
