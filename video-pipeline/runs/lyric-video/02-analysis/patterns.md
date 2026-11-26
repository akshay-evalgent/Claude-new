# Playbook: lyric-video

Built from one reference, `barsat-song` (breakdown: `02-analysis/barsat-song/breakdown.md`), and `01-sources/sources.json`. All times are seconds into that reference.

**Everything here is "seen in the one reference".** With one reference there is no difference between a rule of the format and one video's habit, so the labels "seen in every reference" and "seen in some" are not used.

**Tied to results: no result evidence, in every section.** `sources.json` has public numbers for one reference only (1,938,059 views, 5,421 likes, 89 comments, a channel of 700 followers, as of 2026-11-25). One video cannot show what better-performing videos share and weaker ones lack. Nothing below is proof of what performs.

## The limit of this playbook

**The reference is not a lyric video.** `barsat-song` is one still image held for 185.33 s under a full song. No lyric appears on screen at any time (0.00-185.33 s; every frame was compared with frame 0). The only on-screen words are a one-word title and a one-word credit, unchanged from the first frame to the last.

So the reference gives **no evidence at all** on the things the brief asks about:

| The brief asks | What the reference shows |
|---|---|
| How the lyric words are set | Nothing. It sets a title, not lyrics |
| How they are timed to the voice | Nothing. No word on screen is timed to anything |
| How they move | Nothing. Nothing moves (motion mean 0.01, all of it encoder refresh) |
| How they are coloured, and whether colour changes with the voice | Nothing. One word is red throughout |
| How many lyric words are on screen at once | 0, always |
| How the picture changes across sections of the song | It does not change |

The brief requires all of these ("the words of a song appear on screen in time with the song as it plays; the lyrics are the picture"), and the brief wins. The writer, moodboard artist and producer must decide them from the brief. This playbook cannot back those decisions and the judges cannot hold them to this reference. A second reference that actually shows lyrics on screen would be needed for that.

What the reference does give, and what the sections below are built from:

1. A title card: ground, ink, one accent colour, two type sizes, one drawing, and where each sits.
2. A song's timing, read from the sound only: how long a line is, how often a new one starts, how the refrain is used, where sections begin.
3. How an audience responded to a song posted this way (75 comments).

Statements marked **(derived)** are my arithmetic on the reference's figures at the brief's length. They are not things the reference does.

---

## Hook

- **Put readable words on screen in the first frame.** The reference has its title and credit on screen at 0.00 s; `first_picture_s` is 0.0 and there is no blank or fade-in (barsat-song, 0.00 s, `hook.jpg`).
- **Make the first frame name the feeling before any word is heard.** One word ("rain") and one drawn detail (two crying eyes, cropped with no face) say what kind of song this is with the sound off (barsat-song, 0.00 s).
- **Keep the first words few and large.** The frame leads with a single word at about 14% of the frame height (barsat-song, 0.00 s, measured on `still_120.jpg`; an estimate).
- **Use the one colour on the page for the one word that matters.** The title is the only red thing in the frame, about 1.2% of its area (barsat-song, 0.00 s, `palette.json`).
- **Make the first line heard the line the whole piece is built on, and say it twice.** The first sung line (6 words, a plea not to leave) is repeated at once: 13.4-16.5 s and 16.8-20.2 s (barsat-song).

**Do not copy**

- 13.36 s before the first sung word (barsat-song, 0.00-13.36 s). At 20 to 30 s that is half the video or more. The reference spends 7.2% of its run before the voice; the same share of 20 to 30 s is 1.4 to 2.2 s **(derived)**.
- A first frame that is then held unchanged. The reference's opening picture is also its closing picture (barsat-song, 0.00-185.33 s).
- An intro about 10 dB quieter than the rest of the track (barsat-song, 0-13 s, RMS -23.5 dB against -11 to -15 dB later).
- A hook that opens no question in words. The reference's first 3 s contain no sung word and no on-screen sentence (barsat-song, 0.00-3.00 s).

## Structure

Read from the sound only, on a low-trust transcript (breakdown section 2). Line times are good to about 0.3 s.

- **State the refrain first.** The song's two key lines are its first and fourth sung lines: a plea (13.4 s) and its consequence, "you will miss me" (23.7 s) (barsat-song).
- **Bring the refrain back after every new block.** The plea line is sung 7 times (13.4, 16.8, 34.2, 48.4, 90.3, 104.5, 147.5 s) and the consequence line 7 times plus once cut short (23.7, 37.8, 40.7, 44.8, 52.0, 94.4, 150.1, 153.8 s). Two lines are about 40% of the roughly 35 lines sung (barsat-song).
- **Give each line one slot of about 3.5 s.** A new line starts every 3.0 to 4.1 s, mean 3.5 s, across 21 measured intervals (barsat-song, 13.4-52.0 s and 69.3-104.5 s).
- **Keep lines short: 3 to 6 words, most often 4.** (barsat-song, 13.4-107.5 s.)
- **Bring new material in blocks of about six lines,** then return to the refrain: verse 2 is six new lines at 69.3-89.7 s, followed by the full refrain at 90.3-107.5 s (barsat-song).
- **End on lines addressed straight to the other person, longer than the rest.** The last two lines are about 11 words each over about 7.4 s each, twice the usual slot (barsat-song, 168.0-182.9 s).
- **At the brief's length (derived):** 20 to 30 s holds about 6 to 8 line slots of 3.5 s. At the usual 4 words a line that is about 24 to 32 words. This is the working word budget. The tool's whole-run figure (39 words a minute, `benchmarks.json` `pacing.words_per_minute`) undercounts the sung words and includes the reference's voiceless stretches, so it is not a usable target; see the notes in `benchmarks.json`.

