# Production notes: Home (lyric video)

`video.mp4`: 1920x1080, 30 fps, 24.77 s (743 frames), H.264 with AAC sound. Second cut. The first cut is kept as `video_round1.mp4`.

## Changes in this revision (final review, round 1)

The voice track, `timing.json` and `words.json` are the first cut's files, byte for byte. No word time moved and the film is the same length. The script is unchanged (the review's ruling).

**The look (the quality check's must fix, made at the mood board stage)**

- The film now loads the drawing from `04-moodboard/drawing.js` and no longer holds a copy: the window is hand stipple, 1.5 times larger, with shutters. Type is 168 px. The sheet is the kit's remade `paper.jpg`.
- The mood board's three edits were checked, not taken on trust. Tokens match `style.json`. The film's frames at 0.0 s and 1.4 s are identical to key frames 1 and 2, pixel for pixel. The last frame, rendered alone, is identical to key frame 5. See "Picture" for the two places where the film and the board do not agree to the last figure.
- The night round the window now grows by `style.json`'s plan (0.45, 0.50, 0.66, 0.80, 0.93, 1), where the first cut had to use lower figures. The helper that read the kit's dot list is gone.

**Video-stage should fixes**

| Asked | Done | Where to see it |
|---|---|---|
| Hook: two or three lead dots ahead of the road, 2.0 to 2.9 s | Three single dots land up the road's first rise, one on each of "when" (2.20 s), "you're" (2.34 s) and "home." (2.52 s). The road fills in behind them by 4.5 s | `check/hook.jpg`, 2.25 to 2.75 s |
| Retention and the ruling: more in the rest after "I know you're fine." (14.24 to 16.22 s), picture and sound | Picture: the road waits while the line is spoken and then runs the whole straight in the rest (290 dots, its tip 12% of the width, was 7%); three steps land ahead of it at 14.74, 15.23 and 15.73 s; the night gathers 365 more dots. Sound: each of the three steps is heard, and the low layer swells 3 dB through the rest instead of leaving | `check/rest_frames.jpg`, `check/activity.json` |
| Quality: the repeated line falls back to faint over 0.1 to 0.15 s | The four ink words are full ink at the cut (4.485 s) and fall to faint over 0.12 s, the breath before the voice. Seen over four frames, 4.50 to 4.60 s | `check/fall_frames.jpg` |
| Quality: the bed in the rests at about -22 dB | Every rest now reads -22.1 to -23.1 dB (was -27.4 to about -30); -20.8 and -19.9 dB in the two rests that carry the low layer | `audio/mix.json` |
| Hook: one soft hit at about 0.5 s | At 0.50 s, as the faint first line starts to arrive: the line-start sound at the line-start level. The tool hears it at 0.51 s | `check/measure.json` |

Measured in the rest after "fine.": 109 pixels change in the average frame, against 38 in the first cut, and no frame is without change (2 of 58 were). The sound has three events in it, against none. `measure.py`'s own motion figure for those two seconds still reads 0.01 (was 0.0): it hardly registers dots, in any rest.

**One new WARN, left on purpose: loudness reads -15.6 LUFS against the reference's -12.8.** The voice is as loud as in the first cut, within 0.1 dB on every line. The reading fell because the meter ignores passages more than 10 LU under the rest: the first cut's rests were ignored, so its -13.1 was the voice alone; a bed at -22 dB is counted, and the voice runs for only 40% of the film. The tool's loudness pass would make that up by driving the voice further into a limiter that already takes about 5 dB off its peaks. Tried: 1.5 dB more gain moved the reading by 0.7 LU and the loud lines by 0.4 dB; the rest went into the limiter. I held the voice. The choice is between this WARN and the bed at its old level; the quality checker decides.

**Not done**

- The retention check's shorter pause after "fine.": overruled for this round.
- The share check's two line-6 fixes and the retention check's line-3 fix: each is conditional on a human listen that has not happened.

## To check by ear (nobody in the pipeline can hear)

Six short files in `audio/listen/`. The first three are the first cut's and still apply; the last three are new and are cut from this cut's track.

| File | Listen for |
|---|---|
| `line6_as_in_film.wav` | "I know you're fine." then line 6 as the film has it (voice only). Does "how" sound held open, or like a question ("Asking is how?") or like "howl"? |
| `line6_scriptwriter_split.wav` | The same stretch from the scriptwriter's track: "how" falls like the end of a sentence. |
| `lines3_4_until_one_word.wav` | "Until one word," then "the light stays on." Does line 3 sound like a closed statement followed by a gap? |
| `opening_0_to_3s.wav` | The bed at its new level, the added hit at 0.5 s, then the first line. Does the hit sound like part of the film or like a mistake? |
| `rest_after_fine_13_to_18s.wav` | "I know you're fine.", the rest with its three soft steps and the low layer swelling, then "Asking is how". Do the steps sound like steps toward something, or like ticking? Does the swell stop too suddenly at the payoff line? |
| `bed_in_the_rests_6_to_12s.wav` | Two rests with only the bed, 5 dB up on the first cut. Is it a held breath, or a hum that gets in the way of the voice? |

Every level in the sound was set by measurement. If any of the last three is wrong, the cure is one constant in `audio/mix.py` (`BED_LIFT_DB`, `STEP`, `SWELL_DB`, `HIT`) and a re-run of `mix.py` and steps 3 to 5.

If line 6 as built is worse than the scriptwriter's: `python3 audio/build_voice.py --line6 split`, then transcribe.py into `audio/stt/{base,small,medium}`, `audio/sync_words.py`, `audio/cues.py`, `audio/mix.py`, and steps 3 to 5.

## Voice

Unchanged from the first cut.

- Built-in voice `en_US-lessac-medium`, pace 0.8, as the script was timed. Tail 2.6 s, so "Home." stands 2.0 s.
- Built by `audio/build_voice.py`. Lines 1 to 5 and line 7 are the scriptwriter's own audio from `03-script/timing/vo.wav`. Line 6, "Asking is how, I love you.", was spoken as one utterance and cut inside the silence at the comma, with the script's 0.6 s pause laid between the halves (the script review's cure). The pitch at the end of "how" now rises where it fell; whether that sounds held open or like a question needs the listen above.
- "I love you." runs 0.69 s in this take against 0.76 s in the scriptwriter's.
- Line 3, "Until one word,", was not changed: spoken as one utterance with line 4 it still falls at the comma.
- Words a minute: 78 over the run, 182 while speaking by `timing.json` (197 by transcribe.py on the film). Both are outside the benchmark ranges, which the benchmarks' notes call an undercount of a sung song. Not chased with the pace.
- The speech-to-text model hears all 32 words of the script in the finished film, with the bed 5 dB louder than before.

## Word sync

Unchanged. A line's first word lights at the beat's `vo_start`; the last is fully lit by `vo_end`; the words between take their times from transcribe.py, each checked against the waveform (`audio/sync_words.py`, `audio/words.json`). Of the 24 in-between words, 17 use transcribe.py's time and 7 use the waveform reading, which is mine, from a table, not from listening.

## Timing

| Beat | Shot starts | Voice | Enters by |
|---|---|---|---|
| title | 0.000 | none | cut |
| ask | 1.330 | 1.450 to 2.955 | cut |
| again | 4.485 | 4.605 to 6.196 | cut; the ink words then fall to faint over 0.12 s |
| until | 7.676 | 7.796 to 9.043 | cut |
| light | 10.323 | 10.443 to 11.662 | cut |
| fine | 13.142 | 13.262 to 14.243 | cut |
| asking | 16.223 | 16.343 to 17.482 | cut |
| love | 17.962 | 18.082 to 18.776 | cut, nothing replaced |
| home | 20.456 | 20.576 to 22.160 | cut; ends at 24.767 |

Every cut is on the one continuous sheet, so none shows as a change of scene (measure.py finds no cut). No dissolve or iris anywhere.

Two moments are shared by the picture and the sound, so they are worked out once, by `audio/cues.py`, and read by both: the first line arriving (0.50 s) and the three steps in the rest after "fine." (the quarter points of the rest, 0.495 s apart, so that with the next line's own hit they make four even beats).

## Picture

No artwork was supplied. Everything is drawn in code with the stipple-lyric kit: the sheet is the kit's `paper.jpg`, the drawing is the mood board's `drawing.js`, loaded, and the lyric markup follows `frames.html`. No caption element, no `Film.captions`, no film.js fades on words.

Carried from the script review, unchanged: row two of the payoff, "I love you.", arrives faint at 17.48 s when "Asking is how" ends; the reset from "home" to "Home." takes 22.64 to 22.88 s with one swell (`check/reset_frames.jpg`) and "Home." then stands 2.0 s; every line and the window read at 390 px wide (`check/phone_390.jpg`).

Stillness: measure.py finds no still stretch. The longest run of frames in which no pixel changes is 0.47 s (1.00 to 1.47 s, before the first word), as in the first cut. The last dot lands 0.3 s before the final frame.

Differs from `style.json`, on purpose:

- **The rest after "fine."** The board has the road running at an even rate across the whole beat and the night holding. Here the road waits while the line is spoken and runs in the rest, and the night gains 0.05 of its dots there (0.45 to 0.50). So it stands 0.05 above the board's plan from the rest until the road moves again at 19.38 s (0.55 at the start of "I love you." where the board has 0.50); from 0.66 on it is the board's plan.
- **The lead dots.** The road's fourth, fifth and sixth steps land on three words at 2.20 to 2.52 s; the board had them spread through the breath. No single step lands in the rest after line 1 any more; the road alone moves there.
- **The title's second and third road dots** land at 0.30 and 0.95 s, not 0.45 and 0.9 s, so neither falls on the line arriving at 0.5 s (as in the first cut).
- **A word falling back to faint** is not in the kit, which only lights words. The composition adds it for beat "again" in a few lines of its own (`falls`).

Where the film and the mood board do not agree to the last figure:

- Key frame 4 ("love", one word from the end) shows the night at 0.62. `style.json`'s own growth plan puts it at 0.54 at that moment; the film has 0.58.
- In a full render, 16 pixels of the last frame differ slightly from key frame 5, where the road passes the lower edge of the type's filter. Rendered alone the frame is identical, so this is the browser redrawing part of a frame, not the composition. Not visible.

## Sound

`audio/track.wav`, built by `audio/mix.py`, which reuses sound.py's own bed, hit, voice duck and limiter and changes how they are laid out.

- The bed is at full level from the first frame. It is 5 dB louder against the voice than in the first cut, and 80% of its own slow swell (5 dB over about 17 s, lowest under "Until one word,") is taken out, so every rest is lifted alike. Rests without the low layer: -22.1 to -23.1 dB. The duck under the voice is sound.py's, unchanged: the bed sits about 19 dB under the voice while it speaks.
- The low layer (55, 82 and 330 Hz) comes in on the word "light" (10.54 s). In the first cut it faded out through the rest after "fine."; now it swells 3 dB through that rest and leaves in the last 0.5 s before the payoff line, so the payoff and the last line are thin again. That rest reads -19.9 dB (was -26.4).
- A soft hit on the seven line starts, the same samples as in the first cut, and none on "love". Added: one at 0.50 s at the same level, and three at about 5 dB less on the steps in the rest (14.74, 15.23, 15.73 s). measure.py hears all four.
- No music: sources.json lists none.
- -15.6 LUFS, true peak -1.4 dBTP, audible throughout, no dropouts. On the loudness reading, see the top of this file. The gain is the one sound.py's loudness pass gives the first cut's layout (5.9 dB, which brings that layout to -13.1 LUFS).

## Comparison with the reference

23 pass, 2 warn, 5 fail (`check/compare.json`). The five fails are the same rows as in the first cut, the ones the benchmarks' notes list as misleading against this reference and the round-1 judges confirmed as misfits. None was acted on.

| Row | Ours | Reference | Why it stays |
|---|---|---|---|
| mean shot length (fail) | 24.77 s | 185.33 s | One unbroken shot in both; the row fails on the brief's length alone. |
| longest shot (fail) | 24.77 s | 185.33 s | The same. |
| first word (fail) | 1.33 s | 13.36 s | The reference's 13 s wait is a listed fault. Ours is in the scaled range (1.4 to 2.2 s): the voice starts at 1.45 s. |
| words a minute, whole run (fail) | 78 | 39 | The reference figure is an undercount of a sung song; the script was budgeted from line slots (24 to 32 words). |
| words a minute, while speaking (fail) | 197 | 96 | A spoken voice against a sung one. |
| sound events per second (warn) | 1.25 | 3.45 | Up from 1.05. A voice with rests over a plain bed, against a full band. The voice is there: 32 of 32 words heard. |
| loudness (warn, new) | -15.6 LUFS | -12.8 LUFS | The cost of the louder bed with the voice held where it was. See the top of this file. |

Two passes mean nothing: "cuts per 10 s" (0 against 0, because the cuts do not show on one sheet) and "still picture share" (cannot fail against this reference). The stillness check that counts is the one under Picture. "Dark ink share" is 0.0245, up from 0.0174, against the reference's 0.0368.

`check/` also holds four sheets and one table the pipeline's tools do not make, built by `check_extras.py`: `phone_390.jpg`, `reset_frames.jpg`, `fall_frames.jpg`, `rest_frames.jpg` and `activity.json`.
