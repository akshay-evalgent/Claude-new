// Scenes for "How Did Ancient Kids Grow Up Without Schools?". Builds on the fridge, doctor and bed libraries.
'use strict';

Object.assign(PLACES, {
  efe: [28.6, 1.5], aka: [17.8, 3.7], sumer: [45.64, 31.32], prussia: [13.4, 52.5], newmexico: [-106.33, 32.78],
  normandy: [-1.48, 49.48], rouffignac: [0.99, 45.0], etiolles: [2.48, 48.63], philippines: [121.6, 17.2],
  australia: [134, -25], pyrenees: [1.2, 43.0],
});
Object.assign(REGIONS, {
  efe: { center: [24, 0], scale: 1500, hl: ['Dem. Rep. Congo'] },
  aka: { center: [19, 3], scale: 1700, hl: ['Central African Rep.', 'Congo'] },
  sumer: { center: [45, 32], scale: 2400, hl: ['Iraq'] },
  prussia: { center: [15, 52], scale: 2000, hl: ['Germany', 'Poland'] },
  newmexico: { center: [-106, 34], scale: 2600, hl: ['United States of America'] },
  normandy: { center: [0.5, 48.3], scale: 3800, hl: ['France'] },
  rouffignac: { center: [1.5, 46.2], scale: 3000, hl: ['France'] },
  etiolles: { center: [2.4, 47.6], scale: 3200, hl: ['France'] },
  philippines: { center: [122, 13], scale: 2000, hl: ['Philippines'] },
  australia: { center: [134, -26], scale: 900, hl: ['Australia'] },
  pyrenees: { center: [1.0, 43.6], scale: 4200, hl: ['France'] },
});

// ---------- small helpers ----------
const kid = (o) => person(Object.assign({ s: 0.62, bob: 1 }, o, { s: (o.s || 1) * 0.62 }));
const sit = { hip: 50, ll: [118, 8], rl: [106, -2] };
function chalk(txt, x, y, size, t, t0, o = {}) { return hand(txt, x, y, size, t, t0, Object.assign({ col: '#F3F1E6' }, o)); }
function footprint(x, y, s = 1, a = 0, col = '#9C8A6A', side = 1) {
  return g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${f1(s * side)} ${f1(s)})`, `<ellipse cx="0" cy="8" rx="13" ry="22" fill="${col}"/>` + [[-9, -22, 5.5], [-1, -26, 5], [6, -24, 4.4], [11, -19, 3.8], [14, -12, 3.2]].map(([a, b, r]) => `<circle cx="${a}" cy="${b}" r="${r}" fill="${col}"/>`).join(''));
}
function baby(s = 1) {
  return g(`scale(${s})`, `<path d="M-50 10 Q-60 80 0 90 Q60 80 50 10 Q0 -10 -50 10 Z" fill="#E8DCCB" ${S} stroke-width="5"/><circle cx="0" cy="-20" r="40" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-16 -22 q6 5 12 0 M6 -22 q6 5 12 0" fill="none" ${S} stroke-width="3.5"/><path d="M-6 -4 q6 4 12 0" fill="none" ${S} stroke-width="3"/>`);
}
function camp(t, o = {}) {
  let s = kalahari(t, o.dusk ? { sky: ['#E89A62', '#F6D7A8'], hills: '#C99A6A', ground: '#D8AE6E' } : {});
  return s + domeHut(o.h1 ?? 260, 690, 0.9) + domeHut(o.h2 ?? 1680, 680, 1.0) + (o.fire === false ? '' : fire(o.fx ?? 960, 900, 0.55, t));
}
function speech(x, y, w, h, tx, ty, inner = '') {
  return `<path d="M${x - w / 2 + 30} ${y - h / 2} H${x + w / 2 - 30} Q${x + w / 2} ${y - h / 2} ${x + w / 2} ${y - h / 2 + 30} V${y + h / 2 - 30} Q${x + w / 2} ${y + h / 2} ${x + w / 2 - 30} ${y + h / 2} H${(x + tx) / 2 + 30} L${tx} ${ty} L${(x + tx) / 2 - 10} ${y + h / 2} H${x - w / 2 + 30} Q${x - w / 2} ${y + h / 2} ${x - w / 2} ${y + h / 2 - 30} V${y - h / 2 + 30} Q${x - w / 2} ${y - h / 2} ${x - w / 2 + 30} ${y - h / 2} Z" fill="#FFFFFF" ${S} stroke-width="5"/>` + inner;
}

// ---------- modern school ----------
SCN.schoolRun = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#BFE3F2"/>` + sun(1650, 200, 70, c.t) + `<rect y="760" width="${W}" height="320" fill="#9C9A94"/><rect y="740" width="${W}" height="30" fill="#C9C6BE"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${60 + i * 480}" y="${360 - (i % 2) * 60}" width="360" height="${380 + (i % 2) * 60}" fill="${['#E8B28C', '#C9D3A6', '#E6C27A', '#B9C9D9'][i]}" ${S} stroke-width="5"/><rect x="${150 + i * 480}" y="${470 - (i % 2) * 60}" width="80" height="80" fill="#FFF6D8" ${S} stroke-width="4"/><rect x="${270 + i * 480}" y="${600}" width="70" height="140" fill="#8E5A3A" ${S} stroke-width="4"/>`;
  if (st === 1) {
    s += `<rect x="770" y="700" width="90" height="120" rx="16" fill="#3E7FA6" ${S} stroke-width="5"/>`;
    s += kid({ x: 840, y: 990, s: 1.6, kind: 'modern', t: c.t, seed: 4, face: 'tired', shirt: '#E05A4E', la: [-14, -6], ra: [14, 6] });
    s += g('translate(1500 600)', `<circle r="110" fill="#FFFFFF" ${S} stroke-width="7"/>` + clock(0, 0, 100, 7, 0));
  } else {
    const x = lerp(2200, 780, eout(clamp(c.t / 1.4)));
    let b = `<rect x="-520" y="-260" width="1040" height="300" rx="40" fill="#F2B517" ${S} stroke-width="7"/><rect x="-520" y="-60" width="1040" height="22" fill="#2B2118"/>`;
    for (let i = 0; i < 5; i++) b += `<rect x="${-420 + i * 170}" y="-220" width="130" height="110" rx="10" fill="#BFE3F2" ${S} stroke-width="5"/>` + g(`translate(${-355 + i * 170} -150) scale(.5)`, `<circle r="58" fill="#FFFFFF" ${S} stroke-width="6"/>` + faceSvg(i % 2 ? 'tired' : 'happy', c.t, i));
    b += `<rect x="440" y="-220" width="60" height="200" fill="#BFE3F2" ${S} stroke-width="5"/>`;
    for (const wx of [-330, 330]) b += `<circle cx="${wx}" cy="50" r="62" fill="#2B2118"/><circle cx="${wx}" cy="50" r="24" fill="#9C9A94"/>`;
    s += g(`translate(${f1(x)} 760)`, b) + hand('SCHOOL BUS', x, 650, 60, 1, DONE, { col: '#2B2118' });
  }
  return s;
};
SCN.classroom = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F1E6CF"/><rect y="820" width="${W}" height="260" fill="#C9A97A"/>`;
  s += `<rect x="220" y="140" width="900" height="420" rx="10" fill="#2F5D4A" stroke="#8E5A3A" stroke-width="22"/>`;
  s += chalk(o.empty ? '' : 'A B C   1 2 3', 670, 300, 90, 1, DONE) + chalk(o.empty ? '' : '2 + 2 = 4', 670, 440, 80, 1, DONE);
  s += g('translate(1700 260)' + (o.bell ? ` rotate(${f1(Math.sin(c.t * 40) * 12)})` : ''), `<path d="M-70 40 Q-70 -70 0 -70 Q70 -70 70 40 Z" fill="#E6B33C" ${S} stroke-width="6"/><circle cx="0" cy="52" r="16" fill="#8E6A2A" ${S} stroke-width="4"/>`);
  if (o.bell) for (let i = 0; i < 3; i++) s += `<path d="M${1790 + i * 26} ${200 + i * 6} q20 40 0 80 M${1610 - i * 26} ${200 + i * 6} q-20 40 0 80" fill="none" ${S} stroke-width="5" opacity="${f1(0.4 + 0.6 * Math.abs(Math.sin(c.t * 8 + i)))}"/>`;
  s += g('translate(1430 220)', `<circle r="60" fill="#FFFFFF" ${S} stroke-width="5"/>` + clock(0, 0, 54, 9, 0));
  s += person({ x: 1260, y: 900, s: 1.1, kind: 'modern', t: c.t, seed: 21, face: 'neutral', shirt: '#7A4E8A', la: [-14, -6], ra: [-120, -150], flip: true });
  const rows = [[860, 0.62], [980, 0.74]];
  rows.forEach(([y, k], r) => {
    for (let i = 0; i < 5; i++) {
      const x = 240 + i * 330 + (r ? -60 : 40);
      if (!o.empty) s += g(`translate(${x} ${y - 140 * k}) scale(${k})`, `<circle r="58" fill="#FFFFFF" ${S} stroke-width="6"/>` + (i % 2 ? `<path d="M-56 -8 Q-62 -66 -10 -66 Q50 -70 58 -10 Q44 -40 0 -44 Q-40 -42 -56 -8 Z" fill="${['#2B2118', '#6B4423', '#C99A5A'][(i + r) % 3]}" ${S} stroke-width="4"/>` : '') + faceSvg(['neutral', 'tired', 'think', 'neutral', 'tired'][(i + r) % 5], c.t, i + r) + `<rect x="-60" y="60" width="120" height="70" rx="20" fill="${['#E05A4E', '#3E7FA6', '#5E8A3C', '#E6B33C', '#7A4E8A'][(i + r * 2) % 5]}" ${S} stroke-width="6"/>`);
      s += `<rect x="${x - 130 * k}" y="${y - 30 * k}" width="${260 * k}" height="${40 * k}" fill="#B98A5A" ${S} stroke-width="5"/><path d="M${x - 110 * k} ${y + 10 * k} v${110 * k} M${x + 110 * k} ${y + 10 * k} v${110 * k}" ${S} stroke-width="6"/>`;
      if (o.test && !o.empty) s += pop(x + 40 * k, y - 50 * k, c.t, 0.2 + (i + r * 5) * 0.06, `<rect x="-40" y="-26" width="80" height="52" fill="#FFFFFF" ${S} stroke-width="3" transform="rotate(-8)"/><text x="0" y="14" font-family="Cap" font-size="36" fill="${C.red}" text-anchor="middle">${['B+', 'C', 'A', 'D', 'B'][(i + r) % 5]}</text>`);
    }
  });
  return s;
};

