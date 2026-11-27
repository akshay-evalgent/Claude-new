"""Voice-over generator: one real-sounding voice per character (Kokoro TTS, local) plus
real animal recordings for the non-speaking lines (Greg's bleats).

Reads the episode cues (every say() line), writes one WAV per line into
../episodes/<ep>/vo/ and a manifest.json the timeline reads back so that captions, mouth
movement and shot lengths follow the real recorded timing.

Usage (inside the TTS venv):
  python vo.py <episode> --model <dir with kokoro-v1.0.onnx + voices-v1.0.bin> --sfx <dir of prepared animal clips>
"""
import argparse
import hashlib
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

SR = 48000
FPS = 30

# Character casting. pitch = semitones (resample up/down, formants move with it, which is the point
# for the parrot and the kid); speed is the TTS speaking rate before the pitch change.
CASTING = {
    'ava':     dict(voice='af_heart',  speed=0.98, pitch=1.6, gain=1.0),
    'rex':     dict(voice='am_puck',   speed=1.08, pitch=0.0, gain=1.0),
    'duchess': dict(voice='bf_emma',   speed=0.88, pitch=0.0, gain=0.95),
    'pico':    dict(voice='af_bella',  speed=0.86, pitch=5.0, gain=0.9, fx='parrot'),
    'lou':     dict(voice='af_nicole', speed=0.78, pitch=-0.8, gain=1.15),
    'mom':     dict(voice='af_sarah',  speed=1.02, pitch=-0.5, gain=1.1),
    'greg':    dict(sample='goat'),
}


# Alternative TTS spellings tried when the first take is not clearly understood.
VARIANTS = {
    'Lou.': ['Lou!', 'Lou...', 'Loo.'],
    'And... Lou?': ['And Lou?', 'And... Loo?'],
    'Go FETCH!': ['Go fetch!', 'Go, fetch!', 'Go fetch!!'],
    'SNACKS!': ['Snacks!', 'Snacks!!', 'Snacks.'],
    'SNACKS! SERVANTS!': ['Snacks! Servants!', 'Snacks... servants!', 'Snacks, servants!'],
    'Pure talent.': ['Pure talent!', 'Pure... talent.'],
    "It's... wool.": ["It's wool.", "It's... wool!", "It's woool."],
    "I'M COMING, AVA!": ["I'm coming, Ava!", "I'm coming, Ayva!", "I'm coming Ava!"],
    'Faster, goat!': ['Faster, goat!!', 'Faster... goat!', 'Faster, goat.'],
    'Define... share.': ['Define, share.', 'Define... "share."', 'Define share.'],
    'THREE A.M.! THREE A.M.!': ['Three A M! Three A M!', 'Three a.m.! Three a.m.!'],
    'Hm.': ['Hmm.', 'Hmph.'],
}
# lines whose take was replaced by an alternative spelling keep their script text for captions


def key_for(who, text):
    return who + '|' + text


def fname_for(who, text):
    return f"{who}_{hashlib.sha1(text.encode()).hexdigest()[:10]}.wav"


def tts_text(text):
    t = text.replace('*', '')
    t = re.sub(r'^\.\.\.\s*', '', t)
    t = t.replace('A.M.', 'A M').replace('3 AM', 'three A M')
    t = t.replace('—', '...')
    # all-caps words would be spelled out letter by letter; shouting is carried by '!'
    t = re.sub(r"\b([A-Z][A-Z']+)\b", lambda m: m.group(1).capitalize() if m.group(1) not in ('A', 'I') else m.group(1), t)
    t = t.replace("I'M", "I'm")
    return t


def resample(x, ratio):
    """ratio > 1 speeds up and raises pitch."""
    if abs(ratio - 1) < 1e-4:
        return x
    n = int(len(x) / ratio)
    return np.interp(np.arange(n) * ratio, np.arange(len(x)), x)


def to_sr(x, sr_in):
    return resample(x, sr_in / SR) if sr_in != SR else x


def trim(x, thr=0.012, pad=0.04):
    a = np.abs(x)
    idx = np.where(a > thr * max(1e-9, a.max()))[0]
    if not len(idx):
        return x
    s = max(0, idx[0] - int(pad * SR))
    e = min(len(x), idx[-1] + int(pad * SR))
    return x[s:e]


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = ((f >= lo) & (f <= hi)).astype(float)
    m = np.convolve(m, np.ones(31) / 31, mode='same')
    return np.fft.irfft(X * m, n=len(x))


def fx_parrot(x):
    # nasal, thin, a little crunchy, like a talking bird
    y = band(x, 700, 7500) * 1.6 + 0.25 * x
    y = np.tanh(y * 2.2) / 2.2
    return y


def envelope(x):
    hop = SR // FPS
    n = int(np.ceil(len(x) / hop))
    e = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) if len(x[i * hop:(i + 1) * hop]) else 0 for i in range(n)])
    e = e / max(1e-9, np.percentile(e, 95))
    return np.clip(e, 0, 1)


def word_times(text, x):
    """Approximate word timing: syllable-weighted split of the voiced span."""
    words = [w for w in text.replace('*', '').split() if w]
    syl = []
    for w in words:
        m = re.findall(r'[aeiouy]+', re.sub(r'e$', '', w.lower()))
        syl.append(max(1, len(m)))
    dur = len(x) / SR
    tot = sum(syl)
    out, t = [], 0.0
    for w, s in zip(words, syl):
        d = dur * s / tot
        out.append([round(t, 3), round(t + d, 3)])
        t += d
    return out


