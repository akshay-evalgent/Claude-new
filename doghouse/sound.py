"""Sound design for the doghouse short, synthesised from scratch (no samples): a backyard (birds,
breeze), the muffled room tone of the ground in the cutaways, the doghouse scraping aside, spade
crunches and dirt thuds, a cave-in, a hoist chain and concrete rings thumping into place, the
ladder sliding down, the vent pipe rising and the chimney's pop, the cable humming to life and the
lights clunking on, router blips, pickaxe strikes and the crawl down the tunnel, the wall bursting
into the neighbour's TV, and a sly pizzicato music bed with a sting on every "But..." turn.
Mixed under the narration with ducking.

usage: <venv>/bin/python sound.py   (needs numpy, scipy, soundfile; reads $QS_SCRATCH/vo.wav)
writes $QS_SCRATCH/mix.wav (48 kHz stereo)
"""
import importlib.util, os, sys
import numpy as np
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import timeline  # noqa: E402  (loaded first, so the shared toolkits below use this film's timing)
from timeline import SHOT, SHOTS, END, FPS, f  # noqa: E402

_spec = importlib.util.spec_from_file_location("psound", os.path.join(HERE, "..", "pool", "sound.py"))
PS = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(PS)
K = PS.K
sec, noise, pink, brown, filt, adsr, expdecay, sine, norm, db, fade, Track = (
    K.sec, K.noise, K.pink, K.brown, K.filt, K.adsr, K.expdecay, K.sine, K.norm, K.db, K.fade, K.Track)
SCRATCH = os.environ["QS_SCRATCH"]
SR, N = K.SR, K.N
rng = np.random.default_rng(57)


def shot(name):
    a, b, _ = SHOT[name]
    return a, b


def at(name, u):
    a, b = f(SHOT[name][0]), f(SHOT[name][1]) - 1
    return (a + (b - a) * u - 1) / FPS


# ----------------------------------------------------------------------------- new sounds
def scrape(dur):
    """Wood dragged over grass."""
    n = sec(dur)
    return norm(filt(noise(dur), "bp", [300, 2200]) * (0.5 + 0.5 * np.abs(filt(noise(dur), "lp", 9)) * 6) * adsr(n, 0.05, dur, 1.0))


def cascade(dur):
    """Dirt raining down the shaft: a rumble with gritty patter."""
    n = sec(dur)
    pat = K.clicks(dur, 220, [800, 5000])
    return norm(filt(brown(dur), "lp", 160) * 0.8 + pat * 0.6 + filt(noise(dur), "bp", [400, 2000]) * 0.4) * adsr(n, 0.08, dur, 1.0)


def ring_thunk():
    n = sec(0.8)
    return norm(sine(70, 0.8, 52) * expdecay(n, 0.18, 0.001) + filt(noise(0.8), "bp", [200, 1500]) * expdecay(n, 0.03) * 0.6 +
                sine(310, 0.8) * expdecay(n, 0.06) * 0.25)


def slide_down(dur):
    n = sec(dur); t = np.arange(n) / SR
    fq = 1400 - 900 * t / dur
    return norm(filt(noise(dur), "bp", [1500, 5000]) * 0.5 + np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.3) * adsr(n, 0.02, dur, 1.0)


def rise_up(dur):
    n = sec(dur); t = np.arange(n) / SR
    fq = 300 + 700 * t / dur
    return norm(filt(noise(dur), "bp", [600, 3000]) * 0.5 + np.sin(2 * np.pi * np.cumsum(fq) / SR) * 0.35) * adsr(n, 0.05, dur, 1.0)


def pop():
    n = sec(0.3)
    return norm(sine(240, 0.3, 900) * expdecay(n, 0.05) + filt(noise(0.3), "bp", [1000, 4000]) * expdecay(n, 0.01) * 0.6)


def hum(dur, crackle=0.6):
    n = sec(dur); t = np.arange(n) / SR
    h = sum(np.sin(2 * np.pi * 60 * k * t) / k for k in (1, 2, 3, 5))
    cr = K.clicks(dur, 30, [2000, 8000]) * crackle
    return norm(h * 0.5 + cr) * adsr(n, 0.2, dur, 1.0)


def switch():
    n = sec(0.12)
    return norm(filt(noise(0.12), "bp", [800, 4000]) * expdecay(n, 0.01, 0.0005) + sine(180, 0.12) * expdecay(n, 0.02) * 0.6)


