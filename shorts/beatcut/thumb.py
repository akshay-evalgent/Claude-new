"""Thumbnail for the emotional format: subject on top, hero below, neon line on the seam, mending heart.

    python3 -m beatcut.thumb episodes/<name>       # reads story.json "thumbnail", writes out/thumbnail.jpg (1080x1920)

    "thumbnail": {"top":    {"clip": "messi", "t": 1.6, "focus": [0.72, 0.45], "zoom": 1.1},
                  "bottom": {"clip": "messi", "t": 1.6, "focus": [0.31, 0.40], "zoom": 1.15},
                  "lines": ["HIS SHIRT WAS A", "“^yPLASTIC ^yBAG”"], "heart_at": [0.82, 0.62]}
"""
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

from .render import Look
from .story import NeonCaption, blend, emoji_sprite, HeartBurst


def grab(path, t):
    w, h = (int(v) for v in subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0",
         str(path)]).decode().strip().split(","))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "bgr24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3)


def panel(frame, W, H, focus, zoom):
    sh, sw = frame.shape[:2]
    s = max(W / sw, H / sh) * zoom
    cx = min(max(focus[0] * sw, W / (2 * s)), sw - W / (2 * s))
    cy = min(max(focus[1] * sh, H / (2 * s)), sh - H / (2 * s))
    M = np.array([[s, 0, W / 2 - s * cx], [0, s, H / 2 - s * cy]], np.float32)
    img = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
    if s > 2.5:
        img = cv2.addWeighted(img, 1.6, cv2.GaussianBlur(img, (0, 0), 2.5), -0.6, 0)
    return img


def main(ep_dir):
    ep = Path(ep_dir)
    spec = json.loads((ep / "story.json").read_text())
    th = spec["thumbnail"]
    W, H = 1080, 1920
    if th.get("layout") == "single":
        return single(ep, th, W, H)
    half = H // 2
    out = np.zeros((H, W, 3), np.uint8)
    for key, y0 in (("top", 0), ("bottom", half)):
        p = th[key]
        fr = grab(ep / "clips" / f"{p['clip']}.mp4", p["t"])
        img = panel(fr, W, half, p.get("focus", [0.5, 0.5]), p.get("zoom", 1.0))
        if p.get("bw"):
            img = cv2.cvtColor(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.COLOR_GRAY2BGR)
        out[y0:y0 + half] = img
    out = Look(W, H).apply(out, 0, contrast=1.1, sat=1.25, grain=1.5)
    # dark band on the seam so the words read
    yy = np.arange(H, dtype=np.float32)[:, None, None]
    band = np.exp(-((yy - half) / 230) ** 2) * 0.72
    out = (out.astype(np.float32) * (1 - band)).astype(np.uint8)
    cap = NeonCaption({"t0": 0, "t1": 1, "cps": 0, "lines": th["lines"], "size": th.get("size", 0.11)}, W, H)
    blend(out, cap.layer(len(cap.chars)), W / 2, half)
    hx, hy = th.get("heart_at", [0.82, 0.62])
    spr = emoji_sprite(HeartBurst.SEQ, int(0.26 * W))
    blend(out, cv2.GaussianBlur(spr, (0, 0), 14), hx * W, hy * H, 0.6, add=True)
    blend(out, spr, hx * W, hy * H)
    (ep / "out").mkdir(exist_ok=True)
    cv2.imwrite(str(ep / "out" / "thumbnail.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"wrote {ep / 'out' / 'thumbnail.jpg'}")


def single(ep, th, W, H):
    """One full-height frame, the series hook in big letters, a red circle on the giveaway detail."""
    from .story import Circle
    p = th["frame"]
    fr = grab(ep / "clips" / f"{p['clip']}.mp4", p["t"])
    out = panel(fr, W, H, p.get("focus", [0.5, 0.5]), p.get("zoom", 1.0))
    out = Look(W, H).apply(out, 0, contrast=1.1, sat=1.25, grain=1.5)
    y = th.get("y", 0.72)
    yy = np.arange(H, dtype=np.float32)[:, None, None]
    band = np.exp(-((yy - y * H) / 260) ** 2) * 0.6
    out = (out.astype(np.float32) * (1 - band)).astype(np.uint8)
    if th.get("circle"):
        c = dict(th["circle"], t0=0, t1=1, draw=1e-3, width=0.016)
        Circle(c, W, H).draw(out, 0.5)
    cap = NeonCaption({"t0": 0, "t1": 1, "cps": 0, "lines": th["lines"], "size": th.get("size", 0.13)}, W, H)
    blend(out, cap.layer(len(cap.chars)), W / 2, y * H)
    (ep / "out").mkdir(exist_ok=True)
    cv2.imwrite(str(ep / "out" / "thumbnail.jpg"), out, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"wrote {ep / 'out' / 'thumbnail.jpg'}")


if __name__ == "__main__":
    main(sys.argv[1])
