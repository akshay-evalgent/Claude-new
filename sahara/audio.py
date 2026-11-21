"""Sound for Lost in the Sahara: narration over a synthesized bed (wind, storm, footsteps, bats, a simple score)."""
import numpy as np, wave, os
HERE = os.path.dirname(os.path.abspath(__file__))
SR, FPS = 48000, 24
SEQ = [('H1', 86), ('H2', 38), ('H3', 41), ('R1', 82), ('R2', 74), ('MAP1', 87), ('S1', 48), ('S2', 43), ('A1', 43), ('MAP2', 36), ('W1', 74), ('M1', 58), ('M2', 58), ('M3', 70),
       ('D1', 50), ('D2', 50), ('N1', 84), ('MAP3', 102), ('K1', 106), ('P1', 86), ('P2', 89)]
C, acc = {}, 0
for n, f in SEQ: C[n] = (acc / FPS, (acc + f) / FPS); acc += f
DUR = acc / FPS; N = int(SR * DUR); t = np.arange(N) / SR; mix = np.zeros((N, 2)); rs = np.random.RandomState(7)
seg = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
def win(a, b, fi=0.3, fo=0.3): return np.minimum(seg(t, a, a + fi), 1 - seg(t, b - fo, b))

def noise(dur, lo, hi, order=4):
    n = int(dur * SR); spec = np.fft.rfft(rs.randn(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** order) / (1 + (f / hi) ** order)
    x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)

def add(sig, at, pan=0.0, gain=1.0):
    i = int(at * SR)
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[: max(0, N - i)] * gain
    mix[i:i + len(sig), 0] += sig * np.sqrt(0.5 * (1 - pan)); mix[i:i + len(sig), 1] += sig * np.sqrt(0.5 * (1 + pan))

def tone(f, dur, decay=0.0, harm=()):
    tt = np.arange(int(dur * SR)) / SR; x = np.sin(2 * np.pi * f * tt)
    for k, g in harm: x += g * np.sin(2 * np.pi * f * k * tt)
    return x * (np.exp(-tt * decay) if decay else 1)

def boom(at, gain=0.5, f0=70):
    tt = np.arange(int(1.6 * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-tt * 3) + 28) / SR) * np.exp(-tt * 3.2) + noise(1.6, 30, 300) * np.exp(-tt * 9) * 0.6, at, 0, gain)

def whoosh(at, dur=0.5, gain=0.12, pan=0.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    add(noise(dur, 300, 5000) * np.sin(np.pi * tt / dur) ** 3, at - dur * 0.6, pan, gain)

def step(at, gain, pan=0.0, soft=True):
    tt = np.arange(int(0.16 * SR)) / SR
    add((noise(0.16, 90, 1800 if soft else 3500) + 0.5 * np.sin(2 * np.pi * 70 * tt)) * np.exp(-tt * 30) * seg(tt, 0, 0.004), at, pan, gain)

def squeak(at, gain, pan):
    n = int(rs.uniform(0.04, 0.11) * SR); tt = np.arange(n) / SR; f0 = rs.uniform(5200, 8800)
    add(np.sin(2 * np.pi * np.cumsum(f0 * (1 - 0.3 * tt / tt[-1]) * (1 + 0.04 * np.sin(2 * np.pi * 60 * tt))) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2, at, pan, gain)

def flutter(a, b, gain):
    n = int((b - a) * SR); tt = np.arange(n) / SR
    add(noise(b - a, 150, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * tt + 3 * np.sin(2 * np.pi * 0.7 * tt))) ** 3 * np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 0.5, a, 0.2, gain)

def pad(freqs, a, b, gain, fi=1.0, fo=1.0, bright=0.25):
    e = win(a, b, fi, fo)
    for k, f in enumerate(freqs):
        x = np.sin(2 * np.pi * f * t + k) + bright * np.sin(2 * np.pi * 2 * f * t + 2 * k) + bright * 0.4 * np.sin(2 * np.pi * 3.01 * f * t)
        add(x * (1 + 0.12 * np.sin(2 * np.pi * (0.11 + 0.03 * k) * t + k)) * e, 0, 0.5 * np.sin(k * 2.1), gain / len(freqs))

# ---- desert air, all the way through
wind = noise(DUR, 120, 900) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.09 * t) * np.sin(2 * np.pi * 0.23 * t + 1))
level = 0.05 + 0.05 * win(0, C['H3'][0], 0.1, 0.5) + 0.03 * win(C['A1'][0], C['W1'][1], 0.2, 0.5) + 0.04 * win(C['D1'][0], C['D2'][1], 0.3, 0.5) + 0.03 * win(C['P2'][0], DUR, 0.5, 0.1)
add(wind * level, 0, -0.1, 1.0)
add(noise(DUR, 1500, 7000) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.31 * t + 2)) ** 2 * level, 0, 0.3, 0.35)      # sand hiss

