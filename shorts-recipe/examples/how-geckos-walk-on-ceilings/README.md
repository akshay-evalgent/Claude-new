# How Geckos Walk on Ceilings 🦎

A 33-second vertical short (11 shots):
- Real HDR lighting from a room lit by a fireplace at night, with a scanned ceiling texture, a light socket and bulb, and a cement bag (all CC0, from Poly Haven).
- A procedural tokay gecko, more stylized than a photograph, with these details:
  - blue-grey granular skin with orange spots and big slit-pupil eyes
  - sprawling legs placed by IK
  - five ridged toe pads per foot that peel back from the tips like tape
- An electron-microscope look at the setae and spatulae, the atoms that hold it up, and a demonstration with a coin-sized patch.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a tokay hanging upside down on the ceiling by a bare bulb, with the caption "A gecko could hang from your ceiling all day".
- **Seamless loop.** The script ends on a word that the first line completes: "…don't wait for it to fall, because → a gecko could hang from your ceiling all day." In the last shot the gecko walks in from the bottom of the frame and stops on exactly the frame the video opens on. The music is exactly 16 bars, and the room's night bed wraps around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who's scared of lizards". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: would you let one live on your ceiling?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a real tokay gecko calling, and a house gecko's chirp
- a quiet room at night: crickets outside and the bulb's hum
- magnets snapping onto a fridge (the molecules pulling together)
- a creaking rope and a dropped bag (the weight)
- gaffer and Scotch tape peeling (the toes letting go)
- claws scrabbling on wood (the dash and the walk-in)

Only the music is synthesized.

## Files

- `output/how-geckos-walk-on-ceilings.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/how-geckos-walk-on-ceilings-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (100 words, 183 wpm, 32.8 s of voice)

> A gecko could hang from your ceiling all day, with no glue at all. Look closer at its toes. They're lined with ridges, covered in about two million tiny hairs. Each hair splits into hundreds of even tinier tips. They're so small, they get close enough for the molecules themselves to pull together. A patch of hairs the size of a coin could lift a small child. To let go, a gecko simply peels its toes back, like tape, up to fifteen times a second. So if one ever lands on your ceiling, don't wait for it to fall, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | A gecko could hang from your ceiling all day, with no glue at all. | Looking up at a tokay upside down on the ceiling, by a bare bulb | A tokay calling (Freesound 686626); crickets outside (645863), the bulb's hum (637661) |
| 4.01 | Look closer at its toes. | Pushing in on a front foot | The room |
| 6.15 | They're lined with ridges, | Looking down through a glass skylight at the toe pads pressed flat: rows of ridges | The room |
| 7.50 | covered in about two million tiny hairs. | Electron-microscope view: a carpet of setae; "≈ 2,000,000 HAIRS" | A quiet room (BSB 2387) |
| 10.40 | Each hair splits into hundreds of even tinier tips. | One seta: up the shaft to where it branches into hundreds of flat spatulae; "SPATULAE" | A quiet room |
| 13.70 | They're so small, they get close enough | Atoms: a spatula tip comes down onto the ceiling's surface | A quiet room |
| 15.58 | for the molecules themselves to pull together. | The two layers of atoms, their electron clouds flickering, pull together; "VAN DER WAALS FORCE" | A magnet snapping onto a fridge (594451) |
| 18.43 | A patch of hairs the size of a coin could lift a small child. | A coin-sized patch on the ceiling, then down the rope to a cement bag; "≈ 20 KG · 45 LB" | A dropped bag (382642), a creaking rope (862995) |
| 22.62 | To let go, a gecko simply peels its toes back, like tape, | At ceiling level: the toes curl back from their tips | Gaffer tape peeled slowly (458446), Scotch tape (369915) |
| 26.71 | up to fifteen times a second. | The gecko dashes across the ceiling; "15× A SECOND" | Claws scrabbling (830466) |
| 29.09 | So if one ever lands on your ceiling, don't wait for it to fall, because | It walks in from the bottom of frame and stops by the bulb (loop) | Claws, a house gecko's chirp (400573) |

## Sources to check before publishing

- **How it works.** Autumn et al., "Adhesive force of a single gecko foot-hair", *Nature* 405 (2000); and Autumn et al., "Evidence for van der Waals adhesion in gecko setae", *PNAS* (2002). See also UC Berkeley's 2000 news release, as reported by ScienceDaily (9 June 2000).
  - **The hairs:** geckos' toes carry millions of microscopic hairs (setae); the release says about two million. Each ends in hundreds to thousands of tiny pads called spatulae.
  - **The force:** the spatulae are small enough to get close to a surface for van der Waals forces, the attraction between molecules, to hold them. It's dry adhesion, with no glue.
  - **The coin:** the release estimates that a million hairs covering an area the size of a dime could lift a small child of about 45 lb (20 kg).
  - **Letting go:** levering a hair up to about 30° releases it, and a gecko does this by peeling its toes off the surface. When running it attaches and detaches its feet about 15 times a second.
- The numbers vary by species and source (setae per foot, total force). The script keeps to "about two million", "hundreds of tips" and "up to fifteen times a second".

## How it was made

All the code is in `src/gecko-ceilings.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven HDRs (a room by the fire, a studio), the ceiling texture, the light socket, bulb, cement bag and plant. `fetch_assets.py` downloads them.
- `gecko-and-room.js`:
  - **The gecko.** Built in a "surface frame" that is turned upside down onto the ceiling. The body is a loft that trails back along its own path, with a sideways wave when running. The legs are placed by IK in a trot gait, with feet that stay planted. The toes are flattened tubes with ridged pads that curl back from the tip.
  - **The room.** The ceiling, with a bulb on a pendant cord.
- `skylight-microscope-atoms-patch.js`:
  - **The skylight.** A glass pane to see the toe pads from above.
  - **The microscope.** The electron-microscope lighting, the carpet of setae, and one seta branching into spatulae.
  - **The atoms.** Two layers of atoms with flickering electron clouds.
  - **The weight.** The coin-sized patch with its rope and cement bag.
- `shots.js` and `transitions.js`: the 11 shots. The first and last share the loop frame.
- `shared-insect-and-molecule-kit.js` (from the mosquito short), `scene-helpers.js`, `render-pipeline.js`, `rig-and-materials.js` and `head-cues-and-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "A" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 686626 "Tookgeh Gecko" (Organuz)
    - 400573 "ThằngLằng" (a house gecko's chirp; SieuAmThanh)
    - 645863 "Crickets at night" (BonnyOrbit)
    - 637661 "light bulb hum buzz thin2" (kyles)
    - 594451 "Putting magnets on a fridge" (GH0STY_XD)
    - 862995 "Creaky Playground Swing - Rope Friction 1" (Valerie-Vivegnis)
    - 382642 "Bag Of Flour Dropped On Counter Top" (bbrocer)
    - 458446 "Gaff_Tape_Peel_Slow" (keus92)
    - 369915 "Scotch Tape" (Mrthenoronha)
    - 830466 "Clawing or Scratching at wood" (Wigglesworth)
  - **From BigSoundBank (Joseph Sardin):** a quiet room's tone (2387).
- **HDRs, models and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_gecko.py` (16 bars): warm and curious at night, with a slow pulse under the microscope.
- **Visuals:** three.js scenes, original. The gecko, setae, atoms and the patch are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 983 frames: a few hours on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
