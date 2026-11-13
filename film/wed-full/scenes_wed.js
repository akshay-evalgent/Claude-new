// Scenes for "How Did Ancient Humans Get Married?". Builds on all earlier film libraries.
'use strict';

Object.assign(PLACES, {
  bethlehem: [35.27, 31.68], gurgy: [3.56, 47.86], hazleton: [-1.93, 51.83], lech: [10.88, 48.2], nepal: [81.9, 30.0],
  siberia: [83.15, 51.44], yunnan: [100.78, 27.7], mantua: [10.79, 45.16], denisova: [84.68, 51.4],
});
Object.assign(REGIONS, {
  bethlehem: { center: [35.2, 31.9], scale: 9500, hl: ['Israel', 'Palestine'] },
  gurgy: { center: [2.5, 46.6], scale: 3000, hl: ['France'] },
  hazleton: { center: [-2.5, 53.2], scale: 3000, hl: ['United Kingdom'] },
  lech: { center: [10.5, 49], scale: 3800, hl: ['Germany'] },
  nepal: { center: [84, 28.3], scale: 3000, hl: ['Nepal'] },
  siberia: { center: [87, 52], scale: 1500, hl: ['Russia'] },
  yunnan: { center: [102, 26], scale: 1800, hl: ['China'] },
  mantua: { center: [12, 43.5], scale: 2300, hl: ['Italy'] },
});

