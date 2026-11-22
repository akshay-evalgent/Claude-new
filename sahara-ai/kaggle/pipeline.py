# Runs ON KAGGLE (2x T4). AI shots for "Lost in the Sahara", all open-weight models through ComfyUI + ComfyUI-GGUF.
#   MODE "keyframes": Qwen-Image Q4_K_M + Lightning 8-step LoRA -> CANDIDATES stills per shot
#   MODE "clips"    : Wan2.2-I2V-A14B Q4_K_M (high+low noise) + Lightning 4-step LoRAs -> 49-frame clips from the
#                     approved stills (dataset /kaggle/input/<KEYFRAME_DATASET>), RIFE x2 to 32 fps, ESRGAN x2 upscale
# One ComfyUI server per GPU; a worker thread per server pulls jobs from a shared queue.
import json, os, queue, shutil, subprocess, sys, threading, time, traceback, urllib.request, glob

MODE = "__MODE__"
ONLY = __ONLY__                 # list of shot ids to run, or None for all
CANDIDATES = __CANDIDATES__
SEED0 = __SEED0__
KEYFRAME_DATASET = "__KFDS__"
DATA = json.loads(r'''__SHOTS__''')
W, ROOT, T0 = "/kaggle/working", "/tmp/cf", time.time()
VW, VH, FRAMES = 480, 832, 49
report = {"mode": MODE, "stages": {}, "jobs": {}, "errors": []}


def log(*a):
    print(f"[{time.time() - T0:7.0f}s]", *a, flush=True)


def save():
    json.dump(report, open(f"{W}/report.json", "w"), indent=1)


def stage(name, t):
    report["stages"][name] = round(time.time() - t); save()


log("gpus", subprocess.run("nvidia-smi -L", shell=True, capture_output=True, text=True).stdout)
t = time.time()
subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/comfyanonymous/ComfyUI", ROOT], check=True)
subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/city96/ComfyUI-GGUF", f"{ROOT}/custom_nodes/ComfyUI-GGUF"], check=True)
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", f"{ROOT}/requirements.txt", "gguf", "huggingface-hub<2.0"], check=True)
VFI_OK = False
if MODE == "clips":
    try:
        subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/Fannovel16/ComfyUI-Frame-Interpolation",
                        f"{ROOT}/custom_nodes/ComfyUI-Frame-Interpolation"], check=True)
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "kornia", "einops", "opencv-python-headless"], check=True)
        VFI_OK = True
    except Exception as e:
        report["errors"].append("vfi install: " + str(e))
stage("install", t)

from huggingface_hub import hf_hub_download  # noqa: E402
FILES = {
    "keyframes": [
        ("city96/Qwen-Image-gguf", "qwen-image-Q4_K_M.gguf", "unet"),
        ("Comfy-Org/Qwen-Image", "split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors", "text_encoders"),
        ("Comfy-Org/Qwen-Image", "split_files/vae/qwen_image_vae.safetensors", "vae"),
        ("lightx2v/Qwen-Image-Lightning", "Qwen-Image-Lightning-8steps-V2.0-bf16.safetensors", "loras"),
    ],
    "clips": [
        ("QuantStack/Wan2.2-I2V-A14B-GGUF", "HighNoise/Wan2.2-I2V-A14B-HighNoise-Q4_K_M.gguf", "unet"),
        ("QuantStack/Wan2.2-I2V-A14B-GGUF", "LowNoise/Wan2.2-I2V-A14B-LowNoise-Q4_K_M.gguf", "unet"),
        ("Comfy-Org/Wan-2.1", "split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors", "text_encoders"),
        ("Comfy-Org/Wan-2.1", "split_files/vae/wan_2.1_vae.safetensors", "vae"),
        ("lightx2v/Wan2.2-Lightning", "Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/high_noise_model.safetensors", "loras"),
        ("lightx2v/Wan2.2-Lightning", "Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/low_noise_model.safetensors", "loras"),
        ("ai-forever/Real-ESRGAN", "RealESRGAN_x2.pth", "upscale_models"),
    ],
}
N = {}
t = time.time()
for repo, fn, kind in FILES[MODE]:
    p = hf_hub_download(repo, fn, cache_dir="/tmp/hf")
    name = (repo.split("/")[-1][:10] + "_" + os.path.basename(fn)) if kind == "loras" else os.path.basename(fn)
    d = f"{ROOT}/models/{kind}/{name}"; os.makedirs(os.path.dirname(d), exist_ok=True)
    if not os.path.exists(d): os.symlink(p, d)
    N[fn] = name; log("got", fn, round(os.path.getsize(p) / 1e9, 2), "GB")
stage("download", t)


