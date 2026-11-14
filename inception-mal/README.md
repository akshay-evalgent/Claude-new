# Inception: What If Mal Was Right?

A 5:49 animated retelling of Inception with blocky avatars (1920x1080, 24 fps).
It follows the film's plot through the heist and limbo, then changes one thing:
Mal woke up, Cobb is the one still dreaming, and the whole job was her attempt
to plant a single idea in him: come home.

- `out/inception-what-if-mal-was-right.mp4` is the finished film.
- `script.json` is the narration and dialogue, grouped into chapters.
- `make_audio.py` generates the voices (local Piper models), score, ambience and `build/timeline.json`.
- `engine.js` is the timeline/shot engine; `lib.js` has characters and props.
- `act1.js`..`act4.js` hold the sets and shots (one shot per narration sentence).

## Rebuild

```bash
npm install three@0.160.0
pip install piper-tts
# voices/ needs en_US-ryan-high, en_US-amy-medium, en_US-joe-medium, en_GB-alan-medium (.onnx + .onnx.json) from rhasspy/piper-voices
python3 make_audio.py
node render.mjs film 4
node render.mjs stills check 10 60 120   # contact sheet at those seconds -> build/sheet_check.jpg
```

`render.mjs` is resumable (it skips frames already in `build/frames`) and loads
Playwright from `/opt/node22/lib/node_modules/playwright`.
