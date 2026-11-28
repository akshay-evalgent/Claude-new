"""Build the soundtrack: generated ambient score + sound effects + narration, ducked and mixed.

usage: python sound.py TIMING_JSON OUT.wav
All music and effects are synthesised here; nothing is sampled from the reference video.
"""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly

sys.path.insert(0, os.path.dirname(__file__))
from shots import S

SR = 48000
timing = json.load(open(sys.argv[1])); out = sys.argv[2]
T = timing["total"] + 1.0
N = int(T * SR)
rng = np.random.default_rng(4)

def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, a, b, o=2): return sosfilt(butter(o, [a, b], "band", fs=SR, output="sos"), x)
def tvec(sec): return np.arange(int(sec * SR)) / SR
def add(buf, x, t0, g=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(buf) - i); buf[i:i + n] += g * x[:n]

reverb_ir = rng.standard_normal(int(2.8 * SR)) * np.exp(-np.arange(int(2.8 * SR)) / SR * 2.2)
reverb_ir = lp(reverb_ir, 5000) * 0.03
def verb(x, wet=.5): return x + wet * fftconvolve(x, reverb_ir)[:len(x)]

# ---------------------------------------------------------------- score: slow minor pad + sub drone
def note(f, sec, bright=1.0):
    t = tvec(sec); y = np.zeros_like(t)
    for h, a in ((1, 1), (2, .45 * bright), (3, .22 * bright), (4, .1 * bright), (5, .05 * bright)):
        for det in (-0.12, 0.0, 0.13):
            y += a * np.sin(2 * np.pi * f * h * (1 + det / 100) * t + rng.uniform(0, 6))
    return y

def hz(m): return 440 * 2 ** ((m - 69) / 12)
# D minor family: Dm, Bb, F, C / Dm, Gm, Bb, A
CHORDS = [[50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64],
          [50, 57, 62, 65], [43, 55, 58, 62], [46, 53, 58, 65], [45, 52, 57, 61]]
CH = 8.0
pad = np.zeros(N)
k = 0; t0 = 0.0
while t0 < T:
    seg = CH + 3.0
    env = np.sin(np.pi * np.clip(tvec(seg) / seg, 0, 1)) ** 1.5
    y = sum(note(hz(m), seg, .8) for m in CHORDS[k % len(CHORDS)]) * env
    add(pad, y, t0 - 1.5)
    t0 += CH; k += 1
pad = lp(pad, 1400) * 0.05
t = np.arange(N) / SR
pad *= 0.8 + 0.2 * np.sin(2 * np.pi * t / 11)
drone = (np.sin(2 * np.pi * hz(26) * t) * .6 + np.sin(2 * np.pi * hz(38) * t) * .3) * 0.05
drone = lp(drone + rng.standard_normal(N) * .004, 300)
music = verb(pad + drone, .35)

# section dynamics: music swells on cold open end, title and chapter cards, dips in the middle of chapters
dyn = np.full(N, 0.75)
starts = {s["i"]: (s["start"], s["dur"]) for s in timing["shots"]}
def ramp(a, b, va, vb):
    i, j = int(a * SR), int(b * SR); j = min(j, N)
    if j > i: dyn[i:j] = np.linspace(va, vb, j - i)
for i, sh in enumerate(S):
    st, du = starts[i]
    if sh["scene"] in ("chapter", "title"):
        ramp(st - 2.0, st, .75, 1.35); ramp(st, st + du, 1.35, 1.35); ramp(st + du, st + du + 3, 1.35, .75)
    if sh["scene"] == "end":
        ramp(st - 4, st + du, .75, 0.0)
music *= lp(dyn, 2)

# a soft clock pulse under chapter 2 (the list of problems) for tension
pulse = np.zeros(N)
ch = [starts[i][0] for i, sh in enumerate(S) if sh["scene"] == "chapter"]
click = hp(rng.standard_normal(int(.03 * SR)) * np.exp(-tvec(.03) * 160), 900) * .5
thump = np.sin(2 * np.pi * 55 * tvec(.25)) * np.exp(-tvec(.25) * 18)
tt = ch[1] + 4.0
while tt < ch[2] - 1.0:
    add(pulse, click, tt, .5); add(pulse, thump, tt, .35); tt += 60 / 72
