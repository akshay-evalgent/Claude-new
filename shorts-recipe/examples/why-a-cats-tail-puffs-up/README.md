# Why A Cat's Tail Puffs Up 🐈

A 32-second vertical short (10 shots), made with three.js and a real cat model:
- **"Fripouille", a ginger-and-white cat** modelled by its owner (CC BY 4.0, via the Objaverse mirror of Sketchfab on Hugging Face), refitted, re-rigged and given:
  - shell fur that can stand on end: the tail grows into a bottle brush and the hackles rise
  - an arched-back pose and legs placed by IK
  - eyes whose pupils widen from slits to black circles when it's scared
- **Your forearm**, with real-looking skin and fine hairs (from the mosquito short). Goosebumps rise and every hair lifts.
- **A microscope section through cat skin:**
  - follicles, hairs and the tiny arrector pili muscles
  - adrenaline flooding out of a capillary
  - every muscle squeezing, so all the hairs stand up together
- **A real living room** from Poly Haven (CC0): HDR light and background, a wood floor.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is the cat side-on with its back arched and its tail puffed into a bottle brush, with the caption "When a cat's tail puffs up".
- **Seamless loop.** The script ends on a word that the first line completes: "…give it some space, because → when a cat's tail puffs up like a bottle brush." In the last shot the tail puffs up again as the camera backs off, ending on exactly the frame the video opens on. The music is exactly 16 bars, and the growl runs across the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone whose cat puffs up". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: what scares your cat the most?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a vacuum cleaner starting up (the scare)
- a cat growling, and a cat growling and hissing
- a fast heartbeat inside the skin

Only the music is synthesized.

## Files

- `output/why-a-cats-tail-puffs-up.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-a-cats-tail-puffs-up-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (100 words, 188 wpm, 32.0 s of voice)

> When a cat's tail puffs up like a bottle brush, it's the same thing that gives you goosebumps. Every hair grows from a tiny pit with its own tiny muscle. When the cat gets scared, adrenaline hits, and thousands of those muscles squeeze at once. The hairs stand straight up, and the tail can look twice as thick. Then the cat arches its back and turns sideways, so whatever scared it sees the biggest cat possible. Your goosebumps are left over from when our ancestors had fur. So if your cat's tail ever puffs up, give it some space, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | When a cat's tail puffs up like a bottle brush, | The cat side-on, arched, its tail a bottle brush, pupils wide | A low growl (Freesound 455494), a quiet room (BSB 2387) |
| 2.76 | it's the same thing that gives you goosebumps. | Close on your forearm: the skin rises into bumps and every hair lifts | The room |
| 5.42 | Every hair grows from a tiny pit with its own tiny muscle. | Inside the skin: a follicle ("FOLLICLE"), then its muscle ("TINY MUSCLE") | A calm heartbeat (675720) |
| 9.34 | When the cat gets scared, | Close on its face: the pupils snap wide and it flinches | A vacuum cleaner starting up (627541) |
| 11.32 | adrenaline hits, and thousands of those muscles squeeze at once. | Adrenaline floods out of the capillary; every muscle squeezes and all the hairs stand; "ADRENALINE" | A racing heartbeat |
| 14.68 | The hairs stand straight up, and the tail can look twice as thick. | The tail fluffs out; "2× THICKER" | A growl |
| 18.39 | Then the cat arches its back and turns sideways, | It turns side-on and arches up | A growl |
| 21.12 | so whatever scared it sees the biggest cat possible. | From the floor, where the threat stands: the cat as big as it can make itself; "AS BIG AS POSSIBLE" | A growl and hiss (679954) |
| 24.73 | Your goosebumps are left over from when our ancestors had fur. | Your arm again, the camera pulling back; "A LEFTOVER REFLEX" | The room |
| 28.22 | So if your cat's tail ever puffs up, give it some space, because | The tail puffs up again as we back off (the loop) | The growl begins |

## Sources to check before publishing

- **The mechanism.** Each hair follicle has a small smooth muscle, the arrector pili. When the sympathetic nervous system fires (fear, cold, the "fight or flight" response with adrenaline), these muscles contract and pull the hairs upright. This is piloerection, the same reflex that gives people goosebumps. It's standard physiology.
- **Twice as thick.** A fully puffed tail can look about twice its usual width. That's an everyday estimate, not a measured figure, and the script says "can look".
- **The display.** Arching the back and standing side-on is the defensive threat display described by Paul Leyhausen (*Cat Behavior*, 1979) and John Bradshaw (*Cat Sense*, 2013). It makes the cat look as large as possible.
- **Goosebumps as a leftover.** Darwin described human goosebumps as a remnant of hair-raising in furry ancestors (*The Expression of the Emotions in Man and Animals*, 1872). The view is widely held.

## How it was made

`src/cat-tail-puff.js` is the exact single file that rendered the video. The pieces are also saved separately in `src/parts/`:

- `real-cat-rig.js`: loads the rigged cat, refits and re-binds its mesh, and adds:
  - IK legs, head look-at and tail controls
  - the arched-back pose
  - shell fur whose length and comb are driven by a "puff" control (tail and back), so the hairs stand on end
  - eyes with an adjustable pupil
- `arm-skin-and-microscope.js`:
  - the living room and the forearm, whose goosebumps (a second relief map) and hair lift are driven per frame
  - the microscope section: skin layers, follicles with their hairs, arrector pili muscles that squeeze and pull the follicles upright, a capillary with adrenaline, and a carpet of hairs on the surface
- `cat-short-helpers.js`: shared helpers for the cat shorts.
- `shots.js`: the 10 shots. The first and last shots share the loop frame.
- `real-assets.js`, `shot-helpers.js`, `scene-helpers.js`, `rig-and-materials.js`, `render-pipeline.js`, `cat-scans.js` and `head-and-cues.js` are shared with the earlier shorts.

## Assets and rights

- **3D cat (CC BY 4.0, attribution required):** "3d modelling my cat: Fripouille" by guillaume bolis (sketchfab.com/guillaume.bolis.neko). Put the credit line from `upload/UPLOAD.md` in the description.
  - Downloaded through the Objaverse dataset (allenai/objaverse on Hugging Face).
  - Changed: refitted, re-rigged and posed, and fur and eyes added.
- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "When" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound:**
    - 627541 "vacuum cleaner" (hadescolossus)
    - 455494 "Cat Growl.aif" (Wrenasmir)
    - 679954 "Cat Growling and Hissing" (dinoroki)
    - 675720 "S24-30 Human heartbeat; fast.wav" (craigsmith), sped up toward a cat's heart rate
  - **From BigSoundBank (Joseph Sardin):** a quiet room's tone (2387).
- **HDR and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them and the cat model.
- **Music:** synthesized in `audio/mix_tail.py` (16 bars), tense, and sparse under the microscope.
- **Visuals:** three.js scenes. The forearm skin and hairs (from the mosquito short), the microscope section and the overlays are original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and assets
2. regenerates the voice
3. renders 960 frames: one to two hours on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
