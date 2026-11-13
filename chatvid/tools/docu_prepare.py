#!/usr/bin/env python3
"""Prepare a documentary-style episode ("engine": "docu").

1. Speaks every narration line with Piper or Kokoro TTS (voice + settings from the episode).
2. Times each beat to its line: a beat lasts as long as its narration plus a hold,
   or as long as its clip when the clip is given as a range ("film@612.4-615.0",
   used for original dialogue).
3. Cuts each beat's film clip to exactly that length (via fetch_media).

Voices:
  "voice": {"model": "en_GB-vctk-medium", "speaker": "p254", "lengthScale": 1.12}      Piper
  "voice": {"engine": "kokoro", "blend": {"am_michael": 0.4, "am_onyx": 0.6},
            "speed": 0.9, "fx": "trailer"}                                             Kokoro
Kokoro (Apache-2.0) needs `pip install kokoro-onnx soundfile` and its model files in
chatvid/assets/voices/kokoro/ (downloaded on first use).

  python3 chatvid/tools/docu_prepare.py chatvid/episodes/planet-human.json

Writes chatvid/assets/voice/<episode>/: one WAV per line, plan.json (timings) and
media.json (the clips), which render.mjs and fetch_media.py pick up.
"""
import hashlib, json, os, subprocess, sys, urllib.request, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.path.join(ROOT, "assets", "voices")
LEAD = 0.3            # seconds of picture before the narrator starts
HOLD = 0.55           # default seconds after the line ends
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


def ensure_voice(model):
    """Download a Piper voice (onnx + config) the first time it is used."""
    lang = model.split("-")[0]                      # en_GB
    _, name, quality = model.split("-")              # en_GB-vctk-medium -> vctk, medium
    base = f"{HF}/{lang.split('_')[0]}/{lang}/{name}/{quality}/{model}"
    os.makedirs(VOICES, exist_ok=True)
    for ext in ("onnx", "onnx.json"):
        dest = os.path.join(VOICES, f"{model}.{ext}")
        if not os.path.exists(dest):
            print(f"  downloading voice {model}.{ext}")
            urllib.request.urlretrieve(base + "." + ext, dest)
    return os.path.join(VOICES, f"{model}.onnx")


KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
# "fx": "trailer" - a little low end, gentle compression and a short room, for a movie-trailer read
FX = {"trailer": "bass=g=3:f=120,acompressor=threshold=0.1:ratio=3:attack=5:release=120,aecho=0.8:0.6:45|90:0.12|0.06"}


class Kokoro:
    def __init__(self, v):
        from kokoro_onnx import Kokoro as K
        d = os.path.join(VOICES, "kokoro")
        os.makedirs(d, exist_ok=True)
        for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
            if not os.path.exists(os.path.join(d, f)):
                print(f"  downloading {f}")
                urllib.request.urlretrieve(KOKORO + f, os.path.join(d, f))
        self.k = K(os.path.join(d, "kokoro-v1.0.onnx"), os.path.join(d, "voices-v1.0.bin"))
        blend = v.get("blend") or {v.get("speaker", "am_michael"): 1.0}
        self.style = sum(self.k.get_voice_style(name) * w for name, w in blend.items())
        self.speed, self.lang = v.get("speed", 0.95), v.get("lang", "en-us")

    def write(self, text, path):
        import numpy as np, soundfile as sf
        a, sr = self.k.create(text, voice=self.style, speed=self.speed, lang=self.lang)
        sf.write(path, np.asarray(a, dtype=np.float32), sr)


def clip_source(spec, films):
    """'OfficeCo1952@212.5' -> archive clip from 212.5 s; 'film@612.4-615.0' -> that exact
    range; 'nasa:<id>@12' -> NASA clip. Per-film settings ("pd", "file", "title", "year")
    come from the episode's "films"."""
    src, at = spec.rsplit("@", 1)
    start, end = (float(x) for x in at.split("-")) if "-" in at else (float(at), None)
    if src.startswith("nasa:"):
        out = {"nasa_video": src[5:], "start": start}
    else:
        out = {"archive": src, "start": start, **films.get(src, {})}
    return out, (round(end - start, 2) if end is not None else None)


