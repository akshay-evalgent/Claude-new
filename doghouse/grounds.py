"""Two backyards, the ground between them in section, and everything dug into it.

World (metres): the section plane is y = 0 (the cutaway camera looks along +Y); ground level z = 0.
  your doghouse (REX)      at x = 3, over a shaft of concrete rings 6 m deep
  your bunker              x 1.4..7.4, floor z = -6, ceiling z = -3.5
  the tunnel               along y = 0, z = -5.25, from your bunker to the neighbour's
  the fence                x = 10.6, between the gardens
  the neighbour's bunker   x 14..20, the same depth, wood panelled; his doghouse (MAX) at x = 18.5
The soil is one block (split at the section plane) with boolean cutters for the shafts, the rooms and
the tunnel; animating the cutters digs the holes. Everything in front of the plane is in FRONT and is
hidden in the cutaway shots.
"""
import importlib.util, math, os, random
import bmesh
import bpy
from mathutils import Vector, Matrix

import sets as S
import storm as ST

HERE = os.path.dirname(os.path.abspath(__file__))


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m


P = _load("apple_props", os.path.join(HERE, "..", "apple", "props.py"))
A = os.path.join(os.environ["QS_SCRATCH"], "assets")
GEN = os.path.join(os.environ["QS_SCRATCH"], "gen")

Y_CUT = 0.0
D1, D2 = Vector((3.0, 0.0, 0.0)), Vector((18.5, 0.0, 0.0))     # doghouses / shafts
R_IN, R_OUT = 0.5, 0.58                                        # shaft rings
RING_H, N_RINGS = 0.5, 12
FLOOR, CEIL, WALL = -6.0, -3.5, 0.25
R1 = (1.4, 7.4)                       # your bunker, interior x
R2 = (14.0, 20.0)                     # the neighbour's
RY = (-0.8, 3.0)                      # both bunkers, interior y
TZ, T_R = -5.25, 0.6                  # tunnel axis height, liner radius
FENCE_X = 10.6
VENT = Vector((3.66, 0.0, 0.0))
FRONT = []


# ============================================================================= helpers
def model(name, coll, loc, rot_z=0.0, scale=1.0):
    return S.import_gltf(name, coll, Vector(loc), math.radians(rot_z), scale)


def meshes(root):
    return [o for o in root.children_recursive if o.type == "MESH"]


