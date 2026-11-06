#!/usr/bin/env python3
"""Make one micro-course episode: narration, drawings timed to the words, sound, package.

    voices/run make_episode.py courses/texting-decoded/episodes/01-ok-period
    voices/run make_episode.py courses/.../01-ok-period --voice-only    # just the narration takes
    voices/run make_episode.py courses/.../01-ok-period --takes 3

Reads the episode's script.json (beats with voice lines, scenes and drawings), the course's
course.json (the kit: style, narrator, sticker) and the narrator's character.json.

1. Narration: every voice line is generated --takes times with VoxCPM (free demo) in the
   narrator's voice with the beat's emotion instruction; each take is checked with
   speech-to-text and a speaker match, and the best one is kept (takes/ is not committed).
2. Timeline: beats start where the script says, pushed later only if the previous line runs
   long. Captions and drawings are timed from the words actually spoken.
3. Video: courses/episode.html draws every frame (notebook style, the sketched phone, the
   drawings writing on, captions with one highlighted word); courses/render.cjs records it.
4. Sound: the voice is polished and set to -14 LUFS; the sound kit (buzz, marker, pencil,
   pops, tick, clock) is placed at the drawing times; nothing clips.
5. Package: <ep>.mp4, <ep>_cover.png, <ep>.srt, upload.txt.
"""
import argparse, json, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import POLISH, SR, generate, loudness, text_match  # noqa: E402
from make_video import align, pages_from, srt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
GAP = 0.25           # least silence between two lines
DRAW_SECONDS = 0.35  # how long a drawing takes to appear


def norm(w):
    return re.sub(r"[^a-z0-9']", '', w.lower())


# ----------------------------------------------------------------------------- narration
def make_takes(beats, takes_dir, narrator_dir, narrator, n_takes):
    takes_dir.mkdir(exist_ok=True)
    lines = [(i, b) for i, b in enumerate(beats) if b.get('voice')]
    for k, (i, b) in enumerate(lines, 1):
        for t in range(1, n_takes + 1):
            out = takes_dir / f'line{k}_t{t}.mp3'
            if not out.exists():
                control = f"{narrator['description']}. {b.get('control', '')}".strip('. ')
                print(f'line {k} take {t}: {b["voice"]}  [{b.get("control", "")}]', flush=True)
                generate(b['voice'], control, narrator_dir / narrator['reference'], narrator.get('reference_text', ''), out)
    return lines


def pick_takes(lines, takes_dir, identity, min_match=0.8):
    """Best take per line: the words must be there (speech-to-text), then the closest voice match."""
    import librosa, numpy as np, torch
    from faster_whisper import WhisperModel
    from speechbrain.inference.speaker import EncoderClassifier
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    spk = EncoderClassifier.from_hparams('speechbrain/spkrec-ecapa-voxceleb',
                                         savedir=str(Path.home() / '.cache/ecapa'), run_opts={'device': 'cpu'})
    embed = lambda y: spk.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze()
    ref = embed(librosa.load(identity, sr=16000)[0])
    picks, report = {}, {}
    for k, (i, b) in enumerate(lines, 1):
        rows = []
        for f in sorted(takes_dir.glob(f'line{k}_t*.mp3')):
            y = librosa.load(f, sr=16000)[0]
            segs, _ = asr.transcribe(y, beam_size=5, language='en', word_timestamps=True)
            words = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
            heard = ' '.join(w[0] for w in words)
            acc = text_match(b['voice'], heard, 'en')
            sim = float(torch.nn.functional.cosine_similarity(ref, embed(y), dim=0))
            _, (a, z) = librosa.effects.trim(y, top_db=40)
            rows.append(dict(file=f.name, words=round(acc, 2), same_voice=round(sim, 2), heard=heard, asr=words,
                             trim=[round(a / 16000, 3), round(z / 16000, 3)], length=round(len(y) / 16000, 2)))
            print(f'  {f.name:12s} words={acc:.2f} same_voice={sim:.2f} {len(y) / 16000:.1f}s | {heard}')
        ok = [r for r in rows if r['words'] >= min_match]
        best = max(ok, key=lambda r: r['same_voice']) if ok else max(rows, key=lambda r: r['words'])
        if not ok:
            print(f'  line {k}: no take had all the words; keeping the closest ({best["file"]})')
        picks[k] = best
        report[k] = rows
    (takes_dir / 'scores.json').write_text(json.dumps(report, indent=1))
    return picks


