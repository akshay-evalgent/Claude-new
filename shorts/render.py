#!/usr/bin/env python3
"""Shorts renderer: turns an edit list (JSON) + a long source video into a
1080x1920 vertical short in the "story recap" style:

  * cold open on an original soundbite (card framing)
  * narrator voice-over (Kokoro TTS) over source b-roll, alternating with
    original dialogue moments
  * two framings: CARD (source scaled to ~55% screen height, side-cropped,
    glowing white lines on its top/bottom edge) and FULL (9:16 punch-in on a
    face, auto-detected or set manually)
  * slow push-in on every shot, 3-frame zoom-blur + whoosh on every cut
  * 2-4 word ALL-CAPS captions, one colour-coded keyword with glow, blur-in
  * optional dark "flash-forward" shots, soft generated music bed

Usage:  python3 render.py edits/<name>.json  [--preview]
"""
import argparse, json, math, os, re, subprocess, sys, tempfile, shutil
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
W, H, FPS, SR = 1080, 1920, 30, 48000

# ---------------------------------------------------------------- utilities

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode(errors="ignore")[-3000:])
        raise SystemExit(f"command failed: {cmd[:6]}")
    return r.stdout

def read_audio(path, start, dur):
    raw = run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", path,
               "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"])
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    n = int(round(dur * SR))
    if len(a) < n:
        a = np.vstack([a, np.zeros((n - len(a), 2), np.float32)])
    return a[:n]

