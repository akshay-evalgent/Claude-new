# Repo → Short

A format for vertical YouTube Shorts about GitHub repos. Each episode is fully coded:
picture, motion, typography, music and sound effects are all generated, so there is
no stock footage, no samples and no editing timeline. One command renders the MP4.

```
shorts/
  engine/                 shared by every episode
    core.js               easing, noise, kinetic text, captions, WebGL post (bloom, glitch,
                          chromatic aberration, motion/zoom blur, grain, vignette)
    render.cjs            headless Chromium → JPEG frames → ffmpeg, parallel workers
    audio_lib.py          synths, drums and SFX (numpy/scipy), bus mixing, reverb, limiter
    fonts/                Anton, Inter, JetBrains Mono, Instrument Serif (OFL)
  episodes/
    mocha/                Orange-3DV-Team/MoCha, "This is Dave." (46 s)
      cues.js             the timeline; read by both the picture and the score
      rig.js              one dancing skeleton, many bodies
      scene.js            the scenes
      score.py            music + sound design
      SCRIPT.md           beat sheet, fact check, YouTube title/description/pinned comment
      mocha_short.mp4     the render
```

## Render an episode

Needs Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy + scipy.

```bash
cd shorts/episodes/mocha
python3 score.py                                    # → out/audio_raw.wav
ffmpeg -i out/audio_raw.wav -af loudnorm=I=-14:TP=-1:LRA=11 -ar 48000 out/audio.wav
node ../../engine/render.cjs . --stills 3.2,21.5    # QA stills → out/stills/
node ../../engine/render.cjs . --fps 60 --workers 3 --out mocha_short.mp4   # → out/mocha_short.mp4
```

The output is upload-ready: H.264 High, 1080x1920, 60 fps, capped at 14 Mbps (about
80 MB for 46 s; film grain is what costs the bits), AAC 256k at -14 LUFS.
`--from/--to` render a slice, `--fps 30` gives a quick preview, and opening
`index.html?play` in a browser plays the episode live (`?t=12.5` shows one frame).

## How an episode gets made

1. **Read the repo for the story, not the features.** README claims, the demo assets,
   the numbers. Look for one thing a viewer can picture (MoCha: "same motion, new
   body") and one thing that is honestly funny (a 14B model, 2.7 s demo clips).
2. **Cast a character.** A person the tech happens to (Dave). Abstract tech doesn't go
   viral; a guy getting replaced does.
3. **Beat structure that has worked:** hook with the payoff in the first 3 s → title →
   "before" (comedy of excess) → "after" (how little it needs) → the wow, repeated
   with variations → a deadpan gag → "the catch" (sarcasm with real limits) → a
   callback ending → a cut back to frame 0 so it loops.
4. **Time it to music.** 120 BPM, bars on odd seconds, every scene change on a downbeat.
   `cues.js` holds the timings and the SFX hits, so the picture and the sound can't drift.
5. **Fact-check every on-screen claim** against the repo and write the sources into the
   episode's `SCRIPT.md`. Jokes are fine; invented numbers are not.
6. **Keep text in the Shorts safe area:** nothing important below y≈1500 or right of
   x≈940 (YouTube's title and buttons sit there). Captions at 74–96 px, high contrast.
7. **QA from stills first** (`--stills`, then `ffmpeg ... tile` contact sheets), then
   render the full film.

## Rights

Everything in the frame is drawn by code. Episodes don't use a repo's demo footage when
it contains film clips or real people's likenesses (MoCha's does), so a Short can't be
hit by Content ID or likeness claims. The description links to the real demos instead.
