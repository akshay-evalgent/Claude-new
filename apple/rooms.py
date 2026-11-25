"""The six sets of the Apple short, each far from the others in world space:

  OFFICE  (origin)       1970s office / workshop: panelled walls, carpet, ceiling tiles and fluorescent
                         panels, a window with blinds, Wayne's metal desk and typewriter, a workbench with
                         circuit boards and a TV monitor, two arcade cabinets, shelves of boxes
  HOUSE   (200, 0, 0)    his house in the suburbs: ranch house, lawn, driveway, car, shrubs, a tree
  STAGE   (0, 600, 0)    the money stage: a concrete plain under a clear sky (pallets added by shots)
  SHOP    (-200, 0, 0)   a collectibles counter
  AUCTION (0, -200, 0)   the auction hall: parquet, curtain, podium, board, easel, rows of chairs
  NEVADA  (800, 0, 0)    his living room today: lounge chair, side table, TV, frames, desert outside

All furniture models and textures are CC0 (Poly Haven); everything else is built here."""
import math, os, random
import bmesh
import bpy
from mathutils import Vector

import sets as S
import storm as ST
import props as P

OFFICE = Vector((0.0, 0.0, 0.0))
HOUSE = Vector((200.0, 0.0, 0.0))
STAGE = Vector((0.0, 600.0, 0.0))
SHOP = Vector((-200.0, 0.0, 0.0))
AUCTION = Vector((0.0, -200.0, 0.0))
NEVADA = Vector((800.0, 0.0, 0.0))
A = os.path.join(os.environ["QS_SCRATCH"], "assets")


# ----------------------------------------------------------------------------- helpers
def model(name, coll, loc, rot_z=0.0, scale=1.0):
    return S.import_gltf(name, coll, Vector(loc), math.radians(rot_z), scale)


def wall_box(name, mn, mx, mat, coll):
    return S.box(name, mn, mx, mat, coll)


def area(name, coll, loc, size, energy, col=(1, 1, 1), rot=(0, 0, 0), shape="RECTANGLE", size_y=None, spread=180):
    ld = bpy.data.lights.new(name, "AREA"); ld.energy = energy; ld.color = col; ld.shape = shape
    ld.size = size; ld.size_y = size_y or size
    ld.spread = math.radians(spread)
    o = bpy.data.objects.new(name, ld); S.link(o, coll); o.location = loc; o.rotation_euler = rot
    return o


def point(name, coll, loc, energy, col=(1, 0.85, 0.65), radius=0.05):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = energy; ld.color = col; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); S.link(o, coll); o.location = loc
    return o


def spot(name, coll, loc, target, energy, angle=30, blend=0.4, col=(1, 0.92, 0.8), radius=0.05):
    ld = bpy.data.lights.new(name, "SPOT"); ld.energy = energy; ld.color = col
    ld.spot_size = math.radians(angle); ld.spot_blend = blend; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); S.link(o, coll); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


def sun(name, coll, az, el, energy, col=(1, 0.96, 0.9), angle=1.0):
    ld = bpy.data.lights.new(name, "SUN"); ld.energy = energy; ld.color = col; ld.angle = math.radians(angle)
    o = bpy.data.objects.new(name, ld); S.link(o, coll)
    d = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                math.cos(math.radians(el)) * math.sin(math.radians(az)), math.sin(math.radians(el))))
    o.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    return o


