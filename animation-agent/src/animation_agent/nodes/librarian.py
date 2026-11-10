"""Librarian: write the cards, reviews, Triage decisions and a run log to SQLite, and record in
long-term memory what this run analysed or skipped. Plain code, no model."""
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


def make_librarian(db_path: Path | None = None) -> Callable[[RunState], dict]:
    def librarian(state: RunState, *, store: BaseStore | None = None) -> dict:
        cards_db = CardStore(db_path or default_db_path())
        run_id = state["run_id"]
        saved = [cards_db.upsert_card(card, run_id) for card in state.get("cards", [])]
        for review in state.get("reviews", []):
            cards_db.save_review(review, run_id)
        cards_db.save_triage(run_id, state.get("triage", []))
        cards_db.log_run(run_id, state.get("started_at"), state.get("queries", []),
                         len(state.get("candidates", [])), saved, state.get("errors", []))
        if store is not None:
            remember_run(store, run_id, state.get("cards", []), state.get("reviews", []), state.get("triage", []))
        return {"saved": saved}

    return librarian
