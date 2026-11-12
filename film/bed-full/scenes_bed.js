// Scenes for "How Did Ancient Humans Sleep Without Beds?". Builds on the fridge and doctor libraries.
'use strict';

Object.assign(PLACES, {
  bordercave: [31.99, -27.02], sibudu: [31.0, -29.52], ohalo: [35.57, 32.73], bolivia: [-66.0, -14.8], colorado: [-105.6, 40.3],
  orkney: [-3.34, 59.05], egypt: [31.2, 27.5], namibia: [20.5, -19.6],
  swartkrans: [27.72, -26.02], uganda: [30.4, 0.9], wonderwerk: [23.55, -27.85], madagascar: [46.9, -18.8],
});
Object.assign(REGIONS, {
  bordercave: { center: [28, -28], scale: 2600, hl: ['South Africa'] },
  sibudu: { center: [28, -28.5], scale: 2600, hl: ['South Africa'] },
  ohalo: { center: [35.5, 32], scale: 9000, hl: ['Israel'] },
  bolivia: { center: [-64, -16], scale: 1700, hl: ['Bolivia'] },
  colorado: { center: [-105.5, 39], scale: 3200, hl: ['United States of America'] },
  orkney: { center: [-3.5, 57.5], scale: 3200, hl: ['United Kingdom'] },
  egypt: { center: [30.5, 27], scale: 2000, hl: ['Egypt'] },
  namibia: { center: [19, -21], scale: 2000, hl: ['Namibia'] },
  swartkrans: { center: [26, -28.5], scale: 2400, hl: ['South Africa'] },
  uganda: { center: [32, 1.2], scale: 3200, hl: ['Uganda'] },
  wonderwerk: { center: [25, -29], scale: 2400, hl: ['South Africa'] },
  madagascar: { center: [46.5, -19], scale: 2200, hl: ['Madagascar'] },
});

// A person lying down (side view). dir 1 = head on the left.
function lying(x, y, s = 1, o = {}) {
  o = Object.assign({ face: 'sleep', t: 0, seed: 2, col: C.tunic, kind: 'cave', hairC: C.hair, long: false }, o);
  const tod = o.kind === 'today';
  const body = tod ? TODAY_SHIRTS[o.seed % 6] : o.col;
  const bl = o.blanket === undefined ? (tod ? ['#B85C3A', '#3E7FA6', '#D9A23C', '#7A4E8A'][o.seed % 4] : '#A8743E') : o.blanket;
  const br = Math.sin(o.t * 1.6 + o.seed) * 3;
  const L = `stroke="${C.ink}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  let b = '';
  b += `<path d="M360 14 Q440 4 500 12 L590 22 M360 44 Q450 44 510 44 L596 48" ${L}/><path d="M590 22 l10 -28 M596 48 l12 -26" ${L}/>`;
  b += `<path d="M120 -28 Q240 ${f1(-50 - br)} 370 -22 Q392 20 370 58 Q240 66 120 56 Q100 12 120 -28 Z" fill="${body}" ${S} stroke-width="6"/>`;
  if (bl) {
    b += `<path d="M300 ${f1(-36 - br * 0.5)} Q460 -62 600 -8 Q622 36 600 66 Q460 80 300 68 Q280 16 300 ${f1(-36 - br * 0.5)} Z" fill="${bl}" ${S} stroke-width="6"/>`;
    if (!tod) { let fr = ''; for (let i = 0; i < 9; i++) fr += `M${330 + i * 30} ${-20 + (i % 3) * 22} l12 -10 `; b += `<path d="${fr}" stroke="#7A5228" stroke-width="4" stroke-linecap="round"/>`; }
    else b += `<path d="M320 10 Q460 -10 590 20" fill="none" stroke="#FFFFFF" stroke-width="6" opacity=".6"/>`;
    b += `<path d="M606 4 l14 -22 M610 44 l16 -18" ${L}/>`;
  }
  b += `<path d="M160 -22 Q230 -44 270 -6 L300 18" ${L}/>`;
  let h = `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>`;
  if (o.kind === 'cave') h += hairCave(o.seed * 7 + 3, o.hairC, o.long);
  else if (tod) h += o.long ? hairCave(o.seed * 7 + 3, '#2B2118', true) : `<path d="M-56 -8 Q-62 -66 -10 -66 Q50 -70 58 -10 Q44 -40 0 -44 Q-40 -42 -56 -8 Z" fill="#2B2118" ${S} stroke-width="4"/>`;
  h += faceSvg(o.face, o.t, o.seed);
  b = g(`translate(70 ${f1(-14 + br * 0.4)}) rotate(-14)`, h) + b;
  b = `<ellipse cx="80" cy="44" rx="70" ry="18" fill="${C.ink}" opacity=".12"/>` + b;
  return g(`translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})`, b);
}
function zzz(x, y, t, s = 1) {
  let o = '';
  for (let i = 0; i < 3; i++) { const p = (t * 0.5 + i / 3) % 1; o += `<text x="${f1(x + p * 80 * s)}" y="${f1(y - p * 160 * s)}" font-family="Hand" font-size="${f1((50 + i * 10) * s)}" fill="#FFFFFF" stroke="${C.ink}" stroke-width="${f1(4 * s)}" paint-order="stroke" opacity="${f1(Math.sin(Math.PI * p))}">z</text>`; }
  return o;
}
function mosquito(x, y, s, t, i, away = 0) {
  const w = Math.sin(t * 50 + i) > 0 ? 1 : 0.6;
  return g(`translate(${f1(x)} ${f1(y)}) scale(${s})`, `<path d="M0 0 L40 6" ${S} stroke-width="3"/><ellipse cx="-4" cy="-10" rx="${f1(14 * w)}" ry="5" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2" transform="rotate(-30)"/><ellipse cx="6" cy="-10" rx="${f1(14 * w)}" ry="5" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2" transform="rotate(30)"/><ellipse rx="14" ry="5" fill="#3C3330"/><path d="M-6 4 l-10 16 M2 5 l-4 18 M8 4 l6 16" ${S} stroke-width="2"/>`);
}
function leaf(x, y, a, s = 1, col = '#5E8A3C') { return g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${s})`, `<path d="M-46 0 Q0 -26 46 0 Q0 26 -46 0 Z" fill="${col}" ${S} stroke-width="3.5"/><path d="M-40 0 H40" stroke="#3E6A2A" stroke-width="2.5"/>`); }
function grassMat(x0, x1, y, t, seed = 3, col = '#D9C27A') {
  const r = rng(seed); let p = '';
  for (let i = 0; i < 140; i++) { const x = x0 + r() * (x1 - x0), yy = y + r() * 40; p += `M${f1(x)} ${f1(yy)} q${f1(20 + r() * 30)} ${f1(-6 - r() * 8)} ${f1(50 + r() * 50)} ${f1(-2 + r() * 6)} `; }
  return `<path d="M${x0} ${y + 46} Q${(x0 + x1) / 2} ${y - 20} ${x1} ${y + 46} Z" fill="${col}" ${S} stroke-width="5"/><path d="${p}" fill="none" stroke="#A8913E" stroke-width="3" stroke-linecap="round"/>`;
}

// ----- modern -----
SCN.modernBed = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#273049"/><rect y="860" width="${W}" height="220" fill="#3E3A3C"/>`;
  s += `<rect x="140" y="140" width="440" height="420" fill="#1B2440" stroke="#5C5048" stroke-width="16"/><path d="M140 140 h440 v420 h-440 Z" fill="none"/><rect x="120" y="120" width="160" height="470" fill="#4A3A5C"/><rect x="440" y="120" width="160" height="470" fill="#4A3A5C"/>`;
  s += `<rect x="560" y="640" width="1100" height="200" rx="20" fill="#E6E2DA" ${S} stroke-width="6"/><rect x="560" y="700" width="1100" height="60" fill="#C9C4BC"/><path d="M560 840 V920 M1660 840 V920" ${S} stroke-width="14"/><rect x="1580" y="420" width="60" height="420" rx="10" fill="#7A5A3A" ${S} stroke-width="5"/>`;
  s += `<rect x="600" y="560" width="260" height="100" rx="40" fill="#FFFFFF" ${S} stroke-width="5"/>`;
  s += `<path d="M820 600 Q1100 520 1560 600 Q1600 680 1560 700 Q1100 720 820 700 Z" fill="#6F8FB5" ${S} stroke-width="6"/>`;
  const awake = !!o.awake;
  s += g('translate(730 560) rotate(-6)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + faceSvg(awake ? 'tired' : 'sleep', c.t, 3));
  if (awake) { s += `<path d="M800 540 L1000 380 L1060 450 Z" fill="#9FD3FF" opacity=".25"/><rect x="980" y="380" width="70" height="120" rx="10" fill="#1C2742" ${S} stroke-width="4" transform="rotate(20 1015 440)"/><rect x="988" y="390" width="54" height="96" rx="6" fill="#9FD3FF" transform="rotate(20 1015 440)"/>`; }
  else s += zzz(820, 480, c.t);
  s += g('translate(1780 800)', `<rect x="-70" y="-50" width="140" height="70" rx="12" fill="#1C1A18" ${S} stroke-width="4"/><text x="0" y="0" font-family="Cap" font-size="40" fill="#E0505A" text-anchor="middle">${o.time || '01:47'}</text>`);
  if (o.dark) s += `<rect width="${W}" height="${H}" fill="#0B1022" opacity=".55"/>`;
  return s;
};
SCN.sleepStats = (c, o) => {
  let s = paper();
  for (let i = 0; i < 3; i++) s += pop(660 + i * 300, 720, c.t, 0.1 + i * 0.15, `<g opacity="${i === 2 ? 1 : 0.45}">${g('scale(.75)', person({ x: 0, y: 0, kind: 'modern', t: c.t, seed: 3 + i, face: i === 2 ? 'tired' : 'happy', shirt: '#7D8FA8', la: [-14, -6], ra: [14, 6], bob: 0 }))}</g>`);
  s += hand(o.title || '1 IN 3 ADULTS', 960, 240, 120, c.t, 0.2, { col: C.accent }) + hand(o.sub || "DON'T GET ENOUGH SLEEP", 960, 340, 80, c.t, 0.5);
  return s;
};

