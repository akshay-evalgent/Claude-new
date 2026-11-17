"""Build the Kaggle script for a batch of paintings.  usage: python3 make_batch.py shots.json  (then: kaggle kernels push -p image-batch)"""
import json, sys
job = json.load(open(sys.argv[1]))
open("image-batch/run.py", "w").write('''import subprocess, sys, json
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-U", "diffusers", "transformers", "accelerate"], check=False)
import torch
from diffusers import AutoPipelineForText2Image, DPMSolverMultistepScheduler
JOB = json.loads(%r)
pipe = AutoPipelineForText2Image.from_pretrained("Lykon/dreamshaper-xl-v2-turbo", torch_dtype=torch.float16, variant="fp16").to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, algorithm_type="sde-dpmsolver++", use_karras_sigmas=True)
for name, prompt in JOB["shots"].items():
    for v in range(JOB["variants"]):
        g = torch.Generator("cuda").manual_seed(1000 + v * 77 + len(name) + sum(map(ord, name)))
        im = pipe(JOB["style"] + ", " + prompt, negative_prompt=JOB["negative"], width=768, height=1344, num_inference_steps=8, guidance_scale=2.0, generator=g).images[0]
        im.save(f"{name}-v{v}.jpg", quality=94); print("done", name, v, flush=True)
''' % json.dumps(job))
print("wrote image-batch/run.py with", len(job["shots"]), "shots")
