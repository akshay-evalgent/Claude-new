# Why We Dream 😴

A 34-second vertical short (10 scenes, 18 shots) built to the recipe in `../../index.html`, and the first one made with the upgraded look: real motion blur, depth of field that focuses on whatever the camera is looking at, soft shadows, bloom, a film grade, textured materials and jointed characters with fingers and knees. It follows the mechanism format: a cold open on the strangest visible fact (eyes darting under closed lids), a "You see" explanation at 24% of the runtime, the leading theories, a "But when that block fails…" turn with a comic beat, and a two-part payoff (six years of dreams, gone within minutes).

## Files

- `output/why-we-dream.mp4`: upload this one (1080×1920, 30 fps, captions burned in)
- `output/why-we-dream-no-captions.mp4`: the same video without captions
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions and settings

## Script (103 words, 187 wpm, 33.2 s of voice)

> Every night, your eyes start darting under your eyelids, your brain lights up almost like you're awake, and your body goes completely limp. You see, while you dream, your brainstem blocks the signals to your muscles, so you don't act out what you're seeing. Scientists think dreams might help sort your memories and rehearse scary situations, which is why being chased is one of the most common dreams. But when that block fails, people can punch and kick while they're still asleep. And over a lifetime, you'll spend about six years dreaming, then forget almost all of it within minutes of waking up.

## Shots

| Time | Line | Picture | Transition in |
|---|---|---|---|
| 0.00 | Every night | Moonlit bedroom: light shaft and dust through the window, a sleeper breathing under a quilt | Cold open |
| 0.72 | your eyes start darting under your eyelids | Close-up: the eyes flick under closed lids in REM saccades | Hard cut |
| 3.26 | your brain lights up almost like you're awake | Translucent head on the pillow; the brain switches on with travelling waves of light | Hard cut |
| 5.80 | and your body goes completely limp | His arm slides off the bed and dangles; the cat crouches, leaps and lands on his chest; he doesn't stir | Hard cut |
| 8.18 | You see, while you dream | X-ray body: signals pulse from the brain down the spinal cord to the arms and legs | Push-through flash |
| 9.78 | your brainstem blocks | A red gate snaps shut at the brainstem; the limbs go dark | (same shot) |
| 11.18 | the signals to your muscles | Close-up: each pulse slams into the gate and sparks | Hard cut |
| 12.28 | so you don't act out | A thought bubble grows over the sleeper; inside, dream-him runs at a football | Hard cut |
| 12.98 | what you're seeing | Closer: he kicks it into the net; under the covers his foot barely twitches | Hard cut |
| 14.76 | Scientists think dreams might help sort your memories | Dream space: photos stream into a MEMORIES filing cabinet; drawers spring open and slam shut | Card swing |
| 17.20 | and rehearse scary situations | Dream hallway: he hears something, turns, and a purple monster rises behind him | Hard cut |
| 19.06 | which is why being chased | He sprints at the camera; the monster bounds after him | Hard cut |
| 19.98 | is one of the most | Low tracking angle: legs pumping, footfall dust, the monster looming | Hard cut |
| 21.28 | common dreams | Close on his face; he glances back as a tentacle reaches for him | Hard cut |
| 22.74 | But when that block fails | A couple asleep in a double bed; he starts twitching and clenching his fists | Whip pan |
| 24.64 | people can punch and kick while they're still asleep | He punches twice and kicks; she rolls off the bed, hits the floor and wakes up furious | Hard cut |
| 26.50 | And over a lifetime, you'll spend about six years dreaming | Time-lapse: the window races through days and nights while dream bubbles stream up; "6 YEARS" | Card swing |
| 30.30 | then forget almost all of it within minutes of waking up | Morning: he sits up, stretches and yawns; the bubbles pop one by one; he grabs for the last and misses; head scratch; hard stop | Hard cut |

## Sources to check before publishing

