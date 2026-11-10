"""The edit. Places every voice line on the timeline and derives every cut and key moment from the
words, so picture and voice stay locked. Writes src/timeline.json, read by the page and by the mixer."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
take = {r['id']: r for r in json.load(open(root/'vo/takes/bm_george/report.json'))}

placed = {}                     # id -> absolute time the clip starts
def put(lid, speech_at):
    """Place a line so its first word starts at speech_at."""
    placed[lid] = speech_at - take[lid]['words'][0]['s']
    return speech_at
def end(lid):                   # when the last word is finished (Kokoro's last timestamp runs long)
    return placed[lid] + take[lid]['words'][-1]['e'] - 0.22
def word(lid, w, which='s'):
    for x in take[lid]['words']:
        if x['w'].lower().strip(".,?'") == w.lower(): return placed[lid] + x[which]
    raise KeyError(w)

A = {}                          # anchors
put('L1', 0.6)
put('L2', end('L1') + 0.45)
A['midnight'] = end('L2') + 0.55
put('L3', A['midnight'] + 1.5)
put('L4', end('L3') + 0.35)
A['warp'] = word('L4', 'ticks') + 0.55
put('L5', A['warp'] + 0.7)
A['home'] = end('L5') + 1.0
put('L6', A['home'] + 0.5)
A['tick'] = end('L6') + 0.4
put('L7', A['tick'] + 0.3)
A['tick_second'] = word('L7', 'second')
A['clock'] = word('L7', 'is') - 0.06
A['present'] = end('L7') + 0.55
put('L8', A['present'] + 0.9)
put('L9', end('L8') + 0.65)
A['day'] = word('L9', 'back') - 0.12
A['marks'] = end('L9') + 0.4
put('L10', A['marks'] + 0.6)
A['year1'] = word('L10', 'year')
put('L11', end('L10') + 0.55)
A['ten'] = word('L11', 'ten')
A['aged'] = end('L11') + 0.4
put('L12', A['aged'] + 0.7)
A['t23'] = word('L12', 'twenty-three')
A['dawn'] = end('L12') + 0.85
A['touchdown'] = A['dawn'] + 2.7
put('L13', A['touchdown'] - (take['L13']['words'][1]['s'] - take['L13']['words'][0]['s']))   # "lands" on touchdown
A['inside'] = end('L13') + 0.6
put('L14', A['inside'] + 0.6)
A['her'] = end('L14') + 0.5
put('L15', A['her'] + 1.7)
A['watch_end'] = end('L15') + 1.1
put('L16', A['watch_end'] + 0.7)
A['end'] = end('L16') + 1.4

shots = [
  ('watch_open', 0.0, A['midnight']), ('launch', A['midnight'], A['warp']), ('warp', A['warp'], A['home']),
  ('window_normal', A['home'], A['tick']), ('watch_tick', A['tick'], A['clock']), ('clock_spin', A['clock'], A['present']),
  ('present', A['present'], A['day']), ('window_day', A['day'], A['marks']), ('marks', A['marks'], A['aged']),
  ('house_aged', A['aged'], A['dawn']), ('dawn', A['dawn'], A['inside']), ('interior', A['inside'], A['her']),
  ('her', A['her'], A['watch_end']), ('watch_end', A['watch_end'], A['end'])]

# captions: two to four words at a time, shown from the first word's start to the last word's end
caps = []
for lid, at in placed.items():
    ws = take[lid]['words']
    chunk = []
    for i, w in enumerate(ws):
        chunk.append(w)
        nxt = ws[i+1] if i + 1 < len(ws) else None
        gap = (nxt['s'] - w['e']) if nxt else 1.0
        new_sentence = nxt is not None and nxt['w'][:1].isupper() and nxt['w'] not in ('Einstein', 'Santa')
        brk = gap > 0.05 or new_sentence or len(chunk) >= 4 or nxt is None
        if nxt is not None and len(chunk) >= 2 and nxt['w'].lower() in ('and', 'but', 'that', 'on', 'in', 'for', 'is'): brk = True
        if brk:
            text = ' '.join(x['w'] for x in chunk)
            caps.append({'t0': round(at + chunk[0]['s'], 3), 't1': round(at + min(chunk[-1]['e'], chunk[-1]['s'] + 0.9), 3),
                         'text': text, 'who': 'her' if lid == 'L15' else 'narrator'})
            chunk = []
caps.sort(key=lambda c: c['t0'])
merged = []
for c in caps:
    if merged and len(c['text'].split()) == 1 and c['who'] == merged[-1]['who'] and c['t0'] - merged[-1]['t1'] < 0.35 \
       and len(merged[-1]['text'].split()) <= 4 and c['text'] not in ('Ten', 'Twenty-three'):
        merged[-1]['text'] += ' ' + c['text']; merged[-1]['t1'] = c['t1']
    else: merged.append(c)
caps = merged
for a, b in zip(caps, caps[1:]): a['t1'] = min(a['t1'], b['t0'])

out = {'anchors': {k: round(v, 3) for k, v in A.items()},
       'shots': [{'name': n, 't0': round(a, 3), 't1': round(b, 3)} for n, a, b in shots],
       'vo': [{'id': k, 'at': round(v, 3), 'dur': take[k]['dur'], 'who': 'her' if k == 'L15' else 'narrator'} for k, v in placed.items()],
       'captions': caps}
json.dump(out, open(root/'src/timeline.json', 'w'), indent=1)
for s in out['shots']: print(f"{s['name']:14s} {s['t0']:6.2f} -> {s['t1']:6.2f}  ({s['t1']-s['t0']:.2f}s)")
print('total', round(A['end'], 2), 's,', len(caps), 'captions')
