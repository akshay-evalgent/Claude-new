# Why Flamingos Are Pink 🦩💄

A 34.7-second vertical short (17 shots) in the photoreal style:
- Real HDR lighting and sky from a salt pan at sunrise, from Poly Haven.
- A mirror-calm lagoon with real reflections.
- Procedural flamingos with an S-shaped neck, a bent bill, IK legs, and a chick in grey down.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a flamingo standing on one leg in a glowing lagoon at sunrise, with the caption "Flamingos aren't born pink".
- **Seamless loop.** The script ends on a word that the first line completes: "…isn't really theirs at all, because → flamingos aren't born pink." The last shot pushes in from a wide view of the lagoon to the same flamingo and lands on the first frame. The music is exactly 16 bars, and the ambience beds wrap around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who loves flamingos". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: did you know flamingos wear makeup?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- flamingo flocks calling over a lagoon, a single greater flamingo, and flamingos at a zoo
- wading in shallow water and underwater bubbles
- a real carrot snapping, pellets being poured, feathers ruffling
- the room tone of a quiet room

Only the music is synthesized.

## Files

- `output/why-flamingos-are-pink.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-flamingos-are-pink-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (97 words, 168 wpm, 34.7 s of voice)

> Flamingos aren't born pink. Their chicks hatch fluffy and grey. The pink comes from their food: tiny shrimp and algae full of orange-red pigments called carotenoids, the same kind that make carrots orange. A flamingo's body pulls out those pigments and packs them into its growing feathers, legs and beak. Take them away, and new feathers grow in pale. That's why zoos add pigment to their food. And in mating season, flamingos even wear makeup, rubbing pink oil from a gland near their tail all over their feathers. So that pink isn't really theirs at all, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Flamingos aren't born pink. | A flamingo on one leg in a mirror-calm lagoon at sunrise; the flock behind | Flamingo flocks on a lagoon (Freesound 665089, 386396), a greater flamingo calling (852645) |
| 1.92 | Their chicks hatch fluffy and grey. | A grey downy chick on its mud nest mound, a parent's legs behind | Soft flamingo calls (535778) |
| 4.24 | The pink comes from their food: | Filter-feeding, head upside down in the water | Wading in the shallows (342932, 627004) |
| 5.93 | tiny shrimp and algae | Under the surface: brine shrimp swimming among green and red algae | Underwater ambience (393819), bubbles (852478) |
| 7.90 | full of orange-red pigments called carotenoids, | One shrimp up close; its pigment granules light up; "CAROTENOIDS" | Bubbles (852478) |
| 10.22 | the same kind that make carrots orange. | Carrots on a wooden cutting board, a pink feather beside them | A carrot snapping (181107), a knife through a carrot (693959), a quiet room (BSB 2387) |
| 12.79 | A flamingo's body pulls out those pigments | A young grey flamingo blushes pink | Calls (535778) |
| 15.08 | and packs them into its growing feathers, | The pink spreads through the new feathers | The lagoon |
| 17.20 | legs | The legs turn from grey to pink | A splash (342932) |
| 18.13 | and beak. | The base of the bill turns pink | The lagoon |
| 18.64 | Take them away, and new feathers grow in pale. | The same bird washes out to a pale, almost white pink | A flamingo calling (852645) |
| 21.79 | That's why zoos add pigment to their food. | A bucket of pink pellets poured into a zoo pond; flamingos come to feed | Flamingos at a zoo (742823), pellets poured (593610) |
| 24.70 | And in mating season, | A group display: a tight flock marching, heads up, flagging side to side | A flock calling (386396), wading (627004) |
| 26.02 | flamingos even wear makeup, | Close on a face | Feathers ruffling (207275) |
| 27.86 | rubbing pink oil from a gland near their tail | The head swings back to the base of the tail and rubs | Feathers ruffling (207275) |
| 30.73 | all over their feathers. | It rubs the oil into its neck and breast, which glisten | Feathers ruffling (207275) |
| 32.30 | So that pink isn't really theirs at all, because | Back on the lagoon, pushing in to the one-legged flamingo (loop) | A call (535778), the lagoon |

## Sources to check before publishing

- **Color from food; chicks hatch grey.** Smithsonian's National Zoo, "Why are flamingos pink? And other flamingo facts":
  - The pink comes from carotenoid pigments in the algae and small crustaceans (brine shrimp) that flamingos eat.
  - Chicks hatch with grey or white down and take years to turn pink.
- **The pigments.** Carotenoids are the family of pigments that also colours carrots (beta-carotene). Most of the pigment in greater flamingo feathers is canthaxanthin, over 60% of the total (Fox et al. 1967; Amat et al. 2011).
- **Fading without it; zoo diets.** Without carotenoids in the diet, new feathers grow in pale.
  - Zoos feed special pellets with added pigment, usually canthaxanthin; see Smithsonian Magazine, "For some species, you really are what you eat", and the Los Angeles Zoo's flamingo page.
  - Before that, zoos used carrots, red peppers and dried shrimp.
- **Makeup.** Amat et al. (2011), "Greater flamingos *Phoenicopterus roseus* use uropygial secretions as make-up", *Behavioral Ecology and Sociobiology* 65: 665–673.
  - The oil from the preen gland, which sits at the base of the tail, carries the same carotenoids as the feathers.
  - Flamingos rub it from the gland onto their neck, breast and back feathers, which makes them more colourful.
  - They do it most during the group displays of the mating season.
  - A 2021 follow-up in *Ecology and Evolution* found the colour fades when no makeup is applied.

## How it was made

All the code is in `src/flamingo-pink.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js` loads from Poly Haven, and `fetch_assets.py` downloads them:
  - HDRs of a salt pan at sunrise (the sky, the lighting, and the sun's direction from the brightest point) and of a studio
  - a cutting board and a wooden bucket
  - scanned mud and concrete
- `birds.js`: the bird builder shared with the pigeon short:
  - one smooth skin from tail to beak, with twist-free frames along the neck
  - feathered textures and folded wings
  - downy "fluff" shells for the chick
  - legs solved by IK, so a flamingo can stand on one leg with the other folded under
- `flamingos-lagoon-shrimp-carrots-sets.js`:
  - **Birds and poses.** The flamingo and chick species, the bent bill with its black tip, and the poses: standing, one-legged, filter-feeding upside down, and preening at the gland near the tail.
  - **The lagoon.** A rippled mirror with a real reflection of the scene.
  - **The props.** Brine shrimp with leafy legs and glowing pigment granules, drifting algae, carrots, a pink feather, a mud nest mound and the zoo pellets.
- `shots.js`: the 17 shots. The flamingo's colour is a live blend: grey juvenile → pink → faded pale, spreading through the feathers, then the legs, then the bill. The first and last shots share one camera path, measured from the loop point.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Flamingos" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 852645 "Water Birds - Greater Flamingo" (TheKingOfGeeks360)
    - 386396 "Flamingos" (BeeProductive)
    - 535778 "Flamingos" (Breviceps)
    - 742823 "Flamingos in the Schoenbrunn ZOO, Vienna" (TomaszBuga)
    - 665089 "Flamingoes and Ducks Lagoon" (ambiphonic)
    - 342932 "Wading in Shallow Water" (ryansitz)
    - 627004 "Walking through water" (rosenberg3)
    - 852478 "Underwater Bubble Flow" (KolbyRFX)
    - 393819 "Underwater Ambience" (Kinoton)
    - 181107 "Carrot Snaps and Crunches" (lolamadeus)
    - 693959 "Cutting carrot" (BeroundSound)
    - 593610 "Pouring cat pellets in a bowl" (Rehanjo)
    - 207275 "Feather Pillow Ruffle" (cmorris035)
  - **From BigSoundBank (Joseph Sardin):** the room tone of a quiet room (2387).
- **HDRs, models and textures:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_flamingo.py` (16 bars):
  - a warm marimba over a soft bass
  - muffled under the water
  - pizzicato for the makeup
- **Visuals:** three.js scenes, original. The flamingos, chick, shrimp and carrots are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 1040 frames: about an hour and a half on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
