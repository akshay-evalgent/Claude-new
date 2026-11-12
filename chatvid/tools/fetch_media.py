#!/usr/bin/env python3
"""Download the photos an episode uses, with their licence and credit.

An episode lists its media under "media":
  "media": {
    "elon-smile": {"commons": "File:Elon_Musk_2015.jpg"},
    "mars":       {"nasa": "PIA02992"},
    "my-clip":    {"file": "my-photo.jpg", "credit": "Photo: someone, used with permission"}
  }

- commons: Wikimedia Commons file; licence and author are read from its file page.
- nasa:    NASA Image and Video Library id (public domain, credit NASA/centre).
- file:    something you supply yourself, already in chatvid/assets/media/.
- archive: an Internet Archive film (public domain only), cut to a clip:
           {"archive": "DuckandC1951", "start": 30, "dur": 2.6}
- noto:    an animated Google Noto emoji (CC BY 4.0), e.g. {"noto": "💀"}
Clips and animated emoji are stored as frame sequences in assets/media/<key>/.

Files land in chatvid/assets/media/<key>.jpg (max 2400 px wide) and every
credit is written to chatvid/assets/media/credits.json, which
`render.mjs --upload` puts into the description.

  python3 chatvid/tools/fetch_media.py chatvid/episodes/elon-vs-grok.json
"""
import html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(ROOT, "assets", "media")
UA = {"User-Agent": "chatvid/1.0 (educational video tool)"}


def get(url, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and i < tries - 1:          # Wikimedia rate limit: back off and retry
                time.sleep(20 * (i + 1))
                continue
            raise


def commons(title):
    page = get("https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_")))
    t = page.decode("utf-8", "ignore").replace("&#95;", "_")
    lic = [html.unescape(x).strip() for x in re.findall(r'class="licensetpl_short"[^>]*>(.*?)<', t)]
    aut = re.search(r'id="fileinfotpl_aut".*?<td[^>]*>(.*?)</td>', t, re.S)
    aut = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", aut.group(1)))).strip() if aut else ""
    full = re.search(r'class="fullMedia".*?href="([^"]+)"', t, re.S)
    if not full:
        raise SystemExit(f"no original file link on the page for {title}")
    url = html.unescape(full.group(1)).split("?")[0]
    # Wikimedia asks tools to use its standard thumbnail widths, not originals;
    # 1920 px is plenty for 1080p video (smaller originals are used as they are)
    w = re.search(r'\(([\d,]+) × [\d,]+ pixels', t)
    if w and int(w.group(1).replace(",", "")) > 1920:
        name = url.rsplit("/", 1)[1]
        url = url.replace("/wikipedia/commons/", "/wikipedia/commons/thumb/") + f"/1920px-{name}"
    lic = "Public domain" if any("ublic domain" in x for x in lic) else (lic[0] if lic else "see file page")
    who = re.sub(r"\s+from\s+.*$", "", aut) if aut else "Wikimedia Commons"
    credit = f"{title.replace('File:', '').replace('_', ' ')}: {who}, {lic}, via Wikimedia Commons"
    return url, credit, lic, f"Photo: {who} / {lic}"


def nasa(nasa_id):
    d = json.loads(get(f"https://images-api.nasa.gov/search?nasa_id={urllib.parse.quote(nasa_id)}"))
    meta = d["collection"]["items"][0]["data"][0]
    assets = json.loads(get(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nasa_id)}"))["collection"]["items"]
    hrefs = [a["href"] for a in assets if a["href"].lower().endswith((".jpg", ".jpeg", ".png"))]
    pick = next((h for h in hrefs if "~orig" in h), None) or next((h for h in hrefs if "~large" in h), hrefs[0])
    center = meta.get("center") or "NASA"
    who = "NASA/JPL-Caltech" if center == "JPL" else f"NASA ({center})"
    return pick.replace("http://", "https://"), f"{meta.get('title', nasa_id)}: {who}, public domain", "public domain", f"Image: {who}"


def archive_meta(ident):
    m = json.loads(get(f"https://archive.org/metadata/{urllib.parse.quote(ident)}"))
    md = m.get("metadata", {})
    lic = md.get("licenseurl", "")
    if "publicdomain" not in lic and "zero" not in lic:
        raise SystemExit(f"{ident}: licence is '{lic or 'not stated'}', not public domain; use a 'file' entry if you hold rights")
    files = [f for f in m.get("files", []) if f["name"].lower().endswith(".mp4")]
    # prefer the 640x480 MPEG4 derivative, then anything bigger than the 512kb one
    best = next((f for f in files if f["name"] == f"{ident}.mp4"), None) or max(files, key=lambda f: int(f.get("size", 0) or 0))
    title = re.sub(r"^(.*), (A|An|The)$", r"\2 \1", md.get("title", ident).strip())
    ym = re.search(r"(1[89]\d\d|20\d\d)", f"{md.get('year', '')} {md.get('date', '')} {ident}")
    year = ym.group(1) if ym else "n.d."
    return f"https://archive.org/download/{ident}/{best['name']}", f"{title} ({year}): Prelinger Archives, public domain, via Internet Archive", f"Film: {title} ({year}), public domain"


