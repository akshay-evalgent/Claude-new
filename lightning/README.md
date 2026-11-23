# Lightning: a Zack D. Films-style 3D short

A 51-second vertical short (9:16): why your car's tires don't protect you from lightning, what does,
what happens to the car, and a punchline. Narrated to "you", a new shot every 1.5 to 2 seconds, x-ray
cutaways, a macro of the bolt and burned-in captions. Script and everything in it are original; every
fact is from the National Weather Service or NOAA (see `UPLOAD_KIT.md`). Built entirely from code with
Blender (`bpy`), free CC0 assets and a free neural voice.

- `lightning_captions.mp4`: the short with burned-in captions (upload this one)
- `lightning.mp4`: the same without captions
- `thumbnail.jpg`, `poster.jpg`, `UPLOAD_KIT.md`: thumbnail, stills, title, tags and pinned comment

## Script

> If lightning ever hits your car, the rubber tires won't save you. That bolt just crossed miles of
> open sky. A few inches of rubber won't even slow it down. What actually saves you is the metal shell
> around you. When lightning strikes, thirty thousand amps hit the roof, race across the outside of the
> car, and blast through the tires into the ground. Inside, the current flows around you, not through
> you. The car isn't so lucky. The bolt is five times hotter than the surface of the sun. It can melt
> your antenna, blow out the tires, shatter the rear window, and fry the electronics. But you'll be fine,
> as long as the windows are closed, and the roof is metal. A convertible gives you no protection, even
> with the top up. So when the storm passes, you'll step out without a scratch. Your car, though...

## Shots (30, cut to the narration)

aerial of the car on a wet road in a storm, his face lit by a flash, the spinning tire, a bolt growing
down from the cloud base, tire close-up, an arc jumping over the rubber, the painted shell, x-ray reveal,
the strike, the antenna hit with current spreading over the roof, x-ray of the current racing over the
shell, current blasting through the tires into the road, x-ray of the current flowing around him, smoke,
a macro of the bolt, the sun, the antenna melting, a tire blowing out, the rear window shattering, the
dashboard frying, him relieved, rain on the closed window, rain bouncing off the metal roof, a
convertible, x-ray of the convertible hit (red current through the cabin), dawn, his morning stretch,
the hubcap rolling away, and the car sagging onto its flat tires.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS) line by line, plus `vo_timing.json` |
| `timeline.py` | The 30-shot list, cut to the narration |
| `car.py` | Procedural sedan and convertible: lofted body with boolean wheel wells, cabin with glass and pillars, interior, wheels with flat-tire shape keys and removable hubcaps, melting antenna, wipers, lights, x-ray copies, current paths snapped onto the shell |
| `storm.py` | Wet road set (asphalt with puddles, gravel, fields, poles and wires, tree lines, grass), storm and dawn skies, camera-attached rain, branching bolts, cloud base, sparks, smoke, glass shards, roof splashes, the sun |
| `shots.py` | The performance (seated driver posed with IK on the steering wheel, flinch, relief, dawn), all effect timing, 30 moving cameras, visibility per set |
| `scene.py` | Builds everything; renders stills, a preview or the full frames (bloom in the compositor) |
| `sound.py` | Synthesised sound design and mix (rain inside/outside, thunder, buzz, sparks, tire blast and hiss, glass, hubcap, birds, music, ducking) |
| `fetch_assets.py` | Downloads the Poly Haven textures, skies and grass |
| `test_car.py` | Check renders of the car on its own |

Shared with `../quicksand`: the character (`human.py`), posing (`posing.py`, `anim.py`), material helpers
(`sets.py`), encoding and captions (`assemble.py`) and `thumbnail.py`.

## Run it

```bash
export QS_SCRATCH=/path/to/work/dir      # with dl/ (MakeHuman data) and tts/ (Kokoro model) as for quicksand
python3 fetch_assets.py
ttsenv/bin/python voiceover.py
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 720 1280 10
python3 ../quicksand/assemble.py lightning_captions.mp4 --captions --upscale 1080 1920
```

## Licences

- Poly Haven textures, skies and grass: CC0
- MakeHuman character data: CC0
- Kokoro TTS: Apache-2.0
- Sound and music: synthesised in `sound.py`
- Open Sans (captions): SIL Open Font License
