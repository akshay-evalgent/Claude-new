"""Sound design for the Apple short, synthesised from scratch (no samples): office room tone and arcade
bleeps, typewriter clacks and the carriage bell, pen scratches, paper rustles and page flicks, circuit
boards clattering down, the pie popping up, hooks dropping with a metal clank, empty-pocket dust puffs,
suburban birds and the debt tags slapping on, wind and a deep rumble on the money stage, cash being
counted, the auction murmur, the gavel and applause, a quiet living room with a ticking clock, and a
storytelling music bed with a sad-comic button. Mixed under the narration with ducking.

usage: <venv>/bin/python sound.py   (needs numpy, scipy, soundfile; reads $QS_SCRATCH/vo.wav)
writes $QS_SCRATCH/mix.wav (48 kHz stereo)
"""
import importlib.util, os, sys
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import timeline  # noqa: E402  (loaded first, so the lightning toolkit below shares it)
from timeline import SHOT, SHOTS, END, FPS, f  # noqa: E402

_spec = importlib.util.spec_from_file_location("lsound", os.path.join(HERE, "..", "lightning", "sound.py"))
K = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(K)
sec, noise, pink, brown, filt, sweep_bp, adsr, expdecay, sine, norm, db, fade, Track = (
    K.sec, K.noise, K.pink, K.brown, K.filt, K.sweep_bp, K.adsr, K.expdecay, K.sine, K.norm, K.db, K.fade, K.Track)
SCRATCH = os.environ["QS_SCRATCH"]
SR = K.SR
N = K.N
rng = np.random.default_rng(76)


def shot(name):
    a, b, _ = SHOT[name]
    return a, b


def ft(frame):
    return (frame - 1) / FPS


def F(name, u):
    a, b = f(SHOT[name][0]), f(SHOT[name][1]) - 1
    return ft(a + int(round((b - a) * u)))


# ----------------------------------------------------------------------------- office sounds
def key_clack():
    n = sec(0.09)
    click = filt(noise(0.09), "bp", [2200, 6500]) * expdecay(n, 0.008, 0.0005)
    thunk = sine(rng.uniform(150, 220), 0.09) * expdecay(n, 0.02)
    return norm(click + thunk * 0.6)


def carriage_bell():
    n = sec(1.1)
    return norm((sine(2640, 1.1) + 0.4 * sine(5310, 1.1) + 0.2 * sine(7930, 1.1)) * expdecay(n, 0.25, 0.001))


def pen_scratch(dur):
    n = sec(dur)
    strokes = np.clip(filt(noise(dur), "lp", 9) * 40, 0, 1)
    return norm(filt(noise(dur), "bp", [2000, 5500]) * (0.25 + strokes))


def paper_rustle(dur):
    n = sec(dur)
    crack = K.clicks(dur, 120, [1500, 7000])
    return norm(filt(pink(dur), "hp", 900) * 0.6 * adsr(n, 0.05, dur, 1.0) + crack * 0.8)


def page_flick():
    n = sec(0.12)
    return norm(filt(noise(0.12), "bp", [900, 5000]) * expdecay(n, 0.03, 0.002))


def flutter(dur=0.5):
    n = sec(dur)
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 14 * np.arange(n) / SR)
    return norm(filt(pink(dur), "bp", [600, 4000]) * am * np.sin(np.pi * np.arange(n) / n))


def arcade_beeps(dur, rate=6.0):
    n = sec(dur); x = np.zeros(n)
    notes = [523.3, 659.3, 784.0, 1046.5, 392.0, 880.0]
    t = 0.0
    while t < dur - 0.1:
        d = rng.choice((0.06, 0.09, 0.12)); fq = rng.choice(notes)
        seg = signal.square(2 * np.pi * fq * np.arange(sec(d)) / SR) * adsr(sec(d), 0.002, d * 0.8, 0.0)
        i = sec(t); x[i:i + len(seg)] += seg[: n - i]
        t += 1.0 / rate * rng.uniform(0.6, 1.4)
    return norm(filt(x, "lp", 3500))


