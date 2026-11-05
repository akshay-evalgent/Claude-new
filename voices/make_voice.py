#!/usr/bin/env python3
"""Design a character's voice from the description in its character.json, then pick one.

    voices/run make_voice.py voices/mother                 # make 3 candidates and score them
    voices/run make_voice.py voices/mother --candidates 5  # more to choose from
    voices/run make_voice.py voices/mother --pick 2        # keep candidate 2 as the character's voice

Candidates go to <character>/candidates/ (not committed); listen to them and pick the one that
sounds right. Picking copies it to voice_normal.mp3 and fills in character.json, so
make_track.py and convert_recording.py can use the character straight away.

Each candidate is scored on what a person can't judge by ear in one listen:
  words      share of the sample line that speech-to-text heard
  pitch      median pitch, and whether it sits in the character's expected range
  closest    the existing character it sounds most like (keeps the sister from sounding
             like the girlfriend; two different voices scored about 0.17 against each other)

Voices are made with VoxCPM2 through its free Hugging Face demo (daily GPU limit).
"""
import argparse, json, shutil, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import generate, text_match  # noqa: E402

ROOT = Path(__file__).resolve().parent


def score(char_dir, char, files):
    import librosa, numpy as np, torch
    from faster_whisper import WhisperModel
    from speechbrain.inference.speaker import EncoderClassifier
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    spk = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                         savedir=str(Path.home() / '.cache/ecapa'), run_opts={'device': 'cpu'})
    embed = lambda f: spk.encode_batch(torch.tensor(librosa.load(f, sr=16000)[0]).unsqueeze(0)).squeeze()
    others = {}
    for d in sorted(ROOT.iterdir()):
        cj = d / 'character.json'
        if d != char_dir and cj.exists():
            ident = json.loads(cj.read_text()).get('identity')
            if ident and (d / ident).exists():
                others[d.name] = embed(d / ident)
    lo, hi = char.get('pitch_hz', [0, 10000])
    rows = []
    for f in files:
        y = librosa.load(f, sr=16000)[0]
        heard = ' '.join(s.text.strip() for s in asr.transcribe(y, beam_size=5, language='en')[0])
        f0 = librosa.pyin(y, fmin=60, fmax=600, sr=16000)[0]
        pitch = int(np.nanmedian(f0)) if np.any(~np.isnan(f0)) else 0
        e = embed(f)
        sims = {k: round(float(torch.nn.functional.cosine_similarity(e, v, dim=0)), 2) for k, v in others.items()}
        closest = max(sims.items(), key=lambda kv: kv[1]) if sims else ('none yet', 0)
        rows.append(dict(file=f.name, words=round(text_match(char['sample_text'], heard, 'en'), 2), pitch_hz=pitch,
                         pitch_ok=lo <= pitch <= hi, closest=closest[0], closest_score=closest[1], heard=heard))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('character', type=Path, help='character folder, e.g. voices/mother')
    ap.add_argument('--candidates', type=int, default=3, help='how many candidates to make (default 3)')
    ap.add_argument('--pick', type=int, help='keep this candidate number as the character\'s voice')
    args = ap.parse_args()
    char_dir = args.character.resolve()
    cj = char_dir / 'character.json'
    char = json.loads(cj.read_text())
    cand = char_dir / 'candidates'

    if args.pick:
        src = cand / f'c{args.pick}.mp3'
        if not src.exists():
            raise SystemExit(f'no candidate {args.pick} in {cand}')
        shutil.copy(src, char_dir / 'voice_normal.mp3')
        char.update(identity='voice_normal.mp3', identity_text=char['sample_text'],
                    reference='voice_normal.mp3', reference_text=char['sample_text'])
        cj.write_text(json.dumps(char, indent=1, ensure_ascii=False) + '\n')
        print(f'{char_dir.name}: voice_normal.mp3 is candidate {args.pick}; character.json updated')
        return

    cand.mkdir(exist_ok=True)
    descriptions = char['description'] if isinstance(char['description'], list) else [char['description']]
    files = []
    for i in range(1, args.candidates + 1):
        out = cand / f'c{i}.mp3'
        desc = descriptions[(i - 1) % len(descriptions)]
        if not out.exists():
            print(f'making candidate {i}: {desc}', flush=True)
            generate(char['sample_text'], desc, None, '', out)
        files.append(out)
    rows = score(char_dir, char, files)
    for r in rows:
        flag = '' if r['pitch_ok'] else '  (pitch outside expected range)'
        print(f"  {r['file']}: words={r['words']} pitch={r['pitch_hz']}Hz{flag} closest={r['closest']} {r['closest_score']}\n    heard: {r['heard']}")
    (cand / 'scores.json').write_text(json.dumps(rows, indent=1))
    print(f'Listen to {cand}/c*.mp3, then:  voices/run make_voice.py {args.character} --pick N')


if __name__ == '__main__':
    main()
