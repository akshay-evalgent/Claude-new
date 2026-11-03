"""Score + sound design for the MiroFish short. Run: python3 score.py -> out/audio_raw.wav"""
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


def bar(k):
    return T0 + k * 4 * BEAT


music, drums, sfx = Bus(DUR + 2), Bus(DUR + 2), Bus(DUR + 2)

# ---------------------------------------------------------------- extra instruments
def braam(f=n2f('A1'), dur=2.2):
    t = tt(dur)
    x = np.zeros_like(t)
    for d in (-.12, 0, .1, 12.0):
        x += saw(f * 2 ** (d / 12), dur, nh=40)
    x = np.tanh(x * 1.8)
    x = sweep(x, lambda s: 300 + 2600 * np.exp(-s / .5), 'low')
    return x * env(len(t), .02, .9, .3, .5) * .5


def tom(f=90, dur=.6):
    t = tt(dur)
    fr = f * (1 + .6 * np.exp(-t / .04))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / .22)
    x += lp(noise(dur), 1200) * np.exp(-t / .03) * .3
    return np.tanh(x * 1.5)


def strings_note(f, dur):
    x = supersaw(f, dur, voices=4, detune=.12, cutoff=2200, a=.01, d=.08, s=.7, r=.04)
    return x


def guzheng(f, dur=1.4, bend=0.0):
    x = pluck(f, dur, .998, .7)
    if bend:
        n = len(x)
        tt_ = np.arange(n) / SR
        rate = 1 + bend * np.clip((tt_ - .15) / .25, 0, 1) + .006 * np.sin(2 * np.pi * 5.5 * tt_) * np.clip((tt_ - .2) / .3, 0, 1)
        pos = np.cumsum(rate)
        pos = pos[pos < n - 1]
        x = np.interp(pos, np.arange(n), x)
    return x * env(len(x), .002, 1.2, .0, .1)


def gong(dur=3.5):
    t = tt(dur)
    x = np.zeros_like(t)
    for fr, a, d in ((110, 1, 2.5), (167, .6, 1.8), (231, .5, 1.4), (297, .35, 1.0), (389, .3, .8), (523, .2, .6)):
        x += a * np.sin(2 * np.pi * fr * t * (1 + .004 * np.exp(-t / .5))) * np.exp(-t / d)
    x += lp(noise(dur), 2000) * np.exp(-t / .05) * .3
    return x * .5


def cash():
    x = np.zeros(int(1.0 * SR))
    for o, f in ((0, 2637), (.06, 3520)):
        b = bell(f, .7, .5, 1.41, 1.5)
        i = int(o * SR); x[i:i + len(b)] += b[:len(x) - i]
    for k in range(10):  # coins
        c = bp(noise(.05), 5000, 11000) * np.exp(-tt(.05) / .01) * .4
        i = int((.1 + k * .035 + .01 * np.sin(k)) * SR); x[i:i + len(c)] += c[:len(x) - i]
    return x


def murmur(dur=2.0, voices=14, seed=11):
    r = np.random.default_rng(seed)
    x = np.zeros(int(dur * SR))
    for v in range(voices):
        f1 = r.uniform(350, 900)
        n = bp(noise(dur, seed + v), f1, f1 * 2.2)
        syl = r.uniform(3, 6)
        am = np.clip(np.sin(2 * np.pi * syl * tt(dur) + r.uniform(0, 6)) * .5 + .5, 0, 1) ** 2
        x += n * am * r.uniform(.3, 1)
    return x / voices * 3


def msg():
    return mixs(blip(1320, .05), np.concatenate([np.zeros(int(.06 * SR)), blip(1760, .07)])) * .6


def whistle_fall(dur=.6):
    t = tt(dur)
    fr = 2400 * (1 - .75 * t / dur)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.clip(t / .05, 0, 1) * .35


def jingle():
    x = np.zeros(int(1.4 * SR))
    for k, n in enumerate(['C6', 'E6', 'G6', 'C7']):
        b = bell(n2f(n), .9, .6, 2.0, 1.2)
        i = int(k * .09 * SR); x[i:i + len(b)] += b[:len(x) - i]
    return x


def marker(dur=.6):
    t = tt(dur)
    x = sweep(noise(dur), lambda s: 2500 + 1500 * np.sin(2 * np.pi * 7 * s), 'band', width=1.3)
    return x * np.sin(np.pi * np.clip(t / dur, 0, 1)) * .6


