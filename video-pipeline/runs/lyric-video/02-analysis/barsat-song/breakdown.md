# Breakdown: barsat-song

Reference id `barsat-song`. File: `01-sources/refs/barsat-song/video.mp4` (640x360, 30 fps, 185.33 s of picture, 185.48 s of sound). All times are seconds into that file.

**Read this first: the reference is not a lyric video.** It is one still image held from 0.00 to 185.33 s while a song plays. No lyric appears on screen at any time. The only words in the picture are the song's one-word title and a one-word credit, both present from frame 0 and never changed. So this reference cannot show how lyrics are set, timed to the singing, moved or coloured, how many are on screen at once, or how the picture changes across sections of the song. It shows none of those things. What it does show: a title card (type, colour, drawing, ground), a song's line timing and section structure (from the sound only), and how an audience responds to a song posted this way. Sections below keep to that.

How this was checked (barsat-song, whole run): every one of the 5,560 frames was compared at full size with frame 0. The largest departure anywhere is 0.36% of pixels differing by more than 24 levels of 255, all of it on the edges of shapes that are already there (the letters and the stippled drawing sharpen as the encoder refines them); no new shape appears. The video stream averages 32 kb/s and the median frame is 20 bytes. The 72-thumbnail sheet (`dense.jpg`, one frame every 2.6 s) shows the same picture in all 72.

## 1. What it is

- Format: horizontal 16:9 (640x360 as supplied), 185.33 s, a full song over a single still title card. A third-party upload (title "Barsat song from nitesh YouTuber", channel of 700 followers), so the artwork is probably the song's own cover and not the uploader's work; that is an inference from the upload title, not something the file shows.
- Subject: a song about being left. The refrain, first sung at 13.4 s, is a plea not to go and a warning that the one leaving will miss the singer (transcript evidence, low trust; see section 2).
- The one idea: "you will miss me when I am gone", sung as a repeating refrain. The picture carries only the title (the Hindi word for rain) and two crying eyes.

## 2. Script

### The words on screen (primary record, read from `still_120.jpg`, `hook.jpg`, `dense.jpg`)

Two words, on screen 0.00 to 185.33 s, never changed:

- "बरसात" (Barsaat, "rain" or "monsoon"): one word, five letters, large, dark red.
- "बंजारे" (Banjaare): one word, small, near-black, centred under the title. Probably the artist credit (inference: it sits where a credit sits; the file gives no other evidence).

That is the complete on-screen text. There are no captions and no lyric lines.

### The sung words (secondary record, low trust)

I cannot hear the file. The words below come from speech-to-text on singing over a band, which is the hard case for the tool.

- Three tool runs (`transcribe.py` with base, small and medium models) all gave garbled text. Base detected the language as Punjabi; with the language set to Hindi the small and medium models produced recognisable Hindi-belt words mixed with junk tokens in other scripts. The forms that recur across runs ("tanne", "padya", "isa") read as Haryanvi-flavoured Hindi; that is my reading of a poor transcript, moderate confidence.
- **Trust in the text: low.** Enough to recognise the two refrain lines, which five runs agree on, and to count lines. Not enough to quote verses.
- **Trust in line times: moderate, about plus or minus 0.3 s.** Where runs overlap they agree to within 0.1 to 0.5 s on where a line starts.
- **Trust in the tool's word counts: low.** See "What the tools got wrong" at the end of this section.

Per the run's instructions, the lyrics are not reproduced. Two short phrases are quoted (the two refrain lines); every other line is described.

### First 45 seconds, beat by beat

The "on-screen words" and "picture" columns are identical in every row: title and credit, same still image. They are written once.

