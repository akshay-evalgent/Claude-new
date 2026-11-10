# Lesson 1 — First tool and a hand-written ReAct agent

What shipped: two keyless YouTube tools built on yt-dlp, tool calling for the Claude Agent SDK
adapter, and a ReAct agent you run with `uv run anim research`. It answers "what animation styles
trended this month" from live data, with real view counts and links. 18 tests pass, none of them
touching the network or a model.

## The three ideas in this milestone

### 1. Tool calling is structured output (`llm.py`, `tools/youtube.py`)

A model cannot run code. "Calling a tool" means the model fills in a schema that names a function
and its arguments, your code runs the function, and the result goes back as a message. Milestone 0
already taught structured output, so this is one step further.

Read `bind_tools` and `_tool_turn_schema` in `llm.py`. Each turn, the model must return:

```json
{"thought": "...", "tool_calls": [{"name": "youtube_search", "args": {"query": "claymation", "uploaded_within": "month"}}]}
```

or a `final_answer` instead of `tool_calls`. Each allowed call is constrained to one real tool name
plus *that tool's own argument schema*, so a misspelled tool or a wrong argument type is caught
before your code runs. `ChatAnthropic`, `ChatOpenAI` and the rest do the same thing inside the
provider's API. We had to write it because the Agent SDK only offers structured output, and that
turned out to be all you need.

Three rules about tools that apply to every agent:

- **The docstring is part of the prompt.** `@tool(parse_docstring=True)` turns the docstring and
  type hints into the JSON schema the model reads. "It does NOT return upload date: call
  youtube_video_stats for those" is an instruction, and the model followed it.
- **Tool output is prompt tokens.** `_compact()` drops empty fields and keeps only what the model
  needs. Every byte a tool returns is re-sent on every later turn.
- **Write the plain function first and test it without a model.** `search_youtube()` and
  `fetch_videos()` are ordinary functions returning `Candidate` objects. `anim youtube` calls them
  directly. When the agent misbehaves, you can tell in seconds whether the tool or the model is wrong.

Splitting search from stats was deliberate. Search is one request; stats cost a few seconds per
video. Two tools force the model to plan: search wide and cheap, then spend stats calls on the
promising ids. That planning is what makes it an agent rather than a script.

### 2. The ReAct loop and why agents loop forever (`m1_research_agent.py`)

ReAct means Reason + Act. Strip away the safety code and the whole algorithm is:

```python
while True:
    ai = llm.invoke(messages)          # reason: answer, or ask for tools
    messages.append(ai)
    if not ai.tool_calls:
        return ai.content
    for call in ai.tool_calls:         # act: run tools, feed results back
        messages.append(ToolMessage(run(call), tool_call_id=call["id"]))
```

That `while True` is the problem. Agents loop forever for a few predictable reasons: the goal has
no clear "done", a tool keeps failing the same way, the model repeats a call hoping for a different
answer, or it keeps finding one more thing to check. `run_research` adds three guards, and every
agent you build needs some version of each:

| Guard | What it does | Test that proves it |
|---|---|---|
| Step cap | After `max_steps` tool turns, one last turn asks for an answer with the tools taken away (`tool_choice="none"`); if the model still wants tools, the loop stops anyway | `test_stuck_agent_hits_step_limit_and_still_returns` |
| Errors as observations | A failing tool returns `ERROR: ...` text the model can react to, instead of crashing the run | `test_tool_errors_become_observations_not_crashes` |
| Repeat guard | An identical call is refused with a note pointing at the earlier result | same stuck-agent test |

The key line is the comment above the final turn: *the loop's exit must never depend on the model
behaving.* The tests use a scripted fake model that asks for the same tool forever, which is the
cheapest way to prove your exits work.

LangChain ships this loop prebuilt (`create_agent` in the `langchain` package). We wrote it by hand
so you can see it. In Milestone 2 we replace it with an explicit LangGraph graph, where each guard
becomes a visible edge or node.

### 3. Context grows every turn, so cost does too

The model is stateless. Each turn re-sends the system prompt, the question, every earlier thought,
every tool call and every tool result. This is from the first real run of the default question:

| Model turn | What it did | Cost |
|---|---|---|
| 1 | Planned, then 6 searches in one batch | $0.03 |
| 2 | Stats for 16 videos plus 3 more searches | $0.07 |
| 3 | Stats for 8 more videos | $0.14 |
| 4 | Wrote the answer | $0.29 |

