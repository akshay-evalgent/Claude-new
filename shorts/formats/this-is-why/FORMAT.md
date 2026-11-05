# Format: THIS IS WHY (story in a window, typed lines, red punchline)

Measured from the reference Short `JRzZ-iorXh0` (23.6 s, 142 BPM). Example: `episodes/karma-wedding/`.

## The look
- **Frame:** 9:16 black canvas with a square picture window, full width, y 0.216-0.784
  (`"layout": {"type": "window", "box": [0, 0.216, 1, 0.784]}`).
- **Motion:** the camera is still. The **window itself** scales on the music (`scale_keys`): a 1.27x punch on the first
  big hit that relaxes over 1.4 s, then a quick 1.3x swell into the glitch. Otherwise it holds at 1.0.
  Measure any reference with `python3 -m beatcut.mirror window reference.mp4`.
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
| 4.02 | first hit | 1.0 -> 1.27 (4.28-4.97) -> 1.25 at 5.15 -> 1.0 at 6.38 | **turn:** BUT ... |
| 6.08 | | 1.0 | **clue 1** |
| 9.42 | | 1.0 | **clue 2** |
| 12.75 | swell | 1.0 at 12.62 -> 1.3 at 12.85 -> 0.98 at 12.97 -> 1.0; glitch | (clue 2 holds to 13.05) |
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
- **Mood grade** (`shots[].grade`), when the story has a theme: e.g. lust = `{"tint": [1.12, 0.9, 1.0], "sat": 1.15}`
  on the temptation shots, then `{"tint": [0.86, 0.96, 1.14], "sat": 0.55}` once it turns; add `"gamma": 1.3-1.5` to
  lift dark night footage. Example: `episodes/lust-nirodh/`.

## Build
1. `python3 -m beatcut.mirror analyze <reference.mp4> episodes/<name>` (writes `clips/music.m4a`).
2. `python3 -m beatcut.mirror window reference.mp4` for the window box and `scale_keys` (check the frames at any dip:
   dark picture content at both edges can read as a shrink).
3. Copy `episodes/karma-wedding/story.json` and swap in your shots and captions; keep `layout`, `transitions` and the
   caption times if you use the same sound.
4. `python3 -m beatcut.story episodes/<name> --stills`, fix the framing, then render and `python3 -m beatcut.thumb episodes/<name>`.
5. Post `out/edit_no_music.mp4` with "Use this sound" on the reference, started at 0:00.
