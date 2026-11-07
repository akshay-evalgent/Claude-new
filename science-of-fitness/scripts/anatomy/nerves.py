"""Simplified peripheral nerve map, laid out on BodyParts3D skeleton landmarks.

BodyParts3D only models the brain and some cranial nerves, so the main trunks
below are hand-placed from standard anatomy (Gray's Anatomy) against the atlas's
own bones: spinal cord and cauda equina, brachial plexus with the median, ulnar,
radial, musculocutaneous and axillary nerves, intercostal nerves traced along the
real rib meshes, femoral and saphenous nerves, and the sciatic nerve splitting
into tibial and common fibular. It is a teaching schematic, not a dissection.
Coordinates: mm relative to the model centre; x = subject's left(+)/right(-),
y = front(-)/back(+), z = up.
"""
import math
import numpy as np
import cv2

TEAL = np.array([38, 224, 196], np.float32)
CORE = np.array([214, 255, 248], np.float32)

SPINE = [(0, 45, 700), (0, 48, 640), (0, 50, 597), (0, 48, 560), (0, 52, 450), (0, 55, 350), (0, 50, 297), (0, 48, 258)]
RIGHT = {  # (path, weight) for the subject's right side; left is mirrored
    "brachial_roots": [[(-22, 45, 628), (-55, 25, 585), (-110, 20, 528), (-150, 25, 492)],
                       [(-26, 45, 604), (-60, 25, 575), (-150, 25, 492)],
                       [(-28, 45, 584), (-70, 25, 560), (-150, 25, 492)]],
    "median": [[(-150, 25, 492), (-160, 10, 420), (-176, 0, 330), (-200, -5, 262), (-226, -10, 180), (-246, -15, 100),
                (-262, -20, 30), (-275, -40, -10)]],
    "median_fingers": [[(-275, -40, -10), (-300, -55, -30), (-314, -64, -48)], [(-275, -40, -10), (-298, -70, -70), (-305, -77, -110)],
                       [(-275, -40, -10), (-278, -78, -75), (-276, -84, -120)], [(-275, -40, -10), (-258, -78, -70), (-250, -84, -110)]],
    "ulnar": [[(-150, 25, 492), (-152, 35, 400), (-160, 45, 305), (-176, 50, 262), (-200, 20, 200), (-214, 0, 110), (-224, -10, 30),
               (-232, -40, -20)]],
    "ulnar_fingers": [[(-232, -40, -20), (-226, -66, -60), (-222, -73, -97)], [(-232, -40, -20), (-246, -76, -66), (-249, -84, -110)]],
    "radial": [[(-150, 25, 492), (-160, 55, 430), (-200, 52, 360), (-234, 22, 300), (-246, 0, 262), (-268, -5, 170), (-281, -10, 80),
                (-293, -20, 28), (-302, -32, -18), (-311, -55, -42)]],
    "radial_deep": [[(-246, 0, 262), (-250, 30, 210), (-246, 40, 80)]],
    "musculocutaneous": [[(-140, 5, 505), (-168, -15, 420), (-185, -25, 330), (-232, -12, 262), (-262, -10, 170)]],
    "axillary": [[(-150, 30, 495), (-170, 50, 500), (-195, 40, 503), (-212, 12, 492)]],
    "lumbar_roots": [[(-30, 45, 290), (-50, 30, 220), (-62, 5, 130)], [(-35, 45, 250), (-55, 25, 190), (-62, 5, 130)],
                     [(-40, 50, 210), (-60, 20, 160), (-62, 5, 130)]],
    "femoral": [[(-62, 5, 130), (-78, -25, 60), (-88, -38, 15), (-92, -42, -30)]],
    "femoral_fan": [[(-92, -42, -30), (-80, -52, -150), (-78, -50, -300)], [(-92, -42, -30), (-112, -48, -170), (-118, -40, -330)],
                    [(-92, -42, -30), (-128, -30, -110), (-136, -20, -230)]],
    "saphenous": [[(-92, -42, -30), (-82, -30, -250), (-66, 0, -400), (-66, -5, -600), (-64, -10, -780), (-88, -40, -830)]],
    "sacral_roots": [[(-25, 60, 160), (-50, 80, 60), (-62, 90, 20)], [(-30, 70, 120), (-52, 85, 50), (-62, 90, 20)],
                     [(-28, 80, 80), (-50, 88, 35), (-62, 90, 20)]],
    "sciatic": [[(-62, 90, 20), (-80, 95, -40), (-90, 85, -120), (-95, 70, -250), (-90, 65, -370)]],
    "tibial": [[(-90, 65, -370), (-84, 70, -430), (-80, 70, -550), (-72, 60, -700), (-62, 30, -790), (-78, -10, -845)]],
    "tibial_toes": [[(-78, -10, -845), (-100, -80, -848), (-114, -120, -848)], [(-78, -10, -845), (-125, -85, -849), (-138, -122, -849)],
                    [(-78, -10, -845), (-150, -50, -850), (-165, -80, -850)]],
    "fibular": [[(-90, 65, -370), (-115, 55, -430), (-120, 20, -470), (-106, 0, -560), (-100, -10, -700), (-92, -30, -800),
                 (-112, -70, -838)]],
    "fibular_toes": [[(-112, -70, -838), (-118, -105, -846)], [(-112, -70, -838), (-140, -100, -847)]],
}
WEIGHT = {"spine": 3.6, "brachial_roots": 2.0, "median": 2.2, "ulnar": 2.0, "radial": 2.0, "musculocutaneous": 1.6, "axillary": 1.4,
          "radial_deep": 1.3, "median_fingers": 1.1, "ulnar_fingers": 1.1, "lumbar_roots": 1.9, "femoral": 2.2, "femoral_fan": 1.3,
          "saphenous": 1.4, "sacral_roots": 2.4, "sciatic": 3.0, "tibial": 2.2, "tibial_toes": 1.0, "fibular": 1.9,
          "fibular_toes": 1.0, "intercostal": 0.75, "cauda": 1.2}


