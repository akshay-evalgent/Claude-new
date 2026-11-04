#!/usr/bin/env python3
""""Could a harpoon really pin Dom's car?": an original physics Short.

Everything is drawn here (no film footage, logos or posters) and the sound is synthesised
effects only. Add a trending sound from YouTube's Shorts sound library at upload; it is
licensed for Shorts, unlike a song burned into the file.

Output: film/harpoon/out/harpoon-physics.mp4 (1080x1920, 30 fps, about 34 s)
Usage:  python3 film/harpoon/make.py
"""
from __future__ import annotations

import math
import os
import subprocess
import urllib.request
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
W, H, FPS = 1080, 1920, 30
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf"
FONT_PATH = os.path.expanduser("~/.cache/shorts-playbook/Montserrat-VF.ttf")

BG, GRID, INK = (10, 22, 44), (24, 44, 78), (236, 241, 248)
YEL, RED, MUTED, BODY = (255, 213, 63), (255, 84, 84), (150, 170, 200), (20, 36, 66)

# ---- the physics (back-of-envelope; assumptions in NOTES.md) -----------------------
PUSH_KN = 8      # rear tyres: 0.5 x 1700 kg x 9.81 x mu 1.0
CABLE_KN = 60    # 10 mm steel wire rope, minimum breaking load
ANCHOR_KN = 17   # 2.3 t car sliding on locked wheels, mu 0.75
HOOK_KN = 5      # tear-out of a hook through 0.8 mm body steel, 15 mm edge distance
STOP_KN = 33     # 1700 kg from 100 km/h to 0 in 20 m: m v^2 / 2s

# ---- timeline: (start, end, headline lines) ----------------------------------------
BEATS = [
    (0.0, 2.4, [("COULD A HARPOON", INK), ("REALLY PIN", YEL), ("DOM'S CAR?", YEL)]),
    (2.4, 6.0, [("IN FATE OF THE FURIOUS", MUTED), ("THE CREW HARPOONS", INK),
                ("HIS PLYMOUTH GTX", INK), ("FROM SEVERAL CARS", INK)]),
    (6.0, 10.4, [("HORSEPOWER", INK), ("DOESN'T MATTER.", INK), ("HIS TYRES CAN ONLY", INK),
                 ("PUSH ≈ 8 kN", YEL)]),
    (10.4, 14.4, [("ONE 10 MM", INK), ("STEEL CABLE", INK), ("HOLDS ≈ 60 kN", YEL)]),
    (14.4, 18.6, [("ONE ANCHOR CAR", INK), ("WITH LOCKED BRAKES", INK), ("HOLDS ≈ 17 kN", YEL)]),
    (18.6, 23.0, [("THE WEAK SPOT:", RED), ("A HOOK IN 0.8 MM", INK),
                  ("BODY STEEL TEARS", INK), ("OUT AT ≈ 5 kN", RED)]),
    (23.0, 27.4, [("AT 100 KM/H", INK), ("STOPPING HIM IN 20 M", INK), ("TAKES ≈ 33 kN", YEL)]),
    (27.4, 31.6, [("VERDICT", YEL), ("PIN HIM: YES*", INK), ("STOP HIM AT", RED),
                  ("SPEED: NO", RED)]),
    (31.6, 34.2, [("WHICH STUNT", INK), ("SHOULD WE", INK), ("TEST NEXT?", YEL)]),
]
DUR = BEATS[-1][1]
LOOP = 0.5

# chart rows: label, kN, colour, time it appears
ROWS = [
    ("DOM'S TYRES CAN PUSH", PUSH_KN, INK, 6.6),
    ("ONE 10 MM STEEL CABLE", CABLE_KN, YEL, 10.9),
    ("ANCHOR CAR, BRAKES LOCKED", ANCHOR_KN, YEL, 14.9),
    ("HOOK IN 0.8 MM BODY STEEL", HOOK_KN, RED, 19.1),
    ("STOP FROM 100 KM/H IN 20 M", STOP_KN, MUTED, 23.5),
]

