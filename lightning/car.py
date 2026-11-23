"""Procedural mid-size sedan (and a soft-top convertible) for the lightning short.

Car space: +X forward, +Y left, +Z up, origin on the ground midway between the axles.
The body is lofted from smooth side/plan profiles; the wheel wells are boolean pockets; the cabin
(greenhouse) is a second loft whose faces are split into glass, pillars and roof by grid position, so
window outlines follow the pillars. Everything that animates is a separate object: rear window (so it
can shatter), antenna (melts), wheels (tire with a "Flat" shape key, steel rim, hubcap that can roll
away), wipers, plus emissive gauge/hazard materials that can be keyed.
"""
import math, random
import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import sets as S  # quicksand material/geometry helpers (shared)

L2 = 2.35            # half length
W2 = 0.91            # half width
AXLE = 1.375         # axle x (front +, rear -)
WHEEL_R = 0.33
TRACK = 0.78         # wheel centre |y|
CAB_F, CAB_R = 1.05, -1.62      # windshield base / rear window base (x)
ROOF_F, ROOF_R = 0.25, -0.75    # windshield top / rear window top (x)
B_PILLAR = -0.30
SEAT_X = -0.16                  # front seat H-point x
DRIVER_Y = 0.37                 # driver sits on the left (+Y)
H_POINT_Z = 0.52


# ----------------------------------------------------------------------------- profiles
def _catmull(pts, x):
    """Smooth curve through control points [(x, z), ...] (any x order), evaluated at x."""
    p = sorted(pts)
    if x <= p[0][0]:
        return p[0][1]
    if x >= p[-1][0]:
        return p[-1][1]
    for i in range(len(p) - 1):
        if p[i][0] <= x <= p[i + 1][0]:
            break
    p0 = p[max(0, i - 1)]; p1 = p[i]; p2 = p[i + 1]; p3 = p[min(len(p) - 1, i + 2)]
    t = (x - p1[0]) / (p2[0] - p1[0])
    m1 = (p2[1] - p0[1]) / max(1e-6, p2[0] - p0[0]) * (p2[0] - p1[0])
    m2 = (p3[1] - p1[1]) / max(1e-6, p3[0] - p1[0]) * (p2[0] - p1[0])
    t2, t3 = t * t, t * t * t
    return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2


TOP = [(2.35, 0.56), (2.27, 0.70), (2.05, 0.80), (1.6, 0.86), (1.05, 0.93), (0.3, 0.955), (-0.6, 0.97),
       (-1.62, 1.0), (-2.12, 1.0), (-2.28, 0.90), (-2.35, 0.72)]
BOT = [(2.35, 0.34), (2.2, 0.24), (1.9, 0.21), (0.0, 0.2), (-1.9, 0.21), (-2.2, 0.25), (-2.35, 0.38)]
CAB_TOP = [(1.05, 0.93), (0.62, 1.20), (0.25, 1.415), (-0.2, 1.445), (-0.75, 1.42), (-1.2, 1.22), (-1.62, 1.0)]


def top(x):
    return _catmull(TOP, x)


def bot(x):
    return _catmull(BOT, x)


def cab_top(x):
    return _catmull(CAB_TOP, x)


def half_w(x):
    """Plan-view half width: rounded nose and tail."""
    p = 4.6 if x > 0 else 6.0
    u = min(0.999, abs(x) / L2)
    return W2 * (1 - u ** p) ** (1 / p)


