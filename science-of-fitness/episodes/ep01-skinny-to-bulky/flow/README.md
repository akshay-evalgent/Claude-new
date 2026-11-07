# Episode 1 in Google Flow: quick start

The character-driven version of the episode. Rohan, a genuinely skinny 18-year-old, acts out every idea. Tiger, the big gym bro, pushes the myths. The tiny Muscle Crew shows what happens inside the body. On-screen text drops to a few key numbers.

| File | What |
|---|---|
| `CHARACTER-SHEET.md` | The three characters, their exact descriptions, and the prompts for their reference images. **Start here.** |
| `SHOTS.md` | 73 shot prompts, ready to paste, each timed to the voiceover |
| `shots.json` | The same shots with exact time windows, used by the assembler |
| `shots/` | Drop your Flow clips here, named by shot ID (`03A.mp4`) |

## Steps

1. Make the reference images: sheets A (Rohan), C (Rohan, week 12), D (Tiger) and E (the Muscle Crew).
2. Generate the **tier 1** shots below. That's enough for an engaging first version.
3. Put the clips in `shots/`, or send them to me.
4. Assemble:

```bash
python3 scripts/video/assemble_ep01.py
```

The assembler writes `video/ep01-flow-cut.mp4`. Each clip is fitted to its window on the voiceover. Any shot you haven't made yet falls back to the first-cut visuals, so you can watch the episode improve as shots come in.

To check a few scenes quickly, add `--scenes 1-5`.

## Tier 1 checklist (28 shots)

| Shot | Plays at | Length | Ingredients | What happens |
|---|---|---|---|---|
| 01A | 0:00 | 8.6 s | none | Wide static shot: sixteen different young adults of varied builds stand in a neat row in the dark, each… |
| 02A | 0:20 | 11.1 s | none | Slow pan along the row of sixteen young adults standing in the dark. Their bellies grow at very different… |
| 03A | 0:31 | 7.8 s | Rohan sheet | Close-up: Rohan sits on a chair scrolling his phone while his knee bounces fast and his fingers tap… |
| 03C | 0:43 | 11.1 s | Rohan sheet | Rohan stands next to a burger floating in the air. The burger dissolves into glowing teal sparks that… |
| 05A | 1:13 | 3.7 s | Rohan sheet | Rohan proudly shows a huge plate piled high with food and pats his flat stomach, grinning. |
| 06D | 1:35 | 13.0 s | Rohan sheet | Rohan walks along one very long table holding seven plates for seven days: one plate is huge and… |
| 11A | 3:12 | 16.1 s | Muscle Crew sheet | Inside the muscle: the Muscle Crew. The teal builders stack amber protein bricks onto a long muscle fibre… |
| 11B | 3:28 | 6.7 s | Muscle Crew sheet | Inside the muscle: an alarm light flashes as a training signal; the Muscle Crew. The teal builders cheer… |
| 12A | 3:34 | 12.2 s | Rohan sheet | Side view: Rohan doing push-ups on the floor. On the last rep his arms shake, he lowers slowly, face… |
| 13A | 3:52 | 3.6 s | Rohan sheet, Tiger sheet | Tiger looms over Rohan, pokes his skinny chest with one finger and laughs. Rohan shrinks back, embarrassed. |
| 14B | 4:05 | 17.3 s | none | A huge dark hall with hundreds of young people in rows all doing the same dumbbell curl in sync. Their… |
| 15A | 4:35 | 2.6 s | Rohan sheet, Tiger sheet | Tiger holds a giant bucket of fried chicken and a huge cola and shoves them toward Rohan, grinning. |
| 16A | 4:38 | 12.0 s | Muscle Crew sheet | Inside the body: the Muscle Crew. The builders can only lay amber bricks at a steady pace; extra bricks… |
| 18A | 5:28 | 3.3 s | Muscle Crew sheet | Inside the muscle: the Muscle Crew. A small food truck backs up and the teal builders unload stacks of… |
| 20A | 6:12 | 7.8 s | Rohan sheet | Rohan makes a shake: pours milk into a blender, adds a banana, two spoons of peanut butter and oats, and… |
| 20B | 6:19 | 13.5 s | Rohan sheet | Rohan drinks the whole glass of shake easily in a few gulps, wipes his mouth and gives a big thumbs up,… |
| 22A | 6:58 | 12.7 s | Rohan sheet, Tiger sheet | Rohan does push-ups on a mat while Tiger crouches beside him, coaching, holding up one, two, then three… |
| 24B | 7:34 | 7.0 s | Rohan sheet | Exact side view: Rohan does slow push-ups with perfect form on a mat: body in one straight line from head… |
| 24C | 7:41 | 7.7 s | Rohan sheet | Side view: Rohan does inverted rows on an open door: holding both door handles, feet near the bottom of… |
| 24D | 7:49 | 5.7 s | Rohan sheet | Side view: Rohan does a split squat: one foot forward, one back, torso upright, he lowers his back knee… |
| 24E | 7:55 | 6.1 s | Rohan sheet | Side view: Rohan does a pike push-up: hips high in an upside-down V, hands on the floor, he bends his… |
| 24F | 8:01 | 5.1 s | Rohan sheet | Side view: Rohan lies on his back on a mat and does a single-leg glute bridge: one foot planted, other leg… |
| 25B | 8:42 | 11.7 s | Rohan sheet | Rohan does push-ups wearing a backpack full of books; on the last rep a game-style level-up ring of teal… |
| 27A | 9:07 | 7.3 s | Rohan sheet, Muscle Crew sheet | 3 AM: Rohan in bed scrolling his phone, face lit blue-white by the screen. Inset x-ray of his arm: the… |
| 29B | 10:03 | 9.6 s | Rohan week-12 sheet, Rohan sheet | Time-lapse in front of the same mirror, same pose: Rohan gradually fills out over twelve weeks, shoulders… |
| 30A | 10:13 | 1.6 s | Rohan sheet | Rohan in front of the mirror pinches a little skin at his belly, worried. |
| 33A | 11:04 | 5.7 s | Rohan sheet, Tiger sheet | Rohan and Tiger face each other; Rohan asks a question with open hands, Tiger grins and they bump fists. |
| 34B | 11:19 | 8.6 s | Rohan sheet | Teaser: Rohan sprints at full speed down a dark running track, then at about ten seconds suddenly slows,… |

Tier 2 and 3 shots in `SHOTS.md` fill out the rest of the story.
