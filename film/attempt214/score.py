"""ATTEMPT 214: score and sound, on the picture's clock (96 BPM, a beat is 0.625 s, a bar is 2.5 s).

Acoustic, hand-made grain: pizzicato, harp, glockenspiel pops, piano, a solo cello for the lonely
night, strings for the shared ending. Foley follows the paint and the paper: knife scrapes on every
paint-over, paper folds, whooshes, taps on stucco, crumples, rain, a single drip in the hard silence.

Her motif (D F# A G) never resolves while she fails. It resolves (G F# E D) when the colour comes back.
Every failed attempt lands a glockenspiel pop one step higher, so the montage climbs.

  python3 score.py master out/audio/master_mix.wav
  python3 score.py short  out/audio/short_mix.wav
"""
import importlib.util
import os
import re
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('lantern_score', os.path.join(HERE, '..', 'lantern', 'score.py'))
L = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(L)
SR = L.SR
BEAT, BAR = 0.625, 2.5
RNG = np.random.default_rng(214)

SHOTS = [('s01_canvas', 7.5), ('s02_tilt', 5), ('s03_first', 7.5), ('s04_montage', 25), ('s05_room', 10), ('s06_213', 10), ('s07_silence', 5),
         ('s08_sign', 10), ('s09_climb', 12.5), ('s10_throw', 7.5), ('s11_flight', 12.5), ('s12_catch', 7.5), ('s13_colour', 10), ('s14_pattern', 7.5), ('s15_end', 12.5)]
START = {}
_t = 0.0
for _n, _d in SHOTS:
    START[_n] = _t; _t += _d
TOTAL = _t
SHORT = [('s04_montage', 0.0, 10.0), ('s06_213', 0.6, 6.6), ('s08_sign', 1.2, 7.2), ('s09_climb', 4.0, 10.0), ('s10_throw', 2.5, 7.5), ('s11_flight', 0.0, 10.0), ('s13_colour', 1.5, 9.5), ('s15_end', 0.0, 4.6)]


def check_against_film():
    src = open(os.path.join(HERE, 'js', 'film.js')).read()
    found = dict((m.group(1), float(m.group(2))) for m in re.finditer(r"^\s{2}(s\d\d_\w+): \{ dur: ([\d.]+)", src, re.M))
    for n, d in SHOTS:
        assert found.get(n) == d, f'{n}: film.js says {found.get(n)}, score says {d}'


# ------------------------------------------------------------------ instruments
def _pizz(m, vel):
    x = L.harp(m, vel, 1.0)
    e = np.exp(-L.tt(len(x)) * 4.5)
    return L.lp(x * e, 2200) * 1.8


def glock(m, vel=0.4):
    f = L.midi(m); n = int(2.2 * SR); t = L.tt(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5) + 0.12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9)
    x *= np.minimum(1, t / 0.0015)
    return x * vel * 0.32


def celesta(m, vel=0.4):
    return L.musicbox(m, vel) * 1.2


def cello(m, dur, vel=0.4):
    return L.strings([m], dur, vel * 1.6, att=0.35, rel=0.9, cut=1600)


# ------------------------------------------------------------------ foley
def scrape(d=1.0, gain=0.3, bright=1.0):   # a palette knife dragged through paint
    n = int(d * SR); t = L.tt(n)
    nz = L.noise(d)
    grain = np.abs(L.lp(L.noise(d), 60)) * 3
    x = L.bp(nz, 700 * bright, 4200 * bright) * (0.4 + grain)
    x += L.bp(L.noise(d), 180, 600) * 0.3
    e = np.sin(np.linspace(0, np.pi, n)) ** 0.6
    return x * e * gain


def whoosh(d=0.35, lo=500, hi=4000, gain=0.25):
    n = int(d * SR); nz = L.noise(d); out = np.zeros(n)
    for k in range(10):
        a, b = k * n // 10, (k + 1) * n // 10; f = lo * (hi / lo) ** (k / 10)
        out[a:b] = L.bp(nz, f * 0.6, f * 1.5)[a:b]
    return out * np.sin(np.linspace(0, np.pi, n)) ** 1.4 * gain


