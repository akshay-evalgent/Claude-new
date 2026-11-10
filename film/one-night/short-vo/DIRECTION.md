# One Night: the narrated short

A 65.6-second vertical film (1080x1920, 24 fps), every frame raymarched in code, with
narration, a score and word-synced captions. It is built to loop: the last shot ends on the first frame.

## The idea, and the physics it gets right

Santa has one night, midnight to six on his watch. If he flew close enough to the speed of light, Einstein's
time dilation would let those six hours be 23 years at home. The ratio is about 33,600 to 1, so:

- every second on his watch is **9.3 hours** at home ("nine hours here"),
- the **three seconds** he spends with one present are **28 hours** at home ("more than a day"),
- the clock on the workshop wall turns its minute hand **9.3 times a second**, and the shot shows exactly that,
- the stars over the North Pole wheel round the sky once every **2.6 seconds** of his time in the timelapse.

## How it was made

1. **Voice first.** Lines are in `vo/lines.json`. `vo/make_vo.py` generates them with the Kokoro neural voice
   (narrator `bm_george`, Mrs Claus `bf_emma`, pitched slightly down) and checks every take with Whisper.
2. **The edit comes from the words.** `build/edit.py` places the lines and derives every cut from word
   timestamps: the midnight toll after "Midnight to six", the second hand on "second", the present landing
   three seconds after it starts to fall, a height mark drawn on "One year", the house fully aged on
   "Twenty-three", the touchdown on "lands". It writes `src/timeline.json`, which drives the picture and the mix.
3. **Score and mix.** `build/make_score.py` synthesises an organ-and-strings score in A minor, a sleigh-bell
   clock that ticks, stretches and stops with the story, and every effect, then mixes them with the voice
   (EQ, compression, ducking) to -14 LUFS.
4. **Picture.** Four GLSL scenes (`src/scene_*.glsl`): the watch, the North Pole, the workshop room, a child's
   living room. Each frame accumulates jittered sub-frames over a 180-degree shutter (anti-aliasing and motion
   blur), then `src/post.glsl` adds bokeh depth of field from scene depth, bloom, halation, chromatic
   aberration, grain and gate weave. Snow falls in the finishing pass.

## Narration

| Time | Voice | Line |
|---|---|---|
| 0.33 | Narrator | Santa has one night to deliver every present. |
| 4.03 | Narrator | Midnight to six. |
| 7.54 | Narrator | But what if he flew so fast that time itself began to bend? |
| 11.89 | Narrator | Einstein showed that the faster you move, the slower your clock ticks. |
| 16.85 | Narrator | Fly close enough to the speed of light, and one night for you can be years for everyone else. |
| 24.06 | Narrator | At home, nobody is moving. Their clocks run normally. |
| 28.56 | Narrator | Every second on his watch is nine hours here. |
| 33.44 | Narrator | He spends three seconds in a child's living room. |
| 37.50 | Narrator | Back home, more than a day goes by. |
| 41.00 | Narrator | One year. |
| 42.48 | Narrator | Ten. |
| 44.14 | Narrator | Twenty-three. |
| 48.64 | Narrator | He lands at six in the morning. Right on time. |
| 53.17 | Narrator | But the house has waited through twenty-three Christmases. |
| 58.95 | Mrs Claus | You were gone one night. |
| 62.33 | Narrator | For him, it was. |

## Shots

| Starts | Shot | Length |
|---|---|---|
| 0.00 | watch open | 6.26 s |
| 6.26 | launch | 10.17 s |
| 16.43 | warp | 7.36 s |
| 23.78 | window normal | 4.73 s |
| 28.51 | watch tick | 1.95 s |
| 30.46 | clock spin | 2.30 s |
| 32.77 | present | 4.86 s |
| 37.63 | window day | 3.05 s |
| 40.68 | marks | 2.98 s |
| 43.66 | house aged | 2.66 s |
| 46.32 | dawn | 6.48 s |
| 52.80 | interior | 4.76 s |
| 57.55 | her | 4.33 s |
| 61.88 | watch end | 3.68 s |

## Build

```
python build/edit.py                 # timeline from the voice takes
python build/make_score.py           # mix.wav and score.m4a (needs the audio venv: kokoro, scipy, soundfile)
python3 build/pack.py                # index.html, self-contained
build/render_all.sh                  # every frame at 1080x1920, resumable
ffmpeg -framerate 24 -i build/frames/f%04d.png -i build/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k one-night-narrated.mp4
```
