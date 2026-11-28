# cover.py <video|photo.jpg> <t> <out.jpg> "TOP LINE" "BOTTOM LINE" [cx] [rows_top rows_bottom]
# Thumbnail in the Shorts layout: the frame fills the middle 66% (like the video), white line in the top band,
# yellow line in the bottom band (Anton). Run with the same python as detail.py.
import sys, os
sys.path.insert(0, "/home/user/Claude-new/shorts/movie")
import detail as dt
from PIL import Image, ImageDraw, ImageFont
src, t, out, top, bot = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
opts = {}
if len(sys.argv) > 6: opts["cx"] = float(sys.argv[6])
if src.lower().endswith((".jpg", ".jpeg", ".png")):       # a photo: framed over its own blur, like photo shots
    img = dt.compose_photo(Image.open(src), 0.5)
else:
    fw, fh = dt.probe(src)
    info = dt.analyse(src, t, fw, fh)
    if len(sys.argv) > 8: info = (int(float(sys.argv[7]) * fh), int(float(sys.argv[8]) * fh)) + info[2:]
    fr = Image.fromarray(dt.grab(src, t, fw, fh))
    img = dt.compose_full(fr, info, opts, 0.0)
d = ImageDraw.Draw(img)
band = dt.H * (1 - dt.MID) / 2
for text, y, col in ((top, band / 2, (255, 255, 255)), (bot, dt.H - band / 2, (255, 230, 0))):
    size = 170
    f = ImageFont.truetype(dt.CAP_FONT, size)
    while d.textlength(text, font=f) > 1000 and size > 60:
        size -= 6; f = ImageFont.truetype(dt.CAP_FONT, size)
    d.text((dt.W / 2 + 6, y + 8), text, font=f, fill=(0, 0, 0), anchor="mm", stroke_width=12, stroke_fill=(0, 0, 0))
    d.text((dt.W / 2, y), text, font=f, fill=col, anchor="mm", stroke_width=9, stroke_fill=(10, 10, 10))
img.save(out, quality=92); print(out)
