# Production notes: Home (lyric video)

`video.mp4`: 1920x1080, 30 fps, 24.77 s (743 frames), H.264 with AAC sound.

## To check by ear (nobody in the pipeline can hear)

Three short files in `audio/listen/`:

| File | Listen for |
|---|---|
| `line6_as_in_film.wav` | "I know you're fine." then line 6 as the film has it. Does "how" sound held open, or does it sound like a question ("Asking is how?") or like "howl"? |
| `line6_scriptwriter_split.wav` | The same stretch from the scriptwriter's track, for comparison: "how" falls like the end of a sentence. |
| `lines3_4_until_one_word.wav` | "Until one word," then "the light stays on." Does line 3 sound like a closed statement followed by a gap? Not changed here (see Voice). |

If line 6 as built is worse than the scriptwriter's, the way back is one command and a re-run:
`python3 audio/build_voice.py --line6 split`, then transcribe.py into `audio/stt/{base,small,medium}`, `audio/sync_words.py`, `audio/mix.py`, and steps 3 to 5.

The sound bed's added layer (below) also needs a listen: it was set by measurement only.

## Voice

- Built-in voice `en_US-lessac-medium`, pace 0.8, as the script was timed. Tail 2.6 s (was 2.2), so "Home." stands 2.0 s.
- Built by `audio/build_voice.py`, not by a fresh run of voice.py. Lines 1 to 5 and line 7 are the scriptwriter's own audio, copied sample for sample from `03-script/timing/vo.wav`; every time up to line 6 is unchanged (checked: the two tracks are identical up to 16.33 s).
- **Line 6, the review's cure, tried and kept.** "Asking is how, I love you." was spoken as one utterance and cut inside the silence at the comma. The cut is clean: the silence is 0.138 s long with a floor of -82 dB, the level at the cut is -87 dB, and "how" dies away over 0.1 s before it. Each half is trimmed by voice.py's own rule and the script's 0.6 s pause is laid between them. The source take is `audio/takes/line6_one_utterance.wav`.
- What changed, measured: the pitch at the end of "how" now rises to 192 Hz (from a low of 128 Hz). Spoken alone it fell to 97 Hz, the floor every sentence in the track ends on.
- What is not certain: the built-in voice speaks a comma as a rise, and a rise can be heard as a question. 38 takes were made in two batches; 16 had a silence of 0.10 s or more to cut in. Each of those was put through three speech-to-text models in place after "I know you're fine.": 11 were heard as "howl" by at least one model (one of them also as "hell"), and 5 had no wrong word. The take used is the only one of the 5 that a model heard as a single unbroken sentence (the other two models heard "how." and "how?"). The scriptwriter's split is heard as "how." by all three. In the finished film, with the bed under it, the base model writes "Asking is how." So the measurements say the fall is gone; they do not say the line now sounds right. Hence the listen.
- "I love you." runs 0.69 s in this take against 0.76 s in the scriptwriter's.
- **Line 3, "Until one word,": not changed.** Tested: "Until one word, the light stays on." as one utterance still falls to about 100 Hz at the comma in all 5 takes, as the retention review found. The review's other cure (pause 1.0 s instead of 1.4) is a script change.
- Words a minute: 78 over the run, 182 while speaking by timing.json (193 by transcribe.py on the film). Both are outside the benchmark ranges, which the benchmarks' notes call an undercount of a sung song. Not chased with the pace.
- All three speech-to-text models hear all 32 words of the script on the voice track, and the base model hears all 32 in the finished film.

## Word sync

Rule as the script sets it: a line's first word lights at the beat's `vo_start`; the last is fully lit by `vo_end`; the words between take their times from transcribe.py. Built by `audio/sync_words.py` into `audio/words.json`.

One addition, which the reviewers should know about. transcribe.py's times for the words in between are not accurate enough on this voice. Its base and small models put some words up to 0.29 s early ("me" in line 2 at 4.72 s; the word's first sound is at 5.01 s), and its medium model puts others up to 0.23 s late ("fine", the last "home"). No one model is right throughout. So each of the 24 in-between words was checked against the waveform (band energies every 20 ms; the reading and what was read are in `sync_words.py` and `words.json`). The time used is transcribe.py's, from whichever of its three models comes within 0.04 s of the waveform: 17 words. Where none does, the waveform reading is used: 7 words ("home" in line 2, "word,", "stays", "on.", "fine.", "is", "you."). The waveform readings are mine, from a table, not from listening.

## Timing

