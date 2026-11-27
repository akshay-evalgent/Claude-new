# Animatic engine

This tool turns an episode `timeline.js` into a fully timed **3D blocky animatic**. It sits at stage 5 of the style bible pipeline (§10). The output has:

- blocky characters and sets in the vanilla style
- word-by-word captions, name tags, round labels, the score HUD and the watermark
- **voice-over**: a distinct neural TTS voice per character (Kokoro, runs locally), checked with speech recognition, plus **real CC0 animal recordings** (barks, bleats, squawks, meows)
- SFX and chiptune music cues, mixed to −14 LUFS
- a 1280×720 thumbnail and an `.srt` captions file

It is **not** the final animation. Its purpose is to lock timing, staging and jokes before the animators, VO cast and sound designer spend real time. Replace the TTS with real voice actors when the cut is locked, the synth SFX and music with licensed audio, and the box rigs with proper Mine-imator or Blender (MCprep) rigs.

## Build an episode

```bash
cd minecraft-channel/animatic
npm install            # three.js + caption fonts (Montserrat, Press Start 2P)
./build.sh ep01-pets   # ~20 min on 4 CPU cores at 1080p30
```

Output goes to `out/<episode>/`, which git ignores:

| File | What |
|---|---|
| `<ep>_animatic.mp4` | 1920×1080, 30 fps, H.264 + AAC, −14 LUFS |
| `<ep>.srt` | dialogue captions for the YouTube CC track |
| `thumbnail.jpg` | 1280×720 thumbnail; `thumbnail_160.jpg` is the small-size readability check |
| `cues.json` | every line, syllable, SFX and music cue with timings |

### Faster loops while editing

These are useful while you're changing a timeline:

```bash
node render.cjs ep01-pets --frames 0,300,900 --scale 0.5   # a few stills
node render.cjs ep01-pets --from 1500 --to 1800             # one range to video segments
```

Set `SKIP_RENDER=1 ./build.sh ep01-pets` to rebuild only the audio, mux and thumbnail.

## Voice-over

```bash
python3 -m venv ~/tts && ~/tts/bin/pip install kokoro-onnx==0.4.9 soundfile faster-whisper
# model files: kokoro-v1.0.onnx + voices-v1.0.bin from github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0)
node render.cjs ep01-pets --frames 0 --scale 0.25          # writes out/ep01-pets/cues.json (every line)
~/tts/bin/python vo.py ep01-pets --model <kokoro dir> --sfx sfx --qc
```

`vo.py` writes one WAV per line plus `manifest.json` into `../episodes/<ep>/vo/`. With `--qc`, each take is transcribed. If the recognizer doesn't clearly understand a take, the script retries it with alternative spellings and speeds and keeps the best one. Casting (voice, speed, pitch, filter) is the `CASTING` table at the top of `vo.py`. On the next build the engine reads the manifest, so captions, mouth movement and shot lengths follow the real recording. A shot grows if a line runs long, and lines never overlap.

To replace the TTS with real actors, drop recorded WAVs in with the same file names (or edit `manifest.json`) and rebuild.

Animal sounds are in `sfx/`. They are all CC0 recordings; see `sfx/CREDITS.md`. In a timeline, use `s.sfx('bark' | 'bark_double' | 'whimper' | 'howl' | 'squawk' | 'squawk_macaw' | 'meow' | 'purr' | 'crickets' | 'cheer', at, vol)`.

## How it works

| File | Role |
|---|---|
| `engine/textures.js` | procedural 16×16 block textures (grass, planks, wool, stone …) |
| `engine/rig.js` | box-rig builder (1 px = 1/16 block) and the 11-expression face drawer |
| `engine/cast.js` | character designs (see `../cast/*.md`) and pose libraries |
| `engine/world.js` | sets and props: stage, scoreboard, "lava" pit, fence, sign, bowls … |
| `engine/dsl.js` | the timeline language: `shot`, `say`, `move`, `pose`, `expr`, `sfx`, `burst` …, compiled to keyframes |
| `engine/main.js` | evaluates the timeline at time *t*, renders the scene in three.js, draws the 2D overlay |
| `render.cjs` | headless Chromium; renders frame ranges in parallel workers and pipes them into ffmpeg |
| `vo.py` | per-character TTS voice-over + speech-recognition QC → `episodes/<ep>/vo/` |
| `audio.py` | mixes recorded VO, real animal SFX, synth SFX and music from `cues.json` (numpy only) |

### Writing a timeline

Each episode is a folder at `../episodes/<ep>/timeline.js`. Shots are written in order, and actions inside a shot use shot-relative seconds:

```js
E.shot('S10', 3.6, podMed('rex'), 'Rex shoves his bowl forward, then stares at it.', (s) => {
  s.say('rex', 'YES! Take *ALL* of it!', 0.15);   // *word* = caption accent + emphasis
  s.pose('rex', 'swipe', 0.5);
  s.move('bowl_rex', [-5.48, 1, 0.8], 0.55, 0.2, { face: false });
  s.expr('rex', 'teary', 2.1);                     // expression swaps auto-add a blip
  s.sfx('whimper', 2.3);
});
```

The shot description becomes the row text in the generated `shotlist.md`. Captions are chunked automatically to at most 3 words and timed word by word against the voice, as §7.1 of the bible requires.