music += lp(pulse, 6000) * .5

# ---------------------------------------------------------------- effects
fx = np.zeros(N)
def boom(g=1.0):
    t = tvec(3.0); f = 32 + 60 * np.exp(-t * 6)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    n = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 5) * .5
    return verb((y + n) * g, .6)
def riser(sec=2.4):
    t = tvec(sec); x = rng.standard_normal(len(t))
    y = np.zeros_like(t); segs = 24
    for q in range(segs):
        a, b = int(q / segs * len(t)), int((q + 1) / segs * len(t))
        fc = 300 + 5000 * (q / segs) ** 2
        y[a:b] = lp(x[a:b], fc)
    y *= (t / sec) ** 2.2
    y += .2 * np.sin(2 * np.pi * np.cumsum(120 + 500 * (t / sec) ** 2) / SR) * (t / sec) ** 2
    return y * .5
def whoosh(sec=.6, g=.25):
    t = tvec(sec); env = np.sin(np.pi * t / sec) ** 2
    return bp(rng.standard_normal(len(t)), 300, 2500) * env * g
def key():
    t = tvec(.025); y = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 300)
    return y * rng.uniform(.5, 1.0)
def typing(t0, text, cps, g=.18):
    for j, chx in enumerate(text):
        if chx != " ": add(fx, key(), t0 + j / cps + rng.uniform(-.008, .008), g)

for i, sh in enumerate(S):
    st, du = starts[i]; sc = sh["scene"]
    if sc == "chapter":
        add(fx, riser(), st - 2.4, .55); add(fx, boom(), st + .05, .55)
        typing(st + .5, sh["text"], 24)
    elif sc == "title":
        add(fx, boom(), st, .6)
    elif sc == "quote":
        typing(st + .3, sh["text"], 9, .28)
    elif sc == "questions":
        pass
    elif sc in ("map", "docs", "headlines") or sh.get("card"):
        add(fx, whoosh(), st - .1, .3)
    elif sc == "stat":
        add(fx, boom(.5), st + .65, .35)
    elif sc == "ring" and sh.get("mode") == "collide":
        add(fx, riser(du * .42), st, .25); add(fx, boom(.8), st + du * .42, .5)
    elif sc == "end":
        pass
    if sh.get("cap"):
        typing(st + .25, sh["cap"], 16, .14)
fx = lp(fx, 9000)

# ---------------------------------------------------------------- narration
vo = np.zeros(N)
for sh in timing["shots"]:
    if not sh["wav"]: continue
    a, sr = sf.read(sh["wav"])
    a = resample_poly(a, SR, sr)
    add(vo, a, sh["start"])
# light broadcast EQ on the voice: trim rumble, a little presence
vo = hp(vo, 80) + .25 * bp(vo, 2500, 5000)

def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
def setdb(x, target, mask=None):
    ref = x[mask] if mask is not None else x
    return x * 10 ** ((target - db(ref)) / 20)

# fixed level targets per stem (dBFS RMS), then a soft limiter; loudness is normalised at mux time
env = lp(np.abs(vo), 3); env = env / (env.max() + 1e-9)
speech = env > 0.04
vo = setdb(vo, -20.0, speech)
music = setdb(music, -30.0)                     # bed at base dynamics; swells reach about -25
duck = lp(1 - 0.6 * np.clip(env * 6, 0, 1), 1.5)  # about -8 dB under the voice
fx_on = np.abs(lp(np.abs(fx), 5)) > 1e-4
fx = setdb(fx, -27.0, fx_on)
mix = vo + music * duck + fx
mix = np.stack([mix, mix], 1)
side = lp(music * duck - np.roll(music * duck, 480), 4000) * .25 + lp(fx - np.roll(fx, 300), 6000) * .2
mix[:, 0] += side; mix[:, 1] -= side
mix = np.tanh(mix * 1.4) / 1.4                  # soft limiter
for name, x in (("voice (speech)", vo[speech]), ("music under voice", (music * duck)[speech]), ("music, no voice", (music * duck)[~speech]), ("fx (active)", fx[fx_on])):
    print(f"{name:20s} {db(x):6.1f} dB")
sf.write(out, mix.astype(np.float32), SR)
print("wrote", out, round(T, 1), "s")
