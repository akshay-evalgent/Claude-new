"""`anim` command line. Grows one command per milestone."""
from __future__ import annotations

from pathlib import Path

import typer

app = typer.Typer(no_args_is_help=True, help="Animation Intelligence Agent")


@app.command()
def card(description_file: Path | None = typer.Argument(None, help="Text file describing one animation. Omit for the built-in sample.")):
    """Milestone 0: produce one Technique Card from a text description."""
    from .m0_card_from_text import SAMPLE, build_chain, enrich

    text = description_file.read_text() if description_file else SAMPLE
    print(enrich(build_chain().invoke({"description": text})).model_dump_json(indent=2))


UPLOAD_WINDOWS = ["any", "hour", "today", "week", "month", "year"]


@app.command()
def youtube(
    query: str = typer.Argument(..., help="Search terms, e.g. 'claymation loop'."),
    within: str = typer.Option("any", "--within", "-w", help=f"Upload window: {', '.join(UPLOAD_WINDOWS)}."),
    sort: str = typer.Option("relevance", "--sort", help="relevance, views or date."),
    limit: int = typer.Option(10, "--limit", "-n", min=1, max=20, help="Number of results."),
    stats: bool = typer.Option(False, "--stats", "-s", help="Also fetch full stats per video (a few seconds each)."),
):
    """Milestone 1: call the YouTube tool directly, no model involved. Test tools before agents."""
    from .tools.youtube import fetch_videos, search_youtube

    if within not in UPLOAD_WINDOWS:
        raise typer.BadParameter(f"--within must be one of: {', '.join(UPLOAD_WINDOWS)}")
    if sort not in ("relevance", "views", "date"):
        raise typer.BadParameter("--sort must be one of: relevance, views, date")
    results, note = search_youtube(query, max_results=limit, uploaded_within=within, sort_by=sort)  # type: ignore[arg-type]
    if note:
        typer.echo(f"note: {note}", err=True)
    if stats and results:
        found, errors = fetch_videos([c.video_id for c in results])
        results = found
        for vid, err in errors.items():
            typer.echo(f"! {vid}: {err}", err=True)

    def num(v: float | int | None, fmt: str = "{:,}") -> str:
        return "-" if v is None else fmt.format(v)

    for c in results:
        line = f"{num(c.views):>12} views  {c.title[:70]}  [{c.channel or '?'}]"
        if stats:
            line += (f"\n{'':>14}posted {c.posted_on or '?'}  views/day {num(c.views_per_day, '{:,.0f}')}  "
                     f"views/follower {num(c.views_per_follower, '{:.2f}')}  like rate {num(c.like_rate, '{:.2%}')}")
        typer.echo(f"{line}\n{'':>14}{c.url}")
    if not results:
        typer.echo("No results.")


@app.command()
def research(
    question: str = typer.Argument(None, help="What to research. Omit for the default trend question."),
    max_steps: int = typer.Option(6, "--max-steps", min=1, max=15, help="Maximum tool turns before the agent must answer."),
    quiet: bool = typer.Option(False, "--quiet", "-q", help="Print only the final answer."),
):
    """Milestone 1: a hand-written ReAct agent that answers with live YouTube data."""
    from .m1_research_agent import DEFAULT_QUESTION, Step, run_research

    def show(step: Step) -> None:
        if quiet:
            return
        typer.echo(f"\n[step {step.number}] {step.thought}", err=True)
        for call, result in zip(step.calls, step.results):
            args = ", ".join(f"{k}={v!r}" for k, v in call["args"].items())
            typer.echo(f"  -> {call['name']}({args})", err=True)
            typer.echo(f"     {_preview(result)}", err=True)

    result = run_research(question or DEFAULT_QUESTION, max_steps=max_steps, on_step=show)
    if not quiet:
        typer.echo(f"\n[{result.stop_reason}] {len(result.steps)} tool turns, {result.tool_calls} tool calls\n", err=True)
    typer.echo(result.answer)


