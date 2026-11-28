# Collider video: a remake in the style of "Earth's Deepest Hole"

A 6-minute documentary explainer, **"The Real Reason America Abandoned the Biggest Machine Ever
Planned"**, built to copy the script formula and visual style of Zoufry's *The Real Reason Why the
Soviets Abandoned Earth's Deepest Hole* (youtube.com/watch?v=jy95mci9egU).

| File | What it is |
|---|---|
| `ANALYSIS.md` | The style breakdown: script formula, shot pace, palette, type, motion, sound |
| `SCRIPT.md` | The new script with timestamps, the visual for each line, and fact notes |
| `out/collider.mp4` | The finished video, 1280x720, 30 fps, AAC stereo |
| `build/shots.py` | Script and shot list as data: one entry per shot |
| `build/voice.py` | Narration with the offline Kokoro voice (`am_michael`), writes `timing.json` |
| `build/render.py` | Picture: every scene is drawn with cairo, rendered in parallel, encoded with ffmpeg |
| `build/sound.py` | Generated score, effects, ducking and mix (nothing sampled from the reference) |

## Rebuild

Needs Python 3 with `pycairo numpy scipy soundfile kokoro-onnx`, plus ffmpeg, the Inter and
Liberation Serif fonts, the Kokoro model files (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) and the
Natural Earth 50m country and state GeoJSON files.

```bash
python build/voice.py MODELS_DIR work/vo
```

```bash
python build/render.py work/vo/timing.json GEO_DIR work/picture.mp4
```

```bash
python build/sound.py work/vo/timing.json work/soundtrack.wav
```

```bash
ffmpeg -i work/picture.mp4 -i work/soundtrack.wav -c:v libx264 -b:v 1750k -c:a aac -b:a 160k -af loudnorm=I=-14:TP=-1.5 -shortest out/collider.mp4
```

To check one frame without rendering the whole video, run
`python build/render.py work/vo/timing.json GEO_DIR stills/s --still "12,3.0"`
(shot 12 at 3 s).

To change the story, edit `build/shots.py`, then rerun all four steps.
