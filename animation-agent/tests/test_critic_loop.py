"""The per-card subgraph: Analyst <-> Critic with a retry cap. Fake models, no network."""
from animation_agent.nodes import build_card_graph
from animation_agent.nodes.card_pipeline import UNAPPROVED_CONFIDENCE_CAP
from animation_agent.nodes.critic import MAX_REVISIONS, quote_in_source

from fakes import approve, cand, card, comments_ok, revise, scripted

SOURCE = 'Top viewer comments, most liked first:\n- "I’ve watched this   40 times and can\'t find the loop" (8,000 likes)'


def run(analyst, critic, comments=comments_ok):
    pipeline = build_card_graph(analyst_chain=analyst, critic_chain=critic, comments=comments)
    return pipeline.invoke({"candidate": cand("a", 10_000, 1).with_metrics()})


def test_quote_check_is_strict_but_ignores_formatting():
    assert quote_in_source("I've watched this 40 times and can't find the loop", SOURCE)       # curly quote, spaces
    assert quote_in_source("watched this 40 times ... can't find the loop (8,000 likes)", SOURCE)
    assert not quote_in_source("I've watched this 400 times", SOURCE)
    assert not quote_in_source("the drip lands exactly on the beat", SOURCE)


def test_approved_first_time():
    out = run(scripted(card()), scripted(approve(0.6)))
    assert len(out["cards"]) == 1 and out["cards"][0].confidence == 0.6
    review = out["reviews"][0]
    assert review.approved and review.rounds == 1 and review.issues == []
    assert out["sources"][0]["card_id"] == "youtube:a" and "can't find the loop" in out["sources"][0]["source"]


def test_revisions_carry_the_draft_and_the_issues():
    analyst = scripted(card(), card(), card())
    out = run(analyst, scripted(revise("hook score too high"), revise("still too high"), approve()))
    assert out["reviews"][0].approved and out["reviews"][0].rounds == 3
    second_prompt = analyst.calls[1]["revision"]
    assert "YOUR PREVIOUS DRAFT" in second_prompt and "hook score too high" in second_prompt
    assert "Change only what the issues ask for" in second_prompt
    assert analyst.calls[0]["revision"] == ""                       # first draft has no feedback


def test_critic_remembers_what_it_asked_for_last_round():
    critic = scripted(revise("hook score too high"), revise("still too high"), approve())
    run(scripted(card()), critic)
    assert critic.calls[0]["previous"] == "This is the first review of this card."
    assert "hook score too high" in critic.calls[1]["previous"]
    assert "still too high" in critic.calls[2]["previous"]


def test_loop_stops_at_the_retry_cap():
    analyst = scripted(card())
    critic = scripted(revise("never good enough"))
    out = run(analyst, critic)
    assert len(analyst.calls) == 1 + MAX_REVISIONS and len(critic.calls) == 1 + MAX_REVISIONS
    final, review = out["cards"][0], out["reviews"][0]
    assert not review.approved and review.issues[0].problem == "never good enough"
    assert final.confidence <= UNAPPROVED_CONFIDENCE_CAP
    assert "Not approved by the Critic after 3 drafts" in final.open_questions[-1]
    assert len(review.history) == 3


def test_made_up_quote_forces_a_revision_even_if_the_model_approves():
    analyst = scripted(card(quote="the drip lands exactly on the beat"), card())
    critic = scripted(approve())
    out = run(analyst, critic)
    assert out["reviews"][0].approved and out["reviews"][0].rounds == 2
    assert "not found in the source material" in critic.calls[0]["findings"]
    assert "not found in the source material" in analyst.calls[1]["revision"]


def test_no_first_draft_means_no_card():
    out = run(scripted(ValueError("model down")), scripted(approve()))
    assert out.get("cards", []) == [] and "draft 1 for a failed" in out["errors"][0]


def test_failed_revision_keeps_last_draft_flagged():
    out = run(scripted(card(), ValueError("timeout")), scripted(revise()))
    assert out["cards"][0].id == "youtube:a" and not out["reviews"][0].approved
    assert any("draft 2 for a failed" in e for e in out["errors"])


def test_critic_failure_keeps_card_unreviewed():
    out = run(scripted(card()), scripted(RuntimeError("critic down")))
    assert not out["reviews"][0].approved
    assert out["cards"][0].confidence <= UNAPPROVED_CONFIDENCE_CAP
    assert "Not reviewed" in out["cards"][0].open_questions[-1]
