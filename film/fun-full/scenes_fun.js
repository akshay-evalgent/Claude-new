// Scenes for "What Did Ancient Humans Do for Fun Before Phones?". Builds on all earlier film libraries.
'use strict';

Object.assign(PLACES, {
  kibale: [30.4, 0.5], ur: [46.1, 30.96], gilf: [25.4, 23.4], benihasan: [30.88, 27.93], manati: [-94.67, 17.75],
  basur: [41.1, 37.9], india: [76.27, 9.93], hohlefels: [9.75, 48.38], laugerie: [1.0, 44.95], alaska: [-156.8, 71.3], lascaux: [1.17, 45.05],
});
Object.assign(REGIONS, {
  kibale: { center: [31, 1], scale: 2600, hl: ['Uganda'] },
  ur: { center: [45, 32], scale: 2400, hl: ['Iraq'] },
  gilf: { center: [28, 25], scale: 1800, hl: ['Egypt'] },
  benihasan: { center: [30, 27], scale: 1900, hl: ['Egypt'] },
  manati: { center: [-96, 18.5], scale: 2600, hl: ['Mexico'] },
  basur: { center: [37, 38.5], scale: 2400, hl: ['Turkey'] },
  india: { center: [79, 18], scale: 1250, hl: ['India'] },
  hohlefels: { center: [10, 48.6], scale: 4200, hl: ['Germany'] },
  laugerie: { center: [1.5, 46.2], scale: 3000, hl: ['France'] },
  alaska: { center: [-152, 64], scale: 1300, hl: ['United States of America'] },
});

// ---------- helpers ----------
function phoneSvg(s = 1, o = {}) {
  let p = `<rect x="-60" y="-110" width="120" height="220" rx="18" fill="#1C2742" ${S} stroke-width="5"/><rect x="-50" y="-96" width="100" height="186" rx="8" fill="${o.screen || '#9FD3FF'}"/>`;
  if (o.feed) for (let i = 0; i < 4; i++) { const y = -80 + ((i * 50 - (o.scroll || 0)) % 200 + 200) % 200; if (y < 70) p += `<rect x="-40" y="${f1(y)}" width="80" height="34" rx="5" fill="#FFFFFF" opacity=".85"/>`; }
  return g(`scale(${s})`, p);
}
function sofa(x, y, s = 1, col = '#7A5C8E') {
  return g(`translate(${x} ${y}) scale(${s})`, `<rect x="-330" y="-260" width="660" height="200" rx="40" fill="${col}" ${S} stroke-width="6"/><rect x="-360" y="-110" width="720" height="130" rx="30" fill="${col}" ${S} stroke-width="6"/><rect x="-400" y="-170" width="90" height="200" rx="30" fill="${col}" ${S} stroke-width="6"/><rect x="310" y="-170" width="90" height="200" rx="30" fill="${col}" ${S} stroke-width="6"/><path d="M-330 20 v30 M330 20 v30" ${S} stroke-width="12"/>`);
}
function rat(s = 1, t = 0, o = {}) {
  const wig = Math.sin(t * (o.happy ? 18 : 4)) * (o.happy ? 6 : 2);
  return g(`scale(${o.flip ? -s : s} ${s}) rotate(${f1(wig)})`, `<path d="M70 10 Q170 30 230 -10" fill="none" stroke="#E9A3A8" stroke-width="9" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="90" ry="56" fill="#F3F0EC" ${S} stroke-width="5"/><ellipse cx="-86" cy="-16" rx="46" ry="36" fill="#F3F0EC" ${S} stroke-width="5"/><circle cx="-80" cy="-56" r="20" fill="#F7C9CC" ${S} stroke-width="4"/><circle cx="-104" cy="-24" r="6" fill="${C.ink}"/><circle cx="-130" cy="-12" r="7" fill="#E9A3A8"/><path d="M-120 -4 l-30 -6 M-120 0 l-30 6" stroke="${C.ink}" stroke-width="2"/>`);
}
function handShape(s = 1, wig = 0) {
  return g(`scale(${s})`, `<path d="M-60 120 L-50 0 Q-50 -20 -30 -20 L50 -20 Q70 -20 70 0 L60 120 Z" fill="#F2C9A6" ${S} stroke-width="5"/>` +
    [-40, -14, 12, 38].map((x, i) => `<rect x="${x - 10}" y="${f1(-110 + (i % 2 ? wig : -wig))}" width="22" height="100" rx="11" fill="#F2C9A6" ${S} stroke-width="5"/>`).join('') + `<rect x="58" y="-30" width="20" height="70" rx="10" fill="#F2C9A6" ${S} stroke-width="5" transform="rotate(30 68 0)"/>`);
}
function waves(x, y, t, n = 3, col = C.accent, dir = 1) {
  let s = '';
  for (let i = 0; i < n; i++) { const p = ((t * 1.2 + i / n) % 1), r = 30 + p * 140; s += `<path d="M${f1(x + dir * r * 0.5)} ${f1(y - r * 0.7)} Q${f1(x + dir * r)} ${y} ${f1(x + dir * r * 0.5)} ${f1(y + r * 0.7)}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" opacity="${f1(1 - p)}"/>`; }
  return s;
}
function laughLines(x, y, t, col = C.accent, s = 1) {
  return g(`translate(${x} ${y}) scale(${s}) rotate(${f1(Math.sin(t * 9) * 6)})`, `<text x="0" y="0" font-family="Hand" font-size="70" fill="${col}" text-anchor="middle">HA HA</text>`);
}
function astragalus(s = 1, col = '#EFE3C8') {
  return g(`scale(${s})`, `<path d="${smooth([[-90, -40], [-60, -80], [10, -70], [70, -86], [100, -30], [86, 40], [40, 76], [-30, 66], [-90, 50], [-110, 0]])}" fill="${col}" ${S} stroke-width="5"/><path d="M-40 -30 Q0 -6 40 -34 M-30 20 Q10 40 50 16" fill="none" stroke="#B9A57E" stroke-width="5" stroke-linecap="round"/>`);
}
function urBoard(s = 1, t = 0, o = {}) {
  // 3 rows: top and bottom have 4 + 2 squares, middle row has 8.
  const q = 100; let b = '';
  const has = (r, k) => r === 1 || k < 4 || k > 5;
  const ros = new Set(['0,0', '2,0', '1,3', '0,6', '2,6']);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) {
    if (!has(r, k)) continue;
    const x = -400 + k * q, y = -150 + r * q;
    b += `<rect x="${x}" y="${y}" width="${q}" height="${q}" fill="${(r + k) % 2 ? '#3B5BA5' : '#E9DCC0'}" ${S} stroke-width="4"/>`;
    if (ros.has(`${r},${k}`)) { b += `<circle cx="${x + 50}" cy="${y + 50}" r="34" fill="#F2F0EA" ${S} stroke-width="3"/>` + [...Array(8)].map((_, i) => { const a = i / 8 * Math.PI * 2; return `<circle cx="${f1(x + 50 + Math.cos(a) * 20)}" cy="${f1(y + 50 + Math.sin(a) * 20)}" r="8" fill="#C0392B"/>`; }).join('') + `<circle cx="${x + 50}" cy="${y + 50}" r="9" fill="#3B5BA5"/>`; }
    else b += `<circle cx="${x + 50}" cy="${y + 50}" r="10" fill="#C0392B" opacity=".7"/>`;
  }
  if (o.pieces) {
    const hop = k => { const p = clamp((t - k) / 0.5); return -Math.sin(Math.PI * p) * 50; };
    const wx = -400 + 50 + Math.min(4, Math.floor(t * 1.2)) * q;
    b += `<circle cx="${f1(wx)}" cy="${f1(-50 + hop(Math.floor(t * 1.2) / 1.2))}" r="36" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="${f1(-400 + 50 + 6 * q)}" cy="${f1(150 - 100)}" r="36" fill="#2B2118" ${S} stroke-width="5"/>`;
    b += `<circle cx="${f1(-400 + 50 + 2 * q)}" cy="-100" r="36" fill="#2B2118" ${S} stroke-width="5"/><circle cx="${f1(-400 + 50 + 7 * q)}" cy="0" r="36" fill="#FFFFFF" ${S} stroke-width="5"/>`;
  }
  return g(`scale(${s})`, `<rect x="-420" y="-170" width="840" height="340" rx="16" fill="#5C4430" opacity=".25"/>` + b);
}
function tetraDie(s = 1, tip = true) {
  return g(`scale(${s})`, `<path d="M0 -60 L56 40 L-56 40 Z" fill="#E9DCC0" ${S} stroke-width="5"/><path d="M0 -60 L10 40" ${S} stroke-width="3" fill="none"/>` + (tip ? `<circle cx="0" cy="-52" r="9" fill="#FFFFFF" ${S} stroke-width="3"/>` : ''));
}
function senetBoard(s = 1, t = 0) {
  let b = `<rect x="-540" y="-170" width="1080" height="340" rx="14" fill="#D9B97A" ${S} stroke-width="6"/>`;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) b += `<rect x="${-520 + k * 104}" y="${-150 + r * 100}" width="104" height="100" fill="${(r + k) % 2 ? '#E9D3A0' : '#F3E3BC'}" stroke="#8E6A3C" stroke-width="3"/>`;
  b += `<path d="M${-520 + 4 * 104 + 30} ${-150 + 30} l44 40 M${-520 + 4 * 104 + 74} ${-150 + 30} l-44 40" stroke="#8E6A3C" stroke-width="6"/>`;
  const pieces = [[0, 0, 'c'], [2, 0, 's'], [4, 1, 'c'], [6, 1, 's'], [8, 2, 'c'], [1, 2, 's']];
  pieces.forEach(([k, r, ty], i) => { const hop = Math.max(0, Math.sin(t * 3 - i)) * (i === 2 ? 30 : 0); const x = -520 + 52 + k * 104, y = -150 + 50 + r * 100 - hop; b += ty === 'c' ? `<path d="M${x - 26} ${y + 30} L${x - 14} ${y - 30} Q${x} ${y - 44} ${x + 14} ${y - 30} L${x + 26} ${y + 30} Z" fill="#3E5C8A" ${S} stroke-width="4"/>` : `<rect x="${x - 24}" y="${y - 30}" width="48" height="60" rx="12" fill="#B9473A" ${S} stroke-width="4"/>`; });
  return g(`scale(${s})`, b);
}
function swimmer(x, y, s, t, i) {
  const k = Math.sin(t * 3 + i) * 10;
  return g(`translate(${x} ${f1(y + Math.sin(t * 1.5 + i) * 6)}) scale(${s}) rotate(${f1(-8 + Math.sin(t + i) * 4)})`, `<circle cx="-70" cy="-6" r="16" fill="#8E2F26"/><path d="M-54 0 L40 6" stroke="#8E2F26" stroke-width="16" stroke-linecap="round"/><path d="M-50 -2 L${f1(-100 + k)} -40 M-46 4 L${f1(-96 - k)} 34 M40 6 L${f1(90 + k)} -10 M40 6 L${f1(88 - k)} 28" stroke="#8E2F26" stroke-width="9" stroke-linecap="round"/>`);
}
function egyptFig(x, y, s, col, a1, a2, flip = false) {
  // simple profile figure in Egyptian wall-painting colours
  return g(`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`, `<circle cx="0" cy="-170" r="26" fill="${col}" ${S} stroke-width="3"/><path d="M-28 -168 Q-30 -200 0 -199 Q30 -200 28 -176 L10 -178 Q-6 -186 -14 -168 L-14 -140 L-28 -144 Z" fill="#1A1410"/><circle cx="14" cy="-170" r="4" fill="#1A1410"/><path d="M0 -144 L0 -60" stroke="${col}" stroke-width="30" stroke-linecap="round"/><path d="M-14 -60 L-30 0 M14 -60 L34 0" stroke="${col}" stroke-width="14" stroke-linecap="round"/><path d="M-18 -70 h36 v20 h-36 Z" fill="#F3EBDD" ${S} stroke-width="2"/><path d="M0 -130 L${a1[0]} ${a1[1]} M0 -130 L${a2[0]} ${a2[1]}" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`);
}
function rubberBall(s = 1) { return g(`scale(${s})`, `<circle r="60" fill="#2E2A28" ${S} stroke-width="5"/><path d="M-30 -30 Q-10 -46 16 -40" fill="none" stroke="#6A625C" stroke-width="8" stroke-linecap="round"/>`); }
function inuit(o) { return person(Object.assign({ kind: 'cave', tunicC: '#C9A97A', hairC: '#2B2118', cloak: false }, o, { front: (L, R) => `<path d="M-62 ${-o.hip - 300} Q0 ${-o.hip - 380} 62 ${-o.hip - 300}" fill="none" stroke="#F3EBDD" stroke-width="22" stroke-linecap="round" opacity=".9"/>` })); }

