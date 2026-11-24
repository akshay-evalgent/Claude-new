"""Build and render the flood short.

usage (with $QS_SCRATCH set, after voiceover.py):
  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES STEP                         every STEP-th frame
  python3 -I scene.py render W H SAMPLES [START END]                   full frames (resumable)
Shared code: the car, storm helpers and rain from ../lightning; the character, posing, material helpers
and assembly from ../quicksand.
"""
import math, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, "..", "lightning"))
sys.path.insert(2, os.path.join(HERE, "..", "quicksand"))
import bpy
from mathutils import Vector

import anim, human
import car as C
import storm as ST
import sets as S
import valley as VL
import vehicles as VH
import shots
from timeline import f, SHOTS, SHOT, END, CUT_FRAMES, FPS

SCRATCH = os.environ["QS_SCRATCH"]

OUTFIT_BOB = [
    ("shoes01/clothes/toigo_ankle_boots_male", "toigo_ankle_boots_male", (0.12, 0.1, 0.09), 0.0),
    ("pants01/clothes/cortu_jeans_shorts", "cortu_jeans_shorts", (0.22, 0.32, 0.5), 0.004),
    ("shirts01/clothes/namuhekam_male_polo_shirt", "namuhekam_male_polo_shirt", (0.75, 0.22, 0.16), 0.008),
]


def isolate_cuts(idblocks, cuts=None):
    """Last key before a cut holds (CONSTANT); keys at shot boundaries get flat handles."""
    cuts = set(cuts or CUT_FRAMES)
    for idb in idblocks:
        ad = getattr(idb, "animation_data", None)
        if not ad or not ad.action:
            continue
        for fc in ST._fcurves(ad.action):
            kps = fc.keyframe_points
            n = len(kps)
            for kp in kps:
                kp.interpolation = "BEZIER"
                kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
            fc.update()
            for i, kp in enumerate(kps):
                fr = kp.co.x
                nxt = kps[i + 1].co.x if i + 1 < n else None
                prv = kps[i - 1].co.x if i > 0 else None
                cut_after = nxt is not None and any(fr < c <= nxt for c in cuts)
                cut_before = prv is not None and any(prv < c <= fr for c in cuts)
                if cut_after:
                    kp.interpolation = "CONSTANT"
                if cut_after or cut_before:
                    kp.handle_left_type = kp.handle_right_type = "FREE"
                    dl = (fr - prv) / 3 if prv is not None else 1
                    dr = (nxt - fr) / 3 if nxt is not None else 1
                    kp.handle_left = (fr - dl, kp.co.y)
                    kp.handle_right = (fr + dr, kp.co.y)
            fc.update()


def air_box(car, mat, coll):
    out = []
    for key in ("body", "cabin"):
        src = car[key]
        me = src.data.copy(); me.materials.clear(); me.materials.append(mat)
        me.polygons.foreach_set("material_index", [0] * len(me.polygons))
        o = S.new_obj(src.name + "_Air", me, coll); o.parent = src.parent
        o.matrix_parent_inverse = src.matrix_parent_inverse.copy()
        o.scale = (0.985, 0.97, 0.985); o.location = (0, 0, 0.01)
        o.visible_shadow = False
        out.append(o)
    return out