def tiles_material(name):
    """Acoustic ceiling tiles: off-white with a grid of grooves and pinholes."""
    m, nt, b = S._new_mat(name)
    mp, _ = S._mapping(nt, 1.0)
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(mp.outputs[0], sep.inputs[0])
    gx = S._math(nt, "LESS_THAN", S._math(nt, "PINGPONG", S._math(nt, "MULTIPLY", sep.outputs[0], 1 / 0.6), 0.5), 0.012)
    gy = S._math(nt, "LESS_THAN", S._math(nt, "PINGPONG", S._math(nt, "MULTIPLY", sep.outputs[1], 1 / 0.6), 0.5), 0.012)
    groove = S._math(nt, "MAXIMUM", gx, gy)
    holes = S._math(nt, "GREATER_THAN", S._noise(nt, mp.outputs[0], 160.0, 1.0, 0.5), 0.68)
    dark = S._math(nt, "MAXIMUM", groove, S._math(nt, "MULTIPLY", holes, 0.6))
    col = S._mix(nt, dark, (0.78, 0.77, 0.72), (0.32, 0.31, 0.29))
    nt.links.new(col, b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.9
    return m


def emissive_panel(name, col, strength):
    m, nt, b = S._new_mat(name)
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


# ----------------------------------------------------------------------------- world
class World:
    """One world: a sky HDRI for the daylight sets, a dim neutral for the closed rooms. Key mode per shot."""

    def __init__(self):
        w = bpy.data.worlds.new("World"); bpy.context.scene.world = w; w.use_nodes = True
        nt = w.node_tree
        for n in list(nt.nodes):
            nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputWorld")
        tc = nt.nodes.new("ShaderNodeTexCoord")
        self.rot = nt.nodes.new("ShaderNodeMapping"); nt.links.new(tc.outputs["Generated"], self.rot.inputs["Vector"])
        env1 = nt.nodes.new("ShaderNodeTexEnvironment")
        env1.image = bpy.data.images.load(os.path.join(A, "hdri", "kloofendal_43d_clear_puresky.hdr"), check_existing=True)
        env2 = nt.nodes.new("ShaderNodeTexEnvironment")
        env2.image = bpy.data.images.load(os.path.join(A, "hdri", "qwantani_afternoon_puresky.hdr"), check_existing=True)
        nt.links.new(self.rot.outputs[0], env1.inputs[0]); nt.links.new(self.rot.outputs[0], env2.inputs[0])
        self.mix = nt.nodes.new("ShaderNodeMix"); self.mix.data_type = "RGBA"
        nt.links.new(env1.outputs[0], self.mix.inputs[6]); nt.links.new(env2.outputs[0], self.mix.inputs[7])
        self.bg = nt.nodes.new("ShaderNodeBackground")
        nt.links.new(self.mix.outputs[2], self.bg.inputs[0])
        nt.links.new(self.bg.outputs[0], out.inputs[0])
        self.w = w

    def key(self, frame, sky, strength, rot_z=0.0):
        """sky 0 = clear (office, house, stage), 1 = afternoon (Nevada)."""
        self.mix.inputs[0].default_value = sky; self.mix.inputs[0].keyframe_insert("default_value", frame=frame)
        self.bg.inputs[1].default_value = strength; self.bg.inputs[1].keyframe_insert("default_value", frame=frame)
        self.rot.inputs["Rotation"].default_value = (0, 0, math.radians(rot_z))
        self.rot.inputs["Rotation"].keyframe_insert("default_value", frame=frame)


# ----------------------------------------------------------------------------- office
def _blinds(coll, x, y0, y1, z0, z1, mat):
    n = int((z1 - z0) / 0.05)
    for i in range(n):
        z = z0 + 0.025 + i * 0.05
        s = P.rbox(f"Blind{i}", (0.004, y1 - y0, 0.045), mat, coll, (x, (y0 + y1) / 2, z))
        s.rotation_euler = (0, math.radians(55), 0)
    P.rbox("BlindRail", (0.05, y1 - y0 + 0.04, 0.04), mat, coll, (x, (y0 + y1) / 2, z1 + 0.02))


def office(coll):
    o = OFFICE
    X0, X1, Y0, Y1, H = -3.6, 3.6, -3.0, 3.2, 2.7
    carpet = S.pbr("Carpet", "dirty_carpet", 1.2, tint=(0.95, 0.62, 0.38))
    panel = S.pbr("Panel", "dark_paneled_wood", 2.2, tint=(1.9, 1.5, 1.15), proj="BOX")
    tiles = tiles_material("CeilingTiles")
    S.grid("OfficeFloor", X1 - X0, Y1 - Y0, 1, 1, carpet, coll).location = (0, (Y0 + Y1) / 2, 0)
    ceil = S.grid("OfficeCeiling", X1 - X0, Y1 - Y0, 1, 1, tiles, coll); ceil.location = (0, (Y0 + Y1) / 2, H)
    ceil.rotation_euler = (math.pi, 0, 0)
    t = 0.1
    wall_box("WallBack", (X0, Y1, 0), (X1, Y1 + t, H), panel, coll)
    wall_box("WallLeft", (X0 - t, Y0, 0), (X0, Y1, H), panel, coll)
    wall_box("WallFront", (X0, Y0 - t, 0), (X1, Y0, H), panel, coll)
    # right wall with the window (y 0.2..2.2, z 0.9..2.1)
    wy0, wy1, wz0, wz1 = 0.2, 2.2, 0.9, 2.1
    wall_box("WallR1", (X1, Y0, 0), (X1 + t, wy0, H), panel, coll)
    wall_box("WallR2", (X1, wy1, 0), (X1 + t, Y1, H), panel, coll)
    wall_box("WallR3", (X1, wy0, 0), (X1 + t, wy1, wz0), panel, coll)
    wall_box("WallR4", (X1, wy0, wz1), (X1 + t, wy1, H), panel, coll)
    trim = S.flat("WindowTrim", (0.85, 0.83, 0.78), 0.5)
    P.rbox("Sill", (0.2, wy1 - wy0 + 0.1, 0.04), trim, coll, (X1 - 0.05, (wy0 + wy1) / 2, wz0))
    blind = S.flat("BlindMat", (0.8, 0.78, 0.72), 0.45)
    _blinds(coll, X1 - 0.08, wy0 + 0.02, wy1 - 0.02, wz0 + 0.05, wz1 - 0.02, blind)
    # baseboard
    base = S.flat("Baseboard", (0.12, 0.08, 0.05), 0.5)
    wall_box("BaseBack", (X0, Y1 - 0.015, 0), (X1, Y1, 0.1), base, coll)
    wall_box("BaseLeft", (X0, Y0, 0), (X0 + 0.015, Y1, 0.1), base, coll)
    # fluorescent panels
    tube = emissive_panel("Fluoro", (1.0, 0.98, 0.93), 6.0)
    for i, (x, y) in enumerate(((-1.2, 0.4), (1.4, 0.4), (-1.2, 2.2), (1.4, 2.2))):
        P.rbox(f"FluoroPanel{i}", (1.2, 0.3, 0.03), tube, coll, (x, y, H - 0.016))
        area(f"FluoroLight{i}", coll, (x, y, H - 0.04), 1.2, 70, (1.0, 0.97, 0.9), size_y=0.3)
    # outside: lawn and trees past the window
    grass = S.pbr("OfficeLawn", "leafy_grass", 2.0)
    S.grid("OfficeOutside", 80, 80, 1, 1, grass, coll).location = (X1 + 41, 0, -0.3)
    leaf = ST.foliage_material("OfficeLeaf", (0.05, 0.09, 0.03)); bark = S.flat("OfficeBark", (0.1, 0.07, 0.05), 0.9)
    for i, (x, y, s) in enumerate(((12, 4, 1.4), (18, -3, 1.8), (10, -6, 1.2), (24, 6, 2.0))):
        tr = S.new_obj(f"OfficeTree{i}", ST._tree_mesh(f"OfficeTree{i}", i + 3, leaf, bark), coll); tr.location = (x, y, -0.3)
        tr.scale = (s, s, s)
    # ---- furniture
    desk = model("metal_office_desk", coll, (0.6, 1.4, 0), 180)
    chair = office_chair(coll, (0.6, 2.08, 0), 0)
    lamp = model("desk_lamp_arm_01", coll, (1.35, 1.55, 0.788), 200)
    model("wooden_bookshelf_worn", coll, (2.4, 2.88, 0), 0)
    model("potted_plant_01", coll, (3.15, -0.6, 0), 30)
    clock = model("wall_clock", coll, (-0.2, Y1 - 0.0, 2.0), 0)
    for i, (x, z, r) in enumerate(((2.9, 0.0, 0), (3.0, 0.0, 20), (2.95, 0.34, 8))):
        model("cardboard_box_01", coll, (x, -2.4 + i * 0.05, z), r)
    # corkboard with pinned papers on the back wall
    cork = S.flat("Cork", (0.45, 0.3, 0.16), 0.9)
    P.rbox("Corkboard", (1.2, 0.03, 0.8), cork, coll, (0.6, Y1 - 0.016, 1.6))
    paper = S.flat("PinPaper", (0.85, 0.83, 0.76), 0.7)
    rnd = random.Random(3)
    for i in range(7):
        pp = P.card(f"Pinned{i}", 0.21, 0.27, paper, coll)
        pp.location = (0.15 + (i % 4) * 0.28 + rnd.uniform(-0.04, 0.04), Y1 - 0.034, 1.42 + (i // 4) * 0.34)
        pp.rotation_euler = (math.radians(90), rnd.uniform(-0.1, 0.1), 0)
    # door on the left wall
    door = S.pbr("Door", "fine_grained_wood", 0.8, tint=(0.6, 0.42, 0.28))
    P.rbox("Door", (0.05, 0.9, 2.05), door, coll, (X0 + 0.02, -1.6, 1.025))
    P.cyl("DoorKnob", 0.03, 0.06, S.flat("Brass", (0.8, 0.6, 0.25), 0.25, 1.0), coll, (X0 + 0.07, -1.25, 1.0),
          (0, math.pi / 2, 0))
    # arcade cabinets against the back wall
    P.arcade("ArcadeA", coll).location = (-2.3, Y1 - 0.05, 0)
    P.arcade("ArcadeB", coll, (0.55, 0.08, 0.06), (0.95, 0.75, 0.15)).location = (-1.5, Y1 - 0.05, 0)
    # workbench along the left wall
    bench_top = S.pbr("BenchTop", "fine_grained_wood", 0.6, tint=(0.9, 0.75, 0.55))
    metal = S.flat("BenchMetal", (0.2, 0.22, 0.24), 0.45, 0.6)
    P.rbox("BenchTop", (0.8, 3.0, 0.05), bench_top, coll, (X0 + 0.45, 0.5, 0.88))
    for (dx, dy) in ((-0.33, -0.95), (0.33, -0.95), (-0.33, 1.95), (0.33, 1.95)):
        P.rbox("BenchLeg", (0.05, 0.05, 0.86), metal, coll, (X0 + 0.45 + dx, 0.5 + dy, 0.43))
    tv = model("Television_01", coll, (X0 + 0.42, 1.4, 0.905), -90)
    # oscilloscope
    grey = S.flat("ScopeGrey", (0.45, 0.45, 0.42), 0.5)
    P.rbox("Scope", (0.32, 0.38, 0.22), grey, coll, (X0 + 0.38, 0.55, 1.015), 0.01)
    crt = emissive_panel("ScopeCRT", (0.2, 1.0, 0.4), 2.5)
    c = P.cyl("ScopeScreen", 0.07, 0.01, crt, coll, (X0 + 0.55, 0.5, 1.03), (0, math.pi / 2, 0))
    # spools and a soldering iron
    for i, col in enumerate(((0.7, 0.1, 0.1), (0.1, 0.3, 0.7), (0.8, 0.7, 0.1))):
        P.cyl(f"Spool{i}", 0.04, 0.05, S.flat(f"SpoolMat{i}", col, 0.5), coll, (X0 + 0.25, -0.2 + i * 0.11, 0.93))
    iron = P.pen("Iron", coll); iron.location = (X0 + 0.5, -0.5, 0.91); iron.rotation_euler = (0, math.radians(75), 0.4)
    # coffee mug on the desk
    mug = S.flat("Mug", (0.75, 0.32, 0.12), 0.35)
    P.cyl("MugBody", 0.04, 0.095, mug, coll, (1.05, 1.25, 0.836))
    return {"desk_top": 0.788, "desk": desk, "chair": chair, "lamp": lamp}


def office_chair(coll, loc, rot_z):
    root = bpy.data.objects.new("OfficeChair", None); S.link(root, coll)
    vinyl = S.flat("ChairVinyl", (0.18, 0.1, 0.06), 0.4)
    metal = S.flat("ChairMetal", (0.6, 0.6, 0.62), 0.25, 1.0)
    P.rbox("ChairSeat", (0.5, 0.48, 0.09), vinyl, coll, (0, 0, 0.47), 0.03, root)
    P.rbox("ChairBack", (0.46, 0.08, 0.5), vinyl, coll, (0, 0.24, 0.82), 0.03, root).rotation_euler = (math.radians(-8), 0, 0)
    P.cyl("ChairPost", 0.025, 0.36, metal, coll, (0, 0, 0.25), parent=root)
    for k in range(5):
        a = k * 2 * math.pi / 5
        leg = P.rbox(f"ChairLeg{k}", (0.32, 0.04, 0.03), metal, coll, (0.15 * math.cos(a), 0.15 * math.sin(a), 0.07), 0.01, root)
        leg.rotation_euler = (0, 0, a)
        P.cyl(f"ChairCaster{k}", 0.025, 0.03, S.flat("Caster", (0.03, 0.03, 0.03), 0.4), coll,
              (0.3 * math.cos(a), 0.3 * math.sin(a), 0.025), (math.pi / 2, 0, a), parent=root)
    root.location = loc; root.rotation_euler = (0, 0, math.radians(rot_z))
    return root


# ----------------------------------------------------------------------------- house
def house(coll):
    h = HOUSE
    grass = S.pbr("Lawn", "leafy_grass", 2.0)
    concrete = S.pbr("Driveway", "concrete_floor", 2.0, tint=(1.0, 0.98, 0.94))
    asphalt = S.pbr("Street", "asphalt_02", 4.0) if os.path.exists(os.path.join(A, "tex", "asphalt_02")) else \
        S.flat("Street", (0.06, 0.06, 0.065), 0.8)
    stucco = S.pbr("Stucco", "white_stucco", 2.0, tint=(1.0, 0.92, 0.8), proj="BOX")
    roof = S.pbr("Roof", "grey_roof_tiles", 2.0, tint=(0.7, 0.62, 0.55), proj="BOX")
    trim = S.flat("HouseTrim", (0.35, 0.22, 0.12), 0.5)
    glass = S.flat("HouseGlass", (0.02, 0.025, 0.03), 0.05)
    g = S.grid("HouseLawn", 120, 120, 1, 1, grass, coll); g.location = h + Vector((0, 0, -0.01))
    d = S.box("HouseDrive", h + Vector((3.2, -11, 0)), h + Vector((7.0, 2.0, 0.01)), concrete, coll)
    S.box("HouseWalk", h + Vector((-1.6, -6, 0)), h + Vector((-0.6, 2.0, 0.008)), concrete, coll)
    S.box("HouseSidewalk", h + Vector((-60, -12.2, 0)), h + Vector((60, -11.0, 0.012)), concrete, coll)
    S.box("HouseStreet", h + Vector((-60, -20, -0.02)), h + Vector((60, -12.2, 0.0)), asphalt, coll)
    # ranch house body x -8..7, y 2..11, eaves 2.7, ridge 4.3 along X
    x0, x1, y0, y1, eave, ridge = -8.0, 7.0, 2.0, 11.0, 2.7, 4.3
    S.box("HouseBody", h + Vector((x0, y0, 0)), h + Vector((x1, y1, eave)), stucco, coll)
    bm = bmesh.new()
    ov = 0.6
    pts = [(x0 - ov, y0 - ov, eave - 0.1), (x1 + ov, y0 - ov, eave - 0.1), (x1 + ov, (y0 + y1) / 2, ridge),
           (x0 - ov, (y0 + y1) / 2, ridge), (x0 - ov, y1 + ov, eave - 0.1), (x1 + ov, y1 + ov, eave - 0.1)]
    v = [bm.verts.new(h + Vector(p)) for p in pts]
    bm.faces.new((v[0], v[1], v[2], v[3])); bm.faces.new((v[3], v[2], v[5], v[4]))
    me = bpy.data.meshes.new("HouseRoof"); bm.to_mesh(me); bm.free(); me.materials.append(roof)
    r = S.new_obj("HouseRoof", me, coll)
    sol = r.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.12
    # gable ends
    for xx in (x0, x1):
        bm = bmesh.new()
        tri = [bm.verts.new(h + Vector(p)) for p in ((xx, y0, eave), (xx, y1, eave), (xx, (y0 + y1) / 2, ridge - 0.1))]
        bm.faces.new(tri)
        me = bpy.data.meshes.new("Gable"); bm.to_mesh(me); bm.free(); me.materials.append(stucco)
        S.new_obj("Gable", me, coll)
    S.box("Fascia", h + Vector((x0 - ov, y0 - ov - 0.02, eave - 0.32)), h + Vector((x1 + ov, y0 - ov + 0.04, eave - 0.1)), trim, coll)
    # garage door (x 3.4..6.6) with panels
    gd = S.flat("GarageDoor", (0.82, 0.78, 0.7), 0.5)
    S.box("GarageDoor", h + Vector((3.4, y0 - 0.04, 0)), h + Vector((6.6, y0, 2.2)), gd, coll)
    for i in range(4):
        S.box(f"GarageGroove{i}", h + Vector((3.4, y0 - 0.05, 0.54 + i * 0.54)), h + Vector((6.6, y0 - 0.04, 0.56 + i * 0.54)),
              S.flat("Groove", (0.4, 0.38, 0.34), 0.6), coll)
    # front door and windows with shutters
    S.box("FrontDoor", h + Vector((-1.55, y0 - 0.05, 0)), h + Vector((-0.65, y0, 2.1)), trim, coll)
    for i, (wx0, wx1) in enumerate(((-6.8, -4.6), (-3.8, -2.4), (0.6, 2.4))):
        S.box(f"Window{i}", h + Vector((wx0, y0 - 0.03, 0.9)), h + Vector((wx1, y0, 2.1)), glass, coll)
        S.box(f"WindowFrame{i}", h + Vector((wx0 - 0.06, y0 - 0.05, 0.84)), h + Vector((wx1 + 0.06, y0 - 0.03, 0.9)), trim, coll)
        for sx, xx in ((-1, wx0 - 0.5), (1, wx1)):
            S.box(f"Shutter{i}{sx}", h + Vector((xx, y0 - 0.06, 0.85)), h + Vector((xx + 0.5, y0 - 0.02, 2.15)), trim, coll)
    # mailbox
    post = S.flat("MailPost", (0.3, 0.22, 0.14), 0.7)
    S.box("MailPost", h + Vector((-3.05, -10.6, 0)), h + Vector((-2.95, -10.5, 1.0)), post, coll)
    S.box("Mailbox", h + Vector((-3.15, -10.8, 1.0)), h + Vector((-2.85, -10.3, 1.22)), S.flat("MailBox", (0.1, 0.12, 0.1), 0.4), coll)
    # shrubs and a tree
    model("shrub_02", coll, h + Vector((-5.5, 1.2, 0)), 0, 0.45)
    model("shrub_02", coll, h + Vector((1.5, 1.2, 0)), 180, 0.4)
    leaf = ST.foliage_material("HouseLeaf", (0.06, 0.1, 0.035)); bark = S.flat("HouseBark", (0.1, 0.07, 0.05), 0.9)
    for i, (x, y, s) in enumerate(((-11, -5, 1.5), (-16, 8, 2.0), (14, 9, 1.8), (16, -2, 1.6))):
        tr = S.new_obj(f"HouseTree{i}", ST._tree_mesh(f"HouseTree{i}", i + 11, leaf, bark), coll); tr.location = h + Vector((x, y, 0))
        tr.scale = (s, s, s)
    return {}


# ----------------------------------------------------------------------------- stage
def stage(coll):
    st = STAGE
    floor = S.pbr("StageFloor", "concrete_floor", 4.0, tint=(0.95, 0.94, 0.92))
    g = S.grid("StageFloor", 400, 400, 1, 1, floor, coll); g.location = st
    return {}


# ----------------------------------------------------------------------------- shop
def shop(coll):
    s = SHOP
    wallm = S.pbr("ShopWall", "painted_plaster_wall", 2.0, tint=(0.9, 0.82, 0.68), proj="BOX")
    floor = S.pbr("ShopFloor", "laminate_floor_02", 2.0, tint=(0.8, 0.7, 0.6))
    S.grid("ShopFloor", 6, 5, 1, 1, floor, coll).location = s + Vector((0, 0.5, 0))
    S.box("ShopBack", s + Vector((-3, 2.2, 0)), s + Vector((3, 2.3, 2.8)), wallm, coll)
    S.box("ShopLeft", s + Vector((-3.1, -2, 0)), s + Vector((-3.0, 2.3, 2.8)), wallm, coll)
    wood = S.pbr("CounterWood", "fine_grained_wood", 0.6, tint=(0.55, 0.36, 0.22))
    S.box("Counter", s + Vector((-1.2, -0.35, 0)), s + Vector((1.2, 0.35, 0.92)), wood, coll)
    top = S.pbr("CounterTop", "fine_grained_wood", 0.4, tint=(0.4, 0.25, 0.15))
    S.box("CounterTop", s + Vector((-1.25, -0.4, 0.92)), s + Vector((1.25, 0.4, 0.95)), top, coll)
    model("vintage_cabinet_01", coll, s + Vector((-0.6, 1.85, 0)), 0)
    model("wooden_bookshelf_worn", coll, s + Vector((1.6, 1.95, 0)), 0)
    model("mantel_clock_01", coll, s + Vector((0.9, 0.1, 0.95)), -20)
    tvs = model("Television_01", coll, s + Vector((-1.9, 1.9, 0.0)), 10)
    area("ShopKey", coll, s + Vector((0.6, -1.4, 2.5)), 1.5, 160, (1.0, 0.86, 0.68), rot=(math.radians(35), 0, 0))
    point("ShopPractical", coll, s + Vector((-0.8, 1.2, 2.2)), 60, (1.0, 0.8, 0.55), 0.2)
    return {"counter_top": 0.95}


# ----------------------------------------------------------------------------- auction
def auction(coll):
    a = AUCTION
    parquet = S.pbr("Parquet", "herringbone_parquet", 1.6, tint=(0.85, 0.7, 0.55))
    wallm = S.pbr("HallWall", "painted_plaster_wall", 2.5, tint=(0.55, 0.6, 0.66), proj="BOX")
    velvet = S.pbr("Curtain", "velour_velvet", 1.0, tint=(0.75, 0.08, 0.08))
    S.grid("HallFloor", 16, 14, 1, 1, parquet, coll).location = a
    S.box("HallBack", a + Vector((-8, 6.0, 0)), a + Vector((8, 6.1, 5.0)), wallm, coll)
    S.box("HallLeft", a + Vector((-8.1, -7, 0)), a + Vector((-8.0, 6.1, 5.0)), wallm, coll)
    S.box("HallRight", a + Vector((8.0, -7, 0)), a + Vector((8.1, 6.1, 5.0)), wallm, coll)
    S.box("HallCeil", a + Vector((-8, -7, 5.0)), a + Vector((8, 6.1, 5.1)), S.flat("HallCeil", (0.08, 0.08, 0.09), 0.8), coll)
    # pleated curtain behind the podium
    bm = bmesh.new()
    nx, nz = 120, 2
    verts = [[bm.verts.new(a + Vector((-6 + 12 * i / nx, 5.9 - 0.06 * math.sin(i * 0.9) ** 2, 4.8 * j / nz)))
              for i in range(nx + 1)] for j in range(nz + 1)]
    for j in range(nz):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    me = bpy.data.meshes.new("Curtain"); bm.to_mesh(me); bm.free(); me.materials.append(velvet)
    for p in me.polygons:
        p.use_smooth = True
    S.new_obj("Curtain", me, coll)
    # podium (front faces -Y)
    wood = S.pbr("PodiumWood", "fine_grained_wood", 0.6, tint=(0.5, 0.3, 0.16))
    S.box("Podium", a + Vector((1.75, 3.75, 0)), a + Vector((2.65, 4.3, 1.12)), wood, coll)
    pt = S.box("PodiumTop", a + Vector((1.7, 3.7, 1.12)), a + Vector((2.7, 4.35, 1.16)), wood, coll)
    pt.rotation_euler = (math.radians(-10), 0, 0)
    # easel with the framed contract
    easel = S.flat("Easel", (0.3, 0.2, 0.12), 0.6)
    for sx in (-1, 1):
        l = P.rbox(f"EaselLeg{sx}", (0.04, 0.04, 1.8), easel, coll, a + Vector((-0.3 + sx * 0.32, 4.3, 0.9)))
        l.rotation_euler = (math.radians(-8), sx * math.radians(-6), 0)
    l = P.rbox("EaselBack", (0.04, 0.04, 1.8), easel, coll, a + Vector((-0.3, 4.55, 0.9)))
    l.rotation_euler = (math.radians(14), 0, 0)
    P.rbox("EaselLedge", (0.8, 0.08, 0.04), easel, coll, a + Vector((-0.3, 4.18, 0.95)))
    frame = model("fancy_picture_frame_01", coll, a + Vector((-0.3, 4.16, 1.33)), 0, 1.25)
    frame.rotation_euler = (math.radians(98), 0, 0)
    # chairs: 4 rows of 6, facing the podium (+Y)
    chair_pos = []
    for r in range(4):
        for c in range(6):
            x = -3.4 + c * 0.75 + (0.35 if c >= 3 else 0)
            y = 1.4 - r * 1.15
            chair_pos.append((x, y))
            model("dining_chair_02", coll, a + Vector((x, y, 0)), 180)
    # lights
    area("HallKey", coll, a + Vector((0, -3, 4.8)), 4.0, 900, (1.0, 0.9, 0.78), rot=(math.radians(-20), 0, 0))
    area("HallFill", coll, a + Vector((-5, 0, 3.5)), 3.0, 260, (0.8, 0.85, 1.0), rot=(0, math.radians(-60), 0))
    spot("FrameSpot", coll, a + Vector((-0.3, 2.2, 4.9)), a + Vector((-0.3, 4.2, 1.3)), 600, 18, 0.3)
    spot("PodiumSpot", coll, a + Vector((2.2, 1.8, 4.9)), a + Vector((2.2, 4.0, 1.4)), 500, 22, 0.4)
    return {"chairs": chair_pos}


# ----------------------------------------------------------------------------- nevada living room
def nevada(coll):
    n = NEVADA
    X0, X1, Y0, Y1, H = -2.8, 2.8, -2.4, 2.4, 2.6
    wallm = S.pbr("NvWall", "painted_plaster_wall", 2.2, tint=(1.0, 0.9, 0.76), proj="BOX")
    floor = S.pbr("NvFloor", "laminate_floor_02", 1.6, tint=(0.9, 0.78, 0.62))
    S.grid("NvFloor", X1 - X0, Y1 - Y0, 1, 1, floor, coll).location = n
    c = S.grid("NvCeil", X1 - X0, Y1 - Y0, 1, 1, S.flat("NvCeil", (0.85, 0.82, 0.76), 0.9), coll)
    c.location = n + Vector((0, 0, H)); c.rotation_euler = (math.pi, 0, 0)
    t = 0.1
    # back wall with a wide window x -1.8..0.6, z 0.8..2.1
    wx0, wx1, wz0, wz1 = -1.8, 0.6, 0.8, 2.1
    S.box("NvBack1", n + Vector((X0, Y1, 0)), n + Vector((wx0, Y1 + t, H)), wallm, coll)
    S.box("NvBack2", n + Vector((wx1, Y1, 0)), n + Vector((X1, Y1 + t, H)), wallm, coll)
    S.box("NvBack3", n + Vector((wx0, Y1, 0)), n + Vector((wx1, Y1 + t, wz0)), wallm, coll)
    S.box("NvBack4", n + Vector((wx0, Y1, wz1)), n + Vector((wx1, Y1 + t, H)), wallm, coll)
    S.box("NvLeft", n + Vector((X0 - t, Y0, 0)), n + Vector((X0, Y1, H)), wallm, coll)
    S.box("NvRight", n + Vector((X1, Y0, 0)), n + Vector((X1 + t, Y1, H)), wallm, coll)
    S.box("NvFront", n + Vector((X0, Y0 - t, 0)), n + Vector((X1, Y0, H)), wallm, coll)
    trim = S.flat("NvTrim", (0.92, 0.9, 0.84), 0.5)
    S.box("NvSill", n + Vector((wx0 - 0.05, Y1 - 0.12, wz0 - 0.04)), n + Vector((wx1 + 0.05, Y1 + 0.02, wz0)), trim, coll)
    for i in range(3):  # window mullions
        xx = wx0 + (wx1 - wx0) * (i + 1) / 4
        S.box(f"NvMullion{i}", n + Vector((xx - 0.02, Y1 + 0.03, wz0)), n + Vector((xx + 0.02, Y1 + 0.06, wz1)), trim, coll)
    # desert outside
    ground = S.pbr("Desert", "dry_ground_rocks", 3.0, tint=(1.05, 0.9, 0.75))
    S.grid("NvDesert", 300, 300, 1, 1, ground, coll).location = n + Vector((0, 152, -0.2))
    model("coast_rocks_02", coll, n + Vector((6, 30, -0.5)), 40, 0.12)
    model("shrub_02", coll, n + Vector((-4, 9, -0.2)), 0, 0.3)
    model("shrub_02", coll, n + Vector((3, 14, -0.2)), 70, 0.35)
    # distant mountains
    rnd = random.Random(8)
    mtn = S.flat("Mountains", (0.42, 0.3, 0.24), 0.95)
    bm = bmesh.new()
    prev = None
    nseg = 60
    ring_b, ring_t = [], []
    for i in range(nseg + 1):
        x = -300 + 600 * i / nseg
        hgt = 40 + 50 * abs(math.sin(i * 0.37)) + rnd.uniform(0, 30)
        ring_b.append(bm.verts.new(n + Vector((x, 300, -1))))
        ring_t.append(bm.verts.new(n + Vector((x, 300 + rnd.uniform(-20, 20), hgt))))
    for i in range(nseg):
        bm.faces.new((ring_b[i], ring_b[i + 1], ring_t[i + 1], ring_t[i]))
    me = bpy.data.meshes.new("Mountains"); bm.to_mesh(me); bm.free(); me.materials.append(mtn)
    S.new_obj("Mountains", me, coll)
    # furniture
    chair = model("mid_century_lounge_chair", coll, n + Vector((0.55, 0.6, 0)), 15)
    model("side_table_01", coll, n + Vector((1.55, 0.8, 0)), 0)
    lampm = S.flat("LampShade", (0.95, 0.88, 0.72), 0.6)
    lampm.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 0.4
    P.cyl("LampBase", 0.07, 0.3, S.flat("LampBaseMat", (0.5, 0.35, 0.2), 0.4), coll, n + Vector((1.6, 0.85, 0.7)))
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=24, radius1=0.2, radius2=0.13, depth=0.24)
    me = bpy.data.meshes.new("LampShade"); bm.to_mesh(me); bm.free(); me.materials.append(lampm)
    sh = S.new_obj("LampShade", me, coll); sh.location = n + Vector((1.6, 0.85, 0.98))
    point("NvLamp", coll, n + Vector((1.6, 0.85, 0.95)), 40, (1.0, 0.78, 0.5), 0.08)
    model("Television_01", coll, n + Vector((-2.2, -0.4, 0.55)), 60)
    model("coffee_table_round_01", coll, n + Vector((-0.6, -0.5, 0)), 0, 0.85)
    model("wooden_bookshelf_worn", coll, n + Vector((-2.35, 1.4, 0)), 90)
    # frames on the right wall; the empty one hangs behind his chair
    fr1 = model("hanging_picture_frame_01", coll, n + Vector((X1 - 0.01, 0.2, 1.6)), 90, 0.8)
    fr2 = model("hanging_picture_frame_01", coll, n + Vector((1.5, Y1 - 0.01, 1.55)), 180, 0.7)
    # lights: low warm sun through the window, a soft fill
    area("NvFill", coll, n + Vector((0.5, -2.0, 2.3)), 2.0, 110, (1.0, 0.92, 0.82), rot=(math.radians(50), 0, 0))
    return {"chair": chair}
