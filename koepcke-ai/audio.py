"""Sound for She Fell From the Sky: narration over a synthesized bed (falling wind, cabin drone, storm, jungle, water, a simple score)."""
import numpy as np, wave, os
HERE = os.path.dirname(os.path.abspath(__file__))
SR, FPS = 48000, 24
END = 58.3
SLOTS = [('k01', 2.6), ('k02', 1.8), ('k03', 1.2), ('k04', 3.0), ('k05', 2.5), ('MAP1', 2.2), ('k06', 2.4), ('k07', 1.5), ('k08', 1.5), ('k09', 2.8),
         ('k10', 1.7), ('k11', 1.4), ('k12', 2.2), ('k13', 2.3), ('k14', 1.6), ('k15', 1.6), ('k16', 1.7), ('k17', 2.4), ('k18', 2.7), ('k19', 3.1), ('k20', 3.6),
         ('k21', 3.6), ('k22', 0)]
C, acc = {}, 0.0
for n, d in SLOTS:
    d = d or END - acc; C[n] = (acc, acc + d); acc += d
DUR = acc; N = int(SR * DUR); t = np.arange(N) / SR; mix = np.zeros((N, 2)); rs = np.random.RandomState(11)
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

def _unused_squeak(at, gain, pan):
    n = int(rs.uniform(0.04, 0.11) * SR); tt = np.arange(n) / SR; f0 = rs.uniform(5200, 8800)
    add(np.sin(2 * np.pi * np.cumsum(f0 * (1 - 0.3 * tt / tt[-1]) * (1 + 0.04 * np.sin(2 * np.pi * 60 * tt))) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2, at, pan, gain)

def _unused_flutter(a, b, gain):
    n = int((b - a) * SR); tt = np.arange(n) / SR
    add(noise(b - a, 150, 1400) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * tt + 3 * np.sin(2 * np.pi * 0.7 * tt))) ** 3 * np.clip(np.sin(np.pi * tt / tt[-1]), 0, 1) ** 0.5, a, 0.2, gain)

def pad(freqs, a, b, gain, fi=1.0, fo=1.0, bright=0.25):
    e = win(a, b, fi, fo)
    for k, f in enumerate(freqs):
        x = np.sin(2 * np.pi * f * t + k) + bright * np.sin(2 * np.pi * 2 * f * t + 2 * k) + bright * 0.4 * np.sin(2 * np.pi * 3.01 * f * t)
        add(x * (1 + 0.12 * np.sin(2 * np.pi * (0.11 + 0.03 * k) * t + k)) * e, 0, 0.5 * np.sin(k * 2.1), gain / len(freqs))


def bed(sig_fn, a, b, gain, pan=0.0, fi=0.3, fo=0.3):
    """a looping texture from a to b with fades"""
    n = int((b - a) * SR); tt = np.arange(n) / SR
    add(sig_fn(b - a, tt) * np.minimum(seg(tt, 0, fi), 1 - seg(tt, b - a - fo, b - a)), a, pan, gain)

def thunder(at, gain=0.5, crack=True):
    d = 2.8; tt = np.arange(int(d * SR)) / SR
    x = noise(d, 25, 220) * np.exp(-tt * 1.1) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3.1 * tt)))
    if crack: x += noise(d, 900, 7000) * np.exp(-tt * 18) * 0.9
    add(x, at, rs.uniform(-0.3, 0.3), gain)

def rain(dur, tt): return noise(dur, 2000, 9000) * 0.6 + noise(dur, 400, 2000) * 0.3

def insects(dur, tt):
    x = np.zeros(len(tt))
    for f, r in ((4300, 23), (5600, 31), (3700, 17)):
        x += np.sin(2 * np.pi * f * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * r * tt)) ** 6 * (0.6 + 0.4 * np.sin(2 * np.pi * 0.2 * tt + f))
    return x / 3 + noise(dur, 3000, 8000) * 0.08