def tap(gain=0.4):   # paper nose on stucco
    d = 0.12; t = L.tt(int(d * SR))
    return (L.bp(L.noise(d), 900, 3500) * np.exp(-t * 60) + np.sin(2 * np.pi * 320 * t) * np.exp(-t * 50) * 0.4) * gain


def crumple(gain=0.3, d=0.4):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(26):
        i = RNG.integers(0, n - 400); L_ = RNG.integers(80, 400)
        seg_ = L.bp(L.noise((L_ + 2) / SR), 1500, 7000)[:L_]; x[i:i + len(seg_)] += seg_ * RNG.uniform(0.3, 1.0)
    return x * np.sin(np.linspace(0, np.pi, n)) * gain


def _fold(gain):
    a = crumple(gain * 0.6, 0.25); b = whoosh(0.25, 800, 3000, gain * 0.4)
    n = max(len(a), len(b)); out = np.zeros(n); out[:len(a)] += a; out[:len(b)] += b
    return out


def splash(gain=0.5):
    d = 0.6; t = L.tt(int(d * SR))
    return (L.bp(L.noise(d), 400, 3000) * np.exp(-t * 9) + L.lp(L.noise(d), 300) * np.exp(-t * 14) * 0.5) * gain


def drip(gain=0.6):
    d = 0.35; t = L.tt(int(d * SR)); f = 1400 + 900 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) * gain


def rain_bed(d, gain=0.12):
    x = L.sfx_rain(d, 0.7) if hasattr(L, 'sfx_rain') else L.bp(L.noise(d), 1500, 8000) * 0.2
    return x * gain / (np.std(x) + 1e-9) * 0.15


def laugh(d=2.0, gain=0.12):   # children laughing a little way off
    n = int(d * SR); t = L.tt(n); out = np.zeros(n)
    for v in range(3):
        f0 = 380 + v * 70; rate = 5.5 + v * 0.9
        env = (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + v)) ** 3 * np.exp(-t * 0.6)
        vo = L.bp(L.noise(d), f0 * 1.6, f0 * 3.2) + np.sin(2 * np.pi * (f0 + 30 * np.sin(2 * np.pi * rate * t)) * t) * 0.3
        out += vo * env
    return out * gain


def step_crunch(gain=0.22):
    return crumple(gain, 0.18)


def flutter(d, gain=0.08):
    n = int(d * SR); t = L.tt(n)
    return L.bp(L.noise(d), 600, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 24 * t)) * np.sin(np.linspace(0, np.pi, n)) * gain


# ------------------------------------------------------------------ harmony
CH = {'D': [50, 57, 62, 66], 'A': [45, 57, 61, 64], 'Bm': [47, 54, 59, 62], 'G': [43, 55, 59, 62], 'Em': [40, 55, 59, 64], 'F#m': [42, 57, 61, 66], 'Asus': [45, 57, 62, 64]}
MOTIF = [(74, 1), (78, 1), (81, 1), (79, 2)]          # D F# A G: left hanging on G
RESOLVE = [(79, 1), (78, 1), (76, 1), (74, 3)]        # G F# E D: home
POPS = [86, 88, 90, 91, 93, 95, 97, 98, 100, 102]     # one step higher each attempt


def melody(bus, t0, notes, inst='piano', vel=0.4, beat=BEAT, pan=0.0, octave=0):
    t = t0
    for m, b in notes:
        mm = m + 12 * octave
        if inst == 'piano': bus['music'].add(t, L.piano(mm, b * beat, vel), pan=pan)
        elif inst == 'celesta': bus['music'].add(t, celesta(mm, vel), pan=pan)
        elif inst == 'glock': bus['music'].add(t, glock(mm, vel), pan=pan)
        elif inst == 'cello': bus['music'].add(t, cello(mm, b * beat, vel), pan=pan)
        elif inst == 'harp': bus['music'].add(t, L.harp(mm, vel, 2.4), pan=pan)
        t += b * beat
    return t


