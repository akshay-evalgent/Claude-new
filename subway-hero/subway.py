"""Realistic plates for the Subway Hero short, path-traced in Blender Cycles.

  blender -b -P subway.py -- --shot B1 --still 40 --pct 50      # test frame
  blender -b -P subway.py -- --shot B1 --anim                     # every frame of the shot into out/plates/B1/

Shots (30 fps, 1080x1920):
  B1  hook: from the drainage trough, a train arrives and rolls over the camera
  B2  from the platform edge, the train's headlights appear in the dark tunnel
  B3  lying in the trough, looking up as the undercarriage passes inches overhead
  B4  close-up of a blue knit cap with a streak of grease on it
"""
import bpy, math, sys, os, time, random
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt, i = {}, 0
while i < len(args):
    k = args[i].lstrip('-')
    if i + 1 < len(args) and not args[i + 1].startswith('--'): opt[k] = args[i + 1]; i += 2
    else: opt[k] = True; i += 1
SHOT = opt.get('shot', 'B1')
FPS = 30
LEN = {'B1': 192, 'B2': 93, 'B3': 123, 'B4': 54}[SHOT]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = LEN
scene.render.engine = 'CYCLES'
cy = scene.cycles; cy.device = 'CPU'
cy.samples = int(opt.get('samples', 16 if SHOT == 'B3' else 12)); cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 4; cy.diffuse_bounces = 2; cy.glossy_bounces = 2; cy.transparent_max_bounces = 4
cy.caustics_reflective = cy.caustics_refractive = False; cy.blur_glossy = 1.0
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920
scene.render.resolution_percentage = int(opt.get('pct', 100))
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.render.use_persistent_data = True
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.image_settings.file_format = 'PNG'
random.seed(7)

# ------------------------------------------------------------------ helpers
def nodes_of(mat):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear(); return nt, nt.nodes, nt.links

_CUBE = None
def box(name, size, loc, mat, parent=None, rot=(0, 0, 0)):
    """A scaled unit cube. All boxes share one mesh; each carries its own material, so building thousands is fast."""
    global _CUBE
    if _CUBE is None:
        import bmesh
        _CUBE = bpy.data.meshes.new('UnitCube'); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(_CUBE); bm.free()
        _CUBE.materials.append(None)
    o = bpy.data.objects.new(name, _CUBE); scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler = rot; o.scale = size
    o.material_slots[0].link = 'OBJECT'; o.material_slots[0].material = mat
    if parent: o.parent = parent; o.matrix_parent_inverse.identity()
    return o

def cyl(name, r, depth, loc, mat, rot=(0, 0, 0), verts=32, parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object; o.name = name; o.data.materials.append(mat); bpy.ops.object.shade_smooth()
    if parent: o.parent = parent
    return o

def pbr(name, color, rough, metal=0.0, noise=0.0, noise_scale=8.0, dirt=None, bump=0.0, emit=None, emit_str=0.0):
    """A principled material with optional grime: noise darkens the colour and roughens the surface."""
    m = bpy.data.materials.new(name); nt, N, L = nodes_of(m)
    o = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], o.inputs['Surface'])
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = emit_str
    if noise > 0 or bump > 0:
        tc = N.new('ShaderNodeNewGeometry'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = noise_scale; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = 0.6
        L.new(tc.outputs['Position'], nz.inputs['Vector'])
        if noise > 0:
            mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['A'].default_value = (*color, 1)
            d = dirt or tuple(c * 0.35 for c in color); mix.inputs['B'].default_value = (*d, 1)
            ramp = N.new('ShaderNodeMapRange'); ramp.inputs['From Min'].default_value = 0.45; ramp.inputs['From Max'].default_value = 0.75
            L.new(nz.outputs['Fac'], ramp.inputs['Value']); fac = N.new('ShaderNodeMath'); fac.operation = 'MULTIPLY'; fac.inputs[1].default_value = noise
            L.new(ramp.outputs[0], fac.inputs[0]); L.new(fac.outputs[0], mix.inputs['Factor']); L.new(mix.outputs['Result'], b.inputs['Base Color'])
            rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough; rr.inputs['To Max'].default_value = min(1.0, rough + 0.35)
            L.new(ramp.outputs[0], rr.inputs['Value']); L.new(rr.outputs[0], b.inputs['Roughness'])
        if bump > 0:
            bm = N.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], bm.inputs['Height']); L.new(bm.outputs[0], b.inputs['Normal'])
    return m

