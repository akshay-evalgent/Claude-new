"""Generate every voice-over line with Kokoro, then check each with Whisper.
Writes vo/takes/<voice>/<id>.wav and vo/takes/<voice>/report.json (duration, word timings, what Whisper heard)."""
import json, sys, pathlib, re
import numpy as np, soundfile as sf
from kokoro import KPipeline
HERE = pathlib.Path(__file__).resolve().parent
lines = json.load(open(HERE/'lines.json'))
voices = sys.argv[1].split('+')          # e.g. am_michael+bm_george
her_voice = sys.argv[2] if len(sys.argv) > 2 else 'bf_emma'
speed_n = float(sys.argv[3]) if len(sys.argv) > 3 else 0.92
pipes = {}
def pipe(lang):
    if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang, repo_id='hexgrad/Kokoro-82M')
    return pipes[lang]
from faster_whisper import WhisperModel
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
norm = lambda s: re.sub(r'[^a-z0-9 ]', '', s.lower().replace('-', ' ')).split()
for v in voices:
    out = HERE/'takes'/v; out.mkdir(parents=True, exist_ok=True)
    report = []
    for ln in lines:
        voice = v if ln['who'] == 'narrator' else her_voice
        speed = speed_n if ln['who'] == 'narrator' else 0.86
        p = pipe(voice[0])
        audio, words = [], []
        offset = 0.0
        for r in p(ln['text'], voice=voice, speed=speed):
            a = r.audio.numpy() if hasattr(r.audio, 'numpy') else np.asarray(r.audio)
            for tk in (r.tokens or []):
                if tk.start_ts is not None and tk.end_ts is not None and tk.text.strip() and re.search(r'\w', tk.text):
                    words.append({'w': tk.text, 's': round(offset + tk.start_ts, 3), 'e': round(offset + tk.end_ts, 3)})
            audio.append(a); offset += len(a)/24000
        audio = np.concatenate(audio)
        sf.write(out/f"{ln['id']}.wav", audio, 24000)
        a16 = np.interp(np.arange(0, len(audio), 1.5), np.arange(len(audio)), audio).astype(np.float32)
        segs, _ = asr.transcribe(a16, language='en', beam_size=5)
        heard = ' '.join(s.text.strip() for s in segs)
        ok = norm(heard) == norm(ln['text']) or ' '.join(norm(heard)) == ' '.join(norm(ln['text'].replace('twenty-three', '23')))
        report.append({'id': ln['id'], 'voice': voice, 'dur': round(len(audio)/24000, 3), 'words': words, 'heard': heard, 'match': ok})
        print(f"{v:12s} {ln['id']:4s} {len(audio)/24000:5.2f}s  {'OK ' if ok else 'XX '} {heard}", flush=True)
    json.dump(report, open(out/'report.json', 'w'), indent=1)
