"""Make a contact sheet of frames at given timestamps from a video.
usage: python3 scripts/sheet.py video.mp4 out.jpg t1 t2 ...  (cols=5)"""
import subprocess, sys, os, tempfile
from PIL import Image, ImageDraw
video, out, *ts = sys.argv[1:]
cols = 5
tmp = tempfile.mkdtemp()
ims = []
for i, t in enumerate(ts):
    p = os.path.join(tmp, f"{i}.png")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", t, "-i", video, "-frames:v", "1", p], check=True)
    im = Image.open(p).convert("RGB")
    im = im.resize((360, 640))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 70, 26], fill="black")
    d.text((6, 6), f"{float(t):.1f}s", fill="white")
    ims.append(im)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 360, rows * 640), "white")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * 360, (i // cols) * 640))
sheet.save(out, quality=88)
