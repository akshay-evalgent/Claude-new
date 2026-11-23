"""Build a rigged, clothed, realistic-skinned character from MakeHuman CC0 data files.

Reads only data: the hm08 base mesh, macro and expression targets, the Mixamo-compatible rig and
weights (from the MPFB data folder), MakeHuman skins, eyes, eyebrows, eyelashes, hair, teeth and
.mhclo clothes. No add-on code is run.

Facial expressions are baked as shape keys on the body and refitted onto every face proxy
(eyebrows, lashes, teeth), so `set_expression(...)` moves them all together.
"""
import gzip, json, os, re
import numpy as np
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

SCRATCH = os.environ["QS_SCRATCH"]
MPFB = os.path.join(SCRATCH, "dl", "mpfb", "data")
PACKS = os.path.join(SCRATCH, "dl", "packs")
SYS = os.path.join(PACKS, "makehuman_system_assets")
SCALE = 0.1  # MakeHuman decimetres -> metres


# ----------------------------------------------------------------------------- mesh io
def _parse_obj(path, keep_groups=None):
    verts, uvs, faces, face_uvs, group = [], [], [], [], None
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                verts.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("vt "):
                uvs.append([float(x) for x in line.split()[1:3]])
            elif line.startswith("g "):
                group = line.split(maxsplit=1)[1].strip()
            elif line.startswith("f "):
                if keep_groups is not None and group not in keep_groups:
                    continue
                vi, ti = [], []
                for tok in line.split()[1:]:
                    p = tok.split("/")
                    vi.append(int(p[0]) - 1)
                    ti.append(int(p[1]) - 1 if len(p) > 1 and p[1] else -1)
                faces.append(vi)
                face_uvs.append(ti)
    return np.array(verts, dtype=np.float64), uvs, faces, face_uvs


def _read_target(path):
    idx, d = [], []
    with gzip.open(path, "rt") as f:
        for line in f:
            p = line.split()
            if len(p) == 4:
                idx.append(int(p[0])); d.append([float(p[1]), float(p[2]), float(p[3])])
    return np.array(idx, dtype=np.int64), np.array(d, dtype=np.float64).reshape(-1, 3)


def _apply_target(coords, path, weight):
    idx, d = _read_target(path)
    np.add.at(coords, idx, weight * d)


def _to_blender(mh):
    return np.stack([mh[:, 0], -mh[:, 2], mh[:, 1]], axis=1) * SCALE


def _make_mesh(name, verts, faces, uvs, face_uvs):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    if uvs:
        uvl = me.uv_layers.new(name="UVMap")
        for poly, fu in zip(me.polygons, face_uvs):
            for li, t in zip(poly.loop_indices, fu):
                if t >= 0:
                    uvl.data[li].uv = uvs[t]
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ----------------------------------------------------------------------------- materials
def _mhmat(path):
    d = {}
    for line in open(path, errors="ignore"):
        p = line.split(maxsplit=1)
        if len(p) == 2 and not line.startswith(("#", "//")):
            d[p[0]] = p[1].strip()
    return d


def _img(path, noncolor=False):
    im = bpy.data.images.load(path, check_existing=True)
    if noncolor:
        im.colorspace_settings.name = "Non-Color"
    return im


