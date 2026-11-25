"""Synthesize all SFX + the EP01 piano score (royalty-free, generated from scratch).

usage: python3 scripts/make_audio.py public/audio
"""
import sys, os, wave
import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def write(name, x, stereo=False):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    peak = np.max(np.abs(x)) or 1
    x = x / peak * 0.89
    data = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, r=None):
    e = np.ones(n)
    na = max(1, int(a * SR))
    e[:na] = np.linspace(0, 1, na)
    if r:
        nr = min(n, int(r * SR))
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lowpass(x, cutoff):
    """One-pole lowpass; cutoff may be an array (time-varying)."""
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def sweep(f0, f1, d, curve=2.0):
    t = t_(d)
    f = f0 + (f1 - f0) * (t / d) ** (1 / curve)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------- SFX ----------------
def pop(f0=950, f1=320, d=0.09, noise=0.15):
    t = t_(d)
    x = sweep(f0, f1, d, 1.5) * np.exp(-t * 38)
    x += noise * rng.standard_normal(len(t)) * np.exp(-t * 300)
    return x * env(len(t), 0.002)


def bell(f0, d=1.4, partials=((1, 1, 2.2), (2.76, 0.5, 4), (5.4, 0.25, 7), (8.9, 0.12, 10))):
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * k) for r, a, k in partials)
    return x * env(len(t), 0.002)


def noise_burst(d, lp=2000, decay=30):
    t = t_(d)
    return lowpass(rng.standard_normal(len(t)), lp) * np.exp(-t * decay)


write("pop.wav", pop())
write("pop-low.wav", pop(520, 190, 0.12, 0.08) * 0.8)
write("tick.wav", np.sin(2 * np.pi * 2100 * t_(0.035)) * np.exp(-t_(0.035) * 120))
t = t_(0.35)
write("boing.wav", np.sin(2 * np.pi * np.cumsum(330 + 240 * t / 0.35 + 40 * np.sin(2 * np.pi * 18 * t)) / SR) * np.exp(-t * 9) * env(len(t), 0.003))
# paper flutter: band-limited noise with flapping AM
t = t_(0.9)
fl = highpass(lowpass(rng.standard_normal(len(t)), 3500), 600) * (0.5 + 0.5 * np.sin(2 * np.pi * (14 - 6 * t) * t)) * np.exp(-t * 2.5)
write("flutter.wav", fl * env(len(t), 0.02, 0.2))
write("ding.wav", bell(1318.5) + 0.6 * np.pad(bell(1975.5, 1.2), (int(0.09 * SR), int(0.2 * SR)))[: int(1.4 * SR)])
# whoosh: noise through a sweeping lowpass, rise-fall envelope
d = 0.45
t = t_(d)
cut = 300 + 5200 * np.sin(np.pi * t / d) ** 2
wh = lowpass(rng.standard_normal(len(t)), cut) * np.sin(np.pi * t / d) ** 1.5
write("whoosh.wav", wh)
# counter: rising coin blips
d = 0.75
x = np.zeros(int(d * SR))
for i in range(11):
    st = int(i * 0.062 * SR)
    b = bell(880 * 2 ** (i / 12 * 1.1), 0.12, ((1, 1, 30), (2, 0.4, 40)))
    x[st : st + len(b)] += b[: len(x) - st] * (0.6 + 0.04 * i)
write("counter.wav", x)
# rocket: noise swell + rising tone
d = 1.1
t = t_(d)
rk = lowpass(rng.standard_normal(len(t)), 900 + 3000 * t / d) * np.minimum(1, t * 4) * np.exp(-(t - 0.6).clip(0) * 4)
rk += 0.35 * sweep(300, 1400, d, 0.7) * np.minimum(1, t * 3) * np.exp(-t * 1.5)
write("rocket.wav", rk)
# door: latch click + short creak
d = 0.7
t = t_(d)
creak_f = 180 + 60 * np.sin(2 * np.pi * 7 * t) + 25 * rng.standard_normal(len(t)).cumsum() / SR * 30
creak = np.sign(np.sin(2 * np.pi * np.cumsum(creak_f) / SR)) * 0.25
creak = lowpass(highpass(creak, 300), 2400) * np.sin(np.pi * np.clip((t - 0.05) / 0.55, 0, 1))
click = np.zeros(len(t))
c = noise_burst(0.03, 5000, 200)
click[: len(c)] += c
write("door.wav", creak * 0.7 + click)
# slam: thump
t = t_(0.35)
write("slam.wav", np.sin(2 * np.pi * 70 * t) * np.exp(-t * 14) + 0.6 * noise_burst(0.35, 1200, 25))
# sparkle: quick high arpeggio
x = np.zeros(int(1.1 * SR))
for i, f in enumerate([1046.5, 1318.5, 1568, 2093]):
    b = bell(f, 0.8) * 0.5
    st = int(i * 0.07 * SR)
    x[st : st + len(b)] += b[: len(x) - st]
write("sparkle.wav", x)
# steps: four soft heel thumps
x = np.zeros(int(1.6 * SR))
for i in range(4):
    tt = t_(0.18)
    s = np.sin(2 * np.pi * 85 * tt) * np.exp(-tt * 30) + 0.4 * noise_burst(0.18, 700, 40)
    st = int(i * 0.36 * SR)
    x[st : st + len(s)] += s * (0.8 + 0.1 * (i % 2))
write("steps.wav", x)
# click: lamp switch
x = np.zeros(int(0.12 * SR))
for st in (0, int(0.018 * SR)):
    c = noise_burst(0.02, 6000, 300)
    x[st : st + len(c)] += c
