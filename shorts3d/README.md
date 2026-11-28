# shorts3d: photoreal 3D shorts with Remotion + three.js

A code-only pipeline for 9:16 vertical 3D shorts in the dark-studio product-render style
(think Zack D Films): one hero object on a seamless cyclorama, studio HDRI reflections,
tactile clearcoated materials, deep AO, soft bokeh, ACES filmic, spring-driven camera
pushes and bold word-by-word captions. No Blender.

```
prompt / image ──► FLUX.1-schnell ──► TRELLIS / Hunyuan3D-2.1 ──► hero.glb ─┐
Poly Haven (HDRI, CC0 models) · ambientCG (PBR) ───────────────────────────┤
                                                                           ▼
         Remotion composition (frame clock, captions, encode @ 1080x1920 60fps)
           └─ @remotion/three <ThreeCanvas> = React Three Fiber
                ├─ HDRI <Environment> + key + cool rim, cyclorama + ContactShadows
                ├─ useGLTF → MeshPhysicalMaterial (clearcoat 0.35 / 0.2, envMap 1.4)
                ├─ CameraRig: orbit + spring dolly-in + whip-zoom, pure f(frame)
                └─ EffectComposer: N8AO → Bloom → DepthOfField → ACES Filmic
```

## Quick start

```bash
cd shorts3d
npm install
```

```bash
npm run studio          # live preview in the browser (Remotion Studio)
```

```bash
npm run render          # GPU machine  -> out/hero-orbit.mp4
```

```bash
npm run render:cpu      # no GPU (CI / cloud): software WebGL, much slower
```

The repo already contains the sample assets, so it renders right after `npm install`.
To re-download or swap them, run `npm run assets` (see below).

## Project layout

| Path | What it does |
| --- | --- |
| `src/look.ts` | **Every look parameter**: exposure, colours, clearcoat, AO/bloom/DoF, lens. Tweak here first. |
| `src/scene/StudioCanvas.tsx` | Renderer: ACES Filmic, exposure 1.1, sRGB, soft PCF shadows. Holds Remotion until assets **and** the post stack are ready. |
| `src/scene/StudioLighting.tsx` | `<Environment files="/hdri/studio.hdr">` (works with `.exr` too), shadow-casting key light, cool rim. |
| `src/scene/Cyclorama.tsx` | Curved floor-to-wall sweep, `#1a1d24` → `#2d333f` vertex gradient, ambientCG normal map, `ContactShadows`. |
| `src/scene/HeroModel.tsx` | `useGLTF`, material upgrade, auto-centre/scale any GLB; `useHeroBounds().anchor("PartName")` gives the world position of a named part. |
| `src/scene/materials.ts` | Standard → `MeshPhysicalMaterial`, keeping every PBR map. |
| `src/scene/PostFX.tsx` | `<EffectComposer multisampling={4}>` with N8AO, Bloom, DoF (auto-focus), ACES. |
| `src/camera/moves.ts` | Camera building blocks: `springAt`, `ease`, `orbit`, `handheld`, `DOLLY`/`WHIP` spring presets. |
| `src/camera/CameraRig.tsx` | Applies a `shot(frame) → pose` function to the R3F camera each frame. |
| `src/captions/WordCaptions.tsx` | Word-by-word pop-in captions in the `@remotion/captions` format (Whisper-compatible). |
| `src/compositions/HeroOrbit.tsx` | The 5 s sample: orbit + dolly-in, then a whip-zoom into the lens on "INSIDE". |
| `scripts/fetch-assets.mjs` | Free CC0 assets: Poly Haven HDRI + model (packed to GLB), ambientCG PBR set. |
| `scripts/generate-model.mjs` | Free AI text/image → GLB through Hugging Face Spaces. |

## Assets

### Free and CC0, no account needed

```bash
npm run assets -- --force                                  # defaults: studio_small_09 HDRI, Camera_01, Plaster001
```

```bash
npm run assets -- --only hdri --hdri studio_small_03 --hdri-res 4k --force
```

```bash
npm run assets -- --only model --model boombox --model-out boombox.glb
```

```bash
npm run assets -- --only pbr --pbr Concrete034 --pbr-res 2K --force
```

