# Doghouse: a 3D build story with a twist

A 42-second vertical short (9:16): how a doghouse becomes a secret bunker. The script is a chain,
each step solving a problem until the next "But..." opens a new one: a hole under the doghouse, but
dirt walls cave in, so concrete rings 6 m down and a ladder; but a hole isn't a hideout, so a room at
the bottom; air through a vent that comes up as the doghouse's tiny chimney; power under the lawn;
lights, a bed and Wi-Fi; but every bunker needs a second way out, so you keep digging, under the
garden, under the fence, until you break through... into your neighbour's bunker. His doghouse
doesn't have a dog either. Built entirely from code with Blender (`bpy`), free CC0 assets and a free
neural voice; the ground is shown in cutaway and is actually dug on screen (boolean cutters).
Rendered natively at 1080x1920.

- `doghouse_captions.mp4`: the short with burned-in one-word captions (upload this one)
- `doghouse.mp4`: the same without captions
- `thumbnail.jpg`, `poster.jpg`, `UPLOAD_KIT.md`: thumbnail, stills, title, tags and pinned comment

## Script

> This doghouse has never had a dog. Because it isn't a doghouse. Start with a hole underneath it. But
> dirt walls cave in. So you lower concrete rings, one on top of another, six meters down. Add a
> ladder. But a hole in the ground isn't a hideout. So at the bottom, you dig sideways, and pour a
> room. Down here, you need air. So the vent comes up through the doghouse roof, as a tiny chimney.
> Run power under the lawn, and now you've got lights, a bed, and Wi-Fi. But every bunker needs a
> second way out. So you keep digging. Under the garden. Under the fence. Until you break through...
> into your neighbor's bunker. Turns out, his doghouse doesn't have a dog either.

## Shots (21, cut to the narration)

The doghouse with REX over the door and a chimney, a push into the dark doorway onto a ladder going
down, the doghouse shoved aside and the first spadefuls, a cave-in raining dirt on the digger, the
rings lowered from a tripod and stacking from the bottom up, "6 m", the ladder sliding down, standing
cramped at the bottom, the room dug out sideways and poured, fanning the stale air, the vent rising
through the doghouse and the chimney popping up, a glowing cable running under the lawn, the lights
clunking on with the furniture, lying back with a laptop, sitting up to look at the blank wall, the
pickaxe, crawling down the tunnel under the garden and the fence, the wall bursting, the neighbour
in his armchair lowering his newspaper, and his doghouse (MAX, with its own chimney) with yours across
the fence.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS) line by line, plus `vo_timing.json` |
| `timeline.py` | The 21-shot list, cut to the narration; each shot is an exterior or a cutaway |
| `grounds.py` | The two gardens, the soil in section with boolean cutters for the shafts, rooms and tunnel, the doghouses, the ring shafts and ladders, both bunkers and their furniture, the vent and chimney, the cable, the tunnel liner, the wall that bursts, the tools |
| `shots.py` | The build (cutters, rings, ladder, pour, vent, cable, lights, liner, the burst), the poses, and a moving camera per shot (the tunnel and cable shots track the digging) |
| `scene.py` | Builds everything, keys per-shot visibility (the cutaway hides everything in front of the section), the head lamp and exposure; renders stills, a preview or the frames |
| `sound.py` | Synthesised sound design and music, mixed under the narration |
| `fetch_assets.py` | Downloads the Poly Haven textures, sky and models |
| `test_site.py` | Check renders of the set |

Shared with `../pool`: the cast (`people.py`) and the sound toolkit; with `../apple`: prop primitives
(`props.py`); with `../lightning`: tree and keying helpers and the base sound toolkit; with
`../quicksand`: characters, posing, material helpers, `assemble.py` and `thumbnail.py`.

## Run it

```bash
export QS_SCRATCH=/path/to/work/dir      # with dl/ (MakeHuman data) and tts/ (Kokoro model) as for ../quicksand
python3 fetch_assets.py
ttsenv/bin/python voiceover.py
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 1080 1920 10
python3 ../quicksand/assemble.py doghouse_captions.mp4 --captions --words 1 --cap-y 0.6 --cap-size 0.085
```

THUMB_LINE

## Licences

- Poly Haven textures, sky and models: CC0
- MakeHuman character data: CC0
- Kokoro TTS: Apache-2.0
- Sound and music: synthesised in `sound.py`
- Fonts: Open Sans (captions and signs, SIL OFL), Liberation (newspaper, SIL OFL)
