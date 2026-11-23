"""Storm set and effects for the lightning short: a wet two-lane country road at stormy dusk (and the
same road at dawn), fields, poles and wires, tree lines, camera-attached rain, branching lightning
bolts, a cloud ceiling, sparks, smoke, glass shards, roof splashes and the sun close-up.

World layout (metres): road along X through the origin; the sedan parks on the right shoulder at
CAR_P facing +X; the convertible has its own stretch of road at CONV_P; the sun set is far away at SUN_P.
"""
import math, os, random
import bmesh
import bpy
from mathutils import Matrix, Vector

import sets as S

CAR_P = Vector((0.0, -4.35, 0.0))
CONV_P = Vector((90.0, -4.35, 0.0))
SUN_P = Vector((7000.0, 0.0, 400.0))
ROAD_HALF = 3.6
SHOULDER = 5.6
FPS = 24


# ----------------------------------------------------------------------------- keying helpers
def key_value(sock, frame, value, interp="LINEAR"):
    sock.default_value = value
    sock.keyframe_insert("default_value", frame=frame)


def key_prop(idblock, path, frame, value, index=-1):
    if index >= 0:
        getattr(idblock, path)[index] = value
    else:
        setattr(idblock, path, value)
    idblock.keyframe_insert(path, frame=frame, index=index)


def set_interp(idblock, kind="LINEAR", data_path_prefix=None):
    ad = idblock.animation_data
    if not ad or not ad.action:
        return
    for fc in _fcurves(ad.action):
        if data_path_prefix is None or fc.data_path.startswith(data_path_prefix):
            for kp in fc.keyframe_points:
                kp.interpolation = kind


def _fcurves(action):
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


# ----------------------------------------------------------------------------- world + lights
def _sun_azimuth(img):
    """Azimuth (deg, from +X toward +Y) of the brightest spot of an equirect image (default mapping)."""
    import numpy as np
    w, h = img.size
    px = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(px)
    lum = px.reshape(h, w, 4)[:, :, :3].sum(axis=2)
    yy, xx = np.unravel_index(np.argmax(lum), lum.shape)
    u = (xx + 0.5) / w
    theta = 2 * math.pi * (u - 0.5)
    return math.degrees(math.pi - theta)


class World:
    """Storm sky and dawn sky blended by a keyable DawnMix; lightning flashes via Flash."""

    def __init__(self):
        sc = bpy.context.scene
        w = bpy.data.worlds.new("Sky"); sc.world = w; w.use_nodes = True
        self.w = w
        nt = w.node_tree
        bg = nt.nodes["Background"]
        tc = nt.nodes.new("ShaderNodeTexCoord")

        def env(name, rot_deg):
            mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, math.radians(rot_deg))
            nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
            e = nt.nodes.new("ShaderNodeTexEnvironment")
            e.image = bpy.data.images.load(os.path.join(S.A, "hdri", name + ".hdr"), check_existing=True)
            nt.links.new(mp.outputs["Vector"], e.inputs["Vector"])
            return e

        storm = env("kloofendal_overcast_puresky", 0.0)
        dawn_img = bpy.data.images.load(os.path.join(S.A, "hdri", "qwantani_dawn_puresky.hdr"), check_existing=True)
        self.dawn_sun_az = 150.0                       # where we want the dawn glow (behind the car, camera side)
        dawn = env("qwantani_dawn_puresky", _sun_azimuth(dawn_img) - self.dawn_sun_az)
        storm_col = S._mix(nt, 1.0, storm.outputs["Color"], (0.30, 0.36, 0.5), blend="MULTIPLY")
        self.dawn_mix = nt.nodes.new("ShaderNodeValue"); self.dawn_mix.label = "DawnMix"
        self.dawn_mix.outputs[0].default_value = 0.0
        dawn_col = S._mix(nt, 1.0, dawn.outputs["Color"], (1.0, 0.86, 0.72), blend="MULTIPLY")
        col = S._mix(nt, self.dawn_mix.outputs[0], storm_col, dawn_col)
        self.flash = nt.nodes.new("ShaderNodeValue"); self.flash.label = "Flash"
        self.flash.outputs[0].default_value = 0.0
        self.strength = nt.nodes.new("ShaderNodeValue"); self.strength.label = "SkyStrength"
        self.strength.outputs[0].default_value = 0.55
        boost = S._math(nt, "ADD", 1.0, S._math(nt, "MULTIPLY", self.flash.outputs[0], 5.0))
        nt.links.new(col, bg.inputs["Color"])
        nt.links.new(S._math(nt, "MULTIPLY", self.strength.outputs[0], boost), bg.inputs["Strength"])
        # lamps
        self.flash_sun = self._sun("FlashSun", (0.78, 0.85, 1.0), 0.0, az=40, el=55, angle=12)
        self.dawn_sun = self._sun("DawnSun", (1.0, 0.72, 0.48), 0.0, az=self.dawn_sun_az, el=9, angle=1.5)

    def _sun(self, name, col, energy, az, el, angle):
        o = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); S.link(o)
        o.data.energy = energy; o.data.color = col; o.data.angle = math.radians(angle)
        d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                    math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
        o.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        return o

    def set_mode(self, frame, dawn):
        key_value(self.dawn_mix.outputs[0], frame, 1.0 if dawn else 0.0)
        key_value(self.strength.outputs[0], frame, 1.0 if dawn else 0.55)
        self.dawn_sun.data.energy = 6.0 if dawn else 0.0
        self.dawn_sun.data.keyframe_insert("energy", frame=frame)