// ---------- modern evening ----------
SCN.phoneCouch = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="${o.day ? '#E8DCCB' : '#273049'}"/><rect y="860" width="${W}" height="220" fill="${o.day ? '#B9A58A' : '#3E3A3C'}"/>`;
  s += `<rect x="1380" y="180" width="380" height="300" fill="${o.day ? '#BFDDEA' : '#141B33'}" stroke="#5C5048" stroke-width="14"/>`;
  if (!o.day) s += `<circle cx="1660" cy="260" r="34" fill="#F6ECC9"/><circle cx="1676" cy="250" r="30" fill="#141B33"/>`;
  s += sofa(820, 880, 1.15);
  const gone = o.gone != null ? clamp((c.t - o.gone) / 0.4) : 0;
  const thumb = Math.sin(c.t * 7) * 6;
  if (!gone || gone < 1) s += `<path d="M760 420 L1010 640 L900 700 Z" fill="#9FD3FF" opacity="${f1(0.18 * (1 - gone))}"/>`;
  s += person({ x: 820, y: 800, s: 1.25, kind: 'modern', t: c.t, seed: 4, face: gone ? 'surprised' : (o.face || 'tired'), shortHair: true, hairC: '#3A2A1E', ...sit, la: [40, 60], ra: [-40, -60], armsFront: true,
    front: (L, R) => gone >= 1 ? '' : g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 40)}) rotate(-10) scale(${f1(1 - gone)})`, phoneSvg(0.55, { feed: true, scroll: c.t * 60 }) + `<circle cx="${f1(20 + thumb)}" cy="40" r="10" fill="#F2C9A6" ${S} stroke-width="3"/>`) });
  if (gone > 0) s += sparkle(940, 520, c.t, o.gone, 1.6);
  if (o.label) s += pop(1560, 640, c.t, 0.4, `<rect x="-220" y="-70" width="440" height="140" rx="20" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand(o.label, 0, 26, 76, 1, DONE, { col: C.accent }));
  if (o.ping) for (let i = 0; i < 3; i++) s += pop(1100 + i * 90, 380 - i * 80, c.t, o.ping + i * 0.35, `<rect x="-60" y="-34" width="120" height="68" rx="14" fill="#E0505A" ${S} stroke-width="4"/><circle cx="-30" cy="0" r="8" fill="#FFFFFF"/><path d="M-12 -6 h50 M-12 10 h34" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/>`);
  return s;
};
SCN.screenTime = (c, o) => {
  let s = paper();
  s += g('translate(960 560) scale(2.7)', `<rect x="-90" y="-170" width="180" height="340" rx="26" fill="#1C2742" ${S} stroke-width="4"/><rect x="-78" y="-152" width="156" height="304" rx="12" fill="#F4F7FB"/>`);
  s += hand('SCREEN TIME', 960, 250, 54, c.t, 0.1, { col: '#1C2742' });
  const bars = [0.7, 0.85, 0.6, 0.95, 0.8, 1.0, 0.9];
  bars.forEach((v, i) => { const h = 300 * v * eout(clamp((c.t - 0.3 - i * 0.08) / 0.5)); s += `<rect x="${760 + i * 58}" y="${f1(760 - h)}" width="40" height="${f1(h)}" rx="6" fill="#4A8FE0"/>`; });
  s += hand(o.label || '4 H 30 MIN', 960, 860, 70, c.t, 0.6, { col: C.accent }) + hand(o.sub || 'A DAY', 960, 930, 46, c.t, 0.9);
  return s;
};
SCN.boredCave = (c, o) => {
  let s = (o.dusk ? kalahari(c.t, { sky: ['#E07A4A', '#F6C98A'], hills: '#9A6A4A', ground: '#B98E5A', trees: true }) : bgSavanna({ seed: 41 }));
  s += rock(960, 960, 160, 50, 4) + person({ x: 960, y: 930, s: 1.35, t: c.t, seed: 9, face: 'tired', ...sit, la: [30, 40], ra: [-30, -40], armsFront: true });
  if (o.fire) s += fire(1350, 980, 0.6, c.t);
  const dots = Math.floor(c.t * 2) % 4;
  s += pop(1300, 420, c.t, 0.4, `<ellipse rx="170" ry="90" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="-110" cy="110" r="22" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand('.'.repeat(dots), 0, 20, 110, 1, DONE));
  if (o.label) s += hand(o.label, 960, 150, 90, c.t, 0.3);
  return s;
};

