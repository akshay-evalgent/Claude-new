# Collider video: a remake in the style of "Earth's Deepest Hole"

A 6-minute documentary explainer, **"The Real Reason America Abandoned the Biggest Machine Ever
Planned"**, built to copy the script formula and visual style of Zoufry's *The Real Reason Why the
Soviets Abandoned Earth's Deepest Hole* (youtube.com/watch?v=jy95mci9egU).

| File | What it is |
|---|---|
| `ANALYSIS.md` | The style breakdown: script formula, shot pace, palette, type, motion, sound |
| `SCRIPT.md` | The new script with timestamps, the visual for each line, and fact notes |
| `CREDITS.md` | Every archive photo and clip used, with licence and source link, plus a credit line to paste into the description |
| `out/collider.mp4` | The finished video (v2: archive footage plus motion graphics), 1280x720, 30 fps, AAC stereo |
| `build/shots.py` | Script and shot list as data: one entry per narration line |
| `build/visuals.py` | v2 visual plan: real footage, photos and graphics for each line, plus the source list |
| `build/voice.py` | Narration with the offline Kokoro voice (`am_michael`), writes `timing.json` |
| `build/render.py` | v1 picture renderer and the graphic scene library (maps, schematics, callouts, chapter cards) |
| `build/render2.py` | v2 renderer: Ken Burns photos, graded and pillarboxed archive clips, a 3D ring, a 3D map tilt, the hearing-document stack, bloom, punch-in cuts. `prep` cuts the clips |
| `build/sound.py` | Generated score, effects, ducking and mix. `--v2` adds the cut, shutter, projector and impact effects |

## Where the footage comes from

Footage and photos come from CERN's video archive, U.S. Department of Energy photos of the SSC, NASA, the Reagan,
Bush and Clinton presidential libraries, the Architect of the Capitol, the Library of Congress, and the
congressional hearing reports on the Internet Archive, found via Wikimedia Commons. Only public domain, CC0, CC BY
and CERN-terms material is used. See `CREDITS.md`. Footage is not committed to this repo; `CREDITS.md`
lists the source links, and `visuals.py` lists the clip in-points.

## Rebuild

Needs Python 3 with `pycairo numpy scipy soundfile kokoro-onnx`, plus ffmpeg, the Inter and
Liberation Serif fonts, the Kokoro model files (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) and the
Natural Earth 50m country and state GeoJSON files.

```bash
python build/voice.py MODELS_DIR work/vo
```

```bash
python build/render2.py prep work/vo/timing.json FOOTAGE_DIR commons_videos.json
```

```bash
python build/render2.py render work/vo/timing.json FOOTAGE_DIR GEO_DIR work/picture.mp4
```

```bash
python build/sound.py work/vo/timing.json work/soundtrack.wav --v2
```

```bash
ffmpeg -i work/picture.mp4 -i work/soundtrack.wav -c:v libx264 -b:v 1750k -c:a aac -b:a 160k -af loudnorm=I=-14:TP=-1.5 -shortest out/collider.mp4
```

To check one frame without rendering the whole video, run
`python build/render.py work/vo/timing.json GEO_DIR stills/s --still "12,3.0"`
(shot 12 at 3 s).

To change the story, edit `build/shots.py`, then rerun all four steps.