def room_tone(dur, hum=0.25):
    n = sec(dur); t = np.arange(n) / SR
    h = sum(np.sin(2 * np.pi * 120 * k * t) / k for k in (1, 2, 3)) * hum
    return norm(filt(pink(dur), "lp", 700) + h * 0.15)


def clank():
    n = sec(1.2)
    x = sum(sine(fq, 1.2) * expdecay(n, tau, 0.0005) for fq, tau in ((420, 0.35), (1130, 0.2), (2370, 0.12), (3790, 0.08)))
    return norm(x + filt(noise(1.2), "hp", 2000) * expdecay(n, 0.02) * 0.6)


def thwack():
    n = sec(0.3)
    return norm(filt(noise(0.3), "lp", 3000) * expdecay(n, 0.025, 0.0008) + sine(90, 0.3) * expdecay(n, 0.06) * 0.8)


def poof():
    n = sec(0.5)
    return norm(filt(noise(0.5), "lp", 900) * adsr(n, 0.01, 0.35, 0.0))


def marker(dur):
    n = sec(dur); t = np.arange(n) / SR
    fq = 1800 + 300 * np.sin(2 * np.pi * 7 * t)
    return norm(np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.3 + filt(noise(dur), "bp", [1500, 4000])) * adsr(n, 0.02, dur, 1.0)


def pop():
    n = sec(0.25)
    return norm(sine(200, 0.25, 620) * expdecay(n, 0.06) + filt(noise(0.25), "bp", [800, 3000]) * expdecay(n, 0.01) * 0.5)


def clatter():
    n = sec(0.15)
    return norm(filt(noise(0.15), "bp", [1500, 6000]) * expdecay(n, 0.02, 0.0005) + sine(rng.uniform(600, 900), 0.15) * expdecay(n, 0.03) * 0.4)


def cloth(dur=0.4):
    n = sec(dur)
    return norm(filt(pink(dur), "bp", [400, 3000]) * np.sin(np.pi * np.arange(n) / n) ** 2)


# ----------------------------------------------------------------------------- outdoor, stage, auction, home
def wind(dur):
    return norm(filt(pink(dur), "lp", 600) * (0.7 + 0.3 * np.clip(filt(noise(dur), "lp", 0.5) * 30, -1, 1)))


def rumble(dur):
    n = sec(dur)
    return norm(filt(brown(dur), "lp", 110) * adsr(n, dur * 0.3, dur, 1.0))


def grind(dur):
    n = sec(dur)
    return norm(filt(brown(dur), "lp", 200) + filt(noise(dur), "bp", [150, 700]) * 0.4 *
                (0.6 + 0.4 * np.abs(filt(noise(dur), "lp", 12)) * 8)) * adsr(n, 0.1, dur, 1.0)


def boom():
    n = sec(2.5)
    return norm(sine(55, 2.5, 38) * expdecay(n, 0.6, 0.004) + filt(brown(2.5), "lp", 200) * expdecay(n, 0.4) * 0.7)


def crowd(dur):
    n = sec(dur)
    syll = 0.6 + 0.4 * np.abs(filt(noise(dur), "lp", 5)) * 6
    return norm(filt(pink(dur), "bp", [250, 2200]) * syll)


def applause(dur):
    n = sec(dur); x = np.zeros(n)
    for i in rng.integers(0, max(1, n - sec(0.03)), int(dur * 260)):
        c = filt(noise(0.03), "bp", [1000, 6000]) * expdecay(sec(0.03), 0.006, 0.0005) * rng.uniform(0.3, 1.0)
        x[i:i + len(c)] += c
    return norm(x * adsr(n, 0.3, dur, 1.0))


def gavel():
    n = sec(0.6)
    return norm(filt(noise(0.6), "bp", [500, 2500]) * expdecay(n, 0.02, 0.0005) + sine(240, 0.6) * expdecay(n, 0.06) * 0.8 +
                sine(120, 0.6) * expdecay(n, 0.09) * 0.5)