// ---------- play is older than us ----------
SCN.ratTickle = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E7EEF0"/><rect y="760" width="${W}" height="320" fill="#C9D3D6"/><path d="M0 760 H1920" ${S} stroke-width="5"/>`;
  const chase = o.chase ? Math.sin(c.t * 1.6) * 260 : 0;
  const wig = Math.sin(c.t * 16) * 12;
  s += g(`translate(${f1(900 + chase)} 740)`, rat(1.5, c.t, { happy: true, flip: true }));
  s += g(`translate(${f1(1260 + chase)} ${o.chase ? 640 : 560}) rotate(-150)`, handShape(1.1, o.chase ? 0 : wig));
  if (!o.chase) s += waves(1010, 600, c.t, 3, '#4A8FE0', -1) + pop(620, 380, c.t, 0.5, hand(o.label || 'CHIRP!', 0, 0, 90, 1, DONE, { col: '#4A8FE0' }));
  else s += hand('AGAIN!', 960, 250, 100, c.t, 0.3, { col: C.accent });
  if (o.khz) s += pop(1500, 300, c.t, o.khz, `<rect x="-180" y="-70" width="360" height="140" rx="20" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('50 kHz', 0, 26, 80, 1, DONE, { col: '#4A8FE0' }));
  return s;
};
SCN.apeTickle = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${200 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#6E9A5A' : '#5F8A4E'}"/>`).join('') + `<rect y="820" width="${W}" height="260" fill="#7A6A4A"/>`;
  const tk = Math.sin(c.t * 12) * 10;
  const jig = Math.abs(Math.sin(c.t * 9)) * 10;
  s += g('translate(760 900) scale(1.0)', ape('chimp', c.t, {}));
  s += g(`translate(1160 ${f1(910 - jig)}) rotate(${f1(Math.sin(c.t * 9) * 6)}) scale(.55)`, ape('chimp', c.t, {}) + `<ellipse cx="0" cy="-222" rx="22" ry="${f1(14 + jig)}" fill="#5A2A2A"/>`);
  s += `<path d="M850 760 Q1000 ${f1(700 + tk)} 1120 ${f1(850 + tk * 0.5)}" fill="none" stroke="${C.ink}" stroke-width="40" stroke-linecap="round"/><path d="M850 760 Q1000 ${f1(700 + tk)} 1120 ${f1(850 + tk * 0.5)}" fill="none" stroke="#3E342E" stroke-width="30" stroke-linecap="round"/>`;
  s += laughLines(1320, 580, c.t, '#FFFFFF', 1.1);
  if (o.label) s += hand(o.label, 960, 150, 90, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};
SCN.laughTree = (c, o) => {
  let s = paper();
  const tips = [['ORANGUTAN', 360], ['GORILLA', 720], ['CHIMP', 1080], ['BONOBO', 1320], ['HUMAN', 1600]];
  s += `<path d="M960 960 V820 M360 820 H1600" ${S} stroke-width="8" fill="none"/>`;
  tips.forEach(([n, x], i) => {
    s += `<path d="M${x} 820 V640" ${S} stroke-width="8"/>`;
    s += pop(x, 520, c.t, 0.2 + i * 0.18, (n === 'HUMAN' ? `<circle cy="-80" r="60" fill="#FFFFFF" ${S} stroke-width="5"/>` + g('translate(0 -80)', faceSvg('laugh', c.t, 3)) : g('scale(.42)', ape(n === 'ORANGUTAN' ? 'orangutan' : 'chimp', c.t, {}))));
    s += hand(n, x, 600, 44, c.t, 0.3 + i * 0.18);
    s += pop(x, 280, c.t, 1.2 + i * 0.12, hand('HA', 0, 0, 60, 1, DONE, { col: C.accent }));
  });
  s += pop(960, 990, c.t, 1.9, `<circle r="20" fill="${C.accent}" ${S} stroke-width="4"/>`) + hand(o.label || 'ONE LAUGHING ANCESTOR', 960, 140, 80, c.t, 2.0, { col: C.accent });
  if (o.sub) s += hand(o.sub, 960, 225, 56, c.t, 2.3);
  return s;
};
SCN.stickDoll = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${200 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#6E9A5A' : '#5F8A4E'}"/>`).join('') + `<rect y="820" width="${W}" height="260" fill="#7A6A4A"/>`;
  const rock_ = Math.sin(c.t * 2) * 6;
  s += g('translate(900 920) scale(.85)', ape('chimp', c.t, {}));
  s += g(`translate(930 ${f1(850)}) rotate(${f1(-70 + rock_)})`, `<rect x="-14" y="-120" width="28" height="240" rx="10" fill="#8E6A3C" ${S} stroke-width="5"/><path d="M-10 -90 l-34 -26 M8 50 l34 18" ${S} stroke-width="5"/>`);
  s += `<path d="M823 801 Q880 900 1010 860" fill="none" stroke="${C.ink}" stroke-width="40" stroke-linecap="round"/><path d="M823 801 Q880 900 1010 860" fill="none" stroke="#3E342E" stroke-width="30" stroke-linecap="round"/>`;
  s += pop(1360, 480, c.t, 0.6, heart(1.2));
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};

