"""Finds when each foot touches down in a walk shot, for syncing footstep sounds. Writes out/walk/<shot>_steps.json."""
import bpy, sys, os, json
sys.argv += ['--shot', sys.argv[sys.argv.index('--') + 2]] if False else []
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'walk_demo.py')).read().split('# ---------- cameras')[0])
steps = []
for side in ('Left', 'Right'):
    zs = []
    for f in range(1, SHOTS['frames'] + 1):
        scene.frame_set(f); zs.append((rig.matrix_world @ rig.pose.bones[side + 'Foot'].head).z)
    print('Z', side, [round(z, 3) for z in zs[::6]])
    base = [min(zs[max(0, f - 12):f + 13]) for f in range(len(zs))]   # the planted height around each frame
    contact = [zs[f] < base[f] + 0.025 for f in range(len(zs))]
    for f in range(1, len(zs)):                # a touch-down: the foot comes back into contact with the ground
        if contact[f] and not contact[f - 1]:
            steps.append((f + 1) / FPS)
json.dump(sorted(steps), open(os.path.join(KIT, 'out', 'walk', f'{SHOT}_steps.json'), 'w'))
print('STEPS', SHOT, sorted(round(s, 2) for s in steps))
