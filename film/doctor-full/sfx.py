"""Music, effects and the final mix for the full film.

Inputs: build/timeline.json (shots, words, chapters), build/cues.json (from `node render.mjs cues`),
        build/voice.wav. Output: build/mix.wav (48 kHz stereo, -14 LUFS).
Effects come from the cue sheet the animation itself produced, so they land on the frame.
Music changes mood by chapter (see the "= name mood" lines in script.txt).
"""
import json, os, subprocess
import numpy as np
from scipy.signal import lfilter, butter, sosfilt
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, "build")
SR = 48000
TL = json.load(open(os.path.join(B, "timeline.json")))
CUES = json.load(open(os.path.join(B, "cues.json")))
DUR = TL["duration"]
N = int(np.ceil(DUR * SR)) + SR
rng = np.random.default_rng(7)
f32 = np.float32


def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
def fade(x, fi=0.01, fo=0.05):
    n = len(x); a, b = min(n, int(fi * SR)), min(n, int(fo * SR))
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[n - b:] *= np.linspace(1, 0, b)
    return x


# ---------- effects ----------
def pop(f0=420, f1=980):
    n = int(0.12 * SR); f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.035) * 0.45
def scribble(d=0.35, amp=0.16):
    n = max(1, int(d * SR)); x = bp(rng.standard_normal(n), 1800, 5200)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (14 + 6 * rng.random()) * np.arange(n) / SR) ** 2
    return fade(x * am * amp, 0.01, 0.06)
def whoosh(d=0.6, rev=False, lo=300, hi=3000, amp=0.3):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); y = 0.0
    fc = np.geomspace(lo, hi, n) if not rev else np.geomspace(hi, lo, n)
    a = np.exp(-2 * np.pi * fc / SR)
    for i in range(n):
        y = (1 - a[i]) * x[i] + a[i] * y; out[i] = y
    out = hp(out, 120); t = np.linspace(0, 1, n)
    out *= np.sin(np.pi * t ** (0.6 if not rev else 1.6)) ** 2
    return out / (np.abs(out).max() + 1e-9) * amp
def rewind():
    d = 1.1; n = int(d * SR); t = np.arange(n) / SR
    f = np.geomspace(1300, 160, n) * (1 + 0.04 * np.sin(2 * np.pi * 9 * t))
    return whoosh(d, rev=True, lo=250, hi=5000, amp=0.3) + np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.12
def tick(f=2600, amp=0.14):
    n = int(0.03 * SR); return bp(rng.standard_normal(n), f * 0.7, f * 1.3) * env(n, 0.0005, 0.006) * amp * 3
def chime(f=1567.98, amp=0.14):
    n = int(2.0 * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / d) for k, a, d in [(1, 1, 0.9), (2.76, 0.45, 0.4), (5.4, 0.25, 0.18)])
    return fade(x * amp * np.minimum(1, t / 0.003), 0.0, 0.2)
def thud(f=80, amp=0.4):
    n = int(0.35 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.5 * np.exp(-t / 0.02))
    return (np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.09) + lp(rng.standard_normal(n), 900) * np.exp(-t / 0.02) * 0.6) * amp
def scrape(d=0.25, amp=0.12):
    n = int(d * SR); return fade(bp(rng.standard_normal(n), 2500, 7000) * np.sin(np.pi * np.arange(n) / n) * amp, 0.01, 0.03)