# ----------------------------------------------------------------------------- materials
def paint(name, col):
    """Metallic flake paint with clear coat, door-seam grooves, and interior trim on the back faces."""
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Metallic"].default_value = 0.55
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.04
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    nsep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Normal"], nsep.inputs[0])
    # door seams: thin grooves at fixed x on the sides, below the belt
    seam = None
    for x0 in (0.97, B_PILLAR, -1.33):
        d = S._math(nt, "ABSOLUTE", S._math(nt, "SUBTRACT", sep.outputs[0], x0))
        line = S._math(nt, "SUBTRACT", 1.0, S._math(nt, "MULTIPLY", d, 1 / 0.004, clamp=True))
        seam = line if seam is None else S._math(nt, "MAXIMUM", seam, line)
    side = S._math(nt, "GREATER_THAN", S._math(nt, "ABSOLUTE", nsep.outputs[1]), 0.55)
    below = S._math(nt, "LESS_THAN", sep.outputs[2], 0.95)
    above = S._math(nt, "GREATER_THAN", sep.outputs[2], 0.3)
    seam = S._math(nt, "MULTIPLY", S._math(nt, "MULTIPLY", seam, side), S._math(nt, "MULTIPLY", below, above))
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.6; bump.inputs["Distance"].default_value = 0.003
    nt.links.new(S._math(nt, "SUBTRACT", 1.0, seam), bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    nt.links.new(S._mix(nt, seam, (*col,), (0.02, 0.02, 0.02)), b.inputs["Base Color"])
    # back faces = interior trim
    trim = nt.nodes.new("ShaderNodeBsdfPrincipled")
    trim.inputs["Base Color"].default_value = (0.05, 0.05, 0.055, 1); trim.inputs["Roughness"].default_value = 0.8
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mix.inputs[0])
    nt.links.new(b.outputs[0], mix.inputs[1]); nt.links.new(trim.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def glass(name, tint=(0.75, 0.82, 0.85), rain=True):
    """Thin car glass: transparent with fresnel reflections and static rain beads."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (*tint, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.02
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    fac = S._math(nt, "ADD", S._math(nt, "MULTIPLY", lw.outputs["Fresnel"], 0.75), 0.08)
    if rain:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 140
        nt.links.new(tc.outputs["Object"], vor.inputs["Vector"])
        drop = S._math(nt, "SUBTRACT", 1.0, S._math(nt, "MULTIPLY", vor.outputs["Distance"], 3.2, clamp=True))
        n2 = S._noise(nt, tc.outputs["Object"], 9, 2, 0.5)
        drop = S._math(nt, "MULTIPLY", drop, S._math(nt, "GREATER_THAN", n2, 0.47))
        bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35
        bump.inputs["Distance"].default_value = 0.002
        nt.links.new(drop, bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], gl.inputs["Normal"])
        fac = S._math(nt, "ADD", fac, S._math(nt, "MULTIPLY", drop, 0.12))
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(fac, mix.inputs[0]); nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(gl.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def emissive(name, col, strength, base=(0.05, 0.05, 0.05)):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (*base, 1)
    b.inputs["Roughness"].default_value = 0.15
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


def xray(name, edge=(0.45, 0.8, 1.0), fill=(0.6, 0.85, 1.0)):
    """Zack-style x-ray shell: nearly clear faces, glowing silhouette edges."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*edge, 1)
    em.inputs["Strength"].default_value = 2.2
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Color"].default_value = (*fill, 1)
    gl.inputs["Roughness"].default_value = 0.15
    add = nt.nodes.new("ShaderNodeAddShader"); nt.links.new(em.outputs[0], add.inputs[0]); nt.links.new(gl.outputs[0], add.inputs[1])
    fac = S._math(nt, "ADD", S._math(nt, "POWER", lw.outputs["Facing"], 2.2), 0.05)
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(S._math(nt, "MULTIPLY", fac, 0.85, clamp=True), mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(add.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    return m


def tire_material(name):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (0.018, 0.018, 0.02, 1)
    b.inputs["Roughness"].default_value = 0.75
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ang = S._math(nt, "ARCTAN2", sep.outputs[2], sep.outputs[0])
    tread = S._math(nt, "SINE", S._math(nt, "MULTIPLY", ang, 70.0))
    groove = S._math(nt, "SINE", S._math(nt, "MULTIPLY", sep.outputs[1], 90.0))
    r = S._math(nt, "SQRT", S._math(nt, "ADD", S._math(nt, "MULTIPLY", sep.outputs[0], sep.outputs[0]),
                                       S._math(nt, "MULTIPLY", sep.outputs[2], sep.outputs[2])))
    on_tread = S._math(nt, "GREATER_THAN", r, WHEEL_R - 0.025)
    h = S._math(nt, "MULTIPLY", S._math(nt, "MAXIMUM", tread, groove), on_tread)
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.8; bump.inputs["Distance"].default_value = 0.006
    nt.links.new(h, bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


# ----------------------------------------------------------------------------- mesh helpers
def _mesh(name, verts, faces, mats, mat_idx=None, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    for mt in mats:
        me.materials.append(mt)
    if mat_idx is not None:
        me.polygons.foreach_set("material_index", mat_idx)
    for p in me.polygons:
        p.use_smooth = smooth
    me.validate()
    return me


def _loft(rings, closed=True):
    """Quads between consecutive rings (lists of points, same length)."""
    n = len(rings[0])
    verts = [v for r in rings for v in r]
    faces = []
    span = n if closed else n - 1
    for i in range(len(rings) - 1):
        for j in range(span):
            a = i * n + j; b = i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n))
    return verts, faces


def _outward(me, centre):
    """Make an open surface's normals point away from `centre` (consistent winding first)."""
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    score = sum((f.calc_center_median() - centre).dot(f.normal) * f.calc_area() for f in bm.faces)
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    bm.to_mesh(me); bm.free()


def _evaluated(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)
    return obj


# ----------------------------------------------------------------------------- body
def lower_body(name, mats, coll, nu=150, nv=72):
    """Closed lower body with wheel-well pockets and the cabin opening cut out of its top.
    mats: dict with paint, under, grille, head, tail, trim, well."""
    xs = [L2 - 0.004 - (2 * L2 - 0.008) * (0.5 - 0.5 * math.cos(math.pi * i / nu)) for i in range(nu + 1)]
    rings = []
    n_exp = 7.0
    for x in xs:
        zt, zb, w = top(x), bot(x), half_w(x)
        zc, h = (zt + zb) / 2, (zt - zb) / 2
        ring = []
        for j in range(nv):
            t = 2 * math.pi * j / nv
            c, s = math.cos(t), math.sin(t)
            y = w * math.copysign(abs(c) ** (2 / n_exp), c)
            z = zc + h * math.copysign(abs(s) ** (2 / 3.2 if s > 0 else 2 / n_exp), s)
            zn = (z - zb) / max(1e-6, zt - zb)
            y *= 1 - 0.05 * (1 - zn) ** 2 - 0.06 * max(0, zn - 0.75) / 0.25  # tuck under, rounded shoulder
            ring.append(Vector((x, y, z)))
        rings.append(ring)
    verts, faces = _loft(rings)
    # end caps
    n = nv
    for end, ring_i in ((0, 0), (1, len(rings) - 1)):
        c = sum(rings[ring_i], Vector()) / n
        ci = len(verts); verts.append(c)
        base = ring_i * n
        for j in range(n):
            a, b = base + j, base + (j + 1) % n
            faces.append((a, b, ci) if end == 1 else (b, a, ci))
    me = _mesh(name, verts, faces, [mats["paint"]])
    obj = S.new_obj(name, me, coll)
    # wheel-well pockets
    cutter_me = bpy.data.meshes.new(name + "_wells")
    bm = bmesh.new()
    for ax in (AXLE, -AXLE):
        for side in (1, -1):
            r = bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.385, radius2=0.385, depth=0.5)
            for v in r["verts"]:
                v.co = Matrix.Rotation(math.pi / 2, 3, "X") @ v.co + Vector((ax, side * (0.55 + 0.25 + 0.1), 0.33))
    bm.to_mesh(cutter_me); bm.free()
    cutter_me.materials.append(mats["well"])
    cutter = S.new_obj(name + "_wells", cutter_me, coll)
    bo = obj.modifiers.new("wells", "BOOLEAN"); bo.operation = "DIFFERENCE"; bo.object = cutter
    bo.solver = "EXACT"; bo.material_mode = "TRANSFER"
    _evaluated(obj)
    bpy.data.objects.remove(cutter); bpy.data.meshes.remove(cutter_me)
    # material slots and cabin opening
    me = obj.data
    slot = {}
    for k in ("paint", "well", "under", "grille", "head", "tail", "trim"):
        if mats[k].name not in [m.name for m in me.materials]:
            me.materials.append(mats[k])
        slot[k] = [m.name for m in me.materials].index(mats[k].name)
    bm = bmesh.new(); bm.from_mesh(me)
    kill = []
    for fa in bm.faces:
        c = fa.calc_center_median(); nrm = fa.normal
        if fa.material_index == slot["well"]:
            continue
        x, y, z = c
        ay = abs(y)
        if CAB_R + 0.03 < x < CAB_F - 0.03 and z > top(x) - 0.06 and ay < half_w(x) - 0.075:
            kill.append(fa); continue
        k = "paint"
        if nrm.z < -0.6 or z < 0.24:
            k = "under"
        elif abs(nrm.y) > 0.5 and z < 0.33:
            k = "trim"
        fa.material_index = slot[k]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return obj


def cabin(name, mats, coll, soft=False, nu=96):
    """Greenhouse from the windshield base to the rear window base. Returns (cabin, rear_glass).
    mats: paint, glass, trim, (fabric if soft)."""
    n_side, n_corner, n_top = 9, 5, 11
    xs = [CAB_F - (CAB_F - CAB_R) * i / nu for i in range(nu + 1)]
    rings, meta = [], []
    for x in xs:
        zb, zt = top(x), max(top(x) + 1e-4, cab_top(x))
        wb = half_w(x) - 0.045
        wr = wb * 0.82
        hgt = zt - zb
        rc = min(0.085, hgt * 0.45)
        half = []
        for j in range(n_side):          # side, belt -> roof edge
            u = j / n_side
            half.append(("side", Vector((x, wb + (wr - wb) * u ** 1.2, zb + (hgt - rc) * u))))
        for j in range(n_corner):        # rounded roof rail
            a = math.pi / 2 * j / n_corner
            half.append(("corner", Vector((x, wr - rc + rc * math.cos(a), zt - rc + rc * math.sin(a)))))
        for j in range(n_top):           # roof / glass towards the centre line
            u = j / n_top
            yy = (wr - rc) * (1 - u)
            half.append(("top", Vector((x, yy, zt + 0.012 * (1 - (yy / max(1e-6, wr)) ** 2)))))
        right = [(k, Vector((v.x, -v.y, v.z))) for k, v in reversed(half)]
        ring = half + [("top", Vector((x, 0.0, zt + 0.012)))] + right
        rings.append([v for _, v in ring]); meta.append([k for k, _ in ring])
    verts, faces = _loft(rings, closed=False)
    n = len(rings[0])
    names = ["paint", "glass", "trim", "rear"] + (["fabric"] if soft else [])
    idx = []
    for i in range(len(rings) - 1):
        x = (xs[i] + xs[i + 1]) / 2
        for j in range(n - 1):
            kind = meta[i][j] if meta[i][j] == meta[i][j + 1] else ("corner" if "corner" in (meta[i][j], meta[i][j + 1]) else "side")
            jj = j if j < n // 2 else n - 2 - j          # mirrored index from the outer edge
            k = "paint"
            if kind == "side":
                if jj == 0:
                    k = "trim"                                   # belt rubber
                elif -1.30 < x < CAB_F - 0.12 and abs(x - B_PILLAR) > 0.055 and jj < n_side - 1:
                    k = "glass"
                elif abs(x - B_PILLAR) <= 0.055 and -1.30 < x < CAB_F - 0.12:
                    k = "trim"                                   # black B pillar
                else:
                    k = "fabric" if soft and x < ROOF_F else "paint"
            elif kind == "corner":
                k = "fabric" if soft and x < ROOF_F - 0.02 else "paint"
            else:
                if x > ROOF_F + 0.025:
                    k = "glass" if jj > n_side + n_corner else "trim"
                elif x < ROOF_R - 0.025 and not soft:
                    k = "rear" if jj > n_side + n_corner else "trim"
                elif soft and x < ROOF_R - 0.15 and jj > n_side + n_corner + 3:
                    k = "rear"
                else:
                    k = "fabric" if soft else "paint"
            idx.append(names.index(k))
    mat_list = [mats["paint"], mats["glass"], mats["trim"], mats["glass"]] + ([mats["fabric"]] if soft else [])
    me = _mesh(name, verts, faces, mat_list, idx)
    _outward(me, Vector(((CAB_F + CAB_R) / 2, 0, 0.8)))
    obj = S.new_obj(name, me, coll)
    # split the rear window into its own object
    bm = bmesh.new(); bm.from_mesh(me)
    rear_faces = [fa for fa in bm.faces if fa.material_index == 3]
    rbm = bmesh.new()
    vmap = {}
    for fa in rear_faces:
        vs = []
        for v in fa.verts:
            if v.index not in vmap:
                vmap[v.index] = rbm.verts.new(v.co)
            vs.append(vmap[v.index])
        rbm.faces.new(vs)
    rme = bpy.data.meshes.new(name + "_rear"); rbm.to_mesh(rme); rbm.free()
    rme.materials.append(mats["glass"])
    for p in rme.polygons:
        p.use_smooth = True
    bmesh.ops.delete(bm, geom=rear_faces, context="FACES")
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    rear = S.new_obj(name + "_RearGlass", rme, coll)
    return obj, rear


# ----------------------------------------------------------------------------- wheels
def _revolve(profile, segs, name, mats):
    """Revolve [(r, y), ...] around the car's Y axis."""
    rings = []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        rings.append([Vector((r * math.cos(a), y, r * math.sin(a))) for r, y in profile])
    n = len(profile)
    verts = [v for ring in rings for v in ring]
    faces = []
    for k in range(segs):
        k2 = (k + 1) % segs
        for j in range(n - 1):
            faces.append((k * n + j, k * n + j + 1, k2 * n + j + 1, k2 * n + j))
    return _mesh(name, verts, faces, mats)


def wheel(name, centre, side, mats, coll, parent):
    """side=+1 left, -1 right. Returns dict(root, tire, rim, hubcap)."""
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    root.parent = parent; root.location = centre
    s = side
    hw = 0.11
    prof = [(0.215, -hw * 0.9), (0.27, -hw * 1.02), (0.315, -hw * 0.98), (0.33, -hw * 0.7), (0.333, 0.0),
            (0.33, hw * 0.7), (0.315, hw * 0.98), (0.27, hw * 1.02), (0.215, hw * 0.9)]
    tme = _revolve(prof, 72, name + "_tire", [mats["tire"]])
    # inward faces must point out: flip if needed by recalculating normals
    bm = bmesh.new(); bm.from_mesh(tme); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(tme); bm.free()
    tire = S.new_obj(name + "_Tire", tme, coll); tire.parent = root
    # flat-tire shape key: bottom flattens and bulges sideways
    tire.shape_key_add(name="Basis")
    sk = tire.shape_key_add(name="Flat"); sk.value = 0.0
    for i, v in enumerate(tme.vertices):
        co = v.co.copy()
        if co.z < -0.12:
            k = min(1.0, (-0.12 - co.z) / 0.21)
            co.z = co.z + 0.11 * k
            co.y = co.y * (1 + 0.45 * k)
            co.x *= 1 + 0.12 * k
        sk.data[i].co = co
    # steel rim (dark) and the hubcap (silver wheel cover) on the outside face
    rprof = [(0.0, s * 0.03), (0.2, s * 0.03), (0.215, s * 0.08), (0.215, -s * 0.08), (0.06, -s * 0.06)]
    rme = _revolve(rprof, 48, name + "_rim", [mats["rim"]])
    rim = S.new_obj(name + "_Rim", rme, coll); rim.parent = root
    hprof = [(0.0, s * 0.098), (0.05, s * 0.097), (0.12, s * 0.09), (0.18, s * 0.085), (0.205, s * 0.07),
             (0.205, s * 0.055), (0.0, s * 0.055)]
    hme = _revolve(hprof, 48, name + "_cap", [mats["hubcap"]])
    hub = S.new_obj(name + "_Hubcap", hme, coll); hub.parent = root
    for o in (tire, rim, hub):
        o.data.update()
    return {"root": root, "tire": tire, "rim": rim, "hubcap": hub, "side": side}


def hubcap_material(name):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (0.75, 0.76, 0.78, 1)
    b.inputs["Metallic"].default_value = 0.9
    b.inputs["Roughness"].default_value = 0.25
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ang = S._math(nt, "ARCTAN2", sep.outputs[2], sep.outputs[0])
    r = S._math(nt, "SQRT", S._math(nt, "ADD", S._math(nt, "MULTIPLY", sep.outputs[0], sep.outputs[0]),
                                       S._math(nt, "MULTIPLY", sep.outputs[2], sep.outputs[2])))
    spokes = S._math(nt, "GREATER_THAN", S._math(nt, "SINE", S._math(nt, "MULTIPLY", ang, 6.0)), 0.55)
    ring = S._math(nt, "MULTIPLY", S._math(nt, "GREATER_THAN", r, 0.07), S._math(nt, "LESS_THAN", r, 0.17))
    holes = S._math(nt, "MULTIPLY", spokes, ring)
    nt.links.new(S._mix(nt, holes, (0.75, 0.76, 0.78), (0.03, 0.03, 0.035)), b.inputs["Base Color"])
    return m


# ----------------------------------------------------------------------------- interior + details
def _rbox(name, centre, size, mat, coll, parent, bevel=0.02, rot=(0, 0, 0)):
    o = S.box(name, (-size[0] / 2, -size[1] / 2, -size[2] / 2), (size[0] / 2, size[1] / 2, size[2] / 2), mat, coll, bevel)
    o.location = centre; o.rotation_euler = rot; o.parent = parent
    if bevel:
        o.modifiers[-1].segments = 2
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def interior(mats, coll, parent, soft=False):
    out = {}
    seat, plastic, carpet = mats["seat"], mats["plastic"], mats["carpet"]
    _rbox("Floor", (-0.3, 0, 0.27), (2.3, 1.5, 0.04), carpet, coll, parent, 0.0)
    for side in (1, -1):
        y = side * DRIVER_Y
        _rbox(f"SeatCushion{side}", (SEAT_X, y, 0.43), (0.52, 0.5, 0.12), seat, coll, parent, 0.04, (0, math.radians(-7), 0))
        _rbox(f"SeatBack{side}", (SEAT_X - 0.33, y, 0.78), (0.11, 0.5, 0.62), seat, coll, parent, 0.04, (0, math.radians(-18), 0))
        _rbox(f"Headrest{side}", (SEAT_X - 0.45, y, 1.16), (0.09, 0.26, 0.17), seat, coll, parent, 0.035, (0, math.radians(-14), 0))
        _rbox(f"SeatBase{side}", (SEAT_X, y, 0.33), (0.4, 0.4, 0.1), plastic, coll, parent, 0.01)
    _rbox("RearCushion", (-1.05, 0, 0.45), (0.5, 1.36, 0.13), seat, coll, parent, 0.04, (0, math.radians(-6), 0))
    _rbox("RearBack", (-1.35, 0, 0.78), (0.12, 1.36, 0.58), seat, coll, parent, 0.04, (0, math.radians(-22), 0))
    _rbox("Console", (0.12, 0, 0.42), (0.75, 0.2, 0.26), plastic, coll, parent, 0.03)
    dash = _rbox("Dash", (0.86, 0, 0.82), (0.42, 1.56, 0.2), plastic, coll, parent, 0.05, (0, math.radians(8), 0))
    _rbox("DashLower", (0.9, 0, 0.6), (0.3, 1.5, 0.3), plastic, coll, parent, 0.04)
    # instrument cluster facing the driver and a centre screen: emissive (keyed to die later)
    out["gauges"] = _rbox("Gauges", (0.69, DRIVER_Y, 0.88), (0.02, 0.3, 0.1), mats["gauges"], coll, parent, 0.005,
                          (0, math.radians(-25), 0))
    out["screen"] = _rbox("Screen", (0.68, 0.0, 0.84), (0.02, 0.22, 0.13), mats["gauges"], coll, parent, 0.005,
                          (0, math.radians(-20), 0))
    # steering wheel: rim torus + hub, column into the dash
    sw_root = bpy.data.objects.new("SteeringWheel", None); S.link(sw_root, coll); sw_root.parent = parent
    sw_root.location = (0.47, DRIVER_Y, 0.86); sw_root.rotation_euler = (0, math.radians(-62), 0)
    tor = bmesh.new()
    seg, mseg, R, rr = 40, 10, 0.185, 0.017
    vs = []
    for i in range(seg):
        a = 2 * math.pi * i / seg
        for j in range(mseg):
            b = 2 * math.pi * j / mseg
            vs.append(tor.verts.new(((R + rr * math.cos(b)) * math.cos(a), (R + rr * math.cos(b)) * math.sin(a), rr * math.sin(b))))
    for i in range(seg):
        for j in range(mseg):
            tor.faces.new((vs[i * mseg + j], vs[((i + 1) % seg) * mseg + j], vs[((i + 1) % seg) * mseg + (j + 1) % mseg],
                           vs[i * mseg + (j + 1) % mseg]))
    me = bpy.data.meshes.new("SWRim"); tor.to_mesh(me); tor.free(); me.materials.append(mats["wheel"])
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj("SWRim", me, coll); o.parent = sw_root
    hub = _rbox("SWHub", (0, 0, -0.01), (0.11, 0.11, 0.05), mats["wheel"], coll, sw_root, 0.02)
    for a in (90, 210, 330):
        sp = _rbox(f"SWSpoke{a}", (0.09 * math.cos(math.radians(a)), 0.09 * math.sin(math.radians(a)), -0.005),
                   (0.16, 0.035, 0.018), mats["wheel"], coll, sw_root, 0.006, (0, 0, math.radians(a)))
    _rbox("Column", (0.62, DRIVER_Y, 0.79), (0.3, 0.07, 0.07), plastic, coll, parent, 0.02, (0, math.radians(28), 0))
    out["wheel"] = sw_root
    return out


def antenna(mats, coll, parent):
    x = -0.55
    z0 = cab_top(x) + 0.006
    base = _rbox("AntennaBase", (x, 0, z0 + 0.012), (0.07, 0.035, 0.026), mats["trim"], coll, parent, 0.01)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.0045, radius2=0.0025, depth=0.46)
    for v in bm.verts:
        v.co.z += 0.23
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 0.1], cuts=12)
    me = bpy.data.meshes.new("Antenna"); bm.to_mesh(me); bm.free()
    me.materials.append(mats["antenna"])
    mast = S.new_obj("Antenna", me, coll); mast.parent = parent
    mast.location = (x - 0.01, 0, z0 + 0.02); mast.rotation_euler = (0, math.radians(-22), 0)
    # melt: the top droops over backwards
    mast.shape_key_add(name="Basis")
    sk = mast.shape_key_add(name="Melt"); sk.value = 0.0
    for i, v in enumerate(me.vertices):
        t = max(0.0, v.co.z) / 0.46
        a = 2.1 * t ** 1.6
        r = 0.46 * t
        sk.data[i].co = Vector((v.co.x - (math.sin(a) * r * 0.55), v.co.y, math.cos(a) * r * 0.85 + (v.co.z - r)))
    tip = Vector((x - 0.01, 0, z0 + 0.02)) + Matrix.Rotation(math.radians(-22), 3, "Y") @ Vector((0, 0, 0.46))
    return mast, tip


