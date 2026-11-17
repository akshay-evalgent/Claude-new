# Why Cats Sleep 16 Hours A Day 😴

A 34-second vertical short (14 shots) built to the recipe in `../../index.html`, with the orange tabby from the earlier cat shorts, asleep at the foot of your bed. It follows the playbook's engagement section:

- **Hook.** Frame one is the cat fast asleep on your bed, cheek on the duvet, while a 24-hour dial fills to 16h.
- **Seamless loop.** The script ends on a word that the first line completes: "…don't wake it, because → your cat sleeps up to sixteen hours a day, and it's not being lazy." The last shot and the first shot are the same sleeping cat, on the same frame. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone who sleeps like a cat". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: what time does your cat start the zoomies?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0): a real cat purring in its sleep, morning birds, crickets and night insects in the garden, running in tall grass, a real dog panting, real mice, a tawny owl and a ticking clock at night, a rooster at dawn, evening birds at dusk, a fly buzzing and a click for the ears. Only the music is synthesized.

## Files

- `output/why-cats-sleep-16-hours-a-day.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-sleep-16-hours-a-day-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (108 words, 188 wpm, 34.4 s of voice)

> Your cat sleeps up to sixteen hours a day, and it's not being lazy. Cats are ambush hunters. They don't chase prey for miles. They wait, then explode into a few seconds of full-speed sprinting, and that burns a lot of energy. So they nap to save it. They're not really night animals, either. They're built for dawn and dusk, when mice are most active. That's why your cat gets the zoomies right before sunrise. Most of that sleep is light dozing, too. The ears keep turning toward every sound, ready to go. So if your cat is asleep on your bed right now, don't wake it, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your cat sleeps up to sixteen hours a day, | Asleep at the foot of your bed in the sun; a 24-hour dial fills to 16h | A sleeping purr (BSB 0981), morning birds (0222) |
| 2.54 | and it's not being lazy. | Close on the face: one eye opens, deadpan, and closes again | Fabric (1104) |
| 4.36 | Cats are ambush hunters. | Dusk in the garden: low in the grass, pupils wide, the tail tip twitching | Crickets and night insects (1470), wind in the grass (0908) |
| 6.19 | They don't chase prey for miles. | The dog thunders past after a ball; the cat just watches | Running in the grass (1843), a dog panting (1547), the ball (1839) |
| 8.14 | They wait, then explode into a few seconds of full-speed sprinting, | Still, a butt wiggle, then a full gallop after a mouse, speed lines | Grass (1024), a whoosh (1796), running in tall grass (1844), a real mouse (0459) |
| 11.80 | and that burns a lot of energy. | It flops down in the grass; an energy battery drains to red | A soft flop (1839) |
| 13.83 | So they nap to save it. | Back on the bed it lies down and dozes off; the battery charges back up; Zzz | The sleeping purr |
| 15.36 | They're not really night animals, either. | The bedroom at night, moonlight; you and the cat both fast asleep at 2am | A tawny owl (1763), a ticking clock (2816) |
| 17.65 | They're built for dawn and dusk, | The 24-hour dial: the sun goes round; dawn and dusk light up | A rooster at dawn (0283), evening birds at dusk (1859) |
| 19.32 | when mice are most active. | Mice scurry through the grass right in front of the cat | Real mice (0459) |
| 21.45 | That's why your cat gets the zoomies right before sunrise. | Dawn: the cat tears across the bed and the floor while you sleep | Paws drumming (1104, 1515) |
| 24.97 | Most of that sleep is light dozing, too. | A loaf with drooping lids, head nodding; a sleep line that's mostly LIGHT with a couple of dips to DEEP | The sleeping purr |
| 27.69 | The ears keep turning toward every sound, ready to go. | Asleep, but the ears swivel to a buzzing fly, then to a click on the other side | A fly (0822), a click (0321) |
| 31.18 | So if your cat is asleep on your bed right now, don't wake it, because | Asleep on your bed (loop) | The sleeping purr, birds |

## Sources to check before publishing

- **Up to 16 hours a day.** Adult cats are commonly reported to sleep about 12 to 16 hours a day (kittens and older cats more). See for example the Sleep Foundation and veterinary guides.
- **Ambush hunters, short bursts.** Cats hunt by stalking and pouncing rather than by long chases, and depend on short, fast sprints; long sleep is widely explained as conserving energy for those bursts. This is the standard explanation, not a measured energy budget.
- **Dawn and dusk.** Cats are crepuscular, most active around dawn and dusk, which matches the activity of many of their prey (small rodents). "Zoomies right before sunrise" is a common owner observation consistent with that rhythm.
- **Light dozing, ears on alert.** Most of a cat's sleep is light (non-REM) dozing, with a smaller share of deep sleep; sources vary on the exact split (a figure of about a quarter deep sleep is often quoted), so the video says "most". The sleep line on screen is an illustration, not data.

## How it was made

All the code is in `src/cat-sleep.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `sleep-sets.js`:
  - **Sleeping on its side.** Cheek on the duvet, paws tucked, the tail curled around. It can lie down from a loaf, and open just the upper eye for a side-eye.
  - **The gallop.** A bounding gait for the sprint and the zoomies.
  - **The bedroom, re-lit.** The bedroom from the cat-meow short, lit for a sunny day, moonlit night and dawn.
  - **Overlays.** The 24-hour dial with the sun, dawn and dusk; an energy battery; Zzz; sound rings, a buzzing fly and speed lines.
- `shots.js`: the 14 shots. Shots 0 and 13 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- The other parts are shared with the earlier shorts: the cat, the bedroom, the garden, the dog and its walk cycle, and the render pipeline.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Your" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_sleep.py` (16 bars): a celesta lullaby on the bed, sneaky pizzicato for the ambush and the night, a bouncy marimba for the sprint and the zoomies.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 1032 frames (several hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