// ----- night, danger, apes -----
SCN.groundSleep = (c, o) => {
  let s = (o.dusk ? kalahari(c.t, { sky: ['#E07A4A', '#F6C98A'], hills: '#9A6A4A', ground: '#B98E5A', trees: true }) : bgNight(c.t, { seed: 301 })) + (o.bed ? grassMat(380, 1000, 900, c.t, 4) : '') + (o.fire ? `<ellipse cx="960" cy="930" rx="600" ry="140" fill="#F28C28" opacity=".22"/>` + fire(1260, 940, 0.7, c.t) : '');
  s += lying(560, 930, 1.0, { t: c.t, seed: 2, face: o.awake ? 'scared' : 'sleep' });
  if (!o.awake && !o.fire) s += zzz(700, 820, c.t);
  if (o.eyes) [[220, 760, 0.8], [1720, 780, 0.8], [1500, 660, 0.5]].slice(0, o.eyes).forEach(([x, y, sc], i) => { s += pop(x, y, c.t, 0.2 + i * 0.25, bushEyes(0, 0, sc, c.t, i)); });
  return s;
};
function nestTree(x, y, s, t, o = {}) {
  let r = g(`translate(${x} ${y}) scale(${s})`, stick(0, 300, -10, -40, 34, C.woodD) + stick(-10, 0, -260, -120, 20, C.woodD) + stick(-10, -20, 240, -140, 20, C.woodD));
  r += g(`translate(${x} ${y}) scale(${s})`, `<path d="${smooth([[-420, -150], [-300, -340], [-60, -400], [200, -380], [420, -220], [380, -110], [100, -160], [-160, -150]])}" fill="#5E8A4E" ${S} stroke-width="6"/>`);
  const k = o.build ?? 1;
  let nest = `<ellipse cx="0" cy="0" rx="190" ry="50" fill="#7A6A3A" ${S} stroke-width="5"/>`;
  const nl = Math.round(18 * k);
  for (let i = 0; i < nl; i++) { const a = Math.PI + i / 18 * Math.PI * 2; nest += leaf(Math.cos(a) * 185, Math.sin(a) * 46 - 6, a * 57.3 + 90, 0.75, i % 2 ? '#5E8A3C' : '#4E7A32'); }
  if (k < 1) for (let i = 0; i < 4; i++) nest += stick(-150 + i * 100, -10, -150 + i * 100 + lerp(80, 0, k), lerp(-120, -20, k), 9, C.woodD);
  r += g(`translate(${x} ${y - 70 * s}) scale(${s})`, nest);
  return r;
}
SCN.treeNest = (c, o) => {
  let s = o.night ? bgNight(c.t, { seed: 303 }) : `<rect width="${W}" height="${H}" fill="#A9CF95"/><rect y="860" width="${W}" height="220" fill="#7A6A4A"/>`;
  const k = o.build ? eout(clamp(c.t / Math.max(0.8, c.d * 0.8))) : 1;
  s += nestTree(960, 640, 1.4, c.t, { build: k });
  if (o.roof) s += g('translate(960 560)', `<path d="M-260 -40 Q0 -260 260 -40" fill="none" stroke="#3E6A2A" stroke-width="18" stroke-linecap="round"/>` + [...Array(9)].map((_, i) => leaf(-220 + i * 55, -90 - Math.sin(i / 8 * Math.PI) * 120, -40 + i * 10, 1.1, i % 2 ? '#5E8A3C' : '#4E7A32')).join(''));
  s += g(`translate(960 ${o.lying ? 540 : 470}) scale(.7)`, ape(o.ape || 'chimp', c.t, {}));
  if (o.baby) s += g(`translate(1070 ${o.lying ? 560 : 500}) scale(.32)`, ape(o.ape || 'chimp', c.t, {}));
  if (o.rain) { let r = ''; for (let i = 0; i < 70; i++) { const x = (i * 137) % W, y = ((i * 89) + c.t * 900) % H; r += `M${x} ${f1(y)} l-12 40 `; } s += `<path d="${r}" stroke="#BFD9EA" stroke-width="4" stroke-linecap="round" opacity=".8"/>`; }
  if (o.eyes) s += pop(500, 960, c.t, 0.2, bushEyes(0, 0, 0.7, c.t, 1)) + pop(1450, 980, c.t, 0.5, bushEyes(0, 0, 0.7, c.t, 2));
  if (o.night) s += zzz(1080, 300, c.t);
  if (o.label) { const w = o.label.length * 48 + 80; s += pop(960, 120, c.t, 0.2, `<rect x="${-w / 2}" y="-64" width="${w}" height="100" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>`) + hand(o.label, 960, 140, 80, c.t, 0.3, { col: C.accent }); }
  return s;
};
SCN.nestMicrobes = (c, o) => {
  let s = paper() + `<path d="M400 760 H1520" ${S} stroke-width="6"/>`;
  const p = eout(clamp(c.t / 0.9));
  s += `<rect x="560" y="${f1(760 - 400 * p)}" width="260" height="${f1(400 * p)}" fill="#6F8FB5" ${S} stroke-width="5"/><rect x="1100" y="${f1(760 - 50 * p)}" width="260" height="${f1(50 * p)}" fill="#7FA34E" ${S} stroke-width="5"/>`;
  s += hand('HUMAN BED', 690, 830, 64, c.t, 0.2) + hand('CHIMP NEST', 1230, 830, 64, c.t, 0.3) + hand(o.title || 'BACTERIA FROM OUR OWN BODIES', 960, 240, 72, c.t, 0.4, { col: C.accent });
  if (o.labels) s += hand(o.labels[0], 690, f1(730 - 400 * p), 70, c.t, 0.6, { col: '#4F6F95' }) + hand(o.labels[1], 1230, f1(730 - 50 * p), 70, c.t, 0.7, { col: '#5E8A3C' });
  return s;
};
SCN.sleepCompare = (c, o) => {
  let s = paper() + `<path d="M300 860 H1620" ${S} stroke-width="6"/>`;
  const rows = o.rows || [['CHIMP', 11.5], ['HUMAN', 7.0]];
  const x0 = rows.length === 2 ? 680 : 460, dx = rows.length === 2 ? 560 : 440;
  rows.forEach(([lab, h], i) => {
    const p = eout(clamp((c.t - i * 0.15) / 0.8)), x = x0 + i * dx, hh = h * 48 * p, hum = lab === 'HUMAN' || lab === 'US' || lab === 'MODERN';
    s += `<rect x="${x - 110}" y="${f1(860 - hh)}" width="220" height="${f1(hh)}" fill="${hum ? C.accent : '#C9C2B0'}" ${S} stroke-width="5"/>` + hand(lab, x, 920, 60, c.t, 0.1) + `<text x="${x}" y="${f1(840 - hh)}" font-family="Hand" font-size="56" text-anchor="middle" fill="${C.text}" opacity="${f1(p)}">${h}h</text>`;
  });
  return s + hand(o.title || 'HOURS OF SLEEP', 960, 200, 90, c.t, 0.1);
};
SCN.fireCircle = (c, o) => {
  let s = bgNight(c.t, { seed: 305 }) + `<ellipse cx="960" cy="900" rx="760" ry="200" fill="#F28C28" opacity=".24"/>` + fire(960, 900, 0.9, c.t);
  const today_ = !!o.today;
  if (o.talk) {
    const sit = { hip: 50, ll: [118, 8], rl: [106, -2] }, k = Math.sin(c.t * 5) * 20;
    s += person(Object.assign({ x: 560, y: 960, s: 1.0, t: c.t, seed: 2, face: 'laugh', la: [-10, 30], ra: [-60 + k, -100] }, sit));
    s += person(Object.assign({ x: 1360, y: 960, s: 1.0, t: c.t, seed: 5, long: true, flip: true, face: 'happy', la: [-10, 30], ra: [40, 70] }, sit));
    s += person(Object.assign({ x: 760, y: 1040, s: 0.7, t: c.t, seed: 9, face: 'think', la: [-10, 30], ra: [40, 70] }, sit));
    return s;
  }
  [[320, 960, false, 2], [1300, 980, true, 5], [580, 1040, false, 9]].forEach(([x, y, fl, sd]) => { s += lying(x, y, 0.75, { t: c.t, seed: sd, flip: fl, kind: today_ ? 'today' : 'cave' }); });
  if (o.sentinel) s += (today_ ? (f => today(f)) : (f => f()))(() => person({ x: 1500, y: 880, s: 0.9, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: 'neutral', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70], flip: true }));
  else s += zzz(420, 860, c.t, 0.8);
  return s;
};

