"""Synthesised sound design for The Spike Files v2: impacts, whooshes, risers, counter ticks, pops, stamps,
typing, a camera shutter, and a driving beat that can drop out before a reveal. All stereo float32 at 44.1 kHz."""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100


def _f(kind, fc, x, order=2):
    return sosfilt(butter(order, np.array(fc) / (SR / 2), kind, output="sos"), x)


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def _st(x, pan=0.0):
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l, x * r], 1).astype(np.float32)


def _t(dur):
    n = int(dur * SR)
    return n, np.arange(n) / SR


def impact(seed=0):
    n, t = _t(1.3)
    f = 36 + 80 * np.exp(-t * 20)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.2)
    crack = _f("low", 3000, _noise(n, seed)) * np.exp(-t * 34) * 0.7
    tail = _f("low", 500, _noise(n, seed + 1)) * np.exp(-t * 5) * 0.15
    return _st(np.tanh((sub + crack + tail) * 1.7) * 0.9)


def whoosh(dur=0.36, seed=0):
    n, t = _t(dur)
    k = t / dur
    a = _f("band", [300, 1400], _noise(n, seed)); b = _f("band", [1400, 6000], _noise(n, seed + 1))
    y = (a * (1 - k) + b * k) * np.sin(np.pi * k) ** 1.5
    pan = np.linspace(-0.7, 0.7, n)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([y * l, y * r], 1).astype(np.float32) * 0.5


def riser(dur=1.0, seed=0):
    n, t = _t(dur)
    k = t / dur
    ns = _f("high", 1500, _noise(n, seed)) * 0.5
    f = 180 * (8 ** k)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return _st((ns + tone) * k ** 2.6) * 0.6


def tick():
    n, t = _t(0.03)
    return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 260) * 0.5


def ticks(dur=0.7, count=20):
    """A counter racing up: clicks that start fast and slow down as the number lands."""
    n = int((dur + 0.05) * SR); y = np.zeros(n); tk = tick()
    for i in range(count):
        p = int(dur * (1 - (1 - i / (count - 1)) ** 2.2) * SR)
        y[p:p + len(tk)] += tk[: n - p] * (0.6 + 0.4 * i / count)
    return _st(y)


def pop(f0=520):
    n, t = _t(0.1)
    f = f0 * (1 + 0.9 * t / 0.05).clip(max=1.9)
    return _st(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 55) * 0.55)


def stamp(seed=0):
    n, t = _t(0.16)
    thud = np.sin(2 * np.pi * np.cumsum(60 + 90 * np.exp(-t * 60)) / SR) * np.exp(-t * 30)
    crack = _f("high", 2000, _noise(n, seed)) * np.exp(-t * 140) * 0.5
    return _st(np.tanh((thud + crack) * 1.4) * 0.6)


def ding():
    n, t = _t(0.9)
    y = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in ((1318, 1, 5), (1976, 0.5, 7), (2637, 0.3, 9), (3951, 0.12, 12)))
    return _st(y * 0.3)


def typing(dur=1.0, seed=0):
    n = int(dur * SR); y = np.zeros(n); rng = np.random.default_rng(seed); p = 0
    while p < n - 800:
        k = int(0.012 * SR); c = _f("band", [1200, 5000], rng.standard_normal(k)) * np.exp(-np.arange(k) / SR * 320)
        y[p:p + k] += c * rng.uniform(0.5, 1.0)
        p += int(rng.uniform(0.045, 0.08) * SR)
    return _st(y * 0.5)


def shutter(seed=0):
    n, t = _t(0.2); y = np.zeros(n)
    for off in (0.0, 0.07):
        k = int(0.02 * SR); p = int(off * SR)
        y[p:p + k] += _f("band", [800, 6000], _noise(k, seed + int(off * 100))) * np.exp(-np.arange(k) / SR * 220)
    return _st(y * 0.7)


def scroll(dur=1.5, seed=0):
    n, t = _t(dur)
    y = _f("band", [200, 900], _noise(n, seed)) * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.sin(np.pi * t / dur)
    return _st(y * 0.12)


