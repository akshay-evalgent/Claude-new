"""Reporter: draft a digest of this run's approved cards, or redraft it from human feedback.

Same split as the Analyst: the model writes the editorial parts (`DigestDraft`: headline, intro,
one takeaway per card, open questions) and `render_digest()` builds the Markdown, taking every
title, link and number from the cards themselves. A model cannot misquote a view count it never
writes.

Cards the Critic did not approve are listed under "Held back" with the reason, never featured.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Callable

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from ..llm import get_model
from ..progress import emit
from ..schemas import DigestDraft, Review, TechniqueCard, Trend
from ..state import RunState

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
SCORE_NAMES = {
    "hook": "hook", "timing_easing": "timing and easing", "principles": "animation principles",
    "loop_quality": "loop", "sound_sync": "sound sync", "mobile_readability": "mobile readability",
    "novelty_vs_familiarity": "novelty", "emotional_driver": "emotional pull",
    "process_reveal": "process reveal", "production_signal": "reproducibility",
}


def split_cards(state: RunState) -> tuple[list[TechniqueCard], list[tuple[TechniqueCard, Review | None]]]:
    """Approved cards get featured; the rest are held back with their review."""
    reviews = {r.card_id: r for r in state.get("reviews", [])}
    featured, held = [], []
    for card in state.get("cards", []):
        review = reviews.get(card.id)
        if review is not None and review.approved:
            featured.append(card)
        else:
            held.append((card, review))
    return featured, held


def top_scores(card: TechniqueCard, n: int = 3) -> list[tuple[str, int]]:
    scores = card.why_it_works.model_dump(exclude={"evidence"})
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    return [(SCORE_NAMES.get(k, k), v) for k, v in ranked[:n] if v > 0]


def card_brief(card: TechniqueCard) -> str:
    """What the Reporter model reads about one card."""
    lines = [f"card_id: {card.id}", f"title: {card.title}", f"style: {card.style_family} / {card.sub_style}",
             f"summary: {card.summary}",
             "top scores: " + ", ".join(f"{name} {v}/5" for name, v in top_scores(card)),
             f"difficulty {card.difficulty}/5, about {card.time_to_reproduce}, confidence {card.confidence:.2f}"]
    lines += [f'evidence: {e.claim} ("{e.quote}")' for e in card.why_it_works.evidence[:4]]
    lines += [f"step: {s}" for s in card.how_it_is_made[:4]]
    lines += [f"open question: {q}" for q in card.open_questions[:3]]
    return "\n".join(lines)


def render_trends(trends: list[Trend], changes: dict[str, list[str]]) -> list[str]:
    """Trends and what changed, all from the Synthesizer's computed fields."""
    out: list[str] = []
    if trends:
        out += ["## Trends", "",
                "_Each trend is backed by at least two approved cards. Confidence is computed from how many cards "
                "and independent creators support it._", ""]
        for t in trends:
            out += [f"### {t.name}", "",
                    f"{t.status} · {t.evidence_count} cards from {t.independent_sources} creators · confidence {t.confidence:.2f}",
                    "", t.hypothesis, "", f"Try: {t.what_to_try}"]
            if t.examples:
                out.append("Examples: " + ", ".join(f"[{e['title'][:60]}]({e['url']})" for e in t.examples))
            if t.counter_card_ids:
                out.append(f"Counter-examples: {len(t.counter_card_ids)} cards")
            out.append("")
    lines = [f"- {label}: {', '.join(changes.get(key, []))}" for key, label in
             (("new", "New"), ("growing", "Growing"), ("fading", "Fading (not supported this time)"))
             if changes.get(key)]
    if lines:
        out += ["## What changed", ""] + lines + [""]
    return out


