# Stipple-lyric style kit

Lyric lines set large on a cream sheet, a drawing made only of ink dots, one dark
red word. Horizontal, 1920x1080. Built for the `lyric-video` run from a single
reference: a still title card (cream paper, a stippled ink drawing, one word in
dark red). The ground, ink and accent were measured from that card. How the
lyrics are set and lit is this kit's own: the reference showed none.

## Parts

| File | What it is |
|---|---|
| `stipple.css` | Colour, type and layout tokens, the sheet, the lyric line |
| `stipple.js` | The dot drawing (`shade`, `noise`, `trail`, `beads`, `halo`, `reveal`), the lyric timing (`update`, `shot`, `line`) and the one SVG filter. Load it with a script tag. Its header is the manual |
| `paper.jpg` | The sheet, 1920x1080. Regenerate with `make_paper.py` |
| `make_paper.py` | The sheet generator: centre colour, how much the corners darken, mottling, creases, sharp folds, specks, size |
| `fonts/` | Cormorant Garamond italic, variable weight 300 to 700 (SIL Open Font License, see `fonts/OFL.txt`) |
| `example.html` | Two lyric lines, each its own shot, over a drawing that grows through both. Open with `?play`, or `?t=4.7` to stop on a moment |

## Tokens

Set these on `:root` to restyle. A mood board's `style.json` overrides them.

| Token | Default | Use |
|---|---|---|
| `--paper` | `#ded0ba` | Only the colour shown before `paper.jpg` loads. The ground is the image |
| `--ink` | `#0b0100` | Every lyric word and every dot |
| `--accent` | `#7a1713` | The one red word. Give it one meaning |
| `--faint` | `0.38` | A word that has not been spoken yet: this share of full ink. Below about 0.35 a faint line stops reading at phone size |
| `--lyric-size` | `160px` | Type size. Ascenders stand 117 px (10.8% of the height), the x-height is 64 px (5.9%). A row of 16 characters is about 1,040 px wide |
| `--lyric-leading` | `178px` | Baseline to baseline |
| `--lyric-x` | `152px` | Left edge of every line (7.9% of the width) |
| `--lyric-y` | `274px` | Top of the two-row block. Baselines fall 141 px and 319 px below it (38.4% and 54.9% of the height) |

`paper.jpg` is a scanned sheet, not a gradient: lightest near the middle
(`#e0d1be`), falling to about `#d0b995` in the corners but lopsidedly, with
patches 2 to 4 levels lighter and darker, three sharp fold lines (two down, one
across at 74% of the height), soft creases and about 320 small flecks. Its mean
is `#dac9b0`; a palette tool reports its commonest tone as about `#dfcfba`. The
mean of each ring from centre to corner is set by `--ground` and `--edge` alone:
the mottling, folds and specks do not move it. For a different ground, run
`python3 make_paper.py --ground <centre colour> --edge <levels lost at the corners>`
and measure the result with `tools/palette.py`; do not trust the value typed.

## The lyric line

One line on the sheet at a time, in two rows, always in the same place.

```html
<p class="lyric">
  <span class="row"><span class="w" data-at="0.12">Slow</span> <span class="w" data-at="0.50">down</span></span>
  <span class="row"><span class="w" data-at="1.04">on</span> <span class="w" data-at="1.22">the</span> <span class="w accent" data-at="1.46">hill</span></span>
</p>
```

| Markup | Does |
|---|---|
| `.w` | A word. Faint (`--faint`) until it is spoken |
| `data-at="1.46"` | The word turns to full ink at 1.46 s, over 0.1 s (`data-ramp` to change) |
| `.w.lit` | Full ink from the start, with no time needed. Key frames use this |
| `.w.accent` | The red word. Faint red until lit, like any other word |
| `.w.out` | Holds its place but is not on the sheet: lets one word stand alone exactly where it sits in the line |
| `data-pulse="1.46"` | The word swells 6% and settles over 0.42 s |
| `data-in="a b"`, `data-out="a b"` | On a `.lyric`, a `.row` or a `.w`: arrives or leaves between a and b seconds. `a` equal to `b` is a change in one frame |
| `.swap` | Holds two settings of one word in one place, so the first can leave (`data-out`) as the second arrives (`data-in`): a word reset with a capital and a full stop |

`Stipple.line(el, rows, opts)` writes this markup from word times. Times are in
whatever clock `Stipple.update(root, t)` is called with: seconds from the shot's
start if the line is inside a shot.

