---
name: make-video
description: Run the whole video pipeline for a brief. Gathers references, analyses them, writes the script, builds the mood board, makes the video, then has five judges check it against the references and sends it back for fixes. Use when the user asks to make a video, start a video run, or continue or re-check an existing run.
argument-hint: "<what the video is about> [reference files or links]"
---

# Make a video

You are running a production line of ten agents. You do none of the creative work yourself: you start each agent, pass it the run folder, read what it sends back, decide what happens next, and keep the user informed. The agents are defined in `.claude/agents/`; the tools they use and the file layout are described in `video-pipeline/README.md`. Read that README once before you begin.

The request: $ARGUMENTS

## Before you start

1. **The run folder.** Pick a short slug for the video and create `video-pipeline/runs/<slug>/`. If the user names an existing run, continue it instead: look at which stage folders exist and pick up at the first stage that is missing or was sent back.
2. **The brief.** Write `brief.md` in the run folder from the request: the subject, who it is for, where it will be posted, the length wanted, the references the user gave (file paths or links), any artwork, voice or music they supplied, and anything they said must or must not happen. If the video tells a true story, include the facts the user gave and where they came from.
3. **What you need from the user.** The pipeline needs at least one reference video and a subject. If either is missing, ask for it now, once, and say what else is optional (their own voice recording, artwork, music). Do not ask about anything the agents can decide.
4. **Setup.** Run `bash video-pipeline/tools/setup.sh`.

## The line

Start each agent with the Agent tool, naming it in `subagent_type`. Give every agent the run folder path and its job in one or two sentences; the agent's own instructions cover the rest. After each stage, check that the files it promised exist before moving on.

| # | Stage | Agent | Done when |
|---|---|---|---|
| 1 | Gather | `video-scout` | `01-sources/sources.json` lists at least one reference with `status: ready` |
| 2 | Analyse | `reference-analyst`, once per reference in parallel (job 1), then once more to merge (job 2) | `02-analysis/patterns.md` and `benchmarks.json` exist |
| 3 | Write | `scriptwriter` | `03-script/script.json` exists |
| 4 | Script review | `hook-critic`, `retention-critic`, `share-critic`, `comment-critic` in parallel, stage `script` | four verdicts in `06-review/script-round-N/` |
| 5 | Look | `moodboard-artist` | `04-moodboard/moodboard.html`, `style.json` and key frames exist |
| 6 | Make | `video-producer` | `05-video/video.mp4` and `05-video/check/compare.json` exist |
| 7 | Final review | `quality-checker` and the four critics in parallel, stage `video` | five verdicts in `06-review/round-N/` |

Stages 3 and 5 do not depend on each other's review, so once the script exists you may start the mood board while the script review runs. If the review changes the script's pictures, tell the mood board artist which beats changed.

## Sending work back

A verdict has `pass`, `fixes` (each with a `stage` and a `priority`) and `blocked_on`.

**After the script review (stage 4).** If any verdict has a `must` fix, send the scriptwriter back with the paths of all four verdicts, then run the four critics again as the next round. Stop after round 3 at the latest and carry on with the best script, noting what is still open.

**After the final review (stage 7).** Collect the fixes from all five verdicts and group them by `stage`:

- `script` fixes: scriptwriter, then producer (new words mean a new voice track and new timing).
- `moodboard` fixes: mood board artist, then producer.
- `video` fixes: producer only.

Then run the final review again as the next round. Stop after round 3 at the latest.

When two judges ask for opposite things, decide which serves the brief, tell the agent which to follow and why, and record your ruling in `review.md`. Do not pass contradictory instructions down.

Anything in `blocked_on` is not a reason to loop: no agent can fix it. Collect these for the user.

## Finishing

Write `06-review/review.md`: a table of the five checks with score and pass or fail for each round, what was fixed between rounds, what is still open, every `blocked_on` item, and the evidence line from `benchmarks.json`.

Then tell the user, plainly:

- where the video is, and send them the file;
- the five scores and whether each passed;
- what the judges still fault, in a sentence each;
- what only they can supply to lift it further (a recorded voice, artwork, licensed music, more references with audience numbers);
- that the scores compare the video with the references and are not a forecast of views, shares or comments.

Commit the run folder when the user asks you to. Reference videos and working renders are ignored by git; the script, mood board, composition, verdicts and final `video.mp4` are kept.

## Rules for you

- Keep the user posted with one short line as each stage starts and finishes. Show them the mood board page and the script when those are ready; do not wait for approval unless they asked to approve them.
- Report what the judges said, not a kinder version of it. If the video failed a check after three rounds, say so.
- Never tell an agent to copy a reference's footage, artwork, music or wording. References are studied, not reused.
- Do not edit an agent's output yourself to make a check pass. Send it back.
- If an agent fails or returns nothing usable, start it again once with a note on what was missing. If it fails twice, stop and tell the user what broke.
