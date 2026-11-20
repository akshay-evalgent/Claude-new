# Subway Hero

A 52-second vertical Short (1080x1920, 30 fps) about Wesley Autrey, the "Hero of Harlem", built from two tools:

- **Blender Cycles** (`subway.py`) renders the realistic plates with no people in them: the train arriving over the drainage trough, its headlights in the tunnel, the undercarriage passing inches overhead, and the greasy blue cap.
- **three.js** (`film.html`) renders the stylized scenes with people (Wesley, his two daughters, the student, the woman who held the girls back, commuters). It also cuts in the Blender plates and draws the captions over everything.

Other files: `vo/` holds the narration (Piper TTS, `en_US-ryan-high`) and its word timings, `prep_vo.py` builds those timings, `audio.py` synthesizes the sound design and mixes it under the narration, and `render.js` renders frames in headless Chromium.

## Rebuild

```bash
python3 prep_vo.py && python3 audio.py
for s in B1 B2 B3 B4; do blender -b -P subway.py -- --shot $s --anim --pct 60 --samples 10; done
node render.js frames 0 52.2 out/frames
ffmpeg -framerate 30 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest subway-hero.mp4
```

The Blender plates render at 60% size (648x1152) and are scaled up in the cut; at full size each frame takes about a minute on a 4-core CPU.

## The facts

On January 2, 2007, at the 137th Street-City College station in Manhattan, Cameron Hollopeter, 19, had a seizure and fell onto the tracks. Wesley Autrey, a 50-year-old construction worker and Navy veteran who was there with his two young daughters, left the girls with a woman nearby, jumped down, and lay on top of Hollopeter in the drainage trough between the rails. The train braked, but all but two cars passed over them, close enough to leave grease on Autrey's cap. Both survived. Autrey received the Bronze Medallion, New York City's highest civic award. Sources: Wikipedia ("Wesley Autrey") and the Associated Press report of January 4, 2007 (NBC News).

The people are stylized stand-ins, not likenesses.