// ---------- helpers ----------
function veil(x, y, s = 1) { return `<path d="M${x - 50 * s} ${y - 40 * s} Q${x} ${y - 90 * s} ${x + 50 * s} ${y - 40 * s} L${x + 90 * s} ${y + 160 * s} L${x - 90 * s} ${y + 160 * s} Z" fill="#FFFFFF" opacity=".75" stroke="${C.ink}" stroke-width="${3 * s}"/>`; }
function gibbon(s = 1, t = 0, o = {}) {
  const sw = Math.sin(t * 2) * 6;
  return g(`scale(${s})`, `<path d="M-40 -150 Q-160 -260 -${f1(200 + sw)} -330" fill="none" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M-40 -150 Q-160 -260 -${f1(200 + sw)} -330" fill="none" stroke="${o.col || '#B8956A'}" stroke-width="20" stroke-linecap="round"/>` +
    `<ellipse cx="0" cy="-90" rx="60" ry="80" fill="${o.col || '#B8956A'}" ${S} stroke-width="5"/><circle cx="0" cy="-200" r="46" fill="${o.col || '#B8956A'}" ${S} stroke-width="5"/><ellipse cx="0" cy="-192" rx="30" ry="26" fill="#2B2118"/><circle cx="-10" cy="-198" r="5" fill="#FFFFFF"/><circle cx="10" cy="-198" r="5" fill="#FFFFFF"/>` +
    (o.sing ? `<ellipse cx="0" cy="-178" rx="8" ry="10" fill="#C0392B"/>` : '') + `<path d="M40 -150 Q100 -60 90 20" fill="none" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M40 -150 Q100 -60 90 20" fill="none" stroke="${o.col || '#B8956A'}" stroke-width="20" stroke-linecap="round"/>`);
}
function vole(s = 1, t = 0, flip = false) { return g(`scale(${flip ? -s : s} ${s})`, `<ellipse cx="0" cy="0" rx="70" ry="44" fill="#9C7A55" ${S} stroke-width="5"/><circle cx="-60" cy="-14" r="30" fill="#9C7A55" ${S} stroke-width="5"/><circle cx="-56" cy="-40" r="12" fill="#C9A06A" ${S} stroke-width="3"/><circle cx="-74" cy="-18" r="5" fill="${C.ink}"/><circle cx="-90" cy="-8" r="5" fill="#E88A9A"/><path d="M66 10 q30 0 40 -14" fill="none" stroke="#9C7A55" stroke-width="6"/>`); }
function heartAt(x, y, k = 1) { return g(`translate(${x} ${y})`, heart(k)); }
function nodeP(x, y, col, r = 26) { return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" ${S} stroke-width="4"/>`; }

// ---------- modern wedding ----------
SCN.wedding = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F6E8EE"/><rect y="820" width="${W}" height="260" fill="#E6D3DA"/>`;
  s += `<path d="M560 880 V420 Q960 120 1360 420 V880" fill="none" stroke="#B8956A" stroke-width="22"/>` + [...Array(14)].map((_, i) => { const a = Math.PI + i / 13 * Math.PI, x = 960 + Math.cos(a) * 400, y = 420 + Math.sin(a) * 300; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="26" fill="${['#F28CA0', '#FFFFFF', '#F2C443'][i % 3]}" ${S} stroke-width="3"/>`; }).join('');
  const oldP = C.pants; C.pants = '#2B2B30';
  s += person({ x: 1100, y: 980, s: 1.4, kind: 'modern', shirt: '#2B2B30', t: c.t, seed: 6, face: 'happy', la: [-14, -6], ra: [14, 6], flip: true });
  C.pants = oldP;
  C.pants = '#FFFFFF';
  s += veil(840, 980 - 354 * 1.4, 1.4) + person({ x: 840, y: 980, s: 1.4, kind: 'modern', shirt: '#FFFFFF', t: c.t, seed: 5, long: true, face: 'laugh', ll: [-2, -1], rl: [2, 1], la: [-14, -6], ra: [14, 6] }) + `<path d="M770 980 L805 700 Q840 680 875 700 L910 980 Z" fill="#FFFFFF" ${S} stroke-width="6"/>`;
  C.pants = oldP;
  if (o.cake) s += g('translate(1600 880)', `<rect x="-140" y="-100" width="280" height="100" fill="#FFFDF5" ${S} stroke-width="5"/><rect x="-100" y="-190" width="200" height="90" fill="#FFFDF5" ${S} stroke-width="5"/><rect x="-60" y="-260" width="120" height="70" fill="#FFFDF5" ${S} stroke-width="5"/><circle cx="0" cy="-275" r="16" fill="#F28CA0" ${S} stroke-width="3"/>`);
  if (o.paper) s += pop(1560, 520, c.t, 0.2, `<rect x="-160" y="-110" width="320" height="220" fill="#FFFDF5" ${S} stroke-width="5"/><path d="M-120 -60 H120 M-120 -20 H120 M-120 20 H60" stroke="#B8AA8A" stroke-width="8"/><circle cx="90" cy="60" r="30" fill="${C.red}" ${S} stroke-width="4"/>` + hand('CERTIFICATE', 0, -120, 40, 1, DONE));
  if (o.dress) s += pop(560, 300, c.t, 0.2, `<rect x="-160" y="-50" width="320" height="90" rx="14" fill="${C.paper}" ${S} stroke-width="4"/>` + hand('WHITE SINCE 1840', 0, 14, 44, 1, DONE, { col: C.accent }));
  return s;
};
SCN.couple = (c, o) => {
  let s = kalahari(c.t, { sky: ['#E89A62', '#F6D7A8'], hills: '#C99A6A', ground: '#D8AE6E' }) + domeHut(300, 690, 0.9) + domeHut(1650, 680, 1.0) + `<ellipse cx="960" cy="930" rx="560" ry="140" fill="#F28C28" opacity=".22"/>` + fire(960, 930, 0.6, c.t);
  s += person({ x: 760, y: 1000, s: 1.3, t: c.t, seed: 3, face: o.heart ? 'laugh' : 'happy', ...sit, la: [40, 80], ra: [40, 80] }) + person({ x: 1160, y: 1000, s: 1.25, t: c.t, seed: 5, long: true, hairC: C.hair2, face: o.heart ? 'laugh' : 'happy', ...sit, la: [40, 80], ra: [40, 80], flip: true });
  if (o.heart) s += pop(960, 440, c.t, 0.2, g(`scale(${f1(1.3 + Math.sin(c.t * 4) * 0.08)})`, heart(1.2)));
  if (o.family) s += [[400, 'neutral', 14, false, true], [560, 'happy', 9, true, false], [1360, 'happy', 12, true, true], [1520, 'neutral', 21, false, false]].map(([x, f, sd, lg, grey]) => person({ x, y: 990, s: 1.1, t: c.t, seed: sd, long: lg, keepHair: grey, hairC: grey ? '#B9B2A6' : C.hair2, beard: !lg, face: f, la: [-14, -6], ra: [14, 6], flip: x > 960 })).join('') + hand('AND THEIR FAMILIES', 960, 200, 76, c.t, 0.3);
  return s;
};
SCN.cartoonCave = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F3EBDD"/>`;
  s += `<rect x="360" y="120" width="1200" height="760" rx="10" fill="#FFF6D0" ${S} stroke-width="10"/><rect x="380" y="140" width="1160" height="120" fill="#F2C443"/>` + hand('THE CAVEMAN MYTH', 960, 225, 76, 1, DONE);
  s += person({ x: 960, y: 840, s: 1.25, t: c.t, seed: 21, beard: true, face: 'smug', la: [-14, -6], ra: [30, 60], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(150)`, club(1.0)) });
  if (o.frame) s += xmark(960, 560, 280, c.t, 0.2, 0.4) + pop(1280, 330, c.t, 0.5, `<rect x="-220" y="-50" width="440" height="90" rx="14" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('FROM CARTOONS', 0, 16, 52, 1, DONE, { col: C.red }));
  return s;
};

// ---------- apes ----------
SCN.apePairs = (c, o) => {
  const m = o.mode || 'gibbon';
  let s = `<rect width="${W}" height="${H}" fill="#A9CF95"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#7FA86A' : '#6E9A5A'}"/>`).join('');
  if (m === 'gibbon') {
    s += `<path d="M0 520 Q960 480 1920 540" fill="none" stroke="${C.woodD}" stroke-width="30"/>`;
    s += g('translate(800 760)', gibbon(1.2, c.t, { sing: !!o.sing, col: '#2B2118' })) + g('translate(1160 770) scale(-1 1)', gibbon(1.15, c.t + 1, { sing: !!o.sing, col: '#E6C27A' }));
    if (o.sing) for (let i = 0; i < 4; i++) { const p = (c.t * 0.6 + i / 4) % 1; s += `<text x="${f1(960 + (i % 2 ? 1 : -1) * (80 + p * 200))}" y="${f1(400 - p * 200)}" font-family="Hand" font-size="70" fill="#FFFFFF" opacity="${f1(1 - p)}">♪</text>`; }
    return s + hand('GIBBONS: PAIRS', 960, 160, 84, c.t, 0.2, { col: '#FFFFFF' });
  }
  s += `<rect y="860" width="${W}" height="220" fill="#8C7A54"/>`;
  if (m === 'gorilla') { s += g('translate(960 900) scale(1.25)', ape('chimp', c.t, {})).replace(/#3E342E/g, '#2B2B2B') + `<path d="M860 640 Q960 600 1060 640" fill="none" stroke="#B8B2A8" stroke-width="40" opacity=".8"/>`; s += [[480, 0.62], [680, 0.6], [1260, 0.6], [1460, 0.62]].map(([x, k]) => g(`translate(${x} 900) scale(${k})`, ape('chimp', c.t, {})).replace(/#3E342E/g, '#2B2B2B')).join(''); return s + hand('GORILLAS: ONE MALE, SEVERAL FEMALES', 960, 160, 70, c.t, 0.2, { col: '#FFFFFF' }); }
  s += [[300, 0.6], [520, 0.7], [740, 0.55], [960, 0.72], [1180, 0.6], [1400, 0.68], [1620, 0.58]].map(([x, k], i) => g(`translate(${x} ${900 + (i % 2) * 20}) scale(${k})`, ape('chimp', c.t + i, {}))).join('');
  return s + hand('CHIMPS: BIG MIXED GROUPS', 960, 160, 76, c.t, 0.2, { col: '#FFFFFF' });
};
SCN.sizeChart = (c, o) => {
  const st = o.step || 1;
  let s = paper() + `<path d="M200 860 H1720" ${S} stroke-width="6"/>`;
  s += hand(st === 1 ? 'COMPETING MALES = BIGGER MALES' : 'MALE vs FEMALE SIZE', 960, 180, 72, c.t, 0.1);
  if (st >= 2) { s += g('translate(480 860) scale(1.05)', ape('chimp', c.t, {})).replace(/#3E342E/g, '#2B2B2B') + g('translate(720 860) scale(.6)', ape('chimp', c.t, {})).replace(/#3E342E/g, '#2B2B2B') + hand('GORILLA: ~2x', 600, 940, 56, c.t, 0.3); }
  if (st >= 3) s += person({ x: 1260, y: 860, s: 1.15, t: c.t, seed: 3, face: 'happy', la: [-14, -6], ra: [14, 6] }) + person({ x: 1460, y: 860, s: 1.0, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [14, 6] }) + hand('HUMANS: A LITTLE', 1360, 940, 56, c.t, 0.3);
  return s;
};

// ---------- love ----------
SCN.voles = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#CFE6B8"/><rect y="760" width="${W}" height="320" fill="#9FBF6E"/>`;
  for (let i = 0; i < 30; i++) s += `<path d="M${i * 66} 780 q10 -50 20 0" fill="#7FA34E"/>`;
  if (o.pair) {
    const close = o.change ? clamp(c.t / 1.2) : 1;
    s += g(`translate(${f1(o.change ? lerp(500, 820, close) : 820)} 820)`, vole(1.6, c.t)) + g(`translate(${f1(o.change ? lerp(1400, 1060, close) : 1060)} 830)`, vole(1.5, c.t, true));
    if (!o.change || close > 0.95) s += pop(940, 560, c.t, o.change ? 1.2 : 0.2, heart(1.1));
    if (o.meadow) s += g('translate(400 940)', vole(0.9, c.t)) + g('translate(1600 950)', vole(0.9, c.t, true)) + hand('MEADOW VOLES: ALONE', 960, 1010 - 60, 52, c.t, 0.3);
    s += hand(o.change ? 'ONE GENE BOOSTED' : 'PRAIRIE VOLES: PAIRS', 960, 180, 76, c.t, 0.2);
  } else s += g('translate(960 820)', vole(2.2, c.t)) + hand('VOLES', 960, 200, 90, c.t, 0.2);
  return s;
};
SCN.loveChart = (c, o) => {
  let s = paper();
  for (let i = 0; i < 166; i++) {
    const x = 330 + (i % 21) * 60, y = 300 + Math.floor(i / 21) * 72;
    const yes = i < 147, p = clamp((c.t - i * 0.006) / 0.3);
    s += yes ? g(`translate(${x} ${y}) scale(${f1(0.32 * p)})`, heart(1)) : (o.q ? `<text x="${x}" y="${y + 14}" font-family="Hand" font-size="40" text-anchor="middle" fill="#6E6A62" opacity="${f1(p)}">?</text>` : `<circle cx="${x}" cy="${y}" r="8" fill="#C9C2B0" opacity="${f1(p)}"/>`);
  }
  return s + hand('147 OF 166 CULTURES', 960, 200, 90, c.t, 0.3, { col: C.red });
};
SCN.sakhri = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#2E2A30"/>` + `<rect x="560" y="860" width="800" height="40" fill="#5A5460"/>`;
  if (o.glow) s += `<circle cx="960" cy="560" r="${f1(330 + Math.sin(c.t * 2) * 12)}" fill="#FFF3C4" opacity=".14"/>`;
  s += g('translate(960 580) scale(1.5)', `<path d="M-160 160 Q-200 0 -120 -120 Q-60 -200 0 -170 Q60 -200 120 -120 Q200 0 160 160 Z" fill="#CFC2A8" ${S} stroke-width="6"/><circle cx="-60" cy="-120" r="44" fill="#D9CDB4" ${S} stroke-width="5"/><circle cx="60" cy="-120" r="44" fill="#D9CDB4" ${S} stroke-width="5"/><path d="M-110 -40 Q0 40 110 -40 M-120 40 Q0 120 120 40" fill="none" stroke="#9C9078" stroke-width="10" stroke-linecap="round"/>`);
  return s + hand('~11,000 YEARS OLD', 960, 160, 76, c.t, 0.3, { col: '#F3EBDD' });
};

// ---------- why pair ----------
SCN.dadCare = (c, o) => {
  let s = o.aka ? `<rect width="${W}" height="${H}" fill="#6E9A5A"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${160 + (i % 2) * 80}" r="${190 + (i % 3) * 40}" fill="${i % 2 ? '#4F7A44' : '#5E8A4E'}"/>`).join('') + `<rect y="860" width="${W}" height="220" fill="#7A6A4A"/>` : kalahari(c.t) + domeHut(300, 690, 0.9);
  s += person({ x: 960, y: 1000, s: 1.5, t: c.t, seed: 6, beard: true, face: 'laugh', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 30)})`, baby(0.95)) });
  return s + hand(o.aka ? 'AKA FATHERS' : 'FATHERS HELP', 960, 180, 84, c.t, 0.3, { col: '#FFFFFF' });
};
SCN.parents = c => {
  let s = kalahari(c.t) + domeHut(1500, 690, 1.0) + fire(1250, 900, 0.5, c.t);
  s += person({ x: 760, y: 1000, s: 1.3, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 20)})`, baby(0.7)) });
  s += person({ x: 1000, y: 1000, s: 1.35, t: c.t, seed: 6, beard: true, face: 'happy', la: [-14, -6], ra: [60, 100], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, meat(0.5, 4)) }) + kid({ x: 1140, y: 1000, s: 1.2, t: c.t, seed: 9, face: 'laugh', la: [-14, -6], ra: [14, 6] });
  return s + hand('TWO ADULTS, SHARING THE WORK', 960, 180, 70, c.t, 0.3);
};

