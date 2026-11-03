# Channel playbook: series that run on templates

Goal: a channel where every upload comes out of a repeatable template, built from existing YouTube footage, edited heavily, and monetizable.
Research behind it: `../research/VIRAL-PLAYBOOK-NOV-2026.md`.

**The one rule for templates.** YouTube's Oct 1, 2026 ranking change demotes "template-based bulk changes" and on-screen narration that
only describes the picture ([SEJ](https://www.searchenginejournal.com/youtube-original-shorts-reposted-clips-reach/591774/)). So a
template here fixes the **structure** (slots, timing, look, sound, workflow). Every episode still needs its **own** story, facts,
verdict and a line in your own voice. Same skeleton, different story every time.

---

## Three channel concepts

| | A. **REAL ONES**: real moments, verified (recommended) | B. **IN 25 SECONDS**: big events explained | C. **DETAILS YOU MISSED**: breakdowns |
|---|---|---|---|
| Promise | "Only real footage. Every story checked." | "The whole thing, in 25 seconds." | "Watch it again, you missed this." |
| Series | RESPECT · REAL OR AI? · WHAT HAPPENED NEXT · weekly long-form | X IN 25s · BEFORE/AFTER · LAUNCH DAY | 5 DETAILS · FREEZE FRAME · WAIT FOR IT |
| Footage | owner permission, licensed UGC, short credited excerpts for analysis | public domain: NASA, NOAA, USGS, National Archives | your own gameplay or capture; short excerpts of trailers and plays with analysis |
| Why it can break | emotional plus shareable; "real or AI?" rides whatever is viral that day; heavy comments | rides launches, eclipses, storms and records within hours | rides launches (GTA 6 on Nov 19), finals, big plays |
| Rights risk | medium (needs licences) | **lowest** | medium-high (trailer and league claims) |
| Monetization | good: story and analysis are original | best: public domain plus your explanation | good with own capture |
| Built already | RESPECT template (`formats/emotional-respect/`) | X IN 25s (`episodes/artemis-i/`) | partly (`render.py` freeze and zoom) |

**Recommendation: A, REAL ONES.** It builds on the format you already like. Its brand ("real, verified") is the opposite of the AI fakes
flooding these feeds. Every series in it is original by design: a story, a verdict, a follow-up. Concept B is the safe second channel, or an
occasional series, if you want zero rights risk.

---

## REAL ONES: the series

### Series 1: RESPECT (2 per week)
- **What:** one true story of kindness, rescue or sportsmanship, cut to a soundtrack in the emotional format.
- **Template:** `formats/emotional-respect/` (13 slots, typed neon captions, light leaks, a heart and "RESPECT" ending). Tools: `/emotional-short`, `mirror.py`, `story.py`, `thumb.py`.
- **Episode-specific (never templated):** the story, checked facts, one spoken line that adds context ("This was Kabul, 2016…"), the credit line.
- **Footage:** the person who filmed it (written permission), or licensed from ViralHog, Newsflare or Jukin with your channel allowlisted. Never from compilations.

### Series 2: REAL OR AI? (3–4 per week, reactive)
- **What:** a verdict on a clip that is going viral **today**. This is the series that rides the 48-hour window.
- **Slots (about 25 s, beats from the chosen sound):**

| # | Time | Content | Caption |
|---|---|---|---|
| 1 | 0–0.5 s | the clip's most striking frame | **“REAL OR AI?”** (multicolour, at once) |
| 2 | 0.5–5 | the clip plays | kicker: "2M VIEWS IN A DAY" (context) |
| 3 | 5–9 | clue 1: freeze, red circle, zoom in | LOOK AT THE ^yHANDS |
| 4 | 9–13 | clue 2 | THE ^rSHADOW MOVES WRONG |
| 5 | 13–17 | clue 3: where it came from | FIRST POSTED BY ^cAN AI PAGE |
| 6 | 17–18 | music stop, black beat | — |
| 7 | 18–21 | **verdict on the drop**: stamp | **AI** (red) / **REAL** (green) / **UNVERIFIED** (yellow) |
| 8 | 21–24 | credit and source | SOURCE: @… · CHECKED BY … |
| 9 | 24–25 | loop line, back to frame 1 | SEEN ONE? COMMENT IT 👇 |

- **Voice:** you say the verdict and the strongest clue in one sentence.
- **Rules:** show your evidence. Cite a fact-check when one exists. Say UNVERIFIED when you can't prove it. Never call a real person a faker without proof.
- **Footage:** short excerpts used for analysis, credited. Under 60 s.
- **Built:** `formats/real-or-ai/` (FORMAT.md, template.json timed in bars, EVIDENCE.md, POST.md), skill `/real-or-ai`, example `episodes/roai-earthset/`.

### Series 3: WHAT HAPPENED NEXT (1 per week)
- **What:** a famous viral moment, then where those people are now. Example: "Little Messi, 10 years later".
- **Slots (35–45 s):** the iconic moment (with a "YOU REMEMBER THIS") → when and where → what happened right after → "BUT THEN…" (the surprise)
  → today (recent footage or photo, with permission) → payoff → heart.
- **Voice:** two or three spoken lines carrying the new facts. This is the most original series on the channel.
- **Research:** at least two news sources for every claim; keep them in the episode's `POST.md`.
- **Built:** `formats/what-happened-next/` (FORMAT.md, template.json timed in bars, EVIDENCE.md, POST.md), skill `/what-happened-next`, example `episodes/whn-little-messi/`.

### Series 4: THE WEEK IN REAL ONES (weekly long-form, 8–12 min)
- **What:** the week's best Shorts expanded, with more context, your narration and chapters.
- **Why:** long-form revenue doesn't depend on the 2027 Shorts threshold, and it is the watch-hours route into the Partner Program.
  Link it from each Short as the related video.

---

## Weekly system

| Day | Upload | Prep that day |
|---|---|---|
| Mon | RESPECT | find next week's stories, request permissions |
| Tue | REAL OR AI? | scan the trending page for viral clips |
| Wed | WHAT HAPPENED NEXT | research and sources |
| Thu | REAL OR AI? | |
| Fri | RESPECT | licences filed in the log |
| Sat | REAL OR AI? (if a big one breaks) | script the long-form |
| Sun | THE WEEK IN REAL ONES (long-form) | review numbers, decide next week |

Posting more doesn't by itself unlock reach (YouTube says so). The schedule is for building the habit and the audience, not for the algorithm.
Event days from the calendar (Thanksgiving week for RESPECT, GTA 6 week for any viral gaming fakes) override the plan.

## Making one episode

1. **Find:** the clip or story (Trends page, news, fact-check sites, viewer comments).
2. **Verify:** at least two sources for facts. For REAL OR AI?, trace the first upload, check metadata and look for fact-checks.
3. **Rights:** get written permission or a licence and log it (below). No licence, no upload.
4. **Edit:** `python3 -m beatcut.mirror analyze` (or copy the series template), fill the shots and captions, record the voice line, then `--stills`, render, and `compare`.
5. **QA:** safe zones, captions under 6 words a line, every on-screen fact sourced, length under 60 s.
6. **Post kit:** title, description with credits, tags, pinned question, thumbnail (`thumb.py`), the in-app trending sound.
7. **First 48 hours:** see the decision rules below.

## Licence log (keep for every clip)

| Episode | Clip / URL | Owner | Permission type | Date | Allowlisted? | Proof file |
|---|---|---|---|---|---|---|
| messi-respect | unNo93gbor8 29:42–30:17 | (channel) | written permission | | | |

Note: the Messi clip includes ESPN and news footage that the compilation channel doesn't own, so ask the original rights holders or expect claims.

## Numbers and decisions

| When | Look at | Action |
|---|---|---|
| Hour 1 | viewed vs swiped away | under 60 %: the opening is the problem. Re-cut the first second and post as a new Short. |
| Day 2 | average % viewed, likes, comments | over 70 % viewed vs swiped and climbing: make the follow-up now |
| Day 30 | views (many sports Shorts peak late) | log it per series |
| Every 10 episodes of a series | median viewed vs swiped, median views | keep series at 70 %+, fix or drop the rest |

## Monetization path

1. **Now to Jan 31, 2027:** current Partner Program entry is 1,000 subscribers plus either 4,000 watch hours in 12 months or 10M Shorts views in 90 days.
   YouTube says the Feb 2027 change "won't impact creators already in YPP", so **getting in before Feb 1, 2027 is worth a push**
   ([YouTube Blog](https://blog.youtube/news-and-events/youtube-partner-program-updates-2027-new-opportunities-earn/)).
2. **From Feb 1, 2027:** new applicants need 8,000 watch hours or 20M Shorts views in 90 days, and Shorts ad revenue sharing goes to channels with
   10M qualified Shorts views in 90 days. The long-form series keeps earning below that.
3. **Alongside:** paid clipping campaigns for sports (per 1,000 views, often $0.50–$4), brand deals with verification or pet brands, and licensing
   your own verified edits.
4. **Keep the channel mostly original.** YouTube judges reuse across the whole channel, and permission doesn't exempt a clip
   ([YouTube Help](https://support.google.com/youtube/answer/1311392)).

## Risks

| Risk | Guard |
|---|---|
| Reused-content rejection or reduced reach | a story, verdict or follow-up plus your voice in every episode; never a plain clip |
| Content ID claims | licences, allowlisting, under 60 s, no compilation sources |
| Getting a "REAL OR AI?" call wrong | an evidence standard, cite fact-checks, use UNVERIFIED, pin a correction if wrong |
| Looking mass-produced | same structure, different story; vary openings and sounds; no AI voice |
