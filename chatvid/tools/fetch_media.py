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
           Items without a public-domain licence need "pd": "<why it is public domain>";
           "file" picks a specific file of the item; "clean": true tidies dialogue audio.
- nasa_video: a NASA video clip (public domain), picture only unless "audio": true
           (NASA productions often carry licensed music; raw footage is safe):
           {"nasa_video": "<nasa_id>", "start": 50, "dur": 3, "audio": true}
- noto:    an animated Google Noto emoji (CC BY 4.0), e.g. {"noto": "💀"}
Clips and animated emoji are stored as frame sequences in assets/media/<key>/;
clips also keep their original sound there as audio.wav.

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


def archive_meta(src):
    """Download URL and credit for an Internet Archive film. Items must carry a public
    domain / CC0 licence, or the episode must state why the film is public domain
    ("pd": "reason", e.g. a feature whose copyright was never renewed)."""
    ident = src["archive"]
    m = json.loads(get(f"https://archive.org/metadata/{urllib.parse.quote(ident)}"))
    md = m.get("metadata", {})
    lic = md.get("licenseurl", "")
    if "publicdomain" not in lic and "zero" not in lic and not src.get("pd"):
        raise SystemExit(f"{ident}: licence is '{lic or 'not stated'}', not public domain; "
                         "add \"pd\": \"<why it is public domain>\" if it is, or use a 'file' entry if you hold rights")
    files = [f for f in m.get("files", []) if f["name"].lower().endswith(".mp4")]
    # an explicit file, else the 640x480 MPEG4 derivative, else the biggest mp4
    best = (next((f for f in files if f["name"] == src.get("file")), None)
            or next((f for f in files if f["name"] == f"{ident}.mp4"), None)
            or max(files, key=lambda f: int(f.get("size", 0) or 0)))
    title = src.get("title") or re.sub(r"^(.*), (A|An|The)$", r"\2 \1", md.get("title", ident).strip())
    ym = re.search(r"(1[89]\d\d|20\d\d)", f"{src.get('year', '')} {md.get('year', '')} {md.get('date', '')} {ident}")
    year = ym.group(1) if ym else "n.d."
    coll = md.get("collection", [])
    coll = coll if isinstance(coll, list) else [coll]
    where = "Prelinger Archives, public domain, via Internet Archive" if "prelinger" in coll else "public domain, via Internet Archive"
    url = f"https://archive.org/download/{ident}/{urllib.parse.quote(best['name'])}"
    # a trailer cuts dozens of clips from one film: keep a local copy of films up to
    # 400 MB instead of seeking the remote file for every clip
    size = int(best.get("size", 0) or 0)
    if src.get("cache", size and size < 400e6):
        local = os.path.join(ROOT, "assets", "films", f"{ident}__{best['name']}")
        if not os.path.exists(local):
            os.makedirs(os.path.dirname(local), exist_ok=True)
            print(f"  downloading {ident}/{best['name']} ({size / 1e6:.0f} MB) once for cutting")
            subprocess.run(["curl", "-sSfL", "--retry", "4", "-o", local + ".part", url], check=True)
            os.replace(local + ".part", local)
        url = local
    return url, f"{title} ({year}): {where}", f"Film: {title} ({year}), public domain"


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


def nasa_video(nasa_id):
    """Best rendition of a NASA Image and Video Library video, plus its credit."""
    d = json.loads(get(f"https://images-api.nasa.gov/search?nasa_id={urllib.parse.quote(nasa_id)}"))
    meta = d["collection"]["items"][0]["data"][0]
    files = json.loads(get(f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nasa_id)}"))["collection"]["items"]
    mp4 = [f["href"] for f in files if f["href"].lower().endswith(".mp4")]
    pick = next((h for tag in ("~large", "~medium", "~orig", "~small", "~mobile") for h in mp4 if tag in h), None)
    if not pick:
        raise SystemExit(f"no mp4 rendition for {nasa_id}")
    center = meta.get("center") or "NASA"
    who = "NASA/JPL-Caltech" if center == "JPL" else "NASA"
    url = pick.replace("http://", "https://").replace(" ", "%20")
    return url, f"{meta.get('title', nasa_id)}: {who}, public domain", f"Video: {who}"


def clip_source(src):
    if "archive" in src:
        return archive_meta(src)
    return nasa_video(src["nasa_video"])


