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
    digest: bool = typer.Option(True, "--digest/--no-digest", help="Draft a digest and pause for your review."),
):
    """Run the graph: Scout, Triage, parallel Analyst+Critic pipelines, Librarian, then the digest review."""
    import uuid

    if within not in UPLOAD_WINDOWS:
        raise typer.BadParameter(f"--within must be one of: {', '.join(UPLOAD_WINDOWS)}")
    run_id = uuid.uuid4().hex[:8]
    inputs = {"run_id": run_id, "uploaded_within": within, "max_cards": cards, "stats_budget": stats_budget,
              "include_seen": include_seen}
    if query:
        inputs["queries"] = query
    _execute(inputs, run_id, parallel, with_digest=digest)


@app.command()
def resume(
    run_id: str = typer.Argument(..., help="The run id printed when the run started (see `anim runs`)."),
    parallel: int = typer.Option(4, "--parallel", "-p", min=1, max=10, help="Most card pipelines running at once."),
):
    """Continue a stopped run from its last checkpoint. Finished work is not redone."""
    from .graph import build_graph
    from .memory import open_memory

    snapshot = _snapshot(run_id)
    if not snapshot.values:
        raise typer.BadParameter(f"No run {run_id!r} in the checkpoints. List runs with: uv run anim runs")
    if not snapshot.next:
        typer.echo(f"Run {run_id} already finished.")
        raise typer.Exit()
    if snapshot.interrupts:
        typer.echo(f"Run {run_id} is waiting for your review, not stopped. Use: uv run anim review {run_id}")
        raise typer.Exit()
    typer.echo(f"Resuming run {run_id} at: {', '.join(snapshot.next)}")
    _execute(None, run_id, parallel)            # input None means "continue from the checkpoint"


@app.command()
def review(
    run_id: str = typer.Argument(..., help="A run waiting for review (see `anim runs`)."),
    approve: bool = typer.Option(False, "--approve", help="Publish the digest as it is."),
    reject: bool = typer.Option(False, "--reject", help="Publish nothing."),
    feedback: str = typer.Option(None, "--feedback", help="Ask the Reporter for a new draft that changes this."),
    edit_file: Path = typer.Option(None, "--edit-file", help="Publish this file's text instead of the draft."),
):
    """Review a paused digest: approve, edit, revise or reject. No flags: interactive."""
    snapshot = _snapshot(run_id)
    if not snapshot.interrupts:
        typer.echo(f"Run {run_id} is not waiting for review.")
        raise typer.Exit()
    chosen = [x for x in (approve, reject, feedback is not None, edit_file is not None) if x]
    if len(chosen) > 1:
        raise typer.BadParameter("Choose one of --approve, --reject, --feedback or --edit-file.")
    if not chosen:
        _review_loop(run_id, snapshot.interrupts[0].value)
        return
    if approve:
        answer = {"action": "approve"}
    elif reject:
        answer = {"action": "reject"}
    elif feedback is not None:
        answer = {"action": "revise", "feedback": feedback}
    else:
        answer = {"action": "edit", "text": edit_file.read_text()}
    _execute(_resume_with(answer), run_id, 4)


def _snapshot(run_id: str):
    from .graph import build_graph
    from .memory import open_memory

    with open_memory() as (checkpointer, store):
        return build_graph(checkpointer=checkpointer, store=store).get_state(_thread(run_id))


def _resume_with(answer: dict):
    """Command(resume=...) is how a paused run receives the human's answer."""
    from langgraph.types import Command

    return Command(resume=answer)


