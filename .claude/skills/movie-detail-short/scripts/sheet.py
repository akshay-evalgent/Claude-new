# sheet.py <video> <out.jpg> <step_s> <cols> [start] [end] : contact sheet with timestamps
import subprocess, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
f, out, step, cols = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0; t1 = float(sys.argv[6]) if len(sys.argv) > 6 else 1e9
W, H = 216, 384
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t0), "-i", f, "-t", str(min(t1 - t0, 3000)), "-vf", f"select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,{step - 0.001})',scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2", "-vsync", "vfr", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
rows = (len(fr) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * (H + 18)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
for i, a in enumerate(fr):
    x, y = (i % cols) * W, (i // cols) * (H + 18)
    sheet.paste(Image.fromarray(a), (x, y + 18)); d.text((x + 4, y + 1), f"{t0 + i * step:.1f}s", fill=(255, 255, 0), font=font)
sheet.save(out, quality=82); print(out, len(fr), "frames")
