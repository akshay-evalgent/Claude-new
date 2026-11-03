#!/usr/bin/env python3
"""Build pipeline for a whatifgraphics episode.

  build.py script    -> writes ../script.md from shots.js
  build.py audio     -> narration via edge-tts, writes build/timings.json
  build.py assemble  -> music + sfx mix, frame sequence, ffmpeg encode, SRT
"""
import asyncio, json, math, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.environ.get('BUILD_DIR', os.path.join(ROOT, 'build'))
os.makedirs(BUILD, exist_ok=True)
SR = 44100

def load_shots():
    out = subprocess.run(['node', '-e', f"console.log(JSON.stringify(require('{HERE}/shots.js')))"], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)

# ───────────────────────── script.md ─────────────────────────
def cmd_script():
    data = load_shots(); shots = data['shots']; meta = data['meta']
    lines = [f"# {meta['title']}", '', f"Channel: {meta['channel']}  ·  Format: animated what-if, second person, ~10:40  ·  Voice: single narrator, conversational", '']
    words = 0; n = 0
    for s in shots:
        if s.get('act'):
            lines += ['', f"## Act {s['act']} — {s['title']}", '']
        n += 1; words += len(s['n'].split())
        vis = f"{s.get('bg','')}"
        if s.get('card'): vis += f" · card: \"{s['card'][0].replace(chr(10),' / ')}\""
        lines.append(f"**{n:02d}.** {s['n']}  ")
        lines.append(f"<sub>visual: {vis}</sub>")
        lines.append('')
    lines += ['', '---', f"Shots: {n}  ·  Words: {words}  ·  Estimated runtime at ~145 wpm: {words/145*60/60:.0f} min {int(words/145*60%60):02d} s"]
    open(os.path.join(ROOT, 'script.md'), 'w').write('\n'.join(lines))
    print(f"script.md written: {n} shots, {words} words")

# ───────────────────────── audio (narration) ─────────────────────────
def dur_of(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p], capture_output=True, text=True).stdout.strip() or 0)

async def tts_all(shots, voice):
    import edge_tts
    sem = asyncio.Semaphore(3)
    async def one(i, s):
        p = os.path.join(BUILD, 'voice', f'v{i:03d}.mp3')
        if os.path.exists(p) and os.path.getsize(p) > 1000: return
        async with sem:
            for attempt in range(5):
                try:
                    com = edge_tts.Communicate(s['n'], voice, rate='+4%')
                    await com.save(p);
                    if os.path.getsize(p) > 1000: return
                except Exception as e:
                    print(f'  retry {i} ({e})'); await asyncio.sleep(2 + attempt * 2)
            raise RuntimeError(f'tts failed for shot {i}')
    await asyncio.gather(*[one(i, s) for i, s in enumerate(shots)])

def cmd_audio():
    data = load_shots(); shots = data['shots']; meta = data['meta']
    os.makedirs(os.path.join(BUILD, 'voice'), exist_ok=True)
    asyncio.run(tts_all(shots, meta['voice']))
    LEAD, PAD = 0.35, 0.55
    t = 0.0; out = []
    for i, s in enumerate(shots):
        p = os.path.join(BUILD, 'voice', f'v{i:03d}.mp3'); d = dur_of(p)
        dur = LEAD + d + PAD + float(s.get('pad', 0))
        if s.get('card') and (s['card'][1].get('at', 0) if len(s['card']) > 1 else 0) > 0: pass
        out.append({'i': i, 'start': round(t, 3), 'dur': round(dur, 3), 'audioStart': round(t + LEAD, 3), 'audioDur': round(d, 3), 'audio': p})
        t += dur
    timings = {'fps': meta['fps'], 'total': round(t, 3), 'shots': out}
    json.dump(timings, open(os.path.join(BUILD, 'timings.json'), 'w'), indent=1)
    print(f"timings: {len(out)} shots, total {t/60:.0f}m{t%60:04.1f}s")

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

