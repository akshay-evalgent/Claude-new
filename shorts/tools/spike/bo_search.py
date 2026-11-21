import os
import subprocess, sys, json, os, urllib.parse
from concurrent.futures import ThreadPoolExecutor
S = os.environ.get("SPIKE_WORK", ".")
SP = {"week": "CAMSAggD", "month": "CAMSAggE"}
def go(qf):
    q, f = qf
    out = f"{S}/bo/search/{''.join(c if c.isalnum() else '_' for c in q)}_{f}.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return out, "cached"
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(q)}&sp={SP[f]}"
    r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "-I", "1:40", url], capture_output=True, text=True, timeout=150)
    open(out, "w").write(r.stdout)
    try: n = len((json.loads(r.stdout) or {}).get("entries", []))
    except Exception: n = -1
    return out, n
qs = [l.strip() for l in open(sys.argv[1]) if l.strip()]
jobs = [(q, f) for q in qs for f in ("week", "month")]
with ThreadPoolExecutor(6) as ex:
    res = list(ex.map(go, jobs))
print(len(res), "searches;", sum(1 for _, n in res if isinstance(n, int) and n > 0), "with results")
