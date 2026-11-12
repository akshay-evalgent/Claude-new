# Why Your Fingers Wrinkle In Water 🤔

A 35-second vertical short built to the recipe in `../../index.html`: a mechanism format with a cold-open hook, a "You see" pivot at 19% of the runtime, a "So why…?" open question, a concrete experiment, and a deadpan payoff that loops back into the first line.

## Upload text

**Title:** Why Your Fingers Wrinkle In Water 🤔

**Description:**
Your fingers don't just get soggy in the bath. Your nerves shrink the blood vessels under your skin, and the wrinkles might help you grip wet things.

#shorts #science #humanbody #didntknow

## Script (108 words, 189 wpm, 34.3 s of voice)

> Your fingertips start to wrinkle after about five minutes in the bath, but it's not just because they're soaking up water. You see, your nerves are actually telling the blood vessels under your skin to shrink, which pulls the skin down into those ridges. That's why people with damaged nerves in their fingers don't wrinkle at all. So why would your body bother? Scientists think the ridges work like tire treads, channeling water away so you can grip wet things. In one experiment, people moved wet marbles faster with wrinkled fingers than with dry ones. Which means your body has been putting on rain tires this whole time.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Your fingertips start to wrinkle… | Macro of a fingertip as the ridges form, pull out to a hand rising from the bath, clock spinning 5 minutes | Cold open |
| 3.78 | but it's not just because they're soaking up water | Wrinkled fingertip; drops bounce off, two soak in | Card swing |
| 6.50 | You see, your nerves… blood vessels… shrink | X-ray hand: nerve pulse runs to the fingertip, vessels shrink | Push through the skin, white flash |
| 10.98 | which pulls the skin down into those ridges | Cross-section of the fingertip; vessels shrink, arrows pull the skin into grooves | Dissolve |
| 13.68 | That's why people with damaged nerves… | Wrinkled finger beside a smooth one with a broken, sparking nerve | Hard cut |
| 17.70 | So why would your body bother? | Crash zoom onto the ridges; the finger wobbles on "bother" | Crash zoom |
| 20.96 | …like tire treads, channeling water away… | Ridges match-dissolve into a tyre tread, then the tyre sprays water on a wet road | Match dissolve |
| 25.28 | In one experiment… wet marbles… | Wrinkled hand moves marbles fast; the dry hand drops one; stopwatch running | Whip pan |
| 30.78 | Which means… rain tires this whole time. | Thumbs-up in the rain as the thumb grows tyre treads; hard cut 0.65 s after the last word | Hard cut |

## Measured against the reference shorts

| Measure | This short | Reference |
|---|---|---|
| First word | 0.00 s | 0.00 s |
| Pace | 189 wpm | 158–197, median 178 |
| Tail after last word | ~0.65 s | median 0.75 s |
| Loudness | −11.3 LUFS, −1.0 dBTP, LRA 2.7 | −9.1 to −13.1 LUFS |
| Bed under the voice | 6.6 dB | 5–13 dB, median 9.6 |
| Voice clarity over the mix | 108/108 words transcribed correctly | — |

## Sources to check before publishing

- Wrinkling is controlled by the sympathetic nerves (vasoconstriction), which is why fingers with cut nerves don't wrinkle. This is long-standing clinical knowledge and is used as a nerve test.
- Changizi et al. (2011), *Brain, Behavior and Evolution*: wrinkles as "rain treads" that channel water away.
- Kareklas, Nettle & Smulders (2013), *Biology Letters*: people moved wet marbles faster with wrinkled fingers.
- Haseleu et al. (2014), *PLOS ONE*, did **not** reproduce the grip advantage. The script says "scientists think" and "in one experiment", which stays accurate, but don't present it as settled.

## Assets and rights

- Voice: Kokoro TTS (Apache-2.0), voice `am_fenrir`. Swap in your own recording for a channel voice; re-time the `C = {…}` cue table in `src/wrinkle.js` from the new word timings.
- Music and sound effects: synthesized in `audio/mix_audio.py` (original, no samples).
- Visuals: procedural three.js scenes in `src/wrinkle.js`. No third-party models or textures.
- Caption font: Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,049 frames (about 25–30 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions.
