import json, subprocess, sys, statistics
# chstats.py channel_id name [tab]  -> median/top views of last 60 Shorts (or videos), subs
cid, name = sys.argv[1], sys.argv[2]; tab = sys.argv[3] if len(sys.argv) > 3 else "shorts"
r = subprocess.run(["yt-dlp", "--flat-playlist", "-J", "-I", "1:60", f"https://www.youtube.com/channel/{cid}/{tab}"], capture_output=True, text=True, timeout=180)
try: d = json.loads(r.stdout) or {}
except Exception: print(f"{name:28s} ERR {r.stderr[-200:]}"); sys.exit()
v = [e.get("view_count") or 0 for e in d.get("entries", []) if e]
if not v: print(f"{name:28s} no {tab}"); sys.exit()
subs = d.get("channel_follower_count")
r20 = v[:20]
print(f"{name:28s} subs {subs or 0:>11,}  n={len(v):3d}  median {statistics.median(v):>11,.0f}  recent20 median {statistics.median(r20):>11,.0f}  top {max(v):>12,}  over1M {sum(x>=1e6 for x in v)}")
