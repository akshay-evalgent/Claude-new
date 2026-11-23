"""Build and render the lightning short.

usage (with $QS_SCRATCH set, after fetch_assets.py and voiceover.py):
  python3 -I scene.py stills <shot|frame> ... [--res W H --samples N]   check frames
  python3 -I scene.py preview W H SAMPLES STEP                         every STEP-th frame
  python3 -I scene.py render W H SAMPLES [START END]                   full frames (resumable)
Shared code (character, posing, materials, assembly) lives in ../quicksand.
"""
import math, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(HERE, "..", "quicksand"))
import bpy
from mathutils import Vector

import anim, human
import car as C
import storm as ST
import sets as S
import shots
from timeline import f, SHOTS, SHOT, END, CUT_FRAMES, FPS

SCRATCH = os.environ["QS_SCRATCH"]


def strike_bolt(top, tip, seed):
    """Main channel from the sky to `tip`, extra-detailed over its last 14 m (seen up close)."""
    rnd = random.Random(seed)
    tip = Vector(tip)
    mid = tip + Vector((rnd.uniform(-4, -2), rnd.uniform(-3, -1), 14.0))
    upper = ST.bolt_geometry(top, mid, seed, levels=8, jag=0.15, branches=7)
    lower = ST._displace(mid, tip, 7, 0.13, rnd)
    main = upper[0][0] + lower[1:]
    geom = [(main, 1.0)] + upper[1:]
    for i in range(3):                        # small forks near the car
        k = rnd.randint(len(upper[0][0]) + 20, len(main) - 40)
        p0 = main[k]
        e = p0 + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), -1.0)).normalized() * rnd.uniform(1.5, 3.5)
        geom.append((ST._displace(p0, e, 5, 0.18, rnd), 0.22))
    return geom