- **Darting eyes:** rapid eye movement (REM) sleep was identified by Aserinsky & Kleitman (1953, *Science*). Most vivid dreams happen in REM.
- **Brain "almost awake":** REM brain activity resembles wakefulness on EEG, which is why it is also called paradoxical sleep (Jouvet, 1959–1965). Standard sleep physiology.
- **Limp body, brainstem block:** during REM almost all skeletal muscles go slack (REM atonia). Circuits in the pons and medulla inhibit the motor neurons (Brooks & Peever, 2012, *Journal of Neuroscience*). The eye muscles and the diaphragm are spared, which is why the eyes still move and breathing continues. Cats with lesions in this region act out their dreams (Jouvet, 1965).
- **Sorting memories:** memory consolidation during sleep is a leading hypothesis with good support (Stickgold, 2005, *Nature*; Wamsley & Stickgold, 2011). The script says "might", which matches the evidence.
- **Rehearsing threats:** the threat simulation theory (Revonsuo, 2000, *Behavioral and Brain Sciences*). It is a theory, not settled.
- **Being chased:** in the Typical Dreams Questionnaire, being chased or pursued was the most commonly reported dream theme (Nielsen et al., 2003, *Dreaming*).
- **Punching and kicking:** REM sleep behavior disorder, first described by Schenck et al. (1986, *Sleep*). Injuries to bed partners are well documented.
- **Six years:** a commonly cited estimate. About two hours of REM a night over a lifetime comes to roughly six years. People also dream outside REM, so treat it as an approximation.
- **Forgetting within minutes:** dream recall drops sharply in the minutes after waking (Wolpert & Trosman, 1958, among others). The script avoids the popular "90% in 10 minutes" figure, which is poorly sourced.

## How the new look works

All of it is in `src/dream.js` (one file). The reusable pieces are also saved separately in `src/parts/` for future shorts.

- **Render pipeline** (`render-pipeline.js`). Each output frame is 3–4 sub-frames over a 180° shutter. Each sub-frame jitters the camera by a fraction of a pixel (anti-aliasing) and the shadow-casting lights by a few centimetres (soft shadows). They are averaged, which also gives real motion blur. Then come depth of field focused on the camera's look-at point (rack focus comes for free), bloom from HDR highlights, a warm/cool split grade, a slight lens fringe, vignette, ACES tonemapping and film grain.
- **Characters** (`rig-and-materials.js`). The same cast builder, now with fingers that curl into fists, knees and ankles, bare feet, a single smooth head surface (no jaw crease), lash lines, fabric and hair surface detail, a walk-to-sprint gait with knee bend and arm pump, breathing, blinks, saccades, gaze, eye "pop" and neck flexion.
- **Animation helpers.** Springs and overshoot easing for settles, impulse wobble for impacts, keyframe interpolation, an arm aim, and a handheld camera driven by layered noise.
- **Set** (`bedroom-set.js`). The window is a real opening in the wall, so the moonlight (or sunlight) through it casts the frame and mullion shadows. Inside are a light shaft with drifting dust, curtains, procedural wood and plaster, a quilt raycast-fitted to the bodies underneath and tented like cloth, puffy pillows, a lamp that glows, a clock, books and a rug.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9. It's the same voice as the other shorts.
- **Music and sound effects:** synthesized in `audio/mix_dream.py`. The score is a music box that turns into a chase pulse, then comic plucks, then a bright morning, with crickets, clock ticks, a click on every eye flick, the arm flop, the cat landing and purring, nerve zaps on the gate, the kick and net swish, drawers, a monster roar and footsteps on the run cadence, punches, the fall, bubble pops, birds and a head scratch.
- **Visuals:** procedural three.js in `src/dream.js`.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` regenerates the voice, renders 1,013 frames (about 2¼ hours on 4 CPU cores with software WebGL; add `?sub=1` for a fast draft), mixes and masters the audio, and encodes both versions.
