# "What Did Ancient Humans Do for Fun Before Phones?"

DURATION, 1920x1080, 25 fps. 157 shots, 1,789 words, 11 chapters.
Thumbnails: `../pilot-fridge/thumbnails/funV2.png` ("NO PHONE?") and `funV2b.png` ("OLDEST JOKE?"), v2 contrast split. Facts and sources: `SOURCES.md`.
Upload kit: `../upload-kit/fun/`.

Packaging follows the rules from the first analytics review (`../channel-plan/PLAN.md`): a curiosity title, a contrast-split thumbnail, and the same either/or question asked twice in the narration (about 40% of the way in, and just before the ending) and pinned as the first comment.

This project reuses the earlier films' scenes: `page.html` loads `../fridge-full/lib.js` and its scene files, then
the doctor, bed, school, spirituality, government and marriage scene files, then `scenes_fun.js`, which adds the scenes for this film (phone on the couch, screen time, the bored caveman, tickled rats, laughing apes and the laughter family tree, the stick doll, the leisure chart, Hadza gambling, knucklebones and the Maresha cache, Başur Höyük pieces, Senet, the Royal Game of Ur, Finkel's tablet, the lamassu graffiti, Indus wheeled toys, the spinning disc, string figures, the Cave of Swimmers, Beni Hasan wrestlers and jugglers, the rubber-ball game, the blanket toss and high kick, the dancing pot, Aka singing, the storyteller vote, the oldest joke, the Philogelos and the barber, the boredom book, the "just think" study, the phone-versus-fire ending), the `phone`, `bone2`, `ball`, `laugh` and `game` card icons and map regions. The video file is not in
git; rebuild it with the steps below.

## Pipeline

| Step | File | Output |
|---|---|---|
| Script with per-shot visuals | `script.txt` → `build_script.py` | `build/script.json` |
| Voice (Kokoro `am_fenrir`, speed 0.87) | `tts.py` | `build/voice.wav`, `build/timeline.json` |
| Drawings and animation | `page.html`, `../fridge-full/*.js`, `../doctor-full/scenes_doc.js`, `../bed-full/scenes_bed.js`, `../school-full/scenes_school.js`, `../spirit-full/scenes_spirit.js`, `../gov-full/scenes_gov.js`, `../wed-full/scenes_wed.js`, `scenes_fun.js` | rendered in Chromium |
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
ffmpeg -y -i build/video.mp4 -i build/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart fun_full.mp4
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
- New maps here: `kibale`, `ur`, `gilf`, `benihasan`, `manati`, `basur`, `hohlefels`, `laugerie`, `alaska`, `lascaux`, `india`.
- Words Kokoro 0.7.4 can't pronounce get an entry in `SAY` in `tts.py`.
