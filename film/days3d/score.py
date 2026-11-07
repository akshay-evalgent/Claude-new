"""30,000 DAYS: score and sound, synthesised and placed on the picture's clock.

Reuses the LANTERN instrument library (felt piano, music box, bells, plucked strings,
soft strings, drums). Themes:
  * DAYS: the main theme, D major, 80 BPM (beat 0.75 s); minor and sparse while he waits,
    full at the comeback and the end.
  * The neighbour's waltz, 3/4 through a gramophone, which becomes the full score on the roof.
  * His guitar: plucked chords that start as one chord he never finishes.

  python3 score.py master out/audio/master_mix.wav
  python3 score.py short  out/audio/short_mix.wav
"""
import math
import os
import re
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location('lantern_score', os.path.join(HERE, '..', 'lantern', 'score.py'))
L = importlib.util.module_from_spec(_spec)   # the LANTERN instrument library
_spec.loader.exec_module(L)

SR = L.SR
BEAT = 0.75
RNG = np.random.default_rng(30000)

# ------------------------------------------------------------------ the picture's clock
SHOTS = [('s01_lock', 6), ('s02_card1', 6), ('s03_swipes', 9), ('s04_mom', 5), ('s05_timelapse', 14), ('s06_feed', 6),
         ('s07_card2', 7), ('s08_reach', 7), ('s09_dream', 10), ('s10_eye', 3), ('s11_box', 2), ('s12_panic', 12),
         ('s13_wake', 3), ('s14_door', 5), ('s15_roof', 15), ('s16_choice', 5), ('s17_comeback', 20), ('s18_midnight', 10),
         ('s19_sleep', 8), ('s20_flash', 3), ('s21_end', 9)]
START = {}
_t = 0.0
for _n, _d in SHOTS:
    START[_n] = _t
    _t += _d
TOTAL = _t   # 165 s

# the Short: (shot, from, to) in shot time, played back to back
SHORT = [('s01_lock', 0.0, 5.0), ('s05_timelapse', 1.5, 9.5), ('s12_panic', 0.2, 7.2), ('s15_roof', 3.0, 11.5),
         ('s16_choice', 0.8, 4.8), ('s17_comeback', 2.0, 10.5), ('s18_midnight', 2.4, 8.4), ('s21_end', 0.0, 5.2)]


def check_against_film():
    """The durations here must match js/film.js."""
    src = open(os.path.join(HERE, 'js', 'film.js')).read()
    found = dict((m.group(1), float(m.group(2))) for m in re.finditer(r"^\s{2}(s\d\d_\w+): \{ dur: ([\d.]+)", src, re.M))
    for n, d in SHOTS:
        assert found.get(n) == d, f'{n}: film.js says {found.get(n)}, score says {d}'
    assert len(found) == len(SHOTS), 'shot count differs'


# ------------------------------------------------------------------ instruments and sounds
def guitar(m, vel=0.5, d=3.0):
    return L.harp(m, vel, d) * 1.1


def strum(chord, vel=0.5, down=True, spread=0.018):
    notes = chord if down else chord[::-1]
    n = int(3.4 * SR)
    out = np.zeros(n)
    for i, m in enumerate(notes):
        x = guitar(m, vel * (0.85 + 0.15 * (i == 0)), 3.0)
        j = int(i * spread * SR)
        out[j:j + len(x)] += x[:n - j]
    return out


def glass(m=96, vel=0.4):          # the marble's tink
    return L.bell(m, vel, 1.2) * 1.4


def chime(ms, vel=0.4, gap=0.07):
    n = int((len(ms) * gap + 3.0) * SR)
    out = np.zeros(n)
    for i, m in enumerate(ms):
        x = L.bell(m, vel, 3.0)
        j = int(i * gap * SR)
        out[j:j + len(x)] += x[:n - j]
    return out


def whoosh(d=0.25, lo=600, hi=5000, up=True, gain=0.3):
    n = int(d * SR)
    nz = L.noise(d)
    out = np.zeros(n)
    steps = 8
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        f = lo * (hi / lo) ** ((k / steps) if up else (1 - k / steps))
        out[a:b] = L.bp(nz, f * 0.6, f * 1.6)[a:b]
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return out * e * gain


