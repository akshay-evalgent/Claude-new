"""Milestone 2: the first graph. Scout -> Analyst -> Librarian.

    START -> scout -> analyst -> librarian -> END

Lesson, graph vs agent: Milestone 1's agent decided its own next step every turn. A graph fixes
the steps and their order in code, and gives each step one narrow job with typed input and
output. You lose some flexibility and gain things a production agent needs: every run takes the
same path, each node can be tested and evaluated alone, a failure points at one node, and
LangSmith shows one span per node.

This file uses absolute imports so LangGraph Studio can load it by path (see langgraph.json).

Run:  uv run anim run
"""
from __future__ import annotations

from typing import Callable

from langgraph.graph import END, START, StateGraph

from animation_agent.nodes import make_analyst, make_librarian, make_scout
from animation_agent.state import RunInput, RunState


def build_graph(
    scout: Callable | None = None,
    analyst: Callable | None = None,
    librarian: Callable | None = None,
):
    """Wire the nodes together. Pass a node to replace the default, as the tests do."""
    builder = StateGraph(RunState, input_schema=RunInput)
    builder.add_node("scout", scout or make_scout())
    builder.add_node("analyst", analyst or make_analyst())
    builder.add_node("librarian", librarian or make_librarian())
    builder.add_edge(START, "scout")
    builder.add_edge("scout", "analyst")
    builder.add_edge("analyst", "librarian")
    builder.add_edge("librarian", END)
    return builder.compile(name="animation-pipeline")


# The compiled graph LangGraph Studio and `langgraph dev` load.
graph = build_graph()
