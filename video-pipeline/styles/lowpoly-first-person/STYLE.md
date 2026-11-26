# Low-poly first-person style kit

One continuous 3D scene seen from where you stand, drawn with three.js: flat
faces below, soft things above, two counter blocks at the top and one line of
words near the bottom. Vertical, 1080x1920. Built for the `yt-short` run ("What
If You Got Hotter and Couldn't Stop?") from one reference, a horizontal
first-person film with corner counters. The grammar is the reference's; the
place, the models and the vertical layout are this kit's own.

## Parts

| File | What it is |
|---|---|
| `world.js` | The scene and the one function that sets it: `world.set(tempC, t, pose)`. Its header is the manual |
| `hud.js` | The counter blocks, the line, the title, and the figure formats. Its header is the manual |
| `lowpoly.css` | Tokens, the layout of the words, the scrims, the fonts |
| `fonts/` | Newsreader roman and italic (variable; SIL OFL, `OFL-Newsreader.txt`) and Inter Medium and SemiBold (SIL OFL, `OFL-Inter.txt`) |
| `example.html` | The whole climb in 14 seconds as one shot. Open with `?play` or `?t=6.2` |

Needs `vendor/node_modules/three/build/three.min.js` (run `tools/setup.sh`).

## The world function

```js
const world = LowPoly.World.create({ canvas, width: 1080, height: 1920 });
const state = world.set(tempC, t, { yaw, pitch, hand, flakes, release });
hud.set({ ..., look: state.words });
```

- `tempC` decides what has happened to the field. `LowPoly.World.state(tempC)` returns the numbers without drawing; the `CURVES` table at the top of `world.js` holds every threshold as `[°C, value]` rows, read straight in the logarithm of the temperature. Retune a row and every frame follows.
- `t` only moves what moves by itself: snowfall, steam, flames, sparks, rings, grain. Give it the film time; a replayed stretch (a cold open) gives the time it replays, and draws the same frames.
- `pose` is what temperature cannot know: where you look, your palm (`hand` 0 to 1), flakes on it (`p` from -1 falling, 0 landed, 1 a bead of water), and `release` (the white coming apart into snowfall; give the world 37 °C while it runs and let the counter spin down by itself).

What temperature does, in order: 39.6 °C the falling snow stops reaching you; 100 the snow melts back from your feet, steam; 104-108 the melt reaches the first post and its cap slides off; 525 your light, red, then orange (800), yellow (1,000), yellow-white (5,500), white (9,500), blue-white (28,500); 1,000-1,900 posts char and catch; 1,900 on the ground glows round your feet and near posts burn down to stumps; by 5,000 no snow is left, the stars are gone and the sky is black; 9,500 on everything bleaches to white from your feet outward, the ridge last (about 300,000 to 1 million); then white with travelling rings, grain from 100 billion, and flat white at 1.3e32 and above.

The words follow the picture: `state.words` gives the ink (`light` or `dark`) and scrim strength for the counters and for the line separately. The line goes dark at 20,000 °C and the counters at 120,000 °C, because the ground whitens before the sky.

## Tokens

Set on `:root`. A mood board's `style.json` overrides them.

| Token | Default | Use |
|---|---|---|
| `--lp-text` | `#fefaf3` | Words over the scene |
| `--lp-ink` | `#0b0908` | Words over white |
| `--lp-scrim` | `6, 5, 5` | The dark behind words, r, g, b |
| `--lp-heat` | `#ac6634` | The accent: the light you give off. In the scene only, never in type |
| `--lp-margin` | `60px` | Left and right edge of the counter blocks (5.6% of the width) |
| `--lp-top` | `150px` | Top of the counter blocks (7.8%) |
| `--lp-line-y` | `73.5%` | Centre of the line block |
| `--lp-line-max` | `820px` | Widest row; wider rows are scaled down |
| `--lp-title-y` | `38.5%` | Centre of the title block (look level, pitch 0, so it sits above the ridge) |
| `--lp-label-size` | `32px` | Small rows: Inter SemiBold capitals, tracked 0.1em, cap height 23 px |
| `--lp-figure-size` | `96px` | Large figures: Newsreader 500, digits 70 px |
| `--lp-count-size` | `46px` | The countdown under NEXT |
| `--lp-line-size` | `66px` | Story lines: Newsreader italic 500, cap height 47 px |
| `--lp-statement-size` | `66px` | The cold-open line: Newsreader 600, upright |
| `--lp-title-size` | `78px` | Title |

## Grammar

- One place, one view, no cuts. Changes happen in the world: an element swaps in one frame or morphs slowly.
- Solids are flat-faced and unlit by the graphics card: each face is one colour worked out from what it is made of, how far it is from you and how much it faces your light. Sky, stars, snowfall, steam and smoke are soft.
- You are the lamp. Light falls off with distance from where you stand; shadows run straight away from you.
- One warm accent, and it is your heat. Everything not lit by you is night blue, then black.
- Left block: label, large figure, comparison in two rows (lead, then the thing), rule, NEXT with its event, countdown in serif. Right block: label in two rows, clock figure, one sentence a row, and the sources tag in the close.
- One line at a time, bottom centre, one or two rows, at most 820 px wide. The middle of the frame belongs to the scene; only the title sits there.
- Never: outlines, textures on solids, a second accent colour, words at reduced size or below 0.8 opacity, a black or empty frame, text below 80% of the height (the Shorts caption area) or within 130 px of the right edge between 45% and 88% (the Shorts buttons).

## Cost

The headless browser draws 3D in software. This scene (about 30,000 triangles, 2,800 snowflakes) renders through `tools/render.js` at about five 1080x1920 frames a second on four workers (measured: 90 frames in 17 s), so a 60 s film at 30 fps takes about six minutes.

## Known limits

- Post shadows lie almost behind their posts, because you stand beside the fence and you are the light. They show as a dark streak from each post towards the horizon, not as a fan.
- Steam is a soft blue-grey haze, not shaped clouds.
- The hand is a fixed open pose; fingers do not move.
