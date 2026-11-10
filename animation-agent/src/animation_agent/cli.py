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
):
    """Run the graph: Scout, Triage, parallel Analyst+Critic pipelines, Librarian."""
    from .graph import graph
    from .nodes.librarian import default_db_path

    if within not in UPLOAD_WINDOWS:
        raise typer.BadParameter(f"--within must be one of: {', '.join(UPLOAD_WINDOWS)}")
    inputs = {"uploaded_within": within, "max_cards": cards, "stats_budget": stats_budget}
    if query:
        inputs["queries"] = query

    # Two stream modes at once. "updates" yields each main-graph node's partial update as it
    # finishes. "custom" yields progress events the Analyst and Critic emit with get_stream_writer(),
    # and subgraphs=True lets those through from inside each parallel card pipeline.
    # max_concurrency caps how many Send branches run at once.
    errors: list[str] = []
    stream = graph.stream(inputs, stream_mode=["updates", "custom"], subgraphs=True,
                          config={"max_concurrency": parallel})
    for namespace, mode, data in stream:
        if mode == "custom":
            typer.echo(f"  [{data['node']}] {data['video'][:45]}: {data['text'][:110]}")
            continue
        if namespace:                                       # inner updates: progress came via "custom"
            continue
        for node, out in data.items():
            if not isinstance(out, dict):
                continue
            errors += out.get("errors", [])
            if node == "scout":
                typer.echo(f"[scout] run {out['run_id']}: {len(out['candidates'])} candidates from "
                           f"{len(out['queries'])} queries (uploaded within {out['uploaded_within']})")
            elif node == "triage":
                picked = [d for d in out["triage"] if d.selected]
                skipped = len(out["triage"]) - len(picked)
                typer.echo(f"[triage] {len(picked)} selected, {skipped} skipped:")
                for d in sorted(picked, key=lambda d: d.priority, reverse=True):
                    typer.echo(f"  priority {d.priority:.1f} (interest {d.interest}, viral {d.viral_score:.1f})  "
                               f"{d.title[:55]}\n      {d.reason[:110]}")
            elif node == "analyze":
                for card, review in zip(out.get("cards", []), out.get("reviews", [])):
                    verdict = "approved" if review.approved else "NOT approved"
                    typer.echo(f"[card] {card.title[:50]}: {verdict} after {review.rounds} drafts, "
                               f"confidence {card.confidence:.2f}")
            elif node == "librarian":
                typer.echo(f"[librarian] saved {len(out['saved'])} cards to {default_db_path()}")
    for err in errors:
        typer.echo(f"! {err}", err=True)
    typer.echo("See them with: uv run anim cards")


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
