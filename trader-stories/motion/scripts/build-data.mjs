// Builds the data files the templates read. Run: npm run data
//   src/data/shc.json            Shanghai Composite daily closes, 1990-12-19 to 2017-12-29 (Sina Finance)
//   src/data/east-asia-land.json  coastline for maps, clipped from Natural Earth 1:10m (world-atlas)
//   src/films/xu-xiang/shots.json shot timings, from ../xu-xiang/shots.csv
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = (p, data) => {
  fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
  fs.writeFileSync(path.join(root, p), JSON.stringify(data));
  console.log("wrote", p);
};

// 1. Shanghai Composite
const skipIndex = process.argv.includes("--skip-index");
if (!skipIndex) {
  const url = "https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=sh000001&scale=240&ma=no&datalen=10000";
  const rows = await (await fetch(url)).json();
  const closes = rows
    .filter((r) => r.day <= "2017-12-31")
    .map((r) => [r.day, Math.round(parseFloat(r.close) * 100) / 100]);
  if (closes[0][0] !== "1990-12-19") throw new Error("Unexpected first date " + closes[0][0]);
  out("src/data/shc.json", { source: "Sina Finance, sh000001 daily closes", closes });
}

// 2. Coastline, clipped to a box around eastern China (no political borders)
const BOX = { w: 95, e: 140, s: 15, n: 50 };
const topo = require("world-atlas/land-10m.json");
const land = feature(topo, topo.objects.land);
function clipRing(ring) {
  const edges = [
    (p) => p[0] >= BOX.w, (p) => p[0] <= BOX.e, (p) => p[1] >= BOX.s, (p) => p[1] <= BOX.n,
  ];
  const cut = [
    (a, b) => [BOX.w, a[1] + ((BOX.w - a[0]) * (b[1] - a[1])) / (b[0] - a[0])],
    (a, b) => [BOX.e, a[1] + ((BOX.e - a[0]) * (b[1] - a[1])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((BOX.s - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), BOX.s],
    (a, b) => [a[0] + ((BOX.n - a[1]) * (b[0] - a[0])) / (b[1] - a[1]), BOX.n],
  ];
  let pts = ring;
  for (let k = 0; k < 4; k++) {
    const res = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = edges[k](a), ib = edges[k](b);
      if (ia) res.push(a);
      if (ia !== ib) res.push(cut[k](a, b));
    }
    pts = res;
    if (!pts.length) return null;
  }
  pts.push(pts[0]);
  return pts.length > 3 ? pts.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]) : null;
}
const polys = [];
for (const f of land.features) {
  const list = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of list) {
    // d3-geo winding: keep the outer ring only; lakes are not needed at this scale
    const ring = clipRing(poly[0].slice(0, -1));
    if (ring) polys.push([ring]);
  }
}
out("src/data/east-asia-land.json", {
  type: "Feature",
  properties: { source: "Natural Earth 1:10m land via world-atlas, clipped" },
  geometry: { type: "MultiPolygon", coordinates: polys },
});

// 3. Shot timings for each film that has a shots.csv
for (const film of ["xu-xiang"]) {
  const csvPath = path.join(root, "..", film, "shots.csv");
  const text = fs.readFileSync(csvPath, "utf8");
  const rows = [];
  let field = "", row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') q = false;
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  const [head, ...body] = rows;
  const shots = body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  // With a recorded voice (timing.json), each shot lasts its narration plus a breath,
  // with an extra beat at the end of each section. Otherwise use the word-count estimate.
  const timingPath = path.join(root, "src/films", film, "timing.json");
  const vo = fs.existsSync(timingPath) ? JSON.parse(fs.readFileSync(timingPath, "utf8")).shots : null;
  const BREATH = 0.3, SECTION_BEAT = 1.0, MIN_SHOT = 1.2;
  let t = 0;
  const timed = shots.map((s, i) => {
    let seconds = +s.seconds;
    if (vo) {
      const hold = +(s.hold || 0);
      seconds = vo[s.shot_id] ? vo[s.shot_id].audio + BREATH + hold : hold || seconds;
      const next = shots[i + 1];
      if (!next || next.section !== s.section) seconds += SECTION_BEAT;
      seconds = Math.max(MIN_SHOT, Math.round(seconds * 30) / 30);
    }
    const o = { id: s.shot_id, section: +s.section, family: s.family, seconds, start: Math.round(t * 1000) / 1000,
      image: s.image_id, onScreen: s.on_screen, tag: s.tag ?? "", motion: s.motion, voice: !!(vo && vo[s.shot_id]) };
    t += seconds;
    return o;
  });
  console.log(`${film}: ${timed.length} shots, ${(t / 60).toFixed(2)} min${vo ? " (timed to the recorded voice)" : ""}`);
  out(`src/films/${film}/shots.json`, timed);
}
