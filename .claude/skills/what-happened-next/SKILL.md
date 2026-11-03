---
name: what-happened-next
description: Make a "WHAT HAPPENED NEXT" YouTube Short - a ~37-second follow-up on a viral moment people remember (the happy ending, then "BUT...", three dated chapters in black and white, colour returning on the drop with where things stand now, a mending-heart ending). Use when the user asks for a follow-up, "where are they now", part 2 of an earlier story, or the next episode of this series.
---

# WHAT HAPPENED NEXT

Read `shorts/formats/what-happened-next/FORMAT.md` (slots, rules) first. Example: `shorts/episodes/whn-little-messi/`
(`episode.json`, `EVIDENCE.md`, `POST.md`).

## Steps (from `shorts/`)
1. **Research first.** Web-search the later chapters (aim for three dated facts plus the latest status). Fetch the key articles and quote
   them into `EVIDENCE.md` with dates. Write down what is NOT known; captions say "last reported, <year>" when nothing newer exists.
2. **Safety check** for anyone at risk: no location, school or contact details on screen, even if a source printed them.
3. **Footage:** owner permission or licensed (see the channel playbook). If the user must download, give the `yt-dlp --download-sections`
   command; YouTube blocks downloads from this machine and its bot check must not be bypassed.
4. `python3 -m beatcut.template new what-happened-next episodes/whn-<subject>`, copy clips, fill `episode.json`
   (black-and-white chapters use `grade: {"sat": 0}`; big dates are their own caption at `y: 0.3`, `size: 0.12`).
   Match the mood of each shot to its caption (no smiling shot under bad news).
5. `python3 -m beatcut.template build episodes/whn-<subject> --bpm 90` (or `--track`), `python3 -m beatcut.story ... --stills`, fix, render,
   `python3 -m beatcut.thumb ...` (two panels: colour "then" over black-and-white "now", `bw: true`).
6. QA: frames at "BUT…", each chapter, the colour return on the drop, the heart; heartbeat cues; loudness about -14 LUFS.
7. Fill `POST.md`; remind the user to record one voice line for the drop and to upload the full-quality render.