def frames(src_args, out_dir, fps, vf, ext):
    """Write a clip as numbered frames + meta.json (the engine plays these back)."""
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        os.remove(os.path.join(out_dir, f))
    cmd = ["ffmpeg", "-v", "error", "-y", *src_args, "-vf", f"fps={fps},{vf}",
           *(["-q:v", "3"] if ext == "jpg" else []), os.path.join(out_dir, "f%04d." + ext)]
    for attempt in range(4):                          # remote seeks on archive.org sometimes drop
        if subprocess.run(cmd).returncode == 0:
            break
        time.sleep(10 * (attempt + 1))
    else:
        raise SystemExit(f"could not cut the clip for {out_dir}")
    n = len([f for f in os.listdir(out_dir) if f.endswith("." + ext)])
    json.dump({"fps": fps, "count": n, "ext": ext}, open(os.path.join(out_dir, "meta.json"), "w"))
    return n


def sequence(key, src, credits):
    """Video clips (Internet Archive) and animated emoji (Google Noto) become frame sequences."""
    out = os.path.join(MEDIA, key)
    if os.path.exists(os.path.join(out, "meta.json")) and key in credits:
        print(f"  ok   {key} (cached)")
        return
    if "archive" in src:
        url, credit, short = archive_meta(src["archive"])
        n = frames(["-ss", str(src["start"]), "-i", url, "-t", str(src["dur"])], out, 30,
                   "scale='trunc(iw*sar/2)*2':ih,setsar=1,scale=-2:1080:flags=lanczos,eq=contrast=1.06", "jpg")
        lic = "public domain"
    else:
        cp = "_".join(f"{ord(c):x}" for c in src["noto"] if ord(c) != 0xFE0F)
        gif = os.path.join(MEDIA, f"_noto_{cp}.gif")
        if not os.path.exists(gif):
            open(gif, "wb").write(get(f"https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/512.gif"))
        n = frames(["-i", gif], out, 30, "scale=360:-1", "png")
        credit, short, lic = "Animated emoji: Google Noto Emoji, CC BY 4.0", "", "CC BY 4.0"
    credits[key] = {"credit": src.get("credit") or credit, "licence": lic, "short": src.get("short") or short}
    print(f"  ok   {key}: {n} frames, {credits[key]['credit']}")


_raw = {}


def main(ep_path):
    ep = json.load(open(ep_path, encoding="utf-8"))
    os.makedirs(MEDIA, exist_ok=True)
    cpath = os.path.join(MEDIA, "credits.json")
    credits = json.load(open(cpath)) if os.path.exists(cpath) else {}
    for key, src in ep.get("media", {}).items():
        if "archive" in src or "noto" in src:
            sequence(key, src, credits)
            json.dump(credits, open(cpath, "w"), indent=1, ensure_ascii=False)
            continue
        dest = os.path.join(MEDIA, key + ".jpg")
        if os.path.exists(dest) and key in credits:
            print(f"  ok   {key} (cached)")
            continue
        if "file" in src:
            path = os.path.join(MEDIA, src["file"])
            if not os.path.exists(path):
                raise SystemExit(f"put {src['file']} in {MEDIA} first")
            raw, credit, lic = open(path, "rb").read(), src.get("credit", ""), "supplied"
            short = src.get("short", src.get("credit", ""))
        else:
            url, credit, lic, short = commons(src["commons"]) if "commons" in src else nasa(src["nasa"])
            raw = _raw.get(url) or get(url)
            _raw[url] = raw
        tmp = dest + ".src"
        open(tmp, "wb").write(raw)
        vf = "scale='min(2400,iw)':-2"
        if src.get("crop"):                              # [x, y, w, h] as fractions of the image
            x, y, w, h = src["crop"]
            vf = f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}," + vf
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-vf", vf, "-q:v", "3", dest], check=True)
        os.remove(tmp)
        credits[key] = {"credit": src.get("credit") or credit, "licence": lic, "short": src.get("short") or short}
        print(f"  ok   {key}: {credits[key]['credit']}")
        time.sleep(1.5)
    json.dump(credits, open(cpath, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
