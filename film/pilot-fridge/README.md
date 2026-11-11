# Pilot: "How Did Ancient Humans Keep Food Without a Fridge?"

A 59-second English pilot in the Max cro style (see `../maxcro-recipe/RECIPE.md`),
with our own story, the reference's tone and rhythm, and the upgrades the original leaves out.

Output: `pilot.mp4` (1920x1080, 30 fps, AAC stereo, -14.6 LUFS) and `thumbnail.png`
(1280x720, the reference channel's bold yellow two-word style; rebuild with `node thumb.mjs`).

## Script

Written in the reference narrator's voice:

- **Second person.** It opens on your life and keeps pulling back to you ("a problem you have never once thought about").
- **Staccato lists of three**, each item its own shot: "He has a spear. / A family to feed. / And more meat than they can eat."
- **Sentences split across cuts**: "But the smartest fridge, / wasn't a place at all."
- **The voiced objection**, as in the reference ("Now your brain is probably saying, 'No, that can't be'"): "Now your brain is probably saying, / Cavemen? They just let it rot. / At least, that's what we assume."
- **Myth, evidence, twist, callback**: three tricks, then "the smartest fridge was other people", named research, and an ending that answers the opening.

The full script is in `script.json`, one line per spoken sentence and one shot per phrase.

## Rhythm, measured against the reference

| | Reference (Max cro) | This pilot |
|---|---|---|
| Speech rate | ~208 words/min (Hindi) | 202 words/min |
| Pause between phrases, median / 75th pct | 0.13 s / 0.22 s | 0.08 s / 0.25 s |
| Average shot length | 1.94 s (first minute) | 1.68 s |
| Narrator | male, median pitch 134 Hz | male (`am_fenrir`), median pitch 148 Hz |

Each sentence is spoken in one pass so the intonation flows naturally across a cut;
the cut points come from the voice engine's word timestamps.

## What is better than the reference

| Reference video | This pilot |
|---|---|
| Frozen stills, about 90% of frames identical | Every shot moves: push-ins, pull-outs, a tilt from the sun down to the rotting meat, line "boil", blinking, fire, smoke, flies, swaying meat |
| Text cards are static drawings | Text writes on letter by letter; the year counts up; crosses, ticks and arrows draw on with the words |
| Voice only, dead silence between lines | Synthesised music bed that ducks under the voice and drops out for the modern scenes, plus synced effects |
| No captions | Burned-in captions with the current word highlighted |
| Character drifts between shots | One code-drawn character, identical in every frame |

## Voice

`am_fenrir` from Kokoro (offline). All 12 Kokoro male voices were scored by
transcribing a test passage back with Whisper (all 0-2% word error), then by
pitch, pitch range and pace; `am_fenrir` was closest to the reference narrator
and the most expressive of the higher-rated voices. `am_michael` is a deeper,
calmer alternative: run `python3 tts.py am_michael` and rebuild.

## How it is built

| Step | File | Output |
|---|---|---|
| Voice (Kokoro, offline) | `tts.py` | `build/voice.wav`, `build/timeline.json` (shot and word timings) |
| Music and effects (numpy synthesis) | `sfx.py` | `build/mix.wav` |
| Drawings and animation (SVG) | `scenes.html`, `scenes.js` | rendered in Chromium |
| Frames to video | `render.mjs` | `build/video.mp4` |

`scenes.js` has a library of reusable scenes (`SC`) and a shot list (`SHOTS`)
that frames each phrase, so one drawing can serve several shots with a
different camera. Every animation and sound cue is keyed to word timings, so
picture, sound and captions stay in sync when the script changes.

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

Kokoro 0.7.4 has no dictionary entry for "Hadza", "favour" or "smartest";
`tts.py` gives those words an inline pronunciation. Captions keep the normal spelling.

## Known limits

- The voice is a free offline model. A recorded narrator or a paid voice would sound more natural; replace `build/voice.wav` (keeping the timings) or record to the script and rerun from `sfx.py`.
- The backgrounds are flat-colour vector art, simpler than the reference's painted scenes.
- The music is synthesised. A licensed track would sound richer; drop it in at the music step of `sfx.py`.
