#!/usr/bin/env python3
""""Did you notice this detail?" movie Short (DetectivePasini style): fast voiceover commentary over film shots that
change about every second, real film lines cut in, one huge yellow word on screen at a time.

    python3 movie/detail.py edits_movie/<name>.json <out.mp4>

Spec:
{
  "base": "<folder with src/<clip-id>.mp4, photos/, tx/<clip-id>.json>",
  "voice": "am_michael", "speed": 1.22,
  "beats": [
    {"say": "If you pay attention, you'll notice one man...",          # narration (Kokoro TTS)
     "shots": [["0uUm-8Jz6x8", 172.6, {"cx": 0.45, "zoom": 1.2}], ["photo:joughin_1912.jpg"]]},
    {"film": ["zSRvmHSgaBg", 118.3, 133.6],                              # a real line from the film, its own picture and sound
     "shots": [["zSRvmHSgaBg", 118.3, {"cx": 0.5}]]}
  ],
  "credits": ["Film: Titanic (1997)", ...]
}
A beat's shots share its duration equally (film shots start at the given source time). Photos are shown framed over
their own blur with a slow push-in. Dark night shots are brightened automatically.
Shot options: "cx"/"cy" crop centre (0-1), "zoom", "w" weight, "d" fixed seconds, "bright" extra brightness,
"rows": [top, bottom] to override letterbox detection (very dark skies fool it), "fit": zoom to show a wider window
(aspect "ar", placed at height "fy") over a blurred fill, for signs or actions a vertical crop would cut. "cx" can
also move through the shot: "cx1" end value, or [[k, cx], ...] keyframes to follow a sign through a camera pan.
Film beats can carry "words": [[start, end, "word"], ...] when the transcript missed the line.
Measured from two DetectivePasini Shorts (3.7M and 1.4M views): 140 s, about 210-240 words a minute, a cut every
0.8-0.9 s, film lines inside the narration, the reveal at the very end and no call to action.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import render as rd  # noqa: E402
import music as mu   # noqa: E402

W, H, FPS, SR = 1080, 1920, 30, 44100
rd.SR = SR
CAP_FONT = os.path.join(ROOT, "fonts", "Anton-Regular.ttf")
SMALL_FONT = os.path.join(ROOT, "fonts", "OpenSans-ExtraBold.ttf")


def src_path(base, sid):
    return os.path.join(base, "photos", sid[6:]) if sid.startswith("photo:") else os.path.join(base, "src", sid + ".mp4")


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip().split(",")
    return int(out[0]), int(out[1])


def grab(path, t, fw, fh, fmt="rgb24"):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", fmt, "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(fh, fw, -1) if raw else None


def analyse(path, t, fw, fh):
    """Active picture rows (letterbox), brightness, and the main face's x position."""
    import cv2
    fr = grab(path, t + 0.15, fw, fh)
    g = fr.mean(2)
    rows = np.where(g.mean(1) > 9)[0]
    y0, y1 = (int(rows[0]), int(rows[-1]) + 1) if len(rows) else (0, fh)
    act = fr[y0:y1].astype(np.uint8)
    mean = float(act.mean())
    gray = cv2.cvtColor(act, cv2.COLOR_RGB2GRAY); s = 480 / gray.shape[0]
    det = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))
    f = det.detectMultiScale(cv2.equalizeHist(cv2.resize(gray, None, fx=s, fy=s)), 1.08, 5, minSize=(22, 22))
    cx = (max(f, key=lambda r: r[2] * r[3])[0] + max(f, key=lambda r: r[2] * r[3])[2] / 2) / s / fw if len(f) else 0.5
    return y0, y1, mean, cx


class Frames:
    def __init__(self, path, start, n, fw, fh):
        self.fw, self.fh = fw, fh; self.last = None
        self.p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-i", path, "-frames:v", str(n), "-vf", f"fps={FPS}",
                                   "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)

    def next(self):
        raw = self.p.stdout.read(self.fw * self.fh * 3)
        if len(raw) == self.fw * self.fh * 3:
            self.last = Image.frombuffer("RGB", (self.fw, self.fh), raw)
        return self.last

    def close(self):
        self.p.stdout.close(); self.p.wait()


