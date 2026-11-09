# Animation Intelligence Agent — Build Plan

An agent that continuously researches animation across every style, finds what is going viral,
works out *why* it lands with viewers, and keeps a living knowledge base you can query.
Built with LangChain (models, tools, structured output), LangGraph (the agent's control flow,
memory, scheduling) and LangSmith (tracing, evals, datasets).

This document is both the design and the curriculum: each milestone teaches one agent-building
concept you will reuse on every future agent.

---

## 1. What we are actually building

**One sentence:** a research loop that runs on a schedule, scouts sources, triages candidates by
viral signal, deeply analyses the best ones into structured "Technique Cards", mines the cards for
patterns, verifies its own claims, stores everything, and reports back. You can ask it questions
at any time through retrieval over its knowledge base.

**Honest scoping notes**

- "All information on every style" is a moving target. We build a system that *accumulates and
  updates*, not a one-shot dump. The value is the loop, not a single run.
- Watching every video is not feasible or legal at scale. The agent reasons mostly from
  metadata, titles, descriptions, transcripts, comments, creator breakdowns, tutorials and
  release notes. True frame-level video analysis is reserved for a small curated set per run.
- Platform data access is uneven. YouTube has a real API. Reddit has an API. TikTok and
  Instagram do not offer usable public APIs, so we reach them indirectly through
  search engines, creator cross-posts to YouTube, and secondary coverage. We never scrape
  against terms of service, and we store metadata and analysis, not media.

## 2. Knowledge the agent is building

### 2.1 Style taxonomy (seed list, the agent extends it)

| Family | Examples |
|---|---|
| 2D hand-drawn | cel, limited animation, anime, rubber hose, rotoscope |
| 2D digital / vector | flat, isometric, cut-out, puppet rigging (Toon Boom, Moho, After Effects) |
| Motion graphics | kinetic typography, logo stings, explainers, infographics, UI/product motion |
| 3D | photoreal CGI, stylised 3D (Spider-Verse look), toon-shaded, 2.5D parallax |
| Stop motion | claymation, puppet, paper cut-out, pixilation, Lego brickfilm |
| Mixed media / collage | live-action composites, grain and texture, glitch, scanimation |
| Pixel and retro | pixel art, VHS, Y2K chrome |
| Generative / real-time | TouchDesigner, Houdini, Unreal/Unity, shader and audio-reactive |
| UI micro-interactions | Lottie, Rive, Framer, Jitter, Spline |
| AI-generated and AI-assisted | text/image-to-video models, interpolation, style transfer, AI rotoscoping |
| Abstract / experimental | morphing, liquid, satisfying loops, oddly satisfying physics |

### 2.2 The analysis lens: what makes a piece "hit" and "stick"

Every analysed item is scored on these dimensions with evidence quoted from the source:

1. **Hook** — what happens in the first 0.5 to 2 seconds. Pattern interrupt, motion into frame, question posed.
2. **Timing and easing** — anticipation, overshoot, hold frames, snap vs float, rhythm and contrast.
3. **Principles used** — the 12 classical principles plus modern ones: smear frames, secondary motion, follow-through.
4. **Loop quality** — seamless loop, rewatch bait, hidden detail that rewards a second view.
5. **Sound sync** — beat matching, foley on impact, silence as contrast, trending audio.
6. **Readability on mobile** — vertical framing, scale of detail, text size, duration.
7. **Novelty vs familiarity** — a new twist on a known format spreads faster than pure novelty.
8. **Emotional driver** — satisfying, funny, nostalgic, awe, relatable, "how did they do that".
9. **Process reveal** — before/after, breakdowns, tool reveals consistently drive saves and shares.
10. **Production signal** — tools, pipeline, estimated effort, reproducibility for a solo creator.

**Viral metrics we record when available:** views per day since posting, like rate, comment rate,
share and save counts, remix/duet counts, cross-platform spread, creator follower baseline
(so a small account going big counts more), and how long the item has sustained velocity.

### 2.3 The core data object: the Technique Card

```text
TechniqueCard
  id, title, source_urls[], first_seen, last_updated
  style_family, sub_style, tags[]
  tools[]  (After Effects, Blender, Rive, Cavalry, Procreate Dreams, ...)
  summary  (2-4 sentences)
  how_it_is_made  (step list, cited)
  why_it_works  (scores + quoted evidence on the 10 dimensions above)
  virality  (metrics snapshot + velocity)
  difficulty  (1-5), time_to_reproduce
  related_cards[], contradicting_evidence[]
  confidence  (0-1, set by the Critic node)
```

A second object, **Trend**, groups cards: name, time window, card ids, hypothesis of why it is
rising, counter-examples, and a confidence score. Trends are what the weekly digest is built from.