def pad(bus, t0, dur, notes, vel=0.35, cut=1800, att=1.2):
    bus['music'].add(t0, L.strings(notes, dur, vel, att=att, cut=cut))


def pizz_bass(bus, t0, bars, chords, vel=0.45):
    for b in range(bars):
        ch = CH[chords[b % len(chords)]]
        for k, m in enumerate([ch[0], ch[1], ch[0] + 12, ch[1]]):
            bus['music'].add(t0 + b * BAR + k * BEAT, _pizz(m, vel * (1.0 if k == 0 else 0.7)), pan=-0.2)


def harp_arps(bus, t0, bars, chords, vel=0.25):
    for b in range(bars):
        ch = CH[chords[b % len(chords)]]
        seq = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 24, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12]
        for k, m in enumerate(seq):
            bus['music'].add(t0 + b * BAR + k * BEAT / 2, L.harp(m, vel, 2.0), pan=0.3)


# ------------------------------------------------------------------ events (shot-local)
MONTAGE = [(2, 'wall', False), (7, 'back', False), (15, 'wall', True), (23, 'lamp', False), (40, 'wall', False), (61, 'dive', False), (88, 'wall', True), (120, 'wall', False), (150, 'wall', False), (190, 'wall', True)]


def events():
    E = []; a = E.append
    for k in range(5): a(('s01_canvas', 0.2 + k * 0.44, 'scrape', 0.6))
    for k in range(6): a(('s01_canvas', 2.65 + k * 0.33, 'pop_c', 81 + [0, 2, 4, 5, 7, 9][k]))
    a(('s01_canvas', 2.6, 'fold', None)); a(('s01_canvas', 3.6, 'fold', None)); a(('s01_canvas', 5.0, 'rustle', 0.6)); a(('s01_canvas', 5.6, 'whoosh_up', None))
    a(('s02_tilt', 0.0, 'bed_day', 5.0)); a(('s03_first', 0.0, 'bed_day', 7.5))
    a(('s03_first', 1.7, 'throw', None)); a(('s03_first', 2.32, 'hit', 0)); a(('s03_first', 2.95, 'crumple', None))
    for i, (n, kind, kids) in enumerate(MONTAGE):
        t0 = i * BAR
        a(('s04_montage', t0 + 0.85, 'throw', None))
        if kind == 'wall': a(('s04_montage', t0 + 1.47, 'hit', i)); a(('s04_montage', t0 + 2.1, 'crumple', None))
        elif kind == 'back': a(('s04_montage', t0 + 1.6, 'pop', i)); a(('s04_montage', t0 + 2.45, 'crumple', None))
        elif kind == 'lamp': a(('s04_montage', t0 + 1.75, 'tink', i))
        elif kind == 'dive': a(('s04_montage', t0 + 1.85, 'pop', i)); a(('s04_montage', t0 + 1.85, 'crumple', None))
        if kids: a(('s04_montage', t0 + 1.6, 'laugh', 1.6))
    a(('s04_montage', 0.0, 'bed_day', 10.0)); a(('s04_montage', 10.0, 'wind', 5.0)); a(('s04_montage', 15.0, 'bed_snow', 5.0)); a(('s04_montage', 20.0, 'bed_day', 5.0))
    a(('s05_room', 0.0, 'ticks', 10.0))
    for k in range(4): a(('s05_room', 0.6 + k * 2.62, 'fold', None))
    a(('s06_213', 0.0, 'rain', 10.0)); a(('s06_213', 1.45, 'throw', None)); a(('s06_213', 2.55, 'splash', None)); a(('s06_213', 3.0, 'laugh', 3.0)); a(('s06_213', 4.6, 'rustle', 1.2))
    a(('s07_silence', 2.0, 'drip', None))
    a(('s08_sign', 0.0, 'birds', 10.0)); a(('s08_sign', 5.2, 'glint', None))
    for k in range(15): a(('s09_climb', 0.6 + k * 0.45, 'step', k))
    a(('s09_climb', 0.0, 'bed_day', 12.5)); a(('s09_climb', 9.0, 'fold', None))
    a(('s10_throw', 1.0, 'breath', None)); a(('s10_throw', 3.75, 'throw_big', None)); a(('s10_throw', 3.9, 'flutter', 3.6)); a(('s10_throw', 0.0, 'bed_day', 7.5))
    a(('s11_flight', 0.0, 'flutter', 9.5)); a(('s11_flight', 0.0, 'wind', 12.5)); a(('s11_flight', 6.5, 'rustle', 1.0)); a(('s11_flight', 9.5, 'catch', None))
    a(('s12_catch', 1.0, 'fold', None)); a(('s12_catch', 5.05, 'throw', None)); a(('s12_catch', 0.0, 'birds', 7.5))
    a(('s13_colour', 3.2, 'catch', None)); a(('s13_colour', 3.4, 'scrape', 4.2)); a(('s13_colour', 0.0, 'birds', 10.0))
    for i in range(8):
        if -2.0 + i * 1.1 + 0.2 >= 0: a(('s14_pattern', -2.0 + i * 1.1 + 0.2, 'throw', None))
    for i in range(8):
        t_ = -2.0 + i * 1.1 + 1.6
        if 0 <= t_ < 7.5: a(('s14_pattern', t_, 'pop2', i))
    a(('s14_pattern', 0.0, 'birds', 7.5))
    a(('s15_end', 0.4, 'scrape', 1.2)); a(('s15_end', 5.8, 'scrape', 1.2))
    return E


