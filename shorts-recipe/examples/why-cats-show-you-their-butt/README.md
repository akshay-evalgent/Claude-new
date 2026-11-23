# Why Cats Show You Their Butt 🐈

A 31-second vertical short (10 shots), made with three.js and a real cat model:
- **"Fripouille", a ginger-and-white cat** modelled by its owner (CC BY 4.0, via the Objaverse mirror of Sketchfab on Hugging Face), refitted, re-rigged and given:
  - legs placed by IK, with feet that stay planted (walking, turning on the spot, circling)
  - a head that looks at things and a tail that goes straight up
  - shell fur, glossy eyes with slit pupils, and whiskers
- **The same cat in a second coat**, a silver tabby made by repainting the texture, and as **two kittens**: the same rig at half size with a bigger head.
- **A real living room** from Poly Haven (CC0): HDR light and background, a sofa, a plant and a wood floor.
- **A holographic "scent ID" card**, with a scent signature unique to each cat.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is your view from the sofa: the cat stands on the seat with its back to you, tail straight up, looking back over its shoulder. The caption reads "When your cat sticks its butt in your face".
- **Seamless loop.** The script ends on a word that the first line completes: "…don't take it personally, because → when your cat sticks its butt in your face, it's being polite." The last shot ends on exactly the frame the video opens on. The music is exactly 16 bars, and the purring wraps around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone whose cat does this". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: how many times a day does your cat do this?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a cat purring
- two cats' greeting trills
- a cat sniffing
- kittens meowing
- someone shifting on a sofa

Only the music is synthesized.

## Files

- `output/why-cats-show-you-their-butt.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-show-you-their-butt-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (98 words, 189 wpm, 31.1 s of voice)

> When your cat sticks its butt in your face, it's being polite. A tail straight up means hello. When two friendly cats meet, they touch noses, then circle around and sniff each other's rear. Glands back there give off a scent that works like an ID card, unique to each cat. Lifting the tail is holding out the ID. Kittens do it for their mother, too. When your cat turns around and shows you its butt, it's greeting you like family. You're just not expected to sniff back. So next time it happens, don't take it personally, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | When your cat sticks its butt in your face, it's being polite. | Your view from the sofa: the cat on the seat, back to you, tail up, looking back at you | Purring (Freesound 502051), a trill (850104), a quiet room (BSB 2387) |
| 3.44 | A tail straight up means hello. | It walks across the rug, tail high, the tip curled; "TAIL UP = HELLO" | A trill (668825) |
| 5.71 | When two friendly cats meet, they touch noses, | A ginger cat and a silver tabby walk up and touch noses | A trill, sniffing (848385) |
| 8.12 | then circle around and sniff each other's rear. | From above: the two cats circle, each sniffing the other's rear | Sniffing |
| 11.42 | Glands back there give off a scent that works like an ID card, unique to each cat. | Glowing scent rises from under the tail and becomes a "SCENT ID" card; a second cat's card is different; "UNIQUE TO EACH CAT" | The room |
| 16.57 | Lifting the tail is holding out the ID. | The tail goes up and the card comes forward | The room |
| 19.57 | Kittens do it for their mother, too. | Two kittens trot up to their mother, tails high | Kittens (149191) |
| 21.76 | When your cat turns around and shows you its butt, it's greeting you like family. | On the sofa, it turns its back to you, tail up; "LIKE FAMILY" | A trill, purring |
| 26.05 | You're just not expected to sniff back. | You lean away | Someone shifting on a sofa (664930) |
| 28.08 | So next time it happens, don't take it personally, because | Back to the opening frame (the loop) | Purring |

## Sources to check before publishing

- **Tail up means hello.** Cameron-Beaumont (1997, PhD thesis, University of Southampton) found that cats approached a tail-up cat silhouette more readily than a tail-down one. The tail-up signal is described as friendly and affiliative in John Bradshaw's *Cat Sense* (2013) and other cat-behaviour texts.
- **The greeting.** Friendly cats typically touch noses, then sniff the head, flanks and anogenital region. This is standard cat ethology (Bradshaw, *Cat Sense*; Leyhausen, *Cat Behavior*, 1979).
- **The glands.** Cats have anal sacs whose secretions carry an individual odour. Chemical studies of cat anal-sac secretions report profiles that differ between individuals, and research on their bacteria (for example the 2023 UC Davis study) links the scent to microbes. "Works like an ID card" is the usual simplification.
- **Kittens.** Mother cats lick their kittens' rear to stimulate them, and kittens raise their tails to their mother. Raising the tail to people is usually explained as the same greeting carried into adulthood.

## How it was made

`src/cat-butt-hello.js` is the exact single file that rendered the video. The pieces are also saved separately in `src/parts/`:

- `real-cat-rig.js`: loads the rigged cat, refits and re-binds its mesh, and adds:
  - planted-foot gait and leg IK (with a ground height for the sofa seat)
  - head look-at and tail controls
  - shell fur, eyes and whiskers
  - coat repainting (the silver tabby) and kitten proportions
- `living-room-and-id-cards.js`: the room and sofa, the four cats (ginger, silver, two kittens) and the holographic scent-ID card.
- `cat-short-helpers.js`: shared helpers for the cat shorts (light rigs, a surface ray-cast, glowing particles).
- `shots.js`: the 10 shots. One cat is re-parented into whichever shot is drawing. The first and last shots share the loop frame.
- `real-assets.js`, `shot-helpers.js`, `scene-helpers.js`, `rig-and-materials.js`, `render-pipeline.js`, `cat-scans.js` and `head-and-cues.js` are shared with the earlier shorts.

## Assets and rights

- **3D cat (CC BY 4.0, attribution required):** "3d modelling my cat: Fripouille" by guillaume bolis (sketchfab.com/guillaume.bolis.neko). Put the credit line from `upload/UPLOAD.md` in the description.
  - Downloaded through the Objaverse dataset (allenai/objaverse on Hugging Face).
  - Changed: refitted, re-rigged and posed, fur and eyes added, recoloured as a silver tabby, and scaled as kittens.
- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "When" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound:**
    - 502051 "Cat Purring.wav" (shelbyshark)
    - 850104 "Cat trills shortly (calm/quiet)" (CatPhony)
    - 668825 "Cat trill 4" (MBPL)
    - 848385 "Adult Cat Sniffing" (RavenWolfProds)
    - 149191 "kittens meowing" (videog)
    - 664930 "getting up off sofa.wav" (vestibule-door)
  - **From BigSoundBank (Joseph Sardin):** a quiet room's tone (2387).
- **HDR, models and texture:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them and the cat model.
- **Music:** synthesized in `audio/mix_butt.py` (16 bars).
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings and assets
2. regenerates the voice
3. renders 934 frames: one to two hours on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
