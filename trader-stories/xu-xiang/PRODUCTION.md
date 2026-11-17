# Xu Xiang: production plan and time estimate

## Status

- Steps 7 and 8 (graphics templates, and this film's graphics shots): built in
  `trader-stories/motion`. All 82 graphics shots, the scoreboard and 24
  overlays are wired and render. What is left there is review and polish once
  the voice is recorded and the real timings are known.

## What the film needs

From `SHOTLIST.md`: 175 shots, about 15½ minutes at the narration pace. Music-only stretches and the editor's pacing will push it towards 17-18.

| Work | Count | Made by |
|---|---|---|
| Illustrated scenes | 93 shots from 68 images (204 generated, 3 per image) | Kaggle notebook, then camera moves in the edit |
| Diagrams | 23 shots | Motion graphics |
| Number cards and scoreboard | 17 | Motion graphics template |
| Animated charts | 13 | Motion graphics, from Shanghai Composite daily data |
| Document cards | 11 | Motion graphics template |
| Quote and title cards | 10 | Motion graphics template |
| Maps | 4 | Motion graphics |
| Black | 4 | |

## Time estimate

Assumes one person working full days who already knows an editor (Premiere,
DaVinci Resolve) and a motion tool (After Effects or similar), and a human
narrator. This is the first film, so it includes building the reusable
graphics templates.

| # | Step | Time | Notes |
|---|---|---|---|
| 1 | Close the fact-check list in `RESEARCH.md` | 1 day | 8 open items; read the blocked SCMP, Bloomberg and AP pieces |
| 2 | Lock the script | ½ day | Read aloud, trim, rebuild the shot list (`python3 build_shotlist.py`) |
| 3 | Kaggle setup and check run | 1-2 hours | Hugging Face licence, token, dataset upload, `RUN_MODE = "check"` |
| 4 | Full image run | 1½-3 hours of GPU, unattended | Estimate, not measured: 204 images at roughly 40-70 s each across two T4s, plus about 20 min of downloading and loading. The check run prints the real figure |
| 5 | Pick images, redo the misses | 1 day | Expect 20-30 % to need a new seed or a prompt fix, so 2-3 short reruns |
| 6 | Record and clean the narration | 1 day | About 2 h recording, 3 h editing. A synthetic voice would take about 2 h |
| 7 | Build the graphics templates | 3 days | One-time: scoreboard, chart animator, number, quote and document cards, map style, diagram kit |
| 8 | Make this film's 82 graphics shots | 4 days | Diagrams take the longest (23 of them) |
| 9 | Camera moves on the 93 scene shots | 1½-2 days | Includes depth parallax on about 20 key shots |
| 10 | Edit to the voice | 2 days | |
| 11 | Music and sound design | 1-1½ days | A sound on most cuts; music drops out under the quotes |
| 12 | Review, fixes, captions, export | 1 day | Last pass against `RESEARCH.md` |
| 13 | Thumbnail, title, description with sources, upload | ½ day | |

**Total: about 17-19 working days for one person, so roughly 3½ to 4 weeks.**

- **Two people** (one on research, script and voice; one on motion and edit):
  about **2 to 2½ weeks**. The motion and edit work is the critical path at
  about 11 days.
- **Film two onwards:** templates are reused, so about **9-11 working days**
  solo.
- **GPU cost:** nothing. Kaggle gives about 30 GPU hours a week, and this film
  needs roughly 3-6 including reruns.

## Where the time goes, and how to cut it

The images are the cheap part. Graphics (steps 7-8) are 40 % of the schedule.
To get the first film out sooner:

- Merge similar diagrams. The section 5 method and the section 9 scheme share
  one diagram on purpose; doing the same for the section 6 dividend loop saves
  about a day.
- Start graphics on day 1, in parallel with the fact-check. Most of them do
  not depend on the open items.
- Hold depth parallax for later films and use plain camera moves on stills.

## Order of work

1. Days 1-2: fact-check, lock the script, Kaggle check run. Start the templates.
2. Days 2-4: full image run, picking, rerolls. Record the narration once the script is locked.
3. Days 3-10: graphics and camera moves.
4. Days 11-15: edit, sound, review.
5. Day 16 onwards: fixes, thumbnail, upload.
