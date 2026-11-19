# Torn Spacesuit

A 53-second vertical (1080x1920, 30 fps) YouTube Short made with three.js: what happens if your spacesuit tears during a spacewalk, and the 1966 vacuum-chamber accident that shows you could survive it.

- `torn-spacesuit.mp4`: the finished video with narration, sound effects and score.
- `film.html`: the film. Every frame is a pure function of time. Serve this folder over HTTP and open it for a live preview.
- `vo/`: narration lines (`lines.txt`), the synthesized clips, and `timeline.json` with line and word timings used for the captions.
- `prep_vo.py`: places the narration clips on the timeline and estimates word timings.
- `audio.py`: synthesizes the score and sound effects and mixes them under the narration.
- `render.js`: renders frames in headless Chromium (Playwright). It skips frames that already exist, so an interrupted render can be resumed.

## Rebuild

The narration was synthesized offline with Piper TTS (`en_US-ryan-high` voice).

```bash
python3 prep_vo.py
python3 audio.py
node render.js frames 0 53 out/frames
ffmpeg -framerate 30 -i out/frames/f%05d.jpg -i out/mix.wav -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest torn-spacesuit.mp4
```

## Facts in the script

- The 1966 accident: on December 14, 1966, NASA suit engineer Jim LeBlanc's suit lost pressure in a vacuum chamber in Houston. He lost consciousness in about 15 seconds, later recalled the saliva on his tongue starting to bubble, and recovered after the chamber was repressurized.
- Earth imagery comes from the three.js examples (derived from NASA Blue Marble data). Fonts: Anton, Barlow Condensed and JetBrains Mono (SIL Open Font License).
