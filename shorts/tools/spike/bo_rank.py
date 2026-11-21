import json, glob, statistics as st, sys
rows = []
for f in glob.glob('hist/*.json'):
    try: d = json.load(open(f)) or {}
    except Exception: continue
    es = [e for e in d.get('entries', []) if e][::-1]          # oldest -> newest
    v = [e.get('view_count') or 0 for e in es]
    n = len(v)
    if n < 12: continue
    subs = d.get('channel_follower_count') or 0
    best = None
    for i in range(8, n):
        pre = st.median(v[:i])
        if v[i] >= 1_000_000 and v[i] >= 20 * max(pre, 1):
            post = v[i:]
            if len(post) >= 3:
                pm = st.median(post)
                best = dict(i=i, pre=pre, post=pm, hit=v[i], after_1m=sum(x >= 1e6 for x in post), n_after=len(post))
            break
    rows.append(dict(cid=d.get('channel_id') or f.split('/')[-1][:-5], name=d.get('channel') or d.get('title'), subs=subs, n=n,
                     full=n < 400, maxv=max(v), med=st.median(v), b=best,
                     t_hit=es[best['i']]['title'] if best else '', t_pre=[e['title'] for e in es[max(0, best['i']-3):best['i']]] if best else []))
json.dump(rows, open('ranked.json', 'w'))
sus = [r for r in rows if r['b'] and r['b']['post'] >= 5 * max(r['b']['pre'], 1) and r['b']['pre'] <= 50000]
sus.sort(key=lambda r: -(r['b']['post'] / max(r['b']['pre'], 1)) * (1.5 if r['full'] else 1))
print('channels', len(rows), 'sustained breakouts', len(sus))
for r in sus[:45]:
    b = r['b']
    print(f"{r['name'][:26]:26s} subs {r['subs']:>10,} n={r['n']:3d}{'' if r['full'] else '+'} #{b['i']+1:<3d} pre {b['pre']:>9,.0f} hit {b['hit']:>11,} post {b['post']:>10,.0f} 1M+after {b['after_1m']:>3d}/{b['n_after']:<3d} | {r['t_hit'][:55]}")
print('--- tiny subs, huge views')
tiny = sorted([r for r in rows if r['subs'] and r['subs'] < 20000 and r['maxv'] >= 3_000_000], key=lambda r: -r['maxv'] / r['subs'])
for r in tiny[:20]:
    print(f"{r['name'][:26]:26s} subs {r['subs']:>8,} n={r['n']:3d} max {r['maxv']:>12,} median {r['med']:>9,.0f}")
