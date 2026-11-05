"""Animate the layered anime still: flowing river, swaying far trees, rippling grass, drifting clouds,
wind in the girl's hair, blowing leaves, slow push-in. Streams raw RGB frames to stdout (or writes debug images)."""
import sys, os, math, argparse, numpy as np, cv2
ap = argparse.ArgumentParser()
ap.add_argument('--dir'); ap.add_argument('--seconds', type=float, default=10); ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--debug', default='')
a = ap.parse_args()
R = a.dir; W, H = 1080, 1920
bg = cv2.imread(os.path.join(R, 'bg.png'))[..., ::-1].astype(np.float32)
girl = cv2.cvtColor(cv2.imread(os.path.join(R, 'girl_layer.png'), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA).astype(np.float32)
gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
def feather(m, s): return cv2.GaussianBlur(m.astype(np.float32), (0, 0), s)
def smooth1d(v, k): return cv2.GaussianBlur(v.astype(np.float32).reshape(1, -1), (0, 0), k).ravel()
hsv = cv2.cvtColor(bg.astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
Hh, Ss, Vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
Y = gy

# ---------------- masks on the landscape ----------------
cyan = (Hh > 78) & (Hh < 106) & (Ss > 60) & (Vv > 110)
foam = (Ss < 70) & (Vv > 200)
river = ((cyan | foam) & (Y > 1090)).astype(np.uint8)
river = cv2.morphologyEx(river, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(river, 8)
river = (lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))).astype(np.uint8)
river = cv2.morphologyEx(river, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
# mountain skyline traced along the ridge (x, y in 1080x1920); clouds live above it
ridge = np.array([(0, 540), (60, 520), (130, 505), (200, 530), (290, 600), (330, 520), (380, 420), (430, 330), (470, 280), (500, 262),
                  (540, 300), (590, 350), (650, 420), (700, 470), (760, 505), (820, 560), (900, 570), (980, 560), (1040, 580), (1080, 590)], np.float32)
skyline = np.interp(np.arange(W), ridge[:, 0], ridge[:, 1]).astype(np.float32)
trees = ((((Hh > 33) & (Hh < 80) & (Ss > 100) & (Vv < 200)) | ((Hh >= 80) & (Hh < 112) & (Ss > 180) & (Vv < 135)))
         & (Y > skyline[None, :] + 40) & (Y > 600) & (Y < 1110)).astype(np.uint8)
trees = cv2.morphologyEx(trees, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
grass = ((Hh > 25) & (Hh < 75) & (Ss > 70) & (Vv > 120) & (Y > 1000)).astype(np.uint8) * (1 - river)
# skyline: per column, first row from the top that is neither blue sky nor white cloud
sky = (Y < (skyline[None, :] - 30)).astype(np.float32)
m_sky = feather(sky, 6); m_tree = feather(trees, 2.0); m_grass = feather(grass, 3.0); m_river = feather(river, 2.0)

# ---------------- river flow field ----------------
rows = np.arange(H); xc = np.full(H, np.nan)
for y in range(1090, H):
    xs = np.nonzero(river[y])[0]
    if len(xs) > 10: xc[y] = xs.mean()
valid = ~np.isnan(xc); xc = np.interp(rows, rows[valid], xc[valid]); xc = smooth1d(xc, 25)
dxdy = np.gradient(xc)                                  # centreline slope; flow goes downstream (+y, towards viewer)
tx, ty = dxdy / np.sqrt(1 + dxdy ** 2), 1 / np.sqrt(1 + dxdy ** 2)
y_top = rows[valid].min()
speed = 0.5 + 3.6 * np.clip((rows - y_top) / (H - y_top), 0, 1) ** 1.4   # px/frame, faster near the viewer
FX = np.repeat((tx * speed)[:, None], W, 1).astype(np.float32); FY = np.repeat((ty * speed)[:, None], W, 1).astype(np.float32)
# river texture that continues past the banks, so upstream samples near the edge stay "water"
band = cv2.dilate(river, np.ones((1, 1), np.uint8))
outside = ((cv2.dilate(river, np.ones((121, 121), np.uint8)) > 0) & (river == 0)).astype(np.uint8)
river_tex = cv2.inpaint(bg.astype(np.uint8), outside, 9, cv2.INPAINT_TELEA).astype(np.float32)
TR = 36   # frames per advection cycle

# ---------------- girl: jeans tint, hair mask, wind field ----------------
ga = girl[..., 3] / 255
ghsv = cv2.cvtColor(np.clip(girl[..., :3], 0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
gys, gxs = np.nonzero(ga > 0.5); gtop, gbot = gys.min(), gys.max(); gh = gbot - gtop
jeans = (ga > 0.5) & (ghsv[..., 0] > 95) & (ghsv[..., 0] < 135) & (ghsv[..., 1] > 35) & (ghsv[..., 2] < 150) & (gy > gtop + 0.45 * gh)
lab_g = cv2.cvtColor(np.clip(girl[..., :3], 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
jf = feather(jeans, 1.5)
lab_g[..., 0] += 30 * jf; lab_g[..., 2] -= 8 * jf                       # lighter, bluer wash like the original jeans
girl[..., :3] = cv2.cvtColor(np.clip(lab_g, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
hair = (ga > 0.4) & (ghsv[..., 1] < 110) & (ghsv[..., 2] < 95) & ~jeans
hair = cv2.morphologyEx(hair.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
hn, hl, hst, _ = cv2.connectedComponentsWithStats(cv2.dilate(hair, np.ones((5, 5), np.uint8)), 8)
big = [k for k in range(1, hn) if hst[k, cv2.CC_STAT_AREA] > 0.08 * hst[1:, cv2.CC_STAT_AREA].max()]
hair = (hair & np.isin(hl, big)).astype(np.uint8)
hair = cv2.morphologyEx(hair, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))) & (ga > 0.3)
# make the hair a solid mass: fill see-through gaps between strands (they would flicker green once the hair moves)
solid = cv2.morphologyEx((ga > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
holes = ((solid > 0) & (ga < 0.5) & (cv2.dilate(hair, np.ones((25, 25), np.uint8)) > 0)).astype(np.uint8)
hair_col = np.median(girl[..., :3][hair > 0], axis=0)            # flat base hair colour, like an anime fill
hf = feather(holes, 1.0)[..., None]
girl[..., :3] = girl[..., :3] * (1 - hf) + hair_col * hf
girl[..., 3] = np.maximum(girl[..., 3], holes * 255.0)
ga = girl[..., 3] / 255
hair = (hair | holes).astype(np.uint8)
skin = (ga > 0.5) & (ghsv[..., 0] < 25) & (ghsv[..., 1] > 40) & (ghsv[..., 2] > 120)
white = (ga > 0.5) & (ghsv[..., 1] < 40) & (ghsv[..., 2] > 170)
hys, hxs = np.nonzero(hair); crown = (float(hxs[hys < hys.min() + 6].mean()), float(hys.min()))
s_dist = np.sqrt((gx - crown[0]) ** 2 + (gy - crown[1]) ** 2)
w_len = np.clip((s_dist - 70) / 260, 0, 1); w_len = w_len * w_len * (3 - 2 * w_len)
w_hair = w_len * feather(cv2.dilate(hair, np.ones((19, 19), np.uint8)), 5) * (1 - feather(cv2.dilate((skin | white).astype(np.uint8), np.ones((5, 5), np.uint8)), 2))
# contact shadow under her (static, on the ground)
sh = np.zeros((H, W), np.float32)
low = (ga > 0.5) & (gy > gtop + 0.72 * gh)
ly, lx = np.nonzero(low)
cv2.ellipse(sh, (int(lx.mean()) + 10, int(gbot) - 6), (int((lx.max() - lx.min()) * 0.55), 26), -8, 0, 360, 1.0, -1)
sh = feather(sh, 14)
bg_sh = bg * (1 - 0.35 * sh[..., None])
river_tex = river_tex * (1 - 0.35 * sh[..., None])

if a.debug:
    os.makedirs(a.debug, exist_ok=True)
    def ov(m, col):
        o = bg.copy(); o[m > 0.5] = o[m > 0.5] * 0.4 + np.array(col) * 0.6; return o
    sheet = np.hstack([cv2.resize(ov(river, (255, 0, 0)), (270, 480)), cv2.resize(ov(trees, (255, 0, 255)), (270, 480)),
                       cv2.resize(ov(grass, (255, 255, 0)), (270, 480)), cv2.resize(ov(sky, (255, 128, 0)), (270, 480))])
    cv2.imwrite(os.path.join(a.debug, 'masks.jpg'), sheet[..., ::-1].astype(np.uint8))
    gv = np.zeros((H, W, 3), np.float32) + 255
    gv = girl[..., :3] * ga[..., None] + gv * (1 - ga[..., None])
    hv = gv.copy(); hv[hair > 0] = hv[hair > 0] * 0.4 + np.array([255, 0, 0]) * 0.6
    wv = np.dstack([w_hair * 255] * 3)
    crop = lambda im: im[int(gtop) - 20:int(gbot) + 20, 480:1080]
    cv2.imwrite(os.path.join(a.debug, 'girl_masks.jpg'), np.hstack([crop(gv), crop(hv), crop(wv)])[..., ::-1].astype(np.uint8))

# ---------------- leaves / petals ----------------
rng = np.random.default_rng(7)
NL = 22
L = [dict(x=rng.uniform(-200, W), y=rng.uniform(380, 1850), z=rng.uniform(0.4, 1.0), ph=rng.uniform(0, 6.28),
          rot=rng.uniform(0, 6.28), vr=rng.uniform(-3, 3), kind=rng.choice(['leaf', 'leaf', 'petal'])) for _ in range(NL)]

nfr = int(a.seconds * a.fps)
out = sys.stdout.buffer
for f in range(nfr):
    t = f / a.fps
    # background displacement: trees sway (shear about their base), grass ripples, clouds drift
    gust = 0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * t - gx / 420)
    tree_dx = 0.016 * np.clip(1110 - gy, 0, 400) * gust * np.sin(2 * np.pi * 0.45 * t - gx / 140)
    grass_amp = 0.8 + 3.2 * np.clip((gy - 1000) / 920, 0, 1)
    grass_dx = grass_amp * gust * np.sin(2 * np.pi * 0.6 * t - gx / 90 - gy / 160)
    cloud_dx = -2.2 * t
    dxm = tree_dx * m_tree + grass_dx * m_grass * (1 - m_tree) + cloud_dx * m_sky
    dym = 0.25 * grass_dx * m_grass
    frame = cv2.remap(bg_sh, (gx - dxm).astype(np.float32), (gy - dym).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    # river: two phase-offset advections cross-faded (seamless continuous flow)
    acc = 0
    for k in (0, 0.5):
        ph = ((f / TR) + k) % 1.0
        wgt = 1 - abs(2 * ph - 1)
        d = ph * TR
        acc = acc + wgt * cv2.remap(river_tex, (gx - FX * d).astype(np.float32), (gy - FY * d).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    frame = m_river[..., None] * acc + (1 - m_river[..., None]) * frame
    # river sparkles drifting with the current
    spark = np.zeros((H, W), np.float32)
    srng = np.random.default_rng(1000 + f // 6)
    sy = srng.integers(1100, H, 90); sx = srng.integers(0, W, 90)
    life = ((f % 6) + 0.5) / 6
    for x0, y0 in zip(sx, sy):
        if river[y0, x0] and sh[y0, x0] < 0.1:
            xx, yy = int(x0 + FX[y0, x0] * (f % 6)), int(y0 + FY[y0, x0] * (f % 6))
            r = 2 + 3 * (yy - 1100) / 820
            cv2.line(spark, (int(xx - r * 2), yy), (int(xx + r * 2), yy), math.sin(math.pi * life), 1, cv2.LINE_AA)
            cv2.line(spark, (xx, int(yy - r)), (xx, int(yy + r)), math.sin(math.pi * life) * 0.7, 1, cv2.LINE_AA)
    spark = feather(spark, 0.8) * m_river
    frame = frame + (255 - frame) * np.clip(spark * 0.9, 0, 1)[..., None]
    # girl: wind in the hair (travelling wave along the strands, stronger towards the tips)
    hg = 0.65 + 0.35 * np.sin(2 * np.pi * 0.17 * t + 1.0)
    wave = np.sin(2 * np.pi * 0.85 * t - s_dist / 75)
    hdx = w_hair * hg * (10.0 * wave + 3.0)
    hdy = w_hair * hg * 14.0 * np.sin(2 * np.pi * 0.85 * t - s_dist / 75 + 1.3)
    gl = cv2.remap(girl, (gx - hdx).astype(np.float32), (gy - hdy).astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    al = gl[..., 3:] / 255
    frame = gl[..., :3] * al + frame * (1 - al)
    # leaves / petals blown left -> right
    for p in L:
        p['x'] += (110 + 170 * p['z']) / a.fps
        p['y'] += (10 * math.sin(t * 2.2 + p['ph']) - 6) / a.fps * 3
        p['rot'] += p['vr'] / a.fps
        if p['x'] > W + 60:
            p.update(x=-60, y=float(rng.uniform(380, 1850)), z=float(rng.uniform(0.4, 1.0)))
        size = 7 + 13 * p['z']
        flip = abs(math.cos(t * 3.0 + p['ph']))
        col = (150, 215, 95) if p['kind'] == 'leaf' else (255, 236, 240)
        ax = (int(size), max(1, int(size * 0.45 * (0.3 + 0.7 * flip))))
        cv2.ellipse(frame, (int(p['x']), int(p['y'])), ax, math.degrees(p['rot']), 0, 360, col, -1, cv2.LINE_AA)
        cv2.ellipse(frame, (int(p['x']), int(p['y'])), ax, math.degrees(p['rot']), 0, 360, (60, 90, 50) if p['kind'] == 'leaf' else (200, 160, 175), 1, cv2.LINE_AA)
    # slow push-in towards the scene centre
    z = 1.0 + 0.035 * f / max(1, nfr - 1)
    M = np.float32([[z, 0, (1 - z) * 560], [0, z, (1 - z) * 1150]])
    frame = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    frame = np.clip(frame + 0.5, 0, 255).astype(np.uint8)
    if a.debug:
        if f in (0, 15, 45): cv2.imwrite(os.path.join(a.debug, f'f{f:03d}.jpg'), frame[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 92])
        if f >= 45: break
    else:
        out.write(frame.tobytes())
    if f % 60 == 0: print(f'frame {f}', file=sys.stderr, flush=True)
