# Brief: one-minute YouTube Short

- **Subject:** not fixed by the user. "Find a new relevant script by yourself": the pipeline picks a new topic of the same kind as the reference's, one that would sit naturally beside it on the same channel, and writes the script for it.
- **Format:** a YouTube Short: vertical 1080x1920, about one minute, and no longer than 60 seconds.
- **Audience and platform:** YouTube Shorts viewers of the kind of content the reference makes.
- **Reference (link, supplied by the user):** https://www.youtube.com/watch?v=5gbgKYMEySI
  Make a video of the same type: the same kind of script, structure, pacing, look and sound, on a new topic.
- **Supplied material:** none. Built-in voice and code-drawn pictures unless the user supplies their own.
- **Must not:** reuse the reference's footage, artwork, music or wording. It is studied, not copied.

## What the reference is

"What If Time Sped Up and Couldn't Stop?" by Minute Zero: 8 min 57 s, horizontal 1920x1080, 2.17 million views on a channel of about 24,000 subscribers. It is a first-person 3D animation drawn in code: a low-poly street, trees and houses, a sky that turns, then the planet, the Sun and deep space, all seen from one spot. Counters sit in the top corners (the date or year on the left; how long "you have been standing here" on the right) and short italic lines sit at the bottom. The description under the video separates what is real from what is guessed.

So for this run:

- **Same type, new topic, new length and shape.** A "what if" science scenario told the same way, as a vertical 1080x1920 Short of at most 60 seconds. The reference is horizontal and nine minutes: the brief wins on format and length, the reference on everything else (how it is told, the look, the counters, the captions, the sound).
- **Drawn in 3D.** The film is built with three.js, which `tools/setup.sh` installs to `video-pipeline/vendor/`; see "How the video is made" in `video-pipeline/README.md`. This is a new style kit: nothing existing fits.
- **Facts.** The scenario's numbers must be real and sourced, and the script must say which parts are guesses, as the reference's description does. Research is in `01-sources/research.md`.
- **Nothing reused.** New scene, new models, new words. The reference's street, shots and lines are not restaged.

## The topic

**"What If You Got Hotter and Couldn't Stop?"** Chosen by the scout from five candidates (`01-sources/research.md`): it fits the channel's own pattern ("you ..., and couldn't stop") without repeating one of its titles, and every step has a sourced number.

Rulings for the writer and the artists:

- **Told from where you stand, like the reference.** The viewer is the one heating up; the picture is the world around them reacting. The body is never shown suffering: the early steps (a fatal fever, boiling) are stated plainly and briefly, the way the reference states the end of the world.
- **The scene carries the picture as long as it can.** Past the Sun's surface the honest view is too bright to look at, so plan what the surroundings do at each step before that, and let the counter and the colour of the light carry the rest.
- **Real and guessed.** Use only the facts in `01-sources/research.md`, with its confidence labels. The weak rows it lists (the Draper point's source, CERN's expected figure) are worded as approximate or left out. The post description says which parts are illustrative.

## Open

- Nothing blocking.
