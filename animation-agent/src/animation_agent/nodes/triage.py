"""Triage: decide which candidates deserve a full card. A cheap model plus arithmetic.

Lesson: split a decision into the part that needs judgement and the part that does not.
"Is this animation, and could a motion designer learn from it?" needs reading, so a small, cheap
model (Haiku by default) judges every candidate in one call. "Is it popular?" is arithmetic, so
code ranks views per day and views per follower within the batch. Priority blends the two.

The conditional edge after this node (`route_after_triage`) is where the graph branches: one
parallel card pipeline per selected candidate, or straight to the Librarian if nothing qualified.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langgraph.types import Send

from ..llm import get_model
from ..schemas import Candidate, TriageDecision, TriageJudgement, TriageVerdicts
from ..state import RunState

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
DEFAULT_MAX_CARDS = 3
# Raised from 2 to 3 after the first Triage eval (Milestone 8): at 2, most picks were labelled
# not worth a card (precision 0.22); 3 doubled precision with no loss of recall. See Lesson 8.
MIN_INTEREST = 3
# Every candidate already passed Scout's popularity filter, so craft decides most of the ranking.
INTEREST_WEIGHT, VIRAL_WEIGHT = 0.7, 0.3


def build_triage_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "triage.md").read_text()),
        ("human", "Decide for every video below. Return one decision per video_id.\n\n{videos}"),
    ])
    return (prompt | get_model("triage").with_structured_output(TriageVerdicts)).with_config(run_name="triage")


def describe(c: Candidate) -> str:
    """One compact line per video. Views are left out on purpose: popularity is scored in code."""
    parts = [f"[{c.video_id}] \"{c.title}\"", f"channel: {c.channel or 'unknown'}"]
    if c.duration_s is not None:
        parts.append(f"{c.duration_s} s")
    if c.tags:
        parts.append("tags: " + ", ".join(c.tags[:8]))
    if c.description.strip():
        parts.append("description: " + " ".join(c.description.split())[:240])
    return " | ".join(parts)


def _percentiles(values: list[float]) -> list[float]:
    """Mid-rank percentile of each value within the list, 0 to 1. Ties share a rank."""
    n = len(values)
    if n == 1:
        return [1.0]
    return [(sum(o < v for o in values) + 0.5 * (sum(o == v for o in values) - 1)) / (n - 1) for v in values]


def viral_scores(candidates: list[Candidate]) -> dict[str, float]:
    """0-5: momentum (views per day) and breakout (views per follower), ranked within this batch."""
    per_day = _percentiles([c.views_per_day or 0 for c in candidates])
    breakout = _percentiles([c.views_per_follower or 0 for c in candidates])
    return {c.video_id: round(5 * (a + b) / 2, 2) for c, a, b in zip(candidates, per_day, breakout)}


def make_triage(judge: Runnable | None = None) -> Callable[[RunState], dict]:
    def triage(state: RunState) -> dict:
        candidates = state.get("candidates", [])
        if not candidates:
            return {"triage": [], "selected": []}
        max_cards = state.get("max_cards") or DEFAULT_MAX_CARDS
        errors: list[str] = []

        try:
            verdicts = (judge or build_triage_chain()).invoke({"videos": "\n".join(describe(c) for c in candidates)})
            judged = {d.video_id: d for d in verdicts.decisions}
        except Exception as exc:  # degrade to Milestone 2's behaviour rather than stopping the run
            errors.append(f"triage: model failed ({type(exc).__name__}: {str(exc)[:200]}); ranked by popularity only")
            judged = {c.video_id: TriageJudgement(video_id=c.video_id, is_animation=True, interest=3,
                                                  reason="Triage model unavailable; not judged.") for c in candidates}

        viral = viral_scores(candidates)
        decisions = []
        for c in candidates:
            j = judged.get(c.video_id) or TriageJudgement(video_id=c.video_id, is_animation=False, interest=0,
                                                         reason="Triage returned no decision for this video.")
            decisions.append(TriageDecision(
                **j.model_dump(), title=c.title, viral_score=viral[c.video_id],
                priority=round(INTEREST_WEIGHT * j.interest + VIRAL_WEIGHT * viral[c.video_id], 2),
            ))

        eligible = sorted((d for d in decisions if d.is_animation and d.interest >= MIN_INTEREST),
                          key=lambda d: d.priority, reverse=True)[:max_cards]
        chosen = [d.video_id for d in eligible]
        for d in decisions:
            d.selected = d.video_id in chosen
        by_id = {c.video_id: c for c in candidates}
        return {"triage": decisions, "selected": [by_id[v] for v in chosen], "errors": errors}

    return triage


def route_after_triage(state: RunState) -> list[Send] | str:
    """The conditional edge. Returning a list of Send objects fans out: one card pipeline per
    selected candidate, all in the same step, so they run in parallel. Each Send carries its own
    input, so each pipeline sees only its candidate. Returning a node name is an ordinary branch."""
    selected = state.get("selected") or []
    if not selected:
        return "librarian"
    from ..config import settings

    # Frames cost a download and a vision call, so only the highest-priority picks get them.
    with_frames = state.get("frames_per_run", settings.frames_per_run)
    return [Send("analyze", {"candidate": c, "visual": i < with_frames}) for i, c in enumerate(selected)]
