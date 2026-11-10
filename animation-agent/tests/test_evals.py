"""Evals: metrics, datasets, baseline comparison, LangSmith upload. Fakes only."""
from types import SimpleNamespace

from langchain_core.runnables import RunnableLambda

from animation_agent.evals import datasets as ds
from animation_agent.evals.compare import regressions
from animation_agent.evals.judge import JudgeScores, TriageLabel, TriageLabels
from animation_agent.evals.langsmith_sync import push
from animation_agent.evals.runners import eval_analyst, eval_retrieval, eval_triage
from animation_agent.kb import KnowledgeBase
from animation_agent.schemas import Comment, Review, TriageDecision, TriageJudgement, TriageVerdicts
from animation_agent.storage import CardStore

from fakes import cand, card
from test_kb import WordHashEmbedding


def row(vid, anim, worth, source="human"):
    return {"video_id": vid, "title": vid, "line": f"[{vid}] title", "label": {"is_animation": anim, "worth_card": worth, "source": source}}


def test_triage_metrics_against_labels():
    rows = [row("a", True, True), row("b", True, False), row("c", False, False), row("d", True, True, "opus-draft"),
            {"video_id": "e", "title": "e", "line": "[e]", "label": None}]
    verdicts = TriageVerdicts(decisions=[
        TriageJudgement(video_id="a", is_animation=True, interest=4, reason="r"),   # true positive
        TriageJudgement(video_id="b", is_animation=True, interest=3, reason="r"),   # false positive
        TriageJudgement(video_id="c", is_animation=True, interest=0, reason="r"),   # wrong on animation, right on worth
        TriageJudgement(video_id="d", is_animation=True, interest=1, reason="r"),   # false negative
    ])
    out = eval_triage(rows, chain=RunnableLambda(lambda inp: verdicts))
    m = out["metrics"]
    assert m["n"] == 4 and m["is_animation_accuracy"] == 0.75
    assert m["worth_precision"] == 0.5 and m["worth_recall"] == 0.5 and m["worth_f1"] == 0.5
    assert out["label_sources"] == {"human": 3, "opus-draft": 1}


def test_analyst_eval_checks_quotes_in_code_and_averages_the_judge():
    rows = [{"card_id": "youtube:a", "source": 'comments: "can\'t find the loop"'},
            {"card_id": "youtube:b", "source": "nothing quotable here"},
            {"card_id": "youtube:c", "source": "unused because of the limit"}]
    judge = RunnableLambda(lambda inp: JudgeScores(groundedness=4, specificity=3, usefulness=4, calibration=5, rationale="r"))
    out = eval_analyst(rows, chain=RunnableLambda(lambda inp: card()), judge=judge, limit=2)
    m = out["metrics"]
    assert m["n"] == 2 and m["quote_coverage"] == 0.5 and m["success_rate"] == 1.0
    assert m["judge_groundedness"] == 4 and m["judge_mean"] == 4.0


def test_retrieval_eval_scores_recall_and_mrr():
    corpus = []
    for cid, summary in [("youtube:clay", "clay stop motion loop"), ("youtube:type", "kinetic typography lyric video"),
                         ("youtube:puppet", "puppet armature stop motion")]:
        c = card().model_copy(update={"id": cid, "title": cid, "summary": summary, "how_it_is_made": [],
                                      "why_it_works": card().why_it_works.model_copy(update={"evidence": card().why_it_works.evidence[:1]})})
        corpus.append({"card_id": cid, "approved": 1, "card": c.model_dump(mode="json")})
    qa = [{"question": "kinetic typography lyric", "relevant": ["youtube:type"]},
          {"question": "made up topic zebra", "relevant": ["youtube:nothing"]}]
    out = eval_retrieval(qa, corpus, k=2, kb_factory=lambda p: KnowledgeBase(p, embedding_function=WordHashEmbedding()))
    assert out["rows"][0]["retrieved"][0] == "youtube:type" and out["rows"][0]["rr"] == 1.0
    assert out["metrics"] == {"recall_at_2": 0.5, "mrr": 0.5, "hit_rate": 0.5, "n": 2}


def test_regressions_respect_tolerances():
    base = {"triage": {"worth_f1": 0.8, "n": 30}, "analyst": {"judge_mean": 4.0, "quote_coverage": 0.9}}
    assert regressions({"triage": {"worth_f1": 0.77, "n": 5}}, base) == []
    found = regressions({"triage": {"worth_f1": 0.7}, "analyst": {"judge_mean": 3.6, "quote_coverage": 0.9}}, base)
    assert len(found) == 2 and found[0].startswith("triage.worth_f1")


def test_dataset_builders_keep_labels_and_prefer_stored_sources(tmp_path):
    db = CardStore(tmp_path / "anim.db")
    for cid in ("youtube:a", "youtube:b"):
        db.upsert_card(card().model_copy(update={"id": cid, "title": cid}), "r1")
        db.save_review(Review(card_id=cid, rounds=1, approved=True), "r1")
    db.save_source("youtube:a", "r1", "the stored source")
    db.save_triage("r1", [TriageDecision(video_id=v, is_animation=True, interest=3, reason="r", title=v) for v in ("a", "b")])

    def fetch(ids):
        return [cand(i, 1000, 2).with_metrics() for i in ids], {}

    analyst = ds.build_analyst(db, fetch=fetch, comments=lambda vid, n: [Comment(text="nice loop", likes=3)])
    assert [(r["card_id"], r["origin"]) for r in analyst] == [("youtube:a", "stored"), ("youtube:b", "rebuilt")]
    assert "nice loop" in analyst[1]["source"]

    existing = [{"video_id": "a", "label": {"is_animation": False, "worth_card": False, "source": "human"}}]
    triage = ds.build_triage(db, fetch=fetch, existing=existing)
    by_id = {r["video_id"]: r for r in triage}
    assert by_id["a"]["label"]["source"] == "human" and by_id["b"]["label"] is None and "[b]" in by_id["b"]["line"]

    chain = RunnableLambda(lambda inp: TriageLabels(labels=[TriageLabel(video_id="b", is_animation=True, worth_card=True)]))
    assert ds.draft_labels(triage, chain) == 1 and by_id["b"]["label"]["source"] == "opus-draft"
    ds.save("triage", triage, folder=tmp_path)
    assert ds.load("triage", folder=tmp_path) == triage


def test_push_creates_datasets_and_skips_existing_ones():
    calls = []
    client = SimpleNamespace(
        has_dataset=lambda dataset_name: dataset_name == "animation-agent-qa",
        create_dataset=lambda name, description: calls.append(("create", name)) or SimpleNamespace(id="id-" + name),
        create_examples=lambda dataset_id, examples: calls.append(("examples", dataset_id, len(examples))),
        delete_dataset=lambda dataset_name: calls.append(("delete", dataset_name)),
    )
    out = push({"triage": [row("a", True, True), {"video_id": "x", "line": "l", "label": None}], "qa": []}, client=client)
    assert calls == [("create", "animation-agent-triage"), ("examples", "id-animation-agent-triage", 1)]
    assert "already exists" in out[1]
