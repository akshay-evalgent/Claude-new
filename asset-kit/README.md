# Asset kit: free humans, motion, environments and voice

A working toolchain for realistic videos built only from free, openly licensed parts, plus a demo that uses all of them.

- `ASSETS.md`: the catalogue of free sources (humans, motion capture, HDRIs, textures, props, sound, voice), with licenses and which ones need an account.
- `setup.sh`: installs Blender 4.5, MPFB (MakeHuman for Blender) and the CC0 MakeHuman asset pack, and downloads sample mocap and an HDRI.
- `fetch.py`: downloads Poly Haven HDRIs, textures and models, ambientCG materials, and CMU mocap clips by name.
- `blender/human.py`: `build()` makes a dressed, rigged human in one call; `retarget_bvh()` puts CMU motion capture on it (T-pose correction, leg-length scaling, ground lock).
- `blender/walk_demo.py`: the demo scene. The HDRI lights and backs the shot, a shadow catcher lays his shadow on the photographed road, and the cameras only pan so the background never needs parallax.
- `blender/footsteps.py`: finds the mocap's foot touch-downs, so footstep sounds land on the right frames.
- `voice/say.py`: narration with Kokoro-82M (Apache 2.0) through its ONNX build, CPU only.
- `demo/`: sound mix and end card for the demo. `morning-walk.mp4` is the result.

## Run the demo

```bash
./setup.sh
for s in S1 S2 S3; do blender -b -P blender/walk_demo.py -- --shot $s --anim --pct 60 --samples 24; done
for s in S1 S2 S3; do blender -b -P blender/footsteps.py -- --shot $s; done
python voice/say.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin --voice am_michael "Your line" voice/narration.wav
python demo/audio.py
```

Then assemble with ffmpeg (see the commit history for the exact command): the frames are scaled from 648x1152 to 1080x1920.

## Known limits

- The retargeter transfers motion changes, solves the legs with IK and locks the lowest foot to the ground; feet can still slide a little because there's no per-step foot pinning.
- Cameras must sit at the HDRI's capture height (about 1.6 m here) or the person looks the wrong size in the street; and they may only pan, since a photograph has no parallax.
- MakeHuman faces are good at a distance and in motion, less so in tight close-ups.
- CPU rendering is slow: about 20 s per 648x1152 frame here. A GPU is 10-30x faster.
