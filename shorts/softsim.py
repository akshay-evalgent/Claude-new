#!/usr/bin/env python3
"""'0% vs 100% Soft' hydraulic-press Shorts, simulated and rendered from scratch (no external assets).

A glossy ball (2D position-based soft body: incompressible area, smooth skin,
shape matching for rigidity) is crushed by a hydraulic press.  0% = rigid (the
press stalls and shakes), 100% = squashed flat.  Rendered with pseudo-3D shading
(distance-field dome normals + specular), soft shadows, brushed-steel press and
synthesized hydraulic hum / thud / squish / creak sounds.

    python3 softsim.py --levels 0 25 50 75 100 --seg 3.6 --out press.mp4
"""
import argparse
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

W, H, FPS, SR = 1080, 1920, 30, 44100
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "fonts", "Montserrat-Black.ttf")

# ---------------------------------------------------------------- scene
FLOOR = 1600.0                        # top of the press base
R0 = 175.0                            # ball radius
PX0, PX1 = 150.0, 930.0               # press plate left / right
PLATE_H = 150                         # plate thickness
GAPS = {0: 1.0, 25: 0.82, 50: 0.6, 75: 0.42, 100: 0.28}   # final gap / ball diameter


class Blob:
    """2D soft ball (boundary model): incompressible area, surface tension on the skin,
    shape matching for rigidity.  Collides with the floor and with a moving press plate."""

    def __init__(self, soft, n=180, x=540.0, y=None):
        a = np.linspace(0, 2 * np.pi, n, endpoint=False)
        self.q = np.stack([np.cos(a), np.sin(a)], 1) * R0
        y = FLOOR - R0 if y is None else y
        self.P = self.q + [x, y]; self.v = np.zeros_like(self.P)
        self.rest_len = np.linalg.norm(np.roll(self.q, -1, 0) - self.q, axis=1)
        self.A0 = self.area(self.q)
        s = soft / 100.0
        self.k_shape = float(np.interp(s, [0, .25, .5, .75, 1], [1.0, .05, .012, .003, 0.0005]))
        self.tension = float(np.interp(s, [0, 1], [0.002, 0.004]))
        self.damp = float(np.interp(s, [0, 1], [0.9, 0.985]))
        self.plate = -1e9; self.contact_speed = 0.0; self.touching = False

    @property
    def p(self):
        return self.P

    @staticmethod
    def area(p):
        x, y = p[:, 0], p[:, 1]
        return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)

    def step(self, dt, plate_y, sub=24, iters=4):
        h = dt / sub; g = 2600.0; hit = 0.0
        y_from = self.plate if self.plate > -1e8 else plate_y
        for k in range(sub):
            self.plate = y_from + (plate_y - y_from) * (k + 1) / sub
            prev = self.P.copy()
            self.v[:, 1] += g * h
            vc = self.v.mean(0); self.v = vc + (self.v - vc) * self.damp
            self.P = self.P + self.v * h
            for _ in range(iters):
                self._skin(); self._area(); self._shape(); self._collide()
            self.v = (self.P - prev) / h
            self.v *= 0.998
        self.contact_speed = hit

    def _skin(self):
        """Smooth skin: even spacing along the outline + curvature smoothing (no ripples or loops)."""
        P = self.P; nxt, prv = np.roll(P, -1, 0), np.roll(P, 1, 0)
        d = nxt - P; L = np.linalg.norm(d, axis=1) + 1e-9
        target = np.maximum(L.mean() * (1 - self.tension), self.rest_len * 0.6)
        c = d * ((L - target) / L * 0.5 * 0.35)[:, None]
        P = P + c - np.roll(c, 1, 0)
        P = P + ((np.roll(P, -1, 0) + np.roll(P, 1, 0)) * 0.5 - P) * 0.12
        self.P = P

    def _area(self):
        A = self.area(self.P); P = self.P
        grad = 0.5 * np.stack([np.roll(P, -1, 0)[:, 1] - np.roll(P, 1, 0)[:, 1],
                               np.roll(P, 1, 0)[:, 0] - np.roll(P, -1, 0)[:, 0]], 1)
        self.P = P + (self.A0 - A) / (np.sum(grad ** 2) + 1e-9) * grad

    def _shape(self):
        if self.k_shape <= 0:
            return
        c = self.P.mean(0); r = self.P - c
        ang = np.arctan2(np.sum(self.q[:, 0] * r[:, 1] - self.q[:, 1] * r[:, 0]), np.sum(self.q * r))
        R = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
        self.P += (c + self.q @ R.T - self.P) * self.k_shape

    def _collide(self):
        x, y = self.P[:, 0], self.P[:, 1]
        under = (x > PX0) & (x < PX1)                      # only material under the plate is pressed
        y = np.where(under, np.maximum(y, self.plate), y)
        y = np.minimum(y, FLOOR)
        self.P = np.stack([np.clip(x, 30, W - 30), y], 1)