def emissive(name, color, strength):
    m = bpy.data.materials.new(name); nt, N, L = nodes_of(m)
    o = N.new('ShaderNodeOutputMaterial'); e = N.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    L.new(e.outputs[0], o.inputs['Surface']); return m

# ------------------------------------------------------------------ materials
CONCRETE = pbr('Concrete', (0.2, 0.19, 0.175), 0.9, noise=0.9, noise_scale=3, dirt=(0.05, 0.045, 0.04), bump=0.3)
TROUGH = pbr('Trough', (0.18, 0.17, 0.16), 0.75, noise=0.9, noise_scale=5, dirt=(0.04, 0.035, 0.03), bump=0.3)
TIE = pbr('Tie', (0.17, 0.12, 0.08), 0.85, noise=0.7, noise_scale=12, bump=0.2)
RAIL = pbr('Rail', (0.28, 0.18, 0.12), 0.7, metal=0.6, noise=0.8, noise_scale=20, dirt=(0.12, 0.07, 0.04), bump=0.15)
RAILTOP = pbr('RailTop', (0.75, 0.74, 0.72), 0.18, metal=1.0)
BOARD = pbr('CoverBoard', (0.22, 0.18, 0.12), 0.85, noise=0.6, noise_scale=6)
WALL = pbr('PlatformWall', (0.42, 0.4, 0.36), 0.85, noise=0.7, noise_scale=2, bump=0.2)
TILE = pbr('Tile', (0.82, 0.8, 0.74), 0.3, noise=0.3, noise_scale=1.5)
YELLOW = pbr('EdgeStrip', (0.85, 0.62, 0.08), 0.55, noise=0.35, noise_scale=4, bump=0.4)
COLUMN = pbr('Column', (0.07, 0.17, 0.12), 0.5, metal=0.4, noise=0.5, noise_scale=3)
DARK = pbr('Tunnel', (0.09, 0.085, 0.08), 0.9, noise=0.6, noise_scale=1.5)
STEEL = pbr('CarBody', (0.72, 0.73, 0.74), 0.28, metal=1.0, noise=0.25, noise_scale=1.2, dirt=(0.45, 0.45, 0.45))
UNDER = pbr('Undercarriage', (0.09, 0.085, 0.08), 0.6, metal=0.5, noise=0.8, noise_scale=6, dirt=(0.03, 0.025, 0.02), bump=0.3)
WHEEL = pbr('Wheel', (0.2, 0.17, 0.15), 0.45, metal=0.9, noise=0.6, noise_scale=10)
GLASS_LIT = emissive('WindowLit', (1.0, 0.93, 0.82), 3.0)
FRONT = pbr('CabFront', (0.06, 0.06, 0.065), 0.35, metal=0.3)
HEADLAMP = emissive('Headlamp', (1.0, 0.96, 0.88), 400.0)
MARKER = emissive('MarkerRed', (1.0, 0.1, 0.05), 25.0)
SIGN = emissive('RouteSign', (1.0, 0.08, 0.06), 12.0)
TUBE = emissive('Fluorescent', (0.92, 0.97, 1.0), 9.0)
SIGNAL_R = emissive('SignalRed', (1.0, 0.05, 0.03), 60.0)
SIGNAL_G = emissive('SignalGreen', (0.1, 1.0, 0.4), 30.0)

# ------------------------------------------------------------------ the station and track (track runs along +Y, toward the tunnel)
G = 1.435; RX = G / 2 + 0.035          # rail centre lines
RAIL_TOP = 0.32
Y0, Y1 = -60.0, 260.0; YL = Y1 - Y0; YC = (Y0 + Y1) / 2
box('BedLeft', (1.0, YL, 0.3), (-1.15, YC, -0.15), CONCRETE)
box('BedRight', (1.6, YL, 0.3), (1.25, YC, -0.15), CONCRETE)
box('TroughFloor', (0.66, YL, 0.1), (0, YC, -0.38), TROUGH)
for s in (-1, 1): box(f'TroughWall{s}', (0.04, YL, 0.36), (s * 0.35, YC, -0.16), TROUGH)
for s in (-1, 1):   # wooden half-ties under each rail, rails on top
    y = Y0
    while y < Y1:
        box('Tie', (0.62, 0.22, 0.14), (s * RX, y, 0.07 + random.uniform(-0.005, 0.005)), TIE); y += 0.76
    box('RailFoot', (0.14, YL, 0.03), (s * RX, YC, 0.155), RAIL)
    box('RailWeb', (0.03, YL, 0.1), (s * RX, YC, 0.22), RAIL)
    box('RailHead', (0.07, YL, 0.045), (s * RX, YC, 0.29), RAIL)
    box('RailTop', (0.06, YL, 0.008), (s * RX, YC, RAIL_TOP), RAILTOP)
