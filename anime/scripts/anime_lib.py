import numpy as np, cv2, onnxruntime as ort

class Stylizer:
    def __init__(self, model_path, threads=4):
        so = ort.SessionOptions(); so.intra_op_num_threads = threads
        so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.s = ort.InferenceSession(model_path, so, providers=['CPUExecutionProvider'])
        self.inp = self.s.get_inputs()[0].name

    def __call__(self, rgb):
        h, w = rgb.shape[:2]
        ph, pw = (-h) % 32, (-w) % 32
        x = cv2.copyMakeBorder(rgb, ph // 2, ph - ph // 2, pw // 2, pw - pw // 2, cv2.BORDER_REFLECT_101)
        x = (x.astype(np.float32) / 127.5 - 1.0)[None]
        y = self.s.run(None, {self.inp: x})[0][0]
        y = ((np.clip(y, -1, 1) + 1) * 127.5).astype(np.uint8)
        return y[ph // 2: ph // 2 + h, pw // 2: pw // 2 + w]

def to_lab(rgb):  # float32 L in [0,100], a,b approx [-127,127]
    return cv2.cvtColor(rgb.astype(np.float32) / 255.0, cv2.COLOR_RGB2LAB)

def from_lab(lab):
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB) * 255.0, 0, 255).astype(np.uint8)
