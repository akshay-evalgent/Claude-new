"""YouTube search and per-video stats through yt-dlp. Keyless.

Two plain functions do the work and return `Candidate` objects:

- `search_youtube()` is fast (one request) but YouTube's search page only gives title,
  channel, views and duration.
- `fetch_videos()` opens each video for upload date, likes, comments and channel size.
  It is slower (a few seconds per video), so it runs a few in parallel.

The two `@tool` wrappers at the bottom are what the model sees. Splitting search from stats
on purpose makes the model plan: search wide and cheap, then spend stats calls on the
promising results. That planning is the ReAct loop in action.
"""
from __future__ import annotations

import base64
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime
from typing import Any, Literal
from urllib.parse import quote, quote_plus

from langchain_core.tools import tool

from ..config import settings
from ..schemas import Candidate, Comment

UploadWindow = Literal["any", "hour", "today", "week", "month", "year"]
SortBy = Literal["relevance", "views", "date"]

# YouTube encodes search filters in the `sp` URL parameter as a tiny base64 protobuf:
# field 1 is the sort order, field 2 is a nested message whose field 1 is the upload window.
_SORT_CODES = {"relevance": 0, "date": 2, "views": 3}
_WINDOW_CODES = {"any": 0, "hour": 1, "today": 2, "week": 3, "month": 4, "year": 5}

MAX_SEARCH_RESULTS = 20
MAX_STATS_PER_CALL = 8


class _QuietLogger:
    """yt-dlp prints to stderr even with quiet=True. Collect errors instead of printing them."""

    def __init__(self) -> None:
        self.errors: list[str] = []

    def debug(self, msg: str) -> None: ...
    def info(self, msg: str) -> None: ...
    def warning(self, msg: str) -> None: ...

    def error(self, msg: str) -> None:
        self.errors.append(msg)


def _extract(url: str, *, flat: bool = False, limit: int | None = None, comments: int = 0) -> dict[str, Any]:
    """The only function that touches yt-dlp. Tests replace it with a fake."""
    import yt_dlp

    opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "logger": _QuietLogger(),
        # yt-dlp needs a JavaScript runtime to read YouTube pages (node or deno).
        "js_runtimes": {settings.ytdlp_js_runtime: {}},
        # We want metadata, not playable streams. Skipping the stream manifests avoids
        # needless requests (and the 403s YouTube returns for them from cloud IPs).
        "extractor_args": {"youtube": {"skip": ["dash", "hls", "translated_subs"]}},
        "ignore_no_formats_error": True,
    }
    if flat:
        opts["extract_flat"] = "in_playlist"
    if limit:
        opts["playlistend"] = limit
    if comments:
        # Top-level comments only, YouTube's "top" order, no replies.
        opts["getcomments"] = True
        opts["extractor_args"]["youtube"].update(max_comments=[str(comments), "all", "0", "0"], comment_sort=["top"])
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False) or {}


def search_filter(uploaded_within: UploadWindow = "any", sort_by: SortBy = "relevance") -> str | None:
    """Build the `sp` value. "month" alone gives EgIIBA%3D%3D, the same string YouTube's UI uses."""
    raw = b""
    if _SORT_CODES[sort_by]:
        raw += bytes([0x08, _SORT_CODES[sort_by]])
    if _WINDOW_CODES[uploaded_within]:
        raw += bytes([0x12, 0x02, 0x08, _WINDOW_CODES[uploaded_within]])
    return quote(base64.b64encode(raw).decode(), safe="") if raw else None


def search_url(query: str, uploaded_within: UploadWindow = "any", sort_by: SortBy = "relevance") -> str:
    url = f"https://www.youtube.com/results?search_query={quote_plus(query)}"
    sp = search_filter(uploaded_within, sort_by)
    return f"{url}&sp={sp}" if sp else url


def _as_int(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) else None


def _parse_date(info: dict[str, Any]) -> date | None:
    raw = info.get("upload_date")
    if raw:
        try:
            return datetime.strptime(raw, "%Y%m%d").date()
        except ValueError:
            pass
    ts = info.get("timestamp") or info.get("release_timestamp")
    return date.fromtimestamp(ts) if ts else None


def _to_candidate(info: dict[str, Any]) -> Candidate:
    vid = info.get("id") or ""
    return Candidate(
        video_id=vid,
        url=info.get("webpage_url") or f"https://www.youtube.com/watch?v={vid}",
        title=info.get("title") or "",
        channel=info.get("channel") or info.get("uploader"),
        channel_followers=_as_int(info.get("channel_follower_count")),
        posted_on=_parse_date(info),
        duration_s=_as_int(info.get("duration")),
        views=_as_int(info.get("view_count")),
        likes=_as_int(info.get("like_count")),
        comments=_as_int(info.get("comment_count")),
        tags=list(info.get("tags") or [])[:10],
        description=(info.get("description") or "")[:500],
    ).with_metrics()


def _is_video(entry: dict[str, Any] | None) -> bool:
    """Search pages mix in playlists and channels (extractor "YoutubeTab"). Keep only videos."""
    return bool(entry and entry.get("id") and entry.get("ie_key", "Youtube") == "Youtube")


def _search_once(query: str, max_results: int, uploaded_within: UploadWindow, sort_by: SortBy) -> list[Candidate]:
    # Ask for a few extra entries so dropping playlists still leaves max_results videos.
    info = _extract(search_url(query, uploaded_within, sort_by), flat=True, limit=max_results + 5)
    entries = [e for e in (info.get("entries") or []) if _is_video(e)]
    return [_to_candidate(e) for e in entries[:max_results]]


