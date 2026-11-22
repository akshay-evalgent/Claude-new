import subprocess, sys, json, os, urllib.parse
from concurrent.futures import ThreadPoolExecutor
S = __import__('os').environ.get('RESEARCH_WORK', '.')
SP = {"today": "CAMSAggC", "week": "CAMSAggD", "month": "CAMSAggE", "year": "CAMSAggF"}      # sorted by view count, uploaded this week/month/year
def go(qf):
    q, f = qf
    out = f"{S}/search/{''.join(c if c.isalnum() else '_' for c in q)}__{f}.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return 1
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}&sp={SP[f]}"
    try:
        r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "-I", "1:60", url], capture_output=True, text=True, timeout=170)
        open(out, "w").write(r.stdout); return int(len(r.stdout) > 100)
    except Exception: return 0
qs = [l.strip() for l in open(sys.argv[1]) if l.strip()]; fs = sys.argv[2].split(",")
with ThreadPoolExecutor(6) as ex: print(sum(ex.map(go, [(q, f) for q in qs for f in fs])), "of", len(qs) * len(fs))
