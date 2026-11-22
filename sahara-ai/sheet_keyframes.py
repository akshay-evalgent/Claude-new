"""Labelled contact sheets of the keyframe candidates: out/kf_sheet_<n>.jpg, 7 shots per sheet, candidates side by side."""
import glob, json, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(HERE, 'out', 'kaggle_kf', 'keyframes')
shots = [s['id'] for s in json.load(open(os.path.join(HERE, 'shots.json')))['shots']]
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
TW, TH = 288, 504
per = 7
for n in range(0, len(shots), per):
    group = shots[n:n + per]
    cands = max(len(glob.glob(f'{src}/{s}_*.png')) for s in group) or 1
    sheet = Image.new('RGB', (TW * len(group), TH * cands + 40), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for i, s in enumerate(group):
        d.text((i * TW + 10, 6), s, fill=(255, 210, 70), font=font)
        for c in range(cands):
            p = f'{src}/{s}_{c}.png'
            if os.path.exists(p):
                sheet.paste(Image.open(p).convert('RGB').resize((TW - 4, TH - 4)), (i * TW + 2, 40 + c * TH + 2))
                d.text((i * TW + 10, 40 + c * TH + 8), str(c), fill=(255, 255, 255), font=font, stroke_width=3, stroke_fill=(0, 0, 0))
    out = os.path.join(HERE, 'out', f'kf_sheet_{n // per + 1}.jpg'); sheet.save(out, quality=88); print(out)