| Time (s) | Sung words | On-screen words | Picture | Job |
|---|---|---|---|---|
| 0.00-13.36 | None. Sound starts at 0.12 s (tool). Instrumental, about 10 dB quieter than the rest (RMS -23.5 dB against -11 to -15 dB later; my computation). | Title "बरसात" in red, credit "बंजारे" in black, both from frame 0 | Cream paper; two stippled ink eyes with four tear trails on the right; type on the left | Title card and intro |
| 13.4-16.5 | **Line 1, 6 words: "chhod ke na chal padya tu"** (roughly "don't leave and walk away"). First sung word at 13.36 s (tool; all three models agree). **This line opens the central question: does the person stay?** | same | same | Hook (of the song, not of the video) |
| 16.8-20.2 | Line 2: line 1 sung again, last word held about 1.7 s | same | same | Hook, repeated at once |
| 20.2-22.8 | Line 3, 4 words: a "when ... comes" clause (text unclear across runs) | same | same | Setup |
| 23.7-26.7 | **Line 4, 4 words: "tanne meri yaad aavegi"** (roughly "you will miss me") | same | same | The claim the song rests on |
| 26.7-30.4 | Line 5, 5 words, last word held about 1.4 s. Low-frequency energy enters under this line: its share of the sound rises from 0.06 (20-25 s) to 0.26 (25-30 s) | same | same | Escalation (in the sound only) |
| 30.4-33.3 | Line 6, 4 words: a question ("who will ... like me"). Full backing from about 30 s: low-band share 0.57, level -11 dB | same | same | Escalation |
| 33.3-34.2 | Gap of 0.9 s, filled by the instruments | same | same | Breath |
| 34.2-36.5 | Line 7: line 1 again (third time), now over the full backing | same | same | Refrain returns |
| 37.8-40.7 | Line 8: line 4 again | same | same | Refrain |
| 40.7-43.9 | Line 9: line 4 again with a one-word lead-in | same | same | Refrain |
| 44.8-47.3 | Line 10: line 4 again (fourth time) | same | same | Refrain |

In the first 45 s there are ten sung lines; two different lines account for seven of them (line 1 three times, line 4 four times).

### 45 s to the end, by section

Nothing in the picture changes in any of these sections. Only the sound changes.

| Time (s) | Share of run | What is sung | What changes in the sound |
|---|---|---|---|
| 48.4-55.6 | 0.26-0.30 | Line 1 (fourth time), then line 4 with the last word held to about 55.6 s | Full backing, -11 dB |
| 55.6-69.3 | 0.30-0.37 | No words found by any of five runs: 13.7 s without voice (inferred; I cannot hear it) | Loud, bass-heavy: low-band share 0.57-0.68, level -12 dB |
| 69.3-89.7 | 0.37-0.48 | Verse 2: six new lines of 4 to 6 words, each 3.3 to 3.8 s. One at about 73-77 s uses a past-tense "left" wording in both unfiltered runs: **this is where the central question appears to be answered (the person has gone), at about 0.40 of the run. Tentative: it rests on the low-trust transcript.** The last line of the verse (about 87-90 s) appears to contain the title word, its first sung appearance, 87 s after it went on screen (probable, not certain) | Backing thins from about 85 s: low-band share falls to 0.12, level to -13.4 dB |
| 90.3-107.5 | 0.49-0.58 | The refrain in full: line 1, line 4, lines 5 and 6, line 1 | Thin backing 90-100 s (-13.8 dB), full again from about 100 s (-11.0 dB) |
| 107.5-117.8 | 0.58-0.64 | No words agreed between runs (one tool run puts garbled words at 108.6-114.7 s) | Level drops: -13.9 dB at 110-115 s, -15.2 dB at 115-120 s, the quietest stretch after the intro |
| 117.8-132.4 | 0.64-0.71 | Bridge: four lines, the last two a matched pair with the same ending (found by the three tool runs only) | Quiet at first (-13.8 dB at 120-125 s), full backing back by about 130 s |
| 132.4-137.4 | 0.71-0.74 | No words found: 5.0 s | Full backing, -11.1 dB |
| 137.4-155.9 | 0.74-0.84 | Three new lines (3, 5 and 4 words), then line 1 (seventh time) and line 4 twice, the second cut short | Full backing, -11 to -12 dB |
| 155.9-168.0 | 0.84-0.91 | No words found by any run: 12.1 s without voice (inferred) | The most bass-heavy stretch: low-band share 0.65-0.71 |
| 168.0-182.9 | 0.91-0.99 | Outro: two long lines of about 11 words, about 7.4 s each, addressed to the one who left | Thin backing: low-band share 0.17-0.23, level -13.6 dB |
| 182.9-185.33 | 0.99-1.00 | Nothing. Last sung word ends between 182.3 and 182.9 s | Fade: below -35 dB by 183.0 s; silent for the last 1.72 s (tool) |

Totals (my count from the five runs, not a tool figure): about 35 sung lines and about 160 words. Line 1 is sung 7 times and line 4 is sung 7 times plus once cut short, so two lines make up about 40% of all lines sung.

### Line timing (my count from word times, plus or minus 0.3 s)

