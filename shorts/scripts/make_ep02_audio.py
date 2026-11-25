"""EP02 audio: playful marimba score that turns into piano + pad at "25 YEARS LATER", plus new SFX.

usage: python3 scripts/make_ep02_audio.py public/audio
"""
import os
import sys
import wave

import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)


def write(name, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    x = x / (np.max(np.abs(x)) or 1) * 0.89
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t_(d):
    return np.arange(int(SR * d)) / SR


def lowpass(x, cutoff):
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def env(n, a=0.004, r=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if r:
        nr = min(n, int(r * SR))
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


# ---------------- SFX ----------------
def clap_once():
    d = 0.12
    x = np.zeros(int(d * SR))
    for k in range(3):  # a clap is a few micro-bursts
        st = int(k * 0.008 * SR)
        n = int(0.02 * SR)
        b = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 180)
        x[st : st + n] += b
    x = x - lowpass(x, 900)
    return lowpass(x, 5000) * np.exp(-t_(d) * 30)


claps = np.zeros(int(1.6 * SR))
for i in range(6):
    c = clap_once() * (0.8 + 0.2 * rng.random())
    st = int((i * 0.21 + rng.random() * 0.02) * SR)
    claps[st : st + len(c)] += c
write("clap.wav", claps)

t = t_(0.35)
write("bounce.wav", np.sin(2 * np.pi * 95 * t) * np.exp(-t * 16) + 0.5 * lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 60))

t = t_(0.4)
sw = rng.standard_normal(len(t))
sw = sw - lowpass(sw, 2500)
write("swish.wav", sw * np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 2 * np.exp(-t * 3))

t = t_(1.2)
f = 650 + 500 * np.sin(np.pi * np.clip(t / 1.0, 0, 1)) + 25 * np.sin(2 * np.pi * 7 * t)
whee = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * np.clip(t / 1.1, 0, 1)) * 0.5
whee += 0.6 * lowpass(rng.standard_normal(len(t)), 600 + 2500 * np.sin(np.pi * np.clip(t / 1.1, 0, 1))) * np.sin(np.pi * np.clip(t / 1.1, 0, 1))
write("slide.wav", whee)


def ks(freq, d=2.6, damp=0.996):
    """Karplus-Strong plucked string."""
    n = int(d * SR)
    period = int(SR / freq)
    buf = rng.uniform(-1, 1, period)
    out = np.zeros(n)
    for i in range(n):
        j = i % period
        out[i] = buf[j]
        buf[j] = damp * 0.5 * (buf[j] + buf[(j + 1) % period])
    return out


def hz(n):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    return 440 * 2 ** ((names[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


strum = np.zeros(int(3.0 * SR))
for i, n in enumerate(["G2", "B2", "D3", "G3", "B3", "G4"]):
    s = ks(hz(n))
    st = int(i * 0.018 * SR)
    strum[st : st + len(s)] += s[: len(strum) - st] * (0.9 - i * 0.05)
write("strum.wav", lowpass(strum, 4200))

t = t_(0.5)
beep = np.zeros(len(t))
for st in (0.0, 0.18):
    i0 = int(st * SR)
    n = int(0.09 * SR)
    beep[i0 : i0 + n] += np.sin(2 * np.pi * 1320 * t[:n]) * env(n, 0.003, 0.02)
write("rec.wav", beep)

# birds: quiet ambience bed (32 s)
birds = np.zeros(int(32.5 * SR))
for k in range(46):
    st = rng.uniform(0, 31.5)
    n = int(rng.uniform(0.08, 0.2) * SR)
    tt = np.arange(n) / SR
    f0 = rng.uniform(2600, 4200)
    ch = np.sin(2 * np.pi * np.cumsum(f0 + 900 * np.sin(2 * np.pi * rng.uniform(12, 30) * tt)) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
    for rep in range(rng.integers(1, 4)):
        i0 = int((st + rep * 0.14) * SR)
        if i0 + n < len(birds):
            birds[i0 : i0 + n] += ch * rng.uniform(0.3, 1)
wind = lowpass(rng.standard_normal(len(birds)) * 0.08, 300)
write("birds.wav", birds + wind)

# ---------------- score ----------------
def piano(f, d, vel=0.7):
    t = t_(d)
    x = np.zeros(len(t))
    for n in range(1, 11):
        fn = f * n * np.sqrt(1 + 0.00025 * n * n)
        if fn > SR / 2.2:
            break
        x += (1 / n ** 1.35) * (0.6 + 0.4 * vel) ** (n * 0.5) * np.sin(2 * np.pi * fn * t + rng.uniform(0, 6.28)) * np.exp(-t * (0.9 + 0.55 * n + f / 900))
    return x * env(len(t), 0.004, 0.08) * vel


def marimba(f, d=0.9, vel=0.6):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 18) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 40)
    return x * env(len(t), 0.002, 0.05) * vel


def pad(freqs, d, vel=0.25):
    t = t_(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0, 0.0045):
            x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28))
    x = lowpass(x, 1400)
    return x * np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.0).clip(0) * vel / len(freqs)