def riser(d=1.2, gain=0.25):
    return whoosh(d, 300, 7000, True, gain)


def boom(gain=0.9):
    d = 2.4
    t = L.tt(int(d * SR))
    f = 38 + 50 * np.exp(-t * 6)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.8) + L.lp(L.noise(d), 500) * np.exp(-t * 4) * 0.7
    return x * gain


def taiko(vel=0.6):
    d = 0.7
    t = L.tt(int(d * SR))
    f = 70 + 60 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + L.bp(L.noise(d), 200, 1200) * np.exp(-t * 30) * 0.4
    return x * vel


def snare(vel=0.4):
    d = 0.3
    t = L.tt(int(d * SR))
    return (L.bp(L.noise(d), 1500, 7000) * np.exp(-t * 22) + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5) * vel


def hat(vel=0.15):
    d = 0.08
    t = L.tt(int(d * SR))
    return L.hp(L.noise(d), 7000) * np.exp(-t * 70) * vel


def bass(m, dur, vel=0.5):
    f = L.midi(m)
    n = int((dur + 0.3) * SR)
    t = L.tt(n)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    e = np.minimum(1, t / 0.01) * np.exp(-t * 1.2)
    e[int(dur * SR):] *= np.linspace(1, 0, n - int(dur * SR))
    return x * e * vel * 0.5


def ringtone(d):
    out = np.zeros(int(d * SR))
    pat = [79, 83, 86, 83, 79, 83, 86, 91]
    t = 0.0
    k = 0
    while t < d - 0.2:
        x = L.musicbox(pat[k % 8] - 12, 0.9)
        i = int(t * SR)
        out[i:i + len(x)] += x[:len(out) - i]
        t += 0.16 if (k % 8) < 7 else 0.6
        k += 1
    return out


def crackle(d, gain=0.02):
    n = int(d * SR)
    x = L.lp(L.noise(d), 4000) * 0.15
    clicks = (RNG.random(n) > 0.9993).astype(float) * RNG.uniform(-1, 1, n)
    return (x + L.hp(clicks, 1000) * 3) * gain


def crowd(d, gain=0.08):
    x = L.sfx_babble(d, 1.0)
    t = L.tt(len(x))
    swell = 0.6 + 0.4 * np.sin(2 * np.pi * 0.35 * t) ** 2
    cheer = L.bp(L.noise(d), 700, 4000) * swell * 0.25
    return (x + cheer) * gain


# ------------------------------------------------------------------ harmony
CH = {'D': [50, 57, 62, 66], 'A': [45, 57, 61, 64], 'Bm': [47, 54, 59, 62], 'G': [43, 55, 59, 62], 'F#m': [42, 57, 61, 66],
      'Em': [40, 55, 59, 64], 'A/C#': [49, 57, 61, 64]}
GUIT = {'D': [50, 57, 62, 66, 69], 'A': [45, 52, 57, 61, 64], 'Bm': [47, 54, 59, 62, 66], 'G': [43, 50, 55, 59, 67], 'Em': [40, 47, 52, 55, 59]}
# DAYS theme: 4 bars of 4 beats
DAYS = [(74, 1), (73, 0.5), (71, 0.5), (69, 2), (66, 1), (67, 1), (69, 2), (71, 1), (69, 0.5), (67, 0.5), (66, 2), (64, 1), (66, 1), (62, 2)]
DAYS_CH = ['D', 'Bm', 'G', 'A']
DAYS_MINOR_CH = ['Bm', 'G', 'D', 'A']
WALTZ = [(66, 2), (69, 1), (74, 3), (73, 2), (71, 1), (69, 3), (67, 2), (71, 1), (76, 3), (74, 2), (73, 1), (74, 3)]
WALTZ_CH = ['D', 'D', 'A', 'A', 'G', 'G', 'A', 'D']


def melody(bus, t0, notes, inst='piano', vel=0.45, beat=BEAT, octave=0, until=None, pan=-0.1):
    t = t0
    for m, b in notes:
        if until is not None and t >= until:
            break
        mm = m + 12 * octave
        if inst == 'piano':
            bus['music'].add(t, L.piano(mm, b * beat, vel), pan=pan)
        elif inst == 'box':
            bus['music'].add(t, L.musicbox(mm + 12, vel), pan=0.3)
        elif inst == 'guitar':
            bus['music'].add(t, guitar(mm, vel), pan=0.15)
        elif inst == 'bell':
            bus['music'].add(t, L.bell(mm + 12, vel, 3.0), pan=0.2)
        t += b * beat
    return t