// ---------- foragers ----------
SCN.hadzaHut = (c, o) => {
  let s = kalahari(c.t) + domeHut(960, 720, 1.6);
  s += today(() => person({ x: 600, y: 1000, s: 1.3, t: c.t, seed: 3, face: 'happy', la: [-14, -6], ra: o.pair ? [-60, -80] : [14, 6] }) + person({ x: 1320, y: 1000, s: 1.25, t: c.t, seed: 5, long: true, face: 'laugh', la: o.pair ? [-60, -80] : [-14, -6], ra: [14, 6], flip: true }));
  if (o.pair) s += pop(960, 400, c.t, 0.3, heart(1.0));
  return s + hand(o.pair ? 'MARRIED.' : 'LIVING TOGETHER', 960, 180, 84, c.t, 0.3);
};
SCN.wishList = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const col = (x, title, items, t0) => { let r = hand(title, x, 260, 64, 1, DONE, { col: C.accent }) + `<rect x="${x - 300}" y="300" width="600" height="560" rx="20" fill="#FFFFFF" ${S} stroke-width="5"/>`; items.forEach(([ic, lab, tt], i) => { r += pop(x - 200, 400 + i * 150, c.t, tt, ic) + hand(lab, x - 120, 420 + i * 150, 46, c.t, tt + 0.1, { anchor: 'start' }); }); return r; };
  const heartI = g('scale(.5)', heart(1)), brainI = g('scale(.35)', `<path d="M-90 10 Q-100 -70 -30 -80 Q0 -110 40 -80 Q100 -80 100 -10 Q110 50 50 60 Q0 80 -50 60 Q-100 60 -90 10 Z" fill="#F0A2B4" ${S} stroke-width="8"/>`), bowI = g('scale(.5)', `<path d="M0 -70 Q40 0 0 70" fill="none" stroke="${C.woodD}" stroke-width="10"/><path d="M0 -70 L0 70" stroke="#B8AA8A" stroke-width="4"/>`), workI = g('scale(.6)', leaf(0, 0, -20, 1));
  const D = (k) => k < st ? DONE : 0.1;
  s += col(560, 'WOMEN WANTED', [[heartI, 'GOOD CHARACTER', D(0)]].concat(st >= 2 ? [[brainI, 'INTELLIGENCE', st === 2 ? 0.2 : DONE], [bowI, 'A GOOD FORAGER', st === 2 ? 0.4 : DONE]] : []), 0.1);
  s += col(1360, 'MEN WANTED', [[heartI, 'GOOD CHARACTER', D(0)]].concat(st >= 3 ? [[workI, 'A HARD WORKER', 0.2]] : []), 0.1);
  return s;
};
SCN.brideService = (c, o) => {
  let s = kalahari(c.t) + domeHut(1500, 690, 1.0);
  s += today(() => person({ x: 1360, y: 1000, s: 1.1, t: c.t, seed: 14, keepHair: true, hairC: '#B9B2A6', face: o.hunt ? 'laugh' : 'neutral', la: [-14, -6], ra: [14, 6], flip: true }) + person({ x: 1560, y: 1000, s: 1.05, t: c.t, seed: 9, long: true, keepHair: true, hairC: '#B9B2A6', face: o.hunt ? 'laugh' : 'happy', la: [-14, -6], ra: [14, 6], flip: true }) + person({ x: 1700, y: 1010, s: 1.0, t: c.t, seed: 5, long: true, face: 'happy', la: [-14, -6], ra: [14, 6], flip: true }));
  const x = o.move ? lerp(300, 1080, eout(clamp(c.t / 1.6))) : o.hunt ? 1100 : 400;
  s += today(() => person({ x, y: 1000, s: 1.25, t: c.t, seed: 3, face: 'happy', la: [-14, -6], ra: o.hunt ? [-60, -90] : [-80, -110], holdR: o.hunt ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 40)}) scale(.6)`, antelope(false, 0))) : (e => `<path d="M${f1(e[0])} ${f1(e[1])} l40 -120" stroke="${C.woodD}" stroke-width="7"/>`) }));
  return s + hand(o.hunt ? 'HUNTING FOR THE IN-LAWS' : o.move ? 'MOVING IN WITH HER FAMILY' : 'BRIDE SERVICE', 960, 180, 72, c.t, 0.3);
};
SCN.nisa = c => {
  let s = paper() + g('translate(700 560)', `<rect x="-240" y="-320" width="480" height="640" rx="12" fill="#C9785A" ${S} stroke-width="7"/>` + hand('NISA', 0, -200, 100, 1, DONE, { col: '#FFF3D6' }) + hand('THE LIFE AND WORDS', 0, -120, 34, 1, DONE, { col: '#FFF3D6' }) + hand('OF A !KUNG WOMAN', 0, -80, 34, 1, DONE, { col: '#FFF3D6' }));
  s += today(() => person({ x: 1340, y: 1000, s: 1.4, t: c.t, seed: 5, long: true, face: 'smug', la: [-40, -100], ra: [40, 100], armsFront: true }));
  return s + pop(1340, 420, c.t, 0.3, speech(0, 0, 220, 100, -20, 110, hand('NO!', 0, 18, 64, 1, DONE, { col: C.red })));
};
SCN.inlawAvoid = (c, o) => {
  let s = kalahari(c.t, { sky: ['#F2B27A', '#FBE3B5'], hills: '#B8603A', ground: '#C9784A' });
  s += person({ x: 600, y: 1000, s: 1.3, t: c.t, seed: 3, face: 'worried', la: [-14, -6], ra: [14, 6], flip: true }) + person({ x: 1320, y: 1000, s: 1.25, t: c.t, seed: 9, long: true, keepHair: true, hairC: '#B9B2A6', face: 'neutral', la: [-14, -6], ra: [14, 6] });
  s += `<path d="M960 1000 V560" stroke="${C.woodD}" stroke-width="10"/><path d="${smooth([[860, 760], [900, 600], [1020, 560], [1060, 700], [1000, 820], [900, 820]])}" fill="#5E8A4E" ${S} stroke-width="5"/>`;
  if (o.talk) s += pop(600, 480, c.t, 0.2, speech(0, 0, 340, 110, 30, 120, hand('(RESPECT WORDS)', 0, 16, 40, 1, DONE)));
  return s + hand('MOTHER-IN-LAW', 1320, 400, 60, c.t, 0.3);
};

// ---------- DNA ----------
SCN.dna = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/>`;
  for (let i = 0; i < 30; i++) { const y = 140 + i * 28, ph = i * 0.45 + c.t * 1.5, x1 = 960 + Math.sin(ph) * 220, x2 = 960 - Math.sin(ph) * 220; s += `<path d="M${f1(x1)} ${y} L${f1(x2)} ${y}" stroke="${['#F2C443', '#E07A8A', '#4F9FD0', '#7FC48A'][i % 4]}" stroke-width="8"/><circle cx="${f1(x1)}" cy="${y}" r="10" fill="#FFFFFF"/><circle cx="${f1(x2)}" cy="${y}" r="10" fill="#FFFFFF"/>`; }
  if (o.read) { const y = 140 + ((c.t * 300) % 840); s += `<rect x="560" y="${f1(y)}" width="800" height="16" fill="#9FFFB8" opacity=".6"/>` + hand('NOT CLOSE RELATIVES', 960, 1000 - 60, 64, c.t, 0.6, { col: '#9FFFB8' }); }
  return s;
};
SCN.bandNet = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#D8C08A"/>`;
  const camps = [[360, 300], [980, 220], [1580, 340], [500, 760], [1120, 680], [1640, 820], [260, 980]];
  if (o.links) [[0, 1], [1, 2], [0, 3], [3, 4], [1, 4], [4, 5], [2, 5], [3, 6]].forEach(([a, b], i) => { const [x1, y1] = camps[a], [x2, y2] = camps[b]; s += `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${C.red}" stroke-width="6" stroke-dasharray="14 10" opacity=".8"/>`; const p = ((c.t * 0.4) + i / 8) % 1; s += g(`translate(${f1(lerp(x1, x2, p))} ${f1(lerp(y1, y2, p))}) scale(.35)`, heart(1)); });
  camps.forEach(([x, y], i) => { s += `<ellipse cx="${x}" cy="${y + 20}" rx="130" ry="80" fill="#E8D6A6" ${S} stroke-width="5"/>` + domeHut(x - 70, y + 50, 0.3) + domeHut(x + 70, y + 40, 0.28) + domeHut(x + 5, y + 6, 0.24) + fire(x - 10, y + 70, 0.14, c.t + i); });
  return s + hand(o.links ? 'BANDS LINKED BY MARRIAGE' : 'SMALL BANDS, SPREAD OUT', 960, 110, 64, c.t, 0.3);
};
function neander(o) { return person(Object.assign({ beard: true }, o)) ; }
SCN.neanderFamily = (c, o) => {
  let s = caveRoom(c.t) + lamp(960, 980, c.t, 1.1);
  s += neander({ x: 760, y: 1000, s: 1.4, t: c.t, seed: 21, hairC: '#B8603A', face: 'happy', la: [-14, -6], ra: [60, 100] }) + kid({ x: 960, y: 1000, s: 1.7, t: c.t, seed: 9, long: true, hairC: '#B8603A', face: 'happy', la: [-60, -100], ra: [14, 6] });
  if (o.group) s += [[400, 1.0], [560, 0.7], [1240, 1.1], [1420, 0.9], [1580, 0.65]].map(([x, k], i) => person({ x, y: 1000, s: k, t: c.t, seed: 3 + i * 4, long: i % 2 === 0, hairC: '#B8603A', face: 'happy', la: [-14, -6], ra: [14, 6], flip: x > 960 })).join('') + hand('10 TO 20 PEOPLE', 960, 200, 76, c.t, 0.3, { col: '#F3EBDD' });
  else if (!o.move) s += hand('A FATHER AND HIS DAUGHTER', 960, 200, 76, c.t, 0.3, { col: '#F3EBDD' });
  if (o.move) { const x = lerp(1900, 1300, eout(clamp(c.t / 1.6))), k = Math.sin(c.t * 7) * 18; s += person({ x, y: 1000, s: 1.2, t: c.t, seed: 5, long: true, hairC: '#B8603A', face: 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-30, -40], ra: [30, 40], flip: true }) + arrow(1800, 760, 1500, 760, c.t, 0.2, 0.4, '#F3EBDD') + hand('WOMEN MOVED', 1560, 680, 60, c.t, 0.4, { col: '#F3EBDD' }); }
  return s;
};
SCN.denny = (c, o) => {
  let s = caveRoom(c.t) + lamp(400, 980, c.t, 1.0);
  s += person({ x: 700, y: 1000, s: 1.35, t: c.t, seed: 5, long: true, hairC: '#B8603A', face: 'happy', la: [-14, -6], ra: [60, 100] }) + person({ x: 1220, y: 1000, s: 1.35, t: c.t, seed: 21, beard: true, hairC: '#2B2118', face: 'happy', la: [-60, -100], ra: [14, 6], flip: true });
  s += hand('NEANDERTHAL', 700, 360, 56, c.t, 0.2, { col: '#F3EBDD' }) + hand('DENISOVAN', 1220, 360, 56, c.t, 0.3, { col: '#F3EBDD' });
  if (o.child) s += pop(960, 1000, c.t, 0.2, kid({ x: 0, y: 0, s: 1.4, t: c.t, seed: 9, long: true, hairC: '#6B4423', face: 'laugh', la: [-150, -170], ra: [150, 170] })) + hand('DENNY', 960, 560, 70, c.t, 0.5, { col: C.accent });
  return s;
};
SCN.familyTree = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const gens = 7, man = '#4F8AC9', wom = '#E08A5A';
  for (let gI = 0; gI < Math.min(gens, st >= 2 ? gens : 2); gI++) {
    const y = 180 + gI * 120, n = Math.min(1 + gI, 5);
    for (let i = 0; i < n; i++) {
      const x = 960 + (i - (n - 1) / 2) * 260;
      if (gI > 0) s += `<path d="M960 ${y - 120} L${x} ${y}" stroke="#B8AA8A" stroke-width="4" opacity=".6"/>`;
      s += nodeP(x - 30, y, st >= 3 ? man : '#C9C2B0') + nodeP(x + 30, y, st >= 4 ? wom : '#C9C2B0');
      if (st >= 4) s += `<path d="M${x + 160} ${y - 40} L${x + 60} ${y}" stroke="${wom}" stroke-width="5"/>`;
    }
  }
  if (st === 5) { s = paper() + nodeP(960, 300, man, 40); [[560, 600], [820, 640], [1100, 640], [1360, 600]].forEach(([x, y], i) => { s += `<path d="M960 300 L${x} ${y}" stroke="#B8AA8A" stroke-width="5"/>` + nodeP(x, y, wom, 34) + [-60, 0, 60].map(dx => `<path d="M${x} ${y} L${x + dx} ${y + 200}" stroke="#B8AA8A" stroke-width="3"/>` + nodeP(x + dx, y + 200, i % 2 ? man : wom, 18)).join(''); }); return s + hand('ONE MAN, FOUR WOMEN', 960, 160, 76, c.t, 0.3) + hand('HAZLETON NORTH', 960, 980, 52, c.t, 0.4, { col: C.accent }); }
  return s + (st === 2 ? hand('7 GENERATIONS', 1560, 220, 52, c.t, 0.3, { col: C.accent }) : st === 3 ? hand('MEN: BORN HERE', 1560, 220, 48, c.t, 0.3, { col: man }) : st === 4 ? hand('WOMEN: FROM ELSEWHERE', 1500, 220, 46, c.t, 0.3, { col: wom }) : hand('GURGY, FRANCE', 1560, 220, 48, c.t, 0.3));
};
SCN.womenTravel = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#CFE6EE"/><path d="M0 620 Q480 420 960 560 T1920 480 V1080 H0 Z" fill="#9FBF6E"/><path d="M700 1080 Q860 820 1100 760 Q1300 700 1400 560" fill="none" stroke="#6FB5E0" stroke-width="50" stroke-linecap="round"/>`;
  [[900, 900], [1260, 760], [500, 960]].forEach(([x, y]) => { s += smallHouse(x, y, 1.4) + smallHouse(x + 90, y + 20, 1.2); });
  const k = Math.sin(c.t * 7) * 18, p = clamp(c.t / 2.0);
  s += person({ x: lerp(1900, 1100, p), y: lerp(600, 880, p), s: 0.9, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-30, -40], ra: [30, 40], flip: true });
  if (o.links) s += [[1900, 300], [0, 400], [1800, 900]].map(([x, y]) => `<path d="M${x} ${y} Q${(x + 960) / 2} ${(y + 800) / 2 - 120} 960 820" fill="none" stroke="${C.red}" stroke-width="6" stroke-dasharray="14 10"/>`).join('') + hand('NEW IDEAS, NEW LINKS', 960, 180, 76, c.t, 0.3);
  else s += hand('HUNDREDS OF KILOMETRES', 960, 180, 76, c.t, 0.3);
  return s;
};