def _review_loop(run_id: str, payload: dict) -> None:
    """Show the paused digest and ask what to do. Non-interactive shells get instructions instead."""
    import sys

    typer.echo(f"\n{'=' * 30} digest draft, round {payload.get('round', 1)} {'=' * 30}\n")
    typer.echo(payload.get("digest", ""))
    typer.echo("=" * 80)
    if payload.get("note"):
        typer.echo(f"Note: {payload['note']}")
    later = (f"Run {run_id} is paused and saved. Review it any time with:\n"
             f"  uv run anim review {run_id}                      (interactive)\n"
             f"  uv run anim review {run_id} --approve | --reject | --feedback \"...\" | --edit-file digest.md")
    if not sys.stdin.isatty():
        typer.echo(later)
        return
    while True:
        choice = typer.prompt("[a]pprove, [e]dit, [r]evise, re[j]ect, or [l]ater", default="l").strip().lower()[:1]
        if choice == "a":
            answer = {"action": "approve"}
        elif choice == "e":
            import click                                # typer is built on click, which owns the editor helper

            text = click.edit(payload.get("digest", ""), extension=".md")
            if text is None:
                typer.echo("No changes were saved in the editor.")
                continue
            answer = {"action": "edit", "text": text}
        elif choice == "r":
            answer = {"action": "revise", "feedback": typer.prompt("What should change")}
        elif choice == "j":
            if not typer.confirm("Publish nothing for this run?"):
                continue
            answer = {"action": "reject"}
        elif choice == "l":
            typer.echo(later)
            return
        else:
            continue
        break
    _execute(_resume_with(answer), run_id, 4)


def _thread(run_id: str, parallel: int | None = None) -> dict:
    """One run is one thread. The thread id is how the checkpointer finds its saved steps."""
    config: dict = {"configurable": {"thread_id": run_id}}
    if parallel:
        config["max_concurrency"] = parallel
    return config


def _execute(inputs, run_id: str, parallel: int, with_digest: bool = True) -> None:
    """Start, continue or answer a run. `inputs` is a dict (new run), None (resume) or a Command."""
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
            from .kb import default_kb

            graph = build_graph(checkpointer=checkpointer, store=store, with_digest=with_digest, kb=default_kb)
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
            pending = graph.get_state(_thread(run_id)).interrupts   # paused for a human?
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
    if pending:
        _review_loop(run_id, pending[0].value)
    elif inputs is not None and not isinstance(inputs, dict):
        pass                                                # an answered review: publish already reported
    else:
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
    elif node == "synthesizer":
        ch = out.get("trend_changes") or {}
        bits = [f"{k}: {', '.join(v)}" for k, v in ch.items() if v and k != "dropped"]
        typer.echo(f"[synthesizer] {len(out.get('trends', []))} trends" + (f" ({'; '.join(bits)})" if bits else "")
                   + (f"; new styles: {', '.join(out['new_styles'])}" if out.get("new_styles") else ""))
    elif node == "reporter":
        typer.echo(f"[reporter] digest draft {out['digest_round']} ready for review")
    elif node == "publish":
        typer.echo(f"[publish] digest published to {out['digest_path']}" if out.get("digest_path")
                   else "[publish] digest rejected; nothing published")


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
        status = ("finished" if not snap.next else "waiting for review" if snap.interrupts
                  else f"stopped before {', '.join(snap.next)}")
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


@app.command()
def ask(
    question: str = typer.Argument(..., help="A question about the techniques in your knowledge base."),
    k: int = typer.Option(6, "--k", min=1, max=20, help="How many cards to retrieve."),
    plan: bool = typer.Option(True, "--plan/--no-plan", help="Let a cheap model turn the question into filters."),
):
    """Ask the knowledge base. Answers cite the cards they come from."""
    from .kb import default_kb
    from .nodes.librarian import default_db_path
    from .qa_graph import build_qa_graph, index_all
    from .storage import CardStore

    kb, cards_db = default_kb(), CardStore(default_db_path())
    if kb.count() == 0 and cards_db.list_cards(limit=1):
        typer.echo(f"Search index was empty: indexed {index_all(kb, cards_db)} cards from anim.db.")
    result = build_qa_graph(kb, cards_db, use_planner=plan).invoke({"question": question, "k": k})
    p = result["plan"]
    filters = [f"style in {p.style_families}" if p.style_families else "",
               f"difficulty <= {p.max_difficulty}" if p.max_difficulty else "",
               f"difficulty >= {p.min_difficulty}" if p.min_difficulty else "",
               f"tools {p.tools}" if p.tools else "", "" if p.include_unapproved else "approved only"]
    typer.echo(f"search: \"{p.search_text}\"; filters: {', '.join(f for f in filters if f) or 'none'}"
               + (f"; relaxed: {', '.join(result['relaxed'])}" if result.get("relaxed") else ""))
    if not result.get("hits"):
        typer.echo("\nNo cards in the knowledge base match this question yet.")
        return
    typer.echo(f"\n{result['answer']}\n")
    if result.get("citations"):
        typer.echo("Sources:")
        for c in result["citations"]:
            flag = "" if c["approved"] else ", not approved"
            typer.echo(f"  [{c['n']}] {c['title'][:70]} (confidence {c['confidence']:.2f}{flag})\n      {c['url']}")
    for w in result.get("warnings", []):
        typer.echo(f"! {w}", err=True)


