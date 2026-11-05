#!/usr/bin/env python3
"""Turn a finished episode's voice track into a vertical Short, ready to upload.

    voices/run make_video.py voices/mother/first-salary
    voices/run make_video.py voices/girlfriend/sorry-call --dedication "for the one who won't pick up"
    voices/run make_video.py voices/father/dad-never-says-it --bg my_scooter_clip.mp4

What the viewer sees (1080x1920, 30 fps):
  0.0 s   a phone-style "Maa sent you a voice note" banner slides in, the first line is on screen
  2.0 s   the dedication fades in at the top ("for the dad who never says it")
  always  the character's animated scene (from character.json theme.scene), the voice-note bubble
          with a waveform drawn from the real voice, and word-by-word captions in the accent colour
  end     captions fade and the bubble resets, so the replay loops cleanly

With --bg (your own photo or video), the scene is replaced by it and the overlays sit on top.

Writes into the episode folder:
  <char>_<episode>_short.mp4   the Short (voice from _mixed.mp3, optional --music bed underneath)
  <char>_<episode>.srt         captions, to upload to YouTube as subtitles
  <char>_<episode>_cover.png   a cover frame
  upload.txt                   title, description with the AI disclosure, hashtags, pinned comment
"""
import argparse, difflib, json, re, subprocess, sys, tempfile, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VIDEO = ROOT / 'video'
FPS = 30
CUE = re.compile(r'\[[^\]]*\]')

PINNED = {  # first comment, written by the character, by the unsaid thing in the script
    'Sorry': 'Be honest. Would you pick up?', 'Thank you': 'Who did you think of? Tell me.',
    'Proud': "Tell me one thing you're proud of this week.", 'I miss you': 'Who are you missing right now?',
    'I noticed': "Are you okay? Really? Tell me.", "You'll be fine": "What's the hard thing this week? Tell me.",
    'This is so you': 'Be honest. Is this you?', 'I love you': 'Say it back. I am waiting.',
}
TAGS = {'girlfriend': '#girlfriend #relationship', 'boyfriend': '#boyfriend #relationship', 'mother': '#mom #maa',
        'father': '#dad #papa', 'sister': '#sister #siblings', 'brother': '#brother #siblings',
        'best-friend': '#bestfriend #friendship'}


def norm(w):
    w = unicodedata.normalize('NFKC', w.lower())
    return ''.join(c for c in w if c.isalnum() or c == "'")


def word_times(voice, lang):
    """[(word, start, end)] from speech-to-text with word timestamps."""
    import librosa
    from faster_whisper import WhisperModel
    asr = WhisperModel('small.en' if lang == 'en' else 'large-v3-turbo', device='cpu', compute_type='int8')
    y = librosa.load(voice, sr=16000)[0]
    segs, _ = asr.transcribe(y, language=lang, word_timestamps=True, beam_size=5)
    return [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]


def align(script_words, asr):
    """Give each word of the script a start and end time, taken from the matching spoken word."""
    a, b = [norm(w) for w in script_words], [norm(w) for w, _, _ in asr]
    times = [None] * len(a)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                times[i1 + k] = (asr[j1 + k][1], asr[j1 + k][2])
        elif tag == 'replace':
            s, e, n = asr[j1][1], asr[j2 - 1][2], i2 - i1
            for k in range(n):
                times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    known = [i for i, x in enumerate(times) if x]
    if not known:
        raise SystemExit('could not match any word of the script to the audio')
    for i, x in enumerate(times):  # words the speech-to-text missed: place them between neighbours
        if x is None:
            prev = max((k for k in known if k < i), default=None)
            nxt = min((k for k in known if k > i), default=None)
            s = times[prev][1] if prev is not None else times[nxt][0] - 0.3
            e = times[nxt][0] if nxt is not None else s + 0.3
            span = [k for k in range(len(times)) if (prev is None or k > prev) and (nxt is None or k < nxt)]
            j, n = span.index(i), len(span)
            times[i] = (s + (e - s) * j / n, s + (e - s) * (j + 1) / n)
    return [dict(w=w, s=round(t[0], 3), e=round(t[1], 3)) for w, t in zip(script_words, times)]


