"""Triage: model judgement plus arithmetic, and the conditional fan-out edge."""
from langgraph.types import Send

from animation_agent import llm
from animation_agent.nodes.triage import describe, make_triage, route_after_triage, viral_scores

from fakes import cand, judge, scripted


def test_viral_score_rewards_momentum_and_breakout():
    big_channel = cand("big", 100_000, 10, followers=10_000_000).with_metrics()
    small_channel = cand("small", 100_000, 10, followers=1_000).with_metrics()       # same momentum, outgrew its channel
    slow = cand("slow", 1_000, 10, followers=50_000).with_metrics()
    scores = viral_scores([big_channel, small_channel, slow])
    assert scores["small"] > scores["big"] > scores["slow"]
    assert scores["small"] == 4.38                  # top breakout, tied top momentum


def test_triage_prompt_leaves_out_views():
    line = describe(cand("a", 123_456, 1, title="Clay loop").with_metrics())
    assert "[a]" in line and "Clay loop" in line and "123" not in line


def test_selection_rules():
    cands = [cand(v, 1_000 * (i + 1), 2).with_metrics() for i, v in enumerate("abcde")]
    decide = make_triage(judge=judge({"a": (True, 5), "b": (False, 5), "c": (True, 1), "d": (True, 3)}))  # no "e"
    out = decide({"candidates": cands, "max_cards": 2})
    by_id = {d.video_id: d for d in out["triage"]}
    assert [c.video_id for c in out["selected"]] == ["a", "d"]           # b not animation, c too dull
    assert by_id["e"].reason.startswith("Triage returned no decision") and not by_id["e"].selected
    assert by_id["a"].priority == round(0.7 * 5 + 0.3 * by_id["a"].viral_score, 2)
    assert by_id["a"].viral_score < by_id["d"].viral_score          # a wins on craft, not popularity


def test_model_failure_falls_back_to_popularity():
    cands = [cand("slow", 1_000, 10).with_metrics(), cand("fast", 90_000, 1).with_metrics()]
    out = make_triage(judge=scripted(RuntimeError("overloaded")))({"candidates": cands, "max_cards": 1})
    assert [c.video_id for c in out["selected"]] == ["fast"]
    assert "ranked by popularity only" in out["errors"][0]


def test_no_candidates_means_no_model_call():
    never = scripted(AssertionError("should not be called"))
    assert make_triage(judge=never)({"candidates": []}) == {"triage": [], "selected": []} and never.calls == []


def test_route_fans_out_one_send_per_selected_candidate():
    picks = [cand("a", 1, 1), cand("b", 1, 1)]
    sends = route_after_triage({"selected": picks})
    assert all(isinstance(s, Send) and s.node == "analyze" for s in sends)
    assert [s.arg["candidate"].video_id for s in sends] == ["a", "b"]
    assert route_after_triage({"selected": []}) == "librarian"


def test_triage_role_gets_the_cheap_model(monkeypatch):
    monkeypatch.setattr(llm.settings, "llm_provider", "claude-code")
    monkeypatch.setattr(llm.settings, "llm_model", "claude-opus-5-5")
    monkeypatch.setattr(llm.settings, "llm_model_triage", "claude-haiku-5-5")
    assert llm.get_model("triage").model == "claude-haiku-5-5"
    assert llm.get_model("critic").model == "claude-opus-5-5"