def clip_audio(src, out):
    """The clip's original sound, cut with the same -ss/-t as its frames so they stay in sync."""
    url, _, _ = clip_source(src)
    dest = os.path.join(out, "audio.wav")
    # "clean": dialogue from old prints - cut the rumble and the hiss above the voice band
    af = ["-af", "highpass=f=90,lowpass=f=7500,afftdn=nr=8:nf=-42"] if src.get("clean") else []
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", str(src["start"]), "-i", url, "-t", str(src["dur"]),
           "-vn", *af, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", dest]
    for attempt in range(4):
        if subprocess.run(cmd).returncode == 0:
            audio_level(out)
            return
        time.sleep(10 * (attempt + 1))
    print(f"  !    no audio for {out} (the clip will play silent)")


def audio_level(out):
    """Store the clip's mean loudness in meta.json; near-silent clips (just film hiss)
    are left silent by the engine instead of being boosted."""
    r = subprocess.run(["ffmpeg", "-i", os.path.join(out, "audio.wav"), "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: (-?[\d.]+) dB", r)
    mp = os.path.join(out, "meta.json")
    meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta["audio_db"] = float(m.group(1)) if m else -99.0
    json.dump(meta, open(mp, "w"))


def sequence(key, src, credits):
    """Video clips (Internet Archive) and animated emoji (Google Noto) become frame sequences."""
    out = os.path.join(MEDIA, key)
    mp = os.path.join(out, "meta.json")
    if os.path.exists(mp) and json.load(open(mp)).get("src", src) != src:
        credits.pop(key, None)                       # the clip was re-timed: cut it again
    if os.path.exists(mp) and key in credits:
        if "archive" in src and src.get("audio", True) and not os.path.exists(os.path.join(out, "audio.wav")):
            clip_audio(src, out)                         # older cache without sound
            print(f"  ok   {key} (cached, audio added)")
        else:
            print(f"  ok   {key} (cached)")
        return
    if "archive" in src or "nasa_video" in src:
        url, credit, short = clip_source(src)
        grade = ",eq=contrast=1.06" if "archive" in src else ""
        n = frames(["-ss", str(src["start"]), "-i", url, "-t", str(src["dur"])], out, 30,
                   f"scale='trunc(iw*sar/2)*2':ih,setsar=1,scale=-2:1080:flags=lanczos{grade}", "jpg")
        lic = "public domain"
        # NASA productions often use licensed stock music: their sound is only taken when
        # the episode asks for it ("audio": true), e.g. raw launch or station footage
        if src.get("audio", "archive" in src):
            clip_audio(src, out)                         # after frames(): it adds audio_db to meta.json
    else:
        cp = "_".join(f"{ord(c):x}" for c in src["noto"] if ord(c) != 0xFE0F)
        gif = os.path.join(MEDIA, f"_noto_{cp}.gif")
        if not os.path.exists(gif):
            open(gif, "wb").write(get(f"https://fonts.gstatic.com/s/e/notoemoji/latest/{cp}/512.gif"))
        n = frames(["-i", gif], out, 30, "scale=360:-1", "png")
        credit, short, lic = "Animated emoji: Google Noto Emoji, CC BY 4.0", "", "CC BY 4.0"
    credits[key] = {"credit": src.get("credit") or credit, "licence": lic, "short": src.get("short") or short}
    meta = json.load(open(mp))
    meta["src"] = src
    json.dump(meta, open(mp, "w"))
    print(f"  ok   {key}: {n} frames, {credits[key]['credit']}")


_raw = {}


def main(ep_path):
    ep = json.load(open(ep_path, encoding="utf-8"))
    os.makedirs(MEDIA, exist_ok=True)
    cpath = os.path.join(MEDIA, "credits.json")
    credits = json.load(open(cpath)) if os.path.exists(cpath) else {}
    media = dict(ep.get("media", {}))
    slug = os.path.splitext(os.path.basename(ep_path))[0]
    gen = os.path.join(ROOT, "assets", "voice", slug, "media.json")
    if os.path.exists(gen):                          # clips generated by docu_prepare.py
        media.update(json.load(open(gen)))
    for key, src in media.items():
        if "archive" in src or "nasa_video" in src or "noto" in src:
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
