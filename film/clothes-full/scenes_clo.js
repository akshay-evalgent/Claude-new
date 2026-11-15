// Scenes for "Why Did Humans Start Wearing Clothes?". Builds on all earlier film libraries.
// Every explaining line gets its own drawing; options like {"a":"@word"} make each step land on the spoken word.
'use strict';

Object.assign(PLACES, {
  morocco: [-6.9, 33.9], georgia2: [42.6, 42.2], sungir2: [40.45, 56.17], yana: [135.1, 70.7], armenia: [45.2, 39.7],
  oregon: [-121.0, 43.4], bizmoune: [-9.6, 31.4], alps2: [10.84, 46.78],
});
Object.assign(REGIONS, {
  morocco: { center: [-6, 31.5], scale: 2400, hl: ['Morocco'] },
  georgia2: { center: [43.5, 42], scale: 4200, hl: ['Georgia'] },
  sungir2: { center: [42, 56], scale: 1800, hl: ['Russia'] },
  yana: { center: [125, 66], scale: 900, hl: ['Russia'] },
  armenia: { center: [44.8, 40.2], scale: 5200, hl: ['Armenia'] },
  oregon: { center: [-120.5, 44], scale: 3200, hl: ['United States of America'] },
  bizmoune: { center: [-7, 31.5], scale: 2400, hl: ['Morocco'] },
  alps2: { center: [11, 46.8], scale: 4200, hl: ['Italy', 'Austria'] },
});

// ---------- helpers ----------
const at0 = (t, t0, d = 0.5) => eout(clamp((t - t0) / d));          // 0 -> 1 ease after t0
const on = (t, t0) => t >= t0;
const SKIN = '#E8C4A0', FUR = '#7A5232', HIDE = '#B98E5A', HIDE2 = '#8E6A3C';
function leafCover(y, s = 1) {
  return g(`translate(0 ${f1(y)}) scale(${s})`, `<path d="M0 0 Q-34 -10 -40 16 Q-20 30 0 22 Q20 30 40 16 Q34 -10 0 0 Z" fill="#5E8A3C" ${S} stroke-width="3.5"/><path d="M0 0 V22 M0 10 L-18 8 M0 10 L18 8" stroke="#3F6A2A" stroke-width="3" fill="none"/>`);
}
function furStrokes(x0, x1, y0, y1, n, seed, col = '#4E321C') {
  const r = rng(seed); let d = '';
  for (let i = 0; i < n; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0); d += `M${f1(x)} ${f1(y)} q5 -9 11 0 `; }
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round" opacity=".75"/>`;
}
function stitches(d, col = '#F3EBDD') { return `<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="7 7"/>`; }

