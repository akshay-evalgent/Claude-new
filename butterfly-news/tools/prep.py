"""Prepare every footage shot at its display size (30 fps JPEG sequence, or one still for photo shots).

usage: python3 tools/prep.py SRC_DIR

Uses the USFWS Pismo Beach videos when they are in SRC_DIR; otherwise falls back to crops of the
USFWS Pismo Beach photo (5760x3840) and the USFWS monarch clip. Photos are never shown above 1:1:
each crop is downscaled to 1920x1080 by at least the push the page applies to it.
Writes web/frames/<shot>/NNNN.jpg, web/frames/manifest.json and web/frames/credits.json.
"""
import json, os, shutil, subprocess, sys
from PIL import Image, ImageFilter

SRC = sys.argv[1]; OUT = os.path.join(os.path.dirname(__file__), '..', 'web', 'frames'); os.makedirs(OUT, exist_ok=True)
have = lambda k: os.path.exists(os.path.join(SRC, k + '.webm')) and os.path.getsize(os.path.join(SRC, k + '.webm')) > 100000
FULL = 'scale=1920:1080:flags=lanczos,unsharp=5:5:0.45'
PSW_V = ['视频', 'USFWS Pacific Southwest Region · Pismo Beach · Public domain']
PSW_P = ['图片', 'USFWS · Pismo Beach, California · Public domain']
FWS_V = ['视频', 'U.S. Fish and Wildlife Service · Public domain']

def video(shot, key, t_in, dur, vf=FULL):
    d = os.path.join(OUT, shot); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', str(t_in), '-i', os.path.join(SRC, key + '.webm'), '-t', str(dur), '-vf', 'fps=30,' + vf, '-q:v', '3', os.path.join(d, '%04d.jpg')], check=True)

PHOTO = None
def photo(shot, box, size=(1920, 1080)):
    """box = (x0, y0, x1, y1) in the 5760x3840 source; downscaled to size with lanczos + light unsharp."""
    global PHOTO
    if PHOTO is None: PHOTO = Image.open(os.path.join(SRC, 'fws_pismo_photo.jpg')).convert('RGB')
    assert (box[2] - box[0]) >= size[0] and (box[3] - box[1]) >= size[1], 'would exceed 1:1'
    d = os.path.join(OUT, shot); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    im = PHOTO.crop(box).resize(size, Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 40, 2))
    im.save(os.path.join(d, '0001.jpg'), quality=93)

credits = {}
if have('pismo_over') and have('pismo_sun') and have('euc_branch'):
    video('hook', 'pismo_over', 2.0, 3.3);   credits['hook'] = PSW_V
    video('half', 'pismo_sun', 4.0, 3.3);    credits['half'] = PSW_V
    video('freeze', 'euc_branch', 3.0, 0.5); credits['freeze'] = PSW_V
    video('split_l', 'euc_branch', 8.0, 3.3, 'crop=960:1080:480:0,unsharp=5:5:0.45')
    video('split_r', 'pismo_over', 11.0, 3.3, 'crop=960:1080:560:0,unsharp=5:5:0.45'); credits['split'] = PSW_V
    video('breath', 'pismo_sun', 14.0, 2.8); credits['breath'] = PSW_V
    video('grove', 'euc_branch', 12.0, 2.3); credits['grove'] = PSW_V
    video('verd1', 'fws_monarch', 0.4, 3.3); credits['verd1'] = FWS_V
    video('verd2', 'pismo_over', 15.0, 3.3); credits['verd2'] = PSW_V
    mode = 'pismo-videos'
else:
    photo('hook', (0, 300, 5760, 3540));             credits['hook'] = PSW_P      # the whole branch, three monarchs
    video('half', 'fws_monarch', 0.0, 3.3);          credits['half'] = FWS_V
    video('freeze', 'fws_monarch', 3.3, 0.5);        credits['freeze'] = FWS_V
    # split halves are 960x1080: left = the lone monarch, right = the pair
    photo('split_l', (20, 1500, 1940, 3660), (960, 1080))
    photo('split_r', (2920, 210, 5480, 3090), (960, 1080)); credits['split'] = PSW_P
    photo('breath', (2560, 760, 5760, 2560));        credits['breath'] = PSW_P    # the pair, wide
    photo('grove', (1900, 100, 4780, 1720));         credits['grove'] = PSW_P     # in-focus eucalyptus stems; 1.25x punch stays under 1:1
    photo('verd1', (0, 2010, 2400, 3360));           credits['verd1'] = PSW_P     # the lone monarch, close
    photo('verd2', (3000, 1000, 5560, 2440));        credits['verd2'] = PSW_P     # the pair, close
    mode = 'photo-fallback'

man = {k: len([f for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.jpg')]) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k))}
json.dump(man, open(os.path.join(OUT, 'manifest.json'), 'w')); json.dump(credits, open(os.path.join(OUT, 'credits.json'), 'w'), ensure_ascii=False)
print(mode, man)
