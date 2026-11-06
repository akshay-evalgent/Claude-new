#!/usr/bin/env python3
"""Make one micro-course episode: narration, drawings timed to the words, real footage, sound, package.

    voices/run make_episode.py courses/texting-decoded/episodes/01-ok-period
    voices/run make_episode.py courses/.../01-ok-period --engine chatterbox
    voices/run make_episode.py courses/.../01-ok-period --voice-only          # just the narration
    voices/run make_episode.py courses/.../01-ok-period --sample 1,4,9 --engine dia   # hear a few beats
    voices/run make_episode.py courses/.../01-ok-period --recording my_read.aac --accent us
        # your performance, American accent: an American voice says the words with your timing and
        # intonation (prosody.py), then it is converted to the narrator; your breaths fill the gaps

Reads the episode's script.json (beats with voice phrases, scenes, drawings, footage), the course's
course.json (the kit: style, narrator, sticker) and the narrator's character.json.

1. Narration. Each beat's line is split into phrases with a pause after each (comic timing lives in
   those pauses). Every phrase is generated --takes times in the narrator's voice by the chosen
   engine (free Hugging Face demos: voxcpm, chatterbox, dia), checked with speech-to-text and a
   speaker match, and the best take is kept. Takes live in takes/<engine>/ (not committed).
2. Timeline. Beats start where the script says, pushed later only if the previous line runs long.
   Captions and drawings are timed from the words actually spoken.
3. Video. courses/episode.html draws every frame (notebook style, the sketched phone, drawings that
   write on, real footage taped on the page, captions); courses/render.cjs records it.
4. Sound. The voice is polished and set to -14 LUFS; the sound kit (buzz, marker, pencil, pops,
   tick, clock) is placed at the drawing times; nothing clips.
5. Package: <ep>.mp4, <ep>_cover.png, <ep>.srt, upload.txt.
"""
import argparse, json, re, shutil, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_track import POLISH, SR, generate, loudness, text_match  # noqa: E402
from make_video import align, pages_from, srt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
GAP = 0.25           # least silence between two lines
DRAW_SECONDS = 0.35  # how long a drawing takes to appear
ENGINES = ('voxcpm', 'chatterbox', 'dia')


def norm(w):
    return re.sub(r"[^a-z0-9']", '', w.lower())


def tts_text(say):
    """What the engine reads: quotes dropped, colons as commas, an ellipsis as dots."""
    t = re.sub(r"(?<!\w)['\"]|['\"](?!\w)", '', say)
    return t.replace(':', ',').replace('…', '...')


# ----------------------------------------------------------------------------- narration engines
def retrying(fn, what):
    for attempt in range(12):
        try:
            return fn()
        except Exception as e:  # the free demos are often busy
            print(f'  {what}: busy, retrying ({attempt + 1}): {str(e)[:90]}', flush=True)
            time.sleep(min(10 * (attempt + 1), 45))
    raise SystemExit(f'gave up on {what}')


def to_mp3(path, out):
    if isinstance(path, (tuple, list)):  # (sample_rate, array)
        import numpy as np, soundfile as sf
        tmp = out.with_suffix('.wav')
        sf.write(tmp, np.asarray(path[1], dtype='float32') / (32768.0 if np.asarray(path[1]).dtype.kind == 'i' else 1.0), path[0])
        path = tmp
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(path), '-ar', '48000', '-b:a', '192k', str(out)], check=True)


def chatterbox(text, ref, out, exaggeration=0.4, cfgw=0.3, temperature=0.6):
    from gradio_client import Client, handle_file
    client = Client('ResembleAI/Chatterbox', verbose=False)
    path = retrying(lambda: client.predict(text_input=text, audio_prompt_path_input=handle_file(str(ref)), exaggeration_input=exaggeration,
                                           temperature_input=temperature, seed_num_input=7, cfgw_input=cfgw, vad_trim_input=True,
                                           api_name='/generate_tts_audio'), 'chatterbox')
    to_mp3(path, out)


