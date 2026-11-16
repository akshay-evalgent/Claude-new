import sys, numpy as np, onnxruntime as ort
from PIL import Image
M = sys.argv[1]
so = ort.SessionOptions(); so.intra_op_num_threads = 2
s = ort.InferenceSession(M, so, providers=['CPUExecutionProvider'])
mean = np.array([0.485,0.456,0.406],np.float32); std = np.array([0.229,0.224,0.225],np.float32)
for inp, out in zip(sys.argv[2::2], sys.argv[3::2]):
    im = Image.open(inp).convert('RGB'); W,H = im.size
    sc = 518/min(W,H); w = max(14, int(round(W*sc/14))*14); h = max(14, int(round(H*sc/14))*14)
    a = (np.asarray(im.resize((w,h), Image.BICUBIC)).astype(np.float32)/255. - mean)/std
    d = s.run(None, {'pixel_values': a.transpose(2,0,1)[None]})[0][0]
    d = np.asarray(Image.fromarray(d.astype(np.float32), mode='F').resize((W,H), Image.BICUBIC))
    np.save(out, d.astype(np.float32))
    lo, hi = np.percentile(d, 1), np.percentile(d, 99)
    g = np.clip((d-lo)/(hi-lo+1e-6), 0, 1)
    Image.fromarray((g*255).astype(np.uint8)).save(out.replace('.npy','_gray.png'))
    print(inp, (W,H), d.min(), d.max())