* Poly Haven HDRIs: browse the [studio category](https://polyhaven.com/hdris/studio) and use the slug from the URL.
* Poly Haven models: browse [polyhaven.com/models](https://polyhaven.com/models). Each glTF is packed into a single `.glb` with gltf-transform.
* ambientCG: browse [ambientcg.com](https://ambientcg.com) and use the asset ID (e.g. `Plaster001`).

### AI-generated GLBs (free, via Hugging Face ZeroGPU)

```bash
npm run generate -- --prompt "a vintage brass pocket watch with an open lid" --out public/models/watch.glb
```

```bash
npm run generate -- --image my-reference.png --backend hunyuan --out public/models/thing.glb
```

The default chain runs FLUX.1-schnell (prompt → clean product image), then TRELLIS
(image → textured GLB), then a gltf-transform clean-up. The reference image is saved
next to the GLB, so you can check what the 3D model was built from.

Anonymous use gets only a few minutes of GPU time per day, and that quota is shared by
everyone on your IP address. A free Hugging Face token raises it:
`HF_TOKEN=hf_xxx npm run generate -- ...`. Public Spaces change their APIs now and then.
`npm run generate -- --inspect` prints the current endpoints.

Other generators that work with the same flow: Tripo3D and Meshy both have free monthly
credits and REST APIs that return `.glb`. Save the file into `public/models/` and point
`modelUrl` at it.

## Making a new video

1. Put the model in `public/models/` (with `npm run assets` or `npm run generate`).
2. Copy `src/compositions/HeroOrbit.tsx` and write your own `shot(frame, fps)`. Mix
   `springAt(..., DOLLY)` for smooth pushes, `springAt(..., WHIP)` for punch-ins, and
   `ease()` for long orbits. Use `hero.anchor("NodeOrMaterialName")` to push into a detail.
   Focus follows `pose.focus`.
3. Add caption timings. For a voice-over, transcribe it with
   [`@remotion/install-whisper-cpp`](https://www.remotion.dev/docs/install-whisper-cpp)
   and pass the resulting `Caption[]` straight to `<WordCaptions>`.
4. Register the composition in `src/Root.tsx`, preview it in `npm run studio`, then run `npm run render`.

Override props without touching code:

```bash
npx remotion render HeroOrbit out/watch.mp4 --props='{"modelUrl":"/models/watch.glb","whipAnchor":""}'
```

Use `"post": false` for fast blocking previews without the effect stack.

## Story shorts (narrated, multi-shot)

`NobodyShort` is a 32 s narrated story short in the style of character-driven 3D shorts:
first-person voice-over, quick cuts every 1 to 2 seconds, push-ins, over-the-shoulder
shots, whip-pans and whip-zooms, and small lowercase captions that cut in with the voice.
The script is original ("They Named Me Nobody").

```bash
npx remotion render NobodyShort out/nobody.mp4          # GPU machine
```

How it's built, end to end:

| Step | File | Tool |
| --- | --- | --- |
| Script (lines + pauses) | `src/stories/nobody/script.json` | you |
| Narration + word timings | `scripts/voiceover.py` → `public/stories/nobody/vo.wav`, `src/stories/nobody/timeline.json` | Piper TTS (free, offline) |
| Music bed, crowd roar, whoosh | `scripts/sound-bed.py` | numpy synthesis, no samples |
| Characters | `src/characters/Mannequin.tsx`, `poses.ts` | procedural articulated "designer toy" people |
| Crowd | `src/characters/Crowd.tsx` | ~180 instanced people in 5 draw calls (cheer / laugh / shrug / point) |
| Sets | `src/stories/nobody/sets.tsx`, `src/scene/GroundedEnv.tsx` | Poly Haven HDRIs as ground-projected sets, Poly Haven chest, ambientCG planks |
| Shot list | `src/stories/nobody/NobodyShort.tsx` | one entry per narration line: set, lighting, crowd mood, actors, camera |

Change the words, then regenerate the voice-over. Shots key off the line ids, so they
re-time themselves:

```bash
pip install piper-tts numpy
```

```bash
python3 scripts/voiceover.py src/stories/nobody/script.json
```

Dev composition `PoseLab` shows every pose side by side for checking the rig.

## Notes on the rendering choices

* **Tone mapping happens in the effect stack.** `@react-three/postprocessing` forces
  `gl.toneMapping = NoToneMapping` while its composer is mounted, so ACES Filmic runs
  as the last effect (`<ToneMapping mode={ACES_FILMIC}>`). It still uses
  `gl.toneMappingExposure = 1.1`. Everything before it runs in half-float HDR, which is
  why `Bloom luminanceThreshold={1.1}` only catches real highlights.
* **DoF uses world units.** Since postprocessing 6.36, `focusDistance` and the range are
  measured in world units. The old normalised values (`focusDistance 0.02`) would blur
  the whole frame. The stack therefore auto-focuses on the camera's focus point, and
  the classic `focalLength 0.05` is converted to a world range as `0.05 × (far − near)`.
* **Soft shadows.** three r180+ removed `PCFSoftShadowMap`. Soft PCF is now
  `PCFShadowMap` plus `shadow.radius`, sampled with a Vogel disk.
* **Deterministic frames.** The camera, captions and springs are pure functions of the
  frame number, so Remotion can render frames out of order across parallel tabs.
* **Fonts are bundled** (`public/fonts`, SIL OFL), so renders don't need network access.

## Performance

| Machine | Command | Speed (1080x1920, full post stack) |
| --- | --- | --- |
| Any GPU (`--gl=angle`, the default in `remotion.config.ts`) | `npm run render` | far faster; raise `--concurrency` until the GPU is saturated |
| 4-core cloud box, no GPU (`--gl=swangle`, `--concurrency=3`) | `npm run render:cpu` | measured: 300 frames in 39 min (~8 s/frame) |

On software GL, four or more tabs can run out of memory late in a render and crash
Chrome. Keep `--concurrency` at 3 or lower there. For quick look checks, render stills
with `npm run still` or add `--scale=0.5`.

## Credits and licences

* HDRI `studio_small_09`, model `Camera_01`: [Poly Haven](https://polyhaven.com), CC0.
* `Plaster001`: [ambientCG](https://ambientcg.com), CC0.
* Montserrat Black: Julieta Ulanovsky et al., SIL Open Font License 1.1.
* Remotion has its own [licence](https://www.remotion.dev/license): it's free for
  individuals and small teams, and larger companies need a company licence.
