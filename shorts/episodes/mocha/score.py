"""Score + sound design for the MoCha short. Run: python3 score.py  ->  out/audio.wav

Music is laid on a 120 BPM grid whose bars start at 1.0 s (two-beat pickup),
so every scene change in cues.js lands on a downbeat.
"""
import os
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'engine'))
from audio_lib import *  # noqa

CUES = load_cues(os.path.join(HERE, 'cues.js'))
DUR = CUES['duration']
BEAT = 60 / CUES['bpm']
STEP = BEAT / 4
T0 = CUES['barOffset']


def bar(k):  # start time of bar k
    return T0 + k * 4 * BEAT


music = Bus(DUR + 2)
drums = Bus(DUR + 2)
sfx = Bus(DUR + 2)

# ---------------------------------------------------------------- theme A
# goofy marimba + pizzicato bass + finger snaps: Dave's theme
A1 = [(0, 'C5'), (2, 'E5'), (4, 'G5'), (6, 'E5'), (8, 'F5'), (9, 'E5'), (10, 'D5'), (12, 'C5'), (14, 'G4')]
A4 = [(0, 'A4'), (2, 'C5'), (4, 'F5'), (6, 'A5'), (8, 'G5'), (10, 'F5'), (11, 'E5'), (12, 'D5'), (14, 'B4')]
END = [(0, 'D5'), (2, 'B4'), (4, 'G4'), (6, 'F4')]
PICK = [(8, 'G4'), (10, 'G4'), (11, 'A4'), (12, 'B4'), (14, 'D5')]


def theme_bar(k, notes, bass, until=None, half=False):
    t0 = bar(k)
    for st, n in notes:
        t = t0 + st * STEP
        if until is not None and t >= until:
            continue
        music.add(marimba(n2f(n), .5, .55), t, .8, pan=-.15)
        music.add(marimba(n2f(n) * 2, .3, .12), t + .004, .7, pan=.3)
    for i, b in enumerate(bass):
        t = t0 + i * 2 * BEAT
        if (until is not None and t >= until) or (half and i > 0):
            continue
        music.add(pluck(n2f(b), .5, .992, .3), t, .8)
    for beat in (1, 3):
        t = t0 + beat * BEAT
        if (until is not None and t >= until) or (half and beat > 1):
            continue
        drums.add(bp(noise(.08), 1800, 5000) * decay(.08, .012) * .5, t, .45, pan=.25)
    for e in range(8):  # shaker
        t = t0 + e * 2 * STEP
        if (until is not None and t >= until) or (half and e >= 4):
            continue
        drums.add(hat(.05) * (.5 if e % 2 else .3), t, .25, pan=-.3)


# pickup (bar -1, second half) is the loop seam: same as the bars before 46.0
for st, n in PICK:
    music.add(marimba(n2f(n), .5, .55), bar(-1) + st * STEP, .8, pan=-.15)
music.add(pluck(n2f('G2'), .5, .992, .3), bar(-1) + 8 * STEP, .8)
drums.add(bp(noise(.08), 1800, 5000) * decay(.08, .012) * .5, bar(-1) + 12 * STEP, .45, pan=.25)
theme_bar(0, A1, ['C3', 'G2'], until=2.0)
# outro: bars 20, 21, half of 22 -> loops into the pickup at 0.0
theme_bar(20, A1, ['C3', 'G2'])
theme_bar(21, A4, ['F2', 'G2'])
theme_bar(22, END, ['G2'], half=True)
# a warm pad under the café scene
for k, ch in ((20, ['C4', 'E4', 'G4']), (21, ['F3', 'A3', 'C4'])):
    for n in ch:
        music.add(supersaw(n2f(n), 2.0, cutoff=1400, a=.25, d=1, s=.7, r=.4) * .5, bar(k), .12)
for n in ['G3', 'B3', 'D4']:
    music.add(supersaw(n2f(n), 1.0, cutoff=1400, a=.25, d=1, s=.7, r=.1) * .5, bar(22), .12)

# ---------------------------------------------------------------- build into drop 1
drums.add(riser(1.0), 2.0, .35)
for i in range(8):  # snare roll 2.0 -> 3.0, accelerating
    t = 2.0 + (1 - (1 - i / 8) ** 1.6) * .95
    drums.add(snare(.15), t, .18 + .3 * i / 8)
