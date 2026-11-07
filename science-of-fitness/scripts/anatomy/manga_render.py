"""Manga-ink renderer for anatomy meshes (no GPU, no Blender).

Rasterises the BodyParts3D layers with a Numba z-buffer, then draws them like a
seinen-manga anatomy plate: ink contours, toon tones, screen-space hatching,
fibre strokes that follow each muscle, and palette glows for the part being taught.

Library use:
    from manga_render import Scene
    sc = Scene(DATA); img = sc.render(layers=["muscle"], highlight={"biceps": "coral"})
"""
import json, math, os
import numpy as np
import cv2
from numba import njit, prange

STAGE = (10, 12, 16)
PAL = {"coral": (255, 84, 84), "teal": (38, 224, 196), "amber": (255, 184, 48)}
PAPER = np.array([238, 241, 244], np.float32)
INK = np.array([14, 16, 20], np.float32)


# ---------------------------------------------------------------- raster
@njit(cache=True, parallel=False)
def _raster(sv, vn, faces, fid, W, H, depth, nrm, oid):
    for t in range(faces.shape[0]):
        i0, i1, i2 = faces[t, 0], faces[t, 1], faces[t, 2]
        x0, y0, z0 = sv[i0, 0], sv[i0, 1], sv[i0, 2]
        x1, y1, z1 = sv[i1, 0], sv[i1, 1], sv[i1, 2]
        x2, y2, z2 = sv[i2, 0], sv[i2, 1], sv[i2, 2]
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-9:
            continue
        minx = max(int(math.floor(min(x0, min(x1, x2)))), 0)
        maxx = min(int(math.ceil(max(x0, max(x1, x2)))), W - 1)
        miny = max(int(math.floor(min(y0, min(y1, y2)))), 0)
        maxy = min(int(math.ceil(max(y0, max(y1, y2)))), H - 1)
        if minx > maxx or miny > maxy:
            continue
        inv = 1.0 / area
        for py in range(miny, maxy + 1):
            fy = py + 0.5
            for px in range(minx, maxx + 1):
                fx = px + 0.5
                w0 = ((x1 - fx) * (y2 - fy) - (x2 - fx) * (y1 - fy)) * inv
                w1 = ((x2 - fx) * (y0 - fy) - (x0 - fx) * (y2 - fy)) * inv
                w2 = 1.0 - w0 - w1
                if w0 < 0 or w1 < 0 or w2 < 0:
                    continue
                z = w0 * z0 + w1 * z1 + w2 * z2
                if z < depth[py, px]:
                    depth[py, px] = z
                    for k in range(3):
                        nrm[py, px, k] = w0 * vn[i0, k] + w1 * vn[i1, k] + w2 * vn[i2, k]
                    oid[py, px] = fid[t]


def vertex_normals(V, F):
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    vn = np.zeros_like(V)
    for k in range(3):
        np.add.at(vn, F[:, k], fn)
    vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
    return vn.astype(np.float32)


