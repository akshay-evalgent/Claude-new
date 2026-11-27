"""The backyard, the ground in section, and the machinery of the pool garage.

World (metres): the pool's centre at the origin, ground level z = 0, the pool's long axis along Y.
  pit      x -2.5..2.5, y -5..5, 4 m deep, concrete walls and slab 0.3 m thick
  tub      a steel tub filling the top 1.6 m of the pit, tiled inside, rim flush with the deck
  rams     four telescopic rams in the corners that lift the tub 3.4 m
  lift     a two-stage scissor lift at the far (+Y) end that brings the car up to the deck
  deck     timber boards around the pool; the driveway leaves the far end along +Y
  house    to the left (-X); the neighbour's fence and house to the right (+X)

Cutaway shots hide everything in front of the section plane Y_CUT (the objects in FRONT), so the cut
faces of the soil, the walls, the slab, the tub and the water read like a diorama.
"""
import importlib.util, math, os, random
import bmesh
import bpy
from mathutils import Vector, Matrix

import sets as S
import storm as ST
import car as C

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("apple_props", os.path.join(HERE, "..", "apple", "props.py"))
P = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(P)
A = os.path.join(os.environ["QS_SCRATCH"], "assets")
GEN = os.path.join(os.environ["QS_SCRATCH"], "gen")

PX, PY, PD = 2.5, 5.0, 4.0        # pit inner half-width (x), half-length (y), depth
WT, SL = 0.3, 0.3                  # wall and slab thickness
DECK = 0.05                        # top of the deck boards and of the pool coping
Y_CUT = -4.5                       # section plane of the cutaway shots
TX, TY = 2.46, 4.96                # tub outer half extents
TUB_BOT, TUB_W = -1.6, 0.12        # tub underside (down position), wall thickness
WATER_TOP = -0.12
RAMS = [(sx * 2.15, sy * 4.25) for sy in (-1, 1) for sx in (-1, 1)]
RISE = 3.4                         # how far the tub lifts
LIFT_C, LIFT_W, LIFT_L = 2.42, 2.7, 4.95     # platform centre y, width, length
LIFT_DOWN, LIFT_UP = -3.72, DECK            # platform top, down and up
FLOOR = -PD
FRONT = []                          # hidden in the cutaway shots


# ============================================================================= helpers
def model(name, coll, loc, rot_z=0.0, scale=1.0):
    return S.import_gltf(name, coll, Vector(loc), math.radians(rot_z), scale)


def boxes_mesh(name, boxes, mats, coll, face_mat=None):
    """One object from many axis-aligned boxes [(mn, mx[, mat_index])]. face_mat(normal) -> material
    index overrides the box's own index per face."""
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


def sbox(name, mn, mx, mats, coll, face_mat=None, parent=None):
    """Box (or boxes) split at the section plane; the front part goes into FRONT."""
    mats = mats if isinstance(mats, (list, tuple)) else [mats]
    (x0, y0, z0), (x1, y1, z1) = mn, mx
    out = []
    parts = []
    if y0 < Y_CUT < y1:
        parts = [("F", (x0, y0, z0), (x1, Y_CUT, z1)), ("B", (x0, Y_CUT, z0), (x1, y1, z1))]
    else:
        parts = [("F" if y1 <= Y_CUT + 1e-6 else "", mn, mx)]
    for tag, a, b in parts:
        o = boxes_mesh(name + tag, [(a, b)], mats, coll, face_mat)
        if tag == "F":
            FRONT.append(o)
        if parent:
            o.parent = parent
        out.append(o)
    return out


def split_boxes(name, boxes, mats, coll, face_mat=None, parent=None):
    """Many boxes into two objects, split at the section plane."""
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
            o.parent = parent
        out.append(o)
    return out


def emit_mat(name, col, strength):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


def metal(name, col, rough=0.3, metallic=1.0):
    return S.flat(name, col, rough, metallic)


