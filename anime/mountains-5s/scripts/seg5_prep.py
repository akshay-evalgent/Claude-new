"""Matte the main dancer (MODNet ONNX) for frames [first,last] and estimate camera motion from the background."""
import sys, os, json, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from matte_onnx import MODNet
M, src, out, first, last = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
os.makedirs(os.path.join(out, 'alpha'), exist_ok=True)
net = MODNet(os.path.join(M, 'modnet.onnx'))
prev_main = None; prev_a = None; prev_g = None
orb = cv2.ORB_create(3000)
cam = {first: [1, 0, 0, 0, 1, 0]}  # affine (2x3, row-major) mapping frame-`first` coords -> frame i coords
A_acc = np.eye(3)
xs, ys = [], []
for i in range(first, last + 1):
    rgb = cv2.imread(os.path.join(src, f'{i:05d}.png'))[..., ::-1].copy()
    a = net(rgb)
    n, lab, stats, cent = cv2.connectedComponentsWithStats((a > 0.3).astype(np.uint8), 8)
    if n > 1:
        if prev_main is None:
            h, w = a.shape
            score = [stats[k, cv2.CC_STAT_AREA] / (1 + abs(cent[k][0] - w / 2) / w * 4) if k else -1 for k in range(n)]
        else:
            score = [((lab == k) & prev_main).sum() if k else -1 for k in range(n)]
        main = lab == int(np.argmax(score))
        a = a * (cv2.dilate(main.astype(np.uint8), np.ones((21, 21), np.uint8)) > 0)
        prev_main = cv2.dilate(main.astype(np.uint8), np.ones((41, 41), np.uint8)) > 0
    # light temporal smoothing of the matte edge
    if prev_a is not None: a = 0.7 * a + 0.3 * prev_a
    prev_a = a
    cv2.imwrite(os.path.join(out, 'alpha', f'{i:05d}.png'), np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
    yy, xx = np.nonzero(a > 0.3)
    if len(xx): xs += [xx.min(), xx.max()]; ys += [yy.min(), yy.max()]
    # camera motion: ORB features on background only (dilated dancer masked out)
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    bgmask = (cv2.dilate((a > 0.05).astype(np.uint8), np.ones((41, 41), np.uint8)) == 0).astype(np.uint8) * 255
    if prev_g is not None:
        k0, d0 = orb.detectAndCompute(prev_g, prev_mask); k1, d1 = orb.detectAndCompute(g, bgmask)
        A = np.eye(3)
        if d0 is not None and d1 is not None:
            m = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True).match(d0, d1)
            if len(m) >= 12:
                p0 = np.float32([k0[x.queryIdx].pt for x in m]); p1 = np.float32([k1[x.trainIdx].pt for x in m])
                T, inl = cv2.estimateAffinePartial2D(p0, p1, method=cv2.RANSAC, ransacReprojThreshold=2.0)
                if T is not None: A[:2] = T
        A_acc = A @ A_acc
        cam[i] = A_acc[:2].ravel().tolist()
    prev_g, prev_mask = g, bgmask
json.dump({'cam': cam, 'bbox': [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]}, open(os.path.join(out, 'prep.json'), 'w'))
tx = [v[2] for v in cam.values()]; ty = [v[5] for v in cam.values()]; sc = [np.hypot(v[0], v[3]) for v in cam.values()]
print('union bbox', min(xs), min(ys), max(xs), max(ys))
print(f'camera tx {min(tx):.1f}..{max(tx):.1f}  ty {min(ty):.1f}..{max(ty):.1f}  scale {min(sc):.3f}..{max(sc):.3f}')