// A figure in a chosen outfit. outfit: bare | fur | hide | cape | parka | otzi | beads | tunic
function fig(o) {
  o = Object.assign({ x: 0, y: 0, s: 1, flip: false, t: 0, seed: 1, face: 'neutral', la: [-12, -6], ra: [12, 6], ll: [-4, -2], rl: [4, 2], hip: 168, look: 0,
    hairC: C.hair, long: false, beard: false, bob: 1, outfit: 'bare', skin: SKIN, furC: FUR, coat: HIDE, coat2: HIDE2, shiver: 0, cover: true,
    holdL: null, holdR: null, front: null, armsFront: false, hat: null, furAmt: 1 }, o);
  const jit = o.shiver ? Math.sin(o.t * 46 + o.seed) * 4 * o.shiver : 0;
  const bob = Math.sin(o.t * 2.1 + o.seed * 1.7) * 2.2 * o.bob;
  const hy = -o.hip, sh = hy - 118 + bob, hc = sh - 68;
  const fitted = ['parka', 'otzi', 'beads'].includes(o.outfit), furry = o.outfit === 'fur';
  const legCol = o.outfit === 'otzi' ? '#8E6A3C' : o.outfit === 'beads' ? '#9C7A55' : o.coat2;
  const Ll = limb(-13, hy, o.ll[0], o.ll[1], 86, 86), Rl = limb(13, hy, o.rl[0], o.rl[1], 86, 86);
  let legs = '';
  for (const L of [Ll, Rl]) {
    if (fitted) legs += `<path d="${L.d}" fill="none" stroke="${C.ink}" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/><path d="${L.d}" fill="none" stroke="${legCol}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="${f1(L.e[0] + 8)}" cy="${f1(L.e[1] + 2)}" rx="22" ry="11" fill="#5E3A1A" ${S} stroke-width="4"/>`;
    else if (furry && o.furAmt > 0.3) legs += `<path d="${L.d}" fill="none" stroke="${C.ink}" stroke-width="${f1(7 + 15 * o.furAmt)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${L.d}" fill="none" stroke="${o.furC}" stroke-width="${f1(1 + 14 * o.furAmt)}" stroke-linecap="round" stroke-linejoin="round"/><path d="M${f1(L.e[0])} ${f1(L.e[1])} l17 0" ${S} stroke-width="7"/>`;
    else legs += `<path d="${L.d}" fill="none" ${S} stroke-width="6.5"/><path d="M${f1(L.e[0])} ${f1(L.e[1])} l17 0" ${S} stroke-width="7"/>`;
  }
  const torso = `M-34 ${f1(sh + 4)} Q0 ${f1(sh - 8)} 34 ${f1(sh + 4)} L30 ${hy + 8} Q0 ${hy + 22} -30 ${hy + 8} Z`;
  let body = '';
  if (o.outfit === 'bare' || o.outfit === 'hide' || o.outfit === 'cape' || (furry && o.furAmt < 1)) {
    body += `<path d="${torso}" fill="${o.skin}" ${S} stroke-width="4.5"/>`;
    if (o.cover && !furry) body += leafCover(hy + 2);
  }
  if (furry) {
    const a = clamp(o.furAmt);
    body += `<g opacity="${f1(a)}"><path d="M-44 ${f1(sh + 2)} Q0 ${f1(sh - 14)} 44 ${f1(sh + 2)} L40 ${hy + 16} Q0 ${hy + 30} -40 ${hy + 16} Z" fill="${o.furC}" ${S} stroke-width="4.5"/>` + furStrokes(-36, 36, sh + 10, hy + 6, 12, o.seed) + `</g>`;
    if (a < 0.5 && o.cover) body += leafCover(hy + 2);
  }
  if (o.outfit === 'hide') body += `<path d="M-40 ${f1(sh)} Q10 ${f1(sh - 10)} 40 ${f1(sh + 20)} L44 ${hy + 30} L20 ${hy + 22} L4 ${hy + 34} L-14 ${hy + 20} L-44 ${hy + 28} Z" fill="${o.coat}" ${S} stroke-width="4.5"/>` + furStrokes(-30, 30, sh + 20, hy + 10, 7, o.seed + 3, o.coat2);
  if (o.outfit === 'cape') body += `<path d="${smooth([[-62, sh - 4], [62, sh - 4], [74, hy + 26], [40, hy + 40], [0, hy + 30], [-40, hy + 42], [-74, hy + 26]])}" fill="#7C6656" ${S} stroke-width="4.5"/><path d="${smooth([[-66, sh + 6], [-30, sh - 16], [0, sh - 8], [30, sh - 16], [66, sh + 6], [40, sh + 22], [0, sh + 16], [-40, sh + 22]])}" fill="#E8DCCB" ${S} stroke-width="4"/>`;
  if (o.outfit === 'parka') body += `<path d="M-48 ${f1(sh)} Q0 ${f1(sh - 14)} 48 ${f1(sh)} L56 ${hy + 44} L-56 ${hy + 44} Z" fill="${o.coat}" ${S} stroke-width="4.5"/>` + stitches(`M0 ${f1(sh - 4)} V${hy + 40} M-50 ${hy + 20} H50`) + `<path d="M-58 ${hy + 40} Q0 ${hy + 58} 58 ${hy + 40}" fill="none" stroke="#F3EBDD" stroke-width="14" stroke-linecap="round"/>`;
  if (o.outfit === 'otzi') { body += `<path d="M-46 ${f1(sh)} Q0 ${f1(sh - 12)} 46 ${f1(sh)} L52 ${hy + 40} L-52 ${hy + 40} Z" fill="#C9A97A" ${S} stroke-width="4.5"/>`; for (let i = 0; i < 5; i++) body += `<rect x="${-44 + i * 18}" y="${f1(sh + 2)}" width="9" height="${f1(hy + 38 - sh)}" fill="#6E4A2E" opacity=".75"/>`; }
  if (o.outfit === 'beads') { body += `<path d="M-46 ${f1(sh)} Q0 ${f1(sh - 12)} 46 ${f1(sh)} L52 ${hy + 40} L-52 ${hy + 40} Z" fill="#A27A52" ${S} stroke-width="4.5"/>`; for (let r = 0; r < 9; r++) for (let k = 0; k < 7; k++) body += `<circle cx="${-36 + k * 12 + (r % 2) * 6}" cy="${f1(sh + 10 + r * 14)}" r="3.6" fill="#F7F1E3"/>`; }
  if (o.outfit === 'tunic') body += tunicSvg(sh - 4, hy + 18, C.tunic, o.seed);
  const La = limb(-31, sh + 10, o.la[0], o.la[1], 72, 70), Ra = limb(31, sh + 10, o.ra[0], o.ra[1], 72, 70);
  let arms = '';
  for (const A of [La, Ra]) {
    if (fitted) { const col = o.outfit === 'parka' ? o.coat : o.outfit === 'otzi' ? '#B08A5E' : '#A27A52'; arms += `<path d="${A.d}" fill="none" stroke="${C.ink}" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/><path d="${A.d}" fill="none" stroke="${col}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(A.e[0])}" cy="${f1(A.e[1])}" r="12" fill="${C.head}" ${S} stroke-width="4"/>`; }
    else if (furry && o.furAmt > 0.3) arms += `<path d="${A.d}" fill="none" stroke="${C.ink}" stroke-width="${f1(7 + 13 * o.furAmt)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${A.d}" fill="none" stroke="${o.furC}" stroke-width="${f1(1 + 12 * o.furAmt)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    else arms += `<path d="${A.d}" fill="none" ${S} stroke-width="6.5"/>`;
  }
  let head = '';
  if (furry && o.furAmt > 0.05) head += `<circle cx="0" cy="${f1(hc)}" r="${f1(58 + 20 * o.furAmt)}" fill="${o.furC}" opacity="${f1(clamp(o.furAmt * 1.4))}" ${S} stroke-width="4"/>`;
  if (o.outfit === 'parka') head += `<circle cx="0" cy="${f1(hc)}" r="84" fill="${o.coat}" ${S} stroke-width="5"/><circle cx="0" cy="${f1(hc)}" r="72" fill="none" stroke="#F3EBDD" stroke-width="16"/>`;
  head += `<circle cx="0" cy="${f1(hc)}" r="58" fill="${C.head}" ${S} stroke-width="5.5"/>`;
  let hb = '';
  if (o.beard) hb += `<path d="M-48 2 Q-50 64 0 76 Q50 64 48 2 Q34 38 0 44 Q-34 38 -48 2 Z" fill="${o.hairC}" ${S} stroke-width="4.5"/>`;
  if (o.outfit !== 'parka' && o.hat !== 'bear') hb += hairCave(o.seed * 7 + 3, o.hairC, o.long);
  hb += faceSvg(o.face, o.t, o.seed, o.look);
  if (o.hat === 'bear' || o.outfit === 'otzi') hb += `<path d="M-60 -18 Q-62 -96 0 -98 Q62 -96 60 -18 Q0 -36 -60 -18 Z" fill="#4E321C" ${S} stroke-width="4.5"/>` + furStrokes(-46, 46, -84, -30, 8, 9, '#2B1A0E') + `<circle cx="0" cy="-100" r="10" fill="#4E321C" ${S} stroke-width="3"/>`;
  if (o.shiver) hb += `<path d="M-90 -10 l-14 8 l14 8 M90 -10 l14 8 l-14 8" fill="none" stroke="#6FA8D8" stroke-width="5" stroke-linecap="round"/>`;
  head += g(`translate(0 ${f1(hc)})`, hb);
  const held = (o.holdL ? o.holdL(La.e) : '') + (o.holdR ? o.holdR(Ra.e) : '');
  const inner = legs + body + held + (o.armsFront ? head + arms : arms + head) + (o.front ? o.front(La.e, Ra.e) : '');
  return g(`translate(${f1(o.x + jit)} ${f1(o.y)}) scale(${o.flip ? -o.s : o.s} ${o.s})`, inner);
}
const hug = { la: [60, 130], ra: [-60, -130], armsFront: true };   // arms wrapped around the body (shivering)
function brr(x, y, t, t0 = 0) { return t < t0 ? '' : g(`translate(${x} ${y}) rotate(${f1(Math.sin(t * 30) * 4)})`, `<text font-family="Hand" font-size="72" fill="#4A8FE0" text-anchor="middle">BRRR</text>`); }
function needleSvg(s = 1, glow = 0) {
  return g(`scale(${s})`, (glow ? `<circle cx="-150" cy="0" r="${f1(40 + glow * 30)}" fill="#FFF3B0" opacity="${f1(0.6 * glow)}"/>` : '') + `<path d="M-170 -12 Q-190 0 -170 12 L170 3 Q190 0 170 -3 Z" fill="#EFE3C8" ${S} stroke-width="5"/><ellipse cx="-150" cy="0" rx="12" ry="5" fill="${C.ink}"/>`);
}
function louse(s = 1, t = 0, o = {}) {
  const w = Math.sin(t * 14) * 10;
  let legs = '';
  for (let i = 0; i < 3; i++) for (const k of [-1, 1]) legs += `<path d="M${k * 30} ${-14 + i * 22} q${k * 40} ${-10 + (i % 2 ? w : -w)} ${k * 60} 14" fill="none" ${S} stroke-width="6"/><circle cx="${k * 90}" cy="${0 + i * 22 + (i % 2 ? w : -w) * 0.3}" r="6" fill="${C.ink}"/>`;
  let b = legs + `<ellipse cx="0" cy="34" rx="44" ry="58" fill="${o.col || '#D9B98A'}" ${S} stroke-width="5"/>` + [0, 1, 2].map(i => `<path d="M-38 ${20 + i * 22} Q0 ${28 + i * 22} 38 ${20 + i * 22}" fill="none" stroke="#A88A5E" stroke-width="4"/>`).join('');
  b += `<ellipse cx="0" cy="-36" rx="30" ry="26" fill="${o.col || '#D9B98A'}" ${S} stroke-width="5"/><path d="M-14 -58 q-20 -30 -40 -30 M14 -58 q20 -30 40 -30" fill="none" ${S} stroke-width="5"/>`;
  b += `<circle cx="-12" cy="-40" r="6" fill="${C.ink}"/><circle cx="12" cy="-40" r="6" fill="${C.ink}"/>` + (o.smile ? `<path d="M-10 -26 Q0 -18 10 -26" fill="none" ${S} stroke-width="3.5"/>` : '');
  if (o.medal) b += `<path d="M-20 -6 L0 26 L20 -6" fill="none" stroke="#C0392B" stroke-width="8"/><circle cx="0" cy="40" r="22" fill="#F2C443" ${S} stroke-width="4"/>`;
  return g(`scale(${s})`, b);
}
function nit(x, y, s = 1) { return `<ellipse cx="${x}" cy="${y}" rx="${9 * s}" ry="${14 * s}" fill="#F3EBDD" ${S} stroke-width="3"/>`; }
function dnaStrand(x, y, w, t, o = {}) {
  let s = '', marks = o.marks || [];
  for (let i = 0; i <= 40; i++) {
    const xx = x + i * w / 40, a = i * 0.55 + t * 2, y1 = y + Math.sin(a) * 40, y2 = y - Math.sin(a) * 40;
    const hit = marks.find(m => m.i === i && t >= m.t);
    s += `<path d="M${f1(xx)} ${f1(y1)} L${f1(xx)} ${f1(y2)}" stroke="${hit ? C.red : (i % 2 ? '#7FB4D3' : '#F2C443')}" stroke-width="${hit ? 9 : 6}"/>`;
    if (hit) s += `<circle cx="${f1(xx)}" cy="${f1(y)}" r="14" fill="none" stroke="${C.red}" stroke-width="4"/>`;
  }
  let p1 = '', p2 = '';
  for (let i = 0; i <= 80; i++) { const xx = x + i * w / 80, a = i * 0.275 + t * 2; p1 += (i ? 'L' : 'M') + f1(xx) + ' ' + f1(y + Math.sin(a) * 40); p2 += (i ? 'L' : 'M') + f1(xx) + ' ' + f1(y - Math.sin(a) * 40); }
  return s + `<path d="${p1}" fill="none" ${S} stroke-width="6"/><path d="${p2}" fill="none" ${S} stroke-width="6"/>`;
}
function timeline(c, o, marks) {
  // 0 at left = 3 million years ago, right = today. Log-ish scale so recent events have room.
  const X = ya => 200 + 1520 * (1 - Math.log10(ya / 1000 + 1) / Math.log10(3001));
  let s = `<path d="M200 640 H1720" ${S} stroke-width="10"/><path d="M1720 610 L1760 640 L1720 670" fill="none" ${S} stroke-width="8"/>` + hand('3 MILLION YEARS AGO', 200, 730, 52, c.t, 0.1, { anchor: 'start' }) + hand('TODAY', 1720, 730, 56, c.t, 0.1, { anchor: 'end' });
  for (const m of marks) {
    if (c.t < m.t) continue;
    const x = X(m.ya), k = at0(c.t, m.t, 0.4);
    s += `<path d="M${f1(x)} 640 V${f1(640 - 120 * k)}" stroke="${m.col || C.accent}" stroke-width="7"/>` + `<circle cx="${f1(x)}" cy="640" r="14" fill="${m.col || C.accent}" ${S} stroke-width="4"/>` + hand(m.label, x, 640 - 150, 58, c.t, m.t + 0.1, { col: m.col || C.accent });
    if (m.sub) s += hand(m.sub, x, 640 - 215, 46, c.t, m.t + 0.2);
  }
  if (o.span != null && c.t >= o.span) {
    const x1 = X(1200000), x2 = X(170000), k = at0(c.t, o.span, 0.9);
    s += `<rect x="${f1(x1)}" y="560" width="${f1((x2 - x1) * k)}" height="40" rx="10" fill="#4A8FE0" opacity=".35"/>` + hand('NO FUR, NO CLOTHES', (x1 + x2) / 2, 860, 72, c.t, o.span + 0.4, { col: '#4A8FE0' });
  }
  return s;
}
function cluePin(n, x, y, t, t0, icon, active) {
  const inner = `<rect x="-170" y="-200" width="340" height="400" rx="16" fill="${active ? '#FFF6D6' : '#FFFFFF'}" ${S} stroke-width="${active ? 8 : 5}" transform="rotate(${n === 2 ? 2 : -3})"/><circle cx="0" cy="-200" r="16" fill="${C.red}" ${S} stroke-width="4"/>` + icon + hand(`CLUE ${n}`, 0, 150, 52, 1, DONE, { col: C.accent });
  return pop(x, y, t, t0, inner);
}

// ---------- 1. HOOK ----------
SCN.dressCheck = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E8DCCB"/><rect y="880" width="${W}" height="200" fill="#B9A58A"/><rect x="1400" y="160" width="360" height="560" rx="10" fill="#C9B79A" ${S} stroke-width="6"/><path d="M1580 160 V720" ${S} stroke-width="4"/><circle cx="1560" cy="450" r="8" fill="${C.ink}"/><circle cx="1600" cy="450" r="8" fill="${C.ink}"/>`;
  const look = o.look != null && c.t > o.look;
  s += person({ x: 860, y: 960, s: 1.45, kind: 'modern', t: c.t, seed: 4, face: look ? 'think' : 'happy', shortHair: true, hairC: '#3A2A1E', shirt: '#6F93BC', la: [-20, -10], ra: [20, 10], look: look ? -6 : 0 });
  const tags = [['SHIRT', o.a, 1150, 560, 960, 640], ['TROUSERS', o.b, 1150, 790, 900, 820], ['SOCKS', o.c, 520, 920, 830, 940]];
  tags.forEach(([n, t0, x, y, tx, ty]) => { if (t0 != null && c.t >= t0) s += arrow(x - (x > 960 ? 60 : -60), y, tx, ty, c.t, t0, 0.3) + pop(x, y - 10, c.t, t0, `<rect x="-120" y="-44" width="240" height="80" rx="14" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand(n, 0, 18, 48, 1, DONE, { col: C.accent })); });
  return s;
};
SCN.garmentRain = (c, o) => {
  let s = paper();
  const r = rng(5), shapes = [
    (col) => `<path d="M-40 -40 L-70 -20 L-56 4 L-40 -4 L-40 50 L40 50 L40 -4 L56 4 L70 -20 L40 -40 Q0 -20 -40 -40 Z" fill="${col}" ${S} stroke-width="4"/>`,
    (col) => `<path d="M-36 -50 H36 L40 50 H8 L0 -10 L-8 50 H-40 Z" fill="${col}" ${S} stroke-width="4"/>`,
    (col) => `<path d="M-14 -50 H14 V20 Q14 40 34 40 V54 H-14 Z" fill="${col}" ${S} stroke-width="4"/>`,
  ];
  const cols = ['#E05A4E', '#4A8FE0', '#F2C443', '#4F9A4A', '#B58FD0', '#2B2118', '#F28CA0', '#E07A1F'];
  for (let i = 0; i < 46; i++) {
    const x = 100 + r() * 1720, sp = 260 + r() * 260, ph = r() * 3, y = ((c.t * sp + ph * 400) % 1400) - 200, rot = c.t * 60 * (r() - 0.5) * 4;
    s += g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(.9)`, shapes[i % 3](cols[i % cols.length]));
  }
  const n = Math.round(1e11 * eout(clamp((c.t - 0.2) / Math.max(1, (o.until ?? c.d * 0.7)))));
  s += `<rect x="360" y="400" width="1200" height="260" rx="30" fill="${C.paper}" ${S} stroke-width="6" opacity=".95"/>`;
  s += `<text x="960" y="560" font-family="Hand" font-size="130" fill="${C.accent}" text-anchor="middle" letter-spacing="3">${n.toLocaleString('en-US')}+</text>` + hand(o.sub || 'NEW CLOTHES A YEAR', 960, 630, 56, c.t, 0.4);
  return s;
};
SCN.onlyAnimal = (c, o) => {
  let s = paper() + `<rect y="820" width="${W}" height="260" fill="#E0D6C4"/>`;
  const slots = [
    ['DOG', o.dog, 300, g('translate(0 -40)', dog(1.1, c.t))],
    ['CAT', o.cat, 640, g('translate(0 -60) scale(.9)', `<ellipse rx="70" ry="44" fill="#D98E4A" ${S} stroke-width="5"/><circle cx="-70" cy="-40" r="38" fill="#D98E4A" ${S} stroke-width="5"/><path d="M-96 -70 L-90 -100 L-74 -76 M-60 -76 L-48 -100 L-44 -70" fill="#D98E4A" ${S} stroke-width="4"/><circle cx="-82" cy="-44" r="5" fill="${C.ink}"/><circle cx="-58" cy="-44" r="5" fill="${C.ink}"/><path d="M66 -10 Q120 -60 100 -110" fill="none" stroke="#D98E4A" stroke-width="14" stroke-linecap="round"/>`)],
    ['CHIMP', o.chimp, 980, g('translate(0 30) scale(.55)', ape('chimp', c.t, {}))],
    ['BIRD', o.bird, 1300, g('translate(0 -80)', `<ellipse rx="54" ry="40" fill="#4A8FE0" ${S} stroke-width="5"/><circle cx="44" cy="-34" r="28" fill="#4A8FE0" ${S} stroke-width="5"/><path d="M70 -36 L100 -28 L70 -22 Z" fill="#F2C443" ${S} stroke-width="3"/><circle cx="50" cy="-40" r="5" fill="${C.ink}"/><path d="M-20 -10 Q-60 -60 -90 -20 Q-50 -10 -20 10 Z" fill="#3B6FB0" ${S} stroke-width="4"/><path d="M-10 40 v40 M10 40 v40" ${S} stroke-width="5"/>`)],
  ];
  slots.forEach(([n, t0, x, art]) => { s += g(`translate(${x} 830)`, art) + hand(n, x, 990, 46, c.t, 0); if (t0 != null && c.t >= t0) s += xmark(x, 700, 110, c.t, t0, 0.3); });
  s += person({ x: 1650, y: 960, s: 1.1, kind: 'modern', t: c.t, seed: 4, face: 'surprised', shortHair: true, hairC: '#3A2A1E', shirt: '#6F93BC' });
  if (o.you != null && c.t >= o.you) s += pop(1650, 380, c.t, o.you, `<circle r="60" fill="${C.green}" ${S} stroke-width="5"/><path d="M-26 0 L-6 22 L28 -22" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round"/>`) + hand('YOU', 1650, 290, 56, c.t, o.you, { col: C.green });
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.2);
  return s;
};
SCN.shiverGrab = (c, o) => {
  let s = bgSnow(c.t, {}) + snowfall(c.t, 60);
  const grab = o.grab ?? NEVER, k = at0(c.t, grab, 0.8);
  if (k < 1) s += g(`translate(${f1(lerp(1300, 980, k))} ${f1(lerp(960, 760, k))})`, `<path d="M-90 -20 Q-40 -50 20 -36 Q80 -40 100 0 Q60 40 0 30 Q-60 40 -90 -20 Z" fill="${HIDE}" ${S} stroke-width="5"/>` + furStrokes(-70, 80, -30, 20, 9, 4, HIDE2));
  s += fig({ x: 960, y: 980, s: 1.4, t: c.t, seed: 9, outfit: k >= 1 ? 'hide' : 'bare', face: k >= 1 ? 'happy' : 'scared', shiver: k >= 1 ? 0 : 1, ...(k >= 1 ? {} : hug) });
  if (k < 1) s += brr(1300, 380, c.t);
  else s += pop(1320, 380, c.t, grab + 0.8, hand('DONE!', 0, 0, 90, 1, DONE, { col: C.accent }));
  if (o.label) s += hand(o.label, 960, 150, 80, c.t, 0.2);
  return s;
};
SCN.rotHide = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#C9B07E"/><rect y="760" width="${W}" height="320" fill="#9C7A55"/>`;
  const p = clamp(c.t / Math.max(1.5, c.d * 0.85));
  const day = (c.t * 2) % 1; s += `<circle cx="${f1(200 + day * 1520)}" cy="${f1(260 - Math.sin(Math.PI * day) * 120)}" r="50" fill="${day < 0.5 ? '#F6B33C' : '#F3EBDD'}" opacity=".9"/>`;
  const fade = 1 - p;
  s += `<g opacity="${f1(Math.max(0.05, fade))}">` + g(`translate(960 820) scale(${f1(1 - p * 0.3)} ${f1(1 - p * 0.6)})`, `<path d="M-260 -40 Q-120 -100 40 -80 Q220 -90 270 0 Q160 80 0 60 Q-160 80 -260 -40 Z" fill="${HIDE}" ${S} stroke-width="6"/>` + furStrokes(-220, 220, -60, 40, 18, 7, HIDE2)) + `</g>`;
  for (let i = 0; i < 10; i++) if (p > i / 12) s += `<circle cx="${700 + (i * 61) % 520}" cy="${830 + (i * 37) % 60}" r="${6 + (i % 3) * 3}" fill="#7A5A3A" opacity=".6"/>`;
  s += hand(o.label || 'CLOTHES ROT', 960, 160, 96, c.t, 0.2) + (o.years ? hand(`${Math.round(p * o.years).toLocaleString('en-US')} YEARS`, 960, 260, 64, c.t, 0.3, { col: C.accent }) : '');
  return s;
};
SCN.teaseLouse = (c, o) => {
  let s = paper();
  const sway = Math.sin(c.t * 1.5) * 40;
  s += `<circle cx="${f1(900 + sway)}" cy="540" r="260" fill="#EAF4F7" ${S} stroke-width="12"/><path d="M${f1(1080 + sway)} 720 L${f1(1260 + sway)} 900" ${S} stroke-width="40"/>`;
  s += `<g filter="url(#soft)" opacity=".85">` + g(`translate(${f1(900 + sway)} 540)`, louse(1.1, c.t, {})) + `</g>` + `<circle cx="${f1(900 + sway)}" cy="540" r="250" fill="#EAF4F7" opacity=".55"/>`;
  s += pop(1460, 330, c.t, 0.6, questionMark(220, Math.sin(c.t * 3) * 8));
  if (o.label) s += hand(o.label, 960, 120, 76, c.t, 0.2);
  return s;
};
SCN.clueBoard = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#B9926A"/>` + [...Array(18)].map((_, i) => `<circle cx="${(i * 233) % 1920}" cy="${(i * 151) % 1080}" r="${4 + i % 3}" fill="#8E6A3C" opacity=".5"/>`).join('');
  const act = o.active || 0;
  const icons = [
    `<path d="M-90 -60 Q0 -110 90 -60 L90 60 Q0 100 -90 60 Z" fill="${SKIN}" ${S} stroke-width="5"/>` + [...Array(10)].map((_, i) => `<path d="M${-70 + i * 15} ${-30 + (i % 3) * 20} q4 -14 10 -20" fill="none" ${S} stroke-width="3"/>`).join(''),
    g('scale(.75) translate(0 -20)', louse(1, c.t, { smile: true })),
    g('rotate(-35)', needleSvg(0.55)),
  ];
  const names = ['YOUR SKIN', 'A TINY BUG', 'A NEEDLE'];
  [o.a, o.b, o.c].forEach((t0, i) => { if (t0 != null) { s += cluePin(i + 1, 480 + i * 480, 520, c.t, t0, g('translate(0 -50)', icons[i]), act === i + 1); s += hand(names[i], 480 + i * 480, 820, 56, c.t, t0 + 0.2, { col: '#FFFFFF' }); } });
  if (o.thread) s += `<path d="M480 340 Q720 260 960 340 T1440 340" fill="none" stroke="${C.red}" stroke-width="6" stroke-dasharray="${f1(1100 * at0(c.t, o.thread, 1.0))} 2000"/>`;
  s += hand(o.label || 'THREE CLUES', 960, 150, 90, c.t, 0.1, { col: '#FFFFFF' });
  return s;
};

