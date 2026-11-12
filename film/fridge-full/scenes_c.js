// Scenes for the grain, roots/honey, sharing and ending chapters, plus extras.
'use strict';

// Present-day people (the Hadza and Ju|'hoansi chapters): same character style, everyday clothes, no fur tunics.
const TODAY_SHIRTS = ['#C9573E', '#4F7FA8', '#D9A441', '#6C8E4E', '#8E5A8A', '#3E6E6A'];
let TODAY = false;
(() => {
  const orig = window.person;
  window.person = function (o) {
    if (TODAY && (o.kind || 'cave') === 'cave') {
      o = Object.assign({}, o, { kind: 'modern', shirt: TODAY_SHIRTS[(o.seed || 0) % TODAY_SHIRTS.length], cloak: false, beard: false });
      if (o.long) o.hairLong = true; else o.shortHair = true;
      if (!o.keepHair) o.hairC = '#2B2118';
    }
    return orig(o);
  };
  const origDraw = drawShot;
  window.drawShot = drawShot = function (sh, t, frame) { TODAY = !!(sh.opts && sh.opts.today); try { return origDraw(sh, t, frame); } finally { TODAY = false; } };
})();
(() => {
  const origSpear = window.spear;
  window.spear = function (hx, hy, ang, len = 330, grip = 0.42) {
    if (!TODAY) return origSpear(hx, hy, ang, len, grip);
    const d = dir(ang), n = [-d[1], d[0]], L = len * 0.42;
    const a = [hx + d[0] * L, hy + d[1] * L], b = [hx - d[0] * L, hy - d[1] * L], m = [hx + n[0] * 60, hy + n[1] * 60];
    return `<path d="M${f1(a[0])} ${f1(a[1])} Q${f1(m[0])} ${f1(m[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${C.ink}" stroke-width="13" stroke-linecap="round"/><path d="M${f1(a[0])} ${f1(a[1])} Q${f1(m[0])} ${f1(m[1])} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${C.wood}" stroke-width="7" stroke-linecap="round"/><path d="M${f1(a[0])} ${f1(a[1])} L${f1(b[0])} ${f1(b[1])}" stroke="#E8E2D6" stroke-width="2.5"/>`;
  };
})();
function today(fn) { const prev = TODAY; TODAY = true; try { return fn(); } finally { TODAY = prev; } }
function kalahari(t, o = {}) {
  return bgSavanna(Object.assign({ seed: 121, sky: ['#9FCBE5', '#F6EBD2'], hills: '#E3C893', ground: '#E8C584', trees: true }, o));
}
function impala(s = 1) {
  return g(`scale(${s})`, `<path d="${smooth([[-90, -10], [-60, -50], [40, -54], [90, -30], [96, 0], [60, 14], [-60, 14]])}" fill="#C98B4E" ${S} stroke-width="5"/><path d="M-70 4 Q0 18 80 2" fill="none" stroke="#F1DDBF" stroke-width="10" stroke-linecap="round"/><path d="M-80 -30 L-120 -70" stroke="${C.ink}" stroke-width="26" stroke-linecap="round"/><path d="M-80 -30 L-120 -70" stroke="#C98B4E" stroke-width="18" stroke-linecap="round"/><ellipse cx="-130" cy="-76" rx="26" ry="16" fill="#C98B4E" ${S} stroke-width="4"/><path d="M-130 -90 q-10 -40 10 -60 M-120 -88 q0 -36 20 -50" fill="none" ${S} stroke-width="5"/><path d="M-50 14 l-10 50 M-20 14 l0 50 M50 14 l10 50 M74 10 l14 46" ${S} stroke-width="5"/>`);
}
function dots(n, cx, cy, r, t, t0, seed = 3) {
  const R = rng(seed); let s = '';
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = r * (0.35 + R() * 0.65); s += pop(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, t, t0 + i * 0.05, `<circle r="16" fill="${C.accent}" ${S} stroke-width="4"/>`); }
  return s;
}

