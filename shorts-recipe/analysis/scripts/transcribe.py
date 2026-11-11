import sys, json, glob, os
from faster_whisper import WhisperModel
src, out = sys.argv[1], sys.argv[2]
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for f in sorted(glob.glob(os.path.join(src, "*.wav"))):
    vid = os.path.basename(f)[:-4]
    import soundfile as sf; a,_=sf.read(f,dtype="float32"); segs, info = m.transcribe(a, word_timestamps=True, vad_filter=False, beam_size=5)
    words = []
    for s in segs:
        for w in s.words:
            words.append({"w": w.word, "s": round(w.start,2), "e": round(w.end,2)})
    json.dump({"id": vid, "words": words}, open(os.path.join(out, vid + ".words.json"), "w"))
    print(vid, len(words), " ".join(x["w"].strip() for x in words)[:200], flush=True)
