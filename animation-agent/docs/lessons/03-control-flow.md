# Lesson 3 — Control flow: Triage, parallel Analysts, a Critic loop

What shipped: the graph now decides what deserves a card, analyses the chosen videos in parallel,
and has every card checked by a Critic that can send it back for revision, at most twice. Triage
runs on a cheap model (Haiku), the Analyst and Critic on the strong one (Opus). `anim run` streams
each pipeline's drafts and verdicts live, and `anim cards` shows whether the Critic approved each
card. 41 tests pass, including one that proves the pipelines really run at the same time.

```text
Main graph
  START -> scout -> triage --(Send, one per selected video)--> analyze -> librarian -> END
                       \___________(nothing selected)__________________/

analyze, a subgraph that runs once per selected video
  START -> gather -> analyst -> critic --approve--> accept -> END
                        ^         |
                        +-revise--+   at most 2 revisions, so at most 3 drafts
```

Milestone 2 argued that pipelines should be graphs, not agents. This milestone adds back the
useful agent-like behaviour, but as visible, testable structure: a branch, a fan-out, and a loop.

## The three ideas in this milestone

### 1. Conditional edges (`route_after_triage`, `route_after_critic`)

A normal edge always goes to the same node. A conditional edge calls a plain function that reads
the state and returns where to go next:

```python
builder.add_conditional_edges("critic", route_after_critic, ["analyst", "accept"])

def route_after_critic(state):
    if state["critique"].verdict == "approve":
        return "accept"
    if state["attempts"] > MAX_REVISIONS:
        return "accept"            # out of revisions: keep it, flagged
    return "analyst"
```

The list of possible destinations is not required to run, but it lets LangGraph draw the branch
in Studio and check the wiring when the graph compiles. The router is ordinary code. That keeps
the decision cheap, deterministic and testable, even when the inputs came from a model.

### 2. Map-reduce with `Send` (`route_after_triage`, `card_pipeline.py`)

A conditional edge may also return a list of `Send` objects. Each one names a node and carries
that node's private input:

```python
return [Send("analyze", {"candidate": c}) for c in state["selected"]]
```

LangGraph runs every `Send` in the same step, in parallel, and starts the next node, the
Librarian, only when all of them have finished. That is the "map". The "reduce" is the append
reducer from Lesson 2: each pipeline returns `{"cards": [its card]}`, and `operator.add` merges
them into one list. Without that reducer, the parallel pipelines would overwrite each other.

The target here is a whole subgraph, so each video gets its own private `CardState` with its own
draft, critique and attempt counter. `output_schema=CardOutput` means only `cards`, `reviews` and
`errors` flow back to the main graph. Drafts and critiques stay private.

Two things the tests taught:

- **Parallel branches must never mutate shared objects.** The first end-to-end test produced two
  cards with the same id. The fake model returned one card object to both pipelines, and
  `finalize()` edited it in place, so the second pipeline overwrote the first. A real model returns
  fresh objects, so this would have hidden until some cache or retry shared one. `finalize()` now
  copies. Treat everything a node receives as read-only.
- **Prove parallelism instead of assuming it.** `test_card_pipelines_run_in_parallel` uses a
  `threading.Barrier(2)`: each fake Analyst waits until the other arrives. Run one after the
  other, the first waits forever and the test fails.

`anim run --parallel 4` sets `max_concurrency`, the cap on how many branches run at once. Each
Agent SDK call starts a `claude` process, so the cap protects your machine as well as your rate
limits.

### 3. Bounded loops (`critic.py`)

The Critic loop is the ReAct loop from Lesson 1 again, made explicit: analyst, critic, maybe
analyst again. The step cap from Lesson 1 is now `MAX_REVISIONS` inside the router, and it decides
what "giving up" means: the last draft is kept, its confidence is capped at 0.49, and the
unresolved issues are written into `open_questions` and the stored review. PLAN.md says cards
under 0.5 stay out of digests, so a weak card is recorded but never published.

The Critic itself has two layers, and the order matters:

1. **Code checks what code can check.** `unverified_quotes()` searches the source material for
   every evidence quote, ignoring only case, curly quotes, whitespace, "..." joins and a trailing
   "(1,234 likes)". A quote that is not there is an issue, and it forces "revise" even if the
   model would approve. It costs nothing and cannot be talked out of its answer. The Analyst
   prompt now says quotes must be copied word for word, because a checker will compare them.
2. **The model checks what needs judgement.** Whether a real quote supports its claim, whether a
   score is inflated, whether guesses are marked "likely:", whether a tool name is justified.

The Critic also sets each card's confidence, as PLAN.md specified. Every failure path is a
decision, not a crash: no first draft means no card; a failed revision keeps the last good draft,
flagged; a failed Critic keeps the card, marked unreviewed.

