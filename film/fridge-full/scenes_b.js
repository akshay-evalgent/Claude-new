// Scenes for pemmican, fire and smoke, Qesem Cave, the cold, and fermentation.
'use strict';

function bison(x, y, s, flip = false) {
  return g(`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`, `<path d="${smooth([[-120, 0], [-130, -70], [-70, -130], [10, -120], [60, -80], [110, -70], [130, -20], [110, 10], [-90, 10]])}" fill="#5B4231" ${S} stroke-width="5"/><path d="M-100 -60 Q-140 -50 -150 -10 Q-130 10 -110 0" fill="#3E2C20" ${S} stroke-width="4"/><path d="M-130 -60 q-10 -20 6 -30" fill="none" ${S} stroke-width="5"/><path d="M-60 10 v40 M-20 10 v40 M50 10 v40 M90 10 v40" ${S} stroke-width="8"/>`);
}
function deerShape(s = 1, t = 0) {
  let o = `<path d="M-60 0 L-66 120 M-30 0 L-28 120 M70 0 L76 120 M100 -4 L110 116" ${S} stroke-width="8"/>`;
  o += `<path d="${smooth([[-90, -40], [-40, -80], [60, -84], [120, -60], [130, -10], [90, 10], [-60, 14], [-100, -6]])}" fill="#B9763C" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 9; i++) o += `<circle cx="${-50 + (i * 29) % 160}" cy="${-56 + (i * 13) % 34}" r="7" fill="#F4E8D2"/>`;
  o += `<path d="M-60 6 Q20 22 110 2" fill="none" stroke="#F4E8D2" stroke-width="10" stroke-linecap="round"/>`;
  o += `<path d="M-80 -50 L-120 -150" stroke="${C.ink}" stroke-width="34" stroke-linecap="round"/><path d="M-80 -50 L-120 -150" stroke="#B9763C" stroke-width="24" stroke-linecap="round"/>`;
  o += g(`translate(-130 -168) rotate(${f1(Math.sin(t * 1.5) * 4)})`, `<ellipse rx="40" ry="24" fill="#B9763C" ${S} stroke-width="5" transform="rotate(-20)"/><circle cx="-20" cy="-6" r="5" fill="${C.ink}"/><circle cx="-44" cy="6" r="6" fill="${C.ink}"/>` +
    `<path d="M10 -24 Q30 -80 10 -110 Q40 -100 50 -130 Q70 -90 60 -60 Q90 -80 100 -110 Q110 -60 30 -24 Z" fill="#E5D0A8" ${S} stroke-width="4"/><path d="M20 -16 l26 -10" ${S} stroke-width="5"/>`);
  o += `<path d="M120 -50 q18 -6 20 10" fill="#F4E8D2" ${S} stroke-width="4"/>`;
  return g(`scale(${s})`, o);
}
function bird(s = 1, flap = 0) {
  const w = flap ? Math.sin(flap * 14) * 18 : 0;
  return g(`scale(${s})`, `<path d="M-30 0 Q0 ${f1(-30 - w)} 30 0" fill="${C.ink}" ${S} stroke-width="3"/><ellipse cx="0" cy="8" rx="34" ry="22" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M-34 4 Q0 -24 30 0 Q0 -6 -34 4 Z" fill="${C.ink}"/><circle cx="-24" cy="-2" r="16" fill="${C.ink}"/><circle cx="-28" cy="-6" r="3" fill="#FFFFFF"/><path d="M-40 -2 l-10 4 l10 2 Z" fill="${C.ink}"/>`);
}
function sealBag(s = 1, open = true) {
  return g(`scale(${s})`, `<path d="M-160 0 Q-200 -110 -100 -150 Q0 -170 100 -150 Q200 -110 160 0 Q120 70 0 76 Q-120 70 -160 0 Z" fill="#7F858A" ${S} stroke-width="6"/>` +
    (open ? `<ellipse cx="0" cy="-146" rx="100" ry="26" fill="#3C3F42" ${S} stroke-width="5"/>` : `<path d="M-100 -150 Q0 -130 100 -150" fill="none" ${S} stroke-width="6"/><path d="M-80 -146 l10 12 M-40 -140 l10 12 M0 -138 l10 12 M40 -140 l10 12 M80 -146 l10 12" ${S} stroke-width="4"/>`) +
    `<circle cx="-80" cy="-40" r="10" fill="#5E6266"/><circle cx="60" cy="-10" r="12" fill="#5E6266"/><circle cx="20" cy="-80" r="8" fill="#5E6266"/>`);
}
function lakeWorld(t, o = {}) {
  let s = `<defs><linearGradient id="lk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD9E6"/><stop offset="1" stop-color="#EEF3EE"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#lk)"/>`;
  for (let i = 0; i < 12; i++) { const x = i * 170 - 30, h = 180 + (i * 53) % 90; s += `<path d="M${x} 520 L${x + 50} ${520 - h} L${x + 100} 520 Z" fill="#5F7A5A" ${S} stroke-width="4"/>`; }
  s += `<rect y="510" width="${W}" height="250" fill="#7FA9C0"/>`;
  for (let i = 0; i < 9; i++) s += `<path d="M${f1((i * 230 + t * 30) % 2100 - 100)} ${560 + (i * 37) % 160} q20 -10 40 0 t40 0" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".7"/>`;
  s += `<path d="M0 740 Q500 700 960 730 T1920 720 V1080 H0 Z" fill="#B9A577" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 10; i++) s += `<path d="M${80 + i * 190} 760 q-6 -60 4 -110 M${92 + i * 190} 760 q10 -50 20 -90" fill="none" stroke="#6F8A4E" stroke-width="5" stroke-linecap="round"/>`;
  return s;
}

SCN.plains = c => {
  let s = bgSavanna({ seed: 91, sky: ['#9FCBE5', '#F2EFDA'], hills: '#BFC48E', ground: '#C9C27A' });
  s += bison(300, 700, 0.5) + bison(520, 720, 0.6, true) + bison(1650, 700, 0.5);
  s += hut(1300, 760, 1.0, '#E6D4B4') + hut(1500, 740, 0.8, '#E6D4B4');
  s += rack(820, 960, 420, 330, c.t, { n: 5, col: '#7A3328', wind: 0.6 });
  s += person({ x: 1120, y: 970, s: 1.15, t: c.t, seed: 15, face: 'happy', long: true, hairC: '#2B2118', tunicC: '#C79A63', la: [-14, -6], ra: [120, 150] });
  return s;
};
SCN.pound = c => {
  let s = bgSavanna({ seed: 93, sky: ['#9FCBE5', '#F2EFDA'], hills: '#BFC48E', ground: '#C9C27A' });
  s += rock(1050, 920, 220, 60, 9) + `<ellipse cx="1050" cy="880" rx="120" ry="24" fill="#8E5A3A"/>`;
  const up = Math.abs(Math.sin(c.t * 5));
  s += person(Object.assign({ x: 760, y: 960, s: 1.25, t: c.t, seed: 15, face: 'happy', long: true, hairC: '#2B2118', tunicC: '#C79A63', la: [60, 90], ra: [lerp(80, 130, up), lerp(90, 150, up)],
    holdR: e => `<ellipse cx="${f1(e[0] + 10)}" cy="${f1(e[1])}" rx="46" ry="34" fill="#9C978F" ${S} stroke-width="5"/>` }, savSit));
  if (up < 0.2) for (let i = 0; i < 6; i++) s += `<circle cx="${1000 + i * 22}" cy="${850 - (i % 3) * 22}" r="6" fill="#8E5A3A"/>`;
  return s;
};
SCN.pemmican = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st < 3) {
    s += g('translate(960 760)', bowl(2.6)) + `<ellipse cx="960" cy="730" rx="190" ry="34" fill="#8E5A3A"/>`;
    if (st === 1) { const p = clamp(c.t / c.d); s += `<path d="M1280 320 Q1250 300 1180 380 L1220 420 Q1290 360 1320 360 Z" fill="#9C978F" ${S} stroke-width="5"/><path d="M1190 400 Q1100 520 1000 ${f1(700 - p * 20)}" fill="none" stroke="#F4D78A" stroke-width="${f1(18 * (1 - p * 0.3))}" stroke-linecap="round"/>` + hand('MELTED FAT', 1450, 300, 80, c.t, 0.2); }
    if (st === 2) for (let i = 0; i < 12; i++) { const p = clamp((c.t - i * 0.08) / 0.5); if (p > 0) s += `<circle cx="${820 + (i * 53) % 280}" cy="${f1(lerp(300, 720, eout(p)))}" r="16" fill="#5B3A7A" ${S} stroke-width="3"/>`; }
    if (st === 2) s += hand('BERRIES', 1450, 300, 80, c.t, 0.1, { col: '#5B3A7A' });
  } else {
    s += pop(960, 560, c.t, 0.05, g('scale(2.6)', icon('bag', c.t)));
    s += hand('RAWHIDE BAG', 960, 960, 90, c.t, 0.3);
  }
  return s;
};
SCN.flyRack = c => {
  let s = bgSavanna({ seed: 95 });
  s += rack(1100, 930, 560, 400, c.t, { n: 8, wind: 1 });
  s += g('translate(1100 560) scale(1.6) translate(-1100 -560)', fliesAround(1100, 560, c.t, 8, 220, 90));
  s += person({ x: 560, y: 965, s: 1.28, t: c.t, seed: 2, face: 'worried', la: [-150, 128], ra: [16, 8], armsFront: true });
  return s;
};
SCN.fireBig = c => {
  let s = bgNight(c.t, { seed: 97 });
  s += `<ellipse cx="960" cy="900" rx="800" ry="230" fill="#F28C28" opacity=".28"/>`;
  return s + fire(960, 960, 2.3, c.t);
};
SCN.fireUses = (c, o) => {
  let s = bgNight(c.t, { seed: 99 });
  s += `<ellipse cx="960" cy="900" rx="700" ry="200" fill="#F28C28" opacity=".26"/>` + fire(960, 940, 1.1, c.t);
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] };
  if (o.mode === 'cold') {
    s += snowfall(c.t, 50);
    s += person(Object.assign({ x: 620, y: 950, s: 1.0, t: c.t, seed: 2, face: 'happy', cloak: true }, sitP)) + person(Object.assign({ x: 1300, y: 950, s: 1.0, t: c.t, seed: 5, long: true, flip: true, face: 'happy', cloak: true }, sitP));
  }
  if (o.mode === 'predators') {
    s += person(Object.assign({ x: 700, y: 950, s: 1.0, t: c.t, seed: 2, face: 'smug' }, sitP));
    [[200, 820, 0.8], [1720, 820, 0.8], [420, 700, 0.5]].forEach(([x, y, sc], i) => { const p = clamp(c.t / c.d); s += g(`translate(${f1(x + (x < 960 ? -1 : 1) * p * 300)} ${y})`, `<g opacity="${f1(1 - p)}">${bushEyes(0, 0, sc, c.t, i)}</g>`); });
  }
  if (o.mode === 'cook') {
    s += person(Object.assign({ x: 640, y: 950, s: 1.1, t: c.t, seed: 2, face: 'happy', la: [-10, 30], ra: [70, 80], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} L${f1(e[0] + 300)} ${f1(e[1] - 40)}" stroke="${C.woodD}" stroke-width="7" stroke-linecap="round"/>` + g(`translate(${f1(e[0] + 260)} ${f1(e[1] - 36)})`, meat(0.45, 17, '#8E4A2E')) }, { hip: 50, ll: [118, 8], rl: [106, -2] }));
  }
  return s;
};
SCN.smokeChem = (c, o) => {
  let s = paper() + g('translate(960 220)', strip(560, '#9C3D30', 0, 120));
  for (let i = 0; i < 16; i++) { const p = (c.t * 0.5 + i / 16) % 1; s += `<circle cx="${f1(300 + p * 560 + (i % 4) * 20)}" cy="${f1(300 + (i * 61) % 500)}" r="${f1(16 + (i % 3) * 8)}" fill="${C.smoke}" opacity="${f1(0.8 * Math.sin(Math.PI * p))}"/>`; }
  for (let i = 0; i < 4; i++) {
    const y = 360 + i * 120, fall = o.phase === 2 ? eout(clamp((c.t - 0.2 - i * 0.12) / 0.8)) : 0;
    s += g(`translate(${f1(1010 + fall * 260)} ${f1(y + fall * 500)}) rotate(${f1(fall * 160)})`, bug(0.7, fall > 0.3 ? 'dry' : 'bad', c.t, i));
  }
  if (o.phase === 2) s += hand('PHENOLS', 500, 980, 90, c.t, 0.1, { col: '#6E6A62' });
  return s;
};
SCN.smokedFood = (c, o) => {
  let s = bgSavanna({ seed: 101, sky: ['#EFA972', '#F8D9B0'], hills: '#D8A878', ground: '#D9B47A' });
  s += stick(380, 960, 390, 360, 10, C.wood) + stick(1540, 960, 1530, 360, 10, C.wood) + stick(360, 380, 1560, 380, 10, C.wood);
  for (let i = 0; i < 7; i++) {
    const x = 480 + i * 160, sw = Math.sin(c.t * 2 + i) * 5;
    s += g(`translate(${x} 390) rotate(${f1(sw)})`, o.item === 'fish' ? `<path d="M0 0 V30" ${S} stroke-width="4"/>` + g('translate(0 120) rotate(90)', fishShape(1.1, '#C98A3E')) : strip(200, '#6B2D20', 0, 40));
  }
  s += fire(960, 1000, 1.0, c.t) + smoke(960, 860, c.t, { n: 12, rise: 600, drift: 40, op: 0.7 });
  return s;
};
SCN.tasteFace = c => {
  let s = bgSavanna({ seed: 103 });
  s += person({ x: 960, y: 1180, s: 2.0, t: c.t, seed: 2, face: c.t > 0.5 ? 'laugh' : 'surprised', la: [-14, -6], ra: [150, -110], armsFront: true, bob: 0,
    front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1])}) rotate(-60)`, strip(110, '#6B2D20', 0, 30)) });
  return s + sparkle(1300, 360, c.t, 0.5, 1.2) + sparkle(620, 300, c.t, 0.7, 0.9);
};
SCN.caveQesem = (c, o) => {
  let s = `<defs><linearGradient id="qs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9D2E8"/><stop offset="1" stop-color="#F2EEDC"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#qs)"/>`;
  s += `<path d="M-40 1080 L-40 420 Q300 220 800 260 Q1300 220 1960 420 V1080 Z" fill="#D8C9A6" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 10; i++) s += `<path d="M${100 + i * 180} ${380 + (i % 3) * 40} q30 10 60 0" fill="none" ${S} stroke-width="4" opacity=".5"/>`;
  for (let i = 0; i < 8; i++) s += `<circle cx="${160 + i * 230}" cy="${420 + (i % 2) * 30}" r="${30 + (i % 3) * 10}" fill="#7F9A5A" ${S} stroke-width="4"/>`;
  s += `<path d="M560 1080 L600 720 Q960 520 1320 720 L1360 1080 Z" fill="#3C2E24" ${S} stroke-width="7"/>`;
  if (o.people) {
    s += fire(960, 1000, 0.8, c.t) + `<ellipse cx="960" cy="960" rx="300" ry="90" fill="#F28C28" opacity=".25"/>`;
    s += person({ x: 760, y: 1010, s: 0.8, t: c.t, seed: 2, face: 'happy', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] });
    s += person({ x: 1160, y: 1010, s: 0.8, t: c.t, seed: 5, long: true, flip: true, face: 'happy', hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] });
  }
  return s;
};
SCN.deer = (c, o) => {
  let s = bgSavanna({ seed: 105, sky: ['#A9D2E8', '#F2EEDC'], hills: '#B9B48A', ground: '#C9BE84' });
  for (let i = 0; i < 6; i++) s += `<circle cx="${100 + i * 340}" cy="${640 + (i % 2) * 20}" r="${50 + (i % 3) * 14}" fill="#7F9A5A" ${S} stroke-width="4"/>`;
  s += g(`translate(1180 ${f1(800 + Math.sin(c.t * 2) * 2)})`, deerShape(1.5, c.t));
  if (o.hunt) {
    s += `<path d="${smooth(blobPts(170, 90, 9, 7, 0.2))}" transform="translate(560 900)" fill="#5F7A4A" ${S} stroke-width="5"/>`;
    s += person({ x: 520, y: 980, s: 1.1, t: c.t, seed: 2, face: 'think', hip: 120, ll: [86, 4], rl: [76, -2], la: [-14, -6], ra: [80, 100], holdR: e => spear(e[0], e[1], 95, 380, 0.4) });
  }
  return s;
};
SCN.lab = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E6EEF1"/><rect y="760" width="${W}" height="320" fill="#C9D3D8"/><rect x="300" y="700" width="1320" height="40" rx="8" fill="#F4F6F7" ${S} stroke-width="5"/>`;
  s += `<rect x="1300" y="180" width="380" height="300" rx="10" fill="#FFFFFF" ${S} stroke-width="5"/>`;
  s += person({ x: 600, y: 1000, s: 1.25, kind: 'research', t: c.t, seed: 4, face: o.phase === 'study' ? 'surprised' : 'think', la: [40, 100], ra: [60, 100] });
  if (o.phase === 'study') s += g('translate(1000 650)', boneIcon(1.2)) + magnifier(1020, 600, 110, `<rect x="900" y="480" width="240" height="240" fill="#FFFDF5"/>` + g('translate(1020 650) scale(2)', boneIcon(1)) + `<path d="M970 630 l8 22 M990 628 l6 24 M1010 630 l10 22" stroke="#5C2B1E" stroke-width="5"/>`);
  if (o.phase === 'test' || o.phase === 'weeks') { [[900, 660], [1060, 660], [1220, 660]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.1 + i * 0.15, g('rotate(-6)', wrappedBone(0.8, i + 4))); }); }
  if (o.phase === 'weeks') s += pop(1490, 330, c.t, 0.2, calendar(1.05, '', Math.min(9, 1 + Math.floor(c.t * 6)))) + hand('WEEKS', 1490, 470, 64, c.t, 0.4);
  else s += `<path d="M1340 420 L1400 330 L1460 380 L1540 260 L1640 300" fill="none" stroke="${C.accent}" stroke-width="8" stroke-linecap="round"/>`;
  return s;
};
SCN.skinPeel = (c, o) => {
  let s = paper() + g('translate(960 600) scale(3)', boneIcon(1));
  const p = eout(clamp(c.t / Math.max(0.8, c.d * 0.8)));
  if (o.fresh) {
    s += `<path d="M640 540 Q960 ${f1(520 - p * 260)} 1280 540 L1280 660 Q960 680 640 660 Z" fill="#B9763C" ${S} stroke-width="5" opacity="${f1(1 - p * 0.3)}"/>` + check(1500, 300, 1.0, c.t, 0.6);
  } else {
    s += `<path d="M640 540 Q960 520 1280 540 L1280 660 Q960 680 640 660 Z" fill="#7A5A3A" ${S} stroke-width="5"/><path d="M700 560 l20 30 M760 580 l-10 34 M860 560 l14 40 M960 570 l-8 36 M1060 562 l16 34 M1160 576 l-12 30" stroke="#3C2A1E" stroke-width="6" stroke-linecap="round"/>`;
    const saw = Math.sin(c.t * 14) * 30;
    s += g(`translate(${f1(980 + saw)} 470) rotate(110)`, stoneKnife(2.0)) + `<path d="M1300 360 q-10 20 0 30 q10 -10 0 -30 Z" fill="#8FD0F0" ${S} stroke-width="3"/>`;
  }
  return s;
};
SCN.boneCan = (c, o) => {
  const st = o.step || 1;
  let s = paper() + g('translate(700 560) rotate(-8)', wrappedBone(1.8, 3));
  if (st >= 1) s += arrow(700, 300, 700, 470, c.t, st === 1 ? 0.1 : DONE, 0.4, C.accent) + hand('WRAPPER', 700, 260, 90, c.t, st === 1 ? 0.2 : DONE, { col: C.accent });
  if (st >= 2) s += pop(1400, 560, c.t, st === 2 ? 0.2 : DONE, `<rect x="-120" y="-150" width="240" height="300" rx="20" fill="#D9DEE2" ${S} stroke-width="6"/><ellipse cx="0" cy="-150" rx="120" ry="30" fill="#EEF2F3" ${S} stroke-width="6"/><rect x="-120" y="-60" width="240" height="110" fill="${C.red}" ${S} stroke-width="5"/><text x="0" y="14" font-family="Hand" font-size="60" fill="#FFFFFF" text-anchor="middle">MARROW</text>`) + hand('=', 1060, 600, 160, c.t, st === 2 ? 0.1 : DONE);
  if (st >= 3) { const p = 0.5 + 0.5 * Math.sin(c.t * 4); s += `<ellipse cx="700" cy="560" rx="300" ry="90" fill="#FFE9A8" opacity="${f1(0.3 + 0.3 * p)}"/>` + hand('SEALED', 700, 860, 100, c.t, 0.2, { col: C.accent }); }
  return s;
};
SCN.mammothHouse = (c, o) => {
  let s = bgSnow(c.t, { seed: 107 });
  let d = '';
  for (let i = 0; i < 9; i++) { const x = 600 + i * 90; d += `<path d="M${x - 40} 940 Q${x} 870 ${x + 40} 940" fill="#EFE6D2" ${S} stroke-width="5"/>`; }
  d += `<path d="M560 940 Q560 560 960 520 Q1360 560 1360 940 Z" fill="#9C8A72" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) { const x = 640 + i * 130; d += `<path d="M${x} 900 Q${x + 60} ${620 + (i % 2) * 30} ${x + 140} ${560 + (i % 3) * 20}" fill="none" stroke="#F3EAD6" stroke-width="22" stroke-linecap="round"/><path d="M${x} 900 Q${x + 60} ${620 + (i % 2) * 30} ${x + 140} ${560 + (i % 3) * 20}" fill="none" ${S} stroke-width="4" opacity=".5"/>`; }
  for (let i = 0; i < 3; i++) d += g(`translate(${760 + i * 200} ${700 - (i % 2) * 60})`, `<path d="M-60 -30 Q0 -70 60 -30 L44 40 Q0 56 -44 40 Z" fill="#EFE6D2" ${S} stroke-width="5"/><circle cx="-26" cy="-22" r="6" fill="#3C2E24"/><circle cx="26" cy="-22" r="6" fill="#3C2E24"/><ellipse cx="-16" cy="26" rx="9" ry="13" fill="#3C2E24"/><ellipse cx="16" cy="26" rx="9" ry="13" fill="#3C2E24"/>`);
  d += `<path d="M900 940 V820 Q960 780 1020 820 V940 Z" fill="#2E241C" ${S} stroke-width="5"/>`;
  s += d;
  if (o.pits) [[300, 980], [1560, 960], [1720, 1020]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.2 + i * 0.2, `<ellipse rx="110" ry="34" fill="#5E7889" ${S} stroke-width="5"/>` + g('translate(0 -6) scale(.4)', meat(1, 19 + i))); });
  return s + snowfall(c.t, 50);
};
SCN.pitDiagram = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="300" fill="#DCE6EC"/><rect y="300" width="${W}" height="110" fill="#8C6C49"/><rect y="410" width="${W}" height="670" fill="#BFD8E4"/>`;
  for (let i = 0; i < 24; i++) s += g(`translate(${(i * 181) % 1900 + 40} ${460 + (i * 97) % 580}) rotate(${i * 20})`, `<path d="M-14 0 H14 M0 -14 V14 M-10 -10 L10 10 M10 -10 L-10 10" stroke="#FFFFFF" stroke-width="4"/>`);
  s += `<path d="M0 300 H1920 M0 410 H1920" ${S} stroke-width="5"/>` + hand('FROZEN GROUND', 1500, 480, 80, 1, DONE, { col: '#3E7FA6' });
  s += `<path d="M760 300 L790 760 H1130 L1160 300 Z" fill="#4E6878" ${S} stroke-width="6"/>`;
  if (st >= 2) s += pop(960, 690, c.t, st === 2 ? 0.1 : DONE, meat(1.1, 21) );
  if (st >= 3) { const p = st === 3 ? eout(clamp(c.t / 0.8)) : 1; s += `<path d="M780 ${f1(300 + 400 * (1 - p))} L800 ${f1(300 + 400 * (1 - p))} M780 300 L1140 300 L1130 ${f1(300 + 340 * p)} H790 Z" fill="#8C6C49" ${S} stroke-width="5"/>` + g('translate(960 330)', boneIcon(0.6)) + g('translate(900 400) rotate(20)', boneIcon(0.4)); }
  if (st >= 4) s += pop(1500, 200, c.t, 0.2, `<rect x="-24" y="-120" width="48" height="200" rx="24" fill="#FFFFFF" ${S} stroke-width="5"/><rect x="-12" y="${f1(-30 + 40 * clamp(c.t))}" width="24" height="${f1(90 - 40 * clamp(c.t))}" fill="#3E7FA6"/><circle cx="0" cy="90" r="36" fill="#3E7FA6" ${S} stroke-width="5"/>`);
  return s + (st >= 4 ? snowfall(c.t, 40) : '');
};
SCN.kiviak = (c, o) => {
  const st = o.step || 1;
  let s = bgSnow(c.t, { seed: 109 }) + `<rect y="700" width="${W}" height="380" fill="#E9EEF0"/>`;
  if (st === 1) { for (let i = 0; i < 14; i++) s += g(`translate(${f1(200 + (i * 137) % 1500 + Math.sin(c.t * 2 + i) * 30)} ${f1(200 + (i * 71) % 400)})`, bird(0.9, c.t + i)); return s; }
  s += g('translate(960 820)', sealBag(2.2, st === 2));
  if (st === 2) for (let i = 0; i < 6; i++) { const p = clamp((c.t - i * 0.15) / 0.5); if (p > 0 && p < 1) s += g(`translate(${f1(lerp(1500, 960, eout(p)))} ${f1(lerp(300, 520, eout(p)))})`, bird(0.8)); }
  if (st === 3) s += `<path d="M760 470 Q960 520 1160 470" fill="none" stroke="#F4D78A" stroke-width="22" stroke-linecap="round"/>` + hand('SEAL FAT', 1450, 360, 80, c.t, 0.1);
  if (st >= 4) { const p = st === 4 ? eout(clamp(c.t / 0.8)) : 1; [[760, 600], [960, 540], [1160, 600], [860, 480], [1060, 470], [960, 420]].forEach(([x, y], i) => { const q = clamp(p * 6 - i); if (q > 0) s += rock(x, f1(y - (1 - q) * 300), 90, 60, i + 3); }); }
  if (st === 5) { s += g('translate(1600 230)', `<circle r="60" fill="#F6ECC9" ${S} stroke-width="4"/>`); s += hand('MONTHS', 960, 220, 120, c.t, 0.2, { col: '#3E7FA6' }); }
  return s + snowfall(c.t, 40);
};
SCN.goodBad = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) { s += g('translate(700 540)', bug(2.2, 'bad', c.t)) + xmark(700, 540, 160, c.t, 0.4) + hand('FIGHT THEM?', 1350, 560, 110, c.t, 0.2); }
  if (st >= 2) {
    const badX = st === 4 ? lerp(1250, 2200, eout(clamp(c.t / 1.0))) : 1250;
    s += g(`translate(${f1(badX)} 600)`, bug(1.7, 'bad', c.t, 2));
    for (let i = 0; i < 3; i++) s += g(`translate(${560 + i * 170} ${560 + (i % 2) * 90})`, `<g transform="rotate(${f1(Math.sin(c.t * 4 + i) * 8)})">${bug(1.2, 'good', c.t, i)}</g>`);
    if (st === 2) s += hand('FRIENDLY BACTERIA', 760, 260, 90, c.t, 0.1, { col: '#3E7FA6' });
    if (st === 3) s += hand('SOUR!', 760, 260, 130, c.t, 0.1, { col: C.green }) + pop(1250, 330, c.t, 0.2, `<ellipse rx="80" ry="56" fill="#F3E36A" ${S} stroke-width="5"/>`);
    if (st === 4) s += arrow(900, 860, 1400, 860, c.t, 0.1, 0.5, C.ink);
  }
  return s;
};
SCN.lakeFish = (c, o) => {
  let s = lakeWorld(c.t);
  s += person({ x: 600, y: 900, s: 1.15, t: c.t, seed: 2, face: 'happy', la: [-14, -6], ra: [70, 120 + Math.sin(c.t * 3) * 10], holdR: e => spear(e[0], e[1], 120, 360, 0.3) });
  s += person({ x: 1250, y: 920, s: 1.05, t: c.t, seed: 5, long: true, hairC: C.hair2, flip: true, face: 'happy', la: [-14, -6], ra: [120, 150], holdR: o.catch ? (e => g(`translate(${f1(e[0])} ${f1(e[1] - 20)}) rotate(${f1(-70 + Math.sin(c.t * 8) * 10)})`, fishShape(0.9))) : null });
  if (o.catch) for (let i = 0; i < 3; i++) { const p = (c.t * 0.8 + i / 3) % 1; s += g(`translate(${900 + i * 200} ${f1(640 - Math.sin(Math.PI * p) * 160)}) rotate(${f1(-40 + p * 80)})`, fishShape(0.6)); }
  return s;
};
SCN.fishPile = c => {
  let s = lakeWorld(c.t);
  for (let i = 0; i < 40; i++) s += g(`translate(${f1(760 + (i * 61) % 420)} ${f1(960 - Math.floor(i / 8) * 40 - (i % 3) * 8)}) rotate(${(i * 37) % 60 - 30})`, fishShape(0.6, i % 2 ? '#9DB4C0' : '#B7C7CF'));
  s += person({ x: 480, y: 960, s: 1.1, t: c.t, seed: 2, face: 'surprised', la: [-30, -60], ra: [30, 60] }) + person({ x: 1440, y: 960, s: 1.0, t: c.t, seed: 5, long: true, flip: true, face: 'laugh', la: [-150, -170], ra: [150, 170] });
  return s;
};
SCN.noSalt = c => {
  let s = paper();
  s += g('translate(960 560) scale(2.2)', `<path d="M-60 120 L-70 -40 Q-70 -110 0 -110 Q70 -110 70 -40 L60 120 Z" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-70 -40 H70" ${S} stroke-width="4"/><circle cx="-20" cy="-80" r="6" fill="${C.ink}"/><circle cx="0" cy="-90" r="6" fill="${C.ink}"/><circle cx="20" cy="-80" r="6" fill="${C.ink}"/><text x="0" y="60" font-family="Hand" font-size="60" text-anchor="middle" fill="${C.text}">SALT</text>`);
  return s + xmark(960, 560, 260, c.t, 0.15);
};
SCN.fishPaste = c => {
  let s = lakeWorld(c.t) + `<rect width="${W}" height="${H}" fill="${C.paper}" opacity=".35"/>`;
  s += `<path d="M760 980 Q740 720 800 680 H1120 Q1180 720 1160 980 Z" fill="#B98F5A" ${S} stroke-width="6"/><ellipse cx="960" cy="690" rx="170" ry="40" fill="#7A5E3A" ${S} stroke-width="5"/>`;
  s += `<path d="M830 690 q30 -30 60 0 t60 0 t60 0" fill="none" stroke="#5E4A2E" stroke-width="7"/>` + smellWaves(960, 640, c.t, 5);
  s += person({ x: 1400, y: 980, s: 1.1, t: c.t, seed: 5, long: true, flip: true, face: 'laugh', la: [-14, -6], ra: [150, -150], armsFront: true });
  return s;
};
SCN.winterFeast = c => {
  let s = bgSnow(c.t, { seed: 111 });
  s += hut(300, 720, 1.1, '#8C7A62') + hut(1640, 720, 1.2, '#8C7A62');
  s += `<ellipse cx="960" cy="930" rx="560" ry="140" fill="#F28C28" opacity=".22"/>` + fire(960, 930, 0.9, c.t);
  s += `<path d="M1150 960 Q1140 860 1170 840 H1290 Q1320 860 1310 960 Z" fill="#B98F5A" ${S} stroke-width="5"/>`;
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70], cloak: true };
  [[600, 950, 1.0, false, 2], [760, 870, 0.8, false, 5], [1480, 950, 1.0, true, 8], [1300, 870, 0.75, true, 9]].forEach(([x, y, sc, fl, sd]) => { s += person(Object.assign({ x, y, s: sc, flip: fl, t: c.t, seed: sd, face: 'happy' }, sitP)); });
  return s + snowfall(c.t, 50);
};
