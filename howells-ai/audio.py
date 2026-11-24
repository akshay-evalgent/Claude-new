"""Sound for The Billion-Dollar Hard Drive: narration over a synthesized bed (the landfill and its seagulls, a bedroom in 2009, coins,
the bin bag and the rubbish truck, the council's "no", robot dogs, the chart climbing, the court, the bulldozers, a simple score)."""
import numpy as np, wave, os
HERE = os.path.dirname(os.path.abspath(__file__))
SR, FPS = 48000, 24
END = 61.5
SLOTS = [('h01', 1.9), ('h02', 1.3), ('h22', 2.5), ('h03', 1.5), ('h04', 3.1), ('h05', 2.6), ('CHART0', 2.2), ('h06', 3.1), ('h07', 3.3), ('h08', 2.4),
         ('h09', 1.6), ('h10', 2.2), ('h11', 2.1), ('h12', 2.2), ('h13', 1.3), ('h14', 2.3), ('h15', 4.1), ('CHART1', 2.4), ('h16', 3.1), ('h17', 1.6),
         ('h23', 2.3), ('h18', 2.6), ('h19', 2.2), ('h20', 2.3), ('h21', 0)]
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

def heart(a, n, gap=0.78, g=0.28):
    for k in range(n): at = a + k * gap; add(tone(52, 0.25, 16), at, 0, g); add(tone(48, 0.25, 18), at + 0.2, 0, g * 0.72)


def gull(at, gain=0.05, pan=0.0):                                            # a seagull: "kee-ow"
    d = rs.uniform(0.28, 0.42); tt = np.arange(int(d * SR)) / SR; f0 = rs.uniform(1500, 1900)
    f = f0 * (1 - 0.35 * tt / d) * (1 + 0.04 * np.sin(2 * np.pi * 28 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.25 * np.sin(3 * ph) + 0.3 * noise(d, 1500, 5000)
    add(x * np.sin(np.pi * tt / d) ** 1.5, at, pan, gain)

def gulls(a, b, n, gain=0.05):
    for k in range(n): gull(rs.uniform(a, b), gain * rs.uniform(0.5, 1.0), rs.uniform(-0.8, 0.8))

def rustle(at, dur, gain=0.12, pan=0.0):                                     # a plastic bin bag being handled
    tt = np.arange(int(dur * SR)) / SR
    add(noise(dur, 1800, 9000) * np.abs(noise(dur, 6, 40)) ** 3 * 3 * np.minimum(1, np.minimum(tt / 0.05, (dur - tt) / 0.1)), at, pan, gain)

def clink(at, gain=0.05, pan=0.0, f=None):                                   # a coin or small bit of metal
    f = f or rs.uniform(2300, 3800); d = 0.5; tt = np.arange(int(d * SR)) / SR
    x = sum(g * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * dk) for m, g, dk in ((1, 1, 9), (2.76, 0.6, 14), (5.4, 0.35, 22), (8.93, 0.2, 30)))
    add(x * seg(tt, 0, 0.002), at, pan, gain)

def typing(a, b, gain=0.05):
    at = a
    while at < b:
        tt = np.arange(int(0.03 * SR)) / SR; add(noise(0.03, 1500, 7000) * np.exp(-tt * 160) + 0.4 * np.sin(2 * np.pi * 180 * tt) * np.exp(-tt * 90), at, rs.uniform(-0.2, 0.2), gain * rs.uniform(0.6, 1))
        at += rs.uniform(0.06, 0.17)

def drawer(at, gain=0.14, shut=True):                                        # a wooden drawer sliding, then the knock
    d = 0.45; tt = np.arange(int(d * SR)) / SR
    add(noise(d, 150, 1800) * (0.4 + 0.6 * np.abs(noise(d, 10, 60))) * np.sin(np.pi * tt / d), at, 0.1, gain)
    if shut: tt = np.arange(int(0.3 * SR)) / SR; add((np.sin(2 * np.pi * 110 * tt) + noise(0.3, 80, 1200) * 0.6) * np.exp(-tt * 22), at + d - 0.03, 0.1, gain * 1.4)

def beeper(a, b, gain=0.025, pan=0.4):                                       # a reversing truck
    for k in range(int((b - a) / 0.9)): add(tone(1040, 0.45) * seg(np.arange(int(0.45 * SR)) / SR, 0, 0.01), a + k * 0.9, pan, gain)

def diesel(dur, tt): return (np.sin(2 * np.pi * 48 * tt) + 0.5 * np.sin(2 * np.pi * 96.3 * tt) + 0.25 * np.sin(2 * np.pi * 144 * tt)) * (0.8 + 0.2 * np.sin(2 * np.pi * 8 * tt)) * 0.5 + noise(dur, 60, 400) * 0.4

def servo(at, dur=0.45, gain=0.04, pan=0.0):                                 # a robot joint
    tt = np.arange(int(dur * SR)) / SR; f = 700 + 500 * np.sin(np.pi * tt / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR; add((np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)) * np.sin(np.pi * tt / dur) ** 2, at, pan, gain)

def buzz(dur, tt): return (np.sin(2 * np.pi * 182 * tt) + 0.6 * np.sin(2 * np.pi * 364 * tt) + 0.3 * np.sin(2 * np.pi * 547 * tt)) * (0.7 + 0.3 * np.sin(2 * np.pi * 23 * tt)) + noise(dur, 800, 4000) * 0.3

def ping(at, gain=0.06):                                                      # a phone notification
    for k, f in enumerate((1318.5, 1760.0)): add(tone(f, 0.35, 10, ((2, 0.2),)), at + k * 0.09, 0, gain)

def tick(at, gain=0.03, f=1800): add(tone(f, 0.03, 120), at, 0, gain)

def bell(at, gain=0.09):                                                      # cha-ching
    add(noise(0.12, 2000, 8000) * np.exp(-np.arange(int(0.12 * SR)) / SR * 40), at, 0, gain * 0.8)
    for k, f in enumerate((2093.0, 2637.0, 3136.0)): add(tone(f, 1.6, 2.5 + k, ((2.4, 0.2),)), at + 0.07 + 0.02 * k, 0.3 * (k - 1), gain / 2)

def stamp(at, gain=0.5):                                                      # a rubber stamp slammed down
    boom(at, gain, 58); add(noise(0.25, 200, 4000) * np.exp(-np.arange(int(0.25 * SR)) / SR * 30), at, 0, gain * 0.5)

def riser(a, b, gain=0.08, f0=180, f1=1100):
    d = b - a; tt = np.arange(int(d * SR)) / SR; k = tt / d
    add((np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** (k ** 2)) / SR) * 0.6 + noise(d, 500, 6000) * 0.5) * k ** 2, a, 0, gain)