// ----- the oldest beds -----
SCN.borderCave = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9D2E8"/><path d="M0 330 Q300 260 620 300 T1300 270 T1920 300 V600 H0 Z" fill="#8FA45E" opacity=".6"/>`;
  s += `<path d="M0 300 L180 240 L380 270 L600 210 L860 250 L1100 200 L1360 250 L1620 215 L1920 260 V860 H0 Z" fill="#B9A88A" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 7; i++) s += `<path d="M${-40 + i * 300} ${360 + (i % 3) * 120} q120 -20 240 10" fill="none" stroke="#8E7E62" stroke-width="5"/>`;
  s += `<path d="M640 860 Q640 600 860 540 Q1120 500 1270 620 Q1350 700 1330 860 Z" fill="#3A2E24" ${S} stroke-width="6"/>`;
  s += `<path d="M0 860 Q960 800 1920 860 V1080 H0 Z" fill="#7FA34E" ${S} stroke-width="5"/>`;
  [[180, 870, 1.0], [420, 880, 0.8], [1500, 870, 1.1], [1760, 880, 0.9], [560, 230, 0.6], [1200, 210, 0.7]].forEach(([x, y, k]) => { s += `<path d="${smooth([[x - 90 * k, y], [x - 70 * k, y - 70 * k], [x, y - 100 * k], [x + 70 * k, y - 70 * k], [x + 90 * k, y]])}" fill="#5E8A4E" ${S} stroke-width="5"/>`; });
  if (o.label) s += hand(o.label, 960, 130, 100, c.t, 0.1);
  return s;
};
SCN.beddingLayers = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#8C6C49"/>`;
  const layers = [[300, '#A9A49C', 'ASH'], [420, '#D9C27A', 'GRASS'], [520, '#A9A49C', 'ASH'], [640, '#D9C27A', 'GRASS'], [760, '#A9A49C', 'ASH']];
  layers.slice(0, Math.max(1, st)).forEach(([y, col, lab], i) => { const p = i === st - 1 ? eout(clamp(c.t / 0.6)) : 1; s += `<rect x="200" y="${y}" width="${f1(1400 * p)}" height="100" fill="${col}" ${S} stroke-width="4"/>`; if (lab === 'GRASS') { let gp = ''; for (let k = 0; k < 40; k++) gp += `M${220 + k * 37} ${y + 50 + (k % 3) * 12} q20 -8 50 0 `; s += `<path d="${gp}" fill="none" stroke="#A8913E" stroke-width="3" opacity="${f1(p)}"/>`; } s += hand(lab, 1630, y + 66, 56, c.t, DONE, { anchor: 'start', col: '#FFFFFF' }); });
  if (o.ants) for (let i = 0; i < 5; i++) { const p = clamp((c.t - i * 0.2) / 1.0); s += g(`translate(${f1(260 + i * 300)} ${f1(lerp(980, 870, p))})`, `<ellipse cx="0" cy="0" rx="18" ry="10" fill="#3C2A1E"/><circle cx="18" cy="-2" r="8" fill="#3C2A1E"/><path d="M-6 6 l-10 10 M4 6 l0 12 M10 6 l8 10" stroke="#3C2A1E" stroke-width="3"/>`) + (p >= 1 ? xmark(260 + i * 300, 860, 30, c.t, 1.0 + i * 0.2, 0.2) : ''); }
  if (o.ochre) { const r = rng(17); for (let i = 0; i < 40; i++) { const x = 240 + r() * 1440, y = 440 + r() * 380; s += pop(x, y, c.t, 0.2 + i * 0.02, i % 3 ? `<circle r="${f1(6 + r() * 6)}" fill="#C0392B" stroke="${C.ink}" stroke-width="2"/>` : `<path d="M-14 -8 L12 -12 L16 8 L-10 12 Z" fill="#9C978F" stroke="${C.ink}" stroke-width="2.5"/>`); } s += hand('OCHRE + STONE CHIPS', 960, 180, 80, c.t, 0.6, { col: '#FFF3D6' }); }
  if (o.title) s += hand(o.title, 960, 180, 90, c.t, 0.2, { col: '#FFF3D6' });
  return s;
};
SCN.sibudu = (c, o) => {
  let s = `<defs><linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2A2018" stop-opacity=".55"/><stop offset="1" stop-color="#2A2018" stop-opacity="0"/></linearGradient></defs>`;
  s += `<rect width="${W}" height="${H}" fill="#BFE0EE"/><path d="M900 700 Q1300 520 1920 560 V900 H900 Z" fill="#7FA34E"/><path d="M1300 640 q60 -120 120 0 M1600 600 q70 -140 140 0" fill="#5E8A4E" ${S} stroke-width="5"/>`;
  s += `<path d="M0 0 H1560 Q1440 420 1500 880 H0 Z" fill="#8E7E68" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${80 + i * 230} ${520 + (i % 3) * 90} q90 -24 180 6" fill="none" stroke="#7A6A56" stroke-width="6"/>`;
  s += `<rect y="880" width="${W}" height="200" fill="#8C6C49"/>`;
  s += `<path d="M0 0 H1560 Q1440 420 1500 880 H0 Z" fill="url(#shade)"/>`;
  s += `<path d="M0 0 H1920 V170 Q1500 230 1200 280 Q800 340 420 400 Q200 440 120 480 Q180 700 160 880 H0 Z" fill="#A99A86" ${S} stroke-width="6"/>`;
  s += `<path d="M0 880 V500 Q140 560 160 880 Z" fill="#94846F"/><path d="M300 120 q200 40 400 0 M900 80 q200 30 400 -10 M60 300 q80 20 160 -10" fill="none" stroke="#86766A" stroke-width="6"/>`;

  s += grassMat(480, 1440, 820, c.t, 5, '#B9B27A');
  const leaves = o.leaves ?? 1;
  const r = rng(11);
  const lc = o.camphor ? ['#9AA88E', '#B3BDA6', '#8A9A80'] : ['#5E8A3C', '#6F9A45', '#4E7A32'];
  for (let i = 0; i < 40 * leaves; i++) s += leaf(520 + r() * 880, 820 + r() * 40, -20 + r() * 40, o.camphor ? 0.45 : 0.6, lc[i % 3]);
  if (o.camphor) s += hand('CAMPHOR BUSH', 960, 140, 96, c.t, 0.2);
  if (o.mosquitoes) for (let i = 0; i < 6; i++) { const a = c.t * 2 + i, away = clamp(c.t / 1.2); s += mosquito(960 + Math.cos(a) * (200 + away * 500), 640 + Math.sin(a * 1.3) * (80 + away * 200) - away * 200, 1.4, c.t, i); }
  if (o.burn) { s += fire(960, 900, 1.6, c.t) + smoke(960, 700, c.t, { n: 10, rise: 500, drift: 60, op: 0.6 }); }
  if (o.label) s += hand(o.label, 960, 140, 96, c.t, 0.1, { col: C.text });
  return s;
};
SCN.cryptocarya = (c, o) => {
  let s = paper();
  const cam = o.plant === 'camphor';
  s += g('translate(960 760) scale(1.6)', stick(0, 0, 0, -260, 12, C.woodD) + [0, 1, 2, 3, 4, 5].map(i => leaf((i % 2 ? 60 : -60), -80 - i * 34, i % 2 ? -20 : 20, cam ? 0.8 : 1.0, cam ? '#9AA88E' : '#5E8A3C')).join(''));
  if (cam) { for (let i = 0; i < 4; i++) { const p = clamp((c.t - 0.3 - i * 0.15) / 0.8); s += mosquito(lerp(1500, 1250 + i * 30, Math.min(1, p * 2)) + (p > 0.5 ? (p - 0.5) * 900 : 0), 400 + i * 80 - (p > 0.5 ? (p - 0.5) * 400 : 0), 1.6, c.t, i); } return s + smellWaves(960, 420, c.t, 5, '#8A9A80') + hand('CAMPHOR BUSH', 520, 520, 72, c.t, 0.2) + hand('STILL USED AGAINST INSECTS', 960, 200, 84, c.t, 0.5, { col: C.green }); }
  for (let i = 0; i < 4; i++) { const p = clamp((c.t - 0.3 - i * 0.15) / 0.8); s += mosquito(lerp(1500, 1250 + i * 30, Math.min(1, p * 2)) + (p > 0.5 ? (p - 0.5) * 900 : 0), 400 + i * 80 - (p > 0.5 ? (p - 0.5) * 400 : 0), 1.6, c.t, i); }
  return s + hand('CRYPTOCARYA WOODII', 520, 520, 72, c.t, 0.2) + hand('BUG-KILLING CHEMICALS', 960, 200, 90, c.t, 0.5, { col: C.green });
};
SCN.ohaloHut = (c, o) => {
  let s = lakeWorld(c.t);
  s += g('translate(960 900)', `<path d="M-320 0 Q-300 -340 0 -360 Q300 -340 320 0 Z" fill="#B9A06A" ${S} stroke-width="6"/>` + [...Array(14)].map((_, i) => `<path d="M${-300 + i * 44} 0 Q${-260 + i * 40} -200 ${-150 + i * 22} -330" fill="none" stroke="#8E7748" stroke-width="5"/>`).join(''));
  if (o.cut) s += g('translate(960 900)', `<path d="M-260 0 Q-240 -260 0 -280 Q240 -260 260 0 Z" fill="#5C4430"/>`) + grassMat(740, 1180, 860, c.t, 7) + lying(820, 860, 0.45, { t: c.t, seed: 2 });
  if (o.lake) { const p = 1 - eout(clamp(c.t / Math.max(1, c.d * 0.7))); s += `<rect y="${f1(lerp(1080, 220, p))}" width="${W}" height="1080" fill="#5E94B5" opacity=".75"/>`; for (let i = 0; i < 5; i++) s += `<path d="M${200 + i * 340} ${f1(lerp(1080, 220, p) + 30)} q40 -16 80 0" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".7"/>`; s += hand('1989', 960, 140, 110, c.t, 0.4, { col: C.text }); }
  if (o.label) s += hand(o.label, 960, 140, 96, c.t, 0.1);
  return s;
};