// ---------- 2. CLUE 1: SKIN ----------
SCN.armHair = (c, o) => {
  let s = paper();
  // two arm close-ups: chimp (thick hair) and human (fine hairs)
  const arm = (x, col, hair, n, len, label, t0) => {
    let a = `<path d="M${x - 330} 430 Q${x} 380 ${x + 200} 440 L${x + 200} 630 Q${x} 680 ${x - 330} 640 Z" fill="${col}" ${S} stroke-width="6"/>` + `<path d="M${x + 196} 450 Q${x + 290} 420 ${x + 330} 470 L${x + 380} 470 Q${x + 400} 500 ${x + 370} 520 L${x + 330} 530 Q${x + 380} 560 ${x + 340} 600 Q${x + 280} 640 ${x + 196} 620 Z" fill="${col}" ${S} stroke-width="6"/>`;
    const r = rng(n);
    for (let i = 0; i < n; i++) { const hx = x - 300 + r() * 480, hy = 440 + r() * 180; a += `<path d="M${f1(hx)} ${f1(hy)} q${f1(len * 0.4)} ${f1(-len)} ${f1(len)} ${f1(-len * 1.1)}" fill="none" stroke="${hair}" stroke-width="${len > 30 ? 6 : 2.5}" stroke-linecap="round"/>`; }
    return pop(x, 0, c.t, t0, g(`translate(${-x} 0)`, a + hand(label, x, 780, 60, 1, DONE)));
  };
  s += arm(520, '#C9A88A', '#2B2118', 110, 48, 'CHIMP', o.chimp ?? 0.1) + arm(1400, SKIN, '#8A6A4A', 110, 14, 'YOU', o.you ?? 0.4);
  if (o.same != null && c.t >= o.same) s += pop(960, 900, c.t, o.same, `<rect x="-420" y="-56" width="840" height="100" rx="18" fill="#FFF6D6" ${S} stroke-width="5"/>` + hand(o.sameText || 'SAME NUMBER OF HAIRS!', 0, 18, 58, 1, DONE, { col: C.accent }));
  if (o.label) s += hand(o.label, 960, 170, 84, c.t, 0.1);
  return s;
};
SCN.follicles = (c, o) => {
  let s = paper();
  const panel = (x, label, thick) => {
    let p = `<rect x="${x - 360}" y="300" width="720" height="440" rx="20" fill="#F6DCC8" ${S} stroke-width="6"/><rect x="${x - 360}" y="300" width="720" height="90" rx="20" fill="#F1C9AE"/>`;
    for (let i = 0; i < 8; i++) { const fx = x - 300 + i * 86; p += `<path d="M${fx} 560 Q${fx - 10} 470 ${fx} 390" fill="none" ${S} stroke-width="4"/><ellipse cx="${fx}" cy="580" rx="16" ry="26" fill="#E8A08A" ${S} stroke-width="4"/>`;
      p += thick ? `<path d="M${fx} 390 Q${fx + 24} 300 ${fx + 60} 240" fill="none" stroke="#2B2118" stroke-width="9" stroke-linecap="round"/>` : `<path d="M${fx} 390 q6 -16 14 -24" fill="none" stroke="#8A6A4A" stroke-width="3.5" stroke-linecap="round"/>`; }
    return p + hand(label, x, 800, 58, 1, DONE);
  };
  s += pop(520, 0, c.t, 0.1, g('translate(-520 0)', panel(520, 'CHIMP SKIN', true))) + pop(1400, 0, c.t, o.you ?? 0.5, g('translate(-1400 0)', panel(1400, 'YOUR SKIN', false)));
  if (o.count != null) s += pop(960, 130, c.t, o.count, hand(o.countText || 'ABOUT THE SAME NUMBER OF FOLLICLES', 0, 0, 62, 1, DONE, { col: C.accent }));
  if (o.fine != null) s += pop(1400, 900, c.t, o.fine, hand('JUST TINY, FINE HAIRS', 0, 0, 52, 1, DONE, { col: C.red }));
  return s;
};
SCN.furFade = (c, o) => {
  let s = bgSavanna({ seed: 51 }) + acacia(1600, 640, 0.8);
  const p = clamp((c.t - (o.from ?? 0.3)) / Math.max(1, (o.dur ?? c.d * 0.8)));
  const amt = o.end != null ? lerp(1, o.end, eio(p)) : 1 - eio(p);
  s += fig({ x: 960, y: 980, s: 1.45, t: c.t, seed: 21, outfit: 'fur', furAmt: amt, face: o.face || 'neutral', beard: amt > 0.6 });
  const yrs = Math.round(lerp(3, 1.2, eio(p)) * 10) / 10;
  if (!o.nodate) s += g('translate(1500 260)', `<rect x="-240" y="-60" width="480" height="110" rx="18" fill="${C.paper}" ${S} stroke-width="5"/>` + hand(`${yrs.toFixed(1)} MILLION YEARS AGO`, 0, 18, 42, 1, DONE, { col: C.accent }));
  if (o.label) s += hand(o.label, 700, 160, 84, c.t, 0.2);
  return s;
};
SCN.heatRun = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F6D58A"/><rect y="640" width="${W}" height="440" fill="#E3B567"/>` + sun(1650, 200, 110, c.t, '#F28C28') + heatWaves(960, 560, c.t, 5, 160);
  const run = Math.sin(c.t * 11) * 34, x = 300 + ((c.t * 240) % 1500);
  s += acacia(1200, 640, 0.7) + acacia(400, 650, 0.5);
  s += fig({ x, y: 960, s: 1.25, t: c.t, seed: 12, outfit: o.fur ? 'fur' : 'bare', furAmt: o.fur ? 1 : 0, face: o.fur ? 'sick' : 'happy', ll: [-run, -run * 0.6], rl: [run, run * 0.6], la: [run, run * 0.8], ra: [-run, -run * 0.8], bob: 2 });
  if (o.fur) for (let i = 0; i < 4; i++) s += `<path d="M${f1(x - 60 + i * 40)} ${f1(560 - ((c.t * 120 + i * 40) % 160))} q10 -16 0 -32 q-10 -16 0 -32" fill="none" stroke="#E5532D" stroke-width="6" stroke-linecap="round" opacity=".7"/>`;
  if (o.sweat) for (let i = 0; i < 5; i++) { const ph = (c.t * 1.5 + i / 5) % 1; s += `<path d="M${f1(x - 70 + i * 34)} ${f1(560 + ph * 260)} q-10 18 0 26 q10 -8 0 -26 Z" fill="#7FC3EC" ${S} stroke-width="2.5" opacity="${f1(1 - ph)}"/>`; }
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.2);
  return s;
};
SCN.sweatGlands = (c, o) => {
  let s = paper();
  s += `<rect x="260" y="340" width="1400" height="320" rx="20" fill="#F6DCC8" ${S} stroke-width="6"/><rect x="260" y="340" width="1400" height="60" rx="20" fill="#F1C9AE"/>`;
  const r = rng(13), n = Math.round(46 * at0(c.t, o.grow ?? 0.2, 1.4));
  for (let i = 0; i < n; i++) { const x = 300 + r() * 1320, y = 460 + r() * 150; s += `<path d="M${f1(x)} ${f1(y)} q-14 10 0 20 q14 10 0 20 q-14 10 0 18" fill="none" stroke="#4A8FE0" stroke-width="4"/><path d="M${f1(x)} ${f1(y)} V402" stroke="#4A8FE0" stroke-width="3"/>`; const ph = (c.t * 0.8 + i * 0.13) % 1; s += `<path d="M${f1(x)} ${f1(390 - ph * 60)} q-8 12 0 18 q8 -6 0 -18 Z" fill="#7FC3EC" opacity="${f1(1 - ph)}"/>`; }
  s += hand(o.label || 'SWEAT GLANDS', 960, 200, 84, c.t, 0.1) + (o.sub ? hand(o.sub, 960, 290, 60, c.t, o.subT ?? 0.6, { col: C.accent }) : '');
  if (o.bars != null && c.t >= o.bars) {
    s += hand('CHIMP', 520, 760, 46, c.t, o.bars, { anchor: 'end' }) + `<rect x="560" y="725" width="${f1(110 * at0(c.t, o.bars, 0.6))}" height="50" rx="10" fill="#B9A58A" ${S} stroke-width="4"/>`;
    s += hand('HUMAN', 520, 850, 46, c.t, o.bars + 0.3, { anchor: 'end' }) + `<rect x="560" y="815" width="${f1(900 * at0(c.t, o.bars + 0.3, 0.9))}" height="50" rx="10" fill="#4A8FE0" ${S} stroke-width="4"/>` + hand('SWEAT GLANDS PER CM²', 1010, 930, 40, c.t, o.bars + 0.6, { col: C.accent });
  }
  return s;
};
SCN.coolBreeze = (c, o) => {
  let s = bgSavanna({ seed: 57 });
  s += fig({ x: 760, y: 980, s: 1.4, t: c.t, seed: 12, outfit: 'bare', face: 'happy' });
  for (let i = 0; i < 6; i++) { const p = (c.t * 0.9 + i / 6) % 1; s += `<path d="M${f1(300 + p * 800)} ${500 + i * 50} q60 -20 120 0 t120 0" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p))}"/>`; }
  for (let i = 0; i < 4; i++) { const p = (c.t * 0.7 + i / 4) % 1; s += `<path d="M${f1(800 + p * 200)} ${f1(560 - p * 140)} q10 -16 0 -32 q-10 -16 0 -32" fill="none" stroke="#E5532D" stroke-width="5" opacity="${f1((1 - p) * 0.8)}"/>`; }
  const temp = lerp(0.85, 0.4, at0(c.t, o.cool ?? 0.8, 1.6));
  s += g('translate(1400 560)', `<rect x="-36" y="-260" width="72" height="420" rx="36" fill="#FFFFFF" ${S} stroke-width="6"/><circle cx="0" cy="190" r="70" fill="#E5532D" ${S} stroke-width="6"/><rect x="-18" y="${f1(160 - 400 * temp)}" width="36" height="${f1(400 * temp)}" fill="#E5532D"/>`);
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.2);
  return s;
};
SCN.skinSun = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F6E3B8"/>` + sun(360, 240, 120, c.t, '#F6B33C');
  for (let i = 0; i < 7; i++) { const p = (c.t * 0.9 + i / 7) % 1; s += `<path d="M${f1(460 + p * 600)} ${f1(300 + p * 260 + i * 10)} l40 18" stroke="#F28C28" stroke-width="7" stroke-linecap="round" opacity="${f1(1 - p)}"/>`; }
  const fur = 1 - at0(c.t, o.bare ?? 0.3, 1.2), dark = at0(c.t, o.dark ?? NEVER, 1.6);
  const col = `rgb(${Math.round(lerp(232, 120, dark))},${Math.round(lerp(196, 82, dark))},${Math.round(lerp(160, 52, dark))})`;
  const x0 = 1180;
  s += `<path d="M${x0 - 330} 470 Q${x0} 420 ${x0 + 200} 480 L${x0 + 200} 690 Q${x0} 740 ${x0 - 330} 700 Z" fill="${col}" ${S} stroke-width="7"/>` + `<path d="M${x0 + 196} 490 Q${x0 + 290} 460 ${x0 + 330} 510 L${x0 + 380} 510 Q${x0 + 400} 540 ${x0 + 370} 560 L${x0 + 330} 570 Q${x0 + 380} 600 ${x0 + 340} 650 Q${x0 + 280} 690 ${x0 + 196} 670 Z" fill="${col}" ${S} stroke-width="7"/>`;
  const r = rng(3);
  for (let i = 0; i < 70; i++) { const x = x0 - 300 + r() * 480, y = 490 + r() * 180; s += `<path d="M${f1(x)} ${f1(y)} q14 -40 40 -56" fill="none" stroke="#3E2A1A" stroke-width="7" stroke-linecap="round" opacity="${f1(fur)}"/>`; }
  if (o.label) s += hand(o.label, 1310, 330, 72, c.t, o.labelT ?? 0.3, { col: C.accent });
  return s;
};
SCN.mc1r = (c, o) => {
  let s = paper();
  s += dnaStrand(260, 540, 1400, c.t, { marks: [{ i: 22, t: o.mark ?? 0.6 }] });
  s += pop(1180, 360, c.t, (o.mark ?? 0.6) + 0.2, `<rect x="-200" y="-50" width="400" height="90" rx="16" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('SKIN COLOUR GENE', 0, 16, 44, 1, DONE, { col: C.red }));
  s += hand(o.label || 'THE CHANGE IN OUR DNA', 960, 170, 80, c.t, 0.1) + (o.date != null ? hand('~1.2 MILLION YEARS AGO', 960, 820, 76, c.t, o.date, { col: C.accent }) : '');
  return s;
};
SCN.timelineClo = (c, o) => {
  let s = paper();
  const marks = [];
  if (o.fur != null) marks.push({ ya: 1200000, label: 'FUR GONE', sub: '~1.2 MILLION', t: o.fur });
  if (o.lice != null) marks.push({ ya: 170000, label: 'CLOTHES?', sub: '~170,000', t: o.lice, col: C.red });
  if (o.needle != null) marks.push({ ya: 45000, label: 'NEEDLES', sub: '~45,000', t: o.needle, col: C.green });
  s += timeline(c, o, marks);
  if (o.label) s += hand(o.label, 960, 160, 84, c.t, 0.1);
  return s;
};
SCN.bushLife = (c, o) => {
  let s = bgSavanna({ seed: 63 }) + acacia(1500, 650, 0.9);
  s += fig({ x: 760, y: 980, s: 1.3, t: c.t, seed: 31, outfit: 'bare', face: 'happy', la: [-150, -130], ra: [14, 6] });
  s += fig({ x: 1120, y: 990, s: 1.1, t: c.t, seed: 33, outfit: 'bare', long: true, face: 'laugh', flip: true });
  const items = [['NO SHIRTS', o.a, 360], ['NO SHOES', o.b, 620], ['NO PROBLEM', o.c, 900]];
  items.forEach(([n, t0, y]) => { if (t0 != null) s += pop(1560, y - 100, c.t, t0, `<rect x="-230" y="-50" width="460" height="92" rx="16" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand(n, 0, 18, 52, 1, DONE, { col: C.accent })); });
  return s;
};

