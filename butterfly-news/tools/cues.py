"""timeline.json -> out/butterfly.srt (one Chinese line, one English line per cue) + a reading-time check."""
import json, os
here = os.path.dirname(os.path.abspath(__file__)); tl = json.load(open(os.path.join(here, '..', 'timeline.json')))
lens = json.load(open(os.path.join(here, '..', 'audio', 'voice', 'lengths.json')))
def ts(t): h, r = divmod(t, 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)):03d}"
os.makedirs(os.path.join(here, '..', 'out'), exist_ok=True); out = []
for i, c in enumerate(tl['captions'], 1):
    zh = c['zh'].replace('|', '').replace('{', '').replace('}', '')
    out.append(f"{i}\n{ts(c['t0'])} --> {ts(c['t1'])}\n{zh}\n{c['en']}\n")
    dur = c['t1'] - c['t0']; flag = '' if dur >= 1.8 else '  << under 1.8 s'
    if len(zh) > 14: flag += '  << over 14 characters'
    print(f"{c['t0']:5.2f}-{c['t1']:5.2f} {dur:.2f}s {len(zh):2d}ch {zh}{flag}")
for v, l in zip(tl['voice'], lens):
    cap = next(c for c in tl['captions'] if c['t0'] - 0.5 <= v['t'] < c['t1'])
    print(f"voice {v['t']:5.2f}+{l:.2f} ends {v['t'] + l:5.2f} | caption ends {cap['t1']:5.2f} | spare {cap['t1'] - v['t'] - l:+.2f}s")
open(os.path.join(here, '..', 'out', 'butterfly.srt'), 'w').write('\n'.join(out)); print('wrote out/butterfly.srt')
