"""Generate images locally on CPU with SDXL-Turbo (no quota, slower).
usage: python3 gen_image_cpu.py shots.txt outdir   (shots.txt: one 'name|prompt' per line; STYLE env var is prepended)"""
import os, sys, torch
from diffusers import AutoPipelineForText2Image
torch.set_num_threads(os.cpu_count())
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float32)
style = os.environ.get("STYLE", "")
for i, line in enumerate(open(sys.argv[1])):
    if "|" not in line: continue
    name, prompt = line.strip().split("|", 1)
    out = f"{sys.argv[2]}/{name}.webp"
    if os.path.exists(out): continue
    g = torch.Generator().manual_seed(int(os.environ.get("SEED", 40)) + i)
    im = pipe(f"{style}, {prompt}", width=576, height=1024, num_inference_steps=2, guidance_scale=0.0, generator=g).images[0]
    im.save(out); print("wrote", out, flush=True)
