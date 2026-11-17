"""Estimate a depth map for each image (runs on CPU, free).  usage: python3 gen_depth.py art/a.webp art/b.webp ..."""
import sys
from PIL import Image
from transformers import pipeline
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
for p in sys.argv[1:]:
    im = Image.open(p).convert("RGB")
    out = p.rsplit(".", 1)[0] + "-depth.png"
    pipe(im)["depth"].resize(im.size).save(out); print("wrote", out)
