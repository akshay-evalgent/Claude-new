"""Tiny synth + SFX kit for shorts. Everything is generated, nothing is sampled.

Mono signals are float64 numpy arrays at SR. `Bus` mixes them with pan and
gain at a time offset; `master()` glues and limits the result.
"""
import json
import re
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve, lfilter

SR = 48000
RNG = np.random.default_rng(1234)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def n2f(n):
    m = re.match(r'([A-G][#b]?)(-?\d)', n)
    k = NOTE[m.group(1)] + (int(m.group(2)) + 1) * 12
    return 440.0 * 2 ** ((k - 69) / 12)


def tt(dur):
    return np.arange(max(1, int(round(dur * SR)))) / SR


def noise(dur, seed=None):
    r = np.random.default_rng(seed) if seed is not None else RNG
    return r.standard_normal(max(1, int(round(dur * SR))))


def _sos(kind, f, order=2):
    nyq = SR / 2
    if kind == 'band':
        lo, hi = max(20, f[0]) / nyq, min(f[1], nyq * .95) / nyq
        return butter(order, [lo, hi], 'band', output='sos')
    return butter(order, min(max(f, 20), nyq * .95) / nyq, kind, output='sos')


def lp(x, f, order=2): return sosfilt(_sos('low', f, order), x)
def hp(x, f, order=2): return sosfilt(_sos('high', f, order), x)
def bp(x, lo, hi, order=2): return sosfilt(_sos('band', (lo, hi), order), x)


def sweep(x, fn, kind='low', block=256, width=1.6):
    """Time-varying filter: fn(t) -> cutoff (or centre for 'band')."""
    out = np.zeros_like(x)
    zi = None
    for i in range(0, len(x), block):
        f = fn(i / SR)
        sos = _sos('band', (f / width, f * width)) if kind == 'band' else _sos(kind, f)
        if zi is None or zi.shape[0] != sos.shape[0]:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = sosfilt(sos, x[i:i + block], zi=zi)
    return out


def env(n_or_dur, a=.005, d=.1, s=.0, r=.05, hold=None):
    n = n_or_dur if isinstance(n_or_dur, int) else int(n_or_dur * SR)
    t = np.arange(n) / SR
    hold = (n / SR - r) if hold is None else hold
    e = np.where(t < a, t / max(a, 1e-6), 0.0)
    dec = (t >= a) & (t < hold)
    e[dec] = s + (1 - s) * np.exp(-(t[dec] - a) / max(d, 1e-6))
    rel = t >= hold
    lvl = s + (1 - s) * np.exp(-(max(hold - a, 0)) / max(d, 1e-6))
    e[rel] = lvl * np.maximum(0, 1 - (t[rel] - hold) / max(r, 1e-6))
    return e