# ----------------------------------------------------------------------------- timeline
def parse_t(t):
    def s(x):
        m, sec = x.split(':')
        return int(m) * 60 + float(sec)
    a, b = t.split('-')
    return s(a), s(b)


def resolve_at(at, beat_start, words, voice_end):
    """A drawing's time: seconds after the beat starts, or {"word": "happy"} = when that word is spoken,
    or {"end": offset} = after the line ends."""
    if isinstance(at, (int, float)):
        return beat_start + float(at)
    if 'word' in at:
        key = norm(at['word'])
        nth = at.get('nth', 1)
        hits = [w for w in words if norm(w['w']) == key or norm(w['w']).startswith(key)]
        if len(hits) >= nth:
            return hits[nth - 1]['s']
        print(f'  warning: word {at["word"]!r} not found in the line; using the beat start')
        return beat_start
    if 'end' in at:
        return voice_end + float(at['end'])
    raise SystemExit(f'bad "at": {at}')


def build_timeline(beats, lines, picks):
    """Absolute start/end for every beat, every caption word, every drawing and sound."""
    line_of = {i: k for k, (i, b) in enumerate(lines, 1)}
    timeline, words, draws, sfx = [], [], [], []
    cursor = 0.0  # when the previous line finished (plus the gap)
    for i, b in enumerate(beats):
        p0, p1 = parse_t(b['t'])
        start = max(p0, cursor)
        voice_len, bw = 0.0, []
        if i in line_of:
            r = picks[line_of[i]]
            a, z = r['trim']
            voice_len = z - a
            asr = [(w, s - a, e - a) for w, s, e in r['asr'] if e > a]
            script_words = b['voice'].split()
            try:
                bw = align(script_words, asr)
            except SystemExit:
                n = len(script_words)
                bw = [dict(w=w, s=voice_len * k / n, e=voice_len * (k + 1) / n) for k, w in enumerate(script_words)]
            for w in bw:
                w['s'] = round(w['s'] + start, 3); w['e'] = round(w['e'] + start, 3)
            words += bw
        voice_end = start + voice_len
        hold = b.get('hold_after', GAP)
        cursor = voice_end + hold if voice_len else max(start + (p1 - p0), start)
        timeline.append(dict(index=i, start=round(start, 3), voice_end=round(voice_end, 3), scene=b.get('scene', {}),
                             text=b.get('text', ''), line=line_of.get(i)))
        for d in b.get('draws', []):
            d = dict(d); d['at'] = round(resolve_at(d['at'], start, bw, voice_end), 3); d['beat'] = i
            draws.append(d)
            sound = d.get('sound', {'circle': 'marker', 'arrow': 'marker', 'bracket': 'marker', 'label': 'pencil',
                                    'bigtext': 'pencil', 'text': 'pencil', 'reply': 'pop', 'strip': 'pencil',
                                    'highlight': 'marker'}.get(d['type']))
            if sound:
                sfx.append(dict(sound=sound, at=d['at']))
        for s in b.get('sfx', []):
            sfx.append(dict(sound=s['sound'], at=round(resolve_at(s['at'], start, bw, voice_end), 3)))
        rt = b.get('scene', {}).get('retype')
        if rt:  # keystrokes: one per letter, then the pause, then the added character
            keys = [start + 0.2 + 0.22 * k for k in range(len(rt['text']))]
            keys.append(keys[-1] + rt['pause'])
            timeline[-1]['keys'] = [round(k, 3) for k in keys]
            sfx += [dict(sound='tap', at=round(k, 3)) for k in keys]
        if voice_len and hold > 0.6:  # a held test: the clock ticks until the next beat
            t = voice_end + 0.3
            while t < cursor - 0.1:
                sfx.append(dict(sound='clock', at=round(t, 3))); t += 0.5
    for k, tb in enumerate(timeline):
        tb['end'] = timeline[k + 1]['start'] if k + 1 < len(timeline) else round(cursor + 0.3, 3)
    duration = timeline[-1]['end']
    return timeline, words, draws, sorted(sfx, key=lambda s: s['at']), duration


