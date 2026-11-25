# Ink-wash style kit

Ink and grey wash on warm paper, one accent colour, a quiet italic caption. Built
to match the "Map From Memory" short (`film/`): the palette was measured from
its stills, and the caption size and position were estimated from them.

## Parts

| File | What it is |
|---|---|
| `ink.css` | Colour and type tokens, the mark classes, the caption |
| `ink.js` | The SVG filters that make shapes look brushed. Load it with a script tag |
| `paper.jpg` | The paper ground, 1080x1920. Regenerate with `make_paper.py --ground <hex>` |
| `fonts/` | Cormorant Garamond roman and italic (SIL Open Font License, see `fonts/OFL.txt`) |
| `example.html` | A three-shot worked example. Open with `?play`, or `?t=4.2` to stop on a moment |

## Tokens

Set these on `:root` to restyle. A mood board's `style.json` overrides them.

| Token | Default | Use |
|---|---|---|
| `--paper` | `#e9e1cd` | Ground. Also regenerate `paper.jpg` if you change it |
| `--ink` | `#26221e` | Lines, solid shapes, captions |
| `--wash` | `#8f8579` | Grey areas, at low opacity |
| `--accent` | `#af4336` | The one colour. Give it one meaning and use it once per shot |
| `--caption-size` | `72px` | About 3.75% of frame height |
| `--caption-y` | `88.3%` | Caption centre line, from the top |

## Marks

Draw in an SVG with `viewBox="0 0 1080 1920"` and give each path a class.

| Class | Looks like | Use for |
|---|---|---|
| `ink` | A brushed line, 9 px. Add `fine` (4 px), `heavy` (16 px) or `hair` (2 px, no wobble) | Outlines, ridges, belts, ground lines, routes |
| `blot` | A solid ink shape with a rough edge | Hair, feet, leaves, anything black |
| `dry` | A solid shape with streaks of paper showing through | Robes, roofs, bamboo: the signature texture |
| `wash` | A soft-edged grey area. Add `pale` or `deep` | Bodies under a dry edge, hills, shadows |
| `mist` | A very soft, very pale area | Far mountains, fog |
| `accent` / `accent-line` | The accent colour, filled or as a line | The one marked thing |
| `label` | Italic text inside the drawing. Add `small` | A distance, a year |

Build a figure in layers, back to front: a `wash` body, a `dry` shape over it for
the brushed edge, `ink fine` lines for folds, a `blot` for hair and feet. A single
flat fill reads as clip art.

## Grammar

- One subject per shot, in the middle third. Most of the frame is empty paper.
- Faces are a few fine lines. No hands. Figures are a robe and a head.
- The lower fifth belongs to the caption. Keep artwork above 82% of the height.
- Captions are two or three words, italic, with the accent-coloured square before them.
- Lines draw on (`data-draw`) in the order a hand would draw them. Areas fade in (`data-fade`).
- Every held shot drifts a little (`data-drift="0 -26 1.04"`). Nothing sits frozen.
- Cut by default. Dissolve when time passes. Iris when entering a memory.
- Never: gradients, drop shadows, a second colour, text in corners, ruler-straight lines.

## Cost

The filters are drawn by the processor. A full-size render runs at about nine
frames a second on four workers, so a 36 second film takes about two minutes.
Filter a group once, not each of its hundred children.
