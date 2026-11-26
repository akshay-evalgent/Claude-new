# yt-short: video notes

- **Voice:** none, as the brief asks. voice.py and transcribe.py were not run and there are no Film.captions. Every line, counter row and temperature comes from `script.js`, which is generated from `03-script/script.json` (clock keys, counter rows, the beats' timed lines). Lines use the script's current wording; the mood board frames show the older cold-open line.
- **Video:** `video.mp4`, 1080x1920, 30 fps, 59.90 s, -14.1 LUFS, peak -1.2 dBTP.
- **Transitions:** none. It is one continuous scene with nine beat sections in script order (coldopen, snow, boil, glow, sun, invisible, soup, edge, flake), all drawn by `world.set`. The cold open replays the scene at 28.0-31.0 s. At 3.0 s the scene flips to night in one frame, and the counters spin back over the last 0.1 s before it. The close releases the white into snowfall over 51.0-52.2 s.
- **Artwork:** none supplied. Everything is drawn with the lowpoly-first-person kit. I chose the poses: the snow beat at look level (yaw 2, pitch 0) while the title is up, then a tilt down to the palm; boil and glow at yaw -6 to -4, pitch 11; from 26-28 s a lift to the cold-open view, then a slow turn right.
- **Sound:** sound.py's bed with hits at 3.0, 4.9, 10.2, 13.5, 17.3, 23.8, 28.0, 34.5, 38.8, 42.3, 47.8, 51.0, 51.6 and 56.6 s, mixed to -14 LUFS. Not done: the script's 12 dB drop with ticks at 47.8-51.0 s, the pulse and the roar. sound.py can only make a bed and identical hits.
- **Proof fixes:** the last line now holds to the final frame. The flakes in the close start lower, so they no longer cross the clock block.

## FAIL rows left (misfits)

- orientation and aspect ratio: the brief sets a vertical Short; the reference is horizontal.
- longest shot, final shot share and first cut: the tool counts the world's changes of state as cuts. There are no edits. The cold open is meant to run 3 s.
- loudness: the brief sets -14 LUFS; the reference is -21.4.
- brightness and accent colour: the script's arc goes white from 35 to 51 s and ends on blue snow. The warm accent is present (#ca8840 / #5b3723).
