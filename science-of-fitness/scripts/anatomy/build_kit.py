"""Build the Science of Fitness anatomy asset kit.

    python3 build_kit.py <BodyParts3D data dir> <out dir> stills|closeups|anims|all

Stills are transparent PNGs (drop them on any background in the editor) plus a
JPG preview on the stage colour. Animations are 1920x1080 H.264.
"""
import os, subprocess, shutil, sys, math
import numpy as np
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manga_render import Scene, over, add_glow, stage, save, STAGE
from nerves import draw_nerves

DATA, OUT, WHAT = sys.argv[1], sys.argv[2], sys.argv[3]
sc = Scene(DATA)
FULL = (0.0, 0.0, 1800.0)            # whole body framing (centre x, centre z, height in mm)
PW, PH = 1215, 2160                  # portrait full-body size

MUSCLES = {  # name: (search words, view)
    "biceps": (["biceps brachii", "brachialis"], "front"),
    "chest": (["pectoralis major"], "front"),
    "shoulders": (["deltoid"], "front"),
    "forearms": (["flexor carpi", "flexor digitorum superficialis", "palmaris longus", "brachioradialis", "pronator teres",
                  "extensor carpi", "extensor digitorum"], "front"),
    "core-obliques": (["external oblique"], "front"),
    "quads": (["rectus femoris", "vastus"], "front"),
    "triceps": (["triceps brachii"], "back"),
    "upper-back": (["trapezius", "rhomboid", "infraspinatus", "teres major", "teres minor"], "back"),
    "glutes": (["gluteus maximus", "gluteus medius"], "back"),
    "hamstrings": (["biceps femoris", "semitendinosus", "semimembranosus"], "back"),
    "calves": (["gastrocnemius", "soleus"], "back"),
}
BONES = {
    "wrist": (["scaphoid", "lunate", "capitate", "hamate", "trapezium", "trapezoid", "triquetral", "pisiform", "radius", "ulna"], "front"),
    "femur": (["femur"], "front"),
    "spine": (["vertebra", "sacrum", "coccyx"], "back"),
    "ribcage": ([" rib", "sternum"], "front"),
}
YAW = {"front": 0.0, "back": 180.0}