CAR = (540, 830)   # car centre
CAR_S = 560        # car length in px

# anchor (screen) -> hook (car-relative) for each harpoon, and its hit time
HARPOONS = [
    ((-40, 700), (-0.50, -0.05), 0.70),
    ((1120, 720), (0.50, -0.06), 2.75),
    ((150, 590), (-0.12, -0.26), 3.30),
    ((950, 600), (0.10, -0.26), 3.85),
    ((80, 990), (-0.22, 0.02), 4.40),
    ((1010, 995), (0.30, 0.00), 4.95),
]
FLIGHT = 0.9   # seconds in the air

_fonts: dict = {}


def font(size: int, weight: str = "ExtraBold"):
    key = (size, weight)
    if key not in _fonts:
        if not os.path.exists(FONT_PATH):
            os.makedirs(os.path.dirname(FONT_PATH), exist_ok=True)
            urllib.request.urlretrieve(FONT_URL, FONT_PATH)
        f = ImageFont.truetype(FONT_PATH, size)
        f.set_variation_by_name(weight)
        _fonts[key] = f
    return _fonts[key]


def ease(u: float) -> float:
    u = min(max(u, 0.0), 1.0)
    return 1 - (1 - u) ** 3


def lerp(a, b, k):
    return tuple(int(round(x + (y - x) * k)) for x, y in zip(a, b))


def beat_at(t: float):
    for i, (a, b, lines) in enumerate(BEATS):
        if a <= t < b:
            return i, a, b, lines
    a, b, lines = BEATS[-1]
    return len(BEATS) - 1, a, b, lines


# ---- drawing ----------------------------------------------------------------------

def draw_grid(d: ImageDraw.ImageDraw, t: float):
    off = int(t * 14) % 60
    for x in range(0, W, 60):
        d.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(-60 + off, H, 60):
        d.line([(0, y), (W, y)], fill=GRID, width=1)


def car_pt(cx, cy, s, p):
    return (cx + p[0] * s, cy + p[1] * s)


def draw_car(d, cx, cy, s, wheel_angle):
    body = [(-0.50, 0.03), (-0.50, -0.07), (-0.44, -0.11), (-0.20, -0.12), (-0.10, -0.25),
            (0.12, -0.25), (0.24, -0.13), (0.46, -0.11), (0.50, -0.06), (0.50, 0.03)]
    d.polygon([car_pt(cx, cy, s, p) for p in body], fill=BODY, outline=INK, width=5)
    win = [(-0.08, -0.22), (0.01, -0.22), (0.01, -0.13), (-0.16, -0.13)]
    win2 = [(0.04, -0.22), (0.11, -0.22), (0.20, -0.13), (0.04, -0.13)]
    for w_ in (win, win2):
        d.polygon([car_pt(cx, cy, s, p) for p in w_], outline=INK, width=4)
    d.line([car_pt(cx, cy, s, (-0.44, -0.06)), car_pt(cx, cy, s, (0.46, -0.06))], fill=MUTED, width=2)
    for wx in (-0.31, 0.31):
        x, y = car_pt(cx, cy, s, (wx, 0.04))
        r = 0.085 * s
        d.ellipse([x - r, y - r, x + r, y + r], fill=BG, outline=INK, width=5)
        for k in range(3):
            a = wheel_angle + k * math.pi / 3
            d.line([(x - math.cos(a) * r * 0.8, y - math.sin(a) * r * 0.8),
                    (x + math.cos(a) * r * 0.8, y + math.sin(a) * r * 0.8)], fill=MUTED, width=3)