def skin_material(name, mhmat_path, tone=(0.97, 0.86, 0.76)):
    folder = os.path.dirname(mhmat_path)
    d = _mhmat(mhmat_path)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = _img(os.path.join(folder, d["diffuseTexture"]))
    tint = nt.nodes.new("ShaderNodeMix"); tint.data_type = "RGBA"; tint.blend_type = "MULTIPLY"
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = (*tone, 1)
    nt.links.new(t.outputs["Color"], tint.inputs[6])
    nt.links.new(tint.outputs[2], b.inputs["Base Color"])
    b.inputs["Subsurface Weight"].default_value = 0.25
    b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.18)
    b.inputs["Subsurface Scale"].default_value = 0.012
    b.inputs["Roughness"].default_value = 0.48
    b.inputs["Specular IOR Level"].default_value = 0.45
    # pores / fine skin relief
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise"); n.inputs["Scale"].default_value = 900.0; n.inputs["Detail"].default_value = 4
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.06; bump.inputs["Distance"].default_value = 0.0005
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    nt.links.new(n.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    add_wetness(m)
    return m


def alpha_material(name, mhmat_path, tint=None, roughness=0.5, sheen=0.0):
    """Texture with alpha (eyebrows, lashes, hair cards)."""
    folder = os.path.dirname(mhmat_path)
    d = _mhmat(mhmat_path)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = _img(os.path.join(folder, d["diffuseTexture"]))
    t.image.alpha_mode = "STRAIGHT"
    if tint:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0; mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(t.outputs["Color"], mix.inputs[6]); nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    else:
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Sheen Weight"].default_value = sheen
    nrm = d.get("normalmapTexture")
    if nrm and os.path.exists(os.path.join(folder, nrm)):
        tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = _img(os.path.join(folder, nrm), True)
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.6
        nt.links.new(tn.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def eye_material(name, mhmat_path):
    folder = os.path.dirname(mhmat_path)
    d = _mhmat(mhmat_path)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = _img(os.path.join(folder, d["diffuseTexture"]))
    t.image.alpha_mode = "STRAIGHT"
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.25
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.02
    b.inputs["Subsurface Weight"].default_value = 0.1
    return m


def simple_texture_material(name, mhmat_path, roughness=0.35):
    folder = os.path.dirname(mhmat_path)
    d = _mhmat(mhmat_path)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    t = nt.nodes.new("ShaderNodeTexImage"); t.image = _img(os.path.join(folder, d["diffuseTexture"]))
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = roughness
    return m


def _mean_lum(path):
    """Mean linear luminance of the opaque pixels of a texture."""
    from PIL import Image
    im = np.asarray(Image.open(path).convert("RGBA").resize((256, 256)), dtype=np.float64) / 255.0
    a = im[..., 3] > 0.5
    lin = np.where(im[..., :3] <= 0.04045, im[..., :3] / 12.92, ((im[..., :3] + 0.055) / 1.055) ** 2.4)
    lum = lin @ np.array([0.2126, 0.7152, 0.0722])
    return float(lum[a].mean()) if a.any() else float(lum.mean())


def cloth_material(name, mhmat_path, tint, roughness=0.85, sheen=0.25, recolor=True, gain=None):
    folder = os.path.dirname(mhmat_path)
    d = _mhmat(mhmat_path)
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Sheen Weight"].default_value = sheen
    tex_name = d.get("diffuseTexture")
    if tex_name and os.path.exists(os.path.join(folder, tex_name)):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = _img(os.path.join(folder, tex_name))
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0; mix.inputs[7].default_value = (*tint, 1)
        if recolor:
            bw = nt.nodes.new("ShaderNodeRGBToBW")
            if gain is None:
                gain = 0.8 / max(0.02, _mean_lum(os.path.join(folder, tex_name)))
            g = nt.nodes.new("ShaderNodeMath"); g.operation = "MULTIPLY"; g.inputs[1].default_value = gain
            nt.links.new(t.outputs["Color"], bw.inputs["Color"]); nt.links.new(bw.outputs["Val"], g.inputs[0])
            nt.links.new(g.outputs["Value"], mix.inputs[6])
        else:
            nt.links.new(t.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    else:
        b.inputs["Base Color"].default_value = (*tint, 1)
    nrm = d.get("normalmapTexture") or d.get("bumpTexture")
    if nrm and os.path.exists(os.path.join(folder, nrm)):
        t = nt.nodes.new("ShaderNodeTexImage"); t.image = _img(os.path.join(folder, nrm), True)
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 0.8
        nt.links.new(t.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    add_wetness(m)
    return m


def add_wetness(m):
    """Darken/gloss everything below a keyable height (node 'WetLevel', armature-space metres) and
    sprinkle sand grit on it: clothes that have been in the quicksand."""
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    lvl = nt.nodes.new("ShaderNodeValue"); lvl.name = "WetLevel"; lvl.outputs[0].default_value = -1.0
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 18.0
    nt.links.new(tc.outputs["Object"], noise.inputs["Vector"])
    def op(o, a, b_):
        n = nt.nodes.new("ShaderNodeMath"); n.operation = o
        for i, v in enumerate((a, b_)):
            if isinstance(v, float):
                n.inputs[i].default_value = v
            else:
                nt.links.new(v, n.inputs[i])
        return n.outputs[0]
    edge = op("ADD", op("SUBTRACT", lvl.outputs[0], sep.outputs[2]), op("MULTIPLY", noise.outputs["Fac"], 0.06))
    wet = op("MULTIPLY", edge, 25.0); wet.node.use_clamp = True
    base_link = b.inputs["Base Color"].links[0].from_socket if b.inputs["Base Color"].is_linked else None
    dark = nt.nodes.new("ShaderNodeMix"); dark.data_type = "RGBA"; dark.blend_type = "MULTIPLY"
    nt.links.new(wet, dark.inputs[0]); dark.inputs[7].default_value = (0.36, 0.31, 0.26, 1)
    if base_link:
        nt.links.new(base_link, dark.inputs[6])
    else:
        dark.inputs[6].default_value = b.inputs["Base Color"].default_value
    grit = nt.nodes.new("ShaderNodeTexNoise"); grit.inputs["Scale"].default_value = 260.0
    nt.links.new(tc.outputs["Object"], grit.inputs["Vector"])
    gmask = op("MULTIPLY", op("MULTIPLY", op("SUBTRACT", grit.outputs["Fac"], 0.55), 6.0), wet); gmask.node.use_clamp = True
    sandy = nt.nodes.new("ShaderNodeMix"); sandy.data_type = "RGBA"
    nt.links.new(gmask, sandy.inputs[0]); nt.links.new(dark.outputs[2], sandy.inputs[6])
    sandy.inputs[7].default_value = (0.42, 0.34, 0.24, 1)
    nt.links.new(sandy.outputs[2], b.inputs["Base Color"])
    r0 = b.inputs["Roughness"].default_value
    rr = nt.nodes.new("ShaderNodeMix"); rr.data_type = "FLOAT"
    nt.links.new(wet, rr.inputs[0]); rr.inputs[2].default_value = r0; rr.inputs[3].default_value = 0.38
    nt.links.new(rr.outputs[0], b.inputs["Roughness"])


def set_wet(char, frame, level):
    for o in char["clothes"] + [char["body"]]:
        for m in o.data.materials:
            n = m.node_tree.nodes.get("WetLevel")
            if n:
                n.outputs[0].default_value = level
                n.outputs[0].keyframe_insert("default_value", frame=frame)


# ----------------------------------------------------------------------------- mhclo
def _parse_mhclo(path):
    info = {"refs": [], "delete": [], "scale": {}}
    mode = None
    for line in open(path, errors="ignore"):
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        key = s.split()[0]
        if key in ("x_scale", "y_scale", "z_scale"):
            a, b, dist = s.split()[1:4]
            info["scale"][key[0]] = (int(a), int(b), float(dist))
        elif key == "obj_file":
            info["obj"] = s.split(maxsplit=1)[1]
        elif key == "material":
            info["material"] = s.split(maxsplit=1)[1]
        elif key == "verts":
            mode = "verts"
        elif key == "delete_verts":
            mode = "delete"
        elif re.match(r"^[a-z_]+$", key):
            mode = None
        elif mode == "verts":
            p = s.split()
            if len(p) == 1:
                info["refs"].append(((int(p[0]),) * 3, (1.0, 0, 0), (0, 0, 0)))
            else:
                info["refs"].append((tuple(int(x) for x in p[0:3]), tuple(float(x) for x in p[3:6]),
                                     tuple(float(x) for x in p[6:9])))
        elif mode == "delete":
            toks = s.replace("-", " - ").split()
            i = 0
            while i < len(toks):
                if i + 2 < len(toks) and toks[i + 1] == "-":
                    info["delete"].extend(range(int(toks[i]), int(toks[i + 2]) + 1)); i += 3
                else:
                    info["delete"].append(int(toks[i])); i += 1
    return info


def _fit(info, mh):
    sc = []
    for ax, idx in (("x", 0), ("y", 1), ("z", 2)):
        a, b, dist = info["scale"][ax]
        sc.append(abs(mh[a, idx] - mh[b, idx]) / dist)
    sc = np.array(sc)
    refs = np.array([r[0] for r in info["refs"]]); w = np.array([r[1] for r in info["refs"]])
    off = np.array([r[2] for r in info["refs"]])
    return (w[:, :1] * mh[refs[:, 0]] + w[:, 1:2] * mh[refs[:, 1]] + w[:, 2:3] * mh[refs[:, 2]] + off * sc)


# ----------------------------------------------------------------------------- expressions
UNITS = os.path.join(MPFB, "targets", "expression", "units", "caucasian")
EXPRESSIONS = {
    "panic": {"eyebrows-left-inner-up": 1.0, "eyebrows-right-inner-up": 1.0, "eyebrows-left-up": 0.5,
              "eyebrows-right-up": 0.5, "eye-left-opened-up": 0.9, "eye-right-opened-up": 0.9,
              "mouth-open": 0.4, "mouth-depression-retraction": 0.45, "neck-platysma": 0.6},
    "strain": {"eyebrows-left-down": 0.9, "eyebrows-right-down": 0.9, "eye-left-slit": 0.7, "eye-right-slit": 0.7,
               "mouth-retraction": 0.8, "mouth-compression": 0.3, "nose-left-elevation": 0.5,
               "nose-right-elevation": 0.5, "neck-platysma": 0.8},
    "shock": {"eyebrows-left-up": 1.0, "eyebrows-right-up": 1.0, "eye-left-opened-up": 1.0,
              "eye-right-opened-up": 1.0, "mouth-open": 0.35},
    "worry": {"eyebrows-left-inner-up": 0.8, "eyebrows-right-inner-up": 0.8, "mouth-depression": 0.4,
              "mouth-compression": 0.3},
    "calm": {"eye-left-slit": 0.25, "eye-right-slit": 0.25, "eyebrows-left-inner-up": 0.2,
             "eyebrows-right-inner-up": 0.2},
    "exhale": {"eye-left-closure": 0.85, "eye-right-closure": 0.85, "mouth-open": 0.12, "mouth-pursing": 0.4},
    "smug": {"mouth-corner-puller": 0.75, "eyebrows-left-up": 0.35, "eye-left-slit": 0.3, "eye-right-slit": 0.3,
             "mouth-elevation": 0.2},
    "blink": {"eye-left-closure": 1.0, "eye-right-closure": 1.0},
}


def _expression_coords(mh_base, units):
    mh = mh_base.copy()
    for u, w in units.items():
        p = os.path.join(UNITS, u + ".target.gz")
        if os.path.exists(p):
            _apply_target(mh, p, w)
    return mh


def set_expression(char, frame, weights):
    """weights: {expression name: value}; any expression not named is keyed to 0."""
    for obj in [char["body"]] + char["face_proxies"]:
        kb = obj.data.shape_keys.key_blocks
        for name in EXPRESSIONS:
            kb[name].value = weights.get(name, 0.0)
            kb[name].keyframe_insert("value", frame=frame)


# ----------------------------------------------------------------------------- builder
OUTFIT_HIKER = [  # inner -> outer: (pack/clothes/folder, mhclo name, tint, push m)
    ("shoes01/clothes/toigo_ankle_boots_male", "toigo_ankle_boots_male", (0.36, 0.24, 0.14), 0.0),
    ("pants01/clothes/cortu_cargo_pants", "cortu_cargo_pants", (0.55, 0.48, 0.33), 0.004),
    ("shirts01/clothes/elvs_crude_t-shirt_male", "elvs_crude_t-shirt_male", (0.03, 0.11, 0.17), 0.008),
]


def build_human(name="Hiker", outfit=OUTFIT_HIKER, macro=None, skin="young_caucasian_male",
                eyes="brown", hair="short02", hair_tint=(0.24, 0.15, 0.09), brows="eyebrow001"):
    mh, uvs, faces, face_uvs = _parse_obj(os.path.join(MPFB, "3dobjs", "base.obj"), keep_groups={"body"})
    macro = macro or {"universal-male-young-averagemuscle-averageweight": 1.0, "caucasian-male-young": 1.0}
    for t, w in macro.items():
        _apply_target(mh, os.path.join(MPFB, "targets", "macrodetails", t + ".target.gz"), w)

    vg = json.load(open(os.path.join(MPFB, "mesh_metadata", "basemesh_vertex_groups.json")))
    body_idx = [i for a, b in vg["body"] for i in range(a, b + 1)]
    bl = _to_blender(mh)
    ground = bl[body_idx, 2].min()
    bl[:, 2] -= ground

    def conv(mh_coords):
        out = _to_blender(mh_coords); out[:, 2] -= ground
        return out

    body = _make_mesh(name + "_body", bl, faces, uvs, face_uvs)
    body.data.materials.append(skin_material(name + "_skin", os.path.join(SYS, "skins", skin, skin + ".mhmat")))

    # ---- rig
    rig = json.load(open(os.path.join(MPFB, "rigs", "standard", "rig.mixamo.json")))["bones"]

    def group_mean(gname):
        idx = [i for a, b in vg[gname] for i in range(a, b + 1)]
        return Vector(bl[idx].mean(axis=0))

    def pos(spec):
        if spec["strategy"] == "CUBE":
            return group_mean(spec["cube_name"])
        if spec["strategy"] == "MEAN":
            return Vector(bl[spec["vertex_indices"]].mean(axis=0))
        return Vector(bl[spec["vertex_index"]])

    arm_data = bpy.data.armatures.new(name + "_rig")
    arm = bpy.data.objects.new(name + "_rig", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for bname, spec in rig.items():
        eb = arm_data.edit_bones.new(bname)
        eb.head, eb.tail = pos(spec["head"]), pos(spec["tail"])
        eb.roll = spec.get("roll", 0.0)
    for bname, spec in rig.items():
        if spec["parent"]:
            eb = arm_data.edit_bones[bname]
            eb.parent = arm_data.edit_bones[spec["parent"]]
            eb.use_connect = spec.get("use_connect", False)
    bpy.ops.object.mode_set(mode="OBJECT")

    wj = json.load(open(os.path.join(MPFB, "rigs", "standard", "weights.mixamo.json")))["weights"]
    bones = list(wj.keys())
    W = np.zeros((len(bl), len(bones)), dtype=np.float32)
    for j, bname in enumerate(bones):
        for vi, w in wj[bname]:
            W[vi, j] = w

    def add_groups(obj, weights, thr):
        for j, bname in enumerate(bones):
            nz = np.nonzero(weights[:, j] > thr)[0]
            if len(nz):
                g = obj.vertex_groups.new(name=bname)
                for vi in nz:
                    g.add([int(vi)], float(weights[vi, j]), "REPLACE")

    add_groups(body, W, 1e-4)

    # ---- proxies and clothes share one fitting path
    body.data.update()
    body_n = {i: body.data.vertices[i].normal.copy() for i in body_idx}
    body_kd = KDTree(len(body_idx))
    for i in body_idx:
        body_kd.insert(Vector(bl[i]), i)
    body_kd.balance()

    def add_proxy(cdir, mhclo_name, label, material_fn, nearest=False):
        info = _parse_mhclo(os.path.join(cdir, mhclo_name + ".mhclo"))
        cv, cuv, cf, cfuv = _parse_obj(os.path.join(cdir, info["obj"]))
        pts = conv(_fit(info, mh))
        obj = _make_mesh(name + "_" + label, pts, cf, cuv, cfuv)
        matfile = info.get("material") or next(f for f in os.listdir(cdir) if f.endswith(".mhmat"))
        obj.data.materials.append(material_fn(os.path.normpath(os.path.join(cdir, matfile))))
        if nearest:
            # clothes: weights from the nearest skin that faces the same way (so the underside of a
            # sleeve binds to the inner arm, not to the torso next to it)
            CW = np.zeros((len(pts), W.shape[1]), dtype=np.float32)
            for k, v in enumerate(obj.data.vertices):
                hits = body_kd.find_n(v.co, 24)
                good = [(i, d) for _, i, d in hits if body_n[i].dot(v.normal) > 0.35][:4]
                if not good:
                    good = [(i, d) for _, i, d in hits[:2]]
                ws = np.array([1.0 / (d + 0.004) ** 2 for _, d in good])
                ids = np.array([i for i, _ in good])
                CW[k] = (W[ids] * ws[:, None]).sum(0) / ws.sum()
        else:
            refs = np.array([r[0] for r in info["refs"]]); wts = np.array([r[1] for r in info["refs"]])
            CW = W[refs[:, 0]] * wts[:, :1] + W[refs[:, 1]] * wts[:, 1:2] + W[refs[:, 2]] * wts[:, 2:3]
        add_groups(obj, CW, 1e-3)
        return obj, info

    face_proxies, proxy_infos = [], []
    eyes_obj, _ = add_proxy(os.path.join(SYS, "eyes", "high-poly"), "high-poly", "eyes",
                            lambda p: eye_material(name + "_eyes", os.path.join(SYS, "eyes", "materials", eyes + ".mhmat")))
    for cdir, nm, label, fn in (
        (os.path.join(SYS, "eyebrows", brows), brows, "brows",
         lambda p: alpha_material(name + "_brows", p, tint=(0.55, 0.45, 0.4), roughness=0.6)),
        (os.path.join(SYS, "eyelashes", "eyelashes01"), "eyelashes01", "lashes",
         lambda p: alpha_material(name + "_lashes", p, tint=(0.3, 0.25, 0.22), roughness=0.6)),
        (os.path.join(SYS, "teeth", "teeth_base"), "teeth_base", "teeth",
         lambda p: simple_texture_material(name + "_teeth", p, 0.3)),
    ):
        o, inf = add_proxy(cdir, nm, label, fn)
        face_proxies.append(o); proxy_infos.append(inf)
    hair_obj, _ = add_proxy(os.path.join(SYS, "hair", hair), hair, "hair",
                            lambda p: alpha_material(name + "_hair", p, tint=hair_tint, roughness=0.55))

    clothes, hide, cloth_pts = [], set(), []
    for folder, mhclo_name, tint, push in outfit:
        cdir = os.path.join(PACKS, folder)
        obj, info = add_proxy(cdir, mhclo_name, mhclo_name, lambda p, n=mhclo_name, t=tint: cloth_material(name + "_" + n, p, t),
                              nearest=True)
        hide.update(info["delete"])
        obj.data.update()
        for v in obj.data.vertices:
            cloth_pts.append((v.co.copy(), v.normal.copy()))
        if push:
            d = obj.modifiers.new("layer offset", "DISPLACE"); d.mid_level, d.strength = 0.0, push
        clothes.append(obj)

    if cloth_pts:
        kd = KDTree(len(cloth_pts))
        for i, (co, _) in enumerate(cloth_pts):
            kd.insert(co, i)
        kd.balance()
        arm_cols = [j for j, bname in enumerate(bones) if bname.endswith(("Arm", "ForeArm"))]
        arm_w = W[:, arm_cols].sum(1)
        for vi in body_idx:
            if arm_w[vi] > 0.35:  # keep arm skin under sleeves: no gaps when arms move away
                continue
            co = Vector(bl[vi])
            hit, idx, dist = kd.find(co)
            if dist < 0.06 and (co - hit).dot(cloth_pts[idx][1]) < 0.004:
                hide.add(vi)
        g = body.vertex_groups.new(name="hidden")
        g.add(sorted(hide), 1.0, "REPLACE")
        mask = body.modifiers.new("hide under clothes", "MASK")
        mask.vertex_group = "hidden"; mask.invert_vertex_group = True

    # ---- expression shape keys (body + face proxies refitted)
    body.shape_key_add(name="Basis", from_mix=False)
    for o in face_proxies:
        o.shape_key_add(name="Basis", from_mix=False)
    for ename, units in EXPRESSIONS.items():
        mh_e = _expression_coords(mh, units)
        k = body.shape_key_add(name=ename, from_mix=False)
        k.data.foreach_set("co", conv(mh_e).astype(np.float32).ravel())
        for o, inf in zip(face_proxies, proxy_infos):
            k = o.shape_key_add(name=ename, from_mix=False)
            k.data.foreach_set("co", conv(_fit(inf, mh_e)).astype(np.float32).ravel())

    for o in [body] + face_proxies:
        for k in o.data.shape_keys.key_blocks[1:]:
            k.value = 0.0

    parts = [body, eyes_obj, hair_obj] + face_proxies + clothes
    for obj in parts:
        obj.parent = arm
        mod = obj.modifiers.new("rig", "ARMATURE"); mod.object = arm
        if obj in [body] + clothes:
            sub = obj.modifiers.new("smooth", "SUBSURF"); sub.levels = 0; sub.render_levels = 1
    return {"arm": arm, "body": body, "eyes": eyes_obj, "hair": hair_obj, "face_proxies": face_proxies,
            "clothes": clothes, "parts": parts}
