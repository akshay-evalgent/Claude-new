"""LANTERN: the score and sound, synthesised from scratch and placed on the picture's clock.

Instruments follow the paper-lightbox sound palette: music box, felt piano, harp,
soft strings, single soft strokes. One lullaby (D major, 3/4, 80 BPM: a beat is
0.75 s) is the father's; it comes back as the full theme at dawn and as the
music box at the end.

  python3 score.py master out/master_mix.wav
"""
import math
import os
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render  # noqa: E402  (EDLs and shot events)
import shots   # noqa: E402

SR = 48000
BEAT = 0.75
RNG = np.random.default_rng(1234)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def tt(n):
    return np.arange(n) / SR


class Bus:
    def __init__(self, dur):
        self.n = int((dur + 6) * SR)
        self.L = np.zeros(self.n, np.float32)
        self.R = np.zeros(self.n, np.float32)

    def add(self, t0, x, gain=1.0, pan=0.0):
        if x.ndim == 2:
            l, r = x[0], x[1]
        else:
            l = r = x
        i = int(t0 * SR)
        if i >= self.n:
            return
        if i < 0:
            l, r = l[-i:], r[-i:]
            i = 0
        k = min(len(l), self.n - i)
        gl = gain * math.cos((pan + 1) * math.pi / 4) * math.sqrt(2)
        gr = gain * math.sin((pan + 1) * math.pi / 4) * math.sqrt(2)
        self.L[i:i + k] += (l[:k] * gl).astype(np.float32)
        self.R[i:i + k] += (r[:k] * gr).astype(np.float32)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos')
    return signal.sosfilt(sos, x)


def lp(x, hi, order=2):
    sos = signal.butter(order, hi / (SR / 2), 'low', output='sos')
    return signal.sosfilt(sos, x)


def hp(x, lo, order=2):
    sos = signal.butter(order, lo / (SR / 2), 'high', output='sos')
    return signal.sosfilt(sos, x)


def noise(d):
    return RNG.standard_normal(int(d * SR))


def env(n, a=0.005, r=0.05, hold=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    nr = max(1, int(r * SR))
    if hold is not None:
        h = int(hold * SR)
        e[h:] = 0
        e[max(0, h - nr):h] *= np.linspace(1, 0, min(nr, h))
    else:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ------------------------------------------------------------------ instruments

def piano(m, dur, vel=0.5):
    f = midi(m)
    n = int((dur + 2.2) * SR)
    t = tt(n)
    x = np.zeros(n)
    for k in range(1, 10):
        fk = f * k * math.sqrt(1 + 0.0004 * k * k)
        if fk > 9000:
            break
        amp = (1.0 / k ** 1.5) * (0.55 if k > 3 else 1.0)
        x += amp * np.sin(2 * np.pi * fk * t + RNG.uniform(0, 6)) * np.exp(-t * (0.9 + 0.55 * k) * (f / 330) ** 0.3)
    x *= np.minimum(1, t / 0.006)
    rel = t > dur
    x[rel] *= np.exp(-(t[rel] - dur) * 7)
    thump = lp(noise(0.03), 600) * np.linspace(1, 0, int(0.03 * SR)) * 0.08
    x[:len(thump)] += thump
    return lp(x, 3800) * vel * 0.32


def musicbox(m, vel=0.5):
    f = midi(m)
    n = int(2.8 * SR)
    t = tt(n)
    x = (np.sin(2 * np.pi * f * t) * np.exp(-t * 1.3)
         + 0.32 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 2.4)
         + 0.16 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 4.5)
         + 0.07 * np.sin(2 * np.pi * f * 5.43 * t) * np.exp(-t * 7))
    x *= np.minimum(1, t / 0.0015)
    click = hp(noise(0.006), 3000) * 0.05
    x[:len(click)] += click
    return x * vel * 0.3


def bell(m, vel=0.5, d=4.0):
    f = midi(m)
    n = int(d * SR)
    t = tt(n)
    ratios = [1.0, 2.76, 5.4, 8.93, 0.5]
    amps = [1.0, 0.45, 0.25, 0.12, 0.3]
    dec = [0.7, 1.4, 2.4, 3.8, 0.5]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dd) for r, a, dd in zip(ratios, amps, dec))
    return x * np.minimum(1, t / 0.002) * vel * 0.22


def harp(m, vel=0.5, d=2.4):
    f = midi(m)
    P = max(2, int(round(SR / f)))
    n = int(d * SR)
    x = np.zeros(n)
    burst = RNG.uniform(-1, 1, P)
    burst = lp(burst, 3500)
    x[:P] = burst
    g = 0.996 if f < 400 else 0.993
    a = np.zeros(P + 2)
    a[0] = 1.0
    a[P] = -g / 2
    a[P + 1] = -g / 2
    y = signal.lfilter([1.0], a, x)
    return lp(y, 4000) * vel * 0.35


def saw(f, t, partials=24):
    x = np.zeros_like(t)
    for k in range(1, partials + 1):
        if f * k > 7000:
            break
        x += ((-1) ** (k + 1)) * np.sin(2 * np.pi * f * k * t) / k
    return x


