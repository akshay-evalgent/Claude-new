"""Build the mountain plate per frame (follows the source camera), add a contact shadow, and composite the matted dancer."""
import sys, os, json, numpy as np, cv2, onnxruntime as ort
S = sys.argv[1]; first, last = int(sys.argv[2]), int(sys.argv[3]); plate_path = sys.argv[4]
seg = os.path.join(S, 'seg5'); os.makedirs(os.path.join(seg, 'plate'), exist_ok=True); os.makedirs(os.path.join(seg, 'comp'), exist_ok=True); os.makedirs(os.path.join(seg, 'alpha_solid'), exist_ok=True)
prep = json.load(open(os.path.join(seg, 'prep.json')))
W, H, OV = 720, 1280, 1.14
# upscale the plate once with the anime upscaler, then fit to an overscanned canvas
so = ort.SessionOptions(); so.intra_op_num_threads = 4
up = ort.InferenceSession(os.path.join(S, 'upscale', 'animevideov3.onnx'), so, providers=['CPUExecutionProvider'])
p = cv2.imread(plate_path)[..., ::-1]
y = up.run(None, {up.get_inputs()[0].name: (p.astype(np.float32) / 255).transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
P = cv2.resize(np.clip(y * 255 + 0.5, 0, 255).astype(np.uint8), (int(W * OV), int(H * OV)), interpolation=cv2.INTER_AREA)
ox, oy = (P.shape[1] - W) / 2, (P.shape[0] - H) / 2
for i in range(first, last + 1):
    A = np.eye(3); A[:2] = np.array(prep['cam'][str(i)]).reshape(2, 3)
    M = np.linalg.inv(A)[:2].copy(); M[0, 2] += ox; M[1, 2] += oy
    plate = cv2.warpAffine(P, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT)
    a = cv2.imread(os.path.join(seg, 'alpha', f'{i:05d}.png'), 0).astype(np.float32) / 255
    # firm up the matte (motion blur makes MODNet go semi-transparent on fast limbs) and fill enclosed holes
    t = np.clip((a - 0.1) / 0.45, 0, 1); a = t * t * (3 - 2 * t)
    bp = os.path.join(seg, 'alpha_bir', f'{i:05d}.png')
    if os.path.exists(bp):  # union with BiRefNet, limited to the main dancer's neighbourhood
        ab = cv2.imread(bp, 0).astype(np.float32) / 255
        near = cv2.dilate((a > 0.3).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0
        a = np.maximum(a, ab * near)
    a = cv2.GaussianBlur(a, (0, 0), 0.8)
    cv2.imwrite(os.path.join(seg, 'alpha_solid', f'{i:05d}.png'), np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
    # soft contact shadow under the feet
    ys, xs = np.nonzero(a > 0.5)
    if len(ys):
        yb = ys.max(); band = xs[ys > yb - 60]
        sh = np.zeros((H, W), np.float32)
        cv2.ellipse(sh, (int(band.mean()), int(min(yb, H - 4))), (int((band.max() - band.min()) * 0.7 + 25), 16), 0, 0, 360, 1.0, -1)
        sh = cv2.GaussianBlur(sh, (0, 0), 10)
        plate = (plate.astype(np.float32) * (1 - 0.38 * sh[..., None])).astype(np.uint8)
    cv2.imwrite(os.path.join(seg, 'plate', f'{i:05d}.png'), plate[..., ::-1])
    src = cv2.imread(os.path.join(S, 'frames', 'src', f'{i:05d}.png'))[..., ::-1].astype(np.float32)
    comp = a[..., None] * src + (1 - a[..., None]) * plate.astype(np.float32)
    cv2.imwrite(os.path.join(seg, 'comp', f'{i:05d}.png'), np.clip(comp + 0.5, 0, 255).astype(np.uint8)[..., ::-1])
print('comp done')
