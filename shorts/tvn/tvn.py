#!/usr/bin/env python3
"""Then vs Now renderer: one photo at a time on black, a big year label, hard cuts on the beat.

    python3 tvn/tvn.py edits_tvn/<name>.json <out.mp4> [--music path.wav]

Layout and timing are measured from five reference Shorts (see THEN_VS_NOW.md):
  * 1080x1920, 60 fps, black background
  * photo about 980 px wide, centred near y=960, slow zoom-in of ~12% across each shot
  * one photo per 4 beats of a 117.5 BPM song = 2.043 s; hard cuts, no transitions
  * year in a heavy rounded sans with a black outline: white for "then", #07FB11 green for "now"

Faces are detected and every photo is cropped so the face lands at the same place and size,
so the cut from "then" to "now" reads instantly.

Spec:
{
  "shot": 2.043,                      # seconds per photo (4 beats at 117.5 BPM)
  "aspect": 0.8,                      # photo width / height (0.8 = 4:5)
  "face_h": 0.34,                     # face height as a share of the photo height
  "face_y": 0.40,                     # face centre, from the top of the photo
  "items": [
    {"img": "photos/pewdiepie_2012.jpg", "label": "2012", "kind": "then", "name": "PewDiePie"},
    {"img": "photos/pewdiepie_2025.jpg", "label": "2025", "kind": "now",  "name": "PewDiePie"},
    ...
  ]
}
Optional per item: "crop": [x0, y0, x1, y1] in source pixels (skips face detection), "face": index of the face
to use when several are found (0 = largest), "zoom": end scale (default 1.12).
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

W, H, FPS = 1080, 1920, 60
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(os.path.dirname(HERE), "fonts", "Montserrat-ExtraBold.ttf")
COLORS = {"then": (255, 255, 255), "now": (7, 251, 17), "died": (255, 40, 90)}


def faces(img):
    import cv2
    g = cv2.cvtColor(np.asarray(img.convert("RGB")), cv2.COLOR_RGB2GRAY)
    s = 900 / max(g.shape)
    small = cv2.resize(g, None, fx=s, fy=s) if s < 1 else g
    s = min(s, 1)
    found = []
    for xml in ("haarcascade_frontalface_default.xml", "haarcascade_frontalface_alt2.xml"):
        det = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, xml))
        r = det.detectMultiScale(small, scaleFactor=1.08, minNeighbors=6, minSize=(40, 40))
        found += [tuple(int(v / s) for v in f) for f in r]
        if len(found):
            break
    return sorted(found, key=lambda f: -f[2] * f[3])


def crop_box(img, it, spec):
    """Source-pixel box with the target aspect, face placed at face_y with height face_h."""
    if "crop" in it:
        return tuple(float(v) for v in it["crop"])
    aspect, fh, fy = it.get("aspect", spec.get("aspect", 0.8)), it.get("face_h", spec.get("face_h", 0.34)), it.get("face_y", spec.get("face_y", 0.40))
    iw, ih = img.size
    fs = faces(img)
    if fs:
        x, y, w, h = fs[min(it.get("face", 0), len(fs) - 1)]
        ch = h / fh
        cw = ch * aspect
        if cw > iw or ch > ih:                              # face too big for this framing: fit the image instead
            k = min(iw / cw, ih / ch); cw, ch = cw * k, ch * k
        cx, cy = x + w / 2, y + h / 2
        x0 = min(max(cx - cw / 2, 0), iw - cw)
        y0 = min(max(cy - fy * ch, 0), ih - ch)
        return (x0, y0, x0 + cw, y0 + ch)
    # no face: centre crop at the target aspect
    if iw / ih > aspect:
        cw = ih * aspect; return ((iw - cw) / 2, 0, (iw + cw) / 2, ih)
    ch = iw / aspect; return (0, (ih - ch) * 0.3, iw, (ih - ch) * 0.3 + ch)


def label_layer(text, color, size=190, stroke=12):
    f = ImageFont.truetype(FONT, size)
    l, t, r, b = f.getbbox(text, stroke_width=stroke)
    im = Image.new("RGBA", (r - l + 40, b - t + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((20 - l, 20 - t), text, font=f, fill=color, stroke_width=stroke, stroke_fill=(0, 0, 0))
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).text((20 - l, 26 - t), text, font=f, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    return Image.alpha_composite(sh, im)


def ease(x):
    return 1 - (1 - x) ** 2 * 0.35 - 0.65 * (1 - x)            # mostly linear with a slight ease-out, like the references


def render(spec, out, music=None, base=None):
    base = base or os.path.dirname(os.path.abspath(spec["_path"]))
    shot = spec.get("shot", 2.043)
    box_w = spec.get("box_w", 980)
    items = spec["items"]
    prepared = []
    for it in items:
        img = ImageOps.exif_transpose(Image.open(os.path.join(base, it["img"]))).convert("RGB")
        bx = crop_box(img, it, spec)
        aspect = (bx[2] - bx[0]) / (bx[3] - bx[1])
        lab = label_layer(it["label"], COLORS.get(it.get("kind", "then"), (255, 255, 255)), spec.get("label_size", 190))
        name = label_layer(it["name"], (255, 255, 255), spec.get("name_size", 84), 9) if it.get("name") else None
        prepared.append((img, bx, aspect, lab, name, it.get("zoom", spec.get("zoom", 1.12))))
        print(f"  {it['img']}: crop {[round(v) for v in bx]} aspect {aspect:.2f}", file=sys.stderr)
    n_frames = int(round(len(items) * shot * FPS))
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
    if music:
        cmd += ["-i", music, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    cy = spec.get("photo_cy", 960)
    for fi in range(n_frames):
        t = fi / FPS
        k = min(int(t / shot), len(items) - 1)
        u = (t - k * shot) / shot
        img, bx, aspect, lab, name, zend = prepared[k]
        s = 1 + (zend - 1) * ease(u)
        bw, bh = box_w * s, box_w / aspect * s
        bh0 = box_w / aspect
        frame = Image.new("RGB", (W, H), (0, 0, 0))
        x0, y0 = (W - bw) / 2, cy - bh / 2
        # draw only the visible part of the photo, sampled straight from the source (smooth sub-pixel zoom)
        vx0, vy0, vx1, vy1 = max(0, x0), max(0, y0), min(W, x0 + bw), min(H, y0 + bh)
        sx = (bx[2] - bx[0]) / bw; sy = (bx[3] - bx[1]) / bh
        src = (bx[0] + (vx0 - x0) * sx, bx[1] + (vy0 - y0) * sy, bx[0] + (vx1 - x0) * sx, bx[1] + (vy1 - y0) * sy)
        tile = img.resize((int(round(vx1 - vx0)), int(round(vy1 - vy0))), Image.BICUBIC, box=src)
        frame.paste(tile, (int(round(vx0)), int(round(vy0))))
        # labels stay put while the photo zooms (as in the references)
        ly = int(cy + bh0 / 2 - lab.height * spec.get("label_overlap", 0.62))
        frame.paste(lab, ((W - lab.width) // 2, ly), lab)
        if name is not None:
            ny = int(cy - bh0 / 2 - name.height + 26)
            frame.paste(name, ((W - name.width) // 2, max(150, ny)), name)
        p.stdin.write(frame.tobytes())
    p.stdin.close(); p.wait()
    return n_frames / FPS


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec"); ap.add_argument("out"); ap.add_argument("--music"); ap.add_argument("--base")
    a = ap.parse_args()
    spec = json.load(open(a.spec)); spec["_path"] = a.spec
    dur = render(spec, a.out, a.music, a.base)
    print(f"{a.out}: {dur:.2f}s, {len(spec['items'])} photos")


if __name__ == "__main__":
    main()
