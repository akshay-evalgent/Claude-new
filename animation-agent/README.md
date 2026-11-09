# Animation Intelligence Agent

An agent that researches animation across every style, finds what is going viral, works out why
it lands, and keeps a living knowledge base you can query. Built with LangChain, LangGraph and
LangSmith, free-first.

- `PLAN.md` — architecture and the milestone curriculum
- `FREE-STACK.md` — what runs without paid keys, verified
- `sources.yaml` — where the Scout looks (video platforms, communities, blogs, GitHub, research labs, AI tool launches, tool changelogs)
- `docs/lessons/` — one lesson per milestone explaining the concept it teaches

## Setup

Requirements: Python 3.11+, [uv](https://docs.astral.sh/uv/), and the `claude` CLI logged in
(for the default provider). ffmpeg, yt-dlp and Node or Deno are needed from Milestone 1 onward.

```bash
cd animation-agent
cp .env.example .env
uv sync --extra dev
uv run pytest -q
uv run anim card            # Milestone 0: one Technique Card from the sample description
```

Switch provider by editing `LLM_PROVIDER` in `.env` and installing the matching extra, for
example `uv sync --extra anthropic` with an `ANTHROPIC_API_KEY`.

## Status

| Milestone | Status |
|---|---|
| 0 Foundation: schema, provider adapter, structured output, tracing hooks | done |
| 1 First tool and ReAct agent | next |
