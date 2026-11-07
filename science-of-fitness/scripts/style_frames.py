"""Render template frames and a short motion test for Science of Fitness.

These are the info-graphic layer only. The anime host and anatomy art get
generated separately (see STYLE-AND-PIPELINE.md) and dropped into the dashed
boxes. Run:  python3 scripts/style_frames.py   (needs Pillow and ffmpeg)
"""
import math, os, subprocess, shutil
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "style-frames")
FONT_DIR = "/usr/share/fonts/opentype/inter/"

# Palette: near-black lab, one science accent, one warning/muscle accent,
# one nutrient accent. Kept distinct from the reference channels' black+orange.
BG = (10, 12, 16)
INK = (236, 240, 244)
MUTED = (128, 138, 150)
TEAL = (38, 224, 196)     # science / correct / "do this"
CORAL = (255, 84, 84)     # muscle highlight / wrong / warning
AMBER = (255, 184, 48)    # nutrients, vitamins, minerals
LINE = (40, 46, 56)


def f(size, weight="Bold", display=True):
    fam = "InterDisplay" if display else "Inter"
    return ImageFont.truetype(f"{FONT_DIR}{fam}-{weight}.otf", size)


def centered(d, cx, y, text, fnt, fill):
    w = d.textlength(text, font=fnt)
    d.text((cx - w / 2, y), text, font=fnt, fill=fill)


def dashed_box(d, box, label, color=MUTED, dash=18, gap=12, width=3):
    x0, y0, x1, y1 = box
    for (a, b, horiz, fixed) in [(x0, x1, True, y0), (x0, x1, True, y1), (y0, y1, False, x0), (y0, y1, False, x1)]:
        p = a
        while p < b:
            q = min(p + dash, b)
            d.line(((p, fixed, q, fixed) if horiz else (fixed, p, fixed, q)), fill=color, width=width)
            p = q + gap
    fl = f(26, "Medium", False)
    for i, line in enumerate(label.split("\n")):
        centered(d, (x0 + x1) / 2, (y0 + y1) / 2 - 30 + i * 36, line, fl, color)


def chrome(d, chapter, step, steps=5, source=None, safety=True, alpha=1.0):
    """The fixed furniture every frame carries."""
    c = lambda col: tuple(int(BG[i] + (col[i] - BG[i]) * alpha) for i in range(3))
    d.rectangle((56, 52, 60, 80), fill=c(TEAL))
    d.text((74, 52), chapter.upper(), font=f(24, "SemiBold", False), fill=c(MUTED))
    for i in range(steps):  # progress dots, top right
        cx, cy, r = W - 70 - (steps - 1 - i) * 34, 66, 11
        if i == step:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c(TEAL))
        else:
            d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=c(MUTED), width=2)
    if safety:
        t = "GO SLOW. STOP IF IT HURTS."
        fnt = f(19, "SemiBold", False)
        w = d.textlength(t, font=fnt)
        d.rounded_rectangle((56, H - 74, 56 + w + 60, H - 38), radius=6, outline=c(AMBER), width=2)
        d.polygon([(72, H - 46), (82, H - 66), (92, H - 46)], outline=c(AMBER))
        d.text((104, H - 68), t, font=fnt, fill=c(AMBER))
    if source:
        fnt = f(20, "Medium", False)
        t = "SOURCE  " + source
        w = d.textlength(t, font=fnt)
        d.text((W - 56 - w, H - 66), t, font=fnt, fill=c(MUTED))


def ring(d, cx, cy, r, frac, col, width=18):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=LINE, width=width)
    if frac > 0:
        d.arc((cx - r, cy - r, cx + r, cy + r), -90, -90 + 360 * frac, fill=col, width=width)


def element_tile(d, x, y, sym, num, name, col, s=300):
    d.rounded_rectangle((x, y, x + s, y + s), radius=22, outline=col, width=5)
    d.text((x + 24, y + 18), str(num), font=f(34, "SemiBold"), fill=col)
    centered(d, x + s / 2, y + s * 0.24, sym, f(int(s * 0.42), "Black"), INK)
    centered(d, x + s / 2, y + s * 0.78, name.upper(), f(30, "Bold"), col)


# ---------- static frames ----------