def ducks(level, coll):
    me = VL.duck_mesh()
    rnd = random.Random(4)
    out = []
    a, _ = shots.ends("scenic"); _, b = shots.ends("scenic_wide")
    for i, (dx, dy, yaw) in enumerate(((2.6, 1.4, -100), (3.3, -0.4, -80), (-2.3, 1.7, -60), (2.9, 2.6, -110), (-1.7, -2.5, -70))):
        o = S.new_obj(f"Duck{i}", me, coll); o.parent = level
        for fr in (a, b):
            tt = (fr - a) / FPS
            o.location = (1.5 + 0.12 * tt + dx + 0.05 * tt * math.sin(i), -78.0 - 0.55 * tt + dy - 0.06 * tt, 0.0)
            o.rotation_euler = (0, 0, math.radians(yaw + 4 * tt))
            o.keyframe_insert("location", frame=fr); o.keyframe_insert("rotation_euler", frame=fr)
        ST.set_interp(o, "LINEAR")
        for fc in ST._fcurves(o.animation_data.action):
            if fc.data_path == "location" and fc.array_index == 2:
                m = fc.modifiers.new("NOISE"); m.scale = 10; m.strength = 0.03; m.phase = rnd.uniform(0, 50)
            if fc.data_path == "rotation_euler" and fc.array_index == 2:
                m = fc.modifiers.new("NOISE"); m.scale = 30; m.strength = 0.25; m.phase = rnd.uniform(0, 50)
        out.append(o)
    return out


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, f(END) - 1
    world = VL.World()
    w_socks = []
    val = VL.Valley(w_socks)
    props = S.collection("Props")
    gx, gy = -15.5, 4.75
    VL.depth_gauge(props, gx, gy)
    shots.GAUGE[0] = (gx, gy, VL.ground(gx, gy))
    VL.warning_sign(props, "FloodSign", -22.0, -4.9, [("ROAD", 0.17), ("FLOODED", 0.13)], -90)
    det = VL.warning_sign(props, "Detour", -75.0, 5.3, [("DETOUR", 0.17)], -90, col=(0.9, 0.36, 0.02), diamond=False,
                          h=1.8, w=1.05)
    VL.detour_arrow(props, det, 1.62)
    VL.poles(props); VL.trees(props); VL.grass(props)
    debris = VL.debris(props, val.level, n=16)
    fx = S.collection("FX")

    hero_coll = S.collection("Sedan")
    car = C.build_car("Sedan", (0.42, 0.02, 0.025), hero_coll)
    xr = C.xray_version(car, "Sedan")
    air_mat, air_k = VL.air_material()
    air = air_box(car, air_mat, hero_coll)
    check = C.emissive("CheckEngine", (1.0, 0.45, 0.02), 0.0, (0.3, 0.15, 0.0))
    ce = S.box("CheckEngineLamp", (-0.006, -0.018, -0.012), (0.006, 0.018, 0.012), check, hero_coll, 0.0)
    ce.parent = car["root"]; ce.location = (0.672, C.DRIVER_Y - 0.08, 0.86)
    conv_coll = S.collection("Convertible")
    conv = C.build_car("Conv", (0.85, 0.55, 0.04), conv_coll, convertible=True)
    suv = VH.build_suv("SUV", (0.1, 0.14, 0.19), S.collection("SUV"))
    truck = VH.build_pickup("Pickup", (0.5, 0.51, 0.53), S.collection("Pickup"))
    bpy.context.view_layer.update()
    for c in (car, conv, suv, truck):           # no glare disks from the dash/tail lamps in the glass
        for lamp in c["lamps"]:
            if lamp.data.type == "POINT":
                lamp.visible_glossy = False

    arrow_mat = ST._emit("Arrow", (1.0, 0.78, 0.2), 7.0)
    up_arrows, side_arrows = [], []
    for i, dx in enumerate((-0.75, 0.3, 1.95)):
        o = VL.arrow(f"UpArrow{i}", fx, arrow_mat, length=0.62, radius=0.04)
        o.parent = car["root"]; o.location = (dx, -0.55, 0.01)
        up_arrows.append(o)
    for i, (dx, dz) in enumerate(((-1.3, 0.12), (0.1, 0.26), (1.4, 0.16))):
        o = VL.arrow(f"SideArrow{i}", fx, arrow_mat, length=1.3, radius=0.05)
        o.location = (VL.CAR_X + dx, VL.LANE_Y + 2.45, shots.ROAD0 + dz)
        o.rotation_euler = (math.radians(90), 0, 0)          # pointing -Y (with the current)
        side_arrows.append(o)

    spray_mat = VL.spray_material()
    duck_objs = ducks(val.level, fx)

    ch_data = human.build_human()
    for o in ch_data["clothes"] + [ch_data["body"]]:
        for m in o.data.materials:
            human.add_wetness(m)
    anchor = bpy.data.objects.new("DriverAnchor", None); S.link(anchor)
    ch_data["arm"].parent = anchor
    ch = anim.Character(ch_data)
    bob = human.build_human(name="Bob", outfit=OUTFIT_BOB, skin="middleage_caucasian_male", hair="short04",
                            hair_tint=(0.09, 0.08, 0.07),
                            macro={"universal-male-young-averagemuscle-maxweight": 0.6,
                                   "universal-male-old-averagemuscle-maxweight": 0.4,
                                   "caucasian-male-young": 0.6, "caucasian-male-old": 0.4})
    anchor2 = bpy.data.objects.new("BobAnchor", None); S.link(anchor2)
    bob["arm"].parent = anchor2
    ch2 = anim.Character(bob)

    rig = shots.Rig(ch=ch, ch2=ch2, ch_data=ch_data, bob=bob, car=car, conv=conv, suv=suv, truck=truck,
                    world=world, valley=val, anchor=anchor, anchor2=anchor2, fx=fx, spray_mat=spray_mat,
                    up_arrows=up_arrows, side_arrows=side_arrows, air_k=air_k.outputs[0], check_engine=check)
    shots.perform(rig)
    cams = shots.cameras(rig)

    rain_mat, rain_s, rain_map = ST.rain_material()
    rain_coll = S.collection("Rain")
    rain = {}
    for name, t0, t1, st in SHOTS:
        if st == "evening":
            continue
        rain[name] = ST.rain_for_camera(cams[name], rain_mat, rain_coll, near=name not in ("stall_dash", "murky"))
    shots.rain_visibility(rain)

    main = [o for k, o in val.main.items() if k != "water"]
    cut = {k: [o for kk, o in d.items() if kk != "water"] for k, d in val.cuts.items()}
    paint = [car["body"], car["cabin"], car["rear"]]
    groups = {
        "ground": (main, lambda n, st: st in ("storm", "evening")),
        "flood": ([val.main["water"]], lambda n, st: st == "storm"),
        "calm": ([val.calm], lambda n, st: st == "evening"),
        "cutY": (cut["Y"] + [val.cuts["Y"]["water"]], lambda n, st: st in ("cutY", "xray") and n != "washout_cut"),
        "cutX": (cut["X"] + [val.cuts["X"]["water"]], lambda n, st: st == "cutX"),
        "cutW": (cut["W"] + [val.cuts["W"]["water"]] + val.slabs, lambda n, st: n == "washout_cut"),
        "paint": (paint, lambda n, st: st != "xray"),
        "xray": (xr + air, lambda n, st: st == "xray"),
        "up": (up_arrows, lambda n, st: n in ("lift_arrows", "lift_close")),
        "side": (side_arrows, lambda n, st: n == "current_cut"),
        "ducks": (duck_objs, lambda n, st: st == "evening"),
        "debris": (debris, lambda n, st: st in ("storm", "cutY", "cutX", "xray")),
    }
    shots.visibility(groups)
    shots.constant_hide(list(bpy.data.objects))

    keys = [ch.arm, ch2.arm] + [o.data.shape_keys for o in [ch_data["body"]] + ch_data["face_proxies"]] + \
           [o.data.shape_keys for o in [bob["body"]] + bob["face_proxies"]]
    isolate_cuts(keys)
    isolate_cuts([anchor, anchor2])
    for idb in [world.w.node_tree, world.sun.data, world.storm_sun.data, air_mat.node_tree]:
        ST.set_interp(idb, "CONSTANT")
    ST.set_interp(air_mat.node_tree, "LINEAR")
    for o in ch_data["clothes"] + [ch_data["body"]]:
        for m in o.data.materials:
            ST.set_interp(m.node_tree, "CONSTANT", 'nodes["WetLevel"]')
    ST.set_interp(rain_mat.node_tree, "LINEAR", 'nodes["Mapping"]')
    ST.set_interp(sc, "CONSTANT", "view_settings")
    for o in [val.level]:
        isolate_cuts([o])
    for sock in w_socks:
        sock.default_value = 0.0; sock.keyframe_insert("default_value", frame=1)
        sock.default_value = 40.0; sock.keyframe_insert("default_value", frame=int(END * FPS) + 1)
        ST.set_interp(sock.id_data, "LINEAR", sock.path_from_id().rsplit(".", 1)[0])
    sc.frame_set(1)
    return rig