# ----------------------------------------------------------------------------- materials
def wet_ground(name, tex, size, darken=0.55, rough_mul=0.4, puddles=0.0, ripple_w=None):
    """Wet PBR ground: darker, glossier, optional mirror-like puddles with rain shimmer."""
    m, nt, b = S._new_mat(name)
    d = os.path.join(S.A, "tex", tex)
    mp, tc = S._mapping(nt, size)
    diff = S._tex(nt, os.path.join(d, "diff.jpg"), proj="FLAT"); nt.links.new(mp.outputs[0], diff.inputs[0])
    rough = S._tex(nt, os.path.join(d, "rough.jpg"), True); nt.links.new(mp.outputs[0], rough.inputs[0])
    nor = S._tex(nt, os.path.join(d, "nor.jpg"), True); nt.links.new(mp.outputs[0], nor.inputs[0])
    col = S._mix(nt, 1.0, diff.outputs["Color"], (darken,) * 3, blend="MULTIPLY")
    r = S._math(nt, "MULTIPLY", rough.outputs["Color"], rough_mul)
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nor.outputs["Color"], nm.inputs["Color"])
    normal = nm.outputs["Normal"]
    if puddles > 0:
        pm = S._noise(nt, tc.outputs["Object"], 0.18, 4, 0.55)
        mask = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", pm, 0.62 - puddles * 0.1), 14.0, clamp=True)
        col = S._mix(nt, mask, col, (0.012, 0.012, 0.014))
        r = S._mix(nt, mask, r, 0.02, kind="FLOAT")
        # rain shimmer on the puddles (4D noise, W animated)
        n4 = nt.nodes.new("ShaderNodeTexNoise"); n4.noise_dimensions = "4D"
        n4.inputs["Scale"].default_value = 55; n4.inputs["Detail"].default_value = 1.0
        nt.links.new(tc.outputs["Object"], n4.inputs["Vector"])
        if ripple_w is not None:
            ripple_w.append(n4.inputs["W"])
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25
        bump.inputs["Distance"].default_value = 0.002
        nt.links.new(n4.outputs["Fac"], bump.inputs["Height"])
        normal = S._mix(nt, mask, normal, bump.outputs["Normal"], kind="VECTOR")
    nt.links.new(col, b.inputs["Base Color"]); nt.links.new(r, b.inputs["Roughness"]); nt.links.new(normal, b.inputs["Normal"])
    return m


