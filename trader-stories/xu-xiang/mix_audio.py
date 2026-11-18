"""Mix narration, an original generated music bed and sound effects, timed to the film.

usage: python mix_audio.py SHOTS_JSON VO_DIR OUT_DIR
Writes OUT_DIR/mix.wav (48 kHz stereo) plus stems voice.wav and music.wav.
Everything here is synthesised from scratch, so the music needs no licence.
"""
import json, sys
from pathlib import Path
import numpy as np
import soundfile as sf

shots = json.load(open(sys.argv[1])); vo_dir = Path(sys.argv[2]); out = Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
SR = 48000
by_id = {s["id"]: s for s in shots}
total = shots[-1]["start"] + shots[-1]["seconds"]
N = int(total * SR) + SR
rng = np.random.default_rng(7)

def start(i): return by_id[i]["start"]
def end(i): return by_id[i]["start"] + by_id[i]["seconds"]

# ---------------------------------------------------------------- voice
def upsample2(x):
    y = np.zeros(len(x) * 2, dtype=np.float32); y[::2] = x
    n = np.arange(-31, 32); h = np.sinc(n / 2) * np.hamming(63); h /= h.sum() / 2
    return np.convolve(y, h.astype(np.float32), mode="same")

voice = np.zeros(N, dtype=np.float32)
for s in shots:
    if not s.get("voice"):
        continue
    a, sr = sf.read(vo_dir / f"{s['id']}.wav", dtype="float32")
    a = upsample2(a) if sr == 24000 else a
    i0 = int((s["start"] + 0.08) * SR)
    voice[i0:i0 + len(a)] += a[: max(0, N - i0)]

# ducking envelope from the voice itself
env = np.abs(voice)
hop = 480
frames = env[: len(env) // hop * hop].reshape(-1, hop).max(axis=1)
sm = np.zeros_like(frames); a_att, a_rel = 0.5, 0.04
for k in range(1, len(frames)):
    target = 1.0 if frames[k] > 0.02 else 0.0
    sm[k] = sm[k - 1] + (a_att if target > sm[k - 1] else a_rel) * (target - sm[k - 1])
duck = np.repeat(sm, hop); duck = np.pad(duck, (0, N - len(duck)))

# ---------------------------------------------------------------- music
def hz(note):  # MIDI to Hz
    return 440.0 * 2 ** ((note - 69) / 12)

D2, F2, G2, A2, Bb2, C3, Cs3, D3, E3, F3, G3, A3, Bb3 = 38, 41, 43, 45, 46, 48, 49, 50, 52, 53, 55, 57, 58
CHORDS = [[D3, F3, A3, D2], [Bb2, D3, F3, Bb3 - 24], [G2, Bb2, D3, G2 - 12], [A2, Cs3, E3, A2 - 12]]
SEG = 9.6
section_at = {}
for s in shots:
    section_at.setdefault(s["section"], s["start"])
def section_of(t):
    sec = 1
    for k, v in sorted(section_at.items()):
        if t >= v: sec = k
    return sec
TENSE = {7: 1.0, 8: 1.0, 9: 0.6, 5: 0.3}

music = np.zeros((N, 2), dtype=np.float32)
t_seg = 0.0; ci = 0
while t_seg < total:
    n0 = int(t_seg * SR); length = int((SEG + 2.5) * SR)
    t = np.arange(length) / SR
    bright = 1.0 + 0.8 * TENSE.get(section_of(t_seg), 0)
    seg = np.zeros((length, 2), dtype=np.float32)
    for note in CHORDS[ci % 4]:
        f = hz(note)
        for det, pan in ((-0.12, 0.25), (0.12, 0.75)):
            ff = f * 2 ** (det / 12)
            wave = sum(np.sin(2 * np.pi * ff * h * t + rng.random() * 6) / h ** (2.2 / bright) for h in range(1, 7))
            seg[:, 0] += (1 - pan) * wave; seg[:, 1] += pan * wave
    fade = np.minimum(1, np.minimum(t / 2.5, (SEG + 2.5 - t) / 2.5)).astype(np.float32)
    seg *= fade[:, None]
    m = min(length, N - n0)
    music[n0:n0 + m] += seg[:m]
    t_seg += SEG; ci += 1
music /= np.abs(music).max() + 1e-9
tt = np.arange(N) / SR
sub = (np.sin(2 * np.pi * hz(26) * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * tt / 23))).astype(np.float32)
music += 0.2 * sub[:, None]