def strings(ms, dur, vel=0.4, att=1.2, rel=1.6, cut=2200, vib=True):
    n = int((dur + rel) * SR)
    t = tt(n)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in ms:
        f = midi(m)
        for d, side in ((-0.06, 0), (0.0, 1), (0.07, 0), (0.035, 1)):
            ff = f * 2 ** (d / 12)
            ph = 2 * np.pi * ff * t
            if vib:
                ph += 0.0025 * ff * np.sin(2 * np.pi * 5.1 * t + RNG.uniform(0, 6)) / 5.1 * 2 * np.pi * 0.08
            x = np.zeros(n)
            for k in range(1, 12):
                if ff * k > 6000:
                    break
                x += ((-1) ** (k + 1)) * np.sin(ph * k + RNG.uniform(0, 6)) / k
            (L if side == 0 else R)[:] += x
    e = np.ones(n)
    na = int(att * SR)
    e[:na] = np.linspace(0, 1, na) ** 1.5
    nd = int(dur * SR)
    e[nd:] = np.linspace(1, 0, n - nd) ** 2
    L = lp(L * e, cut)
    R = lp(R * e, cut)
    s = vel * 0.05 / max(1, len(ms)) ** 0.35
    return np.vstack([L * s, R * s])


def drum(vel=0.5):
    n = int(0.6 * SR)
    t = tt(n)
    f = 55 + 45 * np.exp(-t * 20)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    x += lp(noise(0.6), 900) * np.exp(-t * 40) * 0.2
    return x * vel * 0.8


def heartbeat(vel=0.5):
    a = drum(vel)
    b = drum(vel * 0.7)
    out = np.zeros(int(0.9 * SR))
    out[:len(a)] += a
    i = int(0.28 * SR)
    out[i:i + len(b)] += b[:len(out) - i]
    return out


# ------------------------------------------------------------------ the lullaby

PHR = {
    'A': [(69, 2), (66, 1), (67, 1), (66, 1), (64, 1), (62, 2), (64, 1), (66, 3)],
    'A2': [(69, 2), (66, 1), (67, 1), (66, 1), (64, 1), (62, 2), (61, 1), (62, 3)],
    'B': [(71, 2), (69, 1), (67, 2), (66, 1), (64, 1), (66, 1), (67, 1), (69, 3)],
}
CH = {'A': ['D', 'G', 'D', 'A'], 'A2': ['D', 'G', 'A', 'D'], 'B': ['G', 'D/F#', 'Em', 'A'], 'Am': ['Bm', 'G', 'D', 'A']}
CHORD = {'D': [50, 57, 62, 66], 'G': [43, 55, 59, 62], 'A': [45, 57, 61, 64], 'Bm': [47, 54, 59, 62], 'Em': [40, 55, 59, 64],
         'D/F#': [42, 57, 62, 66]}


def lullaby(bus, t0, phrases, mel='musicbox', lh=True, harp_arp=False, strings_pad=False, vel=0.5, octave=0, beat=BEAT, until=None,
            chords=None):
    t = t0
    for pi, ph in enumerate(phrases):
        chs = CH[chords[pi] if chords else ph]
        bt = t
        for (m, b) in PHR[ph]:
            if until is not None and bt >= until:
                return t
            mm = m + 12 * octave
            if mel == 'musicbox':
                bus['music'].add(bt, musicbox(mm + 12, vel), pan=0.35)
            elif mel == 'piano':
                bus['music'].add(bt, piano(mm, b * beat, vel), pan=-0.1)
            elif mel == 'both':
                bus['music'].add(bt, piano(mm, b * beat, vel), pan=-0.1)
                bus['music'].add(bt, musicbox(mm + 12, vel * 0.55), pan=0.4)
            bt += b * beat
        for bi, c in enumerate(chs):
            ct = t + bi * 3 * beat
            if until is not None and ct >= until:
                break
            notes = CHORD[c]
            if lh:
                bus['music'].add(ct, piano(notes[0] - 12 if notes[0] > 45 else notes[0], 3 * beat, vel * 0.55), pan=-0.25)
                for k in (1, 2):
                    bus['music'].add(ct + k * beat, piano(notes[1], beat * 0.9, vel * 0.28), pan=-0.3)
                    bus['music'].add(ct + k * beat, piano(notes[2], beat * 0.9, vel * 0.24), pan=-0.2)
            if harp_arp:
                arp = [notes[0], notes[1], notes[2], notes[3], notes[2], notes[1]]
                for k, m in enumerate(arp):
                    bus['music'].add(ct + k * beat / 2, harp(m, vel * 0.5), pan=-0.45)
            if strings_pad:
                bus['music'].add(ct, strings(notes, 3 * beat + 0.2, vel * 0.9, att=0.6, rel=1.0), pan=0.0)
        t += 12 * beat
    return t


def pad(bus, t0, dur, chord, vel=0.4, cut=1600, att=1.5):
    bus['music'].add(t0, strings(chord, dur, vel, att=att, rel=2.0, cut=cut))