def page():
    return mixs(whoosh(.35, 1500, 6000, .3) * .6, hp(noise(.12), 3000) * decay(.12, .03) * .3)


def splash():
    t = tt(1.2)
    return (lp(noise(1.2), 3000) * np.exp(-t / .25) + bp(noise(1.2), 300, 1200) * np.exp(-t / .5) * .5) * .7


# ---------------------------------------------------------------- sections
AM_ARP = ['A3', 'C4', 'E4', 'B4']
# 0-3: counting intro (piano-ish bells + heartbeat + clock)
for b in range(-2, 4):
    t = bar(0) + b * BEAT
    if t < 0 or t >= 3.0:
        continue
    drums.add(softkick(.25) * .8, t, .5)
    drums.add(woodblock(2000 if b % 2 else 1500, .08), t + BEAT / 2, .25, pan=.3)
for i, n in enumerate(AM_ARP * 3):
    t = i * STEP * 2
    if t >= 2.0:
        break
    music.add(bell(n2f(n), 1.2, .4, 1.0, .6), t, .35, pan=(-.2 if i % 2 else .2))
for i in range(14):  # clock accelerates with the counter
    t = 2.0 + 1.0 * (1 - (1 - i / 14) ** 1.7)
    drums.add(woodblock(2200, .05), t, .2 + .2 * i / 14)
drums.add(riser(1.0), 2.0, .35)
music.add(sub808(n2f('A1'), 1.0), 2.0, .25)

# trap groove helper
CH = {'Am': ('A1', ['A3', 'C4', 'E4']), 'F': ('F1', ['F3', 'A3', 'C4']), 'C': ('C2', ['C4', 'E4', 'G4']), 'G': ('G1', ['G3', 'B3', 'D4']),
      'Dm': ('D2', ['D4', 'F4', 'A4']), 'E': ('E1', ['E3', 'G#3', 'B3'])}


def groove(k, ch, kick=(0, 6, 10), claps=(4, 12), hats=True, rolls=False, bass=True, arp=None, until=None, g=1.0, crash_on=False):
    t0 = bar(k)
    root, tri = CH[ch]
    ok = lambda t: (until is None or t < until) and t < DUR
    if crash_on and ok(t0):
        drums.add(crash(2.0), t0, .3 * g)
    for st in kick:
        t = t0 + st * STEP
        if ok(t):
            drums.add(kick808(), t, .85 * g)
            if bass:
                music.add(sub808(n2f(root), .45 if st != kick[-1] else .85), t, .5 * g)
    for st in claps:
        t = t0 + st * STEP
        if ok(t):
            drums.add(clap(), t, .5 * g)
    if hats:
        for st in range(0, 16, 2):
            t = t0 + st * STEP
            if ok(t):
                drums.add(hat(), t, (.2 if st % 4 else .28) * g, pan=.35)
    if rolls:
        for j in range(6):
            t = t0 + 14 * STEP + j * STEP / 3
            if ok(t):
                drums.add(hat(.03), t, .15 * g, pan=.35)
    if arp:
        notes = tri + [tri[0].replace('3', '4').replace('4', '5', 1) if '3' in tri[0] else tri[1]]
        for st in range(16):
            t = t0 + st * STEP
            if ok(t):
                n = notes[[0, 1, 2, 3, 2, 1, 2, 3][st % 8] % len(notes)]
                music.add(pluck(n2f(n) * (2 if arp == 'high' else 1), .3, .985, .9) * .5, t, .2 * g, pan=(-.3 if st % 2 else .3))


# 3-9: drop 1
music.add(braam(), 3.0, .55)
for k, ch in ((1, 'Am'), (2, 'F'), (3, 'C')):
    groove(k, ch, rolls=(k == 2), arp='high', crash_on=(k == 1))
music.add(braam(n2f('F1'), 1.6), 7.0, .35)
# 9-17: explainer groove
for k, ch in ((4, 'Am'), (5, 'F'), (6, 'C'), (7, 'G')):
    groove(k, ch, kick=(0, 8), claps=(4, 12), arp='low', rolls=(k % 2 == 1), g=.9)
for t in (11.0, 13.0, 15.0):
    drums.add(tom(110), t, .5); drums.add(tom(80), t + STEP, .4)
