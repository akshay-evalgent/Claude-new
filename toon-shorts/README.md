# toon-shorts

A code-only pipeline for **vertical animated comedy sketches** (1080x1920, 24 fps)
in the style of channels like Plan3: flat-colour anime-style characters,
soft painted backgrounds, top-of-frame captions, a channel watermark,
voiced dialogue with lip-flap, and punchy cuts with sound effects.

The characters, sets, sketches and branding are original. Nothing is traced
or copied from any channel. The default watermark is **"Side Quest"**; change
`brand` in an episode file.

## Rendered so far

| Episode | Length | File |
|---|---|---|
| Entry Level: 5 years of experience for a role made yesterday | 40 s | `out/entry_level/entry_level.mp4` |
| Salary: negotiating for "exposure" | 23 s | `out/salary/salary.mp4` |

Each `out/<slug>/` also has `sheet.jpg` (one frame per beat), `thumbnail.png`
and `timeline.json` (beat start times and lines).

## Assets

- `assets/characters/<name>_expressions.png`: every expression for each cast member
- `assets/characters/<name>_<pose>.png`: transparent cut-outs (rest, shrug, wave, mug, fist)
- `assets/sets/office_sharp.png`, `office_blurred.png`: the background plate

## Make a video

```bash
pip install -r requirements.txt
python -m toon.render episodes/entry_level.py            # mp4 + contact sheet
python -m toon.render episodes/entry_level.py --stills   # contact sheet only (fast)
python -m toon.export_assets episodes/entry_level.py     # character sheets, set plates, thumbnail
```

Piper voice models download to `.cache/voices/` on first use; synthesized
lines are cached in `.cache/tts/`. A 40 s short renders in about 40 s on 4 cores.

## Write a new sketch

Copy `episodes/salary.py`. An episode is a cast plus a list of **beats**; each
beat is one shot. A beat with `say` lasts as long as its voice line. Main keys:

| Key | Meaning |
|---|---|
| `shot` | `"wide"`, `"two"`, `("cu", who)`, `("mcu", who)`, `("ecu", who)`, `("at", x, y, zoom)` |
| `say` | `(who, line)` gives TTS, lip-sync and caption |
| `expr`, `pose`, `facing`, `x`, `visible` | `{who: value}`, carried into later beats |
| `move` | `{who: (x_from, x_to, {t0, t1, ease, cadence, bob})}` is a walk |
| `sfx` | `[(name, offset_s, gain)]`: whoosh, impact, door, creak, tick, steps, sip, sad_trombone, pop, ding |
| `punch`, `shake`, `flash`, `push`, `pan`, `rack_focus` | camera accents |
| `caption` | overrides the on-screen text (`""` hides it) |
| `card` | full-screen title card ("40 years later") |

**Expressions:** neutral, happy, smile, smug, shocked, confused, determined,
unbothered, sip, tired, proud, dead, annoyed.

**Poses:** rest, mug, sip, shrug, fist, wave, cane, point, think.

**Character looks** (`look` dict): `skin`, `hair`, `hair_style` (spiky / bob / old),
`eyes`, `outfit` (hoodie / blazer), `outfit_color`, `inner_color`, `glasses`, `old`.

**Voices:** any Piper `en_US-*` model name; `speed`, `pitch` and `tempo_fix`
shape it (the old man is Ryan pitched down and slowed).

## Layout

```
toon/character.py   vector rig: head, eyes, mouths, hair styles, IK arms, props
toon/sets.py        painted backgrounds (blurred once) + foreground desk layer
toon/audio.py       Piper TTS, lip-sync envelope, synthesized SFX, mixer
toon/render.py      timeline, camera, captions, frame loop, ffmpeg encode + loudnorm (-14 LUFS)
toon/export_assets.py
episodes/*.py       scripts
```
