"""Make the Shorts thumbnail the way Zack D. Films' are made: a frame of the video with the caption
that is on screen at that moment, nothing added. The frame is rendered natively at full size
(sharper than the upscaled video) and gets the same grade as the video.

usage: python3 -I thumbnail.py FRAME.png FRAME_NUMBER OUT.jpg [--fps 24] [--words N --cap-y Y --cap-size S]
  (the caption flags are the same as assemble.py's, so the thumbnail matches the video)
  e.g. python3 -I scene.py stills 362 --res 1080 1920 --samples 64
       python3 -I thumbnail.py $QS_SCRATCH/stills/0362_*.png 362 thumbnail.jpg
"""
import os, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import assemble  # noqa: E402

src, frame, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
fps = int(assemble.arg("--fps", 1, "24"))
from PIL import Image  # noqa: E402

# same grade as the video encode
graded = tempfile.mktemp(suffix=".png", dir=assemble.SCRATCH)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", "eq=contrast=1.04:saturation=1.12",
                graded], check=True)
im = Image.open(graded)
if im.size != (1080, 1920):
    im = im.convert("RGB").resize((1080, 1920), Image.LANCZOS)
text, _ = assemble.caption_at(assemble.caption_chunks(), (frame - 1) / fps)
if text:
    im = assemble.draw_caption(im, text)
im.convert("RGB").save(out, quality=92, optimize=True)
os.remove(graded)
print("wrote", out, "caption:", text)
