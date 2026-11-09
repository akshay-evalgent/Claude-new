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


@app.command()
def check():
    """Show which provider is active and whether tracing is on."""
    from .config import settings

    typer.echo(f"provider={settings.llm_provider} model={settings.llm_model} tracing={settings.langsmith_tracing}")


if __name__ == "__main__":
    app()
