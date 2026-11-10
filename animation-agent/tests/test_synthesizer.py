"""Synthesizer: trends checked and counted in code, change tracking, taxonomy. No model."""
from datetime import date, timedelta

from animation_agent.memory import open_memory
from animation_agent.nodes.reporter import render_digest, render_trends
from animation_agent.nodes.synthesizer import (MIN_SUPPORT, TAXONOMY, build_trends, remember_styles, synthesize,
                                               trend_confidence)
from animation_agent.schemas import (DigestDraft, Review, StyleProposal, SynthesisDraft, Trend, TrendDraft,
                                     Virality)
from animation_agent.storage import CardStore

from fakes import card, scripted

TODAY = date(2026, 11, 10)


def make(cid, creator, confidence=0.5, updated=TODAY):
    return card().model_copy(update={"id": cid, "title": f"title {cid}", "confidence": confidence,
                                     "source_urls": [f"https://y/{cid}"], "last_updated": updated,
                                     "virality": Virality(creator=creator)})


CARDS = {c.id: c for c in [make("a", "Clayz"), make("b", "Clayz"), make("c", "Puppets"), make("d", None)]}


def draft(*trends, styles=()):
    return SynthesisDraft(trends=list(trends), new_styles=list(styles))


def td(name, ids, counter=()):
    return TrendDraft(name=name, hypothesis="h", card_ids=list(ids), counter_card_ids=list(counter), what_to_try="t")


def test_unknown_ids_and_thin_trends_are_dropped():
    trends, changes = build_trends(draft(td("Clay loops", ["a", "zzz"]), td("Puppets", ["a", "c", "nope"])), CARDS, {}, TODAY)
    assert [t.name for t in trends] == ["Puppets"] and trends[0].card_ids == ["a", "c"]
    assert changes["dropped"] == ["Clay loops (1 known cards; unknown ids ['zzz'])"] and MIN_SUPPORT == 2


def test_ids_tolerate_formatting_but_not_invention():
    from animation_agent.nodes.synthesizer import resolve_ids
    cards = {"youtube:a": CARDS["a"], "youtube:c": CARDS["c"]}
    assert resolve_ids(["[youtube:a]", "c", " 'youtube:a' ", "made-up"], cards) == (["youtube:a", "youtube:c"], ["made-up"])


def test_one_channel_is_one_source():
    same_channel = trend_confidence([CARDS["a"], CARDS["b"]], counter=0)
    two_channels = trend_confidence([CARDS["a"], CARDS["c"]], counter=0)
    assert two_channels > same_channel
    trends, _ = build_trends(draft(td("Clay", ["a", "b"])), CARDS, {}, TODAY)
    assert trends[0].evidence_count == 2 and trends[0].independent_sources == 1


def test_counter_examples_lower_confidence():
    assert trend_confidence([CARDS["a"], CARDS["c"]], counter=1) < trend_confidence([CARDS["a"], CARDS["c"]], counter=0)


def test_changes_against_the_previous_run():
    old = Trend(id="clay", name="Clay", hypothesis="h", what_to_try="t", card_ids=["a", "b"], evidence_count=2,
                independent_sources=1, confidence=0.4, first_seen=TODAY - timedelta(days=7), last_seen=TODAY - timedelta(days=7))
    gone = old.model_copy(update={"id": "pixel-rain", "name": "Pixel rain"})
    trends, changes = build_trends(draft(td("Clay", ["a", "b", "c"]), td("Puppets", ["c", "d"])), CARDS,
                                   {"clay": old, "pixel-rain": gone}, TODAY)
    by_name = {t.name: t for t in trends}
    assert by_name["Clay"].status == "growing" and by_name["Clay"].first_seen == TODAY - timedelta(days=7)
    assert by_name["Puppets"].status == "new"
    assert changes == {"new": ["Puppets"], "growing": ["Clay"], "fading": ["Pixel rain"], "dropped": []}


def test_taxonomy_grows_only_with_two_cards(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (_, store):
        props = [StyleProposal(name="Clay village stories", family="stop_motion", description="d", card_ids=["a", "c"]),
                 StyleProposal(name="Lonely style", family="3d", description="d", card_ids=["a"])]
        assert remember_styles(store, props, CARDS, TODAY) == ["Clay village stories"]
        assert remember_styles(store, props[:1], CARDS, TODAY) == []           # known now: updated, not re-added
        assert store.get(TAXONOMY, "clay-village-stories").value["family"] == "stop_motion"
        assert store.get(TAXONOMY, "lonely-style") is None


def test_synthesize_reads_the_window_and_saves_trends(tmp_path):
    db = CardStore(tmp_path / "anim.db")
    for c in [make("a", "Clayz"), make("c", "Puppets"), make("old", "X", updated=TODAY - timedelta(days=90))]:
        db.upsert_card(c, "r1")
        db.save_review(Review(card_id=c.id, rounds=1, approved=True), "r1")
    chain = scripted(draft(td("Clay and puppets", ["a", "c", "old"])))
    out = synthesize(db, chain, None, "r2", today=TODAY)
    assert "old" not in chain.calls[0]["cards"] and "a |" in chain.calls[0]["cards"]   # outside the 30-day window
    assert out["trends"][0].card_ids == ["a", "c"]
    assert [t.name for t in db.list_trends()] == ["Clay and puppets"]


def test_too_few_cards_means_no_model_call(tmp_path):
    never = scripted(AssertionError("no synthesis from fewer than two cards"))
    assert synthesize(CardStore(tmp_path / "anim.db"), never, today=TODAY)["trends"] == [] and never.calls == []


def test_digest_shows_trends_and_what_changed():
    trends, changes = build_trends(draft(td("Clay", ["a", "c"])), CARDS, {}, TODAY)
    text = render_digest(DigestDraft(headline="H", intro="I", items=[]), [], [], "r1", trends=trends, changes=changes)
    assert "## Trends" in text and "### Clay" in text and "2 cards from 2 creators" in text
    assert "[title a](https://y/a)" in text and "- New: Clay" in text
    assert render_trends([], {}) == []


def test_a_reworded_trend_with_the_same_cards_continues_instead_of_fading():
    old = Trend(id="kinetic-type-for-lyrics", name="Kinetic type for lyrics", hypothesis="h", what_to_try="t",
                card_ids=["a", "c"], evidence_count=2, independent_sources=2, confidence=0.5,
                first_seen=TODAY - timedelta(days=3), last_seen=TODAY - timedelta(days=3))
    trends, changes = build_trends(draft(td("Kinetic type for lyric videos", ["a", "c"])), CARDS,
                                   {old.id: old}, TODAY)
    assert [(t.id, t.name, t.status) for t in trends] == [("kinetic-type-for-lyrics", "Kinetic type for lyrics", "continuing")]
    assert trends[0].first_seen == TODAY - timedelta(days=3)
    assert changes["new"] == [] and changes["fading"] == []


def test_different_cards_under_a_new_name_stay_a_new_trend():
    old = Trend(id="clay", name="Clay", hypothesis="h", what_to_try="t", card_ids=["a", "b"], evidence_count=2,
                independent_sources=1, confidence=0.4, first_seen=TODAY, last_seen=TODAY)
    trends, changes = build_trends(draft(td("Puppet builds", ["c", "d"])), CARDS, {"clay": old}, TODAY)
    assert trends[0].status == "new" and changes["fading"] == ["Clay"]
