"""The digest and the human review: interrupt, resume with Command, publish. No network."""
from animation_agent.graph import build_graph
from animation_agent.memory import open_memory
from animation_agent.nodes import build_card_graph, make_librarian, make_publish, make_reporter, make_scout, make_triage
from animation_agent.nodes.human_review import MAX_DIGEST_REVISIONS
from animation_agent.nodes.reporter import render_digest
from animation_agent.schemas import DigestDraft, DigestItem, Issue, Review
from animation_agent.storage import CardStore
from langgraph.types import Command

from fakes import DECISIONS, approve, card, comments_ok, fake_fetch, fake_search, judge, revise, scripted

DRAFT = DigestDraft(headline="Clay loops are back", intro="Two clay pieces stood out.",
                    items=[DigestItem(card_id="youtube:d", takeaway="Study the loop point."),
                           DigestItem(card_id="youtube:nope", takeaway="A card that does not exist.")],
                    open_questions=["What frame rate?"])
INPUT = {"queries": ["clay"], "max_cards": 3, "run_id": "r1"}
CONFIG = {"configurable": {"thread_id": "r1"}}


def build(tmp_path, cp, store, reporter=None, critic=None):
    return build_graph(
        scout=make_scout(search=fake_search, fetch=fake_fetch),
        triage=make_triage(judge=judge(DECISIONS)),
        analyze=build_card_graph(analyst_chain=scripted(card()), critic_chain=critic or scripted(approve()),
                                 comments=comments_ok),
        librarian=make_librarian(db_path=tmp_path / "anim.db"),
        reporter=make_reporter(chain=reporter or scripted(DRAFT)),
        publish=make_publish(out_dir=tmp_path / "digests", db_path=tmp_path / "anim.db"),
        checkpointer=cp, store=store,
    )


def paused(g):
    snap = g.get_state(CONFIG)
    assert snap.next == ("human_review",)
    return snap.interrupts[0].value


def test_run_pauses_for_review_with_the_digest(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store)
        result = g.invoke(INPUT, CONFIG)
        assert "__interrupt__" in result
        payload = paused(g)
    assert payload["round"] == 1 and set(payload["actions"]) == {"approve", "edit", "revise", "reject"}
    digest = payload["digest"]
    assert digest.startswith("# Clay loops are back")
    assert digest.index("video d") < digest.index("video a")        # the model's order, then any card it skipped
    assert "youtube:nope" not in digest and "A card that does not exist" not in digest
    assert "- Numbers: 3,000 views" in digest                        # numbers come from the card, not the model
    assert not (tmp_path / "digests").exists()                       # nothing published while paused


def test_approve_tomorrow_from_a_fresh_process_publishes_once(tmp_path):
    reporter = scripted(DRAFT)
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        build(tmp_path, cp, store, reporter=reporter).invoke(INPUT, CONFIG)
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):     # new connections, new graph
        final = build(tmp_path, cp, store, reporter=reporter).invoke(Command(resume={"action": "approve"}), CONFIG)
    assert final["digest_status"] == "approved"
    assert open(final["digest_path"]).read() == final["digest"]
    assert len(reporter.calls) == 1                                  # approving did not pay for the draft again
    assert CardStore(tmp_path / "anim.db").list_digests()[0]["status"] == "approved"


def test_edit_publishes_the_humans_text(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store)
        g.invoke(INPUT, CONFIG)
        final = g.invoke(Command(resume={"action": "edit", "text": "# My own words\n"}), CONFIG)
    assert final["digest_status"] == "edited" and open(final["digest_path"]).read() == "# My own words\n"


def test_revise_redrafts_with_feedback_then_pauses_again(tmp_path):
    second = DRAFT.model_copy(update={"headline": "Shorter headline"})
    reporter = scripted(DRAFT, second)
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, reporter=reporter)
        g.invoke(INPUT, CONFIG)
        g.invoke(Command(resume={"action": "revise", "feedback": "make the headline shorter"}), CONFIG)
        payload = paused(g)
        assert payload["round"] == 2 and payload["digest"].startswith("# Shorter headline")
        assert "make the headline shorter" in reporter.calls[1]["revision"]
        assert "# Clay loops are back" in reporter.calls[1]["revision"]   # it sees its previous draft
        final = g.invoke(Command(resume={"action": "approve"}), CONFIG)
    assert final["digest"].startswith("# Shorter headline")


