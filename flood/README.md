# Flood: a Zack D. Films-style 3D short

A 58-second vertical short (9:16): why a foot of rushing water can float your car, what the water does to
it on the way, and a punchline. Narrated to "you", a new shot every 1.5 to 2 seconds, side and front
cutaways through the water, an x-ray "box of air" with lift arrows, and burned-in captions. The script and
everything in it are original; every fact is from the National Weather Service or NOAA (see
`UPLOAD_KIT.md`). Built entirely from code with Blender (`bpy`), free CC0 assets and a free neural voice.

- `flood_captions.mp4`: the short with burned-in captions (upload this one)
- `flood.mp4`: the same without captions
- `thumbnail.jpg`, `poster.jpg`, `UPLOAD_KIT.md`: thumbnail, stills, title, tags and pinned comment

## Script

> Just one foot of rushing water can carry your car away. Even if the car in front of you made it
> across. Flash floods rise fast, and you can't tell how deep the water is. At six inches, water reaches
> the bottom of your car, and the engine can stall. At one foot, your car can start to float. That's
> because your car is basically a giant box of air. A foot of water pushes up on it with about fifteen
> hundred pounds of lift. Your tires lose their grip on the road, and the current slams into the side of
> your car with hundreds of pounds of force. Two feet of rushing water can carry away even SUVs and
> trucks. And the road under the water might not even be there anymore. That's why more than half of all
> flood drownings happen in vehicles. So if you see a flooded road, turn around, don't drown. And if the
> water rises around you, get out and get to higher ground, if it's safe. He took the long way home. The
> guy in front of him took the scenic route.

## Shots (32, cut to the narration)

aerial of the red sedan coming down to a flooded crossing in the rain, the brown water racing across the
road, the yellow convertible ploughing through ahead, the driver watching, a depth gauge as the water
climbs, the road disappearing into murky water, a split-level shot at the waterline showing how deep the
gauge really is, a side cutaway at six inches with the water at the floor pan, under the car, the dash and
headlights dying as the engine stalls, a cutaway of the water reaching his feet, the car lifting at one
foot, an x-ray of the car as a box of air, glowing lift arrows, a close cutaway of the lift, the tires
leaving the road, a front cutaway with current arrows slamming into the door, the car swept off the road,
an SUV and a pickup carried away with hazards blinking, the road washed out under the surface and in
cutaway, cars stranded downstream, the ROAD FLOODED sign, him turning around, wading to higher ground, the
long way home past a DETOUR sign at golden hour, and the convertible's driver drifting down the river on
his hood with his arms crossed, ducks for company.

## Files

| File | Job |
|---|---|
| `voiceover.py` | Narration with Kokoro (Apache-2.0 TTS) line by line, plus `vo_timing.json` |
| `timeline.py` | The 32-shot list, cut to the narration |
| `valley.py` | The flooded crossing: heightfield valley with the road, washout and high-water mud line, muddy flowing water with foam and waves, side, front and washout cutaways with layered sections, storm and evening skies, depth gauge, signs, poles, trees, grass, floating debris, arrows, the x-ray air material, ducks and spray |
| `vehicles.py` | SUV and pickup variants of the shared car (raised body, short cab, open bed) |
| `shots.py` | Floating and drifting motion for every vehicle, the performances (driver posed on the wheel, turning around, wading, high ground; the convertible driver on his hood), water level, foam, effects timing, 32 moving cameras, visibility per set |
| `scene.py` | Builds everything; renders stills, a preview or the full frames (mist fog and bloom in the compositor) |
| `sound.py` | Synthesised sound design and mix (rain, rushing water, splashes, slosh, engine and stall, chime, groans, gurgles, underwater, crumble, quacks, music with a plucked motif, ducking) |
| `test_set.py` | Check renders of the set, the cutaways and the vehicles |

Shared with `../lightning`: the car (`car.py`) and the rain, wet ground, trees and sky helpers
(`storm.py`). Shared with `../quicksand`: the character (`human.py`), posing (`posing.py`, `anim.py`),
material helpers (`sets.py`), encoding and captions (`assemble.py`) and `thumbnail.py`.

## Run it

```bash
export QS_SCRATCH=/path/to/work/dir      # with dl/, tts/ and the lightning assets/ as for ../lightning
ttsenv/bin/python voiceover.py
ttsenv/bin/python sound.py
python3 scene.py preview 216 384 6 2
python3 scene.py render 720 1280 10
python3 ../quicksand/assemble.py flood_captions.mp4 --captions --upscale 1080 1920
```

Thumbnail: frame 408 (0:17), rendered natively at 1080x1920 with `python3 -I scene.py stills 408 --res 1080 1920 --samples 64`
and captioned with `python3 -I ../quicksand/thumbnail.py`.

## Licences

- Poly Haven textures, skies and grass: CC0
- MakeHuman character data: CC0
- Kokoro TTS: Apache-2.0
- Sound and music: synthesised in `sound.py`
- Open Sans (captions and signs): SIL Open Font License