def details(mats, coll, parent, bodies):
    """Mirrors, door handles, plate, lights, wipers. Handles/mirrors are snapped onto the shell."""
    bvh = BVHTree.FromObject(bodies[0], bpy.context.evaluated_depsgraph_get())
    out = {}
    def on_side(x, z, side):
        hit = bvh.ray_cast(Vector((x, side * 2.0, z)), Vector((0, -side, 0)))
        return hit[0] if hit[0] is not None else Vector((x, side * half_w(x), z))
    for side in (1, -1):
        for x in (0.35, -0.72):
            p = on_side(x, 0.87, side)
            _rbox(f"Handle{side}{x}", p + Vector((0, side * 0.012, 0)), (0.16, 0.025, 0.03), mats["chrome"], coll, parent, 0.008)
        p = on_side(0.92, 0.98, side)
        _rbox(f"MirrorArm{side}", p + Vector((0, side * 0.05, 0)), (0.07, 0.1, 0.04), mats["trim"], coll, parent, 0.01)
        _rbox(f"Mirror{side}", p + Vector((-0.02, side * 0.14, 0.04)), (0.1, 0.16, 0.11), mats["paint"], coll, parent, 0.03)
    _rbox("PlateRear", (-L2 + 0.02, 0, 0.62), (0.02, 0.32, 0.16), mats["plate"], coll, parent, 0.004)
    _rbox("PlateFront", (L2 - 0.03, 0, 0.42), (0.02, 0.32, 0.12), mats["plate"], coll, parent, 0.004)
    # amber hazard/indicator lamps at the four corners
    for x, z in ((L2 - 0.12, 0.66), (-L2 + 0.14, 0.86)):
        for side in (1, -1):
            _rbox(f"Hazard{x}{side}", (x, side * (half_w(x) - 0.02), z), (0.09, 0.03, 0.04), mats["hazard"], coll, parent, 0.008)
    # wipers: pivot at the windshield base, keyed rotation about the glass normal
    wipers = []
    for y in (0.42, -0.08):
        piv = bpy.data.objects.new(f"WiperPivot{y}", None); S.link(piv, coll); piv.parent = parent
        piv.location = (CAB_F - 0.06, y, top(CAB_F) + 0.03)
        piv.rotation_euler = (0, math.radians(-32), 0)
        arm = _rbox(f"Wiper{y}", (0, 0.27, 0.012), (0.018, 0.55, 0.012), mats["trim"], coll, piv, 0.0)
        wipers.append(piv)
    out["wipers"] = wipers
    return out