@app.command()
def index(rebuild: bool = typer.Option(False, "--rebuild", help="Clear the search index first.")):
    """Copy every card from anim.db into the search index."""
    from .kb import default_kb
    from .nodes.librarian import default_db_path
    from .qa_graph import index_all
    from .storage import CardStore

    kb = default_kb()
    n = index_all(kb, CardStore(default_db_path()), rebuild=rebuild)
    typer.echo(f"Indexed {n} cards; the index now holds {kb.count()}.")


@app.command()
def trends(
    refresh: bool = typer.Option(False, "--refresh", help="Recompute trends now from recent approved cards (one model call)."),
    days: int = typer.Option(30, "--days", min=1, max=365, help="Window of cards to synthesize from."),
):
    """Show the current trends, each backed by at least two approved cards."""
    from datetime import date, timedelta

    from .memory import open_memory
    from .nodes.librarian import default_db_path
    from .nodes.synthesizer import build_synthesizer_chain, synthesize
    from .storage import CardStore

    cards_db = CardStore(default_db_path())
    if refresh:
        with open_memory() as (_, store):
            out = synthesize(cards_db, build_synthesizer_chain(), store, window_days=days)
        ch = out["trend_changes"]
        for key in ("new", "growing", "fading", "dropped"):
            if ch.get(key):
                typer.echo(f"{key}: {', '.join(ch[key])}")
        if out["new_styles"]:
            typer.echo(f"new styles in the taxonomy: {', '.join(out['new_styles'])}")
    found = cards_db.list_trends(since=(date.today() - timedelta(days=days)).isoformat())
    if not found:
        typer.echo("No trends yet. They need at least two approved cards: try `anim trends --refresh`.")
    for t in found:
        typer.echo(f"\n{t.name}  [{t.status}, {t.evidence_count} cards from {t.independent_sources} creators, "
                   f"confidence {t.confidence:.2f}, since {t.first_seen}]\n  {t.hypothesis}\n  Try: {t.what_to_try}")
        for e in t.examples:
            typer.echo(f"  - {e['title'][:70]}  {e['url']}")


@app.command()
def taxonomy():
    """Sub-styles the Synthesizer has added to the taxonomy, with their supporting cards."""
    from .memory import open_memory
    from .nodes.synthesizer import TAXONOMY

    with open_memory() as (_, store):
        items = store.search(TAXONOMY, limit=500)
    if not items:
        typer.echo("The taxonomy has no discovered sub-styles yet.")
    for item in sorted(items, key=lambda i: i.value.get("first_seen", "")):
        v = item.value
        typer.echo(f"{v['name']}  ({v['family']}, {len(v.get('card_ids', []))} cards, since {v.get('first_seen')})\n  {v['description']}")


@app.command()
def digests(limit: int = typer.Option(10, "--limit", "-n", help="How many to list.")):
    """List digest decisions: published, edited or rejected."""
    from .nodes.librarian import default_db_path
    from .storage import CardStore

    rows = CardStore(default_db_path()).list_digests(limit)
    if not rows:
        typer.echo("No digests yet.")
    for r in rows:
        typer.echo(f"{r['run_id']}  {r['decided_at'][:19]}  {r['status']:<9} drafts {r['rounds']}  {r['path'] or '-'}")


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
