# Why Cats Show You Their Belly 🪤😺

A 34-second vertical short (15 shots) built to the recipe in `../../index.html`, with the orange tabby from the earlier cat shorts, now with a fluffy cream belly. It follows the playbook's engagement section:

- **Hook.** Frame one is the cat rolling onto its back right in front of you: belly up, paws curled, looking at you upside down. Every cat owner knows what happens next.
- **Seamless loop.** The script ends on a word that the first line completes: "…just say thanks, because → when your cat rolls over and shows you its belly, it's not asking for a rub." The last shot (the cat flopping over in front of you) runs straight into the first (it finishes rolling onto its back), on the same frame. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone who still falls for the belly trap". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: how many times have you fallen for the belly trap?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0): real purring, real growls and an angry yowl, a chirp, a real heartbeat for the x-ray, a body falling for the flop, fabric and cloth for the rolling and grabbing, and fingers in fur for the chin scratch. Only the music is synthesized.

## Files

- `output/why-cats-show-you-their-belly.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-show-you-their-belly-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (110 words, 194 wpm, 34.0 s of voice)

> When your cat rolls over and shows you its belly, it's not asking for a rub. It's telling you it feels safe. The belly holds all the soft, important organs, with no ribs to protect them, so a cat only shows it to someone it trusts. But touch it, and an old reflex kicks in. The front paws grab, the claws come out, and the back legs kick like a rabbit. On its back, a cat can fight with all four paws at once. So it's not a trap. It's a compliment. Scratch its chin instead. And if it flops over in front of you again, just say thanks, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | When your cat rolls over and shows you its belly, | The cat finishes rolling onto its back: belly up, paws curled, looking at you upside down | Purring (BSB 0981), fabric (1104), birds outside (1859) |
| 2.78 | it's not asking for a rub. | Your hand drifts toward the belly; the cat's eyes lock on, its ears turn, the tail tip flicks | Fabric |
| 4.86 | It's telling you it feels safe. | Close on the upside-down face: a slow blink, purr rings, hearts | Purring up close (1010) |
| 6.93 | The belly holds all the soft, important organs, | X-ray: the heart, liver, stomach and intestines light up one by one | A real heartbeat (0218), a whoosh (1796) |
| 9.84 | with no ribs to protect them, | The ribs glow around the chest only; a dashed line flashes around the open belly | Heartbeat |
| 11.50 | so a cat only shows it to someone it trusts. | Between a visitor and you, the cat eyes the visitor, then turns and flops over toward you | A body fall for the flop (2453), fabric |
| 14.50 | But touch it, and an old reflex kicks in. | Your hand lands on the belly: pupils blow wide, ears flatten, a red pulse | Cloth (0013), a real growl (1885), a whoosh (1795) |
| 17.38 | The front paws grab, | The front legs clamp around your forearm | Cloth, a growl (1886) |
| 18.82 | the claws come out, | Close on the paw: the claws slide out against your arm | Cloth catching (0013) |
| 19.84 | and the back legs kick like a rabbit. | The bunny kicks: the hind legs rake your arm, tufts of fur fly | Fabric scuffs (1104), a low growl (1887) |
| 22.41 | On its back, a cat can fight with all four paws at once. | All four paws up, claws out; four rings count them; a hiss | An angry yowl (1882, 1884) |
| 25.74 | So it's not a trap. | A red TRAP sign pops up over the cat and gets crossed out | Purring |
| 27.10 | It's a compliment. | A slow blink right at you; hearts | A chirp (1899) |
| 28.47 | Scratch its chin instead. | Your fingers under its chin; it stretches its head up, eyes shut, purring | Fingers in fur (0663), purring (1010) |
| 30.59 | And if it flops over in front of you again, just say thanks, because | It flops onto its side in front of you and starts to roll over (loop) | A body fall (2452), fabric, purring |

## Sources to check before publishing

- **Showing the belly is trust, not a request.** Cat-behaviour organisations (for example International Cat Care's guides to cat body language, and the American Association of Feline Practitioners' behaviour guidelines) describe a cat rolling over and exposing its belly as a relaxed, trusting display, often a greeting, and warn that it isn't an invitation to rub the belly. Many cats react defensively when it's touched.
- **No ribs over the belly.** Basic anatomy: the rib cage protects the chest (heart and lungs); the abdomen behind it (liver, stomach, intestines) has only muscle and skin over it. The x-ray in the video is an illustration, not to scale.
- **The grab, the claws and the "bunny kicks".** Clasping with the front paws while raking with the hind legs is the classic defensive (and play-fighting) move of a cat on its back, widely described by behaviourists; lying on its back lets a cat use all four sets of claws at once.
- **"It's a compliment."** That's the plain-language reading of the trust display, not a measured result.

## How it was made

All the code is in `src/cat-belly.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `belly-sets.js`:
  - **The belly.** A cream, extra-fluffy belly on the underside of the tabby's body, riding on the torso so it follows every pose.
  - **The roll.** Lying with the body rolled about its own length: crouched, on its side, belly up. The legs relax into the air and the tail lies along the floor.
  - **The x-ray.** A spine, ribs around the chest only, and soft glowing organs in the belly, with a dashed outline for the unprotected part.
  - **The rest.** The alert pulse, the crossed-out TRAP sign, the four paw counters, tufts of fur and you kneeling beside the cat.
- `shots.js`: the 15 shots. Every frame is posed from scratch in a fixed order (you, then the cat, then anything that depends on both), so frames can render in any order. Shots 0 and 14 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- The other parts are shared with the earlier shorts: the cat, the living room, the claws from the kneading short and the render pipeline.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.87, cut just before the repeated "When" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_belly.py` (16 bars): a warm celesta while the cat relaxes, a marimba pulse for the x-ray, and sneaky pizzicato from the touch to the fight.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 1020 frames (several hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