def cold(bus, t0, dur, vel=0.4, sparkle=True):
    pad(bus, t0, dur, [35, 47, 54, 61, 62], vel, cut=1300, att=2.0)
    if sparkle:
        r = np.random.default_rng(int(t0 * 10))
        t = t0 + 1.0
        scale = [83, 85, 86, 88, 90, 93]
        while t < t0 + dur - 1:
            bus['music'].add(t, musicbox(int(r.choice(scale)) - 12, 0.25), pan=float(r.uniform(-0.6, 0.6)))
            t += float(r.uniform(1.2, 2.4))


def harp_ostinato(bus, t0, dur, vel=0.4):
    seq = ['Bm', 'G', 'D', 'A']
    t = t0
    i = 0
    while t < t0 + dur - 0.05:
        notes = CHORD[seq[(i // 6) % 4]]
        pat = [notes[0] + 12, notes[2], notes[1] + 12, notes[3], notes[2], notes[1] + 12]
        bus['music'].add(t, harp(pat[i % 6], vel), pan=-0.3 + 0.1 * (i % 2))
        t += BEAT / 2
        i += 1


def cascade(bus, t0, dur, vel=0.5):
    scale = [62, 64, 66, 69, 71]
    notes = [s + 12 * o for o in range(0, 4) for s in scale]
    n = len(notes)
    for k, m in enumerate(notes):
        u = (k / (n - 1))
        tk = t0 + dur * (u ** 0.6)
        bus['music'].add(tk, musicbox(m, vel * (0.6 + 0.4 * u)), pan=-0.6 + 1.2 * u)
        if k % 2 == 0:
            bus['music'].add(tk, harp(m - 12, vel * 0.4), pan=0.6 - 1.2 * u)
    bus['music'].add(t0, strings([50, 57, 62, 66, 69], dur + 0.3, 0.55, att=dur * 0.9, rel=0.4, cut=2600))


def reveal(bus, t0, hold=4.5, vel=0.6):
    bus['music'].add(t0, strings([38, 50, 57, 62, 66, 69, 74, 78], hold, vel, att=0.25, rel=3.0, cut=3000))
    bus['music'].add(t0, bell(86, 0.5, 5))
    bus['music'].add(t0, bell(74, 0.4, 5))
    boom = lp(noise(2.5), 90) * np.exp(-tt(int(2.5 * SR)) * 1.6) * 0.35
    bus['music'].add(t0, boom)


def cadence(bus, t_final, vel=0.55, tail=6.0):
    """A4 F#4 E4 | D4 over G A | D: the last chord lands on t_final."""
    t = t_final - 4 * BEAT
    for (m, b) in [(69, 1), (66, 1), (64, 2)]:
        bus['music'].add(t, piano(m, b * BEAT, vel), pan=-0.1)
        t += b * BEAT
    bus['music'].add(t_final - 4 * BEAT, strings(CHORD['G'], 2 * BEAT, 0.45, att=0.4, rel=0.4))
    bus['music'].add(t_final - 2 * BEAT, strings(CHORD['A'], 2 * BEAT, 0.45, att=0.3, rel=0.4))
    bus['music'].add(t_final, piano(62, tail, vel), pan=-0.1)
    bus['music'].add(t_final, piano(50, tail, vel * 0.6), pan=-0.3)
    bus['music'].add(t_final, piano(57, tail, vel * 0.4), pan=-0.3)
    bus['music'].add(t_final, strings([38, 50, 57, 62, 66], tail, 0.5, att=0.5, rel=2.5, cut=2200))
    bus['music'].add(t_final, musicbox(86, 0.35), pan=0.4)


def storm_drone(bus, t0, dur):
    pad(bus, t0, dur, [35, 47, 50, 54], 0.5, cut=900, att=1.0)


def heartbeats(bus, t0, t1, every=1.5, vel=0.45):
    t = t0
    while t < t1:
        bus['music'].add(t, heartbeat(vel))
        t += every


def swell(bus, t0, dur, chord, vel=0.5):
    bus['music'].add(t0, strings(chord, dur, vel, att=dur * 0.85, rel=0.6, cut=2600))


# ------------------------------------------------------------------ sound effects

def sfx_match(soft=False):
    d = 1.2
    n = int(d * SR)
    t = tt(n)
    x = np.zeros(n)
    sc = bp(noise(0.08), 2000, 7000) * (np.abs(RNG.standard_normal(int(0.08 * SR))) ** 2) * 0.6
    x[:len(sc)] += sc
    ig = bp(noise(0.4), 300, 3000) * np.exp(-tt(int(0.4 * SR)) * 9) * 0.9
    i0 = int(0.04 * SR)
    x[i0:i0 + len(ig)] += ig
    wh = lp(noise(0.5), 380) * np.exp(-tt(int(0.5 * SR)) * 6) * 1.2
    x[i0:i0 + len(wh)] += wh
    hiss = lp(noise(d), 700) * 0.06 * np.minimum(1, t / 0.3) * np.exp(-t * 1.5)
    x += hiss
    for _ in range(8):
        k = int(RNG.uniform(0.05, 0.6) * SR)
        x[k:k + 40] += RNG.uniform(-0.4, 0.4)
    x = lp(x, 9000)
    return x / (np.max(np.abs(x)) + 1e-9) * (0.32 if soft else 0.6)


def sfx_lantern_on():
    d = 1.2
    t = tt(int(d * SR))
    nz = noise(d)
    sweep = np.zeros_like(nz)
    # rising whoosh, then a shimmer
    for k, f in enumerate([400, 700, 1100, 1700, 2500]):
        seg = bp(nz, f * 0.8, f * 1.25) * np.exp(-((t - 0.12 * k - 0.1) / 0.12) ** 2)
        sweep += seg
    sh = sum(np.sin(2 * np.pi * midi(m) * t) * np.exp(-((t - 0.35 - 0.06 * i) * 6).clip(0)) * (t > 0.35 + 0.06 * i)
             for i, m in enumerate([86, 90, 93, 98]))
    return sweep * 0.25 + sh * 0.035


def sfx_click():
    x = hp(noise(0.012), 1500) * np.exp(-tt(int(0.012 * SR)) * 300)
    y = np.sin(2 * np.pi * 2100 * tt(int(0.03 * SR))) * np.exp(-tt(int(0.03 * SR)) * 160) * 0.3
    out = np.zeros(int(0.05 * SR))
    out[:len(x)] += x * 0.8
    out[:len(y)] += y
    return out / (np.max(np.abs(out)) + 1e-9) * 0.3


def sfx_scratch(strokes=2, gain=0.5):
    out = np.zeros(int(0.5 * SR))
    for s_ in range(strokes):
        d = 0.14
        nz = bp(noise(d), 1400, 5200)
        rough = np.abs(lp(noise(d), 40)) * 2.5
        seg = nz * rough * np.sin(np.linspace(0, np.pi, len(nz)))
        i = int(s_ * 0.18 * SR)
        out[i:i + len(seg)] += seg
    return out * gain


def sfx_creak():
    d = 0.7
    t = tt(int(d * SR))
    f = 190 + 40 * np.sin(2 * np.pi * 3 * t) + 25 * RNG.standard_normal(len(t)).cumsum() / SR * 30
    x = saw(1.0, np.cumsum(f) / SR, 12)
    x = bp(x, 500, 2200) * np.sin(np.linspace(0, np.pi, len(t))) ** 0.7
    return x * 0.18


def sfx_thud(gain=0.6):
    d = 0.5
    t = tt(int(d * SR))
    x = np.sin(2 * np.pi * 68 * t) * np.exp(-t * 14) + lp(noise(d), 300) * np.exp(-t * 25) * 0.6
    return x * gain


def sfx_step(gain=0.25):
    d = 0.12
    t = tt(int(d * SR))
    x = lp(noise(d), 350) * np.exp(-t * 45) * 1.2 + bp(noise(d), 1200, 4000) * np.exp(-t * 60) * 0.25
    return x * gain


def bed_noise(d, lo, hi, gain, mod_rate=0.0, mod_depth=0.0):
    x = bp(noise(d), lo, hi)
    if mod_rate > 0:
        t = tt(len(x))
        x *= 1 + mod_depth * np.sin(2 * np.pi * mod_rate * t + RNG.uniform(0, 6))
    e = np.ones(len(x))
    k = min(len(x) // 3, int(0.4 * SR))
    e[:k] = np.linspace(0, 1, k)
    e[-k:] = np.linspace(1, 0, k)
    return x * e * gain


def sfx_rain(d, inten=0.5):
    x = bed_noise(d, 1500, 9000, 0.045 * inten)
    for _ in range(int(d * 18 * inten)):
        k = int(RNG.uniform(0, d - 0.02) * SR)
        x[k:k + 60] += hp(RNG.standard_normal(60), 2500) * 0.03 * inten
    return x


def sfx_wind(d, gain=0.25):
    nz = noise(d)
    t = tt(len(nz))
    gust = 0.5 + 0.5 * np.sin(2 * np.pi * 0.23 * t) * np.sin(2 * np.pi * 0.11 * t + 1)
    lo = lp(nz, 500) * (0.4 + gust)
    e = np.ones(len(nz))
    k = min(len(nz) // 3, int(0.5 * SR))
    e[:k] = np.linspace(0, 1, k)
    e[-k:] = np.linspace(1, 0, k)
    return lo * e * gain


def sfx_gust():
    d = 1.6
    t = tt(int(d * SR))
    nz = noise(d)
    x = np.zeros_like(nz)
    for k, f in enumerate([250, 400, 650, 900]):
        x += bp(nz, f * 0.7, f * 1.4) * np.exp(-((t - 0.25 * k - 0.4) / 0.35) ** 2)
    return x * 0.5


def sfx_crickets(d, gain=0.03):
    t = tt(int(d * SR))
    car = np.sin(2 * np.pi * 4300 * t)
    am = (np.sin(2 * np.pi * 28 * t) > 0.3) * (np.sin(2 * np.pi * 0.9 * t) > -0.2)
    return lp(car * am, 6000) * gain


def sfx_birds(d, gain=0.05):
    out = np.zeros(int(d * SR))
    t = 0.2
    while t < d - 0.4:
        n = int(0.12 * SR)
        tk = tt(n)
        f0 = RNG.uniform(2600, 4200)
        f = f0 + RNG.uniform(600, 1400) * np.sin(np.pi * tk / 0.12)
        ch = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tk / 0.12) ** 2
        i = int(t * SR)
        out[i:i + n] += ch[:len(out) - i]
        t += RNG.uniform(0.15, 0.9)
    return out * gain


def sfx_babble(d, gain=0.06):
    nz = noise(d)
    t = tt(len(nz))
    x = np.zeros_like(nz)
    for f, r in ((500, 5.1), (900, 6.3), (1500, 4.4), (700, 3.7)):
        x += bp(nz, f * 0.7, f * 1.4) * (0.5 + 0.5 * np.sin(2 * np.pi * r * t + RNG.uniform(0, 6))) ** 2
    e = np.ones(len(x))
    k = int(0.5 * SR)
    e[:k] = np.linspace(0, 1, k)
    e[-k:] = np.linspace(1, 0, k)
    return x * e * gain


def sfx_alarm(d):
    out = np.zeros(int(d * SR))
    pat = [88, 84, 79, 84]
    t = 0.0
    k = 0
    while t < d - 0.05:
        n = int(0.14 * SR)
        tk = tt(n)
        f = midi(pat[k % 4])
        tone = (np.sin(2 * np.pi * f * tk) + 0.3 * np.sin(2 * np.pi * 4 * f * tk) * np.exp(-tk * 60)) * np.exp(-tk * 18)
        i = int(t * SR)
        out[i:i + n] += tone[:len(out) - i]
        t += 0.15
        k += 1
    return out * 0.18


def sfx_buzz(d):
    t = tt(int(d * SR))
    sq = np.sign(np.sin(2 * np.pi * 160 * t))
    gate = ((t % 0.65) < 0.4).astype(float)
    return lp(sq, 900) * gate * 0.12


def sfx_hum(d, f=120, gain=0.015):
    t = tt(int(d * SR))
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2 * f * t)) * gain * np.minimum(1, t / 0.3)


def sfx_rip():
    d = 0.35
    nz = bp(noise(d), 1000, 6500)
    crack = (np.abs(RNG.standard_normal(len(nz))) > 1.6).astype(float)
    crack = lp(crack, 300) * 3
    return nz * crack * np.sin(np.linspace(0, np.pi, len(nz))) * 0.5


def sfx_marker():
    d = 0.32
    t = tt(int(d * SR))
    f = 2700 + 600 * np.sin(np.pi * t / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.05 + bp(noise(d), 2000, 6000) * 0.15
    return x * np.sin(np.pi * t / d)


def sfx_rustle(d=0.7, gain=0.15):
    x = bp(noise(d), 500, 4000)
    return x * np.sin(np.linspace(0, np.pi, len(x))) ** 2 * gain


def sfx_bloop(down=True):
    d = 0.25
    t = tt(int(d * SR))
    f = (700 - 1800 * t) if down else (400 + 1800 * t)
    return np.sin(2 * np.pi * np.cumsum(np.maximum(f, 80)) / SR) * np.exp(-t * 10) * 0.15


def sfx_die():
    d = 0.4
    t = tt(int(d * SR))
    f = 600 * np.exp(-t * 7) + 60
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.2


def sfx_ringback(d, gain=0.05):
    t = tt(int(d * SR))
    on = (t % 4.0) < 2.0
    return (np.sin(2 * np.pi * 440 * t) + np.sin(2 * np.pi * 480 * t)) * on * gain * np.minimum(1, t / 0.05)


def sfx_breath():
    d = 0.5
    x = bp(noise(d), 300, 2500)
    return x * np.sin(np.linspace(0, np.pi, len(x))) ** 2 * 0.25


def sfx_tick_bed(d, every=0.5, gain=0.06):
    out = np.zeros(int(d * SR))
    t = 0.05
    k = 0
    while t < d:
        c = hp(noise(0.01), 3000) * np.exp(-tt(int(0.01 * SR)) * 500) * (gain if k % 2 == 0 else gain * 0.7)
        i = int(t * SR)
        out[i:i + len(c)] += c[:len(out) - i]
        t += every
        k += 1
    return out


def sfx_typing(d):
    out = np.zeros(int(d * SR))
    t = 0.1
    while t < d - 0.05:
        c = bp(noise(0.02), 1500, 5000) * np.exp(-tt(int(0.02 * SR)) * 250) * 0.12
        i = int(t * SR)
        out[i:i + len(c)] += c[:len(out) - i]
        t += RNG.uniform(0.06, 0.2)
    return out


def sfx_shimmer(d, gain=0.03):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 40)):
        u = k / max(1, d * 40)
        t0 = d * u ** 0.6
        m = 86 + int(u * 14) + int(RNG.integers(0, 3))
        n = int(0.4 * SR)
        g = np.sin(2 * np.pi * midi(m) * tt(n)) * np.exp(-tt(n) * 9)
        i = int(t0 * SR)
        out[i:i + n] += g[:len(out) - i] * (0.4 + u)
    return out * gain


def make_sfx(kind, args, bus, T):
    s = bus['sfx']
    b = bus['bed']
    if kind == 'match':
        s.add(T, sfx_match(), 1.0)
    elif kind == 'match_soft':
        s.add(T, sfx_match(True), 0.8)
    elif kind == 'match_out':
        s.add(T, sfx_breath() * 0.6)
    elif kind in ('lantern_on', 'flame_back'):
        s.add(T, sfx_lantern_on(), 1.0)
    elif kind == 'lamp_click':
        s.add(T, sfx_click(), 0.6)
        s.add(T + 0.05, sfx_lantern_on(), 0.8)
    elif kind == 'scratch':
        s.add(T, sfx_scratch(2, 0.5), 1.0, pan=0.2)
    elif kind == 'scratch_run':
        d = args[0]
        k = 0
        while k * 0.09 < d:
            s.add(T + k * 0.09, sfx_scratch(1, 0.25), 1.0, pan=0.2)
            k += 1
    elif kind == 'door_open':
        s.add(T, sfx_creak(), 1.0, pan=0.4)
        s.add(T, sfx_click(), 0.4, pan=0.4)
    elif kind == 'door_close':
        s.add(T, sfx_thud(0.5), 1.0, pan=0.4)
        s.add(T + 0.02, sfx_click(), 0.5, pan=0.4)
    elif kind == 'tick_bed':
        b.add(T, sfx_tick_bed(args[0] if args else 3.75), 1.0, pan=-0.2)
    elif kind == 'rain_bed':
        b.add(T, sfx_rain(args[0], args[1] if len(args) > 1 else 0.5))
    elif kind == 'storm_bed':
        b.add(T, sfx_rain(args[0], 1.3))
        b.add(T, sfx_wind(args[0], 0.16))
        rum = lp(noise(3.0), 110) * np.exp(-tt(int(3 * SR)) * 1.2) * 0.35
        b.add(T + 0.3, rum)
    elif kind == 'gust':
        s.add(T, sfx_gust(), 1.0)
    elif kind == 'sack':
        s.add(T, sfx_rustle(0.6, 0.2))
    elif kind == 'sack_drop':
        s.add(T, sfx_thud(0.6))
    elif kind == 'bike_bed':
        d = args[0]
        t = tt(int(d * SR))
        chain = sfx_tick_bed(d, every=1 / 12.0, gain=0.03)
        tire = lp(noise(d), 250) * 0.05
        b.add(T, chain + tire)
        b.add(T, sfx_wind(d, 0.12))
    elif kind == 'dusk_bed':
        b.add(T, sfx_crickets(args[0], 0.02))
    elif kind == 'yard_bed':
        b.add(T, sfx_babble(args[0], 0.07))
        b.add(T, sfx_birds(args[0], 0.025))
    elif kind == 'phone_hum':
        b.add(T, sfx_hum(args[0], 3000, 0.004))
    elif kind == 'phone_flip':
        s.add(T, sfx_click(), 0.5, pan=-0.4)
    elif kind == 'dawn_bed':
        b.add(T, sfx_birds(args[0], 0.03))
        b.add(T, sfx_wind(args[0], 0.06))
    elif kind == 'alarm':
        s.add(T, sfx_alarm(args[0]), 1.0, pan=-0.4)
    elif kind == 'snooze':
        s.add(T, sfx_click(), 0.6, pan=-0.4)
        s.add(T, sfx_thud(0.15), 1.0, pan=-0.4)
    elif kind == 'blanket':
        s.add(T, sfx_rustle(0.8, 0.2))
    elif kind == 'city_bed':
        b.add(T, bed_noise(args[0], 40, 300, 0.12, 0.1, 0.3))
    elif kind == 'kitchen_bed':
        b.add(T, sfx_hum(args[0], 60, 0.02))
    elif kind == 'marker':
        s.add(T, sfx_marker(), 1.0, pan=0.2)
    elif kind == 'rip':
        s.add(T, sfx_rip(), 1.0, pan=0.2)
        s.add(T + 0.3, sfx_rustle(0.5, 0.08), 1.0, pan=0.3)
    elif kind == 'fog_bed':
        b.add(T, bed_noise(args[0], 50, 220, 0.12))
        b.add(T, sfx_hum(args[0], 3200, 0.002))
    elif kind == 'call_ring':
        s.add(T, sfx_buzz(args[0]), 1.0)
    elif kind == 'decline':
        s.add(T, sfx_click(), 0.6)
        s.add(T + 0.03, sfx_bloop(True))
    elif kind == 'notify':
        s.add(T, bell(93, 0.25, 1.5))
    elif kind == 'flicker':
        s.add(T, sfx_click(), 0.3)
        s.add(T + 0.4, sfx_click(), 0.25)
    elif kind == 'die':
        s.add(T, sfx_die())
    elif kind == 'night_out':
        b.add(T, sfx_crickets(args[0], 0.025))
    elif kind == 'room_tone':
        b.add(T, bed_noise(args[0], 60, 400, 0.02))
        b.add(T, sfx_tick_bed(args[0], 0.5, 0.045), pan=0.3)
    elif kind == 'lantern_lift':
        s.add(T, sfx_click(), 0.35, pan=0.5)
        s.add(T + 0.05, bell(98, 0.06, 0.6), pan=0.5)
    elif kind == 'cascade':
        s.add(T, sfx_shimmer(args[0], 0.025))
    elif kind == 'reveal':
        pass
    elif kind == 'typing':
        b.add(T, sfx_typing(args[0]))
    elif kind == 'pushups':
        d = args[0]
        k = 0
        while k / 1.1 < d:
            s.add(T + k / 1.1 + 0.4, sfx_thud(0.08), 1.0)
            s.add(T + k / 1.1 + 0.1, sfx_breath() * 0.25, 1.0)
            k += 1
    elif kind == 'notes_run':
        d = args[0]
        k = 0
        while k * 0.12 < d:
            s.add(T + k * 0.12, sfx_rustle(0.15, 0.08), 1.0, pan=0.1)
            k += 1
    elif kind == 'dawn_road':
        b.add(T, sfx_birds(args[0], 0.03))
    elif kind == 'birds':
        b.add(T, sfx_birds(args[0], 0.05))
    elif kind == 'blow':
        s.add(T, sfx_breath())
    elif kind == 'paper_slide':
        s.add(T, sfx_rustle(0.5, 0.12))
    elif kind == 'call_out':
        s.add(T, sfx_ringback(3.6, 0.04))
    elif kind == 'end_bed':
        b.add(T, bed_noise(args[0], 60, 400, 0.015))
        b.add(T, sfx_tick_bed(args[0], 0.5, 0.03), pan=0.3)


def place_events(edl, bus):
    acc = 0.0
    for (name, a, b_) in edl:
        for ev in shots.EVENTS.get(name, []):
            if ev[0] == 'steps':
                _k, t0, t1, speed, H = ev
                lo, hi = max(a, t0), min(b_, t1)
                if hi <= lo:
                    continue
                every = (0.52 * H) / speed
                t = lo + (every - ((lo - t0) % every)) % every
                while t < hi:
                    bus['sfx'].add(acc + t - a, sfx_step(), 1.0)
                    t += every
                continue
            t0, kind = ev[0], ev[1]
            args = list(ev[2:])
            if kind.endswith('_bed') or kind in ('room_tone', 'night_out', 'phone_hum', 'typing', 'cascade', 'call_ring', 'alarm', 'scratch_run', 'notes_run', 'pushups'):
                if args:
                    d = args[0]
                    lo, hi = max(a, t0), min(b_, t0 + d)
                    if hi - lo < 0.15:
                        continue
                    make_sfx(kind, [hi - lo] + args[1:], bus, acc + lo - a)
                    continue
            if a - 1e-6 <= t0 < b_:
                make_sfx(kind, args, bus, acc + t0 - a)
        acc += b_ - a
    return acc


# ------------------------------------------------------------------ music per cut

def music_master(bus):
    pad(bus, 4.5, 3.4, [38, 50, 57], 0.25, cut=900, att=2.5)
    t = lullaby(bus, 7.5, ['A', 'A2'], mel='musicbox', lh=True, vel=0.45)             # 7.5 - 25.5
    lullaby(bus, 25.5, ['B'], mel='piano', lh=True, vel=0.42, until=27.75)
    storm_drone(bus, 27.75, 6.0)
    for k, m in enumerate([69, 66, 67, 66]):
        bus['music'].add(31.2 + k * BEAT, musicbox(m + 12, 0.3), pan=0.4)
    lullaby(bus, 33.75, ['A'], mel='piano', lh=True, vel=0.38, chords=['Am'], until=39.75)
    for k, (m, b) in enumerate([(69, 2), (66, 1), (67, 1), (66, 1), (64, 1)]):
        bus['music'].add(39.75 + sum(bb for _mm, bb in [(69, 2), (66, 1), (67, 1), (66, 1), (64, 1)][:k]) * BEAT, musicbox(m + 12, 0.28), pan=0.4)
    for k, m in enumerate([69, 66, 64]):
        bus['music'].add(45.75 + k * 1.5, piano(m, 1.4, 0.35), pan=-0.1)
    pad(bus, 45.75, 6.3, CHORD['A'], 0.35, cut=1800)
    # act two
    harp_ostinato(bus, 52.9, 13.1, 0.45)
    pad(bus, 52.9, 13.0, [35, 47, 54], 0.32, cut=900)
    cold(bus, 66.0, 7.5, 0.55)
    pad(bus, 73.5, 6.6, [35, 47], 0.45, cut=500, att=1.0)
    # the wall
    swell(bus, 88.9, 0.9, [50, 57, 62], 0.35)
    cascade(bus, 89.8, 3.6, 0.5)
    reveal(bus, 92.6, hold=4.8)
    lullaby(bus, 93.6, ['A2'], mel='piano', lh=False, vel=0.36, until=97.5)
    # his turn
    heartbeats(bus, 97.5, 110.0, 1.5, 0.4)
    lullaby(bus, 97.5, ['A'], mel='piano', lh=True, vel=0.42, strings_pad=True)        # 97.5 - 106.5
    lullaby(bus, 106.5, ['B'], mel='both', lh=True, harp_arp=True, strings_pad=True, vel=0.45, until=110.25)
    storm_drone(bus, 110.25, 3.2)
    heartbeats(bus, 110.25, 113.2, 0.75, 0.35)
    swell(bus, 113.25, 3.0, [50, 57, 62, 66, 69], 0.6)
    # dawn: the full theme
    lullaby(bus, 116.25, ['A2'], mel='both', lh=True, harp_arp=True, strings_pad=True, vel=0.5, until=126.75)
    bus['music'].add(122.25, bell(86, 0.3, 4))
    # the loop: the music box again, for a new child
    lullaby(bus, 126.75, ['A'], mel='musicbox', lh=False, vel=0.38, until=134.25)
    pad(bus, 128.0, 6.0, [50, 57, 62], 0.25, cut=1400)
    # end card: the cadence lands on "Give him one."
    cadence(bus, 134.25 + 6.0 + 3.6, vel=0.5, tail=6.4)


def music_short_wall(bus):
    lullaby(bus, 3.0, ['A2'], mel='musicbox', lh=True, vel=0.42, until=7.125)
    cold(bus, 7.125, 3.75, 0.35, sparkle=False)
    swell(bus, 11.775, 0.9, [50, 57, 62], 0.35)
    cascade(bus, 12.675, 3.6, 0.5)
    reveal(bus, 15.475, hold=4.0)
    lullaby(bus, 16.3, ['A2'], mel='piano', lh=False, vel=0.36, until=19.4)
    cadence(bus, 19.475 + 3.6, vel=0.5, tail=1.4)


def music_short_lights(bus):
    cold(bus, 0.0, 6.0, 0.4, sparkle=True)
    swell(bus, 7.1, 0.9, [50, 57, 62], 0.35)
    cascade(bus, 8.0, 1.8, 0.45)
    heartbeats(bus, 9.8, 14.7, 1.5, 0.4)
    lullaby(bus, 9.8, ['A'], mel='both', lh=True, strings_pad=True, vel=0.45, until=14.7)
    cadence(bus, 14.76 + 3.6, vel=0.5, tail=1.4)


def music_short_loop(bus):
    lullaby(bus, 3.75, ['A', 'A2'], mel='musicbox', lh=True, vel=0.42, until=16.2)
    swell(bus, 16.2, 1.5, [50, 57, 62], 0.35)
    cascade(bus, 17.9, 3.6, 0.5)
    reveal(bus, 21.5, hold=2.6)
    lullaby(bus, 24.1, ['A2'], mel='both', lh=True, harp_arp=True, strings_pad=True, vel=0.48, until=29.35)
    lullaby(bus, 29.35, ['A'], mel='musicbox', lh=False, vel=0.38, until=36.85)
    pad(bus, 29.35, 7.5, [50, 57, 62], 0.25, cut=1400)
    bus['music'].add(36.85, piano(62, 1.5, 0.4))


MUSIC = {'master': music_master, 'short_wall': music_short_wall, 'short_lights': music_short_lights, 'short_loop': music_short_loop}


def reverb_ir(d=2.6, seed=3):
    r = np.random.default_rng(seed)
    n = int(d * SR)
    t = tt(n)
    out = []
    for ch in range(2):
        x = r.standard_normal(n) * np.exp(-t * 2.6)
        x = lp(x, 5000) * (1 - np.exp(-t * 60))
        out.append(x / np.sqrt(np.sum(x ** 2)))
    return out


def build(key):
    edl = render.EDLS[key]
    dur = render.duration(edl)
    bus = {'music': Bus(dur), 'sfx': Bus(dur), 'bed': Bus(dur)}
    place_events(edl, bus)
    MUSIC[key](bus)
    irL, irR = reverb_ir()
    mL, mR = bus['music'].L, bus['music'].R
    wetL = signal.fftconvolve(mL, irL)[:len(mL)]
    wetR = signal.fftconvolve(mR, irR)[:len(mR)]
    mus = np.vstack([mL * 0.8 + wetL * 0.55, mR * 0.8 + wetR * 0.55])
    sL, sR = bus['sfx'].L, bus['sfx'].R
    swl = signal.fftconvolve(sL, irL[: int(0.8 * SR)])[:len(sL)]
    swr = signal.fftconvolve(sR, irR[: int(0.8 * SR)])[:len(sR)]
    sfx = np.vstack([sL + swl * 0.18, sR + swr * 0.18])
    bed = np.vstack([bus['bed'].L, bus['bed'].R])
    mix = mus * 1.0 + sfx * 0.8 + bed * 0.8
    n = int(round(dur * SR))
    mix = mix[:, :n]
    # gentle fade at the very end so the loop point / end screen does not click
    f = int(0.25 * SR)
    mix[:, -f:] *= np.linspace(1, 0, f)
    mix = hp(mix, 25)
    peak = np.max(np.abs(mix)) + 1e-9
    mix = mix / peak * 0.5      # headroom; mux.py brings it to -14 LUFS with a true-peak limit
    return mix.astype(np.float32)


if __name__ == '__main__':
    key, out = sys.argv[1], sys.argv[2]
    mix = build(key)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    wavfile.write(out, SR, mix.T)
    print(key, 'audio', mix.shape[1] / SR, 's ->', out)
