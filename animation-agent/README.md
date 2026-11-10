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
(for the default provider). Keep Node or Deno on PATH: yt-dlp, which uv installs, uses it for
YouTube's JavaScript checks. ffmpeg and ffprobe are needed for frames (Milestone 9).

```bash
cd animation-agent
cp .env.example .env
uv sync --extra dev
uv run pytest -q
uv run anim card            # Milestone 0: one Technique Card from the sample description
uv run anim youtube "claymation" --within month --sort views --stats   # Milestone 1: the tool alone
uv run anim research        # Milestone 1: the ReAct agent answers "what trended this month"
uv run anim run             # the graph: Scout, Triage, parallel Analyst + Critic, Librarian
uv run anim cards           # list saved cards and the Critic's verdict; `uv run anim show <id>` prints one
uv run anim resume <run id> # continue a stopped run; `anim runs` lists runs, `anim history <id>` its steps
uv run anim memory          # what the agent remembers analysing or skipping
uv run anim review <run id> # approve, edit, revise or reject a paused digest; `anim digests` lists decisions
uv run anim ask "..."       # question the knowledge base; answers cite their cards
uv run anim trends          # trends across recent cards (--refresh recomputes); `anim taxonomy` lists sub-styles
uv run anim eval run        # evals against evals/baseline.json; `anim eval build` refreshes the datasets
uv run anim look <url>      # sample frames from a video and see what the vision model notes
```

To open the graph in LangGraph Studio: `uv run --with "langgraph-cli[inmem]" langgraph dev`.

Switch provider by editing `LLM_PROVIDER` in `.env` and installing the matching extra, for
example `uv sync --extra anthropic` with an `ANTHROPIC_API_KEY`.

## Status

| Milestone | Status |
|---|---|
| 0 Foundation: schema, provider adapter, structured output, tracing hooks | done |
| 1 First tool and ReAct agent: yt-dlp YouTube tools, tool calling in the adapter, hand-written loop with guards | done |
| 2 First graph: Scout, Analyst and Librarian nodes, cards in SQLite, Studio config | done |
| 3 Control flow: Haiku Triage with conditional edges, parallel card pipelines with `Send`, Critic loop with a retry cap | done |
| 4 Memory: SQLite checkpoints to resume a stopped run, a long-term store so no video is analysed twice | done |
| 5 Human in the loop: Reporter drafts a digest, `interrupt()` pauses for approve / edit / revise / reject, then publish | done |
| 6 Knowledge base and Q&A: local Chroma embeddings, self-query filters with relaxation, `anim ask` with checked citations | done |
| 7 Synthesis: trends across cards with evidence counts computed in code, change tracking, taxonomy, digest sections | done |
| 8 Evals: frozen datasets, code metrics plus an Opus judge, baseline with regression checks, CI workflow | done |
| 9 Multimodal: frames from the top picks (scene detection), vision notes merged into the source material | done |
| 10 Deploy: schedule, digest delivery, health check | next |