DUR = 32.5
BAR = 22.6 / 7
E8 = BAR / 8
mix = np.zeros(int(DUR * SR) + SR * 6)


def place(x, at, gain=1.0):
    st = int(at * SR)
    end = min(len(mix), st + len(x))
    mix[st:end] += x[: end - st] * gain


CH = {
    "G": ["G2", "D3", "G3", "B3", "D4", "G4"],
    "D": ["D2", "A2", "D3", "F#3", "A3", "D4"],
    "Em": ["E2", "B2", "E3", "G3", "B3", "E4"],
    "C": ["C3", "G3", "C4", "E4", "G4", "C5"],
    "Cmaj7": ["C3", "G3", "B3", "E4", "G4", "B4"],
}
prog = ["G", "D", "Em", "C", "G", "D", "C", "Em", "C", "Cmaj7"]
bounce = [2, 4, 3, 5, 2, 4, 3, 4]
for b, ch in enumerate(prog):
    tones = CH[ch]
    t0 = b * BAR
    if b < 7:  # playful: marimba eighths + plucked bass on 1 and 3
        for i, idx in enumerate(bounce):
            if b == 0 and i % 2:
                continue
            place(marimba(hz(tones[idx]) , 0.8, 0.5 if i % 2 else 0.62), t0 + i * E8)
        for beat in (0, 2):
            place(marimba(hz(tones[0]), 1.2, 0.7), t0 + beat * BAR / 4, 0.8)
    elif b < 9:  # emotional turn
        place(piano(hz(tones[0]), BAR * 1.6, 0.55), t0, 0.9)
        for i, idx in enumerate([1, 2, 3, 4, 2, 3, 4, 3]):
            place(piano(hz(tones[idx]), E8 * 3, 0.55 * (0.85 if i % 2 else 1)), t0 + i * E8)
        place(pad([hz(n) for n in tones[1:4]], BAR, 0.5), t0)
    else:
        for i, n in enumerate(tones):
            place(piano(hz(n), 5.0, 0.6), t0 + i * 0.03)
        place(pad([hz(n) for n in tones[1:5]], BAR * 1.4, 0.5), t0)

mel = [(7, 0, "B4", 1), (7, 1, "D5", 1), (7, 2, "E5", 2), (8, 0, "G5", 1.5), (8, 1.5, "E5", 0.5), (8, 2, "D5", 1), (8, 3, "C5", 1), (9, 0, "B4", 4)]
for bar, beat, n, length in mel:
    place(piano(hz(n), max(1.2, length * BAR / 4 * 1.8), 0.75), bar * BAR + beat * BAR / 4, 0.9)

dry = mix[: int(DUR * SR)]
n_ir = int(2.2 * SR)
tt = np.arange(n_ir) / SR
irs = [lowpass(rng.standard_normal(n_ir) * np.exp(-tt * 2.8), 5000) for _ in range(2)]
nfft = 1 << int(np.ceil(np.log2(len(dry) + n_ir)))
D = np.fft.rfft(dry, nfft)
wet = [np.fft.irfft(D * np.fft.rfft(ir, nfft), nfft)[: len(dry)] for ir in irs]
wet = [w / np.max(np.abs(w)) for w in wet]
d = dry / np.max(np.abs(dry))
fade = np.ones(len(d))
fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
write("ep02-music.wav", np.stack([(0.74 * d + 0.34 * wet[0]) * fade, (0.74 * d + 0.34 * wet[1]) * fade], axis=1))
print("EP02 audio written to", OUT)
