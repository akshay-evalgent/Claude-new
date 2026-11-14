#!/usr/bin/env python3
"""Which comedy videos passed a million views within days of upload?

Asks YouTube search for the most-viewed videos uploaded today / this week / this
month for a list of comedy search terms, removes films, live streams and kids'
content, and prints the hits with their length and channel, plus a summary of
what the million-view videos have in common. Needs yt-dlp (search only, no
downloads).

  python3 chatvid/tools/trending.py                      # this week, default terms
  python3 chatvid/tools/trending.py --when today
  python3 chatvid/tools/trending.py --when week "ai comedy" "roast" --json out.json
"""
import argparse, collections, concurrent.futures as cf, json, re, subprocess, urllib.parse

# YouTube search filters: sort by view count + upload date + type "video"
SP = {"today": "CAMSBAgCEAE%253D", "week": "CAMSBAgDEAE%253D", "month": "CAMSBAgEEAE%253D"}
TERMS = ["comedy", "funny video", "comedy sketch", "stand up comedy", "roast", "skit", "parody", "satire",
         "comedy show", "comedy hindi", "funny animation", "ai comedy", "meme review", "prank", "comedy podcast"]
NOT_COMEDY = re.compile(r"full movie|hindi dubbed|movie in hindi|south indian|\blive\b|🔴|asmr|cricket|gameplay|natok|"
                        r"kids dance|rhymes|logo effect|dead at|superhit|blockbuster|bollywood movie|comedy movie")


def search(term, when, n):
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(term)}&sp={SP[when]}"
    r = subprocess.run(["yt-dlp", "--flat-playlist", "--playlist-end", str(n), "--print",
                        "%(view_count)s\t%(duration)s\t%(channel)s\t%(title)s\t%(id)s", url],
                       capture_output=True, text=True, timeout=240)
    out = []
    for line in r.stdout.splitlines():
        p = line.split("\t")
        if len(p) == 5 and p[0].isdigit():
            out.append({"views": int(p[0]), "dur": float(p[1]) if p[1].replace(".", "").isdigit() else None,
                        "channel": p[2], "title": p[3], "id": p[4], "term": term})
    return out


def bucket(d):
    if d is None:
        return "?"
    for lim, name in ((60, "<1m"), (240, "1-4m"), (600, "4-10m"), (1500, "10-25m"), (3600, "25-60m")):
        if d < lim:
            return name
    return "60m+"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("terms", nargs="*", default=TERMS)
    ap.add_argument("--when", choices=list(SP), default="week")
    ap.add_argument("--per-term", type=int, default=40)
    ap.add_argument("--min-views", type=float, default=1e6)
    ap.add_argument("--json", help="also write every result here")
    a = ap.parse_args()
    with cf.ThreadPoolExecutor(4) as ex:
        found = list(ex.map(lambda t: search(t, a.when, a.per_term), a.terms))
    vids = {}
    for rs in found:
        for v in rs:
            vids.setdefault(v["id"], v)
    comedy = [v for v in vids.values() if not NOT_COMEDY.search(v["title"].lower()) and (v["dur"] or 0) <= 5400]
    hits = sorted((v for v in comedy if v["views"] >= a.min_views), key=lambda v: -v["views"])
    if a.json:
        json.dump(sorted(vids.values(), key=lambda v: -v["views"]), open(a.json, "w"), ensure_ascii=False, indent=1)
    print(f"{len(vids)} videos uploaded this {a.when} ({len(comedy)} after removing films, streams and kids' content); "
          f"{len(hits)} have {a.min_views / 1e6:g}M+ views\n")
    for v in hits:
        d = v["dur"]
        ds = f"{int(d // 60)}:{int(d % 60):02d}" if d else "?"
        print(f"{v['views'] / 1e6:6.1f}M {ds:>7}  {v['channel'][:24]:24} {v['title'][:84]}")
    if hits:
        b = collections.Counter(bucket(v["dur"]) for v in hits)
        ch = collections.Counter(v["channel"] for v in hits)
        print("\nlength:", "  ".join(f"{k} {b[k]}" for k in ("<1m", "1-4m", "4-10m", "10-25m", "25-60m", "60m+")))
        print("channels with more than one hit:", ", ".join(f"{c} ({n})" for c, n in ch.most_common() if n > 1) or "none")
        print("watch: https://www.youtube.com/watch?v=<id> for any id in the --json file")


if __name__ == "__main__":
    main()
