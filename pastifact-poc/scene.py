"""Proof of concept: 5-second Pastifact-style short, 'Why Amsterdam houses lean forward'.

Builds the whole shot in Blender from code: canal houses, quay, props, a clothed mannequin
character, animation and two cameras. Renders a PNG sequence with Cycles.

usage: python3 -I scene.py preview|render [width height samples]
"""
import math, os, random, sys
from collections import defaultdict
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Euler
import human, posing

SCRATCH = os.environ["POC_SCRATCH"]
A = os.path.join(SCRATCH, "assets")
FPS = 24
F_END = 5 * FPS                        # 5 seconds
CUT = int(2.4 * FPS) + 1               # shot A = 1..CUT-1, shot B = CUT..F_END
HERO_X = 0.0                           # x centre of the hero house (the one with the crate)
CRATE_H = 0.8                          # wooden_crate_01 height (m), checked in preview
rng = random.Random(7)


# =================================================================== materials
def _img(path, non_color=False):
    im = bpy.data.images.load(path, check_existing=True)
    if non_color:
        im.colorspace_settings.name = "Non-Color"
    return im


def pbr(name, tex, size=2.0, tint=None, rough_mul=1.0, bump=1.0):
    """Box-projected Poly Haven material; `size` = metres covered by one texture tile."""
    key = f"{name}"
    if key in bpy.data.materials:
        return bpy.data.materials[key]
    m = bpy.data.materials.new(key)
    nt = m.node_tree if m.node_tree else None
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / size,) * 3
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    d = os.path.join(A, "tex", tex)

    def tex_node(fn, nc):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = _img(os.path.join(d, fn), nc)
        t.projection = "BOX"
        t.projection_blend = 0.15
        nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    diff = tex_node("diff.jpg", False)
    if tint:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[7].default_value = (*tint, 1)
        nt.links.new(diff.outputs["Color"], mix.inputs[6])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    else:
        nt.links.new(diff.outputs["Color"], b.inputs["Base Color"])
    if os.path.exists(os.path.join(d, "rough.jpg")):
        r = tex_node("rough.jpg", True)
        if rough_mul != 1.0:
            mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = rough_mul
            nt.links.new(r.outputs["Color"], mm.inputs[0]); nt.links.new(mm.outputs[0], b.inputs["Roughness"])
        else:
            nt.links.new(r.outputs["Color"], b.inputs["Roughness"])
    if os.path.exists(os.path.join(d, "nor.jpg")):
        n = tex_node("nor.jpg", True)
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
        nt.links.new(n.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m


def flat(name, color, rough=0.5, metal=0.0):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def glass():
    if "Glass" in bpy.data.materials:
        return bpy.data.materials["Glass"]
    m = bpy.data.materials.new("Glass"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (0.55, 0.58, 0.6, 1)
    gl = nt.nodes.new("ShaderNodeBsdfGlossy"); gl.inputs["Roughness"].default_value = 0.03
    lw = nt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.55
    mx = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lw.outputs["Fresnel"], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(gl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    return m


def water():
    m = bpy.data.materials.new("Water"); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.015, 0.035, 0.035, 1)
    b.inputs["Roughness"].default_value = 0.04
    b.inputs["IOR"].default_value = 1.33
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 3.0
    noise.inputs["Detail"].default_value = 6
    bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


# =================================================================== geometry helpers
class MB:
    """Accumulates boxes / extruded outlines per material and emits one object per material."""

    def __init__(self):
        self.parts = defaultdict(lambda: ([], []))

    def box(self, mat, mn, mx):
        v, f = self.parts[mat]
        o = len(v)
        (x0, y0, z0), (x1, y1, z1) = mn, mx
        v += [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
              (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        for q in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (3, 0, 4, 7), (1, 2, 6, 5)):
            f.append(tuple(o + i for i in q))

    def outline(self, mat, pts, y0, y1, z_off=0.0):
        """Extrude a 2D (x, z) polygon (counter-clockwise seen from the front, -Y) between y0 and y1."""
        area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
                   for i in range(len(pts)))
        if area < 0:
            pts = list(reversed(pts))
        v, f = self.parts[mat]
        o = len(v); n = len(pts)
        v += [(x, y0, z + z_off) for x, z in pts] + [(x, y1, z + z_off) for x, z in pts]
        f.append(tuple(o + i for i in range(n)))                     # front (faces -Y)
        f.append(tuple(o + n + i for i in reversed(range(n))))       # back
        for i in range(n):
            j = (i + 1) % n
            f.append((o + i, o + n + i, o + n + j, o + j))

    def prism_roof(self, mat, w, y0, y1, z0, h):
        v, f = self.parts[mat]
        o = len(v)
        v += [(-w / 2, y0, z0), (w / 2, y0, z0), (0, y0, z0 + h), (-w / 2, y1, z0), (w / 2, y1, z0), (0, y1, z0 + h)]
        f += [(o, o + 1, o + 2), (o + 5, o + 4, o + 3), (o + 1, o + 4, o + 5, o + 2), (o + 3, o, o + 2, o + 5)]

    def build(self, name, parent=None, bevel_mats=()):
        objs = []
        for mat, (v, f) in self.parts.items():
            me = bpy.data.meshes.new(f"{name}_{mat.name}")
            me.from_pydata(v, [], f); me.update(); me.validate()
            me.materials.append(mat)
            ob = bpy.data.objects.new(me.name, me)
            bpy.context.scene.collection.objects.link(ob)
            ob.parent = parent
            if mat.name in bevel_mats:
                bv = ob.modifiers.new("bevel", "BEVEL"); bv.width = 0.012; bv.segments = 2
                bv.limit_method = "ANGLE"; bv.harden_normals = False
            objs.append(ob)
        return objs


def wall_with_holes(mb, mat, x0, x1, z0, z1, y0, y1, holes):
    """Wall slab split into cells around rectangular holes (x0, x1, z0, z1)."""
    xs = sorted({x0, x1, *[h[0] for h in holes], *[h[1] for h in holes]})
    zs = sorted({z0, z1, *[h[2] for h in holes], *[h[3] for h in holes]})
    for i in range(len(xs) - 1):
        for j in range(len(zs) - 1):
            cx, cz = (xs[i] + xs[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2
            if any(h[0] < cx < h[1] and h[2] < cz < h[3] for h in holes):
                continue
            mb.box(mat, (xs[i], y0, zs[j]), (xs[i + 1], y1, zs[j + 1]))


def curve_pts(p0, p1, bulge, n=10):
    """Quadratic curve from p0 to p1 bowed by `bulge` (perpendicular offset of the control point)."""
    (x0, z0), (x1, z1) = p0, p1
    mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
    dx, dz = x1 - x0, z1 - z0
    L = math.hypot(dx, dz) or 1
    cx, cz = mx - dz / L * bulge, mz + dx / L * bulge
    out = []
    for k in range(1, n + 1):
        t = k / n
        out.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
                    (1 - t) ** 2 * z0 + 2 * (1 - t) * t * cz + t * t * z1))
    return out


def gable_outline(kind, w):
    hw = w / 2
    if kind == "step":
        n, sh = 4, 0.95
        dx = (hw - 0.75) / n
        left = [(-hw, 0.0)]
        for k in range(n):
            x = -hw + k * dx
            left += [(x, (k + 1) * sh), (x + dx, (k + 1) * sh)]
        top = n * sh + 0.9
        left += [(-0.75, top)]
        right = [(-x, z) for x, z in reversed(left)]
        return left + right[0:], top
    if kind == "bell":
        nh = 1.25
        left = [(-hw, 0.0)] + curve_pts((-hw, 0.0), (-nh, 2.4), 0.55)
        left += [(-nh, 3.4)]
        top_arc = [(-nh * math.cos(a), 3.4 + 1.35 * math.sin(a)) for a in [i * math.pi / 14 for i in range(1, 14)]]
        right = [(nh, 3.4), (nh, 2.4)] + [(-x, z) for x, z in reversed(curve_pts((-hw, 0.0), (-nh, 2.4), 0.55))][1:] + [(hw, 0.0)]
        return left + top_arc + right, 4.75
    # neck gable with triangular pediment
    nh = 1.2
    left = [(-hw, 0.0)] + curve_pts((-hw, 0.0), (-nh, 2.1), -0.45)
    pts = left + [(-nh, 3.6), (-nh - 0.18, 3.6), (0, 4.6), (nh + 0.18, 3.6), (nh, 3.6)]
    pts += [(-x, z) for x, z in reversed(left)]
    return pts, 4.6


# =================================================================== houses
WHITE = None


def window(mb, mats, x0, x1, z0, z1, recess=0.13, panes=(2, 2), split=0.52):
    """White sash window recessed into an opening. Front of the facade is y=0."""
    fy0, fy1 = recess - 0.04, recess + 0.04
    fw = 0.075
    mb.box(mats["white"], (x0, fy0, z0), (x0 + fw, fy1, z1))
    mb.box(mats["white"], (x1 - fw, fy0, z0), (x1, fy1, z1))
    mb.box(mats["white"], (x0, fy0, z1 - fw), (x1, fy1, z1))
    mb.box(mats["white"], (x0, fy0, z0), (x1, fy1, z0 + fw * 1.4))
    zm = z0 + (z1 - z0) * split
    mb.box(mats["white"], (x0, fy0 - 0.02, zm - 0.035), (x1, fy1 - 0.02, zm + 0.035))
    # glazing bars
    for sz0, sz1 in ((z0 + fw * 1.4, zm - 0.035), (zm + 0.035, z1 - fw)):
        for k in range(1, panes[0]):
            x = x0 + fw + (x1 - x0 - 2 * fw) * k / panes[0]
            mb.box(mats["white"], (x - 0.018, fy0 + 0.02, sz0), (x + 0.018, fy1 - 0.02, sz1))
        for k in range(1, panes[1]):
            z = sz0 + (sz1 - sz0) * k / panes[1]
            mb.box(mats["white"], (x0 + fw, fy0 + 0.02, z - 0.016), (x1 - fw, fy1 - 0.02, z + 0.016))
    mb.box(mats["glass"], (x0 + fw, recess - 0.005, z0 + fw), (x1 - fw, recess + 0.005, z1 - fw))
    # stone sill
    mb.box(mats["stone"], (x0 - 0.06, -0.06, z0 - 0.09), (x1 + 0.06, recess, z0))
    # dim interior behind the glass
    mb.box(mats["interior"], (x0 - 0.3, 1.05, z0 - 0.5), (x1 + 0.3, 1.1, z1 + 0.3))
    mb.box(mats["curtain"], (x0 + 0.05, 0.6, z0 + 0.2), (x0 + 0.35, 0.65, z1 - 0.1))


def house(i, x_left, w, floors, brick, kind, lean, hero=False):
    root = bpy.data.objects.new(f"house{i}", None)
    bpy.context.scene.collection.objects.link(root)
    root.location = (x_left + w / 2, 0, 0)
    root.rotation_euler = (math.radians(lean), 0, 0)
    mats = MATS | {"brick": brick}
    mb = MB()
    hw = w / 2
    T = 0.32                         # facade thickness
    gz = 0.45                        # ground floor raised above the street
    hts = [3.7] + [3.05] * (floors - 1)
    H = gz + sum(hts)
    # plinth
    mb.box(mats["stone"], (-hw, -0.04, 0), (hw, T, gz))
    z = gz
    for f, h in enumerate(hts):
        holes = []
        if f == 0:
            dw = 1.15
            door_x = -hw + 0.55 if i % 2 else hw - 0.55 - dw
            holes.append((door_x, door_x + dw, z, z + 2.55))
            holes.append((door_x, door_x + dw, z + 2.7, z + 3.3))        # transom
            n = 2 if w > 5.2 else 1
            free = [(-hw + 0.5, door_x - 0.45), (door_x + dw + 0.45, hw - 0.5)]
            free = [s for s in free if s[1] - s[0] > 1.3]
            for a, b in free[:n]:
                c = (a + b) / 2
                holes.append((c - 0.7, c + 0.7, z + 0.75, z + 3.25))
        else:
            n = 3 if w > 5.0 else 2
            ww = 1.12
            gap = (w - n * ww) / (n + 1)
            for k in range(n):
                x0 = -hw + gap + k * (ww + gap)
                holes.append((x0, x0 + ww, z + 0.72, z + 2.62))
        wall_with_holes(mb, mats["brick"], -hw, hw, z, z + h, 0, T, holes)
        for (x0, x1, z0, z1) in holes:
            if f == 0 and abs(z1 - z0 - 2.55) < 0.01:      # door
                mb.box(mats["door"], (x0, 0.18, z0), (x1, 0.24, z1))
                mb.box(mats["white"], (x0 - 0.07, -0.02, z0), (x0, T, z1 + 0.07))
                mb.box(mats["white"], (x1, -0.02, z0), (x1 + 0.07, T, z1 + 0.07))
                mb.box(mats["white"], (x0, 0.1, z1), (x1, T, z1 + 0.15))
                mb.box(mats["brass"], (x1 - 0.2, 0.15, z0 + 1.1), (x1 - 0.14, 0.18, z0 + 1.16))
                for s in range(3):                                   # stoop steps
                    mb.box(mats["stone"], (x0 - 0.25, -0.35 * (3 - s), 0.15 * s), (x1 + 0.25, 0.18, 0.15 * (s + 1)))
            elif f == 0 and z1 - z0 < 0.7:
                window(mb, mats, x0, x1, z0, z1, panes=(3, 1), split=0.0)
            else:
                window(mb, mats, x0, x1, z0, z1, panes=(2, 3 if f == 0 else 2))
        # thin stone string course between floors
        if f > 0:
            mb.box(mats["stone"], (-hw, -0.05, z - 0.06), (hw, T, z + 0.04))
        z += h
    # cornice band + gable
    mb.box(mats["white"], (-hw - 0.05, -0.12, H - 0.08), (hw + 0.05, T, H + 0.12))
    pts, gh = gable_outline(kind, w)
    mb.outline(mats["brick"], pts, 0.0, T, z_off=H + 0.12)
    big = [(x * 1.0 + (0.07 if x > 0 else -0.07), z + 0.07) for x, z in pts]
    mb.outline(mats["white"], big, 0.06, T - 0.02, z_off=H + 0.12)
    # loft door under the hoist beam
    lz = H + 0.12 + 0.45
    mb.box(mats["shutter"], (-0.5, 0.1, lz), (0.5, 0.16, lz + 1.7))
    mb.box(mats["white"], (-0.58, -0.02, lz - 0.05), (0.58, T, lz))
    mb.box(mats["white"], (-0.58, -0.02, lz + 1.7), (0.58, T, lz + 1.78))
    # hoist beam with hook
    bz = H + 0.12 + min(gh - 0.5, 2.9)
    mb.box(mats["wood"], (-0.11, -1.25, bz - 0.11), (0.11, T + 0.3, bz + 0.11))
    mb.box(mats["iron"], (-0.02, -1.13, bz - 0.35), (0.02, -1.09, bz - 0.11))
    # body behind the facade + roof
    mb.box(mats["brick"], (-hw, T, gz), (-hw + 0.3, 12, H))
    mb.box(mats["brick"], (hw - 0.3, T, gz), (hw, 12, H))
    mb.box(mats["interior"], (-hw, 1.1, 0), (hw, 12, H))
    mb.prism_roof(mats["roof"], w - 0.2, T + 0.1, 11.8, H + 0.12, gh * 0.85)
    mb.build(f"house{i}", root, bevel_mats=("PaintWhite", "Sandstone"))
    return root, H, bz


# =================================================================== props
def import_gltf(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(A, "models", name, name + ".gltf"))
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name + "_root", None)
    bpy.context.scene.collection.objects.link(root)
    for o in new:
        if o.parent is None:
            o.parent = root
    return root


def cylinder(name, mat, r, h, loc, segs=20):
    import bmesh
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob.location = (loc[0], loc[1], loc[2] + h / 2)
    return ob


# =================================================================== build
def build():
    global MATS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    MATS = {
        "white": flat("PaintWhite", (0.86, 0.86, 0.83), 0.45),
        "stone": pbr("Sandstone", "large_sandstone_blocks", 2.5, tint=(1.05, 1.02, 0.95)),
        "glass": glass(),
        "interior": flat("Interior", (0.07, 0.055, 0.045), 0.9),
        "curtain": flat("Curtain", (0.55, 0.5, 0.4), 0.9),
        "door": pbr("DoorGreen", "green_rough_planks", 1.6, tint=(0.35, 0.6, 0.45)),
        "shutter": pbr("ShutterGreen", "green_rough_planks", 1.2, tint=(0.3, 0.5, 0.38)),
        "wood": pbr("BeamWood", "dark_wooden_planks", 1.0),
        "roof": pbr("Roof", "roof_planks", 2.0, tint=(0.35, 0.33, 0.33)),
        "iron": flat("Iron", (0.05, 0.05, 0.05), 0.4, 1.0),
        "brass": flat("Brass", (0.8, 0.6, 0.25), 0.3, 1.0),
    }
    bricks = [pbr("Brick_red", "red_brick_03", 1.2), pbr("Brick_dark", "dark_brick_wall", 1.3),
              pbr("Brick_brown", "brown_brick_02", 1.0, tint=(0.72, 0.46, 0.36)), pbr("Brick_medieval", "medieval_red_brick", 1.2, tint=(0.82, 0.55, 0.45))]

    # ---- row of canal houses (hero house is centred on HERO_X)
    widths = [5.4, 4.8, 6.0, 5.2, 5.6, 4.9, 5.8, 5.0, 6.2, 5.3]
    kinds = ["neck", "step", "bell", "step", "neck", "bell", "step", "neck", "bell", "step"]
    floors = [4, 4, 4, 5, 4, 4, 5, 4, 4, 4]
    leans = [2.2, 3.4, 4.0, 2.6, 3.8, 2.4, 3.1, 2.0, 3.6, 2.8]
    hero_i = 2
    x = HERO_X - widths[hero_i] / 2 - sum(widths[:hero_i])
    hero = None
    for i, w in enumerate(widths):
        root, H, bz = house(i, x, w, floors[i], bricks[i % 4], kinds[i], leans[i], hero=(i == hero_i))
        if i == hero_i:
            hero = (root, H, bz)
        x += w

    # ---- quay: brick pavement, kerb, quay wall, water, bollards
    mb = MB()
    mb.box(pbr("Pavement", "brick_pavement_02", 2.2), (-40, -7.0, -0.2), (60, 0.6, 0.0))
    mb.box(MATS["stone"], (-40, -7.35, -0.25), (60, -6.95, 0.06))
    mb.box(pbr("QuayBrick", "dark_brick_wall", 1.6), (-40, -7.4, -2.0), (60, -7.0, -0.25))
    mb.build("quay", bevel_mats=("Sandstone",))
    wp = bpy.data.meshes.new("water"); wp.from_pydata([(-40, -60, -1.1), (60, -60, -1.1), (60, -7.0, -1.1), (-40, -7.0, -1.1)], [], [(0, 1, 2, 3)])
    wp.materials.append(water()); sc.collection.objects.link(bpy.data.objects.new("water", wp))
    bollard = flat("BollardRed", (0.23, 0.05, 0.04), 0.35)
    for bx in [x0 * 1.9 - 20 for x0 in range(28)]:
        cylinder("bollard", bollard, 0.075, 0.82, (bx, -6.55, 0.0))
        cylinder("bollard_top", bollard, 0.09, 0.08, (bx, -6.55, 0.78))
    # far bank: simple dark house blocks for depth
    far = MB()
    xx = -40
    while xx < 60:
        fw = rng.uniform(4.5, 6.5); fh = rng.uniform(12, 17)
        far.box(bricks[rng.randrange(4)], (xx, -46, 0), (xx + fw, -34, fh))
        xx += fw
    far.box(MATS["stone"], (-40, -34, -1.5), (60, -32, 0))
    far.build("farbank")

    # ---- props
    hx = HERO_X
    try:
        b = import_gltf("wooden_barrels_01"); b.location = (hx + 2.0, -0.9, 0); b.rotation_euler = (0, 0, 0.4)
        c2 = import_gltf("wooden_crate_01"); c2.location = (hx - 2.3, -1.0, 0); c2.rotation_euler = (0, 0, 0.2)
        bk = import_gltf("wooden_bucket_01"); bk.location = (hx - 1.6, -1.6, 0)
        wb = import_gltf("wine_barrel_01"); wb.location = (hx + 3.1, -1.8, 0); wb.rotation_euler = (0, 0, 1.2)
    except Exception as e:  # props are optional
        print("prop import failed:", e)

    # ---- hoisted crate on the hero house (hangs straight down from the leaning beam)
    root, H, bz = hero
    bpy.context.view_layer.update()
    hook = root.matrix_world @ Vector((0.0, -1.11, bz - 0.35))
    crate = import_gltf("wooden_crate_01")
    crate.scale = (0.9, 0.9, 0.9)
    crate.rotation_euler = (0, 0, 0.15)
    rope = cylinder("rope", flat("Rope", (0.45, 0.36, 0.22), 0.9), 0.018, 1.0, (0, 0, -0.5), segs=8)
    for fr, cz in ((1, 3.6), (CUT, 5.0), (F_END, 7.0)):
        crate.location = (hook.x - 0.25, hook.y - 0.22, cz)
        crate.keyframe_insert("location", frame=fr)
        top = cz + CRATE_H * 0.9
        L = hook.z - top
        rope.location = (hook.x, hook.y, top + L / 2)
        rope.scale = (1, 1, L)
        rope.keyframe_insert("location", frame=fr); rope.keyframe_insert("scale", frame=fr)
    for o in (crate, rope):
        for fc in posing._fcurves(o.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"

    # ---- the man
    arm, body, clothes = human.build_human("Man", human.DEFAULT_OUTFIT, location=(hx + 0.6, -3.1, 0),
                                           rotation_z=math.radians(168))
    animate_man(arm)

    # ---- light
    world = bpy.data.worlds.new("Sky"); sc.world = world; world.use_nodes = True
    nt = world.node_tree
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(A, "hdri", "kloofendal_48d_partly_cloudy_puresky.hdr"))
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Rotation"].default_value = (0, 0, math.radians(110))
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], nt.nodes["Background"].inputs["Color"])
    nt.nodes["Background"].inputs["Strength"].default_value = 0.9
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); sc.collection.objects.link(sun)
    sun.data.energy = 4.2; sun.data.angle = math.radians(1.2); sun.data.color = (1.0, 0.94, 0.86)
    sun.rotation_euler = (math.radians(52), 0, math.radians(-38))

    cameras(sc, hero)
    render_settings(sc)
    return sc


