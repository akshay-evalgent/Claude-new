"""Check renders of the flood set: aerial, side and front cutaways, the vehicles. -> $QS_SCRATCH/settest"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, "..", "lightning"))
sys.path.insert(2, os.path.join(HERE, "..", "quicksand"))
import bpy
from mathutils import Vector

import sets as S
import car as C
import storm as ST
import valley as V
import vehicles as VH

OUT = os.path.join(os.environ["QS_SCRATCH"], "settest"); os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
world = V.World()
socks = []
val = V.Valley(socks)
props = S.collection("Props")
V.depth_gauge(props, -12.6, -4.7)
V.warning_sign(props, "FloodSign", -17.0, -4.9, [("ROAD", 0.17), ("FLOODED", 0.13)], -90)
V.poles(props); V.trees(props); V.grass(props)
V.debris(props, val.level)
cars = S.collection("Cars")
sedan = C.build_car("Sedan", (0.42, 0.02, 0.025), cars)
loc, rot = V.on_road(V.CAR_X, V.LANE_Y)
sedan["root"].location = loc; sedan["root"].rotation_euler = rot
conv = C.build_car("Conv", (0.85, 0.55, 0.04), cars, convertible=True)
loc, rot = V.on_road(-24, V.LANE_Y)
conv["root"].location = loc; conv["root"].rotation_euler = rot
suv = VH.build_suv("SUV", (0.12, 0.16, 0.2), cars)
suv["root"].location = (8, -22, V.FLOOR); suv["root"].rotation_euler = (0, 0, 0.6)
truck = VH.build_pickup("Pickup", (0.55, 0.56, 0.58), cars)
truck["root"].location = (-6, -30, V.FLOOR); truck["root"].rotation_euler = (0, 0, -0.3)
val.level.location.z = V.FLOOR + 0.3
val.foam.location = (V.CAR_X, V.LANE_Y, 0)
world.mix.outputs[0].default_value = 0.0; world.storm_sun.data.energy = 0.6

sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 16
sc.cycles.use_denoising = True; sc.cycles.transparent_max_bounces = 64
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = 0.4
sc.render.resolution_x, sc.render.resolution_y = 540, 960


def shot(name, loc, tgt, lens, hide=(), show=()):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24; cd.clip_end = 4000
    cam = bpy.data.objects.new(name, cd); S.link(cam)
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    for c in bpy.data.collections:
        if c.name.startswith("Cut") or c.name == "Valley":
            vis = c.name in show
            c.hide_render = not vis
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


which = sys.argv[1:] or ["aerial", "cutY", "cutX", "cutW", "fleet"]
cx = V.CAR_X
if "aerial" in which:
    shot("aerial", (-40, 14, 12), (-2, -4, -1.2), 24, show=("Valley",))
if "cutY" in which:
    shot("cutY", (cx + 0.5, -11.5, -0.4), (cx, 0, -1.0), 28, show=("CutY",))
if "cutX" in which:
    shot("cutX", (cx + 12, -1.2, -0.5), (cx, -1.75, -1.0), 30, show=("CutX",))
if "cutW" in which:
    shot("cutW", (6.5, -10.5, -0.8), (6, 0, -1.8), 26, show=("CutW",))
if "fleet" in which:
    shot("fleet", (12, -55, 6), (0, -24, -1.6), 30, show=("Valley",))
print("done")
