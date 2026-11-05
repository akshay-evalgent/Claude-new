# LANTERN

A 2:30 wordless animated short and three Shorts for the whatifgraphics channel, made entirely in code in this folder: picture, music and sound. The concept and the reasons behind it are in `film/viral-study/`. The upload steps are in `UPLOAD.md`.

> Every morning at 4:30 a father lights a lantern, scratches one mark on the wall by the door and walks into the dark so his son can sleep. Twenty years later the son, stuck in his own snooze loop in the city, comes home and sees the wall: 7,300 marks.
> **He gave you 7,300 mornings. Give him one.**

## 1. Why this look

The reference library (Lemo-Opuscar, 66 film styles made in code) was scored on the same levers as the virality model in `film/viral-study`. Scores are 1 to 5; they multiply because the funnel multiplies.

| Style | Story fit | Click-through at feed size | Audience breadth | Unlike the copy swarm | Reads without words | We can make it well | Relative |
|---|---|---|---|---|---|---|---|
| **Paper-cut Lightbox** | 5: the film is about a lamp, and light through cut holes turns the tally marks into slits of light | 5: one warm light in a dark frame | 5: paper lamps are a universal object | 5 | 4 | 4 | **1.00** |
| One-line Drawing | 4: a life drawn in one line, passed to a child | 2: thin lines vanish at 168 px | 4 | 4 | 4 | 4 | 0.20 |
| Shadow Puppetry | 3 | 3: bright screen, low contrast | 3: reads as folk heritage | 4 | 4 | 4 | 0.17 |
| Impasto Oil | 3 | 4 | 4 | 4 | 4 | 2 | 0.15 |
| HD-2D | 4, but its demo is a girl carrying the last flame through a storm, too close to ours | 4 | 3: reads as a game | 4 | 3: leans on dialogue boxes | 2: needs a 3D pipeline | 0.12 |

The lightbox grammar we kept: flat sheets in depth with a value ladder (back light and cool, front dark), warm light glowing through paper, a rim of light on every top edge, soft cast shadows, holes that burn and bloom, jointed silhouettes that only rotate, music box and felt piano. The "native moves" used: *the lamp turns on* (the wall reveal), *silhouette in a window* (the father in the doorway), *locked frame with only light changing* (twenty years of mornings in one frame, the dawn), *silence* (the phone dies), and *the box as keepsake* (the last shot pulls out to the paper lamp on a bedside table).

## 2. Structure

80 BPM, a beat is 0.75 s; cuts land on the beat grid. Acts split 35 / 43 / 23%.

| Time | Shot | Beat |
|---|---|---|
| 0:00 | S01 | A match flares in the dark; a lantern catches; the clock says 4:30 |
| 0:03 | S02 | He cuts the first mark into the wall; it glows. He leaves; the door closes |
| 0:07 | S03 to S04 | Rain, the road, the warehouse, the bicycle, home at dusk |
| 0:20 | S05 | Twenty years in one frame: each morning the lamp turns on and the marks spread; the boy grows |
| 0:27 | S06 | Storm. The flame nearly dies; he turns his back to the wind and shields it |
| 0:33 | S07 | The school gate: he waves; the boy looks away |
| 0:39 | S08 | The teenager asleep under a phone's blue light; the father turns the phone over |
| 0:45 | S09 | The son leaves for the city; the father in the lit doorway; the door closes |
| 0:52 | S10 to S12 | The city: snooze ×3; tallies on sticky notes, ripped off; blue fog at 2 a.m. |
| 1:13 | S13 | "Dad" calling. Declined. Again. "Missed calls · Dad (2)" |
| 1:20 | S14 | The phone dies. Silence |
| 1:24 | S15 | He comes home, strikes a match, lights the lantern: 7,300 slits light up the whole wall |
| 1:37 | S16 | 4:30. He is up before his father and cuts mark 7,301 |
| 1:42 | S17 to S18 | His mornings now: the lantern on the desk, push-ups, notes that stay, the storm, the same shielding pose |
| 1:56 | S19 | Dawn. He brings the light home; they sit on the step; he blows the lantern out |
| 2:06 | S20 | Years later: he wears the cap, a child sleeps, he strikes a match and cuts a first mark |
| 2:14 | S21 | Pull out: it was a paper lamp on a bedside table. A phone beside it: "Calling Dad…". LANTERN. *He gave you 7,300 mornings. Give him one.* |

## 3. Files

| File | Role |
|---|---|
| `engine.py` | The lightbox renderer (skia): sheets in depth, camera with parallax, light through paper, rim and band, cast shadows, paper grain, bloom; jointed puppets with IK; lantern, match, clock, tally wall, text as paper |
| `sets.py` | The old house, the road, the house front, the school, the city flat, the phone |
| `shots.py` | The 21 shots, their timing and the sound events each one makes |
| `render.py` | Cuts (master and three Shorts), parallel render to H.264, contact sheets |
| `score.py` | Synthesised score and effects on the same clock; music box, felt piano, harp, strings, drum |
| `mux.py` | −14 LUFS integrated, −1 dBTP, AAC 320k, faststart |
| `preflight.py` | Measures hook, pace, black runs, end hold, loudness, cuts on the beat |
| `captions.py` | English SDH plus the on-screen words in six languages |
| `thumbs.py` | Three 1280×720 thumbnails and their feed-size previews |
| `r_read.py` | After posting: is it spreading (R > 1) and where will it land |

## 4. Rebuild

```
pip install skia-python scipy numpy fonttools pillow    # skia needs libegl1 on Linux
python3 render.py sheet master 0 150 40                  # quick look
python3 render.py video master out/master_silent.mp4
python3 score.py master out/master_mix.wav
python3 mux.py master out/master_silent.mp4 out/master_mix.wav out/final/LANTERN_master_1080p.mp4
# Shorts: short_wall, short_lights, short_loop (same three steps)
python3 thumbs.py && python3 captions.py out/final/captions
python3 preflight.py out/final/*.mp4
```

## 5. Pre-flight

Filled in from `out/final/preflight.json` after the final render.
