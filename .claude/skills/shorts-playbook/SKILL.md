---
name: shorts-playbook
description: This repo's tested playbook for making YouTube Shorts (and Reels/TikToks) go viral, with scripts to audit a video, read its burned-in captions into a timed script, re-cut it in the gaps between words with a hook card and a seamless loop, and verify the render. Use it whenever the user is planning, scripting, making, editing, trimming, re-cutting, reviewing or posting a short vertical video, or asks why a Short did or didn't get views. That includes sharing a video file or Drive link, "make this go viral", "fix the hook", "get it under a minute", "what should I change", "edited footage vs animation", and logging a Short's results, even if they don't say "playbook".
---

# Shorts playbook

What we learned from modelling how the Shorts feed hands out views, and from editing real Shorts
in this repo. Use it to plan new Shorts and to fix existing ones.

## The idea in one paragraph

Views are impressions, and the feed hands them out in test → measure → expand cycles. Each cycle
multiplies by about E^κ, where **E** is the Short's edge over the median competing Short (built
from the viewed rate, APV and engagement, minus penalties). Because log views grow with the
*square* of ln E, small quality gains make enormous differences, and luck at the first small test
batch is large. The cheapest path to millions is a modest gain on several levers at once, in this
order: **stop subtracting → retention → hook → engagement → breadth**. The model's constants are
illustrative (YouTube publishes none), so say so when quoting numbers. Details and numbers:
`references/math.md`. Pitfalls from real edits: `references/editing-lessons.md`. Read both before
planning cuts.

## Editing an existing Short

1. **Get the file and check what it is.** Put it in `film/input/` (gitignored). For Drive links,
   see `references/editing-lessons.md`. Run the audit, look at `sheet.jpg`, and tell the user what
   the video actually is before applying any plan. Once, the "Map From Memory" link held a
   different film.
   ```bash
   python3 .claude/skills/shorts-playbook/scripts/audit.py film/input/<name>.mp4 --out <scratchpad>/<name>.audit
   ```
   `report.md` flags: over 60 s, late first words, a still opening, frozen stretches, a silent
   tail, a loop jump, loudness. `pauses.json` lists every gap in the voice; cut only there.
2. **Write out the script with timings.** Read `captions.jpg` (every caption change, timestamped)
   and write the narration as sentences with start times. If the caption band guess is wrong, pick
   it on `ruler.jpg` and re-run with `--caption-band y0:y1`. With no captions, ask the user for the
   script.
3. **Plan by the ladder.** For each item, say what you'll change and why:
   - *Stop subtracting:* over 60 s with third-party audio or footage → cut to under 60 s; reposted
     clips → flag them; uncleared photos → note them.
   - *Retention:* frozen picture, dead air, a silent tail; whole clauses that can go (date
     lead-ins, unpaid set-ups, distances, middle beats, credits).
   - *Hook:* the payoff in the first 1-2 s, by moving the payoff clip up or adding a title card in
     the video's own style.
   - *Loop:* dissolve the end into frame 0; find a last image that rhymes with the first.
   - *Engagement:* draft a pinned-comment question.
   - *Breadth:* captions readable with the sound off and clear of the bottom strip.

   List what is removed. Re-read the remaining script for broken links ("all because", "but",
   "then") and for any payoff whose set-up was cut. If the user already asked for the edit,
   proceed; otherwise show the plan first.
4. **Write a spec and render.** Copy `film/saroo/recut.json` as a template. Take segment edges
   from `pauses.json` "mid" values, and start each segment 1-2 frames before its first word.
   ```bash
   python3 .claude/skills/shorts-playbook/scripts/recut.py film/<project>/recut.json --plan   # length check
   python3 .claude/skills/shorts-playbook/scripts/recut.py film/<project>/recut.json          # render + verify
   ```
   The verify step must say OK: every join in a gap, last frame = first frame, loudness about
   -14 LUFS. Fix anything it flags and re-run.
5. **Look at it.** Build a contact sheet of the output and a before/after of the first 2 s and the
   last frame (the audit on the output gives you `sheet.jpg`). Check the hook card fits and covers
   what it should, and that no hard jump is left.
6. **Deliver and record.** Send the mp4 with `SendUserFile` (renders are gitignored and
   regenerable). Commit `recut.json`, a `NOTES.md` (what changed, the cut table, the checks, open
   rights questions) and the before/after image. Suggest the pinned comment.
7. **After posting, log the result.** Ask for the Studio numbers and add a row to
   `shorts-virality/results.csv`. Once there are about 8 or more rows, run
   `python3 shorts-virality/model.py levers --csv shorts-virality/results.csv`, `compare` and `fit`.
   From then on, use the channel's own spreads and baselines rather than the model's guesses.

## Planning a new Short

Check the concept and script against this list before anything is made. Each item maps to a
lever:

- **First 1-2 s:** state the payoff or the question; the first frame should work as a thumbnail.
  No logo, no fade-in, no "In 1986…" opening. (hook)
- **Length:** under 60 s if any music or footage isn't yours. Otherwise as short as the story
  allows (most stories fit in 35-55 s). (stop subtracting, retention)
- **Every 2-3 s something changes on screen:** no frozen picture under the voice, no end hold.
  (retention)
- **Ending:** land on the payoff, then make the last image rhyme with the first so the replay
  flows. (loops)
- **One reason to comment or share,** built into the story rather than asked for. (engagement)
- **Captions:** full phrases, high contrast, above the bottom strip; the story should make sense
  with the sound off. (breadth)
- **Original material,** or clearly transformed with your own voice. No reposts. (penalty π)
- **Format choice:** use `python3 shorts-virality/model.py compare` on the channel's results. If
  hits are rare, invest in quality per Short; if they're common, invest in volume. (FORMATS.md)
- **Keep the source project** (layers, voice, a caption-free render) so later fixes are clean.

## Reporting

When you finish, tell the user plainly: what changed and why (by ladder step), the before → after
length, what was cut, the verify results, anything still open (rights, music), and the
pinned-comment suggestion. Don't present model numbers as YouTube facts.
