import sys, os, time, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from anime_lib import Stylizer
model, src, dst, wid, nw, last, threads = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7])
st = Stylizer(model, threads)
t0 = time.time(); done = 0
for i in range(wid, last + 1, nw):
    o = os.path.join(dst, f'{i:05d}.png')
    if os.path.exists(o): continue
    rgb = cv2.cvtColor(cv2.imread(os.path.join(src, f'{i:05d}.png')), cv2.COLOR_BGR2RGB)
    y = st(rgb)
    cv2.imwrite(o + '.tmp.png', cv2.cvtColor(y, cv2.COLOR_RGB2BGR)); os.replace(o + '.tmp.png', o)
    done += 1
    if done % 25 == 0: print(f'w{wid} {done} frames {(time.time()-t0)/done:.2f}s/f', flush=True)
print(f'w{wid} finished {done}', flush=True)