# ---- hook: a lost man, then the bats
pad([73.4, 110.0, 146.8], 0, C['H3'][1], 0.16, 0.05, 0.4, 0.4)
boom(0.05, 0.45); boom(C['H3'][0], 0.55, 60)
for k in range(9): step(0.35 + k * 0.62, 0.05, 0.1)
for k in range(8): at = 0.5 + k * 0.78; add(tone(52, 0.25, 16), at, 0, 0.3); add(tone(48, 0.25, 18), at + 0.2, 0, 0.22)   # heartbeat
whoosh(C['H2'][0], 0.5, 0.12); whoosh(C['H3'][0], 0.6, 0.16)
flutter(C['H3'][0], C['H3'][1], 0.16)
for k in range(26): squeak(rs.uniform(C['H3'][0] + 0.05, C['H3'][1] - 0.1), rs.uniform(0.02, 0.05), rs.uniform(-0.9, 0.9))

# ---- the race: feet and a pulse
whoosh(C['R1'][0], 0.6, 0.16)
ra, rb = C['R1'][0], C['MAP1'][1]
for r in range(5):
    cad = rs.uniform(2.7, 3.1); ph = rs.uniform(0, 0.3); pan = rs.uniform(-0.7, 0.7)
    for k in range(int((C['R2'][1] - ra) * cad)): step(ra + ph + k / cad, 0.055 if r else 0.085, pan)
beat = 60 / 132
for k in range(int((rb - ra) / beat)):
    at = ra + k * beat; g = 0.2 if k % 4 == 0 else 0.09
    add(tone(58 if k % 4 == 0 else 87, 0.3, 14, ((2, 0.3),)), at, 0, g)
    if k % 2: add(noise(0.05, 3000, 9000) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90), at, 0.3, 0.03)
pad([146.8, 220.0, 293.7, 349.2], ra, rb, 0.11, 0.6, 0.5)
for i in range(1, 7): add(tone(1320, 0.12, 40), C['MAP1'][0] + (0.08 + 0.72 * (i + 0.6) / 8) * (C['MAP1'][1] - C['MAP1'][0]), 0.2, 0.05)

# ---- the storm
sa, sb = C['S1'][0], C['S2'][1]
boom(sa, 0.7, 55)
roar = noise(sb - sa + 0.3, 60, 1400) * 0.9 + noise(sb - sa + 0.3, 900, 6000) * 0.5
tt = np.arange(len(roar)) / SR
add(roar * (0.25 + 0.75 * seg(tt, 0, 2.0) ** 1.5) * (1 - seg(tt, sb - sa - 0.02, sb - sa + 0.25)) * (0.8 + 0.2 * np.sin(2 * np.pi * 1.3 * tt)), sa, 0, 0.42)
gust = noise(sb - sa, 400, 2500); add(gust * (0.5 + 0.5 * np.sin(2 * np.pi * 0.9 * np.arange(len(gust)) / SR)) ** 4, sa, -0.5, 0.18)
pad([55.0, 58.3, 110.0], sa, sb, 0.2, 0.3, 0.1, 0.5)

# ---- alone: the sound drops away
add(tone(3400, C['MAP2'][1] - C['A1'][0]) * np.exp(-np.arange(int((C['MAP2'][1] - C['A1'][0]) * SR)) / SR * 1.4), C['A1'][0], 0, 0.018)
pad([73.4, 87.3, 146.8], C['A1'][0], C['W1'][1], 0.14, 0.8, 0.6, 0.3)
n2 = int((C['MAP2'][1] - C['MAP2'][0]) * SR); t2 = np.arange(n2) / SR
add(np.sin(2 * np.pi * np.cumsum(220 * np.exp(-t2 * 0.5)) / SR) * np.sin(np.pi * t2 / t2[-1]) * (1 + 0.3 * np.sin(2 * np.pi * 7 * t2)), C['MAP2'][0], 0, 0.07)
boom(C['MAP2'][0], 0.35)
# water: a few hollow drips, then nothing
for k, at in enumerate((0.5, 0.95, 1.5)):
    n3 = int(0.12 * SR); t3 = np.arange(n3) / SR
    add(np.sin(2 * np.pi * np.cumsum(700 + 900 * t3 / 0.12) / SR) * np.exp(-t3 * 35), C['W1'][0] + at, 0.1, 0.05 - 0.012 * k)
