# Home

Source of truth: `script.json` in this folder. This file is the same script for reading.

## Changes in this revision

Revision 1, answering `06-review/script-round-1/` (hook, retention, share, comments). Where the judges disagreed, the orchestrator's rulings were followed, not the single verdicts.

**Must**

| Finding | What was done |
|---|---|
| Retention, must: keep something pending from the first frame to the turn. (1) The window on the sheet, unlit, from frame 0. | Done. Beat `title` now has the window at the far right in frame 0, a square marked by a few sparse dots, unlit. Beat `light` no longer makes it appear: it lights on the word "light". `carries_through.drawing` says the same. |
| Retention, must: (2) replace line 3 with an unfinished clause that line 4 completes. | Done. Line 3 is now "Until one word," and line 4 "the light stays on." (lower-case "the"). The beat `word` is replaced by `until`, pause 1.4 s, three road dots for three words. The judge's own wording was "Until you do,"; the verdict allows any unfinished line 3, and this one keeps "one word" in the lyric (see the "Home." row below). 32 words, inside the 24 to 32 budget. |
| Comments, must: `post_caption` as a question about the viewer's own life that does not give away the payoff. | Done. "Who tells you "text me when you're home"?" The judge's self-contained form was used because the brief names no platform; the shorter "Who says this to you?" is kept in `post_caption_notes` for a platform that shows the caption beside the playing video. |

**Should**

| Finding | What was done |
|---|---|
| Comments: make `comment_prompt` a first comment that can be posted. | Done. "Some people say 'drive safe'. Some say 'have you eaten'. What's the one you grew up with?" `comment_prompt_notes` says not to present it as the creator's own memory unless the creator supplies a true one. |
| Share: give the payoff a longer slot (pause 2.8 s). Retention: cut the pause after it to 1.5 s. Ruling 1: split the delivery, breath of about 1.8 s, drawing moving in it. | Done as ruled. The payoff is two beats with the same line kept on screen: `asking` ("Asking is how", pause 0.6 s) and `love` ("I love you.", pause 1.8 s). Neither 2.8 nor 1.5 was used. The line's slot is 4.27 s against 2.65 to 3.19 s for the others. The share judge's condition on the split ("drop it if the first half sounds cut off when spoken alone") cannot be settled here: see "To check by ear" under Length. |
| Retention: do not hold the road still through the whole breath after the payoff. | Done. In beat `love` the road holds still while the three words light; about 0.6 s after "you" the first dots of the last stretch land and keep landing through the breath. The final dot still lands on "home". |
| Retention: shorten the rest after `light` to 1.6 s; leave `fine` at 2.1 s. | Done. `light` 2.05 to 1.6; `fine` unchanged at 2.1. The road now also grows through the breath after `light`. |
| Hook: put the window on frame 0. | Done (same change as the retention must). |
| Hook: bring the faint first line in at about 0.5 s instead of 1.33 s. | Done, in beat `title` motion; beat `ask` now says the words are already faint when the voice starts. The voice still enters at 1.45 s. |
| Share: hold the finished sheet longer (`--tail 2.2`), bed sounding, dots still gathering. | Done. `--tail 2.2`; written into beat `home` motion and `sound_notes`. The picture holds 2.18 s after the last word. |
| Comments: make the last frame read as the one-word reply, "Home." Ruling 2: keep it only if its setup stays honestly inside the word budget. | Kept. The setup was "One word will do.", which the retention must removed. The new line 3, "Until one word,", is unfinished as the must requires and still says that one word is what is waited for, at 32 words. After the ink words fade, the red word resets once from "home" to "Home." and holds about 1.6 s. If "Until one word," reads as strained, the fallback is the retention judge's "Until you do," with the last frame left as lower-case "home": the reply ending would then have no setup and should go. |
| Retention: corrected sync rule. | Done. `carries_through.sync_rule` now has each line's first word lighting at the beat's `vo_start`, the last word lit by `vo_end`, transcribe.py times only for the words between and moved inside the beat if they fall outside it. Checked on the new voice track: transcribe.py again puts line starts 0.2 to 0.5 s before the voice (for example 4.08 s against 4.605 s), so the rule is needed. |
| Hook and retention: say that the lyric rows are the only words on screen. | Done, in `carries_through.lyric_setting` and `sync_rule`: no caption track, no label, no credit; timing.json's caption groups are not drawn; rows are broken as the beats set them. The one word outside the rows is the lyric's own "home", alone in the first frame and, as "Home.", in the last. |

