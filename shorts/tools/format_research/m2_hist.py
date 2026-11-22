import subprocess, sys, json, os
from concurrent.futures import ThreadPoolExecutor
S = __import__('os').environ.get('RESEARCH_WORK', '.')
N = sys.argv[2] if len(sys.argv) > 2 else "120"
def go(c):
    cid = c[0]; out = f"{S}/hist/{cid}.json"
    if os.path.exists(out) and os.path.getsize(out) > 100: return 1
    try:
        r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "-I", f"1:{N}", f"https://www.youtube.com/channel/{cid}/shorts"], capture_output=True, text=True, timeout=200)
        open(out, "w").write(r.stdout); return int(len(r.stdout) > 100)
    except Exception: return 0
cands = json.load(open(sys.argv[1]))
with ThreadPoolExecutor(6) as ex: print(sum(ex.map(go, cands)), "of", len(cands))
