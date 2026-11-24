# commons_search.py out.json "query" ... -> File-namespace search hits with capture date, licence, size
import sys, json, time, re, urllib.request, urllib.parse, urllib.error, os
UA = {"User-Agent": "ShortsPhotoResearch/1.0 (non-commercial research script)"}
def api(params):
    q = urllib.parse.urlencode({**params, "format": "json", "formatversion": 2, "maxlag": 5})
    for k in range(6):
        try:
            time.sleep(2)
            return json.load(urllib.request.urlopen(urllib.request.Request("https://commons.wikimedia.org/w/api.php?" + q, headers=UA), timeout=40))
        except urllib.error.HTTPError as e:
            if e.code != 429: raise
            w = int(e.headers.get("Retry-After") or 0) or 20 * (k + 1); print(f"   (429 wait {w}s)", flush=True); time.sleep(w)
out = json.load(open(sys.argv[1])) if os.path.exists(sys.argv[1]) else {}
for qs in sys.argv[2:]:
    r = api({"action": "query", "generator": "search", "gsrsearch": qs, "gsrnamespace": 6, "gsrlimit": 40, "prop": "imageinfo",
             "iiprop": "size|extmetadata", "iiextmetadatafilter": "DateTimeOriginal|LicenseShortName|Artist"})
    rows = []
    for p in r.get("query", {}).get("pages", []):
        x = (p.get("imageinfo") or [{}])[0]; md = x.get("extmetadata", {})
        g = lambda k: re.sub(r"<[^>]+>", "", md.get(k, {}).get("value", "")).strip()[:60]
        m = re.search(r"(19|20)\d\d", g("DateTimeOriginal"))
        rows.append({"file": p["title"], "w": x.get("width"), "h": x.get("height"), "year": int(m.group(0)) if m else None, "date": g("DateTimeOriginal"), "license": g("LicenseShortName"), "artist": g("Artist")})
    out[qs] = rows; json.dump(out, open(sys.argv[1], "w"), indent=1)
    print(f"== {qs}: {len(rows)}")
    for x in sorted(rows, key=lambda x: x["year"] or 0): print(f"   {x['year']} {x['w']}x{x['h']} {x['license'][:12]:12} {x['artist'][:18]:18} {x['file'][5:85]}")