# ----------------------------------------------------------------------------- sound
def sound_kit():
    """Short synthesised foley at SR: buzz, marker, pencil, tap, pop, tick, clock."""
    import numpy as np
    from scipy.signal import butter, sosfilt
    rng = np.random.default_rng(3)
    t = lambda n: np.arange(int(n * SR)) / SR
    env = lambda x, a=0.004, r=0.08: np.minimum(1, np.minimum(np.arange(len(x)) / (a * SR), (len(x) - np.arange(len(x))) / (r * SR))) * x
    bp = lambda x, lo, hi, o=2: sosfilt(butter(o, [lo, hi], 'bp', fs=SR, output='sos'), x)
    kit = {}
    x = t(0.28); kit['buzz'] = env(np.sign(np.sin(2 * np.pi * 150 * x)) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * x)), 0.01, 0.06) * 0.35
    kit['buzz'] = sosfilt(butter(2, 1200, 'lp', fs=SR, output='sos'), kit['buzz'])
    x = t(0.32); sweep = 1400 + 1800 * x / x[-1]
    kit['marker'] = env(bp(rng.standard_normal(len(x)), 900, 4500) * (0.5 + 0.5 * np.sin(2 * np.pi * sweep * x)), 0.02, 0.12) * 0.22
    x = t(0.45); kit['pencil'] = env(bp(rng.standard_normal(len(x)), 600, 3000) * (0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 9 * x))), 0.02, 0.15) * 0.16
    x = t(0.03); kit['tap'] = env(bp(rng.standard_normal(len(x)), 800, 6000), 0.001, 0.02) * 0.35
    x = t(0.07); kit['pop'] = env(np.sin(2 * np.pi * (620 - 300 * x / x[-1]) * x), 0.002, 0.05) * 0.4
    x = t(0.015); kit['tick'] = env(bp(rng.standard_normal(len(x)), 2000, 9000), 0.001, 0.01) * 0.5
    kit['clock'] = kit['tick'] * 0.55
    return kit


def mix_audio(ep_dir, stem, timeline, picks, lines, sfx, duration):
    import librosa, numpy as np, soundfile as sf
    n = int(duration * SR) + SR
    voice = np.zeros(n)
    line_of = {i: k for k, (i, b) in enumerate(lines, 1)}
    for tb in timeline:
        if tb['line']:
            r = picks[tb['line']]
            y = librosa.load(ep_dir / 'takes' / r['file'], sr=SR)[0]
            a, z = int(r['trim'][0] * SR), int(r['trim'][1] * SR)
            y = y[max(0, a - int(0.03 * SR)):z + int(0.05 * SR)]
            fade = int(0.01 * SR); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
            s = int(tb['start'] * SR)
            voice[s:s + len(y)] += y[:n - s]
    kit = sound_kit()
    fx = np.zeros(n)
    for e in sfx:
        y = kit[e['sound']]; s = int(e['at'] * SR)
        fx[s:s + len(y)] += y[:n - s]
    tmp = ep_dir / '_tmp'
    tmp.mkdir(exist_ok=True)
    sf.write(tmp / 'voice_raw.wav', voice / (np.abs(voice).max() + 1e-9) * 0.7, SR)
    sf.write(tmp / 'fx.wav', fx, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp / 'voice_raw.wav'), '-af', POLISH.rstrip(','),
                    '-c:a', 'pcm_f32le', str(tmp / 'voice_eq.wav')], check=True)
    gain = -13.2 - loudness(tmp / 'voice_eq.wav')  # the gaps between lines pull the integrated level down about a dB
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp / 'voice_eq.wav'), '-i', str(tmp / 'fx.wav'),
                    '-filter_complex', f'[0:a]volume={gain:.2f}dB[v];[1:a]volume=-9dB[f];[v][f]amix=inputs=2:duration=first:normalize=0,'
                    'alimiter=limit=0.84:attack=2:release=40:level=false[a]', '-map', '[a]', '-ar', str(SR), '-c:a', 'pcm_f32le',
                    str(tmp / 'mix.wav')], check=True)
    return tmp / 'mix.wav'


