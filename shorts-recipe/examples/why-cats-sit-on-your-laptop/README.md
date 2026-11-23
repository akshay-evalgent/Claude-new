# Why Cats Sit On Your Laptop 💻🐈

A 33-second vertical short (14 shots), made with three.js and real 3D cats instead of a cat built in code:
- **Real 3D scans of real cats.** A tabby stretched out asleep and a grey cat curled on its pillow are photogrammetry scans from Sketchfab (CC BY 4.0, downloaded through the Objaverse mirror on Hugging Face). The board or bed each cat was lying on is removed by colour and by plane on load.
- **A real cat model, rigged.** "Fripouille", a ginger-and-white cat modelled by its owner (CC BY 4.0). The file's mesh and skeleton disagree (an FBX unit mix-up), so on load the mesh is refitted onto the joints and re-bound. On top of that it gets:
  - legs placed by IK, with feet that stay planted on the ground (and step up onto the laptop)
  - a head that looks at things, and tail controls
  - shell fur, glossy eyes with slit pupils, and whiskers
- **Real rooms, furniture and textures** from Poly Haven (CC0):
  - a bedroom with a desk, a fireside, a lounge, a living room and the Goegap desert as HDR light and backgrounds
  - a desk lamp, an armchair and a plant
  - walnut, oak-floor and sand textures
- **A modern laptop built in code**, with a live screen (a document, letters pouring in, an eye-tracking heat map).
- **A thermal-camera look:** every surface has a temperature, mapped through an ironbow palette.
- A lens with depth of field, motion blur and grain.

It follows the playbook's engagement section:

- **Hook.** Frame one is a tabby fast asleep across an open laptop at night, with the caption "Your cat isn't sitting on your laptop".
- **Seamless loop.** The script ends on a word that the first line completes: "…don't push it off, because → your cat isn't sitting on your laptop to annoy you." The last shot's camera move ends on exactly the frame the video opens on. The music is exactly 16 bars, and the purring wraps around the loop point.
- **Share prompt on screen** in the last quarter: "Send this to someone whose cat sits on their keyboard". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: has your cat ever sent an email for you?" (see `upload/UPLOAD.md`).

**Every sound effect is a real recording** (CC0):
- a cat purring
- the camera shutter as the thermal view switches on
- a fireplace
- wind on an open desert plain
- a ticking clock and birds outside
- laptop typing and key presses under the cat's paws
- a cat's meow and a cat sniffing

Only the music is synthesized.

## Files

