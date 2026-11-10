#!/usr/bin/env python3
"""Worker of the free backend for the make-an-anime pipeline (see lib/free/client.rb).

    free_backend.py submit REQUEST.json KEY   answer one request now, or queue it (exit 75)
    free_backend.py kaggle [--no-wait]        run the queue in one Kaggle GPU session, store the results
    free_backend.py collect                   fetch the last batch's results again
    free_backend.py status                    list queued and stored requests

Each paid Fal endpoint is mapped to an open model:

    openai/gpt-image-2.6/.../text-to-image  -> Z-Image Turbo                        (Kaggle, WanGP)
    openai/gpt-image-2.6/.../edit           -> FLUX.2 Klein 4B with reference images (Kaggle, WanGP)
    minimax/h3-max/image-to-video           -> Wan 2.2 I2V 14B Lightning, 4 steps    (Kaggle, WanGP)
    elevenlabs/tts/eleven-v4                -> Qwen3 TTS VoiceDesign                 (Kaggle, WanGP)
    elevenlabs/music/v2.5                   -> ACE-Step 1.5                          (Kaggle, WanGP)
    elevenlabs/sound-effects/v3             -> Stable Audio 3 Small SFX              (Kaggle, WanGP)
    fal-ai/whisper                          -> faster-whisper                        (this machine, CPU)

Run from the project root. Everything is kept under output/free/.
"""
import base64
import glob
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time

FREE = os.path.join("output", "free")
QUEUE = os.path.join(FREE, "queue")
RESULTS = os.path.join(FREE, "results")
FILES = os.path.join(FREE, "files")
BATCHES = os.path.join(FREE, "batches")
HERE = os.path.dirname(os.path.abspath(__file__))
EXIT_DEFERRED = 75

WANGP_SETTINGS_VERSION = 2.83
IMAGE_RES = "1920x1088"   # cropped to 1920x1080 after download
VIDEO_RES = os.environ.get("FREE_VIDEO_RES", "832x480")
VIDEO_FPS = 16            # Wan 2.2 14B; clips are conformed to 24 fps after download
VIDEO_MAX_FRAMES = 81
KERNEL_SLUG = os.environ.get("FREE_KAGGLE_KERNEL", "anime-free-batch")
DATASET_SLUG = os.environ.get("FREE_KAGGLE_DATASET", "anime-free-inputs")

VIDEO_NEGATIVE = ("text, captions, subtitles, letters, watermark, logo, photorealistic, 3d render, cgi, blurry, low quality, "
                  "flicker, deformed face, distorted body, extra fingers, extra limbs, fused fingers, bad hands, extra people, "
                  "static frame, scene cut, split screen")
LANGUAGES = {"ja": "japanese", "en": "english", "zh": "chinese", "ko": "korean", "de": "german", "fr": "french",
             "es": "spanish", "it": "italian", "pt": "portuguese", "ru": "russian"}


def log(*a):
    print("[free]", *a, file=sys.stderr, flush=True)


def one_line(text):
    """WanGP splits a multi-line prompt into separate tasks."""
    return " ".join(str(text).split())


def local_path(url):
    if not url.startswith("file://"):
        raise SystemExit(f"free backend only handles local files, got {url}")
    return url[len("file://"):]


def seed_of(text):
    return int(hashlib.sha256(text.encode()).hexdigest()[:8], 16) % 2_000_000_000


def write_result(key, result):
    os.makedirs(RESULTS, exist_ok=True)
    tmp = os.path.join(RESULTS, f"{key}.json.tmp")
    json.dump(result, open(tmp, "w"), indent=1)
    os.replace(tmp, os.path.join(RESULTS, f"{key}.json"))
    queued = os.path.join(QUEUE, f"{key}.json")
    if os.path.exists(queued):
        os.remove(queued)


