"""Paints the made-up soda logo off the bottle in o12 (redo candidate 1), leaving a plain bottle of cola.
   python3 fix_bottle.py      # out/kaggle_redo1/keyframes/o12_1.png -> out/kaggle_edit/keyframes/o12_1.png
The label is filled with the cola just below it, column by column; left of x=188 the fingers overlap the label, so
skin-coloured pixels there are kept."""
import os
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, 'out/kaggle_redo1/keyframes/o12_1.png')
dst = os.path.join(HERE, 'out/kaggle_edit/keyframes/o12_1.png')
im = np.array(Image.open(src).convert('RGB')).astype(float)
X0, X1, Y0, Y1 = 168, 218, 505, 558                       # the label band
reg = im[Y0:Y1, X0:X1]
r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
skin = (r > b + 10) & (r > 60) & (g > 0.4 * r)
skin[:, 188 - X0:] = False
m = np.array(Image.fromarray(((~skin) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))) / 255
m[:, -1] *= 0.5
for k in range(3):                                         # feather into the untouched cola above and below
    m[k] *= (k + 1) / 4; m[-1 - k] *= (k + 1) / 4
fill = np.repeat(im[561:571, X0:X1].mean(axis=0)[None], Y1 - Y0, axis=0)
im[Y0:Y1, X0:X1] = reg * (1 - m[..., None]) + fill * m[..., None]
for y in range(500, 562):                                  # the label's blue edge just right of the band
    for x in range(212, 224):
        r, g, b = im[y, x]
        if b > r + 25 and b > g + 10 and b > 60:
            im[y, x] = im[y, x - 4]
os.makedirs(os.path.dirname(dst), exist_ok=True)
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(dst)
print(dst)