# 17-21: swarm build (strings + taiko)
for k, ch in ((8, 'Dm'), (9, 'E')):
    root, tri = CH[ch]
    for st in range(16):
        t = bar(k) + st * STEP
        n = tri[[0, 1, 2, 1][st % 4]]
        music.add(strings_note(n2f(n), STEP * .9), t, .22 + .12 * (st / 16) * (k - 7), pan=(-.25 if st % 2 else .25))
    for st in (0, 3, 6, 8, 10, 12, 14, 15):
        drums.add(tom(70 if st % 4 == 0 else 95), bar(k) + st * STEP, .45 + .1 * (k - 8))
    music.add(sub808(n2f(root), 2.0), bar(k), .3)
for i in range(16):
    drums.add(snare(.1), 20.0 + i * STEP / 2, .1 + .25 * i / 16)
# 21-25: drop 2 with hook, god-mode impact at 23.6
HOOK = {'Am': [(0, 'E5', 2), (2, 'A5', 2), (4, 'G5', 2), (6, 'E5', 2), (8, 'D5', 3), (11, 'C5', 1), (12, 'D5', 4)],
        'F': [(0, 'C5', 2), (2, 'F5', 2), (4, 'E5', 2), (6, 'C5', 2), (8, 'A4', 4), (12, 'B4', 4)]}
music.add(braam(), 21.0, .5)
for k, ch in ((10, 'Am'), (11, 'F')):
    groove(k, ch, rolls=True, arp=None, crash_on=(k == 10), until=(23.55 if k == 11 else None))
    for st, n, ln in HOOK[ch]:
        t = bar(k) + st * STEP
        if k == 11 and t >= 23.55:
            continue
        music.add(supersaw(n2f(n), ln * STEP + .05, cutoff=4200, a=.006, d=.2, s=.65, r=.06), t, .26, pan=-.1)
music.add(braam(n2f('D2'), 1.4), 23.6, .5)
groove(12, 'Dm', kick=(0, 6, 10), rolls=True, g=.95)
# 25-29: lighter groove under report + chat
for k, ch in ((12, 'Dm'), (13, 'G')):
    groove(k, ch, kick=(0, 8), claps=(4, 12), arp='low', g=.7, bass=(k == 13))
# 29-33: Red Chamber, D pentatonic guzheng
PENTA = [(0, 'D5', 0), (2, 'E5', 0), (4, 'F#5', 0), (6, 'A5', .06), (10, 'F#5', 0), (12, 'E5', 0),
         (16, 'D5', 0), (18, 'B4', 0), (20, 'A4', .06), (24, 'B4', 0), (26, 'D5', 0), (28, 'E5', 0)]
for st, n, bd in PENTA:
    music.add(guzheng(n2f(n), 1.3, bd), 29.0 + st * STEP, .42, pan=-.15)
    music.add(guzheng(n2f(n) / 2, 1.0) * .4, 29.0 + st * STEP + .01, .2, pan=.2)
for n in ('D3', 'A3', 'D4', 'F#4'):
    music.add(supersaw(n2f(n), 4.0, cutoff=900, a=.6, d=2, s=.6, r=.5) * .5, 29.0, .12)
for b in range(8):
    drums.add(woodblock(1300, .07), 29.0 + b * BEAT + BEAT / 2, .2)
    if b % 2 == 0:
        drums.add(tom(85, .5), 29.0 + b * BEAT, .3)
# 33-37: the catch, sneaky pizzicato + muted reed
SNEAK = [(0, 'A2'), (2, 'C3'), (3, 'D#3'), (4, 'E3'), (8, 'A2'), (10, 'G2'), (12, 'E2'), (14, 'G2')]
for rep in range(2):
    for st, n in SNEAK:
        t = 33.3 + rep * 2.0 + st * STEP
        if t < 36.15:
            music.add(pluck(n2f(n), .35, .97, .4), t, .55)
    for st in (2, 6, 10, 14):
        t = 33.3 + rep * 2.0 + st * STEP
        if t < 36.15:
            reed = lp(square(n2f('E4' if st != 14 else 'D#4'), .12, 15), 1400) * env(int(.12 * SR), .005, .08, .3, .03)
            music.add(reed, t, .18)
            drums.add(hat(.04), t, .15)
# 37-41: futures swell
for n in ('F3', 'A3', 'C4', 'E4', 'G4'):
    music.add(supersaw(n2f(n), 4.2, cutoff=2400, a=1.6, d=3, s=.8, r=.6) * .6, 37.0, .14)
for i in range(32):
    n = ['C5', 'E5', 'G5', 'A5', 'C6', 'E6'][i % 6]
    music.add(bell(n2f(n), .8, .25, 2.0, 1.0), 37.0 + i * STEP, .1 + .1 * i / 32, pan=(-.4 if i % 2 else .4))
