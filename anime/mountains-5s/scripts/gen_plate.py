import os, sys, time, torch
from PIL import Image
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
torch.set_num_threads(4)
pipe = StableDiffusionPipeline.from_pretrained('Meina/MeinaMix_V11', torch_dtype=torch.bfloat16, safety_checker=None, requires_safety_checker=False)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)
pipe.set_progress_bar_config(disable=True)
POS = ('anime background art, scenery, no humans, wide open flat green grass field covering the bottom half, empty grassy meadow foreground, '
       'distant snow-capped mountain range on the horizon, rolling green hills, bright blue sky, fluffy white clouds, soft sunlight, '
       'makoto shinkai style, highly detailed, masterpiece, best quality')
NEG = ('people, person, girl, boy, character, cherry blossoms, pink trees, trees in foreground, flowers in foreground, water, river, lake, castle, building, '
       'road, path, text, watermark, signature, lowres, blurry, worst quality, low quality, jpeg artifacts, dark, night')
for seed in [int(s) for s in sys.argv[2:]]:
    t = time.time()
    img = pipe(POS, negative_prompt=NEG, width=512, height=912, num_inference_steps=22, guidance_scale=7.0,
               generator=torch.Generator().manual_seed(seed)).images[0]
    img.save(os.path.join(out, f'plate_{seed}.png')); print(seed, f'{time.time()-t:.0f}s', flush=True)
