"""01 - Your first graph: write -> review -> revise, until it's good enough.

Concepts you learn here
  * State      - a TypedDict every node reads from and returns updates to
  * Nodes      - plain Python functions (each one can call Claude)
  * Edges      - fixed transitions (write always goes to review)
  * Conditional edges - a router function picks the next node (loop or stop)
  * A loop with a hard stop, so a picky reviewer can't run up your bill

Business use: any writing task where quality matters more than speed: cold
emails, product descriptions, job posts, proposal sections, ad copy.

Run:
  python examples/01_reflection_loop.py "Cold email to a dental clinic offering an AI receptionist"
  python examples/01_reflection_loop.py --diagram      # print the graph as Mermaid
"""

from __future__ import annotations

import sys
from typing import TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from common import ask, ask_structured, get_client, text_of

WRITER = (
    "You are a senior B2B copywriter. Write in plain, specific language. "
    "No hype words, no exclamation marks. Keep it short enough to read on a phone."
)
REVIEWER = (
    "You are a demanding editor. Score the draft from 1 to 10 against the task. "
    "A 9 or 10 means you would send it unchanged. Give concrete, line-level feedback."
)


class Review(BaseModel):
    score: int = Field(description="Quality from 1 (unusable) to 10 (send as-is)")
    feedback: str = Field(description="The specific changes that would raise the score")


class State(TypedDict, total=False):
    task: str
    draft: str
    score: int
    feedback: str
    rounds: int


def build_graph(client=None, *, target_score: int = 8, max_rounds: int = 3):
    client = client or get_client()

    def write(state: State) -> State:
        if state.get("draft"):
            prompt = (
                f"Task: {state['task']}\n\nYour previous draft:\n{state['draft']}\n\n"
                f"Editor feedback:\n{state['feedback']}\n\n"
                "Rewrite the draft so it addresses every point. Return only the new draft."
            )
        else:
            prompt = f"Task: {state['task']}\n\nReturn only the draft."
        response = ask(client, system=WRITER, messages=[{"role": "user", "content": prompt}])
        return {"draft": text_of(response), "rounds": state.get("rounds", 0) + 1}

    def review(state: State) -> State:
        result = ask_structured(
            client,
            system=REVIEWER,
            prompt=f"Task: {state['task']}\n\nDraft:\n{state['draft']}",
            schema=Review,
        )
        return {"score": result.score, "feedback": result.feedback}

    def route(state: State) -> str:
        if state["score"] >= target_score or state["rounds"] >= max_rounds:
            return "done"
        return "revise"

    graph = StateGraph(State)
    graph.add_node("write", write)
    graph.add_node("review", review)
    graph.add_edge(START, "write")
    graph.add_edge("write", "review")
    graph.add_conditional_edges("review", route, {"revise": "write", "done": END})
    return graph.compile()


if __name__ == "__main__":
    if "--diagram" in sys.argv:
        print(build_graph(client=object()).get_graph().draw_mermaid())
        sys.exit(0)

    task = " ".join(sys.argv[1:]) or "Cold email to a dental clinic offering an AI receptionist"
    final = build_graph().invoke({"task": task})
    print(f"--- after {final['rounds']} round(s), score {final['score']}/10 ---\n")
    print(final["draft"])
