"""Mitochondria assets in the channel's manga-ink style.

    python3 mito.py <out dir>

mito-cutaway            one mitochondrion: double membrane, cristae, ATP synthase, matrix, mtDNA
mito-in-fibre           3D: striated myofibrils with mitochondria packed between them (manga_render)
mito-trained-untrained  fibre cross-sections: untrained vs endurance-trained
anim/mito-atp-stream    ATP particles streaming out of the mitochondrion
Each still is written clean (transparent PNG) with labelled JPG previews.
Textbook schematics, simplified for teaching.
"""
import math, os, sys
import numpy as np
import cv2
from scipy.spatial import Voronoi
OUT = sys.argv[1]
sys.argv = [sys.argv[0], OUT]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import micro as M
from micro import Canvas, label, INK, PAPER, TEAL, CORAL, AMBER, GREY, W, H, SS
from manga_render import Scene, vertex_normals, over, add_glow, stage, save

rng = np.random.default_rng(23)
MATRIX = (206, 240, 234)
SPACE = (232, 236, 240)


def capsule(c, rx, ry, ang, n=360, p=2.6):
    """Superellipse capsule outline."""
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    x = rx * np.sign(np.cos(t)) * np.abs(np.cos(t)) ** (2 / p)
    y = ry * np.sign(np.sin(t)) * np.abs(np.sin(t)) ** (2 / p)
    a = math.radians(ang)
    return np.stack([c[0] + x * math.cos(a) - y * math.sin(a), c[1] + x * math.sin(a) + y * math.cos(a)], 1)


def write(cv, name, label_sets):
    rgba, glow = cv.result()
    os.makedirs(os.path.join(OUT, "micro"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "previews"), exist_ok=True)
    g = glow.max(axis=2, keepdims=True) / 255.0
    col = np.where(g > 1e-4, glow / np.maximum(g, 1e-4), 0)
    a = rgba[..., 3:4] / 255.0; ga = np.clip(g * 0.55, 0, 1); oa = a + ga * (1 - a)
    rgb = (rgba[..., :3] * a + col * ga * (1 - a)) / np.maximum(oa, 1e-4)
    save(os.path.join(OUT, "micro", name + ".png"), np.dstack([rgb, oa * 255]))
    clean = add_glow(over(stage(W, H), rgba), glow)
    save(os.path.join(OUT, "previews", f"micro-{name}.jpg"), clean)
    for suffix, draw in label_sets:
        lab = Canvas()
        draw(lab)
        lr, lg = lab.result()
        save(os.path.join(OUT, "previews", f"micro-{name}-{suffix}.jpg"), add_glow(over(clean, lr), lg))
    return rgba, glow