drums.add(revcym(.5), 2.5, .4)

# ---------------------------------------------------------------- trap sections
CH = {'Am': ('A1', ['A3', 'C4', 'E4']), 'F': ('F1', ['F3', 'A3', 'C4']), 'C': ('C2', ['C4', 'E4', 'G4']),
      'G': ('G1', ['G3', 'B3', 'D4']), 'E': ('E1', ['E3', 'G#3', 'B3']), 'Dm': ('D2', ['D4', 'F4', 'A4'])}


def trap_bar(k, chord, lite=False, stabs=True, rolls=False, kick_steps=(0, 6, 10), until=None, crash_on=False):
    t0 = bar(k)
    root, tri = CH[chord]
    ok = (lambda t: until is None or t < until)
    if crash_on:
        drums.add(crash(2.0), t0, .35)
    for st in kick_steps:
        t = t0 + st * STEP
        if ok(t):
            drums.add(kick808(), t, .9 if not lite else .6)
            nxt = None
            music.add(sub808(n2f(root), .45 if st != kick_steps[-1] else .9, nxt), t, .55 if not lite else .35)
    for st in (4, 12):
        t = t0 + st * STEP
        if ok(t):
            drums.add(clap(), t, .55, pan=.05)
    for st in range(0, 16, 2):
        t = t0 + st * STEP
        if ok(t):
            drums.add(hat(), t, .22 if st % 4 else .3, pan=.35)
    if rolls:
        for j in range(6):
            t = t0 + 14 * STEP + j * STEP / 3
            if ok(t):
                drums.add(hat(.03), t, .16 + .03 * j, pan=.35)
    if stabs:
        for st in (2, 7, 10, 14):
            t = t0 + st * STEP
            if ok(t):
                for n in tri:
                    music.add(pluck(n2f(n), .35, .97, .9) * .6, t, .14, pan=(-.3 if n == tri[0] else .3))


for k, ch in ((1, 'Am'), (2, 'F')):
    trap_bar(k, ch, rolls=(k == 2), crash_on=(k == 1))
trap_bar(3, 'C', lite=True, stabs=False, rolls=True, crash_on=True)
# title sparkle arp over bars 2-3
for k, ch in ((2, 'F'), (3, 'C')):
    tri = CH[ch][1]
    for st in range(0, 16):
        n = tri[st % 3]
        music.add(bell(n2f(n) * 2, .5, .25), bar(k) + st * STEP, .16, pan=(-.4 if st % 2 else .4))
# old way: bars 4-6 (9.0-14.4)
for k, ch in ((4, 'Am'), (5, 'F'), (6, 'G')):
    trap_bar(k, ch, rolls=True, until=14.4, crash_on=(k == 4))
drums.add(revcym(.45), 14.55, .5)

# ---------------------------------------------------------------- clean section 15-18.5 (C major)
CLEAN = [('C', ['C4', 'E4', 'G4', 'C5']), ('Am', ['A3', 'C4', 'E4', 'A4']), ('F', ['F3', 'A3', 'C4', 'F4']), ('G', ['G3', 'B3', 'D4', 'G4'])]
for i, (nm, notes) in enumerate(CLEAN):
    t0 = 15.0 + i * 2 * BEAT
    for st in range(8):
        t = t0 + st * STEP
        if t >= 18.5:
            continue
        n = notes[[0, 2, 1, 3, 2, 1, 3, 2][st]]
        music.add(bell(n2f(n) * 2, .9, .35, ratio=2.0, index=1.2), t, .3, pan=(-.25 if st % 2 else .25))
    music.add(pluck(n2f(notes[0]) / 2, .9, .995, .2), t0, .5)
for b in range(7):
    t = 15.0 + b * BEAT
    drums.add(softkick(), t, .55)
    if b % 2:
        drums.add(clap() * .6, t, .3)
    drums.add(hat(.04), t + BEAT / 2, .16, pan=.3)

