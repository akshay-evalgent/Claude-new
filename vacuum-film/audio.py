"""Mixes the narration with a synthesized score and sound effects -> out/mix.wav"""
import numpy as np, wave, json

SR = 48000
DUR = json.load(open('vo/timeline.json'))['duration']
N = int(SR * DUR)
t = np.arange(N) / SR
FX = np.zeros((N, 2)); MUS = np.zeros((N, 2))
rs = np.random.RandomState(7)


def add(buf, sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i] * gain
    buf[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); buf[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.01, r=0.3):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e


def noise(dur, lo, hi):
    n = int(dur * SR); spec = np.fft.rfft(rs.randn(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) / (1 + (f / hi) ** 4)
    x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)


def tone(f, dur, a=0.02, r=0.3, harm=(1, 0.3, 0.1)):
    n = int(dur * SR); tt = np.arange(n) / SR
    return sum(h * np.sin(2 * np.pi * f * (k + 1) * tt) for k, h in enumerate(harm)) * env(n, a, r)


def pad(freqs, dur, a=1.5, r=1.5):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for k, f in enumerate(freqs):
        for d in (-0.003, 0, 0.0035):
            x += np.sin(2 * np.pi * f * (1 + d) * tt + k) * (1 + 0.2 * np.sin(2 * np.pi * (0.13 + 0.04 * k) * tt))
    return x / (3 * len(freqs)) * env(n, a, r)


def boom(dur=2.0, f0=70, f1=30):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 6)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3 / dur) + 0.4 * noise(dur, 30, 200) * np.exp(-tt * 8)) * 1.5) * env(n, 0.003, 0.2)


def heart(s=1.0):
    n = int(0.4 * SR); tt = np.arange(n) / SR; d = int(0.15 * SR)
    x = np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 28); y = np.zeros(n); y[d:] = (np.sin(2 * np.pi * 42 * tt) * np.exp(-tt * 32))[: n - d] * 0.7
    return np.tanh((x + y) * 2.4) * s


def whoosh(dur, rise=True):
    n = int(dur * SR); k = np.linspace(0, 1, n); e = k ** 2 if rise else (1 - k) ** 2
    return noise(dur, 300, 6000) * e * env(n, 0.01, 0.05)


def pops(dur, rate, seed, lo=500, hi=2500):
    n = int(dur * SR); x = np.zeros(n); r = np.random.RandomState(seed)
    for _ in range(int(dur * rate)):
        i = r.randint(0, n - 4000); f = r.uniform(lo, hi); m = int(r.uniform(0.008, 0.03) * SR); tt = np.arange(m) / SR
        x[i:i + m] += np.sin(2 * np.pi * f * tt * (1 + tt * 30)) * np.exp(-tt * 160) * r.uniform(0.3, 1)
    return x


# ---------------- score ----------------
add(MUS, pad([55, 82.4, 110, 130.8], 14.5, 0.4, 2.0), 0.0, 0, 0.42)                 # A minor, tense
add(MUS, pad([49, 73.4, 98, 116.5], 10.5, 2.0, 1.5), 13.5, 0, 0.38)                # descends to G
add(MUS, pad([46.2, 69.3, 92.5, 110], 6.5, 1.5, 0.3), 23.3, 0, 0.4)                  # F#, unsettled
for k, at in enumerate(np.arange(0.2, 24.3, 0.5)):                                   # pulse
    add(MUS, tone(110 if k % 4 else 220, 0.25, 0.005, 0.2, (1, 0.5, 0.25, 0.12)) * 0.5, at, 0.3 * ((k % 2) * 2 - 1), 0.05 + 0.04 * min(1, at / 20))
add(MUS, pad([65.4, 98, 130.8, 164.8], 6.2, 0.6, 1.2), 30.2, 0, 0.42)               # C major: hope
add(MUS, pad([87.3, 130.8, 174.6, 220], 1.8, 0.2, 1.4), 35.2, 0, 0.36)               # F lift on "survive"
add(MUS, pad([55, 82.4, 110, 130.8], 11.5, 1.0, 1.5), 36.3, 0, 0.34)                # back to A minor for 1966
add(MUS, pad([65.4, 98, 130.8, 164.8, 196], 5.2, 1.0, 2.2), 47.8, 0, 0.5)            # resolve
for at, f in ((48.2, 523.3), (49.0, 659.3), (49.8, 784), (50.6, 1046.5)):
    add(MUS, tone(f, 2.2, 0.004, 2.0, (1, 0.2)), at, 0.3 * np.sin(at), 0.08)

