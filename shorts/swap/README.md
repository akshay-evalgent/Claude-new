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
8. `python3 composite.py`: removes the actor and places the figure over them, producing `swap16x9_v.mp4`. It:
   - inpaints the actor's mask, plus any of their red shirt the mask missed;
   - scales the figure from the head width;
   - hides the figure behind anyone standing in front of the actor and behind the counter.
9. `python3 assemble.py`: builds the vertical Short `swap_test.mp4`. It:
   - removes the actor's voice and adds the new lines with a touch of room echo;
   - mixes to -14 LUFS;
   - lays out a 4:3 window over a blurred fill, with a PARODY tag and one word of caption at a time.

**Limits:** fast, motion-blurred hands are not caught by the mask; the test simply cuts that second out. Large inpainted areas, such as where the actor's arm covered someone's face, show as soft smudges.