def _preview(tool_output: str) -> str:
    """One line per tool result so the loop is readable in a terminal."""
    import json

    try:
        data = json.loads(tool_output)
    except ValueError:
        return tool_output[:160]
    if "results" in data:
        titles = "; ".join(r.get("title", "")[:40] for r in data["results"][:3])
        fallback = " (fallback: relevance re-sorted)" if data.get("note") else ""
        return f"{len(data['results'])} results{fallback}: {titles}{' ...' if len(data['results']) > 3 else ''}"
    if "videos" in data:
        bits = [f"{v.get('title', '')[:30]} ({v.get('views_per_day', '-')}/day)" for v in data["videos"][:3]]
        extra = f", {len(data['errors'])} failed" if data.get("errors") else ""
        return f"{len(data['videos'])} videos{extra}: {'; '.join(bits)}"
    return tool_output[:160]


@app.command()
def run(
    query: list[str] = typer.Option(None, "--query", "-q", help="Search query; repeat for several. Default: sources.yaml."),
    within: str = typer.Option("month", "--within", "-w", help=f"Upload window: {', '.join(UPLOAD_WINDOWS)}."),
    cards: int = typer.Option(3, "--cards", "-c", min=1, max=10, help="Most candidates Triage may send for analysis."),
    stats_budget: int = typer.Option(20, "--stats-budget", min=1, max=40, help="How many search hits get full stats."),
    parallel: int = typer.Option(4, "--parallel", "-p", min=1, max=10, help="Most card pipelines running at once."),
    include_seen: bool = typer.Option(False, "--include-seen", help="Ignore memory: reconsider videos seen before."),
):
    """Run the graph: Scout, Triage, parallel Analyst+Critic pipelines, Librarian."""
    import uuid

    if within not in UPLOAD_WINDOWS:
        raise typer.BadParameter(f"--within must be one of: {', '.join(UPLOAD_WINDOWS)}")
    run_id = uuid.uuid4().hex[:8]
    inputs = {"run_id": run_id, "uploaded_within": within, "max_cards": cards, "stats_budget": stats_budget,
              "include_seen": include_seen}
    if query:
        inputs["queries"] = query
    _execute(inputs, run_id, parallel)


@app.command()
def resume(
    run_id: str = typer.Argument(..., help="The run id printed when the run started (see `anim runs`)."),
    parallel: int = typer.Option(4, "--parallel", "-p", min=1, max=10, help="Most card pipelines running at once."),
):
    """Continue a stopped run from its last checkpoint. Finished work is not redone."""
    from .graph import build_graph
    from .memory import open_memory

    with open_memory() as (checkpointer, store):
        snapshot = build_graph(checkpointer=checkpointer, store=store).get_state(_thread(run_id))
    if not snapshot.values:
        raise typer.BadParameter(f"No run {run_id!r} in the checkpoints. List runs with: uv run anim runs")
    if not snapshot.next:
        typer.echo(f"Run {run_id} already finished.")
        raise typer.Exit()
    typer.echo(f"Resuming run {run_id} at: {', '.join(snapshot.next)}")
    _execute(None, run_id, parallel)            # input None means "continue from the checkpoint"


def _thread(run_id: str, parallel: int | None = None) -> dict:
    """One run is one thread. The thread id is how the checkpointer finds its saved steps."""
    config: dict = {"configurable": {"thread_id": run_id}}
    if parallel:
        config["max_concurrency"] = parallel
    return config


