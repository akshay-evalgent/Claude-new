"""POV film tools: Sana-Sprint stills -> depth -> handheld walking camera + sky swirl + shooting star.

python pov.py stills  SHOTS.json MODELS OUTDIR     # still_<id>.png + depth_<id>.npy
python pov.py shots   SHOTS.json OUTDIR            # <id>.mp4 for every CPU shot (1920x1080, 24 fps)
python pov.py video   IN.mp4 OUT.mp4 SECONDS SEED  # add the same handheld feel to an AI video clip
"""
import json
import math
import os
import subprocess
import sys

import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

OUT_W, OUT_H, FPS = 1920, 1080, 24
STEP_HZ = 1.8        # footfalls per second (slow walk)
torch.set_num_threads(os.cpu_count())


# ---------------------------------------------------------------- camera model
def interp(keys, t):
    """keys: [[t, v], ...] piecewise linear."""
    ts, vs = zip(*keys)
    return float(np.interp(t, ts, vs))


def handheld(t, walk, seed, amp=1.0):
    """Camera offset for a person holding a camera: (tx, ty) in normalized frame units (+ = right/down), roll in rad."""
    ph = np.random.default_rng(seed).uniform(0, 2 * np.pi, 8)
    s = math.sin(math.pi * STEP_HZ * t)
    bob = abs(s) - 2 / math.pi                                   # dips at each footfall
    tau = (t * STEP_HZ % 1.0) / STEP_HZ
    jolt = math.exp(-tau / 0.07) * math.sin(2 * math.pi * 8 * tau)  # heel-strike shudder
    tx = walk * 0.010 * s                                         # sway, one cycle per two steps
    ty = walk * (0.013 * bob + 0.0035 * jolt)
    roll = walk * 0.0055 * math.sin(math.pi * STEP_HZ * t + 0.6)
    tx += 0.0025 * math.sin(2 * math.pi * 0.23 * t + ph[0]) + 0.0012 * math.sin(2 * math.pi * 0.71 * t + ph[1]) \
        + 0.0005 * math.sin(2 * math.pi * 3.3 * t + ph[2])        # breathing + hand tremor
    ty += 0.0030 * math.sin(2 * math.pi * 0.27 * t + ph[3]) + 0.0010 * math.sin(2 * math.pi * 0.93 * t + ph[4]) \
        + 0.0005 * math.sin(2 * math.pi * 4.1 * t + ph[5])
    roll += 0.0015 * math.sin(2 * math.pi * 0.31 * t + ph[6]) + 0.0006 * math.sin(2 * math.pi * 1.7 * t + ph[7])
    return amp * tx, amp * ty, amp * roll


def footfalls(walk_keys, seconds, threshold=0.3):
    """Times of footfalls (same clock as handheld) while walking; for the sound design."""
    return [k / STEP_HZ for k in range(1, int(seconds * STEP_HZ) + 1) if interp(walk_keys, k / STEP_HZ) >= threshold]


def screen_grid(aspect):
    ys, xs = torch.meshgrid(torch.linspace(-1, 1, OUT_H), torch.linspace(-1, 1, OUT_W), indexing="ij")
    return torch.stack([xs, ys], -1)[None], aspect


def camera(q, aspect, t, walk, prog, spec, seed, amp=1.0, overscan=1.07):
    tx, ty, roll = handheld(t, walk, seed, amp)
    p = q / overscan
    x, y = p[..., 0] * aspect, p[..., 1]                          # rotate in square pixel space
    c, s = math.cos(roll), math.sin(roll)
    p = torch.stack([(c * x - s * y) / aspect, s * x + c * y], -1)
    pan = interp(spec.get("pan", [[0, 0], [99, 0]]), t)          # + = turn right
    tilt = interp(spec.get("tilt", [[0, 0], [99, 0]]), t)        # + = look up
    p = p + torch.tensor([tx + pan, ty - tilt])
    return p


def walk_warp(p, dep, zoom, par, iters=3):
    """Inverse warp for walking forward: near pixels (large d) grow faster than far ones."""
    out = p
    for _ in range(iters):
        d = F.grid_sample(dep, out, align_corners=True, padding_mode="border")[:, 0, :, :, None]
        out = p / (zoom + par * d)
    return out