def dia(text, ref, ref_text, out):
    from gradio_client import Client, handle_file
    client = Client('nari-labs/Dia-1.6B', verbose=False)
    path = retrying(lambda: client.predict(text_input='[S1] ' + text, audio_prompt_input=handle_file(str(ref)), transcription_input='[S1] ' + ref_text,
                                           max_new_tokens=1024, cfg_scale=3.0, temperature=1.3, top_p=0.95, cfg_filter_top_k=35, speed_factor=0.94,
                                           api_name='/generate_audio'), 'dia')
    to_mp3(path, out)


def synth(engine, text, control, ref, ref_text, out):
    if engine == 'voxcpm':
        generate(text, control, ref, ref_text, out)
    elif engine == 'chatterbox':
        chatterbox(text, ref, out)
    elif engine == 'dia':
        dia(text, ref, ref_text, out)


# ----------------------------------------------------------------------------- lines and takes
def phrase_lines(beats):
    """One line per phrase: {k, beat, say, pause, control}. A beat without 'phrases' is one phrase."""
    lines = []
    for i, b in enumerate(beats):
        phrases = b.get('phrases') or ([dict(say=b['voice'], pause=0)] if b.get('voice') else [])
        for ph in phrases:
            ln = dict(k=len(lines) + 1, beat=i, say=ph['say'], pause=float(ph.get('pause', 0)), control=b.get('control', ''))
            if 'region' in ph:  # where this phrase sits in your own recording, seconds
                ln['region'] = ph['region']
            if 'tts' in ph:  # how a voice should say it, when the caption spelling would mislead it
                ln['tts'] = ph['tts']
            lines.append(ln)
    return lines


def make_takes(lines, takes_dir, narrator_dir, narrator, n_takes, engine):
    takes_dir.mkdir(parents=True, exist_ok=True)
    for ln in lines:
        for t in range(1, n_takes + 1):
            out = takes_dir / f'line{ln["k"]}_t{t}.mp3'
            if not out.exists():
                control = f"{narrator['description']}. {ln['control']}".strip('. ')
                print(f'line {ln["k"]} take {t} ({engine}): {ln["say"]}  [{ln["control"]}]', flush=True)
                synth(engine, tts_text(ln['say']), control, narrator_dir / narrator['reference'], narrator.get('reference_text', ''), out)


def pick_takes(lines, takes_dir, identity, min_match=0.75):
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
    for ln in lines:
        k, rows = ln['k'], []
        for f in sorted(takes_dir.glob(f'line{k}_t*.mp3')):
            y = librosa.load(f, sr=16000)[0]
            segs, _ = asr.transcribe(y, beam_size=5, language='en', word_timestamps=True)
            words = [[w.word.strip(), round(w.start, 3), round(w.end, 3)] for s in segs for w in s.words]
            heard = ' '.join(w[0] for w in words)
            acc = text_match(ln['say'], heard, 'en') if words else 0.0
            sim = float(torch.nn.functional.cosine_similarity(ref, embed(y), dim=0)) if len(y) > 1600 else 0.0
            _, (a, z) = librosa.effects.trim(y, top_db=40)
            rows.append(dict(file=f.name, words=round(acc, 2), same_voice=round(sim, 2), heard=heard, asr=words,
                             trim=[round(a / 16000, 3), round(z / 16000, 3)], length=round(len(y) / 16000, 2)))
            print(f'  {f.name:12s} words={acc:.2f} same_voice={sim:.2f} {len(y) / 16000:.1f}s | {heard}')
        if not rows:
            raise SystemExit(f'line {k}: no takes in {takes_dir}')
        ok = [r for r in rows if r['words'] >= min_match]
        best = max(ok, key=lambda r: r['same_voice']) if ok else max(rows, key=lambda r: r['words'])
        if not ok:
            print(f'  line {k}: no take had all the words; keeping the closest ({best["file"]})')
        picks[k] = best
        report[k] = rows
    (takes_dir / 'scores.json').write_text(json.dumps(report, indent=1))
    return picks


