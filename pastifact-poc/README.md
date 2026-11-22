# Pastifact-style proof of concept

A 5-second vertical short in the style of the Pastifact channel (white mannequin characters in
period clothes, realistic 3D historical sets, chunked captions). It is built entirely from code
in Blender 5.3 (`bpy`), with free CC0 assets. The topic is original: *Why Amsterdam houses lean forward*.

- `amsterdam_poc.mp4`: the render, 1080x1920, 24 fps, 5 s, no audio
- `poster.jpg`: two stills from it

## What is in the shot

| Shot | Time | Content |
|---|---|---|
| A | 0.0-2.4 s | Low camera along a row of ten leaning canal houses (step, bell and neck gables, hoist beams), slow crane up; a crate is being winched up one facade |
| B | 2.4-5.0 s | Close over-the-shoulder shot: a mannequin in a fisherman sweater and newsboy cap looks up and points at the crate; slow push in |

Captions: "In old Amsterdam" / "houses lean forward" / "on purpose" / "Here's why".

## Files

| File | Job |
|---|---|
| `fetch_assets.py` | Downloads the Poly Haven textures, sky and props (CC0) |
| `human.py` | Builds a rigged, clothed character straight from MakeHuman data files: base mesh, body-shape targets, Mixamo-compatible skeleton and weights, `.mhclo` clothes fitting, white mannequin skin. Runs no add-on code |
| `posing.py` | Poses bones by direction in the character's own space (aim, turn, look, point, finger curl) and keys them |
| `scene.py` | Procedural canal houses, quay, water, bollards, props, the hoisted crate, character animation, two cameras, lighting, Cycles settings |
| `captions.py` | Burns captions in the reference style (heavy white sans, soft shadow, pop-in) and encodes the mp4 |
| `test_human.py`, `test_pose.py` | Quick stills for checking the character and poses |

## Run it

```bash
pip install bpy==5.3.0 numpy pillow
export POC_SCRATCH=/path/to/work/dir
python3 fetch_assets.py
```

MakeHuman data also has to be unpacked into `$POC_SCRATCH/dl`:

- `dl/mpfb/`: the MPFB 2.0.18 extension zip from extensions.blender.org. Only its `data/` folder is read.
- `dl/packs/<pack>/`: the CC0 asset packs `makehuman_system_assets`, `shirts01`, `pants01`, `shoes01` and `hats01` from static.makehumancommunity.org.

The open-licensed Open Sans ExtraBold font also goes in `$POC_SCRATCH/fonts/`. Then:

```bash
python3 scene.py preview 432 768 16        # four quick stills
python3 scene.py render 1080 1920 14       # full frames
python3 captions.py amsterdam_poc.mp4
```

On a 4-core CPU with no GPU, a frame takes about 30 s at 1080x1920 (about an hour for the 5 s).
A mid-range NVIDIA GPU should render the same frames many times faster.

## What a real episode still needs

- Voiceover and music, with captions timed to the voiceover word by word
- Real animation clips (the rig uses Mixamo bone names, so Mixamo clips can drive it) instead of hand-set poses
- More character variety (women, children, older people, more period clothing) and a few hero props modelled per topic
- A GPU machine for rendering

## Asset licences

- Poly Haven textures, sky (HDRI) and models: CC0
- MakeHuman base mesh, targets, rig and the asset packs listed above: CC0
- Open Sans: SIL Open Font License
