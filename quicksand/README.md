# Quicksand: a Zack D. Films-style 3D short

A 46-second vertical short (9:16) in the style of the Zack D. Films channel: a narrator talking to
"you", a new shot every one to two seconds, a camera that never stops moving, cutaway and macro
views, sound effects on every action and a punchline at the end. The script and everything in it
are original. It's built entirely from code with Blender (`bpy`), free CC0 assets and a free
neural voice.

- `quicksand.mp4`: the short (1080x1920, 24 fps, stereo audio)
- `quicksand_captions.mp4`: the same with burned-in captions
- `poster.jpg`: stills from it
- `thumbnail.jpg` and `UPLOAD_KIT.md`: Shorts thumbnail, title, tags, pinned comment and the research behind them

## Script

> If you ever start sinking in quicksand, whatever you do, don't try to yank your legs out.
> Scientists worked out that pulling your foot out at just one centimeter per second takes about
> the same force as lifting a car. The good news is, you can't sink all the way. Quicksand is about
> twice as dense as your body, so you stop around your waist. The bad news? That's where you get
> stuck. And if you're on a beach, the tide is coming in. So instead, stop struggling. Lean back and
> spread your arms, like you're floating in a pool. Then wiggle your legs, slowly. That lets water
> seep into the sand, and loosens its grip. Inch by inch, you float up, and roll onto solid ground.
> Then you stand up, feeling like a survival expert. And take one step.

The force and density figures come from Daniel Bonn's quicksand study (Nature, 2005).

## Shots (24, cut to the narration)

walk in at sunset, boot lands in the quicksand, sinking to the knees, yanking a leg, x-ray
cross-section, macro of sand grains locking around the boot, lifting a car, orbit while sinking to
the hips, cross-section of the body settling at the waist, relief, "the bad news", struggling,
aerial of the tide coming in, low shot of the water, calming down, leaning back, match cut to
floating in a pool, cross-section of the legs wiggling, macro of water seeping between the grains,
floating up, rolling onto firm sand, the "survival expert" pose, one confident step, and down into
the next patch.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS), line by line, plus `vo_timing.json` |
| `timeline.py` | The shot list, cut to the narration line timings |
| `human.py` | Rigged, clothed character from MakeHuman CC0 data: skin, eyes, brows, lashes, hair, teeth, facial expressions as shape keys, wet-sand shading on clothes |
| `posing.py`, `anim.py` | Direction-based posing, two-bone IK for hands and feet, procedural walk with planted feet |
| `sets.py` | Tidal flat with quicksand patches and incoming tide, x-ray cross-sections, macro sand grains, pool, car |
| `shots.py` | The performance in every shot, 24 moving cameras, per-set visibility, cut isolation |
| `scene.py` | Builds everything; renders check stills, a preview or the full frames |
| `sound.py` | Synthesised sound design and the mix (ambience, footsteps, suction, whooshes, tide, plunge, music bed, ducking) |
| `assemble.py` | Encodes frames + audio (loudness-normalised to -14 LUFS), optional captions |
| `thumbnail.py` | Shorts thumbnail: a natively rendered frame with the same grade and caption as the video |
| `fetch_assets.py` | Downloads the Poly Haven textures, sky and props |
| `test_char.py` | Character and expression check renders |

## Run it

```bash
pip install bpy==5.3.0 numpy pillow
python3 -m venv ttsenv && ttsenv/bin/pip install kokoro-onnx soundfile scipy pillow
export QS_SCRATCH=/path/to/work/dir
python3 fetch_assets.py
ttsenv/bin/python voiceover.py      # needs tts/kokoro-v1.0.onnx + voices-v1.0.bin in $QS_SCRATCH
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 720 1280 10
python3 assemble.py quicksand.mp4 --upscale 1080 1920
```

MakeHuman data goes in `$QS_SCRATCH/dl` (the MPFB 2 extension's `data/` folder and the CC0 asset
packs `makehuman_system_assets`, `shirts01`, `pants01`, `shoes01`, `hats01`).

## Licences

- Poly Haven textures, sky and models: CC0
- MakeHuman base mesh, targets, rig, skins, hair and clothes: CC0
- Kokoro TTS model and voices: Apache-2.0
- Sound effects and music: synthesised in `sound.py`
- Open Sans (captions): SIL Open Font License
