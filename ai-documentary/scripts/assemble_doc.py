"""Assemble an AI-footage documentary from its shots, stills, clips and narration.

    python3 ai-documentary/scripts/assemble_doc.py DOC_DIR [--out FILE] [--beats 1-3]

For each shot, in order of preference:
  DOC_DIR/flow/<id>.mp4     a Google Flow clip (used as is)
  DOC_DIR/clips/<id>.mp4    a Wan 2.2 clip (its first 6 frames are cut: Wan redraws the start image there)
  DOC_DIR/stills/<id>.jpg   the still, with a slow push-in, pull-out or drift
Shots share their beat's narration window equally. Then: soft dissolves between shots, one gentle colour grade,
film grain, 2.39:1 letterbox, a title over the opening and an AI-disclosure end card. Audio: audio/narration.flac.
"""
import argparse, json, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1920, 1080, 30
XF = 0.6          # dissolve length (s)
BAR = 138         # letterbox bar height for 2.39:1
WAN_TRIM = 6      # frames Wan 2.2 5B spends morphing away from the start image
FONT = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
FONT_T = "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


class Clip:
    """A video clip scaled to cover 1920x1080, streamed; slowed to 0.75x at most, then held with a slow push-in."""

    def __init__(self, path, trim):
        self.dur = max(0.1, probe(path) - trim / 24)
        vf = f"select=gte(n\\,{trim}),setpts=N/FRAME_RATE/TB," if trim else ""
        vf += f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps={FPS}"
        self.p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", vf, "-an", "-f", "rawvideo",
                                   "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.i, self.last, self.ended = -1, None, False

    def frame(self, t, win):
        speed = 1.0 if win <= self.dur else max(self.dur / win, 0.75)
        idx = int(t * speed * FPS)
        while not self.ended and self.i < idx:
            b = self.p.stdout.read(W * H * 3)
            if len(b) < W * H * 3:
                self.ended = True; break
            self.last = b; self.i += 1
        a = np.frombuffer(self.last, np.uint8).reshape(H, W, 3)
        if not self.ended or idx <= self.i:
            return a
        z = 1 + 0.015 * (t - (self.i + 1) / FPS / speed)  # hold the last frame with a slow push-in
        return zoom(a, z, 0, 0)


class Still:
    """A still with a slow camera move: push-in, pull-out, or sideways drift (chosen per shot)."""

    def __init__(self, path, k):
        im = Image.open(path).convert("RGB")
        s = max(W / im.width, H / im.height) * 1.12
        self.base = np.asarray(im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS))
        self.kind = k % 3

    def frame(self, t, win):
        p = min(1.0, max(0.0, t / max(win, 0.1)))
        p = p * p * (3 - 2 * p) * 0.6 + p * 0.4  # eased
        bh, bw = self.base.shape[:2]
        if self.kind == 0:   # push in
            z, dx = 1 + 0.10 * p, 0
        elif self.kind == 1:  # pull out
            z, dx = 1.10 - 0.10 * p, 0
        else:                # drift sideways
            z, dx = 1.04, (p - 0.5) * 0.06
        cw, ch = bw / z / 1.0, bh / z / 1.0
        cw, ch = min(cw, bw), min(ch, bh)
        if cw / ch > W / H:
            cw = ch * W / H
        else:
            ch = cw * H / W
        x0 = (bw - cw) / 2 + dx * bw
        x0 = min(max(0, x0), bw - cw); y0 = (bh - ch) / 2
        crop = Image.fromarray(self.base[int(y0):int(y0 + ch), int(x0):int(x0 + cw)])
        return np.asarray(crop.resize((W, H), Image.BILINEAR))


def zoom(a, z, dx, dy):
    if z <= 1.0001:
        return a
    h, w = a.shape[:2]
    cw, ch = w / z, h / z
    x0, y0 = (w - cw) / 2 + dx, (h - ch) / 2 + dy
    return np.asarray(Image.fromarray(a[int(y0):int(y0 + ch), int(x0):int(x0 + cw)]).resize((w, h), Image.BILINEAR))


