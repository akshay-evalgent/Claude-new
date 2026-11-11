# Recipe: "Max cro" style animated documentary

Reverse-engineered from one video on the Max cro channel:
"प्राचीन इंसान पूरा दिन क्या करते थे?" (What did ancient humans do all day?),
17:23, 2.1M views, video id `bqb1pKoJEok`.

Analysed from a 640x360, 25 fps copy. Every number below was measured on that
file; anything that is my inference is labelled as such.

## The one-line finding

It is not animation. It is a narrated slideshow: about 360 still drawings,
one per spoken phrase, joined by hard cuts, with a voice and nothing else.
There is no camera movement, no zoom, no music and no sound effects.

## What was measured

| Thing | Result |
|---|---|
| Length | 1,042.7 s (17:23) |
| Shots | about 360 (a few low-contrast cuts may be uncounted) |
| Shot length | median 2.8 s, mean 2.9 s; 80% fall between 1.5 s and 4.6 s; longest 7.2 s |
| Pace by section | first minute 1.9 s per shot; middle 2.8-3.1 s; last two minutes 3.7 s |
| Frames with no change at all | about 90% (the picture is frozen between cuts) |
| Zooms, pans, push-ins | none found in any shot |
| Transitions | all hard cuts; no fades, wipes or dissolves |
| Cut timing | 97% of cuts sit inside a silent gap between two spoken phrases |
| Audio channels | mono voice (left and right are identical) |
| Music bed | none: 4-9% of every minute is digital silence, which a music bed would fill |
| Sound effects | none detected |
| Loudness | voice sits around -20 dB RMS, gaps drop to true silence |
| Speech rate | about 200 words a minute (measured on the first 2 minutes only) |
| On-screen text | roughly 1 shot in 10 is a text card; no subtitles or captions |

Evidence is in `evidence/`: `a_0_30.jpg` (first 30 s at 2 frames a second),
`all0-2.jpg` (every second shot of the whole video), `spec.jpg` (spectrograms
showing voice with silent gaps) and the Hindi transcript of the first 2 minutes.

Inferences, not measurements:

- The drawings look AI-generated in one fixed style (consistent character,
  slightly varying line work and props from shot to shot).
- The voice is probably text-to-speech or a heavily gated recording, because
  the gaps between phrases are perfect digital silence.

## Visual style

- **Characters:** stick figure with thin black limbs, a round white head, dot
  eyes, small mouth and one or two eyebrow lines for emotion. The ancient human
  has messy brown hair and a ragged fur tunic. Modern people are the same figure
  bald, in a shirt. Experts (archaeologist, researcher) are drawn slightly more
  realistic with a hat and khaki clothes.
- **Line:** hand-drawn marker outline, slightly uneven, medium weight.
- **Colour:** flat fills with soft watercolour shading. Warm palette of cream,
  sand, ochre, brown and pale sky blue. Night scenes use deep navy with an
  orange fire glow.
- **Two background modes, alternated constantly:**
  1. Full painted scene (savanna, camp, cave, dig site) for story beats.
  2. Subject alone on an off-white page for ideas, comparisons and text.
- **Framing:** 16:9, one subject per frame, centred or on a third, medium or
  wide shot. Close-ups are rare and used for objects (skull, flute, shell).
- **Recurring devices:** split screen with a dashed divider (modern vs ancient),
  thought bubbles, question marks, crossed-out icons, arrows, simple maps,
  calendars and scales as diagrams.

## On-screen text

- Used sparingly, as a punchline or label, never as subtitles.
- Hand-lettered capitals in dark brown on off-white, two to four words:
  "REWIND 50,000 YEARS", "WHAT SHOULD I DO TODAY?", "17 HOURS A WEEK",
  "81% = STORIES", "A BRAND NEW IDEA".
- A small doodle sits beside the words (sun, leaf, hourglass, bulb).
- Source labels in small type: "1963 - RICHARD LEE", "JAMES SUZMAN - STUDY".
- Diagram labels in small capitals: "FOOD / PEOPLE", "FAST / STEADY",
  "HUNTER-GATHERER / FARMER".
