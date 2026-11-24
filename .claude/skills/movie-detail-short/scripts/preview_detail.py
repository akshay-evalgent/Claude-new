# preview_detail.py <spec.json> <out.jpg> : first frame (+0.2 s) of every shot, composed as the renderer would, in one sheet
import json, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../../shorts")); sys.path.insert(0, os.path.join(ROOT, "movie")); sys.path.insert(0, ROOT)
import detail as dt
from PIL import Image, ImageDraw
spec = json.load(open(sys.argv[1])); base = spec["base"]
tiles = []
for bi, b in enumerate(spec["beats"]):
    seq = b.get("shots") or [[b["film"][0], b["film"][1], {}]]
    for s in seq:
        sid, st, o = s[0], s[1], (s[2] if len(s) > 2 else {})
        p = dt.src_path(base, sid); fw, fh = dt.probe(p)
        info = dt.analyse(p, st, fw, fh)
        if "rows" in o: info = (int(o["rows"][0] * fh), int(o["rows"][1] * fh)) + info[2:]
        fr = Image.fromarray(dt.grab(p, st + 0.2, fw, fh))
        img = (dt.compose_fit if "fit" in o else dt.compose_clip)(fr, info, o, float(sys.argv[3]) if len(sys.argv) > 3 else 0.0)
        im = img.resize((216, 384)); d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 216, 14], fill=(0, 0, 0)); d.text((2, 1), f"B{bi+1} {sid[:5]} {st} cx{info[3]:.2f}", fill=(255, 255, 0))
        tiles.append(im)
cols = 10; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (216 * cols, 384 * rows), (40, 40, 40))
for k, t in enumerate(tiles): sheet.paste(t, ((k % cols) * 216, (k // cols) * 384))
sheet.save(sys.argv[2], quality=85); print(len(tiles), "shots")
