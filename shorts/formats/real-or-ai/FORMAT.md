# Series: REAL OR AI?

A 24-second verdict on a clip that is going viral right now. Three clues, each shown on screen, then the verdict stamp lands on the beat drop.
It is original by design: the value is your investigation, not the clip.

## Slots (template.json; times shown at 128 BPM, 1 bar = 1.875 s)

| # | Bars | Seconds | Picture | Caption | Effect |
|---|---|---|---|---|---|
| 1 | 0–0.75 | 0.00–1.41 | the most striking frame, moving | **“REAL OR AI?”** (at once, multicolour) | push-in, white flash out |
| 2 | 0.75–3 | 1.41–5.63 | the clip plays (the shared moment) | what people say it shows | — |
| 3 | 3–5 | 5.63–9.38 | **freeze** + zoom onto detail 1 | CLUE 1: … | shutter click, red circle, pop |
| 4 | 5–7 | 9.38–13.13 | freeze + zoom onto detail 2 | CLUE 2: … | same |
| 5 | 7–9 | 13.13–16.88 | the source: earliest upload, account, date, fact-check | CLUE 3: … | same |
| 6 | 9–10 | 16.88–18.75 | slow motion, darker | SO… REAL OR AI? | music builds, dips to black |
| 7 | 10–12 | 18.75–22.50 | **verdict on the drop**: the clip again | one line why | **stamp** REAL / AI / UNVERIFIED, impact, shake |
| 8 | 12–12.5 | 22.50–23.44 | darker frame | SOURCE: @original | white flash |
| 9 | 12.5–13 | 23.44–24.38 | the hook frame again (seamless loop) | SEND ME THE NEXT ONE | — |

Music: intro (3 bars) → verse (6) → build (1) → **drop (2)** → break (1). The verdict is always on the drop.

## The evidence standard (non-negotiable)

1. **Every clue is on screen**: a freeze, a zoom and a circle on the exact detail, or the source page.
2. **Write `EVIDENCE.md` first**: earliest upload found, clues with frame times, outside checks, verdict, confidence.
3. **Three verdicts only:** REAL (corroborated by an independent source), AI (at least two independent tells, or the creator or a fact-check says so),
   **UNVERIFIED** (anything less). Never guess.
4. **Never call a real person a liar.** Judge the clip, not the person.
5. **Wrong call?** Pin a correction and post a follow-up.

### Clue types that hold up

| For AI | For REAL |
|---|---|
| hands, teeth, ears, text and logos that warp between frames | the same moment from another angle or another uploader |
| physics: water, hair, cloth, shadows that don't match the light | a news report, an official account, or the person in it confirming |
| objects that appear or vanish between frames | metadata that matches: date, place, weather, landmarks |
| first posted by an AI-content page, or the account's other videos are AI | an original upload with an older date and a real account history |
| the YouTube "altered or synthetic" label, or Content Credentials | archives (NASA, agencies, broadcasters) holding the same footage |
| a fact-check (Lead Stories, Snopes, AFP, Reuters) | a fact-check confirming it is real |

## Captions

- The hook is always **“REAL OR AI?”**.
- Clues are `^cCLUE 1:` then 3–6 words naming the detail, with the key word coloured.
- The verdict line is one short sentence: `^gNASA FOOTAGE. ^wNOT AI.` / `^rTHE HANDS ^wGIVE IT AWAY.`

## Voice

Record **one line in your own voice** for the verdict (5–8 words), for example "It's real: NASA filmed it from Orion." Put it in
`clips/voice.m4a` and add `{"file": "clips/voice.m4a", "t": 10.1}` to `voice` (time in bars). The music ducks under it. This is the line that makes
the Short yours under YouTube's originality rules.

## Rights

- Use **short excerpts** of the viral clip (it is the subject of your analysis), credit the uploader on screen and in the description,
  link the original, and stay under 60 s.
- If the owner objects, take it down and say so. For licensed or owner-permitted clips, keep the proof in `EVIDENCE.md`.

## Make one

```bash
cd shorts
python3 -m beatcut.template new real-or-ai episodes/roai-<subject>
# put the clip(s) in episodes/roai-<subject>/clips/, fill episode.json, EVIDENCE.md, POST.md
python3 -m beatcut.template build episodes/roai-<subject> --bpm 128            # or --track trending_sound.m4a
python3 -m beatcut.story episodes/roai-<subject> --stills
python3 -m beatcut.story episodes/roai-<subject>
```

With a trending sound added in the app instead: build at the song's BPM, upload `out/edit_no_music.mp4`, and start the song
**10 bars before its drop** (10 × 4 × 60 / BPM seconds), so its drop lands on the verdict.

Example episode: `episodes/roai-earthset/` (NASA's Orion "Earthset", verdict REAL).
