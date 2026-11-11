# Pilot: "How Did Ancient Humans Keep Food Without a Fridge?"

A 57-second English pilot in the Max cro style (see `../maxcro-recipe/RECIPE.md`),
with our own story and the upgrades the original leaves out.

Output: `pilot.mp4` (1920x1080, 30 fps, AAC stereo, -14 LUFS) and `thumbnail.png`
(1280x720, the reference channel's bold yellow two-word style; rebuild with `node thumb.mjs`).

## Story

Same hook shape as the reference video: modern life first, then "rewind",
the problem, the answers, a twist, named research, and a callback ending.

1. Your fridge hums tonight; your food is safe for days.
2. Rewind 50,000 years: a hunter has more meat than his family can eat, and it will rot.
3. Trick 1, sun and wind (drying). Trick 2, smoke. Trick 3, frozen ground.
4. Twist: the smartest fridge was other people. Share the kill, get paid back next week.
5. Evidence: researchers living with the Hadza of Tanzania still see this today.
6. "Meat spoils. A favour doesn't. Your fridge stores food. Theirs stored friendship."

The full script, one line per shot, is in `script.json`.

## What is better than the reference

| Reference video | This pilot |
|---|---|
| Frozen stills, about 90% of frames identical | Every shot moves: slow push-in or pull-out, gentle line "boil", blinking, breathing, flickering fire, rising smoke, swaying meat, buzzing flies |
| Text cards are static drawings | Text writes on letter by letter; numbers count up; crosses, ticks and arrows draw on in time with the words |
| Voice only, dead silence between lines | Synthesised music bed that ducks under the voice, plus synced effects (rewind whoosh, pops, scribbles, fire, wind, flies, footsteps) |
| No captions | Burned-in captions with the current word highlighted |
| Character drifts between shots | One code-drawn character, identical in every frame |

## How it is built

| Step | File | Output |
|---|---|---|
| Voice (Kokoro, `af_heart`, offline) | `tts.py` | `build/voice.wav`, `build/timeline.json` (shot and word timings) |
| Music and effects (numpy synthesis) | `sfx.py` | `build/mix.wav` |
| Drawings and animation (SVG) | `scenes.html`, `scenes.js` | rendered in Chromium |
| Frames to video | `render.mjs` | `build/video.mp4` |

Cuts land in the gaps between spoken lines, and every animation and sound cue
is keyed to word timings from the voice engine, so picture, sound and captions
stay in sync if the script changes.

### Rebuild

```bash
python3 tts.py
```

```bash
python3 sfx.py
```

```bash
node render.mjs stills
```

```bash
node render.mjs video 4
```

```bash
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest pilot.mp4
```

`node render.mjs stills` writes one frame per shot to `build/stills/` for a quick visual check.

### Requirements

- Python 3 with `kokoro` (0.7.x works on Python 3.13; needs `spacy-curated-transformers<1`), `soundfile`, `scipy`, `numpy`
- Node with Playwright and Chromium
- ffmpeg

Kokoro has no dictionary entry for "Hadza", "favour" or "smartest" in this
version, so `script.json` gives those words an inline pronunciation in the
`say` field. Captions still use the normal spelling.

## Known limits

- The voice is a free offline model. A recorded narrator or a paid voice would sound more natural; swap `build/voice/*.wav` and rerun from `sfx.py`.
- The backgrounds are flat-colour vector art, simpler than the reference's painted scenes.
- The music is synthesised. A licensed track would sound richer; drop it in at the music step of `sfx.py`.
