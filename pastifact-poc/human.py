"""Build a rigged, clothed 'mannequin' character from MakeHuman CC0 data files.

Reads only data: the hm08 base mesh, macro targets, the Mixamo-compatible rig and its weights
(from the MPFB data folder) and MakeHuman .mhclo clothes. No add-on code is run.
"""
import gzip, json, os, re
import numpy as np
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

SCRATCH = os.environ["POC_SCRATCH"]
MPFB = os.path.join(SCRATCH, "dl", "mpfb", "data")
PACKS = os.path.join(SCRATCH, "dl", "packs")
SCALE = 0.1  # MakeHuman decimetres -> metres


# ----------------------------------------------------------------------------- base mesh
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


def _apply_target(coords, path, weight):
    with gzip.open(path, "rt") as f:
        for line in f:
            p = line.split()
            if len(p) == 4:
                coords[int(p[0])] += weight * np.array([float(p[1]), float(p[2]), float(p[3])])


def _to_blender(mh):
    return np.stack([mh[:, 0], -mh[:, 2], mh[:, 1]], axis=1) * SCALE


def _make_mesh(name, verts, faces, uvs, face_uvs):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    if uvs:
        uvl = me.uv_layers.new(name="UVMap")
        k = 0
        for poly, fu in zip(me.polygons, face_uvs):
            for li, t in zip(poly.loop_indices, fu):
                if t >= 0:
                    uvl.data[li].uv = uvs[t]
            k += 1
    for p in me.polygons:
        p.use_smooth = True
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


# ----------------------------------------------------------------------------- materials
def mannequin_material(name="Mannequin"):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.80, 0.79, 0.77, 1)
    b.inputs["Roughness"].default_value = 0.42
    b.inputs["Subsurface Weight"].default_value = 0.08
    b.inputs["Subsurface Radius"].default_value = (0.4, 0.3, 0.25)
    b.inputs["Subsurface Scale"].default_value = 0.02
    return m


def _mhmat(path):
    d = {}
    for line in open(path, errors="ignore"):
        p = line.split(maxsplit=1)
        if len(p) == 2 and not line.startswith(("#", "//")):
            d[p[0]] = p[1].strip()
    return d


def cloth_material(name, mhmat_path, tint=(1, 1, 1), roughness=0.85, sheen=0.25, recolor=True):
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
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(folder, tex_name))
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1)
        if recolor:
            bw = nt.nodes.new("ShaderNodeRGBToBW")
            gain = nt.nodes.new("ShaderNodeMath"); gain.operation = "MULTIPLY"; gain.inputs[1].default_value = 1.8
            nt.links.new(t.outputs["Color"], bw.inputs["Color"])
            nt.links.new(bw.outputs["Val"], gain.inputs[0])
            nt.links.new(gain.outputs["Value"], mix.inputs[6])
        else:
            nt.links.new(t.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    else:
        b.inputs["Base Color"].default_value = (*tint, 1)
    nrm = d.get("normalmapTexture") or d.get("bumpTexture")
    if nrm and os.path.exists(os.path.join(folder, nrm)):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(folder, nrm))
        t.image.colorspace_settings.name = "Non-Color"
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.8
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


# ----------------------------------------------------------------------------- clothes
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
            mode = None if key not in ("verts", "delete_verts") else mode
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
                    info["delete"].extend(range(int(toks[i]), int(toks[i + 2]) + 1))
                    i += 3
                else:
                    info["delete"].append(int(toks[i]))
                    i += 1
    return info


def _fit(info, mh):
    sc = []
    for ax, idx in (("x", 0), ("y", 1), ("z", 2)):
        a, b, dist = info["scale"][ax]
        sc.append(abs(mh[a, idx] - mh[b, idx]) / dist)
    sc = np.array(sc)
    out = np.zeros((len(info["refs"]), 3))
    for i, (v, w, d) in enumerate(info["refs"]):
        out[i] = w[0] * mh[v[0]] + w[1] * mh[v[1]] + w[2] * mh[v[2]] + np.array(d) * sc
    return out


def _hide_inner_layers(clothes):
    for i, inner in enumerate(clothes):
        outers = clothes[i + 1:]
        if not outers or "boots" not in inner.name:  # only boots get trimmed (under the trouser hem)
            continue
        pts = [(v.co.copy(), v.normal.copy()) for o in outers for v in o.data.vertices]
        kd = KDTree(len(pts))
        for k, (co, _) in enumerate(pts):
            kd.insert(co, k)
        kd.balance()
        hidden = []
        for v in inner.data.vertices:
            hit, k, dist = kd.find(v.co)
            if dist < 0.04 and (v.co - hit).dot(pts[k][1]) < 0.003:
                hidden.append(v.index)
        if hidden:
            g = inner.vertex_groups.new(name="hidden")
            g.add(hidden, 1.0, "REPLACE")
            m = inner.modifiers.new("hide under outer", "MASK")
            m.vertex_group = "hidden"
            m.invert_vertex_group = True


