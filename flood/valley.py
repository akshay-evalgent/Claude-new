"""The flooded crossing: a two-lane country road dipping across a creek valley, the floodwater (with
foam, chop, debris and cutaway sections), the depth gauge, signs, trees, poles, grass, ducks, arrows and
the "box of air". Storm and evening skies.

World layout (metres): the road runs along X through the origin; the creek valley runs along Y and the
floodwater flows towards -Y. The valley floor under the road is flat at FLOOR for |x| < FLAT_HALF and
ramps up to the ridges at about |x| = 46. Water height is the z of the "Level" empty (keyed per shot).
Cutaway sets rebuild the terrain, road and water cut by a vertical plane (y = Y_CUT or x = X_CUT).
"""
import math, os, random
import bmesh
import bpy
from mathutils import Vector, noise

import sets as S
import storm as ST

FLOOR = -1.4
RISE = 3.2
FLAT_HALF = 12.0
RAMP = 34.0
ROAD_HALF = 3.6
SHOULDER = 5.6
LANE_Y = -1.75
CAR_X = -4.0                  # where the car sits in the hypothetical shots (flat floor)
X_CUT = CAR_X + 2.75          # front cutaway plane (just ahead of the nose)
FLOW = 2.8                    # m/s along -Y
Y_CUT = -3.05                 # side cutaway plane (just in front of the car's right side)
FONT = os.path.join(os.environ["QS_SCRATCH"], "..", "fonts", "OpenSans-ExtraBold.ttf")
FPS = 24


def smooth(u):
    u = min(1.0, max(0.0, u))
    return u * u * (3 - 2 * u)


def base_h(x):
    return FLOOR + RISE * smooth((abs(x) - FLAT_HALF) / RAMP)


def washout(x, y):
    """0..1 scour hole under the road (only in the washout cutaway)."""
    return math.exp(-((x - 6.0) / 2.6) ** 2 - ((y - 0.3) / 4.8) ** 4)


def ground(x, y, wash=False):
    ax, ay = abs(x), abs(y)
    h = base_h(x)
    off = smooth((ay - 7.0) / 10.0)                    # 0 under the road embankment, 1 in the valley
    h -= (1 - smooth((ax - 10) / 26)) * 0.7 * off       # valley floor below the road deck
    h -= math.exp(-((x - 3.0) / 4.5) ** 2) * 1.1 * off  # creek channel
    h += smooth((ay - 420) / 120) * 4.0                 # valley closes far away
    h += 0.16 * noise.noise(Vector((x * 0.07, y * 0.07, 0.3))) * smooth((ay - 6.0) / 6.0)
    if wash:
        h -= 1.5 * washout(x, y)
    return h


def road_z(x):
    return base_h(x) + 0.03


def on_road(x, y, yaw=0.0, half_len=1.375):
    """Car root location and rotation sitting on the road at (x, y), heading yaw (deg)."""
    c, s_ = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    zf = road_z(x + c * half_len); zr = road_z(x - c * half_len)
    pitch = math.atan2(zf - zr, 2 * half_len)
    return Vector((x, y, (zf + zr) / 2)), (0.0, -pitch, math.radians(yaw))


def _axis(lo, hi, fine_lo, fine_hi, fine, coarse):
    out = []
    v = lo
    while v < hi:
        out.append(v)
        v += fine if fine_lo <= v < fine_hi else coarse
    out.append(hi)
    return out


