"""Build and load the frozen eval datasets (JSONL, versioned in git under evals/datasets/).

- cards.jsonl   : the card corpus for retrieval evals, so they run anywhere, CI included.
- qa.jsonl      : questions with the card ids a good search must return. Written by hand.
- analyst.jsonl : the source material each approved card was written from. Stored sources are
                  used when present; older cards get theirs rebuilt from YouTube (metadata and
                  comments may have moved on since, which is fine for a fixed test input).
- triage.jsonl  : the exact lines Triage reads, plus labels. Labels are kept across rebuilds, and
                  each one records who made it: "human" or "opus-draft".
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from ..config import ROOT
from ..nodes.analyst import COMMENTS_PER_VIDEO, source_material
from ..nodes.triage import describe
from ..storage import CardStore
from ..tools.youtube import fetch_top_comments, fetch_videos

EVALS_DIR = ROOT / "evals"
DATASETS = EVALS_DIR / "datasets"
RESULTS = EVALS_DIR / "results"
BASELINE = EVALS_DIR / "baseline.json"
MAX_TRIAGE_ROWS = 40


def load(name: str, folder: Path | None = None) -> list[dict]:
    path = (folder or DATASETS) / f"{name}.jsonl"
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def save(name: str, rows: list[dict], folder: Path | None = None) -> Path:
    path = (folder or DATASETS) / f"{name}.jsonl"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))
    return path


def build_cards(cards_db: CardStore) -> list[dict]:
    rows = []
    for r in cards_db.list_cards(limit=1_000_000):
        card = cards_db.get_card(r["id"])
        if card is not None:
            rows.append({"card_id": card.id, "approved": r["approved"], "card": card.model_dump(mode="json")})
    return rows


def build_analyst(cards_db: CardStore, fetch: Callable = fetch_videos,
                  comments: Callable = fetch_top_comments) -> list[dict]:
    rows, missing = [], []
    for r in cards_db.list_cards(limit=1_000_000):
        if r["approved"] != 1:
            continue
        stored = cards_db.get_source(r["id"])
        if stored:
            rows.append({"card_id": r["id"], "title": r["title"], "source": stored, "origin": "stored"})
        else:
            missing.append(r)
    if missing:
        found, _ = fetch([r["id"].split(":", 1)[1] for r in missing])
        for c in found:
            try:
                top = comments(c.video_id, COMMENTS_PER_VIDEO)
            except Exception:
                top = []
            rows.append({"card_id": f"youtube:{c.video_id}", "title": c.title,
                         "source": source_material(c, top), "origin": "rebuilt"})
    return sorted(rows, key=lambda r: r["card_id"])


def build_triage(cards_db: CardStore, fetch: Callable = fetch_videos, existing: list[dict] | None = None) -> list[dict]:
    """Triage inputs rebuilt from stored decisions. Existing labels are carried over."""
    labels = {r["video_id"]: r["label"] for r in (existing or []) if r.get("label")}
    with cards_db._connect() as conn:            # noqa: SLF001 - read-only query on our own table
        ids = [row[0] for row in conn.execute(
            "SELECT video_id FROM triage GROUP BY video_id ORDER BY MAX(run_id) DESC LIMIT ?", (MAX_TRIAGE_ROWS,))]
    found, _ = fetch(ids)
    return [{"video_id": c.video_id, "title": c.title, "line": describe(c), "label": labels.get(c.video_id)}
            for c in found]


def draft_labels(rows: list[dict], chain) -> int:
    """Fill missing labels with a strong model's opinion, marked as a draft for a human to check."""
    todo = [r for r in rows if not r.get("label")]
    for start in range(0, len(todo), 20):
        batch = todo[start:start + 20]
        out = chain.invoke({"videos": "\n".join(r["line"] for r in batch)})
        by_id = {lab.video_id: lab for lab in out.labels}
        for r in batch:
            lab = by_id.get(r["video_id"])
            if lab:
                r["label"] = {"is_animation": lab.is_animation, "worth_card": lab.worth_card, "source": "opus-draft"}
    return sum(1 for r in todo if r.get("label"))