def bird(at, gain, pan):
    d = rs.uniform(0.12, 0.3); tt = np.arange(int(d * SR)) / SR; f0 = rs.uniform(1800, 3600); df = rs.uniform(-900, 1400)
    add(np.sin(2 * np.pi * np.cumsum(f0 + df * tt / d + 200 * np.sin(2 * np.pi * 30 * tt)) / SR) * np.sin(np.pi * tt / d) ** 2, at, pan, gain)

def water(dur, tt):
    x = noise(dur, 250, 2500); env = np.abs(noise(dur, 3, 18)); return x * (0.4 + env) + noise(dur, 2500, 6000) * 0.15

def heart(a, n, gap=0.78, g=0.28):
    for k in range(n): at = a + k * gap; add(tone(52, 0.25, 16), at, 0, g); add(tone(48, 0.25, 18), at + 0.2, 0, g * 0.72)

# ---- hook: falling through the storm, then the jungle floor
fall_a, fall_b = 0.0, C['k02'][1]
roar = noise(fall_b - fall_a, 80, 2600) * 0.8 + noise(fall_b - fall_a, 2600, 8000) * 0.3
tt = np.arange(len(roar)) / SR
add(roar * (0.5 + 0.5 * seg(tt, 0, 3.5)) * (0.75 + 0.25 * np.sin(2 * np.pi * 2.3 * tt)) * (1 - seg(tt, len(tt) / SR - 0.15, len(tt) / SR)), 0, 0, 0.32)
bed(rain, 0, fall_b, 0.1, 0.2)
boom(0.03, 0.5, 60); thunder(0.5, 0.55); thunder(1.7, 0.45)
pad([73.4, 110.0, 155.6], 0, fall_b, 0.15, 0.05, 0.2, 0.4)
heart(0.4, 5, 0.82)
boom(C['k03'][0], 0.6, 55)                                    # impact, then silence and the forest
bed(insects, C['k03'][0] + 0.1, C['k04'][0] + 0.2, 0.05, -0.3, 0.4, 0.2)
for k in range(3): bird(C['k03'][0] + 0.3 + k * 0.35, 0.03, rs.uniform(-0.7, 0.7))

# ---- Christmas Eve: the cabin drone, a little celesta
ca, cb = C['k04'][0], C['MAP1'][1]
whoosh(ca, 0.6, 0.14)
def engines(dur, tt): return (np.sin(2 * np.pi * 96 * tt) + 0.6 * np.sin(2 * np.pi * 192.5 * tt) + 0.3 * np.sin(2 * np.pi * 289 * tt)) * (0.85 + 0.15 * np.sin(2 * np.pi * 4.1 * tt)) * 0.5 + noise(dur, 90, 700) * 0.7
bed(engines, ca, C['k08'][1], 0.11, 0, 0.4, 0.1)
for k, f in enumerate((784, 988, 1175, 1568, 1175, 988, 1319, 1568)):
    add(tone(f, 1.2, 4.5, ((2, 0.25), (3.01, 0.08))), C['k05'][0] + 0.1 + k * 0.29, 0.3 * np.sin(k), 0.03)
pad([196.0, 246.9, 293.7], ca, cb - 0.2, 0.12, 0.6, 0.4, 0.2)
ma, mb = C['MAP1']
for k in range(10): add(tone(900 + 60 * k, 0.04, 60), ma + 0.1 + k * 0.14, 0, 0.03)
boom(ma + 0.76 * (mb - ma), 0.45, 64)

