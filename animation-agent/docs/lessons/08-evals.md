# Lesson 8 — Evals: measure a change instead of guessing

What shipped: frozen datasets under `evals/datasets/`, three eval suites, a committed baseline,
`anim eval build | run | label | push`, and a GitHub Actions workflow that runs the tests and the
free eval on every change. The first eval run found a real problem in Triage, and the fix was
measured. 87 tests pass.

## The three ideas in this milestone

### 1. Freeze the inputs (`evals/datasets.py`)

An eval is only comparable over time if every run sees the same inputs. So the datasets are files
in git, not queries against the live database:

| File | What it holds | Where it comes from |
|---|---|---|
| `cards.jsonl` | the card corpus for retrieval | exported from `anim.db` |
| `qa.jsonl` | 8 questions and the cards a good search must return | written by hand |
| `analyst.jsonl` | the source material each approved card was written from | the new `sources` table; older cards rebuilt from YouTube |
| `triage.jsonl` | the exact lines Triage reads, with labels | stored decisions, inputs refetched |

From this milestone on, the card pipeline saves its source material and the Librarian stores it,
so every new card adds a perfectly frozen Analyst input. Retrieval evals build a throwaway index
from `cards.jsonl`, which is why they also run in CI, where there is no database.

**Labels record who made them.** Hand-labelling 40 videos is the plan, and `anim eval label` makes
it quick. Until then, `anim eval build --draft-labels` asks Opus, a stronger model than the Haiku
being tested, and marks each label `opus-draft`. Every Triage result prints its label sources, so
nobody mistakes model agreement for ground truth.

### 2. Score with code first, a judge second (`evals/runners.py`, `evals/judge.py`)

- **Triage**: accuracy on "is it animation", and precision, recall and F1 on "worth a card",
  computed exactly as the Triage node decides (animation and interest at least `MIN_INTEREST`).
- **Analyst**: replay frozen sources through today's prompt. Code measures quote coverage, the
  share of evidence quotes found word for word in the source. An Opus judge then scores
  groundedness, specificity, usefulness and calibration from 1 to 5 against an anchored rubric
  (`prompts/judge.md`), with a two-sentence rationale.
- **Retrieval**: recall@k, mean reciprocal rank and hit rate. No model at all unless you add
  `--planner`, so it is free and deterministic.

A judge is a prompt like any other: fixed rubric, anchored scores, the source to check against,
structured output. Judge scores are noisy, so the regression check allows them a 0.3 drop, against
0.05 for ratios.

### 3. Baselines and regression checks (`evals/compare.py`, CI)

`anim eval run --save-baseline` writes `evals/baseline.json`, which is committed. Every later run
is compared with it, and `--check` exits with code 1 if any metric fell by more than its tolerance.
The workflow in `.github/workflows/animation-agent.yml` runs the tests and the retrieval eval on
every push that touches the agent. If the repository has an `ANTHROPIC_API_KEY` secret, it also
runs the Triage and Analyst evals with the `anthropic` provider. Prompt changes are code changes,
so they get the same gate.

## What the first eval run found

| Suite | Result |
|---|---|
| Triage | animation accuracy 0.88, "worth a card" precision **0.22**, recall 0.71 |
| Analyst | quote coverage 1.00, judge mean 3.6 of 5 (usefulness lowest at 2.7, calibration highest at 4.7) |
| Retrieval | recall@4 1.00, MRR 0.94 |

Triage was letting far too much through: most of its "worth a card" picks were labelled not worth
one. The saved results showed why. Every video labelled worth a card got an interest score of 4 or
5, while the false positives mostly scored 2 or 3, and the threshold was 2. Replaying the saved
scores at other thresholds:

| `MIN_INTEREST` | precision | recall | F1 |
|---|---|---|---|
| 2 (old) | 0.22 | 0.71 | 0.33 |
| 3 | 0.42 | 0.71 | 0.53 |
| 4 | 0.71 | 0.71 | 0.71 |

The threshold went to 3, not 4. Four looked better, but the evidence was seven positive examples
labelled by a model, and a stricter gate risks runs that select nothing. Take the step the evidence
clearly supports, and revisit after human labels. A fresh Triage eval at 3 scored precision 0.50,
recall 1.00, F1 0.67, and became the baseline. Part of that gain is noise, since Haiku's answers vary
between runs, which is one more reason to set tolerances instead of chasing single runs.

The Analyst's weakest score, usefulness, is the expected one: cards built without seeing the video
can only say so much about technique. That is what Milestone 9's frames are for, and this suite is
how you will know whether they helped.

## Run it yourself

```bash
cd animation-agent
uv run anim eval build                 # add --draft-labels to fill missing Triage labels with Opus
uv run anim eval label                 # confirm or correct labels by hand (interactive)
uv run anim eval run retrieval         # free
uv run anim eval run --limit 3         # all suites; Analyst items cost two Opus calls each
uv run anim eval run --check           # exit code 1 on a regression
uv run anim eval run --save-baseline   # after a change you have decided to keep
uv run anim eval push                  # upload datasets to LangSmith (needs LANGSMITH_API_KEY)
```

`eval push` was left for you to run, so nothing was written to your LangSmith workspace unasked;
the API connection was checked read-only, and a test checks the calls the upload makes. The CI workflow is in place, and its free eval step was run locally.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Frozen, versioned eval inputs | `evals/datasets/`, `sources` table | any LLM system you change over time |
| Label provenance | `label.source`, `anim eval label` | honest datasets |
| Code metrics before judges | quote coverage, recall@k | cheap, exact checks |
| LLM-as-judge with an anchored rubric | `evals/judge.py`, `prompts/judge.md` | scoring open-ended output |
| Baselines with tolerances | `evals/compare.py`, `baseline.json` | regression gates |
| Decisions from measurements | the `MIN_INTEREST` change | every prompt or threshold change |
| Evals in CI, model calls only with a key | `.github/workflows/animation-agent.yml` | team workflows |

Next: **Milestone 9** gives the Analyst eyes: frames sampled from the top videos, described by a
vision model, merged into the source material so cards can cite what is on screen.
