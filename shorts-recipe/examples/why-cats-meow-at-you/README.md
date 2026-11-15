# Why Cats Meow At You 😺

A 31.8-second vertical short (19 shots) built to the recipe in `../../index.html`. It stays with the orange tabby from the earlier cat shorts and follows the playbook's engagement section:

- **Hook.** Frame one is your point of view in bed at dawn: the cat stands on your chest, the empty bowl dropped by your face, and meows straight into the lens.
- **Seamless loop.** The script ends on an unfinished clause that the first line completes: "…So at five in the morning, when the bowl is empty, → your cat meows at you, but almost never at other cats." The last shot ends on the first frame (the cat has just dropped the bowl and looks up), and the dawn birdsong is laid across the cut, so nothing jumps. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone whose cat yells at 5 a.m."
- **Comment trigger** in the pinned comment: "What time does your cat start meowing at you?" (see `upload/UPLOAD.md`).

**New in this one: every sound effect is a real recording.** The meows are real cats, the kitten is a real three-week-old kitten, and the purrs are real purrs. The door, the kibble, the alarm clock, the baby, the birds and the crickets are all real too. Each cat's mouth is driven by the loudness curve of the exact recording it "says", so the jaw opens and closes with the sound.

## Files

- `output/why-cats-meow-at-you.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-meow-at-you-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (100 words, 189 wpm, 31.8 s of voice)

> Your cat meows at you, but almost never at other cats. Kittens meow when they're cold or hungry, so their mother comes running. Adult cats grow out of it and talk with scent and body language instead. Except with us. Humans kept answering, so cats kept the kitten voice. And they tuned it. In one study, cats begging for food hid a cry inside their purr, near the pitch of a crying baby, and people found it hard to ignore. Every cat learns which meows work on its human. So at five in the morning, when the bowl is empty,

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your cat meows at you, | Your POV in bed at dawn: the cat on your chest, the bowl by your face, meowing into the lens | Meow (1898), dawn birds (0999) |
| 1.36 | but almost never at other cats. | Garden at dusk: two cats touch noses. The music drops out | Crickets (1020) |
| 3.58 | Kittens meow when they're cold or hungry, | A kitten alone in a basket at night, shivering and mewing | Three-week-old kitten (0390) |
| 6.08 | so their mother comes running. | The mother runs across the floor (tracked from the side), chirps and nuzzles it | Soft steps (0373), chirp (1899), purr (0436) |
| 7.98 | Adult cats grow out of it | Morning: the kitten grows into the tabby in one bounce; its eyes turn from blue to green | Whoosh (1796) |
| 9.46 | and talk with scent | The cat walks toward us rubbing its cheek along a fence post, leaving a golden shimmer | Fur on wood (1104) |
| 10.44 | and body language instead. | Tail up in a question mark, then a slow blink | Crickets (1020) |
| 12.39 | Except with us. | From your height: the cat looks up and meows. Silence apart from the meow | Meow (1902) |
| 13.68 | Humans kept answering, | The owner kneels and pours kibble into the bowl | Bag (1431), kibble (2071) |
| 14.74 | so cats kept the kitten voice. | The cat meows; its shadow on the wall is a kitten, meowing with it | High meow (1896) |
| 16.93 | And they tuned it. | A paw turns the dial of an old radio | Radio sweep (2617) |
| 18.07 | In one study, cats begging for food | Sound lab: the cat purrs at a microphone while a scientist holds the bowl out of reach | Purr (0981) |
| 20.32 | hid a cry inside their purr, | The spectrogram: a cry, camouflaged in the orange purr, lights up blue | Purr, faint 480 Hz mew inside it (0098) |
| 22.30 | near the pitch of a crying baby, | A baby-cry track slides in; the two lines match: "SAME PITCH" | Baby crying (0881) |
| 23.80 | and people found it hard to ignore. | The owner in bed, pillow over her face; the smug cat purrs on top of her; she gives up | Cloth (0013), sigh (1405) |
| 26.35 | Every cat learns | A little chirp at a closed door; the door opens | Chirp (1899), door (1702) |
| 27.60 | which meows work on its human. | One meow, and the laptop snaps shut | Typing (1726), meow (1891), lid (0053) |
| 29.55 | So at five in the morning, | The alarm clock ticks over to 5:00; two eyes glow behind it | Clock (1372) |
| 30.66 | when the bowl is empty, | Back to your POV: the cat drops the bowl on your chest and looks up (loop) | Cloth thump (0013), ceramic knock (0246) |

## Sources to check before publishing

- **Adult cats rarely meow at each other; the meow is mostly for people.** Bradshaw & Cameron-Beaumont, "The signalling repertoire of the domestic cat and its undomesticated relatives", in *The Domestic Cat: The Biology of its Behaviour* (2000); Bradshaw, *Cat Sense* (2013). Feral cats meow much less than pet cats (Yeon et al. 2011, *Behavioural Processes* 87). "Almost never" is the popular phrasing; "rarely" is the careful one.
- **Kittens call their mother when cold, hungry or stuck.** Kitten distress calls bring the mother (Haskins 1977, *Journal of Comparative and Physiological Psychology* 91).
- **"Cats kept the kitten voice" and "tuned it".** This is the leading explanation (the meow is a kitten call that cats keep using because people respond), not a single measured result. Domestic cats' meows are shorter, higher and rated more pleasant by people than those of their wild ancestor, the African wildcat (Nicastro 2004, *Journal of Comparative Psychology* 118).
- **The study.** McComb, Taylor, Wilson & Charlton (2009), "The cry embedded within the purr", *Current Biology* 19(13). Cats soliciting food add a high voiced component to the purr (about 220 to 520 Hz), similar in frequency to a human baby's cry. People, including non-owners, rated these purrs as more urgent and less pleasant than ordinary purrs.
- **"Every cat learns which meows work".** This is the standard behaviourist explanation (meows that get a response are repeated). Studies show owners classify their cat's meows somewhat better than strangers do, but the learning itself hasn't been measured directly.

## How it was made

All the code is in `src/cat-meow.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `cat.js`: the cat rig from the earlier short with three additions:
  - **A jaw.** The chin swings down and back to reveal the mouth, tongue and two little fangs. Every meow in the film opens it with the loudness curve of the real recording (`mouth-envelopes.js`), shifted two frames early, as animators do.
  - **An age control.** One value takes the same rig from kitten to adult: bigger head and ears, blue eyes turning green.
  - **A shadow-only mode.** It turns a rig into an invisible shadow caster, used for the kitten shadow on the wall.
- `sets.js`: the bedroom at dawn (a duvet shaped by the sleeper's body underneath, an upholstered headboard, a nightstand with a twin-bell alarm clock and a salt lamp), the kitten's basket at night and in the morning, the shadow wall, a vintage radio with a working dial, a sound lab with a microphone and a portrait monitor that draws a live spectrogram, a hallway door, the kibble bag and pour, and the bowls.
- `shots.js`: the 19 shots. Shots 0 and 18 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- `living-room-and-garden.js`, `rig-and-materials.js`, `props.js`, `render-pipeline.js`: shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut after "empty," (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number. Each one is at `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`, and its page is listed at `https://bigsoundbank.com/search?q=<name>`. `build.sh` downloads them.
- **Music:** synthesized in `audio/mix_cat_meow.py` (16 bars). It runs pizzicato tiptoes at the start, drops out for "almost never", plays a celesta for the lonely kitten, warms up for the mother, turns into a bouncy marimba, stops for "Except with us" and the radio, pulses in the lab and thins to the ticking clock at the end.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 954 frames (about 1 hour 45 minutes on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