def search_youtube(
    query: str, max_results: int = 10, uploaded_within: UploadWindow = "any", sort_by: SortBy = "relevance"
) -> tuple[list[Candidate], str | None]:
    """Search YouTube. Returns (light Candidates, note). Candidates lack upload date, likes and channel size.

    YouTube sometimes returns nothing when a sort order is combined with an upload window, even
    though each filter works alone. Then we search by relevance in the same window and sort in
    code, and say so in the note so the model knows the ranking is ours, not YouTube's.
    """
    max_results = max(1, min(max_results, MAX_SEARCH_RESULTS))
    results = _search_once(query, max_results, uploaded_within, sort_by)
    if results or sort_by == "relevance" or uploaded_within == "any":
        return results, None
    results = _search_once(query, MAX_SEARCH_RESULTS, uploaded_within, "relevance")
    if sort_by == "views":
        results.sort(key=lambda c: c.views or 0, reverse=True)
    note = (f"YouTube returned nothing for sort_by={sort_by!r} with uploaded_within={uploaded_within!r}. "
            f"These are the top {MAX_SEARCH_RESULTS} relevance results in that window"
            f"{', re-sorted by views in code' if sort_by == 'views' else ''}.")
    return results[:max_results], note


def _video_url(id_or_url: str) -> str:
    return id_or_url if id_or_url.startswith("http") else f"https://www.youtube.com/watch?v={id_or_url}"


def fetch_videos(ids_or_urls: list[str], max_workers: int = 4) -> tuple[list[Candidate], dict[str, str]]:
    """Full stats for each video. Returns (found, {id: error}) so one bad id never sinks the batch."""
    found: list[Candidate] = []
    errors: dict[str, str] = {}

    def one(key: str) -> tuple[str, Candidate | Exception]:
        try:
            candidate = _to_candidate(_extract(_video_url(key)))
        except Exception as exc:  # yt-dlp raises many types; all become data for the model
            return key, exc
        # For a missing or private video yt-dlp can return a stub instead of raising.
        if candidate.views is None and candidate.posted_on is None:
            return key, LookupError("no metadata returned: the video is missing, private or blocked")
        return key, candidate

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        for key, result in pool.map(one, ids_or_urls):
            if isinstance(result, Exception):
                errors[key] = f"{type(result).__name__}: {str(result)[:200]}"
            else:
                found.append(result)
    return found, errors


def fetch_top_comments(id_or_url: str, n: int = 15) -> list[Comment]:
    """Top-level comments in YouTube's "top" order, most-liked first. Empty if comments are off."""
    info = _extract(_video_url(id_or_url), comments=n)
    raw = [c for c in (info.get("comments") or []) if c.get("parent", "root") == "root" and c.get("text")]
    raw.sort(key=lambda c: c.get("like_count") or 0, reverse=True)
    return [Comment(text=c["text"][:400], likes=c.get("like_count") or 0, by_creator=bool(c.get("author_is_uploader")))
            for c in raw[:n]]


# ---- What the model sees -----------------------------------------------------------------

def _compact(c: Candidate, fields: list[str]) -> dict[str, Any]:
    """Only the fields the model needs, with empty values dropped. Tool output is prompt tokens."""
    data = c.model_dump(mode="json", include=set(fields))
    return {k: data[k] for k in fields if data.get(k) not in (None, "", [])}


SEARCH_FIELDS = ["video_id", "title", "channel", "views", "duration_s", "url"]
STATS_FIELDS = [
    "video_id", "title", "channel", "channel_followers", "posted_on", "duration_s", "views", "likes",
    "comments", "views_per_day", "like_rate", "comment_rate", "views_per_follower", "tags", "description", "url",
]


@tool(parse_docstring=True)
def youtube_search(
    query: str, uploaded_within: UploadWindow = "any", sort_by: SortBy = "relevance", max_results: int = 10
) -> str:
    """Search YouTube videos. Fast and cheap: use it several times with different queries.

    Returns id, title, channel, view count, duration in seconds and URL for each result.
    It does NOT return upload date, likes, comments or channel size: call
    youtube_video_stats on the most promising ids for those.

    Args:
        query: Search terms, e.g. "claymation loop" or "kinetic typography". Specific style names find better examples than generic words.
        uploaded_within: Only videos uploaded in this window. Use "month" or "week" to find what is trending now.
        sort_by: "relevance" (YouTube's default), "views" (most watched first, best for spotting hits) or "date" (newest first).
        max_results: How many results to return, 1 to 20.
    """
    results, note = search_youtube(query, max_results=max_results, uploaded_within=uploaded_within, sort_by=sort_by)
    payload: dict[str, Any] = {"query": query, "uploaded_within": uploaded_within, "sort_by": sort_by,
                               "results": [_compact(c, SEARCH_FIELDS) for c in results]}
    if note:
        payload["note"] = note
    return json.dumps(payload, ensure_ascii=False)


@tool(parse_docstring=True)
def youtube_video_stats(video_ids: list[str]) -> str:
    """Full stats for up to 8 YouTube videos. Slower: a few seconds per video.

    Returns upload date, views, likes, comments, channel follower count, tags and the start of
    the description, plus metrics computed in code: views_per_day, like_rate, comment_rate and
    views_per_follower (above 1 means the video outgrew its channel, a strong viral signal).

    Args:
        video_ids: YouTube video ids (or full URLs) from youtube_search results. At most 8 per call.
    """
    ids = list(dict.fromkeys(video_ids))[:MAX_STATS_PER_CALL]
    found, errors = fetch_videos(ids)
    payload: dict[str, Any] = {"videos": [_compact(c, STATS_FIELDS) for c in found]}
    if errors:
        payload["errors"] = errors
    if len(video_ids) > MAX_STATS_PER_CALL:
        payload["note"] = f"Only the first {MAX_STATS_PER_CALL} ids were fetched. Call again for the rest."
    return json.dumps(payload, ensure_ascii=False)
