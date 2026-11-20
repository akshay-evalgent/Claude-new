"""Download the CC0 assets from Poly Haven (polyhaven.com) into src/assets/: a studio HDR environment, scanned coastal
rocks, a conch shell and a chemistry set, and a scanned coral-sand seabed texture.
usage: python3 fetch_assets.py <src dir>"""
import sys, json, os, urllib.request
from PIL import Image, ImageStat
UA = {'User-Agent': 'asset-fetch/1.0'}
op = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA))
out = os.path.join(sys.argv[1], 'assets'); os.makedirs(out, exist_ok=True)
def get(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not (os.path.exists(path) and os.path.getsize(path) > 0): open(path, 'wb').write(op(url).read())
SPEC = ['model:coast_rocks_01', 'model:lambis_shell', 'model:chemistry_set', 'hdri:studio_small_09:1k', 'tex:coral_ground_02:2k']
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
