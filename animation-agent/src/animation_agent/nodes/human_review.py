"""Human review: pause the run until a person approves, edits, revises or rejects the digest.

Lesson: `interrupt(payload)` stops the graph, saves its state in the checkpoint, and hands
`payload` to whoever is running it. Nothing waits in memory: the process can exit, and the run
resumes hours later with `graph.invoke(Command(resume=answer), config)`. Then this node runs
*again from its first line*, and this time `interrupt()` returns `answer` instead of pausing.

Two rules follow from "runs again from its first line":

1. Keep a node that interrupts small, and put nothing expensive or with side effects before the
   `interrupt()` call. That is why drafting lives in the Reporter node, before this one: the
   approval does not pay for the draft twice.
2. Validate the answer like any other input. A bad answer loops back here and pauses again,
   with a note saying what was wrong.

The node routes by returning `Command(goto=..., update=...)`: a state update and the next node
in one return value, instead of a separate conditional edge.
"""
from __future__ import annotations

from langgraph.types import Command, interrupt
from pydantic import ValidationError

from ..schemas import ReviewAnswer
from ..state import RunState

MAX_DIGEST_REVISIONS = 3
ACTIONS = {
    "approve": "publish the digest as it is",
    "edit": "publish your own edited version: send it in 'text'",
    "revise": "ask the Reporter for a new draft: say what to change in 'feedback'",
    "reject": "publish nothing",
}


def human_review(state: RunState) -> Command:
    raw = interrupt({
        "run_id": state.get("run_id"),
        "round": state.get("digest_round", 1),
        "digest": state.get("digest", ""),
        "note": state.get("review_note"),
        "actions": ACTIONS,
    })
    try:
        answer = ReviewAnswer.model_validate(raw)
    except ValidationError as exc:
        reason = "; ".join(e["msg"] for e in exc.errors())
        return Command(goto="human_review", update={"review_note": f"That answer was not accepted: {reason}"})

    if answer.action == "revise":
        if state.get("digest_round", 1) > MAX_DIGEST_REVISIONS:
            return Command(goto="human_review", update={
                "review_note": f"The Reporter has already revised {MAX_DIGEST_REVISIONS} times. Approve, edit or reject."})
        return Command(goto="reporter", update={"digest_feedback": answer.feedback, "review_note": None})
    if answer.action == "edit":
        return Command(goto="publish", update={"digest": answer.text, "digest_status": "edited", "review_note": None})
    status = "approved" if answer.action == "approve" else "rejected"
    return Command(goto="publish", update={"digest_status": status, "review_note": None})
