# The look: what the reference does, and the rules this kit follows

Reference: "How Training Tendons Makes You Stronger Than Big Guys" (The Rep Theory, 8 min 3 s, 1080p60).
YouTube blocked a full download from the build machine, so this teardown is from four full-resolution
frames (the thumbnail and YouTube's 25 / 50 / 75 % frames) plus the chapter list. Where motion is
described below it is the rule this kit uses, not a measurement of their timeline.

## 1. The five things that make the style

| # | Ingredient | In the reference | In this kit |
|---|---|---|---|
| 1 | **Pure black canvas** | Every frame is on #000. No gradients, no rooms, no floor. | `theme.bg = #000`. Grain blends in overlay mode, so black stays black. |
| 2 | **Detailed grey figure, cut out** | Pencil/ink manga-style anatomy drawings: heavy cross-hatching, visible muscle striation, grey only. One figure per beat, two for a comparison. | `s.plate()`: any cut-out figure. The demo uses Paul Richer's 1890 engravings (public domain). For your own channel, generate a mascot with `prompts/IMAGE-PROMPTS.md`. |
| 3 | **Selective colour with meaning** | Exactly one colour on the character (orange shorts = the mascot) and red on the muscle or tendon being talked about. Nothing else is coloured. | `highlight: [{ region }]` turns a muscle region red with a sweep in the direction the force travels, then a slow pulse. |
| 4 | **Three type voices** | (a) hand marker in white with a red marker arrow for the hook; (b) rounded geometric sans, lower case, stacked lines coloured by role; (c) extra-bold caps for card titles with small letter-spaced kickers. | (a) `s.hand()` + `s.arrow()` (Kalam Bold); (b) `s.lines()` (Poppins SemiBold); (c) `s.card()`, `s.headline()` (Poppins ExtraBold). |
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

## 3. Motion rules (what makes it feel "detailed and clean")

1. **One new idea at a time.** Something enters only when the voice says it. If two things enter at once, one of them is late.
2. **Ease out, never linear.** Entrances use cubic/quart ease-out over 0.4-0.6 s. Staggers of 80-120 ms between siblings. Exits are faster than entrances (0.3-0.4 s).
3. **Figures ink in.** A soft wipe from the top while contrast develops from a washed pencil ghost to full ink (about 1.1 s), with a 3.5 % scale settle.
4. **Nothing is ever frozen.** Each scene has a slow camera push (2-4 % over the scene). Highlights breathe once they're on. Timers tick.
5. **Highlights travel the way force travels.** Elbow to fingertips for grip, heel to calf for an Achilles beat. The sweep is the explanation.
6. **Arrows are drawn, not placed.** A marker stroke with a slight wobble draws in about 0.4 s, then the head flicks on. Arrows point at the exact structure, not near it.
7. **Dip to black between beats** (0.25-0.3 s each way). No slides, spins or zooms between scenes.
8. **Short end holds.** The last frame holds 1-1.5 s, then fades.
9. **Sound follows picture.** Every entrance has a quiet cue (whoosh for figures, marker scratch for arrows, tick for lines, pop for cards, a low hit for chapter cards). `tools/sfx.mjs` builds this bed automatically from the timeline.

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
