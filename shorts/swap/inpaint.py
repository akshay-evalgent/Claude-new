# inpaint.py [frames...] : erase the actor with LaMa (big-lama) in every frame of his shots -> fills/NNNN.jpg (full frame)
import sys, os, json, time, subprocess, numpy as np, cv2, torch
torch.set_num_threads(4)
W, H = 1920, 1080
model = torch.jit.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../models/big-lama.pt"), map_location="cpu").eval()
place = {p["f"]: p for p in json.load(open("place.json"))}
os.makedirs("fills", exist_ok=True)
def get_mask(f, tid):
    z = np.load(f"det/{min(f, 473):04d}.npz"); ids = list(z["ids"].astype(int))
    return z["masks"][ids.index(tid)].astype(np.uint8) if tid in ids else None
def hole_for(f, img):
    p = place[f]; m = get_mask(f, p["tid"])
    if m is None: return None
    small = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    occs = [om for om in (get_mask(f, t) for t in p["occ"]) if om is not None]
    ys, xs = np.where(m); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); px, py = int((x1 - x0) * 0.25), int((y1 - y0) * 0.1)
    hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
    red = (((hsv[..., 0] < 6) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 140) & (hsv[..., 2] > 60)).astype(np.uint8)
    box = np.zeros_like(m); box[max(0, y0 - py):y1 + py, max(0, x0 - px):x1 + px] = 1
    red = red * box
    z = np.load(f"det/{min(f, 473):04d}.npz")                 # never take red from anyone else (lips, Marty's vest...)
    for tid, om in zip(z["ids"].astype(int), z["masks"]):
        if tid != p["tid"]: red = red * (1 - cv2.dilate(om.astype(np.uint8), np.ones((5, 5), np.uint8)))
    red = cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab = cv2.connectedComponents(red); near = cv2.dilate(m, np.ones((7, 7), np.uint8)) > 0
    keep = np.zeros_like(red)
    for i in range(1, n):                                        # only red patches that touch Biff
        c = lab == i
        if (c & near).any(): keep[c] = 1
    m = np.maximum(m, keep)
    hole = cv2.resize(m * 255, (W, H), interpolation=cv2.INTER_LINEAR) > 100
    return cv2.dilate(hole.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
def lama(img, hole):
    ys, xs = np.where(hole); mg = 120
    x0, x1, y0, y1 = max(0, xs.min() - mg), min(W, xs.max() + mg), max(0, ys.min() - mg), min(H, ys.max() + mg)
    crop, hc = img[y0:y1, x0:x1], hole[y0:y1, x0:x1]
    s = min(1.0, 1100 / max(crop.shape[:2])); cw, ch = int(round(crop.shape[1] * s / 8) * 8), int(round(crop.shape[0] * s / 8) * 8)
    ci = cv2.resize(crop, (cw, ch), interpolation=cv2.INTER_AREA); hm = (cv2.resize(hc, (cw, ch), interpolation=cv2.INTER_NEAREST) > 0).astype(np.float32)
    t_img = torch.from_numpy(ci[..., ::-1].copy()).permute(2, 0, 1)[None].float() / 255
    t_m = torch.from_numpy(hm)[None, None]
    with torch.no_grad(): out = model(t_img, t_m)[0].permute(1, 2, 0).numpy()
    out = (np.clip(out, 0, 1) * 255).astype(np.uint8)[..., ::-1]
    out = cv2.resize(out, (x1 - x0, y1 - y0), interpolation=cv2.INTER_CUBIC)
    res = img.copy(); a = cv2.GaussianBlur(hc.astype(np.float32), (0, 0), 2)[..., None]
    res[y0:y1, x0:x1] = (crop * (1 - a) + out * a).astype(np.uint8)
    return res
def _main():
    only = [int(x) for x in sys.argv[1:]]
    raw = subprocess.Popen(["ffmpeg", "-v", "error", "-i", "seg.mkv", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
    f = 0
    while True:
        b = raw.stdout.read(W * H * 3)
        if len(b) < W * H * 3: break
        if f in place and not (358 <= f <= 382) and (not only or f in only) and not (os.path.exists(f"fills/{f:04d}.jpg") and not only):
            img = np.frombuffer(b, np.uint8).reshape(H, W, 3); t = time.time()
            hole = hole_for(f, img)
            out = lama(img, hole) if hole is not None and hole.any() else img
            cv2.imwrite(f"fills/{f:04d}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 95])
            if only or f % 25 == 0: print(f, f"{time.time() - t:.1f}s", flush=True)
        f += 1
        if only and f > max(only): break
    raw.stdout.close()

if __name__ == "__main__":
    _main()