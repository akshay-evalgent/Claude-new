#!/usr/bin/env python3
"""Movie behind-the-scenes Short (dns style): the actor tells the story in their own words, cut tight to the word,
with a new framing about every 1-2 s, film shots over key lines, one gold caption word at a time and an end card.

    python3 movie/bts.py edits_movie/<name>.json <out.mp4>

Spec:
{
  "src": "path/to/interview.mp4",
  "words": "path/to/transcript.json",            # faster-whisper output with word timings (bin/tx.py format)
  "pieces": [ {"start": 64.98, "end": 65.92},    # speech, in source seconds (jump cuts between pieces)
              ...,
              {"card": "He kept that promise...", "dur": 4.0, "video": 341.5} ],   # silent end card over a film shot
  "broll": [ {"piece": 0, "dur": 2.0, "video": 384.5} ],   # film shot replacing the picture from the start of a piece
  "highlight": ["promised", "never", "Always"],
  "credit": "Interview: The New York Times"
}
Measured from two dns Shorts (13M and 7M views): a new shot about every second, one word on screen at a time,
no narrator. Audio is mastered to -14 LUFS.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS, SR = 1080, 1920, 30, 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "fonts", "Montserrat-Black.ttf")
FONT2 = os.path.join(ROOT, "fonts", "OpenSans-ExtraBold.ttf")


def probe(src):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", src],
                         capture_output=True, text=True).stdout.strip().split(",")
    return int(out[0]), int(out[1])


def audio(src, a, b):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-i", src, "-t", f"{b - a:.3f}", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    f = int(0.012 * SR)                                       # 12 ms fades: no clicks at jump cuts
    if len(y) > 2 * f:
        y[:f] *= np.linspace(0, 1, f)[:, None]; y[-f:] *= np.linspace(1, 0, f)[:, None]
    return y


class Frames:
    """Sequential frame reader for one stretch of the source."""
    def __init__(self, src, start, n, fw, fh):
        self.fw, self.fh, self.n = fw, fh, n
        self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-i", src, "-frames:v", str(n), "-vf", f"fps={FPS}",
                                   "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
        self.last = None

    def next(self):
        raw = self.p.stdout.read(self.fw * self.fh * 3)
        if len(raw) == self.fw * self.fh * 3:
            self.last = Image.frombuffer("RGB", (self.fw, self.fh), raw)
        return self.last

    def close(self):
        self.p.stdout.close(); self.p.wait()


def face_x(src, t, fw, fh, region=None):
    import cv2
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(fh, fw, 3)
    if region:
        fr = fr[region[0]:region[1]]
    g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY); s = 540 / g.shape[0]
    det = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
    f = det.detectMultiScale(cv2.resize(g, None, fx=s, fy=s), 1.08, 5, minSize=(24, 24))
    if not len(f):
        return fw / 2
    x, y, w, h = max(f, key=lambda r: r[2] * r[3])
    return (x + w / 2) / s


def letterbox(src, t, fw, fh):
    """Rows of the active picture (film clips sit in black bars)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    g = np.frombuffer(raw, np.uint8).reshape(fh, fw)
    rows = np.where(g.mean(1) > 14)[0]
    return (int(rows[0]), int(rows[-1]) + 1) if len(rows) else (0, fh)


