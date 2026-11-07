# Anatomy asset kit v1.1: skin, muscle, bone, nerves, tendons, mitochondria

Manga-ink anatomy for the videos, all in the channel palette. Everything here is rendered from real 3D anatomy data or drawn from textbook structure, not guessed by an image model, so a muscle is where the atlas says it is.

Open `previews/` to browse. Use the transparent PNGs in the edit.

## What's in the kit

| Folder | What | Format |
|---|---|---|
| `body/` | Full body in four layers (skin, muscle, skeleton, nerves), front and back | 8 transparent PNG, 1215×2160 |
| `muscle-highlights/` | Muscle layer with one group glowing coral: biceps, chest, shoulders, forearms, obliques, quads, triceps, upper back, glutes, hamstrings, calves | 11 transparent PNG, 1215×2160 |
| `bone-highlights/` | Skeleton with one group glowing amber: wrist, femur, spine, ribcage | 4 transparent PNG, 1215×2160 |
| `closeups/` | Arm and biceps, forearm flexors, shoulder from behind, quads, calves, hand bones, knees, spine, skull, ribcage, brain and spinal cord, arm nerves | 12 transparent PNG, 1920×1080 |
| `tendons/` | Tendon X-rays with ghost skin, faint muscle and half-strength bone, and tendons glowing coral. Views: palm, back of hand, arm, knee with patellar tendon, Achilles side view, lower leg side view, full body front and back | 8 transparent PNG |
| `micro/` | Skin cross-section, motor neuron on muscle fibres, cut long bone with an osteon, muscle-to-myofibril breakdown, mitochondrion cutaway, mitochondria inside a muscle fibre, untrained vs endurance-trained fibre | 7 transparent PNG, 1920×1080, plus labelled previews. The mitochondrion also has an energy-flow version: fuel and oxygen in, ATP out. |
| `hero/` | Four-layer line-up, plus half-and-half splits: muscle with skeleton, and skin with nerves | PNG |
| `anim/` | Layer reveal (skin to muscle to bone to nerves), nerve signals, zoom from body to biceps, muscle turntable, hand X-ray scan revealing tendons, ATP streaming out of a mitochondrion | 1920×1080 MP4 |
| `previews/` | Every asset on the stage colour, as JPG, for browsing | JPG |

The transparent PNGs have the glow baked in, so they keep it on any background.

## How it's made

- **3D layers** come from BodyParts3D, a full human atlas with 203 bones, 403 muscles and muscle heads, the skin and the brain. A custom renderer draws them like a seinen-manga anatomy plate. Its passes are:
  - ink outlines from depth and part edges;
  - toon tones;
  - pencil hatching in shadow;
  - fibre strokes that follow each muscle's direction;
  - palette glows on the part being taught.
- **Skin layer** wears the host's teal shorts. The external genitalia are removed from the mesh, so every layer and outline is family-friendly.
- **Tendons** are mostly real atlas geometry. BodyParts3D stores each muscle together with its tendon, so `tendons.py` splits off the tendon end of each muscle at an anatomical level. That covers the finger flexors and extensors, wrist tendons, biceps, triceps, quadriceps and patellar tendons, and the ankle tendons. The atlas has no Achilles tendon or kneecap, so those two are modelled on atlas landmarks: the calf muscles, the calcaneus and the femur.
- **Mitochondria** are drawn from standard cell-biology structure: the double membrane, cristae, ATP synthase, matrix and mitochondrial DNA. The fibre view is 3D, with striated myofibrils and mitochondria between them. The trained versus untrained comparison is qualitative: more and bigger mitochondria, and more capillaries.
- **Nerves** use the atlas brain. The peripheral nerves are a simplified map laid out on the atlas skeleton: the spinal cord, plexuses, and main limb and intercostal nerves. It is right for teaching. Have an anatomist check it before using it for a nerve-by-nerve close-up.
- **Micro assets** are drawn procedurally from standard histology layouts. The muscle breakdown is real 3D cylinders through the same renderer.
- **No GPU** is needed. One full-body layer takes about 10 to 20 seconds on a laptop CPU.

## Make more

Any muscle, bone, angle or zoom can be rendered. The scripts are in `scripts/anatomy/`:

```bash
python3 prep_bp3d.py <BodyParts3D folder>
```

```bash
python3 build_kit.py <BodyParts3D folder> <out folder> all
```

```bash
python3 micro.py <out folder>
```

```bash
python3 tendons.py <BodyParts3D folder> <out folder>
```

```bash
python3 mito.py <out folder>
```

`prep_bp3d.py` expects the unzipped `isa_BP3D_4.0_obj_99` meshes plus the `isa_*` and `partof_*` lists in one folder. All of them are free downloads from the [BodyParts3D page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html).

New highlights are one line in the `MUSCLES`, `BONES` or `CLOSE` tables of `build_kit.py`. Search words match the atlas names, such as "biceps brachii", "gastrocnemius" or "vertebra".

## Credit and licence: read before publishing

The 3D layers are adaptations of **BodyParts3D, © The Database Center for Life Science, licensed under CC BY-SA 2.1 Japan**. That licence allows commercial use, including monetised YouTube, with two conditions:

1. **Credit.** Put this line in every video description that uses the renders:
   > Anatomy models: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 Japan
2. **Share-alike.** The rendered anatomy images are licensed CC BY-SA too. Anyone may reuse those images with credit. The careful reading is that a video built around them may count as an adaptation as well. If that matters for the channel, ask a lawyer, or replace the hero anatomy shots with hand-drawn versions over time.

The micro assets, the nerve map and the renderer are the channel's own work.

## Known gaps

- This atlas release has no rectus abdominis or latissimus dorsi. Core highlights use the obliques instead. The kneecap and Achilles tendon are modelled, and appear only in the tendon views.
- The spinal cord and peripheral nerves are schematic, as described above.
- The muscle layer shows the skull and hand bones where the atlas has no surface muscle. That's normal for an anatomy figure.