# ----------------------------------------------------------------------------- your own performance
KOKORO = Path.home() / '.voices-vendor' / 'kokoro'


def kokoro_text(say):
    """What the American voice reads: 'ok' as 'okay', a lone k as the letter K."""
    t = tts_text(say)
    t = re.sub(r"\bok\b", 'okay', t, flags=re.I)
    return re.sub(r"(?<![\w'])k(?![\w'])", 'K', t)


def american_performance(src, lines, lead, out, voice='am_michael'):
    """Your performance in an American voice: each phrase is said by an American text-to-speech
    voice (Kokoro, on this machine), then re-timed to your words and given your intonation
    (prosody.transplant), and placed exactly where you said it. Gaps stay silent here; your
    breaths come back later from the original."""
    import librosa, numpy as np, soundfile as sf
    from kokoro_onnx import Kokoro
    from faster_whisper import WhisperModel
    from prosody import transplant
    sr = 24000
    y = librosa.load(src, sr=sr)[0]
    track = np.zeros(len(y), dtype=np.float32)
    tts = Kokoro(str(KOKORO / 'kokoro-v1.0.onnx'), str(KOKORO / 'voices-v1.0.bin'))
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    def words(a):
        segs, _ = asr.transcribe(librosa.resample(a, orig_sr=sr, target_sr=16000), beam_size=5, language='en', word_timestamps=True)
        return [(w.word.strip(), w.start, w.end) for sg in segs for w in sg.words]
    for ln in lines:
        s, e = ln['region'][0] - lead, ln['region'][1] - lead
        a, z = max(0, int((s - 0.03) * sr)), min(len(y), int((e + 0.05) * sr))
        ref = y[a:z]
        said, _ = tts.create(ln.get('tts', kokoro_text(ln['say'])), voice=voice, speed=0.95, lang='en-us')
        said, _ = librosa.effects.trim(said, top_db=40)
        moved = transplant(said, ref, sr, words(said), words(ref))
        track[a:a + len(moved)] += moved[:len(track) - a]
        print(f"  american {ln['k']:2d} {len(said) / sr:4.2f}s -> {len(moved) / sr:4.2f}s  {ln['say']}")
    sf.write(out, track / (np.abs(track).max() + 1e-9) * 0.8, sr)


