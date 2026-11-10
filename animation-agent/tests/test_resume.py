"""Short-term memory: checkpoints let a stopped run continue without redoing finished work."""
import logging

from animation_agent.graph import build_graph
from animation_agent.memory import open_memory, serializer
from animation_agent.nodes import build_card_graph, make_librarian, make_scout, make_triage
from animation_agent.schemas import Candidate, TechniqueCard
from animation_agent.storage import CardStore

from fakes import DECISIONS, approve, card, comments_ok, fake_fetch, fake_search, judge, scripted


class SimulatedCrash(BaseException):
    """Like Ctrl-C or a killed process: not an Exception, so no node can swallow it."""


def counting(fn, log, name):
    def wrapped(*args, **kwargs):
        log.append(name)
        return fn(*args, **kwargs)
    return wrapped


def build(tmp_path, cp, store, log, librarian=None, critic=None):
    analyst = scripted(lambda inp: log.append("analyst:" + ("a" if "video a" in inp["source"] else "d")) or card())
    return build_graph(
        scout=make_scout(search=fake_search, fetch=counting(fake_fetch, log, "fetch")),
        triage=make_triage(judge=judge(DECISIONS)),
        analyze=build_card_graph(analyst_chain=analyst, critic_chain=critic or scripted(approve()), comments=comments_ok),
        librarian=librarian or make_librarian(db_path=tmp_path / "anim.db"),
        with_digest=False, checkpointer=cp, store=store,
    )


CONFIG = {"configurable": {"thread_id": "r1"}, "max_concurrency": 1}
INPUT = {"queries": ["clay"], "max_cards": 3, "run_id": "r1"}


def test_resume_after_a_crash_in_the_last_node_redoes_nothing_else(tmp_path):
    log, crashed = [], []
    real = make_librarian(db_path=tmp_path / "anim.db")

    def flaky_librarian(state, *, store=None):
        if not crashed:
            crashed.append(True)
            raise SimulatedCrash("disk unplugged")
        return real(state, store=store)

    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, log, librarian=flaky_librarian)
        try:
            g.invoke(INPUT, CONFIG)
            raise AssertionError("expected the simulated crash")
        except SimulatedCrash:
            pass
        assert g.get_state(CONFIG).next == ("librarian",)
        before = list(log)
        final = g.invoke(None, CONFIG)                  # None = continue from the checkpoint

    assert log == before                                 # no search, stats or model call repeated
    assert sorted(final["saved"]) == ["youtube:a", "youtube:d"]
    assert len(CardStore(tmp_path / "anim.db").list_cards()) == 2


def test_resume_continues_a_crashed_pipeline_at_the_step_that_failed(tmp_path):
    log, crashed = [], []

    def critic(inp):
        is_d = "video d" in inp["source"]
        log.append("critic:" + ("d" if is_d else "a"))
        if is_d and not crashed:
            crashed.append(True)
            raise SimulatedCrash("ctrl-c during d's review")
        return approve()

    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, log, critic=scripted(critic))
        try:
            g.invoke(INPUT, CONFIG)
        except SimulatedCrash:
            pass
        assert g.get_state(CONFIG).next == ("analyze",)
        final = g.invoke(None, CONFIG)

    assert sorted(c.id for c in final["cards"]) == ["youtube:a", "youtube:d"]
    assert log.count("analyst:a") == 1 and log.count("critic:a") == 1   # a's finished pipeline is not rerun
    assert log.count("analyst:d") == 1                                  # d's draft is not paid for twice
    assert log.count("critic:d") == 2                                   # only the step that crashed reruns
    assert log.count("fetch") == 1


def test_history_has_one_checkpoint_per_step(tmp_path):
    with open_memory(tmp_path / "cp.db", tmp_path / "mem.db") as (cp, store):
        g = build(tmp_path, cp, store, [])
        g.invoke(INPUT, CONFIG)
        nexts = [s.next for s in reversed(list(g.get_state_history(CONFIG)))]
    assert nexts == [("__start__",), ("scout",), ("triage",), ("analyze", "analyze"), ("librarian",), ()]


def test_checkpoints_rebuild_our_models_without_warnings(caplog):
    serde = serializer()
    caplog.set_level(logging.WARNING)
    for obj in (Candidate(video_id="v", url="u", title="t"), card()):
        restored = serde.loads_typed(serde.dumps_typed(obj))
        assert type(restored) is type(obj) and restored == obj
    assert isinstance(restored, TechniqueCard)
    assert "unregistered" not in caplog.text
