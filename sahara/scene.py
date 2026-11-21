"""Lost in the Sahara: the 3D shots, path-traced in Blender Cycles.

  blender -b -P scene.py -- --shot H1 --still 40 --pct 40     # one test frame into out/
  blender -b -P scene.py -- --shot H1 --anim --pct 50          # all frames of a shot into out/plates/H1/ (resumable)

Free parts: MPFB/MakeHuman people (CC0), CMU motion capture, Poly Haven sand texture (CC0), Blender's physical sky.
"""
import bpy, sys, os, math, time, random
from mathutils import Vector, Matrix, noise
HERE = os.path.dirname(os.path.abspath(__file__)); KIT = os.path.join(os.path.dirname(HERE), 'asset-kit')
sys.path.append(os.path.join(KIT, 'blender'))
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt, i = {}, 0
while i < len(args):
    k = args[i].lstrip('-')
    if i + 1 < len(args) and not args[i + 1].startswith('--'): opt[k] = args[i + 1]; i += 2
    else: opt[k] = True; i += 1
SHOT = opt.get('shot', 'H1'); FPS = 24
MOCAP = lambda c: os.path.join(KIT, 'mocap', c + '.bvh')

# name: frames, sun elevation, sun azimuth (deg, 0 = sun in +Y), haze distance (m), set pieces
SHOTS = {
    'H1': dict(n=86, sun=(58, 150), haze=900),
    'H2': dict(n=38, sun=(58, 150), haze=1400),
    'H3': dict(n=41, sun=(50, 200), haze=900, sets=('shrine', 'bats')),
    'R1': dict(n=82, sun=(34, 120), haze=900),
    'R2': dict(n=74, sun=(34, 20), haze=900),
    'S1': dict(n=48, sun=(40, 200), haze=500, sets=('storm',)),
    'S2': dict(n=43, sun=(40, 200), haze=16),
    'A1': dict(n=43, sun=(45, 140), haze=1200),
    'W1': dict(n=74, sun=(62, 160), haze=900, sets=('bottle',)),
    'M1': dict(n=58, sun=(30, 250), haze=900, sets=('shrine',)),
    'M2': dict(n=58, sun=(30, 250), haze=900, sets=('shrine', 'bats')),
    'M3': dict(n=70, sun=(30, 250), haze=900, sets=('shrine', 'bats')),
    'D1': dict(n=50, sun=(3.5, 95), haze=700),
    'D2': dict(n=50, sun=(3.2, 2), haze=600),
    'N1': dict(n=84, sun=(26, 300), haze=900, sets=('camp',)),
    'K1': dict(n=106, sun=(7, 290), haze=700, sets=('camp', 'seat')),
    'P1': dict(n=86, sun=(9, 25), haze=800),
    'P2': dict(n=89, sun=(7, 3), haze=700),
}
S = SHOTS[SHOT]; NF = S['n']; SETS = S.get('sets', ())

bpy.ops.wm.read_factory_settings(use_empty=True)
import human
scene = bpy.context.scene
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = NF
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'
cy.samples = int(opt.get('samples', 16)); cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 5; cy.diffuse_bounces = 2; cy.glossy_bounces = 2; cy.transparent_max_bounces = 12
cy.caustics_reflective = cy.caustics_refractive = False
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920; scene.render.resolution_percentage = int(opt.get('pct', 50))
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.render.use_persistent_data = True
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
INTERIOR = SHOT in ('H3', 'M2', 'M3')
random.seed(11)

def nodes_of(mat):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear(); return nt, nt.nodes, nt.links
def pbr(name, color, rough=0.8, metal=0.0, noise_amt=0.0, scale=4.0, bump=0.0, emit=0.0):
    m = bpy.data.materials.new(name); nt, N, L = nodes_of(m)
    o = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], o.inputs['Surface'])
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*color, 1); b.inputs['Emission Strength'].default_value = emit
    if noise_amt or bump:
        g = N.new('ShaderNodeNewGeometry'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale; nz.inputs['Detail'].default_value = 8
        L.new(g.outputs['Position'], nz.inputs['Vector'])
        if noise_amt:
            mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['A'].default_value = (*color, 1); mx.inputs['B'].default_value = (*[c * (1 - noise_amt) for c in color], 1)
            L.new(nz.outputs['Fac'], mx.inputs['Factor']); L.new(mx.outputs['Result'], b.inputs['Base Color'])
        if bump:
            bm = N.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], bm.inputs['Height']); L.new(bm.outputs[0], b.inputs['Normal'])
    return m
def obj(name, mesh_fn, mat, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), smooth=False, **kw):
    mesh_fn(location=loc, rotation=rot, **kw); o = bpy.context.object; o.name = name; o.scale = scale
    if mat: o.data.materials.append(mat)
    if smooth: bpy.ops.object.shade_smooth()
    return o