def recorded_takes(ep_dir, recording, lines, narrator_dir, narrator, steps=30, accent=None):
    """You read the whole episode as one voice note; it is converted to the narrator's voice
    (Seed-VC, pitch-following: your timing, breaths and delivery stay), then cut into the script's
    phrases by matching the words you said. Your own pauses replace the script's.
    accent='us': the words are first said by an American voice carrying your timing and
    intonation (american_performance), and that is what gets converted, so the accent is US."""
    import librosa, numpy as np, soundfile as sf
    import convert_recording as cr, performance
    from faster_whisper import WhisperModel
    takes_dir = ep_dir / 'takes' / ('recorded_us' if accent == 'us' else 'recorded')
    takes_dir.mkdir(parents=True, exist_ok=True)
    src, conv = takes_dir / 'source.wav', takes_dir / 'converted.wav'
    if not src.exists():
        raw = takes_dir / 'source_raw.wav'
        cr.to_wav(recording, raw)
        # room noise down (FFT denoiser, gentle) and rumble off, before the converter hears it
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(raw), '-af', 'highpass=f=70,afftdn=nr=10:nf=-40:tn=1', str(src)], check=True)
        cut = cr.trim_silence(src)
        (takes_dir / 'trim.json').write_text(json.dumps({'start': cut[0], 'end': cut[1]}))
        print(f'  trimmed silence: {cut[0]} s from the start, {cut[1]} s from the end')
    lead = json.loads((takes_dir / 'trim.json').read_text())['start'] if (takes_dir / 'trim.json').exists() else 0.0
    if not conv.exists():
        vc_in = src
        if accent == 'us':
            if not all('region' in ln for ln in lines):
                raise SystemExit("--accent us needs each phrase's 'region' in the script")
            us = takes_dir / 'american.wav'
            if not us.exists():
                american_performance(src, lines, lead, us)
            vc_in = takes_dir / 'american_44k.wav'
            cr.to_wav(us, vc_in)
        print(f'  converting to {narrator["name"]} (Seed-VC on this machine, a few minutes)', flush=True)
        cr.convert_local(vc_in, narrator_dir / narrator['identity'], conv, steps, 0)
    y_src, y_conv = librosa.load(src, sr=SR)[0], librosa.load(conv, sr=SR)[0]
    extra = librosa.load(takes_dir / 'american.wav', sr=SR)[0] if accent == 'us' else None
    voice, info = performance.transfer(y_src, y_conv, SR, extra=extra)
    print(f'  performance: {info}')
    asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    y16 = librosa.load(src, sr=16000)[0]
    if all('region' in ln for ln in lines):  # the script already names where each phrase sits in the recording
        timed = None
    else:
        segs, _ = asr.transcribe(y16, beam_size=5, language='en', word_timestamps=True)
        heard = [(w.word.strip(), w.start, w.end) for sg in segs for w in sg.words]
        print('  you said:', ' '.join(h[0] for h in heard))
        timed = align([w for ln in lines for w in ln['say'].split()], heard)
    picks, pos = {}, 0
    for idx, ln in enumerate(lines):
        n = len(ln['say'].split())
        if timed is None:  # regions were measured on the untrimmed recording
            s, e = ln['region'][0] - lead, ln['region'][1] - lead
            nxt = lines[idx + 1]['region'][0] - lead if idx + 1 < len(lines) else e + 0.6
            prev_end = lines[idx - 1]['region'][1] - lead if idx else 0.0
            a, z = max(prev_end + 0.02, s - 0.06), min(len(voice) / SR, min(e + 0.12, (e + nxt) / 2))
            segs, _ = asr.transcribe(y16[int(a * 16000):int(z * 16000)], beam_size=5, language='en', word_timestamps=True)
            heard = [(w.word.strip(), w.start, w.end) for sg in segs for w in sg.words]
            try:
                ws = [dict(w=w['w'], s=w['s'] + a, e=w['e'] + a) for w in align(ln['say'].split(), heard)] if heard else []
            except SystemExit:
                ws = []
            if not ws:
                ws = [dict(w=w, s=a + (z - a) * j / n, e=a + (z - a) * (j + 1) / n) for j, w in enumerate(ln['say'].split())]
        else:
            ws = timed[pos:pos + n]; pos += n
            s, e = ws[0]['s'], ws[-1]['e']
            nxt = timed[pos]['s'] if pos < len(timed) else e + 0.6
            a, z = max(0.0, s - 0.08), min(len(voice) / SR, min(e + 0.15, (e + nxt) / 2))
        seg = voice[int(a * SR):int(z * SR)].copy()
        fade = int(0.01 * SR); seg[:fade] *= np.linspace(0, 1, fade); seg[-fade:] *= np.linspace(1, 0, fade)
        wav = takes_dir / f'line{ln["k"]}_t1.wav'
        sf.write(wav, seg, SR)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), '-b:a', '192k', str(wav.with_suffix('.mp3'))], check=True)
        wav.unlink()
        picks[ln['k']] = dict(file=wav.with_suffix('.mp3').name, words=1.0, same_voice=None, heard=' '.join(w['w'] for w in ws),
                              asr=[[w['w'], round(w['s'] - a, 3), round(w['e'] - a, 3)] for w in ws], trim=[0.0, round(z - a, 3)], length=round(z - a, 2))
        same_beat = idx + 1 < len(lines) and lines[idx + 1]['beat'] == ln['beat']
        if same_beat:  # your pause, not the script's (capped so a stumble does not become a hole)
            ln['pause'] = round(max(0.0, min(2.5, nxt - z)), 3)
        print(f'  line {ln["k"]:2d} {a:6.2f}-{z:6.2f}s  pause {ln["pause"]:.2f}  {ln["say"]}')
    (takes_dir / 'picks.json').write_text(json.dumps(picks, indent=1))
    (takes_dir / 'pauses.json').write_text(json.dumps({ln['k']: ln['pause'] for ln in lines}, indent=1))
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


