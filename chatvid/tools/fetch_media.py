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


_raw = {}


def main(ep_path):
    ep = json.load(open(ep_path, encoding="utf-8"))
    os.makedirs(MEDIA, exist_ok=True)
    cpath = os.path.join(MEDIA, "credits.json")
    credits = json.load(open(cpath)) if os.path.exists(cpath) else {}
    for key, src in ep.get("media", {}).items():
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