- Text is in English even though the narration is Hindi. One speech bubble is
  in Hindi.
- The text is part of the drawing, not an overlay added in the editor.

## Script structure of this video

| Time | Beat |
|---|---|
| 0:00-0:15 | Modern pain: the alarm clock decides your day. Seven shots in 15 s. |
| 0:15-0:35 | "Rewind 50,000 years". A human wakes with no alarm and asks "What should I do today?" |
| 0:35-1:30 | Voice the viewer's objection ("no, that can't be"), then promise evidence. |
| 1:30-4:10 | Evidence: digs, skeletons, what bones reveal about work. |
| 4:15-6:00 | Walk through the actual day: camp, fire, the hunt. |
| 6:00-8:30 | Named study (Richard Lee, 1963) and the headline number: 17 hours a week. |
| 8:30-10:30 | What they did with free time: craft, ornaments, music, sharing. |
| 10:30-13:20 | Second study (James Suzman), nights, "81% = stories". |
| 13:20-15:50 | The turn: farming as a trap, more food, more people, more work. |
| 15:50-17:23 | Callback to the alarm clock and the opening question. |

Writing rules that follow from it:

- Open on the viewer's own life, not on history.
- State a surprising claim, then say the objection out loud before answering it.
- Short phrases, one idea each, written so each can carry its own picture.
- Name real researchers and give one memorable number per section.
- End by repeating the opening image and line.

## How to make one

1. **Topic.** A "how did ancient humans do X" question that sets a modern worry
   against the past. Thumbnail text is two or three words in yellow capitals
   ("NO JOBS", "SURVIVED HOW?").
2. **Script.** About 3,300-3,500 words for 17 minutes at this speech rate.
   Break it into phrases of 1.5-4.5 s. Expect about 20 phrases a minute.
3. **Shot list.** One row per phrase: the phrase, the picture, and whether it is
   a scene, a white-page idea shot, or a text card. Aim for about 1 text card in
   10 and keep scene and white-page shots alternating.
4. **Images.** Generate every picture from one locked style prompt plus a
   character reference image so the figure stays the same. Starting prompt:

   > Hand-drawn 2D cartoon, stick figure with thin black limbs and a round
   > white head, dot eyes, messy brown hair, ragged brown fur tunic. Uneven
   > black marker outline, flat colours with soft watercolour shading, warm
   > cream, sand and ochre palette, storybook look, 16:9, one clear subject,
   > [SCENE]. No text unless specified.

   For idea shots replace the scene with "isolated on a plain off-white
   background". For text cards ask for "hand-lettered dark brown capitals
   reading '...' on off-white, with a small doodle of ...".
5. **Voice.** Record or generate one clip per phrase in a calm, clear narrator
   voice. Leave 0.15-0.3 s of silence between clips.
6. **Assemble.** Lay the voice clips end to end. Put each picture under its
   phrase and cut exactly in the gap. No transitions, no movement, no music.
   Open fast (under 2 s per shot for the first 15 s) and let shots lengthen
   toward the end.
7. **Export.** 1920x1080, 25 fps, mono or stereo voice only.

## Where you could beat it

The original leaves easy improvements on the table. Each is optional and none
is needed to match it:

- A slow push-in (2-4% over the shot) on the longer shots.
- A quiet music bed and a few sound effects (alarm, fire, footsteps).
- Burned-in captions for viewers watching muted.

## Limits of this analysis

- One video only. The other three on the channel were not analysed, so the
  recipe may not hold for all of them.
- The copy was 360p, so fine line texture and small text were judged at low
  resolution.
- Only the first 2 minutes were transcribed; the script structure after that
  is read from the pictures, not the words.
- Sound effects mixed under speech at very low level cannot be fully ruled out,
  but the silent gaps and identical channels make a music bed impossible.