def pad(bus, t0, dur, chord, vel=0.35, cut=1800, att=1.4):
    bus['music'].add(t0, L.strings(chord, dur, vel, att=att, cut=cut))


def left_hand(bus, t0, chords, vel=0.3, beat=BEAT, per=4, arp=True):
    t = t0
    for ch in chords:
        notes = CH[ch]
        if arp:
            seq = [notes[0], notes[2], notes[3], notes[2]] * (per // 4) if per >= 4 else notes[:per]
            for i, m in enumerate(seq):
                bus['music'].add(t + i * beat, L.piano(m, beat * 1.5, vel * (1.0 if i == 0 else 0.7)), pan=-0.25)
        else:
            for m in notes:
                bus['music'].add(t, L.piano(m, beat * per, vel * 0.8), pan=-0.25)
        t += per * beat
    return t


def days_theme(bus, t0, mode='major', vel=0.45, strings=True, inst='piano', reps=1, octave=0):
    t = t0
    chs = DAYS_CH if mode == 'major' else DAYS_MINOR_CH
    for _ in range(reps):
        notes = DAYS if mode == 'major' else [(m - (3 if m % 12 in (6, 11) else 0), b) for m, b in DAYS]
        melody(bus, t, notes, inst, vel, octave=octave)
        left_hand(bus, t, chs, vel * 0.6)
        if strings:
            for i, ch in enumerate(chs):
                pad(bus, t + i * 4 * BEAT, 4 * BEAT, CH[ch][1:], vel * 0.7)
        t += 16 * BEAT
    return t


def waltz(bus, t0, bars, beat=0.42, vel=0.4, gramophone=False, full=False):
    t = t0
    seq = WALTZ * 3
    mel_t = t
    for m, b in seq:
        if mel_t >= t0 + bars * 3 * beat:
            break
        x = L.piano(m, b * beat, vel) if not gramophone else L.musicbox(m, vel * 1.2)
        bus['music'].add(mel_t, x, pan=0.1)
        mel_t += b * beat
    for k in range(bars):
        ch = CH[WALTZ_CH[k % 8]]
        tb = t + k * 3 * beat
        bus['music'].add(tb, L.piano(ch[0] - (0 if gramophone else 0), beat, vel * 0.6), pan=-0.3)
        for j in (1, 2):
            for m in ch[1:3]:
                bus['music'].add(tb + j * beat, L.piano(m + 12, beat * 0.6, vel * 0.32), pan=-0.1)
        if full:
            pad(bus, tb, 3 * beat, ch[1:], vel * 0.6, att=0.5)
    return t + bars * 3 * beat


def guitar_theme(bus, t0, dur, vel=0.45, chords=('D', 'A', 'Bm', 'G'), per=4, pattern=(0, 2, 3, 4, 1, 3, 2, 4)):
    """Fingerpicked arpeggios: eight notes a bar."""
    t = t0
    k = 0
    while t < t0 + dur - 0.01:
        ch = GUIT[chords[k % len(chords)]]
        for i, p in enumerate(pattern):
            tt_ = t + i * BEAT * per / len(pattern)
            if tt_ >= t0 + dur:
                break
            bus['music'].add(tt_, guitar(ch[p], vel * (1.0 if i == 0 else 0.75)), pan=0.15 + 0.1 * (i % 2))
        t += per * BEAT
        k += 1


# ------------------------------------------------------------------ events (shot-local times)
SW = [[x + i * 0.31 for x in (0.55, 1.55, 2.55, 3.45, 4.3, 5.1, 5.85, 6.55, 7.2, 7.8, 8.35)] for i in range(3)]


def events():
    """(shot, local time, kind, args)"""
    E = []
    a = E.append
    # s01 lock
    a(('s01_lock', 0.0, 'roomtone', 6.0)); a(('s01_lock', 0.45, 'buzz', 0.4)); a(('s01_lock', 0.5, 'notif', None)); a(('s01_lock', 1.55, 'buzz', 0.4))
    a(('s01_lock', 3.85, 'tap', None)); a(('s01_lock', 4.15, 'whoosh_s', None)); a(('s01_lock', 4.4, 'toast', None))
    # s02 card
    a(('s02_card1', 0.0, 'roomtone', 6.0)); a(('s02_card1', 0.5, 'card', 0))
    # s03 swipes: a swipe and a tink for each
    for i, arr in enumerate(SW):
        for s0 in arr:
            a(('s03_swipes', s0, 'swipe', i - 1)); a(('s03_swipes', s0 + 0.15, 'tink', i - 1))
    # s04 mom
    a(('s04_mom', 0.15, 'ring', 2.8)); a(('s04_mom', 2.75, 'tap', None)); a(('s04_mom', 3.1, 'hangup', None)); a(('s04_mom', 3.25, 'tink', 0.3))
    # s05 years
    a(('s05_timelapse', 0.0, 'ticks', 14.0))
    for i in range(40):
        a(('s05_timelapse', i * 0.34 + 0.2, 'coldtink', i))
    for k in range(5):
        a(('s05_timelapse', 0.3 + k * 3.1, 'dayswoosh', k))
    for k in range(12):
        a(('s05_timelapse', (k + 0.0) / 11.5 * 14 * 0.98 + 0.2, 'boxdrop', k))
    # s06 feed
    a(('s06_feed', 0.0, 'pings', 6.0)); a(('s06_feed', 4.6, 'riser', 1.3))
    # s07 card two
    a(('s07_card2', 0.0, 'roomtone', 7.0)); a(('s07_card2', 0.6, 'card', 1))
    # s08 reach
    a(('s08_reach', 2.1, 'rustle', 0.8)); a(('s08_reach', 3.3, 'rustle', 1.2)); a(('s08_reach', 5.65, 'firstchord', None)); a(('s08_reach', 6.2, 'riser', 0.8))
    # s09 dream
    a(('s09_dream', 0.0, 'crowd', 10.0)); a(('s09_dream', 9.3, 'suck', None))
    # s10 eye
    a(('s10_eye', 0.4, 'heart', 0.7)); a(('s10_eye', 1.4, 'heart', 0.85)); a(('s10_eye', 0.0, 'ring_tone', 3.0))
    # s11 box
    a(('s11_box', 0.45, 'thud', 0.4)); a(('s11_box', 0.5, 'jangle', None)); a(('s11_box', 1.0, 'slam', None))
    # s12 panic
    a(('s12_panic', 0.0, 'rumble', 12.0)); a(('s12_panic', 0.3, 'stab', None)); a(('s12_panic', 0.0, 'cascade', 11.4))
    for k in range(14):
        a(('s12_panic', 0.6 + k * 0.78, 'boxthud', k))
    a(('s12_panic', 10.5, 'boom', None))
    # s13 wake
    a(('s13_wake', 0.3, 'gasp', None)); a(('s13_wake', 0.0, 'roomtone', 3.0)); a(('s13_wake', 1.4, 'crackle', 1.6))
    # s14 door
    a(('s14_door', 0.6, 'creak', None)); a(('s14_door', 0.0, 'crackle', 5.0)); a(('s14_door', 0.0, 'night', 5.0))
    # s15 roof
    a(('s15_roof', 0.0, 'night', 15.0)); a(('s15_roof', 0.0, 'crackle', 15.0)); a(('s15_roof', 3.6, 'tagup', None)); a(('s15_roof', 7.2, 'tagdown', None))
    a(('s15_roof', 10.8, 'warmswell', None))
    # s16 choice
    a(('s16_choice', 0.6, 'rustle', 0.8)); a(('s16_choice', 1.5, 'rip', None)); a(('s16_choice', 0.0, 'roomtone', 5.0))
    # s17 comeback
    for n0 in (3.4, 8.4, 13.4, 18.0):
        a(('s17_comeback', n0, 'rise', 1.6)); a(('s17_comeback', n0 + 1.6, 'kira', None))
    a(('s17_comeback', 10.5, 'typing', 1.2))
    # s18 midnight
    a(('s18_midnight', 0.0, 'ticks', 8.0)); a(('s18_midnight', 1.2, 'lid', None)); a(('s18_midnight', 2.6, 'rise', 4.4)); a(('s18_midnight', 6.8, 'kira', None))
    a(('s18_midnight', 8.0, 'notif', None)); a(('s18_midnight', 0.0, 'night', 10.0))
    # s19 sleep
    a(('s19_sleep', 0.0, 'night', 8.0)); a(('s19_sleep', 2.6, 'shoot', None))
    # s20 flash
    a(('s20_flash', 0.0, 'night', 3.0)); a(('s20_flash', 0.05, 'shimmer', 2.8))
    # s21 end
    a(('s21_end', 5.4, 'title', None))
    return E


def make_sfx(kind, arg, bus, t):
    S = bus['sfx']
    if kind == 'roomtone':
        bus['bed'].add(t, L.sfx_hum(arg, 60, 0.008) + L.lp(L.noise(arg), 400) * 0.004)
    elif kind == 'night':
        bus['bed'].add(t, L.sfx_crickets(arg, 0.012) + L.sfx_wind(arg, 0.05))
    elif kind == 'buzz':
        S.add(t, L.sfx_buzz(arg) * 1.6, pan=-0.3)
    elif kind == 'notif':
        S.add(t, chime([88, 93], 0.35, 0.09), pan=-0.2)
    elif kind == 'tap':
        S.add(t, L.sfx_click() * 1.2, pan=-0.2)
    elif kind == 'whoosh_s':
        S.add(t, whoosh(0.22, 1500, 6000, False, 0.12), pan=-0.2)
    elif kind == 'toast':
        S.add(t, L.bell(84, 0.2, 1.0), pan=-0.2)
    elif kind == 'card':
        S.add(t, chime([74, 81, 86] if arg == 0 else [71, 78, 83], 0.4, 0.06), pan=0.0)
        S.add(t, L.drum(0.35))
    elif kind == 'swipe':
        S.add(t, whoosh(0.2, 1200, 5000, True, 0.08), pan=arg * 0.6)
    elif kind == 'tink':
        S.add(t, glass(96 + (3 if (isinstance(arg, (int, float)) and arg > 0) else 0), 0.45), pan=(arg if isinstance(arg, (int, float)) else 0) * 0.6)
    elif kind == 'ring':
        S.add(t, ringtone(arg) * 0.9, pan=-0.2)
    elif kind == 'hangup':
        S.add(t, L.sfx_bloop(True) * 0.8, pan=-0.2)
    elif kind == 'ticks':
        bus['bed'].add(t, L.sfx_tick_bed(arg, 0.375, 0.05))
    elif kind == 'coldtink':
        S.add(t, glass(91 - (arg % 3) * 2, 0.16), pan=0.4)
    elif kind == 'dayswoosh':
        S.add(t, whoosh(1.4, 200, 2400, arg % 2 == 0, 0.06), pan=0.3)
    elif kind == 'boxdrop':
        S.add(t, L.sfx_thud(0.25), pan=0.35)
    elif kind == 'pings':
        for k in range(28):
            tk = t + (k / 28) ** 0.7 * arg
            S.add(tk, chime([88 + (k * 5) % 12, 93 + (k * 7) % 10], 0.12 + 0.012 * k, 0.05), pan=RNG.uniform(-0.9, 0.9))
        bus['bed'].add(t, L.sfx_shimmer(arg, 0.05))
    elif kind == 'riser':
        S.add(t, riser(arg, 0.22))
    elif kind == 'rustle':
        S.add(t, L.sfx_rustle(arg, 0.22), pan=-0.1)
    elif kind == 'firstchord':
        bus['music'].add(t, strum(GUIT['D'], 0.7) * 1.2, pan=0.1)
    elif kind == 'crowd':
        bus['bed'].add(t, crowd(arg, 0.12))
    elif kind == 'suck':
        S.add(t, whoosh(0.45, 6000, 300, True, 0.3))
    elif kind == 'heart':
        S.add(t, L.heartbeat(arg) * 1.4)
    elif kind == 'ring_tone':
        n = int(arg * SR)
        tt_ = L.tt(n)
        S.add(t, np.sin(2 * np.pi * 3900 * tt_) * 0.008 * np.minimum(1, tt_ / 0.5))
    elif kind == 'thud':
        S.add(t, L.sfx_thud(arg))
    elif kind == 'jangle':
        S.add(t, strum([52, 57, 62, 67, 71], 0.25, True, 0.006) * 0.7)
    elif kind == 'slam':
        S.add(t, L.sfx_thud(0.9))
        S.add(t, L.bp(L.noise(0.15), 300, 3000) * np.exp(-L.tt(int(0.15 * SR)) * 30) * 0.5)
    elif kind == 'rumble':
        bus['bed'].add(t, L.lp(L.noise(arg), 120) * 0.12 * np.minimum(1, L.tt(int(arg * SR)) / 0.5))
    elif kind == 'stab':
        S.add(t, boom(0.6))
    elif kind == 'cascade':
        k = 0
        tk = t
        while tk < t + arg:
            S.add(tk, glass(88 + RNG.integers(0, 14), 0.08 + 0.05 * RNG.random()), pan=RNG.uniform(-0.6, 0.8))
            tk += RNG.uniform(0.02, 0.07)
            k += 1
    elif kind == 'boxthud':
        S.add(t, L.sfx_thud(0.45 + 0.2 * RNG.random()), pan=RNG.uniform(-0.7, 0.7))
    elif kind == 'boom':
        S.add(t, boom(1.0))
    elif kind == 'gasp':
        S.add(t, L.sfx_breath() * 1.6)
    elif kind == 'crackle':
        bus['bed'].add(t, crackle(arg, 0.03))
    elif kind == 'creak':
        S.add(t, L.sfx_creak() * 1.2, pan=-0.4)
    elif kind == 'tagup':
        S.add(t, chime([86, 90, 93, 98], 0.35, 0.06), pan=0.4)
    elif kind == 'tagdown':
        S.add(t, chime([83, 79], 0.3, 0.14), pan=-0.4)
    elif kind == 'warmswell':
        pad(bus, t, 2.5, [62, 66, 69, 74], 0.5, att=0.4)
    elif kind == 'rip':
        S.add(t, L.sfx_rip() * 1.3)
    elif kind == 'rise':
        n = 7
        for i in range(n):
            S.add(t + i * arg / n, L.bell(81 + [0, 2, 4, 7, 9, 12, 14][i], 0.18 + 0.03 * i, 2.0), pan=0.3)
    elif kind == 'kira':
        S.add(t, chime([98, 102, 105], 0.3, 0.05), pan=0.4)
    elif kind == 'typing':
        S.add(t, L.sfx_typing(arg) * 0.6, pan=-0.3)
    elif kind == 'lid':
        S.add(t, L.sfx_rustle(0.5, 0.15), pan=0.2); S.add(t + 0.3, L.sfx_click() * 0.5, pan=0.2)
    elif kind == 'shoot':
        S.add(t, chime([93, 98], 0.25, 0.1), pan=-0.5)
        S.add(t, whoosh(1.2, 2000, 7000, True, 0.04), pan=-0.3)
    elif kind == 'shimmer':
        bus['bed'].add(t, L.sfx_shimmer(arg, 0.06))
    elif kind == 'title':
        S.add(t, chime([74, 81, 86, 90], 0.35, 0.08))


# ------------------------------------------------------------------ music cues (master time)
def music_master(bus):
    T = START
    # card one into the swipes: the DAYS theme in minor, sparse piano, cold strings
    t = T['s02_card1'] + 0.5
    days_theme(bus, t, 'minor', vel=0.32, strings=True)
    pad(bus, T['s01_lock'] + 4.4, 2.2, [45, 57, 64], 0.25)
    # the years: arpeggios faster, the minor theme on the music box
    t = T['s04_mom'] + 3.6
    left_hand(bus, t, ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'A'], vel=0.25, beat=BEAT * 0.5, per=8)
    melody(bus, T['s05_timelapse'] + 1.0, [(m - (3 if m % 12 in (6, 11) else 0), b) for m, b in DAYS], 'box', 0.35, until=T['s06_feed'] - 0.3)
    for i, ch in enumerate(['Bm', 'G', 'D', 'A']):
        pad(bus, T['s05_timelapse'] + 0.5 + i * 3.4, 3.4, CH[ch][1:], 0.28, cut=1400)
    # card two: lonely
    for k, m in enumerate([71, 69, 66, 64]):
        bus['music'].add(T['s07_card2'] + 0.6 + k * 1.5, L.piano(m, 1.4, 0.42), pan=-0.1)
    pad(bus, T['s07_card2'] + 0.4, 6.0, [47, 54, 62], 0.34, cut=1200)
    pad(bus, T['s08_reach'] + 0.2, 5.2, [43, 50, 59], 0.3, cut=1200)
    # the daydream: the band
    t0 = T['s09_dream']
    seq = ['D', 'A', 'Bm', 'G'] * 3
    for k in range(int(10 / (2 * BEAT)) + 1):
        tb = t0 + k * 2 * BEAT
        if tb > t0 + 9.3:
            break
        ch = seq[k % len(seq)]
        bus['music'].add(tb, strum(GUIT[ch], 0.55, True), pan=0.15)
        bus['music'].add(tb + BEAT, strum(GUIT[ch], 0.4, False), pan=0.15)
        bus['music'].add(tb, bass(CH[ch][0] - 12, 2 * BEAT, 0.6), pan=0.0)
        bus['sfx'].add(tb, L.drum(0.45)); bus['sfx'].add(tb + BEAT, snare(0.35))
        for h in range(4):
            bus['sfx'].add(tb + h * BEAT / 2, hat(0.1), pan=0.3)
        pad(bus, tb, 2 * BEAT, CH[ch][1:], 0.4, att=0.3)
    melody(bus, t0 + 0.0, DAYS, 'bell', 0.35, until=t0 + 9.2)
    # panic: taiko eighths and low stabs
    t0 = T['s12_panic']
    k = 0
    while t0 + k * 0.2 < T['s12_panic'] + 10.4:
        tk = t0 + k * 0.2
        bus['sfx'].add(tk, taiko(0.42 if k % 4 == 0 else 0.22), pan=0.0)
        if k % 8 == 0:
            bus['music'].add(tk, L.strings([38, 45, 50], 1.4, 0.7, att=0.05, cut=900))
        k += 1
    # the waltz comes through the ceiling, then opens up on the roof
    t0 = T['s13_wake'] + 1.4
    waltz(bus, t0, 4, gramophone=True, vel=0.25)
    t1 = T['s14_door'] + 0.2
    waltz(bus, t1, 4, gramophone=True, vel=0.32)
    t2 = T['s14_door'] + 0.2 + 4 * 3 * 0.42
    waltz(bus, t2, int((T['s16_choice'] - t2) / (3 * 0.42)), vel=0.42, full=True)
    # the choice: one guitar note at a time
    pad(bus, T['s16_choice'] + 0.2, 4.6, [50, 57, 62, 66], 0.32, cut=1600)
    t0 = T['s16_choice'] + 2.0
    melody(bus, t0, [(62, 1), (66, 1), (69, 2)], 'guitar', 0.5)
    # comeback: his guitar theme with the DAYS melody, building
    t0 = T['s17_comeback']
    guitar_theme(bus, t0, 20.0, 0.42)
    days_theme(bus, t0 + 4 * 4 * BEAT * 0 + 0.0, 'major', vel=0.36, strings=False, reps=1)
    days_theme(bus, t0 + 16 * BEAT, 'major', vel=0.44, strings=True, reps=1)
    for k in range(int(8 / (BEAT * 2))):
        tb = t0 + 12 + k * 2 * BEAT
        bus['sfx'].add(tb, L.drum(0.25)); bus['sfx'].add(tb + BEAT, snare(0.16))
    # midnight: the theme's first phrase on the music box
    melody(bus, T['s18_midnight'] + 2.6, DAYS[:7], 'box', 0.32)
    pad(bus, T['s18_midnight'] + 2.0, 6.5, [50, 57, 62, 66], 0.2, cut=1500)
    # sleep, flash-forward and the end: the full theme, then the last chord
    t0 = T['s19_sleep']
    days_theme(bus, t0, 'major', vel=0.4, strings=True, reps=1)
    melody(bus, t0 + 16 * BEAT, [(74, 2), (73, 1), (71, 1), (69, 4)], 'piano', 0.4)
    pad(bus, t0 + 16 * BEAT, 4 * BEAT, CH['G'][1:], 0.45)
    t_end = T['s21_end'] + 0.3
    bus['music'].add(t_end, L.strings([50, 57, 62, 66, 69, 74], 8.0, 0.55, att=1.0, rel=2.5, cut=2600))
    for m in (38, 50, 57, 62, 66):
        bus['music'].add(t_end, L.piano(m, 5.0, 0.4), pan=-0.1)
    melody(bus, T['s21_end'] + 2.2, [(69, 2), (74, 6)], 'piano', 0.42)


