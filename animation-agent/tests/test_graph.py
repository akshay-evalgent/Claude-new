"""The main graph end to end: fake YouTube, fake models, temp database. No network."""
import threading
from datetime import date

from animation_agent.graph import build_graph
from animation_agent.nodes import build_card_graph, make_librarian, make_scout, make_triage
from animation_agent.nodes.analyst import source_material
from animation_agent.nodes.scout import default_queries
from animation_agent.schemas import Comment
from animation_agent.storage import CardStore

from fakes import DECISIONS, TODAY, approve, cand, card, comments_ok, fake_fetch, fake_search, judge, scripted


def build(tmp_path, decisions=DECISIONS, analyst=None, critic=None):
    return build_graph(
        scout=make_scout(search=fake_search, fetch=fake_fetch),
        triage=make_triage(judge=judge(decisions)),
        analyze=build_card_graph(analyst_chain=analyst or scripted(card()), critic_chain=critic or scripted(approve()),
                                 comments=comments_ok),
        librarian=make_librarian(db_path=tmp_path / "test.db"),
        with_digest=False,
    )


def test_graph_shape():
    g = build_graph(scout=lambda s: {}, triage=lambda s: {}, librarian=lambda s: {}, with_digest=False).get_graph()
    edges = {(e.source, e.target, e.conditional) for e in g.edges}
    assert ("triage", "analyze", True) in edges and ("triage", "librarian", True) in edges
    assert ("scout", "triage", False) in edges and ("analyze", "librarian", False) in edges


def test_end_to_end(tmp_path):
    final = build(tmp_path).invoke({"queries": ["clay", "loop", "broken"], "max_cards": 3})

    # Scout dedupes across queries and records failures instead of raising.
    assert {c.video_id for c in final["candidates"]} == {"a", "b", "d"}
    # Triage drops the non-animation video even though it is the most viewed.
    assert [c.video_id for c in final["selected"]] == ["a", "d"]
    assert {d.video_id: d.selected for d in final["triage"]} == {"a": True, "b": False, "d": True}

    # Two parallel pipelines, merged by the append reducers.
    assert sorted(c.id for c in final["cards"]) == ["youtube:a", "youtube:d"]
    assert len(final["reviews"]) == 2 and all(r.approved for r in final["reviews"])

    # Facts come from the tools; confidence comes from the Critic.
    a = next(c for c in final["cards"] if c.id == "youtube:a")
    assert a.title == "video a" and a.source_urls == ["https://www.youtube.com/watch?v=a"]
    assert a.virality.likes == 500 and a.confidence == 0.55

    errs = "\n".join(final["errors"])
    assert "scout: search 'broken' failed" in errs and "scout: stats for c failed" in errs

    store = CardStore(tmp_path / "test.db")
    assert {r["id"]: r["approved"] for r in store.list_cards()} == {"youtube:a": 1, "youtube:d": 1}
    assert store.get_review("youtube:a")["rounds"] == 1
    assert 'Video: "video a"' in store.get_source("youtube:a")              # frozen input for evals


def test_card_pipelines_run_in_parallel(tmp_path):
    barrier = threading.Barrier(2, timeout=10)      # opens only if both pipelines arrive together

    def wait_then_answer(inp):
        barrier.wait()
        return card()

    final = build(tmp_path, analyst=scripted(wait_then_answer)).invoke({"queries": ["clay"], "max_cards": 2})
    assert len(final["cards"]) == 2, final["errors"]


def test_nothing_selected_goes_straight_to_librarian(tmp_path):
    never = scripted(AssertionError("the analyst must not run"))
    final = build(tmp_path, decisions={"a": (False, 0), "b": (False, 0), "d": (True, 1)}, analyst=never).invoke(
        {"queries": ["clay"]})
    assert final["selected"] == [] and final.get("cards", []) == [] and never.calls == []
    assert CardStore(tmp_path / "test.db").runs()[0]["candidates"] == 3


def test_one_failed_card_does_not_sink_the_run(tmp_path):
    analyst = scripted(lambda inp: card() if "video a" in inp["source"] else (_ for _ in ()).throw(ValueError("bad JSON")))
    final = build(tmp_path, analyst=analyst).invoke({"queries": ["clay"], "max_cards": 2})
    assert [c.id for c in final["cards"]] == ["youtube:a"]
    assert any("draft 1 for d failed: ValueError" in e for e in final["errors"])


def test_rerun_updates_instead_of_duplicating(tmp_path):
    store = CardStore(tmp_path / "x.db")
    c = card().model_copy(update={"id": "youtube:a", "first_seen": date(2026, 1, 1), "last_updated": date(2026, 1, 1)})
    store.upsert_card(c, "run1")
    store.upsert_card(c.model_copy(update={"confidence": 0.9, "first_seen": TODAY, "last_updated": TODAY}), "run2")
    rows = store.list_cards()
    assert len(rows) == 1 and rows[0]["confidence"] == 0.9
    saved = store.get_card("youtube:a")
    assert saved.first_seen == date(2026, 1, 1) and saved.last_updated == TODAY


def test_source_material_states_what_is_missing():
    text = source_material(cand("a", 10_000, 1).with_metrics(), [Comment(text="so smooth", likes=5, by_creator=True)])
    assert '- "so smooth" (5 likes, by the creator)' in text
    assert "views per day 10000.0" in text and "Not available: video frames" in text
    assert "No viewer comments" in source_material(cand("a", 1, 1), [])


def test_default_queries_come_from_sources_yaml():
    assert "motion design" in default_queries()