def music(total, mood):
    """Soft pad + pluck arpeggio. mood(t) in [0,1] = how dark; shifts to minor and quieter."""
    n = int(total * SR); out = np.zeros(n)
    bpm = 82; beat = 60 / bpm; bar = beat * 4
    base = 130.81  # C3
    prog_major = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]]      # Cmaj7 Am7 Fmaj7 G7
    prog_minor = [[9, 12, 16, 19], [5, 9, 12, 16], [0, 4, 7, 11], [4, 7, 11, 14]]       # Am7 Fmaj7 Cmaj7 Em7
    nb = int(math.ceil(total / bar))
    t_all = np.arange(n) / SR
    for b in range(nb):
        s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR)); L = s1 - s0
        if L <= 0: break
        m = mood(b * bar)
        chord = (prog_minor if m > 0.5 else prog_major)[b % 4]
        # pad
        env = np.minimum(1, np.arange(L) / (SR * 0.9)) * np.minimum(1, (L - np.arange(L)) / (SR * 0.6))
        pad = sum(note(base * 2 ** (st / 12), L, harm=(1, 0.2)) + note(base * 2 ** (st / 12) * 1.003, L, harm=(0.6,)) for st in chord)
        out[s0:s1] += 0.045 * env * pad
        # pluck arpeggio (8th notes) up an octave
        for k in range(8):
            if m > 0.5 and k % 2: continue
            st = chord[k % 4] + 12 + (12 if k >= 4 else 0)
            p0 = s0 + int(k * beat / 2 * SR); pl = int(0.5 * SR)
            if p0 + pl > n: pl = n - p0
            if pl <= 0: continue
            out[p0:p0 + pl] += 0.08 * (0.6 if m > 0.5 else 1) * note(base * 2 ** (st / 12), pl, decay=0.22, harm=(1, 0.3))
        # soft kick on 1 and 3
        for k in (0, 2):
            p0 = s0 + int(k * beat * SR); pl = int(0.18 * SR)
            if p0 + pl > n: continue
            tt = np.arange(pl) / SR
            out[p0:p0 + pl] += 0.12 * np.sin(2 * np.pi * (60 + 80 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 18)
        # hats on off-beats
        rng = np.random.default_rng(b)
        for k in (1, 3):
            p0 = s0 + int(k * beat * SR); pl = int(0.05 * SR)
            if p0 + pl > n: continue
            out[p0:p0 + pl] += 0.012 * rng.standard_normal(pl) * np.exp(-np.arange(pl) / SR * 90)
    return out

def sfx_pop(dark=False):
    L = int(0.12 * SR); t = np.arange(L) / SR
    f0 = 260 if dark else 620; f1 = 180 if dark else 1100
    y = np.sin(2 * np.pi * (f0 + (f1 - f0) * (1 - np.exp(-t * 40))) * t) * np.exp(-t * 28)
    return 0.35 * y

def sfx_whoosh():
    L = int(0.35 * SR); t = np.arange(L) / SR
    rng = np.random.default_rng(7); n = rng.standard_normal(L)
    env = np.sin(np.pi * t / t[-1]) ** 2
    return 0.22 * lowpass(n, 0.25) * env

def sfx_speech():
    L = int(0.1 * SR); t = np.arange(L) / SR
    return 0.25 * np.sin(2 * np.pi * 440 * t) * np.exp(-t * 40) + 0.2 * np.sin(2 * np.pi * 660 * t) * np.exp(-t * 60)

def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def add(mix, y, at):
    s = int(at * SR); e = min(len(mix), s + len(y))
    if s < len(mix) and e > s: mix[s:e] += y[:e - s]

def cmd_assemble():
    data = load_shots(); shots = data['shots']; meta = data['meta']
    timings = json.load(open(os.path.join(BUILD, 'timings.json')))
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
    # mood curve: act 4 is darker
    act_starts = {}
    for s, tm in zip(shots, timings['shots']):
        if s.get('act'): act_starts[s['act']] = tm['start']
    def mood(t):
        a = max([k for k, v in act_starts.items() if v <= t] or [1])
        return 1.0 if a == 4 else 0.0
    mus = music(total, mood)
    # duck music under voice
    env = np.abs(voice); k = int(0.08 * SR)
    env = np.convolve(env, np.ones(k) / k, mode='same')
    duck = 1 - 0.55 * np.clip(env / (env.max() + 1e-9) * 8, 0, 1)
    duck = np.convolve(duck, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode='same')
    mix = voice * 0.95 + mus * 0.4 * duck + sfx * 0.6
    # fade out tail
    f = int(1.5 * SR); mix[-f:] *= np.linspace(1, 0, f)
    peak = np.abs(mix).max(); mix = mix / peak * 0.92
    wav = os.path.join(BUILD, 'mix.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
    # frame sequence
    seq = os.path.join(BUILD, 'seq'); os.makedirs(seq, exist_ok=True)
    for fn in os.listdir(seq): os.unlink(os.path.join(seq, fn))
    k = 0; missing = 0
    for tm in timings['shots']:
        nf = round(tm['dur'] * fps)
        for f in range(nf):
            src = os.path.join(BUILD, 'frames', f"s{tm['i']:03d}_{f:05d}.jpg")
            if not os.path.exists(src): missing += 1; continue
            os.symlink(src, os.path.join(seq, f'f{k:06d}.jpg')); k += 1
    print(f'{k} frames in sequence, {missing} missing')
    out = os.path.join(ROOT, 'output'); os.makedirs(out, exist_ok=True)
    mp4 = os.path.join(out, 'whatifgraphics-ep01-hear-thoughts.mp4')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-stats', '-framerate', str(fps), '-i', os.path.join(seq, 'f%06d.jpg'), '-i', wav,
                    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', str(fps),
                    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4], check=True)
    # SRT
    def ts(x): h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60; return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
    srt = []
    for i, (s, tm) in enumerate(zip(shots, timings['shots'])):
        srt.append(f"{i+1}\n{ts(tm['audioStart'])} --> {ts(tm['audioStart'] + tm['audioDur'])}\n{s['n']}\n")
    open(os.path.join(out, 'whatifgraphics-ep01-hear-thoughts.srt'), 'w').write('\n'.join(srt))
    print('wrote', mp4)

if __name__ == '__main__':
    {'script': cmd_script, 'audio': cmd_audio, 'assemble': cmd_assemble}[sys.argv[1]]()