def normalize(x, peak=0.89):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ep')
    ap.add_argument('--model', required=True)
    ap.add_argument('--sfx', required=True)
    ap.add_argument('--cues', default=None)
    ap.add_argument('--qc', action='store_true', help='check every take with speech recognition and retry weak lines')
    ap.add_argument('--redo', default='', help='| separated script lines to regenerate')
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    cues = json.load(open(a.cues or os.path.join(here, 'out', a.ep, 'cues.json')))
    vodir = os.path.join(here, '..', 'episodes', a.ep, 'vo')
    os.makedirs(vodir, exist_ok=True)
    man_path = os.path.join(vodir, 'manifest.json')
    manifest = json.load(open(man_path)) if os.path.exists(man_path) else {}

    from kokoro_onnx import Kokoro
    kok = Kokoro(os.path.join(a.model, 'kokoro-v1.0.onnx'), os.path.join(a.model, 'voices-v1.0.bin'))

    asr = None
    if a.qc:
        from faster_whisper import WhisperModel
        asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    redo = set(t for t in a.redo.split('|') if t)

    def score(x, text):
        if asr is None:
            return 1.0, ''
        x16 = np.interp(np.arange(int(len(x) * 16000 / SR)) * SR / 16000, np.arange(len(x)), x).astype(np.float32)
        x16 = np.concatenate([np.zeros(4000, np.float32), x16, np.zeros(8000, np.float32)])
        segs, _ = asr.transcribe(x16, beam_size=5, language='en', initial_prompt='Characters: Ava, Rex, Duchess, Pico, Lou, Greg.')
        hyp = ' '.join(s.text for s in segs).strip()
        nums = {'1': 'one', '3': 'three', '3am': 'three am', 'am': 'am'}
        norm = lambda s: ' '.join(nums.get(w, w) for w in re.sub(r'[^a-z0-9 ]', ' ', s.lower()).split()).split()
        ref, got = norm(text), norm(hyp)
        hit = sum(1 for w in ref if w in got) / max(1, len(ref))
        extra = max(0, len(got) - len(ref)) * 0.15
        return hit - extra, hyp

    def take(c, spoken, speed):
        samples, sr = kok.create(spoken, voice=c['voice'], speed=speed, lang='en-gb' if c['voice'].startswith('b') else 'en-us')
        x = to_sr(np.asarray(samples, dtype=np.float64), sr)
        if c.get('pitch'):
            x = resample(x, 2 ** (c['pitch'] / 12))
        if c.get('fx') == 'parrot':
            x = fx_parrot(x)
        return trim(x)

    goats = sorted(f for f in os.listdir(a.sfx) if f.startswith('goat_'))
    goat_i = 0
    done = 0
    for line in cues['lines']:
        who, text = line['who'], line['text']
        if line.get('novoice'):
            continue
        k = key_for(who, text)
        fn = fname_for(who, text)
        path = os.path.join(vodir, fn)
        if k in manifest and os.path.exists(path) and text not in redo and not (a.qc and manifest[k].get('qc') is None and who != 'greg'):
            continue
        c = CASTING[who]
        if 'sample' in c:
            # Greg only bleats: pick the next real goat clip
            clip, sr = sf.read(os.path.join(a.sfx, goats[goat_i % len(goats)]), always_2d=False)
            goat_i += 1
            if clip.ndim > 1:
                clip = clip.mean(axis=1)
            x = trim(to_sr(clip, sr))
            if '!' in text:
                x = np.tanh(x * 2.5)
        else:
            best = None
            tries = [(tts_text(text), c['speed'])]
            for v in VARIANTS.get(text, []):
                tries.append((tts_text(v), c['speed']))
            tries += [(tts_text(text), c['speed'] * 0.88), (tts_text(text), c['speed'] * 1.1)]
            for spoken, speed in tries:
                x_try = take(c, spoken, speed)
                sc, hyp = score(x_try, text)
                if best is None or sc > best[0] + 1e-6:
                    best = (sc, x_try, spoken, hyp)
                if asr is None or sc >= 0.99:
                    break
            sc, x, spoken, hyp = best
            if asr is not None:
                print(f"   qc {sc:4.0%} heard: {hyp!r} (tts text: {spoken!r})")
        x = normalize(x) * c.get('gain', 1.0) if 'gain' in c else normalize(x)
        sf.write(path, x.astype(np.float32), SR)
        env = envelope(x)
        manifest[k] = dict(file=fn, who=who, text=text, dur=round(len(x) / SR, 3), env=[round(float(v), 2) for v in env], words=word_times(text, x))
        if who != 'greg' and asr is not None:
            manifest[k]['qc'] = round(float(sc), 2)
            manifest[k]['heard'] = hyp
        done += 1
        print(f"{who:8s} {len(x)/SR:5.2f}s  {text}")
        sys.stdout.flush()
    json.dump(manifest, open(man_path, 'w'), indent=0)
    print('generated', done, 'lines; manifest has', len(manifest))


if __name__ == '__main__':
    main()