// ---------- the ancient child ----------
SCN.kidWake = c => {
  let s = kalahari(c.t, { sky: ['#F2B27A', '#FBE3B5'], hills: '#C99A6A', ground: '#D8AE6E' }) + domeHut(420, 690, 1.0) + domeHut(1500, 680, 1.1) + sun(1200, 560, 70, c.t);
  const k = eout(clamp(c.t / 1.2));
  s += kid({ x: 860, y: 1000, s: 2.7, t: c.t, seed: 5, long: true, hairC: C.hair2, face: k < 0.9 ? 'sleep' : 'happy', la: [lerp(-14, -150, k), lerp(-6, -170, k)], ra: [lerp(14, 150, k), lerp(6, 170, k)] });
  return s;
};
SCN.knowList = (c, o) => {
  const n = o.n ?? 0;
  let s = paper() + kid({ x: 960, y: 1000, s: 1.9, t: c.t, seed: 5, long: true, hairC: C.hair2, face: n ? 'think' : 'surprised', la: [-14, -6], ra: [150, -150 + Math.sin(c.t * 14) * 9], armsFront: true });
  const spots = [[420, 360], [1500, 360], [380, 740], [1540, 740]];
  const items = [
    () => leaf(-40, 0, -20, 1.0) + `<circle cx="40" cy="20" r="18" fill="#C0392B" ${S} stroke-width="3"/><circle cx="62" cy="-6" r="16" fill="#C0392B" ${S} stroke-width="3"/>` + `<path d="M-30 70 l20 20 l40 -40" fill="none" stroke="${C.green}" stroke-width="12" stroke-linecap="round"/><path d="M40 60 l40 40 M80 60 l-40 40" stroke="${C.red}" stroke-width="12" stroke-linecap="round"/>`,
    () => `<path d="M0 -90 Q60 0 50 40 Q40 90 0 90 Q-40 90 -50 40 Q-60 0 0 -90 Z" fill="#6FB5E0" ${S} stroke-width="6"/>`,
    () => footprint(-30, 0, 2.2, -10, '#8E6A4A') + g('translate(50 -10) scale(1.4)', `<ellipse cx="0" cy="10" rx="20" ry="16" fill="#8E6A4A"/>` + [[-18, -14], [-6, -22], [8, -22], [20, -14]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="7" ry="9" fill="#8E6A4A"/>`).join('')),
    () => baby(1.3),
  ];
  for (let i = 0; i < 4; i++) {
    const [x, y] = spots[i];
    s += `<circle cx="${x}" cy="${y}" r="150" fill="#FFFFFF" ${S} stroke-width="5" opacity=".85"/>`;
    if (i < n) s += pop(x, y, c.t, i === n - 1 ? 0.1 : DONE, items[i]());
  }
  return s;
};
SC.assume = c => {
  let s = bgSavanna({ seed: 43, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
  const sc = Math.sin(c.t * 9) * 12;
  s += person({ x: 1150, y: 965, s: 1.2, t: c.t, seed: 8, face: 'neutral', la: [-14, -6], ra: [150, -150 + sc], armsFront: true });
  s += kid({ x: 1460, y: 975, s: 1.3, t: c.t, seed: 9, face: 'neutral', la: [-14, -6], ra: [150, -150 - sc], armsFront: true });
  s += pop(1250, 470, c.t, 0.3, speech(0, 0, 220, 110, -60, 110, hand('UGH', 0, 25, 64, 1, DONE)));
  s += pop(1560, 640, c.t, 0.6, speech(0, 0, 200, 100, -50, 100, hand('UGH', 0, 22, 56, 1, DONE)));
  s += person(Object.assign({ x: 560, y: 965, s: 1.3, t: c.t, seed: 2, face: 'neutral' }, shrug));
  s += pop(800, 300, c.t, 0.35, questionMark(220, Math.sin(c.t * 3) * 8));
  return s + `<rect width="${W}" height="${H}" fill="#8C8270" opacity=".10"/>`;
};

// ---------- charts ----------
SCN.barChart = (c, o) => {
  const rows = o.rows || [['A', 1]], mx = o.max || Math.max(...rows.map(r => r[1])), n = rows.length;
  let s = paper() + `<path d="M300 840 H1620" ${S} stroke-width="6"/>`;
  const dx = Math.min(440, 1100 / n), x0 = 960 - dx * (n - 1) / 2;
  rows.forEach(([lab, v], i) => {
    const p = i === n - 1 ? eout(clamp(c.t / 0.8)) : 1, x = x0 + i * dx, hh = v / mx * 520 * p, hi = i === n - 1 && n > 1 || lab === 'HUMAN';
    s += `<rect x="${x - 100}" y="${f1(840 - hh)}" width="200" height="${f1(hh)}" fill="${hi ? C.accent : '#C9C2B0'}" ${S} stroke-width="5"/>` + hand(lab, x, 900, 58, 1, DONE);
    if (o.unit !== undefined) s += `<text x="${x}" y="${f1(820 - hh)}" font-family="Hand" font-size="56" text-anchor="middle" fill="${C.text}" opacity="${f1(p)}">${v}${o.unit}</text>`;
  });
  return s + hand(o.title || '', 960, 200, 90, c.t, 0.1);
};
SCN.brainKid = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 3) {
    s += `<path d="M260 860 H1680 M260 860 V220" ${S} stroke-width="6"/>` + hand('AGE', 1680, 920, 56, 1, DONE) + ['0', '5', '10', '15'].map((l, i) => hand(l, 260 + i * 467, 920, 48, 1, DONE)).join('');
    const p = clamp(c.t / 1.2), N = 80;
    let a = '', b = '';
    for (let i = 0; i <= Math.floor(N * p); i++) { const x = i / N, X = 260 + x * 1400; a += (i ? 'L' : 'M') + f1(X) + ' ' + f1(860 - 560 * Math.exp(-Math.pow((x - 0.33) / 0.18, 2))); b += (i ? 'L' : 'M') + f1(X) + ' ' + f1(860 - 520 * (0.85 * Math.exp(-x * 9) + 0.15 + 0.55 * Math.exp(-Math.pow((x - 0.85) / 0.08, 2)) - 0.12 * Math.exp(-Math.pow((x - 0.33) / 0.12, 2)))); }
    s += `<path d="${a}" fill="none" stroke="#E07A8A" stroke-width="12" stroke-linecap="round"/><path d="${b}" fill="none" stroke="#3E7FA6" stroke-width="12" stroke-linecap="round"/>`;
    return s + hand('BRAIN ENERGY', 760, 260, 60, c.t, 0.3, { col: '#C0506A' }) + hand('BODY GROWTH', 1400, 520, 60, c.t, 0.6, { col: '#3E7FA6' });
  }
  s += kid({ x: 700, y: 1000, s: 2.1, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'think', la: [-14, -6], ra: [14, 6] });
  s += pop(700, 330, c.t, 0.2, `<circle r="${f1(150 + Math.sin(c.t * 4) * 8)}" fill="#F7D6DC" opacity=".6"/><path d="M-90 10 Q-100 -70 -30 -80 Q0 -110 40 -80 Q100 -80 100 -10 Q110 50 50 60 Q0 80 -50 60 Q-100 60 -90 10 Z" fill="#F0A2B4" ${S} stroke-width="6"/><path d="M-50 -40 q20 20 0 40 M10 -60 q-20 30 10 50 M50 -30 q-20 20 0 50" fill="none" ${S} stroke-width="4"/>`);
  if (st === 2) {
    const p = eout(clamp(c.t / 1.0)), a = p * 0.66 * Math.PI * 2;
    s += g('translate(1380 520)', `<circle r="220" fill="none" stroke="#E8DFD0" stroke-width="70"/><path d="M0 -220 A220 220 0 ${a > Math.PI ? 1 : 0} 1 ${f1(220 * Math.sin(a))} ${f1(-220 * Math.cos(a))}" fill="none" stroke="#E07A8A" stroke-width="70"/><text x="0" y="40" font-family="Cap" font-size="130" text-anchor="middle" fill="${C.text}">${Math.round(66 * p)}%</text>`);
    s += hand('OF THE BODY\'S RESTING ENERGY', 1380, 860, 56, c.t, 0.4) + hand('AGE 4', 1380, 200, 80, c.t, 0.2, { col: C.accent });
  }
  return s;
};
SCN.skillCurve = (c, o) => {
  const st = o.step || 1;
  let s = paper() + `<path d="M260 860 H1680 M260 860 V220" ${S} stroke-width="6"/>` + hand('HUNTING SUCCESS', 270, 190, 56, 1, DONE, { anchor: 'start' }) + hand('AGE', 1680, 920, 56, 1, DONE);
  [0, 10, 20, 30, 40, 50, 60].forEach((a, i) => { s += hand(String(a), 260 + i * 236, 920, 44, 1, DONE, { col: '#6E6A62' }); });
  const p = st >= 2 ? clamp(c.t / 1.4) : 0, N = 90;
  let d = '';
  for (let i = 0; i <= Math.floor(N * p); i++) { const age = i / N * 60, y = 860 - 560 * Math.max(0, Math.min(1, (1 / (1 + Math.exp(-(age - 20) / 4.5))) - Math.max(0, (age - 38) / 60))); d += (i ? 'L' : 'M') + f1(260 + age / 60 * 1416) + ' ' + f1(y); }
  s += `<path d="${d}" fill="none" stroke="${C.accent}" stroke-width="12" stroke-linecap="round"/>`;
  if (st >= 3) s += `<path d="M${f1(260 + 18 / 60 * 1416)} 860 V300" stroke="#3E7FA6" stroke-width="6" stroke-dasharray="14 10"/>` + hand('STOPPED GROWING', 260 + 18 / 60 * 1416, 280, 50, c.t, 0.2, { col: '#3E7FA6' }) + pop(260 + 33 / 60 * 1416, 320, c.t, 0.5, `<circle r="26" fill="${C.accent}" ${S} stroke-width="5"/>`) + hand('BEST: 30s', 260 + 33 / 60 * 1416, 260, 56, c.t, 0.6, { col: C.accent });
  return s;
};

// ---------- animals ----------
function mound(x, y, s = 1) { return g(`translate(${x} ${y}) scale(${s})`, `<path d="M-200 0 Q-180 -200 -80 -380 Q-40 -460 0 -440 Q40 -470 70 -380 Q170 -200 200 0 Z" fill="#B9764A" ${S} stroke-width="6"/><path d="M-120 -120 q30 -20 60 0 M20 -250 q30 -20 50 0 M-40 -330 q20 -10 40 0" fill="none" stroke="#8E5A3A" stroke-width="6"/><circle cx="60" cy="-160" r="14" fill="#5C3A22"/>`); }
SCN.termiteFish = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9CF95"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#7FA86A' : '#6E9A5A'}"/>`;
  s += `<rect y="860" width="${W}" height="220" fill="#8C7A54"/>` + mound(1300, 900, 1.3);
  s += g('translate(880 880) scale(.85)', ape('chimp', c.t, {}));
  const pull = o.pull ? Math.max(0, Math.sin(c.t * 2)) * 60 : 0;
  s += `<path d="M${f1(990 - pull * 0.6)} ${f1(700 - pull * 0.2)} L${f1(1370 - pull)} ${f1(700 - pull * 0.3)}" stroke="${C.woodD}" stroke-width="9" stroke-linecap="round"/>`;
  if (o.pull) for (let i = 0; i < 7; i++) s += `<ellipse cx="${f1(1300 - pull - i * 14)}" cy="${f1(698 - pull * 0.3 + (i % 2 ? 7 : -7))}" rx="7" ry="4" fill="#3C2A1E"/>`;
  if (o.watch) { s += g('translate(620 900) scale(.42)', ape('chimp', c.t, {})); s += `<path d="M660 790 L840 720" stroke="${C.accent}" stroke-width="5" stroke-dasharray="10 10"/>` + hand('DAUGHTER', 620, 940, 56, c.t, 0.3, { col: '#FFFFFF' }); }
  if (o.play) { const r = c.t * 3; s += g(`translate(${f1(260 + Math.sin(c.t * 1.6) * 60)} 860) rotate(${f1(r * 57) % 360}) scale(.4)`, g('translate(0 130)', ape('chimp', c.t, {}))) + hand('SON', 260, 980, 56, c.t, 0.3, { col: '#FFFFFF' }); }
  return s;
};
SCN.nutCrack = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9CF95"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#7FA86A' : '#6E9A5A'}"/>`;
  s += `<rect y="860" width="${W}" height="220" fill="#8C7A54"/>`;
  const sw = Math.abs(Math.sin(c.t * 3)), x0 = o.fail ? 760 : 960, sc = o.fail ? 0.55 : 0.85;
  s += `<ellipse cx="${x0 + 180}" cy="880" rx="150" ry="50" fill="#9C978F" ${S} stroke-width="6"/><circle cx="${x0 + 180}" cy="836" r="22" fill="#8E5A3A" ${S} stroke-width="4"/>`;
  s += g(`translate(${x0 - 60} 900) scale(${sc})`, ape('chimp', c.t, {}));
  const hx = x0 + 120 + (o.fail ? 80 : 0), hy = lerp(620, 780, sw);
  s += `<path d="M${x0 - 60 + 100 * sc} ${f1(900 - 230 * sc)} Q${f1((x0 - 60 + 100 * sc + hx) / 2 + 30)} ${f1(Math.min(900 - 230 * sc, hy) - 60)} ${hx} ${f1(hy)}" fill="none" stroke="${C.ink}" stroke-width="${f1(56 * sc)}" stroke-linecap="round"/><path d="M${x0 - 60 + 100 * sc} ${f1(900 - 230 * sc)} Q${f1((x0 - 60 + 100 * sc + hx) / 2 + 30)} ${f1(Math.min(900 - 230 * sc, hy) - 60)} ${hx} ${f1(hy)}" fill="none" stroke="#3E342E" stroke-width="${f1(42 * sc)}" stroke-linecap="round"/>`;
  s += `<ellipse cx="${hx}" cy="${f1(hy)}" rx="52" ry="38" fill="#7E7A72" ${S} stroke-width="5"/>`;
  if (o.fail) { s += pop(x0 + 360, 700, c.t, 0.3, questionMark(140, -10)) + `<circle cx="${f1(x0 + 180 + (c.t * 300) % 600)}" cy="${f1(836 - Math.sin(c.t * 4) * 60)}" r="20" fill="#8E5A3A" ${S} stroke-width="4"/>`; }
  return s;
};
function meerkatShape(s = 1, t = 0) {
  return g(`scale(${s})`, `<path d="M-40 0 Q-50 -120 -30 -220 Q0 -250 30 -220 Q50 -120 40 0 Z" fill="#C9A06A" ${S} stroke-width="5"/><path d="M-26 -60 Q0 -40 26 -60 V-10 Q0 0 -26 -10 Z" fill="#E3C99A"/><ellipse cx="0" cy="-260" rx="34" ry="40" fill="#C9A06A" ${S} stroke-width="5"/><ellipse cx="-13" cy="-262" rx="9" ry="7" fill="#2B2118"/><ellipse cx="13" cy="-262" rx="9" ry="7" fill="#2B2118"/><circle cx="0" cy="-238" r="6" fill="#2B2118"/><path d="M-20 -140 l-24 30 M20 -140 l24 30" ${S} stroke-width="8"/><path d="M30 -10 q60 10 70 70" fill="none" ${S} stroke-width="8"/>`);
}
function scorpion(s = 1, mode = 'live', t = 0) {
  const w = mode === 'dead' ? 0 : Math.sin(t * 6) * 6;
  let o = `<ellipse cx="0" cy="0" rx="60" ry="26" fill="#6E4A2A" ${S} stroke-width="4"/>`;
  for (let i = 0; i < 4; i++) o += `<path d="M${-30 + i * 20} 16 l-14 ${f1(24 + w)} M${-30 + i * 20} -16 l-14 ${f1(-24 - w)}" ${S} stroke-width="4"/>`;
  o += `<path d="M-60 -10 l-40 -24 l-10 14 M-60 10 l-40 24 l-10 -14" fill="none" ${S} stroke-width="5"/>`;
  o += mode === 'nosting' ? `<path d="M60 0 Q110 -20 120 -70" fill="none" stroke="#6E4A2A" stroke-width="14" stroke-linecap="round"/>` : `<path d="M60 0 Q110 -20 120 -70 Q118 -110 90 -110" fill="none" stroke="#6E4A2A" stroke-width="14" stroke-linecap="round"/><path d="M90 -110 l-16 -14 l4 22 Z" fill="#2B2118"/>`;
  if (mode === 'dead') o += `<path d="M-20 -8 l12 12 M-8 -8 l-12 12" stroke="#FFFFFF" stroke-width="4"/>`;
  return g(`scale(${s})${mode === 'dead' ? ' rotate(180)' : ''}`, o);
}
SCN.meerkat = (c, o) => {
  const st = o.step || 0;
  let s = `<rect width="${W}" height="${H}" fill="#F2D9A6"/><rect y="760" width="${W}" height="320" fill="#D9B27A"/>` + sun(1650, 180, 70, c.t);
  s += g('translate(620 900) scale(1.5)', meerkatShape(1, c.t)) + g('translate(1320 920) scale(1.0)', meerkatShape(1, c.t));
  if (st) s += g('translate(980 880) scale(1.4)', scorpion(1, ['dead', 'nosting', 'live'][st - 1], c.t)) + hand(['DEAD', 'NO STING', 'THE REAL THING'][st - 1], 980, 220, 100, c.t, 0.2, { col: st === 3 ? C.red : C.text });
  else s += hand('ADULT', 620, 1000, 56, c.t, 0.2) + hand('PUP', 1320, 1000, 56, c.t, 0.3);
  return s;
};

// ---------- babies and carers ----------
SCN.alloCare = (c, o) => {
  const st = o.step || 1;
  let s = camp(c.t, { fire: st >= 3 });
  if (st === 1) return s + `<ellipse cx="960" cy="900" rx="240" ry="40" fill="${C.ink}" opacity=".1"/>` + g('translate(960 800)', baby(2.0)) + hand('HELPLESS', 960, 220, 100, c.t, 0.3);
  if (st === 2) return s + person({ x: 960, y: 990, s: 1.4, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 20)})`, baby(0.9)) });
  if (st === 5) {
    s += person({ x: 760, y: 990, s: 1.3, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', ...sit, la: [40, 80], ra: [60, 110], armsFront: true, front: (L, R) => g(`translate(${f1(R[0] + 20)} ${f1(R[1])}) rotate(-20)`, `<rect x="-6" y="-60" width="12" height="80" rx="4" fill="${C.woodD}"/><path d="M-10 -60 L0 -120 L10 -60 Z" fill="#B8BCC2" ${S} stroke-width="3"/>`) });
    s += kid({ x: 1080, y: 990, s: 1.3, t: c.t, seed: 9, face: 'think', ...sit, la: [40, 80], ra: [60, 110], armsFront: true, flip: true, front: (L, R) => g(`translate(${f1(R[0] - 20)} ${f1(R[1])}) rotate(20)`, `<rect x="-5" y="-40" width="10" height="60" rx="4" fill="${C.woodD}"/><path d="M-8 -40 L0 -80 L8 -40 Z" fill="#B8BCC2" ${S} stroke-width="3"/>`) });
    return s + `<path d="M900 640 Q960 600 1020 660" fill="none" stroke="${C.accent}" stroke-width="6" stroke-dasharray="12 10"/>`;
  }
  const carers = [[420, 'grandma'], [760, 'aunt'], [1160, 'dad'], [1500, 'sib']];
  carers.forEach(([x, k], i) => {
    const o2 = { x, y: 990, s: k === 'sib' ? 0.8 : 1.15, t: c.t, seed: 3 + i * 5, face: 'happy', la: [-14, -6], ra: [14, 6] };
    if (k === 'grandma') Object.assign(o2, { long: true, keepHair: true, hairC: '#B9B2A6' });
    if (k === 'aunt') Object.assign(o2, { long: true, hairC: C.hair2 });
    if (k === 'dad') Object.assign(o2, { beard: true });
    s += pop(x, 990, c.t, st === 3 ? 0.1 + i * 0.15 : DONE, person(Object.assign(o2, { x: 0, y: 0 })));
    if (st === 3) s += hand(['GRANDMA', 'AUNT', 'DAD', 'BIG SISTER'][i], x, 1050 - 760, 52, c.t, 0.3 + i * 0.15);
  });
  if (st === 4) {
    const k = (c.t * 0.5) % 4, i = Math.floor(k), f = eio(clamp((k - i) * 2)), a = carers[i][0], b = carers[(i + 1) % 4][0];
    s += g(`translate(${f1(lerp(a, b, f))} ${f1(720 - Math.sin(f * Math.PI) * 80)})`, baby(0.8));
    s += hand('PASSED FROM ARMS TO ARMS', 960, 220, 80, c.t, 0.2);
  }
  return s;
};
SCN.sibling = c => {
  let s = camp(c.t, { fx: 1500 });
  s += kid({ x: 800, y: 990, s: 1.7, t: c.t, seed: 7, long: true, hairC: C.hair2, face: 'happy', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1] - 30)})`, baby(0.7)) });
  s += kid({ x: 1150, y: 990, s: 1.1, t: c.t, seed: 9, face: 'laugh', la: [-150, -170], ra: [150, 170] });
  return s + hand('OLDER SISTER', 800, 260, 70, c.t, 0.3);
};
SCN.whiteSands = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#EFE8DA"/>`;
  const r = rng(13);
  for (let i = 0; i < 40; i++) s += `<path d="M${f1(r() * W)} ${f1(r() * H)} q30 -6 60 0" fill="none" stroke="#DCD3C0" stroke-width="4"/>`;
  const path = x => 540 + Math.sin(x / 260) * 120;
  const out = st >= 4 ? 1 : st === 1 ? clamp(c.t / 1.6) : 1;
  for (let i = 0; i < 26; i++) { const x = 60 + i * 72; if (x > 60 + 1800 * out) break; s += footprint(x, path(x) + (i % 2 ? 26 : -26), 1.1, 90, '#B9A88A', i % 2 ? 1 : -1); }
  if (st >= 2) [[420, 0], [1020, 0.25], [1500, 0.5]].forEach(([x, t0]) => { s += pop(x, path(x) + 90, c.t, st === 2 ? t0 : DONE, footprint(-14, 0, 0.55, 90, '#8E6A4A') + footprint(14, 20, 0.55, 90, '#8E6A4A', -1) + footprint(30, -6, 0.55, 90, '#8E6A4A')) + (st === 2 ? pop(x, path(x) + 170, c.t, t0 + 0.2, `<rect x="-90" y="-34" width="180" height="56" rx="12" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand('TODDLER', 0, 10, 40, 1, DONE)) : ''); });
  if (st >= 3) { for (let i = 0; i < 7; i++) s += `<circle cx="${700 + i * 40}" cy="${120 + i * 130}" r="${36}" fill="#A8977A" opacity=".8"/>`; for (let i = 0; i < 6; i++) s += `<ellipse cx="${1240 - i * 30}" cy="${160 + i * 140}" rx="22" ry="40" fill="#A8977A" opacity=".8"/>`; s += hand('MAMMOTH', 840, 100, 52, c.t, 0.2, { col: '#6E5E44' }) + hand('GIANT SLOTH', 1300, 100, 52, c.t, 0.4, { col: '#6E5E44' }); }
  if (st >= 4) { const p = clamp(c.t / 1.6); for (let i = 0; i < 26; i++) { const x = 1860 - i * 72; if (x < 1860 - 1800 * p) break; s += footprint(x, path(x) - 150 + (i % 2 ? 26 : -26), 1.1, -90, '#9C8A6A', i % 2 ? 1 : -1); } s += arrow(1600, 300, 1300, 300, c.t, 0.3, 0.4, C.ink) + hand('BACK, ALONE', 1450, 250, 56, c.t, 0.5); }
  return s + (st === 1 ? hand('1.5 KM+', 960, 160, 80, c.t, 0.3, { col: C.accent }) : '');
};
SCN.carryKid = (c, o) => {
  let s = kalahari(c.t, { sky: ['#CFE6EE', '#F6F0E2'], hills: '#E6DCC6', ground: '#EFE6D2', trees: false });
  if (!o.lift) {
    const x = 760 + c.t * 60;
    s += person({ x, y: 990, s: 1.5, t: c.t * 1.5, seed: 5, long: true, hairC: C.hair2, face: 'happy', ll: [Math.sin(c.t * 7) * 24, Math.sin(c.t * 7) * 10], rl: [-Math.sin(c.t * 7) * 24, -Math.sin(c.t * 7) * 10], la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1(R[0])} ${f1(R[1] - 70)})`, kid({ x: 0, y: 140, s: 0.55, t: c.t, seed: 9, face: 'happy', la: [-40, -60], ra: [40, 60] })) });
  } else {
    s += person({ x: 900, y: 990, s: 1.5, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [40, 80] }) + kid({ x: 1120, y: 990, s: 0.9, t: c.t, seed: 9, face: 'laugh', la: [-150, -170], ra: [150, 170] });
  }
  return s;
};

