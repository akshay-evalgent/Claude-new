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
PINNED_HI = {  # the same, in Hinglish, for Hindi episodes
    'Sorry': 'Sach batao… phone uthaoge?', 'Thank you': 'Kisko yaad kiya? Batao.',
    'Proud': 'Is hafte kis baat pe proud ho? Batao.', 'I miss you': 'Abhi kisko miss kar rahe ho?',
    'I noticed': 'Sach mein theek ho? Batao.', "You'll be fine": 'Is hafte kya mushkil chal raha hai? Batao.',
    'This is so you': 'Sach batao… yeh tum ho na?', 'I love you': 'Comment mein wapas bolo na.',
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


def snap_to_speech(asr, regions, min_gap=0.35):
    """Speech-to-text often stretches a word across a pause ("I'm" from 1.2 s to 4.8 s when it was
    said at 3.1 s). Move such words onto the stretch of speech where they were actually said."""
    out = []
    for w, s, e in asr:
        for (a0, a1), (b0, b1) in zip(regions[:-1], regions[1:]):
            if b0 - a1 >= min_gap and s < b0 < e and a1 > s - 0.05:   # a pause starts inside the word
                s, e = b0, min(e, b1)
                break
        for (a0, a1), (b0, b1) in zip([(-1, 0)] + regions[:-1], regions):
            if a1 <= s < b0:                                          # the word starts in a pause
                s = b0
                e = max(e, s + 0.12)
                break
        out.append((w, s, e))
    return out


def latin(word):
    """A word in Hindi script, written in English letters (ITRANS), for comparing with Hinglish captions."""
    if all(ord(c) < 0x900 or ord(c) > 0x97F for c in word):
        return word
    from indic_transliteration import sanscript
    return sanscript.transliterate(word, sanscript.DEVANAGARI, sanscript.ITRANS)


def sound_key(word):
    """Spelling-tolerant keys for a romanised word: 'matlab', 'matalaba' and 'mutlab' come out close."""
    w = re.sub(r'[^a-z]', '', latin(word).lower().replace('.n', 'n'))
    for a, b in (('ph', 'f'), ('w', 'v'), ('z', 'j'), ('q', 'k'), ('x', 'ks'), ('ee', 'i'), ('oo', 'u'), ('aa', 'a')):
        w = w.replace(a, b)
    w = re.sub(r'([bcdgjkpst])h', r'\1', w)          # aspiration spelled either way: bhi/bi, thi/ti
    w = re.sub(r'(.)\1+', r'\1', w)                  # doubled letters: gussa/gusa
    loose = re.sub(r'(?<=[^aeiou])a$', '', w)         # the trailing inherent 'a' of transliteration
    skeleton = re.sub(r'[aeiouy]', '', w) or w[:1]   # consonants only: matalaba -> mtlb
    return loose, skeleton


def fuzzy_align(script_words, asr, min_sim=0.5):
    """Match caption words to spoken words in order, allowing near-misses in spelling
    (Hinglish captions against Hindi speech-to-text, or misheard words)."""
    A = [sound_key(w) for w in script_words]
    B = [sound_key(w) for w, _, _ in asr]
    sim = lambda a, b: 0.5 * difflib.SequenceMatcher(None, a[0], b[0]).ratio() + 0.5 * difflib.SequenceMatcher(None, a[1], b[1]).ratio()
    n, m = len(A), len(B)
    best = [[0.0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            s = sim(A[i], B[j])
            best[i][j] = max(best[i + 1][j], best[i][j + 1], best[i + 1][j + 1] + (s - min_sim if s >= min_sim else -1e9))
    times, pairs, i, j = [None] * n, [], 0, 0
    while i < n and j < m:
        s = sim(A[i], B[j])
        if s >= min_sim and abs(best[i][j] - (best[i + 1][j + 1] + s - min_sim)) < 1e-9:
            times[i] = (asr[j][1], asr[j][2]); pairs.append((i, j)); i += 1; j += 1
        elif best[i][j] == best[i + 1][j]:
            i += 1
        else:
            j += 1
    # caption words left unmatched between two matches borrow the timing of the spoken words
    # left unmatched in the same place (e.g. "Hey" heard as "ए", "please" as "प्लीज")
    anchors = [(-1, -1)] + pairs + [(n, m)]
    for (i0, j0), (i1, j1) in zip(anchors[:-1], anchors[1:]):
        gap_i, gap_j = list(range(i0 + 1, i1)), list(range(j0 + 1, j1))
        for k, ii in enumerate(gap_i):
            if gap_j:
                jj = gap_j[min(len(gap_j) - 1, k * len(gap_j) // len(gap_i))]
                times[ii] = (asr[jj][1], asr[jj][2])
    return times


def align(script_words, asr, fuzzy=False):
    if fuzzy:
        times = fuzzy_align(script_words, asr)
        return fill_times(script_words, times)
    return exact_align(script_words, asr)


def exact_align(script_words, asr):
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
    return fill_times(script_words, times)


def fill_times(script_words, times):
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


def pages_from(words, max_chars=20, max_lines=2):
    """Group words into caption pages of up to two short lines, breaking at sentences, commas and pauses."""
    pages, lines, line = [], [], []

    def close_page():
        nonlocal lines, line
        if line:
            lines.append(line)
        if len(lines) == 2:  # rebalance, so no line is left holding one stray word
            ids = lines[0] + lines[1]
            txt = lambda part: ' '.join(words[k]['w'] for k in part)
            options = [(abs(len(txt(ids[:k])) - len(txt(ids[k:]))), k) for k in range(1, len(ids))
                       if max(len(txt(ids[:k])), len(txt(ids[k:]))) <= max_chars + 3]
            if options:
                k = min(options)[1]
                lines = [ids[:k], ids[k:]]
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
        on_page = len([k for l in lines for k in l] + line)
        sentence_end = w['w'][-1:] in '.?!…' and on_page >= 2
        comma = w['w'][-1:] in ',;:' and on_page >= 3
        long_pause = nxt is not None and nxt['s'] - w['e'] > 0.5
        if nxt is None or sentence_end or comma or long_pause:
            close_page()
    for k, p in enumerate(pages):
        nxt_s = pages[k + 1]['s'] if k + 1 < len(pages) else 1e9
        p['until'] = round(min(nxt_s - 0.02, p['e'] + 0.9), 3)
    if pages:
        pages[0]['s'] = 0.0   # the first line is on screen from the first frame, as the hook
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
    ap.add_argument('--bg-audio', type=float, default=0.0, help='keep the --bg video\'s own sound (e.g. rain) at this level under the voice, e.g. 0.15')
    ap.add_argument('--ai-visuals', action='store_true', help='the --bg footage is AI-generated (e.g. Google Flow); says so in the description')
    ap.add_argument('--loop-fade', type=float, default=0.5, help='seconds of crossfade where a --bg video loops (default 0.5; 0 for none)')
    ap.add_argument('--captions-y', type=int, default=900, help='top of the caption block in pixels (default 900; lower it onto a dark area of your footage, e.g. 1260)')
    ap.add_argument('--variant', help='save as <char>_<episode>_short_<variant>.mp4, e.g. flow, to compare versions')
    ap.add_argument('--timing-from', type=Path, help='time captions from this recording (your original take: same timing, clearer words)')
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
    sys.path.insert(0, str(ROOT))
    import librosa as _l, performance
    # caption timing comes from your original take when we have it: the converted voice has the same
    # timing, but a slurred word can pull the matcher onto the wrong word (seen 1-2 s off on Hindi)
    conv_file = ep / 'conversion.json'
    saved = json.loads(conv_file.read_text()).get('source_words') if conv_file.exists() else None
    timing_audio = str(args.timing_from) if args.timing_from else voice
    if args.timing_from or not saved:
        spoken = word_times(timing_audio, args.lang)
        print(f'caption timing from {Path(timing_audio).name}')
    else:
        spoken = [tuple(x) for x in saved]
        timing_audio = None
        print('caption timing from your original take (saved by convert_recording.py)')
    regions = performance.speech_regions(_l.load(timing_audio or voice, sr=24000)[0], 24000)
    latin_captions = not any('\u0900' <= c <= '\u097f' for c in ''.join(script_words))  # no Hindi letters (… and quotes don't count)
    words = align(script_words, snap_to_speech(spoken, regions), fuzzy=args.lang != 'en' and latin_captions)
    pages = pages_from(words)
    env = envelope(voice, duration)
    voice_end = min(duration, words[-1]['e'] + 0.3)
    nb = 40
    bars = [round(max(env[int(voice_end * FPS * b / nb):int(voice_end * FPS * (b + 1) / nb) + 1] or [0]), 3) for b in range(nb)]

    cfg = dict(mode='overlay' if args.bg else 'scene', scene=theme.get('scene', 'citynights'), palette=theme.get('palette', ['#2b3150', '#8fa0d8', '#e7a23b']),
               accent=theme.get('accent', '#f2b544'), name=char.get('name', char_dir.name), time_label=args.time or theme.get('time_label', '11:48 PM'),
               dedication=dedication, duration=duration, fps=FPS, words=words, pages=pages, env=env, bars=bars, voice_end=voice_end,
               caption_top=args.captions_y)
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
            bg = args.bg
            if not image and args.loop_fade > 0:  # make the clip's end flow into its start, so repeats don't jump
                x = args.loop_fade
                clip_len = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(bg)],
                                                capture_output=True, text=True, check=True).stdout)
                bg = tmp / 'bg_loop.mp4'
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(args.bg), '-filter_complex',
                                f'[0:v]split[a][b];[a]trim=start={x},setpts=PTS-STARTPTS[main];[b]trim=0:{x},setpts=PTS-STARTPTS[head];'
                                f'[main][head]xfade=transition=fade:duration={x}:offset={clip_len - 2 * x:.3f}[v]',
                                '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', str(bg)], check=True)
            bg_in = ['-loop', '1', '-i', str(bg)] if image else ['-stream_loop', '-1', '-i', str(bg)]
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *bg_in, '-i', str(layer), '-filter_complex',
                            '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1[b];[b][1:v]overlay=0:0:format=auto[v]',
                            '-map', '[v]', '-t', str(duration), '-r', str(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', str(video)], check=True)
        audio_in = ['-i', str(mixed if mixed.exists() else voice)]
        if args.bg and args.bg_audio > 0 and not args.music:  # the clip's own ambience (rain, street) under the voice
            fc = f'[2:a]volume={args.bg_audio}[m];[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[a]'
            audio_args = [*audio_in, '-stream_loop', '-1', '-i', str(args.bg), '-filter_complex', fc, '-map', '0:v', '-map', '[a]']
        elif args.music:
            fc = (f'[2:a]volume=0.12,afade=t=in:d=1.5,afade=t=out:st={max(0, duration - 2)}:d=2[m];'
                  '[1:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[a]')
            audio_args = [*audio_in, '-stream_loop', '-1', '-i', str(args.music), '-filter_complex', fc, '-map', '0:v', '-map', '[a]']
        else:
            audio_args = [*audio_in, '-map', '0:v', '-map', '1:a']
        tag = f'_{args.variant}' if args.variant else ''
        out = ep / f'{stem}_short{tag}.mp4'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(video), *audio_args, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                        '-t', str(duration), '-movflags', '+faststart', str(out)], check=True)
        cover_at = args.cover_at if args.cover_at is not None else max(p['s'] + 0.6 for p in pages if p['s'] < duration * 0.65)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(cover_at), '-i', str(out), '-frames:v', '1',  # from the finished Short,
                        str(ep / f'{stem}_cover{tag}.png')], check=True)                                     # so footage and overlays match
    srt(words, pages, ep / f'{stem}.srt')

    unsaid = script['unsaid'] if script else 'Sorry'
    title = (dedication[:1].upper() + dedication[1:]) if dedication else f"{char.get('name')}'s voice note"
    hindi = args.lang == 'hi'
    line2 = (f"Ek chhota sa voice note, {char.get('name')} ki taraf se. Us insaan ke liye, jise tum keh nahi paaye." if hindi
             else f"A tiny voice note from {char.get('name')}, for the person you can't say it to.")
    pinned = (PINNED_HI if hindi else PINNED).get(unsaid, (PINNED_HI if hindi else PINNED)['Sorry'])
    upload = [
        f"TITLE\n{title} | {char.get('playlist', '')}",
        f"DESCRIPTION\n{title}.\n{line2}\n\n"
        f"Fictional character, made with AI: the voice comes from the creator's own acted performance"
        f"{', the visuals are AI-generated' if args.ai_visuals else ''}.\n#pov {TAGS.get(char_dir.name, '')}{' #hindi #hinglish' if hindi else ''} #shorts",
        f"PLAYLIST\n{char.get('playlist', '')}",
        f"PINNED COMMENT\n{char.get('name')}: {pinned}",
        "WHEN UPLOADING\n- Altered or synthetic content: Yes\n- Audience: No, it's not made for kids\n- Subtitles: upload the .srt file",
    ]
    (ep / f'upload{tag}.txt').write_text('\n\n'.join(upload) + '\n')
    print(f'wrote {out.name}, {stem}.srt, {stem}_cover{tag}.png, upload{tag}.txt')


if __name__ == '__main__':
    main()
