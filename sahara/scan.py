"""Contact sheet of a mocap clip on the hero: blender -b -P scan.py -- <clip> [step_seconds]"""
import bpy, sys, os, math
from mathutils import Vector
KIT = '/home/user/Claude-new/asset-kit'; sys.path.append(KIT + '/blender')
bpy.ops.wm.read_factory_settings(use_empty=True)
import human
a = sys.argv[sys.argv.index('--') + 1:]; clip = a[0]; step = float(a[1]) if len(a) > 1 else 0.5
n = int(open(f'{KIT}/mocap/{clip}.bvh').read().split('Frames:')[1].split()[0]); dur = n / 120.0
frames = max(2, int((dur - 0.3) / step))
h = human.build({'gender': 1.0, 'age': 0.6, 'muscle': 0.65, 'weight': 0.45, 'height': 0.45, 'race': 'caucasian', 'skin': 'middleage_caucasian_male', 'hair': 'short01',
                 'clothes': ['elvs_crude_t-shirt_male', 'cortu_jeans_shorts', 'shoes02']})
rig = h['rig']; s = bpy.context.scene
human.retarget_bvh(rig, f'{KIT}/mocap/{clip}.bvh', frames=frames, fps=1.0 / step, src_start=0.1)
s.render.engine = 'CYCLES'; s.cycles.samples = 3; s.cycles.use_denoising = True; s.render.resolution_x, s.render.resolution_y = 200, 300
w = bpy.data.worlds.new('w'); w.color = (0.6, 0.62, 0.65); s.world = w
sun = bpy.data.objects.new('S', bpy.data.lights.new('S', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (0.7, 0.2, 0.5); s.collection.objects.link(sun)
bpy.ops.mesh.primitive_plane_add(size=60)
cam = bpy.data.objects.new('C', bpy.data.cameras.new('C')); cam.data.lens = 70; s.collection.objects.link(cam); s.camera = cam
os.makedirs(f'/home/user/Claude-new/sahara/out/scan_{clip}', exist_ok=True)
for f in range(1, frames + 1):
    s.frame_set(f); hip = rig.matrix_world @ rig.pose.bones['Hips'].head
    cam.location = Vector((hip.x + 3.5, hip.y - 5.5, 1.3)); cam.rotation_euler = (Vector((hip.x, hip.y, 0.9)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    s.render.filepath = f'/home/user/Claude-new/sahara/out/scan_{clip}/f{f:03d}.png'; bpy.ops.render.render(write_still=True)
print('SCANNED', clip, 'dur', round(dur, 2), 'frames', frames)