def womp(at, gain=0.12):                                                      # the comic deflating note
    d = 0.9; tt = np.arange(int(d * SR)) / SR; f = 330 * (0.5 ** (tt / d)) * (1 + 0.03 * np.sin(2 * np.pi * 6 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR; add((np.sin(ph) + 0.4 * np.sin(2 * ph)) * np.sin(np.pi * tt / d) ** 0.7, at, 0, gain)

def room(dur, tt): return noise(dur, 40, 500) * 0.6
def wind(dur, tt): return noise(dur, 150, 1800) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.27 * tt) * np.sin(2 * np.pi * 0.11 * tt + 1))
def murmur(dur, tt): return noise(dur, 250, 1100) * (0.6 + 0.4 * np.abs(noise(dur, 1, 6)))
def deep(dur, tt): return noise(dur, 18, 220) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.13 * tt)) + 0.25 * np.sin(2 * np.pi * 41 * tt)

beat = 60 / 104
def pulse(a, b, lo=55, hi=82.4, g=0.16):
    for k in range(int((b - a) / beat)): at = a + k * beat; add(tone(lo if k % 4 == 0 else hi, 0.3, 14, ((2, 0.3),)), at, 0, g if k % 4 == 0 else g * 0.45)

def pluck(f, at, gain=0.03, pan=0.0):
    tt = np.arange(int(0.9 * SR)) / SR; add((np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(4 * np.pi * f * tt)) * np.exp(-tt * 5) * seg(tt, 0, 0.004), at, pan, gain)