def music_short(bus, edl_starts):
    """The Short gets one continuous piece: the DAYS theme, cold, then the panic, then major."""
    s = edl_starts
    days_theme(bus, s['s05_timelapse'] - 0.6, 'minor', vel=0.34, strings=True)
    k = 0
    t0 = s['s12_panic']
    while k * 0.2 < 6.8:
        bus['sfx'].add(t0 + k * 0.2, taiko(0.42 if k % 4 == 0 else 0.22))
        k += 1
    waltz(bus, s['s15_roof'], int(8.5 / (3 * 0.42)), vel=0.4, full=True)
    guitar_theme(bus, s['s16_choice'] + 1.0, s['s21_end'] - s['s16_choice'] - 1.0, 0.42)
    days_theme(bus, s['s17_comeback'], 'major', vel=0.42, strings=True)
    te = s['s21_end'] + 0.2
    bus['music'].add(te, L.strings([50, 57, 62, 66, 69], 4.5, 0.5, att=0.6, rel=1.0, cut=2600))


# ------------------------------------------------------------------ build
def build(key):
    check_against_film()
    if key == 'master':
        dur = TOTAL
        bus = {'music': L.Bus(dur), 'sfx': L.Bus(dur), 'bed': L.Bus(dur)}
        for shot, lt, kind, arg in events():
            make_sfx(kind, arg, bus, START[shot] + lt)
        music_master(bus)
    else:
        starts, t = {}, 0.0
        segs = []
        for shot, a, b in SHORT:
            starts[shot] = t
            segs.append((shot, a, b, t))
            t += b - a
        dur = t
        bus = {'music': L.Bus(dur), 'sfx': L.Bus(dur), 'bed': L.Bus(dur)}
        for shot, lt, kind, arg in events():
            for s_, a, b, t0 in segs:
                if s_ == shot and a <= lt < b:
                    make_sfx(kind, arg if not isinstance(arg, float) or kind not in ('roomtone', 'night', 'ticks', 'crackle', 'rumble', 'crowd') else min(arg, b - lt), bus, t0 + lt - a)
        music_short(bus, starts)
    irL, irR = L.reverb_ir()
    mL, mR = bus['music'].L, bus['music'].R
    wetL = signal.fftconvolve(mL, irL)[:len(mL)]
    wetR = signal.fftconvolve(mR, irR)[:len(mR)]
    mus = np.vstack([mL * 0.8 + wetL * 0.5, mR * 0.8 + wetR * 0.5])
    sL, sR = bus['sfx'].L, bus['sfx'].R
    swl = signal.fftconvolve(sL, irL[: int(0.8 * SR)])[:len(sL)]
    swr = signal.fftconvolve(sR, irR[: int(0.8 * SR)])[:len(sR)]
    sfx = np.vstack([sL + swl * 0.2, sR + swr * 0.2])
    bed = np.vstack([bus['bed'].L, bus['bed'].R])
    mus = mus / (np.percentile(np.abs(mus), 99.9) + 1e-9)
    sfx = sfx / (np.percentile(np.abs(sfx), 99.9) + 1e-9)
    bed = bed / (np.percentile(np.abs(bed), 99.9) + 1e-9)
    mix = mus * 0.85 + sfx * 0.7 + bed * 0.22
    n = int(round(dur * SR))
    mix = mix[:, :n]
    f = int(0.3 * SR)
    mix[:, -f:] *= np.linspace(1, 0, f)
    mix = L.hp(mix, 25)
    # soft knee limiter so single hits don't set the loudness
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.5
    return mix.astype(np.float32), dur


if __name__ == '__main__':
    key, out = sys.argv[1], sys.argv[2]
    mix, dur = build(key)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    wavfile.write(out, SR, mix.T)
    print(key, 'audio', round(mix.shape[1] / SR, 2), 's ->', out)
