"""The full Short: three presenter clips (her own lip-synced Veo audio), three animation clips with narration
in her cloned voice, Mrs Claus's own line, score, captions, and a title card.
Writes upload/one-night-short.mp4 and upload/captions-en.srt. Run with an env that has numpy, scipy, soundfile, faster-whisper."""
import json, pathlib, subprocess, re
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, lfilter
root = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
def dur(p): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True).stdout)
ORDER = ['A1', 'B1', 'A2', 'B2', 'B3', 'A3']
LEN = {c: dur(root/'src'/f'{c}.mp4') for c in ORDER}
START, t0 = {}, 0.0
for c in ORDER: START[c] = t0; t0 += LEN[c]
TITLE_LEN = 1.4
DUR = t0 + TITLE_LEN
HER = (START['B3'] + 11.73, START['B3'] + 13.21)        # Mrs Claus speaks inside B3
SUB = (START['B3'] + 12.45, START['B3'] + LEN['B3'])    # Veo's burned-in subtitle in B3
nar = {r['id']: r for r in json.load(open(root/'vo/takes/her/report.json'))}
nar_text = {l['id']: l['text'] for l in json.load(open(root/'vo/narration_her.json'))}

# ------------------------------------------------------------------ where the narration sits
placed = {}
def put(lid, at): placed[lid] = at - nar[lid]['words'][0]['s']
def end(lid): return placed[lid] + nar[lid]['words'][-1]['e']
put('H1', START['B1'] + 0.7)
iw = [i for i, w in enumerate(nar['H2']['words']) if w['w'].lower().startswith('light')][-1]
put('H2', START['B1'] + 13.55 - (nar['H2']['words'][iw]['s'] - nar['H2']['words'][0]['s']))     # "light" as the stars streak
put('H3', START['B2'] + 0.6)
put('H4', end('H3') + 0.7)
put('H5', START['B3'] + 0.5)
assert end('H1') < placed['H2'] + nar['H2']['words'][0]['s'] - 0.3, 'B1 narration overlaps'
assert end('H4') < START['B3'] - 0.3 and end('H5') < HER[0] - 2.0

# ------------------------------------------------------------------ captions from the actual spoken words
from faster_whisper import WhisperModel
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
def clip_words(c):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root/'src'/f'{c}.mp4'), '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32)
    return [{'w': w.word.strip(), 's': w.start, 'e': w.end} for s in asr.transcribe(a, language='en', beam_size=5, word_timestamps=True)[0] for w in s.words]
