# Why Cats Knead You 🍞😺

A 32.9-second vertical short (16 shots) built to the recipe in `../../index.html`, with the orange tabby from the earlier cat shorts. It follows the playbook's engagement section:

- **Hook.** Frame one is your point of view on the sofa: the cat on your lap, kneading the blanket, purring, half-closed eyes on you.
- **Seamless loop.** The script ends on a word that the first line completes: "…hold still, because → your cat isn't just making biscuits on you." The last shot ends on the first frame (same camera, same pose), and the purr runs straight across the cut. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone whose cat makes biscuits on them". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: does your cat drool when it kneads?" A yes/no that every cat owner can answer (see `upload/UPLOAD.md`).

As in the earlier cat shorts, **every sound effect is a real recording** (CC0): real purring (three different cats), real kittens mewing, a real cat's chirp, fabric rubbed under the kneading paws, cloth catching on claws, water poured for the milk, a drip of drool and two whooshes. Only the music is synthesized.

## Files

- `output/why-cats-knead-you.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-knead-you-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (108 words, 197 wpm, 32.9 s of voice)

> Your cat isn't just making biscuits on you. It's doing one of the first things it ever learned. Newborn kittens knead their mother's belly while they nurse, and the pressing helps the milk flow. Most cats never grow out of it. When they feel safe and warm, the kitten move comes back, often with purring, and sometimes drool. They have scent glands between their toes, so every press leaves a little of their smell on you. You've been claimed. And the claws? Kittens do that too. Their mom just had more fur than you. So if your cat climbs on your lap and starts kneading, hold still, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your cat isn't just making biscuits on you. | Your POV on the sofa: the cat on your lap kneading the blanket, purring, eyes half closed | Purr (0981), fabric rubs on every press (1104) |
| 2.49 | It's doing one of the first things it ever learned. | On your lap, the cat shrinks back into a kitten, still kneading | Whoosh (1796), a tiny mew (0098) |
| 5.25 | Newborn kittens knead their mother's belly while they nurse, | The mother lying on her side, three kittens nursing and kneading | Mom's purr (1010), kittens mewing (0390, 0372) |
| 7.98 | and the pressing helps the milk flow. | The kittens press away; a little milk bottle fills with every press | Milk pouring (1156), a squeak |
| 10.28 | Most cats never grow out of it. | The kitten grows up in one bounce, still kneading | Whoosh (1795), a grown-up chirp (1899) |
| 12.34 | When they feel safe and warm, | The tabby in the sunbeam on the rug, kneading, a slow blink | Purr |
| 14.02 | the kitten move comes back, | A see-through ghost of the kitten it was, kneading in step beside it | A faint mew (0098) |
| 15.46 | often with purring, and sometimes drool. | Close on the face, eyes shut, purr rings; a drop of drool swells and falls | Louder purr (1010), a drip (1384) |
| 18.18 | They have scent glands between their toes, | A big paw spreads its toes; golden glands glow between them | |
| 20.10 | so every press leaves a little of their smell on you. | Your POV: glowing golden paw prints appear on the blanket wherever it presses | Fabric rubs |
| 23.20 | You've been claimed. | The cat sits back, pleased; CLAIMED stamps in | A chirp (1899) |
| 24.47 | And the claws? | Close on a paw: the claws come out into the blanket | Cloth catching (0013) |
| 25.53 | Kittens do that too. | Back with the kittens, claws out on mom's belly | Kittens mewing |
| 27.12 | Their mom just had more fur than you. | Mom's fur fluffs up; she slow-blinks, unbothered | Fur rustle (1104) |
| 28.96 | So if your cat climbs on your lap and starts kneading, | The cat hops onto your lap, turns, and starts | A chirp, the landing (0013) |
| 31.98 | hold still, because | Back to your POV (loop) | Purr across the loop point |

## Sources to check before publishing

- **Kittens knead while nursing, and it helps the milk flow.** Kneading the mammary area during suckling is well documented in kittens and is thought to stimulate milk let-down. See for example Bradshaw, *Cat Sense* (2013), and the behaviour pages of International Cat Care and the ASPCA.
- **Adult cats keep doing it when they're content.** Kneading in adult cats is widely seen as a retained kitten behaviour that shows up when they're relaxed, often with purring and sometimes drooling. Drool is common but not universal, hence "sometimes".
- **Scent glands between their toes.** Cats have scent-producing glands in the skin between and around the paw pads (they also mark this way when scratching). That kneading leaves their scent on you is the usual explanation for "you've been claimed". It's an interpretation, not a measured result.
- **"Their mom just had more fur than you."** A joke. Kittens' claws do extend while they knead, just as adults' do.

## How it was made

All the code is in `src/cat-knead.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `kneading-sets.js`:
  - **Kneading:** retractable claws for the cat rig, a kneading cycle for the front paws (alternating presses, toes curling as each paw lifts), a folded knit blanket on your lap, glowing scent paw-prints and a CLAIMED stamp.
  - **The nursery:** a round cat bed in a warm night-time room, the mother cat lying on her side, and a milk bottle that fills.
  - **Close-ups:** a big hero paw with toe beans, claws and glowing scent glands.
- `shots.js`: the 16 shots. Shots 0 and 15 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- `cat-and-sets-from-the-cat-shorts.js`: the tabby rig (with its jaw, age control and x-ray mode, used for the ghost kitten) and the earlier cat sets.
- `rig-and-materials.js`, `props.js`, `living-room-and-garden.js`, `render-pipeline.js`: shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Your" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_knead.py` (16 bars):
  - warm major chords and pizzicato;
  - a celesta lullaby for the kittens;
  - a bouncy marimba when it grows up;
  - a pulse for the science;
  - a beat of silence on "And the claws?".
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 988 frames (about 2 hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
