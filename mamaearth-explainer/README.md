# Mamaearth brand explainer

A 42-second vertical motion graphic (1080x1920, 24 fps), built the same way as the Claude explainer it was tested against: every frame is HTML + GSAP, the score and sound effects are written in Python, and the render is a frame-by-frame capture.

Concept film. Not an official Mamaearth production.

## Files

| File | What it is |
|---|---|
| `index.html` | The film. One GSAP master timeline; `window.__seek(t)` jumps to any second. Open it in a browser and press Play to watch it with the score. |
| `score.py` | Writes `mix.wav` (score + effects), `score.wav` and `sfx.wav`. NumPy only. |
| `render.js` | Seeks the timeline one frame at a time, screenshots with Playwright, pipes the frames into ffmpeg with `mix.wav`. `node render.js stills` writes eight check frames instead. |
| `mamaearth-explainer.mp4` | The finished render. |

## The cut

96 BPM, so one beat is 0.625 s and every scene change sits on the grid.

| Time | Scene | What happens |
|---|---|---|
| 0.0 | Read the back of your bottle | Four jars drop on the beat: sulphates, parabens, mineral oil, silicones. A red strike crosses them. |
| 5.0 | Two parents asked one question | Leaf unfurls. "What if it was all safe?" |
| 10.0 | Goodness of Nature | Onion Hair Oil, Ubtan Face Wash and Vitamin C Serum rise; ingredient callouts pop. |
| 18.75 | MADE SAFE | The badge slams in; four "No ..." ticks draw on the beat. |
| 25.0 | Every order plants a tree | Trunk, canopy, falling leaves. |
| 31.25 | One shelf, all safe | Baby, Hair, Face, Body tiles. |
| 36.25 | End card | Wordmark, tagline, drifting leaves until 42.0. No frozen hold. |

## The score

Four-bar loop in D (D - G - Bm - A), 10 s per pass, one layer added each pass: plucked strings (Karplus-Strong), then bass and shaker, then kick and rim, then a top line. Final chord at 40.0, fade by 42.0. Mixed to -14 LUFS, -1 dBTP.

Effects, each on the frame the picture needs it: jar thuds, the strike scratch, a whoosh on every wipe, bottle pops, the stamp hit, four ticks, leaf rustle, tile taps, the end chime.

## Rebuild

```bash
python3 score.py
```

```bash
python3 -m http.server 8766 --directory . &
node render.js
```
