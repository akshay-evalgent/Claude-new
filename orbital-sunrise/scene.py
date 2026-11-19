"""Orbital Sunrise: a photoreal Cycles shot of sunrise seen from the ISS.

Run with Blender 4.5 LTS:
  blender -b -P scene.py -- --still 120 --pct 50 --samples 32     # one test frame
  blender -b -P scene.py -- --anim 1 336                           # frames 1..336 to out/frames/
"""
import bpy, math, sys, os, time
from mathutils import Vector, Euler, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
A = lambda f: os.path.join(HERE, 'assets', f)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = {}
i = 0
while i < len(args):
    k = args[i].lstrip('-'); v = args[i + 1:i + 3] if k == 'anim' else args[i + 1]
    opt[k] = v; i += 3 if k == 'anim' else 2

FPS, FRAMES = 24, 336
R = 6_371_000.0            # Earth radius, metres
ALT = 420_000.0            # ISS altitude
EARTH_C = Vector((0, 0, -(R + ALT)))
DIP = math.degrees(math.acos(R / (R + ALT)))   # how far the horizon sits below level, ~20.6 deg

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = FRAMES
scene.unit_settings.scale_length = 1.0


# ------------------------------------------------------------------ helpers
def nodes_of(mat):
    mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear(); return nt, nt.nodes, nt.links


def key_vec(socket, frames_vals):
    for f, v in frames_vals:
        socket.default_value = v; socket.keyframe_insert('default_value', frame=f)


def sun_dir(frame):
    """Sun direction (towards the sun) in the station's frame. It climbs through the horizon as the orbit carries us east."""
    t = (frame - 1) / FPS
    elev = -DIP - 2.6 + 0.62 * t          # crosses the limb at about t = 4.2 s, 2 deg clear by t = 7.4 s
    az = math.radians(8.0)
    e = math.radians(elev)
    return Vector((math.cos(e) * math.cos(az), math.cos(e) * math.sin(az), math.sin(e))).normalized()


def smooth(a, b, x):
    x = max(0.0, min(1.0, (x - a) / (b - a))); return x * x * (3 - 2 * x)


# ------------------------------------------------------------------ render settings
scene.render.engine = 'CYCLES'
cy = scene.cycles
cy.device = 'CPU'
cy.samples = int(opt.get('samples', 64)); cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 4; cy.diffuse_bounces = 1; cy.glossy_bounces = 1; cy.transmission_bounces = 2; cy.transparent_max_bounces = 8
cy.caustics_reflective = cy.caustics_refractive = False
cy.blur_glossy = 1.0
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = int(opt.get('pct', 100))
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.render.film_transparent = False
scene.render.use_persistent_data = True
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'
scene.view_settings.exposure = 0.0
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_depth = '8'

# ------------------------------------------------------------------ world: black space with faint stars
world = bpy.data.worlds.new('Space'); scene.world = world
nt, N, L = nodes_of(world)
out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground'); L.new(bg.outputs[0], out.inputs[0])
tc = N.new('ShaderNodeTexCoord'); vor = N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 900
vor.feature = 'F1'
L.new(tc.outputs['Generated'] if False else tc.outputs['Window'], vor.inputs['Vector']) if False else None
vdir = N.new('ShaderNodeVectorMath'); vdir.operation = 'NORMALIZE'
lp = N.new('ShaderNodeNewGeometry')
L.new(lp.outputs['Incoming'], vdir.inputs[0]); L.new(vdir.outputs[0], vor.inputs['Vector'])
ramp = N.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.0; ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
ramp.color_ramp.elements[1].position = 0.035; ramp.color_ramp.elements[1].color = (0, 0, 0, 1)
L.new(vor.outputs['Distance'], ramp.inputs[0])
bright = N.new('ShaderNodeMath'); bright.operation = 'MULTIPLY'; L.new(ramp.outputs[0], bright.inputs[0]); L.new(vor.outputs['Color'], bright.inputs[1]) if False else None
bright.inputs[1].default_value = 0.0
starA = N.new('ShaderNodeMath'); starA.operation = 'MULTIPLY'; L.new(ramp.outputs[0], starA.inputs[0]); starA.inputs[1].default_value = 0.05
L.new(starA.outputs[0], bg.inputs['Strength']); bg.inputs['Color'].default_value = (0.85, 0.9, 1.0, 1)
star_strength = starA.inputs[1]

