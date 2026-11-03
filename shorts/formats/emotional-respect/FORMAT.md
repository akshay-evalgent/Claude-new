# Format: emotional "respect" short

A 25–30 second story edit: someone is in trouble, someone helps, the payoff lands on the beat drop, and it closes on a heart and the word **RESPECT**.
First used for **Little Messi** (`episodes/messi-respect/`). Style measured from the reference Short
https://www.youtube.com/shorts/kyzbJFn98EE (frame by frame; see `reference_timeline.txt`).

## The story arc (13 slots)

| # | Slot (on this soundtrack) | Job of the shot | Caption |
|---|---|---|---|
| 1 | 0.00–0.73 | wide establishing shot of the subject, push-in into a white flash | none |
| 2 | 0.73–2.34 | close-up of the subject; **red arrow** points at the detail that matters | quoted label, shown at once: “INJURED DOG”, “LITTLE MESSI” |
| 3 | 2.34–4.57 | the problem | “THIS DOG” IS BADLY TRAPPED / “HIS SHIRT” WAS A PLASTIC BAG |
| 4 | 4.57–6.61 | how bad it is (a music stop sits here) | THE DOG WAS IN AGONY / HIS BROTHER MADE IT FOR HIM |
| 5 | 6.61–10.24 | the turn: someone notices or arrives (push-in mid-shot) | THE GOOD BOY CAME TO HELP / THE PHOTO WENT VIRAL |
| 6 | 10.24–12.35 | the hero acts (second stop, tension before the drop) | HE TRIES TO CUT… / THEN MESSI SAW IT |
| 7 | 12.35–13.68 | **beat drop at 12.95**: the action shot | …THE WIRE / HE SENT HIM… |
| 8 | 13.68–14.85 | a second angle of the action | (caption continues) SIGNED SHIRTS |
| 9 | 14.85–19.89 | the longest shot: the moment it works | “FINALLY” + the result, typed slowly |
| 10 | 19.89–21.99 | the subject safe / happy | “THE DOG WAS SAVED” / “A DREAM CAME TRUE” |
| 11 | 21.99–24.66 | subject and hero together | SALUTE TO THIS GREAT HUMAN / LEGEND |
| 12 | 24.66–25.33 | the hero (or subject) smiling, push-in | (previous caption fades) |
| 13 | 25.33–end | hero portrait: glitch → **mending heart** bursts → small heart above “RESPECT”, sparkles, fade to black | “RESPECT” |

Rule of thumb: slots 1–6 build sympathy (soft music, two stops), slot 7 lands the drop on the action, slots 9–13 pay it off.

## Look and motion

- **Frame** 1080x1350 (4:5). Grade: a little more saturation and contrast, light grain, vignette.
- **Transitions** (times above): white flash (1), TV-off with scan lines (2), cyan light leaks (3, 4, 5, 8, 9, 10), hard cuts around the drop (6, 7, 11), pixel-stretch glitch into the ending (12), fade to black.
- **Camera**: push-ins that accelerate into each flash; a settle after each flash; handheld shake from the drop on; a subtle alternate-frame flicker most of the time.
- **Captions**: Poppins ExtraBold, uppercase, typed letter by letter (~15/s; slot 9 slower), neon glow, **one colour per word** from white / yellow / red / cyan / magenta / green, the key phrase in curly quotes, multicolour letters for the label and for RESPECT. Placed at 60 % height (50 % in slot 9). 2–6 words per line, two lines at most.
- **Graphics**: red arrow (slot 2), mending-heart emoji ❤️‍🩹 burst (slot 13), white sparkles over the ending.

## Writing the captions

1. Tell the story in 10 lines a 10-year-old understands. Present facts only; check every one against a news source.
2. Put the subject's name or the injury in quotes on slot 2.
3. Split a sentence across the drop (slots 6–8) so the payoff word lands on the drop.
4. “FINALLY” always opens slot 9.
5. End with SALUTE TO THIS … and “RESPECT”.

Colour codes in `story.json`: `^w` white, `^y` yellow, `^r` red, `^c` cyan, `^m` magenta, `^g` green, `^x` multicolour letters (a code may follow an opening quote: `“^yHIS`).

## Making the next one

See `.claude/skills/emotional-short/SKILL.md` for the full step list. Short version:

```bash
cd shorts
python3 -m beatcut.mirror analyze reference_short.mp4 episodes/<name>   # same music? or use formats/emotional-respect/template.json
python3 -m beatcut.mirror sheet source_preview.mp4 sheet.jpg --step 10  # find the story in the source
# fill episodes/<name>/story.json (shots, captions, arrow target)
python3 -m beatcut.story episodes/<name> --stills
python3 -m beatcut.story episodes/<name>
python3 -m beatcut.mirror compare reference_short.mp4 episodes/<name>/out/edit.mp4 episodes/<name>/out/compare.mp4
```

A different soundtrack works the same way: `mirror analyze` on a reference edit that uses it gives a new set of slots, and the arc above maps onto them.
