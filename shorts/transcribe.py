import sys, json, os, subprocess, time
from faster_whisper import WhisperModel
import soundfile as sf, numpy as np
ids = sys.argv[1:]; SRC = os.environ.get("SRC_DIR", "."); TX = os.environ.get("TX_DIR", ".")
model = WhisperModel("small.en", device="cpu", compute_type="int8", cpu_threads=2)
for vid in ids:
    out = f"{TX}/{vid}.json"
    if os.path.exists(out): continue
    wav = f"{TX}/{vid}.wav"
    if not os.path.exists(wav):
        subprocess.run(["ffmpeg","-v","error","-y","-i",f"{SRC}/{vid}.mp4","-vn","-ac","1","-ar","16000",wav],check=True)
    t0=time.time()
    audio,_=sf.read(wav,dtype='float32')
    segs, info = model.transcribe(audio, language="en", word_timestamps=True, vad_filter=True, beam_size=1, condition_on_previous_text=False)
    res=[]
    for s in segs:
        res.append({"start":round(s.start,2),"end":round(s.end,2),"text":s.text.strip(),
                    "words":[{"w":w.word.strip(),"s":round(w.start,2),"e":round(w.end,2)} for w in (s.words or [])]})
    json.dump(res, open(out+".tmp","w")); os.rename(out+".tmp", out)
    print(vid, "done", len(res), "segs", round(time.time()-t0), "s", flush=True)
