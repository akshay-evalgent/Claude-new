"""Edit One Night from the three Flow clips: timeline, captions, mix and final render.
Run with the audio venv (numpy, scipy, soundfile). Writes one-night-short.mp4, captions.srt and build/timeline.json."""
import json, pathlib, subprocess, re
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, lfilter
root = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
CLIP = 15.04
B1, B2, B3 = 0.0, CLIP, 2*CLIP
END_HOLD = 5.0
DUR = 3*CLIP + END_HOLD
HER = (B3 + 11.73, B3 + 13.21)                 # Mrs Claus's own line inside B3, found by Whisper
SUB_ON = B3 + 12.45                             # when Veo's burned-in subtitle appears in B3
take = {r['id']: r for r in json.load(open(root/'vo/takes/af_heart/report.json'))}
text = {l['id']: l['text'] for l in json.load(open(root/'vo/lines.json'))}

# ------------------------------------------------------------------ the edit: where each narration line starts
placed = {}
def put(lid, at): placed[lid] = at - take[lid]['words'][0]['s']; return at
def end(lid): return placed[lid] + take[lid]['words'][-1]['e'] - 0.2
def word_at(lid, i): return placed[lid] + take[lid]['words'][i]['s']
put('N1', 0.45)
put('N2', end('N1') + 0.55)
w_light = [i for i, w in enumerate(take['N3']['words']) if w['w'].lower().startswith('light')][0]
put('N3', 13.55 - (take['N3']['words'][w_light]['s'] - take['N3']['words'][0]['s']))   # "light" lands as the stars streak
put('N4', B2 + 0.6)
put('N5', end('N4') + 0.6)
put('N6', end('N5') + 0.7)
put('N7', B3 + 0.5)
put('N8', 3*CLIP + 0.45)