for t in (37.0, 39.0):
    drums.add(tom(60, 1.0), t, .5)
music.add(sub808(n2f('F1'), 4.0), 37.0, .25)
# 41-47: meta, upbeat groove (major), then back to the opening motif
for k, ch in ((20, 'C'), (21, 'G'), (22, 'Am')):
    groove(k, ch, kick=(0, 6, 8, 12), claps=(4, 12), arp='high', rolls=True, g=.85, crash_on=(k == 20), until=47.0)
for i, n in enumerate(AM_ARP * 2):  # opening motif returns for the loop
    music.add(bell(n2f(n), 1.2, .4, 1.0, .6), 47.0 + i * STEP * 2, .35, pan=(-.2 if i % 2 else .2))
drums.add(revcym(.5), 47.5, .35)

# ---------------------------------------------------------------- sfx
SFX = {
    'tick': lambda d: woodblock(2400, .06) * .5, 'coin': lambda d: bell(3200, .4, .3, 1.41, 1.2), 'ding': lambda d: mixs(bell(n2f('E6'), 1.0, .5, 2.0, 1), bell(n2f('B6'), 1.0, .35, 2.0, 1)) * .7,
    'riser': lambda d: riser(d) * .1, 'impact': lambda d: impact() * 1.0, 'stars': lambda d: shimmer(d, 3) * .45, 'whoosh': lambda d: whoosh(.45) * .7,
    'cash': lambda d: cash() * .7, 'roll': lambda d: ticks(d, 30) * .3, 'pop': lambda d: pop(760) * .45, 'boom': lambda d: boom() * .9,
    'shimmer': lambda d: shimmer(d, 5) * .4, 'suck': lambda d: whoosh(.62, 300, 7000, .95) * .8, 'splash': lambda d: splash(),
    'swish': lambda d: whoosh(.35, 800, 5000, .5) * .5, 'paper': lambda d: page() * .6, 'type': lambda d: typing(d) * .45,
    'glitch': lambda d: glitch(.2, 3) * .45, 'data': lambda d: data_bleeps(d, 5) * .35, 'slide': lambda d: whoosh(.4, 400, 3000) * .5,
    'blip': lambda d: blip(1200, .07) * .5, 'swell': lambda d: riser(d) * .15, 'chatter': lambda d: murmur(d) * .5,
    'drop': lambda d: whistle_fall(d), 'shock': lambda d: mixs(impact(2.0) * 1.0, boom(2.0) * .5), 'msg': lambda d: msg(),
    'gong': lambda d: gong() * .8, 'page': lambda d: page() * .7, 'flip': lambda d: whoosh(.18, 2000, 6000, .4) * .5,
    'scratch': lambda d: scratch() * .7, 'marker': lambda d: marker(d), 'sting': lambda d: jingle() * .7, 'meter': lambda d: ticks(d, 18) * .3,
}
rng = np.random.default_rng(42)
for ev in CUES['sfx']:
    name, at = ev[0], ev[1]
    d = ev[2] if len(ev) > 2 else .5
    pan = float(rng.uniform(-.3, .3)) if name in ('pop', 'swish', 'msg', 'paper', 'blip', 'flip') else 0.0
    sfx.add(SFX[name](d), at, 1.0, pan)

# ---------------------------------------------------------------- mix
mus, drm = music.stereo(), drums.stereo()
# dropouts: "For this." (6.4-7.0) breathes; the catch starts on a scratch with silence under it
for (x0, x1, depth) in ((6.4, 7.0, .6), (33.0, 33.3, 1.0), (36.15, 36.9, .7)):
    i0, i1 = int(x0 * SR), int(x1 * SR)
    for st in (mus, drm):
        st[:, i0:i1] *= 1 - depth
mus = apply_reverb(mus, reverb_ir(2.0), .25)
sx = apply_reverb(sfx.stereo(), reverb_ir(1.2, 7), .12)
duck = np.ones(mus.shape[1])
for at, depth, ln in ((3.0, .45, .5), (7.0, .4, .8), (21.0, .45, .5), (23.6, .55, 1.0)):
    i = int(at * SR); n = int(ln * SR)
    duck[i:i + n] = np.minimum(duck[i:i + n], 1 - depth * np.exp(-np.arange(n) / (n / 3)))
mix = (mus * .85 + drm * .8) * duck + sx
mix = master(mix[:, :int(DUR * SR)])
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
write_wav(os.path.join(HERE, 'out', 'audio_raw.wav'), mix)
print('wrote out/audio_raw.wav')
