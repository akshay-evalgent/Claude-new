import os
import json, sys, re, statistics as st, xml.etree.ElementTree as ET
S = os.path.join(os.environ.get("SPIKE_WORK", "."), "bo")
ns = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015', 'm': 'http://search.yahoo.com/mrss/'}
for cid, name in json.load(open(f"{S}/sel.json")):
    if len(sys.argv) > 1 and name not in sys.argv[1:]: continue
    d = json.load(open(f"{S}/full/{cid}.json")) or {}
    es = [e for e in d.get('entries', []) if e][::-1]; v = [e.get('view_count') or 0 for e in es]
    try:
        root = ET.fromstring(open(f"{S}/rss/{cid}.xml").read())
        created = root.find('a:published', ns).text[:10]
        rss = [(x.find('yt:videoId', ns).text, x.find('a:published', ns).text[:10], int(x.find('m:group/m:community/m:statistics', ns).get('views')), (x.find('m:group/m:description', ns).text or '')[:120].replace('\n', ' ')) for x in root.findall('a:entry', ns)]
    except Exception as ex:
        created, rss = '?', []
    print(f"\n===== {name}  subs {d.get('channel_follower_count'):,}  shorts {len(v)}  channel created {created}  total views {sum(v):,}")
    print(" ".join(f"{i+1}:{x//1000}k" for i, x in enumerate(v)))
    big = max(range(len(v)), key=lambda i: v[i])
    print(f"top: #{big+1} {v[big]:,} {es[big]['title'][:90]}")
    for i in range(len(v)):
        pre = st.median(v[:i]) if i >= 5 else None
        if pre is not None and v[i] >= 1e6 and v[i] >= 20 * max(pre, 1):
            print(f"breakout #{i+1} {v[i]:,} (median before {pre:,.0f}) {es[i]['title'][:90]}  id={es[i]['id']}")
            for j in range(max(0, i-4), min(len(v), i+5)): print(f"   #{j+1:3d} {v[j]:>11,}  {es[j]['title'][:80]}  {es[j]['id']}")
            break
    for vid, pub, views, desc in rss[:6]:
        idx = next((k+1 for k, e in enumerate(es) if e['id'] == vid), None)
        print(f"   rss #{idx} {pub} {views:>11,} | {desc}")