DISPLAY = {'kilometers': 'km', 'kilometres': 'km', 'six': '6', 'nine': '9', 'twenty-three': '23', 'eight': '800'}
def phrase(words, at, who):
    out, cur = [], []
    sent_end = [i for i, w in enumerate(words) if w['w'].endswith(('.', ',', '?')) or i == len(words) - 1]
    breaks, start = set(), 0
    for i in sent_end:
        n = i - start + 1; parts = -(-n//4); size = -(-n//parts)
        for j in range(start + size - 1, i, size): breaks.add(j)
        breaks.add(i); start = i + 1
    for i, w in enumerate(words):
        cur.append(w)
        if i in breaks:
            toks = []
            for x in cur:
                key = re.sub(r'[^\w-]', '', x['w'].lower()); tail = x['w'][len(x['w'].rstrip('.,?')):]
                if key == 'hundred': continue
                toks.append(DISPLAY[key] + tail if key in DISPLAY else x['w'])
            out.append({'t0': at + cur[0]['s'], 't1': at + cur[-1]['e'], 'text': ' '.join(toks), 'who': who})
            cur = []
    return out
# hand-set phrases: (text on screen, how many spoken words it covers); falls back to automatic if Whisper splits differently
PHRASES = {
 'A1': [('Santa has one night.', 4), ('Physics says it could', 4), ('cost him 23 years.', 4)],
 'A2': [('Fly that fast,', 3), ('and every second on his watch', 6), ('is 9 hours at home.', 5)],
 'A3': [('For him, it was one night.', 6), ('For her, it was a lifetime.', 6)],
 'H1': [('Midnight to 6.', 3), ('Nearly 800 km a second.', 5)],
 'H2': [('Now push him close', 4), ('to the speed of light.', 5)],
 'H3': [('Einstein showed that', 3), ('the faster you move,', 4), ('the slower your clock ticks.', 5)],
 'H4': [('He lives one night.', 4), ('The North Pole', 3), ('lives 23 years.', 3)],
 'H5': [('He lands at 6', 4), ('in the morning.', 3), ('Right on time.', 3)]}
def phrased(key, words, at, who):
    spec = PHRASES.get(key)
    if not spec or sum(n for _, n in spec) != len(words):
        print('automatic captions for', key, len(words), [w['w'] for w in words]); return phrase(words, at, who)
    out, i = [], 0
    for txt, n in spec:
        out.append({'t0': at + words[i]['s'], 't1': at + words[i + n - 1]['e'], 'text': txt, 'who': who}); i += n
    return out
caps = []
for c in ('A1', 'A2', 'A3'): caps += phrased(c, clip_words(c), START[c], 'presenter')
for lid in placed: caps += phrased(lid, nar[lid]['words'], placed[lid], 'narrator')
caps.append({'t0': HER[0], 't1': SUB[1], 'text': 'You were gone one night.', 'who': 'her'})
caps.sort(key=lambda c: c['t0'])
for a, b in zip(caps, caps[1:]): a['t1'] = min(max(a['t1'], a['t0'] + 0.7), b['t0'])
def ts_ass(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
def ts_srt(t): ms = int(round(t*1000)); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 0", "", "[V4+ Styles]",
 "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
 "Style: Cap,Inter SemiBold,78,&H00F2F7FB,&H00FFFFFF,&H00141414,&H96000000,0,0,0,0,100,100,0,0,1,3.6,2.4,2,80,80,250,1",
 "Style: Her,Inter Medium,74,&H00CFE9FF,&H00FFFFFF,&H00141414,&H96000000,0,1,0,0,100,100,0,0,1,3.6,2.4,2,80,80,250,1",
 "Style: Title,Inter SemiBold,92,&H00F2F7FB,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,22,0,1,0,0,5,60,60,0,1",
 "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for c in caps: ass.append(f"Dialogue: 0,{ts_ass(c['t0'])},{ts_ass(c['t1'])},{'Her' if c['who'] == 'her' else 'Cap'},,0,0,0,,{{\\fad(60,80)}}{c['text']}")
ass.append(f"Dialogue: 0,{ts_ass(DUR - TITLE_LEN + 0.1)},{ts_ass(DUR)},Title,,0,0,0,,{{\\fad(300,0)}}ONE NIGHT")
(root/'build/captions_full.ass').write_text('\n'.join(ass) + '\n')
(root/'upload/captions-en.srt').write_text('\n'.join(f"{i+1}\n{ts_srt(c['t0'])} --> {ts_srt(c['t1'])}\n{c['text']}\n" for i, c in enumerate(caps)))

# ------------------------------------------------------------------ sound
N = int(DUR*SR) + 1; t = np.arange(N)/SR
def lp(x, fc): return sosfilt(butter(2, fc, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc): return sosfilt(butter(2, fc, 'high', fs=SR, output='sos'), x, axis=0)
def peq(x, f0, g, q=0.8):
    A_ = 10**(g/40); w = 2*np.pi*f0/SR; al = np.sin(w)/(2*q)
    return lfilter(np.array([1 + al*A_, -2*np.cos(w), 1 - al*A_])/(1 + al/A_), np.array([1, -2*np.cos(w)/(1 + al/A_), (1 - al/A_)/(1 + al/A_)]), x, axis=0)
def ir(sec, damp, seed):
    g = np.random.default_rng(seed); L = int(sec*SR); tt = np.arange(L)/SR
    x = lp(g.standard_normal((L, 2))*np.exp(-tt*6.9/sec)[:, None], damp); x[:int(0.01*SR)] *= np.linspace(0, 1, int(0.01*SR))[:, None]
    return x/np.sqrt((x**2).sum()/2)
def reverb(x, imp, wet): return x*(1 - wet) + np.stack([fftconvolve(x[:, i], imp[:, i])[:len(x)] for i in range(2)], 1)*wet
def place(buf, sig, at, gain=1.0):
    if sig.ndim == 1: sig = np.stack([sig, sig], 1)
    i = int(round(at*SR)); L = min(len(sig), N - i)
    if L > 0: buf[i:i+L] += gain*sig[:L]
def win(a, b, f=0.12): return (np.clip((t - a)/f, 0, 1)*np.clip((b - t)/f, 0, 1))[:, None]
def speech_norm(x, target=0.11): return x/np.sqrt(np.mean(x[np.abs(x) > 0.01]**2) + 1e-9)*target
def voice_chain(x): x = hp(x, 80); x = peq(x, 180, 1.0); x = peq(x, 3500, 1.5, 1.0); return x
def clip_audio(c):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root/'src'/f'{c}.mp4'), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    f = int(0.015*SR); a[:f] *= np.linspace(0, 1, f)[:, None]; a[-f:] *= np.linspace(1, 0, f)[:, None]
    return a
voice = np.zeros((N, 2)); amb = np.zeros((N, 2))
for c in ('A1', 'A2', 'A3'): place(voice, speech_norm(voice_chain(clip_audio(c))), START[c])      # her, on camera
for c in ('B1', 'B2', 'B3'):
    a = clip_audio(c)
    if c == 'B1': a[:int(0.95*SR)] *= np.linspace(0, 1, int(0.95*SR))[:, None]**3
    place(amb, a, START[c])
her_mask = win(HER[0] - 0.25, HER[1] + 0.35)
amb = amb*(0.42*(1 - her_mask) + 1.2*her_mask)
for lid, at in placed.items():
    x, sr = sf.read(root/'vo/takes/her'/f'{lid}.wav')
    if x.ndim > 1: x = x.mean(1)
    place(voice, speech_norm(voice_chain(resample_poly(x, SR, sr))), at)
voice = reverb(voice, ir(0.5, 6500, 2), 0.04)
e = np.convolve(np.abs(voice[:, 0]), np.ones(int(0.02*SR))/int(0.02*SR), 'same')
voice *= np.where(e > 0.06, (0.06 + (e - 0.06)*0.4)/np.maximum(e, 1e-9), 1.0)[:, None]
# score
NOTE = lambda n: 440*2**((n - 69)/12)
def env(n, a, d):
    e = np.ones(n); na = max(1, int(a*SR)); e[:na] = np.linspace(0, 1, na)**1.5; e[int(d*SR):] = np.linspace(1, 0, n - int(d*SR))**2; return e
def organ(f, d, a=0.3, r=1.0):
    n = int((d + r)*SR); tt = np.arange(n)/SR; s = np.zeros((n, 2))
    for k, (h, amp) in enumerate([(0.5, .5), (1, 1), (2, .6), (3, .25), (4, .25), (6, .1)]):
        ph = 2*np.pi*f*h*np.cumsum(1 + 0.004*np.sin(2*np.pi*5.6*tt))/SR; s[:, 0] += amp*np.sin(ph + k); s[:, 1] += amp*np.sin(ph*1.0015 + 2*k)
    return s*env(n, a, d)[:, None]*0.1
def strings(f, d, a=1.2, r=1.8):
    n = int((d + r)*SR); tt = np.arange(n)/SR; s = np.zeros((n, 2))
    for v in range(5):
        ph = 2*np.pi*f*(1 + (v - 2)*0.0035)*np.cumsum(1 + 0.003*np.sin(2*np.pi*(5 + 0.3*v)*tt + v))/SR
        s[:, v % 2] += sum(np.sin(k*ph)/k for k in range(1, int(4500/f)))*0.45
    return lp(s, 2200)*env(n, a, d)[:, None]*0.05
music = np.zeros((N, 2))
def chord(fn, notes, at, d, g=1.0, **kw):
    for m in notes: place(music, fn(NOTE(m), d, **kw), at, g)
A1, B1, A2, B2, B3, A3 = (START[c] for c in ORDER)
chord(organ, [33, 45, 52], A1, LEN['A1'], 0.35, a=1.5, r=0.3)                                       # under her hook: a low A
for i, (ch, a, d) in enumerate([([45, 57, 60, 64], 0.0, 3.8), ([41, 53, 57, 60], 3.8, 3.8), ([48, 55, 60, 64], 7.6, 3.6), ([43, 55, 59, 62], 11.2, 3.84)]):
    chord(organ, ch, B1 + a, d, 0.5 + 0.15*i, a=0.4 if i == 0 else 0.1, r=0.4)
    chord(strings, [m + 12 for m in ch[1:]], B1 + a, d, 0.35 + 0.2*i, a=0.8, r=0.4)
i0, i1 = int((B1 + 10.0)*SR), int((A2 + 0.3)*SR); tt = np.arange(i1 - i0)/SR; sh = np.zeros(i1 - i0)
for k in range(6):
    pos = np.mod(k + tt*0.45, 6); sh += np.exp(-((pos - 3)**2)/2.9)*np.sin(np.cumsum(2*np.pi*40*2**pos/SR))
sh *= (tt/tt[-1])**1.4*0.09; sh[-int(0.03*SR):] *= np.linspace(1, 0, int(0.03*SR)); music[i0:i1] += np.stack([sh, sh], 1)
chord(strings, [57, 64, 69], A2, LEN['A2'], 0.4, a=0.3, r=0.4)                                       # under her explanation: held
for ch, a, d in [([45, 57, 64, 69], 0.0, 5.0), ([41, 53, 60, 65], 5.0, 5.0), ([40, 52, 56, 59, 64], 10.0, 5.04)]:
    chord(strings, [m + 12 for m in ch], B2 + a, d, 0.8, a=1.0, r=0.3); chord(organ, ch[:3], B2 + a, d, 0.45, a=0.6, r=0.3)
c0 = int(B3*SR); f = int(0.02*SR); music[c0:c0 + f] *= np.linspace(1, 0, f)[:, None]; music[c0 + f:] = 0          # the landing: silence
chord(strings, [53, 60, 65, 69], B3 + 6.5, HER[0] - 0.5 - (B3 + 6.5), 0.5, a=1.8, r=0.6)
chord(strings, [53, 60, 65], A3, LEN['A3'] - 0.2, 0.35, a=1.0, r=0.3)
chord(organ, [45, 57, 61, 64, 69], A3 + LEN['A3'] - 0.4, TITLE_LEN + 0.2, 0.5, a=0.5, r=0.3)                       # the title: a soft A major
chord(strings, [69, 73, 76], A3 + LEN['A3'] - 0.3, TITLE_LEN + 0.1, 0.45, a=0.5, r=0.3)
music = reverb(music, ir(3.0, 5000, 1), 0.3)
venv = np.convolve(np.abs(voice[:, 0]), np.ones(int(0.25*SR))/int(0.25*SR), 'same')
duck = (1 - 0.62*np.clip(venv/0.04, 0, 1))[:, None]
mix = music*0.9*duck*(1 - her_mask*0.9) + amb*(0.55 + 0.45*duck) + voice*1.3
fd = int(0.6*SR); mix[-fd:] *= np.linspace(1, 0, fd)[:, None]**1.5
mix = np.tanh(mix*1.05)/np.tanh(1.05); mix *= 0.8/np.abs(mix).max()
sf.write(root/'build/mix_full_raw.wav', mix, SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'build/mix_full_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', str(root/'build/mix_full.wav')], check=True)

# ------------------------------------------------------------------ picture
x, y, w, h = 392, 1590, 500, 92
ins = []
for c in ORDER: ins += ['-i', str(root/'src'/f'{c}.mp4')]
ins += ['-f', 'lavfi', '-i', f'color=c=black:s=720x1280:r=24:d={TITLE_LEN}']
fc = ("".join(f"[{i}:v]settb=AVTB,fps=24,format=yuv420p[v{i}];" for i in range(7)) +
      "".join(f"[v{i}]" for i in range(7)) + "concat=n=7:v=1:a=0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0,split[base][strip];"
      f"[strip]crop={w}:{h}:{x}:{y},boxblur=20:2,format=yuva420p,geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='255*clip(min(min(X,W-X),min(Y,H-Y))/14,0,1)'[soft];"
      f"[base][soft]overlay={x}:{y}:enable='between(t,{SUB[0]:.2f},{SUB[1]:.2f})',"
      f"ass={root/'build/captions_full.ass'}:fontsdir=/usr/share/fonts/opentype/inter[v]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *ins, '-i', str(root/'build/mix_full.wav'), '-filter_complex', fc, '-map', '[v]', '-map', '7:a',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '24',
                '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                '-c:a', 'aac', '-b:a', '192k', '-t', f'{DUR:.3f}', '-movflags', '+faststart', str(root/'upload/one-night-short.mp4')], check=True)
json.dump({'start': START, 'len': LEN, 'narration': placed, 'captions': caps, 'duration': DUR}, open(root/'build/timeline_full.json', 'w'), indent=1)
print('done', round(DUR, 2), 's')
for c in caps: print(f"  {c['t0']:6.2f}-{c['t1']:6.2f}  [{c['who'][:3]}] {c['text']}")
