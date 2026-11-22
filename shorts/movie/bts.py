#!/usr/bin/env python3
"""Movie behind-the-scenes Short: an interview moment where the actor tells the story, cut to vertical,
with word-by-word captions and a hook line.

    python3 movie/bts.py edits_movie/<name>.json <out.mp4>

Spec:
{
  "segments": [{"src": "path/to/interview.mp4", "start": 61.2, "end": 95.8}],   # one or more cuts, in order
  "hook": "Alan Rickman knew Snape's secret years before anyone else",          # first 2.5 s, top of frame
  "hook_dur": 2.6,
  "highlight": ["always", "secret", "Lily"],                                       # words drawn in yellow
  "credit": "Interview: ..."                                                       # small line at the bottom
}
Captions come from faster-whisper word timings on the cut audio. The speaker's face is tracked (OpenCV) so the
9:16 crop follows them. Audio is normalised to -14 LUFS.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(ROOT, "fonts", "Montserrat-Black.ttf")
FONT2 = os.path.join(ROOT, "fonts", "OpenSans-ExtraBold.ttf")


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def cut(spec, work):
    parts = []
    for i, s in enumerate(spec["segments"]):
        p = os.path.join(work, f"seg{i}.mp4"); parts.append(p)
        run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(s["start"]), "-i", s["src"], "-t", str(s["end"] - s["start"]),
             "-vf", f"fps={FPS}", "-c:v", "libx264", "-crf", "16", "-preset", "fast", "-c:a", "aac", "-ar", "44100", "-ac", "2", p])
    lst = os.path.join(work, "segs.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    out = os.path.join(work, "cut.mp4")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    return out


def words(path):
    from faster_whisper import WhisperModel
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(a, word_timestamps=True, vad_filter=False)
    out = []
    for s in segs:
        for w in s.words:
            out.append({"w": w.word.strip(), "t0": w.start, "t1": w.end})
    return out


def track(path, n):
    """Horizontal centre of the main face, sampled every 0.5 s and smoothed."""
    import cv2
    cap = cv2.VideoCapture(path); fw = cap.get(cv2.CAP_PROP_FRAME_WIDTH); fh = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    det = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
    xs, ts = [], []
    step = FPS // 2
    for i in range(0, n, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY); s = 480 / g.shape[0]
        f = det.detectMultiScale(cv2.resize(g, None, fx=s, fy=s), 1.1, 6, minSize=(30, 30))
        if len(f):
            x, y, w, h = max(f, key=lambda r: r[2] * r[3]); xs.append((x + w / 2) / s); ts.append(i)
    cap.release()
    if not xs:
        return np.full(n, fw / 2), fw, fh
    c = np.interp(np.arange(n), ts, xs)
    k = np.ones(FPS * 2) / (FPS * 2)                       # 2-second moving average: calm camera
    c = np.convolve(np.pad(c, (FPS, FPS), mode="edge"), k, mode="same")[FPS:FPS + n]
    return c, fw, fh


def caption_chunks(ws, maxw=3):
    """Group words into short pops (max 3 words, break on punctuation or pauses)."""
    chunks, cur = [], []
    for i, w in enumerate(ws):
        cur.append(w)
        end = re.search(r"[.,!?;:]$", w["w"]) or len(cur) >= maxw or (i + 1 < len(ws) and ws[i + 1]["t0"] - w["t1"] > 0.35)
        if end:
            chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    return chunks


def draw_caption(img, chunk, t, hl, y=1240):
    d = ImageDraw.Draw(img); f = ImageFont.truetype(FONT, 92)
    toks = [re.sub(r"[^\w'’\-]", "", w["w"]).upper() for w in chunk]
    widths = [d.textlength(x + " ", font=f) for x in toks]; total = sum(widths) - d.textlength(" ", font=f)
    x = (W - total) / 2
    for w, tok, wd in zip(chunk, toks, widths):
        if t + 0.02 < w["t0"]:
            x += wd; continue                              # word not spoken yet
        col = (255, 221, 0) if any(h.lower() in tok.lower() for h in hl) else (255, 255, 255)
        k = min(1, (t - w["t0"]) / 0.08 + 0.6)             # quick pop-in
        fs = ImageFont.truetype(FONT, int(92 * (0.85 + 0.15 * k)))
        d.text((x, y), tok, font=fs, fill=col, stroke_width=10, stroke_fill=(0, 0, 0), anchor="ls")
        x += wd


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
    work = os.path.join(os.path.dirname(os.path.abspath(out)), "work_" + os.path.splitext(os.path.basename(out))[0]); os.makedirs(work, exist_ok=True)
    src = cut(spec, work)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
    n = int(dur * FPS)
    ws = words(src); json.dump(ws, open(os.path.join(work, "words.json"), "w"), indent=1)
    chunks = caption_chunks(ws)
    cx, fw, fh = track(src, n)
    # crop: full height, 9:16 width, following the face; scaled up to 1080x1920
    cw = fh * W / H
    if cw > fw:
        cw = fw
    hl = spec.get("highlight", [])
    hook = spec.get("hook"); hook_dur = spec.get("hook_dur", 2.6)
    fh_font = ImageFont.truetype(FONT2, 64); cred_font = ImageFont.truetype(FONT2, 30)
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    wav = os.path.join(work, "audio.wav")
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", src, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", wav])
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    fsz = int(fw) * int(fh) * 3
    for i in range(n):
        raw = dec.stdout.read(fsz)
        if len(raw) < fsz:
            break
        fr = Image.frombuffer("RGB", (int(fw), int(fh)), raw)
        x0 = float(np.clip(cx[min(i, len(cx) - 1)] - cw / 2, 0, fw - cw))
        zoom = 1.0 + 0.03 * (i / max(1, n))                 # slow push-in
        cwz, chz = cw / zoom, fh / zoom
        box = (x0 + (cw - cwz) / 2, (fh - chz) * 0.35, x0 + (cw + cwz) / 2, (fh - chz) * 0.35 + chz)
        img = fr.resize((W, H), Image.BICUBIC, box=box)
        t = i / FPS
        ch = next((c for c in chunks if c[0]["t0"] - 0.05 <= t <= c[-1]["t1"] + 0.25), None)
        if ch:
            draw_caption(img, ch, t, hl)
        d = ImageDraw.Draw(img)
        if hook and t < hook_dur:
            a = min(1, t / 0.15) * min(1, (hook_dur - t) / 0.25)
            lines = wrap(d, hook, fh_font, 940)
            y = 210
            for ln in lines:
                d.text((W / 2, y), ln, font=fh_font, fill=(255, 255, 255), stroke_width=9, stroke_fill=(0, 0, 0), anchor="mt"); y += 80
        if spec.get("credit"):
            d.text((W / 2, H - 120), spec["credit"], font=cred_font, fill=(255, 255, 255), stroke_width=4, stroke_fill=(0, 0, 0), anchor="mb")
        enc.stdin.write(img.tobytes())
    enc.stdin.close(); enc.wait(); dec.terminate()
    print(out, f"{n / FPS:.2f}s, {len(ws)} words")


if __name__ == "__main__":
    main()
