"""Synthesizer: read across recent cards, find trends with evidence counts, grow the taxonomy.

Lesson, multi-document reasoning with evidence counts: one model call reads compact summaries
of every approved card from the last 30 days and proposes trends, each with the ids of the cards
that support it. Then code takes over everything that can be counted:

- unknown card ids are discarded, and a trend needs at least two supporting cards;
- evidence is counted: supporting cards, and distinct creators among them, because five videos
  from one channel are one source, not five;
- confidence is computed from those counts and the cards' own confidence, never asked of the model;
- each trend is compared with the previous run's: new, growing or continuing, and earlier trends
  that lost support are reported as fading.

Sub-styles that the model sees in at least two cards are added to a taxonomy kept in the
long-term store, so the vocabulary grows with the research.
"""
# No `from __future__ import annotations`: LangGraph injects `store` by reading the parameter type.
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Callable

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langgraph.config import get_stream_writer
from langgraph.store.base import BaseStore

from ..llm import get_model
from ..schemas import StyleProposal, SynthesisDraft, TechniqueCard, Trend
from ..state import RunState
from ..storage import CardStore
from .librarian import default_db_path

PROMPTS = Path(__file__).resolve().parents[1] / "prompts"
WINDOW_DAYS = 30
MAX_CARDS = 40
MIN_SUPPORT = 2
TAXONOMY = ("taxonomy",)


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:80]


def window_cards(cards_db: CardStore, today: date, window_days: int = WINDOW_DAYS) -> list[TechniqueCard]:
    """Approved cards updated within the window, newest first."""
    since = (today - timedelta(days=window_days)).isoformat()
    cards = []
    for row in cards_db.list_cards(limit=1_000_000):
        if row["approved"] == 1 and (row["last_updated"] or "") >= since:
            card = cards_db.get_card(row["id"])
            if card is not None:
                cards.append(card)
    return cards[:MAX_CARDS]


def card_line(card: TechniqueCard) -> str:
    v = card.virality
    return (f"{card.id} | posted {v.posted_on or '?'} | {card.style_family} / {card.sub_style[:90]} | "
            f"creator {v.creator or 'unknown'} | confidence {card.confidence:.2f} | tags: {', '.join(card.tags[:6])} | "
            f"{' '.join(card.summary.split())[:220]}")


def trend_confidence(support: list[TechniqueCard], counter: int) -> float:
    """More independent creators and more trustworthy cards raise it; counter-examples lower it."""
    creators = len({c.virality.creator or c.id for c in support})
    mean_conf = sum(c.confidence for c in support) / len(support)
    value = 0.15 * min(creators, 5) + 0.5 * mean_conf - 0.1 * counter
    return round(max(0.05, min(0.85, value)), 2)


def resolve_ids(raw_ids: list[str], cards: dict[str, TechniqueCard]) -> tuple[list[str], list[str]]:
    """Map the model's ids to real card ids. Tolerates brackets, quotes and a missing 'youtube:'
    prefix; anything else is unknown. Returns (known ids in order, unknown ids)."""
    known, unknown = [], []
    for raw in raw_ids:
        cid = raw.strip().strip("[]()'\"` ")
        if cid not in cards and f"youtube:{cid}" in cards:
            cid = f"youtube:{cid}"
        if cid in cards:
            if cid not in known:
                known.append(cid)
        else:
            unknown.append(raw)
    return known, unknown


def build_trends(draft: SynthesisDraft, cards: dict[str, TechniqueCard], previous: dict[str, Trend],
                 today: date) -> tuple[list[Trend], dict[str, list[str]]]:
    trends: list[Trend] = []
    dropped: list[str] = []
    for d in draft.trends:
        support_ids, unknown = resolve_ids(d.card_ids, cards)
        if len(support_ids) < MIN_SUPPORT:
            dropped.append(f"{d.name} ({len(support_ids)} known cards" + (f"; unknown ids {unknown}" if unknown else "") + ")")
            continue
        counter_ids = [cid for cid in resolve_ids(d.counter_card_ids, cards)[0] if cid not in support_ids]
        support = [cards[cid] for cid in support_ids]
        tid, prev = slug(d.name), previous.get(slug(d.name))
        status = "new" if prev is None else "growing" if len(support_ids) > prev.evidence_count else "continuing"
        trends.append(Trend(
            id=tid, name=d.name, hypothesis=d.hypothesis, what_to_try=d.what_to_try,
            card_ids=support_ids, counter_card_ids=counter_ids, evidence_count=len(support_ids),
            independent_sources=len({c.virality.creator or c.id for c in support}),
            confidence=trend_confidence(support, len(counter_ids)), status=status,
            first_seen=prev.first_seen if prev else today, last_seen=today,
            examples=[{"title": c.title, "url": (c.source_urls or [""])[0]} for c in support[:3]],
        ))
    current = {t.id for t in trends}
    changes = {
        "new": [t.name for t in trends if t.status == "new"],
        "growing": [t.name for t in trends if t.status == "growing"],
        "fading": [p.name for tid, p in previous.items() if tid not in current],
        "dropped": dropped,
    }
    return sorted(trends, key=lambda t: t.confidence, reverse=True), changes