def foliage_material(name, col=(0.03, 0.05, 0.025)):
    m, nt, b = S._new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = S._noise(nt, tc.outputs["Object"], 3.0, 4, 0.6)
    nt.links.new(S._ramp(nt, n, [(0.3, tuple(c * 0.6 for c in col)), (0.7, tuple(c * 1.6 for c in col))]), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.85
    return m


# ----------------------------------------------------------------------------- road set
def road_set(ripple_w):
    coll = S.collection("Road")
    asphalt = wet_ground("WetAsphalt", "asphalt_02", 3.0, 0.5, 0.32, puddles=0.6, ripple_w=ripple_w)
    S.grid("Road", 1200, ROAD_HALF * 2, 1, 1, asphalt, coll, z=0.0)
    gravel = wet_ground("WetGravel", "gravel_road", 2.0, 0.55, 0.5)
    for side in (1, -1):
        g = S.grid(f"Shoulder{side}", 1200, SHOULDER - ROAD_HALF, 1, 1, gravel, coll, z=-0.01)
        g.location.y = side * (ROAD_HALF + SHOULDER) / 2
    grass = wet_ground("WetGrass", "leafy_grass", 2.5, 0.28, 1.0)
    S.grid("Fields", 3000, 3000, 1, 1, grass, coll, z=-0.04)
    # painted lines (slightly worn, wet)
    yellow = S.flat("LineYellow", (0.55, 0.38, 0.02), 0.3)
    white = S.flat("LineWhite", (0.7, 0.7, 0.68), 0.3)
    for y in (0.09, -0.09):
        S.grid(f"CentreLine{y}", 1200, 0.1, 1, 1, yellow, coll, z=0.003).location.y = y
    for y in (ROAD_HALF - 0.15, -(ROAD_HALF - 0.15)):
        S.grid(f"EdgeLine{y}", 1200, 0.12, 1, 1, white, coll, z=0.003).location.y = y
    poles(coll)
    trees(coll)
    grass_clumps(coll)
    return coll


def poles(coll, y=8.5, spacing=48.0, x0=-480, x1=480):
    wood = S.flat("PoleWood", (0.09, 0.065, 0.045), 0.8)
    ceramic = S.flat("Insulator", (0.25, 0.3, 0.28), 0.2)
    wire_m = S.flat("Wire", (0.01, 0.01, 0.01), 0.4)
    proto = S.collection("PoleProto")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.15, radius2=0.12, depth=10.5)
    for v in bm.verts:
        v.co.z += 5.25
    me = bpy.data.meshes.new("Pole"); bm.to_mesh(me); bm.free(); me.materials.append(wood)
    for p in me.polygons:
        p.use_smooth = True
    S.new_obj("Pole", me, proto)
    S.box("Crossarm", (-0.06, -1.25, 9.55), (0.06, 1.25, 9.67), wood, proto)
    tops = []
    for yy in (-1.05, 0.0, 1.05):
        S.box(f"Ins{yy}", (-0.04, yy - 0.04, 9.67), (0.04, yy + 0.04, 9.85), ceramic, proto, 0.01)
        tops.append(yy)
    proto.hide_render = False
    bpy.context.view_layer.layer_collection.children[proto.name].exclude = True
    xs = [x0 + i * spacing for i in range(int((x1 - x0) / spacing) + 1)]
    for x in xs:
        inst = bpy.data.objects.new(f"PoleInst{x}", None); S.link(inst, coll)
        inst.instance_type = "COLLECTION"; inst.instance_collection = proto
        inst.location = (x, y, 0); inst.rotation_euler = (0, 0, random.Random(int(x)).uniform(-0.04, 0.04))
    # sagging wires between neighbours
    cu = bpy.data.curves.new("Wires", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.009
    for a, b in zip(xs[:-1], xs[1:]):
        for yy in tops:
            sp = cu.splines.new("POLY"); n = 16; sp.points.add(n)
            for i in range(n + 1):
                t = i / n
                sp.points[i].co = (a + (b - a) * t, y + yy, 9.86 - 0.9 * 4 * t * (1 - t), 1)
    cu.materials.append(wire_m)
    S.new_obj("Wires", cu, coll)


def _tree_mesh(name, seed, mat_leaf, mat_bark):
    rnd = random.Random(seed)
    bm = bmesh.new()
    h = rnd.uniform(6, 11)
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.25, radius2=0.12, depth=h * 0.6)
    for v in r["verts"]:
        v.co.z += h * 0.3
    trunk_faces = len(bm.faces)
    for i in range(rnd.randint(5, 8)):
        rr = rnd.uniform(1.4, 2.6) * h / 9
        c = Vector((rnd.uniform(-1.2, 1.2), rnd.uniform(-1.2, 1.2), h * rnd.uniform(0.55, 0.95)))
        s = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=rr)
        for v in s["verts"]:
            n = v.co.normalized()
            v.co = c + v.co * (1 + 0.25 * math.sin(n.x * 7 + seed) * math.cos(n.y * 5 + i))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat_bark); me.materials.append(mat_leaf)
    idx = [0 if i < trunk_faces else 1 for i in range(len(me.polygons))]
    me.polygons.foreach_set("material_index", idx)
    for p in me.polygons:
        p.use_smooth = True
    return me


