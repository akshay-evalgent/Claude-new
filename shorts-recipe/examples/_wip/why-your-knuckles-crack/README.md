# Why Your Knuckles Crack (work in progress, parked)

Parked on 14 Nov 2026 to make a cat short first. Nothing here has been rendered yet.

## What exists

- `script.txt`: 98 words, ends on "so" to loop into "When you crack your knuckles…"
- `vo.wav`, `words.json`: the voice (Kokoro `am_fenrir`, speed 0.9, 178 wpm, 33.1 s) and its word timings. The cue table in `src/parts/framework-and-cues.js` matches this voice.
- `src/parts/hand-rig.js`: a detailed hand for macro shots (creased finger segments, nails, sleeve cuff, an x-ray skeleton inside).
- `src/parts/sets.js`: a gamer's room at night, a cutaway finger joint (bones, cartilage, capsule, fluid, the gas bubble, a pressure gauge, a stopwatch), an MRI room with a live scan monitor, and a doctor's office with a time-lapse window, calendar and tally counter.
- `src/parts/shots.js`: 16 shots.

## To finish

1. Concatenate, in this order: `framework-and-cues.js`, `../why-we-get-brain-freeze/src/parts/rig-and-materials.js`, `../why-we-get-brain-freeze/src/parts/props-and-boardwalk.js`, `../why-we-get-brain-freeze/src/parts/anatomy.js` (for `BONE_B`, the one missing reference when this was parked), `hand-rig.js`, `sets.js`, `shots.js`, then `render-pipeline.js` with the transition table set to `{ 3: [C.yousee - 0.14, C.yousee + 0.16, 3], 11: [C.but - 0.1, C.but + 0.22, 1], 12: [C.one - 0.12, C.one + 0.18, 4] }`.
2. Render test stills for every shot and fix framing. None of the shots have been looked at yet.
3. Render, mix, caption and package like the other examples.

## Facts to check before publishing

- The pop is a gas cavity forming in the joint fluid, filmed with real-time MRI: Kawchuk et al. 2015, *PLOS ONE*.
- It takes about 20 minutes before the same joint can crack again: Unsworth, Dowson & Wright 1971.
- One doctor cracked only his left hand for about 60 years and found no arthritis in either hand: Unger 1998, *Arthritis & Rheumatism* (Ig Nobel Prize 2009).