// ---------- play ----------
SCN.kidsPlay = (c, o) => {
  let s = camp(c.t, { fx: 1560 });
  const k = Math.sin(c.t * 9) * 22, run = (c.t * 120) % 500;
  s += kid({ x: 420 + run * 0.6, y: 990, s: 1.5, t: c.t, seed: 4, face: 'laugh', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-40, -60], ra: [40, 60] });
  s += kid({ x: 620 + run * 0.6, y: 1000, s: 1.0, t: c.t, seed: 9, face: 'laugh', long: true, hairC: C.hair2, ll: [k, k * 0.6], rl: [-k, -k * 0.6], la: [-150, -170], ra: [150, 170] });
  s += kid({ x: 1180, y: 1000, s: 1.9, t: c.t, seed: 12, face: 'happy', la: [-14, -6], ra: [-80, -110], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, `<path d="M0 -70 Q40 0 0 70" fill="none" stroke="${C.woodD}" stroke-width="7"/><path d="M0 -70 L0 70" stroke="#E8DCCB" stroke-width="3"/>`) });
  s += kid({ x: 1360, y: 1000, s: 0.75, t: c.t, seed: 15, face: 'surprised', la: [-14, -6], ra: [14, 6] });
  if (o.ages) [[540, '3'], [1180, '12'], [1360, '2'], [740, '6']].forEach(([x, a], i) => { s += pop(x + (i < 2 && i !== 1 ? run * 0.6 : 0), 520, c.t, 0.2 + i * 0.12, `<circle r="44" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand(a, 0, 20, 56, 1, DONE)); });
  return s;
};
SCN.toyBow = (c, o) => {
  let s = today(() => camp(c.t, { fx: 300, h1: 1700, h2: 1880 }));
  const big = !!o.teen, x = 700;
  s += today(() => kid({ x, y: 1000, s: big ? 2.4 : 1.6, t: c.t, seed: 4, face: 'think', la: [-80, -80], ra: [-90, -170], armsFront: true, front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1])})`, `<path d="M0 ${big ? -110 : -70} Q${big ? 50 : 34} 0 0 ${big ? 110 : 70}" fill="none" stroke="${C.woodD}" stroke-width="8"/><path d="M0 ${big ? -110 : -70} L-30 0 L0 ${big ? 110 : 70}" fill="none" stroke="#E8DCCB" stroke-width="3"/>`) }));
  const p = o.shoot ? (c.t * 0.9) % 1 : 0;
  if (o.shoot) s += `<path d="M${f1(x + 120 + p * 760)} ${f1(620 - Math.sin(p * Math.PI) * 80)} l60 0" stroke="${C.woodD}" stroke-width="6"/>`;
  s += g('translate(1450 900)', `<path d="M0 0 V-260" stroke="${C.woodD}" stroke-width="10"/><circle cx="0" cy="-300" r="60" fill="#E6C27A" ${S} stroke-width="6"/><circle cx="0" cy="-300" r="30" fill="${C.red}" opacity=".8"/>`);
  if (big) s += hand('TEENAGE HUNTER', 960, 200, 90, c.t, 0.3);
  else s += hand('AGE 3', 700, 360, 80, c.t, 0.3, { col: C.accent });
  return s;
};
function baobab(x, y, s = 1) { return g(`translate(${x} ${y}) scale(${s})`, `<path d="M-90 0 Q-110 -200 -60 -330 L60 -330 Q110 -200 90 0 Z" fill="#B99C7A" ${S} stroke-width="6"/><path d="M-50 -320 Q-160 -400 -240 -380 M-20 -330 Q-40 -450 -120 -500 M30 -330 Q60 -450 140 -480 M50 -320 Q170 -380 250 -360" fill="none" stroke="#9C7E5C" stroke-width="22" stroke-linecap="round"/>` + [[-240, -380], [-120, -500], [140, -480], [250, -360], [0, -420]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="60" fill="#7FA34E" ${S} stroke-width="5"/>`).join('') + [[-180, -340], [180, -330], [60, -360]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="16" ry="30" fill="#C9B07A" ${S} stroke-width="3"/>`).join('')); }
SCN.kidForage = (c, o) => {
  let s = kalahari(c.t) + baobab(1300, 880, 1.3);
  s += today(() => {
    let p = '';
    if (o.dig) p += kid({ x: 620, y: 1000, s: 2.3, t: c.t, seed: 5, long: true, face: 'think', ...sit, la: [60, 110], ra: [50, 100], armsFront: true, front: (L, R) => `<path d="M${f1(R[0])} ${f1(R[1] - 40)} l${f1(60 + Math.sin(c.t * 8) * 10)} 140" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>` }) + `<ellipse cx="760" cy="1010" rx="60" ry="24" fill="#B98E5A" ${S} stroke-width="4"/>`;
    else p += kid({ x: 620, y: 1000, s: 2.2, t: c.t, seed: 5, long: true, face: o.eat ? 'laugh' : 'happy', la: [-14, -6], ra: o.eat ? [150, -150] : [-100, -160], armsFront: !!o.eat, holdR: o.eat ? null : e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1] - 20)}" rx="18" ry="32" fill="#C9B07A" ${S} stroke-width="3"/>` });
    p += kid({ x: 960, y: 1010, s: 1.6, t: c.t, seed: 9, face: 'happy', la: [-150, -170], ra: [14, 6] });
    p += kid({ x: 1620, y: 1010, s: 1.9, t: c.t, seed: 12, long: true, face: 'laugh', la: [-14, -6], ra: [40, 60] });
    return p;
  });
  return s + pop(1600, 760, c.t, 0.3, `<circle cx="-30" cy="0" r="14" fill="#C0392B" ${S} stroke-width="3"/><circle cx="0" cy="-10" r="14" fill="#C0392B" ${S} stroke-width="3"/><circle cx="24" cy="4" r="14" fill="#7A2B4A" ${S} stroke-width="3"/>`);
};
SCN.footprints = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#D9C9A6"/>`;
  const r = rng(21);
  for (let i = 0; i < 60; i++) {
    const big = i % 7 === 0, x = 80 + r() * 1760, y = 80 + r() * 920, a = r() * 360;
    const hl = o.kids && !big ? clamp((c.t - 0.2 - i * 0.01) / 0.3) : 0;
    s += footprint(x, y, big ? 1.4 : 0.8, a, hl ? '#E6A23C' : '#A8946E', i % 2 ? 1 : -1);
  }
  if (o.kids) s += pop(960, 160, c.t, 0.6, `<rect x="-420" y="-60" width="840" height="100" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('MOSTLY CHILDREN', 0, 20, 76, 1, DONE, { col: C.accent }));
  else s += hand('80,000 YEARS OLD', 960, 160, 90, c.t, 0.3);
  return s;
};

// ---------- caves ----------
function caveRoom(t) { return `<rect width="${W}" height="${H}" fill="#3A2E24"/><path d="M0 0 H1920 V260 Q1500 340 960 300 Q400 260 0 340 Z" fill="#6E5A44"/><path d="M0 1080 V860 Q500 800 960 840 Q1500 880 1920 820 V1080 Z" fill="#5C4836"/>`; }
function lamp(x, y, t, s = 1) { return `<circle cx="${x}" cy="${y - 40 * s}" r="${360 * s}" fill="#F7B84A" opacity=".18"/>` + g(`translate(${x} ${y}) scale(${s})`, `<path d="M-50 0 Q-50 30 0 30 Q50 30 50 0 Z" fill="#9C978F" ${S} stroke-width="5"/>`) + fire(x, y - 2 * s, 0.22 * s, t); }
SCN.caveKids = c => {
  let s = caveRoom(c.t) + lamp(960, 900, c.t, 1.4);
  const r = rng(5);
  for (let i = 0; i < 7; i++) { const x = 300 + i * 220, y = 420 + r() * 200, k = 0.6 + r() * 0.5; s += g(`translate(${x} ${y}) scale(${k}) rotate(${-20 + r() * 40})`, `<path d="M-30 60 Q-40 0 -36 -40 L-30 -90 M-14 -10 L-12 -110 M4 -10 L6 -115 M20 -6 L26 -100 M30 20 L60 -30" stroke="#C0392B" stroke-width="22" stroke-linecap="round" opacity=".55"/><ellipse cx="0" cy="40" rx="40" ry="50" fill="#C0392B" opacity=".55"/>`); }
  return s + hand('SMALL HANDS', 960, 200, 90, c.t, 0.3, { col: '#F3EBDD' });
};
SCN.flutings = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#7A5E44"/>`;
  s += `<path d="M0 0 H1920 V640 Q1400 700 960 660 Q500 620 0 700 Z" fill="#B99A72"/>`;
  const r = rng(8);
  for (let gI = 0; gI < 14; gI++) {
    const x = 100 + r() * 1720, y = 60 + r() * 480, a = -30 + r() * 60, n = 3 + Math.floor(r() * 2), small = gI % 3 !== 0;
    let p = ''; for (let k = 0; k < n; k++) p += `M${k * (small ? 18 : 30)} 0 q${f1(40 + r() * 40)} ${f1(80 + r() * 60)} ${f1(10 + r() * 30)} ${f1(180 + r() * 80)} `;
    s += g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})`, `<path d="${p}" fill="none" stroke="#8E6E4E" stroke-width="${small ? 9 : 15}" stroke-linecap="round"/>`);
  }
  if (o.measure) s += g('translate(1100 300)', `<path d="M-60 -60 h160 M-60 -60 v40 M100 -60 v40" fill="none" stroke="${C.accent}" stroke-width="6"/>`) + hand('CHILD-SIZED', 1120, 200, 70, c.t, 0.3, { col: '#FFF3D6' });
  if (o.lift) {
    s += lamp(560, 1000, c.t, 1.2);
    const k = eout(clamp(c.t / 1.0));
    s += person({ x: 980, y: 1120, s: 1.5, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-150, -170], ra: [150, 170] });
    s += kid({ x: 980, y: lerp(820, 640, k), s: 1.25, t: c.t, seed: 9, face: 'laugh', la: [-150, -170], ra: [-160, -175], ll: [-6, -2], rl: [6, 2] });
    s += `<path d="M${f1(940 + Math.sin(c.t * 2) * 30)} 330 q20 40 10 80 M${f1(960 + Math.sin(c.t * 2) * 30)} 330 q20 40 10 80" fill="none" stroke="#5C4430" stroke-width="7" opacity="${f1(k)}"/>`;
  }
  return s;
};
SCN.trackers = (c, o) => {
  let s = caveRoom(c.t) + `<path d="M0 1080 V880 Q500 840 960 860 Q1500 890 1920 850 V1080 Z" fill="#9C8466"/>`;
  const r = rng(31);
  for (let i = 0; i < 18; i++) { const x = 140 + i * 96 + r() * 30, y = 990 + (i % 2) * 40, kidP = o.kids && i % 3 !== 0; s += footprint(x, y, kidP ? 0.9 : 1.3, 80 + r() * 20, kidP ? '#F2B84A' : '#5C4836', i % 2 ? 1 : -1); }
  s += today(() => [[560, 'think'], [1000, o.read ? 'surprised' : 'think'], [1400, 'happy']].map(([x, f], i) => person({ x, y: 990, s: 1.2, t: c.t, seed: 4 + i * 3, face: f, ...sit, la: [40, 80], ra: i === 1 && o.read ? [70, 110] : [40, 80], armsFront: true, flip: i === 2 })).join(''));
  for (const x of [560, 1000, 1400]) s += `<path d="M${x} 640 L${x - 160} 980 L${x + 160} 980 Z" fill="#FFF6D0" opacity=".10"/><circle cx="${x}" cy="640" r="12" fill="#FFF6D0"/>`;
  if (o.kids) s += pop(960, 200, c.t, 0.4, `<rect x="-400" y="-60" width="800" height="100" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('CHILDREN WERE HERE', 0, 20, 70, 1, DONE, { col: C.accent }));
  return s;
};
SCN.kidsTrack = c => {
  let s = today(() => kalahari(c.t));
  for (let i = 0; i < 8; i++) s += g(`translate(${900 + i * 110} ${960 + (i % 2) * 30}) scale(1.4)`, `<ellipse cx="0" cy="10" rx="18" ry="14" fill="#9C7A55"/>` + [[-16, -12], [-5, -20], [7, -20], [18, -12]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="6" ry="8" fill="#9C7A55"/>`).join(''));
  s += today(() => person({ x: 760, y: 990, s: 1.4, t: c.t, seed: 6, face: 'think', ...sit, la: [40, 80], ra: [70, 120], armsFront: true }) + kid({ x: 480, y: 1000, s: 1.4, t: c.t, seed: 9, face: 'surprised', la: [-14, -6], ra: [14, 6] }) + kid({ x: 300, y: 1000, s: 1.1, t: c.t, seed: 12, long: true, face: 'think', ...sit, la: [40, 80], ra: [70, 120], armsFront: true }));
  return s;
};

// ---------- tools ----------
function core(s = 1, seed = 3) { const r = rng(seed); const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = 60 + r() * 26; pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.8]); } return g(`scale(${s})`, `<path d="${smooth(pts)}" fill="#7E7A72" ${S} stroke-width="5"/><path d="M-30 -10 l20 -20 l26 10 M10 20 l24 -6" fill="none" stroke="#5E5A54" stroke-width="4"/>`); }
SCN.knapping = (c, o) => {
  let s = camp(c.t, { fx: 960 });
  const hit = Math.abs(Math.sin(c.t * 4));
  if (o.expert || (!o.kid && !o.fail)) {
    const x = o.kid ? 1280 : 960;
    s += person({ x, y: 990, s: 1.4, t: c.t, seed: 14, face: 'think', beard: true, ...sit, la: [60, 100], ra: [lerp(20, 80, hit), lerp(80, 130, hit)], armsFront: true, flip: !!o.kid, front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1])})`, core(0.6, 3)) + g(`translate(${f1(R[0])} ${f1(R[1])})`, `<ellipse rx="26" ry="20" fill="#9C978F" ${S} stroke-width="4"/>`) });
    for (let i = 0; i < 4; i++) { const p = (c.t * 2 + i / 4) % 1; s += `<path d="M${f1(x + (o.kid ? -80 : 80) + p * (o.kid ? -160 : 160) * (i % 2 ? 1 : -0.4))} ${f1(800 - Math.sin(p * Math.PI) * 120 + p * 120)} l14 -6 l4 12 Z" fill="#B8B2A8" stroke="${C.ink}" stroke-width="2"/>`; }
  }
  if (o.kid || o.fail) {
    const x = o.expert ? 640 : 900;
    s += kid({ x, y: 990, s: 1.6, t: c.t, seed: 9, face: o.fail ? 'scared' : 'think', ...sit, la: [60, 100], ra: [lerp(20, 80, hit), lerp(80, 130, hit)], armsFront: true, front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1])})`, core(0.45, 7)) + g(`translate(${f1(R[0])} ${f1(R[1])})`, `<ellipse rx="20" ry="16" fill="#9C978F" ${S} stroke-width="4"/>`) });
    const r = rng(19); for (let i = 0; i < 9; i++) s += `<path d="M${f1(x - 140 + r() * 280)} ${f1(980 + r() * 50)} l10 -4 l2 8 Z" fill="#B8B2A8" stroke="${C.ink}" stroke-width="2"/>`;
    if (o.fail) s += pop(x + 120, 700, c.t, 0.3, `<path d="M0 -50 L12 -14 L50 -14 L20 8 L32 46 L0 22 L-32 46 L-20 8 L-50 -14 L-12 -14 Z" fill="#F2C443" ${S} stroke-width="4"/>`) + hand('OUCH', x + 120, 620, 56, c.t, 0.4, { col: C.red });
  }
  return s;
};
function handaxeShape(s = 1, good = true) {
  if (!good) return g(`scale(${s})`, `<path d="M-60 60 L-80 -10 L-30 -70 L40 -50 L70 20 L20 80 Z" fill="#9C978F" ${S} stroke-width="6"/><path d="M-30 -20 l30 20 M10 -40 l10 50" stroke="#6E6A62" stroke-width="5"/>`);
  return g(`scale(${s})`, `<path d="M0 -180 Q70 -60 80 40 Q70 130 0 150 Q-70 130 -80 40 Q-70 -60 0 -180 Z" fill="#A8A296" ${S} stroke-width="6"/>` + [[-40, -60, 20], [30, -20, -20], [-30, 40, 30], [30, 80, -30], [0, -120, 10]].map(([x, y, a]) => `<path d="M${x - 24} ${y} q24 ${a / 2} 48 0" fill="none" stroke="#7E7A72" stroke-width="5"/>`).join(''));
}
SCN.handaxe = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) { const h = Math.min(90, Math.floor(c.t * 30)); s += g('translate(700 560)', handaxeShape(2.2)) + g('translate(1350 480)', `<circle r="150" fill="#FFFFFF" ${S} stroke-width="7"/>` + clock(0, 0, 140, (h / 6) % 12, (h * 10) % 60)) + hand(`${h} HOURS`, 1350, 760, 100, c.t, 0.1, { col: C.accent }); }
  else s += g('translate(620 560)', handaxeShape(1.8, false)) + g('translate(1300 560)', handaxeShape(1.8, true)) + hand('BEGINNER', 620, 860, 70, c.t, 0.2) + hand('ANCIENT EXPERT', 1300, 920, 70, c.t, 0.4, { col: C.accent });
  return s;
};
SCN.refit = (c, o) => {
  let s = paper();
  const k = o.build ? eio(clamp(c.t / 1.6)) : 0;
  const pieces = [[-120, -60, -300, -200], [40, -90, 200, -260], [110, 30, 340, 120], [-60, 70, -260, 250], [0, 0, 0, 0], [-140, 40, -420, 60]];
  pieces.forEach(([x, y, ox, oy], i) => { const px = 960 + lerp(x + ox, x, k), py = 560 + lerp(y + oy, y, k); s += g(`translate(${f1(px)} ${f1(py)}) rotate(${f1(lerp(i * 40, 0, k))})`, `<path d="M-60 -40 L50 -50 L70 30 L-10 60 L-70 20 Z" fill="${['#8E8A82', '#9C978F', '#7E7A72', '#A8A296', '#6E6A62', '#8A867E'][i]}" ${S} stroke-width="5"/>`); });
  return s + hand(o.build ? 'PUT BACK TOGETHER' : 'BROKEN FLAKES', 960, 200, 90, c.t, 0.2);
};

// ---------- stories ----------
SCN.talkChart = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const pie = (x, y, frac, col, t0, labA, labB) => { const p = eout(clamp((c.t - t0) / 0.8)), a = frac * p * Math.PI * 2; return `<circle cx="${x}" cy="${y}" r="200" fill="#E8DFD0" ${S} stroke-width="6"/>` + (a > 0.01 ? `<path d="M${x} ${y} L${x} ${y - 200} A200 200 0 ${a > Math.PI ? 1 : 0} 1 ${f1(x + 200 * Math.sin(a))} ${f1(y - 200 * Math.cos(a))} Z" fill="${col}" ${S} stroke-width="6"/>` : '') + hand(labA, x, y + 290, 64, c.t, t0 + 0.4, { col }) + hand(labB, x, y + 360, 48, c.t, t0 + 0.5); };
  s += g('translate(560 200)', sun(0, 0, 60, c.t)) + hand('DAY', 560, 330, 80, c.t, DONE) + g('translate(1360 200)', icon('moon', c.t)) + hand('NIGHT', 1360, 330, 80, c.t, DONE);
  if (st >= 2) s += pie(560, 560, 0.07, '#6F8FB5', st === 2 ? 0.2 : -9, 'UNDER 1 IN 10: STORIES', 'MOSTLY WORK & COMPLAINTS');
  if (st >= 3) s += pie(1360, 560, 0.81, C.accent, 0.2, '81% STORIES', 'LONG TALKS BY THE FIRE');
  return s;
};
SCN.storyFire = (c, o) => {
  let s = bgNight(c.t, { seed: 401 }) + `<ellipse cx="960" cy="920" rx="760" ry="200" fill="#F28C28" opacity=".26"/>` + fire(960, 920, 0.8, c.t);
  const k = Math.sin(c.t * 5) * 20;
  s += person({ x: 1380, y: 990, s: 1.35, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: 'laugh', ...sit, la: [-60 + k, -120], ra: [60, 110], flip: true });
  [[420, 1.1, 4], [620, 0.85, 9], [800, 1.0, 12]].forEach(([x, sc, sd]) => { s += kid({ x, y: 1000, s: sc * 1.4, t: c.t, seed: sd, face: 'surprised', ...sit, la: [40, 80], ra: [40, 80], long: sd === 9 }); });
  if (o.elder) s += [0, 1, 2].map(i => `<path d="M${1380 + Math.cos(c.t + i * 2) * 140} ${600 + Math.sin(c.t + i * 2) * 40} l8 18 l20 2 l-15 13 l5 20 l-18 -10 l-18 10 l5 -20 l-15 -13 l20 -2 Z" fill="#F2C443" ${S} stroke-width="3"/>`).join('');
  if (o.bubble) s += pop(900, 340, c.t, 0.2, thought(0, 0, 420, 220, 420, 300) + g('translate(-150 80) scale(.5)', person({ x: 0, y: 0, t: c.t, seed: 3, face: 'scared', ll: [-40, -20], rl: [40, 20], la: [-150, -170], ra: [150, 170] })) + g('translate(160 60) scale(.9)', `<ellipse cx="0" cy="0" rx="110" ry="50" fill="#D9A23C" ${S} stroke-width="5"/><circle cx="-110" cy="-30" r="50" fill="#D9A23C" ${S} stroke-width="5"/><path d="M-150 -60 Q-200 -30 -150 20 Q-110 40 -80 0" fill="#8E5A2A" opacity=".8"/><circle cx="-124" cy="-36" r="6" fill="${C.ink}"/>`));
  return s;
};
SCN.coastStory = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#CFE6EE"/>` + sun(1600, 180, 60, c.t);
  s += `<path d="M0 700 Q400 640 800 660 Q1200 690 1500 560 Q1700 470 1920 440 V1080 H0 Z" fill="#D9C27A" ${S} stroke-width="6"/>`;
  s += today(() => kid({ x: 1650, y: 520, s: 0.9, t: c.t, seed: 4, face: 'surprised', la: [-14, -6], ra: [14, 6] }) + person({ x: 1760, y: 500, s: 0.6, t: c.t, seed: 6, face: 'think', la: [-14, -6], ra: [14, 6] }));
  const lvl = st === 1 ? 840 : lerp(840, 600, eout(clamp(c.t / 2.0)));
  s += `<rect y="${f1(lvl)}" width="${W}" height="${f1(H - lvl)}" fill="#5E94B5" opacity=".85"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${120 + i * 260} ${f1(lvl + 30)} q40 -16 80 0" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".7"/>`;
  if (st >= 2) s += hand('7,000+ YEARS AGO', 760, 200, 90, c.t, 0.3);
  else s += hand('THE SEA RISES', 760, 200, 90, c.t, 0.3);
  return s;
};

