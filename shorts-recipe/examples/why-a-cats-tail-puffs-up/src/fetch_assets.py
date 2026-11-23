"""Download the assets for this short into src/assets/:
- from Poly Haven (polyhaven.com, CC0): HDR environments, furniture models and PBR textures;
- from the Objaverse mirror of Sketchfab on Hugging Face (allenai/objaverse): the real cat models, which are CC BY 4.0
  (credit the authors as in README.md).
usage: python3 fetch_assets.py <src dir>"""
import sys, json, os, urllib.request
UA = {'User-Agent': 'asset-fetch/1.0'}
op = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA))
out = os.path.join(sys.argv[1], 'assets'); os.makedirs(out, exist_ok=True)
def get(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not (os.path.exists(path) and os.path.getsize(path) > 0): open(path, 'wb').write(op(url).read())
SPEC = ['hdri:kiara_interior:4k', 'hdri:studio_small_09:1k', 'tex:wood_floor:2k']
CATS = {'fripouille': 'glbs/000-125/0ab14bf98e754f8d90fe1bf1c84ca66c.glb'}   # file name -> Objaverse path (glbs/<shard>/<Sketchfab uid>.glb)
for spec in SPEC:
    kind, aid, *r = spec.split(':'); res = r[0] if r else '1k'
    f = json.load(op(f'https://api.polyhaven.com/files/{aid}')); d = os.path.join(out, aid)
    if kind == 'model':
        g = f['gltf'][res]['gltf']; get(g['url'], f'{d}/{aid}.gltf')
        for k, v in g.get('include', {}).items(): get(v['url'], f'{d}/{k}')
    elif kind == 'hdri': get(f['hdri'][res]['hdr']['url'], f'{out}/{aid}_{res}.hdr')
    else:
        for m in ['Diffuse', 'nor_gl', 'Rough', 'AO']:
            fm = f[m][res]; get(fm['jpg']['url'], f'{d}/{m}.jpg')
    print('ok', spec)
for name, p in CATS.items():
    get('https://huggingface.co/datasets/allenai/objaverse/resolve/main/' + p, f'{out}/cats/{name}.glb'); print('ok', name)
