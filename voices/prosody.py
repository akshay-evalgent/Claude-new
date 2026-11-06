#!/usr/bin/env python3
"""Prosody transfer: make one recording follow the timing and intonation of another.

Used to keep an American accent while keeping your performance: an American text-to-speech
voice says the words (so the vowels and consonants are US English), then each phrase is
re-timed to your word timing and its pitch follows your rises and falls, scaled into the
American voice's own range. Praat's PSOLA (via parselmouth) does the resynthesis.

    from prosody import transplant
    y = transplant(tts_audio, ref_audio, sr, tts_words, ref_words)

`*_words` are [(word, start, end)] in seconds within each clip (speech-to-text word timestamps).
"""
import difflib, re
import numpy as np


def _norm(w):
    return re.sub(r"[^a-z0-9]", '', w.lower())


def _expand(words):
    """Split contractions so "you're" can match "you are": [(token, start, end)]."""
    out = []
    for w, s, e in words:
        toks = re.sub(r"'re\b", ' are', re.sub(r"'m\b", ' am', re.sub(r"n't\b", ' not', w.lower()))).split()
        toks = [t for t in (_norm(x) for x in toks) if t] or [_norm(w)]
        n = len(toks)
        out += [(t, s + (e - s) * k / n, s + (e - s) * (k + 1) / n) for k, t in enumerate(toks)]
    return out


def time_map(tts_words, ref_words, tts_len, ref_len):
    """Anchors (t_tts, t_ref): matched words' starts and ends, plus both clip edges; monotonic."""
    a, b = _expand(tts_words), _expand(ref_words)
    anchors = [(0.0, 0.0)]
    sm = difflib.SequenceMatcher(None, [x[0] for x in a], [x[0] for x in b], autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                anchors += [(a[i1 + k][1], b[j1 + k][1]), (a[i1 + k][2], b[j1 + k][2])]
        elif tag == 'replace':  # a different word in the same place: map the span as a whole
            anchors += [(a[i1][1], b[j1][1]), (a[i2 - 1][2], b[j2 - 1][2])]
    anchors.append((tts_len, ref_len))
    anchors.sort()
    clean = [anchors[0]]
    for t, r in anchors[1:]:
        if t > clean[-1][0] + 0.02 and r > clean[-1][1] + 0.02:
            clean.append((t, r))
    if clean[-1] != (tts_len, ref_len):
        clean[-1] = (tts_len, ref_len)
    return clean


def _pitch(snd):
    import parselmouth
    p = snd.to_pitch_ac(time_step=0.01, pitch_floor=60, pitch_ceiling=400)
    t = p.xs()
    f = p.selected_array['frequency']
    v = f > 0
    return t[v], f[v]


def transplant(tts, ref, sr, tts_words, ref_words, pitch_range=1.0, max_stretch=2.2):
    """tts and ref are mono float arrays at sr. Returns tts re-timed to ref's words and carrying
    ref's intonation (as semitones around each voice's own median), at sr."""
    import parselmouth
    from parselmouth.praat import call
    tts = np.asarray(tts, dtype=np.float64)
    ref = np.asarray(ref, dtype=np.float64)
    T, R = len(tts) / sr, len(ref) / sr
    anchors = time_map(tts_words, ref_words, T, R)
    at, ar = np.array([x[0] for x in anchors]), np.array([x[1] for x in anchors])

    s_tts = parselmouth.Sound(tts, sampling_frequency=sr)
    s_ref = parselmouth.Sound(ref, sampling_frequency=sr)
    manip = call(s_tts, 'To Manipulation', 0.01, 60, 400)

    # timing: a step duration factor between each pair of anchors
    dt = call('Create DurationTier', 'dur', 0, T)
    for k in range(len(at) - 1):
        f = float(np.clip((ar[k + 1] - ar[k]) / max(1e-3, at[k + 1] - at[k]), 1 / max_stretch, max_stretch))
        call(dt, 'Add point', at[k] + 0.0005, f)
        call(dt, 'Add point', at[k + 1] - 0.0005, f)
    call([dt, manip], 'Replace duration tier')

    # intonation: your contour, in semitones around your median, placed around the voice's median
    tt, tf = _pitch(s_tts)
    rt, rf = _pitch(s_ref)
    if len(tt) > 5 and len(rf) > 5:
        med_t, med_r = np.median(tf), np.median(rf)
        st = 12 * np.log2(rf / med_r)
        pt = call('Create PitchTier', 'pitch', 0, T)
        for t in tt:  # each voiced frame of the TTS, in its own time
            u = float(np.interp(t, at, ar))
            near = np.min(np.abs(rt - u))
            if near > 0.12:  # you were unvoiced here: keep the voice's own pitch, moved to your level
                f = float(np.interp(t, tt, tf)) * 2 ** (float(np.interp(u, rt, st)) * 0.3 / 12)
            else:
                f = med_t * 2 ** (pitch_range * float(np.interp(u, rt, st)) / 12)
            call(pt, 'Add point', float(t), float(np.clip(f, 55, 400)))
        call([pt, manip], 'Replace pitch tier')

    out = call(manip, 'Get resynthesis (overlap-add)')
    y = out.values[0].astype(np.float32)
    # the result should now be as long as ref; pad or trim the last few ms
    n = len(ref)
    return np.pad(y, (0, max(0, n - len(y))))[:n] if abs(len(y) - n) < 0.25 * sr else y
