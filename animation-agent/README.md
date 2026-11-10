# Animation Intelligence Agent

An agent that researches animation, finds what is getting attention, works out why it lands, and
keeps a knowledge base you can question. It runs on a schedule, writes a digest, waits for your
approval, and delivers it. Built with LangChain, LangGraph and LangSmith, free-first: it runs on
your Claude login, with no paid API key required.

```text
scout -> triage -> [ gather -> look -> analyst <-> critic ] x N in parallel -> librarian
      -> synthesizer -> reporter -> human review (pause) -> publish (file, email, Notion)
```

- **Scout** searches YouTube and skips videos it has already seen.
- **Triage** (Haiku) picks what a motion designer could learn from.
- **Analyst** (Opus) writes a Technique Card from metadata, top comments and, for the top picks,
  frames described by a vision model.
- **Critic** (Opus) checks every quote word for word and sends weak cards back, at most twice.
- **Librarian** stores cards in SQLite and a local Chroma index.
- **Synthesizer** finds trends with evidence counts.
- **Reporter** drafts a digest, which you approve before it is published.

## Getting started on your machine

1. **Install the tools**
   - Python 3.11 or newer
   - [uv](https://docs.astral.sh/uv/)
   - Node.js or Deno, which yt-dlp needs for YouTube
   - ffmpeg, for frames
   - [Claude Code](https://code.claude.com), then run `claude` once and log in
2. **Set up the project**

   ```bash
   cd animation-agent
   cp .env.example .env
   uv sync --extra dev
   uv run anim doctor --live
   ```

   Fix anything marked FAIL. WARN items are optional.
3. **First run**

   ```bash
   uv run anim run
   ```

   It ends at a review prompt for the digest.
4. **Use the knowledge base**

   ```bash
   uv run anim ask "Which stop motion techniques could a solo creator try?"
   ```

5. **Optional delivery.** In `.env`, set `DELIVER_TO=file,email` (or `notion`) and fill in the SMTP
   or Notion settings. `anim doctor` says what is missing.
6. **Schedule it**

   ```bash
   uv run anim schedule install --every week --day mon --at 07:45
   ```

   Scheduled runs pause for your review and email you a notice if email is set up.
7. **Optional tracing.** In `.env`, set `LANGSMITH_TRACING=true` and `LANGSMITH_API_KEY`, using the free
   Developer plan at smith.langchain.com.

If YouTube asks yt-dlp to sign in before downloading frames, set `YTDLP_COOKIES_FROM_BROWSER=chrome`
(or your browser) in `.env`. Searches and stats do not need it.

## Everyday commands

| Command | What it does |
|---|---|
| `anim run` | full run; `--cards N`, `--frames N`, `-q "query"`, `--no-digest`, `--unattended` |
| `anim review <run id>` | approve, edit, revise or reject a paused digest (`--approve`, `--feedback "..."`) |
| `anim runs` / `anim resume <run id>` | list runs; continue one that stopped |
| `anim cards` / `anim show <id>` | browse cards and the Critic's verdicts |
| `anim ask "..."` | question the knowledge base, with cited cards |
| `anim trends` / `anim taxonomy` | trends with evidence counts; discovered sub-styles |
| `anim memory` | what the agent remembers analysing or skipping (`--forget <id>`) |
| `anim look <url>` | what a vision model sees in a video's frames |
| `anim eval run` | evals against `evals/baseline.json` (`--check` for CI) |
| `anim doctor` | health check with fixes |
| `anim schedule show / install / remove` | cron setup |

A default run (8 queries, 3 cards) took about 2.5 minutes and cost about $1 of usage in testing,
almost all of it Opus. Use `--cards` and `--frames` to trade depth for cost.

## Where things live

| Path | What |
|---|---|
| `data/anim.db` | the knowledge base: cards, reviews, sources, Triage decisions, trends, digests, deliveries |
| `data/chroma/` | the search index (rebuild with `anim index --rebuild`) |
| `data/memory.db` | long-term memory and the taxonomy |
| `data/checkpoints.db` | saved run steps, for resume and review; safe to delete |
| `data/digests/` | published digests and `PENDING-*` drafts |
| `evals/` | frozen datasets and the baseline, versioned in git |

## Known limits

- **YouTube downloads.** YouTube blocks video downloads, and so frames, from cloud and datacenter
  IPs. Run the agent on your own machine.
- **TikTok and Instagram.** They have no free feeds, so the Scout covers YouTube. See
  `FREE-STACK.md`.
- **Triage labels.** The eval labels for Triage are drafts by Opus until you confirm them with
  `anim eval label`.
- **Card confidence.** Cards built without frames carry moderate confidence (about 0.3 to 0.5) by
  design. The Critic keeps it honest.

## Docs

- `PLAN.md`: architecture and the milestone curriculum
- `FREE-STACK.md`: what runs without paid keys
- `DECISIONS.md`: every architectural choice, the alternative, and why
- `docs/lessons/`: one lesson per milestone, 00 to 10
- `sources.yaml`: where the Scout looks

## Status

| Milestone | Status |
|---|---|
| 0 Foundation: schema, provider adapter, structured output, tracing hooks | done |
| 1 First tool and ReAct agent: yt-dlp YouTube tools, tool calling, hand-written loop with guards | done |
| 2 First graph: Scout, Analyst, Librarian, cards in SQLite, Studio config | done |
| 3 Control flow: Haiku Triage, parallel card pipelines with `Send`, Critic loop with a retry cap | done |
| 4 Memory: checkpoints to resume a stopped run, a store so no video is analysed twice | done |
| 5 Human in the loop: digest drafted, `interrupt()` for approve / edit / revise / reject, publish | done |
| 6 Knowledge base: local embeddings, self-query filters, `anim ask` with checked citations | done |
| 7 Synthesis: trends with evidence counts, change tracking, taxonomy | done |
| 8 Evals: frozen datasets, code metrics plus an Opus judge, baseline checks, CI | done |
| 9 Multimodal: frames for the top picks, vision notes cited in cards | done |
| 10 Deploy: unattended runs, cron, email and Notion delivery, `anim doctor` | done |