def remember_styles(store: BaseStore, proposals: list[StyleProposal], cards: dict[str, TechniqueCard],
                    today: date) -> list[str]:
    """Add sub-styles backed by at least two known cards. Returns the names that were new."""
    added = []
    for p in proposals:
        ids = resolve_ids(p.card_ids, cards)[0]
        if len(ids) < MIN_SUPPORT:
            continue
        key, existing = slug(p.name), store.get(TAXONOMY, slug(p.name))
        if existing is None:
            added.append(p.name)
            store.put(TAXONOMY, key, {"name": p.name, "family": p.family, "description": p.description,
                                      "card_ids": ids, "first_seen": today.isoformat(), "last_seen": today.isoformat()})
        else:
            value = dict(existing.value)
            value["card_ids"] = list(dict.fromkeys(value.get("card_ids", []) + ids))
            value["last_seen"] = today.isoformat()
            store.put(TAXONOMY, key, value)
    return added


def build_synthesizer_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "synthesizer.md").read_text()),
        ("human", "APPROVED CARDS, LAST {days} DAYS:\n{cards}\n\nPREVIOUS TRENDS:\n{previous}\n\nTAXONOMY:\n{taxonomy}"),
    ])
    return (prompt | get_model("synthesizer").with_structured_output(SynthesisDraft)).with_config(run_name="synthesizer")


def synthesize(cards_db: CardStore, chain: Runnable, store: BaseStore | None = None, run_id: str = "manual",
               today: date | None = None, window_days: int = WINDOW_DAYS) -> dict:
    """The whole step as a plain function, so `anim trends --refresh` can run it without a graph."""
    today = today or date.today()
    cards = window_cards(cards_db, today, window_days)
    empty = {"trends": [], "trend_changes": {"new": [], "growing": [], "fading": [], "dropped": []}, "new_styles": []}
    if len(cards) < MIN_SUPPORT:
        return empty
    previous = {t.id: t for t in cards_db.list_trends(since=(today - timedelta(days=2 * window_days)).isoformat())}
    taxonomy = [i.value["name"] for i in store.search(TAXONOMY, limit=500)] if store is not None else []
    draft: SynthesisDraft = chain.invoke({
        "days": window_days, "cards": "\n".join(card_line(c) for c in cards),
        "previous": "\n".join(f"- {t.name} ({t.evidence_count} cards)" for t in previous.values()) or "(none)",
        "taxonomy": "\n".join(f"- {name}" for name in taxonomy) or "(empty)",
    })
    by_id = {c.id: c for c in cards}
    trends, changes = build_trends(draft, by_id, previous, today)
    new_styles = remember_styles(store, draft.new_styles, by_id, today) if store is not None else []
    cards_db.save_trends(trends, run_id)
    return {"trends": trends, "trend_changes": changes, "new_styles": new_styles}


def make_synthesizer(chain: Runnable | None = None, db_path: Path | None = None,
                     window_days: int = WINDOW_DAYS) -> Callable[[RunState], dict]:
    built: list[Runnable] = []

    def synthesizer(state: RunState, *, store: BaseStore | None = None) -> dict:
        if chain is None and not built:
            built.append(build_synthesizer_chain())
        try:
            out = synthesize(CardStore(db_path or default_db_path()), chain or built[0], store,
                             state.get("run_id", "manual"), window_days=window_days)
        except Exception as exc:                        # trends are a bonus; never lose the run over them
            return {"trends": [], "trend_changes": {}, "new_styles": [],
                    "errors": [f"synthesizer: failed ({type(exc).__name__}: {str(exc)[:300]})"]}
        get_stream_writer()({"node": "synthesizer", "video": f"{len(out['trends'])} trends",
                             "text": ", ".join(f"{t.name} ({t.evidence_count})" for t in out["trends"][:4]) or "none"})
        return out

    return synthesizer
