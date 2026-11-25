"""Check renders of the six sets -> $QS_SCRATCH/settest"""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, "..", "lightning"), os.path.join(HERE, "..", "quicksand")]
import bpy
from mathutils import Vector

import sets as S
import rooms as R
import props as P
import car as C

OUT = os.path.join(os.environ["QS_SCRATCH"], "settest"); os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
world = R.World()
cols = {k: S.collection(k) for k in ("Office", "House", "Stage", "Shop", "Auction", "Nevada")}
R.office(cols["Office"]); R.house(cols["House"]); R.stage(cols["Stage"]); R.shop(cols["Shop"])
R.auction(cols["Auction"]); R.nevada(cols["Nevada"])
suns = {
    "Office": R.sun("SunOffice", cols["Office"], 10, 30, 4.0),
    "House": R.sun("SunHouse", cols["House"], -60, 48, 4.5),
    "Stage": R.sun("SunStage", cols["Stage"], -55, 40, 4.5),
    "Nevada": R.sun("SunNevada", cols["Nevada"], 100, 18, 5.0, (1.0, 0.82, 0.62)),
}
car = C.build_car("Car", (0.33, 0.25, 0.08), cols["House"])
car["root"].location = R.HOUSE + Vector((5.1, -2.5, 0)); car["root"].rotation_euler = (0, 0, math.radians(90))
proto = P.cash_pallet("Pallet", cols["Stage"])
proto.location = (0, 0, -100)
P.pallet_field("Block", proto, 50, 45, 20, cols["Stage"], origin=R.STAGE + Vector((-31, 8, 0)))
P.pallet_field("Slab", proto, 50, 5, 20, cols["Stage"], origin=R.STAGE + Vector((-31, 2.4, 0)))
tw, _ = P.typewriter(cols["Office"]); tw.location = (0.35, 1.25, 0.788); tw.rotation_euler = (0, 0, math.pi)
cal, _ = P.flip_calendar(cols["Office"]); cal.location = (1.0, 1.0, 0.788); cal.rotation_euler = (0, 0, math.pi)
pie, _ = P.pie(cols["Office"]); pie.location = (0.4, 1.15, 0.79)

sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 16
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 3
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
sc.render.resolution_x, sc.render.resolution_y = 432, 768


def shot(name, loc, tgt, lens, set_name, sky=0.0, strength=1.0, exposure=0.0):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = "VERTICAL"; cd.sensor_height = 24; cd.clip_end = 3000
    cd.clip_start = 0.02
    cam = bpy.data.objects.new(name, cd); S.link(cam)
    cam.location = loc; cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    for k, s in suns.items():
        s.data.energy = {"Office": 4.0, "House": 4.5, "Stage": 4.5, "Nevada": 5.0}[k] if k == set_name else 0.0
    world.mix.inputs[0].default_value = sky; world.bg.inputs[1].default_value = strength
    sc.view_settings.exposure = exposure
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)


which = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["office", "office2", "house", "stage", "shop", "auction", "nevada"]
if "office" in which:
    shot("office", (0.3, -2.6, 1.6), (0.2, 2.0, 1.0), 20, "Office")
if "office2" in which:
    shot("office2", (2.6, 0.2, 1.5), (-2.0, 1.2, 1.0), 20, "Office")
if "house" in which:
    shot("house", R.HOUSE + Vector((-1.0, -13.0, 1.6)), R.HOUSE + Vector((0.5, 3.0, 1.8)), 24, "House")
if "stage" in which:
    shot("stage", R.STAGE + Vector((-6, -30, 2.0)), R.STAGE + Vector((0, 10, 10)), 22, "Stage")
if "shop" in which:
    shot("shop", R.SHOP + Vector((0.3, -1.6, 1.5)), R.SHOP + Vector((0, 0.5, 1.0)), 26, "Shop", strength=0.2)
if "auction" in which:
    shot("auction", R.AUCTION + Vector((0.6, -5.0, 1.8)), R.AUCTION + Vector((0.5, 4.0, 1.6)), 20, "Auction", strength=0.1)
if "nevada" in which:
    shot("nevada", R.NEVADA + Vector((-0.6, -2.2, 1.4)), R.NEVADA + Vector((0.3, 1.5, 1.0)), 20, "Nevada", sky=1.0)
print("done")
