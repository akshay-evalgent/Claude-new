"""The knowledge base: every Technique Card, searchable by meaning and filterable by fields.

Lesson, RAG done properly: a vector search alone finds cards that *sound like* the question.
Real questions also have hard constraints ("3D only", "easy to reproduce", "approved cards"),
and a vector cannot enforce those. So each card is stored twice over in one Chroma collection:

- a document (title, style, summary, steps, evidence claims) that is embedded for similarity;
- metadata fields (style family, difficulty, confidence, approval, views per day, posting date)
  that Chroma filters on exactly, before ranking by similarity.

Embeddings come from Chroma's built-in local model (all-MiniLM-L6-v2, ONNX), so no embedding API
key is needed. The full card stays in SQLite (`anim.db`); Chroma only holds what search needs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .config import settings
from .schemas import TechniqueCard

COLLECTION = "technique_cards"


def kb_path() -> Path:
    return settings.data_dir / "chroma"


def card_document(card: TechniqueCard) -> str:
    """The text that gets embedded: what a card is about, not its numbers."""
    parts = [card.title, f"Style: {card.style_family.replace('_', ' ')}; {card.sub_style}",
             "Tags: " + ", ".join(card.tags), "Tools: " + ", ".join(card.tools), card.summary]
    parts += card.how_it_is_made[:6]
    parts += [e.claim for e in card.why_it_works.evidence[:6]]
    return "\n".join(p for p in parts if p.strip())[:4000]


def card_metadata(card: TechniqueCard, approved: bool | None) -> dict[str, Any]:
    """Scalar fields Chroma can filter on. None is not allowed, so missing values get sentinels."""
    posted = card.virality.posted_on
    return {
        "card_id": card.id or "",
        "title": card.title[:300],
        "style_family": card.style_family,
        "difficulty": int(card.difficulty),
        "confidence": float(card.confidence),
        "approved": bool(approved),
        "reviewed": approved is not None,
        "views_per_day": float(card.virality.views_per_day or 0),
        "posted_on": int(posted.strftime("%Y%m%d")) if posted else 0,
        "tools": "|".join(t.lower() for t in card.tools),
        "url": (card.source_urls or [""])[0],
    }


@dataclass
class Hit:
    card_id: str
    title: str
    similarity: float
    metadata: dict[str, Any] = field(default_factory=dict)


class KnowledgeBase:
    def __init__(self, path: Path | None = None, embedding_function=None) -> None:
        import chromadb
        from chromadb.utils import embedding_functions

        self.client = chromadb.PersistentClient(path=str(path or kb_path()))
        self.collection = self.client.get_or_create_collection(
            COLLECTION,
            embedding_function=embedding_function or embedding_functions.DefaultEmbeddingFunction(),
            metadata={"hnsw:space": "cosine"},
        )

    def upsert(self, card: TechniqueCard, approved: bool | None) -> None:
        self.collection.upsert(ids=[card.id], documents=[card_document(card)],
                               metadatas=[card_metadata(card, approved)])

    def count(self) -> int:
        return self.collection.count()

    def clear(self) -> None:
        ids = self.collection.get(include=[])["ids"]
        if ids:
            self.collection.delete(ids=ids)

    def search(self, text: str, where: dict | None = None, k: int = 6) -> list[Hit]:
        n = min(k, self.count())
        if n == 0:
            return []
        result = self.collection.query(query_texts=[text], n_results=n, where=where or None,
                                       include=["metadatas", "distances"])
        return [Hit(card_id=cid, title=meta.get("title", ""), similarity=round(1 - dist, 3), metadata=meta)
                for cid, meta, dist in zip(result["ids"][0], result["metadatas"][0], result["distances"][0])]


def default_kb() -> KnowledgeBase:
    return KnowledgeBase()
