# Why Cows Have Four Stomachs 🐄

A 31.6-second vertical short (13 shots):
- Real HDR lighting and backdrop from an Alpine pasture, with scanned grass clumps and dandelions (CC0, from Poly Haven).
- A procedural Holstein cow, more stylized than the other animals in this series, seen mostly in medium and wide shots.
- An x-ray ghost of the cow, the four-chambered stomach in wet tissue, and the inside of each room.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a Holstein chewing in an Alpine meadow, with the caption "A cow eats every meal twice".
- **Seamless loop.** The script ends on a word that the first line completes: "…it's not bored, because → a cow eats every meal twice." The last shot comes back to the same cow and the same camera as the first frame. The music is exactly 16 bars, and the cowbell bed wraps around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who chews too loud". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: would you eat your lunch twice?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a herd with cowbells in the Austrian Alps
- cattle tearing grass, a cow breathing and chewing its cud, a cow mooing
- real stomach gurgles (slowed for the rumen)
- a wet sponge squeezed, a fizzing drink, and the room tone of a quiet room

Only the music is synthesized.

## Files

- `output/why-cows-have-four-stomachs.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cows-have-four-stomachs-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (96 words, 182 wpm, 31.6 s of voice)

> A cow eats every meal twice. It doesn't have four stomachs. It has one, with four rooms. Grass goes into the first, the rumen, a vat as big as a bathtub, packed with trillions of microbes that break down tough plant fiber. Then the cow burps the mush back up, and chews it again. That's chewing the cud, up to eight hours a day. The honeycomb room sorts it, the third squeezes out the water, and the fourth digests with acid, just like yours. So when a cow just stands there chewing, it's not bored, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | A cow eats every meal twice. | A Holstein chewing in an Alpine meadow | Cowbells in the Austrian Alps (Freesound 320677), a cow breathing and chewing (764587) |
| 2.41 | It doesn't have four stomachs. | The cow turns to glass: the stomach inside | A distant moo (513565), a quiet room (BSB 2387) |
| 4.17 | It has one, with four rooms. | The organ alone, turning; each room lights up and is numbered 1 to 4 | (music) |
| 6.50 | Grass goes into the first, | Head down in the grass, tearing it | Cattle tearing grass (406338) |
| 8.12 | the rumen, a vat as big as a bathtub, | The rumen, lifted out, settles into a bathtub it fills | A deep gurgle (BSB 3177, slowed) |
| 10.51 | packed with trillions of microbes that break down tough plant fiber. | Inside the rumen: a lining of papillae, green fibre, microbes breaking it apart | Gurgles (3177) |
| 14.55 | Then the cow burps the mush back up, | X-ray: a ball of cud rides up the gullet to the mouth | A rising gurgle (3176, 3177) |
| 16.47 | and chews it again. | The cow chewing, its jaw grinding side to side | Chewing (764587) |
| 17.79 | That's chewing the cud, up to eight hours a day. | Time-lapse: the cow chews on as the shadows swing round; "8 HOURS" | Chewing, cowbells |
| 20.91 | The honeycomb room sorts it, | Inside the reticulum: the honeycomb lining | A soft gurgle (3176) |
| 22.54 | the third squeezes out the water, | The omasum's leaves press together; water drips out | A wet sponge squeezed (575332) |
| 24.34 | and the fourth digests with acid, just like yours. | Inside the abomasum: folds of lining and a fizzing pool of acid | A fizzing drink (521897) |
| 27.58 | So when a cow just stands there chewing, it's not bored, because | Back in the pasture (loop) | Chewing on into the loop |

## Sources to check before publishing

- **One stomach, four compartments.** The ruminant stomach is one organ with four compartments: the rumen, reticulum, omasum and abomasum. See, for example, the Penn State Extension and the University of Minnesota Extension guides to the ruminant digestive system.
  - **The rumen** is a large fermentation vat; in an adult dairy cow it holds well over 100 litres, about the size of a bathtub. Microbes in it (bacteria, protozoa and fungi) break down plant fibre (cellulose) that the cow can't digest by itself.
  - **The reticulum** has a honeycomb lining and helps sort particles; small ones pass on, large ones go back for more chewing.
  - **The omasum** has many leaf-like folds and absorbs water.
  - **The abomasum** is the "true stomach", with acid and enzymes like ours.
- **Chewing the cud.** Cows regurgitate partly fermented food (cud) and chew it again. Rumination takes roughly 7 to 10 hours a day in dairy cattle, so "up to eight hours" is on the cautious side.

## How it was made

All the code is in `src/cow-stomach.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven HDRs (an Alpine pasture and a studio), the scanned grass clumps and dandelions, and a leafy-grass texture. `fetch_assets.py` downloads them.
- `lofted-animal-skin.js`: the lofted-skin builder shared with the bird shorts, used here for the cow's body, neck and head.
- `tissue.js`: the wet-tissue textures shared with the stomach-growl short.
- `cow-pasture-stomach-sets.js`:
  - **The cow.** Holstein patches, short-hair texture, four jointed legs, a swishing tail, an udder, ears and a chewing jaw.
  - **The pasture.** The Alpine meadow.
  - **The stomach.** The four-chambered stomach, a rumen lined with papillae with fibre and microbes, the honeycomb reticulum, the leaves of the omasum, the abomasum with its acid, and a bathtub for scale.
- `shots.js`: the 13 shots. The first and last share one camera path, measured from the loop point.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "A" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 320677 "Cowbells, Herd of Cows, Austrian Alps" (aUREa)
    - 406338 "cattle eating grass" (Slowmote)
    - 764587 "Cow Breathing and Chewing" (elricadavis)
    - 513565 "Cow moo #8" (spurioustransients)
    - 575332 "squishing and squeezing a wet sponge in a bowl" (breadparticles)
    - 521897 "Foley_SoftDrink_BubblingLoop" (MrFossy)
  - **From BigSoundBank (Joseph Sardin):** stomach gurgles (3176, 3177) and a quiet room's tone (2387).
- **HDRs, models and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_cow.py` (16 bars): pastoral, with a slow pulse under the x-rays and inside the stomach.
- **Visuals:** three.js scenes, original. The cow and the anatomy are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 949 frames: about an hour and a half on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