# ---------- ambience beds ----------
def bed(kind, d):
    n = int(d * SR); t = np.arange(n) / SR
    if kind == "wind":
        x = bp(rng.standard_normal(n), 150, 1200) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1) * np.sin(2 * np.pi * 0.11 * t)) * 0.045
    elif kind == "gust":
        x = bp(rng.standard_normal(n), 200, 2200) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.4 * t) ** 2) * 0.10
    elif kind == "cold":
        x = bp(rng.standard_normal(n), 300, 2600) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.17 * t)) * 0.09
    elif kind == "hum":
        x = (np.sin(2 * np.pi * 60 * t) + 0.6 * np.sin(2 * np.pi * 120 * t) + 0.25 * np.sin(2 * np.pi * 180 * t)) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t))
        x = (x + lp(rng.standard_normal(n), 400) * 0.5) * 0.05
    elif kind == "fire":
        base = lp(rng.standard_normal(n), 500) * 0.25
        clicks = np.zeros(n)
        for i in np.where(rng.random(n) < 20 / SR)[0]:
            m = min(n - i, int(0.012 * SR)); clicks[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0015 * SR)) * (0.3 + rng.random())
        x = (base + hp(clicks, 1200)) * 0.22
    elif kind == "flies":
        out = np.zeros(n)
        for k in range(3):
            f = (190 + 35 * k) * (1 + 0.06 * np.sin(2 * np.pi * (5 + k) * t + k)); ph = np.cumsum(f) / SR
            out += (2 * (ph % 1) - 1) * (0.5 + 0.5 * np.sin(2 * np.pi * (0.7 + 0.3 * k) * t + k * 2)) ** 2
        x = bp(out, 180, 3000) * 0.035
    elif kind == "night":
        x = np.zeros(n)
        for k in range(2):
            f0 = 4200 + 600 * k
            chirp = (np.sin(2 * np.pi * (2.5 + k) * t) > 0.6) * (np.sin(2 * np.pi * 28 * t) > 0)
            x += np.sin(2 * np.pi * f0 * t) * chirp * 0.012
        x = x + lp(rng.standard_normal(n), 300) * 0.01
    elif kind == "water":
        x = lp(rng.standard_normal(n), 700) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * t) ** 2) * 0.05
    elif kind == "jungle":
        x = lp(rng.standard_normal(n), 800) * 0.012
        for i in np.where(rng.random(n) < 1.6 / SR)[0]:
            m = min(n - i, int(0.18 * SR)); tt = np.arange(m) / SR; f0 = 2200 + rng.random() * 2200
            x[i:i + m] += np.sin(2 * np.pi * (f0 + 900 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.sin(np.pi * tt / tt[-1]) * 0.035
    elif kind == "bees":
        f = 230 * (1 + 0.04 * np.sin(2 * np.pi * 7 * t)); ph = np.cumsum(f) / SR
        x = bp(2 * (ph % 1) - 1, 200, 2500) * 0.03
    else:
        return np.zeros(n)
    return fade(x, 0.4, 0.4)


# ---------- music ----------
def note(name):
    i = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]] + (1 if "#" in name else -1 if "b" in name[1:-1] else 0)
    return 440 * 2 ** ((i + 12 * (int(name[-1]) + 1) - 69) / 12)
def kalimba(f, d=1.4, amp=0.2):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.22 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05) + 0.12 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.3)
    return fade(x * np.minimum(1, t / 0.002) * amp, 0.0, 0.1)
def bell(f, d=2.4, amp=0.12):
    n = int(d * SR); t = np.arange(n) / SR
    return fade(sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / dd) for k, a, dd in [(1, 1, 1.2), (2.0, 0.3, 0.6), (3.01, 0.15, 0.3)]) * amp * np.minimum(1, t / 0.004), 0, 0.2)
def pad(freqs, d, amp=0.035, shimmer=False):
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for f in freqs:
        for det in (-0.6, 0.6):
            x += np.sin(2 * np.pi * (f + det) * t)
        if shimmer: x += 0.25 * np.sin(2 * np.pi * f * 4 * t) * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))
    e = np.minimum(1, t / 0.6) * np.minimum(1, np.maximum(0, d - t) / 0.8)
    return lp(x, 1600) * e * amp

