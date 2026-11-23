"""Copies the chosen keyframe candidate for every shot into out/kf_dataset/<id>.png
and writes the Kaggle dataset metadata, ready for `kaggle datasets create -p out/kf_dataset`.

   python3 pick_keyframes.py picks.json
picks.json maps shot id -> "<run folder under out/>/<candidate>[@x0,y0,x1,y1]",
e.g. {"k01": "kaggle_kf2/1", "k13": "kaggle_kf3/1@156,0,613,800"} (the optional box crops, then scales back up)"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.basename(HERE)
OUT = os.path.join(HERE, 'out')
picks = json.load(open(sys.argv[1]))
shots = [s['id'] for s in json.load(open(os.path.join(HERE, 'shots.json')))['shots']]
missing = [s for s in shots if s not in picks]
if missing:
    sys.exit('no pick for ' + ', '.join(missing))
dst = os.path.join(OUT, 'kf_dataset')
os.makedirs(dst, exist_ok=True)
for sid in shots:
    pick, _, crop = picks[sid].partition('@')
    run, cand = pick.rsplit('/', 1)
    src = os.path.join(OUT, run, 'keyframes', f'{sid}_{cand}.png')
    if crop:  # "x0,y0,x1,y1": crop, then scale back to the original size
        from PIL import Image
        im = Image.open(src)
        im.crop(tuple(int(v) for v in crop.split(','))).resize(im.size, Image.LANCZOS).save(os.path.join(dst, f'{sid}.png'))
    else:
        shutil.copyfile(src, os.path.join(dst, f'{sid}.png'))
    print(sid, '<-', os.path.relpath(src, HERE), crop)
json.dump({"title": f"{PROJECT}-stills", "id": f"akkikmr/{PROJECT}-stills", "licenses": [{"name": "CC0-1.0"}]},
          open(os.path.join(dst, 'dataset-metadata.json'), 'w'), indent=1)
print(dst)
