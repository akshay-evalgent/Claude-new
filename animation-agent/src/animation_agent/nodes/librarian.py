"""Librarian: write the cards, reviews, Triage decisions and a run log to SQLite, index the cards
for search (Milestone 6), and record in long-term memory what this run analysed or skipped.
Plain code, no model."""
# No `from __future__ import annotations` here: LangGraph injects `store` by reading the
# parameter's type, and that import turns every type hint into a string it does not match.

from pathlib import Path
from typing import Callable

from langgraph.store.base import BaseStore

from ..config import settings
from ..memory import remember_run
from ..state import RunState
from ..storage import CardStore


def default_db_path() -> Path:
    return settings.data_dir / "anim.db"


def make_librarian(db_path: Path | None = None, kb: Callable | None = None) -> Callable[[RunState], dict]:
    """`kb` is a function returning the KnowledgeBase, called only when there are cards to index,
    so building the graph never loads the embedding model."""
    def librarian(state: RunState, *, store: BaseStore | None = None) -> dict:
        cards_db = CardStore(db_path or default_db_path())
        run_id = state["run_id"]
        saved = [cards_db.upsert_card(card, run_id) for card in state.get("cards", [])]
        for review in state.get("reviews", []):
            cards_db.save_review(review, run_id)
        for src in state.get("sources", []):
            cards_db.save_source(src["card_id"], run_id, src["source"])
        cards_db.save_triage(run_id, state.get("triage", []))
        cards_db.log_run(run_id, state.get("started_at"), state.get("queries", []),
                         len(state.get("candidates", [])), saved, state.get("errors", []))
        if store is not None:
            remember_run(store, run_id, state.get("cards", []), state.get("reviews", []), state.get("triage", []))
        errors: list[str] = []
        if kb is not None and state.get("cards"):
            approved = {r.card_id: r.approved for r in state.get("reviews", [])}
            try:
                index = kb()
                for card in state["cards"]:
                    index.upsert(card, approved.get(card.id))
            except Exception as exc:                    # the cards are safe in SQLite; reindex later
                errors.append(f"librarian: search index not updated ({type(exc).__name__}: {exc}); "
                              "run `anim index --rebuild`")
        return {"saved": saved, "errors": errors}

    return librarian
