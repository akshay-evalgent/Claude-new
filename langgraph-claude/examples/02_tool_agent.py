"""02 - A tool-using agent, built by hand as a graph.

Concepts you learn here
  * Reducers  - `Annotated[list, operator.add]` makes nodes APPEND to the message
                history instead of overwriting it
  * The agent loop as a graph: agent -> tools -> agent -> ... -> END
  * Tool definitions with `strict: True`, so arguments always match the schema
  * Parallel tool calls: run every tool_use block, return ALL results in one message
  * Tool errors go back to Claude as `is_error` results, so it can recover
  * A step limit, so a confused agent can't loop forever

Business use: support agents that look up orders, CRM assistants, internal
"ask our database" bots, booking assistants. The tools below use a fake
in-memory store; in a client project they call the client's real API.

Run:
  python examples/02_tool_agent.py "Where is order A-1002 and when will it arrive?"
"""

from __future__ import annotations

import json
import operator
import sys
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph

from common import ask, blocks_to_dicts, get_client

# ---------------------------------------------------------------- fake business data
ORDERS = {
    "A-1001": {"status": "delivered", "items": ["Standing desk"], "tracking": "TRK-555", "total": 499.0},
    "A-1002": {"status": "shipped", "items": ["Monitor arm", "USB-C dock"], "tracking": "TRK-777", "total": 189.0},
}
SHIPMENTS = {
    "TRK-555": {"carrier": "UPS", "eta": "delivered 2026-10-30"},
    "TRK-777": {"carrier": "DHL", "eta": "2026-11-09", "last_scan": "Frankfurt hub"},
}
POLICIES = {
    "returns": "Returns are accepted within 30 days of delivery. Items must be unused.",
    "shipping": "Standard shipping takes 3-5 business days. Express takes 1-2.",
    "warranty": "Furniture has a 5-year warranty. Electronics have 1 year.",
}


def get_order(order_id: str) -> dict:
    if order_id not in ORDERS:
        raise KeyError(f"No order with id {order_id}. Ask the customer to double-check it.")
    return ORDERS[order_id]


def track_shipment(tracking_id: str) -> dict:
    if tracking_id not in SHIPMENTS:
        raise KeyError(f"Unknown tracking id {tracking_id}.")
    return SHIPMENTS[tracking_id]


def get_policy(topic: str) -> str:
    return POLICIES[topic]


TOOL_FUNCTIONS = {"get_order": get_order, "track_shipment": track_shipment, "get_policy": get_policy}

TOOLS = [
    {
        "name": "get_order",
        "description": "Look up an order by its id (format A-1234). Returns status, items, tracking id and total.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"order_id": {"type": "string"}},
            "required": ["order_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "track_shipment",
        "description": "Get carrier, ETA and last scan for a tracking id from get_order.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"tracking_id": {"type": "string"}},
            "required": ["tracking_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_policy",
        "description": "Read the official store policy on a topic. Use it instead of guessing policy.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"topic": {"type": "string", "enum": sorted(POLICIES)}},
            "required": ["topic"],
            "additionalProperties": False,
        },
    },
]

SYSTEM = (
    "You are the customer support agent for Deskly, an online office furniture store. "
    "Use the tools to look up real data; never invent order details or policy. "
    "Answer in 2-4 friendly sentences."
)


# ---------------------------------------------------------------- the graph
class State(TypedDict, total=False):
    messages: Annotated[list[dict], operator.add]  # reducer: updates are appended
    stop_reason: str
    steps: int


def build_graph(client=None, *, max_steps: int = 8):
    client = client or get_client()

    def agent(state: State) -> State:
        response = ask(client, system=SYSTEM, messages=state["messages"], tools=TOOLS)
        return {
            # keep the FULL content (thinking + tool_use blocks), not just the text
            "messages": [{"role": "assistant", "content": blocks_to_dicts(response.content)}],
            "stop_reason": response.stop_reason,
            "steps": state.get("steps", 0) + 1,
        }

    def tools(state: State) -> State:
        last = state["messages"][-1]
        results = []
        for block in last["content"]:
            if block["type"] != "tool_use":
                continue
            try:
                output = TOOL_FUNCTIONS[block["name"]](**block["input"])
                results.append(
                    {"type": "tool_result", "tool_use_id": block["id"], "content": json.dumps(output)}
                )
            except Exception as exc:  # the model sees the error and can recover
                results.append(
                    {"type": "tool_result", "tool_use_id": block["id"], "content": str(exc), "is_error": True}
                )
        # all results go back in ONE user message
        return {"messages": [{"role": "user", "content": results}]}

    def route(state: State) -> str:
        if state["stop_reason"] == "tool_use" and state["steps"] < max_steps:
            return "tools"
        return "end"

    graph = StateGraph(State)
    graph.add_node("agent", agent)
    graph.add_node("tools", tools)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", route, {"tools": "tools", "end": END})
    graph.add_edge("tools", "agent")
    return graph.compile()


def final_answer(state: State) -> str:
    last = state["messages"][-1]
    return "".join(b.get("text", "") for b in last["content"] if b["type"] == "text").strip()


if __name__ == "__main__":
    question = " ".join(sys.argv[1:]) or "Where is order A-1002 and when will it arrive?"
    result = build_graph().invoke({"messages": [{"role": "user", "content": question}]})
    print(final_answer(result))
    print(f"\n({result['steps']} model calls)")
