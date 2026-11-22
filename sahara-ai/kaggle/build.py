"""Fills the Kaggle script template and writes a push-ready kernel folder.
   python kaggle/build.py keyframes [--only k01,k05] [--candidates 2] [--seed 100]
   python kaggle/build.py clips [--only ...]
   --slug NAME pushes under akkikmr/NAME instead of sahara-ai-<mode> (e.g. when that notebook is stuck in the queue)"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
mode = sys.argv[1]; a = sys.argv[2:]
opt = {a[i].lstrip('-'): a[i + 1] for i in range(0, len(a), 2)}
only = opt['only'].split(',') if 'only' in opt else None
src = open(os.path.join(HERE, 'pipeline.py')).read()
shots = json.dumps(json.load(open(os.path.join(HERE, '..', 'shots.json'))))
for k, v in (('__MODE__', mode), ('__ONLY__', repr(only)), ('__CANDIDATES__', opt.get('candidates', '2')), ('__SEED0__', opt.get('seed', '100')),
             ('__KFDS__', 'sahara-ai-stills'), ('__SHOTS__', shots)):
    src = src.replace(k, v)
slug = opt.get('slug', f"sahara-ai-{mode}")
d = os.path.join(HERE, 'push', slug); os.makedirs(d, exist_ok=True)
open(os.path.join(d, slug + '.py'), 'w').write(src)
meta = {"id": f"akkikmr/{slug}", "title": slug, "code_file": slug + ".py", "language": "python", "kernel_type": "script",
        "is_private": True, "enable_gpu": True, "enable_tpu": False, "enable_internet": True, "keywords": ["gpu"],
        "dataset_sources": [f"akkikmr/sahara-ai-stills"] if mode == 'clips' else [], "kernel_sources": [], "competition_sources": [],
        "model_sources": [], "machine_shape": "NvidiaTeslaT4"}
json.dump(meta, open(os.path.join(d, 'kernel-metadata.json'), 'w'), indent=1)
print(d)