// ----- sleeping like a hunter-gatherer today -----
SCN.hadzaNight = (c, o) => {
  let s = bgNight(c.t, { seed: 307 }) + domeHut(360, 680, 1.0) + domeHut(1560, 670, 1.1) + domeHut(1020, 650, 0.6);
  s += `<ellipse cx="960" cy="930" rx="700" ry="160" fill="#F28C28" opacity=".22"/>` + fire(960, 930, 0.7, c.t);
  [[360, 980, false, 2], [1280, 1000, true, 5], [620, 1050, false, 9], [1520, 1060, true, 12]].forEach(([x, y, fl, sd]) => { s += lying(x, y, 0.7, { t: c.t, seed: sd, flip: fl, kind: 'today', long: sd === 5 }); });
  if (o.awake) s += today(() => person({ x: 1700, y: 900, s: 0.9, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: o.awake === 'old' ? 'neutral' : 'happy', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70], flip: true }));
  return s;
};
SCN.sentinelChart = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/>`;
  const rows = 10, x0 = 260, x1 = 1660, HX = 1180;
  ['8 PM', 'MIDNIGHT', '8 AM'].forEach((l, i) => { s += hand(l, x0 + i * 700, 905, 40, 1, DONE, { col: '#8FA3BF' }); });
  for (let i = 0; i < rows; i++) {
    const y = 200 + i * 66, r = rng(41 + i * 7);
    const old = i < 3, young = i > 6;
    const st = x0 + (old ? 40 : young ? 260 : 140) + r() * 60, en = x1 - (old ? 220 : young ? 10 : 100) - r() * 50;
    const hl = (o.rows === 'old' && old) || (o.rows === 'young' && young);
    s += `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="40" rx="8" fill="#33415F"/>`;
    if (!o.blank || c.t > 0) {
      let x = st; const bl = [];
      while (x < en) { const sl = Math.min(60 + r() * 200, en - x), wk = 8 + r() * 40; bl.push([x, x + sl]); x += sl + wk; }
      for (let k = bl.length - 1; k > 0; k--) if (bl[k - 1][1] < HX + 30 && bl[k][0] > HX - 14) { bl[k - 1][1] = bl[k][1]; bl.splice(k, 1); }
      const lim = x0 + (x1 - x0) * (o.blank ? clamp((c.t - i * 0.05) / 1.2) : 1);
      bl.forEach(([a0, a1]) => { if (a0 < lim) s += `<rect x="${f1(a0)}" y="${y}" width="${f1(Math.min(a1, lim) - a0)}" height="40" rx="8" fill="${hl ? '#F2C443' : '#6F8FB5'}"/>`; });
    }
    s += hand(old ? 'OLDER' : young ? 'YOUNGER' : '', 240, y + 32, 40, 1, DONE, { anchor: 'end', col: hl ? '#F2C443' : '#BFD3E6' });
  }
  if (o.rows === 'old') s += hand('EARLY TO BED, EARLY TO RISE', 960, 140, 70, c.t, 0.3, { col: '#F2C443' });
  if (o.rows === 'young') s += hand('LATE NIGHTS, LATE MORNINGS', 960, 140, 70, c.t, 0.3, { col: '#F2C443' });
  if (o.highlight) { const p = clamp(c.t / 0.6); s += `<rect x="${HX}" y="190" width="16" height="${f1(670 * p)}" fill="${C.accent}"/>` + hand('ALL ASLEEP: ' + o.highlight, HX + 8, 150, 70, c.t, 0.4, { col: C.accent }); }
  if (o.highlight || o.rows) return s;
  return s + hand(o.title || '20 DAYS, ONE HADZA CAMP', 960, 140, 64, c.t, 0.1, { col: '#FFFFFF' });
};
SCN.sunsetClock = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="${st === 1 ? '#F2B27A' : '#1F2A44'}"/>`;
  s += `<path d="M200 760 H1720" stroke="#FFFFFF" stroke-width="6"/>`;
  const marks = [[300, 'SUNSET'], [900, 'ASLEEP'], [1620, 'WAKE']];
  marks.forEach(([x, lab], i) => { if (i < st) s += pop(x, 760, c.t, i === st - 1 ? 0.15 : DONE, `<circle r="22" fill="${C.accent}" ${S} stroke-width="4"/>`) + hand(lab, x, 860, 64, c.t, i === st - 1 ? 0.3 : DONE, { col: '#FFFFFF' }); });
  if (st >= 2) s += arrow(330, 720, 870, 720, c.t, st === 2 ? 0.2 : DONE, 0.5, '#FFE9A8', 80) + hand(o.gap || '~3 HOURS', 600, 560, 70, c.t, st === 2 ? 0.5 : DONE, { col: '#FFE9A8' });
  if (st >= 3) s += hand('BEFORE SUNRISE', 1620, 940, 52, c.t, 0.4, { col: '#FFE9A8' });
  s += st === 1 ? g('translate(300 700)', `<circle r="80" fill="#F7883A"/>`) : `<circle cx="1500" cy="200" r="50" fill="#F6ECC9"/>`;
  if (o.winter) s += pop(1320, 360, c.t, 0.2, g('scale(.8)', icon('snow', c.t))) + hand('WINTER', 1320, 560, 80, c.t, 0.4, { col: '#FFFFFF' }) + hand('~1 HOUR MORE SLEEP', 960, 220, 90, c.t, 0.7, { col: '#FFE9A8' });
  return s;
};
SCN.tempCurve = c => {
  let s = paper() + `<path d="M260 860 H1680 M260 860 V200" ${S} stroke-width="6"/>` + hand('TEMPERATURE', 270, 180, 56, 1, DONE, { anchor: 'start' }) + hand('NIGHT', 1680, 920, 56, 1, DONE);
  const p = clamp(c.t / 1.2), n = Math.floor(80 * p);
  let d = ''; for (let i = 0; i <= n; i++) { const x = 260 + i * 1420 / 80, y = 320 + Math.pow(i / 80, 0.7) * 420; d += (i ? 'L' : 'M') + f1(x) + ' ' + f1(y); }
  s += `<path d="${d}" fill="none" stroke="#3E7FA6" stroke-width="10" stroke-linecap="round"/>`;
  return s + pop(1000, 560, c.t, 0.8, `<text font-family="Hand" font-size="90" fill="${C.text}">z z z</text>`);
};
SCN.campingStudy = (c, o) => {
  const dawn = !!o.dawn;
  let s = `<defs><linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dawn ? '#F6C27A' : '#2E3B5C'}"/><stop offset="1" stop-color="${dawn ? '#FBE3B5' : '#5E6A8A'}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#cm)"/>`;
  s += `<path d="M0 620 L300 300 L520 520 L800 240 L1100 560 L1400 280 L1700 520 L1920 380 V700 H0 Z" fill="#5E6E7E" ${S} stroke-width="5"/><path d="M800 240 L860 320 L740 320 Z M1400 280 L1460 350 L1340 350 Z" fill="#FFFFFF"/>`;
  s += `<rect y="680" width="${W}" height="400" fill="${o.winter ? '#EEF3F6' : '#6F8A4E'}"/>`;
  for (let i = 0; i < 9; i++) s += `<path d="M${80 + i * 220} 700 l40 -140 l40 140 Z" fill="#3E5A3A" ${S} stroke-width="4"/>`;
  s += `<path d="M760 960 L960 700 L1160 960 Z" fill="#E39A4C" ${S} stroke-width="6"/><path d="M960 700 L920 960 M960 700 L1000 960" ${S} stroke-width="4"/>`;
  if (dawn) s += sun(1500, 300, 80, c.t) + person({ x: 1250, y: 980, s: 1.1, kind: 'modern', t: c.t, seed: 3, face: 'happy', shirt: '#C9573E', la: [-150, -170], ra: [150, 170] });
  else s += fire(560, 960, 0.6, c.t) + `<circle cx="1600" cy="160" r="40" fill="#F6ECC9"/>`;
  return s;
};
SCN.screenGlow = (c, o) => {
  let s = SCN.modernBed(c, { awake: true, time: '00:52' });
  s += `<rect width="${W}" height="${H}" fill="#9FD3FF" opacity=".06"/>`;
  if (o.plain) return s;
  return s + pop(1400, 300, c.t, 0.3, `<circle r="70" fill="#F6ECC9" ${S} stroke-width="5"/><circle cx="26" cy="-16" r="60" fill="#273049"/>`) + arrow(1480, 300, 1700, 300, c.t, 0.6, 0.5, '#FFE9A8') + hand('LATER', 1600, 240, 60, c.t, 0.8, { col: '#FFE9A8' });
};

