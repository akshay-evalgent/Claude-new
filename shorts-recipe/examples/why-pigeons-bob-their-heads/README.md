# Why Pigeons Bob Their Heads 🐦🤯

A 33.5-second vertical short (16 shots) in the photoreal style:
- Real HDR lighting and a real photographed backdrop, Venice's Piazza San Marco, from Poly Haven.
- Scanned granite paving under the birds.
- Procedural pigeons with feathered skin, an iridescent neck and legs solved by inverse kinematics (IK).
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a pigeon strutting across the square, at pigeon height, with the caption "That pigeon isn't bobbing its head".
- **Seamless loop.** The script ends on a word that the first line completes: "…look closely, because → that pigeon isn't bobbing its head." The last shot comes down from a wide view of the square to the strutting pigeon and lands on the first frame. The music is exactly 16 bars, and the ambience beds wrap around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who walks like a pigeon". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: are you going to stare at every pigeon's head now?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- real pigeons cooing and walking
- pigeons flapping in Florence's Piazza della Signoria
- the beat of a pigeon's wings
- a red-tailed hawk
- a treadmill, the room tone of a quiet room, a camera shutter and air whooshes

Only the music is synthesized.

## Files

- `output/why-pigeons-bob-their-heads.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-pigeons-bob-their-heads-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (103 words, 184 wpm, 33.5 s of voice)

> That pigeon isn't bobbing its head. Watch. With every step, its head locks in place, frozen in the air, while its body walks forward underneath. Then the head snaps ahead to catch up, and locks again. Hold, snap. Hold, snap. Why? A pigeon can barely move its eyes, so it steadies its whole head instead, like a camera on a tripod. Every hold gives it a sharp, still picture to spot seeds, and hawks. Scientists showed it with a treadmill. When the world around the walking pigeon stopped moving, so did the bobbing. So next time one struts past you, look closely, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | That pigeon isn't bobbing its head. | A pigeon struts across the Piazza San Marco at pigeon height; others peck behind it | Pigeons flapping in a piazza (Freesound 709408), pigeons cooing (154865), a pigeon cooing as it walks (701282) |
| 1.83 | Watch. | Time slows; the camera pushes in on the head | A soft whoosh (BSB 1796) |
| 2.69 | With every step, its head locks in place, frozen in the air, | Slow motion, side on: a laser line appears through the eye, and the head stays on it | A coo slowed right down (795558), a shutter click as the head locks (0307) |
| 5.70 | while its body walks forward underneath. | Low angle: the feet step and the body slides forward under the frozen head | A wing rustle, slowed (153277) |
| 7.85 | Then the head snaps ahead to catch up, and locks again. | The head shoots forward (motion-blurred) and locks on a second laser line | A whoosh (1795), the shutter again |
| 10.65 | Hold, snap. Hold, snap. | Each hold leaves a laser line where the eye stopped; each snap jumps to the next | A shutter on every hold, a whoosh on every snap |
| 12.55 | Why? | Close on the head and the orange eye | A soft coo (795558) |
| 13.21 | A pigeon can barely move its eyes, | The head turns; the eye stays put in its socket | Coos (701282) |
| 14.92 | so it steadies its whole head instead, | Three-quarter view: the body rocks and bobs, and the head holds still | Coos and the square |
| 16.84 | like a camera on a tripod. | A small tripod with a vintage camera beside a pigeon, both dead still | A real camera shutter (0308) |
| 18.90 | Every hold gives it a sharp, still picture to spot seeds, | The pigeon's own view: still during each hold, lurching forward on each snap, onto scattered seeds | Soft air on each snap (1796), coos |
| 22.38 | and hawks. | The view jerks up to the sky: a hawk glides over the square | A red-tailed hawk crying (875513), pigeons scattering (701283) |
| 23.76 | Scientists showed it with a treadmill. | A lab: a pigeon walking on a small treadmill (display: 0.7 km/h) | A real treadmill (585758), room tone (2387) |
| 25.66 | When the world around the walking pigeon stopped moving, | Side on: the belt runs, the pigeon walks in place, and its eye never leaves the laser line | The treadmill, a quiet coo |
| 28.76 | so did the bobbing. | Close on the steady head on the line | The treadmill, a quiet coo |
| 30.22 | So next time one struts past you, look closely, because | Back in the square: from a wide view down to the strutting pigeon (loop) | A coo and a wing flap; the square |

## Sources to check before publishing

- **Hold and thrust; the treadmill.** Frost (1978), "The optokinetic basis of head-bobbing in the pigeon", *Journal of Experimental Biology* 74: 187–195:
  - High-speed film showed that the walking pigeon's head locks in space (the "hold" phase) while the body moves forward, then thrusts forward to a new position.
  - On a treadmill, where the surroundings stayed still relative to the bird, the head-bobbing stopped. So the bob is driven by vision, not by walking itself.
- **Why: a stable image.** Theunissen & Troje (2017), "Head stabilization in the pigeon: role of vision to correct for translational and rotational disturbances", *Frontiers in Neuroscience* 11: 551.
  - Head stabilization is key for animals with a limited capacity to move their eyes, like pigeons.
  - The hold phases are when the image on the retina is stable.
  - Another idea, from Davies & Green (1988), is that the thrusts also help judge depth (motion parallax). The script gives the main explanation.
- **Which birds.** Pigeons, doves, chickens and many other ground-walking birds bob this way. Not all birds do.

## How it was made

All the code is in `src/pigeon-head-bob.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js` loads from Poly Haven:
  - the Piazza San Marco HDR (lighting, a backdrop projected onto the ground, and the sun's direction, read from the brightest point in the photo)
  - a studio HDR, a scanned granite paving texture and a vintage camera model

  `fetch_assets.py` downloads them.
- `pigeon.js`:
  - **The body.** One smooth lofted skin runs from tail to beak, so the body, neck and head move as one surface. The neck is a curve whose thickness continues the body's taper into the head's, so there is no crease when it stretches or folds.
  - **Feathers and colour.** Procedural textures give the contour feathers, folded wings with their two dark bars, and a tail with its dark band. The iridescent green-and-purple neck uses thin-film iridescence.
  - **Face and feet.** The orange eyes have a painted bare eye-ring. There is a white cere, and pink scaly legs and toes.
  - **The gait.** The body walks on steadily. The head holds still in space, then thrusts ahead with each step, as in Frost's film.
- `piazza-lab-tripod-hawk-sets.js`: the square at pigeon height, a pecking flock, the laser lines, seeds, the tripod, the hawk and the lab treadmill.
- `shots.js`: the 16 shots. The bird's clock is warped per shot for the slow motion, timed so each "hold" and "snap" lands on its word. The first and last shots share one walk and one camera path, measured from the loop point.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts. The render pipeline does anti-aliasing, soft shadows, motion blur, depth of field, bloom, lens fringe and film grain.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "That" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 701282 "pigeon walking and cooing" and 701283 "pigeons flying wings noise" (5ro4)
    - 154865 "pidgeons cooing city park" (pawsound)
    - 795558 "Pigeon cooing" (Fsu2001)
    - 709408 "Pigeons flapping in Piazza della Signoria" (nps32)
    - 153277 "Beating wings of a pigeon" (gerardcatala)
    - 875513 "Red Tailed Hawk Cries" (loganzsound)
    - 585758 "Treadmill" (Richard1052)
  - **From BigSoundBank (Joseph Sardin):** camera shutters (0307, 0308), air whooshes (1795, 1796) and a quiet room's tone (2387).
- **HDRs, model and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_pigeon.py` (16 bars):
  - a strutting pizzicato walk
  - it freezes to a soft pad in the slow motion
  - it stops for "Hold, snap" so the shutter and whooshes land
  - celesta for the lab
- **Visuals:** three.js scenes, original. The pigeons are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 1005 frames: about an hour on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
