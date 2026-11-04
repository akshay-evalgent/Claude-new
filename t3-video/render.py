#!/usr/bin/env python3
"""Render T3-Video shots inside a Kaggle job (GPU T4 x2, free tier).

    python render.py run --shots shots.json [--steps 15] [--budget-hours 11.3]

Stages run as subprocesses so RAM and VRAM are fully released between them:
  setup   pip extras, clone T3-Video at a pinned commit, download weights (~17.5 GB)
  encode  umt5-xxl text encoder on GPU 0 in fp16; every prompt -> ctx.pt (then exits)
  worker  one per GPU: Wan2.1-1.3B DiT + VAE in fp16 with lowmem.py, shots split
          round-robin, so two T4s render two shots at once

Outputs land in --out (default /kaggle/working, which Kaggle keeps):
  renders/<id>.mp4   native 2176x3840, 81 frames, 30 fps (2.7 s)
  renders/<id>.json  prompt, seed, steps, timings, peak VRAM
  latents/<id>.pt    final latents, so the VAE decode can be redone without denoising
  run.log            everything printed
"""
import argparse
import contextlib
import fcntl
import json
import os
import shutil
import subprocess
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
T3_REPO = "https://github.com/zhangzjn/T3-Video.git"
T3_COMMIT = "09454d4b7b2b7dd564f5ffd40831bb6a4634566d"
BASE = "Wan-AI/Wan2.1-T2V-1.3B"
T3_WEIGHTS = ("APRIL-AIGC/T3-Video", "T3-Video-Wan2.1-T2V-1.3B.safetensors")
HEIGHT, WIDTH, FRAMES, FPS = 2176, 3840, 81, 30  # the only shape the released weights support
# Negative prompt from the official infer_multi_gpu.py
NEGATIVE = ("色调艳丽，过曝，静态，细节模糊不清，字幕，风格，作品，画作，画面，静止，整体发灰，最差质量，低质量，JPEG压缩残留，丑陋的，"
            "残缺的，多余的手指，画得不好的手部，画得不好的脸部，畸形的，毁容的，形态畸形的肢体，手指融合，静止不动的画面，杂乱的背景，"
            "三条腿，背景人很多，倒着走")
DEFAULT_STEP_SECONDS = 480    # T4 guess until the first step is measured
DEFAULT_DECODE_SECONDS = 3600  # 4K tiled VAE decode guess until measured


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def ram_total_gib():
    with open("/proc/meminfo") as f:
        return int(f.readline().split()[1]) / 2 ** 20


@contextlib.contextmanager
def decode_slot(work):
    """A 4K decode holds ~10 GB of frames in CPU RAM; on a ~30 GB Kaggle box, decode one shot at a time."""
    if ram_total_gib() >= 40:
        yield
        return
    with open(os.path.join(work, "decode.lock"), "w") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(f, fcntl.LOCK_UN)


def sh(cmd, **kw):
    log("$", cmd if isinstance(cmd, str) else " ".join(cmd))
    subprocess.run(cmd, shell=isinstance(cmd, str), check=True, **kw)


# ------------------------------------------------------------------ setup
def setup(work):
    sh([sys.executable, "-m", "pip", "install", "-q", "modelscope", "ftfy", "einops", "sentencepiece",
        "imageio", "imageio-ffmpeg", "safetensors", "regex"])
    src = os.path.join(work, "T3-Video")
    if not os.path.isdir(os.path.join(src, "diffsynth")):
        sh(["git", "clone", "-q", T3_REPO, src])
        sh(["git", "-C", src, "checkout", "-q", T3_COMMIT])
    from huggingface_hub import hf_hub_download, snapshot_download
    wd = os.path.join(work, "weights")
    t0 = time.time()
    w = {
        "vae": hf_hub_download(BASE, "Wan2.1_VAE.pth", local_dir=f"{wd}/base"),
        "dit": hf_hub_download(BASE, "diffusion_pytorch_model.safetensors", local_dir=f"{wd}/base"),
        "t3": hf_hub_download(*T3_WEIGHTS, local_dir=f"{wd}/t3"),
        "t5": hf_hub_download(BASE, "models_t5_umt5-xxl-enc-bf16.pth", local_dir=f"{wd}/base"),
    }
    snapshot_download(BASE, allow_patterns=["google/umt5-xxl/*"], ignore_patterns=["*.msgpack", "*.h5"],
                      local_dir=f"{wd}/base")
    w["tok"] = os.path.join(wd, "base", "google", "umt5-xxl")
    log(f"weights ready in {time.time() - t0:.0f}s")
    return src, w


