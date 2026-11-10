"""The per-card subgraph: gather -> analyst -> critic -> (analyst again | accept).

    START -> gather -> analyst --> critic --approve--> accept -> END
                         ^           |
                         +--revise---+   (at most MAX_REVISIONS times)

The main graph sends each selected candidate here with `Send`, so several of these run in
parallel, each with its own private `CardState`. Only `cards`, `reviews` and `errors` flow back
to the main graph (`output_schema=CardOutput`), where append reducers merge them.
"""
from __future__ import annotations

from typing import Callable

from langchain_core.runnables import Runnable
from langgraph.graph import END, START, StateGraph

from ..schemas import Comment, Review
from ..state import CardInput, CardOutput, CardState
from ..tools.youtube import fetch_top_comments
from .analyst import COMMENTS_PER_VIDEO, make_analyst_node, source_material
from .critic import make_critic_node, route_after_critic

UNAPPROVED_CONFIDENCE_CAP = 0.49   # PLAN.md: cards under 0.5 are kept but left out of digests


def make_gather(comments: Callable[[str, int], list[Comment]] = fetch_top_comments) -> Callable[[CardState], dict]:
    def gather(state: CardState) -> dict:
        c = state["candidate"]
        try:
            top = comments(c.video_id, COMMENTS_PER_VIDEO)
            errors = []
        except Exception as exc:                        # comments are nice to have, not required
            top, errors = [], [f"gather: comments for {c.video_id} unavailable: {type(exc).__name__}: {exc}"]
        return {"source": source_material(c, top), "attempts": 0, "errors": errors}

    return gather


def route_after_analyst(state: CardState) -> str:
    if state.get("draft") is None:
        return END                                      # not even a first draft: no card
    if state.get("failed"):
        return "accept"                                 # a revision failed: keep the last good draft
    return "critic"


def accept(state: CardState) -> dict:
    card = state["draft"].model_copy(deep=True)
    critique = state.get("critique")
    approved = critique is not None and critique.verdict == "approve" and not state.get("failed")
    if critique is not None:
        card.confidence = critique.confidence           # PLAN.md: the Critic sets confidence
    unresolved = [] if approved or critique is None else critique.issues
    if not approved:
        card.confidence = min(card.confidence, UNAPPROVED_CONFIDENCE_CAP)
        if critique is None:
            card.open_questions.append("Not reviewed: the Critic could not run.")
        else:
            card.open_questions.append(
                f"Not approved by the Critic after {state.get('attempts', 0)} drafts. Unresolved: "
                + "; ".join(i.problem for i in unresolved[:3]))
    review = Review(card_id=card.id, rounds=state.get("attempts", 0), approved=approved,
                    confidence=card.confidence, issues=unresolved, history=state.get("history", []))
    return {"cards": [card], "reviews": [review]}


def build_card_graph(
    analyst_chain: Runnable | None = None,
    critic_chain: Runnable | None = None,
    comments: Callable[[str, int], list[Comment]] = fetch_top_comments,
):
    builder = StateGraph(CardState, input_schema=CardInput, output_schema=CardOutput)
    builder.add_node("gather", make_gather(comments))
    builder.add_node("analyst", make_analyst_node(analyst_chain))
    builder.add_node("critic", make_critic_node(critic_chain))
    builder.add_node("accept", accept)
    builder.add_edge(START, "gather")
    builder.add_edge("gather", "analyst")
    builder.add_conditional_edges("analyst", route_after_analyst, ["critic", "accept", END])
    builder.add_conditional_edges("critic", route_after_critic, ["analyst", "accept"])
    builder.add_edge("accept", END)
    return builder.compile(name="card_pipeline")