box('ThirdRail', (0.08, YL, 0.09), (1.42, YC, 0.33), RAIL)               # the third rail, under its wooden cover board
box('CoverBoard', (0.32, YL, 0.04), (1.47, YC, 0.47), BOARD)
y = Y0
while y < Y1:
    box('Bracket', (0.06, 0.06, 0.3), (1.6, y, 0.32), RAIL); y += 3.0
# platform on the left
PLAT_Z = 1.25; STATION_END = 70.0
box('PlatformWall', (0.3, STATION_END - Y0, PLAT_Z + 0.3), (-1.75, (Y0 + STATION_END) / 2, (PLAT_Z - 0.3) / 2), WALL)
box('Platform', (5.0, STATION_END - Y0, 0.25), (-4.4, (Y0 + STATION_END) / 2, PLAT_Z - 0.125), CONCRETE)
box('EdgeStrip', (0.6, STATION_END - Y0, 0.02), (-2.2, (Y0 + STATION_END) / 2, PLAT_Z + 0.01), YELLOW)
box('BackWall', (0.3, STATION_END - Y0, 5.0), (-6.9, (Y0 + STATION_END) / 2, PLAT_Z + 2.5), TILE)
box('Ceiling', (14, STATION_END - Y0, 0.3), (-1.0, (Y0 + STATION_END) / 2, 5.0), DARK)
# columns between this track and the next, every 4.6 m
y = Y0 + 2
while y < STATION_END:
    for dx, w in ((0, 0.04), (0.14, 0.24), (-0.14, 0.24)):
        box('Column', (0.24 if dx == 0 else 0.03, w if dx == 0 else 0.24, 5.0), (2.45 + dx * 0.0, y + (dx if dx else 0), 2.5), COLUMN)
    y += 4.6
box('FarTrackBed', (4.0, YL, 0.3), (4.5, YC, -0.15), CONCRETE)
# fluorescent strips over the platform, and real lights to go with them
y = Y0 + 3
while y < STATION_END:
    box('Tube', (0.12, 2.4, 0.06), (-3.0, y, 4.8), TUBE); box('Tube', (0.12, 2.4, 0.06), (0.4, y, 4.8), TUBE); y += 6.0
for k, y in enumerate(range(-30, 66, 12)):
    ld = bpy.data.lights.new(f'Fill{k}', 'AREA'); ld.shape = 'RECTANGLE'; ld.size = 1.2; ld.size_y = 10; ld.energy = 260; ld.color = (0.9, 0.96, 1.0)
    lo = bpy.data.objects.new(f'Fill{k}', ld); lo.location = (-1.4, y, 4.7); scene.collection.objects.link(lo)
# the tunnel beyond the station: dark, close walls, a signal
box('TunnelLeft', (0.4, Y1 - STATION_END, 5.0), (-2.3, (STATION_END + Y1) / 2, 2.0), DARK)
box('TunnelRight', (0.4, Y1 - STATION_END, 5.0), (2.9, (STATION_END + Y1) / 2, 2.0), DARK)
box('TunnelRoof', (6.0, Y1 - STATION_END, 0.3), (0.3, (STATION_END + Y1) / 2, 4.4), DARK)
box('TunnelMouthWall', (14, 0.4, 3.2), (-1.0, STATION_END, 6.0), DARK)
for y_, m_ in ((95.0, SIGNAL_R), (160.0, SIGNAL_G)):
    box('SignalHead', (0.25, 0.2, 0.5), (2.6, y_, 2.6), FRONT); cyl('SignalLamp', 0.06, 0.03, (2.6, y_ - 0.11, 2.75), m_, rot=(math.pi / 2, 0, 0))
for y_ in range(80, 250, 25):
    cyl('WorkLight', 0.05, 0.03, (-2.08, y_, 3.6), emissive('WorkLight', (0.4, 0.7, 1.0), 6.0), rot=(0, math.pi / 2, 0))
