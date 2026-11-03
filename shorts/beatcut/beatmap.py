"""Beat maps: the timing skeleton every cut, punch-in and caption hangs on.

Two ways to get one:

    grid(bpm, bars)        exact grid for a known tempo (what you use when the
                           music is added later in the YouTube app: look up the
                           trending sound's BPM, render to that grid)
    analyze(audio_path)    estimate tempo, beats, downbeats and the drop from a
                           track you have the rights to use

CLI:
    python3 -m beatcut.beatmap --bpm 125 --bars 13 -o beatmap.json
    python3 -m beatcut.beatmap track.mp3 -o beatmap.json

A beat map is a dict:
    bpm, beats_per_bar, beats (seconds, beats[0] is a downbeat),
    end (time the last bar ends), source, and for analyzed tracks
    bar_rms (loudness per bar) and drop_bar (index of the biggest energy jump).
"""
import argparse
import json
import subprocess

import numpy as np


def grid(bpm, bars, offset=0.0, beats_per_bar=4):
    spb = 60.0 / bpm
    n = bars * beats_per_bar
    return {"bpm": bpm, "beats_per_bar": beats_per_bar, "source": "grid",
            "beats": [round(offset + i * spb, 6) for i in range(n)],
            "end": round(offset + n * spb, 6)}


def load_audio(path, sr=22050):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy(), sr


def _stft_mag(y, n_fft, hop):
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + (len(y) - n_fft) // hop
    frames = np.lib.stride_tricks.as_strided(y, shape=(n, n_fft), strides=(y.strides[0] * hop, y.strides[0]))
    return np.abs(np.fft.rfft(frames * win, axis=1))


def onset_envelopes(y, sr, hop=256, n_fft=1024):
    """Spectral-flux onset strength: full band and low band (kick)."""
    S = np.log1p(100.0 * _stft_mag(y, n_fft, hop))
    flux = np.maximum(0.0, np.diff(S, axis=0))
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    full = flux.sum(1)
    low = flux[:, freqs < 160].sum(1)
    # remove slow trend so quiet and loud sections both register
    k = int(sr / hop)  # ~1 s
    trend = np.convolve(full, np.ones(k) / k, mode="same")
    full = np.maximum(0.0, full - trend)
    fps = sr / hop
    # flux[i] compares frames i and i+1, so an onset at time t peaks at
    # i = (t - hop - n_fft/2) / hop; delay the envelope so index i means t = i / fps
    lag = int(round((hop + n_fft / 2) / hop))
    full = np.concatenate([np.zeros(lag), full[:-lag]])
    low = np.concatenate([np.zeros(lag), low[:-lag]])
    return full / (full.std() + 1e-9), low / (low.std() + 1e-9), fps


def estimate_tempo(env, fps, lo=70, hi=180, prior_bpm=120.0):
    env = env - env.mean()
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    lags = np.arange(len(ac))
    bpms = np.where(lags > 0, 60.0 * fps / np.maximum(lags, 1), 0)
    ok = (bpms >= lo) & (bpms <= hi)
    # log-normal prior around a typical pop tempo, like most beat trackers use
    prior = np.exp(-0.5 * (np.log2(np.maximum(bpms, 1e-9) / prior_bpm) / 0.9) ** 2)
    score = np.where(ok, ac * prior, -np.inf)
    lag = int(np.argmax(score))
    # parabolic refinement of the peak
    if 1 <= lag < len(ac) - 1:
        a, b, c = ac[lag - 1], ac[lag], ac[lag + 1]
        d = 0.5 * (a - c) / (a - 2 * b + c + 1e-12)
        lag = lag + float(np.clip(d, -0.5, 0.5))
    return 60.0 * fps / lag


