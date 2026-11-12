# Why Do Cats Purr 🤔

A 34-second vertical short (19 shots) built to the recipe in `../../index.html`. It follows the mechanism format: a cold-open hook ("The moment you scratch behind its ears…"), a "but" reversal at 3.3 s, a "You see" pivot at 16% of the runtime, a three-beat montage, an x-ray explainer, a "But when…" second twist, and a deadpan payoff.

## Files

- `output/cat-purr.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/cat-purr-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings (see `upload/UPLOAD.md`)

## Script (107 words, 192 wpm, 33.9 s of voice)

> The moment you scratch behind its ears, your cat starts to purr, but that doesn't always mean it's happy. You see, cats also purr when they're scared, hurt, or even giving birth. The sound comes from the voice box, where the vocal folds vibrate up to 150 times a second as the cat breathes in and out. Some scientists think these low vibrations might even help bones heal. But when your cat is hungry, it hides a high-pitched cry inside the purr, at a similar pitch to a crying baby. Which means every morning, your cat has been fake crying like a baby just to get fed.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | The moment you scratch behind its ears | Close-up: a hand scratches behind the ear and the cat's eyes slowly close | Cold open |
| 2.06 | your cat starts to purr | Wide: the cat loafs on a cushion; purr rings start pulsing from its throat | Hard cut |
| 3.30 | but that doesn't always mean it's happy | Cat sits under a red heart that cracks into a grey broken heart on "mean" | Card swing |
| 5.48 | You see, cats also purr when they're scared | Dark room in a thunderstorm: ears back, pupils wide, lightning on "scared" | Whip pan |
| 8.14 | hurt | Vet table: cone collar and bandaged paw, still purring | Hard cut |
| 8.96 | or even giving birth | Mother cat with three newborn kittens | Hard cut |
| 10.04 | The sound comes from the voice box | X-ray cat: skeleton, airway, lungs; the voice box lights up on "voice box" | Push-through flash |
| 12.18 | where the vocal folds vibrate up to 150… | Close-up of the vocal folds flapping, with a "150× A SECOND" label | Hard cut |
| 14.42 | times a second | Pull back from the voice box | Hard cut |
| 16.14 | as the cat breathes in and out | Wide x-ray: lungs swell and air particles flow in and out | Hard cut |
| 17.66 | Some scientists think these low vibrations | X-ray leg with a cracked bone glowing red; vibration rings travel down the leg | Dissolve |
| 20.24 | might even help bones heal | Close-up: the crack closes and the glow turns from red to cyan | Hard cut |
| 22.32 | But when your cat is hungry | Kitchen: the cat looks up at its owner beside an empty bowl | Card swing |
| 23.94 | it hides a high-pitched cry | A purr waveform appears above its head; a pink "cry" wave rides on top | Hard cut |
| 25.40 | inside the purr | Close-up on the two waves | Hard cut |
| 26.84 | at a similar pitch to a crying baby | A baby cries in a crib; the cat's pink wave slides down onto the baby's and matches it | Whip pan |
| 29.14 | Which means every morning, your cat has been | The cat in a pink baby bonnet with a pacifier; the owner brings the food bag | Hard cut |
| 31.26 | fake crying like a baby just to get fed. | Smug close-up as kibble pours into the bowl; hard stop | Hard cut |

## Sources to check before publishing

- **Purring when stressed, hurt or giving birth:** widely documented in veterinary literature. Purring isn't only a sign of contentment.
- **How the purr is made:** Remmers & Gautier (1972) described the voice-box muscles twitching to drive the purr. Herbst et al. (2023, *Current Biology*) showed cat vocal folds can vibrate at purring frequencies without that muscle input. The script says the vocal folds vibrate, which fits both views.
- **Frequency:** purrs typically fall around 25–150 Hz. von Muggenthaler (2001, Acoustical Society of America) proposed these frequencies may aid bone and tissue healing. This is a hypothesis, so the script says "some scientists think… might".
- **The hidden cry:** McComb, Taylor, Wilson & Charlton (2009, *Current Biology*), "The cry embedded within the purr". Cats asking for food add a high-frequency voiced component to the purr, similar in pitch to a crying infant, and people rate those purrs as more urgent.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.96. It's the same voice as the fingers short, so the channel stays consistent.
- **Music and sound effects:** synthesized in `audio/mix_cats.py`, including the purr (about 26 Hz pulses that follow a breathing cycle), mews, thunder, the baby cry and kibble clicks. There are no samples.
- **Visuals:** procedural three.js in `src/cats.js`. The cat is built from code: tabby fur texture, eyelids, ears that flatten, whiskers and a tail.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,034 frames (about 30 minutes on 4 CPU cores with software WebGL), mixes and masters the audio, and encodes both versions.