// ---------- the first schools ----------
function cuneiform(n, t, t0 = 0) { let o = ''; const r = rng(4); for (let i = 0; i < n; i++) { const x = -150 + (i % 8) * 42, y = -110 + Math.floor(i / 8) * 46; if (t < t0 + i * 0.02) break; const a = r() * 4 | 0; o += g(`translate(${x} ${y}) rotate(${[0, 90, 45, -45][a]})`, `<path d="M0 -12 L8 0 L0 12 L-3 0 Z M0 0 H18" fill="#5C4430" stroke="#5C4430" stroke-width="3"/>`); } return o; }
SCN.tablet = (c, o) => {
  let s = paper() + g('translate(960 560) scale(2)', `<rect x="-190" y="-150" width="380" height="300" rx="40" fill="#C9A06A" ${S} stroke-width="5"/>` + (o.signs ? cuneiform(48, c.t, 0.1) : cuneiform(10, c.t, 0.1)));
  s += g(`translate(${f1(1500 + Math.sin(c.t * 3) * 20)} 420) rotate(35)`, `<rect x="-14" y="-260" width="28" height="300" rx="8" fill="#B99A5A" ${S} stroke-width="4"/>`);
  return s + (o.signs ? hand('HUNDREDS OF SIGNS', 960, 150, 84, c.t, 0.3, { col: C.accent }) : '');
};
SCN.tabletSchool = (c, o) => {
  const oldP = C.pants; C.pants = '#D9CBA8';
  try { return tabletSchoolInner(c, o); } finally { C.pants = oldP; }
};
function tabletSchoolInner(c, o) {
  let s = `<rect width="${W}" height="${H}" fill="#D9B98A"/>`;
  for (let r = 0; r < 8; r++) for (let i = 0; i < 12; i++) s += `<rect x="${(i * 170) + (r % 2) * 85 - 60}" y="${r * 90}" width="160" height="82" fill="none" stroke="#C4A272" stroke-width="4"/>`;
  s += `<rect y="860" width="${W}" height="220" fill="#B99A72"/>`;
  [[420, 860], [760, 860], [1100, 860]].forEach(([x, y], i) => {
    s += `<rect x="${x - 140}" y="${y - 90}" width="280" height="50" fill="#9C7A55" ${S} stroke-width="5"/>`;
    const hurt = o.cane && i === 1;
    s += kid({ x, y: y + 120, s: 1.4, kind: 'modern', shirt: '#E8DCC0', t: c.t, seed: 4 + i * 3, face: hurt ? 'scared' : o.gift ? 'happy' : ['think', 'tired', 'think'][i], ...sit, la: [60, 100], ra: [50, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 20)})`, `<rect x="-36" y="-28" width="72" height="56" rx="8" fill="#C9A06A" ${S} stroke-width="3"/>`) });
  });
  const sw = o.cane ? Math.sin(c.t * 6) * 40 : 0;
  if (o.gift) {
    s += person({ x: 1640, y: 990, s: 1.5, kind: 'modern', shirt: '#C9A06A', t: c.t, seed: 21, face: 'laugh', beard: true, la: [-14, -6], ra: [-60, -100], flip: true });
    s += person({ x: 1340, y: 990, s: 1.45, kind: 'modern', shirt: '#8E5A3A', t: c.t, seed: 6, face: 'happy', beard: true, la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 30)})`, `<rect x="-50" y="-40" width="100" height="70" rx="8" fill="#C0392B" ${S} stroke-width="5"/><path d="M0 -40 V30 M-50 -6 H50" stroke="#F2C443" stroke-width="10"/>`) });
    return s + pop(1500, 420, c.t, 0.4, heart(1.2)) + hand('DAD BRINGS GIFTS', 960, 160, 90, c.t, 0.2, { col: C.green });
  }
  s += person({ x: 1560, y: 990, s: 1.5, kind: 'modern', shirt: '#C9A06A', t: c.t, seed: 21, face: o.cane ? 'smug' : 'neutral', beard: true, la: [-14, -6], ra: [-110 + sw, -160 + sw], flip: true, holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} l${f1(-180)} ${f1(-60 + sw)}" stroke="${C.woodD}" stroke-width="8" stroke-linecap="round"/>` });
  if (o.cane) s += hand('"SCHOOLDAYS"', 960, 160, 90, c.t, 0.3, { col: C.red });
  return s;
}

