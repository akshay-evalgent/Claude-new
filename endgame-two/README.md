# Endgame: The Second Future

A 5:56 animated retelling of Avengers: Endgame with blocky avatars (1920x1080, 24 fps).
It follows the film through the snap, the time heist and the final battle, then shows
the future Doctor Strange hid: the Avengers share the snap, Tony Stark lives, and
every hero who held on loses their powers.

- `out/endgame-the-second-future.mp4` is the finished film.
- `youtube-kit/` has thumbnails, titles, description and pinned comment.
- `script.json` is the narration and dialogue; `make_audio.py` builds voices, score and `build/timeline.json`.
- `engine.js` / `lib.js` are the shot engine and character library; `act0.js` holds the shared
  battlefield and cabin sets; `act1.js`..`act4.js` hold the other sets and all shots.

## Rebuild

```bash
npm install three@0.160.0
pip install piper-tts
# voices/ needs these Piper models (.onnx + .onnx.json) from rhasspy/piper-voices:
# en_US-ryan-high, en_US-amy-medium, en_US-joe-medium, en_US-hfc_male-medium,
# en_GB-alan-medium, en_GB-northern_english_male-medium
python3 make_audio.py
node render.mjs film 4
node render.mjs stills check 10 60 200   # contact sheet -> build/sheet_check.jpg
```

Set names must be unique across act files (a later `SET()` with the same name replaces the earlier one).