# ----------------------------------------------------------------------------- materials
def ground_material():
    """Wet grass on the banks, mud below the high-water line."""
    m, nt, b = S._new_mat("ValleyGround")
    d = os.path.join(S.A, "tex", "leafy_grass")
    mp, tc = S._mapping(nt, 2.5)
    diff = S._tex(nt, os.path.join(d, "diff.jpg")); nt.links.new(mp.outputs[0], diff.inputs[0])
    nor = S._tex(nt, os.path.join(d, "nor.jpg"), True); nt.links.new(mp.outputs[0], nor.inputs[0])
    grass = S._mix(nt, 1.0, diff.outputs["Color"], (0.26, 0.36, 0.17), blend="MULTIPLY")
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sep.inputs[0])
    n = S._noise(nt, tc.outputs["Object"], 0.6, 4, 0.6)
    zz = S._math(nt, "ADD", sep.outputs[2], S._math(nt, "MULTIPLY", n, 0.5))
    mud_k = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", -0.3, zz), 2.5, clamp=True)
    mud_col = S._ramp(nt, S._noise(nt, tc.outputs["Object"], 1.8, 3, 0.6), [(0.35, (0.05, 0.035, 0.02)), (0.7, (0.11, 0.075, 0.045))])
    col = S._mix(nt, mud_k, grass, mud_col)
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(S._mix(nt, mud_k, 0.85, 0.3, kind="FLOAT"), b.inputs["Roughness"])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(nor.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def section_material(name, layers):
    """Cut face; UV v = depth below the surface (m). layers: [(depth, colour), ...]."""
    m, nt, b = S._new_mat(name)
    uv = nt.nodes.new("ShaderNodeUVMap")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uv.outputs["UV"], sep.inputs[0])
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = S._noise(nt, tc.outputs["Object"], 6.0, 3, 0.6)
    depth = S._math(nt, "ADD", sep.outputs[1], S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", n, 0.5), 0.06))
    top = max(d for d, _ in layers)
    stops = [(min(1.0, d / top), c) for d, c in layers]
    col = S._ramp(nt, S._math(nt, "DIVIDE", depth, top, clamp=True), stops)
    # pebbles
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 14
    nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
    peb = S._math(nt, "LESS_THAN", vor.outputs["Distance"], 0.16)
    col = S._mix(nt, S._math(nt, "MULTIPLY", peb, 0.6), col, (0.2, 0.18, 0.16))
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    return m


def water_material(name, scroll, foam_obj, calm=False, w_socks=None):
    """Opaque muddy floodwater: flow streaks, chop, foam around the car (foam_obj) and its wake."""
    m, nt, b = S._new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord"); tc.object = scroll
    p = tc.outputs["Object"]
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.4, 0.22, 1.0)
    nt.links.new(p, mp.inputs["Vector"])
    streak = S._noise(nt, mp.outputs[0], 2.2, 6, 0.62)
    chop = S._noise(nt, p, 1.6 if not calm else 0.9, 5, 0.6)
    n4 = nt.nodes.new("ShaderNodeTexNoise"); n4.noise_dimensions = "4D"
    n4.inputs["Scale"].default_value = 7.0; n4.inputs["Detail"].default_value = 2.0
    nt.links.new(p, n4.inputs["Vector"])
    if w_socks is not None:
        w_socks.append(n4.inputs["W"])
    hgt = S._math(nt, "ADD", S._math(nt, "MULTIPLY", chop, 0.6), S._math(nt, "MULTIPLY", streak, 0.5))
    hgt = S._math(nt, "ADD", hgt, S._math(nt, "MULTIPLY", n4.outputs["Fac"], 0.25))
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.22 if calm else 0.45
    bump.inputs["Distance"].default_value = 0.05
    nt.links.new(hgt, bump.inputs["Height"])
    mp2 = nt.nodes.new("ShaderNodeMapping"); mp2.inputs["Scale"].default_value = (3.2, 0.45, 1.0)
    nt.links.new(p, mp2.inputs["Vector"])
    fine = S._noise(nt, mp2.outputs[0], 3.5, 8, 0.7)
    foam = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", fine, 0.56 if not calm else 0.66), 3.2, clamp=True)
    patch = S._noise(nt, p, 0.22, 3, 0.5)
    patch = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", patch, 0.55), 4.0, clamp=True)
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 9.0
    nt.links.new(p, vor.inputs["Vector"])
    bub = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", vor.outputs["Distance"], 0.12), 4.0, clamp=True)
    foam = S._math(nt, "MAXIMUM", S._math(nt, "MULTIPLY", foam, 0.55),
                   S._math(nt, "MULTIPLY", S._math(nt, "MULTIPLY", patch, bub), 0.5 if not calm else 0.15))
    # foam around the obstacle and its wake (in foam_obj space: car along X, flow along -Y)
    tcf = nt.nodes.new("ShaderNodeTexCoord"); tcf.object = foam_obj
    sp = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tcf.outputs["Object"], sp.inputs[0])
    ex = S._math(nt, "DIVIDE", sp.outputs[0], 2.75); ey = S._math(nt, "DIVIDE", sp.outputs[1], 1.25)
    d = S._math(nt, "SQRT", S._math(nt, "ADD", S._math(nt, "MULTIPLY", ex, ex), S._math(nt, "MULTIPLY", ey, ey)))
    ring = S._math(nt, "MULTIPLY", S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", 1.45, d), 2.5, clamp=True),
                   S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", d, 0.75), 4.0, clamp=True))
    wake_w = S._math(nt, "SUBTRACT", 1.0, S._math(nt, "DIVIDE", S._math(nt, "ABSOLUTE", sp.outputs[0]), 2.6), clamp=True)
    wake_l = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", S._math(nt, "MULTIPLY", sp.outputs[1], -1.0), 0.9), 1.5, clamp=True)
    wake_f = S._math(nt, "SUBTRACT", 1.0, S._math(nt, "DIVIDE", S._math(nt, "MULTIPLY", sp.outputs[1], -1.0), 16.0), clamp=True)
    wake = S._math(nt, "MULTIPLY", S._math(nt, "MULTIPLY", wake_w, wake_l), wake_f)
    nf = S._noise(nt, tcf.outputs["Object"], 2.2, 5, 0.6)
    obs = S._math(nt, "MULTIPLY", S._math(nt, "ADD", ring, S._math(nt, "MULTIPLY", wake, 0.8)),
                  S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", nf, 0.38), 4.0, clamp=True))
    foam_k = nt.nodes.new("ShaderNodeValue"); foam_k.label = "ObstacleFoam"; foam_k.outputs[0].default_value = 1.0
    obs = S._math(nt, "MULTIPLY", obs, foam_k.outputs[0])
    foam = S._math(nt, "MAXIMUM", foam, obs)
    var = S._noise(nt, p, 0.25, 3, 0.5)
    water = S._ramp(nt, var, [(0.3, (0.15, 0.1, 0.052)), (0.7, (0.27, 0.185, 0.1))])
    col = S._mix(nt, foam, water, (0.62, 0.55, 0.45))
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(S._mix(nt, foam, 0.06, 0.55, kind="FLOAT"), b.inputs["Roughness"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    m["foam_k"] = foam_k.name
    return m, foam_k


def water_section_material():
    """The water's cut face: murky, see-through near the surface, a bright waterline."""
    m = bpy.data.materials.new("WaterSection"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    uv = nt.nodes.new("ShaderNodeUVMap")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(uv.outputs["UV"], sep.inputs[0])
    depth = sep.outputs[1]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    silt = S._noise(nt, tc.outputs["Object"], 3.0, 5, 0.65)
    murk = S._math(nt, "ADD", 0.1, S._math(nt, "MULTIPLY", depth, 0.55))
    murk = S._math(nt, "ADD", murk, S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", silt, 0.5), 0.25), clamp=True)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.7, 0.52, 0.32, 1)
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.2, 0.13, 0.07, 1)
    em.inputs["Strength"].default_value = 0.5
    df = nt.nodes.new("ShaderNodeBsdfDiffuse"); df.inputs["Color"].default_value = (0.2, 0.135, 0.07, 1)
    murkshader = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(em.outputs[0], murkshader.inputs[0]); nt.links.new(df.outputs[0], murkshader.inputs[1])
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(murk, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(murkshader.outputs[0], mix.inputs[2])
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.05
    fr = nt.nodes.new("ShaderNodeLayerWeight"); fr.inputs["Blend"].default_value = 0.15
    mix2 = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "MULTIPLY", fr.outputs["Fresnel"], 0.6), mix2.inputs[0])
    nt.links.new(mix.outputs[0], mix2.inputs[1]); nt.links.new(gl.outputs[0], mix2.inputs[2])
    line = nt.nodes.new("ShaderNodeEmission"); line.inputs["Color"].default_value = (0.95, 0.85, 0.65, 1)
    line.inputs["Strength"].default_value = 1.6
    mix3 = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "LESS_THAN", depth, 0.025), mix3.inputs[0])
    nt.links.new(mix2.outputs[0], mix3.inputs[1]); nt.links.new(line.outputs[0], mix3.inputs[2])
    nt.links.new(mix3.outputs[0], out.inputs["Surface"])
    return m


# ----------------------------------------------------------------------------- mesh builders
def heightfield(name, xs, ys, hfun, mats, coll, cut=None, bottom=-5.0, z_off=0.0, skip=None):
    """Grid z = hfun(x, y) + z_off over xs x ys. cut=("y", v): ys start at v, skirt down to `bottom`
    along that edge (material 1, UV v = depth below the surface); cut=("x", v): xs end at v.
    skip(x, y) -> True drops the face at that centre."""
    if cut and cut[0] == "y":
        ys = [cut[1]] + [y for y in ys if y > cut[1] + 1e-6]
    if cut and cut[0] == "x":
        xs = [x for x in xs if x < cut[1] - 1e-6] + [cut[1]]
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new((x, y, hfun(x, y) + z_off)) for x in xs] for y in ys]
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            if skip and skip((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2):
                continue
            fa = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            fa.smooth = True
            for lp in fa.loops:
                lp[uvl].uv = (lp.vert.co.x / 4, lp.vert.co.y / 4)
    if cut:
        edge = grid[0] if cut[0] == "y" else [row[-1] for row in grid]
        lows = [bm.verts.new((v.co.x, v.co.y, bottom)) for v in edge]
        for k in range(len(edge) - 1):
            a, b_, c, d = edge[k], edge[k + 1], lows[k + 1], lows[k]
            fa = bm.faces.new((a, d, c, b_))
            fa.material_index = 1
            for lp in fa.loops:
                top = (edge[k].co.z if lp.vert in (a, d) else edge[k + 1].co.z)
                lp[uvl].uv = (lp.vert.co.x if cut[0] == "y" else lp.vert.co.y, top - lp.vert.co.z)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for mt in mats:
        me.materials.append(mt)
    return S.new_obj(name, me, coll)


def _road(name, xs, ys, mats, coll, cut, z_add, skip, depth):
    if cut and cut[0] == "y":
        if min(ys) >= cut[1]:
            cut = None                       # wholly behind the cutting plane
        elif max(ys) <= cut[1]:
            return None                      # wholly cut away
        else:
            ys = [cut[1]] + [y for y in ys if y > cut[1] + 1e-6]
    if cut and cut[0] == "x":
        xs = [x for x in xs if x < cut[1] - 1e-6] + [cut[1]]
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new((x, y, road_z(x) + z_add)) for x in xs] for y in ys]
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            if skip and skip((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2):
                continue
            fa = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            for lp in fa.loops:
                lp[uvl].uv = (lp.vert.co.x / 4, lp.vert.co.y / 4)
    if cut:
        edge0 = grid[0] if cut[0] == "y" else [row[-1] for row in grid]
        off = Vector((0, -0.004, 0)) if cut[0] == "y" else Vector((0.004, 0, 0))
        edge = [bm.verts.new(v.co + off) for v in edge0]
        lows = [bm.verts.new(v.co + off - Vector((0, 0, depth))) for v in edge0]
        for k in range(len(edge) - 1):
            if skip and skip((edge[k].co.x + edge[k + 1].co.x) / 2, (edge[k].co.y + edge[k + 1].co.y) / 2):
                continue
            a, b_, c, d = edge[k], edge[k + 1], lows[k + 1], lows[k]
            fa = bm.faces.new((a, d, c, b_))
            fa.material_index = 1
            for lp in fa.loops:
                top_v = a if lp.vert in (a, d) else b_
                lp[uvl].uv = (0.0, top_v.co.z - lp.vert.co.z)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for mt in mats:
        me.materials.append(mt)
    return S.new_obj(name, me, coll)


def water_sheet(name, xs, ys, mats, coll, cut=None, bottom=-6.0):
    """Flat sheet at z=0 (parented to the Level empty); cut adds a vertical face down to `bottom` whose
    top row moves with the waves (vertex group 'wave')."""
    if cut and cut[0] == "y":
        ys = [cut[1] + 0.012] + [y for y in ys if y > cut[1] + 0.012 + 1e-6]
    if cut and cut[0] == "x":
        xs = [x for x in xs if x < cut[1] - 0.012 - 1e-6] + [cut[1] - 0.012]
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    grid = [[bm.verts.new((x, y, 0.0)) for x in xs] for y in ys]
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            fa = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
            fa.smooth = True
    lows = []
    if cut:
        edge = grid[0] if cut[0] == "y" else [row[-1] for row in grid]
        lows = [bm.verts.new((v.co.x, v.co.y, bottom)) for v in edge]
        for k in range(len(edge) - 1):
            a, b_, c, d = edge[k], edge[k + 1], lows[k + 1], lows[k]
            fa = bm.faces.new((a, d, c, b_))
            fa.material_index = 1
            for lp in fa.loops:
                lp[uvl].uv = (0.0, -lp.vert.co.z)
    bm.verts.index_update()
    low_idx = {v.index for v in lows}
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for mt in mats:
        me.materials.append(mt)
    o = S.new_obj(name, me, coll)
    g = o.vertex_groups.new(name="wave")
    g.add([v.index for v in me.vertices if v.index not in low_idx], 1.0, "REPLACE")
    o.visible_shadow = False
    return o


def add_waves(o, scroll, strength):
    tex = bpy.data.textures.get("Chop") or bpy.data.textures.new("Chop", "CLOUDS")
    tex.noise_scale = 0.9; tex.noise_depth = 2; tex.noise_basis = "BLENDER_ORIGINAL"
    dm = o.modifiers.new("waves", "DISPLACE")
    dm.texture = tex; dm.texture_coords = "OBJECT"; dm.texture_coords_object = scroll
    dm.strength = strength; dm.mid_level = 0.5; dm.vertex_group = "wave"; dm.direction = "Z"
    return dm


# ----------------------------------------------------------------------------- world
class World:
    """Stormy afternoon sky and golden evening sky, blended by a keyable EveningMix."""

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
        eve_img = bpy.data.images.load(os.path.join(S.A, "hdri", "qwantani_dawn_puresky.hdr"), check_existing=True)
        self.sun_az = -125.0                     # low sun downstream-left: backlights the river
        eve = env("qwantani_dawn_puresky", ST._sun_azimuth(eve_img) - self.sun_az)
        storm_col = S._mix(nt, 1.0, storm.outputs["Color"], (0.5, 0.54, 0.6), blend="MULTIPLY")
        self.mix = nt.nodes.new("ShaderNodeValue"); self.mix.label = "EveningMix"
        eve_col = S._mix(nt, 1.0, eve.outputs["Color"], (1.0, 0.84, 0.68), blend="MULTIPLY")
        col = S._mix(nt, self.mix.outputs[0], storm_col, eve_col)
        self.strength = nt.nodes.new("ShaderNodeValue"); self.strength.label = "SkyStrength"
        self.strength.outputs[0].default_value = 0.8
        nt.links.new(col, bg.inputs["Color"])
        nt.links.new(self.strength.outputs[0], bg.inputs["Strength"])
        self.sun = ST.World._sun(self, "EveningSun", (1.0, 0.7, 0.45), 0.0, az=self.sun_az, el=8, angle=1.5)
        self.storm_sun = ST.World._sun(self, "StormKey", (0.8, 0.86, 1.0), 0.0, az=60, el=50, angle=25)

    def set_mode(self, frame, evening):
        ST.key_value(self.mix.outputs[0], frame, 1.0 if evening else 0.0)
        ST.key_value(self.strength.outputs[0], frame, 1.0 if evening else 0.8)
        self.sun.data.energy = 5.0 if evening else 0.0
        self.sun.data.keyframe_insert("energy", frame=frame)
        self.storm_sun.data.energy = 0.0 if evening else 0.6
        self.storm_sun.data.keyframe_insert("energy", frame=frame)


# ----------------------------------------------------------------------------- the set
class Valley:
    def __init__(self, w_socks):
        self.w_socks = w_socks
        self.coll = S.collection("Valley")
        self.cut_coll = {k: S.collection("Cut" + k) for k in ("Y", "X", "W")}
        self.level = bpy.data.objects.new("Level", None); S.link(self.level)
        self.level.location = (0, 0, FLOOR + 0.3)
        self.scroll = bpy.data.objects.new("WaveScroll", None); S.link(self.scroll)
        self.scroll_calm = bpy.data.objects.new("WaveScrollCalm", None); S.link(self.scroll_calm)
        self.foam = bpy.data.objects.new("FoamCentre", None); S.link(self.foam)
        self.foam.location = (0, 500, 0)
        for o, v in ((self.scroll, FLOW), (self.scroll_calm, 0.5)):
            o.scale = (1.0, 1.6, 1.0)
            o.location = (0, 0, 0); o.keyframe_insert("location", frame=1)
            o.location = (0, -v * 70, 0); o.keyframe_insert("location", frame=1 + 70 * FPS)
            ST.set_interp(o, "LINEAR")
        self.mats = {
            "ground": ground_material(),
            "soil": section_material("SoilSection", [(0.0, (0.14, 0.09, 0.048)), (0.3, (0.21, 0.14, 0.075)),
                                                      (1.2, (0.29, 0.2, 0.11)), (3.0, (0.17, 0.12, 0.07))]),
            "roadsec": section_material("RoadSection", [(0.0, (0.045, 0.045, 0.05)), (0.1, (0.05, 0.05, 0.055)),
                                                         (0.13, (0.34, 0.31, 0.26)), (0.45, (0.27, 0.24, 0.19))]),
            "asphalt": ST.wet_ground("WetAsphalt", "asphalt_02", 3.0, 0.55, 0.35, puddles=0.5, ripple_w=w_socks),
            "gravel": ST.wet_ground("WetGravel", "gravel_road", 2.0, 0.55, 0.5),
            "yellow": S.flat("LineYellow", (0.55, 0.38, 0.02), 0.3),
            "white": S.flat("LineWhite", (0.7, 0.7, 0.68), 0.3),
        }
        self.water_mat, self.foam_k = water_material("Floodwater", self.scroll, self.foam, w_socks=w_socks)
        self.calm_mat, _ = water_material("CalmRiver", self.scroll_calm, self.foam, calm=True, w_socks=w_socks)
        self.calm_mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.04
        self.sec_mat = water_section_material()
        xs = _axis(-600, 600, -70, 70, 0.6, 6.0)
        ys = _axis(-700, 700, -45, 45, 0.6, 4.0)
        self.main = self._build_ground("", xs, ys, None, self.coll)
        self.cuts = {
            "Y": self._build_ground("CutY", _axis(-600, 600, -40, 40, 0.4, 6.0), _axis(-160, 700, -10, 30, 0.4, 5.0),
                                    ("y", Y_CUT), self.cut_coll["Y"]),
            "X": self._build_ground("CutX", _axis(-600, 600, -40, 40, 0.4, 6.0), _axis(-700, 700, -30, 30, 0.4, 5.0),
                                    ("x", X_CUT), self.cut_coll["X"]),
            "W": self._build_ground("CutW", _axis(-600, 600, -30, 30, 0.3, 6.0), _axis(-160, 700, -10, 30, 0.3, 5.0),
                                    ("y", Y_CUT), self.cut_coll["W"], wash=True),
        }
        self.calm = self._water("CalmRiver", self.calm_mat, None, self.coll, self.scroll_calm, 0.03,
                                _axis(-48, 48, -48, 48, 1.0, 1.0), _axis(-700, 440, -150, 60, 1.0, 5.0))
        self.slabs = self._slabs()

    def _build_ground(self, tag, xs, ys, cut, coll, wash=False):
        m = self.mats
        out = {}
        out["terrain"] = heightfield("Terrain" + tag, xs, ys, lambda x, y: ground(x, y, wash), [m["ground"], m["soil"]],
                                     coll, cut=cut)
        rx = [x for x in xs if -400 <= x <= 400] if not cut else xs
        skip = (lambda x, y: washout(x, y) > 0.22) if wash else None
        sec = m["roadsec"] if cut else None
        y_lo = -ROAD_HALF
        out["road"] = _road("Road" + tag, rx, [y_lo + 2 * ROAD_HALF * k / 6 for k in range(7)], [m["asphalt"]] + ([sec] if sec else []),
                            coll, cut, 0.0, skip, 0.45)
        for side in (1, -1):
            ya, yb = side * ROAD_HALF, side * SHOULDER
            out[f"shoulder{side}"] = _road(f"Shoulder{tag}{side}", rx, [min(ya, yb) + abs(yb - ya) * k / 2 for k in range(3)],
                                           [m["gravel"]] + ([sec] if sec else []), coll, cut, -0.012, skip, 0.4)
        for nm, y, mat, wd in (("CentreA", 0.09, "yellow", 0.1), ("CentreB", -0.09, "yellow", 0.1),
                               ("EdgeL", ROAD_HALF - 0.15, "white", 0.12), ("EdgeR", -(ROAD_HALF - 0.15), "white", 0.12)):
            if cut and cut[0] == "y" and y - wd / 2 < cut[1]:
                continue
            out[nm] = _road(f"{nm}{tag}", rx, [y - wd / 2, y + wd / 2], [m[mat]], coll,
                            cut if cut and cut[0] == "x" else None, 0.004, skip, 0.0)
        wxs = _axis(-48, 48, -30, 30, 0.35, 0.7)
        wys = _axis(-700, 440, -60, 60, 0.35, 2.5)
        out["water"] = self._water("Water" + tag, self.water_mat, self.sec_mat if cut else None, coll, self.scroll, 0.12,
                                   wxs, wys, cut)
        return {k: v for k, v in out.items() if v is not None}

    def _water(self, name, mat, sec, coll, scroll, strength, xs, ys, cut=None):
        o = water_sheet(name, xs, ys, [mat] + ([sec] if sec else []), coll, cut)
        o.parent = self.level
        add_waves(o, scroll, strength)
        return o

    def _slabs(self):
        """Broken asphalt slabs tipped into the scour hole (washout cutaway only)."""
        rnd = random.Random(3)
        out = []
        for i, (x, y, rx, ry) in enumerate(((4.4, -1.0, 18, -10), (7.6, 0.4, -24, 8), (5.8, 2.2, 10, 30), (6.6, -2.4, -14, -6))):
            z = ground(x, y, True) + 0.25
            o = S.box(f"Slab{i}", (-0.7, -0.9, -0.06), (0.7, 0.9, 0.06), self.mats["asphalt"], self.cut_coll["W"], 0.01)
            o.location = (x, y, z); o.rotation_euler = (math.radians(rx), math.radians(ry), rnd.uniform(-0.5, 0.5))
            out.append(o)
        return out


# ----------------------------------------------------------------------------- props
def _text(name, body, size, mat, coll, loc, rot, align="CENTER"):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body
    cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    cu.size = size; cu.align_x = align; cu.align_y = "CENTER"; cu.extrude = 0.002
    cu.materials.append(mat)
    o = S.new_obj(name, cu, coll); o.location = loc; o.rotation_euler = rot
    return o


def depth_gauge(coll, x, y):
    """Roadside flood-depth post: white board, tick marks every 6 inches, feet numbered."""
    z0 = ground(x, y)
    post = S.flat("GaugePost", (0.5, 0.52, 0.55), 0.35, 0.8)
    m, nt, b = S._new_mat("GaugeBoard")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ft = 0.3048
    ph = S._math(nt, "FRACT", S._math(nt, "DIVIDE", sep.outputs[2], ft / 2))
    tick = S._math(nt, "LESS_THAN", ph, 0.07)
    tick_w = S._math(nt, "LESS_THAN", sep.outputs[0], -0.02)   # short ticks on the left half
    ph2 = S._math(nt, "FRACT", S._math(nt, "DIVIDE", sep.outputs[2], ft))
    big = S._math(nt, "LESS_THAN", ph2, 0.035)
    black = S._math(nt, "MAXIMUM", S._math(nt, "MULTIPLY", tick, tick_w), big)
    nt.links.new(S._mix(nt, black, (0.85, 0.85, 0.82), (0.02, 0.02, 0.02)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.4
    root = bpy.data.objects.new("Gauge", None); S.link(root, coll); root.location = (x, y, z0)
    root.rotation_euler = (0, 0, 0)                     # board faces -Y (across the road)
    p = S.box("GaugePole", (-0.03, 0.02, -0.3), (0.03, 0.08, 1.45), post, coll, 0.005); p.parent = root
    bd = S.box("GaugeBoard", (-0.11, -0.02, 0.0), (0.11, 0.0, 1.22), m, coll, 0.0); bd.parent = root
    red = S.flat("GaugeRed", (0.6, 0.03, 0.02), 0.4)
    cap = S.box("GaugeCap", (-0.11, -0.021, 1.22), (0.11, 0.001, 1.32), red, coll, 0.0); cap.parent = root
    blk = S.flat("GaugeInk", (0.02, 0.02, 0.02), 0.5)
    for k in (1, 2, 3):
        t = _text(f"GaugeNum{k}", str(k), 0.12, blk, coll, (0.055, -0.024, k * ft - 0.075), (math.radians(90), 0, 0))
        t.parent = root
    return root


def warning_sign(coll, name, x, y, lines, face_yaw, col=(0.95, 0.68, 0.02), diamond=True, h=1.9, w=0.9):
    z0 = ground(x, y)
    root = bpy.data.objects.new(name, None); S.link(root, coll); root.location = (x, y, z0)
    root.rotation_euler = (0, 0, math.radians(face_yaw))
    post = S.flat(name + "Post", (0.45, 0.46, 0.48), 0.35, 0.8)
    p = S.box(name + "Pole", (-0.03, 0.01, 0), (0.03, 0.06, h + 0.2), post, coll, 0.005); p.parent = root
    face = S.flat(name + "Face", col, 0.35)
    ink = S.flat(name + "Ink", (0.015, 0.015, 0.015), 0.5)
    bm = bmesh.new()
    if diamond:
        r = w / math.sqrt(2)
        pts = [(0, h + r), (r, h), (0, h - r), (-r, h)]
        inner = [(0, h + r * 0.9), (r * 0.9, h), (0, h - r * 0.9), (-r * 0.9, h)]
    else:
        pts = [(-w / 2, h + 0.3), (w / 2, h + 0.3), (w / 2, h - 0.3), (-w / 2, h - 0.3)]
        inner = [(-w / 2 + 0.03, h + 0.27), (w / 2 - 0.03, h + 0.27), (w / 2 - 0.03, h - 0.27), (-w / 2 + 0.03, h - 0.27)]
    vb = [bm.verts.new((px, 0.0, pz)) for px, pz in pts]
    bm.faces.new(vb[::-1])
    vi = [bm.verts.new((px, -0.004, pz)) for px, pz in inner]
    vo = [bm.verts.new((px, -0.004, pz)) for px, pz in pts]
    for k in range(4):
        fa = bm.faces.new((vo[k], vo[(k + 1) % 4], vi[(k + 1) % 4], vi[k])); fa.material_index = 1
    fa = bm.faces.new(vi); fa.material_index = 0
    me = bpy.data.meshes.new(name + "Board"); bm.to_mesh(me); bm.free()
    me.materials.append(face); me.materials.append(ink)
    bd = S.new_obj(name + "Board", me, coll); bd.parent = root
    n = len(lines)
    for i, (txt, size) in enumerate(lines):
        zz = h + (n - 1) * 0.5 * size * 1.15 - i * size * 1.15
        t = _text(f"{name}Txt{i}", txt, size, ink, coll, (0, -0.006, zz), (math.radians(90), 0, 0)); t.parent = root
    return root


def detour_arrow(coll, root, h):
    ink = bpy.data.materials.get("DetourInk")
    bm = bmesh.new()
    pts = [(-0.3, 0.035), (0.12, 0.035), (0.12, 0.1), (0.3, 0.0), (0.12, -0.1), (0.12, -0.035), (-0.3, -0.035)]
    vs = [bm.verts.new((px, -0.006, h - 0.15 + pz)) for px, pz in pts]
    bm.faces.new(vs)
    me = bpy.data.meshes.new("DetourArrow"); bm.to_mesh(me); bm.free(); me.materials.append(ink)
    o = S.new_obj("DetourArrow", me, coll); o.parent = root
    return o


def trees(coll):
    leaf = ST.foliage_material("Leaves", (0.035, 0.055, 0.028))
    bark = S.flat("Bark", (0.04, 0.03, 0.025), 0.9)
    pc = S.collection("TreeProto")
    protos = [S.new_obj(f"TreeProto{i}", ST._tree_mesh(f"Tree{i}", 21 + i, leaf, bark), pc) for i in range(6)]
    bpy.context.view_layer.layer_collection.children[pc.name].exclude = True
    rnd = random.Random(8)
    k = 0
    for i in range(900):
        x = rnd.uniform(-420, 420); y = rnd.uniform(-520, 420)
        if abs(y) < 12 or (abs(x) < 46 and -60 < y < 40) or (abs(x) < 27 and y < -60):
            continue
        cluster = rnd.randint(1, 3)
        for j in range(cluster):
            xx, yy = x + rnd.uniform(-5, 5), y + rnd.uniform(-5, 5)
            o = bpy.data.objects.new(f"Tree{k}", rnd.choice(protos).data); S.link(o, coll); k += 1
            o.location = (xx, yy, ground(xx, yy) - 0.1)
            o.rotation_euler = (0, 0, rnd.uniform(0, 6.28)); o.scale = (rnd.uniform(0.8, 1.5),) * 3
    return k


def poles(coll, y=9.0, spacing=46.0, x0=-460, x1=460):
    wood = S.flat("PoleWood", (0.09, 0.065, 0.045), 0.8)
    wire_m = S.flat("Wire", (0.01, 0.01, 0.01), 0.4)
    proto = S.collection("PoleProto")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.15, radius2=0.12, depth=10.5)
    for v in bm.verts:
        v.co.z += 5.25
    me = bpy.data.meshes.new("Pole"); bm.to_mesh(me); bm.free(); me.materials.append(wood)
    S.new_obj("Pole", me, proto)
    S.box("Crossarm", (-0.06, -1.25, 9.55), (0.06, 1.25, 9.67), wood, proto)
    bpy.context.view_layer.layer_collection.children[proto.name].exclude = True
    xs = [x0 + i * spacing for i in range(int((x1 - x0) / spacing) + 1)]
    tops = {}
    for x in xs:
        z = ground(x, y)
        inst = bpy.data.objects.new(f"PoleInst{x}", None); S.link(inst, coll)
        inst.instance_type = "COLLECTION"; inst.instance_collection = proto
        inst.location = (x, y, z - 0.2); tops[x] = z - 0.2
    cu = bpy.data.curves.new("Wires", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.009
    for a, b in zip(xs[:-1], xs[1:]):
        for yy in (-1.05, 0.0, 1.05):
            sp = cu.splines.new("POLY"); n = 16; sp.points.add(n)
            for i in range(n + 1):
                t = i / n
                z = tops[a] + (tops[b] - tops[a]) * t
                sp.points[i].co = (a + (b - a) * t, y + yy, z + 9.7 - 1.0 * 4 * t * (1 - t), 1)
    cu.materials.append(wire_m)
    S.new_obj("Wires", cu, coll)


def grass(coll):
    pc = S.collection("GrassProto")
    S.import_gltf("grass_medium_01", pc, (0, 0, 0))
    bpy.context.view_layer.layer_collection.children[pc.name].exclude = True
    rnd = random.Random(9)
    n = 0
    for i in range(2600):
        x = rnd.uniform(-90, 90); y = rnd.choice((1, -1)) * rnd.uniform(SHOULDER - 0.2, 30)
        if i % 3 == 0:
            y = rnd.uniform(-60, 40)
        z = ground(x, y)
        if z < -0.45 or (abs(y) < SHOULDER - 0.2):
            continue
        inst = bpy.data.objects.new(f"Grass{n}", None); S.link(inst, coll); n += 1
        inst.instance_type = "COLLECTION"; inst.instance_collection = pc
        inst.location = (x, y, z - 0.03); inst.rotation_euler = (0, 0, rnd.uniform(0, 6.28))
        inst.scale = (rnd.uniform(0.9, 1.9),) * 3
    return n


def debris(coll, level, n=14, seed=5):
    """Branches and leaf rafts drifting with the current (children of the Level empty)."""
    rnd = random.Random(seed)
    bark = S.flat("DebrisBark", (0.07, 0.05, 0.035), 0.85)
    leaf = ST.foliage_material("DebrisLeaves", (0.06, 0.06, 0.02))
    objs = []
    for i in range(n):
        bm = bmesh.new()
        L = rnd.uniform(0.8, 2.2)
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=rnd.uniform(0.03, 0.07), radius2=0.015, depth=L)
        for v in r["verts"]:
            v.co = Vector((v.co.z, v.co.y, v.co.x))
        for k in range(rnd.randint(1, 3)):
            r2 = bmesh.ops.create_cone(bm, cap_ends=True, segments=5, radius1=0.02, radius2=0.008, depth=L * 0.4)
            a = rnd.uniform(-0.9, 0.9); off = rnd.uniform(-L / 3, L / 3)
            for v in r2["verts"]:
                p = Vector((v.co.z + L * 0.2, v.co.y, v.co.x))
                p.rotate(__import__("mathutils").Euler((0, 0, a)))
                v.co = p + Vector((off, 0, 0))
        nleaf = len(bm.faces)
        if rnd.random() < 0.5:
            s = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.25)
            for v in s["verts"]:
                v.co = Vector((v.co.x * 1.4 + rnd.uniform(-0.3, 0.3), v.co.y, v.co.z * 0.35))
        me = bpy.data.meshes.new(f"Debris{i}"); bm.to_mesh(me); bm.free()
        me.materials.append(bark); me.materials.append(leaf)
        me.polygons.foreach_set("material_index", [0 if k < nleaf else 1 for k in range(len(me.polygons))])
        o = S.new_obj(f"Debris{i}", me, coll); o.parent = level
        x = rnd.uniform(-11, 11)
        y0 = rnd.uniform(-60, 60)
        o.rotation_euler = (0, 0, rnd.uniform(0, 6.28))
        # drift along -Y with wrap-around (the jump happens far out of frame)
        T = 70 * FPS
        spd = FLOW * rnd.uniform(0.8, 1.05)
        fr = 1; y = y0
        while fr < T:
            o.location = (x, y, 0.0); o.keyframe_insert("location", frame=fr)
            dt = (y + 70) / spd
            f2 = fr + max(1, int(dt * FPS))
            o.location = (x, -70.0, 0.0); o.keyframe_insert("location", frame=f2)
            fr = f2 + 1; y = 70.0
        ST.set_interp(o, "LINEAR")
        ad = o.animation_data
        for fc in ST._fcurves(ad.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
        o.rotation_mode = "XYZ"
        for ax in range(3):
            o.keyframe_insert("rotation_euler", index=ax, frame=1)
        for fc in ST._fcurves(ad.action):
            if fc.data_path == "rotation_euler":
                mod = fc.modifiers.new("NOISE"); mod.scale = 18; mod.strength = 0.25 if fc.array_index < 2 else 0.8
                mod.phase = rnd.uniform(0, 100)
        objs.append(o)
    return objs


def arrow(name, coll, mat, length=1.0, radius=0.05):
    bm = bmesh.new()
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=radius, radius2=radius, depth=length * 0.7)
    for v in r["verts"]:
        v.co.z += length * 0.35
    r = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=radius * 2.6, radius2=0.0, depth=length * 0.3)
    for v in r["verts"]:
        v.co.z += length * 0.85
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj(name, me, coll); o.visible_shadow = False
    return o