def gap_for(level):
    ks = sorted(GAPS)
    return float(np.interp(level, ks, [GAPS[k] for k in ks]))


# ---------------------------------------------------------------- rendering

def background():
    t = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array([196, 172, 186]), np.array([128, 108, 124])
    bg = (top * (1 - t) + bot * t) * np.ones((1, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.28 * (((xx - W / 2) / W) ** 2 + ((yy - H * 0.55) / H) ** 2) * 2.2
    return (bg * vig[..., None]).clip(0, 255).astype(np.uint8)


def stone(w, h, seed):
    rng = np.random.default_rng(seed)
    n = ndimage.gaussian_filter(rng.standard_normal((h, w)), 1.2) * 0.6 + ndimage.gaussian_filter(rng.standard_normal((h, w)), 6) * 1.8
    base = 112 + n * 9
    return np.stack([base, base * 0.98, base * 1.0], -1).clip(0, 255)


def steel(w, h, seed=0, base=150):
    rng = np.random.default_rng(seed)
    brushed = ndimage.gaussian_filter1d(rng.standard_normal((h, w)), 25, axis=1) * 10
    grad = np.linspace(1.18, 0.78, h)[:, None]
    v = (base + brushed) * grad
    return np.stack([v, v * 1.01, v * 1.05], -1).clip(0, 255)


def draw_static(img):
    a = img.astype(float)
    a[int(FLOOR):int(FLOOR) + 150, 60:1020] = steel(960, 150, 1, 135)                    # base
    a[int(FLOOR):int(FLOOR) + 5, 60:1020] = [235, 238, 245]                             # lit edge
    a[int(FLOOR) + 150:, :] = a[int(FLOOR) + 150:, :] * 0.6
    for x0 in (60, 960):                                                               # frame pillars
        a[0:int(FLOOR), x0:x0 + 60] = steel(60, int(FLOOR), 2 + x0, 120)
        a[0:int(FLOOR), x0:x0 + 4] *= 1.3; a[0:int(FLOOR), x0 + 56:x0 + 60] *= 0.7
    a[0:120, 60:1020] = steel(960, 120, 5, 110)                                         # top beam
    return a.clip(0, 255).astype(np.uint8)


PLATE = None


def draw_press(frame, plate_y):
    global PLATE
    if PLATE is None:
        pl = steel(int(PX1 - PX0), PLATE_H, 7, 160); pl[-6:] = [90, 92, 100]; pl[:4] *= 1.2
        rod = steel(140, 10, 9, 175)
        PLATE = (Image.fromarray(pl.clip(0, 255).astype(np.uint8)), rod)
    pl, rod = PLATE
    top = int(plate_y) - PLATE_H
    rod_img = Image.fromarray(np.repeat(rod[:1], max(1, top - 120), 0).clip(0, 255).astype(np.uint8))
    rod_shade = np.linspace(0.75, 1.15, 140)[None, :, None]
    rod_img = Image.fromarray((np.asarray(rod_img).astype(float) * rod_shade).clip(0, 255).astype(np.uint8))
    frame.paste(rod_img, (470, 120))
    frame.paste(pl, (int(PX0), top))


def draw_blob(frame, pts, color=(236, 182, 52)):
    ss = 2
    x0, y0 = np.floor(pts.min(0) - 30).astype(int); x1, y1 = np.ceil(pts.max(0) + 30).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W), min(y1, H)
    w, h = (x1 - x0) * ss, (y1 - y0) * ss
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).polygon([tuple(((p - [x0, y0]) * ss)) for p in pts], fill=255)
    mask = np.asarray(m) > 127
    d = ndimage.distance_transform_edt(mask) / ss
    rad = max(8.0, min(R0 * 0.9, d.max()))
    z = np.sqrt(np.clip(1 - (1 - np.clip(d / rad, 0, 1)) ** 2, 0, 1)) * rad                 # dome height
    gy, gx = np.gradient(z)
    nz = np.ones_like(z) * 0.55
    nrm = np.stack([-gx, -gy, nz], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    L = np.array([-0.45, -0.65, 0.62]); L /= np.linalg.norm(L)
    Hh = L + [0, 0, 1]; Hh /= np.linalg.norm(Hh)
    lam = np.clip(nrm @ L, 0, 1); spec = np.clip(nrm @ Hh, 0, 1) ** 60
    rim = (1 - np.clip(nrm[..., 2], 0, 1)) ** 2
    col = np.array(color, float)
    rgb = col * (0.25 + 0.85 * lam)[..., None] + 255 * spec[..., None] * 1.1 + col * 0.35 * rim[..., None]
    rgb = rgb.clip(0, 255)
    alpha = ndimage.gaussian_filter(mask.astype(float), 0.8)
    img = Image.fromarray(rgb.astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.LANCZOS)
    frame.paste(img, (int(x0), int(y0)), al)


def draw_shadow(frame, pts):
    c = pts.mean(0); bottom = pts[:, 1].max(); dist = max(0.0, FLOOR - bottom)
    wdt = np.ptp(pts[:, 0]) * (1.05 + dist / 900); a = int(np.clip(150 - dist * 0.3, 0, 150))
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).ellipse((c[0] - wdt / 2, FLOOR - 12, c[0] + wdt / 2, FLOOR + 12), fill=a)
    frame.paste(Image.new("RGB", (W, H), (30, 26, 34)), (0, 0), sh.filter(ImageFilter.GaussianBlur(12)))


