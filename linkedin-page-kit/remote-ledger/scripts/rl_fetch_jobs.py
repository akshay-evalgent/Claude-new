"""Monday pull: public job APIs reachable without login. Writes data/candidates-<date>.json for a human to verify.
Usage: python3 scripts/rl_fetch_jobs.py   (from remote-ledger/)"""
import json, re, os, sys, html, datetime, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
GREENHOUSE = ["anthropic","scaleai","turing","labelbox","togetherai","assemblyai","snorkelai","vercel","stabilityai","inflectionai"]
ASHBY = ["openai","mercor","elevenlabs","perplexity","modal","baseten","cursor","cognition","sierra","harvey","deepgram","pika","decagon","vapi","lovable","notion","linear","ramp","oscilar"]
OK = re.compile(r"india|bengaluru|bangalore|mumbai|hyderabad|pune|delhi|chennai|apac|asia|anywhere|worldwide|global", re.I)
RESTRICT = re.compile(r"united states|\bus\b|usa|canada|\buk\b|london|europe|emea|germany|france|san francisco|new york|seattle|latam|brazil|mexico|poland|japan|tokyo|singapore|australia|dublin|zurich|berlin|paris|amsterdam|ontario|toronto|sweden|spain|korea|colombia|uae|riyadh|sydney|munich|chicago|boston|dallas|madrid|belgrade", re.I)
UA = {"User-Agent": "Mozilla/5.0"}
def get(url):
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read().decode("utf-8", "ignore")
    except Exception as e: print("skip", url, e); return None
def clean(t): return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", t or ""))).strip()
def open_remote(loc): return bool(OK.search(loc)) or (re.search(r"remote", loc, re.I) and not RESTRICT.search(loc))
out = []
for slug in GREENHOUSE:
    s = get(f"https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=false")
    if not s: continue
    for j in json.loads(s).get("jobs", []):
        loc = ((j.get("location") or {}).get("name") or "") + " " + ", ".join((o or {}).get("name", "") for o in j.get("offices", []))
        if open_remote(loc): out.append(dict(source=f"greenhouse:{slug}", company=slug, title=j["title"], where=loc.strip(), posted=(j.get("updated_at") or "")[:10], url=j["absolute_url"], pay=""))
for slug in ASHBY:
    s = get(f"https://api.ashbyhq.com/posting-api/job-board/{slug}")
    if not s: continue
    for j in json.loads(s).get("jobs", []):
        loc = (j.get("location") or "") + " " + ", ".join((x or {}).get("location", "") for x in (j.get("secondaryLocations") or []))
        if OK.search(loc) or (j.get("isRemote") and not RESTRICT.search(loc)):
            comp = (j.get("compensation") or {}).get("compensationTierSummary") or ""
            out.append(dict(source=f"ashby:{slug}", company=slug, title=j["title"], where=loc.strip(), posted=(j.get("publishedAt") or "")[:10], url=j["jobUrl"], pay=comp))
s = get("https://remotive.com/api/remote-jobs")
if s:
    for j in json.loads(s).get("jobs", []):
        if OK.search(j.get("candidate_required_location") or ""):
            out.append(dict(source="remotive", company=j["company_name"], title=j["title"], where=j["candidate_required_location"], posted=j["publication_date"][:10], url=j["url"], pay=j.get("salary") or ""))
s = get("https://remoteok.com/api")
if s:
    for j in json.loads(s)[1:]:
        if open_remote(j.get("location") or ""):
            out.append(dict(source="remoteok", company=j.get("company"), title=j.get("position"), where=j.get("location"), posted=(j.get("date") or "")[:10], url=j.get("url"), pay=(f"${j['salary_min']}-{j['salary_max']}" if j.get("salary_min") else "")))
s = get("https://weworkremotely.com/remote-jobs.rss")
if s:
    for it in re.findall(r"<item>(.*?)</item>", s, re.S):
        t = clean(re.search(r"<title>(.*?)</title>", it, re.S).group(1)); reg = clean((re.search(r"<region>(.*?)</region>", it, re.S) or [None, ""])[1] if re.search(r"<region>", it) else "")
        link = (re.search(r"<link>(.*?)</link>", it, re.S) or [None, ""])[1]; d = clean((re.search(r"<description>(.*?)</description>", it, re.S) or [None, ""])[1])
        restricted = re.search(r"only considering candidates (located|based) in|must be (located|based) in the (us|united states|uk|eu)|within the united states|authori[sz]ed to work in the (us|united states)|based in the (ET|PT|US)", d, re.I)
        if re.search(r"anywhere|worldwide|india|asia|global", reg, re.I) and not restricted:
            out.append(dict(source="wwr", company=t.split(":")[0], title=t.split(":", 1)[-1].strip(), where=reg, posted=(re.search(r"<pubDate>(.*?)</pubDate>", it, re.S) or [None, ""])[1][:16], url=link, pay=""))
s = get("https://himalayas.app/jobs/api?limit=100")
if s:
    for j in json.loads(s).get("jobs", []):
        locs = ", ".join(j.get("locationRestrictions") or [])
        if not locs or OK.search(locs):
            out.append(dict(source="himalayas", company=j["companyName"], title=j["title"], where=locs or "no restriction listed", posted=str(j.get("pubDate", ""))[:10], url=j.get("applicationLink"), pay=(f"{j.get('minSalary')}-{j.get('maxSalary')} {j.get('currency') or ''}" if j.get("minSalary") else "")))
# Hacker News: this month's Who is hiring + Seeking freelancer
now = datetime.date.today(); month = now.strftime("%B %Y")
for q, tag in ((f"Who is hiring? ({month})", "who"), (f"Freelancer? Seeking freelancer? ({month})", "freelance")):
    s = get("https://hn.algolia.com/api/v1/search_by_date?query=" + urllib.request.quote(f'"{q}"') + "&tags=ask_hn&hitsPerPage=3")
    if not s: continue
    hits = [h for h in json.loads(s).get("hits", []) if q.lower() in (h.get("title") or "").lower()]
    if not hits: continue
    th = get(f"https://hn.algolia.com/api/v1/items/{hits[0]['objectID']}")
    if not th: continue
    for c in json.loads(th).get("children", []):
        t = clean(c.get("text"))
        if tag == "who":
            if not re.search(r"remote", t, re.I) or RESTRICT.search(t[:160]) and not OK.search(t[:160]): continue
            if not re.search(r"worldwide|anywhere|global|india|asia|apac|any (location|country|timezone|time zone)|all time ?zones|100% remote|fully remote", t[:300], re.I): continue
        else:
            if not re.search(r"seeking freelancer", t, re.I): continue
        out.append(dict(source=f"hn:{tag}", company=t.split("|")[0][:60].strip(), title=t[:200], where="see text", posted=(c.get("created_at") or "")[:10], url=f"https://news.ycombinator.com/item?id={c['id']}", pay=""))
path = os.path.join(ROOT, "data", f"candidates-{now.isoformat()}.json")
json.dump(dict(fetched=now.isoformat(), count=len(out), rows=out), open(path, "w"), indent=1, ensure_ascii=False)
print(len(out), "candidates ->", path, "\nNow open each link and keep only postings whose own words allow India.")
