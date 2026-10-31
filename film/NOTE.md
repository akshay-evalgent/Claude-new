# NOTE.md — motionmaxxing test on "Map From Memory (SHORT)"

Test of the `motionmaxxing` skill (Tejashmakwana/motionmaxxing @ 8c8ec0f) in its
"rate and repair" mode, on an existing render. No source HTML was available, so
`lint.mjs` (gate G5) could not run; G1, G4 and G5 were judged by eye on
`look/sheet.jpg`, `look/dense.jpg` and full-resolution stills.

## The film

- `input/draft.mp4`: 1080x1920 vertical, 24 fps, 880 frames, 36.67 s, h264 + AAC stereo.
- An ink-wash illustrated narrative short with voice-led captions: a boy of four
  is taken, sold to a family 1,000 miles away, draws his home village from memory
  decades later, posts the map online, and is reunited with his mother after 33 years.
- It is a story film, not a product or brand motion graphic, which is what the
  skill was built and measured on (53 SaaS-style launch moments).

## Script numbers (`look.py input/draft.mp4 --frames 24 --expect-audio`)

| Measure | Value |
|---|---|
| Cuts detected | 14 (15 shots), mean shot 2.44 s, min 0.71 s, max 7.50 s |
| Still stretches (picture unchanged >= 0.6 s) | 5.83-6.75 s (0.92 s); 6.75-8.21 s (1.46 s); 22.67-23.29 s (0.62 s); 35.29-36.67 s (1.37 s) |
| Final shot | 29.17-36.67 s = 7.50 s = 20 % of the film |
| End hold (picture unchanged at the end) | 1.67 s (last 40 frames) |
| Mean frame-to-frame luma change | 1.6/255 (human-made films: median 6.8, IQR 4.4-9.8) |
| Audio | -13.8 LUFS integrated, -1.3 dBTP, LRA 3.6 LU, audible 100 % of the run |
| Cut-to-sound sync | 8 of 14 cuts within +-80 ms of a sound onset (57 %; pros ~35 %); 3 near misses at +103 to +188 ms |

## Gates

| Gate | Result | Evidence |
|---|---|---|
| G0 render exists | PASS | decodes, moves, audio present (no `--expect` length given) |
| G1 proof readable | borderline, by eye | caption x-height is roughly 0.035-0.04 H, at the gate's floor; the illustration is always readable |
| G2 no empty frame | PASS | no run of more than 3 flat frames |
| G3 end card hold | FAIL (narrow) | end hold 1.67 s > 1.40 s; final-shot share 20 % is within the 25 % limit |
| G4 one hero per frame | PASS, by eye | one figure or one drawing per frame; the two-figure frames (parents and child, reunion) read as one group |
| G5 no page chrome | not run; by eye, two leads | a tracked-caps label "33 YEARS" with a red seal in the top-right corner of the final shot; small year labels ("1989", "2004", "2012") centred near the top. The bottom caption with its red square bullet sits at the same coordinates through every shot, which the skill's rule 9 ("a pinned object") would flag |

## What the skill's rules would say, and whether to believe them

Real leads worth acting on:

1. **The end hold.** 1.67 s of frozen picture. A gentle drift on the mountains or
   the pair walking a few more steps would keep the ending alive and pass G3.
   Cheap alternative: trim to 35.8 s (`ffmpeg -i input/draft.mp4 -t 35.80 -c copy`).
2. **The still stretch at 5.83-8.21 s.** 2.4 s of unchanged picture across the
   train and "he was alone" beats. That is the longest dead patch in the film.
3. **The corner label.** "33 YEARS" plus the seal in the top-right corner is the
   one thing in the film that looks like page chrome. Setting it as the picture
   (the pair small under the words, centred) would be more in the film's own
   grammar than a lanyard in a corner.
4. **Cut sync is strong**: 57 % of cuts land on a sound onset; three cuts are
   100-190 ms late and would read tighter nudged onto the hit.

Rules that misfit this film and should be ignored:

- **Motion band.** 1.6/255 is far below the "human band", but the band was
  measured on UI-forward 3-7 s launch moments. A held ink drawing with a
  voice over it is the point of this film, not a defect.
- **"Almost nothing fades", "cut on motion", "arrive from oversize".**
  These are brand-film laws. The film's quiet dissolves and held compositions
  are a deliberate style, and the skill's own `judgment.md` section 8 allows
  calm films to break them.
- **The pinned caption.** Burned-in captions are standard for a vertical
  social short watched muted. Rule 9 is about pills and docks in product promos.
- **"Repair".** The skill repairs by rebuilding the film in its HTML/GSAP
  runtime. That would throw away the hand-drawn ink artwork. There is no
  repair path for a finished illustrated render except re-editing the cut.

## Rating on the skill's own scale

**Mid to maxxed, not slop.** One idea carried through (the map), one world
(ink on paper, one red accent that means "home"), the ending gets smaller,
and the sound is cut to picture. The honest fails are a slightly long end hold
and a corner label on the last shot.

## Verdict on the skill, for this kind of film

- The **checking half** (`look.py`) earned its keep in about 20 seconds: it
  surfaced the end hold, the dead stretch, the cut-sync numbers and the loudness,
  all correct and actionable.
- The **creative half** (SKILL.md laws, never-ship list, brand capture, the
  GSAP runtime) is built for product and brand launch films and does not
  transfer to narrative or illustrated work. Several of its rules would make
  this film worse if followed literally.
