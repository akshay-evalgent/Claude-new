"""Themeable LinkedIn carousel engine with comparison-first layouts.

Usage:
  python3 scripts/carousel2.py content/carousel-v2-sample.json --theme lean --out assets/carousels/v2-lean

Slide types: cover, versus, bars, checklist, stat, steps, quote, list, cta.
Design rules: one accent colour, lots of air, thin rules, big numbers, no decoration that does not carry data.
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES

W, H = 1080, 1350
M = 96

def tl(d, t, f): return d.textlength(t, font=f)

def wrap(d, text, f, max_w):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if tl(d, t, f) <= max_w: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def block(d, xy, text, f, fill, max_w, gap=1.18):
    x, y = xy
    for ln in wrap(d, text, f, max_w):
        d.text((x, y), ln, font=f, fill=fill); y += int(f.size * gap)
    return y

def strike(d, x, y, w, color, width=5):
    d.line((x - 4, y + 3, x + w + 4, y - 3), fill=color, width=width)

class Deck:
    def __init__(self, T, key, total):
        self.T, self.key, self.total = T, key, total

    def frame(self, n, kicker=None):
        T = self.T
        img = Image.new("RGB", (W, H), T["bg"]); d = ImageDraw.Draw(img)
        # header: tiny name left, counter right, one hairline
        d.text((M, 72), T["name"].upper(), font=T["body"](20, "SemiBold"), fill=T["muted"])
        c = f"{n}/{self.total}"; d.text((W - M - tl(d, c, T["body"](20, "Medium")), 72), c, font=T["body"](20, "Medium"), fill=T["muted"])
        d.line((M, 112, W - M, 112), fill=T["rule"], width=1)
        if kicker:
            d.text((M, 150), kicker.upper(), font=T["body"](20, "SemiBold"), fill=T["accent"])
        # footer
        d.line((M, H - 118, W - M, H - 118), fill=T["rule"], width=1)
        d.text((M, H - 96), T["tagline"], font=T["body"](20), fill=T["muted"])
        sw = "swipe  →"; d.text((W - M - tl(d, sw, T["body"](20, "SemiBold")), H - 96), sw, font=T["body"](20, "SemiBold"), fill=T["accent"])
        return img, d

    # ---------- slide types ----------
    def cover(self, s, n):
        T = self.T; img, d = self.frame(n, s.get("kicker", "Cost teardown"))
        big = s.get("big")  # e.g. "$2,300"
        y = 230
        if big:
            f = T["display"](176, "Bold" if self.key in ("underpriced", "tenx") else "ExtraBold")
            d.text((M - 6, y), big, font=f, fill=T["ink"]); y += 200
            if s.get("big_caption"):
                d.text((M, y), s["big_caption"], font=T["body"](30), fill=T["muted"]); y += 70
        y = block(d, (M, y + 20), s["title"], T["display"](64), T["ink"], W - 2 * M, 1.1)
        if s.get("subtitle"):
            block(d, (M, y + 26), s["subtitle"], T["body"](30), T["muted"], W - 2 * M, 1.3)
        if s.get("after"):
            # small "after" number bottom-right in accent
            f2 = T["display"](72); t = s["after"]
            d.text((W - M - tl(d, t, f2), H - 290), t, font=f2, fill=T["accent"])
            cap = s.get("after_caption", "after the swap")
            d.text((W - M - tl(d, cap, T["body"](24)), H - 200), cap, font=T["body"](24), fill=T["muted"])
        return img

    def versus(self, s, n):
        """Left: incumbent. Right: alternative. Prices as the hero."""
        T = self.T; img, d = self.frame(n, s.get("kicker", "Swap"))
        colw = (W - 2 * M - 48) // 2
        lx, rx = M, M + colw + 48
        top = 220
        d.text((lx, top), s["left"]["label"].upper(), font=T["body"](20, "SemiBold"), fill=T["muted"])
        d.text((rx, top), s["right"]["label"].upper(), font=T["body"](20, "SemiBold"), fill=T["accent"])
        fn = T["display"](50)
        block(d, (lx, top + 40), s["left"]["name"], fn, T["ink"], colw, 1.05)
        block(d, (rx, top + 40), s["right"]["name"], fn, T["ink"], colw, 1.05)
        fp = T["display"](92)
        py = top + 170
        lp, rp = s["left"]["price"], s["right"]["price"]
        d.text((lx, py), lp, font=fp, fill=T["muted"]); strike(d, lx, py + fp.size * 0.62, tl(d, lp, fp), T["strike"], 6)
        d.text((rx, py), rp, font=fp, fill=T["accent"])
        d.text((lx, py + 108), s["left"].get("per", "per month"), font=T["body"](22), fill=T["muted"])
        d.text((rx, py + 108), s["right"].get("per", "per month"), font=T["body"](22), fill=T["muted"])
        # vertical hairline between columns
        d.line((M + colw + 24, top, M + colw + 24, py + 150), fill=T["rule"], width=1)
        # keep / lose bullets
        y = py + 200
        d.line((M, y, W - M, y), fill=T["rule"], width=1); y += 28
        f = T["body"](27); fb = T["body"](20, "SemiBold")
        if s.get("keep"):
            d.text((M, y), "YOU KEEP", font=fb, fill=T["muted"]); yy = y + 34
            for k in s["keep"]:
                d.text((M, yy), "✓", font=T["sym"](26), fill=T["accent"]); yy = block(d, (M + 40, yy), k, f, T["ink"], colw - 40, 1.2) + 6
        if s.get("lose"):
            d.text((rx, y), "YOU GIVE UP", font=fb, fill=T["muted"]); yy = y + 34
            for k in s["lose"]:
                d.text((rx, yy), "–", font=T["body"](27, "Bold"), fill=T["muted"]); yy = block(d, (rx + 40, yy), k, f, T["ink"], colw - 40, 1.2) + 6
        if s.get("saving"):
            fs = T["display"](40); t = s["saving"]
            d.rounded_rectangle((M, H - 230, M + tl(d, t, fs) + 56, H - 230 + 76), radius=38, fill=T["accent"])
            d.text((M + 28, H - 230 + 14), t, font=fs, fill=T["bg"])
        return img

    def bars(self, s, n):
        """Horizontal price bars: incumbent (muted) vs alternative (accent) per row."""
        T = self.T; img, d = self.frame(n, s.get("kicker", "What it costs"))
        y = block(d, (M, 210), s["title"], T["display"](52), T["ink"], W - 2 * M, 1.1) + 30
        rows = s["rows"]; maxv = max(max(r["a"], r["b"]) for r in rows) or 1
        barw = W - 2 * M - 150
        fl = T["body"](26, "Medium"); fv = T["mono"](22)
        for r in rows:
            d.text((M, y), r["label"], font=fl, fill=T["ink"]); y += 40
            for v, col, name in ((r["a"], T["muted"], r.get("a_name", "")), (r["b"], T["accent"], r.get("b_name", ""))):
                lab = f"${v:,}" + (f"  {name}" if name else "")
                lw = tl(d, lab, fv)
                w = max(6, int((barw - lw) * v / maxv))
                d.rounded_rectangle((M, y, M + w, y + 18), radius=9, fill=col)
                d.text((M + w + 14, y - 4), lab, font=fv, fill=col); y += 30
            y += 26
            if y > H - 260: break
        if s.get("note"):
            block(d, (M, H - 230), s["note"], T["body"](24), T["muted"], W - 2 * M)
        return img

    def checklist(self, s, n):
        """Feature table: rows of features, two columns of ✓ / –."""
        T = self.T; img, d = self.frame(n, s.get("kicker", "Feature check"))
        y = block(d, (M, 210), s["title"], T["display"](52), T["ink"], W - 2 * M, 1.1) + 36
        c1, c2 = W - M - 300, W - M - 120
        fh = T["body"](20, "SemiBold")
        d.text((c1 - tl(d, s["a"], fh) / 2, y), s["a"], font=fh, fill=T["muted"])
        d.text((c2 - tl(d, s["b"], fh) / 2, y), s["b"], font=fh, fill=T["accent"]); y += 44
        d.line((M, y, W - M, y), fill=T["rule"], width=1); y += 18
        f = T["body"](28); fs = T["sym"](30)
        for feat, a, b in s["rows"]:
            d.text((M, y), feat, font=f, fill=T["ink"])
            for cx, v, col in ((c1, a, T["muted"]), (c2, b, T["accent"])):
                t = "✓" if v else "–"; d.text((cx - tl(d, t, fs) / 2, y - 2), t, font=fs, fill=col if v else T["rule"])
            y += 52; d.line((M, y - 10, W - M, y - 10), fill=T["rule"], width=1)
        if s.get("note"):
            block(d, (M, H - 230), s["note"], T["body"](24), T["muted"], W - 2 * M)
        return img

    def stat(self, s, n):
        T = self.T; img, d = self.frame(n, s.get("kicker"))
        f = T["display"](210, "Bold" if self.key in ("underpriced", "tenx") else "ExtraBold")
        d.text((M - 8, 330), s["value"], font=f, fill=T["accent"])
        y = block(d, (M, 590), s["label"], T["display"](48), T["ink"], W - 2 * M, 1.1)
        if s.get("source"):
            d.text((M, y + 30), s["source"], font=T["body"](22), fill=T["muted"])
        return img

    def steps(self, s, n):
        T = self.T; img, d = self.frame(n, s.get("kicker", "Set it up"))
        y = block(d, (M, 210), s["title"], T["display"](52), T["ink"], W - 2 * M, 1.1) + 30
        for i, st in enumerate(s["steps"], 1):
            d.text((M, y), f"{i:02d}", font=T["mono"](26, "Bold"), fill=T["accent"])
            yy = block(d, (M + 70, y), st["text"], T["body"](28), T["ink"], W - 2 * M - 70, 1.2)
            if st.get("cmd"):
                d.rounded_rectangle((M + 70, yy + 8, W - M, yy + 60), radius=10, fill=T["bg2"], outline=T["rule"])
                d.text((M + 90, yy + 20), st["cmd"][:48], font=T["mono"](22), fill=T["ink"]); yy += 72
            y = yy + 34
        if s.get("time"):
            d.text((M, H - 200), s["time"], font=T["body"](24, "Medium"), fill=T["muted"])
        return img

    def quote(self, s, n):
        T = self.T; img, d = self.frame(n, s.get("kicker"))
        d.text((M - 10, 250), "“", font=T["display"](200), fill=T["accent"])
        block(d, (M, 420), s["text"], T["display"](60), T["ink"], W - 2 * M, 1.15)
        d.text((M, H - 220), "— " + s.get("by", T["name"]), font=T["body"](26), fill=T["muted"])
        return img

    def list(self, s, n):
        T = self.T; img, d = self.frame(n, s.get("kicker"))
        y = block(d, (M, 210), s["title"], T["display"](52), T["ink"], W - 2 * M, 1.1) + 30
        for it in s["items"]:
            d.line((M, y, W - M, y), fill=T["rule"], width=1); y += 22
            d.text((M, y), it["name"], font=T["display"](36), fill=T["ink"])
            if it.get("price"):
                fp = T["mono"](26, "Bold"); d.text((W - M - tl(d, it["price"], fp), y + 8), it["price"], font=fp, fill=T["accent"])
            y += 48
            if it.get("replaces"):
                y = block(d, (M, y), "replaces " + it["replaces"], T["body"](24), T["muted"], W - 2 * M) + 18
        return img

    def shot(self, s, n):
        """A real screenshot (pricing page, invoice, setup screen) with a caption. Strongest 'a person did this' signal."""
        T = self.T; img, d = self.frame(n, s.get("kicker", "Screenshot"))
        y = block(d, (M, 200), s.get("title", ""), T["display"](44), T["ink"], W - 2 * M, 1.1) + 24
        box = (M, y, W - M, y + 640)
        d.rounded_rectangle(box, radius=18, fill=T["bg2"], outline=T["rule"], width=2)
        path = s.get("image")
        if path and os.path.exists(path):
            im = Image.open(path).convert("RGB")
            bw, bh = box[2] - box[0] - 24, box[3] - box[1] - 24
            im.thumbnail((bw, bh))
            img.paste(im, (box[0] + 12 + (bw - im.width) // 2, box[1] + 12 + (bh - im.height) // 2))
        else:
            ph = s.get("placeholder", "drop the real screenshot here\n(pricing page, invoice, setup screen)")
            fy = (box[1] + box[3]) // 2 - 40
            for ln in ph.split("\n"):
                d.text(((W - tl(d, ln, T["body"](28))) / 2, fy), ln, font=T["body"](28), fill=T["muted"]); fy += 40
        if s.get("caption"):
            block(d, (M, box[3] + 28), s["caption"], T["body"](28), T["ink"], W - 2 * M, 1.25)
        if s.get("date"):
            d.text((M, H - 170), "captured " + s["date"], font=T["mono"](20), fill=T["muted"])
        return img

    def cta(self, s, n):
        T = self.T; img, d = self.frame(n)
        block(d, (M, 300), s.get("title", "Follow for one swap a day."), T["display"](72), T["ink"], W - 2 * M, 1.08)
        block(d, (M, 560), s.get("body", "Save this. Send it to whoever approves the software budget."), T["body"](30), T["muted"], W - 2 * M, 1.3)
        t = s.get("button", "Subscribe to the newsletter"); fb = T["body"](28, "SemiBold")
        d.rounded_rectangle((M, 760, M + tl(d, t, fb) + 64, 760 + 76), radius=38, fill=T["accent"])
        d.text((M + 32, 760 + 20), t, font=fb, fill=T["bg"])
        return img

def render(spec, theme_key, out):
    T = THEMES[theme_key]; slides = spec["slides"]; deck = Deck(T, theme_key, len(slides))
    pages = [getattr(deck, s["type"])(s, i + 1) for i, s in enumerate(slides)]
    os.makedirs(out, exist_ok=True)
    for i, p in enumerate(pages, 1): p.save(f"{out}/slide-{i:02d}.png")
    pages[0].save(f"{out}/carousel.pdf", save_all=True, append_images=pages[1:], resolution=150)
    # contact sheet for quick review
    cols = 4; th = 340; tw = int(th * W / H); rows = (len(pages) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 20) + 20, rows * (th + 20) + 20), (235, 235, 235))
    for i, p in enumerate(pages):
        sheet.paste(p.resize((tw, th)), (20 + (i % cols) * (tw + 20), 20 + (i // cols) * (th + 20)))
    sheet.save(f"{out}/contact-sheet.png")
    return len(pages)

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("spec"); ap.add_argument("--theme", default="lean"); ap.add_argument("--out", default=None)
    a = ap.parse_args(); spec = json.load(open(a.spec))
    out = a.out or f"assets/carousels/v2-{a.theme}"
    n = render(spec, a.theme, out); print(f"{n} slides -> {out}")
