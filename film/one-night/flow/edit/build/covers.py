"""Covers and thumbnail for the upload kit, cut from the cleaned clips."""
from PIL import Image, ImageDraw, ImageFont
SB = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
def lines(d, items, cx, y):
    for txt, size, col in items:
        f = ImageFont.truetype(SB, size); w = d.textlength(txt, font=f)
        d.text((cx - w/2, y + 6), txt, font=f, fill=(0, 0, 0, 150)); d.text((cx - w/2, y), txt, font=f, fill=col); y += int(size*1.12)
def shade(im, top, bottom):
    im = im.convert('RGBA'); W, H = im.size; g = Image.new('L', (1, H))
    for y in range(H):
        v = max(0, 1 - y/(H*0.42))*top if y < H*0.42 else max(0, (y - H*0.62)/(H*0.38))*bottom
        g.putpixel((0, y), int(v*255))
    s = Image.new('RGBA', (W, H), (0, 0, 0, 255)); s.putalpha(g.resize((W, H))); return Image.alpha_composite(im, s)
W1 = (250, 247, 240); W2 = (255, 225, 190)
im = shade(Image.open('build/f_her.png').convert('RGB').resize((1080, 1920), Image.LANCZOS), 0.7, 0.2); d = ImageDraw.Draw(im)
lines(d, [('ONE NIGHT', 120, W1), ('FOR HIM.', 120, W1)], 540, 150); lines(d, [('23 YEARS', 120, W2), ('FOR HER.', 120, W2)], 540, 1500)
im.convert('RGB').save('upload/cover-mrs-claus-1080x1920.jpg', quality=94)
im = shade(Image.open('build/f_watch.png').convert('RGB').resize((1080, 1920), Image.LANCZOS), 0.75, 0.6); d = ImageDraw.Draw(im)
lines(d, [('1 NIGHT', 150, W1), ('= 23 YEARS', 130, W1)], 540, 160); lines(d, [("Santa's physics problem", 62, (235, 235, 235))], 540, 1660)
im.convert('RGB').save('upload/cover-watch-1080x1920.jpg', quality=94)
T = Image.new('RGB', (1280, 720)); xs = [0, 427, 854, 1280]
for i, f in enumerate(['build/f_watch.png', 'build/f_sleigh.png', 'build/f_her.png']):
    w = xs[i+1] - xs[i]; fr = Image.open(f).convert('RGB').resize((w, int(w*1920/1080)), Image.LANCZOS)
    top = (fr.height - 720)//2 if i != 2 else int(fr.height*0.18); T.paste(fr.crop((0, top, w, top + 720)), (xs[i], 0))
T = shade(T, 0.0, 0.88); d = ImageDraw.Draw(T)
lines(d, [('ONE NIGHT FOR HIM.', 80, W1), ('23 YEARS FOR HER.', 80, W2)], 640, 470)
T.convert('RGB').save('upload/thumbnail-1280x720.jpg', quality=94)
print('covers ok')
