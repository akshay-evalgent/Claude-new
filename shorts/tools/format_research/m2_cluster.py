import json, re, statistics as st, sys
rows = json.load(open('ranked.json')); strip = lambda t: re.sub(r"#\w+", " ", t)
CL = {
 "A then-vs-now / evolution of creators": r"then\s*(vs\.?|and|&)\s*now|evolution of|\(\d{4}\s*[-–]\s*\d{4}\)|before and after|glow ?up|with (dad|mom|siblings?|pets?)|as (kids|babies)|childhood",
 "B 'When [creator] did X' recaps": r"^\s*when\s+\w+|^the time |that time ",
 "C creator / SMP lore and news": r"\bsmp\b|\blore\b|banned|exposed|drama|just (got|did|said)|arrested|quit|leaving|beef|respond",
 "D meme comparisons / edits": r"original vs|vs phonk|\bmeme|\bedit\b",
 "E streamer / creator clips": r"\bclip|funny moments|best moments|rage|reacts?\b|got humbled|was not ready|chat is this",
 "F data comparisons": r"comparison|\bvs\b.*(subscribers|net worth)|ranked|richest|most subscribed|probability",
 "G facts / did-you-know about creators": r"facts?\b|did you know|secret|you didn.t know|how much .* (make|paid|earn)|net worth",
}
ONT = re.compile(r"youtuber|youtube|mr ?beast|ishowspeed|\bspeed\b|kai cenat|pewdiepie|\bksi\b|caylus|foltyn|preston|unspeakable|aphmau|flamingo|kreekcraft|dantdm|ssundee|jynxzi|caseoh|sketch|streamer|influencer|tiktoker|creator|\bmeme|subscriber|\bsmp\b|dream\b|markiplier|logan paul|lankybox|\bcash\b|\bnico\b|steak|nastya|ryan|diana|a4|vlad", re.I)
out = {}
for name, pat in CL.items():
    rx = re.compile(pat, re.I); sel = []
    for r in rows:
        ts = [strip(t) for t in r['titles']]
        share = sum(bool(rx.search(t)) for t in ts) / len(ts); ont = sum(bool(ONT.search(t)) for t in ts) / len(ts)
        if share >= 0.4 and ont >= 0.3 and r['n'] >= 12: sel.append(dict(r, share=share, ont=ont))
    sel.sort(key=lambda r: -r['med20']); out[name] = sel
    small = [r for r in sel if r['subs'] < 300_000]
    print(f"\n### {name}: {len(sel)} channels | median of their recent-20 medians {st.median([r['med20'] for r in sel]) if sel else 0:,.0f} | under 300K subs: {len(small)}, their median {st.median([r['med20'] for r in small]) if small else 0:,.0f}")
    for r in sel[:14]:
        print(f"  {r['name'][:22]:22s} {r['handle'][:18]:18s} subs {r['subs']:>9,} n={r['n']:3d} med {r['med']/1e3:>6,.0f}K r20 {r['med20']/1e3:>6,.0f}K 1M+ {r['m1']:3d} | {strip(r['titles'][0])[:44]} | {strip(r['titles'][4])[:36]}")
json.dump({k: [dict(cid=r['cid'], name=r['name'], handle=r['handle'], subs=r['subs'], n=r['n'], med=r['med'], med20=r['med20'], m1=r['m1']) for r in v] for k, v in out.items()}, open('clusters.json', 'w'))