def start_server(gpu, port):
    out = f"/tmp/out{gpu}"; os.makedirs(out, exist_ok=True)
    proc = subprocess.Popen([sys.executable, "main.py", "--listen", "127.0.0.1", "--port", str(port), "--cuda-device", str(gpu),
                             "--output-directory", out, "--disable-auto-launch"], cwd=ROOT,
                            stdout=open(f"{W}/comfy{gpu}.log", "w"), stderr=subprocess.STDOUT)
    for _ in range(300):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/system_stats", timeout=2); return proc
        except Exception:
            if proc.poll() is not None: raise RuntimeError(f"server {gpu} exited")
            time.sleep(2)
    raise RuntimeError(f"server {gpu} did not start")


def post(port, path, data):
    req = urllib.request.Request(f"http://127.0.0.1:{port}{path}", data=json.dumps(data).encode(), headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=60).read() or b"{}")


def run_prompt(port, wf, label):
    pid = post(port, "/prompt", {"prompt": wf})["prompt_id"]; t = time.time()
    while True:
        h = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/history/{pid}", timeout=30).read())
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error": raise RuntimeError(f"{label} failed: {json.dumps(st)[:1500]}")
            if st.get("completed"): return h[pid], time.time() - t
        if time.time() - t > 3600: raise RuntimeError(label + " timed out")
        time.sleep(3)


def outputs(hist, out):
    fs = []
    for node in hist["outputs"].values():
        for im in node.get("images", []): fs.append(os.path.join(out, im.get("subfolder", ""), im["filename"]))
    return sorted(fs)


def prompt_text(s, key):
    return s[key].replace("HERO", DATA["hero"]) + " " + DATA["style"]


def wf_keyframe(text, seed, prefix):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": N["qwen-image-Q4_K_M.gguf"]}},
        "2": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": N["Qwen-Image-Lightning-8steps-V2.0-bf16.safetensors"], "strength_model": 1.0}},
        "3": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["2", 0], "shift": 3.1}},
        "4": {"class_type": "CLIPLoader", "inputs": {"clip_name": N["split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors"], "type": "qwen_image", "device": "default"}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": text}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["4", 0], "text": ""}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 768, "height": 1344, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["3", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
                                                    "seed": seed, "steps": 8, "cfg": 1.0, "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAELoader", "inputs": {"vae_name": N["split_files/vae/qwen_image_vae.safetensors"]}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["9", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }


NEG_VID = ("static, frozen, still image, slideshow, blurry, distorted face, deformed hands, extra limbs, extra fingers, morphing, "
           "flicker, cartoon, anime, text, subtitles, watermark, logo, low quality")


def wf_clip(image, text, prefix, seed, vfi):
    lo = N["Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/low_noise_model.safetensors"]
    hi = N["Wan2.2-I2V-A14B-4steps-lora-rank64-Seko-V1/high_noise_model.safetensors"]
    wf = {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": N["HighNoise/Wan2.2-I2V-A14B-HighNoise-Q4_K_M.gguf"]}},
        "2": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": N["LowNoise/Wan2.2-I2V-A14B-LowNoise-Q4_K_M.gguf"]}},
        "3": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["1", 0], "lora_name": hi, "strength_model": 1.0}},
        "4": {"class_type": "LoraLoaderModelOnly", "inputs": {"model": ["2", 0], "lora_name": lo, "strength_model": 1.0}},
        "5": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["3", 0], "shift": 5.0}},
        "6": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["4", 0], "shift": 5.0}},
        "7": {"class_type": "CLIPLoader", "inputs": {"clip_name": N["split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors"], "type": "wan", "device": "default"}},
        "8": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["7", 0], "text": text}},
        "9": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["7", 0], "text": NEG_VID}},
        "10": {"class_type": "VAELoader", "inputs": {"vae_name": N["split_files/vae/wan_2.1_vae.safetensors"]}},
        "11": {"class_type": "LoadImage", "inputs": {"image": image}},
        "11b": {"class_type": "ImageScale", "inputs": {"image": ["11", 0], "upscale_method": "lanczos", "width": VW, "height": VH, "crop": "center"}},
        "12": {"class_type": "WanImageToVideo", "inputs": {"positive": ["8", 0], "negative": ["9", 0], "vae": ["10", 0], "start_image": ["11b", 0],
                                                            "width": VW, "height": VH, "length": FRAMES, "batch_size": 1}},
        "13": {"class_type": "KSamplerAdvanced", "inputs": {"model": ["5", 0], "add_noise": "enable", "noise_seed": seed, "steps": 4, "cfg": 1.0,
                                                             "sampler_name": "euler", "scheduler": "simple", "positive": ["12", 0], "negative": ["12", 1],
                                                             "latent_image": ["12", 2], "start_at_step": 0, "end_at_step": 2, "return_with_leftover_noise": "enable"}},
        "14": {"class_type": "KSamplerAdvanced", "inputs": {"model": ["6", 0], "add_noise": "disable", "noise_seed": seed, "steps": 4, "cfg": 1.0,
                                                             "sampler_name": "euler", "scheduler": "simple", "positive": ["12", 0], "negative": ["12", 1],
                                                             "latent_image": ["13", 0], "start_at_step": 2, "end_at_step": 10000, "return_with_leftover_noise": "disable"}},
        "15": {"class_type": "VAEDecode", "inputs": {"samples": ["14", 0], "vae": ["10", 0]}},
        "17": {"class_type": "UpscaleModelLoader", "inputs": {"model_name": "RealESRGAN_x2.pth"}},
    }
    src = ["15", 0]
    if vfi:
        wf["16"] = {"class_type": "RIFE VFI", "inputs": {"ckpt_name": "rife47.pth", "frames": ["15", 0], "clear_cache_after_n_frames": 10,
                                                         "multiplier": 2, "fast_mode": True, "ensemble": True, "scale_factor": 1.0}}
        src = ["16", 0]
    wf["18"] = {"class_type": "ImageUpscaleWithModel", "inputs": {"upscale_model": ["17", 0], "image": src}}
    wf["19"] = {"class_type": "SaveImage", "inputs": {"images": ["18", 0], "filename_prefix": prefix}}
    return wf


