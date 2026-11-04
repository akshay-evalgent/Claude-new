"""Grade stylized frames back onto the source palette, add ink lines, stabilise flicker
with optical flow, and stream raw RGB frames to stdout (for ffmpeg)."""
import sys, os, argparse, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from anime_lib import to_lab, from_lab

ap = argparse.ArgumentParser()
ap.add_argument('--src'); ap.add_argument('--sty')
ap.add_argument('--first', type=int, default=0); ap.add_argument('--last', type=int, required=True)
ap.add_argument('--styled_last', type=int, required=True, help='frames after this pass through untouched')
ap.add_argument('--sig', type=float, default=8); ap.add_argument('--kab', type=float, default=0.7)
ap.add_argument('--sat', type=float, default=1.2); ap.add_argument('--lines', type=float, default=0.3)
ap.add_argument('--cel', type=float, default=0.6); ap.add_argument('--bloom', type=float, default=0.5)
ap.add_argument('--alpha', type=float, default=0.7); ap.add_argument('--tau', type=float, default=10.0)
ap.add_argument('--dump', default='')
a = ap.parse_args()

def G(x, s): return cv2.GaussianBlur(x, (0, 0), s)
def softq(x, step, soft):
    # soft posterise: flat tone bands with smooth transitions (anime cel shading)
    q = x / step; f = np.floor(q); r = q - f
    t = np.clip((r - 0.5) / soft + 0.5, 0, 1); t = t * t * (3 - 2 * t)
    return (f + t) * step

def grade(src, sty):
    ls, lo = to_lab(sty), to_lab(src)
    out = np.empty_like(ls)
    # low frequencies (tone, skin colour, lighting) from the source; edges/cel shading from the model
    base = G(lo[..., 0], a.sig)
    if a.cel: base = (1 - a.cel) * base + a.cel * softq(base, 14.0, 0.35)
    out[..., 0] = base + (ls[..., 0] - G(ls[..., 0], a.sig))
    for c in (1, 2):
        out[..., c] = (G(lo[..., c], a.sig) + a.kab * (ls[..., c] - G(ls[..., c], a.sig))) * a.sat
    if a.lines:
        L = ls[..., 0]
        ink = np.clip(-(G(L, 0.8) - G(L, 1.6)) * a.lines, 0, 1)
        out[..., 0] *= (1 - 0.6 * ink)
    out[..., 0] = np.clip(out[..., 0], 0, 100)
    rgb = from_lab(out)
    if a.bloom:
        f = rgb.astype(np.float32)
        hi = np.clip((f - 200) / 55, 0, 1) * f
        rgb = np.clip(255 - (255 - f) * (1 - a.bloom * G(hi, 12) / 255), 0, 255).astype(np.uint8)
    return rgb

dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
prev_src = prev_out = None
H = W = None
out_stream = sys.stdout.buffer
for i in range(a.first, a.last + 1):
    src = cv2.cvtColor(cv2.imread(os.path.join(a.src, f'{i:05d}.png')), cv2.COLOR_BGR2RGB)
    if H is None:
        H, W = src.shape[:2]
        gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    if i > a.styled_last:
        frame = src; prev_src = prev_out = None
    else:
        sty = cv2.cvtColor(cv2.imread(os.path.join(a.sty, f'{i:05d}.png')), cv2.COLOR_BGR2RGB)
        cur = grade(src, sty).astype(np.float32)
        if prev_out is not None and a.alpha > 0:
            g0 = cv2.resize(cv2.cvtColor(prev_src, cv2.COLOR_RGB2GRAY), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
            g1 = cv2.resize(cv2.cvtColor(src, cv2.COLOR_RGB2GRAY), (W // 2, H // 2), interpolation=cv2.INTER_AREA)
            flow = dis.calc(g1, g0, None)                      # cur(x) ~ prev(x + flow)
            flow = cv2.resize(flow, (W, H), interpolation=cv2.INTER_LINEAR) * 2.0
            mx, my = gx + flow[..., 0], gy + flow[..., 1]
            wprev_out = cv2.remap(prev_out, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            wprev_src = cv2.remap(prev_src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            err = np.abs(src.astype(np.float32) - wprev_src.astype(np.float32)).mean(axis=2)
            err = G(err, 2.0)
            w = (a.alpha * np.exp(-(err / a.tau) ** 2))[..., None]
            cur = cur * (1 - w) + wprev_out * w
        prev_src, prev_out = src, cur
        frame = np.clip(cur + 0.5, 0, 255).astype(np.uint8)
    if a.dump and i % 30 == 0:
        cv2.imwrite(os.path.join(a.dump, f'{i:05d}.jpg'), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
    out_stream.write(np.ascontiguousarray(frame).tobytes())
    if i % 100 == 0: print(f'compose {i}', file=sys.stderr, flush=True)
