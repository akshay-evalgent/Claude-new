#!/usr/bin/env python3
"""Turn your own acted recording into a character's voice, keeping your emotion and timing.

    python voices/convert_recording.py my_take.aac voices/girlfriend --name sorry-call

Uses Seed-VC in pitch-following mode, on this machine when it's set up (bash voices/setup.sh),
otherwise through its free Hugging Face demo (Plachta/Seed-VC; daily GPU limit, uploads the take):
the rise and fall of your voice (crying breaks, emphasis, pauses) is kept and moved to the
character's pitch level. Only the voice itself changes. The target voice is the character's
`identity` and `reference` clips from character.json, joined together. The silence before your
first sound and after your last word is trimmed first (--keep-silence to skip), so the Short
doesn't open on dead air.

It makes --takes conversions (kept in <name>/takes/, not committed; existing takes are reused)
and checks each one. Then, phrase by phrase, it uses whichever take kept your words and sounds
most like the character (the joins sit in the gaps between phrases). If that mix doesn't beat
the best single take, it keeps the best single take instead.
Then it puts your performance back (performance.py): her voice only where you speak, your
real breaths, gulps and room air between, her loudness following yours, and a vocal polish.
--plain skips that and keeps the converter's output as it is.
Writes voices/<character>/<name>/<character>_<name>_voice_only.mp3 and _mixed.mp3, plus
conversion.json with the settings and checks: words still heard, how closely the pitch
follows your take, and whether it sounds like the character rather than you.
Your original recording is not copied into the repo.
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import SR, finish, text_match  # noqa: E402
import performance  # noqa: E402

VC_SR = 44100


def to_wav(src, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-ac', '1', '-ar', str(VC_SR), str(out)], check=True)


def trim_silence(path, lead=0.25, tail=1.2):
    """Cut the dead air before your first word and after your last, keeping `lead` and `tail`
    seconds of room. Voice notes start with a second or two of it, and a Short that opens on
    silence gets swiped away. Returns the seconds cut from the start and the end."""
    import numpy as np, soundfile as sf
    y, sr = sf.read(path, dtype='float32')
    regions = performance.speech_regions(y, sr)
    if not regions:
        return 0.0, 0.0
    a, b = max(0, int((regions[0][0] - lead) * sr)), min(len(y), int((regions[-1][1] + tail) * sr))
    if a == 0 and b == len(y):
        return 0.0, 0.0
    cut_end = (len(y) - b) / sr
    y = y[a:b].copy()
    if a:  # no click where the cut lands in room noise
        n = int(0.02 * sr)
        y[:n] *= np.linspace(0, 1, n)
    sf.write(path, y, sr)
    return round(a / sr, 2), round(cut_end, 2)


SEEDVC = Path(os.environ.get('VOICES_VENDOR', Path.home() / '.voices-vendor')) / 'seed-vc'


def convert_local(src, ref, out, steps, semitones):
    """Seed-VC on this machine (CPU). Same model and settings as the demo's pitch-following tab."""
    with tempfile.TemporaryDirectory() as od:
        subprocess.run([sys.executable, str(Path(__file__).with_name('seedvc_runner.py')),
                        '--source', str(Path(src).resolve()), '--target', str(Path(ref).resolve()), '--output', od,
                        '--diffusion-steps', str(steps), '--length-adjust', '1.0', '--inference-cfg-rate', '0.7',
                        '--f0-condition', 'True', '--auto-f0-adjust', 'True', '--semi-tone-shift', str(int(round(semitones))),
                        '--fp16', 'False'], check=True)
        wavs = sorted(Path(od).glob('*.wav'))
        if not wavs:
            raise SystemExit('Seed-VC finished without writing audio')
        shutil.copy(wavs[-1], out)