def track_beats(env, fps, bpm, tightness=100.0):
    """Dynamic-programming beat tracker (Ellis 2007)."""
    period = 60.0 * fps / bpm
    n = len(env)
    score = env.astype(np.float64).copy()
    back = np.full(n, -1)
    lo, hi = int(round(period / 2)), int(round(period * 2))
    offs = np.arange(lo, hi + 1)
    penalty = -tightness * np.log(offs / period) ** 2
    for t in range(hi, n):
        cand = score[t - offs] + penalty
        j = int(np.argmax(cand))
        score[t] = env[t] + cand[j]
        back[t] = t - offs[j]
    # start from the best-scoring frame in the last period, walk back
    t = int(n - period + np.argmax(score[int(n - period):]))
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    return np.array(beats[::-1]) / fps


def analyze(path, beats_per_bar=4, bpm=None):
    y, sr = load_audio(path)
    full, low, fps = onset_envelopes(y, sr)
    # kick band weighted in: keeps the tracker on the beat, not the off-beat hats
    env = full + low
    if bpm is None:
        bpm = estimate_tempo(env, fps)
    beats = track_beats(env, fps, bpm)
    # downbeat phase: the phase whose beats carry the most kick energy
    idx = np.clip(np.round(beats * fps).astype(int), 0, len(low) - 1)
    phase_strength = [low[idx[p::beats_per_bar]].mean() if len(idx[p::beats_per_bar]) else 0
                      for p in range(beats_per_bar)]
    phase = int(np.argmax(phase_strength))
    beats = beats[phase:]
    nbars = len(beats) // beats_per_bar
    beats = beats[:nbars * beats_per_bar]
    # tempo from a straight-line fit through the beats (the median interval is
    # quantized to the envelope frame rate)
    spb = float(np.polyfit(np.arange(len(beats)), beats, 1)[0])
    # loudness per bar and the drop (largest rise over the two bars before)
    bar_rms = []
    for b in range(nbars):
        s = int(beats[b * beats_per_bar] * sr)
        e = int((beats[(b + 1) * beats_per_bar] if b + 1 < nbars else beats[-1] + spb) * sr)
        bar_rms.append(float(np.sqrt(np.mean(y[s:e] ** 2) + 1e-12)))
    rms = np.array(bar_rms)
    rise = [rms[b] - rms[max(0, b - 2):b].mean() if b >= 2 else 0 for b in range(nbars)]
    return {"bpm": round(60.0 / spb, 2), "bpm_autocorr": round(float(bpm), 2), "beats_per_bar": beats_per_bar,
            "source": str(path), "beats": [round(float(t), 4) for t in beats],
            "end": round(float(beats[-1] + spb), 4), "bar_rms": [round(v, 5) for v in bar_rms],
            "drop_bar": int(np.argmax(rise))}


def window(beatmap, start_bar, bars):
    """Cut `bars` bars out of a beat map starting at `start_bar`, re-zeroed so
    the window's first downbeat is t=0. Returns (beatmap, song_offset_seconds)."""
    bpb = beatmap["beats_per_bar"]
    beats = beatmap["beats"]
    need = (start_bar + bars) * bpb
    if need > len(beats):
        raise ValueError(f"track has {len(beats) // bpb} bars, need {start_bar + bars}")
    t0 = beats[start_bar * bpb]
    sel = beats[start_bar * bpb:need]
    end = beats[need] if need < len(beats) else beatmap["end"]
    out = dict(beatmap, beats=[round(t - t0, 4) for t in sel], end=round(end - t0, 4))
    out.pop("bar_rms", None)
    return out, t0


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("audio", nargs="?")
    ap.add_argument("--bpm", type=float)
    ap.add_argument("--bars", type=int, default=16)
    ap.add_argument("-o", "--out")
    a = ap.parse_args()
    bm = analyze(a.audio, bpm=a.bpm) if a.audio else grid(a.bpm, a.bars)
    txt = json.dumps(bm, indent=1)
    if a.out:
        open(a.out, "w").write(txt)
    print(f"bpm {bm['bpm']}  beats {len(bm['beats'])}  bars {len(bm['beats']) // bm['beats_per_bar']}"
          + (f"  drop at bar {bm['drop_bar']}" if "drop_bar" in bm else ""))
