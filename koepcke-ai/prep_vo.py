"""Places the narration lines on the timeline and estimates word timings -> vo/timeline.json, out/vo.wav"""
import json, re, wave, numpy as np, os

GAPS = [0.0, 0.45, 0.4, 0.45, 0.4, 0.45, 0.3, 0.5, 0.5, 0.45, 0.4, 0.6]   # silence before each line
START = 0.15
SPOKEN = {'1971': 'nineteenseventyone', 'Koepcke': 'Kupka', 'ninetytwo': 'ninetytwo'}


def read(p):
    with wave.open(p) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
    return x, sr


def envelope(x, sr):
    hop = int(sr * 0.01)
    return np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])


def chunk_spans(x, sr, weights):
    """Speech span of each punctuation chunk. Every silence of 30 ms or more inside the line is a candidate break; a
    small dynamic programme picks, in order, the breaks that are long and close to where the chunk lengths predict
    (a predicted break with no silence near it is placed at its predicted time)."""
    e = envelope(x, sr); on = e > max(0.012, e.max() * 0.04)
    idx = np.flatnonzero(on); a0, a1 = idx[0] * 0.01, (idx[-1] + 1) * 0.01
    gaps, i = [], idx[0]
    while i <= idx[-1]:
        if not on[i]:
            j = i
            while not on[j]: j += 1
            if j - i >= 3: gaps.append((i * 0.01, j * 0.01))
            i = j
        else: i += 1
    tot = sum(weights); exp = [a0 + (a1 - a0) * sum(weights[:k + 1]) / tot for k in range(len(weights) - 1)]
    nb = len(exp)
    if nb == 0: return [((a0, a1), [0])]
    cands = sorted(gaps + [(t, t) for t in exp])           # zero-length entries stand for "no silence found here"
    score = lambda g, k: (min(g[1] - g[0], 0.3) * 12 if g[1] > g[0] else -1.0) - abs((g[0] + g[1]) / 2 - exp[k]) * 5
    best = {}                                              # (k, i) -> (total, previous i)
    for i, g in enumerate(cands): best[(0, i)] = (score(g, 0), None)
    for k in range(1, nb):
        for i, g in enumerate(cands):
            prev = [(best[(k - 1, h)][0], h) for h in range(i) if (k - 1, h) in best and cands[h][1] <= g[0]]
            if prev: v, h = max(prev); best[(k, i)] = (v + score(g, k), h)
    end = max((best[(nb - 1, i)][0], i) for i in range(len(cands)) if (nb - 1, i) in best)[1]
    picks, k, i = [], nb - 1, end
    while i is not None: picks.append(cands[i]); i = best[(k, i)][1]; k -= 1
    picks.reverse()
    groups, a, members = [], a0, [0]                       # chunks with no silence between them share one span
    for k, g in enumerate(picks):
        if g[1] > g[0]: groups.append(((a, g[0]), members)); a, members = g[1], [k + 1]
        else: members.append(k + 1)
    groups.append(((a, a1), members))
    return groups


lines = open('vo/lines.txt').read().strip().split('\n')
t, timeline, track, SR = START, [], None, None
for n, text in enumerate(lines):
    x, sr = read(f'vo/l{n + 1}.wav'); SR = sr
    t += GAPS[n]
    words = text.split()
    chunks, cur = [], []                       # chunks of words separated by punctuation
    for w in words:
        cur.append(w)
        if re.search(r'[.,?!]$', w): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    weight = lambda w: len(SPOKEN.get(re.sub(r'[^A-Za-z0-9]', '', w), re.sub(r'[^A-Za-z0-9]', '', w))) + 1.5
    groups = chunk_spans(x, sr, [sum(weight(w) for w in ch) for ch in chunks])
    segs = [g[0] for g in groups]
    lead = segs[0][0]
    wt = []
    for seg, ch in ((g[0], [w for k in g[1] for w in chunks[k]]) for g in groups):
        wts = [weight(w) for w in ch]; tot = sum(wts); a = seg[0]
        for w, k in zip(ch, wts):
            d = (seg[1] - seg[0]) * k / tot; wt.append([w, round(t - lead + a, 3), round(t - lead + a + d, 3)]); a += d
    start = t - lead
    timeline.append({'text': text, 'start': round(start, 3), 'end': round(start + segs[-1][1], 3), 'words': wt, 'aligned': len(chunks) > 1 or True})
    t = start + segs[-1][1]
    print(n + 1, f'{start:6.2f} -> {t:6.2f}', ' | '.join(f'{a:.2f}-{b:.2f}' for a, b in segs))
total = t + 1.6
os.makedirs('out', exist_ok=True)
track = np.zeros(int(total * SR) + SR)
for n, item in enumerate(timeline):
    x, _ = read(f'vo/l{n + 1}.wav'); i = int(item['start'] * SR)
    if i < 0: x = x[-i:]; i = 0
    track[i:i + len(x)] += x
json.dump({'duration': round(total, 2), 'lines': timeline}, open('vo/timeline.json', 'w'), indent=1)
with wave.open('out/vo.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(track, -1, 1) * 32767).astype('<i2').tobytes())
print('total', round(total, 2), 'sr', SR)
