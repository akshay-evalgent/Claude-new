# Repo → Short

A format for vertical YouTube Shorts about GitHub repos. Picture, motion, typography,
music and sound effects are all generated in code, and real footage (the product's live
demo, the GitHub page, public-domain scans, licensed B-roll) is cut in where it proves
something. There is no editing timeline. One command renders the MP4.

```
shorts/
  engine/                 shared by every episode
    core.js               easing, noise, kinetic text, captions, WebGL post (bloom, glitch,
                          chromatic aberration, motion/zoom blur, grain, vignette), media:
                          images, frame-sequence clips, cover/Ken Burns, perspective warp
    kit.js                captions, pills, tilted browser frames with a coordinate mapper,
                          rings, highlighters, light leaks
    render.cjs            headless Chromium → JPEG frames → ffmpeg, parallel workers
    audio_lib.py          synths, drums and SFX (numpy/scipy), bus mixing, reverb, limiter
    fonts/                Anton, Inter, JetBrains Mono, Instrument Serif (OFL)
  episodes/
    mocha/                Orange-3DV-Team/MoCha, "This is Dave." (46 s, fully coded)
    mirofish/             666ghj/MiroFish, "He hoped for 1,000 stars." (48 s, real footage + code)
      cues.js             the timeline; read by both the picture and the score
      scene.js            the scenes
      score.py            music + sound design
      prep_media.py       media_src/ → graded 9:16 frame sequences + stills in media/
      tools/              fetch_media.sh, live-demo capture scripts (virtual clock)
      SCRIPT.md           beat sheet, YouTube title/description/pinned comment
      SOURCES.md          every clip and image with its licence, every claim with its source
      mirofish_short.mp4  the render
```

## Render an episode

Needs Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy, scipy and Pillow,
and poppler-utils (`pdftoppm`) for scanned books.

```bash
cd shorts/episodes/mirofish
bash tools/fetch_media.sh                                       # stock, scans, repo assets → media_src/
node tools/capture_demo.cjs media_src/cap tools/vtime.js       # live demo: landing, console, graph, env
node tools/capture_steps.cjs media_src/cap tools/vtime.js      # simulation, report, interaction
node tools/capture_github.cjs media_src/cap                    # the repo page, dark theme
python3 prep_media.py                                           # → media/ + media/manifest.js
python3 score.py                                                # → out/audio_raw.wav
ffmpeg -i out/audio_raw.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 out/audio.wav
node ../../engine/render.cjs . --stills 3.2,21.5               # QA stills → out/stills/
node ../../engine/render.cjs . --fps 60 --workers 3 --out mirofish_short.mp4
```

The output is upload-ready: H.264 High, 1080x1920, 60 fps, capped at 14 Mbps (about
80 MB for 46 s; film grain is what costs the bits), AAC 256k at -14 LUFS.
`--from/--to` render a slice, `--fps 30` gives a quick preview, and opening
`index.html?play` in a browser plays the episode live (`?t=12.5` shows one frame).

## Real footage

- **The product's own UI.** `tools/vtime.js` replaces the page's clock (`performance.now`,
  `Date`, timers, `requestAnimationFrame`) with a virtual one. The capture script advances
  it 160 ms at a time and screenshots each step at 2x, so animated UI (a knowledge graph
  building itself, posts streaming in) comes out smooth however slow the sandbox renders.
  Waits must keep the clock moving (`pumpUntil`), or a button waiting on app time never
  enables.
- **Stock and archives.** `prep_media.py` trims, crops to 9:16, grades and extracts frames
  per clip. Sources that worked from the sandbox: Coverr (free licence, 1080p), Internet
  Archive (Public Domain Mark book scans), the GitHub page and the project's own demo.
  Wikimedia Commons rate-limits the sandbox's IP (HTTP 429), and Pexels and Pixabay block
  it, so plan around those.
- **Media stays out of git.** Stock licences allow use in the video, not redistribution
  as a pack. Commit the scripts and `SOURCES.md`; `media_src/` and `media/` are ignored.

## How an episode gets made

1. **Read the repo for the story, not the features.** README claims, the demo assets,
   the numbers, and the press about who made it. Look for one thing a viewer can picture
   (MoCha: same motion, new body; MiroFish: a swarm rehearsing the future) and one
   thing that is honestly funny (MoCha's 2.7 s demo clips; MiroFish's own README warning
   about cost).
2. **Lead with a human.** Dave getting replaced; a student who hoped for 1,000 stars.
   Abstract tech doesn't go viral; people do.
3. **Beat structure that has worked:** hook with a number or a payoff in the first 3 s →
   reveal → how it works in 3 short steps, shown in the real product → the wow, repeated
   with variations → the strangest real use → "the catch" (sarcasm built on the project's
   own words) → a callback ending → a cut back to frame 0 so it loops.
4. **Time it to music.** 120 BPM, bars on odd seconds, every scene change on a downbeat.
   `cues.js` holds the timings and the SFX hits, so the picture and the sound can't drift.
5. **Fact-check every on-screen claim** and write the sources into `SOURCES.md`. Jokes are
   fine and get labelled; invented numbers are not. Watch for compression that changes a
   fact (the 1,000-star hope was about his first project, so the line says "his next
   project got 83,686").
6. **Keep text in the Shorts safe area:** nothing important below y≈1500 or right of
   x≈940 (YouTube's title and buttons sit there). Captions at 74–96 px, high contrast.
   Crop UI tight enough that its text is readable on a phone.
7. **QA from stills first** (`--stills`, then contact sheets), then render the full film.
   Fixes after a full render can be spliced: re-render the affected range with
   `--from/--to` and concatenate.

## Rights

- Don't use footage of real people or film clips from a repo's demos (MoCha's included a
  famous actor's likeness), so a Short can't be hit by Content ID or likeness claims.
- Prefer public domain, CC0, CC BY and Coverr. Avoid CC BY-SA: share-alike would apply
  to the whole Short. Credit CC BY sources in the description.
- A project's own UI, logo and screenshots are shown for commentary, with the repo
  credited in the description.
- Label illustrations that could pass for product output (MiroFish's "will you follow"
  feed is tagged SIMULATED · JOKE on screen).
