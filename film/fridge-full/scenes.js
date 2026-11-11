// Drawing library + 22 shots for the "fridge" pilot.
// window.setTimeline(json) then window.renderAt(seconds) draws one frame.
'use strict';
const W = 1920, H = 1080, FPS = 30;
const C = {
  paper: '#FBF6EC', ink: '#2B2118', head: '#FFFFFF', hair: '#6B4423', hair2: '#4A2E17', hair3: '#8A5A2E',
  tunic: '#8E5B2E', tunicD: '#5E3A1A', sand: '#E9CB8E', sandD: '#D2AB69', sky1: '#BFDDEA', sky2: '#EEF4EE',
  hills: '#D6C49C', grass: '#A7B067', grassD: '#7F8A45', meat: '#B9473A', meatD: '#8E2F26', fat: '#F4D7C6',
  bone: '#F7F1E3', fire1: '#E5532D', fire2: '#F59A2C', fire3: '#FFD65A', smoke: '#CFC8BC',
  night1: '#18223A', night2: '#2F3D5E', groundN: '#3A3127', snow: '#F7FAFB', snowS: '#D6E4EC', ice: '#CBE5F2',
  text: '#4A2E17', accent: '#E07A1F', red: '#D2463C', green: '#4F9A4A', wood: '#8B6A43', woodD: '#5D4428',
  stone: '#A29D93', fridge: '#EEF2F3', shirt: '#6F93BC', pants: '#45536A', khaki: '#CDB78B', khakiD: '#8F7B52',
};

// ---------- maths ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const eio = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
const eout = t => 1 - Math.pow(1 - clamp(t), 3);
const back = t => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function noise(x, seed = 0) {
  const h = n => { const v = Math.sin((n + seed * 57.31) * 127.1) * 43758.5453; return v - Math.floor(v); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}
const f1 = n => (Math.round(n * 10) / 10).toString();
const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
function smooth(pts, closed = true) {
  const n = pts.length, g = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}
function blobPts(rx, ry, n, seed, jit = 0.12) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + (r() * 2 - 1) * jit; pts.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
  return pts;
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const S = `stroke="${C.ink}" stroke-linecap="round" stroke-linejoin="round"`;
const g = (tr, inner) => `<g transform="${tr}">${inner}</g>`;
function popS(t, t0, d = 0.38) { return t < t0 ? 0 : back((t - t0) / d); }
function pop(x, y, t, t0, inner, d) { const s = popS(t, t0, d); return s <= 0.002 ? '' : g(`translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})`, inner); }
function stick(x1, y1, x2, y2, w, col) {
  return `<path d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}" stroke="${C.ink}" stroke-width="${w + 8}" stroke-linecap="round"/>` +
         `<path d="M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
}
const dir = a => [Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)]; // 0 = down, 90 = right, 180 = up
function limb(x, y, a1, a2, l1, l2) {
  const d1 = dir(a1), d2 = dir(a2), k = [x + d1[0] * l1, y + d1[1] * l1], e = [k[0] + d2[0] * l2, k[1] + d2[1] * l2];
  return { k, e, d: `M${f1(x)} ${f1(y)} L${f1(k[0])} ${f1(k[1])} L${f1(e[0])} ${f1(e[1])}` };
}

// ---------- characters ----------
function hairCave(seed, col, long) {
  const r = rng(seed), R = 58, pts = [];
  const a0 = long ? 240 : 208, a1 = long ? -60 : -28, N = 17;
  for (let i = 0; i <= N; i++) {
    const a = (a0 - (a0 - a1) * i / N) * Math.PI / 180, spike = i % 2 === 0;
    const rr = R + (spike ? 12 + r() * 18 : 2 + r() * 6), aj = a + (r() - 0.5) * 0.09;
    pts.push([Math.cos(aj) * rr, -Math.sin(aj) * rr]);
  }
  const fy = -R * 0.38;
  pts.push([R * 0.86, long ? R * 1.0 : R * 0.22]);
  pts.push([R * 0.78, fy + 2]);
  const M = 6;
  for (let i = 0; i <= M; i++) { const x = R * 0.7 - R * 1.4 * i / M; pts.push([x, fy + (i % 2 ? 10 + r() * 4 : -4)]); }
  pts.push([-R * 0.78, fy + 2]);
  pts.push([-R * 0.86, long ? R * 1.0 : R * 0.22]);
  let strands = '';
  for (let i = 0; i < 4; i++) { const x = -30 + i * 20 + r() * 6; strands += `M${f1(x)} ${f1(-R - 2)} q${f1(4 + r() * 4)} 10 ${f1(2 + r() * 3)} 20 `; }
  return `<path d="${P(pts)}Z" fill="${col}" ${S} stroke-width="4.5"/><path d="${strands}" fill="none" stroke="${C.hair2}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
}
function faceSvg(type, t, seed, look = 0) {
  const blink = ((t + seed * 1.37) % 3.4) < 0.11;
  const ex = 18, ey = 5, dx = look;
  let eyes, brows = '', mouth = '';
  if (type === 'smug' || type === 'tired') {
    eyes = `<path d="M${-ex - 9 + dx} ${ey} q9 ${type === 'smug' ? -5 : 4} 18 0 M${ex - 9 + dx} ${ey} q9 ${type === 'smug' ? -5 : 4} 18 0" fill="none" ${S} stroke-width="4.5"/>`;
  } else if (type === 'laugh') {
    eyes = `<path d="M${-ex - 9 + dx} ${ey + 3} q9 -12 18 0 M${ex - 9 + dx} ${ey + 3} q9 -12 18 0" fill="none" ${S} stroke-width="4.5"/>`;
  } else if (type === 'scared' || type === 'sick') {
    const ry = type === 'sick' ? 10 : 15;
    eyes = `<ellipse cx="${-ex + dx}" cy="${ey}" rx="12.5" ry="${ry}" fill="#FFFFFF" ${S} stroke-width="3.5"/><ellipse cx="${ex + dx}" cy="${ey}" rx="12.5" ry="${ry}" fill="#FFFFFF" ${S} stroke-width="3.5"/><circle cx="${-ex + dx + 1}" cy="${ey + 2}" r="6" fill="${C.ink}"/><circle cx="${ex + dx + 1}" cy="${ey + 2}" r="6" fill="${C.ink}"/>`;
    if (type === 'sick') eyes += `<path d="M${-ex - 13 + dx} ${ey - 2} H${-ex + 13 + dx} M${ex - 13 + dx} ${ey - 2} H${ex + 13 + dx}" ${S} stroke-width="4"/>`;
  } else if (type === 'sleep') {
    eyes = `<path d="M${-ex - 9 + dx} ${ey} q9 8 18 0 M${ex - 9 + dx} ${ey} q9 8 18 0" fill="none" ${S} stroke-width="4.5"/>`;
  } else if (blink) {
    eyes = `<path d="M${-ex - 7 + dx} ${ey} h14 M${ex - 7 + dx} ${ey} h14" ${S} stroke-width="4.5"/>`;
  } else {
    const rr = type === 'surprised' ? 7.5 : 6.5, ly = type === 'think' ? -3 : 0;
    eyes = `<circle cx="${ex * -1 + dx}" cy="${ey + ly}" r="${rr}" fill="${C.ink}"/><circle cx="${ex + dx}" cy="${ey + ly}" r="${rr}" fill="${C.ink}"/>`;
  }
  const B = {
    worried: 'M-29 -9 L-10 -17 M10 -17 L29 -9', sad: 'M-29 -9 L-10 -17 M10 -17 L29 -9',
    surprised: 'M-29 -16 Q-19 -24 -9 -18 M9 -18 Q19 -24 29 -16', think: 'M-29 -12 L-10 -12 M9 -19 Q19 -25 29 -18',
    tired: 'M-28 -8 L-10 -10 M10 -10 L28 -8', scared: 'M-30 -14 L-10 -24 M10 -24 L30 -14', sick: 'M-30 -12 L-10 -20 M10 -20 L30 -12',
  };
  if (B[type]) brows = `<path d="${B[type]}" fill="none" ${S} stroke-width="4"/>`;
  const Mo = {
    neutral: 'M-9 28 L9 27', happy: 'M-16 21 Q0 37 16 21', smug: 'M-14 24 Q3 33 17 20', worried: 'M-12 31 Q0 23 12 31',
    sad: 'M-13 32 Q0 22 13 32', think: 'M-6 29 L11 25', tired: 'M-10 29 L10 29',
    scared: 'M-14 33 q7 -7 14 0 q7 7 14 0', sick: 'M-14 33 q7 -6 14 0 q7 6 14 0', sleep: 'M-8 27 Q0 33 8 27',
  };
  if (type === 'surprised') mouth = `<ellipse cx="0" cy="28" rx="7" ry="9" fill="${C.ink}"/>`;
  else if (type === 'laugh') mouth = `<path d="M-17 20 Q0 46 17 20 Z" fill="${C.ink}" ${S} stroke-width="3"/><path d="M-8 33 Q0 39 8 33" fill="#C85A4A"/>`;
  else mouth = `<path d="${Mo[type] || Mo.neutral}" fill="none" ${S} stroke-width="4.5"/>`;
  return eyes + brows + mouth;
}
function tunicSvg(top, bot, col, seed) {
  const r = rng(seed);
  const pts = [[-37, top + 6], [-17, top], [43, top + 32], [48, (top + bot) / 2], [55, bot]];
  const n = 8;
  for (let i = 1; i < n; i++) pts.push([55 - 110 * i / n, bot + (i % 2 ? 13 + r() * 6 : 0)]);
  pts.push([-55, bot], [-50, (top + bot) / 2]);
  let fur = '';
  for (let i = 0; i < 7; i++) { const fx = -36 + r() * 76, fy = top + 34 + r() * (bot - top - 44); fur += `M${f1(fx)} ${f1(fy)} q6 -8 12 0 `; }
  return `<path d="${P(pts)}Z" fill="${col}" ${S} stroke-width="4.5"/><path d="${fur}" fill="none" stroke="${C.tunicD}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
}
function person(o) {
  o = Object.assign({ x: 0, y: 0, s: 1, flip: false, kind: 'cave', face: 'neutral', t: 0, seed: 1, la: [-12, -6], ra: [12, 6],
    ll: [-4, -2], rl: [4, 2], hip: 168, look: 0, hairC: C.hair, tunicC: C.tunic, beard: false, long: false, bob: 1,
    cloak: false, armsFront: false, holdL: null, holdR: null, front: null, shirt: C.shirt, shake: 0 }, o);
  const bob = Math.sin(o.t * 2.1 + o.seed * 1.7) * 2.2 * o.bob + (o.shake ? Math.abs(Math.sin(o.t * 15)) * -5 * o.shake : 0);
  const hy = -o.hip, sh = hy - 118 + bob, hc = sh - 68;
  const clothed = o.kind === 'modern' || o.kind === 'research';
  const Ll = limb(-13, hy, o.ll[0], o.ll[1], 86, 86), Rl = limb(13, hy, o.rl[0], o.rl[1], 86, 86);
  let legs = '';
  for (const L of [Ll, Rl]) {
    if (clothed) {
      const pc = o.kind === 'modern' ? C.pants : C.khakiD;
      legs += `<path d="${L.d}" fill="none" stroke="${C.ink}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="${L.d}" fill="none" stroke="${pc}" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/>`;
      legs += `<ellipse cx="${f1(L.e[0] + 8)}" cy="${f1(L.e[1] + 2)}" rx="20" ry="9" fill="${C.ink}"/>`;
    } else {
      legs += `<path d="${L.d}" fill="none" ${S} stroke-width="6.5"/><path d="M${f1(L.e[0])} ${f1(L.e[1])} l17 0" ${S} stroke-width="7"/>`;
    }
  }
  let body = '';
  if (o.kind === 'cave') {
    body = tunicSvg(sh - 4, hy + 18, o.tunicC, o.seed);
    if (o.cloak) {
      const cl = [[-60, sh - 6], [60, sh - 6], [72, hy + 30], [40, hy + 44], [0, hy + 34], [-40, hy + 46], [-72, hy + 30]];
      body += `<path d="${smooth(cl)}" fill="#7C6656" ${S} stroke-width="4.5"/>`;
      body += `<path d="${smooth([[-66, sh + 4], [-30, sh - 18], [0, sh - 10], [30, sh - 18], [66, sh + 4], [40, sh + 22], [0, sh + 16], [-40, sh + 22]])}" fill="#E8DCCB" ${S} stroke-width="4"/>`;
    }
  } else {
    const col = o.kind === 'modern' ? o.shirt : C.khaki;
    body = `<path d="M-40 ${sh + 2} Q0 ${sh - 8} 40 ${sh + 2} L44 ${hy + 16} L-44 ${hy + 16} Z" fill="${col}" ${S} stroke-width="4.5"/>`;
    if (o.kind === 'research') body += `<path d="M-28 ${sh + 30} h22 v22 h-22 Z M8 ${sh + 30} h22 v22 h-22 Z" fill="none" stroke="${C.khakiD}" stroke-width="3"/>`;
  }
  const La = limb(-31, sh + 10, o.la[0], o.la[1], 72, 70), Ra = limb(31, sh + 10, o.ra[0], o.ra[1], 72, 70);
  let arms = '';
  for (const A of [La, Ra]) {
    arms += `<path d="${A.d}" fill="none" ${S} stroke-width="6.5"/>`;
    if (clothed) {
      const sx = A.d.split(' ')[0].slice(1), sy = A.d.split(' ')[1];
      const k = 0.5, mx = +sx + (A.k[0] - +sx) * k, my = +sy + (A.k[1] - +sy) * k;
      const col = o.kind === 'modern' ? o.shirt : C.khaki;
      arms += `<path d="M${sx} ${sy} L${f1(mx)} ${f1(my)}" stroke="${C.ink}" stroke-width="28" stroke-linecap="round"/><path d="M${sx} ${sy} L${f1(mx)} ${f1(my)}" stroke="${col}" stroke-width="19" stroke-linecap="round"/>`;
    }
  }
  let head = `<circle cx="0" cy="${f1(hc)}" r="58" fill="${C.head}" ${S} stroke-width="5.5"/>`;
  let hb = '';
  if (o.kind === 'cave') {
    if (o.beard) hb += `<path d="M-48 2 Q-50 64 0 76 Q50 64 48 2 Q34 38 0 44 Q-34 38 -48 2 Z" fill="${o.hairC}" ${S} stroke-width="4.5"/>`;
    hb += hairCave(o.seed * 7 + 3, o.hairC, o.long);
  } else if (o.hairLong) hb += hairCave(o.seed * 7 + 3, o.hairC || '#2B2118', true);
  if (o.shortHair) hb += `<path d="M-56 -8 Q-62 -66 -10 -66 Q50 -70 58 -10 Q44 -40 0 -44 Q-40 -42 -56 -8 Z" fill="${o.hairC || '#2B2118'}" ${S} stroke-width="4"/>`;
  hb += faceSvg(o.face, o.t, o.seed, o.look);
  if (o.kind === 'research') {
    hb += `<path d="M-47 -36 Q-46 -98 0 -99 Q46 -98 47 -36 Z" fill="${C.khaki}" ${S} stroke-width="4.5"/><path d="M-46 -48 Q0 -40 46 -48" stroke="${C.khakiD}" stroke-width="9" fill="none"/><ellipse cx="0" cy="-36" rx="90" ry="16" fill="${C.khaki}" ${S} stroke-width="4.5"/>`;
  }
  head += g(`translate(0 ${f1(hc)})`, hb);
  const held = (o.holdL ? o.holdL(La.e) : '') + (o.holdR ? o.holdR(Ra.e) : '');
  const inner = legs + body + held + (o.armsFront ? head + arms : arms + head) + (o.front ? o.front(La.e, Ra.e) : '');
  return g(`translate(${f1(o.x)} ${f1(o.y)}) scale(${o.flip ? -o.s : o.s} ${o.s})`, inner);
}