// ---------- the twist ----------
SCN.campSchool = c => {
  let s = camp(c.t, { fx: 960 });
  s += person({ x: 300, y: 990, s: 1.0, t: c.t, seed: 14, beard: true, face: 'think', ...sit, la: [60, 100], ra: [60, 110], armsFront: true, front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1])})`, core(0.4, 3)) }) + kid({ x: 470, y: 1000, s: 1.0, t: c.t, seed: 9, face: 'think', ...sit, la: [60, 100], ra: [60, 110], armsFront: true });
  s += person({ x: 1250, y: 990, s: 1.05, t: c.t, seed: 5, long: true, keepHair: true, hairC: '#B9B2A6', face: 'laugh', ...sit, la: [-60, -120], ra: [60, 110], flip: true }) + kid({ x: 1100, y: 1000, s: 0.9, t: c.t, seed: 12, face: 'surprised', ...sit, la: [40, 80], ra: [40, 80] });
  const k = Math.sin(c.t * 9) * 22;
  s += kid({ x: 700 + Math.sin(c.t) * 60, y: 1000, s: 1.1, t: c.t, seed: 4, face: 'laugh', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-40, -60], ra: [40, 60] }) + kid({ x: 1560, y: 1000, s: 1.3, t: c.t, seed: 15, long: true, face: 'happy', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1] - 30)})`, baby(0.5)) });
  s += `<rect x="40" y="40" width="1840" height="1000" rx="20" fill="none" stroke="#8E5A3A" stroke-width="26"/><rect x="40" y="40" width="1840" height="1000" rx="20" fill="none" stroke="#2F5D4A" stroke-width="10"/>`;
  return s + pop(960, 140, c.t, 0.3, `<rect x="-460" y="-66" width="920" height="110" rx="14" fill="#2F5D4A" stroke="#8E5A3A" stroke-width="10"/>` + chalk('THE WHOLE CAMP', 0, 22, 80, 1, DONE));
};