# ------------------------------------------------------------------ cutaway
def mito_cutaway(cv=None):
    cv = cv or Canvas()
    c, rx, ry, ang = (930, 560), 560, 235, -6
    # 3D rim: the organelle's thickness under the cut face
    rim = capsule((c[0] + 6, c[1] + 26), rx, ry, ang)
    rm = cv.fill(rim, (196, 202, 210))
    cv.hatch(rm, 75, 6, 1.0, INK, 0.45)
    cv.line(rim, INK, 3.4, closed=True)
    outer = capsule(c, rx, ry, ang)
    cv.fill(outer, SPACE)
    cv.line(outer, INK, 4.0, closed=True)
    inner = capsule(c, rx - 24, ry - 24, ang)
    mm = cv.fill(inner, MATRIX)
    cv.glow += cv2.GaussianBlur(mm, (0, 0), 30 * SS)[..., None] * np.array(TEAL, np.float32) * 0.55
    # cristae: tongues of inner membrane folding into the matrix
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); vx, vy = -math.sin(a), math.cos(a)
    xs = np.linspace(-rx + 120, rx - 120, 9)
    cristae = []
    for i, x in enumerate(xs):
        side = 1 if i % 2 == 0 else -1
        # start each fold on the inner membrane at this position along the capsule (superellipse, p = 2.6)
        base = (ry - 24) * max(0.0, 1 - (abs(x) / (rx - 24)) ** 2.6) ** (1 / 2.6) - 2
        depth = base * rng.uniform(1.1, 1.45)
        wob = rng.uniform(-14, 14)
        pts = []
        for s in np.linspace(0, 1, 30):  # left edge going in, round tip, right edge coming out
            pts.append((x - 15 + wob * s * s, side * (base - s * depth)))
        for th in np.linspace(math.pi, 0, 14):
            pts.append((x + wob + 15 * math.cos(th), side * (base - depth) - side * 15 * math.sin(th) * 0.0 - side * 12 * math.sin(th)))
        for s in np.linspace(1, 0, 30):
            pts.append((x + 15 + wob * s * s, side * (base - s * depth)))
        P = np.array([(c[0] + px * ux + py * vx, c[1] + px * uy + py * vy) for px, py in pts])
        cristae.append(P)
        cv.fill(P, SPACE)
        cv.line(P, INK, 2.6)
        # ATP synthase knobs along the crista, pointing into the matrix
        for j in range(4, len(P) - 4, 5):
            if 28 <= j <= 46:
                continue
            p0, p1 = P[j - 1], P[j + 1]
            tdir = (p1 - p0) / (np.linalg.norm(p1 - p0) + 1e-6)
            nrm = np.array([-tdir[1], tdir[0]]) * (1 if j < 30 else -1) * side
            stalk = P[j] + nrm * 9
            cv.line([P[j], stalk], INK, 1.4)
            cv.ellipse(stalk + nrm * 4, (4.2, 4.2), 0, INK, 1.0, fill=TEAL)
    cv.line(inner, INK, 2.8, closed=True)
    # matrix granules, ribosomes and mtDNA loops
    mask = cv.mask_of(inner)
    for P in cristae:
        mask = mask * (1 - cv.mask_of(P))
    cv.stipple(mask, 0.006, 1.6, (90, 130, 124), 0.7)
    for k in range(5):
        px, py = rng.uniform(-rx + 140, rx - 140), rng.uniform(-40, 40)
        q = (c[0] + px * ux + py * vx, c[1] + px * uy + py * vy)
        t = np.linspace(0, 2 * math.pi, 60)
        loop = np.stack([q[0] + 16 * np.cos(t) + 4 * np.sin(3 * t), q[1] + 11 * np.sin(t) + 3 * np.cos(4 * t)], 1)
        cv.line(loop, (40, 110, 100), 1.6, closed=True)
    for k in range(10):
        px, py = rng.uniform(-rx + 130, rx - 130), rng.uniform(-ry + 70, ry - 70)
        q = (c[0] + px * ux + py * vx, c[1] + px * uy + py * vy)
        cv.ellipse(q, (8, 8), 0, INK, 1.2, fill=AMBER)  # matrix granules (calcium phosphate)
    return cv, cristae


def arrow(cv, a, b, color, width, head=26, glow=0.0):
    a, b = np.array(a, float), np.array(b, float)
    d = (b - a) / np.linalg.norm(b - a); n = np.array([-d[1], d[0]])
    cv.line([a, b - d * head * 0.6], color, width, glow=glow)
    cv.fill([b, b - d * head + n * head * 0.55, b - d * head - n * head * 0.55], color)


def badge(cv, c, text, fill, txt=INK, r=36):
    cv.ellipse(c, (r, r), 0, INK, 2.0, fill=fill)
    cv.text((c[0] - r * 0.62, c[1] + 9), text, 26, txt)


def cutaway_labels(lab):
    for tip, txy, s in [((930, 323), (760, 250), "Outer membrane"), ((640, 380), (330, 290), "Inner membrane"),
                        ((1060, 470), (1150, 250), "Cristae (folds)"), ((870, 640), (700, 900), "Matrix"),
                        ((1239, 452), (1360, 250), "ATP synthase"), ((1020, 560), (1120, 900), "Mitochondrial DNA")]:
        label(lab, tip, txy, s)


