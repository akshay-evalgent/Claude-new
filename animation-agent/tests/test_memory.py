"""Long-term memory: a video analysed or skipped once is not paid for again. No network."""
from datetime import date, timedelta

from animation_agent.graph import build_graph
from animation_agent.memory import (SKIP_MEMORY_DAYS, VIDEOS, backfill_from_cards, is_settled, open_memory,
                                    remember_run)
from animation_agent.nodes import build_card_graph, make_librarian, make_scout, make_triage
from animation_agent.schemas import Review, TriageDecision

from fakes import DECISIONS, approve, card, comments_ok, fake_fetch, fake_search, judge, scripted


def recording_fetch(log):
    def fetch(ids):
        log.append(list(ids))
        return fake_fetch(ids)
    return fetch


def graph(tmp_path, cp, store, fetched, analyst=None):
    return build_graph(
        scout=make_scout(search=fake_search, fetch=recording_fetch(fetched)),
        triage=make_triage(judge=judge(DECISIONS)),
        analyze=build_card_graph(analyst_chain=analyst or scripted(card()), critic_chain=scripted(approve()),
                                 comments=comments_ok),
        librarian=make_librarian(db_path=tmp_path / "anim.db"),
        with_digest=False, checkpointer=cp, store=store,
    )


def run(g, thread, **inputs):
    return g.invoke({"queries": ["clay"], "max_cards": 3, "run_id": thread, **inputs},
                    {"configurable": {"thread_id": thread}})


def test_second_run_skips_what_memory_knows(tmp_path):
    fetched = []
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = graph(tmp_path, cp, store, fetched)
        first = run(g, "run1")
        assert sorted(c.id for c in first["cards"]) == ["youtube:a", "youtube:d"]
        assert store.get(VIDEOS, "youtube:b").value["status"] == "skipped"      # Triage said not animation

        second = run(g, "run2")
        assert sorted(second["already_seen"]) == ["youtube:a", "youtube:b", "youtube:d"]
        assert second["candidates"] == [] and second.get("cards", []) == []
        assert fetched[1] == []                         # no stats paid for known videos

        third = run(g, "run3", include_seen=True)
        assert len(third["candidates"]) == 3 and third["already_seen"] == []


def test_skips_expire_but_analysed_videos_do_not(tmp_path):
    old = (date.today() - timedelta(days=SKIP_MEMORY_DAYS + 1)).isoformat()
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        store.put(VIDEOS, "youtube:b", {"status": "skipped", "on": old})
        store.put(VIDEOS, "youtube:a", {"status": "analysed", "on": old})
        out = run(graph(tmp_path, cp, store, []), "run1")
    assert out["already_seen"] == ["youtube:a"]
    assert {c.video_id for c in out["candidates"]} == {"b", "d"}


def test_failed_cards_are_not_remembered(tmp_path):
    analyst = scripted(lambda inp: card() if "video a" in inp["source"] else (_ for _ in ()).throw(ValueError("x")))
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        run(graph(tmp_path, cp, store, [], analyst=analyst), "run1")
        assert store.get(VIDEOS, "youtube:a").value["status"] == "analysed"
        assert store.get(VIDEOS, "youtube:d") is None   # selected, no card: try again next run


def test_a_later_skip_never_downgrades_an_analysed_video(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (_, store):
        c = card().model_copy(update={"id": "youtube:a"})
        remember_run(store, "r1", [c], [Review(card_id="youtube:a", rounds=1, approved=True)], [])
        skip = TriageDecision(video_id="a", is_animation=False, interest=0, reason="meh", selected=False)
        remember_run(store, "r2", [], [], [skip])
        assert store.get(VIDEOS, "youtube:a").value["status"] == "analysed"


def test_is_settled_rules():
    today = date(2026, 11, 10)
    assert is_settled({"status": "analysed", "on": "2020-01-01"}, today)
    assert is_settled({"status": "skipped", "on": "2026-11-01"}, today)
    assert not is_settled({"status": "skipped", "on": "2026-09-01"}, today)
    assert not is_settled({"status": "something else"}, today)


def test_backfill_teaches_an_empty_memory_once(tmp_path):
    rows = [{"id": "youtube:a", "title": "old card", "approved": 1, "last_updated": "2026-11-09"}]
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (_, store):
        assert backfill_from_cards(store, rows) == 1
        assert store.get(VIDEOS, "youtube:a").value["status"] == "analysed"
        store.delete(VIDEOS, "youtube:a")
        store.put(VIDEOS, "youtube:z", {"status": "skipped", "on": "2026-11-09"})
        assert backfill_from_cards(store, rows) == 0        # memory is not empty: a forget sticks
        assert store.get(VIDEOS, "youtube:a") is None