def trees(coll):
    leaf = foliage_material("Leaves")
    bark = S.flat("Bark", (0.04, 0.03, 0.025), 0.9)
    protos = []
    pc = S.collection("TreeProto")
    for i in range(5):
        o = S.new_obj(f"TreeProto{i}", _tree_mesh(f"Tree{i}", 11 + i, leaf, bark), pc)
        protos.append(o)
    bpy.context.view_layer.layer_collection.children[pc.name].exclude = True
    rnd = random.Random(5)
    bands = [(55, 85, 70), (-95, -60, 70), (140, 220, 60), (-260, -150, 60)]
    k = 0
    for y0, y1, n in bands:
        for i in range(n):
            x = rnd.uniform(-500, 500)
            if abs(y0) < 100 and -60 < x < 160 and rnd.random() < 0.5:
                continue
            for j in range(rnd.randint(1, 4)):
                o = bpy.data.objects.new(f"Tree{k}", rnd.choice(protos).data); S.link(o, coll); k += 1
                o.location = (x + rnd.uniform(-6, 6), rnd.uniform(y0, y1), -0.05)
                o.rotation_euler = (0, 0, rnd.uniform(0, 6.28)); o.scale = (rnd.uniform(0.8, 1.4),) * 3


def grass_clumps(coll):
    pc = S.collection("GrassProto")
    root = S.import_gltf("grass_medium_01", pc, (0, 0, 0))
    bpy.context.view_layer.layer_collection.children[pc.name].exclude = True
    rnd = random.Random(9)
    for centre in (CAR_P, CONV_P):
        for i in range(420):
            side = rnd.choice((1, -1))
            y = side * rnd.uniform(SHOULDER - 0.3, 16.0)
            x = centre.x + rnd.uniform(-45, 45)
            inst = bpy.data.objects.new(f"Grass{i}", None); S.link(inst, coll)
            inst.instance_type = "COLLECTION"; inst.instance_collection = pc
            inst.location = (x, y, -0.04); inst.rotation_euler = (0, 0, rnd.uniform(0, 6.28))
            inst.scale = (rnd.uniform(0.9, 1.8),) * 3


def cloud_ceiling(flash_lights):
    """Dark cloud base for the looking-up shot, lit by the bolt."""
    coll = S.collection("Clouds")
    m, nt, b = S._new_mat("CloudBase")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.004, 0.004, 0.004)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    n1 = S._noise(nt, mp.outputs[0], 2.5, 8, 0.62)
    cc = S._ramp(nt, n1, [(0.35, (0.03, 0.035, 0.045)), (0.6, (0.12, 0.13, 0.16)), (0.8, (0.28, 0.3, 0.36))])
    nt.links.new(cc, b.inputs["Base Color"]); nt.links.new(cc, b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = 0.35
    b.inputs["Roughness"].default_value = 1.0
    o = S.grid("CloudBase", 60000, 60000, 1, 1, m, coll, z=0.0)
    o.rotation_euler = (math.pi, 0, 0)       # face down
    o.location = (CAR_P.x, CAR_P.y, 420)
    lamp = bpy.data.objects.new("CloudGlow", bpy.data.lights.new("CloudGlow", "POINT")); S.link(lamp, coll)
    lamp.data.energy = 0.0; lamp.data.shadow_soft_size = 30; lamp.data.color = (0.75, 0.82, 1.0)
    lamp.location = (CAR_P.x + 30, CAR_P.y + 60, 360)
    flash_lights.append(lamp)
    return coll, lamp


# ----------------------------------------------------------------------------- rain
def rain_material():
    m = bpy.data.materials.new("Rain"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (130.0, 1.7, 1.0)
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(7))
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 1.0
    n.inputs["Detail"].default_value = 0.0; nt.links.new(mp.outputs[0], n.inputs["Vector"])
    mask = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", n.outputs["Fac"], 0.71), 9.0, clamp=True)
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.75, 0.8, 0.9, 1)
    em.inputs["Strength"].default_value = 0.35
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "MULTIPLY", mask, 0.22), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    # fall: scroll the streaks (8 m/s) over the whole film
    mp.inputs["Location"].default_value = (0, 0, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=1, index=1)
    mp.inputs["Location"].default_value = (0, 2.2 * 8.0 * 60.0, 0)
    mp.inputs["Location"].keyframe_insert("default_value", frame=1 + 60 * FPS, index=1)
    return m, em.inputs["Strength"], mp