def run(cmd, check=True, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if check and r.returncode:
        raise SystemExit(f"failed ({r.returncode}): {' '.join(map(str, cmd))}\n{r.stdout[-3000:]}\n{r.stderr[-3000:]}")
    return r


# ---------------------------------------------------------------------------------------------------------------------
# Requests answered on this machine
# ---------------------------------------------------------------------------------------------------------------------

def whisper(key, inp):
    from faster_whisper import WhisperModel
    model = WhisperModel(os.environ.get("FREE_WHISPER", "small"), device="cpu", compute_type="int8")
    import numpy as np
    # Decoded by ffmpeg to 16 kHz mono floats: faster-whisper's own decoder depends on the installed PyAV version.
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", local_path(inp["audio_url"]), "-f", "f32le", "-ac", "1",
                          "-ar", "16000", "-"], capture_output=True, check=True).stdout
    segments, _info = model.transcribe(np.frombuffer(pcm, dtype=np.float32), language=inp.get("language") or None,
                                       task=inp.get("task", "transcribe"))
    chunks = [{"timestamp": [round(s.start, 2), round(s.end, 2)], "text": s.text} for s in segments]
    write_result(key, {"text": "".join(c["text"] for c in chunks).strip(), "chunks": chunks, "backend": "faster-whisper"})


def submit(request_file, key):
    req = json.load(open(request_file))
    endpoint, inp = req["endpoint"], req["input"]
    if endpoint == "fal-ai/whisper":
        whisper(key, inp)
        return 0
    kind_of(endpoint)  # refuse unknown endpoints before queueing
    os.makedirs(QUEUE, exist_ok=True)
    json.dump({"key": key, "endpoint": endpoint, "input": inp, "queued_at": time.time()},
              open(os.path.join(QUEUE, f"{key}.json"), "w"), indent=1)
    return EXIT_DEFERRED


# ---------------------------------------------------------------------------------------------------------------------
# Requests translated into WanGP tasks for one Kaggle session
# ---------------------------------------------------------------------------------------------------------------------

def kind_of(endpoint):
    if endpoint.endswith("/text-to-image"):
        return "image"
    if endpoint.endswith("/edit"):
        return "edit"
    if "image-to-video" in endpoint:
        return "video"
    if "/tts/" in endpoint:
        return "voice"
    if "/music/" in endpoint:
        return "music"
    if "sound-effects" in endpoint:
        return "sfx"
    raise SystemExit(f"free backend has no open model for {endpoint}")


class Inputs:
    """Local files a batch needs on Kaggle: copied into the batch's dataset folder under a unique name."""

    def __init__(self, folder):
        self.folder, self.names = folder, {}

    def add(self, path, max_side=None):
        path = os.path.abspath(path)
        stem = os.path.splitext(os.path.basename(path))[0]
        if not os.path.exists(path) and os.path.exists(os.path.join(QUEUE, f"{stem}.json")):
            # Not made yet: it is the output of another request in this batch (a sheet for a keyframe, a keyframe for
            # a shot). The kernel points the task at that output once it exists.
            return f"@@OUT@@{stem}" + (f"|{max_side}" if max_side else "")
        if path not in self.names:
            digest = hashlib.sha256(open(path, "rb").read()).hexdigest()[:10]
            stem, ext = os.path.splitext(os.path.basename(path))
            name = re.sub(r"[^A-Za-z0-9_.-]", "_", f"{digest}_{stem}")[:60]
            os.makedirs(self.folder, exist_ok=True)
            if max_side and ext.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                name += ".jpg"
                run(["ffmpeg", "-y", "-v", "error", "-i", path, "-vf",
                     f"scale='min({max_side},iw)':'min({max_side},ih)':force_original_aspect_ratio=decrease", "-q:v", "2",
                     os.path.join(self.folder, name)])
            else:
                name += ext
                shutil.copy(path, os.path.join(self.folder, name))
            self.names[path] = name
        return "@@IN@@" + self.names[path]


def base_task(model_type, prompt, key, seed):
    return {"settings_version": WANGP_SETTINGS_VERSION, "model_type": model_type, "prompt": one_line(prompt),
            "seed": seed, "prompt_enhancer": "", "output_filename": key}


def video_frames(seconds):
    n = max(33, math.ceil((float(seconds) + 0.3) * VIDEO_FPS))
    return min(VIDEO_MAX_FRAMES, 4 * math.ceil((n - 1) / 4) + 1)