def swirl(p, center, angle, aspect, radius=0.7):
    v = p - center
    vx, vy = v[..., 0] * aspect, v[..., 1]
    r2 = vx * vx + vy * vy
    a = angle * torch.exp(-r2 / (radius * radius))
    c, s = torch.cos(a), torch.sin(a)
    return center + torch.stack([(c * vx - s * vy) / aspect, s * vx + c * vy], -1)


def shooting_star(frame, mask, t, star):
    """Additive streak with a fading tail, only where the sky is. Coordinates are output pixels."""
    t0, dur = star["t"], star["dur"]
    u = (t - t0) / dur
    if not 0 <= u <= 1:
        return frame
    a, b = torch.tensor(star["from"], dtype=torch.float32), torch.tensor(star["to"], dtype=torch.float32)
    v = (b - a) / (b - a).norm()
    head = a + u * (b - a)
    L, sig = star.get("tail", 260.0), 1.3
    x0, x1 = int(max(0, min(head[0], head[0] - v[0] * L) - 20)), int(min(OUT_W, max(head[0], head[0] - v[0] * L) + 20))
    y0, y1 = int(max(0, min(head[1], head[1] - v[1] * L) - 20)), int(min(OUT_H, max(head[1], head[1] - v[1] * L) + 20))
    if x1 <= x0 or y1 <= y0:
        return frame
    ys, xs = torch.meshgrid(torch.arange(y0, y1, dtype=torch.float32), torch.arange(x0, x1, dtype=torch.float32), indexing="ij")
    rx, ry = xs - head[0], ys - head[1]
    along = -(rx * v[0] + ry * v[1])
    perp = (rx * v[1] - ry * v[0]).abs()
    tail = (1 - along / L).clamp(0, 1) * (along >= -2).float()
    core = torch.exp(-perp ** 2 / (2 * sig ** 2)) * tail
    glow = 0.25 * torch.exp(-perp ** 2 / (2 * (4 * sig) ** 2)) * tail
    inten = (core + glow) * math.sin(math.pi * u) * star.get("gain", 1.0)
    col = torch.tensor([0.85, 0.92, 1.0])[:, None, None]
    frame[0, :, y0:y1, x0:x1] += col * inten * mask[0, 0, y0:y1, x0:x1]
    return frame


def encoder(path):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OUT_W}x{OUT_H}",
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "14",
                             "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)


def emit(proc, frame):
    proc.stdin.write((frame[0].clamp(0, 1).permute(1, 2, 0).numpy() * 255 + 0.5).astype(np.uint8).tobytes())


# ---------------------------------------------------------------- stills
def cmd_stills(shots_path, models, outdir, only=None):
    from diffusers import SanaSprintPipeline
    from transformers import pipeline
    shots = json.load(open(shots_path))["shots"]
    pipe = SanaSprintPipeline.from_pretrained(os.path.join(models, "Sana_Sprint_0.6B_1024px_diffusers"),
                                              torch_dtype=torch.bfloat16)
    for s in shots:
        if s.get("source") != "cpu" or (only and s["id"] not in only):
            continue
        with torch.inference_mode():
            img = pipe(prompt=s["prompt"], num_inference_steps=2, height=768, width=1344,
                       generator=torch.Generator().manual_seed(s["seed"])).images[0]
        img.save(os.path.join(outdir, f"still_{s['id']}.png"))
        print("still", s["id"], flush=True)
    del pipe
    dp = pipeline("depth-estimation", model=os.path.join(models, "Depth-Anything-V2-Small-hf"), device="cpu")
    for s in shots:
        if s.get("source") != "cpu" or (only and s["id"] not in only):
            continue
        img = Image.open(os.path.join(outdir, f"still_{s['id']}.png")).convert("RGB")
        d = np.asarray(dp(img)["predicted_depth"].squeeze(), dtype=np.float32)
        d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        d = np.asarray(Image.fromarray(d).resize(img.size, Image.BICUBIC), np.float32)
        np.save(os.path.join(outdir, f"depth_{s['id']}.npy"), d)
        Image.fromarray((d.clip(0, 1) * 255).astype(np.uint8)).save(os.path.join(outdir, f"depth_{s['id']}.png"))
        print("depth", s["id"], flush=True)


