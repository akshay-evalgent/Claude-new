# Why Mosquitoes Bite Some People More 🦟

A 34-second vertical short (13 shots), shot as macro photography:
- Real HDR lighting and backdrop from a park just after sunset and from a vintage lab, with a scanned table, chairs, lantern and plants (all CC0, from Poly Haven).
- A procedural female *Aedes aegypti* (the species in the study), with these details:
  - a scaled thorax with the white lyre
  - banded legs placed by IK
  - compound eyes and antennae with whorls of hairs
  - a proboscis whose sheath bows back as the needle goes in
  - an abdomen that swells red as she feeds
- A forearm with pores, furrows and fine hairs.
- The microscopic skin surface with oil and bacteria, ball-and-stick molecules, nylon stockings, and the two-choice test from the study.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a mosquito that has just landed on a forearm at dusk, shot at skin level, with the caption "Some people really are mosquito magnets".
- **Seamless loop.** The script ends on a word that the first line completes: "…it's not bad luck. It's because → some people really are mosquito magnets." The last shot pushes in from the table to the very frame the video opens on. The music is exactly 16 bars, and the evening bed and a passing buzz wrap around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who always gets bitten". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: are you the one who gets eaten alive at every barbecue?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a single mosquito's whine, and mosquitoes buzzing past
- a summer evening full of crickets
- a deep breath, a real heartbeat
- a lotion bottle squeezed (the skin's oil), a fizz of bubbles (the bacteria), clothes rustling (the stockings)
- a laboratory, a tally counter, a ticking clock

Only the music is synthesized.

## Files

- `output/why-mosquitoes-bite-some-people-more.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-mosquitoes-bite-some-people-more-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (99 words, 175 wpm, 34.0 s of voice)

> Some people really are mosquito magnets. Only females bite. They need blood to make eggs. First, she follows your breath, the carbon dioxide, from up to thirty feet away. Up close, she smells your skin. Your skin makes oils, and bacteria turn them into your own personal scent. In one study, people wore nylon stockings on their arms, and the mosquitoes picked one person a hundred times more than another. That person's skin made far more of certain acids, and it stayed that way for years. So if you always get bitten first, it's not bad luck. It's because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Some people really are mosquito magnets. | At skin level, she has just landed on a forearm at dusk and starts to probe | Crickets (Freesound 746366); two others buzz past (477794) |
| 2.62 | Only females bite. | A female and a male hovering, labelled "bites" and "sips nectar" (his antennae are bushy) | Two real whines, his higher (435650) |
| 4.23 | They need blood to make eggs. | Side-on as she feeds: the abdomen swells red, then turns to glass and shows the eggs | A heartbeat under the skin (BSB 0218) |
| 6.07 | First, she follows your breath, the carbon dioxide, | Chasing her up the breath plume, zig-zagging, through drifting CO₂ molecules; "CO₂" | A breath out (717167), her whine (435650) |
| 8.90 | from up to thirty feet away. | From out in the field, 9 m away: the table and its lantern far off, circled; "30 FT · 9 M" | Her whine, faint |
| 10.83 | Up close, she smells your skin. | Her head and antennae hovering over the skin; scent rising past them | Her whine, close |
| 13.06 | Your skin makes oils, | The skin magnified: flakes, a hair, oil welling up from its follicle | A lotion bottle squeezed (854468) |
| 14.28 | and bacteria turn them into your own personal scent. | Closer: bacteria on the flakes around the oil; odour molecules rising | Bubbles, softened (521897) |
| 17.55 | In one study, people wore nylon stockings on their arms, | A stockinged forearm on a lab bench, the stocking's cuff, a "SUBJECT 33" card | Clothes rustling (566193), a laboratory (648662) |
| 20.84 | and the mosquitoes picked one person a hundred times more than another. | The two-choice test: released mosquitoes stream down the tube to Subject 33's stocking; "100×" | Mosquitoes buzzing (477794), a tally counter (664698) |
| 25.04 | That person's skin made far more of certain acids, | The stocking magnified, fatty acids drifting off it; "CARBOXYLIC ACIDS" | The room, the music |
| 28.02 | and it stayed that way for years. | The same test, day after night, "YEAR 1 / 2 / 3", always the same box | A clock, ticking faster and faster (813355) |
| 30.29 | So if you always get bitten first, it's not bad luck. It's because | Back at the table: she flies in and lands on the arm (loop) | Her whine swells, then stops as she lands |

## Sources to check before publishing

- **Mosquito magnets, the study.** De Obaldia et al., "Differential mosquito attraction to humans is associated with skin-derived carboxylic acid levels", *Cell* (October 2022), from Leslie Vosshall's lab at Rockefeller University. See the Rockefeller news release "Why some people are mosquito magnets" (18 October 2022).
  - **The method:** participants wore nylon stockings over their forearms, six hours a day. The stockings were tested in pairs in a two-choice olfactometer, a plexiglass chamber with two tubes, each ending in a box that held a stocking.
  - **The result:** the most attractive person, Subject 33, was about 100 times more appealing to *Aedes aegypti* than the least attractive, Subject 19. The difference was stable over the several years of the study.
  - **The acids:** the most attractive people had much higher levels of carboxylic acids on their skin. These come from sebum, the skin's oily layer, which skin bacteria use to make our body odour. The study shows an association, not proof of cause.
- **Only females bite.** Female mosquitoes need protein from blood to produce eggs; males feed on nectar and plant sugars.
- **Breath from up to thirty feet.** Mosquitoes track the carbon dioxide in exhaled breath from a distance. A 2015 University of Washington release quotes up to 30 feet; Caltech's modelling suggests 10 to 50 m. Closer in, they use sight, smell and body heat.

## How it was made

All the code is in `src/mosquito-magnets.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven HDRs (a park at sunset, a vintage measuring lab, a studio), the scanned table and chairs, lantern, plants, clipboard and chemistry set. `fetch_assets.py` downloads them.
- `mosquito-and-molecules.js`:
  - **The mosquito.** The legs are rebuilt each frame from IK. The abdomen plates spread over a blood-filled membrane as she feeds, because hard plates don't stretch. The wings fold at rest, and in flight become a soft blur over their small stroke arc.
  - **The molecules.** Ball-and-stick models (CO₂, fatty acids, odour molecules), each merged into one mesh.
- `skin-and-park.js`:
  - **The skin.** Tileable skin colour and relief: furrows, pores and fine grain.
  - **The forearm.** It has combed, tapered hairs.
  - **The park.** The table and lantern in the park at dusk.
- `plume-microscope-nylon-olfactometer.js`:
  - **The breath.** The plume, plus callouts.
  - **Under the microscope.** The skin surface, built as a Voronoi field of skin flakes with furrows and a follicle; a hair with cuticle scales; oil and bacteria.
  - **The stocking.** The knit, and the sleeve with its cuff.
  - **The test.** The acrylic two-choice olfactometer and a swarm of small mosquitoes.
- `shots.js` and `transitions.js`: the 13 shots. The first and last share the loop frame.
- `render-pipeline.js` now also draws each shot's labels after depth of field, so text stays crisp in macro shots. `rig-and-materials.js`, `head-cues-and-helpers.js` and `scene-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Some" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 435650 "Single Mosquito Buzz" (scottjodoin)
    - 477794 "Mosquito Buzzing" (MarianaRA)
    - 746366 "Southern Summer Evening Ambience with Crickets 5" (RyanKingArt)
    - 717167 "Deep Breath" (rrehl)
    - 854468 "Lotion Bottle Squeeze" (Randi_McRando)
    - 521897 "Foley_SoftDrink_BubblingLoop" (MrFossy)
    - 566193 "Clothes' Rustles - 3 Sounds in One! - Sound #2" (njjjjjjjjjjjjjjjjjjjjjjjj)
    - 648662 "Scientific laboratory ambience" (Elenalostale)
    - 664698 "Tally Counter" (revdrmr)
    - 813355 "1min Clock Ticking - CC0" (bulkmoerls)
  - **From BigSoundBank (Joseph Sardin):** a heartbeat (0218) and a quiet room's tone (2387).
- **HDRs and models:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_mosquito.py` (16 bars): curious and a little tense at dusk, with a slow pulse under the microscope and in the lab.
- **Visuals:** three.js scenes, original. The mosquito, skin, microbes, molecules and lab apparatus are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 1019 frames: a few hours on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