def test_reject_publishes_nothing_but_records_the_decision(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store)
        g.invoke(INPUT, CONFIG)
        final = g.invoke(Command(resume={"action": "reject"}), CONFIG)
    assert final["digest_status"] == "rejected" and final["digest_path"] == ""
    assert not (tmp_path / "digests").exists()
    assert CardStore(tmp_path / "anim.db").list_digests()[0]["status"] == "rejected"


def test_a_bad_answer_pauses_again_with_a_note(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store)
        g.invoke(INPUT, CONFIG)
        g.invoke(Command(resume={"action": "edit"}), CONFIG)              # edit without text
        assert "needs the edited digest" in paused(g)["note"]
        g.invoke(Command(resume={"action": "publish it"}), CONFIG)        # not an action at all
        assert "not accepted" in paused(g)["note"]
        final = g.invoke(Command(resume={"action": "approve"}), CONFIG)
    assert final["digest_status"] == "approved" and final["review_note"] is None


def test_revisions_are_capped(tmp_path):
    reporter = scripted(DRAFT)
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, reporter=reporter)
        g.invoke(INPUT, CONFIG)
        for _ in range(MAX_DIGEST_REVISIONS + 1):
            g.invoke(Command(resume={"action": "revise", "feedback": "again"}), CONFIG)
        payload = paused(g)
    assert len(reporter.calls) == 1 + MAX_DIGEST_REVISIONS
    assert "already revised" in payload["note"]


def test_no_approved_cards_means_no_digest_and_no_pause(tmp_path):
    reporter = scripted(AssertionError("no digest without approved cards"))
    never_approves = scripted(revise())
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, reporter=reporter, critic=never_approves)
        g.invoke(INPUT, CONFIG)
        assert g.get_state(CONFIG).next == () and reporter.calls == []


def test_held_back_cards_are_listed_not_featured():
    good = card().model_copy(update={"id": "youtube:a", "title": "Good one", "source_urls": ["https://y/a"]})
    weak = card().model_copy(update={"id": "youtube:b", "title": "Weak one"})
    review = Review(card_id="youtube:b", rounds=3, approved=False,
                    issues=[Issue(field="tools", problem="Tool not in the source.", fix="remove")])
    text = render_digest(DRAFT.model_copy(update={"items": []}), [good], [(weak, review)], "r1")
    assert "## 1. Good one" in text and "## Held back" in text and "- Weak one: Tool not in the source." in text
    assert "## 2." not in text


def test_interactive_prompt_turns_keys_into_answers(monkeypatch):
    import sys
    from animation_agent import cli

    sent = []
    monkeypatch.setattr(cli, "_execute", lambda command, run_id, parallel: sent.append(command.resume))
    monkeypatch.setattr(sys.stdin, "isatty", lambda: True)
    payload = {"round": 1, "digest": "# Draft\n"}

    def drive(keys, edits=(), feedback="shorter", confirm=True):
        keys, edits = list(keys), list(edits)
        monkeypatch.setattr(cli.typer, "prompt", lambda text, **kw: keys.pop(0) if text.startswith("[a]") else feedback)
        monkeypatch.setattr("click.edit", lambda text, **kw: edits.pop(0))
        monkeypatch.setattr(cli.typer, "confirm", lambda text, **kw: confirm)
        cli._review_loop("r1", payload)

    drive("a")
    drive("r")
    drive("ea", edits=[None])                 # editor closed without saving, then approve
    drive("e", edits=["# Mine\n"])
    drive("j")
    drive("l")                                # later: no answer sent
    assert sent == [{"action": "approve"}, {"action": "revise", "feedback": "shorter"}, {"action": "approve"},
                    {"action": "edit", "text": "# Mine\n"}, {"action": "reject"}]
