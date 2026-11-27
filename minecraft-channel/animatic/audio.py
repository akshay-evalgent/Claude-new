"""Scratch audio for the animatic, synthesised from the episode cues (numpy only).

- Character "voices": pitched babble, one syllable per caption syllable, so mouths stay in sync.
- SFX: small procedural library (pop, ding, thud, crash, howl, drumroll ...).
- Music: chiptune cues (day, quirky, night, tender, chase, payoff, end), ducked under dialogue.

Usage: python3 audio.py out/<ep>/cues.json out/<ep>/mix.wav
These are placeholders for timing and tone. Replace with recorded VO, licensed SFX and music for the final cut.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
TAU = 2 * np.pi


def rng(seed):
    return np.random.default_rng(seed & 0xFFFFFFFF)


def hseed(s):
    h = 2166136261
    for ch in s:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    return h


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.01, r=0.05, curve=1.0):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def osc(freq, dur, kind='sine', phase=0.0):
    """freq: scalar or per-sample array."""
    n = int(dur * SR)
    f = np.full(n, freq) if np.isscalar(freq) else freq[:n]
    ph = phase + np.cumsum(f) / SR
    x = ph % 1.0
    if kind == 'sine':
        return np.sin(TAU * ph)
    if kind == 'square':
        return np.where(x < 0.5, 1.0, -1.0)
    if kind == 'pulse':
        return np.where(x < 0.25, 1.0, -1.0)
    if kind == 'saw':
        return 2 * x - 1
    if kind == 'tri':
        return 4 * np.abs(x - 0.5) - 1
    raise ValueError(kind)


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    # soft edges
    m = np.convolve(m, np.ones(9) / 9, mode='same')
    return np.fft.irfft(X * m, n=len(x))


def noise(dur, seed=1):
    return rng(seed).uniform(-1, 1, int(dur * SR))


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) if len(x) else 0
    return x * (peak / m) if m > 0 else x


# ---------------------------------------------------------------- voices
VOWELS = {'a': (800, 1200, 2500), 'e': (500, 1900, 2550), 'i': (320, 2300, 3000), 'o': (500, 900, 2400), 'u': (350, 800, 2300)}
VOICE = {
    #        f0   formant  harm   breath  extra
    'ava':  (265, 1.15, 26, 0.04, None),
    'rex':  (150, 0.92, 34, 0.06, 'growl'),
    'duchess': (225, 1.05, 30, 0.03, 'glide'),
    'pico': (540, 1.45, 14, 0.05, 'squawk'),
    'lou':  (175, 1.0, 18, 0.12, 'wobble'),
    'greg': (300, 1.0, 22, 0.05, 'bleat'),
    'mom':  (215, 1.08, 30, 0.04, None),
}


def syllable(who, dur, f0, vowel, amp, seed, rise=0.0):
    base, fs, nh, breath, extra = VOICE.get(who, VOICE['ava'])
    n = int(dur * SR)
    if n <= 0:
        return np.zeros(0)
    t = np.arange(n) / SR
    u = t / max(dur, 1e-3)
    pitch = f0 * (1 + rise * u)
    if extra == 'glide':
        pitch *= 1.12 - 0.2 * u
    if extra == 'wobble':
        pitch *= 1 + 0.03 * np.sin(TAU * 5 * t)
    if extra == 'bleat':
        pitch *= 1 + 0.07 * np.sin(TAU * 11 * t)
    if extra == 'squawk':
        pitch *= 1 + 0.25 * (1 - u) ** 3
    pitch *= 1 + 0.008 * np.sin(TAU * 5.5 * t)
    ph = np.cumsum(pitch) / SR
    F = [f * fs for f in VOWELS[vowel]]
    out = np.zeros(n)
    f0m = float(np.mean(pitch))
    for k in range(1, nh + 1):
        hf = k * f0m
        if hf > 9000:
            break
        a = sum(np.exp(-0.5 * ((hf - Fi) / (90 + 0.08 * Fi)) ** 2) * w for Fi, w in zip(F, (1.0, 0.7, 0.35)))
        a += 0.04 / k
        out += a * np.sin(TAU * k * ph)
    if extra == 'growl':
        out *= 1 + 0.35 * np.sin(TAU * 32 * t)
    if extra == 'squawk':
        out = np.tanh(out * 2.5)
    out += breath * band(noise(dur, seed), 1500, 6000) * 3
    e = env_adsr(n, 0.012, min(0.06, dur * 0.4))
    return norm(out * e, amp)


def render_line(line, buf):
    who = line['who']
    if line.get('novoice'):
        return
    base = VOICE.get(who, VOICE['ava'])[0]
    R = rng(hseed(line['text']))
    loud = line.get('loud')
    soft = line.get('soft')
    syl = line['syl']
    vowels = list('aeiou')
    for i, s in enumerate(syl):
        dur = max(0.05, s['t1'] - s['t0'])
        f0 = base * (1 + R.uniform(-0.09, 0.09))
        if s.get('key'):
            f0 *= 1.1
        if loud:
            f0 *= 1.12
        rise = 0.0
        if s.get('last'):
            rise = 0.3 if line['kind'] == 'q' else (-0.12 if line['kind'] == '.' else 0.08)
        if who == 'greg' and len(syl) == 1:
            dur = max(dur, 0.55)
        amp = 0.55 * (1.25 if s.get('key') else 1.0) * (1.35 if loud else 1.0) * (0.55 if soft else 1.0)
        if line.get('offscreen'):
            amp *= 0.85
        v = syllable(who, dur, f0, vowels[int(R.integers(0, 5))], amp, hseed(line['text']) + i, rise)
        add(buf['voice'], v, s['t0'])


# ---------------------------------------------------------------- sfx
def sfx_blip():
    t = t_axis(0.06)
    return osc(880 + 600 * t / 0.06, 0.06, 'sine') * env_adsr(len(t), 0.003, 0.04) * 0.35


def sfx_tick():
    x = np.diff(noise(0.025, 3), prepend=0) * env_adsr(int(0.025 * SR), 0.001, 0.02)
    return x * 0.25


def sfx_pop():
    t = t_axis(0.08)
    return osc(300 + 900 * t / 0.08, 0.08, 'sine') * env_adsr(len(t), 0.002, 0.06) * 0.7


def sfx_ding():
    t = t_axis(1.0)
    x = sum(a * np.sin(TAU * f * t) for f, a in ((1318.5, 1), (2637, 0.5), (3951, 0.25)))
    return x * np.exp(-t * 4) * 0.4


def sfx_buzzer():
    t = t_axis(0.45)
    return (osc(110, 0.45, 'square') * 0.5 + osc(113, 0.45, 'saw') * 0.5) * env_adsr(len(t), 0.005, 0.05) * 0.35


def sfx_sting():
    t = t_axis(1.6)
    chord = sum(osc(f, 1.6, 'saw') for f in (98, 146.8, 196, 233.1))
    chord = band(chord, 60, 3000) * np.exp(-t * 1.6)
    hit = band(noise(1.6, 7), 40, 400) * np.exp(-t * 7) * 2
    return norm(chord + hit, 0.8)


def sfx_whoosh():
    d = 0.45
    t = t_axis(d)
    x = band(noise(d, 11), 400, 5000) * np.sin(np.pi * t / d) ** 2
    return norm(x, 0.5)


def sfx_thud():
    t = t_axis(0.4)
    return norm(np.sin(TAU * (70 - 30 * t) * t) * np.exp(-t * 10) + band(noise(0.4, 13), 30, 300) * np.exp(-t * 18), 0.9)


def sfx_bonk():
    t = t_axis(0.2)
    f = 700 * np.exp(-t * 3)
    return norm((osc(f, 0.2) + 0.5 * osc(f * 2.01, 0.2)) * np.exp(-t * 22), 0.8)


def sfx_crash(d=0.8, seed=17, clinks=10):
    t = t_axis(d)
    x = band(noise(d, seed), 300, 9000) * np.exp(-t * 5)
    R = rng(seed)
    for _ in range(clinks):
        st = R.uniform(0, d * 0.5)
        f = R.uniform(2000, 6000)
        tt = np.clip(t - st, 0, None)
        x += 0.25 * np.sin(TAU * f * tt) * np.exp(-tt * 30) * (t >= st)
    return norm(x, 0.8)


def sfx_shatter():
    return norm(sfx_crash(1.4, 19, 30) + 0.6 * np.pad(sfx_thud(), (0, int(1.0 * SR))), 0.9)


def sfx_munch():
    out = np.zeros(int(0.6 * SR))
    for i in range(4):
        c = band(noise(0.06, 23 + i), 800, 6000) * env_adsr(int(0.06 * SR), 0.002, 0.05)
        add_arr(out, c, i * 0.13)
    return out * 0.7


def sfx_scratch():
    d = 0.3
    t = t_axis(d)
    f = 300 + 1200 * np.sin(np.pi * t / d)
    return norm(band(osc(f, d, 'saw') + 0.5 * noise(d, 29), 200, 5000) * env_adsr(len(t), 0.01, 0.08), 0.6)


def sfx_whimper():
    out = np.zeros(int(1.0 * SR))
    for i, st in enumerate((0.0, 0.45)):
        d = 0.38
        t = t_axis(d)
        f = (950 - 350 * t / d) * (1 + 0.04 * np.sin(TAU * 9 * t))
        c = (osc(f, d) + 0.3 * osc(f * 2, d)) * env_adsr(len(t), 0.02, 0.15)
        add_arr(out, c, st)
    return norm(out, 0.5)


def sfx_howl():
    d = 1.7
    t = t_axis(d)
    f = (420 + 320 * np.sin(np.pi * np.clip(t / d * 1.4, 0, 1))) * (1 + 0.025 * np.sin(TAU * 6 * t))
    x = osc(f, d) + 0.4 * osc(f * 2, d) + 0.15 * osc(f * 3, d)
    return norm(x * env_adsr(len(t), 0.15, 0.5), 0.7)


def sfx_snore():
    d = 1.1
    t = t_axis(d)
    x = band(noise(d, 31), 80, 900) * (0.6 + 0.4 * np.sin(TAU * 38 * t)) * np.sin(np.pi * t / d)
    return norm(x, 0.35)


def sfx_crickets():
    d = 2.2
    out = np.zeros(int(d * SR))
    R = rng(37)
    st = 0.05
    while st < d - 0.2:
        for k in range(3):
            c = np.sin(TAU * 4600 * t_axis(0.025)) * env_adsr(int(0.025 * SR), 0.003, 0.015)
            add_arr(out, c * 0.25, st + k * 0.045)
        st += R.uniform(0.35, 0.6)
    return out


def sfx_sparkle():
    out = np.zeros(int(0.7 * SR))
    for i, f in enumerate((2093, 2637, 3136, 4186, 3136, 4186)):
        c = np.sin(TAU * f * t_axis(0.25)) * np.exp(-t_axis(0.25) * 14)
        add_arr(out, c * 0.25, i * 0.07)
    return out


def sfx_drumroll():
    d = 3.0
    out = np.zeros(int((d + 1.2) * SR))
    k = 0
    tt = 0.0
    while tt < d:
        amp = 0.15 + 0.5 * (tt / d)
        c = band(noise(0.04, 41 + k), 1000, 8000) * env_adsr(int(0.04 * SR), 0.001, 0.03)
        add_arr(out, c * amp, tt)
        tt += 1 / 22
        k += 1
    add_arr(out, sfx_crash(1.1, 43, 6) * 0.9, d)
    return out


def sfx_fanfare():
    out = np.zeros(int(1.2 * SR))
    for i, f in enumerate((523.3, 659.3, 784.0, 1046.5)):
        dd = 0.12 if i < 3 else 0.6
        c = osc(f, dd, 'pulse') * env_adsr(int(dd * SR), 0.005, 0.05) * 0.3
        add_arr(out, c, i * 0.11)
    return out


def sfx_wool():
    d = 0.5
    t = t_axis(d)
    return norm(band(noise(d, 47), 60, 700) * np.exp(-t * 9), 0.7)


def sfx_poof():
    d = 0.35
    t = t_axis(d)
    return norm(band(noise(d, 53), 300, 4000) * np.exp(-t * 12), 0.6)


def sfx_cheer():
    d = 1.2
    out = np.zeros(int(d * SR))
    R = rng(59)
    for i in range(6):
        f0 = R.uniform(260, 420)
        v = syllable('ava', d * R.uniform(0.6, 0.9), f0, 'a', 0.25, 60 + i, rise=0.35)
        add_arr(out, v, R.uniform(0, 0.15))
    out += band(noise(d, 61), 500, 4000) * np.sin(np.pi * t_axis(d) / d) * 0.12
    return norm(out, 0.6)


SFX = {name[4:]: fn for name, fn in globals().items() if name.startswith('sfx_')}


# ---------------------------------------------------------------- music
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def mfreq(name, octave):
    return 440.0 * 2 ** ((NOTE[name] + 12 * (octave + 1) - 69) / 12)


CHORDS = {
    'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'Am': ['A', 'C', 'E'], 'F': ['F', 'A', 'C'],
    'Dm': ['D', 'F', 'A'], 'Em': ['E', 'G', 'B'], 'E': ['E', 'G#', 'B'], 'Bb': ['A#', 'D', 'F'],
}
CUES = {
    'day':    dict(bpm=120, prog=['C', 'G', 'Am', 'F'], bass='tri', arp='pulse', arp_div=2, drums='pop', lead=True, gain=1.0),
    'payoff': dict(bpm=126, prog=['F', 'G', 'C', 'Am', 'F', 'G', 'C', 'C'], bass='tri', arp='pulse', arp_div=4, drums='pop', lead=True, gain=1.05),
    'quirky': dict(bpm=100, prog=['C', 'Am', 'F', 'G'], bass='tri', arp='pluck', arp_div=2, drums='soft', lead=False, gain=0.8),
    'night':  dict(bpm=70, prog=['Am', 'F', 'C', 'E'], bass='tri', arp='pad', arp_div=1, drums=None, lead=False, gain=0.8),
    'tender': dict(bpm=72, prog=['F', 'C', 'Dm', 'Bb'], bass='tri', arp='pad', arp_div=1, drums=None, lead=True, gain=0.75),
    'chase':  dict(bpm=152, prog=['Am', 'F', 'G', 'E'], bass='square', arp='pulse', arp_div=4, drums='drive', lead=True, gain=1.0),
    'end':    dict(bpm=120, prog=['C', 'F', 'G', 'C'], bass='tri', arp='pulse', arp_div=2, drums='pop', lead=True, gain=0.95),
}


def tone(f, d, kind, amp):
    n = int(d * SR)
    if n <= 0:
        return np.zeros(0)
    if kind == 'pluck':
        t = np.arange(n) / SR
        return osc(f, d, 'tri') * np.exp(-t * 9) * amp
    if kind == 'pad':
        x = (osc(f, d, 'tri') + 0.5 * osc(f * 1.003, d, 'tri')) * env_adsr(n, min(0.3, d / 3), min(0.4, d / 3))
        return x * amp * 0.8
    return osc(f, d, kind) * env_adsr(n, 0.004, min(0.05, d / 3)) * amp


def music_cue(name, dur, seed):
    c = CUES[name]
    beat = 60 / c['bpm']
    bar = beat * 4
    out = np.zeros(int((dur + 2) * SR))
    R = rng(seed)
    nbars = int(np.ceil(dur / bar)) + 1
    for b in range(nbars):
        ch = CHORDS[c['prog'][b % len(c['prog'])]]
        t0 = b * bar
        # bass
        for q in range(4):
            note = ch[0] if q % 2 == 0 else ch[2]
            add_arr(out, tone(mfreq(note, 2), beat * 0.9, c['bass'], 0.32), t0 + q * beat)
        # arp / pad
        if c['arp'] == 'pad':
            for i, nn in enumerate(ch):
                add_arr(out, tone(mfreq(nn, 4), bar, 'pad', 0.12), t0)
        else:
            step = beat / c['arp_div']
            k = 0
            for s in np.arange(0, bar - 1e-6, step):
                nn = ch[k % 3]
                add_arr(out, tone(mfreq(nn, 5 if c['arp'] != 'pluck' else 4), step * 0.8, c['arp'], 0.08 if c['arp'] == 'pulse' else 0.18), t0 + s)
                k += 1
        # lead melody: chord tones on beats, occasional passing notes
        if c['lead'] and b % 2 == 0 or (c['lead'] and name in ('payoff', 'chase')):
            for q in range(4):
                if R.random() < 0.25:
                    continue
                nn = ch[int(R.integers(0, 3))]
                d = beat * (2 if name in ('tender',) else 1) * 0.85
                add_arr(out, tone(mfreq(nn, 5), d, 'square' if name != 'tender' else 'tri', 0.07 if name != 'tender' else 0.14), t0 + q * beat * (2 if name == 'tender' else 1))
        # drums
        dr = c['drums']
        if dr:
            for q in range(4):
                if dr in ('pop', 'drive') and q % 2 == 0:
                    add_arr(out, kick() * 0.7, t0 + q * beat)
                if dr in ('pop', 'drive') and q % 2 == 1:
                    add_arr(out, snare(b * 4 + q) * 0.35, t0 + q * beat)
                hh_div = 4 if dr == 'drive' else 2
                for h in range(hh_div):
                    if dr == 'soft' and h % 2 == 0:
                        continue
                    add_arr(out, hat(b * 16 + q * 4 + h) * (0.12 if dr != 'soft' else 0.08), t0 + q * beat + h * beat / hh_div)
    out = out[: int(dur * SR)]
    return out * c['gain']


def kick():
    t = t_axis(0.25)
    return np.sin(TAU * (50 + 90 * np.exp(-t * 30)) * t) * np.exp(-t * 14)


def snare(seed):
    t = t_axis(0.18)
    return band(noise(0.18, 100 + seed % 7), 800, 7000) * np.exp(-t * 20) + 0.3 * np.sin(TAU * 190 * t) * np.exp(-t * 25)


def hat(seed):
    t = t_axis(0.05)
    return band(noise(0.05, 200 + seed % 5), 6000, 12000) * np.exp(-t * 60)


# ---------------------------------------------------------------- mixing
def add_arr(dst, src, at):
    i = int(at * SR)
    if i >= len(dst) or len(src) == 0:
        return
    j = min(len(dst), i + len(src))
    dst[i:j] += src[: j - i]


def add(dst, src, at):
    add_arr(dst, src, at)


# ---------------------------------------------------------------- recorded assets
HERE = __import__('os').path.dirname(__import__('os').path.abspath(__file__))


def load_wav(path):
    import subprocess
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


_lib = {}
# sfx names that map to real CC0 recordings in ./sfx (rotating through variants)
REAL = {
    'bark': ['bark_1', 'bark_2', 'bark_3', 'bark_4', 'bark_5'], 'bark_double': ['bark_double'],
    'whimper': ['whimper', 'whimper_2'], 'howl': ['howl'], 'crickets': ['crickets'],
    'squawk': ['squawk_1', 'squawk_2', 'squawk_3', 'squawk_4', 'squawk_5'], 'squawk_macaw': ['squawk_macaw'],
    'meow': ['meow', 'meow_2'], 'purr': ['meow_purr'], 'cheer': ['kids_cheer'], 'bleat': ['goat_03', 'goat_05'],
}
_rot = {}


def real_sfx(name):
    import os
    if name not in REAL:
        return None
    opts = REAL[name]
    i = _rot.get(name, 0)
    _rot[name] = i + 1
    f = opts[i % len(opts)]
    if f not in _lib:
        p = os.path.join(HERE, 'sfx', f + '.wav')
        if not os.path.exists(p):
            return None
        _lib[f] = load_wav(p)
    return _lib[f]


def distant(x):
    """Off-screen voice from another room: band-limited with a short slap-back."""
    y = band(x, 180, 3800)
    d = int(0.06 * SR)
    y = y + 0.35 * np.pad(y, (d, 0))[: len(y)]
    return y * 0.9


def main(cues_path, out_path):
    import os
    C = json.load(open(cues_path))
    ep = os.path.basename(os.path.dirname(os.path.abspath(cues_path)))
    vodir = os.path.join(HERE, '..', 'episodes', ep, 'vo')
    dur = C['duration'] + 0.5
    n = int(dur * SR)
    buf = {'voice': np.zeros(n), 'sfx': np.zeros(n), 'music': np.zeros(n)}
    used_vo = 0
    for line in C['lines']:
        p = os.path.join(vodir, line['vo']) if line.get('vo') else None
        if p and os.path.exists(p):
            v = load_wav(p) * 0.85
            if line['who'] == 'mom':
                v = distant(v) * 1.3
            add(buf['voice'], v, line['t0'])
            used_vo += 1
        else:
            render_line(line, buf)
    print('recorded VO lines:', used_vo, 'of', len(C['lines']))
    missing = set()
    for e in C['sfx']:
        x = real_sfx(e['name'])
        if x is None:
            fn = SFX.get(e['name'])
            if not fn:
                missing.add(e['name'])
                continue
            x = fn()
        add(buf['sfx'], x * e['vol'], e['t'])
    cues = sorted(C['music'], key=lambda m: m['t'])
    for i, m in enumerate(cues):
        if m['cue'] == 'stop':
            continue
        end = cues[i + 1]['t'] if i + 1 < len(cues) else dur
        seg = music_cue(m['cue'], end - m['t'] + 0.4, hseed(m['cue']) + i)
        fade = np.ones(len(seg))
        nf = min(len(seg), int(0.4 * SR))
        fade[-nf:] = np.linspace(1, 0, nf)
        fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
        add(buf['music'], seg * fade, m['t'])
    # duck music under dialogue
    v_env = np.abs(buf['voice'])
    k = int(0.15 * SR)
    v_env = np.convolve(v_env, np.ones(k) / k, mode='same')
    duck = 1 - 0.55 * np.clip(v_env / 0.08, 0, 1)
    mix = buf['voice'] * 1.0 + buf['sfx'] * 0.8 + buf['music'] * 0.3 * duck
    mix = np.tanh(mix * 1.1) / 1.1
    # light stereo: music wide, rest centre
    L = mix + buf['music'] * 0.03 * duck
    Rr = mix - buf['music'] * 0.03 * duck
    st = np.stack([L, Rr], axis=1)
    st = st / max(1e-9, np.max(np.abs(st))) * 0.89
    pcm = (st * 32767).astype('<i2')
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    if missing:
        print('missing sfx:', sorted(missing))
    print('wrote', out_path, f'{dur:.1f}s', 'lines', len(C['lines']), 'sfx', len(C['sfx']))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