def flow_labels(lab):
    arrow(lab, (80, 430), (330, 480), AMBER, 10); lab.text((70, 400), "Fuel: glucose, fat", 28, AMBER)
    arrow(lab, (80, 690), (330, 640), (200, 206, 214), 8); lab.text((70, 750), "Oxygen", 28, (200, 206, 214))
    for k, (y, yy) in enumerate(((420, 330), (560, 560), (700, 790))):
        arrow(lab, (1540, y), (1740, yy), TEAL, 10, glow=0.8)
        badge(lab, (1800, yy), "ATP", TEAL)
    arrow(lab, (1500, 860), (1640, 960), (200, 206, 214), 6); lab.text((1600, 1010), "CO2 + water", 26, (200, 206, 214))


def build_cutaway():
    cv, _ = mito_cutaway()
    return write(cv, "mito-cutaway", [("labelled", cutaway_labels), ("energy-flow", flow_labels)])


# ------------------------------------------------------------------ trained vs untrained
def fibre_section(cv, c, R, n_mito, mito_size, n_sub, n_cap, seed):
    g = np.random.default_rng(seed)
    cv.ellipse(c, (R, R), 0, INK, 4.0, fill=PAPER)
    pts = []
    while len(pts) < 150:
        p = g.uniform(-R, R, 2)
        if np.linalg.norm(p) < R - 30:
            pts.append(p)
    pts = np.array(pts)
    vor = Voronoi(np.vstack([pts, [[3 * R, 0], [-3 * R, 0], [0, 3 * R], [0, -3 * R]]]))
    edges = []
    for i, reg in enumerate(vor.point_region[:len(pts)]):
        poly = vor.regions[reg]
        if -1 in poly or not poly:
            continue
        P = vor.vertices[poly]
        if np.linalg.norm(P, axis=1).max() > R - 8:
            continue
        cen = P.mean(0); Q = cen + (P - cen) * 0.8
        cv.fill(Q + c, (214, 219, 226)); cv.line(np.vstack([Q, Q[:1]]) + c, INK, 1.0, 0.8)
    for (i, j) in vor.ridge_vertices:
        if i >= 0 and j >= 0:
            a, b = vor.vertices[i], vor.vertices[j]
            if np.linalg.norm(a) < R - 25 and np.linalg.norm(b) < R - 25:
                edges.append((a, b))
    g.shuffle(edges)
    mlayer = Canvas()
    for a, b in edges[:n_mito]:
        m = (a + b) / 2 + c; d = b - a
        cv.ellipse(m, (mito_size * 1.8, mito_size), math.degrees(math.atan2(d[1], d[0])), INK, 1.4, fill=TEAL)
    for k in range(n_sub):  # just under the membrane
        t = g.uniform(0, 2 * math.pi); rr = R - mito_size * 1.6 - 6
        m = (c[0] + rr * math.cos(t), c[1] + rr * math.sin(t))
        cv.ellipse(m, (mito_size * 1.8, mito_size), math.degrees(t) + 90, INK, 1.4, fill=TEAL)
    mask = np.zeros((cv.h, cv.w), np.float32)
    cv.glow += 0  # glow from teal pixels
    tm = (np.abs(cv.rgb - np.array(TEAL, np.float32)).sum(-1) < 30).astype(np.float32)
    cv.glow += cv2.GaussianBlur(tm, (0, 0), 6 * SS)[..., None] * np.array(TEAL, np.float32) * 0.7
    for k in range(2):  # nuclei at the edge
        t = g.uniform(0, 2 * math.pi); rr = R - 22
        cv.ellipse((c[0] + rr * math.cos(t), c[1] + rr * math.sin(t)), (26, 12), math.degrees(t) + 90, INK, 1.8, fill=(190, 196, 206))
    for k in range(n_cap):  # capillaries around the fibre
        t = 2 * math.pi * k / n_cap + g.uniform(-0.2, 0.2); rr = R + 26
        cv.ellipse((c[0] + rr * math.cos(t), c[1] + rr * math.sin(t)), (13, 13), 0, INK, 1.6, fill=CORAL)
        cv.ellipse((c[0] + rr * math.cos(t), c[1] + rr * math.sin(t)), (5, 5), 0, INK, 0, fill=(255, 205, 205))