# ----------------------------------------------------------------------------- main builder
def build_human(name="Man", outfit=None, macro=None, location=(0, 0, 0), rotation_z=0.0):
    """outfit: list of (pack/clothes/folder, mhclo name, tint rgb). Returns (armature, body, clothes)."""
    mh, uvs, faces, face_uvs = _parse_obj(os.path.join(MPFB, "3dobjs", "base.obj"),
                                         keep_groups={"body", "helper-l-eye", "helper-r-eye"})
    macro = macro or {"universal-male-young-averagemuscle-averageweight": 1.0, "caucasian-male-young": 1.0}
    for t, w in macro.items():
        _apply_target(mh, os.path.join(MPFB, "targets", "macrodetails", t + ".target.gz"), w)

    bl = _to_blender(mh)
    vg = json.load(open(os.path.join(MPFB, "mesh_metadata", "basemesh_vertex_groups.json")))
    body_idx = [i for a, b in vg["body"] for i in range(a, b + 1)]
    ground = bl[body_idx, 2].min()
    bl[:, 2] -= ground

    body = _make_mesh(name + "_body", bl, faces, uvs, face_uvs)
    body.data.materials.append(mannequin_material())

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

    # ---- weights
    wj = json.load(open(os.path.join(MPFB, "rigs", "standard", "weights.mixamo.json")))["weights"]
    bones = list(wj.keys())
    W = np.zeros((len(bl), len(bones)), dtype=np.float32)
    for j, bname in enumerate(bones):
        for vi, w in wj[bname]:
            W[vi, j] = w
    for j, bname in enumerate(bones):
        g = body.vertex_groups.new(name=bname)
        nz = np.nonzero(W[:, j] > 1e-4)[0]
        for vi in nz:
            g.add([int(vi)], float(W[vi, j]), "REPLACE")

    # ---- clothes
    clothes = []
    hide = set()
    cloth_pts = []
    for folder, mhclo_name, tint in (outfit or []):
        cdir = os.path.join(PACKS, folder)
        info = _parse_mhclo(os.path.join(cdir, mhclo_name + ".mhclo"))
        cv, cuv, cf, cfuv = _parse_obj(os.path.join(cdir, info["obj"]))
        fitted = _to_blender(_fit(info, mh))
        fitted[:, 2] -= ground
        obj = _make_mesh(name + "_" + mhclo_name, fitted, cf, cuv, cfuv)
        matfile = info.get("material") or next(f for f in os.listdir(cdir) if f.endswith(".mhmat"))
        obj.data.materials.append(cloth_material(name + "_" + mhclo_name, os.path.join(cdir, matfile), tint))
        # interpolate weights from the three reference body vertices
        refs = np.array([r[0] for r in info["refs"]])
        wts = np.array([r[1] for r in info["refs"]])
        CW = (W[refs[:, 0]] * wts[:, :1] + W[refs[:, 1]] * wts[:, 1:2] + W[refs[:, 2]] * wts[:, 2:3])
        for j, bname in enumerate(bones):
            nz = np.nonzero(CW[:, j] > 1e-3)[0]
            if len(nz):
                g = obj.vertex_groups.new(name=bname)
                for vi in nz:
                    g.add([int(vi)], float(CW[vi, j]), "REPLACE")
        hide.update(info["delete"])
        obj.data.update()
        for v in obj.data.vertices:
            cloth_pts.append((v.co.copy(), v.normal.copy()))
        clothes.append(obj)

    # hide body vertices that sit inside clothing (avoids skin poking through when posed)
    if cloth_pts:
        kd = KDTree(len(cloth_pts))
        for i, (co, _) in enumerate(cloth_pts):
            kd.insert(co, i)
        kd.balance()
        for vi in body_idx:
            co = Vector(bl[vi])
            hit, idx, dist = kd.find(co)
            if dist < 0.06 and (co - hit).dot(cloth_pts[idx][1]) < 0.004:
                hide.add(vi)
        g = body.vertex_groups.new(name="hidden")
        g.add(sorted(hide), 1.0, "REPLACE")
        mask = body.modifiers.new("hide under clothes", "MASK")
        mask.vertex_group = "hidden"
        mask.invert_vertex_group = True

    _hide_inner_layers(clothes)

    for obj in clothes:  # outer layers sit a few mm proud so inner layers never poke through
        push = 0.012 if "sweater" in obj.name else 0.006 if "pants" in obj.name else 0.0
        if push:
            d = obj.modifiers.new("layer offset", "DISPLACE")
            d.mid_level, d.strength = 0.0, push

    for obj in [body] + clothes:
        obj.parent = arm
        mod = obj.modifiers.new("rig", "ARMATURE")
        mod.object = arm
        sub = obj.modifiers.new("smooth", "SUBSURF")
        sub.levels = 0
        sub.render_levels = 1

    arm.location = location
    arm.rotation_euler = (0, 0, rotation_z)
    return arm, body, clothes


DEFAULT_OUTFIT = [  # inner -> outer
    ("shoes01/clothes/toigo_ankle_boots_male", "toigo_ankle_boots_male", (0.30, 0.20, 0.13)),
    ("pants01/clothes/toigo_wool_pants", "toigo_wool_pants", (0.50, 0.38, 0.18)),
    ("shirts01/clothes/toigo_fisherman_sweater", "toigo_fisherman_sweater", (0.13, 0.19, 0.33)),
    ("hats01/clothes/jujube_newsboy_cap", "jujube_newsboy_cap", (0.22, 0.20, 0.19)),
]
