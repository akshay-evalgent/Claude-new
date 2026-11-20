# How Owls Turn Their Heads 🦉🔄

A 33.3-second vertical short (11 shots) in the photoreal style, with x-ray anatomy in the middle:
- Real HDR lighting and backdrop from a pine forest at sunset, and a scanned dead tree trunk for the perch, from Poly Haven.
- A procedural great horned owl with a fluffy feathered body, a facial disc, big forward-facing orange eyes and ear tufts.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is an owl, seen from behind, staring straight at you over its own back. Then it swivels its head through 270 degrees; the caption reads "An owl can turn its head almost all the way around".
- **Seamless loop.** The script ends on a word that the first line completes: "…don't panic, because → an owl can turn its head almost all the way around." The last shot ends on the same stare over the back, from the same camera, as the first frame. The music is exactly 16 bars, and the forest bed wraps around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone with a stiff neck". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: did you just try turning your head all the way around?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- great horned owls hooting and a forest on a summer evening
- feathers ruffling
- a real neck popping and a back cracking
- a heartbeat and a vascular Doppler (the whoosh of blood flow)
- an air whoosh and the room tone of a quiet room

Only the music is synthesized.

## Files

- `output/how-owls-turn-their-heads.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/how-owls-turn-their-heads-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (105 words, 189 wpm, 33.3 s of voice)

> An owl can turn its head almost all the way around. It has to, because its eyes aren't balls like ours. They're long tubes, locked in place, so the head does the looking. That twist would tear the blood vessels in your neck. But an owl has fourteen neck bones, twice as many as you. Its arteries run through holes ten times wider than they are, cushioned with air, so they never get pinched. And under the jaw, they swell into little pools of blood that keep the brain fed while the head turns. So if one ever stares straight behind it, don't panic, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | An owl can turn its head almost all the way around. | From behind: the owl stares at you over its back, then swivels through 270°; "270°" | A great horned owl hooting (Freesound 763194), feathers rustling (207275), a forest evening (587338) |
| 3.38 | It has to, because its eyes aren't balls like ours. | Face to face: a slow push in on the big orange eyes; a curious head tilt | A low hoot (546237) |
| 7.20 | They're long tubes, locked in place, | X-ray: inside the glowing head, two long tubes instead of eyeballs; "TUBES" | A rush of air (BSB 1795), a quiet room (2387) |
| 9.10 | so the head does the looking. | The eyes stay fixed; the whole head snaps from side to side | A feather rustle on each turn (207275) |
| 10.88 | That twist would tear the blood vessels in your neck. | X-ray of a human neck, seven vertebrae: it twists and the arteries strain red; "YOU" | A real back crack and a neck pop (764458, 718592) |
| 13.86 | But an owl has fourteen neck bones, twice as many as you. | Side by side: the human 7 and the owl's 14 in a long S, counted up | (music) |
| 17.71 | Its arteries run through holes ten times wider than they are, | One owl vertebra up close: the artery runs through a wide hole; "10×" | (music) |
| 21.41 | cushioned with air, so they never get pinched. | The vertebra twists; the artery floats free in its cushion of air | A soft whoosh (1795) |
| 24.21 | And under the jaw, they swell into little pools of blood | X-ray owl: under the jaw the arteries balloon into reservoirs | A heartbeat (0218), blood flow (Doppler, 2500) |
| 27.14 | that keep the brain fed while the head turns. | The head turns; blood pulses up into the brain | Blood flow (2500), a heartbeat (0218) |
| 30.01 | So if one ever stares straight behind it, don't panic, because | Back in the forest from behind: the head swings round to stare at you (loop) | A rustle; a hoot that runs on into the loop (763194) |

## Sources to check before publishing

- de Kok-Mercado, F., Habib, M., Phelps, T., Gregg, L. and Gailloud, P. (2013), Johns Hopkins University School of Medicine. It was published in *Science* (2013), and summarized in ScienceDaily ("Owl mystery unraveled", 31 January 2013) and Live Science ("Biological twist: how owls spin heads around").
  - Owls can turn their heads about 270°. They have to, because their eyes are tubular, "built almost like telescopes", and can't move in their sockets.
  - Owls have 14 neck vertebrae (humans have 7). In 12 of them, the holes the vertebral arteries pass through are about 10 times wider than the artery, and the space is thought to act as an air cushion during twisting.
  - Under the jaw, the blood vessels widen into contractile reservoirs that pool blood, keeping the brain and eyes supplied while the head turns. Connections between the carotid and vertebral arteries add backup routes.
- **Human necks.** Fast, forceful twisting of the human neck can injure the vertebral arteries (vertebral artery dissection). The Johns Hopkins team made the same comparison.

## How it was made

All the code is in `src/owl-head-turn.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven HDRs (a pine forest at sunset and a studio) and the scanned dead tree trunk. `fetch_assets.py` downloads them.
- `birds.js`: the bird builder shared with the pigeon and flamingo shorts. The neck twist is "unwrapped", so the head can turn past 180° without the skin flipping.
- `owl-forest-xray-sets.js`:
  - **The owl.** An upright, streaked body under fluffy feather shells, and its own head: a round skull flattened at the face, a facial disc of radiating feathers, big forward eyes, a hooked beak and ear tufts.
  - **The x-ray set.** A glowing ghost material, procedural vertebrae with artery holes, tubular eyes, arteries, blood reservoirs and a brain.
- `shots.js`: the 11 shots. The first and last share one camera and the same stare over the back.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "An" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 763194 "Great Horned Owls" (Bansemer)
    - 546237 "Low Owl Hoot" (Danjocross)
    - 587338 "German forest summer evening with birds" (a-sounds)
    - 718592 "Popping neck knuckles" (JoMungus)
    - 764458 "Back cracking" (CarikaDarvall)
    - 207275 "Feather Pillow Ruffle" (cmorris035)
  - **From BigSoundBank (Joseph Sardin):** a heartbeat (0218), a portable vascular Doppler (2500), an air whoosh (1795) and a quiet room's tone (2387).
- **HDRs and model:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_owl.py` (16 bars): a hushed pizzicato nocturne with celesta, and a slow pulse under the x-rays.
- **Visuals:** three.js scenes, original. The owl and the anatomy are procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and the Poly Haven assets
2. regenerates the voice
3. renders 1000 frames: about an hour and a half on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
