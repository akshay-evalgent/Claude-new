"""Final composite: anime-drawn dancer (held on twos) over the moving anime mountain plate. Streams raw RGB to stdout."""
import sys, os, numpy as np, cv2, onnxruntime as ort
S = sys.argv[1]; first, last, step = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
x0, y0, x1, y1 = [int(v) for v in sys.argv[5].split(',')]
seg = os.path.join(S, 'seg5'); W, H = 720, 1280
so = ort.SessionOptions(); so.intra_op_num_threads = 4
up = ort.InferenceSession(os.path.join(S, 'upscale', 'animevideov3.onnx'), so, providers=['CPUExecutionProvider'])
cache = {}
def character(d):
    if d in cache: return cache[d]
    dr = cv2.imread(os.path.join(seg, 'draw', f'{d:05d}.png'))[..., ::-1]
    y = up.run(None, {up.get_inputs()[0].name: (dr.astype(np.float32) / 255).transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
    y = cv2.resize(np.clip(y * 255 + 0.5, 0, 255).astype(np.uint8), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((H, W, 3), np.uint8); canvas[y0:y1, x0:x1] = y
    a = (cv2.imread(os.path.join(seg, 'alpha_solid', f'{d:05d}.png'), 0) > 127).astype(np.uint8)
    # take only the inside of the dancer from the drawing (no drawn background can leak in) ...
    m = cv2.erode(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # ... and draw our own anime ink line along her silhouette
    ink = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) - m
    m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.7)[..., None]
    ink = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 0.7)[..., None] * 0.9
    cache.clear(); cache[d] = (canvas.astype(np.float32), m, ink); return cache[d]
out = sys.stdout.buffer
for j in range(first, last + 1):
    d = first + ((j - first) // step) * step
    ch, m, ink = character(d)
    plate = cv2.imread(os.path.join(seg, 'plate', f'{j:05d}.png'))[..., ::-1].astype(np.float32)
    fr = plate * (1 - ink) + np.array([40, 34, 52], np.float32) * ink      # dark plum ink line
    fr = np.clip(m * ch + (1 - m) * fr + 0.5, 0, 255).astype(np.uint8)
    out.write(np.ascontiguousarray(fr).tobytes())