def draw_harpoon(d, start, end, u, torn: float = 0.0, cx=0, cy=0):
    """Cable from start (screen) towards end; harpoon at fraction u of the path."""
    k = ease(u)
    hx, hy = start[0] + (end[0] - start[0]) * k, start[1] + (end[1] - start[1]) * k
    if torn > 0:   # hook pulled back out along the cable
        hx += (start[0] - end[0]) * 0.18 * torn
        hy += (start[1] - end[1]) * 0.18 * torn
    d.line([start, (hx, hy)], fill=YEL if torn == 0 else RED, width=5)
    ang = math.atan2(end[1] - start[1], end[0] - start[0])
    tip = (hx + math.cos(ang) * 30, hy + math.sin(ang) * 30)
    left = (hx + math.cos(ang + 2.6) * 22, hy + math.sin(ang + 2.6) * 22)
    right = (hx + math.cos(ang - 2.6) * 22, hy + math.sin(ang - 2.6) * 22)
    d.polygon([tip, left, right], fill=YEL if torn == 0 else RED)


def draw_headline(d, lines, alpha: float):
    size = 90
    for text, _ in lines:
        while size > 40 and d.textlength(text, font=font(size)) > 900:
            size -= 2
    f = font(size)
    y = 150 if len(lines) <= 3 else 110
    for text, col in lines:
        col = lerp(BG, col, alpha)
        tw = d.textlength(text, font=f)
        d.text(((W - tw) / 2, y), text, font=f, fill=col, stroke_width=4, stroke_fill=lerp(BG, (0, 0, 0), alpha))
        y += int(size * 1.12)


def draw_chart(d, t):
    x0, y0, row_h, bar_h, max_w = 100, 1035, 86, 30, 740
    shown = [r for r in ROWS if t >= r[3]]
    if not shown:
        return
    push_x = x0 + max_w * PUSH_KN / CABLE_KN
    for i, (label, kn, col, ts) in enumerate(shown):
        y = y0 + i * row_h
        k = ease((t - ts) / 0.7)
        d.text((x0, y), label, font=font(34, "Bold"), fill=MUTED)
        bw = max_w * kn / CABLE_KN * k
        d.rounded_rectangle([x0, y + 44, x0 + max(bw, 6), y + 44 + bar_h], 7, fill=col)
        val = f"≈ {kn * k:.0f} kN"
        d.text((x0 + bw + 14, y + 38), val, font=font(36), fill=col)
    if t >= ROWS[1][3]:   # the line every link must beat
        for y in range(y0 + 40, y0 + len(shown) * row_h, 18):
            d.line([(push_x, y), (push_x, y + 9)], fill=INK, width=4)


def draw_smoke(d, cx, cy, t):
    for k in range(6):
        ph = (t * 1.6 + k / 6) % 1.0
        x = cx - 0.36 * CAR_S - ph * 220
        y = cy + 0.05 * CAR_S - ph * 60 + math.sin(k * 7) * 20
        r = 18 + ph * 50
        c = lerp(MUTED, BG, ph)
        d.ellipse([x - r, y - r, x + r, y + r], outline=c, width=3)


