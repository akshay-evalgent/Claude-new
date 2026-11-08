"""Score and sound effects for the Mamaearth explainer, written with NumPy only.

96 BPM, D major, a four-bar loop (10 s) that adds a layer every pass, and every
effect placed on the frame the picture needs it. Writes mix.wav (score + SFX),
score.wav and sfx.wav next to this file.
"""
import numpy as np, wave, os

SR = 48000
BPM = 96
BEAT = 60 / BPM            # 0.625 s
BAR = 4 * BEAT             # 2.5 s
DUR = 42.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

def buf(sec): return np.zeros(int(SR * sec))
def t_axis(sec): return np.arange(int(SR * sec)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a, d, s, r, hold=None):
    """ADSR in samples. hold = length of the sustain segment."""
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    if hold is None: hold = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, a, endpoint=False), np.linspace(1, s, d, endpoint=False), np.full(hold, s), np.linspace(s, 0, r)])
    if len(e) < n: e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n]

def lowpass(x, cutoff):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4)
    return np.fft.irfft(X, len(x))

def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4))
    return np.fft.irfft(X, len(x))

def place(dst, src, t, gain=1.0):
    i = int(t * SR); n = min(len(src), len(dst) - i)
    if n > 0: dst[i:i + n] += src[:n] * gain

# ---------- instruments ----------
def pluck(freq, sec=1.6, bright=0.55):
    """Karplus-Strong string, processed one period at a time."""
    period = int(SR / freq); n = int(SR * sec)
    ring = rng.uniform(-1, 1, period) * bright + np.sin(2 * np.pi * np.arange(period) / period) * (1 - bright)
    out = np.zeros(n + period); k = 0
    while k < n:
        out[k:k + period] = ring
        ring = 0.5 * (ring + np.roll(ring, -1)) * 0.995
        k += period
    out = out[:n] * env(n, 0.002, 0.1, 0.8, 0.5)
    return lowpass(out, 4200)

def pad(notes, sec):
    t = t_axis(sec); out = np.zeros(len(t))
    for n in notes:
        f = midi(n)
        for det in (-0.4, 0.0, 0.4):
            fr = f * 2 ** (det / 1200)
            out += (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * fr * t)) * 0.33     # triangle
        out += 0.4 * np.sin(2 * np.pi * f * 2 * t)
    out = lowpass(out, 900) * env(len(t), 0.9, 0.3, 0.8, 1.2)
    return out / max(1, len(notes))

def bass(n, sec=BEAT * 2):
    t = t_axis(sec); f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)
    return x * env(len(t), 0.01, 0.2, 0.7, 0.3)

def kick():
    t = t_axis(0.3); f = 150 * np.exp(-t * 18) + 48
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)

def shaker(accent=0.5):
    t = t_axis(0.09); x = rng.uniform(-1, 1, len(t)) * np.exp(-t * 60)
    return bandpass(x, 3500, 12000) * (0.5 + accent)

def rim():
    t = t_axis(0.06); x = rng.uniform(-1, 1, len(t)) * np.exp(-t * 120) + 0.4 * np.sin(2 * np.pi * 820 * t) * np.exp(-t * 80)
    return bandpass(x, 500, 5000)

# ---------- score ----------
score = buf(DUR)
chords = [  # root, third, fifth, octave  (D - G - Bm - A)
    [50, 54, 57, 62], [55, 59, 62, 67], [47, 50, 54, 59], [45, 49, 52, 57]]
pattern = [0, 2, 1, 2, 3, 2, 1, 2]       # eighth-note arpeggio over the chord tones
melody = [[62, 64, 66, 69], [67, 66, 64, 62], [62, 61, 62, 66], [64, 62, 61, 57]]  # loop 4 top line, quarter notes

for loop in range(4):
    t0 = loop * 4 * BAR
    layer_bass = loop >= 1; layer_shaker = loop >= 1; layer_kick = loop >= 2; layer_mel = loop >= 3
    for bar, ch in enumerate(chords):
        tb = t0 + bar * BAR
        place(score, pad([ch[0], ch[1], ch[2]], BAR + 0.6), tb, 0.16 + 0.03 * loop)
        for k, idx in enumerate(pattern):
            vel = 0.5 if k % 2 == 0 else 0.33
            place(score, pluck(midi(ch[idx]), 1.4), tb + k * BEAT / 2, vel * 0.42)
        if layer_bass:
            place(score, bass(ch[0] - 12), tb, 0.26); place(score, bass(ch[0] - 12, BEAT * 1.5), tb + 2 * BEAT, 0.22)
        if layer_shaker:
            for k in range(8): place(score, shaker(0.6 if k % 2 == 0 else 0.15), tb + k * BEAT / 2, 0.10)
        if layer_kick:
            place(score, kick(), tb, 0.55); place(score, kick(), tb + 2 * BEAT, 0.45)
            place(score, rim(), tb + BEAT, 0.14); place(score, rim(), tb + 3 * BEAT, 0.14)
        if layer_mel:
            for k, n in enumerate(melody[bar]): place(score, pluck(midi(n), 1.8, 0.35), tb + k * BEAT, 0.34)

