"""Synthesizes the film's soundtrack (no samples, no voice) -> out/score.wav"""
import numpy as np, wave, os

SR, DUR = 48000, 60.0
N = int(SR * DUR)
t = np.arange(N) / SR
L = np.zeros(N); Rr = np.zeros(N)
rs = np.random.RandomState(1945)


def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan)); Rr[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.01, r=0.3):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e


def noise(dur, lo, hi):
    n = int(dur * SR); spec = np.fft.rfft(rs.randn(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) / (1 + (f / hi) ** 4)
    x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)


def boom(dur=3.0, f0=62, f1=28, drive=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-tt * 5); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-tt * (3.2 / dur)) + 0.5 * noise(dur, 30, 220) * np.exp(-tt * 6)
    return np.tanh(x * 1.6 * drive) * env(n, 0.003, 0.2)


def hit(dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (noise(dur, 180, 5000) * np.exp(-tt * 14) * 0.6 + np.sin(2 * np.pi * 48 * tt) * np.exp(-tt * 6)) * env(n, 0.002, 0.1)


def tick(f=2600):
    n = int(0.06 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * 0.6 + noise(0.06, 1500, 9000) * 0.5) * np.exp(-tt * 110)


def tone(f, dur, a=0.02, r=0.4, harm=(1, 0.3, 0.12)):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(h * np.sin(2 * np.pi * f * (k + 1) * tt) for k, h in enumerate(harm)); return x * env(n, a, r)


def pad(freqs, dur, a=2.0, r=2.0, wob=0.25):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for k, f in enumerate(freqs):
        for det in (-0.35, 0.0, 0.4):
            x += np.sin(2 * np.pi * (f * (1 + det * 0.004)) * tt + k + det * 3) * (1 + wob * np.sin(2 * np.pi * (0.11 + 0.03 * k) * tt + k))
    return x / (3 * len(freqs)) * env(n, a, r)


def riser(dur, f0=90, f1=900):
    n = int(dur * SR); tt = np.arange(n) / SR; k = tt / dur
    f = f0 * (f1 / f0) ** (k ** 1.6); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + noise(dur, 400, 7000) * 0.6
    return x * k ** 2.2


def heart(strength=1.0):
    n = int(0.42 * SR); tt = np.arange(n) / SR
    lub = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt * 26)
    d = int(0.16 * SR); dub = np.zeros(n); dub[d:] = (np.sin(2 * np.pi * 44 * tt) * np.exp(-tt * 30))[: n - d] * 0.7
    return np.tanh((lub + dub) * 2.2) * strength


# --- hook: a clock, three cards, one slam -----------------------------------
for k in range(6): add(tick(2600 if k % 2 == 0 else 2100), 0.5 + k, 0, 0.35)
add(hit(), 0.58, 0, 0.55); add(hit(), 2.23, 0, 0.6)
add(riser(0.9, 120, 500), 3.48, 0, 0.25); add(boom(3.2, 70, 30, 1.3), 4.4, 0, 1.0); add(hit(1.2), 4.4, 0, 0.8)
add(pad([36.7, 55, 73.4], 8.5, 3.0, 2.5), 2.0, 0, 0.5)                       # low D drone
# --- title --------------------------------------------------------------------
add(riser(1.2, 80, 420)[::-1].copy()[::-1], 5.5, 0, 0.3); add(boom(4.0, 58, 26, 1.1), 6.7, 0, 0.9)
add(pad([146.8, 220, 293.7, 349.2], 5.0, 1.5, 2.0), 6.6, 0, 0.3)             # D minor, wide
# --- the numbers --------------------------------------------------------------
add(pad([73.4, 110, 174.6], 8.0, 1.5, 1.5), 9.8, 0, 0.42)
for at, f in ((10.6, 587.3), (12.25, 698.5), (13.9, 880.0)):
    add(tone(f, 1.6, 0.005, 1.4), at, -0.3, 0.2); add(tone(f / 2, 1.2, 0.005, 1.0), at, 0.3, 0.12); add(hit(0.5), at, 0, 0.22)
# --- satellites blind, lights out --------------------------------------------
add(pad([69.3, 103.8, 138.6], 7.5, 1.2, 1.2, 0.5), 16.8, 0, 0.42)             # sours to C#
n = int(0.7 * SR); tt = np.arange(n) / SR
zap = (np.sign(np.sin(2 * np.pi * (1800 * np.exp(-tt * 5) + 90) * tt)) * 0.3 + noise(0.7, 2000, 12000)) * np.exp(-tt * 7)
add(zap, 18.25, 0.3, 0.5)
n = int(1.6 * SR); tt = np.arange(n) / SR
down = np.sin(2 * np.pi * np.cumsum(260 * np.exp(-tt * 2.4) + 28) / SR) * env(n, 0.01, 0.5)
for k, b in enumerate((20.0, 20.55, 21.1, 21.6, 22.0, 22.4, 22.75, 23.1)):
    add(down, b, (k % 3 - 1) * 0.5, 0.2); add(noise(0.18, 3000, 12000) * env(int(0.18 * SR), 0.002, 0.12), b, (k % 3 - 1) * 0.5, 0.16)
# --- launch -------------------------------------------------------------------
for k in range(5):                                                            # klaxon
    add(tone(466.2, 0.36, 0.01, 0.05, (1, 0.5, 0.3, 0.2)), 24.15 + k * 0.8, 0, 0.16); add(tone(349.2, 0.36, 0.01, 0.05, (1, 0.5, 0.3, 0.2)), 24.55 + k * 0.8, 0, 0.16)