def main(ep_path):
    from piper import PiperVoice, SynthesisConfig
    ep = json.load(open(ep_path, encoding="utf-8"))
    slug = os.path.splitext(os.path.basename(ep_path))[0]
    out = os.path.join(ROOT, "assets", "voice", slug)
    os.makedirs(out, exist_ok=True)
    v = ep.get("voice", {})
    films = ep.get("films", {})
    model = "kokoro-v1.0" if v.get("engine") == "kokoro" else v.get("model", "en_GB-vctk-medium")
    if v.get("engine") == "kokoro":
        kok = Kokoro(v)
        speak_to = kok.write
    else:
        voice = PiperVoice.load(ensure_voice(model))
        cfg_json = json.load(open(os.path.join(VOICES, f"{model}.onnx.json")))
        spk = cfg_json.get("speaker_id_map", {}).get(v.get("speaker")) if v.get("speaker") else None
        cfg = SynthesisConfig(speaker_id=spk, length_scale=v.get("lengthScale", 1.1),
                              noise_scale=v.get("noiseScale", 0.6), noise_w_scale=v.get("noiseW", 0.7))

        def speak_to(text, path):
            with wave.open(path, "wb") as wf:
                voice.synthesize_wav(text, wf, syn_config=cfg)
    plan, media, keep = [], {}, set()
    for i, b in enumerate(ep["beats"]):
        entry = {}
        if b.get("line"):
            h = hashlib.sha1(json.dumps([b.get("speak", b["line"]), model, v], sort_keys=True).encode()).hexdigest()[:10]
            fn = f"{h}.wav"                               # named by content: edits only re-voice changed lines
            path = os.path.join(out, fn)
            if not os.path.exists(path):
                # "speak" spells out how to pronounce a line when the subtitle should read differently
                speak_to(b.get("speak", b["line"]), path + ".raw.wav")
                fx = FX.get(v.get("fx"), v.get("fx"))
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path + ".raw.wav", *(["-af", fx] if fx else []),
                                "-ac", "1", "-c:a", "pcm_s16le", path], check=True)
                os.remove(path + ".raw.wav")
            w = wave.open(path)
            entry["voice"], entry["voiceDur"] = fn, round(w.getnframes() / w.getframerate(), 3)
            keep.add(fn)
        lead = b.get("lead", LEAD)
        speak = lead + entry.get("voiceDur", 0) + b.get("hold", HOLD) if b.get("line") else 0
        src, span = clip_source(b["clip"], films) if b.get("clip") else (None, None)
        if "title" in b or "chapter" in b or "card" in b:
            d = max(b.get("dur", 2.6), speak)
        elif span is not None:                         # a range: the clip sets the length
            d = max(span / b.get("speed", 1.0), speak, b.get("min", 0))
        else:
            d = max(b.get("min", 2.2), speak)
        entry["dur"] = round(d, 2)
        if lead != LEAD:
            entry["lead"] = lead
        if span is not None and d > span / b.get("speed", 1.0) + 0.05:
            entry["span"] = round(span / b.get("speed", 1.0), 3)   # the line ends here: sound stops, picture holds
        if src:
            spec = {**src, "dur": round(d * b.get("speed", 1.0) + 0.15, 2)}
            if b.get("audio"):
                spec["audio"] = True
                if b.get("clean", ep.get("cleanDialogue", False)):
                    spec["clean"] = True
            key = f"{slug}-" + hashlib.sha1(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:8]
            media[key] = spec
            entry["media"] = key
        plan.append(entry)
        what = b.get("line") or b.get("say") or b.get("title") or b.get("chapter") or (b.get("card") or {}).get("text") or ""
        print(f"  {i:02d}  {d:5.2f}s  {str(what)[:70]}")
    for f in os.listdir(out):                      # drop narration from lines that changed
        if f.endswith(".wav") and f not in keep:
            os.remove(os.path.join(out, f))
    json.dump({"beats": plan, "lead": LEAD}, open(os.path.join(out, "plan.json"), "w"), indent=1)
    json.dump(media, open(os.path.join(out, "media.json"), "w"), indent=1)
    total = sum(p["dur"] for p in plan)
    print(f"  {len(plan)} beats, {total:.1f}s ({int(total // 60)}:{int(total % 60):02d}) before the end card")
    subprocess.run([sys.executable, os.path.join(ROOT, "tools", "fetch_media.py"), ep_path], check=True)


if __name__ == "__main__":
    main(sys.argv[1])
