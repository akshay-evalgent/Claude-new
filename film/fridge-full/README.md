# "How Did Ancient Humans Keep Food Without Fridges?" (full video)

16 min 12 s, 1920x1080, 25 fps, -14.6 LUFS. 474 shots, 2,838 words, 13 chapters.
Thumbnail: `../pilot-fridge/thumbnails/fridge.png`. Facts and sources: `SOURCES.md`.

The video file itself is not in git (it is several hundred MB); rebuild it with the steps below.

## Chapters

| Start | Chapter | Music |
|---|---|---|
| 0:00 | Hook: your fridge, fridges are new, rewind 50,000 years, the objection | none, then curious |
| 1:28 | The enemy: bacteria, flies, the smell, Leeuwenhoek, feast and famine (Hadza: one big kill in thirty days) | tense |
| 2:59 | Your body as a fridge; animals that store food (leopard, hyena, squirrel, acorn woodpecker) | curious |
| 4:07 | Sun and wind: drying, biltong, ch'arki, stockfish, pemmican | curious |
| 5:35 | Fire and smoke; the honest part (Kharaneh IV) | curious |
| 6:41 | Qesem Cave: bones used like cans | wonder |
| 8:04 | Cold: Mezhyrich pits, kiviak, chuño | cold |
| 9:28 | Fermentation: Norje Sunnansund; your fridge's friendly bacteria | curious |
| 10:39 | Salt came late (Poiana Slatinei) | cold |
| 10:58 | Storehouses: Dhra', Gilgal; storage and inequality | wonder |
| 12:02 | Food that keeps itself: tubers, honey, the honeyguide | curious |
| 13:02 | The twist: Hadza sharing, Woodburn, hxaro, "a favour doesn't spoil" | warm |
| 14:50 | Ending: fridges, waste, community fridges, "Theirs stored friendship" | warm |

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `scenes.js` (pilot library), `lib.js` (runtime, maps, cards), `scenes_a/b/c/d.js` | rendered in Chromium |
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
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart fridge_full.mp4
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
