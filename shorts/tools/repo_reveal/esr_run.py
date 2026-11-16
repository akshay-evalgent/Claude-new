import sys, numpy as np, onnxruntime as ort
from PIL import Image
M = sys.argv[1]; inp = sys.argv[2]; out = sys.argv[3]
so = ort.SessionOptions(); so.intra_op_num_threads = 4
s = ort.InferenceSession(M, so, providers=['CPUExecutionProvider'])
im = Image.open(inp)
alpha = None
if im.mode in ('RGBA','LA') or 'transparency' in im.info:
    im = im.convert('RGBA'); alpha = im.split()[-1]; im = im.convert('RGB')
else:
    im = im.convert('RGB')
a = np.asarray(im).astype(np.float32)/255.
H, W, _ = a.shape
T, O = 128, 16
step = T - 2*O
pad = np.pad(a, ((O, O+T), (O, O+T), (0,0)), mode='reflect')
outa = np.zeros((H*4, W*4, 3), np.float32)
n=0
for y in range(0, H, step):
    for x in range(0, W, step):
        tile = pad[y:y+T, x:x+T]
        r = s.run(None, {'image': tile.transpose(2,0,1)[None]})[0][0].transpose(1,2,0)
        core = r[O*4:(O+step)*4, O*4:(O+step)*4]
        hh = min(step, H-y)*4; ww = min(step, W-x)*4
        outa[y*4:y*4+hh, x*4:x*4+ww] = core[:hh, :ww]
        n+=1
o = Image.fromarray((np.clip(outa,0,1)*255+0.5).astype(np.uint8))
if alpha is not None:
    o.putalpha(alpha.resize(o.size, Image.LANCZOS))
o.save(out)
print(inp, (W,H), '->', o.size, 'tiles', n)