// ---------- 3. CLUE 2: LICE ----------
SCN.louseHero = (c, o) => {
  let s = paper();
  const walk = Math.sin(c.t * 2) * 60;
  s += g(`translate(${f1(960 + walk)} 560) rotate(${f1(Math.sin(c.t * 4) * 4)})`, louse(2.6, c.t, { smile: !!o.smile, medal: !!o.medal }));
  if (o.size != null) s += pop(1500, 760, c.t, o.size, `<rect x="-220" y="-56" width="440" height="100" rx="16" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('ABOUT 3 MM', 0, 18, 56, 1, DONE, { col: C.accent }));
  if (o.label) s += hand(o.label, 960, 150, 90, c.t, o.labelT ?? 0.2, { col: o.medal ? C.accent : C.text });
  return s;
};
SCN.headLice = (c, o) => {
  let s = paper();
  s += g('translate(960 700) scale(4.4)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="2"/>` + hairCave(5, '#3A2A1E', false) + faceSvg('worried', c.t, 2));
  for (let i = 0; i < 3; i++) { const a = -2.3 + i * 0.8 + Math.sin(c.t * 2 + i) * 0.05; s += g(`translate(${f1(960 + Math.cos(a) * 290)} ${f1(700 + Math.sin(a) * 290)}) rotate(${f1(a * 57 + 90)})`, louse(0.5, c.t + i, {})); }
  s += hand(o.label || 'HEAD LICE', 960, 140, 90, c.t, 0.2) + (o.sub ? hand(o.sub, 1560, 560, 56, c.t, o.subT ?? 0.6, { col: C.accent }) : '');
  return s;
};
SCN.seamLice = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#C9D6E3"/>`;
  s += `<rect x="0" y="380" width="${W}" height="320" fill="#7FA3C4"/><path d="M0 540 H1920" stroke="#5C7E9E" stroke-width="16"/>` + stitches('M0 520 H1920 M0 560 H1920', '#F3EBDD');
  for (let i = 0; i < 40; i++) s += `<path d="M${i * 48} 380 l20 320" stroke="#6E92B4" stroke-width="3" opacity=".6"/>`;
  const eggs = Math.floor(8 * at0(c.t, o.eggs ?? NEVER, 1.2));
  for (let i = 0; i < eggs; i++) s += nit(400 + i * 140, 520 + (i % 2) * 40, 1.1);
  s += g(`translate(${f1(700 + Math.sin(c.t * 1.5) * 200)} 460) rotate(90)`, louse(0.9, c.t, {}));
  if (o.skin != null) s += pop(1500, 860, c.t, o.skin, `<rect x="-320" y="-56" width="640" height="100" rx="16" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('LIVES IN CLOTHES', 0, 18, 56, 1, DONE, { col: C.red }));
  s += hand(o.label || 'BODY LICE', 960, 170, 90, c.t, 0.2);
  return s;
};
SCN.licelogic = (c, o) => {
  let s = paper();
  const shirt = `<path d="M-80 -80 L-140 -40 L-110 10 L-80 -4 L-80 110 L80 110 L80 -4 L110 10 L140 -40 L80 -80 Q0 -40 -80 -80 Z" fill="#7FA3C4" ${S} stroke-width="6"/>`;
  s += pop(520, 540, c.t, o.a ?? 0.2, shirt) + hand('CLOTHES', 520, 760, 64, c.t, o.a ?? 0.2);
  s += arrow(720, 540, 1180, 540, c.t, o.arrow ?? 0.7, 0.5);
  s += pop(1400, 540, c.t, o.b ?? 1.1, louse(1.4, c.t, {})) + hand('BODY LICE', 1400, 760, 64, c.t, o.b ?? 1.1);
  if (o.no != null && c.t >= o.no) s += xmark(520, 540, 170, c.t, o.no, 0.3) + xmark(1400, 540, 170, c.t, o.no + 0.4, 0.3) + hand('NO CLOTHES = NO BODY LICE', 960, 920, 64, c.t, o.no + 0.6, { col: C.red });
  if (o.label) s += hand(o.label, 960, 170, 80, c.t, 0.1);
  return s;
};
SCN.louseDNA = (c, o) => {
  let s = paper();
  s += g('translate(300 380)', louse(0.9, c.t, {})) + hand('HEAD LOUSE', 300, 560, 44, c.t, 0.1);
  s += g('translate(300 780)', louse(0.9, c.t, { col: '#C9A97A' })) + hand('BODY LOUSE', 300, 960, 44, c.t, 0.2);
  const marks = [5, 12, 19, 27, 33].map((i, k) => ({ i, t: (o.diff ?? 0.8) + k * 0.25 }));
  s += dnaStrand(520, 400, 1200, c.t, {}) + dnaStrand(520, 800, 1200, c.t + 0.3, { marks });
  if (o.label) s += hand(o.label, 1120, 160, 76, c.t, 0.1);
  return s;
};
SCN.molClock = (c, o) => {
  let s = paper();
  const n = Math.floor(c.t / 0.9);
  const marks = [...Array(8)].map((_, k) => ({ i: 4 + k * 4, t: 0.9 * (k + 1) }));
  s += dnaStrand(200, 600, 1100, c.t, { marks });
  s += g('translate(1560 560)', clock(0, 0, 160, 3, (c.t * 120) % 60)) + `<text x="1560" y="820" font-family="Hand" font-size="64" fill="${C.accent}" text-anchor="middle">${n} CHANGES</text>`;
  s += hand(o.label || 'A MOLECULAR CLOCK', 960, 170, 84, c.t, 0.1);
  return s;
};
SCN.louseTree = (c, o) => {
  let s = paper();
  const k = at0(c.t, o.split ?? 0.4, 1.0);
  s += `<path d="M260 560 H${f1(260 + 600 * clamp(k * 2))}" ${S} stroke-width="10"/>`;
  if (k > 0.5) { const q = (k - 0.5) * 2; s += `<path d="M860 560 Q960 560 ${f1(860 + 600 * q)} ${f1(560 - 220 * q)}" fill="none" ${S} stroke-width="10"/><path d="M860 560 Q960 560 ${f1(860 + 600 * q)} ${f1(560 + 220 * q)}" fill="none" stroke="${C.red}" stroke-width="10"/>`; }
  s += pop(1560, 330, c.t, (o.split ?? 0.4) + 1.0, louse(0.7, c.t, {})) + hand('HEAD LICE', 1560, 470, 44, c.t, (o.split ?? 0.4) + 1.0);
  s += pop(1560, 780, c.t, (o.split ?? 0.4) + 1.1, louse(0.7, c.t, { col: '#C9A97A' })) + hand('BODY LICE', 1560, 920, 44, c.t, (o.split ?? 0.4) + 1.1, { col: C.red });
  if (o.date != null) s += pop(860, 760, c.t, o.date, `<circle r="20" fill="${C.red}" ${S} stroke-width="4"/>`) + hand(o.dateText || '~170,000 YEARS AGO', 860, 860, 60, c.t, o.date + 0.1, { col: C.red });
  if (o.label) s += hand(o.label, 960, 160, 80, c.t, 0.1);
  return s;
};
SCN.lab = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E7EEF0"/><rect y="760" width="${W}" height="320" fill="#C9D3D6"/><rect x="200" y="640" width="1520" height="40" fill="#9AA3A8" ${S} stroke-width="5"/>`;
  s += g('translate(560 600)', `<rect x="-40" y="-200" width="80" height="200" rx="10" fill="#DCEFF3" ${S} stroke-width="5"/><rect x="-60" y="-220" width="120" height="30" rx="8" fill="#5C6468" ${S} stroke-width="4"/>`);
  s += person({ x: 1100, y: 960, s: 1.2, kind: 'modern', shirt: '#FFFFFF', t: c.t, seed: 77, face: o.happy ? 'laugh' : 'think', shortHair: true, hairC: '#6A6A6A', la: [-120, -60], ra: [120, 60] });
  s += g('translate(880 560)', `<circle r="110" fill="#EAF4F7" ${S} stroke-width="8"/>` + louse(0.5, c.t, {}));
  if (o.label) s += hand(o.label, 960, 160, 76, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 250, 54, c.t, 0.5, { col: C.accent }) : '');
  return s;
};

