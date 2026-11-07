# Reference channels: what they do, what works, what we take

Studied on 7 November 2026 from each channel's public video list, thumbnails, and YouTube's auto-frames at 25%, 50% and 75% of every video (172 images). YouTube blocked transcript access without sign-in, so **the narration was not heard**. Tone notes come from titles, on-screen text, channel descriptions and visuals. Watch two videos of each with sound before locking the voice.

Raw numbers per video: `data/reference-channels-2026-11-07.tsv`.

## At a glance

| | The Rep Theory | Principal Workout |
|---|---|---|
| Link | [@thereptheory111](https://www.youtube.com/@thereptheory111) | [@principalworkoutyt](https://www.youtube.com/@principalworkoutyt) |
| Subscribers | 60.7K | 17.1K |
| Videos | 25 | 18 |
| Age of oldest visible upload | 1 to 2 months | 5 to 6 months |
| Typical length | 8:01 to 8:07, newer ones 12 to 14 min | 2:42 to 12:15, no pattern |
| Videos over 1M views | 3 (4.8M, 1.4M, 1.1M) | 1 (3.6M) |
| Median views | about 33K | about 3.9K |
| Biggest hit | "How Training Tendons Makes You Stronger Than Big Guys" (4.8M) | "Why Your Wrists Look Thin (Fix Them FAST)" (3.6M) |

**The Rep Theory is the model to study.** It reached 60K subscribers within one to two months of its oldest upload with a strict, repeatable format. Principal Workout has one viral hit and a weak median, and its look changes from video to video.

Both biggest hits are the same idea: **hidden strength that isn't muscle** (tendons, wrists). Skinny beats big. That angle is a natural fit for a science channel, because the honest answer is physiology.

---

## The Rep Theory

### Look
- **One hero in every shot.** A lean young man with messy white hair, drawn in grayscale manga pencil and ink. Heavy hatching, realistic anatomy, no cel colour.
- **One accent colour on the hero.** Bright orange shorts, always. It makes him findable in any frame and in any thumbnail.
- **Worked muscle glows red.** The target muscle is painted red over the grayscale body. That is the whole anatomy lesson in one glance.
- **Pure black background, always.** No rooms, no gyms. Props appear only when needed: a door frame, a towel, a bottle, a plate.
- **A rival.** A big, bald, angry gym bro in grey. He loses tug-of-war and arm wrestling to the skinny hero. That gives every video a conflict.
- **Fixed screen furniture.**
  - A small grey label in the top-left: "LINK 1 · THE PLANK", "HOLD 3 · OVERCOMING", "MOMENT 2 · THE WRIST".
  - Progress dots in the top-right that count down 5, 4, 3, 2, 1.
  - A "BE SAFE: go slowly, stop if it hurts" tag in the bottom-left on every exercise shot.
  - Centred bold caps for the key line, with the key word in red or orange: "PUSH THE FLOOR AWAY", "YOU CAN'T SEE".
  - Green means correct or "do this". Red means wrong. Example: "~45°" with a green tick next to "FLARED OUT" with a red X.
  - Simple infographics: rings, bar meters, numbered cards ("3 MISTAKES"), a road for a step-by-step plan, a plate with portion labels.
- **Motion** looks mostly 2.5D: still drawings with slow push-ins, arrows that draw on, text that pops, and 2 or 3 keyframes per exercise rep. It is not full animation. That is why they can post every one to two days.

### Thumbnails
- One hero, often before and after, or hero against the rival.
- One to three words, handwritten, lowercase, in brackets: "(stupid easy)", "(at home)", "(won't go?)", "(bulletproof)". Or a big serif word like "unfair" or "Not Muscle".
- One curved red arrow pointing at the red muscle.
- Seasonal props: a Santa hat for "Abs by CHRISTMAS".

### Titles
- "How To Force Your [body part] To Grow ([constraint])". This appears 5 times.
- A lowercase qualifier in brackets aimed at an identity: "(especially if you're skinny)", "(even as a beginner)", "(no gym)", "(no pullup bar)".
- Contrarian lines: "Stop Doing Sit-Ups in the Morning", "You've Been Doing Push Ups Wrong Your Whole Life", "Quit the Gym, Do Calisthenics".
- Underdog lines: "How Some Skinny Guys Are Stronger Than Big Guys".
- Formats: tier list, 90-day plan, "What 8 Weeks of X Does to Your Body".

### Tone, from on-screen text and the description
- Short imperatives with real numbers: "4 × 20-30 s", "7 / 10 EFFORT", "1.6 G/KG OF PROTEIN", "-2 TO -9%".
- Always offers an easier version: "can't hold 20 s? KNEE DOWN", "feet CLOSER = harder".
- Humble. The channel description says they are not doctors or trainers, names published studies, and tells viewers to ask a professional. That builds trust and protects them.
- Talks to one person: skinny, a beginner, training at home with no equipment.

## Principal Workout

### Look
- A faceless indigo humanoid mascot with white eyes, on flat light-blue backgrounds. He shrugs, points and flexes as reaction shots.
- Heavily mixed media: AI-generated realistic people, stock-style clips, film and celebrity clips, meme cutaways, and a cartoon bone with a face.
- One useful idea for us: mineral and vitamin icons (Ca, D, K, Mg, Zn) orbiting a knee joint in the height video.

### Titles and tone
- Self-improvement and "maxxing" culture: "Demon Back", "Height Maxing", "Anime Physique", "NoFap".
- First-person result claims: "I Made My Arm Veins Pop in 7 Days".
- Motivational, "level up" language. The description has no sources.

### Why it underperforms next to The Rep Theory
- No single recognisable look, so the channel never becomes a brand in the feed.
- Film and celebrity clips risk copyright claims and Content ID strikes.
- Claims like "Grow Taller at ANY AGE" are weak on evidence, which hurts trust.
- Topics drift away from fitness.

---

## What we take, what we change, what we avoid

**Take (the grammar, not the assets):**
1. One recurring host in every shot, on a dark empty background, with one accent colour.
2. The worked muscle highlighted in colour on a grayscale body.
3. Fixed screen furniture: chapter label, progress dots, safety tag, one key line per shot.
4. Real numbers on screen and an easier version of every exercise.
5. A recurring rival character for conflict.
6. Humble, sourced, beginner-first voice.
7. Title formulas: identity qualifier, contrarian, underdog, tier list, "what X weeks does".

**Change, so we are not a copy:**
1. **Our own host design.** No white spiky hair and no orange shorts. See `STYLE-AND-PIPELINE.md`.
2. **Our own palette:** near-black with teal for science, coral for muscle, amber for nutrients. Rendered examples are in `assets/style-frames/`.
3. **Go inside the body.** This is the gap. Neither channel goes below the muscle. Our signature is the zoom: body, then muscle, then fibre, then mitochondrion, then molecule.
4. **Food, vitamins and minerals as a full pillar**, using periodic-table tiles, plates with grams and daily-need bars.
5. **Sources on screen**, in the bottom-right of every claim, not only in the description.
6. **Long-form.** Aim for 10 to 15 minutes. The Rep Theory's 14-minute isometrics video reached 723K, so long works in this niche.

**Avoid:**
1. Film, TV or celebrity clips, and realistic AI people presented as real.
2. First-person transformation claims from a faceless channel ("I did X in 7 days") unless they are true.
3. Claims the evidence doesn't support, such as growing taller as an adult.

## Topic signals from the two channels

These did best and suit a science treatment:

| Their video | Views | Our science angle |
|---|---:|---|
| Tendons make you stronger than big guys | 4.8M | What a tendon is made of, why it adapts slower than muscle, and collagen plus vitamin C |
| Why your wrists look thin | 3.6M | Bone, tendon and forearm muscle: what can and cannot change |
| Quit the gym, do calisthenics | 1.4M | Mechanical tension: why the muscle can't tell a dumbbell from bodyweight |
| Skinny guys stronger than big guys | 1.1M | Neural drive and motor-unit recruitment: strength is a skill first |
| Isometric holds give supernatural strength | 723K | What happens inside a fibre during a hold |
| I'll prove you can do a planche | 274K | Levers and torque: why straight-arm work is so hard |

Nutrition gaps neither channel covers well: protein timing myths, creatine, magnesium and cramps, vitamin D and muscle, iron and fatigue, electrolytes and sweat, and why your muscles burn.
