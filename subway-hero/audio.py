"""Mixes the narration with synthesized sound design and score -> out/mix.wav"""
import numpy as np, wave, json

SR = 48000
DUR = json.load(open('vo/timeline.json'))['duration']
N = int(SR * DUR); t = np.arange(N) / SR
FX = np.zeros((N, 2)); MUS = np.zeros((N, 2))
rs = np.random.RandomState(11)


def add(buf, sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: N - i] * gain
    buf[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); buf[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.01, r=0.3):
    e = np.ones(n); na, nr = max(1, int(a * SR)), max(1, int(r * SR)); e[:na] = np.linspace(0, 1, na); e[-nr:] *= np.linspace(1, 0, nr); return e


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
        for d in (-0.003, 0, 0.0035): x += np.sin(2 * np.pi * f * (1 + d) * tt + k) * (1 + 0.2 * np.sin(2 * np.pi * (0.13 + 0.04 * k) * tt))
    return x / (3 * len(freqs)) * env(n, a, r)


def boom(dur=1.5, f0=80, f1=35):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 7)
    return np.tanh((np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3 / dur) + 0.4 * noise(dur, 40, 300) * np.exp(-tt * 10)) * 1.6) * env(n, 0.003, 0.2)


def heart(s=1.0):
    n = int(0.4 * SR); tt = np.arange(n) / SR; d = int(0.15 * SR)
    x = np.sin(2 * np.pi * 50 * tt) * np.exp(-tt * 28); y = np.zeros(n); y[d:] = (np.sin(2 * np.pi * 42 * tt) * np.exp(-tt * 32))[: n - d] * 0.7
    return np.tanh((x + y) * 2.4) * s


def rumble(dur, lo=25, hi=500, rise=None):
    n = int(dur * SR); x = noise(dur, lo, hi)
    return x * (np.linspace(0, 1, n) ** 2 if rise == 'up' else (np.linspace(1, 0, n) ** 1.5 if rise == 'down' else 1)) * env(n, 0.05, 0.3)


def horn(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for f in (311.1, 392.0):            # a two-note air horn
        ph = 2 * np.pi * f * tt * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt))
        x += np.sign(np.sin(ph)) * 0.3 + np.sin(ph) * 0.4
    return np.tanh(x * 0.8) * env(n, 0.04, 0.12)


def screech(dur, seed):
    n = int(dur * SR); tt = np.arange(n) / SR; r = np.random.RandomState(seed); x = np.zeros(n)
    for k in range(4):
        f0 = r.uniform(2200, 4200); f = f0 * (1 + 0.04 * np.sin(2 * np.pi * r.uniform(0.3, 1.3) * tt + k))
        x += np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * r.uniform(2, 7) * tt + k)) ** 2
    return (x / 4 + 0.35 * noise(dur, 1800, 9000)) * env(n, 0.08, 0.4)


def clacks(dur, period, seed):
    n = int(dur * SR); x = np.zeros(n); r = np.random.RandomState(seed); at = 0.0
    while at < dur - 0.2:
        for dt in (0.0, 0.09):
            i = int((at + dt) * SR); m = int(0.08 * SR); tt = np.arange(m) / SR
            x[i:i + m] += (np.sin(2 * np.pi * 95 * tt) * 0.8 + noise(0.08, 300, 3000)[:m] * 0.5) * np.exp(-tt * 45)
        at += period * r.uniform(0.9, 1.1); period *= 1.04
    return x


def applause(dur, density, seed):
    n = int(dur * SR); x = np.zeros(n); r = np.random.RandomState(seed); m = int(0.025 * SR); tt = np.arange(m) / SR
    clap = noise(0.025, 600, 6000)[:m] * np.exp(-tt * 180)
    for _ in range(int(dur * density)):
        i = r.randint(0, n - m); x[i:i + m] += clap * r.uniform(0.2, 1.0)
    return x * env(n, 0.8, 1.5)


def steps(times, gain):
    for at in times:
        m = int(0.07 * SR); tt = np.arange(m) / SR
        add(FX, (noise(0.07, 120, 2500)[:m] * 0.7 + np.sin(2 * np.pi * 70 * tt) * 0.5) * np.exp(-tt * 50), at, -0.2, gain)