// ----- later beds -----
SCN.skaraBrae = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#BFD3DE"/><rect y="600" width="${W}" height="480" fill="#8FA45E"/><path d="M0 600 Q960 560 1920 600" fill="none" ${S} stroke-width="4"/><rect y="520" width="${W}" height="90" fill="#7FA3B5"/>`;
  s += `<ellipse cx="960" cy="820" rx="620" ry="230" fill="#9C978F" ${S} stroke-width="8"/><ellipse cx="960" cy="830" rx="540" ry="180" fill="#C9B79A" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 18; i++) s += `<path d="M${430 + (i % 9) * 120} ${700 + Math.floor(i / 9) * 30} h90" stroke="#7E7A72" stroke-width="5"/>`;
  s += `<rect x="900" y="800" width="120" height="60" fill="#5C4430" ${S} stroke-width="4"/>` + fire(960, 840, 0.4, c.t);
  const bed = x => `<rect x="${x}" y="760" width="230" height="120" fill="#B6B0A6" ${S} stroke-width="5"/><rect x="${x + 14}" y="780" width="200" height="70" fill="#D9C27A" ${S} stroke-width="3"/>`;
  s += bed(500) + bed(1190);
  if (o.storm) { const p = eout(clamp(c.t / Math.max(1, c.d * 0.8))); s += `<path d="M0 ${f1(560 + p * 300)} Q480 ${f1(500 + p * 300)} 960 ${f1(540 + p * 320)} T1920 ${f1(520 + p * 300)} V1080 H0 Z" fill="#E6D3A3" ${S} stroke-width="5"/>`; let w = ''; for (let i = 0; i < 14; i++) { const x = ((i * 173) + c.t * 1400) % 2200 - 140; w += `M${f1(x)} ${120 + (i * 61) % 360} q60 -20 120 0 t120 0 `; } s += `<path d="${w}" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity=".8"/>` + hand('1850', 960, 140, 110, c.t, 0.3); return s; }
  if (o.sleepers) s += lying(520, 820, 0.28, { t: c.t, seed: 2 }) + lying(1210, 820, 0.28, { t: c.t, seed: 5, long: true });
  if (o.label) s += hand(o.label, 960, 140, 96, c.t, 0.1);
  return s;
};
SCN.headrest = (c, o) => {
  if (o.gold) {
    let s = paper() + g('translate(760 700) scale(1.6)', `<path d="M-150 -170 Q0 -70 150 -170 L140 -146 Q0 -50 -140 -146 Z" fill="#EFE6D0" ${S} stroke-width="5"/><rect x="-130" y="80" width="260" height="30" rx="6" fill="#EFE6D0" ${S} stroke-width="5"/>` + person({ x: 0, y: 80, s: 0.55, t: c.t, seed: 4, kind: 'cave', face: 'neutral', hip: 60, ll: [100, 20], rl: [-100, -20], la: [-150, -170], ra: [150, 170], tunicC: '#EFE6D0', bob: 0 }));
    return s + hand('TUTANKHAMUN', 1300, 520, 96, c.t, 0.2) + hand('8 HEADRESTS', 1300, 640, 70, c.t, 0.4, { col: C.accent });
  }
  let s = paper() + g('translate(760 640) scale(1.6)', `<path d="M-120 -120 Q0 -40 120 -120 L110 -100 Q0 -20 -110 -100 Z" fill="#B9764A" ${S} stroke-width="5"/><rect x="-24" y="-60" width="48" height="140" fill="#B9764A" ${S} stroke-width="5"/><rect x="-110" y="80" width="220" height="30" rx="6" fill="#B9764A" ${S} stroke-width="5"/>`);
  return s + hand('A HEADREST', 1350, 520, 100, c.t, 0.2) + hand('ANCIENT EGYPT', 1350, 640, 70, c.t, 0.4, { col: C.accent });
};
SCN.coSleep = c => {
  let s = bgNight(c.t, { seed: 311 }) + `<ellipse cx="1300" cy="960" rx="560" ry="130" fill="#F28C28" opacity=".2"/>` + fire(1500, 980, 0.6, c.t);
  s += lying(380, 860, 1.0, { t: c.t, seed: 5, long: true, hairC: C.hair2 });
  s += g('translate(470 905) scale(1.15)', `<path d="M60 -10 Q130 -24 180 0 Q190 24 180 40 Q120 50 60 40 Z" fill="#E8DCCB" ${S} stroke-width="5"/><circle cx="20" cy="10" r="38" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M6 8 q6 5 12 0 M26 8 q6 5 12 0" fill="none" ${S} stroke-width="3.5"/>`);
  return s + zzz(700, 720, c.t, 0.8);
};


// Extra card icons: moon, bed, eye, leaf.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'moon') return `<path d="M20 -90 A90 90 0 1 0 90 40 A80 80 0 0 1 20 -90 Z" fill="#F6ECC9" ${S} stroke-width="6"/>`;
    if (name === 'bed') return `<rect x="-120" y="-10" width="240" height="60" rx="10" fill="#E6E2DA" ${S} stroke-width="6"/><rect x="-110" y="-50" width="80" height="44" rx="18" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-130 -80 V80 M130 0 V80" ${S} stroke-width="12"/>`;
    if (name === 'eye') { const bl = Math.abs(Math.sin(t * 1.3)) < 0.06 ? 0.15 : 1; return `<path d="M-110 0 Q0 ${f1(-80 * bl)} 110 0 Q0 ${f1(80 * bl)} -110 0 Z" fill="#FFFFFF" ${S} stroke-width="6"/><circle r="${f1(34 * bl)}" fill="${C.ink}"/>`; }
    if (name === 'leaf') return leaf(0, 0, -30, 2.2);
    return ic(name, t);
  };
})();

