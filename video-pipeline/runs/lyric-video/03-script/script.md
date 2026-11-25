# Home

Source of truth: `script.json` in this folder. This file is the same script for reading.

- **Premise:** Fiction: an original lyric, spoken to "you", in which someone keeps asking you to text when you are home and then admits that asking is how they say I love you.
- **Audience:** General viewers of music and short video; anyone who has said or been told "text me when you're home".
- **Question:** Why does the speaker keep asking you to text when you're home?
- **Share line:** this is what I mean every time I tell you to text me
- **Comment prompt:** What the people in a viewer's own life say in place of "I love you" (drive safe, have you eaten, wear a coat). The lyric names one such phrase and leaves the rest open.
- **Post caption:** Not everyone says it in three words.

## The lyric

> Text me when you're home.
> Text me when you're home.
> One word will do.
> The light stays on.
> I know you're fine.
> Asking is how I love you.
> Text me when you're home.

## Length

| | Target | Measured (`timing/timing.json`) |
|---|---|---|
| Duration | 20 to 30 s (brief) | 23.79 s |
| Lyric lines | 6 to 8 slots | 7 |
| Words | 24 to 32 (derived budget) | 33, one over |
| Words a line | 3 to 6 | 4 to 6 |
| New line every | 3.0 to 4.1 s, mean 3.5 s | 3.15 to 3.28 s; 3.48 s before the last line |
| First word | 1.4 to 2.2 s | 1.45 s |
| Turn ("I know you're fine") | 40% to 70% of the run | 61% to 65% |
| Payoff ("Asking is how I love you") | about 80% of the run | 74% to 80% |

Voice: `voice.py --pace 0.8`, default `--lead`, `--gap` and `--tail`. The tool reports 83 words a minute over the run. That is above `pacing.words_per_minute` (33 to 45), which the benchmarks' notes say is an undercount and not a usable budget.

## What carries through every beat

- **Ground:** one sheet of warm cream paper, first frame to last. No change of scene; a new beat is a new line of words on the same sheet.
- **Ink:** brown-black for every lyric word and for the drawing.
- **Accent:** one dark red, on one word only: "home", every time it is on screen.
- **Lyric setting:** one line on screen at a time, large, in the left half, in two rows, in the same place every time, one face throughout.
- **Sync:** a line appears whole in faint ink at the start of its slot. Each word turns to full ink as the voice says it. The lit line stays through the breath and is replaced when the next line starts.
- **Drawing:** a road of stippled dots that starts at the lower left margin and grows to the right, one stretch per line, toward a small lit window. Dots keep landing in the breaths, so nothing is frozen while the voice rests.

## Beats

| # | id | Role | Voice-over | Picture |
|---|---|---|---|---|
| 1 | title | hook | (silent, 1.2 s) | The bare sheet with one word on it: "home", large, dark red, in the left half, where it will sit as the last word of the first line. Low in the left margin, the first three dots of the road land one after another. |
| 2 | ask | hook | Text me when you're home. | The first line builds in front of the red word: "Text me" over "when you're home". The ink words appear faint and light one by one; the red word pulses when it is spoken. The road leaves the margin and climbs a little to the right. |
| 3 | again | hook | Text me when you're home. | The same line in the same place, lit a second time: the ink words drop back to faint and light again; "home" has stayed red. The road bends once. |
| 4 | word | setup | One word will do. | The refrain, red word included, has lifted off. A shorter line: "One word" over "will do." No red on the sheet. One road dot lands with each word, then the road fills in to nearly half its length. |
| 5 | light | escalation | The light stays on. | "The light" over "stays on." Far right, ahead of the road, a small window appears: a square of bare paper with dots gathering round it, starting on the word "light". The road now has somewhere to go. |
| 6 | fine | turn | I know you're fine. | "I know" over "you're fine." The road stops wandering and runs straight at the window, stopping one stretch short. |
| 7 | asking | payoff | Asking is how I love you. | The longest line: "Asking is how" over "I love you." All in ink. The road holds still while the words light; in the longer breath only the window changes, its surround thickening so the square reads brighter. |
| 8 | home | close | Text me when you're home. | The refrain back in its first place. The last road dot reaches the window's sill on the word "home", which turns red as it is spoken. The ink words fade and the sheet holds the finished road, the lit window and the red word to the last frame. |

Sound, for the producer (from the playbook's Sound section): bed audible from the first frame and under every breath, with no silent tail. Thin under the title and the first two lines, one added layer of weight from "The light stays on", thinned again under the last two lines. A soft hit on each line start.

## Facts

The video is fiction and states no facts about the world.

| Claim | Source | Status |
|---|---|---|
| The lyrics are original and were written for this video. They reuse no line, image or story from the reference song and are not a translation of it. | brief.md (original lyrics, fiction, invented for this video) | invented |
| The speaker, the person addressed as "you", the road, the light left on and the window are made up. No real person or event is described. | brief.md (fiction) | invented |
