"""Sound for the Morning Walk demo: Kokoro narration, a morning street bed, footsteps on the mocap's own touch-downs."""
import numpy as np, wave, json, os, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__)); KIT = os.path.dirname(HERE)
SR, DUR = 48000, 13.5
SHOTS = [('S1', 0.0, 4.0, 0.35), ('S2', 4.0, 4.0, 0.55), ('S3', 8.0, 3.0, 1.0)]   # name, start, length, footstep loudness
N = int(SR * DUR); t = np.arange(N) / SR; mix = np.zeros((N, 2)); rs = np.random.RandomState(4)


def noise(dur, lo, hi):
    n = int(dur * SR); spec = np.fft.rfft(rs.randn(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) / (1 + (f / hi) ** 4)
    x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)


def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR); sig = sig[: max(0, N - i)] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))


# morning street: distant traffic, air, a few birds
add(noise(DUR, 40, 500) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * t)), 0, 0, 0.07)
add(noise(DUR, 800, 6000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * t + 1)), 0, 0.2, 0.025)
for k in range(14):
    at = rs.uniform(0.3, DUR - 1); n = int(rs.uniform(0.08, 0.2) * SR); tt = np.arange(n) / SR; f0 = rs.uniform(2600, 4800)
    chirp = np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.25 * np.sin(2 * np.pi * rs.uniform(18, 35) * tt))) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
    add(chirp, at, rs.uniform(-0.8, 0.8), 0.035)
# footsteps where the motion capture puts them
for name, start, length, loud in SHOTS:
    steps = json.load(open(os.path.join(KIT, 'out', 'walk', f'{name}_steps.json')))
    kept = []
    for s in steps:
        if not kept or s - kept[-1] > 0.3: kept.append(s)
    for s in kept:
        if s >= length: continue
        n = int(0.12 * SR); tt = np.arange(n) / SR
        step = (noise(0.12, 150, 4000) * 0.8 + np.sin(2 * np.pi * 85 * tt) * 0.6) * np.exp(-tt * 38)
        add(step, start + s, rs.uniform(-0.2, 0.2), 0.16 * loud)
# a soft, warm chord under the narration
for f, g in ((130.8, 0.05), (196.0, 0.04), (261.6, 0.035), (329.6, 0.025), (392.0, 0.02)):
    e = np.clip(t / 2.5, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
    add(np.sin(2 * np.pi * f * t + f) * (1 + 0.15 * np.sin(2 * np.pi * 0.2 * t)) * e, 0, 0.3 * np.sin(f), g)
# narration
vo, vsr = sf.read(os.path.join(KIT, 'voice', 'narration.wav'))
vo = np.interp(np.arange(int(len(vo) / vsr * SR)) / SR, np.arange(len(vo)) / vsr, vo)
add(vo, 0.45, 0, 0.95)
mix *= np.minimum(1, (DUR - t) / 0.8)[:, None]
mix = np.tanh(mix / np.percentile(np.abs(mix), 99.95) * 0.9) * 0.9
with wave.open(os.path.join(KIT, 'out', 'demo_mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('demo mix', round(DUR, 2), 's')