// Extra card icons: book, hand.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'book') return `<path d="M0 -60 Q-60 -90 -130 -70 V80 Q-60 60 0 90 Q60 60 130 80 V-70 Q60 -90 0 -60 Z" fill="#FFFFFF" ${S} stroke-width="6"/><path d="M0 -60 V90" ${S} stroke-width="5"/><path d="M-100 -30 q40 -10 80 6 M-100 10 q40 -10 80 6 M20 -24 q40 -16 80 -6 M20 16 q40 -16 80 -6" fill="none" stroke="#B8AA8A" stroke-width="5"/>`;
    if (name === 'hand') return `<path d="M-50 90 Q-70 20 -64 -20 L-60 -70 M-28 -10 L-26 -110 M0 -10 L2 -120 M28 -6 L32 -104 M48 30 L84 -20" stroke="${C.ink}" stroke-width="38" stroke-linecap="round" fill="none"/><path d="M-50 90 Q-70 20 -64 -20 L-60 -70 M-28 -10 L-26 -110 M0 -10 L2 -120 M28 -6 L32 -104 M48 30 L84 -20" stroke="#E9C9A6" stroke-width="28" stroke-linecap="round" fill="none"/><ellipse cx="-4" cy="40" rx="56" ry="64" fill="#E9C9A6" ${S} stroke-width="5"/>`;
    return ic(name, t);
  };
})();

