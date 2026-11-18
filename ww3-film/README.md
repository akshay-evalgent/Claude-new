# What If World War 3 Happens

A 60-second, 1080p, 30 fps short film made with three.js.

- `what-if-world-war-3.mp4`: the finished video, with soundtrack.
- `film.html`: the film itself. Every frame is a pure function of time. Serve this folder over HTTP and open it for a live preview (space bar plays and pauses, arrow keys step one second).
- `render.js`: renders the film frame by frame in headless Chromium (Playwright).
- `audio.py`: synthesizes the soundtrack with NumPy.

## Rebuild

```bash
node render.js frames 0 60 out/frames
python3 audio.py
ffmpeg -framerate 30 -i out/frames/f%05d.jpg -i out/score.wav -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest what-if-world-war-3.mp4
```

## Sources for the figures on screen

- 12,187 warheads held by nine states: SIPRI Yearbook 2026.
- Up to 5 billion deaths from famine after a full-scale nuclear war: Xia et al., Nature Food, 2022.
- Doomsday Clock at 85 seconds to midnight: Bulletin of the Atomic Scientists, January 2026.

Earth imagery in `assets/` comes from the three.js examples (derived from NASA Blue Marble data). Fonts: Anton, Barlow Condensed and JetBrains Mono (SIL Open Font License).