world = bpy.data.worlds.new('W'); world.color = (0.0, 0.0, 0.0); scene.world = world

# ------------------------------------------------------------------ the train: stainless cars, lit windows, dark grimy undercarriage
CAR_L, CAR_W, GAP = 15.6, 2.68, 0.7
FLOOR = RAIL_TOP + 0.95; ROOF = RAIL_TOP + 3.6
train = bpy.data.objects.new('Train', None); scene.collection.objects.link(train)
wheels = []
def build_car(k):
    c = bpy.data.objects.new(f'Car{k}', None); scene.collection.objects.link(c); c.parent = train
    c.location = (0, k * (CAR_L + GAP) + CAR_L / 2, 0)
    box('Body', (CAR_W, CAR_L, ROOF - FLOOR), (0, 0, (FLOOR + ROOF) / 2), STEEL, c)
    for s in (-1, 1):
        for j in range(5):
            box('Window', (0.02, 1.6, 0.75), (s * (CAR_W / 2 + 0.005), -6.0 + j * 3.0, FLOOR + 1.85), GLASS_LIT, c)
        for j in range(4):
            box('Door', (0.025, 1.3, 1.95), (s * (CAR_W / 2 + 0.008), -4.5 + j * 3.0, FLOOR + 1.0), STEEL, c)
        box('Skirt', (0.03, CAR_L - 1.0, 0.25), (s * (CAR_W / 2 - 0.05), 0, FLOOR - 0.1), UNDER, c)
    box('Underframe', (CAR_W - 0.3, CAR_L - 0.6, 0.16), (0, 0, FLOOR - 0.08), UNDER, c)
    rnd = random.Random(k)
    for j in range(9):                                  # equipment boxes, hanging low between the trucks
        w, l, h = rnd.uniform(0.5, 1.6), rnd.uniform(0.6, 1.8), rnd.uniform(0.25, 0.42)
        x, y = rnd.uniform(-0.6, 0.6), rnd.uniform(-3.4, 3.4)
        box('Equipment', (w, l, h), (x, y, FLOOR - 0.16 - h / 2), UNDER, c)
    for j in range(5): cyl('Pipe', 0.035, CAR_L - 2, (rnd.uniform(-1.0, 1.0), 0, FLOOR - 0.2), UNDER, rot=(math.pi / 2, 0, 0), verts=12, parent=c)
    for ty in (-5.3, 5.3):                              # two trucks per car, four wheels each
        box('TruckFrame', (2.1, 2.6, 0.32), (0, ty, RAIL_TOP + 0.55), UNDER, c)
        box('Bolster', (2.4, 0.5, 0.2), (0, ty, RAIL_TOP + 0.82), UNDER, c)
        for wy in (-1.05, 1.05):
            box('Axle', (G + 0.2, 0.14, 0.14), (0, ty + wy, RAIL_TOP + 0.42), WHEEL, c)
            for s in (-1, 1):
                wh = cyl('Wheel', 0.42, 0.13, (s * RX, ty + wy, RAIL_TOP + 0.42), WHEEL, rot=(0, math.pi / 2, 0), verts=40, parent=c)
                wheels.append(wh)
                box('BrakeShoe', (0.1, 0.12, 0.35), (s * (RX + 0.09), ty + wy - 0.47, RAIL_TOP + 0.45), UNDER, c)
    if k == 0:                                           # the cab end, facing +Y... the train travels toward -Y, so this is the front
        f = -CAR_L / 2 - 0.01
        box('CabFace', (CAR_W, 0.03, ROOF - FLOOR), (0, f, (FLOOR + ROOF) / 2), FRONT, c)
        box('Windshield', (0.9, 0.02, 0.85), (-0.55, f - 0.02, FLOOR + 1.85), emissive('CabGlass', (0.3, 0.32, 0.35), 0.6), c)
        box('DoorWindow', (0.55, 0.02, 0.85), (0.6, f - 0.02, FLOOR + 1.85), emissive('CabGlass2', (0.6, 0.6, 0.55), 1.2), c)
        for s in (-1, 1):
            cyl('Headlamp', 0.11, 0.05, (s * 0.85, f - 0.03, FLOOR + 0.45), HEADLAMP, rot=(math.pi / 2, 0, 0), parent=c)
            cyl('Marker', 0.05, 0.05, (s * 1.1, f - 0.03, FLOOR + 2.85), MARKER, rot=(math.pi / 2, 0, 0), parent=c)
            sp = bpy.data.lights.new('HeadSpot', 'SPOT'); sp.energy = 6000; sp.spot_size = math.radians(55); sp.spot_blend = 0.6; sp.color = (1, 0.95, 0.85); sp.shadow_soft_size = 0.1
            so = bpy.data.objects.new('HeadSpot', sp); so.parent = c; so.location = (s * 0.85, f - 0.1, FLOOR + 0.45); so.rotation_euler = (math.radians(98), 0, 0)
            scene.collection.objects.link(so)
        cyl('RouteSign', 0.22, 0.03, (0.0, f - 0.03, FLOOR + 2.75), SIGN, rot=(math.pi / 2, 0, 0), parent=c)
        box('Anticlimber', (CAR_W - 0.2, 0.18, 0.22), (0, f - 0.09, FLOOR - 0.05), UNDER, c)
    cab = bpy.data.lights.new('CarInterior', 'POINT'); cab.energy = 250; cab.color = (1.0, 0.9, 0.78); cab.shadow_soft_size = 1.0
    co = bpy.data.objects.new('CarInterior', cab); co.parent = c; co.location = (CAR_W / 2 + 0.4, 0, FLOOR + 1.8); scene.collection.objects.link(co)
    return c