def phrase_words(ln, r, start):
    """Caption words of one phrase, placed at its spoken times."""
    a, z = r['trim']
    asr = [(w, s - a, e - a) for w, s, e in r['asr'] if e > a]
    script_words = ln['say'].split()
    try:
        bw = align(script_words, asr) if asr else []
    except SystemExit:
        bw = []
    if not bw:
        n, L = len(script_words), z - a
        bw = [dict(w=w, s=L * j / n, e=L * (j + 1) / n) for j, w in enumerate(script_words)]
    for w in bw:
        w['s'] = round(w['s'] + start, 3); w['e'] = round(w['e'] + start, 3)
    return bw


def build_timeline(beats, lines, picks):
    """Absolute start/end for every beat, every phrase, every caption word, every drawing and sound."""
    by_beat = {}
    for ln in lines:
        by_beat.setdefault(ln['beat'], []).append(ln)
    timeline, words, draws, sfx = [], [], [], []
    cursor = 0.0
    for i, b in enumerate(beats):
        p0, p1 = parse_t(b['t'])
        start = max(p0, cursor)
        cur, bw, placed = start, [], []
        for ln in by_beat.get(i, []):
            r = picks[ln['k']]
            a, z = r['trim']
            placed.append(dict(line=ln['k'], start=round(cur, 3)))
            bw += phrase_words(ln, r, cur)
            cur += (z - a) + ln['pause']
        voice_len = (cur - start) if placed else 0.0
        if placed:
            cur -= by_beat[i][-1]['pause']  # the last phrase's pause is the beat's own hold
        voice_end = cur if placed else start
        words += bw
        hold = b.get('hold_after', GAP)
        cursor = voice_end + hold if placed else max(start + (p1 - p0), start)
        timeline.append(dict(index=i, start=round(start, 3), voice_end=round(voice_end, 3), scene=b.get('scene', {}),
                             text=b.get('text', ''), phrases=placed))
        for d in b.get('draws', []):
            d = dict(d); d['at'] = round(resolve_at(d['at'], start, bw, voice_end), 3); d['beat'] = i
            draws.append(d)
            sound = d.get('sound', {'circle': 'marker', 'arrow': 'marker', 'bracket': 'marker', 'label': 'pencil',
                                    'bigtext': 'pencil', 'text': 'pencil', 'reply': 'pop', 'strip': 'pencil',
                                    'highlight': 'marker', 'clip': 'tap'}.get(d['type']))
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
        if placed and hold > 0.6:  # a held test: the clock ticks until the next beat
            t = voice_end + 0.3
            while t < cursor - 0.1:
                sfx.append(dict(sound='clock', at=round(t, 3))); t += 0.5
    for k, tb in enumerate(timeline):
        tb['end'] = timeline[k + 1]['start'] if k + 1 < len(timeline) else round(cursor + beats[k].get('tail', 0.3), 3)  # 'tail': room for the end card
    duration = timeline[-1]['end']
    return timeline, words, draws, sorted(sfx, key=lambda s: s['at']), duration


# ----------------------------------------------------------------------------- footage
def scene_key(b):
    sc = b.get('scene', {})
    return '|'.join(str(sc.get(k, '')) for k in ('type', 'thread', 'a', 'b', 'question'))


def chain_end(timeline, i):
    """When the scene that beat i belongs to ends (consecutive beats with the same scene)."""
    key = scene_key(timeline[i])
    j = i
    while j + 1 < len(timeline) and scene_key(timeline[j + 1]) == key:
        j += 1
    return timeline[j]['end']


