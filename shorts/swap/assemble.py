# assemble.py: audio (Biff's voice out, new lines in) + vertical 1080x1920 Shorts layout with captions -> swap_test.mp4
import sys, json, subprocess, numpy as np, soundfile as sf, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, "/home/user/Claude-new/shorts"); import render as rd; import music as mu
import pyloudnorm as pyln
SR = 44100; rd.SR = SR
VCUT = (358 / (24000 / 1001), 383 / (24000 / 1001))         # video span removed (Biff's real hand)
ACUT = (15.24, 15.24 + VCUT[1] - VCUT[0])                    # audio span removed: same length, after George's "Monday"
def out_t(t): return t if t < ACUT[0] else t - (ACUT[1] - ACUT[0])
# ---- audio ----
nov, _ = sf.read("novocals.wav", dtype="float32"); voc, _ = sf.read("vocals.wav", dtype="float32")
gate = np.ones(len(voc), np.float32)
for a, b in [(1.3, 2.6), (5.4, 7.95), (10.25, 11.75), (15.3, 19.9)]:          # Biff's lines
    i, j = int(a * SR), min(len(gate), int(b * SR)); gate[i:j] = 0
gate = np.convolve(gate, np.ones(int(0.03 * SR)) / int(0.03 * SR), "same")
base = nov + voc * gate[:, None]
i, j = int(ACUT[0] * SR), int(ACUT[1] * SR); xf = int(0.04 * SR)
fade = np.linspace(0, 1, xf)[:, None]
base = np.concatenate([base[:i], base[i:i + xf] * (1 - fade) + base[j:j + xf] * fade, base[j + xf:]])
meter = pyln.Meter(SR)
george = voc[int(8.08 * SR):int(10.16 * SR)]; g_l = meter.integrated_loudness(george)
lines = json.load(open("lines.json")); words = []
ir = mu.reverb_ir(0.5)
for L in lines:
    y, _ = sf.read(L["wav"], dtype="float32"); y = y if y.ndim == 1 else y.mean(1)
    y = y * 10 ** ((g_l - meter.integrated_loudness(y)) / 20)
    wet = mu.convolve(np.stack([y, y], 1), ir); y2 = np.stack([y, y], 1) * 0.88 + wet[:len(y)] * 0.12
    t = out_t(L["t"]); p = int(t * SR); n = min(len(y2), len(base) - p); base[p:p + n] += y2[:n]
    heard = rd.word_times(L["wav"])
    for w in rd.align_script_words(L["text"], heard): words.append({"t0": t + w["s"], "t1": t + w["e"], "w": w["w"], "who": "fig"})
tx = json.load(open("/tmp/claude-0/-home-user-Claude-new/9fad38f2-db19-5f82-b2b1-4b07b421ac0c/scratchpad/bttf/tx/Qfs38mrZF-4.json"))
for r in tx:
    for w in r["w"]:
        s = w[0] - 25.0
        if 8.0 <= s <= 10.2 or 11.9 <= s <= 15.25: words.append({"t0": out_t(s), "t1": out_t(w[1] - 25.0), "w": w[2].strip(), "who": "george"})
words.sort(key=lambda w: w["t0"])
dur = 449 / (24000 / 1001); base = base[:int(dur * SR)]
lim = 10 ** (-2 / 20)
for _ in range(3):                                             # loudness to -14 LUFS, soft-limited peaks
    base = base * 10 ** ((-14 - meter.integrated_loudness(base)) / 20)
    if np.abs(base).max() > lim: base = np.tanh(base / lim) * lim
sf.write("swap_audio.wav", base.astype(np.float32), SR)
json.dump(words, open("swap_words.json", "w"), indent=0)
# ---- picture ----
W, H, VW, VH = 1080, 1920, 1920, 1080
F = ImageFont.truetype("/home/user/Claude-new/shorts/fonts/Anton-Regular.ttf", 130)
FS = ImageFont.truetype("/home/user/Claude-new/shorts/fonts/Anton-Regular.ttf", 46)
rawp = subprocess.Popen(["ffmpeg", "-v", "error", "-i", "swap16x9_v.mp4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", "24000/1001", "-i", "-", "-i", "swap_audio.wav",
                        "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                        "-shortest", "-movflags", "+faststart", "swap_test.mp4"], stdin=subprocess.PIPE)
k = 0; fps = 24000 / 1001
vy = 400                                                       # top of the 4:3 window (1080x810)
WIN_H = 810
while True:
    b = rawp.stdout.read(VW * VH * 3)
    if len(b) < VW * VH * 3: break
    fr = Image.frombuffer("RGB", (VW, VH), b)
    bg = fr.resize((W * VH // H, VH), box=((VW - VH * W / H) / 2, 0, (VW + VH * W / H) / 2, VH)).resize((W // 6, H // 6)).filter(ImageFilter.GaussianBlur(4)).resize((W, H))
    bg = Image.eval(bg, lambda v: int(v * 0.35))
    cxw = 0.42 if 280 <= k <= 357 else 0.5                     # over-the-shoulder shot: keep the figure and George in the window
    cw = VH * 4 / 3; x0 = min(max(cxw * VW - cw / 2, 0), VW - cw)
    bg.paste(fr.resize((W, WIN_H), Image.LANCZOS, box=(x0, 0, x0 + cw, VH)), (0, vy))
    d = ImageDraw.Draw(bg); t = k / fps
    d.rounded_rectangle([W / 2 - 92, vy - 92, W / 2 + 92, vy - 30], 14, fill=(230, 40, 40)); d.text((W / 2, vy - 61), "PARODY", font=FS, fill=(255, 255, 255), anchor="mm")
    cur = None
    for i, w in enumerate(words):
        end = min(words[i + 1]["t0"] if i + 1 < len(words) else w["t1"] + 0.35, w["t1"] + 0.4)
        if w["t0"] - 0.02 <= t < end: cur = w
    if cur:
        import re
        tok = re.sub(r"[^\w'’\-?!]", "", cur["w"]).upper()
        col = (255, 230, 0) if cur["who"] == "fig" else (255, 255, 255)
        y = vy + WIN_H + 170
        d.text((W / 2 + 5, y + 7), tok, font=F, fill=(0, 0, 0), anchor="mm", stroke_width=12, stroke_fill=(0, 0, 0))
        d.text((W / 2, y), tok, font=F, fill=col, anchor="mm", stroke_width=9, stroke_fill=(10, 10, 10))
    enc.stdin.write(bg.tobytes()); k += 1
enc.stdin.close(); enc.wait(); print("frames", k, "dur", k / fps)