**Do not copy**

- The length. The reference runs 185.33 s; the brief asks for 20 to 30 s.
- Stretches with no voice: 0-13.4 s, 55.6-69.3 s (13.7 s), 132.4-137.4 s, 155.9-168.0 s (12.1 s). About 57 s, 31% of the run, has no voice and no change of picture (barsat-song).
- A title that is shown but not connected to the words in time. The title word is on screen at 0.00 s and apparently first sung at about 87-90 s; the picture does nothing when it arrives (barsat-song; the 87-90 s reading is probable, not certain).
- Stopping without an ending: the sound fades and the same card sits for 2.4 to 3.0 s, the last 1.72 s in silence (barsat-song, 182.9-185.33 s).
- The lyrics themselves. The brief forbids reusing them, and this playbook does not reproduce them.

## Holding attention

In the reference only the sound holds attention. The picture contributes nothing after the first frame.

- **Change the arrangement under the voice at section boundaries.** The points where the reference's sound changes while the voice carries on or comes in are 13.4 s (voice in), about 30 s (full backing in, level up from about -15 to -11 dB), 69.3 s (new verse), about 85 s (backing thins), about 100 s (backing full), about 110 s (level drops to -14 to -15 dB), about 130 s (full again) and 168.0 s (thin outro). The gaps between them run 10 to 39 s, median about 16 s (barsat-song). **(Derived:)** a 20 to 30 s run has room for one or two such changes, not eight.
- **Let the listener know the next line.** Immediate repetition (13.4 and 16.8 s) and the returning refrain mean most lines are already familiar when they arrive (barsat-song).
- **Keep a steady slot.** The 3.5 s line slot holds through both measured passages (means 3.51 s and 3.53 s), so the listener can predict when the next line lands (barsat-song, 13.4-52.0 s and 69.3-104.5 s).
- **Open the question in the first sung line.** The plea at 13.4 s opens "does the person stay?". It appears to be answered at about 73-77 s, 0.40 of the run, with the refrain still returning afterwards (barsat-song; tentative, it rests on the transcript).

**Do not copy**

- A picture that never changes: one shot of 185.33 s, 0 cuts, nothing moving (barsat-song, 0.00-185.33 s). The brief requires the words on screen to follow the voice, so the picture must change at least at every line.
- Treating the tool's "longest still 7.0 s" and "end hold 3.33 s" as targets. Both are artefacts of the file's 7.0 s keyframes; the real figure is the whole run (barsat-song, `measure.json`).
- Voiceless stretches with nothing on screen in their place (barsat-song, 55.6-69.3 s and 155.9-168.0 s).
- Leaving a muted viewer with nothing: about 160 words are sung and none is shown (barsat-song, 13.4-182.9 s).

## Sharing

- **Write to "you".** The refrain lines address the person who is leaving directly (13.4 s, 23.7 s) and so do the closing lines (168.0-182.9 s) (barsat-song; the second-person forms are consistent across all transcript runs). Evidence that viewers use it that way: 5 of 75 comments tell their own loss or dedicate the song to a person (comments.json).
- **Carry one plain feeling that needs no context.** The subject is being left; the refrain says it in two short lines. The top comments answer the feeling, not any detail: 30 of 75 carry a crying, sad or broken-heart emoji (barsat-song, comments.json).
- **Give at least one line people will point at.** Four comments single out a moment by time: 1:50, 1:15, 1:06, and 0:02-0:22 (comments.json). At 110 s the level drops into the bridge; at about 75 s the transcript puts the "left" line (barsat-song). Why those moments were chosen is my guess, not evidence.

**Do not copy**

- Relying on the song alone to be worth sending. Nobody mentions the picture (0 of 75 comments); it adds nothing a sender could point to (barsat-song).
- Reading the view count as proof that this presentation works. It is one video; the views are about 2,770 times the channel's followers and the data does not say where they came from; every comment is about the song (sources.json, comments.json).
- Someone else's song and artwork. The reference is a third-party upload; the brief forbids reusing either.

## Comments

Evidence is `01-sources/refs/barsat-song/comments.json`: 75 of the platform's 89 comments. Counts are in breakdown section 6. The patterns are my reading of those counts.

