"""EP03 audio: music-box lullaby that turns into piano + pad at "25 YEARS LATER", plus night SFX.

usage: python3 scripts/make_ep03_audio.py public/audio
"""
import os
import sys
import wave

import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(23)


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


def hz(n):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}
    return 440 * 2 ** ((names[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


# ---------------- SFX ----------------
t = t_(0.35)
pf = rng.standard_normal(len(t))
pf = (pf - lowpass(pf, 1500)) * np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 1.5
write("pageflip.wav", lowpass(pf, 6000))

knock = np.zeros(int(0.8 * SR))
for i in range(3):
    tt = t_(0.12)
    k = np.sin(2 * np.pi * 170 * tt) * np.exp(-tt * 45) + 0.5 * lowpass(rng.standard_normal(len(tt)), 2000) * np.exp(-tt * 120)
    st = int(i * 0.19 * SR)
    knock[st : st + len(k)] += k
write("knock.wav", knock)

t = t_(0.7)
hf = lowpass(rng.standard_normal(len(t)), 1200) * np.sin(np.pi * np.clip(t / 0.6, 0, 1)) ** 0.8
write("huff.wav", hf)

crick = np.zeros(int(32.5 * SR))
for k in range(70):
    st = rng.uniform(0, 31.6)
    f0 = rng.uniform(4200, 5200)
    for p in range(3):
        n = int(0.035 * SR)
        tt = np.arange(n) / SR
        i0 = int((st + p * 0.06) * SR)
        if i0 + n < len(crick):
            crick[i0 : i0 + n] += np.sin(2 * np.pi * f0 * tt) * np.sin(np.pi * tt / tt[-1]) * rng.uniform(0.3, 0.8)
write("crickets.wav", crick + lowpass(rng.standard_normal(len(crick)) * 0.05, 250))


# ---------------- score ----------------
def musicbox(f, d=1.6, vel=0.6):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.6) + 0.45 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 7) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 14)
    return x * env(len(t), 0.002, 0.05) * vel


def piano(f, d, vel=0.7):
    t = t_(d)
    x = np.zeros(len(t))
    for n in range(1, 11):
        fn = f * n * np.sqrt(1 + 0.00025 * n * n)
        if fn > SR / 2.2:
            break
        x += (1 / n ** 1.35) * (0.6 + 0.4 * vel) ** (n * 0.5) * np.sin(2 * np.pi * fn * t + rng.uniform(0, 6.28)) * np.exp(-t * (0.9 + 0.55 * n + f / 900))
    return x * env(len(t), 0.004, 0.08) * vel


def pad(freqs, d, vel=0.25):
    t = t_(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0, 0.0045):
            x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28))
    x = lowpass(x, 1300)
    return x * np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.0).clip(0) * vel / len(freqs)


DUR = 32.5
BAR = 22.6 / 7
Q = BAR / 4
mix = np.zeros(int(DUR * SR) + SR * 6)


def place(x, at, gain=1.0):
    st = int(at * SR)
    end = min(len(mix), st + len(x))
    mix[st:end] += x[: end - st] * gain


CH = {
    "F": ["F2", "C3", "F3", "A3", "C4", "F4"],
    "C": ["C3", "G3", "C4", "E4", "G4", "C5"],
    "Dm": ["D3", "A3", "D4", "F4", "A4", "D5"],
    "Bb": ["Bb2", "F3", "Bb3", "D4", "F4", "Bb4"],
    "Bbmaj7": ["Bb2", "F3", "A3", "D4", "F4", "A4"],
}
prog = ["F", "C", "Dm", "Bb", "F", "C", "Bb", "Dm", "Bb", "Bbmaj7"]
# lullaby line (music box), two notes per beat in bars 0-6
lull = [["C5", "A4", "F4", "A4"], ["C5", "G4", "E4", "G4"], ["D5", "A4", "F4", "A4"], ["D5", "Bb4", "F4", "Bb4"], ["C5", "A4", "F4", "A4"], ["E5", "C5", "G4", "C5"], ["D5", "Bb4", "F4", "D5"]]
for b, ch in enumerate(prog):
    tones = CH[ch]
    t0 = b * BAR
    if b < 7:
        for i, n in enumerate(lull[b]):
            place(musicbox(hz(n), 1.8, 0.55), t0 + i * Q)
            if b > 0:
                place(musicbox(hz(tones[3]) * 2, 1.0, 0.18), t0 + i * Q + Q / 2)
        place(musicbox(hz(tones[1]), 2.5, 0.35), t0)
    elif b < 9:
        place(piano(hz(tones[0]), BAR * 1.6, 0.55), t0, 0.9)
        for i, idx in enumerate([1, 2, 3, 4, 2, 3, 4, 3]):
            place(piano(hz(tones[idx]), Q * 1.5, 0.52 * (0.85 if i % 2 else 1)), t0 + i * Q / 2)
        place(pad([hz(n) for n in tones[1:4]], BAR, 0.5), t0)
    else:
        for i, n in enumerate(tones):
            place(piano(hz(n), 5.0, 0.6), t0 + i * 0.03)
        place(pad([hz(n) for n in tones[1:5]], BAR * 1.4, 0.5), t0)

mel = [(7, 0, "A4", 1), (7, 1, "C5", 1), (7, 2, "D5", 2), (8, 0, "F5", 1.5), (8, 1.5, "D5", 0.5), (8, 2, "C5", 1), (8, 3, "Bb4", 1), (9, 0, "A4", 4)]
for bar, beat, n, length in mel:
    place(piano(hz(n), max(1.2, length * Q * 1.8), 0.75), bar * BAR + beat * Q, 0.9)

dry = mix[: int(DUR * SR)]
n_ir = int(2.6 * SR)
tt = np.arange(n_ir) / SR
irs = [lowpass(rng.standard_normal(n_ir) * np.exp(-tt * 2.4), 5000) for _ in range(2)]
nfft = 1 << int(np.ceil(np.log2(len(dry) + n_ir)))
D = np.fft.rfft(dry, nfft)
wet = [np.fft.irfft(D * np.fft.rfft(ir, nfft), nfft)[: len(dry)] for ir in irs]
wet = [w / np.max(np.abs(w)) for w in wet]
d = dry / np.max(np.abs(dry))
fade = np.ones(len(d))
fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
write("ep03-music.wav", np.stack([(0.7 * d + 0.4 * wet[0]) * fade, (0.7 * d + 0.4 * wet[1]) * fade], axis=1))
print("EP03 audio written to", OUT)