def catmull(pts, n=12):
    pts = np.asarray(pts, np.float32)
    if len(pts) < 3:
        return np.linspace(pts[0], pts[-1], n * 2)
    P = np.vstack([pts[0], pts, pts[-1]])
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return np.array(out, np.float32)


def rib_paths(scene):
    """Intercostal nerves: run just under each real rib, spine to front."""
    paths = []
    for p in scene.parts:
        n = p["name"].lower()
        if p["layer"] != "bone" or " rib" not in " " + n or "costal" in n:
            continue
        tri = scene.PID == p["id"]
        vv = scene.V[np.unique(scene.F[tri])] - scene.center
        side = np.sign(vv[:, 0].mean())
        ang = np.arctan2(vv[:, 1] - 40, vv[:, 0] * side)  # around the spine
        bins = np.linspace(ang.min(), ang.max(), 14)
        pts = []
        for a0, a1 in zip(bins[:-1], bins[1:]):
            m = (ang >= a0) & (ang < a1)
            if m.sum() > 5:
                q = vv[m].mean(0); q[2] -= 9; pts.append(q)
        if len(pts) > 3:
            pts = sorted(pts, key=lambda q: -q[1])  # back to front
            paths.append(("intercostal", pts))
    return paths


def all_paths(scene):
    paths = [("spine", SPINE)]
    for k in range(7):  # cauda equina
        x = (k - 3) * 6
        paths.append(("cauda", [(0, 48, 258), (x * 0.6, 55, 200), (x, 62, 120), (x * 1.6, 75, 50)]))
    for name, plist in RIGHT.items():
        for pts in plist:
            paths.append((name, pts))
            paths.append((name, [(-x, y, z) for x, y, z in pts]))
    paths += rib_paths(scene)
    return paths


