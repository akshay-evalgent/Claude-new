import sys, torch, numpy as np
from PIL import Image
from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, LCMScheduler
from controlnet_aux import LineartDetector
src_path, out_path = sys.argv[1], sys.argv[2]
torch.set_num_threads(4); dt = torch.bfloat16
cn = ControlNetModel.from_pretrained('lllyasviel/control_v11p_sd15_lineart', variant='fp16', torch_dtype=dt)
pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained('Meina/MeinaMix_V11', controlnet=cn, torch_dtype=dt, safety_checker=None, requires_safety_checker=False)
pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)
pipe.load_lora_weights('latent-consistency/lcm-lora-sdv1-5', weight_name='pytorch_lora_weights.safetensors'); pipe.fuse_lora()
pipe.set_progress_bar_config(disable=True)
la = LineartDetector.from_pretrained('lllyasviel/Annotators')
th = Image.open(src_path).convert('RGB')
w, h = th.size; cw = int(h * 9 / 16); x0 = (w - cw) // 2
src = th.crop((x0, 0, x0 + cw, h)).resize((512, 912), Image.LANCZOS)
ctrl = la(src, detect_resolution=512, image_resolution=512).resize((512, 912))
POS = ('anime background art, scenery, no humans, rocky snow-capped mountain peak, turquoise glacial river flowing through green meadow, '
       'pine forest, blue sky, white clouds, bright sunlight, makoto shinkai style, flat color, cel shading, clean lineart, highly detailed, masterpiece, best quality')
NEG = 'photo, realistic, photorealistic, 3d, people, person, text, watermark, lowres, blurry, worst quality, low quality, jpeg artifacts'
img = pipe(POS, negative_prompt=NEG, image=src, control_image=ctrl, strength=0.75, num_inference_steps=8, guidance_scale=1.5,
           controlnet_conditioning_scale=0.7, control_guidance_end=0.8, generator=torch.Generator().manual_seed(1234), width=512, height=912).images[0]
img.save(out_path) if out_path.endswith('.png') else None
if not out_path.endswith('.png'):
    sheet = Image.new('RGB', (1024, 912)); sheet.paste(src, (0, 0)); sheet.paste(img, (512, 0)); sheet.save(out_path, quality=90)
