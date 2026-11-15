# Titanic: The Door Fits Two

A 5:52 animated retelling of Titanic with blocky avatars (1920x1080, 24 fps).
It follows the film through the voyage and the sinking, then changes one thing: Rose
ties her lifejacket under the door so it floats two. Jack lives, and the twist is
that a four-day love story has to survive real life.

- `out/titanic-the-door-fits-two.mp4` is the finished film; `youtube-kit/` has thumbnails, titles, description and pinned comment.
- `script.json` is the narration and dialogue; `make_audio.py` builds voices, score and `build/timeline.json`.
- `engine.js` / `lib.js` are the shot engine and character library; `act0.js` holds the shared ocean set
  (the ship, its sinking via `S.sink(k)`, iceberg, lifeboats, the door); `act1.js`..`act4.js` hold the other sets and all shots.

## Rebuild

```bash
npm install three@0.160.0
pip install piper-tts
# voices/ needs these Piper models (.onnx + .onnx.json) from rhasspy/piper-voices:
# en_US-ryan-high, en_US-amy-medium, en_US-joe-medium, en_US-hfc_male-medium,
# en_GB-alan-medium, en_GB-northern_english_male-medium
python3 make_audio.py
node render.mjs film 4
```

Set names must be unique across act files (prefix them per act).