# ============================================================================= materials
def materials():
    M = {}
    M["grass"] = lawn_material()
    soil, nt, b = S._new_mat("Soil")
    mp, tc = S._mapping(nt, 2.4)
    d = os.path.join(A, "tex", "excavated_soil_wall")
    diff = S._tex(nt, os.path.join(d, "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], diff.inputs[0])
    nor = S._tex(nt, os.path.join(d, "nor.jpg"), True, proj="BOX"); nt.links.new(mp.outputs[0], nor.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    top = S._math(nt, "MULTIPLY", S._math(nt, "ADD", sep.outputs[2], 0.45), 2.4, clamp=True)   # dark topsoil band
    col = S._mix(nt, 1.0, diff.outputs["Color"], (1.55, 1.3, 1.08), blend="MULTIPLY")
    col = S._mix(nt, top, col, S._mix(nt, 1.0, col, (0.42, 0.32, 0.24), blend="MULTIPLY"))
    nt.links.new(col, b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.92
    nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.0
    nt.links.new(nor.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    M["soil"] = soil
    M["concrete"] = S.pbr("Concrete", "brushed_concrete", 2.0, tint=(0.95, 0.94, 0.92))
    M["slab"] = S.pbr("Slab", "concrete_floor_02", 3.0, tint=(0.9, 0.9, 0.9))
    M["paving"] = S.pbr("Paving", "concrete_pavement", 2.5, tint=(1.0, 0.97, 0.93))
    M["stucco"] = S.pbr("Stucco", "white_stucco", 2.0, tint=(1.0, 0.98, 0.95))
    M["roof"] = S.pbr("Roof", "grey_roof_tiles", 2.0, tint=(0.55, 0.5, 0.48))
    M["fence"] = S.pbr("Fence", "brown_planks_05", 1.2, tint=(0.95, 0.8, 0.65))
    M["wood"] = S.pbr("Deck", "fine_grained_wood", 1.4, tint=(1.05, 0.74, 0.5))
    M["cladding"] = S.pbr("Cladding", "fine_grained_wood", 1.0, tint=(0.55, 0.36, 0.22))
    M["steel"] = S.flat("Steel", (0.5, 0.53, 0.56), 0.38, 0.55)
    pl = S.pbr("Plate", "metal_plate", 0.8, tint=(0.62, 0.64, 0.66))
    pl.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.8
    M["plate"] = pl
    M["chrome"] = metal("Chrome", (0.85, 0.86, 0.88), 0.08)
    M["barrel"] = S.flat("RamBarrel", (0.75, 0.52, 0.03), 0.35, 0.3, coat=0.3)
    M["dark"] = S.flat("DarkSteel", (0.05, 0.05, 0.055), 0.45, 0.6)
    M["coping"] = S.flat("Coping", (0.82, 0.8, 0.76), 0.55)
    M["frame"] = S.flat("WindowFrame", (0.04, 0.04, 0.045), 0.4)
    M["glass"] = S.flat("HouseGlass", (0.03, 0.045, 0.05), 0.04, spec=1.0)
    M["yellow"] = S.flat("ParkingLine", (0.85, 0.65, 0.05), 0.5)
    M["white"] = S.flat("Spray", (0.95, 0.95, 0.92), 0.6)
    M["cushion"] = S.flat("Cushion", (0.06, 0.12, 0.26), 0.8)
    M["lounger"] = S.flat("LoungerFrame", (0.9, 0.9, 0.88), 0.35, 0.2)
    M["lamp"] = emit_mat("LampGlow", (1.0, 0.86, 0.62), 25.0)
    M["tile"], M["tile_reveal"] = tile_material()
    M["water"], M["water_w"] = water_material()
    M["text"] = emit_mat("DimText", (1.0, 1.0, 1.0), 1.5)
    M["dirt"], M["dirt_fac"] = dirt_top_material(M)
    return M


def lawn_material():
    """A mown lawn: the Poly Haven leafy grass pushed from straw towards green."""
    m, nt, b = S._new_mat("Lawn")
    d = os.path.join(A, "tex", "leafy_grass")
    mp, _ = S._mapping(nt, 2.2)
    diff = S._tex(nt, os.path.join(d, "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], diff.inputs[0])
    hs = nt.nodes.new("ShaderNodeHueSaturation")
    hs.inputs["Hue"].default_value = 0.62; hs.inputs["Saturation"].default_value = 1.25; hs.inputs["Value"].default_value = 0.85
    nt.links.new(diff.outputs["Color"], hs.inputs["Color"])
    nt.links.new(hs.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    n = S._tex(nt, os.path.join(d, "nor.jpg"), True, proj="BOX"); nt.links.new(mp.outputs[0], n.inputs[0])
    nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def tile_material():
    """Inside of the tub: bare steel until the Value node 'Reveal' sweeps blue mosaic along +Y."""
    m, nt, b = S._new_mat("Tiles")
    mp, tc = S._mapping(nt, 1.0)
    t = S._tex(nt, os.path.join(GEN, "mosaic.png"), proj="BOX"); nt.links.new(mp.outputs[0], t.inputs[0])
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    lvl = nt.nodes.new("ShaderNodeValue"); lvl.name = "Reveal"; lvl.outputs[0].default_value = 1.0
    # front of the sweep runs from y = -5.6 (0) to y = +5.6 (1)
    edge = S._math(nt, "SUBTRACT", S._math(nt, "MULTIPLY", lvl.outputs[0], 11.2), 5.6)
    fac = S._math(nt, "MULTIPLY", S._math(nt, "SUBTRACT", edge, sep.outputs[1]), 4.0, clamp=True)
    col = S._mix(nt, fac, (0.42, 0.44, 0.46), t.outputs["Color"])
    nt.links.new(col, b.inputs["Base Color"])
    nt.links.new(S._mix(nt, fac, 0.45, 0.12, kind="FLOAT"), b.inputs["Roughness"])
    nt.links.new(S._mix(nt, fac, 0.7, 0.0, kind="FLOAT"), b.inputs["Metallic"])
    b.inputs["Coat Weight"].default_value = 0.4
    return m, lvl.outputs[0]


def water_material():
    """Clear pool water: transmission with a blue-green volume, moving ripples (key 'W')."""
    m, nt, b = S._new_mat("PoolWater")
    b.inputs["Base Color"].default_value = (0.86, 0.97, 1.0, 1)
    b.inputs["Roughness"].default_value = 0.02
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["IOR"].default_value = 1.33
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise"); n.noise_dimensions = "4D"
    n.inputs["Scale"].default_value = 1.6; n.inputs["Detail"].default_value = 5; n.inputs["Roughness"].default_value = 0.55
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.03
    nt.links.new(n.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    vol = nt.nodes.new("ShaderNodeVolumeAbsorption"); vol.inputs["Color"].default_value = (0.55, 0.86, 0.9, 1)
    vol.inputs["Density"].default_value = 0.35
    nt.links.new(vol.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    return m, n.inputs["W"]


def dirt_top_material(M):
    """The lawn over the pit turns to raw dirt once digging starts ('Fac' 0 grass -> 1 dirt)."""
    m, nt, b = S._new_mat("PitTop")
    mp, _ = S._mapping(nt, 2.2)
    g = S._tex(nt, os.path.join(A, "tex", "leafy_grass", "diff.jpg"), proj="BOX"); nt.links.new(mp.outputs[0], g.inputs[0])
    mp2, _ = S._mapping(nt, 2.0)
    d = S._tex(nt, os.path.join(A, "tex", "excavated_soil_wall", "diff.jpg"), proj="BOX"); nt.links.new(mp2.outputs[0], d.inputs[0])
    lvl = nt.nodes.new("ShaderNodeValue"); lvl.name = "Dirt"; lvl.outputs[0].default_value = 0.0
    gcol = S._mix(nt, 1.0, g.outputs["Color"], (0.95, 1.0, 0.9), blend="MULTIPLY")
    dcol = S._mix(nt, 1.0, d.outputs["Color"], (0.7, 0.58, 0.45), blend="MULTIPLY")
    nt.links.new(S._mix(nt, lvl.outputs[0], gcol, dcol), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.95
    return m, lvl.outputs[0]


# ============================================================================= ground, pit, garage
def ground(M, coll):
    """Soil in section around the pit (grass on top), split at the section plane."""
    E = 30.0
    X2, Y2, Z2 = PX + WT, PY + WT, -(PD + SL)
    boxes = [((-E, -E, -8.0), (E, E + 20, Z2)),
             ((-E, -E, Z2), (-X2, E + 20, 0.0)), ((X2, -E, Z2), (E, E + 20, 0.0)),
             ((-X2, -E, Z2), (X2, -Y2, 0.0)), ((-X2, Y2, Z2), (X2, E + 20, 0.0))]
    split_boxes("Ground", boxes, [M["soil"], M["grass"]], coll,
                face_mat=lambda n, bx: 1 if n.z > 0.5 and bx[1][2] >= -0.01 else 0)


def garage(M, coll):
    X2, Y2 = PX + WT, PY + WT
    slab = sbox("Slab", (-X2, -Y2, FLOOR - SL), (X2, Y2, FLOOR), M["slab"], coll)
    walls = []
    walls += sbox("WallL", (-X2, -Y2, FLOOR), (-PX, Y2, 0.0), M["concrete"], coll)
    walls += sbox("WallR", (PX, -Y2, FLOOR), (X2, Y2, 0.0), M["concrete"], coll)
    walls += sbox("WallN", (-PX, -Y2, FLOOR), (PX, -PY, 0.0), M["concrete"], coll)
    walls += sbox("WallFar", (-PX, PY, FLOOR), (PX, Y2, 0.0), M["concrete"], coll)
    # yellow bay lines and a recess frame around the lift
    lines = []
    for x in (-LIFT_W / 2 - 0.12, LIFT_W / 2 + 0.04):
        lines.append(((x, LIFT_C - LIFT_L / 2 - 0.1, FLOOR), (x + 0.08, LIFT_C + LIFT_L / 2, FLOOR + 0.004)))
    lines.append(((-LIFT_W / 2 - 0.12, LIFT_C - LIFT_L / 2 - 0.18, FLOOR), (LIFT_W / 2 + 0.12, LIFT_C - LIFT_L / 2 - 0.1, FLOOR + 0.004)))
    boxes_mesh("BayLines", lines, [M["yellow"]], coll)
    # dressing in the near half (the half the cutaway looks into)
    dress = S.collection("GarageDressing")
    model("metal_tool_chest", dress, (-2.05, -2.6, FLOOR), 90, 1.0)
    model("tool_cart", dress, (-1.95, -0.9, FLOOR), 75, 1.0)
    for i in range(3):
        ty = model("old_tyre", dress, (1.95, -3.5, FLOOR + 0.083 + i * 0.168), i * 23, 1.0)
        ty.rotation_euler.x = math.radians(90)
    model("metal_jerrycan", dress, (2.15, -2.3, FLOOR), -90, 1.0)
    model("metal_jerrycan", dress, (2.15, -1.95, FLOOR), -95, 1.0)
    for i, (y, z) in enumerate(((-1.0, 0.0), (-0.45, 0.0), (-0.72, 0.42))):
        model("cardboard_box_01", dress, (2.12, y, FLOOR + z), 90 + i * 7, 1.15)
    lamps = []
    for sx in (-1, 1):
        for y in (-2.2, 2.6):
            lm = model("industrial_wall_lamp", dress, (sx * (PX - 0.01), y, -1.95), -90 if sx > 0 else 90, 1.0)
            ld = bpy.data.lights.new(f"GarageLight{sx}{y}", "POINT"); ld.energy = 90; ld.color = (1.0, 0.84, 0.62)
            ld.shadow_soft_size = 0.15
            lo = bpy.data.objects.new(ld.name, ld); S.link(lo, dress); lo.location = (sx * (PX - 0.35), y, -2.05)
            lamps.append(lo)
    return {"slab": slab, "walls": walls, "dressing": dress, "lamps": lamps}


# ============================================================================= the tub
def tub(M, coll):
    """The pool itself: steel tub, tiled inside, coping on the rim, water, the ram plates beneath.
    Children of the empty 'Tub' (at the origin when down; key its z to lift it)."""
    root = bpy.data.objects.new("Tub", None); S.link(root, coll)
    z0, z1 = TUB_BOT, DECK - 0.05
    ix, iy = TX - TUB_W, TY - TUB_W

    def inner(n, bx):     # faces pointing into the pool get tiles
        (x0, y0, zz0), (x1, y1, zz1) = bx[0], bx[1]
        c = Vector(((x0 + x1) / 2, (y0 + y1) / 2, (zz0 + zz1) / 2))
        if n.z > 0.5 and zz1 <= z0 + TUB_W + 1e-4:
            return 1                                  # top of the floor
        if abs(n.z) < 0.5 and (c.x * n.x + c.y * n.y) < 0 and zz1 > z0 + TUB_W:
            return 1                                  # inner faces of the walls
        return 0
    shell = [((-TX, -TY, z0), (TX, TY, z0 + TUB_W)),
             ((-TX, -TY, z0 + TUB_W), (-ix, TY, z1)), ((ix, -TY, z0 + TUB_W), (TX, TY, z1)),
             ((-ix, -TY, z0 + TUB_W), (ix, -iy, z1)), ((-ix, iy, z0 + TUB_W), (ix, TY, z1))]
    split_boxes("TubShell", shell, [M["steel"], M["tile"]], coll, face_mat=inner, parent=root)
    cw = 0.3
    coping = [((-TX, -TY, z1), (-TX + cw, TY, DECK)), ((TX - cw, -TY, z1), (TX, TY, DECK)),
              ((-TX + cw, -TY, z1), (TX - cw, -TY + cw, DECK)), ((-TX + cw, TY - cw, z1), (TX - cw, TY, DECK))]
    split_boxes("Coping", coping, [M["coping"]], coll, parent=root)
    ribs = []                    # 3 cm stiffeners: the tub clears the pit walls by 4 cm
    rt = 0.03
    for k in range(-4, 5):
        yy = k * 1.1
        ribs.append(((TX, yy - 0.05, z0), (TX + rt, yy + 0.05, z1 - 0.02)))
        ribs.append(((-TX - rt, yy - 0.05, z0), (-TX, yy + 0.05, z1 - 0.02)))
    for k in range(-2, 3):
        xx = k * 1.0
        ribs.append(((xx - 0.05, TY, z0), (xx + 0.05, TY + rt, z1 - 0.02)))
        ribs.append(((xx - 0.05, -TY - rt, z0), (xx + 0.05, -TY, z1 - 0.02)))
    zb0, zb1 = z1 - 0.14, z1 - 0.06       # a band round the top, outside only
    ribs += [((TX, -TY - rt, zb0), (TX + rt, TY + rt, zb1)), ((-TX - rt, -TY - rt, zb0), (-TX, TY + rt, zb1)),
             ((-TX, TY, zb0), (TX, TY + rt, zb1)), ((-TX, -TY - rt, zb0), (TX, -TY, zb1))]
    split_boxes("TubRibs", ribs, [M["steel"]], coll, parent=root)
    plates = [((x - 0.25, y - 0.25, z0 - 0.04), (x + 0.25, y + 0.25, z0)) for x, y in RAMS]
    split_boxes("TubPlates", plates, [M["dark"]], coll, parent=root)
    # water: its own empty so it can fill (scale z from the tub floor)
    wroot = bpy.data.objects.new("WaterRoot", None); S.link(wroot, coll); wroot.parent = root
    wroot.location = (0, 0, z0 + TUB_W)
    wf = split_boxes("Water", [((-ix + 0.002, -iy + 0.002, 0.0), (ix - 0.002, iy - 0.002, WATER_TOP - (z0 + TUB_W)))],
                     [M["water"]], coll, parent=wroot)
    for o in wf:
        o.visible_shadow = False
    return {"root": root, "water_root": wroot, "water": wf}


def beach_ball(coll, r=0.24):
    m, nt, b = S._new_mat("BeachBall")
    tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    ang = nt.nodes.new("ShaderNodeMath"); ang.operation = "ARCTAN2"
    nt.links.new(sep.outputs[1], ang.inputs[0]); nt.links.new(sep.outputs[0], ang.inputs[1])
    seg = S._math(nt, "FLOOR", S._math(nt, "MULTIPLY", S._math(nt, "ADD", ang.outputs[0], math.pi), 6 / (2 * math.pi)))
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
    cols = [(0.85, 0.05, 0.04), (0.95, 0.95, 0.92), (0.05, 0.25, 0.8), (0.98, 0.75, 0.02), (0.95, 0.95, 0.92), (0.1, 0.6, 0.15)]
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = (*cols[0], 1); els[1].position = 1 / 6; els[1].color = (*cols[1], 1)
    for k in range(2, 6):
        e = els.new(k / 6); e.color = (*cols[k], 1)
    nt.links.new(S._math(nt, "DIVIDE", seg, 6.0), ramp.inputs[0])
    pole = S._math(nt, "GREATER_THAN", S._math(nt, "ABSOLUTE", sep.outputs[2]), r * 0.93)
    nt.links.new(S._mix(nt, pole, ramp.outputs[0], (0.95, 0.95, 0.92)), b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.25; b.inputs["Coat Weight"].default_value = 0.6
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=r)
    me = bpy.data.meshes.new("BeachBall"); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    return S.new_obj("BeachBall", me, coll)


# ============================================================================= rams
class Ram:
    """Three-stage telescopic ram. Each stage is an object whose origin is at its top."""

    def __init__(self, name, x, y, M, coll):
        self.x, self.y = x, y
        self.objs = []
        base = P.cyl(name + "Base", 0.34, 0.06, M["dark"], coll, (x, y, FLOOR + 0.03))
        barrel = P.cyl(name + "Barrel", 0.21, 2.15, M["barrel"], coll, (x, y, FLOOR + 1.075))
        collar = P.cyl(name + "Collar", 0.24, 0.08, M["dark"], coll, (x, y, FLOOR + 2.15))
        self.fixed = [base, barrel, collar]
        self.s2 = self._stage(name + "S2", 0.16, 2.1, M, coll)
        self.s3 = self._stage(name + "S3", 0.115, 2.1, M, coll)
        self.objs = self.fixed + [self.s2, self.s3] + list(self.s2.children) + list(self.s3.children)
        self.set(0.0)

    def _stage(self, name, r, length, M, coll):
        root = bpy.data.objects.new(name, None); S.link(root, coll)
        P.cyl(name + "Rod", r, length, M["chrome"], coll, (0, 0, -length / 2), parent=root, verts=32)
        P.cyl(name + "Ring", r + 0.02, 0.05, M["dark"], coll, (0, 0, -0.025), parent=root)
        root.location = (self.x, self.y, 0)
        return root

    def set(self, e):
        self.s2.location.z = -1.8 + 0.5 * e
        self.s3.location.z = TUB_BOT - 0.04 + e

    def key(self, fr, e):
        self.set(e)
        self.s2.keyframe_insert("location", index=2, frame=fr)
        self.s3.keyframe_insert("location", index=2, frame=fr)


# ============================================================================= scissor lift
class Lift:
    """Two-stage scissor lift; key the platform top height with key(frame, top_z)."""
    ARM = 2.55

    def __init__(self, M, coll):
        self.coll = coll
        self.base = P.rbox("LiftBase", (LIFT_W - 0.2, LIFT_L - 0.1, 0.1), M["dark"], coll, (0, LIFT_C, FLOOR + 0.05))
        self.top = bpy.data.objects.new("LiftTop", None); S.link(self.top, coll)
        P.rbox("LiftDeck", (LIFT_W, LIFT_L, 0.1), M["plate"], coll, (0, 0, -0.05), parent=self.top)
        P.rbox("LiftSkirtL", (0.06, LIFT_L, 0.22), M["barrel"], coll, (-LIFT_W / 2 + 0.03, 0, -0.17), parent=self.top)
        P.rbox("LiftSkirtR", (0.06, LIFT_L, 0.22), M["barrel"], coll, (LIFT_W / 2 - 0.03, 0, -0.17), parent=self.top)
        self.arms = []
        for sx in (-1, 1):
            for stage in (0, 1):
                for k in (0, 1):
                    a = P.rbox(f"LiftArm{sx}{stage}{k}", (0.07, self.ARM, 0.12), M["barrel"], coll)
                    a.rotation_mode = "XYZ"
                    self.arms.append((a, sx, stage, k))
        self.pins = []
        for sx in (-1, 1):
            for stage in (0, 1):
                p = P.cyl(f"LiftPin{sx}{stage}", 0.05, 0.18, M["dark"], coll, rot=(0, math.pi / 2, 0))
                self.pins.append((p, sx, stage))
        self.objs = [self.base, self.top] + list(self.top.children) + [a for a, *_ in self.arms] + [p for p, *_ in self.pins]
        self.set(LIFT_DOWN)

    def set(self, top_z):
        z_b = FLOOR + 0.1                    # top of the base frame
        z_t = top_z - 0.28                   # underside of the skirts
        h = max(0.06, (z_t - z_b) / 2)       # height of each stage
        d = math.sqrt(max(0.01, self.ARM ** 2 - h ** 2))
        ang = math.atan2(h, d)
        self.top.location = (0, LIFT_C, top_z)
        for a, sx, stage, k in self.arms:
            zc = z_b + h * (stage + 0.5)
            a.location = (sx * (LIFT_W / 2 - 0.2) + sx * 0.05 * k, LIFT_C, zc)
            a.rotation_euler = (ang if k == 0 else -ang, 0, 0)
        for p, sx, stage in self.pins:
            p.location = (sx * (LIFT_W / 2 - 0.175), LIFT_C, z_b + h * (stage + 0.5))

    def key(self, fr, top_z):
        self.set(top_z)
        self.top.keyframe_insert("location", frame=fr)
        for a, *_ in self.arms:
            a.keyframe_insert("location", frame=fr); a.keyframe_insert("rotation_euler", frame=fr)
        for p, *_ in self.pins:
            p.keyframe_insert("location", frame=fr)


# ============================================================================= deck, yard, house
def deck_boards(M, coll):
    """Boards along Y around the tub opening, each its own object so they can drop in one by one."""
    boards = []
    bw, gap, X_OUT, Y_OUT = 0.14, 0.008, 4.85, 7.35
    xin = TX + 0.02
    x = -X_OUT
    while x + bw <= -xin + 1e-6:
        boards.append(((x, -Y_OUT), (x + bw, Y_OUT))); x += bw + gap
    x = xin
    while x + bw <= X_OUT + 1e-6:
        boards.append(((x, -Y_OUT), (x + bw, Y_OUT))); x += bw + gap
    x = -xin + 0.0
    while x + bw <= xin + 1e-6:
        boards.append(((x, TY + 0.02), (x + bw, Y_OUT)))
        boards.append(((x, -Y_OUT), (x + bw, -TY - 0.02)))
        x += bw + gap
    objs = []
    for i, ((x0, y0), (x1, y1)) in enumerate(boards):
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        holder = bpy.data.objects.new(f"Board{i:03d}", None); S.link(holder, coll)
        holder.location = (cx, cy, DECK)
        pieces = split_boxes(f"BoardMesh{i:03d}", [((x0, y0, DECK - 0.04), (x1, y1, DECK))], [M["wood"]], coll)
        for pc in pieces:
            # keep the geometry in world space, parent with an inverse so the holder can animate
            pc.parent = holder; pc.matrix_parent_inverse = Matrix.Translation(holder.location).inverted()
        objs.append((holder, pieces, cx, cy))
    # joists under the deck (seen while the boards drop)
    return objs


def driveway(M, coll):
    S.box("Driveway", (-1.8, 7.35, -0.02), (1.8, 60.0, 0.01), M["paving"], coll)
    S.box("Patio", (-7.0, -6.0, -0.02), (-4.85, 6.0, 0.01), M["paving"], coll)


def house(M, coll):
    """A two-storey modern house to the left of the pool, glass doors facing it."""
    x0, x1, y0, y1, h = -17.0, -7.0, -6.0, 6.5, 6.4
    S.box("HouseBody", (x0, y0, 0), (x1, y1, h), M["stucco"], coll)
    S.box("HouseParapet", (x0 - 0.1, y0 - 0.1, h), (x1 + 0.1, y1 + 0.1, h + 0.35), M["stucco"], coll)
    S.box("HouseCladding", (x1, -1.0, 3.3), (x1 + 0.06, 6.5, h), M["cladding"], coll)
    S.box("HouseSlabLine", (x1, y0, 3.15), (x1 + 0.1, y1, 3.3), M["frame"], coll)
    # ground floor: sliding glass doors; upper floor: windows
    for (ya, yb, za, zb) in ((-5.0, 0.5, 0.05, 2.75), (1.5, 5.6, 0.05, 2.75), (-5.0, -1.8, 3.7, 5.9), (0.0, 5.6, 3.7, 5.9)):
        S.box("HouseGlass", (x1 + 0.0, ya, za), (x1 + 0.02, yb, zb), M["glass"], coll)
        for zz in (za, zb - 0.06):
            S.box("HouseFrameH", (x1, ya - 0.05, zz), (x1 + 0.06, yb + 0.05, zz + 0.06), M["frame"], coll)
        n = max(1, int((yb - ya) / 1.4))
        for k in range(n + 1):
            yy = ya + (yb - ya) * k / n
            S.box("HouseFrameV", (x1, yy - 0.03, za), (x1 + 0.06, yy + 0.03, zb), M["frame"], coll)
    # neighbour's house beyond the fence (pitched roof)
    nx0, nx1, ny0, ny1, eave, ridge = 17.0, 27.0, -8.0, 6.0, 3.0, 5.2
    S.box("NHouse", (nx0, ny0, 0), (nx1, ny1, eave), M["stucco"], coll)
    bm = bmesh.new()
    ov = 0.5
    pts = [(nx0 - ov, ny0 - ov, eave - 0.1), (nx0 - ov, ny1 + ov, eave - 0.1), ((nx0 + nx1) / 2, ny1 + ov, ridge),
           ((nx0 + nx1) / 2, ny0 - ov, ridge), (nx1 + ov, ny0 - ov, eave - 0.1), (nx1 + ov, ny1 + ov, eave - 0.1)]
    v = [bm.verts.new(p) for p in pts]
    bm.faces.new((v[0], v[1], v[2], v[3])); bm.faces.new((v[3], v[2], v[5], v[4]))
    me = bpy.data.meshes.new("NRoof"); bm.to_mesh(me); bm.free(); me.materials.append(M["roof"])
    r = S.new_obj("NRoof", me, coll); r.modifiers.new("t", "SOLIDIFY").thickness = 0.12
    for yy in (ny0, ny1):
        bm = bmesh.new()
        tri = [bm.verts.new(p) for p in ((nx0, yy, eave), (nx1, yy, eave), ((nx0 + nx1) / 2, yy, ridge - 0.1))]
        bm.faces.new(tri)
        me = bpy.data.meshes.new("NGable"); bm.to_mesh(me); bm.free(); me.materials.append(M["stucco"])
        S.new_obj("NGable", me, coll)
    for ya, yb in ((-6.5, -3.5), (-1.5, 1.5), (3.0, 5.0)):
        S.box("NWin", (nx0 - 0.02, ya, 1.0), (nx0, yb, 2.3), M["glass"], coll)


def fence(M, coll):
    """Board fence along the neighbour's side (x = 11.5) and across the back (y = -14)."""
    boxes = []
    y = -14.0
    while y < 16.0:
        boxes.append(((11.45, y, 0.0), (11.5, y + 0.13, 1.85))); y += 0.14
    x = -18.0
    while x < 11.45:
        boxes.append(((x, -14.05, 0.0), (x + 0.13, -14.0, 1.85))); x += 0.14
    boxes.append(((11.5, -14.0, 1.55), (11.58, 16.0, 1.65)))
    boxes.append(((11.5, -14.0, 0.35), (11.58, 16.0, 0.45)))
    boxes.append(((-18.0, -14.13, 1.55), (11.5, -14.05, 1.65)))
    split_boxes("Fence", boxes, [M["fence"]], coll)


def greenery(coll):
    leaf = ST.foliage_material("YardLeaf", (0.05, 0.09, 0.03)); bark = S.flat("YardBark", (0.1, 0.07, 0.05), 0.9)
    for i, (x, y, s) in enumerate(((14.5, 12, 1.7), (-20, 12, 2.0), (6, -18, 1.8), (-10, -17, 1.6), (15, -12, 1.5),
                                    (-22, -4, 1.8), (9, 24, 1.9))):
        tr = S.new_obj(f"YardTree{i}", ST._tree_mesh(f"YardTree{i}", i + 21, leaf, bark), coll)
        tr.location = (x, y, 0); tr.scale = (s, s, s)
    for i, y in enumerate((-12.5, -9.0, -5.5, -2.0, 1.5, 5.0, 8.5, 12.0)):
        model(("shrub_01", "shrub_02", "shrub_04")[i % 3], coll, (10.7, y, 0), i * 47, 0.9 + 0.15 * (i % 2))
    for i, x in enumerate((-12, -7.5, -3, 1.5, 6.0)):
        model(("shrub_02", "shrub_04")[i % 2], coll, (x, -13.2, 0), i * 61, 0.85)
    model("potted_plant_02", coll, (-4.5, -6.9, DECK), 0, 1.2)
    model("potted_plant_02", coll, (4.5, 6.9, DECK), 40, 1.2)
    model("outdoor_table_chair_set_01", coll, (-5.9, 3.5, 0.01), 90, 1.0)


def lounger(name, M, coll, loc, yaw=0.0):
    """Sun lounger (back raised at the +Y end). Origin on the ground at the seat's centre."""
    root = bpy.data.objects.new(name, None); S.link(root, coll)
    P.rbox(name + "Seat", (0.66, 1.25, 0.06), M["lounger"], coll, (0, -0.25, 0.34), parent=root)
    P.rbox(name + "SeatPad", (0.62, 1.2, 0.07), M["cushion"], coll, (0, -0.25, 0.405), parent=root)
    back = bpy.data.objects.new(name + "Back", None); S.link(back, coll); back.parent = root
    back.location = (0, 0.36, 0.38); back.rotation_euler = (math.radians(-40), 0, 0)
    P.rbox(name + "BackFrame", (0.66, 0.06, 0.75), M["lounger"], coll, (0, 0, 0.37), parent=back)
    P.rbox(name + "BackPad", (0.62, 0.07, 0.72), M["cushion"], coll, (0, -0.05, 0.37), parent=back)
    for sx in (-1, 1):
        for y in (-0.8, 0.3):
            P.rbox(name + "Leg", (0.04, 0.04, 0.33), M["lounger"], coll, (sx * 0.3, y, 0.165), parent=root)
    root.location = loc; root.rotation_euler = (0, 0, math.radians(yaw))
    return root


# ============================================================================= props
def remote(M, coll):
    root = bpy.data.objects.new("Remote", None); S.link(root, coll)
    P.rbox("RemoteBody", (0.05, 0.11, 0.022), M["dark"], coll, (0, 0, 0), 0.006, root)
    btn = P.cyl("RemoteButton", 0.016, 0.012, S.flat("RemoteRed", (0.75, 0.02, 0.02), 0.25, coat=0.6), coll,
                (0, 0.015, 0.014), parent=root)
    led = P.cyl("RemoteLed", 0.004, 0.004, emit_mat("RemoteLed", (0.1, 1.0, 0.2), 0.0), coll, (0, -0.035, 0.012),
                parent=root)
    return {"root": root, "button": btn, "led": led}


def lemonade(M, coll):
    root = bpy.data.objects.new("Glass", None); S.link(root, coll)
    g = S._new_mat("Glassware")[0]
    gb = g.node_tree.nodes["Principled BSDF"]; gb.inputs["Transmission Weight"].default_value = 1.0
    gb.inputs["Roughness"].default_value = 0.02
    P.cyl("GlassCup", 0.036, 0.13, g, coll, (0, 0, 0.065), parent=root)
    P.cyl("GlassJuice", 0.032, 0.1, S.flat("Juice", (0.95, 0.72, 0.1), 0.1), coll, (0, 0, 0.055), parent=root)
    return root


def clods(M, coll, n=48, seed=5):
    r = random.Random(seed)
    out = []
    for i in range(n):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r.uniform(0.07, 0.16))
        for v in bm.verts:
            v.co *= r.uniform(0.75, 1.2)
        me = bpy.data.meshes.new(f"Clod{i}"); bm.to_mesh(me); bm.free(); me.materials.append(M["soil"])
        o = S.new_obj(f"Clod{i}", me, coll); out.append(o)
    return out


def dirt_pile(M, coll):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=1.0)
    rr = random.Random(2)
    for v in bm.verts:
        v.co.z = max(0.0, v.co.z) * 0.55
        v.co *= 1.0 + rr.uniform(-0.06, 0.06)
    me = bpy.data.meshes.new("DirtPile"); bm.to_mesh(me); bm.free(); me.materials.append(M["soil"])
    for p in me.polygons:
        p.use_smooth = True
    o = S.new_obj("DirtPile", me, coll)
    o.location = (7.6, -1.0, 0.0); o.scale = (3.2, 4.2, 2.4)
    return o


def pit_fill(M, coll):
    """The ground inside the pit outline before digging (top lowers as the hole deepens)."""
    root = bpy.data.objects.new("PitFill", None); S.link(root, coll)
    root.location = (0, 0, -(PD + SL))
    X2, Y2 = PX + WT, PY + WT
    pieces = split_boxes("PitFillMesh", [((-X2, -Y2, -(PD + SL)), (X2, Y2, 0.0))], [M["soil"], M["dirt"]], coll,
                         face_mat=lambda n, bx: 1 if n.z > 0.5 else 0)
    for pc in pieces:
        pc.parent = root; pc.matrix_parent_inverse = Matrix.Translation(root.location).inverted()
    return root, pieces


def spray_lines(M, coll):
    X2, Y2, t = PX + WT, PY + WT, 0.05
    bx = [((-X2 - t, -Y2 - t, 0.0), (X2 + t, -Y2, 0.006)), ((-X2 - t, Y2, 0.0), (X2 + t, Y2 + t, 0.006)),
          ((-X2 - t, -Y2, 0.0), (-X2, Y2, 0.006)), ((X2, -Y2, 0.0), (X2 + t, Y2, 0.006))]
    return boxes_mesh("SprayLines", bx, [M["white"]], coll)


def dimensions(M, coll):
    """'10 m' along the long side and '4 m' down the far wall, in white."""
    objs = []
    X2 = PX + WT
    objs.append(boxes_mesh("DimLong", [((-X2 - 0.55, -PY, 0.06), (-X2 - 0.5, PY, 0.1)),
                                       ((-X2 - 0.7, -PY - 0.025, 0.06), (-X2 - 0.35, -PY + 0.025, 0.1)),
                                       ((-X2 - 0.7, PY - 0.025, 0.06), (-X2 - 0.35, PY + 0.025, 0.1))], [M["text"]], coll))
    t1 = P.text3d("Dim10", "10 m", 0.75, M["text"], coll, extrude=0.02)
    t1.location = (-X2 - 1.2, 0.0, 0.08); t1.rotation_euler = (0, 0, math.radians(90))
    objs.append(t1)
    yw = PY + WT - 0.02          # on the dug face of the far end
    objs.append(boxes_mesh("DimDeep", [((-0.025, yw - 0.05, -PD), (0.025, yw, 0.0)),
                                       ((-0.18, yw - 0.05, -0.03), (0.18, yw, 0.0)),
                                       ((-0.18, yw - 0.05, -PD), (0.18, yw, -PD + 0.03))], [M["text"]], coll))
    t2 = P.text3d("Dim4", "4 m", 0.62, M["text"], coll, extrude=0.02)
    t2.location = (0.75, yw - 0.07, -PD / 2); t2.rotation_euler = (math.radians(90), 0, 0)
    objs.append(t2)
    return objs


def crane_rig(M, coll, tub_root):
    """Cable and four slings that lower the tub (children of the tub)."""
    objs = []
    cable = S.flat("Cable", (0.03, 0.03, 0.03), 0.4, 0.5)
    hook_z = DECK + 3.2
    objs.append(P.cyl("CraneCable", 0.025, 40.0, cable, coll, (0, 0, hook_z + 20.0)))
    objs.append(P.rbox("CraneBlock", (0.35, 0.25, 0.5), S.flat("CraneYellow", (0.9, 0.62, 0.03), 0.4), coll, (0, 0, hook_z + 0.1)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = Vector((0, 0, hook_z - 0.15)); b = Vector((sx * (TX - 0.1), sy * (TY - 0.1), DECK))
            d = b - a
            c = P.cyl(f"Sling{sx}{sy}", 0.018, d.length, cable, coll, (a + b) / 2)
            c.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
            objs.append(c)
    for o in objs:
        o.parent = tub_root
    return objs


def hose(M, coll):
    """Garden hose from the house over the pool edge, and its stream (shown while the pool fills)."""
    m = S.flat("Hose", (0.08, 0.38, 0.1), 0.4)
    cu = bpy.data.curves.new("Hose", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.018; cu.bevel_resolution = 3
    sp = cu.splines.new("BEZIER")
    pts = [(-7.0, -2.0, 0.02), (-5.0, -2.6, 0.02), (-3.2, -3.2, 0.05), (-2.6, -3.4, DECK + 0.12), (-2.15, -3.4, DECK + 0.05)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = p; bp.handle_left_type = bp.handle_right_type = "AUTO"
    cu.materials.append(m)
    h = S.new_obj("Hose", cu, coll)
    wm = S._new_mat("Stream")[0]
    wb = wm.node_tree.nodes["Principled BSDF"]; wb.inputs["Transmission Weight"].default_value = 1.0
    wb.inputs["Roughness"].default_value = 0.05; wb.inputs["Base Color"].default_value = (0.9, 0.97, 1.0, 1)
    st = P.cyl("HoseStream", 0.022, 1.2, wm, coll, (-2.0, -3.4, DECK - 0.55))
    st.rotation_euler = (0, math.radians(-8), 0)
    return [h, st]


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
    ld = bpy.data.lights.new("Sun", "SUN"); ld.energy = 4.2; ld.color = (1.0, 0.95, 0.86); ld.angle = math.radians(1.2)
    sun = bpy.data.objects.new("Sun", ld); S.link(sun)
    az, el = -62.0, 48.0
    d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
    sun.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return sun, bg


def build_all():
    """Everything static plus the machinery; returns handles for the animation."""
    M = materials()
    yard = S.collection("Yard")
    ground(M, yard)
    g = garage(M, yard)
    driveway(M, yard); house(M, yard); fence(M, yard); greenery(yard)
    mach = S.collection("Machinery")
    t = tub(M, mach)
    ball = beach_ball(mach); ball.parent = t["root"]; ball.location = (0.9, 1.2, WATER_TOP + 0.08)
    rams = [Ram(f"Ram{i}", x, y, M, mach) for i, (x, y) in enumerate(RAMS)]
    lift = Lift(M, mach)
    car = C.build_car("Car", (0.55, 0.02, 0.018), mach, rain=False)
    car["root"].rotation_euler = (0, 0, math.radians(90))
    bpy.context.view_layer.update()
    for o in list(yard.all_objects) + list(g["dressing"].all_objects):
        if o.type == "MESH" and o not in FRONT:
            ys = [(o.matrix_world @ Vector(c)).y for c in o.bound_box]
            if max(ys) < Y_CUT:
                FRONT.append(o)
    props = S.collection("PoolProps")
    boards = deck_boards(M, props)
    fill_root, fill = pit_fill(M, props)
    return {"M": M, "garage": g, "tub": t, "ball": ball, "rams": rams, "lift": lift, "car": car, "boards": boards,
            "fill_root": fill_root, "fill": fill, "pile": dirt_pile(M, props), "clods": clods(M, props),
            "spray": spray_lines(M, props), "dims": dimensions(M, props), "crane": crane_rig(M, props, t["root"]),
            "hose": hose(M, props), "remote": remote(M, props), "lemonade": lemonade(M, props),
            "loungers": [lounger("Lounger0", M, props, (3.75, -2.4, DECK), 0), lounger("Lounger1", M, props, (3.75, 0.3, DECK), 0)],
            "spade": model("rusted_spade_01", props, (0, 0, 0), 0, 1.0)}