def buzz(dur):
    n = sec(dur); t = np.arange(n) / SR
    return norm(signal.square(2 * np.pi * 120 * t) * 0.1 + filt(noise(dur), "bp", [100, 400]) * 0.2) * adsr(n, 0.05, dur, 1.0)


def clink():
    n = sec(0.35)
    fq = rng.uniform(1800, 2600)
    return norm((sine(fq, 0.35) + 0.5 * sine(fq * 2.7, 0.35)) * expdecay(n, 0.05, 0.0005) +
                filt(noise(0.35), "bp", [1500, 6000]) * expdecay(n, 0.01) * 0.7)


def crash(dur=2.2):
    """Concrete giving way: a boom, a crack and a long scatter of debris."""
    n = sec(dur); x = np.zeros(n)
    x += sine(50, dur, 34) * expdecay(n, 0.4, 0.002) * 1.2
    x += filt(noise(dur), "bp", [300, 4000]) * expdecay(n, 0.12, 0.001)
    for i in rng.integers(sec(0.08), n - sec(0.1), 60):
        c = filt(noise(0.06), "bp", [1200, 7000]) * expdecay(sec(0.06), 0.01, 0.0004) * rng.uniform(0.2, 0.9)
        x[i:i + len(c)] += c * (1 - i / n)
    return norm(x)


def tv_murmur(dur):
    n = sec(dur)
    syll = 0.5 + 0.5 * np.abs(filt(noise(dur), "lp", 6)) * 6
    return norm(filt(pink(dur), "bp", [300, 2800]) * syll + K.clicks(dur, 8, [3000, 6000]) * 0.2)


def crawl(dur):
    n = sec(dur); x = np.zeros(n)
    t = 0.05
    while t < dur - 0.2:
        c = filt(noise(0.18), "bp", [400, 2500]) * adsr(sec(0.18), 0.02, 0.15, 0.0)
        i = sec(t); x[i:i + len(c)] += c[: n - i] * rng.uniform(0.5, 1.0)
        t += rng.uniform(0.22, 0.32)
    return norm(x)