// ---------- 4. ICE AGE ----------
SCN.iceGlobe = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#14203A"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${(i * 197) % 1920}" cy="${(i * 113) % 1080}" r="${1 + i % 3}" fill="#FFFFFF" opacity=".6"/>`;
  s += `<circle cx="960" cy="560" r="380" fill="#4A8FE0" ${S} stroke-width="7"/><path d="M700 380 Q760 320 860 360 Q900 460 820 520 Q740 560 700 480 Z M1000 300 Q1140 280 1220 380 Q1200 520 1100 560 Q1020 500 1000 420 Z M1040 640 Q1120 620 1160 720 Q1100 820 1040 760 Z" fill="#7FB46A" ${S} stroke-width="4"/>`;
  const k = at0(c.t, o.freeze ?? 0.3, 2.2);
  { let d = `M560 ${f1(330 + 230 * k)}`; for (let i = 1; i <= 16; i++) { const x = 560 + i * 50, y = 330 + 230 * k + Math.sin(i * 1.7) * 26 + (i % 2 ? 18 : -8); d += ` L${x} ${f1(y)}`; } d += ' L1360 140 L560 140 Z'; s += `<path d="${d}" fill="#F7FAFB" opacity=".95" clip-path="url(#globeclip)" ${S} stroke-width="4"/>`; }
  s = s.replace('<circle cx="960" cy="560" r="380"', '<defs><clipPath id="globeclip"><circle cx="960" cy="560" r="380"/></clipPath></defs><circle cx="960" cy="560" r="380"');
  s += hand(o.label || 'AN ICE AGE', 960, 1000, 80, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};
