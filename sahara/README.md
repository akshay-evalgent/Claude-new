# Lost in the Sahara

A 58-second vertical short (1080×1920, 24 fps) in the style of fast narrated 3D explainers: the story of
Mauro Prosperi, who got lost during the 1994 Marathon des Sables and walked for nine days.

- **People:** MakeHuman characters (MPFB) driven by CMU motion capture, through `../asset-kit/blender/human.py`.
- **World:** Blender Cycles — procedural dunes with a Poly Haven sand texture, a physical sky, a shrine, a camp.
- **Edit:** `film.html` lays the rendered plates under word-by-word captions, labels and three drawn maps.
- **Sound:** Kokoro narration (`vo/`) over a synthesized bed (`audio.py`).

## Build

```bash
../asset-kit/setup.sh                      # Blender, MPFB, assets, mocap (once)
python vo/make.py <kokoro.onnx> <voices.bin> && python prep_vo.py   # narration + word timings
./render_all.sh                            # 18 shots, 1080 frames -> out/plates/ (resumable, ~2.5 h on 4 cores)
python audio.py                            # out/mix.wav
node render.js frames 0 58.54 out/frames   # composite every frame in headless Chromium
ffmpeg -framerate 24 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest lost-in-the-sahara.mp4
```

One test frame of a shot: `blender -b -P scene.py -- --shot D2 --still 25 --pct 50`.

## What is true, and what is not certain

The story follows Prosperi's own account (BBC, Wikipedia, interviews). The storm on day four, the abandoned
shrine, nine days alone and being found by nomads across the Algerian border are consistently reported.
How far off course he was varies by source (291 km on Wikipedia, others close to 300), as does the weight
he lost (about 15–18 kg). The bat-blood claim is his; the race's founder has questioned parts of the story,
so the narration says "he says". He returned to the race in 1998. The maps are schematic, not to scale.

## Credits

MakeHuman / MPFB assets (CC0), CMU Graphics Lab Motion Capture Database (free for any use),
Poly Haven textures (CC0), Kokoro-82M voice (Apache 2.0), Blender (GPL).
