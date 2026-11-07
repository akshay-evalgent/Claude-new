"""Stand-in character art for the first cut, until the real host and rival are drawn.

host.png  : concept host A cut out of its dark background (board/gen/host_a_front.jpg)
rival.png : the anatomy skin figure, widened 1.35x, tinted flat grey, shorts greyed -> a bald, bulky "big guy"
"""
import os, sys
import numpy as np
import cv2

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
OUT = os.path.join(ROOT, "episodes", "ep01-skinny-to-bulky", "video", "art")
os.makedirs(OUT, exist_ok=True)

# host: flood-fill the dark background from the borders
img = cv2.imread(os.path.join(ROOT, "board", "gen", "host_a_front.jpg"))
h, w = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
bg = (gray < 60).astype(np.uint8)
n, lab = cv2.connectedComponents(bg)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
mask = np.isin(lab, list(border))
alpha = (~mask).astype(np.float32)
alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
alpha = cv2.GaussianBlur(alpha, (0, 0), 1.0)
ys, xs = np.nonzero(alpha > 0.5)
y0, y1, x0, x1 = max(ys.min() - 10, 0), min(ys.max() + 10, h), max(xs.min() - 10, 0), min(xs.max() + 10, w)
rgba = np.dstack([img, (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
cv2.imwrite(os.path.join(OUT, "host.png"), rgba)

# rival: widened, grey, bald big guy from the skin layer
sk = cv2.imread(os.path.join(ROOT, "assets", "anatomy", "body", "skin-front.png"), cv2.IMREAD_UNCHANGED)
ys, xs = np.nonzero(sk[..., 3] > 20)
sk = sk[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
b, g, r, a = [sk[..., i].astype(np.float32) for i in range(4)]
teal = (g > 150) & (b > 120) & (r < 120)  # the shorts
lum = 0.3 * r + 0.59 * g + 0.11 * b
grey = np.clip(lum * 0.62 + 18, 0, 255)
grey[teal] = 70  # dark grey shorts
out = np.dstack([grey, grey, grey, a]).astype(np.uint8)
hh, ww = out.shape[:2]
out = cv2.resize(out, (int(ww * 1.38), hh), interpolation=cv2.INTER_AREA)
cv2.imwrite(os.path.join(OUT, "rival.png"), out)
print("host", rgba.shape, "rival", out.shape)

# skinny stand-in for Rohan until Flow art exists: narrow everything below the neck, keep the head
host = cv2.imread(os.path.join(OUT, "host.png"), cv2.IMREAD_UNCHANGED)
hh, ww = host.shape[:2]
neck = int(hh * 0.205)
head, body = host[:neck], host[neck:]
body = cv2.resize(body, (int(ww * 0.74), body.shape[0]), interpolation=cv2.INTER_AREA)
pad = (ww - body.shape[1]) // 2
body = cv2.copyMakeBorder(body, 0, 0, pad, ww - body.shape[1] - pad, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
cv2.imwrite(os.path.join(OUT, "skinny.png"), np.vstack([head, body]))
print("skinny", host.shape)
