"""SQLite storage for Technique Cards and a log of runs.

Lesson: store the full card as JSON for fidelity, plus a few plain columns you will want to
filter and sort on. Cards are keyed by a stable id (`youtube:<video id>`), so re-analysing the
same video updates its row instead of adding a duplicate, and `first_seen` survives the update.
"""
from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .schemas import TechniqueCard

SCHEMA = """
CREATE TABLE IF NOT EXISTS cards (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    style_family  TEXT NOT NULL,
    sub_style     TEXT,
    confidence    REAL,
    views         INTEGER,
    views_per_day REAL,
    source_url    TEXT,
    first_seen    TEXT,
    last_updated  TEXT,
    run_id        TEXT,
    card_json     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runs (
    run_id      TEXT PRIMARY KEY,
    started_at  TEXT,
    finished_at TEXT,
    queries     TEXT,
    candidates  INTEGER,
    cards       TEXT,
    errors      TEXT
);
"""


class CardStore:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as conn, conn:
            conn.executescript(SCHEMA)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def upsert_card(self, card: TechniqueCard, run_id: str) -> str:
        if not card.id:
            raise ValueError("card.id must be set before saving")
        with closing(self._connect()) as conn, conn:
            row = conn.execute("SELECT first_seen FROM cards WHERE id = ?", (card.id,)).fetchone()
            if row and row["first_seen"]:
                card = card.model_copy(update={"first_seen": datetime.fromisoformat(row["first_seen"]).date()})
            conn.execute(
                """INSERT INTO cards (id, title, style_family, sub_style, confidence, views, views_per_day,
                                      source_url, first_seen, last_updated, run_id, card_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET
                     title = excluded.title, style_family = excluded.style_family, sub_style = excluded.sub_style,
                     confidence = excluded.confidence, views = excluded.views, views_per_day = excluded.views_per_day,
                     source_url = excluded.source_url, last_updated = excluded.last_updated,
                     run_id = excluded.run_id, card_json = excluded.card_json""",
                (card.id, card.title, card.style_family, card.sub_style, card.confidence, card.virality.views,
                 card.virality.views_per_day, (card.source_urls or [None])[0],
                 card.first_seen.isoformat() if card.first_seen else None,
                 card.last_updated.isoformat() if card.last_updated else None, run_id, card.model_dump_json()),
            )
        return card.id

    def log_run(self, run_id: str, started_at: str | None, queries: list[str], candidates: int,
                cards: list[str], errors: list[str]) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute(
                "INSERT OR REPLACE INTO runs VALUES (?, ?, ?, ?, ?, ?, ?)",
                (run_id, started_at, datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 json.dumps(queries), candidates, json.dumps(cards), json.dumps(errors)),
            )

    def list_cards(self, limit: int = 20) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute(
                """SELECT id, title, style_family, confidence, views, views_per_day, last_updated
                   FROM cards ORDER BY last_updated DESC, views_per_day DESC LIMIT ?""", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def get_card(self, card_id: str) -> TechniqueCard | None:
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT card_json FROM cards WHERE id = ?", (card_id,)).fetchone()
        return TechniqueCard.model_validate_json(row["card_json"]) if row else None

    def runs(self, limit: int = 10) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
