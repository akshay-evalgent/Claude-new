"""Mix the voice-over into the score: clean the voice, duck the music under it, write
out/audio_vo_raw.wav. Run after score.py and vo.py; then loudness-normalise (see README)."""
import os
import sys

import numpy as np
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'engine'))
from audio_lib import SR, write_wav, apply_reverb, reverb_ir  # noqa


def read_wav(p):
    import wave
    with wave.open(p) as w:
        n, ch, sr = w.getnframes(), w.getnchannels(), w.getframerate()
        x = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768
    assert sr == SR, (p, sr)
    return x.reshape(-1, ch).T


def follow(x, att, rel):
    """peak envelope follower (attack/release in seconds)"""
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    out = np.zeros_like(x)
    e = 0.0
    for i, v in enumerate(np.abs(x)):
        e = a * e + (1 - a) * v if v > e else r * e + (1 - r) * v
        out[i] = e
    return out


music = read_wav(os.path.join(HERE, 'out', 'audio_raw.wav'))
vo = read_wav(os.path.join(HERE, 'out', 'vo.wav'))[0]
n = min(music.shape[1], len(vo))
music, vo = music[:, :n], vo[:n]

# voice chain: rumble cut, gentle presence lift, compression, peak trim
vo = sosfilt(butter(2, 90 / (SR / 2), 'high', output='sos'), vo)
pres = sosfilt(butter(2, [2500 / (SR / 2), 6000 / (SR / 2)], 'band', output='sos'), vo)
vo = vo + .35 * pres
env = follow(vo, .004, .08)
thr = 10 ** (-24 / 20)
gain = np.where(env > thr, (np.maximum(env, thr) / thr) ** (1 / 3 - 1), 1.0)  # 3:1 above -24 dBFS
vo = vo * gain
vo = vo / (np.max(np.abs(vo)) + 1e-9) * .9

# sidechain: duck music ~9 dB while the voice speaks, with 60 ms look-ahead
sc = follow(vo, .015, .32)
la = int(.06 * SR)
sc = np.concatenate([sc[la:], np.zeros(la)])
k = np.clip(sc / .06, 0, 1)
# split-band ducking: carve the speech band hard (about -14 dB), keep the low end's punch (about -5 dB)
lo_sos = butter(4, 260 / (SR / 2), 'low', output='sos')
m_lo = np.stack([sosfilt(lo_sos, c) for c in music])
m_hi = music - m_lo
mus = m_lo * (1 - .45 * k) + m_hi * (1 - .8 * k)

voice = np.stack([vo, vo])
voice = apply_reverb(voice, reverb_ir(.6, 21, damp=5000), .05)
mix = mus + voice * 1.0
peak = np.max(np.abs(mix))
if peak > .98:
    mix = mix / peak * .98
write_wav(os.path.join(HERE, 'out', 'audio_vo_raw.wav'), mix)
print('wrote out/audio_vo_raw.wav  (peak before trim %.2f)' % peak)
