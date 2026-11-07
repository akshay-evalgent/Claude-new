# Episode 1 video: first cut

**Next version:** the character-driven cut built from Google Flow shots. See `../flow/README.md`. This first cut also serves as its fallback for any shot not made yet.

`ep01-first-cut.mp4` is the full episode: 11:28, 1920×1080, 30 fps, with the three-voice voiceover from `../audio/`.

## What's in it

- **Every scene of the script, in order.** Each visual appears when its narration line starts, using the line timings in `../audio/timings.json`, so picture and voice stay in sync.
- **The channel's screen furniture throughout:**
  - chapter labels top-left and progress dots top-right;
  - the source of each claim bottom-right;
  - the safety tag on exercise scenes.
- **Motion graphics in the style guide:**
  - stat rings that count up;
  - the week-of-meals chart, the phone-battery energy split, and the 585-person response chart;
  - the scale's weekly average, food and protein counters, and the shake build;
  - the six move cards, the level-up XP bars, the rest timer, and the plan table;
  - the 12-week timeline and the FAQ cards.
- **Anatomy kit assets:**
  - the zoom to the biceps, and the muscle and fibre views;
  - the brain and nerves close-up and the nerve-signal loop;
  - the muscle turntable;
  - every muscle highlight in the six moves.

## Stand-in art: replace before publishing

Rohan and Tiger don't have final art yet, so this cut uses stand-ins. A small "FIRST CUT · STAND-IN ART" tag sits top-right on every frame.

| Character | Stand-in | Made by |
|---|---|---|
| Rohan | Concept host A, cut out and narrowed below the neck so he reads as skinny | `scripts/video/characters.py` |
| Tiger | The anatomy skin figure, widened and tinted grey: a bald, bulky "big guy" | `scripts/video/characters.py` |

The script's NEW assets are drawn as simple ink icons and charts: food, the stomach, the blender and the phone. The 585-person chart shows an illustrative spread with the study's real range of −2% to +59%, and it's labelled as illustrative.

**To finish the episode:**
1. Make the character reference sheets and the shots in Google Flow. Follow `../flow/README.md`.
2. Put the clips in `../flow/shots/`.
3. Run `python3 scripts/video/assemble_ep01.py`. It writes `ep01-flow-cut.mp4`, using the Flow shots and falling back to this cut wherever a shot is missing.
4. Before publishing, set `DRAFT = False` in `scripts/video/ep01_video.py`, so the fallback frames lose the "first cut" tag.

## Files

| File | What |
|---|---|
| `ep01-first-cut.mp4` | The full episode with audio |
| `thumbnail-draft.jpg` | 1280×720 thumbnail draft, built from the stand-in host and the chest highlight |
| `stills/scene-NN.jpg` | One frame per scene, for quick review |
| `art/` | The stand-in host and rival cut-outs |

Captions are not burned in. Upload `../audio/vo.srt` to YouTube as subtitles.

## Re-render

```bash
python3 scripts/video/characters.py
```

```bash
python3 scripts/video/ep01_video.py stills
```

```bash
python3 scripts/video/ep01_video.py
```

`characters.py` remakes the stand-in art. `ep01_video.py stills` writes one review frame per scene in a few seconds. The last command does the full render, about 15 minutes on 4 CPU cores. Change any scene's look in its `sN()` function in `ep01_video.py`. Timing always follows the voiceover.

## Not in this cut

- **Music.** Add a quiet bed under the voice in the editor. Royalty-free sources like the YouTube Audio Library work. Keep the voice about 12 to 15 dB above the music.
- **Sound effects** on pops, the ring count-ups and the level-up.