def _execute(inputs: dict | None, run_id: str, parallel: int) -> None:
    from .graph import build_graph
    from .memory import open_memory
    from .nodes.librarian import default_db_path

    typer.echo(f"run {run_id} (if it stops, continue with: uv run anim resume {run_id})")
    # Two stream modes at once. "updates" yields each main-graph node's partial update as it
    # finishes. "custom" yields progress events the Analyst and Critic emit with get_stream_writer(),
    # and subgraphs=True lets those through from inside each parallel card pipeline.
    errors: list[str] = []
    try:
        with open_memory() as (checkpointer, store):
            if inputs is not None:                      # a new run, not a resume
                from .memory import backfill_from_cards
                from .storage import CardStore

                learned = backfill_from_cards(store, CardStore(default_db_path()).list_cards(limit=100_000))
                if learned:
                    typer.echo(f"memory was empty: learned {learned} cards already in the knowledge base")
            graph = build_graph(checkpointer=checkpointer, store=store)
            stream = graph.stream(inputs, _thread(run_id, parallel), stream_mode=["updates", "custom"], subgraphs=True)
            for namespace, mode, data in stream:
                if mode == "custom":
                    typer.echo(f"  [{data['node']}] {data['video'][:45]}: {data['text'][:110]}")
                    continue
                if namespace:                               # inner updates: progress came via "custom"
                    continue
                for node, out in data.items():
                    if isinstance(out, dict):
                        errors += out.get("errors", [])
                        _show_update(node, out, default_db_path())
    except KeyboardInterrupt:
        import os
        import sys

        typer.echo(f"\nStopped. Finished steps are saved. Continue with: uv run anim resume {run_id}", err=True)
        sys.stdout.flush()
        sys.stderr.flush()
        # Exit now, like a killed process. Model calls already in flight would otherwise finish in
        # background threads and print tracebacks when they try to schedule their next step. The
        # checkpoints are built to survive a kill: whatever was mid-flight simply reruns on resume.
        os._exit(130)
    for err in errors:
        typer.echo(f"! {err}", err=True)
    typer.echo("See them with: uv run anim cards")


def _show_update(node: str, out: dict, db_path) -> None:
    if node == "scout":
        seen = len(out.get("already_seen", []))
        typer.echo(f"[scout] {len(out['candidates'])} new candidates from {len(out['queries'])} queries "
                   f"(uploaded within {out['uploaded_within']}); {seen} skipped because memory has seen them")
    elif node == "triage":
        picked = [d for d in out["triage"] if d.selected]
        typer.echo(f"[triage] {len(picked)} selected, {len(out['triage']) - len(picked)} skipped:")
        for d in sorted(picked, key=lambda d: d.priority, reverse=True):
            typer.echo(f"  priority {d.priority:.1f} (interest {d.interest}, viral {d.viral_score:.1f})  "
                       f"{d.title[:55]}\n      {d.reason[:110]}")
    elif node == "analyze":
        for card, review in zip(out.get("cards", []), out.get("reviews", [])):
            verdict = "approved" if review.approved else "NOT approved"
            typer.echo(f"[card] {card.title[:50]}: {verdict} after {review.rounds} drafts, "
                       f"confidence {card.confidence:.2f}")
    elif node == "librarian":
        typer.echo(f"[librarian] saved {len(out['saved'])} cards to {db_path}; memory updated")


@app.command()
def runs(limit: int = typer.Option(10, "--limit", "-n", help="How many runs to list.")):
    """List runs from the checkpoints, finished or not. Unfinished ones can be resumed."""
    from .graph import build_graph
    from .memory import open_memory

    with open_memory() as (checkpointer, store):
        graph = build_graph(checkpointer=checkpointer, store=store)
        thread_ids = list(dict.fromkeys(
            c.config["configurable"]["thread_id"] for c in checkpointer.list(None)
            if not c.config["configurable"].get("checkpoint_ns")))
        rows = []
        for tid in thread_ids:
            snap = graph.get_state(_thread(tid))
            rows.append((snap.values.get("started_at") or "", tid, snap))
    if not rows:
        typer.echo("No runs yet. Start one with: uv run anim run")
    for started, tid, snap in sorted(rows, key=lambda r: r[0], reverse=True)[:limit]:
        status = "finished" if not snap.next else f"stopped before {', '.join(snap.next)}"
        typer.echo(f"{tid}  {started[:19]:<19}  {len(snap.values.get('candidates', [])):>3} candidates  "
                   f"{len(snap.values.get('cards', [])):>2} cards  {status}")


