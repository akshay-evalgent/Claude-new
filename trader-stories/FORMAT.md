# Format: full-length illustrated trader stories

One film, one trader, 20 to 25 minutes. True stories most viewers have never
heard, told like a thriller, drawn rather than borrowed.

The scripting approach comes from the study in `SCRIPT-STYLE.md`. The picture
is our own: generated illustration plus motion graphics, no lifted film or TV
footage.

## What makes it different

| | Typical finance-story channel | This format |
|---|---|---|
| Picture | Stock footage, re-voiced drama clips | Original illustration in one house style |
| Facts | Mixed with invention, unlabelled | Every number sourced; acted scenes labelled "dramatised" |
| Charts | Screenshots | Redrawn from real price data, animated |
| Takeaway | Story only | Story plus the trader's actual method |

## Script template

Target 3,000 to 3,300 narrated words for about 24 minutes: a fast read
(170-180 wpm) with roughly a quarter of the runtime left unnarrated.

| # | Beat | Time | Words | Must contain |
|---|---|---|---|---|
| 1 | Cold open | 0:00-1:15 | 120 | The peak moment, and a choice that defines the hero. Ends on the title. |
| 2 | Legend and threat | 1:15-2:15 | 150 | Who they are in three props. One line of warning about what is coming. |
| 3 | Origin and spark | 2:15-4:30 | 300 | Where they came from. The one event that pointed them at markets. |
| 4 | The grind | 4:30-6:00 | 220 | Starting money, as an exact figure. What they gave up. |
| 5 | First market, the method | 6:00-10:00 | 600 | The market they met, explained in 30 s. Losses. The method in their own words. First set piece. A number. |
| 6 | Reversal | 10:00-12:30 | 350 | The thing that breaks the method. The adaptation. A number. |
| 7 | The Trade | 12:30-16:30 | 500 | Clock time. The other side's point of view. One rule explained. An overnight question. The payoff number. |
| 8 | Aftermath | 16:30-18:00 | 200 | What the win did to them as a person. A direct quote. |
| 9 | The fall | 18:00-20:00 | 250 | The rule they broke. The loss, as a number. |
| 10 | Last test | 20:00-23:00 | 400 | Doubt. A question. Then 45-70 s with no narration. |
| 11 | Realisation and climax | 23:00-24:00 | 150 | The theme, once, in one sentence. The final number. |
| 12 | Epilogue | 24:00-24:45 | 100 | Where they are now. Closing line. |

Line rules:

- Median sentence 10 words. One in four at 6 words or fewer.
- Each act ends on a figure and turns on a "But".
- One mechanism explained per act, 40 s at most, only when the story needs it.
- One aside to the viewer every two minutes or so.
- A question before every unnarrated stretch.
- Two or three recurring props per hero, planted in beat 2 and paid off in beat 10.
- Every figure, date and quote carries a source in the research sheet. If a
  scene is reconstructed, the script says so and the picture carries a
  "dramatised" tag.

Not every life fits all twelve beats. Stories that end in ruin or prison swap
beats 10 and 11 for the collapse and the reckoning; the scoreboard and the
hinge lines still apply.

## Picture system

Five shot families, mixed so no family runs longer than about 20 s.

| Family | Share | What it is | How it is made |
|---|---|---|---|
| Scene | 40 % | The hero in a place: the room, the trading floor, the street | Generated illustration, cut into layers, slow push or parallax |
| Chart | 20 % | The actual price move, drawn on as the narrator speaks | Real price data, animated in code |
| Number | 15 % | The scoreboard, big figures, the trade ticket | Type animation |
| Document | 15 % | Headlines, forum posts, court filings, quotes | Real text reset in house type, with the source named |
| Map and diagram | 10 % | Where it happened, how the mechanism works | Vector animation |

Constant elements:

- **The scoreboard.** A small readout of year, age and account size that stays
  through the film and ticks at every act break. This is the format's signature.
- **One art style per channel**, not per film. Stylised illustration (ink and
  flat colour, or graphic-novel) rather than photoreal. It hides generation
  flaws, stays consistent across films, and avoids realistic fake images of
  real people.
- **A two-colour rule.** One colour for gains and one for losses, used nowhere else.

A 24-minute film at 4 to 6 s per shot is 250 to 300 shots, so roughly 100 to
120 generated illustrations. Reusing locations (the room appears twenty times)
brings unique images closer to 60 or 70.

## Production pipeline

1. **Research sheet.** Timeline, every figure with its source, direct quotes,
   and a column marking what is established fact, what is reported once, and
   what is legend.
2. **Script** against the template above.
3. **Shot list.** One row per beat of narration: the line, the shot family,
   the image prompt or data source, the motion.
4. **Images, on Kaggle with models from Hugging Face.** A notebook reads the
   shot list and writes one PNG per row at 16:9.
   - Model: an openly licensed text-to-image model pulled through `diffusers`.
     FLUX.1-schnell (Apache 2.0) is the safe starting point; check the model
     card's licence before using any other, since several popular ones are
     non-commercial.
   - Consistency: a fixed style paragraph appended to every prompt, a
     character sheet for the hero made first, and an image-editing model or a
     small LoRA to keep the face and clothes the same from shot to shot.
   - Kaggle's free GPU quota is weekly and sessions are time-limited, so the
     notebook should save as it goes and be able to resume from a row number.
5. **Chart data.** Kaggle hosts historical price datasets for most major
   markets; older or delisted names may need exchange archives. Charts are
   drawn from the data, never screenshotted.
6. **Hero motion (optional).** Ten to fifteen shots per film run through an
   open image-to-video model for real movement. Everything else is layered
   stills with camera moves, which is cheaper and more controllable.
7. **Voice.** A human narrator is the strongest choice for trust and for
   YouTube's rules on low-effort synthetic content. An openly licensed TTS
   voice is the fallback.
8. **Motion graphics.** The scoreboard, charts, number cards and document
   cards are built once as code templates and fed per-film data, so film two
   costs far less than film one.
9. **Edit, sound, check.** Cuts on the beat, a sound on most cuts, music out
   under key quotes. Final pass against the research sheet.

## Risks to settle before film one

- **Real people.** Many of these traders are alive and some are private. Keep
  the art stylised, do not invent dialogue without a label, and keep to
  sourced facts on anything that reads as an accusation.
- **YouTube disclosure.** Realistic altered or synthetic content must be
  flagged at upload. Stylised illustration generally does not need it, but
  cloned or realistic synthetic voices of real people do.
- **Monetisation.** YouTube demonetises mass-produced, repetitive AI content.
  Original research, a consistent human voice and custom animation are what
  keep a channel on the right side of that.
- **Model licences.** Confirm commercial use on each model card.
