"""Copies the chosen keyframe candidate for every shot into out/kf_dataset/<id>.png
and writes the Kaggle dataset metadata, ready for `kaggle datasets create -p out/kf_dataset`.

   python3 pick_keyframes.py picks.json
picks.json maps shot id -> "<run folder under out/>/<candidate>", e.g. {"k01": "kaggle_kf2/1", "k06": "kaggle_kf/1"}"""
import json, os, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
picks = json.load(open(sys.argv[1]))
shots = [s['id'] for s in json.load(open(os.path.join(HERE, 'shots.json')))['shots']]
missing = [s for s in shots if s not in picks]
if missing:
    sys.exit('no pick for ' + ', '.join(missing))
dst = os.path.join(OUT, 'kf_dataset')
os.makedirs(dst, exist_ok=True)
for sid in shots:
    run, cand = picks[sid].rsplit('/', 1)
    src = os.path.join(OUT, run, 'keyframes', f'{sid}_{cand}.png')
    shutil.copyfile(src, os.path.join(dst, f'{sid}.png'))
    print(sid, '<-', os.path.relpath(src, HERE))
json.dump({"title": "sahara-ai-keyframes", "id": "akkikmr/sahara-ai-keyframes", "licenses": [{"name": "CC0-1.0"}]},
          open(os.path.join(dst, 'dataset-metadata.json'), 'w'), indent=1)
print(dst)