def lerp(opts, key, default, k):
    """A crop value that can move during the shot (to follow a sign through a pan): "cx" at the start and "cx1" at
    the end, or "cx": [[k, value], ...] keyframes over the shot (k from 0 to 1)."""
    a = opts.get(key, default)
    if isinstance(a, list):
        return float(np.interp(k, [p[0] for p in a], [p[1] for p in a]))
    return a + (opts.get(key + "1", a) - a) * k


def gain(mean, opts):
    """Brightness lift for dark shots, times an optional per-shot "bright" factor."""
    return (min(1.9, 62 / max(mean, 8)) if mean < 52 else 1.0) * opts.get("bright", 1.0)


def compose_clip(fr, info, opts, k):
    fw, fh = fr.size; y0, y1, mean, cx_auto = info
    ah = y1 - y0
    cw = ah * W / H
    z = opts.get("zoom", 1.0) * (1.0 + 0.05 * k)
    cwz, chz = cw / z, ah / z
    cx = lerp(opts, "cx", cx_auto, k) * fw
    x0 = float(np.clip(cx - cwz / 2, 0, fw - cwz)); yy = y0 + (ah - chz) * lerp(opts, "cy", 0.4, k)
    img = fr.resize((W, H), Image.BICUBIC, box=(x0, yy, x0 + cwz, yy + chz))
    g = gain(mean, opts)                            # night shots: lift them so faces read on a phone
    if g != 1.0:
        img = ImageEnhance.Contrast(ImageEnhance.Brightness(img).enhance(g)).enhance(1.06)
    return img.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))


