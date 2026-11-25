"""The cast: Wayne at 41 (1976) and at 92 (today), the two young partners, the auctioneer and the bidders.
Generic MakeHuman characters (CC0 data), not likenesses. Glasses are modelled here and ride the head bone."""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix

import human
import sets as S

SYSC = "makehuman_system_assets/clothes/"
SHOES = (SYSC + "shoes01", "shoes01", None, 0.0)
SHOES_DARK = (SYSC + "shoes02", "shoes02", None, 0.0)


def mix(young, old, weight="averageweight", muscle="averagemuscle", sex="male"):
    return {f"universal-{sex}-young-{muscle}-{weight}": young, f"universal-{sex}-old-{muscle}-{weight}": old,
            f"caucasian-{sex}-young": young, f"caucasian-{sex}-old": old}


def glasses(ch, name, rim=(0.06, 0.045, 0.035), lens_w=0.052, lens_h=0.044, tint=0.0):
    """Big 1970s frames placed on the eyes and parented to the head bone."""
    eyes = ch["eyes"]
    bpy.context.view_layer.update()
    pts = [eyes.matrix_world @ v.co for v in eyes.data.vertices]
    left = [p for p in pts if p.x > 0]; right = [p for p in pts if p.x <= 0]
    cl = sum(left, Vector()) / len(left); cr = sum(right, Vector()) / len(right)
    front = min(p.y for p in pts)
    centre = (cl + cr) / 2
    half = (cl.x - cr.x) / 2
    bm = bmesh.new()

    def ring(cx, cz, w, h, r=0.0025, n=28):
        prev = None
        loops = []
        for i in range(n):
            a = 2 * math.pi * i / n
            # rounded rectangle-ish: superellipse
            c, s = math.cos(a), math.sin(a)
            x = cx + w / 2 * math.copysign(abs(c) ** 0.6, c)
            z = cz + h / 2 * math.copysign(abs(s) ** 0.6, s) - (0.004 if s < 0 else 0)
            loops.append(Vector((x, 0, z)))
        return loops

    def tube(path, r=0.0022, closed=True):
        n = 6
        rings = []
        for i, p in enumerate(path):
            q = path[(i + 1) % len(path)] if closed or i + 1 < len(path) else p + (p - path[i - 1])
            t = (q - p).normalized()
            u = t.cross(Vector((0, 1, 0)))
            if u.length < 1e-6:
                u = t.cross(Vector((1, 0, 0)))
            u.normalize(); v = t.cross(u)
            rings.append([bm.verts.new(p + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * r)
                          for k in range(n)])
        m = len(rings) if closed else len(rings) - 1
        for i in range(m):
            a, b = rings[i], rings[(i + 1) % len(rings)]
            for k in range(n):
                bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))

    lw, lh = lens_w, lens_h
    for sx in (1, -1):
        cx = sx * half
        tube(ring(cx, 0, lw, lh))
        # temple arm back to the ear
        tube([Vector((sx * (half + lw / 2), 0, 0.006)), Vector((sx * (half + lw / 2 + 0.008), 0.03, 0.008)),
              Vector((sx * (half + lw / 2 + 0.012), 0.09, 0.004)), Vector((sx * (half + lw / 2 + 0.01), 0.105, -0.012))],
             r=0.0018, closed=False)
    tube([Vector((-half + lw / 2 - 0.002, 0, 0.008)), Vector((0, -0.004, 0.012)), Vector((half - lw / 2 + 0.002, 0, 0.008))],
         r=0.0018, closed=False)
    me = bpy.data.meshes.new(name + "_glasses"); bm.to_mesh(me); bm.free()
    frame = S.flat(name + "_frame", rim, 0.35)
    frame.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 0.4
    me.materials.append(frame)
    for p in me.polygons:
        p.use_smooth = True
    g = S.new_obj(name + "_glasses", me)
    # lenses: thin discs, barely visible (a glint)
    lm = bpy.data.materials.new(name + "_lens"); lm.use_nodes = True
    b = lm.node_tree.nodes["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.02
    b.inputs["IOR"].default_value = 1.5; b.inputs["Base Color"].default_value = (1 - tint * 0.4, 1 - tint * 0.3, 1 - tint * 0.2, 1)
    for sx in (1, -1):
        bm = bmesh.new()
        r = ring(sx * half, 0, lw * 0.96, lh * 0.96)
        vs = [bm.verts.new(p) for p in r]
        bm.faces.new(vs)
        lme = bpy.data.meshes.new(f"{name}_lens{sx}"); bm.to_mesh(lme); bm.free(); lme.materials.append(lm)
        lo = S.new_obj(f"{name}_lens{sx}", lme); lo.parent = g
        lo.visible_shadow = False
    g.location = (centre.x, front - 0.016, centre.z + 0.004)
    bpy.context.view_layer.update()
    mw = g.matrix_world.copy()
    arm = ch["arm"]
    g.parent = arm; g.parent_type = "BONE"; g.parent_bone = "mixamorig:Head"
    bpy.context.view_layer.update()
    g.matrix_world = mw
    ch["parts"].append(g)
    ch["glasses"] = g
    return g


OUT_WAYNE41 = [SHOES_DARK, (SYSC + "male_casualsuit05", "male_casualsuit05", None, 0.004)]
OUT_STEVE_A = [SHOES,
               ("pants01/clothes/toigo_wool_pants", "toigo_wool_pants", (0.17, 0.22, 0.34), 0.004),
               ("shirts01/clothes/elvs_crude_t-shirt_male", "elvs_crude_t-shirt_male", (0.55, 0.38, 0.1), 0.008)]
OUT_STEVE_B = [SHOES, (SYSC + "male_casualsuit03", "male_casualsuit03", None, 0.004)]
OUT_WAYNE92 = [SHOES_DARK,
               ("pants01/clothes/toigo_wool_pants", "toigo_wool_pants", (0.34, 0.33, 0.31), 0.004),
               ("shirts01/clothes/toigo_fisherman_sweater", "toigo_fisherman_sweater", (0.62, 0.55, 0.44), 0.008)]
OUT_SUIT = [SHOES_DARK, (SYSC + "male_elegantsuit01", "male_elegantsuit01", None, 0.004)]
OUT_BIDDER_M = [SHOES, (SYSC + "male_casualsuit01", "male_casualsuit01", None, 0.004)]
OUT_BIDDER_F = [(SYSC + "shoes05", "shoes05", None, 0.0), (SYSC + "female_elegantsuit01", "female_elegantsuit01", None, 0.004)]
OUT_BIDDER_F2 = [(SYSC + "shoes06", "shoes06", None, 0.0), (SYSC + "female_casualsuit02", "female_casualsuit02", None, 0.004)]


def wayne41():
    ch = human.build_human(exact_hide=True, name="Wayne", outfit=OUT_WAYNE41, skin="middleage_caucasian_male", hair="short02",
                           hair_tint=(0.2, 0.15, 0.1), brows="eyebrow010", eyes="brown",
                           macro=mix(0.45, 0.55))
    glasses(ch, "Wayne", rim=(0.07, 0.05, 0.035))
    return ch


def wayne92():
    ch = human.build_human(exact_hide=True, name="OldWayne", outfit=OUT_WAYNE92, skin="old_caucasian_male", hair="short01",
                           hair_tint=(0.86, 0.85, 0.83), hair_recolor=True, brows="eyebrow010", eyes="brown",
                           macro=mix(0.0, 1.0, weight="minweight"))
    glasses(ch, "OldWayne", rim=(0.12, 0.12, 0.13))
    return ch


def steve_a():
    return human.build_human(exact_hide=True, name="SteveA", outfit=OUT_STEVE_A, skin="young_caucasian_male", hair="bob02",
                             hair_tint=(0.07, 0.05, 0.04), brows="eyebrow001", eyes="brown",
                             macro=mix(1.0, 0.0, weight="minweight"))


def steve_b():
    return human.build_human(exact_hide=True, name="SteveB", outfit=OUT_STEVE_B, skin="young_caucasian_male2", hair="short04",
                             hair_tint=(0.12, 0.08, 0.05), brows="eyebrow006", eyes="brown",
                             macro=mix(0.9, 0.1, weight="maxweight"))


def auctioneer():
    return human.build_human(exact_hide=True, name="Auctioneer", outfit=OUT_SUIT, skin="middleage_caucasian_male", hair="short04",
                             hair_tint=(0.35, 0.33, 0.31), brows="eyebrow003", macro=mix(0.4, 0.6))


def bidder(i):
    specs = [
        dict(outfit=OUT_BIDDER_M, skin="middleage_african_male", hair="short02", hair_tint=(0.05, 0.04, 0.04),
             macro=mix(0.6, 0.4)),
        dict(outfit=OUT_BIDDER_F, skin="young_caucasian_female", hair="bob02", hair_tint=(0.5, 0.33, 0.18),
             macro=mix(0.8, 0.2, sex="female")),
        dict(outfit=OUT_SUIT, skin="middleage_asian_male", hair="short03", hair_tint=(0.05, 0.05, 0.05),
             macro=mix(0.5, 0.5)),
        dict(outfit=OUT_BIDDER_F2, skin="middleage_caucasian_female", hair="ponytail01", hair_tint=(0.2, 0.13, 0.08),
             macro=mix(0.4, 0.6, sex="female")),
    ]
    return human.build_human(exact_hide=True, name=f"Bidder{i}", brows="eyebrow002", **specs[i % len(specs)])
