import json, glob, re, statistics as st, sys
NAMES = r"mr ?beast|ishowspeed|\bspeed\b|kai cenat|pewdiepie|\bksi\b|logan paul|jake paul|\bdream\b|markiplier|jacksepticeye|sidemen|dude perfect|ryan trahan|airrack|mark rober|charli d|khaby|adin ross|\bxqc\b|\bninja\b|david dobrik|james charles|emma chamberlain|sssniperwolf|unspeakable|dantdm|caseoh|jynxzi|duke dennis|druski|n3on|ludwig|moistcr1tikal|penguinz0|dhar mann|zach king|sketch|kick streamer|feastables|lunchly|beast games|stokes twins|ben azelart|brent rivera|lexi rivera|salish|nidal|jordan matter|ryan'?s world|nastya|vlad and niki|t-?series|carryminati|bhuvan bam|technical guruji|triggered insaan|ashish chanchlani|elvish|fukra insaan"
META = r"youtuber|youtubers|you ?tube(?!shorts)|subscriber|\bsubs\b|sub count|play button|streamer|influencer|tiktoker|content creator|\bcreator\b|went viral|viral video|\bmeme\b|\bmemes\b|internet|algorithm|\bviews\b|cancel+ed|exposed|\bdrama\b|\bchannel\b|monetiz|adsense|thumbnail|first video|lost media|\bvlog|twitch|\bkick\b|fanum|rizz"
KW = re.compile(NAMES + "|" + META, re.I)
strip = lambda t: re.sub(r"#\w+", " ", t)
rows = []
for f in glob.glob('hist/*.json'):
    try: d = json.load(open(f)) or {}
    except Exception: continue
    es = [e for e in d.get('entries', []) if e]
    v = [e.get('view_count') or 0 for e in es]
    if len(v) < 8: continue
    titles = [e.get('title') or '' for e in es]
    hit = [bool(KW.search(strip(t))) for t in titles]
    rows.append(dict(cid=d.get('channel_id') or f.split('/')[-1][:-5], name=d.get('channel') or '', handle=d.get('uploader_id') or '', subs=d.get('channel_follower_count') or 0,
                     n=len(v), med=st.median(v), med20=st.median(v[:20]), mx=max(v), m1=sum(x >= 1e6 for x in v), rel=sum(hit) / len(hit),
                     titles=titles[:14], top=[(x, t) for x, t in sorted(zip(v, titles), reverse=True)[:6]], ids=[e['id'] for e in es[:40]], views=v[:40]))
json.dump(rows, open('ranked.json', 'w'))
print(len(rows), 'channels with 8+ shorts')
