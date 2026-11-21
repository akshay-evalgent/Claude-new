"""Morning Walk: a realistic MakeHuman character walking real CMU motion capture through a Poly Haven street HDRI.

  blender -b -P walk_demo.py -- --shot S1 --still 40 --pct 60       # one test frame
  blender -b -P walk_demo.py -- --shot S1 --anim --pct 60            # all frames of a shot into out/walk/<shot>/

Everything here is free: Blender, MPFB + MakeHuman CC0 assets, CMU mocap, a CC0 HDRI from Poly Haven.
The HDRI is both the light and the background; a shadow-catcher plane lays the character's shadow onto its asphalt.
Cameras stay put and only pan, because a photographed background can't show parallax.
"""
import bpy, sys, os, math, time
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__)); KIT = os.path.dirname(HERE)
sys.path.append(HERE)
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt, i = {}, 0
while i < len(args):
    k = args[i].lstrip('-')
    if i + 1 < len(args) and not args[i + 1].startswith('--'): opt[k] = args[i + 1]; i += 2
    else: opt[k] = True; i += 1
SHOT = opt.get('shot', 'S1')
FPS = 24
SHOTS = {   # clip, frames, where he starts, which way he walks (degrees; 0 = toward -Y)
    'S1': dict(clip='07_05', frames=96, origin=(0.35, 9.0, 0), heading=0),
    'S2': dict(clip='07_05', frames=96, origin=(-3.2, 2.2, 0), heading=90),
    'S3': dict(clip='07_05', frames=72, origin=(-1.4, 0.0, 0), heading=90),
}[SHOT]

bpy.ops.wm.read_factory_settings(use_empty=True)
import human
scene = bpy.context.scene
scene.render.fps = FPS; scene.frame_start = 1; scene.frame_end = SHOTS['frames']
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'
cy.samples = int(opt.get('samples', 24)); cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.02
cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 6; cy.diffuse_bounces = 3; cy.glossy_bounces = 3; cy.transparent_max_bounces = 16   # hair cards are alpha-mapped
scene.render.resolution_x, scene.render.resolution_y = 1080, 1920; scene.render.resolution_percentage = int(opt.get('pct', 60))
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.5
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Medium High Contrast'; scene.view_settings.exposure = 0.3

# ---------- the world: a CC0 street HDRI, turned so the street runs along +Y with the sun ahead of the camera
world = bpy.data.worlds.new('Street'); scene.world = world; world.use_nodes = True
nt = world.node_tree; N, L = nt.nodes, nt.links; N.clear()
out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground'); env = N.new('ShaderNodeTexEnvironment')
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping')
env.image = bpy.data.images.load(os.path.join(KIT, 'assets', 'hdri', 'wide_street_02_4k.hdr'))
mp.inputs['Rotation'].default_value[2] = math.radians(float(opt.get('rot', -162)))
L.new(tc.outputs['Generated'], mp.inputs['Vector']); L.new(mp.outputs[0], env.inputs['Vector']); L.new(env.outputs[0], bg.inputs['Color']); L.new(bg.outputs[0], out.inputs['Surface'])
bg.inputs['Strength'].default_value = 1.0

# ---------- the ground: catches shadows only, so the photographed asphalt shows through
bpy.ops.mesh.primitive_plane_add(size=80, location=(0, 0, 0)); ground = bpy.context.object; ground.is_shadow_catcher = True

# ---------- the character
h = human.build({'gender': 1.0, 'age': 0.58, 'muscle': 0.62, 'weight': 0.52, 'height': 0.6, 'race': 'african', 'skin': 'middleage_african_male',
                 'hair': 'short02', 'clothes': ['male_casualsuit04', 'shoes02']})
human.retarget_bvh(h['rig'], os.path.join(KIT, 'mocap', SHOTS['clip'] + '.bvh'), frames=SHOTS['frames'], fps=FPS,
                   origin=SHOTS['origin'], heading_deg=SHOTS['heading'])
rig = h['rig']
def hip(f):
    scene.frame_set(f); return rig.matrix_world @ rig.pose.bones['Hips'].head
def head(f):
    scene.frame_set(f); return rig.matrix_world @ rig.pose.bones['Head'].head

