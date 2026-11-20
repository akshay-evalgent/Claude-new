"""Download the CC0 assets from Poly Haven (polyhaven.com) into src/assets/: four HDR environments,
six glTF models and three scanned PBR textures, then make grey detail maps of two textures so they can be tinted.
usage: python3 fetch_assets.py <src dir>"""
import sys, json, os, urllib.request
from PIL import Image, ImageStat
UA = {'User-Agent': 'asset-fetch/1.0'}
op = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA))
out = os.path.join(sys.argv[1], 'assets'); os.makedirs(out, exist_ok=True)
def get(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not (os.path.exists(path) and os.path.getsize(path) > 0): open(path, 'wb').write(op(url).read())
SPEC = ['model:SchoolDesk_01', 'model:SchoolChair_01', 'model:wall_clock', 'model:modular_industrial_pipes_01', 'model:stationery_supplies', 'model:office_notepads',
        'hdri:school_hall:2k', 'hdri:surgery:2k', 'hdri:industrial_pipe_and_valve_01:2k', 'hdri:studio_small_09:1k',
        'tex:knitted_fleece', 'tex:plastered_wall', 'tex:laminate_floor_02']
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
for n in ['knitted_fleece', 'plastered_wall']:
    im = Image.open(f'{out}/{n}/Diffuse.jpg').convert('L'); m = ImageStat.Stat(im).mean[0]
    im.point(lambda v: max(0, min(255, int(v * 205 / m)))).convert('RGB').save(f'{out}/{n}/Detail.jpg', quality=92)