def compose(fr, layout, cx, fw, fh, k, lb=None):
    """k: 0..1 progress through the shot (slow push-in)."""
    if layout == "wide":
        bg = fr.resize((W, H), Image.BICUBIC, box=(fw * 0.25, 0, fw * 0.75, fh)).filter(ImageFilter.GaussianBlur(30))
        bg = Image.eval(bg, lambda v: int(v * 0.55))
        ww = W - 40; wh = int(ww * fh / fw)
        bg.paste(fr.resize((ww, wh), Image.BICUBIC), (20, int(H * 0.40 - wh / 2)))
        return bg
    if layout == "film":                                       # 4:5 crop of the active film area, over its own blur
        y0, y1 = lb; ah = y1 - y0; aw = ah * 4 / 5
        z = 1.0 + 0.06 * k; aw2, ah2 = aw / z, ah / z
        x0 = float(np.clip(cx - aw2 / 2, 0, fw - aw2)); yy = y0 + (ah - ah2) / 2
        bg = fr.resize((W, H), Image.BICUBIC, box=(fw * 0.2, y0, fw * 0.8, y1)).filter(ImageFilter.GaussianBlur(34))
        bg = Image.eval(bg, lambda v: int(v * 0.5))
        bg.paste(fr.resize((W, int(W * 5 / 4)), Image.BICUBIC, box=(x0, yy, x0 + aw2, yy + ah2)), (0, int(H * 0.42 - W * 5 / 8)))
        return bg
    cw = fh * W / H
    z = (1.0 + 0.04 * k) * (1.2 if layout == "punch" else 1.0)
    cwz, chz = cw / z, fh / z
    x0 = float(np.clip(cx - cwz / 2, 0, fw - cwz))
    top = (fh - chz) * (0.25 if layout == "punch" else 0.3)
    return fr.resize((W, H), Image.BICUBIC, box=(x0, top, x0 + cwz, top + chz))


def draw_word(img, words, t, hl, y=1240):
    cur = None
    for i, w in enumerate(words):
        end = min(words[i + 1]["t0"] if i + 1 < len(words) else w["t1"] + 0.4, w["t1"] + 0.45)
        if w["t0"] - 0.03 <= t < end:
            cur = w
    if not cur:
        return
    tok = re.sub(r"[^\w'’\-.,?!]", "", cur["w"])
    if not tok:
        return
    k = min(1.0, (t - cur["t0"] + 0.03) / 0.07)
    f = ImageFont.truetype(FONT, int(88 * (0.88 + 0.12 * k)))
    col = (255, 255, 255) if any(h.lower() == re.sub(r"\W", "", tok).lower() for h in hl) else (247, 181, 24)
    d = ImageDraw.Draw(img)
    d.text((W / 2 + 4, y + 6), tok, font=f, fill=(0, 0, 0), anchor="mm", stroke_width=9, stroke_fill=(0, 0, 0))
    d.text((W / 2, y), tok, font=f, fill=col, anchor="mm", stroke_width=7, stroke_fill=(20, 14, 6))


def wrap(d, text, font, maxw):
    lines, cur = [], ""
    for w in text.split():
        nxt = (cur + " " + w).strip()
        if d.textlength(nxt, font=font) > maxw and cur:
            lines.append(cur); cur = w
        else:
            cur = nxt
    return lines + [cur]


