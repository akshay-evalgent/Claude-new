"""Turn a photo into clean pixel-art layers for animation.
usage: python3 pixelate.py source.webp outdir [man_center_x]
writes: sky.png (wide, palette-limited, stars removed), fg.png (crisp silhouette), stars.json (star positions to redraw and twinkle)"""
import sys, json, numpy as np, cv2
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert("RGB")); H, W = im.shape[:2]
GH, GW = 480, 270; sc = GH / H
cxm = float(sys.argv[3]) if len(sys.argv) > 3 else W / 2
lum = im.astype(np.float32).mean(2)
# foreground = dark areas connected to the bottom edge: near (ground, person) and far (hazy mountains)
def bottom_connected(th):
    d = (cv2.GaussianBlur(lum, (0, 0), 1.2) < th).astype(np.uint8)
    n, lab = cv2.connectedComponents(d); keep = np.unique(lab[H - 2, :]); keep = keep[keep > 0]
    return cv2.morphologyEx(np.isin(lab, keep).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
near = bottom_connected(22); fg = bottom_connected(46); fg[: int(H * .6)] = near[: int(H * .6)]
# sky without the foreground and without stars
sky = cv2.inpaint(im, cv2.dilate(fg, np.ones((9, 9), np.uint8)), 7, cv2.INPAINT_TELEA)
smooth = cv2.medianBlur(sky, 5); smooth = cv2.bilateralFilter(smooth, 7, 40, 5)
# stars = bright points above the smooth sky
diff = sky.astype(np.float32).max(2) - smooth.astype(np.float32).max(2); diff[fg > 0] = 0
peak = (diff == cv2.dilate(diff, np.ones((3, 3), np.float32))) & (diff > 26)
ys, xs = np.nonzero(peak); order = np.argsort(-diff[ys, xs])[:2600]
stars = [[round(float(xs[i] * sc), 1), round(float(ys[i] * sc), 1), round(float(min(1, diff[ys[i], xs[i]] / 150)), 2), [int(v) for v in sky[ys[i], xs[i]]]] for i in order]
# pixel grid + limited palette with ordered dithering
small = cv2.resize(smooth, (round(W * sc), GH), interpolation=cv2.INTER_AREA).astype(np.float32)
hsv = cv2.cvtColor(np.clip(small, 0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
hsv[..., 1] = np.clip(hsv[..., 1] * 1.55 + 8, 0, 255)                 # richer colour
v = hsv[..., 2] / 255; hsv[..., 2] = np.clip((v ** 1.0) * 1.2 - .06, 0, 1) * 255   # deeper darks, brighter core
small = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
# limited palette (k-means) with gentle ordered dithering
crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5)
_, _, cen = cv2.kmeans(small.reshape(-1, 3), 28, None, crit, 4, cv2.KMEANS_PP_CENTERS)
b = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16 - .47
d = small + np.tile(b, (GH // 4 + 1, small.shape[1] // 4 + 1))[:GH, :small.shape[1], None] * 9
idx = ((d[:, :, None, :] - cen[None, None]) ** 2).sum(3).argmin(2)
pal = Image.fromarray(cen[idx].clip(0, 255).astype(np.uint8))
pal.save(f"{out}/sky.png")
x0 = int(round(cxm - (GW / sc) / 2)); cw = int(round(GW / sc))
grid = lambda m: cv2.resize(m[:, x0:x0 + cw].astype(np.float32), (GW, GH), interpolation=cv2.INTER_AREA) > .5
mf, mn = grid(fg), grid(near)
rgba = np.zeros((GH, GW, 4), np.uint8)
rgba[mf] = (20, 26, 44, 255); rgba[mf & ~np.roll(mf, 1, 0)] = (44, 50, 72, 255)     # far mountains, hazy blue
rgba[mn] = (5, 6, 12, 255); rgba[mn & ~np.roll(mn, 1, 0)] = (24, 26, 42, 255)       # person and ground
Image.fromarray(rgba).save(f"{out}/fg.png")
json.dump({"stars": stars, "skyX": round(x0 * sc), "skyW": pal.size[0]}, open(f"{out}/stars.json", "w"))
print("sky", pal.size, "stars", len(stars), "skyX", round(x0 * sc))
