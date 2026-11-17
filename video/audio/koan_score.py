"""Score for 'Muddy Road' (ukiyo-e koan): koto, shakuhachi, rain, paper foley, crickets, bell, and a held silence (ma).
usage: python3 audio/koan_score.py out.wav"""
import sys, wave, numpy as np
SR, T = 44100, 54.5
N = int(SR * T); rng = np.random.default_rng(7)
mus, fx = np.zeros(N), np.zeros(N)
def at(buf, t, x, g=1.0):
    i = int(t * SR); j = min(N, i + len(x)); buf[i:j] += x[: j - i] * g
def band(n, lo, hi):
    X = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n); return y / (np.abs(y).max() + 1e-9)
def env(n, a, r):
    e = np.ones(n); a, r = int(a * SR), int(r * SR); e[:a] = np.linspace(0, 1, a); e[-r:] *= np.linspace(1, 0, r); return e
def koto(f, dur=2.4, bright=.6):
    p = int(SR / f); buf = rng.uniform(-1, 1, p); buf = np.convolve(buf, [bright, 1 - bright], 'same'); out = np.zeros(int(dur * SR))
    for i in range(len(out)):
        out[i] = buf[i % p]; buf[i % p] = .4985 * (buf[i % p] + buf[(i + 1) % p])
    return np.tanh(out * 2.2) / 2.2 * np.exp(-np.arange(len(out)) / SR * .9)      # sawari: a little buzz
def shaku(f, dur, meri=True):
    t = np.arange(int(dur * SR)) / SR; semi = -1 + np.minimum(1, t / .28)       # slide up into the note
    if meri: semi -= np.clip((t - (dur - .7)) / .5, 0, 1)                         # meri drop at the phrase end
    vib = .004 * np.sin(2 * np.pi * 5 * t) * np.clip((t - .6) / .6, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * 2 ** (semi / 12) * (1 + vib)) / SR
    tone = np.sin(ph) + .22 * np.sin(2 * ph) + .08 * np.sin(3 * ph)
    breath = band(len(t), f * 1.5, f * 6) * (.35 + .25 * np.exp(-t * 3))
    return (tone * .8 + breath * .5) * env(len(t), .18, .5)
def bell(f, dur=4):
    t = np.arange(int(dur * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in [(1, 1, 1.1), (2.76, .5, 1.8), (5.4, .25, 3), (8.93, .12, 4.5)])
def thump():
    t = np.arange(int(.25 * SR)) / SR; return np.sin(2 * np.pi * 85 * t) * np.exp(-t * 22) + band(len(t), 200, 3000) * np.exp(-t * 60) * .3
def rub(dur=.34):
    n = int(dur * SR); t = np.arange(n) / SR; return band(n, 250, 2200) * (.6 + .4 * np.sin(2 * np.pi * 7 * t)) * env(n, .05, .12)
def slide(dur=1.4):
    n = int(dur * SR); return band(n, 400, 4000) * np.sin(np.linspace(0, np.pi, n)) ** 2
def plop():
    t = np.arange(int(.18 * SR)) / SR; return np.sin(2 * np.pi * np.cumsum(np.linspace(900, 280, len(t))) / SR) * np.exp(-t * 28) + band(len(t), 1000, 5000) * np.exp(-t * 50) * .3
D4, Eb4, G4, A4, Bb4, D5, A3, G3 = 293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 220.0, 196.0
# rain over the day prints, crickets at night, then silence (ma) before the answer
n = int(25.4 * SR); rain = band(n, 900, 9000) * .5 + band(n, 120, 700) * .25
rain *= np.clip(np.arange(n) / SR / 1.5, 0, 1) * np.clip((25.4 - np.arange(n) / SR) / 1.6, 0, 1); at(fx, 0, rain, .16)
for t0 in np.arange(25.6, 49, .83):
    c = np.zeros(int(.12 * SR)); tt = np.arange(len(c)) / SR; c = np.sin(2 * np.pi * 4400 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0) * np.exp(-tt * 8)
    if not (40.0 < t0 < 41.4): at(fx, t0 + rng.uniform(0, .3), c, .035 if t0 < 40 else .02)
for t0 in [.5, .95, 1.4, 1.85]: at(fx, t0, rub(), .12)
for t0 in [3.0, 10.0, 26.0, 33.4]: at(fx, t0, thump(), .35)
at(fx, 51.2, thump(), .5)
for a, b in [(8.0, 9.4), (24.0, 25.4), (31.4, 32.8)]: at(fx, a, slide(b - a), .07)
for k in np.arange(17.9, 21.0, .5): at(fx, k, plop(), .12)     # Tanzan wading with her
for k in np.arange(21.9, 24.0, .5): at(fx, k, plop(), .09)     # Ekido following
# music
for i, f in enumerate([D4, Eb4, G4, A4, Bb4]): at(mus, 2.6 + i * .16, koto(f), .22)
at(mus, 3.6, shaku(A4, 3.6), .12); at(mus, 10.2, shaku(G4, 2.4), .11); at(mus, 12.4, shaku(A4, 2.2), .11)
at(mus, 15.0, koto(A3), .25); at(mus, 15.35, koto(D4), .22)
at(mus, 17.2, koto(G3, 3), .25)
for i, f in enumerate([D5, Bb4, A4, G4, Eb4, D4, A3, G3]): at(mus, 24.0 + i * .07, koto(f, 2.2), .16)   # koto glissando into night
at(mus, 26.2, shaku(D4, 4.2), .12)
at(mus, 36.2, koto(Eb4), .2); at(mus, 37.6, koto(Eb4), .18)
at(mus, 41.2, koto(D4, 3.5, .4), .26)                          # a single note left ringing for Tanzan's answer
at(mus, 44.7, shaku(A3, 4.2), .14)
at(mus, 51.2, bell(1180, 3.3), .1)
ir = rng.standard_normal(int(1.8 * SR)) * np.exp(-np.arange(int(1.8 * SR)) / SR * 3.2)
L = 1 << int(np.ceil(np.log2(N + len(ir)))); wet = np.fft.irfft(np.fft.rfft(mus, L) * np.fft.rfft(ir, L), L)[:N]
mix = mus + wet / np.abs(wet).max() * np.abs(mus).max() * .35 + fx
t = np.arange(N) / SR; ma = 1 - np.clip((t - 40.15) / .08, 0, 1) * np.clip((41.2 - t) / .05, 0, 1)   # true silence, tails cut
mix *= ma; mix *= np.clip((T - t) / .6, 0, 1)
mix = mix / np.abs(mix).max() * .89
s = (np.stack([mix, mix], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1], 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(s.tobytes())
print("wrote", sys.argv[1], f"rms {20*np.log10(np.sqrt((mix**2).mean())):.1f} dBFS")
