"""Offline tests: every example graph runs end to end against a fake Claude client.

No API key and no network needed. They check the wiring (routing, loops, reducers,
parallel fan-out, interrupt/resume) and that what we send Claude is well formed.

    pytest langgraph-claude/tests -q
"""

from __future__ import annotations

import importlib.util
import sys
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest
from anthropic.types.beta import BetaTextBlock, BetaThinkingBlock, BetaToolUseBlock
from langgraph.types import Command

EXAMPLES = Path(__file__).resolve().parents[1] / "examples"
sys.path.insert(0, str(EXAMPLES))

import common  # noqa: E402


def load(name: str):
    spec = importlib.util.spec_from_file_location(name, EXAMPLES / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module  # LangGraph resolves the State type hints through sys.modules
    spec.loader.exec_module(module)
    return module


# ------------------------------------------------------------------ fake client
class FakeClient:
    """Stands in for anthropic.Anthropic(). `responder(kind, kwargs)` returns the reply."""

    def __init__(self, responder):
        self.calls: list[tuple[str, dict]] = []
        lock = threading.Lock()  # example 04 calls Claude from parallel branches

        def record(kind):
            def call(**kwargs):
                kwargs["messages"] = list(kwargs["messages"])  # snapshot: callers may append later
                with lock:
                    self.calls.append((kind, kwargs))
                return responder(kind, kwargs)
            return call

        self.beta = SimpleNamespace(messages=SimpleNamespace(create=record("create"), parse=record("parse")))

    def count(self, kind):
        return sum(1 for k, _ in self.calls if k == kind)


def reply(*blocks, stop_reason="end_turn"):
    return SimpleNamespace(content=list(blocks), stop_reason=stop_reason, stop_details=None)


def text(t):
    return BetaTextBlock(type="text", text=t)


def parsed(obj):
    return SimpleNamespace(stop_reason="end_turn", parsed_output=obj, stop_details=None)


# ------------------------------------------------------------------ common.py
def test_requests_use_default_model_effort_and_fallbacks():
    client = FakeClient(lambda kind, kw: reply(text("hi")))
    common.ask(client, system="s", messages=[{"role": "user", "content": "x"}])
    _, kw = client.calls[0]
    assert kw["model"] == "claude-opus-5-5"
    assert kw["output_config"] == {"effort": "medium"}
    assert kw["fallbacks"] == "default"
    assert kw["betas"] == ["server-side-fallback-2026-07-01"]
    assert "tools" not in kw


def test_haiku_skips_fallbacks():
    client = FakeClient(lambda kind, kw: reply(text("hi")))
    common.ask(client, system="s", messages=[{"role": "user", "content": "x"}], model="claude-haiku-5-5")
    assert "fallbacks" not in client.calls[0][1]


def test_refusal_raises():
    client = FakeClient(lambda kind, kw: reply(stop_reason="refusal"))
    with pytest.raises(common.ClaudeRefused):
        common.ask(client, system="s", messages=[{"role": "user", "content": "x"}])


def test_blocks_to_dicts_keeps_thinking_signature():
    blocks = [BetaThinkingBlock(type="thinking", thinking="", signature="sig-123"), text("ok")]
    assert common.blocks_to_dicts(blocks) == [
        {"type": "thinking", "thinking": "", "signature": "sig-123"},
        {"type": "text", "text": "ok"},
    ]


# ------------------------------------------------------------------ 01 reflection loop
def test_reflection_loop_revises_until_target_score():
    ex = load("01_reflection_loop")
    scores = iter([5, 9])

    def responder(kind, kw):
        if kind == "parse":
            return parsed(ex.Review(score=next(scores), feedback="Cut the first line."))
        return reply(text(f"draft v{sum(1 for k, _ in client.calls if k == 'create')}"))

    client = FakeClient(responder)
    result = ex.build_graph(client).invoke({"task": "cold email"})
    assert result["rounds"] == 2 and result["score"] == 9 and result["draft"] == "draft v2"
    revise_prompt = [kw for k, kw in client.calls if k == "create"][1]["messages"][0]["content"]
    assert "Cut the first line." in revise_prompt and "draft v1" in revise_prompt


def test_reflection_loop_stops_at_max_rounds():
    ex = load("01_reflection_loop")
    client = FakeClient(
        lambda kind, kw: parsed(ex.Review(score=3, feedback="meh")) if kind == "parse" else reply(text("d"))
    )
    result = ex.build_graph(client, max_rounds=3).invoke({"task": "t"})
    assert result["rounds"] == 3 and client.count("parse") == 3


def test_reflection_graph_renders():
    ex = load("01_reflection_loop")
    assert "review" in ex.build_graph(client=object()).get_graph().draw_mermaid()


# ------------------------------------------------------------------ 02 tool agent
def test_tool_agent_runs_parallel_tools_and_recovers_from_errors():
    ex = load("02_tool_agent")
    script = iter([
        reply(
            BetaThinkingBlock(type="thinking", thinking="", signature="sig-1"),
            BetaToolUseBlock(type="tool_use", id="t1", name="get_order", input={"order_id": "A-1002"}),
            BetaToolUseBlock(type="tool_use", id="t2", name="get_order", input={"order_id": "NOPE"}),
            stop_reason="tool_use",
        ),
        reply(
            BetaToolUseBlock(type="tool_use", id="t3", name="track_shipment", input={"tracking_id": "TRK-777"}),
            stop_reason="tool_use",
        ),
        reply(text("Your order ships via DHL and arrives 2026-11-09.")),
    ])
    client = FakeClient(lambda kind, kw: next(script))
    result = ex.build_graph(client).invoke({"messages": [{"role": "user", "content": "Where is A-1002?"}]})

    assert ex.final_answer(result) == "Your order ships via DHL and arrives 2026-11-09."
    assert result["steps"] == 3

    second_call = client.calls[1][1]["messages"]
    # assistant turn sent back unchanged, thinking signature included
    assert second_call[1]["content"][0] == {"type": "thinking", "thinking": "", "signature": "sig-1"}
    # both tool results in ONE user message, the bad id flagged as an error
    results = second_call[2]["content"]
    assert [r["tool_use_id"] for r in results] == ["t1", "t2"]
    assert "is_error" not in results[0] and "TRK-777" in results[0]["content"]
    assert results[1]["is_error"] is True
    assert all(t["strict"] for t in client.calls[0][1]["tools"])


def test_tool_agent_step_limit():
    ex = load("02_tool_agent")
    loop_forever = lambda kind, kw: reply(  # noqa: E731
        BetaToolUseBlock(type="tool_use", id="t", name="get_policy", input={"topic": "returns"}),
        stop_reason="tool_use",
    )
    client = FakeClient(loop_forever)
    result = ex.build_graph(client, max_steps=4).invoke({"messages": [{"role": "user", "content": "?"}]})
    assert result["steps"] == 4 and client.count("create") == 4


# ------------------------------------------------------------------ 03 triage + human in the loop
def triage_client(ex, category, amount=0.0):
    def responder(kind, kw):
        if kind == "parse":
            return parsed(ex.Triage(category=category, urgency="normal", summary="s",
                                    order_id="INV-1", refund_amount=amount))
        return reply(text(f"reply from: {kw['system'][:20]}"))
    return FakeClient(responder)


def test_triage_routes_non_refund_to_specialist():
    ex = load("03_support_triage_hitl")
    client = triage_client(ex, "technical")
    result = ex.build_graph(client).invoke({"ticket": "app crashes"}, {"configurable": {"thread_id": "a"}})
    assert "__interrupt__" not in result
    assert client.calls[1][1]["system"] == ex.SPECIALISTS["technical"]


def test_small_refund_is_auto_approved():
    ex = load("03_support_triage_hitl")
    result = ex.build_graph(triage_client(ex, "refund", 20.0)).invoke(
        {"ticket": "refund $20"}, {"configurable": {"thread_id": "b"}}
    )
    assert "__interrupt__" not in result
    assert result["refund_decision"]["by"] == "auto" and result["refund_decision"]["refund_id"].startswith("re_")


@pytest.mark.parametrize("approved", [True, False])
def test_large_refund_pauses_for_human_then_resumes(approved):
    ex = load("03_support_triage_hitl")
    client = triage_client(ex, "refund", 240.0)
    graph = ex.build_graph(client)
    config = {"configurable": {"thread_id": f"c-{approved}"}}

    paused = graph.invoke({"ticket": "refund $240"}, config)
    assert paused["__interrupt__"][0].value["amount"] == 240.0
    assert "reply" not in paused  # nothing sent to the customer yet

    done = graph.invoke(Command(resume={"approved": approved, "note": "annual plan used"}), config)
    assert done["refund_decision"]["by"] == "human"
    assert ("refund_id" in done["refund_decision"]) is approved
    assert done["reply"].startswith("reply from")


# ------------------------------------------------------------------ 04 parallel lead research
def lead_responder(ex, pause_once):
    paused = set()
    lock = threading.Lock()

    def responder(kind, kw):
        if kind == "parse":
            company = kw["messages"][0]["content"].split("Company: ")[1].split("\n")[0]
            return parsed(ex.LeadScore(fit_score=len(company) % 10, pain_points=["p"], opener="o"))
        if kw.get("tools"):  # web research call
            key = kw["messages"][0]["content"]
            with lock:
                first_time = key not in paused
                paused.add(key)
            if pause_once and first_time:
                return reply(text("searching..."), stop_reason="pause_turn")
            return reply(text("- found facts"))
        return reply(text("Call Northwind first."))

    return responder


@pytest.mark.parametrize("use_web", [False, True])
def test_lead_research_fans_out_and_ranks(use_web):
    ex = load("04_lead_research_parallel")
    client = FakeClient(lead_responder(ex, pause_once=use_web))
    result = ex.build_graph(client).invoke({"leads": ex.LEADS, "use_web": use_web})

    assert sorted(r["company"] for r in result["results"]) == sorted(l["company"] for l in ex.LEADS)
    assert result["shortlist"] == "Call Northwind first."
    assert client.count("parse") == len(ex.LEADS)
    web_calls = [kw for k, kw in client.calls if k == "create" and kw.get("tools")]
    # with --web each lead pauses once, so 2 web calls per lead
    assert len(web_calls) == (2 * len(ex.LEADS) if use_web else 0)
    if use_web:
        resumed = [kw for kw in web_calls if len(kw["messages"]) == 2]
        assert resumed and resumed[0]["messages"][1]["role"] == "assistant"


# ------------------------------------------------------------------ 05 HTTP API
def test_api_pauses_for_approval_and_survives_a_restart(tmp_path):
    sqlite3 = pytest.importorskip("sqlite3")
    pytest.importorskip("fastapi")
    from fastapi.testclient import TestClient
    from langgraph.checkpoint.sqlite import SqliteSaver

    ex3 = load("03_support_triage_hitl")
    api = load("05_serve_api")
    db = tmp_path / "tickets.db"

    def server():
        saver = SqliteSaver(sqlite3.connect(db, check_same_thread=False))
        return TestClient(api.create_app(triage_client(ex3, "refund", 240.0), saver))

    first = server()
    created = first.post("/tickets", json={"ticket_id": "T-1", "text": "refund my $240"}).json()
    assert created["status"] == "pending_approval" and created["approval_request"]["amount"] == 240.0
    assert first.post("/tickets", json={"ticket_id": "T-1", "text": "again"}).status_code == 409

    second = server()  # brand-new process, same database: the paused ticket is still there
    assert second.get("/tickets/T-1").json()["status"] == "pending_approval"
    done = second.post("/tickets/T-1/decision", json={"approved": True}).json()
    assert done["status"] == "done" and done["refund"]["refund_id"].startswith("re_") and done["reply"]
    assert second.post("/tickets/T-1/decision", json={"approved": True}).status_code == 409
    assert second.get("/tickets/NOPE").status_code == 404
