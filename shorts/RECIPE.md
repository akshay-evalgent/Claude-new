# Story-Recap Shorts: the recipe

This is the format reverse-engineered from @MomentumMotivation-YT (224 shorts, 27 over 1M views), with the improvements built in. `render.py` applies all of it automatically from an edit list (`edits/*.json`).

## 1. Pick the clip (most important step)

Only use a source if it has all of these:
- **One clear emotional turn caught on camera**: a reveal, a reunion, a confession.
- **A visible face reaction at the payoff.** Tears, hands over the mouth, a hug.
- **A story that fits in 45s or less** once narrated.
- **A creator you can credit and ask.** Network/news clips (CBS, BGT, ViralHog) can get Content ID claims.

Their winners are almost all real-life emotional stories: grandpa/late wife, long-lost parent, a stranger's kindness, veterans. Scam/brand explainers stall at about 40–60K views, so stay in one lane.

## 2. Script structure (30–55s)

| Time | Beat | Rule |
|---|---|---|
| 0–4s | **Cold open**: an original soundbite | The line that raises a question without answering it ("Thank you for saving my life on 9/11, Darla."). No narrator yet. |
| 4–10s | **VO setup**: who + the wound | One sentence. An anonymous subject ("this grandpa", "she"), a specific number ("52 years", "16 years"). |
| 10–35s | **Story**: alternate VO and clip | Narrator bridges in 1–2 sentences, the original clip carries the emotion. Each VO line adds exactly one new fact. Start lines with "So…", "Then…", "But…". |
| ~60% | **Re-hook** | A short VO tease before the payoff: "But when the garage door finally opened…", "Then… after 52 years…". |
| last 5–10s | **Payoff**: original reaction | Tears/hug/reveal with an impact hit. **End on the strongest line and cut. No outro.** |
| end→start | **Loop** | Pick a last line that flows back into the cold open, so a replay feels seamless. |

**Tone:** third person, past tense, simple words, about 3 words/sec. Never invent facts: every VO claim must be in the source.

**Title:** "The ___est ___ Ever!" or "She/He ___… 😭❤️" plus a specific detail. Superlative titles hit 1M on their channel 29% of the time, against 5% for question titles.

## 3. Visual system

- **CARD framing:** the source fills about 52% of screen height (1000px), cropped at the sides, on black, with **glowing white lines** on its top and bottom edges. The card pops from 96.5% to 100% on each cut.
- **FULL framing:** a 9:16 punch-in on a face (OpenCV face detection, or set `fx`/`fy` by hand).
- **Alternate** CARD and FULL roughly every 1.5–3s. Use FULL for faces and emotion, CARD for context and wide shots.
- **Push-in:** every shot slowly zooms 7% (10% on payoff shots).
- **Cuts:** a 4-frame zoom-blur plus a soft whoosh on every cut. No fades or wipes.
- **Grade:** contrast +7%, saturation +18%, unsharp, soft vignette.
- **Flash-forward** (optional): show a darkened payoff shot under the foreshadow line (`"dark": true`).
- **Burned-in text in the source:** avoid those frames, or crop it out with `zoom`/`full_zoom` plus `cy`/`fy`.

## 4. Captions

- Montserrat ExtraBold, ALL CAPS, 66px, centred just below the middle of the screen. That's bigger than theirs, which is better for phones.
- 2–3 words per chunk, two lines max, breaking on punctuation.
- **One keyword per chunk** gets colour plus glow:
  - **red** for pain: died, cancer, never, war
  - **green** for hope or money: home, love, free, $
  - **yellow/cyan** for anything else
- Force a keyword by writing `*word*` in the script.
- Each chunk blurs in and pops (112% to 100%) over 130ms.
- Sound captions like `*CAR STARTS*` or `*SHOCKED*` use `sfx_caps`.
- A credit line sits at the bottom ("Credit: @creator"), which builds goodwill and transparency.

## 5. Audio

- **Narrator:** Kokoro TTS, `am_michael`, speed 1.12. Their narrator is also a male voice (about 125 Hz).
- **Levels:**
  - VO normalised to -14 dBFS and dialogue to -13
  - generated piano/pad music bed at -25, ducked about 50% under speech
  - final master at -14 LUFS
- **SFX:** a whoosh on every cut (-27 dB) and a low impact boom on the payoff (`"impact": true`).
- **Source music:** mute the source where it is only background music (`"mute": true`). Copyrighted songs trigger claims.
- **Swap the generated bed for a YouTube Audio Library track** for better music. It is safe to monetise.

## 6. QA before posting

1. Look at the 1-frame-per-second contact sheet. Check for wrong faces, interviewer shots, burned-in text, blurry transition frames and repeated shots.
2. Transcribe the output and read it back. That catches TTS mispronunciations (e.g. "9/11" spoken as "9 slash 11") and clipped words.
3. Check the opening 3 seconds work with the sound off.
4. Check the length is 30–58s and the last line loops into the first.

## 7. Using the pipeline

```bash
pip install -r requirements.txt     # + ffmpeg; Kokoro model files in models/
SRC_DIR=/path/to/videos TX_DIR=/path/to/transcripts python3 transcribe.py VIDEO_ID
SRC_DIR=... TX_DIR=... python3 render.py edits/<name>.json --out <name>.mp4
TX_DIR=... python3 make_scripts.py > SCRIPTS.md
```

Source videos are named `<youtube-id>.mp4`. Kokoro model files go in `models/`: `kokoro-v1.0.onnx` and `voices-v1.0.bin`, from github.com/thewh1teagle/kokoro-onnx releases.

### Edit list fields

- **Beat types:**
  - `clip`: original audio from `in`–`out`
  - `vo`: narrator text plus b-roll `shots`
- **Shot options:**
  - `frame`: `card` or `full`
  - `fx`, `fy`: focus position
  - `cy`: vertical crop in card mode
  - `zoom`, `full_zoom`: extra crop
  - `push`: zoom amount
  - `len`: fixed length
  - `dark`: flash-forward darkening
- **Clip options:**
  - `text`: corrected caption text
  - `captions`: false to switch captions off
  - `cap_skip`: time ranges whose words get no captions
  - `manual_caps`: captions for words the transcriber missed
  - `sfx_caps`: sound captions
  - `mute`, `db`: audio level
  - `impact`: payoff boom

A clip whose shots have `len` plays b-roll over the original audio. Without `len`, the picture follows the source time (lip-sync).
