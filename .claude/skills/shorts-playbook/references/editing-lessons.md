# What editing real Shorts taught us

Each lesson comes from a real edit in this repo: the Saroo map Short (`film/saroo/`) and the
Map From Memory ink-wash review (`film/NOTE.md`).

## Before touching anything

- **Confirm it's the right video.** The Drive link said "Map From Memory" but held an 83.9 s
  Google Earth story about Saroo. The audit's contact sheet caught it. Show the user what the file
  actually is and ask before applying a plan written for a different cut.
- **Large files:** GitHub's web upload stops at 25 MB. A Google Drive "anyone with the link" file
  downloads with
  `curl -L "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`.
  Keep sources in `film/input/` (gitignored).
- **Ask for source material** (project file, caption-free render, script). Burned-in captions and
  titles can only be covered, never re-set cleanly.

## Getting the script and the timings without speech-to-text

- There is no offline ASR here. `audit.py` finds every caption change in the caption band and
  tiles them with timestamps. Reading that sheet gives the full script with timings: 109 states
  became 19 sentences.
- Caption chunk times sit at or slightly before the voice. Use them to find sentences, then take
  exact cut points from `pauses.json`. **Don't take the last caption change as the end of speech.**
  On Saroo the voice ended 0.6 s earlier than that, which left a silent end title the audit then
  flagged. Use the envelope ("last words" in the report).

## Cutting narration

- **Narration often runs wall to wall.** Gaps between words are 70-220 ms. So "trim the dead
  picture" can cut words. Fix a frozen stretch with motion, or cut it only where the voice has a
  gap.
- **Cut whole clauses at sentence edges**, in the middle (`mid`) of a measured gap.
- **Start each segment 1-2 frames before its first word.** The join's audio fade-in otherwise
  softens the first consonant ("Saroo's", "All").
- **Dissolve length = audio crossfade length** (2 frames). Unequal overlaps drift the sync by the
  difference at every join.
- **Re-read the story after cutting.** Removing "Saroo's story became the film Lion" made "But
  Guddu had been killed by a train. All because he never forgot…" read as if Guddu died *because*
  Saroo remembered. Check that every "all because / but / so / then" still points at the right
  sentence.
- **Keep one set-up for every payoff.** "a station called Burhanpur" pays off only if Burhanpur
  was introduced earlier. Cut the duplicate set-up, never the only one.
- **What can usually go:** date lead-ins ("In 1986", "In 2012") when the date is on screen; names
  and places that aren't paid off later; distances and clarifications ("seventy kilometres away");
  survival or middle beats between two big turns; repetitions; credits ("starring…"). Saroo went
  from 83.9 s to 57.3 s without losing the story.

## Hook, loop and captions

- **Payoff first.** Most story Shorts open on chronological set-up ("In 1986…", "The boy
  followed…") and reveal the payoff 20-60 s later. Either lift the payoff clip to the front (a cold
  open, using the film's own voice) or put the payoff on a **title card** for the first 2-3 s.
- **A burned-in title overlapping the picture can't be patched invisibly.** Cover it with a
  deliberate card in the video's own style (sample its colours; Montserrat matches most bold
  caption styles), then fade the card to reveal the original.
- **Loop:** dissolve the last 0.5 s into frame 0, and end the dissolve one frame early so the last
  frame *is* frame 0. Look for a final image that rhymes with the first (the globe at both ends;
  in the ink film, a pair walking past the village in the first and last shots).
- **Captions:** keep them out of the bottom strip where the title and channel name sit, in full
  phrases, readable with the sound off. Bold word-by-word captions (Saroo) were already fine. One-
  or two-word italic fragments at small size (the ink film) were not.

## Rights checks before posting

- Music or footage you don't own: keep the Short under 60 s. Expect any claim to send the revenue
  to the rights holder.
- Photos of real people or film stills: note any whose licence isn't visible (the Dev Patel photo).
- Reposting other creators' clips: since Oct 2026 this costs reach at channel level. Transform it
  (your own footage, real editing, a point of view) or don't post it.

## Verify, then deliver

- `recut.py` checks length, every join's audio level (flag if speech is in the fade), the loop
  frame match, and loudness (aim for about -14 LUFS, peak below -1 dBFS). Also look at a contact
  sheet of the output and a before/after of the first 2 s and the last frame.
- Send the video with `SendUserFile`. Don't commit renders: they are 50 MB and regenerable from
  the spec. Commit the spec, the notes and the before/after image.
- Ask the user to log Studio numbers after posting (`shorts-virality/results.csv`), so the model's
  guesses get replaced by the channel's own data.
