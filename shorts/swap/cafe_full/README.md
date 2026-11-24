# Full café scene: second half, plus the joined video

This folder builds the rest of the Lou's Café scene (film time 44.8–88.0 s) and joins it to the first half in `../`.

**Config:** every per-clip choice lives in `cfg.json`:
- `shots`: name → [first frame, last frame, actor track id, ids of people in front of him];
- `fill_shots`, `prop`, `persist`: how each shot is cleaned up;
- `contact`: the id of the person the actor touches in each shot;
- `cari` and `hold_hw`: the figure's size;
- `clip`: the counter line the figure stands behind;
- `manual`: hand-set head paths for shots where the actor is half out of frame;
- `hand`: keyframes, marked by eye, for the figure's reaching hand;
- `keys`: pose keyframes;
- `walk`: frames where the figure walks.

**Steps:**
1. `track.py` and `sep.py` as before. Then shift the tracking files by one frame: the tracker's file *i* is video frame *i*+1.
2. Run `ids.py` and `viz.py` to find the track ids, and `handgrid.py` to mark hand positions. Fill in `cfg.json`, then run `metrics.py`.
3. Voice the lines with `lines.py`, then build the sound and captions with `audio2.py`.
4. Run `poses.py` and then `figrender.js` twice. The second pass solves the reaching arm from the first pass's measurements.
5. Run `fill2.py S1,S2,…` (clean plates), then `composite.py`.
6. Run `final.py` to join the first half (`../swap16x9_v.mp4`, `../swap_audio.wav`, `../swap_words.json`) to this one and write `brick_swap_full.mp4`.
   - It skips the second half's first 10 frames, where Biff's hands are on George's face.
