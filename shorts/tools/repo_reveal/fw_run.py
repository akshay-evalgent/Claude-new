import sys, time, json, soundfile as sf
from faster_whisper import WhisperModel
wav, out = sys.argv[1], sys.argv[2]
t0 = time.time()
m = WhisperModel("small.en", device="cpu", compute_type="int8")
t1 = time.time()
a, sr = sf.read(wav, dtype="float32")
segs, info = m.transcribe(a, word_timestamps=True, beam_size=5)
res = []
for s in segs:
    res.append({"start": s.start, "end": s.end, "text": s.text, "words": [[w.start, w.end, w.word] for w in s.words]})
t2 = time.time()
json.dump({"load_s": t1 - t0, "transcribe_s": t2 - t1, "audio_s": len(a) / sr, "segments": res}, open(out, "w"), indent=1)
print(f"load {t1-t0:.1f}s transcribe {t2-t1:.1f}s for {len(a)/sr:.1f}s audio")
for s in res: print(f"{s['start']:6.2f}-{s['end']:6.2f} {s['text']}")
