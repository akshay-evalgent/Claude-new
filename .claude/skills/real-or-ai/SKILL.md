---
name: real-or-ai
description: Make a "REAL OR AI?" YouTube Short - a 24-second verdict on a viral clip with three on-screen clues (freeze, zoom, red circle), a REAL / AI / UNVERIFIED stamp on the beat drop, credits and a loop. Use when the user brings a clip that is going viral and wants it checked, or asks for the next episode of the REAL OR AI? series.
---

# REAL OR AI?

Read `shorts/formats/real-or-ai/FORMAT.md` first (slots, evidence standard, clue types, captions, voice, rights).
The finished example is `shorts/episodes/roai-earthset/` (`episode.json`, `EVIDENCE.md`, `POST.md`).

## Steps (run from `shorts/`)

1. **Get the clip from the user.** YouTube blocks downloads from this machine; do not work around the bot check. Ask for the file
   (upload here or a Google Drive "anyone with the link" URL; download with
   `curl -L -o clip.mp4 "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`), plus the URL where it went viral.
2. **Investigate before editing.** Fill `EVIDENCE.md`: earliest upload, three clues with frame times, outside checks (web search for
   fact-checks: Lead Stories, Snopes, AFP, Reuters), verdict and confidence. REAL needs independent corroboration; AI needs two independent
   tells or a creator/fact-check admission; otherwise UNVERIFIED. Never call a real person a liar.
3. **Scaffold:** `python3 -m beatcut.template new real-or-ai episodes/roai-<subject>`, copy the clip to `clips/<name>.mp4`.
4. **Find the clue frames:** `python3 -m beatcut.mirror sheet episodes/roai-<subject>/clips/<name>.mp4 sheet.jpg --step 0.25`, then a framing
   grid on the chosen frames to set `focus` for each freeze. Remember the crop clamps near frame edges: compute where the detail lands
   (see the clue-2 fix in roai-earthset) and put the circle there, and move the caption (`y`) off the detail.
5. **Fill `episode.json`:** clip, `in`, `speed` (0 = freeze), `focus`, captions (`^c` CLUE n, key word coloured), circle `at`/`r`, stamp text,
   verdict line, credit, `thumbnail`. Times stay in bars.
6. **Build and render:** `python3 -m beatcut.template build episodes/roai-<subject> --bpm 128` (or `--track sound.m4a [--drop s]`),
   `python3 -m beatcut.story episodes/roai-<subject> --stills`, fix, then full render and `python3 -m beatcut.thumb episodes/roai-<subject>`.
7. **QA:** frame strips at each freeze, the circle on its detail, the dip → impact → stamp at the drop, and the loop (last frame ≈ first).
8. **Post kit:** fill `POST.md` from the template; tell the user to record the one-line verdict in their own voice
   (`clips/voice.m4a`, add to `voice`) and re-render; send `out/edit.mp4`, `out/edit_no_music.mp4`, `out/thumbnail.jpg`.

## Rules
- Short excerpts only, credited on screen and in the description, original linked, under 60 s.
- Media other people own stays out of git (`episodes/.gitignore`).
