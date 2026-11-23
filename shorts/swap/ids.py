import numpy as np, cv2, glob, subprocess, collections
W, H = 960, 540
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "seg.mkv", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
g = fr.astype(np.float32).mean(3)
d = np.abs(np.diff(g, axis=0)).mean((1, 2))
cuts = [i + 1 for i, v in enumerate(d) if v > 25]
print("frames", len(fr), "cuts at", cuts)
np.save("frames_small.npy", fr)
stats = collections.defaultdict(list)
for i in range(len(glob.glob("det/*.npz"))):
    z = np.load(f"det/{i:04d}.npz")
    hsv = cv2.cvtColor(fr[i], cv2.COLOR_BGR2HSV)
    red = ((hsv[..., 0] < 6) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 150) & (hsv[..., 2] > 70)
    for tid, box, mk in zip(z["ids"], z["boxes"], z["masks"]):
        a = mk.sum()
        if a < 200: continue
        stats[int(tid)].append((i, float((red & mk).sum() / a), int(a), box))
for tid, v in sorted(stats.items()):
    fs = [x[0] for x in v]; rs = np.mean([x[1] for x in v])
    print(f"id {tid:3d} frames {fs[0]:3d}-{fs[-1]:3d} n={len(fs):3d} red={rs:.3f} area~{int(np.median([x[2] for x in v]))}")