// ---------- many ways ----------
SCN.marriageChart = (c, o) => {
  const st = o.step || 1;
  const rows = [['MORE THAN ONE WIFE ALLOWED', 85, C.accent], ['BUT MOST MEN HAD ONE', 0, '#C9C2B0'], ['ONE SPOUSE ONLY', 15, '#4F8AC9'], ['MORE THAN ONE HUSBAND', 1, '#7FC48A']];
  let s = paper() + hand('~1,200 SOCIETIES', 960, 170, 76, c.t, DONE);
  rows.forEach(([lab, v, col], i) => {
    if (i >= st) return;
    const y = 300 + i * 160, p = i === st - 1 ? eout(clamp(c.t / 0.8)) : 1;
    if (i === 1) { s += hand(lab, 960, y + 64, 60, c.t, i === st - 1 ? 0.2 : DONE, { col: '#6E6A62' }); return; }
    s += `<rect x="760" y="${y}" width="${f1(Math.max(12, 900 * v / 100 * p))}" height="90" rx="12" fill="${col}" ${S} stroke-width="5"/>` + hand(lab, 730, y + 64, 44, 1, DONE, { anchor: 'end' }) + `<text x="${f1(780 + Math.max(12, 900 * v / 100 * p))}" y="${y + 64}" font-family="Hand" font-size="52" fill="${C.text}" opacity="${f1(p)}">~${v}%</text>`;
  });
  return s;
};
SCN.mosuo = (c, o) => {
  let s = o.home ? `<rect width="${W}" height="${H}" fill="#F2D9A6"/>` : bgNight(c.t, { seed: 801 });
  s += `<rect x="460" y="420" width="1000" height="440" fill="#B8956A" ${S} stroke-width="7"/><path d="M400 430 L960 260 L1520 430 Z" fill="#7A5A3A" ${S} stroke-width="7"/><rect x="860" y="640" width="200" height="220" fill="#5C4430"/>`;
  s += `<rect y="860" width="${W}" height="220" fill="${o.home ? '#C9B07A' : '#3E3A30'}"/>`;
  if (o.home) s += person({ x: 760, y: 1000, s: 1.2, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: 'happy', la: [-14, -6], ra: [14, 6] }) + person({ x: 1160, y: 1000, s: 1.2, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [14, 6] }) + kid({ x: 960, y: 1000, s: 1.1, t: c.t, seed: 9, face: 'laugh', la: [-150, -170], ra: [150, 170] }) + kid({ x: 1340, y: 1000, s: 0.9, t: c.t, seed: 12, face: 'happy', la: [-14, -6], ra: [14, 6] }) + hand("THE MOTHER'S FAMILY HOME", 960, 180, 70, c.t, 0.3);
  else { const k = Math.sin(c.t * 7) * 18; s += person({ x: 300 + c.t * 120, y: 1000, s: 1.1, t: c.t, seed: 6, face: 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-30, -40], ra: [30, 40] }) + hand('A WALKING MARRIAGE', 960, 180, 76, c.t, 0.3, { col: '#FFFFFF' }); }
  return s;
};
SCN.giftChart = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const pie = (x, frac, col, lab, t0) => { const p = eout(clamp((c.t - t0) / 0.8)), a = frac * p * Math.PI * 2; return `<circle cx="${x}" cy="560" r="220" fill="#E8DFD0" ${S} stroke-width="6"/>` + (a > 0.01 ? `<path d="M${x} 560 L${x} 340 A220 220 0 ${a > Math.PI ? 1 : 0} 1 ${f1(x + 220 * Math.sin(a))} ${f1(560 - 220 * Math.cos(a))} Z" fill="${col}" ${S} stroke-width="6"/>` : '') + hand(lab, x, 870, 56, c.t, t0 + 0.4, { col }); };
  s += pie(560, 0.66, C.accent, 'BRIDEWEALTH: ~2 IN 3', st === 1 ? 0.1 : -9);
  if (st >= 2) s += pie(1360, 0.035, '#4F8AC9', 'DOWRY: UNDER 4%', 0.1);
  return s + hand('MARRIAGE GIFTS', 960, 180, 84, c.t, DONE);
};

