"""Download the CC0 Poly Haven assets the quicksand short uses into $QS_SCRATCH/assets."""
import json, os, urllib.request

OUT = os.path.join(os.environ["QS_SCRATCH"], "assets")
API = "https://api.polyhaven.com/files/"

TEXTURES = {  # name: resolution
    "damp_beach_sand_02": "2k", "coast_sand_01": "2k", "damp_sand": "2k", "low_tide_rocks": "2k",
    "rounded_square_tiled_wall": "1k", "patio_tiles": "1k",
}
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}
HDRIS = {"qwantani_sunset_puresky": "4k"}
MODELS = ["sand_rocks_small_01", "coast_rocks_01", "dead_tree_trunk_02", "lambis_shell"]


def get(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "asset-fetch"})
    with urllib.request.urlopen(req, timeout=300) as r, open(dst, "wb") as f:
        f.write(r.read())


def files(name):
    req = urllib.request.Request(API + name, headers={"User-Agent": "asset-fetch"})
    return json.load(urllib.request.urlopen(req, timeout=60))


if __name__ == "__main__":
    for name, res in TEXTURES.items():
        d = files(name)
        for key, short in MAPS.items():
            if key in d and res in d[key]:
                entry = d[key][res].get("jpg") or d[key][res].get("png")
                get(entry["url"], os.path.join(OUT, "tex", name, f"{short}.{entry['url'].rsplit('.', 1)[1]}"))
        print("texture", name)
    for name, res in HDRIS.items():
        get(files(name)["hdri"][res]["hdr"]["url"], os.path.join(OUT, "hdri", name + ".hdr"))
        print("hdri", name)
    for name in MODELS:
        g = files(name)["gltf"]["1k"]["gltf"]
        base = os.path.join(OUT, "models", name)
        get(g["url"], os.path.join(base, name + ".gltf"))
        for rel, inc in g.get("include", {}).items():
            get(inc["url"], os.path.join(base, rel))
        print("model", name)