SCN.fridgeHistory = (c, o) => {
  const st = o.step || 1;
  if (st === 1) {
    let s = bgSnow(c.t, { seed: 131 }) + `<rect y="640" width="${W}" height="440" fill="#CFE6F2"/><path d="M0 640 H1920" ${S} stroke-width="5"/>`;
    for (let i = 0; i < 5; i++) s += `<rect x="${500 + i * 150}" y="${800 + (i % 2) * 30}" width="120" height="80" fill="#E8F4FA" ${S} stroke-width="4"/>`;
    const saw = Math.sin(c.t * 10) * 20;
    s += person({ x: 400, y: 900, s: 1.1, kind: 'modern', shirt: '#6E5A4A', t: c.t, seed: 3, face: 'neutral', la: [40, 80], ra: [60, 100 + saw], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} L${f1(e[0] + 120)} ${f1(e[1] + 40)}" stroke="#8B949B" stroke-width="10"/>` });
    return s + hand('ICE FROM LAKES', 1400, 260, 90, c.t, 0.1);
  }
  let s = kitchen(false, { wx: 150 });
  if (st === 2) s += `<rect x="1100" y="420" width="360" height="460" rx="10" fill="#A27A4E" ${S} stroke-width="6"/><rect x="1130" y="450" width="300" height="160" rx="6" fill="#C79A63" ${S} stroke-width="4"/><rect x="1130" y="640" width="300" height="210" rx="6" fill="#C79A63" ${S} stroke-width="4"/><rect x="1390" y="510" width="16" height="50" fill="#E2C46E" ${S} stroke-width="3"/>` + hand('ICEBOX', 1280, 360, 90, c.t, 0.1);
  if (st === 3) s += `<rect x="1120" y="380" width="300" height="500" rx="60" fill="#F4F6F7" ${S} stroke-width="6"/><rect x="1180" y="300" width="180" height="90" rx="40" fill="#E2E6E8" ${S} stroke-width="5"/><rect x="1380" y="520" width="16" height="80" rx="6" fill="#C5CDD1" ${S} stroke-width="3"/>` + hand('~100 YEARS AGO', 1270, 220, 90, c.t, 0.1, { col: C.accent });
  return s;
};
SCN.timeBar = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const p = st === 1 ? eout(clamp(c.t / 0.8)) : 1;
  s += `<rect x="160" y="500" width="${f1(1600 * p)}" height="90" rx="12" fill="${st >= 2 ? '#E9D3A6' : '#F2C443'}" ${S} stroke-width="6"/>`;
  s += hand('300,000 YEARS OF US', 960, 420, 100, c.t, st === 1 ? 0.2 : DONE);
  if (st >= 2) s += hand('NO FRIDGES', 860, 700, 110, c.t, st === 2 ? 0.2 : DONE, { col: C.text });
  if (st >= 3) s += `<rect x="1754" y="490" width="8" height="110" fill="${C.red}"/>` + arrow(1700, 760, 1756, 620, c.t, 0.2, 0.4, C.red) + hand('FRIDGES', 1640, 840, 70, c.t, 0.3, { col: C.red });
  return s;
};
SCN.sickCave = c => {
  let s = bgNight(c.t, { seed: 133 }) + `<ellipse cx="960" cy="900" rx="700" ry="200" fill="#F28C28" opacity=".22"/>` + fire(1250, 930, 0.9, c.t);
  s += `<path d="M420 900 Q600 840 860 880 Q900 930 640 940 Q480 940 420 900 Z" fill="${C.tunic}" ${S} stroke-width="5"/>`;
  s += g('translate(400 860) rotate(-10) scale(1.3)', `<circle r="58" fill="#E6F2D6" ${S} stroke-width="5.5"/>` + hairCave(13, C.hair, false) + faceSvg('sick', c.t, 1));
  s += person({ x: 760, y: 950, s: 1.0, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'worried', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [140, 120] });
  return s;
};
SCN.microscope = (c, o) => {
  if ((o.step || 0) === 0) {
    let s = bgSavanna({ seed: 135 }) + g('translate(1150 860) scale(1.6)', meat(1, 7, C.meat, 0, false));
    for (let i = 0; i < 6; i++) s += g(`translate(${1000 + (i * 71) % 300} ${780 + (i * 37) % 120})`, `<g opacity=".25" stroke-dasharray="6 6">${bug(0.5, 'bad', c.t, i)}</g>`);
    return s + person({ x: 620, y: 965, s: 1.3, t: c.t, seed: 2, face: 'think', la: [-14, -6], ra: [150, -150 + Math.sin(c.t * 14) * 9], armsFront: true }) + pop(820, 380, c.t, 0.3, questionMark(200));
  }
  let s = `<rect width="${W}" height="${H}" fill="#EFE3CB"/><rect y="760" width="${W}" height="320" fill="#B79A72"/><rect x="200" y="140" width="420" height="360" fill="#CFE6F0" stroke="${C.ink}" stroke-width="14"/>`;
  s += person({ x: 760, y: 1000, s: 1.3, kind: 'modern', shirt: '#4A3A2C', t: c.t, seed: 3, face: 'surprised', hairLong: true, hairC: '#7A6A5A', la: [-14, -6], ra: [150, -110], armsFront: true,
    front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1] - 20)})`, `<rect x="-16" y="-50" width="32" height="90" rx="6" fill="#C9A35A" ${S} stroke-width="4"/><circle cx="0" cy="-30" r="8" fill="#EAF4F7" ${S} stroke-width="3"/>`) });
  s += pop(1350, 380, c.t, 0.3, thought(0, 0, 300, 200, -420, 200) + [0, 1, 2, 3, 4].map(i => g(`translate(${-180 + i * 90} ${(i % 2) * 50 - 20})`, bug(0.5, i % 2 ? 'bad' : 'good', c.t, i))).join(''));
  return s;
};
SCN.bodyFat = (c, o) => {
  const st = o.step || 0;
  let s = paper();
  if (st <= 3) {
    s += person({ x: 760, y: 1040, s: 1.7, t: c.t, seed: 2, face: st === 0 ? 'smug' : 'happy', la: [-20, -10], ra: [20, 10] });
    if (st >= 1) for (let i = 0; i < 4; i++) { const p = (c.t * 0.8 + i / 4) % 1; s += g(`translate(${f1(lerp(1300, 800, p))} ${f1(lerp(300, 640, p))})`, `<g opacity="${f1(Math.sin(Math.PI * p))}">${i % 2 ? meat(0.35, i) : `<circle r="22" fill="#5B3A7A" ${S} stroke-width="3"/>`}</g>`); }
    if (st >= 2) for (let i = 0; i < 6; i++) s += pop(700 + (i % 3) * 60, 640 + Math.floor(i / 3) * 60, c.t, st === 2 ? 0.2 + i * 0.08 : DONE, `<circle r="26" fill="#F7DC8A" ${S} stroke-width="4"/>`);
    if (st >= 3) { const lv = 0.5 + 0.5 * Math.sin(c.t * 2); s += g('translate(1350 560)', `<rect x="-90" y="-160" width="180" height="320" rx="20" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="-40" y="-190" width="80" height="34" rx="8" fill="${C.ink}"/><rect x="-70" y="${f1(140 - 280 * (0.6 + 0.3 * lv))}" width="140" height="${f1(280 * (0.6 + 0.3 * lv))}" rx="10" fill="${C.green}"/>`) + hand('ENERGY', 1350, 820, 90, c.t, 0.2, { col: C.green }); }
  }
  if (st === 4) {
    s += person({ x: 640, y: 1000, s: 1.4, t: c.t, seed: 2, face: 'happy', la: [-14, -6], ra: [14, 6] }) + hand('HUMAN', 640, 470, 70, c.t, DONE);
    s += g('translate(1300 1000) scale(1.2)', `<path d="${smooth([[-80, -40], [-70, -260], [0, -300], [70, -260], [80, -40], [40, 0], [-40, 0]])}" fill="#4A3A2C" ${S} stroke-width="5"/><circle cx="0" cy="-360" r="70" fill="#4A3A2C" ${S} stroke-width="5"/><ellipse cx="0" cy="-340" rx="40" ry="34" fill="#C9A88A"/><circle cx="-14" cy="-354" r="5" fill="${C.ink}"/><circle cx="14" cy="-354" r="5" fill="${C.ink}"/>`) + hand('CHIMP', 1300, 470, 70, c.t, DONE);
    s += `<rect x="560" y="${f1(380 - 200 * eout(clamp(c.t / 0.8)))}" width="160" height="${f1(200 * eout(clamp(c.t / 0.8)))}" fill="#F7DC8A" ${S} stroke-width="5"/><rect x="1220" y="${f1(380 - 60 * eout(clamp(c.t / 0.8)))}" width="160" height="${f1(60 * eout(clamp(c.t / 0.8)))}" fill="#F7DC8A" ${S} stroke-width="5"/>` + hand('BODY FAT', 960, 160, 90, c.t, 0.1);
  }
  if (st === 5) s += pop(960, 600, c.t, 0.05, g('scale(2.6)', `<ellipse cx="0" cy="40" rx="80" ry="70" fill="#F4E8D8" ${S} stroke-width="5"/><circle cx="0" cy="-60" r="62" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="-20" cy="-60" r="6" fill="${C.ink}"/><circle cx="20" cy="-60" r="6" fill="${C.ink}"/><path d="M-14 -36 Q0 -26 14 -36" fill="none" ${S} stroke-width="4"/><ellipse cx="-36" cy="-44" rx="12" ry="8" fill="#F5B5B5"/><ellipse cx="36" cy="-44" rx="12" ry="8" fill="#F5B5B5"/><path d="M-6 -122 q10 -16 20 -4" fill="none" ${S} stroke-width="4"/><path d="M-70 20 q-40 -10 -50 -40 M70 20 q40 -10 50 -40" fill="none" ${S} stroke-width="8"/>`));
  return s;
};
SCN.heavyLoad = c => {
  let s = bgSavanna({ seed: 137 });
  const w = Math.sin(c.t * 6) * 10, x = lerp(500, 900, clamp(c.t / c.d));
  s += person({ x, y: 965, s: 1.25, t: c.t, seed: 2, face: 'worried', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-160, -120], ra: [160, 120],
    front: () => g('translate(0 -470)', meatPile(0, 0, 0.7, 23)) });
  return s + `<path d="M${x + 90} 440 q-6 12 0 18 q6 -6 0 -18 Z" fill="#8FD0F0" ${S} stroke-width="3"/>`;
};
SCN.postholes = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#C9A06A"/>`;
  const r = rng(141);
  for (let i = 0; i < 40; i++) s += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(3 + r() * 6)}" fill="#A9804F"/>`;
  const holes = [[640, 420], [960, 400], [1280, 420], [640, 720], [960, 740], [1280, 720]];
  holes.forEach(([x, y], i) => { s += pop(x, y, c.t, st === 1 ? 0.1 + i * 0.1 : DONE, `<ellipse rx="26" ry="20" fill="#3C2A1E" ${S} stroke-width="3"/>`); });
  if (st >= 2) for (let i = 0; i < 10; i++) s += pop(560 + (i * 113) % 820, 520 + (i * 47) % 150, c.t, st === 2 ? 0.1 + i * 0.06 : DONE, g(`rotate(${(i * 41) % 180})`, boneIcon(0.25)));
  if (st >= 3) { const op = st === 3 ? clamp(c.t / 0.6) : 0.25; s += `<g opacity="${f1(op)}" stroke-dasharray="16 12">${stick(640, 720, 640, 420, 8, '#FFFFFF') + stick(1280, 720, 1280, 420, 8, '#FFFFFF') + stick(620, 430, 1300, 430, 8, '#FFFFFF')}</g>`; for (let i = 0; i < 5; i++) s += `<g opacity="${f1(op)}">${g(`translate(${720 + i * 120} 440)`, strip(120, C.meat, 0, 24))}</g>`; }
  if (st === 4) s += pop(960, 560, c.t, 0.2, questionMark(320, 0, '#FFFFFF'));
  return s;
};
SCN.wrappedRow = (c, o) => {
  let s = o.outdoors ? bgSavanna({ seed: 143, sky: o.autumn ? ['#D9C7A8', '#F2E6CF'] : ['#A9D2E8', '#F2EEDC'], hills: o.autumn ? '#C8925A' : '#B9B48A', ground: o.autumn ? '#B98F5A' : '#C9BE84', trees: false }) : paper();
  if (o.autumn) for (let i = 0; i < 6; i++) s += `<circle cx="${180 + i * 320}" cy="${600 + (i % 2) * 20}" r="${60 + (i % 3) * 14}" fill="${['#D9822B', '#C9573E', '#E2B04A'][i % 3]}" ${S} stroke-width="4"/>`;
  s += stick(300, 960, 300, 640, 8, C.wood) + stick(1620, 960, 1620, 640, 8, C.wood) + stick(280, 650, 1640, 650, 10, C.wood);
  for (let i = 0; i < 6; i++) s += pop(440 + i * 210, 760, c.t, 0.05 + i * 0.08, g('rotate(80)', wrappedBone(0.7, i + 2)));
  if (o.autumn) { for (let i = 0; i < 8; i++) { const p = (c.t * 0.4 + i / 8) % 1; s += `<path d="M${f1(200 + (i * 211) % 1500 + Math.sin(p * 6) * 40)} ${f1(p * 1000)} q12 -10 24 0 q-12 10 -24 0 Z" fill="#D9822B" ${S} stroke-width="2"/>`; } s += hand('13°C', 1650, 230, 110, c.t, 0.2, { col: '#3E7FA6' }); }
  return s;
};
SCN.noPot = c => paper() + g('translate(960 560) scale(1.8)', `<path d="M-120 -120 Q-150 60 -80 140 H80 Q150 60 120 -120 Z" fill="#B9764A" ${S} stroke-width="6"/><ellipse cx="0" cy="-120" rx="130" ry="30" fill="#8E5A3A" ${S} stroke-width="6"/><path d="M-110 -20 Q0 10 110 -20" fill="none" stroke="#8E5A3A" stroke-width="6"/>`) + xmark(960, 560, 260, c.t, 0.15);
SCN.fridgeFerments = (c, o) => {
  const st = o.step || 0;
  let s = paper();
  const fo = { open: true };
  s += fridge(960, 980, 440, 800, fo);
  const [s1, s2, s3] = fo.shelves;
  const items = [
    [860, s1 - 6, `<path d="M-70 0 L70 0 L60 -70 Z" fill="#F2C443" ${S} stroke-width="5"/><circle cx="20" cy="-20" r="8" fill="#E2A43A"/><circle cx="40" cy="-40" r="6" fill="#E2A43A"/>`],
    [1060, s1 - 6, `<path d="M-40 0 L-50 -90 H50 L40 0 Z" fill="#FFFFFF" ${S} stroke-width="5"/><rect x="-54" y="-100" width="108" height="16" rx="5" fill="#8ED0E8" ${S} stroke-width="4"/>`],
    [880, s2 - 6, `<rect x="-46" y="-120" width="92" height="120" rx="14" fill="#DCEFF3" ${S} stroke-width="5"/><rect x="-50" y="-136" width="100" height="22" rx="6" fill="#C9A35A" ${S} stroke-width="4"/><ellipse cx="-14" cy="-60" rx="14" ry="34" fill="#7DAA5A" ${S} stroke-width="3"/><ellipse cx="16" cy="-56" rx="14" ry="34" fill="#6E9A4A" ${S} stroke-width="3"/>`],
    [1060, s2 - 6, `<path d="M-26 0 V-90 Q-26 -110 -10 -120 V-150 H10 V-120 Q26 -110 26 -90 V0 Z" fill="#4A2E17" ${S} stroke-width="5"/><rect x="-14" y="-170" width="28" height="24" rx="4" fill="${C.red}" ${S} stroke-width="3"/>`],
  ];
  items.forEach(([x, y, svg], i) => { if (st >= i + 1) s += pop(x, y, c.t, st === i + 1 ? 0.05 : DONE, svg); });
  if (st >= 5) for (let i = 0; i < 4; i++) s += g(`translate(${[860, 1060, 880, 1060][i] + 60} ${[s1, s1, s2, s2][i] - 90})`, `<g transform="rotate(${f1(Math.sin(c.t * 4 + i) * 10)})">${bug(0.45, 'good', c.t, i)}</g>`);
  return s;
};
SCN.saltWorld = c => {
  let s = paper();
  s += g('translate(960 420) rotate(150) scale(1.6)', `<path d="M-60 120 L-70 -40 Q-70 -110 0 -110 Q70 -110 70 -40 L60 120 Z" fill="#FFFFFF" ${S} stroke-width="5"/><circle cx="-20" cy="-80" r="6" fill="${C.ink}"/><circle cx="0" cy="-90" r="6" fill="${C.ink}"/><circle cx="20" cy="-80" r="6" fill="${C.ink}"/>`);
  for (let i = 0; i < 18; i++) { const p = (c.t * 0.9 + i / 18) % 1; s += `<rect x="${f1(900 + (i * 37) % 120)}" y="${f1(560 + p * 300)}" width="8" height="8" fill="#FFFFFF" ${S} stroke-width="1.5"/>`; }
  return s + `<path d="M700 900 H1220 L1180 980 H740 Z" fill="#E2C46E" ${S} stroke-width="5"/>`;
};
SCN.saltBoil = (c, o) => {
  let s = bgSavanna({ seed: 145, sky: ['#B9D3E0', '#EEF0E6'], hills: '#9DA67A', ground: '#B6A47A' });
  s += `<ellipse cx="400" cy="900" rx="220" ry="60" fill="#9FC4D2" ${S} stroke-width="5"/>` + smellWaves(400, 860, c.t, 4, '#FFFFFF');
  for (let i = 0; i < 3; i++) { const x = 900 + i * 300; s += fire(x, 960, 0.6, c.t + i) + `<path d="M${x - 90} 860 Q${x - 100} 760 ${x - 60} 740 H${x + 60} Q${x + 100} 760 ${x + 90} 860 Z" fill="#B9764A" ${S} stroke-width="5"/>` + smellWaves(x, 720, c.t + i, 3, '#FFFFFF'); }
  if (o.cakes) for (let i = 0; i < 6; i++) s += pop(1500 + (i % 3) * 110, 980 - Math.floor(i / 3) * 70, c.t, 0.1 + i * 0.1, `<rect x="-50" y="-30" width="100" height="60" rx="10" fill="#FFFFFF" ${S} stroke-width="4"/>`);
  return s;
};
SCN.wildGrain = (c, o) => {
  let s = bgSavanna({ seed: 147, sky: ['#B9D7E6', '#F2EAD6'], hills: '#CDB58A', ground: '#D8BE8C', trees: false });
  for (let i = 0; i < 26; i++) s += g(`translate(${40 + i * 74} ${1000 + (i % 3) * 20})`, grainStalk(1.3 + (i % 4) * 0.1, Math.sin(c.t * 1.8 + i * 0.7) * 16));
  if (o.gather) s += person({ x: 960, y: 1000, s: 1.2, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [70, 110 + Math.sin(c.t * 6) * 15], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, bowl(0.5)) });
  if (o.noplant) s += hand('WILD', 960, 300, 200, c.t, 0.15, { col: C.accent });
  else s += hand(o.kind === 'oats' ? 'WILD OATS' : 'WILD BARLEY', 960, 260, 130, c.t, 0.1);
  return s;
};
SCN.timelineStore = (c, o) => {
  const st = o.step || 0;
  let s = paper() + `<path d="M180 600 H1740" ${S} stroke-width="8"/><path d="M1710 570 L1750 600 L1710 630" fill="none" ${S} stroke-width="8"/>`;
  s += pop(380, 470, c.t, st === 0 ? 0.1 : DONE, g('scale(.45)', person({ x: 0, y: 200, s: 1, t: c.t, seed: 2, face: 'happy', la: [-14, -6], ra: [14, 6] })));
  s += hand('ON THE MOVE', 380, 720, 64, c.t, st === 0 ? 0.2 : DONE);
  if (st >= 1) s += pop(960, 520, c.t, st === 1 ? 0.1 : DONE, granaryShape(0, 60, 0.6)) + hand('STORAGE', 960, 720, 70, c.t, st === 2 ? 0.1 : st > 2 ? DONE : NEVER, { col: C.accent });
  if (st >= 3) s += pop(1500, 520, c.t, 0.1, g('translate(0 60)', grainStalk(0.8, 0) + g('translate(-60 0)', grainStalk(0.8, 0)) + g('translate(60 0)', grainStalk(0.8, 0)))) + hand('FARMING', 1500, 720, 70, c.t, 0.25) + hand('~1,000 YEARS LATER', 1230, 860, 56, c.t, 0.4, { col: '#6E6A62' });
  return s;
};
SCN.inequality = c => {
  let s = bgSavanna({ seed: 149, sky: ['#B9D7E6', '#F2EAD6'], hills: '#CDB58A', ground: '#D8BE8C', trees: false });
  s += granaryShape(560, 960, 1.4, true) + person({ x: 860, y: 960, s: 1.2, t: c.t, seed: 10, beard: true, hairC: C.hair2, face: 'smug', la: [-38, 32], ra: [-20, -10] });
  [[1250, 0.5], [1450, 0.4], [1650, 0.45]].forEach(([x, sc], i) => { s += person({ x, y: 960, s: 0.95, t: c.t, seed: 2 + i * 3, face: 'sad', la: [-14, -6], ra: [70, 100], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, bowl(sc)) }); });
  return s;
};
SCN.nomads = c => {
  let s = bgSavanna({ seed: 151 });
  const sh = c.t * 60;
  [[300, 1.1, 2, false], [520, 0.95, 5, true], [700, 0.65, 9, false], [900, 1.05, 10, false], [1120, 0.9, 12, true]].forEach(([x, sc, sd, lg], i) => {
    const w = Math.sin(c.t * 8 + i) * 18;
    s += person({ x: x + sh, y: 960 - (i % 2) * 20, s: sc, t: c.t, seed: sd, long: lg, hairC: lg ? C.hair2 : C.hair, face: 'happy', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-14, -6], ra: i === 0 ? [26, 150] : [140, 160],
      holdR: i === 0 ? (e => spear(e[0], e[1], 180, 340, 0.45)) : (e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1] - 30)}" rx="50" ry="40" fill="#C79A63" ${S} stroke-width="4"/>`) });
  });
  return s;
};
SCN.settled = c => {
  let s = bgSavanna({ seed: 153, trees: false }) + `<path d="M960 0 V1080" stroke="${C.ink}" stroke-width="8" stroke-dasharray="30 20"/>`;
  s += `<g opacity=".55">${person({ x: 300 + ((c.t * 120) % 400), y: 960, s: 1.0, t: c.t, seed: 2, face: 'neutral', la: [-14, -6], ra: [14, 6] })}</g>` + xmark(480, 600, 160, c.t, 0.3);
  s += hut(1400, 900, 1.3) + fire(1650, 950, 0.6, c.t) + `<ellipse cx="1180" cy="980" rx="120" ry="30" fill="#5E432C" ${S} stroke-width="4"/>` + person({ x: 1200, y: 960, s: 1.1, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [14, 6] });
  return s + hand('STAYING PUT', 1440, 220, 100, c.t, 0.2, { col: C.accent });
};
SCN.tubers = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="440" fill="#CFE6F0"/><rect y="440" width="${W}" height="640" fill="#9C7B55"/><path d="M0 440 H1920" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 4; i++) { const x = 400 + i * 380; s += `<path d="M${x} 440 q-30 -80 -60 -110 M${x} 440 q20 -90 50 -120 M${x} 440 q0 -60 -10 -150" fill="none" stroke="#6F8A4E" stroke-width="7" stroke-linecap="round"/><path d="M${x} 440 Q${x - 10} 560 ${x + 10} 640" fill="none" stroke="#6E5235" stroke-width="5"/>`; s += g(`translate(${x + 10} 700) rotate(${(i % 2) * 20 - 10})`, `<ellipse rx="60" ry="110" fill="#B9764A" ${S} stroke-width="6"/><path d="M-30 -40 q10 6 20 0 M10 20 q10 6 20 0" fill="none" stroke="#8E5A3A" stroke-width="4"/>`); }
  if (st >= 2) s += today(() => person({ x: 1300, y: 440, s: 0.95, t: c.t, seed: 5, long: true, face: 'happy', hip: 90, ll: [100, 4], rl: [70, -2], la: [60, 100], ra: [80, 140 + Math.sin(c.t * 6) * 10], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} L${f1(e[0] - 120)} ${f1(e[1] + 260)}" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>` }));
  if (st >= 3) s += hand('THE PANTRY', 760, 880, 100, c.t, 0.2, { col: '#FFF3D6' });
  return s;
};
SCN.honey = (c, o) => {
  const st = o.step || 1;
  let s = st === 1 ? bgSavanna({ seed: 155 }) : paper();
  if (st === 1) {
    s += g('translate(960 1000) scale(2.2)', stick(0, 0, -6, -200, 22, C.woodD) + stick(-6, -180, -120, -260, 12, C.woodD) + stick(-6, -180, 110, -270, 12, C.woodD)) + `<ellipse cx="950" cy="680" rx="34" ry="54" fill="#3C2A1E" ${S} stroke-width="5"/>`;
    for (let i = 0; i < 9; i++) { const a = c.t * 3 + i; s += g(`translate(${f1(950 + Math.cos(a) * (60 + i * 12))} ${f1(680 + Math.sin(a * 1.3) * (40 + i * 6))})`, `<ellipse rx="10" ry="7" fill="#F2C443" ${S} stroke-width="2.5"/><path d="M-3 -6 V6 M3 -6 V6" stroke="${C.ink}" stroke-width="2"/>`); }
  } else {
    s += g('translate(760 560) scale(1.8)', `<path d="M-110 -110 H110 V100 Q110 140 70 140 H-70 Q-110 140 -110 100 Z" fill="#F2B533" ${S} stroke-width="5"/><rect x="-120" y="-140" width="240" height="40" rx="10" fill="#C9A35A" ${S} stroke-width="5"/><text x="0" y="40" font-family="Hand" font-size="60" fill="#7A4A0A" text-anchor="middle">HONEY</text>`);
    if (st === 2) s += g('translate(1350 560)', `<path d="M0 -90 C-70 0 -70 80 0 80 C70 80 70 0 0 -90 Z" fill="#7FC0E8" ${S} stroke-width="6"/>`) + hand('ALMOST NO WATER', 1350, 800, 80, c.t, 0.2);
    if (st === 3) s += g('translate(1350 560)', bug(1.6, 'dry', c.t)) + xmark(1350, 560, 120, c.t, 0.3);
  }
  return s;
};
function honeyguideBird(s = 1, t = 0, flying = false) {
  const w = flying ? Math.sin(t * 16) * 20 : 0;
  return g(`scale(${s})`, `<path d="M-10 -10 Q-40 ${f1(-50 - w)} -70 ${f1(-30 - w)}" fill="#7A6A5A" ${S} stroke-width="4"/><ellipse cx="0" cy="0" rx="46" ry="26" fill="#8E7E6E" ${S} stroke-width="4"/><path d="M40 -4 L70 -12 L60 4 Z" fill="#F0B4B4" ${S} stroke-width="3"/><circle cx="28" cy="-8" r="5" fill="${C.ink}"/><path d="M-44 4 L-80 0 L-80 16 Z" fill="#FFFFFF" ${S} stroke-width="3"/><ellipse cx="0" cy="10" rx="30" ry="12" fill="#E8E2D6"/>`);
}
SCN.honeyguide = (c, o) => {
  const st = o.step || 1;
  let s = bgSavanna({ seed: 157 });
  s += g('translate(1500 1000) scale(2.0)', stick(0, 0, -6, -200, 22, C.woodD) + stick(-6, -180, -120, -260, 12, C.woodD) + stick(-6, -180, 110, -270, 12, C.woodD)) + `<ellipse cx="1490" cy="690" rx="30" ry="48" fill="#3C2A1E" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 6; i++) { const a = c.t * 3 + i; s += `<circle cx="${f1(1490 + Math.cos(a) * (50 + i * 10))}" cy="${f1(690 + Math.sin(a * 1.3) * 40)}" r="6" fill="#F2C443" ${S} stroke-width="2"/>`; }
  const tmode = st === 1 ? 'whistle' : st === 2 ? 'follow' : 'honey';
  s += today(() => person({ x: st === 2 ? lerp(500, 1000, clamp(c.t / c.d)) : 700, y: 965, s: 1.25, t: c.t, seed: 10, face: tmode === 'honey' ? 'laugh' : 'happy', la: [-14, -6], ra: tmode === 'whistle' ? [150, -110] : tmode === 'honey' ? [120, 150] : [26, 30], armsFront: tmode === 'whistle',
    holdR: tmode === 'honey' ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 20)})`, `<path d="M-50 -40 H50 V40 H-50 Z" fill="#F2B533" ${S} stroke-width="4"/><path d="M-30 -40 V40 M-10 -40 V40 M10 -40 V40 M30 -40 V40" stroke="#C98A1E" stroke-width="3"/>`)) : null }));
  if (tmode === 'whistle') for (let i = 0; i < 3; i++) { const p = (c.t * 1.2 + i / 3) % 1; s += `<path d="M${f1(800 + p * 200)} ${f1(560 - p * 60)} q14 -14 28 0" fill="none" ${S} stroke-width="5" opacity="${f1(1 - p)}"/>`; }
  let bx = 1240, by = 400, fly = false;
  if (st === 1) { bx = 1180; by = 380 + Math.sin(c.t * 3) * 6; }
  if (st === 2) { const p = clamp(c.t / c.d); bx = lerp(1000, 1400, p); by = 420 - Math.sin(Math.PI * p) * 80; fly = true; s += `<path d="M700 520 Q1100 300 1450 640" fill="none" stroke="${C.accent}" stroke-width="7" stroke-dasharray="20 16"/>`; }
  if (st === 4) { bx = 1450; by = 760; s += `<path d="M1390 800 H1510 V840 H1390 Z" fill="#E8D9A8" ${S} stroke-width="4"/>` + hand('WAX', 1450, 900, 70, c.t, 0.2); }
  s += g(`translate(${f1(bx)} ${f1(by)})`, honeyguideBird(1.2, c.t, fly));
  return s;
};
SCN.hadzaCamp = (c, o) => {
  let s = kalahari(c.t, o.dusk ? { sky: ['#E89A62', '#F6D7A8'], hills: '#C99A6A', ground: '#D8AE6E' } : {});
  s += domeHut(420, 700, 1.0) + domeHut(1500, 690, 1.1) + domeHut(1020, 660, 0.6);
  s += fire(760, 900, 0.6, c.t) + fire(1300, 930, 0.6, c.t + 1);
  s += today(() => {
    let p = person({ x: 640, y: 950, s: 0.95, t: c.t, seed: 2, face: 'happy', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] });
    p += person({ x: 1420, y: 960, s: 1.0, t: c.t, seed: 5, long: true, flip: true, face: 'laugh', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] });
    const k = Math.sin(c.t * 9) * 20;
    p += person({ x: 980 + Math.sin(c.t * 1.5) * 120, y: 980, s: 0.6, t: c.t, seed: 9, face: 'laugh', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-150, -170], ra: [150, 170] });
    p += person({ x: 1130 + Math.sin(c.t * 1.5 + 2) * 120, y: 990, s: 0.55, t: c.t, seed: 12, face: 'happy', ll: [k, k * 0.6], rl: [-k, -k * 0.6], la: [-40, -60], ra: [40, 60] });
    return p;
  });
  return s;
};
SCN.hadzaReturn = (c, o) => {
  let s = kalahari(c.t) + domeHut(1500, 690, 1.0) + domeHut(1150, 660, 0.6);
  const walk = clamp(c.t / Math.max(1, c.d)), w = Math.sin(c.t * 8) * 16;
  s += today(() => person({ x: lerp(500, 820, eout(walk)), y: 965, s: 1.25, t: c.t, seed: 10, face: 'happy', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-150, -170], ra: [150, 170],
    front: () => g('translate(0 -440)', impala(0.9)) }));
  if (o.hide) s += pop(1250, 380, c.t, 0.1, thought(0, 0, 220, 140, -300, 160) + g('translate(0 10) scale(.5)', hut(0, 80, 1)) + xmark(0, 0, 100, c.t, 0.4));
  if (o.sell) s += pop(1250, 380, c.t, 0.1, thought(0, 0, 220, 140, -300, 160) + `<circle r="60" fill="#F2C443" ${S} stroke-width="5"/><text y="22" font-family="Hand" font-size="70" text-anchor="middle" fill="${C.text}">$</text>` + xmark(0, 0, 100, c.t, 0.4));
  if (o.respect) s += today(() => person({ x: 1300, y: 965, s: 1.05, t: c.t, seed: 5, long: true, flip: true, face: 'laugh', la: [-150, -170], ra: [150, 170] })) + sparkle(1000, 380, c.t, 0.3, 1.0) + sparkle(1200, 300, c.t, 0.5, 0.7);
  return s;
};
SCN.shareChart = c => {
  let s = paper();
  for (let i = 0; i < 10; i++) {
    const own = i === 0, x0 = 260 + i * 150, y0 = 380;
    const p = own ? 0 : eout(clamp((c.t - 0.3 - i * 0.07) / 0.5));
    const tx = 600 + ((i - 1) % 3) * 360, ty = 760;
    s += g(`translate(${f1(lerp(x0, own ? x0 : tx + ((i - 1) % 3) * 0 + (i % 2) * 40, p))} ${f1(lerp(y0, own ? y0 : ty, p))})`, meat(0.4, i + 3, own ? C.accent : C.meat));
  }
  s += hand('HUNTER\'S HOUSEHOLD', 260, 270, 60, c.t, 0.1, { anchor: 'start', col: C.accent }) + `<path d="M260 300 V340" ${S} stroke-width="5"/>`;
  [600, 960, 1320].forEach((x, i) => { s += domeHut(x, 960, 0.5); });
  return s + hand('ABOUT 1/10', 1500, 270, 110, c.t, 0.2, { col: C.accent });
};
SCN.quoteCard = (c, o) => {
  const lines = [['“To preserve it and store it', 'would be largely wasted effort.'], ['Other people would simply demand meat', 'when their own was finished,'], ['and it would be wrong', 'to refuse them.”']];
  let s = paper();
  const part = o.part || 1;
  lines.forEach((pair, i) => {
    if (i + 1 > part) return;
    pair.forEach((ln, j) => { s += hand(ln, 960, 260 + i * 220 + j * 86, 76, c.t, i + 1 === part ? 0.05 + j * 0.5 : DONE, { per: 0.022, ls: 1 }); });
  });
  return s + hand('— JAMES WOODBURN, ANTHROPOLOGIST', 1600, 900, 52, c.t, DONE, { anchor: 'end', col: '#6E6A62' });
};
SCN.lossThink = c => {
  let s = paper();
  s += person({ x: 620, y: 985, s: 1.35, kind: 'modern', t: c.t, seed: 3, face: 'worried', shirt: '#7D8FA8', la: [-14, -6], ra: [150, -150 + Math.sin(c.t * 14) * 9], armsFront: true });
  return s + pop(1260, 400, c.t, 0.1, thought(0, 0, 300, 200, -420, 200) + meat(0.8, 5) + `<text x="150" y="20" font-family="Hand" font-size="140" fill="${C.red}">−</text>`);
};
SCN.memory = (c, o) => {
  const st = o.step || 1;
  let s = today(() => kalahari(c.t) + domeHut(1650, 680, 0.8));
  const ppl = [[480, 2], [840, 5], [1200, 9], [1560, 12]];
  s += today(() => ppl.map(([x, sd], i) => person({ x, y: 965, s: 1.0, t: c.t, seed: sd, long: i === 1, face: 'happy', la: [-14, -6], ra: [14, 6] })).join(''));
  ppl.forEach(([x], i) => { if (st === 2 || i === 1) s += pop(x + 120, 330, c.t, st === 2 ? 0.1 + i * 0.15 : 0.2, thought(0, 0, 110, 80, -100, 120) + meat(0.4, i + 2)); });
  if (st === 2) s += hand('STORED', 960, 160, 110, c.t, 0.5, { col: C.accent });
  return s;
};
SCN.beads = (c, o) => {
  let s = today(() => kalahari(c.t));
  let neck = '';
  for (let i = 0; i < 22; i++) { const a = Math.PI * (0.1 + 0.8 * i / 21); neck += `<circle cx="${f1(Math.cos(a) * 150)}" cy="${f1(Math.sin(a) * 120)}" r="12" fill="#F7F1E3" ${S} stroke-width="3"/>`; }
  if (o.give) {
    s += today(() => person({ x: 640, y: 965, s: 1.2, t: c.t, seed: 5, long: true, face: 'happy', la: [-14, -6], ra: [80, 95] }) + person({ x: 1280, y: 965, s: 1.2, t: c.t, seed: 10, flip: true, face: 'happy', la: [-14, -6], ra: [80, 95] }));
    const p = eio(clamp(c.t / Math.max(0.8, c.d * 0.7)));
    s += g(`translate(${f1(lerp(800, 1120, p))} 560) scale(.6)`, neck);
    s += pop(1400, 300, c.t, 0.4, `<path d="M-60 0 L60 0 M40 -14 L60 0 L40 14" ${S} stroke-width="6" fill="none"/>` + g('translate(-110 0) rotate(-40)', `<path d="M0 0 H120" stroke="${C.woodD}" stroke-width="6"/><path d="M120 -10 L150 0 L120 10 Z" fill="#9C978F" ${S} stroke-width="3"/>`));
  } else {
    s += `<rect width="${W}" height="${H}" fill="${C.paper}" opacity=".6"/>` + pop(960, 330, c.t, 0.05, g('scale(2.0)', neck)) + hand('HXARO', 960, 820, 150, c.t, 0.3, { col: C.accent });
  }
  return s;
};
SCN.hxaroMap = (c, o) => {
  let s = SCN.map(c, { region: 'kalahari' });
  const proj = projFor('kalahari'), [cx, cy] = proj(PLACES.kalahari);
  const R = rng(5), pts = [];
  for (let i = 0; i < 15; i++) { const a = R() * Math.PI * 2, d = 40 + R() * 300; pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8]); }
  pts.forEach(([x, y], i) => { s += `<path d="M${f1(cx)} ${f1(cy - 40)} L${f1(x)} ${f1(y)}" stroke="${C.accent}" stroke-width="5" stroke-dasharray="12 10" opacity="${f1(clamp((c.t - 0.1 - i * 0.05) / 0.3))}"/>` + pop(x, y, c.t, (o.step || 1) === 1 ? 0.1 + i * 0.05 : DONE, `<circle r="16" fill="${C.accent}" ${S} stroke-width="4"/>`); });
  if ((o.step || 1) === 2) s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(330 * eout(clamp(c.t / 0.8)))}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-dasharray="20 14"/>` + hand('UP TO 200 KM', f1(cx + 260), f1(cy - 300), 70, c.t, 0.4);
  return s;
};
SCN.drought = c => {
  let s = bgSavanna({ seed: 159, sky: ['#F2D29A', '#FBEACB'], hills: '#E3C893', ground: '#E2C27E' });
  s += sun(1600, 190, 100, c.t) + heatWaves(960, 760, c.t, 5, 140);
  s += `<ellipse cx="960" cy="930" rx="300" ry="60" fill="#C9A86A" ${S} stroke-width="5"/><path d="M760 930 l60 -10 l40 20 M960 910 l40 20 l60 -10 M1100 940 l40 -14" fill="none" ${S} stroke-width="4"/>`;
  return s + today(() => person({ x: 520, y: 965, s: 1.2, t: c.t, seed: 5, long: true, face: 'worried', la: [-14, -6], ra: [14, 6] }) + person({ x: 680, y: 975, s: 0.65, t: c.t, seed: 9, face: 'sad', la: [-14, -6], ra: [14, 6] }));
};
SCN.walkFar = (c, o) => {
  let s = bgSavanna({ seed: 161, sky: ['#9FCBE5', '#F6EBD2'], hills: '#E3C893', ground: '#EAD09A' });
  if (!o.arrived) {
    s += `<path d="M0 1000 Q600 860 1100 760 T1920 640" fill="none" stroke="#C9A86A" stroke-width="40" stroke-linecap="round"/>`;
    const p = clamp(c.t / c.d), w = Math.sin(c.t * 9) * 18;
    s += today(() => person({ x: lerp(300, 1200, p), y: lerp(950, 770, p), s: lerp(1.1, 0.7, p), t: c.t, seed: 5, long: true, face: 'happy', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-14, -6], ra: [140, 160], holdR: e => `<ellipse cx="${f1(e[0])}" cy="${f1(e[1] - 30)}" rx="44" ry="36" fill="#C79A63" ${S} stroke-width="4"/>` }));
    s += domeHut(1700, 650, 0.6);
  } else {
    s += domeHut(1500, 700, 1.0) + fire(1100, 940, 0.6, c.t);
    s += today(() => person({ x: 760, y: 965, s: 1.2, t: c.t, seed: 5, long: true, face: 'laugh', la: [-14, -6], ra: [80, 95] }) + person({ x: 1000, y: 965, s: 1.2, t: c.t, seed: 10, flip: true, face: 'happy', la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 10)} ${f1(e[1])})`, bowl(0.6)) }));
    s += sparkle(880, 360, c.t, 0.3, 0.9);
  }
  return s;
};
SCN.waste = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) {
    s += `<path d="M760 960 L720 520 H1200 L1160 960 Z" fill="#9AA5AA" ${S} stroke-width="6"/><rect x="700" y="480" width="520" height="50" rx="10" fill="#7E898E" ${S} stroke-width="6"/>`;
    s += g('translate(860 470) rotate(-20)', `<path d="M-60 0 Q0 -60 60 0" fill="none" stroke="#F2C443" stroke-width="30" stroke-linecap="round"/>`) + g('translate(1040 450) rotate(15)', `<rect x="-70" y="-40" width="140" height="80" rx="30" fill="#D9A45A" ${S} stroke-width="5"/>`) + g('translate(960 420)', `<circle r="40" fill="#C9573E" ${S} stroke-width="5"/>`);
  } else {
    const p = eout(clamp(c.t / 0.8)), a = 2 * Math.PI / 3 * p;
    s += `<circle cx="960" cy="560" r="280" fill="#E9D3A6" ${S} stroke-width="6"/>`;
    if (p > 0.01) s += `<path d="M960 560 L960 280 A280 280 0 ${a > Math.PI ? 1 : 0} 1 ${f1(960 + 280 * Math.sin(a))} ${f1(560 - 280 * Math.cos(a))} Z" fill="${C.red}" ${S} stroke-width="6"/>`;
    s += hand('ROUGHLY 1/3 LOST OR WASTED', 960, 920, 80, c.t, 0.4, { col: C.red });
  }
  return s;
};
SCN.apartment = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#1F2A44"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${(i * 197) % 1920}" cy="${(i * 89) % 300}" r="2.5" fill="#FFF6D8" opacity=".7"/>`;
  s += `<rect x="360" y="120" width="1200" height="1000" fill="#5C5048" ${S} stroke-width="6"/>`;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) {
    const x = 420 + k * 285, y = 170 + r * 230, lit = (r * 4 + k) % 3 !== 1;
    s += `<rect x="${x}" y="${y}" width="230" height="170" fill="${lit ? '#F7D98A' : '#2E3852'}" ${S} stroke-width="5"/>`;
    if (lit) s += g(`translate(${x + 80} ${y + 168}) scale(.32)`, person({ kind: 'modern', t: c.t, seed: r + k, face: 'tired', shirt: TODAY_SHIRTS[(r + k) % 6], la: [-14, -6], ra: [14, 6] })) + `<rect x="${x + 150}" y="${y + 60}" width="50" height="108" rx="6" fill="#EEF2F3" ${S} stroke-width="3"/>`;
  }
  return s;
};
SCN.yakhchal = c => {
  let s = bgSavanna({ seed: 163, sky: ['#F2C98E', '#FBEBCB'], hills: '#E3C893', ground: '#E2C27E', trees: false });
  s += `<path d="M560 940 L760 300 Q800 240 840 300 L1040 940 Z" fill="#C9A274" ${S} stroke-width="7"/>`;
  for (let i = 1; i < 7; i++) s += `<path d="M${560 + i * 30} ${940 - i * 92} H${1040 - i * 30}" stroke="#A9825A" stroke-width="5"/>`;
  s += `<path d="M1100 940 V560 H1640 V940" fill="#D8B88A" ${S} stroke-width="6"/><path d="M760 940 V860 Q800 820 840 860 V940 Z" fill="#3B2A1C" ${S} stroke-width="5"/>`;
  s += sun(1650, 180, 80, c.t);
  return s + hand('YAKHCHĀL', 800, 200, 90, c.t, 0.2, { col: C.text });
};
SCN.callCamp = c => {
  let s = bgSavanna({ seed: 165 }) + hut(1500, 650, 1.0) + hut(1200, 630, 0.6) + meatPile(820, 960, 0.8, 21);
  s += person({ x: 520, y: 965, s: 1.3, t: c.t, seed: 2, face: 'laugh', la: [-14, -6], ra: [150, -110], armsFront: true });
  for (let i = 0; i < 3; i++) { const p = (c.t * 1.2 + i / 3) % 1; s += `<path d="M${f1(700 + p * 300)} ${f1(420 - p * 40)} q30 40 0 80" fill="none" ${S} stroke-width="6" opacity="${f1(1 - p)}"/>`; }
  [[1350, 5, true], [1550, 9, false], [1720, 12, true]].forEach(([x, sd, lg], i) => { const p = eout(clamp((c.t - i * 0.2) / Math.max(0.8, c.d))); const w = Math.sin(c.t * 8 + i) * 14; s += person({ x: lerp(x, x - 300, p), y: 970, s: 1.0, t: c.t, seed: sd, long: lg, hairC: lg ? C.hair2 : C.hair, flip: true, face: 'happy', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-14, -6], ra: [14, 6] }); });
  return s;
};