// ---------- props ----------
function spear(hx, hy, ang, len = 330, grip = 0.42) {
  const d = dir(ang), p0 = [hx - d[0] * len * grip, hy - d[1] * len * grip], p1 = [hx + d[0] * len * (1 - grip), hy + d[1] * len * (1 - grip)];
  const n = [-d[1], d[0]], tip = [p1[0] + d[0] * 46, p1[1] + d[1] * 46];
  return stick(p0[0], p0[1], p1[0], p1[1], 7, C.wood) +
    `<path d="M${f1(p1[0] + n[0] * 14)} ${f1(p1[1] + n[1] * 14)} L${f1(tip[0])} ${f1(tip[1])} L${f1(p1[0] - n[0] * 14)} ${f1(p1[1] - n[1] * 14)} Z" fill="#8E8A84" ${S} stroke-width="4"/>`;
}
function meat(s = 1, seed = 1, col = C.meat, rot = 0, bone = true) {
  const r = rng(seed);
  let o = '';
  if (bone) o += `<path d="M48 -6 L104 -14" stroke="${C.ink}" stroke-width="26" stroke-linecap="round"/><path d="M48 -6 L104 -14" stroke="${C.bone}" stroke-width="17" stroke-linecap="round"/>` +
    `<circle cx="108" cy="-24" r="13" fill="${C.bone}" ${S} stroke-width="4"/><circle cx="114" cy="-6" r="13" fill="${C.bone}" ${S} stroke-width="4"/>`;
  o += `<path d="${smooth(blobPts(70, 48, 9, seed, 0.1))}" fill="${col}" ${S} stroke-width="4.5"/>`;
  o += `<path d="M${-40 + r() * 10} ${-10 + r() * 8} q22 -16 46 -4 M${-30 + r() * 10} ${14 + r() * 6} q20 -10 40 0" fill="none" stroke="${C.fat}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`;
  return g(`rotate(${rot}) scale(${s})`, o);
}
function meatPile(x, y, s, seed = 4, col = C.meat) {
  const spots = [[-120, -40, -8], [0, -44, 6], [120, -40, -4], [-62, -112, 10], [62, -110, -12], [0, -178, 4]];
  return g(`translate(${x} ${y}) scale(${s})`, spots.map((p, i) => g(`translate(${p[0]} ${p[1]})`, meat(1, seed + i, col, p[2], i % 2 === 0))).join(''));
}
function strip(len, col, sway = 0, w = 26) {
  return g(`rotate(${f1(sway)})`, `<path d="M${-w / 2} 0 Q${-w / 2 - 4} ${len * 0.5} ${-w / 2 + 3} ${len} Q0 ${len + 10} ${w / 2 - 2} ${len} Q${w / 2 + 4} ${len * 0.5} ${w / 2} 0 Z" fill="${col}" ${S} stroke-width="4"/><path d="M-3 ${len * 0.18} L-1 ${len * 0.8}" stroke="${C.fat}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`);
}
function rack(x, y, w, h, t, o = {}) {
  const n = o.n || 7, col = o.col || C.meat, wind = o.wind || 1;
  let s = stick(x - w / 2, y, x - w / 2 + 8, y - h, 9, C.wood) + stick(x + w / 2, y, x + w / 2 - 8, y - h, 9, C.wood);
  s += stick(x - w / 2 + 8, y - h, x - w / 2 - 22, y - h - 44, 7, C.wood) + stick(x - w / 2 + 8, y - h, x - w / 2 + 34, y - h - 42, 7, C.wood);
  s += stick(x + w / 2 - 8, y - h, x + w / 2 - 36, y - h - 42, 7, C.wood) + stick(x + w / 2 - 8, y - h, x + w / 2 + 20, y - h - 44, 7, C.wood);
  s += stick(x - w / 2 - 30, y - h - 10, x + w / 2 + 30, y - h - 10, 8, C.wood);
  for (let i = 0; i < n; i++) {
    const sx = x - w / 2 + 40 + (w - 80) * i / (n - 1);
    const sw = (Math.sin(t * 2.6 + i * 0.8) * 5 + noise(t * 1.3, i) * 6) * wind;
    s += g(`translate(${f1(sx)} ${y - h - 4})`, strip(150 + ((i * 37) % 60), Array.isArray(col) ? col[i % col.length] : col, sw));
  }
  return s;
}
function fire(x, y, s, t, o = {}) {
  let out = '';
  const fl = 1 + 0.08 * noise(t * 9, 2);
  out += `<circle cx="0" cy="-70" r="${f1(260 * fl)}" fill="url(#fglow)" opacity="${o.glow ?? 0.8}"/>`;
  const stones = [[-96, -6], [-66, -26], [-24, -34], [24, -34], [66, -26], [96, -6]];
  stones.forEach((p, i) => { out += `<ellipse cx="${p[0]}" cy="${p[1]}" rx="27" ry="17" fill="${C.stone}" ${S} stroke-width="4" transform="rotate(${(i * 23) % 20 - 10} ${p[0]} ${p[1]})"/>`; });
  out += stick(-72, -6, 64, -40, 18, C.wood) + stick(72, -6, -64, -40, 18, C.wood);
  const layers = [[C.fire1, 175, 72, true], [C.fire2, 128, 50, false], [C.fire3, 80, 28, false]];
  layers.forEach(([col, h0, w0, st], k) => {
    const h = h0 * (1 + 0.14 * noise(t * 7, k + 1)), sway = noise(t * 5.5, k + 5) * 22;
    const d = `M${-w0} -24 C${-w0} ${f1(-24 - h * 0.45)} ${f1(-w0 * 0.25 + sway)} ${f1(-24 - h * 0.7)} ${f1(sway)} ${f1(-24 - h)} C${f1(w0 * 0.25 + sway)} ${f1(-24 - h * 0.7)} ${w0} ${f1(-24 - h * 0.45)} ${w0} -24 Z`;
    out += `<path d="${d}" fill="${col}" ${st ? S + ' stroke-width="4.5"' : ''}/>`;
    if (k === 0) for (const side of [-1, 1]) {
      const h2 = 80 * (1 + 0.25 * noise(t * 8, side + 9)), sx = side * 52, sw2 = noise(t * 6, side + 13) * 14;
      out += `<path d="M${sx - 22} -24 Q${sx - 22} ${f1(-24 - h2 * 0.5)} ${f1(sx + sw2)} ${f1(-24 - h2)} Q${sx + 22} ${f1(-24 - h2 * 0.5)} ${sx + 22} -24 Z" fill="${C.fire1}" ${S} stroke-width="4"/>`;
    }
  });
  for (let i = 0; i < 5; i++) {
    const p = ((t * 0.7 + i / 5) % 1), sx = noise(i * 3.1 + t * 0.5, 7) * 60;
    out += `<circle cx="${f1(sx)}" cy="${f1(-120 - p * 220)}" r="${f1(4 * (1 - p) + 1)}" fill="${C.fire3}" opacity="${f1(1 - p)}"/>`;
  }
  return g(`translate(${x} ${y}) scale(${s})`, out);
}
function smoke(x, y, t, o = {}) {
  const n = o.n || 11, rise = o.rise || 520, drift = o.drift ?? 80, op = o.op ?? 0.7;
  let out = '';
  for (let i = 0; i < n; i++) {
    const p = ((t * (o.speed || 0.28) + i / n) % 1);
    const sx = x + Math.sin(p * 5 + i * 1.7) * 28 + p * drift, sy = y - p * rise, r = 22 + p * (o.grow || 70);
    out += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(r)}" fill="${C.smoke}" stroke="${C.ink}" stroke-opacity=".12" stroke-width="2.5" opacity="${f1(op * Math.sin(Math.PI * Math.min(1, p * 1.15)))}"/>`;
  }
  return out;
}
function fly(x, y, t, i) {
  const wing = Math.sin(t * 60 + i) > 0 ? 1 : 0.6;
  return g(`translate(${f1(x)} ${f1(y)})`, `<ellipse cx="-5" cy="-8" rx="${f1(8 * wing)}" ry="5" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2" opacity=".9"/><ellipse cx="5" cy="-8" rx="${f1(8 * wing)}" ry="5" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2" opacity=".9"/><circle r="6" fill="${C.ink}"/>`);
}
function fliesAround(cx, cy, t, n, rx = 160, ry = 90) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = t * (1.6 + i * 0.13) + i * 2.1;
    o += fly(cx + Math.cos(a) * rx * (0.6 + 0.4 * Math.sin(i)), cy + Math.sin(a * 1.7) * ry, t, i);
  }
  return o;
}
function sun(x, y, r, t, col = '#F6B33C') {
  let rays = '';
  for (let i = 0; i < 12; i++) { const a = i * 30 + t * 8; const d = dir(a); rays += `M${f1(d[0] * (r + 18))} ${f1(d[1] * (r + 18))} L${f1(d[0] * (r + 44))} ${f1(d[1] * (r + 44))} `; }
  return g(`translate(${x} ${y})`, `<path d="${rays}" ${S} stroke-width="5" stroke="${C.accent}"/><circle r="${r}" fill="${col}" ${S} stroke-width="5"/>`);
}
function heatWaves(x, y, t, n = 3, sp = 90) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const p = (t * 0.5 + i / n) % 1, px = x + (i - (n - 1) / 2) * sp, py = y - p * 160;
    o += `<path d="M${px} ${py} q12 -16 0 -32 q-12 -16 0 -32 q12 -16 0 -32" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p) * 0.8)}"/>`;
  }
  return o;
}
function windLines(t, y0, n = 5, w = W) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const p = ((t * 0.45 + i / n) % 1), x = w + 200 - p * (w + 600), y = y0 + ((i * 97) % 260);
    o += `<path d="M${f1(x)} ${y} q60 -20 120 0 t120 0 q40 10 30 -26 q-10 -20 -30 -6" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p) * 0.9)}"/><path d="M${f1(x)} ${y} q60 -20 120 0 t120 0 q40 10 30 -26 q-10 -20 -30 -6" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p) * 0.25)}"/>`;
  }
  return o;
}
function fridge(x, y, w, h, o = {}) {
  const L = x - w / 2, T = y - h, fz = T + h * 0.32, col = o.col || C.fridge;
  let s = `<ellipse cx="${x}" cy="${y + 6}" rx="${w * 0.62}" ry="18" fill="${C.ink}" opacity=".12"/>`;
  if (o.open) {
    s += `<path d="M${L + w} ${y} L${L + w + w * 0.9} ${y + 90} L${L + w + w * 0.9} ${y + 150} L${L + w} ${y + 20} Z" fill="#FFF3C4" opacity=".55"/>`;
  }
  s += `<rect x="${L}" y="${T}" width="${w}" height="${h}" rx="${w * 0.07}" fill="${col}" ${S} stroke-width="6"/>`;
  s += `<rect x="${L + w - w * 0.16}" y="${T + 10}" width="${w * 0.12}" height="${h - 20}" rx="${w * 0.05}" fill="#000" opacity=".06"/>`;
  s += `<path d="M${L} ${f1(fz)} H${L + w}" ${S} stroke-width="5"/>`;
  s += `<rect x="${L + w * 0.08}" y="${f1(fz - h * 0.14)}" width="${w * 0.05}" height="${f1(h * 0.1)}" rx="6" fill="#C5CDD1" ${S} stroke-width="3.5"/>`;
  if (o.open) {
    const iy = fz + 10, ih = y - iy - 14;
    s += `<rect x="${L + 14}" y="${f1(iy)}" width="${w - 28}" height="${f1(ih)}" rx="10" fill="#FFF8DE" ${S} stroke-width="4.5"/>`;
    s += `<rect x="${L + 14}" y="${f1(iy)}" width="${w - 28}" height="${f1(ih)}" rx="10" fill="url(#lglow)" opacity=".8"/>`;
    for (const k of [0.36, 0.68]) s += `<path d="M${L + 18} ${f1(iy + ih * k)} H${L + w - 18}" stroke="#B8C3C8" stroke-width="7"/>`;
    s += `<path d="M${L} ${f1(fz + 4)} L${L - w * 0.42} ${f1(fz + 40)} L${L - w * 0.42} ${f1(y - 34)} L${L} ${y} Z" fill="${col}" ${S} stroke-width="5.5"/>`;
    s += `<path d="M${L - w * 0.06} ${f1(fz + 120)} L${L - w * 0.36} ${f1(fz + 140)} M${L - w * 0.06} ${f1(fz + 260)} L${L - w * 0.36} ${f1(fz + 274)}" stroke="#B8C3C8" stroke-width="8" stroke-linecap="round"/>`;
    o.shelves = [iy + ih * 0.36, iy + ih * 0.68, iy + ih];
  } else {
    s += `<rect x="${L + w * 0.08}" y="${f1(fz + h * 0.05)}" width="${w * 0.05}" height="${f1(h * 0.2)}" rx="6" fill="#C5CDD1" ${S} stroke-width="3.5"/>`;
  }
  if (o.led) s += `<circle cx="${L + w * 0.75}" cy="${f1(T + h * 0.12)}" r="7" fill="#7FD3FF"/><circle cx="${L + w * 0.75}" cy="${f1(T + h * 0.12)}" r="22" fill="#7FD3FF" opacity="${f1(0.25 + 0.15 * Math.sin(o.t * 3))}"/>`;
  if (o.hum) {
    for (let i = 0; i < 3; i++) {
      const a = 0.35 + 0.5 * Math.max(0, Math.sin(o.t * 7 - i * 0.9));
      s += `<path d="M${L + w + 24 + i * 22} ${f1(T + h * 0.45 - 30 - i * 12)} q${16 + i * 4} ${30 + i * 12} 0 ${60 + i * 24}" fill="none" stroke="${o.humCol || '#E7E1D0'}" stroke-width="5" stroke-linecap="round" opacity="${f1(a)}"/>`;
    }
  }
  return s;
}
function milk() {
  return `<path d="M-34 0 V-110 L-20 -138 H20 L34 -110 V0 Z" fill="#FFFFFF" ${S} stroke-width="4.5"/><path d="M-34 -110 H34" ${S} stroke-width="3.5"/><rect x="-34" y="-80" width="68" height="34" fill="#7FA8D8" ${S} stroke-width="3.5"/><rect x="2" y="-150" width="14" height="14" rx="3" fill="#7FA8D8" ${S} stroke-width="3"/>`;
}
function eggs() {
  return `<ellipse cx="-40" cy="-46" rx="22" ry="28" fill="#FFF6E6" ${S} stroke-width="4"/><ellipse cx="0" cy="-48" rx="22" ry="28" fill="#F6E2C4" ${S} stroke-width="4"/><ellipse cx="40" cy="-46" rx="22" ry="28" fill="#FFF6E6" ${S} stroke-width="4"/><path d="M-78 -30 H78 L70 0 H-70 Z" fill="#CFC4AE" ${S} stroke-width="4.5"/>`;
}
function leftovers() {
  return `<rect x="-70" y="-62" width="140" height="62" rx="12" fill="#EAF1F3" ${S} stroke-width="4.5"/><path d="M${smooth([[-52, -14], [-30, -44], [0, -38], [30, -48], [52, -16], [0, -10]]).slice(1)}" fill="#E39A4C" stroke="none"/><rect x="-76" y="-76" width="152" height="18" rx="7" fill="#8CC4D6" ${S} stroke-width="4"/><circle cx="-30" cy="-30" r="7" fill="#7DAA5A"/><circle cx="18" cy="-26" r="6" fill="#7DAA5A"/>`;
}
function iceCube(s = 1) {
  return g(`scale(${s})`, `<path d="M-90 -50 L-30 -100 L90 -80 L90 50 L30 100 L-90 80 Z" fill="${C.ice}" ${S} stroke-width="6"/><path d="M-90 -50 L30 -30 L90 -80 M30 -30 L30 100" fill="none" ${S} stroke-width="5"/><path d="M-60 -20 L-10 -12 M-70 10 L-60 50" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" opacity=".9"/>`);
}
function xmark(cx, cy, r, t, t0, dur = 0.34, col = C.red) {
  if (t < t0) return '';
  const L = Math.hypot(2 * r, 2 * r), p1 = clamp((t - t0) / (dur / 2)), p2 = clamp((t - t0 - dur / 2) / (dur / 2));
  let o = `<path d="M${cx - r} ${cy - r} L${cx + r} ${cy + r}" fill="none" stroke="${col}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${f1(L)}" stroke-dashoffset="${f1(L * (1 - p1))}"/>`;
  if (p2 > 0) o += `<path d="M${cx + r} ${cy - r} L${cx - r} ${cy + r}" fill="none" stroke="${col}" stroke-width="20" stroke-linecap="round" stroke-dasharray="${f1(L)}" stroke-dashoffset="${f1(L * (1 - p2))}"/>`;
  return o;
}
function check(cx, cy, s, t, t0, dur = 0.35) {
  if (t < t0) return '';
  const L = 260, p = clamp((t - t0) / dur);
  return g(`translate(${cx} ${cy}) scale(${s})`, `<path d="M-70 0 L-20 50 L80 -60" fill="none" stroke="${C.green}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L}" stroke-dashoffset="${f1(L * (1 - p))}"/>`);
}
function arrow(x1, y1, x2, y2, t, t0, dur = 0.45, col = C.ink, bend = 0) {
  if (t < t0) return '';
  const p = eout((t - t0) / dur), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - bend;
  const L = Math.hypot(x2 - x1, y2 - y1) * 1.15 + Math.abs(bend);
  let o = `<path d="M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f1(L)}" stroke-dashoffset="${f1(L * (1 - p))}"/>`;
  if (p > 0.92) { const a = Math.atan2(y2 - my, x2 - mx) * 180 / Math.PI; o += g(`translate(${x2} ${y2}) rotate(${f1(a)})`, `<path d="M-30 -18 L0 0 L-30 18" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`); }
  return o;
}
function calendar(s = 1, label = '', day = null) {
  let o = `<rect x="-90" y="-80" width="180" height="170" rx="14" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-90 -36 H90 V-66 Q90 -80 76 -80 H-76 Q-90 -80 -90 -66 Z" fill="${C.red}" ${S} stroke-width="5"/>`;
  o += `<path d="M-46 -96 V-62 M46 -96 V-62" ${S} stroke-width="8"/>`;
  if (day !== null) o += `<text x="0" y="66" font-family="Hand" font-size="96" fill="${C.text}" text-anchor="middle">${day}</text>`;
  else for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) o += `<rect x="${-70 + c * 38}" y="${-22 + r * 34}" width="24" height="20" rx="4" fill="#E9DFCC"/>`;
  if (label) o += `<text x="0" y="170" font-family="Hand" font-size="74" fill="${C.text}" text-anchor="middle">${label}</text>`;
  return g(`scale(${s})`, o);
}
function hourglass(s = 1, t = 0) {
  const p = clamp(t / 2.4);
  const top = 1 - p * 0.7, bot = 0.25 + p * 0.6;
  let o = `<path d="M-62 -110 Q-62 -30 -8 0 Q-62 30 -62 110 H62 Q62 30 8 0 Q62 -30 62 -110 Z" fill="#EAF4F7" ${S} stroke-width="5"/>`;
  o += `<path d="M${f1(-50 * top)} ${f1(-100 + 90 * (1 - top))} Q0 ${f1(-90 + 90 * (1 - top))} ${f1(50 * top)} ${f1(-100 + 90 * (1 - top))} L6 -6 L-6 -6 Z" fill="#E2B866" opacity=".95"/>`;
  o += `<path d="M-56 104 Q0 ${f1(104 - 80 * bot)} 56 104 Z" fill="#E2B866"/><path d="M0 -4 V100" stroke="#E2B866" stroke-width="4" stroke-dasharray="6 6" stroke-dashoffset="${f1(-t * 60)}"/>`;
  o += `<rect x="-86" y="-132" width="172" height="26" rx="10" fill="${C.wood}" ${S} stroke-width="5"/><rect x="-86" y="106" width="172" height="26" rx="10" fill="${C.wood}" ${S} stroke-width="5"/>`;
  return g(`scale(${s})`, o);
}
function snowflake(s = 1, col = '#7FB4D3') {
  let o = '';
  for (let i = 0; i < 6; i++) o += g(`rotate(${i * 60})`, `<path d="M0 0 V-90 M0 -56 L-22 -76 M0 -56 L22 -76 M0 -28 L-16 -42 M0 -28 L16 -42" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round"/>`);
  return g(`scale(${s})`, o);
}
function heart(s = 1, col = C.red) {
  return g(`scale(${s})`, `<path d="M0 40 C-80 -10 -60 -80 0 -46 C60 -80 80 -10 0 40 Z" fill="${col}" ${S} stroke-width="5"/>`);
}
function thought(cx, cy, rx, ry, fromX, fromY, seed = 2) {
  const pts = [];
  const n = 14;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const k = i % 2 ? 1.0 : 1.09; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  let o = `<path d="${smooth(pts)}" fill="#FFFFFF" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 3; i++) { const k = (i + 1) / 4; o += `<circle cx="${f1(lerp(fromX, cx - rx * 0.5, k))}" cy="${f1(lerp(fromY, cy + ry * 0.8, k))}" r="${10 + i * 7}" fill="#FFFFFF" ${S} stroke-width="4.5"/>`; }
  return o;
}
function questionMark(size, rot = 0, col = C.ink) {
  return `<text x="0" y="0" font-family="Hand" font-size="${size}" fill="${col}" text-anchor="middle" transform="rotate(${f1(rot)})">?</text>`;
}

// ---------- scenery ----------
function acacia(x, y, s = 1) {
  return g(`translate(${x} ${y}) scale(${s})`, stick(0, 0, -6, -110, 10, C.woodD) + stick(-6, -100, -60, -160, 7, C.woodD) + stick(-6, -100, 50, -165, 7, C.woodD) +
    `<path d="${smooth([[-170, -165], [-120, -205], [-30, -222], [70, -218], [160, -200], [190, -170], [110, -152], [0, -158], [-110, -150]])}" fill="#9AA65A" ${S} stroke-width="4.5"/><path d="M-140 -165 Q0 -150 170 -172" fill="none" stroke="${C.grassD}" stroke-width="8" opacity=".55"/>`);
}
function tuft(x, y, s = 1, col = C.grassD) {
  return `<path d="M${x} ${y} l${-10 * s} ${-26 * s} M${x} ${y} l${2 * s} ${-32 * s} M${x} ${y} l${12 * s} ${-24 * s}" stroke="${col}" stroke-width="${4 * s}" stroke-linecap="round"/>`;
}
function hut(x, y, s = 1, col = '#A47E55') {
  let o = `<path d="M-118 0 L-6 -196 L118 0 Z" fill="${col}" ${S} stroke-width="5"/>`;
  for (let i = -3; i <= 3; i++) o += `<path d="M${i * 30} 0 L${-6 + i * 4} -186" stroke="#6E5235" stroke-width="3.5" opacity=".75"/>`;
  o += `<path d="M-6 -190 L-46 -246 M-4 -190 L36 -242 M-6 -190 L-4 -252" ${S} stroke-width="7"/>`;
  o += `<path d="M-34 0 L-4 -86 L28 0 Z" fill="#3B2A1C" ${S} stroke-width="4"/>`;
  return g(`translate(${x} ${y}) scale(${s})`, o);
}
function domeHut(x, y, s = 1) {
  let o = `<path d="M-130 0 Q-130 -150 0 -150 Q130 -150 130 0 Z" fill="#CDB57C" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + 0.8 * i / 8); o += `<path d="M${f1(-Math.cos(a) * 120)} ${f1(-Math.sin(a) * 135)} l${f1(-Math.cos(a) * 16)} 24" stroke="#9C8550" stroke-width="4" stroke-linecap="round"/>`; }
  o += `<path d="M-30 0 Q-30 -60 0 -60 Q30 -60 30 0 Z" fill="#3B2A1C" ${S} stroke-width="4"/>`;
  return g(`translate(${x} ${y}) scale(${s})`, o);
}
function rock(x, y, rx, ry, seed = 3) {
  return g(`translate(${x} ${y})`, `<path d="${smooth(blobPts(rx, ry, 10, seed, 0.12))}" fill="#B9B2A5" ${S} stroke-width="5"/><path d="M${-rx * 0.5} ${-ry * 0.2} q${rx * 0.3} ${-ry * 0.3} ${rx * 0.6} ${-ry * 0.1}" fill="none" stroke="#FFFFFF" stroke-width="7" opacity=".5" stroke-linecap="round"/>`);
}
function bgSavanna(o = {}) {
  o = Object.assign({ hz: 640, sky: [C.sky1, C.sky2], ground: C.sand, hills: C.hills, seed: 3, trees: true, behind: '' }, o);
  const r = rng(o.seed);
  let s = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient></defs>`;
  s += `<rect x="0" y="0" width="${W}" height="${o.hz + 40}" fill="url(#sk)"/>` + o.behind;
  const hp = [[-50, o.hz + 10]];
  for (let i = 0; i <= 8; i++) hp.push([i * 250 - 40, o.hz - 30 - r() * 70]);
  hp.push([2000, o.hz + 10]);
  s += `<path d="${smooth(hp, false)} L2000 ${o.hz + 40} L-50 ${o.hz + 40} Z" fill="${o.hills}" opacity=".85"/>`;
  s += `<rect x="0" y="${o.hz}" width="${W}" height="${H - o.hz}" fill="${o.ground}"/>`;
  s += `<path d="M0 ${o.hz} Q480 ${o.hz - 8} 960 ${o.hz + 2} T1920 ${o.hz - 4}" fill="none" ${S} stroke-width="4" opacity=".7"/>`;
  let dash = '';
  for (let i = 0; i < 46; i++) { const x = r() * W, y = o.hz + 30 + r() * (H - o.hz - 40); dash += `M${f1(x)} ${f1(y)} h${f1(18 + r() * 34)} `; }
  s += `<path d="${dash}" stroke="${C.sandD}" stroke-width="4" stroke-linecap="round" opacity=".7"/>`;
  for (let i = 0; i < 16; i++) s += tuft(r() * W, o.hz + 40 + r() * (H - o.hz - 60), 0.8 + r() * 0.6);
  if (o.trees) { s += acacia(180 + r() * 200, o.hz + 6, 0.45); s += acacia(1450 + r() * 300, o.hz + 4, 0.38); }
  return s;
}
function bgNight(t, o = {}) {
  o = Object.assign({ hz: 640, seed: 8 }, o);
  const r = rng(o.seed);
  let s = `<defs><linearGradient id="nk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.night1}"/><stop offset="1" stop-color="${C.night2}"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${o.hz + 40}" fill="url(#nk)"/>`;
  for (let i = 0; i < 60; i++) { const x = r() * W, y = r() * (o.hz - 60), tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.3); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.5 + r() * 2.5)}" fill="#FFF6D8" opacity="${f1(0.4 + 0.6 * tw)}"/>`; }
  s += `<circle cx="1560" cy="170" r="64" fill="#F6ECC9"/><circle cx="1590" cy="150" r="58" fill="${C.night1}"/>`;
  const hp = [[-50, o.hz + 10]];
  for (let i = 0; i <= 8; i++) hp.push([i * 250 - 40, o.hz - 20 - r() * 60]);
  hp.push([2000, o.hz + 10]);
  s += `<path d="${smooth(hp, false)} L2000 ${o.hz + 40} L-50 ${o.hz + 40} Z" fill="#252F49"/>`;
  s += `<rect y="${o.hz}" width="${W}" height="${H - o.hz}" fill="${C.groundN}"/>`;
  return s;
}
function bgSnow(t, o = {}) {
  o = Object.assign({ hz: 620, seed: 12 }, o);
  const r = rng(o.seed);
  let s = `<defs><linearGradient id="sn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C9D8E2"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${o.hz + 40}" fill="url(#sn)"/>`;
  for (let i = 0; i < 14; i++) {
    const x = i * 150 + r() * 60 - 40, sc = 0.5 + r() * 0.5;
    s += g(`translate(${f1(x)} ${o.hz + 10}) scale(${f1(sc)})`, `<path d="M0 -260 L-70 -120 L-40 -120 L-95 0 L95 0 L40 -120 L70 -120 Z" fill="#6E8486" ${S} stroke-width="5"/><path d="M0 -260 L-34 -192 L-10 -200 L6 -186 L34 -192 Z" fill="#FFFFFF" ${S} stroke-width="4"/>`);
  }
  s += `<rect y="${o.hz}" width="${W}" height="${H - o.hz}" fill="${C.snow}"/>`;
  s += `<path d="M0 ${o.hz} Q480 ${o.hz - 10} 960 ${o.hz} T1920 ${o.hz - 6}" fill="none" ${S} stroke-width="4" opacity=".6"/>`;
  for (let i = 0; i < 10; i++) s += `<ellipse cx="${f1(r() * W)}" cy="${f1(o.hz + 60 + r() * 380)}" rx="${f1(80 + r() * 120)}" ry="${f1(10 + r() * 10)}" fill="${C.snowS}" opacity=".8"/>`;
  return s;
}
function snowfall(t, n = 70) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const sp = 70 + (i * 37) % 60, x = ((i * 271) % W) + Math.sin(t * 1.3 + i) * 26, y = ((i * 149) + t * sp) % (H + 40) - 20;
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 + (i % 4) * 1.6)}" fill="#FFFFFF" stroke="#A9BFCC" stroke-width="1.5"/>`;
  }
  return s;
}
function paper() { return `<rect width="${W}" height="${H}" fill="${C.paper}"/>`; }
function kitchen(night, o = {}) {
  const wall = night ? '#2E3852' : '#F2E3C6', floor = night ? '#4A3E34' : '#C9A57A', plank = night ? '#3B3129' : '#B08B60';
  let s = `<rect width="${W}" height="880" fill="${wall}"/><rect y="880" width="${W}" height="200" fill="${floor}"/>`;
  let pl = '';
  for (let i = 0; i < 9; i++) pl += `M${i * 230 - 40} 880 L${i * 260 - 160} 1080 `;
  s += `<path d="${pl} M0 950 H1920 M0 1030 H1920" stroke="${plank}" stroke-width="4"/>`;
  s += `<path d="M0 880 H1920" ${S} stroke-width="5"/>`;
  const wx = o.wx ?? 200, ww = 420;
  s += `<rect x="${wx}" y="170" width="${ww}" height="340" rx="10" fill="${night ? '#1B2440' : '#CFE6F0'}" stroke="${night ? '#D9D1BF' : C.ink}" stroke-width="16"/>`;
  if (night) {
    s += `<circle cx="${wx + 300}" cy="250" r="42" fill="#F6ECC9"/><circle cx="${wx + 318}" cy="236" r="38" fill="#1B2440"/>`;
    for (let i = 0; i < 8; i++) s += `<circle cx="${wx + 30 + (i * 53) % 360}" cy="${200 + (i * 71) % 280}" r="3" fill="#FFF6D8" opacity=".8"/>`;
    s += `<path d="M${wx} 520 L${wx + ww} 520 L${wx + ww + 360} 1080 L${wx + 160} 1080 Z" fill="#AFC3E8" opacity=".10"/>`;
  } else {
    s += `<circle cx="${wx + 320}" cy="250" r="40" fill="#F6C55A" opacity=".9"/>`;
  }
  s += `<path d="M${wx + ww / 2} 170 V510 M${wx} 340 H${wx + ww}" stroke="${night ? '#D9D1BF' : C.ink}" stroke-width="10"/>`;
  return s;
}
function clock(x, y, r, hh, mm) {
  const ah = (hh % 12 + mm / 60) * 30, am = mm * 6;
  const dh = dir(180 - ah), dm = dir(180 - am);
  let ticks = '';
  for (let i = 0; i < 12; i++) { const d = dir(i * 30); ticks += `M${f1(d[0] * r * 0.78)} ${f1(d[1] * r * 0.78)} L${f1(d[0] * r * 0.9)} ${f1(d[1] * r * 0.9)} `; }
  return g(`translate(${x} ${y})`, `<circle r="${r}" fill="#F4EEDC" ${S} stroke-width="7"/><path d="${ticks}" ${S} stroke-width="5"/><path d="M0 0 L${f1(-dh[0] * r * 0.5)} ${f1(dh[1] * r * 0.5)} M0 0 L${f1(-dm[0] * r * 0.75)} ${f1(dm[1] * r * 0.75)}" ${S} stroke-width="7"/>`);
}

