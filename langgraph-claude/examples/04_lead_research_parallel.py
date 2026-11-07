"""04 - Research many leads in parallel, then rank them (map-reduce).

Concepts you learn here
  * `Send` - fan out: start one copy of a node per item, all running in parallel
  * A reducer (`operator.add`) to gather every parallel result into one list
  * A "reduce" node that runs once, after all the parallel work is done
  * Optional live web research with Claude's server-side web search tool,
    including the `pause_turn` stop reason that long server-tool turns can return

Business use: sales prospecting, vendor due diligence, candidate screening,
competitor monitoring, grant/RFP matching. Anything shaped like "do the same
analysis on N things, then give me the shortlist".

Run:
  python examples/04_lead_research_parallel.py           # uses the notes below
  python examples/04_lead_research_parallel.py --web     # also searches the web
"""

from __future__ import annotations

import operator
import sys
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send
from pydantic import BaseModel, Field

from common import ask, ask_structured, blocks_to_dicts, get_client, text_of

OFFER = (
    "We build AI agents (on Claude + LangGraph) that take over repetitive support and "
    "back-office work for 20-500 person companies. Typical project: $8k-$25k, live in 4 weeks."
)

LEADS = [
    {"company": "Brightsmile Dental Group", "notes": "12 clinics, hiring 3 receptionists, phone booking only, reviews mention long hold times."},
    {"company": "Northwind Freight", "notes": "Mid-size 3PL. Job posts for 'data entry - bills of lading'. Uses email + spreadsheets for quotes."},
    {"company": "Pixel & Pine Studio", "notes": "4-person design studio, no support team, happy clients, no growth plans mentioned."},
]

WEB_SEARCH_TOOL = {"type": "web_search_20260209", "name": "web_search", "max_uses": 3}


class LeadScore(BaseModel):
    fit_score: int = Field(description="1-10 fit with our offer")
    pain_points: list[str] = Field(description="Concrete problems we could solve, from the evidence")
    opener: str = Field(description="A 2-sentence personalised cold email opener referencing the evidence")


class State(TypedDict, total=False):
    leads: list[dict]
    use_web: bool
    results: Annotated[list[dict], operator.add]  # every parallel branch appends here
    shortlist: str


class LeadState(TypedDict):
    lead: dict
    use_web: bool


def build_graph(client=None):
    client = client or get_client()

    def fan_out(state: State) -> list[Send]:
        # One Send per lead -> LangGraph runs research_lead for all of them in parallel.
        return [Send("research_lead", {"lead": lead, "use_web": state.get("use_web", False)}) for lead in state["leads"]]

    def research_lead(state: LeadState) -> State:
        lead = state["lead"]
        evidence = lead["notes"]

        if state["use_web"]:
            messages = [{
                "role": "user",
                "content": f"Find recent, concrete facts about {lead['company']} relevant to this offer:\n{OFFER}\n"
                           "Summarise what you found in bullet points with sources.",
            }]
            response = ask(client, system="You are a B2B sales researcher.", messages=messages, tools=[WEB_SEARCH_TOOL])
            # Long server-tool turns can pause; send the turn back to let Claude continue.
            for _ in range(3):
                if response.stop_reason != "pause_turn":
                    break
                messages.append({"role": "assistant", "content": blocks_to_dicts(response.content)})
                response = ask(client, system="You are a B2B sales researcher.", messages=messages, tools=[WEB_SEARCH_TOOL])
            evidence += "\n\nWeb research:\n" + text_of(response)

        score = ask_structured(
            client,
            system="You qualify B2B leads honestly. A low score is a useful answer.",
            prompt=f"Our offer:\n{OFFER}\n\nCompany: {lead['company']}\nEvidence:\n{evidence}",
            schema=LeadScore,
        )
        return {"results": [{"company": lead["company"], **score.model_dump()}]}

    def rank(state: State) -> State:
        ranked = sorted(state["results"], key=lambda r: r["fit_score"], reverse=True)
        table = "\n".join(f"- {r['company']} ({r['fit_score']}/10): {'; '.join(r['pain_points'])}" for r in ranked)
        response = ask(
            client,
            system="You are a sales lead. Be decisive and brief.",
            messages=[{"role": "user", "content": f"Scored leads:\n{table}\n\nWhich 1-2 should we contact this week, and why? 5 lines max."}],
            effort="low",
        )
        return {"shortlist": text_of(response)}

    graph = StateGraph(State)
    graph.add_node("research_lead", research_lead)
    graph.add_node("rank", rank)
    graph.add_conditional_edges(START, fan_out, ["research_lead"])
    graph.add_edge("research_lead", "rank")  # rank waits for every parallel branch
    graph.add_edge("rank", END)
    return graph.compile()


if __name__ == "__main__":
    result = build_graph().invoke({"leads": LEADS, "use_web": "--web" in sys.argv})
    for r in sorted(result["results"], key=lambda r: r["fit_score"], reverse=True):
        print(f"\n{r['company']}: {r['fit_score']}/10")
        print(f"  Opener: {r['opener']}")
    print("\nThis week:\n" + result["shortlist"])