MOODS = {
    "curious": dict(bpm=84, prog=[("C", "CEG"), ("G", "GBD"), ("A", "ACE"), ("F", "FAC")], minor=False, arp=8, inst="kalimba", oct=5, pulse=False, shimmer=False),
    "tense": dict(bpm=70, prog=[("A", "ACE"), ("F", "FAC"), ("A", "ACE"), ("E", "EG#B")], arp=4, inst="kalimba", oct=4, pulse=True, shimmer=False),
    "wonder": dict(bpm=72, prog=[("F", "FAC"), ("C", "CEG"), ("A", "ACE"), ("G", "GBD")], arp=4, inst="bell", oct=5, pulse=False, shimmer=True),
    "cold": dict(bpm=66, prog=[("D", "DFA"), ("B", "BbDF"), ("F", "FAC"), ("C", "CEG")], arp=4, inst="bell", oct=5, pulse=False, shimmer=True),
    "warm": dict(bpm=80, prog=[("C", "CEG"), ("A", "ACE"), ("F", "FAC"), ("G", "GBD")], arp=8, inst="kalimba", oct=5, pulse=False, shimmer=False),
}
def chord_notes(spec, octv):
    out, i = [], 0
    while i < len(spec):
        nm = spec[i]; i += 1
        if i < len(spec) and spec[i] in "#b": nm += spec[i]; i += 1
        out.append(nm)
    res, prev = [], -1
    for nm in out:
        f = note(nm + str(octv))
        while f <= prev: f *= 2
        res.append(f); prev = f
    return res
def section(mood, t0, t1, L, R, last=False):
    M = MOODS.get(mood)
    if not M: return
    beat = 60 / M["bpm"]; bar = 4 * beat
    tmpL = np.zeros(int((t1 - t0 + 4) * SR), f32); tmpR = np.zeros_like(tmpL)
    def put(t, x, pan=0.0):
        i = int(t * SR); m = min(len(x), len(tmpL) - i)
        if m <= 0 or i < 0: return
        gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
        tmpL[i:i + m] += (x[:m] * gl).astype(f32); tmpR[i:i + m] += (x[:m] * gr).astype(f32)
    t, k = 0.0, 0
    while t < t1 - t0:
        root, spec = M["prog"][k % 4]
        notes = chord_notes(spec, M["oct"])
        put(t, pad([n / 4 for n in notes], bar + 0.8, 0.032, M["shimmer"]))
        put(t, kalimba(note(root + "3") if "#" not in root else note(root + "3"), 2.2, 0.10))
        steps = M["arp"]
        pattern = [0, 1, 2, 1, 2, 0, 1, 2] if steps == 8 else [0, 2, 1, 2]
        keep = [1, 0, 1, 1, 0, 1, 1, 0] if steps == 8 else [1, 1, 1, 0 if k % 2 else 1]
        for i in range(steps):
            if not keep[i]: continue
            f = notes[pattern[i] % len(notes)] * (2 if (steps == 8 and i == 4) else 1)
            x = kalimba(f, 1.4, 0.14 if i % 2 == 0 else 0.10) if M["inst"] == "kalimba" else bell(f, 2.4, 0.09)
            put(t + i * bar / steps + rng.normal(0, 0.005), x, (i % 3 - 1) * 0.35)
        if M["pulse"]:
            for b in (0, 2): put(t + b * beat, thud(55, 0.10))
        t += bar; k += 1
    n = int((t1 - t0) * SR) + int(1.5 * SR)
    e = np.ones(len(tmpL), f32); a = int(1.2 * SR)
    e[:a] = np.linspace(0, 1, a); e[n - int(1.5 * SR):n] = np.linspace(1, 0, int(1.5 * SR)); e[n:] = 0
    if last:
        e[:] = 1; e[:a] = np.linspace(0, 1, a)
    i0 = int(t0 * SR); m = min(len(tmpL), len(L) - i0)
    L[i0:i0 + m] += (tmpL * e)[:m]; R[i0:i0 + m] += (tmpR * e)[:m]