def compositor():
    sc = bpy.context.scene
    vl = sc.view_layers[0]
    vl.use_pass_mist = True
    sc.world.mist_settings.start = 25.0
    sc.world.mist_settings.depth = 450.0
    sc.world.mist_settings.falloff = "LINEAR"
    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    rl = ng.nodes.new("CompositorNodeRLayers")
    # fog: distant ground fades into the haze (the sky itself is left alone)
    sky = ng.nodes.new("ShaderNodeMath"); sky.operation = "LESS_THAN"; sky.inputs[1].default_value = 0.999
    ng.links.new(rl.outputs["Mist"], sky.inputs[0])
    amt = ng.nodes.new("ShaderNodeMath"); amt.operation = "MULTIPLY"; amt.name = "FogAmount"
    ng.links.new(rl.outputs["Mist"], amt.inputs[0]); amt.inputs[1].default_value = 0.55
    fac = ng.nodes.new("ShaderNodeMath"); fac.operation = "MULTIPLY"
    ng.links.new(amt.outputs[0], fac.inputs[0]); ng.links.new(sky.outputs[0], fac.inputs[1])
    mix = ng.nodes.new("ShaderNodeMixRGB"); mix.name = "Fog"
    ng.links.new(fac.outputs[0], mix.inputs[0]); ng.links.new(rl.outputs["Image"], mix.inputs[1])
    mix.inputs[2].default_value = (0.34, 0.36, 0.39, 1)
    gl = ng.nodes.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Bloom"
    gl.inputs["Threshold"].default_value = 2.5
    gl.inputs["Strength"].default_value = 0.3
    gl.inputs["Size"].default_value = 0.6
    out = ng.nodes.new("NodeGroupOutput")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    ng.links.new(mix.outputs[0], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], out.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
    if hasattr(sc.render, "compositor_device"):
        sc.render.compositor_device = "CPU"
    # per set: haze amount and colour
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        amt.inputs[1].default_value = {"evening": 0.3}.get(st, 0.55)
        amt.inputs[1].keyframe_insert("default_value", frame=fr)
        mix.inputs[2].default_value = (0.62, 0.47, 0.34, 1) if st == "evening" else (0.34, 0.36, 0.39, 1)
        mix.inputs[2].keyframe_insert("default_value", frame=fr)
    ST.set_interp(ng, "CONSTANT")


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
    sc.cycles.transparent_max_bounces = 64
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
    compositor()


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
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "flood.blend"))
    print("done")


if __name__ == "__main__":
    main()