# ---- hook: the landfill, the drive falling into the bag, a billion dollars
bed(wind, 0, C['h22'][1], 0.08, 0, 0.05, 0.3); bed(lambda d, tt: diesel(d, tt) * 0.5, 0, C['h02'][0] + 0.2, 0.05, 0.6, 0.05, 0.2)
gulls(0.1, 1.8, 4, 0.05)
boom(0.02, 0.4, 60)
pad([55.0, 65.4, 82.4], 0, C['h22'][0] + 0.3, 0.16, 0.05, 0.3, 0.45)
whoosh(C['h02'][0], 0.6, 0.15)
ta = C['h02'][0] + 0.85; rustle(ta - 0.1, 0.5, 0.16); add(noise(0.2, 60, 900) * np.exp(-np.arange(int(0.2 * SR)) / SR * 25), ta, 0, 0.18)   # it lands in the bag
ba = 3.35; boom(ba, 0.7, 52)
for k in range(26): tick(ba + 1.0 * (k / 26) ** 0.6, 0.035, 1500 + 40 * k)                                  # the number rolling up
bell(ba + 1.02, 0.11)
pad([110.0, 138.6, 164.8, 220.0], ba, C['h22'][1] + 0.2, 0.18, 0.1, 0.4, 0.35)
add(tone(2637, 2.0, 1.2) * seg(np.arange(int(2.0 * SR)) / SR, 0, 0.3), ba + 0.2, 0, 0.012)                 # a glint

# ---- 2009: a wet street in Wales, a bedroom, the laptop mining, the coins
wa = C['h03'][0]
whoosh(wa, 0.6, 0.12)
bed(lambda d, tt: noise(d, 2000, 9000) * 0.6 + noise(d, 400, 2000) * 0.3, wa, C['h03'][1] + 0.3, 0.08, -0.2, 0.3, 0.3)   # rain
add(noise(1.4, 80, 1500) * np.sin(np.pi * np.arange(int(1.4 * SR)) / SR / 1.4), wa + 0.1, -0.5, 0.06)                    # a car passes
for k, f in enumerate((220.0, 261.6, 329.6, 392.0, 329.6, 261.6) * 4):                                                   # a little arpeggio
    pluck(f, wa + 0.05 + k * beat / 2, 0.022, 0.3 * np.sin(k))
ra = C['h04'][0]
bed(room, ra, C['h05'][1], 0.05, 0, 0.2, 0.2); bed(lambda d, tt: noise(d, 300, 2200) * 0.5 + 0.3 * np.sin(2 * np.pi * 120 * tt), ra, C['h05'][1], 0.025, 0.2, 0.3, 0.3)   # the laptop fan
typing(ra + 0.2, C['h04'][1] - 0.2, 0.05)
pad([110.0, 130.8, 164.8], wa, C['h05'][1], 0.09, 0.4, 0.3, 0.3)
ca, cb = C['h05']
for k in range(60): clink(ca + 0.15 + (cb - ca - 0.3) * (k / 60) ** 0.8 + rs.uniform(0, 0.05), 0.03 * rs.uniform(0.5, 1), rs.uniform(-0.6, 0.6))
add(tone(1760, cb - ca, 0, ((1.5, 0.3), (2, 0.2))) * win(ca, cb, 0.5, 0.4)[int(ca * SR):int(ca * SR) + int((cb - ca) * SR)], ca, 0, 0.008)

# ---- the chart, flat: "worth almost nothing"
ga, gb = C['CHART0']
whoosh(ga, 0.5, 0.12)
for k in range(10): tick(ga + 0.25 + k * 0.1, 0.025, 1200)
womp(ga + 1.33, 0.12)                                                         # $6

# ---- the hard drive goes into a drawer
da, db = C['h06']
bed(room, da, db, 0.05, 0, 0.2, 0.2)
drawer(da + 0.15, 0.12, shut=False); clink(da + 1.0, 0.05, 0.1, 900); drawer(da + 1.9, 0.12)
pad([98.0, 123.5, 146.8], da, db, 0.1, 0.3, 0.4, 0.2)
for k in range(5): tick(da + 0.3 + k * 0.6, 0.02, 900)                       # a clock