// ---------- text ----------
function hand(txt, x, y, size, t, t0, o = {}) {
  const per = o.per ?? 0.035, col = o.col || C.text, anchor = o.anchor || 'middle';
  let sp = '';
  [...txt].forEach((ch, i) => { const a = clamp((t - t0 - i * per) / 0.1); sp += `<tspan opacity="${a.toFixed(2)}">${esc(ch)}</tspan>`; });
  return `<text x="${x}" y="${y}" font-family="Hand" font-size="${size}" fill="${col}" text-anchor="${anchor}" letter-spacing="${o.ls ?? 3}" style="white-space:pre">${sp}</text>`;
}
function tag(txt, t, t0 = 0) {
  const p = back((t - t0) / 0.5), w = txt.length * 38 + 80, x = lerp(-w - 40, 70, p);
  return g(`translate(${f1(x)} 56) rotate(-3)`, `<rect x="6" y="8" width="${w}" height="112" rx="16" fill="${C.ink}" opacity=".18"/><rect x="0" y="0" width="${w}" height="112" rx="16" fill="${C.paper}" ${S} stroke-width="5"/><text x="${w / 2}" y="82" font-family="Hand" font-size="80" fill="${C.text}" text-anchor="middle" letter-spacing="3">${esc(txt)}</text>`);
}