// ---------- written ----------
SCN.egyptHome = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F2D9A6"/><rect y="820" width="${W}" height="260" fill="#D9B98A"/>`;
  s += `<rect x="1100" y="380" width="620" height="460" fill="#E6D3B0" ${S} stroke-width="7"/><rect x="1340" y="600" width="140" height="240" fill="#5C4430"/>` + g('translate(400 840)', `<path d="M0 0 Q-20 -300 20 -500" fill="none" stroke="#8E6A4A" stroke-width="26"/><path d="M20 -500 q-140 0 -200 80 M20 -500 q140 0 200 80 M20 -500 q-60 -100 -160 -120 M20 -500 q60 -100 160 -120" fill="none" stroke="#5E8A3C" stroke-width="22" stroke-linecap="round"/>`);
  const oldP = C.pants; C.pants = '#F3EBDD';
  s += person({ x: 760, y: 1000, s: 1.3, kind: 'modern', shirt: '#F3EBDD', t: c.t, seed: 6, face: 'happy', la: [-14, -6], ra: [14, 6] }) + person({ x: 960, y: 1000, s: 1.25, kind: 'modern', shirt: '#F3EBDD', t: c.t, seed: 5, long: true, hairC: '#2B2118', face: 'happy', la: [-14, -6], ra: [14, 6], flip: true });
  C.pants = oldP;
  if (o.papyrus) s += pop(1400, 260, c.t, 0.2, `<rect x="-200" y="-90" width="400" height="180" fill="#EDDDB0" ${S} stroke-width="5"/>` + [...Array(12)].map((_, i) => `<path d="M${-160 + (i % 6) * 60} ${-40 + Math.floor(i / 6) * 70} l14 -20 l14 20 M${-150 + (i % 6) * 60} ${-10 + Math.floor(i / 6) * 70} h20" stroke="#5C4430" stroke-width="4" fill="none"/>`).join('')) + hand('SHE CAN OWN PROPERTY', 1400, 420, 52, c.t, 0.4, { col: C.accent });
  return s;
};
SCN.rings = (c, o) => {
  let s = paper();
  if (o.diamond) return s + g('translate(960 600)', `<ellipse rx="160" ry="160" fill="none" stroke="#E6B33C" stroke-width="30"/><path d="M-60 -170 L0 -260 L60 -170 L0 -130 Z" fill="#DCEFF7" ${S} stroke-width="5"/>`) + [0, 1, 2, 3].map(i => `<path d="M${f1(960 + Math.cos(c.t * 2 + i * 1.6) * 120)} ${f1(330 + Math.sin(c.t * 2 + i * 1.6) * 40)} l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6 l14 -6 Z" fill="#FFF6C8"/>`).join('') + hand('"A DIAMOND IS FOREVER" · 1947', 960, 160, 64, c.t, 0.3);
  if (o.vein) {
    s += g('translate(760 640) scale(2)', icon('hand', c.t)) + `<ellipse cx="${760 + 64 * 2 * 0.5}" cy="${640 - 104}" rx="24" ry="12" fill="none" stroke="#E6B33C" stroke-width="10"/>`;
    const p = clamp(c.t / 1.4);
    s += `<path d="M${780} ${560} Q1000 400 ${f1(lerp(780, 1340, p))} ${f1(lerp(560, 500, p))}" fill="none" stroke="${C.red}" stroke-width="8" stroke-dasharray="14 10"/>` + pop(1400, 500, c.t, 1.2, heart(1.2)) + hand('AN OLD BELIEF', 1300, 200, 70, c.t, 0.3);
    return s;
  }
  return s + g('translate(960 580)', `<ellipse rx="200" ry="200" fill="none" stroke="#B8956A" stroke-width="40"/><ellipse rx="200" ry="200" fill="none" ${S} stroke-width="5"/>`) + hand('ROMAN BETROTHAL RING', 960, 160, 70, c.t, 0.3);
};
SCN.valdaro = c => {
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 600, 300, c.t);
  s += g('translate(760 520) scale(1.2)', skeleton(1, { curl: 0.4 })) + g('translate(1160 540) scale(-1.2 1.2)', skeleton(1, { curl: 0.4 }));
  return s + pop(960, 380, c.t, 0.4, heart(0.9)) + hand('THE LOVERS OF VALDARO · ~6,000 YEARS', 960, 150, 64, c.t, 0.3, { col: '#FFF3D6' });
};

