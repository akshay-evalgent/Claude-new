"""Download the CC0 Poly Haven assets the Apple short uses into $QS_SCRATCH/assets."""
import json, os, urllib.request

OUT = os.path.join(os.environ["QS_SCRATCH"], "assets")
API = "https://api.polyhaven.com/files/"

TEXTURES = {  # name: resolution
    "dark_paneled_wood": "2k",      # 70s office wall panelling
    "dirty_carpet": "2k",           # office carpet
    "fine_grained_wood": "1k",      # desk tops, workbench
    "painted_plaster_wall": "2k",   # Nevada living room, auction hall
    "herringbone_parquet": "2k",    # auction hall floor
    "laminate_floor_02": "2k",      # Nevada floor
    "white_stucco": "2k",           # house walls
    "grey_roof_tiles": "2k",        # house roof
    "concrete_floor": "2k",         # driveway, money stage
    "leafy_grass": "2k",            # lawn
    "dry_ground_rocks": "2k",       # desert outside the window
    "velour_velvet": "1k",          # auction chairs, curtain
    "asphalt_02": "2k",             # street (and the shared car's tyres need these two)
    "fabric_leather_02": "1k",
}
MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "Displacement": "disp"}
HDRIS = {"kloofendal_43d_clear_puresky": "4k", "qwantani_afternoon_puresky": "4k"}
MODELS = ["metal_office_desk", "desk_lamp_arm_01", "wooden_bookshelf_worn",
          "cardboard_box_01", "wall_clock", "potted_plant_01",
          "mid_century_lounge_chair", "side_table_01", "hanging_picture_frame_01", "fancy_picture_frame_01",
          "dining_chair_02", "vintage_cabinet_01", "mantel_clock_01", "coffee_table_round_01",
          "shrub_02", "coast_rocks_02", "Television_01"]


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