// ---------- scenes (reusable drawings) ----------
// c = {t, d, v, at(word), frame}; t is shot-local seconds. o = per-shot options.
// Times: DONE = already finished before the shot starts, NEVER = does not happen in this shot.
const DONE = -10, NEVER = 1e9;
function sparkle(x, y, t, t0, s = 1) {
  if (t < t0) return '';
  const p = clamp((t - t0) / 0.7), sc = s * Math.sin(Math.PI * p) * 1.2;
  if (sc <= 0.01) return '';
  return g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(p * 90)}) scale(${sc.toFixed(3)})`, `<path d="M0 -44 Q7 -7 44 0 Q7 7 0 44 Q-7 7 -44 0 Q-7 -7 0 -44 Z" fill="#FFF3B0" stroke="${C.accent}" stroke-width="4"/>`);
}
function bowl(s = 1) {
  return g(`scale(${s})`, `<path d="M-80 -10 Q-76 50 0 54 Q76 50 80 -10 Z" fill="${C.wood}" ${S} stroke-width="5"/><ellipse cx="0" cy="-10" rx="80" ry="16" fill="#6E5235" ${S} stroke-width="5"/>`);
}
function brainSvg(t) {
  const w = Math.sin(t * 22) * 5;
  let o = `<path d="${smooth([[-120, 10], [-112, -50], [-60, -88], [0, -80], [60, -90], [114, -52], [122, 10], [80, 52], [0, 46], [-80, 54]])}" fill="#F4A7B4" ${S} stroke-width="6"/>`;
  o += `<path d="M0 -78 Q-10 -20 0 44 M-80 -40 q20 -20 40 0 t40 0 M30 -50 q20 -20 40 0 t30 10 M-90 10 q20 -20 40 0 t40 0 M20 0 q20 -20 40 0 t40 0 M-50 30 q20 -14 40 0" fill="none" stroke="#C9687C" stroke-width="5" stroke-linecap="round"/>`;
  o += `<path d="M-160 -40 q-20 30 0 60 M-190 -60 q-30 50 0 100 M160 -40 q20 30 0 60 M190 -60 q30 50 0 100" fill="none" ${S} stroke-width="5" opacity=".7"/>`;
  return g(`rotate(${f1(w)})`, o);
}
const shrug = { la: [-42, -128], ra: [42, 128] };
const SC = {
  kitchenNight(c) {
    let s = kitchen(true);
    s += clock(860, 280, 72, 11, 52);
    s += fridge(1300, 900, 380, 660, { col: '#D5DCE3', led: true, hum: true, t: c.t, humCol: '#E7E1D0' });
    return s;
  },
  fridgeOpen(c, o) {
    let s = paper();
    const fo = { open: true };
    s += fridge(980, 960, 420, 760, fo);
    const [s1, s2, s3] = fo.shelves;
    s += pop(900, s1 - 4, c.t, o.milk, milk());
    s += pop(1010, s2 - 4, c.t, o.eggs, eggs());
    s += pop(960, s3 - 18, c.t, o.left, leftovers());
    if (o.check !== undefined) { s += check(1470, 430, 1.1, c.t, o.check); s += hand('for days', 1480, 600, 96, c.t, o.days); }
    return s;
  },
  rewind(c, o = {}) {
    let s = paper();
    const flip = eio(c.t / 0.55) * 180;
    s += g(`translate(520 540) rotate(${f1(flip)})`, hourglass(1.25, Math.max(0, c.t - 0.55)));
    s += g(`translate(520 540) rotate(${f1(-c.t * 140)})`, `<path d="M-230 0 A230 230 0 0 1 120 -196" fill="none" ${S} stroke-width="10"/><path d="M98 -228 L128 -192 L80 -176" fill="none" ${S} stroke-width="10"/><path d="M230 0 A230 230 0 0 1 -120 196" fill="none" ${S} stroke-width="10"/><path d="M-98 228 L-128 192 L-80 176" fill="none" ${S} stroke-width="10"/>`);
    s += hand('REWIND', 1240, 470, 200, c.t, 0.12, { per: 0.05 });
    if (c.t > 0.5) {
      const N = o.n || 50, n = Math.round(eout((c.t - 0.5) / 1.3) * N) * 1000;
      s += `<text x="1240" y="650" font-family="Hand" font-size="128" fill="${C.accent}" text-anchor="middle" letter-spacing="3">${n.toLocaleString('en-US')} YEARS</text>`;
    }
    for (let i = 0; i < 6; i++) {
      const p = clamp(c.t / 0.7 - i * 0.08);
      if (p > 0 && p < 1) s += `<path d="M${f1(2000 - p * 2300)} ${150 + i * 150} h260" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" opacity="${f1(0.35 * Math.sin(Math.PI * p))}"/>`;
    }
    return s;
  },
  hunter(c, o = {}) {
    let s = bgSavanna({ seed: 5 });
    s += acacia(1640, 650, 0.95);
    s += g('translate(1260 930) scale(1.35)', antelope(true, c.t));
    s += person({ x: 640, y: 960, s: 1.32, t: c.t, seed: 2, face: 'smug', la: [-38, 32], ra: [26, 150],
      holdR: e => spear(e[0], e[1], 180, 380, 0.45) + (o.glint !== undefined ? sparkle(e[0], e[1] - 258, c.t, o.glint, 0.9) : '') });
    return s;
  },
  family(c) {
    let s = bgSavanna({ seed: 37 });
    s += hut(1380, 700, 1.3);
    s += acacia(300, 650, 0.6);
    s += person({ x: 760, y: 965, s: 1.25, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [55, 30] });
    s += person({ x: 980, y: 972, s: 0.8, t: c.t, seed: 9, face: 'happy', flip: true, la: [80, 95], ra: [70, 95], bob: 2,
      front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 6)})`, bowl(0.75)) });
    s += person({ x: 1110, y: 975, s: 0.6, t: c.t, seed: 12, face: 'surprised', la: [-20, -8], ra: [35, -60] });
    return s;
  },
  pile(c) {
    let s = bgSavanna({ seed: 7 });
    s += meatPile(1250, 930, 1.35, 3);
    s += person({ x: 470, y: 935, s: 1.08, t: c.t, seed: 2, face: 'surprised', la: [-30, -60], ra: [30, 60] });
    s += person({ x: 680, y: 935, s: 1.0, t: c.t, seed: 5, long: true, face: 'surprised', hairC: C.hair2, la: [-14, -8], ra: [40, 150] });
    s += person({ x: 840, y: 945, s: 0.68, t: c.t, seed: 9, face: 'happy', la: [-150, -170], ra: [150, 170] });
    return s;
  },
  rot(c) {
    let s = bgSavanna({ seed: 11, sky: ['#F3D49C', '#FBEBCB'], hills: '#E3C893', ground: '#E8C584' });
    s += sun(1600, 190, 92, c.t);
    s += heatWaves(1080, 760, c.t, 4, 110);
    s += meatPile(1080, 930, 1.05, 21);
    s += g('translate(1080 760) scale(1.5) translate(-1080 -760)', fliesAround(1080, 760, c.t, 9, 160, 80));
    s += person({ x: 560, y: 965, s: 1.32, t: c.t, seed: 3, face: 'worried', la: [-150, 128], ra: [16, 8], armsFront: true });
    s += `<rect width="${W}" height="${H}" fill="#F59A2C" opacity=".07"/>`;
    return s;
  },
  noFridge(c) {
    let s = paper();
    s += fridge(640, 860, 280, 500, {});
    s += g('translate(1290 610)', iceCube(1.25));
    s += xmark(640, 610, 190, c.t, c.at('fridge'));
    s += xmark(1290, 610, 170, c.t, c.at('ice'));
    return s;
  },
  think(c, o) {
    let s = paper();
    s += `<ellipse cx="960" cy="990" rx="190" ry="20" fill="${C.ink}" opacity=".1"/>`;
    const sc = Math.sin(c.t * 14) * 9;
    s += person({ x: 960, y: 985, s: 1.45, t: c.t, seed: 2, face: 'think', la: [-14, -6], ra: [150, -150 + sc], armsFront: true });
    s += pop(1230, 430, c.t, o.q1, questionMark(300, Math.sin(c.t * 3) * 8));
    s += pop(1380, 300, c.t, o.q2, questionMark(170, -12));
    return s;
  },
  modernFridge(c) {
    let s = paper();
    const fo = { open: true };
    s += fridge(1200, 960, 400, 720, fo);
    const [s1, s2, s3] = fo.shelves;
    s += g(`translate(1240 ${f1(s2 - 4)})`, eggs()) + g(`translate(1180 ${f1(s3 - 18)})`, leftovers());
    const sip = Math.sin(c.t * 4) * 6;
    s += person({ x: 690, y: 975, s: 1.32, kind: 'modern', t: c.t, seed: 3, face: 'smug', shirt: '#7D8FA8', la: [-38, 32], ra: [140, -100 + sip], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 4)} ${f1(R[1] + 16)}) rotate(-125) scale(.6) translate(0 150)`, milk()) });
    return s;
  },
  brain(c) {
    let s = paper();
    s += `<ellipse cx="960" cy="990" rx="190" ry="20" fill="${C.ink}" opacity=".1"/>`;
    s += person(Object.assign({ x: 960, y: 985, s: 1.3, kind: 'modern', t: c.t, seed: 3, face: 'worried', shirt: '#7D8FA8' }, shrug));
    s += pop(960, 270, c.t, 0.05, g('scale(1.45)', brainSvg(c.t)));
    return s;
  },
  objection(c) {
    let s = paper();
    s += person({ x: 560, y: 985, s: 1.3, kind: 'modern', t: c.t, seed: 3, face: 'smug', shirt: '#7D8FA8', la: [-38, 32], ra: [110, 60 + Math.sin(c.t * 9) * 12] });
    const b = `<path d="M-400 -170 H400 Q440 -170 440 -130 V130 Q440 170 400 170 H-160 L-300 260 L-250 170 H-400 Q-440 170 -440 130 V-130 Q-440 -170 -400 -170 Z" fill="#FFFFFF" ${S} stroke-width="6"/>`;
    s += pop(1240, 420, c.t, 0.0, b, 0.3);
    s += hand('CAVEMEN?', 1240, 380, 120, c.t, c.at('Cavemen') - 0.05, { per: 0.03 });
    s += hand('They just let it rot.', 1240, 510, 96, c.t, c.at('They') - 0.05, { per: 0.03, ls: 1 });
    return s;
  },
  assume(c) {
    let s = bgSavanna({ seed: 41, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
    s += meatPile(1150, 940, 1.05, 21, '#8A8A4C');
    for (let i = 0; i < 3; i++) { const p = (c.t * 0.6 + i / 3) % 1; s += `<path d="M${1080 + i * 70} ${f1(760 - p * 140)} q14 -18 0 -36 q-14 -18 0 -36" fill="none" stroke="#7E9A5A" stroke-width="6" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p) * 0.9)}"/>`; }
    s += g('translate(1150 780) scale(1.4) translate(-1150 -780)', fliesAround(1150, 780, c.t, 7, 150, 70));
    s += person(Object.assign({ x: 620, y: 965, s: 1.3, t: c.t, seed: 2, face: 'neutral' }, shrug));
    s += pop(860, 300, c.t, 0.35, questionMark(220, Math.sin(c.t * 3) * 8));
    s += `<rect width="${W}" height="${H}" fill="#8C8270" opacity=".10"/>`;
    return s;
  },
  tricks(c) {
    let s = paper();
    s += hand('THEY HAD TRICKS.', 960, 330, 150, c.t, 0.0, { per: 0.03 });
    const icons = [sun(0, 0, 70, c.t), `<circle cx="-40" cy="10" r="46" fill="${C.smoke}" ${S} stroke-width="5"/><circle cx="20" cy="-20" r="56" fill="${C.smoke}" ${S} stroke-width="5"/><circle cx="60" cy="20" r="40" fill="${C.smoke}" ${S} stroke-width="5"/>`, g(`rotate(${f1(c.t * 30)})`, snowflake(0.95))];
    icons.forEach((ic, i) => {
      s += pop(560 + i * 400, 640, c.t, 0.3 + i * 0.2, ic);
      s += hand(String(i + 1), 560 + i * 400, 860, 110, c.t, 0.4 + i * 0.2, { col: C.accent });
    });
    return s;
  },
  dry(c, o = {}) {
    let s = bgSavanna({ seed: 13 });
    s += sun(1660, 170, 80, c.t);
    s += rack(1200, 930, 560, 400, c.t, { n: 8, wind: 1.6 });
    s += person({ x: 560, y: 965, s: 1.28, t: c.t, seed: 2, face: 'happy', la: [-14, -6], ra: [40, 110],
      holdR: e => g(`translate(${f1(e[0])} ${f1(e[1] - 6)})`, strip(140, C.meat, Math.sin(c.t * 2.6) * 6)) });
    s += windLines(c.t, 260, 5);
    if (o.tag) s += tag(o.tag, c.t, 0);
    return s;
  },
  diagram(c) {
    let s = paper();
    const tHung = c.at('hung'), tDry = c.at('dry'), tWeeks = c.at('weeks');
    s += g('translate(520 330)', strip(380, C.meat, Math.sin(c.t * 2) * 2, 76));
    s += hand('FRESH', 520, 820, 86, c.t, 0.05);
    s += arrow(700, 520, 1010, 520, c.t, tHung, 0.5, C.ink, 60);
    s += pop(860, 360, c.t, tHung + 0.15, sun(0, 0, 40, c.t));
    s += g('translate(1180 340)', c.t > tDry ? strip(lerp(380, 330, eout((c.t - tDry) / 0.6)), '#6B2D20', 0, lerp(76, 58, eout((c.t - tDry) / 0.6))) : '');
    s += hand('DRIED', 1180, 820, 86, c.t, tDry + 0.1);
    s += pop(1580, 470, c.t, tWeeks, calendar(1.25, 'WEEKS', Math.min(28, 1 + Math.floor(Math.max(0, c.t - tWeeks) * 26))));
    return s;
  },
  smokeRack(c, o = {}) {
    let s = bgSavanna({ seed: 17, sky: ['#EFA972', '#F8D9B0'], hills: '#D8A878', ground: '#D9B47A', behind: `<circle cx="1500" cy="600" r="110" fill="#F7883A" opacity=".95"/>` });
    s += rack(1000, 930, 520, 420, c.t, { n: 6, col: ['#9C3D30', '#86352A'], wind: 0.5 });
    s += fire(1000, 950, 1.15, c.t);
    s += smoke(1000, 760, c.t, { n: 12, rise: 640, drift: 90, op: 0.8 });
    if (o.tag) s += tag(o.tag, c.t, 0);
    return s;
  },
  fliesAway(c) {
    let s = bgSavanna({ seed: 17, sky: ['#EFA972', '#F8D9B0'], hills: '#D8A878', ground: '#D9B47A', behind: `<circle cx="1500" cy="600" r="110" fill="#F7883A" opacity=".95"/>` });
    s += rack(1000, 930, 520, 420, c.t, { n: 6, col: ['#86352A', '#7A2F25'], wind: 0.5 });
    s += fire(1000, 950, 1.15, c.t);
    s += smoke(1000, 760, c.t, { n: 12, rise: 640, drift: 120, op: 0.85 });
    s += person({ x: 500, y: 945, s: 1.05, t: c.t, seed: 4, face: 'happy', hip: 60, ll: [112, 10], rl: [100, -4], la: [-10, 40], ra: [30, 70] });
    const tf = c.at('flies');
    for (let i = 0; i < 6; i++) {
      const base = [1650 + i * 40, 420 + (i * 53) % 240], near = [1220 + (i % 3) * 30, 520 + (i * 41) % 200];
      let x, y;
      if (c.t < tf) { const p = eout(c.t / Math.max(0.3, tf)); x = lerp(base[0], near[0], p) + Math.sin(c.t * 9 + i) * 14; y = lerp(base[1], near[1], p) + Math.cos(c.t * 11 + i) * 12; }
      else { const p = Math.pow(clamp((c.t - tf) / 0.9), 2); x = lerp(near[0], 2100 + i * 30, p) + Math.sin(c.t * 9 + i) * 14; y = lerp(near[1], 200 + i * 40, p); }
      s += fly(x, y, c.t, i);
    }
    return s;
  },
  snow(c, o) {
    let s = bgSnow(c.t);
    s += `<ellipse cx="1230" cy="905" rx="200" ry="44" fill="#86A0B0" ${S} stroke-width="5"/><ellipse cx="1230" cy="914" rx="168" ry="30" fill="#5E7889"/>`;
    if (!o.walk) s += g('translate(1230 905) scale(.62)', `<clipPath id="pit"><ellipse cx="0" cy="8" rx="270" ry="50"/></clipPath><g clip-path="url(#pit)">${g('translate(0 40)', meat(1.1, 4, C.meat, -8))}</g>`);
    s += `<path d="${smooth([[1440, 910], [1480, 850], [1560, 830], [1640, 860], [1680, 915]], false)} Z" fill="#EEF4F7" ${S} stroke-width="5"/>`;
    let px = 820;
    if (o.walk) {
      px = lerp(380, 760, eout(c.t / Math.max(0.5, c.d)));
      const sw = Math.sin(c.t * 10) * 20;
      s += person({ x: px, y: 960, s: 1.2, t: c.t, seed: 6, face: 'neutral', cloak: true, ll: [-sw, -sw * 0.6], rl: [sw, sw * 0.6], la: [-14, -6], ra: [140, -160],
        holdR: e => g(`translate(${f1(e[0] - 10)} ${f1(e[1] + 10)})`, meat(0.7, 4, C.meat, 20)) });
    } else {
      const dig = Math.sin(c.t * 5) * 0.5 + 0.5;
      s += person({ x: px, y: 960, s: 1.2, t: c.t, seed: 6, face: 'neutral', cloak: true, la: [50, lerp(70, 90, dig)], ra: [60, lerp(85, 105, dig)],
        holdR: e => spear(e[0], e[1], lerp(38, 48, dig), 330, 0.14) });
    }
    for (let i = 0; i < 3; i++) { const p = (c.t * 0.8 + i / 3) % 1; s += `<circle cx="${f1(px + 80 + p * 90)}" cy="${f1(520 - p * 60)}" r="${f1(10 + p * 26)}" fill="#FFFFFF" opacity="${f1(0.8 * (1 - p))}"/>`; }
    s += snowfall(c.t, 70);
    if (o.tag) s += tag(o.tag, c.t, 0);
    return s;
  },
  freezer(c) {
    let s = paper();
    s += hand("NATURE'S", 960, 470, 170, c.t, 0.05, { per: 0.04 });
    s += hand('FREEZER', 960, 700, 230, c.t, c.at('freezer') - 0.05, { per: 0.045, col: '#3E7FA6' });
    s += pop(1530, 320, c.t, 0.25, g(`rotate(${f1(c.t * 25)})`, snowflake(1.0)));
    s += pop(380, 760, c.t, 0.5, g(`rotate(${f1(-c.t * 30)})`, snowflake(0.6)));
    return s;
  },
  bubble(c, o) {
    let s = paper();
    s += rock(640, 912, 165, 72, 5);
    s += person({ x: 640, y: 960, s: 1.25, t: c.t, seed: 2, face: 'think', hip: 120, ll: [86, 4], rl: [76, -2], la: [-20, -8], ra: [60, -140] });
    s += pop(1260, 380, c.t, o.pop, thought(0, 0, 330, 230, -470, 200), 0.45);
    s += pop(1260, 400, c.t, o.pop + 0.2, fridge(0, 130, 150, 260, {}));
    s += xmark(1260, 380, 150, c.t, o.x);
    return s;
  },
  campNight(c) {
    let s = bgNight(c.t);
    s += hut(300, 670, 1.1, '#6B5038') + hut(1640, 660, 1.2, '#6B5038') + hut(1240, 640, 0.7, '#6B5038');
    s += `<ellipse cx="960" cy="900" rx="720" ry="190" fill="#F28C28" opacity=".22"/>`;
    const sitP = { hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30] };
    s += person(Object.assign({ x: 760, y: 840, s: 0.82, t: c.t, seed: 5, face: 'happy', long: true, ra: [40, 80] }, sitP));
    s += person(Object.assign({ x: 1170, y: 840, s: 0.82, t: c.t, seed: 8, face: 'laugh', flip: true, ra: [40, 80], shake: 0.6 }, sitP));
    s += fire(960, 920, 1.05, c.t);
    s += person(Object.assign({ x: 560, y: 960, s: 1.0, t: c.t, seed: 2, face: 'happy', ra: [40, 70] }, sitP));
    s += person(Object.assign({ x: 1370, y: 960, s: 1.0, t: c.t, seed: 9, face: 'happy', flip: true, beard: true, hairC: C.hair2, ra: [40, 70] }, sitP));
    return s;
  },
  share(c) {
    let s = bgSavanna({ seed: 19 });
    s += hut(260, 660, 0.9) + hut(1700, 650, 1.0) + hut(1330, 630, 0.6);
    s += meatPile(1060, 975, 0.62, 31);
    const recv = [[430, 935, 1.0, false, { long: true, seed: 5 }], [650, 945, 0.68, false, { seed: 9 }], [1480, 935, 1.0, true, { seed: 8 }], [1700, 935, 0.95, true, { seed: 10, beard: true, hairC: C.hair2 }]];
    const t0 = c.at('shares') - 0.05, gap = 0.3, fly_ = 0.4;
    recv.forEach((r, i) => {
      const ti = t0 + i * gap, got = c.t > ti + fly_;
      const ra = got || c.t > ti - 0.2 ? [120, 150] : [20, 8];
      const sc = r[2];
      s += person(Object.assign({ x: r[0], y: r[1], s: sc, t: c.t, flip: r[3], face: got ? 'happy' : 'neutral', la: [-14, -6], ra,
        holdR: got ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 10)})`, meat(0.42, 40 + i))) : null }, r[4]));
      if (c.t > ti && !got) {
        const p = eio((c.t - ti) / fly_), hx = r[0] + (r[3] ? -1 : 1) * 95 * sc, hy = r[1] - 300 * sc;
        const x = lerp(1060, hx, p), y = lerp(880, hy, p) - Math.sin(Math.PI * p) * 220;
        s += g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(p * 360)})`, meat(0.42, 40 + i));
      }
    });
    s += person({ x: 960, y: 935, s: 1.15, t: c.t, seed: 2, face: 'happy', la: [-60, -90], ra: [60, 90] });
    return s;
  },
  nextWeek(c, o) {
    let s = bgSavanna({ seed: 23 });
    s += acacia(240, 650, 0.8);
    const arrive = o.mode === 'arrive';
    const walk = arrive ? clamp(c.t / 1.1) : 1, wx = lerp(1640, 1270, eout(walk));
    const sw = walk < 1 ? Math.sin(c.t * 11) * 22 : 0;
    const tg = arrive ? NEVER : c.at('shares'), passing = c.t > tg && c.t < tg + 0.5, given = c.t >= tg + 0.5;
    s += person({ x: 640, y: 960, s: 1.25, t: c.t, seed: 2, face: given ? 'laugh' : (arrive ? 'neutral' : 'happy'), la: [-30, -60], ra: arrive ? [16, 8] : [120, 140],
      holdR: given ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 10)})`, meat(0.55, 51))) : null });
    s += person({ x: wx, y: 960, s: 1.25, t: c.t, seed: 10, flip: true, beard: true, hairC: C.hair2, face: 'happy', ll: [-sw, -sw * 0.6], rl: [sw, sw * 0.6],
      la: [-14, -6], ra: given || passing ? [110, 120] : [40, 120],
      holdR: !given && !passing ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 10)})`, meat(0.55, 51))) : null });
    if (passing) {
      const p = eio((c.t - tg) / 0.5), x = lerp(wx - 120, 760, p), y = lerp(560, 600, p) - Math.sin(Math.PI * p) * 120;
      s += g(`translate(${f1(x)} ${f1(y)})`, meat(0.55, 51));
    }
    if (arrive) {
      const tl = c.at('lucky');
      s += sparkle(wx - 150, 380, c.t, tl - 0.1, 1.0) + sparkle(wx + 60, 300, c.t, tl + 0.05, 0.7) + sparkle(wx - 220, 560, c.t, tl + 0.15, 0.6);
      s += tag('NEXT WEEK', c.t, 0);
    }
    return s;
  },
  research(c, o) {
    let s = bgSavanna({ seed: 29, trees: false });
    s += domeHut(1440, 660, 0.7) + domeHut(1690, 650, 0.55) + domeHut(1220, 650, 0.45);
    s += acacia(260, 650, 0.6);
    const wr = Math.sin(c.t * 18) * 6;
    s += person({ x: 470, y: 965, s: 1.28, kind: 'research', t: c.t, seed: 4, face: 'think', la: [40, 100], ra: [55, 112 + wr],
      front: (L, R) => g(`translate(${f1(L[0] + 26)} ${f1(L[1] - 12)}) rotate(-12)`, `<rect x="-38" y="-48" width="76" height="96" rx="6" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M-24 -26 H24 M-24 -8 H24 M-24 10 H14" stroke="#9AA" stroke-width="3"/>`) });
    if (o.page) {
      const pg = popS(c.t, 0.0, 0.4);
      let note = `<rect x="-360" y="-250" width="720" height="500" rx="10" fill="#FFFDF7" ${S} stroke-width="5"/><path d="M-360 -190 H360" stroke="#E3B7B0" stroke-width="3"/>`;
      note += g('translate(0 30)', meat(0.6, 61));
      const spots = [[-250, -90], [-260, 120], [0, 175], [250, 120], [250, -90], [0, -150]];
      spots.forEach((p, i) => {
        const tt = 0.25 + i * 0.13;
        note += arrow(p[0] * 0.25, 30 + p[1] * 0.2, p[0] * 0.78, 30 + p[1] * 0.78, c.t, tt, 0.25, C.text);
        note += pop(p[0], 30 + p[1], c.t, tt + 0.2, `<circle r="26" fill="#FFFFFF" ${S} stroke-width="4"/><circle cx="-8" cy="-2" r="3.5" fill="${C.ink}"/><circle cx="8" cy="-2" r="3.5" fill="${C.ink}"/><path d="M-8 9 Q0 15 8 9" fill="none" ${S} stroke-width="3"/>`);
      });
      s += g(`translate(1180 540) rotate(2) scale(${pg.toFixed(3)})`, note);
    }
    s += hand('THE HADZA  ·  TANZANIA', 1180, 200, 92, c.t, o.label, { per: 0.03 });
    s += pop(650, 168, c.t, o.label + 0.6, `<path d="M0 30 C-34 -6 -30 -46 0 -46 C30 -46 34 -6 0 30 Z" fill="${C.red}" ${S} stroke-width="4"/><circle cx="0" cy="-20" r="10" fill="#FFFFFF"/>`);
    return s;
  },
  spoils(c, o) {
    let s = paper();
    s += hand('MEAT SPOILS.', 1010, 420, 160, c.t, o.l1, { per: 0.035 });
    s += hand("A FAVOUR DOESN'T.", 960, 650, 160, c.t, o.l2, { per: 0.035, col: C.accent });
    s += pop(400, 370, c.t, o.l1 + 0.15, g('rotate(-10)', meat(0.8, 71, '#8C7A4E')) + `<path d="M-30 -80 q10 -20 0 -40 M10 -86 q10 -20 0 -40 M50 -80 q10 -20 0 -40" fill="none" stroke="#7E9A5A" stroke-width="5" stroke-linecap="round"/>`);
    s += pop(960, 850, c.t, o.l2 + 0.8, g(`scale(${f1(1 + 0.06 * Math.sin(c.t * 6))})`, heart(1.2)));
    return s;
  },
  kitchenDay(c) {
    let s = kitchen(false, { wx: 150 });
    s += `<rect x="40" y="600" width="560" height="280" fill="#E7D3B0" ${S} stroke-width="5"/><rect x="20" y="580" width="600" height="30" rx="6" fill="#B79A72" ${S} stroke-width="5"/><path d="M320 610 V880 M80 700 h40 M360 700 h40" ${S} stroke-width="5"/>`;
    s += fridge(1360, 900, 360, 640, {});
    const eat = Math.max(0, Math.sin(c.t * 3.2));
    s += person({ x: 900, y: 960, s: 1.32, kind: 'modern', t: c.t, seed: 3, face: 'tired', shirt: '#7D8FA8', la: [40, 110], ra: [60, lerp(100, 170, eat)],
      front: (L, R) => g(`translate(${f1(L[0] + 20)} ${f1(L[1] + 16)})`, g('scale(.62)', leftovers())) + g(`translate(${f1(R[0])} ${f1(R[1])}) rotate(${f1(lerp(-30, -150, eat))})`, `<path d="M0 0 L0 -48 M-7 -48 V-62 M0 -48 V-64 M7 -48 V-62" stroke="#8B949B" stroke-width="5" stroke-linecap="round"/>`) });
    return s;
  },
  campEnd(c) {
    let s = bgNight(c.t, { seed: 31 });
    s += hut(280, 670, 1.1, '#6B5038') + hut(1650, 660, 1.2, '#6B5038');
    s += `<ellipse cx="960" cy="900" rx="760" ry="200" fill="#F28C28" opacity=".24"/>`;
    const sitP = { hip: 50, ll: [118, 8], rl: [106, -2] };
    s += person(Object.assign({ x: 740, y: 845, s: 0.82, t: c.t, seed: 5, face: 'laugh', long: true, la: [-10, 30], ra: [40, 80], shake: 0.8 }, sitP));
    s += person(Object.assign({ x: 1180, y: 845, s: 0.82, t: c.t, seed: 8, face: 'laugh', flip: true, la: [-10, 30], ra: [130, 160], shake: 1 }, sitP));
    s += person(Object.assign({ x: 960, y: 820, s: 0.6, t: c.t, seed: 9, face: 'happy', la: [-150, -170], ra: [150, 170] }, sitP));
    s += fire(960, 935, 1.05, c.t);
    s += person(Object.assign({ x: 540, y: 965, s: 1.0, t: c.t, seed: 2, face: 'laugh', la: [-10, 30], ra: [60, 110], shake: 0.7,
      holdR: e => g(`translate(${f1(e[0])} ${f1(e[1] - 8)})`, meat(0.4, 81)) }, sitP));
    s += person(Object.assign({ x: 1380, y: 965, s: 1.0, t: c.t, seed: 10, face: 'happy', flip: true, beard: true, hairC: C.hair2, la: [-10, 30], ra: [60, 110] }, sitP));
    return s;
  },
};

