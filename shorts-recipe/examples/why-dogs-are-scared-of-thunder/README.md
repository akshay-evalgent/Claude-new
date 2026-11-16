# Why Dogs Are Scared Of Thunder ⛈️🐶

A 32.2-second vertical short (15 shots) built to the recipe in `../../index.html`, with the golden retriever from "Why Dogs Tilt Their Heads". It follows the playbook's engagement section:

- **Hook.** Frame one is your point of view on the sofa in a storm: the dog pressed against you, ears flat, eyes on you. Lightning flashes in the first fifth of a second.
- **Seamless loop.** The script ends on a word that the first line completes: "…hold them close, because → your dog isn't being dramatic about thunder." The last shot ends on the first frame (same camera, same pose), a low rumble rolls across the cut, and the rain is one continuous loop. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone whose dog hides during storms". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: where does your dog hide during storms?" Everyone has a spot to name (see `upload/UPLOAD.md`).

As in the cat-meow and head-tilt shorts, **every sound effect is a real recording** (CC0): real thunder (eight different claps and rumbles), rain on glass, wind, real dog whimpers, whines, panting and a sniff, a real electric shock for the static zap, a bathtub drain, a balloon burst, a ticking clock and creaking floorboards. Only the music is synthesized.

## Files

- `output/why-dogs-are-scared-of-thunder.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-dogs-are-scared-of-thunder-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (104 words, 194 wpm, 32.2 s of voice)

> Your dog isn't being dramatic about thunder. About one in three dogs is afraid of loud noises, and storms hit them with more than noise. Some dogs start pacing before you hear a thing. They may feel the air pressure drop. One theory: storms also charge the air, so static builds up in their fur and gives them tiny shocks. That might be why some dogs hide in the bathtub, right next to the pipes. And comforting them won't make the fear worse. Vets call that a myth. So when the sky rumbles and they squeeze in next to you, hold them close, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your dog isn't being dramatic about thunder. | Your POV on the sofa in a storm: the dog pressed against you, ears flat, flinching at each flash; your arm around it | Thunder (3180, 3115), whimpers (1544, 1545), rain on glass (1295), wind (1714) |
| 2.54 | About one in three dogs is afraid of loud noises, | Three dogs in a row. A boom: two look at the window, the golden one ducks. A ring fills to "1 in 3" | Thunder (3179), whimper |
| 5.40 | and storms hit them with more than noise. | At the window: rain streaming down the glass, a fork of lightning, the dog flinches | Thunder (2718, 3184) |
| 8.21 | Some dogs start pacing before you hear a thing. | A quiet evening before the storm: you read, the dog paces, panting, tail tucked | Clock (0007), floorboards (3051), panting (1547) |
| 10.95 | They may feel the air pressure drop. | A barometer's needle swings from FAIR to STORMY; cut to the dog, ears twitching, sniffing the air | Sniff (1547) |
| 13.00 | One theory: storms also charge the air, | A storm cloud fills with + and − charges; + charges gather on the ground; a bolt jumps between them | Rumble (3116), thunder (3113), heavy rain (0740) |
| 15.42 | so static builds up in their fur | The fur lifts and tiny blue sparks crawl over it | Electric crackles (0134), distant rumble (3181) |
| 17.10 | and gives them tiny shocks. | Nose to a steel bowl: ZAP, a blue arc, the dog jerks back | Electric shock (0134), yelp (1544) |
| 19.16 | That might be why some dogs hide in the bathtub, | The dog peeking over the rim of the bathtub, trembling | Thunder muffled through the wall (3180), whine (1546) |
| 21.94 | right next to the pipes. | X-ray of the tub: the charge drains off the dog, down the drain and the pipe | Bathtub drain (0439) |
| 23.64 | And comforting them won't make the fear worse. | You kneel by the tub and stroke its head; the ears relax, the trembling slows | Cloth (0013) |
| 26.39 | Vets call that a myth. | "Comforting makes it WORSE" pops; MYTH | Balloon burst (0551) |
| 27.98 | So when the sky rumbles | From outside in the rain: lightning lights the house; inside, you on the sofa | The biggest clap of the film (3184), rumble (3181) |
| 29.26 | and they squeeze in next to you, | The dog hops onto the sofa and wedges in beside you | Rumble (3114), cloth (0013), a small whine |
| 31.06 | hold them close, because | Back to your POV: your arm goes around the dog (loop) | A low rumble across the loop point (3116) |

## Sources to check before publishing

- **"About one in three dogs is afraid of loud noises."** Salonen et al. (2020), "Prevalence, comorbidity, and breed differences in canine anxiety in 13,700 Finnish pet dogs", *Scientific Reports* 10. Noise sensitivity was the most common anxiety-related trait, at 32%. Thunder and fireworks are the usual triggers.
- **Pacing before the storm / feeling the pressure drop.** Owners often report this, and the script says "may": it's a likely explanation (dogs can sense the wind, smell and pressure changes that come before a storm), not a measured result.
- **The static theory.** This comes from the veterinary behaviourist Nicholas Dodman (Tufts University), who suggested that storm-phobic dogs may get small static shocks from charged fur, and that this may explain why they seek out bathtubs, sinks and other places near grounded pipes. It's a hypothesis, which is why the script says "one theory" and "might be".
- **"Comforting won't make the fear worse."** This is the standard advice of veterinary behaviourists (for example the American Veterinary Society of Animal Behavior and the RSPCA): fear is an emotion, not a trick, so calmly comforting a frightened dog doesn't reward or strengthen it. Check the current wording on their sites if you want to quote them.

## How it was made

All the code is in `src/dog-thunder.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `storm-bathroom-and-static.js`:
  - **The storm:** lightning (a jagged bolt with branches and a flash curve with re-strikes), rain falling outside and raindrops sliding down the glass, trees swaying in the wind, and the living room re-lit for a stormy night.
  - **The bathroom and the static:** a tiled bathroom with a bathtub, a frosted window that flashes, a barometer, a storm cloud with glowing + and − charges, static sparks that crawl over the fur, and a crackling arc for the zap.
  - **New moves for the dog:** fur that stands on end, a tucked tail and a walk cycle.
- `shots.js`: the 15 shots, including a fear pose for the dog (ears pinned, worried brows, trembling, flinching at each flash). Shots 0 and 14 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- `dog.js`, `dog-sets-from-the-head-tilt-short.js`: the golden retriever and its props from "Why Dogs Tilt Their Heads".
- `rig-and-materials.js`, `props.js`, `living-room-and-garden.js`, `cat-and-sets-from-the-cat-shorts.js`, `render-pipeline.js`: shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Your" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_thunder.py` (16 bars):
  - a low, uneasy pulse in the storm;
  - sparse ticks for the quiet before it;
  - a marimba pulse for the science;
  - a minor celesta in the bathtub;
  - warm major chords for the comforting;
  - silence for the big thunderclap;
  - warm again for the ending.

  The music also ducks under the thunder.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 966 frames (about 1 hour 50 minutes on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
