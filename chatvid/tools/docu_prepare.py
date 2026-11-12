#!/usr/bin/env python3
"""Prepare a documentary-style episode ("engine": "docu").

1. Speaks every narration line with Piper TTS (voice + settings from the episode).
2. Times each beat to its line: a beat lasts as long as its narration plus a hold.
3. Cuts each beat's film clip to exactly that length (via fetch_media).

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


def clip_source(spec):
    """'OfficeCo1952@212.5' -> archive clip; 'nasa:<id>@12' -> NASA clip."""
    src, start = spec.rsplit("@", 1)
    if src.startswith("nasa:"):
        return {"nasa_video": src[5:], "start": float(start)}
    return {"archive": src, "start": float(start)}


def main(ep_path):
    from piper import PiperVoice, SynthesisConfig
    ep = json.load(open(ep_path, encoding="utf-8"))
    slug = os.path.splitext(os.path.basename(ep_path))[0]
    out = os.path.join(ROOT, "assets", "voice", slug)
    os.makedirs(out, exist_ok=True)
    v = ep.get("voice", {})
    model = v.get("model", "en_GB-vctk-medium")
    voice = PiperVoice.load(ensure_voice(model))
    cfg_json = json.load(open(os.path.join(VOICES, f"{model}.onnx.json")))
    spk = cfg_json.get("speaker_id_map", {}).get(v.get("speaker")) if v.get("speaker") else None
    cfg = SynthesisConfig(speaker_id=spk, length_scale=v.get("lengthScale", 1.1),
                          noise_scale=v.get("noiseScale", 0.6), noise_w_scale=v.get("noiseW", 0.7))
    plan, media, keep = [], {}, set()
    for i, b in enumerate(ep["beats"]):
        entry = {}
        if b.get("line"):
            h = hashlib.sha1(json.dumps([b["line"], model, v], sort_keys=True).encode()).hexdigest()[:10]
            fn = f"{h}.wav"                               # named by content: edits only re-voice changed lines
            path = os.path.join(out, fn)
            if not os.path.exists(path):
                with wave.open(path, "wb") as wf:
                    voice.synthesize_wav(b["line"], wf, syn_config=cfg)
            w = wave.open(path)
            entry["voice"], entry["voiceDur"] = fn, round(w.getnframes() / w.getframerate(), 3)
            keep.add(fn)
        speak = LEAD + entry.get("voiceDur", 0) + b.get("hold", HOLD) if b.get("line") else 0
        if "title" in b or "chapter" in b:
            d = max(b.get("dur", 2.6), speak)
        else:
            d = max(b.get("min", 2.2), speak)
        entry["dur"] = round(d, 2)
        if b.get("clip"):
            spec = {**clip_source(b["clip"]), "dur": round(d * b.get("speed", 1.0) + 0.15, 2)}
            key = f"{slug}-" + hashlib.sha1(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:8]
            media[key] = spec
            if b.get("audio"):
                media[key]["audio"] = True
            entry["media"] = key
        plan.append(entry)
        print(f"  {i:02d}  {d:5.2f}s  {(b.get('line') or b.get('title') or b.get('chapter') or '')[:70]}")
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
