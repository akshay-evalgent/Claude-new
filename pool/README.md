# Pool: a step-by-step 3D build short

A 47-second vertical short (9:16) in the "How a ___ Becomes a ___" build format: how a swimming pool
becomes a secret garage. The narration tells the build to "you" as short instructions: dig the hole,
pour the floor and walls, put in a car lift, then the trick: four hydraulic rams under a steel tub,
tiled and filled, with the deck laid flush round it. Then the button: the whole pool rises, water and
all, and the car comes up from underneath. Built entirely from code with Blender (`bpy`), free CC0
assets and a free neural voice; the garage is shown in cutaway, the ground cut open like a diorama.

- `pool_captions.mp4`: the short with burned-in one-word captions (upload this one)
- `pool.mp4`: the same without captions
- `thumbnail.jpg`, `poster.jpg`, `UPLOAD_KIT.md`: thumbnail, stills, title, tags and pinned comment

## Script

> This is how a swimming pool becomes a secret garage. Start with a hole in your backyard. Ten meters
> long, and four meters deep. Pour a thick concrete floor, and walls strong enough to hold back the
> ground. At one end, a car lift. Park your car on it. Now the trick. In each corner, a hydraulic ram
> that can lift thirty tons. On top of them, a steel tub, as big as the hole. Tile it, and fill it with
> water. Lay the deck around it, so the edges line up perfectly. To everyone else, it's just a pool.
> But press this button, and the whole pool rises. Water and all. Underneath, your car comes up to
> meet you. Press it again, and it sinks back down, like nothing ever happened. Congratulations. Your
> neighbors just think you really like swimming.

## Shots (22, cut to the narration)

The finished pool already up with the car beneath it (the hook), the lawn marked out, the hole dug in a
time-lapse with dirt flying and "10 m" and "4 m" marked, the slab poured from a pump hose and the
walls rising (in cutaway), the scissor lift unfolding and the car lowered into the garage, the builder
grinning at "Now the trick", the four telescopic rams extending, the tub lowered by crane, the tiles
sweeping in and the water filling, the deck boards dropping into place and the flush edge up close,
the finished pool with its owner on a lounger, the remote's red button, the pool rising, the water
in section above the garage, the car coming up on the lift and driving out under the pool, the pool
sinking back, a toast, and the neighbour peering over the fence.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS) line by line, plus `vo_timing.json` (spoken text and on-screen caption per line) |
| `timeline.py` | The 22-shot list, cut to the narration; each shot is an exterior or a cutaway |
| `people.py` | The builder (you) and the neighbour (MakeHuman CC0 data), with a modelled hard hat and sunglasses |
| `gen.py` | The pool mosaic tiles and the remote's button, drawn with PIL |
| `yard.py` | The backyard, the ground in section, the concrete garage, the tub with its tiles and water, the telescopic rams, the scissor lift, the deck, the house, the fence and the props |
| `shots.py` | The build animation (digging, pouring, the lift, the rams, the crane, the tiles, the water, the deck, the rise and the sink), the poses, and a moving camera per shot |
| `scene.py` | Builds everything, keys per-shot visibility (the cutaway hides the ground in front of the section), exposure; renders stills, a preview or the frames |
| `sound.py` | Synthesised sound design and music, mixed under the narration |
| `fetch_assets.py` | Downloads the Poly Haven textures, sky and models |
| `test_cast.py`, `test_yard.py` | Check renders of the cast and of the yard |

Shared with `../lightning`: the car (`car.py`), tree and keying helpers (`storm.py`) and the sound
toolkit. Shared with `../apple`: the prop primitives (`props.py`) and the glasses (`cast.py`). Shared with
`../quicksand`: the characters (`human.py`), posing (`posing.py`, `anim.py`), material helpers
(`sets.py`), encoding and captions (`assemble.py`) and `thumbnail.py`.

## Run it

```bash
export QS_SCRATCH=/path/to/work/dir      # with dl/ (MakeHuman data) and tts/ (Kokoro model) as for ../quicksand
python3 fetch_assets.py
ttsenv/bin/python voiceover.py
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 720 1280 10
python3 ../quicksand/assemble.py pool_captions.mp4 --captions --words 1 --cap-y 0.52 --cap-size 0.074 --upscale 1080 1920
```

THUMB_LINE

## Licences

- Poly Haven textures, sky and models: CC0
- MakeHuman character data: CC0
- Kokoro TTS: Apache-2.0
- Sound and music: synthesised in `sound.py`
- Fonts: Open Sans (captions, SIL OFL)
