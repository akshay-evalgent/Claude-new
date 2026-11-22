"""Generate our own sound effects (no licence needed): whooshes, pops, risers, booms, dings, ticks.
usage: python make_synth_sfx.py OUT_DIR"""
import sys
from pathlib import Path
import numpy as np, soundfile as sf
SR = 48000; out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(3)
def env(n, a, r):
    e = np.ones(n); A = int(a * SR); R = int(r * SR)
    e[:A] = np.linspace(0, 1, A) ** 2; e[-R:] = np.linspace(1, 0, R) ** 2; return e
def bandnoise(n, f0, f1, q=6):
    x = rng.standard_normal(n); y = np.zeros(n); lp = 0; bp = 0
    for i in range(n):  # state-variable filter with sweeping centre
        fc = f0 * (f1 / f0) ** (i / n); g = 2 * np.sin(np.pi * fc / SR); hp = x[i] - lp - bp / q * 1.0
        bp += g * hp; lp += g * bp; y[i] = bp
    return y / (np.abs(y).max() + 1e-9)
def save(name, x, pan=0.0):
    x = x / (np.abs(x).max() + 1e-9) * 0.9
    st = np.stack([x * (1 - max(0, pan)), x * (1 + min(0, pan))], 1)
    sf.write(out / f"{name}.wav", st.astype(np.float32), SR)
for i, (d, f0, f1) in enumerate([(0.35, 400, 4000), (0.5, 300, 2500), (0.6, 2500, 300)], 1):
    n = int(d * SR); w = bandnoise(n, f0, f1) * np.sin(np.linspace(0, np.pi, n)) ** 1.5; save(f"whoosh_{i}", w)
for i, (f0, f1, d) in enumerate([(900, 500, 0.09), (1300, 700, 0.07), (600, 300, 0.12)], 1):
    n = int(d * SR); t = np.arange(n) / SR; fr = f0 * (f1 / f0) ** (t / d)
    save(f"pop_{i}", np.sin(2 * np.pi * np.cumsum(fr) / SR) * env(n, 0.004, d * 0.8))
n = int(1.6 * SR); t = np.arange(n) / SR
save("riser", (bandnoise(n, 300, 6000) * 0.6 + np.sin(2 * np.pi * np.cumsum(200 * 8 ** (t / 1.6)) / SR) * 0.4) * (t / 1.6) ** 2)
n = int(1.4 * SR); t = np.arange(n) / SR
save("boom", (np.sin(2 * np.pi * np.cumsum(90 * 0.35 ** (t / 1.4)) / SR) + 0.3 * bandnoise(n, 200, 60)) * np.exp(-t * 3.5) * env(n, 0.003, 0.3))
for i, f in enumerate([1568, 2093], 1):
    n = int(1.2 * SR); t = np.arange(n) / SR
    save(f"ding_{i}", (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 4) * env(n, 0.002, 0.2))
n = int(0.03 * SR); save("tick", rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 200))
n = int(0.5 * SR); t = np.arange(n) / SR
save("cash", sum(np.sin(2 * np.pi * f * t) * np.exp(-t * k) for f, k in [(2637, 9), (3136, 7), (3951, 8)]) * env(n, 0.002, 0.2))
n = int(0.25 * SR); t = np.arange(n) / SR
save("thud", np.sin(2 * np.pi * np.cumsum(140 * 0.4 ** (t / 0.25)) / SR) * np.exp(-t * 14))
print(sorted(p.name for p in out.iterdir()))
