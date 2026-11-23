"""Check renders of the car on its own: python3 -I test_car.py [views...]"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "quicksand"))
import bpy
from mathutils import Vector
import car as C
import sets as S

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
env = w.node_tree.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(S.A, "hdri", "kloofendal_overcast_puresky.hdr"))
w.node_tree.links.new(env.outputs["Color"], w.node_tree.nodes["Background"].inputs["Color"])
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
S.grid("Ground", 60, 60, 1, 1, S.flat("GroundM", (0.08, 0.08, 0.085), 0.35))
coll = S.collection("Car")
car = C.build_car("Sedan", (0.42, 0.02, 0.025), coll)
xr = C.xray_version(car, "Sedan")
for o in xr:
    o.hide_render = True
conv_coll = S.collection("Conv")
conv = C.build_car("Conv", (0.85, 0.55, 0.04), conv_coll, convertible=True)
conv["root"].location = (0, 6, 0)
cur_mat = C.emissive("Current", (0.6, 0.8, 1.0), 25.0, (0.6, 0.8, 1.0))
net = C.current_network(car, cur_mat, coll)
for o, _ in net:
    o.hide_render = True
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y = 640, 400
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast"
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); S.link(cam); sc.camera = cam
VIEWS = {
    "front34": ((5.2, -4.2, 1.6), (0, 0, 0.7), 35), "side": ((0, -7.5, 1.0), (0, 0, 0.7), 35),
    "rear34": ((-5.5, -3.8, 1.9), (0, 0, 0.75), 35), "top": ((0.01, -1.5, 9), (0, 0, 0.6), 35),
    "wheel": ((1.9, -2.0, 0.5), (1.375, -0.8, 0.33), 40), "interior": ((0.2, 2.6, 1.25), (0.2, 0, 0.85), 30),
    "conv": ((5.2, 1.8, 1.6), (0, 6, 0.7), 35), "xray": ((4.5, -4.5, 2.6), (0, 0, 0.7), 35),
}
out = os.path.join(os.environ["QS_SCRATCH"], "cartest"); os.makedirs(out, exist_ok=True)
for v in sys.argv[1:] or VIEWS:
    loc, tgt, lens = VIEWS[v]
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    xmode = v == "xray"
    for o in xr + [n for n, _ in net]:
        o.hide_render = not xmode
    for k in ("body", "cabin", "rear"):
        car[k].hide_render = xmode
    sc.render.filepath = os.path.join(out, v + ".png")
    bpy.ops.render.render(write_still=True)
print("done")
for o, order in net:
    pts = [Vector(p.co[:3]) for p in o.data.splines[0].points]
    zs = [p.z for p in pts]
    print(f"{o.name:16s} order {order} n={len(pts):3d} z {min(zs):.2f}..{max(zs):.2f} len {sum((b - a).length for a, b in zip(pts, pts[1:])):.2f}")
t = car["wheels"][0]["tire"]
dg = bpy.context.evaluated_depsgraph_get()
me = t.evaluated_get(dg).to_mesh()
print("tire z range", min(v.co.z for v in me.vertices), max(v.co.z for v in me.vertices), "flat", t.data.shape_keys.key_blocks["Flat"].value)
print("antenna tip", car["antenna_tip"])