// ---------- free time ----------
SCN.leisure = (c, o) => {
  let s = paper();
  s += hand(o.title || 'FREE TIME A WEEK', 960, 150, 80, c.t, 0.1);
  const rows = [[o.l1 || 'FORAGERS', o.v1 || 1, '#4F9A4A'], [o.l2 || 'FARMERS', o.v2 || 0.6, '#B9764A']];
  rows.forEach(([l, v, col], i) => {
    const y = 380 + i * 260, w = 1000 * v * eout(clamp((c.t - 0.4 - i * 0.4) / 0.8));
    s += hand(l, 420, y + 30, 64, c.t, 0.3 + i * 0.4, { anchor: 'end' }) + `<rect x="470" y="${y - 50}" width="${f1(w)}" height="110" rx="14" fill="${col}" ${S} stroke-width="5"/>`;
  });
  if (o.note) s += hand(o.note, 960, 870, 64, c.t, 1.4, { col: C.accent });
  return s;
};
SCN.gambling = (c, o) => {
  let s = bgSavanna({ seed: 77 }) + acacia(1650, 700, 0.9);
  const men = [[640, 0], [960, 1], [1280, 2]];
  men.forEach(([x, i]) => { s += person({ x, y: 960, s: 1.0, t: c.t, seed: 31 + i * 5, face: i === 1 && o.win ? 'laugh' : 'happy', ...sit, la: [40, 60], ra: [i === 1 ? -150 : -30, i === 1 ? -100 : -40], armsFront: true }); });
  const th = (c.t * 0.9) % 1.4;
  if (th < 0.8) { const p = th / 0.8; s += g(`translate(${f1(1000 + p * 560)} ${f1(700 - Math.sin(Math.PI * p) * 220)}) rotate(${f1(p * 720)})`, `<ellipse rx="40" ry="16" fill="#B98E5A" ${S} stroke-width="4"/>`); }
  else s += g(`translate(1300 990) rotate(10)`, `<ellipse rx="40" ry="16" fill="#B98E5A" ${S} stroke-width="4"/>`);
  const pile = o.spread ? clamp((c.t - 0.5) / 1.6) : 0;
  for (let k = 0; k < 6; k++) { const tx = lerp(960, [640, 1280, 960][k % 3], pile), ty = lerp(1010, 1020, pile); s += g(`translate(${f1(tx + (k - 3) * 12)} ${f1(ty)}) rotate(${-80 + k * 6})`, `<path d="M0 0 L0 -150" ${S} stroke-width="5"/><path d="M-10 -150 L0 -175 L10 -150 Z" fill="#9AA0A6" ${S} stroke-width="3"/>`); }
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.3);
  return s;
};
SCN.knucklebones = (c, o) => {
  if (o.play) {
    let s = bgSavanna({ seed: 81 });
    s += kid({ x: 760, y: 960, t: c.t, seed: 12, face: 'laugh', ...sit, la: [40, 60], ra: [-150, -120], armsFront: true }) + kid({ x: 1160, y: 960, t: c.t, seed: 15, long: true, face: 'happy', flip: true, ...sit, la: [40, 60], ra: [-30, -40], armsFront: true });
    for (let k = 0; k < 5; k++) { const p = ((c.t * 0.8 + k * 0.13) % 1); s += g(`translate(${f1(900 + k * 40)} ${f1(800 - Math.sin(Math.PI * p) * 300)}) rotate(${f1(p * 400 + k * 60)})`, astragalus(0.35)); }
    if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.3);
    return s;
  }
  let s = paper();
  s += g(`translate(960 560) rotate(${f1(Math.sin(c.t * 1.2) * 12)})`, astragalus(2.6));
  s += hand(o.label || 'KNUCKLEBONES', 960, 180, 96, c.t, 0.2) + hand(o.sub || 'A SHEEP ANKLE BONE', 960, 870, 64, c.t, 0.6, { col: C.accent });
  if (o.sides) [['1', 520, 420], ['3', 1400, 420], ['4', 520, 720], ['6', 1400, 720]].forEach(([n, x, y], i) => { s += pop(x, y, c.t, 0.8 + i * 0.25, `<circle r="60" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand(n, 0, 26, 76, 1, DONE, { col: C.accent })); });
  return s;
};
SCN.urGame = (c, o) => {
  let s = paper();
  s += g('translate(960 560)', urBoard(1.5, c.t, { pieces: !!o.pieces }));
  if (o.dice) s += [0, 1, 2, 3].map(i => pop(1500 + (i % 2) * 120, 880 + Math.floor(i / 2) * 60, c.t, 0.6 + i * 0.12, tetraDie(0.9, i !== 2))).join('');
  s += hand(o.label || 'THE ROYAL GAME OF UR', 960, 140, 84, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 880, 64, c.t, 0.6, { col: C.accent }) : '');
  return s;
};
SCN.finkel = (c, o) => {
  let s = paper();
  s += g('translate(600 560) rotate(-4)', `<rect x="-260" y="-320" width="520" height="640" rx="40" fill="#C9A06A" ${S} stroke-width="6"/>` + cuneiform(60, c.t, 0.1).replace(/translate\(/, 'translate('));
  s += g('translate(1360 540) scale(.75)', urBoard(1, c.t, {}));
  s += arrow(900, 560, 1040, 560, c.t, 0.8, 0.5);
  s += hand(o.label || 'THE RULES, ~177 BC', 960, 140, 80, c.t, 0.3) + (o.sub ? hand(o.sub, 1360, 860, 60, c.t, 1.0, { col: C.accent }) : '');
  return s;
};
SCN.lamassu = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#D9CDB8"/><rect y="930" width="${W}" height="150" fill="#B9AE9A"/>`;
  const st = '#E6DBC4', sd = '#C9BB9E';
  s += `<rect x="420" y="250" width="1080" height="560" fill="${sd}" ${S} stroke-width="6"/>`;
  s += `<path d="M640 620 Q620 500 700 470 L1280 470 Q1340 500 1320 620 Z" fill="${st}" ${S} stroke-width="6"/>`;
  [690, 790, 1150, 1240, 1310].forEach(x => { s += `<rect x="${x - 32}" y="600" width="64" height="190" fill="${st}" ${S} stroke-width="5"/><rect x="${x - 40}" y="770" width="80" height="30" rx="6" fill="${sd}" ${S} stroke-width="5"/>`; });
  for (let r = 0; r < 4; r++) s += `<path d="M${760 + r * 30} ${470 - r * 50} Q${1000} ${430 - r * 60} ${1260 - r * 20} ${300 - r * 10}" fill="none" ${S} stroke-width="5"/>` + [...Array(8)].map((_, k) => `<path d="M${f1(800 + r * 30 + k * 55)} ${f1(462 - r * 52 - k * 14)} v26" stroke="#9C8E72" stroke-width="4"/>`).join('');
  s += `<rect x="560" y="300" width="130" height="90" rx="10" fill="${st}" ${S} stroke-width="5"/><path d="M575 300 V260 H675 V300" fill="${st}" ${S} stroke-width="5"/>`;
  s += `<circle cx="625" cy="420" r="80" fill="${st}" ${S} stroke-width="6"/><path d="M560 450 Q560 560 625 580 Q690 560 690 450 Q660 500 625 500 Q590 500 560 450 Z" fill="#9C8E72" ${S} stroke-width="5"/><circle cx="600" cy="405" r="7" fill="${C.ink}"/>`;
  s += `<rect x="420" y="810" width="1080" height="120" fill="#CFC2A6" ${S} stroke-width="6"/>`;
  const grid = (x, y, k, col, sw) => [...Array(12)].map((_, i) => `<rect x="${x + (i % 4) * k}" y="${y + Math.floor(i / 4) * k * 0.78}" width="${k}" height="${f1(k * 0.78)}" fill="none" stroke="${col}" stroke-width="${sw}"/>`).join('');
  s += grid(1000, 830, 36, '#6E604A', 3);
  const zoom = o.zoom ? eout(clamp((c.t - 0.5) / 0.6)) : 0;
  if (zoom > 0) s += `<path d="M1072 870 L1560 520" stroke="${C.ink}" stroke-width="4" stroke-dasharray="12 10" opacity="${f1(zoom)}"/>` + g(`translate(1560 470) scale(${f1(zoom)})`, `<circle r="250" fill="#CFC2A6" ${S} stroke-width="8"/>` + grid(-150, -90, 75, '#5C4C38', 7));
  if (o.label) s += hand(o.label, 960, 140, 76, c.t, 0.3);
  return s;
};
SCN.senet = (c, o) => {
  let s = paper();
  s += g('translate(960 580) scale(1.2)', senetBoard(1, c.t));
  s += hand(o.label || 'SENET', 960, 170, 96, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 870, 64, c.t, 0.6, { col: C.accent }) : '');
  return s;
};
SCN.basur = (c, o) => {
  let s = paper();
  const pcs = [['pyr', '#E9DCC0'], ['pig', '#D9C2A0'], ['dog', '#E3D2B0'], ['ball', '#C9B79A'], ['pyr', '#D9C2A0'], ['disc', '#E9DCC0'], ['pyr', '#E3D2B0'], ['ball', '#E9DCC0']];
  pcs.forEach(([k, col], i) => {
    const x = 460 + (i % 4) * 330, y = 460 + Math.floor(i / 4) * 300;
    const sh = k === 'pyr' ? `<path d="M0 -70 L60 50 L-60 50 Z" fill="${col}" ${S} stroke-width="5"/>` : k === 'ball' ? `<circle r="55" fill="${col}" ${S} stroke-width="5"/>` : k === 'disc' ? `<ellipse rx="70" ry="30" fill="${col}" ${S} stroke-width="5"/>` : k === 'pig' ? `<ellipse rx="70" ry="44" fill="${col}" ${S} stroke-width="5"/><circle cx="-60" cy="-10" r="22" fill="${col}" ${S} stroke-width="4"/><path d="M-40 40 v20 M40 40 v20" ${S} stroke-width="6"/>` : `<ellipse rx="66" ry="36" fill="${col}" ${S} stroke-width="5"/><circle cx="-60" cy="-36" r="24" fill="${col}" ${S} stroke-width="4"/><path d="M60 -10 l30 -30" ${S} stroke-width="6"/>`;
    s += pop(x, y, c.t, 0.2 + i * 0.12, sh);
  });
  s += hand(o.label || 'BAŞUR HÖYÜK, TURKEY', 960, 170, 76, c.t, 0.1) + hand(o.sub || '~5,000 YEARS', 960, 870, 64, c.t, 1.0, { col: C.accent });
  return s;
};
SCN.stringGame = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#DCE8EE"/>`;
  const sp = 180 + Math.sin(c.t * 1.5) * 30, st = Math.floor(c.t / 1.6) % 3;
  const L = [960 - sp - 120, 560], R = [960 + sp + 120, 560];
  s += g(`translate(${L[0]} ${L[1]}) rotate(90)`, handShape(1.2, 0)) + g(`translate(${R[0]} ${R[1]}) rotate(-90)`, handShape(1.2, 0));
  const xs = [-sp, -sp / 2, 0, sp / 2, sp], col = '#C0392B';
  let d = '';
  if (st === 0) d = `M${960 - sp} 470 L${960 + sp} 650 M${960 - sp} 650 L${960 + sp} 470 M${960 - sp} 470 H${960 + sp} M${960 - sp} 650 H${960 + sp}`;
  else if (st === 1) d = `M${960 - sp} 470 L960 560 L${960 + sp} 470 M${960 - sp} 650 L960 560 L${960 + sp} 650 M${960 - sp} 520 Q960 600 ${960 + sp} 520 M${960 - sp} 600 Q960 520 ${960 + sp} 600`;
  else d = `M${960 - sp} 470 L${960 - sp / 2} 650 L960 470 L${960 + sp / 2} 650 L${960 + sp} 470 M${960 - sp} 650 L${960 - sp / 2} 470 L960 650 L${960 + sp / 2} 470 L${960 + sp} 650`;
  s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += hand(o.label || 'STRING FIGURES', 960, 160, 90, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 860, 64, c.t, 0.6, { col: C.accent }) : '');
  return s;
};