NCARS = 5
for k in range(NCARS): build_car(k)

def front_y(f):
    """Where the front of the train is (metres along the track) at frame f of this shot."""
    t = (f - 1) / FPS
    if SHOT == 'B1':       # arrives fast, front rolls over the camera at t = 4.85 s, still moving at the end
        return 0.55 + 15.5 * (4.85 - t) + 0.9 * (4.85 - t) ** 2
    if SHOT == 'B2':       # down the tunnel, coming into view
        return 150.0 - 12.0 * t
    if SHOT == 'B3':       # braking hard: cars pass overhead, slowing down
        v0, a = 7.0, 1.0
        return -6.0 - (v0 * t - 0.5 * a * t * t)
    return 3.2             # B4: the train has stopped just beyond the cap
# key the train position on every frame; wheels turn with distance
for f in range(1, LEN + 1):
    y = front_y(f) + CAR_L / 2
    train.location = (0, y - CAR_L / 2, 0); train.keyframe_insert('location', frame=f)
for wh in wheels:
    wh.rotation_mode = 'ZYX'
    for f in range(1, LEN + 1, 2):
        wh.rotation_euler = (0, math.pi / 2, front_y(f) / 0.42); wh.keyframe_insert('rotation_euler', frame=f)
for o in [train] + wheels:
    if o.animation_data:
        for fc in o.animation_data.action.fcurves:
            for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ the cap (B4)
