# Why Dogs Shake Off Water 💦

A 35-second vertical short (14 shots) built to the recipe in `../../index.html`, back with the dog from the thunder short, this time as a yellow Labrador fresh out of the bath. It follows the playbook's engagement section:

- **Hook.** Frame one is a wet dog mid-shake, in slow motion, throwing water straight at you. A few drops land on the lens.
- **Seamless loop.** The script ends on a word that the first line completes: "…grab a towel, because → that wet dog shake is a feat of physics." The last shot (the dog climbing out of the bath and starting to shake, in real time) runs straight into the first shot (the same shake, slowed down), on the same frame. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone who's been soaked by a wet dog". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: does your dog always shake right next to you?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0). The shakes are real dogs shaking themselves dry, slowed down in the slow-motion shots. The rest is real bath water, real drops of water, splashes, a whimper, breathing, kibble, a crackling fire for the "burning" food and a real mouse. Only the music is synthesized.

## Files

- `output/why-dogs-shake-off-water.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-dogs-shake-off-water-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (110 words, 189 wpm, 35.0 s of voice)

> That wet dog shake is a feat of physics. A soaked Labrador can carry about a pound of water in its fur. Drying that with body heat would burn about a fifth of its daily food. So instead, it shakes. It twists back and forth about four times a second, starting at the head and rippling down to the tail. Its loose skin whips around even further, flinging the water off faster. In about four seconds, seventy percent of the water is gone. Smaller animals have to shake faster. A mouse does it thirty times a second. So when your dog climbs out of the bath, grab a towel, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | That wet dog shake is a feat of physics. | Slow motion: the dog shakes at you on the bath mat; drops hit the lens | A real shake, slowed (Freesound 632413); drops (BSB 1386, 1384, 1387); birds outside (0222) |
| 2.84 | A soaked Labrador can carry | Close on the wet face in the bath, drips falling from the chin and ears | Drips into the bath, bath water (0192), a whimper (1545) |
| 4.70 | about a pound of water in its fur. | Water lifts off the fur and collects in one big drop: "1 lb" | Water bubbles (0183) |
| 6.70 | Drying that with body heat would | On the mat, shivering, steam rising off its back | Drips on the tiles, breathing (1547) |
| 8.40 | burn about a fifth of its daily food. | A fifth of the kibble in its bowl glows and burns away; a "1/5" ring | Kibble (2071), a crackling fire (0030) |
| 10.85 | So instead, it shakes. | The dog plants its feet and shakes, full speed | A whoosh (1796), a real shake (Freesound 632413) |
| 12.81 | It twists back and forth about four times a second, | Slow motion, head-on; "4 TIMES A SECOND" and four dots counting the swings | A real shake, slowed (Freesound 505822) |
| 15.70 | starting at the head and rippling down to the tail. | From above: a pulse of light runs down the spine, head to tail | Slowed shake (Freesound 547569) |
| 18.53 | Its loose skin whips around even further, | From behind: a BODY arc and a SKIN arc; the skin swings much further | Slowed shake (Freesound 632413) |
| 20.90 | flinging the water off faster. | Close on the head: ears flapping, water flying off | Slowed shake (Freesound 435368), drops |
| 23.16 | In about four seconds, seventy percent of the water is gone. | Two quick shakes; a card counts GONE 0% → 70% and 0.0 s → 4.0 s; the fur fluffs up | A whoosh (1795), real shakes (Freesound 505822, 632413) |
| 26.71 | Smaller animals have to shake faster. | The big dog and a little terrier shake side by side; the terrier's is faster | Real shakes (Freesound 435368, 632413; 547569 for the small dog) |
| 28.88 | A mouse does it thirty times a second. | A wet mouse shaking, shown eight times slower | A real mouse (0459) |
| 31.80 | So when your dog climbs out of the bath, grab a towel, because | The dog hops out of the bath onto the mat; your towel comes up; it starts to shake (loop) | Bath water, splashes (1529, 1531), cloth (1104), a real shake |

## Sources to check before publishing

- **The shake.** Dickerson, Mills & Hu (2012), "Wet mammals shake at tuned frequencies to dry", *Journal of the Royal Society Interface* 9(77): 3208–3218. The team filmed 33 wet mammals of 16 species (and five dog breeds) with high-speed cameras. Shaking frequency falls with body size: a dog about 4 times a second, a mouse about 27 to 30. Loose skin swings further than the body underneath and whips the water off faster. The "70 percent of the water in about four seconds" figure comes from coverage of the Georgia Tech work (for example Live Science, "Wow! How Dogs Get Dry in 1-Second Shake", and Science News Explores, "Wet-dog physics").
- **A pound of water, and the cost of air-drying.** Georgia Tech's estimate, quoted in the same coverage: a thoroughly wet 60-pound Labrador holds about a pound of water, and drying it off by evaporation alone would take about 20 percent of the dog's daily calories (David Hu has also said "a quarter"). The video says "about a fifth".
- **Head to tail.** The slow-motion footage in the study shows the shake starting at the head and travelling down the body to the tail.
- **The bars and dots on screen** illustrate the claims; they aren't measured data. The terrier's faster shake is the same size rule, not a measured rate.

## How it was made

All the code is in `src/dog-shake.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `shake-sets.js`:
  - **The shake.** A twist that starts at the head and travels down the body (each part lags the one in front), ears flung out, jowls flapping, eyes squinting and the tail whipping last.
  - **Wet fur.** Darker, glossier and slicked flat; it fluffs back up as the water goes. The fur also trails each part's swing.
  - **Flying water.** Every drop leaves the fur at its own moment, moving the way the skin was moving, then just falls, so any frame can be rendered on its own.
  - **The bathroom, re-lit.** The thunder short's bathroom on a sunny morning, with a full, soapy bath. Also drops on the lens, steam, a bowl of kibble that can lose a fifth, the "gone" card, the glowing spine and the body/skin arcs.
- `shots.js`: the 14 shots. Shots 0 and 13 run on time measured from the loop point; shot 0 plays that same time slowed down, so the last frame and the first frame are the same frame.
- `dog.js`, `bathroom-from-the-thunder-short.js` and the other parts: the dog, the bathroom, the mouse and the render pipeline shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "That" (see `build.sh`).
- **Sound effects:** all real recordings, all CC0 (public domain, free for commercial use, no credit required).
  - The dog shakes are from Freesound: 632413 "DogShakesHimselfWater" (JKata), 505822 "Dog shake" (jedg), 547569 "Dog shaking it off" (PicklesSuck) and 435368 "Dog shaking himself dry" (giddster). `build.sh` fetches Freesound's public preview of each.
  - Everything else is from BigSoundBank by Joseph Sardin: `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_shake.py` (16 bars): slow celesta and bass for the slow-motion shots, playful pizzicato in the bathroom, a bouncy marimba for the real-time shakes.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 1051 frames (several hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