def translate(job, inputs):
    """One queued request -> {"kind", "tasks": [{"task", "fallback"}], "post": {...}}."""
    key, inp, kind = job["key"], job["input"], kind_of(job["endpoint"])
    seed = seed_of(key)
    if kind == "image":
        t = base_task("z_image", inp["prompt"], key, seed) | {"image_mode": 1, "resolution": IMAGE_RES, "batch_size": 1}
        return {"kind": kind, "tasks": [{"task": t}]}
    if kind == "edit":
        prompt = inp["prompt"]
        edit = prompt.lstrip().lower().startswith("[edit]")   # the first image is the picture being edited
        prompt = re.sub(r"^\s*\[edit\]\s*", "", prompt, flags=re.I)
        refs = [inputs.add(local_path(u), max_side=1280) for u in inp["image_urls"]]
        t = base_task("flux2_klein_4b", prompt, key, seed) | {
            "image_mode": 1, "resolution": IMAGE_RES, "batch_size": 1, "image_refs": refs,
            "video_prompt_type": "KI" if edit else "I"}
        fallback = base_task("z_image", prompt, key, seed) | {"image_mode": 1, "resolution": IMAGE_RES, "batch_size": 1}
        return {"kind": kind, "tasks": [{"task": t, "fallback": fallback}]}
    if kind == "video":
        frames = video_frames(inp.get("duration", 5))
        t = base_task("i2v_2_2_Enhanced_Lightning_v2", inp["prompt"], key, seed) | {
            "negative_prompt": VIDEO_NEGATIVE, "resolution": VIDEO_RES, "video_length": frames, "repeat_generation": 1,
            "image_prompt_type": "SE" if inp.get("end_image_url") else "S",
            "image_start": inputs.add(local_path(inp["image_url"]), max_side=1920)}
        if inp.get("end_image_url"):
            t["image_end"] = inputs.add(local_path(inp["end_image_url"]), max_side=1920)
        # Wan 2.2 5B + FastWan: the model already proven on a free T4, used when the 14B run fails.
        fallback = base_task("ti2v_2_2_fastwan", inp["prompt"], key, seed) | {
            "negative_prompt": VIDEO_NEGATIVE, "resolution": "1280x704", "repeat_generation": 1, "image_prompt_type": "S",
            "video_length": min(121, 4 * math.ceil((math.ceil((float(inp.get("duration", 5)) + 0.3) * 24) - 1) / 4) + 1),
            "image_start": t["image_start"]}
        return {"kind": kind, "tasks": [{"task": t, "fallback": fallback}], "post": {"seconds": inp.get("duration")}}
    if kind == "voice":
        text = inp["text"]
        delivery = ", ".join(m.strip() for m in re.findall(r"\[([^\]]*)\]", text))
        spoken = one_line(re.sub(r"\[[^\]]*\]", " ", text))
        voice = inp["voice"]
        instruction = voice if not delivery else f"{voice.rstrip('. ')}. Delivery: {delivery}."
        t = base_task("qwen3_tts_voicedesign", spoken, key, seed_of("voice:" + voice)) | {
            "alt_prompt": one_line(instruction), "model_mode": LANGUAGES.get(inp.get("language_code", "en"), "auto"),
            "duration_seconds": 15}
        return {"kind": kind, "tasks": [{"task": t}]}
    if kind == "music":
        plan = inp.get("composition_plan")
        chunks = plan["chunks"] if plan else [{"text": "[Instrumental]", "duration_ms": inp.get("music_length_ms", 20000),
                                               "positive_styles": [inp.get("prompt", "")], "negative_styles": []}]
        tasks, parts = [], []
        for i, c in enumerate(chunks):
            seconds = c["duration_ms"] / 1000.0
            style = ", ".join(c.get("positive_styles") or []) or c.get("text", "")
            stem = f"{key}_c{i}"
            tasks.append({"task": base_task("ace_step_v1_5", "[Instrumental]", stem, seed + i) | {
                "alt_prompt": one_line(style + ", instrumental, no vocals"), "duration_seconds": max(12, math.ceil(seconds + 4))}})
            parts.append({"stem": stem, "seconds": seconds})
        return {"kind": kind, "tasks": tasks, "post": {"parts": parts}}
    if kind == "sfx":
        seconds = float(inp.get("duration_seconds", 2))
        t = base_task("stable_audio3_small_sfx", inp["text"], key, seed) | {"duration_seconds": max(2, math.ceil(seconds + 0.5))}
        return {"kind": kind, "tasks": [{"task": t}], "post": {"seconds": seconds}}
    raise SystemExit(kind)


