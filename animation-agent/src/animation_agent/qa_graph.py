"""The question-answering graph: plan -> retrieve -> answer, with citations checked in code.

    START -> plan -> retrieve --(no cards found)--> END
                         |
                         v
                       answer -> END

- **plan**: a cheap model turns the question into a `QueryPlan`: text to embed plus hard filters
  (style family, difficulty, tools, approved only). Filters are set only when the question demands
  them. This is the "self-query" pattern.
- **retrieve**: Chroma filters on metadata, then ranks by similarity. Tool names are matched in
  code. If fewer than two cards survive, filters are relaxed one at a time, and the answer is told
  which ones were dropped.
- **answer**: the strong model answers from the numbered cards only, citing them as [1], [2].
  Code then checks every citation: a number that does not match a retrieved card is removed and
  reported. An answer that cites nothing is flagged as unsupported.

Run:  uv run anim ask "Which stop motion techniques could a solo creator try?"
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Callable, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable
from langgraph.graph import END, START, StateGraph

from .kb import Hit, KnowledgeBase
from .llm import get_model
from .schemas import CitedAnswer, QueryPlan, TechniqueCard
from .storage import CardStore

PROMPTS = Path(__file__).parent / "prompts"
DEFAULT_K = 6
MIN_HITS = 2
RELAX_ORDER = ["tools", "difficulty", "style", "approved"]
_MARK = re.compile(r"\[(\d+)\]")


class QAState(TypedDict, total=False):
    question: str
    k: int
    plan: QueryPlan
    hits: list[Hit]
    relaxed: list[str]
    answer: str
    citations: list[dict[str, Any]]
    insufficient: bool
    warnings: list[str]


def build_where(plan: QueryPlan, drop: set[str] = frozenset()) -> dict | None:
    clauses: list[dict] = []
    if not plan.include_unapproved and "approved" not in drop:
        clauses.append({"approved": True})
    if plan.style_families and "style" not in drop:
        clauses.append({"style_family": {"$in": list(plan.style_families)}})
    if "difficulty" not in drop:
        if plan.max_difficulty:
            clauses.append({"difficulty": {"$lte": plan.max_difficulty}})
        if plan.min_difficulty:
            clauses.append({"difficulty": {"$gte": plan.min_difficulty}})
    if not clauses:
        return None
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def retrieve_cards(kb: KnowledgeBase, plan: QueryPlan, k: int = DEFAULT_K) -> tuple[list[Hit], list[str]]:
    """Filtered vector search, relaxing filters in a fixed order until at least MIN_HITS remain."""
    active = [step for step in RELAX_ORDER if _uses(plan, step)]
    drop: set[str] = set()
    hits: list[Hit] = []
    for step in [None] + active:
        if step:
            drop.add(step)
        wanted_tools = [t.lower() for t in plan.tools] if "tools" not in drop else []
        hits = kb.search(plan.search_text, build_where(plan, drop), k=k * 3 if wanted_tools else k)
        if wanted_tools:
            hits = [h for h in hits if any(t in h.metadata.get("tools", "") for t in wanted_tools)]
        hits = hits[:k]
        if len(hits) >= MIN_HITS:
            break
    return hits, [s for s in RELAX_ORDER if s in drop]


def _uses(plan: QueryPlan, step: str) -> bool:
    return {"tools": bool(plan.tools), "difficulty": bool(plan.max_difficulty or plan.min_difficulty),
            "style": bool(plan.style_families), "approved": not plan.include_unapproved}[step]


def card_for_answer(n: int, card: TechniqueCard, meta: dict) -> str:
    status = "approved by the Critic" if meta.get("approved") else "NOT approved (flagged or unreviewed)"
    lines = [f"[{n}] {card.title}", f"style: {card.style_family} / {card.sub_style}",
             f"confidence {card.confidence:.2f}, {status}, difficulty {card.difficulty}/5, about {card.time_to_reproduce}",
             f"tools: {', '.join(card.tools) or 'not stated'}", f"summary: {card.summary}"]
    lines += [f"step: {s}" for s in card.how_it_is_made[:5]]
    lines += [f'evidence: {e.claim} ("{e.quote}")' for e in card.why_it_works.evidence[:4]]
    return "\n".join(lines)


def check_citations(text: str, n_cards: int) -> tuple[str, list[int], list[int]]:
    """Remove citation numbers that point at no card. Returns (clean text, used, invalid)."""
    found = [int(m) for m in _MARK.findall(text)]
    invalid = sorted({m for m in found if not 1 <= m <= n_cards})
    used = sorted({m for m in found if 1 <= m <= n_cards})
    clean = _MARK.sub(lambda m: m.group(0) if 1 <= int(m.group(1)) <= n_cards else "", text)
    return clean, used, invalid


def build_planner_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([("system", (PROMPTS / "query.md").read_text()),
                                               ("human", "Question: {question}")])
    return (prompt | get_model("query").with_structured_output(QueryPlan)).with_config(run_name="qa_plan")


def build_answer_chain() -> Runnable:
    prompt = ChatPromptTemplate.from_messages([
        ("system", (PROMPTS / "answer.md").read_text()),
        ("human", "QUESTION: {question}\n\nSEARCH NOTE: {note}\n\nCARDS:\n\n{cards}"),
    ])
    return (prompt | get_model("answer").with_structured_output(CitedAnswer)).with_config(run_name="qa_answer")


def build_qa_graph(kb: KnowledgeBase, cards_db: CardStore, planner: Runnable | None = None,
                   answerer: Runnable | None = None, use_planner: bool = True):
    def plan(state: QAState) -> dict:
        if not use_planner:
            return {"plan": QueryPlan(search_text=state["question"])}
        return {"plan": (planner or build_planner_chain()).invoke({"question": state["question"]})}

    def retrieve(state: QAState) -> dict:
        hits, relaxed = retrieve_cards(kb, state["plan"], state.get("k") or DEFAULT_K)
        return {"hits": hits, "relaxed": relaxed}

    def route(state: QAState) -> str:
        return "answer" if state.get("hits") else END

    def answer(state: QAState) -> dict:
        warnings: list[str] = []
        numbered: list[tuple[TechniqueCard, Hit]] = []
        for hit in state["hits"]:
            card = cards_db.get_card(hit.card_id)
            if card is None:
                warnings.append(f"{hit.card_id} is in the search index but not in anim.db; run `anim index --rebuild`.")
                continue
            numbered.append((card, hit))
        note = ("Filters relaxed to find enough cards: " + ", ".join(state["relaxed"]) + ". Matches are the nearest available."
                if state.get("relaxed") else "All requested filters were applied.")
        reply: CitedAnswer = (answerer or build_answer_chain()).invoke({
            "question": state["question"], "note": note,
            "cards": "\n\n".join(card_for_answer(n, c, h.metadata) for n, (c, h) in enumerate(numbered, 1)),
        })
        text, used, invalid = check_citations(reply.answer, len(numbered))
        if invalid:
            warnings.append(f"Removed citations to cards that were not provided: {invalid}")
        if not used and not reply.insufficient:
            warnings.append("The answer cites no cards, so treat it as unsupported.")
        citations = [{"n": n, "card_id": numbered[n - 1][0].id, "title": numbered[n - 1][0].title,
                      "url": (numbered[n - 1][0].source_urls or [""])[0], "confidence": numbered[n - 1][0].confidence,
                      "approved": bool(numbered[n - 1][1].metadata.get("approved"))} for n in used]
        return {"answer": text, "citations": citations, "insufficient": reply.insufficient, "warnings": warnings}

    builder = StateGraph(QAState)
    builder.add_node("plan", plan)
    builder.add_node("retrieve", retrieve)
    builder.add_node("answer", answer)
    builder.add_edge(START, "plan")
    builder.add_edge("plan", "retrieve")
    builder.add_conditional_edges("retrieve", route, ["answer", END])
    builder.add_edge("answer", END)
    return builder.compile(name="qa")


def index_all(kb: KnowledgeBase, cards_db: CardStore, rebuild: bool = False) -> int:
    """Copy every card in anim.db into the search index. The Librarian keeps it in sync after that."""
    if rebuild:
        kb.clear()
    rows = cards_db.list_cards(limit=1_000_000)
    for row in rows:
        card = cards_db.get_card(row["id"])
        if card is not None:
            kb.upsert(card, None if row["approved"] is None else bool(row["approved"]))
    return len(rows)
