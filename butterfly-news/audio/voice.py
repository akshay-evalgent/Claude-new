"""Kokoro narration: one wav per line in timeline.json, plus their measured lengths."""
import json, os, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
here = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(here, '..', 'timeline.json')))
model_dir = sys.argv[1]                      # folder holding model_q8f16.onnx and voices.npz
k = Kokoro(os.path.join(model_dir, 'model_q8f16.onnx'), os.path.join(model_dir, 'voices.npz'))
out = os.path.join(here, 'voice'); os.makedirs(out, exist_ok=True)
lens = []
for i, v in enumerate(tl['voice']):
    s, sr = k.create(v['text'], voice='af_heart', speed=1.17, lang='en-us')
    s = np.asarray(s, dtype=np.float32)
    nz = np.where(np.abs(s) > 0.01)[0]                      # trim leading / trailing silence
    s = s[max(0, nz[0] - 240): nz[-1] + 1200]
    sf.write(os.path.join(out, f'v{i:02d}.wav'), s, sr)
    lens.append(round(len(s) / sr, 2))
    print(f"v{i:02d} t={v['t']:5.2f} len={lens[-1]:.2f}s ends {v['t'] + lens[-1]:5.2f}  {v['text']}")
json.dump(lens, open(os.path.join(out, 'lengths.json'), 'w'))
