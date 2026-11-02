"""Fetch candidate open-source repos for Zero Cost AI posts from the GitHub search API.

Usage:
  python3 scripts/fetch_repos.py --topics ai-agents,automation,workflow,crm,chatbot --min-stars 3000 --out data/candidates.json

Writes a JSON list with name, url, stars, description, topics, license, last push.
Unauthenticated: ~10 searches/min. Set GITHUB_TOKEN for higher limits.
"""
import argparse, json, os, time, urllib.parse, urllib.request

def search(q, per_page=15):
    url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode(
        {"q": q, "sort": "stars", "order": "desc", "per_page": per_page})
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "zero-cost-ai"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return json.load(r)["items"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topics", default="ai-agents,automation,workflow-automation,chatbot,crm,no-code")
    ap.add_argument("--min-stars", type=int, default=3000)
    ap.add_argument("--pushed-after", default="2026-06-01")
    ap.add_argument("--out", default="data/candidates.json")
    a = ap.parse_args()
    seen, rows = set(), []
    for t in a.topics.split(","):
        q = f"topic:{t} stars:>{a.min_stars} pushed:>{a.pushed_after}"
        try:
            items = search(q)
        except Exception as e:
            print("skip", t, e); continue
        for it in items:
            if it["full_name"] in seen: continue
            seen.add(it["full_name"])
            rows.append({
                "name": it["full_name"], "url": it["html_url"], "stars": it["stargazers_count"],
                "description": it["description"] or "", "topics": it.get("topics", []),
                "license": (it.get("license") or {}).get("spdx_id"), "pushed": it["pushed_at"][:10],
                "topic_query": t,
            })
        time.sleep(6.5)  # stay under unauthenticated search limit
    rows.sort(key=lambda r: -r["stars"])
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    json.dump(rows, open(a.out, "w"), indent=2)
    print(f"{len(rows)} repos -> {a.out}")
    for r in rows[:20]:
        print(f'{r["stars"]:>7}  {r["name"]:<40} {r["description"][:60]}')

if __name__ == "__main__":
    main()
