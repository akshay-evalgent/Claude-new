"""05 - Ship it: serve the support-triage graph (example 03) as an HTTP API.

Clients don't buy a Python script. They buy something their helpdesk, Slack
bot or internal dashboard can call. This is the smallest version of that.

  POST /tickets                    run triage on a new ticket
  GET  /tickets/{ticket_id}        current status (done / pending_approval)
  POST /tickets/{ticket_id}/decision   approve or reject a paused refund

Each ticket_id is a LangGraph thread, so a refund can sit waiting for a manager
for hours and resume exactly where it stopped. Use SqliteSaver (below) or
PostgresSaver so that survives restarts and deploys.

Run:
  pip install fastapi uvicorn langgraph-checkpoint-sqlite
  python examples/05_serve_api.py            # then open http://localhost:8000/docs

Before a real deployment: put auth on /decision (only managers may approve),
add rate limits, and send the approval request to Slack or email.
"""

from __future__ import annotations

import importlib
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException
from langgraph.types import Command
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent))
triage = importlib.import_module("03_support_triage_hitl")


class TicketIn(BaseModel):
    ticket_id: str
    text: str


class Decision(BaseModel):
    approved: bool
    note: str = ""


def create_app(client=None, checkpointer=None) -> FastAPI:
    graph = triage.build_graph(client, checkpointer)
    app = FastAPI(title="Support triage agent")

    def config(ticket_id: str) -> dict:
        return {"configurable": {"thread_id": ticket_id}}

    def view(ticket_id: str) -> dict:
        snapshot = graph.get_state(config(ticket_id))
        if not snapshot.values:
            raise HTTPException(404, "unknown ticket")
        values = snapshot.values
        pending = [i.value for i in snapshot.interrupts]
        return {
            "ticket_id": ticket_id,
            "status": "pending_approval" if pending else "done",
            "approval_request": pending[0] if pending else None,
            "triage": values.get("triage"),
            "refund": values.get("refund_decision"),
            "reply": values.get("reply"),
        }

    @app.post("/tickets")
    def create_ticket(ticket: TicketIn) -> dict:
        if graph.get_state(config(ticket.ticket_id)).values:
            raise HTTPException(409, "ticket already exists")
        graph.invoke({"ticket": ticket.text}, config(ticket.ticket_id))
        return view(ticket.ticket_id)

    @app.get("/tickets/{ticket_id}")
    def get_ticket(ticket_id: str) -> dict:
        return view(ticket_id)

    @app.post("/tickets/{ticket_id}/decision")
    def decide(ticket_id: str, decision: Decision) -> dict:
        if view(ticket_id)["status"] != "pending_approval":
            raise HTTPException(409, "nothing is waiting for approval on this ticket")
        graph.invoke(Command(resume=decision.model_dump()), config(ticket_id))
        return view(ticket_id)

    return app


if __name__ == "__main__":
    import sqlite3

    import uvicorn
    from langgraph.checkpoint.sqlite import SqliteSaver

    # Tickets survive restarts: stop the server mid-approval, start it again, approve.
    saver = SqliteSaver(sqlite3.connect("tickets.db", check_same_thread=False))
    uvicorn.run(create_app(checkpointer=saver), host="127.0.0.1", port=8000)
