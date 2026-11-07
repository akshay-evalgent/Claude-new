# LangGraph + Claude: learn it, build it, sell it

A hands-on kit for learning to build AI agents with **LangGraph** (the workflow) and **Claude** (the model), and for turning that skill into paid work for startups and companies.

```
langgraph-claude/
├── docs/
│   ├── 01-concepts.md        what LangGraph is, every building block, when NOT to use it
│   ├── 02-use-cases.md       use cases companies pay for, by department and niche; how to pick one
│   ├── 03-making-money.md    offers, pricing, Claude running costs, finding clients, proposals, delivery
│   └── 04-production.md      evals, approvals, persistence, security, monitoring, go-live checklist
├── examples/
│   ├── common.py                     the one place that calls Claude (Anthropic SDK)
│   ├── 01_reflection_loop.py         write -> review -> revise loop          (state, edges, loops)
│   ├── 02_tool_agent.py              order-support agent with tools          (reducers, tool loop)
│   ├── 03_support_triage_hitl.py     triage + refund approval + memory       (routing, interrupt, checkpoints)
│   ├── 04_lead_research_parallel.py  research N leads in parallel, rank them (Send, map-reduce, web search)
│   └── 05_serve_api.py               example 03 as an HTTP API               (how you deliver to a client)
└── tests/test_examples.py    runs every graph offline against a fake Claude (no API key needed)
```

## Setup

```bash
cd langgraph-claude
```

```bash
python3 -m venv .venv && source .venv/bin/activate
```

```bash
pip install -r requirements.txt
```

**Try everything offline first.** No key and no cost; this proves the graphs are wired correctly:

```bash
pytest tests -q
```

**Then run against Claude.** Create an API key in the Claude Console (platform.claude.com):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

```bash
python examples/01_reflection_loop.py "Cold email to a dental clinic offering an AI receptionist"
```

```bash
python examples/02_tool_agent.py "Where is order A-1002 and when will it arrive?"
```

```bash
python examples/03_support_triage_hitl.py
```

```bash
python examples/04_lead_research_parallel.py --web
```

```bash
python examples/05_serve_api.py
```

Then open http://localhost:8000/docs to try the API.

The examples default to Claude Opus 5.5 (`claude-opus-5-5`). Set `CLAUDE_MODEL` to try another model, for example `claude-sonnet-5-5`. See `docs/03-making-money.md` for what each costs to run.

To see any graph as a diagram, run `python examples/01_reflection_loop.py --diagram` and paste the output into https://mermaid.live.

## The learning path (4 weeks, a few hours a week)

### Week 1: the core ideas
- Read `docs/01-concepts.md`.
- Run `pytest tests -q`, then run examples 01 and 02 live.
- Read each example top to bottom. They're short on purpose, and every concept is labelled in the docstring.
- **Exercises**
  - 01: add a third node, `brand_check`, between review and the end that rejects drafts containing banned words, and loop back if any are found.
  - 02: add a `create_return(order_id, reason)` tool. Make Claude call `get_policy("returns")` first by saying so in the system prompt.

### Week 2: the patterns companies pay for
- Run examples 03 and 04. In 03, play the approver; try approving and rejecting.
- **Exercises**
  - 03: change `InMemorySaver` to `SqliteSaver`, stop the script at the approval prompt, restart it, and resume the same `thread_id`. This is the "survives a restart" feature clients care about. Hint: on start, check `graph.get_state(config).interrupts` before starting a new run, as `05_serve_api.py` does.
  - 03: add an `"escalate"` category for angry or legal-sounding tickets that skips Claude's reply and pauses for a human.
  - 04: read leads from a CSV instead of the `LEADS` list, and write the results to a CSV.

### Week 3: make it production-shaped
- Read `docs/04-production.md`. Run example 05 and call it with the `/docs` page.
- **Exercises**
  - Build a 20-case eval set for example 03 (tickets plus the correct category) and a script that prints accuracy.
  - Log `response.usage` in `common.py` and print the cost of each run.
  - Use `graph.stream(..., stream_mode="updates")` to print progress as each node finishes.

### Week 4: point it at a business
- Read `docs/02-use-cases.md` and `docs/03-making-money.md`.
- Pick one niche and one workflow. Adapt example 02 or 03 to it with realistic fake data.
- Record a 2-minute demo video and publish a build post. Start discovery conversations.

## What's in the examples that matters for real work

- **Claude called through the official Anthropic SDK** (`examples/common.py`), so every new Claude feature is usable immediately: effort levels per node, guaranteed-valid JSON through Pydantic models, strict tool schemas, server-side web search, and automatic refusal fallbacks.
- **Structured outputs drive routing.** Claude's decisions come back as validated Pydantic objects, not text you have to parse.
- **Human approval before risky actions**, with auto-approval under a threshold.
- **Plain-JSON state**, so checkpoints work with SQLite or Postgres and runs can pause for hours.
- **Hard limits on every loop**, so a confused agent can't run up the bill.
- **Offline tests** with a fake Claude client. Use the same approach in client projects so you can change a graph without spending money to check it still works.

## Next steps once you've done the four weeks

- Add retrieval (RAG) over a client's documents to example 02, with citations in the answer.
- Build a supervisor graph that routes between example 02 and example 04 as subgraphs.
- Swap the fake data in example 02 for a real sandbox API (a Shopify development store, Stripe test mode, a HubSpot developer account).