# ---------------------------------------------------------------------------------------------------------------------
# Kaggle
# ---------------------------------------------------------------------------------------------------------------------

def kaggle(*args, check=True):
    exe = os.path.join(os.path.dirname(sys.executable), "kaggle")
    return run([exe if os.path.exists(exe) else "kaggle", *args], check=check)


def kaggle_user():
    if os.environ.get("KAGGLE_USERNAME"):
        return os.environ["KAGGLE_USERNAME"]
    cache = os.path.join(FREE, "kaggle_user.txt")
    if os.path.exists(cache):
        return open(cache).read().strip()
    out = kaggle("kernels", "list", "--mine", "--csv").stdout.splitlines()
    refs = [line.split(",")[0] for line in out[1:] if "/" in line.split(",")[0]]
    if not refs:
        raise SystemExit("Set KAGGLE_USERNAME: could not derive it from your kernels list")
    user = refs[0].split("/")[0]
    os.makedirs(FREE, exist_ok=True)
    open(cache, "w").write(user)
    return user


def push_inputs(user, folder):
    ref = f"{user}/{DATASET_SLUG}"
    json.dump({"title": DATASET_SLUG, "id": ref, "licenses": [{"name": "CC0-1.0"}]},
              open(os.path.join(folder, "dataset-metadata.json"), "w"))
    exists = kaggle("datasets", "status", ref, check=False).returncode == 0
    if exists:
        r = kaggle("datasets", "version", "-p", folder, "-m", f"batch {os.path.basename(os.path.dirname(folder))}", "--dir-mode", "zip")
    else:
        r = kaggle("datasets", "create", "-p", folder, "--dir-mode", "zip")
    log(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else "dataset pushed")
    want = {f for f in os.listdir(folder) if f != "dataset-metadata.json"}
    for _ in range(60):
        time.sleep(10)
        status = kaggle("datasets", "status", ref, check=False).stdout.strip().lower()
        listing = kaggle("datasets", "files", ref, "--page-size", "200", check=False).stdout
        if "ready" in status and all(name in listing for name in want):
            log(f"dataset {ref} ready with {len(want)} files")
            return ref
    raise SystemExit(f"dataset {ref} did not become ready")


def build_batch():
    jobs = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(QUEUE, "*.json")), key=os.path.getmtime)]
    if not jobs:
        raise SystemExit("nothing queued")
    batch = time.strftime("%Y%m%d-%H%M%S")
    folder = os.path.join(BATCHES, batch)
    inputs = Inputs(os.path.join(folder, "inputs"))
    plan = {j["key"]: translate(j, inputs) | {"endpoint": j["endpoint"]} for j in jobs}
    entries = [e for p in plan.values() for e in p["tasks"]]
    os.makedirs(os.path.join(folder, "kernel"), exist_ok=True)
    json.dump(plan, open(os.path.join(folder, "plan.json"), "w"), indent=1)
    template = open(os.path.join(HERE, "kaggle_kernel.py")).read()
    payload = base64.b64encode(json.dumps(entries).encode()).decode()
    open(os.path.join(folder, "kernel", "kernel.py"), "w").write(template.replace("__ENTRIES_B64__", payload))
    by_model = {}
    for e in entries:
        by_model[e["task"]["model_type"]] = by_model.get(e["task"]["model_type"], 0) + 1
    log(f"batch {batch}: {len(jobs)} requests -> {len(entries)} tasks {by_model}, {len(inputs.names)} input files")
    return batch, folder, plan, inputs