def build_trained():
    cv = Canvas()
    fibre_section(cv, (520, 560), 330, 22, 7, 6, 3, 1)
    fibre_section(cv, (1400, 560), 330, 85, 9.5, 28, 7, 2)

    def labels(lab):
        lab.text((360, 140), "Untrained", 40)
        lab.text((1150, 140), "After endurance training", 40)
        lab.text((1070, 1010), "More and bigger mitochondria, more capillaries", 26, (200, 206, 214))
        for tip, txy, s in [((520, 560), (330, 960), "Myofibrils"), ((1186, 330), (1180, 230), "Mitochondria"),
                            ((1400, 864), (1500, 960), "Capillary"), ((216, 560), (60, 760), "Fibre membrane")]:
            label(lab, tip, txy, s)
    return write(cv, "mito-trained-untrained", [("labelled", labels)])


# ------------------------------------------------------------------ mitochondria inside a fibre (3D)
def cylinder(x0, x1, cy, cz, r, n=16):
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    ring = np.stack([np.zeros(n), cy + r * np.cos(t), cz + r * np.sin(t)], 1)
    V = np.vstack([ring + [x0, 0, 0], ring + [x1, 0, 0], [[x0, cy, cz], [x1, cy, cz]]]).astype(np.float32)
    F = []
    for i in range(n):
        j = (i + 1) % n
        F += [[i, j, n + i], [j, n + j, n + i], [2 * n, j, i], [2 * n + 1, n + i, n + j]]
    return V, np.array(F, np.int32)


