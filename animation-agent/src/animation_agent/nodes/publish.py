"""Publish: the one outward-facing step, and the reason a human reviews before it.

Writes the approved or edited digest to `data/digests/<date>-<run id>.md` and records the
decision, including rejections, in the knowledge base. Milestone 10 adds email or Notion delivery
here; the review step in front of it stays the same.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Callable

from ..config import settings
from ..state import RunState
from ..storage import CardStore
from .librarian import default_db_path


def default_digest_dir() -> Path:
    return settings.data_dir / "digests"


def make_publish(out_dir: Path | None = None, db_path: Path | None = None) -> Callable[[RunState], dict]:
    def publish(state: RunState) -> dict:
        status = state.get("digest_status", "approved")
        path = None
        if status in ("approved", "edited"):
            folder = out_dir or default_digest_dir()
            folder.mkdir(parents=True, exist_ok=True)
            path = folder / f"{date.today().isoformat()}-{state['run_id']}.md"
            path.write_text(state.get("digest", ""))
        CardStore(db_path or default_db_path()).save_digest(
            state["run_id"], status, str(path) if path else None, state.get("digest", ""), state.get("digest_round", 1))
        return {"digest_path": str(path) if path else ""}

    return publish
