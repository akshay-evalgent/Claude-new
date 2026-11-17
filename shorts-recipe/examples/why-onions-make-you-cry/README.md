# Why Onions Make You Cry 🧅😢

A 36-second vertical short (13 shots) built to the recipe in `../../index.html`, back with the human-body series, now in a kitchen. It follows the playbook's engagement section:

- **Hook.** Frame one: you at the chopping board, mid-chop, tears streaming, with "Onions make you cry on purpose."
- **Seamless loop.** The script ends on a word that the first line completes: "…chill it first, because → onions make you cry on purpose." The last shot (you start chopping and your eyes begin to water) runs straight into the first (full tears), on the same frame, and the chops stay on the beat across the cut. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone who cries over onions". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: what's your trick, goggles or the fridge?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0): a knife chopping vegetables on a wooden board (one hit for every chop on screen), real sniffs, bubbles for the bursting cells, a knife blade, a real mouse and a crunch for its bite, and the fridge door and its hum. Only the music is synthesized.

## Files

- `output/why-onions-make-you-cry.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-onions-make-you-cry-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (105 words, 176 wpm, 35.8 s of voice)

> Onions make you cry on purpose. Inside every onion cell, two chemicals are kept apart. When your knife breaks the cells, they mix, and an enzyme turns them into a gas. That gas floats up into your eyes and irritates the nerves there, so your eyes flood with tears to wash it out. It's how the onion defends itself from hungry animals. In two thousand two, scientists found the exact enzyme that makes the gas, and later grew onions that barely make it. Cold slows the gas down, and a sharp knife crushes fewer cells. So next time you chop one, chill it first, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Onions make you cry on purpose. | You at the board, chopping, tears streaming down | A knife chopping on a board (BSB 2070), a sniff (0784), birds outside (1859) |
| 3.00 | Inside every onion cell, two chemicals are kept apart. | Under the microscope: long glassy onion cells, each with a purple ENZYME sac and yellow SULFUR granules | |
| 6.56 | When your knife breaks the cells, | A giant blade sweeps through and the cells burst | A blade (2575), bubbles popping (0183) |
| 8.24 | they mix, and an enzyme turns them into a gas. | The contents mix; green gas molecules rise | Bubbles |
| 11.59 | That gas floats up into your eyes | Back in the kitchen: a green haze rises off the board to your face | Chopping, a sniff (1095) |
| 13.44 | and irritates the nerves there, | A big eye; the nerve endings around it flare as the haze reaches them | |
| 15.08 | so your eyes flood with tears to wash it out. | Close on your face: the tears pour | Sniffs (0784, 1095) |
| 18.18 | It's how the onion defends itself from hungry animals. | A mouse bites an onion, gets a face full of gas and backs off | A crunch (1598), a real mouse (0459) |
| 21.63 | In 2002, scientists found the exact enzyme that makes the gas, | A lab: the enzyme turns in a green glow; "2002", "THE TEAR ENZYME" | |
| 25.94 | and later grew onions that barely make it. | Chopping a golden onion, dry-eyed and smiling; "TEAR-FREE" | Chopping |
| 28.86 | Cold slows the gas down, | The onion in the open fridge, in cold blue light; the haze barely moves | The fridge door (1158), its hum (1157) |
| 30.58 | and a sharp knife crushes fewer cells. | Two rows of cells: a DULL blade crushes many, a SHARP one only a few | A crunch (1598), a clean slice (2574) |
| 33.23 | So next time you chop one, chill it first, because | You start chopping; your eyes begin to water (loop) | Chopping, a sniff |

## Sources to check before publishing

- **Two chemicals kept apart; an enzyme makes the gas.** In intact onion cells the enzyme alliinase is held separately from sulfur compounds (alk(en)yl cysteine sulfoxides). Cutting breaks the cells, alliinase turns those compounds into sulfenic acids, and a second enzyme turns 1-propenesulfenic acid into the tear-making gas, syn-propanethial S-oxide.
- **The 2002 discovery.** Imai et al. (2002), "An onion enzyme that makes the eyes water", *Nature* 419: 685. They found that a separate enzyme, lachrymatory factor synthase, is needed to make the gas.
- **The gas, the nerves and the tears.** The vapour reaches the eyes and stimulates sensory nerves there, and the eyes produce tears to flush it away.
- **Onions that barely make it.** House Foods in Japan later bred a "tearless" onion, and a New Zealand team (Eady et al. 2008, *Plant Physiology*) silenced the tear-enzyme gene. Low-tear onions are now sold in some countries.
- **Cold and sharp knives.** Chilling an onion slows the release of the volatile gas (advice from, for example, the US National Onion Association). A sharp knife cuts cleanly through cells rather than crushing them, so less of the gas forms.
- **"Defends itself."** The onion's sulfur chemistry is widely described as a chemical defence against animals and microbes that damage it; "on purpose" is the plain-language version of that.

## How it was made

All the code is in `src/onion-tears.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `kitchen-and-onion-sets.js`:
  - **The kitchen.** A counter with a tiled backsplash, cabinets, a window and a fridge you can see into.
  - **Onions and tools.** Whole onions with papery skin, a half onion showing its rings, slices, a knife and a board.
  - **Tears and gas.** Tears running down the cheeks, and the faint green haze.
  - **Under the microscope.** Onion cells with their two chemicals kept apart (they burst, mix and give off gas), the tear enzyme, and an eye with nerve endings that flare.
- `shots.js`: the 13 shots. You chop 2.1 times a second, matching the real chopping recording, and shots 0 and 12 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- The other parts are shared with the earlier shorts: the people, the mouse, the lab from the tickle short, the tiles from the thunder short and the render pipeline.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Onions" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_onion.py` (16 bars): a mock-tragic celesta for the tears, a curious marimba for the science, a warm celesta for the tear-free onion.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 1074 frames (a couple of hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
