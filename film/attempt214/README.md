# ATTEMPT 214

A wordless 2:30 animated short for whatifgraphics, painted in code in the Impasto · Palette Knife style:
a moving oil painting made of knife strokes, raked by light. The world is grey; her paper planes are the one
coloured thing. She throws 213 planes at a high wall and every one falls. On attempt 214 the plane clears the
wall, a boy on the other side (on his own mountain of blue planes) throws one back, and the knife re-lays the
world in colour. End line: "Most people stop at 213."

## The engine (written for this film)

- `js/impasto.js`: WebGL2 palette-knife renderer. Each stroke is a slanted, canted plane of paint with a ridge where the
  blade pressed, a lip where it lifted, broken streaks where the paint ran out and a second colour dragged in. Strokes write
  colour and height; the compose pass rakes light across the height field, turns the world grey (the luminance of the same
  strokes, slightly cool) and re-lays colour stroke by stroke from a point (`revC`, `revR`), lays one plate over another in a
  sweep (`B`, `mix`), and grades. Rendered 2× supersampled, no grain. Cameras work in design space (1920×1080 or 1080×1920).
- `js/plate.js`: reference illustration → strokes. Sets are flat, value-planned shapes in groups; strokes are generated coarse
  to fine, follow silhouettes near edges, and never cross groups (enforced per pixel on the GPU). Titles are glyph groups.
- `js/fig.js`: moving things rebuilt every frame from fixed seeds (the girl, the boy, the kids, paper planes, the piles, rain,
  flight trails that paint themselves). Two-bone IK arms; front, side and back views; moods.
- `js/sets.js`: the wall in six seasons (grey, rain, autumn, snow, spring, sunset), the section (the wall edge-on with both
  yards), her room at night, the desk, knife-laid titles.
- `js/film.js`: 15 shots on a 96 BPM bar grid, and three thumbnails.

## Build

```
node render.js --still --w 960 --h 540 s04_montage@6     # review a frame
node render.js --jobs 3 --out out/shots s01_canvas …     # render shots (see UPLOAD.md section 6)
python3 score.py master out/audio/master_mix.wav          # score and sound
python3 assemble.py master && python3 assemble.py short && python3 assemble.py preflight
python3 captions.py out/final/captions
```

Score and foley are synthesised (`score.py`, using the LANTERN instrument library): pizzicato, harp, glockenspiel pops that
climb one step per attempt, piano, a solo cello, strings; knife scrapes on every paint-over, paper, rain, and a hard silence
with one drip. Her motif never resolves while she fails and resolves when the colour comes back.