def extract_clips(ep_dir, course_dir, clips, timeline, draws):
    """Real footage, taped onto the page. Each use of a clip becomes a folder of frames at FPS,
    already cropped to the size it is shown at, so the renderer just picks frame floor((t-start)*fps).
    A use can run slower than life (speed < 1) and holds its last frame if the beat outlasts it."""
    uses, k = {}, 0
    for i, tb in enumerate(timeline):
        sc = tb['scene']
        if sc.get('type') == 'clip':
            k += 1; uid = f'u{k}'
            sc['use'] = uid
            dur = tb['end'] - tb['start']
            speed = sc.get('speed', 1.0)
            if 'end_offset' in sc:  # land on this frame of the clip exactly when the beat ends (the loop frame)
                speed = max(0.05, (sc['end_offset'] - sc.get('offset', 0.0)) / dur)
            uses[uid] = dict(clip=sc['clip'], offset=sc.get('offset', 0.0), speed=round(speed, 4), start=tb['start'],
                             duration=dur, w=sc['frame']['w'], h=sc['frame']['h'], focus=sc.get('focus', [0.5, 0.5]))
    for d in draws:
        if d['type'] == 'clip':
            k += 1; uid = f'u{k}'
            d['use'] = uid
            uses[uid] = dict(clip=d['clip'], offset=d.get('offset', 0.0), speed=d.get('speed', 1.0), start=d['at'],
                             duration=chain_end(timeline, d['beat']) - d['at'], w=d['w'], h=d['h'], focus=d.get('focus', [0.5, 0.5]))
    out = {}
    for uid, u in uses.items():
        src = course_dir / clips[u['clip']]['file']
        folder = ep_dir / '_frames' / f"{uid}_{u['w']}x{u['h']}_{u['offset']}_{u['speed']}"  # a new size or cut gets fresh frames
        folder.mkdir(parents=True, exist_ok=True)
        want = int(u['duration'] * FPS) + 2
        if len(list(folder.glob('*.jpg'))) < want - 2:
            for f in folder.glob('*.jpg'):
                f.unlink()
            fx, fy = u['focus']
            vf = (f"setpts=PTS/{u['speed']},scale={u['w']}:{u['h']}:force_original_aspect_ratio=increase,"
                  f"crop={u['w']}:{u['h']}:(iw-{u['w']})*{fx}:(ih-{u['h']})*{fy}")
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(u['offset']), '-t', f"{u['duration'] * u['speed'] + 0.1:.3f}",
                            '-i', str(src), '-vf', vf, '-r', str(FPS), '-q:v', '3', str(folder / 'f%05d.jpg')], check=True)
        count = len(list(folder.glob('*.jpg')))
        out[uid] = dict(dir=str(folder.resolve()), count=count, w=u['w'], h=u['h'], start=u['start'], fps=FPS)
        print(f'  footage {uid}: {u["clip"]} from {u["offset"]}s, {count} frames at {u["w"]}x{u["h"]}, speed {u["speed"]}')
    return out


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


def voice_track(takes_dir, timeline, picks, n):
    import librosa, numpy as np
    voice = np.zeros(n)
    for tb in timeline:
        for ph in tb.get('phrases', []):
            r = picks[ph['line']]
            y = librosa.load(takes_dir / r['file'], sr=SR)[0]
            a, z = int(r['trim'][0] * SR), int(r['trim'][1] * SR)
            y = y[max(0, a - int(0.03 * SR)):z + int(0.05 * SR)]
            fade = int(0.01 * SR); y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
            s = int(ph['start'] * SR)
            voice[s:s + len(y)] += y[:n - s]
    return voice


def polish(voice, tmp, target=-13.2):
    """EQ, one fixed gain to the target loudness (the gaps between lines pull the integrated level down a bit)."""
    import numpy as np, soundfile as sf
    sf.write(tmp / 'voice_raw.wav', voice / (np.abs(voice).max() + 1e-9) * 0.7, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp / 'voice_raw.wav'), '-af', POLISH.rstrip(','),
                    '-c:a', 'pcm_f32le', str(tmp / 'voice_eq.wav')], check=True)
    return target - loudness(tmp / 'voice_eq.wav')


