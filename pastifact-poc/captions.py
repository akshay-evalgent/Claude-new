"""Burn Pastifact-style captions onto the rendered frames and encode the short.

Style: 2-3 word chunks, heavy white sans with a soft drop shadow, centred about
three quarters of the way down, with a quick pop-in.

usage: python3 -I captions.py  (reads $POC_SCRATCH/frames, writes $POC_SCRATCH/comp + out mp4)
"""
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SCRATCH = os.environ["POC_SCRATCH"]
FRAMES = os.path.join(SCRATCH, "frames")
COMP = os.path.join(SCRATCH, "comp")
FONT = os.path.join(SCRATCH, "fonts", "OpenSans-ExtraBold.ttf")
FPS = 24
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(SCRATCH, "amsterdam_poc.mp4")

CAPTIONS = [  # text, start s, end s
    ("In old Amsterdam", 0.10, 1.20),
    ("houses lean forward", 1.20, 2.36),
    ("on purpose", 2.45, 3.55),
    ("Here's why", 3.62, 5.00),
]
POP = 4  # frames


def caption_layer(size, text, scale, alpha):
    W, H = size
    fs = int(W * 0.066 * scale)
    font = ImageFont.truetype(FONT, fs)
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    tw, th = d.textbbox((0, 0), text, font=font)[2:]
    x, y = (W - tw) // 2, int(H * 0.755) - th // 2
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.text((x, y + int(fs * 0.06)), text, font=font, fill=(0, 0, 0, int(200 * alpha)),
            stroke_width=max(2, fs // 18), stroke_fill=(0, 0, 0, int(200 * alpha)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(fs * 0.12))
    d.text((x, y), text, font=font, fill=(255, 255, 255, int(255 * alpha)))
    return Image.alpha_composite(shadow, layer)


def main():
    os.makedirs(COMP, exist_ok=True)
    files = sorted(f for f in os.listdir(FRAMES) if f.endswith(".png"))
    for i, fn in enumerate(files):
        t = i / FPS
        im = Image.open(os.path.join(FRAMES, fn)).convert("RGBA")
        for text, a, b in CAPTIONS:
            if a <= t < b:
                k = min(1.0, (t - a) * FPS / POP)
                ease = 1 - (1 - k) ** 3
                im = Image.alpha_composite(im, caption_layer(im.size, text, 0.86 + 0.14 * ease, min(1.0, k * 1.5)))
        im.convert("RGB").save(os.path.join(COMP, f"c{i + 1:04d}.png"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(COMP, "c%04d.png"),
                    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
                    "-movflags", "+faststart", OUT], check=True)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
