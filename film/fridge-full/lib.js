// Runtime for the data-driven film: option resolving, cameras, sound-cue capture,
// text cards, icons, bacteria and maps. Scenes live in scenes_*.js and register on SCN.
'use strict';
const SCN = {};

// ---------- sound cues ----------
// Helpers report what they animate; extractCues() turns that into a cue sheet for sfx.py.
const CUE = { on: false, list: [], amb: null, shot: null };
function cue(kind, t0, extra = {}) {
  if (!CUE.on || typeof t0 !== 'number' || !isFinite(t0) || t0 < -0.01 || t0 > CUE.shot.end - CUE.shot.start) return;
  CUE.list.push(Object.assign({ t: +(CUE.shot.start + t0).toFixed(3), kind }, extra));
}
function amb(kind) { if (CUE.on) CUE.amb.add(kind); }
function wrapFn(name, before) {
  const orig = window[name];
  window[name] = function (...a) { before(...a); return orig.apply(this, a); };
}
wrapFn('pop', (x, y, t, t0) => cue('pop', t0));
wrapFn('hand', (txt, x, y, size, t, t0, o = {}) => cue('write', t0, { dur: +Math.min(1.2, txt.length * (o.per ?? 0.035)).toFixed(2) }));
wrapFn('xmark', (cx, cy, r, t, t0) => cue('scribble', t0, { dur: 0.34 }));
wrapFn('check', (cx, cy, s, t, t0) => cue('scribble', t0, { dur: 0.3 }));
wrapFn('arrow', (x1, y1, x2, y2, t, t0, dur = 0.45) => cue('scribble', t0, { dur }));
wrapFn('tag', (txt, t, t0 = 0) => cue('whoosh', t0));
wrapFn('sparkle', (x, y, t, t0) => cue('chime', t0));
wrapFn('fire', () => amb('fire'));
wrapFn('fliesAround', () => amb('flies'));
wrapFn('fly', () => amb('flies'));
wrapFn('bgSavanna', () => amb('wind'));
wrapFn('bgSnow', () => amb('cold'));
wrapFn('bgNight', () => amb('night'));
wrapFn('kitchen', () => amb('hum'));
wrapFn('windLines', () => amb('gust'));