def boxes_mesh(name, boxes, mats, coll, face_mat=None):
    bm = bmesh.new()
    for bx in boxes:
        (x0, y0, z0), (x1, y1, z1) = bx[0], bx[1]
        mi = bx[2] if len(bx) > 2 else 0
        v = [bm.verts.new(p) for p in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
        for idx, n in (((0, 3, 2, 1), (0, 0, -1)), ((4, 5, 6, 7), (0, 0, 1)), ((0, 1, 5, 4), (0, -1, 0)),
                       ((1, 2, 6, 5), (1, 0, 0)), ((2, 3, 7, 6), (0, 1, 0)), ((3, 0, 4, 7), (-1, 0, 0))):
            f = bm.faces.new([v[i] for i in idx])
            f.material_index = face_mat(Vector(n), bx) if face_mat else mi
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    return S.new_obj(name, me, coll)


def split_boxes(name, boxes, mats, coll, face_mat=None, parent=None):
    """Boxes into two objects split at the section plane (front one into FRONT)."""
    fr, bk = [], []
    for bx in boxes:
        (x0, y0, z0), (x1, y1, z1) = bx[0], bx[1]
        rest = bx[2:]
        if y1 <= Y_CUT + 1e-6:
            fr.append(bx)
        elif y0 >= Y_CUT - 1e-6:
            bk.append(bx)
        else:
            fr.append(((x0, y0, z0), (x1, Y_CUT, z1), *rest)); bk.append(((x0, Y_CUT, z0), (x1, y1, z1), *rest))
    out = []
    for tag, lst in (("F", fr), ("B", bk)):
        if not lst:
            continue
        o = boxes_mesh(name + tag, lst, mats, coll, face_mat)
        if tag == "F":
            FRONT.append(o)
        if parent:
            o.parent = parent; o.matrix_parent_inverse = parent.matrix_world.inverted()
        out.append(o)
    return out


def half_tube(name, r0, r1, h, mat, coll, axis="Z", seg=40, front=False, corr=0.0, corr_n=0):
    """Half of a thick tube (the y >= 0 half, or y <= 0 with front=True) along Z or X, from 0 to h.
    corr adds corrugation ribs along the length."""
    bm = bmesh.new()
    a0, a1 = (math.pi, 2 * math.pi) if front else (0.0, math.pi)
    nl = max(1, corr_n * 2) if corr else 1
    rings = []
    for li in range(nl + 1):
        t = h * li / nl
        bump = corr * (1 if li % 2 else 0)
        row = []
        for k in range(seg + 1):
            a = a0 + (a1 - a0) * k / seg
            for r in (r0 - bump, r1 - bump):
                c, s_ = math.cos(a) * r, math.sin(a) * r
                row.append(bm.verts.new((c, s_, t) if axis == "Z" else (t, s_, c)))
        rings.append(row)
    for li in range(nl):
        A_, B_ = rings[li], rings[li + 1]
        for k in range(seg):
            i0, o0, i1, o1 = 2 * k, 2 * k + 1, 2 * k + 2, 2 * k + 3
            bm.faces.new((A_[o0], A_[o1], B_[o1], B_[o0]))     # outside
            bm.faces.new((A_[i1], A_[i0], B_[i0], B_[i1]))     # inside
        for end_k in (0, seg):                                 # the cut faces along the section
            i, o = 2 * end_k, 2 * end_k + 1
            bm.faces.new((A_[i], A_[o], B_[o], B_[i]) if end_k == 0 else (A_[o], A_[i], B_[i], B_[o]))
    for row, flip in ((rings[0], False), (rings[-1], True)):
        for k in range(seg):
            q = (row[2 * k], row[2 * k + 2], row[2 * k + 3], row[2 * k + 1])
            bm.faces.new(q[::-1] if flip else q)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj(name, me, coll)
    if front:
        FRONT.append(o)
    return o


def emit_mat(name, col, strength):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


# ============================================================================= materials
def soil_material():
    """The cut face: dark topsoil, brown loam, orange clay with stones, then grey gravel."""
    m, nt, b = S._new_mat("Soil")
    mp, tc = S._mapping(nt, 2.2)
    d = os.path.join(A, "tex", "excavated_soil_wall")
    diff = S._tex(nt, os.path.join(d, "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], diff.inputs[0])
    nor = S._tex(nt, os.path.join(d, "nor.jpg"), True, proj="BOX"); nt.links.new(mp.outputs[0], nor.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    wob = S._math(nt, "MULTIPLY", S._noise(nt, tc.outputs["Object"], 0.35, 3, 0.5), 0.6)
    z = S._math(nt, "ADD", sep.outputs[2], wob)
    base = S._mix(nt, 1.0, diff.outputs["Color"], (1.45, 1.22, 1.0), blend="MULTIPLY")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (0.34, 0.33, 0.31, 1)      # gravel (deep)
    els[1].position = 1.0; els[1].color = (0.42, 0.28, 0.18, 1)      # topsoil
    for pos, col in ((0.32, (0.62, 0.42, 0.26)), (0.55, (0.78, 0.5, 0.28)), (0.82, (0.6, 0.42, 0.28)),
                     (0.94, (0.42, 0.29, 0.19))):
        e = els.new(pos); e.color = (*col, 1)
    nt.links.new(S._math(nt, "ADD", S._math(nt, "MULTIPLY", z, 1 / 8.0), 1.0, clamp=True), ramp.inputs[0])
    col = S._mix(nt, 1.0, base, ramp.outputs[0], blend="MULTIPLY")
    col = S._mix(nt, 1.0, col, (2.0, 2.0, 2.0), blend="MULTIPLY")
    nt.links.new(col, b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.93
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.1
    nt.links.new(nor.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def lawn_material():
    m, nt, b = S._new_mat("Lawn")
    d = os.path.join(A, "tex", "leafy_grass")
    mp, _ = S._mapping(nt, 2.2)
    diff = S._tex(nt, os.path.join(d, "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], diff.inputs[0])
    hs = nt.nodes.new("ShaderNodeHueSaturation")
    hs.inputs["Hue"].default_value = 0.62; hs.inputs["Saturation"].default_value = 1.25; hs.inputs["Value"].default_value = 0.85
    nt.links.new(diff.outputs["Color"], hs.inputs["Color"]); nt.links.new(hs.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    n = S._tex(nt, os.path.join(d, "nor.jpg"), True, proj="BOX"); nt.links.new(mp.outputs[0], n.inputs[0])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def materials():
    M = {"soil": soil_material(), "grass": lawn_material()}
    M["concrete"] = S.pbr("Concrete", "brushed_concrete", 2.0, tint=(0.95, 0.94, 0.92))
    M["ringc"] = S.pbr("RingConcrete", "concrete_floor_02", 1.2, tint=(0.92, 0.91, 0.88))
    M["floor"] = S.pbr("BunkerFloor", "concrete_floor_02", 2.5, tint=(0.85, 0.84, 0.82))
    M["paving"] = S.pbr("Paving", "concrete_pavement", 2.5, tint=(1.0, 0.97, 0.93))
    M["stucco"] = S.pbr("Stucco", "white_stucco", 2.0, tint=(1.0, 0.98, 0.95))
    M["stucco2"] = S.pbr("Stucco2", "white_stucco", 2.0, tint=(0.95, 0.88, 0.74))
    M["roof"] = S.pbr("Roof", "grey_roof_tiles", 2.0, tint=(0.55, 0.5, 0.48))
    M["fence"] = S.pbr("Fence", "fine_grained_wood", 1.0, tint=(0.78, 0.6, 0.45))
    M["dogwood"] = S.pbr("DogWood", "fine_grained_wood", 0.6, tint=(1.0, 0.5, 0.3))
    M["dogwood2"] = S.pbr("DogWood2", "fine_grained_wood", 0.6, tint=(0.55, 0.62, 0.78))
    M["shingle"] = S.pbr("Shingles", "grey_roof_tiles", 0.6, tint=(0.45, 0.2, 0.15))
    M["shingle2"] = S.pbr("Shingles2", "grey_roof_tiles", 0.6, tint=(0.25, 0.27, 0.3))
    M["panel"] = S.pbr("Panelling", "dark_paneled_wood", 1.6, tint=(1.25, 1.0, 0.8))
    M["parquet"] = S.pbr("Parquet", "herringbone_parquet", 1.6, tint=(1.0, 0.9, 0.8))
    M["liner"] = S.flat("Liner", (0.55, 0.57, 0.6), 0.35, 0.8)
    M["steel"] = S.flat("Steel", (0.3, 0.31, 0.33), 0.35, 0.8)
    M["rung"] = S.flat("Rung", (0.75, 0.55, 0.08), 0.4, 0.3)
    M["dark"] = S.flat("Dark", (0.04, 0.04, 0.045), 0.45, 0.4)
    M["white"] = S.flat("PaintWhite", (0.9, 0.9, 0.88), 0.4)
    M["frame"] = S.flat("WindowFrame", (0.04, 0.04, 0.045), 0.4)
    M["glass"] = S.flat("HouseGlass", (0.03, 0.045, 0.05), 0.04, spec=1.0)
    M["bowl"] = S.flat("Bowl", (0.7, 0.06, 0.05), 0.3, coat=0.5)
    M["brass"] = S.flat("Brass", (0.8, 0.6, 0.25), 0.25, 1.0)
    M["text"] = emit_mat("DimText", (1.0, 1.0, 1.0), 1.5)
    M["cable"] = emit_mat("CableGlow", (1.0, 0.72, 0.18), 6.0)
    M["bulb"] = emit_mat("Bulb", (1.0, 0.82, 0.55), 0.0)
    M["led"] = emit_mat("RouterLed", (0.2, 1.0, 0.3), 0.0)
    M["headlamp"] = emit_mat("Headlamp", (1.0, 0.95, 0.85), 0.0)
    M["rug"] = S.flat("Rug", (0.42, 0.12, 0.1), 0.85)
    M["blanket"] = S.flat("Blanket", (0.15, 0.3, 0.45), 0.85)
    M["mattress"] = S.flat("Mattress", (0.88, 0.86, 0.82), 0.8)
    M["fridge"] = S.flat("Fridge", (0.86, 0.86, 0.84), 0.3)
    return M


# ============================================================================= ground with cutters
def cutters(coll):
    """Boolean cutters (never rendered). Origins sit where the digging starts, so scaling one digs."""
    C = {}

    def cyl_z(name, r, h, loc):
        o = P.cyl(name, r, h, S.flat(name + "M", (1, 0, 1)), coll, (0, 0, -h / 2), verts=40)
        root = bpy.data.objects.new(name + "Root", None); S.link(root, coll); root.location = loc
        o.parent = root
        o.hide_render = True; o.display_type = "WIRE"
        return root, o
    C["s1"], C["s1m"] = cyl_z("CutShaft1", R_OUT + 0.004, -FLOOR + 0.25 - 0.02, D1 + Vector((0, 0, 0.25)))
    C["s2"], C["s2m"] = cyl_z("CutShaft2", R_OUT + 0.004, -CEIL + 0.5, D2 + Vector((0, 0, 0.25)))
    # rooms: outer shell boxes
    def box(name, mn, mx, origin):
        o = S.box(name, Vector(mn) - Vector(origin), Vector(mx) - Vector(origin), S.flat(name + "M", (1, 0, 1)), coll)
        root = bpy.data.objects.new(name + "Root", None); S.link(root, coll); root.location = origin
        o.parent = root; o.hide_render = True; o.display_type = "WIRE"
        return root, o
    C["r1"], C["r1m"] = box("CutRoom1", (R1[0] - WALL, RY[0] - WALL, FLOOR - WALL), (R1[1] + WALL, RY[1] + WALL, CEIL + WALL),
                            (D1.x, 0.0, FLOOR))
    C["r2"], C["r2m"] = box("CutRoom2", (R2[0] - WALL, RY[0] - WALL, FLOOR - WALL), (R2[1] + WALL, RY[1] + WALL, CEIL + WALL),
                            (R2[0], 0.0, FLOOR))
    # tunnel: along +X from inside your bunker, through the neighbour's wall at full length
    t0 = R1[1] - 0.05
    L = (R2[0] + 0.05) - t0
    o = P.cyl("CutTunnel", T_R + 0.06, L, S.flat("CutTunnelM", (1, 0, 1)), coll, (L / 2, 0, 0), rot=(0, math.pi / 2, 0), verts=40)
    root = bpy.data.objects.new("CutTunnelRoot", None); S.link(root, coll); root.location = (t0, 0.0, TZ)
    o.parent = root; o.hide_render = True; o.display_type = "WIRE"
    C["t"], C["tm"], C["t_len"], C["t0"] = root, o, L, t0
    return C


def _strip(o):
    o.data.materials.clear()


def ground(M, C, coll):
    """The soil in two halves, with every cutter as a boolean (exact) modifier."""
    for key in ("s1m", "s2m", "r1m", "r2m", "tm"):      # what a cutter leaves behind is soil
        C[key].data.materials.clear(); C[key].data.materials.append(M["soil"])
    E = 40.0
    parts = split_boxes("Ground", [((-E, -E, -20.0), (E, E, 0.0))], [M["soil"], M["grass"]], coll,
                        face_mat=lambda n, bx: 1 if n.z > 0.5 else 0)
    for o in parts:
        for key in ("s1m", "s2m", "r1m", "r2m", "tm"):
            md = o.modifiers.new("cut_" + key, "BOOLEAN"); md.operation = "DIFFERENCE"; md.solver = "EXACT"
            md.object = C[key]; md.material_mode = "INDEX"     # cut faces take the target's material
    return parts


# ============================================================================= the shafts
def rings(name, centre, n, M, coll):
    """n concrete rings stacked down from the surface, each split at the section plane."""
    out = []
    for k in range(n):
        root = bpy.data.objects.new(f"{name}{k}", None); S.link(root, coll)
        z_top = 0.02 - k * RING_H
        root.location = (centre.x, centre.y, z_top - RING_H + 0.01)
        b = half_tube(f"{name}{k}B", R_IN, R_OUT, RING_H - 0.02, M["ringc"], coll)
        f_ = half_tube(f"{name}{k}F", R_IN, R_OUT, RING_H - 0.02, M["ringc"], coll, front=True)
        for o in (b, f_):
            o.parent = root
        out.append((root, [b, f_], z_top - RING_H + 0.01))
    return out


def ladder(name, centre, z_top, z_bot, M, coll):
    root = bpy.data.objects.new(name, None); S.link(root, coll); root.location = (centre.x, centre.y + 0.36, 0)
    L = z_top - z_bot
    for sx in (-1, 1):
        P.rbox(f"{name}Rail{sx}", (0.04, 0.05, L), M["steel"], coll, (sx * 0.2, 0, z_bot + L / 2), parent=root)
    n = int(L / 0.3)
    for k in range(n):
        P.cyl(f"{name}Rung{k}", 0.016, 0.4, M["rung"], coll, (0, 0, z_bot + 0.15 + k * 0.3), rot=(0, math.pi / 2, 0), parent=root)
    return root


# ============================================================================= the doghouses
def doghouse(name, centre, M, wood, shingle, sign, coll):
    """Plank doghouse (1.5 x 1.3 m) with an arched door facing -Y and a gable roof (ridge along X).
    The root sits at the back bottom edge, so tilting it about X lifts the doghouse off the hole."""
    W, D, H, RIDGE = 1.5, 1.3, 0.95, 1.38
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    root.location = (centre.x, centre.y + D / 2, 0.0)
    pw, gap = 0.12, 0.012
    front, back = [], []
    x = -W / 2
    door_w, door_h = 0.62, 0.72
    while x < W / 2 - 1e-6:
        x1 = min(W / 2, x + pw)
        xc = (x + x1) / 2
        # back wall and front wall (the front planks stop above the arched door)
        back.append(((centre.x + x, centre.y + D / 2 - 0.04, 0.0), (centre.x + x1, centre.y + D / 2, H)))
        if abs(xc) < door_w / 2:
            r = door_w / 2
            arch = door_h - r + math.sqrt(max(0.0, r * r - xc * xc))
            front.append(((centre.x + x, centre.y - D / 2, arch), (centre.x + x1, centre.y - D / 2 + 0.04, H)))
        else:
            front.append(((centre.x + x, centre.y - D / 2, 0.0), (centre.x + x1, centre.y - D / 2 + 0.04, H)))
        x = x1 + gap
    sides = []
    y = -D / 2
    while y < D / 2 - 1e-6:
        y1 = min(D / 2, y + pw)
        for sx in (-1, 1):
            xa = centre.x + (W / 2 - 0.04 if sx > 0 else -W / 2)
            sides.append(((xa, centre.y + y, 0.0), (xa + 0.04, centre.y + y1, H)))
        y = y1 + gap
    backing = [((centre.x - W / 2 + 0.04, centre.y + D / 2 - 0.06, 0.0), (centre.x + W / 2 - 0.04, centre.y + D / 2 - 0.04, H)),
               ((centre.x - W / 2 + 0.04, centre.y - D / 2 + 0.04, 0.0), (centre.x - W / 2 + 0.06, centre.y + D / 2 - 0.04, H)),
               ((centre.x + W / 2 - 0.06, centre.y - D / 2 + 0.04, 0.0), (centre.x + W / 2 - 0.04, centre.y + D / 2 - 0.04, H))]
    objs = split_boxes(name + "Walls", front + back + sides, [wood], coll)
    objs += split_boxes(name + "Backing", backing, [S.flat(name + "Inside", (0.08, 0.05, 0.035), 0.8)], coll)
    # gable triangles above the side walls, and the two roof slopes (front one in FRONT)
    for sx in (-1, 1):
        for half, tag in ((-1, "F"), (1, "B")):
            bm = bmesh.new()
            xa = centre.x + sx * (W / 2 - 0.02)
            vv = [bm.verts.new(p) for p in ((xa, centre.y, H), (xa, centre.y + half * D / 2, H), (xa, centre.y, RIDGE))]
            bm.faces.new(vv)
            me = bpy.data.meshes.new(name + "Gable"); bm.to_mesh(me); bm.free(); me.materials.append(wood)
            g = S.new_obj(name + "Gable" + tag, me, coll); g.modifiers.new("t", "SOLIDIFY").thickness = 0.04
            objs.append(g)
            if tag == "F":
                FRONT.append(g)
    ov = 0.12
    for half, tag in ((-1, "F"), (1, "B")):
        bm = bmesh.new()
        p = [(centre.x - W / 2 - ov, centre.y, RIDGE + 0.03), (centre.x + W / 2 + ov, centre.y, RIDGE + 0.03),
             (centre.x + W / 2 + ov, centre.y + half * (D / 2 + ov), H - 0.06), (centre.x - W / 2 - ov, centre.y + half * (D / 2 + ov), H - 0.06)]
        vv = [bm.verts.new(q) for q in p]
        bm.faces.new(vv if half > 0 else vv[::-1])
        me = bpy.data.meshes.new(name + "Roof"); bm.to_mesh(me); bm.free(); me.materials.append(shingle)
        r = S.new_obj(name + "Roof" + tag, me, coll); r.modifiers.new("t", "SOLIDIFY").thickness = 0.05
        objs.append(r)
        if tag == "F":
            FRONT.append(r)
    t = P.text3d(name + "Sign", sign, 0.15, M["white"], coll, extrude=0.008)
    t.location = (centre.x, centre.y - D / 2 - 0.01, H - 0.12); t.rotation_euler = (math.radians(90), 0, 0)
    objs.append(t); FRONT.append(t)
    for o in objs:
        o.parent = root; o.matrix_parent_inverse = Matrix.Translation(root.location).inverted()
    return root, objs


def chimney(name, base, M, coll):
    root = bpy.data.objects.new(name, None); S.link(root, coll); root.location = base
    P.cyl(name + "Pipe", 0.065, 0.42, M["steel"], coll, (0, 0, 0.21), parent=root)
    P.cyl(name + "Cap", 0.13, 0.03, M["steel"], coll, (0, 0, 0.47), parent=root)
    for k in range(3):
        a = 2 * math.pi * k / 3
        P.rbox(name + "Leg", (0.012, 0.012, 0.06), M["steel"], coll, (0.08 * math.cos(a), 0.08 * math.sin(a), 0.44), parent=root)
    return root


# ============================================================================= the bunkers
def bunker_shell(name, x0, x1, M, coll, inner_mat):
    """Concrete box (interior x0..x1, RY, FLOOR..CEIL), walls WALL thick. Each slab and wall is its own
    closed box (split at the section plane), so a boolean only ever sees a clean solid.
    Returns {part: [objects]} with parts floor, ceil, west, east, back, front."""
    y0, y1 = RY
    parts = {"floor": ((x0 - WALL, y0 - WALL, FLOOR - WALL), (x1 + WALL, y1 + WALL, FLOOR)),
             "ceil": ((x0 - WALL, y0 - WALL, CEIL), (x1 + WALL, y1 + WALL, CEIL + WALL)),
             "west": ((x0 - WALL, y0 - WALL, FLOOR), (x0, y1 + WALL, CEIL)),
             "east": ((x1, y0 - WALL, FLOOR), (x1 + WALL, y1 + WALL, CEIL)),
             "back": ((x0, y1, FLOOR), (x1, y1 + WALL, CEIL)),
             "front": ((x0, y0 - WALL, FLOOR), (x1, y0, CEIL))}
    return {k: split_boxes(f"{name}_{k}", [bx], [inner_mat], coll) for k, bx in parts.items()}


def panelling(name, x0, x1, M, coll):
    """Wood panelling and a parquet floor lining the neighbour's bunker. Returns {part: [objects]}."""
    y0, y1 = RY
    t = 0.02
    return {"back": split_boxes(name + "Back", [((x0, y1 - t, FLOOR), (x1, y1, CEIL))], [M["panel"]], coll),
            "west": split_boxes(name + "West", [((x0, y0, FLOOR), (x0 + t, y1, CEIL))], [M["panel"]], coll),
            "east": split_boxes(name + "East", [((x1 - t, y0, FLOOR), (x1, y1, CEIL))], [M["panel"]], coll),
            "floor": split_boxes(name + "Floor", [((x0, y0, FLOOR), (x1, y1, FLOOR + 0.015))], [M["parquet"]], coll)}


def wall_chunks(name, M, coll, seed=4):
    """The bit of the neighbour's west wall the tunnel breaks through: chunks hidden inside the wall
    until they fly. Returns [(obj, centre)]."""
    r = random.Random(seed)
    out = []
    x0, x1 = R2[0] - WALL + 0.012, R2[0] - 0.012
    s = 0.2
    for iy in range(-4, 4):
        for iz in range(-4, 4):
            cy, cz = (iy + 0.5) * s, TZ + (iz + 0.5) * s
            if cy * cy + (cz - TZ) ** 2 > (T_R + 0.07) ** 2:
                continue
            j = r.uniform(-0.02, 0.02)
            ys = sorted((cy - s / 2 + j, cy + s / 2 - j))
            bx = [((x0, ys[0], cz - s / 2 + 0.005), (x1, ys[1], cz + s / 2 - 0.005))]
            parts = split_boxes(f"{name}{iy}_{iz}", bx, [M["concrete"]], coll)
            for o in parts:
                c = Vector(((x0 + x1) / 2, (ys[0] + ys[1]) / 2, cz))
                root = bpy.data.objects.new(o.name + "R", None); S.link(root, coll); root.location = c
                o.parent = root; o.matrix_parent_inverse = Matrix.Translation(c).inverted()
                out.append((root, o, c))
    return out


def router(M, coll, loc):
    root = bpy.data.objects.new("Router", None); S.link(root, coll); root.location = loc
    P.rbox("RouterBody", (0.22, 0.14, 0.04), S.flat("RouterBlack", (0.02, 0.02, 0.022), 0.3), coll, (0, 0, 0.02), 0.008, root)
    for k in range(4):
        P.cyl(f"RouterLed{k}", 0.006, 0.004, M["led"], coll, (-0.06 + k * 0.04, -0.071, 0.025), rot=(math.pi / 2, 0, 0), parent=root)
    for sx in (-1, 1):
        ant = P.cyl("RouterAntenna", 0.008, 0.18, S.flat("RouterBlack2", (0.02, 0.02, 0.022), 0.3), coll,
                    (sx * 0.09, 0.06, 0.12), rot=(0, sx * math.radians(12), 0), parent=root)
    return root


def bed(M, coll, loc):
    root = bpy.data.objects.new("Bed", None); S.link(root, coll); root.location = loc
    P.rbox("BedFrame", (2.0, 0.95, 0.3), S.flat("BedFrame", (0.25, 0.16, 0.1), 0.6), coll, (0, 0, 0.15), 0.01, root)
    P.rbox("BedMattress", (1.95, 0.9, 0.18), M["mattress"], coll, (0, 0, 0.39), 0.04, root)
    P.rbox("BedBlanket", (1.3, 0.94, 0.04), M["blanket"], coll, (0.3, 0, 0.49), 0.02, root)
    P.rbox("BedPillow", (0.32, 0.6, 0.12), M["mattress"], coll, (-0.78, 0, 0.53), 0.05, root)
    P.rbox("BedHead", (0.06, 0.95, 0.95), S.flat("BedFrame", (0.25, 0.16, 0.1), 0.6), coll, (-1.0, 0, 0.47), 0.01, root)
    bp = P.rbox("BedBackPillow", (0.16, 0.7, 0.5), M["blanket"], coll, (-0.84, 0, 0.72), 0.06, root)
    bp.rotation_euler = (0, math.radians(-22), 0)
    return root


def newspaper_tex():
    from PIL import Image, ImageDraw, ImageFont
    os.makedirs(GEN, exist_ok=True)
    path = os.path.join(GEN, "paper.png")
    im = Image.new("RGB", (512, 700), (232, 228, 214)); d = ImageDraw.Draw(im)
    fb = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", 64)
    d.text((256, 50), "DAILY NEWS", font=fb, fill=(20, 20, 20), anchor="mm")
    d.line((20, 95, 492, 95), fill=(30, 30, 30), width=3)
    r = random.Random(1)
    for col in range(3):
        y = 120
        while y < 680:
            w = r.randint(90, 150); d.rectangle((24 + col * 160, y, 24 + col * 160 + w, y + 5), fill=(90, 90, 90)); y += 14
    d.rectangle((40, 140, 300, 300), fill=(150, 150, 150))
    im.save(path)
    return path


def newspaper(M, coll):
    m = P.image_mat("NewsPaper", newspaper_tex(), 0.8)
    o = P.card("Newspaper", 0.46, 0.6, m, coll)
    return o


# ============================================================================= houses, fences, greenery
def house(name, x0, x1, y0, y1, h, M, mat, coll, facing=+1):
    """A two-storey house with a flat roof; glass doors on the side facing the garden (x1 if facing>0)."""
    S.box(name, (x0, y0, 0), (x1, y1, h), mat, coll)
    S.box(name + "Parapet", (x0 - 0.1, y0 - 0.1, h), (x1 + 0.1, y1 + 0.1, h + 0.35), mat, coll)
    xf = x1 if facing > 0 else x0
    for (ya, yb, za, zb) in ((y0 + 1.0, y0 + 5.5, 0.05, 2.75), (y0 + 6.5, y1 - 1.0, 0.05, 2.75),
                             (y0 + 1.0, y0 + 4.2, 3.7, 5.9), (y0 + 6.0, y1 - 1.0, 3.7, 5.9)):
        S.box(name + "Glass", (xf - 0.01, ya, za), (xf + 0.01, yb, zb), M["glass"], coll)
        for zz in (za, zb - 0.06):
            S.box(name + "FrameH", (xf - 0.03, ya - 0.05, zz), (xf + 0.03, yb + 0.05, zz + 0.06), M["frame"], coll)
        n = max(1, int((yb - ya) / 1.4))
        for k in range(n + 1):
            yy = ya + (yb - ya) * k / n
            S.box(name + "FrameV", (xf - 0.03, yy - 0.03, za), (xf + 0.03, yy + 0.03, zb), M["frame"], coll)
    # the side facing the street (-Y) gets windows too (seen in the wide shots)
    for (xa, xb, za, zb) in ((x0 + 1.0, x0 + 4.0, 0.9, 2.4), (x1 - 4.0, x1 - 1.0, 0.9, 2.4), (x0 + 1.0, x1 - 1.0, 3.8, 5.6)):
        S.box(name + "GlassS", (xa, y0 - 0.02, za), (xb, y0, zb), M["glass"], coll)


def fence(M, coll):
    boxes = []
    y = -12.0
    while y < 14.0:
        boxes.append(((FENCE_X - 0.025, y, 0.0), (FENCE_X + 0.025, y + 0.13, 1.85))); y += 0.14
    boxes.append(((FENCE_X + 0.025, -12.0, 1.55), (FENCE_X + 0.1, 14.0, 1.65)))
    boxes.append(((FENCE_X + 0.025, -12.0, 0.35), (FENCE_X + 0.1, 14.0, 0.45)))
    for k in range(13):
        boxes.append(((FENCE_X + 0.03, -12.0 + k * 2.0, -0.6), (FENCE_X + 0.12, -11.91 + k * 2.0, 1.75)))
    return split_boxes("Fence", boxes, [M["fence"]], coll)


def greenery(coll):
    leaf = ST.foliage_material("YardLeaf", (0.05, 0.09, 0.03)); bark = S.flat("YardBark", (0.1, 0.07, 0.05), 0.9)
    for i, (x, y, s) in enumerate(((-3.5, 9, 1.8), (8.0, 11, 1.6), (13.5, 10, 1.9), (26.0, -6.0, 1.7), (-9.0, -9.0, 1.6),
                                   (-20, 4, 2.0), (36, 6, 1.8))):
        tr = S.new_obj(f"YardTree{i}", ST._tree_mesh(f"YardTree{i}", i + 41, leaf, bark), coll)
        tr.location = (x, y, 0); tr.scale = (s, s, s)
    for i, y in enumerate((-9.0, -5.5, 3.0, 6.5, 10.0)):
        model(("shrub_01", "shrub_02", "shrub_04")[i % 3], coll, (FENCE_X - 0.7, y, 0), i * 47, 0.85)
        model(("shrub_04", "shrub_01", "shrub_02")[i % 3], coll, (FENCE_X + 0.7, y + 1.0, 0), i * 31, 0.8)
    model("outdoor_table_chair_set_01", coll, (-4.0, 4.5, 0.01), 90, 1.0)
    model("potted_plant_02", coll, (-4.6, 2.2, 0.0), 0, 1.2)


def world_and_sun():
    sc = bpy.context.scene
    w = bpy.data.worlds.new("Sky"); sc.world = w; w.use_nodes = True
    nt = w.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(A, "hdri", "kloofendal_43d_clear_puresky.hdr"), check_existing=True)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(200))
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs[0], env.inputs[0])
    bg = nt.nodes["Background"]; nt.links.new(env.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 1.0
    ld = bpy.data.lights.new("Sun", "SUN"); ld.energy = 4.2; ld.color = (1.0, 0.94, 0.84); ld.angle = math.radians(1.2)
    sun = bpy.data.objects.new("Sun", ld); S.link(sun)
    az, el = -70.0, 46.0
    d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
    sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return sun, bg


def point(name, coll, loc, energy, col=(1.0, 0.82, 0.55), radius=0.08):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = col; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); S.link(o, coll); o.location = loc
    return o


# ============================================================================= everything
def build_all():
    M = materials()
    yard = S.collection("Yard")
    cut = S.collection("Cutters")
    C = cutters(cut)
    ground(M, C, yard)
    house("HouseA", -16.0, -6.0, 2.0, 14.0, 6.4, M, M["stucco"], yard, +1)
    house("HouseB", 23.0, 33.0, 2.0, 14.0, 6.4, M, M["stucco2"], yard, -1)
    S.box("PatioA", (-6.0, 1.0, -0.02), (-2.5, 8.0, 0.01), M["paving"], yard)
    fence(M, yard); greenery(yard)
    bpy.context.view_layer.update()
    for o in list(yard.all_objects):
        if o.type == "MESH" and o not in FRONT:
            ys = [(o.matrix_world @ Vector(c)).y for c in o.bound_box]
            if max(ys) < Y_CUT:
                FRONT.append(o)

    build = S.collection("Build")
    R = {"M": M, "C": C}
    R["dh1"], R["dh1_objs"] = doghouse("Doghouse1", D1, M, M["dogwood"], M["shingle"], "REX", build)
    R["dh2"], R["dh2_objs"] = doghouse("Doghouse2", D2, M, M["dogwood2"], M["shingle2"], "MAX", build)
    for d, nm in ((D1, "Bowl1"), (D2, "Bowl2")):
        b = P.cyl(nm, 0.13, 0.07, M["bowl"], build, (d.x + 0.95, d.y - 0.5, 0.035))
        FRONT.append(b)
    R["rings1"] = rings("Ring1_", D1, N_RINGS, M, build)
    R["rings2"] = rings("Ring2_", D2, 7, M, build)
    R["ladder1"] = ladder("Ladder1", D1, 0.6, FLOOR, M, build)
    R["ladder2"] = ladder("Ladder2", D2, 0.6, FLOOR, M, build)
    R["shell1"] = bunker_shell("Bunker1", R1[0], R1[1], M, build, M["concrete"])
    R["shell2"] = bunker_shell("Bunker2", R2[0], R2[1], M, build, M["concrete"])
    R["panel2"] = panelling("Panel2", R2[0], R2[1], M, build)
    for objs, key in ((R["shell1"]["ceil"], "s1m"), (R["shell1"]["east"], "tm"), (R["shell2"]["ceil"], "s2m"),
                      (R["shell2"]["west"], "tm"), (R["panel2"]["west"], "tm")):
        for o in objs:
            md = o.modifiers.new("cut_" + key, "BOOLEAN"); md.operation = "DIFFERENCE"; md.solver = "EXACT"
            md.object = C[key]
    R["chunks"] = wall_chunks("Chunk", M, build)
    # the vent, from your ceiling up through the doghouse roof, and its chimney
    vh = 1.32 - CEIL
    vroot = bpy.data.objects.new("VentRoot", None); S.link(vroot, build); vroot.location = (VENT.x, VENT.y, CEIL)
    P.cyl("VentPipe", 0.085, vh, M["white"], build, (0, 0, vh / 2), parent=vroot, verts=32)
    for k in range(5):
        P.cyl(f"VentBracket{k}", 0.1, 0.04, M["steel"], build, (0, 0, 0.4 + k * (vh - 0.8) / 4), parent=vroot)
    R["vent"] = vroot
    R["chimney1"] = chimney("Chimney1", Vector((VENT.x, 0.0, 1.3)), M, build)
    R["chimney2"] = chimney("Chimney2", Vector((D2.x + 0.66, 0.0, 1.3)), M, build)
    # the power cable: from your house, under the lawn, into the ceiling (draws on with bevel_factor_end)
    cu = bpy.data.curves.new("Cable", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.05; cu.bevel_resolution = 3
    cu.bevel_factor_mapping_end = "SPLINE"            # draws on by length, not by segment
    sp = cu.splines.new("POLY")
    pts = [(-6.05, 2.0, 0.4), (-6.05, 2.0, -0.55), (-5.0, 0.0, -0.6), (1.0, 0.0, -0.6), (1.85, 0.0, -1.2), (1.85, 0.0, CEIL + WALL - 0.02)]
    sp.points.add(len(pts) - 1)
    for p_, q in zip(sp.points, pts):
        p_.co = (*q, 1.0)
    cu.materials.append(M["cable"])
    R["cable"] = S.new_obj("Cable", cu, build)
    # tunnel liner: corrugated half-rings, 0.6 m each
    R["liner"] = []
    x = R1[1] + WALL
    k = 0
    while x < R2[0] - WALL - 0.05:
        L = min(0.6, R2[0] - WALL - x)
        b = half_tube(f"Liner{k}B", T_R, T_R + 0.04, L - 0.01, M["liner"], build, axis="X", corr=0.012, corr_n=5)
        f_ = half_tube(f"Liner{k}F", T_R, T_R + 0.04, L - 0.01, M["liner"], build, axis="X", front=True, corr=0.012, corr_n=5)
        for o in (b, f_):
            o.location = (x, 0.0, TZ)
        R["liner"].append(([b, f_], x))
        x += L; k += 1
    # your bunker's things
    furn = S.collection("Furnishing1")
    R["bed"] = bed(M, furn, (5.9, 2.45, FLOOR))
    R["shelf"] = model("Shelf_01", furn, (2.2, RY[1] - 0.02, FLOOR), 0, 1.0)
    cans = []
    for i in range(6):
        for j, z in enumerate((0.42, 0.82)):
            cans.append(model("russian_food_cans_01", furn, (1.85 + i * 0.14, RY[1] - 0.12, FLOOR + z), i * 30, 1.6))
    R["cans"] = cans
    R["jugs"] = [model("plastic_bottle_gallon", furn, (2.0 + i * 0.2, RY[1] - 0.15, FLOOR + 1.62), 0, 1.0) for i in range(4)]
    R["crate"] = model("plastic_crate_01", furn, (4.65, 2.6, FLOOR), 90, 1.4)
    R["router"] = router(M, furn, (4.65, 2.6, FLOOR + 0.37))
    R["laptop"] = model("classic_laptop", furn, (0, 0, 0), 0, 0.7)
    R["radio"] = model("vintage_radio_transceiver", furn, (7.0, 1.2, FLOOR), 250, 0.8)
    lamps1 = []
    for i, x in enumerate((2.8, 5.6)):
        lamps1.append(model("caged_hanging_light", furn, (x, 1.3, CEIL), 0, 1.0))
    R["lamps1"] = lamps1
    R["lights1"] = [point(f"BunkerLight{i}", furn, (x, 1.3, CEIL - 0.6), 0.0) for i, x in enumerate((2.8, 5.6))]
    R["rug1"] = boxes_mesh("Rug1", [((3.2, 0.4, FLOOR), (5.4, 2.2, FLOOR + 0.012))], [M["rug"]], furn)
    # the neighbour's bunker
    nfurn = S.collection("Furnishing2")
    R["armchair"] = model("ArmChair_01", nfurn, (16.3, 2.1, FLOOR + 0.015), 180, 1.05)
    R["sidetable"] = model("side_table_01", nfurn, (15.3, 2.4, FLOOR + 0.015), 0, 1.0)
    R["desklamp"] = model("desk_lamp_arm_01", nfurn, (15.3, 2.45, FLOOR + 0.57), 200, 0.8)
    R["bookshelf"] = model("wooden_bookshelf_worn", nfurn, (17.9, RY[1] - 0.3, FLOOR + 0.015), 180, 1.0)
    R["tv"] = model("Television_01", nfurn, (16.3, -0.4, FLOOR + 0.56), 0, 1.2)
    R["tvtable"] = model("side_table_01", nfurn, (16.3, -0.4, FLOOR + 0.015), 0, 1.0)
    R["rug2"] = boxes_mesh("Rug2", [((15.2, 0.2, FLOOR + 0.015), (18.8, 2.9, FLOOR + 0.025))],
                           [S.flat("Rug2", (0.12, 0.2, 0.32), 0.85)], nfurn)
    S.box("Fridge2", (19.25, 2.3, FLOOR + 0.015), (19.9, 2.95, FLOOR + 1.3), M["fridge"], nfurn)
    R["lights2"] = [point("NeighborLamp", nfurn, (15.4, 2.2, FLOOR + 1.2), 60.0), point("NeighborCeil", nfurn, (16.6, 1.2, CEIL - 0.3), 110.0)]
    R["newspaper"] = newspaper(M, nfurn)
    # tools and digging props
    tools = S.collection("Tools")
    R["pick"] = model("picke_dirty_01", tools, (0, 0, 0), 0, 1.0)
    R["bucket"] = model("wooden_bucket_01", tools, (D1.x, 0.0, 0.0), 0, 0.7)
    rope_m = S.flat("Rope", (0.55, 0.45, 0.3), 0.8)
    R["rope"] = P.cyl("BucketRope", 0.01, 1.0, rope_m, tools, (0, 0, 0.5))
    R["spade"] = model("rusted_spade_01", tools, (0, 0, 0), 0, 1.0) if os.path.exists(os.path.join(A, "models", "rusted_spade_01")) else None
    # tripod with a chain hoist over the shaft (for the rings)
    tri = bpy.data.objects.new("Tripod", None); S.link(tri, tools); tri.location = (D1.x, 0.0, 0.0)
    top = Vector((0, 0, 2.9))
    for k in range(3):
        a = math.radians(90 + k * 120)
        foot = Vector((1.25 * math.cos(a), 1.25 * math.sin(a), 0.0))
        d = top - foot
        leg = P.cyl(f"TripodLeg{k}", 0.04, d.length, M["steel"], tools, (foot + top) / 2, parent=tri)
        leg.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    P.rbox("TripodHoist", (0.18, 0.12, 0.28), S.flat("HoistYellow", (0.9, 0.62, 0.03), 0.4), tools, (0, 0, 2.7), 0.02, tri)
    R["tripod"] = tri
    R["chain"] = P.cyl("HoistChain", 0.012, 1.0, M["steel"], tools, (0, 0, 0))
    # dirt clods for the cave-in and the digging
    R["clods"] = []
    rr = random.Random(7)
    for i in range(36):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=rr.uniform(0.05, 0.13))
        for v in bm.verts:
            v.co *= rr.uniform(0.75, 1.2)
        me = bpy.data.meshes.new(f"Clod{i}"); bm.to_mesh(me); bm.free(); me.materials.append(M["soil"])
        R["clods"].append(S.new_obj(f"Clod{i}", me, tools))
    # "6 m" marker beside the shaft
    dm = boxes_mesh("Dim6", [((D1.x - 0.95, -0.02, FLOOR), (D1.x - 0.91, 0.02, 0.0)),
                             ((D1.x - 1.08, -0.02, -0.03), (D1.x - 0.78, 0.02, 0.0)),
                             ((D1.x - 1.08, -0.02, FLOOR), (D1.x - 0.78, 0.02, FLOOR + 0.03))], [M["text"]], tools)
    t6 = P.text3d("Dim6Text", "6 m", 0.5, M["text"], tools, extrude=0.02)
    t6.location = (D1.x - 1.45, -0.03, FLOOR / 2); t6.rotation_euler = (math.radians(90), 0, math.radians(0))
    R["dims"] = [dm, t6]
    # a dim glow at the bottom of the finished shaft (seen through the doghouse door at the start)
    R["shaftglow"] = point("ShaftGlow", build, (D1.x, 0.1, -2.0), 0.0)
    R["worklight"] = point("WorkLight", build, (D1.x + 0.35, 0.55, CEIL - 0.35), 0.0, (1.0, 0.85, 0.6), 0.05)
    wb = P.cyl("WorkBulb", 0.05, 0.1, emit_mat("WorkBulbGlow", (1.0, 0.88, 0.65), 20.0), build, (D1.x + 0.35, 0.55, CEIL - 0.3))
    wire = P.cyl("WorkWire", 0.006, 0.4, M["dark"], build, (D1.x + 0.35, 0.55, CEIL - 0.05))
    R["workbulb"] = [wb, wire]
    bpy.context.view_layer.update()
    for coll in (furn, nfurn, tools):
        for o in coll.all_objects:
            if o.type == "MESH" and o not in FRONT:
                ys = [(o.matrix_world @ Vector(c)).y for c in o.bound_box]
                if max(ys) < Y_CUT:
                    FRONT.append(o)
    return R
