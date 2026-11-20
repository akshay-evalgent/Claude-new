# Why Your Stomach Growls 😳🔊

A 34-second vertical short (14 shots), the first in a **photoreal** style: real HDR lighting, scanned textures and real models (all CC0, from Poly Haven), wet-tissue anatomy in the style of a medical render, a lens with depth of field, motion blur and grain. It follows the playbook's engagement section:

- **Hook.** Frame one: a glass of water on an exam desk shivers with ripples as a real stomach growl breaks the silence. Caption: "That growl isn't your stomach begging for food."
- **Seamless loop.** The script ends on a word that the first line completes: "…relax, because → that growl isn't your stomach begging for food." The last shot pushes in over the student's shoulder to the glass and lands on the first frame; the roar at the end is the growl that ripples the water at the start. The music is exactly 16 bars, and it stays silent in the exam hall so the growl lands in real quiet.
- **Share prompt on screen** for the last quarter: "Send this to someone whose stomach growls in exams". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: has your stomach ever growled in a silent exam?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0): five different recordings of real stomach gurgling, the room tone of a quiet room, a ticking clock, a page, a pen and a cough in the hall, real gurgling drains and dripping water for the old pipes, an apple crunch, a heartbeat, and a portable vascular Doppler (the real whoosh of blood flow). Only the music is synthesized.

## Files

