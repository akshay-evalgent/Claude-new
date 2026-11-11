"""Synthesise the music bed and sound effects, then mix them under the voice.

Reads build/timeline.json and build/voice.wav, writes build/mix.wav (48 kHz stereo).
Every effect is generated here from numpy; no sample files are used.
Effect times use the same word timings as scenes.js, so sound and picture stay in sync.
"""
import json, os, subprocess
import numpy as np
from scipy.signal import lfilter, butter, sosfilt
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, "build")
SR = 48000
TL = json.load(open(os.path.join(B, "timeline.json")))
DUR = TL["duration"]
N = int(np.ceil(DUR * SR)) + SR
rng = np.random.default_rng(7)
SH = {s["id"]: s for s in TL["shots"]}


def at(sid, word, off=0.0):
    s = SH[sid]
    for w in s["words"]:
        if "".join(ch for ch in w["w"].lower() if ch.isalpha() or ch == "'") == word.lower():
            return s["vs"] + w["s"] + off
    raise KeyError((sid, word))


def loc(sid, t):
    return SH[sid]["start"] + t


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)
    return e


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype="high", fs=SR, output="sos"), x)


def fade(x, fi=0.01, fo=0.05):
    n = len(x); a, b = int(fi * SR), int(fo * SR)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[n - b:] *= np.linspace(1, 0, b)
    return x


# ---------- effects ----------
def pop(f0=420, f1=980):
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = np.linspace(f0, f1, n); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.002, 0.035) * 0.5


def scribble(d=0.35):
    n = int(d * SR); x = rng.standard_normal(n)
    x = bp(x, 1800, 5200)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (14 + 6 * rng.random()) * np.arange(n) / SR) ** 2
    return fade(x * am * 0.18, 0.01, 0.06)


def whoosh(d=0.6, rev=False, lo=300, hi=3000, amp=0.35):
    n = int(d * SR); x = rng.standard_normal(n)
    out = np.zeros(n); y = 0.0
    fc = np.geomspace(lo, hi, n) if not rev else np.geomspace(hi, lo, n)
    a = np.exp(-2 * np.pi * fc / SR)
    for i in range(n):
        y = (1 - a[i]) * x[i] + a[i] * y
        out[i] = y
    out = hp(out, 120)
    t = np.linspace(0, 1, n)
    e = np.sin(np.pi * t ** (0.6 if not rev else 1.6)) ** 2
    out = out * e
    return out / (np.abs(out).max() + 1e-9) * amp


def rewind():
    d = 1.1; n = int(d * SR); t = np.arange(n) / SR
    w = whoosh(d, rev=True, lo=250, hi=5000, amp=0.32)
    f = np.geomspace(1300, 160, n) * (1 + 0.04 * np.sin(2 * np.pi * 9 * t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.13
    return w + tone


def tick(f=2600, amp=0.16):
    n = int(0.03 * SR); x = bp(rng.standard_normal(n), f * 0.7, f * 1.3)
    return x * env(n, 0.0005, 0.006) * amp * 3


def chime(f=1046.5, amp=0.22):
    n = int(2.2 * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / dcy) for k, a, dcy in [(1, 1, 0.9), (2.76, 0.45, 0.4), (5.4, 0.25, 0.18)])
    return fade(x * amp * np.minimum(1, t / 0.003), 0.0, 0.2)


def thud(f=70, amp=0.5):
    n = int(0.35 * SR); t = np.arange(n) / SR
    fr = f * (1 + 1.5 * np.exp(-t / 0.02))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.09)
    x += lp(rng.standard_normal(n), 900) * np.exp(-t / 0.02) * 0.6
    return x * amp


def snow_crunch(amp=0.25):
    n = int(0.22 * SR); x = bp(rng.standard_normal(n), 900, 4000) * (rng.random(n) > 0.6)
    return fade(x * env(n, 0.01, 0.08) * amp, 0.0, 0.05)


def step(amp=0.22):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return (lp(rng.standard_normal(n), 600) * np.exp(-t / 0.025) * 1.4 + np.sin(2 * np.pi * 90 * t) * np.exp(-t / 0.03) * 0.5) * amp


def buzz(d, amp=0.05):
    n = int(d * SR); t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(3):
        f = (190 + 35 * k) * (1 + 0.06 * np.sin(2 * np.pi * (5 + k) * t + k))
        ph = np.cumsum(f) / SR
        saw = 2 * (ph % 1) - 1
        out += saw * (0.5 + 0.5 * np.sin(2 * np.pi * (0.7 + 0.3 * k) * t + k * 2)) ** 2
    return fade(bp(out, 180, 3000) * amp, 0.15, 0.25)