def fade_edges(a, ms=12):
    n = min(len(a) // 2, int(SR * ms / 1000))
    if n > 0:
        r = np.linspace(0, 1, n, dtype=np.float32)[:, None]
        a[:n] *= r; a[-n:] *= r[::-1]
    return a

def rms_db(a):
    return 20 * math.log10(max(1e-9, float(np.sqrt(np.mean(a ** 2)))))

def gain_to(a, target_db):
    # normalise on the loudest 30% of 50ms windows so pauses don't skew it
    win = int(0.05 * SR); m = a.mean(1)
    if len(m) < win:
        return a
    e = np.sqrt(np.convolve(m ** 2, np.ones(win) / win, mode="valid")[::win] + 1e-12)
    ref = np.percentile(e, 70)
    g = 10 ** (target_db / 20) / max(ref, 1e-6)
    return a * min(g, 12.0)

# ---------------------------------------------------------------- TTS

_kokoro = None
def tts(text, voice, speed, cache_dir):
    global _kokoro
    import hashlib, soundfile as sf
    spoken = text.replace("*", "")
    spoken = re.sub(r"\b(\d+)/(\d+)\b", r"\1 \2", spoken)      # 9/11 -> "nine eleven"
    spoken = spoken.replace("\u2026", ",")
    key = hashlib.md5(f"{voice}|{speed}|{spoken}".encode()).hexdigest()[:16]
    path = os.path.join(cache_dir, f"vo_{key}.wav")
    if not os.path.exists(path):
        if _kokoro is None:
            from kokoro_onnx import Kokoro
            mdir = os.environ.get("KOKORO_DIR", os.path.join(HERE, "models"))
            _kokoro = Kokoro(os.path.join(mdir, "kokoro-v1.0.onnx"), os.path.join(mdir, "voices-v1.0.bin"))
        a, sr = _kokoro.create(spoken, voice=voice, speed=speed, lang="en-us")
        # trim leading/trailing silence
        idx = np.where(np.abs(a) > 0.01)[0]
        if len(idx):
            a = a[max(0, idx[0] - int(0.03 * sr)): idx[-1] + int(0.08 * sr)]
        sf.write(path, a, sr)
    raw = run(["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy(), path

_whisper = None
def word_times(wav_path):
    """Word timestamps for a TTS clip (whisper on clean speech is near exact)."""
    global _whisper
    import soundfile as sf
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel("small.en", device="cpu", compute_type="int8")
    a, sr = sf.read(wav_path, dtype="float32")
    if sr != 16000:
        a = cv2.resize(a.reshape(-1, 1), (1, int(len(a) * 16000 / sr)), interpolation=cv2.INTER_LINEAR).ravel()
    segs, _ = _whisper.transcribe(a, language="en", word_timestamps=True, beam_size=5)
    return [{"w": w.word.strip(), "s": w.start, "e": w.end} for s in segs for w in (s.words or [])]

def align_script_words(script, heard):
    """Map the script's own words (keeps *keyword* marks, $ and numbers as
    written) onto whisper timings by proportional character position."""
    toks = script.split()
    if not heard:
        return []
    t0, t1 = heard[0]["s"], heard[-1]["e"]
    # character-length weighted distribution, anchored on heard word starts
    hl = [len(re.sub(r"\W", "", h["w"])) or 1 for h in heard]
    hc = np.cumsum([0] + hl[:-1]) / max(1, sum(hl))
    sl = [len(re.sub(r"\W", "", t)) or 1 for t in toks]
    sc = np.cumsum([0] + sl) / max(1, sum(sl))
    hs = [h["s"] for h in heard]
    out = []
    for i, tok in enumerate(toks):
        s = float(np.interp(sc[i], hc, hs))
        e = float(np.interp(sc[i + 1], list(hc) + [1.0], hs + [t1]))
        out.append({"w": tok, "s": s, "e": max(e, s + 0.08)})
    return out

# ---------------------------------------------------------------- captions

NEG = set("""died dead death cry cried crying tears lost lose never alone cancer war broke broken heart
sad pain sick hurt killed fire storm gone passed scared dangerous worst nobody nothing goodbye last
abandoned left fell attack attacks smoke dust collapsed""".split())
POS = set("""love loved home surprise surprised new finally happy life alive saved save hero dream
gift beautiful best first again together found family mom dad daughter son father mother grandpa
grandma wife thank thanks proud smile hug free""".split())
STOP = set("""a an the and but or so of to in on at for with was were is are be been he she they his her
their it its this that these those i you we me my your our him them as from by up out if then than
when what who had has have did do does not no just like into about over there here would could
will can all one some much very""".split())
COLORS = {"red": "&H3B3BFF&", "green": "&H66FF4D&", "yellow": "&H22D8FF&", "cyan": "&HFFE22E&", "pink": "&HB46BFF&"}

def ass_time(t):
    t = max(0, t); cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"

def chunk_words(words, max_words=3, max_chars=18, gap=0.45):
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= max_words or sum(len(x["w"]) + 1 for x in cur) + len(w["w"]) > max_chars
                    or w["s"] - cur[-1]["e"] > gap or re.search(r"[.!?,;:…]$", cur[-1]["w"])):
            chunks.append(cur); cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    return chunks

def pick_keyword(chunk, rot):
    best, score, colour = None, 0, None
    for i, w in enumerate(chunk):
        raw = w["w"]
        clean = re.sub(r"[^\w$']", "", raw).lower()
        if raw.startswith("*") and raw.rstrip(".,!?").endswith("*"):
            return i, (w.get("color") or ("red" if clean in NEG else "green" if clean in POS else rot))
        if not clean or clean in STOP:
            continue
        sc = len(clean) + (6 if re.search(r"\d|\$", raw) else 0) + (5 if clean in NEG or clean in POS else 0)
        if sc > score:
            best, score = i, sc
            colour = "red" if clean in NEG else "green" if (clean in POS or "$" in raw) else rot
    if best is None or score < 4:
        return None, None
    return best, colour

def build_ass(cap_events, path, style):
    """cap_events: list of (start, end, [words], forced_colour|None, kind)"""
    fs = style.get("font_size", 66)
    y = style.get("caption_y", 1030)
    hdr = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,MMCap ExtraBold,{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,4,2,5,60,60,0,1
Style: Glow,MMCap ExtraBold,{fs},&HFF000000,&HFF000000,&H00000000,&HFF000000,0,0,0,0,100,100,1,0,1,7,0,5,60,60,0,1
Style: Small,MMCap ExtraBold,30,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,2,1,2,60,60,70,1
Style: Lower,MMCap Black,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,2,0,1,3,1,5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    rot_cols = ["yellow", "cyan", "yellow", "green"]
    for n, (s, e, words, forced, kind) in enumerate(cap_events):
        txt_words = [re.sub(r"^\*|\*(?=[.,!?]*$)", "", w["w"]).upper() for w in words]
        if kind == "sfx":
            body = "*" + " ".join(txt_words).strip("*") + "*"
            anim = r"{\an5\pos(%d,%d)\fad(80,60)\blur6\t(0,140,\blur0)}" % (W // 2, y)
            lines.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Glow,,0,0,0,,{anim}{{\\3c&H3B3BFF&\\3a&H60&\\blur9}}{body}")
            lines.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{anim}{body}")
            continue
        ki, col = pick_keyword(words, rot_cols[n % len(rot_cols)])
        if forced:
            col = forced
        # two lines max: break before the middle if long
        parts = txt_words[:]
        if sum(len(p) + 1 for p in parts) > 14 and len(parts) >= 3:
            mid = len(parts) // 2
            parts[mid] = r"\N" + parts[mid]
        crisp, glow = [], []
        for i, p in enumerate(parts):
            if i == ki and col:
                c = COLORS[col]
                crisp.append(r"{\c%s}%s{\c&HFFFFFF&}" % (c, p))
                glow.append(r"{\3c%s\3a&H70&}%s{\3c&H000000&\3a&HFF&}" % (c, p))
            else:
                crisp.append(p)
                glow.append(r"{\3a&HFF&}%s" % p)
        anim = r"{\an5\pos(%d,%d)\fad(60,0)\blur8\fscx112\fscy112\t(0,130,\blur0\fscx100\fscy100)}" % (W // 2, y)
        anim_g = r"{\an5\pos(%d,%d)\fad(60,0)\fscx112\fscy112\t(0,130,\fscx100\fscy100)\blur14}" % (W // 2, y)
        lines.append(f"Dialogue: 0,{ass_time(s)},{ass_time(e)},Glow,,0,0,0,,{anim_g}{' '.join(glow)}")
        lines.append(f"Dialogue: 1,{ass_time(s)},{ass_time(e)},Cap,,0,0,0,,{anim}{' '.join(crisp)}")
    for (s, e, text, sty) in style.get("extra", []):
        lines.append(f"Dialogue: 2,{ass_time(s)},{ass_time(e)},{sty},,0,0,0,,{text}")
    with open(path, "w") as f:
        f.write(hdr + "\n".join(lines) + "\n")

# ---------------------------------------------------------------- video

_face = None
def face_center_x(frame):
    global _face
    if _face is None:
        _face = [cv2.CascadeClassifier(cv2.data.haarcascades + n) for n in
                 ("haarcascade_frontalface_default.xml", "haarcascade_profileface.xml")]
    g = cv2.cvtColor(cv2.resize(frame, (960, 540)), cv2.COLOR_BGR2GRAY)
    best = None
    for c in _face:
        for (x, y, w, h) in c.detectMultiScale(g, 1.1, 6, minSize=(50, 50)):
            if best is None or w * h > best[2] * best[3]:
                best = (x, y, w, h)
        for (x, y, w, h) in c.detectMultiScale(cv2.flip(g, 1), 1.1, 6, minSize=(50, 50)):
            x = 960 - x - w
            if best is None or w * h > best[2] * best[3]:
                best = (x, y, w, h)
    if best is None:
        return None
    return (best[0] + best[2] / 2) / 960.0, (best[1] + best[3] / 2) / 540.0

class Source:
    def __init__(self, path):
        self.path = path
        info = json.loads(run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                               "stream=width,height", "-of", "json", path]))["streams"][0]
        self.w, self.h = info["width"], info["height"]

    def frames(self, start, n, scale_h=1080):
        sw = int(round(self.w * scale_h / self.h / 2) * 2)
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-i", self.path, "-frames:v", str(n),
                              "-vf", f"fps={FPS},scale={sw}:{scale_h}:flags=lanczos", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                             stdout=subprocess.PIPE)
        size = sw * scale_h * 3
        last = None
        for _ in range(n):
            buf = p.stdout.read(size)
            if len(buf) < size:
                break
            last = np.frombuffer(buf, np.uint8).reshape(scale_h, sw, 3)
            yield last
        p.stdout.close(); p.wait()
        while last is not None and _ < n - 1:  # pad if source ran short
            _ += 1
            yield last

def ease_out(x):
    return 1 - (1 - min(max(x, 0), 1)) ** 3

def affine_crop(img, cx, cy, scale, out_w, out_h):
    """Sub-pixel smooth crop: output pixel (u,v) samples img at cx+(u-out_w/2)/scale."""
    M = np.float32([[scale, 0, out_w / 2 - cx * scale], [0, scale, out_h / 2 - cy * scale]])
    return cv2.warpAffine(img, M, (out_w, out_h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

def glow_line(canvas, y, alpha=1.0):
    y = int(y)
    if y < 6 or y > H - 6:
        return
    band = canvas[y - 30:y + 30].astype(np.float32)
    prof = np.exp(-((np.arange(60) - 30) / 9.0) ** 2)[:, None, None] * 150 * alpha
    core = np.zeros((60, 1, 1), np.float32); core[28:33] = 255 * alpha
    band = np.maximum(band, np.minimum(255, band + prof)); band = np.maximum(band, core)
    canvas[y - 30:y + 30] = band.clip(0, 255).astype(np.uint8)

def zoom_blur(img, strength):
    if strength <= 0.01:
        return img
    acc = img.astype(np.float32)
    n = 5
    for k in range(1, n + 1):
        s = 1 + 0.035 * strength * k
        acc += affine_crop(img, img.shape[1] / 2, img.shape[0] / 2, s, img.shape[1], img.shape[0]).astype(np.float32)
    return (acc / (n + 1)).astype(np.uint8)

def render_shot(src, shot, n_frames, writer, state):
    frame_mode = shot.get("frame", "card")
    zoom = shot.get("zoom", 1.0)
    push = shot.get("push", 0.07)
    frames = list(src.frames(shot["in"], n_frames))
    if not frames:
        raise SystemExit(f"no frames at {shot['in']}")
    fh, fw = frames[0].shape[:2]
    fx = shot.get("fx"); fy = shot.get("fy", 0.42)
    if frame_mode == "full" and fx is None:
        c = face_center_x(frames[min(len(frames) - 1, len(frames) // 2)])
        fx = c[0] if c else 0.5
        if c:
            fy = min(max(c[1], 0.3), 0.6)
    if fx is None:
        fx = 0.5
    state.setdefault("log", []).append(f"  shot @{shot['in']:.1f}s {frame_mode} fx={fx:.2f} n={n_frames}")
    for i, img in enumerate(frames):
        t = i / max(1, n_frames - 1)
        z = zoom * (1 + push * t)
        canvas = np.zeros((H, W, 3), np.uint8)
        if frame_mode == "card":
            card_h0 = shot.get("card_h", 1000)
            pop = 0.965 + 0.035 * ease_out(i / 6)
            ch = int(card_h0 * (1 + push * 0.6 * t) * pop) // 2 * 2
            s = max(ch / fh, W / fw) * zoom          # vertical sources: fill width
            cx = fw * fx
            # keep the crop inside the frame
            half = W / 2 / s
            cx = min(max(cx, half), fw - half) if half * 2 < fw else fw / 2
            halfy = ch / 2 / s
            cy = min(max(fh * shot.get("cy", 0.5), halfy), fh - halfy)
            card = affine_crop(img, cx, cy, s, W, ch)
            y0 = (H - ch) // 2 - shot.get("card_lift", 60)
            canvas[y0:y0 + ch] = card
            if i < 4:
                canvas[y0:y0 + ch] = zoom_blur(canvas[y0:y0 + ch], (4 - i) / 4)
            glow_line(canvas, y0); glow_line(canvas, y0 + ch)
        else:  # full-screen 9:16 punch-in
            s = max(H / fh, W / fw) * z * shot.get("full_zoom", 1.0)
            half = W / 2 / s
            cx = min(max(fw * fx, half), fw - half)
            halfy = H / 2 / s
            cy = min(max(fh * fy, halfy), fh - halfy)
            canvas = affine_crop(img, cx, cy, s, W, H)
            if i < 4:
                canvas = zoom_blur(canvas, (4 - i) / 4)
        if shot.get("dark"):
            hsv = cv2.cvtColor(canvas, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[..., 1] *= 0.55; hsv[..., 2] *= 0.55
            canvas = cv2.cvtColor(hsv.clip(0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)
        writer.write(canvas.tobytes())

# ---------------------------------------------------------------- audio extras

def whoosh(dur=0.35, gain_db=-24, seed=0):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    x = rng.standard_normal(n).astype(np.float32)
    # sweep a one-pole low-pass cutoff up then down
    env = np.sin(np.linspace(0, math.pi, n)) ** 2
    cut = 0.02 + 0.25 * env
    y = np.zeros(n, np.float32); acc = 0.0
    for i in range(n):
        acc += cut[i] * (x[i] - acc); y[i] = acc
    y = y * env
    y = y / (np.abs(y).max() + 1e-9) * 10 ** (gain_db / 20)
    return np.stack([y, y], 1)

def impact(gain_db=-16):
    n = int(1.6 * SR); t = np.arange(n) / SR
    f = 55 * np.exp(-t * 0.8) + 30
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)
    rng = np.random.default_rng(7)
    hit = rng.standard_normal(n) * np.exp(-t * 30) * 0.3
    y = (boom + hit).astype(np.float32)
    y = y / np.abs(y).max() * 10 ** (gain_db / 20)
    return np.stack([y, y], 1)

def music_bed(total, seed=1):
    """Soft emotional piano + pad, A minor - F - C - G at 70 bpm."""
    rng = np.random.default_rng(seed)
    n = int(total * SR) + SR
    out = np.zeros((n, 2), np.float32)
    beat = 60 / 70
    chords = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
    def tone(midi, dur, amp, pan, kind):
        f = 440 * 2 ** ((midi - 69) / 12)
        m = int(dur * SR); t = np.arange(m) / SR
        if kind == "piano":
            w = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t))
            w *= np.exp(-t * 2.2) * (1 - np.exp(-t * 300))
        else:
            w = sum(np.sin(2 * np.pi * f * (1 + d) * t) for d in (-0.003, 0, 0.004)) / 3
            w *= np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2).clip(0, 1)
        w = (w * amp).astype(np.float32)
        return np.stack([w * (1 - pan), w * pan], 1)
    t = 0.0; bar = 0
    while t < total + 1:
        ch = chords[bar % 4]
        pad = tone(ch[0] - 12, beat * 4 + 1.0, 0.05, 0.5, "pad") + tone(ch[1], beat * 4 + 1.0, 0.025, 0.4, "pad")
        i0 = int(t * SR); out[i0:i0 + len(pad)] += pad[:n - i0]
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
        for k, note in enumerate(arp):
            tt = t + k * beat
            p = tone(note, 2.5, 0.06 * (0.85 + 0.3 * rng.random()), 0.35 + 0.3 * rng.random(), "piano")
            j0 = int(tt * SR)
            if j0 < n:
                out[j0:j0 + len(p)] += p[:n - j0]
        t += beat * 4; bar += 1
    # simple feedback-delay reverb
    for d, g in ((0.113, 0.35), (0.271, 0.25), (0.419, 0.18)):
        k = int(d * SR); out[k:] += g * out[:-k]
    return out[:int(total * SR)]

# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl"); ap.add_argument("--out"); ap.add_argument("--preview", action="store_true")
    ap.add_argument("--src-dir", default=os.environ.get("SRC_DIR", "."))
    ap.add_argument("--tx-dir", default=os.environ.get("TX_DIR", "."))
    args = ap.parse_args()
    edl = json.load(open(args.edl))
    name = os.path.splitext(os.path.basename(args.edl))[0]
    out = args.out or f"{name}.mp4"
    work = tempfile.mkdtemp(prefix=f"render_{name}_")
    cache = os.environ.get("TTS_CACHE", os.path.join(HERE, ".tts_cache")); os.makedirs(cache, exist_ok=True)
    src = Source(os.path.join(args.src_dir, edl["source"] + ".mp4"))
    tx = json.load(open(os.path.join(args.tx_dir, edl["source"] + ".json")))
    tx_words = [w for s in tx for w in s["words"]]
    voice, speed = edl.get("voice", "am_michael"), edl.get("speed", 1.12)
    style = edl.get("style", {})

    # ---- 1. resolve beats into a timeline
    timeline, cap_events, cuts = [], [], []
    vo_tracks, clip_tracks, impacts = [], [], []
    t = 0.0
    for b in edl["beats"]:
        if b["type"] == "clip":
            dur = b["out"] - b["in"]
            shots = b.get("shots") or [{"in": b["in"], "frame": b.get("frame", "card"), **{k: v for k, v in b.items() if k in ("fx", "fy", "cy", "zoom", "card_h", "full_zoom", "dark")}}]
            if any("len" in sh for sh in shots):
                # b-roll over the original audio (picture not in sync with the sound)
                fixed = sum(sh.get("len", 0) for sh in shots)
                free = [sh for sh in shots if "len" not in sh]
                each = (dur - fixed) / max(1, len(free)); tt = t
                for sh in shots:
                    L = sh.get("len", each); timeline.append((tt, L, sh)); tt += L
            else:
                # shots follow source time (dialogue stays in lip-sync)
                for k, sh in enumerate(shots):
                    s_in = sh["in"]; s_out = shots[k + 1]["in"] if k + 1 < len(shots) else b["out"]
                    timeline.append((t + (s_in - b["in"]), s_out - s_in, sh))
            if not b.get("mute"):
                a = read_audio(src.path, b["in"], dur)
                clip_tracks.append((t, gain_to(fade_edges(a), b.get("db", -13))))
            if b.get("captions", True):
                ws = [dict(w, s=w["s"] - b["in"] + t, e=w["e"] - b["in"] + t) for w in tx_words
                      if w["s"] >= b["in"] - 0.05 and w["e"] <= b["out"] + 0.15
                      and not any(a0 <= w["s"] <= a1 for a0, a1 in b.get("cap_skip", []))]
                if b.get("text"):  # corrected text supplied -> re-time onto heard words
                    ws = align_script_words(b["text"], ws) if ws else []
                for ch in chunk_words(ws):
                    cap_events.append((ch[0]["s"], ch[-1]["e"], ch, b.get("color"), "talk"))
            for (m0, m1, mtext) in b.get("manual_caps", []):   # words whisper missed
                toks = mtext.split(); step = (m1 - m0) / max(1, len(toks))
                mw = [{"w": tk, "s": t + m0 + i * step, "e": t + m0 + (i + 1) * step} for i, tk in enumerate(toks)]
                for ch in chunk_words(mw, gap=9):
                    cap_events.append((ch[0]["s"], ch[-1]["e"], ch, None, "talk"))
            if b.get("impact"):
                impacts.append(t)
            for sfx in b.get("sfx_caps", []):
                cap_events.append((t + sfx[0], t + sfx[1], [{"w": sfx[2]}], None, "sfx"))
            t += dur
        elif b["type"] == "vo":
            a, wav = tts(b["text"], voice, b.get("speed", speed), cache)
            pre, post = b.get("pre", 0.05), b.get("post", 0.12)
            dur = pre + len(a) / SR + post
            vo_tracks.append((t + pre, a))
            heard = word_times(wav)
            ws = [dict(w, s=w["s"] + t + pre, e=w["e"] + t + pre) for w in align_script_words(b["text"], heard)]
            for ch in chunk_words(ws):
                cap_events.append((ch[0]["s"], ch[-1]["e"], ch, None, "vo"))
            shots = b["shots"]
            # shot lengths: explicit "len", else split remaining time evenly
            fixed = sum(s.get("len", 0) for s in shots)
            free = [s for s in shots if "len" not in s]
            each = (dur - fixed) / max(1, len(free))
            tt = t
            for sh in shots:
                L = sh.get("len", each)
                timeline.append((tt, L, sh)); tt += L
            if b.get("bg_db") is not None:  # keep some source ambience under VO
                for (st, L, sh) in timeline[-len(shots):]:
                    clip_tracks.append((st, gain_to(fade_edges(read_audio(src.path, sh["in"], L)), b["bg_db"])))
            t += dur
        elif b["type"] == "gap":
            t += b["len"]
    total = t
    for (st, L, sh) in timeline:
        cuts.append(st)

    # ---- 2. video frames
    vid_path = os.path.join(work, "video.mp4")
    ass_path = os.path.join(work, "caps.ass")
    extra = []
    if edl.get("credit"):
        extra.append((0.0, total, edl["credit"].upper(), "Small"))
    style["extra"] = extra
    build_ass(sorted(cap_events, key=lambda e: e[0]), ass_path, style)
    fonts = os.environ.get("FONTS_DIR", os.path.join(HERE, "fonts"))
    grade = style.get("grade", "eq=contrast=1.07:saturation=1.18:brightness=0.005,unsharp=5:5:0.6,vignette=PI/5")
    vf = f"{grade},ass={ass_path}:fontsdir={fonts}"
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
                            "-i", "-", "-vf", vf, "-c:v", "libx264", "-preset", "veryfast" if args.preview else "medium",
                            "-crf", "28" if args.preview else "18", "-pix_fmt", "yuv420p", vid_path], stdin=subprocess.PIPE)
    class Wr:
        def write(self, b): enc.stdin.write(b)
    state = {}
    frame_cursor = 0
    for (st, L, sh) in timeline:
        end_frame = int(round((st + L) * FPS))
        n = max(1, end_frame - frame_cursor)
        render_shot(src, sh, n, Wr(), state)
        frame_cursor += n
    enc.stdin.close(); enc.wait()
    print("\n".join(state.get("log", [])))

    # ---- 3. audio mix
    N = int(round(frame_cursor / FPS * SR))
    mix = np.zeros((N, 2), np.float32)
    def place(at, a, g=1.0):
        i0 = int(at * SR); seg = a[:max(0, N - i0)] * g
        mix[i0:i0 + len(seg)] += seg
    vo_level = 10 ** (-14 / 20)
    for at, a in clip_tracks:
        place(at, a)
    for at, a in vo_tracks:
        place(at, gain_to(a, -14))
    for k, c in enumerate(cuts[1:]):
        place(max(0, c - 0.12), whoosh(seed=k, gain_db=style.get("whoosh_db", -27)))
    for at in impacts:
        place(at, impact())
    if edl.get("music", True):
        bed = music_bed(N / SR)
        # duck under voice/dialogue
        if len(bed) < N:
            bed = np.vstack([bed, np.zeros((N - len(bed), 2), np.float32)])
        bed = gain_to(bed[:N], style.get("music_db", -25))
        speech = np.zeros(N, np.float32)
        for at, a in vo_tracks + clip_tracks:
            i0 = int(at * SR); speech[i0:i0 + len(a)] = 1
        k = int(0.3 * SR)
        speech = np.convolve(speech, np.ones(k, np.float32) / k, mode="same")
        mix += bed * (1 - 0.5 * speech)[:, None]
    peak = np.abs(mix).max()
    if peak > 0.98:
        mix *= 0.98 / peak
    wav_path = os.path.join(work, "mix.wav")
    import soundfile as sf
    sf.write(wav_path, mix, SR)
    run(["ffmpeg", "-v", "error", "-y", "-i", vid_path, "-i", wav_path, "-map", "0:v", "-map", "1:a",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
         "-shortest", "-movflags", "+faststart", out])
    shutil.rmtree(work, ignore_errors=True)
    print(f"wrote {out}  ({frame_cursor / FPS:.1f}s)")

if __name__ == "__main__":
    main()
