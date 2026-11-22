# How a Car Engine Works

A 1 min 46 s explainer film about the four-stroke petrol engine, built entirely in Three.js and rendered in real time in the browser. Every frame is a pure function of film time, so the same page plays interactively and renders to an MP4 frame by frame.

## What it covers

| Time | Chapter | What you see |
|---|---|---|
| 0:00 | Title | A solid inline-four turning over under studio lights |
| 0:07 | What's inside | A scan plane sweeps the engine into x-ray, then an exploded view with labelled parts |
| 0:23 | One cylinder, four strokes | Cylinder 1 isolated; intake, compression, power and exhaust at about 1/150 speed, with gas particles, the spark, the flame front, a live cycle dial and a pressure–volume diagram |
| 0:59 | Push becomes rotation | The crank pin's circle against the piston's straight line, a live piston-height trace, the flywheel |
| 1:11 | Keeping time | The timing belt, 20-tooth crank gear and 40-tooth cam gears, with a turn counter proving the 2 : 1 ratio |
| 1:23 | Four cylinders, taking turns | All four cylinders running the 1-3-4-2 firing order |
| 1:36 | Recap | Suck. Squeeze. Bang. Blow. |

The engine is modelled to real proportions: 86 mm bore and stroke (a 2.0-litre four), a 145 mm rod, 10 : 1 compression, 16 valves on two cams. Piston motion uses the exact slider-crank equation, valve lift comes from the same profile the cam lobes are cut to, and the P–V loop follows a polytropic compression and a Wiebe burn curve.

## Files

- `film.html` — the film and its player. One file; it loads Three.js r160 and Google Fonts from their CDNs. It is written as page content without a `<html>` wrapper (the form the artifact viewer expects).
- `index.html` — the same page wrapped as a standalone document, for opening directly in a browser. Regenerate it after editing `film.html` with `node render.mjs --html`.
- `render.mjs` — renders the film to MP4 (picture and the synthesized score) in headless Chromium.

## Watch it

Open `index.html` in a current desktop browser, or serve the folder (`npx serve .`) and open it. Space plays and pauses, the arrow keys skip 5 s, M mutes, F goes full screen, and the scrubber jumps between chapters.

## Render the video

Needs Node 18+, the `playwright` package with Chromium, and `ffmpeg`.

```bash
node render.mjs --jobs 3
```

That writes `how-a-car-engine-works.mp4` (1920×1080, 30 fps, H.264 + AAC). Other options: `--fps 24`, `--crf 20`, `--from 23 --to 59` for one chapter, `--silent` for no audio, and `--stills 3,17,44 --dir stills` for a few JPEG frames. Set `THREE_DIR` to an unpacked `three@0.160.0` package to load Three.js from disk instead of the CDN.

## How it is built

- **X-ray reveal**: every static housing has two materials. A physical material, patched with `onBeforeCompile`, discards fragments past a moving plane and glows along the cut; a twin fresnel shader draws only past that plane. Edge lines come from `EdgesGeometry`.
- **Gas**: about 1,000 particles, each placed from its own seed and the cylinder's crank angle alone (port, valve gap, swirl inside the shrinking or growing chamber, exhaust port), so scrubbing backwards is exact.
- **Combustion**: a spark sprite, a flame-front volume shader clipped to the chamber, ember particles and a point light that lights the piston crown.
- **Post**: HDR bloom, ACES tone mapping, a vignette, slight chromatic aberration and film grain.
- **Sound**: the whole score is rendered once with an `OfflineAudioContext`: five pad chords, an intake whoosh, a compression rise, the power-stroke boom, valve ticks, and in the firing-order chapter a note per cylinder, so the 1-3-4-2 order plays as a melody. Engine events are found by scanning the same crank-angle timeline the picture uses.
