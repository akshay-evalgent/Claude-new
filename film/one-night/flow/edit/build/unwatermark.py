"""Remove Flow's semi-transparent two-sparkle watermark by inverting its blend on every frame.
The mark is white laid over the picture at a fixed per-pixel opacity a: seen = a*255 + (1 - a)*picture.
a is measured once, from A3 where both sparkles sit over dark knitwear, and the same template is used
for every clip: picture = (seen - 255*a)/(1 - a). A thin outline left by compression is then inpainted.
Writes src_clean/<clip>.mp4 (near lossless) with the original audio."""
import subprocess, pathlib, json
import numpy as np, cv2
from scipy import ndimage
root = pathlib.Path(__file__).resolve().parent.parent
X0, Y0, BW, BH = 560, 1120, 110, 110
W, H = 720, 1280
def frames(c):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(root/'src'/f'{c}.mp4'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
# 1. the opacity template, from A3
box = frames('A3')[:, Y0:Y0+BH, X0:X0+BW].astype(np.float32).mean(-1)
mn = np.percentile(box, 5, axis=0)                                  # nearly the darkest, but robust to noise
bg = ndimage.grey_opening(mn, size=(31, 31))
bg = ndimage.gaussian_filter(np.minimum(bg, ndimage.median_filter(mn, size=61, mode='nearest')), 2)
a = np.clip((mn - bg)/(255.0 - bg), 0, 0.9)
shape = ndimage.binary_opening(a > 0.06, iterations=1)
shape = ndimage.binary_fill_holes(ndimage.binary_closing(shape, iterations=2))
a = np.where(ndimage.binary_dilation(shape, iterations=1), a, 0.0)
a = ndimage.gaussian_filter(a, 0.5)
np.save(root/'build/watermark_alpha.npy', a)
edge = (ndimage.binary_dilation(shape, iterations=2) & ~ndimage.binary_erosion(shape, iterations=2)).astype(np.uint8)*255
report = {'max_opacity': round(float(a.max()), 3), 'mark_pixels': int(shape.sum())}
print('template', report, flush=True)
# 2. split the template into its two sparkles; for each clip, find where each one sits and how strong it is,
#    by searching for the offset and strength that leave the corrected corner with the least edge energy
lab, n = ndimage.label(shape)
comps = sorted([lab == k for k in range(1, n + 1)], key=lambda m: -m.sum())[:2]
alphas = [np.where(ndimage.binary_dilation(m, iterations=1), a, 0.0) for m in comps]
def shift(img, dx, dy): return ndimage.shift(img, (dy, dx), order=1, mode='constant')
(root/'src_clean').mkdir(exist_ok=True)
fits = {}
for c in ['A1', 'A2', 'A3', 'B1', 'B2', 'B3']:
    fr = frames(c)
    boxes = fr[:, Y0:Y0+BH, X0:X0+BW].astype(np.float32).mean(-1)
    cmn = np.percentile(boxes, 5, axis=0)
    cbg = ndimage.gaussian_filter(np.minimum(ndimage.grey_opening(cmn, size=(31, 31)), ndimage.median_filter(cmn, size=61, mode='nearest')), 2)
    bump = np.clip(cmn - cbg, 0, None)                          # this clip's own faint mark
    samp = boxes[::max(1, len(boxes)//24)]
    total = np.zeros_like(a); fit = []
    for al in alphas:
        # where: the offset whose sparkle shape best matches this clip's bump
        best = None
        found = ndimage.binary_dilation(total > 0.03, iterations=3)
        bsearch = np.where(found, 0.0, bump)                     # ignore the sparkle already found
        for dy in range(-16, 17):
            for dx in range(-18, 17):
                als = shift(al, dx, dy); m = (als > 0.05) & ~found
                if m.sum() < 50: continue
                ring = ndimage.binary_dilation(m, iterations=4) & ~ndimage.binary_dilation(m, iterations=1)
                score = bsearch[m].mean() - bsearch[ring & ~found].mean() if (ring & ~found).any() else -1
                if best is None or score > best[0]: best = (score, dx, dy)
        score, dx, dy = best
        als = shift(al, dx, dy); m = als > 0.05
        present = score > 4.0
        # how strong: the strength that makes the corrected inside meet the outside without a step
        g_best = 0.0
        if present:
            inner = m & ~ndimage.binary_erosion(m, iterations=2)
            outer = ndimage.binary_dilation(m, iterations=3) & ~ndimage.binary_dilation(m, iterations=1)
            errs = []
            G = np.linspace(0.5, 1.4, 37)
            for g in G:
                ak = np.clip(total + g*als, 0, 0.9)
                cl = (samp - 255.0*ak)/(1.0 - ak)
                errs.append(np.abs(cl[:, inner].mean(1) - cl[:, outer].mean(1)).mean())
            g_best = float(G[int(np.argmin(errs))])
            total = np.clip(total + g_best*als, 0, 0.9)
        fit.append({'dx': int(dx), 'dy': int(dy), 'match': round(float(score), 1), 'strength': round(g_best, 2)})
    fits[c] = fit; print(c, fit, flush=True)
    A = total[:, :, None]
    sh_ = total > 0.04
    edge = (ndimage.binary_dilation(sh_, iterations=3) & ~ndimage.binary_erosion(sh_, iterations=2)).astype(np.uint8)*255
    out = fr.copy()
    for i in range(len(fr)):
        b = fr[i, Y0:Y0+BH, X0:X0+BW].astype(np.float32)
        cl = np.clip((b - 255.0*A)/(1.0 - A), 0, 255).astype(np.uint8)
        out[i, Y0:Y0+BH, X0:X0+BW] = cv2.inpaint(np.ascontiguousarray(cl), edge, 3, cv2.INPAINT_TELEA) if edge.any() else cl
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                          '-i', str(root/'src'/f'{c}.mp4'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10',
                          '-pix_fmt', 'yuv420p', '-c:a', 'copy', str(root/'src_clean'/f'{c}.mp4')], stdin=subprocess.PIPE)
    p.communicate(out.tobytes())
report['fits'] = fits
json.dump(report, open(root/'build/unwatermark.json', 'w'), indent=1)