def pages_from(words, max_chars=19, max_lines=2):
    """Group words into caption pages of up to two short lines, breaking at sentences and pauses."""
    pages, lines, line = [], [], []

    def close_page():
        nonlocal lines, line
        if line:
            lines.append(line)
        if lines:
            ids = [i for l in lines for i in l]
            pages.append(dict(lines=lines, s=words[ids[0]]['s'], e=words[ids[-1]]['e']))
        lines, line = [], []

    for i, w in enumerate(words):
        text = ' '.join(words[k]['w'] for k in line + [i])
        if line and len(text) > max_chars:
            lines.append(line)
            line = []
            if len(lines) == max_lines:
                close_page()
        line.append(i)
        nxt = words[i + 1] if i + 1 < len(words) else None
        sentence_end = w['w'][-1:] in '.?!…' and len([k for l in lines for k in l] + line) >= 2
        long_pause = nxt is not None and nxt['s'] - w['e'] > 0.6
        if nxt is None or sentence_end or long_pause:
            close_page()
    for k, p in enumerate(pages):
        nxt_s = pages[k + 1]['s'] if k + 1 < len(pages) else 1e9
        p['until'] = round(min(nxt_s - 0.02, p['e'] + 0.9), 3)
    return pages


def envelope(voice, duration):
    import librosa, numpy as np
    y, sr = librosa.load(voice, sr=24000)
    hop = sr // FPS
    rms = librosa.feature.rms(y=y, frame_length=hop * 2, hop_length=hop)[0]
    rms = rms / (np.percentile(rms, 95) + 1e-9)
    rms = np.convolve(rms, np.ones(3) / 3, mode='same')
    n = int(round(duration * FPS)) + 1
    return [round(float(min(1.0, v)), 3) for v in np.pad(rms, (0, max(0, n - len(rms))))[:n]]


