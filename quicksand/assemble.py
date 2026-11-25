"""Encode the rendered frames with the mixed soundtrack into the final short.

usage: python3 -I assemble.py OUT.mp4 [--frames DIR] [--fps 24] [--captions] [--upscale W H]
  --captions  burns 2-3 word captions (heavy white sans, soft shadow, pop-in) timed to the narration
"""
import json, os, re, subprocess, sys, tempfile

SCRATCH = os.environ["QS_SCRATCH"]


def arg(name, n=1, default=None):
    if name in sys.argv:
        i = sys.argv.index(name)
        return sys.argv[i + 1:i + 1 + n] if n > 1 else (sys.argv[i + 1] if n == 1 else True)
    return default


def caption_chunks():
    """Split each narration line into 2-3 word chunks timed by character count. A line may carry a
    "caption" (what to show, e.g. digits) that differs from the spoken "text"."""
    lines = json.load(open(os.path.join(SCRATCH, "vo_timing.json")))["lines"]
    out = []
    for ln in lines:
        words = ln.get("caption", ln["text"]).replace("...", "").split()
        groups, cur = [], []
        for w in words:
            cur.append(w)
            if len(cur) == 3 or (len(cur) >= 2 and re.search(r"[,.?!]$", w)):
                groups.append(cur); cur = []
        if cur:
            if groups and len(cur) == 1:
                groups[-1].extend(cur)
            else:
                groups.append(cur)
        total = sum(len(" ".join(g)) for g in groups)
        t = ln["start"]
        dur = ln["end"] - ln["start"]
        for g in groups:
            txt = " ".join(g).rstrip(",.")
            d = dur * len(" ".join(g)) / total
            out.append((txt, t, t + d))
            t += d
    if out:  # caption on screen from the very first frame
        out[0] = (out[0][0], 0.0, out[0][2])
    return out


def caption_at(chunks, t):
    for text, a, b in chunks:
        if a <= t < b + 0.05:
            return text, a
    return None, None


def draw_caption(im, text, k=1.0):
    """Caption look: heavy white sans, thin dark outline and soft shadow, centred at 78% height.
    k (0..1) drives a short pop-in scale."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    font_path = os.path.join(SCRATCH, "..", "fonts", "OpenSans-ExtraBold.ttf")
    im = im.convert("RGBA")
    W, H = im.size
    sc = 0.88 + 0.12 * (1 - (1 - k) ** 3)
    fs = int(W * 0.068 * sc)
    font = ImageFont.truetype(font_path, fs)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    l, t, r, b = d.textbbox((0, 0), text, font=font, stroke_width=fs // 20)
    x, y = (W - (r - l)) // 2 - l, int(H * 0.78) - (b + t) // 2
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((x, y + fs // 16), text, font=font, fill=(0, 0, 0, 170),
                            stroke_width=fs // 12, stroke_fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(fs * 0.12))
    d.text((x, y), text, font=font, fill=(255, 255, 255, 255), stroke_width=fs // 20,
           stroke_fill=(20, 20, 20, 230))
    return Image.alpha_composite(im, Image.alpha_composite(sh, layer))


def burn_captions(src_dir, dst_dir, fps):
    from PIL import Image
    chunks = caption_chunks()
    os.makedirs(dst_dir, exist_ok=True)
    files = sorted(f for f in os.listdir(src_dir) if f.endswith(".png"))
    for i, fn in enumerate(files):
        t = i / fps
        im = Image.open(os.path.join(src_dir, fn))
        text, a = caption_at(chunks, t)
        if text:
            im = draw_caption(im, text, 1.0 if a == 0 else min(1.0, (t - a) * fps / 3))
        im.convert("RGB").save(os.path.join(dst_dir, f"c{i + 1:04d}.png"))
    return os.path.join(dst_dir, "c%04d.png")


def main():
    out = sys.argv[1]
    fps = int(arg("--fps", 1, "24"))
    frames = arg("--frames", 1, os.path.join(SCRATCH, "frames"))
    # sequential links so gaps (e.g. a preview rendered every 2nd frame) encode cleanly
    seq = tempfile.mkdtemp(dir=SCRATCH)
    for i, fn in enumerate(sorted(f for f in os.listdir(frames) if re.match(r"f\d{4}\.png", f))):
        os.symlink(os.path.join(os.path.abspath(frames), fn), os.path.join(seq, f"s{i + 1:04d}.png"))
    pattern, start = os.path.join(seq, "s%04d.png"), 1
    if arg("--captions", 0):
        pattern = burn_captions(seq, tempfile.mkdtemp(dir=SCRATCH), fps)
    vf = ["eq=contrast=1.04:saturation=1.12"]  # light punchy grade
    up = arg("--upscale", 2)
    if up:
        vf += [f"scale={up[0]}:{up[1]}:flags=lanczos", "unsharp=5:5:0.5"]
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-start_number", str(start), "-i", pattern,
           "-i", os.path.join(SCRATCH, "mix.wav")]
    if vf:
        cmd += ["-vf", ",".join(vf)]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
            "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
            "-shortest", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
