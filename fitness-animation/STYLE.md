# The look: what the reference does, and the rules this kit follows

Reference: "How Training Tendons Makes You Stronger Than Big Guys" (The Rep Theory, 8:02, 1080p60).
The numbers below are measured from the full video (every frame, every word); the complete breakdown is
in `ANALYSIS.md`.

## 1. The five things that make the style

| # | Ingredient | In the reference | In this kit |
|---|---|---|---|
| 1 | **Pure black canvas** | Every frame is on #000. No gradients, no rooms, no floor. | `theme.bg = #000`. Grain blends in overlay mode, so black stays black. |
| 2 | **Detailed grey figure, cut out** | Pencil/ink manga-style anatomy drawings: heavy cross-hatching, visible muscle striation, grey only. One figure per beat, two for a comparison. | `s.plate()`: any cut-out figure. The demo uses Paul Richer's 1890 engravings (public domain). For your own channel, generate a mascot with `prompts/IMAGE-PROMPTS.md`. |
| 3 | **Selective colour with meaning** | Exactly one colour on the character (orange shorts = the mascot) and red on the muscle or tendon being talked about. Nothing else is coloured. | `highlight: [{ region }]` turns a muscle region red with a sweep in the direction the force travels, then a slow pulse. |
| 4 | **Three type voices** | (a) hand marker in white with a red marker arrow for the hook; (b) rounded geometric sans, lower case, stacked lines coloured by role; (c) extra-bold caps for card titles with small letter-spaced kickers. | (a) `s.hand()` + `s.arrow()` (Kalam Bold); (b) `s.lines()` (Montserrat SemiBold); (c) `s.card()`, `s.headline()` (Montserrat ExtraBold). In the video itself arrows are straight force arrows; the hand marker is a thumbnail and hook device. |
| 5 | **Clean data cards** | Dark panels with a thin coloured border, a ring timer that counts, an ascending bar scale for effort, one caption line. | `s.card({ visual: { type: 'ring' | 'bars' | 'meter' } })`, `s.counter()`. |

Plus a small amber **BE SAFE** badge bottom left whenever an exercise is shown (`s.badge()`).

## 2. Colour roles (never use a colour outside its role)

| Token | Default | Role |
|---|---|---|
| `bg` | `#000000` | canvas |
| `ink` | `#F3F3F1` | questions, neutral statements, labels |
| `muted` | `#8E8E96` | kickers, units, source lines, sub-labels |
| `hl` | `#FF3434` | the working muscle/tendon, marker arrows, strikes, "bad" numbers |
| `accent` | `#FF8A1F` | the answer, the key word, the channel's signature (match it to your mascot's gear) |
| `good` | `#5BE38B` | the prescription: sets, reps, "do this" |
| `warn` | `#FFC23D` | safety badge only |

The stacked-lines pattern from the reference is literally this: **white = the question, accent = the answer,
green = the dose.** For example: "can't hold yourself yet?" / "feet on the ground" / "build up to 4 × 20-30 s".

Pick your own `accent` and mascot colour. Orange shorts on a white-haired figure *is* The Rep Theory's
brand; copying it makes the channel read as a clone, and their audience will say so in the comments.
Electric blue, volt yellow-green or magenta all sit well against the red highlight.

## 3. Motion rules (measured on the reference)

1. **The picture changes slowly, the screen never stops changing.** One illustration holds 5-15 s (8.5 s on average). On top of it something new appears every 1.5-2 s: about two elements per sentence.
2. **Land on the word, never after it.** 87 % of sentences get a visual within about a second of their first word, typically 0.15 s after it. Text can lead the voice by up to a second, never trail it.
3. **Text pops, it doesn't fly.** A line fades in over 4-5 frames (80 ms in the kit), in place, no slide, no blur. Lines stack downward and all clear together when the idea changes.
4. **Images crossfade in 0.55 s.** That is the default transition between scenes and when a figure appears.
5. **Dips to black are rare.** Only at real section breaks, usually right before an ask: ~0.27 s out, 0.25-0.5 s of black, ~0.27 s in (`transition: 'dip'`). Five in eight minutes.
6. **Two camera modes.** Story and metaphor shots push in at 1.2-1.8 % per second toward the subject (`cam: { push: 1.5 }`). Instruction shots are locked still so the text reads (the default).
7. **Do it with me.** When the viewer is meant to hold a position, a real-time ring timer starts, then shrinks to a corner and keeps counting through the explanation (`s.timer({ move: [...] })`).
8. **Highlights travel the way force travels.** A red glow on the working muscle, swept in the direction the force goes. Wrong-way options are shown by dimming the character grey.
9. **Persistent chrome.** A series tag top left that changes per chapter (`s.tag()`), and the amber BE SAFE badge whenever an exercise is on screen.
10. **Sound sits under the voice.** The reference is voice over a constant quiet bed at about −14 LUFS. `tools/sfx.mjs` adds soft cues; keep them well under the VO in `tools/mix.sh`.

## 4. Layout grid (1920 × 1080)

- Figure on the left third (centre x ≈ 400-640), text block centred on x ≈ 1300. Swap sides for variety, never centre both.
- Figures may bleed off the bottom edge; never off the top unless it's a close-up.
- Safe margins: 80 px left/right, 60 px top, 90 px bottom (YouTube's progress bar and captions).
- Text sizes: hand labels 76-96 px, stacked lines 44-48 px, card titles 46-54 px, kickers 22-26 px, captions 26 px, badge 19-21 px.
- Cards in a row share a top line and a visual slot (the engine enforces this).

## 5. Episode structure (from the reference's chapters)

```
0:00  Hook: the comparison that breaks an assumption (big guy vs. lean guy, bench vs. grip)
0:35  Move 1 + a self-test the viewer does now           <- plant a callback
1:52  Move 2
2:59  Move 3
4:03  Move 4
4:58  The rule (two rules on two cards)
6:16  The whole plan (one screen they can screenshot)
7:17  "Your test result": pay off the callback from 0:35
7:52  Community CTA
```

The callback is the retention trick: the viewer takes a test in the first minute and only learns what
their number means near the end.