// ---------- sport ----------
SCN.swimmers = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#D9A46A"/>` + [...Array(14)].map((_, i) => `<ellipse cx="${(i * 233) % 1920}" cy="${(i * 157) % 1080}" rx="${160 + (i % 4) * 40}" ry="${70 + (i % 3) * 30}" fill="${i % 2 ? '#CF9860' : '#E2B27A'}" opacity=".7"/>`).join('');
  [[600, 420], [900, 380], [1250, 450], [760, 640], [1100, 600], [1420, 680], [520, 760]].forEach(([x, y], i) => { s += swimmer(x, y, 1.0, c.t, i); });
  s += hand(o.label || 'THE CAVE OF SWIMMERS', 960, 150, 84, c.t, 0.3, { col: '#5C2A1A' }) + (o.sub ? hand(o.sub, 960, 880, 64, c.t, 0.7, { col: '#5C2A1A' }) : '');
  return s;
};
SCN.ballgame = (c, o) => {
  if (o.ball) {
    let s = paper();
    const b = Math.abs(Math.sin(c.t * 4)) * 160;
    s += `<ellipse cx="960" cy="860" rx="${f1(120 - b * 0.3)}" ry="18" fill="${C.ink}" opacity=".15"/>` + g(`translate(960 ${f1(790 - b)})`, rubberBall(1.6));
    return s + hand(o.label || 'RUBBER BALLS', 960, 170, 96, c.t, 0.2) + hand(o.sub || '~3,600 YEARS', 960, 880, 64, c.t, 0.6, { col: C.accent });
  }
  let s = `<rect width="${W}" height="${H}" fill="#BFDDEA"/><rect y="560" width="${W}" height="520" fill="#D9C2A0"/>`;
  s += `<path d="M0 560 L400 560 L520 760 L520 1080 L0 1080 Z M1920 560 L1520 560 L1400 760 L1400 1080 L1920 1080 Z" fill="#C9A97A" ${S} stroke-width="6"/>`;
  const bx = 960 + Math.sin(c.t * 2.2) * 300, by = 760 - Math.abs(Math.cos(c.t * 2.2)) * 220;
  s += person({ x: 700, y: 980, s: 1.0, t: c.t, seed: 44, face: 'happy', la: [-60, -80], ra: [60, 80], tunicC: '#B9473A' }) + person({ x: 1220, y: 980, s: 1.0, t: c.t, seed: 46, face: 'happy', flip: true, la: [-60, -80], ra: [60, 80], tunicC: '#3E5C8A' });
  s += g(`translate(${f1(bx)} ${f1(by)})`, rubberBall(0.6));
  if (o.label) s += hand(o.label, 960, 140, 84, c.t, 0.3);
  return s;
};
SCN.wrestlers = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#EADBB8"/>`;
  for (let r = 0; r < 2; r++) {
    s += `<path d="M0 ${560 + r * 360} H1920" stroke="#8E6A3C" stroke-width="6"/>`;
    for (let k = 0; k < 6; k++) {
      const x = 200 + k * 300, y = 550 + r * 360, ph = (k + r) % 3;
      const lean = Math.sin(c.t * 2 + k + r) * 6;
      s += pop(x, y, c.t, 0.1 + (r * 6 + k) * 0.06, g(`rotate(${f1(lean)})`, egyptFig(-40, 0, 1.1, '#9C4A2A', [60, -150 + ph * 20], [50, -100]) + egyptFig(40, 0, 1.1, '#E0B98A', [-60, -140], [-50, -110 + ph * 20], true)));
    }
  }
  if (o.label) s += g('translate(960 130)', `<rect x="-460" y="-60" width="920" height="110" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand(o.label, 0, 22, 62, c.t, 0.4));
  return s;
};
SCN.blanketToss = (c, o) => {
  let s = bgSnow(c.t, {});
  const p = Math.abs(Math.sin(c.t * 2.0)), sag = (1 - p) * 30;
  [560, 780, 1140, 1360].forEach((x, i) => { s += inuit({ x, y: 1010, s: 0.95, t: c.t, seed: 50 + i * 3, hip: 168, face: 'laugh', la: [i < 2 ? 120 : -120, -40], ra: [i < 2 ? 120 : -120, -40], flip: i >= 2 }); });
  s += `<ellipse cx="960" cy="${f1(745 + sag)}" rx="440" ry="${f1(46 + sag)}" fill="#B98E5A" ${S} stroke-width="7"/><ellipse cx="960" cy="${f1(735 + sag)}" rx="380" ry="${f1(28 + sag * 0.6)}" fill="#C9A06A"/>`;
  s += inuit({ x: 960, y: f1(745 + sag - p * 430), s: 0.85, t: c.t, seed: 61, hip: 168, face: p > 0.4 ? 'laugh' : 'surprised', la: [-150, -150], ra: [150, 150], ll: [-20, -10], rl: [20, 10] });
  if (o.label) s += hand(o.label, 960, 140, 84, c.t, 0.3);
  return s;
};
SCN.highKick = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E8E0D2"/><rect y="880" width="${W}" height="200" fill="#B9A58A"/>`;
  s += `<path d="M1120 0 V260" ${S} stroke-width="4"/>` + g('translate(1120 290)', `<ellipse rx="40" ry="30" fill="#8E6A3C" ${S} stroke-width="4"/>`);
  const p = (c.t % 2.2) / 2.2, up = Math.sin(Math.PI * clamp(p * 1.6)) * 1;
  s += person({ x: 960, y: f1(900 - up * 260), s: 1.2, t: c.t, seed: 66, face: 'surprised', tunicC: '#C9A97A', hairC: '#2B2118', la: [-120, -40], ra: [120, 40], ll: [-4, -2], rl: [lerp(4, 160, up), lerp(2, 20, up)] });
  if (o.label) s += hand(o.label, 700, 160, 84, c.t, 0.3);
  return s;
};