def path(*p):
    full = os.path.join(OUT, *p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    return full


def preview(rgba, glow, name):
    img = add_glow(over(stage(rgba.shape[1], rgba.shape[0]), rgba), glow)
    save(path("previews", name + ".jpg"), img)
    return img


def rgba_with_glow(rgba, glow):
    """Bake the glow into a transparent PNG so it survives compositing."""
    g = glow.max(axis=2, keepdims=True) / 255.0
    col = np.where(g > 1e-4, glow / np.maximum(g, 1e-4), 0)
    a = rgba[..., 3:4] / 255.0
    ga = np.clip(g * 0.55, 0, 1)
    out_a = a + ga * (1 - a)
    rgb = (rgba[..., :3] * a + col * ga * (1 - a)) / np.maximum(out_a, 1e-4)
    return np.dstack([rgb, out_a * 255])


def layer(name, yaw, W, H, view, highlight=None, ss=2):
    if name == "skin":
        return sc.draw(["skin"], W, H, yaw, view, ss, fibres=False, shorts=True)[:2]
    if name == "skeleton":
        return sc.draw(["bone", "cartilage"], W, H, yaw, view, ss, style="bone", highlight=highlight)[:2]
    if name == "muscle":
        b, bg, _ = sc.draw(["bone", "cartilage"], W, H, yaw, view, ss, style="bone")
        m, mg, _ = sc.draw(["muscle", "tendon"], W, H, yaw, view, ss, highlight=highlight)
        a = m[..., 3:4] / 255.0
        rgb = b[..., :3] * (1 - a) * (b[..., 3:4] / 255.0) + m[..., :3] * a
        alpha = np.maximum(b[..., 3:4], m[..., 3:4])
        rgb = rgb / np.maximum(alpha / 255.0, 1e-4)
        return np.dstack([rgb, alpha]), mg
    if name == "nerves":
        img = np.zeros((H, W, 4), np.float32)
        sk, _, _ = sc.draw(["skin"], W, H, yaw, view, ss, fibres=False, shorts=True)
        m = (sk[..., 3] > 128).astype(np.uint8)  # ghost body: the silhouette outline only
        ring = (cv2.dilate(m, np.ones((3, 3), np.uint8)) - cv2.erode(m, np.ones((3, 3), np.uint8))) > 0
        img[ring] = [120, 130, 140, 170]
        bo, _, _ = sc.draw(["bone", "cartilage"], W, H, yaw, view, ss, style="bone")
        bo[..., 3] *= 0.22
        img = stack(img, bo)
        brain = [p["id"] for p in sc.parts if p["layer"] == "nerve"]
        br, bg, _ = sc.draw(["nerve"], W, H, yaw, view, ss, highlight=[(brain, "teal")], fibres=False)
        br[..., 3] *= 0.9
        img = stack(img, br)
        nv, ng = draw_nerves(sc, W, H, yaw, view, ss)
        return stack(img, nv), bg * 0.5 + ng
    raise ValueError(name)


def stack(dst, src):
    a = src[..., 3:4] / 255.0; b = dst[..., 3:4] / 255.0
    out_a = a + b * (1 - a)
    rgb = (src[..., :3] * a + dst[..., :3] * b * (1 - a)) / np.maximum(out_a, 1e-4)
    return np.dstack([rgb, out_a * 255])


# ------------------------------------------------------------------ stills
def stills():
    for side in ("front", "back"):
        for lay in ("skin", "muscle", "skeleton", "nerves"):
            rgba, glow = layer(lay, YAW[side], PW, PH, FULL)
            save(path("body", f"{lay}-{side}.png"), rgba_with_glow(rgba, glow))
            preview(rgba, glow, f"body-{lay}-{side}")
            print("body", lay, side, flush=True)
    for key, (words, side) in MUSCLES.items():
        ids = sc.ids_matching(words, "muscle")
        rgba, glow = layer("muscle", YAW[side], PW, PH, FULL, highlight=[(ids, "coral")])
        save(path("muscle-highlights", f"{key}-{side}.png"), rgba_with_glow(rgba, glow))
        preview(rgba, glow, f"muscle-{key}-{side}")
        print("muscle", key, flush=True)
    for key, (words, side) in BONES.items():
        ids = sc.ids_matching(words, "bone")
        rgba, glow = layer("skeleton", YAW[side], PW, PH, FULL, highlight=[(ids, "amber")])
        save(path("bone-highlights", f"{key}-{side}.png"), rgba_with_glow(rgba, glow))
        preview(rgba, glow, f"bone-{key}-{side}")
        print("bone", key, flush=True)
    lineup()
    split_hero()


def lineup():
    W, H = 1920, 1080
    img = stage(W, H)
    for i, lay in enumerate(("skin", "muscle", "skeleton", "nerves")):
        rgba, glow = layer(lay, 0.0, 480, 1080, (0, 0, 1800))
        tile = add_glow(over(stage(480, 1080), rgba), glow)
        img[:, i * 480:(i + 1) * 480] = tile
    save(path("previews", "lineup-four-layers.jpg"), img)
    save(path("hero", "lineup-four-layers.png"), img)


def split_hero():
    """One body, four vertical bands: skin, muscle, skeleton, nerves."""
    W, H = PW, PH
    layers = [layer(l, 0.0, W, H, FULL) for l in ("skin", "muscle", "skeleton", "nerves")]
    x0, x1 = int(W * 0.21), int(W * 0.79)
    edges = np.linspace(x0, x1, 5).astype(int)
    out = np.zeros((H, W, 4), np.float32); glow = np.zeros((H, W, 3), np.float32)
    for i, (rgba, g) in enumerate(layers):
        a, b = (0 if i == 0 else edges[i]), (W if i == 3 else edges[i + 1])
        out[:, a:b] = rgba_with_glow(rgba, g)[:, a:b]
    for e in edges[1:-1]:
        cv2.line(out, (int(e), 0), (int(e), H), (38, 224, 196, 255), 2, cv2.LINE_AA)
    save(path("hero", "split-body-four-layers.png"), out)
    save(path("previews", "split-body-four-layers.jpg"), over(stage(W, H), out))


# ------------------------------------------------------------------ close-ups
CLOSE = {  # name: (layer, side, view (cx, cz, height), highlight words, colour)
    "arm-biceps": ("muscle", "front", (-215, 300, 640), ["biceps brachii"], "coral"),
    "forearm-flexors": ("muscle", "front", (-235, 140, 520), ["flexor carpi", "flexor digitorum superficialis", "palmaris longus"], "coral"),
    "shoulder-back": ("muscle", "back", (150, 470, 520), ["deltoid", "infraspinatus", "teres"], "coral"),
    "thigh-quads": ("muscle", "front", (-90, -180, 640), ["rectus femoris", "vastus"], "coral"),
    "calf-back": ("muscle", "back", (85, -560, 600), ["gastrocnemius", "soleus"], "coral"),
    "hand-bones": ("skeleton", "front", (-262, -35, 300), ["scaphoid", "lunate", "capitate", "hamate", "trapezium", "trapezoid",
                                                          "triquetral", "pisiform"], "amber"),
    "knees": ("skeleton", "front", (0, -420, 520), [], "amber"),
    "spine-back": ("skeleton", "back", (0, 390, 760), ["vertebra"], "amber"),
    "skull": ("skeleton", "front", (0, 755, 330), [], "amber"),
    "ribcage": ("skeleton", "front", (0, 430, 560), [], "amber"),
    "brain-spine-nerves": ("nerves", "back", (0, 520, 760), [], "teal"),
    "arm-nerves": ("nerves", "front", (-215, 230, 760), [], "teal"),
}


def closeups(only=None):
    W, H = 1920, 1080
    for name, (lay, side, view, words, col) in CLOSE.items():
        if only and name != only:
            continue
        cx = view[0]
        hl = None
        if words:
            ids = sc.ids_matching(words, "muscle" if lay == "muscle" else "bone")
            hl = [(ids, col)]
        rgba, glow = layer(lay, YAW[side], W, H, (cx, view[1], view[2]), highlight=hl, ss=2)
        save(path("closeups", f"{name}.png"), rgba_with_glow(rgba, glow))
        preview(rgba, glow, f"closeup-{name}")
        print("closeup", name, flush=True)


# ------------------------------------------------------------------ animations
def encode(frames_dir, out, fps):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(frames_dir, "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", out], check=True)
    shutil.rmtree(frames_dir)


