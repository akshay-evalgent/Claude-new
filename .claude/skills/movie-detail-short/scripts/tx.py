import subprocess, numpy as np, json, sys, os
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=4)
for f in sys.argv[2:]:
    out = os.path.join(sys.argv[1], os.path.basename(f).rsplit(".", 1)[0] + ".json")
    if os.path.exists(out): continue
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    segs, _ = m.transcribe(a, word_timestamps=True, vad_filter=True)
    rows = [{"s": s.start, "e": s.end, "t": s.text.strip(), "w": [[w.start, w.end, w.word] for w in s.words]} for s in segs]
    json.dump(rows, open(out, "w"), indent=0); print("done", f, len(rows), flush=True)
