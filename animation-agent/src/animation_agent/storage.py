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

from .schemas import Review, TechniqueCard, Trend, TriageDecision

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
CREATE TABLE IF NOT EXISTS reviews (
    card_id    TEXT NOT NULL,
    run_id     TEXT NOT NULL,
    rounds     INTEGER,
    approved   INTEGER,
    confidence REAL,
    issues     TEXT,
    history    TEXT,
    PRIMARY KEY (card_id, run_id)
);
CREATE TABLE IF NOT EXISTS triage (
    run_id       TEXT NOT NULL,
    video_id     TEXT NOT NULL,
    title        TEXT,
    is_animation INTEGER,
    interest     INTEGER,
    viral_score  REAL,
    priority     REAL,
    selected     INTEGER,
    reason       TEXT,
    PRIMARY KEY (run_id, video_id)
);
CREATE TABLE IF NOT EXISTS digests (
    run_id     TEXT PRIMARY KEY,
    status     TEXT,
    path       TEXT,
    rounds     INTEGER,
    decided_at TEXT,
    markdown   TEXT
);
CREATE TABLE IF NOT EXISTS trends (
    id          TEXT PRIMARY KEY,
    name        TEXT,
    status      TEXT,
    confidence  REAL,
    evidence    INTEGER,
    first_seen  TEXT,
    last_seen   TEXT,
    run_id      TEXT,
    trend_json  TEXT NOT NULL
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

    def save_review(self, review: Review, run_id: str) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute(
                "INSERT OR REPLACE INTO reviews VALUES (?, ?, ?, ?, ?, ?, ?)",
                (review.card_id, run_id, review.rounds, int(review.approved), review.confidence,
                 json.dumps([i.model_dump() for i in review.issues]), json.dumps(review.history)),
            )

    def save_triage(self, run_id: str, decisions: list[TriageDecision]) -> None:
        """Every decision, kept or not. Milestone 8 turns these rows into a labelled eval set."""
        with closing(self._connect()) as conn, conn:
            conn.executemany(
                "INSERT OR REPLACE INTO triage VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [(run_id, d.video_id, d.title, int(d.is_animation), d.interest, d.viral_score, d.priority,
                  int(d.selected), d.reason) for d in decisions],
            )

    def save_digest(self, run_id: str, status: str, path: str | None, markdown: str, rounds: int) -> None:
        with closing(self._connect()) as conn, conn:
            conn.execute("INSERT OR REPLACE INTO digests VALUES (?, ?, ?, ?, ?, ?)",
                         (run_id, status, path, rounds, datetime.now(timezone.utc).isoformat(timespec="seconds"), markdown))

    def list_digests(self, limit: int = 10) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT run_id, status, path, rounds, decided_at FROM digests "
                                "ORDER BY decided_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def save_trends(self, trends: list[Trend], run_id: str) -> None:
        with closing(self._connect()) as conn, conn:
            conn.executemany(
                "INSERT OR REPLACE INTO trends VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [(t.id, t.name, t.status, t.confidence, t.evidence_count, t.first_seen.isoformat(),
                  t.last_seen.isoformat(), run_id, t.model_dump_json()) for t in trends])

    def list_trends(self, since: str | None = None) -> list[Trend]:
        """Trends last seen on or after `since` (ISO date), strongest first."""
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT trend_json FROM trends WHERE last_seen >= ? ORDER BY confidence DESC",
                                (since or "0000",)).fetchall()
        return [Trend.model_validate_json(r["trend_json"]) for r in rows]

    def list_cards(self, limit: int = 20) -> list[dict[str, Any]]:
        """Newest first, with the Critic's verdict from the run that last wrote the card (None before M3)."""
        with closing(self._connect()) as conn:
            rows = conn.execute(
                """SELECT c.id, c.title, c.style_family, c.confidence, c.views, c.views_per_day, c.last_updated,
                          r.approved, r.rounds
                   FROM cards c LEFT JOIN reviews r ON r.card_id = c.id AND r.run_id = c.run_id
                   ORDER BY c.last_updated DESC, c.views_per_day DESC LIMIT ?""", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def get_review(self, card_id: str) -> dict[str, Any] | None:
        with closing(self._connect()) as conn:
            row = conn.execute(
                """SELECT r.* FROM reviews r JOIN cards c ON c.id = r.card_id AND c.run_id = r.run_id
                   WHERE r.card_id = ?""", (card_id,)).fetchone()
        return dict(row) if row else None

    def get_card(self, card_id: str) -> TechniqueCard | None:
        with closing(self._connect()) as conn:
            row = conn.execute("SELECT card_json FROM cards WHERE id = ?", (card_id,)).fetchone()
        return TechniqueCard.model_validate_json(row["card_json"]) if row else None

    def runs(self, limit: int = 10) -> list[dict[str, Any]]:
        with closing(self._connect()) as conn:
            rows = conn.execute("SELECT * FROM runs ORDER BY started_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
