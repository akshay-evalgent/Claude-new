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
| `stipple.js` | The dot drawing (`trail`, `beads`, `halo`, `reveal`), the lyric timing (`update`, `shot`, `line`) and the one SVG filter. Load it with a script tag. Its header is the manual |
| `paper.jpg` | The sheet, 1920x1080. Regenerate with `make_paper.py` |
| `make_paper.py` | The sheet generator: centre colour, how much the corners darken, creases, size |
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

`paper.jpg` is lightest in the middle (`#e0d1be`) and falls to `#d0b995` in the
corners. A palette tool reports its commonest tone, about `#d7c5aa`, and its
mean is `#dac9b0`. For a different ground, run
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
| `Stipple.trail(g, { d })` | A band of fine dots along a path, thickest on its centre line, 44 px wide by default | A road, a shoreline, a horizon |
| `Stipple.beads(g, { d })` | Single dots spaced along a path, never quite evenly. Sizes and spacing are yours | The first marks of a line before it fills in. On a closed path, an outline: something drawn but not yet lit |
| `Stipple.halo(g, { x, y, w, h })` | Dots gathering round a rectangle of bare paper, nearly solid at its edge and thinning to nothing | Anything lit: a window, a doorway, a page. The dark is drawn and the light is the paper left alone |

Every dot has an order from 0 to 1. `data-share="0.5"` on the group shows half
of them (a still); `data-grow="1.2 0, 4.6 0.17, 7.8 0.33"` grows the drawing
through those pairs of time and share. Several calls into one group share its
order (`order: [0.05, 0.3]` places a call inside it).

Dots are seeded: the same call gives the same dots, on every render worker and
in every shot. Changing a path, a size or a seed moves every dot, so settle the
drawing before timing it.

A dot under about 3 px across disappears when a 1920 px frame is shown 390 px
wide. Anything that must read on a phone before it is lit needs dots of 5 px or
more, set close (see the unlit window in the `lyric-video` mood board).

## Grammar

- One sheet from the first frame to the last. A new line is new words on the same sheet, never a new scene.
- Type on the left, drawing on the right and along the bottom. Nothing nearer an edge than about 7% of the width or 10% of the height.
- Most of the sheet is bare paper: ink covers under 1% of it at the start and about 4% at the fullest.
- One face, one size, one weight. No second line of small type.
- Red is one word. No red dot, rule or underline.
- Punctuation is the lyric's own: set what the line has and add none. Apostrophes are curly (`&rsquo;`).
- The drawing has no drawn lines, no fills and no grey. An edge is a row of dots; tone is how close the dots stand.
- Nothing drifts or zooms: the sheet lies still so the words can be read. What keeps a held line alive is dots landing.
- Never: gradients, drop shadows, a second colour, a second face, text in corners, a drawn line, a dot that moves once it has landed.

## Cost

The filter runs on the lyric block only. A full-size render runs at about ten
frames a second on four workers, so a 24 second film at 30 frames a second takes
about 75 seconds. A drawing of 7,000 dots costs under half a second to lay out
when the page opens and nothing per frame beyond the dots that land.