def rain_for_camera(cam, mat, coll, near=True):
    """Transparent streak planes parented to the camera (rain falls in screen space)."""
    lens = cam.data.lens
    vfov = 2 * math.atan(36 / 2 / lens)
    planes = []
    for d in ((1.7, 5.5) if near else (2.8, 6.5)):
        hh = d * math.tan(vfov / 2) * 1.35; hw = hh * 9 / 16 * 1.35
        me = bpy.data.meshes.new(f"Rain_{cam.name}_{d}")
        me.from_pydata([(-hw, -hh, 0), (hw, -hh, 0), (hw, hh, 0), (-hw, hh, 0)], [], [(0, 1, 2, 3)])
        me.materials.append(mat)
        o = S.new_obj(me.name, me, coll); o.parent = cam; o.location = (0, 0, -d)
        o.visible_shadow = False
        planes.append(o)
    return planes


# ----------------------------------------------------------------------------- lightning
def _displace(a, b, levels, jag, rnd):
    pts = [a, b]
    for _ in range(levels):
        new = [pts[0]]
        for p, q in zip(pts[:-1], pts[1:]):
            L = (q - p).length
            d = (q - p).normalized()
            t1 = d.orthogonal().normalized(); t2 = d.cross(t1)
            mid = (p + q) / 2 + (t1 * rnd.gauss(0, 1) + t2 * rnd.gauss(0, 1)) * L * jag
            new += [mid, q]
        pts = new
    return pts


def bolt_geometry(start, end, seed, levels=8, jag=0.16, branches=7):
    rnd = random.Random(seed)
    main = _displace(Vector(start), Vector(end), levels, jag, rnd)
    out = [(main, 1.0)]
    down = (Vector(end) - Vector(start))
    for i in range(branches):
        k = rnd.randint(len(main) // 10, int(len(main) * 0.7))
        p0 = main[k]
        side = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)).normalized()
        L = down.length * rnd.uniform(0.06, 0.2) * (1 - k / len(main))
        e = p0 + (down.normalized() * 0.55 + side * 0.85).normalized() * L
        sub = _displace(p0, e, levels - 3, jag * 1.1, rnd)
        out.append((sub, rnd.uniform(0.25, 0.45)))
        if rnd.random() < 0.5:
            k2 = rnd.randint(1, len(sub) - 2)
            e2 = sub[k2] + (down.normalized() * 0.5 + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0))).normalized() * L * 0.4
            out.append((_displace(sub[k2], e2, levels - 4, jag, rnd), 0.18))
    return out


def bolt_object(name, geom, radius, core_mat, halo_mat, coll):
    """Core curve + soft halo curve. radius: core radius at the main channel (m)."""
    objs = []
    for suffix, mat, scale in (("", core_mat, 1.0), ("_halo", halo_mat, 4.0)):
        cu = bpy.data.curves.new(name + suffix, "CURVE"); cu.dimensions = "3D"
        cu.bevel_depth = radius * scale; cu.bevel_resolution = 1 if scale > 1 else 2
        cu.bevel_factor_mapping_start = "SPLINE"; cu.bevel_factor_mapping_end = "SPLINE"
        for pts, w in geom:
            sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
            for i, (p, q) in enumerate(zip(sp.points, pts)):
                p.co = (q.x, q.y, q.z, 1)
                p.radius = w * (1 - 0.5 * i / len(pts)) if w < 1 else 1.0
        cu.materials.append(mat)
        o = S.new_obj(name + suffix, cu, coll)
        o.visible_shadow = False
        objs.append(o)
    return objs