# ----------------------------------------------------------------------------- package
def upload_text(course, ep_index, ep, script, kit):
    n = len(course['episodes'])
    series = course['title']
    promise = course['promise']
    title = f"{ep['title']} | Seven Days To read any text ({ep_index}/{n})"
    eps = '\n'.join(f"{'▶ ' if k == ep_index else '   '}{k}/{n} {e['title']}" for k, e in enumerate(course['episodes'], 1))
    desc = (f"Day {ep_index} of {n}: {script['teaches_line']}\n\n{promise}\n\n{eps}\n\n"
            "Fictional chats. Made with AI: the narration is a designed AI voice, the drawings are generated.\n"
            "#texting #textingtips #psychology #communication #relationships #shorts")
    tags = ['texting', 'text messages', 'texting psychology', 'how to read texts', 'left on read', 'communication skills',
            'relationships', 'dating advice', 'body language of texting', 'micro course', 'seven days to', series.lower()]
    return '\n'.join([
        'TITLE', title, '', 'DESCRIPTION', desc, '', 'TAGS', ', '.join(tags), '', 'PLAYLIST', f'Seven Days To read any text ({series})', '',
        'PINNED COMMENT', script['pinned'], '', 'WHEN UPLOADING',
        '- Altered or synthetic content: Yes', "- Audience: No, it's not made for kids", '- Language: English; upload the .srt as subtitles',
        '- Post between 6 and 9 PM US Eastern', f'- Thumbnail: the frame where A and B are on screen ({Path(ep["slug"]).name}_cover.png)', ''])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('episode', type=Path, help='episode folder, e.g. courses/texting-decoded/episodes/01-ok-period')
    ap.add_argument('--takes', type=int, default=2, help='narration takes per line (default 2)')
    ap.add_argument('--voice-only', action='store_true', help='make and score the narration, then stop')
    ap.add_argument('--cover-at', type=float, help='seconds into the episode for the cover frame (default: the test)')
    ap.add_argument('--rescore', action='store_true', help='score the takes again (default: reuse takes/picks.json)')
    args = ap.parse_args()
    ep_dir = args.episode.resolve()
    course_dir = ep_dir.parent.parent
    course = json.loads((course_dir / 'course.json').read_text())
    script = json.loads((ep_dir / 'script.json').read_text())
    kit = course['kit']
    narrator_dir = ROOT / kit['voice']
    narrator = json.loads((narrator_dir / 'character.json').read_text())
    ep_index = next(k for k, e in enumerate(course['episodes'], 1) if e['slug'] == ep_dir.name)
    ep = course['episodes'][ep_index - 1]
    beats = script['beats']

    takes_dir = ep_dir / 'takes'
    lines = make_takes(beats, takes_dir, narrator_dir, narrator, args.takes)
    picks_file = takes_dir / 'picks.json'
    if picks_file.exists() and not args.rescore:  # scoring is slow; reuse it unless asked
        picks = {int(k): v for k, v in json.loads(picks_file.read_text()).items()}
    else:
        picks = pick_takes(lines, takes_dir, narrator_dir / narrator['identity'])
        picks_file.write_text(json.dumps(picks, indent=1))
    if args.voice_only:
        return

    timeline, words, draws, sfx, duration = build_timeline(beats, lines, picks)
    pages = pages_from(words)
    print(f'{ep_dir.name}: {duration:.1f} s, {len(words)} words, {len(draws)} drawings, {len(sfx)} sounds')
    stem = ep_dir.name
    cfg = dict(fps=FPS, duration=duration, kit=kit, sticker=kit['sticker'].replace('n/', f'{ep_index}/').replace('/7', f'/{len(course["episodes"])}'),
               threads=script.get('threads', {}), beats=timeline, draws=draws, words=words, pages=pages, draw_seconds=DRAW_SECONDS)
    cfg_path = ep_dir / 'config.json'
    cfg_path.write_text(json.dumps(cfg))
    silent = ep_dir / '_tmp_silent.mp4'
    subprocess.run(['node', str(ROOT / 'courses' / 'render.cjs'), str(cfg_path), str(silent)], check=True)
    mix = mix_audio(ep_dir, stem, timeline, picks, lines, sfx, duration)
    out = ep_dir / f'{stem}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(silent), '-i', str(mix), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-aac_pns', '0', '-t', str(duration), '-movflags', '+faststart', str(out)], check=True)
    test_beat = next((tb for tb in timeline if tb['scene'].get('type') == 'test'), timeline[-1])
    cover_at = args.cover_at if args.cover_at is not None else test_beat['start'] + 1.2
    subprocess.run(['node', str(ROOT / 'courses' / 'render.cjs'), str(cfg_path), str(ep_dir / f'{stem}_cover.png'), '--frame', str(cover_at)], check=True)
    srt(words, pages, ep_dir / f'{stem}.srt')
    (ep_dir / 'upload.txt').write_text(upload_text(course, ep_index, ep, script, kit))
    silent.unlink()
    for f in (ep_dir / '_tmp').glob('*'):
        f.unlink()
    (ep_dir / '_tmp').rmdir()
    print(f'wrote {out.name}, {stem}_cover.png, {stem}.srt, upload.txt')


if __name__ == '__main__':
    main()
