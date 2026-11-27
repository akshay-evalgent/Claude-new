"""Sound design for the pool short, synthesised from scratch (no samples): a suburban backyard (birds,
breeze, a distant mower), the room tone of the garage in the cutaways, spade crunches and dirt thuds,
the concrete pump, hydraulic whines for the lift and the rams, crane chains and the tub landing,
tiles clicking in, a hose filling the pool, deck boards clacking down, the remote's click and beep,
the pool rising with water slapping, the car starting and driving out, an ice-cube toast and a light
"build montage" music bed with a sting on "Now the trick" and a reveal swell. Mixed under the
narration with ducking.

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


def at(name, u):
    a, b = f(SHOT[name][0]), f(SHOT[name][1]) - 1
    return (a + (b - a) * u - 1) / FPS


# ----------------------------------------------------------------------------- building sounds
def crunch():
    """Spade into soil: a gritty burst with a dull low thump."""
    n = sec(0.28)
    grit = filt(noise(0.28), "bp", [700, 4500]) * expdecay(n, 0.05, 0.004) * (0.6 + 0.4 * rng.random(n))
    return norm(grit + sine(rng.uniform(70, 95), 0.28) * expdecay(n, 0.05) * 0.8)


def thud():
    n = sec(0.35)
    return norm(filt(brown(0.35), "lp", 260) * expdecay(n, 0.06, 0.003) + filt(noise(0.35), "bp", [400, 1600]) * expdecay(n, 0.02) * 0.3)


def pump(dur):
    """Concrete pump: a pulsing diesel drone with the slurry sloshing through the hose."""
    n = sec(dur); t = np.arange(n) / SR
    puls = 0.6 + 0.4 * (np.sin(2 * np.pi * 1.6 * t) > 0)
    drone = filt(signal.sawtooth(2 * np.pi * 48 * t), "lp", 300) * 0.5 + filt(brown(dur), "lp", 180)
    slosh = filt(noise(dur), "bp", [200, 900]) * puls
    return norm((drone * 0.7 + slosh * 0.6) * adsr(n, 0.15, dur, 1.0))


def hydraulic(dur, f0=180, f1=260, grit=0.4):
    """A hydraulic ram or lift: oily whine sliding in pitch over a low motor hum."""
    n = sec(dur); t = np.arange(n) / SR
    fq = f0 + (f1 - f0) * (t / dur)
    ph = 2 * np.pi * np.cumsum(fq) / SR
    whine = np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3.01 * ph)
    hum = filt(brown(dur), "lp", 120) + 0.4 * np.sin(2 * np.pi * 50 * t)
    hiss = filt(noise(dur), "bp", [2500, 7000]) * grit * 0.2
    return norm((whine * 0.45 + hum * 0.6 + hiss) * adsr(n, 0.12, dur, 1.0) * fade(np.ones(n), 0.01, 0.25))


def clunk():
    n = sec(0.7)
    x = sum(sine(fq, 0.7) * expdecay(n, tau, 0.001) for fq, tau in ((95, 0.18), (230, 0.1), (610, 0.05)))
    return norm(x + filt(noise(0.7), "bp", [300, 2000]) * expdecay(n, 0.02) * 0.5)


def big_thud():
    n = sec(1.4)
    return norm(sine(48, 1.4, 34) * expdecay(n, 0.35, 0.002) + filt(brown(1.4), "lp", 300) * expdecay(n, 0.2) * 0.8 +
                filt(noise(1.4), "bp", [400, 2500]) * expdecay(n, 0.03) * 0.4)


def chain(dur):
    """Crane chains: random small metallic links."""
    n = sec(dur); x = np.zeros(n)
    for i in rng.integers(0, max(1, n - sec(0.05)), int(dur * 38)):
        c = sum(sine(rng.uniform(1800, 4200), 0.05) * expdecay(sec(0.05), 0.012, 0.0004) for _ in range(2))
        x[i:i + len(c)] += c * rng.uniform(0.3, 1.0)
    return norm(x * adsr(n, 0.05, dur, 1.0))


def tile_tick():
    n = sec(0.05)
    return norm(filt(noise(0.05), "bp", [2500, 8000]) * expdecay(n, 0.006, 0.0003) + sine(rng.uniform(2000, 3200), 0.05) * expdecay(n, 0.01) * 0.4)


def pour(dur):
    """Hose into water: a steady bubbling splash."""
    n = sec(dur)
    bub = np.zeros(n)
    for i in rng.integers(0, max(1, n - sec(0.04)), int(dur * 90)):
        fq = rng.uniform(400, 1400)
        b = sine(fq, 0.04, fq * 1.6) * expdecay(sec(0.04), 0.01)
        bub[i:i + len(b)] += b * rng.uniform(0.2, 1.0)
    return norm(filt(noise(dur), "bp", [800, 6000]) * 0.5 + bub * 0.6) * adsr(n, 0.1, dur, 1.0)


def board_clack():
    n = sec(0.22)
    fq = rng.uniform(280, 420)
    return norm(filt(noise(0.22), "bp", [600, 3500]) * expdecay(n, 0.012, 0.0005) +
                (sine(fq, 0.22) + 0.5 * sine(fq * 2.7, 0.22)) * expdecay(n, 0.04) * 0.6)


def slosh(dur, rate=1.4):
    n = sec(dur); t = np.arange(n) / SR
    am = 0.4 + 0.6 * np.abs(np.sin(np.pi * rate * t)) ** 3
    return norm(filt(noise(dur), "bp", [250, 1800]) * am * adsr(n, 0.05, dur, 1.0))


def lapping(dur):
    n = sec(dur)
    am = 0.5 + 0.5 * np.clip(filt(noise(dur), "lp", 1.2) * 12, -1, 1)
    return norm(filt(noise(dur), "bp", [300, 1600]) * am)


def click():
    n = sec(0.06)
    return norm(filt(noise(0.06), "hp", 3000) * expdecay(n, 0.004, 0.0002) + sine(1200, 0.06) * expdecay(n, 0.01) * 0.3)


def beep():
    n = sec(0.18)
    return norm(sine(1760, 0.18) * adsr(n, 0.005, 0.15, 0.0))


def ice_clink():
    n = sec(0.5)
    x = sum(sine(fq, 0.5) * expdecay(n, tau, 0.0005) for fq, tau in ((3100, 0.12), (4870, 0.08), (6320, 0.05)))
    return norm(x)


def mower(dur):
    n = sec(dur); t = np.arange(n) / SR
    return norm(filt(signal.sawtooth(2 * np.pi * 31 * t * (1 + 0.02 * np.sin(2 * np.pi * 0.3 * t))), "bp", [60, 500]))


def wind(dur):
    return norm(filt(pink(dur), "lp", 700) * (0.7 + 0.3 * np.clip(filt(noise(dur), "lp", 0.4) * 30, -1, 1)))


def room_tone(dur):
    n = sec(dur); t = np.arange(n) / SR
    return norm(filt(pink(dur), "lp", 500) + 0.12 * np.sin(2 * np.pi * 100 * t))


def pluck(fq, dur=0.5, bright=2600):
    n = sec(dur)
    x = signal.sawtooth(2 * np.pi * fq * np.arange(n) / SR) * expdecay(n, 0.11)
    return norm(filt(x, "lp", bright))


def mallet(fq, dur=0.6):
    n = sec(dur)
    return norm((sine(fq, dur) + 0.3 * sine(fq * 4.0, dur)) * expdecay(n, 0.18, 0.002))


def kick():
    n = sec(0.3)
    return norm(sine(110, 0.3, 45) * expdecay(n, 0.08, 0.001))


def shaker():
    n = sec(0.08)
    return norm(filt(noise(0.08), "hp", 5000) * adsr(n, 0.01, 0.06, 0.0))


def sting():
    """'Now the trick': a bright two-note mallet sting with a reversed cymbal swell into it."""
    n = sec(1.0)
    sw = filt(noise(0.6), "hp", 4000) * np.linspace(0, 1, sec(0.6)) ** 2
    x = np.zeros(n); x[:len(sw)] += sw * 0.5
    for fq, t in ((1046.5, 0.58), (1568.0, 0.7)):
        m = mallet(fq, 0.3); i = sec(t); x[i:i + len(m)] += m[: n - i]
    return norm(x)


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
    yard = norm(wind(D)[:N] * 0.45 + birds + mower(D)[:N] * 0.06)
    under = norm(room_tone(D)[:N] * 0.6 + filt(yard, "lp", 900) * 0.4)
    for name, t0, t1, v in SHOTS:
        i0, i1 = sec(t0), min(N, sec(t1))
        seg = fade((yard if v == "ext" else under)[i0:i1], 0.015, 0.015)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg

    # hook: the pool already up, the lift whine settling, water slapping
    sfx.add(0.0, hydraulic(2.6, 170, 205), -15)
    sfx.add(0.3, slosh(2.6), -22)
    # the build
    a, b = shot("yard")
    sfx.add(at("yard", 0.6) - 0.05, crunch(), -12)
    a, b = shot("dig")
    tt = a + 0.05; k = 0
    while tt < b - 0.15:
        sfx.add(tt, crunch(), -14, rng.uniform(-0.3, 0.3))
        sfx.add(tt + 0.3, thud(), -20, 0.5); tt += 5 / FPS * 2; k += 1
    sfx.add(a, K.whoosh(b - a, 200, 900, 300), -24)
    a, b = shot("slab")
    sfx.add(a, pump(b - a + 0.1), -14)
    a, b = shot("walls")
    sfx.add(a + 0.05, K.whoosh(1.9, 120, 600, 200), -16)
    sfx.add(at("walls", 0.8) - 0.03, clunk(), -16)
    a, b = shot("lift")
    sfx.add(at("lift", 0.1), hydraulic(b - at("lift", 0.1), 160, 240), -15)
    sfx.add(b - 0.08, clunk(), -16)
    a, b = shot("park")
    sfx.add(a, K.engine(0.8) if hasattr(K, "engine") else np.zeros(1), -26)
    sfx.add(at("park", 0.12), hydraulic(at("park", 0.95) - at("park", 0.12), 240, 160), -15)
    sfx.add(at("park", 0.95), clunk(), -15)
    a, b = shot("trick")
    mus.add(a - 0.55, sting(), -12)
    a, b = shot("rams")
    for k in range(4):
        sfx.add(a + (2 + 4 * k) / FPS, big_thud(), -17, (k % 2 - 0.5) * 0.8)
    sfx.add(at("rams", 0.42), hydraulic(at("rams", 0.72) - at("rams", 0.42), 150, 260), -13)
    sfx.add(at("rams", 0.72), hydraulic(at("rams", 1.0) - at("rams", 0.72) + 0.1, 260, 170), -16)
    a, b = shot("tub")
    sfx.add(a, chain(at("tub", 0.8) - a), -19)
    sfx.add(at("tub", 0.78), big_thud(), -8)
    sfx.add(at("tub", 0.9), clunk(), -14)
    a, b = shot("tilefill")
    for k in range(24):
        sfx.add(a + k * (at("tilefill", 0.45) - a) / 24, tile_tick(), -20, rng.uniform(-0.5, 0.5))
    sfx.add(at("tilefill", 0.38), pour(b - at("tilefill", 0.38) + 0.3), -13)
    a, b = shot("deck")
    for k in range(34):
        sfx.add(a + 5 / FPS + k * (b - a - 0.5) / 34, board_clack(), -15, rng.uniform(-0.6, 0.6))
    a, b = shot("edges")
    sfx.add(a, lapping(b - a), -20)
    a, b = shot("justpool")
    sfx.add(a, lapping(b - a + 1.4), -18)
    # the reveal
    sfx.add(at("button", 0.56), click(), -10)
    sfx.add(at("button", 0.6), beep(), -18)
    a, b = shot("rise")
    sfx.add(at("rise", 0.08), hydraulic(b - at("rise", 0.08) + 0.2, 120, 210, 0.6), -9)
    sfx.add(a + 0.1, filt(brown(b - a), "lp", 90) * adsr(sec(b - a), 0.3, b - a, 1.0), -10)
    sfx.add(at("rise", 0.2), slosh(b - a + 1.5, 1.8), -15)
    a, b = shot("water")
    sfx.add(a, slosh(b - a, 1.2), -14)
    a, b = shot("carup")
    sfx.add(at("carup", 0.08), hydraulic(at("carup", 0.92) - at("carup", 0.08), 170, 250), -12)
    sfx.add(at("carup", 0.92), clunk(), -16)
    eng = K.engine(3.4)
    sfx.add(at("carup", 0.6), eng, -14)
    a, b = shot("driveout")
    sfx.add(a - 0.1, K.whoosh(1.2, 150, 700, 250), -14)
    a, b = shot("sink")
    sfx.add(a + 0.05, click(), -14)
    sfx.add(at("sink", 0.02), hydraulic(at("sink", 0.34) - at("sink", 0.02), 220, 160), -19)
    sfx.add(at("sink", 0.38), hydraulic(at("sink", 0.86) - at("sink", 0.38), 210, 120, 0.6), -11)
    sfx.add(at("sink", 0.86), clunk(), -12)
    sfx.add(at("sink", 0.4), slosh(at("sink", 1.0) - at("sink", 0.4), 1.0), -18)
    sfx.add(at("congrats", 0.4), ice_clink(), -12)

    # music: a light build-montage groove (plucks, mallets, kick and shaker) until the trick,
    # a tense pedal under the reveal setup, a swell on the rise, then a bright resolve and a sly button
    beat = 60 / 112
    trick0, button0, rise0, cong0 = SHOT["trick"][0], SHOT["button"][0], SHOT["rise"][0], SHOT["congrats"][0]
    nb0 = SHOT["neighbor"][0]
    prog = [[261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7]]

    def groove(t0, t1, g):
        t, k = t0, 0
        while t < t1 - 0.05:
            ch = prog[(k // 8) % 4]
            mus.add(t, pluck(ch[k % 3] * (2 if k % 4 == 3 else 1), 0.4), g, ((k % 3) - 1) * 0.4)
            if k % 2 == 0:
                mus.add(t, kick(), g - 4)
            mus.add(t + beat / 4, shaker(), g - 10, 0.3)
            t += beat / 2; k += 1
    groove(0.2, trick0 - 0.1, -25)
    mus.add(trick0, K.pad(button0 - trick0, [130.8, 196.0, 261.6, 329.6], 1200), -26)
    groove(trick0 + 1.0, SHOT["justpool"][0], -26)
    mus.add(SHOT["justpool"][0], K.pad(button0 - SHOT["justpool"][0], [174.6, 261.6, 349.2, 440.0], 900), -25)
    # reveal: a rising swell into the lift, held through the car
    mus.add(button0 + 0.2, K.pad(SHOT["driveout"][1] - button0, [65.4, 98.0, 130.8, 196.0, 261.6, 392.0], 2200), -20)
    mus.add(rise0, K.whoosh(1.6, 100, 900, 300), -20)
    for k, fq in enumerate((523.3, 659.3, 784.0, 1046.5)):
        mus.add(SHOT["carup"][0] + 0.15 * k, mallet(fq, 0.9), -20)
    groove(SHOT["sink"][0] + 0.1, cong0, -27)
    # congratulations: bright resolve; the neighbour: sly pizzicato
    for k, fq in enumerate((523.3, 659.3, 784.0, 1046.5, 1318.5)):
        mus.add(cong0 + 0.05 + 0.07 * k, mallet(fq, 1.2), -17)
    t, k = nb0 + 0.3, 0
    for fq in (392.0, 0, 349.2, 0, 329.6, 311.1, 293.7, 0, 392.0, 0, 261.6):
        if fq:
            mus.add(t, pluck(fq, 0.25, 1600), -21, -0.3)
        t += beat / 2
    mus.add(t + 0.1, mallet(196.0, 1.2), -19)

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
