"""Sets for the quicksand short: tidal flat at sunset, cross-section cutaway, macro sand grains,
swimming pool (match cut) and a car (force comparison). All geometry is procedural; textures,
sky and props are CC0 from Poly Haven.

World layout (metres): beach around the origin (quicksand patch P1 at the origin, second patch P2),
car set at CAR, pool set at POOL, macro grain set at MACRO.
"""
import math, os, random
import numpy as np
import bpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

SCRATCH = os.environ["QS_SCRATCH"]
A = os.path.join(SCRATCH, "assets")
P1 = Vector((0.0, 0.0, 0.0))
P2 = Vector((0.65, 1.95, 0.0))
CAR = Vector((60.0, -30.0, 0.0))
POOL = Vector((-450.0, 0.0, 0.0))
MACRO = Vector((450.0, 0.0, 0.0))
SUN_AZ, SUN_EL = -40.0, 21.0         # key light, degrees (azimuth from +X toward +Y)
SKY_SUN_AZ = -40.0                   # where the sky image's own sun ends up


def link(obj, coll=None):
    (coll or bpy.context.scene.collection).objects.link(obj)
    return obj


def new_obj(name, me, coll=None):
    return link(bpy.data.objects.new(name, me), coll)


def collection(name):
    c = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if c.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(c)
    return c


# ----------------------------------------------------------------------------- material helpers
def _tex(nt, path, noncolor=False, proj="FLAT"):
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(path, check_existing=True)
    if noncolor:
        t.image.colorspace_settings.name = "Non-Color"
    t.projection = proj
    if proj == "BOX":
        t.projection_blend = 0.25
    return t


def _mapping(nt, size, coord="Object", obj=None):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    if obj is not None:
        tc.object = obj
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size, 1 / size, 1 / size)
    nt.links.new(tc.outputs[coord], mp.inputs["Vector"])
    return mp, tc


def _math(nt, op, a=None, b=None, clamp=False):
    m = nt.nodes.new("ShaderNodeMath"); m.operation = op; m.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            m.inputs[i].default_value = v
        else:
            nt.links.new(v, m.inputs[i])
    return m.outputs[0]


def _mix(nt, fac, a, b, kind="RGBA", blend="MIX"):
    m = nt.nodes.new("ShaderNodeMix"); m.data_type = kind
    if kind == "RGBA":
        m.blend_type = blend
        ia, ib, out = 6, 7, 2
    else:
        ia, ib, out = 2, 3, 0
    for idx, v in ((0, fac), (ia, a), (ib, b)):
        if isinstance(v, (int, float)):
            m.inputs[idx].default_value = v
        elif isinstance(v, tuple):
            m.inputs[idx].default_value = (*v, 1) if len(v) == 3 else v
        else:
            nt.links.new(v, m.inputs[idx])
    return m.outputs[out]


def _ramp(nt, fac, stops):
    r = nt.nodes.new("ShaderNodeValToRGB")
    els = r.color_ramp.elements
    els[0].position, els[0].color = stops[0][0], (*stops[0][1], 1)
    els[1].position, els[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]:
        e = els.new(p); e.color = (*c, 1)
    nt.links.new(fac, r.inputs["Fac"])
    return r.outputs["Color"]


def _noise(nt, vec, scale, detail=3.0, rough=0.5):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale; n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    nt.links.new(vec, n.inputs["Vector"])
    return n.outputs["Fac"]


def _new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]


def _dist_xy(nt, tc_out):
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc_out, sep.inputs[0])
    x2 = _math(nt, "MULTIPLY", sep.outputs[0], sep.outputs[0]); y2 = _math(nt, "MULTIPLY", sep.outputs[1], sep.outputs[1])
    return _math(nt, "SQRT", _math(nt, "ADD", x2, y2))


