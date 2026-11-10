# Lesson 4 — Memory: resume a stopped run, never analyse a video twice

What shipped: every run is now a LangGraph thread with checkpoints, so a run that stops for any
reason (Ctrl-C, a crash, a closed laptop) continues with `anim resume <run id>` without redoing
finished work. A long-term store remembers every video the agent analysed or skipped, so Scout
drops them before spending anything on them. New commands: `resume`, `runs`, `history` and
`memory`. 52 tests pass, including crash-and-resume tests and two-run memory tests.

## The three ideas in this milestone

### 1. Threads and checkpoints: short-term memory (`memory.py`, `cli.py`)

Compile the graph with a checkpointer and LangGraph saves the full state after every step:

```python
graph = build_graph(checkpointer=SqliteSaver(...), store=...)
config = {"configurable": {"thread_id": run_id}}
graph.invoke(inputs, config)        # a new run
graph.invoke(None, config)          # continue the same run from its last checkpoint
```

The `thread_id` is the key. Here one run is one thread, and the run id printed at the start of
`anim run` is the thread id. `graph.get_state(config).next` says which nodes would run next; an
empty `next` means the run finished. `anim history <run id>` lists every checkpoint:

```text
step -1  next: __start__
step  0  next: scout
step  1  next: triage             candidates 10
step  2  next: analyze, analyze   candidates 10  selected 2
step  3  next: librarian          cards 2
step  4  next: (done)
```

Two details make resuming cheap, and both were checked by tests and on a live run:

- **Finished parallel branches are kept.** A step with several `Send` branches is not all or
  nothing. Each branch's result is saved the moment it finishes, so if one card pipeline crashes,
  the others are not rerun.
- **Subgraphs resume where they stopped.** The card pipeline inherits the parent's checkpointer,
  so it is checkpointed too. In the live test, Ctrl-C arrived after both pipelines had written
  their first drafts, while the Critic was reviewing them. `anim resume` started at the Critic's
  first round: neither draft was written, or paid for, twice.

Whatever was mid-call at the moment of the stop is redone. That is the price of a checkpoint per
step rather than per token, and it is why steps should be small and idempotent.

Checkpoints hold our Pydantic objects, and rebuilding a class from bytes on disk is a security
decision. LangGraph warns about "unregistered types" and will soon block them, so `serializer()`
gives it an explicit allowlist: exactly the models in `schemas.py`.

### 2. A store: long-term memory (`memory.py`, `nodes/scout.py`, `nodes/librarian.py`)

Checkpoints belong to one thread. A store is shared by all threads: a key-value database with
namespaces, where items look like `("videos",)`, `"youtube:abc123"`, `{"status": "analysed", ...}`.

Nodes get the store from LangGraph. Give the node function a `store` parameter and LangGraph
passes the store the graph was compiled with, or `None` without one:

```python
def scout(state: RunState, *, store: BaseStore | None = None) -> dict:
```

The rules, in `memory.py`:

| Outcome in a run | Remembered as | Effect on later runs |
|---|---|---|
| Card written | `analysed` | never picked again |
| Triage skipped it | `skipped`, with the reason | not picked for 30 days |
| Selected, but no card came out | not remembered | tried again next run |

A later skip never overwrites an `analysed` record. Scout applies the rules right after searching,
before fetching stats, so known videos cost nothing at all. `--include-seen` ignores memory for
one run, and `anim memory --forget youtube:<id>` removes one video so it can be picked again.

In the live test, the second run with the same queries dropped 9 known videos and filled its
candidate list with new ones.

### 3. Short-term vs long-term memory

| | Short-term (checkpointer) | Long-term (store) |
|---|---|---|
| Question it answers | where was I in this run? | what do I know from earlier runs? |
| Scope | one thread | all threads |
| Written | automatically, after every step | explicitly, by nodes that decide what is worth keeping |
| Lifetime | until you delete old runs | until you forget it |
| File here | `data/checkpoints.db` | `data/memory.db` |
| If deleted | old runs can no longer be resumed | the agent re-analyses videos it has seen |

The knowledge base, `data/anim.db`, is neither: it is the product. Memory is the agent's working
notes about its own work. In Milestone 10 both memories move to Postgres on LangGraph Server; the
code that uses them stays the same.

## Four things that went wrong, and what they teach

- **The store silently arrived as `None`.** Scout and the Librarian both began with
  `from __future__ import annotations`, which turns every type hint into a string. LangGraph
  decides what to inject by reading the parameter's type, did not recognise the string, and passed
  nothing. No error, no warning: memory just never worked. The memory tests failed, which is how
  it was found. Those two files no longer use that import, and a comment says why.
- **Ctrl-C printed a wall of tracebacks.** Model calls already running in background threads
  finished after the stop and tried to schedule their next step on a shut-down executor. Harmless,
  but alarming. The CLI now exits at once after printing the resume hint, exactly like a killed
  process, which is what checkpoints are built to survive.
- **Memory started empty.** The first memory run re-analysed a video that already had a card from
  Milestone 3. `backfill_from_cards()` now teaches an empty memory every card in the knowledge
  base. It runs only while memory is empty, so a later `--forget` is respected.
- **Checkpoints warned about unregistered types.** Fixed with the allowlist above, before it
  becomes an error in a future LangGraph release.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim run -q "claymation" --cards 2      # press Ctrl-C once the [analyst] lines appear
uv run anim runs                               # the run shows "stopped before analyze"
uv run anim resume <run id>                    # continues; watch it skip what was finished
uv run anim history <run id>
uv run anim run -q "claymation" --cards 2      # same query: Scout skips what memory knows
uv run anim memory
uv run anim memory --forget youtube:<id>
```

Try deleting `data/checkpoints.db`: cards and memory are untouched, but old runs can no longer be
resumed. Then delete `data/memory.db`: the next run backfills from the knowledge base and only
re-examines videos that never got a card.

## Read the trace

A resume is a separate `invoke`, so it is a separate trace, and it begins at the node it resumed
from, for example `analyze`, with no `scout` or `triage` spans. Put the stopped and the resumed
traces side by side: together they should show each step exactly once, apart from the one that was
mid-call. (This was checked here through the CLI output and the tests, not in LangSmith itself,
because this environment has no LangSmith key.)

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Threads and `thread_id` | `cli.py` `_thread()` | any agent with sessions or runs |
| Checkpointers, `get_state`, `invoke(None)` | `cli.py` `resume` | crash recovery, long jobs |
| Checkpoint history | `anim history` | debugging, and the time travel used in Milestone 5 |
| Partial progress in parallel steps and subgraphs | `test_resume.py` | cheap retries |
| Serializer allowlists | `memory.serializer()` | safely persisting your own types |
| Stores, namespaces and injected `store` | `memory.py`, Scout, Librarian | cross-session facts, user profiles |
| Explicit memory policy | `is_settled()`, `remember_run()` | deciding what an agent should keep |
| One-time backfill | `backfill_from_cards()` | adding memory to an agent that already has data |

Next: **Milestone 5** puts a human in the loop. An `interrupt()` before publishing pauses the run
so you can approve or edit the digest. That pause is only possible because of this milestone: an
interrupt is a planned stop, saved in a checkpoint, that waits for you to resume it.
