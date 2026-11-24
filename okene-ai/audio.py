"""Sound for Trapped Under the Sea: narration over a synthesized bed (storm at sea, the capsize, the flooded hull, drips and breathing
in the air pocket, the divers, a simple score)."""
import numpy as np, wave, os
HERE = os.path.dirname(os.path.abspath(__file__))
SR, FPS = 48000, 24
END = 58.3
SLOTS = [('o01', 2.0), ('o02', 1.7), ('o03', 1.3), ('o04', 2.3), ('o05', 2.1), ('MAP1', 2.8), ('o06', 3.2), ('o07', 1.0), ('o08', 1.2), ('o09', 3.4),
         ('BLACK', 0.9), ('o10', 3.3), ('o11', 1.7), ('o12', 3.4), ('o13', 2.0), ('o14', 1.7), ('o15', 1.5), ('o16', 3.7), ('o17', 1.8), ('o18', 1.8), ('o19', 2.1),
         ('o20', 1.5), ('o21', 2.0), ('o22', 2.2), ('o24', 2.4), ('o23', 0)]
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

def heart(a, n, gap=0.78, g=0.28):
    for k in range(n): at = a + k * gap; add(tone(52, 0.25, 16), at, 0, g); add(tone(48, 0.25, 18), at + 0.2, 0, g * 0.72)

def drip(at, gain=0.05, pan=0.0):
    d = 0.09; tt = np.arange(int(d * SR)) / SR
    add(np.sin(2 * np.pi * np.cumsum(900 + 1800 * tt / d) / SR) * np.exp(-tt * 45), at, pan, gain)

def bubbles(at, n, spread, gain=0.04):
    for k in range(n):
        d = rs.uniform(0.03, 0.08); tt = np.arange(int(d * SR)) / SR; f0 = rs.uniform(300, 900)
        add(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 2.5 * tt / d)) / SR) * np.sin(np.pi * tt / d) ** 2, at + rs.uniform(0, spread), rs.uniform(-0.6, 0.6), gain)

def deep(dur, tt): return noise(dur, 18, 260) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tt)) + 0.25 * np.sin(2 * np.pi * 41 * tt)   # pressure, the hull

def creak(at, gain=0.1, pan=0.0, d=1.2):                                     # the steel hull groaning
    tt = np.arange(int(d * SR)) / SR; f = rs.uniform(70, 160) * (1 + 0.25 * np.sin(2 * np.pi * rs.uniform(0.6, 1.5) * tt))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.abs(noise(d, 20, 120))) + 0.3 * noise(d, 150, 900)
    add(x * np.sin(np.pi * tt / d) ** 1.5, at, pan, gain)

def breath(a, n, gap=1.3, g=0.05):                                           # heavy breathing: in, out
    for k in range(n):
        d = gap * 0.9; tt = np.arange(int(d * SR)) / SR; h = d * 0.45
        env = np.where(tt < h, np.sin(np.pi * np.clip(tt / h, 0, 1)) ** 2, 0.8 * np.sin(np.pi * np.clip((tt - d * 0.5) / h, 0, 1)) ** 2)
        add(noise(d, 400, 2600) * env, a + k * gap, 0, g)

def waves(dur, tt): return noise(dur, 60, 1500) * (0.35 + 0.65 * np.abs(np.sin(2 * np.pi * 0.21 * tt)) ** 3) + noise(dur, 1500, 6000) * 0.15

def regulator(a, n, gap=1.6, g=0.06):                                        # a diver's helmet: hiss in, bubbles out
    for k in range(n):
        at = a + k * gap; d = 0.6; tt = np.arange(int(d * SR)) / SR
        add(noise(d, 2500, 7000) * np.sin(np.pi * tt / d) ** 2, at, 0.2, g); bubbles(at + 0.7, 10, 0.5, g * 0.6)

def click(at, gain=0.08): add(noise(0.02, 1500, 8000) * np.exp(-np.arange(int(0.02 * SR)) / SR * 300), at, 0, gain)

