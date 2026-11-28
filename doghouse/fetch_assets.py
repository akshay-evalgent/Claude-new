"""Download the CC0 Poly Haven assets the doghouse short uses into $QS_SCRATCH/assets."""
import json, os, urllib.request

OUT = os.path.join(os.environ["QS_SCRATCH"], "assets")
API = "https://api.polyhaven.com/files/"

TEXTURES = {  # name: resolution
    "excavated_soil_wall": "2k",    # the cut face of the ground
    "leafy_grass": "2k",            # lawn
    "brushed_concrete": "2k",       # bunker walls
    "concrete_floor_02": "2k",      # bunker floors, shaft rings
    "concrete_pavement": "2k",      # patio
    "white_stucco": "2k",           # houses
    "grey_roof_tiles": "2k",        # houses, doghouse roofs
    "fine_grained_wood": "1k",      # doghouses, fences, ladder rungs
    "dark_paneled_wood": "2k",      # the neighbour's bunker
    "herringbone_parquet": "2k",    # the neighbour's floor
    "metal_plate": "1k",            # tunnel liner
    "asphalt_02": "2k",             # (the shared car code expects these two)
    "fabric_leather_02": "1k",
}
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}
HDRIS = {"kloofendal_43d_clear_puresky": "4k"}
MODELS = ["shrub_01", "shrub_02", "shrub_04", "potted_plant_02", "outdoor_table_chair_set_01", "wooden_bucket_01",
          "picke_dirty_01", "old_bed_frame", "classic_laptop", "caged_hanging_light", "Shelf_01",
          "russian_food_cans_01", "plastic_crate_01", "plastic_bottle_gallon", "ArmChair_01", "throw_pillows_01",
          "Television_01", "wooden_bookshelf_worn", "side_table_01", "desk_lamp_arm_01", "vintage_radio_transceiver"]


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