if SHOT == 'B4':
    knit = bpy.data.materials.new('Knit'); nt, N, L = nodes_of(knit)
    o = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], o.inputs['Surface'])
    b.inputs['Roughness'].default_value = 0.95; b.inputs['Sheen Weight'].default_value = 0.6; b.inputs['Sheen Tint'].default_value = (0.8, 0.85, 1.0, 1)
    tc = N.new('ShaderNodeTexCoord'); wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = 120; wv.inputs['Distortion'].default_value = 3.0; wv.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], wv.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 140; L.new(tc.outputs['Object'], nz.inputs['Vector'])
    h = N.new('ShaderNodeMath'); h.operation = 'ADD'; L.new(wv.outputs['Fac'], h.inputs[0]); L.new(nz.outputs['Fac'], h.inputs[1])
    bm = N.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = 0.5; bm.inputs['Distance'].default_value = 0.002; L.new(h.outputs[0], bm.inputs['Height']); L.new(bm.outputs[0], b.inputs['Normal'])
    # periwinkle wool, with a smear of black grease across the crown
    geo = N.new('ShaderNodeNewGeometry')
    gz = N.new('ShaderNodeTexNoise'); gz.inputs['Scale'].default_value = 7; gz.inputs['Detail'].default_value = 12; gz.inputs['Roughness'].default_value = 0.7
    L.new(geo.outputs['Position'], gz.inputs['Vector'])
    gm = N.new('ShaderNodeMapRange'); gm.inputs['From Min'].default_value = 0.44; gm.inputs['From Max'].default_value = 0.54; L.new(gz.outputs['Fac'], gm.inputs['Value'])
    sepz = N.new('ShaderNodeSeparateXYZ'); L.new(geo.outputs['Position'], sepz.inputs[0])
    top = N.new('ShaderNodeMapRange'); top.inputs['From Min'].default_value = 0.045; top.inputs['From Max'].default_value = 0.085; L.new(sepz.outputs['Z'], top.inputs['Value'])
    mask = N.new('ShaderNodeMath'); mask.operation = 'MULTIPLY'; L.new(gm.outputs[0], mask.inputs[0]); L.new(top.outputs[0], mask.inputs[1])
    col = N.new('ShaderNodeMix'); col.data_type = 'RGBA'; col.inputs['A'].default_value = (0.33, 0.39, 0.82, 1); col.inputs['B'].default_value = (0.015, 0.013, 0.012, 1)
    L.new(mask.outputs[0], col.inputs['Factor']); L.new(col.outputs['Result'], b.inputs['Base Color'])
    rgh = N.new('ShaderNodeMapRange'); rgh.inputs['To Min'].default_value = 0.95; rgh.inputs['To Max'].default_value = 0.22; L.new(mask.outputs[0], rgh.inputs['Value']); L.new(rgh.outputs[0], b.inputs['Roughness'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.1, location=(-1.12, 1.2, 0.04))
    cap = bpy.context.object; cap.name = 'Cap'; cap.scale = (1.0, 1.1, 0.72); cap.data.materials.append(knit); bpy.ops.object.shade_smooth()
    bpy.ops.object.modifier_add(type='DISPLACE'); tex = bpy.data.textures.new('crumple', 'CLOUDS'); tex.noise_scale = 0.06; cap.modifiers[-1].texture = tex; cap.modifiers[-1].strength = 0.022
    bpy.ops.mesh.primitive_torus_add(major_radius=0.088, minor_radius=0.03, location=(-1.12, 1.2, 0.03))
    cuff = bpy.context.object; cuff.scale = (1.0, 1.1, 1.3); cuff.data.materials.append(knit); bpy.ops.object.shade_smooth()
    cap.rotation_euler = cuff.rotation_euler = (math.radians(12), math.radians(-8), 0)

# ------------------------------------------------------------------ camera per shot
cam_data = bpy.data.cameras.new('Cam'); cam_data.sensor_width = 36; cam_data.clip_start = 0.02; cam_data.clip_end = 600
cam = bpy.data.objects.new('Cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
target = bpy.data.objects.new('Target', None); scene.collection.objects.link(target)
tt = cam.constraints.new('TRACK_TO'); tt.target = target; tt.track_axis = 'TRACK_NEGATIVE_Z'; tt.up_axis = 'UP_Y'
KEYS = {
    'B1': [(1, (0.0, -1.0, 0.24), (0.0, 40.0, 0.9), 18, 8.0), (LEN, (0.0, -0.6, 0.2), (0.0, 40.0, 1.1), 18, 3.0)],
    'B2': [(1, (-1.75, 40.0, PLAT_Z + 1.55), (0.3, 200.0, 1.0), 30, 100.0), (LEN, (-1.72, 41.0, PLAT_Z + 1.5), (0.3, 200.0, 1.0), 34, 80.0)],
    'B3': [(1, (0.0, 0.0, -0.08), (0.0, 7.0, 1.1), 16, 2.0), (LEN, (0.0, 0.2, -0.1), (0.0, 7.2, 1.25), 16, 2.0)],
    'B4': [(1, (-1.32, 0.5, 0.3), (-1.12, 1.2, 0.05), 50, 0.75), (LEN, (-1.3, 0.58, 0.27), (-1.12, 1.2, 0.05), 56, 0.68)],
}[SHOT]
cam_data.dof.use_dof = True; cam_data.dof.aperture_fstop = {'B1': 2.8, 'B2': 2.8, 'B3': 11.0, 'B4': 2.8}[SHOT]
if SHOT == 'B3': scene.render.motion_blur_shutter = 0.25
for f, p, q, fl, fd in KEYS:
    cam.location = p; cam.keyframe_insert('location', frame=f); target.location = q; target.keyframe_insert('location', frame=f)
    cam_data.lens = fl; cam_data.keyframe_insert('lens', frame=f); cam_data.dof.focus_distance = fd; cam_data.dof.keyframe_insert('focus_distance', frame=f)
if SHOT == 'B1':      # focus follows the oncoming headlights
    for f in range(1, LEN + 1, 6):
        cam_data.dof.focus_distance = max(0.6, front_y(f) + 1.0); cam_data.dof.keyframe_insert('focus_distance', frame=f)
if SHOT == 'B4':      # a little work light from the side, as if from a flashlight on the platform
    ld = bpy.data.lights.new('Torch', 'SPOT'); ld.energy = 120; ld.spot_size = math.radians(30); ld.spot_blend = 0.8; ld.shadow_soft_size = 0.05; ld.color = (1, 0.95, 0.85)
    lo = bpy.data.objects.new('Torch', ld); lo.location = (-1.5, 0.2, 1.6); scene.collection.objects.link(lo)
    lo.rotation_euler = (Vector((-1.12, 1.2, 0.05)) - lo.location).to_track_quat('-Z', 'Y').to_euler()

if SHOT in ('B1', 'B3'):
    rs = random.Random(3); sparks = []
    for k in range(NCARS):
        for ty in (-5.3, 5.3):
            for s in (-1, 1):
                ld = bpy.data.lights.new('Spark', 'POINT'); ld.color = (1.0, 0.55, 0.18); ld.shadow_soft_size = 0.05
                lo = bpy.data.objects.new('Spark', ld); lo.parent = bpy.data.objects[f'Car{k}']; lo.location = (s * (RX + 0.12), ty - 0.5, RAIL_TOP + 0.08)
                scene.collection.objects.link(lo); sparks.append((ld, rs.random() * 10))
    for f in range(1, LEN + 1):
        for ld, ph in sparks:
            v = 0.55 + 0.45 * math.sin(f * 1.7 + ph) * math.sin(f * 0.63 + ph * 2)
            ld.energy = 60 * max(0.1, v); ld.keyframe_insert('energy', frame=f)
    spill = bpy.data.lights.new('Spill', 'AREA'); spill.shape = 'RECTANGLE'; spill.size = 0.3; spill.size_y = 30; spill.energy = 120; spill.color = (0.8, 0.9, 1.0)
    so = bpy.data.objects.new('Spill', spill); so.location = (-1.45, 5, 0.9); so.rotation_euler = (0, math.radians(-30), 0); scene.collection.objects.link(so)

# ------------------------------------------------------------------ compositor: glare on the headlights, slight vignette
scene.use_nodes = True; ct = scene.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
def glare(kind, src, **inp):
    g = ct.nodes.new('CompositorNodeGlare'); g.glare_type = kind; g.quality = 'HIGH'
    for k_, v_ in inp.items(): g.inputs[k_].default_value = v_
    ct.links.new(src, g.inputs['Image']); return g
g1 = glare('FOG_GLOW', rl.outputs['Image'], Threshold=2.0, Strength=0.4, Size=0.7)
g2 = glare('STREAKS', g1.outputs['Image'], Threshold=60.0, Strength=0.35, Streaks=4, Fade=0.9)
vig = ct.nodes.new('CompositorNodeEllipseMask'); vig.width = 1.1; vig.height = 1.05
bl = ct.nodes.new('CompositorNodeBlur'); bl.size_x = bl.size_y = 260; bl.filter_type = 'GAUSS'; ct.links.new(vig.outputs[0], bl.inputs['Image'])
mr = ct.nodes.new('CompositorNodeMapRange'); mr.inputs['To Min'].default_value = 0.55; mr.inputs['To Max'].default_value = 1.0; ct.links.new(bl.outputs[0], mr.inputs['Value'])
mx = ct.nodes.new('CompositorNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1
ct.links.new(g2.outputs['Image'], mx.inputs[1]); ct.links.new(mr.outputs[0], mx.inputs[2]); ct.links.new(mx.outputs[0], comp.inputs['Image'])

# ------------------------------------------------------------------ go
outdir = os.path.join(HERE, 'out', 'plates', SHOT); os.makedirs(outdir, exist_ok=True)
if 'still' in opt:
    f = int(opt['still']); scene.frame_set(f); scene.render.filepath = os.path.join(HERE, 'out', f'{SHOT}_{f:04d}.png')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'RENDERED {SHOT} frame {f} in {time.time() - t0:.1f}s')
if 'anim' in opt:
    scene.render.filepath = os.path.join(outdir, 'f'); scene.render.use_overwrite = False
    t0 = time.time(); bpy.ops.render.render(animation=True); print(f'RENDERED {SHOT}: {LEN} frames in {time.time() - t0:.1f}s', flush=True)
