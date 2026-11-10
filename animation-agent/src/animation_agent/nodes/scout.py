"""Scout: find candidate videos. Plain code, no model.

Lesson, graph vs agent: in Milestone 1 the model chose what to search for. Here the queries
come from `sources.yaml`, the searches run in parallel, and the shortlist is a sort. Nothing in
this step needs judgement, so it gets none, which makes it fast, free, repeatable and testable.
Put the model only where judgement is needed.

Since Milestone 4 Scout also reads long-term memory: hits that were analysed before, or skipped by
Triage recently, are dropped before any stats are fetched. LangGraph passes the store in because
the node function has a `store` parameter; it is None when the graph was compiled without one.
"""
# No `from __future__ import annotations` here: LangGraph injects `store` by reading the
# parameter's type, and that import turns every type hint into a string it does not match.

import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Callable

import yaml
from langgraph.store.base import BaseStore

from ..config import ROOT
from ..memory import settled_keys, video_key
from ..schemas import Candidate
from ..state import RunState
from ..tools.youtube import fetch_videos, search_youtube

RESULTS_PER_QUERY = 10
DEFAULT_WINDOW = "month"
DEFAULT_STATS_BUDGET = 20


def default_queries(path=ROOT / "sources.yaml") -> list[str]:
    """Adding a query is a config change, not a code change."""
    data = yaml.safe_load(path.read_text())
    for platform in data.get("video_platforms", []):
        if platform.get("name") == "YouTube":
            return list(platform.get("queries", []))
    return []


def make_scout(search: Callable = search_youtube, fetch: Callable = fetch_videos) -> Callable[[RunState], dict]:
    def scout(state: RunState, *, store: BaseStore | None = None) -> dict:
        queries = state.get("queries") or default_queries()
        window = state.get("uploaded_within") or DEFAULT_WINDOW
        budget = state.get("stats_budget") or DEFAULT_STATS_BUDGET
        errors: list[str] = []

        # 1. Search every query in parallel, sorted by views within the upload window.
        with ThreadPoolExecutor(max_workers=4) as pool:
            futures = {q: pool.submit(search, q, RESULTS_PER_QUERY, window, "views") for q in queries}
        hits: dict[str, Candidate] = {}
        for query, future in futures.items():
            try:
                results, _note = future.result()
            except Exception as exc:
                errors.append(f"scout: search {query!r} failed: {type(exc).__name__}: {exc}")
                continue
            for c in results:                                   # dedupe across queries
                kept = hits.setdefault(c.video_id, c)
                if query not in kept.found_by:
                    kept.found_by.append(query)

        # 2. Drop what long-term memory already knows, before paying for stats.
        already_seen: list[str] = []
        if store is not None and not state.get("include_seen"):
            keys = {video_key(c.platform, vid): vid for vid, c in hits.items()}
            for key in settled_keys(store, list(keys)):
                already_seen.append(key)
                hits.pop(keys[key])

        # 3. Full stats only for the most-viewed hits: stats cost a few seconds per video.
        shortlist = sorted(hits.values(), key=lambda c: c.views or 0, reverse=True)[:budget]
        found, failed = fetch([c.video_id for c in shortlist])
        found_by = {c.video_id: c.found_by for c in shortlist}
        for c in found:
            c.found_by = found_by.get(c.video_id, [])
        errors += [f"scout: stats for {vid} failed: {err}" for vid, err in failed.items()]

        # 4. Rank by momentum, not size: views per day since upload.
        found.sort(key=lambda c: c.views_per_day or 0, reverse=True)
        return {
            "run_id": state.get("run_id") or uuid.uuid4().hex[:8],
            "started_at": state.get("started_at") or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "queries": queries,
            "uploaded_within": window,
            "candidates": found,
            "already_seen": already_seen,
            "errors": errors,
        }

    return scout
