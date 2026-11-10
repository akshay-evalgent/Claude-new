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
def check():
    """Show which provider is active and whether tracing is on."""
    from .config import settings

    typer.echo(f"provider={settings.llm_provider} model={settings.llm_model} tracing={settings.langsmith_tracing}")


if __name__ == "__main__":
    app()