def push_batch(folder, inputs):
    user = kaggle_user()
    sources = [push_inputs(user, inputs.folder)] if inputs.names else []
    meta = {"id": f"{user}/{KERNEL_SLUG}", "title": KERNEL_SLUG, "code_file": "kernel.py", "language": "python",
            "kernel_type": "script", "is_private": True, "enable_gpu": True, "enable_tpu": False, "enable_internet": True,
            "dataset_sources": sources, "competition_sources": [], "kernel_sources": [], "model_sources": [],
            "machine_shape": "NvidiaTeslaT4"}
    json.dump(meta, open(os.path.join(folder, "kernel", "kernel-metadata.json"), "w"), indent=1)
    r = kaggle("kernels", "push", "-p", os.path.join(folder, "kernel"), "--accelerator", "NvidiaTeslaT4")
    log(r.stdout.strip() or r.stderr.strip())
    if "error" in (r.stdout + r.stderr).lower() and "successfully" not in (r.stdout + r.stderr).lower():
        raise SystemExit("kernel push was refused")
    open(os.path.join(BATCHES, "last"), "w").write(os.path.basename(folder))
    return meta["id"]


def wait_kernel(ref, hours=6):
    start, last = time.time(), None
    while time.time() - start < hours * 3600:
        out = kaggle("kernels", "status", ref, check=False)
        text = (out.stdout + out.stderr).strip().lower()
        state = next((s for s in ("complete", "error", "cancel", "running", "queued") if s in text), text[-80:])
        if state != last:
            log(f"{ref}: {state} after {(time.time() - start) / 60:.0f} min")
            last = state
        if state in ("complete", "error", "cancel"):
            return state
        time.sleep(45)
    return "timeout"


def cover(src, dst, w, h):
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf",
         f"scale={w}:{h}:force_original_aspect_ratio=increase:flags=lanczos,crop={w}:{h}", "-frames:v", "1", dst])


def duration(path):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).stdout.strip())


def store(key, plan, found):
    """Turn a batch's raw outputs into the result JSON the pipeline expects. Returns None, or what is missing."""
    kind, post = plan["kind"], plan.get("post") or {}
    os.makedirs(FILES, exist_ok=True)
    if kind in ("image", "edit"):
        src = found.get(key)
        if not src:
            return "no image"
        out = os.path.abspath(os.path.join(FILES, f"{key}.png"))
        cover(src, out, 1920, 1080)
        write_result(key, {"images": [{"url": f"file://{out}", "width": 1920, "height": 1080}], "description": None,
                           "backend": plan["tasks"][0]["task"]["model_type"]})
    elif kind == "video":
        src = found.get(key)
        if not src:
            return "no video"
        out = os.path.abspath(os.path.join(FILES, f"{key}.mp4"))
        # Wan gives 16 fps; the pipeline counts 24 fps frames. Frames are repeated, never blended.
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-vf", "fps=24", "-an", "-c:v", "libx264", "-crf", "14",
             "-pix_fmt", "yuv420p", out])
        write_result(key, {"video": {"url": f"file://{out}"}, "seed": plan["tasks"][0]["task"]["seed"],
                           "backend": "wan2.2", "raw": src})
    elif kind == "voice":
        src = found.get(key)
        if not src:
            return "no audio"
        out = os.path.abspath(os.path.join(FILES, f"{key}.wav"))
        # Trim the silence the model leaves around a line, keeping a short natural tail.
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af",
             "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,areverse,"
             "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.15,areverse",
             "-ar", "44100", "-ac", "1", out])
        write_result(key, {"audio": {"url": f"file://{out}"}, "timestamps": None, "backend": "qwen3-tts"})
    elif kind == "sfx":
        src = found.get(key)
        if not src:
            return "no audio"
        out = os.path.abspath(os.path.join(FILES, f"{key}.wav"))
        run(["ffmpeg", "-y", "-v", "error", "-i", src, "-t", str(post["seconds"]), "-ar", "48000", "-ac", "2", out])
        write_result(key, {"audio": {"url": f"file://{out}"}, "backend": "stable-audio-3-small-sfx"})
    elif kind == "music":
        parts = post["parts"]
        missing = [p["stem"] for p in parts if p["stem"] not in found]
        if missing:
            return f"no audio for {missing}"
        out = os.path.abspath(os.path.join(FILES, f"{key}.wav"))
        xf = 0.6
        cmd, filters, last = ["ffmpeg", "-y", "-v", "error"], [], None
        for i, p in enumerate(parts):
            cmd += ["-i", found[p["stem"]]]
            take = p["seconds"] + (xf if i < len(parts) - 1 else 0)
            filters.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:{take:.3f},asetpts=PTS-STARTPTS[a{i}]")
        for i in range(len(parts)):
            if last is None:
                last = "a0"
                continue
            filters.append(f"[{last}][a{i}]acrossfade=d={xf}:c1=tri:c2=tri[x{i}]")
            last = f"x{i}"
        run(cmd + ["-filter_complex", ";".join(filters), "-map", f"[{last}]", out])
        write_result(key, {"audio": {"url": f"file://{out}"}, "duration": duration(out), "backend": "ace-step-1.5"})
    return None


