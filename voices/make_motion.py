#!/usr/bin/env python3
"""Render a motion-graphics scene with its sound design and music bed.

    voices/run make_motion.py levels --music path/to/track.mp3
    voices/run make_motion.py feel --music track.mp3 --out courses/motion/tests/feel.mp4

1. courses/motion/render.cjs draws every frame (six sub-frames each for motion blur) and writes
   the scene's sound cues.
2. Every cue is synthesised here (whoosh, swish, click, tick, pop, impact, ding, riser, roll, draw),
   so nothing is borrowed and every hit lands on its frame.
3. The music starts on a beat in its groove (found automatically) so the scene's beat grid lines
   up; it ducks a little under each impact.
4. Master: -14 LUFS, peaks under -1 dBFS, AAC without noise substitution.
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import loudness  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SR = 48000


# ----------------------------------------------------------------------------- sound kit
def _env(n, a, r, curve=4.0):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    rel = np.exp(-curve * np.clip(t - a, 0, None) / max(r, 1e-4))
    return att * rel


def _band(x, lo, hi, order=2):
    from scipy.signal import butter, sosfilt
    return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], 'bp', fs=SR, output='sos'), x)


def _sweep_noise(n, f0, f1, q=1.2, chunks=48, rng=None):
    """Noise through a band-pass whose centre glides from f0 to f1 (log), chunk by chunk with overlap."""
    rng = rng or np.random.default_rng(1)
    x = rng.standard_normal(n + 2048)
    out = np.zeros(n)
    hop = n // chunks + 1
    win = np.hanning(2 * hop)
    for k in range(chunks + 1):
        c = f0 * (f1 / f0) ** (k / chunks)
        seg = _band(x[max(0, k * hop - hop):k * hop + hop + 1024], c / (1 + 1 / q), c * (1 + 1 / q))
        s = max(0, k * hop - hop)
        m = min(n - s, 2 * hop)
        if m <= 0:
            break
        out[s:s + m] += seg[:m] * win[:m]
    return out / (np.abs(out).max() + 1e-9)


def _pan(mono, l2r=(0.5, 0.5)):
    p = np.linspace(l2r[0], l2r[1], len(mono))
    return np.stack([mono * np.cos(p * np.pi / 2), mono * np.sin(p * np.pi / 2)], 1)


def sound(name, rng):
    n = lambda s: int(s * SR)
    t = lambda s: np.arange(n(s)) / SR
    if name == 'whoosh':
        L = n(0.6); x = _sweep_noise(L, 300, 2600, 1.4, rng=rng)
        e = np.concatenate([np.linspace(0, 1, n(0.36)) ** 2.2, np.linspace(1, 0, L - n(0.36)) ** 1.6])
        return _pan(x * e * 0.55, (0.25, 0.75))
    if name == 'swish':
        L = n(0.24); x = _sweep_noise(L, 1800, 7000, 1.6, rng=rng)
        e = np.concatenate([np.linspace(0, 1, n(0.1)) ** 2, np.linspace(1, 0, L - n(0.1)) ** 2])
        return _pan(x * e * 0.45, (0.4, 0.6))
    if name == 'click':
        tt = t(0.035); f = np.linspace(2200, 900, len(tt))
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(tt), 0.0005, 0.02, 5) + 0.3 * _band(rng.standard_normal(len(tt)), 2000, 8000) * _env(len(tt), 0.0002, 0.006)
        return _pan(x * 0.5)
    if name == 'tick':
        L = n(0.02); x = _band(rng.standard_normal(L), 3000, 10000) * _env(L, 0.0002, 0.008, 6)
        return _pan(x * 0.55)
    if name == 'pop':
        tt = t(0.11); f = 720 * np.exp(-tt * 18) + 330
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(tt), 0.001, 0.07, 5)
        return _pan(x * 0.6)
    if name == 'impact':
        tt = t(1.3); f = 38 + 34 * np.exp(-tt * 9)
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(len(tt), 0.002, 0.7, 3.5)
        burst = _band(rng.standard_normal(len(tt)), 80, 2200) * _env(len(tt), 0.0005, 0.06, 6)
        tail = _band(rng.standard_normal(len(tt)), 200, 5000) * _env(len(tt), 0.01, 0.9, 5) * 0.12
        return _pan((sub * 0.9 + burst * 0.5 + tail))
    if name == 'ding':
        tt = t(1.6)
        x = sum(a * np.sin(2 * np.pi * f * tt) for f, a in ((1318.5, 1), (2637, 0.22), (3955.5, 0.07), (1976, 0.12)))
        x = x * _env(len(tt), 0.003, 1.1, 4.5) * (1 + 0.04 * np.sin(2 * np.pi * 5 * tt))
        return _pan(x * 0.22)
    if name == 'riser':
        L = n(0.95); x = _sweep_noise(L, 300, 5000, 1.2, rng=rng) * 0.6
        tt = t(0.95); g = np.sin(2 * np.pi * np.cumsum(np.linspace(220, 880, L)) / SR) * 0.25
        e = np.linspace(0, 1, L) ** 3
        return _pan((x + g) * e * 0.5, (0.3, 0.7))
    if name == 'roll':
        L = n(1.1); x = np.zeros(L); pos = 0.0; k = 0
        while pos < 1.05:
            gap = 0.022 + 0.09 * (pos / 1.05) ** 2.2
            s = int(pos * SR); c = sound('tick', rng)[:, 0] * (1 - 0.6 * pos)
            x[s:s + len(c)] += c[:L - s]; pos += gap; k += 1
        return _pan(x * 0.8)
    if name == 'draw':
        L = n(1.0); tt = t(1.0)
        x = _band(rng.standard_normal(L), 1200, 6000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.5 * tt))) * _env(L, 0.05, 0.9, 1.5)
        return _pan(x * 0.18, (0.35, 0.65))
    raise SystemExit(f'unknown sound {name!r}')


# ----------------------------------------------------------------------------- music
def music_bed(path, duration, bpm_hint=None):
    """The track from a beat inside its groove, faded in and out, plus where the beats fall."""
    import librosa
    y, sr = librosa.load(path, sr=SR, mono=False)
    y = np.atleast_2d(y)
    if y.shape[0] == 1:
        y = np.vstack([y, y])
    mono = y.mean(0)
    _, beats = librosa.beat.beat_track(y=librosa.resample(mono, orig_sr=SR, target_sr=22050), sr=22050)
    bt = librosa.frames_to_time(beats, sr=22050)
    rms = librosa.feature.rms(y=mono, frame_length=4096, hop_length=2048)[0]
    rt = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=2048)
    full = np.percentile(rms, 90)
    grooving = rt[np.argmax(rms > 0.8 * full)]                     # where the track has arrived
    start = float(bt[np.searchsorted(bt, grooving)]) if len(bt) else 0.0
    s = int(start * SR)
    bed = y[:, s:s + int(duration * SR)].T
    bed = np.pad(bed, ((0, max(0, int(duration * SR) - len(bed))), (0, 0)))
    fi, fo = int(0.25 * SR), int(0.9 * SR)
    bed[:fi] *= np.linspace(0, 1, fi)[:, None]; bed[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return bed, start


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('scene', help='scene name in courses/motion/scenes/ (levels, feel, survivor)')
    ap.add_argument('--music', type=Path, help='music bed (mp3/wav); without it, sound design only')
    ap.add_argument('--out', type=Path, help='output mp4 (default courses/motion/tests/<scene>.mp4)')
    ap.add_argument('--samples', type=int, default=6, help='motion-blur sub-frames per frame (default 6)')
    args = ap.parse_args()
    out = (args.out or ROOT / 'courses' / 'motion' / 'tests' / f'{args.scene}.mp4').resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    silent = out.with_name(out.stem + '_silent.mp4')
    subprocess.run(['node', str(ROOT / 'courses' / 'motion' / 'render.cjs'), args.scene, str(silent), '--samples', str(args.samples)], check=True)
    info = json.loads(silent.with_suffix('.cues.json').read_text())
    dur = info['duration']
    n = int((dur + 1.5) * SR)
    fx = np.zeros((n, 2))
    rng = np.random.default_rng(5)
    duck = np.ones(n)
    for cue in info['cues']:
        x = sound(cue['s'], rng) * cue.get('g', 1.0)
        s = int(cue['t'] * SR)
        fx[s:s + len(x)] += x[:n - s]
        if cue['s'] in ('impact', 'whoosh'):  # the music steps back for the hit
            d = int(0.45 * SR); e = 1 - 0.35 * np.exp(-np.arange(d) / (0.18 * SR))
            duck[s:s + d] = np.minimum(duck[s:s + d], e[:n - s])
    import soundfile as sf
    tmp = out.with_name(out.stem + '_mix.wav')
    mix = fx.copy()
    if args.music:
        bed, start = music_bed(args.music, dur + 1.5)
        print(f'  music from {start:.2f} s (on a beat)')
        sf.write(tmp, bed, SR)
        g_bed = 10 ** ((-19 - loudness(tmp)) / 20)                  # bed at about -19 LUFS
        mix = mix + bed * g_bed * duck[:, None]
    sf.write(tmp, mix / (np.abs(mix).max() + 1e-9) * 0.7, SR)
    gain = -14 - loudness(tmp)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(silent), '-i', str(tmp), '-map', '0:v', '-map', '1:a',
                    '-af', f'volume={gain:.2f}dB,alimiter=limit=0.84:attack=2:release=50:level=false',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-aac_pns', '0', '-t', f'{dur:.3f}', '-movflags', '+faststart', str(out)], check=True)
    for f in (tmp, silent, silent.with_suffix('.cues.json')):
        f.unlink(missing_ok=True)
    print(f'wrote {out}')


if __name__ == '__main__':
    main()
