"""Turn any painting into a pixel-art scene: palette-limited grid + matching depth map.
usage: python3 pixelize_scene.py image.webp [more images...]   ->  <name>-px.png and <name>-pxdepth.png
grid is 288x512 (the video shows 270x480 of it, the rest is room for a slow pan)."""
import sys, numpy as np, cv2
from PIL import Image
from transformers import pipeline
GW, GH, COLORS = 288, 512, int(__import__("os").environ.get("COLORS", 32))
depth = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf")
B = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - .47
for p in sys.argv[1:]:
    src = Image.open(p).convert("RGB"); base = p.rsplit(".", 1)[0]
    im = np.array(src)
    # crop to 9:16 and shrink to the grid
    h, w = im.shape[:2]; tw = int(h * GW / GH)
    if tw < w: x0 = (w - tw) // 2; im = im[:, x0:x0 + tw]
    small = cv2.resize(cv2.bilateralFilter(im, 9, 50, 7), (GW, GH), interpolation=cv2.INTER_AREA).astype(np.float32)
    hsv = cv2.cvtColor(small.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.18, 0, 255); hsv[..., 2] = np.clip((hsv[..., 2] / 255) ** 1.05 * 1.06 * 255, 0, 255)
    small = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5)
    _, _, cen = cv2.kmeans(small.reshape(-1, 3), COLORS, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    d = small + np.tile(B, (GH // 4, GW // 4))[..., None] * 8
    idx = ((d[:, :, None, :] - cen[None, None]) ** 2).sum(3).argmin(2)
    idx = cv2.medianBlur(idx.astype(np.uint8), 3)            # remove stray single pixels for a cleaner look
    Image.fromarray(cen[idx].clip(0, 255).astype(np.uint8)).save(base + "-px.png")
    dm = np.array(depth(Image.fromarray(im))["depth"].convert("L").resize((GW, GH), Image.BILINEAR))
    Image.fromarray(dm).save(base + "-pxdepth.png"); print("wrote", base + "-px.png")