def make_sfx(kind, arg, bus, t):
    S, B = bus['sfx'], bus['bed']
    if kind == 'scrape': S.add(t, scrape(arg, 0.35))
    elif kind == 'pop_c': S.add(t, celesta(arg, 0.45), pan=0.2)
    elif kind == 'fold': S.add(t, _fold(0.3), pan=-0.1)
    elif kind == 'rustle': S.add(t, L.sfx_rustle(arg, 0.18))
    elif kind == 'whoosh_up': S.add(t, whoosh(0.9, 300, 3000, 0.15))
    elif kind == 'bed_day': B.add(t, L.sfx_wind(arg, 0.03) + L.sfx_babble(arg, 0.012))
    elif kind == 'bed_snow': B.add(t, L.lp(L.sfx_wind(arg, 0.04), 900))
    elif kind == 'wind': B.add(t, L.sfx_wind(arg, 0.09))
    elif kind == 'throw': S.add(t, whoosh(0.32, 700, 4500, 0.22), pan=0.1)
    elif kind == 'throw_big': S.add(t, whoosh(0.5, 300, 5000, 0.35))
    elif kind == 'hit': S.add(t, tap(0.45), pan=-0.1); bus['music'].add(t, glock(POPS[min(arg, 9)], 0.45), pan=0.15)
    elif kind == 'pop': bus['music'].add(t, glock(POPS[min(arg, 9)], 0.4), pan=0.15)
    elif kind == 'tink': S.add(t, L.bell(98, 0.25, 1.4), pan=0.5); bus['music'].add(t, glock(POPS[min(arg, 9)], 0.4), pan=0.15)
    elif kind == 'crumple': S.add(t, crumple(0.22), pan=-0.2)
    elif kind == 'laugh': B.add(t, laugh(arg, 0.18))
    elif kind == 'ticks': B.add(t, L.sfx_tick_bed(arg, 0.625, 0.05))
    elif kind == 'rain': B.add(t, L.bp(L.noise(arg), 1200, 9000) * 0.05 + L.lp(L.noise(arg), 500) * 0.03)
    elif kind == 'splash': S.add(t, splash(0.5))
    elif kind == 'drip': S.add(t, drip(0.6))
    elif kind == 'birds': B.add(t, L.sfx_birds(arg, 0.05))
    elif kind == 'glint': bus['music'].add(t, glock(98, 0.45), pan=0.3); bus['music'].add(t + 0.12, glock(102, 0.35), pan=0.3)
    elif kind == 'step': S.add(t, step_crunch(0.25), pan=-0.1); bus['music'].add(t, _pizz(62 + [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24][arg], 0.42), pan=0.2)
    elif kind == 'breath': S.add(t, L.sfx_breath() * 0.8)
    elif kind == 'flutter': S.add(t, flutter(arg, 0.07))
    elif kind == 'catch': S.add(t, tap(0.35)); S.add(t + 0.04, crumple(0.12, 0.15))
    elif kind == 'pop2': bus['music'].add(t, glock(93 if arg % 2 else 86, 0.4), pan=0.4 if arg % 2 else -0.4)


