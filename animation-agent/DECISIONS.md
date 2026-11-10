# Decisions

Every architectural choice, the alternative, and why. Newest first.

## Milestone 6

- **Chroma with its built-in local embedding model.** PLAN.md's choice; no embedding key, and
  the model runs offline after one download. Full cards stay in SQLite; Chroma holds a document
  and filterable metadata per card.
- **Numbers live in metadata, never in the embedded text.** Vectors cannot compare quantities.
- **A cheap model turns the question into a `QueryPlan` (self-query).** Filters are exact, so
  they must be explicit; the prompt keeps them to what the question demands.
- **Filters relax in a fixed order (tools, difficulty, style, approval) below two hits, and the
  answer is told.** Better a labelled near match than an empty answer.
- **Approved cards only, unless the question asks for more.** Same gate as the digest.
- **Tools are matched in code after retrieval.** A card has several tools; a lowercase substring
  match is simpler and more reliable than a metadata filter.
- **Citations are numbers checked in code; the Sources list is built from the cards.** Invented
  numbers are removed and reported; uncited answers are flagged.
- **The Librarian indexes new cards, loading the embedding model only when there are cards.**
  An indexing failure is recorded, not fatal: the cards are safe in SQLite.

## Milestone 5

- **One human checkpoint, in front of publishing.** It is the only outward-facing step. Per-card
  approval would duplicate the Critic and turn the reviewer into a rubber stamp.
- **The Reporter is a separate node before `human_review`.** A node that interrupts reruns from
  its first line on resume; drafting there would pay for the draft again on every answer.
- **The Reporter writes prose only; code renders titles, links and numbers from the cards.**
  Same rule as the Analyst. Invented card ids are dropped, forgotten cards are kept.
- **The digest features Critic-approved cards; the rest are listed as held back.** PLAN.md's
  "confidence under 0.5" rule would exclude most approved cards, because metadata-only cards
  honestly score 0.3 to 0.5. Unapproved cards are capped at 0.49, so the intent is preserved.
- **Review answers are a Pydantic model; a bad answer pauses again with a note.** Human input is
  input. Crashing a paused run over a typo would be worse than asking again.
- **`human_review` routes with `Command`, with `destinations` declared.** The decision comes
  from the interrupt's return value, which a conditional edge could only read if it were stashed
  in the state first.
- **Up to three redrafts per digest.** Bounded loops apply to humans too.
- **Publishing writes a Markdown file and records every decision, including rejections.**
  Email or Notion delivery is Milestone 10.
- **Non-interactive shells leave the run paused and print how to review it.** Scheduled runs
  must never block on a prompt.

## Milestone 4

- **One run is one thread; the run id is the thread id.** Resuming, listing and inspecting runs
  all key off the id printed when a run starts.
