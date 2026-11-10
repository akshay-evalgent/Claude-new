# Animation Intelligence Agent

An agent that researches animation across every style, finds what is going viral, works out why
it lands, and keeps a living knowledge base you can query. Built with LangChain, LangGraph and
LangSmith, free-first.

- `PLAN.md` — architecture and the milestone curriculum
- `FREE-STACK.md` — what runs without paid keys, verified
- `sources.yaml` — where the Scout looks (video platforms, communities, blogs, GitHub, research labs, AI tool launches, tool changelogs)
- `docs/lessons/` — one lesson per milestone explaining the concept it teaches
- `DECISIONS.md` — each architectural choice, the alternative, and why

## Setup

Requirements: Python 3.11+, [uv](https://docs.astral.sh/uv/), and the `claude` CLI logged in
(for the default provider). From Milestone 1, keep Node or Deno on PATH: yt-dlp, which uv
installs, uses it for YouTube's JavaScript checks. ffmpeg is needed from Milestone 9.

```bash
cd animation-agent
cp .env.example .env
uv sync --extra dev
uv run pytest -q
uv run anim card            # Milestone 0: one Technique Card from the sample description
uv run anim youtube "claymation" --within month --sort views --stats   # Milestone 1: the tool alone
uv run anim research        # Milestone 1: the ReAct agent answers "what trended this month"
```

Switch provider by editing `LLM_PROVIDER` in `.env` and installing the matching extra, for
example `uv sync --extra anthropic` with an `ANTHROPIC_API_KEY`.

## Status

| Milestone | Status |
|---|---|
| 0 Foundation: schema, provider adapter, structured output, tracing hooks | done |
| 1 First tool and ReAct agent: yt-dlp YouTube tools, tool calling in the adapter, hand-written loop with guards | done |
| 2 First graph: Scout, Analyst, Librarian with SQLite | next |