def convert(src, ref, out, steps, semitones):
    from gradio_client import Client, handle_file
    client = Client('Plachta/Seed-VC', verbose=False)
    for attempt in range(10):
        try:
            result = client.predict(handle_file(str(src)), handle_file(str(ref)), steps, 1.0, 0.7,
                                    True, True, semitones, api_name='/predict_1')
            shutil.copy(result[1] if isinstance(result, (list, tuple)) else result, out)
            return
        except Exception as e:  # the free demo is often busy; wait and retry
            print(f'  busy, retrying ({attempt + 1}): {str(e)[:80]}', flush=True)
            time.sleep(min(15 * (attempt + 1), 60))
    raise SystemExit('gave up: the Seed-VC demo did not answer')


def loudness_match(src, before, after, sr):
    """How closely the loudness moves with yours (0-1): whole take and the gaps between phrases."""
    import librosa, numpy as np
    n, hop = min(len(src), len(before), len(after)), sr // 100
    level = lambda y: 20 * np.log10(librosa.feature.rms(y=y[:n], frame_length=2 * hop, hop_length=hop)[0] + 1e-6)
    a, b, c = level(src), level(before), level(after)
    regions = performance.speech_regions(src[:n], sr)
    gap = np.zeros(len(a), bool)
    for (_, s), (e, _) in zip(regions[:-1], regions[1:]):
        gap[int(s * 100):int(e * 100)] = True
    r = lambda x, y, m=slice(None): round(float(np.corrcoef(x[m], y[m])[0, 1]), 2)
    return dict(whole_take=[r(a, b), r(a, c)], between_phrases=[r(a, b, gap), r(a, c, gap)], note='[before, after]')


_MODELS = {}


def models(whisper):
    """Speech-to-text and speaker-match models, loaded once."""
    if whisper not in _MODELS:
        from faster_whisper import WhisperModel
        from speechbrain.inference.speaker import EncoderClassifier
        _MODELS[whisper] = (WhisperModel(whisper, device='cpu', compute_type='int8'),
                            EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                                           savedir=str(Path.home() / '.cache/ecapa'),
                                                           run_opts={'device': 'cpu'}))
    return _MODELS[whisper]


def best_phrases(src, takes, clips, lang, sr=SR):
    """One take built from the best phrase of each take. Returns (audio, picks, scores)."""
    import librosa, numpy as np, torch
    asr, spk = models('large-v3-turbo')
    r16 = lambda y: librosa.resample(np.asarray(y, dtype=np.float32), orig_sr=sr, target_sr=16000)
    embed = lambda y: spk.encode_batch(torch.tensor(r16(y)).unsqueeze(0)).squeeze()
    her = [embed(librosa.load(c, sr=sr)[0]) for c in clips]
    like_her = lambda y: float(np.mean([float(torch.nn.functional.cosine_similarity(embed(y), h, dim=0)) for h in her]))
    hear = lambda y: ' '.join(x.text.strip() for x in asr.transcribe(r16(y), beam_size=5, language=lang)[0])

    def words_ok(said, heard):
        try:
            return text_match(said, heard, lang)
        except SystemExit:  # nothing recognisable in your phrase (a sob, a breath)
            return 1.0

    audio = [librosa.load(t, sr=sr)[0] for t in takes]
    n = min(len(src), *(len(a) for a in audio))
    audio = [a[:n] for a in audio]
    regions = performance.speech_regions(src[:n], sr)
    cuts = [0] + [int((regions[i][1] + regions[i + 1][0]) / 2 * sr) for i in range(len(regions) - 1)] + [n]
    out, picks, speech = np.zeros(n, np.float32), [], np.zeros(n, bool)
    for i, (a, b) in enumerate(regions):
        s, e = int(a * sr), int(b * sr)
        speech[s:e] = True
        said = hear(src[s:e])
        scored = [(words_ok(said, hear(y[s:e])) >= 0.8, like_her(y[s:e])) for y in audio]
        j = max(range(len(audio)), key=lambda k: scored[k])  # words kept first, then most like her
        out[cuts[i]:cuts[i + 1]] = audio[j][cuts[i]:cuts[i + 1]]
        picks.append(dict(start_s=round(a, 2), end_s=round(b, 2), take=Path(takes[j]).name,
                          like_character=round(scored[j][1], 2)))
    scores = {Path(t).name: round(like_her(y[speech]), 3) for t, y in zip(takes, audio)}
    scores['best_phrases'] = round(like_her(out[speech]), 3)
    return out, picks, scores