function antelope(down, t) {
  const tan = '#C98B4E', belly = '#F3E4CA';
  let o = '';
  const legs = [[-70, -18, -42, 34], [-46, -14, -10, 40], [58, -16, 96, 32], [84, -14, 128, 26]];
  for (const l of legs) { o += stick(l[0], l[1], l[2], l[3], 7, tan); o += `<path d="M${l[2]} ${l[3]} l${l[2] > l[0] ? 10 : 8} 8" ${S} stroke-width="9"/>`; }
  o += `<path d="${smooth([[-125, -46], [-90, -98], [0, -106], [96, -96], [134, -56], [110, -20], [0, -12], [-100, -18]])}" fill="${tan}" ${S} stroke-width="5"/>`;
  o += `<path d="M-100 -30 Q0 -16 112 -34" fill="none" stroke="${belly}" stroke-width="16" stroke-linecap="round"/>`;
  o += `<path d="M-80 -62 Q0 -50 90 -64" fill="none" stroke="#7A4A22" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  o += `<path d="M132 -66 q20 -6 22 14" fill="none" ${S} stroke-width="7"/>`;
  o += `<path d="M-108 -64 Q-150 -66 -176 -38" fill="none" stroke="${C.ink}" stroke-width="40" stroke-linecap="round"/><path d="M-108 -64 Q-150 -66 -176 -38" fill="none" stroke="${tan}" stroke-width="30" stroke-linecap="round"/>`;
  o += g('translate(-206 -30) rotate(-8)', `<path d="M-6 -20 Q20 -84 66 -112 M10 -18 Q40 -74 84 -96" fill="none" ${S} stroke-width="8"/><path d="M14 -52 l10 6 M28 -70 l10 6 M44 -86 l10 6" ${S} stroke-width="4"/>` +
    `<path d="M18 -16 Q52 -44 64 -28 Q46 -10 22 -6 Z" fill="${tan}" ${S} stroke-width="4.5"/>` +
    `<ellipse cx="0" cy="0" rx="46" ry="26" fill="${tan}" ${S} stroke-width="5"/><path d="M-44 4 Q-30 22 -6 18" fill="none" stroke="${belly}" stroke-width="8" stroke-linecap="round"/><circle cx="-42" cy="0" r="6" fill="${C.ink}"/><path d="M-4 -6 q8 5 16 0" fill="none" ${S} stroke-width="4"/>`);
  return o;
}

// ---------- captions ----------
function chunks(shot) {
  const words = [];
  for (const k of shot.words) {
    if (/^[^A-Za-z0-9']+$/.test(k.w) && words.length) { words[words.length - 1].w += k.w; continue; }
    words.push({ w: k.w, s: k.s, e: k.e });
  }
  const out = []; let cur = [];
  const len = a => a.reduce((n, w) => n + w.w.length + 1, 0);
  for (const w of words) {
    if (cur.length && (len(cur) + w.w.length > 30 || /[.:?]$/.test(cur[cur.length - 1].w) && len(cur) > 10)) { out.push(cur); cur = []; }
    cur.push(w);
  }
  if (cur.length) out.push(cur);
  return out;
}
function captionSvg(T) {
  const sh = TL.shots.find(s => T >= s.start && T < s.end) || TL.shots[TL.shots.length - 1];
  const tv = T - sh.vs;
  const ch = sh._chunks || (sh._chunks = chunks(sh));
  const last = ch[ch.length - 1], lastW = last[last.length - 1];
  if (tv > lastW.e + 0.6 && sh === TL.shots[TL.shots.length - 1]) return '';
  let k = 0;
  for (let i = 0; i < ch.length; i++) if (tv >= ch[i][0].s - 0.05) k = i;
  let sp = '';
  ch[k].forEach((w, i) => {
    const nextS = i + 1 < ch[k].length ? ch[k][i + 1].s : w.e + 0.3;
    const on = tv >= w.s - 0.03 && tv < nextS;
    sp += `<tspan fill="${on ? '#FFC94A' : '#FFFFFF'}">${esc(w.w)}${i + 1 < ch[k].length ? ' ' : ''}</tspan>`;
  });
  const appear = clamp((tv - ch[k][0].s + 0.08) / 0.12);
  return `<text x="960" y="1012" font-family="Cap" font-size="62" text-anchor="middle" paint-order="stroke" stroke="${C.ink}" stroke-width="14" stroke-linejoin="round" style="white-space:pre" opacity="${(k === 0 ? 1 : appear).toFixed(2)}">${sp}</text>`;
}

// ---------- frame ----------
let TL = null;
window.setTimeline = j => { TL = j; };