def danger_paths(conv, mat, coll, seed=7):
    """Red current straight through a convertible's cabin (no metal roof to carry it)."""
    rnd = random.Random(seed)
    top = Vector((-0.3, 0.0, C.cab_top(-0.3) + 0.01))
    out = []
    routes = [
        [top, Vector((-0.25, 0.1, 1.05)), Vector((-0.2, 0.37, 0.62)), Vector((-0.15, 0.4, 0.3)), Vector((-0.1, 0.42, 0.0))],
        [top, Vector((-0.3, -0.1, 1.0)), Vector((-0.2, -0.37, 0.6)), Vector((-0.2, -0.45, 0.3)), Vector((-0.2, -0.5, 0.0))],
        [top, Vector((-0.6, 0.0, 0.95)), Vector((-1.0, 0.1, 0.55)), Vector((-1.05, 0.2, 0.28)), Vector((-1.1, 0.25, 0.0))],
    ]
    for i, way in enumerate(routes):
        pts = [way[0]]
        for a, b in zip(way[:-1], way[1:]):
            pts += ST._displace(a, b, 4, 0.12, rnd)[1:]
        out.append((C.poly_curve(f"Danger{i}", pts, mat, coll, conv["root"], 0.008), 0 if i == 0 else 1))
        end = way[-1]
        for b in range(3):
            ang = rnd.uniform(0, 6.28); p = end.copy(); gp = [p.copy()]
            for _ in range(6):
                ang += rnd.uniform(-0.6, 0.6)
                p = p + Vector((math.cos(ang), math.sin(ang), 0)) * rnd.uniform(0.06, 0.14); p.z = 0.004
                gp.append(p.copy())
            out.append((C.poly_curve(f"DangerG{i}_{b}", gp, mat, coll, conv["root"], 0.004), 2))
    return out


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


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, f(END) - 1
    world = ST.World()
    w_sockets = []
    road = ST.road_set(w_sockets)
    fx = S.collection("FX")

    sedan_coll = S.collection("Sedan")
    car = C.build_car("Sedan", (0.42, 0.02, 0.025), sedan_coll)
    car["root"].location = ST.CAR_P
    xr = C.xray_version(car, "Sedan")
    conv_coll = S.collection("Convertible")
    conv = C.build_car("Conv", (0.85, 0.55, 0.04), conv_coll, convertible=True)
    conv["root"].location = ST.CONV_P
    cxr = C.xray_version(conv, "Conv")
    bpy.context.view_layer.update()

    cur_mat = C.emissive("Current", (0.6, 0.8, 1.0), 25.0, (0.6, 0.8, 1.0))
    cur_s = cur_mat.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    net = C.current_network(car, cur_mat, fx)
    danger = C.emissive("Danger", (1.0, 0.12, 0.05), 20.0, (1.0, 0.1, 0.05))
    danger_s = danger.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    conv_net = danger_paths(conv, danger, fx)

    core, core_s, halo, halo_s = ST.bolt_materials()
    tip_w = ST.CAR_P + car["antenna_tip"]
    conv_top = ST.CONV_P + Vector((-0.3, 0.0, C.cab_top(-0.3) + 0.01))
    hero_top, hero_end = ST.CAR_P + Vector((30, 190, 420)), ST.CAR_P + Vector((90, 300, 0))
    far1_end = Vector((shots.DRIVE_X0 + 11 * 0.6 + 260, 140, 0))
    far2_end = Vector((shots.DRIVE_X0 + 11 * 1.4 - 320, 70, 0))
    bolts = {
        "far1": ST.bolt_object("BoltFar1", ST.bolt_geometry(far1_end + Vector((40, 30, 430)), far1_end, 11), 0.6, core, halo, fx),
        "far2": ST.bolt_object("BoltFar2", ST.bolt_geometry(far2_end + Vector((-40, 20, 430)), far2_end, 12), 0.6, core, halo, fx),
        "hero": ST.bolt_object("BoltHero", ST.bolt_geometry(hero_top, hero_end, 13, levels=9), 0.5, core, halo, fx),
        "strike": ST.bolt_object("BoltStrike", strike_bolt(ST.CAR_P + Vector((-70, -45, 430)), tip_w, 14), 0.03, core, halo, fx),
        "conv": ST.bolt_object("BoltConv", strike_bolt(ST.CONV_P + Vector((-60, -40, 430)), conv_top, 15), 0.03, core, halo, fx),
    }

    def point(name, loc, energy=0.0, radius=0.3):
        o = bpy.data.objects.new(name, bpy.data.lights.new(name, "POINT")); S.link(o, fx)
        o.data.energy = energy; o.data.shadow_soft_size = radius; o.data.color = (0.8, 0.86, 1.0)
        o.location = loc
        return o
    strike_light = point("StrikeLight", tip_w + Vector((0.2, 0, 0.6)))
    conv_light = point("ConvStrikeLight", conv_top + Vector((0.2, 0, 0.6)))
    clouds, cloud_glow = ST.cloud_ceiling([])
    sun_coll = ST.sun_set(w_sockets)

    spark_mat = ST.spark_material(); smoke_mat = ST.smoke_material()
    rubber_mat = S.flat("RubberBits", (0.02, 0.02, 0.02), 0.8)
    glint_mat = ST._emit("Glint", (0.85, 0.92, 1.0), 6.0)
    shards = ST.shatter(car["rear"])

    ch_data = human.build_human()
    anchor = bpy.data.objects.new("DriverAnchor", None); S.link(anchor)
    anchor.location = ST.CAR_P
    ch_data["arm"].parent = anchor
    ch = anim.Character(ch_data)

    rain_mat, rain_s, rain_map = ST.rain_material()
    rig = shots.Rig(ch=ch, car=car, conv=conv, world=world, anchor=anchor, bolts=bolts, bolt_core=core_s,
                    bolt_halo=halo_s, net=net, conv_net=conv_net, cur_strength=cur_s, danger_strength=danger_s,
                    strike_light=strike_light, conv_light=conv_light, spark_mat=spark_mat, smoke_mat=smoke_mat,
                    rubber_mat=rubber_mat, glint_mat=glint_mat, fx=fx, shards=shards,
                    fl_paths={"CurTire1"} | {f"CurGround1_{i}" for i in range(4)})
    rig.flash_targets = [(world.flash.outputs[0], "socket", 0.0, 1.0), (world.flash_sun.data, "energy", 0.0, 9.0),
                         (rain_s, "socket", 0.35, 1.6), (cloud_glow.data, "energy", 0.0, 3.0e5)]
    shots.C_TIP[0] = car["antenna_tip"]
    main = [Vector(p.co[:3]) for p in bolts["strike"][0].data.splines[0].points]
    shots.MACRO_PT[0] = min(main, key=lambda q: abs(q.z - (tip_w.z + 2.6)) + 10 * ((q - tip_w).xy.length > 4))
    shots.HERO[:] = [hero_top, hero_end]
    shots.perform(rig)
    cams = shots.cameras(rig)

    rain_coll = S.collection("Rain")
    rain = {}
    for name, t0, t1, st in SHOTS:
        if st in ("dawn", "sun"):
            continue
        rain[name] = ST.rain_for_camera(cams[name], rain_mat, rain_coll, near=name not in ("dash",))
    shots.rain_visibility(cams, rain)

    special = {car["rear"]} | set(xr) | set(cxr) | {o for o, _ in net} | {o for o, _ in conv_net} | set(shards)
    sedan_paint = [car["body"], car["cabin"]]
    conv_paint = [conv["body"], conv["cabin"], conv["rear"]]
    groups = {
        "env": [o for o in road.all_objects],
        "sedan_paint": sedan_paint,
        "sedan_xray": xr,
        "sedan_rest": [o for o in sedan_coll.all_objects if o not in special and o not in sedan_paint],
        "conv_paint": conv_paint,
        "conv_xray": cxr,
        "conv_rest": [o for o in conv_coll.all_objects if o not in special and o not in conv_paint],
        "driver": list(ch_data["parts"]),
        "sun": [o for o in sun_coll.all_objects],
        "clouds": [o for o in clouds.all_objects],
    }
    shots.visibility(groups)
    # intact rear window: storm/dawn paint shots before it shatters
    burst = shots.ends("glass")[0] + 3
    for name, t0, t1, st in SHOTS:
        fr = f(t0)
        car["rear"].hide_render = not (st == "storm" and fr < burst)
        car["rear"].keyframe_insert("hide_render", frame=fr)
    car["rear"].hide_render = True; car["rear"].keyframe_insert("hide_render", frame=burst)
    shots.constant_hide(list(bpy.data.objects))

    keys = [ch.arm] + [o.data.shape_keys for o in [ch_data["body"]] + ch_data["face_proxies"]]
    isolate_cuts(keys)
    # per-frame flicker values and switches hold between keys
    for idb in [world.w.node_tree, world.flash_sun.data, world.dawn_sun.data, core.node_tree, halo.node_tree,
                cur_mat.node_tree, danger.node_tree, cloud_glow.data]:
        ST.set_interp(idb, "CONSTANT")
    ST.set_interp(rain_mat.node_tree, "CONSTANT", 'nodes["Emission"]')
    ST.set_interp(rain_mat.node_tree, "LINEAR", 'nodes["Mapping"]')
    ST.set_interp(sc, "CONSTANT", "view_settings")
    for sock in w_sockets:                  # puddle shimmer, sun granulation
        sock.default_value = 0.0; sock.keyframe_insert("default_value", frame=1)
        sock.default_value = 40.0; sock.keyframe_insert("default_value", frame=int(END * FPS) + 1)
        ST.set_interp(sock.id_data, "LINEAR", sock.path_from_id().rsplit(".", 1)[0])
    sc.frame_set(1)
    return rig


def compositor():
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
    rl = ng.nodes.new("CompositorNodeRLayers")
    gl = ng.nodes.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Bloom"
    gl.inputs["Threshold"].default_value = 2.5
    gl.inputs["Strength"].default_value = 0.35
    gl.inputs["Size"].default_value = 0.6
    out = ng.nodes.new("NodeGroupOutput")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    ng.links.new(gl.outputs["Image"], out.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
    if hasattr(sc.render, "compositor_device"):
        sc.render.compositor_device = "CPU"


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
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "lightning.blend"))
    print("done")


if __name__ == "__main__":
    main()
