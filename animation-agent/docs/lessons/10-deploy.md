# Lesson 10 — Running on its own: schedule, delivery, health check

What shipped: `anim run --unattended` for schedules, `anim schedule install` to put it in cron,
delivery of approved digests by email and to Notion, a review notice when a scheduled run is
waiting for you, `anim doctor` to check everything the agent needs, and a final end-to-end pass
run exactly the way the schedule runs it. 103 tests pass.

## The three ideas in this milestone

### 1. Unattended does not mean unreviewed (`cli.py`, `delivery.notify_review`)

A scheduled run cannot ask questions. `--unattended` never prompts: when the digest is ready it
writes `data/digests/PENDING-<run id>.md`, emails a review notice with the exact commands if email
is configured, and exits. The run waits in its checkpoint, from Milestones 4 and 5, until
`anim review <run id>` answers it, whether that is minutes or days later. Removing the human is a
separate, explicit choice: `--auto-approve` publishes the first draft, and nothing turns it on by
default.

### 2. Delivery is a list of independent channels (`delivery.py`)

`DELIVER_TO=file,email,notion` in `.env`. The file is always written first, so a failed email can
never lose a digest. Each channel then succeeds or fails on its own, and every outcome is stored in
the `deliveries` table and printed:

- **email**: any SMTP server. With Gmail, use an app password on smtp.gmail.com, port 587.
- **notion**: an internal integration token and a page shared with it. Each digest becomes a child
  page. `markdown_to_blocks()` converts the digest's headings, bullets, paragraphs and links, and
  pages longer than Notion's 100-block limit are appended in batches.

A channel listed but not configured reports exactly which settings are missing, and `anim doctor`
flags it before a scheduled run ever tries.

### 3. Deploy where the constraints allow (`schedule.py`)

PLAN.md hoped for LangGraph Server. Hosted deployment is not on the free LangSmith plan, and
YouTube blocks datacenter IPs, which this build confirmed: searches work from the cloud, but video
downloads for frames do not. The free, reliable home for this agent is a computer you own, started
by cron:

```bash
uv run anim schedule install --every week --day mon --at 07:45
```

The cron line carries your current `PATH`, because cron's own is too bare to find uv, Node,
ffmpeg or the claude CLI, and it appends output to `data/logs/scheduled.log`. `langgraph.json`
still lets `langgraph dev` serve the graph to Studio for inspection, and moving to LangGraph Server
later needs no code changes: the checkpointer and store would become Postgres.

`anim doctor` closes the loop: Python, `.env`, model access, the JavaScript runtime, ffmpeg, yt-dlp,
the data folder, the knowledge base and its index, the embedding model, tracing, each delivery
channel and the eval baseline, each with a fix. `--live` adds one tiny model call and one YouTube
search.

## What the final pass found

The readiness run used default settings, in unattended mode, as cron would:

| | |
|---|---|
| Scout | 20 new candidates from 8 queries; 9 skipped because memory had seen them |
| Triage | 3 selected, 17 skipped |
| Frames | blocked by YouTube from this cloud machine; each card fell back to metadata, with the hint |
| Cards | 3, all approved after one revision |
| Synthesis | 4 trends, one growing; one new sub-style |
| Review | paused, PENDING file written; approved later, published |
| Cost and time | 15 model calls, about $0.97, 2 minutes 37 seconds |

It also found two problems, both fixed:

- **Two videos were analysed a second time.** Memory's backfill ran only when memory was completely
  empty, so cards from before Milestone 4 were never recorded once memory held a few entries, and
  four carded videos were recorded only as "skipped". Backfill now fills gaps before every run,
  upgrades "skipped" to "analysed" when a card exists, and `--forget` leaves a marker so a forget
  still sticks.
- **Tests were sending traces to LangSmith.** This cloud environment turns tracing on with a key,
  something not noticed until the doctor reported it. Every test run had been uploading about a
  hundred fake-graph traces to the `animation-agent-development` project, roughly 1,900 that day.
  `tests/conftest.py` now switches tracing off for every test, and a check afterwards found no new
  traces from a full test run. Earlier lessons that said this environment had no key were corrected.

## Run it yourself

```bash
cd animation-agent
uv run anim doctor --live
uv run anim run --unattended            # what cron runs
uv run anim review <run id>             # approve, edit, revise or reject
uv run anim schedule show               # the cron line, without installing
uv run anim schedule install --every week --day mon --at 07:45
uv run anim schedule remove
```

## Concepts you now own

| Concept | Where | Reusable for |
|---|---|---|
| Unattended runs that pause for review | `--unattended`, `notify_review` | any scheduled agent with a human gate |
| Independent delivery channels with recorded outcomes | `delivery.py`, `deliveries` table | notifications, publishing |
| Markdown to Notion blocks, in batches | `markdown_to_blocks`, `send_notion` | any Notion integration |
| Cron that works in practice | `schedule.cron_line` | running anything locally on a schedule |
| A health check with fixes | `doctor.py` | onboarding and debugging |
| Test isolation from tracing, models and the network | `tests/conftest.py` | every LLM project |
