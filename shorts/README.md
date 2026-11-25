# Split-screen Shorts engine (Remotion)

Code-animated 9:16 Shorts. Characters, sets, overlays and audio are all generated, so there is no stock art and no licensed audio. Strategy and upload copy are in [PLAYBOOK.md](PLAYBOOK.md).

```bash
npm install
npm run studio                           # live preview with scrubbing
python3 scripts/make_audio.py public/audio   # regenerate SFX + score
scripts/finish.sh Ep01 out/ep01          # final 1080x1920@60 render, loudness -14 LUFS
```

To render outside the cloud container, drop `REMOTION_BROWSER` (Remotion downloads its own Chrome) or point it at a local Chrome.

## Layout

| Path | What it is |
|---|---|
| `src/components/Person.tsx` | Character rig: two-bone IK for arms and legs, walk/run cycle, faces (eyes, brows, mouths, blink), hair styles, props held in hands. Bodies for ages 5, 8, 12, 16, adult and mom |
| `src/components/Props.tsx` | Kid drawings (7 doodles), phone, mug, gift, markers, sketchbook, laptop |
| `src/components/Overlay.tsx` | Panel header, HUD counter (rolling numbers, +N floaters, sub-row), speech bubbles, emoji pops, clock chip |
| `src/scenes/Sets.tsx` | Kitchen (fridge fills with art, table, palettes) and bedroom (working door, desk lamp, hall light with passing feet, art wall) |
| `src/lib/anim.ts` | Time-based keyframes (`kf`), pose tracks (`track`), eases, spring pop |
| `src/episodes/Ep01Drawing.tsx` | The episode: five beats × two sides, sound cue sheet, end card |
| `scripts/make_audio.py` | numpy synthesis of 16 SFX and the piano/pad score (bar 7 lands on "25 YEARS LATER") |
| `scripts/sheet.py` | Contact sheet of frames at given times, for fast visual QA |

## 3D renderer (v2)

`src/three/` renders the same poses and timelines in Three.js through `@remotion/three`:

| Path | What it is |
|---|---|
| `src/three/Person3D.tsx` | 3D character. Reuses the 2D rig's IK, with a lathe torso that bakes shirt, pants and stripe colours, capsule limbs, a 3/4 head turn toward camera, glossy blinking eyes, 3D brows and mouths, ears, nose, blush, and hair styles |
| `src/three/Sets3D.tsx` | Kitchen and bedroom sets, plus lights. The kitchen has a glossy fridge with an art wall, curtained window with light shafts, tiled counter and pendant lamp. The bedroom has a hinged door onto a lit hallway, a desk lamp spotlight, and a hall light under the door with passing feet |
| `src/three/Props3D.tsx` | Drawings (procedural crayon textures), phone, gift, markers, sketchbook, book, falling paper |
| `src/three/Stage.tsx` | Canvas + animated camera + `projector()`, which maps 3D heads to panel pixels so the HTML bubbles follow the characters |
| `src/episodes/Ep01_3D.tsx` | The episode. Per-beat camera swoops and push-ins, automatic squash and stretch on jumps, callback captions, pop-up card, counter reset |

WebGL renders in software here, so pass `--gl=swangle`. That's about 0.9s per frame, roughly 30 minutes for 32s at 60fps. On a machine with a GPU, use `--gl=angle` and it's much faster.

```bash
npx remotion render src/index.ts Ep01-3D-Preview out/3d-preview.mp4 --gl=swangle --browser-executable=/opt/pw-browsers/chromium_headless_shell   # 6fps check, ~3.5 min
scripts/finish.sh Ep01-3D out/ep01-3d --gl=swangle                                                                                             # final 60fps
```

## Writing a new episode

Copy `Ep01Drawing.tsx`. Each beat is a function `(t, side) => {svg, html}`:
- Characters are `Person` elements with a `track(t, basePose, keys)`.
- Keys only list what changes: `{t: 2.4, hF: [60, -10], mouth: 'grin'}`.
- `hF`/`hB` are hand targets relative to the shoulder, `fF`/`fB` are foot targets, and IK does the rest.
- Discrete fields (mouth, eyes, brows) switch when the move into that key starts.

Iterate with a 10fps half-scale preview (about 20s to render) and a contact sheet:

```bash
npx remotion render src/index.ts Ep01Preview out/preview.mp4 --scale=0.5 --browser-executable=/opt/pw-browsers/chromium_headless_shell
python3 scripts/sheet.py out/preview.mp4 out/sheet.jpg 1 3 5 8 12 15 19 23 27 30
```

Remotion is free for individuals and companies of up to 3 people. Larger teams need a company license.