def srt(words, pages, path):
    ts = lambda s: f'{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(s * 1000 % 1000):03d}'
    with open(path, 'w') as f:
        for k, p in enumerate(pages, 1):
            text = '\n'.join(' '.join(words[i]['w'] for i in line) for line in p['lines'])
            f.write(f"{k}\n{ts(p['s'])} --> {ts(p['until'])}\n{text}\n\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('episode', type=Path, help='episode folder with the voice tracks, e.g. voices/mother/first-salary')
    ap.add_argument('--script', help='script id in scripts.json (default: <character>/<episode>)')
    ap.add_argument('--text', help='caption text, if the episode has no script (cues in [brackets] are dropped)')
    ap.add_argument('--dedication', help='the line at the top, e.g. "for the dad who never says it"')
    ap.add_argument('--time', help='time shown on the voice note, e.g. "6:02 AM"')
    ap.add_argument('--bg', type=Path, help='your own photo or video to use instead of the drawn scene')
    ap.add_argument('--music', type=Path, help='optional music bed, mixed well under the voice')
    ap.add_argument('--lang', default='en')
    ap.add_argument('--cover-at', type=float, help='seconds into the Short for the cover frame')
    args = ap.parse_args()

    ep = args.episode.resolve()
    char_dir = ep.parent
    char = json.loads((char_dir / 'character.json').read_text())
    theme = char.get('theme', {})
    stem = f'{char_dir.name}_{ep.name}'
    voice, mixed = ep / f'{stem}_voice_only.mp3', ep / f'{stem}_mixed.mp3'
    if not voice.exists():
        raise SystemExit(f'no voice track in {ep} (expected {voice.name}); make it with convert_recording.py or make_track.py first')

    scripts = {s['id']: s for s in json.loads((ROOT / 'scripts.json').read_text())}
    script = scripts.get(args.script or f'{char_dir.name}/{ep.name}')
    text = args.text or (script['text'] if script else None)
    if text is None:
        conv = ep / 'conversion.json'
        if conv.exists():
            text = json.loads(conv.read_text())['checks'][0]['she_said']
    if not text:
        raise SystemExit('no caption text: pass --text, or name the episode after a scripts.json id')
    script_words = CUE.sub(' ', text).split()
    dedication = args.dedication or (script['title'][0].lower() + script['title'][1:] if script else '')

    import librosa
    duration = round(librosa.get_duration(path=str(mixed if mixed.exists() else voice)), 3)
    print(f'{stem}: {duration:.1f} s, {len(script_words)} words')
    words = align(script_words, word_times(voice, args.lang))
    pages = pages_from(words)
    env = envelope(voice, duration)
    voice_end = min(duration, words[-1]['e'] + 0.3)
    nb = 40
    bars = [round(max(env[int(voice_end * FPS * b / nb):int(voice_end * FPS * (b + 1) / nb) + 1] or [0]), 3) for b in range(nb)]

    cfg = dict(mode='overlay' if args.bg else 'scene', scene=theme.get('scene', 'citynights'), palette=theme.get('palette', ['#2b3150', '#8fa0d8', '#e7a23b']),
               accent=theme.get('accent', '#f2b544'), name=char.get('name', char_dir.name), time_label=args.time or theme.get('time_label', '11:48 PM'),
               dedication=dedication, duration=duration, fps=FPS, words=words, pages=pages, env=env, bars=bars, voice_end=voice_end)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        (tmp / 'cfg.json').write_text(json.dumps(cfg))
        layer = tmp / ('overlay.mov' if args.bg else 'video.mp4')
        print('rendering frames...', flush=True)
        subprocess.run(['node', str(VIDEO / 'render.cjs'), str(tmp / 'cfg.json'), str(layer)], check=True)
        video = layer
        if args.bg:  # your footage underneath, cropped to 9:16, looped to length
            video = tmp / 'video.mp4'
            image = args.bg.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')
            bg_in = ['-loop', '1', '-i', str(args.bg)] if image else ['-stream_loop', '-1', '-i', str(args.bg)]
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *bg_in, '-i', str(layer), '-filter_complex',
                            '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[b];[b][1:v]overlay=0:0:format=auto[v]',
                            '-map', '[v]', '-t', str(duration), '-r', str(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', str(video)], check=True)
        audio_in = ['-i', str(mixed if mixed.exists() else voice)]
        if args.music:
            fc = (f'[2:a]volume=0.12,afade=t=in:d=1.5,afade=t=out:st={max(0, duration - 2)}:d=2[m];'
                  '[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[a]')
            audio_args = [*audio_in, '-stream_loop', '-1', '-i', str(args.music), '-filter_complex', fc, '-map', '0:v', '-map', '[a]']
        else:
            audio_args = [*audio_in, '-map', '0:v', '-map', '1:a']
        out = ep / f'{stem}_short.mp4'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(video), *audio_args, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                        '-t', str(duration), '-movflags', '+faststart', str(out)], check=True)
        cover_at = args.cover_at if args.cover_at is not None else max(p['s'] + 0.6 for p in pages if p['s'] < duration * 0.65)
        subprocess.run(['node', str(VIDEO / 'render.cjs'), str(tmp / 'cfg.json'), str(ep / f'{stem}_cover.png'), '--frame', str(cover_at)], check=True)
    srt(words, pages, ep / f'{stem}.srt')

    unsaid = script['unsaid'] if script else 'Sorry'
    title = (dedication[:1].upper() + dedication[1:]) if dedication else f"{char.get('name')}'s voice note"
    upload = [
        f"TITLE\n{title} | {char.get('playlist', '')}",
        f"DESCRIPTION\n{title}.\nA tiny voice note from {char.get('name')}, for the person you can't say it to.\n\n"
        f"Fictional character. The voice is AI, made from the creator's own acted performance.\n#pov {TAGS.get(char_dir.name, '')} #shorts",
        f"PLAYLIST\n{char.get('playlist', '')}",
        f"PINNED COMMENT\n{char.get('name')}: {PINNED.get(unsaid, PINNED['Sorry'])}",
        "WHEN UPLOADING\n- Altered or synthetic content: Yes\n- Audience: No, it's not made for kids\n- Subtitles: upload the .srt file",
    ]
    (ep / 'upload.txt').write_text('\n\n'.join(upload) + '\n')
    print(f'wrote {out.name}, {stem}.srt, {stem}_cover.png, upload.txt')


if __name__ == '__main__':
    main()