That run took 3 tool turns, 12 tool calls, under 2 minutes and about $0.53. Cost roughly doubled
each turn because the transcript did. Two habits follow:

- **Batch independent calls into one turn.** The prompt says so, and the model put 6 searches in its
  first turn. Six separate turns would have re-sent the transcript six times.
- **Keep tool output small.** Description text is capped at 500 characters and tags at 10 for this reason.

## Two real-world lessons the live runs taught us

Both bugs below passed every fake-model test and only showed up against the real services. Run
the real thing before you call a milestone done.

**YouTube's filter quirk.** The first run showed two searches returning zero results. That was not a parsing bug: YouTube
sometimes returns nothing when "sort by views" is combined with "this month", even though each
filter works alone. `search_youtube` now falls back to relevance results in the same window,
re-sorts them by views in code, and adds a `note` to the tool output so the model knows the ranking
is ours, not YouTube's. Tools should explain their own quirks to the model, not hide them. In a
later run the agent repeated that note in its "limits" section unprompted.

**The forced final turn crashed.** A `--max-steps 2` run died on its last call with "Reached maximum
number of turns (1)". Claude Code returns structured output through an internal tool call, which
uses turns. When the output fails the schema it retries, and a one-turn cap leaves no room for
that. Two fixes: the adapter now allows a few turns (safe, because with `tools=[]` nothing else can
use them), and the final turn binds the tools with `tool_choice="none"` so answering is the only
option. Turn caps and step caps are the same idea at two levels. Set both, and leave headroom.

## Run it yourself

```bash
cd animation-agent
uv sync --extra dev
uv run pytest -q
uv run anim youtube "claymation" --within month --sort views --stats    # the tool alone, no model
uv run anim research                                                    # the agent, default question
uv run anim research "Which stop motion formats are growing this week?" --max-steps 3
```

Step-by-step progress goes to stderr and the answer to stdout, so
`uv run anim research > answer.md` saves only the answer. `ANIM_DEBUG=1` prints cost per model call.

Try these to see the guards fire:

1. `--max-steps 1`: the agent gets one tool turn, then the forced final turn. Compare the answer's
   "limits" section with a full run.
2. Simulate an outage: add `raise RuntimeError("simulated outage")` as the first line of `_extract`
   in `tools/youtube.py`, then run `uv run anim research --max-steps 2`. Watch every tool call fail,
   the errors come back as observations, and the agent explain what it could not check instead of
   crashing. Remove the line afterwards.

## Read the trace

With tracing on (see Lesson 0), open the `animation-agent` project in LangSmith. One run of
`m1_research_agent` contains alternating children: `claude-code-agent-sdk` (a model turn) and
`youtube_search` or `youtube_video_stats` (tool runs). Open a model turn and read its input: you will
see the whole transcript growing turn by turn, which is idea 3 made visible. Open a tool run to see
exactly what the model asked for and exactly what came back.

## What to notice in the answer

The first run ranked "cozy village-life shorts" and kids' clay stories above anything a motion
designer would call a style. That is what YouTube's most-viewed list actually contains, and the
agent was honest about it. But it shows three gaps that later milestones close:

- **No filter for relevance to motion design.** Triage, in Milestone 3, decides what is worth analysing.
- **Suspicious metrics.** The agent itself flagged a channel showing 10 followers and a video with a
  like rate that suggests paid promotion. Checking claims like that becomes the Critic node's job.
- **No memory.** Run it twice and it starts from scratch. Milestone 4 adds memory.

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Tool calling as structured output | `llm.py` `bind_tools` | adding tools to any model, even ones without native tool support |
| Docstring and type hints as tool schema | `tools/youtube.py` | every tool you write |
| Plain function first, `@tool` wrapper second | `tools/youtube.py` | testing tools without a model |
| The ReAct loop and its three guards | `m1_research_agent.py` | any agent with a loop |
| Scripted fake model in tests | `tests/test_react_loop.py` | testing agent control flow for free |
| Context growth and batching | idea 3 | cost control in every agent |

Next: **Milestone 2** turns this into a three-node LangGraph graph (Scout, then Analyst, then
Librarian) run from the CLI, with Technique Cards saved to SQLite. The `Candidate` schema and the
YouTube functions become the Scout node's building blocks.