def knock(at, gain=0.1, pan=0.0):                                            # metal on the hull, muffled
    tt = np.arange(int(0.4 * SR)) / SR; add((tone(210, 0.4, 12, ((2.7, 0.5), (4.1, 0.25))) + noise(0.4, 100, 900) * 0.5) * np.exp(-tt * 14), at, pan, gain)

beat = 60 / 118
def pulse(a, b, lo=55, hi=82.4, g=0.16):
    for k in range(int((b - a) / beat)): at = a + k * beat; add(tone(lo if k % 4 == 0 else hi, 0.3, 14, ((2, 0.3),)), at, 0, g if k % 4 == 0 else g * 0.45)

# ---- hook: the air pocket, the wreck, a light from below
ha, hb = 0.0, C['o03'][1]
bed(deep, ha, C['o04'][0] + 0.2, 0.3, 0, 0.05, 0.3)
breath(0.1, 2, 1.0, 0.07); heart(0.25, 6, 0.8, 0.26)
for k in range(5): drip(rs.uniform(0.2, 2.0), rs.uniform(0.03, 0.06), rs.uniform(-0.5, 0.5))
creak(C['o02'][0] - 0.2, 0.14, -0.3, 1.6); whoosh(C['o02'][0], 0.6, 0.12); bubbles(C['o02'][0] + 0.1, 12, 1.4, 0.03)
pad([55.0, 58.3, 82.4], ha, C['o03'][0], 0.16, 0.05, 0.3, 0.5)
add(tone(1318.5, 1.8, 1.6, ((1.5, 0.3),)) * seg(np.arange(int(1.8 * SR)) / SR, 0, 0.4), C['o03'][0], 0, 0.03)   # the light: a shimmer
pad([110.0, 138.6, 164.8, 220.0], C['o03'][0], C['o04'][0] + 0.3, 0.14, 0.3, 0.4, 0.3)
boom(C['o03'][0] + 0.3, 0.35, 70)

# ---- Nigeria, night: the swell, the tug's engine, the galley, the map
na, nb = C['o04'][0], C['o06'][0]
whoosh(na, 0.6, 0.14)
bed(waves, na, C['o07'][0], 0.22, 0.1, 0.4, 0.1); bed(rain, na, C['o07'][0], 0.07, -0.2, 0.4, 0.1)
def diesel(dur, tt): return (np.sin(2 * np.pi * 48 * tt) + 0.5 * np.sin(2 * np.pi * 96.3 * tt) + 0.25 * np.sin(2 * np.pi * 144 * tt)) * (0.8 + 0.2 * np.sin(2 * np.pi * 8 * tt)) * 0.5 + noise(dur, 60, 400) * 0.4
bed(diesel, na, C['o06'][0] + 1.2, 0.1, 0, 0.4, 0.3)
ga = C['o05'][0]                                                               # the stew simmering, pots knocking together
bed(lambda d, tt: noise(d, 300, 3000) * np.abs(noise(d, 4, 25)) ** 2, ga, C['o05'][1], 0.06, 0.2, 0.2, 0.2)
for k in range(3): add(tone(820 + 140 * k, 0.5, 9, ((2.4, 0.4), (3.9, 0.2))), ga + 0.3 + k * 0.55, 0.3 - 0.3 * k, 0.03)
pad([146.8, 174.6, 220.0], na, nb - 0.3, 0.1, 0.5, 0.4, 0.2)
ma, mb = C['MAP1']
for k in range(10): add(tone(900 + 60 * k, 0.04, 60), ma + 0.1 + k * 0.14, 0, 0.03)
boom(ma + 0.72 * (mb - ma), 0.4, 66)                                            # the icon rolls over