n = int(6.4 * SR); tt = np.arange(n) / SR
rumble = noise(6.4, 25, 420) * np.minimum(1, tt / 0.5) * (0.55 + 0.45 * np.exp(-np.maximum(0, tt - 3.4) * 1.2)) * env(n, 0.05, 1.2)
crackle = noise(6.4, 800, 6000) * (0.5 + 0.5 * noise(6.4, 8, 40)) * np.minimum(1, tt / 0.4) * np.exp(-tt * 0.5) * env(n, 0.05, 1.0)
add(np.tanh(rumble * 2.5), 24.75, 0, 0.95); add(crackle, 24.75, 0.1, 0.3); add(boom(2.0, 80, 34, 1.2), 24.75, 0, 0.7)
add(pad([55, 82.4, 110], 4.0, 1.0, 1.0), 27.8, 0, 0.4)
# --- thirty minutes -----------------------------------------------------------
add(pad([55, 58.3, 110, 164.8], 9.4, 1.0, 0.05, 0.5), 30.8, 0, 0.5)           # A with a rubbing Bb
bt = 31.0
while bt < 39.9:                                                              # heartbeat, quickening
    k = (bt - 31.0) / 9.0; add(heart(0.55 + 0.45 * k), bt, 0, 0.8); bt += 60.0 / (62 + 96 * k ** 1.5)
tk = 31.0
while tk < 39.95:
    k = (tk - 31.0) / 9.0; add(tick(3000 + 900 * k), tk, 0.4 * np.sin(tk * 7), 0.16 + 0.2 * k); tk += 0.5 - 0.4 * k
add(riser(7.0, 70, 1500), 33.0, 0, 0.62)
n = int(3.6 * SR); tt = np.arange(n) / SR
add(noise(3.6, 300, 3000) * (tt / 3.6) ** 2, 36.4, 0, 0.5)                    # air tearing past
# 40.0-40.3: nothing at all.
# --- impact -------------------------------------------------------------------
add(boom(7.5, 55, 22, 1.6), 40.3, 0, 1.25); add(hit(2.0), 40.3, 0, 0.9)
n = int(6.0 * SR); tt = np.arange(n) / SR
add(np.tanh(noise(6.0, 20, 300) * 3) * np.exp(-tt * 0.55), 40.3, 0, 0.8)
for k in range(9): add(boom(3.0, 48, 24, 1.0), 40.8 + k * 0.36 + 0.1 * rs.rand(), rs.uniform(-0.7, 0.7), 0.4 * (1 - k / 12))
n = int(6.5 * SR); tt = np.arange(n) / SR
add(np.sin(2 * np.pi * 5200 * tt) * env(n, 0.6, 5.0), 41.0, 0, 0.035)         # ringing ears
# --- winter -------------------------------------------------------------------
n = int(6.2 * SR); tt = np.arange(n) / SR
wind = noise(6.2, 150, 1400) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.31 * tt)) * env(n, 1.5, 0.8)
add(wind, 43.6, -0.2, 0.34); add(noise(6.2, 500, 2600) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.19 * tt + 1)) * env(n, 2.0, 0.8), 43.6, 0.3, 0.16)
add(pad([49, 73.4, 98], 6.0, 2.0, 0.4, 0.2), 43.8, 0, 0.3)
add(boom(3.0, 50, 26, 1.0), 47.1, 0, 0.75); add(hit(1.0), 47.1, 0, 0.4)
# --- rewind -------------------------------------------------------------------
n = int(2.5 * SR); tt = np.arange(n) / SR; k = tt / 2.5
tape = np.sin(2 * np.pi * np.cumsum(200 * (9 ** (k ** 1.3))) / SR) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 23 * tt))) * 0.35 + noise(2.5, 900, 9000) * 0.5 * k
add(tape * env(n, 0.05, 0.03), 49.5, 0, 0.42)
add((boom(2.4, 60, 26, 1.0)[::-1]).copy(), 49.55, 0, 0.5)
# --- dawn again ---------------------------------------------------------------
add(tone(1174.7, 2.5, 0.003, 2.3), 52.0, 0, 0.12)
add(pad([73.4, 110, 146.8, 185, 220], 8.3, 2.2, 2.2, 0.15), 51.9, 0, 0.55)    # D major
add(pad([293.7, 370, 440, 587.3], 7.4, 3.0, 2.2, 0.2), 52.6, 0, 0.2)
for at, f in ((52.4, 293.7), (53.7, 370.0), (55.0, 440.0), (56.0, 587.3), (57.2, 740.0), (58.2, 880.0)):
    add(tone(f, 2.6, 0.004, 2.4, (1, 0.25, 0.08)), at, 0.25 * np.sin(at), 0.2)
add(boom(3.5, 52, 30, 0.8), 56.0, 0, 0.5)
for k in range(3): add(tick(2400), 57.5 + k, 0, 0.22)                         # the clock, still running

# --- space, master ------------------------------------------------------------
def echo(x):
    y = x.copy()
    for d, g in ((0.137, 0.32), (0.293, 0.22), (0.471, 0.14), (0.83, 0.08)):
        k = int(d * SR); y[k:] += x[:-k] * g
    return y
L2, R2 = echo(L) * 0.8 + echo(Rr) * 0.08, echo(Rr) * 0.8 + echo(L) * 0.08
sil = (t >= 40.0) & (t < 40.3); L2[sil] = 0; R2[sil] = 0
fade = np.minimum(1, (DUR - t) / 0.7); fade = np.minimum(fade, np.minimum(1, t / 0.05))
mix = np.stack([L2, R2], 1) * fade[:, None]
mix = np.tanh(mix * 0.95 / np.percentile(np.abs(mix), 99.9)) * 0.89
os.makedirs('out', exist_ok=True)
with wave.open('out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('score written', mix.shape, float(np.abs(mix).max()))