# ---------------------------------------------------------------- shots
def cmd_shots(shots_path, outdir, only=None):
    shots = json.load(open(shots_path))["shots"]
    for s in shots:
        if s.get("source") != "cpu" or (only and s["id"] not in only):
            continue
        img = np.asarray(Image.open(os.path.join(outdir, f"still_{s['id']}.png")).convert("RGB"), np.float32) / 255
        d = np.load(os.path.join(outdir, f"depth_{s['id']}.npy"))
        src = torch.from_numpy(img).permute(2, 0, 1)[None]
        dep = torch.from_numpy(d)[None, None]
        aspect = img.shape[1] / img.shape[0]
        sky = ((s.get("sky_below", 0.10) - dep) / 0.06).clamp(0, 1)          # far = sky
        sky = F.avg_pool2d(sky, 9, 1, 4)
        lum = F.avg_pool2d(src.mean(1, keepdim=True) * sky, 81, 1, 40)
        idx = int(lum.flatten().argmax())
        cy, cx = divmod(idx, img.shape[1])
        center = torch.tensor([cx / (img.shape[1] - 1) * 2 - 1, cy / (img.shape[0] - 1) * 2 - 1])
        q, _ = screen_grid(aspect)
        n = int(round(s["seconds"] * FPS))
        walk_keys = s.get("walk", [[0, 1], [99, 1]])
        prog = 0.0  # cumulative walking, so the push-in stops when the walker stops
        enc = encoder(os.path.join(outdir, f"{s['id']}.mp4"))
        for i in range(n):
            t = i / FPS
            w = interp(walk_keys, t)
            p = camera(q, aspect, t, w, prog, s, s["seed"], amp=s.get("shake", 1.0))
            zoom = 1.0 + s.get("walk_zoom", 0.05) * prog / n
            par = s.get("walk_par", 0.06) * prog / n
            pf = walk_warp(p, dep, zoom, par)
            m = F.grid_sample(sky, pf, align_corners=True, padding_mode="border")
            fg = F.grid_sample(src, pf, mode="bicubic", align_corners=True, padding_mode="border")
            k = s.get("swirl", 0.0)
            if k:
                ps = swirl(pf, center, k * t, aspect)
                bg = F.grid_sample(src, ps, mode="bicubic", align_corners=True, padding_mode="border")
                frame = m * bg + (1 - m) * fg
            else:
                frame = fg
            for star in s.get("stars", []):
                frame = shooting_star(frame, m, t, star)
            emit(enc, frame)
            prog += w
        enc.stdin.close()
        enc.wait()
        print("shot", s["id"], n, "frames; galaxy core at", [round(float(v), 2) for v in center], flush=True)


def cmd_video(inp, out, seconds, seed, amp=0.55):
    """Decode an AI clip, add the handheld walk, upscale to 1920x1080."""
    probe = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                                     "stream=width,height", "-of", "csv=p=0", inp], text=True).strip().split(",")
    w, h = int(probe[0]), int(probe[1])
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", inp, "-vf", f"fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE)
    q, aspect = screen_grid(w / h)
    enc = encoder(out)
    n = int(round(float(seconds) * FPS))
    i = 0
    while i < n:
        buf = dec.stdout.read(w * h * 3)
        if len(buf) < w * h * 3:
            break
        src = torch.frombuffer(bytearray(buf), dtype=torch.uint8).view(h, w, 3).permute(2, 0, 1)[None].float() / 255
        p = camera(q, aspect, i / FPS, 1.0, 0, {}, int(seed), amp=amp, overscan=1.05)
        emit(enc, F.grid_sample(src, p, mode="bicubic", align_corners=True, padding_mode="border"))
        i += 1
    dec.stdout.close()
    dec.wait()
    enc.stdin.close()
    enc.wait()
    print("video", out, i, "frames", flush=True)


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "stills":
        cmd_stills(*sys.argv[2:5], set(sys.argv[5].split(",")) if len(sys.argv) > 5 else None)
    elif cmd == "shots":
        cmd_shots(sys.argv[2], sys.argv[3], set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None)
    elif cmd == "video":
        cmd_video(*sys.argv[2:6])
