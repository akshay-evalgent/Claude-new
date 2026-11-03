"""Graphic overlays animated on the beat grid.

heartbreak: a glossy heart pops in, beats like a heart on every beat (lub-dub),
cracks on the beat before the break, then splits in two on the break beat:
the halves fall apart with a spin while shards fly out.

Spec (absolute beat indices into the edit's beat grid):
    "overlays": [{"type": "heartbreak", "appear_beat": 44, "crack_beat": 47, "break_beat": 48,
                  "x": 0.5, "y": 0.42, "size": 0.34, "color": "#E3192C"}]
Sound cues for each overlay come from cues(): heartbeats, crack, shatter.
"""
import math

import cv2
import numpy as np

SS = 2  # supersampling for clean edges


def hex_bgr(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return (b, g, r)


def heart_outline(n=240):
    """Classic heart curve, unit-ish size, y down. t in [0, pi] is the right half
    (notch -> tip), [pi, 2pi] the left half (tip -> notch)."""
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    x = 16 * np.sin(t) ** 3
    y = -(13 * np.cos(t) - 5 * np.cos(2 * t) - 2 * np.cos(3 * t) - np.cos(4 * t))
    return np.stack([x, y], 1) / 17.0, t


def crack_path(rng, top, bottom, n=7, jag=0.11):
    pts = [top]
    for i in range(1, n):
        f = i / n
        y = top[1] + (bottom[1] - top[1]) * f
        x = (jag if i % 2 else -jag) * (0.6 + 0.8 * rng.random())
        pts.append((x, y))
    pts.append(bottom)
    return np.array(pts)


class HeartBreak:
    def __init__(self, cfg, beats, W, H, seed=5):
        self.cfg = cfg
        self.W, self.H = W, H
        spb = float(np.median(np.diff(beats)))
        self.spb = spb

        def bt(i):
            return beats[i] if i < len(beats) else beats[-1] + (i - len(beats) + 1) * spb

        self.t_appear = bt(cfg["appear_beat"])
        self.t_break = bt(cfg["break_beat"])
        self.t_crack = bt(cfg.get("crack_beat", cfg["break_beat"] - 1))
        self.beat_times = [bt(i) for i in range(cfg["appear_beat"], cfg["break_beat"])]
        self.color = hex_bgr(cfg.get("color", "#E3192C"))
        self.R = cfg.get("size", 0.34) * W / 2
        self.cx, self.cy = cfg.get("x", 0.5) * W, cfg.get("y", 0.42) * H
        rng = np.random.default_rng(seed)
        outline, t = heart_outline()
        notch = outline[0]
        tip_i = len(outline) // 2
        tip = outline[tip_i]
        crack = crack_path(rng, tuple(notch), tuple(tip))
        self.outline = outline
        self.crack = crack
        # halves: right = outline notch->tip + crack tip->notch; left = outline tip->notch + crack notch->tip
        self.right = np.vstack([outline[:tip_i + 1], crack[::-1][1:-1]])
        self.left = np.vstack([outline[tip_i:], outline[:1], crack[1:-1]])
        # shards: small triangles along the crack
        self.shards = []
        for i in range(14):
            p = crack[rng.integers(1, len(crack) - 1)] + rng.normal(0, 0.04, 2)
            ang = rng.uniform(0, 2 * np.pi)
            size = rng.uniform(0.035, 0.08)
            tri = np.array([[math.cos(ang + k * 2.1), math.sin(ang + k * 2.1)] for k in range(3)]) * size
            vel = np.array([rng.uniform(-1.2, 1.2), rng.uniform(-1.6, -0.3)])
            self.shards.append((p, tri, vel, rng.uniform(-9, 9)))

    # ---------------------------------------------------------------- timing

    def active(self, t):
        return self.t_appear - 0.05 <= t <= self.t_break + 1.6

    def cues(self):
        """(time, kind) sound cues: heartbeat on each beat, crack, shatter on the break."""
        out = [(bt, "heartbeat") for bt in self.beat_times]
        out.append((self.t_crack, "crack"))
        out.append((self.t_break, "shatter"))
        return out

    # ---------------------------------------------------------------- drawing

    def _poly(self, img, pts, scale, cx, cy, rot, color, alpha_img=None):
        c, s = math.cos(rot), math.sin(rot)
        p = pts @ np.array([[c, s], [-s, c]]) * scale + [cx, cy]
        p = np.round(p * SS * 8).astype(np.int32)  # 3 fractional bits
        cv2.fillPoly(img, [p], color, lineType=cv2.LINE_AA, shift=3)
        return p

    def draw(self, frame, t):
        if not self.active(t):
            return
        W, H = self.W, self.H
        canvas = np.zeros((H * SS, W * SS, 3), np.uint8)
        mask = np.zeros((H * SS, W * SS), np.uint8)
        R = self.R
        # pop in
        a = (t - self.t_appear) / 0.22
        pop = 0 if a < 0 else (1 + 2.4 * (min(a, 1) - 1) ** 3 + 1.4 * (min(a, 1) - 1) ** 2)
        # heartbeat: lub on the beat, dub a little after
        beat = 0.0
        for bt in self.beat_times:
            d = t - bt
            if d >= 0:
                beat = 0.13 * math.exp(-d / 0.07) + (0.07 * math.exp(-(d - 0.15) / 0.07) if d > 0.15 else 0)
        scale = R * pop * (1 + beat)
        cx, cy = self.cx, self.cy
        # tremble once cracked
        if t >= self.t_crack:
            k = min(1.0, (t - self.t_crack) / max(0.05, self.t_break - self.t_crack))
            cx += 6 * k * math.sin(t * 90)
            cy += 4 * k * math.cos(t * 77)
        dark = tuple(int(v * 0.55) for v in self.color)

        if t < self.t_break:
            self._poly(canvas, self.outline, scale * 1.04, cx * SS / SS, cy, 0, dark)  # rim
            self._poly(canvas, self.outline, scale, cx, cy, 0, self.color)
            self._poly(mask, self.outline, scale * 1.04, cx, cy, 0, 255)
            if t >= self.t_crack:
                # crack grows from the notch down over ~0.18 s
                g = min(1.0, (t - self.t_crack) / 0.18)
                n = max(2, int(round(g * (len(self.crack) - 1))) + 1)
                pts = (self.crack[:n] * scale + [cx, cy]) * SS
                cv2.polylines(canvas, [np.round(pts * 8).astype(np.int32)], False, (245, 245, 255),
                              max(2, int(0.035 * scale * SS)), cv2.LINE_AA, shift=3)
        else:
            d = t - self.t_break
            fade = max(0.0, 1 - max(0.0, d - 0.9) / 0.6)
            g = 1800.0  # px/s^2 fall
            sep = R * (0.25 + 1.3 * d)
            for half, sx, rs in ((self.left, -1, -1), (self.right, 1, 1)):
                hx = cx + sx * sep
                hy = cy + 0.5 * g * d * d - 140 * d
                rot = rs * (0.35 * d + 0.9 * d * d)
                self._poly(canvas, half, R * 1.02, hx, hy, rot, tuple(int(v * fade) for v in dark))
                self._poly(canvas, half, R, hx, hy, rot, tuple(int(v * fade) for v in self.color))
                self._poly(mask, half, R * 1.02, hx, hy, rot, int(255 * fade))
            for p, tri, vel, spin in self.shards:
                px = cx + (p[0] + vel[0] * d * 1.4) * R
                py = cy + (p[1] + vel[1] * d * 1.4) * R + 0.5 * g * d * d
                if py > H + 50:
                    continue
                self._poly(canvas, tri, R, px, py, spin * d, tuple(int(v * fade) for v in (230, 230, 255)))
                self._poly(mask, tri, R, px, py, spin * d, int(255 * fade))

        canvas = cv2.resize(canvas, (W, H), interpolation=cv2.INTER_AREA)
        m = cv2.resize(mask, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        # glossy highlight + soft glow behind
        glow = cv2.GaussianBlur(m, (0, 0), 18) * 0.55
        col = np.array(self.color, np.float32)
        out = frame.astype(np.float32)
        out = out * (1 - glow[:, :, None]) + col * glow[:, :, None]
        hl = np.clip(m - cv2.GaussianBlur(m, (0, 0), 6), 0, 1)  # thin inner edge light
        canvas = np.clip(canvas.astype(np.float32) + hl[:, :, None] * 90, 0, 255)
        out = out * (1 - m[:, :, None]) + canvas * m[:, :, None]
        frame[:] = np.clip(out, 0, 255).astype(np.uint8)


def build(cfgs, beats, W, H):
    out = []
    for c in cfgs or []:
        if c["type"] == "heartbreak":
            out.append(HeartBreak(c, beats, W, H))
    return out
