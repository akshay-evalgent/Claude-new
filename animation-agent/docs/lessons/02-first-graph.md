# Lesson 2 — The first graph: Scout, Analyst, Librarian

What shipped: `uv run anim run` executes a three-node LangGraph graph. Scout finds this month's
most-watched animation videos, Analyst turns the top ones into Technique Cards using their
metadata and most-liked comments, and Librarian saves the cards and a run log to SQLite.
`anim cards` and `anim show` read them back. The same graph loads in LangGraph Studio.
24 tests pass, including the whole graph run end to end with fakes.

```text
START -> scout -> analyst -> librarian -> END
```

## The three ideas in this milestone

### 1. State and reducers (`state.py`)

A LangGraph graph has one shared state, here a `TypedDict` called `RunState`. A node is a plain
function that receives the state and returns **only the keys it changed**:

```python
def librarian(state: RunState) -> dict:
    ...
    return {"saved": saved}
```

LangGraph merges that partial update into the state. How it merges is set per key by a reducer:

| Key | Reducer | Behaviour |
|---|---|---|
| `candidates`, `saved`, `run_id` | none | the update replaces the old value |
| `cards`, `errors` | `Annotated[list, operator.add]` | the update is appended |

Both Scout and Analyst write `errors`. Because of the append reducer, the final state holds both
nodes' errors; `test_end_to_end_saves_cards_with_facts_from_tools` checks exactly that. `cards`
gets the same reducer now, while one Analyst writes them all, because in Milestone 3 several
Analysts run in parallel. Without the reducer, only the last one's card would survive.

`StateGraph(RunState, input_schema=RunInput)` also declares which keys a caller may pass in.
Studio uses it to show an input form with exactly those fields.

### 2. Graph vs agent (`graph.py`, `nodes/`)

Compare Milestone 1 with this one:

| | Milestone 1 agent | Milestone 2 graph |
|---|---|---|
| Who decides the next step | the model, every turn | code: the edges |
| Model calls | every step | only in Analyst |
| Same input, same path | no | yes |
| Test one step alone | hard | each node is a function |
| When it fails | read the whole transcript | the error names the node |

Scout and Librarian contain no model at all. Choosing queries is config (`sources.yaml`),
running searches is code, and shortlisting is a sort by views per day. Nothing there needs
judgement, so it gets none, which makes those steps fast, free and repeatable. The model is used
only where judgement is the job: reading a video's description and comments and explaining why
it works. That is the rule to carry into every agent: **put the model only where judgement is
needed, and make everything else plain code.**

Agents are not wrong. They suit open-ended questions like Milestone 1's. Pipelines that run every
week, unattended, are better as graphs, and later milestones add the agent-like parts back
inside the graph, where you can see and test them: a conditional edge for Triage, a bounded
loop for the Critic.

Each node comes from a factory (`make_scout`, `make_analyst`, `make_librarian`) that takes its
dependencies as arguments. The tests pass a fake search, a fake model chain and a temporary
database, then run the real graph. That is dependency injection, and it is why a full pipeline
test runs in under a second.

### 3. The model judges, code copies facts (`nodes/analyst.py`)

The Analyst sends the model a block of source material built by `source_material()`: title,
channel, follower count, metrics, tags, the creator's description, the most-liked comments,
and a final line saying what is *not* available (frames, audio, transcript). Saying what is
missing matters: it is why every card in the first run has a confidence of 0.25 to 0.30 instead
of pretending to have watched the video.

After the model returns a card, `finalize()` overwrites every fact with what the tools measured:
id, title, URL, views, likes, comments, dates, and the computed rates. The test deliberately
feeds back a card with a made-up URL and a like count of 999,999, and checks that both are
replaced. Milestone 0 said "compute in code, judge in model"; this is the same rule applied at
the end of a node: facts come from tools, never from the model's memory of the input.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim run                                          # defaults: sources.yaml queries, this month, 3 cards
uv run anim run -q "claymation" -q "kinetic typography" --cards 2
uv run anim cards
uv run anim show youtube:<id from the list>
```

`anim run` uses `graph.stream(..., stream_mode="updates")`, which yields each node's partial
update the moment that node finishes. That is how the CLI prints Scout's shortlist before the
Analyst starts. `graph.invoke()` would wait and return only the final state.

Run the same command twice. `anim cards` still lists each video once: cards are keyed by
`youtube:<video id>`, so the second run updates the row, keeps the original `first_seen` date,
and moves `last_updated`. It does still pay to analyse the same videos again; remembering what
was already analysed is Milestone 4.

## Open it in LangGraph Studio

`langgraph.json` tells LangGraph's dev server where the graph lives. Start it with:

```bash
uv run --with "langgraph-cli[inmem]" langgraph dev
```

It prints a Studio link. Open it to see the graph drawn, fill in the input form, run it, and
click any node to inspect the state before and after it. If port 2024 is busy it picks another
port and prints that one. `graph.py` uses absolute imports because the dev server loads the file
by path.

## Read the trace

With tracing on, one `anim run` produces a parent run named `animation-pipeline` with one child
per node. Open `analyst` to see one child chain per card, each with the full source material as
input and the parsed card as output. When a card looks wrong, this is where you find out
whether the source material was thin or the model misread it.

## What the first run showed

| | |
|---|---|
| Candidates after dedupe and stats | 12 from 8 queries |
| Cards written | 3, confidence 0.25 to 0.30 |
| Model calls | 3, one after another, 76 seconds in total |
| Whole run | 1 minute 48 seconds, about $0.23 |

The three top videos by views per day were MrBeast's animated-series promo, a kids' cartoon short
and a 3D explainer short. The cards are honest: the promo's card scores its hook and process
reveal highly, and docks timing and craft because the most-liked craft comment, with 3,300 likes,
calls the animation stiff. But it shows the gaps the next milestone closes:

- **The shortlist is a sort, not a judgement.** Views per day finds big videos, not interesting
  techniques. Triage, a model step with a conditional edge, decides what is worth a card.
- **Cards are analysed one at a time.** Three took 76 seconds; twenty would take eight minutes.
  `Send` fans out one Analyst per candidate in parallel, which is why `cards` already has an
  append reducer.
- **Nobody checks the Analyst.** A Critic node will check every claim against the source
  material and send weak cards back, in a loop with a retry cap.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| `StateGraph`, nodes, edges, `START`/`END` | `graph.py` | every LangGraph agent |
| Partial updates and reducers | `state.py` | any graph where nodes share data |
| Input schema | `RunInput` | clean entry points and Studio forms |
| Node factories for dependency injection | `nodes/` | testing graphs without network or model |
| Streaming node updates | `cli.py` `run` | progress output, UIs |
| Facts from tools, judgement from the model | `finalize()` | any node that calls a model |
| Upsert by stable id | `storage.py` | idempotent pipelines |

Next: **Milestone 3** adds control flow: a Triage node with conditional edges, `Send` to run one
Analyst per candidate in parallel, and a Critic loop with a retry cap.
