# "How Did Ancient Humans Survive Without Doctors?"

14 min 46 s, 1920x1080, 25 fps, -14.7 LUFS. 328 shots, 2,456 words, 8 chapters.
Thumbnails: `../pilot-fridge/thumbnails/doctorRef.png` and `doctorAlt.png`. Facts and sources: `SOURCES.md`.
Upload kit: `../upload-kit/doctor/`.

This project reuses the fridge film's engine: `page.html` loads `../fridge-full/lib.js` and its scene files, then
`scenes_doc.js` adds the medical scenes and map regions. The video file is not in git; rebuild it with the steps below.

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `../fridge-full/*.js` (engine and shared scenes), `scenes_doc.js` | rendered in Chromium |
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
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart doctor_full.mp4
```

`node render.mjs stills [s001 s002 ...]` renders one frame per shot for checking.
A full render takes about 40 minutes with 4 workers.

## Writing new shots

Each line of `script.txt` is one shot:

```
text ~pause >> scene {"option": "value"} camera
```

- `+` at the start keeps the line in the same spoken breath as the previous one.
- `"@word"` or `"@word+0.2"` in an option means "when that word is spoken".
- `"DONE"` / `"NEVER"` mean "already happened" / "doesn't happen in this shot".
- `"today": true` draws present-day people (everyday clothes, bows instead of spears), used for the Hadza and Ju/'hoansi.
- Cameras: `push`, `pull`, `sunToMeat`, or `[focusX, focusY, zoomStart, zoomEnd]`.
- Maps: `map {"region": "israel"|"jordan"|"ukraine"|"sweden"|"tanzania"|"kalahari"|"safrica"|"andes"|"plains"|"greenland"|"romania", "label": "..."}` and `worldMap {"pins": [...]}`.
- Words Kokoro 0.7.4 can't pronounce get an entry in `SAY` in `tts.py`.