def music_master(bus):
    T = START
    # opening: a hush, then her motif on the piano as the wall rises
    melody(bus, T['s02_tilt'] + 1.25, MOTIF, 'piano', 0.42)
    pad(bus, T['s02_tilt'] + 0.6, 4.4, [50, 57, 62], 0.22, cut=1200)
    # attempt one: the pizzicato pulse enters
    pizz_bass(bus, T['s03_first'] + 2.5, 2, ['D', 'A'], 0.38)
    melody(bus, T['s03_first'] + 5.0, MOTIF, 'piano', 0.36)
    # the montage: pizz + harp, the motif every two bars, never resolved
    pizz_bass(bus, T['s04_montage'], 10, ['D', 'A', 'Bm', 'G'], 0.42)
    harp_arps(bus, T['s04_montage'] + BAR * 2, 8, ['D', 'A', 'Bm', 'G'], 0.2)
    for b in range(0, 10, 2): melody(bus, T['s04_montage'] + b * BAR, MOTIF, 'celesta' if b >= 4 else 'piano', 0.34)
    for b, ch in enumerate(['D', 'A', 'Bm', 'G'] * 3):
        if b < 10 and b >= 4: pad(bus, T['s04_montage'] + b * BAR, BAR, CH[ch][1:], 0.24, att=0.6)
    # night: a solo cello, the motif in minor
    t0 = T['s05_room'] + 0.6
    melody(bus, t0, [(59, 2), (62, 2), (66, 2), (64, 4), (62, 2), (59, 4)], 'cello', 0.5)
    for k, ch in enumerate(['Bm', 'G', 'D', 'A']): bus['music'].add(t0 + k * 2.5, L.piano(CH[ch][0], 2.4, 0.22), pan=-0.3)
    # rain, 213: the cello low and the piano falling, then nothing
    melody(bus, T['s06_213'] + 0.3, [(47, 8)], 'cello', 0.4)
    for k, m in enumerate([74, 71, 69, 66, 64]): bus['music'].add(T['s06_213'] + 0.6 + k * 0.9, L.piano(m, 0.9, 0.3), pan=0.1)
    # (s07: hard silence — handled in build)
    # the sun: strings swell, the motif on the celesta, still hanging
    pad(bus, T['s08_sign'] + 0.6, 9.2, [50, 57, 62, 64, 69], 0.32, att=2.5)
    melody(bus, T['s08_sign'] + 6.25, MOTIF, 'celesta', 0.4)
    # the climb: each step a pizz note higher (events), harp and strings building
    harp_arps(bus, T['s09_climb'] + 2.5, 3, ['D', 'G', 'A'], 0.2)
    pad(bus, T['s09_climb'] + 1.0, 6.5, [50, 57, 62, 66], 0.3, att=2.0)
    pad(bus, T['s09_climb'] + 7.5, 5.0, [45, 57, 62, 64], 0.34, att=0.8)
    melody(bus, T['s09_climb'] + 8.75, MOTIF, 'piano', 0.4)
    # the throw: hold the breath on the dominant, release on the beat
    pad(bus, T['s10_throw'] + 0.2, 3.55, [45, 52, 57, 61, 64], 0.36, att=1.5, cut=2400)
    bus['music'].add(T['s10_throw'] + 3.75, L.harp(93, 0.5, 3.0), pan=0.2)
    # the flight: the ensemble, the motif soaring, ends held on A
    t0 = T['s10_throw'] + 5.0
    harp_arps(bus, t0, 7, ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G'], 0.24)
    pizz_bass(bus, t0, 7, ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G'], 0.36)
    for b, ch in enumerate(['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G']): pad(bus, t0 + b * BAR, BAR, CH[ch][1:] + [CH[ch][3] + 12], 0.34, att=0.5)
    melody(bus, T['s11_flight'] + 1.25, MOTIF, 'piano', 0.42, octave=0); melody(bus, T['s11_flight'] + 5.0, MOTIF, 'glock', 0.4, octave=0)
    pad(bus, T['s11_flight'] + 9.4, 3.1, [45, 57, 61, 64, 69], 0.4, att=0.3)
    # the catch: playful
    pizz_bass(bus, T['s12_catch'] + 0.0, 3, ['A', 'D', 'A'], 0.34)
    for k, m in enumerate([81, 83, 85, 86, 88]): bus['music'].add(T['s12_catch'] + 2.5 + k * 0.3125, celesta(m, 0.3), pan=0.3)
    # colour: the motif resolves
    tR = T['s13_colour'] + 3.2
    melody(bus, tR, RESOLVE, 'piano', 0.48)
    melody(bus, tR, [(m - 12, b) for m, b in RESOLVE], 'cello', 0.45)
    pad(bus, tR, 6.6, [50, 57, 62, 66, 69, 74], 0.5, att=0.8, cut=2600)
    bus['sfx'].add(tR, L.drum(0.45))
    for k in range(14): bus['music'].add(tR + 0.2 + k * 0.07, L.harp(62 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31][k], 0.28, 2.4), pan=0.2)
    harp_arps(bus, T['s13_colour'] + 7.5, 1, ['D'], 0.24)
    # back and forth: joy
    t0 = T['s14_pattern']
    pizz_bass(bus, t0, 3, ['D', 'G', 'A'], 0.4); harp_arps(bus, t0, 3, ['D', 'G', 'A'], 0.24)
    for b, ch in enumerate(['D', 'G', 'A']): pad(bus, t0 + b * BAR, BAR, CH[ch][1:], 0.36, att=0.4)
    melody(bus, t0, MOTIF[:3] + [(79, 1), (78, 1), (76, 1), (74, 2)], 'glock', 0.36)
    # the end: the resolved motif on the piano, a last chord under the title
    melody(bus, T['s15_end'] + 0.6, MOTIF[:3] + RESOLVE, 'piano', 0.38)
    t_end = T['s15_end'] + 5.8
    bus['music'].add(t_end, L.strings([50, 57, 62, 66, 69, 74], 6.0, 0.5, att=0.8, rel=1.2, cut=2600))
    for m in (38, 50, 57, 62, 66): bus['music'].add(t_end, L.piano(m, 5.0, 0.36), pan=-0.1)
    bus['music'].add(t_end, glock(98, 0.35), pan=0.2)


def music_short(bus, st, dur):
    pizz_bass(bus, 0.0, 4, ['D', 'A', 'Bm', 'G'], 0.42)
    harp_arps(bus, BAR, 3, ['A', 'Bm', 'G'], 0.2)
    melody(bus, 0.0, MOTIF, 'piano', 0.36); melody(bus, BAR * 2, MOTIF, 'celesta', 0.34)
    melody(bus, st['s06_213'] + 0.2, [(47, 8)], 'cello', 0.4)
    pad(bus, st['s08_sign'], 6.0, [50, 57, 62, 64, 69], 0.3, att=2.0)
    melody(bus, st['s08_sign'] + 3.75, MOTIF, 'celesta', 0.38)
    pad(bus, st['s09_climb'], 6.0, [45, 57, 62, 64], 0.32, att=1.5)
    pad(bus, st['s10_throw'], 1.25, [45, 52, 57, 61, 64], 0.36, att=0.8)
    t0 = st['s11_flight']
    harp_arps(bus, t0, 4, ['D', 'Bm', 'G', 'A'], 0.24); pizz_bass(bus, t0, 4, ['D', 'Bm', 'G', 'A'], 0.36)
    for b, ch in enumerate(['D', 'Bm', 'G', 'A']): pad(bus, t0 + b * BAR, BAR, CH[ch][1:], 0.32, att=0.5)
    melody(bus, t0 + 1.25, MOTIF, 'piano', 0.42)
    tR = st['s13_colour'] + 1.7
    melody(bus, tR, RESOLVE, 'piano', 0.48); pad(bus, tR, dur - tR, [50, 57, 62, 66, 69, 74], 0.48, att=0.8, cut=2600)
    for k in range(14): bus['music'].add(tR + 0.2 + k * 0.07, L.harp(62 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31][k], 0.28, 2.4), pan=0.2)