write("click.wav", x)
# run: light pitter-patter
x = np.zeros(int(1.0 * SR))
for i in range(7):
    tt = t_(0.08)
    s = np.sin(2 * np.pi * 140 * tt) * np.exp(-tt * 60) + 0.3 * noise_burst(0.08, 1500, 70)
    st = int(i * 0.135 * SR)
    x[st : st + len(s)] += s
write("run.wav", x)

# impact: soft low boom under the moral card
t = t_(2.0)
imp = np.sin(2 * np.pi * 52 * t) * np.exp(-t * 2.2) + 0.5 * np.sin(2 * np.pi * 104 * t) * np.exp(-t * 3)
imp += 0.25 * lowpass(rng.standard_normal(len(t)), 400) * np.exp(-t * 6)
write("impact.wav", imp * env(len(t), 0.01))

# ---------------- piano score ----------------
def note_hz(n):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pitch, octave = n[:-1], int(n[-1])
    return 440 * 2 ** ((names[pitch] + 12 * (octave + 1) - 69) / 12)


def piano(f, d, vel=0.7):
    t = t_(d)
    x = np.zeros(len(t))
    for n in range(1, 11):
        fn = f * n * np.sqrt(1 + 0.00025 * n * n)
        if fn > SR / 2.2:
            break
        a = (1 / n ** 1.35) * (0.6 + 0.4 * vel) ** (n * 0.5)
        k = 0.9 + 0.55 * n + f / 900
        x += a * np.sin(2 * np.pi * fn * t + rng.uniform(0, 6.28)) * np.exp(-t * k)
    nh = min(len(t), int(0.06 * SR))
    x[:nh] += 0.04 * lowpass(rng.standard_normal(nh), 3000) * np.exp(-t[:nh] * 80)  # hammer
    x *= env(len(t), 0.004, 0.08)
    return x * vel


def pad(freqs, d, vel=0.25):
    t = t_(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.004, 0, 0.0045):
            x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6.28))
    x = lowpass(x, 1400)
    a = np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 1.0).clip(0)
    return x * a * vel / len(freqs)


DUR = 32.5
BAR = 22.6 / 7  # bar 7 lands on "25 YEARS LATER"
E8 = BAR / 8
mix = np.zeros(int(DUR * SR) + SR * 4)


def place(x, at, gain=1.0):
    st = int(at * SR)
    end = min(len(mix), st + len(x))
    mix[st:end] += x[: end - st] * gain


CHORDS = {
    "Am": ["A2", "E3", "A3", "C4", "E4"],
    "F": ["F2", "C3", "F3", "A3", "C4"],
    "C": ["C3", "G3", "C4", "E4", "G4"],
    "G": ["G2", "D3", "G3", "B3", "D4"],
    "Fadd9": ["F2", "C3", "F3", "G3", "A3", "C4"],
}
prog = ["Am", "F", "C", "G", "Am", "F", "C", "F", "G", "Fadd9"]
pattern = [1, 2, 3, 4, 2, 3, 4, 3]  # indices into chord tones for eighth notes
for b, ch in enumerate(prog):
    tones = CHORDS[ch]
    t0 = b * BAR
    soft = 0.42 if b < 7 else 0.6
    if b < 9:
        place(piano(note_hz(tones[0]), BAR * 1.6, 0.55), t0, 0.9)
        for i, idx in enumerate(pattern):
            if b < 2 and i % 2:  # very sparse intro
                continue
            place(piano(note_hz(tones[idx]), E8 * 3, soft * (0.85 if i % 2 else 1)), t0 + i * E8)
    else:
        for i, nt in enumerate(tones):
            place(piano(note_hz(nt), 5.0, 0.6), t0 + i * 0.03)
    if b >= 7:
        place(pad([note_hz(n) for n in tones[1:4]], BAR * (1.0 if b < 9 else 1.4), 0.5), t0)

# melody enters at "25 YEARS LATER"
mel = [
    (7, 0, "C5", 1), (7, 1, "E5", 1), (7, 2, "F5", 1), (7, 3, "A5", 1),
    (8, 0, "G5", 1.5), (8, 1.5, "F5", 0.5), (8, 2, "E5", 1), (8, 3, "D5", 1),
    (9, 0, "C5", 4),
]
for bar, beat, n, length in mel:
    place(piano(note_hz(n), max(1.2, length * BAR / 4 * 1.8), 0.75), bar * BAR + beat * BAR / 4, 0.9)

dry = mix[: int(DUR * SR)]
# reverb: convolve with decaying noise IR (decorrelated L/R)
n_ir = int(2.4 * SR)
tt = np.arange(n_ir) / SR
irL = rng.standard_normal(n_ir) * np.exp(-tt * 2.6)
irR = rng.standard_normal(n_ir) * np.exp(-tt * 2.6)
irL = lowpass(irL, 5000)
irR = lowpass(irR, 5000)
nfft = 1 << int(np.ceil(np.log2(len(dry) + n_ir)))
D = np.fft.rfft(dry, nfft)
wetL = np.fft.irfft(D * np.fft.rfft(irL, nfft), nfft)[: len(dry)]
wetR = np.fft.irfft(D * np.fft.rfft(irR, nfft), nfft)[: len(dry)]
wetL /= np.max(np.abs(wetL))
wetR /= np.max(np.abs(wetR))
d = dry / np.max(np.abs(dry))
L = 0.72 * d + 0.38 * wetL
R = 0.72 * d + 0.38 * wetR
fade = np.ones(len(L))
fade[-int(1.5 * SR):] = np.linspace(1, 0, int(1.5 * SR))
write("ep01-music.wav", np.stack([L * fade, R * fade], axis=1))
print("audio written to", OUT)