// ---------- the twist ----------
SCN.inlawWeb = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const person2 = (x, y, k, sd, lg, grey) => person({ x, y, s: k, t: c.t, seed: sd, long: lg, keepHair: grey, hairC: grey ? '#B9B2A6' : lg ? C.hair2 : C.hair, face: 'happy', la: [-14, -6], ra: [14, 6], flip: x > 960 });
  s += person2(860, 760, 1.0, 3, false, false) + person2(1060, 760, 0.95, 5, true, false) + pop(960, 290, c.t, 0.1, heart(0.7));
  const fam = [[360, 700, 0.85, 14, false, true], [520, 740, 0.8, 9, true, true], [440, 980, 0.7, 12, false, false], [1400, 700, 0.85, 21, false, true], [1560, 740, 0.8, 8, true, true], [1480, 980, 0.7, 2, true, false]];
  fam.forEach(([x, y, k, sd, lg, gr], i) => { s += pop(x, y, c.t, 0.2 + i * 0.1, person2(0, 0, k, sd, lg, gr)); });
  if (st >= 2) s += `<path d="M600 640 Q960 480 1320 640" fill="none" stroke="${C.red}" stroke-width="8" stroke-dasharray="16 12"/>` + hand('IN-LAWS', 960, 180, 72, c.t, 0.3, { col: C.red });
  if (st >= 3) for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; s += pop(960 + Math.cos(a) * 820, 560 + Math.sin(a) * 420, c.t, 0.2 + i * 0.05, `<circle r="30" fill="#FFFFFF" ${S} stroke-width="4"/>`); }
  return s;
};

