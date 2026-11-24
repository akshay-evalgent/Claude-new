# final.py: join both composited halves into one vertical Short with the mixed sound and captions -> brick_swap_full.mp4
import json, re, subprocess, numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import pyloudnorm as pyln
SR, FPS = 44100, 24000 / 1001
A, B = "../swap", "."
SKIP2 = 10                                                    # seg2 opens on Biff's hands on George's face: start the shot 6 frames in
a1, _ = sf.read(f"{A}/swap_audio.wav", dtype="float32"); a2, _ = sf.read(f"{B}/seg2_audio.wav", dtype="float32")
a2 = a2[int(round(SKIP2 / FPS * SR)):]
n1 = int(round(449 / FPS * SR)); a1 = a1[:n1]
xf = int(0.02 * SR); f_ = np.linspace(0, 1, xf)[:, None]
aud = np.concatenate([a1[:-xf], a1[-xf:] * (1 - f_) + a2[:xf] * f_, a2[xf:]])
meter = pyln.Meter(SR); lim = 10 ** (-2 / 20)
for _ in range(2):
    aud = aud * 10 ** ((-14 - meter.integrated_loudness(aud)) / 20)
    if np.abs(aud).max() > lim: aud = np.tanh(aud / lim) * lim
sf.write("full_audio.wav", aud.astype(np.float32), SR)
w1 = json.load(open(f"{A}/swap_words.json")); w2 = json.load(open(f"{B}/seg2_words.json")); off = 449 / FPS
sk = SKIP2 / FPS
words = [dict(w, who="fig" if w["who"] == "fig" else "other") for w in w1] + [dict(w, t0=w["t0"] + off - sk, t1=w["t1"] + off - sk) for w in w2 if w["t0"] >= sk]
CROP = json.load(open("crop.json"))                         # output frame ranges -> window centre (0-1)
def crop_c(k):
    for a, b, c in CROP:
        if a <= k <= b: return c
    return 0.5
W, H, VW, VH = 1080, 1920, 1920, 1080
F = ImageFont.truetype("/home/user/Claude-new/shorts/fonts/Anton-Regular.ttf", 130)
FS = ImageFont.truetype("/home/user/Claude-new/shorts/fonts/Anton-Regular.ttf", 46)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "24000/1001", "-i", "-", "-i", "full_audio.wav",
                        "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                        "-shortest", "-movflags", "+faststart", "brick_swap_full.mp4"], stdin=subprocess.PIPE)
k = 0; vy, WIN_H = 400, 810
for si, src in enumerate((f"{A}/swap16x9_v.mp4", f"{B}/swap16x9_v.mp4")):
    rawp = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    sf_ = 0
    while True:
        b = rawp.stdout.read(VW * VH * 3)
        if len(b) < VW * VH * 3: break
        sf_ += 1
        if si == 1 and sf_ <= SKIP2: continue
        fr = Image.frombuffer("RGB", (VW, VH), b)
        bg = fr.resize((W // 6, H // 6), box=((VW - VH * W / H) / 2, 0, (VW + VH * W / H) / 2, VH)).filter(ImageFilter.GaussianBlur(4)).resize((W, H))
        bg = Image.eval(bg, lambda v: int(v * 0.35))
        cw = VH * 4 / 3; x0 = min(max(crop_c(k) * VW - cw / 2, 0), VW - cw)
        bg.paste(fr.resize((W, WIN_H), Image.LANCZOS, box=(x0, 0, x0 + cw, VH)), (0, vy))
        d = ImageDraw.Draw(bg); t = k / FPS
        d.rounded_rectangle([W / 2 - 92, vy - 92, W / 2 + 92, vy - 30], 14, fill=(230, 40, 40)); d.text((W / 2, vy - 61), "PARODY", font=FS, fill=(255, 255, 255), anchor="mm")
        cur = None
        for i, w in enumerate(words):
            end = min(words[i + 1]["t0"] if i + 1 < len(words) else w["t1"] + 0.35, w["t1"] + 0.4)
            if w["t0"] - 0.02 <= t < end: cur = w
        if cur:
            tok = re.sub(r"[^\w'’\-?!]", "", cur["w"]).upper()
            col = (255, 230, 0) if cur["who"] == "fig" else (255, 255, 255)
            y = vy + WIN_H + 170
            d.text((W / 2 + 5, y + 7), tok, font=F, fill=(0, 0, 0), anchor="mm", stroke_width=12, stroke_fill=(0, 0, 0))
            d.text((W / 2, y), tok, font=F, fill=col, anchor="mm", stroke_width=9, stroke_fill=(10, 10, 10))
        enc.stdin.write(bg.tobytes()); k += 1
    rawp.stdout.close(); rawp.wait()
enc.stdin.close(); enc.wait(); print("frames", k, "dur", k / FPS)
