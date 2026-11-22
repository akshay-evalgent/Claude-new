# What if you put a jet engine in a car?

A two-minute 3D film, built in Three.js, that simulates bolting a small jet engine onto a family hatchback and flooring it on a dry salt lake at dusk. It plays live in the browser with its own synthesized soundtrack, and renders frame by frame to an MP4.

## What it shows

| Time | Chapter | What happens |
| --- | --- | --- |
| 0:00 | Title | The hatchback on the start line, backlit by the setting sun. |
| 0:07 | The swap | An x-ray scan reveals the 1.4-litre petrol engine, which lifts out. An airliner engine drops in, dwarfs the car and gets stamped "Too big". A business-jet engine lands on a roof pylon instead. |
| 0:24 | How a jet pushes | A cutaway opens the turbofan. Glowing air flows through the fan, compressor, combustor, turbine and nozzle, with the bypass stream around the outside. The engine then spools up from idle to full thrust. |
| 0:43 | Pushing on air | Force arrows compare a normal car (tyres push the road) with the jet (air pushed backwards). The blast throws traffic cones and salt dust behind the car. |
| 0:55 | Flat out | Countdown and launch. A speedometer, live force bars, a horsepower counter and a race against the original petrol car. Milestones at 100, 240, 290 and 400 km/h, a 3x fast-forward, then glowing streamlines show lift building over the roof. A bump tips the nose up, the car lifts off in 1/16 slow motion, and the film rewinds. |
| 1:29 | Stopping | Back at 480 km/h: throttle off and parachute out. A live energy split shows where 13.8 MJ goes. |
| 1:42 | The verdict | Fuel burn, a petrol-versus-jet scoreboard, and the answer. |

## The numbers

The run is a real simulation, integrated in the page:

- **Car:** 1,550 kg with the jet, driver and fuel. Drag area CdA 0.80 m², lift area ClA 0.66 m², rolling resistance 0.012.
- **Engine:** 15 kN static thrust. Thrust falls as speed rises: T = T0 (1 − 0.5 M).
- **Results:** 0–100 km/h in 3.0 s (the original 100 hp car needs about 12 s). Top speed on paper is about 550 km/h. At 500 km/h lift equals half the car's weight.
- **Braking from 480 km/h:** 13.8 MJ of kinetic energy, the same as 23 emergency stops from 100 km/h. A 3 m² parachute takes about 60%, air drag on the car 24% and the brakes 17%. The car stops in about 13.6 s and 830 m.
- **Fuel:** about 0.25 L/s at full thrust, so a 45-litre tank lasts three minutes.

## Files

- `film.html`: the film and its player.
- `index.html`: the same page wrapped as a standalone document; open it in a browser.
- `render.mjs`: renders the film to MP4 or stills with Playwright and ffmpeg.
- `thumbnails.mjs`: renders the YouTube thumbnails from the 3D scene.
- `youtube/`: the upload kit (title, description, tags, settings) and three thumbnails.

## Watch it

Open `index.html` in a current desktop browser. Space plays and pauses, the arrow keys skip 5 s, M mutes and F goes full screen.

## Render the video

Needs Node 18+, the `playwright` package with Chromium, and ffmpeg.

```bash
node render.mjs --jobs 3
```

This writes `jet-engine-in-a-car.mp4` at 1920×1080 and 30 fps, with the soundtrack normalised to −16 LUFS. `node render.mjs --stills 3.6,60,84 --dir stills` writes single frames for checking.

## How it is built

- **Clock:** every frame is a pure function of film time. A second "world clock" runs 3× in the fast-forward, nearly stops in slow motion and runs backwards in the rewind. The fan, gas flow, dust, wheels and car position all follow it, so they really do rewind.
- **World:** the car stays at the origin while a procedural salt-flat shader (Voronoi crust, motion streaks, painted guide line and start line) scrolls beneath it. Course posts and distance boards scroll with it, under a shader sky with cirrus clouds and two rings of hazy mountains.
- **Models:** the car body is lofted through superellipse sections. The turbofan is lathed, with twisted blade rings, and opens with a wedge cutaway whose cut faces show red.
- **Effects:** air and dust are stateless particles, and the streamlines are tubes with travelling pulses. Post-processing adds bloom, heat haze behind the nozzle, an anamorphic sun flare, and a tape-rewind look.
- **Sound:** an offline Web Audio score. Engine rumble, roar and whine, plus wind and tyre noise, follow the simulation through parameter curves. A driving bass pulse plays during the run.