def label(frame, text):
    d = ImageDraw.Draw(frame); f = ImageFont.truetype(FONT, 96)
    tw = f.getlength(text); x, y = (W - tw) / 2, 175
    d.rounded_rectangle((x - 36, y - 10, x + tw + 36, y + 118), 30, fill=(28, 24, 32))
    d.text((x, y), text, font=f, fill=(255, 210, 70) if text.startswith("100") else (255, 255, 255))


# ---------------------------------------------------------------- audio

def thud(gain, rng):
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 55 + 90 * np.exp(-t * 25)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
    y += ndimage.gaussian_filter1d(rng.standard_normal(n), 2) * np.exp(-t * 50) * 0.4
    return y * gain


def hum(dur, gain):
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * t) / k for k, f in enumerate((62, 124, 186, 248), 1))
    y *= 1 + 0.15 * np.sin(2 * np.pi * 7 * t)
    env = np.minimum(1, t / 0.08) * np.minimum(1, (dur - t) / 0.12).clip(0, 1)
    return y * env * gain


def squish(dur, gain, rng):
    n = int(dur * SR); t = np.arange(n) / SR
    noise = ndimage.gaussian_filter1d(rng.standard_normal(n), 5)
    wob = 1 + 0.7 * np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 2 * t))
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2
    return noise * wob * env * gain


