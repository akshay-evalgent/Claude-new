"""A short ambient score for the shot: a low drone, a swell as the sun clears the limb (t = 4.2 s), then a warm chord -> out/score.wav"""
import numpy as np, wave

SR, DUR = 48000, 14.0
N = int(SR * DUR); t = np.arange(N) / SR
rs = np.random.RandomState(3)
L = np.zeros(N); R = np.zeros(N)


def env(a, b, c, d):            # 0 before a, rises to 1 by b, holds, falls to 0 from c to d
    return np.clip((t - a) / max(b - a, 1e-3), 0, 1) * np.clip((d - t) / max(d - c, 1e-3), 0, 1)


def voice(f, gain, e, pan=0.0, detune=0.003, bright=0.25):
    x = np.zeros(N)
    for d in (-detune, 0, detune * 1.2):
        ph = 2 * np.pi * f * (1 + d) * t + rs.uniform(0, 6)
        x += np.sin(ph) + bright * np.sin(2 * ph) + bright * 0.4 * np.sin(3 * ph)
    x *= gain * e / 3
    L[:] += x * np.sqrt(0.5 * (1 - pan)); R[:] += x * np.sqrt(0.5 * (1 + pan))


def noise(lo, hi):
    spec = np.fft.rfft(rs.randn(N)); f = np.fft.rfftfreq(N, 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) / (1 + (f / hi) ** 4)
    x = np.fft.irfft(spec, N); return x / np.abs(x).max()


# the dark: a low D drone with slow breathing
breath = 0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t)
voice(36.7, 0.5, env(0, 2.5, 12.5, 14) * breath, 0, 0.002, 0.15)
voice(55.0, 0.22, env(0.5, 3.0, 12.5, 14) * breath, -0.2, 0.003, 0.1)
# rising air before the sun breaks through
air = noise(1500, 9000); L[:] += air * 0.05 * env(1.0, 4.2, 4.3, 6.5); R[:] += np.roll(air, 977) * 0.05 * env(1.0, 4.2, 4.3, 6.5)
# the sunrise: a soft swell and a D major chord that opens upward
hit = np.exp(-np.clip(t - 4.2, 0, None) * 1.6) * (t >= 4.2)
sub = np.sin(2 * np.pi * (40 + 25 * np.exp(-np.clip(t - 4.2, 0, None) * 6)) * t) * hit * 0.55
L[:] += sub; R[:] += sub
for f, g, pan, a in ((146.8, 0.16, -0.4, 4.2), (220.0, 0.14, 0.4, 4.6), (293.7, 0.12, -0.2, 5.2), (370.0, 0.1, 0.3, 6.0), (440.0, 0.08, 0.0, 7.2), (587.3, 0.05, -0.3, 8.6)):
    voice(f, g, env(a, a + 2.2, 12.3, 14.0), pan, 0.004, 0.3)
shimmer = noise(5000, 14000) * env(4.2, 5.0, 11.5, 14.0) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.7 * t)) * 0.025
L[:] += shimmer; R[:] += np.roll(shimmer, 1531)

# a little space: a few echoes, then a gentle limiter
def echo(x):
    y = x.copy()
    for d, g in ((0.19, 0.3), (0.41, 0.2), (0.77, 0.12), (1.3, 0.07)):
        k = int(d * SR); y[k:] += x[:-k] * g
    return y
mix = np.stack([echo(L), echo(R)], 1)
mix *= np.minimum(1, t / 0.3)[:, None] * np.minimum(1, (DUR - t) / 1.2)[:, None]
mix = np.tanh(mix / np.percentile(np.abs(mix), 99.9) * 0.9) * 0.85
with wave.open('out/score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('score', mix.shape)
