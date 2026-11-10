"""Narration in the presenter's own voice, cloned from her three Flow clips with Chatterbox (MIT licence).
Each line gets several takes; Whisper checks the words, and Resemblyzer scores how close each take is to her
on-camera voice. The best take is kept with its word timings."""
import json, pathlib, re, sys
import numpy as np, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
from resemblyzer import VoiceEncoder, preprocess_wav
from faster_whisper import WhisperModel
HERE = pathlib.Path(__file__).resolve().parent
lines = json.load(open(HERE/'narration_her.json'))
ref = str(HERE/'her/reference.wav')
TAKES = int(sys.argv[1]) if len(sys.argv) > 1 else 3
model = ChatterboxTTS.from_pretrained(device='cpu')
enc = VoiceEncoder('cpu')
asr = WhisperModel('small.en', device='cpu', compute_type='int8')
her = enc.embed_utterance(preprocess_wav(ref))
norm = lambda s: re.sub(r'[^a-z0-9 ]', ' ', s.lower().replace('-', ' ')).split()
NUM = {'23': 'twenty three', '6': 'six', '9': 'nine', '800': 'eight hundred', 'kilometers': 'kilometres'}
out = HERE/'takes'/'her'; out.mkdir(parents=True, exist_ok=True)
report = []
# for comparison: how close is the old narrator, and how alike are her three clips?
old = enc.embed_utterance(preprocess_wav(str(HERE/'takes/af_heart/N4.wav')))
clips = [enc.embed_utterance(preprocess_wav(str(HERE/'her'/f'{c}.wav'))) for c in ('A1', 'A2', 'A3')]
print('similarity  old narrator vs her:', round(float(np.dot(old, her)), 3),
      '  her clips to each other:', [round(float(np.dot(clips[i], clips[j])), 3) for i, j in ((0, 1), (0, 2), (1, 2))], flush=True)
for ln in lines:
    best = None
    for k in range(TAKES):
        torch.manual_seed(100 + k)
        wav = model.generate(ln['text'], audio_prompt_path=ref, exaggeration=0.45, cfg_weight=0.5, temperature=0.7)
        a = wav.squeeze(0).numpy()
        path = out/f"{ln['id']}_t{k}.wav"; ta.save(str(path), wav, model.sr)
        sim = float(np.dot(enc.embed_utterance(preprocess_wav(str(path))), her))
        a16 = np.interp(np.arange(0, len(a), model.sr/16000), np.arange(len(a)), a).astype(np.float32)
        segs = list(asr.transcribe(a16, language='en', beam_size=5, word_timestamps=True)[0])
        heard = ' '.join(s.text.strip() for s in segs)
        ok = ' '.join(NUM.get(w, w) for w in norm(heard)) == ' '.join(NUM.get(w, w) for w in norm(ln['text']))
        words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for s in segs for w in s.words]
        print(f"{ln['id']} take {k}: sim {sim:.3f} {'OK' if ok else 'XX'} {len(a)/model.sr:.2f}s  {heard}", flush=True)
        score = sim + (1.0 if ok else 0.0)
        if best is None or score > best['score']:
            best = {'id': ln['id'], 'take': k, 'score': score, 'sim': sim, 'match': ok, 'dur': len(a)/model.sr, 'words': words, 'heard': heard}
    src = out/f"{ln['id']}_t{best['take']}.wav"
    (out/f"{ln['id']}.wav").write_bytes(src.read_bytes())
    report.append(best)
    print(f"  -> {ln['id']} keeps take {best['take']} (sim {best['sim']:.3f})", flush=True)
json.dump(report, open(out/'report.json', 'w'), indent=1)
