import subprocess, sys, json, os
from concurrent.futures import ThreadPoolExecutor
S = __import__('os').environ.get('RESEARCH_WORK', '.')
def go(q):
    out = f"{S}/rel/{''.join(c if c.isalnum() else '_' for c in q)}.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return 1
    try:
        r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", f"ytsearch45:{q} #shorts"], capture_output=True, text=True, timeout=170)
        open(out, "w").write(r.stdout); return int(len(r.stdout) > 100)
    except Exception: return 0
qs = [l.strip() for l in open(sys.argv[1]) if l.strip()]
with ThreadPoolExecutor(6) as ex: print(sum(ex.map(go, qs)), "of", len(qs))
