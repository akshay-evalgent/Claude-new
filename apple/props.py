"""3D props for the Apple short, built procedurally (textures from paper.py): paper sheets with typed
reveal, bills, a cheque, the typewriter, a flip calendar, the 45/45/10 pie, circuit boards, fishing
hooks, debt tags, a gavel, paddles, the auction board, the newspaper, an arcade cabinet and the cash
pallets."""
import math, os, random
import bmesh
import bpy
from mathutils import Vector, Matrix

import sets as S

GEN = os.path.join(os.environ["QS_SCRATCH"], "gen")
FONT = os.path.join(os.environ["QS_SCRATCH"], "..", "fonts", "OpenSans-ExtraBold.ttf")


def gen(name):
    return os.path.join(GEN, name)


# ----------------------------------------------------------------------------- materials
def image_mat(name, path, rough=0.6, alpha=False, emission=0.0, sheen=0.15, closest=False):
    m, nt, b = S._new_mat(name)
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    if closest:
        t.interpolation = "Closest"
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Sheen Weight"].default_value = sheen
    if alpha:
        t.image.alpha_mode = "STRAIGHT"
        nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    if emission:
        nt.links.new(t.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emission
    return m


def reveal_mat(name, path, base=(0.84, 0.81, 0.72), mode="lines", rough=0.6):
    """Paper whose printed image appears progressively: mode 'lines' (top to bottom, typed) or 'wipe'
    (diagonal, drawn). Key the value node 'Reveal' from 0 to 1."""
    m, nt, b = S._new_mat(name)
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(path, check_existing=True)
    t.image.alpha_mode = "STRAIGHT"
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["UV"], sep.inputs[0])
    lvl = nt.nodes.new("ShaderNodeValue"); lvl.name = "Reveal"; lvl.outputs[0].default_value = 1.0
    if mode == "lines":
        # whole typed lines top to bottom; the current line types left to right
        step = 0.0265
        q = S._math(nt, "SNAP", S._math(nt, "SUBTRACT", 1.0, sep.outputs["Y"]), step)
        full = S._math(nt, "LESS_THAN", S._math(nt, "ADD", q, step), lvl.outputs[0])
        started = S._math(nt, "LESS_THAN", q, lvl.outputs[0])
        frac = S._math(nt, "DIVIDE", S._math(nt, "SUBTRACT", lvl.outputs[0], q), step)
        partial = S._math(nt, "MULTIPLY", started, S._math(nt, "LESS_THAN", sep.outputs["X"], frac))
        fac = S._math(nt, "MAXIMUM", full, partial)
    else:
        diag = S._math(nt, "ADD", S._math(nt, "MULTIPLY", sep.outputs["X"], 0.55),
                       S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", 1.0, sep.outputs["Y"]), 0.45))
        fac = S._math(nt, "LESS_THAN", diag, lvl.outputs[0])
    a = S._math(nt, "MULTIPLY", t.outputs["Alpha"], fac)
    paper = nt.nodes.new("ShaderNodeRGB"); paper.outputs[0].default_value = (*base, 1)
    col = S._mix(nt, a, paper.outputs[0], t.outputs["Color"])
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = rough
    b.inputs["Sheen Weight"].default_value = 0.15
    return m, lvl


# ----------------------------------------------------------------------------- simple shapes
def card(name, w, h, mat, coll, origin="center", back=None):
    """Flat rectangle in local XY (+Z up), UV 0..1. origin: center | left | top | bottom."""
    ox = {"left": 0.0}.get(origin, -w / 2)
    oy = {"top": -h, "bottom": 0.0}.get(origin, -h / 2)
    v = [(ox, oy, 0), (ox + w, oy, 0), (ox + w, oy + h, 0), (ox, oy + h, 0)]
    me = bpy.data.meshes.new(name); me.from_pydata(v, [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new()
    for li, (u, vv) in zip(range(4), ((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[li].uv = (u, vv)
    me.materials.append(mat)
    o = S.new_obj(name, me, coll)
    return o


def rbox(name, size, mat, coll, loc=(0, 0, 0), bevel=0.0, parent=None):
    sx, sy, sz = size
    o = S.box(name, (-sx / 2, -sy / 2, -sz / 2), (sx / 2, sy / 2, sz / 2), mat, coll)
    if bevel:
        bv = o.modifiers.new("bevel", "BEVEL"); bv.width = bevel; bv.segments = 3
    o.location = loc
    if parent:
        o.parent = parent
    return o


def cyl(name, r, h, mat, coll, loc=(0, 0, 0), rot=(0, 0, 0), verts=24, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r, depth=h)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    o = S.new_obj(name, me, coll); o.location = loc; o.rotation_euler = rot
    if parent:
        o.parent = parent
    return o


def text3d(name, body, size, mat, coll, extrude=0.0, align="CENTER"):
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body; cu.size = size; cu.extrude = extrude
    cu.align_x = align; cu.align_y = "CENTER"
    cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    cu.materials.append(mat)
    return S.new_obj(name, cu, coll)


def flat(name, col, rough=0.5, metal=0.0):
    return S.flat(name, col, rough, metal)


# ----------------------------------------------------------------------------- paper and money
PAGE = (0.216, 0.279)
BILL = (0.156, 0.066)


def page(name, tex, coll, mat=None):
    mat = mat or image_mat(name + "Mat", gen(tex), 0.65)
    return card(name, PAGE[0], PAGE[1], mat, coll)


_bill_mat = None


def bill(name, coll):
    global _bill_mat
    if _bill_mat is None:
        _bill_mat = image_mat("BillMat", gen("bill.png"), 0.55)
    return card(name, BILL[0], BILL[1], _bill_mat, coll)


def cheque(name, coll):
    return card(name, 0.163, 0.07, image_mat(name + "Mat", gen("cheque.png"), 0.6), coll)


def pen(name, coll):
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    body = flat(name + "Body", (0.02, 0.03, 0.12), 0.3)
    cyl(name + "Barrel", 0.0045, 0.13, body, coll, (0, 0, 0.075), parent=root)
    tip = flat(name + "Tip", (0.7, 0.7, 0.72), 0.2, 1.0)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.0045, radius2=0.0006, depth=0.02)
    me = bpy.data.meshes.new(name + "TipMesh"); bm.to_mesh(me); bm.free(); me.materials.append(tip)
    t = S.new_obj(name + "TipObj", me, coll); t.parent = root; t.location = (0, 0, 0.01); t.rotation_euler = (math.pi, 0, 0)
    return root


def folder(name, coll):
    m = flat(name + "Mat", (0.62, 0.48, 0.26), 0.7)
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    a = card(name + "Back", 0.235, 0.305, m, coll); a.parent = root
    b = card(name + "Front", 0.235, 0.29, m, coll, origin="bottom"); b.parent = root
    b.location = (0, -0.1525, 0.004)
    return root, b


# ----------------------------------------------------------------------------- typewriter
def typewriter(coll):
    root = bpy.data.objects.new("Typewriter", None); S.link(root, coll)
    body = flat("TWBody", (0.32, 0.36, 0.26), 0.35)           # olive 70s enamel
    dark = flat("TWDark", (0.02, 0.02, 0.022), 0.4)
    chrome = flat("TWChrome", (0.75, 0.75, 0.77), 0.18, 1.0)
    keycap = flat("TWKey", (0.85, 0.83, 0.76), 0.35)
    rbox("TWBase", (0.40, 0.34, 0.07), body, coll, (0, 0, 0.035), 0.012, root)
    hood = rbox("TWHood", (0.40, 0.16, 0.06), body, coll, (0, 0.09, 0.095), 0.015, root)
    rbox("TWDeck", (0.34, 0.16, 0.012), dark, coll, (0, -0.07, 0.072), 0.003, root)
    keys = []
    for r in range(4):
        for k in range(11 - (r == 3) * 1):
            x = -0.15 + k * 0.03 + r * 0.006
            y = -0.135 + r * 0.03
            z = 0.082 + r * 0.008
            stem = cyl(f"TWStem{r}_{k}", 0.002, 0.02, chrome, coll, (x, y, z - 0.008), parent=root, verts=6)
            cap = cyl(f"TWKey{r}_{k}", 0.0085, 0.006, keycap, coll, (x, y, z + 0.004), parent=root, verts=16)
            keys.append(cap)
    space = rbox("TWSpace", (0.16, 0.014, 0.008), keycap, coll, (0, -0.16, 0.08), 0.003, root)
    keys.append(space)
    # carriage: platen roller and the paper rising out of it
    cyl("TWPlaten", 0.024, 0.38, dark, coll, (0, 0.14, 0.15), (0, math.pi / 2, 0), parent=root)
    for sx in (-1, 1):
        cyl(f"TWKnob{sx}", 0.02, 0.025, dark, coll, (sx * 0.205, 0.14, 0.15), (0, math.pi / 2, 0), parent=root)
    rbox("TWBail", (0.34, 0.006, 0.006), chrome, coll, (0, 0.115, 0.168), 0.002, root)
    lever = rbox("TWLever", (0.07, 0.008, 0.008), chrome, coll, (-0.24, 0.12, 0.17), 0.003, root)
    lever.rotation_euler = (0, 0, 0.3)
    return root, keys


# ----------------------------------------------------------------------------- calendar
def flip_calendar(coll):
    root = bpy.data.objects.new("Calendar", None); S.link(root, coll)
    stand = flat("CalStand", (0.12, 0.08, 0.05), 0.5)
    rbox("CalBase", (0.17, 0.12, 0.02), stand, coll, (0, 0, 0.01), 0.004, root)
    # pages hang from a ring at the top of a slanted board
    board = rbox("CalBoard", (0.16, 0.006, 0.19), stand, coll, (0, 0.02, 0.115), 0.003, root)
    board.rotation_euler = (math.radians(-12), 0, 0)
    ring = bpy.data.objects.new("CalRing", None); S.link(ring, coll); ring.parent = root
    ring.location = (0, 0.0, 0.205); ring.rotation_euler = (math.radians(-12), 0, 0)
    pages = []
    for day in range(1, 13):
        m = image_mat(f"CalPage{day}", gen(f"cal_{day:02d}.png"), 0.7)
        hinge = bpy.data.objects.new(f"CalHinge{day}", None); S.link(hinge, coll); hinge.parent = ring
        hinge.location = (0, -0.0045 - (12 - day) * 0.0004, 0)
        p = card(f"CalPg{day}", 0.15, 0.175, m, coll, origin="top"); p.parent = hinge
        p.rotation_euler = (math.radians(90), 0, 0)          # stand the card up (facing -Y)
        pages.append(hinge)
    return root, pages      # hinge i rotates about X by about -200 degrees to flip page i over the top


# ----------------------------------------------------------------------------- pie chart
def wedge(name, a0, a1, r, h, mat, coll):
    bm = bmesh.new()
    n = max(4, int(abs(a1 - a0) / math.radians(6)))
    c0 = bm.verts.new((0, 0, 0)); c1 = bm.verts.new((0, 0, h))
    rim0, rim1 = [], []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        rim0.append(bm.verts.new((r * math.cos(a), r * math.sin(a), 0)))
        rim1.append(bm.verts.new((r * math.cos(a), r * math.sin(a), h)))
    for i in range(n):
        bm.faces.new((c1, rim1[i], rim1[i + 1]))
        bm.faces.new((c0, rim0[i + 1], rim0[i]))
        bm.faces.new((rim0[i], rim0[i + 1], rim1[i + 1], rim1[i]))
    bm.faces.new((c0, rim0[0], rim1[0], c1))
    bm.faces.new((c0, c1, rim1[-1], rim0[-1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(mat)
    o = S.new_obj(name, me, coll)
    bv = o.modifiers.new("bevel", "BEVEL"); bv.width = 0.004; bv.segments = 2; bv.limit_method = "ANGLE"
    return o


def pie(coll):
    """Three slices: 45% (amber), 45% (teal), 10% (red, Wayne's). Returns root and slice roots."""
    root = bpy.data.objects.new("Pie", None); S.link(root, coll)
    cols = [(0.85, 0.55, 0.12), (0.12, 0.52, 0.6), (0.8, 0.12, 0.1)]
    spans = [(math.radians(90), math.radians(90 + 162)), (math.radians(90 + 162), math.radians(90 + 324)),
             (math.radians(90 + 324), math.radians(450))]
    labels = ["45%", "45%", "10%"]
    white = flat("PieLabel", (0.95, 0.95, 0.95), 0.4)
    slices = []
    for i, ((a0, a1), col, lab) in enumerate(zip(spans, cols, labels)):
        sr = bpy.data.objects.new(f"PieSlice{i}", None); S.link(sr, coll); sr.parent = root
        m = flat(f"PieMat{i}", col, 0.35)
        w = wedge(f"PieWedge{i}", a0, a1, 0.16, 0.05, m, coll); w.parent = sr
        am = (a0 + a1) / 2
        t = text3d(f"PieText{i}", lab, 0.05 if i < 2 else 0.032, white, coll, extrude=0.002)
        t.parent = sr; t.location = (0.1 * math.cos(am), 0.1 * math.sin(am), 0.052)
        t.rotation_euler = (0, 0, am - math.pi / 2 if i < 2 else am - math.pi / 2)
        sr["mid"] = am
        slices.append(sr)
    return root, slices


# ----------------------------------------------------------------------------- circuit boards
def pcb(name, coll, mat):
    o = rbox(name, (0.24, 0.15, 0.0025), mat, coll)
    return o


def pcb_material():
    m = image_mat("PCBMat", gen("pcb.png"), 0.4)
    return m


# ----------------------------------------------------------------------------- hook, tag, debt board
def hook(name, coll, scale=1.0):
    """A big chrome fishing hook (point up, eye at the top of the shank)."""
    chrome = flat("HookChrome", (0.8, 0.8, 0.82), 0.15, 1.0)
    cu = bpy.data.curves.new(name, "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.012 * scale
    cu.bevel_resolution = 4
    sp = cu.splines.new("BEZIER")
    pts = [(0, 0, 0.0), (0, 0, -0.35), (0.0, 0, -0.52), (0.11, 0, -0.55), (0.15, 0, -0.42), (0.14, 0, -0.3)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = Vector(p) * scale; bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.materials.append(chrome)
    o = S.new_obj(name, cu, coll)
    # barb and eye
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.02 * scale, radius2=0.0, depth=0.07 * scale)
    me = bpy.data.meshes.new(name + "Barb"); bm.to_mesh(me); bm.free(); me.materials.append(chrome)
    b = S.new_obj(name + "Barb", me, coll); b.parent = o
    b.location = Vector((0.14, 0, -0.27)) * scale; b.rotation_euler = (0, math.radians(-12), 0)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=False, segments=20, radius=0.035 * scale)
    me = bpy.data.meshes.new(name + "EyeM"); bm.to_mesh(me); bm.free()
    eye = S.new_obj(name + "Eye", me, coll); eye.parent = o
    eye.location = (0, 0, 0.035 * scale); eye.rotation_euler = (math.pi / 2, 0, 0)
    sk = eye.modifiers.new("skin", "SKIN")
    for v in eye.data.skin_vertices[0].data:
        v.radius = (0.01 * scale, 0.01 * scale)
    eye.data.materials.append(chrome)
    return o


def rope(name, length, coll, r=0.006, col=(0.12, 0.12, 0.12)):
    return cyl(name, r, length, flat(name + "Mat", col, 0.6), coll, verts=8)


def tag(name, coll, size=0.6):
    m = image_mat("TagMat", gen("tag.png"), 0.6, alpha=True)
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    c = card(name + "Card", size * 0.625, size, m, coll, origin="top"); c.parent = root
    c.rotation_euler = (math.radians(90), 0, 0)
    return root


def debt_board(coll):
    m = image_mat("DebtMat", gen("debt.png"), 0.6)
    root = bpy.data.objects.new("DebtBoard", None); S.link(root, coll)
    c = card("DebtCard", 1.6, 0.9, m, coll); c.parent = root; c.rotation_euler = (math.radians(90), 0, 0)
    frame = flat("DebtFrame", (0.08, 0.06, 0.05), 0.5)
    rbox("DebtBack", (1.66, 0.03, 0.96), frame, coll, (0, 0.017, 0), 0.006, root)
    return root


# ----------------------------------------------------------------------------- auction pieces
def gavel(coll):
    wood = S.pbr("GavelWood", "fine_grained_wood", 0.2, tint=(0.55, 0.32, 0.18))
    root = bpy.data.objects.new("Gavel", None); S.link(root, coll)
    cyl("GavelHead", 0.032, 0.13, wood, coll, (0, 0, 0), (0, math.pi / 2, 0), parent=root)
    for sx in (-1, 1):
        cyl(f"GavelBand{sx}", 0.034, 0.012, flat("GavelBrass", (0.75, 0.55, 0.2), 0.25, 1.0), coll,
            (sx * 0.045, 0, 0), (0, math.pi / 2, 0), parent=root)
    cyl("GavelHandle", 0.011, 0.26, wood, coll, (0, -0.13, 0), (math.pi / 2, 0, 0), parent=root)
    block = cyl("GavelBlock", 0.07, 0.03, wood, coll, (0, 0, 0))
    return root, block


def paddle(name, n, coll):
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    m = image_mat(name + "Mat", gen(f"paddle_{n}.png"), 0.6)
    for k in (0, 1):  # two faces back to back so the number reads from either side
        c = card(name + f"Face{k}", 0.2, 0.2, m, coll); c.parent = root
        c.rotation_euler = (math.radians(90), 0, math.pi * k); c.location = (0, 0.002 * (1 - 2 * k), 0.12)
    cyl(name + "Stick", 0.008, 0.2, flat("PaddleStick", (0.5, 0.35, 0.2), 0.6), coll, (0, 0.002, -0.06), parent=root)
    return root


def auction_board(coll, n_prices=6):
    root = bpy.data.objects.new("AuctionBoard", None); S.link(root, coll)
    frame = flat("BoardFrame", (0.02, 0.02, 0.025), 0.4)
    rbox("BoardBack", (2.5, 0.08, 1.45), frame, coll, (0, 0.05, 0), 0.01, root)
    faces = []
    for k in list(range(n_prices)) + ["sold"]:
        nm = f"board_{k}.png"
        m = image_mat(f"BoardMat{k}", gen(nm), 0.3, emission=2.2)
        c = card(f"BoardFace{k}", 2.4, 1.35, m, coll); c.parent = root; c.rotation_euler = (math.radians(90), 0, 0)
        c.location = (0, 0, 0)
        faces.append(c)
    return root, faces


def newspaper(coll):
    m = image_mat("NewsMat", gen("newspaper.png"), 0.75)
    root = bpy.data.objects.new("Newspaper", None); S.link(root, coll)
    # slightly curved broadsheet (subdivided, bent)
    me = bpy.data.meshes.new("NewsMesh")
    nx, ny = 12, 2
    w, h = 0.42, 0.56
    verts, faces, uvs = [], [], []
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, v = i / nx, j / ny
            x = (u - 0.5) * w
            verts.append((x, -0.03 * math.cos((u - 0.5) * math.pi) + 0.03, (v - 0.5) * h))
    for j in range(ny):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new()
    for p in me.polygons:
        for li, vi in zip(p.loop_indices, p.vertices):
            i, j = vi % (nx + 1), vi // (nx + 1)
            uv.data[li].uv = (i / nx, j / ny)
    me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj("NewsSheet", me, coll); o.parent = root
    sol = o.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.002
    return root


# ----------------------------------------------------------------------------- arcade cabinet
def arcade(name, coll, col=(0.05, 0.05, 0.06), stripe=(0.9, 0.35, 0.08)):
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    body = flat(name + "Body", col, 0.4)
    st = flat(name + "Stripe", stripe, 0.35)
    # side profile extruded in X
    prof = [(0.0, 0.0), (0.62, 0.0), (0.62, 0.95), (0.42, 1.08), (0.48, 1.55), (0.62, 1.62), (0.62, 1.78),
            (0.0, 1.78)]
    bm = bmesh.new()
    left = [bm.verts.new((-0.34, -y, z)) for y, z in prof]
    right = [bm.verts.new((0.34, -y, z)) for y, z in prof]
    bm.faces.new(left[::-1]); bm.faces.new(right)
    n = len(prof)
    for i in range(n):
        bm.faces.new((left[i], left[(i + 1) % n], right[(i + 1) % n], right[i]))
    me = bpy.data.meshes.new(name + "Mesh"); bm.to_mesh(me); bm.free(); me.materials.append(body)
    o = S.new_obj(name + "Shell", me, coll); o.parent = root
    for sx in (-1, 1):
        s = rbox(f"{name}Side{sx}", (0.012, 0.5, 1.6), st, coll, (sx * 0.345, -0.32, 0.85), 0.0, root)
    scr = image_mat(name + "Screen", gen("arcade.png"), 0.15, emission=3.0)
    c = card(name + "ScreenCard", 0.5, 0.42, scr, coll); c.parent = root
    c.location = (0, -0.46, 1.32); c.rotation_euler = (math.radians(90 - 20), 0, 0)
    marq = flat(name + "MarqueeMat", stripe, 0.3)
    marq.node_tree.nodes["Principled BSDF"].inputs["Emission Color"].default_value = (*stripe, 1)
    marq.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 2.0
    rbox(name + "Marquee", (0.64, 0.02, 0.15), marq, coll, (0, -0.625, 1.7), 0.0, root)
    stick = flat(name + "Knob", (0.8, 0.1, 0.08), 0.3)
    cyl(name + "Stick", 0.006, 0.06, flat("StickMetal", (0.5, 0.5, 0.52), 0.3, 1.0), coll, (-0.12, -0.52, 1.1), parent=root)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=0.022)
    me = bpy.data.meshes.new(name + "Ball"); bm.to_mesh(me); bm.free(); me.materials.append(stick)
    b = S.new_obj(name + "BallObj", me, coll); b.parent = root; b.location = (-0.12, -0.52, 1.14)
    for k in range(2):
        cyl(f"{name}Btn{k}", 0.016, 0.012, stick, coll, (0.05 + k * 0.06, -0.52, 1.1), parent=root)
    return root


# ----------------------------------------------------------------------------- cash pallet
PALLET = (1.2, 1.0, 1.2)     # footprint and height of one pallet of $100 bills (about $100 million)


def cash_pallet(name, coll):
    """One pallet (wood base + banded bundles), origin at the floor centre. Box-UV'd faces."""
    wood = S.pbr(name + "Wood", "fine_grained_wood", 0.6, tint=(0.75, 0.6, 0.42))
    side = image_mat(name + "Side", gen("cash_sides.png"), 0.6)
    top = image_mat(name + "Top", gen("cash_top.png"), 0.55)
    for m in (side, top):  # banknote green: the printed texture alone washes out to white in sunlight
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        src = b.inputs["Base Color"].links[0].from_socket
        nt.links.new(S._mix(nt, 1.0, src, (0.42, 0.62, 0.4), blend="MULTIPLY"), b.inputs["Base Color"])
    w, d, h = PALLET
    base_h = 0.14
    bm = bmesh.new()
    x0, x1, y0, y1, z0, z1 = -w / 2 + 0.01, w / 2 - 0.01, -d / 2 + 0.01, d / 2 - 0.01, base_h, h
    v = [bm.verts.new(p) for p in ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                    (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
    faces = [((4, 5, 6, 7), 1), ((0, 1, 5, 4), 0), ((1, 2, 6, 5), 0), ((2, 3, 7, 6), 0), ((3, 0, 4, 7), 0),
             ((0, 3, 2, 1), 0)]
    uvl = bm.loops.layers.uv.new()
    for idx, mi in faces:
        f = bm.faces.new([v[i] for i in idx]); f.material_index = mi
        for loop, uvv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            loop[uvl].uv = uvv
    me = bpy.data.meshes.new(name + "Cash"); bm.to_mesh(me); bm.free()
    me.materials.append(side); me.materials.append(top)
    cash = S.new_obj(name, me, coll)
    # pallet slats (joined into the same object's children)
    for k in range(3):
        y = -d / 2 + 0.06 + k * (d - 0.12) / 2
        s = rbox(f"{name}Runner{k}", (w, 0.1, 0.09), wood, coll, (0, y, 0.045), 0.0, cash)
    for k in range(5):
        x = -w / 2 + 0.07 + k * (w - 0.14) / 4
        rbox(f"{name}Slat{k}", (0.12, d, 0.025), wood, coll, (x, 0, 0.1275), 0.0, cash)
    return cash


def pallet_field(name, proto, nx, ny, nz, coll, origin=(0, 0, 0), gap=0.06):
    """Instance `proto` (and its children) on a lattice of points: memory-cheap in Cycles."""
    pts = []
    w, d, h = PALLET
    for k in range(nz):
        for j in range(ny):
            for i in range(nx):
                pts.append((i * (w + gap), j * (d + gap), k * h))
    me = bpy.data.meshes.new(name + "Pts"); me.from_pydata(pts, [], [])
    o = S.new_obj(name, me, coll)
    o.location = origin
    o.instance_type = "VERTS"
    holder = proto.copy(); holder.data = proto.data; S.link(holder, coll)
    for c in proto.children:
        cc = c.copy(); S.link(cc, coll); cc.parent = holder
    holder.parent = o; holder.location = (0, 0, 0)
    return o
