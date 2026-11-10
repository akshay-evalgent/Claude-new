"""Narration takes with Kokoro, each checked word for word with Whisper. Usage: make_vo.py voice1+voice2 [speed]"""
import json, sys, pathlib, re
import numpy as np, soundfile as sf
from kokoro import KPipeline
from faster_whisper import WhisperModel
HERE = pathlib.Path(__file__).resolve().parent
lines = json.load(open(HERE/'lines.json'))
voices = sys.argv[1].split('+'); speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.95
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[^a-z0-9 ]', ' ', s.lower().replace('-', ' ')).split()
NUM = {'23': 'twenty three', '6': 'six', '9': 'nine', '800': 'eight hundred'}
for v in voices:
    pipe = KPipeline(lang_code=v[0], repo_id='hexgrad/Kokoro-82M')
    out = HERE/'takes'/v; out.mkdir(parents=True, exist_ok=True)
    rep = []
    for ln in lines:
        audio, words, off = [], [], 0.0
        for r in pipe(ln['text'], voice=v, speed=speed):
            a = r.audio.numpy()
            for tk in (r.tokens or []):
                if tk.start_ts is not None and tk.end_ts is not None and re.search(r'\w', tk.text):
                    words.append({'w': tk.text, 's': round(off + tk.start_ts, 3), 'e': round(off + tk.end_ts, 3)})
            audio.append(a); off += len(a)/24000
        audio = np.concatenate(audio)
        sf.write(out/f"{ln['id']}.wav", audio, 24000)
        a16 = np.interp(np.arange(0, len(audio), 1.5), np.arange(len(audio)), audio).astype(np.float32)
        heard = ' '.join(s.text.strip() for s in asr.transcribe(a16, language='en', beam_size=5)[0])
        h = ' '.join(NUM.get(w, w) for w in norm(heard)); want = ' '.join(norm(ln['text']))
        ok = h.replace('kilometers', 'kilometres') == want
        rep.append({'id': ln['id'], 'dur': round(len(audio)/24000, 3), 'words': words, 'heard': heard, 'match': ok})
        print(f"{v:9s} {ln['id']} {len(audio)/24000:5.2f}s {'OK' if ok else 'XX'}  {heard}", flush=True)
    json.dump(rep, open(out/'report.json', 'w'), indent=1)