# ---------------- effects ----------------
# hook: suit hiss of breathing, the snag and rip, the leak
add(FX, noise(1.8, 200, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.6 * np.arange(int(1.8 * SR)) / SR)) * env(int(1.8 * SR), 0.1, 0.1), 0, 0, 0.06)
add(FX, noise(0.25, 1500, 9000) * np.exp(-np.arange(int(0.25 * SR)) / SR * 6) * (0.5 + 0.5 * np.sign(np.sin(np.arange(int(0.25 * SR)) / SR * 2 * np.pi * 90))), 1.74, -0.2, 0.75)
add(FX, boom(1.4, 90, 40), 1.76, 0, 0.55)
n = int(5.8 * SR); tt = np.arange(n) / SR
add(FX, noise(5.8, 2500, 14000) * np.exp(-tt * 0.55) * env(n, 0.01, 0.8), 1.78, -0.3, 0.42)
for k in range(9): add(FX, tone(880 if k % 2 == 0 else 660, 0.18, 0.005, 0.05, (1, 0.2)), 2.3 + k * 0.5, 0, 0.09)   # suit alarm
# lungs
for at in np.arange(7.7, 13.9, 60 / 92): add(FX, heart(0.9), at, 0, 0.55)
add(FX, boom(1.2, 110, 45), 9.37, 0, 0.6)                                            # "Don't."
n = int(2.2 * SR); tt = np.arange(n) / SR
add(FX, np.sin(2 * np.pi * np.cumsum(60 + 40 * tt) / SR) * noise(2.2, 40, 400) * env(n, 0.5, 0.3), 10.2, 0, 0.45)   # strain
add(FX, whoosh(1.0, False) * 0.8, 12.6, 0, 0.5)                                      # breathe out
# boiling skin
add(FX, pops(6.2, 26, 1) + 0.3 * noise(6.2, 2000, 8000) * np.linspace(0, 1, int(6.2 * SR)), 15.8, 0.1, 0.35)
add(FX, whoosh(0.5) * 0.6, 14.6, 0.2, 0.3)
n = int(1.6 * SR); tt = np.arange(n) / SR
add(FX, np.sin(2 * np.pi * np.cumsum(70 - 25 * tt) / SR) * env(n, 0.3, 0.4), 21.0, 0, 0.35)   # swelling groan
add(FX, pops(2.0, 40, 2, 900, 3500), 22.9, 0, 0.4)
# blackout: heartbeat slows, ears ring, then nothing
bt = 24.6
while bt < 29.4:
    k = (bt - 24.6) / 4.8; add(FX, heart(1 - 0.5 * k), bt, 0, 0.7); bt += 60 / (110 - 60 * k)
n = int(4.2 * SR); tt = np.arange(n) / SR
add(FX, np.sin(2 * np.pi * 4100 * tt) * env(n, 2.5, 0.2), 25.4, 0, 0.03)
# rescue: tether tug, airlock hatch, air rushing back in
add(FX, boom(0.6, 140, 60), 31.75, 0.3, 0.35)
add(FX, whoosh(0.5) * 0.5, 34.2, -0.2, 0.35)
add(FX, boom(1.0, 120, 45) + noise(1.0, 600, 4000) * np.exp(-np.arange(SR) / SR * 25), 35.25, 0, 0.7)
n = int(0.9 * SR); add(FX, noise(0.9, 400, 5000) * np.linspace(0, 1, n) ** 1.5 * env(n, 0.01, 0.2), 35.3, 0, 0.3)
add(FX, whoosh(0.45) * 0.9, 35.65, 0, 0.55)
# 1966: projector clatter, alarm buzzer, the hose letting go, the fall, repress
n = int(DUR - 36.1) * SR; tt = np.arange(n) / SR
proj = noise(DUR - 36.1, 800, 5000)[:n] * (0.35 + 0.65 * (np.sin(2 * np.pi * 24 * tt) > 0.6)) * env(n, 0.3, 0.6)
add(FX, proj, 36.1, 0, 0.05)
add(FX, boom(0.7, 160, 60) + noise(0.7, 500, 6000) * np.exp(-np.arange(int(0.7 * SR)) / SR * 12), 41.3, -0.2, 0.55)
n = int(2.6 * SR); add(FX, noise(2.6, 3000, 12000) * np.exp(-np.arange(n) / SR * 1.1) * env(n, 0.005, 0.5), 41.32, -0.2, 0.35)
for k in range(9):
    at = 41.4 + k / 1.2; n = int(0.35 * SR); tt = np.arange(n) / SR
    add(FX, np.sign(np.sin(2 * np.pi * 150 * tt)) * 0.4 * env(n, 0.01, 0.05), at, 0.4, 0.05)
add(FX, boom(1.2, 80, 35) + noise(1.2, 200, 3000) * np.exp(-np.arange(int(1.2 * SR)) / SR * 14), 45.0, 0, 0.7)
add(FX, pops(1.8, 30, 3, 700, 2800), 45.6, 0, 0.35)
n = int(1.6 * SR); add(FX, noise(1.6, 300, 4000) * np.sin(np.linspace(0, np.pi, n)) ** 1.2, 48.5, 0, 0.35)

# ---------------- narration, mix ----------------
with wave.open('out/vo.wav') as w:
    vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
vo = np.interp(np.arange(N) / SR, np.arange(len(vo)) / vsr, vo)
venv = np.convolve(np.abs(vo), np.ones(int(0.25 * SR)) / int(0.25 * SR), 'same'); duck = 1 - 0.55 * np.clip(venv / 0.05, 0, 1)
mix = MUS * duck[:, None] * 0.7 + FX * (0.55 + 0.45 * duck[:, None]) + vo[:, None] * 1.25
fade = np.minimum(1, (DUR - t) / 0.6)
mix *= fade[:, None]
mix = np.tanh(mix * 0.95 / np.percentile(np.abs(mix), 99.95)) * 0.9
with wave.open('out/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mix', mix.shape, float(np.abs(mix).max()))
