# Why We Yawn 🥱

A 35-second vertical short (19 shots) built to the recipe in `../../index.html`. It follows the mechanism format: a cold open on a yawn, a "But it's not…" myth-buster at 4.4 s, a "You see" proof at 20% of the runtime, the real explanation, two pieces of supporting evidence, a "But the strangest part…" turn, and a payoff aimed straight at the viewer: the character yawns into the lens just as the narrator says you've probably yawned by now.

## Files

- `output/why-we-yawn.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/why-we-yawn-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings

## Script (112 words, 195 wpm, 34.6 s of voice)

> Your jaw drops, your lungs fill up, and for about six seconds you can't really stop it. But it's not because your body needs more oxygen. You see, when scientists gave people extra oxygen to breathe, they kept yawning just as much. Instead, a yawn pulls in cool air and pumps fresh blood to your head, which some scientists think cools your brain down like a radiator. That's why people yawn less when the air outside is hotter than their body. And animals with bigger brains have longer yawns. But the strangest part is that just reading about yawning can make you yawn. So you've probably yawned at least once by now.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Your jaw drops | Face close-up as the yawn opens: jaw, teeth, tongue, eyes squeezing shut | Cold open |
| 0.96 | your lungs fill up | X-ray chest: air streams down the windpipe and the lungs swell | Hard cut |
| 2.30 | and for about six seconds you can't really stop it | Full stretch with arms overhead; a stopwatch counts up to 6.0 SEC | Hard cut |
| 4.38 | But it's not because your body needs more oxygen | Red O₂ molecules swirl around the head as the character shakes it "no" | Card swing |
| 6.94 | You see, when scientists gave people extra oxygen | Lab: oxygen mask and green tank, valve opens | Whip pan |
| 8.60 | to breathe | Close-up of the tank gauge needle swinging up | Hard cut |
| 10.16 | they kept yawning just as much | Yawning behind the mask while a counter clicks to YAWNS 3 | Hard cut |
| 11.96 | Instead, a yawn pulls in cool air | X-ray head: cool air flows in through the open mouth | Push-through flash |
| 14.24 | and pumps fresh blood to your head | New angle: arteries pulse red up the neck to the brain | Hard cut |
| 15.72 | which some scientists think cools your brain down | A hot red brain with heat shimmer turns cool blue | Hard cut |
| 18.00 | like a radiator | A radiator and spinning fan blow cool air onto the brain | Hard cut |
| 19.30 | That's why people yawn less when the air outside | Desert sun; the character sweats and doesn't yawn; the thermometer climbs | Dissolve |
| 22.34 | is hotter than their body | Close-up as the mercury passes the BODY 98.6°F line to 104°F | Hard cut |
| 23.94 | And animals with bigger brains | A mouse makes a tiny quick yawn; a lion starts a long one, with duration bars | Card swing |
| 25.96 | have longer yawns | Close-up of the lion's long, fanged yawn as its bar keeps filling | Hard cut |
| 27.12 | But the strangest part is that | Night: the character in bed holding a phone | Whip pan |
| 29.18 | just reading about yawning | Over-the-shoulder view of the screen: "Why Do We Yawn?" with every "yawn" in pink | Hard cut |
| 30.64 | can make you yawn | The reader yawns | Hard cut |
| 31.92 | So you've probably yawned at least once by now. | The character yawns straight into the lens; hard stop mid-yawn, so the loop restarts on "Your jaw drops" | Hard cut |

## Sources to check before publishing

- **Oxygen isn't the cause:** Provine, Tate & Geldmacher (1987, *Behavioral and Neural Biology*) gave people extra oxygen and extra carbon dioxide to breathe, and neither changed how often they yawned.
- **Brain cooling:** Gallup & Gallup (2007, *Evolutionary Psychology*); Gallup & Eldakar (2011, *Frontiers in Evolutionary Neuroscience*) found less contagious yawning in hot summer air; Massen et al. (2014, *Physiology & Behavior*). It's a leading hypothesis, not settled, so the script says "some scientists think".
- **Bigger brains, longer yawns:** Gallup et al. (2016, *Biology Letters*). Yawn length predicts brain size and cortical neuron count across 19 mammal species.
- **About six seconds:** Provine (1986). The average human yawn lasts about 6 seconds.
- **Reading triggers yawning:** Provine (1986, 2005). Reading about yawning can trigger yawns.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.92. It's the same voice as the other two shorts.
- **Music and sound effects:** synthesized in `audio/mix_yawn.py`, including the yawns (breath noise plus a falling vowel), a growling lion yawn, a mouse squeak, a valve hiss, heartbeats, the fan, wind and crickets.
- **Visuals:** procedural three.js in `src/yawn.js`. The character is built from code with a working jaw, mouth, teeth, tongue, eyelids, brows and arm stretch. The lion reuses the cat model with a mane and an opening mouth.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,052 frames (about 30 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions.