// ---------- jokes ----------
SCN.jokeTablet = (c, o) => {
  let s = paper();
  s += g('translate(520 560) rotate(-5)', `<rect x="-280" y="-340" width="560" height="680" rx="44" fill="#C9A06A" ${S} stroke-width="6"/>` + cuneiform(60, c.t, 0.1));
  (o.lines || []).forEach((l, i) => { s += hand(l, 1320, 380 + i * 90, 62, c.t, (o.t0 ?? 0.6) + i * 0.6, { col: i === (o.lines.length - 1) && o.punch ? C.accent : C.text }); });
  if (o.label) s += hand(o.label, 960, 130, 76, c.t, 0.2);
  if (o.laugh != null) s += laughLines(1560, 780, c.t, C.accent);
  return s;
};
SCN.jokeBook = (c, o) => {
  let s = paper();
  s += g('translate(960 600)', `<rect x="-700" y="-300" width="1400" height="560" rx="20" fill="#F1E3C2" ${S} stroke-width="6"/><circle cx="-700" cy="-20" r="50" fill="#D9C08E" ${S} stroke-width="6"/><circle cx="700" cy="-20" r="50" fill="#D9C08E" ${S} stroke-width="6"/>`);
  s += hand(o.label || 'PHILOGELOS · "LAUGHTER-LOVER"', 960, 170, 70, c.t, 0.1);
  (o.lines || []).forEach((l, i) => { s += hand(l, 960, 520 + i * 110 - (o.lines.length - 1) * 55, 76, c.t, 0.5 + i * 0.9, { col: i % 2 ? C.accent : C.text }); });
  return s;
};
SCN.barber = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#EADBB8"/><rect y="860" width="${W}" height="220" fill="#C9A97A"/>`;
  s += `<rect x="900" y="660" width="260" height="40" fill="#8E6A3C" ${S} stroke-width="5"/><path d="M920 700 v160 M1140 700 v160" ${S} stroke-width="10"/>`;
  s += person({ x: 1030, y: 860, s: 1.1, t: c.t, seed: 72, face: o.silent ? 'smug' : 'neutral', beard: true, ...sit, la: [30, 40], ra: [-30, -40], armsFront: true, tunicC: '#F3EBDD' });
  const snip = Math.sin(c.t * 10) * 10;
  s += person({ x: 1400, y: 980, s: 1.1, t: c.t, seed: 74, face: 'happy', flip: true, la: [-120, -60], ra: [150, -150], tunicC: '#E8DCCB', holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(${f1(snip)})`, `<path d="M0 0 l-50 -14 M0 0 l-50 14" ${S} stroke-width="6"/>`) });
  if (o.q) s += pop(1500, 320, c.t, 0.3, speech(0, 0, 640, 160, -120, 130, hand(o.q, 0, 18, 50, 1, DONE)));
  if (o.a) s += pop(700, 440, c.t, o.at ?? 1.2, speech(0, 0, 380, 150, 140, 120, hand(o.a, 0, 20, 64, 1, DONE, { col: C.accent })));
  return s;
};
SCN.boredomBook = (c, o) => {
  let s = paper();
  s += g('translate(960 600)', `<rect x="-520" y="-340" width="1040" height="660" rx="16" fill="#5E3A1A" ${S} stroke-width="6"/><rect x="-500" y="-320" width="490" height="620" fill="#FBF6EC" ${S} stroke-width="4"/><rect x="10" y="-320" width="490" height="620" fill="#FBF6EC" ${S} stroke-width="4"/>`);
  for (let i = 0; i < 11; i++) s += `<path d="M${500} ${330 + i * 48} h${380 - (i % 3) * 40} M${1010} ${330 + i * 48} h${400 - (i % 4) * 30}" stroke="#C9BBA6" stroke-width="10" stroke-linecap="round"/>`;
  const hl = eout(clamp((c.t - 0.8) / 0.5));
  s += `<rect x="1050" y="510" width="${f1(260 * hl)}" height="64" fill="#FFE45C" opacity=".8"/>` + hand('BOREDOM', 1180, 560, 56, c.t, 0.9, { col: C.red });
  s += hand(o.label || 'BLEAK HOUSE', 960, 150, 84, c.t, 0.2) + hand(o.sub || 'CHARLES DICKENS, 1850s', 960, 235, 56, c.t, 0.5, { col: C.accent });
  return s;
};

// ---------- music, dance, stories ----------
SCN.dancePot = (c, o) => {
  let s = paper();
  s += `<path d="M560 300 Q520 520 620 760 Q700 900 960 900 Q1220 900 1300 760 Q1400 520 1360 300 Z" fill="#D9A46A" ${S} stroke-width="7"/><ellipse cx="960" cy="300" rx="400" ry="50" fill="#C08A50" ${S} stroke-width="7"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 690 + i * 108, b = Math.sin(c.t * 5 + i * 0.9) * 12;
    s += g(`translate(${x} ${f1(620 + b)})`, `<circle cy="-90" r="18" fill="#3A2418"/><path d="M0 -72 V0 M0 0 L-24 60 M0 0 L24 60 M0 -56 L-54 -${f1(80 + b)} M0 -56 L54 -${f1(80 - b)}" stroke="#3A2418" stroke-width="10" stroke-linecap="round"/>`);
  }
  s += hand(o.label || 'DANCERS ON A POT', 960, 130, 80, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 225, 60, c.t, 0.6, { col: C.accent }) : '');
  return s;
};
SCN.polyphony = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#7FA86A"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${180 + (i % 2) * 90}" r="${190 + (i % 3) * 40}" fill="${i % 2 ? '#4F7A44' : '#5E8A4E'}"/>`).join('') + `<rect y="820" width="${W}" height="260" fill="#6E5A3E"/>`;
  const cols = ['#FFE45C', '#FF8FA3', '#9FD3FF', '#B6F09C', '#FFFFFF'];
  [520, 760, 1000, 1240, 1480].forEach((x, i) => {
    s += person({ x, y: 960, s: 0.95, t: c.t, seed: 80 + i * 3, face: 'laugh', long: i % 2 === 1, la: [-30, -60], ra: [30, 60] });
    let d = ''; for (let k = 0; k <= 30; k++) { const xx = x - 200 + k * 30, yy = 360 + i * 30 + Math.sin(k * 0.5 + c.t * 3 + i * 1.3) * 40; d += (k ? 'L' : 'M') + f1(xx) + ' ' + f1(yy); }
    s += `<path d="${d}" fill="none" stroke="${cols[i]}" stroke-width="8" stroke-linecap="round" opacity=".9"/>`;
  });
  if (o.label) s += hand(o.label, 960, 140, 84, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};
