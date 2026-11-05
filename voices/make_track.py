#!/usr/bin/env python3
"""Make an emotional voice track for one scene with VoxCPM2 (free Hugging Face demo).

    python voices/make_track.py voices/girlfriend/comeback-crying --takes 2

Scene folder:      script.json  -> [{"text", "control", "pause_after"}, ...]
Optional:          scene.json   -> overrides any character.json key for this scene,
                                   e.g. {"lang": "hi", "reference": "voice_crying_hindi.mp3", ...}
Character folder:  character.json (the scene's parent folder)
    {"reference": "voice_crying.mp3",      clip every line copies the voice from
     "reference_text": "...",              exact words spoken in that clip
     "identity": "voice_normal.mp3",       her everyday voice, used to score takes
     "lang": "en"}                         language of the script (en, hi, ...)

Steps: generate N takes per line (takes that already exist are kept), check each take
with speech-to-text and a speaker-match score against the identity voice, keep the best
take per line, join them with pauses, add light room echo and faint ambience, and
normalise to -14 LUFS (Instagram). Writes <scene>_mixed.mp3 and <scene>_voice_only.mp3.
"""
import argparse, difflib, json, re, shutil, subprocess, time, unicodedata
from pathlib import Path

SR = 48000


def generate(text, control, ref, ref_text, out):
    from gradio_client import Client, handle_file
    client = Client('OpenBMB/VoxCPM-Demo', verbose=False)
    for attempt in range(12):
        try:
            path = client.predict(text_input=text, control_instruction=control,
                                  reference_wav_path_input=handle_file(str(ref)),
                                  use_prompt_text=bool(ref_text), prompt_text_input=ref_text,
                                  cfg_value_input=2.0, do_normalize=False, denoise=False,
                                  api_name='/generate')
            shutil.copy(path, out)
            return
        except Exception as e:  # the free demo is often busy; wait and retry
            print(f'  busy, retrying ({attempt + 1}): {str(e)[:80]}', flush=True)
            time.sleep(min(10 * (attempt + 1), 45))
    raise SystemExit(f'gave up on {out}')


def text_match(expected, heard, lang):
    """Share of the script that speech-to-text heard, 0-1."""
    if lang == 'en':
        def tokens(s):
            return re.sub(r"[^a-z' ]", '', s.lower().replace('-', ' ')).split()
    else:  # compare letters only, ignoring punctuation and small spelling variants (nukta, chandrabindu)
        def tokens(s):
            s = unicodedata.normalize('NFD', s.lower()).replace('\u093c', '').replace('\u0901', '\u0902')
            return [c for c in s if unicodedata.category(c)[0] in 'LM']
    if not tokens(expected):
        raise SystemExit(f'cannot check text in language {lang!r}: {expected}')
    return difflib.SequenceMatcher(None, tokens(expected), tokens(heard)).ratio()


def score(lines, takes, identity, lang):
    import librosa, numpy as np, torch
    from faster_whisper import WhisperModel
    from speechbrain.inference.speaker import EncoderClassifier
    asr = WhisperModel('small.en' if lang == 'en' else 'large-v3-turbo', device='cpu', compute_type='int8')
    min_match = 0.9 if lang == 'en' else 0.65  # Hindi speech-to-text spells loanwords either way
    spk = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                         savedir=str(Path.home() / '.cache/ecapa'), run_opts={'device': 'cpu'})
    embed = lambda y: spk.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze()
    ref = embed(librosa.load(identity, sr=16000)[0])
    picks, report = {}, {}
    for i, line in enumerate(lines, 1):
        for f in sorted(takes.glob(f'line{i}_t*.mp3')):
            y = librosa.load(f, sr=16000)[0]
            heard = ' '.join(s.text.strip() for s in asr.transcribe(y, beam_size=5, language=lang)[0])
            acc = text_match(line['text'], heard, lang)
            sim = float(torch.nn.functional.cosine_similarity(ref, embed(y), dim=0))
            f0 = librosa.pyin(y, fmin=70, fmax=600, sr=16000)[0]
            f0 = f0[~np.isnan(f0)]
            report[f.name] = dict(line=i, words=round(acc, 2), same_voice=round(sim, 2),
                                  pitch_hz=int(np.median(f0)) if len(f0) else 0, heard=heard)
            print(f'  {f.name:14s} words={acc:.2f} same_voice={sim:.2f} pitch={report[f.name]["pitch_hz"]}Hz | {heard}')
            if acc >= min_match and (i not in picks or sim > report[picks[i].name]['same_voice']):
                picks[i] = f
        if i not in picks:
            raise SystemExit(f'line {i}: no take had the right words; run again with more --takes')
    (takes / 'scores.json').write_text(json.dumps(report, indent=1))
    return picks