# ------------------------------------------------------------------ the sun: a lamp for light, a disc for the camera
sun_data = bpy.data.lights.new('Sun', 'SUN'); sun_data.energy = 4.5; sun_data.angle = math.radians(0.53); sun_data.color = (1.0, 0.98, 0.95)
sun = bpy.data.objects.new('Sun', sun_data); scene.collection.objects.link(sun)
disc_mat = bpy.data.materials.new('SunDisc'); nt, N, L = nodes_of(disc_mat)
o = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 400.0; em.inputs['Color'].default_value = (1.0, 0.93, 0.82, 1)
L.new(em.outputs[0], o.inputs['Surface'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=1.0)
disc = bpy.context.object; disc.name = 'SunDisc'; disc.data.materials.append(disc_mat)
disc.visible_shadow = False; disc.visible_diffuse = False; disc.visible_glossy = False
SUN_DIST = 9.0e8; disc.scale = (SUN_DIST * math.tan(math.radians(0.27)),) * 3

# ------------------------------------------------------------------ Earth
def img(name, colorspace='sRGB'):
    im = bpy.data.images.load(A(name)); im.colorspace_settings.name = colorspace; return im


earth_mat = bpy.data.materials.new('Earth'); nt, N, L = nodes_of(earth_mat)
o = N.new('ShaderNodeOutputMaterial'); bsdf = N.new('ShaderNodeBsdfPrincipled'); add = N.new('ShaderNodeAddShader'); emi = N.new('ShaderNodeEmission')
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); L.new(tc.outputs['UV'], mp.inputs['Vector'])
day = N.new('ShaderNodeTexImage'); day.image = img('8k_earth_daymap.jpg'); day.interpolation = 'Linear'
night = N.new('ShaderNodeTexImage'); night.image = img('8k_earth_nightmap.jpg')
spec = N.new('ShaderNodeTexImage'); spec.image = img('8k_earth_specular_map.tif', 'Non-Color')
nrm = N.new('ShaderNodeTexImage'); nrm.image = img('8k_earth_normal_map.tif', 'Non-Color')
for t_ in (day, night, spec, nrm): L.new(mp.outputs[0], t_.inputs['Vector'])
# deepen the oceans and add a little saturation, as the map is quite flat
hsv = N.new('ShaderNodeHueSaturation'); hsv.inputs['Saturation'].default_value = 1.15; hsv.inputs['Value'].default_value = 0.9
L.new(day.outputs['Color'], hsv.inputs['Color']); L.new(hsv.outputs[0], bsdf.inputs['Base Color'])
rough = N.new('ShaderNodeMapRange'); rough.inputs['To Min'].default_value = 0.85; rough.inputs['To Max'].default_value = 0.32
L.new(spec.outputs['Color'], rough.inputs['Value']); L.new(rough.outputs[0], bsdf.inputs['Roughness'])
bsdf.inputs['Specular IOR Level'].default_value = 0.45
nmap = N.new('ShaderNodeNormalMap'); nmap.inputs['Strength'].default_value = 0.35; L.new(nrm.outputs['Color'], nmap.inputs['Color']); L.new(nmap.outputs[0], bsdf.inputs['Normal'])
# city lights only on the night side
geo = N.new('ShaderNodeNewGeometry'); sunv = N.new('ShaderNodeCombineXYZ')
dot = N.new('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; L.new(geo.outputs['Normal'], dot.inputs[0]); L.new(sunv.outputs[0], dot.inputs[1])
nightmask = N.new('ShaderNodeMapRange'); nightmask.inputs['From Min'].default_value = 0.06; nightmask.inputs['From Max'].default_value = -0.12
L.new(dot.outputs['Value'], nightmask.inputs['Value'])
lights = N.new('ShaderNodeMath'); lights.operation = 'POWER'; lights.inputs[1].default_value = 1.7
sep = N.new('ShaderNodeRGBToBW'); L.new(night.outputs['Color'], sep.inputs[0]); L.new(sep.outputs[0], lights.inputs[0])
lm = N.new('ShaderNodeMath'); lm.operation = 'MULTIPLY'; L.new(lights.outputs[0], lm.inputs[0]); L.new(nightmask.outputs[0], lm.inputs[1])
lstr = N.new('ShaderNodeMath'); lstr.operation = 'MULTIPLY'; lstr.inputs[1].default_value = 14.0; L.new(lm.outputs[0], lstr.inputs[0])
emi.inputs['Color'].default_value = (1.0, 0.62, 0.3, 1); L.new(lstr.outputs[0], emi.inputs['Strength'])
L.new(bsdf.outputs[0], add.inputs[0]); L.new(emi.outputs[0], add.inputs[1]); L.new(add.outputs[0], o.inputs['Surface'])
earth_sun_nodes = [sunv]

bpy.ops.mesh.primitive_uv_sphere_add(segments=512, ring_count=256, radius=R, location=EARTH_C)
earth = bpy.context.object; earth.name = 'Earth'; earth.data.materials.append(earth_mat)
bpy.ops.object.shade_smooth()

# clouds
cl_mat = bpy.data.materials.new('Clouds'); nt, N, L = nodes_of(cl_mat)
o = N.new('ShaderNodeOutputMaterial'); cb = N.new('ShaderNodeBsdfPrincipled'); cb.inputs['Base Color'].default_value = (0.92, 0.94, 0.97, 1); cb.inputs['Roughness'].default_value = 1.0
cb.inputs['Specular IOR Level'].default_value = 0.0
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); L.new(tc.outputs['UV'], mp.inputs['Vector']); mp.inputs['Location'].default_value[0] = 0.0
ct = N.new('ShaderNodeTexImage'); ct.image = img('8k_earth_clouds.jpg', 'Non-Color'); L.new(mp.outputs[0], ct.inputs['Vector'])
ca = N.new('ShaderNodeMapRange'); ca.inputs['From Min'].default_value = 0.22; ca.inputs['From Max'].default_value = 1.0
L.new(ct.outputs['Color'], ca.inputs['Value']); L.new(ca.outputs[0], cb.inputs['Alpha'])
L.new(cb.outputs[0], o.inputs['Surface'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=512, ring_count=256, radius=R + 9000, location=EARTH_C)
clouds = bpy.context.object; clouds.name = 'Clouds'; clouds.data.materials.append(cl_mat); bpy.ops.object.shade_smooth()

# atmosphere: a shell whose glow comes from the height at which each view ray grazes the planet,
# so it hugs the limb and thins out with altitude like the real thing (scale height ~8 km)
ATM_H = 100000.0
at_mat = bpy.data.materials.new('Atmosphere'); nt, N, L = nodes_of(at_mat)
o = N.new('ShaderNodeOutputMaterial'); tr = N.new('ShaderNodeBsdfTransparent'); ae = N.new('ShaderNodeEmission'); aa = N.new('ShaderNodeAddShader')
geo = N.new('ShaderNodeNewGeometry')
def m(op, a_=None, b_=None, v=None):
    n = N.new('ShaderNodeMath'); n.operation = op
    for k_, x in enumerate((a_, b_)):
        if x is None: continue
        if isinstance(x, (int, float)): n.inputs[k_].default_value = x
        else: L.new(x, n.inputs[k_])
    return n.outputs[0]
cdot = N.new('ShaderNodeVectorMath'); cdot.operation = 'DOT_PRODUCT'; L.new(geo.outputs['Normal'], cdot.inputs[0]); L.new(geo.outputs['Incoming'], cdot.inputs[1])
c = m('ABSOLUTE', cdot.outputs['Value'])
s_ = m('SQRT', m('SUBTRACT', 1.0, m('MULTIPLY', c, c)))
h = m('SUBTRACT', m('MULTIPLY', s_, R + ATM_H), R)                         # tangent height of the ray, metres
above = m('EXPONENT', m('DIVIDE', m('MAXIMUM', h, 0.0), -9000.0))          # rays that miss the ground: dense near the limb
below = m('MULTIPLY', m('EXPONENT', m('DIVIDE', m('MINIMUM', h, 0.0), 60000.0)), 0.035)   # rays that hit the ground: a thin haze
dens = m('MULTIPLY', m('ADD', m('MULTIPLY', above, m('GREATER_THAN', h, 0.0)), m('MULTIPLY', below, m('LESS_THAN', h, 0.0))), m('SUBTRACT', 1.0, geo.outputs['Backfacing']))
sunv2 = N.new('ShaderNodeCombineXYZ'); earth_sun_nodes.append(sunv2)
dot2 = N.new('ShaderNodeVectorMath'); dot2.operation = 'DOT_PRODUCT'; L.new(geo.outputs['Normal'], dot2.inputs[0]); L.new(sunv2.outputs[0], dot2.inputs[1])
lit = N.new('ShaderNodeMapRange'); lit.inputs['From Min'].default_value = -0.3; lit.inputs['From Max'].default_value = 0.15; L.new(dot2.outputs['Value'], lit.inputs['Value'])
warm = N.new('ShaderNodeMapRange'); warm.inputs['From Min'].default_value = -0.22; warm.inputs['From Max'].default_value = 0.2; L.new(dot2.outputs['Value'], warm.inputs['Value'])
cr = N.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (0.9, 0.18, 0.03, 1); cr.color_ramp.elements[1].color = (0.12, 0.38, 1.0, 1)
el = cr.color_ramp.elements.new(0.42); el.color = (1.0, 0.62, 0.3, 1)
hr = N.new('ShaderNodeValToRGB')                      # layered limb: red at the bottom, then gold, then blue
hr.color_ramp.elements[0].position = 0.0; hr.color_ramp.elements[0].color = (1.0, 0.16, 0.02, 1)
hr.color_ramp.elements[1].position = 0.55; hr.color_ramp.elements[1].color = (0.1, 0.32, 1.0, 1)
e2 = hr.color_ramp.elements.new(0.2); e2.color = (1.0, 0.55, 0.15, 1)
L.new(m('DIVIDE', m('MAXIMUM', h, 0.0), 45000.0), hr.inputs[0])
day_ = N.new('ShaderNodeMix'); day_.data_type = 'RGBA'; L.new(warm.outputs[0], day_.inputs['Factor']); L.new(hr.outputs[0], day_.inputs['A']); L.new(cr.outputs[0], day_.inputs['B'])
L.new(day_.outputs['Result'], ae.inputs['Color'])
vd = N.new('ShaderNodeVectorMath'); vd.operation = 'DOT_PRODUCT'; L.new(geo.outputs['Incoming'], vd.inputs[0]); L.new(sunv2.outputs[0], vd.inputs[1])
fwd = m('ADD', m('MULTIPLY', m('POWER', m('MAXIMUM', m('MULTIPLY', vd.outputs['Value'], -1.0), 0.0), 14.0), 9.0), 0.35)   # Mie-like forward glow near the sun
L.new(m('MULTIPLY', m('MULTIPLY', m('MULTIPLY', dens, lit.outputs[0]), fwd), 2.2), ae.inputs['Strength'])
L.new(tr.outputs[0], aa.inputs[0]); L.new(ae.outputs[0], aa.inputs[1]); L.new(aa.outputs[0], o.inputs['Surface'])
bpy.ops.mesh.primitive_uv_sphere_add(segments=512, ring_count=256, radius=R + ATM_H, location=EARTH_C)
atmo = bpy.context.object; atmo.name = 'Atmosphere'; atmo.data.materials.append(at_mat); bpy.ops.object.shade_smooth()
atmo.visible_shadow = False; atmo.visible_diffuse = False; atmo.visible_glossy = False
for ob in (earth, clouds, atmo, disc):
    ob.cycles.use_motion_blur = False      # their motion within one frame is invisible; skipping it keeps the BVH cheap

# Put a real place under the station. The UV sphere's texture axes are read from its own UVs,
# then the globe is turned so that point is straight below us with east pointing along +X (toward the sunrise).
def uv_axes(ob):
    me = ob.data; uvl = me.uv_layers.active.data; best = {}
    want = {'lon0': (0.5, 0.5), 'lon90': (0.75, 0.5), 'north': (0.5, 1.0)}
    for poly in me.polygons:
        for li in poly.loop_indices:
            u, v = uvl[li].uv; co = me.vertices[me.loops[li].vertex_index].co
            for k_, (wu, wv) in want.items():
                d = (u - wu) ** 2 + (v - wv) ** 2
                if k_ not in best or d < best[k_][0]: best[k_] = (d, co.normalized())
    return best['lon0'][1], best['lon90'][1], best['north'][1]
AX0, AX90, AXN = uv_axes(earth)
def local_dir(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return (math.cos(la) * (math.cos(lo) * AX0 + math.sin(lo) * AX90) + math.sin(la) * AXN).normalized()
def orient(lat, lon, heading_deg):
    up = local_dir(lat, lon); north = (AXN - AXN.dot(up) * up).normalized(); east = north.cross(up).normalized()
    h = math.radians(heading_deg); fwd = (math.sin(h) * east + math.cos(h) * north).normalized(); side = up.cross(fwd).normalized()
    local = Matrix((fwd, side, up)).transposed()            # columns: forward, left, up in the sphere's own space
    return (local.inverted()).to_quaternion()                # rotation taking them to world +X, +Y, +Z
LAT0, LON0, HEADING = float(opt.get('lat', 27.0)), float(opt.get('lon', 49.0)), 62.0   # over the Persian Gulf, flying ENE toward India
ORBIT = 0.05     # radians the planet turns under us during the shot (about 3x real speed, so the ground visibly moves)
for ob in (earth, clouds):
    ob.rotation_mode = 'QUATERNION'
    for f, extra in ((1, 0.0), (FRAMES, ORBIT)):
        q = orient(LAT0, LON0, HEADING)
        ob.rotation_quaternion = (Matrix.Rotation(-extra * (1.0 if ob is earth else 0.996), 4, 'Y').to_quaternion() @ q)
        ob.keyframe_insert('rotation_quaternion', frame=f)
    for fc in ob.animation_data.action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'

# ------------------------------------------------------------------ the station (NASA model)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=A('iss_b.glb'))
iss_objs = [o_ for o_ in bpy.data.objects if o_ not in before]
for o_ in iss_objs:
    if o_.type == 'MESH' and (o_.matrix_world.translation.z > 30 or o_.name.startswith(('bendedtru', 'pCylinder'))):
        bpy.data.objects.remove(o_, do_unlink=True)
iss_objs = [o_ for o_ in bpy.data.objects if o_ not in before]
iss = bpy.data.objects.new('ISS', None); scene.collection.objects.link(iss)
for o_ in iss_objs:
    if o_.parent is None: o_.parent = iss
iss.scale = (2.4,) * 3                      # model units to metres: the truss is ~109 m long
iss.rotation_euler = (0, math.radians(28), 0)
iss.location = (0, 0, -9 * 2.4 * 0.5)

def mli_mat(name, base, rough, noise_scale=40.0, bump=0.15, metal=0.0):
    m = bpy.data.materials.new(name); nt, N, L = nodes_of(m)
    o = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], o.inputs['Surface'])
    b.inputs['Base Color'].default_value = (*base, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = noise_scale; nz.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    bm = N.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; L.new(nz.outputs['Fac'], bm.inputs['Height']); L.new(bm.outputs[0], b.inputs['Normal'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs['Factor'].default_value = 0.25
    mix.inputs['A'].default_value = (*base, 1); mix.inputs['B'].default_value = (base[0] * 0.8, base[1] * 0.8, base[2] * 0.78, 1)
    L.new(nz.outputs['Fac'], mix.inputs['Factor']); L.new(mix.outputs['Result'], b.inputs['Base Color'])
    return m

def array_mat():
    m = bpy.data.materials.new('SolarArray'); nt, N, L = nodes_of(m)
    o = N.new('ShaderNodeOutputMaterial'); b = N.new('ShaderNodeBsdfPrincipled'); L.new(b.outputs[0], o.inputs['Surface'])
    b.inputs['Metallic'].default_value = 0.35; b.inputs['Roughness'].default_value = 0.22; b.inputs['Coat Weight'].default_value = 0.6; b.inputs['Coat Roughness'].default_value = 0.08
    tc = N.new('ShaderNodeTexCoord'); br = N.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.2; br.inputs['Mortar Size'].default_value = 0.012
    br.offset = 0.0; br.inputs['Brick Width'].default_value = 0.42; br.inputs['Row Height'].default_value = 0.42
    br.inputs['Color1'].default_value = (0.32, 0.17, 0.05, 1); br.inputs['Color2'].default_value = (0.26, 0.13, 0.04, 1); br.inputs['Mortar'].default_value = (0.75, 0.72, 0.65, 1)
    L.new(tc.outputs['Object'], br.inputs['Vector']); L.new(br.outputs['Color'], b.inputs['Base Color'])
    return m

MLI = mli_mat('MLI', (0.66, 0.65, 0.61), 0.62)
METAL = mli_mat('TrussMetal', (0.62, 0.63, 0.65), 0.32, 120, 0.05, 0.85)
RAD = mli_mat('Radiator', (0.9, 0.9, 0.9), 0.35, 60, 0.03)
ARR = array_mat()
ROLE = {'lambert6SG.001': ARR, 'lambert7SG.001': ARR, 'lambert2SG.001': METAL, 'lambert3SG.001': METAL,
        'soyuz_blinn3SG.001': RAD, 'soyuz_blinn4SG.001': RAD}
for o_ in iss_objs:
    if o_.type != 'MESH': continue
    for s in o_.material_slots:
        if s.material: s.material = ROLE.get(s.material.name, MLI)
    for p in o_.data.polygons: p.use_smooth = True

# ------------------------------------------------------------------ camera: a single unbroken move
cam_data = bpy.data.cameras.new('Camera'); cam_data.sensor_width = 36.0; cam_data.clip_start = 0.5; cam_data.clip_end = 2.0e9
cam = bpy.data.objects.new('Camera', cam_data); scene.collection.objects.link(cam); scene.camera = cam
target = bpy.data.objects.new('Target', None); scene.collection.objects.link(target)
tt = cam.constraints.new('TRACK_TO'); tt.target = target; tt.track_axis = 'TRACK_NEGATIVE_Z'; tt.up_axis = 'UP_Y'
cam_data.dof.use_dof = True; cam_data.dof.aperture_fstop = 4.0

def horizon_point(dist, az_deg, below):
    e = math.radians(-below); a = math.radians(az_deg)
    return Vector((math.cos(e) * math.cos(a), math.sin(e) * 0 + math.cos(e) * math.sin(a), math.sin(e))) * dist

# (frame, camera position, target, focal length, focus distance)
SHOTS = [   # behind the station, looking along the orbit at the dawn; then turn to find the station against the sunrise
    (1,   Vector((-175, -95, 8)),  horizon_point(6000, -14, DIP - 4.0) + Vector((-175, -95, 8)), 30, 6000),
    (110, Vector((-168, -92, 7)),  horizon_point(6000, -6, DIP - 0.8) + Vector((-168, -92, 7)), 31, 6000),
    (215, Vector((-150, -84, 5)),  Vector((60, 0, -60)), 32, 170),
    (336, Vector((-132, -78, 3)),  Vector((25, 10, -34)), 36, 150),
]
for f, p, q, fl, fd in SHOTS:
    cam.location = p; cam.keyframe_insert('location', frame=f)
    target.location = q; target.keyframe_insert('location', frame=f)
    cam_data.lens = fl; cam_data.keyframe_insert('lens', frame=f)
    cam_data.dof.focus_distance = fd; cam_data.dof.keyframe_insert('focus_distance', frame=f)
for ob in (cam, target, cam_data):
    for fc in ob.animation_data.action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.easing = 'AUTO'

# the sun and every shader that needs its direction, keyed per frame
for f in range(1, FRAMES + 1, 4):
    d = sun_dir(f)
    sun.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); sun.keyframe_insert('rotation_euler', frame=f)
    disc.location = d * SUN_DIST; disc.keyframe_insert('location', frame=f)
    # the shader works in world space, where Earth is turning: use the direction in world space
    for n_ in earth_sun_nodes:
        for k_, comp in enumerate('XYZ'):
            n_.inputs[comp].default_value = d[k_]; n_.inputs[comp].keyframe_insert('default_value', frame=f)
    star_strength.default_value = 0.05 * (1 - smooth(3.5, 6.5, (f - 1) / FPS)); star_strength.keyframe_insert('default_value', frame=f)

# ------------------------------------------------------------------ compositor: lens bloom, streaks, a touch of dispersion and vignette
scene.use_nodes = True
ct = scene.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
def glare(kind, **inp):
    g = ct.nodes.new('CompositorNodeGlare'); g.glare_type = kind; g.quality = 'HIGH'
    for k_, v_ in inp.items(): g.inputs[k_].default_value = v_
    return g
g1 = glare('FOG_GLOW', Threshold=1.5, Strength=0.35, Size=0.7)
g2 = glare('STREAKS', Threshold=120.0, Strength=0.55, Streaks=6, **{'Streaks Angle': math.radians(12), 'Fade': 0.93})
ld = ct.nodes.new('CompositorNodeLensdist'); ld.inputs['Dispersion'].default_value = 0.012; ld.use_fit = True
ct.links.new(rl.outputs['Image'], g1.inputs['Image']); ct.links.new(g1.outputs['Image'], g2.inputs['Image']); ct.links.new(g2.outputs['Image'], ld.inputs['Image'])
vig = ct.nodes.new('CompositorNodeEllipseMask'); vig.width = 1.15; vig.height = 1.25
blur = ct.nodes.new('CompositorNodeBlur'); blur.size_x = blur.size_y = 200; blur.filter_type = 'GAUSS'
ct.links.new(vig.outputs[0], blur.inputs['Image'])
vmix = ct.nodes.new('CompositorNodeMixRGB'); vmix.blend_type = 'MULTIPLY'
mr = ct.nodes.new('CompositorNodeMapRange'); mr.inputs['To Min'].default_value = 0.62; mr.inputs['To Max'].default_value = 1.0
ct.links.new(blur.outputs[0], mr.inputs['Value']); ct.links.new(ld.outputs['Image'], vmix.inputs[1]); ct.links.new(mr.outputs[0], vmix.inputs[2])
vmix.inputs['Fac'].default_value = 1.0
ct.links.new(vmix.outputs[0], comp.inputs['Image'])

# ------------------------------------------------------------------ go
os.makedirs(os.path.join(HERE, 'out', 'frames'), exist_ok=True)
if 'blend' in opt:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, opt['blend']))
if 'far' in opt:
    scene.frame_set(int(opt['far'])); cam.constraints.clear(); cam.animation_data_clear(); cam_data.animation_data_clear(); cam_data.dof.use_dof = False; cam_data.lens = 50
    cam.location = EARTH_C + Vector(tuple(float(x) for x in opt.get('fardir', '2.2e7,0,0.6e7').split(','))); cam.rotation_euler = (EARTH_C - cam.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = os.path.join(HERE, 'out', 'far.png'); bpy.ops.render.render(write_still=True)
if 'still' in opt:
    f = int(opt['still']); scene.frame_set(f)
    scene.render.filepath = os.path.join(HERE, 'out', f'still_{f:04d}.png')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'RENDERED frame {f} in {time.time() - t0:.1f}s')
if 'anim' in opt:
    a, b = int(opt['anim'][0]), int(opt['anim'][1])
    if 'fast' in opt:
        scene.frame_start, scene.frame_end = a, b; scene.render.filepath = os.path.join(HERE, 'out', 'frames', 'f'); scene.render.use_overwrite = False
        t0 = time.time(); bpy.ops.render.render(animation=True); print(f'RENDERED {b - a + 1} frames in {time.time() - t0:.1f}s', flush=True); a = b + 1
    for f in range(a, b + 1):
        path = os.path.join(HERE, 'out', 'frames', f'f{f:04d}.png')
        if os.path.exists(path) and os.path.getsize(path) > 0: continue
        scene.frame_set(f); scene.render.filepath = path
        t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'RENDERED frame {f} in {time.time() - t0:.1f}s', flush=True)