def frame_title():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Part 2 · The fuel", 1, safety=False)
    centered(d, W / 2, 360, "EVERY REP YOU DO", f(64, "Bold"), INK)
    centered(d, W / 2, 440, "RUNS ON ONE MOLECULE", f(64, "Bold"), INK)
    centered(d, W / 2, 560, "ATP", f(220, "Black"), TEAL)
    centered(d, W / 2, 820, "and your muscles only keep a few seconds of it in stock", f(34, "Medium", False), MUTED)
    return im


def frame_nutrient():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Mineral 3 · Magnesium", 2, source="NIH Office of Dietary Supplements", safety=False)
    dashed_box(d, (120, 170, 860, 960), "HOST ART\nholding a handful of\npumpkin seeds")
    element_tile(d, 1000, 210, "Mg", 12, "Magnesium", AMBER)
    d.text((1360, 230), "300+", font=f(120, "Black"), fill=AMBER)
    d.text((1364, 370), "enzyme reactions need it", font=f(34, "SemiBold", False), fill=INK)
    rows = [("Men 19-30", "400 mg / day"), ("Women 19-30", "310 mg / day"), ("Pumpkin seeds, 28 g", "156 mg")]
    y = 600
    for k, v in rows:
        d.line((1000, y - 18, 1800, y - 18), fill=LINE, width=2)
        d.text((1000, y), k, font=f(34, "Medium", False), fill=MUTED)
        w = d.textlength(v, font=f(40, "Bold"))
        d.text((1800 - w, y - 4), v, font=f(40, "Bold"), fill=INK)
        y += 90
    return im


def frame_do_dont():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Mistake 2 · The flare", 3)
    for i, (col, ok, lab, sub) in enumerate([(TEAL, True, "ELBOWS ~45°", "joint stays happy"), (CORAL, False, "FLARED OUT", "shoulder takes the load")]):
        x0 = 140 + i * 840
        d.rounded_rectangle((x0, 170, x0 + 800, 760), radius=24, outline=col, width=4)
        dashed_box(d, (x0 + 60, 220, x0 + 740, 700), "HOST ART\npush-up, top view", color=LINE)
        cx, cy = x0 + 400, 860
        if ok:
            d.line((cx - 240, cy, cx - 215, cy + 25, cx - 175, cy - 25), fill=col, width=10)
        else:
            d.line((cx - 240, cy - 25, cx - 190, cy + 25), fill=col, width=10)
            d.line((cx - 240, cy + 25, cx - 190, cy - 25), fill=col, width=10)
        d.text((cx - 150, cy - 34), lab, font=f(56, "Black"), fill=col)
        d.text((cx - 150, cy + 34), sub, font=f(28, "Medium", False), fill=MUTED)
    return im


def frame_zoom():
    """The signature transition: body -> muscle -> fibre -> mitochondrion -> ATP."""
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Zoom in", 0, safety=False)
    steps = [("BODY", "1.8 m"), ("MUSCLE", "30 cm"), ("FIBRE", "0.1 mm"), ("MITOCHONDRION", "1 µm"), ("ATP", "1 nm")]
    n = len(steps); x0, x1, cy = 200, 1720, 520
    for i, (name, scale) in enumerate(steps):
        cx = x0 + (x1 - x0) * i / (n - 1)
        r = 120 - i * 18
        col = TEAL if i == n - 1 else INK
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=col, width=4)
        centered(d, cx, cy + 150, name, f(30, "Bold"), col)
        centered(d, cx, cy + 192, scale, f(26, "Medium", False), MUTED)
        if i < n - 1:
            nx = x0 + (x1 - x0) * (i + 1) / (n - 1)
            d.line((cx + r + 16, cy, nx - (r - 18) - 26, cy), fill=MUTED, width=3)
            d.polygon([(nx - (r - 18) - 26, cy - 9), (nx - (r - 18) - 10, cy), (nx - (r - 18) - 26, cy + 9)], fill=MUTED)
    centered(d, W / 2, 220, "WE GO INSIDE THE BODY. EVERY EPISODE.", f(52, "Black"), INK)
    return im