def draw_nerves(scene, W, H, yaw, view, ss=2, pulse_t=None, seed=7, branch=True):
    """Returns (rgba float image, glow) for the nerve map at the given camera."""
    Ws, Hs = W * ss, H * ss
    core = np.zeros((Hs, Ws), np.float32)
    body = np.zeros((Hs, Ws), np.float32)
    rng = np.random.default_rng(seed)
    pulses = np.zeros((Hs, Ws), np.float32)
    for name, pts in all_paths(scene):
        curve = catmull(pts)
        sv, s = scene.project(curve, W, H, yaw, view, ss)
        xy = sv[:, :2]
        wpx = WEIGHT.get(name, 1.2) * ss * (H / 1080) * 1.1
        poly = np.round(xy * 16).astype(np.int32).reshape(-1, 1, 2)
        cv2.polylines(body, [poly], False, 1.0, max(1, int(wpx * 2.2)), cv2.LINE_AA, shift=4)
        cv2.polylines(core, [poly], False, 1.0, max(1, int(wpx * 0.9)), cv2.LINE_AA, shift=4)
        if branch:  # small twigs along the trunk, more toward the ends
            seg = np.diff(xy, axis=0); L = np.linalg.norm(seg, axis=1)
            n_tw = int(L.sum() / (26 * ss))
            for _ in range(n_tw):
                i = rng.integers(1, len(xy) - 1)
                tang = xy[i + 1] - xy[i - 1]; tang /= np.linalg.norm(tang) + 1e-6
                ang = rng.choice([-1, 1]) * rng.uniform(0.5, 1.1)
                d = np.array([tang[0] * math.cos(ang) - tang[1] * math.sin(ang), tang[0] * math.sin(ang) + tang[1] * math.cos(ang)])
                ln = rng.uniform(6, 16) * ss * (H / 1080)
                mid = xy[i] + d * ln * 0.5 + np.array([-d[1], d[0]]) * rng.uniform(-2, 2) * ss
                tw = catmull([xy[i], mid, xy[i] + d * ln], 6)
                cv2.polylines(body, [np.round(tw * 16).astype(np.int32).reshape(-1, 1, 2)], False, 0.8, max(1, int(ss * 1.2)),
                              cv2.LINE_AA, shift=4)
        if pulse_t is not None:  # signal pulses travelling outward along the nerve
            cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(xy, axis=0), axis=1))])
            if cum[-1] > 1:
                for off in (0.0, 0.5):
                    tpos = ((pulse_t * 0.9 + off + (hash(name) % 7) * 0.05) % 1.0) * cum[-1]
                    j = np.searchsorted(cum, tpos)
                    j = min(max(j, 1), len(xy) - 1)
                    cv2.circle(pulses, tuple(int(v) for v in xy[j]), int(max(wpx * 1.8, 3 * ss)), 1.0, -1, cv2.LINE_AA)
    body = np.clip(body, 0, 1); core = np.clip(core, 0, 1)
    rgb = TEAL[None, None, :] * body[..., None]
    rgb = rgb * (1 - core[..., None]) + CORE[None, None, :] * core[..., None]
    alpha = np.maximum(body, core)
    glow = cv2.GaussianBlur(body, (0, 0), 6 * ss)[..., None] * TEAL[None, None, :] * 0.9
    if pulse_t is not None:
        pg = cv2.GaussianBlur(pulses, (0, 0), 5 * ss)
        rgb = rgb + pg[..., None] * 255 * 0.8
        alpha = np.maximum(alpha, np.clip(pg * 1.5, 0, 1))
        glow = glow + pg[..., None] * np.array([230, 255, 250], np.float32) * 1.2
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255])
    rgba = cv2.resize(rgba, (W, H), interpolation=cv2.INTER_AREA)
    glow = cv2.resize(glow, (W, H), interpolation=cv2.INTER_AREA)
    return rgba, glow
