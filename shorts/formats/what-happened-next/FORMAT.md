# Series: WHAT HAPPENED NEXT

A ~37-second follow-up on a moment everyone remembers: the happy ending people know, the turn they don't, three dated chapters, and where things
stand now. The value is the research, so it is original by design.

## Slots (template.json; seconds at 90 BPM, 1 bar = 2.67 s)

| # | Bars | Seconds | Picture | Caption | Look and sound |
|---|---|---|---|---|---|
| 1 | 0–1 | 0.0–2.7 | the iconic moment | **“YOU REMEMBER HIM?”** | colour, push-in, white flash out |
| 2 | 1–2 | 2.7–5.3 | why it went viral | YEAR: what happened | light leak |
| 3 | 2–3 | 5.3–8.0 | the happy ending people know | THE HAPPY ENDING | TV-off into black and white |
| 4 | 3–4 | 8.0–10.7 | freeze | **“BUT…”** THAT WASN'T THE END | colour drains, build |
| 5 | 4–6 | 10.7–16.0 | chapter 1 | big **date** + what happened | black and white, flashbulb flash, flicker |
| 6 | 6–8 | 16.0–21.3 | chapter 2 | big **date** + the next fact | same |
| 7 | 8–10 | 21.3–26.7 | chapter 3 | big **date** + the latest reported fact | same |
| 8 | 10–11 | 26.7–29.3 | dark, slow push | SO WHERE IS HE NOW? | heartbeat, dip to black |
| 9 | 11–12 | 29.3–32.0 | **colour returns on the drop** | NOW: … | big white flash |
| 10 | 12–13 | 32.0–34.7 | warm moment | THE LAST REPORT: … | light leak |
| 11 | 13–14 | 34.7–37.3 | the subject smiling | **“STAY SAFE”** (or a fitting wish) | glitch, mending heart, sparkles, fade |

## Rules

1. **Every caption is in `EVIDENCE.md`** with a dated source. Two sources where possible. Dates on screen must match the sources.
2. **Say what was reported, not what you guess.** "THE LAST REPORT (2022): …" rather than claims about today if nothing newer is published.
3. **People's safety first.** Never show or caption a location, school or contact detail for someone at risk, even if a source printed it.
   Children and people under threat get the most care.
4. **One voice line of your own** at the drop ("He'd be about 15 now…"). It's what makes the Short yours under YouTube's originality rules.
5. **Footage:** owner permission or licensed. A compilation channel's permission doesn't cover footage it doesn't own.

## Make one

```bash
cd shorts
python3 -m beatcut.template new what-happened-next episodes/whn-<subject>
# clips into clips/, fill episode.json, EVIDENCE.md, POST.md
python3 -m beatcut.template build episodes/whn-<subject> --bpm 90       # or --track emotional_sound.m4a
python3 -m beatcut.story episodes/whn-<subject> --stills
python3 -m beatcut.story episodes/whn-<subject>
python3 -m beatcut.thumb episodes/whn-<subject>
```

With a trending sound in the app: build at its BPM and start it **11 bars before its drop** so colour returns on the drop.

Example: `episodes/whn-little-messi/`.
