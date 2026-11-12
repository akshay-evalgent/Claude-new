# Why Your Fingers Wrinkle In Water 🤔

A 35-second vertical short (19 shots, a cut about every 1.8 s) built to the recipe in `../../index.html`: a mechanism format with a cold-open hook, a "You see" pivot at 19% of the runtime, a "So why…?" open question, a concrete experiment, and a deadpan payoff that loops back into the first line.

## Files

- `output/fingers-wrinkle.mp4` — upload this one (1080×1920, 30 fps, 34.95 s, captions burned in)
- `output/fingers-wrinkle-no-captions.mp4` — same video without captions, for re-editing or platform auto-captions
- `output/mix_master.wav` — the mastered audio track

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
| 0.00 | Your fingertips start to wrinkle… | Macro of a fingertip as the ridges form, pulling out to a hand rising from the bath; cut to the clock spinning 5 minutes on "five", cut to a low bath angle on "the bath" | Cold open |
| 3.78 | but it's not just because they're soaking up water | Wrinkled fingertip; drops bounce off, two soak in; cut to a side macro on "soaking" | Card swing |
| 6.50 | You see, your nerves… blood vessels… shrink | X-ray hand: nerve pulse runs to the fingertip; cut to a side angle on "blood" as the vessels shrink | Push through the skin, white flash |
| 10.98 | which pulls the skin down into those ridges | Cross-section of the fingertip; vessels shrink, arrows pull the skin into grooves | Dissolve |
| 13.68 | That's why people with damaged nerves… | Wrinkled finger beside a smooth one; cut to the broken, sparking nerve on "in their fingers" | Hard cut |
| 17.70 | So why would your body bother? | Crash zoom onto the ridges; the finger wobbles on "bother"; cut to a raking side macro on "Scientists" | Crash zoom |
| 20.96 | …like tire treads, channeling water away… | Ridges match-dissolve into a tyre tread, then the tyre sprays water on a wet road; cut low to the contact patch on "so you can grip" | Match dissolve |
| 25.28 | In one experiment… wet marbles… | Both lanes from above; cut to the wrinkled hand on "faster", cut to the dry hand dropping a marble on "than" | Whip pan |
| 30.78 | Which means… rain tires this whole time. | Thumbs-up in the rain; cut to the thumb pad growing tyre treads on "rain"; hard stop 0.65 s after the last word | Hard cut |

## Measured against the reference shorts

| Measure | This short | Reference |
|---|---|---|
| First word | 0.00 s | 0.00 s |
| Pace | 190 wpm | 158–197, median 178 |
| Tail after last word | ~0.65 s | median 0.75 s |
| Loudness | −11.4 LUFS (final MP4), −1.0 dBTP, LRA 2.7 | −9.1 to −13.1 LUFS |
| Bed under the voice | 6.6 dB | 5–13 dB, median 9.6 |
| Median shot (detector) | 2.17 s | 2.5 s |
| Shots with no camera move | 9% | 9% |
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
