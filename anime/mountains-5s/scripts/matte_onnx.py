import sys, os, time, numpy as np, cv2, onnxruntime as ort
so = ort.SessionOptions(); so.intra_op_num_threads = 4
class BiRefNet:
    def __init__(self, p): self.s = ort.InferenceSession(p, so, providers=['CPUExecutionProvider'])
    def __call__(self, rgb):
        h, w = rgb.shape[:2]
        x = cv2.resize(rgb, (1024, 1024), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
        x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).astype(np.float32).transpose(2, 0, 1)[None]
        y = self.s.run(None, {'input_image': x})[0][0, 0]
        if y.min() < 0 or y.max() > 1: y = 1 / (1 + np.exp(-y))
        return cv2.resize(y, (w, h), interpolation=cv2.INTER_LINEAR)
class MODNet:
    def __init__(self, p): self.s = ort.InferenceSession(p, so, providers=['CPUExecutionProvider'])
    def __call__(self, rgb):
        h, w = rgb.shape[:2]; sc = 512 / min(h, w)
        H, W = int(round(h * sc / 32) * 32), int(round(w * sc / 32) * 32)
        x = (cv2.resize(rgb, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 127.5 - 1).transpose(2, 0, 1)[None]
        y = self.s.run(None, {'input': x})[0][0, 0]
        return cv2.resize(y, (w, h), interpolation=cv2.INTER_LINEAR)
if __name__ == '__main__':
    M, src = sys.argv[1], sys.argv[2]
    nets = {'birefnet': BiRefNet(os.path.join(M, 'birefnet_lite.onnx')), 'modnet': MODNet(os.path.join(M, 'modnet.onnx'))}
    rows = []
    for i in (150, 200, 245, 290):
        rgb = cv2.imread(os.path.join(src, f'{i:05d}.png'))[..., ::-1].copy()
        tiles = [rgb]
        for k, n in nets.items():
            t = time.time(); a = n(rgb); print(k, i, f'{time.time()-t:.2f}s', float(a.min()), float(a.max()))
            green = np.array([0, 200, 0], np.float32)
            tiles.append((rgb * a[..., None] + green * (1 - a[..., None])).astype(np.uint8))
        rows.append(np.hstack([cv2.resize(t, (240, 427)) for t in tiles]))
    cv2.imwrite(sys.argv[3], np.hstack(rows)[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 85])