**Not changed:** beats `again` and `fine` (words, pauses and pictures), the refrain, the question, the share line, the premise and the facts. Beat `ask` changed in two phrases only (the words are already faint; the road heads toward the unlit window). Fixes addressed to the moodboard and video stages (the faint-ink value, not passing captions to the film, the bed level under the title) are not this stage's; `sound_notes` now says "thin in texture, not lower in level" so the script does not contradict the last of them.

## The script

- **Premise:** Fiction: an original lyric, spoken to "you", in which someone keeps asking you to text when you are home and then admits that asking is how they say I love you.
- **Audience:** General viewers of music and short video; anyone who has said or been told "text me when you're home".
- **Question:** Why does the speaker keep asking you to text when you're home?
- **Share line:** this is what I mean every time I tell you to text me
- **Comment prompt (to post as the first comment):** Some people say 'drive safe'. Some say 'have you eaten'. What's the one you grew up with?
- **Post caption:** Who tells you "text me when you're home"?

## The lyric

> Text me when you're home.
> Text me when you're home.
> Until one word,
> the light stays on.
> I know you're fine.
> Asking is how (short pause) I love you.
> Text me when you're home.

Last frame, not spoken: the red word alone, as "Home."

## Length

| | Target | Measured (`timing/timing.json`) |
|---|---|---|
| Duration | 20 to 30 s (brief) | 24.38 s |
| Lyric lines | 6 to 8 slots | 7 (9 beats: a silent title, and the payoff line over two beats) |
| Words | 24 to 32 (derived budget) | 32 |
| Words a line | 3 to 6 | 3 to 6 |
| New line every | 3.0 to 4.1 s, mean 3.5 s | 3.16, 3.19, 2.65, 2.82, 3.08 s, then 4.27 s for the payoff line |
| Rests between lines | reference: up to 1.2 s, under a sung voice | 1.65, 1.6, 1.4, 1.6, 2.1, 1.8 s; 0.6 s inside the payoff line |
| First word | 1.4 to 2.2 s | 1.45 s |
| Turn ("I know you're fine.") | 40% to 70% of the run | 54% to 58% |
| Payoff ("Asking is how / I love you.") | about 80% of the run | 67% to 77%; "I love you." 74% to 77% |
| Picture after the last word | reference 2.4 to 3.0 s, unchanged and partly silent (a fault) | 2.18 s, with the word changing at about 0.6 s and the bed sounding |

Voice: `voice.py --pace 0.8 --tail 2.2`, default `--lead` and `--gap`. The producer should use the `vo.wav` and `timing.json` now in `timing/` together: the built-in voice does not speak a line the same length twice, so a re-run moves every time by a few hundredths to a tenth of a second. The tool reports 79 words a minute over the run, above `pacing.words_per_minute` (33 to 45), which the benchmarks' notes say is an undercount and not a usable budget.

Three figures sit outside the reference's range, each on purpose. Lines 3 and 4 have slots under 3.0 s because they are one sentence spoken over 5.47 s. The payoff line's slot is 0.17 s over 4.1 s because it is the line given more room. The payoff ends at 77% of the run, not 80%, because the end hold after the last word was lengthened to 2.2 s.

**To check by ear.** I cannot hear the voice track. Measured on it: transcribe.py reads all 32 words correctly, including "Asking is how" spoken alone. But the built-in voice ends a beat spoken alone on a falling pitch: "how" falls to about 105 Hz, the same floor as the end of a sentence, where inside the unsplit sentence it sits at about 170 to 180 Hz. So the split may sound like two statements, not one sentence held open. If it does, the fallback is one beat, "Asking is how I love you.", with `pause_after_s` 1.8 and the road moving as written.

## What carries through every beat

