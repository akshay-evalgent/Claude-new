# frames.py <out.jpg> <base> sid:t [sid:t ...] : accurate single frames (16:9, 10% tick marks) in one sheet
import sys, subprocess
from PIL import Image, ImageDraw
out, base, items = sys.argv[1], sys.argv[2], sys.argv[3:]
tw = 480; tiles = []
for it in items:
    sid, t = it.rsplit(":", 1)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", t, "-i", f"{base}/src/{sid}.mp4", "-frames:v", "1", "-vf", f"scale={tw}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    import io; im = Image.open(io.BytesIO(raw)).convert("RGB"); d = ImageDraw.Draw(im)
    for q in range(1, 10):
        d.line([(tw * q / 10, 0), (tw * q / 10, 8)], fill=(255, 255, 0)); d.line([(0, im.height * q / 10), (8, im.height * q / 10)], fill=(255, 255, 0))
    d.rectangle([0, im.height - 14, 160, im.height], fill=(0, 0, 0)); d.text((3, im.height - 13), f"{sid[:6]} {t}", fill=(255, 255, 0))
    tiles.append(im)
cols = 4; th = max(i.height for i in tiles); rows = (len(tiles) + cols - 1) // cols
sh = Image.new("RGB", (tw * cols, th * rows), (40, 40, 40))
for k, im in enumerate(tiles): sh.paste(im, ((k % cols) * tw, (k // cols) * th))
sh.save(out, quality=85); print(out, len(tiles))