# ---------- build ----------
L = np.zeros(N, f32); Rr = np.zeros(N, f32)
fxL = np.zeros(N, f32); fxR = np.zeros(N, f32)
def fx(t, x, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i < 0: x = x[-i:]; i = 0
    m = min(len(x), N - i)
    if m <= 0: return
    gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    fxL[i:i + m] += (x[:m] * gl * gain).astype(f32); fxR[i:i + m] += (x[:m] * gr * gain).astype(f32)

shots = TL["shots"]
# ambience: merge consecutive shots that share a bed
for kind in ["wind", "gust", "cold", "hum", "fire", "flies", "night", "water", "bees", "jungle"]:
    spans = []
    for a in CUES["ambience"]:
        has = kind in a["amb"]
        sc = next(s for s in shots if s["id"] == a["id"])["scene"]
        if kind == "water" and sc in ("lakeFish", "fishPile", "fishPaste", "trench"): has = True
        if kind == "bees" and sc in ("honey", "honeyguide"): has = True
        if kind == "jungle" and sc in ("chimp", "orangutan", "clayLick", "borneoCave", "crutchKid"): has = True
        if kind == "wind" and sc in ("chimp", "orangutan", "clayLick", "borneoCave", "crutchKid"): has = False
        if kind == "hum" and sc in ("modernFridge", "fridgeOpen", "fridgeFerments", "apartment"): has = True
        if has:
            if spans and abs(spans[-1][1] - a["start"]) < 0.05: spans[-1][1] = a["end"]
            else: spans.append([a["start"], a["end"]])
    for s0, s1 in spans:
        fx(s0, bed(kind, s1 - s0 + 0.3), rng.uniform(-0.3, 0.3))

pans = {"pop": 0.25, "write": 0.15, "scribble": 0.3, "whoosh": -0.5, "chime": 0.4}
for q in CUES["cues"]:
    k = q["kind"]
    p = pans.get(k, 0) * (1 if rng.random() > 0.5 else -1)
    if k == "pop": fx(q["t"], pop(380 + rng.uniform(0, 120), 900 + rng.uniform(0, 300)), p)
    elif k == "write": fx(q["t"], scribble(max(0.15, q.get("dur", 0.4)), 0.10), p)
    elif k == "scribble": fx(q["t"], scribble(q.get("dur", 0.35), 0.16), p)
    elif k == "whoosh": fx(q["t"], whoosh(0.5, lo=400, hi=2500, amp=0.2), p)
    elif k == "chime": fx(q["t"], chime(), p)

# scene-specific sounds
for s in shots:
    sc, t0, t1 = s["scene"], s["start"], s["end"]
    if sc == "rewind":
        fx(t0 - 0.1, rewind())
        for k in range(14): fx(t0 + 0.5 + k * 0.09, tick(2200 + k * 60, 0.10), 0.3)
    elif sc in ("clockMeat", "kitchenNight"):
        for k in range(int(t1 - t0) + 1): fx(t0 + 0.3 + k, tick(3200, 0.08), -0.5)
    elif sc == "cutStrips":
        for k in range(int((t1 - t0) * 2)): fx(t0 + 0.1 + k * 0.52, scrape(0.25), 0.2)
    elif sc == "pound":
        for k in range(int((t1 - t0) * 1.6)): fx(t0 + 0.31 + k * 0.628, thud(110, 0.3), 0.2)
    elif sc == "snow" and not s["opts"].get("walk"):
        for k in range(6):
            tt = t0 + (np.pi / 2 + 2 * np.pi * k) / 5
            if tt < t1: fx(tt, thud(90, 0.28), 0.2)
    elif sc == "ambulance":
        n = int((t1 - t0) * SR); tt = np.arange(n) / SR
        f = np.where((tt * 1.6) % 1 < 0.5, 960, 770)
        fx(t0, fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.05 * np.minimum(1, tt / 0.8), 0.2, 0.3), 0.3)
    elif sc == "dentistModern" and s["opts"].get("numb"):
        n = int(min(1.2, t1 - t0) * SR); tt = np.arange(n) / SR
        fx(t0 + 0.2, fade(np.sin(2 * np.pi * (2400 + 60 * np.sin(2 * np.pi * 7 * tt)) * tt) * 0.025, 0.1, 0.2), 0.4)
    elif sc == "feverBody":
        for k in range(int((t1 - t0) / 0.85) + 1):
            fx(t0 + 0.2 + k * 0.85, thud(60, 0.22)); fx(t0 + 0.42 + k * 0.85, thud(55, 0.16))
    elif sc in ("nomads", "emptyHunt", "heavyLoad", "walkFar", "hadzaReturn"):
        for k in range(int((t1 - t0) / 0.4)): fx(t0 + 0.1 + k * 0.4, thud(140, 0.05), (-1) ** k * 0.2)