class Missing:
    def __init__(self, sid):
        im = Image.new("RGB", (W, H), (18, 18, 20))
        ImageDraw.Draw(im).text((W // 2, H // 2), f"shot {sid}", font=ImageFont.truetype(FONT, 48), fill=(90, 90, 96), anchor="mm")
        self.a = np.asarray(im)

    def frame(self, t, win):
        return self.a


# A gentle, filmic grade: soft S-curve, slightly warm highlights and cool shadows, a touch less saturation.
_x = np.arange(256) / 255.0
_s = _x + 0.08 * (_x - 0.5) * (1 - np.abs(2 * _x - 1))
CURVE = [np.clip(255 * (_s + o), 0, 255).astype(np.uint8) for o in (0.010 * _x, 0.0 * _x, -0.012 * _x + 0.012 * (1 - _x))]


def grade(a, rng):
    out = np.stack([CURVE[c][a[..., c]] for c in range(3)], -1).astype(np.int16)
    g = out.mean(-1, keepdims=True)
    out = g + (out - g) * 0.92                       # slightly less saturation
    out += rng.normal(0, 3.2, (H // 2, W // 2, 1)).repeat(2, 0).repeat(2, 1)  # film grain
    out = np.clip(out, 0, 255).astype(np.uint8)
    out[:BAR] = 0; out[H - BAR:] = 0                 # letterbox
    return out


def text_layer(lines, size, alpha):
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y = H // 2 - (len(lines) - 1) * size * 0.7
    for txt, f, col in lines:
        d.text((W // 2, y), txt, font=ImageFont.truetype(f, size if f == FONT_T else int(size * 0.42)), fill=col + (int(255 * alpha),), anchor="mm")
        y += size * (1.0 if f == FONT_T else 0.75)
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("doc"); ap.add_argument("--out", default=None); ap.add_argument("--beats", default=None)
    a = ap.parse_args()
    spec = json.load(open(os.path.join(a.doc, "shots.json")))
    tim = json.load(open(os.path.join(a.doc, "audio", "timings.json")))
    beats = {b["beat"]: b for b in tim["beats"]}
    timeline = []  # (start, end, shot, index)
    for b in sorted(beats):
        shots = [s for s in spec["shots"] if s["beat"] == b]
        t0, t1 = beats[b]["start"], beats[b]["end"]
        step = (t1 - t0) / len(shots)
        for j, s in enumerate(shots):
            timeline.append((t0 + j * step, t0 + (j + 1) * step, s))
    first, last = 1, max(beats)
    if a.beats:
        first, last = (int(x) for x in a.beats.split("-"))
    T0, T1 = beats[first]["start"], beats[last]["end"]
    out = a.out or os.path.join(a.doc, "pilot.mp4")
    sources, used = {}, {"flow": 0, "clip": 0, "still": 0, "missing": 0}

    def src(k):
        if k not in sources:
            s = timeline[k][2]; sid = s["id"]
            f, c, st = (os.path.join(a.doc, *p) for p in (("flow", sid + ".mp4"), ("clips", sid + ".mp4"), ("stills", sid + ".jpg")))
            if os.path.exists(f):
                sources[k] = Clip(f, 0); used["flow"] += 1
            elif os.path.exists(c):
                sources[k] = Clip(c, WAN_TRIM); used["clip"] += 1
            elif os.path.exists(st):
                sources[k] = Still(st, k); used["still"] += 1
            else:
                sources[k] = Missing(sid); used["missing"] += 1
        return sources[k]

    enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                            "-r", str(FPS), "-i", "-", "-ss", f"{T0:.3f}", "-t", f"{T1 - T0:.3f}",
                            "-i", os.path.join(a.doc, "audio", "narration.flac"), "-map", "0:v", "-map", "1:a",
                            "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], stdin=subprocess.PIPE)
    rng = np.random.default_rng(7)
    title = spec.get("title", "")
    end_lines = [(title.upper(), FONT_T, (236, 232, 222)), ("Footage: AI-generated reconstruction", FONT, (200, 196, 186)),
                 ("Stills: Krea 2 · Motion: Wan 2.2 and Google Veo · Narration: AI voice", FONT, (150, 146, 138))]
    k = 0
    for fi in range(int(T0 * FPS), int(T1 * FPS)):
        t = fi / FPS
        while k < len(timeline) - 1 and timeline[k + 1][0] <= t:
            if k in sources and k + 1 < len(timeline):
                pass
            k += 1
        s0, s1, _ = timeline[k]
        fr = src(k).frame(t - s0, s1 - s0).astype(np.float32)
        if k > 0 and t - s0 < XF:  # dissolve from the previous shot, which keeps moving underneath
            p0, p1, _ = timeline[k - 1]
            al = (t - s0) / XF; al = al * al * (3 - 2 * al)
            fr = fr * al + src(k - 1).frame(t - p0, p1 - p0).astype(np.float32) * (1 - al)
        img = grade(fr.astype(np.uint8), rng)
        if title and t < 7.0:  # title over the opening
            al = min(1, max(0, (t - 1.8) / 1.2)) * min(1, max(0, (6.8 - t) / 1.0))
            if al > 0:
                img = np.asarray(Image.alpha_composite(Image.fromarray(img).convert("RGBA"), text_layer([(title.upper(), FONT_T, (240, 236, 226))], 96, al)).convert("RGB"))
        end = tim["duration"]
        if t > end - 4.2:  # fade to black and the disclosure card
            fade = min(1, (t - (end - 4.2)) / 0.8)
            img = (img.astype(np.float32) * (1 - fade)).astype(np.uint8)
            img = np.asarray(Image.alpha_composite(Image.fromarray(img).convert("RGBA"), text_layer(end_lines, 64, min(1, (t - (end - 3.6)) / 0.6) if t > end - 3.6 else 0)).convert("RGB"))
        enc.stdin.write(np.ascontiguousarray(img).tobytes())
        for old in [j for j in sources if j < k - 1]:  # free finished shots
            del sources[old]
    enc.stdin.close(); enc.wait()
    print(f"wrote {out} ({T1 - T0:.1f} s): {used}")


if __name__ == "__main__":
    main()