box = lambda name, size, loc, mat, rot=(0, 0, 0): obj(name, bpy.ops.mesh.primitive_cube_add, mat, loc, rot, size, size=1)

# ------------------------------------------------------------------ sky and sun
world = bpy.data.worlds.new('Sahara'); scene.world = world; world.use_nodes = True
nt = world.node_tree; N, L = nt.nodes, nt.links; N.clear()
out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground'); sky = N.new('ShaderNodeTexSky')
sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(S['sun'][0]); sky.sun_rotation = math.radians(S['sun'][1])
sky.sun_disc = True; sky.sun_size = math.radians(1.2); sky.sun_intensity = 1.0; sky.air_density = 1.0; sky.dust_density = 1.6; sky.ozone_density = 1.0; sky.altitude = 300
L.new(sky.outputs[0], bg.inputs['Color']); L.new(bg.outputs[0], out.inputs['Surface'])
base_strength = 0.22 if S['sun'][0] > 15 else 0.5      # the camera sees a brighter sky than the one that lights the scene, as film would
lp = N.new('ShaderNodeLightPath'); st = N.new('ShaderNodeMapRange'); st.inputs['To Min'].default_value = base_strength; st.inputs['To Max'].default_value = base_strength * (2.4 if S['sun'][0] > 15 else 0.55)
L.new(lp.outputs['Is Camera Ray'], st.inputs['Value']); L.new(st.outputs[0], bg.inputs['Strength'])
scene.view_settings.exposure = float(opt.get('exposure', -1.2 if S['sun'][0] > 15 else -0.6))
world.mist_settings.start = 2.0; world.mist_settings.depth = S['haze']; world.mist_settings.falloff = 'QUADRATIC'
bpy.context.view_layer.use_pass_mist = True; bpy.context.view_layer.use_pass_z = True
HAZE = (2.6, 2.1, 1.6) if S['sun'][0] > 15 else (0.9, 0.55, 0.32)

# ------------------------------------------------------------------ dunes
DUNE = {'D2': 0.12, 'P2': 0.15, 'P1': 0.5, 'D1': 0.6}.get(SHOT, 1.0)
def height(x, y):
    r = math.hypot(x, y); k = min(1.0, max(0.0, (r - 24.0) / 70.0)); k = k * k * (3 - 2 * k)
    if INTERIOR: return 0.0
    ridge = 1.0 - abs(noise.noise(Vector((x * 0.011, y * 0.007 + 3.1, 0.0))))          # long crests
    big = noise.noise(Vector((x * 0.004 + 9.0, y * 0.004, 1.7)))
    e = min(1.0, max(0.0, (208.0 - max(abs(x), abs(y))) / 40.0))                 # settle to the far plain at the border
    return e * DUNE * k * (13.0 * ridge * ridge + 9.0 * big) + 0.05 * noise.noise(Vector((x * 0.08, y * 0.08, 5.0)))
