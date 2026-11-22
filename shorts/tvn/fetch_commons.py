#!/usr/bin/env python3
"""Download Wikimedia Commons photos politely (standard 1920 px thumbnails) and record their credits.

    python3 tvn/fetch_commons.py <outdir> "File:Name one.jpg=local_name.jpg" "File:Other.jpg=other.jpg" ...

Writes <outdir>/<local_name> and appends one line per photo to <outdir>/credits.json:
file, page, capture date, licence, author. The description of every video must credit each photo
(CC BY / CC BY-SA require it).
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "ShortsPhotoResearch/1.0 (non-commercial research script)"}
STANDARD = [1920, 1280, 960, 500, 330, 250]     # Wikimedia's standard thumbnail widths (originals are rate-limited)


def get(url, tries=6):
    for k in range(tries):
        try:
            time.sleep(2.5)
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or k == tries - 1:
                raise
            w = int(e.headers.get("Retry-After") or 0) or 20 * (k + 1)
            print(f"   (429, waiting {w}s)", flush=True); time.sleep(w)


def main():
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    cred_p = os.path.join(out, "credits.json")
    credits = json.load(open(cred_p)) if os.path.exists(cred_p) else {}
    for arg in sys.argv[2:]:
        title, local = arg.rsplit("=", 1)
        if os.path.exists(os.path.join(out, local)) and local in credits:
            continue
        q = {"action": "query", "titles": title, "prop": "imageinfo", "iiprop": "size", "format": "json", "formatversion": 2}
        w0 = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))["query"]["pages"][0]["imageinfo"][0]["width"]
        tw = next((w for w in STANDARD if w < w0), STANDARD[-1])
        q.update({"iiprop": "url|size|extmetadata", "iiurlwidth": tw})
        r = json.loads(get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(q)))
        p = r["query"]["pages"][0]; x = p["imageinfo"][0]; md = x.get("extmetadata", {})
        g = lambda k: re.sub(r"<[^>]+>", "", md.get(k, {}).get("value", "")).strip()
        url = x["thumburl"].split("?")[0]
        open(os.path.join(out, local), "wb").write(get(url))
        credits[local] = {"file": title, "page": x["descriptionurl"], "date": g("DateTimeOriginal") or g("DateTime"),
                          "license": g("LicenseShortName"), "license_url": g("LicenseUrl"), "author": g("Artist")[:200],
                          "w": x["width"], "h": x["height"]}
        json.dump(credits, open(cred_p, "w"), indent=1)
        c = credits[local]; print(f"{local}: {c['date'][:10]} | {c['license']} | {c['author'][:40]}", flush=True)


if __name__ == "__main__":
    main()
