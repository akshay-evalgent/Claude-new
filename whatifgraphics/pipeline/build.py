#!/usr/bin/env python3
"""Build pipeline for a whatifgraphics episode.

  build.py script   --episode DIR   -> DIR/script.md from DIR/shots.js
  build.py audio    --episode DIR   -> DIR/build/voice/*.mp3 + word timings, DIR/build/timings.json
  build.py assemble --episode DIR   -> DIR/output/<name>.mp4 + .srt
"""
import argparse, asyncio, json, math, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100

def load_shots(ep):
    out = subprocess.run(['node', '-e', f"console.log(JSON.stringify(require('{os.path.join(ep,'shots.js')}')))"], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

# ───────────────────────── script.md ─────────────────────────
def cmd_script(ep, build):
    data = load_shots(ep); shots = data['shots']; meta = data['meta']
    lines = [f"# {meta['title']}", '', f"Channel: {meta.get('channel','whatifgraphics')}  ·  {meta.get('format','animated, second person')}  ·  Voice: {meta.get('voice')}", '']
    words = 0; n = 0
    for s in shots:
        if s.get('act'): lines += ['', f"## Act {s['act']} — {s['title']}", '']
        n += 1; words += len(s['n'].split())
        vis = f"{s.get('bg','')}"
        if s.get('card'): vis += f" · card: \"{s['card'][0].replace(chr(10),' / ')}\""
        lines += [f"**{n:02d}.** {s['n']}  ", f"<sub>visual: {vis}</sub>", '']
    lines += ['', '---', f"Shots: {n}  ·  Words: {words}  ·  Estimated runtime at ~150 wpm: {int(words/150*60)} s"]
    open(os.path.join(ep, 'script.md'), 'w').write('\n'.join(lines))
    print(f"script.md written: {n} shots, {words} words")

# ───────────────────────── audio (narration) ─────────────────────────
def dur_of(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip() or 0)

async def tts_all(shots, voice, rate, vdir):
    import edge_tts
    sem = asyncio.Semaphore(3)
    async def one(i, s):
        p = os.path.join(vdir, f'v{i:03d}.mp3'); pj = p[:-4] + '.json'
        if os.path.exists(p) and os.path.getsize(p) > 1000 and os.path.exists(pj): return
        async with sem:
            for attempt in range(5):
                try:
                    com = edge_tts.Communicate(s['n'], voice, rate=rate, boundary='WordBoundary')
                    words = []
                    with open(p, 'wb') as f:
                        async for chunk in com.stream():
                            if chunk['type'] == 'audio': f.write(chunk['data'])
                            elif chunk['type'] == 'WordBoundary': words.append({'t': round(chunk['offset'] / 1e7, 3), 'd': round(chunk['duration'] / 1e7, 3), 'text': chunk['text']})
                    if os.path.getsize(p) > 1000:
                        json.dump(words, open(pj, 'w')); return
                except Exception as e:
                    print(f'  retry {i} ({e})'); await asyncio.sleep(2 + attempt * 2)
            raise RuntimeError(f'tts failed for shot {i}')
    await asyncio.gather(*[one(i, s) for i, s in enumerate(shots)])

def cmd_audio(ep, build):
    data = load_shots(ep); shots = data['shots']; meta = data['meta']
    vdir = os.path.join(build, 'voice'); os.makedirs(vdir, exist_ok=True)
    asyncio.run(tts_all(shots, meta['voice'], meta.get('rate', '+4%'), vdir))
    LEAD, PAD = meta.get('lead', 0.35), meta.get('pad', 0.55)
    t = 0.0; out = []
    for i, s in enumerate(shots):
        p = os.path.join(vdir, f'v{i:03d}.mp3'); d = dur_of(p)
        words = json.load(open(p[:-4] + '.json'))
        # mark words followed by sentence punctuation so captions can break there
        text = s['n']; pos = 0
        for w in words:
            k = text.find(w['text'], pos)
            if k >= 0:
                pos = k + len(w['text'])
                w['p'] = pos < len(text) and text[pos] in '.?!,;:'
        lead = s.get('lead', LEAD)
        dur = lead + d + s.get('pad', PAD)
        out.append({'i': i, 'start': round(t, 3), 'dur': round(dur, 3), 'audioStart': round(t + lead, 3), 'audioDur': round(d, 3), 'audio': p,
                    'words': [{'t': round(w['t'] + lead, 3), 'd': w['d'], 'text': w['text'], 'p': bool(w.get('p'))} for w in words]})
        t += dur
    timings = {'fps': meta.get('fps', 24), 'total': round(t, 3), 'shots': out}
    json.dump(timings, open(os.path.join(build, 'timings.json'), 'w'), indent=1)
    print(f"timings: {len(out)} shots, total {int(t//60)}m{t%60:04.1f}s")

# ───────────────────────── music + sfx ─────────────────────────
def note(f, n, decay=None, harm=(1, 0.35, 0.12)):
    t = np.arange(n) / SR; y = np.zeros(n)
    for k, a in enumerate(harm): y += a * np.sin(2 * np.pi * f * (k + 1) * t)
    if decay: y *= np.exp(-t / decay)
    return y

def lowpass(x, alpha=0.08):
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += alpha * (x[i] - acc); y[i] = acc
    return y

def music(total, mood, style='lofi'):
    n = int(total * SR); out = np.zeros(n)
    bpm = 82 if style == 'lofi' else 70; beat = 60 / bpm; bar = beat * 4
    base = 130.81
    prog_major = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]]
    prog_minor = [[9, 12, 16, 19], [5, 9, 12, 16], [0, 4, 7, 11], [4, 7, 11, 14]]
    prog_tense = [[9, 12, 16], [9, 12, 17], [8, 12, 16], [9, 12, 16]]   # Am, Am/F, Fraug-ish, Am
    nb = int(math.ceil(total / bar))
    for b in range(nb):
        s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR)); L = s1 - s0
        if L <= 0: break
        m = mood(b * bar)
        chord = (prog_tense if style == 'tense' else prog_minor if m > 0.5 else prog_major)[b % 4]
        env = np.minimum(1, np.arange(L) / (SR * 0.9)) * np.minimum(1, (L - np.arange(L)) / (SR * 0.6))
        pad = sum(note(base * 2 ** (st / 12), L, harm=(1, 0.2)) + note(base * 2 ** (st / 12) * 1.003, L, harm=(0.6,)) for st in chord)
        out[s0:s1] += (0.06 if style == 'tense' else 0.045) * env * pad
        if style == 'tense':
            # low pulse on every beat, rising intensity with mood
            for k in range(4):
                p0 = s0 + int(k * beat * SR); pl = int(0.3 * SR)
                if p0 + pl > n: continue
                tt = np.arange(pl) / SR
                out[p0:p0 + pl] += (0.10 + 0.08 * m) * np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 9)
            # sparse high tick on the off-beats
            for k in (1, 3):
                p0 = s0 + int(k * beat * SR); pl = int(0.08 * SR)
                if p0 + pl > n: continue
                out[p0:p0 + pl] += 0.05 * note(base * 2 ** (24 / 12) * 2, pl, decay=0.03, harm=(1,))
        else:
            for k in range(8):
                if m > 0.5 and k % 2: continue
                st = chord[k % 4] + 12 + (12 if k >= 4 else 0)
                p0 = s0 + int(k * beat / 2 * SR); pl = int(0.5 * SR)
                if p0 + pl > n: pl = n - p0
                if pl <= 0: continue
                out[p0:p0 + pl] += 0.08 * (0.6 if m > 0.5 else 1) * note(base * 2 ** (st / 12), pl, decay=0.22, harm=(1, 0.3))
            for k in (0, 2):
                p0 = s0 + int(k * beat * SR); pl = int(0.18 * SR)
                if p0 + pl > n: continue
                tt = np.arange(pl) / SR
                out[p0:p0 + pl] += 0.12 * np.sin(2 * np.pi * (60 + 80 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18)
            rng = np.random.default_rng(b)
            for k in (1, 3):
                p0 = s0 + int(k * beat * SR); pl = int(0.05 * SR)
                if p0 + pl > n: continue
                out[p0:p0 + pl] += 0.012 * rng.standard_normal(pl) * np.exp(-np.arange(pl) / SR * 90)
    return out

def sfx_pop(dark=False):
    L = int(0.12 * SR); t = np.arange(L) / SR
    f0 = 260 if dark else 620; f1 = 180 if dark else 1100
    return 0.35 * np.sin(2 * np.pi * (f0 + (f1 - f0) * (1 - np.exp(-t * 40))) * t) * np.exp(-t * 28)

def sfx_whoosh():
    L = int(0.35 * SR); t = np.arange(L) / SR
    rng = np.random.default_rng(7); n = rng.standard_normal(L)
    return 0.22 * lowpass(n, 0.25) * np.sin(np.pi * t / t[-1]) ** 2

def sfx_speech():
    L = int(0.1 * SR); t = np.arange(L) / SR
    return 0.25 * np.sin(2 * np.pi * 440 * t) * np.exp(-t * 40) + 0.2 * np.sin(2 * np.pi * 660 * t) * np.exp(-t * 60)

def sfx_tick():
    L = int(0.09 * SR); t = np.arange(L) / SR
    return 0.4 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 60) + 0.25 * np.sin(2 * np.pi * 900 * t) * np.exp(-t * 40)