SFX = {"impact": impact, "whoosh": whoosh, "riser": riser, "ticks": ticks, "pop": pop, "stamp": stamp, "ding": ding,
       "typing": typing, "shutter": shutter, "scroll": scroll}


# ----------------------------------------------------------------------------------------------- music
def _kick():
    n, t = _t(0.32)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(46 + 120 * np.exp(-t * 38)) / SR) * np.exp(-t * 11) * 1.8) * 0.9


def _hat(seed):
    n, t = _t(0.05)
    return _f("high", 7000, _noise(n, seed)) * np.exp(-t * 110) * 0.22


def _clap(seed):
    n, t = _t(0.22)
    return _f("band", [900, 3200], _noise(n, seed)) * (np.exp(-t * 28) + 0.5 * np.exp(-((t - 0.012) ** 2) / 2e-5)) * 0.42


def _pluck(f, dur=0.22):
    n, t = _t(dur)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t) + 0.15 * np.sin(2 * np.pi * 3 * f * t)) * np.exp(-t * 16)


def _bass(f, dur):
    n, t = _t(dur)
    saw = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 7))
    return _f("low", 420, saw) * np.minimum(1, t / 0.006) * np.exp(-t * 7) * 0.5


def beat(dur, bpm=124, breaks=(), seed=3):
    """Four-on-the-floor bed in A minor. `breaks` are [start, end) spans where drums and bass drop out."""
    spb = 60 / bpm; n = int(dur * SR) + SR
    drums, bass, arp, pad = (np.zeros(n) for _ in range(4)); arp_r = np.zeros(n)
    chords = [(55.0, (220.0, 261.63, 329.63)), (43.65, (174.61, 220.0, 261.63)), (65.41, (261.63, 329.63, 392.0)), (49.0, (196.0, 246.94, 293.66))]
    kick, clap = _kick(), _clap(seed); side = np.ones(n)
    in_break = lambda tb: any(a <= tb < b for a, b in breaks)
    def add(buf, x, tb):
        p = int(tb * SR)
        if p < n:
            buf[p:p + len(x)] += x[: n - p]
    nb = int(dur / spb) + 1
    for b in range(nb):
        tb = b * spb; root, tones = chords[(b // 4) % 4]; brk = in_break(tb)
        if not brk:
            add(drums, kick, tb); add(drums, _hat(seed + b), tb + spb / 2)
            if b % 2 == 1:
                add(drums, clap, tb)
            p = int(tb * SR); k = np.arange(min(n - p, int(0.3 * SR)))
            side[p:p + len(k)] = np.minimum(side[p:p + len(k)], 1 - 0.55 * np.exp(-k / SR / 0.09))
            for h in (0, 0.5):
                add(bass, _bass(root * (2 if h and b % 4 == 3 else 1), spb * 0.48), tb + h * spb)
        for s in range(4):                                   # 16th-note arp (kept, softer, through the breaks)
            f = tones[(b * 4 + s) % 3] * (2 if (b * 4 + s) % 8 >= 4 else 1)
            x = _pluck(f) * (0.5 if brk else 1.0) * (1.0 if s % 2 == 0 else 0.7)
            add(arp if s % 2 == 0 else arp_r, x, tb + s * spb / 4)
        if b % 4 == 0:                                       # pad: one chord per bar, slow attack
            m, t = _t(spb * 4.2)
            ch = sum(np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.003 * t) for f in tones) / 3
            add(pad, ch * np.minimum(1, t / 0.5) * np.minimum(1, (spb * 4.2 - t) / 0.4), tb)
    body = (bass * 0.55 + pad * 0.16) * side
    left = drums * 0.9 + body + (arp * 0.2 + arp_r * 0.07) * side
    right = drums * 0.9 + body + (arp * 0.07 + arp_r * 0.2) * side
    y = np.stack([left, right], 1)[: int(dur * SR)]
    return (np.tanh(y * 1.1) * 0.8).astype(np.float32)