def animate_man(arm):
    def pose_at(frame, pitch, yaw, arm_up, sway):
        posing.reset(arm)
        posing.relaxed(arm, sway=sway)
        if arm_up > 0:
            # blend from hanging to pointing at the beam (forward = -Y in armature space)
            d_hang = Vector((-0.17, -0.1, -1)).normalized()
            d_point = Vector((-0.1, -0.55, 1.0)).normalized()
            d = d_hang.lerp(d_point, arm_up).normalized()
            if arm_up < 1:
                posing.aim(arm, "RightArm", d)
                posing.aim(arm, "RightForeArm", d.lerp(d_point, 0.5) + Vector((0, -0.15 * (1 - arm_up), 0)))
                posing.aim(arm, "RightHand", d.lerp(d_point, 0.6))
            else:
                posing.point(arm, "Right", d_point)
        posing.look(arm, pitch=pitch, yaw=yaw)
        posing.key_all(arm, frame)

    s = lambda sec: CUT + int(round(sec * FPS))
    pose_at(1, 18, -4, 0, 0.0)
    pose_at(CUT, 22, -4, 0, 0.5)
    pose_at(s(0.55), 38, -8, 0, 1.0)
    pose_at(s(1.0), 44, -10, 0.45, 1.2)
    pose_at(s(1.55), 48, -10, 1.0, 1.0)
    pose_at(F_END, 52, -12, 1.0, 0.6)
    posing.ease_all(arm)


