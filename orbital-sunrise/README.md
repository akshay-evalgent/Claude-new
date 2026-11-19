# Orbital Sunrise

A 14-second photoreal shot of sunrise seen from the International Space Station, rendered with Blender's Cycles path tracer from free, real-world data. 1920x1080, 24 fps.

The camera floats behind the station over the Persian Gulf at night. City lights glow below, the sun breaks over the limb of the Earth about 4 seconds in, and the camera turns to find the station silhouetted against the sunrise.

- `orbital-sunrise.mp4`: the finished shot with an ambient score.
- `scene.py`: builds the whole scene in Blender (Earth, clouds, atmosphere, sun, NASA station model, camera, compositing) and renders it.
- `audio.py`: synthesizes the score.
- `RESEARCH.md`: the free tools, assets, repos and techniques behind it, plus a prompt template for cinematic shots.

## Rebuild

Needs Blender 4.5 LTS (free from blender.org). Run `./fetch_assets.sh` first to download the assets listed under Credits.

```bash
blender -b -P scene.py -- --still 200 --pct 50 --samples 8     # one test frame in out/
blender -b -P scene.py -- --anim 1 336 --fast 1 --samples 8   # every frame into out/frames/ (resumable)
python3 audio.py
ffmpeg -framerate 24 -i out/frames/f%04d.png -i out/score.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest orbital-sunrise.mp4
```

On a 4-core CPU a frame takes 20-35 seconds; any recent GPU is far faster (set `cy.device = 'GPU'`).

## Credits

- Earth textures: [Solar System Scope](https://www.solarsystemscope.com/textures/), CC BY 4.0 (based on NASA imagery).
- International Space Station (ISS) (B) model: NASA/Michael D. Carbajal, [NASA 3D Resources](https://science.nasa.gov/3d-resources/international-space-station-iss-b/). Use of NASA material does not imply NASA endorsement.
- Rendered with [Blender](https://www.blender.org) (GPL).

## Liberties taken

- The planet turns about three times faster than real orbital speed so the ground visibly moves, and the sun climbs about 8 degrees in 14 seconds.
- The station model has no textures; its materials (insulation blankets, solar cells, radiators, truss metal) are procedural.
- The atmosphere is an emissive shell whose brightness follows each view ray's tangent height, not a full scattering simulation.