def air_material():
    m = bpy.data.materials.new("AirBox"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (0.55, 0.85, 1.0, 1)
    em.inputs["Strength"].default_value = 1.4
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    k = nt.nodes.new("ShaderNodeValue"); k.label = "AirGlow"; k.outputs[0].default_value = 1.0
    fac = S._math(nt, "MULTIPLY", S._math(nt, "ADD", S._math(nt, "POWER", lw.outputs["Facing"], 1.6), 0.18), k.outputs[0], clamp=True)
    nt.links.new(S._math(nt, "MULTIPLY", fac, 0.7), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m, k


def duck_mesh():
    bm = bmesh.new()
    parts = []
    def ell(c, r, mat, seg=12):
        s = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2 + 1, radius=1.0)
        for v in s["verts"]:
            v.co = Vector((c[0] + v.co.x * r[0], c[1] + v.co.y * r[1], c[2] + v.co.z * r[2]))
        fs = {f for v in s["verts"] for f in v.link_faces}
        for f in fs:
            f.material_index = mat
    ell((0, 0, 0.03), (0.17, 0.095, 0.075), 0)      # body
    ell((-0.15, 0, 0.07), (0.06, 0.05, 0.04), 0)    # tail
    ell((0.12, 0, 0.13), (0.055, 0.045, 0.06), 1, 10)   # head (green)
    ell((0.1, 0, 0.075), (0.045, 0.05, 0.03), 2, 8)     # white neck ring
    ell((0.185, 0, 0.12), (0.04, 0.022, 0.01), 3, 8)    # bill
    me = bpy.data.meshes.new("Duck"); bm.to_mesh(me); bm.free()
    for nm, col, r in (("DuckBody", (0.2, 0.15, 0.1), 0.6), ("DuckHead", (0.02, 0.12, 0.05), 0.3),
                       ("DuckRing", (0.8, 0.8, 0.78), 0.5), ("DuckBill", (0.75, 0.5, 0.05), 0.4)):
        me.materials.append(S.flat(nm, col, r))
    for p in me.polygons:
        p.use_smooth = True
    return me


def spray_material():
    m = bpy.data.materials.new("Spray"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    df = nt.nodes.new("ShaderNodeBsdfDiffuse"); df.inputs["Color"].default_value = (0.75, 0.68, 0.58, 1)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader"); mix.inputs[0].default_value = 0.75
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(df.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m