# pulse in the tense sections
def thump(length=0.35):
    t = np.arange(int(length * SR)) / SR
    f = 70 * np.exp(-t * 9) + 38
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)).astype(np.float32)
th = thump()
for sec, amt in TENSE.items():
    if sec not in section_at or amt < 0.6:
        continue
    s0 = section_at[sec]; s1 = min([v for k, v in section_at.items() if k > sec] + [total])
    if sec == 8: s0 = end("08.03")
    k = s0
    while k < s1 - 0.4:
        i0 = int(k * SR); music[i0:i0 + len(th)] += (0.55 * amt * th)[:, None]; k += 0.92

# bells for the cold open, the bridge intro and the epilogue
def bell(f, length=4.0):
    t = np.arange(int(length * SR)) / SR
    return ((np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 1.3)).astype(np.float32)
for a_id, b_id in (("01.01", "01.10"), ("08.01", "08.04"), ("12.01", "12.06")):
    k, j = start(a_id), 0
    while k < end(b_id) - 1:
        b = bell(hz([74, 69, 77, 72][j % 4])); i0 = int(k * SR)
        music[i0:i0 + len(b)] += (0.18 * b)[: max(0, N - i0), None]; k += 4.8; j += 1

music /= np.abs(music).max() + 1e-9
gain = (0.30 - 0.255 * duck).astype(np.float32)
music *= gain[:, None]

# silence after the arrest, and fades at the start and end
i0, i1 = int(start("08.14") * SR), int(end("08.14") * SR)
mute = np.ones(N, dtype=np.float32); r = int(0.25 * SR)
mute[i0:i1] = 0; mute[i0 - r:i0] = np.linspace(1, 0, r); mute[i1:i1 + r] = np.linspace(0, 1, r)
music *= mute[:, None]
fin = int(3 * SR); music[:fin] *= np.linspace(0, 1, fin)[:, None]
fe = int(6 * SR); e0 = int(total * SR) - fe; music[e0:e0 + fe] *= np.linspace(1, 0, fe)[:, None]; music[e0 + fe:] = 0

# ---------------------------------------------------------------- sound effects
def boom(length=3.0):
    t = np.arange(int(length * SR)) / SR
    f = 90 * np.exp(-t * 4) + 30
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6)
    noise = np.convolve(rng.standard_normal(len(t)), np.ones(200) / 200, mode="same") * np.exp(-t * 6) * 0.6
    return (tone + noise).astype(np.float32)
def swoosh(length=1.2):
    t = np.arange(int(length * SR)) / SR
    n = np.convolve(rng.standard_normal(len(t)), np.ones(30) / 30, mode="same")
    return (n * (t / length) ** 2.5 * 1.4).astype(np.float32)
def thud():
    t = np.arange(int(0.4 * SR)) / SR
    return (np.sin(2 * np.pi * (60 * np.exp(-t * 20) + 45) * t) * np.exp(-t * 14) +
            np.convolve(rng.standard_normal(len(t)), np.ones(40) / 40, mode="same") * np.exp(-t * 30) * 0.8).astype(np.float32)
def click():
    t = np.arange(int(0.03 * SR)) / SR
    return (rng.standard_normal(len(t)) * np.exp(-t * 300) * 0.5).astype(np.float32)

sfx = np.zeros(N, dtype=np.float32)
def put(x, at, g):
    i0 = int(at * SR); m = min(len(x), N - i0)
    if i0 >= 0 and m > 0: sfx[i0:i0 + m] += g * x[:m]
put(boom(), start("01.10"), 0.9)
put(boom(4), start("01.11"), 0.7)
put(swoosh(), start("03.01") - 1.15, 0.5)
put(thud(), start("05.13") + 0.35, 0.8)
for at in (2.4, 4.0, 5.4): put(thud(), start("07.06") + at, 0.9)
put(boom(), start("08.14"), 1.0)
put(boom(), start("09.15") + 1.8, 0.7)
put(thud(), start("10.11") + 1.6, 0.8)
for line_at, chars in ((0.2, 17), (1.4, 5)):
    for c in range(chars): put(click(), start("01.01") + line_at + c / 22, 0.25)

# ---------------------------------------------------------------- mix
mix = music.copy()
mix[:, 0] += voice + sfx * 0.9; mix[:, 1] += voice + sfx * 0.9
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(out / "mix.wav", mix, SR, subtype="PCM_24")
sf.write(out / "voice.wav", voice, SR, subtype="PCM_24")
sf.write(out / "music.wav", music + (sfx * 0.9)[:, None], SR, subtype="PCM_24")
print(f"mixed {total/60:.2f} min")
