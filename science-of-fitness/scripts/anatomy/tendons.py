"""Tendon X-ray views.

    python3 tendons.py <BodyParts3D data dir> <out dir>

Most tendons are real atlas geometry: BodyParts3D stores each muscle with its
tendon, so the distal (or proximal) end of the muscle mesh is split off below an
anatomical level and drawn as tendon. Two pieces the atlas lacks are modelled
and placed on atlas landmarks: the Achilles tendon (calf to calcaneus) and the
kneecap (patella), so the quadriceps and patellar tendons have something to wrap.
X-ray look: ghost skin outline, bones at half strength, muscle bellies faint,
tendons solid coral with a glow.
"""
import os, sys, math
import numpy as np
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DATA, OUT = sys.argv[1], sys.argv[2]
sys.argv = [sys.argv[0], DATA, OUT, "none"]
import build_kit as k
from manga_render import vertex_normals, over, add_glow, stage, save
from nerves import catmull

sc = k.sc
C = sc.center

# (name words, exact?, rule) -> faces whose centroid z (mm, relative to centre) passes the rule become tendon
RULES = [
    ("flexor digitorum superficialis", lambda z: z < 25),
    ("flexor digitorum profundus", lambda z: z < 25),
    ("extensor digitorum", lambda z: z < 25),           # forearm; the leg muscle is "extensor digitorum longus"
    ("flexor pollicis longus", lambda z: z < 35),
    ("extensor pollicis longus", lambda z: z < 45),
    ("extensor pollicis brevis", lambda z: z < 35),
    ("flexor carpi radialis", lambda z: z < 60),
    ("flexor carpi ulnaris", lambda z: z < 45),
    ("palmaris longus", lambda z: z < 130),
    ("extensor carpi radialis longus", lambda z: z < 110),
    ("extensor carpi radialis brevis", lambda z: z < 90),
    ("extensor carpi ulnaris", lambda z: z < 45),
    ("biceps brachii", lambda z: (z < 262) | (z > 532)),  # distal tendon to the radius, long-head tendon in the shoulder
    ("triceps brachii", lambda z: z < 280),
    ("rectus femoris", lambda z: (z < -345) | (z > 60)),
    ("vastus lateralis", lambda z: z < -372),
    ("vastus medialis", lambda z: z < -385),
    ("extensor digitorum longus", lambda z: z < -715),
    ("tibialis anterior", lambda z: z < -705),
    ("flexor digitorum longus", lambda z: z < -745),
    ("fibularis longus", lambda z: z < -715),
    ("fibularis brevis", lambda z: z < -735),
]


def split_tendons():
    cen_z = sc.V[sc.F].mean(1)[:, 2] - C[2]
    for words, rule in RULES:
        for p in list(sc.parts):
            n = p["name"].lower()
            if p["layer"] != "muscle" or words not in n:
                continue
            if words == "extensor digitorum" and "longus" in n:
                continue
            faces = np.flatnonzero(sc.PID == p["id"])
            sel = faces[rule(cen_z[faces])]
            if len(sel) == 0:
                continue
            nid = len(sc.parts)
            sc.parts.append({"id": nid, "layer": "tendon", "name": p["name"] + " tendon"})
            sc.PID[sel] = nid
    sc.layer = np.array([p["layer"] for p in sc.parts])
    sc.names = [p["name"].lower() for p in sc.parts]


def add_mesh(V, F, layer, name):
    nid = len(sc.parts)
    sc.parts.append({"id": nid, "layer": layer, "name": name})
    off = len(sc.V)
    sc.V = np.vstack([sc.V, V.astype(np.float32)])
    sc.VN = np.vstack([sc.VN, vertex_normals(V.astype(np.float32), F)])
    sc.F = np.vstack([sc.F, F + off]).astype(np.int32)
    sc.PID = np.concatenate([sc.PID, np.full(len(F), nid, np.int32)])
    sc.layer = np.array([p["layer"] for p in sc.parts])
    sc.names = [p["name"].lower() for p in sc.parts]