def _lens(name, centre, radii, normal, mat, coll, parent):
    """Flattened ellipsoid lens embedded in the shell, its short axis along `normal`."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj(name, me, coll); o.parent = parent
    o.location = centre
    o.rotation_euler = Vector(normal).to_track_quat("X", "Z").to_euler()
    return o


def lamps_and_grille(mats, coll, parent, body):
    bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
    def snap(y, z, front):
        d = Vector((-1 if front else 1, 0, 0))
        hit = bvh.ray_cast(Vector((4 if front else -4, y, z)), d)
        return (hit[0], hit[1]) if hit[0] is not None else (Vector((L2 if front else -L2, y, z)), -d)
    for side in (1, -1):
        p, n = snap(side * 0.6, 0.7, True)
        _lens(f"Headlamp{side}", p - n * 0.015, (0.05, 0.25, 0.065), n, mats["head"], coll, parent)
        p, n = snap(side * 0.62, 0.86, False)
        _lens(f"Taillamp{side}", p - n * 0.012, (0.045, 0.24, 0.055), n, mats["tail"], coll, parent)
    p, n = snap(0.0, 0.5, True)
    _lens("Grille", p - n * 0.02, (0.05, 0.46, 0.085), n, mats["grille"], coll, parent)
    p, n = snap(0.0, 0.3, True)
    _lens("Intake", p - n * 0.02, (0.04, 0.5, 0.05), n, mats["grille"], coll, parent)


def lights(coll, parent):
    """Headlight beams (spot lamps) and taillight glow."""
    out = []
    for side in (1, -1):
        sp = bpy.data.objects.new(f"Beam{side}", bpy.data.lights.new(f"Beam{side}", "SPOT")); S.link(sp, coll)
        sp.data.energy = 900; sp.data.spot_size = math.radians(55); sp.data.spot_blend = 0.6
        sp.data.color = (1.0, 0.92, 0.8); sp.data.shadow_soft_size = 0.05
        sp.parent = parent; sp.location = (L2 - 0.05, side * 0.62, 0.68)
        sp.rotation_euler = (0, math.radians(-90 - 8), 0)
        out.append(sp)
        tl = bpy.data.objects.new(f"TailGlow{side}", bpy.data.lights.new(f"TailGlow{side}", "POINT")); S.link(tl, coll)
        tl.data.energy = 6; tl.data.color = (1.0, 0.05, 0.03); tl.data.shadow_soft_size = 0.1
        tl.parent = parent; tl.location = (-L2 - 0.1, side * 0.65, 0.85)
        out.append(tl)
    dg = bpy.data.objects.new("DashGlow", bpy.data.lights.new("DashGlow", "POINT")); S.link(dg, coll)
    dg.data.energy = 6.0; dg.data.color = (0.45, 0.7, 1.0); dg.data.shadow_soft_size = 0.15
    dg.parent = parent; dg.location = (0.55, 0.2, 0.98)
    out.append(dg)
    return out


# ----------------------------------------------------------------------------- assembly
def build_car(name, color, coll, convertible=False):
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    mats = {
        "paint": paint(name + "Paint", color),
        "glass": glass(name + "Glass"),
        "trim": S.flat(name + "Trim", (0.012, 0.012, 0.014), 0.35),
        "under": S.flat(name + "Under", (0.03, 0.03, 0.03), 0.9),
        "well": S.flat(name + "Well", (0.01, 0.01, 0.01), 0.95),
        "grille": S.flat(name + "Grille", (0.008, 0.008, 0.01), 0.25),
        "head": emissive(name + "Head", (1.0, 0.93, 0.82), 6.0, (0.8, 0.8, 0.8)),
        "tail": emissive(name + "Tail", (1.0, 0.03, 0.02), 3.0, (0.3, 0.0, 0.0)),
        "hazard": emissive(name + "Hazard", (1.0, 0.45, 0.02), 0.0, (0.5, 0.25, 0.02)),
        "tire": tire_material(name + "Tire"),
        "rim": S.flat(name + "Rim", (0.06, 0.06, 0.065), 0.4, 0.8),
        "hubcap": hubcap_material(name + "Hubcap"),
        "chrome": S.flat(name + "Chrome", (0.8, 0.8, 0.82), 0.12, 1.0),
        "plate": S.flat(name + "Plate", (0.85, 0.85, 0.8), 0.4),
        "antenna": emissive(name + "Antenna", (1.0, 0.35, 0.05), 0.0, (0.02, 0.02, 0.02)),
        "seat": S.pbr(name + "Seat", "fabric_leather_02", 0.5, (0.18, 0.17, 0.16)),
        "plastic": S.flat(name + "Plastic", (0.035, 0.035, 0.038), 0.6),
        "carpet": S.flat(name + "Carpet", (0.02, 0.02, 0.022), 0.95),
        "wheel": S.flat(name + "WheelLeather", (0.015, 0.015, 0.015), 0.5),
        "gauges": emissive(name + "Gauges", (0.35, 0.75, 1.0), 2.5, (0.01, 0.01, 0.02)),
        "fabric": S.flat(name + "Fabric", (0.02, 0.02, 0.022), 0.85),
    }
    body = lower_body(name + "Body", mats, coll); body.parent = root
    cab, rear = cabin(name + "Cabin", mats, coll, soft=convertible)
    cab.parent = root; rear.parent = root
    wheels = []
    for ax in (AXLE, -AXLE):
        for side in (1, -1):
            wheels.append(wheel(f"{name}Wheel{'F' if ax > 0 else 'R'}{'L' if side > 0 else 'R'}",
                                Vector((ax, side * TRACK, WHEEL_R)), side, mats, coll, root))
    inside = interior(mats, coll, root, convertible)
    ant, tip = antenna(mats, coll, root) if not convertible else (None, None)
    det = details(mats, coll, root, [body])
    lamps_and_grille(mats, coll, root, body)
    lamps = lights(coll, root)
    return {"root": root, "body": body, "cabin": cab, "rear": rear, "wheels": wheels, "mats": mats,
            "antenna": ant, "antenna_tip": tip, "inside": inside, "wipers": det["wipers"], "lamps": lamps,
            "coll": coll}


def xray_version(car, name):
    """X-ray copies of the body, cabin and rear glass (shown in x-ray shots instead of the paint)."""
    mat = xray(name + "Xray")
    out = []
    for key in ("body", "cabin", "rear"):
        src = car[key]
        me = src.data.copy(); me.materials.clear(); me.materials.append(mat)
        me.polygons.foreach_set("material_index", [0] * len(me.polygons))
        o = S.new_obj(src.name + "_X", me, car["coll"]); o.parent = src.parent
        o.matrix_parent_inverse = src.matrix_parent_inverse.copy()
        out.append(o)
    return out


# ----------------------------------------------------------------------------- current paths
def shell_bvh(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for o in objs:
        tmp = bmesh.new(); tmp.from_object(o, dg); tmp.transform(o.matrix_local)
        me = bpy.data.meshes.new("tmp"); tmp.to_mesh(me); tmp.free()
        bm.from_mesh(me); bpy.data.meshes.remove(me)
    return BVHTree.FromBMesh(bm)


def surface_path(bvh, waypoints, step=0.035, jitter=0.012, lift=0.012, seed=0):
    """Polyline through car-space waypoints, snapped onto the shell, slightly jagged."""
    rnd = random.Random(seed)
    pts = []
    for a, b in zip(waypoints[:-1], waypoints[1:]):
        a, b = Vector(a), Vector(b)
        n = max(2, int((b - a).length / step))
        for i in range(n):
            p = a.lerp(b, i / n)
            hit = bvh.find_nearest(p, 0.4)
            if hit[0] is not None:
                q, nrm = hit[0], hit[1]
                t1 = nrm.orthogonal().normalized(); t2 = nrm.cross(t1)
                q = q + nrm * lift + (t1 * rnd.uniform(-1, 1) + t2 * rnd.uniform(-1, 1)) * jitter
                pts.append(q)
            else:
                pts.append(p)
    pts.append(Vector(waypoints[-1]))
    return pts


def poly_curve(name, pts, mat, coll, parent, depth=0.006):
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"
    cu.bevel_depth = depth; cu.bevel_resolution = 2; cu.use_fill_caps = True
    sp = cu.splines.new("POLY"); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (q.x, q.y, q.z, 1)
    cu.materials.append(mat)
    cu.bevel_factor_mapping_start = "SPLINE"; cu.bevel_factor_mapping_end = "SPLINE"
    o = S.new_obj(name, cu, coll); o.parent = parent
    return o


def current_network(car, mat, coll, convertible=False, seed=3):
    """Glowing current paths: antenna/roof -> pillars -> fenders -> wheel arches -> tires -> ground.
    Returns list of (curve_object, order) where order 0 starts first."""
    bvh = shell_bvh([car["body"], car["cabin"]])
    x_ant = -0.55; zr = cab_top(x_ant)
    start = car["antenna_tip"] if car["antenna_tip"] is not None else Vector((-0.2, 0, cab_top(-0.2) + 0.02))
    out = []
    root = car["root"]
    if car["antenna_tip"] is not None:
        out.append((poly_curve("CurAnt", [start, Vector((x_ant, 0, zr + 0.03))], mat, coll, root, 0.008), 0))
    hub = Vector((x_ant, 0, zr + 0.02))
    k = 0
    for side in (1, -1):
        for corner_x, pillar, arch_x in ((0.1, (CAB_F - 0.05, 0.72), AXLE), (-0.9, (CAB_R + 0.05, 0.72), -AXLE)):
            wb = half_w(arch_x) - 0.02
            way = [hub, (corner_x, side * 0.45, cab_top(corner_x)), (pillar[0], side * pillar[1], top(pillar[0]) + 0.02),
                   (arch_x + (0.25 if arch_x > 0 else -0.25), side * wb, 0.72), (arch_x, side * wb, 0.72)]
            pts = surface_path(bvh, way, seed=seed + k)
            out.append((poly_curve(f"CurBody{k}", pts, mat, coll, root), 1)); k += 1
            # over the tire sidewall to the contact patch
            tw = side * (TRACK + 0.115)
            tpts = [Vector((arch_x, side * wb, 0.7))]
            for i in range(1, 9):
                a = math.pi / 2 - (math.pi * 0.95) * i / 8
                tpts.append(Vector((arch_x + 0.34 * math.cos(a) * (0.3 if i < 8 else 0.1), tw, WHEEL_R + 0.34 * math.sin(a))))
            tpts.append(Vector((arch_x + 0.05, tw, 0.005)))
            out.append((poly_curve(f"CurTire{k}", tpts, mat, coll, root, 0.007), 2))
            # spreading into the wet road
            rnd = random.Random(seed * 13 + k)
            for b in range(4):
                ang = rnd.uniform(0, 2 * math.pi)
                p = Vector((arch_x + 0.05, tw, 0.004)); gp = [p.copy()]
                for i in range(7):
                    ang += rnd.uniform(-0.6, 0.6)
                    p = p + Vector((math.cos(ang), math.sin(ang), 0)) * rnd.uniform(0.06, 0.14)
                    p.z = 0.004; gp.append(p.copy())
                out.append((poly_curve(f"CurGround{k}_{b}", gp, mat, coll, root, 0.004), 3))
    # side branches down the B pillars to the sills
    for side in (1, -1):
        way = [hub, (B_PILLAR, side * 0.5, cab_top(B_PILLAR)), (B_PILLAR, side * (half_w(B_PILLAR) - 0.05), 0.95),
               (B_PILLAR, side * (half_w(B_PILLAR) - 0.01), 0.45)]
        out.append((poly_curve(f"CurB{side}", surface_path(bvh, way, seed=seed + 40 + side), mat, coll, root), 1))
    return out
