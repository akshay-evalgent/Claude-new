"""The cast: the builder ("you") and the neighbour. Generic MakeHuman characters (CC0 data). The hard
hat and the sunglasses are modelled here and ride the head bone."""
import importlib.util, math, os
import bpy
import bmesh
from mathutils import Vector

import human
import sets as S

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("apple_cast", os.path.join(HERE, "..", "apple", "cast.py"))
_ac = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_ac)
mix, glasses = _ac.mix, _ac.glasses

SYSC = "makehuman_system_assets/clothes/"
OUT_BUILDER = [("shoes01/clothes/culturalibre_male_boots", "culturalibre_male_boots", (0.32, 0.22, 0.13), 0.0),
               ("pants01/clothes/cortu_cargo_pants", "cortu_cargo_pants", (0.36, 0.33, 0.24), 0.004),
               ("shirts01/clothes/elvs_crude_t-shirt_male", "elvs_crude_t-shirt_male", (0.95, 0.27, 0.02), 0.008)]
OUT_NEIGHBOR = [(SYSC + "shoes02", "shoes02", None, 0.0),
                ("pants01/clothes/toigo_wool_pants", "toigo_wool_pants", (0.42, 0.38, 0.3), 0.004),
                ("shirts01/clothes/namuhekam_male_polo_shirt", "namuhekam_male_polo_shirt", (0.55, 0.7, 0.82), 0.008),
                ("hats01/clothes/jujube_newsboy_cap", "jujube_newsboy_cap", (0.3, 0.28, 0.25), 0.004)]


def _head_frame(ch):
    """Centre between the eyes, the front of the eyes, and the eye height (world, rest pose)."""
    eyes = ch["eyes"]
    bpy.context.view_layer.update()
    pts = [eyes.matrix_world @ v.co for v in eyes.data.vertices]
    c = sum(pts, Vector()) / len(pts)
    return c, min(p.y for p in pts)


def _ride_head(ch, obj):
    bpy.context.view_layer.update()
    mw = obj.matrix_world.copy()
    obj.parent = ch["arm"]; obj.parent_type = "BONE"; obj.parent_bone = "mixamorig:Head"
    bpy.context.view_layer.update()
    obj.matrix_world = mw
    ch["parts"].append(obj)


def hard_hat(ch, name, col=(0.95, 0.68, 0.02)):
    """Shell (a squashed dome with a centre ridge) and a brim that is longer at the front."""
    c, front = _head_frame(ch)
    bm = bmesh.new()
    nu, nv = 40, 12
    rx, ry, h = 0.118, 0.138, 0.13
    rings = []
    for j in range(nv + 1):
        t = j / nv * (math.pi / 2)
        row = []
        for i in range(nu):
            a = 2 * math.pi * i / nu
            ridge = 0.012 * max(0.0, math.cos(a * 1.0)) ** 40 if False else 0.0
            x = rx * math.cos(t) * math.sin(a)
            y = ry * math.cos(t) * -math.cos(a)
            bump = 0.008 * math.exp(-((x / 0.018) ** 2)) * math.sin(t) ** 0.5     # the ridge along the crown
            row.append(bm.verts.new((x, y, h * math.sin(t) + bump)))
        rings.append(row)
    for j in range(nv):
        for i in range(nu):
            a, b = rings[j][i], rings[j][(i + 1) % nu]
            cc, d = rings[j + 1][(i + 1) % nu], rings[j + 1][i]
            if j == nv - 1:
                continue
            bm.faces.new((a, b, cc, d))
    top = bm.verts.new((0, 0, h + 0.008))
    for i in range(nu):
        bm.faces.new((rings[nv - 1][i], rings[nv - 1][(i + 1) % nu], top))
    # brim: from the shell edge outwards, wider at the front (-Y)
    outer = []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        fr = max(0.0, math.cos(a)) ** 2          # 1 at the front
        ex = 0.022 + 0.045 * fr
        x = (rx + ex) * math.sin(a); y = -(ry + ex) * math.cos(a)
        outer.append(bm.verts.new((x, y, -0.012 - 0.01 * fr)))
    for i in range(nu):
        bm.faces.new((rings[0][(i + 1) % nu], rings[0][i], outer[i], outer[(i + 1) % nu]))
    me = bpy.data.meshes.new(name + "_hardhat"); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(S.flat(name + "_hatplastic", col, 0.28, coat=0.4))
    hat = S.new_obj(name + "_hardhat", me)
    sol = hat.modifiers.new("thick", "SOLIDIFY"); sol.thickness = 0.006; sol.offset = 1.0
    hat.location = (c.x, c.y + 0.035, c.z + 0.045)
    hat.rotation_euler = (math.radians(-6), 0, 0)
    _ride_head(ch, hat)
    ch["hardhat"] = hat
    return hat


def sunglasses(ch, name):
    g = glasses(ch, name + "Sun", rim=(0.015, 0.015, 0.016), lens_w=0.056, lens_h=0.04)
    for lens in g.children:
        m = S.flat(name + "_sunlens", (0.01, 0.012, 0.015), 0.04)
        m.node_tree.nodes["Principled BSDF"].inputs["Coat Weight"].default_value = 1.0
        lens.data.materials[0] = m
        lens.visible_shadow = True
    ch["sunglasses"] = g
    return g


def builder():
    ch = human.build_human(exact_hide=True, name="Builder", outfit=OUT_BUILDER, skin="young_caucasian_male2",
                           hair="short02", hair_tint=(0.16, 0.1, 0.06), brows="eyebrow006", eyes="brown",
                           macro=mix(0.75, 0.25, muscle="averagemuscle"))
    hard_hat(ch, "Builder")
    sunglasses(ch, "Builder")
    return ch


def neighbor():
    ch = human.build_human(exact_hide=True, name="Neighbor", outfit=OUT_NEIGHBOR, skin="old_caucasian_male",
                           hair="short01", hair_tint=(0.6, 0.58, 0.55), hair_recolor=True, brows="eyebrow010",
                           eyes="blue", macro=mix(0.2, 0.8, weight="maxweight"))
    glasses(ch, "Neighbor", rim=(0.25, 0.2, 0.15))
    return ch