- **Leave room for the viewer's own story.** The lyric, as far as the transcript shows, names no person or place, and viewers fill the gap: a love they cannot have, a pet that died, "it happened to me too", a dedication to a named person (5 of 75) (barsat-song, comments.json).
- **Write a line that reads as a saying.** The most-liked comment that is not plain praise is a viewer's own aphorism about the writing (6 likes), and 2 of 75 praise the writing or lyrics directly (comments.json).
- **Expect short praise and emoji, and count them as the normal reply.** 34 of 75 are praise in words and 20 are emoji only; the three most-liked comments (19, 18, 13 likes) are all plain praise (comments.json).
- **Make moments easy to point at.** 4 of 75 comments are timestamps of a favourite line or passage (comments.json).

**Do not copy**

- Giving viewers nothing to answer. No question, no claim, no prompt anywhere in the video; no comment asks or disputes anything; 89 comments on 1.94 million views is 1 per 21,800 (barsat-song, sources.json).
- "Subscribe to channel" as the uploader's contribution to the thread (0 likes) (comments.json).

## Look

Everything here describes the reference's title card (barsat-song, 0.00-185.33 s, measured on `still_120.jpg`; sizes and positions are estimates). It is the only look the reference has. Whether lyric lines should take the title's size, place and colour is a decision for the moodboard: the reference does not show it.

- **Format:** horizontal 16:9. The supplied file is 640x360 at 30 fps; that is the rendition supplied, and the upload's own size is not known.
- **Ground:** warm cream paper, #ded0ba, lighter in the centre (#e0d2bf) and darker at the corners (#c8b08e to #d3bfa1), with faint vertical creases.
- **Ink:** brown-black, #0b0100 at its darkest, for the drawing and the small type.
- **Accent:** one dark red, #7a1713, on one word only, about 1.2% of the frame. No second colour anywhere.
- **Theme in the texture:** short faint diagonal dashes across the paper read as rain, matching the title.
- **Drawing:** stippled ink, built from dots, no outlines filled with tone, no colour. One subject, cropped to the telling detail: two eyes and their tears, no face.
- **Composition:** type on the left (13% to 40% of the width), drawing on the right (47% to 92%). Margins about 13% left, 8% right, 17% top, 12% bottom; nothing touches an edge. Type and drawing cover about 6% of the pixels; the rest is paper.
- **Type:** the main word is about 14% of the frame height and about 28% of the frame width, in a brushed display face with uneven stroke ends and a thick head-line, centred at about 27% across and 40% down. It is the only large type in the frame and the only coloured thing.
- **Overall character:** "muted" (`palette.json`): mean saturation 0.21, mean luminance 0.76, dark share 3.7%.

**Do not copy**

- The artwork itself: the drawing of the eyes, the title lettering, the scanned paper image. The brief forbids reusing it. Take the rules (a paper-coloured ground, brown-black ink, one accent, one cropped drawing), not the pixels.
- A still picture. Nothing moves, nothing builds, there are no transitions (barsat-song, 0.00-185.33 s).
- Mixing a brushed display face with an unrelated plain text face (barsat-song, title against credit).
- A second line of type at about 5% of the frame height, 19 px in this file, about 2.7 times smaller than the main word (barsat-song, the credit).
- The file's technical quality: 640x360 at about 32 kb/s of video, soft stippling, a visible sharpening at the 7.0 s keyframe (barsat-song).

## Sound

Tone of voice, musical character and instrumentation are not measurable here. These are the tool's figures and my arithmetic on them.

- **Loudness:** -12.8 LUFS integrated, loudness range 3.3 LU, true peak -2.3 dBTP (barsat-song, `measure.json`).
- **Never let the gaps between lines go silent.** The backing fills every gap; `audible_share` is 0.988 with no dropouts. Gaps between lines are up to about 1.2 s (barsat-song, 13.4-182.9 s).
- **Start thin, then add weight under the voice.** The voice enters over a backing with almost no energy below 200 Hz (share 0.04 to 0.08 at 15-25 s); the low end arrives at 25-30 s (0.26) and is full from about 30 s (0.57, level -11 dB). That is about 17 s after the voice enters (barsat-song).
- **Thin the backing again for the refrain's return and for the closing lines.** The refrain's return at 90-100 s and the closing lines at 168.0-182.9 s sit over a thinned backing (low-band share 0.12 to 0.26, level -13 to -14 dB) (barsat-song).
- **Pulse:** the strongest regular pulse is 0.44 s (135 to 137 a minute; my computation), and one line slot is about 8 of them (barsat-song, whole run).
- **Voice pace:** the tool reads 96 words a minute while the voice runs and 39 over the whole run, both undercounts; my count is about 75 inside the sung stretches and about 52 over the run (barsat-song). The reference is sung and ours is spoken by the brief's choice, so a spoken line will be shorter than its 3.5 s slot; how to fill the slot is the producer's decision.
- **Transitions on sound:** no evidence. The reference has no transitions, so nothing can land on a sound (`sync` is null).

**Do not copy**

- The song or the recording. The brief forbids it.
- A quiet 13 s intro before the voice (barsat-song, 0.00-13.36 s).
- Voiceless breaks of 12 to 14 s (barsat-song, 55.6-69.3 s and 155.9-168.0 s).
- 1.72 s of silence at the end over an unchanged picture (barsat-song, 183.6-185.33 s).
