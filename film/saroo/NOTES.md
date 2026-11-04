# Saroo / "found his way home on Google Earth": v2 edit

Source: `film/input/draft.mp4` (83.9 s, 1080x1920, 30 fps, from the Google Drive link; not in git).
Output: `film/saroo/out/saroo-v2.mp4` (57.67 s; not in git). Rebuild with `python3 film/saroo/edit.py`.

The changes follow the priority order in `shorts-virality/LEVERS.md`.

## What changed

| # | lever | change |
|---|---|---|
| 1 | stop subtracting | **83.9 s → 57.7 s.** Shorts over 1 minute that carry a Content ID claim are blocked. Being under 60 s takes that risk off the table whatever the music turns out to be. |
| 2 | retention | 26 s of narration removed, all cut in measured gaps between words. The 0.9 s frozen frame at 41.9 s (orphanage) went with its line. The 1.5 s silent end hold is gone. |
| 3 | hook | Frame 0 is now a title card: *THE TRUE STORY BEHIND LION / HE FOUND HIS WAY HOME / ON GOOGLE EARTH*. It is set in the video's own title style (Montserrat, white plus #FFD53F yellow) and fades at 2.6 s to reveal "1986". The first spoken words are "A little boy fell asleep on a train", no longer "In 1986". |
| 4 | loops | The last 0.5 s dissolves into the first frame. The final frame matches frame 0 (mean difference 0.8/255), so a replay runs on with no jump. The end title "He never forgot the way home" now turns into "He found his way home". |
| 5 | engagement | No video change. Suggested pinned comment: *Could you find your childhood home on Google Earth from memory?* |

The captions were left alone. They are already full-width, high-contrast, word-highlighted, and placed clear of the bottom strip.

## The cut

| kept (source) | new | narration |
|---|---|---|
| 1.37-12.10 | 0.00-10.73 | A little boy fell asleep on a train in India and woke up nearly 1,500 kilometres from home. Twenty-five years later, he found his way back using Google Earth. |
| 16.70-20.23 | 10.67-14.20 | One day his older brother Guddu took him on a train to Burhanpur. |
| 22.07-36.00 | 14.13-28.07 | Saroo fell asleep on the platform. When he woke up, Guddu was gone. He climbed onto an empty train to look for him, and the train began to move. It didn't stop until Kolkata. He couldn't read and didn't know the name of his town. |
| 44.20-54.97 | 28.00-38.77 | A couple from Tasmania adopted him and he flew to the other side of the world. Years later, he opened Google Earth, drew a circle around Kolkata and followed the railway lines. |
| 58.47-67.10 | 38.70-47.33 | He spotted a station called Burhanpur. He followed the tracks north, and there it was: Khandwa. A fountain he remembered, right by the tracks. |
| 68.77-74.23 | 47.27-52.73 | He flew home. Locals led him to his mother, Kamla. But Guddu had been killed by a train. |
| 76.27-78.20 | 52.67-54.60 | Saroo's story became the film Lion. |
| 79.87-83.00 | 54.53-57.67 | All because he never forgot what home looked like. *(end title, then loop)* |

**Removed:**
- "In 1986" (the "1986" title stays on screen)
- "His name was Saroo, and he lived in Khandwa, in central India." Khandwa now lands as a reveal.
- "seventy kilometres away"
- "only that his station sounded like Berampur." Burhanpur is set up earlier as where he got lost, so "a station called Burhanpur" still pays off.
- "He survived around Howrah station until he was taken to an orphanage."
- "In 1987"
- "one by one. Late one night in 2011"
- "In 2012"
- "near where they were separated"
- "starring Dev Patel"

"Saroo's story became the film Lion" is kept on purpose. Without it, "But Guddu had been killed by a train" runs straight into "All because he never forgot…", which reads as if Guddu died *because* Saroo remembered.

## Checks on the output

| check | result |
|---|---|
| length | 57.67 s (1,730 frames, 30 fps) |
| loudness | -14.2 LUFS integrated, -1.3 dBFS peak (source -14.4 / -1.1) |
| frozen picture ≥ 0.6 s | none (source: 0.9 s at 41.9 s, plus the end hold) |
| audio joins | all 7 crossfades sit fully inside gaps between words (7.7-14.7 dB in the voice band, against 25-40 dB for speech) |
| loop | last frame vs first frame: 0.8/255 mean difference |

Joins are 2-frame dissolves on picture and matching 2-frame crossfades on audio, so sync is exact. Every segment starts 1-2 frames before its first word, so the fade-in finishes before the word begins.

## Still open

- **Dev Patel photo:** it now shows for about 0.7 s during "the film Lion" (it was about 2.5 s). It is the one image in the video whose licence isn't visible; the Hobart photo carries a CC BY-SA credit.
- **Music:** I can't tell whether it's licensed. At 57.7 s a claim would no longer block the Short, but it would still send the revenue to the rights holder.

`look/before-after.jpg` shows the opening and the last frame, before and after.
