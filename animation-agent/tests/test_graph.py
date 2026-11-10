"""The Milestone 2 graph, run end to end with fake YouTube, fake model and a temp database."""
from datetime import date, timedelta

from langchain_core.runnables import RunnableLambda

from animation_agent.graph import build_graph
from animation_agent.nodes import make_analyst, make_librarian, make_scout
from animation_agent.nodes.analyst import source_material
from animation_agent.nodes.scout import default_queries
from animation_agent.schemas import Candidate, Comment, Evidence, TechniqueCard, Virality, WhyItWorks
from animation_agent.storage import CardStore

TODAY = date.today()


def cand(vid, views, days_old, title=None, followers=1_000):
    return Candidate(video_id=vid, url=f"https://www.youtube.com/watch?v={vid}", title=title or f"video {vid}",
                     channel="ch", views=views, likes=views // 20, comments=10, channel_followers=followers,
                     posted_on=TODAY - timedelta(days=days_old))


def fake_search(query, n, window, sort):
    if query == "broken":
        raise RuntimeError("search page changed")
    light = {"clay": [cand("a", 10_000, 1), cand("b", 90_000, 30)], "loop": [cand("a", 10_000, 1), cand("c", 500, 2)]}
    return [c.model_copy(update={"posted_on": None, "likes": None}) for c in light[query]], None


def fake_fetch(ids):
    full = {"a": cand("a", 10_000, 1), "b": cand("b", 90_000, 30)}          # "c" has been deleted
    return [full[i].with_metrics() for i in ids if i in full], ({"c": "LookupError: gone"} if "c" in ids else {})


def model_card(description: str) -> TechniqueCard:
    """What a model might return: plausible judgement, plus facts that are wrong on purpose."""
    if "FAIL" in description:
        raise ValueError("model returned invalid JSON")
    return TechniqueCard(
        title="a paraphrased title", source_urls=["https://made-up.example"], style_family="stop_motion",
        sub_style="clay loop", summary="s", how_it_is_made=["likely: shot on twos"], difficulty=3,
        time_to_reproduce="1 day", confidence=0.4, virality=Virality(views=1, likes=999_999),
        why_it_works=WhyItWorks(hook=3, timing_easing=3, principles=3, loop_quality=4, sound_sync=0,
                                mobile_readability=3, novelty_vs_familiarity=3, emotional_driver=3,
                                process_reveal=0, production_signal=3,
                                evidence=[Evidence(claim="viewers love the loop", quote="can't find the loop")]),
    )


def fake_comments(vid, n):
    if vid == "b":
        raise RuntimeError("comments disabled")
    return [Comment(text="can't find the loop", likes=120)]


def build(tmp_path, chain=model_card):
    return build_graph(
        scout=make_scout(search=fake_search, fetch=fake_fetch),
        analyst=make_analyst(chain=RunnableLambda(lambda inp: chain(inp["description"])), comments=fake_comments),
        librarian=make_librarian(db_path=tmp_path / "test.db"),
    )


def test_graph_shape():
    edges = {(e.source, e.target) for e in build_graph(scout=lambda s: {}, analyst=lambda s: {},
                                                       librarian=lambda s: {}).get_graph().edges}
    assert edges == {("__start__", "scout"), ("scout", "analyst"), ("analyst", "librarian"), ("librarian", "__end__")}


def test_end_to_end_saves_cards_with_facts_from_tools(tmp_path):
    final = build(tmp_path).invoke({"queries": ["clay", "loop", "broken"], "max_cards": 2})

    # Scout: deduped across queries, ranked by views per day, failures recorded not raised.
    assert [c.video_id for c in final["candidates"]] == ["a", "b"]
    assert final["candidates"][0].found_by == ["clay", "loop"]

    # Analyst: the model's made-up facts were replaced by measured ones.
    card = final["cards"][0]
    assert card.id == "youtube:a" and card.title == "video a"
    assert card.source_urls == ["https://www.youtube.com/watch?v=a"]
    assert card.virality.views == 10_000 and card.virality.likes == 500 and card.virality.views_per_day == 10_000.0
    assert card.why_it_works.evidence[0].source_url == "https://www.youtube.com/watch?v=a"

    # Reducer: errors from two different nodes are all kept.
    errs = "\n".join(final["errors"])
    assert "scout: search 'broken' failed" in errs and "scout: stats for c failed" in errs
    assert "analyst: comments for b unavailable" in errs

    # Librarian: cards and the run log are in SQLite.
    store = CardStore(tmp_path / "test.db")
    assert final["saved"] == ["youtube:a", "youtube:b"]
    assert store.get_card("youtube:a").virality.views == 10_000
    run = store.runs()[0]
    assert run["run_id"] == final["run_id"] and run["candidates"] == 2


def test_one_failed_card_does_not_sink_the_run(tmp_path):
    chain = lambda d: model_card("FAIL" if "video b" in d else d)
    final = build(tmp_path, chain=chain).invoke({"queries": ["clay"], "max_cards": 2})
    assert [c.id for c in final["cards"]] == ["youtube:a"]
    assert any("card for b failed: ValueError" in e for e in final["errors"])


def test_rerun_updates_instead_of_duplicating(tmp_path):
    store = CardStore(tmp_path / "x.db")
    card = model_card("ok").model_copy(update={"id": "youtube:a", "first_seen": date(2026, 1, 1), "last_updated": date(2026, 1, 1)})
    store.upsert_card(card, "run1")
    store.upsert_card(card.model_copy(update={"confidence": 0.9, "first_seen": TODAY, "last_updated": TODAY}), "run2")
    rows = store.list_cards()
    assert len(rows) == 1 and rows[0]["confidence"] == 0.9
    saved = store.get_card("youtube:a")
    assert saved.first_seen == date(2026, 1, 1) and saved.last_updated == TODAY


def test_source_material_states_what_is_missing():
    text = source_material(cand("a", 10_000, 1).with_metrics(), [Comment(text="so smooth", likes=5, by_creator=True)])
    assert '- "so smooth" (5 likes, by the creator)' in text
    assert "views per day 10000.0" in text
    assert "Not available: video frames" in text
    assert "No viewer comments" in source_material(cand("a", 1, 1), [])


def test_default_queries_come_from_sources_yaml():
    assert "motion design" in default_queries()