def build_terrain():
    import bmesh
    me = bpy.data.meshes.new('Dunes'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=260, y_segments=260, size=420.0)
    for v in bm.verts: v.co.z = height(v.co.x, v.co.y)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new('Dunes', me); scene.collection.objects.link(o)
    sand = bpy.data.materials.new('Sand'); nt, N, L = nodes_of(sand)
    out = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], out.inputs['Surface'])
    g = N.new('ShaderNodeNewGeometry'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.5, 0.5, 0.5); L.new(g.outputs['Position'], mp.inputs['Vector'])
    T = lambda f, cs: (lambda n: (setattr(n, 'image', bpy.data.images.load(os.path.join(KIT, 'assets', 'textures', 'sand_01', f))), setattr(n.image.colorspace_settings, 'name', cs), L.new(mp.outputs[0], n.inputs['Vector']), n)[-1])(N.new('ShaderNodeTexImage'))
    dif = T('diffuse.jpg', 'sRGB'); nor = T('normal.jpg', 'Non-Color')
    tint = N.new('ShaderNodeMix'); tint.data_type = 'RGBA'; tint.blend_type = 'MULTIPLY'; tint.inputs['Factor'].default_value = 1.0; tint.inputs['B'].default_value = (1.0, 0.72, 0.42, 1)
    hs = N.new('ShaderNodeHueSaturation'); hs.inputs['Value'].default_value = 1.9; hs.inputs['Saturation'].default_value = 0.9
    L.new(dif.outputs['Color'], hs.inputs['Color']); L.new(hs.outputs[0], tint.inputs['A'])
    big = N.new('ShaderNodeTexNoise'); big.inputs['Scale'].default_value = 0.03; big.inputs['Detail'].default_value = 4; L.new(g.outputs['Position'], big.inputs['Vector'])
    var = N.new('ShaderNodeMix'); var.data_type = 'RGBA'; var.blend_type = 'MULTIPLY'; var.inputs['B'].default_value = (0.78, 0.74, 0.7, 1)
    L.new(big.outputs['Fac'], var.inputs['Factor']); L.new(tint.outputs['Result'], var.inputs['A']); L.new(var.outputs['Result'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.92
    nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.8; L.new(nor.outputs['Color'], nm.inputs['Color'])
    wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = 0.9; wv.inputs['Distortion'].default_value = 5.0; wv.inputs['Detail'].default_value = 2; wv.inputs['Detail Scale'].default_value = 0.6
    wm = N.new('ShaderNodeMapping'); wm.inputs['Rotation'].default_value[2] = 0.6; L.new(g.outputs['Position'], wm.inputs['Vector']); L.new(wm.outputs[0], wv.inputs['Vector'])
    bm_ = N.new('ShaderNodeBump'); bm_.inputs['Strength'].default_value = 0.55; bm_.inputs['Distance'].default_value = 0.06
    L.new(wv.outputs['Fac'], bm_.inputs['Height']); L.new(nm.outputs[0], bm_.inputs['Normal']); L.new(bm_.outputs[0], b.inputs['Normal'])
    me.materials.append(sand)
    far = obj('FarSand', bpy.ops.mesh.primitive_circle_add, sand, (0, 0, -0.08), vertices=64, radius=9000, fill_type='NGON')
    return sand
SAND = build_terrain()

# ------------------------------------------------------------------ people
def runner(spec, extras=True):
    h = human.build(dict({'skin_type': 'ENHANCED', 'hair': 'short01'}, **spec)); rig = h['rig']
    if extras:      # race pack and bib, fixed to the chest
        bpy.context.view_layer.update(); sp = rig.matrix_world @ rig.data.bones['Spine1'].head_local
        pack = box('Pack', (0.28, 0.15, 0.36), (sp.x, sp.y + 0.175, sp.z - 0.12), pbr('PackFabric', spec.get('pack', (0.75, 0.12, 0.08)), 0.85, noise_amt=0.3, scale=30))
        bib = box('Bib', (0.2, 0.012, 0.15), (sp.x, sp.y - 0.17, sp.z - 0.1), pbr('Bib', (0.92, 0.92, 0.88), 0.9))
        bv = pack.modifiers.new('bevel', 'BEVEL'); bv.width = 0.05; bv.segments = 4
        for strap_x in (-0.11, 0.11): parts = box('Strap', (0.04, 0.3, 0.03), (sp.x + strap_x, sp.y + 0.03, sp.z + 0.09), pbr('Strap', (0.1, 0.1, 0.1), 0.8)); attach(parts, rig, 'Spine1')
        attach(pack, rig, 'Spine'); attach(bib, rig, 'Spine1')
    return h
def attach(o, rig, bone):
    """Rigidly binds a prop to one bone: a vertex group named after the bone plus an armature modifier."""
    bpy.context.view_layer.update()
    vg = o.vertex_groups.new(name=bone); vg.add(list(range(len(o.data.vertices))), 1.0, 'REPLACE')
    mw = o.matrix_world.copy(); o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted(); o.matrix_world = mw
    m = o.modifiers.new('rig', 'ARMATURE'); m.object = rig
HERO = {'gender': 1.0, 'age': 0.62, 'muscle': 0.7, 'weight': 0.42, 'height': 0.45, 'race': 'caucasian', 'skin': 'middleage_caucasian_male',
        'clothes': ['elvs_crude_t-shirt_male', 'cortu_jeans_shorts', 'shoes02']}
OTHERS = [
    {'gender': 1.0, 'age': 0.55, 'muscle': 0.6, 'weight': 0.5, 'height': 0.55, 'race': 'african', 'skin': 'young_african_male', 'clothes': ['namuhekam_male_polo_shirt', 'cortu_jeans_shorts', 'shoes04'], 'pack': (0.1, 0.25, 0.6)},
    {'gender': 0.0, 'age': 0.5, 'muscle': 0.6, 'weight': 0.4, 'height': 0.5, 'race': 'caucasian', 'skin': 'young_caucasian_female', 'hair': 'ponytail01', 'clothes': ['female_sportsuit01', 'shoes03'], 'pack': (0.85, 0.6, 0.1)},
    {'gender': 1.0, 'age': 0.6, 'muscle': 0.55, 'weight': 0.55, 'height': 0.4, 'race': 'asian', 'skin': 'young_asian_male', 'clothes': ['elvs_crude_t-shirt_male', 'cortu_cargo_pants', 'shoes02'], 'pack': (0.15, 0.45, 0.2)},
]
def act(h, clip, **kw):
    human.retarget_bvh(h['rig'], MOCAP(clip), frames=NF, fps=FPS, **kw); return h['rig']
def hip(rig, f):
    scene.frame_set(f); return (rig.matrix_world @ rig.pose.bones['Hips'].head).copy()

# ------------------------------------------------------------------ set pieces
SHRINE = Vector((0, 46, 0)) if not INTERIOR else Vector((0, 0, 0))
if 'shrine' in SETS:
    plaster = pbr('Plaster', (0.83, 0.76, 0.62), 0.9, noise_amt=0.35, scale=2.5, bump=0.3)
    W, D, HH, T = 5.0, 5.0, 3.2, 0.35; X, Y = SHRINE.x, SHRINE.y
    box('WallBack', (W, T, HH), (X, Y + D / 2, HH / 2), plaster); box('WallL', (T, D, HH), (X - W / 2, Y, HH / 2), plaster); box('WallR', (T, D, HH), (X + W / 2, Y, HH / 2), plaster)
    box('FrontL', (1.9, T, HH), (X - 1.55, Y - D / 2, HH / 2), plaster); box('FrontR', (1.9, T, HH), (X + 1.55, Y - D / 2, HH / 2), plaster); box('Lintel', (1.3, T, 1.0), (X, Y - D / 2, HH - 0.5), plaster)
    box('Roof', (W + 0.3, D + 0.3, 0.3), (X, Y, HH + 0.15), plaster)
    dome = obj('Dome', bpy.ops.mesh.primitive_uv_sphere_add, plaster, (X, Y, HH + 0.3), scale=(1.7, 1.7, 1.5), smooth=True, radius=1.0, segments=48, ring_count=24)
    import bmesh as _bm
    b_ = _bm.new(); b_.from_mesh(dome.data); _bm.ops.delete(b_, geom=[v for v in b_.verts if v.co.z < -0.01], context='VERTS'); b_.to_mesh(dome.data); b_.free()
    box('Ceiling', (W, D, 0.04), (X, Y, HH - 0.02), pbr('Soot', (0.12, 0.09, 0.07), 0.95, noise_amt=0.5, scale=5, bump=0.4))
    box('Floor', (W, D, 0.06), (X, Y, 0.0), pbr('Dirt', (0.42, 0.3, 0.2), 0.95, noise_amt=0.4, scale=6, bump=0.4))
    for k in range(5): box('Beam', (W, 0.16, 0.16), (X, Y - 1.8 + k * 0.9, HH - 0.12), pbr('Beam', (0.16, 0.1, 0.06), 0.9, noise_amt=0.4, scale=20, bump=0.3))
if 'bats' in SETS:
    fur = pbr('BatFur', (0.05, 0.035, 0.03), 0.95, bump=0.5, scale=400); wing = pbr('BatWing', (0.03, 0.022, 0.02), 0.6)
    rs = random.Random(5)
    for k in range(40):
        bx, by = SHRINE.x + rs.uniform(-1.9, 1.9), SHRINE.y + rs.uniform(-1.9, 1.9); s_ = rs.uniform(1.9, 2.7); top = 3.2 - 0.05
        root = bpy.data.objects.new('Bat', None); scene.collection.objects.link(root); root.location = (bx, by, top); root.rotation_euler = (0, 0, rs.uniform(0, 6.28))
        body = obj('BatBody', bpy.ops.mesh.primitive_uv_sphere_add, fur, (0, 0, -0.085 * s_), scale=(0.032 * s_, 0.028 * s_, 0.07 * s_), smooth=True, radius=1, segments=16, ring_count=10); body.parent = root
        head = obj('BatHead', bpy.ops.mesh.primitive_uv_sphere_add, fur, (0, -0.008, -0.165 * s_), scale=(0.022 * s_,) * 3, smooth=True, radius=1, segments=12, ring_count=8); head.parent = root
        for sx in (-1, 1):
            w = obj('BatWing', bpy.ops.mesh.primitive_uv_sphere_add, wing, (sx * 0.028 * s_, 0, -0.09 * s_), (0, 0, sx * 0.5), (0.012 * s_, 0.034 * s_, 0.075 * s_), smooth=True, radius=1, segments=12, ring_count=8); w.parent = root
            e = obj('BatEar', bpy.ops.mesh.primitive_cone_add, fur, (sx * 0.012 * s_, 0, -0.19 * s_), (math.pi, 0, 0), (1, 1, 1), radius1=0.008 * s_, depth=0.022 * s_, vertices=8); e.parent = root
        ph = rs.uniform(0, 6.28)
        for f in range(1, NF + 1, 4):
            root.rotation_euler = (0.07 * math.sin(f * 0.21 + ph), 0.06 * math.sin(f * 0.17 + ph * 2), root.rotation_euler.z); root.keyframe_insert('rotation_euler', frame=f)
if 'camp' in SETS:
    cloth = pbr('TentCloth', (0.2, 0.13, 0.085), 0.95, noise_amt=0.4, scale=8, bump=0.4); pole = pbr('Pole', (0.25, 0.17, 0.1), 0.8)
    import bmesh
    def tent(cx, cy, rot, w=7.0, d=4.0, hgt=2.1):
        me = bpy.data.meshes.new('Tent'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=14, y_segments=8, size=0.5)
        for v in bm.verts:
            u, v_ = v.co.x * 2, v.co.y * 2      # -1..1
            v.co.x = u * w / 2; v.co.y = v_ * d / 2
            v.co.z = hgt * (1 - abs(v_) ** 1.5) * (0.82 + 0.18 * math.cos(u * math.pi * 2.5)) * (1 - 0.25 * abs(u) ** 3)
        bm.to_mesh(me); bm.free(); me.materials.append(cloth)
        for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new('Tent', me); scene.collection.objects.link(o); o.location = (cx, cy, 0); o.rotation_euler = (0, 0, rot)
        so = o.modifiers.new('solid', 'SOLIDIFY'); so.thickness = 0.03
        for k in (-0.8, -0.4, 0, 0.4, 0.8):
            pl = obj('Pole', bpy.ops.mesh.primitive_cylinder_add, pole, (0, 0, 0), radius=0.035, depth=hgt * 1.1, vertices=8); pl.parent = o; pl.location = (k * w / 2, 0, hgt * 0.5)
    CAMP = Vector((0, 34, 0)) if SHOT == 'N1' else Vector((3.5, 6.0, 0))
    tent(CAMP.x - 4, CAMP.y + 2, 0.15); tent(CAMP.x + 6, CAMP.y + 7, -0.3, 6, 3.6, 1.9); tent(CAMP.x - 9, CAMP.y + 10, 0.5, 5.5, 3.5, 1.8)
    rug = box('Rug', (2.4, 1.5, 0.02), (CAMP.x + 0.5, CAMP.y - 2.2, 0.012), pbr('Rug', (0.5, 0.1, 0.08), 0.95, noise_amt=0.5, scale=40))
    for k, (px, py) in enumerate(((2.2, -1.0), (2.6, -1.3), (2.0, -1.6))):
        obj('Pot', bpy.ops.mesh.primitive_uv_sphere_add, pbr('Clay', (0.45, 0.25, 0.14), 0.8), (CAMP.x + px, CAMP.y + py, 0.16), scale=(0.16, 0.16, 0.19), smooth=True, radius=1, segments=16, ring_count=10)
if 'storm' in SETS:
    sm = bpy.data.materials.new('StormWall'); nt, N, L = nodes_of(sm)
    out = N.new('ShaderNodeOutputMaterial'); mixs = N.new('ShaderNodeMixShader'); tr = N.new('ShaderNodeBsdfTransparent'); df = N.new('ShaderNodeBsdfDiffuse'); em = N.new('ShaderNodeEmission'); ad = N.new('ShaderNodeAddShader')
    g = N.new('ShaderNodeNewGeometry'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.012; nz.inputs['Detail'].default_value = 10; nz.inputs['Roughness'].default_value = 0.62
    L.new(g.outputs['Position'], nz.inputs['Vector'])
    ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.38; ramp.color_ramp.elements[0].color = (0.13, 0.07, 0.03, 1); ramp.color_ramp.elements[1].position = 0.62; ramp.color_ramp.elements[1].color = (0.75, 0.5, 0.27, 1)
    L.new(nz.outputs['Fac'], ramp.inputs[0]); L.new(ramp.outputs[0], df.inputs['Color']); L.new(ramp.outputs[0], em.inputs['Color']); em.inputs['Strength'].default_value = 0.35
    L.new(df.outputs[0], ad.inputs[0]); L.new(em.outputs[0], ad.inputs[1])
    sep = N.new('ShaderNodeSeparateXYZ'); L.new(g.outputs['Position'], sep.inputs[0])
    hgt = N.new('ShaderNodeMapRange'); hgt.inputs['From Min'].default_value = 20; hgt.inputs['From Max'].default_value = 120; hgt.inputs['To Min'].default_value = 1.0; hgt.inputs['To Max'].default_value = 0.0
    L.new(sep.outputs['Z'], hgt.inputs['Value'])
    sub = N.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; L.new(hgt.outputs[0], sub.inputs[0])
    nm2 = N.new('ShaderNodeMath'); nm2.operation = 'MULTIPLY'; nm2.inputs[1].default_value = 0.9; L.new(nz.outputs['Fac'], nm2.inputs[0])
    off = N.new('ShaderNodeMath'); off.operation = 'SUBTRACT'; off.inputs[1].default_value = 0.45; L.new(nm2.outputs[0], off.inputs[0]); L.new(off.outputs[0], sub.inputs[1])
    edge = N.new('ShaderNodeMapRange'); edge.inputs['From Min'].default_value = 0.0; edge.inputs['From Max'].default_value = 0.25; L.new(sub.outputs[0], edge.inputs['Value'])
    L.new(edge.outputs[0], mixs.inputs['Fac']); L.new(tr.outputs[0], mixs.inputs[1]); L.new(ad.outputs[0], mixs.inputs[2]); L.new(mixs.outputs[0], out.inputs['Surface'])
    wall = obj('StormWall', bpy.ops.mesh.primitive_plane_add, sm, (0, 300, 100), (math.pi / 2, 0, 0), (1, 1, 1), size=1); wall.scale = (1600, 260, 1)
    wall.keyframe_insert('location', frame=1); wall.location = (0, 95, 100); wall.keyframe_insert('location', frame=NF)

# ------------------------------------------------------------------ the shots: actors and camera
cam_data = bpy.data.cameras.new('Cam'); cam_data.sensor_width = 36; cam_data.clip_start = 0.03; cam_data.clip_end = 20000
cam = bpy.data.objects.new('Cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam; cam_data.dof.use_dof = True
def shoot(fn, step=2):
    """fn(f, k) -> (position, target, lens, f-stop, focus point or None)."""
    for f in list(range(1, NF + 1, step)) + [NF]:
        k = (f - 1) / max(1, NF - 1); p, q, lens, fstop, foc = fn(f, k)
        p, q = Vector(p), Vector(q); cam.location = p; cam.rotation_euler = (q - p).to_track_quat('-Z', 'Y').to_euler()
        cam_data.lens = lens; cam_data.dof.aperture_fstop = fstop; cam_data.dof.focus_distance = ((Vector(foc) if foc is not None else q) - p).length
        cam.keyframe_insert('location', frame=f); cam.keyframe_insert('rotation_euler', frame=f); cam_data.keyframe_insert('lens', frame=f); cam_data.dof.keyframe_insert('focus_distance', frame=f)
ease = lambda k: k * k * (3 - 2 * k)
lerp = lambda a, b, k: Vector(a) + (Vector(b) - Vector(a)) * k
UP = lambda z: Vector((0, 0, z))

if SHOT in ('H1', 'H2'):
    hero = act(runner(HERO), '91_09', src_start=6.0 + (3.6 if SHOT == 'H2' else 0), origin=(0, 13 if SHOT == 'H1' else 4, 0), heading_deg=0)
    if SHOT == 'H1': shoot(lambda f, k: ((0.5, -3.5, 0.75), hip(hero, f) + UP(0.3), 135, 2.8, hip(hero, f)))
    else: shoot(lambda f, k: (lerp((34, -46, 30), (38, -52, 36), k), hip(hero, f), 30, 8, None))
elif SHOT == 'H3':
    shoot(lambda f, k: (lerp((0.7, -0.9, 1.9), (0.45, -0.5, 2.25), ease(k)), lerp((0, 0.3, 3.0), (-0.2, 0.5, 3.0), k), 30, 2.0, (0, 0.2, 2.95)))
elif SHOT in ('R1', 'P1'):
    hero = act(runner(HERO), '35_18', src_start=0.1, loop=True, speed=0.8 if SHOT == 'R1' else 0.5, origin=(-6, 0, 0) if SHOT == 'R1' else (0, 12, 0), heading_deg=90 if SHOT == 'R1' else 0)
    spots = ((-9.5, 1.6), (-12.5, -1.2), (-3.0, 2.6)) if SHOT == 'R1' else ((1.8, 17), (-1.6, 21), (0.6, 26))
    for sp_, (ox, oy), cl in zip(OTHERS, spots, ('09_02', '16_46', '35_18')):
        act(runner(sp_), cl, src_start=0.1, loop=True, speed=0.8 if SHOT == 'R1' else 0.5, origin=(ox, oy, 0), heading_deg=90 if SHOT == 'R1' else 0)
    if SHOT == 'R1': shoot(lambda f, k: (hip(hero, f) + Vector((-1.5 + 2.5 * k, -8.5, -0.25)), hip(hero, f) + Vector((-2.0, 0, 0.1)), 40, 4.0, hip(hero, f)))
    else: shoot(lambda f, k: (lerp((1.6, -2.2, 0.55), (1.1, -2.0, 0.6), k), hip(hero, f) + UP(0.25), 90, 2.0, hip(hero, f)))
elif SHOT == 'R2':
    hero = act(runner(HERO), '35_18', src_start=0.1, loop=True, speed=0.55, origin=(0, 11, 0), heading_deg=0)
    act(runner(OTHERS[0]), '09_02', src_start=0.1, loop=True, speed=0.55, origin=(2.2, 19, 0), heading_deg=0)
    shoot(lambda f, k: ((-0.7, -1.6, 0.45), hip(hero, f) + UP(0.3), 85, 2.0, hip(hero, f)))
elif SHOT == 'S1':
    hero = act(runner(HERO), '35_18', src_start=0.1, loop=True, speed=0.75, origin=(0, 9, 0), heading_deg=0)
    shoot(lambda f, k: (lerp((1.4, -3.0, 1.0), (1.0, -3.6, 0.9), k), hip(hero, f) + UP(0.9), 30, 5.6, hip(hero, f)))
elif SHOT == 'S2':
    hero = act(runner(HERO), '77_01', src_start=1.9, origin=(0, 2.0, 0), heading_deg=0)
    shoot(lambda f, k: (lerp((1.6, -2.2, 1.1), (1.2, -1.8, 1.0), k), hip(hero, f) + UP(0.15), 45, 2.8, hip(hero, f)))
elif SHOT == 'A1':
    hero = act(runner(HERO), '91_09', src_start=0.4, origin=(0, 0, 0), heading_deg=0)
    shoot(lambda f, k: (Vector((7.5 * math.sin(-0.5 + 0.9 * ease(k)), -7.5 * math.cos(-0.5 + 0.9 * ease(k)), 2.4 + 2.2 * k)), hip(hero, f) + UP(0.1), 32, 5.6, hip(hero, f)))
elif SHOT == 'W1':
    h = runner(HERO); hero = h['rig']
    bpy.context.view_layer.update(); hand = hero.matrix_world @ hero.data.bones['RightHand'].tail_local
    bottle = obj('Bottle', bpy.ops.mesh.primitive_cylinder_add, pbr('BottlePlastic', (0.75, 0.85, 0.9), 0.15), (hand.x, hand.y - 0.03, hand.z - 0.02), (math.radians(60), 0, math.radians(30)), radius=0.03, depth=0.19, vertices=20, smooth=True)
    cap = obj('BottleCap', bpy.ops.mesh.primitive_cylinder_add, pbr('Cap', (0.1, 0.3, 0.7), 0.4), (0, 0, 0), radius=0.016, depth=0.03, vertices=12); cap.parent = bottle; cap.location = (0, 0, 0.11)
    attach(bottle, hero, 'RightHand')
    act(h, '13_09', src_start=2.3, origin=(0, 0, 0), heading_deg=20)
    shoot(lambda f, k: (lerp((1.5, -3.6, 1.35), (1.1, -3.1, 1.4), ease(k)), (hero.matrix_world @ hero.pose.bones['Neck'].head) if not scene.frame_set(f) else 0, 60, 2.8, None))
elif SHOT == 'M1':
    hero = act(runner(HERO), '91_14', src_start=3.0, origin=(0.6, 6, 0), heading_deg=180)
    shoot(lambda f, k: (lerp((2.4, -1.5, 1.5), (2.0, 0.2, 1.4), ease(k)), lerp(hip(hero, f) + UP(0.4), SHRINE + UP(1.8), 0.55), 28, 8, hip(hero, f)))
elif SHOT == 'M2':
    shoot(lambda f, k: (lerp((1.1, -1.3, 1.3), (0.4, -0.5, 1.9), ease(k)), lerp((-0.5, 0.5, 3.0), (0.1, 0.2, 3.0), k), 24, 2.8, (0, 0.2, 2.9)))
elif SHOT == 'M3':
    hero = act(runner(HERO), '13_10', src_start=1.4, origin=(0, 0.2, 0), heading_deg=180)
    shoot(lambda f, k: (lerp((1.7, 1.9, 0.7), (1.4, 1.8, 0.9), ease(k)), (0, 0.1, 1.75), 24, 2.8, (0, 0.2, 1.6)))
elif SHOT == 'D1':
    hero = act(runner(HERO, extras=False), '91_14', src_start=3.0, origin=(-2.2, 0, 0), heading_deg=90)
    shoot(lambda f, k: (hip(hero, f) + Vector((0.8, -6.5, -0.55)), hip(hero, f) + Vector((0.3, 0, -0.05)), 50, 2.8, hip(hero, f)))
elif SHOT == 'D2':
    hero = act(runner(HERO, extras=False), '91_14', src_start=9.0, origin=(-1.3, 14, 0), heading_deg=90)
    shoot(lambda f, k: ((0, -16, 0.45), hip(hero, f) + Vector((0.3, 0, 0.75)), 120, 4, hip(hero, f)))
elif SHOT == 'N1':
    hero = act(runner(HERO, extras=False), '13_26', src_start=3.2, origin=(0.2, 0, 0), heading_deg=180)
    act(runner(OTHERS[1] | {'clothes': ['toigo_fisherman_sweater', 'toigo_harem_pants', 'shoes01'], 'hair': 'long01'}, extras=False), '91_10', src_start=2.0, origin=(1.5, 30.5, 0), heading_deg=0)
    shoot(lambda f, k: (lerp((1.0, -3.6, 1.75), (0.8, -3.0, 1.7), ease(k)), lerp((0.15, 6, 1.25), (0.15, 8, 1.25), k), 32, 4, hip(hero, f)))
elif SHOT == 'K1':
    box('Crate', (0.6, 0.5, 0.42), (0, 0.05, 0.21), pbr('Crate', (0.3, 0.2, 0.12), 0.9, noise_amt=0.4, scale=25, bump=0.3))
    hero = act(runner(HERO, extras=False), '22_03', src_start=1.2, speed=0.5, origin=(0, 0, 0), heading_deg=-25, ground_lock=False)
    shoot(lambda f, k: (lerp((-2.6, -4.2, 1.25), (-2.0, -3.3, 1.1), ease(k)), hip(hero, f) + UP(0.25), 55, 2.8, hip(hero, f)))
elif SHOT == 'P2':
    hero = act(runner(HERO), '35_18', src_start=0.1, loop=True, speed=0.6, origin=(0, 2.5, 0), heading_deg=180)
    act(runner(OTHERS[0]), '09_02', src_start=0.1, loop=True, speed=0.6, origin=(-2.4, 8, 0), heading_deg=180)
    act(runner(OTHERS[2]), '16_46', src_start=0.1, loop=True, speed=0.6, origin=(2.6, 13, 0), heading_deg=180)
    shoot(lambda f, k: (lerp((0.3, -2.0, 0.5), (0.3, -2.0, 0.9), ease(k)), hip(hero, f) + UP(0.35), 50, 4, hip(hero, f)))

if INTERIOR:      # daylight through the doorway, a little bounce
    ar = bpy.data.lights.new('Door', 'AREA'); ar.size = 1.2; ar.size_y = 2.2; ar.energy = 70; ar.color = (1.0, 0.9, 0.75)
    ao = bpy.data.objects.new('Door', ar); ao.location = (0, -2.9, 1.2); ao.rotation_euler = (math.radians(90), 0, 0); scene.collection.objects.link(ao)
    fill = bpy.data.lights.new('Fill', 'POINT'); fill.energy = 4; fill.color = (1.0, 0.75, 0.5); fill.shadow_soft_size = 1.0
    fo = bpy.data.objects.new('Fill', fill); fo.location = (0, 0.5, 0.6); scene.collection.objects.link(fo)
    scene.view_settings.exposure = 0.0

# ------------------------------------------------------------------ haze, glow, vignette
scene.use_nodes = True; ct = scene.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
hz = ct.nodes.new('CompositorNodeMixRGB'); hz.inputs[2].default_value = (*HAZE, 1)
amt = ct.nodes.new('CompositorNodeMath'); amt.operation = 'MULTIPLY'; amt.inputs[1].default_value = 0.0 if INTERIOR else (0.97 if S['haze'] < 100 else 0.8)
ct.links.new(rl.outputs['Mist'], amt.inputs[0]); ct.links.new(rl.outputs['Image'], hz.inputs[1])
if S['haze'] < 100: ct.links.new(amt.outputs[0], hz.inputs[0])                 # inside the storm everything is swallowed, sky included
else:                                                                          # otherwise haze the land only; the sky has its own dust
    near = ct.nodes.new('CompositorNodeMath'); near.operation = 'LESS_THAN'; near.inputs[1].default_value = 15000.0; ct.links.new(rl.outputs['Depth'], near.inputs[0])
    gate = ct.nodes.new('CompositorNodeMath'); gate.operation = 'MULTIPLY'; ct.links.new(amt.outputs[0], gate.inputs[0]); ct.links.new(near.outputs[0], gate.inputs[1]); ct.links.new(gate.outputs[0], hz.inputs[0])
g = ct.nodes.new('CompositorNodeGlare'); g.glare_type = 'FOG_GLOW'; g.quality = 'HIGH'
g.inputs['Threshold'].default_value = 4.0; g.inputs['Strength'].default_value = 0.3; g.inputs['Size'].default_value = 0.8; ct.links.new(hz.outputs[0], g.inputs['Image'])
vig = ct.nodes.new('CompositorNodeEllipseMask'); vig.width = 1.15; vig.height = 1.05
bl = ct.nodes.new('CompositorNodeBlur'); bl.size_x = bl.size_y = 200; bl.filter_type = 'GAUSS'; ct.links.new(vig.outputs[0], bl.inputs['Image'])
mr = ct.nodes.new('CompositorNodeMapRange'); mr.inputs['To Min'].default_value = 0.68; mr.inputs['To Max'].default_value = 1.0; ct.links.new(bl.outputs[0], mr.inputs['Value'])
mx = ct.nodes.new('CompositorNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1
ct.links.new(g.outputs['Image'], mx.inputs[1]); ct.links.new(mr.outputs[0], mx.inputs[2]); ct.links.new(mx.outputs[0], comp.inputs['Image'])

outdir = os.path.join(HERE, 'out', 'plates', SHOT); os.makedirs(outdir, exist_ok=True)
if 'still' in opt:
    f = int(opt['still']); scene.frame_set(f); scene.render.filepath = os.path.join(HERE, 'out', f'{SHOT}_{f:03d}.png')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'RENDERED {SHOT} {f} in {time.time() - t0:.1f}s')
if 'anim' in opt:
    scene.render.filepath = os.path.join(outdir, 'f'); scene.render.use_overwrite = False
    t0 = time.time(); bpy.ops.render.render(animation=True); print(f'RENDERED {SHOT}: {NF} frames in {time.time() - t0:.1f}s', flush=True)