def stab(freqs, dur=0.9, bright=1800):
    """A dissonant pizzicato-and-low-brass stab for the 'But...' turns."""
    n = sec(dur); x = np.zeros(n)
    for fq in freqs:
        x += signal.sawtooth(2 * np.pi * fq * np.arange(n) / SR) * expdecay(n, 0.25)
    return norm(filt(x, "lp", bright) + sine(freqs[0] / 2, dur) * expdecay(n, 0.3) * 0.8)


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

    birds = np.zeros(N)
    t = 0.1
    while t < D - 0.5:
        b = K.bird(); i = sec(t); birds[i:i + len(b)] += b[: N - i] * rng.uniform(0.3, 1.0); t += rng.uniform(0.25, 0.8)
    yard = norm(PS.wind(D)[:N] * 0.45 + birds)
    under = norm(PS.room_tone(D)[:N] * 0.7 + filt(yard, "lp", 600) * 0.3)
    for name, t0, t1, v in SHOTS:
        i0, i1 = sec(t0), min(N, sec(t1))
        seg = fade((yard if v == "ext" else under)[i0:i1], 0.015, 0.015)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg

    # the doghouse, the dark doorway
    sfx.add(at("notdog", 0.05), K.whoosh(1.7, 500, 150, 80), -16)
    a, b = shot("hole")
    sfx.add(at("hole", 0.12), scrape(0.6), -15)
    for k, u in enumerate((0.42, 0.68, 0.94)):
        sfx.add(at("hole", u), PS.crunch(), -12, (k - 1) * 0.3)
    a, b = shot("cavein")
    for k, u in enumerate((0.0, 0.14)):
        sfx.add(at("cavein", u), PS.crunch(), -14)
    sfx.add(at("cavein", 0.27), cascade(b - at("cavein", 0.27) + 0.3), -9)
    # the rings: chain and a thunk per ring
    a, b = shot("rings")
    sfx.add(a, PS.chain(b - a), -20)
    nr = 12
    for idx in range(nr):
        s0 = f(a) + 2 + int((f(b) - f(a) - 10) * idx / nr)
        sfx.add((s0 + 5 - 1) / FPS, ring_thunk(), -11, ((idx % 3) - 1) * 0.2)
    sfx.add(at("sixm", 0.05), K.whoosh(1.4, 900, 200, 100), -18)
    sfx.add(at("ladder", 0.05), slide_down(0.5), -14)
    sfx.add(at("ladder", 0.56), PS.clunk(), -12)
    # nothideout: hollow footsteps in the tube
    for u in (0.1, 0.35, 0.6):
        sfx.add(at("nothideout", u), PS.thud(), -20)
    a, b = shot("dig")
    tt = a + 0.05
    while tt < b - 0.1:
        sfx.add(tt, PS.crunch(), -15, 0.2); tt += 10 / FPS
    a, b = shot("pour")
    sfx.add(a, PS.pump(b - a + 0.1), -15)
    sfx.add(at("air", 0.1), filt(noise(0.8), "bp", [500, 1500]) * adsr(sec(0.8), 0.1, 0.6, 0.0), -24)
    a, b = shot("vent")
    sfx.add(at("vent", 0.12), rise_up(at("vent", 0.92) - at("vent", 0.12)), -15)
    sfx.add(at("chimney", 0.42), pop(), -9)
    a, b = shot("power")
    sfx.add(a, hum(b - a + 0.3), -16)
    a, b = shot("lights")
    lon = (f(a) + 5 - 1) / FPS
    sfx.add(lon, switch(), -8)
    sfx.add(lon + 0.02, buzz(b - lon), -30)
    for k in range(9):
        sfx.add(lon + 0.1 + k * 2 / FPS, PS.board_clack(), -22, ((k % 3) - 1) * 0.4)
    for k in range(4):
        sfx.add(lon + 0.6 + k * 0.45, PS.beep(), -30, 0.3)
    # the second way out
    a, b = shot("keepdig")
    for u in (0.45, 0.9):
        sfx.add(at("keepdig", u), clink(), -9, 0.3)
    a, b = shot("garden")
    sfx.add(a, crawl(b - a), -16)
    for k in range(5):
        sfx.add(a + 0.2 + k * 0.38, clink(), -18, 0.2)
    a, b = shot("break")
    sfx.add(at("break", 0.38), clink(), -8)
    sfx.add(at("break", 0.42), crash(), -3)
    sfx.add(at("break", 0.45), tv_murmur(1.1), -20, 0.4)
    a, b = shot("dog2")
    sfx.add(at("dog2", 0.6), PS.board_clack(), -18)

    # music: sly pizzicato groove; a stab on each "But..."; the groove drops for the reveal
    beat = 60 / 104
    prog = [[220.0, 261.6, 329.6], [196.0, 246.9, 293.7], [174.6, 220.0, 261.6], [164.8, 207.7, 246.9]]
    buts = [timeline.s(3), timeline.s(6), timeline.s(11)]
    reveal = SHOT["break"][0] + 0.7

    def groove(t0, t1, g):
        t, k = t0, 0
        while t < t1 - 0.05:
            if not any(b - 0.05 < t < b + 0.6 for b in buts):
                ch = prog[(k // 8) % 4]
                mus.add(t, PS.pluck(ch[k % 3] * (2 if k % 4 == 3 else 1), 0.32, 1700), g, ((k % 3) - 1) * 0.4)
                if k % 2 == 0:
                    mus.add(t, PS.kick(), g - 5)
            t += beat / 2; k += 1
    groove(0.2, reveal - 0.9, -24)
    for b in buts:
        mus.add(b - 0.03, stab([207.7, 246.9, 311.1]), -15)
    # power and lights: a warm pad under the groove
    mus.add(SHOT["power"][0], K.pad(SHOT["lights"][1] - SHOT["power"][0], [174.6, 261.6, 349.2, 440.0], 1000), -27)
    # the break-through: a big hit, then a held, tense chord under the reveal
    mus.add(SHOT["break"][0] + 0.4, PS.sting(), -16)
    mus.add(reveal, K.pad(SHOT["neighbor"][1] - reveal + 0.3, [55.0, 82.4, 110.0, 164.8], 700), -19)
    # the twist: a comic pizzicato tag
    t = SHOT["dog2"][0] + 0.35
    for fq in (392.0, 0, 329.6, 0, 261.6, 293.7, 329.6, 0, 392.0, 0, 523.3):
        if fq:
            mus.add(t, PS.pluck(fq, 0.25, 1600), -19, -0.2)
        t += beat / 2
    mus.add(t + 0.15, PS.mallet(196.0, 1.4), -17)

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