def render_digest(draft: DigestDraft, featured: list[TechniqueCard],
                  held: list[tuple[TechniqueCard, Review | None]], run_id: str, today: date | None = None,
                  trends: list[Trend] | None = None, changes: dict[str, list[str]] | None = None) -> str:
    """The Markdown that gets reviewed and published. Facts come from the cards, prose from the draft."""
    by_id = {c.id: c for c in featured}
    takeaways = {i.card_id: i.takeaway for i in draft.items if i.card_id in by_id}
    order = [i.card_id for i in draft.items if i.card_id in by_id]
    order += [c.id for c in featured if c.id not in order]           # never drop a card the model skipped

    out = [f"# {draft.headline}", "",
           f"_Run {run_id} · {(today or date.today()).isoformat()} · {len(featured)} cards approved by the Critic_",
           "", draft.intro, ""]
    for n, card_id in enumerate(order, 1):
        c = by_id[card_id]
        v = c.virality
        out += [f"## {n}. {c.title}", "",
                f"{c.style_family.replace('_', ' ')} · {c.sub_style} · difficulty {c.difficulty}/5 · about {c.time_to_reproduce}",
                ""]
        if takeaways.get(card_id):
            out += [takeaways[card_id], ""]
        scores = ", ".join(f"{name} {s}/5" for name, s in top_scores(c))
        if scores:
            out.append(f"- Strongest: {scores}")
        if c.why_it_works.evidence:
            e = c.why_it_works.evidence[0]
            out.append(f'- Evidence: {e.claim} ("{e.quote}")')
        numbers = [f"{v.views:,} views" if v.views is not None else None,
                   f"{v.views_per_day:,.0f} views/day" if v.views_per_day is not None else None,
                   f"like rate {v.like_rate:.1%}" if v.like_rate is not None else None]
        if any(numbers):
            out.append("- Numbers: " + ", ".join(x for x in numbers if x))
        out += [f"- Confidence {c.confidence:.2f} · [watch]({c.source_urls[0] if c.source_urls else ''})", ""]
    out += render_trends(trends or [], changes or {})
    if held:
        out += ["## Held back", ""]
        for c, review in held:
            why = (review.issues[0].problem if review and review.issues else
                   "not approved by the Critic" if review else "not reviewed")
            out.append(f"- {c.title}: {why}")
        out.append("")
    if draft.open_questions:
        out += ["## Open questions", ""] + [f"- {q}" for q in draft.open_questions] + [""]
    return "\n".join(out).rstrip() + "\n"


def build_reporter_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "reporter.md").read_text()),
        ("human", "CARDS THAT PASSED REVIEW THIS RUN:\n\n{cards}\n\nTRENDS ACROSS RECENT CARDS:\n{trends}{revision}"),
    ])
    return (prompt | get_model("reporter").with_structured_output(DigestDraft)).with_config(run_name="reporter")


def make_reporter(chain: Runnable | None = None) -> Callable[[RunState], dict]:
    built: list[Runnable] = []

    def reporter(state: RunState) -> dict:
        featured, held = split_cards(state)
        rnd = state.get("digest_round", 0) + 1
        revision = ""
        if state.get("digest_feedback") and state.get("digest"):
            revision = (f"\n\nYOUR PREVIOUS DRAFT:\n{state['digest']}"
                        f"\n\nEDITOR FEEDBACK (apply all of it):\n{state['digest_feedback']}")
        if chain is None and not built:
            built.append(build_reporter_chain())
        trends = state.get("trends", [])
        trend_text = "\n".join(f"- {t.name}: {t.evidence_count} cards, confidence {t.confidence:.2f}, {t.status}. "
                               f"{t.hypothesis}" for t in trends) or "(none)"
        draft = (chain or built[0]).invoke({"cards": "\n\n".join(card_brief(c) for c in featured) or "(none this run)",
                                            "trends": trend_text, "revision": revision})
        emit("reporter", f"digest round {rnd}", draft.headline)
        return {"digest": render_digest(draft, featured, held, state["run_id"], trends=trends,
                                        changes=state.get("trend_changes")),
                "digest_round": rnd, "digest_feedback": None}

    return reporter


def route_after_synthesis(state: RunState) -> str:
    """Write a digest when this run approved a card or the Synthesizer found trends."""
    featured, _ = split_cards(state)
    return "reporter" if featured or state.get("trends") else "__end__"
