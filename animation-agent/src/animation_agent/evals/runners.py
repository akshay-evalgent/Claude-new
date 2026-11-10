"""The eval suites. Each returns {"suite", "metrics", "rows"}; every metric is higher-is-better."""
from __future__ import annotations

import statistics
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any, Callable

from langchain_core.runnables import Runnable

from ..kb import KnowledgeBase
from ..nodes.analyst import CODE_OWNED_FIELDS, build_analyst_chain
from ..nodes.critic import quote_in_source
from ..nodes.triage import MIN_INTEREST, build_triage_chain
from ..qa_graph import retrieve_cards
from ..schemas import QueryPlan, TechniqueCard
from .judge import build_judge_chain


def _ratio(a: int, b: int) -> float:
    return round(a / b, 3) if b else 0.0


def eval_triage(rows: list[dict], chain: Runnable | None = None) -> dict[str, Any]:
    """Triage's judgements against labels. 'Worth a card' = animation and interest >= MIN_INTEREST."""
    labelled = [r for r in rows if r.get("label")]
    chain = chain or build_triage_chain()
    judged: dict[str, Any] = {}
    for start in range(0, len(labelled), 20):
        batch = labelled[start:start + 20]
        out = chain.invoke({"videos": "\n".join(r["line"] for r in batch)})
        judged.update({d.video_id: d for d in out.decisions})
    tp = fp = fn = anim_right = 0
    out_rows = []
    for r in labelled:
        d, lab = judged.get(r["video_id"]), r["label"]
        pred_anim = bool(d and d.is_animation)
        pred_worth = bool(d and d.is_animation and d.interest >= MIN_INTEREST)
        anim_right += pred_anim == lab["is_animation"]
        tp += pred_worth and lab["worth_card"]
        fp += pred_worth and not lab["worth_card"]
        fn += (not pred_worth) and lab["worth_card"]
        out_rows.append({"video_id": r["video_id"], "title": r["title"], "label": lab,
                         "predicted": {"is_animation": pred_anim, "worth_card": pred_worth,
                                       "interest": d.interest if d else None}})
    precision, recall = _ratio(tp, tp + fp), _ratio(tp, tp + fn)
    f1 = round(2 * precision * recall / (precision + recall), 3) if precision + recall else 0.0
    return {"suite": "triage", "rows": out_rows,
            "label_sources": dict(Counter(r["label"].get("source", "unknown") for r in labelled)),
            "metrics": {"is_animation_accuracy": _ratio(anim_right, len(labelled)),
                        "worth_precision": precision, "worth_recall": recall, "worth_f1": f1,
                        "n": len(labelled)}}


def eval_analyst(rows: list[dict], chain: Runnable | None = None, judge: Runnable | None = None,
                 limit: int = 3) -> dict[str, Any]:
    """Replay frozen sources through today's Analyst prompt. Code checks quotes; a judge scores quality."""
    chain, judge = chain or build_analyst_chain(), judge or build_judge_chain()
    out_rows, failures = [], 0
    for r in rows[:limit]:
        try:
            card: TechniqueCard = chain.invoke({"source": r["source"], "revision": ""})
        except Exception as exc:
            failures += 1
            out_rows.append({"card_id": r["card_id"], "error": f"{type(exc).__name__}: {exc}"})
            continue
        quotes = [e.quote for e in card.why_it_works.evidence]
        found = sum(quote_in_source(q, r["source"]) for q in quotes)
        scores = judge.invoke({"source": r["source"], "card": card.model_dump_json(indent=1, exclude=CODE_OWNED_FIELDS)})
        out_rows.append({"card_id": r["card_id"], "quote_coverage": _ratio(found, len(quotes)),
                         "judge": scores.model_dump(), "confidence": card.confidence})
    ok = [x for x in out_rows if "judge" in x]

    def mean(values: list[float]) -> float:
        return round(statistics.mean(values), 3) if values else 0.0

    metrics = {"quote_coverage": mean([x["quote_coverage"] for x in ok]),
               "success_rate": _ratio(len(ok), len(out_rows))}
    for key in ("groundedness", "specificity", "usefulness", "calibration"):
        metrics[f"judge_{key}"] = mean([x["judge"][key] for x in ok])
    metrics["judge_mean"] = mean([metrics[f"judge_{k}"] for k in ("groundedness", "specificity", "usefulness", "calibration")])
    metrics["n"] = len(out_rows)
    return {"suite": "analyst", "metrics": metrics, "rows": out_rows}


def eval_retrieval(qa_rows: list[dict], card_rows: list[dict], k: int = 4,
                   planner: Runnable | None = None, kb_factory: Callable[[Path], KnowledgeBase] | None = None) -> dict[str, Any]:
    """Recall@k and MRR on a temporary index built from the frozen corpus. Free without a planner."""
    with tempfile.TemporaryDirectory() as tmp:
        kb = (kb_factory or (lambda p: KnowledgeBase(p)))(Path(tmp) / "chroma")
        for row in card_rows:
            kb.upsert(TechniqueCard.model_validate(row["card"]),
                      None if row["approved"] is None else bool(row["approved"]))
        out_rows = []
        for q in qa_rows:
            plan = planner.invoke({"question": q["question"]}) if planner else QueryPlan(search_text=q["question"])
            hits, relaxed = retrieve_cards(kb, plan, k)
            got = [h.card_id for h in hits]
            relevant = set(q["relevant"])
            first = next((i for i, cid in enumerate(got, 1) if cid in relevant), None)
            out_rows.append({"question": q["question"], "retrieved": got, "relevant": sorted(relevant),
                             "recall": _ratio(len(relevant & set(got)), len(relevant)),
                             "rr": round(1 / first, 3) if first else 0.0, "relaxed": relaxed})
        del kb
    n = len(out_rows)
    return {"suite": "retrieval", "rows": out_rows,
            "metrics": {f"recall_at_{k}": round(sum(r["recall"] for r in out_rows) / n, 3) if n else 0.0,
                        "mrr": round(sum(r["rr"] for r in out_rows) / n, 3) if n else 0.0,
                        "hit_rate": _ratio(sum(r["rr"] > 0 for r in out_rows), n), "n": n}}