- A new line starts about every 3.5 s: intervals between line starts run 3.0 to 3.8 s at 13.4-52.0 s (mean 3.51 s, 11 intervals) and 3.2 to 4.1 s at 69.3-104.5 s (mean 3.53 s, 10 intervals).
- A line is 3 to 6 words, most often 4. The outro lines (168.0-182.9 s) are about 11 words each over two of those 3.5 s slots.
- The singing fills 2.3 to 3.7 s of each slot; the rest is a gap of up to about 1.2 s, always filled by the backing. The last word of a line is often held (1.7 s at 18.5-20.2 s; 1.4 s at 29.0-30.4 s).
- The sound's strongest regular pulse is 0.44 s (135 to 137 a minute; my autocorrelation of the tool's onset measure, with 91 and 68 a minute as weaker candidates), so one line slot is about 8 pulses. Tool onsets cluster at 0.20 to 0.25 s apart (median 0.23 s).

### Where voice, captions and picture are out of step

- There are no captions, so there is nothing to be in step. Every sung word (about 160 of them) goes unshown.
- The picture's title is on screen at 0.00 s; the word is not sung until about 87-90 s (probable).
- The picture gives no sign of any section change in the sound: the entry of the voice (13.4 s), the entry of the full backing (about 30 s), the two voiceless stretches (55.6-69.3 s, 155.9-168.0 s), the quiet bridge (110-125 s) and the fade (182.9 s) all happen under an unchanged image.

### What the tools got wrong

