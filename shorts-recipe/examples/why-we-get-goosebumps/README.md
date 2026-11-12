# Why We Get Goosebumps 🥶

A 33-second vertical short (20 shots) built to the recipe in `../../index.html`. It's character-driven: seven characters (including a furry ancestor), plus a sheet ghost, a scared cat, a predator and a plucked goose. It follows the mechanism format: a two-beat cold open (song, cold wind), a "You see" explanation at 19% of the runtime, a three-beat montage (cold, fear, emotion), the evolutionary reason, a "But since we lost most of our fur…" turn, and a visual pun for the payoff.

## Files

- `output/why-we-get-goosebumps.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/why-we-get-goosebumps-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings

## Script (106 words, 196 wpm, 32.7 s of voice)

> You hear a song or a cold wind hits you, and suddenly every hair on your arms stands straight up. You see, each hair has a tiny muscle attached to it, and when your brain feels a jolt of cold, fear, or emotion, it squeezes all of them at once, pulling your skin into bumps. For our furry ancestors, this fluffed up their fur to trap warm air and make them look bigger, just like a scared cat. But since we lost most of our fur, it barely does anything for us. And they're called goosebumps because your skin ends up looking like a plucked goose.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | You hear a song | A blonde character in headphones, eyes closed, music notes floating | Cold open |
| 1.26 | or a cold wind hits you | A character in a blue cap hit by icy wind and snow, shivering | Hard cut |
| 2.84 | and suddenly every hair on your arms | Forearm macro with hairs lying flat | Hard cut |
| 4.70 | stands straight up | Raking-light macro: the hairs stand up and the bumps rise | Hard cut |
| 6.22 | You see, each hair has a tiny muscle | Skin cross-section: hair follicles with slanted hairs and red arrector pili muscles | Push-through flash |
| 8.06 | attached to it | Close-up as the muscle glows | Hard cut |
| 9.56 | and when your brain feels a jolt | Translucent head: the brain flashes and a lightning bolt runs down | Hard cut |
| 11.48 | of cold | A character with curly hair and glasses shivers in the snow, skin tinged blue | Hard cut |
| 12.28 | fear | A sheet ghost pops up behind a bald character, who flinches | Hard cut |
| 12.88 | or emotion | A long-haired character tears up to music | Hard cut |
| 13.62 | it squeezes all of them at once | Cross-section: every muscle contracts, cyan arrows pull, the hairs stand, the skin bulges | Hard cut |
| 15.44 | pulling your skin into bumps | Forearm macro as the bumps pop up | Hard cut |
| 17.26 | For our furry ancestors | A furry ancestor in a snowy cave mouth, shivering | Card swing |
| 19.12 | this fluffed up their fur | The fur puffs out | Hard cut |
| 20.32 | to trap warm air | Close-up: warm orange air caught in the fur | Hard cut |
| 21.62 | and make them look bigger | Low-angle hero shot: arms out, a gray predator backs away | Hard cut |
| 22.82 | just like a scared cat | A black cat puffs up, ears back, pupils wide, hissing with fangs | Hard cut |
| 24.58 | But since we lost most of our fur | Modern guy in a t-shirt shivering in the snow | Whip pan |
| 26.52 | it barely does anything for us | Forearm macro: sparse hairs, bumps that do nothing | Hard cut |
| 28.16 | And they're called goosebumps | A plucked goose waddles in beside him, shivering too | Card swing |
| 29.90 | because your skin ends up | Close-up of his bumpy arm | Hard cut |
| 31.30 | looking like a plucked goose. | Him and the bumpy pink goose side by side; the goose honks; hard stop | Hard cut |

## Sources to check before publishing

- **Mechanism:** each body hair follicle has an arrector pili muscle. The sympathetic nervous system contracts these muscles in response to cold, fear and strong emotion. Standard physiology.
- **Emotional chills:** music-induced chills (frisson) are well documented. Sachs et al. (2016, *Social Cognitive and Affective Neuroscience*) linked them to differences in brain connectivity.
- **The furry-ancestor reason:** in furry mammals, raised fur adds insulation and makes the animal look bigger to threats (a scared cat's puffed fur and arched back). In mostly hairless humans the reflex is largely a leftover. Standard comparative biology.
- **The name:** "goose bumps" or "goose flesh" refers to the bumpy skin of a plucked goose.
- **Bonus fact for comments:** Shwartz et al. (2020, *Cell*) found that in mice the same nerve-and-muscle pair also wakes hair stem cells to grow thicker fur in the cold.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.92. It's the same voice as the other shorts.
- **Music and sound effects:** synthesized in `audio/mix_goose.py`, including the headphone melody, howling wind, teeth chattering, a horror stinger, the muscle squeeze, skin pops, a fur "poof", a predator growl, a cat hiss and goose honks.
- **Visuals:** procedural three.js in `src/goose.js`. It adds a forearm with animated goosebumps and rising hairs, a skin cross-section with working arrector pili muscles, fur tufts that puff, a sheet ghost and a plucked goose. Characters come from the shared `makeChar()` builder.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 995 frames (about 25 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions.
