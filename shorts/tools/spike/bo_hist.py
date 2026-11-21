import os
import subprocess, sys, json, os
from concurrent.futures import ThreadPoolExecutor
S = os.environ.get("SPIKE_WORK", ".")
def go(c):
    cid = c[0]; out = f"{S}/bo/hist/{cid}.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return 1
    r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "-I", "1:400", f"https://www.youtube.com/channel/{cid}/shorts"],
                       capture_output=True, text=True, timeout=200)
    open(out, "w").write(r.stdout); return int(len(r.stdout) > 100)
cands = json.load(open(sys.argv[1]))
with ThreadPoolExecutor(6) as ex: print(sum(ex.map(go, cands)), "of", len(cands))
