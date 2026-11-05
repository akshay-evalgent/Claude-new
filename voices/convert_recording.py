#!/usr/bin/env python3
"""Turn your own acted recording into a character's voice, keeping your emotion and timing.

    python voices/convert_recording.py my_take.aac voices/girlfriend --name sorry-call

Uses Seed-VC through its free Hugging Face demo (Plachta/Seed-VC), in pitch-following mode:
the rise and fall of your voice (crying breaks, emphasis, pauses) is kept and moved to the
character's pitch level. Only the voice itself changes. The target voice is the character's
`identity` and `reference` clips from character.json, joined together.

It makes --takes conversions (kept in <name>/takes/, not committed; existing takes are reused),
checks each one, and keeps the take that keeps your words and sounds most like the character.
Then it puts your performance back (performance.py): her voice only where you speak, your
real breaths, gulps and room air between, her loudness following yours, and a vocal polish.
--plain skips that and keeps the converter's output as it is.
Writes voices/<character>/<name>/<character>_<name>_voice_only.mp3 and _mixed.mp3, plus
conversion.json with the settings and checks: words still heard, how closely the pitch
follows your take, and whether it sounds like the character rather than you.
Your original recording is not copied into the repo.
"""
import argparse, json, shutil, subprocess, sys, tempfile, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import SR, finish, text_match  # noqa: E402
import performance  # noqa: E402

VC_SR = 44100


def to_wav(src, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-ac', '1', '-ar', str(VC_SR), str(out)], check=True)


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
    ap.add_argument('--takes', type=int, default=2, help='conversions to make and choose from (default 2)')
    ap.add_argument('--steps', type=int, default=50, help='quality steps (default 50; 30 is faster)')
    ap.add_argument('--semitones', type=float, default=0, help='extra pitch shift on top of the automatic one')
    ap.add_argument('--lang', default='en', help='language spoken, for the word check (en, hi, ...)')
    ap.add_argument('--no-check', action='store_true', help='skip the checks')
    ap.add_argument('--plain', action='store_true', help='skip the performance transfer and polish')
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
        inputs = sum([['-i', str(args.character / c)] for c in clips], [])
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex',
                        ''.join(f'[{i}:a]' for i in range(len(clips))) + f'concat=n={len(clips)}:v=0:a=1,aresample={VC_SR}',
                        str(ref)], check=True)
        outs = [takes / f'take{t}.wav' for t in range(1, args.takes + 1)]
        for out in outs:
            if not out.exists():
                print(f'converting {args.recording.name} into {args.character.name}: {out.name} ({args.steps} steps)', flush=True)
                convert(src, ref, out, args.steps, args.semitones)
        report = dict(settings=dict(model='Seed-VC v1 pitch-following (Plachta/Seed-VC demo)', steps=args.steps,
                                    extra_semitones=args.semitones, reference_clips=clips))
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
        print(f'  kept {best.name} (you said: {report["checks"][0]["you_said"]})' if not args.no_check else f'  kept {best.name}')
        src_audio, take_audio = librosa.load(src, sr=SR)[0], librosa.load(best, sr=SR)[0]
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
