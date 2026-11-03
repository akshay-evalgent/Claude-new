# MoCha: "This is Dave."

Vertical short, 1080x1920, 60 fps, 46.0 s, loops on itself.
Repo: https://github.com/Orange-3DV-Team/MoCha (paper: arXiv 2601.08587, CVPR 2026)

## The angle

MoCha swaps the person in a video for a new character. It needs one mask on the
first frame and a reference photo, and the new character keeps every move of the
original. So the story is about the person who gets swapped out: Dave, an actor with
questionable dance moves. Every character in the film is a different body drawn on the
same skeleton, which is the paper's claim acted out.

Story beats: setup (Dave), the swap (wow), what older methods needed (comedy of
excess), what MoCha needs (one mask, one photo), the reveal (same dance, any body),
the gag (it copied Dave's dancing too), the catch (sarcasm, honest limits), the ending
(Dave is fine, he makes mochas now), and a cut back to the first frame so it loops.

## Beat sheet (120 BPM, bars start at 1.0 s)

| Time | Picture | On-screen text | Sound |
|---|---|---|---|
| 0.0 | Dave dances under a spotlight on a film set | This is Dave. / Dave is an **actor.** | marimba theme, pizz bass, snaps |
| 2.0 | Cyan target brackets lock onto Dave, a scan line sweeps down and re-renders him as a robot | TARGET: DAVE | lock beeps, scan hum, riser, snare roll |
| 3.0 | Robot finishes the dance, club beams, giant WAS. behind him | WAS. | impact, trap drop |
| 4.5 | Camera rams into the robot's chest light | | whoosh, flash |
| 5.0 | Steam from a mocha rises and forms the MoCha logo, shine sweep, subtitle types on, CVPR 2026 stamp slams | END-TO-END VIDEO CHARACTER REPLACEMENT / Swap the actor. Keep **every move.** | shimmer, typing, ding, stamp |
| 9.0 | Cards slam in: masks multiply on every frame, an OpenPose skeleton, a depth map | Older AI swaps needed: | card slams, mask counter ticks |
| 12.5 | A glitching OUTPUT.mp4 of Dave, three failures tick off | And it still broke when: he grabbed a cup / the lights changed / he danced like Dave | music bit-crushes, error buzzes |
| 14.4 | Dark overlay | *Flawless.* | music cuts, womp |
| 15.0 | Everything is sucked into a point, cream page opens | MoCha needs: | suck whoosh |
| 15.75 | A brush paints an orange mask over Dave on frame 1, snaps to a clean silhouette | **1 mask.** FIRST FRAME ONLY | brush swish, clean bells |
| 17.0 | A polaroid of the robot drops in | **1 photo.** OF THE NEW GUY | shutter |
| 18.5 | Cards fly apart | That's it. | silence |
| 19.0 | Iris out from the full stop. Video, mask and photo break into tokens that merge into one stream, through the model block, out as robot frames | Everything goes in as **one stream.** | data bleeps, build, snare roll |
| 21.0 | Dave and the robot split by a sliding wipe, same dance on both sides | ORIGINAL / MOCHA. Same dance. **New actor.** | impact, drop 2 with hook, swishes |
| 25.0 | A new body every beat (astronaut, knight, cat in a suit, hologram, robot), giant name behind the legs | Any character. / Same **moves.** | zap per switch |
| 29.0 | Freeze frame: the cat stuck in Dave's knee-up T-rex pose, Dave inset in the same pose | It even copied **Dave's dancing.** / *Some things AI can't fix.* | record scratch, music muffled, ba-dum-tss |
| 33.0 | CRT power-off | Okay. The **catch.** | tape stop, CRT whine |
| 34.2 | A laptop runs `python inference_mocha.py`, loads Wan2.1-T2V-14B at 2 %, overheats, then lifts off on rocket flames | It runs on a **14-billion-parameter** base model. / Your laptop just achieved **liftoff.** | ticking clock, fan spin-up, alarm, rocket |
| 37.0 | A tiny 832x480 frame with CAD dimension lines and a 2.7 s timeline | Demo clips in the repo: **2.7s** at **480p.** / *Relax, Hollywood.* | boops |
| 39.65 | The frame goes dark except the robot's red eye | *...for now.* | boom, drone, glitch |
| 41.0 | Café: Dave behind the counter in an apron, waving, holding a MOCHA cup | Dave's fine, by the way. / He makes **mochas** now. | marimba theme returns, warm pad |
| 43.3 | CTA card | Orange-3DV-Team/MoCha · arXiv 2601.08587 · CVPR 2026 / Follow before you get **replaced** too. | slide, pop |
| 45.0 | Whip pan back to the opening shot (frame 46.0 = frame 0.0) | | whoosh; the music loops into the pickup |

## Fact check (every claim on screen)

| Claim | Source |
|---|---|
| End-to-end video character replacement | README title |
| CVPR 2026 | README updates: "Paper accepted by CVPR 2026" (2026.02.21) |
| Older methods needed per-frame masks plus pose and depth guidance | README abstract: "reliant on per-frame masks and explicit structural guidance (e.g., pose, depth)" |
| They broke with objects, lighting and unusual poses | Abstract: "fragile in complex scenarios involving occlusions, rare poses, character-object interactions, or complex illumination" |
| MoCha needs one mask on the first frame | Abstract: "requires only a single first-frame mask" |
| Plus a reference photo | README "Test your own video": reference images, a front-facing face close-up recommended |
| Everything goes in as one token stream | Abstract: "unifying different conditions into a single token stream" |
| 14-billion-parameter base model | README setup: download Wan2.1-T2V-14B |
| Demo clips are 2.7 s at 480p | `results/*.mp4` in the repo: 832x480, 81 frames at 30 fps |
| Inference code + ComfyUI workflow | README updates (2025.10.21) |
| "MASK 240/240", "THERMAL STATUS: YES", the laptop lifting off | jokes, not claims |

The characters are coded illustrations of the idea, not MoCha output. The description says so.

## Why there is no real MoCha footage in it

The repo's demo clips come from feature films, and one replaces an actor with a
famous actor's likeness. Putting those in a monetisable Short risks Content ID claims
and likeness complaints. The film shows the mechanism with original characters, and
the description links to the real demos.

## YouTube packaging

**Title** (pick one)
1. This AI replaced Dave. He makes coffee now.
2. AI swapped this actor with one mask (he's a barista now)
3. One mask, one photo, new actor: MoCha explained in 46 seconds

**Description**
> Dave was an actor. Then MoCha showed up.
>
> MoCha (CVPR 2026) swaps the person in a video for a new character. It needs one mask on the first frame and a reference photo, and the new character keeps every move. Older methods needed a mask on every frame plus pose and depth maps.
>
> Repo: https://github.com/Orange-3DV-Team/MoCha
> Paper: https://arxiv.org/abs/2601.08587
> Project page: https://orange-3dv-team.github.io/MoCha
>
> The animation is a coded explainer made for this video. The characters are illustrations, not MoCha output. The real demos are on the project page.
>
> #shorts #ai #vfx #github #cvpr2026

**Pinned comment**
> Dave's dance survived three architectures. Which character should replace him next?

**Thumbnail / first frame**: Dave mid-dance under the spotlight. The loop means the first frame is also the last.
