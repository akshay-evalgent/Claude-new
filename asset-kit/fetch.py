"""Download free (CC0) assets by name, no account needed.

  python3 fetch.py polyhaven-hdri wide_street_02 4k          -> assets/hdri/wide_street_02_4k.hdr
  python3 fetch.py polyhaven-texture asphalt_02 2k           -> assets/textures/asphalt_02/ (diffuse, normal, rough, ...)
  python3 fetch.py polyhaven-model street_lamp_01 2k         -> assets/models/street_lamp_01/ (.gltf + textures)
  python3 fetch.py ambientcg Asphalt026C 2K                  -> assets/textures/Asphalt026C/
  python3 fetch.py cmu 02_01                                 -> mocap/02_01.bvh (CMU motion capture, Bruce Hahne's BVH conversion)
  python3 fetch.py search-polyhaven hdris urban              -> lists assets in a category

Poly Haven (polyhaven.com) and ambientCG (ambientcg.com) are CC0. Building on the Poly Haven API asks for a
"Powered by Poly Haven" credit. The CMU motion capture data may be used for any purpose.
"""
import json, os, sys, urllib.request, zipfile, io

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'asset-kit/1.0'}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
        return r.read()


def save(url, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    data = get(url); open(path, 'wb').write(data); print(f'{len(data) / 1e6:6.1f} MB  {path}')
    return path


def polyhaven_files(asset):
    return json.loads(get(f'https://api.polyhaven.com/files/{asset}'))


def polyhaven_hdri(asset, res='4k', fmt='hdr'):
    f = polyhaven_files(asset)['hdri'][res][fmt]
    return save(f['url'], os.path.join(HERE, 'assets', 'hdri', f'{asset}_{res}.{fmt}'))


def polyhaven_texture(asset, res='2k'):
    """Diffuse, normal (OpenGL), roughness, displacement and AO maps where available."""
    f = polyhaven_files(asset); out = {}
    want = {'Diffuse': 'diffuse', 'nor_gl': 'normal', 'Rough': 'rough', 'Displacement': 'disp', 'AO': 'ao', 'arm': 'arm'}
    for key, name in want.items():
        if key in f and res in f[key]:
            fmt = 'jpg' if 'jpg' in f[key][res] else ('png' if 'png' in f[key][res] else list(f[key][res])[0])
            out[name] = save(f[key][res][fmt]['url'], os.path.join(HERE, 'assets', 'textures', asset, f'{name}.{fmt}'))
    return out


def polyhaven_model(asset, res='2k'):
    """The glTF version of a model, with its textures."""
    g = polyhaven_files(asset)['gltf'][res]['gltf']
    d = os.path.join(HERE, 'assets', 'models', asset)
    main = save(g['url'], os.path.join(d, os.path.basename(g['url'])))
    for rel, inc in g.get('include', {}).items():
        save(inc['url'], os.path.join(d, rel))
    return main


def ambientcg(asset, res='2K'):
    """Unzips the JPG version of a CC0 material from ambientCG."""
    d = os.path.join(HERE, 'assets', 'textures', asset)
    if os.path.isdir(d) and os.listdir(d):
        return d
    data = get(f'https://ambientcg.com/get?file={asset}_{res}-JPG.zip')
    zipfile.ZipFile(io.BytesIO(data)).extractall(d); print(f'{len(data) / 1e6:6.1f} MB  {d}')
    return d


def cmu(clip):
    subject = clip.split('_')[0]
    return save(f'https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/{int(subject):03d}/{clip}.bvh',
                os.path.join(HERE, 'mocap', f'{clip}.bvh'))


def search_polyhaven(kind, category):
    d = json.loads(get(f'https://api.polyhaven.com/assets?t={kind}&c={category}'))
    for k, v in sorted(d.items(), key=lambda kv: -kv[1].get('download_count', 0))[:40]:
        print(f'{k:32s} {v.get("name")}  [{", ".join(v.get("categories", []))}]')


if __name__ == '__main__':
    cmd, *a = sys.argv[1:]
    {'polyhaven-hdri': polyhaven_hdri, 'polyhaven-texture': polyhaven_texture, 'polyhaven-model': polyhaven_model,
     'ambientcg': ambientcg, 'cmu': cmu, 'search-polyhaven': search_polyhaven}[cmd](*a)