SCN.coldNight = (c, o) => {
  let s = bgSnow(c.t, {}) + snowfall(c.t, 90) + windLines(c.t, 300, 5);
  s += fig({ x: 760, y: 990, s: 1.35, t: c.t, seed: 9, outfit: o.outfit || 'bare', face: 'scared', shiver: 1, ...hug });
  s += fig({ x: 1160, y: 1000, s: 1.15, t: c.t, seed: 11, outfit: o.outfit || 'bare', long: true, face: 'scared', shiver: 1, flip: true, ...hug });
  s += brr(1500, 420, c.t);
  const temp = lerp(0.6, 0.15, at0(c.t, 0.3, 1.5));
  s += g('translate(1700 640)', `<rect x="-30" y="-220" width="60" height="340" rx="30" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="0" cy="150" r="56" fill="#4A8FE0" ${S} stroke-width="5"/><rect x="-14" y="${f1(130 - 320 * temp)}" width="28" height="${f1(320 * temp)}" fill="#4A8FE0"/>`);
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.2);
  return s;
};
SCN.hideSteps = (c, o) => {
  let s = paper();
  const steps = [
    ['SKIN IT', o.a, `<path d="M-90 -20 Q-40 -50 20 -36 Q80 -40 100 0 Q60 40 0 30 Q-60 40 -90 -20 Z" fill="${HIDE}" ${S} stroke-width="5"/>` + furStrokes(-70, 80, -30, 20, 9, 4, HIDE2)],
    ['SCRAPE IT', o.b, `<rect x="-110" y="-60" width="220" height="120" rx="10" fill="${HIDE}" ${S} stroke-width="5"/>` + g(`translate(${f1(Math.sin(c.t * 6) * 50)} -10) rotate(-30)`, `<rect x="-10" y="-80" width="20" height="110" rx="8" fill="#EFE3C8" ${S} stroke-width="4"/>`)],
    ['STRETCH & DRY', o.c, `<path d="M-120 -90 H120 V90 H-120 Z" fill="none" stroke="#8E6A3C" stroke-width="10"/><path d="M-100 -70 H100 V70 H-100 Z" fill="#D9B98A" ${S} stroke-width="4"/>` + [[-100, -70], [100, -70], [100, 70], [-100, 70]].map(([x, y]) => `<path d="M${x} ${y} L${x * 1.2} ${y * 1.28}" stroke="${C.ink}" stroke-width="3"/>`).join('')],
    ['SOFTEN IT', o.d, `<path d="M-100 -40 Q0 ${f1(-80 + Math.sin(c.t * 4) * 20)} 100 -40 Q120 40 0 60 Q-120 40 -100 -40 Z" fill="#E3C9A0" ${S} stroke-width="5"/>`],
  ];
  steps.forEach(([n, t0, art], i) => { const x = 300 + i * 440; if (t0 != null) { s += pop(x, 520, c.t, t0, art) + hand(`${i + 1}. ${n}`, x, 720, 48, c.t, t0 + 0.1, { col: C.accent }); if (i) s += arrow(x - 300, 520, x - 150, 520, c.t, t0 - 0.1, 0.3); } });
  if (o.stink != null) s += pop(960, 900, c.t, o.stink, hand('OR IT ROTS AND STINKS', 0, 0, 60, 1, DONE, { col: C.red }));
  s += hand(o.label || 'TURNING SKIN INTO CLOTHES', 960, 170, 76, c.t, 0.1);
  return s;
};

// ---------- 5. CLUE 3: TOOLS & NEEDLES ----------
SCN.boneTools = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#C9B79A"/><rect y="700" width="${W}" height="380" fill="#9C8A6A"/>`;
  const n = Math.round(12 * at0(c.t, o.tools ?? 0.3, 1.2));
  for (let i = 0; i < n; i++) s += g(`translate(${300 + (i % 6) * 240} ${380 + Math.floor(i / 6) * 180}) rotate(${-20 + (i * 37) % 40})`, `<path d="M-90 -14 Q-110 0 -90 14 L90 8 Q110 0 90 -8 Z" fill="#EFE3C8" ${S} stroke-width="4"/>`);
  if (o.scrape != null && c.t >= o.scrape) {
    s += `<rect x="560" y="760" width="800" height="220" rx="20" fill="${HIDE}" ${S} stroke-width="6"/>` + furStrokes(600, 1320, 790, 950, 16, 3, HIDE2);
    const sx = 960 + Math.sin(c.t * 6) * 260; s += g(`translate(${f1(sx)} 820) rotate(-25)`, `<path d="M-90 -14 Q-110 0 -90 14 L90 8 Q110 0 90 -8 Z" fill="#EFE3C8" ${S} stroke-width="5"/>`);
    for (let i = 0; i < 4; i++) s += `<circle cx="${f1(sx + 80 + i * 14)}" cy="${f1(860 - ((c.t * 200 + i * 30) % 80))}" r="5" fill="#E3C9A0"/>`;
  }
  s += hand(o.label || '62 BONE TOOLS', 960, 150, 84, c.t, 0.1) + (o.sub ? hand(o.sub, 960, 240, 58, c.t, o.subT ?? 0.5, { col: C.accent }) : '');
  return s;
};
SCN.furAnimals = (c, o) => {
  let s = paper();
  const an = (x, col, name, t0, ears) => pop(x, 520, c.t, t0, `<ellipse rx="150" ry="70" fill="${col}" ${S} stroke-width="5"/><circle cx="-150" cy="-50" r="56" fill="${col}" ${S} stroke-width="5"/><path d="M${ears}" fill="${col}" ${S} stroke-width="4"/><circle cx="-168" cy="-56" r="7" fill="${C.ink}"/><path d="M146 -10 Q230 -40 250 30" fill="none" stroke="${col}" stroke-width="26" stroke-linecap="round"/><path d="M-100 60 v70 M-40 64 v70 M40 64 v70 M100 60 v70" ${S} stroke-width="8"/>` + (o.cuts != null && c.t >= o.cuts ? `<path d="M-120 -40 Q0 -90 120 -40 M-120 40 Q0 80 120 40" fill="none" stroke="${C.red}" stroke-width="5" stroke-dasharray="12 9"/>` : '') + hand(name, 0, 210, 52, 1, DONE));
  s += an(360, '#D98E4A', 'FOX', o.fox ?? 0.2, '-190 -90 L-176 -150 L-150 -100 M-140 -100 L-120 -150 L-110 -96');
  s += an(960, '#C9A06A', 'JACKAL', o.jackal ?? 0.5, '-190 -90 L-180 -160 L-150 -100 M-140 -100 L-124 -160 L-110 -96');
  s += an(1560, '#9C8A6A', 'WILDCAT', o.cat ?? 0.8, '-190 -90 L-184 -136 L-156 -100 M-140 -100 L-130 -136 L-110 -96');
  if (o.fur != null) s += pop(960, 900, c.t, o.fur, `<rect x="-360" y="-60" width="720" height="110" rx="18" fill="#FFF6D6" ${S} stroke-width="5"/>` + hand('THEY WANTED THE FUR', 0, 18, 60, 1, DONE, { col: C.accent }));
  if (o.label) s += hand(o.label, 960, 150, 76, c.t, 0.1);
  return s;
};
SCN.needleHero = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#2B2420"/>` + `<circle cx="960" cy="540" r="460" fill="url(#fglow)" opacity=".5"/>`;
  const glow = at0(c.t, o.glow ?? 0.4, 0.8);
  s += g(`translate(960 540) rotate(${f1(-20 + Math.sin(c.t) * 4)})`, needleSvg(2.2, glow));
  if (o.thread != null && c.t >= o.thread) { const k = at0(c.t, o.thread, 1.0); s += `<path d="M${f1(240 + 0 * k)} 900 Q500 ${f1(820 - 200 * k)} 650 ${f1(700 - 40 * k)}" fill="none" stroke="#E05A4E" stroke-width="7" stroke-linecap="round" stroke-dasharray="${f1(900 * k)} 2000"/>`; }
  s += hand(o.label || 'THE NEEDLE', 960, 170, 110, c.t, o.labelT ?? 0.3, { col: '#FFE9A8' }) + (o.sub ? hand(o.sub, 960, 960, 60, c.t, o.subT ?? 0.8, { col: '#FFFFFF' }) : '');
  return s;
};
SCN.sewParka = (c, o) => {
  let s = paper();
  const parts = [o.body, o.sleeves, o.hood, o.trousers];
  const got = parts.map(t0 => t0 != null && c.t >= t0 + 0.5);
  const outfitNow = got[0] ? 'parka' : 'bare';
  // the figure gets dressed piece by piece; pieces fly in from the sides
  const fly = (t0, fromX, fromY, art) => { if (t0 == null || c.t < t0 || c.t >= t0 + 0.5) return ''; const k = eout((c.t - t0) / 0.5); return g(`translate(${f1(lerp(fromX, 960, k))} ${f1(lerp(fromY, 600, k))}) scale(${f1(lerp(1, 0.6, k))})`, art); };
  s += fig({ x: 960, y: 990, s: 1.45, t: c.t, seed: 19, outfit: got[1] || got[0] ? 'parka' : 'bare', coat: '#B98E5A', face: got[3] ? 'laugh' : 'happy' });
  if (got[0] && !got[1]) s += ''; // body only: drawn by fig as parka (sleeves included for simplicity)
  if (!got[2] && got[0]) s += ''; // hood drawn by parka outfit
  s += fly(o.body, 200, 300, `<rect x="-100" y="-120" width="200" height="240" rx="20" fill="#B98E5A" ${S} stroke-width="5"/>`);
  s += fly(o.sleeves, 1700, 300, `<rect x="-160" y="-30" width="320" height="60" rx="30" fill="#B98E5A" ${S} stroke-width="5"/>`);
  s += fly(o.hood, 960, -100, `<circle r="90" fill="#B98E5A" ${S} stroke-width="5"/><circle r="70" fill="${C.paper}"/>`);
  s += fly(o.trousers, 200, 1000, `<path d="M-60 -100 H60 L70 120 H20 L0 0 L-20 120 H-70 Z" fill="#8E6A3C" ${S} stroke-width="5"/>`);
  const labels = [['BODY', o.body, 400, 380], ['SLEEVES', o.sleeves, 1520, 380], ['HOOD', o.hood, 1520, 200], ['TROUSERS', o.trousers, 400, 820]];
  labels.forEach(([n, t0, x, y]) => { if (t0 != null && c.t >= t0) s += pop(x, y, c.t, t0, hand(n, 0, 0, 60, 1, DONE, { col: C.accent })); });
  if (o.stitch != null && c.t >= o.stitch) { const ph = (c.t * 2) % 1; s += g(`translate(${f1(900 + ph * 120)} ${f1(600 + Math.sin(ph * 6.28) * 30)}) rotate(20)`, needleSvg(0.35)); }
  if (o.label) s += hand(o.label, 960, 120, 76, c.t, 0.1);
  return s;
};
SCN.arcticWalk = (c, o) => {
  let s = bgSnow(c.t, {}) + snowfall(c.t, 50);
  const w = Math.sin(c.t * 6) * 18, x = 500 + ((c.t * 120) % 900);
  s += fig({ x, y: 980, s: 1.3, t: c.t, seed: 19, outfit: 'parka', coat: '#B98E5A', face: 'happy', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [w * 0.6, 10], ra: [-w * 0.6, -10] });
  s += fig({ x: x - 260, y: 990, s: 1.1, t: c.t, seed: 23, outfit: 'parka', coat: '#9C7A55', long: true, face: 'happy', ll: [w, w * 0.6], rl: [-w, -w * 0.6] });
  for (let i = 0; i < 8; i++) { const fx = x - 300 - i * 90; if (fx > 0) s += `<ellipse cx="${f1(fx)}" cy="${1000 + (i % 2) * 14}" rx="18" ry="8" fill="#D6E4EC"/>`; }
  if (o.label) s += hand(o.label, 960, 150, 80, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 240, 56, c.t, 0.5, { col: C.accent }) : '');
  return s;
};
SCN.capeVsParka = (c, o) => {
  let s = bgSnow(c.t, {}) + snowfall(c.t, 70) + windLines(c.t, 300, 4);
  s += `<path d="M960 0 V1080" stroke="#FFFFFF" stroke-width="10"/>`;
  s += fig({ x: 520, y: 990, s: 1.35, t: c.t, seed: 41, outfit: 'cape', face: 'worried', beard: true, hairC: '#6B4423', shiver: o.cold ? 0.6 : 0 });
  s += fig({ x: 1400, y: 990, s: 1.35, t: c.t, seed: 19, outfit: 'parka', coat: '#B98E5A', face: 'happy' });
  s += hand(o.l || 'DRAPED HIDES?', 520, 170, 64, c.t, o.lt ?? 0.2) + hand(o.r || 'FITTED CLOTHES', 1400, 170, 64, c.t, o.rt ?? 0.6, { col: C.green });
  if (o.wind != null && c.t >= o.wind) for (let i = 0; i < 3; i++) s += arrow(220, 560 + i * 80, 420, 600 + i * 70, c.t, o.wind + i * 0.15, 0.3, '#4A8FE0');
  return s;
};
SCN.toeBones = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#1E2C3E"/>`;
  const foot = (x, thick, label, t0) => {
    let f = `<path d="M-120 200 Q-160 -40 -80 -180 Q0 -260 80 -180 Q140 -60 120 200 Z" fill="none" stroke="#7FA3C4" stroke-width="5" opacity=".6"/>`;
    [[-70, -150], [-30, -190], [10, -200], [50, -190], [86, -160]].forEach(([tx, ty], i) => { const w = (i === 0 ? 30 : 18) * (thick || i === 0 ? 1 : 0.55); f += `<rect x="${tx - w / 2}" y="${ty}" width="${w}" height="60" rx="${w / 2}" fill="#EAF2F8" opacity=".9"/><rect x="${tx - w / 2}" y="${ty + 70}" width="${w}" height="70" rx="${w / 2}" fill="#EAF2F8" opacity=".9"/>`; });
    f += `<path d="M-80 0 L-40 120 M-30 -20 L0 120 M10 -20 L30 120 M50 -20 L60 120 M90 -10 L90 120" stroke="#EAF2F8" stroke-width="22" stroke-linecap="round" opacity=".85"/>`;
    return pop(x, 560, c.t, t0, f + hand(label, 0, 320, 52, 1, DONE, { col: '#FFFFFF' }));
  };
  s += foot(620, true, 'BAREFOOT', o.a ?? 0.2) + foot(1300, false, 'SHOE WEARER', o.b ?? 0.6);
  if (o.ring != null && c.t >= o.ring) s += `<ellipse cx="1300" cy="420" rx="120" ry="90" fill="none" stroke="${C.red}" stroke-width="8"/>` + hand('THINNER TOE BONES', 1300, 220, 56, c.t, o.ring + 0.2, { col: '#FFB0A8' });
  if (o.label) s += hand(o.label, 960, 120, 76, c.t, 0.1, { col: '#FFFFFF' });
  return s;
};

