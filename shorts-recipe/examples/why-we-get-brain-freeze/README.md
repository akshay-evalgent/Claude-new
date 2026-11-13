# Why We Get Brain Freeze 🥶

A 32-second vertical short (20 shots, three sets) built to the recipe in `../../index.html`, using the upgraded look from the dream short. It's the first short that also follows the playbook's engagement section:

- **Seamless loop.** The script ends on "…kids who ate slowly, because" and the replay continues with "When you slurp something icy too fast…". The voice was generated reading straight on into the first line and cut right after "because", so it doesn't drop its pitch like an ending. The last half-second cuts back to the opening shot, and the music is exactly 16 bars long so it lands on the first downbeat.
- **Share prompt on screen** for the last third: "Send this to someone who eats ice cream way too fast".
- **Comment trigger** in the pinned comment (see `upload/UPLOAD.md`).

## Files

- `output/why-we-get-brain-freeze.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-we-get-brain-freeze-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (103 words, 191 wpm, 32.4 s of voice)

> When you slurp something icy too fast, a stabbing pain shoots right into your forehead. You see, the cold makes the tiny blood vessels in the roof of your mouth clamp shut, then suddenly flood wide open to rush warm blood back in. That swelling sets off a big nerve that also covers your forehead, so your brain blames the wrong spot. The fastest fix is pressing your tongue against the roof of your mouth to warm it back up. And in one study, kids who wolfed down their ice cream got brain freeze twice as often as kids who ate slowly, because…

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | When you slurp something icy | A kid on a sunny boardwalk slurping a giant blue slushie (condensation, a slush cart behind, a seagull) | Cold open |
| 1.56 | too fast | Macro: blue slush racing up the clear striped straw | Hard cut |
| 2.28 | a stabbing pain | His eyes snap shut, brows knit, teeth clench, a hand slaps his temple, ice shards burst off his forehead | Hard cut |
| 3.20 | shoots right into your forehead | Close-up: frost cracks spread across his forehead with cold mist | Hard cut |
| 5.18 | You see, the cold makes | Anatomical cutaway of the head; the slush on the roof of the mouth starts to glow icy blue | Push-through flash |
| 7.32 | the tiny blood vessels in the roof of your mouth clamp shut | Inside the mouth looking up: a wet, ridged roof with a vessel network and frost spreading from the slush; the vessels squeeze thin and turn dark | Hard cut |
| 9.84 | then suddenly flood wide open | The vessels balloon open with a spring and flush red; the roof warms | Hard cut |
| 11.82 | to rush warm blood back in | Grazing along the roof as blood pulses through the swollen vessels | Hard cut |
| 13.80 | That swelling sets off a big nerve | Cutaway: a signal runs from the roof of the mouth, through two nerve junctions, over the eye to the forehead | Hard cut |
| 16.28 | that also covers your forehead | The pain bursts at the forehead in red cracks | Hard cut |
| 17.30 | so your brain blames the wrong spot | Back on the boardwalk in x-ray: the real cold glows blue in his mouth while the pain glows red in his forehead | Whip pan |
| 19.88 | The fastest fix | He opens his eyes with an idea and clamps his mouth shut | Hard cut |
| 21.16 | is pressing your tongue against the roof of your mouth | Cutaway: the tongue rises and presses the roof; warmth spreads and the frost melts | Hard cut |
| 23.76 | to warm it back up | Relief: the frost melts off his forehead, he smiles and breathes out | Hard cut |
| 24.72 | And in one study | A school cafeteria: fast eaters shovel ice cream on one side, slow eaters savour it on the other; share prompt fades in | Card swing |
| 26.78 | kids who wolfed down their ice cream | Corner angle on the fast eaters, spoons flying | Hard cut |
| 28.14 | got brain freeze | They freeze one by one: hands to temples, winces, a chorus of "ow" | Hard cut |
| 29.18 | twice as often | A chalk bar chart draws itself: FAST is twice SLOW, "2x" circled | Hard cut |
| 30.44 | as kids who ate slowly | A slow eater smiles smugly and takes a slow lick | Hard cut |
| 31.74 | because… | Back on the boardwalk as he raises the straw to his lips; matches the first frame | Hard cut (loop) |

## Sources to check before publishing

- **The name:** brain freeze is a "cold-stimulus headache" (International Classification of Headache Disorders, ICHD-3, 4.5). It's also called "ice-cream headache" or sphenopalatine ganglioneuralgia.
- **Vessels clamp, then flood open:** cold on the palate makes the local blood vessels constrict and then rapidly dilate. Serrador et al. (2012, Experimental Biology, *FASEB Journal* abstract) measured blood flow in the anterior cerebral artery: it rose as brain freeze began and fell as it eased, which supports the vascular explanation. This is the leading explanation, not a settled one.
- **The nerve and the wrong spot:** the trigeminal nerve carries sensation from both the palate and the forehead, so the brain refers the pain to the forehead (referred pain). Standard neuroanatomy.
- **The fix:** warming the palate (tongue against the roof of the mouth, or a sip of something warm) is the standard advice from clinical sources such as the Cleveland Clinic. It's practical advice rather than trial-tested.
- **The study:** Kaczorowski & Kaczorowski (2002, *BMJ* 325:1445): 145 middle-school students. 27% of fast eaters got brain freeze, compared with 13% of slow eaters, which is about twice as often.

## How it was made

All the code is in `src/brain-freeze.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `props-and-boardwalk.js`:
  - Kid rig: kid proportions, two-bone arm IK so hands really grip cups and touch temples, a wince (knitted brows, clenched-teeth grimace), cold skin tint and a smile.
  - Forehead frost: a decal projected onto the head that grows outward as icy cracks.
  - Slushie: printed band, dome lid, clear striped straw with slush flowing inside, condensation droplets.
  - Boardwalk: planks, railing, an animated sea with random sun glints, a slush cart with spinning tanks, a seagull and a sailboat.
- `anatomy.js`:
  - Roof of the mouth: wet mucosa with ridges, the midline seam and the papilla behind the front teeth, a gum ridge, and a vessel network. The vessels swell or clamp, carry flowing cells, and change between cold and hot.
  - Cutaway head: a 3D head swept from a drawn profile, cut down the middle. The cut face is built from raised, outlined layers, like a museum model: skull, folded brain, cerebellum, corpus callosum, brainstem and cord, vertebrae, nasal turbinates, hard and soft palate, airway, teeth, jaw, and a tongue that can rise and press the palate. It also carries the trigeminal nerve path and the cold, warmth and pain glows.
- `cafeteria.js`: checker floor, chalkboard, windows, a long table with seated kids eating via IK, ice-cream cups and spoons, and the chalk chart that draws itself stroke by stroke.
- `rig-and-materials.js` and `render-pipeline.js`: shared with the dream short (sub-frame motion blur, soft shadows, depth of field, bloom, film grade). The pipeline now also guards against NaN pixels.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut after "because" (see `build.sh`).
- **Music and sound effects:** synthesized in `audio/mix_brain_freeze.py`. The 16-bar score goes from a sunny pluck groove to a comic stop on the stab, icy pizzicato, a swell for the flood, tension for the nerve, and back to the groove. Effects include slurping, ice cracks and shards, frost crackle, the vessel squeeze, the rushing flood and heartbeat, nerve zaps, melting drips, spoon clinks, chalk, waves and gulls.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 974 frames (about an hour on 4 CPU cores with software WebGL; add `?sub=1` for a fast draft), mixes and masters the audio, and encodes both versions.