# ---- 2013: clearing out, the bags on the pavement, the rubbish truck at the dump
ea, eb = C['h07']
whoosh(ea, 0.6, 0.12)
for k in range(5): rustle(ea + 0.2 + k * 0.62, 0.45, 0.12, rs.uniform(-0.4, 0.4))
for k in range(4): clink(ea + 0.4 + k * 0.7, 0.04, rs.uniform(-0.5, 0.5), rs.uniform(600, 1200))
pa, pb = C['h08']
bed(lambda d, tt: noise(d, 2000, 9000) * 0.5, pa, pb, 0.04, 0, 0.2, 0.2)
rustle(pa + 0.5, 0.6, 0.06, 0.3)
add(noise(1.6, 80, 1500) * np.sin(np.pi * np.arange(int(1.6 * SR)) / SR / 1.6), pa + 0.6, 0.5, 0.06)
pad([87.3, 103.8, 130.8], ea, pb, 0.1, 0.3, 0.2, 0.25)
ua, ub = C['h09']
bed(diesel, ua, ub + 0.3, 0.1, 0.2, 0.1, 0.3)
add(noise(1.4, 50, 3000) * seg(np.arange(int(1.4 * SR)) / SR, 0, 0.3) * np.exp(-np.arange(int(1.4 * SR)) / SR * 1.5), ua + 0.2, 0, 0.2)   # the load pours out
beeper(ua, ub, 0.02); gulls(ua, ub, 5, 0.05)
boom(ua + 0.25, 0.3, 50)

# ---- bitcoin explodes, he realises, the empty drawer
xa = C['h10'][0]
ping(xa + 0.1, 0.07); riser(xa + 0.15, 26.6, 0.07)
boom(26.6, 0.7, 48); whoosh(26.6, 0.4, 0.14)
pad([58.3, 61.7, 87.3], xa, C['h11'][1], 0.2, 0.2, 0.2, 0.55)
ya, yb = C['h11']
drawer(ya + 0.05, 0.14, shut=False)
for k in range(8): clink(ya + 0.3 + k * 0.2 + rs.uniform(0, 0.05), 0.05, rs.uniform(-0.6, 0.6), rs.uniform(500, 1500))
heart(ya, 5, 0.42, 0.26)

# ---- the council: please let me dig. No.
oa, ob = C['h12']
bed(room, oa, ob, 0.06, 0, 0.1, 0.1); bed(murmur, oa, ob, 0.03, 0.4, 0.3, 0.2)
for k in range(5): tick(oa + 0.2 + k * 0.45, 0.025, 1100)
pad([65.4, 77.8, 98.0], oa, ob, 0.12, 0.2, 0.05, 0.3)
stamp(32.05, 0.65)                                                           # NO.
na, nb = C['h13']
bed(lambda d, tt: noise(d, 2000, 9000) * 0.6, na, nb, 0.06, 0, 0.05, 0.2)
add(noise(0.5, 1500, 6000) * np.abs(noise(0.5, 20, 80)) * np.exp(-np.arange(int(0.5 * SR)) / SR * 6), na + 0.35, -0.3, 0.12)   # the fence rattles
gulls(na, nb, 2, 0.04)

# ---- investors, AI scanners, robot dogs. Still no.
ia, ib = C['h14'][0], C['h15'][1]
whoosh(ia, 0.6, 0.14)
pulse(ia, 39.05, 55, 82.4, 0.15)
pad([110.0, 138.6, 164.8], ia, 39.05, 0.14, 0.4, 0.05, 0.3)
bed(lambda d, tt: (np.sin(2 * np.pi * 220 * tt) + 0.5 * np.sin(2 * np.pi * 331 * tt)) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * tt)), ia, C['h14'][1], 0.012, 0, 0.3, 0.2)   # the hologram hum
ra2 = C['h15'][0]
bed(buzz, ra2, 39.05, 0.025, 0.5, 0.3, 0.05)
for k in range(7): servo(ra2 + 0.2 + k * 0.5 + rs.uniform(0, 0.1), 0.35, 0.035, rs.uniform(-0.6, 0.6))
for k in range(10): step(ra2 + 0.1 + k * 0.3, 0.05, rs.uniform(-0.4, 0.4), soft=False)
for k in range(6): add(tone(2000, 0.07, 30), ra2 + 0.4 + k * 0.55, 0.2, 0.02)          # scan beeps
gulls(ra2, 38.8, 3, 0.04)
stamp(39.05, 0.6)                                                           # STILL NO.

