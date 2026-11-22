# YouTube upload kit: What if you put a jet engine in a car?

Video: `jet-engine-in-a-car.mp4`, 1:59, 1920×1080, 30 fps, original soundtrack. Render it with `node render.mjs --jobs 3`.

## Title

**What If You Put a Jet Engine in a Car? | 3D Physics Simulation**

That's 62 characters, so it fits before YouTube cuts it off on most screens.

Alternatives to test:

- Jet Engine on a Family Car: 0–100 in 3 s, Then It Flies
- A Jet-Powered Hatchback, Simulated: 550 km/h and a Parachute Stop

## Description

Paste everything inside the block. The first two lines are what shows before "...more".

```text
We swap a family hatchback's 100 hp petrol engine for a small jet engine, bolt it to the roof and let the physics play out: 0–100 km/h in 3 seconds, lift-off past 500 km/h, and a parachute stop.

Everything in this video is a 3D simulation built in Three.js. The speeds, forces and distances come from a physics model of thrust, air drag and lift that runs frame by frame.

CHAPTERS
0:00 The swap
0:24 How a jet engine works
0:43 Pushing on air, not the road
0:55 Flat out: 0 to 500 km/h
1:29 Stopping from 480 km/h
1:42 The verdict

THE NUMBERS
• 0–100 km/h: 3.0 s with the jet, about 12 s with the original engine
• Top speed on paper: about 550 km/h
• At 500 km/h, lift from the air flowing over the car equals half its weight
• Stopping from 480 km/h means getting rid of 13.8 MJ, as much as 23 emergency stops from 100 km/h. The parachute takes about 60% of it.
• Fuel: about 0.25 litres per second at full thrust, so a 45-litre tank lasts three minutes

THE ASSUMPTIONS
• Car: 1,550 kg with the jet, driver and fuel
• Engine: a small business-jet turbofan, 15 kN of thrust, about 300 kg
• Aerodynamics: drag area 0.80 m², lift area 0.66 m²
• Parachute: 3 m² of drag area; brakes only below 250 km/h
It's a simplified model. It leaves out things like the engine's thrust pitching the nose down and exactly how tyres fail at these speeds, so treat it as a well-informed "what if". Please don't try this.

The music and sound effects were synthesized for this video.

#JetEngine #Physics #Simulation
```

## Tags

Paste into the Tags field (about 330 of the 500 characters allowed):

```text
jet engine car, jet car, jet engine in a car, what if, physics simulation, turbofan, how a jet engine works, thrust, aerodynamic lift, car takes off, parachute braking, 3d animation, three.js, engineering explainer, salt flat, land speed record
```

## Thumbnails

Three 1280×720 JPEGs, each well under YouTube's 2 MB limit. Upload all three with **Test & Compare** so YouTube picks the winner by watch time. If you only use one, use A.

| File | Moment | Text |
| --- | --- | --- |
| `thumbnail-a.jpg` | The car in the air, nose up, airflow lines streaming over it | 550 KM/H / THEN IT FLIES |
| `thumbnail-b.jpg` | Coming at the camera at speed on the salt flat | 0–100 / IN 3 SECONDS |
| `thumbnail-c.jpg` | From behind at sunset, jet at full thrust on the start line | JET ENGINE / IN A CAR? |

The bottom-right corner is kept clear for YouTube's duration badge. `node thumbnails.mjs` re-renders them from the 3D scene; the moments, camera angles and words are at the top of that file.

## Settings

- **Category:** Science & Technology.
- **Audience:** this is general-audience science content, so "No, it's not made for kids" fits, but that's your call to make.
- **Altered or synthetic content:** the video is clearly a 3D animation, and YouTube's guidance exempts clearly animated or unrealistic content from the label. Check the current wording when you upload.
- **Music:** the soundtrack is original and generated in the page, so it shouldn't trigger copyright claims.
- **End screen:** the last 10 seconds hold the closing line on the left, so put end-screen elements on the right half.
