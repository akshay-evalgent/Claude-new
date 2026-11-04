# Image prompts: your own mascot in the same drawn style

The reference channel's figures are detailed grey pencil-and-ink manga drawings on black with one colour
on the character. You get the same quality from any current image model (Midjourney v7, GPT-image,
Flux, Ideogram, Leonardo) if you hold four things fixed: **the style block, the character block, pure
black, and no colour except the signature item.** The red muscle highlight is added by the engine, so
you never bake it into the art. One clean grey figure gives you any number of highlight shots.

## 1. Decide the character once (write it down, never paraphrase it)

Fill this in and paste it word for word into every prompt:

```
CHARACTER = a lean, athletic young man, early twenties, short black textured crop haircut,
calm focused expression, defined but not bodybuilder-sized muscles, visible forearm veins,
barefoot, wearing only {SIGNATURE COLOUR} athletic shorts
```

Pick a signature colour that is *not* orange (that's The Rep Theory's mascot). Then set the same colour
as `theme.accent` in your episode file so the UI and the mascot match. Good options against the red
highlight: electric blue `#2F8CFF`, volt `#C6FF3D`, magenta `#FF3DB8`, cyan `#29D3FF`.

Want a second character for comparisons (the "big guy")? Write a second block the same way.

## 2. Style block (identical every time)

```
STYLE = highly detailed graphite pencil and ink manga illustration, fine cross-hatching,
realistic anatomy with visible muscle striation and tendons, dramatic but soft top-left light,
strictly monochrome greyscale except the {SIGNATURE COLOUR} shorts, isolated full figure on a
pure solid black background (#000000), no floor, no ground shadow, no background objects,
no text, no watermark, clean silhouette edges
```

## 3. Shot prompts

Single figure, exercise pose (use 2:3 or 3:4 so the figure is tall; the stage adds the black around it):

```
{STYLE}. {CHARACTER}, performing a dead hang from a steel pull-up bar, arms straight overhead,
shoulders slightly engaged, feet off the ground, front view, full body visible from bar to feet.
```

Swap the action part for each move:

| Move | Action text |
|---|---|
| Dead hang | performing a dead hang from a steel pull-up bar, arms straight overhead, front view |
| Scaled hang | hanging from a low bar with toes resting on a wooden box, front view |
| Farmer carry | walking forward holding a heavy kettlebell in each hand at his sides, three-quarter view |
| Plate pinch | pinching two smooth weight plates together between fingers and thumb, arm hanging, side view |
| Wall hold | holding a deep wall sit, thighs parallel to the floor, back flat against an implied wall, side view |
| Calf hold | holding a single-leg calf raise at the top, heel high, side view |
| Isometric push | pushing hard against an immovable heavy steel rack, body leaning at 45 degrees, side view |
| Close-up forearm | close-up of a forearm and hand gripping a thick bar, tendons and flexor muscles visible |

Comparison (the hook shot):

```
{STYLE}. Two figures on pure black: on the left {BIG GUY}, straining and leaning back in a
tug of war, face red-shadowed with effort (still greyscale); on the right {CHARACTER}, standing
relaxed and holding the same thick rope with one hand. Wide 16:9 composition, empty space at the
top centre for a handwritten label.
```

Character sheet (do this first, then use it as the reference for everything else):

```
{STYLE}. Character turnaround sheet of {CHARACTER}: front view, side view, back view, standing
neutral, evenly spaced on pure black, same scale, no labels.
```

## 4. Keeping the character consistent

- **Midjourney:** generate the character sheet, then add `--oref <sheet url> --ow 100` (omni reference; older versions use `--cref`). Keep `--style raw`, and reuse the `--sref` of the first image you liked.
- **GPT-image / ChatGPT:** upload the character sheet and say "same character, same style, new pose: ...". Ask for "pure black background, no colour except the shorts" every time.
- **Flux (Kontext) / SDXL with IP-Adapter:** use the sheet as the reference image and keep the seed for a given pose.
- Generate 4-8 options per pose and keep the one whose hands are right. Hands are where these models fail.

Negative prompt (where supported): `colour background, gradient, floor, shadow, text, watermark, signature, extra fingers, fused fingers, blurry, painterly colour`.

## 5. Getting the image into an episode

1. Export PNG at 2000 px tall or more.
2. If the background isn't perfectly black, cut it out (remove.bg, Photoshop "Remove background", or `rembg`) and save a transparent PNG or WebP. Black is fine if it's really #000.
3. Put it in `assets/plates/`, add an entry to `assets/plates/plates.js` with its pixel `w` and `h`.
4. Draw highlight regions: run `python3 tools/grid.py assets/plates/your-file.png`, open the grid image, and write the outline of the muscle as an SVG path in those pixel coordinates (`M x,y L x,y ... Z`). Keep it rough: the engine feathers the edge by 26 px.
5. Use it: `s.plate({ plate: 'your-name', x: 560, y: 560, h: 1000, highlight: [{ region: 'forearm', at: 1, sweep: [x1, y1, x2, y2] }] })`. `sweep` runs from where force starts to where it ends.

## 6. Thumbnails

Same assets, bigger: the comparison image full-bleed, a two- or three-word hand label in white
(Kalam Bold, 120-160 px at 1280×720) and one thick red marker arrow pointing at the highlighted muscle.
You can frame one in the player (pause on the hook frame) and screenshot it, or render a still:
`node tools/render.mjs <episode> --stills 6.5`.
