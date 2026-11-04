# Format: THIS IS WHY (story in a window, typed lines, red punchline)

Measured from the reference Short `JRzZ-iorXh0` (23.6 s, 142 BPM). Example: `episodes/karma-wedding/`.

## The look
- **Frame:** 9:16 black canvas with a square picture window, full width, y 0.219-0.779
  (`"layout": {"type": "window", "box": [0, 0.219, 1, 0.779]}`).
- **Motion:** the camera is still. The **window itself** scales on the music (`scale_keys`): a 1.3x punch on the first
  big hit, a slow 1.03 breathe, then a quick 1.22 swell into the glitch.
- **Captions:** one line just above the window (`"anchor": "above_window"`), white Poppins ExtraBold with yellow or
  red key words, typed at ~55 characters a second. Each letter pops in, and a lens-flare sparkle rides the cursor
  (`"style": "line"`, `"sparkle": true`). The caption moves with the window's top edge.
- **Punchline:** on the drop, red heavy italic revealed through red vertical streaks, then a glow that pulses on the
  beats and fades (`"style": "punch"`, `"beats": [...]`).
- **Transitions:** hard cuts, plus one stretch-and-blur glitch (`"type": "glitch"`) where the music swells.

## Timeline (reference seconds; reuse it as is on the same sound)
| t | Music | Window | Caption slot |
|---|---|---|---|
| 0.00 | intro | 1.0 | **hook:** THIS IS WHY ... ! |
| 4.02 | first hit | 1.0 -> 1.3 (4.27-5.07, ease out) -> 1.03 by 6.4 | **turn:** BUT ... |
| 6.08 | | 1.03 | **clue 1** |
| 9.42 | | 1.0 -> 1.03 | **clue 2** |
| 12.75 | swell | 1.22 at 12.8, back to 1.0 at 13.07; glitch | (clue 2 holds to 13.05) |
| 13.07 | build | 1.0 | **payoff set-up** |
| ~16.9 | short stop | | |
| 17.72 | drop | 1.0 | **punchline** (red italic) to the end |

## Writing it
- Hook: "THIS IS WHY <subject> <does the thing>!" One yellow word and one red word.
- Turn: "BUT ..." gives the hidden fact. Clues: one plain fact each, 4 to 8 words.
- Punchline: 2 to 4 words, a quote from the footage if there is one ("ENJOY THE WEDDING!").
- Text in the footage (letters, phones): use `"fit": [x0, y0, x1, y1]` so the whole line shows over a blurred fill,
  instead of cropping words off.
- Scripted footage (movie clips): say so in the description, and credit the source.

## Build
1. `python3 -m beatcut.mirror analyze <reference.mp4> episodes/<name>` (writes `clips/music.m4a`).
2. Copy `episodes/karma-wedding/story.json` and swap in your shots and captions; keep `layout`, `transitions` and the
   caption times if you use the same sound.
3. `python3 -m beatcut.story episodes/<name> --stills`, fix the framing, then render and `python3 -m beatcut.thumb episodes/<name>`.
4. Post `out/edit_no_music.mp4` with "Use this sound" on the reference, started at 0:00.
