"""The YouTube tools, tested with a fake yt-dlp. No network, no model."""
import json
from datetime import date

import pytest

from animation_agent.schemas import Candidate
from animation_agent.tools import youtube as yt


def test_search_filter_matches_youtube_ui():
    assert yt.search_filter("month") == "EgIIBA%3D%3D"      # the string YouTube's own filter menu uses
    assert yt.search_filter("month", "views") == "CAMSAggE"
    assert yt.search_filter("any", "relevance") is None
    assert yt.search_url("clay loop", "week").endswith("search_query=clay+loop&sp=EgIIAw%3D%3D")


def test_candidate_metrics_are_computed_in_code():
    c = Candidate(video_id="a", url="u", title="t", views=10_000, likes=500, comments=40,
                  channel_followers=2_000, posted_on=date(2026, 11, 1)).with_metrics(today=date(2026, 11, 11))
    assert c.views_per_day == 1000.0
    assert c.like_rate == 0.05
    assert c.comment_rate == 0.004
    assert c.views_per_follower == 5.0


def test_candidate_metrics_tolerate_missing_counts():
    c = Candidate(video_id="a", url="u", title="t", views=0).with_metrics()
    assert c.like_rate is None and c.views_per_follower is None


VIDEOS = {
    "good1": {"id": "good1", "title": "Clay cat loop", "channel": "Clayz", "channel_follower_count": 1000,
              "upload_date": "20261101", "view_count": 50_000, "like_count": 4_000, "comment_count": 300,
              "duration": 12, "tags": ["claymation", "loop"], "description": "made in Dragonframe"},
    "good2": {"id": "good2", "title": "Pixel rain", "channel": "Px", "view_count": 900, "upload_date": "20261105"},
    "missing": {"id": "missing", "title": "youtube video #missing"},   # the stub yt-dlp returns for dead ids
}


@pytest.fixture
def fake_ytdlp(monkeypatch):
    calls = []

    def fake_extract(url, *, flat=False, limit=None):
        calls.append((url, flat, limit))
        if flat and "empty+combo" in url and "sp=CAMSAggE" in url:
            return {"entries": []}                                # YouTube's sort+window quirk
        if flat:
            return {"entries": [
                {"id": "good1", "ie_key": "Youtube", "title": "Clay cat loop", "view_count": 50_000, "channel": "Clayz", "duration": 12},
                {"id": "PLclaylist", "ie_key": "YoutubeTab", "title": "Best claymation playlist"},   # not a video
                {"id": "good2", "ie_key": "Youtube", "title": "Pixel rain", "view_count": 900},
                None,
            ]}
        vid = url.rsplit("=", 1)[-1]
        if vid == "boom":
            raise RuntimeError("Sign in to confirm you are not a bot")
        return VIDEOS[vid]

    monkeypatch.setattr(yt, "_extract", fake_extract)
    return calls


def test_search_tool_returns_compact_json(fake_ytdlp):
    out = json.loads(yt.youtube_search.invoke({"query": "claymation", "uploaded_within": "month", "sort_by": "views"}))
    assert [r["video_id"] for r in out["results"]] == ["good1", "good2"]   # the playlist was dropped
    assert "channel" not in out["results"][1]                  # empty fields are dropped to save tokens
    assert "sp=CAMSAggE" in fake_ytdlp[0][0] and fake_ytdlp[0][1] is True


def test_empty_sorted_window_falls_back_to_relevance_sorted_in_code(fake_ytdlp):
    out = json.loads(yt.youtube_search.invoke({"query": "empty combo", "uploaded_within": "month", "sort_by": "views"}))
    assert [r["video_id"] for r in out["results"]] == ["good1", "good2"]   # sorted by views, highest first
    assert "re-sorted by views" in out["note"]
    assert fake_ytdlp[1][0].endswith("sp=EgIIBA%3D%3D")                     # second call: same window, relevance


def test_stats_tool_reports_errors_per_video(fake_ytdlp):
    out = json.loads(yt.youtube_video_stats.invoke({"video_ids": ["good1", "missing", "boom", "good1"]}))
    assert [v["video_id"] for v in out["videos"]] == ["good1"]  # duplicate id fetched once
    assert out["videos"][0]["views_per_follower"] == 50.0
    assert set(out["errors"]) == {"missing", "boom"}
    assert "not a bot" in out["errors"]["boom"]


def test_stats_tool_caps_batch_size(fake_ytdlp):
    out = json.loads(yt.youtube_video_stats.invoke({"video_ids": ["good2"] + [f"x{i}" for i in range(10)]}))
    assert "note" in out
    assert len([c for c in fake_ytdlp if not c[1]]) == yt.MAX_STATS_PER_CALL