def bolt_materials():
    core = bpy.data.materials.new("BoltCore"); core.use_nodes = True
    nt = core.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.82, 0.86, 1.0, 1)
    em.inputs["Strength"].default_value = 0.0
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    halo = bpy.data.materials.new("BoltHalo"); halo.use_nodes = True
    nt = halo.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    em2 = nt.nodes.new("ShaderNodeEmission"); em2.inputs["Color"].default_value = (0.5, 0.45, 1.0, 1)
    em2.inputs["Strength"].default_value = 0.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    add = nt.nodes.new("ShaderNodeAddShader")
    fac = S._math(nt, "POWER", S._math(nt, "SUBTRACT", 1.0, lw.outputs["Facing"]), 3.0)
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "MULTIPLY", fac, 0.8), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em2.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return core, em.inputs["Strength"], halo, em2.inputs["Strength"]


# ----------------------------------------------------------------------------- sparks, smoke, shards, splashes
def spark_material():
    return _emit("Spark", (1.0, 0.62, 0.25), 60.0)


def _emit(name, col, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*col, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    return m


def spark_burst(name, origin, frame0, n, mat, coll, parent=None, speed=(1.5, 5.0), life=(5, 13),
                bias=Vector((0, 0, 1)), spread=1.0, seed=0, length=0.05, gravity=9.8):
    """Ballistic glowing streaks; every spark keyed per frame, invisible (scale 0) outside its life."""
    rnd = random.Random(seed)
    objs = []
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.004, radius2=0.0015, depth=length)
    for v in bm.verts:
        v.co.z += length / 2
    me = bpy.data.meshes.new(name + "_m"); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for i in range(n):
        o = S.new_obj(f"{name}{i}", me, coll); o.parent = parent
        o.visible_shadow = False
        o.rotation_mode = "QUATERNION"
        d = (bias.normalized() + Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1))) * spread).normalized()
        v0 = d * rnd.uniform(*speed)
        lf = rnd.randint(*life)
        f0 = frame0 + rnd.randint(0, 3)
        o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=f0 - 1)
        for k in range(lf + 1):
            t = k / FPS
            p = Vector(origin) + v0 * t + Vector((0, 0, -0.5 * gravity * t * t))
            vel = v0 + Vector((0, 0, -gravity * t))
            o.location = p; o.keyframe_insert("location", frame=f0 + k)
            o.rotation_quaternion = vel.to_track_quat("Z", "Y"); o.keyframe_insert("rotation_quaternion", frame=f0 + k)
            s = (1 - k / (lf + 1)) * (1 + vel.length * 0.4)
            o.scale = (1, 1, s); o.keyframe_insert("scale", frame=f0 + k)
        o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=f0 + lf + 1)
        objs.append(o)
    return objs