def hum(d, amp=0.06):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 60 * t) + 0.6 * np.sin(2 * np.pi * 120 * t) + 0.25 * np.sin(2 * np.pi * 180 * t)
    x *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t)
    x += lp(rng.standard_normal(n), 400) * 0.5
    return fade(x * amp, 0.25, 0.15)


def crackle(d, amp=0.3):
    n = int(d * SR); t = np.arange(n) / SR
    base = lp(rng.standard_normal(n), 500) * 0.25 * (0.7 + 0.3 * np.sin(2 * np.pi * 0.5 * t))
    clicks = np.zeros(n)
    k = rng.random(n) < 22 / SR
    idx = np.where(k)[0]
    for i in idx:
        m = min(n - i, int(0.012 * SR))
        clicks[i:i + m] += rng.standard_normal(m) * np.exp(-np.arange(m) / (0.0015 * SR)) * (0.3 + rng.random())
    clicks = hp(clicks, 1200)
    return fade((base + clicks) * amp, 0.2, 0.3)


def wind(d, amp=0.12, cold=False):
    n = int(d * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    x = bp(x, 300 if cold else 150, 2600 if cold else 1200)
    m = 0.55 + 0.45 * np.sin(2 * np.pi * 0.23 * t + 1) * np.sin(2 * np.pi * 0.11 * t)
    return fade(x * m * amp, 0.3, 0.3)


# ---------- music ----------
def kalimba(f, d=1.4, amp=0.2):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.55) + 0.22 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.05) + 0.12 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.3)
    return fade(x * np.minimum(1, t / 0.002) * amp, 0.0, 0.1)


def pad(freqs, d, amp=0.06):
    n = int(d * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    for f in freqs:
        for det in (-0.6, 0.6):
            x += np.sin(2 * np.pi * (f + det) * t)
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.8)
    return lp(x, 1400) * e * amp


def note(name):
    i = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    o = int(name[-1])
    return 440 * 2 ** ((i + 12 * (o + 1) - 69) / 12)


def music(start, end, sparse=()):
    bpm = 84; beat = 60 / bpm; bar = 4 * beat
    chords = [("C3", ["C5", "E5", "G5", "E5", "C6", "G5", "E5", "G5"], ["C3", "G3", "E4"]),
              ("G2", ["B4", "D5", "G5", "D5", "B5", "G5", "D5", "G5"], ["G2", "D3", "B3"]),
              ("A2", ["A4", "C5", "E5", "C5", "A5", "E5", "C5", "E5"], ["A2", "E3", "C4"]),
              ("F2", ["A4", "C5", "F5", "C5", "A5", "F5", "C5", "F5"], ["F2", "C3", "A3"])]
    keep = [1, 0, 1, 1, 0, 1, 1, 0]
    L = np.zeros(N); R = np.zeros(N)
    t = start; k = 0
    while t < end:
        _, arp, padn = chords[k % 4]
        x = pad([note(p) for p in padn], bar + 0.8, 0.035)
        add(L, R, t, x, 0.0)
        sparse_bar = any(a_ <= t < b_ for a_, b_ in sparse)
        for i, nm in enumerate(arp):
            tt = t + i * beat / 2
            if tt >= end or (not keep[i] and k % 2 == 0) or any(a_ <= tt < b_ for a_, b_ in sparse):
                continue
            v = 0.16 if i % 2 == 0 else 0.11
            add(L, R, tt + rng.normal(0, 0.006), kalimba(note(nm), 1.4, v), (i % 3 - 1) * 0.35)
        if not sparse_bar:
            add(L, R, t, kalimba(note(chords[k % 4][0][0] + "4"), 1.8, 0.12), 0)
        t += bar; k += 1
    # final ring-out chord
    for nm in ["C4", "E4", "G4", "C5"]:
        add(L, R, end, kalimba(note(nm), 3.0, 0.12), 0)
    add(L, R, end, pad([note("C3"), note("G3"), note("E4")], 3.0, 0.035), 0)
    return L, R


