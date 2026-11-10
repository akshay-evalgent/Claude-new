"""Librarian: write the cards and a run log to SQLite. Plain code, no model."""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from ..config import settings
from ..state import RunState
from ..storage import CardStore


def default_db_path() -> Path:
    return settings.data_dir / "anim.db"


def make_librarian(db_path: Path | None = None) -> Callable[[RunState], dict]:
    def librarian(state: RunState) -> dict:
        store = CardStore(db_path or default_db_path())
        run_id = state["run_id"]
        saved = [store.upsert_card(card, run_id) for card in state.get("cards", [])]
        for review in state.get("reviews", []):
            store.save_review(review, run_id)
        store.save_triage(run_id, state.get("triage", []))
        store.log_run(run_id, state.get("started_at"), state.get("queries", []),
                      len(state.get("candidates", [])), saved, state.get("errors", []))
        return {"saved": saved}

    return librarian