for k in range(4): at = C['W1'][0] + 0.3 + k * 0.72; add(tone(52, 0.25, 16), at, 0, 0.26); add(tone(48, 0.25, 18), at + 0.2, 0, 0.19)

# ---- the shrine and the bats
whoosh(C['M1'][0], 0.6, 0.12)
pad([65.4, 98.0, 130.8, 155.6], C['M1'][0], C['M3'][1], 0.17, 0.6, 0.4, 0.45)
for k in range(4): step(C['M1'][0] + 0.4 + k * 0.6, 0.06, 0.0)
boom(C['M2'][0], 0.55, 58)
flutter(C['M2'][0], C['M3'][1], 0.14)
for k in range(70): squeak(rs.uniform(C['M2'][0], C['M3'][1] - 0.15), rs.uniform(0.015, 0.045), rs.uniform(-0.9, 0.9))
add(noise(C['M3'][1] - C['M2'][0], 200, 900) * 0.6, C['M2'][0], 0, 0.035)       # room tone

# ---- walking on
whoosh(C['D1'][0], 0.6, 0.12)
pad([98.0, 146.8, 196.0, 233.1], C['D1'][0], C['D2'][1], 0.14, 0.5, 0.6, 0.2)
for k in range(8): step(C['D1'][0] + 0.25 + k * 0.56, 0.07, 0.1)

# ---- found
pad([87.3, 130.8, 174.6, 220.0, 261.6], C['N1'][0], C['K1'][1], 0.17, 0.9, 1.2, 0.25)
for k in range(5): step(C['N1'][0] + 0.3 + k * 0.66, 0.06, 0.1)
for k in range(7): add(tone(rs.choice([1568, 1760, 2093]), 0.5, 9, ((2.7, 0.3),)), C['N1'][0] + 0.6 + k * 0.42 + rs.uniform(0, 0.1), rs.uniform(-0.6, 0.6), 0.022)   # goat bells
# map: the counter runs up to 291
ma, mb = C['MAP3']; land = ma + 0.62 * (mb - ma)
for k in range(34): u = k / 33; add(tone(900 + 500 * u, 0.04, 60), ma + (0.05 + 0.57 * (1 - (1 - u) ** 3)) * (mb - ma), 0, 0.035)
boom(land, 0.6, 62)
# camp fire
for k in range(60):
    n4 = int(0.02 * SR); add(noise(0.02, 1500, 8000) * np.exp(-np.arange(n4) / SR * 200), rs.uniform(C['K1'][0], C['K1'][1]), rs.uniform(-0.5, 0.5), rs.uniform(0.01, 0.04))

# ---- back again
pa, pb = C['P1'][0], DUR
boom(pa, 0.6, 66); whoosh(pa, 0.6, 0.16)
for r in range(4):
    cad = rs.uniform(2.7, 3.1); ph = rs.uniform(0, 0.3); pan = rs.uniform(-0.7, 0.7)
    for k in range(int((C['P1'][1] - pa) * cad)): step(pa + ph + k / cad, 0.05 if r else 0.08, pan)
for k in range(int((C['P2'][0] + 1.2 - pa) / beat)):
    at = pa + k * beat; add(tone(65.4 if k % 4 == 0 else 98, 0.3, 14, ((2, 0.3),)), at, 0, 0.2 if k % 4 == 0 else 0.09)
pad([130.8, 196.0, 261.6, 329.6, 392.0], pa, pb, 0.2, 0.5, 2.0, 0.3)
boom(C['P2'][0] + 0.9, 0.45, 65)

# ---- narration on top; the bed ducks under it
with wave.open(os.path.join(HERE, 'out', 'vo.wav')) as w:
    vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
vo = np.interp(np.arange(int(len(vo) / vsr * SR)) / SR, np.arange(len(vo)) / vsr, vo); vo = vo / np.abs(vo).max()
env = np.abs(np.pad(vo, (0, max(0, N - len(vo))))[:N]); k = int(0.25 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
bed = mix / np.percentile(np.abs(mix), 99.9) * 0.55
bed *= (1 - 0.5 * np.clip(env / 0.06, 0, 1))[:, None]
mix[:] = bed; add(vo, 0, 0, 1.25)
mix *= np.minimum(1, (DUR - t) / 0.6)[:, None] * np.minimum(1, t / 0.05)[:, None]
mix = np.tanh(mix / np.percentile(np.abs(mix), 99.95) * 0.95) * 0.92
with wave.open(os.path.join(HERE, 'out', 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mix', round(DUR, 2), 's')