# ---------------------------------------------------------------- helpers
def stripes(h, w, angle_deg, spacing, width, phase=None):
    """Anti-aliased parallel lines; returns coverage 0..1."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = math.radians(angle_deg)
    u = xx * math.cos(a) + yy * math.sin(a)
    if phase is not None:
        u = u + phase
    d = np.abs((u / spacing) % 1.0 - 0.5) * spacing
    return np.clip(width / 2 + 0.5 - (spacing / 2 - d), 0, 1)


def smooth_noise(h, w, scale, seed):
    rng = np.random.default_rng(seed)
    small = rng.standard_normal((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)


def edge_mask(buf, thr):
    gx = np.abs(np.diff(buf, axis=1, prepend=buf[:, :1]))
    gy = np.abs(np.diff(buf, axis=0, prepend=buf[:1, :]))
    if buf.ndim == 3:
        gx = gx.sum(-1); gy = gy.sum(-1)
    return (gx > thr) | (gy > thr)


def thick(mask, px):
    if px <= 1:
        return mask.astype(np.float32)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (px, px))
    return cv2.dilate(mask.astype(np.uint8), k).astype(np.float32)


# ---------------------------------------------------------------- scene
class Scene:
    def __init__(self, data_dir):
        d = np.load(os.path.join(data_dir, "layers.npz"))
        self.V, self.F, self.PID = d["V"], d["F"], d["PID"]
        self.parts = json.load(open(os.path.join(data_dir, "parts.json")))
        self.layer = np.array([p["layer"] for p in self.parts])
        self.names = [p["name"].lower() for p in self.parts]
        self.VN = vertex_normals(self.V, self.F)
        self.center = (self.V.min(0) + self.V.max(0)) / 2
        # Family-friendly: drop the external genitalia from the skin mesh (front of the pelvis, near the midline)
        cen = self.V[self.F].mean(1) - self.center
        skin = self.layer[self.PID] == "skin"
        drop = skin & (np.abs(cen[:, 0]) < 48) & (cen[:, 2] > -108) & (cen[:, 2] < 15) & (cen[:, 1] < -66)
        self.F, self.PID = self.F[~drop], self.PID[~drop]

    def ids_matching(self, words, layer=None):
        out = []
        for p in self.parts:
            if layer and p["layer"] != layer:
                continue
            if any(w in p["name"].lower() for w in words):
                out.append(p["id"])
        return out

    # ---- camera: model points (relative to centre, mm) -> supersampled screen
    @staticmethod
    def project(P, W, H, yaw, view, ss):
        a = math.radians(yaw)
        R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]], np.float32)
        Q = np.asarray(P, np.float32) @ R.T
        cx, cz, height = view  # framing in model mm after rotation
        Ws, Hs = W * ss, H * ss
        s = Hs / height
        sv = np.empty_like(Q)
        sv[:, 0] = (Q[:, 0] - cx) * s + Ws / 2
        sv[:, 1] = Hs / 2 - (Q[:, 2] - cz) * s
        sv[:, 2] = Q[:, 1]  # depth: smaller y = nearer the viewer
        return sv, s

    # ---- geometry pass
    def _passes(self, layers, W, H, yaw, view, ss):
        keep = np.isin(self.layer[self.PID], layers)
        F = self.F[keep]; fid = self.PID[keep]
        # BodyParts3D: x = right-left, y = front(-)/back(+), z = up (mm)
        a = math.radians(yaw)
        R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]], np.float32)
        P = (self.V - self.center) @ R.T
        N = self.VN @ R.T
        Ws, Hs = W * ss, H * ss
        sv, s = self.project(self.V - self.center, W, H, yaw, view, ss)
        vn = np.stack([N[:, 0], -N[:, 2], N[:, 1]], 1).astype(np.float32)  # screen space: x right, y down, z away
        depth = np.full((Hs, Ws), np.inf, np.float32)
        nrm = np.zeros((Hs, Ws, 3), np.float32)
        oid = np.full((Hs, Ws), -1, np.int32)
        _raster(sv.astype(np.float32), vn, F.astype(np.int32), fid.astype(np.int32), Ws, Hs, depth, nrm, oid)
        nrm /= np.linalg.norm(nrm, axis=2, keepdims=True) + 1e-9
        return depth, nrm, oid, s

    # ---- one layer drawn as manga ink
    def draw(self, layers, W=1920, H=1080, yaw=0.0, view=(0.0, 0.0, 1900.0), ss=2,
             highlight=None, style="flesh", line_scale=1.0, fibres=True, shorts=False):
        depth, nrm, oid, s = self._passes(layers, W, H, yaw, view, ss)
        h, w = oid.shape
        fg = oid >= 0
        # model height of every pixel row (orthographic), used for the shorts
        zrow = view[1] + (h / 2 - (np.arange(h, dtype=np.float32) + 0.5)) / s
        xcol = view[0] + ((np.arange(w, dtype=np.float32) + 0.5) - w / 2) / s
        zone = (zrow[:, None] < 150) & (zrow[:, None] > -235) & (np.abs(xcol)[None, :] < 172)
        short_m = (fg & zone) if shorts else np.zeros_like(fg)
        if not shorts:
            zone = np.zeros_like(fg)
        L = np.array([-0.45, -0.65, -0.62], np.float32); L /= np.linalg.norm(L)
        lam = np.clip(nrm @ L, 0, 1)
        rim = np.clip(1 - np.abs(nrm[..., 2]), 0, 1) ** 3
        shade = np.where(fg, 0.18 + 0.82 * lam, 1)
        lw = ss * line_scale

        # toon tones (manga screentone levels)
        tone = np.where(shade > 0.55, 1.0, np.where(shade > 0.32, 0.86, 0.70)).astype(np.float32)
        img = PAPER[None, None, :] * tone[..., None]

        # hatching in shadow, cross-hatch in deep shadow
        h1 = stripes(h, w, 45, 6 * ss, 0.9 * ss) * ((shade < 0.45) & fg)
        h2 = stripes(h, w, -45, 6 * ss, 0.8 * ss) * ((shade < 0.28) & fg)
        hatch = np.maximum(h1 * 0.55, h2 * 0.75)

        # muscle fibres: lines along each part's long axis, wavy, denser in shadow
        fib = np.zeros((h, w), np.float32)
        if fibres and style == "flesh":
            noise = smooth_noise(h, w, 40 * ss, 3) * 3.0 * ss
            ys, xs = np.nonzero(fg)
            ids = oid[ys, xs]
            order = np.argsort(ids); ys, xs, ids = ys[order], xs[order], ids[order]
            cuts = np.flatnonzero(np.diff(ids)) + 1
            for gy, gx, gi in zip(np.split(ys, cuts), np.split(xs, cuts), np.split(ids, cuts)):
                if len(gx) < 30 or self.layer[gi[0]] not in ("muscle", "tendon"):
                    continue
                pts = np.stack([gx, gy], 1).astype(np.float32)
                c = pts - pts.mean(0)
                ev, evec = np.linalg.eigh(c.T @ c)
                dvec = evec[:, 1]  # long axis
                perp = np.array([-dvec[1], dvec[0]])
                u = (gx * perp[0] + gy * perp[1]) + noise[gy, gx]
                sp = (5.0 if self.layer[gi[0]] == "muscle" else 3.0) * ss
                dd = np.abs((u / sp) % 1.0 - 0.5) * sp
                wid = (0.35 + 0.8 * (1 - shade[gy, gx])) * ss
                cov = np.clip(wid / 2 + 0.5 - (sp / 2 - dd), 0, 1)
                fib[gy, gx] = cov * (0.12 + 0.75 * (1 - shade[gy, gx]) ** 1.5)
        if style == "bone":
            # stipple-like fine cross-hatching for bone texture
            hatch = np.maximum(hatch, stripes(h, w, 60, 5 * ss, 0.7 * ss) * ((shade < 0.75) & fg) * 0.35)

        ink_amt = np.clip(np.maximum(hatch, fib), 0, 1)
        img = img * (1 - ink_amt[..., None]) + INK[None, None, :] * ink_amt[..., None]

        sm = np.zeros_like(fg)
        if shorts and short_m.any():  # the host's teal shorts keep the skin layer YouTube-safe and on-brand
            k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(5 * ss), int(5 * ss)))
            sm = cv2.dilate(short_m.astype(np.uint8), k).astype(bool) & zone
            sm &= cv2.dilate(fg.astype(np.uint8), k).astype(bool)
            teal = np.array(PAL["teal"], np.float32)
            dist = cv2.distanceTransform(sm.astype(np.uint8), cv2.DIST_L2, 5)
            edge_shadow = (dist < 9 * ss).astype(np.float32)
            cloth = teal[None, None, :] * (0.95 - 0.2 * edge_shadow)[..., None]
            img[sm] = cloth[sm]
            fg = fg | sm
            band = sm & (zrow[:, None] > 130)
            img[band] = img[band] * 0.55
            oid = np.where(sm, -2, oid)  # one region, so the shorts get a clean outline
        # highlighted parts: recolour with palette, keep ink structure
        glow = np.zeros((h, w, 3), np.float32)
        if highlight:
            for ids, col in highlight:
                m = np.isin(oid, ids)
                if not m.any():
                    continue
                c = np.array(PAL[col], np.float32)
                base = c * (0.55 + 0.45 * shade[..., None])
                base = base * (1 - ink_amt[..., None] * 0.6) + INK * ink_amt[..., None] * 0.6
                img[m] = base[m]
                g = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 18 * ss)
                glow += g[..., None] * c[None, None, :] * 1.1

        # ink lines: silhouette (thick), part boundaries (medium), creases (thin)
        dz = np.where(fg, depth, depth[fg].max() + 500 if fg.any() else 0)
        sil = edge_mask(fg.astype(np.float32), 0.5)
        jump = edge_mask(dz, 12.0) & fg
        part = edge_mask(oid.astype(np.float32), 0.5) & fg
        crease = edge_mask(nrm, 0.9) & fg
        inner = ~sm  # no anatomy lines show through the shorts
        hem = edge_mask(zone.astype(np.float32), 0.5) & sm
        lines = np.maximum.reduce([thick(sil, int(3.2 * lw)), thick(jump & inner, int(2.2 * lw)),
                                   thick(part & inner, int(1.6 * lw)) * 0.9, thick(crease & inner, int(1.2 * lw)) * 0.55,
                                   thick(hem, int(2.0 * lw))])
        img = img * (1 - lines[..., None]) + INK[None, None, :] * lines[..., None]

        alpha = np.maximum(fg.astype(np.float32), thick(sil, int(3.2 * lw)))
        rgba = np.dstack([img, alpha * 255])
        rgba = cv2.resize(rgba, (W, H), interpolation=cv2.INTER_AREA)
        glow = cv2.resize(glow, (W, H), interpolation=cv2.INTER_AREA)
        return rgba.astype(np.float32), glow, cv2.resize(fg.astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)


def over(dst_rgb, rgba, opacity=1.0):
    a = rgba[..., 3:4] / 255.0 * opacity
    return dst_rgb * (1 - a) + rgba[..., :3] * a


def add_glow(dst_rgb, glow, strength=1.0):
    return np.clip(dst_rgb + glow * strength * 0.55, 0, 255)


def stage(W, H):
    return np.ones((H, W, 3), np.float32) * np.array(STAGE, np.float32)


def save(path, rgb_or_rgba):
    a = np.clip(rgb_or_rgba, 0, 255).astype(np.uint8)
    if a.shape[2] == 4:
        cv2.imwrite(path, cv2.cvtColor(a, cv2.COLOR_RGBA2BGRA))
    else:
        cv2.imwrite(path, cv2.cvtColor(a, cv2.COLOR_RGB2BGR))
