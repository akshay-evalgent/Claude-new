"""A manga storyboard page built from the 3D renders: screentone halftones, ink panels, Japanese narration.
usage: python3 manga.py  -> out/manga_page.png"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

OUT = 'out'
JP = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
EN = 'fonts/Archivo-wdth-wght.ttf'
PW, PH, M, G = 1600, 2262, 64, 26


def tone(img, period=6.0, angle=45, gamma=0.5):
    """Grayscale render -> manga tone: mostly paper, dot screentone in the mids, ink only in the deepest shadow."""
    g = np.asarray(ImageOps.autocontrast(img.convert('L'), cutoff=0.5), dtype=np.float32) / 255.0
    g = np.power(g, gamma)
    h, w = g.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.deg2rad(angle)
    u = (xx * np.cos(a) + yy * np.sin(a)) * 2 * np.pi / period
    v = (-xx * np.sin(a) + yy * np.cos(a)) * 2 * np.pi / period
    screen = (np.cos(u) + np.cos(v)) / 4 + 0.5          # 0..1 dot field
    dark = 1 - g
    ink = screen < dark * 0.9                           # dots grow with darkness
    out = np.where(g > 0.7, 1.0, np.where(g < 0.07, 0.0, np.where(ink, 0.0, 1.0)))
    edges = np.asarray(img.convert('L').filter(ImageFilter.FIND_EDGES), dtype=np.float32) / 255.0
    out = np.where(edges > 0.32, 0.0, out)
    return Image.fromarray((out * 255).astype(np.uint8), 'L')


def crop_to(img, w, h, fx=0.5, fy=0.5, zoom=1.0):
    W, H = img.size
    s = max(w / W, h / H) * zoom
    img = img.resize((int(W * s + 0.5), int(H * s + 0.5)), Image.LANCZOS)
    W, H = img.size
    x = int(np.clip(fx * W - w / 2, 0, W - w)); y = int(np.clip(fy * H - h / 2, 0, H - h))
    return img.crop((x, y, x + w, y + h))


def panel(page, draw, name, box, fx=0.5, fy=0.5, zoom=1.0, poly=None, gamma=0.5):
    x0, y0, x1, y1 = box
    src = Image.open(f'{OUT}/{name}.png').convert('RGB')
    t = tone(crop_to(src, x1 - x0, y1 - y0, fx, fy, zoom), gamma=gamma)
    if poly:
        mask = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(mask).polygon([(px - x0, py - y0) for px, py in poly], fill=255)
        page.paste(t, (x0, y0), mask)
        draw.line(poly + [poly[0]], fill=0, width=7, joint='curve')
    else:
        page.paste(t, (x0, y0))
        draw.rectangle(box, outline=0, width=7)


def narration(draw, x, y, jp, en, size=34, vertical=False):
    fj = ImageFont.truetype(JP, size); fe = ImageFont.truetype(EN, int(size * 0.5))
    if vertical:
        h = len(jp) * size * 1.08 + size * 0.8
        w = size * 1.7
        draw.rectangle((x, y, x + w, y + h), fill=255, outline=0, width=4)
        for i, ch in enumerate(jp):
            draw.text((x + w / 2, y + size * 0.4 + i * size * 1.08 + size / 2), ch, font=fj, fill=0, anchor='mm')
        return
    tw = max(draw.textlength(jp, font=fj), draw.textlength(en, font=fe)) + size * 1.2
    draw.rectangle((x, y, x + tw, y + size * 2.4), fill=255, outline=0, width=4)
    draw.text((x + size * 0.6, y + size * 0.35), jp, font=fj, fill=0)
    draw.text((x + size * 0.6, y + size * 1.55), en, font=fe, fill=70)


def main():
    page = Image.new('L', (PW, PH), 255)
    d = ImageDraw.Draw(page)
    fe = ImageFont.truetype(EN, 24); fj = ImageFont.truetype(JP, 26)
    d.text((M, 22), '30,000 DAYS  ·  三万日  ·  第一話', font=fj, fill=0)
    d.text((PW - M, 24), 'storyboard p.1', font=fe, fill=90, anchor='ra')
    top = 70
    # row 1: the hook
    r1 = (M, top, PW - M, top + 470)
    panel(page, d, 'k1_hook', r1, 0.45, 0.42, 1.05, gamma=0.55)
    narration(d, r1[0] + 26, r1[1] + 26, '午前二時十四分。', '2:14 a.m.')
    # row 2: him on the bed + the eye
    y2 = r1[3] + G; split = int(PW * 0.58)
    r2a = (M, y2, split, y2 + 470); r2b = (split + G, y2, PW - M, y2 + 470)
    panel(page, d, 'm_card', r2a, 0.45, 0.45, 1.0, gamma=0.5)
    panel(page, d, 'k5_eye', r2b, 0.3, 0.5, 1.15, gamma=0.8)
    narration(d, r2a[0] + 22, r2a[1] + 22, '残り 21,236 日。', 'Days left: 21,236.')
    narration(d, r2b[2] - 92, r2b[1] + 24, '数えたことがなかった', '', size=34, vertical=True)
    # row 3: panic, slanted panel
    y3 = r2a[3] + G; y3b = y3 + 560
    r3 = (M, y3, PW - M, y3b)
    poly = [(M, y3), (PW - M, y3), (PW - M, y3b - 70), (M, y3b)]
    panel(page, d, 'k6_panic', r3, 0.48, 0.55, 1.0, poly=poly, gamma=0.7)
    narration(d, PW - M - 420, y3 + 28, 'あとで、あとで、あとで——', 'Later, later, later…')
    # row 4: doorway | the dancing couple | asleep
    y4 = y3b - 70 + G; yb = PH - 90
    w1, w3 = 380, 440; x1 = M + w1; x2 = PW - M - w3
    slope = lambda x: y4 + 70 * (1 - (x - M) / (PW - 2 * M))
    panel(page, d, 'm_door', (M, y4, x1, yb), 0.47, 0.5, 1.0, poly=[(M, slope(M)), (x1, slope(x1)), (x1, yb), (M, yb)], gamma=0.55)
    panel(page, d, 'm_roof', (x1 + G, y4, x2 - G, yb), 0.6, 0.5, 1.0, poly=[(x1 + G, slope(x1 + G)), (x2 - G, slope(x2 - G)), (x2 - G, yb), (x1 + G, yb)], gamma=0.6)
    panel(page, d, 'm_end', (x2, y4 + 40, PW - M, yb), 0.45, 0.72, 1.1, gamma=0.5)
    # balloon for the laughing neighbour
    bx, by = x1 + G + 200, y4 + 150
    d.ellipse((bx - 125, by - 45, bx + 125, by + 55), fill=255, outline=0, width=5)
    d.polygon([(bx + 10, by + 48), (bx + 70, by + 140), (bx + 50, by + 44)], fill=255)
    d.line([(bx + 8, by + 50), (bx + 70, by + 140), (bx + 52, by + 46)], fill=0, width=5)
    d.text((bx, by + 5), 'ハッハッハ！', font=ImageFont.truetype(JP, 40), fill=0, anchor='mm')
    narration(d, M + 16, yb - 112, 'ぼくは、あと18,250日。', 'Me: 18,250 left.', size=26)
    narration(d, x1 + G + 18, yb - 112, '隣のじいさんは、あと三日。', 'The old man next door: three days left.', size=30)
    narration(d, x2 + 18, yb - 112, '今日もその一日。', 'Today is one of them.', size=30)
    d.text((PW / 2, PH - 44), '— 1 —', font=fe, fill=0, anchor='mm')
    page.save(f'{OUT}/manga_page.png')
    page.convert('RGB').resize((PW // 2, PH // 2), Image.LANCZOS).save(f'{OUT}/manga_page_small.jpg', quality=88)


if __name__ == '__main__':
    main()