// ---------- 6. NOT JUST WARMTH ----------
SCN.fibres = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#101418"/><circle cx="960" cy="560" r="430" fill="#F4F1E8" ${S} stroke-width="14"/>`;
  const cols = [['#2B2118', 'BLACK', o.black], ['#8E8E8E', 'GREY', o.grey], ['#2EC4B6', 'TURQUOISE', o.turq], ['#F28CA0', 'PINK', o.pink]];
  for (let i = 0; i < 9; i++) { const y = 360 + i * 46; s += `<path d="M560 ${y} Q760 ${y - 30 + (i % 3) * 20} 960 ${y} T1360 ${y}" fill="none" stroke="#C9B08A" stroke-width="10" stroke-linecap="round"/>`; }
  cols.forEach(([col, n, t0], i) => { if (t0 != null && c.t >= t0) { const k = at0(c.t, t0, 0.6), y = 380 + i * 92; s += `<path d="M560 ${y} Q760 ${y - 20} 960 ${y} T1360 ${y}" fill="none" stroke="${col}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${f1(900 * k)} 2000"/>` + hand(n, 1560, y + 16, 54, c.t, t0, { col: col === '#2B2118' ? '#FFFFFF' : col, anchor: 'start' }); } });
  s += hand(o.label || 'FLAX FIBRES · ~30,000 YEARS', 960, 80, 64, c.t, 0.1, { col: '#FFFFFF' });
  return s;
};
SCN.capSkirt = (c, o) => {
  let s = paper();
  // a carved head with a woven cap (no body), and a string skirt hanging on a line
  s += pop(620, 520, c.t, o.cap ?? 0.2, `<rect x="-60" y="150" width="120" height="110" fill="#D9C08E" ${S} stroke-width="6"/><ellipse rx="170" ry="190" fill="#D9C08E" ${S} stroke-width="6"/>` + [...Array(6)].map((_, r) => [...Array(9)].map((_, k) => `<path d="M${-150 + k * 36} ${-170 + r * 36} q18 -14 36 0" fill="none" stroke="#8E6A3C" stroke-width="5"/>`).join('')).join('') + hand('A WOVEN CAP?', 0, 330, 52, 1, DONE, { col: C.accent }));
  if (o.skirt != null) { s += `<path d="M1100 300 H1700" ${S} stroke-width="5"/>`; s += pop(1400, 300, c.t, o.skirt, `<path d="M-160 20 H160" stroke="#8E6A3C" stroke-width="16" stroke-linecap="round"/>` + [...Array(14)].map((_, i) => `<path d="M${-150 + i * 23} 26 q${f1(Math.sin(c.t * 2 + i) * 8)} 120 ${f1(Math.sin(c.t * 2 + i) * 4)} 240" fill="none" stroke="#B98E5A" stroke-width="7" stroke-linecap="round"/>`).join('') + hand('A STRING SKIRT', 0, 380, 52, 1, DONE, { col: C.accent })); }
  if (o.label) s += hand(o.label, 960, 120, 70, c.t, 0.1);
  return s;
};
SCN.sungirBeads = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#2B2420"/>`;
  const n = Math.round(4000 * at0(c.t, o.beads ?? 0.3, Math.max(1.5, c.d * 0.6)));
  s += fig({ x: 760, y: 990, s: 1.6, t: c.t, seed: 61, outfit: 'beads', face: 'neutral', beard: true, hairC: '#3C2A1E' });
  const r = rng(8);
  for (let i = 0; i < Math.min(220, n / 18); i++) s += `<circle cx="${f1(1180 + r() * 560)}" cy="${f1(320 + r() * 560)}" r="6" fill="#F7F1E3" opacity=".9"/>`;
  s += `<text x="1460" y="260" font-family="Hand" font-size="110" fill="#FFE9A8" text-anchor="middle">${n.toLocaleString('en-US')}</text>` + hand('IVORY BEADS', 1460, 960, 60, c.t, 0.4, { col: '#FFFFFF' });
  if (o.label) s += hand(o.label, 760, 120, 64, c.t, 0.1, { col: '#FFFFFF' });
  return s;
};
SCN.beadHours = (c, o) => {
  let s = paper();
  const h = Math.round((o.hours || 1000) * at0(c.t, 0.4, 1.6));
  s += g('translate(620 560)', clock(0, 0, 220, (c.t * 8) % 12, (c.t * 400) % 60));
  s += `<text x="1300" y="540" font-family="Hand" font-size="140" fill="${C.accent}" text-anchor="middle">${h.toLocaleString('en-US')}+</text>` + hand('HOURS OF WORK', 1300, 640, 64, c.t, 0.5);
  if (o.label) s += hand(o.label, 960, 160, 76, c.t, 0.1);
  return s;
};
SCN.shellBeads = (c, o) => {
  let s = paper();
  s += `<path d="M300 420 Q960 760 1620 420" fill="none" stroke="#8E6A3C" stroke-width="6"/>`;
  for (let i = 0; i < 9; i++) { const p = i / 8, x = 300 + p * 1320, y = 420 + Math.sin(Math.PI * p) * 250; s += pop(x, y, c.t, 0.2 + i * 0.12, `<path d="M-40 -30 Q0 -60 40 -30 Q50 20 0 40 Q-50 20 -40 -30 Z" fill="#F3E3C8" ${S} stroke-width="4"/><circle cy="-10" r="10" fill="${C.paper}" ${S} stroke-width="3"/><path d="M-26 0 Q0 16 26 0" fill="none" stroke="#C9A97A" stroke-width="3"/>`); }
  s += hand(o.label || 'SHELL BEADS', 960, 160, 84, c.t, 0.1) + (o.sub ? hand(o.sub, 960, 880, 64, c.t, o.subT ?? 0.6, { col: C.accent }) : '');
  return s;
};
SCN.tribes = (c, o) => {
  let s = bgSavanna({ seed: 71 });
  const groups = [[420, '#B9473A', 'zig'], [960, '#3E5C8A', 'dots'], [1500, '#4F9A4A', 'stripes']];
  groups.forEach(([x, col, pat], gi) => {
    for (let k = 0; k < 3; k++) {
      const px = x - 140 + k * 140;
      s += fig({ x: px, y: 980 + (k % 2) * 14, s: 0.8, t: c.t, seed: 80 + gi * 5 + k, outfit: 'hide', coat: col, coat2: '#FFFFFF', face: 'happy', long: k === 1 });
    }
    if (o.ring != null && c.t >= o.ring + gi * 0.3) s += `<ellipse cx="${x}" cy="820" rx="250" ry="230" fill="none" stroke="${col}" stroke-width="7" stroke-dasharray="14 10"/>`;
  });
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.2);
  return s;
};

