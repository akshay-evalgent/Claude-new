# "How Did Ancient Humans Sleep Without Beds?"

15 min 53 s, 1920x1080, 25 fps. 334 shots, 2,662 words, 10 chapters.
Thumbnails: `../pilot-fridge/thumbnails/bedRef.png` and `bedAlt.png`. Facts and sources: `SOURCES.md`.
Upload kit: `../upload-kit/bed/`.

This project reuses the fridge film's engine and the doctor film's scenes: `page.html` loads `../fridge-full/lib.js` and its
scene files, then `../doctor-full/scenes_doc.js`, then `scenes_bed.js`, which adds the sleep scenes (sleepers, nests, bedding
layers, rock shelters, sleep charts), extra card icons (`moon`, `bed`, `eye`, `leaf`) and map regions. The video file is not in
git; rebuild it with the steps below.

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `../fridge-full/*.js`, `../doctor-full/scenes_doc.js`, `scenes_bed.js` | rendered in Chromium |
| Sound cue sheet, from the animation itself | `node render.mjs cues` | `build/cues.json` |
| Music, effects, mix | `sfx.py` | `build/mix.wav` |
| Video | `node render.mjs video 4` | `build/video.mp4` |

```bash
python3 build_script.py
```

```bash
python3 tts.py
```

```bash
node render.mjs cues
```

```bash
python3 sfx.py
```

```bash
node render.mjs video 4
```

```bash
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart bed_full.mp4
```

`node render.mjs stills [s001 s002 ...]` renders one frame per shot for checking. Before the voice exists,
`python3 fake_tl.py` writes a stand-in timeline, and `TLFILE=timeline_fake.json node render.mjs stills` uses it.
A full render takes about 40 minutes with 4 workers.

Note: the script spells "R E M" so the voice reads the letters. After `tts.py`, the three word tokens in shot `s133` are
merged into "REM" in `build/timeline.json` so the captions read normally; redo that if you regenerate the voice.

## Writing new shots

Each line of `script.txt` is one shot:

```
text ~pause >> scene {"option": "value"} camera
```

- `+` at the start keeps the line in the same spoken breath as the previous one.
- `"@word"` or `"@word+0.2"` in an option means "when that word is spoken".
- `"DONE"` / `"NEVER"` mean "already happened" / "doesn't happen in this shot".
- Cameras: `push`, `pull`, or `[focusX, focusY, zoomStart, zoomEnd]`.
- New maps here: `bordercave`, `sibudu`, `ohalo`, `swartkrans`, `wonderwerk`, `uganda`, `bolivia`, `namibia`, `colorado`, `orkney`, `egypt`, `madagascar`.
- Words Kokoro 0.7.4 can't pronounce get an entry in `SAY` in `tts.py`.
