"""Put the performance of an original recording back into a converted voice.

Voice converters rebuild the audio from speech sounds, so breaths, gulps, sniffs and the
air between words come out smeared, missing or as dead silence, and the loudness swings of
the performance get flattened. transfer() fixes that:

  speech   -> the converted voice, lined up with the original and with the original's
              loudness shape (-4..+4 dB, ~50 ms smoothing, so her consonants stay hers)
  between  -> the original recording itself (breaths, gulps, sniffs, room air), with
              hiss-only moments turned down 12 dB while breaths keep their full level,
              shaped toward a smaller vocal tract, at the same level relative to speech
  under    -> the same quieted room tone continues under the converted speech, so the air
              never drops out

Any frame where the original has pitch always comes from the converted voice, so the
original speaker's voice never leaks through.
"""
import numpy as np


def _to_samples(x, hop, n):
    return np.interp(np.arange(n), np.arange(len(x)) * hop + hop / 2, x)


def _smooth(x, k):
    w = np.hanning(k)
    return np.convolve(x, w / w.sum(), mode='same')


def speech_regions(y, sr):
    """[(start_s, end_s)] where the speaker talks (Silero speech detector)."""
    import librosa
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    y16 = librosa.resample(y, orig_sr=sr, target_sr=16000).astype(np.float32)
    opts = VadOptions(threshold=0.5, min_silence_duration_ms=120, speech_pad_ms=20)
    return [(d['start'] / 16000, d['end'] / 16000) for d in get_speech_timestamps(y16, opts)]


def transfer(src, conv, sr, dehiss_db=-12.0, extra=None):
    """Return (audio, info). src = original recording, conv = converted take, both mono at sr.
    extra: the audio that was actually converted, when it is not src (e.g. an American voice
    carrying your timing): its speech also counts as speech, so a word it places slightly
    outside your own speech is kept rather than replaced by your silence."""
    import librosa
    from scipy.signal import butter, sosfilt
    n = min(len(src), len(conv))
    src, conv = src[:n].astype(np.float64), conv[:n].astype(np.float64)
    hop = sr // 100  # 10 ms frames
    rms = lambda y: librosa.feature.rms(y=y, frame_length=2 * hop, hop_length=hop)[0][: n // hop + 1]
    frame_mean = lambda m: librosa.util.frame(np.pad(m, (hop, hop)), frame_length=2 * hop, hop_length=hop).mean(0)

    # 1. line the converted take up with the original (the vocoder can add a small delay)
    da, db = (20 * np.log10(rms(y) + 1e-6) for y in (src, conv))
    lags = list(range(-8, 9))  # +-80 ms
    lag = lags[int(np.argmax([np.corrcoef(da[20:-20], np.roll(db, -l)[20:-20])[0, 1] for l in lags]))]
    conv = np.roll(conv, -lag * hop)
    if lag > 0:
        conv[-lag * hop:] = 0
    elif lag < 0:
        conv[:-lag * hop] = 0

    # 2. where the converted voice is used: speech, plus +-30 ms around any frame with pitch
    mask = np.zeros(n)
    for a, b in speech_regions(src, sr):
        mask[int(a * sr):int(b * sr)] = 1
    y16 = librosa.resample(src, orig_sr=sr, target_sr=16000)
    f0 = librosa.pyin(y16, fmin=60, fmax=500, sr=16000, frame_length=1024, hop_length=160)[0]
    voiced = np.convolve(~np.isnan(f0), np.ones(7), mode='same') > 0
    mask = np.maximum(mask, _to_samples(voiced, hop, n) > 0.5).astype(float)
    only_extra = np.zeros(n)
    if extra is not None:
        extra = np.pad(np.asarray(extra, dtype=np.float64), (0, max(0, n - len(extra))))[:n]
        em = np.zeros(n)
        for a, b in speech_regions(extra, sr):
            em[int(max(0, a - 0.03) * sr):int((b + 0.05) * sr)] = 1
        only_extra = (em > 0) & (mask < 0.5)
        mask = np.maximum(mask, em)
    mask = np.clip(_smooth(mask, int(0.03 * sr)), 0, 1)  # 15 ms crossfades

    # 3. turn down moments that are only room hiss; anything clearly above the hiss (a breath,
    #    gulp or sniff) keeps its full level. Time-based, because breaths sound too much like
    #    hiss for a frequency-based cleaner (it took 7 dB off the breaths in testing).
    lv = 20 * np.log10(rms(src) + 1e-9)
    gapf = frame_mean(mask)[: len(lv)] < 0.1
    hiss = np.percentile(lv[gapf], 30) if gapf.sum() > 20 else np.percentile(lv, 10)
    cut = dehiss_db * np.clip(1 - (lv - hiss - 2) / 6, 0, 1)  # full cut at hiss level, none 8 dB above it
    clean = src * 10 ** (_to_samples(_smooth(cut, 5), hop, n) / 20)
    floor = 10 ** (dehiss_db / 20)
    nfft, h = 2048, 512  # room-noise spectrum, for the tone laid under her speech
    X = librosa.stft(src, n_fft=nfft, hop_length=h)
    mag = np.abs(X)
    fm = librosa.util.frame(np.pad(mask, (nfft // 2, nfft // 2)), frame_length=nfft, hop_length=h).mean(0)[: mag.shape[1]]
    energy = mag.sum(0)
    gaps = fm < 0.1
    quiet = gaps & (energy <= np.percentile(energy[gaps], 40)) if gaps.sum() > 10 else energy <= np.percentile(energy, 20)
    noise = np.median(mag[:, quiet], axis=1, keepdims=True)

    # 4. breaths toward a smaller vocal tract: less low end, a little more 2.5-6 kHz
    breath = sosfilt(butter(1, 200, 'hp', fs=sr, output='sos'), clean)
    breath = breath + 0.26 * sosfilt(butter(2, [2500, 6000], 'bp', fs=sr, output='sos'), breath)
    speech = mask > 0.9
    k = np.percentile(np.abs(conv[speech]), 99) / np.percentile(np.abs(src[speech]), 99)
    breath *= k

    # 5. her loudness follows the original wherever her voice is used (gentle: stronger
    #    settings made her sound less like herself in testing)
    ra, rb = rms(src), rms(conv)
    fmask = frame_mean(mask)[: len(ra)]
    Ra, Rb = np.percentile(ra[fmask > 0.5], 95), np.percentile(rb[fmask > 0.5], 95)
    g = np.clip((ra / Ra + 1e-4) / (rb / Rb + 1e-4), 10 ** (-4 / 20), 10 ** (4 / 20))
    oe = frame_mean(only_extra.astype(float))[: len(ra)] > 0.5  # you were silent there: no level to follow
    g = 10 ** _smooth(np.log10(np.where((fmask > 0.01) & ~oe, g, 1.0)), 9)  # ~50 ms
    shaped = conv * _to_samples(g, hop, n)

    # 6. the same de-hissed room tone continues under her speech
    rng = np.random.default_rng(3)
    tone = librosa.istft(noise * floor * np.exp(2j * np.pi * rng.random((noise.shape[0], X.shape[1]))),
                         hop_length=h, length=n) * k
    out = mask * (shaped + 0.5 * tone) + (1 - mask) * breath  # air under speech at half level
    return out.astype(np.float32), dict(aligned_ms=lag * 10, gain_to_match=round(float(k), 3))
