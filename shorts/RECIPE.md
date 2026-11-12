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

**Title:** see section 6.

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

## 6. Titles

The rules below come from all 224 of their Shorts. The samples are small, so treat them as directional.

| Pattern | Median views | Share that hit 1M+ |
|---|---|---|
| Core title of 40 characters or fewer (median of their 1M+ hits: 39) | 60K | vs 40.5K when longer |
| Starts with "The ___" ("The Saddest Live Stream Ever!") | 66K | 15% |
| "The" + superlative/secret ("The SADDEST…", "The UNTOLD Truth…") | 111K | 29% |
| Has 😭 / 💔 | | 20% / 29% (vs 10% without) |
| Has ❤️ / 🤯 | | 3% / 6% (these underperform) |
| Has #emotional | 62.5K | vs 41K without |
| Question titles ("Is X a scam?") | 42K | 5% |

**Formula:** `[Subject] [did/felt the turn] [specific number or object] [😭 or 😭💔] #shorts #emotional`
- One **ALL-CAPS** word on the key fact: "18 YEARS", "HOUSE".
- One specific number or object, such as 52 years, $1,000,000, or 9/11.
- Use a sad emoji (😭💔), not a happy one.
- Don't give away the payoff. Say what happened, not how it ends.
- Write two alternates. If a Short stalls after 48h with good retention, swap the title; YouTube has no built-in A/B test for Shorts.

## 7. Thumbnails

**What theirs do:** they use frames picked from the video, not designed graphics.
- In **14 of their top 20**, the frame is a **full-screen face at peak emotion** (crying, a hand over the mouth, shock, a hug) with one in-video caption chunk showing a keyword ("BREAK HIS HEART", "TO TEARS").
- Their low performers are mostly the small card framing of a scene or object, often caught on the frame where the "MM" logo flashes.

**Our version** (`thumbnail.py`, specs in `upload/thumbs.json`):
1. **Frame:** the peak-emotion moment, full bleed at 1080×1920, with the face in the middle 60% of the height.
2. **Grade:** contrast +12%, saturation +25%, slightly warm, sharpened, vignette.
3. **Hook text:** two lines in Montserrat Black. A small white set-up line (about 80px) over a **big keyword line** (up to 190px) in a story colour with a glow:
   - red: tragedy
   - green: hope or money
   - yellow: surprise
   - pink: family
   - cyan: curiosity
4. **The text adds to the title rather than repeating it.** For example, the title is "He Hadn't Heard Her Car In 18 YEARS" and the thumbnail says "HIS LATE WIFE'S CAR / RUNS AGAIN".
5. **Placement:** keep text and faces out of the bottom 22%, where YouTube puts the title and buttons. Put the text above or below the face, never over it.
6. **Burned-in subtitles in the source:** crop them out with `zoom` + `fy`.
7. **If custom upload isn't available** (it's still rolling out to Partner Program channels), use the frame picker on a full-screen face shot with a caption keyword showing. `upload/UPLOAD.md` lists the timestamp for each video.

## 8. Description, tags and settings

- **Description:** a hook line with an emoji, then a 2–3 sentence recap, then the credit with a link, then a subscribe line, then 5 hashtags:
  ```
  {hook}. 😭

  {recap in 2–3 sentences, end on a tease}

  🎥 Original video: {creator} ({link})
  All credit to {creator}. Watch the full story on their channel.

  Subscribe for a true story every day that restores your faith in people. ❤️

  #shorts #emotional #truestory #{topic1} #{topic2}
  ```
- **Their "Fair Use Disclaimer" paragraph offers no legal protection.** Permission and credit do more. Leave it out.
- **Tags:** 12–18 relevant ones, mixing names (person, creator, car model), topic (adoption reunion, home makeover) and format (emotional, true story, shorts).
  - **Don't copy their tag stuffing** with unrelated big names ("jim rohn speech", "matthew mcconaughey interview"). YouTube counts that as misleading metadata.
- **Settings:**
  - People & Blogs
  - not made for kids
  - altered content "No" (generic AI narrator, real footage)
  - remixing off
  - same playlist for every Short
  - a pinned question comment
  - one Short per day at a consistent time

## 9. QA before posting

1. Look at the 1-frame-per-second contact sheet. Check for wrong faces, interviewer shots, burned-in text, blurry transition frames and repeated shots.
2. Transcribe the output and read it back. That catches TTS mispronunciations (e.g. "9/11" spoken as "9 slash 11") and clipped words.
3. Check the opening 3 seconds work with the sound off.
4. Check the length is 30–58s and the last line loops into the first.

## 10. Using the pipeline

```bash
pip install -r requirements.txt     # + ffmpeg; Kokoro model files in models/
SRC_DIR=/path/to/videos TX_DIR=/path/to/transcripts python3 transcribe.py VIDEO_ID
SRC_DIR=... TX_DIR=... python3 render.py edits/<name>.json --out <name>.mp4
TX_DIR=... python3 make_scripts.py > SCRIPTS.md
SRC_DIR=... OUT_DIR=upload/thumbnails python3 thumbnail.py upload/thumbs.json
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