def main():
    spec = json.load(open(sys.argv[1])); out = sys.argv[2]
    src = spec["src"]; fw, fh = probe(src)
    allw = [{"t0": w[0], "t1": w[1], "w": w[2].strip()} for r in json.load(open(spec["words"])) for w in r["w"]]
    for o in spec.get("word_fix", []):                         # correct a word whose timing Whisper got wrong
        allw = [w for w in allw if not (w["w"].strip(".,") == o["w"].strip(".,") and abs(w["t0"] - o["t0"]) < 0.6)] + [o]
    allw.sort(key=lambda w: w["t0"])
    hl = spec.get("highlight", [])
    # ---- timeline: audio pieces and per-shot video plan ----
    track, words, shots = [], [], []                          # shots: (t_out0, t_out1, src_t0, layout, cx, lb, card_text)
    t = 0.0; cycle = ["face", "punch", "face", "wide"]; ci = 0
    for pi, p in enumerate(spec["pieces"]):
        if "card" in p:
            d = p["dur"]; track.append(np.zeros((int(d * SR), 2), np.float32))
            lb = letterbox(src, p["video"] + 0.5, fw, fh)
            shots.append((t, t + d, p["video"], "film", face_x(src, p["video"] + 0.5, fw, fh, lb), lb, p["card"]))
            t += d; continue
        a, b = p["start"], p["end"]; y = audio(src, a, b); track.append(y); d = len(y) / SR
        words += [{"t0": w["t0"] - a + t, "t1": min(w["t1"], b) - a + t, "w": w["w"]} for w in allw if a - 0.05 <= w["t0"] < b - 0.05]
        # framing: split long pieces once at a word boundary near the middle
        ws = [w["t0"] for w in allw if a + 1.0 < w["t0"] < b - 1.0]
        cuts = [a] + ([min(ws, key=lambda x: abs(x - (a + b) / 2))] if d > 2.8 and ws else []) + [b]
        cx = face_x(src, (a + b) / 2, fw, fh)
        for s0, s1 in zip(cuts[:-1], cuts[1:]):
            layout = p.get("layout") or cycle[ci % len(cycle)]; ci += 1
            shots.append((t + s0 - a, t + s1 - a, s0, layout, cx, None, None))
        t += d
    for br in spec.get("broll", []):                            # film shots over chosen lines
        start = sum(len(x) / SR for x in track[:br["piece"]])
        lb = letterbox(src, br["video"] + 0.3, fw, fh); cx = face_x(src, br["video"] + 0.3, fw, fh, lb)
        new = []
        for s in shots:
            a0, a1 = s[0], s[1]; b0, b1 = start, start + br["dur"]
            if a1 <= b0 or a0 >= b1:
                new.append(s); continue
            if a0 < b0:
                new.append((a0, b0) + s[2:])
            if a1 > b1:
                new.append((b1, a1, s[2] + (b1 - a0)) + s[3:])
        new.append((start, start + br["dur"], br["video"], "film", cx, lb, None))
        shots = sorted(new, key=lambda s: s[0])
    total = t; n = int(round(total * FPS))
    y = np.concatenate(track)
    import pyloudnorm as pyln
    lim = 10 ** (-1 / 20)
    for _ in range(3):                                        # normalise, soft-limit, repeat (limiting lowers loudness a little)
        y = y * 10 ** ((-14 - pyln.Meter(SR).integrated_loudness(y)) / 20)
        if np.abs(y).max() > lim:
            y = np.tanh(y / lim) * lim
    work = os.path.splitext(out)[0] + "_work"; os.makedirs(work, exist_ok=True)
    import soundfile as sf
    wav = os.path.join(work, "audio.wav"); sf.write(wav, y.astype(np.float32), SR)
    json.dump({"shots": [list(s[:4]) for s in shots], "words": words}, open(os.path.join(work, "plan.json"), "w"), indent=1)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    cred = ImageFont.truetype(FONT2, 30); cardf = ImageFont.truetype(FONT2, 66)
    fi = 0
    for s in shots:
        t0, t1, st, layout, cx, lb, card = s
        f0, f1 = int(round(t0 * FPS)), min(n, int(round(t1 * FPS)))
        if f1 <= f0:
            continue
        rd = Frames(src, st, f1 - f0, fw, fh)
        for f in range(f0, f1):
            fr = rd.next(); tt = f / FPS; k = (f - f0) / max(1, f1 - f0)
            img = compose(fr, layout, cx, fw, fh, k, lb)
            if card:
                img = Image.eval(img, lambda v: int(v * 0.45)); d = ImageDraw.Draw(img)
                a = min(1.0, (tt - t0) / 0.35)
                lines = wrap(d, card, cardf, 900); yy = H * 0.40 - len(lines) * 44
                for ln in lines:
                    d.text((W / 2, yy), ln, font=cardf, fill=(255, 255, 255, int(255 * a)), anchor="mm", stroke_width=6, stroke_fill=(0, 0, 0)); yy += 88
            else:
                draw_word(img, words, tt, hl)
            if spec.get("credit"):
                ImageDraw.Draw(img).text((W / 2, H - 150), spec["credit"], font=cred, fill=(235, 235, 235), anchor="mb", stroke_width=4, stroke_fill=(0, 0, 0))
            enc.stdin.write(img.tobytes()); fi += 1
        rd.close()
    enc.stdin.close(); enc.wait()
    print(out, f"{total:.2f}s, {len(shots)} shots, {len(words)} words, {fi} frames")


if __name__ == "__main__":
    main()
