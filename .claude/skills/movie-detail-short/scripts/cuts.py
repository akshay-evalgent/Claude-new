# cuts.py <video> : frame-difference cut detection at 30 fps on a small greyscale copy
import subprocess, sys, numpy as np
f = sys.argv[1]; W, H = 108, 192
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", f"fps=30,scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
thr = max(12.0, np.percentile(d, 90) * 1.5)
cuts = [0.0]
for i, v in enumerate(d):
    t = (i + 1) / 30
    if v > thr and t - cuts[-1] > 0.15: cuts.append(round(t, 3))
dur = len(fr) / 30
segs = np.diff(cuts + [dur])
print(f"{f}: dur {dur:.2f}s  cuts {len(cuts)-1}  shots {len(segs)}  median shot {np.median(segs):.2f}s  min {segs.min():.2f} max {segs.max():.2f}")
print("  cut times:", " ".join(f"{c:.2f}" for c in cuts[1:]))
# motion inside shots (zoom/pan?) : mean diff excluding cut frames
mask = np.ones(len(d), bool)
for c in cuts[1:]:
    i = int(round(c * 30)) - 1; mask[max(0, i-1):i+2] = False
print(f"  in-shot motion (mean abs diff): median {np.median(d[mask]):.2f}  p90 {np.percentile(d[mask], 90):.2f}")
