"""Anime redraw of a frame sequence with an SD1.5 anime checkpoint + lineart ControlNet (CPU).
mode=chain: each drawing starts from the previous drawing warped by optical flow (temporal consistency)."""
import os, sys, time, argparse, torch, numpy as np, cv2
from PIL import Image
from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, LCMScheduler
from controlnet_aux import LineartDetector
ap = argparse.ArgumentParser()
ap.add_argument('--src'); ap.add_argument('--out'); ap.add_argument('--first', type=int); ap.add_argument('--last', type=int)
ap.add_argument('--step', type=int, default=3); ap.add_argument('--mode', default='chain')
ap.add_argument('--base', default='Meina/MeinaMix_V11')
ap.add_argument('--s_first', type=float, default=0.85); ap.add_argument('--s_chain', type=float, default=0.6)
ap.add_argument('--cn', type=float, default=0.7); ap.add_argument('--cn_end', type=float, default=0.8)
ap.add_argument('--steps', type=int, default=6); ap.add_argument('--seed', type=int, default=1234)
ap.add_argument('--anchor_ab', type=float, default=1.0); ap.add_argument('--anchor_L', type=float, default=0.5); ap.add_argument('--anchor_sig', type=float, default=14.0)
ap.add_argument('--fuse', type=float, default=0.5); ap.add_argument('--fuse_tau', type=float, default=10.0)
ap.add_argument('--tau', type=float, default=18.0)
ap.add_argument('--W', type=int, default=512); ap.add_argument('--H', type=int, default=912)
ap.add_argument('--crop', default='', help='x0,y0,x1,y1 crop of the source frame before resizing to WxH')
ap.add_argument('--scene', default='indoor stage'); ap.add_argument('--threads', type=int, default=4)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
torch.set_num_threads(a.threads)
dt = torch.bfloat16
cn = ControlNetModel.from_pretrained('lllyasviel/control_v11p_sd15_lineart', variant='fp16', torch_dtype=dt)
pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained(a.base, controlnet=cn, torch_dtype=dt, safety_checker=None, requires_safety_checker=False)
pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
pipe.load_lora_weights('latent-consistency/lcm-lora-sdv1-5', weight_name='pytorch_lora_weights.safetensors'); pipe.fuse_lora()
pipe.set_progress_bar_config(disable=True)
lineart = LineartDetector.from_pretrained('lllyasviel/Annotators')
POS = ('anime screencap, shoujo anime, 1girl dancing, long black hair, beautiful detailed eyes, big sparkling eyes, smile, light brown skin, '
       'white sleeveless top, blue jeans, white sneakers, ' + a.scene + ', flat color, cel shading, clean thin lineart, soft pastel lighting, masterpiece, best quality')
NEG = ('photo, realistic, photorealistic, semi-realistic, 3d, blue hair, brown hair, ripped jeans, torn jeans, holes in jeans, distressed denim, lowres, bad anatomy, bad hands, extra fingers, missing fingers, '
       'blurry, worst quality, low quality, jpeg artifacts, watermark, text')
W, H = a.W, a.H
crop = [int(v) for v in a.crop.split(',')] if a.crop else None
def load(i):
    im = Image.open(os.path.join(a.src, f'{i:05d}.png')).convert('RGB')
    if crop: im = im.crop(tuple(crop))
    return np.asarray(im.resize((W, H), Image.LANCZOS))
dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
def G(x, s): return cv2.GaussianBlur(x, (0, 0), s)
def anchor(out, src):
    # pull broad colour/lighting back to the source so the chain cannot drift; keep the drawn detail
    lo = cv2.cvtColor(src.astype(np.float32) / 255, cv2.COLOR_RGB2LAB); ls = cv2.cvtColor(out.astype(np.float32) / 255, cv2.COLOR_RGB2LAB)
    r = ls.copy()
    for c, k in ((0, a.anchor_L), (1, a.anchor_ab), (2, a.anchor_ab)):
        r[..., c] = ls[..., c] + k * (G(lo[..., c], a.anchor_sig) - G(ls[..., c], a.anchor_sig))
    r[..., 0] = np.clip(r[..., 0], 0, 100)
    return np.clip(cv2.cvtColor(r, cv2.COLOR_LAB2RGB) * 255 + 0.5, 0, 255).astype(np.uint8)
prev_src = prev_out = None
t0 = time.time(); n = 0
for i in range(a.first, a.last + 1, a.step):
    o = os.path.join(a.out, f'{i:05d}.png')
    src = load(i)
    if os.path.exists(o):  # resume
        prev_src, prev_out = src, np.asarray(Image.open(o).convert('RGB')); continue
    ctrl = lineart(Image.fromarray(src), detect_resolution=512, image_resolution=512).resize((W, H))
    if a.mode == 'chain' and prev_out is not None:
        g1 = cv2.cvtColor(src, cv2.COLOR_RGB2GRAY); g0 = cv2.cvtColor(prev_src, cv2.COLOR_RGB2GRAY)
        flow = dis.calc(g1, g0, None)
        mx, my = gx + flow[..., 0], gy + flow[..., 1]
        warped = cv2.remap(prev_out, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        wsrc = cv2.remap(prev_src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        err = cv2.GaussianBlur(np.abs(src.astype(np.float32) - wsrc).mean(axis=2), (0, 0), 3)
        m = np.exp(-(err / a.tau) ** 2)[..., None]
        init = Image.fromarray(np.clip(m * warped + (1 - m) * src, 0, 255).astype(np.uint8))
        strength = a.s_chain
    else:
        init, strength = Image.fromarray(src), a.s_first
    g = torch.Generator().manual_seed(a.seed)
    img = pipe(POS, negative_prompt=NEG, image=init, control_image=ctrl, strength=strength, num_inference_steps=a.steps,
               guidance_scale=1.5, controlnet_conditioning_scale=a.cn, control_guidance_end=a.cn_end, generator=g, width=W, height=H).images[0]
    res = anchor(np.asarray(img), src)
    if a.mode == 'chain' and prev_out is not None and a.fuse > 0:
        # keep well-tracked, unchanged areas (mostly background) steady between drawings
        fm = (a.fuse * np.exp(-(err / a.fuse_tau) ** 2))[..., None]
        res = np.clip(fm * warped + (1 - fm) * res.astype(np.float32) + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(res).save(o + '.tmp.png'); os.replace(o + '.tmp.png', o)
    prev_src, prev_out = src, res
    n += 1
    print(f'drew {i} ({n}) {(time.time()-t0)/n:.1f}s/drawing', flush=True)
print('finished', flush=True)