# ------------------------------------------------------------------ shared
def import_t3(job):
    sys.path.insert(0, job["t3_src"])
    sys.path.insert(0, HERE)
    import torch
    from diffsynth.models import wan_video_dit as m
    if torch.cuda.get_device_capability()[0] < 8:  # T4 is sm75: no FlashAttention 2/3, no bf16
        m.FLASH_ATTN_3_AVAILABLE = m.FLASH_ATTN_2_AVAILABLE = m.SAGE_ATTN_AVAILABLE = False
    import lowmem
    lowmem.CFG["log"] = log
    lowmem.apply()
    from diffsynth.pipelines.wan_video_new import WanVideoPipeline, ModelConfig
    return torch, WanVideoPipeline, ModelConfig


# ------------------------------------------------------------------ encode
def encode(job):
    torch, WanVideoPipeline, ModelConfig = import_t3(job)
    w = job["weights"]
    pipe = WanVideoPipeline.from_pretrained(
        torch_dtype=torch.float16, device="cuda", model_configs=[ModelConfig(path=w["t5"])],
        tokenizer_config=ModelConfig(path=w["tok"]), redirect_common_files=False)
    prompts = sorted({s["prompt"] for s in job["shots"]} | {job["negative"]})
    ctx = {}
    with torch.no_grad():
        for p in prompts:
            e = pipe.prompter.encode_prompt(p, positive=True, device="cuda")
            if not torch.isfinite(e).all():
                raise RuntimeError(f"text encoder produced NaN/inf in fp16 for: {p[:80]}")
            ctx[p] = e.to("cpu")
    torch.save(ctx, job["ctx_path"])
    log(f"encoded {len(prompts)} prompts -> {job['ctx_path']}, shape {tuple(next(iter(ctx.values())).shape)}")


# ------------------------------------------------------------------ worker
class OutOfTime(Exception):
    pass


class StepClock:
    """progress_bar_cmd for the pipeline: logs each step, aborts early if the shot cannot finish in time."""

    def __init__(self, shot_id, deadline, decode_s, torch):
        self.shot_id, self.deadline, self.decode_s, self.torch = shot_id, deadline, decode_s, torch
        self.step_s = None

    def __call__(self, timesteps):
        n, t0 = len(timesteps), time.time()
        for i, ts in enumerate(timesteps):
            yield ts
            done = i + 1
            self.step_s = (time.time() - t0) / done
            peak = self.torch.cuda.max_memory_allocated() / 2 ** 30
            left = self.step_s * (n - done) + self.decode_s
            log(f"[{self.shot_id}] step {done}/{n}  {self.step_s:.0f}s/step  peak {peak:.1f} GiB  "
                f"~{left / 60:.0f} min left")
            if done < n and time.time() + left > self.deadline:
                raise OutOfTime(f"needs ~{left / 60:.0f} more min, past the session deadline")


