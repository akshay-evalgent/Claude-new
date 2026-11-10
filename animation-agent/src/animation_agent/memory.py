"""Memory: short-term (checkpoints, one per run) and long-term (a store, shared by all runs).

Lesson: an agent has two kinds of memory, and they answer different questions.

- **Short-term memory is "where was I in this run?"** A checkpointer saves the graph's state after
  every step, keyed by a thread id (here, the run id). If the run stops (Ctrl-C, a crash, a closed
  laptop), `graph.invoke(None, config)` picks up from the last saved step. Work that finished,
  including parallel card pipelines that completed before another one crashed, is not redone.
  Stored in `data/checkpoints.db`. Deleting it loses only the ability to resume old runs.

- **Long-term memory is "what do I know from earlier runs?"** A store holds facts across threads.
  Here it remembers every video already analysed, and every video Triage skipped recently, so
  Scout never spends a stats lookup, a Triage slot or an Opus call on them again.
  Stored in `data/memory.db`. Deleting it makes the agent forget what it has seen.

The knowledge base itself, the cards, stays in `data/anim.db`. Memory is the agent's working
notes; the knowledge base is its output.
"""
from __future__ import annotations

import inspect
import sqlite3
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Iterator

from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.store.base import BaseStore, Item
from langgraph.store.sqlite import SqliteStore
from pydantic import BaseModel

from . import schemas
from .config import settings
from .schemas import Review, TechniqueCard, TriageDecision

VIDEOS = ("videos",)                # store namespace: one item per video, keyed "youtube:<id>"
SKIP_MEMORY_DAYS = 30               # a skipped video gets another chance after this many days


def checkpoints_path() -> Path:
    return settings.data_dir / "checkpoints.db"


def memory_path() -> Path:
    return settings.data_dir / "memory.db"


def serializer() -> JsonPlusSerializer:
    """Checkpoints hold our Pydantic objects. Loading a class from disk is a security decision,
    so LangGraph wants an explicit allowlist of which classes it may rebuild. We allow exactly
    the models in schemas.py, and nothing else."""
    models = [name for name, obj in inspect.getmembers(schemas, inspect.isclass)
              if issubclass(obj, BaseModel) and obj.__module__ == schemas.__name__]
    return JsonPlusSerializer(allowed_msgpack_modules=[(schemas.__name__, name) for name in models])


@contextmanager
def open_memory(checkpoints: Path | None = None, memory: Path | None = None) -> Iterator[tuple[SqliteSaver, SqliteStore]]:
    """Open both databases for the length of a run. Same connection settings as LangGraph's own
    `from_conn_string` helpers, plus our serializer."""
    cp_conn = sqlite3.connect(str(checkpoints or checkpoints_path()), check_same_thread=False)
    store_conn = sqlite3.connect(str(memory or memory_path()), check_same_thread=False, isolation_level=None)
    try:
        store = SqliteStore(store_conn)
        store.setup()
        yield SqliteSaver(cp_conn, serde=serializer()), store
    finally:
        cp_conn.close()
        store_conn.close()


def video_key(platform: str, video_id: str) -> str:
    return f"{platform}:{video_id}"


def is_settled(record: dict, today: date | None = None) -> bool:
    """Should Scout leave this video alone? Analysed: always. Skipped: for SKIP_MEMORY_DAYS."""
    status = record.get("status")
    if status == "analysed":
        return True
    if status == "skipped":
        on = date.fromisoformat(record.get("on", "1970-01-01"))
        return ((today or date.today()) - on).days < SKIP_MEMORY_DAYS
    return False


def settled_keys(store: BaseStore, keys: list[str], today: date | None = None) -> set[str]:
    settled = set()
    for key in keys:
        item = store.get(VIDEOS, key)
        if item is not None and is_settled(item.value, today):
            settled.add(key)
    return settled


def remember_run(store: BaseStore, run_id: str, cards: list[TechniqueCard], reviews: list[Review],
                 decisions: list[TriageDecision], today: date | None = None) -> None:
    """Write what this run learned. Selected videos that produced no card are not remembered,
    so the next run can try them again."""
    on = (today or date.today()).isoformat()
    approved = {r.card_id: r.approved for r in reviews}
    for card in cards:
        store.put(VIDEOS, card.id, {"status": "analysed", "card_id": card.id, "approved": approved.get(card.id),
                                    "confidence": card.confidence, "title": card.title, "run_id": run_id, "on": on})
    for d in decisions:
        key = video_key("youtube", d.video_id)
        if d.selected:
            continue
        existing = store.get(VIDEOS, key)
        if existing is not None and existing.value.get("status") == "analysed":
            continue                                    # never downgrade a card to a skip
        store.put(VIDEOS, key, {"status": "skipped", "reason": d.reason, "interest": d.interest,
                                "title": d.title, "run_id": run_id, "on": on})


def backfill_from_cards(store: BaseStore, card_rows: list[dict]) -> int:
    """Teach memory every card in the knowledge base that it does not know about yet.

    Cards written before memory existed would otherwise be analysed, and paid for, again. It only
    fills gaps: a card proves the video was analysed, so a "skipped" record is upgraded, while a
    "forgotten" marker left by `anim memory --forget` wins, so a forget sticks. Cheap enough to run
    before every new run.
    """
    added = 0
    for row in card_rows:
        existing = store.get(VIDEOS, row["id"])
        if existing is not None and existing.value.get("status") != "skipped":
            continue                                    # analysed already, or deliberately forgotten
        store.put(VIDEOS, row["id"], {"status": "analysed", "card_id": row["id"], "approved": row.get("approved"),
                                      "confidence": row.get("confidence"), "title": row.get("title", ""),
                                      "run_id": "backfill", "on": row.get("last_updated") or date.today().isoformat()})
        added += 1
    return added


def forget(store: BaseStore, key: str) -> None:
    """Let a video be picked again. Leaves a marker instead of deleting, so backfill will not re-add it."""
    store.put(VIDEOS, key, {"status": "forgotten", "on": date.today().isoformat()})


def recent_memories(store: BaseStore, limit: int = 20) -> list[Item]:
    items = store.search(VIDEOS, limit=1000)
    return sorted(items, key=lambda i: i.updated_at, reverse=True)[:limit]
