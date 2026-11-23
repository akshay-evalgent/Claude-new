# Character swap (prototype)

This replaces one actor in a film clip with a brick-style 3D figure and gives that character new lines. The other actor keeps their real lines.
The first test is Biff in Back to the Future's Lou's Café scene, played by a parody caricature figure. It is a prototype: the figure sits over the actor like a puppet and is not a seamless replacement.

Run every step from a work folder that holds `seg.mkv` (the clip) and `seg.wav` (its audio):

1. `python3 sep.py`: splits the audio into voices (`vocals.wav`) and everything else (`novocals.wav`) with Demucs.
2. `python3 track.py`: finds a mask and a track id for every person in every frame (YOLO11 segmentation and ByteTrack), and saves them to `det/`.
3. `python3 ids.py`, then `python3 viz.py viz.jpg <frames>`: find the shot cuts, then draw every track id so you can pick the actor in each shot. Put those ids in `SHOTS` in `metrics.py` and `poses.py`.
4. `python3 metrics.py`: measures the actor's head position and width from the mask in every frame.
5. `python3 lines.py <voice>`: voices the new lines with Kokoro TTS. Edit `LINES` to set what is said and when.
6. `python3 poses.py`: builds a pose for every frame from hand-set keyframes (turns, arm moves, walking, knocking) and opens the mouth in time with the new lines.
7. `node figrender.js poses.json figframes`: renders the figure for every frame (three.js in headless Chromium).
   - Serve `fig/` first with `python3 -m http.server 8765`.
   - Copy `three.module.min.js` into `fig/` beforehand.
8. `python3 fill2.py A,C,E,F` builds a clean plate for every frame (`fills/`), saved as `fills/NNNN.jpg`. On this CPU it takes about 70 minutes.
   - **Real background first:** in shots where the actor walks away, it borrows real background from nearby frames. Frames where the actor wasn't detected are skipped, and a wide margin is kept around him so none of his pixels leak back in.
   - **LaMa (big-lama, `inpaint.py`) for the rest:** it redraws anything no frame ever shows. In a static shot that fill is held from frame to frame so it doesn't flicker.
   - **Wider hole:** the hole also takes in any of the actor's red shirt the mask missed, but only red patches touching him and outside everyone else, so other people's lips are left alone.
   - **Contact shots:** where the actor's hand touches someone, his real hand is left in place, so the other person's face is never redrawn.
   - The model goes in `../models/big-lama.pt` (from the simple-lama-inpainting release).
9. `python3 composite.py` places the figure over the clean plates and writes `swap16x9_v.mp4`.
   - **Scale:** set from the actor's head width; hand-held where the mask collapses.
   - **Contact shots:** the near arm reaches each frame to Biff's hand position, marked by eye in `HAND` in `poses.py`, with an enlarged hand that covers the real one.
   - **Occlusion:** the figure is hidden behind people in front of it and behind the counter.
10. `python3 assemble.py`: builds the vertical Short `swap_test.mp4`. It:
   - removes the actor's voice and adds the new lines with a touch of room echo;
   - mixes to -14 LUFS;
   - lays out a 4:3 window over a blurred fill, with a PARODY tag and one word of caption at a time.

**Limits:**
- Fast, motion-blurred hands aren't caught by the mask, so that second is cut.
- A new clip needs its shots, keyframes and hand marks set by hand: a few hours of work.