def worker(job, gpu):
    torch, WanVideoPipeline, ModelConfig = import_t3(job)
    from diffsynth import load_state_dict
    from diffsynth.data.video import save_video
    w = job["weights"]
    out_dir, lat_dir = os.path.join(job["out"], "renders"), os.path.join(job["out"], "latents")
    os.makedirs(out_dir, exist_ok=True)
    os.makedirs(lat_dir, exist_ok=True)
    shots = job["shots"][gpu::job["num_gpus"]]
    log(f"[gpu{gpu}] {torch.cuda.get_device_name()}: shots {[s['id'] for s in shots]}")

    pipe = WanVideoPipeline.from_pretrained(
        torch_dtype=torch.float16, device="cuda",
        model_configs=[ModelConfig(path=w["dit"]), ModelConfig(path=w["vae"])],
        tokenizer_config=ModelConfig(path=w["tok"]), redirect_common_files=False)
    pipe.dit.load_state_dict(load_state_dict(w["t3"]))  # T3-Video weights over the base architecture
    ctx = torch.load(job["ctx_path"])
    pipe.prompter.encode_prompt = lambda prompt, positive=True, device="cuda": ctx[prompt].to(device, torch.float16)
    open(os.path.join(job["work"], f"ready{gpu}"), "w").close()
    log(f"[gpu{gpu}] pipeline ready, {torch.cuda.memory_allocated() / 2 ** 30:.1f} GiB resident")

    orig_decode = pipe.vae.decode
    state = {}

    def decode(latents, device, **kw):
        torch.save(latents.detach().to("cpu", torch.float16), state["latent_path"])
        if not torch.isfinite(latents).all():
            raise RuntimeError("DiT produced NaN/inf latents in fp16")
        state["enter_decode"]()  # held until the mp4 is written
        t0 = time.time()
        video = orig_decode(latents, device, **kw)
        if not torch.isfinite(video).all():
            log("fp16 VAE decode produced NaN/inf; decoding again in fp32")
            del video
            pipe.vae.to(torch.float32)
            video = orig_decode(latents.float(), device, **kw)
            pipe.vae.to(torch.float16)
        state["decode_s"] = time.time() - t0
        return video

    pipe.vae.decode = decode
    step_s, decode_s = DEFAULT_STEP_SECONDS, DEFAULT_DECODE_SECONDS
    for shot in shots:
        sid, steps = shot["id"], int(shot.get("steps", job["steps"]))
        mp4 = os.path.join(out_dir, f"{sid}.mp4")
        if os.path.exists(mp4):
            continue
        need = step_s * steps + decode_s * 1.2 + 300
        if time.time() + need > job["deadline"]:
            log(f"[gpu{gpu}] stopping before {sid}: needs ~{need / 3600:.1f} h, not enough session time left")
            break
        log(f"[gpu{gpu}] {sid}: seed {shot['seed']}, {steps} steps :: {shot['prompt'][:100]}")
        state["latent_path"] = os.path.join(lat_dir, f"{sid}.pt")
        clock = StepClock(sid, job["deadline"], decode_s * 1.2 + 300, torch)
        torch.cuda.reset_peak_memory_stats()
        t0 = time.time()
        try:
            with contextlib.ExitStack() as stack:
                state["enter_decode"] = lambda: stack.enter_context(decode_slot(job["work"]))
                frames = pipe(
                    prompt=shot["prompt"], negative_prompt=job["negative"], seed=int(shot["seed"]),
                    height=HEIGHT, width=WIDTH, num_frames=FRAMES, tiled=True,
                    tile_size=(68, 120), tile_stride=(34, 60),  # official 4K tiling (ratio 2)
                    cfg_scale=float(shot.get("cfg_scale", 5.0)), cfg_merge=False,
                    num_inference_steps=steps, progress_bar_cmd=clock)
                save_video(frames, mp4 + ".part.mp4", fps=FPS, quality=8)
                del frames
            os.replace(mp4 + ".part.mp4", mp4)
        except OutOfTime as e:
            log(f"[gpu{gpu}] {sid} abandoned: {e}")
            break
        except Exception:
            log(f"[gpu{gpu}] {sid} FAILED:\n{traceback.format_exc()}")
            torch.cuda.empty_cache()
            continue
        step_s = clock.step_s or step_s
        decode_s = state.get("decode_s", decode_s)
        meta = dict(shot, steps=steps, gpu=torch.cuda.get_device_name(), seconds_total=round(time.time() - t0),
                    seconds_per_step=round(step_s, 1), seconds_decode=round(decode_s),
                    peak_vram_gib=round(torch.cuda.max_memory_allocated() / 2 ** 30, 2),
                    size=f"{WIDTH}x{HEIGHT}", frames=FRAMES, fps=FPS, t3_commit=T3_COMMIT)
        with open(os.path.join(out_dir, f"{sid}.json"), "w") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
        log(f"[gpu{gpu}] {sid} done in {meta['seconds_total'] / 60:.0f} min -> {mp4}")