// Extra modes for earlier scenes.
(() => {
  const bac = SCN.bacteria;
  SCN.bacteria = (c, o) => {
    if (o.mode !== 'cold' && o.mode !== 'frozen') return bac(c, o);
    let s = `<rect width="${W}" height="${H}" fill="#DCEAF1"/>`;
    for (let i = 0; i < 6; i++) { const slow = o.mode === 'frozen' ? 0.05 : 0.3; s += g(`translate(${f1(360 + i * 240 + Math.sin(c.t * slow + i) * 20)} ${f1(560 + (i % 2) * 80)})`, bug(0.9, 'bad', c.t * slow, i)); }
    if (o.mode === 'frozen') for (let i = 0; i < 6; i++) s += `<rect x="${290 + i * 240}" y="${490 + (i % 2) * 80}" width="140" height="140" rx="16" fill="#CBE5F2" opacity=".75" ${S} stroke-width="4"/>`;
    s += snowfall(c.t, 40) + hand(o.mode === 'frozen' ? 'FROZEN: ALMOST STOPPED' : 'COLD: SLOWED DOWN', 960, 220, 90, c.t, 0.1, { col: '#3E7FA6' });
    return s;
  };
  const lab = SC.lab;
  SC.lab = (c, o) => {
    if (o.phase !== 'warm') return lab(c, o);
    let s = lab(c, { phase: 'test' });
    s += pop(1490, 330, c.t, 0.1, `<circle r="80" fill="#F6B33C" ${S} stroke-width="5"/>`) + `<path d="M1340 280 L1420 340 L1500 330 L1580 400 L1640 460" fill="none" stroke="${C.red}" stroke-width="8" stroke-linecap="round"/>` + hand('WARM: WORSE FROM WEEK 3', 960, 160, 70, c.t, 0.2, { col: C.red });
    return s;
  };
})();
