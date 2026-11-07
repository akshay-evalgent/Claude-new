"""Sort BodyParts3D meshes into layers and pack them for the manga renderer.

Data: BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan.
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
Inputs (in DATA dir): isa_BP3D_4.0_obj_99.zip unzipped to obj/, isa_* and partof_* text files.
Output: DATA/layers.npz with vertices, faces, per-face part id, and parts.json.
Usage: python3 prep_bp3d.py <DATA dir>
"""
import collections, glob, json, os, sys
import numpy as np

DATA = sys.argv[1]
LAYERS = {  # layer -> concept ids whose element meshes belong to it
    "bone": ["FMA5018"],
    "cartilage": ["FMA55107"],
    "muscle": ["FMA5022", "FMA85453", "FMA10474"],  # muscle organs + heads + zones (biceps heads, deltoid parts...)
    "tendon": ["FMA9721"],
    "nerve": ["FMA65132", "FMA5865", "FMA7157"],  # nerves, cranial nerves, brain + spinal cord
    "skin": ["FMA7163"],
}


def read_tsv(name):
    rows = []
    with open(os.path.join(DATA, name), encoding="utf-8", errors="replace") as f:
        next(f)
        for line in f:
            p = line.rstrip("\n").split("\t")
            if len(p) >= 3:
                rows.append(p)
    return rows


elems = collections.defaultdict(set)      # concept -> FJ ids
names_of = collections.defaultdict(list)  # FJ -> (n_elems, concept name)
for tree in ("isa", "partof"):
    rows = read_tsv(f"{tree}_element_parts.txt")
    for cid, name, fj in rows:
        elems[cid].add(fj)
    for cid, name, fj in rows:
        names_of[fj].append((len(elems[cid]), name))


def label(fj):
    """Most specific concept name for a mesh (the concept with fewest elements)."""
    return sorted(names_of[fj])[0][1] if names_of[fj] else fj


layer_of = {}
for layer, cids in LAYERS.items():
    for cid in cids:
        for fj in elems[cid]:
            layer_of.setdefault(fj, layer)  # first listed layer wins

V, F, PID, parts = [], [], [], []
offset = 0
for fj, layer in sorted(layer_of.items()):
    path = os.path.join(DATA, "obj", fj + ".obj")
    if not os.path.exists(path):
        continue
    vs, fs = [], []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            if line.startswith("v "):
                vs.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                idx = [int(t.split("/")[0]) for t in line.split()[1:]]
                for k in range(1, len(idx) - 1):
                    fs.append([idx[0], idx[k], idx[k + 1]])
    if not vs or not fs:
        continue
    vs = np.asarray(vs, np.float32); fs = np.asarray(fs, np.int64) - 1
    pid = len(parts)
    parts.append({"id": pid, "fj": fj, "layer": layer, "name": label(fj), "tris": int(len(fs))})
    V.append(vs); F.append(fs + offset); PID.append(np.full(len(fs), pid, np.int32))
    offset += len(vs)

V = np.concatenate(V); F = np.concatenate(F).astype(np.int32); PID = np.concatenate(PID)
np.savez_compressed(os.path.join(DATA, "layers.npz"), V=V, F=F, PID=PID)
json.dump(parts, open(os.path.join(DATA, "parts.json"), "w"), indent=0)
cnt = collections.Counter(p["layer"] for p in parts)
tri = collections.Counter()
for p in parts:
    tri[p["layer"]] += p["tris"]
print("parts per layer:", dict(cnt)); print("triangles per layer:", dict(tri))
print("bbox min", V.min(0), "max", V.max(0))