@app.command()
def history(run_id: str = typer.Argument(..., help="Run id from `anim runs`.")):
    """Show every checkpoint of one run: the state saved after each step."""
    from .graph import build_graph
    from .memory import open_memory

    with open_memory() as (checkpointer, store):
        snaps = list(build_graph(checkpointer=checkpointer, store=store).get_state_history(_thread(run_id)))
    if not snaps:
        raise typer.BadParameter(f"No run {run_id!r} in the checkpoints.")
    for snap in reversed(snaps):
        v = snap.values
        typer.echo(f"step {snap.metadata.get('step'):>2}  next: {', '.join(snap.next) or '(done)':<28} "
                   f"candidates {len(v.get('candidates', [])):>2}  selected {len(v.get('selected', [])):>2}  "
                   f"cards {len(v.get('cards', [])):>2}  errors {len(v.get('errors', [])):>2}")


@app.command()
def memory(
    limit: int = typer.Option(20, "--limit", "-n", help="How many memories to list."),
    forget: str = typer.Option(None, "--forget", help="Forget one video, e.g. youtube:abc123, so it can be picked again."),
):
    """Show what long-term memory holds: videos analysed or recently skipped."""
    from .memory import VIDEOS, open_memory, recent_memories

    with open_memory() as (_, store):
        if forget:
            store.delete(VIDEOS, forget)
            typer.echo(f"Forgot {forget}.")
            return
        items = recent_memories(store, limit)
        total = len(store.search(VIDEOS, limit=100_000))
    typer.echo(f"{total} videos in memory")
    for item in items:
        v = item.value
        detail = f"approved={v.get('approved')}" if v["status"] == "analysed" else f"interest {v.get('interest')}"
        typer.echo(f"{item.key:<22} {v['status']:<9} {v.get('on', ''):<10} {detail:<15} {v.get('title', '')[:55]}")


@app.command("cards")
def list_cards(limit: int = typer.Option(20, "--limit", "-n", help="How many cards to list.")):
    """List saved Technique Cards, newest first."""
    from .nodes.librarian import default_db_path
    from .storage import CardStore

    rows = CardStore(default_db_path()).list_cards(limit)
    if not rows:
        typer.echo("No cards yet. Run: uv run anim run")
    for r in rows:
        vpd = f"{r['views_per_day']:,.0f}/day" if r["views_per_day"] is not None else "-"
        review = {1: "approved", 0: "flagged"}.get(r["approved"], "unreviewed")
        typer.echo(f"{r['id']:<22} {r['style_family']:<22} conf {r['confidence']:.2f} {review:<10} {vpd:>12}  "
                   f"{r['title'][:55]}")


@app.command()
def show(card_id: str = typer.Argument(..., help="Card id from `anim cards`, e.g. youtube:abc123.")):
    """Print one saved Technique Card as JSON."""
    from .nodes.librarian import default_db_path
    from .storage import CardStore

    store = CardStore(default_db_path())
    card = store.get_card(card_id)
    if card is None:
        raise typer.BadParameter(f"No card with id {card_id!r}. List ids with: uv run anim cards")
    typer.echo(card.model_dump_json(indent=2))
    review = store.get_review(card_id)
    if review:
        import json

        typer.echo(f"\nCritic: {'approved' if review['approved'] else 'not approved'} after {review['rounds']} drafts", err=True)
        for line in json.loads(review["history"]):
            typer.echo(f"  {line}", err=True)


@app.command()
def check():
    """Show which provider is active and whether tracing is on."""
    from .config import settings

    typer.echo(f"provider={settings.llm_provider} model={settings.llm_model} tracing={settings.langsmith_tracing}")


if __name__ == "__main__":
    app()
