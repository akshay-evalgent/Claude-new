"""Shared helpers: one place where every example talks to Claude.

LangGraph handles orchestration: state, routing, loops, checkpoints and human approval.
The official Anthropic SDK makes the model calls. Keeping the two separate means
you get every new Claude feature (effort, structured outputs, refusal fallbacks)
the day it ships, without waiting for a wrapper library to catch up.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Type, TypeVar

import anthropic
from pydantic import BaseModel

# Claude Opus 5.5 is the default. Override per project, e.g. CLAUDE_MODEL=claude-sonnet-5-5
MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5-5")

T = TypeVar("T", bound=BaseModel)


class ClaudeRefused(RuntimeError):
    """Raised when Claude (and any fallback model) declines a request."""


def get_client() -> anthropic.Anthropic:
    # Reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
    has_env = any(os.environ.get(v) for v in ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_PROFILE"))
    has_profile = (Path.home() / ".config" / "anthropic").exists()
    if not (has_env or has_profile):
        raise SystemExit(
            "No Claude credentials found. Create an API key in the Claude Console "
            "(platform.claude.com) and run:  export ANTHROPIC_API_KEY=sk-ant-...\n"
            "Or try everything offline first:  pytest tests -q"
        )
    return anthropic.Anthropic()


def _fallback_kwargs(model: str) -> dict[str, Any]:
    # Server-side fallback: if a safety classifier declines, the API re-runs the
    # request on Anthropic's recommended fallback model inside the same call.
    # Haiku 5.5 has no server-side fallback, so we skip it there.
    if "haiku" in model:
        return {}
    return {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}


def _check(response: Any) -> Any:
    if response.stop_reason == "refusal":
        details = getattr(response, "stop_details", None)
        category = getattr(details, "category", None)
        raise ClaudeRefused(f"Claude declined this request (category: {category})")
    return response


def ask(
    client: anthropic.Anthropic,
    *,
    system: str,
    messages: list[dict],
    tools: list[dict] | None = None,
    effort: str = "medium",
    max_tokens: int = 16000,
    model: str | None = None,
) -> Any:
    """One Claude call. Returns the full response (content blocks, stop_reason, usage)."""
    model = model or MODEL
    kwargs: dict[str, Any] = dict(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=messages,
        output_config={"effort": effort},  # low | medium | high | xhigh | max
        **_fallback_kwargs(model),
    )
    if tools:
        kwargs["tools"] = tools
    return _check(client.beta.messages.create(**kwargs))


def ask_structured(
    client: anthropic.Anthropic,
    *,
    system: str,
    prompt: str,
    schema: Type[T],
    effort: str = "low",
    max_tokens: int = 4000,
    model: str | None = None,
) -> T:
    """Ask Claude for JSON that is guaranteed to match a Pydantic model."""
    model = model or MODEL
    response = _check(
        client.beta.messages.parse(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            output_format=schema,
            output_config={"effort": effort},
            **_fallback_kwargs(model),
        )
    )
    if response.parsed_output is None:
        raise ValueError(f"No structured output returned (stop_reason={response.stop_reason})")
    return response.parsed_output


def text_of(response: Any) -> str:
    """Join the text blocks of a response (skips thinking and tool_use blocks)."""
    return "".join(b.text for b in response.content if b.type == "text").strip()


def blocks_to_dicts(content: list[Any]) -> list[dict]:
    """Turn response blocks into plain dicts, exactly as the SDK would send them back.

    LangGraph checkpoints state (in memory, SQLite or Postgres), so state should hold
    plain JSON rather than SDK objects. This keeps thinking blocks and their
    signatures intact, which Claude needs when you send the turn back.
    """
    out = []
    for block in content:
        if isinstance(block, dict):
            out.append(block)
        else:
            out.append(
                block.model_dump(
                    mode="json",
                    by_alias=True,
                    exclude_unset=True,
                    exclude=getattr(block, "__api_exclude__", None),
                )
            )
    return out
