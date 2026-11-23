# per-frame pose + placement for the brick figure (frames of seg.mkv at 23.976 fps)
import json, numpy as np, soundfile as sf
FPS = 24000 / 1001
SHOTS = {"A": (0, 63, 2, []), "C": (123, 222, 2, [27, 47]), "E": (280, 382, 93, []), "F": (383, 473, 94, [93])}
KEYS = {   # frame: pose keyframes (linear in between)
 "A": {0: dict(yaw=0.1, armR=0.5, armL=0.5, armRz=1.0, armLz=1.0), 22: dict(yaw=0.1, armR=0.35, armL=0.3, armRz=0.75, armLz=0.6),
       42: dict(yaw=0.05, armR=0.1, armL=0.1, armRz=0.15, armLz=0.15), 63: dict(yaw=0.0, armR=0.1, armL=0.1, armRz=0.12, armLz=0.12)},
 "C": {123: dict(yaw=0.35), 145: dict(yaw=0.55, armR=0.35, armRz=0.9, armLz=0.5), 160: dict(yaw=0.65, armR=0.3, armRz=0.8, armLz=0.4),
       178: dict(yaw=0.7, lean=0.1, armR=0.2, armRz=0.2, armLz=0.15), 200: dict(yaw=0.6, lean=0.25, armR=0.5, armL=0.5), 222: dict(yaw=0.6, lean=0.25, armR=0.5, armL=0.5)},
 "E": {280: dict(yaw=1.05, lean=0.1, armR=1.0, armRz=0.1, armL=0.1), 360: dict(yaw=1.05, lean=0.12, armR=1.0, armRz=0.1, armL=0.1),
       372: dict(yaw=1.15, lean=0.35, armR=1.3, armL=0.1), 382: dict(yaw=1.2, lean=0.45, armR=1.35, armL=0.1)},
 "F": {383: dict(yaw=1.25, lean=0.15, armR=1.25, armL=0.05, armLz=0.1), 473: dict(yaw=1.25, lean=0.15, armR=1.25, armL=0.05, armLz=0.1)},
}
WALK = {"A": (0, 63), "C": (123, 178)}
KNOCK = [(16.4, 17.0), (17.2, 18.3)]
lines = json.load(open("lines.json"))
env = np.zeros(int(21 * 100))                              # mouth from the new lines' loudness, 100 Hz
for L in lines:
    y, sr = sf.read(L["wav"]); y = y if y.ndim == 1 else y.mean(1)
    n = sr // 100; e = np.array([np.sqrt((y[i:i + n] ** 2).mean()) for i in range(0, len(y) - n, n)])
    a = int(L["t"] * 100); env[a:a + len(e)] = np.maximum(env[a:a + len(e)], e / max(e.max(), 1e-6))
met = json.load(open("metrics.json"))
def lerpk(keys, f):
    ks = sorted(keys); f = min(max(f, ks[0]), ks[-1])
    for a, b in zip(ks, ks[1:]):
        if a <= f <= b:
            t = (f - a) / max(1, b - a); names = set(keys[a]) | set(keys[b])
            return {n: keys[a].get(n, 0) + (keys[b].get(n, 0) - keys[a].get(n, 0)) * t for n in names}
    return dict(keys[ks[0]])
def smooth(x, k=7):
    x = np.array(x, float); pad = np.pad(x, k // 2, mode="edge")
    med = np.array([np.median(pad[i:i + k]) for i in range(len(x))]); pad = np.pad(med, 2, mode="edge")
    return np.convolve(pad, np.ones(5) / 5, "valid")
poses, place = [], []
for name, (a, b, tid, occ) in SHOTS.items():
    fr = list(range(a, b + 1)); tops, cxs, hws = [], [], []
    for f in fr:
        r = met.get(str(f))
        if not r: tops.append(np.nan); cxs.append(np.nan); hws.append(np.nan); continue
        w = r["w"]; tops.append(r["top"] * 2)
        hws.append(np.median(w[25:75]) * 2 if len(w) > 75 else np.nan)
        cxs.append(r["cx"] * 2)
    for arr in (tops, cxs, hws):                           # fill gaps
        s = np.array(arr, float); idx = np.arange(len(s)); ok = ~np.isnan(s)
        arr[:] = np.interp(idx, idx[ok], s[ok])
    tops, cxs, hws = smooth(tops), smooth(cxs), smooth(hws, 15)
    for k, f in enumerate(fr):
        p = lerpk(KEYS[name], f); t = f / FPS
        if name in WALK and WALK[name][0] <= f <= WALK[name][1]:
            ph = 2 * np.pi * t / 0.95; p["legL"] = 0.35 * np.sin(ph); p["legR"] = -0.35 * np.sin(ph); p["bob"] = 0.03 * abs(np.cos(ph))
        for k0, k1 in KNOCK:
            if k0 <= t <= k1: p["armR"] = p.get("armR", 0) + 0.2 * np.sin(2 * np.pi * 4 * (t - k0))
        m = env[int(t * 100)] if int(t * 100) < len(env) else 0
        p["mouth"] = 0 if m < 0.12 else (0.5 if m < 0.45 else 1.0)
        if name == "E":                                    # head half out of frame: hand-set path (Biff leans in at the end)
            ea = lerpk({280: dict(cx=215, top=40), 362: dict(cx=215, top=40), 370: dict(cx=320, top=80), 376: dict(cx=450, top=190), 382: dict(cx=430, top=320)}, f)
            hw, cx, top = 360.0, ea["cx"], ea["top"]
        else:
            hw, cx, top = hws[k], cxs[k], tops[k]
        poses.append(p); place.append({"f": f, "shot": name, "tid": tid, "occ": occ, "clip": 905 if (name == "C" and f >= 165) else None, "hw": float(hw), "cx": float(cx), "top": float(top)})
json.dump(poses, open("poses.json", "w")); json.dump(place, open("place.json", "w"))
print(len(poses), "poses")
for q in place[::25]: print(q["f"], q["shot"], round(q["hw"]), round(q["cx"]), round(q["top"]))
