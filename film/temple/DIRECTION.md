# The Pool Remembers — a ten-second temple clip, directed as Nolan would

Reference only: `src/reference.webp` (Nandi before a stepped temple tank, morning light through the canopy).
No pixel of it is used. The whole picture is generated in code: a raymarched signed-distance scene
in one GLSL fragment shader. Deliverables: `temple-10s.mp4` (1920x1080, 24 fps, mono score) and
`index.html` (the same film rendered live in WebGL with sound; open it and press PLAY).

## How Nolan would think about ten seconds

1. **Time is the subject, not the temple.** The temple is a thousand years old and the pool has
   been doing the same thing every morning for all of them. Ten seconds is nothing against that,
   so the clip should make the viewer feel time rather than see architecture.
2. **One shot. One camera move. No cuts inside the picture.** A constant-velocity dolly push toward
   Nandi's eye, the way the IMAX camera creeps toward the bookshelf in *Interstellar*. No handheld,
   no drift, no zoom-in-then-out. The camera is a witness, not a participant.
3. **One event.** A single drop falls into the pool. That is the entire plot. The ring it makes is
   the clock face (*Inception*'s glass of water; *Dunkirk*'s ticking watch).
4. **Then the mechanism is revealed.** A clock tick. The frame holds for three frames. Time runs
   backward, about twice as fast as it ran forward, and the ring folds back into the point where the
   drop landed. The dolly pulls back out. The grade goes colder. (*Tenet*: the inverted world is
   the same world with the temperature wrong.)
5. **Cut to black before the viewer is ready.** Hard cut, hard silence. The title arrives alone,
   small, tracked-out, one word. Nolan never explains; the card is the only text.
6. **Practical light.** The shafts through the canopy and the dust in them already exist in the
   plate. The animation only lets them breathe. Nothing glows that could not glow on set.
7. **Score as structure.** A Zimmer-style Shepard tone rises under the push-in so the ear feels a
   climb that never resolves; it descends during the inversion. The drop, the tick and the title
   pulse are the only percussive events. No melody.

## Shot list (t = clock seconds)

| t | Picture | Sound |
|---|---|---|
| 0.00 – 0.70 | Black. | Drone (55 Hz) fades in. |
| 0.70 | Hard cut in, already pushing. 1.0x. | Shepard riser begins. |
| 2.10 | The drop lands at the pool's centre (story-time 1.4). Ring spreads at 0.42 m/s. | Plink + stone-hall tail. |
| 0.70 – 6.00 | Dolly 0.75 m forward toward Nandi's eye, constant velocity, true 3D parallax. Spout ripples, surface swell, dust settling in the shafts. | Riser climbs; drone breathes. |
| 6.00 – 6.12 | Freeze. Three frames. | Single clock tick. |
| 6.12 – 8.70 | Inversion: story-time runs 5.3 → 0 in 2.58 s. Ring contracts, dust rises, dolly pulls out. Grade desaturates 14 % more and shifts cold. | Riser descends; drop plays reversed at 8.02; faint high shimmer. |
| 8.70 | Hard cut to black. | Silence. |
| 9.00 – 10.00 | TEMPLE, 0.45 s fade, hold. | One low pulse (64 → 38 Hz). |

## Look

- Desaturated 24 %, lifted cold shadows (slate-teal), slightly warm highlights, +10 % contrast.
- 35 mm grain, anamorphic chromatic spread at the frame edges, heavy but soft vignette.
- 16:9 full frame; no letterbox (Nolan dislikes masking the picture).

## The scene, all in code

- **Nandi**: smooth-unioned ellipsoids and capsules (body, hump, neck, long muzzle, dewlap, folded legs,
  tail), crescent horns, leaf ears, a ceremonial cloth shell over the back, two garland tori with bells,
  an eye; dark granite with faint lichen and carved banding. On a two-step plinth with fallen leaves.
- **The tank**: a cavity carved from the pavement, coping, a far wall with two lion-head spouts and
  falling jets. The water is an analytic plane with a height field (two spout sources, the drop packet,
  slow swell): reflection by a second raymarch, refraction to a tiled floor with caustics, Fresnel, glints.
- **The temple**: a pillared hall with mouldings, niches, a deep black doorway and a stepped roof; a
  curvilinear nagara shikhara (softened-square plan, stepped courses, ratha ribs, sukanasa, amalaka,
  kalasha) with a smaller tower to the right and a low shrine to the left.
- **Trees**: trunks, a banyan limb with hanging roots, noise-displaced canopy blobs, a foliage wall behind.
  The sky is seen through a procedural leaf canopy; the same canopy mask gates the sun.
- **Light**: a sun behind the temple to the upper right, soft shadows, ambient occlusion, sky ambient
  and side bounce; volumetric shafts marched along the view ray through the canopy mask; dust motes.
- **Look**: desaturated 18 %, cold shadow tint, warm highlights, soft shoulder, S-curve, vignette,
  35 mm grain. The inversion desaturates a further 14 % and shifts colder.

## Pipeline

```
python3 build/make_audio.py   # score.wav / score.m4a, synthesised from the same timeline
python3 build/pack.py         # inlines the score -> index.html (self-contained, ~190 KB)
node build/render.cjs         # Playwright renders 240 frames (W, Q env) and ffmpeg muxes temple-10s.mp4
node build/render.cjs 2.1,6.0 # stills at those clock times -> build/still_*.png (DBG=1..4 for debug views)
```

Every frame is a pure function of clock time, so the browser page and the rendered MP4 are the same film.
The live page caps its internal width at 960 px because every pixel is raymarched; the MP4 was rendered
at 1280x720 in software (SwiftShader) and upscaled to 1080p.
