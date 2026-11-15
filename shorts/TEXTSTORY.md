# Text-story Shorts: the recipe

Reverse-engineered from @The_fatal_second: 171K subscribers and 635 Shorts. Their median Short has 251K views, 168 have passed 1M, and the top one has 64M. We downloaded 15 of their videos and measured them frame by frame: the 10 biggest (18M–64M views), two mid-range, a recent one and two that flopped. `textstory.py` renders the format and `music.py` makes the music.

## 1. What they actually do

| | Measured |
|---|---|
| **Length** | **7.0s, every one of the 15** (208 frames at 30fps) |
| **Story text** | 55–80 words, **17–24s to read**, all on screen from frame 1 and never changing |
| **Loops per view** | The story takes 2.5–3.5 plays of the 7s video to read. That's why their retention and average-viewed numbers are so high. |
| **Clip** | One continuous shot of the key moment. 10 of the 15 have no cuts at all. No zoom, no captions, no effects. |
| **Voiceover** | None |
| **Music** | **The same 7-second track on 12 of the 15** (sample-for-sample match): dark, slow chords in D minor, no drums, sustained low-mid strings. YouTube lists the audio as "Original Sound", so it's baked into the upload rather than picked from YouTube's music library. |
| **Clip sound** | Mixed over the music only when it matters: names at the graduation, crowd cheers, "Oh my goodness!" Muted otherwise. |
| **Loudness** | -13 to -14 LUFS with almost no dynamics (LRA 0.2–0.4 LU) |
| **Loop point** | Not designed: there's a visible jump when the video restarts, hidden only because people are busy reading |

**Layout** (1080×1920):
- **Background:** black.
- **Header:** logo and channel name at y≈139–260.
- **Story text:** Open-Sans-style bold, about 45px with tight 48px line spacing, centred, max 840px wide.
  - white for most text
  - yellow #F8FD0B for 2–4 key phrases
- **Clip:** a rounded card, x 25–1055 (1030px wide), corner radius about 75px. It starts about 30px under the text and runs down to y≈1700–1880.

## 2. Story formula (from all 15)

- **55–80 words, 6–11 short sentences.** The winners start with a scene or a short fragment: "His wife had died." "Graduation day." "December 2020, Florida airport."
- **Structure:**
  1. setting
  2. the problem
  3. what someone did (the action the clip shows)
  4. the twist
  5. a one-line moral
  6. a call to action
- **Calls to action:** "Hit 👍 if this moved you", "Like if you agree", "Subscribe if you believe in…", "Send this to someone who always shows up for you". That last one is a share prompt, from the 26M dog video.
- **Highlights:** 2–4 yellow phrases on the emotional beats: "He was alone.", "Literally. Two hours.", "but with their heart".
- **The clip must show the action itself:** the house being carried, a cow jumping into the sea, the hug in the hallway. A viewer should understand it with the sound off.

**What flopped:**
- The poisoned-at-work story got 28K views. It's dark and about crime and injustice, the clip is a man sitting at a desk, and the call to action invites a debate.
- The newest one (4K) was only a day old when we measured it, so it's too early to judge.

**Titles** (410 established Shorts with a 525K median; the newest 20 and the pre-takeoff early ones are excluded):
- **Short wins.** Not counting emojis, 30 characters or fewer has a median of 607K views. Over 45 characters has a median of 331K.
- **Start:** "The ___" does slightly better (574K). Starting with "He", "She", "They", "His" or "Her" does much worse (304K vs 610K).
- **Avoid:**
  - quotes: 126K (n=9)
  - questions: 147K (n=5)
  - ALL CAPS: 267K (n=6)
  - dashes: 370K
  - hashtags: never used
- **Two emojis at the end.** The best are 🤝 (1.1M median, 60% hit 1M+), ✨ (951K), 😂 (875K), 🏃 (783K), 💪 (759K), 🐕 (694K) and ❤️ (643K). Sports trophies and balls are weak: 🏆 384K and ⚽ 193K.
- **Topics:** soldiers, police and firefighters lead by far (7.1M median, small sample of 5). Next come funny moments (682K), old people (680K) and dogs (646K). Money stories are weakest (326K).
- **Don't give away the twist.**
- **Posting rate:** about 2 Shorts a day. They reached 171K subscribers in about 9 months.

**Description:** the title, then the full story text. No hashtags and no tags (all 15 have empty tags).

## 3. Our version: what we keep and what we improve

**What we keep:**
- the 7s length, a static story, one continuous clip, the rounded card and no voiceover
- one signature music track on every video, with clip sound only when it adds something
- a 55–80 word story and 2–4 highlights

**What we improve:**
1. **Seamless loop.** The clip crossfades its last 0.33s into its first frame, and our music is composed to loop at exactly 7.0s. The restart is invisible, so more people watch it again.
2. **Our own music.** `music.py` composes it, so there's no Content ID risk. Two loops:
   - **night:** dark, close to their mood
   - **dawn:** warm and hopeful
3. **The card stops at y=1750,** so the action stays clear of YouTube's title overlay at the bottom.
4. **Share calls to action** ("Send this to…") instead of only "like", because shares drive distribution.
5. **No header** (your choice). The text starts at y=165, which gives the clip more room.
6. **Fact-checked stories only.** Their stories are loose with facts, and one viral correction in the comments can sink a channel's trust.

## 4. Making one

```bash
SRC_DIR=/path/to/videos python3 textstory.py edits_ts/<name>.json --out <name>.mp4
```

```json
{
  "source": "<youtube id>",
  "in": 41.2,
  "fx": 0.5, "fy": 0.45,
  "text": "Barcelona, 1992. ... *his hamstring tore.* ...",
  "music": "night",
  "clip_db": -4,
  "credit": "Video: Olympics"
}
```

- `in`: start of the 7 seconds. Pick the moment where the action happens on screen.
- `fx`/`fy`/`zoom`: framing inside the card.
- `speed`: 0.8 slows a fast moment down.
- `clip_db`: include the clip's own sound (cheers, a key line). Leave it out to mute.

**QA before posting:**
1. Read the story out loud. It should be 17–24s.
2. Check every fact against two sources.
3. Watch it loop three times: there should be no visible jump and no click.
4. Check that the action is visible in the card.

## 5. Tech niche (experiment)

The format stays the same: 7 seconds, a static story and one moment. Two things change:

- **Music:** the `orbit` preset in `music.py`. It's an original 7-second loop in B minor (Bm–G–D–A). A pulsing synth arpeggio with ping-pong echoes sits over a warm pad, with a ducking sub-bass, a soft pulse and a bell on each chord change. It sounds futuristic but stays emotional, and it loops seamlessly like `night`. When the clip has a key line of real sound (a control-room call), use `"clip_db": 0, "music_db": -7` so the voice leads.
- **Footage:** NASA and JPL video is **public domain**. Get it from images.nasa.gov (with an `~orig.mp4` or `~large.mp4` download), with no permission needed and no Content ID risk. That makes the space and engineering side of tech the safest version of this format. Credit "NASA/JPL-Caltech", and don't use the NASA logo to suggest endorsement.
- **Test video:** `edits_tech/01_ingenuity.json`, the Mars helicopter's first flight. The control room hears "Altimeter data confirmed…" and erupts.
