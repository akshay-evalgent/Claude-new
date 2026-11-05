#!/usr/bin/env python3
"""Theme radar: where is there proven demand and few copies?

For each theme it runs one YouTube search (top N results, via yt-dlp's flat
search, no video downloads) and reports:

  third_best   views of the 3rd-biggest result: proven demand that is not
               just one lucky outlier
  clone_share  share of results under 1,000 views: how crowded the theme is
               with low-effort copies
  hits_1m      results with 1M+ views
  opportunity  log10(third_best) x (1 - clone_share), a rough ranking only

It can also score one channel's uploads against that channel's own median
(the "outlier score" used in the study).

Usage
  python3 theme_radar.py themes data/themes.txt --n 40 --out data/search
  python3 theme_radar.py summarize data/search            # no network
  python3 theme_radar.py channel https://www.youtube.com/@handle/videos

Needs `pip install yt-dlp` for the network modes. YouTube rate-limits
datacenter IPs; keep a pause between searches (default 2 s).
"""
import argparse
import json
import math
import statistics
import subprocess
import sys
import time
from pathlib import Path

FIELDS = "%(view_count)s|%(duration)s|%(channel)s|%(title)s"


def search(query, n):
    out = subprocess.run(
        ["yt-dlp", "--flat-playlist", "--print", FIELDS, f"ytsearch{n}:{query}"],
        capture_output=True, text=True, timeout=120,
    ).stdout
    return out


def parse(text):
    rows = []
    for line in text.splitlines():
        parts = line.split("|", 3)
        if len(parts) == 4 and parts[0].isdigit():
            rows.append({"views": int(parts[0]), "duration": parts[1],
                         "channel": parts[2], "title": parts[3]})
    return rows


def stats(key, rows):
    views = sorted((r["views"] for r in rows), reverse=True)
    if not views:
        return None
    third = views[min(2, len(views) - 1)]
    clone = sum(v < 1000 for v in views) / len(views)
    return {
        "theme": key,
        "n": len(views),
        "median": int(statistics.median(views)),
        "third_best": third,
        "clone_share": round(clone, 2),
        "hits_1m": sum(v >= 1_000_000 for v in views),
        "opportunity": round(math.log10(max(third, 1)) * (1 - clone), 2),
        "top": [{"views": r["views"], "channel": r["channel"], "title": r["title"]}
                for r in sorted(rows, key=lambda r: -r["views"])[:3]],
    }


def print_table(results):
    results = sorted(results, key=lambda r: -r["opportunity"])
    print(f"{'theme':16} {'3rd best':>13} {'clones':>7} {'1M+':>4} {'score':>6}")
    for r in results:
        print(f"{r['theme']:16} {r['third_best']:>13,} {r['clone_share']:>7.0%} "
              f"{r['hits_1m']:>4} {r['opportunity']:>6.2f}")


def cmd_themes(a):
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    results = []
    for line in Path(a.file).read_text().splitlines():
        if "|" not in line:
            continue
        key, query = line.split("|", 1)
        text = search(query, a.n)
        (out / f"{key}.tsv").write_text(text)
        s = stats(key, parse(text))
        if s:
            results.append(s)
        print(f"{key}: {len(parse(text))} results", file=sys.stderr)
        time.sleep(a.pause)
    Path(out / "theme_stats.json").write_text(json.dumps(results, indent=1))
    print_table(results)


def cmd_summarize(a):
    results = []
    for f in sorted(Path(a.dir).glob("*.tsv")):
        s = stats(f.stem, parse(f.read_text()))
        if s:
            results.append(s)
    if a.json:
        print(json.dumps(results, indent=1))
    else:
        print_table(results)


def cmd_channel(a):
    text = subprocess.run(
        ["yt-dlp", "--flat-playlist", "--print", "%(view_count)s|%(id)s|%(title)s", a.url],
        capture_output=True, text=True, timeout=180,
    ).stdout
    rows = []
    for line in text.splitlines():
        p = line.split("|", 2)
        if len(p) == 3 and p[0].isdigit():
            rows.append((int(p[0]), p[1], p[2]))
    if not rows:
        sys.exit("no uploads returned (rate-limited or wrong URL)")
    med = statistics.median(v for v, _, _ in rows)
    print(f"{len(rows)} uploads, median {med:,.0f} views")
    for v, vid, title in sorted(rows, reverse=True):
        print(f"{v / med:7.1f}x {v:>12,}  {title}  https://youtu.be/{vid}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("themes")
    t.add_argument("file")
    t.add_argument("--n", type=int, default=40)
    t.add_argument("--out", default="data/search")
    t.add_argument("--pause", type=float, default=2.0)
    s = sub.add_parser("summarize")
    s.add_argument("dir")
    s.add_argument("--json", action="store_true")
    c = sub.add_parser("channel")
    c.add_argument("url")
    a = ap.parse_args()
    {"themes": cmd_themes, "summarize": cmd_summarize, "channel": cmd_channel}[a.cmd](a)


if __name__ == "__main__":
    main()