def compose_fit(fr, info, opts, k):
    """A wider shot (for a sign or an action the vertical crop would cut): a full-width window of aspect `ar`
    (default: the picture's own), zoomed by `fit` around cx/cy, sits at fy of the screen over a blurred fill of itself."""
    fw, fh = fr.size; y0, y1, mean, cx_auto = info
    ah = y1 - y0
    z = opts["fit"] * (1.0 + 0.04 * k)
    ch = ah / z; cw = min(fw / z, ch * opts.get("ar", fw / ah))
    x0 = float(np.clip(lerp(opts, "cx", 0.5, k) * fw - cw / 2, 0, fw - cw)); yy = y0 + (ah - ch) * lerp(opts, "cy", 0.5, k)
    fg = fr.resize((W, int(round(W * ch / cw))), Image.BICUBIC, box=(x0, yy, x0 + cw, yy + ch))
    bw = ah * W / H; bx = float(np.clip(lerp(opts, "cx", 0.5, k) * fw - bw / 2, 0, fw - bw))
    bg = fr.resize((W // 4, H // 4), Image.BILINEAR, box=(bx, y0, bx + bw, y1)).filter(ImageFilter.GaussianBlur(7)).resize((W, H), Image.BICUBIC)
    bg = Image.eval(bg, lambda v: int(v * 0.42))
    g = gain(mean, opts)
    if g != 1.0:
        fg = ImageEnhance.Contrast(ImageEnhance.Brightness(fg).enhance(g)).enhance(1.06)
        bg = ImageEnhance.Brightness(bg).enhance(g)
    fg = fg.filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    bg.paste(fg, (0, int(H * opts.get("fy", 0.30) - fg.height / 2)))
    return bg


def compose_photo(ph, k):
    bg = ph.copy().convert("RGB")
    s = max(W / bg.width, H / bg.height); bg = bg.resize((int(bg.width * s) + 1, int(bg.height * s) + 1), Image.BICUBIC)
    bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))
    bg = Image.eval(bg.filter(ImageFilter.GaussianBlur(32)), lambda v: int(v * 0.45))
    z = 1.0 + 0.07 * k
    tw = int(980 * z) if ph.width >= ph.height else int(760 * z)
    th = int(tw * ph.height / ph.width)
    if th > 1500:
        th = 1500; tw = int(th * ph.width / ph.height)
    p = ph.convert("RGB").resize((tw, th), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60))
    frame = Image.new("RGB", (tw + 24, th + 24), (240, 236, 226)); frame.paste(p, (12, 12))
    bg.paste(frame, ((W - frame.width) // 2, int(H * 0.44 - frame.height / 2)))
    return bg


def caption(img, words, t):
    cur = None
    for i, w in enumerate(words):
        end = min(words[i + 1]["t0"] if i + 1 < len(words) else w["t1"] + 0.35, w["t1"] + 0.4)
        if w["t0"] - 0.02 <= t < end:
            cur = w
    if not cur:
        return
    tok = re.sub(r"[^\w'’\-]", "", cur["w"]).upper()
    if not tok:
        return
    k = min(1.0, (t - cur["t0"] + 0.02) / 0.06)
    size = int(150 * (0.9 + 0.1 * k))
    f = ImageFont.truetype(CAP_FONT, size)
    d = ImageDraw.Draw(img)
    while d.textlength(tok, font=f) > 980 and size > 70:
        size -= 6; f = ImageFont.truetype(CAP_FONT, size)
    y = H * 0.52
    d.text((W / 2 + 5, y + 7), tok, font=f, fill=(0, 0, 0), anchor="mm", stroke_width=12, stroke_fill=(0, 0, 0))
    d.text((W / 2, y), tok, font=f, fill=(255, 230, 0), anchor="mm", stroke_width=9, stroke_fill=(10, 10, 10))


def music_bed(seconds, seed=12):
    """Low, tense documentary bed (D minor), an original."""
    rng = np.random.default_rng(seed)
    n = int((seconds + 3) * SR); y = np.zeros((n, 2))
    chords = [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [36, 48, 55, 60, 64], [33, 45, 52, 57, 61]]
    bar = 60 / 76 * 4
    for b in range(int(seconds / bar) + 2):
        ch = chords[b % 4]; t0 = b * bar
        for m in ch:
            x = mu.strings(m, bar, rng, 0.06, 1800, attack=1.2, release=1.6); p = int(t0 * SR); y[p:p + len(x)] += x[: n - p]
        for beat in (0, 2):
            x = mu.thump(0.22); p = int((t0 + beat * bar / 4) * SR); y[p:p + len(x)] += x[: n - p]
    y = mu.convolve(y, mu.reverb_ir(2.6)) * 0.6 + y * 0.4
    return y[: int(seconds * SR)].astype(np.float32)


def main():
    spec = json.load(open(sys.argv[1])); out = sys.argv[2]
    base = spec["base"]; voice, speed = spec.get("voice", "am_michael"), spec.get("speed", 1.22)
    work = os.path.splitext(out)[0] + "_work"; os.makedirs(work, exist_ok=True)
    cache = os.path.join(work, "tts"); os.makedirs(cache, exist_ok=True)
    gap = spec.get("gap", 0.05)
    voice_parts, film_parts, words, shots = [], [], [], []
    t = 0.0
    for b in spec["beats"]:
        if "film" in b:
            sid, a, e = b["film"]; path = src_path(base, sid)
            raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-i", path, "-t", f"{e - a:.3f}", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
            y = np.frombuffer(raw, np.float32).reshape(-1, 2).copy(); f = int(0.03 * SR)
            y[:f] *= np.linspace(0, 1, f)[:, None]; y[-f:] *= np.linspace(1, 0, f)[:, None]
            d = len(y) / SR; film_parts.append((t, y))
            tx = os.path.join(base, "tx", sid + ".json")
            src_words = b.get("words") or ([w for r in json.load(open(tx)) for w in r["w"]] if os.path.exists(tx) else [])
            for w in src_words:                     # "words": [[start, end, "word"], ...] in source time, when the transcript missed a line
                if a <= w[0] < e - 0.1:
                    words.append({"t0": w[0] - a + t, "t1": min(w[1], e) - a + t, "w": w[2].strip()})
            seq = b.get("shots") or [[sid, a, {}]]
        else:
            y, path = rd.tts(b.get("speak", b["say"]), voice, speed, cache); d = len(y) / SR      # "speak" = phonetic spelling for the voice
            voice_parts.append((t, y))
            heard = rd.word_times(path)
            for w in rd.align_script_words(b["say"], heard):
                words.append({"t0": t + w["s"], "t1": t + w["e"], "w": w["w"]})
            seq = b["shots"]
        # shots share the beat's duration (optionally weighted); "d" pins a shot to a fixed length in seconds
        opt = [s[2] if len(s) > 2 else {} for s in seq]
        fixed = sum(o["d"] for o in opt if "d" in o)
        wts = [o.get("w", 1.0) for o in opt if "d" not in o]; tot = sum(wts) or 1.0; tt = t
        span = d + gap                              # shots also cover the short gap after the beat (no missing frames)
        free = max(0.0, span - fixed)
        for s, o in zip(seq, opt):
            sd = o["d"] if "d" in o else free * o.get("w", 1.0) / tot
            shots.append({"t0": tt, "t1": tt + sd, "sid": s[0], "st": s[1] if len(s) > 1 else 0, "opts": s[2] if len(s) > 2 else {}})
            tt += sd
        t += d + gap
    total = t; n = int(round(total * FPS))
    # ---- audio: voice + film lines + bed (ducked under speech) ----
    mix = np.zeros((int((total + 1) * SR), 2), np.float32); speech = np.zeros(len(mix), np.float32)
    for t0, y in voice_parts + film_parts:
        p = int(t0 * SR); mix[p:p + len(y)] += y; speech[p:p + len(y)] = 1
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    for t0, y in film_parts:                        # film lines at the same loudness as the narration
        p = int(t0 * SR); seg = mix[p:p + len(y)]
        try:
            seg *= 10 ** ((-16 - meter.integrated_loudness(seg)) / 20)
        except Exception:
            pass
    vo = np.concatenate([y for _, y in voice_parts]); g = 10 ** ((-16 - meter.integrated_loudness(vo)) / 20)
    for t0, y in voice_parts:
        p = int(t0 * SR); mix[p:p + len(y)] *= g
    bed = music_bed(len(mix) / SR); bed = bed[: len(mix)]
    bed *= 10 ** ((-30 - meter.integrated_loudness(bed)) / 20)
    env = np.convolve(speech, np.ones(int(0.25 * SR)) / int(0.25 * SR), "same")
    mix += bed * (1 - 0.45 * env)[:, None]
    mix = mix[: int(total * SR)]
    lim = 10 ** (-1 / 20)
    for _ in range(3):
        mix = mix * 10 ** ((-14 - meter.integrated_loudness(mix)) / 20)
        if np.abs(mix).max() > lim:
            mix = np.tanh(mix / lim) * lim
    import soundfile as sf
    wav = os.path.join(work, "audio.wav"); sf.write(wav, mix.astype(np.float32), SR)
    json.dump({"shots": shots, "words": words, "dur": total}, open(os.path.join(work, "plan.json"), "w"), indent=1)
    # ---- picture ----
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p",
                            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    infos, written = {}, 0
    for s in shots:
        f0, f1 = int(round(s["t0"] * FPS)), min(n, int(round(s["t1"] * FPS)))
        if f1 <= f0:
            continue
        path = src_path(base, s["sid"])
        if s["sid"].startswith("photo:"):
            ph = Image.open(path)
            for f in range(f0, f1):
                img = compose_photo(ph, (f - f0) / max(1, f1 - f0)); caption(img, words, f / FPS)
                enc.stdin.write(img.tobytes()); written += 1
            continue
        fw, fh = probe(path)
        key = (s["sid"], round(s["st"], 1))
        if key not in infos:
            infos[key] = analyse(path, s["st"], fw, fh)
        rdr = Frames(path, s["st"], f1 - f0, fw, fh)
        info = infos[key]
        if "rows" in s["opts"]:                     # override the letterbox detection (very dark frames fool it)
            info = (int(s["opts"]["rows"][0] * fh), int(s["opts"]["rows"][1] * fh)) + info[2:]
        comp = compose_fit if "fit" in s["opts"] else compose_clip
        for f in range(f0, f1):
            fr = rdr.next()
            img = comp(fr, info, s["opts"], (f - f0) / max(1, f1 - f0))
            caption(img, words, f / FPS)
            enc.stdin.write(img.tobytes()); written += 1
        rdr.close()
    enc.stdin.close(); enc.wait()
    print(out, f"{total:.2f}s, {len(shots)} shots, {len(words)} words, {written} frames")


if __name__ == "__main__":
    main()
