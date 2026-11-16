# Which Short formats go viral (data, Nov 2026)

## How this was measured

1. **Top Shorts across 30 format hashtags:** satisfying, gadgets, didyouknow, engineering, howitworks, simulation, techtips, quiz, techhistory, chatgpt, aitools and others.
2. **Whole Shorts tabs of 18 channels** that specialise in the winning formats. A format only counts if a channel gets views **consistently** (its median) with a modest subscriber count, not from a single fluke hit.

## The ranking

| Rank | Format | Evidence (median views per Short, whole channel) | Can I make it alone? | Rights risk |
|---|---|---|---|---|
| 1 | **"0% vs 100%" physics simulations** (soft, metal, cloth…) | Kintsugi 3DCG: **118K median** (recent 173K), 12 over 1M, 103K subs. Blendverse 3D: **359K median** on 15 Shorts, 30K subs. DariaFX: 60K median (recent 96K) with **only 11K subs**. | **Yes.** I generate everything, with no footage, voice or permissions. | **None** (100% original) |
| 2 | **"How/why does X work?"** (real process footage, factory/industrial curiosity) | Explorer Hub: **305K median**, 23 over 1M, 75K subs. Wild Dark Files: 70K median, 168K subs. | Partly. Needs process clips from you (like our first channel). | Medium (reused clips) |
| 3 | **Interactive "pick one"** ("What was your first phone?", numbered grid, comment your number) | Aerulus: 85K median, top **23M**, 48K subs | Partly. Needs images and memes. | Medium |
| 4 | **Tech oddity text story** (our 7-second text template, with *product fails and weird tech facts* as topics) | Signal 404: 49K median, **recent 84K**, 12 over 1M with 20K subs ("The iPhone That Bent in Your Pocket" 11M, "Gold Is in a RAM Stick" 5M) | Yes, with our existing `textstory.py` | Medium (reused clips) |
| — | For comparison: tutorials, tool lists, founder stories | Github Awesome 23K, Starter Story 12K, founder channels about 1K | — | — |

**Why #1 wins:**
- It needs no language, so it's watched globally.
- The outcome is uncertain ("will 100% squash it flat?"), so people watch to the end.
- It loops naturally (100% back to 0%), and replays count as views.
- It invites comments: "do 1000%", "try it with a phone".
- Each video is a new simulation, so it's original content made by us, not reused footage.

## Sample made: "0% vs 100% Soft vs Hydraulic Press" (18s)

`softsim.py` simulates and renders everything from scratch:
- **The ball** is a 2D soft-body physics simulation. Incompressible, with a smooth skin and a rigidity setting.
- **Softness levels:** 0% makes the press stall and shake with a creak, 25% bulges slightly, 50% forms a pill, 75% a slab, and 100% squashes flat and squishes out past the press plate.
- **Look:** glossy gold shading, a brushed-steel press, soft shadows.
- **Sound:** synthesized hydraulic hum, thud, squish and creak, at -14 LUFS.
- **Rights:** no footage, no voice and no permissions needed.

**How to make it look premium:** the top channels render in 3D with Blender. I downloaded Blender 4.2 LTS from blender.org and verified its checksum, but this session blocked extracting and running it. If you allow it, or install Blender yourself, the same series can be rendered in true 3D. That's the quality level of Kintsugi and Blendverse.

## Series plan (one a day, each a different simulation)

- **0% vs 100% Soft:**
  - press
  - spikes
  - a too-small hole
  - stairs
  - a blender
- **0% vs 100% Bouncy:** a ball on a trampoline, a ball in a pinball machine
- **0% vs 100% Sticky:** a ball rolling down a ramp
- **0% vs 100% Heavy:** dropped on a glass floor
- **Which one survives?** Five materials (jelly, rubber, glass, steel, gold) vs the press

**Titles** (the pattern the leaders use):
- "0% vs 100% Soft Ball vs Hydraulic Press"
- "What happens at 100% softness?"
- "Soft 0% vs Soft 99%"

**Pinned comment:** "What should go in the press next? 👇" Then make the most-liked suggestion. That builds a loop of commenters coming back.

**Rules:**
- Change the scene, object and setup every video, so it's never the same template. That keeps it clear of YouTube's "repetitive content" rule.
- Keep each one 15–25s.
- Put the most extreme level last.

## Before choosing between the formats

You said the tutorial format "didn't work". If you share its Studio numbers (stayed to watch %, average viewed %, views after 48h), I can tell whether the problem was the opening seconds, the length or the topic. That would change which of these formats suits the channel best.