def mix_audio(ep_dir, takes_dir, timeline, picks, sfx, duration):
    import numpy as np, soundfile as sf
    n = int(duration * SR) + SR
    voice = voice_track(takes_dir, timeline, picks, n)
    kit = sound_kit()
    fx = np.zeros(n)
    for e in sfx:
        y = kit[e['sound']]; s = int(e['at'] * SR)
        fx[s:s + len(y)] += y[:n - s]
    tmp = ep_dir / '_tmp'
    tmp.mkdir(exist_ok=True)
    gain = polish(voice, tmp)
    sf.write(tmp / 'fx.wav', fx, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp / 'voice_eq.wav'), '-i', str(tmp / 'fx.wav'),
                    '-filter_complex', f'[0:a]volume={gain:.2f}dB[v];[1:a]volume=-9dB[f];[v][f]amix=inputs=2:duration=first:normalize=0,'
                    'alimiter=limit=0.84:attack=2:release=40:level=false[a]', '-map', '[a]', '-ar', str(SR), '-c:a', 'pcm_f32le',
                    str(tmp / 'mix.wav')], check=True)
    return tmp / 'mix.wav'


def write_sample(ep_dir, takes_dir, lines, picks, beats_wanted, engine):
    """The chosen beats' narration with their pauses, as one file to listen to."""
    import numpy as np, soundfile as sf
    sel = [ln for ln in lines if ln['beat'] in beats_wanted]
    placed, cur, last_beat = [], 0.3, None
    for ln in sel:
        if last_beat is not None and ln['beat'] != last_beat:
            cur += 0.8
        r = picks[ln['k']]
        placed.append(dict(line=ln['k'], start=round(cur, 3)))
        cur += (r['trim'][1] - r['trim'][0]) + ln['pause']
        last_beat = ln['beat']
    n = int((cur + 1) * SR)
    voice = voice_track(takes_dir, [dict(phrases=placed)], picks, n)
    tmp = ep_dir / '_tmp'; tmp.mkdir(exist_ok=True)
    gain = polish(voice, tmp, -14)
    out = takes_dir / f'sample_{engine}.mp3'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(tmp / 'voice_eq.wav'), '-af', f'volume={gain:.2f}dB,alimiter=limit=0.89:level=false',
                    '-ar', str(SR), '-b:a', '192k', str(out)], check=True)
    shutil.rmtree(tmp)
    print(f'wrote {out}')
    return out