def ellipsoid(c, r, n=18):
    u, v = np.meshgrid(np.linspace(0, 2 * math.pi, n, endpoint=False), np.linspace(0, math.pi, n // 2 + 1))
    P = np.stack([np.cos(u) * np.sin(v), np.sin(u) * np.sin(v), np.cos(v)], -1).reshape(-1, 3) * r + c
    F = []
    for i in range(n // 2):
        for j in range(n):
            a, b = i * n + j, i * n + (j + 1) % n
            c2, d = (i + 1) * n + j, (i + 1) * n + (j + 1) % n
            F += [[a, c2, b], [b, c2, d]]
    return P.astype(np.float32), np.array(F, np.int32)


def build_in_fibre():
    Vs, Fs, P, parts = [], [], [], []
    off = 0

    def add(V, F, name):
        nonlocal off
        pid = len(parts); parts.append({"id": pid, "layer": "muscle", "name": name})
        Vs.append(V); Fs.append(F + off); P.append(np.full(len(F), pid, np.int32)); off += len(V)

    add(*cylinder(-1100, -520, 0, 0, 165, 72), "sarcolemma")
    g = np.random.default_rng(4)
    pos = []
    for _ in range(6000):
        a, d = g.uniform(0, 2 * math.pi), math.sqrt(g.uniform(0, 1)) * 140
        p = (d * math.cos(a), d * math.sin(a))
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > 36 ** 2 for q in pos):
            pos.append(p)
    for k, (y, z) in enumerate(pos):
        x = -521.0
        end = -60 + g.uniform(-120, 160)
        band = 0
        while x < end:  # sarcomere bands: dark A band, light I band
            L = 30 if band % 2 == 0 else 16
            r = 16.5 if band % 2 == 0 else 14.5
            add(*cylinder(x, min(x + L, end), y, z, r), "myofibril A" if band % 2 == 0 else "myofibril I")
            x += L; band += 1
    # mitochondria in the gaps between neighbouring myofibrils
    n_m = 0
    for i, a in enumerate(pos):
        for j in range(i + 1, len(pos)):
            b = pos[j]
            if (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 < 42 ** 2 and g.uniform() < 0.8:
                m = np.array([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
                rr = np.linalg.norm(m)
                if rr > 70:  # push outer ones onto the visible surface
                    m = m * (rr + 10) / rr
                for xs in (g.uniform(-480, -380), g.uniform(-330, -230), g.uniform(-190, -100)):
                    add(*ellipsoid(np.array([xs, m[0], m[1]]), np.array([38, 11.5, 11.5])), "mitochondrion")
                    n_m += 1
    V = np.vstack(Vs); F = np.vstack(Fs); PID = np.concatenate(P)
    sc = Scene.__new__(Scene)
    sc.V, sc.F, sc.PID, sc.parts = V, F, PID, parts
    sc.layer = np.array([p["layer"] for p in parts]); sc.names = [p["name"] for p in parts]
    sc.VN = vertex_normals(V, F); sc.center = (V.min(0) + V.max(0)) / 2
    mids = [p["id"] for p in parts if p["name"] == "mitochondrion"]
    rgba, glow, _ = sc.draw(["muscle"], W, H, yaw=-28.0, view=(-110, 0, 760), ss=SS, highlight=[(mids, "teal")], fibres=False)
    os.makedirs(os.path.join(OUT, "micro"), exist_ok=True)
    g2 = glow.max(axis=2, keepdims=True) / 255.0
    col = np.where(g2 > 1e-4, glow / np.maximum(g2, 1e-4), 0)
    a = rgba[..., 3:4] / 255.0; ga = np.clip(g2 * 0.55, 0, 1); oa = a + ga * (1 - a)
    save(os.path.join(OUT, "micro", "mito-in-fibre.png"), np.dstack([(rgba[..., :3] * a + col * ga * (1 - a)) / np.maximum(oa, 1e-4), oa * 255]))
    clean = add_glow(over(stage(W, H), rgba), glow)
    save(os.path.join(OUT, "previews", "micro-mito-in-fibre.jpg"), clean)
    lab = Canvas()
    for tip, txy, s in [((620, 470), (420, 930), "Muscle fibre"), ((1200, 410), (1000, 200), "Myofibrils (striped)"),
                        ((1505, 618), (1500, 930), "Mitochondria")]:
        label(lab, tip, txy, s)
    lr, _ = lab.result()
    save(os.path.join(OUT, "previews", "micro-mito-in-fibre-labelled.jpg"), over(clean, lr))
    print("mitochondria placed:", n_m, flush=True)


# ------------------------------------------------------------------ animation
def build_anim(rgba, glow, fps=30, secs=5):
    base = add_glow(over(stage(W, H), rgba), glow * 0.8)
    outline = capsule((930, 560), 560, 235, -6, n=720)
    cen = np.array([930.0, 560.0])
    g = np.random.default_rng(9)
    n = 70
    born = g.uniform(-1.5, secs, n)
    idx = g.integers(0, len(outline), n)
    life = g.uniform(1.4, 2.2, n)
    d = os.path.join(OUT, "anim", "_mito"); os.makedirs(d, exist_ok=True)
    for f in range(fps * secs):
        t = f / fps
        pul = 1 + 0.25 * math.sin(t * 2 * math.pi / 1.6)
        img = add_glow(over(stage(W, H), rgba), glow * pul)
        layer = np.zeros((H, W), np.float32)
        for i in range(n):
            for cyc in range(4):  # particles respawn every cycle
                age = t - born[i] - cyc * (secs / 2)
                if not (0 <= age <= life[i]):
                    continue
                p0 = outline[idx[i]]
                v = p0 - cen; v = v / (np.linalg.norm(v) + 1e-6)
                p = p0 + v * (40 + age * 140) + np.array([0, -18 * math.sin(age * 3 + i)])
                alpha = min(1, age / 0.25) * max(0, 1 - age / life[i])
                cv2.circle(layer, (int(p[0]), int(p[1])), 7, alpha, -1, cv2.LINE_AA)
        gl = cv2.GaussianBlur(layer, (0, 0), 8)
        img = np.clip(img + layer[..., None] * np.array([200, 255, 246]) * 0.9 + gl[..., None] * np.array(TEAL) * 1.6, 0, 255)
        cv2.imwrite(os.path.join(d, f"{f:04d}.png"), cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2BGR))
    import subprocess, shutil
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(d, "%04d.png"), "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", os.path.join(OUT, "anim", "mito-atp-stream.mp4")], check=True)
    shutil.rmtree(d)


if __name__ == "__main__":
    which = os.environ.get("MITO_WHAT", "cutaway,trained,fibre,anim").split(",")
    rg = None
    if "cutaway" in which or "anim" in which:
        rg = build_cutaway(); print("mito-cutaway", flush=True)
    if "trained" in which:
        build_trained(); print("mito-trained-untrained", flush=True)
    if "fibre" in which:
        build_in_fibre(); print("mito-in-fibre", flush=True)
    if "anim" in which:
        build_anim(*rg); print("anim mito-atp-stream", flush=True)
