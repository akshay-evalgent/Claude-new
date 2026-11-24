# audio2.py: segment-two sound (Biff's voice out, new lines in) + caption words -> seg2_audio.wav, seg2_words.json
import sys, json, re, numpy as np, soundfile as sf
sys.path.insert(0, "/home/user/Claude-new/shorts"); import render as rd; import music as mu
import pyloudnorm as pyln
SR = 44100; rd.SR = SR
nov, _ = sf.read("novocals.wav", dtype="float32"); voc, _ = sf.read("vocals.wav", dtype="float32")
BIFF = [(1.1, 2.9), (3.1, 6.25), (6.8, 7.95), (8.6, 10.55), (13.35, 13.98), (17.05, 18.5), (22.5, 24.4), (32.75, 34.3), (34.5, 35.6), (35.75, 38.7), (39.0, 40.3)]
gate = np.ones(len(voc), np.float32)
for a, b in BIFF: gate[int(a * SR):min(len(gate), int(b * SR))] = 0
gate = np.convolve(gate, np.ones(int(0.03 * SR)) / int(0.03 * SR), "same")
base = nov + voc * gate[:, None]
meter = pyln.Meter(SR)
g_l = meter.integrated_loudness(voc[int(25.7 * SR):int(32.1 * SR)])        # George's long line sets the level
ir = mu.reverb_ir(0.5); words = []
for L in json.load(open("lines.json")):
    y, _ = sf.read(L["wav"], dtype="float32"); y = y if y.ndim == 1 else y.mean(1)
    y = y * 10 ** ((g_l - meter.integrated_loudness(y)) / 20)
    wet = mu.convolve(np.stack([y, y], 1), ir); y2 = np.stack([y, y], 1) * 0.88 + wet[:len(y)] * 0.12
    p = int(L["t"] * SR); n = min(len(y2), len(base) - p); base[p:p + n] += y2[:n]
    for w in rd.align_script_words(L["text"], rd.word_times(L["wav"])): words.append({"t0": L["t"] + w["s"], "t1": L["t"] + w["e"], "w": w["w"], "who": "fig"})
OTHERS = [(14.04, 16.34, "Well, now, of course not, Biff. I wouldn't want that to happen."),
          (18.84, 20.48, "Hey, Biff, get a load of this guy's life preserver."),
          (21.36, 22.42, "Dork thinks he's gonna drown."),
          (25.68, 26.76, "Uh, OK, Biff."), (26.86, 29.24, "Well, I'll, uh, I'll finish that on up tonight,"),
          (29.24, 30.82, "and then I'll, uh, bring it over"), (30.82, 32.14, "first thing tomorrow morning."),
          (41.02, 41.92, "All right, bye-bye.")]
tx = [w for r in json.load(open("/tmp/claude-0/-home-user-Claude-new/9fad38f2-db19-5f82-b2b1-4b07b421ac0c/scratchpad/bttf/tx/Qfs38mrZF-4.json")) for w in r["w"]]
for a, b, text in OTHERS:
    toks = text.split(); heard = [(w[0] - 44.812, w[1] - 44.812) for w in tx if a - 0.05 <= w[0] - 44.812 < b]
    if len(heard) == len(toks): times = heard
    else:                                                       # spread by length when the transcript misheard the count
        lens = np.array([len(t) + 2 for t in toks], float); edges = a + (b - a) * np.concatenate([[0], np.cumsum(lens) / lens.sum()])
        times = list(zip(edges[:-1], edges[1:]))
    for (s, e), t in zip(times, toks): words.append({"t0": float(s), "t1": float(e), "w": t, "who": "other"})
words.sort(key=lambda w: w["t0"])
dur = 1036 / (24000 / 1001); base = base[:int(dur * SR)]
lim = 10 ** (-2 / 20)
for _ in range(3):
    base = base * 10 ** ((-14 - meter.integrated_loudness(base)) / 20)
    if np.abs(base).max() > lim: base = np.tanh(base / lim) * lim
sf.write("seg2_audio.wav", base.astype(np.float32), SR); json.dump(words, open("seg2_words.json", "w"))
print("seg2 audio", len(base) / SR, "words", len(words))