- `measure.json` reports 42 "still" stretches, the longest 7.0 s, and `end_hold_s` 3.33. **The picture is one still for the whole 185.33 s.** The breaks the tool sees are the encoder's keyframes, one every 7.0 s (28 of them: 0, 7, 14 ... 182 s, plus one at 80.03 s), and small refinement frames between them. Each keyframe redraws the same image slightly differently (mean change 2.4 to 2.9 levels of 255), which trips the tool's stillness test. 7.0 s and 3.33 s are artefacts of the file's encoding, not choices by whoever made the video.
- `measure.json` reports 1 shot and 0 cuts. Correct: my eyes agree.
- `transcript.json` under-reports the voice. The tool's voice-activity filter dropped the same stretches in all three model runs (about 50-88 s, 132-154 s, 155-172 s) and reported them as pauses of 37.37, 21.99 and 16.93 s. Two cross-check runs of my own with the filter off found sung lines inside all three (69.3-107.5 s, 137.4-155.9 s, 168.0-175.5 s). So the tool's 122 words, 39 words a minute and 41% voice share are undercounts; my count is about 160 words, about 52 a minute, voice in about 69% of the run.
- The three tool runs disagree with each other: 111, 94 and 122 words (base, small, medium). `transcript.json` holds the medium run's figures, the closest of the three to my count, with the lyric text removed.
- `palette.json` is consistent with what I see. Its "ink" (#0b0100) is the single darkest value; the type and drawing average nearer #150a07 to #1a0e06 on a full-size still.

## 3. Hook (first 3 seconds)

- **First picture (barsat-song, 0.00 s):** the complete title card. Nothing builds, fades in or moves: the frame at 0.00 s is the frame at 185.3 s. Left: the one-word title in dark red, the small credit under it. Right: two stippled ink eyes, cropped with no face around them, four tear trails, the longest running down to 88% of the frame height.
- **First words:** on screen, 2 words at 0.00 s (the title and the credit). Sung, none: `words_in_first_3s` is 0 and the first sung word is at 13.36 s. The first 3 s of sound are the quiet instrumental intro (first sound at 0.12 s, 8 onsets in 3 s, RMS about -23 dB).
- **What might make someone stop:** the image is specific and readable at once (crying eyes plus a one-word title in the only colour on the page). Nothing is at stake in words and nothing moves. A viewer who already knows the song gets its name at 0.00 s; that is the only promise made.
- **Question opened:** none in words. The picture implies "who is crying and why"; that is my reading. The song's own question (will the person stay) opens at 13.4 s.
- **With the sound off:** the first 3 s read fully as a title card. After that the muted viewer has received everything the picture will ever give; the remaining 182 s add nothing.

## 4. Holding attention

- **What each beat adds:** in the picture, nothing, at any point (barsat-song, 0.00-185.33 s). Every new thing arrives through the sound: the voice at 13.4 s; the full backing at about 30 s (level up from about -15 to -11 dB); new verse lines at 69.3 s and 137.4 s; a thinned backing under the refrain at 85-100 s; a quiet bridge at 110-125 s; a thin outro at 168.0 s.
- **Questions opened and closed:** opened at 13.4 s (line 1, the plea). Apparently closed at about 73-77 s, 0.40 of the run (tentative, section 2). The refrain keeps returning after that (90.3, 104.5, 147.5 s).
- **Repetition as the holding device:** the first sung line is repeated immediately (13.4 and 16.8 s) and returns after every section; two lines make up about 40% of the song.
- **Words a minute:** tool 39 over the whole run and 96 while the voice runs (medium run; 30/75 and 36/95 in the other two). My count: about 52 over the whole run, about 75 inside the sung stretches.
- **Shot lengths:** one shot of 185.33 s. 0 cuts per 10 s. No first cut.
- **Longest stretch where nothing changes:** the whole run, 185.33 s (tool figure 7.0 s is an encoding artefact).
- **Where the slowest part falls:** by sound, the intro (0.00-13.36 s, no voice, lowest level) and the three other stretches with no words: 55.6-69.3 s, 132.4-137.4 s, 155.9-168.0 s. In all of them the picture offers nothing in place of the voice. Together with the 107.5-117.8 s stretch and the tail, about 57 s (31% of the run) has neither voice nor any change of picture.
- **How it ends:** the last sung word ends at 182.3-182.9 s, the sound fades below -35 dB by 183.0 s, and the file stops at 185.33 s on the same card: 2.4 to 3.0 s after the last word, the last 1.72 s of it silent. No end card, no change of picture, no call to action.

## 5. Why someone would share it

- **Strongest emotional moment:** not measurable from picture (it never changes) or from tone of voice (I cannot hear it). Evidence from viewers (comments.json): four comments point at moments by time. One names "1:50" (110 s) as "the line" (1 like); two give bare times, 1:06 (66 s) and 1:15 (75 s); one lists 0:02 to 0:22 and says they liked that part. At 110 s the tools show the level dropping from -11.4 dB (105-110 s) to -13.9 dB (110-115 s) into the bridge; at 75 s the transcript puts the "left" line of verse 2. That people point at these moments is evidence; why they do is my guess.
- **What sending it says about the sender (my reading, supported by comments):** "this is how I feel". Five of 75 comments use the song to speak about their own loss or to dedicate it to a named person or relative (section 6). Sending it is a way to say that to someone without writing it.
- **Who they would send it to (guess):** the person they miss, or a friend who knows the situation; or post it as a status. No comment says who they sent it to.
- **What is being shared is the song.** No comment mentions the picture (0 of 75).
- **Result numbers (sources.json, as of 2026-11-25):** 1,938,059 views, 5,421 likes (0.28% of views), 89 comments (1 per 21,800 views), on a channel with 700 followers, 34 days after upload. Shares are not published. The views are about 2,770 times the follower count, so they did not come from followers; where they did come from is not in the data.

## 6. Why someone would comment

**What invites a reply (my reading):** nothing in the video asks for one. There is no question on screen, no claim, no call to action. The only prompts are the song's subject (being left), which viewers answer with their own feeling or story, and individual lines, which a few viewers point to by time.

**What people actually wrote (evidence: comments.json, 75 of the platform's 89 comments, top-level only, sorted by likes; hand-sorted by me into one theme each):**

| Theme | Count of 75 | Examples |
|---|---|---|
| Praise for the song in words ("love this song", "best song", "favourite", "can't get enough of it", one-word praise) | 34 | The top three by likes are all this: 19, 18 and 13 likes |
| Emoji only (hearts, crying faces, broken hearts) | 20 | |
| Their own story, or a dedication to a person | 5 | A love they cannot have (4 likes); the death of a pet (3 likes); "it happened to me too"; a song "for" a named person; a message to their mother |
| A time in the song they single out | 4 | "1:50 line", "1:15", "1:06", and one listing 0:02 to 0:22 |
| Naming the sadness ("so sad song", "I am crying", "so sad") | 3 | |
| Praise for the writing or lyrics | 2 | "Writing by pen / Write by pain" (6 likes); "Nice song lirics" |
| "Who is listening in November" roll-call | 1 | 4 likes |
| The uploader | 2 | A heart (3 likes); "Subscribe to channel" (0 likes) |
| Off-topic, a bare link, or unclear | 4 | |

Across themes: 30 of 75 carry a crying, sad or broken-heart emoji and 30 carry a heart (8 carry both). The 75 comments have 128 likes between them. No comment asks a question, disputes anything, or mentions the picture, the drawing or the type. The word "song" is in 24.

What that shows: the response is to the song and the feeling, expressed as short praise, emoji and, less often, a personal story or a pointer to a favourite line. It is not evidence about lyric videos, because this video shows no lyrics.

## 7. Look

Measured on `still_120.jpg` (full size, 640x360) by pixel boxes; sizes and positions are estimates at that resolution.

- **Ground:** warm cream paper, #ded0ba (tool; 44% of pixels, with #d7c6ab 34% and #ccb696 14%). Lighter in the centre (#e0d2bf) and darker toward the corners (#c8b08e to #d3bfa1). Texture: faint vertical creases like fold lines, and short faint dark diagonal dashes scattered across the page that read as rain. All of it is part of the still; none of it moves.
- **Ink:** near-black with a brown cast, #0b0100 at its darkest (tool), about #150a07 in the small type. Used for the drawing and the credit.
- **Accent:** dark red, #7a1713 (tool; about 1.2% of the frame, hue 3 degrees). **Used for one thing only: the title word.** Nothing else on the page is coloured; the tears are black.
- **Colour character:** "muted" (tool): mean saturation 0.21, mean luminance 0.76, dark share 3.7%.
- **Line and texture:** the drawing is stippled: built from dots, dense in the brow and lashes, thinning to scattered points at the outer edge. No outlines filled with flat tone, no colour, no grey wash.
- **How the figure is drawn:** two eyes only, no face outline, nose or mouth; the face is implied by the gap between them. The left eye is larger with a full brow; the right is cropped closer. Four tear trails drop from the lower lids as dotted lines ending in drops; the longest runs from the left eye down to 88% of the frame height at about 62% of the width.
- **Composition:** three things in the frame: title, credit, drawing. Type on the left (ink box 13% to 40% of the width), drawing on the right (47% to 92% of the width, 17% to 88% of the height). Nothing touches an edge: margins are about 13% left, 8% right, 17% top, 12% bottom. Type and drawing together cover about 6% of the pixels; the other 94% is paper. The lower-left third of the frame is empty.
- **Type (estimates):**
  - Title: one word, five Devanagari letters. Letter height about 14% of the frame height (51 px of 360, head-line to baseline), width about 28% of the frame width, centred at about 27% across and 40% down. A brushed display face: uneven stroke ends, slightly irregular weight, a thick head-line (about 1% of frame height). I cannot name the face.
  - Credit: one word. Letter body about 5% of the frame height (19 px), about 8% including the marks above; width about 9% of the frame; centred under the title at about 26% across and 58% down. A plain regular-weight Devanagari text face. I cannot name it. Title to credit letter height is about 2.7 to 1; the gap between them is about 7% of the frame height.
  - Words on screen at once: 2, always. Lyric words on screen: 0, always.
- **Transitions:** none. No cut, fade, dissolve or wipe anywhere (tool: 0 cuts; full-size frame comparison agrees).
- **How much moves and how:** nothing moves. `motion.mean` 0.01, median 0.0 (tool); the 0.01 is keyframe refresh, not motion. The rain marks and tears are drawn, not animated.

## 8. Sound

- **Voice:** yes, sung. First sung word 13.36 s; last ends 182.3-182.9 s. Tone of voice: not measurable. Singer's sex, age, style: not measurable.
- **Pace:** tool 39 words a minute over the run, 96 while the voice runs (undercounts; section 2). My count: about 52 over the run, about 75 inside sung stretches, one line of 3 to 6 words about every 3.5 s.
- **What runs under the voice:** instruments throughout; musical character and instrumentation not measurable. What the tools show: the intro (0-13 s) has almost no energy below 200 Hz (share 0.00) and sits about 10 dB below the rest; low-frequency energy arrives at 25-30 s and reaches a 0.5 to 0.7 share in the full sections (30-85 s, 100-110 s, 125-170 s); it drops to 0.1 to 0.3 in the thin sections (85-100 s, 170-183 s).
- **What fills the gaps between words:** the backing, always. `audible_share` 0.988 and no dropouts (tool). The only silence is the first 0.12 s and the last 1.72 s.
- **Loudness:** -12.8 LUFS integrated, loudness range 3.3 LU, true peak -2.3 dBTP (tool). Level by section is in section 2.
- **Sound events:** 639 onsets, 3.45 a second (tool); 2.9 a second in the intro, 4.0 a second at 130-175 s, 2.1 a second in the outro (my count from the tool's list).
- **Do transitions land on a sound:** there are no transitions, so `sync` is null. Sung line starts fall within 0.12 s of a tool onset in 18 of 23 cases, but onsets come every 0.23 s, so that is what chance would give; it is not evidence of anything.

## 9. Numbers

| Figure | Value | Source |
|---|---|---|
| Size, frame rate | 640x360, 30 fps, horizontal, aspect 1.778 | measure.json |
| Duration | 185.33 s picture, 185.48 s sound | measure.json, ffprobe |
| Shots, cuts | 1 shot of 185.33 s; 0 cuts; 0.0 cuts per 10 s; first cut none | measure.json (agrees with my eyes) |
| Still share | 0.997 | measure.json |
| Longest still stretch | 7.0 s (tool; artefact). 185.33 s by eye | measure.json; my frame comparison |
| End hold | 3.33 s (tool; artefact: time since the last keyframe at 182.0 s) | measure.json |
| Motion mean, median, p90 | 0.01, 0.0, 0.0 | measure.json |
| First picture | 0.0 s | measure.json |
| First sound | 0.12 s | measure.json |
| First sung word | 13.36 s | transcript.json (three models agree) |
| Words in first 3 s | 0 sung; 2 on screen | transcript.json; my count |
| Words, whole run | 122 (tool, medium). 111 and 94 in the other tool runs. About 160 by my count | transcript.json, transcript-runs.json |
| Words a minute, whole run | 39 (tool). About 52 by my count | same |
| Words a minute while voice runs | 96 (tool). About 75 inside sung stretches by my count, on a looser definition | same |
| Voice share of run | 0.412 (tool). About 0.69 by my count | same |
| Line slot | about 3.5 s (3.0 to 4.1 s) | my count |
| Words per line | 3 to 6, most often 4 | my count |
| Loudness | -12.8 LUFS, range 3.3 LU, true peak -2.3 dBTP | measure.json |
| Audible share, onsets | 0.988; 639 onsets, 3.45 a second | measure.json |
| Tail silence | 1.72 s | measure.json |
| Cuts on sound | null (no cuts) | measure.json |
| Ground, ink, accent | #ded0ba, #0b0100, #7a1713 (1.2% of frame, single hue) | palette.json |
| Luminance, saturation, dark share | 0.758, 0.214, 0.037; "muted" | palette.json |
| Lyric words on screen | 0 at every moment | my frame comparison |
| Views, likes, comments, followers | 1,938,059; 5,421; 89; 700 (2026-11-25) | sources.json |

## 10. What is weak

1. **It shows no lyrics.** As a model for a lyric video it has nothing to copy: no line setting, no timing to the voice, no motion, no colour change (0.00-185.33 s).
2. **The picture never changes.** One image for 185.33 s. No build at the start, no response to the voice entering at 13.4 s or to any section change, no ending.
3. **It gives a muted viewer nothing after the first second.** About 160 sung words, none shown.
4. **13.36 s pass before the first sung word,** over the quietest part of the track. In a 20 to 30 s video that would be half or more of the run.
5. **About 57 s (31%) have neither voice nor any change of picture:** 0-13.4, 55.6-69.3, 107.5-117.8, 132.4-137.4, 155.9-168.0 and 182.9-185.3 s.
6. **No ending.** The sound fades and the same card sits in silence for 1.72 s. No end card, no last image, nothing to act on.
7. **The title is not tied to the song in time.** It is on screen at 0.00 s and apparently first sung at about 87-90 s; the picture does nothing at that moment.
8. **The credit is small:** letter body about 5% of the frame height, 19 px in this file.
9. **The two type faces do not match:** a brushed display face for the title, a plain text face for the credit.
10. **Low technical quality as supplied:** 640x360 at about 32 kb/s of video. The stippling is soft, and the image visibly sharpens at the 7.0 s keyframe (frame 0 differs from later frames by a mean of 2.7 levels).
11. **Nothing invites a reply.** 89 comments on 1.94 million views; the uploader's own "Subscribe to channel" comment has 0 likes.
12. **Third-party upload.** The song and probably the artwork are not the uploader's. Our brief already forbids reusing either.
