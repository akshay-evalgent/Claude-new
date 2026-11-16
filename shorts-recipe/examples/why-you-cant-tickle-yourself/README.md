# Why You Can't Tickle Yourself 🤭

A 33.3-second vertical short (15 shots) built to the recipe in `../../index.html`, back with the human-body series. It follows the playbook's engagement section:

- **Hook.** Frame one: you on the sofa, tickling your own palm, completely unimpressed. It's a statement every viewer instantly wants to test.
- **Seamless loop.** The script ends on a word that the first line completes: "…So go ahead, try it right now. It won't work, because → you can't tickle yourself. Your brain sees it coming." The last shot ends on the first frame (same camera, same pose), and the room sound runs across the cut. The music is exactly 16 bars.
- **Share prompt on screen** for the last quarter: "Send this to the sibling who always starts the poke war". It fades out before the final shot, so the loop frame stays clean.
- **Comment trigger** in the pinned comment: "Be honest: did you just try it?" Almost everyone does (see `upload/UPLOAD.md`).

As in the recent shorts, **every sound effect is a real recording** (CC0): hands rubbing for the finger on the palm, real laughter (an adult, and children being tickled), real servomotors for the robot arm, rotary knob clicks, a switch, a beep and cloth for the pokes. Only the music is synthesized.

## Files

- `output/why-you-cant-tickle-yourself.mp4`: upload this one (1080×1920, 30 fps, captions and share prompt burned in)
- `output/why-you-cant-tickle-yourself-no-captions.mp4`: the same video with no text
- `output/mix_master.wav`: the mastered audio track
- `upload/`: title, description, thumbnails, SRT captions, pinned comment and settings

## Script (104 words, 188 wpm, 33.2 s of voice)

> You can't tickle yourself. Your brain sees it coming. Every time you move, it predicts what the touch will feel like, and turns the feeling down. In one experiment, people tickled their own hand through a robot. When it copied them instantly, it barely tickled. Add a delay of a fraction of a second, and the tickle came back. The same trick starts poke wars. In another study, two people took turns pressing each other's finger, trying to match what they felt. Their own press always felt softer, so every turn got harder. So go ahead, try it right now. It won't work, because

## Shots

| Time | Line | Picture | Real sound |
|---|---|---|---|
| 0.00 | You can't tickle yourself. | You on the sofa, tickling your own palm, deadpan | Hands rubbing (0663), birds outside (1859) |
| 1.67 | Your brain sees it coming. | An x-ray of your head: the brain lights up and a signal runs down to your hand | |
| 3.46 | Every time you move, it predicts what the touch will feel like, | A blue "prediction" of your arm moves first and reaches the palm a beat before the real one | Hands rubbing |
| 6.50 | and turns the feeling down. | A brain above a TICKLE knob that clicks down from 10 to 1 | Knob clicks (0808) |
| 8.43 | In one experiment, people tickled their own hand through a robot. | A volunteer moves a little lever; a robot arm copies it with a foam tip on their palm | Servomotors (2911, 2921, 2909) |
| 12.29 | When it copied them instantly, it barely tickled. | The volunteer, unmoved; the TICKLE meter barely moves | Servomotors |
| 15.21 | Add a delay of a fraction of a second, | The control box: DELAY 0.0 s → 0.2 s | Knob clicks, a beep (2059) |
| 17.12 | and the tickle came back. | The volunteer bursts out laughing; the meter shoots up | Real laughter (0490) |
| 18.87 | The same trick starts poke wars. | Two kids on the sofa, each poke harder than the last | Cloth (0013), real children's giggles (1418–1421, 1660) |
| 21.21 | In another study, two people took turns | Two people facing each other across a lever, one finger each | A click at every press (0321) |
| 23.48 | pressing each other's finger, trying to match what they felt. | Close on the lever; bars show each person's press | Clicks |
| 26.08 | Their own press always felt softer, | PRESSED vs FELT: the bar they felt is half the one they pressed | |
| 28.52 | so every turn got harder. | Turn after turn, the bars climb | Clicks |
| 30.28 | So go ahead, try it right now. | You look at us and hold up your palm | A little chuckle (0475) |
| 32.27 | It won't work, because | Back to the deadpan tickle (loop) | Hands rubbing |

## Sources to check before publishing

- **The brain cancels the tickle it predicts.** Blakemore, Wolpert & Frith (1998), "Central cancellation of self-produced tickle sensation", *Nature Neuroscience* 1(7). Self-produced touch was rated less tickly than the same touch from outside, and brain areas that process touch responded less. The cerebellum is thought to predict the sensory result of your own movements.
- **The robot experiment.** Blakemore, Frith & Wolpert (1999), "Spatio-temporal prediction modulates the perception of self-produced stimuli", *Journal of Cognitive Neuroscience* 11(5). People moved one robot arm, and a second arm stroked a soft foam tip across their palm. With no delay it felt least tickly. Adding a delay (0.1 to 0.3 seconds) made it progressively more tickly. "The tickle came back" is the plain-language version of that.
- **The finger-press study.** Shergill, Bays, Frith & Wolpert (2003), "Two eyes for an eye: the neuroscience of force escalation", *Science* 301. Pairs took turns pressing on each other's finger, each told to match the force they had just felt. Because their own press felt weaker to them than it was, each turn was harder than the last (about 38% a turn). The bars in the video show the escalation, not the measured numbers.
- **"The same trick starts poke wars."** This is the paper's own framing (tit-for-tat escalation), applied to siblings.

## How it was made

All the code is in `src/tickle-yourself.js` (one file). The new pieces are also saved separately in `src/parts/`:

- `tickle-sets.js`:
  - **The brain and its prediction:** an x-ray head with a glowing brain inside, a see-through "prediction" copy of your arm, and a TICKLE knob.
  - **The robot experiment:** a robot arm with a foam tip and simple IK, a lever handle, and a control box whose screen reads DELAY.
  - **The finger-press study:** a lever rig and bar charts that grow.
  - **The room:** a bright lab.
- `shots.js`: the 15 shots. Shots 0 and 14 run on time measured from the loop point, so the last frame and the first frame are the same frame.
- `rig-and-materials.js`, `props.js`, `living-room-and-garden.js`, `render-pipeline.js`: the people, the living room and the render pipeline shared with the earlier shorts.

## Assets and rights

- **Voice:** Kokoro TTS (Apache-2.0), voice `am_fenrir` at speed 0.9, cut just before the repeated "You" (see `build.sh`).
- **Sound effects:** real recordings from BigSoundBank by Joseph Sardin, released under CC0 (public domain, free for commercial use, no credit required). The table above gives each recording's number; `build.sh` downloads them from `https://bigsoundbank.com/UPLOAD/bwf-en/<number>.wav`.
- **Music:** synthesized in `audio/mix_tickle.py` (16 bars):
  - playful pizzicato for the deadpan tickle;
  - a marimba pulse for the science;
  - sparse ticks for the robot;
  - silence while the delay ticks up;
  - bouncy marimba for the giggles and the poke war.
- **Visuals:** procedural three.js, original.
- **Caption font:** Nunito ExtraBold (SIL Open Font License).

## Rebuild

`./build.sh` downloads the recordings, regenerates the voice, renders 998 frames (about 2 hours on 4 CPU cores with software WebGL; add `?sub=1&fur=0` for a fast draft), mixes and masters the audio, and encodes both versions.