def ellipsoid(c, r, n=24):
    u, v = np.meshgrid(np.linspace(0, 2 * math.pi, n, endpoint=False), np.linspace(0, math.pi, n // 2 + 1))
    P = np.stack([np.cos(u) * np.sin(v), np.sin(u) * np.sin(v), np.cos(v)], -1).reshape(-1, 3) * r + c
    F = []
    cols = n
    for i in range(n // 2):
        for j in range(cols):
            a, b = i * cols + j, i * cols + (j + 1) % cols
            c2, d = (i + 1) * cols + j, (i + 1) * cols + (j + 1) % cols
            F += [[a, c2, b], [b, c2, d]]
    return P, np.array(F, np.int32)


def tube(path, rx, ry, n=20):
    """Sweep an ellipse (rx across the body, ry front-back) along a path."""
    P = catmull(path, 10)
    m = len(P)
    rx = np.interp(np.linspace(0, 1, m), np.linspace(0, 1, len(rx)), rx)
    ry = np.interp(np.linspace(0, 1, m), np.linspace(0, 1, len(ry)), ry)
    V = []
    for i in range(m):
        t = P[min(i + 1, m - 1)] - P[max(i - 1, 0)]; t /= np.linalg.norm(t) + 1e-9
        a = np.array([1.0, 0, 0]); a = a - t * (a @ t); a /= np.linalg.norm(a) + 1e-9
        b = np.cross(t, a)
        for j in range(n):
            th = 2 * math.pi * j / n
            V.append(P[i] + a * rx[i] * math.cos(th) + b * ry[i] * math.sin(th))
    V += [P[0], P[-1]]
    F = []
    for i in range(m - 1):
        for j in range(n):
            a0, a1 = i * n + j, i * n + (j + 1) % n
            b0, b1 = a0 + n, a1 + n
            F += [[a0, b0, a1], [a1, b0, b1]]
    s, e = m * n, m * n + 1
    for j in range(n):
        F += [[s, (j + 1) % n, j], [e, (m - 1) * n + j, (m - 1) * n + (j + 1) % n]]
    return np.array(V, np.float32), np.array(F, np.int32)


def verts_of(name):
    ids = [p["id"] for p in sc.parts if p["name"].lower() == name]
    return sc.V[np.unique(sc.F[np.isin(sc.PID, ids)])] - C


def add_missing():
    for side in ("right", "left"):
        # kneecap: in front of the femur's lower end, centred over the knee
        fem = verts_of(f"{side} femur")
        knee = fem[fem[:, 2] < fem[:, 2].min() + 45]
        cx = knee[:, 0].mean(); front = knee[:, 1].min()
        pc = np.array([cx, front - 16, fem[:, 2].min() + 30])
        V, F = ellipsoid(pc + C, np.array([23, 11, 27]))
        add_mesh(V, F, "bone", f"{side} patella (modelled)")
        # Achilles tendon: from the lower calf muscles to the back of the calcaneus
        gas = np.vstack([verts_of(f"medial head of {side} gastrocnemius"), verts_of(f"lateral head of {side} gastrocnemius")])
        sol = verts_of(f"{side} soleus")
        cal = verts_of(f"{side} calcaneus")
        top = gas[gas[:, 2] < gas[:, 2].min() + 25].mean(0); top[1] += 6
        mid = sol[sol[:, 2] < sol[:, 2].min() + 20].mean(0); mid[1] = max(mid[1], top[1] - 4) + 6
        back = cal[cal[:, 1] > cal[:, 1].max() - 12]
        ins = back[back[:, 2] > back[:, 2].max() - 25].mean(0)
        start = top + np.array([0, 2, 130])  # begins high as a broad, thin sheet under the calf muscles
        upper = top + np.array([0, 4, 55])
        midp = (top + mid) / 2 + np.array([0, -10, 0])  # curves forward, narrowest a few cm above the heel
        path = [start, upper, top, midp, mid + np.array([0, -12, 0]), ins + np.array([0, -4, 16]), ins + np.array([0, 4, 0])]
        V, F = tube(np.array(path) + C, rx=[34, 28, 18, 10, 7, 9, 15], ry=[3, 5, 8, 6, 4.0, 5.5, 9])
        add_mesh(V, F, "tendon", f"{side} calcaneal (Achilles) tendon (modelled)")


FOCUS = {  # which tendons light up in each view (others are hidden)
    "hand": ["flexor", "extensor carpi", "extensor digitorum tendon", "extensor pollicis", "palmaris", "pollicis"],
    "arm": ["biceps", "triceps", "flexor", "extensor carpi", "extensor digitorum tendon", "extensor pollicis", "palmaris", "pollicis"],
    "knee": ["rectus femoris", "vastus"],
    "leg": ["achilles", "tibialis", "fibularis", "digitorum longus"],
    "body": ["flexor", "extensor", "palmaris", "pollicis", "biceps", "triceps", "rectus femoris", "vastus", "achilles", "tibialis",
             "fibularis"],
}


def xray(yaw, view, W, H, ss=2, tendon_glow=1.2, focus="body"):
    sk, _, _ = sc.draw(["skin"], W, H, yaw, view, ss, fibres=False, shorts=True)
    m = (sk[..., 3] > 128).astype(np.uint8)
    ring = (cv2.dilate(m, np.ones((5, 5), np.uint8)) - cv2.erode(m, np.ones((3, 3), np.uint8))) > 0
    out = np.zeros((H, W, 4), np.float32)
    out[m > 0] = [120, 150, 160, 26]
    out[ring] = [150, 176, 186, 190]
    mu, _, _ = sc.draw(["muscle"], W, H, yaw, view, ss)
    mu[..., 3] *= 0.2
    out = k.stack(out, mu)
    bo, _, _ = sc.draw(["bone", "cartilage"], W, H, yaw, view, ss, style="bone")
    bo[..., :3] *= np.array([0.86, 0.93, 1.0], np.float32)
    bo[..., 3] *= 0.55
    out = k.stack(out, bo)
    words = FOCUS[focus]
    tids = [p["id"] for p in sc.parts if p["layer"] == "tendon" and any(w in p["name"].lower() for w in words)]
    keep = sc.layer.copy()
    for p in sc.parts:  # hide tendons outside the focus for this render
        if p["layer"] == "tendon" and p["id"] not in tids:
            sc.layer[p["id"]] = "hidden"
    te, tg, _ = sc.draw(["tendon"], W, H, yaw, view, ss, highlight=[(tids, "coral")])
    sc.layer = keep
    out = k.stack(out, te)
    return out, tg * tendon_glow


VIEWS = {  # name: (yaw, (cx, cz, height), W, H, focus)
    "tendon-xray-hand-palm": (0.0, (-266, -35, 270), 1920, 1080, "hand"),
    "tendon-xray-hand-back": (180.0, (266, -35, 270), 1920, 1080, "hand"),
    "tendon-xray-arm": (0.0, (-215, 250, 720), 1920, 1080, "arm"),
    "tendon-xray-knee": (0.0, (-90, -415, 330), 1920, 1080, "knee"),
    "tendon-xray-achilles": (90.0, (-40, -715, 330), 1920, 1080, "leg"),
    "tendon-xray-lower-leg-side": (90.0, (-20, -600, 560), 1920, 1080, "leg"),
    "tendon-xray-body-front": (0.0, (0, 0, 1800), 1215, 2160, "body"),
    "tendon-xray-body-back": (180.0, (0, 0, 1800), 1215, 2160, "body"),
}


def stills():
    only = [x for x in os.environ.get("TENDON_ONLY", "").split(",") if x]
    for name, (yaw, view, W, H, focus) in VIEWS.items():
        if only and name not in only:
            continue
        rgba, glow = xray(yaw, view, W, H, focus=focus)
        save(k.path("tendons", name + ".png"), k.rgba_with_glow(rgba, glow))
        k.preview(rgba, glow, name)
        print(name, flush=True)


def anim_scan():
    """Hand: normal skin, then an X-ray scan line reveals the tendons."""
    W, H, fps = 1920, 1080, 30
    yaw, view = VIEWS["tendon-xray-hand-palm"][:2]
    focus = VIEWS["tendon-xray-hand-palm"][4]
    sk, sg = k.layer("skin", yaw, W, H, view)
    a = add_glow(over(stage(W, H), sk), sg)
    xr, xg = xray(yaw, view, W, H, focus=focus)
    b = add_glow(over(stage(W, H), xr), xg)
    d = k.path("anim", "_scan"); os.makedirs(d, exist_ok=True)
    yy = np.arange(H)[:, None, None]
    frames = []
    hold, sweep = int(0.8 * fps), int(1.6 * fps)
    frames += [a] * hold
    for f in range(sweep):
        y = k.ease(f / (sweep - 1)) * (H + 40) - 20
        msk = (yy < y).astype(np.float32)
        img = b * msk + a * (1 - msk)
        band = np.exp(-((yy[..., 0] - y) / 7.0) ** 2)
        frames.append(np.clip(img + band[..., None] * np.array([38, 224, 196]) * 1.2, 0, 255))
    for f in range(int(1.6 * fps)):  # tendons pulse once revealed
        pulse = 1 + 0.5 * math.sin(f / (1.6 * fps) * 2 * math.pi)
        frames.append(add_glow(over(stage(W, H), xr), xg, pulse))
    for i, fr in enumerate(frames):
        cv2.imwrite(os.path.join(d, f"{i:04d}.png"), cv2.cvtColor(np.clip(fr, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    k.encode(d, k.path("anim", "tendon-xray-hand-scan.mp4"), fps)
    print("anim tendon-xray-hand-scan", flush=True)


if __name__ == "__main__":
    split_tendons()
    add_missing()
    print("tendon parts:", sum(1 for p in sc.parts if p["layer"] == "tendon"), flush=True)
    what = os.environ.get("TENDON_WHAT", "all")
    if what in ("test",):
        for name in ("tendon-xray-hand-palm", "tendon-xray-achilles", "tendon-xray-knee"):
            yaw, view, W, H, focus = VIEWS[name]
            rgba, glow = xray(yaw, view, 960, 540, focus=focus)
            save(os.path.join(OUT, name + "-test.png"), add_glow(over(stage(960, 540), rgba), glow))
    if what in ("all", "stills"):
        stills()
    if what in ("all", "anim"):
        anim_scan()