# ---- the capsize: a wall of water, the roll, the sink
ca, cb = C['o06'][0], C['o08'][1]
for k, at in enumerate((ca + 0.1, ca + 0.9, ca + 1.6)): add(noise(1.5, 50, 2500) * np.exp(-np.arange(int(1.5 * SR)) / SR * 2.2), at, 0.4 * np.sin(k * 2), 0.3)   # waves breaking
boom(ca + 1.4, 0.75, 46)
for k in range(5): creak(ca + 1.3 + k * 0.32, 0.14, rs.uniform(-0.8, 0.8), 0.9)
add(noise(2.2, 80, 4000) * seg(np.arange(int(2.2 * SR)) / SR, 0, 0.5), ca + 1.6, 0, 0.18)                     # water pours in
ua = C['o07'][0]                                                               # under the surface: everything goes muffled
bed(deep, ua, C['o09'][0] + 0.3, 0.35, 0, 0.05, 0.4); bubbles(ua, 30, 1.0, 0.05); whoosh(ua, 0.5, 0.18)
boom(C['o08'][0] + 0.25, 0.7, 40); add(noise(1.4, 30, 500) * np.exp(-np.arange(int(1.4 * SR)) / SR * 2.5), C['o08'][0] + 0.3, 0, 0.22)   # it hits the seabed
pad([55.0, 58.3, 77.8], ca, cb, 0.2, 0.3, 0.2, 0.55)

# ---- the toilet floods, then black
ta, tb = C['o09']
d = tb - ta; tt = np.arange(int(d * SR)) / SR
add(noise(d, 90, 3500) * (0.5 + 0.5 * seg(tt, 0, 1.2)) * (1 - seg(tt, d - 0.08, d)), ta, 0, 0.3)          # the water roaring in
for k in range(6): knock(ta + 0.2 + k * 0.5 + rs.uniform(0, 0.15), 0.1, rs.uniform(-0.7, 0.7))
for k in range(3): creak(ta + 0.4 + k * 0.9, 0.13, rs.uniform(-0.6, 0.6), 1.0)
heart(ta + 0.1, 5, 0.6, 0.3)
pad([58.3, 61.7, 87.3], ta, tb, 0.18, 0.3, 0.05, 0.6)
ka = C['BLACK'][0]                                                             # total darkness: a heartbeat and drips
heart(ka + 0.05, 2, 0.5, 0.3); drip(ka + 0.3, 0.05, 0.4); drip(ka + 0.7, 0.04, -0.3)

# ---- feeling his way through the flooded ship, then air
fa, fb = C['o10'][0], C['o11'][0]
bed(deep, fa, fb, 0.32, 0, 0.2, 0.05); bubbles(fa, 25, fb - fa, 0.035)
for k in range(2): creak(fa + 0.4 + k * 1.4, 0.12, rs.uniform(-0.6, 0.6), 1.2)
heart(fa + 0.1, 5, 0.62, 0.26)
pad([55.0, 65.4, 82.4], fa, fb + 0.2, 0.16, 0.3, 0.1, 0.4)
add(noise(0.7, 200, 4000) * np.exp(-np.arange(int(0.7 * SR)) / SR * 6), fb, 0, 0.22)                     # he bursts up out of the water
breath(fb + 0.2, 2, 0.75, 0.09)

# ---- the air pocket: drips, breathing, the flashlights, the fish, a prayer
pa, pb = C['o12'][0], C['o17'][0]
bed(lambda d, tt: noise(d, 20, 180) * 0.6, fb, pb, 0.18, 0, 0.3, 0.3)                                     # the hull hums
for k in range(16): drip(rs.uniform(fb + 0.3, pb - 0.3), rs.uniform(0.02, 0.05), rs.uniform(-0.7, 0.7))
for k in range(4): creak(rs.uniform(pa, pb - 1.2), 0.08, rs.uniform(-0.8, 0.8), 1.4)
click(pa + 0.45, 0.1)
breath(pa + 0.8, 2, 1.2, 0.05)
la, lb = C['o13']                                                              # the flashlight buzzing and dying
d = lb - la; tt = np.arange(int(d * SR)) / SR
add(tone(120, d, 0, ((2, 0.5), (3, 0.3))) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 9 * tt))) * (1 - seg(tt, 0.5 * d, 0.95 * d)), la, 0, 0.018)
click(la + 0.95 * d, 0.07)
pad([65.4, 77.8, 98.0], pa, lb, 0.14, 0.5, 0.3, 0.3)
xa, xb = C['o14'][0], C['o15'][1]                                              # outside: the fish
bed(deep, xa, C['o14'][1] + 0.2, 0.28, 0, 0.1, 0.2)
for k in range(22): d = rs.uniform(0.02, 0.05); add(noise(d, 600, 4000) * np.exp(-np.arange(int(d * SR)) / SR * 80), rs.uniform(xa, C['o14'][1]), rs.uniform(-0.8, 0.8), 0.05)
for k in range(3): add(noise(0.3, 40, 300) * np.exp(-np.arange(int(0.3 * SR)) / SR * 12), xa + 0.2 + k * 0.45, rs.uniform(-0.5, 0.5), 0.12)
pad([61.7, 65.4, 92.5, 98.0], xa, xb, 0.2, 0.2, 0.3, 0.55)                     # dissonant
heart(C['o15'][0] + 0.1, 2, 0.7, 0.24)
ra, rb = C['o16']                                                              # the prayer: a slow, soft chord; slow breathing
pad([110.0, 130.8, 164.8, 196.0], ra, rb + 0.2, 0.16, 0.8, 0.5, 0.15)
breath(ra + 0.2, 3, 1.2, 0.045); heart(ra + 0.4, 4, 0.95, 0.18)