# music by chapter
chs = TL["chapters"]
start_of = {s["id"]: s["start"] for s in shots}
first_rewind = next(s["start"] for s in shots if s["scene"] == "rewind")
bounds = []
for i, ch in enumerate(chs):
    a = start_of[ch["first"]]
    b = start_of[chs[i + 1]["first"]] if i + 1 < len(chs) else DUR
    mood = ch["mood"]
    if mood == "open":
        a, mood = first_rewind + 0.5, "curious"
    bounds.append((mood, a, b))
for i, (mood, a, b) in enumerate(bounds):
    section(mood, a, b, L, Rr, last=(i == len(bounds) - 1))
end_t = DUR - 1.4
fade_n = int(3 * SR)
i1 = int(end_t * SR)
L[i1 - fade_n:i1] *= np.linspace(1, 0, fade_n, dtype=f32); Rr[i1 - fade_n:i1] *= np.linspace(1, 0, fade_n, dtype=f32); L[i1:] = 0; Rr[i1:] = 0
for f in ["C4", "E4", "G4", "C5"]:
    x = kalimba(note(f), 3.0, 0.12); m = min(len(x), N - i1 + int(1.5 * SR)); i = i1 - int(1.5 * SR)
    L[i:i + m] += x[:m].astype(f32); Rr[i:i + m] += x[:m].astype(f32)

# voice + ducking
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(B, "voice.wav"), "-ar", str(SR), os.path.join(B, "voice48.wav")], check=True)
v, _ = sf.read(os.path.join(B, "voice48.wav"), dtype="float32")
v = np.pad(v, (0, max(0, N - len(v))))[:N]
act = v[np.abs(v) > 0.01]
v = (v / (np.sqrt(np.mean(act.astype(np.float64) ** 2)) + 1e-9) * 10 ** (-19 / 20)).astype(f32)
e = np.sqrt(lfilter([1], [1, -0.999], v.astype(np.float64) ** 2) * 0.001).astype(f32)
g = np.clip(e / 0.03, 0, 1)
gs = np.zeros(N, f32); y = 0.0
att, rel = np.exp(-32 / (0.02 * SR)), np.exp(-32 / (0.35 * SR))
for i in range(0, N, 32):
    x = g[i]; c = att if x > y else rel; y = c * y + (1 - c) * x; gs[i:i + 32] = y
duck = 1 - 0.55 * gs
mg = f32(10 ** (-9 / 20))
outL = v + L * duck * mg + fxL * (1 - 0.25 * gs)
outR = v + Rr * duck * mg + fxR * (1 - 0.25 * gs)
n_end = int(DUR * SR)
fo = int(1.2 * SR)
outL[n_end - fo:n_end] *= np.linspace(1, 0, fo, dtype=f32); outR[n_end - fo:n_end] *= np.linspace(1, 0, fo, dtype=f32)
mix = np.stack([outL[:n_end], outR[:n_end]], 1)
mix /= max(1.0, float(np.abs(mix).max()) / 0.95)
sf.write(os.path.join(B, "mix_raw.wav"), mix, SR)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(B, "mix_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(SR), os.path.join(B, "mix.wav")], check=True)
print(f"mix written: {DUR:.1f}s, {len(CUES['cues'])} cues, {len(bounds)} music sections")