# ----------------------------------------------------------------------------- package
def upload_text(course, ep_index, ep, script):
    n = len(course['episodes'])
    series = course['title']
    title = f"{ep['title']} | Seven Days To read any text ({ep_index}/{n})"
    eps = '\n'.join(f"{'▶ ' if k == ep_index else '   '}{k}/{n} {e['title']}" for k, e in enumerate(course['episodes'], 1))
    desc = (f"Day {ep_index} of {n}: {script['teaches_line']}\n\n{course['promise']}\n\n{eps}\n\n"
            "Fictional chats. Made with AI: the narration is the creator's own performance converted to a designed AI voice, the drawings are generated; the footage is licensed stock.\n"
            "#texting #textingtips #psychology #communication #relationships #shorts")
    tags = ['texting', 'text messages', 'texting psychology', 'how to read texts', 'left on read', 'communication skills',
            'relationships', 'dating advice', 'body language of texting', 'micro course', 'seven days to', series.lower()]
    return '\n'.join([
        'TITLE', title, '', 'DESCRIPTION', desc, '', 'TAGS', ', '.join(tags), '', 'PLAYLIST', f'Seven Days To read any text ({series})', '',
        'PINNED COMMENT', script['pinned'], '', 'WHEN UPLOADING',
        '- Altered or synthetic content: Yes', "- Audience: No, it's not made for kids", '- Language: English; upload the .srt as subtitles',
        '- Post between 6 and 9 PM US Eastern', f'- Thumbnail: the frame where A and B are on screen ({ep["slug"]}_cover.png)', ''])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('episode', type=Path, help='episode folder, e.g. courses/texting-decoded/episodes/01-ok-period')
    ap.add_argument('--engine', choices=ENGINES, default='voxcpm', help='narration engine (default voxcpm)')
    ap.add_argument('--takes', type=int, default=2, help='narration takes per phrase (default 2)')
    ap.add_argument('--voice-only', action='store_true', help='make and score the narration, then stop')
    ap.add_argument('--sample', help='beats to hear, e.g. 1,4,9: make their narration once, write takes/<engine>/sample_<engine>.mp3, stop')
    ap.add_argument('--rescore', action='store_true', help='score the takes again (default: reuse takes/<engine>/picks.json)')
    ap.add_argument('--recording', type=Path, help='your own read of the whole episode (one voice note); converted to the narrator, phrases cut by the words')
    ap.add_argument('--accent', choices=['us'], help='with --recording: an American voice says the words with your timing and intonation, then it is converted to the narrator')
    ap.add_argument('--cover-at', type=float, help='seconds into the episode for the cover frame (default: the test)')
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
    lines = phrase_lines(beats)
    takes_dir = ep_dir / 'takes' / args.engine

    if args.sample:
        wanted = {int(x) for x in args.sample.split(',')}
        sel = [ln for ln in lines if ln['beat'] in wanted]
        make_takes(sel, takes_dir, narrator_dir, narrator, 1, args.engine)
        picks = pick_takes(sel, takes_dir, narrator_dir / narrator['identity'])
        write_sample(ep_dir, takes_dir, lines, picks, wanted, args.engine)
        return

    if args.recording:
        args.engine = 'recorded_us' if args.accent == 'us' else 'recorded'
        takes_dir = ep_dir / 'takes' / args.engine
        picks = recorded_takes(ep_dir, args.recording, lines, narrator_dir, narrator, accent=args.accent)
    else:
        make_takes(lines, takes_dir, narrator_dir, narrator, args.takes, args.engine)
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
    print(f'{ep_dir.name}: {duration:.1f} s, {len(words)} words, {len(draws)} drawings, {len(sfx)} sounds, engine {args.engine}')
    stem = ep_dir.name
    clip_uses = extract_clips(ep_dir, course_dir, script.get('clips', {}), timeline, draws)
    cfg = dict(fps=FPS, duration=duration, kit=kit, sticker=kit['sticker'].replace('n/', f'{ep_index}/').replace('/7', f'/{len(course["episodes"])}'),
               threads=script.get('threads', {}), beats=timeline, draws=draws, words=words, pages=pages, draw_seconds=DRAW_SECONDS,
               clips=clip_uses)
    cfg_path = ep_dir / 'config.json'
    cfg_path.write_text(json.dumps(cfg))
    silent = ep_dir / '_tmp_silent.mp4'
    subprocess.run(['node', str(ROOT / 'courses' / 'render.cjs'), str(cfg_path), str(silent)], check=True)
    mix = mix_audio(ep_dir, takes_dir, timeline, picks, sfx, duration)
    out = ep_dir / f'{stem}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(silent), '-i', str(mix), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-aac_pns', '0', '-t', str(duration), '-movflags', '+faststart', str(out)], check=True)
    test_beat = next((tb for tb in timeline if tb['scene'].get('type') == 'test'), timeline[-1])
    cover_at = args.cover_at if args.cover_at is not None else test_beat['start'] + 1.2
    subprocess.run(['node', str(ROOT / 'courses' / 'render.cjs'), str(cfg_path), str(ep_dir / f'{stem}_cover.png'), '--frame', str(cover_at)], check=True)
    srt(words, pages, ep_dir / f'{stem}.srt')
    (ep_dir / 'upload.txt').write_text(upload_text(course, ep_index, ep, script))
    silent.unlink()
    shutil.rmtree(ep_dir / '_tmp', ignore_errors=True)
    print(f'wrote {out.name}, {stem}_cover.png, {stem}.srt, upload.txt')


if __name__ == '__main__':
    main()
