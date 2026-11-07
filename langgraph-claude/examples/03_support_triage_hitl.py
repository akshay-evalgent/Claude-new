"""03 - Support triage with routing, human approval and memory.

This is the pattern companies actually pay for: Claude does the work, a person
approves anything risky, and nothing is lost if the server restarts mid-flow.

Concepts you learn here
  * Structured classification (Pydantic -> guaranteed JSON) to drive routing
  * Routing to specialist nodes with conditional edges
  * Human-in-the-loop: `interrupt()` pauses the graph and waits for a person
  * `Command(resume=...)` continues the paused run with the person's decision
  * Checkpointers + thread_id: each ticket's state is saved and resumable
    (InMemorySaver here; SqliteSaver or PostgresSaver in production)

Flow:
  classify ─┬─ refund ──> propose_refund ──> human_approval ──> issue_refund ─┐
            ├─ billing ─┐                                     └─(rejected)───┤
            ├─ technical┼──> answer ─────────────────────────────────────────┼──> END
            └─ other ───┘                                                    │
                                                          write_reply <──────┘

Run (interactive, you play the human approver):
  python examples/03_support_triage_hitl.py
"""

from __future__ import annotations

import uuid
from typing import Literal, TypedDict

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel, Field

from common import ask, ask_structured, get_client, text_of

AUTO_APPROVE_LIMIT = 50.0  # refunds at or under this go through without a person


class Triage(BaseModel):
    category: Literal["refund", "billing", "technical", "other"]
    urgency: Literal["low", "normal", "high"]
    summary: str = Field(description="One sentence a support lead can scan")
    order_id: str = Field(description="Order id if mentioned, else empty string")
    refund_amount: float = Field(description="Amount the customer wants back, 0 if not stated")


class State(TypedDict, total=False):
    ticket: str
    triage: dict
    refund_decision: dict
    reply: str


SPECIALISTS = {
    "billing": "You are a billing specialist. Explain charges clearly and give the next step.",
    "technical": "You are a patient technical support engineer. Give numbered troubleshooting steps.",
    "other": "You are a friendly support generalist. Answer briefly or say who will follow up.",
}


def build_graph(client=None, checkpointer=None):
    client = client or get_client()

    def classify(state: State) -> State:
        triage = ask_structured(
            client,
            system="You triage customer support tickets for a SaaS company.",
            prompt=state["ticket"],
            schema=Triage,
        )
        return {"triage": triage.model_dump()}

    def route(state: State) -> str:
        return "propose_refund" if state["triage"]["category"] == "refund" else "answer"

    def answer(state: State) -> State:
        system = SPECIALISTS[state["triage"]["category"]]
        response = ask(client, system=system, messages=[{"role": "user", "content": state["ticket"]}])
        return {"reply": text_of(response)}

    def propose_refund(state: State) -> Command:
        amount = state["triage"]["refund_amount"]
        if amount <= AUTO_APPROVE_LIMIT:
            return Command(
                update={"refund_decision": {"approved": True, "by": "auto", "amount": amount}},
                goto="issue_refund",
            )
        return Command(goto="human_approval")

    def human_approval(state: State) -> State:
        # Execution stops here. The value passed to interrupt() is shown to the
        # approver (Slack message, dashboard, email...). The graph resumes when
        # someone calls graph.invoke(Command(resume=<decision>), config).
        decision = interrupt(
            {
                "question": "Approve this refund?",
                "order_id": state["triage"]["order_id"],
                "amount": state["triage"]["refund_amount"],
                "summary": state["triage"]["summary"],
            }
        )
        return {"refund_decision": {**decision, "by": "human"}}

    def after_approval(state: State) -> str:
        return "issue_refund" if state["refund_decision"].get("approved") else "write_reply"

    def issue_refund(state: State) -> State:
        # In a client project: call Stripe / Shopify / the billing system here.
        decision = state["refund_decision"]
        amount = decision.get("amount", state["triage"]["refund_amount"])
        return {"refund_decision": {**decision, "amount": amount, "refund_id": f"re_{uuid.uuid4().hex[:8]}"}}

    def write_reply(state: State) -> State:
        decision = state["refund_decision"]
        facts = (
            f"Refund approved: {decision.get('approved')}. "
            f"Amount: {decision.get('amount', state['triage']['refund_amount'])}. "
            f"Refund id: {decision.get('refund_id', 'n/a')}. "
            f"Reviewer note: {decision.get('note', 'none')}."
        )
        response = ask(
            client,
            system="You write short, warm customer support replies. Only state the facts you are given.",
            messages=[{"role": "user", "content": f"Ticket:\n{state['ticket']}\n\nFacts:\n{facts}"}],
        )
        return {"reply": text_of(response)}

    graph = StateGraph(State)
    graph.add_node("classify", classify)
    graph.add_node("answer", answer)
    graph.add_node("propose_refund", propose_refund, destinations=("issue_refund", "human_approval"))
    graph.add_node("human_approval", human_approval)
    graph.add_node("issue_refund", issue_refund)
    graph.add_node("write_reply", write_reply)

    graph.add_edge(START, "classify")
    graph.add_conditional_edges("classify", route, {"propose_refund": "propose_refund", "answer": "answer"})
    graph.add_conditional_edges(
        "human_approval", after_approval, {"issue_refund": "issue_refund", "write_reply": "write_reply"}
    )
    graph.add_edge("issue_refund", "write_reply")
    graph.add_edge("answer", END)
    graph.add_edge("write_reply", END)
    # A checkpointer is REQUIRED for interrupt(); it is what makes pausing possible.
    return graph.compile(checkpointer=checkpointer or InMemorySaver())


if __name__ == "__main__":
    graph = build_graph()
    ticket = (
        "Hi, I was charged $240 for the annual plan yesterday but I meant to pick monthly. "
        "Order INV-8812. Can I get the money back? I haven't used any annual features."
    )
    config = {"configurable": {"thread_id": "ticket-8812"}}  # one thread per ticket

    result = graph.invoke({"ticket": ticket}, config)
    print("Triage:", result["triage"])

    if "__interrupt__" in result:
        request = result["__interrupt__"][0].value
        print(f"\nAPPROVAL NEEDED: refund ${request['amount']} on {request['order_id']}")
        print(f"  {request['summary']}")
        approved = input("Approve? [y/N] ").strip().lower() == "y"
        note = "" if approved else input("Reason for the customer: ")
        result = graph.invoke(Command(resume={"approved": approved, "note": note}), config)

    print("\nReply to customer:\n" + result["reply"])