**Loops can oscillate, so give each side a memory.** A live run on LAIKA's stop-motion puppet
video hit the cap: three drafts, never approved. The history showed why. Round one said two scores
had no evidence. The Analyst over-corrected and dropped the production score to 0. Round three
flagged that 0 as a new error. Each round fixed one thing and broke another. Two prompt changes:
the Analyst is told to change only what the issues ask for, and the Critic now receives its own
previous issues (`previous_round()`), checks those first, and raises new ones only if they would
mislead a reader. Rerun on the same video, the card was approved on the second draft, with the
Critic confirming that all six fixes were in. One run is an anecdote, not a measurement; Milestone
8's evals are how you would know it holds.

## Supporting changes

**Cheap model for cheap judgement.** `get_model("triage")` returns `LLM_MODEL_TRIAGE`, Haiku by
default, at roughly a fortieth of Opus's price per token. Triage asks one easy question per video:
is it animation, and could a motion designer learn from it?

**Split judgement from arithmetic, again.** The model scores `interest` and never sees view
counts. Code computes a `viral_score` from views per day and views per follower, each ranked
within the batch, so a small channel's breakout counts as much as a big channel's raw momentum.
Priority is 0.7 × interest + 0.3 × viral. Craft gets most of the weight because every candidate
has already passed Scout's popularity filter; with 60/40, a test showed an interest-3 video
beating an interest-5 one on popularity alone. If the Triage model fails, the node falls back to
popularity only and records why. Every decision, kept or skipped, goes into a `triage` table: the
labelled data Milestone 8's evals will need.

**Two stream modes.** `anim run` streams `["updates", "custom"]` with `subgraphs=True`. The first
live run printed nothing from inside the pipelines. The reason: a subgraph with an output schema
only streams its output keys, and drafts and critiques are private. Widening the schema would have
leaked private state into the main graph, so the Analyst and Critic now call
`get_stream_writer()` to emit progress events instead. Use "updates" for state, "custom" for
progress.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim run                        # 20 candidates, Haiku triage, up to 3 cards in parallel
uv run anim run --cards 5 --parallel 2
uv run anim cards                      # the review column says approved, flagged or unreviewed
uv run anim show youtube:<id>          # the card, then the Critic's round-by-round history
```

To see a card hit the revision cap, temporarily set `MAX_REVISIONS = 0` in `nodes/critic.py`.
Every card that needs a fix is then accepted after one draft, flagged, with confidence 0.49 or
less and its issues in `open_questions`.

## Read the trace

One run now shows `triage` with its Haiku call, then one `card_pipeline` subtree per selected
video, side by side, each with `gather`, `analyst`, `critic` and maybe a second `analyst` and
`critic`. Open a second `analyst` run and read its input: the previous draft and the Critic's
issues are there, which is the whole loop in one prompt. Open `critic` to see what the automated
quote check reported before the model read the card.

## What the first run showed

| | |
|---|---|
| Candidates | 20 from 8 queries |
| Triage | 3 selected, 17 skipped; Haiku, one call, about $0.003 |
| Card pipelines | 3 in parallel; each needed one revision; all approved |
| Model calls | 1 Haiku, 12 Opus |
| Whole run | 2 minutes 26 seconds, about $0.97 |

That run came before the oscillation fix described above. The 12 Opus calls added up to about 4 minutes of model time, but the run took under 2.5 minutes
because the three pipelines ran side by side.

Triage changed what gets analysed. Milestone 2's top pick, MrBeast's animated-series promo, was
skipped as "a channel announcement and budget talk... with no visible technique". The three picks
were My Chemical Romance's animated short with Lauren Tsai, a code-driven real-time animation
demo, and Prada's hand-drawn holiday campaign.

The Critic earned its cost. In round one it sent back all three cards, catching scores with no
evidence behind them, claims that went further than the comments supported, and a factual error:
a cast member wrongly described as a brand ambassador. All three passed on the second draft, with
confidence between 0.30 and 0.50, which is honest for cards built without seeing the video.

The cost is real too: about four times Milestone 2's per run, almost all of it from revisions.
Whether the Critic's catches are worth that is a question for evals, in Milestone 8.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Conditional edges and router functions | `route_after_triage`, `route_after_critic` | any branching workflow |
| Map-reduce with `Send` and append reducers | `route_after_triage`, `state.py` | parallel work over a list |
| Subgraphs with private state and an output schema | `card_pipeline.py` | isolating per-item work |
| Bounded loops with an explicit give-up policy | `route_after_critic`, `accept` | review, retry and refine loops |
| Verify in code before asking a model | `unverified_quotes()` | citation checks, guardrails |
| Model routing by role | `llm.model_name()` | cost control |
| Custom stream events | `get_stream_writer()` | progress output from deep inside a graph |
| Read-only inputs in parallel branches | `finalize()` | anything that runs concurrently |

Next: **Milestone 4** adds memory: a checkpointer so a failed run can resume where it stopped,
and a long-term store so a video is never analysed, and paid for, twice.