## 3. Architecture: the LangGraph graph

```text
              ┌──────────┐
   schedule ─▶│  Scout   │  search engines, YouTube API, Reddit, blogs, release notes
              └────┬─────┘
                   ▼
              ┌──────────┐   dedupe against memory, compute viral score,
              │  Triage  │   pick top-N for deep analysis
              └────┬─────┘
                   ▼  (Send: one Analyst per candidate, in parallel)
              ┌──────────┐   fetch page / transcript / comments,
              │ Analyst  │   optional frame sampling, write TechniqueCard
              └────┬─────┘
                   ▼
              ┌──────────┐   check every claim has a citation, flag
              │  Critic  │   hallucinations, send back to Analyst if weak
              └────┬─────┘  ◀─── loop (max 2 retries)
                   ▼
              ┌────────────┐  cross-card pattern mining, update Trends,
              │ Synthesizer│  update taxonomy if a new style appears
              └────┬───────┘
                   ▼
              ┌──────────┐   write cards, trends, embeddings, run log
              │ Librarian│   to the knowledge base
              └────┬─────┘
                   ▼
              ┌──────────┐   weekly digest, "what changed", open questions
              │ Reporter │   optional human-in-the-loop approval before publishing
              └──────────┘

   Separate graph:  Q&A  ──▶  Retriever (vector + structured filters) ──▶ Answer with citations
```

**Why this shape and not one big ReAct agent:** a single agent with 15 tools drifts, forgets what
it already analysed, and is impossible to evaluate. Splitting into nodes gives each step a
narrow job, a typed input and output, and its own eval. This is the pattern you will reuse for
every serious agent: *scout → filter → analyse → verify → store → report*.

### 3.1 State

```python
class RunState(TypedDict):
    run_id: str
    queries: list[str]                       # what Scout should look for this run
    candidates: list[Candidate]              # Scout output
    selected: list[Candidate]                # Triage output
    cards: Annotated[list[TechniqueCard], add]   # reducer: Analysts append in parallel
    critiques: dict[str, Critique]           # card_id -> verdict
    trends: list[Trend]
    report: str | None
    retries: dict[str, int]
```

### 3.2 Tools (plain Python functions wrapped with `@tool`)

- `web_search(query)` — Tavily or Exa; returns url, title, snippet, published date.
- `youtube_search(query, published_after)` and `youtube_stats(video_ids)` — YouTube Data API v3.
- `youtube_transcript(video_id)` — captions when present.
- `reddit_top(subreddit, window)` — r/MotionDesign, r/animation, r/AfterEffects, r/blender, r/Simulated, r/oddlysatisfying.
- `fetch_page(url)` — readable text from blogs, Motionographer, School of Motion, Behance, Vimeo Staff Picks, tool changelogs.
- `sample_frames(url, n)` — for the curated set only; sends n frames to a multimodal model.
- `kb_search(query, filters)` and `kb_upsert(card)` — the knowledge base.

### 3.3 Memory

- **Short-term:** LangGraph checkpointer (SQLite locally, Postgres later). Every run is a thread
  and can be resumed or inspected mid-way.
- **Long-term:** LangGraph `Store` for cross-run facts ("already analysed", taxonomy, creator
  watchlist) plus a vector store (Chroma locally, pgvector later) for card retrieval.

### 3.4 Observability and evaluation (LangSmith)

- Every run traced. You will read traces to debug prompts instead of printing.
- Datasets: 30 hand-labelled candidates for Triage (viral / not), 20 gold Technique Cards for
  Analyst, a rubric judge for "why it works" quality, a citation-coverage check for Critic.
- Regression runs on every prompt change.

## 4. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Language | Python 3.12, `uv` | LangGraph is Python-first; uv keeps installs fast and reproducible |
| LLM | Claude via `langchain-anthropic`, model id from `.env` | strong long-context reasoning and structured output; multimodal for frame analysis |
| Orchestration | `langgraph` | explicit state machine, parallel fan-out with `Send`, checkpoints, interrupts |
| Schemas | Pydantic v2 | typed Technique Cards, validated LLM output |
| Search | Tavily (default) or Exa | clean results with dates, generous free tier |
| Video metadata | YouTube Data API v3, `youtube-transcript-api`, `praw` | official or tolerated access |
| Storage | SQLite + Chroma (local), Postgres + pgvector (later) | zero setup to start, clear upgrade path |
| Tracing and evals | `langsmith` | required to debug and to prove improvements |
| CLI / scheduler | Typer CLI; cron or LangGraph Server for scheduled runs | simple first, hosted later |
| Dev UI | LangGraph Studio | watch the graph execute node by node |

## 5. Repository layout

