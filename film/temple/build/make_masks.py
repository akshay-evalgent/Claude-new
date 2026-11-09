"""Build the source plate, the water mask and the depth map from the reference frame.
Outputs (1280x720):
  src/plate.jpg  - reference with the corner watermark cloned out
  src/masks.png  - R = water mask, G = depth (1 = near camera), B = light-ray region
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

W, H = 1280, 720
ref = Image.open('src/reference.webp').convert('RGB')

# --- 1. clone out the watermark sparkle at the bottom right ------------------
plate = ref.copy()
box = (1108, 560, 1218, 650)                     # watermark area
patch = ref.crop((1108-120, 560, 1218-120, 650))  # water just left of it
mask = Image.new('L', (box[2]-box[0], box[3]-box[1]), 0)
ImageDraw.Draw(mask).ellipse((6, 6, mask.width-6, mask.height-6), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(7))
plate.paste(patch, box[:2], mask)
plate.save('src/plate.jpg', quality=94)

# --- 2. water mask -----------------------------------------------------------
water = Image.new('L', (W, H), 0)
ImageDraw.Draw(water).polygon(
    [(598, 432), (700, 417), (820, 408), (1000, 398), (1280, 388),
     (1280, 720), (604, 720), (590, 600), (596, 500)], fill=255)
water = water.filter(ImageFilter.GaussianBlur(2))

# --- 3. depth map (1 = nearest) ----------------------------------------------
depth = Image.new('L', (W, H), 0)
d = ImageDraw.Draw(depth)
# background (temple, trees)
d.rectangle((0, 0, W, H), fill=int(0.06*255))
# pool far wall and spouts
d.polygon([(500, 340), (1280, 330), (1280, 395), (598, 432), (500, 420)], fill=int(0.28*255))
# water: gradient from far (y~400) to near (y=720)
wy = np.linspace(0, 1, H)[:, None]
grad = np.clip((wy - 400/H) / (1 - 400/H), 0, 1)
water_depth = (0.28 + 0.45*grad) * 255
wd = Image.fromarray(np.repeat(water_depth, W, axis=1).astype('uint8'))
depth.paste(wd, (0, 0), water)
# Nandi and plinth, nearest
d.polygon([(0, 310), (120, 240), (200, 205), (265, 195), (300, 150), (340, 120),
           (400, 118), (460, 130), (500, 180), (490, 260), (470, 330), (520, 380),
           (598, 432), (604, 720), (0, 720)], fill=int(0.9*255))
depth = depth.filter(ImageFilter.GaussianBlur(5))

# --- 4. light-ray region (upper right, where the sun comes through) ---------
rays = Image.new('L', (W, H), 0)
ImageDraw.Draw(rays).polygon([(620, 0), (1280, 0), (1280, 420), (980, 470), (640, 380)], fill=255)
rays = rays.filter(ImageFilter.GaussianBlur(60))

Image.merge('RGB', (water, depth, rays)).save('src/masks.png')

# preview for checking
prev = plate.copy()
over = Image.merge('RGB', (water, depth, Image.new('L', (W, H), 0)))
Image.blend(prev, over, 0.45).save('build/masks_preview.jpg', quality=85)
print('ok')
