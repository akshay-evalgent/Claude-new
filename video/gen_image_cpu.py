"""Generate images locally on CPU with SDXL-Turbo (no quota, slower).
usage: python3 gen_image_cpu.py shots.txt outdir   (shots.txt: one 'name|prompt' per line; STYLE env var is prepended)"""
import os, sys, torch
from diffusers import AutoPipelineForText2Image
torch.set_num_threads(os.cpu_count())
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=getattr(torch, os.environ.get("DTYPE", "bfloat16")))
style = os.environ.get("STYLE", "")
for i, line in enumerate(open(sys.argv[1])):
    if "|" not in line: continue
    name, prompt = line.strip().split("|", 1)
    for v in range(int(os.environ.get("VARIANTS", 1))):     # VARIANTS>1 writes name-v0, name-v1, ... to pick from
        out = f"{sys.argv[2]}/{name}" + (f"-v{v}" if os.environ.get("VARIANTS") else "") + ".webp"
        if os.path.exists(out): continue
        g = torch.Generator().manual_seed(int(os.environ.get("SEED", 40)) + i * 101 + v * 7)
        im = pipe(f"{style}, {prompt}", width=576, height=1024, num_inference_steps=2, guidance_scale=0.0, generator=g).images[0]
        im.save(out); print("wrote", out, flush=True)