// ---------- added segments ----------
SCN.wordsKid = (c, o) => {
  let s = paper();
  s += kid({ x: 960, y: 1000, s: 1.6, kind: 'modern', shirt: '#F2C443', t: c.t, seed: 5, face: 'laugh', la: [-150, -170], ra: [150, 170] });
  if (o.words) {
    const ws = ['DOG', 'MILK', 'MORE!', 'BALL', 'NO!', 'MUMMY', 'WHY?', 'BIRD', 'UP', 'SHOE', 'NIGHT', 'TREE'];
    ws.forEach((w, i) => { const a = i / ws.length * Math.PI * 2 + c.t * 0.15, R = 520 + (i % 3) * 60; s += pop(960 + Math.cos(a) * R, 520 + Math.sin(a) * R * 0.55, c.t, 0.1 + i * 0.07, speech(0, 0, w.length * 34 + 70, 80, -20 * Math.cos(a), 80, hand(w, 0, 18, 48, 1, DONE, { col: ['#3E7FA6', C.red, C.green, C.accent][i % 4] }))); });
  } else s += hand('YOUR FIRST LANGUAGE', 960, 200, 90, c.t, 0.4);
  return s;
};
SCN.plantGrid = c => {
  let s = paper();
  const cols = ['#5E8A3C', '#C0392B', '#D9A23C', '#8E5A3A', '#7FA34E', '#B85C3A', '#E6B33C'];
  for (let i = 0; i < 105; i++) {
    const x = 330 + (i % 15) * 90, y = 330 + Math.floor(i / 15) * 80;
    s += pop(x, y, c.t, 0.05 + i * 0.012, i % 3 === 0 ? leaf(0, 0, -20, 0.55, cols[i % 7]) : `<circle r="${18 + (i % 4) * 3}" fill="${cols[i % 7]}" ${S} stroke-width="3"/>`);
  }
  return s + hand('105 EDIBLE PLANTS', 960, 200, 96, c.t, 0.3, { col: C.green });
};
SCN.toys = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) {
    s += g('translate(480 520) rotate(-20) scale(1.3)', `<path d="M-160 0 H120" stroke="#E9DFC8" stroke-width="16" stroke-linecap="round"/><path d="M120 -18 L190 0 L120 18 Z" fill="#E9DFC8" ${S} stroke-width="4"/><path d="M-160 0 H120" fill="none" ${S} stroke-width="3"/>`);
    s += g('translate(1000 560)', `<path d="M-220 0 Q0 -60 220 0 Q0 50 -220 0 Z" fill="#B98A5A" ${S} stroke-width="6"/><ellipse cx="0" cy="-20" rx="40" ry="16" fill="#5C4430"/>`);
    s += g('translate(1500 560)', `<circle cx="0" cy="-110" r="46" fill="#E9DFC8" ${S} stroke-width="5"/><path d="M-60 -60 Q-80 60 -50 110 H50 Q80 60 60 -60 Z" fill="#A8743E" ${S} stroke-width="5"/><path d="M-14 -112 h4 M10 -112 h4" ${S} stroke-width="5"/>`);
    s += g('translate(960 820)', `<rect x="-220" y="-20" width="440" height="24" fill="#B98A5A" ${S} stroke-width="5"/><path d="M-200 4 v30 M200 4 v30 M-240 34 H240" fill="none" ${S} stroke-width="8"/>`);
    return s + hand('HARPOON · KAYAK · DOLL · SLEDGE', 960, 200, 70, c.t, 0.2) + hand('ABOUT 800 YEARS AGO', 960, 290, 56, c.t, 0.4, { col: C.accent });
  }
  const spin = st === 3 ? c.t * 9 : 0, sx = Math.cos(spin);
  const deer = (lying) => {
    const body = `<ellipse cx="-10" cy="0" rx="62" ry="28" fill="#8E5A3A" ${S} stroke-width="4"/><path d="M40 -10 L62 -46" stroke="#8E5A3A" stroke-width="18" stroke-linecap="round"/><ellipse cx="74" cy="-56" rx="22" ry="14" fill="#8E5A3A" ${S} stroke-width="4"/><path d="M60 -66 l-6 -22 M68 -68 l4 -20 M-70 -6 l-12 -8" ${S} stroke-width="4"/><circle cx="80" cy="-58" r="3" fill="${C.ink}"/>`;
    return lying ? body + `<path d="M-50 26 l30 10 M-30 26 l30 10 M20 24 l30 8 M36 22 l30 8" ${S} stroke-width="5"/>` : body + `<path d="M-50 24 v44 M-30 24 v44 M20 22 v46 M36 20 v46" ${S} stroke-width="5"/>`;
  };
  s += g(`translate(960 600) scale(${f1(Math.abs(sx) * 2.2)} 2.2)`, `<circle r="130" fill="#E9DFC8" ${S} stroke-width="5"/><circle cx="0" cy="-100" r="10" fill="${C.paper}" ${S} stroke-width="3"/>` + deer(sx < 0));
  if (st === 3) s += `<path d="M960 268 V318" ${S} stroke-width="4"/>`;
  return s + hand(st === 3 ? 'A SPINNING TOY?' : 'BONE DISC, FRANCE', 960, 150, 84, c.t, 0.2) + hand('15,000+ YEARS OLD', 960, 240, 56, c.t, 0.4, { col: C.accent });
};
SCN.chauvet = (c, o) => {
  let s = caveRoom(c.t) + `<path d="M0 1080 V880 Q500 840 960 860 Q1500 890 1920 850 V1080 Z" fill="#9C8466"/>`;
  for (let i = 0; i < 12; i++) s += footprint(200 + i * 130, 960 + (i % 2) * 34, 0.8, 90, '#5C4836', i % 2 ? 1 : -1);
  if (o.wipe) [[700, 520], [1100, 470], [1500, 500]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.2 + i * 0.25, `<path d="M-60 -10 q30 -20 60 0 q30 20 60 0" fill="none" stroke="#1C1A18" stroke-width="22" stroke-linecap="round" opacity=".8"/>`); });
  s += kid({ x: 400 + c.t * 80, y: 900, s: 1.7, t: c.t, seed: 9, face: 'think', la: [-14, -6], ra: [-120, -150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, `<path d="M0 0 L0 -90" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>` + fire(0, -90, 0.25, c.t)) });
  return s + `<circle cx="${f1(400 + c.t * 80)}" cy="600" r="420" fill="#F7B84A" opacity=".12"/>` + hand('CHAUVET CAVE', 960, 150, 84, c.t, 0.2, { col: '#F3EBDD' });
};
SCN.bisonClay = c => {
  let s = caveRoom(c.t) + lamp(400, 960, c.t, 1.1);
  const bison = (flip) => g(`scale(${flip ? -1 : 1} 1)`, `<path d="M-160 20 Q-170 -80 -80 -110 Q0 -150 80 -100 Q160 -60 150 20 Q60 50 -160 20 Z" fill="#9C7A55" ${S} stroke-width="6"/><circle cx="110" cy="-40" r="8" fill="${C.ink}"/><path d="M130 -80 q20 -20 10 -40" fill="none" ${S} stroke-width="6"/>`);
  s += g('translate(1060 760) rotate(-6)', bison(false)) + g('translate(1400 800) rotate(4)', bison(true));
  return s + hand('CLAY BISON, TUC D\'AUDOUBERT', 960, 170, 76, c.t, 0.2, { col: '#F3EBDD' });
};
SCN.memoryWalk = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) { s += `<rect x="600" y="240" width="720" height="660" rx="16" fill="#FFFFFF" ${S} stroke-width="6"/>`; for (let i = 0; i < 10; i++) s += `<path d="M680 ${310 + i * 58} H${f1(900 + (i * 97) % 300)}" stroke="#B8AA8A" stroke-width="12" stroke-linecap="round"/><circle cx="650" cy="${310 + i * 58}" r="8" fill="${C.ink}"/>`; return s + hand('20 THINGS TO REMEMBER', 960, 170, 84, c.t, 0.2); }
  if (st === 2) {
    s += `<path d="M200 900 Q500 700 800 760 T1300 560 T1760 380" fill="none" stroke="#C9A06A" stroke-width="40" stroke-linecap="round"/>`;
    s += g('translate(380 760)', `<path d="M-60 60 L0 -60 L60 60 Z" fill="#8E7E68" ${S} stroke-width="5"/>`) + g('translate(980 600)', `<circle r="60" fill="#5E8A4E" ${S} stroke-width="5"/><path d="M0 60 V120" stroke="${C.woodD}" stroke-width="14"/>`) + g('translate(1500 420)', `<ellipse rx="110" ry="40" fill="#6FB5E0" ${S} stroke-width="5"/>`);
    [[380, 640], [980, 470], [1500, 330]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.2 + i * 0.3, `<rect x="-70" y="-34" width="140" height="56" rx="12" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M-44 -6 H44" stroke="#B8AA8A" stroke-width="10" stroke-linecap="round"/>`); });
    return s + hand('A STORY, ALONG A PATH', 960, 170, 84, c.t, 0.2);
  }
  s += SCN.barChart(c, { rows: [['NO METHOD', 1], ['ABORIGINAL', 2.8]], title: 'CHANCE OF A PERFECT LIST', max: 3.2 }).replace(paper(), '');
  return s;
};
SCN.canoe = (c, o) => {
  const night = !!o.stars;
  let s = night ? bgNight(c.t, { seed: 501, hz: 620 }) : `<rect width="${W}" height="${H}" fill="#9FD7E8"/>` + sun(1600, 200, 70, c.t);
  s += `<rect y="620" width="${W}" height="460" fill="${night ? '#1F3A5C' : '#3E8AB5'}"/>`;
  for (let i = 0; i < 8; i++) s += `<path d="M${f1(((i * 260) + c.t * 40) % 2100 - 100)} ${700 + (i % 3) * 110} q60 -30 120 0 t120 0" fill="none" stroke="#FFFFFF" stroke-width="5" opacity=".5"/>`;
  const bob = Math.sin(c.t * 1.5) * 8;
  s += g(`translate(960 ${f1(760 + bob)})`, `<path d="M-460 0 Q0 60 460 0 L420 50 Q0 100 -420 50 Z" fill="#8E5A3A" ${S} stroke-width="6"/><path d="M-440 -10 Q0 40 440 -10" fill="none" stroke="#C9A06A" stroke-width="8"/><path d="M-60 0 V-380 M180 0 V-320" ${S} stroke-width="10"/><path d="M-60 -370 Q80 -240 -50 -40 Z" fill="#E8D6A6" ${S} stroke-width="5"/><path d="M180 -310 Q300 -200 190 -40 Z" fill="#E8D6A6" ${S} stroke-width="5"/>`);
  s += g(`translate(0 ${f1(bob)})`, person({ x: 1260, y: 760, s: 0.8, t: c.t, seed: 14, face: 'think', beard: true, la: [-14, -6], ra: [-140, -170] }));
  if (o.kid) s += g(`translate(0 ${f1(bob)})`, kid({ x: 1350, y: 762, s: 0.9, t: c.t, seed: 9, face: 'surprised', la: [-140, -170], ra: [14, 6] }));
  if (night) s += [[700, 160], [880, 120], [1060, 190], [1240, 140]].map(([x, y], i) => `<path d="M${x} ${y} l8 18 l20 2 l-15 13 l5 20 l-18 -10 l-18 10 l5 -20 l-15 -13 l20 -2 Z" fill="#FFF3C4" ${S} stroke-width="2"/>`).join('') + `<path d="M708 170 L888 130 L1068 200 L1248 150" fill="none" stroke="#FFF3C4" stroke-width="3" stroke-dasharray="8 8"/>`;
  if (o.birds) for (let i = 0; i < 3; i++) s += `<path d="M${f1(400 + i * 120 + c.t * 30)} ${300 + i * 30} q20 -20 40 0 q20 -20 40 0" fill="none" ${S} stroke-width="5"/>`;
  return s + (night ? hand('HAWAII → TAHITI, 1976', 960, 300, 70, c.t, 0.3, { col: '#FFFFFF' }) : '');
};
