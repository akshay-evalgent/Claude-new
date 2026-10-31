"""Quick QC on the rendered frames: motion per frame, still stretches, end hold.
usage: python3 -I qc.py frames 24"""
import sys, os, numpy as np
from PIL import Image

d = sys.argv[1]; fps = float(sys.argv[2]) if len(sys.argv) > 2 else 24
files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
prev = None; diffs = []
for f in files:
    im = np.asarray(Image.open(os.path.join(d, f)).convert('L').resize((135, 240)), dtype=np.float32)
    if prev is not None: diffs.append(float(np.abs(im - prev).mean()))
    prev = im
diffs = np.array(diffs)
print(f"frames {len(files)}  duration {len(files)/fps:.2f}s  mean luma diff {diffs.mean():.2f}/255  (human-made median 6.8, IQR 4.4-9.8)")
# still stretches: runs of frames with diff < 0.35
thr = 0.35; runs = []; start = None
for i, v in enumerate(diffs):
    if v < thr and start is None: start = i
    if (v >= thr or i == len(diffs) - 1) and start is not None:
        end = i if v >= thr else i + 1
        if (end - start) / fps >= 0.6: runs.append((start / fps, end / fps))
        start = None
print("still stretches >= 0.6 s:", [(f"{a:.2f}", f"{b:.2f}", f"{b-a:.2f}") for a, b in runs] or "none")
# end hold
k = 0
for v in diffs[::-1]:
    if v < thr: k += 1
    else: break
print(f"end hold (unchanged tail): {k/fps:.2f}s  (gate: <= 1.40 s)")
# hard cuts (big jumps)
cuts = [(i + 1) / fps for i, v in enumerate(diffs) if v > 12]
print("hard cuts (diff > 12):", [f"{c:.2f}" for c in cuts] or "none")