// ----- science scenes -----
SCN.tracker = (c, o) => {
  if (o.mode === 'swab') {
    let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/><rect y="820" width="${W}" height="260" fill="#7A6A4A"/>`;
    s += g('translate(760 700) scale(1.3)', `<ellipse cx="0" cy="0" rx="230" ry="70" fill="#7A6A3A" ${S} stroke-width="5"/>` + [...Array(12)].map((_, i) => `<path d="M${-220 + i * 40} ${-10 + (i % 3) * 8} q20 -30 40 -10" fill="none" stroke="#5E8A4E" stroke-width="9" stroke-linecap="round"/>`).join(''));
    s += person({ x: 1300, y: 1000, s: 1.2, kind: 'research', t: c.t, seed: 4, face: 'think', la: [-60, -100], ra: [40, 90], flip: true });
    const sw = Math.sin(c.t * 6) * 14;
    s += g(`translate(${f1(1050 + sw)} 700) rotate(-30)`, `<path d="M0 0 H220" ${S} stroke-width="8"/><ellipse cx="0" cy="0" rx="22" ry="14" fill="#FFFFFF" ${S} stroke-width="4"/>`);
    s += g('translate(1620 760)', [0, 1, 2].map(i => `<rect x="${i * 50 - 70}" y="-120" width="34" height="140" rx="16" fill="#EAF4F7" ${S} stroke-width="4"/><rect x="${i * 50 - 70}" y="-40" width="34" height="60" rx="16" fill="#9FD3B5"/>`).join(''));
    return s + hand('41 NESTS', 960, 160, 100, c.t, 0.3);
  }
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${(i * 197) % W}" cy="${(i * 83) % 500}" r="2.5" fill="#FFF6D8" opacity=".6"/>`;
  s += `<path d="M-40 760 Q500 700 1000 640 L1060 900 Q500 960 -40 1000 Z" fill="#FFFFFF" ${S} stroke-width="6"/>`;
  s += g('translate(960 760) rotate(-10)', `<rect x="-60" y="-200" width="120" height="400" rx="20" fill="#2B2B2B" ${S} stroke-width="5"/><rect x="-110" y="-110" width="220" height="220" rx="36" fill="#3A3A3A" ${S} stroke-width="6"/><rect x="-90" y="-90" width="180" height="180" rx="24" fill="#0E1626"/>` +
    [...Array(9)].map((_, i) => { const h = 20 + Math.abs(Math.sin(i * 1.7 + c.t * 0.5)) * 100; return `<rect x="${-76 + i * 17}" y="${f1(70 - h)}" width="12" height="${f1(h)}" rx="3" fill="${i % 3 ? '#6F8FB5' : '#9FD3FF'}"/>`; }).join(''));
  return s + hand('SLEEP TRACKER', 1400, 300, 84, c.t, 0.3, { col: '#FFFFFF' });
};
SCN.halfBrain = (c, o) => {
  if (o.mode === 'fish') {
    let s = `<rect width="${W}" height="${H}" fill="#5E94B5"/><rect y="860" width="${W}" height="220" fill="#C9B07A"/>`;
    for (let i = 0; i < 6; i++) s += `<circle cx="${300 + i * 260}" cy="${f1(700 - ((c.t * 60 + i * 90) % 600))}" r="12" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".6"/>`;
    s += g('translate(960 760)', fishShape(3.2, '#E39A4C'));
    return s + zzz(1100, 620, c.t) + hand('EVEN FISH REST', 960, 160, 96, c.t, 0.2, { col: '#FFFFFF' });
  }
  let s = `<rect width="${W}" height="${H}" fill="#2E3B5C"/><circle cx="1600" cy="180" r="60" fill="#F6ECC9"/>`;
  s += stick(200, 880, 1720, 820, 30, C.woodD);
  let b = `<ellipse cx="0" cy="0" rx="130" ry="160" fill="#8E9AAE" ${S} stroke-width="6"/><circle cx="0" cy="-190" r="100" fill="#A9B3C4" ${S} stroke-width="6"/><path d="M-20 -170 L0 -130 L20 -170 Z" fill="#E8A33C" ${S} stroke-width="4"/>`;
  b += `<path d="M-60 -210 q22 14 44 0" fill="none" ${S} stroke-width="6"/>`;
  const bl = ((c.t % 3) < 0.1) ? 0.2 : 1;
  b += `<ellipse cx="40" cy="-210" rx="22" ry="${f1(22 * bl)}" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="40" cy="-210" r="${f1(10 * bl)}" fill="${C.ink}"/>`;
  b += `<path d="M-40 160 v50 M40 160 v50" ${S} stroke-width="8"/>`;
  s += g('translate(960 680) scale(1.2)', b);
  if (o.half) {
    const brain = `<path d="M0 -110 Q-150 -120 -150 0 Q-150 110 0 110 Z" fill="#6F8FB5" ${S} stroke-width="6"/><path d="M0 -110 Q150 -120 150 0 Q150 110 0 110 Z" fill="#F2C443" ${S} stroke-width="6"/>`;
    s += pop(960, 190, c.t, 0.15, g('scale(.9)', brain)) + hand('ASLEEP', 700, 210, 64, c.t, 0.4, { col: '#BFD3E6' }) + hand('AWAKE', 1220, 210, 64, c.t, 0.5, { col: '#F2C443' });
  }
  if (o.eye) s += `<circle cx="${f1(960 + 48)}" cy="${f1(680 - 252)}" r="54" fill="none" stroke="${C.accent}" stroke-width="8"/>`;
  return s;
};
SCN.hotelBed = (c, o) => {
  let s = SCN.modernBed(c, { awake: !!o.awake, time: '03:12' });
  s += g('translate(1300 900)', `<rect x="-90" y="-120" width="180" height="140" rx="16" fill="#C9573E" ${S} stroke-width="5"/><path d="M-30 -120 v-30 h60 v30" fill="none" ${S} stroke-width="6"/>`);
  s += hand('NEW PLACE', 960, 110, 80, c.t, 0.2, { col: '#FFFFFF' });
  if (o.half) {
    const brain = `<path d="M0 -110 Q-150 -120 -150 0 Q-150 110 0 110 Z" fill="#F2C443" ${S} stroke-width="6"/><path d="M0 -110 Q150 -120 150 0 Q150 110 0 110 Z" fill="#6F8FB5" ${S} stroke-width="6"/>`;
    s += pop(980, 340, c.t, 0.15, thought(0, 0, 230, 170, -230, 190) + g('scale(.85)', brain));
    s += hand('LEFT: ON ALERT', 980, 590, 54, c.t, 0.4, { col: '#F2C443' });
  }
  if (o.beep) for (let i = 0; i < 3; i++) { const p = ((c.t * 0.8) + i / 3) % 1; s += `<path d="M${f1(1500 - p * 300)} ${f1(300 - p * 40)} q-30 40 0 80" fill="none" stroke="#FFE9A8" stroke-width="7" stroke-linecap="round" opacity="${f1(1 - p)}"/>`; }
  if (o.beep) s += hand('BEEP!', 1600, 300, 70, c.t, 0.2, { col: '#FFE9A8' });
  return s;
};
SCN.gardner = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const face = st >= 5 ? 'happy' : st >= 2 ? 'tired' : 'happy';
  s += person({ x: 720, y: 990, s: 1.45, kind: 'modern', t: c.t, seed: 6, face, shirt: '#3E7FA6', la: [-14, -6], ra: [14, 6], shake: st === 2 ? 0.4 : 0 });
  if (st === 1) { const d = Math.min(11, 1 + Math.floor(c.t * 3)); s += g('translate(1340 460)', `<rect x="-170" y="-170" width="340" height="320" rx="16" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="-170" y="-170" width="340" height="80" rx="16" fill="${C.red}" ${S} stroke-width="6"/><text x="0" y="-115" font-family="Cap" font-size="44" fill="#FFFFFF" text-anchor="middle">DAY</text><text x="0" y="80" font-family="Cap" font-size="170" fill="${C.text}" text-anchor="middle">${d}</text>`) + hand('1964', 1340, 820, 90, c.t, 0.3); }
  if (st === 2) s += pop(1230, 430, c.t, 0.15, questionMark(240, Math.sin(c.t * 3) * 8)) + pop(1400, 300, c.t, 0.4, questionMark(150, -12));
  if (st === 3 || st === 4) { for (let i = 0; i < 6; i++) { const a = c.t * 0.8 + i; s += `<circle cx="${f1(1300 + Math.cos(a) * 280)}" cy="${f1(420 + Math.sin(a * 1.3) * 180)}" r="${30 + i * 6}" fill="${['#F2C443', '#9FD3FF', '#E39A4C', '#B58FD0', '#7FC48A', '#F28CA0'][i]}" opacity=".55"/>`; } }
  if (st === 4) { const p = clamp((c.t - 0.3) / 1.0); s += g('translate(1400 900)', `<path d="M0 0 V-360" ${S} stroke-width="14"/><rect x="-120" y="-460" width="240" height="110" rx="10" fill="#3E8A4E" ${S} stroke-width="5"/><text x="0" y="-388" font-family="Cap" font-size="48" fill="#FFFFFF" text-anchor="middle">MAIN ST</text>`) + `<g opacity="${f1(p)}">` + g('translate(1400 900)', `<circle cx="0" cy="-520" r="40" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="-14" cy="-524" r="5" fill="${C.ink}"/><circle cx="14" cy="-524" r="5" fill="${C.ink}"/><path d="M-120 -400 l-60 60 M120 -400 l60 60" ${S} stroke-width="10"/>`) + '</g>'; }
  if (st === 5) s += hand('RECOVERED', 1340, 460, 110, c.t, 0.2, { col: C.green });
  return s;
};
function mouseShape(s = 1, t = 0) {
  return g(`scale(${s})`, `<path d="M120 20 Q220 40 260 -10" fill="none" ${S} stroke-width="6"/><ellipse cx="0" cy="0" rx="140" ry="80" fill="#B8B0A8" ${S} stroke-width="6"/><circle cx="-130" cy="-20" r="60" fill="#B8B0A8" ${S} stroke-width="6"/><circle cx="-120" cy="-90" r="34" fill="#E8B8B0" ${S} stroke-width="5"/><path d="M-160 -26 q10 8 20 0" fill="none" ${S} stroke-width="4"/><circle cx="-188" cy="-10" r="8" fill="#E88A9A"/>`);
}
SCN.mouseBrain = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) return s + g('translate(860 760)', mouseShape(1.6, c.t)) + zzz(760, 520, c.t) + hand('SLEEPING MICE', 960, 200, 100, c.t, 0.2);
  s += `<rect x="260" y="200" width="1400" height="700" rx="30" fill="#F6E6E0" ${S} stroke-width="6"/>`;
  const gap = st >= 2 ? eout(clamp(c.t / 0.8)) * (st === 2 ? 1 : 1) : 0;
  const r = rng(5);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
    const cx = 460 + i * 200, cy = 340 + j * 210, rr = 80 - gap * 22;
    s += `<circle cx="${cx}" cy="${cy}" r="${f1(rr)}" fill="#E8A8A0" ${S} stroke-width="5"/><circle cx="${cx}" cy="${cy}" r="18" fill="#B05A60"/>`;
  }
  if (st >= 3) {
    const p = clamp(c.t / 1.5);
    for (let k = 0; k < 18; k++) { const x0 = 360 + (k % 6) * 200, y0 = 440 + Math.floor(k / 6) * 210; const x = x0 + p * 900; if (x < 1640) s += `<circle cx="${f1(x)}" cy="${y0}" r="12" fill="#6E5A3A" ${S} stroke-width="3"/>`; }
    s += arrow(300, 860, 1600, 860, c.t, 0.1, 0.8, '#4F9FD0') + hand('WASTE WASHED OUT', 960, 150, 80, c.t, 0.4, { col: '#3E7FA6' });
  } else if (st === 2) s += hand('THE GAPS OPEN UP', 960, 150, 80, c.t, 0.3);
  return s;
};
SCN.leopardSkull = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#3A332C"/><ellipse cx="960" cy="900" rx="520" ry="50" fill="#000000" opacity=".25"/>`;
  const H1 = [110, -205], H2 = [195, -150], n = [0.62, -0.78], t = [0.78, 0.62];
  let k = `<path d="M280 -40 C290 -180 160 -270 20 -265 C-150 -260 -250 -170 -265 -60 L-300 -22 L-276 8 L-292 76 L-256 108 L-266 168 L-100 186 L-60 140 L60 140 C140 160 230 120 260 70 C275 40 280 0 280 -40 Z" fill="#E9DFC8" ${S} stroke-width="7"/>`;
  k += `<ellipse cx="-188" cy="-14" rx="46" ry="40" fill="#2A241E" ${S} stroke-width="5"/><path d="M-276 40 L-250 64 L-272 84 Z" fill="#2A241E"/>`;
  k += `<path d="M-150 70 Q-40 44 60 76" fill="none" stroke="#B8AA8A" stroke-width="7"/><circle cx="130" cy="64" r="16" fill="#2A241E"/>`;
  for (let i = 0; i < 6; i++) k += `<path d="M${-244 + i * 26} 152 v28" stroke="#B8AA8A" stroke-width="4"/>`;
  k += `<path d="M-20 -262 q14 30 0 60 q-14 30 6 70 M140 -230 q-30 20 -10 60" fill="none" stroke="#B8AA8A" stroke-width="4"/>`;
  [H1, H2].forEach(([x, y]) => { k += `<circle cx="${x}" cy="${y}" r="18" fill="#1C1A18" ${S} stroke-width="4"/>`; });
  if (o.measure) { const m = [(H1[0] + H2[0]) / 2 + n[0] * 70, (H1[1] + H2[1]) / 2 + n[1] * 70]; k += arrow(m[0], m[1], H1[0] + n[0] * 70, H1[1] + n[1] * 70, c.t, 0.2, 0.3, C.accent) + arrow(m[0], m[1], H2[0] + n[0] * 70, H2[1] + n[1] * 70, c.t, 0.2, 0.3, C.accent); }
  if (o.jaw) {
    const p = eout(clamp(c.t / 0.9)), off = lerp(320, 0, p);
    const B = h => [h[0] + n[0] * (150 + off), h[1] + n[1] * (150 + off)];
    const b1 = B(H1), b2 = B(H2), e1 = [b1[0] - t[0] * 140, b1[1] - t[1] * 140], e2 = [b2[0] + t[0] * 140, b2[1] + t[1] * 140];
    const bar = `M${f1(e1[0])} ${f1(e1[1])} L${f1(b1[0])} ${f1(b1[1])} L${f1(b2[0])} ${f1(b2[1])} L${f1(e2[0])} ${f1(e2[1])}`;
    let j = `<path d="${bar}" fill="none" stroke="${C.ink}" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"/><path d="${bar}" fill="none" stroke="#D9C27A" stroke-width="70" stroke-linecap="round" stroke-linejoin="round"/>`;
    [[H1, b1], [H2, b2]].forEach(([h, bb]) => { const tip = [h[0] + n[0] * off, h[1] + n[1] * off]; j += `<path d="M${f1(bb[0] - t[0] * 20)} ${f1(bb[1] - t[1] * 20)} L${f1(tip[0])} ${f1(tip[1])} L${f1(bb[0] + t[0] * 20)} ${f1(bb[1] + t[1] * 20)} Z" fill="#FFFDF5" ${S} stroke-width="5"/>`; });
    k += j;
  }
  s += g('translate(900 640) scale(1.25)', k);
  s += hand('SK 54', 1640, 160, 90, c.t, 0.2, { col: '#F3EBDD' });
  if (o.measure) s += hand('~33 MM APART', 1500, 300, 64, c.t, 0.5, { col: C.accent });
  if (o.jaw) s += hand('LEOPARD JAW', 1500, 300, 70, c.t, 0.8, { col: '#F3EBDD' });
  return s;
};
SCN.dreamCloud = c => {
  let s = bgNight(c.t, { seed: 309 }) + lying(560, 930, 1.0, { t: c.t, seed: 2 });
  s += pop(1150, 380, c.t, 0.15, thought(0, 0, 380, 230, -480, 400) + g('translate(-80 60) scale(.55)', person({ x: 0, y: 0, t: c.t, seed: 3, face: 'laugh', ll: [-40, -20], rl: [40, 20], la: [-150, -170], ra: [150, 170] })) + [0, 1, 2, 3].map(i => `<path d="M${120 + i * 50} ${-60 + (i % 2) * 70} l8 18 l20 2 l-15 13 l5 20 l-18 -10 l-18 10 l5 -20 l-15 -13 l20 -2 Z" fill="#F2C443" ${S} stroke-width="3"/>`).join(''));
  return s + hand('REM: DREAMS', 1150, 700, 70, c.t, 0.5, { col: '#FFFFFF' });
};
SCN.eyeCells = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  s += g('translate(700 560)', `<circle r="300" fill="#FFFFFF" ${S} stroke-width="7"/><path d="M-300 0 A300 300 0 0 0 300 0" fill="none"/><ellipse cx="-280" cy="0" rx="40" ry="130" fill="#9FD3FF" ${S} stroke-width="5"/><path d="M200 -220 A300 300 0 0 1 200 220" fill="none" stroke="#E88A6A" stroke-width="22"/>`);
  const cells = [[930, 380], [980, 470], [1000, 560], [980, 650], [930, 740]];
  cells.forEach(([x, y], i) => { s += pop(x, y, c.t, 0.2 + i * 0.08, `<circle r="20" fill="${C.accent}" ${S} stroke-width="4"/>`); });
  if (st >= 2) s += arrow(1060, 560, 1400, 560, c.t, 0.2, 0.4, C.ink) + pop(1580, 560, c.t, 0.5, `<circle r="130" fill="#FFFFFF" ${S} stroke-width="6"/>` + g('translate(-50 0) scale(.5)', sun(0, 0, 70, c.t)) + g('translate(55 0) scale(.6)', icon('moon', c.t)));
  if (st >= 3) { for (let i = 0; i < 5; i++) s += arrow(80, 360 + i * 50, 440, 470 + i * 20, c.t, 0.1 + i * 0.06, 0.4, '#3E7FD0'); s += hand('BLUE LIGHT', 300, 300, 80, c.t, 0.3, { col: '#3E7FD0' }); }
  else s += hand('LIGHT SENSORS', 960, 160, 84, c.t, 0.3);
  return s;
};
SCN.leafFossil = c => {
  let s = `<rect width="${W}" height="${H}" fill="#8C6C49"/><path d="M300 900 L420 200 L1500 160 L1640 880 Z" fill="#B6AE9E" ${S} stroke-width="7"/>`;
  s += g('translate(960 540) rotate(-20) scale(5)', `<path d="M-46 0 Q0 -26 46 0 Q0 26 -46 0 Z" fill="#8F8A7C" stroke="#5C5048" stroke-width="1.4"/><path d="M-40 0 H40" stroke="#5C5048" stroke-width="1"/>` + [...Array(6)].map((_, i) => `<path d="M${-28 + i * 11} 0 l8 -12 M${-28 + i * 11} 0 l8 12" stroke="#5C5048" stroke-width=".7"/>`).join(''));
  return s + magnifier(1420, 360, 200, `<rect x="1220" y="160" width="400" height="400" fill="#B6AE9E"/>` + g('translate(1420 360) rotate(-20) scale(12)', `<path d="M-30 0 H30" stroke="#5C5048" stroke-width=".8"/><path d="M-20 0 l8 -12 M-9 0 l8 -12 M2 0 l8 -12 M-20 0 l8 12 M-9 0 l8 12" stroke="#5C5048" stroke-width=".6"/>`)) + hand('77,000 YEARS OLD', 760, 130, 80, c.t, 0.3, { col: '#FFF3D6' });
};
SCN.melatonin = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/><path d="M220 860 H1720 M220 860 V220" stroke="#FFFFFF" stroke-width="6"/>`;
  ['6 PM', '9 PM', 'MIDNIGHT', '3 AM', '6 AM'].forEach((l, i) => { s += hand(l, 260 + i * 360, 930, 46, 1, DONE, { col: '#BFD3E6' }); });
  const curve = (shift, col, k) => { let d = ''; const n = Math.floor(80 * k); for (let i = 0; i <= n; i++) { const x = 220 + i * 1500 / 80, h = 1 / (1 + Math.exp(-(x - (900 - shift)) / 60)) - 1 / (1 + Math.exp(-(x - (1560 - shift)) / 60)); d += (i ? 'L' : 'M') + f1(x) + ' ' + f1(860 - h * 520); } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`; };
  s += curve(0, '#9FD3FF', st === 1 ? clamp(c.t / 1.2) : 1);
  s += hand('MELATONIN', 240, 190, 64, c.t, DONE, { anchor: 'start', col: '#FFFFFF' });
  if (st >= 2) s += curve(240, '#F2C443', clamp(c.t / 1.2)) + arrow(900, 560, 680, 560, c.t, 1.0, 0.4, '#F2C443') + hand('~2 HOURS EARLIER', 790, 480, 64, c.t, 1.2, { col: '#F2C443' });
  return s;
};
SCN.hammock = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9FD7E8"/>`;
  if (o.ship) s += `<rect y="560" width="${W}" height="200" fill="#4F9FD0"/>` + g('translate(1500 560) scale(.7)', `<path d="M-200 0 L200 0 L150 60 L-150 60 Z" fill="#8E5A3A" ${S} stroke-width="5"/><path d="M0 0 V-300" ${S} stroke-width="8"/><path d="M0 -290 Q120 -180 0 -60 Z" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-10 -280 Q-120 -170 -10 -70 Z" fill="#FFFFFF" ${S} stroke-width="5"/>`);
  s += `<rect y="740" width="${W}" height="340" fill="#E8D6A6"/>`;
  s += stick(360, 900, 340, 260, 40, C.woodD) + stick(1560, 900, 1580, 260, 40, C.woodD);
  s += `<path d="M360 300 C700 300 600 640 960 640" fill="none"/>`;
  const sw = Math.sin(c.t * 1.2) * 12;
  s += `<path d="M360 360 Q960 ${f1(860 + sw)} 1560 360" fill="none" ${S} stroke-width="6"/><path d="M420 400 Q960 ${f1(800 + sw)} 1500 400 Q960 ${f1(900 + sw)} 420 400 Z" fill="#D0573E" ${S} stroke-width="6"/>`;
  s += g(`translate(0 ${f1(sw)})`, lying(620, 610, 0.62, { t: c.t, seed: 3, kind: 'cave' }));
  s += `<path d="${smooth([[180, 300], [240, 120], [380, 60], [500, 160], [520, 300], [360, 340]])}" fill="#5E8A4E" ${S} stroke-width="6"/><path d="${smooth([[1400, 300], [1460, 110], [1600, 50], [1740, 150], [1720, 300], [1580, 340]])}" fill="#5E8A4E" ${S} stroke-width="6"/>`;
  return s + (o.ship ? hand('1492', 960, 150, 110, c.t, 0.3) : '');
};
SCN.segmented = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/>`;
  s += `<rect x="200" y="480" width="1520" height="120" rx="20" fill="#33415F" ${S} stroke-width="5"/>`;
  s += hand('DUSK', 200, 680, 56, 1, DONE, { col: '#BFD3E6' }) + hand('DAWN', 1720, 680, 56, 1, DONE, { col: '#BFD3E6' });
  if (st >= 2) { const p = st === 2 ? eout(clamp(c.t / 0.7)) : 1; s += `<rect x="220" y="495" width="${f1(620 * p)}" height="90" rx="14" fill="#6F8FB5"/>` + hand('FIRST SLEEP', 530, 440, 64, c.t, st === 2 ? 0.3 : DONE, { col: '#FFFFFF' }); }
  if (st >= 3) { const p = st === 3 ? eout(clamp(c.t / 0.7)) : 1; s += `<rect x="1060" y="495" width="${f1(640 * p)}" height="90" rx="14" fill="#6F8FB5"/>` + hand('SECOND SLEEP', 1380, 440, 64, c.t, st === 3 ? 0.3 : DONE, { col: '#FFFFFF' }); }
  if (st >= 4) s += pop(950, 470, c.t, 0.2, g('scale(1)', `<rect x="-24" y="-90" width="48" height="110" rx="6" fill="#F3EBDD" ${S} stroke-width="4"/>` + fire(0, -86, 0.18, c.t))) + hand('AWAKE ~1 HOUR', 950, 700, 64, c.t, 0.4, { col: C.accent });
  if (st === 1) s += hand('OLD EUROPE', 960, 260, 100, c.t, 0.2, { col: '#FFFFFF' });
  return s;
};

// The objection beat: a sepia daydream of a caveman on a bed of rocks.
SC.assume = c => {
  let s = bgSavanna({ seed: 41, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
  const r = rng(9);
  for (let i = 0; i < 9; i++) s += `<ellipse cx="${f1(1000 + r() * 520)}" cy="${f1(930 + r() * 50)}" rx="${f1(50 + r() * 40)}" ry="${f1(28 + r() * 16)}" fill="#A8A296" ${S} stroke-width="5"/>`;
  s += lying(1020, 900, 0.75, { t: c.t, seed: 2, face: 'tired', blanket: null });
  s += person(Object.assign({ x: 560, y: 965, s: 1.3, t: c.t, seed: 2, face: 'neutral' }, shrug));
  s += pop(800, 300, c.t, 0.35, questionMark(220, Math.sin(c.t * 3) * 8));
  return s + `<rect width="${W}" height="${H}" fill="#8C8270" opacity=".10"/>`;
};
SCN.microView = c => {
  let s = paper();
  s += g('translate(700 760) scale(1.1)', `<ellipse cx="0" cy="0" rx="230" ry="70" fill="#7A6A3A" ${S} stroke-width="5"/>` + [...Array(12)].map((_, i) => leaf(-200 + i * 36, -30 - (i % 3) * 8, -20 + i * 4, 0.6)).join(''));
  let inner = `<rect x="1060" y="160" width="600" height="600" fill="#EAF4E4"/>`;
  for (let i = 0; i < 7; i++) inner += g(`translate(${1200 + (i % 3) * 160} ${300 + Math.floor(i / 3) * 150}) rotate(${i * 30 + c.t * 20})`, bug(0.6, i % 3 ? 'good' : 'dry', c.t, i));
  return s + magnifier(1360, 460, 260, inner) + `<path d="M900 700 L1170 620" ${S} stroke-width="5" stroke-dasharray="12 10"/>` + hand('MOSTLY FROM THE FOREST', 960, 140, 70, c.t, 0.5, { col: C.green });
};
SCN.grandpa = (c, o) => {
  const st = o.step || 1;
  let s = st === 1 ? `<rect width="${W}" height="${H}" fill="#F3E7D3"/><rect x="1180" y="160" width="480" height="380" fill="#F6C27A" ${S} stroke-width="10"/><path d="M1420 160 V540 M1180 350 H1660" ${S} stroke-width="8"/><circle cx="1420" cy="470" r="60" fill="#F7883A" opacity=".8"/>`
    : `<rect width="${W}" height="${H}" fill="#2E3550"/><rect x="1260" y="560" width="360" height="260" rx="14" fill="#1C1A18" ${S} stroke-width="6"/><rect x="1280" y="580" width="320" height="200" fill="#6FA6D8" opacity="${f1(0.7 + Math.sin(c.t * 9) * 0.1)}"/>`;
  s += `<rect y="880" width="${W}" height="200" fill="${st === 1 ? '#C9A97A' : '#3E3A3C'}"/>`;
  if (st === 1) {
    s += person({ x: 760, y: 985, s: 1.4, kind: 'modern', t: c.t, seed: 14, long: false, face: 'happy', shirt: '#7D8F6A', hairC: '#B9B2A6', la: [-14, -6], ra: [70, 120], armsFront: true, front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1] - 10)})`, `<rect x="-30" y="-36" width="60" height="70" rx="10" fill="#FFFFFF" ${S} stroke-width="5"/>` + smoke(0, -50, c.t, { n: 4, rise: 120, drift: 10, op: 0.5 })) });
    s += g('translate(400 300)', `<circle r="110" fill="#FFFFFF" ${S} stroke-width="7"/>` + clock(0, 0, 100, 5, 0)) + hand('5 AM', 400, 480, 80, c.t, 0.3, { col: C.accent });
  } else {
    s += `<path d="M420 980 V600 Q420 520 520 520 H860 Q960 520 960 600 V980" fill="#8E5A3A" ${S} stroke-width="8"/><rect x="380" y="720" width="620" height="200" rx="40" fill="#A86A44" ${S} stroke-width="8"/>`;
    s += g('translate(690 620) rotate(-10)', `<circle r="62" fill="#FFFFFF" ${S} stroke-width="5.5"/><path d="M-58 -10 Q-60 -64 0 -64 Q60 -64 58 -10 Q40 -40 0 -42 Q-40 -40 -58 -10 Z" fill="#B9B2A6" ${S} stroke-width="4"/>` + faceSvg('sleep', c.t, 3));
    s += `<path d="M560 700 Q690 660 820 700 L840 820 H540 Z" fill="#7D8F6A" ${S} stroke-width="6"/>` + zzz(780, 520, c.t);
    s += g('translate(1700 300)', `<circle r="110" fill="#FFFFFF" ${S} stroke-width="7"/>` + clock(0, 0, 100, 9, 0)) + hand('9 PM', 1700, 480, 80, c.t, 0.3, { col: '#FFE9A8' });
  }
  return s;
};
