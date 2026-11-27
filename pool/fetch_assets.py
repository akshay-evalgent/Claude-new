"""Download the CC0 Poly Haven assets the pool short uses into $QS_SCRATCH/assets."""
import json, os, urllib.request

OUT = os.path.join(os.environ["QS_SCRATCH"], "assets")
API = "https://api.polyhaven.com/files/"

TEXTURES = {  # name: resolution
    "excavated_soil_wall": "2k",    # the cut face of the ground in the cutaway shots
    "leafy_grass": "2k",            # lawn
    "wood_floor_deck": "2k",        # pool deck
    "brushed_concrete": "2k",       # garage walls
    "concrete_floor_02": "2k",      # garage floor, slab
    "concrete_pavement": "2k",      # driveway, patio
    "white_stucco": "2k",           # house walls
    "grey_roof_tiles": "2k",        # house roof
    "brown_planks_05": "1k",        # fence
    "metal_plate": "1k",            # the steel tub outside, the lift platform
    "fine_grained_wood": "1k",      # deck boards, sun loungers
    "asphalt_02": "2k",             # street (and the shared car's tyres need these two)
    "fabric_leather_02": "1k",
}
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}
HDRIS = {"kloofendal_43d_clear_puresky": "4k"}
MODELS = ["rusted_spade_01", "metal_tool_chest", "tool_cart", "old_tyre", "metal_jerrycan", "cardboard_box_01",
          "industrial_wall_lamp", "shrub_01", "shrub_02", "shrub_04", "potted_plant_02", "planter_box_01",
          "garden_hose_wall_mounted_01", "outdoor_table_chair_set_01", "wooden_ladder"]


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
        d = files(name)
        if "gltf" not in d:
            print("no gltf, skipped:", name)
            continue
        g = d["gltf"]["1k"]["gltf"]
        base = os.path.join(OUT, "models", name)
        get(g["url"], os.path.join(base, name + ".gltf"))
        for rel, inc in g.get("include", {}).items():
            get(inc["url"], os.path.join(base, rel))
        print("model", name)