Do not put film.js's `data-fade`, `data-fadeout` or `data-rise` on a line or a
word. They write the opacity that the faint and lit states need.

## The drawing

Dots only, in an `<svg viewBox="0 0 1920 1080">`, inside a `<g class="stipple">`.

| Call | Draws | Use for |
|---|---|---|
| `Stipple.shade(g, { tone, box })` | A drawing modelled by dot density. `tone(x, y)` says how dark each place is (0 paper, 1 close-set dots, up to 2 nearly solid) and the dots are set as a hand sets them: unevenly spaced, a few large among many small, edges that come out as ragged rows, light tone thinning to scattered points | Anything a viewer looks at: an object, a lit window, a face of a wall. This is the kit's way of drawing |
| `Stipple.noise(seed)` | Smooth seeded noise, -1 to 1, for tone functions | Read every edge through `x + 2 * n(x / 22, y / 22)` so none runs straight; multiply tone by `0.8 + 0.3 * n(...)` so no flat is flat |
| `Stipple.trail(g, { d })` | A band of fine dots along a path, thickest on its centre line, 44 px wide by default | A road, a shoreline, a horizon |
| `Stipple.beads(g, { d })` | Single dots spaced along a path, never quite evenly. Sizes and spacing are yours | Stepping stones: the first marks of a line before it fills in. Never an outline: a closed path of beads reads as a dotted box |
| `Stipple.halo(g, { x, y, w, h })` | An even cloud of dots round a knife-edged rectangle of bare paper | A far-off glow only. For a window a viewer looks at, write a tone function and use `shade` |

How to draw with `shade` (the `lyric-video` run's `04-moodboard/drawing.js` is a worked window):

- Give each part of the thing a tone, not an outline. Decide where the light comes from; the sides turned away are 1.4 to 1.9, the sides toward it 0.8 to 1, and the drawing thins to scattered points (tone under 0.1) toward the light.
- An edge is where the tone stops. Read positions through a noise so it wanders about 2 px.
- What is lit is paper left alone: return 0 there, and let the dark straggle 3 to 6 px over its edge at an uneven depth.
- Use larger dots (`r: [1.3, 2.7]`, `tight` about 3.3) for the structure and fine ones (`r: [1.1, 2.0]`, `tight` about 2.7) for shading, as two calls into one group.
- For something that grows, pass `k` (darkest and nearest first reads as a hand at work) and `even: true`, so a share in `data-grow` is a share of the dots.
- Never: dots at an even pitch, a straight edge, a ring of equal dots, an evenly random cloud.

Every dot has an order from 0 to 1. `data-share="0.5"` on the group shows half
of them (a still); `data-grow="1.2 0, 4.6 0.17, 7.8 0.33"` grows the drawing
through those pairs of time and share. Several calls into one group share its
order (`order: [0.05, 0.3]` places a call inside it).

Dots are seeded: the same call gives the same dots, on every render worker and
in every shot. Changing a path, a size or a seed moves every dot, so settle the
drawing before timing it.

A dot under about 3 px across disappears when a 1920 px frame is shown 390 px
wide. Anything that must read on a phone needs mass, not big dots: a band of
close-set dots at least 10 px wide (see the unlit window in the `lyric-video`
mood board, which reads at 390 px as a shuttered window).

## Grammar

- One sheet from the first frame to the last. A new line is new words on the same sheet, never a new scene.
- Type on the left, drawing on the right and along the bottom. Nothing nearer an edge than about 7% of the width or 10% of the height.
- Most of the sheet is bare paper: ink covers about 1.5% of it at the start and under 5% at the fullest.
- One face, one size, one weight. No second line of small type.
- Red is one word. No red dot, rule or underline.
- Punctuation is the lyric's own: set what the line has and add none. Apostrophes are curly (`&rsquo;`).
- The drawing has no drawn lines, no fills and no grey. Tone is how close the dots stand; an edge is where the tone stops, ragged, never ruled.
- Nothing drifts or zooms: the sheet lies still so the words can be read. What keeps a held line alive is dots landing.
- Never: gradients, drop shadows, a second colour, a second face, text in corners, a drawn line, a dot that moves once it has landed.

## Cost

The filter runs on the lyric block only. A full-size render runs at about ten
frames a second on four workers, so a 24 second film at 30 frames a second takes
about 75 seconds. A drawing of 11,000 dots (the `lyric-video` window, night and road) costs about
half a second to lay out when the page opens and nothing per frame beyond the
dots that land.