def smoke_material():
    m = bpy.data.materials.new("Smoke"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = S._noise(nt, tc.outputs["Object"], 3.0, 4, 0.6)
    dens = S._math(nt, "MULTIPLY", S._math(nt, "POWER", S._math(nt, "SUBTRACT", 1.0, lw.outputs["Facing"]), 2.5), S._math(nt, "MULTIPLY", n, 1.3))
    alpha = S._math(nt, "MULTIPLY", dens, oi.outputs["Alpha"], clamp=True)
    df = nt.nodes.new("ShaderNodeBsdfDiffuse"); df.inputs["Color"].default_value = (0.6, 0.61, 0.63, 1)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(alpha, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(df.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def smoke(name, origin, f0, f1, n, mat, coll, parent=None, rise=0.5, size=(0.08, 0.5), seed=0, opacity=0.8,
          drift=Vector((0, 0, 0))):
    """Soft puffs that grow, rise and fade between frames f0 and f1 (staggered)."""
    rnd = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    me = bpy.data.meshes.new(name + "_m"); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    objs = []
    for i in range(n):
        o = S.new_obj(f"{name}{i}", me, coll); o.parent = parent; o.visible_shadow = False
        s0 = f0 + int((f1 - f0) * 0.6 * i / max(1, n))
        life = max(6, f1 - s0)
        off = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)) * size[0]
        o.color = (1, 1, 1, 0); o.scale = (0.001,) * 3
        o.keyframe_insert("color", frame=s0 - 1); o.keyframe_insert("scale", frame=s0 - 1)
        for k in (0, life // 3, life):
            t = k / life
            o.location = Vector(origin) + off * (1 + 2 * t) + Vector((0, 0, rise * t)) + drift * t
            sc = size[0] + (size[1] - size[0]) * t ** 0.6
            o.scale = (sc,) * 3
            o.color = (1, 1, 1, opacity * (min(1, t * 4) * (1 - t)))
            for path in ("location", "scale", "color"):
                o.keyframe_insert(path, frame=s0 + k)
        objs.append(o)
    return objs


def shatter(rear, n_cells=28, seed=4):
    """Split the rear-window mesh into shards (one object each, origin at the shard centre)."""
    rnd = random.Random(seed)
    me = rear.data
    cents = [p.center.copy() for p in me.polygons]
    seeds = [cents[rnd.randrange(len(cents))] for _ in range(n_cells)]
    groups = {}
    for p, c in zip(me.polygons, cents):
        k = min(range(n_cells), key=lambda i: (c - seeds[i]).length)
        groups.setdefault(k, []).append(p.index)
    shards = []
    for k, faces in groups.items():
        bm = bmesh.new(); vmap = {}
        for fi in faces:
            vs = []
            for vi in me.polygons[fi].vertices:
                if vi not in vmap:
                    vmap[vi] = bm.verts.new(me.vertices[vi].co)
                vs.append(vmap[vi])
            try:
                bm.faces.new(vs)
            except ValueError:
                pass
        c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
        for v in bm.verts:
            v.co -= c
        sme = bpy.data.meshes.new(f"Shard{k}"); bm.to_mesh(sme); bm.free()
        sme.materials.append(me.materials[0])
        o = S.new_obj(f"Shard{k}", sme, rear.users_collection[0]); o.parent = rear.parent
        o.location = c; o.rotation_mode = "XYZ"
        shards.append(o)
    return shards


def splash_pops(name, points, frames, coll, parent=None, seed=0, size=0.006):
    """Tiny white droplets popping on a surface (rain hitting the roof)."""
    rnd = random.Random(seed)
    mat = _emit("Splash", (0.8, 0.85, 0.95), 0.25)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=size)
    me = bpy.data.meshes.new(name + "_m"); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    objs = []
    for i, p in enumerate(points):
        o = S.new_obj(f"{name}{i}", me, coll); o.parent = parent; o.location = p; o.visible_shadow = False
        o.scale = (0, 0, 0); o.keyframe_insert("scale", frame=frames[0] - 1)
        f = frames[0] + rnd.randint(0, 4)
        while f < frames[1]:
            for k, s in ((0, 0.0), (1, 1.0), (2, 1.4), (3, 0.0)):
                o.scale = (s, s, s * 0.5); o.keyframe_insert("scale", frame=f + k)
            f += rnd.randint(4, 9)
        objs.append(o)
    return objs


# ----------------------------------------------------------------------------- the sun
def sun_set(w_nodes):
    coll = S.collection("SunSet")
    m = bpy.data.materials.new("SunSurface"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n4 = nt.nodes.new("ShaderNodeTexNoise"); n4.noise_dimensions = "4D"
    n4.inputs["Scale"].default_value = 0.09; n4.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], n4.inputs["Vector"])
    w_nodes.append(n4.inputs["W"])
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    limb = S._math(nt, "POWER", lw.outputs["Facing"], 0.6)
    col = S._ramp(nt, n4.outputs["Fac"], [(0.35, (0.9, 0.25, 0.02)), (0.55, (1.0, 0.55, 0.08)), (0.75, (1.0, 0.85, 0.4))])
    col = S._mix(nt, S._math(nt, "MULTIPLY", limb, 0.75), col, (0.5, 0.08, 0.0))
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = 6.0
    nt.links.new(col, em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=120)
    me = bpy.data.meshes.new("Sun"); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    sun = S.new_obj("SunBall", me, coll); sun.location = SUN_P
    # corona glow
    halo = bpy.data.materials.new("Corona"); halo.use_nodes = True
    nt = halo.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (1.0, 0.45, 0.08, 1)
    em.inputs["Strength"].default_value = 3.0
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "POWER", lw.outputs["Facing"], 4.0), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=32, radius=175)
    me = bpy.data.meshes.new("Corona"); bm.to_mesh(me); bm.free(); me.materials.append(halo)
    for p in me.polygons:
        p.use_smooth = True
    S.new_obj("Corona", me, coll).location = SUN_P
    # black space around it (normals inward)
    space = _emit("Space", (0.0, 0.0, 0.0), 0.0)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1500)
    bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("Space"); bm.to_mesh(me); bm.free(); me.materials.append(space)
    S.new_obj("Space", me, coll).location = SUN_P
    return coll