# ---- the price kept climbing
ka, kb = C['CHART1']
riser(ka, ka + 1.95, 0.1, 150, 1400)
for k in range(30): tick(ka + 0.1 + 1.85 * (k / 30) ** 0.7, 0.03, 1200 + 30 * k)
boom(ka + 1.98, 0.75, 50); bell(ka + 2.0, 0.12)
pulse(ka, kb, 55, 82.4, 0.17)
pad([110.0, 138.6, 164.8, 220.0], ka, kb + 0.2, 0.18, 0.2, 0.3, 0.35)

# ---- court: the claim, dismissed, the steps in the rain
qa, qb = C['h16']
whoosh(qa, 0.5, 0.12)
bed(room, qa, qb, 0.07, 0, 0.1, 0.1); bed(murmur, qa, qb - 0.6, 0.02, -0.3, 0.3, 0.4)
rustle(qa + 0.6, 0.3, 0.04); heart(qa + 0.3, 4, 0.75, 0.2)
pad([58.3, 69.3, 87.3], qa, 45.3, 0.16, 0.3, 0.05, 0.45)
stamp(45.3, 0.75)                                                           # DISMISSED
sa, sb = C['h17']
bed(lambda d, tt: noise(d, 2000, 9000) * 0.6 + noise(d, 300, 1500) * 0.3, sa, sb + 0.2, 0.09, 0, 0.1, 0.3)
for k in range(4): step(sa + 0.2 + k * 0.38, 0.12, -0.1 + 0.07 * k, soft=False)

# ---- he offers to buy the dump; it closes for good
va, vb = C['h23']
whoosh(va, 0.5, 0.1)
bed(wind, va, vb + 0.3, 0.05, 0, 0.3, 0.3); gulls(va, vb, 2, 0.035)
pad([130.8, 164.8, 196.0], va, vb, 0.12, 0.3, 0.3, 0.25)
la, lb = C['h18']
bed(diesel, la, lb + 0.2, 0.12, -0.2, 0.3, 0.3); bed(lambda d, tt: diesel(d, tt * 1.13), la, lb, 0.06, 0.5, 0.3, 0.3)
beeper(la + 0.2, lb, 0.02, -0.5); gulls(la, lb, 3, 0.04)
for k in range(2): add(noise(0.8, 30, 600) * np.exp(-np.arange(int(0.8 * SR)) / SR * 4), la + 0.6 + k * 1.0, 0, 0.14)   # earth dumped
pad([87.3, 103.8, 130.8], la, lb, 0.13, 0.3, 0.3, 0.3)

# ---- after twelve years, he gave up; it is still down there
fa, fb = C['h19']
whoosh(fa, 0.6, 0.1)
bed(wind, fa, fb + 0.3, 0.07, 0, 0.4, 0.4); gulls(fa, fb, 1, 0.02)
pad([110.0, 130.8, 164.8], fa, fb + 0.4, 0.15, 0.5, 0.5, 0.15)
for k, f in enumerate((329.6, 261.6, 220.0, 196.0)): pluck(f, fa + 0.3 + k * 0.5, 0.03)
za, zb = C['h20']
bed(deep, za, zb + 0.3, 0.3, 0, 0.3, 0.3)
add(tone(2637, 1.6, 1.4) * seg(np.arange(int(1.6 * SR)) / SR, 0, 0.5), za + 1.0, 0, 0.014)                 # the glint
heart(za + 0.2, 3, 0.8, 0.2)
pad([55.0, 65.4, 82.4], za, zb, 0.15, 0.3, 0.2, 0.4)

# ---- would you have kept digging?
ea2 = C['h21'][0]
whoosh(ea2, 0.6, 0.12)
pad([110.0, 164.8, 220.0, 261.6, 329.6], ea2, DUR, 0.18, 0.5, 2.2, 0.3)
pulse(ea2, 57.7, 55, 82.4, 0.15)
boom(57.7, 0.5, 60)
bed(wind, ea2, DUR, 0.04, 0, 0.5, 1.5)

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
