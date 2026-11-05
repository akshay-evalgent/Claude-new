"""Build the layered still: upscaled anime landscape + matted, mirrored girl placed on the right riverbank."""
import sys, os, numpy as np, cv2, onnxruntime as ort
sys.path.insert(0, os.path.dirname(__file__))
from matte_onnx import BiRefNet
S = sys.argv[1]; R = os.path.join(S, 'river')
cx, base_y, girl_h = int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])   # girl centre x, bottom y, height (px in 1080x1920)
W, H = 1080, 1920
so = ort.SessionOptions(); so.intra_op_num_threads = 4
up = ort.InferenceSession(os.path.join(S, 'upscale', 'animevideov3.onnx'), so, providers=['CPUExecutionProvider'])
def upscale(rgb):
    y = up.run(None, {up.get_inputs()[0].name: (rgb.astype(np.float32) / 255).transpose(2, 0, 1)[None]})[0][0].transpose(1, 2, 0)
    return np.clip(y * 255 + 0.5, 0, 255).astype(np.uint8)
if not os.path.exists(os.path.join(R, 'bg.png')):
    land = cv2.imread(os.path.join(R, 'landscape.png'))[..., ::-1]
    cv2.imwrite(os.path.join(R, 'bg.png'), cv2.resize(upscale(land), (W, H), interpolation=cv2.INTER_AREA)[..., ::-1])
bg = cv2.imread(os.path.join(R, 'bg.png'))[..., ::-1]
if not os.path.exists(os.path.join(R, 'girl_up.png')):
    g = cv2.imread(os.path.join(R, 'sit', 'sit_505.png'))[..., ::-1].copy()
    a = BiRefNet(os.path.join(S, 'matte_models', 'birefnet_lite.onnx'))(g)
    gu = upscale(g); au = cv2.resize(a, (gu.shape[1], gu.shape[0]), interpolation=cv2.INTER_CUBIC)
    rgba = np.dstack([gu, np.clip(au * 255 + 0.5, 0, 255).astype(np.uint8)])[:, ::-1]   # mirror: she faces left, toward the river
    cv2.imwrite(os.path.join(R, 'girl_up.png'), cv2.cvtColor(np.ascontiguousarray(rgba), cv2.COLOR_RGBA2BGRA))
gl = cv2.cvtColor(cv2.imread(os.path.join(R, 'girl_up.png'), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA)
# crop to the figure, scale to the requested height, place on a full-frame transparent canvas
ys, xs = np.nonzero(gl[..., 3] > 20); gl = gl[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
sc = girl_h / gl.shape[0]; gl = cv2.resize(gl, (int(gl.shape[1] * sc), girl_h), interpolation=cv2.INTER_AREA)
canvas = np.zeros((H, W, 4), np.uint8)
x0 = cx - gl.shape[1] // 2; y0 = base_y - girl_h
canvas[y0:y0 + girl_h, x0:x0 + gl.shape[1]] = gl
cv2.imwrite(os.path.join(R, 'girl_layer.png'), cv2.cvtColor(canvas, cv2.COLOR_RGBA2BGRA))
a = canvas[..., 3:].astype(np.float32) / 255
comp = (canvas[..., :3] * a + bg * (1 - a)).astype(np.uint8)
cv2.imwrite(os.path.join(R, 'scene_preview.jpg'), cv2.resize(comp, (540, 960), interpolation=cv2.INTER_AREA)[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 90])
print('placed', x0, y0, gl.shape)
