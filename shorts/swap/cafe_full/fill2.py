# fill2.py [shot] [frames...]: erase the actor using real background from nearby frames (aligned when the camera pans),
# and LaMa only for what no frame ever shows; static holes keep their fill from frame to frame (no flicker).
import sys, os, json, time, subprocess, numpy as np, cv2
sys.argv += [] ; import inpaint as ip                         # reuses the LaMa model and get_mask
W, H = 1920, 1080
CFG = json.load(open("cfg.json"))
SHOTS = {k: tuple(v) for k, v in CFG["fill_shots"].items()}   # name: (first, last, camera pans)
PROP = set(CFG["prop"])                                       # shots where real background is borrowed from nearby frames
CONTACT = CFG["contact"]
PERSIST = set(CFG.get("persist", []))                       # still shots: keep the invented fill from frame to frame                                      # shot: id of the person the actor touches
place = {p["f"]: p for p in json.load(open("place.json"))}
def hand_component(f, small):
    """F shot: Biff's hand resting on George's head is skin inside George's mask, touching Biff's mask."""
    bm, gm = ip.get_mask(f, 94), ip.get_mask(f, 74)
    if bm is None or gm is None: return None
    ycc = cv2.cvtColor(small, cv2.COLOR_BGR2YCrCb)
    skin = ((ycc[..., 1] > 135) & (ycc[..., 1] < 182) & (ycc[..., 2] > 80) & (ycc[..., 2] < 135)).astype(np.uint8)
    skin = cv2.morphologyEx(skin * np.maximum(gm, cv2.dilate(bm, np.ones((9, 9), np.uint8))), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab = cv2.connectedComponents(skin)
    touch = cv2.dilate(bm, np.ones((7, 7), np.uint8)) & (1 - gm) if False else cv2.dilate(bm, np.ones((7, 7), np.uint8))
    keep = np.zeros_like(skin)
    for i in range(1, n):
        c = lab == i
        if (c & (touch > 0)).any() and (c & (gm > 0)).sum() > 30: keep[c] = 1
    return keep
def holes_for(f, img):
    small = cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
    h = ip.hole_for(f, img)
    if place[f]["shot"] in CONTACT and h is not None:          # keep Biff's hand/arm where it touches George: the figure's hand covers it
        gm = ip.get_mask(f, CONTACT[place[f]["shot"]])
        if gm is not None:
            gz = cv2.resize(cv2.dilate(gm, np.ones((9, 9), np.uint8)) * 255, (W, H)) > 100
            hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)                      # ...but his red shirt still goes, even where it overlaps
            red = (((hsv[..., 0] < 6) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 140) & (hsv[..., 2] > 60)).astype(np.uint8)
            n, lab, st, _ = cv2.connectedComponentsWithStats(red)
            big = np.isin(lab, [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 1500])
            big = cv2.resize(cv2.dilate(big.astype(np.uint8), np.ones((9, 9), np.uint8)) * 255, (W, H)) > 100
            h = h * ~(gz & ~big)
    return h
def people_mask(f):
    z = np.load(f"det/{min(f, ip.LAST):04d}.npz"); m = z["masks"].any(0).astype(np.uint8) if len(z["masks"]) else np.zeros((H // 2, W // 2), np.uint8)
    return cv2.dilate(m, np.ones((15, 15), np.uint8))
def homog(a, b, ma, mb):                                     # maps frame a onto frame b (half-res features, people masked out)
    orb = cv2.ORB_create(3000)
    ga, gb = [cv2.cvtColor(cv2.resize(x, (W // 2, H // 2)), cv2.COLOR_BGR2GRAY) for x in (a, b)]
    ka, da = orb.detectAndCompute(ga, 1 - ma); kb, db = orb.detectAndCompute(gb, 1 - mb)
    if da is None or db is None: return np.eye(3)
    mt = sorted(cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(da, db), key=lambda m: m.distance)[:800]
    if len(mt) < 20: return np.eye(3)
    pa = np.float32([ka[m.queryIdx].pt for m in mt]) * 2; pb = np.float32([kb[m.trainIdx].pt for m in mt]) * 2
    Hm, _ = cv2.findHomography(pa, pb, cv2.RANSAC, 3.0)
    return Hm if Hm is not None else np.eye(3)
def run(shot, only):
    a, b, pans = SHOTS[shot]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a / (24000 / 1001):.4f}", "-i", "seg.mkv", "-frames:v", str(b - a + 1),
                          "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); n = len(frames); fidx = list(range(a, a + n))
    holes = [holes_for(f, frames[i]) for i, f in enumerate(fidx)]
    found = [h is not None and h.any() for h in holes]          # frames where Biff was actually found (others are no use as sources)
    holes = [h if h is not None else np.zeros((H, W), np.uint8) for h in holes]
    big = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))
    Hs = [np.eye(3)] * n                                      # Hs[i]: frame i -> frame 0 coordinates
    if pans:
        pm = [people_mask(f) for f in fidx]
        for i in range(1, n): Hs[i] = Hs[i - 1] @ homog(frames[i], frames[i - 1], pm[i], pm[i - 1])
    prev, prev_lama = None, None
    for i, f in enumerate(fidx):
        if only and f not in only: continue
        t0 = time.time(); img = frames[i]; hole = holes[i] > 0
        out = img.copy(); rem = hole.copy()
        if hole.any():
            for d in sorted(range(-16, 17), key=abs):
                j = i + d
                if shot not in PROP: break
                if d == 0 or not (0 <= j < n) or not rem.any() or not found[j]: continue
                M = np.linalg.inv(Hs[i]) @ Hs[j]               # frame j -> frame i
                ok = cv2.dilate(holes[j], big) == 0
                if pans:
                    wj = cv2.warpPerspective(frames[j], M, (W, H), flags=cv2.INTER_LINEAR)
                    okw = cv2.warpPerspective(ok.astype(np.uint8), M, (W, H), flags=cv2.INTER_NEAREST, borderValue=0) > 0
                else:
                    wj, okw = frames[j], ok
                take = rem & okw
                out[take] = wj[take]; rem &= ~take
            if rem.any() and shot in PERSIST and prev_lama is not None:   # Biff never moves here: keep the invented fill steady
                keep = rem & prev_lama
                out[keep] = prev[keep]; rem &= ~keep
            lam = rem.copy()
            if rem.any() and shot in PERSIST and prev_lama is not None and rem.sum() < 120000:
                out = cv2.inpaint(out, rem.astype(np.uint8) * 255, 7, cv2.INPAINT_TELEA)   # thin new strips beside a filled area
            elif rem.any():
                filled = ip.lama(out, rem.astype(np.uint8))
                out[rem] = filled[rem]
            if not pans:
                prev_lama = lam | (prev_lama & hole if prev_lama is not None else lam); prev = out.copy()
            a_ = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 1.5)[..., None]
            out = (img * (1 - a_) + out * a_).astype(np.uint8)
        cv2.imwrite(f"fills/{f:04d}.jpg", out, [cv2.IMWRITE_JPEG_QUALITY, 95])
        np.save(f"fills/hole_{f:04d}.npy", np.packbits(hole))
        print(shot, f, f"{time.time() - t0:.1f}s", "lama px", int(lam.sum()) if hole.any() else 0, flush=True)
if __name__ == "__main__":
    shots = sys.argv[1].split(",") if len(sys.argv) > 1 else list(SHOTS)
    only = [int(x) for x in sys.argv[2:]]
    for s in shots: run(s, only)