def creak(dur, gain, rng):
    n = int(dur * SR); t = np.arange(n) / SR
    clicks = (rng.random(n) < 0.004).astype(float)
    y = ndimage.gaussian_filter1d(clicks, 2) * 30
    y = np.convolve(y, np.sin(2 * np.pi * 300 * np.arange(400) / SR) * np.exp(-np.arange(400) / 80), "same")
    return y * gain * np.minimum(1, t / 0.2)


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--levels", type=int, nargs="+", default=[0, 25, 50, 75, 100])
    ap.add_argument("--seg", type=float, default=3.6)
    ap.add_argument("--out", required=True)
    ap.add_argument("--color", default="236,182,52")
    a = ap.parse_args()
    color = tuple(int(v) for v in a.color.split(","))
    static = Image.fromarray(draw_static(background()))
    nseg = int(a.seg * FPS); total = nseg * len(a.levels)
    audio = np.zeros(int(total / FPS * SR) + SR); rng = np.random.default_rng(3)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                          "-i", "-", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", a.out + ".v.mp4"], stdin=subprocess.PIPE)
    fr_total = 0
    contact_y = FLOOR - 2 * R0; start_y = 600.0
    for lv in a.levels:
        b = Blob(lv); target = FLOOR - 2 * R0 * gap_for(lv)
        t_app, t_sq = 0.35, 1.45                       # start of approach, contact time
        t_end = t_sq + (2.6 - t_sq) * (0.25 + 0.75 * (1 - gap_for(lv)) / 0.72)
        seg0 = int(fr_total / FPS * SR)
        audio[seg0 + int(t_app * SR): seg0 + int(t_app * SR) + int((t_sq - t_app) * SR)] += hum(t_sq - t_app, 0.10)
        audio[seg0 + int(t_sq * SR): seg0 + int(t_sq * SR) + int(0.4 * SR)] += thud(0.8, rng)
        if lv == 0:
            c = creak(1.6, 0.25, rng); audio[seg0 + int(t_sq * SR): seg0 + int(t_sq * SR) + len(c)] += c
        else:
            d = t_end - t_sq; q = squish(d + 0.2, 0.7 + 0.012 * lv, rng)
            audio[seg0 + int(t_sq * SR): seg0 + int(t_sq * SR) + len(q)] += q
            hm = hum(d, 0.06); audio[seg0 + int(t_sq * SR): seg0 + int(t_sq * SR) + len(hm)] += hm
        for fr in range(nseg):
            t = fr / FPS
            if t < t_app:
                py = start_y
            elif t < t_sq:
                k = (t - t_app) / (t_sq - t_app); py = start_y + (contact_y - start_y) * (k * k * (3 - 2 * k))
            elif t < t_end:
                k = (t - t_sq) / (t_end - t_sq); py = contact_y + (target - contact_y) * (1 - (1 - k) ** 2)
            else:
                py = target
            shake = (np.sin(t * 90) * 3.0) if (lv == 0 and t_sq < t < t_sq + 1.4) else 0.0
            b.step(1 / FPS, py + shake)
            im = static.copy()
            draw_shadow(im, b.p); draw_blob(im, b.p, color); draw_press(im, py + shake)
            label(im, f"{lv}% SOFT")
            p.stdin.write(im.tobytes()); fr_total += 1
    p.stdin.close(); p.wait()
    audio = ndimage.uniform_filter1d(audio, 2)
    import pyloudnorm as pyln
    lufs = pyln.Meter(SR).integrated_loudness(audio)
    audio = np.tanh(audio * 10 ** ((-14 - lufs) / 20) * 1.1) / 1.1         # -14 LUFS with a soft limiter
    import soundfile as sf
    wav = a.out + ".wav"; sf.write(wav, np.stack([audio, audio], 1).astype(np.float32), SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.out + ".v.mp4", "-i", wav, "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.out], check=True)
    os.remove(a.out + ".v.mp4"); os.remove(wav)
    print(a.out, f"{total / FPS:.1f}s")


if __name__ == "__main__":
    main()