# ---------- cameras: fixed position, panning to follow
cam_data = bpy.data.cameras.new('Cam'); cam_data.sensor_width = 36; cam_data.clip_start = 0.05; cam_data.clip_end = 500
cam = bpy.data.objects.new('Cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
cam_data.dof.use_dof = True
if SHOT == 'S1':      # straight down the street, low, the sun behind him
    cam.location = (0.0, 0.0, 1.05); cam_data.lens = 55; cam_data.dof.aperture_fstop = 2.0
    for f in range(1, SHOTS['frames'] + 1, 4):
        p = hip(f); tgt = p + Vector((0, 0, 0.15))
        cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.keyframe_insert('rotation_euler', frame=f)
        cam_data.dof.focus_distance = (p - cam.location).length; cam_data.dof.keyframe_insert('focus_distance', frame=f)
elif SHOT == 'S2':    # from the kerb, panning as he crosses in front of the low sun
    cam.location = (0.6, -2.4, 1.45); cam_data.lens = 40; cam_data.dof.aperture_fstop = 2.8
    for f in range(1, SHOTS['frames'] + 1, 4):
        p = hip(f); tgt = p + Vector((0.0, 0, 0.3))
        cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.keyframe_insert('rotation_euler', frame=f)
        cam_data.dof.focus_distance = (p - cam.location).length; cam_data.dof.keyframe_insert('focus_distance', frame=f)
else:                 # at ground level: his shoes step past, shadows long on the asphalt
    cam.location = (0.2, -1.6, 0.12); cam_data.lens = 35; cam_data.dof.aperture_fstop = 2.0
    for f in range(1, SHOTS['frames'] + 1, 4):
        p = hip(f); tgt = Vector((p.x, p.y, 0.25))
        cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler(); cam.keyframe_insert('rotation_euler', frame=f)
        cam_data.dof.focus_distance = (tgt - cam.location).length; cam_data.dof.keyframe_insert('focus_distance', frame=f)
for o in (cam, cam_data):
    for fc in o.animation_data.action.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'

# ---------- lens: glow from the sun, a little vignette
scene.use_nodes = True; ct = scene.node_tree; ct.nodes.clear()
rl = ct.nodes.new('CompositorNodeRLayers'); comp = ct.nodes.new('CompositorNodeComposite')
g = ct.nodes.new('CompositorNodeGlare'); g.glare_type = 'FOG_GLOW'; g.quality = 'HIGH'
g.inputs['Threshold'].default_value = 3.0; g.inputs['Strength'].default_value = 0.35; g.inputs['Size'].default_value = 0.8
ct.links.new(rl.outputs['Image'], g.inputs['Image'])
vig = ct.nodes.new('CompositorNodeEllipseMask'); vig.width = 1.15; vig.height = 1.05
bl = ct.nodes.new('CompositorNodeBlur'); bl.size_x = bl.size_y = 240; bl.filter_type = 'GAUSS'; ct.links.new(vig.outputs[0], bl.inputs['Image'])
mr = ct.nodes.new('CompositorNodeMapRange'); mr.inputs['To Min'].default_value = 0.7; mr.inputs['To Max'].default_value = 1.0; ct.links.new(bl.outputs[0], mr.inputs['Value'])
mx = ct.nodes.new('CompositorNodeMixRGB'); mx.blend_type = 'MULTIPLY'; mx.inputs['Fac'].default_value = 1
ct.links.new(g.outputs['Image'], mx.inputs[1]); ct.links.new(mr.outputs[0], mx.inputs[2]); ct.links.new(mx.outputs[0], comp.inputs['Image'])

outdir = os.path.join(KIT, 'out', 'walk', SHOT); os.makedirs(outdir, exist_ok=True)
if 'still' in opt:
    f = int(opt['still']); scene.frame_set(f); scene.render.filepath = os.path.join(KIT, 'out', f'{SHOT}_{f:03d}.png')
    t0 = time.time(); bpy.ops.render.render(write_still=True); print(f'RENDERED {SHOT} {f} in {time.time() - t0:.1f}s')
if 'anim' in opt:
    scene.render.filepath = os.path.join(outdir, 'f'); scene.render.use_overwrite = False
    t0 = time.time(); bpy.ops.render.render(animation=True); print(f'RENDERED {SHOT} in {time.time() - t0:.1f}s', flush=True)