def mix(lines, picks, out_stem):
    import librosa, numpy as np

    def fade(y, n=int(0.015 * SR)):
        w = np.linspace(0, 1, n)
        y = y.copy(); y[:n] *= w; y[-n:] *= w[::-1]
        return y

    parts = [np.zeros(int(0.6 * SR))]
    for i, line in enumerate(lines, 1):
        y = librosa.load(picks[i], sr=SR)[0]
        _, (a, b) = librosa.effects.trim(y, top_db=45)
        pad = int(0.06 * SR)
        parts += [fade(y[max(0, a - pad):b + pad]), np.zeros(int(line.get('pause_after', 1.0) * SR))]
    parts.append(np.zeros(SR))
    finish(np.concatenate(parts), out_stem)


def finish(dry, out_stem):
    """Write <out_stem>_voice_only.mp3 and <out_stem>_mixed.mp3 (room echo + ambience), both
    at -14 LUFS. `dry` is mono audio at SR. Timing is never changed."""
    import numpy as np, soundfile as sf
    from scipy.signal import butter, fftconvolve, sosfilt
    rng = np.random.default_rng(7)
    dry = sosfilt(butter(2, 70, 'hp', fs=SR, output='sos'), dry)

    def room_ir(rt60=0.38, predelay=0.012):  # small room: decaying noise, separate per ear
        t = np.arange(int(rt60 * SR)) / SR
        h = sosfilt(butter(1, 5000, 'lp', fs=SR, output='sos'), rng.standard_normal(len(t)) * np.exp(-6.9 * t / rt60))
        return np.concatenate([np.zeros(int(predelay * SR)), h / np.sqrt((h ** 2).sum())])

    voice = np.stack([dry, dry], 1) + 0.16 * np.stack([fftconvolve(dry, room_ir())[:len(dry)] for _ in range(2)], 1)
    n = len(dry)  # faint night-room ambience about 30 dB under the voice
    spec = np.fft.rfft(rng.standard_normal((n, 2)), axis=0) / np.sqrt(np.maximum(np.fft.rfftfreq(n, 1 / SR), 20))[:, None]
    amb = sosfilt(butter(2, [60, 3500], 'bp', fs=SR, output='sos'), np.fft.irfft(spec, n, axis=0), axis=0)
    amb *= (1 + 0.15 * np.sin(2 * np.pi * 0.07 * np.arange(n) / SR))[:, None]
    speech = dry[np.abs(dry) > 0.01]
    amb *= np.sqrt((speech ** 2).mean()) * 10 ** (-30 / 20) / np.sqrt((amb ** 2).mean())
    env = np.ones(n); env[:SR] = np.linspace(0, 1, SR); env[-SR:] = np.linspace(1, 0, SR)

    tmp = out_stem.parent / '_tmp.wav'
    for name, sig in (('voice_only', dry), ('mixed', voice + amb * env[:, None])):
        sf.write(tmp, sig / (np.abs(sig).max() + 1e-9) * 0.7, SR)
        out = f'{out_stem}_{name}.mp3'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp), '-af',
                        'acompressor=threshold=-22dB:ratio=2.5:attack=8:release=120,loudnorm=I=-14:TP=-1.5:LRA=11',
                        '-ar', str(SR), '-b:a', '192k', out], check=True)
        print('wrote', out)
    tmp.unlink()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('scene', type=Path)
    ap.add_argument('--takes', type=int, default=2, help='takes to generate per line (default 2)')
    args = ap.parse_args()
    scene, char_dir = args.scene, args.scene.parent
    char = json.loads((char_dir / 'character.json').read_text())
    if (scene / 'scene.json').exists():
        char.update(json.loads((scene / 'scene.json').read_text()))
    lang = char.get('lang', 'en')
    lines = json.loads((scene / 'script.json').read_text())
    takes = scene / 'takes'
    takes.mkdir(exist_ok=True)
    for i, line in enumerate(lines, 1):
        for t in range(1, args.takes + 1):
            out = takes / f'line{i}_t{t}.mp3'
            if not out.exists():
                print(f'generating line {i} take {t}: {line["text"]}', flush=True)
                generate(line['text'], line['control'], char_dir / char['reference'], char.get('reference_text', ''), out)
    picks = score(lines, takes, char_dir / char['identity'], lang)
    (takes / 'picks.json').write_text(json.dumps({i: p.name for i, p in picks.items()}, indent=1))
    mix(lines, picks, scene / f'{char_dir.name}_{scene.name}')


if __name__ == '__main__':
    main()
