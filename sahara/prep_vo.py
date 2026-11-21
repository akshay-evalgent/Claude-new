"""Places the narration lines on the timeline and estimates word timings -> vo/timeline.json, out/vo.wav"""
import json, re, wave, numpy as np, os

GAPS = [0.0, 0.45, 0.4, 0.45, 0.4, 0.45, 0.3, 0.5, 0.5, 0.45, 0.4, 0.6]   # silence before each line
START = 0.15
SPOKEN = {'1994,': 'nineteenninetyfour', '1994': 'nineteenninetyfour'}


def read(p):
    with wave.open(p) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
    return x, sr


def segments(x, sr, min_gap=0.085):
    hop = int(sr * 0.01); e = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
    on = e > max(0.012, e.max() * 0.04); segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            segs.append([i * 0.01, j * 0.01]); i = j
        else: i += 1
    out = []
    for s in segs:
        if out and s[0] - out[-1][1] < min_gap: out[-1][1] = s[1]
        else: out.append(s)
    return out


lines = open('vo/lines.txt').read().strip().split('\n')
t, timeline, track, SR = START, [], None, None
for n, text in enumerate(lines):
    x, sr = read(f'vo/l{n + 1}.wav'); SR = sr
    t += GAPS[n]
    segs = segments(x, sr)
    lead = segs[0][0]
    words = text.split()
    chunks, cur = [], []                       # chunks of words separated by punctuation
    for w in words:
        cur.append(w)
        if re.search(r'[.,?!]$', w): chunks.append(cur); cur = []
    if cur: chunks.append(cur)
    while len(segs) > len(chunks):              # merge the shortest pauses: those fall inside a phrase
        g = min(range(len(segs) - 1), key=lambda k: segs[k + 1][0] - segs[k][1]); segs[g:g + 2] = [[segs[g][0], segs[g + 1][1]]]
    if len(segs) != len(chunks): segs = [[segs[0][0], segs[-1][1]]]; chunks = [words]
    wt = []
    for seg, ch in zip(segs, chunks):
        wts = [len(SPOKEN.get(re.sub(r'[^A-Za-z0-9]', '', w), re.sub(r'[^A-Za-z0-9]', '', w))) + 1.5 for w in ch]; tot = sum(wts); a = seg[0]
        for w, k in zip(ch, wts):
            d = (seg[1] - seg[0]) * k / tot; wt.append([w, round(t - lead + a, 3), round(t - lead + a + d, 3)]); a += d
    start = t - lead
    timeline.append({'text': text, 'start': round(start, 3), 'end': round(start + segs[-1][1], 3), 'words': wt, 'aligned': len(chunks) > 1 or True})
    t = start + segs[-1][1]
    print(n + 1, f'{start:6.2f} -> {t:6.2f}', 'segs', len(segments(x, sr)), 'chunks', len(chunks))
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