def look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def cameras(sc, hero):
    root, H, bz = hero
    # Shot A: low, near the facades, looking along the leaning row up to the gables and the crate
    ca = bpy.data.objects.new("CamA", bpy.data.cameras.new("CamA")); sc.collection.objects.link(ca)
    ca.data.lens = 18; ca.data.sensor_fit = "VERTICAL"; ca.data.sensor_height = 24
    for fr, loc, tgt in ((1, (HERO_X - 9.5, -3.4, 1.3), (HERO_X + 1.0, -0.6, 7.5)),
                         (CUT - 1, (HERO_X - 8.6, -3.6, 1.9), (HERO_X + 1.5, -0.8, 11.0))):
        ca.location = loc; look_at(ca, tgt)
        ca.keyframe_insert("location", frame=fr); ca.keyframe_insert("rotation_euler", frame=fr)
    # Shot B: close over the man's right shoulder, low, slow push in, looking up at the crate
    cb = bpy.data.objects.new("CamB", bpy.data.cameras.new("CamB")); sc.collection.objects.link(cb)
    cb.data.lens = 16; cb.data.sensor_fit = "VERTICAL"; cb.data.sensor_height = 24
    for fr, loc, tgt in ((CUT, (HERO_X + 0.95, -4.85, 1.22), (HERO_X + 0.1, -0.9, 3.7)),
                         (F_END, (HERO_X + 0.9, -4.5, 1.32), (HERO_X + 0.0, -0.9, 4.1))):
        cb.location = loc; look_at(cb, tgt)
        cb.keyframe_insert("location", frame=fr); cb.keyframe_insert("rotation_euler", frame=fr)
    for cam in (ca, cb):
        for fc in posing._fcurves(cam.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"; kp.easing = "EASE_IN_OUT"
    sc.camera = ca
    m = sc.timeline_markers.new("A", frame=1); m.camera = ca
    m = sc.timeline_markers.new("B", frame=CUT); m.camera = cb


def render_settings(sc, w=1080, h=1920, samples=24):
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = samples
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.03
    sc.cycles.use_denoising = True
    sc.cycles.max_bounces = 4
    sc.cycles.diffuse_bounces = 2
    sc.cycles.glossy_bounces = 1
    sc.cycles.transmission_bounces = 1
    sc.cycles.transparent_max_bounces = 4
    sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
    sc.render.use_persistent_data = True
    sc.render.resolution_x, sc.render.resolution_y = w, h
    sc.render.fps = FPS
    sc.frame_start, sc.frame_end = 1, F_END
    sc.render.image_settings.file_format = "PNG"
    try:
        sc.view_settings.view_transform = "AgX"
        sc.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "preview"
    sc = build()
    if len(sys.argv) >= 5:
        render_settings(sc, int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]))
    if mode == "preview":
        out = os.path.join(SCRATCH, "preview")
        os.makedirs(out, exist_ok=True)
        for fr in [int(x) for x in os.environ.get("PREVIEW_FRAMES", f"1,{CUT - 1},{CUT},{F_END}").split(",")]:
            sc.frame_set(fr)
            sc.render.filepath = os.path.join(out, f"f{fr:04d}.png")
            bpy.ops.render.render(write_still=True)
    elif mode == "save":
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, "poc.blend"))
    else:
        out = os.path.join(SCRATCH, "frames")
        os.makedirs(out, exist_ok=True)
        sc.render.filepath = os.path.join(out, "f")
        s, e = int(os.environ.get("FRAME_START", 1)), int(os.environ.get("FRAME_END", F_END))
        sc.frame_start, sc.frame_end = s, e
        bpy.ops.render.render(animation=True)
    print("done")
