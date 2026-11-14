# Why Cats Knock Things Off Tables 😼

A 31.6-second vertical short (19 shots, three sets) built to the recipe in `../../index.html`. The earlier cat short did well, so this one stays with the same orange tabby and is built around the playbook's engagement section:

- **Hook.** Frame one is the cat staring into the lens with a paw on your glass. The viewer waits for the crash, which lands at 4.2 s.
- **Seamless loop.** The script ends on an unfinished sentence that the first line completes: "…So the more you react, the more often → your cat looks you dead in the eye and slowly pushes your glass off the table." The last shot ends on the first frame (a fresh glass, the paw already on it), the purr runs across the seam, and the music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone whose cat does this".
- **Comment trigger** in the pinned comment: "What's the last thing your cat knocked off a table?" (see `upload/UPLOAD.md`).

## Files

- `output/why-cats-knock-things-off-tables.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-cats-knock-things-off-tables-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (100 words, 190 wpm, 31.5 s of voice)

> Your cat looks you dead in the eye and slowly pushes your glass off the table. You see, cats are hunters, and they test things with their paws, tapping them to see if they run. So when the glass falls, that sudden movement fires the same instinct as chasing prey. But there's another reason. The first time it crashed, you gasped and came running, and your cat learned it's the fastest way to get your attention. In one study, half of the cats picked time with a human over food and toys. So the more you react, the more often…

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Your cat looks you dead in the eye | Living room at sunset. The cat sits on the coffee table, one paw on the rim of your glass, staring into the lens | Cold open (loop target) |
| 2.08 | and slowly pushes your glass | Side macro against the sunset window: the paw shoves the glass toward the edge in three little pushes; ice clinks, water sloshes | Hard cut |
| 3.56 | off the table. | Floor-level: it tips, falls and smashes in front of the lens; the cat peers over the edge | Hard cut |
| 4.76 | You see, cats are hunters | Garden at dusk: the cat stalks through the grass, eyes glowing | Push-through flash |
| 6.20 | and they test things with their paws | Close on a mouse; the paw reaches in and pats it, twice, the cat's eyes behind | Hard cut |
| 8.48 | tapping them to see if they run. | A third pat; the mouse bolts; the cat wiggles and pounces | Hard cut |
| 10.58 | So when the glass falls | Slow motion: the glass in mid-air, water trailing, the cat watching from above | Hard cut |
| 12.00 | that sudden movement fires the same | Extreme close-up: the pupils blow open from slits to full circles | Hard cut |
| 13.96 | instinct as chasing prey. | X-ray cat: the brain flashes, a signal runs down the spine to the paws, the paw swipes at a ghost mouse | Hard cut |
| 16.10 | But there's another reason. | The cat in the foreground; focus racks to the owner on the sofa, typing, not looking | Card swing |
| 17.76 | The first time it crashed | From above: the glass hits the floor and shatters | Hard cut |
| 19.14 | you gasped and came running | The owner's hands fly up, eyes wide; she jumps up and sprints over | Hard cut |
| 20.54 | and your cat learned | A thought bubble over the cat: falling glass → human with a "!" | Hard cut |
| 22.02 | it's the fastest way to get your attention. | Head scratches; the cat melts, then opens one eye at the camera | Hard cut |
| 24.32 | In one study | A study room from above: food, a toy, a scent and a seated person around the cat; share prompt fades in | Whip pan |
| 25.32 | half of the cats picked time with a human | The cat looks at the food, then the toy, then walks straight to the person and rubs against her hand | Hard cut |
| 27.38 | over food and toys. | Wide: the results pop up over each station (50%, 37%, 11%, 2%) | Hard cut |
| 29.04 | So the more you react | The owner on her knees among the shards, arms up; the cat looks down at her | Card swing |
| 30.30 | the more often… | She sets down a fresh glass. The paw is on it before her hand has left. Eyes back to the lens | Hard cut (loop) |

## Sources to check before publishing

- **The study:** Vitale Shreve, Mehrkam & Udell (2017), "Social interaction, food, scent or play? A formal assessment of domestic pet and shelter cat preferences", *Behavioural Processes* 141. Given a free choice, 50% of the cats preferred social interaction with a human, 37% food, 11% toys and 2% scent. Those are the four numbers in the wide shot.
- **Pawing as hunting behaviour:** object play in cats uses the same movements as hunting, and movement is what triggers it (Hall & Bradshaw 1998, *Applied Animal Behaviour Science*; Bradshaw, *The Behaviour of the Domestic Cat*). "Tapping to see if it runs" is the standard explanation from behaviourists, not a measured result.
- **Learned attention-seeking:** this is also the behaviourists' explanation (a reaction rewards the behaviour, so it repeats). It is consistent with the study above but hasn't been tested directly for knocking things over. The script says "your cat learned", which is how trainers describe it.

## How it was made

All the code is in `src/cat-knock.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `cat.js`:
  - A new cat rig: four legs solved with IK, three body poses that blend (sit, crouch, stand), a head that can hold eye contact, eyes that track a target, pupils that open from slits to circles, upper and lower lids with lash lines, swivelling ears, whiskers that push forward, and a tail rebuilt every frame.
  - Shell fur: six thin layers of soft, combed noise over the coat, shorter on the face and paws. It gives the fuzzy silhouette and costs about 20% more render time.
  - A mouse, and a tumbler of ice water that slides, tips, falls with trailing water and shatters into shards, droplets, loose ice and a spreading puddle.
- `sets.js`: the living room at sunset (window opening with light shaft and dust, coffee table, console, lamp, cat tree, sofa), the garden at dusk (9,000 swaying grass blades, fence, flowers, fireflies), the study room, and the owner's laptop.
- `shots.js`: the 19 shots.
- `rig-and-materials.js`, `props.js`, `render-pipeline.js`: shared with the earlier shorts (people, two-bone arm IK, sub-frame motion blur, soft shadows, depth of field, bloom, film grade).

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut after "often" (see `build.sh`).
- **Music and sound effects:** synthesized in `audio/mix_cat_knock.py`. The 16-bar score is a sneaky tiptoe that stops dead on both smashes, turns into a hunting groove in the garden, holds a rising pad through the slow motion, and comes back sly, then bright for the study. Effects include the purr, glass scraping on wood, ice and water, both smashes, crickets, paw pats, squeaks and scurrying, the pounce, typing, the gasp, footsteps and the number pops.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 948 frames (about 1 hour 50 minutes on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