def check(src, outs, identity, lang):
    import librosa, numpy as np, torch
    from faster_whisper import WhisperModel
    from speechbrain.inference.speaker import EncoderClassifier
    asr = WhisperModel('small.en' if lang == 'en' else 'large-v3-turbo', device='cpu', compute_type='int8')
    spk = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                         savedir=str(Path.home() / '.cache/ecapa'), run_opts={'device': 'cpu'})
    load = lambda f: librosa.load(f, sr=16000)[0]
    embed = lambda y: spk.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze()
    cos = lambda a, b: round(float(torch.nn.functional.cosine_similarity(a, b, dim=0)), 2)
    hear = lambda y: ' '.join(s.text.strip() for s in asr.transcribe(y, beam_size=5, language=lang)[0])
    pitch = lambda y: librosa.pyin(y, fmin=60, fmax=700, sr=16000, frame_length=1024, hop_length=160)[0]
    semi = lambda x: 12 * np.log2(x)
    a = load(src)
    pa, said, ea, ec = pitch(a), hear(a), embed(a), embed(load(identity))
    results = []
    for out in outs:
        b = load(out)
        pb, eb = pitch(b), embed(b)
        n = min(len(pa), len(pb))
        both = ~np.isnan(pa[:n]) & ~np.isnan(pb[:n])
        heard = hear(b)
        results.append(dict(
            take=Path(out).name, you_said=said, she_said=heard,
            words_kept=round(text_match(said, heard, lang), 2),
            pitch_shape_match=round(float(np.corrcoef(semi(pa[:n][both]), semi(pb[:n][both]))[0, 1]), 2),
            your_pitch_hz=int(np.nanmedian(pa)), her_pitch_hz=int(np.nanmedian(pb)),
            length_s=[round(len(a) / 16000, 2), round(len(b) / 16000, 2)],
            sounds_like_character=cos(eb, ec), sounds_like_you=cos(eb, ea)))
    return results


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('recording', type=Path, help='your recording (aac, m4a, mp3, wav, ogg...)')
    ap.add_argument('character', type=Path, help='character folder, e.g. voices/girlfriend')
    ap.add_argument('--name', required=True, help='output folder name, e.g. sorry-call')
    ap.add_argument('--takes', type=int, default=3, help='conversions to make and choose from (default 3)')
    ap.add_argument('--steps', type=int, default=30, help='quality steps (default 30; 50 scored no better in tests and is slower)')
    ap.add_argument('--semitones', type=float, default=0, help='extra pitch shift on top of the automatic one')
    ap.add_argument('--lang', default='en', help='language spoken, for the word check (en, hi, ...)')
    ap.add_argument('--engine', choices=['auto', 'local', 'demo'], default='auto',
                    help='local = this machine, demo = Hugging Face demo, auto = local if set up (default)')
    ap.add_argument('--no-check', action='store_true', help='skip the checks')
    ap.add_argument('--plain', action='store_true', help='skip the performance transfer and polish')
    ap.add_argument('--keep-silence', action='store_true', help="don't trim the silence before your first word and after your last")
    args = ap.parse_args()
    import librosa
    char = json.loads((args.character / 'character.json').read_text())
    clips = list(dict.fromkeys([char['identity'], char['reference']]))
    out_dir = args.character / args.name
    takes = out_dir / 'takes'
    takes.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        src, ref = tmp / 'source.wav', tmp / 'reference.wav'
        to_wav(args.recording, src)
        trimmed = (0.0, 0.0) if args.keep_silence else trim_silence(src)
        if any(trimmed):
            print(f'  trimmed silence: {trimmed[0]} s from the start, {trimmed[1]} s from the end', flush=True)
        inputs = sum([['-i', str(args.character / c)] for c in clips], [])
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex',
                        ''.join(f'[{i}:a]' for i in range(len(clips))) + f'concat=n={len(clips)}:v=0:a=1,aresample={VC_SR}',
                        str(ref)], check=True)
        engine = args.engine if args.engine != 'auto' else ('local' if (SEEDVC / 'inference.py').exists() else 'demo')
        outs = [takes / f'take{t}.wav' for t in range(1, args.takes + 1)]
        import soundfile as sf
        src_len = sf.info(src).duration
        for out in outs:
            if out.exists() and abs(sf.info(out).duration - src_len) > 0.1:
                print(f'  {out.name} was made from a different cut of the recording; making it again', flush=True)
                out.unlink()
            if not out.exists():
                print(f'converting {args.recording.name} into {args.character.name}: {out.name} ({args.steps} steps)', flush=True)
                (convert_local if engine == 'local' else convert)(src, ref, out, args.steps, args.semitones)
        report = dict(settings=dict(model=f'Seed-VC v1 pitch-following ({engine})', steps=args.steps,
                                    extra_semitones=args.semitones, reference_clips=clips,
                                    trimmed_silence_s=dict(start=trimmed[0], end=trimmed[1])))
        best = outs[0]
        if not args.no_check:
            report['checks'] = check(src, outs, args.character / char['identity'], args.lang)
            for r in report['checks']:
                print(f"  {r['take']}: words_kept={r['words_kept']} pitch_shape_match={r['pitch_shape_match']} "
                      f"pitch={r['your_pitch_hz']}->{r['her_pitch_hz']}Hz sounds_like_character={r['sounds_like_character']} "
                      f"sounds_like_you={r['sounds_like_you']}\n    heard: {r['she_said']}")
            top = max(report['checks'], key=lambda r: (r['words_kept'], r['sounds_like_character']))
            best = takes / top['take']
        report['kept_take'] = best.name
        if not args.no_check:  # word timings of your original take, for make_video.py's captions
            import librosa as _l
            asr, _ = models('small.en' if args.lang == 'en' else 'large-v3-turbo')
            segs, _ = asr.transcribe(_l.load(src, sr=16000)[0], language=args.lang, word_timestamps=True, beam_size=5)
            report['source_words'] = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for sg in segs for w in sg.words]
        print(f'  kept {best.name} (you said: {report["checks"][0]["you_said"]})' if not args.no_check else f'  kept {best.name}')
        src_audio, take_audio = librosa.load(src, sr=SR)[0], librosa.load(best, sr=SR)[0]
        if not args.plain and not args.no_check and len(outs) > 1:
            mixed, picks, scores = best_phrases(src_audio, outs, [args.character / c for c in clips], args.lang)
            report['sounds_like_character_speech_only'] = scores
            single = max(v for k, v in scores.items() if k != 'best_phrases')
            if scores['best_phrases'] >= single:
                take_audio, report['kept_take'] = mixed, 'best phrase from each take'
                report['phrases'] = picks
            print(f'  sounds like {args.character.name} (speech only): {scores} -> using {report["kept_take"]}')
        if args.plain:
            voice = take_audio
        else:
            voice, info = performance.transfer(src_audio, take_audio, SR)
            info.update(follows_your_loudness=loudness_match(src_audio, take_audio, voice, SR))
            report['performance'] = info
            print(f'  performance: {info}')
        finish(voice, out_dir / f'{args.character.name}_{args.name}', polish=not args.plain)
    (out_dir / 'conversion.json').write_text(json.dumps(report, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