def draw_stamp(img, t_local):
    k = ease(t_local / 0.25)
    if k <= 0:
        return img
    layer = Image.new("RGBA", (520, 150), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([6, 6, 514, 144], 18, outline=YEL + (255,), width=8)
    f = font(64, "Black")
    txt = "PLAUSIBLE*"
    ld.text(((520 - ld.textlength(txt, font=f)) / 2, 36), txt, font=f, fill=YEL + (255,))
    scale = 1.6 - 0.6 * k
    layer = layer.resize((int(520 * scale), int(150 * scale))).rotate(-8, expand=True)
    a = layer.split()[3].point(lambda v: int(v * k))
    layer.putalpha(a)
    img.paste(layer, (int(CAR[0] - layer.width / 2), int(CAR[1] - 40 - layer.height / 2)), layer)
    return img


def render_frame(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_grid(d, t)
    i, a, b, lines = beat_at(t)

    # car position: a fast run across the screen during the "100 km/h" beat
    cx, cy = CAR
    wobble = math.sin(t * 9) * 2
    driving = BEATS[6][0] <= t < BEATS[6][1]
    if driving:
        u = (t - BEATS[6][0]) / (BEATS[6][1] - BEATS[6][0])
        span = W + 2 * CAR_S   # start where the car is parked, then drive right and wrap
        cx = (CAR[0] + CAR_S + span * u * 2.2) % span - CAR_S
        for k in range(7):
            y = cy - 120 + k * 40
            d.line([(cx - CAR_S * 0.6 - 260, y), (cx - CAR_S * 0.6, y)], fill=MUTED, width=3)
    spin = t * (40 if 6.0 <= t < 10.4 or driving else 2.0)

    # harpoons and cables (not while he drives off-scene in beat 6)
    if not driving:
        for n, (anchor, hook, hit) in enumerate(HARPOONS):
            launch = hit - FLIGHT
            if t < launch and not (n == 0):
                continue
            u = (t - launch) / FLIGHT
            if n == 0:   # the hook-frame harpoon is already in flight at t = 0
                u = (t + 0.36) / FLIGHT if t < hit else 1.0
            target = car_pt(cx, cy + wobble, CAR_S, hook)
            torn = 0.0
            if n == 0 and BEATS[5][0] + 1.0 <= t < BEATS[6][0]:
                torn = ease((t - BEATS[5][0] - 1.0) / 0.4)
            draw_harpoon(d, anchor, target, min(max(u, 0), 1), torn)
            if n == 0 and torn > 0:   # tear in the panel
                x, y = target
                pts = [(x - 10, y - 30), (x + 8, y - 12), (x - 6, y + 4), (x + 12, y + 22), (x - 4, y + 38)]
                d.line(pts, fill=RED, width=5)
    draw_car(d, cx, cy + wobble, CAR_S, spin)
    if 6.0 <= t < 10.4:
        draw_smoke(d, cx, cy, t)
        ax = cx + 0.52 * CAR_S
        d.line([(ax, cy - 40), (ax + 150, cy - 40)], fill=YEL, width=8)
        d.polygon([(ax + 175, cy - 40), (ax + 145, cy - 58), (ax + 145, cy - 22)], fill=YEL)

    draw_chart(d, t)
    if i <= 1:   # promise line under the car until the chart takes over
        f = font(44, "ExtraBold")
        note = "THE PHYSICS IN 30 SECONDS"
        d.text(((W - d.textlength(note, font=f)) / 2, 1110), note, font=f, fill=MUTED)
    alpha = 1.0 if i == 0 else ease((t - a) / 0.18)
    draw_headline(d, lines, alpha)
    if i == 7:
        img = draw_stamp(img, t - a - 0.4)
        d = ImageDraw.Draw(img)
        f = font(36, "Bold")
        note = "*ONLY IF THE HOOKS GRAB THE FRAME"
        d.text(((W - d.textlength(note, font=f)) / 2, 545), note, font=f, fill=MUTED)
    if i == 8:
        f = font(34, "Bold")
        note = "COMMENT BELOW"
        d.text(((W - d.textlength(note, font=f)) / 2, 545), note, font=f, fill=MUTED)
    return camera(img, t, i, a)


def camera(img: Image.Image, t: float, i: int, a: float) -> Image.Image:
    """Slow push-in across the hook, then a quick zoom punch at the start of each beat."""
    if i == 0:
        z = 1.0 + 0.04 * (t / BEATS[0][1])
    else:
        u = (t - a) / 0.45
        z = 1.0 + (0.04 * (1 - ease(u)) if u < 1 else 0.0)
    if z <= 1.0001:
        return img
    w, h = int(W * z), int(H * z)
    big = img.resize((w, h), Image.BILINEAR)
    x0, y0 = (w - W) // 2, (h - H) // 2
    return big.crop((x0, y0, x0 + W, y0 + H))


# ---- sound effects (synthesised, original) -----------------------------------------
SR = 48000


def sfx_track() -> np.ndarray:
    n = int(DUR * SR)
    out = np.zeros(n)
    rng = np.random.default_rng(3)

    def add(t0, sig, gain):
        i = int(t0 * SR)
        j = min(n, i + len(sig))
        if i < n:
            out[i:j] += sig[: j - i] * gain

    def env(length, attack, decay):
        tt = np.arange(int(length * SR)) / SR
        return np.minimum(tt / max(attack, 1e-4), 1) * np.exp(-tt / decay)

    def whoosh(length=0.6):
        noise = rng.standard_normal(int(length * SR))
        k = np.linspace(0, 1, len(noise))
        sm = np.convolve(noise, np.ones(40) / 40, mode="same")
        return (sm * np.sin(np.pi * k)) * 3

    def thunk():
        tt = np.arange(int(0.35 * SR)) / SR
        body = np.sin(2 * np.pi * (90 - 50 * tt) * tt) * np.exp(-tt / 0.08)
        click = rng.standard_normal(len(tt)) * np.exp(-tt / 0.004)
        return body + 0.4 * click

    def twang():
        tt = np.arange(int(0.6 * SR)) / SR
        return np.sin(2 * np.pi * 220 * tt + 3 * np.sin(2 * np.pi * 7 * tt)) * np.exp(-tt / 0.15)

    def rise(f0, f1, length=0.6):
        tt = np.arange(int(length * SR)) / SR
        f = f0 + (f1 - f0) * tt / length
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(length, 0.02, 0.4)

    def tear():
        tt = np.arange(int(0.5 * SR)) / SR
        crackle = rng.standard_normal(len(tt)) * (rng.random(len(tt)) > 0.97)
        return np.convolve(crackle, np.ones(30) / 6, mode="same") * np.exp(-tt / 0.2)

    def ding():
        tt = np.arange(int(0.8 * SR)) / SR
        return (np.sin(2 * np.pi * 880 * tt) + 0.5 * np.sin(2 * np.pi * 1320 * tt)) * np.exp(-tt / 0.25)

    add(0.0, whoosh(0.7), 0.25)
    add(HARPOONS[0][2], thunk(), 0.8)
    for _, _, hit in HARPOONS[1:]:
        add(hit - 0.45, whoosh(0.45), 0.18)
        add(hit, thunk(), 0.6)
        add(hit + 0.05, twang(), 0.12)
    screech = rng.standard_normal(int(1.2 * SR))
    screech = np.convolve(screech, np.ones(8) / 8, mode="same") * np.sin(np.linspace(0, np.pi, len(screech)))
    add(6.2, screech, 0.12)
    for _, kn, _, ts in ROWS:
        add(ts, rise(300, 300 + kn * 12), 0.18)
    add(BEATS[5][0] + 1.0, tear(), 0.9)
    add(BEATS[6][0] + 0.1, whoosh(1.0), 0.35)
    add(BEATS[7][0] + 0.4, thunk(), 0.9)
    add(BEATS[8][0] + 0.1, ding(), 0.25)
    # fade the very end so the loop restart doesn't click
    fade = int(LOOP * SR)
    out[-fade:] *= np.linspace(1, 0, fade)
    peak = np.abs(out).max()
    return out / peak * 0.7   # about -3 dBFS peak; the trending sound goes on top in the app


def main():
    os.makedirs(OUT, exist_ok=True)
    wav = os.path.join(OUT, ".sfx.wav")
    s = sfx_track()
    pcm = (np.stack([s, s], axis=1) * 32767).astype(np.int16)
    with wave.open(wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    out = os.path.join(OUT, "harpoon-physics.mp4")
    enc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
         "-r", str(FPS), "-i", "-", "-i", wav, "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE)
    first = np.asarray(render_frame(0.0), dtype=np.float32)
    n = int(round(DUR * FPS))
    for k in range(n):
        t = k / FPS
        frame = np.asarray(render_frame(t), dtype=np.float32)
        if t >= DUR - LOOP:   # dissolve into frame 0; the last frame is frame 0
            m = min(1.0, (t - (DUR - LOOP)) / (LOOP - 1 / FPS))
            frame = frame * (1 - m) + first * m
        enc.stdin.write(frame.astype(np.uint8).tobytes())
    enc.stdin.close()
    enc.wait()
    print(out)


if __name__ == "__main__":
    main()
