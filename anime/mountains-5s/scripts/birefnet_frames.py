import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from matte_onnx import BiRefNet
M, src, out, first, last, step = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
os.makedirs(out, exist_ok=True); net = BiRefNet(os.path.join(M, 'birefnet_lite.onnx'))
for i in range(first, last + 1, step):
    o = os.path.join(out, f'{i:05d}.png')
    if os.path.exists(o): continue
    a = net(cv2.imread(os.path.join(src, f'{i:05d}.png'))[..., ::-1].copy())
    cv2.imwrite(o, np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
print('birefnet done')
