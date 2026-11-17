"""Generate one image with the free FLUX.1-schnell Space on Hugging Face.
usage: python3 gen_image.py "prompt" out.png [seed] [width height]"""
import os, shutil, sys
from gradio_client import Client
prompt, out = sys.argv[1], sys.argv[2]
seed = int(sys.argv[3]) if len(sys.argv) > 3 else 1
w, h = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (768, 1344)
space = os.environ.get("IMAGE_SPACE", "black-forest-labs/FLUX.1-schnell")
c = Client(space, token=os.environ.get("HF_TOKEN"), verbose=False)
res, _ = c.predict(prompt=prompt, seed=seed, randomize_seed=False, width=w, height=h, num_inference_steps=4, api_name="/infer")
shutil.copy(res if isinstance(res, str) else res["path"], out); print("wrote", out)