# ------------------------------------------------------------------ run
def run(args):
    t_start = time.time()
    with open(args.shots) as f:
        shots = json.load(f)["shots"]
    for s in shots:
        assert {"id", "prompt", "seed"} <= s.keys(), s
    work = args.work
    os.makedirs(work, exist_ok=True)
    os.makedirs(args.out, exist_ok=True)
    du = shutil.disk_usage(work)
    log(f"disk free in {work}: {du.free / 2 ** 30:.0f} GiB")
    sh("nvidia-smi --query-gpu=name,memory.total --format=csv")
    gpus = subprocess.check_output(["nvidia-smi", "-L"], text=True).strip().splitlines()
    num_gpus = max(1, min(len(gpus), len(shots)))
    src, weights = setup(work)
    job = dict(shots=shots, steps=args.steps, negative=NEGATIVE, weights=weights, t3_src=src, work=work,
               out=args.out, num_gpus=num_gpus, ctx_path=os.path.join(work, "ctx.pt"),
               deadline=t_start + args.budget_hours * 3600)
    job_path = os.path.join(work, "job.json")
    with open(job_path, "w") as f:
        json.dump(job, f, ensure_ascii=False)
    env = dict(os.environ, PYTORCH_CUDA_ALLOC_CONF="expandable_segments:True")
    me = os.path.abspath(__file__)
    sh([sys.executable, me, "encode", "--job", job_path], env=dict(env, CUDA_VISIBLE_DEVICES="0"))
    procs = []
    for g in range(num_gpus):
        if g:  # stagger model loading so two workers never read 9 GB of weights into RAM at once
            ready, t0 = os.path.join(work, "ready0"), time.time()
            while not os.path.exists(ready) and time.time() - t0 < 900 and procs[0].poll() is None:
                time.sleep(5)
        procs.append(subprocess.Popen([sys.executable, me, "worker", "--job", job_path, "--gpu", str(g)],
                                      env=dict(env, CUDA_VISIBLE_DEVICES=str(g))))
    codes = [p.wait() for p in procs]
    rdir = os.path.join(args.out, "renders")
    os.makedirs(rdir, exist_ok=True)
    done = sorted(f[:-4] for f in os.listdir(rdir) if f.endswith(".mp4") and not f.endswith(".part.mp4"))
    summary = dict(done=done, missing=[s["id"] for s in shots if s["id"] not in done], worker_exit_codes=codes,
                   hours=round((time.time() - t_start) / 3600, 2))
    with open(os.path.join(args.out, "summary.json"), "w") as f:
        json.dump(summary, f, indent=2)
    log("summary:", json.dumps(summary))
    if any(codes) and not done:
        sys.exit(1)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--shots", required=True)
    r.add_argument("--steps", type=int, default=15, help="denoising steps (paper: 50; demo default: 15)")
    r.add_argument("--budget-hours", type=float, default=11.3, help="Kaggle stops sessions at 12 h")
    r.add_argument("--out", default="/kaggle/working")
    r.add_argument("--work", default="/tmp/t3")
    e = sub.add_parser("encode")
    e.add_argument("--job", required=True)
    wk = sub.add_parser("worker")
    wk.add_argument("--job", required=True)
    wk.add_argument("--gpu", type=int, required=True)
    args = ap.parse_args()
    if args.cmd == "run":
        run(args)
    else:
        with open(args.job) as f:
            job = json.load(f)
        encode(job) if args.cmd == "encode" else worker(job, args.gpu)


if __name__ == "__main__":
    main()
