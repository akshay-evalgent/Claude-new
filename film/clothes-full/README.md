# "Why Did Humans Start Wearing Clothes?"

DURATION, 1920x1080, 25 fps. 132 shots, 1,730 words, 8 chapters.
Thumbnails: `../pilot-fridge/thumbnails/cloV2.png` ("NO CLOTHES?") and `cloV2b.png` ("170,000 YEARS"), v2 contrast split. Facts and sources: `SOURCES.md`.
Upload kit: `../upload-kit/clothes/`.

Packaging follows the rules from the first analytics review (`../channel-plan/PLAN.md`): a curiosity title, a contrast-split thumbnail, and the same either/or question asked twice in the narration (about 40% of the way in, and just before the ending) and pinned as the first comment.

This film goes further on animation: every explaining line has its own drawing, and options like `{"a":"@word"}` make each step of an animation land on the spoken word. Run the cue check before the voice is built: every `@word` must appear in that shot's own text, or the step falls back to 0.3 s and misses its moment.

The story is a three-clue mystery (your skin, a tiny bug, a needle), built so viewers have things to repeat to friends: chimp-level hair-follicle density, lice dating clothes, toes that remember shoes, pink fibres, the Tarkhan Dress found in a bag of laundry, trousers invented for riding.

This project reuses the earlier films' scenes: `page.html` loads `../fridge-full/lib.js` and its scene files, then
the doctor, bed, school, spirituality, government, marriage and fun scene files, then `scenes_clo.js`. That file adds a new character system, `fig()`, with outfits (`bare` with a leaf, `fur` with an adjustable `furAmt`, `hide`, `cape`, `parka`, `otzi`, `beads`, `tunic`) and shivering, plus about 60 scenes (the clue board, arm hair and follicles, fur fading, sweat glands, darkening skin, the DNA clock, head and clothing lice, the lice family tree, hide processing, Moroccan bone tools, fur animals, Neanderthal cord, the needle, sewing a parka, the Arctic, cape versus parka, toe-bone X-rays, dyed fibres, woven caps, Sungir beads, shell beads, Ötzi dressing up, the Tarkhan Dress, trousers on horseback, old shoes and sandals, the recap, the series wall, the morning wardrobe). The video file is not in
git; rebuild it with the steps below.

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `../fridge-full/*.js`, `../doctor-full/scenes_doc.js`, `../bed-full/scenes_bed.js`, `../school-full/scenes_school.js`, `../spirit-full/scenes_spirit.js`, `../gov-full/scenes_gov.js`, `../wed-full/scenes_wed.js`, `../fun-full/scenes_fun.js`, `scenes_clo.js` | rendered in Chromium |
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
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart clothes_full.mp4
```

`node render.mjs stills [s001 s002 ...]` renders one frame per shot for checking. Before the voice exists,
`python3 fake_tl.py` writes a stand-in timeline, and `TLFILE=timeline_fake.json node render.mjs stills` uses it.
A full render takes about 25 minutes with 4 workers.

## Writing new shots

Each line of `script.txt` is one shot:

```
text ~pause >> scene {"option": "value"} camera
```

- `+` at the start keeps the line in the same spoken breath as the previous one.
- `"@word"` or `"@word+0.2"` in an option means "when that word is spoken".
- `"DONE"` / `"NEVER"` mean "already happened" / "doesn't happen in this shot".
- Cameras: `push`, `pull`, or `[focusX, focusY, zoomStart, zoomEnd]`.
- New maps here: `morocco`, `georgia2`, `sungir2`, `yana`, `armenia`, `oregon`, `bizmoune`, `alps2`.
- Words Kokoro 0.7.4 can't pronounce get an entry in `SAY` in `tts.py`.
