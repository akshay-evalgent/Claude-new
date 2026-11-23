import numpy as np, cv2, sys
fr = np.load("frames_small.npy")
idx = [int(x) for x in sys.argv[2:]]
tiles = []
rng = np.random.default_rng(3)
for i in idx:
    z = np.load(f"det/{i:04d}.npz"); im = fr[i].copy()
    hsv = cv2.cvtColor(fr[i], cv2.COLOR_BGR2HSV)
    red = ((hsv[..., 0] < 6) | (hsv[..., 0] > 172)) & (hsv[..., 1] > 150) & (hsv[..., 2] > 70)
    for tid, box, mk in zip(z["ids"], z["boxes"], z["masks"]):
        c = np.array([int(tid) * 67 % 255, int(tid) * 141 % 255, int(tid) * 29 % 255])
        im[mk] = (im[mk] * 0.45 + c * 0.55).astype(np.uint8)
        ys, xs = np.where(mk)
        if len(xs):
            r = (red & mk).sum() / mk.sum()
            cv2.putText(im, f"{int(tid)} r{r:.2f}", (int(xs.mean()) - 30, int(ys.mean())), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.putText(im, f"f{i}", (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
    tiles.append(cv2.resize(im, (480, 270)))
while len(tiles) % 4: tiles.append(np.zeros_like(tiles[0]))
rows = [np.hstack(tiles[k:k + 4]) for k in range(0, len(tiles), 4)]
cv2.imwrite(sys.argv[1], np.vstack(rows))
