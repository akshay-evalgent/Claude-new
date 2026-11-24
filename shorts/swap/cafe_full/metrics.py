import numpy as np, json
SHOTS = [(k, v[0], v[1], v[2]) for k, v in json.load(open("cfg.json"))["shots"].items()]
out = {}
for name, a, b, tid in SHOTS:
    for i in range(a, b + 1):
        z = np.load(f"det/{i:04d}.npz"); ids = list(z["ids"].astype(int))
        if tid not in ids: out[i] = None; continue
        m = z["masks"][ids.index(tid)]
        rows = np.where(m.sum(1) >= 3)[0]
        if not len(rows): out[i] = None; continue
        top = int(rows[0]); w = [int(m[y].sum()) for y in range(top, min(top + 160, m.shape[0]))]
        xs = np.where(m[top:top + 12].any(0))[0]
        ys, xx = np.where(m)
        out[i] = {"top": top, "cx": float(xs.mean()), "w": w, "box": [int(xx.min()), int(ys.min()), int(xx.max()), int(ys.max())]}
json.dump(out, open("metrics.json", "w"))
for name, a, b, tid in SHOTS:
    for i in [a, (a + b) // 2, b]:
        r = out.get(i)
        if r: print(name, i, "top", r["top"], "cx", round(r["cx"]), "box", r["box"], "w@", [r["w"][k] for k in range(0, min(len(r["w"]), 150), 10)])