# outro: one final D chord strummed, pad swells and everything fades by 42 s
t_end = 4 * 4 * BAR                      # 40.0
place(score, pad([50, 54, 57, 62], 3.0), t_end, 0.22)
for k, n in enumerate([50, 57, 62, 66, 69]): place(score, pluck(midi(n), 2.4, 0.3), t_end + k * 0.04, 0.3)
fade = np.ones(N); i0 = int(40.6 * SR); fade[i0:] = np.linspace(1, 0, N - i0) ** 1.5
score *= fade

# ---------- sound effects, placed on the picture ----------
sfx = buf(DUR)

def thud():
    t = t_axis(0.28); f = 110 * np.exp(-t * 20) + 55
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) + lowpass(rng.uniform(-1, 1, len(t)), 700) * np.exp(-t * 40) * 0.6
    return x
def scratch():
    t = t_axis(0.3); x = rng.uniform(-1, 1, len(t)) * np.exp(-t * 9)
    return bandpass(x, 1200, 6000) * (0.4 + 0.6 * np.sin(2 * np.pi * 14 * t) ** 2)
def whoosh(sec=0.5):
    t = t_axis(sec); x = rng.uniform(-1, 1, len(t)) * np.sin(np.pi * t / sec) ** 1.5
    return bandpass(x, 300, 2500)
def pop(f0=620, f1=280, sec=0.09):
    t = t_axis(sec); f = f0 * (f1 / f0) ** (t / sec)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)
def stamp():
    t = t_axis(0.5); f = 160 * np.exp(-t * 25) + 50
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = bandpass(rng.uniform(-1, 1, len(t)), 1500, 7000) * np.exp(-t * 70) * 0.8
    ring_ = np.sin(2 * np.pi * 1760 * t) * np.exp(-t * 12) * 0.12
    return body + click + ring_
def tick():
    t = t_axis(0.07); return (np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 90) + bandpass(rng.uniform(-1, 1, len(t)), 2000, 9000) * np.exp(-t * 120) * 0.5)
def rustle(sec):
    t = t_axis(sec); am = 0.5 + 0.5 * np.sin(2 * np.pi * 2.3 * t) * np.sin(2 * np.pi * 0.7 * t + 1)
    x = rng.uniform(-1, 1, len(t)) * am * np.sin(np.pi * t / sec) ** 0.6
    return bandpass(x, 2500, 9000)
def tap():
    t = t_axis(0.12); return lowpass(rng.uniform(-1, 1, len(t)), 900) * np.exp(-t * 50) + 0.5 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 40)
def chime():
    t = t_axis(2.6); out = np.zeros(len(t))
    for i, n in enumerate([74, 81, 86]):
        f = midi(n); out += (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * (2.2 + i * 0.4)) * (0.6 if i else 1)
    return out

for i in range(4): place(sfx, thud(), 1.25 + i * BEAT, 0.9)          # jars land on the beat
place(sfx, scratch(), 3.75, 0.7)                                       # the red strike
for t in (4.75, 9.75, 18.5, 24.75, 31.0, 36.0): place(sfx, whoosh(), t, 0.55)   # scene wipes
for t in (10.6, 11.9, 13.1): place(sfx, pop(), t + 0.05, 0.8)          # bottles rise
for t in (14.4, 15.0, 15.6): place(sfx, pop(900, 500, 0.07), t, 0.5)   # ingredient callouts
place(sfx, stamp(), 19.34, 1.0)                                        # MADE SAFE lands
for i in range(4): place(sfx, tick(), 21.25 + i * BEAT, 0.7)           # checklist
place(sfx, rustle(4.6), 26.4, 0.35)                                    # tree grows, leaves fall
for i in range(4): place(sfx, tap(), 31.9 + i * 0.4, 0.5)              # tiles land
place(sfx, chime(), 36.5, 0.5)                                         # end card

# ---------- mix ----------
def norm(x, peak_db=-1.0):
    p = np.max(np.abs(x)); return x * (10 ** (peak_db / 20) / p) if p > 0 else x
score = norm(score, -3.0)
sfx = norm(sfx, -2.0)
def limit(x, drive=3.4):
    """Soft limiter: lifts the loudness to about -14 LUFS, rounds the peaks instead of clipping them."""
    return np.tanh(x * drive) / np.tanh(drive)
mix = norm(limit(norm(score * 0.78 + sfx * 0.9, -1.0)), -1.0)

def write(path, x):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())

here = os.path.dirname(os.path.abspath(__file__))
write(os.path.join(here, 'score.wav'), score)
write(os.path.join(here, 'sfx.wav'), sfx)
write(os.path.join(here, 'mix.wav'), mix)
print('wrote score.wav, sfx.wav, mix.wav  (%.1f s @ %d Hz)' % (DUR, SR))