- `output/why-your-stomach-growls.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-your-stomach-growls-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (102 words, 178 wpm, 34.3 s of voice)

> That growl isn't your stomach begging for food. It's your gut cleaning house. When your stomach's been empty for a while, about every hour and a half, a powerful wave of muscle squeezes through it and down your intestines, sweeping out leftover scraps. With no food inside, that wave pushes only gas and liquid, so the bubbles squeeze through the tubes and echo, like water in old pipes. Doctors call it borborygmi. It happens after meals too, but food muffles the sound. And hunger hormones can set the wave off early. So next time it roars in a silent room, relax, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | That growl isn't your stomach begging for food. | An exam hall in silence; a glass of water on a desk ripples with each growl | Stomach gurgling (BSB 3177, 1280), room tone (2387), a clock (1372), a page (2212), a cough (2183) |
| 3.06 | It's your gut cleaning house. | The whole gut in a dark studio: stomach, coiled small intestine, colon; a ring of muscle starts to squeeze | Gurgles (3176, 1281), blood flow underneath (Doppler, 2500) |
| 5.08 | When your stomach's been empty for a while, | Inside the empty stomach: wet folds, strands of mucus | A hollow gurgle with its echo (3177), a drip (1384) |
| 7.32 | about every hour and a half, | A wall clock; ninety minutes pass in a second and a half ("+1 h 30 min") | A real clock tick, faster and faster (1069) |
| 8.86 | a powerful wave of muscle squeezes through it | Close on the stomach: the ring of muscle travels down it | A long gurgle (3177), a drain slurp (1027) |
| 11.46 | and down your intestines, | The squeeze runs on into the coils, the camera riding along | Gurgles panning with it (3178, 1280) |
| 13.22 | sweeping out leftover scraps. | Inside the small intestine: ring folds and villi; the squeeze closes in and pushes crumbs away | A drain slurp (1029), bubbles (0150) |
| 15.61 | With no food inside, that wave pushes only gas and liquid, | A cut-away length of intestine: gas bubbles and fluid pushed ahead of the squeeze; "GAS", "LIQUID" | A liquid gurgle (1027, 1028), bubbles (0150) |
| 18.92 | so the bubbles squeeze through the tubes and echo, | A big bubble forces through a narrow ring; the wall ripples | A gurgle (1281); another with its echo (3176) |
| 21.28 | like water in old pipes. | Old cast-iron pipes on a basement wall, a valve wheel, water dripping from a flange | Real gurgling drains (1028, 1026), drops (1384) |
| 23.30 | Doctors call it borborygmi. | A stethoscope on a belly; "BORBORYGMI (bor · bo · RIG · mee)" | A gurgle as heard through the tubing (1280, 3178, filtered) |
| 25.23 | It happens after meals too, but food muffles the sound. | A cut-away stomach full of food; a bubble works its way up through it | An apple crunch (1113), a smothered gurgle (3177) |
| 28.50 | And hunger hormones can set the wave off early. | Glowing hormone particles stream to the stomach; a squeeze starts early; "HUNGER HORMONES" | Doppler blood flow (2500), a heartbeat (0218), a gurgle (3178) |
| 31.18 | So next time it roars in a silent room, relax, because | Back in the hall: a slow push over the rows to the glass; neighbours glance over at the roar (loop) | A chair (0666), a page (2212), the roar (1281, 3178) |

## Sources to check before publishing

- **The "housekeeping" wave.** Between meals, the gut runs the migrating motor complex: a cycle that recurs roughly every 90 to 120 minutes and ends in a burst of strong contractions that sweeps from the stomach down the small intestine, clearing leftover debris (often called the gut's "housekeeper"). Deloose et al. (2012), "The migrating motor complex: control mechanisms and its role in health and disease", *Nature Reviews Gastroenterology & Hepatology* 9: 271–285. Some sources give a wider range for the interval; "about every hour and a half" is the common figure.
- **Why it's loud when empty.** The rumbling (borborygmi) is gas and fluid being pushed through the stomach and intestines. With little food inside, there's less to dampen the sound.
- **After meals.** The gut keeps moving while it digests, so it makes noise then too, but the food muffles it.
- **Hunger hormones.** Tack et al. (2006), "Influence of ghrelin on interdigestive gastrointestinal motility in humans", *Gut* 55: 327–333: ghrelin set off the strong phase early (about 12 minutes after the infusion, against about 95 with saline). A later study from the same group (Tack et al. 2016, *Gut*) found that motilin, another gut hormone, brought on an early phase and hunger. The script says "hunger hormones" to cover both.
- **Borborygmi.** The medical name for these rumbling sounds (from the Greek, itself an imitation of the sound); pronounced bor-bo-RIG-mee.

## How it was made

All the code is in `src/stomach-growls.js` (one file). The pieces are also saved separately in `src/parts/`:

- `real-assets.js`: loads the Poly Haven HDR environments (an exam hall, a surgery, an industrial basement and a photo studio), models (a school desk and chair, a wall clock with its own hands, pencils, notepads, industrial pipes) and scanned textures (knitted fleece, plaster, a laminate floor). `fetch_assets.py` downloads them.
- `hall-clock-pipes-stethoscope-sets.js`:
  - **The exam hall.** Projected onto the floor from the hall's own HDR photo, with real desks and chairs in rows and seated students in knit sweaters.
  - **The glass of water.** A reflective glass, with water that refracts the desk and a surface that ripples in rings.
  - **The other sets.** A clock wall with window light, old cast-iron plumbing, and a stethoscope on a belly with a navel and pores.
- `anatomy.js`:
  - **Wet tissue.** Procedural textures with blood vessels and muscle fibre (stomach, colon), the lining's pits and the velvety villi, with a wet clear coat.
  - **The organs.** Deformable tubes for the stomach, the packed small intestine and the colon with its pouches.
  - **The squeeze.** A ring that travels along the gut, darkening the muscle where it tightens.
  - **Inside views.** The empty stomach, the small intestine, a cut-away with gas and fluid, and a stomach full of food.
- `shots.js`: the 14 shots. The first and last shots share one camera path and one ripple timeline, measured from the loop point, so the last frame flows into the first.
- `rig-and-materials.js`, `render-pipeline.js` and `head-cues-and-helpers.js` are shared with the earlier shorts. The render pipeline does anti-aliasing, soft shadows, motion blur, depth of field, bloom, lens fringe and film grain.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "That" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **HDRs, models and textures:** Poly Haven (polyhaven.com), CC0 (public domain, no credit required). `src/fetch_assets.py` downloads them; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_stomach.py` (16 bars): a curious marimba for the gut, a warm celesta for the pipes and the doctor, silence in the exam hall.
- **Visuals:** three.js scenes, original. The anatomy is procedural.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings and the Poly Haven assets, regenerates the voice, renders 1029 frames (a few hours on 4 CPU cores with software WebGL; add `?sub=1` for a fast draft), mixes and masters the audio, and encodes both versions.