// ---------- option resolving ----------
function resolveOpt(v, c) {
  if (Array.isArray(v)) return v.map(x => resolveOpt(x, c));
  if (typeof v !== 'string') return v;
  if (v === 'DONE') return DONE;
  if (v === 'NEVER') return NEVER;
  const m = v.match(/^@([A-Za-z']+)([+-][\d.]+)?$/);
  if (m) return c.at(m[1]) + (m[2] ? parseFloat(m[2]) : 0);
  return v;
}
const TEXT_KEYS = new Set(['lines', 'label', 'city', 'region', 'mode', 'kind', 'icon', 'item', 'found', 'phase', 'pins', 'text', 'title', 'l1', 'l2', 'show']);
function resolveOpts(o, c) { const r = {}; for (const k in o) r[k] = TEXT_KEYS.has(k) ? o[k] : resolveOpt(o[k], c); return r; }

// ---------- cameras ----------
const CAMS = {
  push: (c, i) => { const fx = i % 2 ? 900 : 1020, fy = i % 3 ? 540 : 580; return [fx, fy, lerp(1.0, 1.06, eio(c.t / c.d))]; },
  pull: (c) => [960, 560, lerp(1.14, 1.0, eio(c.t / c.d))],
  auto: (c, i) => { const fx = [760, 1160, 960][i % 3], fy = [520, 600, 560][i % 3]; return [fx, fy, lerp(1.16, 1.22, eio(c.t / c.d))]; },
  sunToMeat: (c) => { const p = eio((c.t - (c.at('it') - 0.35)) / 0.75); return [lerp(1600, 1080, p), lerp(260, 760, p), lerp(1.7, 1.12, p)]; },
};
function camFor(spec, c, i) {
  if (Array.isArray(spec)) { const [x, y, z0, z1] = spec; return [x, y, lerp(z0, z1, eio(c.t / c.d))]; }
  return (CAMS[spec] || CAMS.push)(c, i);
}

// ---------- icons ----------
function bug(s = 1, mood = 'bad', t = 0, seed = 1) {
  const col = mood === 'good' ? '#8ED0E8' : mood === 'dry' ? '#C9C2A6' : '#8CC152';
  const w = Math.sin(t * 6 + seed) * 4;
  let o = `<path d="M-40 -6 q-26 ${f1(-14 + w)} -44 ${f1(-6 + w)} M40 6 q26 ${f1(14 - w)} 44 ${f1(6 - w)}" fill="none" ${S} stroke-width="4"/>`;
  o += `<rect x="-46" y="-30" width="92" height="60" rx="30" fill="${col}" ${S} stroke-width="5"/>`;
  o += `<circle cx="-24" cy="-10" r="4" fill="${C.ink}" opacity=".35"/><circle cx="26" cy="14" r="5" fill="${C.ink}" opacity=".35"/>`;
  if (mood === 'good') o += `<circle cx="-10" cy="-4" r="5" fill="${C.ink}"/><circle cx="12" cy="-4" r="5" fill="${C.ink}"/><path d="M-10 8 Q1 18 12 8" fill="none" ${S} stroke-width="4"/>`;
  else if (mood === 'dry') o += `<path d="M-16 -4 h12 M6 -4 h12 M-8 12 q9 -6 18 0" fill="none" ${S} stroke-width="4"/>`;
  else o += `<path d="M-18 -16 L-4 -8 M18 -16 L4 -8" ${S} stroke-width="4"/><circle cx="-9" cy="-3" r="5" fill="${C.ink}"/><circle cx="10" cy="-3" r="5" fill="${C.ink}"/><path d="M-10 14 Q1 6 12 14" fill="none" ${S} stroke-width="4"/>`;
  return g(`scale(${s})`, o);
}
function fishShape(s = 1, col = '#9DB4C0', rot = 0) {
  return g(`rotate(${rot}) scale(${s})`, `<path d="M-70 0 Q-20 -40 40 -6 L80 -34 L72 0 L80 34 L40 6 Q-20 40 -70 0 Z" fill="${col}" ${S} stroke-width="5"/><circle cx="-44" cy="-6" r="5" fill="${C.ink}"/><path d="M-20 -16 Q-10 0 -20 16" fill="none" ${S} stroke-width="3.5"/>`);
}
function grainStalk(s = 1, sway = 0) {
  let o = `<path d="M0 0 Q${f1(sway * 0.4)} -120 ${f1(sway)} -230" fill="none" stroke="#9C8A3E" stroke-width="6" stroke-linecap="round"/>`;
  for (let i = 0; i < 6; i++) { const y = -150 - i * 16, x = sway * (0.6 + i * 0.07); o += `<ellipse cx="${f1(x - 10)}" cy="${y}" rx="8" ry="14" fill="#E2C46E" ${S} stroke-width="3" transform="rotate(-30 ${f1(x - 10)} ${y})"/><ellipse cx="${f1(x + 10)}" cy="${y - 6}" rx="8" ry="14" fill="#E2C46E" ${S} stroke-width="3" transform="rotate(30 ${f1(x + 10)} ${y - 6})"/>`; }
  return g(`scale(${s})`, o);
}
function boneIcon(s = 1) {
  return g(`scale(${s})`, `<path d="M-90 -10 H90 V10 H-90 Z" fill="${C.bone}" ${S} stroke-width="5"/><circle cx="-96" cy="-16" r="18" fill="${C.bone}" ${S} stroke-width="5"/><circle cx="-96" cy="16" r="18" fill="${C.bone}" ${S} stroke-width="5"/><circle cx="96" cy="-16" r="18" fill="${C.bone}" ${S} stroke-width="5"/><circle cx="96" cy="16" r="18" fill="${C.bone}" ${S} stroke-width="5"/><path d="M-80 -9 H80 V9 H-80 Z" fill="${C.bone}"/>`);
}
function icon(name, t = 0) {
  switch (name) {
    case 'meat': return meat(1.1, 7);
    case 'sun': return sun(0, 0, 70, t);
    case 'fire': return fire(0, 70, 0.75, t);
    case 'snow': return g(`rotate(${f1(t * 25)})`, snowflake(1));
    case 'fish': return fishShape(1.3);
    case 'grain': return g('translate(0 110)', grainStalk(0.9, Math.sin(t * 2) * 8));
    case 'bone': return boneIcon(0.9);
    case 'heart': return heart(1.4);
    case 'bacteria': return bug(1.5, 'bad', t);
    case 'clock': return clock(0, 0, 90, 10, 10 + Math.floor(t * 20) % 60);
    case 'hourglass': return hourglass(0.9, t);
    case 'strip': return g('translate(0 -110)', strip(220, '#6B2D20', Math.sin(t * 2) * 3, 50));
    case 'jar': return `<path d="M-60 -70 H60 V80 Q60 100 40 100 H-40 Q-60 100 -60 80 Z" fill="#DCEFF3" ${S} stroke-width="5"/><rect x="-70" y="-100" width="140" height="34" rx="8" fill="#C9A35A" ${S} stroke-width="5"/>` + xmark(0, 0, 90, 1, 0, 0.01);
    case 'bag': return `<path d="M-80 -40 Q-100 100 0 110 Q100 100 80 -40 Q40 -70 0 -60 Q-40 -70 -80 -40 Z" fill="#C79A63" ${S} stroke-width="5"/><path d="M-50 -50 Q0 -20 50 -50" fill="none" ${S} stroke-width="5"/><path d="M-20 10 h40 M-30 40 h60" stroke="#8E6A3C" stroke-width="5" stroke-linecap="round"/>`;
    case 'magnifier': return `<circle cx="-20" cy="-20" r="70" fill="#EAF4F7" ${S} stroke-width="8"/><path d="M30 30 L100 100" ${S} stroke-width="20"/>`;
    case 'gold': return `<path d="M-90 40 L-60 -20 H60 L90 40 Z" fill="#F2C443" ${S} stroke-width="5"/><path d="M-40 -20 L-20 -70 H40 L60 -20" fill="#F7D46A" ${S} stroke-width="5"/>`;
    case 'spear': return spear(0, 0, 135, 300, 0.5);
    default: return '';
  }
}

// ---------- text card ----------
SCN.card = (c, o) => {
  let s = paper();
  const lines = o.lines || [], n = lines.length;
  const size = o.size || (n === 1 ? 180 : n === 2 ? 150 : 124);
  const top = o.icon ? 560 : 470, y0 = top - ((n - 1) * size * 1.05) / 2 + size * 0.3;
  lines.forEach((ln, i) => {
    const t0 = o.at && o.at[i] !== undefined ? o.at[i] : 0.05 + i * 0.35;
    const col = (o.accent ?? n - 1) === i && n > 1 ? C.accent : C.text;
    s += hand(ln, 960, f1(y0 + i * size * 1.05), size, c.t, t0, { per: Math.min(0.045, 0.6 / ln.length) , col });
  });
  if (o.icon) s += pop(960, 230, c.t, o.iconAt ?? 0.15, g(`scale(${o.iconScale || 1})`, icon(o.icon, c.t)));
  return s;
};

// ---------- maps ----------
const GEO = topojson.feature(WORLD, WORLD.objects.countries);
const PLACES = {
  israel: [34.98, 32.11], jordan: [35.45, 31.98], ukraine: [31.43, 49.83], sweden: [14.6, 56.05], tanzania: [35.1, -3.6],
  kalahari: [20.5, -19.6], safrica: [25, -29.5], andes: [-71.97, -13.53], plains: [-101, 43], greenland: [-69, 77.5],
  romania: [26.27, 47.33], mongolia: [104, 46.5], arctic: [-95, 68], amazon: [-62, -4],
};
const REGIONS = {
  israel: { center: [35.2, 31.9], scale: 9500, hl: ['Israel'] },
  jordan: { center: [35.5, 31.9], scale: 11000, hl: [] },
  ukraine: { center: [31, 49], scale: 2700, hl: ['Ukraine'] },
  sweden: { center: [15.5, 60.5], scale: 1500, hl: ['Sweden'] },
  tanzania: { center: [35, -6], scale: 2400, hl: ['Tanzania'] },
  kalahari: { center: [21, -21], scale: 2000, hl: ['Namibia', 'Botswana'] },
  safrica: { center: [24, -29], scale: 1700, hl: ['South Africa'] },
  andes: { center: [-72, -12], scale: 1350, hl: ['Peru'] },
  plains: { center: [-100, 43], scale: 900, hl: [] },
  greenland: { ortho: [-42, 73], scale: 1500, hl: ['Greenland'] },
  romania: { center: [25.5, 46], scale: 2600, hl: ['Romania'] },
};
const MAPCACHE = {};
function projFor(key) {
  const R = REGIONS[key];
  if (R.ortho) return d3.geoOrthographic().rotate([-R.ortho[0], -R.ortho[1]]).scale(R.scale).translate([960, 560]).clipAngle(90);
  return d3.geoMercator().center(R.center).scale(R.scale).translate([960, 560]);
}
function landSvg(key, proj, hl, landCol = '#F1DFAE', hlCol = '#E9B56B') {
  if (MAPCACHE[key]) return MAPCACHE[key];
  const path = d3.geoPath(proj).digits(1);
  let s = '';
  for (const f of GEO.features) {
    const d = path(f); if (!d) continue;
    const on = hl.some(h => (f.properties.name || '').includes(h));
    s += `<path d="${d}" fill="${on ? hlCol : landCol}" stroke="${C.ink}" stroke-width="${on ? 4 : 2.5}" stroke-linejoin="round"/>`;
  }
  return (MAPCACHE[key] = s);
}
function seaSvg() {
  let s = `<rect width="${W}" height="${H}" fill="#BFDDE8"/>`;
  const r = rng(77);
  let w = '';
  for (let i = 0; i < 26; i++) { const x = r() * W, y = r() * H; w += `M${f1(x)} ${f1(y)} q16 -10 32 0 t32 0 `; }
  return s + `<path d="${w}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity=".6"/>`;
}
function mapPin(x, y, t, t0, label, side = 1) {
  let o = pop(x, y, t, t0, `<path d="M0 0 C-36 -40 -32 -82 0 -82 C32 -82 36 -40 0 0 Z" fill="${C.red}" ${S} stroke-width="5"/><circle cx="0" cy="-54" r="13" fill="#FFFFFF"/>`);
  if (label) o += `<g style="paint-order:stroke">${hand(label, x + side * 50, y - 40, 74, t, t0 + 0.25, { anchor: side > 0 ? 'start' : 'end', per: 0.03 })}</g>`;
  return o;
}
SCN.map = (c, o) => {
  const key = o.region, R = REGIONS[key], proj = projFor(key);
  let s = seaSvg() + landSvg(key, proj, R.hl);
  if (o.city) { const [cx, cy] = proj([34.78, 32.08]); s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="10" fill="${C.ink}"/>` + hand(o.city, f1(cx - 26), f1(cy + 18), 54, c.t, 0.4, { anchor: 'end' }); }
  const p = proj(PLACES[key]);
  s += mapPin(p[0], p[1], c.t, 0.15, '', 1);
  if (o.label) {
    const w = o.label.length * 60 + 80;
    s += pop(960, 150, c.t, 0.3, `<rect x="${-w / 2}" y="-70" width="${w}" height="120" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + `<text x="0" y="20" font-family="Hand" font-size="96" fill="${C.text}" text-anchor="middle">${esc(o.label)}</text>`);
  }
  return s;
};
SCN.worldMap = (c, o) => {
  if (!MAPCACHE.__worldProj) MAPCACHE.__worldProj = d3.geoNaturalEarth1().fitExtent([[60, 60], [1860, 1020]], { type: 'Sphere' });
  const proj = MAPCACHE.__worldProj;
  let s = `<rect width="${W}" height="${H}" fill="${C.paper}"/>`;
  s += `<path d="${d3.geoPath(proj).digits(1)({ type: 'Sphere' })}" fill="#BFDDE8" ${S} stroke-width="5"/>`;
  s += landSvg('__world', proj, []);
  (o.pins || []).forEach((k, i) => { const p = proj(PLACES[k]); s += mapPin(p[0], p[1], c.t, 0.2 + i * 0.3, ''); });
  return s;
};

// ---------- frame ----------
const SCENE = name => SCN[name] || SC[name] || (() => paper() + hand('[' + name + ']', 960, 540, 90, 1, 0));
function shotCtx(sh, t) {
  const v = sh.vs - sh.start;
  const at = word => { const w = sh.words.find(x => x.w.toLowerCase().replace(/[^a-z']/g, '') === word.toLowerCase()); return w ? v + w.s : v + 0.3; };
  return { t, d: sh.end - sh.start, v, at, frame: 0 };
}
function drawShot(sh, t, frame) {
  const c = shotCtx(sh, t); c.frame = frame;
  const o = resolveOpts(sh.opts || {}, c);
  const [fx, fy, z] = camFor(sh.cam, c, sh.idx || 0);
  const tr = `translate(${fx} ${fy}) scale(${z.toFixed(4)}) translate(${-fx} ${-fy})`;
  return `<g filter="url(#wob${Math.floor(frame / 4) % 3})"><g transform="${tr}">${SCENE(sh.scene)(c, o)}</g></g>`;
}
window.renderAt = T => {
  const frame = Math.round(T * (window.FPS_ || 25));
  const sh = TL.shots.find(s => T >= s.start && T < s.end) || TL.shots[TL.shots.length - 1];
  document.getElementById('scene').innerHTML = drawShot(sh, T - sh.start, frame);
  document.getElementById('cap').innerHTML = captionSvg(T);
  document.getElementById('fade').setAttribute('opacity', clamp((T - (TL.duration - 1.2)) / 1.2).toFixed(3));
  return sh.id;
};
window.extractCues = () => {
  const out = [], ambs = [];
  TL.shots.forEach((sh, i) => {
    sh.idx = i;
    CUE.on = true; CUE.shot = sh; CUE.list = []; CUE.amb = new Set();
    const d = sh.end - sh.start;
    for (const t of [0.01, d * 0.5, Math.max(0.02, d - 0.02)]) { try { drawShot(sh, t, 0); } catch (e) { CUE.list.push({ t: sh.start, kind: 'error', msg: String(e) }); } }
    CUE.on = false;
    const seen = new Set();
    for (const q of CUE.list) { const k = q.kind + '@' + Math.round(q.t * 20); if (!seen.has(k)) { seen.add(k); out.push(q); } }
    ambs.push({ id: sh.id, start: sh.start, end: sh.end, amb: [...CUE.amb] });
  });
  return { cues: out, ambience: ambs };
};
