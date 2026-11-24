"""Sound design for the flood short, synthesised from scratch (no samples): rain outside and drumming on
the roof inside the car, rushing floodwater (muffled in the cutaways), splashes and bow-wave spray,
engine and wipers, the engine sputtering out with a dash chime, metal creaks and groans as the car
floats, the current slamming into the door, the washed-out road crumbling, hazard-light ticks, wading
steps, evening river, birds and ducks, whooshes on cuts and a music bed. Mixed under the narration.

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
rng = np.random.default_rng(31)


def shot(name):
    a, b, _ = SHOT[name]
    return a, b


def ft(frame):
    return (frame - 1) / FPS


# ----------------------------------------------------------------------------- water sounds
def bubbles(dur, rate=40, lo=300, hi=1400):
    n = sec(dur); x = np.zeros(n)
    for i in rng.integers(0, max(1, n - sec(0.06)), int(dur * rate)):
        d = rng.uniform(0.02, 0.06); f0 = rng.uniform(lo, hi)
        b = sine(f0, d, f0 * rng.uniform(1.3, 2.0)) * expdecay(sec(d), d / 3, 0.002)
        x[i:i + len(b)] += b * rng.uniform(0.2, 1.0)
    return x


def rushing(dur, power=1.0):
    """Floodwater tearing past: roar, hiss, gurgle and bubbles with slow surges."""
    roar = filt(brown(dur), "lp", 400) * 1.2
    body = filt(pink(dur), "bp", [250, 2500]) * 0.8
    hiss = filt(pink(dur), "hp", 2500) * 0.35
    surge = 0.75 + 0.25 * np.clip(filt(noise(dur), "lp", 0.7) * 35, -1, 1)
    return norm((roar + body * power + hiss) * surge + filt(bubbles(dur, 30), "bp", [200, 2000]) * 0.5)


def calm_river(dur):
    x = filt(pink(dur), "bp", [200, 1500]) * 0.5 + filt(bubbles(dur, 10, 400, 1200), "bp", [300, 1800]) * 0.8
    return norm(x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * np.arange(sec(dur)) / SR)))


def splash(dur=0.9, size=1.0):
    n = sec(dur)
    hit = filt(noise(dur), "lp", 3500) * expdecay(n, 0.09 * size, 0.004)
    body = sweep_bp(noise(dur), 2500, 400, q=1.5) * expdecay(n, 0.25 * size)
    drops = filt(bubbles(dur, 90, 600, 2600), "hp", 400) * np.exp(-np.arange(n) / SR / (0.35 * size))
    return norm(hit * 1.2 + body + drops * 0.6)


def slosh(dur=0.45):
    n = sec(dur)
    x = sweep_bp(pink(dur), 300, 1200, q=1.6) * np.sin(np.pi * np.arange(n) / n) ** 1.5
    return norm(x + filt(bubbles(dur, 30, 300, 900), "bp", [250, 1500]) * 0.5)


def spray_hiss(dur):
    n = sec(dur)
    return norm(filt(pink(dur), "hp", 1800) * (0.6 + 0.4 * np.abs(filt(noise(dur), "lp", 6)) * 5) * adsr(n, 0.05, dur, 1.0))


def slam(dur=1.2):
    n = sec(dur)
    thud = sine(55, dur, 38) * expdecay(n, 0.18, 0.004)
    wash = filt(noise(dur), "lp", 1800) * expdecay(n, 0.3, 0.01)
    return norm(thud * 1.3 + wash + splash(dur, 1.2) * 0.6)


def gurgle_rise(dur):
    n = sec(dur)
    return norm(filt(bubbles(dur, 60, 250, 900), "bp", [200, 1400]) * np.linspace(0.4, 1, n) + filt(pink(dur), "lp", 700) * 0.3)


def underwater(x):
    return filt(x, "lp", 500) * 1.4


# ----------------------------------------------------------------------------- car sounds
def engine(dur, rpm=1.0):
    n = sec(dur); t = np.arange(n) / SR
    fq = 34 * rpm
    hum = sum(np.sin(2 * np.pi * fq * h * t + rng.uniform(0, 6)) / h for h in (1, 2, 3, 4)) * 0.4
    return norm(hum + filt(pink(dur), "bp", [300, 2500]) * 0.5)


def sputter(dur=1.2):
    """Engine coughing out: firing pulses that stumble, slow and stop."""
    n = sec(dur); x = np.zeros(n)
    t = 0.0; rate = 24.0
    while t < dur * 0.8:
        p = filt(noise(0.03), "lp", 900) * expdecay(sec(0.03), 0.008) + sine(45, 0.03) * expdecay(sec(0.03), 0.01)
        if rng.random() > 0.25 + t / dur * 0.5:
            i = sec(t); x[i:i + len(p)] += p[: n - i]
        t += 1 / rate; rate *= 0.95
    return norm(x)


def chime():
    d = 0.5; n = sec(d)
    return norm((sine(880, d) + 0.5 * sine(1320, d)) * expdecay(n, 0.15))


def click():
    d = 0.03
    return norm(filt(noise(d), "bp", [1500, 5000]) * expdecay(sec(d), 0.004))


def tick_tock(dur, period=0.75):
    n = sec(dur); x = np.zeros(n); t = 0.0; k = 0
    while t < dur:
        c = filt(noise(0.02), "bp", [1200 if k % 2 else 900, 4000]) * expdecay(sec(0.02), 0.003)
        i = sec(t); x[i:i + len(c)] += c[: n - i]
        t += period / 2; k += 1
    return norm(x)


def groan(dur=1.6, f0=95):
    n = sec(dur); t = np.arange(n) / SR
    fr = f0 * (1 + 0.15 * np.sin(2 * np.pi * 0.7 * t)) * (1 - 0.25 * t / dur)
    x = signal.sawtooth(2 * np.pi * np.cumsum(fr) / SR) * 0.5
    x = sweep_bp(x, 300, 900, q=3) + K.creak(dur) * 0.5
    return norm(x * adsr(n, 0.15, dur * 0.7, 0.4, 0.3))


def crumble(dur=1.8):
    n = sec(dur)
    x = filt(brown(dur), "lp", 250) * adsr(n, 0.1, dur, 0.6, 0.3)
    t = 0.0
    while t < dur * 0.8:
        d = rng.uniform(0.03, 0.12)
        c = filt(noise(d), "bp", [150, 1200]) * expdecay(sec(d), d / 3)
        i = sec(t); x[i:i + len(c)] += c[: n - i] * rng.uniform(0.3, 1.0)
        t += rng.exponential(0.06)
    return norm(x)


def quack():
    d = rng.uniform(0.16, 0.24); n = sec(d)
    f0 = rng.uniform(380, 460)
    fr = f0 * (1 - 0.35 * np.arange(n) / n)
    x = signal.sawtooth(2 * np.pi * np.cumsum(fr) / SR)
    x = filt(x, "bp", [700, 2200]) + 0.4 * filt(x, "bp", [2600, 3600])
    return norm(x * np.sin(np.pi * np.arange(n) / n) ** 0.7)


def pluck(fq, dur=0.6):
    n = sec(dur)
    x = signal.sawtooth(2 * np.pi * fq * np.arange(n) / SR) * expdecay(n, 0.12)
    return norm(filt(x, "lp", 2500))


# ----------------------------------------------------------------------------- the mix
INSIDE = {"driver_watch", "stall_dash"}
NEAR_WATER = {"water_flow", "conv_cross", "rise_gauge", "murky", "underbody", "float_wide", "swept", "suv", "truck",
              "washout_surface", "stranded_close", "wade"}


def build():
    vo, vsr = sf.read(os.path.join(SCRATCH, "vo.wav"))
    if vo.ndim > 1:
        vo = vo.mean(1)
    if vsr != SR:
        vo = signal.resample_poly(vo, SR, vsr)
    vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    amb, sfx, mus = Track(), Track(), Track()
    D = END + 0.3

    rain_out = K.rain_outside(D)[:N]; rain_in = K.rain_inside(D)[:N]
    rush = rushing(D)[:N]; calm = calm_river(D)[:N]
    breeze = norm(filt(pink(D), "lp", 500)[:N]) * 0.4
    for name, t0, t1, st in SHOTS:
        i0, i1 = sec(t0), min(N, sec(t1))
        if st == "evening":
            src = calm * 0.9 + breeze * 0.5
        elif st in ("cutY", "cutX", "xray"):
            src = underwater(rush) * 0.9 + rain_out * 0.35
        elif name in INSIDE:
            src = rain_in + filt(rush, "lp", 600) * 0.4
        else:
            src = rain_out * 0.8 + rush * (1.0 if name in NEAR_WATER else 0.55)
        seg = fade(src[i0:i1], 0.015, 0.015)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg

    # whooshes on cuts into a different set
    prev = None
    for name, t0, t1, st in SHOTS:
        if prev is not None and t0 > 0.5:
            big = st != prev
            sfx.add(t0 - 0.2, K.whoosh(0.45 if big else 0.3), -14 if big else -24, rng.uniform(-0.5, 0.5))
        prev = st

    # opening: the hero driving in, wipers; the convertible ploughing through
    a, b = shot("water_flow")
    sfx.add(0.0, fade(engine(b + 0.2), 0.3, 0.4), -17)
    for k in range(5):
        sfx.add(0.4 + k * 1.4, K.wiper(), -24)
    sfx.add(0.9, fade(engine(4.0, 1.3), 0.2, 0.6), -20, 0.3)
    a, b = shot("conv_cross")
    sfx.add(a, spray_hiss(b - a + 0.3), -12, 0.2)
    for k in range(4):
        sfx.add(a + 0.1 + k * 0.38, splash(0.8, 0.8), -11, rng.uniform(-0.4, 0.4))
    a, b = shot("driver_watch")
    sfx.add(a + 0.2, K.wiper(), -18)
    # the water rises; you can't tell how deep
    a, b = shot("rise_gauge")
    sfx.add(a, gurgle_rise(b - a), -14)
    a, b = shot("depth_reveal")
    sfx.add(a - 0.1, filt(K.whoosh(0.6, 900, 200, 120), "lp", 900), -12)
    # six inches: lapping at the floor pan
    for name in ("six_cut", "underbody"):
        a, b = shot(name)
        tt = a + 0.1
        while tt < b:
            sfx.add(tt, slosh(0.4), -16 if name == "underbody" else -20, rng.uniform(-0.3, 0.3)); tt += rng.uniform(0.3, 0.55)
    # the engine stalls
    a, b = shot("stall_dash")
    die = ft(f(a) + int(round((f(b) - 1 - f(a)) * 0.5)))
    sfx.add(a, fade(engine(die - a, 0.9), 0.05, 0.05), -16)
    sfx.add(die - 0.6, sputter(1.0), -10)
    sfx.add(die + 0.15, chime(), -16); sfx.add(die + 0.55, chime(), -18)
    # one foot: it starts to float
    a, b = shot("foot_cut")
    sfx.add(a, gurgle_rise(b - a), -16); sfx.add(a + 0.4, K.creak(1.0), -16)
    a, b = shot("float_wide")
    sfx.add(a, groan(b - a + 0.3, 90), -14)
    for k in range(3):
        sfx.add(a + 0.2 + k * 0.4, slosh(0.4), -16, rng.uniform(-0.5, 0.5))
    # the box of air and the lift
    a, b = shot("air_box")
    sfx.add(a + 0.1, norm(sine(523, 1.2) + sine(784, 1.2) * 0.6) * adsr(sec(1.2), 0.3, 0.9, 0.0), -26)
    a, b = shot("lift_arrows")
    sfx.add(a + 0.15, norm(filt(brown(1.4), "lp", 140) * adsr(sec(1.4), 0.4, 1.0, 0.0)), -10)
    sfx.add(a + 0.2, K.whoosh(1.0, 150, 700, 400), -18)
    a, b = shot("lift_close")
    sfx.add(a + 0.2, K.creak(1.4), -15)
    a, b = shot("tire_lift")
    sfx.add(a + 0.3, filt(K.creak(1.2), "lp", 1500), -14); sfx.add(a, underwater(slosh(0.6)), -12)
    # the current slams the door
    a, b = shot("current_cut")
    sfx.add(a + 0.15, slam(1.4), -6)
    sfx.add(a + 0.9, groan(1.2, 110), -14)
    a, b = shot("swept")
    sfx.add(a, slam(1.0), -8); sfx.add(a + 0.2, groan(b - a, 80), -11)
    for k in range(5):
        sfx.add(a + 0.2 + k * 0.42, splash(0.8, 1.0), -12, rng.uniform(-0.6, 0.6))
    for name in ("suv", "truck"):
        a, b = shot(name)
        sfx.add(a + 0.1, groan(b - a, 70 if name == "truck" else 85), -12)
        sfx.add(a + 0.6, slosh(0.5), -14)
    # the road under the water
    a, b = shot("washout_cut")
    sfx.add(a + 0.1, crumble(b - a), -9)
    # stranded: hazards ticking in the rain
    a, _ = shot("stranded"); _, b = shot("stranded_close")
    sfx.add(a, tick_tock(b - a), -24, 0.2)
    # turn around
    a, b = shot("sign")
    sfx.add(a, fade(engine(b - a + 0.1, 0.9), 0.05, 0.1), -18)
    sfx.add(b - 0.5, filt(noise(0.5), "bp", [500, 2500]) * adsr(sec(0.5), 0.05, 0.45, 0.0) * 0.6, -24)   # brakes
    a, b = shot("turn_around")
    sfx.add(a + 0.05, click(), -14); sfx.add(a + 0.12, filt(sine(70, 0.15), "lp", 400) * expdecay(sec(0.15), 0.04), -12)
    sfx.add(a + 0.2, fade(engine(b - a, 1.2), 0.1, 0.2), -15)
    # get out, wade to higher ground
    a, b = shot("wade")
    tt = a + 0.2
    while tt < b:
        sfx.add(tt, slosh(0.4), -14, rng.uniform(-0.2, 0.2)); tt += 0.62
    a, b = shot("high_ground")
    sfx.add(a + 0.3, filt(noise(0.9), "bp", [500, 1600]) * adsr(sec(0.9), 0.1, 0.8, 0.0), -26)   # exhale
    # evening: the long way home, the scenic route
    a, b = shot("long_way")
    sfx.add(a, fade(engine(b - a + 0.2, 1.1), 0.2, 0.3), -16)
    for name in ("long_way", "scenic", "scenic_wide"):
        a, b = shot(name)
        tt = a + 0.2
        while tt < b:
            sfx.add(tt, K.bird(), -32, rng.uniform(-0.8, 0.8)); tt += rng.uniform(0.4, 1.1)
    a, b = shot("scenic")
    for k, dt in enumerate((0.5, 1.4, 2.1)):
        sfx.add(a + dt, quack(), -17, rng.uniform(-0.5, 0.5))
    a, b = shot("scenic_wide")
    sfx.add(b - 0.9, quack(), -14, 0.3)

    # music: tension under the flood, lift on "turn around", playful plucks on the punchline
    def music(t0, t1, freqs, cutoff, g):
        mus.add(t0, K.pad(t1 - t0, freqs, cutoff), g)
    music(0.0, SHOT["six_cut"][0], [55.0, 82.4, 110.0], 300, -25)
    music(SHOT["six_cut"][0], SHOT["current_cut"][0], [51.9, 77.8, 103.8], 320, -25)
    music(SHOT["current_cut"][0], SHOT["sign"][0], [49.0, 73.4, 98.0, 116.5], 360, -24)
    music(SHOT["sign"][0], SHOT["long_way"][0], [65.4, 98.0, 130.8, 164.8], 700, -26)
    music(SHOT["long_way"][0], END, [98.0, 146.8, 196.0, 246.9, 293.7], 1500, -26)
    a, _ = shot("scenic")
    for k, fq in enumerate((392.0, 329.6, 293.7, 261.6, 196.0)):
        mus.add(a + 0.2 + k * 0.33, pluck(fq), -24)

    env = filt(np.abs(vo), "lp", 6)
    env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
    duck = db(-7) ** env
    sduck = db(-4) ** env
    L = vo * db(-1) + (amb.L * db(-25) + mus.L) * duck + sfx.L * sduck
    R = vo * db(-1) + (amb.R * db(-25) + mus.R) * duck + sfx.R * sduck
    st = np.stack([L, R], 1)
    st = st / max(1.0, np.abs(st).max() / 0.97)
    sf.write(os.path.join(SCRATCH, "mix.wav"), st.astype(np.float32), SR)
    print("wrote mix.wav", round(N / SR, 2), "s")


if __name__ == "__main__":
    build()