def ease(t):
    t = min(max(t, 0.0), 1.0)
    return t * t * (3 - 2 * t)


def anim_layer_reveal():
    """Scan line sweeps down: skin -> muscle -> skeleton -> nerves."""
    W, H, fps = 1920, 1080, 30
    view = (0, 0, 1800)
    tiles = []
    for lay in ("skin", "muscle", "skeleton", "nerves"):
        rgba, glow = layer(lay, 0.0, W, H, view)
        tiles.append(add_glow(over(stage(W, H), rgba), glow))
    d = path("anim", "_reveal"); os.makedirs(d, exist_ok=True)
    hold, sweep = int(0.9 * fps), int(1.4 * fps)
    k = 0
    yy = np.arange(H)[:, None, None]
    for i in range(4):
        for _ in range(hold):
            cv2.imwrite(os.path.join(d, f"{k:04d}.png"), cv2.cvtColor(tiles[i].astype(np.uint8), cv2.COLOR_RGB2BGR)); k += 1
        if i == 3:
            break
        for f in range(sweep):
            y = ease(f / (sweep - 1)) * (H + 40) - 20
            m = (yy < y).astype(np.float32)
            img = tiles[i + 1] * m + tiles[i] * (1 - m)
            band = np.exp(-((yy[..., 0] - y) / 6.0) ** 2)
            img = np.clip(img + band[..., None] * np.array([38, 224, 196]) * 1.2, 0, 255)
            cv2.imwrite(os.path.join(d, f"{k:04d}.png"), cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2BGR)); k += 1
    encode(d, path("anim", "layer-reveal.mp4"), fps)
    print("anim layer-reveal", flush=True)


def anim_turntable():
    W, H, fps, n = 1920, 1080, 24, 96
    d = path("anim", "_turn"); os.makedirs(d, exist_ok=True)
    for f in range(n):
        rgba, glow = layer("muscle", 360.0 * f / n, W, H, (0, 0, 1800))
        img = add_glow(over(stage(W, H), rgba), glow)
        cv2.imwrite(os.path.join(d, f"{f:04d}.png"), cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    encode(d, path("anim", "muscle-turntable.mp4"), fps)
    print("anim turntable", flush=True)


def anim_nerve_signals():
    W, H, fps, n = 1920, 1080, 30, 120
    view = (0, 0, 1800)
    base, bglow = layer("nerves", 0.0, W, H, view)
    bg = add_glow(over(stage(W, H), base), bglow * 0.6)
    d = path("anim", "_nerv"); os.makedirs(d, exist_ok=True)
    for f in range(n):
        nv, ng = draw_nerves(sc, W, H, 0.0, view, 2, pulse_t=f / n)
        img = add_glow(over(bg, nv), ng)
        cv2.imwrite(os.path.join(d, f"{f:04d}.png"), cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    encode(d, path("anim", "nerve-signals.mp4"), fps)
    print("anim nerve-signals", flush=True)


def anim_zoom_biceps():
    W, H, fps, n = 1920, 1080, 30, 75
    ids = sc.ids_matching(["biceps brachii"], "muscle")
    a, b = np.array([0, 0, 1800.0]), np.array([-215, 300, 640.0])
    d = path("anim", "_zoom"); os.makedirs(d, exist_ok=True)
    for f in range(n):
        t = ease(min(f / (n * 0.7), 1.0))
        view = a + (b - a) * t
        view[2] = math.exp(math.log(a[2]) + (math.log(b[2]) - math.log(a[2])) * t)
        rgba, glow = layer("muscle", 0.0, W, H, tuple(view), highlight=[(ids, "coral")])
        pulse = 1.0 + 0.6 * max(0.0, math.sin((f / n) * math.pi * 3)) * t
        img = add_glow(over(stage(W, H), rgba), glow, pulse)
        cv2.imwrite(os.path.join(d, f"{f:04d}.png"), cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR))
    encode(d, path("anim", "zoom-to-biceps.mp4"), fps)
    print("anim zoom-to-biceps", flush=True)


if WHAT in ("stills", "all"):
    stills()
if WHAT in ("closeups", "all"):
    closeups()
if WHAT.startswith("closeup:"):  # re-render one close-up, e.g. closeup:knees
    closeups(WHAT.split(":", 1)[1])
if WHAT in ("anims", "all"):
    anim_layer_reveal(); anim_nerve_signals(); anim_zoom_biceps(); anim_turntable()