# ----------------------------------------------------------------------------- materials
def sand_material(name, sink_empties, patch_centres):
    """Tidal-flat sand: textured, wetness/puddle variation, darker smoother quicksand patches and a
    wet churned ring around each empty in `sink_empties` (the character's sinking point)."""
    m, nt, b = _new_mat(name)
    d = os.path.join(A, "tex", "damp_beach_sand_02")
    mp, tc = _mapping(nt, 1.6)
    diff = _tex(nt, os.path.join(d, "diff.jpg")); nt.links.new(mp.outputs[0], diff.inputs[0])
    rough = _tex(nt, os.path.join(d, "rough.jpg"), True); nt.links.new(mp.outputs[0], rough.inputs[0])
    nor = _tex(nt, os.path.join(d, "nor.jpg"), True); nt.links.new(mp.outputs[0], nor.inputs[0])
    disp = _tex(nt, os.path.join(d, "disp.jpg"), True); nt.links.new(mp.outputs[0], disp.inputs[0])
    # large scale tonal variation so the flat doesn't tile
    big = _noise(nt, tc.outputs["Object"], 0.08, 4, 0.55)
    col = _mix(nt, 1.0, diff.outputs["Color"], (1.08, 0.97, 0.86), blend="MULTIPLY")
    col = _mix(nt, _math(nt, "MULTIPLY", big, 0.6), col, _mix(nt, 1.0, col, (0.78, 0.74, 0.7), blend="MULTIPLY"))
    # wet streaks and shallow puddles
    wetn = _noise(nt, tc.outputs["Object"], 0.22, 5, 0.6)
    wet = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", wetn, 0.47), 6.0, clamp=True)
    puddle = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", wetn, 0.60), 14.0, clamp=True)
    # quicksand patches: smoother, darker, glossier
    patch = None
    for c, r in patch_centres:
        e = bpy.data.objects.new(f"{name}_patch", None); e.location = c; link(e)
        tcp = nt.nodes.new("ShaderNodeTexCoord"); tcp.object = e
        dist = _dist_xy(nt, tcp.outputs["Object"])
        edge = _math(nt, "MULTIPLY", _noise(nt, tcp.outputs["Object"], 1.8, 2, 0.5), 0.5)
        p = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", r, _math(nt, "ADD", dist, edge)), 2.2, clamp=True)
        patch = p if patch is None else _math(nt, "MAXIMUM", patch, p)
    ring = 0.0
    for e in sink_empties:
        tcs = nt.nodes.new("ShaderNodeTexCoord"); tcs.object = e
        dist = _dist_xy(nt, tcs.outputs["Object"])
        jag = _math(nt, "MULTIPLY", _noise(nt, tcs.outputs["Object"], 6.0, 3, 0.6), 0.25)
        rr = _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", 0.75, _math(nt, "ADD", dist, jag)), 3.0, clamp=True)
        ring = rr if isinstance(ring, float) else _math(nt, "MAXIMUM", ring, rr)
    wet_all = _math(nt, "MAXIMUM", _math(nt, "MAXIMUM", wet, _math(nt, "MULTIPLY", patch, 0.85)), ring)
    col = _mix(nt, wet_all, col, _mix(nt, 1.0, col, (0.55, 0.5, 0.46), blend="MULTIPLY"))
    col = _mix(nt, _math(nt, "MULTIPLY", patch, 0.7), col, _mix(nt, 1.0, col, (0.72, 0.62, 0.52), blend="MULTIPLY"))
    col = _mix(nt, puddle, col, (0.10, 0.10, 0.11))
    nt.links.new(col, b.inputs["Base Color"])
    rgh = _mix(nt, wet_all, rough.outputs["Color"], 0.22, kind="FLOAT")
    rgh = _mix(nt, puddle, rgh, 0.03, kind="FLOAT")
    nt.links.new(rgh, b.inputs["Roughness"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    # relief: texture normal + displacement bump, flattened in puddles/patches; ripples in patches
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nor.outputs["Color"], nm.inputs["Color"])
    flat = _math(nt, "SUBTRACT", 1.0, _math(nt, "MAXIMUM", puddle, _math(nt, "MULTIPLY", patch, 0.8)))
    nt.links.new(_math(nt, "MULTIPLY", flat, 1.0), nm.inputs["Strength"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.01
    nt.links.new(_math(nt, "MULTIPLY", flat, 0.5), bump.inputs["Strength"])
    rip = nt.nodes.new("ShaderNodeTexWave"); rip.wave_type = "RINGS"; rip.inputs["Scale"].default_value = 2.5
    rip.inputs["Distortion"].default_value = 6.0; nt.links.new(tc.outputs["Object"], rip.inputs["Vector"])
    h = _math(nt, "ADD", _math(nt, "MULTIPLY", disp.outputs["Color"], flat),
              _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", rip.outputs["Fac"], patch), 0.25))
    h = _math(nt, "ADD", h, _math(nt, "MULTIPLY", _noise(nt, tc.outputs["Object"], 40.0, 2, 0.5), _math(nt, "MULTIPLY", ring, 0.8)))
    nt.links.new(h, bump.inputs["Height"]); nt.links.new(nm.outputs["Normal"], bump.inputs["Normal"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def section_material(name):
    """Cut face of the sand: packed wet sand with horizontal strata, darker and wetter with depth."""
    m, nt, b = _new_mat(name)
    d = os.path.join(A, "tex", "damp_sand")
    mp, tc = _mapping(nt, 0.8)
    diff = _tex(nt, os.path.join(d, "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], diff.inputs[0])
    nor = _tex(nt, os.path.join(d, "nor.jpg"), True, proj="BOX"); nt.links.new(mp.outputs[0], nor.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    wave = nt.nodes.new("ShaderNodeTexWave"); wave.bands_direction = "Z"; wave.inputs["Scale"].default_value = 1.6
    wave.inputs["Distortion"].default_value = 3.0; wave.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], wave.inputs["Vector"])
    depth = _math(nt, "MULTIPLY", sep.outputs[2], -0.45, clamp=True)  # 0 at top -> 1 at ~2.2 m down
    col = _mix(nt, 1.0, diff.outputs["Color"], (1.05, 0.92, 0.78), blend="MULTIPLY")
    col = _mix(nt, _math(nt, "MULTIPLY", wave.outputs["Fac"], 0.35), col, (0.42, 0.33, 0.24))
    col = _mix(nt, depth, col, _mix(nt, 1.0, col, (0.5, 0.45, 0.42), blend="MULTIPLY"))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(_mix(nt, depth, 0.75, 0.35, kind="FLOAT"), b.inputs["Roughness"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.2
    nt.links.new(nor.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def water_material(name, front=False, tint=(0.55, 0.62, 0.6), wave_scale=3.0):
    """Shallow sea water. With front=True the sheet fades in along local +X with a ragged foamy edge."""
    m, nt, b = _new_mat(name)
    b.inputs["Base Color"].default_value = (*tint, 1)
    b.inputs["Roughness"].default_value = 0.03
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.33
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = wave_scale; n.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.25; bump.inputs["Distance"].default_value = 0.02
    nt.links.new(n.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    if not front:
        return m
    out = nt.nodes["Material Output"]
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    rag = _math(nt, "MULTIPLY", _noise(nt, tc.outputs["Object"], 0.35, 4, 0.6), 2.2)
    x = _math(nt, "SUBTRACT", sep.outputs[0], rag)
    alpha = _math(nt, "MULTIPLY", _math(nt, "ADD", x, 0.9), 1.6, clamp=True)
    foam_band = _math(nt, "SUBTRACT", 1.0, _math(nt, "ABSOLUTE", _math(nt, "MULTIPLY", _math(nt, "ADD", x, 0.45), 1.8)))
    foam_n = _noise(nt, tc.outputs["Object"], 9.0, 4, 0.7)
    foam_band = _math(nt, "SUBTRACT", 1.0, _math(nt, "ABSOLUTE", _math(nt, "MULTIPLY", _math(nt, "ADD", x, 0.35), 1.1)))
    foam = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", _math(nt, "MAXIMUM", foam_band, 0.0), 1.6), _math(nt, "MULTIPLY", _math(nt, "SUBTRACT", foam_n, 0.22), 3.5, clamp=True), clamp=True)
    fb = nt.nodes.new("ShaderNodeBsdfPrincipled"); fb.inputs["Base Color"].default_value = (0.92, 0.92, 0.9, 1)
    fb.inputs["Roughness"].default_value = 0.6
    mix = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(foam, mix.inputs[0])
    nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(fb.outputs[0], mix.inputs[2])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix2 = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(alpha, mix2.inputs[0])
    nt.links.new(tr.outputs[0], mix2.inputs[1]); nt.links.new(mix.outputs[0], mix2.inputs[2])
    nt.links.new(mix2.outputs[0], out.inputs["Surface"])
    return m


def pbr(name, tex, size, tint=(1, 1, 1), rough_mul=1.0, proj="BOX"):
    m, nt, b = _new_mat(name)
    d = os.path.join(A, "tex", tex)
    mp, _ = _mapping(nt, size)
    diff = _tex(nt, os.path.join(d, "diff.jpg"), proj=proj); nt.links.new(mp.outputs[0], diff.inputs[0])
    nt.links.new(_mix(nt, 1.0, diff.outputs["Color"], tint, blend="MULTIPLY"), b.inputs["Base Color"])
    rf = os.path.join(d, "rough.jpg")
    if os.path.exists(rf):
        r = _tex(nt, rf, True, proj=proj); nt.links.new(mp.outputs[0], r.inputs[0])
        nt.links.new(_math(nt, "MULTIPLY", r.outputs["Color"], rough_mul), b.inputs["Roughness"])
    nf = os.path.join(d, "nor.jpg")
    if os.path.exists(nf):
        n = _tex(nt, nf, True, proj=proj); nt.links.new(mp.outputs[0], n.inputs[0])
        nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def flat(name, col, rough=0.5, metal=0.0, coat=0.0, spec=0.5):
    m, nt, b = _new_mat(name)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Specular IOR Level"].default_value = spec
    return m


def grain_material(name):
    m, nt, b = _new_mat(name)
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    col = _ramp(nt, oi.outputs["Random"], [(0.0, (0.30, 0.22, 0.14)), (0.4, (0.46, 0.36, 0.24)),
                                           (0.75, (0.58, 0.48, 0.34)), (0.92, (0.22, 0.2, 0.18)), (1.0, (0.7, 0.66, 0.6))])
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.55
    return m


def seep_water_material(name, front_empty):
    """Water between grains: visible below the plane of `front_empty` (animated downwards)."""
    m, nt, b = _new_mat(name)
    b.inputs["Base Color"].default_value = (0.35, 0.55, 0.65, 1)
    b.inputs["Roughness"].default_value = 0.05
    b.inputs["Transmission Weight"].default_value = 0.85
    b.inputs["IOR"].default_value = 1.33
    b.inputs["Emission Color"].default_value = (0.2, 0.45, 0.6, 1)
    b.inputs["Emission Strength"].default_value = 0.15
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.object = front_empty
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    edge = _math(nt, "ADD", sep.outputs[2], _math(nt, "MULTIPLY", _noise(nt, tc.outputs["Object"], 12, 3, 0.6), 0.05))
    alpha = _math(nt, "MULTIPLY", _math(nt, "MULTIPLY", edge, 30.0, clamp=True), 0.6)
    out = nt.nodes["Material Output"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader"); nt.links.new(alpha, mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(b.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


# ----------------------------------------------------------------------------- world + lights
def world(strength=1.0):
    sc = bpy.context.scene
    w = bpy.data.worlds.new("Sky"); sc.world = w; w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    img = bpy.data.images.load(os.path.join(A, "hdri", "qwantani_sunset_puresky.hdr"), check_existing=True)
    # tame the sky's own sun (the key light below does the hard shadows) but keep a bright disc
    px = np.empty(img.size[0] * img.size[1] * 4, np.float32); img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    lum = px[:, :3] @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    s = np.minimum(1.0, 60.0 / np.maximum(lum, 1e-6))
    px[:, :3] *= s[:, None]
    img.pixels.foreach_set(px.ravel()); img.pack()
    env.image = img
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    # image sun sits at u=0.6 (36 deg); rotate so it lands at SKY_SUN_AZ
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(144.0 - SKY_SUN_AZ))  # image sun is at 144 deg
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); link(sun)
    sun.data.energy = 5.5
    sun.data.color = (1.0, 0.80, 0.60)
    sun.data.angle = math.radians(0.8)
    d = Vector((math.cos(math.radians(SUN_EL)) * math.cos(math.radians(SUN_AZ)),
                math.cos(math.radians(SUN_EL)) * math.sin(math.radians(SUN_AZ)), math.sin(math.radians(SUN_EL))))
    sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return sun


# ----------------------------------------------------------------------------- geometry helpers
def grid(name, sx, sy, nx, ny, mat, coll=None, z=0.0):
    verts = [(sx * (i / nx - 0.5), sy * (j / ny - 0.5), z) for j in range(ny + 1) for i in range(nx + 1)]
    faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i)
             for j in range(ny) for i in range(nx)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    return new_obj(name, me, coll)


def box(name, mn, mx, mat, coll=None, bevel=0.0):
    (x0, y0, z0), (x1, y1, z1) = mn, mx
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], f); me.materials.append(mat)
    o = new_obj(name, me, coll)
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 3
    return o


def import_gltf(name, coll, loc, rot_z=0.0, scale=1.0):
    path = os.path.join(A, "models", name, name + ".gltf")
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name + "_root", None); link(root, coll)
    for o in new:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)
        if o.parent is None:
            o.parent = root
    root.location = loc; root.rotation_euler = (0, 0, rot_z); root.scale = (scale,) * 3
    return root


# ----------------------------------------------------------------------------- beach
def beach(sink_empties):
    coll = collection("Beach")
    sand = sand_material("Sand", sink_empties, [(P1, 1.2), (P2, 0.72)])
    g = grid("Beach", 600, 600, 1, 1, sand, coll)
    # props well away from the action: a distant rocky headland, rock clusters, driftwood, a shell
    import_gltf("coast_rocks_01", coll, (-45.0, 75.0, -0.6), 0.5, 1.0)
    import_gltf("dead_tree_trunk_02", coll, (-5.5, 6.5, -0.08), 0.7, 0.8)
    for loc, rz, sc in (((-9.0, 4.0, -0.05), 0.4, 0.7), ((7.5, 9.0, -0.05), 2.1, 0.9), ((-12.0, -10.0, -0.05), 4.0, 0.8),
                        ((14.0, -4.0, -0.05), 1.3, 0.6), ((-3.5, 12.0, -0.05), 5.2, 0.8)):
        import_gltf("sand_rocks_small_01", coll, loc, rz, sc)
    import_gltf("lambis_shell", coll, (1.6, -1.2, 0.0), 0.4, 1.0)
    return coll, g


def tide(coll):
    """Water sheet whose ragged front sits at the object's origin and covers local +X."""
    mat = water_material("TideWater", front=True, tint=(0.42, 0.55, 0.6))
    me = bpy.data.meshes.new("Tide")
    me.from_pydata([(-3, -300, 0), (400, -300, 0), (400, 300, 0), (-3, 300, 0)], [], [(0, 1, 2, 3)])
    me.materials.append(mat)
    o = new_obj("Tide", me, coll)
    o.location = (40, 0, 0.012)
    o.rotation_euler = (0, 0, 0)
    return o


def xray_material(name, base):
    """Cut face seen 'x-ray' style: front faces are translucent sand, back faces invisible."""
    m = base.copy(); m.name = name
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    b = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.5
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(b.outputs[0], mix.inputs[2])
    mx2 = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mx2.inputs[0])
    nt.links.new(mix.outputs[0], mx2.inputs[1]); nt.links.new(tr.outputs[0], mx2.inputs[2])
    nt.links.new(mx2.outputs[0], out.inputs["Surface"])
    return m


def backface_clear(name, base):
    m = base.copy(); m.name = name
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
    nt.links.new(nt.nodes["Principled BSDF"].outputs[0], mx.inputs[1]); nt.links.new(tr.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    return m


def section_block(name, centre, axis, sink_empties=(), front=0.24, back=0.24):
    """X-ray cross-section through the character: a sand block whose cut face sits `front` m in
    front of the body and is translucent, with an opaque sand wall `back` m behind the body.
    axis='X': cut face faces +X (camera on +X). axis='Y': cut face faces -Y (camera on -Y)."""
    coll = collection(name)
    sec_mat = bpy.data.materials.get("Section") or section_material("Section")
    xr = xray_material(name + "Xray", sec_mat)
    top = backface_clear(name + "Top", sand_material(name + "TopSand", list(sink_empties), [(P1, 1.2)]))
    c = centre
    if axis == "X":
        o = box(name + "Block", (c.x - 250, c.y - 60, -3.0), (c.x + front, c.y + 60, 0.0), xr, coll)
        wall = box(name + "Wall", (c.x - 3.0, c.y - 60, -3.0), (c.x - back, c.y + 60, -0.002), sec_mat, coll)
        box(name + "Pit", (c.x + front, c.y - 60, -3.2), (c.x + 40, c.y + 60, -3.0), sec_mat, coll)
    else:
        o = box(name + "Block", (c.x - 60, c.y - front, -3.0), (c.x + 60, c.y + 250, 0.0), xr, coll)
        wall = box(name + "Wall", (c.x - 60, c.y + back, -3.0), (c.x + 60, c.y + 3.0, -0.002), sec_mat, coll)
        box(name + "Pit", (c.x - 60, c.y - 40, -3.2), (c.x + 60, c.y - front, -3.0), sec_mat, coll)
    o.data.materials.append(top)
    for p in o.data.polygons:  # top face uses the beach sand
        if p.normal.z > 0.9:
            p.material_index = 1
    return coll


# ----------------------------------------------------------------------------- macro grains
def macro_grains(boot_mesh, seep_empty, n_target=26000, seed=7):
    """A wall of sand grains (camera looks along +Y at the cut plane y=MACRO.y) around a boot.
    Returns (collection, grain-carrier object with a 'Loose' shape key, boot object)."""
    coll = collection("Macro")
    boot = new_obj("MacroBoot", boot_mesh, coll)
    boot.location = MACRO
    bpy.context.view_layer.update()
    bm_verts = [boot.matrix_world @ v.co for v in boot.data.vertices]
    bvh = BVHTree.FromPolygons(bm_verts, [tuple(p.vertices) for p in boot.data.polygons])
    rng = np.random.default_rng(seed)
    r0 = 0.0065
    sx, sy, sz = 0.9, 0.22, 0.75
    pts = []
    step = r0 * 1.9
    xs = np.arange(-sx / 2, sx / 2, step); ys = np.arange(0.0, sy, step); zs = np.arange(-sz, 0.02, step)
    X, Y, Z = np.meshgrid(xs, ys, zs, indexing="ij")
    P = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1) + rng.normal(0, r0 * 0.25, (X.size, 3))
    P = P + np.array(MACRO) + np.array([0, 0, 0.3])
    keep = []
    for p in P:
        loc, nrm, idx, dist = bvh.find_nearest(Vector(p), 0.03)
        if loc is not None:
            if (Vector(p) - loc).dot(nrm) < r0 * 0.6:  # inside or touching the boot
                continue
        keep.append(p)
    P = np.array(keep)
    if len(P) > n_target:
        P = P[rng.choice(len(P), n_target, replace=False)]
    # loose positions: pushed away from the boot and jittered (water lets grains move apart)
    L = P.copy()
    for i, p in enumerate(P):
        loc, nrm, idx, dist = bvh.find_nearest(Vector(p), 0.25)
        push = np.zeros(3)
        if loc is not None:
            v = np.array(Vector(p) - loc); n = np.linalg.norm(v) + 1e-6
            push = v / n * max(0.0, 0.03 - n * 0.12)
        L[i] = p + push + rng.normal(0, r0 * 0.5, 3)
    me = bpy.data.meshes.new("Grains"); me.from_pydata(P.tolist(), [], [])
    car = new_obj("Grains", me, coll)
    car.shape_key_add(name="Basis")
    k = car.shape_key_add(name="Loose"); k.data.foreach_set("co", L.astype(np.float32).ravel())
    # instanced grain: slightly irregular rounded pebble
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=r0)
    g = bpy.context.active_object; g.name = "Grain"
    for c in g.users_collection:
        c.objects.unlink(g)
    coll.objects.link(g)
    for v in g.data.vertices:
        v.co *= 1.0 + 0.18 * math.sin(v.co.x * 900) * math.cos(v.co.y * 700)
    g.data.materials.append(grain_material("Grain"))
    for p in g.data.polygons:
        p.use_smooth = True
    g.parent = car
    g.location = (0, 0, 0)
    car.instance_type = "VERTS"
    car.show_instancer_for_render = False
    g.hide_render = False
    # water between grains (box that fills the wall; revealed below seep_empty's plane)
    w = box("SeepWater", (MACRO.x - sx / 2, MACRO.y + 0.001, MACRO.z - sz + 0.3), (MACRO.x + sx / 2, MACRO.y + sy, MACRO.z + 0.3),
            seep_water_material("SeepWater", seep_empty), coll)
    back = box("MacroBack", (MACRO.x - 2, MACRO.y + sy, MACRO.z - 2), (MACRO.x + 2, MACRO.y + sy + 0.05, MACRO.z + 2),
               flat("MacroBack", (0.18, 0.13, 0.09), 0.9), coll)
    return coll, car, boot


# ----------------------------------------------------------------------------- pool
def pool():
    coll = collection("Pool")
    L, W, D = 10.0, 5.0, 1.6
    tiles = pbr("PoolTiles", "rounded_square_tiled_wall", 0.6, tint=(0.55, 0.95, 1.0), rough_mul=0.6)
    deck = pbr("PoolDeck", "patio_tiles", 1.2, tint=(0.95, 0.9, 0.85))
    x0, y0 = POOL.x - L / 2, POOL.y - W / 2
    # basin: floor + 4 walls (inward-facing)
    box("PoolFloor", (x0, y0, -D - 0.1), (x0 + L, y0 + W, -D), tiles, coll)
    box("PoolWallS", (x0 - 0.2, y0 - 0.2, -D), (x0 + L + 0.2, y0, 0), tiles, coll)
    box("PoolWallN", (x0 - 0.2, y0 + W, -D), (x0 + L + 0.2, y0 + W + 0.2, 0), tiles, coll)
    box("PoolWallW", (x0 - 0.2, y0, -D), (x0, y0 + W, 0), tiles, coll)
    box("PoolWallE", (x0 + L, y0, -D), (x0 + L + 0.2, y0 + W, 0), tiles, coll)
    # deck around
    for nm, mn, mx in (("DeckS", (x0 - 20, y0 - 20, -0.1), (x0 + L + 20, y0 - 0.2, 0.02)),
                       ("DeckN", (x0 - 20, y0 + W + 0.2, -0.1), (x0 + L + 20, y0 + W + 20, 0.02)),
                       ("DeckW", (x0 - 20, y0 - 0.2, -0.1), (x0 - 0.2, y0 + W + 0.2, 0.02)),
                       ("DeckE", (x0 + L + 0.2, y0 - 0.2, -0.1), (x0 + L + 20, y0 + W + 0.2, 0.02))):
        box(nm, mn, mx, deck, coll)
    edge = flat("PoolEdge", (0.85, 0.83, 0.8), 0.45)
    for nm, mn, mx in (("CopingS", (x0 - 0.3, y0 - 0.3, 0.0), (x0 + L + 0.3, y0, 0.06)),
                       ("CopingN", (x0 - 0.3, y0 + W, 0.0), (x0 + L + 0.3, y0 + W + 0.3, 0.06)),
                       ("CopingW", (x0 - 0.3, y0, 0.0), (x0, y0 + W, 0.06)),
                       ("CopingE", (x0 + L, y0, 0.0), (x0 + L + 0.3, y0 + W, 0.06))):
        box(nm, mn, mx, edge, coll, bevel=0.015)
    wat = water_material("PoolWater", tint=(0.62, 0.92, 1.0), wave_scale=1.2)
    b = wat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.05, 0.42, 0.62, 1)
    b.inputs["Transmission Weight"].default_value = 0.55
    b.inputs["Roughness"].default_value = 0.04
    fill = bpy.data.objects.new("PoolFill", bpy.data.lights.new("PoolFill", "AREA")); link(fill, coll)
    fill.data.energy = 2500; fill.data.size = 14; fill.data.color = (1.0, 0.97, 0.92)
    fill.location = (POOL.x, POOL.y - 2, 9)
    grid("PoolWater", L, W, 1, 1, wat, coll, z=-0.08).location = (POOL.x, POOL.y, 0)
    # ladder
    steel = flat("Steel", (0.8, 0.8, 0.82), 0.15, metal=1.0)
    for dy in (-0.25, 0.25):
        pts = [(x0 + L + 0.35, POOL.y + dy + 1.0, 0.9), (x0 + L + 0.35, POOL.y + dy + 1.0, 0.1),
               (x0 + L - 0.05, POOL.y + dy + 1.0, 0.1), (x0 + L - 0.12, POOL.y + dy + 1.0, -1.0)]
        cu = bpy.data.curves.new("ladder", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.022
        sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
        for p, c in zip(sp.points, pts):
            p.co = (*c, 1)
        cu.materials.append(steel)
        new_obj("Ladder", cu, coll)
    return coll


# ----------------------------------------------------------------------------- car
def car(loc=CAR, rot_z=0.0):
    """Stylised compact sedan, built from lofted sections + subdivision."""
    coll = collection("Car")
    paint = flat("CarPaint", (0.55, 0.05, 0.03), 0.28, metal=0.2, coat=1.0)
    glass = flat("CarGlass", (0.02, 0.025, 0.03), 0.05, spec=0.9)
    tyre = flat("Tyre", (0.025, 0.025, 0.025), 0.75)
    rim = flat("Rim", (0.75, 0.75, 0.77), 0.25, metal=1.0)
    chrome = flat("Chrome", (0.9, 0.9, 0.9), 0.1, metal=1.0)
    lamp = flat("Lamp", (1.0, 0.95, 0.85), 0.1); lamp.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.0
    tail = flat("TailLamp", (0.5, 0.02, 0.02), 0.15)
    # body: sections along X (length 4.2 m), each a rounded rectangle (half width, z bottom, z top)
    secs = [(-2.1, 0.80, 0.30, 0.78), (-1.95, 0.86, 0.26, 0.92), (-1.3, 0.88, 0.26, 0.98), (-0.75, 0.88, 0.26, 1.02),
            (0.6, 0.88, 0.26, 1.02), (1.3, 0.88, 0.26, 0.95), (1.85, 0.86, 0.28, 0.86), (2.1, 0.8, 0.32, 0.72)]
    ring = 16
    verts, faces = [], []
    for x, hw, zb, zt in secs:
        for k in range(ring):
            a = 2 * math.pi * k / ring
            cx, cz = math.cos(a), math.sin(a)
            sx = math.copysign(abs(cx) ** 0.35, cx); sz = math.copysign(abs(cz) ** 0.35, cz)
            verts.append((x, sx * hw, (zb + zt) / 2 + sz * (zt - zb) / 2))
    for i in range(len(secs) - 1):
        for k in range(ring):
            a, b = i * ring + k, i * ring + (k + 1) % ring
            faces.append((a, b, b + ring, a + ring))
    faces.append(tuple(range(ring))[::-1]); faces.append(tuple(range((len(secs) - 1) * ring, len(secs) * ring)))
    me = bpy.data.meshes.new("CarBody"); me.from_pydata(verts, [], faces); me.materials.append(paint)
    for p in me.polygons:
        p.use_smooth = True
    body = new_obj("CarBody", me, coll)
    sub = body.modifiers.new("sub", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    # cabin: tapered greenhouse
    cab = [(-0.75, 0.80, 1.0, 1.0), (-0.35, 0.74, 1.0, 1.42), (0.55, 0.72, 1.0, 1.44), (1.15, 0.78, 1.0, 1.0)]
    verts, faces = [], []
    for x, hw, zb, zt in cab:
        for (yy, zz) in ((-hw, zb), (-hw * 0.86, zt), (hw * 0.86, zt), (hw, zb)):
            verts.append((x, yy, zz))
    for i in range(len(cab) - 1):
        for k in range(3):
            a, b = i * 4 + k, i * 4 + k + 1
            faces.append((a, b, b + 4, a + 4))
    faces.append((0, 1, 2, 3)[::-1]); faces.append((12, 13, 14, 15))
    me = bpy.data.meshes.new("CarCabin"); me.from_pydata(verts, [], faces)
    me.materials.append(glass); me.materials.append(paint)
    cabin = new_obj("CarCabin", me, coll)
    sub = cabin.modifiers.new("sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 2
    bpy.context.view_layer.update()
    roof = box("CarRoof", (-0.25, -0.66, 1.40), (0.5, 0.66, 1.47), paint, coll, bevel=0.03)
    for x in (-1.32, 1.32):
        for y in (-0.82, 0.82):
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.33, depth=0.24, location=(x, y, 0.33),
                                                rotation=(math.pi / 2, 0, 0))
            t = bpy.context.active_object; t.name = "Tyre"; t.data.materials.append(tyre)
            bv = t.modifiers.new("b", "BEVEL"); bv.width = 0.05; bv.segments = 4
            for c in t.users_collection:
                c.objects.unlink(t)
            coll.objects.link(t)
            bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.2, depth=0.25, location=(x, y, 0.33),
                                                rotation=(math.pi / 2, 0, 0))
            r = bpy.context.active_object; r.name = "Rim"; r.data.materials.append(rim)
            for c in r.users_collection:
                c.objects.unlink(r)
            coll.objects.link(r)
    box("Bumper", (2.05, -0.82, 0.25), (2.22, 0.82, 0.42), chrome, coll, bevel=0.04)
    box("BumperR", (-2.22, -0.80, 0.25), (-2.05, 0.80, 0.42), chrome, coll, bevel=0.04)
    for y in (-0.6, 0.6):
        box("Headlamp", (2.02, y - 0.16, 0.55), (2.12, y + 0.16, 0.68), lamp, coll, bevel=0.02)
        box("Taillamp", (-2.14, y - 0.18, 0.58), (-2.05, y + 0.18, 0.7), tail, coll, bevel=0.02)
    root = bpy.data.objects.new("CarRoot", None); link(root, coll)
    for o in coll.objects:
        if o is not root and o.parent is None:
            o.parent = root
    root.location = loc; root.rotation_euler = (0, 0, rot_z)
    return coll, root
