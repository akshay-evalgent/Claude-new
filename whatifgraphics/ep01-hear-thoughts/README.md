# Episode 1 — What IF You Could Hear What Everyone REALLY Thinks of You?

Fully generated animated episode for the **whatifgraphics** channel, built in the style
analysed in `../channel-analysis-jeremy-bearimy.md` (second-person what-if story, five acts,
~10:30 runtime, faceless mascot, bright flat 2D look, thought bubbles, bold text cards).

## What is in here

| Path | What |
|---|---|
| `script.md` | The full narration script, act by act, with the visual for each shot. Generated from `render/shots.js`. |
| `shots.js` | Source of truth: every shot's narration + scene spec (background, characters, poses, bubbles, cards, camera). |
| `../pipeline/lib.js` | The SVG animation library: mascot + 20 side characters, 11 expressions, 15 poses, 23 backgrounds, props, thought/speech bubbles, text cards, camera moves. |
| `../pipeline/scene.html` | Headless render harness (loads fonts, exposes `renderFrame(shot, t)`). |
| `../pipeline/render.js` | Playwright/Chromium frame renderer (parallel workers, JPEG frames, thumbnail, preview mode). |
| `../pipeline/build.py` | Narration (edge-tts), timings, generated music bed + SFX, ducking, ffmpeg encode, SRT. |
| `build/thumbnail.png` | 1920×1080 thumbnail. |
| `output/` | Final MP4 + SRT (not committed, see below). |

## Rebuild from scratch

All episodes share the renderer in `../pipeline/`. From the `whatifgraphics/` folder:

```bash
python3 -m venv venv && venv/bin/pip install edge-tts numpy          # once
venv/bin/python pipeline/build.py script   --episode ep01-hear-thoughts   # -> script.md
venv/bin/python pipeline/build.py audio    --episode ep01-hear-thoughts   # -> build/voice, build/timings.json
node pipeline/render.js --episode ep01-hear-thoughts --workers 4          # -> build/frames (~5 min on 4 cores)
node pipeline/render.js --episode ep01-hear-thoughts --thumb              # -> build/thumbnail.png
venv/bin/python pipeline/build.py assemble --episode ep01-hear-thoughts   # -> output/*.mp4 + .srt
```

Quick visual check of every shot without a full render:

```bash
node pipeline/render.js --episode ep01-hear-thoughts --preview            # one JPEG per shot in build/preview/
node pipeline/render.js --episode ep01-hear-thoughts --preview --shot 12 --late
```

Requirements: Node 18+ with `playwright` (Chromium), Python 3.10+, ffmpeg. Fonts are vendored in `../pipeline/fonts/`
(Fredoka, Nunito, Bangers, all OFL).

## Making the next episode

1. Copy this folder, rewrite `shots.js`: keep the five-act beat template
   (gift → rules & small wins → escalation & fame → the cost → the choice).
2. Aim for 80–90 shots and ~1,500 words; the pipeline sets each shot's length from the narration.
3. Add any new background or prop to `lib.js` (`BG` and `PROPS` maps), new side characters to `NPC`.
4. Run the five commands above.

## Design choices (so the channel stays consistent)

- Mascot: cream round head, dot eyes, expressive brows, **orange hoodie**. Faceless on purpose so the viewer projects onto it.
- Side cast: chibi style, big eyes, blush, pastel outfits. Contrast with the plain mascot is intentional.
- Palette: orange `#ff7a2f`, ink `#2b2140`, cream `#fff6e8`, sky `#8fd8ff`, yellow `#ffd166`, teal `#2ec4b6`.
- Fonts: Fredoka 700 for cards, Nunito 800 for bubbles, Bangers for thumbnails.
- Voice: edge-tts `en-US-AndrewMultilingualNeural` at +4% rate.
- Thought bubbles pop with a sound; dark-purple bubbles mark the "cost" act; grey filter marks the "silence" beats.