- `output/why-cats-sit-on-your-laptop.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-sit-on-your-laptop-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (103 words, 189 wpm, 32.6 s of voice)

> Your cat isn't sitting on your laptop to annoy you. It's sitting on a heater. A laptop runs as warm as your skin, and cats feel best at temperatures that would make you sweat. Their ancestors lived in the desert. That's why it steals your warm seat, and follows the sunbeam across the floor. There's a second reason. The laptop is where your eyes are all day. To your cat, it's the thing stealing your attention, so it sits right on it. And the keys smell like your hands. So next time your cat lies on your keyboard, don't push it off, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your cat isn't sitting on your laptop to annoy you. | A tabby (real scan) asleep across an open laptop on a walnut desk at night | Purring (Freesound 502051), a quiet room (BSB 2387) |
| 2.98 | It's sitting on a heater. | A scan line wipes the same view into thermal: the cat and the laptop glow | A camera shutter (271010) |
| 4.64 | A laptop runs as warm as your skin, | Thermal close-up of the laptop; the crosshair reads "35°C ≈ SKIN" | The room |
| 7.16 | and cats feel best at temperatures that would make you sweat. | The tabby stretched out by the fire; a thermometer: "CAT 30–38 °C", "YOU 20–25 °C" | A fireplace (444920), purring |
| 10.97 | Their ancestors lived in the desert. | A sandy wildcat walking over the dunes at Goegap; "AFRICAN WILDCAT" | Desert wind (697217) |
| 13.22 | That's why it steals your warm seat, | A grey cat (real scan) curled on its pillow in your armchair; a wipe to thermal shows the seat is still warm | Purring, a camera shutter |
| 15.18 | and follows the sunbeam across the floor. | Time-lapse: the window's patch of sun slides across the floor and the cat keeps jumping into it | A clock ticking fast (412751), birds (469289) |
| 17.94 | There's a second reason. | The empty desk, the laptop glowing | The room |
| 19.46 | The laptop is where your eyes are all day. | Your view of the screen: an eye-tracking heat map builds up as the clock races to night | Typing (466785) |
| 22.38 | To your cat, it's the thing stealing your attention, | Behind a ginger cat's ears: the laptop is a "RIVAL" | A meow (412017) |
| 24.86 | so it sits right on it. | The ginger cat walks onto the keyboard; "jjjjjjjj" pours onto the screen | Key presses (850586) |
| 26.74 | And the keys smell like your hands. | It sniffs the keys; your scent glows on the ones you use most | A cat sniffing (848385) |
| 28.52 | So next time your cat lies on your keyboard, don't push it off, because | Back to the tabby on the laptop (the loop) | Purring |

## Sources to check before publishing

- **Warmth.** Cats' thermoneutral zone, the range where they don't spend energy to keep warm or cool, is often given as about 30–38 °C (86–100 °F), well above a comfortable room for a clothed person (about 20–25 °C). See the National Research Council's *Nutrient Requirements of Dogs and Cats* (2006) and veterinary physiology texts. Exact figures vary by source and by cat.
- **The laptop.** Laptop surfaces typically run in the 30s °C under use; skin surface temperature is about 33–35 °C. "As warm as your skin" is an approximation.
- **Desert ancestors.** Domestic cats descend from the Near Eastern/African wildcat, *Felis lybica* (Driscoll et al., *Science*, 2007), a species of dry and semi-desert country.
- **Attention and scent.** That cats sit on laptops because that's where your attention is, and because the keys smell of you, is the standard explanation from behaviourists. It isn't a measured result, and the script presents it as "to your cat".

## How it was made

`src/cats-on-laptops.js` is the exact single file that rendered the video. The pieces are also saved separately in `src/parts/`:

- `real-cat-rig.js`: loads the rigged cat, refits and re-binds its mesh, and adds:
  - planted-foot gait, leg IK and a ground-height option (stepping onto the laptop)
  - head look-at and tail controls
  - shell fur, procedural eyes with an adjustable pupil, and whiskers
- `cat-scans.js`: loads a photogrammetry scan, removes what the cat lay on (by texture colour and by plane), keeps the largest piece and re-centres it.
- `props-and-sets.js`:
  - the modern laptop and its screen
  - the thermal-camera material and HUD
  - the desk, fireside, armchair, sunbeam and desert sets
- `shots.js`: the 14 shots, plus the comfort-zone thermometer and the scent prints. The first and last shots share the loop frame.
- `real-assets.js`, `shot-helpers.js`, `scene-helpers.js`, `rig-and-materials.js`, `render-pipeline.js` and `head-and-cues.js` are shared with the earlier shorts. The pipeline gains a scan-line wipe and a skinning-aware depth pass.

## Assets and rights

- **3D cats (CC BY 4.0, attribution required).** Put the credit line from `upload/UPLOAD.md` in the description.
  - "Sleeping Cat On The Table - 3D Scan" by Alben Tan (sketchfab.com/albentan2012)
  - "Sleepy Comfy Cat" by Léonard Doye (sketchfab.com/leoskateman)
  - "3d modelling my cat: Fripouille" by guillaume bolis (sketchfab.com/guillaume.bolis.neko)
  - Also downloaded by the code but not shown: "My other cat" by Abby Crawford (sketchfab.com/abby)
  - Downloaded through the Objaverse dataset (allenai/objaverse on Hugging Face), which mirrors the Sketchfab files with their licences.
  - The models were changed: refitted, re-rigged and re-posed, fur and eyes added, and supports removed from the scans.
- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "Your" (see `build.sh`).
- **Sound effects:** all CC0 (public domain, free for commercial use, no credit required).
  - **From Freesound** (`build.sh` fetches each one's public preview):
    - 502051 "Cat Purring.wav" (shelbyshark)
    - 271010 "Camera Shutter Click" (Kodack)
    - 444920 "Fire crackling in fireplace" (NomadApe)
    - 697217 "Looping Gentle Wind Ambience on an Open Desert Plain.wav" (dhallcomposer)
    - 412751 "ticking of the clock 01.wav" (blukotek)
    - 469289 "birds chirping.WAV" (julietclarke)
    - 466785 "Laptop Typing" (HogantheLogan)
    - 412017 "cat meow short" (skymary)
    - 850586 "Laptop Keyboard typing" (jaziel_.arroyo)
    - 848385 "Adult Cat Sniffing" (RavenWolfProds)
  - **From BigSoundBank (Joseph Sardin):** a quiet room's tone (2387).
- **HDRs, models and textures:** Poly Haven (polyhaven.com), CC0. `src/fetch_assets.py` downloads them and the cat models; they aren't stored in the repo.
- **Music:** synthesized in `audio/mix_laptop.py` (16 bars), cosy and a little sly, and sparse in the desert.
- **Visuals:** three.js scenes. The laptop, thermal look, overlays and sets are original; the cats are the CC BY models above.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` does the whole rebuild:
1. downloads the recordings, the Poly Haven assets and the cat models
2. regenerates the voice
3. renders 979 frames: one to two hours on 4 CPU cores with software WebGL (add `?sub=1` for a fast draft)
4. mixes and masters the audio
5. encodes both versions
