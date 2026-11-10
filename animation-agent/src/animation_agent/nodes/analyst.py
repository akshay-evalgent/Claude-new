"""Analyst: turn the top candidates into Technique Cards. The only node that calls a model.

It reuses Milestone 0's chain (analyst prompt -> model -> validated TechniqueCard). What is new
is the source material: real metadata and the most-liked viewer comments instead of a pasted
description. After the model answers, `finalize()` overwrites every *fact* on the card (id,
URL, title, metrics, dates) with the values the tools measured. The model judges; code copies facts.

Cards are analysed one after another here. Each takes the better part of a minute, which is
the motivation for Milestone 3's parallel fan-out.
"""
from __future__ import annotations

from typing import Callable

from langchain_core.runnables import Runnable

from ..m0_card_from_text import build_chain, enrich
from ..schemas import Candidate, Comment, TechniqueCard, Virality
from ..state import RunState
from ..tools.youtube import fetch_top_comments

DEFAULT_MAX_CARDS = 3
COMMENTS_PER_VIDEO = 15


def source_material(c: Candidate, comments: list[Comment]) -> str:
    """Everything the Analyst may cite, as plain text. If it is not in here, it is a guess."""
    def n(value: int | None) -> str:
        return "unknown" if value is None else f"{value:,}"

    lines = [f'Video: "{c.title}"', f"URL: {c.url}"]
    if c.duration_s is not None:
        lines.append(f"Length: {c.duration_s} seconds")
    lines.append(f"Posted on {c.posted_on or 'an unknown date'} on YouTube by {c.channel or 'unknown'} "
                 f"({n(c.channel_followers)} followers).")
    lines.append(f"Metrics: {n(c.views)} views, {n(c.likes)} likes, {n(c.comments)} comments.")
    computed = {"views per day": c.views_per_day, "like rate": c.like_rate, "views per follower": c.views_per_follower}
    lines.append("Computed: " + ", ".join(f"{k} {v}" for k, v in computed.items() if v is not None))
    if c.tags:
        lines.append("Tags: " + ", ".join(c.tags))
    if c.description.strip():
        lines.append(f'Description by creator:\n"""\n{c.description.strip()}\n"""')
    if comments:
        lines.append("Top viewer comments, most liked first:")
        lines += [f'- "{cm.text}" ({cm.likes:,} likes{", by the creator" if cm.by_creator else ""})' for cm in comments]
    else:
        lines.append("No viewer comments were available.")
    lines.append("Not available: video frames, audio and transcript. Judge visuals only from the text above.")
    return "\n".join(lines)


def finalize(card: TechniqueCard, c: Candidate) -> TechniqueCard:
    """Replace every fact on the card with what the tools measured."""
    card.id = f"{c.platform}:{c.video_id}"
    card.title = c.title
    card.source_urls = [c.url]
    card.virality = Virality(
        views=c.views, likes=c.likes, comments=c.comments, posted_on=c.posted_on,
        creator_followers=c.channel_followers, spread=card.virality.spread,
    )
    for evidence in card.why_it_works.evidence:
        evidence.source_url = evidence.source_url or c.url   # all source material came from this page
    return enrich(card)                                       # computes views_per_day, like_rate, dates


def make_analyst(
    chain: Runnable | None = None,
    comments: Callable[[str, int], list[Comment]] = fetch_top_comments,
) -> Callable[[RunState], dict]:
    def analyst(state: RunState) -> dict:
        picks = state.get("candidates", [])[: state.get("max_cards") or DEFAULT_MAX_CARDS]
        card_chain = chain or build_chain().with_config(run_name="analyst")
        cards: list[TechniqueCard] = []
        errors: list[str] = []
        for c in picks:
            try:
                top_comments = comments(c.video_id, COMMENTS_PER_VIDEO)
            except Exception as exc:                          # comments are nice to have, not required
                top_comments = []
                errors.append(f"analyst: comments for {c.video_id} unavailable: {type(exc).__name__}: {exc}")
            try:
                card = card_chain.invoke({"description": source_material(c, top_comments)})
            except Exception as exc:                          # one bad card must not sink the run
                errors.append(f"analyst: card for {c.video_id} failed: {type(exc).__name__}: {str(exc)[:300]}")
                continue
            cards.append(finalize(card, c))
        return {"cards": cards, "errors": errors}

    return analyst