# ---- the storm and the breakup
sa, sb = C['k06'][0], C['k08'][1]
bed(rain, sa, sb, 0.2, -0.2, 0.2, 0.05)
rumble = noise(sb - sa, 30, 300); tt = np.arange(len(rumble)) / SR
add(rumble * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 1.7 * tt))) * (0.4 + 0.6 * seg(tt, 0, 2.0)), sa, 0, 0.35)
for k in range(10): add(noise(0.08, 200, 2500) * np.exp(-np.arange(int(0.08 * SR)) / SR * 40), sa + 0.2 + k * 0.21 + rs.uniform(0, 0.08), rs.uniform(-0.8, 0.8), 0.07)   # bags, rattles
thunder(sa + 1.2, 0.4); thunder(sa + 1.9, 0.35)
thunder(C['k07'][0] + 0.03, 0.8); boom(C['k07'][0] + 0.03, 0.7, 48)
ba = C['k08'][0]                                              # metal tearing, then the wind takes over
for k in range(6):
    d = 0.5; tt2 = np.arange(int(d * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(rs.uniform(300, 900) * np.exp(-tt2 * 2)) / SR) * noise(d, 200, 3000) * np.exp(-tt2 * 5), ba + k * 0.18, rs.uniform(-0.7, 0.7), 0.12)
boom(ba + 0.1, 0.6, 52); whoosh(sb, 0.9, 0.22)
pad([55.0, 58.3, 82.4], sa, sb, 0.2, 0.3, 0.1, 0.5)

# ---- alone in the jungle
ja, jb = C['k09'][0], C['k12'][1]
bed(insects, ja, C['k17'][0], 0.06, -0.2, 1.2, 0.5)
bed(rain, ja, C['k10'][1], 0.05, 0.3, 0.6, 0.8)
for k in range(14): bird(rs.uniform(ja + 0.5, C['k17'][0] - 0.3), rs.uniform(0.012, 0.03), rs.uniform(-0.9, 0.9))
pad([73.4, 87.3, 110.0, 146.8], ja, jb, 0.15, 1.0, 0.5, 0.3)
add(tone(3200, 2.6) * np.exp(-np.arange(int(2.6 * SR)) / SR * 1.3), ja, 0, 0.015)          # ears ringing
heart(C['k11'][0] + 0.05, 2, 0.7, 0.24)
ka = C['k12'][0]                                              # the candy bag
for k in range(7): d = rs.uniform(0.03, 0.09); add(noise(d, 1500, 9000) * np.exp(-np.arange(int(d * SR)) / SR * 50), ka + 0.25 + k * 0.17 + rs.uniform(0, 0.06), 0.2, 0.05)

# ---- following the water: a pulse comes in
wa, wb = C['k13'][0], C['k16'][1]
bed(water, wa, C['k17'][0] + 0.3, 0.11, 0.1, 0.5, 0.6)
whoosh(wa, 0.6, 0.12)
for k in range(5): d = 0.25; add(noise(d, 300, 3500) * np.exp(-np.arange(int(d * SR)) / SR * 14), C['k14'][0] + 0.1 + k * 0.33, rs.uniform(-0.4, 0.4), 0.06)   # wading splashes
beat = 60 / 118
for k in range(int((wb - wa) / beat)):
    at = wa + k * beat; add(tone(55 if k % 4 == 0 else 82.4, 0.3, 14, ((2, 0.3),)), at, 0, 0.17 if k % 4 == 0 else 0.07)
pad([110.0, 164.8, 220.0, 261.6], wa, wb, 0.12, 0.6, 0.4, 0.25)
pad([82.4, 123.5, 164.8], C['k16'][0], wb, 0.08, 0.4, 0.3, 0.2)

# ---- the wound: flies
fa, fb = C['k17']
for k in range(3):
    d = fb - fa; tt = np.arange(int(d * SR)) / SR; f = 190 + 30 * k + 25 * np.sin(2 * np.pi * (0.7 + 0.3 * k) * tt)
    add(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * (1.1 + k * 0.4) * tt + k)) * np.sin(np.pi * tt / d), fa, (k - 1) * 0.6, 0.03)
pad([69.3, 73.4, 103.8], fa, fb + 0.2, 0.16, 0.3, 0.3, 0.45)
heart(fa + 0.2, 3, 0.75, 0.22)