# ---------------------------------------------------------------- build 19-21 (E dominant)
arp = ['E4', 'G#4', 'B4', 'E5']
for st in range(16):
    t = 19.0 + st * STEP
    n = arp[st % 4]
    oct_ = 1 + (st // 8)
    music.add(supersaw(n2f(n) * oct_, .12, cutoff=1200 + st * 300, d=.08, s=.3, r=.03), t, .22, pan=(-.3 if st % 2 else .3))
music.add(sub808(n2f('E1'), 2.0), 19.0, .35)
for i in range(24):
    t = 19.0 + 2.0 * (1 - (1 - i / 24) ** 1.8)
    drums.add(snare(.12), t, .12 + .35 * i / 24)
drums.add(riser(1.6), 19.4, .35)

# ---------------------------------------------------------------- drop 2 21-33 (hook)
HOOK = {
    'Am': [(0, 'A4', 2), (2, 'C5', 2), (4, 'E5', 3), (7, 'D5', 1), (8, 'C5', 2), (10, 'D5', 2), (12, 'E5', 4)],
    'F': [(0, 'F5', 2), (2, 'E5', 2), (4, 'C5', 3), (7, 'A4', 1), (8, 'C5', 4), (12, 'G4', 4)],
    'C': [(0, 'E5', 2), (2, 'G5', 2), (4, 'E5', 3), (7, 'D5', 1), (8, 'C5', 2), (10, 'D5', 2), (12, 'E5', 4)],
    'G': [(0, 'D5', 2), (2, 'B4', 2), (4, 'G4', 3), (7, 'B4', 1), (8, 'D5', 3), (11, 'E5', 1), (12, 'D5', 4)],
}
for i, ch in enumerate(['Am', 'F', 'C', 'G', 'Am', 'F', 'Am']):
    k = 10 + i
    trap_bar(k, ch, rolls=(i % 2 == 1), stabs=False, crash_on=(i in (0, 2)), until=34.0)
    for st, n, ln in HOOK[ch]:
        t = bar(k) + st * STEP
        if t >= 34.0:
            continue
        music.add(supersaw(n2f(n), ln * STEP + .05, cutoff=4200, a=.006, d=.2, s=.65, r=.06), t, .3, pan=-.1)
        music.add(supersaw(n2f(n) / 2, ln * STEP + .05, cutoff=1800, a=.006, d=.2, s=.65, r=.06), t, .14, pan=.2)
    for n in CH[ch][1]:
        music.add(supersaw(n2f(n), 2.0, cutoff=1600, a=.05, d=1, s=.6, r=.2) * .6, bar(k), .1)

# ---------------------------------------------------------------- tension 33.6-39.5 and ominous 39.5-41
for b in range(int((39.5 - 33.6) / BEAT)):
    t = 33.5 + b * BEAT
    if 35.55 < t < 37.0:
        continue
    drums.add(woodblock(1800 if b % 2 == 0 else 1300), t, .35, pan=(.2 if b % 2 else -.2))
    music.add(sub808(n2f('A1'), .3, drive=1.2), t, .25)
for n, g in (('A1', .25), ('A#1', .2), ('E2', .12)):
    s = saw(n2f(n), 1.7, nh=20)
    s = lp(s, 380) * np.clip(tt(1.7) / .6, 0, 1)
    music.add(s, 39.4, g)

# ---------------------------------------------------------------- section processing on the music+drums buses
def process(bus):
    st = bus.stereo()
    sr = SR
    # crushed: 12.5 - 14.4
    a, b = int(12.5 * sr), int(14.4 * sr)
    for c in range(2):
        seg = st[c, a:b].copy()
        held = np.repeat(seg[::6], 6)[:len(seg)]
        crushed = np.round(held * 10) / 10
        # stutter: repeat some 1/16 chunks
        q = int(STEP * sr)
        for i in range(0, len(crushed) - 2 * q, q):
            if np.random.default_rng(i).random() < .3:
                crushed[i + q:i + 2 * q] = crushed[i:i + q]
        st[c, a:b] = seg * .3 + crushed * .8
    # muffled: 29 - 33
    a, b = int(29.0 * sr), int(33.0 * sr)
    for c in range(2):
        seg = st[c, a - sr // 20:b + sr].copy()
        m = lp(seg, 520, 2) * .6
        fade = np.ones(len(seg))
        ramp = sr // 20
        fade[:ramp] = np.linspace(0, 1, ramp)
        st[c, a - sr // 20:b + sr] = seg * (1 - fade) + m * fade
    # tape stop: 33.0 -> 33.6
    a = int(33.0 * sr)
    L = int(.62 * sr)
    for c in range(2):
        src = st[c, a:a + sr].copy()
        tt_ = np.arange(L) / sr
        speed = np.clip(1 - tt_ / .62, 0, 1) ** 1.4
        pos = np.cumsum(speed)
        y = np.interp(pos, np.arange(len(src)), src) * np.linspace(1, .2, L)
        st[c, a:a + L] = y
        st[c, a + L:a + sr] = 0
    # music drops out for "Flawless." (14.4-15.0) and "That's it." (18.5-19.0)
    for (x0, x1) in ((14.4, 15.0), (18.5, 19.0)):
        i0, i1 = int(x0 * sr), int(x1 * sr)
        st[:, i0:i1] *= np.linspace(1, 0, i1 - i0) ** 6
    return st


# ---------------------------------------------------------------- sfx
SFX = {
    'pop': lambda d: pop(760) * .5, 'lock': lambda d: np.concatenate([blip(1400, .06), np.zeros(int(.03 * SR)), blip(1900, .08)]) * .5,
    'scan': lambda d: lp(saw(110 + 40 * tt(d) / d, d, nh=20), 1600) * (.6 + .4 * np.sin(2 * np.pi * 14 * tt(d))) * .35,
    'impact': lambda d: impact() * 1.0, 'whoosh': lambda d: whoosh(.5) * .7, 'flash': lambda d: whoosh(.6, 2000, 9000, .1) * .5,
    'shimmer': lambda d: shimmer(d) * .5, 'type': lambda d: typing(d) * .5, 'ding': lambda d: mixs(bell(n2f('G6'), 1.2, .5, 2.0, 1), bell(n2f('C7'), 1.2, .35, 2.0, 1)) * .6,
    'stamp': lambda d: mixs(impact(1.0) * .8, bp(noise(.08), 300, 3000) * decay(.08, .02)) * .9,
    'glitch': lambda d: glitch(.22) * .45, 'slam': lambda d: mixs(kick808(.3, 120, 50, .1) * .6, whoosh(.25, 3000, 400, .05) * .4),
    'ticks': lambda d: ticks(d) * .35, 'error': lambda d: error_buzz() * .35, 'womp': lambda d: womp() * .45,
    'suck': lambda d: whoosh(.42, 300, 6000, .95) * .8, 'brush': lambda d: brush(d) * .5, 'shutter': lambda d: shutter() * .9,
    'iris': lambda d: whoosh(.35, 500, 3000) * .5, 'data': lambda d: data_bleeps(d) * .4,
    'swish': lambda d: whoosh(.35, 800, 5000, .5) * .45, 'zap': lambda d: zap() * .4,
    'freeze': lambda d: scratch() * .7, 'sting': lambda d: rimshot_sting() * .8, 'crt': lambda d: crt_off() * .6,
    'fan': lambda d: fan(d) * .45, 'beeps': lambda d: beeps(d) * .3, 'rocket': lambda d: rocket(d) * .9,
    'boop': lambda d: blip(660, .09) * .4, 'boom': lambda d: boom() * 1.0, 'slide': lambda d: whoosh(.4, 400, 3000) * .5,
}
rng = np.random.default_rng(42)
for ev in CUES['sfx']:
    name, at = ev[0], ev[1]
    d = ev[2] if len(ev) > 2 else .5
    pan = float(rng.uniform(-.35, .35)) if name in ('pop', 'swish', 'zap', 'glitch', 'boop') else 0.0
    sfx.add(SFX[name](d), at, 1.0, pan)

# ---------------------------------------------------------------- mix
mus = process(music)
drm = process(drums)
ir = reverb_ir(1.8)
mus = apply_reverb(mus, ir, .22)
sx = apply_reverb(sfx.stereo(), reverb_ir(1.2, 7), .12)

# duck music under the big moments
duck = np.ones(mus.shape[1])
for at, depth, ln in ((3.0, .45, .5), (21.0, .5, .5), (35.6, .35, 1.6), (39.6, .5, 1.0)):
    i = int(at * SR)
    n = int(ln * SR)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - depth * np.exp(-np.arange(n) / (n / 3)))
mix = (mus * .9 + drm * .85) * duck + sx * 1.0
mix = mix[:, :int(DUR * SR)]
mix = master(mix)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
raw = os.path.join(HERE, 'out', 'audio_raw.wav')
write_wav(raw, mix)
print('wrote', raw)