def add(L, R, t, x, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i < 0:
        x = x[-i:]; i = 0
    m = min(len(x), N - i)
    if m <= 0:
        return
    gl, gr = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    L[i:i + m] += x[:m] * gl * gain
    R[i:i + m] += x[:m] * gr * gain


# ---------- cue sheet ----------
fxL, fxR = np.zeros(N), np.zeros(N)
def fx(t, x, pan=0.0, gain=1.0): add(fxL, fxR, t, x, pan, gain)
def span(sid, t0=0.0, t1=None):
    s = SH[sid]; return s["start"] + t0, (s["end"] if t1 is None else s["start"] + t1)
def glug(amp=0.25):
    n = int(0.16 * SR); t = np.arange(n) / SR
    f = 180 + 260 * t / 0.16
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.16) ** 2 * amp
def wobble(d=0.7, amp=0.16):
    n = int(d * SR); t = np.arange(n) / SR
    f = 330 * (1 + 0.12 * np.sin(2 * np.pi * 11 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35) * np.minimum(1, t / 0.01) * amp

# modern opening: fridge hum and a ticking clock, no music yet
a, b = span("s01"); fx(a, hum(SH["s03"]["end"] - a + 0.1, 0.07), 0.2)
for k in range(int(b - a) + 1): fx(a + 0.4 + k, tick(3200, 0.10), -0.5)
for w, p in [("milk", -0.3), ("eggs", 0.1), ("leftovers", 0.3)]: fx(at("s02", w), pop(), p)
fx(at("s03", "safe"), scribble(0.3), 0.4); fx(at("s03", "days"), scribble(0.35), 0.4, 0.7)
# rewind
fx(SH["s04"]["start"] - 0.12, rewind())
for k in range(14): fx(loc("s04", 0.5 + k * 0.09), tick(2200 + k * 60, 0.12), 0.3)
# savanna ambience
for sid in ["s05", "s06", "s07", "s08", "s09", "s15", "s17", "s27", "s28", "s29", "s30", "s31"]:
    a, b = span(sid); fx(a, wind(b - a + 0.05, 0.05), 0)
fx(at("s06", "spear"), chime(2093, 0.10), -0.3)
fx(at("s09", "it", -0.3), buzz(SH["s09"]["end"] - at("s09", "it", -0.3), 0.05), 0.3)
fx(at("s10", "fridge"), scribble(0.34), -0.4); fx(at("s10", "ice"), scribble(0.34), 0.4)
fx(at("s11", "problem", -0.1), pop(380, 820), 0.3); fx(at("s11", "problem", 0.25), pop(500, 1100), 0.45)
# the "you" section: modern fridge, brain, objection
a, b = span("s12"); fx(a, hum(b - a, 0.05), 0.4)
for k in range(3): fx(loc("s12", 0.2 + k * 0.42), glug(0.2), -0.2)
fx(loc("s13", 0.05), wobble(), 0)
fx(loc("s14", 0.0), pop(300, 650), 0.3)
fx(at("s14", "cavemen", -0.05), scribble(0.3), 0.3, 0.7); fx(at("s14", "they", -0.05), scribble(0.6), 0.3, 0.7)
a, b = span("s15"); fx(a, buzz(b - a, 0.035), 0.4); fx(loc("s15", 0.35), pop(380, 820), 0.2)
fx(loc("s16", 0.0), scribble(0.5), 0, 0.8)
for i in range(3): fx(loc("s16", 0.3 + i * 0.2), pop(500 + i * 120, 1000 + i * 150), -0.5 + i * 0.5)
# trick one
for sid in ["s17", "s19", "s21", "s28"]: fx(loc(sid, 0.0), whoosh(0.5, lo=400, hi=2500, amp=0.22), -0.6)
a, b = span("s17"); fx(a, wind(b - a, 0.13), 0.2)
fx(loc("s18", 0.05), scribble(0.25), -0.4)
fx(at("s18", "hung"), scribble(0.5), 0); fx(at("s18", "hung", 0.15), pop(600, 1200), 0)
fx(at("s18", "dry", 0.1), scribble(0.25), 0.3); fx(at("s18", "weeks"), pop(), 0.6)
for k in range(16): fx(at("s18", "weeks", 0.05 + k / 26), tick(1500, 0.07), 0.6)
# trick two
a, b = span("s19"); fx(a, crackle(SH["s20"]["end"] - a, 0.32), 0)
tfl = at("s20", "flies"); fx(SH["s20"]["start"], buzz(tfl - SH["s20"]["start"] + 0.3, 0.045), 0.5)
fx(tfl, whoosh(0.7, lo=500, hi=4000, amp=0.18), 0.6)
# trick three
a, b = span("s21", 0, None); fx(a, wind(SH["s22"]["end"] - a, 0.12, cold=True), 0)
for k in range(int((b - a) / 0.314) + 1): fx(a + 0.1 + k * 0.314, snow_crunch(0.2), -0.4 + 0.1 * k)
a, b = span("s22")
for k in range(6):
    tt = loc("s22", (np.pi / 2 + 2 * np.pi * k) / 5)
    if tt < b:
        fx(tt, thud(90, 0.32), 0.2); fx(tt, snow_crunch(0.22), 0.2)
fx(loc("s23", 0.05), scribble(0.4), 0); fx(at("s23", "freezer"), chime(1318.5, 0.16), 0.4)
# the twist
fx(loc("s24", 0.05), pop(300, 700), 0.4); fx(at("s25", "wasn't"), scribble(0.34), 0.4)
a, b = span("s26"); fx(a, crackle(b - a, 0.26), 0)
t0 = at("s27", "shares", -0.05)
for i, p in enumerate([-0.7, -0.4, 0.5, 0.8]):
    fx(t0 + i * 0.3, whoosh(0.35, lo=600, hi=3500, amp=0.14), p); fx(t0 + i * 0.3 + 0.4, step(0.18), p)
for k in range(4): fx(loc("s28", 0.05 + k * 0.286), step(0.2), 0.6)
fx(at("s28", "lucky", -0.1), chime(1567.98, 0.12), 0.5)
tg = at("s29", "shares"); fx(tg, whoosh(0.45, lo=600, hi=3500, amp=0.16), 0.2); fx(tg + 0.5, step(0.2), -0.3)
# evidence
tl_ = at("s30", "hadza", -0.25); fx(tl_, scribble(0.6), 0.2, 0.6); fx(tl_ + 0.6, pop(), -0.2)
fx(loc("s31", 0.0), whoosh(0.4, lo=800, hi=4000, amp=0.12), 0.3)
for i in range(6): fx(loc("s31", 0.25 + i * 0.13), scribble(0.15), 0.3, 0.7)
fx(loc("s32", 0.0), scribble(0.45), -0.2); fx(loc("s32", 0.15), pop(350, 700), -0.5)
fx(loc("s33", 0.0), scribble(0.6), 0.2); fx(loc("s33", 0.8), chime(1046.5, 0.18), 0)
# callback
a, b = span("s34"); fx(a, hum(b - a, 0.06), 0.3)
a, b = span("s35"); fx(a, crackle(DUR - a, 0.24), 0)

# ---------- music + ducking ----------
mstart = SH["s04"]["start"] + 0.55
mL, mR = music(mstart, DUR - 1.4, sparse=[(SH["s12"]["start"] - 0.2, SH["s15"]["start"]), (SH["s34"]["start"] - 0.2, SH["s35"]["start"])])

subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(B, "voice.wav"), "-ar", str(SR), os.path.join(B, "voice48.wav")], check=True)
v, _ = sf.read(os.path.join(B, "voice48.wav"))
v = np.pad(v, (0, max(0, N - len(v))))[:N]
act = v[np.abs(v) > 0.01]
v = v / (np.sqrt(np.mean(act ** 2)) + 1e-9) * 10 ** (-19 / 20)
e = np.sqrt(lfilter([1], [1, -0.999], v ** 2) * 0.001)
g = np.clip(e / 0.03, 0, 1)
gs = np.zeros_like(g); y = 0.0
att, rel = np.exp(-32 / (0.02 * SR)), np.exp(-32 / (0.35 * SR))
for i in range(0, N, 32):
    x = g[i]; c = att if x > y else rel
    y = c * y + (1 - c) * x
    gs[i:i + 32] = y
duck = 1 - 0.55 * gs
mus_gain = 10 ** (-9 / 20)
L = v + (mL * duck * mus_gain) + fxL * (1 - 0.25 * gs)
R = v + (mR * duck * mus_gain) + fxR * (1 - 0.25 * gs)
n_end = int(DUR * SR)
fo = int(0.9 * SR)
for ch in (L, R):
    ch[n_end - fo:n_end] *= np.linspace(1, 0, fo)
    ch[n_end:] = 0
mix = np.stack([L, R], 1)[:n_end]
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(os.path.join(B, "mix_raw.wav"), mix.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(B, "mix_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", str(SR), os.path.join(B, "mix.wav")], check=True)
print("mix written", DUR, "s; music from", round(mstart, 2))