- **SQLite checkpointer and store from `langgraph-checkpoint-sqlite`, in separate files.**
  `checkpoints.db` (safe to delete), `memory.db` (the agent's notes) and `anim.db` (the product)
  have different lifetimes, so they live apart. Postgres replaces both in Milestone 10.
- **Checkpoint serializer allowlists exactly the models in `schemas.py`.** Loading classes from
  disk is a security decision; LangGraph is moving to block unregistered types.
- **Memory policy: analysed is permanent, skipped lasts 30 days, failures are not remembered.**
  A skip never downgrades an analysed video. `--include-seen` and `--forget` are the overrides.
- **Scout filters on memory before fetching stats.** Known videos then cost nothing at all.
  Alternative: filter in Triage, which would still pay for stats.
- **Memory backfills from the knowledge base, only while empty.** Cards from before Milestone 4
  would otherwise be paid for again; running only on an empty memory keeps `--forget` meaningful.
- **Ctrl-C exits immediately after printing the resume hint.** Waiting for in-flight calls only
  produced tracebacks; anything mid-call reruns on resume either way.
- **Nodes that take `store` do not use `from __future__ import annotations`.** LangGraph reads the
  parameter type to decide what to inject, and string annotations silently get nothing.

## Milestone 3

- **Triage uses Haiku; Analyst and Critic use Opus.** PLAN.md's cost plan. Triage is one easy
  judgement per video in a single call. Set by `LLM_MODEL_TRIAGE`; non-Claude providers use one model.
- **Triage splits judgement from arithmetic.** The model scores interest without seeing views;
  code scores popularity. Priority = 0.7 × interest + 0.3 × viral. Craft gets most of the weight
  because Scout already filtered for popularity; at 60/40, popularity alone could outrank craft.
- **If Triage fails, fall back to popularity and record it.** A degraded run beats a stopped run.
- **Each selected video runs a subgraph, fanned out with `Send`.** Alternative: a flat graph where
  one Critic reviews every card and sends weak ones back. That needs a reducer that replaces cards
  by id and makes retries share state; per-video subgraphs keep each loop private and parallel.
- **The Critic checks quotes in code before the model reviews.** Quotes must be verbatim. A quote
  missing from the source forces "revise" regardless of the model's verdict.
- **The loop allows two revisions; after that the card is kept, flagged, confidence capped at
  0.49.** PLAN.md: under 0.5 means excluded from digests. Keeping it preserves the work and the
  reasons it failed.
- **The Critic sets card confidence.** As PLAN.md specified.
- **The Critic sees its previous round's issues; the Analyst changes only what they ask.** A live
  run oscillated (each revision fixed one issue and introduced another) until it hit the cap.
  Memory of the last round targets that; one rerun converged, which is evidence, not proof.
- **Progress from inside the subgraph uses custom stream events, not a wider output schema.**
  Widening the schema would leak drafts and critiques into the main graph's state.
- **Every Triage decision is stored, selected or not.** It is free labelled data for Milestone 8.

## Milestone 2

- **Scout and Librarian are plain code; only the Analyst calls a model.** Queries come from
  `sources.yaml`, shortlisting is a sort by views per day. Judgement goes where it is needed,
  and Triage (Milestone 3) is where shortlisting becomes a judgement.
- **Nodes are built by factories that take their dependencies.** Tests inject fake search, model
  and database and run the real graph. Alternative: monkeypatching module globals, which hides
  the dependencies.
- **The Analyst's source material is metadata plus the 15 most-liked comments.** Comments are the
  best free evidence for "why it works" and cost about three seconds per video. Transcripts and
  frames are blocked from cloud IPs and come in Milestone 9.
- **Code overwrites every fact on a card after the model answers.** Id, title, URL, metrics and
  dates come from the tools. The model only supplies judgement.
- **Cards are stored as full JSON plus a few query columns, keyed by `youtube:<video id>`.**
  Re-runs update rows instead of duplicating them. The store lives in `storage.py`; PLAN.md's
  `memory/` package arrives with checkpoints and long-term memory in Milestone 4.
- **Analysts run one after another for now.** Parallel fan-out with `Send` is Milestone 3's lesson.
  (Superseded in Milestone 3.)

## Milestone 1

- **First tool is yt-dlp YouTube search, not web search.** PLAN.md listed `web_search`. Keyless web
  search (`ddgs`) is blocked from cloud IPs, while yt-dlp search and metadata work from both cloud
  and home machines (see FREE-STACK.md). Web search comes back when the Scout needs blogs and news.
- **Search and stats are two tools, not one.** One tool that always fetched full stats would cost a
  few seconds per result. Two tools make the model choose what deserves the slow call, which is the
  planning behaviour we want to study.
- **Tool calling in the Agent SDK adapter uses a structured-output turn schema.** Alternative:
  register tools with the SDK as in-process MCP servers. That would hand the loop to Claude Code,
  and LangGraph must own the loop from Milestone 2. The schema approach keeps the standard
  `bind_tools` / `AIMessage.tool_calls` interface, so the same agent code runs on any provider.
- **The ReAct loop is hand-written, not `create_agent`.** The prebuilt hides the loop we want to
  learn, and would add the `langchain` package as a dependency. Milestone 2 replaces this loop
  with a LangGraph graph anyway.
- **Sort plus upload-window searches fall back to relevance results sorted in code.** YouTube
  sometimes returns nothing for that filter combination. The tool says when the fallback happened.
- **The Agent SDK adapter allows 3 turns per call, not 1.** Structured output uses an internal tool
  call and schema retries use more turns; a cap of 1 crashed a live run. With `tools=[]` the extra
  turns cannot be spent on anything else.
- **The forced final turn uses `tool_choice="none"` rather than only asking nicely.** Taking the
  tools away is enforced; a prompt is a request. The loop still stops if a provider ignores it.

## Milestone 0

- **Default LLM is the logged-in Claude account through the Claude Agent SDK**, with a `.env`
  switch to an API key, Gemini or Ollama. Reasoning in FREE-STACK.md, section 1.
- **Schemas before prompts.** `TechniqueCard` and its validation rules came first; see Lesson 0.
