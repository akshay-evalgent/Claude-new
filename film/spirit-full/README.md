# "What Did Ancient Humans Believe In?"

DURATION, 1920x1080, 25 fps. 251 shots, 2,498 words, 10 chapters.
Thumbnails: `../pilot-fridge/thumbnails/spiritRef.png` and `spiritAlt.png`. Facts and sources: `SOURCES.md`.
Upload kit: `../upload-kit/spirit/`.

This project reuses the earlier films' scenes: `page.html` loads `../fridge-full/lib.js` and its scene files, then
`../doctor-full/scenes_doc.js`, `../bed-full/scenes_bed.js` and `../school-full/scenes_school.js`, then `scenes_spirit.js`,
which adds the scenes for this film (burials, chimp and elephant behaviour, Bruniquel, Blombos, Sungir, cave art, Lion Man,
trance dance, Göbekli Tepe, Newgrange, Stonehenge, house-floor burials), the `star` card icon and map regions. The video file is not in
git; rebuild it with the steps below.

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `../fridge-full/*.js`, `../doctor-full/scenes_doc.js`, `../bed-full/scenes_bed.js`, `../school-full/scenes_school.js`, `scenes_spirit.js` | rendered in Chromium |
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
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart spirit_full.mp4
```

`node render.mjs stills [s001 s002 ...]` renders one frame per shot for checking. Before the voice exists,
`python3 fake_tl.py` writes a stand-in timeline, and `TLFILE=timeline_fake.json node render.mjs stills` uses it.
A full render takes about 40 minutes with 4 workers.

## Writing new shots

Each line of `script.txt` is one shot:

```
text ~pause >> scene {"option": "value"} camera
```

- `+` at the start keeps the line in the same spoken breath as the previous one.
- `"@word"` or `"@word+0.2"` in an option means "when that word is spoken".
- `"DONE"` / `"NEVER"` mean "already happened" / "doesn't happen in this shot".
- Cameras: `push`, `pull`, or `[focusX, focusY, zoomStart, zoomEnd]`.
- New maps here: `amboseli`, `panga`, `qafzeh`, `hilazon`, `lachapelle`, `bruniquel`, `sungir`, `sulawesi`, `swabia`, `gobekli`, `britain`, `mauritius`, `oberkassel`, `wales`.
- Words Kokoro 0.7.4 can't pronounce get an entry in `SAY` in `tts.py`.