| Beat | Shot starts | Voice | Enters by |
|---|---|---|---|
| title | 0.000 | none | cut |
| ask | 1.330 | 1.450 to 2.955 | cut |
| again | 4.485 | 4.605 to 6.196 | cut |
| until | 7.676 | 7.796 to 9.043 | cut |
| light | 10.323 | 10.443 to 11.662 | cut |
| fine | 13.142 | 13.262 to 14.243 | cut |
| asking | 16.223 | 16.343 to 17.482 | cut |
| love | 17.962 | 18.082 to 18.776 | cut, nothing replaced |
| home | 20.456 | 20.576 to 22.160 | cut; ends at 24.767 |

Every cut is on the one continuous sheet, so none shows as a change of scene (measure.py finds no cut). No dissolve or iris anywhere.

## Picture

No artwork was supplied. Everything is drawn in code with the stipple-lyric kit: the sheet is the kit's `paper.jpg`, the drawing is the mood board's `draw()` copied unchanged (same paths, sizes and seeds), and the lyric markup follows `frames.html`. No caption element, no `Film.captions`, no film.js fades on words.

Review round 2, should fixes:

- **Payoff reveal.** Row two, "I love you.", is not on the sheet while "Asking is how" is spoken. It arrives faint at 17.48 s, when the voice stops, over 0.12 s, and lights from 18.08 s.
- **The reset.** The ink words leave over 0.4 s from 22.16 s. "home" leaves from 22.64 to 22.76 s and "Home." is drawn in its place from 22.76 to 22.88 s with one swell (`check/reset_frames.jpg`). It then stands to the last frame: 2.0 s from the moment it starts to arrive. The voice ends 2.6 s before the end.
- **No motionless stretch.** measure.py finds no still stretch of 0.6 s or more. The longest stretch with no measured change is 0.50 s (0.97 to 1.47 s, before the first word). The last dot lands 0.3 s before the final frame.
- **Window as the destination.** Drawn as the mood board has it and on the sheet from frame 0; the first three road dots rise toward it. At 390 px wide it reads as a four-pane window (`check/phone_390.jpg`). Not changed further: the drawing's paths and seeds are fixed by style.json.

Differs from style.json, on purpose:

- **How fast the dark round the window grows after the pause.** style.json has it at 0.80 by the end of "love" and 0.93 when the voice ends. A share is a place in the dots' order, not a count: 98% of the dark's 5,395 dots are down by 0.80, which left 8 dots for the end hold, and the first proof measured the hold as frozen for 1.57 s. Now: 0.62 when the road starts to close (the "love" key frame's value), 0.65 at the end of "love", 0.69 when the voice ends, 1 at 0.3 s before the last frame, with the dots landing at an even count per second. About 350 dots land through the hold.
- **The title's second and third road dots** land at 0.30 and 0.95 s, not 0.45 and 0.9 s, so neither falls on the line arriving at 0.5 s and the wait before the first word is 0.5 s.
- The composition reads the dark's dot order from the kit's own `_dots` list to space those dots evenly.

## Sound

`audio/track.wav`, built by `audio/mix.py`, which reuses sound.py's own bed, hit, voice duck and loudness pass and changes only the layout, because sound.py has no switch for what the script's sound notes ask:

- The bed is at full level from the first frame (sound.py fades it up over 0.8 s). Measured in the rests: -27.5 dB under the title, -27.4 dB after line 1.
- One added layer (55, 82 and 330 Hz) from the word "light" (10.54 s) to the start of the payoff line (16.22 s). It adds at most about 3 dB in the rests (-27.4 and -26.4 dB with it, -27.4 to -29.8 dB without). Set by measurement, not by ear.
- A soft hit on the seven line starts; none on "love".
- No music: sources.json lists none.
- -13.1 LUFS (target -12.8), true peak -1.4 dBTP, audible for 99.7% of the run, no dropouts.

## Comparison with the reference

24 pass, 1 warn, 5 fail (`check/compare.json`). All five fails are rows the benchmarks' notes list as misleading against this reference. None was acted on.

| Row | Ours | Reference | Why it stays |
|---|---|---|---|
| mean shot length | 24.77 s | 185.33 s | One unbroken shot in both; the row fails on the brief's length alone. |
| longest shot | 24.77 s | 185.33 s | The same. |
| first word | 1.33 s | 13.36 s | The reference's 13 s wait is a listed fault. Ours is in the scaled range (1.4 to 2.2 s): the voice starts at 1.45 s; the tool stamps the line-start hit at 1.33 s. |
| words a minute, whole run | 78 | 39 | The reference figure is an undercount of a sung song; the script was budgeted from line slots (24 to 32 words). |
| words a minute, while speaking | 193 | 96 | A spoken voice against a sung one. |
| sound events per second (warn) | 1.05 | 3.45 | A voice with long rests over a plain bed, against a full band. The voice is there: 32 of 32 words heard. |

Two passes mean nothing: "cuts per 10 s" (0 against 0, because the cuts do not show on one sheet) and "still picture share" (cannot fail against this reference). The stillness check that counts is the one under Picture.
