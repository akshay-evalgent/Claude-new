import os, sys, time, torch
from PIL import Image
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
ref, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
torch.set_num_threads(4)
pipe = StableDiffusionPipeline.from_pretrained('Meina/MeinaMix_V11', torch_dtype=torch.bfloat16, safety_checker=None, requires_safety_checker=False)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
pipe.load_ip_adapter('h94/IP-Adapter', subfolder='models', weight_name='ip-adapter-plus_sd15.safetensors', torch_dtype=torch.bfloat16)
pipe.set_ip_adapter_scale(0.55)
pipe.set_progress_bar_config(disable=True)
POS = ('1girl, solo, sitting on the ground, hugging her knees, side view, from side, full body, looking into the distance, gentle smile, '
       'very long straight black hair blowing in the wind, hair flowing behind her, brown eyes, light brown skin, white sleeveless top, '
       'long blue baggy jeans, full-length jeans, white sneakers, black wristwatch, simple background, white background, shoujo anime, cel shading, soft sunlight, masterpiece, best quality')
NEG = ('multiple girls, standing, shorts, denim shorts, bare legs, rock, cliff, stone, mountain, sky, extra limbs, extra arms, extra legs, bad anatomy, bad hands, missing fingers, blue hair, brown hair, ripped jeans, '
       'skirt, dress, lowres, blurry, worst quality, low quality, jpeg artifacts, watermark, text, realistic, 3d')
refimg = Image.open(ref).convert('RGB')
for seed in [int(s) for s in sys.argv[3:]]:
    t = time.time()
    img = pipe(POS, negative_prompt=NEG, ip_adapter_image=refimg, width=640, height=640, num_inference_steps=24, guidance_scale=7.0,
               generator=torch.Generator().manual_seed(seed)).images[0]
    img.save(os.path.join(out, f'sit_{seed}.png')); print(seed, f'{time.time()-t:.0f}s', flush=True)
