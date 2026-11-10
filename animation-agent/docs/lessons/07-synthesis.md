# Lesson 7 — Synthesis: trends across cards, with evidence counts

What shipped: a Synthesizer node after the Librarian reads every approved card from the last 30
days, proposes trends, and keeps a taxonomy of sub-styles. The digest gains a "Trends" section and
a "What changed" section. `anim trends` shows the current trends (`--refresh` recomputes them),
and `anim taxonomy` lists discovered sub-styles. 81 tests pass.

```text
... -> librarian -> synthesizer --(no approved cards and no trends)--> END
                         |
                         v
                     reporter -> human_review -> publish
```

## The three ideas in this milestone

### 1. Multi-document reasoning: the model reads across, code counts (`nodes/synthesizer.py`)

One model call gets a compact line per card: id, date, style, creator, confidence, tags, and the
start of the summary. Up to 40 cards fit easily. It returns `SynthesisDraft`: trends, each with the
ids of the cards that support it and, optionally, cards that cut against it. Then code takes over
everything that can be counted:

- `resolve_ids()` maps the model's ids to real cards. It forgives formatting (brackets, quotes, a
  missing `youtube:` prefix) but nothing else, and it records the ids it could not match.
- A trend needs **at least two** supporting cards. One card is an example, not a trend.
- `evidence_count` is the number of supporting cards, and `independent_sources` the number of
  distinct creators among them. Five videos from one channel are one source, not five.
- `trend_confidence()` is computed, never asked: 0.15 per independent creator (up to five), plus
  half the cards' mean confidence, minus 0.1 per counter-example, kept between 0.05 and 0.85.

The model is good at noticing that a watercolour village story, a Navaratri short and a Hindi
clay-look moral tale share something. It is bad at counting, and worse at knowing when it is
overreaching. Splitting the work this way gets the best of both.

### 2. Change over time: new, growing, continuing, fading

Trends are stored in `anim.db` with a stable id made from the name. The prompt shows the model the
previous trends and asks it to reuse a name when the pattern still holds. Code then compares:
**new** (no previous trend with that id), **growing** (more supporting cards than last time),
**continuing**, and **fading** (a previous trend nobody proposed this time). Those go into the
digest's "What changed" section. `first_seen` survives every update, so a trend's age is visible.

### 3. A taxonomy that grows with the research

PLAN.md's style families are a fixed list in `schemas.py`. Sub-styles are not: the Synthesizer may
propose new ones, and `remember_styles()` adds them to a `("taxonomy",)` namespace in the long-term
store only when at least two known cards share them. Known names are updated, not duplicated.

Watch for drift. The second refresh proposed "South Asian family and devotional 2D story shorts"
next to an existing, similar trend. Naming is judgement, so a taxonomy kept by a model needs a
human to prune it now and then. `anim taxonomy` makes that easy.

## Two things that went wrong

- **A test made real model calls and wrote to the real database.** The human-review tests built
  the full graph, which now included the real Synthesizer, pointed at the default `anim.db`. The
  suite hung on real Claude calls, and four trend rows from a test run landed in the real database
  (they were deleted). The fix is structural: `tests/conftest.py` makes any real model call fail
  at once with "Inject a fake chain instead", for every test, forever.
- **One live refresh dropped every trend for lack of evidence.** It could not be reproduced: the
  model's ids matched in every later run. Rather than guess, the code now forgives harmless id
  formatting and reports the unknown ids in the drop reason, so the next occurrence explains itself.

## Run it yourself

```bash
cd animation-agent
uv run pytest -q
uv run anim trends --refresh       # one Opus call over the last 30 days of approved cards
uv run anim trends --days 60
uv run anim taxonomy
uv run anim run                    # the digest now has Trends and What changed sections
```

## What the live synthesis showed

From the 9 approved cards, one Opus call (about $0.05) proposed four trends and code kept all four:
South Asian nostalgia and festival story animation (3 cards from 3 creators, confidence 0.67), a
handmade-craft-as-premium-signal trend (3 cards, 0.48), clay-look village story shorts (2 cards,
0.49) and AI agents writing animation as code (2 cards, 0.40). Every hypothesis said what the cards
could not show, for example that most were written without seeing the video. A second refresh
reused all four names, so they came back as "continuing" with nothing fading.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Reading across many documents in one call | `card_line`, `synthesize()` | summaries, clustering, reviews of many items |
| Evidence counts and independence in code | `build_trends`, `trend_confidence` | any claim of a pattern |
| Tolerant but strict id resolution | `resolve_ids()` | linking model output back to your data |
| Stable ids for change tracking | `slug()`, trends table | "what changed since last time" |
| A model-maintained vocabulary with a threshold | `remember_styles()` | taxonomies, tags, entity lists |
| A test-wide guard against real calls | `tests/conftest.py` | every LLM project |

Next: **Milestone 8** adds evals: frozen datasets, LLM-as-judge rubrics and regression checks, so a
prompt change can be measured instead of guessed.
