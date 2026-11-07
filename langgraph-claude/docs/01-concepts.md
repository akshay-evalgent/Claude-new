# 1. LangGraph with Claude: the concepts

## The one-sentence version

**LangGraph is a way to draw your AI workflow as a flowchart in code, where each box can call Claude, and the flowchart can loop, branch, pause for a human, and pick up where it left off.**

Claude is the brain in each box. LangGraph is the flowchart, the memory and the pause button.

## Why companies need the flowchart, not just the brain

A single Claude call can answer a question. A business process needs more:

| The company says... | What you need | LangGraph feature |
|---|---|---|
| "Check its work before it goes out" | Loops with a stop condition | Conditional edges |
| "Refund tickets go to a different flow than tech tickets" | Branching | Conditional edges / `Command` |
| "A manager must approve anything over $50" | Pause, wait for a person, resume | `interrupt()` + `Command(resume=...)` |
| "If the server restarts, don't lose the ticket" | Saved progress | Checkpointers (`SqliteSaver`, `PostgresSaver`) |
| "Do this for all 300 leads, fast" | Parallel fan-out, then combine | `Send` + reducers |
| "Show me what it did and why" | Step-by-step trace | Streaming + LangSmith tracing |

That table is the sales pitch too. Each row is a reason a company can't just hand the job to ChatGPT.

## The building blocks (each one is used in an example)

### State
A `TypedDict` that flows through the graph. Every node reads it and returns **only the keys it changes**.

```python
class State(TypedDict, total=False):
    task: str
    draft: str
    score: int
```
Seen in: `examples/01_reflection_loop.py`

### Nodes
Plain Python functions: `def node(state) -> dict_of_updates`. A node can call Claude, call an API, run SQL, or just compute something.

### Edges and conditional edges
- `graph.add_edge("write", "review")` means write always goes to review.
- `graph.add_conditional_edges("review", route, {...})` means a function you write picks the next node. This is how you build loops ("revise") and exits ("done").

### Reducers
By default, a returned key **overwrites** the old value. Add a reducer to **combine** instead:

```python
messages: Annotated[list[dict], operator.add]   # append, don't overwrite
```
Needed for chat history (`02_tool_agent.py`) and for collecting parallel results (`04_lead_research_parallel.py`).

### `Command`: update and jump in one step
A node can return `Command(update={...}, goto="next_node")` to decide where to go from inside the node. Seen in `propose_refund` in `03_support_triage_hitl.py`.

### `Send`: fan out in parallel
Return a list of `Send("node", payload)` from a router and LangGraph runs that node once per payload, in parallel. A reducer collects the results; the next normal edge waits for all of them. That's map-reduce. Seen in: `04_lead_research_parallel.py`.

### `interrupt()`: human in the loop
Inside a node, `decision = interrupt({...})` **stops the run** and returns the payload to whoever called the graph. Later, `graph.invoke(Command(resume=decision), config)` continues from that exact line. This needs a checkpointer. Seen in: `03_support_triage_hitl.py` and `05_serve_api.py`.

### Checkpointers and threads
`graph.compile(checkpointer=...)` saves state after every step, keyed by `thread_id`. One thread per conversation, ticket, or customer.

| Checkpointer | Use for |
|---|---|
| `InMemorySaver` | learning and tests |
| `SqliteSaver` (`langgraph-checkpoint-sqlite`) | demos, single-server apps |
| `PostgresSaver` (`langgraph-checkpoint-postgres`) | production |

### Streaming
`for update in graph.stream(input, config, stream_mode="updates"): ...` yields each node's output as it finishes. Use it to show progress in a UI ("Classifying... Looking up order... Drafting reply...").

### Subgraphs
A compiled graph can be a node in another graph. That's how you build "a team": a router graph that calls a research subgraph and a writing subgraph.

## How Claude plugs in (and why these examples use the Anthropic SDK directly)

There are two common ways to call Claude from LangGraph nodes:

1. **The official Anthropic SDK** (`anthropic`) inside your nodes, which is what these examples do (`examples/common.py`). You get every Claude feature the day it ships, with no translation layer:
   - `output_config={"effort": ...}` to trade depth for cost per node
   - `client.beta.messages.parse(output_format=PydanticModel)` for guaranteed-valid JSON (used for every routing decision)
   - `strict: True` tools, so arguments always match your schema
   - Server tools like web search (`04`, `--web`)
   - Server-side refusal fallbacks (`fallbacks="default"`)
2. **`langchain-anthropic`'s `ChatAnthropic`**, which most LangGraph tutorials use, together with LangChain's prebuilt agent helpers. It's faster to start with and plugs into LangChain's tool and message types. The cost is that new Claude features reach you after the wrapper adds them.

Either way the graph concepts are identical. Once you know them, you can read any tutorial.

Two rules that matter whichever you pick:
- **Send Claude's full reply back, not just the text.** In a tool loop, append every content block (thinking blocks with their signatures, and `tool_use` blocks) to the history. `blocks_to_dicts()` in `common.py` does this, and stores plain JSON, which keeps checkpoints portable.
- **Return all tool results in one user message**, and send failures back as `is_error: true` so Claude can recover. See the `tools` node in `02_tool_agent.py`.

## When *not* to use LangGraph

Picking the simplest tool that works is part of what clients pay a good consultant for.

| Situation | Use instead |
|---|---|
| One question, one answer (classify, summarise, extract) | A single Claude API call |
| A fixed sequence with no branching | Plain Python functions calling Claude |
| A simple "Claude + my tools" loop, no approvals or persistence | The Anthropic SDK's tool runner (`client.beta.messages.tool_runner`) |
| A coding or file-manipulating agent | The Claude Agent SDK (Claude Code as a library) |
| The client wants a hosted agent with a sandbox, scheduling and no infrastructure to run | Claude Managed Agents |
| Branching + loops + human approval + durable state + parallel steps | **LangGraph** |

LangGraph pays off when the **process** is complicated, not just the question.
