"""Build the public tracker page (tracker/index.html) from data/tracker-<date>.json."""
import json, re, sys, os, html
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "tracker-2026-11-09.json")
d = json.load(open(src)); rows = d["rows"]; as_of = d["as_of"]
def lane(w):
    w = w.lower()
    if "remote" in w and re.search(r"india|pakistan", w): return "Remote in India"
    if re.search(r"worldwide|anywhere|global|any tz|non-us|apac|flexible hours|fully remote|^remote$|remote, flexible", w): return "Worldwide"
    if "remote" in w: return "Worldwide"
    return "India-based"
for r in rows: r["lane"] = lane(r["where"])
data_js = json.dumps(rows, ensure_ascii=False)
page = f"""<title>Remote Ledger Tracker</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
/* layout: one column, a ledger table that becomes stacked cards on phones */
:root{{--bg:#faf9f5;--panel:#ffffff;--ink:#12161e;--muted:#6f726f;--rule:#d7d3c9;--accent:#108554;--accent-ink:#ffffff;--tag:#eef6f1;
 --display:"Inter",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace}}
@media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--bg:#14171c;--panel:#1c2026;--ink:#f1f0ea;--muted:#9a9d98;--rule:#333840;--accent:#3dbb84;--accent-ink:#0d1a13;--tag:#1f2d26;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#14171c;--panel:#1c2026;--ink:#f1f0ea;--muted:#9a9d98;--rule:#333840;--accent:#3dbb84;--accent-ink:#0d1a13;--tag:#1f2d26;color-scheme:dark}}
body{{background:var(--bg);color:var(--ink);font-family:var(--display);font-size:15px;line-height:1.5;margin:0;padding-block:28px 56px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}}
.wrap{{max-width:1080px;margin:0 auto}}
header{{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 24px;border-bottom:1px solid var(--rule);padding-bottom:18px}}
.brand{{display:flex;align-items:center;gap:12px}}
.mark{{width:40px;height:40px;border:1px solid var(--rule);border-radius:9px;background:var(--panel);display:grid;place-items:center}}
.mark svg{{width:26px;height:26px}}
.brand b{{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600}}
h1{{font-size:clamp(26px,4vw,38px);line-height:1.1;margin:10px 0 6px;letter-spacing:-.01em;text-wrap:balance}}
.sub{{color:var(--muted);max-width:62ch;margin:0}}
.asof{{font-family:var(--mono);font-size:12.5px;color:var(--muted)}}
.checks{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:22px 0}}
.check{{border:1px solid var(--rule);border-radius:12px;padding:12px 14px;background:var(--panel)}}
.check b{{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:4px}}
.check span{{color:var(--muted);font-size:14px}}
.controls{{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:8px 0 18px}}
.controls input{{flex:1 1 240px;min-width:0;font:inherit;padding:10px 12px;border:1px solid var(--rule);border-radius:10px;background:var(--panel);color:var(--ink)}}
.controls input:focus,.chip:focus-visible,a:focus-visible{{outline:2px solid var(--accent);outline-offset:2px}}
.chip{{font:inherit;font-size:13.5px;font-weight:500;padding:8px 12px;border:1px solid var(--rule);border-radius:999px;background:var(--panel);color:var(--ink);cursor:pointer}}
.chip[aria-pressed="true"]{{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}}
.count{{color:var(--muted);font-size:13.5px;margin-left:auto}}
.tablewrap{{overflow-x:auto;border:1px solid var(--rule);border-radius:14px;background:var(--panel)}}
table{{border-collapse:collapse;width:100%;min-width:860px}}
th{{text-align:left;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;padding:12px 14px;border-bottom:1px solid var(--rule)}}
td{{padding:12px 14px;border-bottom:1px solid var(--rule);vertical-align:top}}
tr:last-child td{{border-bottom:0}}
td.co{{font-weight:600;white-space:nowrap}}
td.role{{min-width:240px}}
td.role small{{display:block;color:var(--muted);font-size:13px;margin-top:3px}}
.tag{{display:inline-block;font-family:var(--mono);font-size:12px;padding:3px 8px;border-radius:7px;background:var(--tag);color:var(--accent);white-space:nowrap}}
td.pay{{font-family:var(--mono);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}}
td.pay.none{{color:var(--muted);font-family:var(--display)}}
td.date{{font-family:var(--mono);font-size:12.5px;color:var(--muted);white-space:nowrap}}
a.apply{{color:var(--accent);font-weight:600;text-decoration:none;white-space:nowrap}}
a.apply:hover{{text-decoration:underline}}
.cards{{display:none}}
@media (max-width:720px){{
 .tablewrap{{display:none}}
 .cards{{display:grid;gap:10px}}
 .card{{border:1px solid var(--rule);border-radius:12px;background:var(--panel);padding:12px 14px;display:grid;gap:6px}}
 .card .top{{display:flex;justify-content:space-between;gap:10px;align-items:baseline}}
 .card .top b{{font-size:16px}}
 .card .meta{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:13px;color:var(--muted)}}
 .card .pay{{font-family:var(--mono);font-size:13px}}
}}
footer{{margin-top:28px;color:var(--muted);font-size:13.5px;max-width:70ch}}
footer p{{margin:8px 0}}
.empty{{padding:28px;text-align:center;color:var(--muted)}}
</style>
<div class="wrap">
<header>
 <div>
  <div class="brand"><div class="mark"><svg viewBox="0 0 26 26" aria-hidden="true"><rect x="3" y="6" width="11" height="2.6" rx="1.3" fill="#d7d3c9"/><rect x="16" y="5.5" width="7" height="3.6" rx="1.8" fill="currentColor"/><rect x="3" y="12" width="9" height="2.6" rx="1.3" fill="#d7d3c9"/><rect x="14" y="11.5" width="9" height="3.6" rx="1.8" fill="currentColor"/><rect x="3" y="18" width="7" height="2.6" rx="1.3" fill="#d7d3c9"/><rect x="11" y="17.5" width="12" height="3.6" rx="1.8" fill="#108554"/></svg></div><b>Remote Ledger</b></div>
  <h1>Remote roles open to India, this week</h1>
  <p class="sub">Every row was read from the posting's own text, not the job board's "remote" label. Pay appears only where the posting states it. Postings close without notice; open the link before you spend an evening on the application.</p>
 </div>
 <div class="asof">Checked {as_of} · {len(rows)} roles</div>
</header>
<section class="checks" aria-label="The three checks">
 <div class="check"><b>Open to India?</b><span>The "where" column quotes the posting's location wording. "Remote in India" means it says so. "India-based" means an office in India.</span></div>
 <div class="check"><b>What it pays</b><span>Only figures the posting states. "Not stated" means the company did not say, and we did not guess.</span></div>
 <div class="check"><b>Where it came from</b><span>Company boards on Greenhouse and Ashby, Remotive, and the month's Hacker News hiring thread. Each link goes to the original.</span></div>
</section>
<div class="controls" role="group" aria-label="Filter roles">
 <input id="q" type="search" placeholder="Search company, role, where…" aria-label="Search roles">
 <button class="chip" type="button" data-f="all" aria-pressed="true" id="f-all">All</button>
 <button class="chip" type="button" data-f="Remote in India" aria-pressed="false" id="f-rin">Remote in India</button>
 <button class="chip" type="button" data-f="Worldwide" aria-pressed="false" id="f-ww">Worldwide</button>
 <button class="chip" type="button" data-f="India-based" aria-pressed="false" id="f-ib">India-based</button>
 <button class="chip" type="button" data-f="pay" aria-pressed="false" id="f-pay">Pay stated</button>
 <span class="count" id="count"></span>
</div>
<div class="tablewrap"><table>
 <thead><tr><th>Company</th><th>Role</th><th>Where, as posted</th><th>Type</th><th>Pay, as posted</th><th>Posted</th><th></th></tr></thead>
 <tbody id="rows"></tbody>
</table></div>
<div class="cards" id="cards"></div>
<div class="empty" id="empty" hidden>Nothing matches. Clear the search or pick another filter.</div>
<footer>
 <p>Know a role open to India that is missing here? Comment on this week's Monday post on the Remote Ledger LinkedIn page with the link, and we will check it for next week.</p>
 <p>Pitching is free. Applying is free. We never list anything that charges you to apply.</p>
</footer>
</div>
<script>
const ROWS = {data_js};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}}[c]));
let filter = "all", q = "";
function matches(r) {{
  if (filter === "pay" && !r.pay) return false;
  if (filter !== "all" && filter !== "pay" && r.lane !== filter) return false;
  if (q) {{ const hay = (r.company + " " + r.role + " " + r.where + " " + r.type + " " + r.pay + " " + r.note).toLowerCase(); if (!hay.includes(q)) return false; }}
  return true;
}}
function render() {{
  const list = ROWS.filter(matches);
  document.getElementById("rows").innerHTML = list.map(r => `<tr>
    <td class="co">${{esc(r.company)}}</td>
    <td class="role">${{esc(r.role)}}<small>${{esc(r.note)}}</small></td>
    <td><span class="tag">${{esc(r.where)}}</span></td>
    <td>${{esc(r.type)}}</td>
    <td class="pay ${{r.pay ? "" : "none"}}">${{r.pay ? esc(r.pay) : "Not stated"}}</td>
    <td class="date">${{esc(r.posted)}}</td>
    <td><a class="apply" href="${{esc(r.url)}}" target="_blank" rel="noopener">Open ↗</a></td></tr>`).join("");
  document.getElementById("cards").innerHTML = list.map(r => `<div class="card">
    <div class="top"><b>${{esc(r.company)}}</b><a class="apply" href="${{esc(r.url)}}" target="_blank" rel="noopener">Open ↗</a></div>
    <div>${{esc(r.role)}}</div>
    <div class="meta"><span class="tag">${{esc(r.where)}}</span><span>${{esc(r.type)}}</span><span>${{esc(r.posted)}}</span></div>
    <div class="pay">${{r.pay ? esc(r.pay) : "Pay not stated"}}</div>
    <div class="meta">${{esc(r.note)}}</div></div>`).join("");
  document.getElementById("count").textContent = list.length + " of " + ROWS.length;
  document.getElementById("empty").hidden = list.length > 0;
}}
document.querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {{
  filter = b.dataset.f; document.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false")); render();
}}));
document.getElementById("q").addEventListener("input", e => {{ q = e.target.value.trim().toLowerCase(); render(); }});
render();
</script>
"""
out = os.path.join(ROOT, "tracker", "index.html"); open(out, "w").write(page); print(out, len(page), "bytes")
