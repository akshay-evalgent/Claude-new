"""`anim doctor`: check everything the agent needs, and say how to fix what is missing."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .config import ROOT, settings


@dataclass
class Check:
    name: str
    status: str            # ok | warn | fail
    detail: str
    fix: str = ""


def _tool(which: Callable, names: list[str]) -> str | None:
    return next((n for n in names if which(n)), None)


def run_checks(live: bool = False, which: Callable = shutil.which) -> list[Check]:
    from . import delivery

    checks: list[Check] = []
    add = checks.append

    v = sys.version_info
    add(Check("python", "ok" if v >= (3, 11) else "fail", f"{v.major}.{v.minor}", "Install Python 3.11 or newer."))
    add(Check(".env", "ok" if (ROOT / ".env").exists() else "warn",
              "found" if (ROOT / ".env").exists() else "missing: defaults are used",
              "cp .env.example .env, then edit it."))

    provider = settings.llm_provider
    if provider == "claude-code":
        found = which("claude")
        add(Check("model access", "ok" if found else "fail",
                  f"claude-code provider, claude CLI at {found}" if found else "claude-code provider, but no claude CLI",
                  "Install Claude Code and run `claude` once to log in, or set LLM_PROVIDER=anthropic with a key."))
    else:
        key = {"anthropic": settings.anthropic_api_key, "gemini": settings.google_api_key, "ollama": "local"}.get(provider)
        add(Check("model access", "ok" if key else "fail", f"{provider} provider" + ("" if key else ", key missing"),
                  f"Set the API key for {provider} in .env and install the extra: uv sync --extra {provider}."))
    add(Check("models", "ok", f"analysis {settings.llm_model}, triage {settings.llm_model_triage or settings.llm_model}"))

    runtime = _tool(which, [settings.ytdlp_js_runtime, "node", "deno"])
    add(Check("javascript runtime", "ok" if runtime else "fail", runtime or "neither node nor deno found",
              "Install Node.js or Deno: yt-dlp needs one to read YouTube."))
    ff = [n for n in ("ffmpeg", "ffprobe") if not which(n)]
    add(Check("ffmpeg", "ok" if not ff else "warn", "ffmpeg and ffprobe found" if not ff else f"missing: {', '.join(ff)}",
              "Install ffmpeg to give the Analyst frames (Milestone 9). Without it, cards use metadata only."))
    try:
        import yt_dlp

        add(Check("yt-dlp", "ok", yt_dlp.version.__version__,
                  "Keep it current: uv lock --upgrade-package yt-dlp && uv sync. YouTube changes often."))
    except Exception as exc:
        add(Check("yt-dlp", "fail", str(exc), "uv sync"))

    try:
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        probe = settings.data_dir / ".write-test"
        probe.write_text("ok")
        probe.unlink()
        add(Check("data folder", "ok", str(settings.data_dir)))
    except OSError as exc:
        add(Check("data folder", "fail", str(exc), "Make the data folder writable."))

    from .nodes.librarian import default_db_path
    from .storage import CardStore

    cards = len(CardStore(default_db_path()).list_cards(limit=1_000_000))
    try:
        from .kb import default_kb

        indexed = default_kb().count()
        status = "ok" if indexed == cards else "warn"
        add(Check("knowledge base", status, f"{cards} cards, {indexed} in the search index",
                  "uv run anim index --rebuild"))
    except Exception as exc:
        add(Check("knowledge base", "warn", f"{cards} cards; search index unavailable ({type(exc).__name__})",
                  "uv run anim index --rebuild"))
    model_cache = Path.home() / ".cache" / "chroma" / "onnx_models" / "all-MiniLM-L6-v2"
    add(Check("embedding model", "ok" if model_cache.exists() else "warn",
              "cached" if model_cache.exists() else "not downloaded yet (80 MB on first `anim ask` or `anim index`)",
              "uv run anim index"))

    if settings.langsmith_tracing and not settings.langsmith_api_key:
        add(Check("tracing", "warn", "LANGSMITH_TRACING is on but LANGSMITH_API_KEY is empty", "Add the key or turn tracing off."))
    else:
        add(Check("tracing", "ok", f"LangSmith tracing {'on' if settings.langsmith_tracing else 'off'}",
                  "Optional: free Developer plan at smith.langchain.com."))

    for ch in delivery.channels():
        missing = delivery.missing_config(ch)
        add(Check(f"delivery: {ch}", "ok" if not missing else "fail",
                  "ready" if not missing else f"needs {', '.join(missing)}", "Fill those in .env, or remove the channel from DELIVER_TO."))

    from .evals.datasets import BASELINE

    add(Check("eval baseline", "ok" if BASELINE.exists() else "warn",
              "evals/baseline.json present" if BASELINE.exists() else "missing", "uv run anim eval run --save-baseline"))

    if live:
        checks += live_checks()
    return checks


def live_checks() -> list[Check]:
    """One tiny real model call and one YouTube search."""
    out = []
    try:
        from langchain_core.messages import HumanMessage

        from .llm import get_model

        reply = get_model("triage").invoke([HumanMessage("Reply with the single word: ready")])
        cost = reply.response_metadata.get("cost_usd")
        out.append(Check("live: model call", "ok", f"replied {str(reply.content)[:20]!r}" + (f", ${cost:.4f}" if cost else "")))
    except Exception as exc:
        out.append(Check("live: model call", "fail", f"{type(exc).__name__}: {str(exc)[:160]}",
                         "Run `claude` once to log in, or check the API key."))
    try:
        from .tools.youtube import search_youtube

        results, _ = search_youtube("animation", max_results=1)
        out.append(Check("live: YouTube search", "ok" if results else "warn", f"{len(results)} result",
                         "Check the network, and keep yt-dlp current."))
    except Exception as exc:
        out.append(Check("live: YouTube search", "fail", f"{type(exc).__name__}: {str(exc)[:160]}",
                         "Check the network and the JavaScript runtime, and keep yt-dlp current."))
    return out