def collect(batch=None):
    batch = batch or open(os.path.join(BATCHES, "last")).read().strip()
    folder = os.path.join(BATCHES, batch)
    plan = json.load(open(os.path.join(folder, "plan.json")))
    ref = f"{kaggle_user()}/{KERNEL_SLUG}"
    out = os.path.join(folder, "out")
    shutil.rmtree(out, ignore_errors=True)
    os.makedirs(out)
    r = kaggle("kernels", "output", ref, "-p", out, check=False)
    logs = kaggle("kernels", "logs", ref, check=False).stdout
    open(os.path.join(folder, "kernel.log"), "w").write(logs)
    found = {}
    for f in glob.glob(os.path.join(out, "**", "*"), recursive=True):
        stem, ext = os.path.splitext(os.path.basename(f))
        if os.path.isfile(f) and ext.lower() in (".png", ".jpg", ".jpeg", ".webp", ".mp4", ".wav", ".mp3", ".flac", ".m4a", ".ogg"):
            found[stem] = os.path.abspath(f)
    report, missing = {}, {}
    for key, p in plan.items():
        if os.path.exists(os.path.join(RESULTS, f"{key}.json")) and not os.path.exists(os.path.join(QUEUE, f"{key}.json")):
            report[key] = "already stored"
            continue
        problem = store(key, p, found)
        report[key] = problem or "stored"
        if problem:
            missing[key] = f"{p['kind']}: {problem}"
    log(f"batch {batch}: {sum(v != 'stored' and v != 'already stored' for v in report.values())} missing of {len(plan)}")
    print(json.dumps({"batch": batch, "stored": [k for k, v in report.items() if v == "stored"], "missing": missing,
                      "log": os.path.join(folder, "kernel.log")}, indent=1))
    return not missing


def run_kaggle(args):
    batch, folder, _plan, inputs = build_batch()
    ref = push_batch(folder, inputs)
    if "--no-wait" in args:
        print(json.dumps({"batch": batch, "kernel": ref, "next": "free_backend.py collect"}))
        return 0
    state = wait_kernel(ref)
    log(f"kernel finished: {state}")
    ok = collect(batch)
    return 0 if ok and state == "complete" else 1


def status():
    queued = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(QUEUE, "*.json")))]
    print(json.dumps({"queued": [{"key": j["key"], "kind": kind_of(j["endpoint"])} for j in queued],
                      "stored": len(glob.glob(os.path.join(RESULTS, "*.json")))}, indent=1))


if __name__ == "__main__":
    command = sys.argv[1] if len(sys.argv) > 1 else "status"
    if command == "submit":
        sys.exit(submit(sys.argv[2], sys.argv[3]))
    if command == "kaggle":
        sys.exit(run_kaggle(sys.argv[2:]))
    if command == "collect":
        sys.exit(0 if collect(sys.argv[2] if len(sys.argv) > 2 else None) else 1)
    status()