def tick(period=1.0, dur=4.0):
    n = sec(dur); x = np.zeros(n)
    for k, t in enumerate(np.arange(0, dur, period / 2)):
        c = filt(noise(0.02), "bp", [2500, 6000] if k % 2 else [1800, 4500]) * expdecay(sec(0.02), 0.004)
        i = sec(t); x[i:i + len(c)] += c[: n - i]
    return norm(x)


def sigh():
    n = sec(1.0)
    return norm(filt(noise(1.0), "bp", [400, 1500]) * adsr(n, 0.15, 0.9, 0.0))


def pluck(fq, dur=0.7):
    n = sec(dur)
    x = signal.sawtooth(2 * np.pi * fq * np.arange(n) / SR) * expdecay(n, 0.14)
    return norm(filt(x, "lp", 2400))


def muted_horn(fq0, fq1, dur):
    """A soft muted-brass slide (the sad 'wah' of the punchline)."""
    n = sec(dur); t = np.arange(n) / SR
    fq = fq0 + (fq1 - fq0) * (t / dur) ** 1.5
    ph = 2 * np.pi * np.cumsum(fq * (1 + 0.006 * np.sin(2 * np.pi * 5.5 * t))) / SR
    x = signal.sawtooth(ph) * adsr(n, 0.04, dur * 0.85, 0.0)
    return norm(filt(x, "lp", 900))


