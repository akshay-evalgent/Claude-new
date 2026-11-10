"""The main graph. Milestone 3 adds Triage, a parallel fan-out and a Critic loop.

    START -> scout -> triage --(Send, one per selected video)--> analyze -> librarian -> END
                         \\__________(nothing selected)___________________/

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

from animation_agent.nodes import build_card_graph, make_librarian, make_scout, make_triage, route_after_triage
from animation_agent.state import RunInput, RunState


def build_graph(
    scout: Callable | None = None,
    triage: Callable | None = None,
    analyze=None,
    librarian: Callable | None = None,
    *,
    checkpointer=None,
    store=None,
):
    """Wire the nodes together. Pass a node (or a compiled card pipeline) to replace the default.

    `checkpointer` gives every run short-term memory: state saved after each step, so a stopped
    run can resume. `store` gives the nodes long-term memory shared across runs. The card pipeline
    subgraph inherits both from the parent. The CLI passes SQLite-backed ones (memory.py); the
    module-level `graph` below has neither, because LangGraph's dev server supplies its own.
    """
    builder = StateGraph(RunState, input_schema=RunInput)
    builder.add_node("scout", scout or make_scout())
    builder.add_node("triage", triage or make_triage())
    builder.add_node("analyze", analyze or build_card_graph())
    builder.add_node("librarian", librarian or make_librarian())
    builder.add_edge(START, "scout")
    builder.add_edge("scout", "triage")
    builder.add_conditional_edges("triage", route_after_triage, ["analyze", "librarian"])
    builder.add_edge("analyze", "librarian")
    builder.add_edge("librarian", END)
    return builder.compile(name="animation-pipeline", checkpointer=checkpointer, store=store)


# The compiled graph LangGraph Studio and `langgraph dev` load.
graph = build_graph()