```text
animation-agent/
  PLAN.md                  this document
  README.md                setup and run instructions
  pyproject.toml
  langgraph.json           lets LangGraph Studio and Server load the graph
  .env.example
  src/animation_agent/
    config.py              settings, model ids, API keys
    schemas.py             Candidate, TechniqueCard, Trend, Critique
    state.py               RunState and reducers
    graph.py               builds and compiles the graph
    nodes/
      scout.py  triage.py  analyst.py  critic.py  synthesizer.py  librarian.py  reporter.py
    tools/
      search.py  youtube.py  reddit.py  fetch.py  video.py  kb.py
    memory/
      store.py             checkpointer + long-term store + vector store
    prompts/               one markdown file per node, versioned in git
    qa_graph.py            the retrieval and answer graph
    cli.py                 `anim run`, `anim ask`, `anim digest`
  evals/
    datasets/              labelled candidates and gold cards
    judges.py              LLM-as-judge rubrics
    run_evals.py
  tests/
```

## 6. Milestones: build order and what each one teaches

Each milestone is small enough to finish in one sitting and ends with something running.
The "concept" column is the transferable lesson for your next agents.

| # | Milestone | What ships | Concept you learn |
|---|---|---|---|
| 0 | Foundation | repo skeleton, `uv` env, `.env`, LangSmith tracing on, one LLM call returning a `TechniqueCard` from a pasted description | structured output, tracing, why schemas come before prompts |
| 1 | First tool | `web_search` tool and a tiny ReAct agent that answers "what animation styles trended this month" | tool calling, the ReAct loop, when agents loop forever |
| 2 | First graph | 3-node graph Scout → Analyst → Librarian, run from CLI, cards saved to SQLite | `StateGraph`, nodes, edges, state and reducers; graph vs agent |
| 3 | Control flow | Triage with conditional edges, `Send` fan-out so Analysts run in parallel, Critic loop with retry cap | conditional edges, map-reduce, bounded loops |
| 4 | Memory | checkpointer, resume a failed run, long-term store so items are never analysed twice | threads, checkpoints, short vs long-term memory |
| 5 | Human in the loop | `interrupt()` before Reporter publishes; approve or edit the digest in Studio | interrupts, the Command pattern, where humans belong in a loop |
| 6 | Knowledge base and Q&A | Chroma embeddings, hybrid retrieval with structured filters, `anim ask` with citations | RAG done properly: metadata filters plus vectors, citation discipline |
| 7 | Synthesis | Synthesizer node mines trends across cards, maintains the taxonomy, writes the digest | multi-document reasoning, summarising with evidence counts |
| 8 | Evals | LangSmith datasets, judges, regression runs in CI | how to know a prompt change helped; the single most skipped skill |
| 9 | Multimodal | frame sampling for the top 3 items per run, visual analysis merged into cards | multimodal inputs, cost control, when to spend tokens |
| 10 | Deploy | scheduled weekly run, digest delivered to email or Notion, LangGraph Server | scheduling, secrets, running agents unattended |

Milestones 0 to 3 give you a working agent in roughly a week of evenings. Everything after
makes it trustworthy and self-sustaining.

## 7. How we will work together

1. For each milestone I first explain the concept in a short note and show the smallest
   possible example, then we build the real version in the repo.
2. You run every milestone yourself and read the LangSmith trace before we move on. Reading
   traces is how you develop intuition for agent behaviour.
3. Prompts live in `prompts/*.md` and are changed through git, so you can see exactly which
   wording changed a behaviour.
4. We keep a `DECISIONS.md` log: every architectural choice, the alternative, and why. That file
   becomes your personal playbook for future agents.
5. Evals before cleverness: once Milestone 8 exists, no prompt change lands without a run.

## 8. Risks and how we handle them

- **Hallucinated techniques.** Critic node requires a citation per claim; cards without
  evidence get `confidence < 0.5` and are excluded from digests.
- **Source bias toward YouTube.** Reddit, blogs, awards and tool changelogs balance it; the
  digest reports source mix so bias is visible.
- **Cost creep.** Triage caps deep analyses per run; frame sampling is capped at 3 items; cheaper
  model for Scout and Triage, strongest model for Analyst and Critic.
- **Terms of service.** Official APIs and public pages only, metadata not media, rate limits
  respected, nothing stored that we are not allowed to store.
- **Scope creep.** New ideas go in `BACKLOG.md`, not into the current milestone.

## 9. Immediate next steps

1. Confirm the stack choices above (Python, Claude, Tavily, SQLite + Chroma to start).
2. Create accounts and keys: Anthropic, LangSmith, Tavily, YouTube Data API, Reddit app.
3. Build Milestone 0 and 1.