shots = [s for s in DATA["shots"] if ONLY is None or s["id"] in ONLY]
jobs = queue.Queue()
if MODE == "keyframes":
    os.makedirs(f"{W}/keyframes", exist_ok=True)
    for s in shots:
        for c in range(CANDIDATES): jobs.put((s, c))
else:
    os.makedirs(f"{W}/clips", exist_ok=True)
    for s in shots: jobs.put((s, 0))
lock = threading.Lock()


def worker(gpu, port):
    global VFI_OK
    out = f"/tmp/out{gpu}"
    while True:
        try:
            s, c = jobs.get_nowait()
        except queue.Empty:
            return
        try:
            if MODE == "keyframes":
                tag = f"{s['id']}_{c}"
                hist, dt = run_prompt(port, wf_keyframe(prompt_text(s, "image"), SEED0 + 1000 * c + int(s["id"][1:]), tag), tag)
                shutil.copy(outputs(hist, out)[-1], f"{W}/keyframes/{tag}.png")
            else:
                tag = s["id"]
                src = glob.glob(f"/kaggle/input/**/{s['id']}.png", recursive=True)[0]
                shutil.copy(src, f"{ROOT}/input/{s['id']}.png")
                try:
                    hist, dt = run_prompt(port, wf_clip(f"{s['id']}.png", prompt_text(s, "motion"), tag, SEED0 + int(s["id"][1:]), VFI_OK), tag)
                except RuntimeError as e:
                    if VFI_OK and "RIFE" in str(e):
                        with lock: VFI_OK = False; report["errors"].append("vfi disabled: " + str(e)[:600])
                        hist, dt = run_prompt(port, wf_clip(f"{s['id']}.png", prompt_text(s, "motion"), tag, SEED0 + int(s["id"][1:]), False), tag)
                    else:
                        raise
                frames = [p for p in outputs(hist, out) if os.path.basename(p).startswith(tag)]
                fdir = f"/tmp/frames_{tag}"; os.makedirs(fdir, exist_ok=True)
                for k, p in enumerate(frames): shutil.move(p, f"{fdir}/{k:04d}.png")
                fps = 32 if len(frames) > FRAMES + 10 else 16
                subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-i", f"{fdir}/%04d.png", "-c:v", "libx264", "-crf", "13",
                                "-preset", "slow", "-pix_fmt", "yuv420p", f"{W}/clips/{tag}.mp4"], check=True)
                shutil.rmtree(fdir)
            with lock:
                report["jobs"][tag] = {"seconds": round(dt), "gpu": gpu}; save()
            log(MODE, tag, "gpu", gpu, round(dt), "s")
        except Exception as e:
            with lock:
                report["errors"].append(f"gpu{gpu} {s['id']}: {traceback.format_exc()[-1500:]}"); save()
            log("ERROR", gpu, s["id"], str(e)[:300])
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/system_stats", timeout=5)
            except Exception:                   # this server is gone: hand the job back to the other one and stop
                jobs.put((s, c)); return


try:
    t = time.time()
    ports = []
    for gpu in (0, 1):
        try:
            start_server(gpu, 8188 + gpu); ports.append((gpu, 8188 + gpu))
        except Exception as e:
            report["errors"].append(f"server {gpu}: {e}")
    stage("servers", t)
    th = [threading.Thread(target=worker, args=p) for p in ports]
    for x in th: x.start()
    for x in th: x.join()
    report["left"] = jobs.qsize(); report["vfi"] = VFI_OK
    report["ok"] = True
except Exception:
    report["errors"].append(traceback.format_exc()[-2000:])
finally:
    report["total_s"] = round(time.time() - T0); save()
    log("DONE", json.dumps(report)[:3000])