SCN.campVote = (c, o) => {
  let s = bgNight(c.t, { seed: 91 }) + `<ellipse cx="960" cy="930" rx="700" ry="150" fill="#F28C28" opacity=".22"/>` + fire(960, 960, 0.7, c.t);
  s += person({ x: 600, y: 960, s: 1.1, t: c.t, seed: 93, face: 'laugh', la: [-150, -120], ra: [150, 120], beard: true });
  [1100, 1280, 1460, 1640].forEach((x, i) => { s += person({ x, y: 980, s: 0.85, t: c.t, seed: 95 + i * 2, face: 'happy', flip: true, long: i % 2 === 1, ...sit, la: [30, 40], ra: o.pick ? [-150, -90] : [-30, -40], armsFront: true }); });
  if (o.pick) s += pop(600, 280, c.t, 0.5, `<path d="M0 -40 L12 -12 L42 -12 L18 6 L28 36 L0 18 L-28 36 L-18 6 L-42 -12 L-12 -12 Z" fill="#FFE45C" ${S} stroke-width="4" transform="scale(2)"/>`) + hand(o.pick, 1300, 200, 70, c.t, 0.6, { col: '#FFE9A8' });
  if (o.kids) for (let i = 0; i < 3; i++) s += pop(360 + i * 110, 1000, c.t, 0.8 + i * 0.2, kid({ x: 0, y: 0, t: c.t, seed: 100 + i, face: 'happy' }));
  if (o.label) s += hand(o.label, 960, 140, 80, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};
SCN.spinDisc = (c, o) => {
  let s = paper();
  const sp = o.fast ? 18 : 2.4, a = c.t * sp, cs = Math.cos(a), front = cs >= 0;
  s += `<path d="M300 560 H${f1(960 - 230 * Math.abs(cs))} M${f1(960 + 230 * Math.abs(cs))} 560 H1620" stroke="#8E6A3C" stroke-width="6"/>`;
  const animal = (up) => g(up ? '' : 'scale(-1 1)', `<ellipse cx="0" cy="20" rx="90" ry="44" fill="#8E5A3A"/><circle cx="-90" cy="${up ? -30 : 20}" r="30" fill="#8E5A3A"/><path d="M-60 50 l-14 60 M60 50 l14 60 M-30 56 l-6 56 M30 56 l6 56" stroke="#8E5A3A" stroke-width="12" stroke-linecap="round"/>`);
  const disc = `<circle r="230" fill="#EFE3C8" ${S} stroke-width="7"/><circle r="16" fill="#8E6A3C"/>`;
  if (o.fast) s += g('translate(960 560)', disc + `<g opacity=".55">${animal(true)}</g><g opacity=".55">${animal(false)}</g>`);
  else s += g(`translate(960 560) scale(${f1(Math.max(0.04, Math.abs(cs)))} 1)`, disc + animal(front));
  s += hand(o.label || 'A SPINNING DISC', 960, 170, 84, c.t, 0.2) + (o.sub ? hand(o.sub, 960, 870, 64, c.t, 0.6, { col: C.accent }) : '');
  return s;
};
SCN.wheeledToy = (c, o) => {
  let s = bgSavanna({ seed: 103 });
  const x = 700 + ((c.t * 120) % 500), rot = c.t * 200;
  s += kid({ x: x + 360, y: 960, t: c.t, seed: 105, face: 'laugh', flip: true, la: [-150, -60], ra: [30, 40] });
  s += `<path d="M${f1(x + 100)} 880 Q${f1(x + 200)} 900 ${f1(x + 290)} 800" fill="none" ${S} stroke-width="4"/>`;
  s += g(`translate(${f1(x)} 860)`, `<ellipse cx="0" cy="-40" rx="110" ry="54" fill="#C9875A" ${S} stroke-width="5"/><circle cx="-110" cy="-80" r="38" fill="#C9875A" ${S} stroke-width="5"/><circle cx="-120" cy="-88" r="6" fill="${C.ink}"/>` + [-70, 70].map(wx => g(`translate(${wx} 20) rotate(${f1(rot)})`, `<circle r="34" fill="#B9764A" ${S} stroke-width="5"/><path d="M-30 0 H30 M0 -30 V30" ${S} stroke-width="4"/>`)).join(''));
  if (o.label) s += hand(o.label, 960, 150, 84, c.t, 0.3);
  if (o.sub) s += hand(o.sub, 960, 240, 60, c.t, 0.6, { col: C.accent });
  return s;
};

// ---------- ending ----------
SCN.fireVsPhone = (c, o) => {
  let s = `<defs><clipPath id="cl"><rect width="960" height="1080"/></clipPath><clipPath id="cr"><rect x="960" width="960" height="1080"/></clipPath></defs>`;
  s += `<g clip-path="url(#cl)"><rect width="960" height="1080" fill="#273049"/><rect y="860" width="960" height="220" fill="#3E3A3C"/>` + sofa(480, 880, 0.8) + `<path d="M440 470 L610 640 L520 680 Z" fill="#9FD3FF" opacity=".18"/>` + person({ x: 480, y: 820, s: 0.95, kind: 'modern', t: c.t, seed: 4, face: 'tired', shortHair: true, hairC: '#3A2A1E', ...sit, la: [40, 60], ra: [-40, -60], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 30)}) rotate(-10)`, phoneSvg(0.42, { feed: true, scroll: c.t * 60 })) }) + `</g>`;
  s += `<g clip-path="url(#cr)">` + bgNight(c.t, { seed: 95 }) + `<ellipse cx="1440" cy="940" rx="420" ry="120" fill="#F28C28" opacity=".25"/>` + fire(1440, 960, 0.6, c.t);
  [[1180, false], [1320, true], [1560, false], [1700, true]].forEach(([x, f], i) => { s += person({ x, y: 980, s: 0.75, t: c.t, seed: 110 + i * 3, face: 'laugh', flip: f, long: i % 2 === 0, ...sit, la: [30, 40], ra: [-30, -40], armsFront: true }); });
  s += laughLines(1440, 520, c.t, '#FFE9A8', 0.9) + `</g>`;
  s += `<path d="M960 0 V1080" stroke="#FFFFFF" stroke-width="12"/><path d="M960 0 V1080" ${S} stroke-width="3"/>`;
  if (o.l) s += hand(o.l, 480, 140, 70, c.t, 0.3, { col: '#FFFFFF' });
  if (o.r) s += hand(o.r, 1440, 140, 70, c.t, 0.6, { col: '#FFE9A8' });
  return s;
};

// Extra card icons: phone, knucklebone, ball, laugh.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'phone') return phoneSvg(0.9, { feed: true, scroll: t * 40 });
    if (name === 'bone2') return astragalus(1.0);
    if (name === 'ball') return rubberBall(1.4);
    if (name === 'laugh') return `<circle r="90" fill="#FFFFFF" ${S} stroke-width="6"/>` + g('scale(1.5)', faceSvg('laugh', t, 3));
    if (name === 'game') return urBoard(0.3, t, {});
    return ic(name, t);
  };
})();

// ---------- the "just think" study ----------
SCN.shockRoom = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#EEF1F2"/><rect y="860" width="${W}" height="220" fill="#D5DADC"/><path d="M0 860 H1920" ${S} stroke-width="4"/>`;
  s += `<rect x="760" y="640" width="200" height="30" fill="#9AA3A8" ${S} stroke-width="5"/><path d="M780 670 V860 M940 670 V860" ${S} stroke-width="10"/>`;
  const zapT = o.zap ?? NEVER, zapping = c.t > zapT && c.t < zapT + 0.6;
  s += person({ x: 860, y: 860, s: 1.2, kind: 'modern', t: c.t, seed: 4, face: zapping ? 'surprised' : 'tired', shortHair: true, hairC: '#3A2A1E', ...sit, la: [30, 40], ra: [-60, -80], armsFront: true, shake: zapping ? 1 : 0 });
  s += `<rect x="1080" y="700" width="220" height="160" fill="#C9CFD2" ${S} stroke-width="5"/><rect x="1120" y="650" width="140" height="70" rx="12" fill="#5C6468" ${S} stroke-width="5"/><circle cx="1190" cy="660" r="26" fill="#E0302A" ${S} stroke-width="4"/>`;
  if (zapping) s += `<path d="M1190 600 l-30 -50 l40 -10 l-30 -60 M1230 610 l30 -40 l-30 -10 l40 -50" fill="none" stroke="#F2C443" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += g('translate(1560 300)', clock(0, 0, 110, 10, 15 + Math.floor(c.t * 3) % 45)) + hand('15 MINUTES', 1560, 480, 64, c.t, 0.3, { col: C.accent });
  s += hand(o.label || 'JUST THINK', 600, 220, 90, c.t, 0.2);
  return s;
};

// ---------- Beni Hasan jugglers ----------
SCN.jugglers = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#EADBB8"/><path d="M0 860 H1920" stroke="#8E6A3C" stroke-width="6"/>`;
  [560, 960, 1360].forEach((x, i) => {
    s += egyptFig(x, 850, 1.6, i % 2 ? '#E0B98A' : '#C98A5A', [-60, -230], [60, -230], i === 1);
    for (let k = 0; k < 3; k++) { const ph = (c.t * 1.4 + k / 3 + i * 0.2) % 1, a = ph * Math.PI * 2; s += `<circle cx="${f1(x + Math.cos(a) * 110)}" cy="${f1(470 - Math.abs(Math.sin(a)) * 170)}" r="26" fill="${['#C0392B', '#3B5BA5', '#F2C443'][k]}" ${S} stroke-width="4"/>`; }
  });
  s += hand(o.label || 'JUGGLING · ~4,000 YEARS', 960, 140, 80, c.t, 0.3);
  if (o.sub) s += hand(o.sub, 960, 230, 56, c.t, 0.6, { col: C.accent });
  return s;
};
// ---------- Maresha knucklebone cache ----------
SCN.boneCache = (c, o) => {
  let s = paper();
  const r = rng(17);
  for (let i = 0; i < 46; i++) s += pop(360 + r() * 1000, 380 + r() * 400, c.t, 0.05 + i * 0.03, g(`rotate(${f1(r() * 360)})`, astragalus(0.45)));
  s += pop(1420, 300, c.t, 1.4, `<rect x="-200" y="-70" width="400" height="140" rx="20" fill="#FFFFFF" ${S} stroke-width="5"/>` + hand('"STOP!"', 0, 26, 84, 1, DONE, { col: C.red }));
  s += hand(o.label || '600+ KNUCKLEBONES', 700, 170, 84, c.t, 0.2) + hand(o.sub || 'MARESHA, ISRAEL · ~2,300 YEARS', 700, 250, 50, c.t, 0.6, { col: C.accent });
  return s;
};