def mixs(*sigs):
    """Sum signals of different lengths (zero-padded)."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[:len(x)] += x
    return out


def decay(dur, tau):
    return np.exp(-tt(dur) / tau)


def saw(f, dur, nh=None, phase=0.0):
    t = tt(dur)
    f = np.broadcast_to(f, t.shape) if np.ndim(f) else np.full(t.shape, f)
    ph = 2 * np.pi * np.cumsum(f) / SR + phase
    top = int(min(nh or 40, (SR / 2) / max(f.max(), 1)))
    x = np.zeros_like(t)
    for k in range(1, max(top, 1) + 1):
        x += np.sin(k * ph) / k
    return x * (2 / np.pi)


def sine(f, dur, phase=0.0):
    t = tt(dur)
    if np.ndim(f):
        return np.sin(2 * np.pi * np.cumsum(f) / SR + phase)
    return np.sin(2 * np.pi * f * t + phase)


def square(f, dur, nh=25):
    t = tt(dur)
    x = np.zeros_like(t)
    top = int(min(nh, (SR / 2) / f))
    for k in range(1, top + 1, 2):
        x += np.sin(2 * np.pi * k * f * t) / k
    return x * (4 / np.pi)


# ---------------- instruments ----------------
def marimba(f, dur=.6, vel=1.0):
    t = tt(dur)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .32)
    x += .38 * np.sin(2 * np.pi * 3.93 * f * t) * np.exp(-t / .05)
    x += .12 * np.sin(2 * np.pi * 9.8 * f * t) * np.exp(-t / .015)
    x[:int(.003 * SR)] *= np.linspace(0, 1, int(.003 * SR))
    return x * vel


def pluck(f, dur=.6, damp=.994, bright=.6, seed=None):
    n = int(dur * SR)
    N = max(2, int(SR / f))
    exc = np.zeros(n)
    b = noise(N / SR, seed)
    b = lp(b, 800 + bright * 8000)
    exc[:len(b)] = b[:n]
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -.5 * damp
    a[N + 1] = -.5 * damp
    y = lfilter([1.0], a, exc)
    return y / (np.max(np.abs(y)) + 1e-9)


def bell(f, dur=1.2, vel=1.0, ratio=3.5, index=2.2):
    t = tt(dur)
    I = index * np.exp(-t / .25)
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * ratio * t)) * np.exp(-t / .55)
    x[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
    return x * vel


def supersaw(f, dur, voices=5, detune=.18, cutoff=3200, a=.01, d=.25, s=.6, r=.12):
    x = np.zeros(int(dur * SR))
    for v in range(voices):
        dt = (v - (voices - 1) / 2) / ((voices - 1) / 2 or 1) * detune
        x += saw(f * 2 ** (dt / 12), dur, nh=30, phase=RNG.random() * 6.28)
    x /= voices
    x = lp(x, cutoff, 2)
    return x * env(len(x), a, d, s, r)


def kick808(dur=.55, f0=160, f1=46, tau=.32, drive=1.6):
    t = tt(dur)
    f = f1 + (f0 - f1) * np.exp(-t / .028)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau)
    click = hp(noise(.006), 2000) * .4
    x[:len(click)] += click
    return np.tanh(x * drive) / np.tanh(drive)


def softkick(dur=.3):
    return kick808(dur, f0=120, f1=52, tau=.12, drive=1.0) * .8


def clap(dur=.3):
    n = noise(dur)
    n = bp(n, 900, 3800)
    t = tt(dur)
    e = np.zeros_like(t)
    for o in (0, .011, .023):
        m = t >= o
        e[m] += np.exp(-(t[m] - o) / .006) * .8
    e += np.where(t > .023, np.exp(-(t - .023) / .11), 0) * .6
    return n * e


def snare(dur=.25, tone=190):
    t = tt(dur)
    x = bp(noise(dur), 1400, 8000) * np.exp(-t / .12) * .9
    x += np.sin(2 * np.pi * tone * t) * np.exp(-t / .06) * .6
    return x


def hat(dur=.06, open_=False):
    t = tt(dur if not open_ else .35)
    return hp(noise(len(t) / SR), 7500, 2) * np.exp(-t / (.18 if open_ else .022))


def crash(dur=2.2):
    t = tt(dur)
    return hp(noise(dur), 4500, 2) * np.exp(-t / .8) * .7


def sub808(f, dur, glide_to=None, drive=1.8):
    t = tt(dur)
    fr = np.full(t.shape, f) if glide_to is None else f * (glide_to / f) ** np.clip((t - dur * .55) / (dur * .35), 0, 1)
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR)
    x = np.tanh(x * drive) / np.tanh(drive)
    return x * env(len(t), .004, .9, .0, .06)


def woodblock(f=1800, dur=.12):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * t) * .7 + bp(noise(dur), f * .8, f * 1.4) * .4) * np.exp(-t / .025)


# ---------------- sfx ----------------
def whoosh(dur=.5, f0=300, f1=4000, peak=.6, seed=None):
    n = noise(dur, seed)
    def fn(t): return f0 * (f1 / f0) ** (np.sin(np.pi * min(t / dur, 1)) if peak is None else min(t / dur / peak, 1) if t < dur * peak else max(0, 1 - (t / dur - peak) / (1 - peak)))
    x = sweep(n, fn, 'band', width=1.8)
    t = tt(dur)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    return x * e


def riser(dur=1.0):
    t = tt(dur)
    n = sweep(noise(dur), lambda s: 400 * (12000 / 400) ** (s / dur), 'band', width=2.2)
    tone = saw(220 * 2 ** (2 * t / dur), dur, nh=12) * .25
    return (n + lp(tone, 3000)) * (t / dur) ** 2.2


def revcym(dur=.6):
    return crash(dur)[::-1] * .9


def impact(dur=1.8):
    t = tt(dur)
    sub = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-t / .4) + 28) / SR) * np.exp(-t / .55)
    body = lp(noise(dur), 900) * np.exp(-t / .12) * .9
    return np.tanh((sub * 1.2 + body) * 1.5)


def boom(dur=3.0):
    t = tt(dur)
    sub = np.sin(2 * np.pi * np.cumsum(55 * np.exp(-t / .8) + 22) / SR) * np.exp(-t / 1.1)
    rum = lp(noise(dur), 220) * np.exp(-t / .9) * 1.4
    return np.tanh((sub + rum) * 1.4)


def pop(f=700, dur=.07):
    t = tt(dur)
    fr = f * (1 + 1.2 * np.exp(-t / .01))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .018)


def blip(f=1200, dur=.06, sq=False):
    t = tt(dur)
    x = square(f, dur, 9) * .5 if sq else np.sin(2 * np.pi * f * t)
    return x * env(len(t), .002, .03, .0, .01)


def glitch(dur=.2, seed=None):
    r = np.random.default_rng(seed)
    out = np.zeros(int(dur * SR))
    i = 0
    while i < len(out):
        ln = int(r.uniform(.008, .035) * SR)
        kind = r.integers(0, 3)
        if kind == 0:
            seg = square(r.uniform(150, 2400), ln / SR, 15)
        elif kind == 1:
            seg = hp(noise(ln / SR), 2000)
        else:
            seg = np.zeros(ln)
        seg = np.pad(seg, (0, max(0, ln - len(seg))))[:ln]
        seg = np.round(seg * 6) / 6  # bitcrush
        out[i:i + ln] = seg[:len(out) - i] * r.uniform(.4, 1)
        i += ln
    return out


def zap(dur=.12):
    t = tt(dur)
    fr = 2400 * np.exp(-t / .03) + 120
    x = square(1, dur) * 0
    x = np.sign(np.sin(2 * np.pi * np.cumsum(fr) / SR)) * .5 + hp(noise(dur), 3000) * .4
    return np.round(x * np.exp(-t / .05) * 5) / 5


def error_buzz(dur=.2):
    t = tt(dur)
    x = (square(140, dur, 15) + square(147, dur, 15)) * .35
    return x * env(len(t), .003, 1, 1, .03)


def womp(dur=.55):
    t = tt(dur)
    fr = 220 * 2 ** (-7 * np.clip(t / dur, 0, 1) / 12)
    x = saw(fr, dur, nh=14)
    x = sweep(x, lambda s: 1800 - 1400 * s / dur, 'low')
    wob = 1 + .25 * np.sin(2 * np.pi * 6 * t)
    return x * wob * env(len(t), .02, .4, .5, .12)


def brush(dur=.75):
    t = tt(dur)
    x = sweep(noise(dur), lambda s: 1200 + 1800 * np.sin(np.pi * s / dur * 3) ** 2, 'band', width=2)
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) ** .7


def shutter(dur=.18):
    x = np.zeros(int(dur * SR))
    for o, g in ((0, 1), (.07, .7)):
        c = hp(noise(.03), 1500) * np.exp(-tt(.03) / .006) * g
        i = int(o * SR)
        x[i:i + len(c)] += c
    return x


def typing(dur=.8, rate=22, seed=5):
    r = np.random.default_rng(seed)
    x = np.zeros(int(dur * SR))
    tcur = 0.0
    while tcur < dur - .03:
        c = bp(noise(.02), 1500, 6000) * np.exp(-tt(.02) / .004) * r.uniform(.5, 1)
        i = int(tcur * SR)
        x[i:i + len(c)] += c[:len(x) - i]
        tcur += r.exponential(1 / rate) + .015
    return x


def ticks(dur=1.0, rate=24):
    x = np.zeros(int(dur * SR))
    for k in range(int(dur * rate)):
        c = blip(2400 + (k % 4) * 120, .015) * .6
        i = int(k / rate * SR)
        x[i:i + len(c)] += c[:len(x) - i]
    return x


def scratch(dur=.28):
    t = tt(dur)
    pos = np.sin(2 * np.pi * 9 * t) * np.exp(-t / .2)
    x = sweep(noise(dur), lambda s: 900 + 700 * np.sin(2 * np.pi * 9 * s), 'band', width=1.5)
    return x * (np.abs(pos) + .2)


def crt_off(dur=.5):
    t = tt(dur)
    whine = np.sin(2 * np.pi * np.cumsum(15600 * np.exp(-t / .12) + 400) / SR) * np.exp(-t / .2) * .3
    thump = np.sin(2 * np.pi * 60 * t) * np.exp(-t / .08)
    return whine + thump


def fan(dur=1.4):
    t = tt(dur)
    x = sweep(noise(dur), lambda s: 300 + 2600 * (s / dur) ** 1.5, 'band', width=1.4)
    hum = saw(80 + 260 * (t / dur) ** 1.5, dur, nh=6) * .2
    return (x + hum) * np.clip(t / .2, 0, 1)


def beeps(dur=.6, n=3, f=1000):
    x = np.zeros(int(dur * SR))
    for k in range(n):
        b = square(f, .09, 9) * env(int(.09 * SR), .003, 1, 1, .01) * .5
        i = int(k * dur / n * SR)
        x[i:i + len(b)] += b[:len(x) - i]
    return x


def rocket(dur=1.6):
    t = tt(dur)
    roar = lp(noise(dur), 700) * 1.4 + bp(noise(dur), 600, 3000) * .5
    crackle = hp(noise(dur), 3000) * (RNG.random(len(t)) > .985) * 2
    e = np.clip(t / .08, 0, 1) * np.exp(-np.maximum(0, t - .5) / .55)
    return np.tanh((roar + crackle) * e * 1.3)


def shimmer(dur=1.3, seed=9):
    r = np.random.default_rng(seed)
    x = np.zeros(int(dur * SR))
    for k in range(int(dur * 26)):
        f = n2f(r.choice(['E6', 'G6', 'A6', 'C7', 'D7', 'E7']))
        b = bell(f, .4, .25, ratio=2.0, index=1)
        i = int(r.uniform(0, dur - .05) * SR)
        x[i:i + len(b)] += b[:len(x) - i]
    return x * np.linspace(.4, 1, len(x))


def data_bleeps(dur=1.9, seed=3):
    r = np.random.default_rng(seed)
    x = np.zeros(int(dur * SR))
    step = 1 / 12
    for k in range(int(dur / step)):
        if r.random() < .25:
            continue
        b = blip(r.choice([880, 1320, 1760, 2640, 1980]), .05, sq=True) * .35
        i = int(k * step * SR)
        x[i:i + len(b)] += b[:len(x) - i]
    return x


def rimshot_sting():
    """ba-dum-tss"""
    x = np.zeros(int(1.6 * SR))
    for o, s in ((0, snare(.2, 210)), (.18, mixs(snare(.2, 170), softkick(.2) * .8)), (.42, mixs(crash(1.1) * .9, snare(.15) * .4))):
        i = int(o * SR)
        x[i:i + len(s)] += s[:len(x) - i]
    return x


# ---------------- mixing ----------------
class Bus:
    def __init__(self, dur):
        self.L = np.zeros(int(dur * SR) + SR)
        self.R = np.zeros_like(self.L)

    def add(self, sig, at, gain=1.0, pan=0.0):
        if sig is None:
            return
        i = int(round(at * SR))
        if i < 0:
            sig = sig[-i:]
            i = 0
        n = min(len(sig), len(self.L) - i)
        if n <= 0:
            return
        a = (pan + 1) * np.pi / 4
        self.L[i:i + n] += sig[:n] * gain * np.cos(a) * 1.414
        self.R[i:i + n] += sig[:n] * gain * np.sin(a) * 1.414

    def seg(self, a, b):
        return slice(int(a * SR), int(b * SR))

    def stereo(self):
        return np.stack([self.L, self.R])


def reverb_ir(dur=1.8, seed=2, damp=6000):
    t = tt(dur)
    irs = []
    for s in (seed, seed + 1):
        n = np.random.default_rng(s).standard_normal(len(t)) * np.exp(-t / (dur / 5))
        irs.append(lp(n, damp))
    ir = np.stack(irs)
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def apply_reverb(st, ir, wet=.2):
    out = st.copy()
    for c in range(2):
        out[c] += fftconvolve(st[c], ir[c])[:st.shape[1]] * wet
    return out


def master(st, ceiling=.92):
    st = st - np.mean(st, axis=1, keepdims=True)
    peak = np.max(np.abs(st)) + 1e-9
    st = st / peak * 1.4
    st = np.tanh(st) / np.tanh(1.4)
    return st * ceiling


def write_wav(path, st):
    import wave
    x = np.clip(st.T, -1, 1)
    pcm = (x * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def load_cues(path):
    txt = open(path).read()
    txt = txt[txt.index('{'):txt.rindex('}') + 1]
    return json.loads(txt)