# ---- day ten: the boat, the fuel
da, db = C['k18'][0], C['k19'][1]
whoosh(da, 0.6, 0.14); boom(da, 0.4, 66)
bed(water, da, C['k19'][0] + 0.4, 0.06, 0.3, 0.4, 0.5)
bed(insects, da, C['k21'][0], 0.035, -0.3, 0.6, 0.6)
for k in range(5): step(da + 0.4 + k * 0.5, 0.06, 0.1)
for k in range(2): add(tone(120, 0.3, 12, ((2.3, 0.4),)) * 0.6 + noise(0.3, 100, 1200) * np.exp(-np.arange(int(0.3 * SR)) / SR * 20) * 0.4, da + 1.6 + k * 0.5, -0.4, 0.07)   # boat knocks
pa = C['k19'][0] + 0.3                                        # the pour
d = 1.6; tt = np.arange(int(d * SR)) / SR
add(noise(d, 500, 3800) * (0.5 + 0.5 * np.abs(noise(d, 8, 40))) * np.sin(np.pi * tt / d) ** 0.5, pa, 0.1, 0.12)
boom(pa + 0.35, 0.45, 70); add(tone(2400, 1.5) * np.exp(-np.arange(int(1.5 * SR)) / SR * 2), pa + 0.35, 0, 0.02)
pad([65.4, 69.3, 98.0], da, db, 0.16, 0.5, 0.3, 0.4)

# ---- found
fa2, fb2 = C['k20']
for k in range(4): step(fa2 + 0.15 + k * 0.4, 0.07, -0.3, soft=False)
d = 0.9; tt = np.arange(int(d * SR)) / SR
add(np.sin(2 * np.pi * np.cumsum(180 + 120 * np.sin(2 * np.pi * 3 * tt)) / SR) * noise(d, 300, 2500) * 0.6 * np.sin(np.pi * tt / d), fa2 + 0.1, 0.4, 0.06)   # door creak
pad([87.3, 130.8, 174.6, 220.0], fa2, C['k21'][1], 0.16, 0.8, 0.6, 0.25)
boom(46.45, 0.6, 58)                                          # "1 of 92"
pad([55.0, 82.4, 110.0], C['k21'][0], C['k21'][1], 0.12, 0.5, 0.4, 0.3)

# ---- today: sunrise over the forest
ea = C['k22'][0]
whoosh(ea, 0.8, 0.16)
bed(insects, ea, DUR, 0.03, -0.3, 1.0, 1.5)
for k in range(12): bird(rs.uniform(ea + 0.3, DUR - 1.0), rs.uniform(0.015, 0.035), rs.uniform(-0.9, 0.9))
pad([130.8, 196.0, 261.6, 329.6, 392.0], ea, DUR, 0.2, 0.8, 2.0, 0.3)
for k in range(int((54.6 - ea) / beat)): at = ea + k * beat; add(tone(65.4 if k % 4 == 0 else 98, 0.3, 14, ((2, 0.3),)), at, 0, 0.16 if k % 4 == 0 else 0.07)
boom(54.6, 0.5, 62)

# ---- narration on top; the bed ducks under it
with wave.open(os.path.join(HERE, 'vo', 'vo.wav')) as w:
    vsr = w.getframerate(); vo = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
vo = np.interp(np.arange(int(len(vo) / vsr * SR)) / SR, np.arange(len(vo)) / vsr, vo); vo = vo / np.abs(vo).max()
env = np.abs(np.pad(vo, (0, max(0, N - len(vo))))[:N]); k = int(0.25 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
bedmix = mix / np.percentile(np.abs(mix), 99.9) * 0.55
bedmix *= (1 - 0.5 * np.clip(env / 0.06, 0, 1))[:, None]
mix[:] = bedmix; add(vo, 0, 0, 1.25)
mix *= np.minimum(1, (DUR - t) / 0.6)[:, None] * np.minimum(1, t / 0.05)[:, None]
mix = np.tanh(mix / np.percentile(np.abs(mix), 99.95) * 0.95) * 0.92
with wave.open(os.path.join(HERE, 'out', 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mix', round(DUR, 2), 's')
