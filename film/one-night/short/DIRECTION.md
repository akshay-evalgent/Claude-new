# One Night: the 45-second short

Vertical 1080x1920, 24 fps, 45 s, built to loop: the last shot is the first shot's framing, and the
bell that ends it is the bell that starts it. Every frame is raymarched in four GLSL fragment shaders,
with no images or footage. The dial, the height marks and the message screen are text drawn in code
onto canvases.

## The four sets

| Set | What is built | Used in |
|---|---|---|
| The watch | Gold pocket watch with Roman dial, blued hands, red seconds hand, frosted crystal, chain, black leather glove | Shots 1 and 8 |
| The North Pole | Log house with lit window, icicles and drifts that grow with the years, aurora, stars, the sleigh with Santa and four galloping reindeer | Shots 2, 3a, 5 |
| The workshop room | Window with mullions and an oil lamp, Mrs Claus, pendulum clock, door casing with height marks, desk and message screen, sun through the window | Shots 3b, 3c, 6, 7 |
| A child's living room | Tree with lights, wrapped present with ribbon and bow, gloved hand, rug, firelight, window | Shot 4 |

## Shot list

| Time | Shot | Camera | Sound |
|---|---|---|---|
| 0:00 | Macro on the watch at 23:59:57. The question on screen. | Slow constant push down onto the dial | The bell ticks once a second |
| 0:03 | Midnight. The team leaps; the sleigh climbs straight up the frame. | Low on the snow, tilting up to follow, a jolt of shake at the leap | A clock bell tolls, a low hit, the harness jingles, wind |
| 0:09 | Light speed: stars stretch into lines | Locked on the vanishing point | Ticks stretch apart and drop in pitch; a Shepard tone rises |
| 0:12 | Home, 23 years in timelapse. The window from outside, her silhouette waiting. The clock spinning. The door frame marks climbing. | Constant pushes; a tilt up the door frame at each cut back | Normal seconds again; the clock's ticks blur when it spins |
| 0:22 | One present, three seconds. A gloved hand sets it under a tree. | Floor-level dolly, slow motion | A second Shepard tone climbs; the present thumps down |
| 0:26 | Cut back: the marks have reached adult height | Tilt up | |
| 0:30 | Dawn. The sleigh lands in front of the aged house. | Low, slow push | The drone cuts dead. Wind, the bell, a soft landing |
| 0:34 | Inside. The message screen, then a pan to her at the window. | His eye line, walking in | A slow chord |
| 0:37 | Her from behind, grey now, the lamp still lit | Slow push | The chord fades out |
| 0:40 | "You were gone one night." | Holding | Only the bell |
| 0:42.6 | The watch: six in the morning | The same push as the opening, ending on the opening frame | The bell carries into the loop |

## Build

```
python3 build/make_audio.py          # score.wav and score.m4a, from the same timeline
python3 build/pack.py                # inlines the shaders and score into index.html
H=1920 node build/render.cjs         # 1080 frames at 1080x1920, then ffmpeg -> one-night-45s.mp4
H=640 node build/render.cjs 3.5,25   # stills at those times -> build/still_*.png
```