- **Ground:** one sheet of warm cream paper, first frame to last. No change of scene; a new beat is a new line of words on the same sheet. The exception is beat `love`, the second row of the line already on the sheet.
- **Ink:** brown-black for every lyric word and for the drawing.
- **Accent:** one dark red, on one word only: "home", every time it is on screen, including "Home." at the end.
- **Lyric setting:** one line on screen at a time, large, in the left half, in two rows, in the same place every time, one face throughout. The lyric rows are the only words on screen, with the lyric's own word "home" alone in the first frame and, as "Home.", in the last. No caption track, no label, no credit.
- **Sync:** a line appears whole in faint ink at the start of its slot (the first line early, at about 0.5 s). Each line's first word lights at its beat's `vo_start` and its last word is lit by `vo_end`. transcribe.py word times are used only for the words in between and are moved inside the beat if they fall outside it. Row two of the payoff line stays faint through the short pause and lights in beat `love`. A lit line stays through the breath and is replaced when the next line starts.
- **Drawing:** stippled dots only. A small window at the far right, on the sheet and unlit from frame 0, and a road of dots that starts at the lower left margin and grows toward it, one stretch per line. The window lights on the word "light"; the road reaches its sill on the last word. Dots keep landing in the breaths, so nothing is frozen while the voice rests.

## Beats

| # | id | Role | Voice-over | Picture |
|---|---|---|---|---|
| 1 | title | hook | (silent, 1.2 s) | The sheet with one word on it: "home", large, dark red, in the left half, where it will sit as the last word of the first line. Far right, a small window marked by a few sparse dots, unlit, there in frame 0. Low in the left margin the first three road dots land one after another. At about 0.5 s "Text me" and "when you're" arrive in faint ink in front of the red word. |
| 2 | ask | hook | Text me when you're home. | The first line, faint since about 0.5 s, is lit in front of the red word: "Text me" over "when you're home". The ink words light one by one; the red word pulses when it is spoken. The road leaves the margin and climbs a little to the right, toward the unlit window. |
| 3 | again | hook | Text me when you're home. | The same line in the same place, lit a second time: the ink words drop back to faint and light again; "home" has stayed red. The road bends once. |
| 4 | until | setup | Until one word, | The refrain, red word included, has lifted off. A short line that is not yet a sentence: "Until" over "one word," with its comma. No red on the sheet. One road dot lands with each word, three for three; in the short breath the road fills in to nearly half its length. |
| 5 | light | escalation | the light stays on. | "the light" over "stays on.", lower-case because it finishes line 3's sentence. The window that has been there since frame 0 lights: dots of the dark gather round the square from the word "light", so the bare paper inside reads as lit. The road keeps growing through the breath. |
| 6 | fine | turn | I know you're fine. | "I know" over "you're fine." The road stops wandering and runs straight at the window, stopping one stretch short. |
| 7 | asking | payoff | Asking is how | The longest line, whole on the sheet: "Asking is how" over "I love you." All in ink. Row one lights; row two waits in faint ink through a 0.6 s pause. The road waits, one stretch short. A dot or two lands round the window. |
| 8 | love | payoff | I love you. | The same line in the same place; nothing is replaced. Row two lights, and the whole line stays untouched through the 1.8 s breath. About 0.6 s after "you" the road's last stretch starts and the gap to the window is seen closing. It does not arrive yet. |
| 9 | home | close | Text me when you're home. | The refrain back in its first place. The last road dot reaches the window's sill on the word "home", which turns red as it is spoken. The ink words fade over about 0.4 s; at about 0.6 s after the voice the red word resets once, in place, to "Home." with a capital and a full stop, like a one-word message: the reply. It holds about 1.6 s with the finished road and the lit window, dots still gathering, bed still sounding. |

Sound, for the producer (from the playbook's Sound section): bed audible from the first frame, under every breath and to the last frame of the end hold. Thin in texture, not lower in level, under the title and the first two lines; one added layer of weight from "the light stays on"; thinned again under the payoff line and the last line. A soft hit on each of the seven line starts, and none on beat `love`.

## Facts

The video is fiction and states no facts about the world.

| Claim | Source | Status |
|---|---|---|
| The lyrics are original and were written for this video. They reuse no line, image or story from the reference song and are not a translation of it. | brief.md (original lyrics, fiction, invented for this video) | invented |
| The speaker, the person addressed as "you", the road, the light left on and the window are made up. No real person or event is described. | brief.md (fiction) | invented |