# ---- sixty hours later: the dive ship, a diver in the wreck
da, db = C['o17'][0], C['o20'][0]
whoosh(da, 0.7, 0.16)
bed(waves, da, C['o17'][1], 0.1, 0.1, 0.3, 0.1)
d = C['o17'][1] - da; tt = np.arange(int(d * SR)) / SR
add(np.sin(2 * np.pi * np.cumsum(300 + 60 * tt) / SR) * 0.4 + noise(d, 200, 1200) * 0.3, da, -0.3, 0.05)   # the crane winch
add(noise(0.8, 100, 3000) * np.exp(-np.arange(int(0.8 * SR)) / SR * 5), da + 1.1, 0.2, 0.12)            # the bell hits the water
bed(deep, C['o18'][0], db + 1.5, 0.3, 0, 0.2, 0.2)
regulator(C['o18'][0] + 0.1, 3, 1.3, 0.07)
for k in range(3): knock(C['o18'][0] + 0.3 + k * 0.5, 0.12, 0.3)              # hammering on the hull
pulse(da, db + 0.2, 49, 73.4, 0.15)
pad([49.0, 73.4, 98.0], da, db, 0.15, 0.4, 0.05, 0.4)
add(tone(2637, 2.0) * seg(np.arange(int(2.0 * SR)) / SR, 0, 1.8), C['o19'][0], 0, 0.012)   # a thin rising whine before the grab
ga2 = C['o20'][0] + 0.05                                                       # the hand grabs him back
boom(ga2, 0.8, 52); add(noise(0.4, 300, 6000) * np.exp(-np.arange(int(0.4 * SR)) / SR * 10), ga2, 0, 0.2); bubbles(ga2, 25, 0.6, 0.05)

# ---- he's alive
aa = C['o21'][0]
boom(aa - 0.05, 0.6, 62); whoosh(aa, 0.5, 0.14)
pad([130.8, 164.8, 196.0, 261.6], aa, C['o22'][1], 0.2, 0.3, 0.6, 0.25)
regulator(aa + 0.3, 1, 1.3, 0.05)
ea = C['o22'][0]                                                               # the chamber: air hissing
bed(lambda d, tt: noise(d, 1500, 7000) * 0.5, ea, C['o22'][1], 0.04, 0.3, 0.4, 0.4)
boom(48.85, 0.55, 58)                                                          # "1 of 12"

# ---- the beach, then the diver
ba, bb = C['o24']
whoosh(ba, 0.7, 0.14)
bed(waves, ba, DUR, 0.14, -0.1, 0.5, 1.5)
bed(lambda d, tt: noise(d, 200, 2000) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.3 * tt)), ba, bb + 0.3, 0.05, 0.3, 0.3, 0.4)   # wind
pad([87.3, 103.8, 130.8], ba, bb, 0.14, 0.4, 0.3, 0.25)
za = C['o23'][0]
whoosh(za, 0.8, 0.16)
pad([130.8, 196.0, 261.6, 329.6, 392.0], za, DUR, 0.2, 0.6, 2.0, 0.3)
pulse(za, 54.6, 65.4, 98, 0.16)
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
