"""The main graph.

    START -> scout -> triage --(Send, one per selected video)--> analyze -> librarian
                         \\__________(nothing selected)___________________/      |
                                                                  (no approved cards) -> END
                                                                                 v
                          reporter -> human_review --approve/edit/reject--> publish -> END
                             ^              |
                             +---revise-----+    human_review pauses the run with interrupt()

`analyze` is itself a graph (`nodes/card_pipeline.py`): gather -> analyst -> critic, looping back
to the analyst at most twice. LangGraph runs all the `analyze` copies in the same step, in
parallel, and starts the Librarian only once every copy has finished.

Lesson, graph vs agent: a fixed path with typed steps is what lets you test, trace and evaluate
each step. Milestone 3 adds the agent-like parts back inside the graph, where you can see them:
a branch (conditional edge), a map-reduce (Send plus append reducers) and a bounded loop.

This file uses absolute imports so LangGraph Studio can load it by path (see langgraph.json).

Run:  uv run anim run
"""
from __future__ import annotations

from typing import Callable

from langgraph.graph import END, START, StateGraph

from animation_agent.nodes import (build_card_graph, human_review, make_librarian, make_publish, make_reporter,
                                   make_scout, make_triage, route_after_librarian, route_after_triage)
from animation_agent.state import RunInput, RunState


def build_graph(
    scout: Callable | None = None,
    triage: Callable | None = None,
    analyze=None,
    librarian: Callable | None = None,
    reporter: Callable | None = None,
    publish: Callable | None = None,
    *,
    with_digest: bool = True,
    kb: Callable | None = None,
    checkpointer=None,
    store=None,
):
    """Wire the nodes together. Pass a node (or a compiled card pipeline) to replace the default.

    `checkpointer` gives every run short-term memory: state saved after each step, so a stopped
    run can resume. `store` gives the nodes long-term memory shared across runs. The card pipeline
    subgraph inherits both from the parent. The CLI passes SQLite-backed ones (memory.py); the
    module-level `graph` below has neither, because LangGraph's dev server supplies its own.

    With `with_digest=False` the run ends at the Librarian: no digest, no human review. The human
    review uses `interrupt()`, which needs a checkpointer to save the paused run.
    """
    builder = StateGraph(RunState, input_schema=RunInput)
    builder.add_node("scout", scout or make_scout())
    builder.add_node("triage", triage or make_triage())
    builder.add_node("analyze", analyze or build_card_graph())
    builder.add_node("librarian", librarian or make_librarian(kb=kb))
    builder.add_edge(START, "scout")
    builder.add_edge("scout", "triage")
    builder.add_conditional_edges("triage", route_after_triage, ["analyze", "librarian"])
    builder.add_edge("analyze", "librarian")
    if not with_digest:
        builder.add_edge("librarian", END)
    else:
        builder.add_node("reporter", reporter or make_reporter())
        # human_review routes itself with Command(goto=...); `destinations` lets LangGraph draw it.
        builder.add_node("human_review", human_review, destinations=("publish", "reporter", "human_review"))
        builder.add_node("publish", publish or make_publish())
        builder.add_conditional_edges("librarian", route_after_librarian, ["reporter", END])
        builder.add_edge("reporter", "human_review")
        builder.add_edge("publish", END)
    return builder.compile(name="animation-pipeline", checkpointer=checkpointer, store=store)


# The compiled graph LangGraph Studio and `langgraph dev` load. It indexes cards for search too.
from animation_agent.kb import default_kb  # noqa: E402

graph = build_graph(kb=default_kb)