# ------------------------------------------------------------------ captions: 2 to 4 words, numbers as digits
DISPLAY = {'twenty-three': '23', 'eight': '800', 'hundred': None, 'kilometres': 'km', 'nine': '9', 'six': '6'}
def chunks(lid):
    words = text[lid].split()
    ws = take[lid]['words']
    out, cur = [], []
    if len(words) != len(ws):               # fall back to proportional timing
        tot = ws[-1]['e'] - ws[0]['s']
        ws = [{'s': ws[0]['s'] + tot*i/len(words), 'e': ws[0]['s'] + tot*(i + 1)/len(words)} for i in range(len(words))]
    # break into sentences (and clauses), then split long ones into balanced chunks of at most 4 words
    breaks, start = set(), 0
    for i, w in enumerate(words):
        if w.endswith(('.', ',', '?')) or i == len(words) - 1:
            n = i - start + 1; parts = -(-n//4); size = -(-n//parts)
            for j in range(start + size - 1, i, size): breaks.add(j)
            breaks.add(i); start = i + 1
    for i, w in enumerate(words):
        cur.append((w, ws[i]))
        if i in breaks:
            disp = []
            for x, _ in cur:
                key = re.sub(r'[^\w-]', '', x.lower())
                if key in DISPLAY:
                    if DISPLAY[key] is None: continue
                    disp.append(DISPLAY[key] + x[len(x.rstrip('.,?')):] if key not in ('six', 'nine') or lid in ('N2', 'N5', 'N7') else x)
                else: disp.append(x)
            out.append({'t0': placed[lid] + cur[0][1]['s'], 't1': placed[lid] + cur[-1][1]['e'], 'text': ' '.join(disp), 'who': 'narrator'})
            cur = []
    return out
# hand-set caption phrases: (text on screen, how many spoken words it covers)
PHRASES = {
 'N1': [('Santa has one night.', 4), ('Physics says it could', 4), ('cost him 23 years.', 4)],
 'N2': [('Midnight to 6.', 3), ('Nearly 800 km a second.', 6)],
 'N3': [('Now push him close', 4), ('to the speed of light.', 5)],
 'N4': [('The faster you move,', 4), ('the slower your clock ticks.', 5)],
 'N5': [('One second for him', 4), ('is 9 hours at home.', 5)],
 'N6': [('He lives one night.', 4), ('The North Pole', 3), ('lives 23 years.', 3)],
 'N7': [('He lands at 6', 4), ('in the morning.', 3), ('Right on time.', 3)],
 'N8': [('For him, it was one night.', 6), ('For her, it was a lifetime.', 6)]}
def phrases(lid):
    ws = take[lid]['words']; n_src = len(text[lid].split())
    if len(ws) != n_src:
        tot = ws[-1]['e'] - ws[0]['s']
        ws = [{'s': ws[0]['s'] + tot*i/n_src, 'e': ws[0]['s'] + tot*(i + 1)/n_src} for i in range(n_src)]
    out, i = [], 0
    for txt, n in PHRASES[lid]:
        out.append({'t0': placed[lid] + ws[i]['s'], 't1': placed[lid] + ws[i + n - 1]['e'], 'text': txt, 'who': 'narrator'}); i += n
    assert i == n_src, (lid, i, n_src)
    return out
caps = []
for lid in placed: caps += phrases(lid)
caps.append({'t0': HER[0], 't1': 3*CLIP + 0.4, 'text': 'You were gone one night.', 'who': 'her'})
caps.sort(key=lambda c: c['t0'])
for a, b in zip(caps, caps[1:]):
    a['t1'] = min(max(a['t1'], a['t0'] + 0.7), b['t0'])
    if a['t0'] >= HER[0] - 0.01: a['t1'] = b['t0']          # no gaps while Veo's subtitle is under ours
caps[-1]['t1'] = max(caps[-1]['t1'], caps[-1]['t0'] + 1.2)
TITLE = (DUR - 1.6, DUR)

def ts_ass(t): h = int(t//3600); m = int(t%3600//60); s = t%60; return f"{h}:{m:02d}:{s:05.2f}"
def ts_srt(t): ms = int(round(t*1000)); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
ass = ["[Script Info]", "ScriptType: v4.00+", "PlayResX: 1080", "PlayResY: 1920", "WrapStyle: 0", "",
       "[V4+ Styles]",
       "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
       "Style: Cap,Inter SemiBold,78,&H00F2F7FB,&H00FFFFFF,&H00141414,&H96000000,0,0,0,0,100,100,0,0,1,3.6,2.4,2,80,80,250,1",
       "Style: Her,Inter Medium,74,&H00CFE9FF,&H00FFFFFF,&H00141414,&H96000000,0,1,0,0,100,100,0,0,1,3.2,2.2,2,90,90,252,1",
       "Style: Title,Inter SemiBold,92,&H00F2F7FB,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,22,0,1,0,0,5,60,60,0,1",
       "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"]
for c in caps:
    ass.append(f"Dialogue: 0,{ts_ass(c['t0'])},{ts_ass(c['t1'])},{'Her' if c['who'] == 'her' else 'Cap'},,0,0,0,,{{\\fad(60,80)}}{c['text']}")
ass.append(f"Dialogue: 0,{ts_ass(TITLE[0])},{ts_ass(TITLE[1])},Title,,0,0,0,,{{\\fad(350,0)}}ONE NIGHT")
(root/'build/captions.ass').write_text('\n'.join(ass) + '\n')
srt = [f"{i+1}\n{ts_srt(c['t0'])} --> {ts_srt(c['t1'])}\n{c['text']}\n" for i, c in enumerate(caps)]
(root/'upload/captions-en.srt').write_text('\n'.join(srt))

# ------------------------------------------------------------------ audio
N = int(DUR*SR) + 1; t = np.arange(N)/SR
rng = np.random.default_rng(5)
def lp(x, fc): return sosfilt(butter(2, fc, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc): return sosfilt(butter(2, fc, 'high', fs=SR, output='sos'), x, axis=0)
def peq(x, f0, g, q=0.8):
    A_ = 10**(g/40); w = 2*np.pi*f0/SR; al = np.sin(w)/(2*q)
    b = [1 + al*A_, -2*np.cos(w), 1 - al*A_]; a = [1 + al/A_, -2*np.cos(w), 1 - al/A_]
    return lfilter(np.array(b)/a[0], np.array(a)/a[0], x, axis=0)
def ir(sec, damp, seed):
    g = np.random.default_rng(seed); L = int(sec*SR); tt = np.arange(L)/SR
    x = lp(g.standard_normal((L, 2))*np.exp(-tt*6.9/sec)[:, None], damp)
    x[:int(0.01*SR)] *= np.linspace(0, 1, int(0.01*SR))[:, None]
    return x/np.sqrt((x**2).sum()/2)
def reverb(x, imp, wet): return x*(1 - wet) + np.stack([fftconvolve(x[:, i], imp[:, i])[:len(x)] for i in range(2)], 1)*wet
def place(buf, sig, at, gain=1.0):
    if sig.ndim == 1: sig = np.stack([sig, sig], 1)
    i = int(round(at*SR)); L = min(len(sig), N - i)
    if L > 0: buf[i:i+L] += gain*sig[:L]
def win(a, b, f=0.25): return (np.clip((t - a)/f, 0, 1)*np.clip((b - t)/f, 0, 1))[:, None]
# the clips' own sound
veo = np.zeros((N, 2))
for k, (name, at) in enumerate([('B1', B1), ('B2', B2), ('B3', B3)]):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root/'src'/f'{name}.mp4'), '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    if name == 'B1': a[:int(0.95*SR)] *= np.linspace(0, 1, int(0.95*SR))[:, None]**3      # a stray "check" at the head
    f = int(0.02*SR); a[:f] *= np.linspace(0, 1, f)[:, None]; a[-f:] *= np.linspace(1, 0, f)[:, None]
    place(veo, a, at)
her_mask = win(HER[0] - 0.25, HER[1] + 0.35, 0.12)
veo_gain = 0.42*(1 - her_mask) + 1.15*her_mask
veo *= veo_gain
# music: organ and strings in A minor, built to the picture
NOTE = lambda n: 440*2**((n - 69)/12)
def organ(f, dur, a=0.3, r=1.0):
    n = int((dur + r)*SR); tt = np.arange(n)/SR; s = np.zeros((n, 2))
    for k, (h, amp) in enumerate([(0.5, .5), (1, 1), (2, .6), (3, .25), (4, .25), (6, .1)]):
        ph = 2*np.pi*f*h*np.cumsum(1 + 0.004*np.sin(2*np.pi*5.6*tt))/SR
        s[:, 0] += amp*np.sin(ph + k); s[:, 1] += amp*np.sin(ph*1.0015 + 2*k)
    e = np.ones(n); na = int(a*SR); e[:na] = np.linspace(0, 1, na)**1.5; e[int(dur*SR):] = np.linspace(1, 0, n - int(dur*SR))**2
    return s*e[:, None]*0.1
def strings(f, dur, a=1.2, r=1.8):
    n = int((dur + r)*SR); tt = np.arange(n)/SR; s = np.zeros((n, 2))
    for v in range(5):
        ph = 2*np.pi*f*(1 + (v - 2)*0.0035)*np.cumsum(1 + 0.003*np.sin(2*np.pi*(5 + 0.3*v)*tt + v))/SR
        s[:, v % 2] += sum(np.sin(k*ph)/k for k in range(1, int(4500/f)))*0.45
    s = lp(s, 2200)
    e = np.ones(n); na = int(a*SR); e[:na] = np.linspace(0, 1, na)**1.5; e[int(dur*SR):] = np.linspace(1, 0, n - int(dur*SR))**2
    return s*e[:, None]*0.05
music = np.zeros((N, 2))
def chord(fn, notes, at, dur, g=1.0, **kw):
    for m in notes: place(music, fn(NOTE(m), dur, **kw), at, g)
prog = [([45, 57, 60, 64], 0.0, 3.8), ([41, 53, 57, 60], 3.8, 3.8), ([48, 55, 60, 64], 7.6, 3.6), ([43, 55, 59, 62], 11.2, 3.84)]
for i, (ch, a, d) in enumerate(prog):
    chord(organ, ch, B1 + a, d, 0.5 + 0.15*i, a=0.8 if i == 0 else 0.1, r=0.4)
    chord(strings, [m + 12 for m in ch[1:]], B1 + a, d, 0.35 + 0.2*i, a=0.8, r=0.4)
# a Shepard riser into light speed
i0, i1 = int((B1 + 10.0)*SR), int((B2 + 0.4)*SR); tt = np.arange(i1 - i0)/SR; sh = np.zeros(i1 - i0)
for k in range(6):
    pos = np.mod(k + tt*0.45, 6); sh += np.exp(-((pos - 3)**2)/2.9)*np.sin(np.cumsum(2*np.pi*40*2**pos/SR))
sh *= (tt/tt[-1])**1.4*0.09; sh[-int(0.03*SR):] *= np.linspace(1, 0, int(0.03*SR)); music[i0:i1] += np.stack([sh, sh], 1)
# the years: a slow climb, held and swelling, through B2
for ch, a, d in [([45, 57, 64, 69], 0.0, 5.0), ([41, 53, 60, 65], 5.0, 5.0), ([40, 52, 56, 59, 64], 10.0, 5.04)]:
    chord(strings, [m + 12 for m in ch], B2 + a, d, 0.8, a=1.0, r=0.3)
    chord(organ, ch[:3], B2 + a, d, 0.45, a=0.6, r=0.3)
cut = int(B3*SR); f = int(0.02*SR); music[cut:cut + f] *= np.linspace(1, 0, f)[:, None]; music[cut + f:] = 0      # the landing: music stops
chord(strings, [53, 60, 65, 69], B3 + 6.5, HER[0] - 0.5 - (B3 + 6.5), 0.5, a=1.8, r=0.6)                       # inside: warmth, gone before she speaks
chord(organ, [45, 57, 61, 64, 69], 3*CLIP + 1.6, DUR - 3*CLIP - 1.6 - 0.2, 0.45, a=1.5, r=0.2)                  # the end: a soft A major
chord(strings, [69, 73, 76], 3*CLIP + 1.8, DUR - 3*CLIP - 1.8 - 0.2, 0.4, a=1.5, r=0.2)
music = reverb(music, ir(3.0, 5000, 1), 0.3)
# narration
vo = np.zeros((N, 2))
for lid, at in placed.items():
    x, sr = sf.read(root/'vo/takes/af_heart'/f'{lid}.wav')
    x = resample_poly(x, SR, sr); x = hp(x, 80); x = peq(x, 180, 1.5); x = peq(x, 3500, 2.0, 1.0); x = peq(x, 7500, -2.0, 1.2)
    x = x/np.sqrt(np.mean(x[np.abs(x) > 0.01]**2) + 1e-9)*0.11
    place(vo, x, at)
vo = reverb(vo, ir(0.6, 6500, 2), 0.06)
e = np.convolve(np.abs(vo[:, 0]), np.ones(int(0.02*SR))/int(0.02*SR), 'same')
vo *= np.where(e > 0.06, (0.06 + (e - 0.06)*0.4)/np.maximum(e, 1e-9), 1.0)[:, None]
venv = np.convolve(np.abs(vo[:, 0]), np.ones(int(0.25*SR))/int(0.25*SR), 'same')
duck = (1 - 0.6*np.clip(venv/0.04, 0, 1))[:, None]
music_gain = (1 - her_mask*0.9)
mix = music*0.9*duck*music_gain + veo*(0.55 + 0.45*duck) + vo*1.3
fd = int(1.2*SR); mix[-fd:] *= np.linspace(1, 0, fd)[:, None]**1.5
mix = np.tanh(mix*1.05)/np.tanh(1.05); mix *= 0.8/np.abs(mix).max()
sf.write(root/'build/mix_raw.wav', mix, SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'build/mix_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', str(root/'build/mix.wav')], check=True)

# ------------------------------------------------------------------ picture
x, y, w, h = 392, 1590, 500, 92          # Veo's subtitle glyphs in B3, in 1080x1920 coordinates
fc = (f"[0:v][1:v][2:v]concat=n=3:v=1:a=0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.45:5:5:0,"
      f"tpad=stop_mode=clone:stop_duration={END_HOLD},split[base][strip];"
      f"[strip]crop={w}:{h}:{x}:{y},boxblur=20:2,format=yuva420p,geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='255*clip(min(min(X,W-X),min(Y,H-Y))/14,0,1)'[soft];"
      f"[base][soft]overlay={x}:{y}:enable='gte(t,{SUB_ON:.2f})',"
      f"fade=t=out:st={DUR - 2.6:.2f}:d=1.2,"
      f"ass={root/'build/captions.ass'}:fontsdir=/usr/share/fonts/opentype/inter[v]")
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'src/B1.mp4'), '-i', str(root/'src/B2.mp4'), '-i', str(root/'src/B3.mp4'),
                '-i', str(root/'build/mix.wav'), '-filter_complex', fc, '-map', '[v]', '-map', '3:a',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', '24',
                '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                '-c:a', 'aac', '-b:a', '192k', '-t', f'{DUR:.3f}', '-movflags', '+faststart', str(root/'upload/one-night-short.mp4')], check=True)
json.dump({'vo': placed, 'captions': caps, 'her': HER, 'duration': DUR}, open(root/'build/timeline.json', 'w'), indent=1)
print('done', round(DUR, 2), 's;', len(caps), 'captions')
for c in caps: print(f"  {c['t0']:6.2f}-{c['t1']:6.2f}  {c['text']}")