def frame_stat():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Rule 1 · Protein", 4, source="Morton et al., Br J Sports Med, 2018", safety=False)
    ring(d, 620, 560, 260, 0.82, TEAL, 26)
    centered(d, 620, 470, "1.6", f(170, "Black"), INK)
    centered(d, 620, 660, "g per kg per day", f(34, "SemiBold", False), MUTED)
    d.text((1020, 360), "PAST THIS POINT", font=f(44, "Bold"), fill=MUTED)
    d.text((1020, 420), "MORE PROTEIN", font=f(80, "Black"), fill=INK)
    d.text((1020, 510), "STOPPED HELPING", font=f(80, "Black"), fill=CORAL)
    d.text((1020, 640), "in 49 trials, 1,863 people", font=f(34, "Medium", False), fill=MUTED)
    return im


def frame_palette():
    im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    chrome(d, "Palette", 0, steps=1, safety=False)
    sw = [(BG, "BACKGROUND", "#0A0C10", "near-black, never pure"), (INK, "INK", "#ECF0F4", "host line art, headlines"),
          (TEAL, "SCIENCE", "#26E0C4", "correct, do this, key term"), (CORAL, "MUSCLE", "#FF5454", "worked muscle, wrong, myth"),
          (AMBER, "NUTRIENT", "#FFB830", "vitamins, minerals, food, safety")]
    for i, (col, name, hx, use) in enumerate(sw):
        x = 120 + i * 340
        d.rounded_rectangle((x, 300, x + 280, 580), radius=20, fill=col, outline=LINE, width=3)
        d.text((x, 620), name, font=f(40, "Black"), fill=INK)
        d.text((x, 676), hx, font=f(30, "SemiBold", False), fill=MUTED)
        d.text((x, 720), use, font=f(24, "Medium", False), fill=MUTED)
    return im


# ---------- motion test ----------

def ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def motion_test(path, fps=30, secs=7):
    tmp = os.path.join(OUT, "_frames"); os.makedirs(tmp, exist_ok=True)
    for i in range(fps * secs):
        t = i / fps
        im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
        chrome(d, "Rule 1 · Protein", 4, source="Morton et al., Br J Sports Med, 2018", safety=False, alpha=ease(t / 0.5))
        p = ease((t - 0.4) / 1.6)            # ring draws and number counts up
        ring(d, 620, 560, 260, 0.82 * p, TEAL, 26)
        centered(d, 620, 470, f"{1.6 * p:.1f}", f(170, "Black"), INK)
        if t > 0.8:
            a = ease((t - 0.8) / 0.4)
            centered(d, 620, 660, "g per kg per day", f(34, "SemiBold", False), tuple(int(BG[k] + (MUTED[k] - BG[k]) * a) for k in range(3)))
        for j, (txt, size, col, y, start) in enumerate([("PAST THIS POINT", 44, MUTED, 360, 2.2), ("MORE PROTEIN", 80, INK, 420, 2.6), ("STOPPED HELPING", 80, CORAL, 510, 3.0), ("in 49 trials, 1,863 people", 34, MUTED, 640, 4.0)]):
            a = ease((t - start) / 0.35)
            if a <= 0: continue
            pop = 1 + 0.12 * math.sin(min(1, (t - start) / 0.35) * math.pi) if j == 2 else 1
            fnt = f(int(size * pop), "Black" if size == 80 else ("Bold" if size == 44 else "Medium"), size != 34)
            colr = tuple(int(BG[k] + (col[k] - BG[k]) * a) for k in range(3))
            d.text((1020 + (1 - a) * 40, y), txt, font=fnt, fill=colr)
        im.save(os.path.join(tmp, f"{i:04d}.png"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", os.path.join(tmp, "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", path], check=True)
    shutil.rmtree(tmp)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    frames = {"01-title-card": frame_title, "02-nutrient-card": frame_nutrient, "03-do-dont": frame_do_dont,
              "04-zoom-ladder": frame_zoom, "05-stat-ring": frame_stat, "00-palette": frame_palette}
    ims = []
    for name, fn in frames.items():
        im = fn(); im.save(os.path.join(OUT, f"{name}.png")); ims.append(im)
    sheet = Image.new("RGB", (W, H * 3 // 2 + 30), (30, 34, 40))
    tw, th = W // 2 - 15, H // 2 - 15
    for k, im in enumerate(ims):
        sheet.paste(im.resize((tw, th)), ((k % 2) * (tw + 30), (k // 2) * (th + 30)))
    sheet.save(os.path.join(OUT, "contact-sheet.png"))
    motion_test(os.path.join(OUT, "06-motion-test-stat.mp4"))
    print("done:", sorted(os.listdir(OUT)))
