"""Download the CC0 Poly Haven assets the proof of concept uses into $POC_SCRATCH/assets."""
import json, os, urllib.request

OUT = os.path.join(os.environ["POC_SCRATCH"], "assets")
API = "https://api.polyhaven.com/files/"

TEXTURES = {  # name: resolution
    "red_brick_03": "2k", "dark_brick_wall": "2k", "brown_brick_02": "2k", "medieval_red_brick": "2k",
    "brick_pavement_02": "2k", "large_sandstone_blocks": "1k", "green_rough_planks": "1k",
    "dark_wooden_planks": "1k", "grey_plaster": "1k", "roof_planks": "1k",
}
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}
HDRIS = {"kloofendal_48d_partly_cloudy_puresky": "2k"}
MODELS = ["wooden_barrels_01", "wooden_crate_01", "wine_barrel_01", "wooden_bucket_01", "street_lamp_01"]


def get(url, dst):
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "poc-asset-fetch"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dst, "wb") as f:
        f.write(r.read())


def files(name):
    req = urllib.request.Request(API + name, headers={"User-Agent": "poc-asset-fetch"})
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