def sfx_blackout():
    L = int(0.25 * SR); t = np.arange(L) / SR
    return 0.3 * np.sin(2 * np.pi * 90 * t) * np.exp(-t * 14)

def sfx_heartbeat():
    L = int(0.5 * SR); t = np.arange(L) / SR
    y = np.sin(2 * np.pi * 50 * t) * np.exp(-t * 20) + 0.7 * np.sin(2 * np.pi * 45 * (t - 0.18).clip(0)) * np.exp(-(t - 0.18).clip(0) * 20) * (t > 0.18)
    return 0.35 * y

def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def add(mix, y, at):
    s = int(at * SR); e = min(len(mix), s + len(y))
    if s < len(mix) and e > s: mix[s:e] += y[:e - s]

def cmd_assemble(ep, build):
    data = load_shots(ep); shots = data['shots']; meta = data['meta']
    timings = json.load(open(os.path.join(build, 'timings.json')))
    fps = timings['fps']; total = timings['total'] + 1.0
    n = int(total * SR)
    voice = np.zeros(n); sfx = np.zeros(n)
    for s, tm in zip(shots, timings['shots']):
        add(voice, decode(tm['audio']), tm['audioStart'])
        for b in s.get('bubbles', []) or []:
            o = b[2] if len(b) > 2 and b[2] else {}
            add(sfx, sfx_speech() if o.get('kind') == 'speech' else sfx_pop(o.get('dark')), tm['start'] + o.get('at', 0))
        if s.get('card'):
            o = s['card'][1] if len(s['card']) > 1 else {}
            add(sfx, sfx_whoosh(), tm['start'] + max(0, o.get('at', 0) - 0.1))
        for p in s.get('props', []) or []:
            o = p[3] if len(p) > 3 and p[3] else {}
            if p[0] == 'clock': add(sfx, sfx_tick(), tm['start'] + o.get('at', 0))
            if p[0] in ('callout', 'gauge'): add(sfx, sfx_pop(), tm['start'] + o.get('at', 0))
        for f in s.get('flash', []) or []:
            add(sfx, sfx_blackout(), tm['start'] + f['at'])
        for h in s.get('heartbeats', []) or []:
            add(sfx, sfx_heartbeat(), tm['start'] + h)
    act_starts = {}
    for s, tm in zip(shots, timings['shots']):
        if s.get('act'): act_starts[s['act']] = tm['start']
    def mood(t):
        if meta.get('music') == 'tense': return min(1.0, t / max(total, 1))
        a = max([k for k, v in act_starts.items() if v <= t] or [1])
        return 1.0 if a == 4 else 0.0
    mus = music(total, mood, meta.get('music', 'lofi'))
    env = np.abs(voice); k = int(0.08 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    duck = 1 - 0.55 * np.clip(env / (env.max() + 1e-9) * 8, 0, 1)
    duck = np.convolve(duck, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode='same')
    mix = voice * 0.95 + mus * meta.get('musicLevel', 0.4) * duck + sfx * 0.6
    f = int(1.0 * SR); mix[-f:] *= np.linspace(1, 0, f)
    mix = mix / np.abs(mix).max() * 0.92
    wav = os.path.join(build, 'mix.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
    seq = os.path.join(build, 'seq'); os.makedirs(seq, exist_ok=True)
    for fn in os.listdir(seq): os.unlink(os.path.join(seq, fn))
    k = 0; missing = 0
    for tm in timings['shots']:
        for fr in range(round(tm['dur'] * fps)):
            src = os.path.join(build, 'frames', f"s{tm['i']:03d}_{fr:05d}.jpg")
            if not os.path.exists(src): missing += 1; continue
            os.symlink(src, os.path.join(seq, f'f{k:06d}.jpg')); k += 1
    print(f'{k} frames in sequence, {missing} missing')
    out = os.path.join(ep, 'output'); os.makedirs(out, exist_ok=True)
    name = meta.get('slug', 'episode')
    mp4 = os.path.join(out, f'{name}.mp4')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(fps), '-i', os.path.join(seq, 'f%06d.jpg'), '-i', wav,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', str(fps),
                    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4], check=True)
    def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
    srt = [f"{i+1}\n{ts(tm['audioStart'])} --> {ts(tm['audioStart'] + tm['audioDur'])}\n{s['n']}\n" for i, (s, tm) in enumerate(zip(shots, timings['shots']))]
    open(os.path.join(out, f'{name}.srt'), 'w').write('\n'.join(srt))
    print('wrote', mp4)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['script', 'audio', 'assemble']); ap.add_argument('--episode', required=True)
    a = ap.parse_args(); ep = os.path.abspath(a.episode); build = os.path.join(ep, 'build'); os.makedirs(build, exist_ok=True)
    {'script': cmd_script, 'audio': cmd_audio, 'assemble': cmd_assemble}[a.cmd](ep, build)
