# Why We Hiccup 😮

A 36-second vertical short (22 shots) built to the recipe in `../../index.html`. It opens on the mechanism (diaphragm → air → vocal cords slam shut → "hic"), then covers the triggers, two evolutionary explanations ("You see…" at 46% of the runtime, later than usual because the mechanism comes first), and a record-breaking true story for the payoff, with a dark, ironic last line in the style of the reference channel.

## Files

- `output/why-we-hiccup.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/why-we-hiccup-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings

## Script (107 words, 179 wpm, 35.8 s of voice)

> Your diaphragm suddenly yanks down, air rushes into your lungs, and a split second later your vocal cords slam shut, making that hic sound. It usually starts when your stomach stretches from eating too fast or drinking soda, irritating the nerves that control your breathing. You see, some scientists think hiccups are left over from our ancestors that lived in water, because tadpoles use the same motion to push water over their gills. Another idea is that hiccups help babies burp out air while nursing. But one man hiccupped for 68 years straight, about 430 million times, and they finally stopped just a year before he died.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Your diaphragm | X-ray torso with the pink diaphragm dome under the lungs | Cold open |
| 1.30 | suddenly yanks down | Close-up as the diaphragm snaps down, with a camera jolt | Hard cut |
| 2.40 | air rushes into your lungs | Air streams down both airways and the lungs swell | Hard cut |
| 4.04 | and a split second later | X-ray neck with the voice box glowing | Hard cut |
| 5.14 | your vocal cords slam shut | Close-up of the vocal cords snapping shut with a shock ring | Hard cut |
| 7.26 | making that hic sound | The character jolts with a "HIC!" pop | Hard cut |
| 9.10 | It usually starts when your stomach stretches | X-ray: the stomach swells and pushes up on the diaphragm | Card swing |
| 11.42 | from eating too fast | Wolfing a burger | Hard cut |
| 12.76 | or drinking soda | Chugging a fizzing soda can | Hard cut |
| 13.94 | irritating the nerves that control your breathing | X-ray: the breathing nerves spark red and the diaphragm twitches | Hard cut |
| 16.70 | You see, some scientists think hiccups are left over | Underwater: weed, bubbles, light from above | Whip pan |
| 19.36 | from our ancestors that lived in water | An ancient lungfish swims past | Hard cut |
| 20.96 | because tadpoles use the same motion | A tadpole gulps water rhythmically | Hard cut |
| 23.18 | to push water over their gills | Side view: water flows in the mouth and out over the feathery gills, with arrows | Hard cut |
| 25.02 | Another idea is that hiccups help babies | A baby drinks from a bottle and hiccups | Dissolve |
| 26.62 | burp out air while nursing | X-ray baby: an air bubble rises from the tummy and pops out as a "BURP!" | Hard cut |
| 28.22 | But one man hiccupped | An old man in a rocking chair, hiccupping | Card swing |
| 29.84 | for 68 years straight | Close-up of the wall calendar flipping 1922 → 1990 | Hard cut |
| 31.32 | about 430 million times | A counter rolls up to 430,000,000 | Hard cut |
| 33.44 | and they finally stopped | The hiccups stop and he finally relaxes | Hard cut |
| 34.96 | just a year before he died. | The empty rocking chair, still rocking, under the calendar's 1991; music drops away | Hard cut |

## Sources to check before publishing

- **Mechanism:** a hiccup is a sudden diaphragm contraction followed within a fraction of a second by the glottis (vocal cords) closing, which makes the "hic". This is standard physiology.
- **Triggers:** stomach stretch from fast eating or fizzy drinks irritates the phrenic and vagus nerves. Standard clinical description.
- **Tadpole hypothesis:** Straus et al. (2003, *BioEssays*), "A phylogenetic hypothesis for the origin of hiccough".
- **Burping hypothesis:** Howes (2012, *BioEssays*), "Hiccups: a new explanation for the mysterious reflex".
- **The record:** Guinness World Records lists Charles Osborne (USA) as having hiccupped from 1922 to 1990, an estimated 430 million times. He died in 1991. The video shows a generic old man, not a likeness, and doesn't name him on screen; the narration doesn't name him either.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.94. It's the same voice as the other shorts.
- **Music and sound effects:** synthesized in `audio/mix_hiccup.py`, including the hiccup itself (a glottal click plus a short vowel), the burp, munching, glugs, bubbles and the chair creak.
- **Visuals:** procedural three.js in `src/hiccup.js`. It reuses the character from the yawn short and adds an x-ray diaphragm, a stomach, nerves, a lungfish, a tadpole with gills, a baby, an old man and a rocking chair.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,094 frames (about 30 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions. Note: the regenerated voice's captions may spell "hic" as "hick"; `captions.ass` in this folder is already corrected.
