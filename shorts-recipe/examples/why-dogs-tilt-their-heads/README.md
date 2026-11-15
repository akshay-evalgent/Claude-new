# Why Dogs Tilt Their Heads 🐶

A 32.5-second vertical short (15 shots) built to the recipe in `../../index.html`, with a new character: a golden retriever. It follows the playbook's engagement section:

- **Hook.** Frame one is your point of view from the sofa: your dog looks up at you, and the tilt starts in the first quarter second.
- **Seamless loop.** The script ends on a question that the first line answers: "…So watch which way yours goes when you ask, who wants a walk? → Your dog tilts its head…" The last shot ends on the first frame (same camera, same pose), and the evening birdsong is laid across the cut. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to someone whose dog does the tilt". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: which way does your dog tilt, left or right?" It is also an action: viewers try it on their own dog, then answer in one word (see `upload/UPLOAD.md`).

As in the cat-meow short, **every sound effect is a real recording** (CC0): real dog whines, a bark and panting, real squeaky toys and a quacking duck toy, a phone shutter, keys, a bell and page flips. Only the music is synthesized.

## Files

- `output/why-dogs-tilt-their-heads.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-dogs-tilt-their-heads-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (105 words, 196 wpm, 32.5 s of voice)

> Your dog tilts its head, and it's not just to look cute. In one study, dogs that knew the names of lots of toys tilted their heads almost half the time when their owner said a toy's name. Ordinary dogs barely did it at all. So the tilt may be your dog matching the word to the toy in its memory. Another idea: a long snout blocks part of your face, and tilting helps them see you. And in that study, each dog had a favorite side, like being left- or right-handed. So watch which way yours goes when you ask, who wants a walk?

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | Your dog tilts its head, | Your POV from the sofa: the dog looks up and tilts, ears hanging with the tilt | Curious whine (1546), collar tag (0445) |
| 1.38 | and it's not just to look cute. | Through your phone's camera: snap, flash, hearts float up | Phone shutter (0448) ×2 |
| 3.70 | In one study, | Whip into a play room: the dog in the middle of a spiral of toys | Whoosh (1795) |
| 4.72 | dogs that knew the names of lots of toys | Name tags pop up over the toys (DUCK, BALL, ROPE, BONE, BUNNY, FROG, RING) | A different real squeaky toy for each tag; a quacking duck for DUCK (0364, 3331–3338) |
| 7.06 | tilted their heads almost half the time | The big tilt, and a ring chart fills to 43% | Whine |
| 9.56 | when their owner said a toy's name. | Over her shoulder: "Where's DUCK?", and the tilt | Whimper (1544) |
| 11.73 | Ordinary dogs barely did it at all. | A black dog hears the same words: a blank stare, a lick of the nose, 2%. The music stops | A sniff (1547) |
| 14.32 | So the tilt may be your dog | Close on the eyes as the head turns over | |
| 15.76 | matching the word to the toy in its memory. | A thought bubble flips through toy cards and stops on DUCK ✓; the dog looks at the real duck | Page flips (0362), bell (0479) |
| 18.60 | Another idea: | In profile: the long snout pointing up at her face | |
| 19.78 | a long snout blocks part of your face, and tilting helps them see you. | The dog's own view: the snout covers her mouth; the head tilts, the snout swings away, and there's her smile | |
| 23.99 | And in that study, each dog had a favorite side, | "BALL?" "ROPE?" "DUCK?": three tilts, always the same way, three ticks | Tag jingles |
| 26.58 | like being left- or right-handed. | The dog puts its left paw in her hand | Soft pat (0013) |
| 28.26 | So watch which way yours goes | The leash comes off the hook; the dog jumps up, mouth open, tail going | Keys (0445), a bark (2954), panting (1547) |
| 30.76 | when you ask, who wants a walk? | Back to your POV: ears go up on "walk?" (loop) | Tag jingle |

## Sources to check before publishing

- **The study.** Sommese, Miklósi, Pogány, Temesi, Dror & Fugazza (2022), "An exploratory analysis of head-tilting in dogs", *Animal Cognition* 25. Dogs that had learned the names of many toys ("Gifted Word Learners", mostly Border Collies) tilted their heads in 43% of trials when their owner asked for a toy by name; typical dogs did so in 2%. Each gifted dog tended to tilt to the same side, whichever side the owner stood on. The authors suggest the tilt may be linked to processing meaningful, relevant words. "Matching the word to the toy in its memory" is the script's plain-language version of that suggestion, so it says "may".
- **The snout idea.** This comes from the psychologist Stanley Coren's online survey of 582 dog owners, written up in Psychology Today: dogs with long muzzles were reported to tilt more often than flat-faced breeds. It's an informal survey, not a peer-reviewed study, which is why the script calls it "another idea".
- **"Like being left- or right-handed."** This is an analogy for the side preference the study found, not a claim that it is the same mechanism as handedness.

## How it was made

All the code is in `src/dog-tilt.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `dog.js`: the new golden retriever rig and the toys.
  - **Body:** four IK legs with paws and claws, sit and stand poses that blend, shell fur (fine and soft, longer on the chest and ears), and a feathered tail that wags at any speed.
  - **Head:** a skull with a stop, a long muzzle and a glossy nose, a jaw with mouth, tongue and pant, brown eyes with lids and glints, and brows that rise and tip with the tilt.
  - **Ears and collar:** floppy ears hinged at the top of the skull that trail the head tilt with a little overshoot (`earSwing`), and a red collar with a swinging tag.
  - **Toys:** a rubber duck, a tennis ball, a rope, a bone, a bunny, a frog and a ring.
- `sets.js`: the play room, speech bubbles, ring charts, a burst of 3D hearts, a phone and its camera viewfinder, and a leash that hangs in a curve.
- `shots.js`: the 15 shots. Shots 0 and 14 run on time measured from the loop point, so the last frame and the first frame are the same frame. Speech bubbles and charts are pinned to the camera so they always sit in frame.
- `rig-and-materials.js`, `props.js`, `living-room-and-garden.js`, `cat-and-sets-from-the-cat-shorts.js`, `render-pipeline.js`: shared with the earlier shorts (the living room, the owner, the hallway door).

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut after "walk?" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_dog_tilt.py` (16 bars). Pizzicato tiptoes for the POV, bouncy marimba for the study, a full stop for the ordinary dog's blank stare, celesta for the memory, and back to tiptoes for the loop.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 975 frames (about 1 hour 50 minutes on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