def build(key):
    check_against_film()
    if key == 'master':
        dur = TOTAL
        bus = {'music': L.Bus(dur), 'sfx': L.Bus(dur), 'bed': L.Bus(dur)}
        for shot, lt, kind, arg in events():
            make_sfx(kind, arg, bus, START[shot] + lt)
        music_master(bus)
        silence = (START['s07_silence'], START['s08_sign'])
    else:
        st, segs, t = {}, [], 0.0
        for shot, a, b in SHORT:
            st[shot] = t; segs.append((shot, a, b, t)); t += b - a
        dur = t
        bus = {'music': L.Bus(dur), 'sfx': L.Bus(dur), 'bed': L.Bus(dur)}
        for shot, lt, kind, arg in events():
            for s_, a, b, t0 in segs:
                if s_ == shot and a <= lt < b:
                    if isinstance(arg, float) and kind in ('rain', 'birds', 'wind', 'bed_day', 'bed_snow', 'ticks', 'flutter', 'laugh'): arg = min(arg, b - lt)
                    make_sfx(kind, arg, bus, t0 + lt - a)
        music_short(bus, st, dur)
        silence = None
    irL, irR = L.reverb_ir(2.2)
    mL, mR = bus['music'].L, bus['music'].R
    mus = np.vstack([mL * 0.8 + signal.fftconvolve(mL, irL)[:len(mL)] * 0.45, mR * 0.8 + signal.fftconvolve(mR, irR)[:len(mR)] * 0.45])
    sL, sR = bus['sfx'].L, bus['sfx'].R
    sfx = np.vstack([sL + signal.fftconvolve(sL, irL[: int(0.6 * SR)])[:len(sL)] * 0.15, sR + signal.fftconvolve(sR, irR[: int(0.6 * SR)])[:len(sR)] * 0.15])
    bed = np.vstack([bus['bed'].L, bus['bed'].R])
    norm = lambda x: x / (np.percentile(np.abs(x), 99.9) + 1e-9)
    mix = norm(mus) * 0.85 + norm(sfx) * 0.62 + norm(bed) * 0.2
    n = int(round(dur * SR)); mix = mix[:, :n]
    if silence:   # the hard silence: music and beds to digital zero, one drip
        a, b = int(silence[0] * SR), int(silence[1] * SR)
        fade = int(0.08 * SR)
        mix[:, a - fade:a] *= np.linspace(1, 0, fade)
        keep = np.zeros_like(mix[:, a:b])
        d0 = int((silence[0] + 2.0) * SR) - a
        dr = drip(0.6) * 0.5; keep[:, d0:d0 + len(dr)] = dr[: keep.shape[1] - d0]
        mix[:, a:b] = keep
    f = int(0.4 * SR); mix[:, -f:] *= np.linspace(1, 0, f)
    mix = L.hp(mix, 25)
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.5
    return mix.astype(np.float32), dur


if __name__ == '__main__':
    key, out = sys.argv[1], sys.argv[2]
    mix, dur = build(key)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    wavfile.write(out, SR, mix.T)
    print(key, 'audio', round(mix.shape[1] / SR, 2), 's ->', out)
