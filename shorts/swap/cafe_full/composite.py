# composite.py [frames...] : remove Biff (inpaint) and place the rendered figure over him -> swap16x9.mp4 (or test pngs)
import json, sys, os, subprocess, numpy as np, cv2
from PIL import Image, ImageFilter
W, H = 1920, 1080
place = {p["f"]: (i, p) for i, p in enumerate(json.load(open("place.json")))}
import glob; LAST = len(glob.glob("det/*.npz")) - 1
meta = json.load(open("figframes/meta.json"))
CARI = 1.38                                                     # figure head = 1.38 x Biff's head width (big-headed caricature)
rng = np.random.default_rng(1)
_r = np.array([[m.get("rx", 0), m.get("ry", 0)] for m in meta]); SHIFT = _r.copy()
for c in (0, 1):                                               # smooth the slide so the figure doesn't jitter
    SHIFT[:, c] = np.convolve(np.pad(_r[:, c], 4, mode="edge"), np.ones(9) / 9, "valid")
def get_mask(f, tid):
    z = np.load(f"det/{min(f, LAST):04d}.npz"); ids = list(z["ids"].astype(int))
    return z["masks"][ids.index(tid)].astype(np.uint8) if tid in ids else None
def comp(f, img):
    if f not in place: return img
    k, p = place[f]
    m = get_mask(f, p["tid"])
    small = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    occs = [om for om in (get_mask(f, t) for t in p["occ"]) if om is not None]
    if os.path.exists(f"fills/{f:04d}.jpg"):                   # clean plate from fill2.py (LaMa / nearby frames)
        img = cv2.imread(f"fills/{f:04d}.jpg"); m = None
    if m is not None:                                          # 1) erase Biff: inpaint at half res inside his (dilated) mask
        ys, xs = np.where(m)                                   # ...plus any of his red shirt the mask missed, near him
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max(); px, py = int((x1 - x0) * 0.25), int((y1 - y0) * 0.1)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        red = (((hsv[..., 0] < 6) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 140) & (hsv[..., 2] > 60)).astype(np.uint8)
        box = np.zeros_like(m); box[max(0, y0 - py):y1 + py, max(0, x0 - px):x1 + px] = 1
        red = red * box
        for om in occs: red = red * (1 - cv2.dilate(om, np.ones((5, 5), np.uint8)))
        m = np.maximum(m, cv2.morphologyEx(red, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)))
        md = cv2.dilate(m, np.ones((15, 15), np.uint8))
        fill = cv2.inpaint(small, md * 255, 9, cv2.INPAINT_TELEA)
        fill = cv2.GaussianBlur(fill, (0, 0), 3)
        fillF = cv2.resize(fill, (W, H), interpolation=cv2.INTER_CUBIC)
        a = cv2.GaussianBlur(cv2.resize(md.astype(np.float32), (W, H)), (0, 0), 4)[..., None]
        img = (img * (1 - a) + fillF * a).astype(np.uint8)
    fig = Image.open(f"figframes/{k:04d}.png").convert("RGBA")  # 2) the figure, scaled so its head is CARI x Biff's head
    mt = meta[k]; s = p.get("cari", CARI) * p["hw"] / mt["ppu"]
    fig = fig.resize((int(fig.width * s), int(fig.height * s)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.7))
    ox, oy = int(p["cx"] - mt["ax"] * s), int(p["top"] - 0.06 * p["hw"] - mt["ay"] * s)
    if "rx" in mt:                                             # arm couldn't quite reach: slide the figure the rest of the way
        ox += int(SHIFT[k][0] * s); oy += int(SHIFT[k][1] * s)
    fa = np.array(fig).astype(np.float32)
    layer = np.zeros((H, W, 4), np.float32)
    x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + fig.width, W), min(oy + fig.height, H)
    if x1 > x0 and y1 > y0: layer[y0:y1, x0:x1] = fa[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    alpha = layer[..., 3:] / 255
    occ = np.zeros((H, W), np.float32)                         # 3) people standing in front of him hide the figure
    for t in p["occ"]:
        om = get_mask(f, t)
        if om is not None: occ = np.maximum(occ, cv2.resize(om.astype(np.float32), (W, H)))
    if p["occ"]: alpha = alpha * (1 - cv2.GaussianBlur(occ, (0, 0), 2)[..., None])
    if p.get("clip"):                                          # the café counter hides his legs
        cl = np.clip((p["clip"] - np.arange(H)) / 6 + 0.5, 0, 1).astype(np.float32); alpha = alpha * cl[:, None, None]
    rgb = layer[..., 2::-1]                                    # RGBA -> BGR
    tint = img.reshape(-1, 3).mean(0)                          # 4) sit it in the shot: a touch of the scene's colour + film grain
    rgb = rgb * 0.9 + tint * 0.1 + rng.normal(0, 3.0, rgb.shape)
    return np.clip(img * (1 - alpha) + rgb * alpha, 0, 255).astype(np.uint8)
raw = subprocess.Popen(["ffmpeg", "-v", "error", "-i", "seg.mkv", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
only = [int(x) for x in sys.argv[1:]]
enc = None if only else subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", "24000/1001",
                                           "-i", "-", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-pix_fmt", "yuv420p", "swap16x9_v.mp4"], stdin=subprocess.PIPE)
f = 0
while True:
    b = raw.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    if (not only and f <= LAST) or f in only:
        out = comp(f, np.frombuffer(b, np.uint8).reshape(H, W, 3).copy())
        if only: cv2.imwrite(f"test_{f:04d}.jpg", cv2.resize(out, (960, 540)))
        else: enc.stdin.write(out.tobytes())
    f += 1
    if only and f > max(only): break
if enc: enc.stdin.close(); enc.wait()
print("frames", f)
