# poses.py (config-driven): per-frame pose + placement for the brick figure, from cfg.json
import json, os, numpy as np, soundfile as sf
FPS = 24000 / 1001
CFG = json.load(open("cfg.json"))
lines = json.load(open("lines.json"))
env = np.zeros(int(60 * 100))                              # mouth from the new lines' loudness, 100 Hz
for L in lines:
    y, sr = sf.read(L["wav"]); y = y if y.ndim == 1 else y.mean(1)
    n = sr // 100; e = np.array([np.sqrt((y[i:i + n] ** 2).mean()) for i in range(0, len(y) - n, n)])
    a = int(L["t"] * 100); env[a:a + len(e)] = np.maximum(env[a:a + len(e)], e / max(e.max(), 1e-6))
met = json.load(open("metrics.json"))
prev_meta = json.load(open("figframes/meta.json")) if os.path.exists("figframes/meta.json") else None
def lerpk(keys, f):
    keys = {int(k): v for k, v in keys.items()}; ks = sorted(keys); f = min(max(f, ks[0]), ks[-1])
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
for name, (a, b, tid, occ) in CFG["shots"].items():
    fr = list(range(a, b + 1)); tops, cxs, hws = [], [], []
    for f in fr:
        r = met.get(str(f))
        if not r: tops.append(np.nan); cxs.append(np.nan); hws.append(np.nan); continue
        w = r["w"]; tops.append(r["top"] * 2); hws.append(np.median(w[25:75]) * 2 if len(w) > 75 else np.nan); cxs.append(r["cx"] * 2)
    for arr in (tops, cxs, hws):
        s = np.array(arr, float); idx = np.arange(len(s)); ok = ~np.isnan(s)
        arr[:] = np.interp(idx, idx[ok], s[ok]) if ok.any() else np.zeros(len(s))
    tops, cxs, hws = smooth(tops), smooth(cxs), smooth(hws, 15)
    cari = CFG["cari"].get(name, 1.38)
    for k, f in enumerate(fr):
        p = lerpk(CFG["keys"][name], f); t = f / FPS
        wk = CFG.get("walk", {}).get(name)
        if wk and wk[0] <= f <= wk[1]:
            ph = 2 * np.pi * t / 0.95; p["legL"] = 0.35 * np.sin(ph); p["legR"] = -0.35 * np.sin(ph); p["bob"] = 0.03 * abs(np.cos(ph))
        m = env[int(t * 100)] if int(t * 100) < len(env) else 0
        p["mouth"] = 0 if m < 0.12 else (0.5 if m < 0.45 else 1.0)
        if name in CFG["manual"]:
            an = lerpk(CFG["manual"][name], f); hw, cx, top = an["hw"], an["cx"], an["top"]
        else:
            hw, cx, top = hws[k], cxs[k], tops[k]
            lo, hi = CFG.get("hold_hw", {}).get(name, [0, 1e9]); hw = min(max(hw, lo), hi)
        hd = CFG["hand"].get(name)
        if hd and hd["frames"][0] <= f <= hd["frames"][1] and prev_meta:
            p["handScale"] = hd.get("scale", 1.5)
            hk = {int(q): v for q, v in hd["keys"].items()}; ks = sorted(hk)
            hx = np.interp(f, ks, [hk[q][0] for q in ks]); hy = np.interp(f, ks, [hk[q][1] for q in ks])
            mt = prev_meta[len(poses)]; sc = cari * hw / mt["ppu"]
            ox, oy = cx - mt["ax"] * sc, top - 0.06 * hw - mt["ay"] * sc
            p["target"] = [float((hx - ox) / sc), float((hy - oy) / sc), hd["arm"]]
        poses.append(p)
        place.append({"f": f, "shot": name, "tid": tid, "occ": occ, "cari": cari, "clip": CFG["clip"].get(name),
                      "hw": float(hw), "cx": float(cx), "top": float(top)})
json.dump(poses, open("poses.json", "w")); json.dump(place, open("place.json", "w"))
print(len(poses), "poses")
