# Why Octopuses Have Three Hearts 🐙💙

A 30.5-second vertical short (11 shots) in the photoreal style, with an x-ray of the octopus's circulation:
- A procedural octopus: a wet, mottled red-brown skin with papillae, eight tapering arms with rows of suckers, and a golden eye with a horizontal pupil.
- A seabed of scanned coral sand, coastal rocks and a conch shell (all CC0, from Poly Haven), under moving caustics and drifting particles.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is an octopus resting on the seabed, looking at you, with the caption "An octopus has three hearts". Then its body turns to glass and three hearts beat inside.
- **Seamless loop.** The script ends on a word that the first line completes: "…cut it some slack, because → an octopus has three hearts, and blue blood." The last shot comes back to the same resting octopus and the same camera as the first frame. The music is exactly 16 bars, and the ambience beds wrap around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone who hates swimming". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: if you had three hearts, what would you name them?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- an underwater ambience, bubbles and real underwater swooshes
- a soft squelch
- a laboratory, and a real test tube plucked
- a heartbeat and a vascular Doppler (the whoosh of blood flow)

Only the music is synthesized.

## Files

- `output/why-octopuses-have-three-hearts.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-octopuses-have-three-hearts-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (89 words, 175 wpm, 30.5 s of voice)

> An octopus has three hearts, and blue blood. Two of the hearts sit by the gills, pumping blood through them to pick up oxygen. The third, the biggest, sends it around the body. And that blood is blue because it carries oxygen on copper, not iron like ours. But here's the catch: every time an octopus jets through the water, that main heart pauses. That's why they'd rather crawl than swim. Swimming wears them out fast. So next time you see one zooming away, cut it some slack, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | An octopus has three hearts, | An octopus resting on the seabed, looking at you | Underwater ambience (Freesound 393819), bubbles (852478) |
| 0.94 | and blue blood. | Its body turns to glass: three hearts beat, blue blood starts to flow | Three heartbeats in turn (BSB 0218), blood flow (Doppler, 2500) |
| 3.06 | Two of the hearts sit by the gills, pumping blood through them to pick up oxygen. | X-ray close: the two gill hearts beat; pale blood goes through the feathery gills and comes out blue; "OXYGEN" | Heartbeats (0218) |
| 8.04 | The third, the biggest, sends it around the body. | The big heart pumps; blue blood runs out to the head and arms | Blood flow (2500) |
| 10.93 | And that blood is blue because it carries oxygen on copper, not iron like ours. | Two test tubes from a real chemistry set: blue "COPPER", red "IRON" | A laboratory (648662), a test tube plucked on each word (857650) |
| 16.50 | But here's the catch: | The golden eye with its horizontal pupil | Bubbles |
| 17.80 | every time an octopus jets through the water, | It squeezes its mantle and shoots off, arms streaming behind | Real underwater swooshes (760849), bubbles |
| 20.36 | that main heart pauses. | X-ray mid-jet: the big heart stops; the blood stalls; "PAUSED" | A heartbeat that stops (0218) |
| 22.43 | That's why they'd rather crawl than swim. | Crawling across the sand | A soft squelch (547446) |
| 24.91 | Swimming wears them out fast. | Flopped by the rocks, arms draped, breathing slowly | Slow bubbles |
| 26.42 | So next time you see one zooming away, cut it some slack, because | Another octopus jets off behind; back to the resting octopus (loop) | A swoosh (760849), the seabed |

## Sources to check before publishing

- **Three hearts.** Two branchial hearts pump blood through the gills; the larger systemic heart pumps it on round the body. See Smithsonian Magazine, "Ten curious facts about octopuses", and Live Science, "How many hearts does an octopus have?".
- **Blue blood.** Octopus blood carries oxygen on hemocyanin, a copper-based protein (blue when oxygenated). Human blood uses hemoglobin, which is iron-based. Same sources.
- **The heart pauses when they swim.** In jet swimming, the systemic heart stops or is interrupted with each jet, because the mantle pressure makes it hard for blood to return; it starts again afterwards.
  - This is from Wells et al. (1987), who recorded heart activity in freely moving octopuses, as reported in Live Science and ScienceBlog.
  - It's one reason octopuses usually crawl, and why swimming tires them quickly.
  - The script says the heart "pauses" each time it jets, not that it stops for the whole swim.

## How it was made

All the code is in `src/octopus-hearts.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven assets: a studio HDR, the scanned coastal rocks, a conch shell, the chemistry set and the coral-sand texture. `fetch_assets.py` downloads them.
- `octopus-seabed-xray-sets.js`:
  - **The octopus.** A lofted head and mantle that breathe and squeeze; eight arms rebuilt every frame along moving curves, with suckers placed on the underside; and the eyes.
  - **The seabed.** Caustics computed as a Voronoi pattern, a gradient sea and drifting particles.
  - **The x-ray.** Three beating hearts, feathery gills, vessels, and blood particles that turn from pale to blue as they pass through the gills.
  - **The test tubes.** Taken from the scanned chemistry set.
- `shots.js`: the 11 shots. The first and last share one camera path, measured from the loop point.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "An" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 393819 "Underwater Ambience" (Kinoton)
    - 852478 "Underwater Bubble Flow" (KolbyRFX)
    - 760849 "Underwater Motion" (NapierFreesound)
    - 648662 "Scientific laboratory ambience" (Elenalostale)
    - 547446 "squelching" (tiddles451)
    - 857650 "Test Tube pluck" (robni7)
  - **From BigSoundBank (Joseph Sardin):** a heartbeat (0218), a portable vascular Doppler (2500) and a quiet room's tone (2387).
- **HDR, models and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_octopus.py` (16 bars): deep and curious, with a slow pulse under the x-rays.
- **Visuals:** three.js scenes, original. The octopus and the anatomy are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 916 frames: about an hour and a half on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