# ----------------------------------------------------------------------------- the mix
def build():
    vo, vsr = sf.read(os.path.join(SCRATCH, "vo.wav"))
    if vo.ndim > 1:
        vo = vo.mean(1)
    if vsr != SR:
        vo = signal.resample_poly(vo, SR, vsr)
    vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    amb, sfx, mus = Track(), Track(), Track()
    D = END + 0.3

    office_tone = room_tone(D)[:N]
    beeps = arcade_beeps(D)[:N]
    birds = np.zeros(N)
    t = 0.2
    while t < D - 0.5:
        b = K.bird(); i = sec(t); birds[i:i + len(b)] += b[: N - i] * rng.uniform(0.4, 1.0); t += rng.uniform(0.3, 0.9)
    outdoor = norm(wind(D)[:N] * 0.5 + birds)
    stage_wind = wind(D)[:N]
    shop_tone = room_tone(D, 0.05)[:N]
    hall = norm(crowd(D)[:N] * 0.8 + room_tone(D, 0.0)[:N] * 0.4)
    home = norm(room_tone(D, 0.0)[:N] * 0.5 + filt(wind(D), "lp", 300)[:N] * 0.4)
    for name, t0, t1, st in SHOTS:
        i0, i1 = sec(t0), min(N, sec(t1))
        src = {"office": office_tone + (beeps * 0.5 if name in ("atari", "steves", "adult") else 0),
               "house": outdoor, "stage": stage_wind, "shop": shop_tone, "auction": hall, "nevada": home}[st]
        seg = fade(src[i0:i1], 0.015, 0.015)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg

    # whooshes into a new set
    prev = None
    for name, t0, t1, st in SHOTS:
        if prev is not None and st != prev:
            sfx.add(t0 - 0.22, K.whoosh(0.45), -15, rng.uniform(-0.4, 0.4))
        prev = st

    # 1976: the contract, the circle, the $800
    sfx.add(0.15, paper_rustle(0.6), -20)
    a, b = shot("contract10")
    sfx.add(a + 6 / FPS, marker(0.65), -22)
    a, b = shot("sold800")
    sfx.add(a + 0.05, paper_rustle(0.35), -18)
    for k in range(4):
        sfx.add(a + 0.15 + k * 0.07, page_flick(), -24, 0.2)
    # the Steves: hello
    a, b = shot("steves")
    sfx.add(a + 0.1, cloth(0.5), -24)
    # the pie pops up, slices slide
    a, b = shot("split45")
    sfx.add(a + 2 / FPS, pop(), -12)
    sfx.add(a + 30 / FPS, K.whoosh(0.3, 600, 2000, 800), -20, -0.4); sfx.add(a + 34 / FPS, K.whoosh(0.3, 600, 2000, 800), -20, 0.4)
    a, b = shot("split10")
    sfx.add(a + 10 / FPS, K.whoosh(0.35, 500, 1800, 700), -18)
    # typewriter
    a, b = shot("typewriter")
    tt = a + 0.03
    while tt < b - 0.05:
        sfx.add(tt, key_clack(), -14, rng.uniform(-0.2, 0.2)); tt += rng.uniform(0.07, 0.13)
    sfx.add(b - 0.25, carriage_bell(), -20)
    # the sketch, the credit signature
    a, b = shot("sketch")
    sfx.add(a + 0.05, pen_scratch(b - a - 0.1), -17)
    a, b = shot("boards")
    for k in range(16):
        sfx.add(a + (2 + k * 2) / FPS, clatter(), -20, rng.uniform(-0.3, 0.3))
    a, b = shot("credit")
    sfx.add(a + 6 / FPS, pen_scratch(b - a - 12 / FPS), -16)
    # on the hook
    a, b = shot("hook")
    sfx.add(a + 0.1, K.whoosh(0.5, 200, 900, 300), -18)
    for k, d in enumerate((14, 24, 34)):
        sfx.add(a + (d - 6) / FPS, K.whoosh(0.3, 400, 1600, 600), -20, (k - 1) * 0.5)
        sfx.add(a + d / FPS, clank(), -11, (k - 1) * 0.5)
        sfx.add(a + d / FPS, thwack(), -16, (k - 1) * 0.5)
    # empty pockets
    a, b = shot("pockets")
    sfx.add(a + 10 / FPS, cloth(0.4), -16, -0.3); sfx.add(a + 11 / FPS, cloth(0.4), -16, 0.3)
    sfx.add(a + 18 / FPS, poof(), -18, -0.3); sfx.add(a + 19 / FPS, poof(), -18, 0.3)
    # Wayne did: the tags slap on
    a, b = shot("house")
    for k in range(3):
        sfx.add(a + (2 + k * 6 + 2) / FPS, thwack(), -10, (k - 1) * 0.6)
    # twelve days later
    a, b = shot("calendar")
    for k in range(11):
        sfx.add(a + (3 + k * 2.3 + 1) / FPS, page_flick(), -16, rng.uniform(-0.2, 0.2))
    a, b = shot("strike")
    sfx.add(a + 4 / FPS, pen_scratch(b - a - 8 / FPS), -13)
    a, b = shot("cash800")
    for k in range(8):
        sfx.add(a + (3 + k * 3 - 2) / FPS, flutter(0.3), -21, rng.uniform(-0.3, 0.3))
    a, b = shot("check")
    sfx.add(a + 0.05, filt(pink(0.6), "bp", [800, 4000]) * adsr(sec(0.6), 0.05, 0.5, 0.0), -18)
    a, b = shot("signoff")
    sfx.add(a, pen_scratch(16 / FPS), -16)
    sfx.add(a + 0.9, cloth(0.6), -20)
    sfx.add(a + 0.95, sigh(), -20)
    # the money stage
    a, b = shot("trillion")
    sfx.add(a, rumble(b - a + 0.4), -10)
    sfx.add(a + 0.1, K.whoosh(1.6, 150, 800, 300), -16)
    a, b = shot("slab")
    sfx.add(a + 4 / FPS, grind(30 / FPS + 0.4), -8)
    sfx.add(a + 34 / FPS, boom(), -8)
    # the copy he kept, sold for $500
    a, b = shot("drawer")
    sfx.add(a + 0.05, paper_rustle(0.5), -18)
    sfx.add(a + 8 / FPS, filt(pink(0.3), "bp", [300, 2000]) * adsr(sec(0.3), 0.02, 0.25, 0.0), -18)
    a, b = shot("sold500")
    sfx.add(a + 0.1, filt(pink(0.8), "bp", [600, 3500]) * adsr(sec(0.8), 0.05, 0.7, 0.0), -18)
    for k in range(5):
        sfx.add(a + (18 + k * 5 - 1) / FPS, page_flick(), -14)
    # the auction
    a, b = shot("auction")
    for k, d in enumerate((2, 9, 16, 25, 30, 36)):
        sfx.add(a + d / FPS, cloth(0.25), -24, rng.uniform(-0.6, 0.6))
    a, b = shot("gavel")
    sfx.add(a + 9 / FPS, gavel(), -4)
    sfx.add(a + 14 / FPS, applause(b - a + 0.6), -14)
    # Nevada: the clock, the newspaper, the beat
    a, _ = shot("armchair"); _, b = shot("stare")
    sfx.add(a, tick(1.0, b - a + 0.3), -27, 0.3)
    a, b = shot("newspaper")
    sfx.add(a + 0.05, paper_rustle(0.7), -16)
    sfx.add(b - 0.2, paper_rustle(0.8), -15)
    a, b = shot("stare")
    sfx.add(a + 0.3, sigh(), -17)

    # music: curious plucked storytelling bed, darker under the debt, a swell on the money, a sad-comic button
    def pad(t0, t1, freqs, cutoff, g):
        mus.add(t0, K.pad(t1 - t0, freqs, cutoff), g)

    def arp(t0, t1, notes, step, g):
        t, k = t0, 0
        while t < t1 - 0.1:
            mus.add(t, pluck(notes[k % len(notes)], 0.5), g, (k % 3 - 1) * 0.35); t += step; k += 1
    debt0 = SHOT["hook"][0]; cal0 = SHOT["calendar"][0]; stage0 = SHOT["trillion"][0]
    kept0 = SHOT["drawer"][0]; home0 = SHOT["armchair"][0]
    pad(0.0, debt0, [130.8, 196.0, 261.6, 329.6], 900, -27)
    arp(0.3, debt0 - 0.2, [523.3, 659.3, 784.0, 659.3, 587.3, 784.0, 880.0, 784.0], 0.25, -27)
    pad(debt0, cal0, [110.0, 164.8, 220.0, 261.6], 500, -25)
    arp(debt0 + 0.1, cal0 - 0.1, [220.0, 220.0, 207.7, 196.0], 0.5, -25)
    pad(cal0, stage0, [146.8, 220.0, 293.7, 349.2], 600, -26)
    pad(stage0, kept0, [65.4, 98.0, 130.8, 196.0, 261.6, 329.6], 1800, -22)
    pad(kept0, home0, [174.6, 261.6, 349.2, 440.0], 900, -27)
    arp(kept0 + 0.2, home0 - 0.2, [698.5, 880.0, 1046.5, 880.0], 0.3, -29)
    pad(home0, END, [130.8, 196.0, 246.9, 329.6], 700, -28)
    # the punchline: "Just selling that piece of paper." -> a muted-horn wah-wah
    a, _ = shot("stare")
    for k, (f0, f1, d) in enumerate(((392.0, 370.0, 0.32), (370.0, 349.2, 0.32), (349.2, 329.6, 0.32), (329.6, 277.2, 0.85))):
        mus.add(a + 0.1 + k * 0.36, muted_horn(f0, f1, d), -17)

    env = filt(np.abs(vo), "lp", 6)
    env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
    duck = db(-7) ** env
    sduck = db(-4) ** env
    L = vo * db(-1) + (amb.L * db(-26) + mus.L) * duck + sfx.L * sduck
    R = vo * db(-1) + (amb.R * db(-26) + mus.R) * duck + sfx.R * sduck
    st = np.stack([L, R], 1)
    st = st / max(1.0, np.abs(st).max() / 0.97)
    sf.write(os.path.join(SCRATCH, "mix.wav"), st.astype(np.float32), SR)
    print("wrote mix.wav", round(N / SR, 2), "s")


if __name__ == "__main__":
    build()