# ---------------- hook: the train arrives and rolls over the camera ----------------
add(FX, rumble(5.0, 20, 600, 'up'), 0.0, 0, 0.9)
add(FX, noise(5.0, 3000, 9000) * np.linspace(0, 1, int(5.0 * SR)) ** 3, 0.0, 0.2, 0.25)   # rails singing
add(FX, horn(1.1), 2.6, 0, 0.32)
add(FX, boom(2.0, 70, 30), 4.8, 0, 0.9)
add(FX, rumble(1.8, 20, 900, 'down'), 4.8, 0, 1.0)
add(FX, clacks(1.6, 0.25, 1), 4.85, 0, 0.5)
# ---------------- the platform ----------------
add(FX, rumble(13.0, 60, 400) * 0.25 + noise(13.0, 300, 2500) * 0.12, 6.3, 0, 0.35)       # station hum and murmur
add(MUS, pad([98, 146.8, 196, 233.1], 6.5, 1.2, 1.5), 6.3, 0, 0.32)                          # G minor, calm
add(MUS, pad([92.5, 138.6, 185, 220], 6.0, 1.5, 0.5), 12.4, 0, 0.36)                         # unease
add(FX, boom(0.6, 120, 60), 18.45, 0, 0.6)                                                    # he hits the track bed
add(FX, noise(0.9, 600, 4000) * env(int(0.9 * SR), 0.05, 0.6), 18.0, 0.3, 0.35)               # the crowd gasps
# ---------------- the tunnel ----------------
add(FX, rumble(3.2, 20, 300, 'up'), 19.2, 0, 0.7)
add(FX, noise(3.2, 2500, 8000) * np.linspace(0, 1, int(3.2 * SR)) ** 2, 19.2, 0.3, 0.2)
add(FX, boom(1.4, 60, 32), 20.95, 0, 0.6)
add(MUS, pad([73.4, 110, 116.5, 146.8], 13.5, 0.5, 0.3), 19.3, 0, 0.42)                       # D with a minor second: dread
# ---------------- the decision and the jump ----------------
bt = 22.4
while bt < 32.1:
    k = (bt - 22.4) / 9.7; add(FX, heart(0.7 + 0.3 * k), bt, 0, 0.55); bt += 60 / (88 + 60 * k)
steps(np.arange(24.0, 25.0, 0.22), 0.4)
add(FX, boom(0.5, 140, 60), 25.7, 0, 0.55)
add(FX, rumble(6.4, 20, 500, 'up'), 25.9, 0, 0.9)
add(FX, horn(1.2), 28.2, 0, 0.4); add(FX, horn(1.6), 30.4, 0, 0.55)
n = int(6.0 * SR); add(MUS, np.sin(2 * np.pi * np.cumsum(220 * 2 ** (np.linspace(0, 1, n) * 1.0)) / SR) * np.linspace(0, 1, n) ** 2 * env(n, 0.5, 0.05), 26.1, 0, 0.12)
# ---------------- brakes ----------------
add(FX, screech(3.6, 4), 32.1, 0.1, 0.5)
add(FX, rumble(3.5, 20, 700), 32.1, 0, 0.9)
# ---------------- overhead ----------------
add(FX, rumble(4.2, 18, 1200, 'down') * 1.2, 35.5, 0, 1.0)
add(FX, clacks(4.0, 0.45, 2), 35.55, 0, 0.6)
add(FX, screech(4.0, 5) * np.linspace(1, 0.2, int(4.0 * SR)), 35.5, -0.1, 0.45)
# ---------------- stopped ----------------
n = int(2.5 * SR); add(FX, noise(2.5, 2000, 9000) * np.exp(-np.arange(n) / SR * 1.5) * env(n, 0.01, 0.5), 41.2, 0.3, 0.3)   # air brakes release
add(FX, np.sin(2 * np.pi * 3800 * t[: int(3 * SR)]) * env(int(3 * SR), 0.3, 2.0), 39.7, 0, 0.02)
# ---------------- the crowd, and the resolve ----------------
add(FX, applause(7.5, 900, 3) + 0.25 * noise(7.5, 400, 3000) * env(int(7.5 * SR), 1.0, 2.0), 44.6, 0, 0.45)
add(MUS, pad([98, 146.8, 196, 246.9, 293.7], 7.6, 1.2, 2.2), 44.6, 0, 0.55)                    # G major
for at, f in ((45.2, 587.3), (46.4, 740.0), (47.6, 784.0), (49.0, 987.8)):
    add(MUS, tone(f, 2.6, 0.004, 2.4, (1, 0.25)), at, 0.3 * np.sin(at), 0.08)

# ---------------- narration and mix ----------------
with wave.open('out/vo.wav') as w:
    vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
vo = np.interp(np.arange(N) / SR, np.arange(len(vo)) / vsr, vo)
k_ = int(0.25 * SR); cs = np.concatenate([[0], np.cumsum(np.abs(vo))]); venv = np.convolve(np.abs(vo), [1], 'same'); venv = np.interp(np.arange(N), np.arange(N), (cs[np.minimum(np.arange(N) + k_ // 2, N)] - cs[np.maximum(np.arange(N) - k_ // 2, 0)]) / k_); duck = 1 - 0.55 * np.clip(venv / 0.05, 0, 1)
mix = MUS * duck[:, None] * 0.75 + FX * (0.5 + 0.5 * duck[:, None]) * 0.8 + vo[:, None] * 1.3
mix *= np.minimum(1, (DUR - t) / 0.8)[:, None] * np.minimum(1, t / 0.05)[:, None]
mix = np.tanh(mix * 0.95 / np.percentile(np.abs(mix), 99.95)) * 0.9
with wave.open('out/mix.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mix', mix.shape)