// ---------- 7. ÖTZI ----------
SCN.otziDress = (c, o) => {
  let s = bgSnow(c.t, { seed: 207 });
  const has = k => o[k] != null && c.t >= o[k];
  const outfit = has('coat') ? 'otzi' : 'tunic';
  s += fig({ x: 760, y: 990, s: 1.55, t: c.t, seed: 21, outfit: has('coat') || has('legs') ? 'otzi' : 'bare', hat: has('hat') ? 'bear' : null, face: 'neutral', beard: true, hairC: '#3C2A1E' });
  const tags = [['hat', 'BEAR FUR HAT', 300], ['coat', 'SHEEP & GOAT COAT', 420], ['legs', 'GOATSKIN LEGGINGS', 540], ['shoes', 'BEARSKIN SOLES', 660], ['laces', 'CATTLE-LEATHER LACES', 780], ['quiver', 'DEERSKIN QUIVER', 900]];
  tags.forEach(([k, n, y]) => { if (has(k)) s += pop(1400, y, c.t, o[k], `<rect x="-330" y="-46" width="660" height="84" rx="16" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand(n, 0, 16, 46, 1, DONE, { col: C.accent })); });
  if (has('count')) s += pop(1400, 170, c.t, o.count, hand('5+ ANIMALS!', 0, 0, 80, 1, DONE, { col: C.red }));
  if (o.label) s += hand(o.label, 760, 120, 70, c.t, 0.1);
  return s;
};
SCN.oldShoe = (c, o) => {
  let s = paper();
  s += g('translate(960 600) scale(1.6)', `<path d="M-220 40 Q-240 -40 -160 -70 Q-60 -90 40 -60 Q160 -40 220 10 Q230 60 160 70 L-180 70 Q-230 70 -220 40 Z" fill="#9C6A3E" ${S} stroke-width="6"/>` + [...Array(6)].map((_, i) => `<circle cx="${-120 + i * 46}" cy="${-62 + (i % 2) * 6}" r="7" fill="${C.ink}"/>`).join('') + `<path d="M-120 -62 L-74 -56 L-28 -62 L18 -56 L64 -62 L110 -56" fill="none" stroke="#5E3A1A" stroke-width="5"/>` + (o.grass != null && c.t >= o.grass ? `<path d="M-160 -70 q-10 -60 10 -90 M-130 -70 q0 -70 20 -96 M-100 -72 q10 -60 30 -80" fill="none" stroke="#C9B04A" stroke-width="7" stroke-linecap="round"/>` : ''));
  s += hand(o.label || 'ARENI-1 CAVE, ARMENIA', 960, 160, 70, c.t, 0.1) + hand(o.sub || '~5,500 YEARS OLD', 960, 260, 60, c.t, 0.4, { col: C.accent });
  if (o.size != null) s += pop(1560, 860, c.t, o.size, `<circle r="110" fill="#FFF6D6" ${S} stroke-width="5"/>` + hand('SIZE', 0, -20, 44, 1, DONE) + hand('37', 0, 50, 80, 1, DONE, { col: C.red }));
  return s;
};
SCN.sandals = (c, o) => {
  let s = paper();
  for (const x of [700, 1220]) s += g(`translate(${x} 600) rotate(${x > 960 ? 8 : -8})`, `<ellipse rx="150" ry="300" fill="#C9A06A" ${S} stroke-width="6"/>` + [...Array(10)].map((_, i) => `<path d="M-130 ${-250 + i * 52} Q0 ${-230 + i * 52} 130 ${-250 + i * 52}" fill="none" stroke="#8E6A3C" stroke-width="5"/>`).join('') + `<path d="M-140 -120 Q0 -40 140 -120" fill="none" stroke="#5E3A1A" stroke-width="10"/>`);
  s += hand(o.label || 'FORT ROCK SANDALS, OREGON', 960, 150, 70, c.t, 0.1) + hand(o.sub || '~10,000 YEARS', 960, 990, 60, c.t, 0.4, { col: C.accent });
  return s;
};

// ---------- 8. ENDING ----------
SCN.recap = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#B9926A"/>`;
  const items = [[o.a, 'LOST OUR FUR', 'TO KEEP COOL', SKIN], [o.b, 'GOT COLD', 'ICE AGE', '#CBE5F2'], [o.c, 'GOT DRESSED', 'AND STYLISH', '#F28CA0']];
  items.forEach(([t0, a, b, col], i) => { if (t0 != null) { const x = 400 + i * 560; s += pop(x, 540, c.t, t0, `<rect x="-220" y="-180" width="440" height="360" rx="20" fill="#FFFFFF" ${S} stroke-width="6"/><circle cy="-80" r="56" fill="${col}" ${S} stroke-width="5"/>` + hand(a, 0, 40, 54, 1, DONE) + hand(b, 0, 110, 44, 1, DONE, { col: C.accent })); if (i) s += arrow(x - 330, 540, x - 230, 540, c.t, t0 - 0.1, 0.3, '#FFFFFF'); } });
  if (o.label) s += hand(o.label, 960, 160, 84, c.t, 0.1, { col: '#FFFFFF' });
  return s;
};
SCN.morning = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F6E8D6"/><rect y="880" width="${W}" height="200" fill="#C9B79A"/><rect x="1160" y="200" width="160" height="200" fill="#BFDDEA" ${S} stroke-width="6"/>` + sun(1240, 280, 40, c.t, '#F6B33C');
  const open = at0(c.t, o.open ?? 0.3, 0.6);
  s += `<rect x="260" y="180" width="600" height="700" rx="10" fill="#C9A06A" ${S} stroke-width="6"/><rect x="290" y="210" width="540" height="640" fill="#8E6A3C"/>`;
  const cols = ['#E05A4E', '#4A8FE0', '#F2C443', '#4F9A4A', '#B58FD0', '#2B2118'];
  cols.forEach((col, i) => { s += `<path d="M${330 + i * 85} 260 v30" ${S} stroke-width="4"/><path d="M${300 + i * 85} 300 L${330 + i * 85} 290 L${360 + i * 85} 300 L${360 + i * 85} 520 L${300 + i * 85} 520 Z" fill="${col}" ${S} stroke-width="4"/>`; });
  s += `<path d="M260 180 L${f1(260 - 260 * open)} ${f1(220)} L${f1(260 - 260 * open)} 840 L260 880 Z" fill="#B98E5A" ${S} stroke-width="6"/><path d="M860 180 L${f1(860 + 200 * open)} 220 L${f1(860 + 200 * open)} 840 L860 880 Z" fill="#B98E5A" ${S} stroke-width="6"/>`;
  s += person({ x: 1500, y: 960, s: 1.35, kind: 'modern', t: c.t, seed: 4, face: o.face || 'think', shortHair: true, hairC: '#3A2A1E', shirt: '#E8E2D6', flip: true, la: [-14, -6], ra: [150, -150], armsFront: true });
  if (o.timer != null) s += pop(1500, 260, c.t, o.timer, `<rect x="-200" y="-60" width="400" height="110" rx="18" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('2 MINUTES', 0, 22, 64, 1, DONE, { col: C.accent }));
  return s;
};
SCN.series = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#14203A"/>`;
  const eps = ['NO FRIDGE?', 'NO DOCTOR?', 'NO BED?', 'NO SCHOOL?', 'NO TEMPLE?', 'NO KINGS?', 'NO WEDDING?', 'NO PHONE?', 'NO CLOTHES?'];
  eps.forEach((e, i) => { const x = 300 + (i % 3) * 660, y = 300 + Math.floor(i / 3) * 260; s += pop(x, y, c.t, 0.15 + i * 0.12, `<rect x="-290" y="-110" width="580" height="210" rx="18" fill="${i === 8 ? '#FFE45C' : '#FFFFFF'}" ${S} stroke-width="6"/>` + hand(e, 0, 22, 70, 1, DONE, { col: i === 8 ? C.red : C.text })); });
  if (o.label) s += hand(o.label, 960, 90, 56, c.t, 0.3, { col: '#FFE9A8' });
  return s;
};
SCN.nakedVsDressed = (c, o) => {
  let s = `<defs><clipPath id="nl"><rect width="960" height="1080"/></clipPath><clipPath id="nr"><rect x="960" width="960" height="1080"/></clipPath></defs>`;
  s += `<g clip-path="url(#nl)">` + bgSavanna({ seed: 91 }) + fig({ x: 480, y: 980, s: 1.2, t: c.t, seed: 31, outfit: 'bare', face: 'happy' }) + `</g>`;
  s += `<g clip-path="url(#nr)"><rect width="1920" height="1080" fill="#F6E8D6"/><rect y="880" width="1920" height="200" fill="#C9B79A"/>` + person({ x: 1440, y: 960, s: 1.2, kind: 'modern', t: c.t, seed: 4, face: 'happy', shortHair: true, hairC: '#3A2A1E', shirt: '#6F93BC' }) + `</g>`;
  s += `<path d="M960 0 V1080" stroke="#FFFFFF" stroke-width="12"/><path d="M960 0 V1080" ${S} stroke-width="3"/>`;
  if (o.l) s += hand(o.l, 480, 150, 70, c.t, 0.2);
  if (o.r) s += hand(o.r, 1440, 150, 70, c.t, o.rt ?? 0.5, { col: C.accent });
  return s;
};

// Extra card icons: needle, louse, shirt.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'needle') return g('rotate(-35)', needleSvg(0.55));
    if (name === 'louse') return g('scale(.8)', louse(1, t, { smile: true }));
    if (name === 'shirt') return `<path d="M-80 -80 L-140 -40 L-110 10 L-80 -4 L-80 110 L80 110 L80 -4 L110 10 L140 -40 L80 -80 Q0 -40 -80 -80 Z" fill="#7FA3C4" ${S} stroke-width="6"/>`;
    return ic(name, t);
  };
})();