// Extra card icon: ring.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'ring') return `<ellipse cx="0" cy="20" rx="80" ry="80" fill="none" stroke="#E6B33C" stroke-width="22"/><ellipse cx="0" cy="20" rx="80" ry="80" fill="none" ${S} stroke-width="4"/><path d="M-30 -60 L0 -110 L30 -60 L0 -40 Z" fill="#DCEFF7" ${S} stroke-width="4"/>`;
    return ic(name, t);
  };
})();

SCN.film = c => {
  let s = `<rect width="${W}" height="${H}" fill="#1C1A18"/>`;
  for (let i = 0; i < 12; i++) s += `<rect x="${i * 170 + ((c.t * 120) % 170) - 40}" y="40" width="70" height="50" rx="8" fill="#3A3632"/><rect x="${i * 170 + ((c.t * 120) % 170) - 40}" y="990" width="70" height="50" rx="8" fill="#3A3632"/>`;
  s += `<rect x="260" y="140" width="1400" height="800" fill="#D9D3C4"/>`;
  s += `<g filter="grayscale(1)">` + person({ x: 860, y: 860, s: 1.3, t: c.t, seed: 21, beard: true, face: 'smug', la: [-14, -6], ra: [-120, -150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(20)`, club(1.0)) }).replace(/#[0-9A-Fa-f]{6}/g, m => { const v = parseInt(m.slice(1), 16), r = v >> 16, gg = (v >> 8) & 255, b = v & 255, y = Math.round(0.3 * r + 0.59 * gg + 0.11 * b).toString(16).padStart(2, '0'); return '#' + y + y + y; }) + `</g>`;
  s += `<rect x="1180" y="300" width="380" height="200" fill="#1C1A18"/>` + hand('THE THREE AGES', 1370, 390, 44, 1, DONE, { col: '#F3EBDD' }) + hand('1923', 1370, 460, 48, 1, DONE, { col: '#F3EBDD' });
  for (let i = 0; i < 6; i++) s += `<path d="M${f1(300 + ((i * 337 + c.t * 900) % 1300))} 140 v800" stroke="#FFFFFF" stroke-width="2" opacity=".25"/>`;
  return s;
};
SCN.modena = c => {
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 600, 300, c.t);
  s += g('translate(620 520) scale(1.1)', skeleton(1, { curl: 0.1 })) + g('translate(620 680) scale(1.1)', skeleton(1, { curl: 0.1 }));
  s += `<circle cx="760" cy="610" r="20" fill="${BONE}" ${S} stroke-width="4"/>`;
  return s + hand('MODENA · ~1,500 YEARS', 960, 150, 64, c.t, 0.3, { col: '#FFF3D6' });
};

// Comment prompt card (added after the analytics review: ask viewers a specific question).
SCN.commentPrompt = (c, o) => {
  let s = paper();
  s += g('translate(960 460)', `<rect x="-560" y="-200" width="1120" height="360" rx="40" fill="#FFFFFF" ${S} stroke-width="7"/><path d="M-300 160 L-360 260 L-200 160 Z" fill="#FFFFFF" ${S} stroke-width="7"/><path d="M-298 156 H-198" stroke="#FFFFFF" stroke-width="10"/>`);
  s += hand(o.q || 'WHAT DO YOU THINK?', 960, o.list ? 360 : 490, 84, c.t, 0.1, { col: C.accent });
  if (o.list) o.list.forEach((l, i) => { s += pop(960, 440 + i * 70, c.t, 0.3 + i * 0.25, hand(`${i + 1}. ${l}`, 0, 0, 54, 1, DONE)); });
  const bob = Math.sin(c.t * 4) * 8;
  s += g(`translate(1460 ${f1(760 + bob)})`, `<path d="M-60 -40 H60 V40 H10 L-20 70 V40 H-60 Z" fill="${C.accent}" ${S} stroke-width="6"/><circle cx="-25" cy="0" r="8" fill="#FFFFFF"/><circle cx="0" cy="0" r="8" fill="#FFFFFF"/><circle cx="25" cy="0" r="8" fill="#FFFFFF"/>`) + hand('COMMENTS', 1460, 870, 50, c.t, 0.4, { col: C.accent });
  return s;
};
