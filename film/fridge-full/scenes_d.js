// Scenes added for the 17-minute cut: animals that store food, stockfish, chuño, Gilgal, community fridges.
'use strict';

function bigTree(x, y, s = 1) {
  return g(`translate(${x} ${y}) scale(${s})`, stick(0, 0, -10, -300, 30, C.woodD) + stick(-10, -260, -230, -380, 18, C.woodD) + stick(-10, -270, 220, -400, 18, C.woodD) + stick(-10, -300, 40, -470, 14, C.woodD) +
    `<path d="${smooth([[-330, -400], [-250, -480], [-80, -520], [80, -540], [260, -500], [340, -420], [220, -380], [0, -400], [-200, -370]])}" fill="#8FA052" ${S} stroke-width="5"/>`);
}
function leopardShape(s = 1, t = 0) {
  let o = `<path d="M110 -10 Q170 60 150 140 Q140 170 160 190" fill="none" stroke="${C.ink}" stroke-width="18" stroke-linecap="round"/><path d="M110 -10 Q170 60 150 140 Q140 170 160 190" fill="none" stroke="#E2B04A" stroke-width="11" stroke-linecap="round"/>`;
  o += `<path d="${smooth([[-130, -10], [-90, -50], [20, -54], [120, -36], [140, 0], [100, 24], [-80, 26], [-130, 14]])}" fill="#E2B04A" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 12; i++) o += `<circle cx="${-90 + (i * 23) % 210}" cy="${-34 + (i * 17) % 50}" r="6" fill="none" stroke="#5A3A1A" stroke-width="4"/>`;
  o += `<path d="M-60 20 L-70 90 M-20 22 L-24 96 M60 22 L64 92 M100 18 L108 84" ${S} stroke-width="9"/>`;
  o += g(`translate(-150 -20) rotate(${f1(Math.sin(t) * 4)})`, `<circle r="44" fill="#E2B04A" ${S} stroke-width="5"/><path d="M-30 -36 l-8 -16 l16 6 M30 -36 l8 -16 l-16 6" fill="#E2B04A" ${S} stroke-width="4"/><path d="M-14 -6 h6 M10 -6 h6" ${S} stroke-width="5"/><path d="M-6 14 Q0 20 6 14" fill="none" ${S} stroke-width="4"/><circle cx="-24" cy="10" r="4" fill="#5A3A1A"/><circle cx="24" cy="10" r="4" fill="#5A3A1A"/>`);
  return g(`scale(${s})`, o);
}
function hyenaShape(s = 1, flip = false) {
  let o = `<path d="${smooth([[-110, -70], [-40, -100], [60, -70], [110, -30], [100, 10], [-90, 10], [-120, -30]])}" fill="#A6927A" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 9; i++) o += `<circle cx="${-80 + (i * 29) % 170}" cy="${-70 + (i * 19) % 60}" r="7" fill="#5C4A38"/>`;
  o += `<path d="M-80 10 v70 M-40 10 v70 M50 10 v70 M90 4 v74" ${S} stroke-width="9"/>`;
  o += g('translate(-140 -80)', `<ellipse rx="48" ry="34" fill="#A6927A" ${S} stroke-width="5"/><path d="M-20 -30 l-6 -24 l18 12 M14 -30 l6 -24 l-18 12" fill="#A6927A" ${S} stroke-width="4"/><circle cx="-14" cy="-6" r="5" fill="${C.ink}"/><ellipse cx="-44" cy="6" rx="12" ry="9" fill="#3C2E24"/>`);
  return g(`scale(${flip ? -s : s} ${s})`, o);
}
function lionHead(s = 1) {
  return g(`scale(${s})`, `<path d="${smooth(blobPts(80, 76, 14, 21, 0.18))}" fill="#B9763C" ${S} stroke-width="5"/><circle r="50" fill="#E2B04A" ${S} stroke-width="5"/><path d="M-26 -10 L-10 -6 M26 -10 L10 -6" ${S} stroke-width="5"/><ellipse cx="0" cy="16" rx="12" ry="9" fill="#5A3A1A"/><path d="M-16 32 Q0 24 16 32" fill="none" ${S} stroke-width="4"/>`);
}
SCN.leopard = (c, o) => {
  let s = o.night ? bgNight(c.t, { seed: 171 }) : bgSavanna({ seed: 171 });
  s += bigTree(960, 980, 1.6);
  s += g('translate(760 400) rotate(8)', leopardShape(1.0, c.t));
  s += g('translate(1260 420) rotate(80) scale(.8)', antelope(true, c.t));
  if (!o.night) {
    s += g('translate(420 900)', lionHead(1.1)) + g('translate(1600 960)', hyenaShape(0.9, true));
    s += `<path d="M500 820 q10 -20 0 -40 M1500 840 q-10 -20 0 -40" fill="none" ${S} stroke-width="5"/>`;
  }
  return s;
};
SCN.hyenaWater = c => {
  let s = bgSavanna({ seed: 173 });
  s += `<ellipse cx="1180" cy="900" rx="420" ry="110" fill="#8FB7C9" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 3; i++) { const p = (c.t * 0.6 + i / 3) % 1; s += `<ellipse cx="1180" cy="900" rx="${f1(60 + p * 260)}" ry="${f1(16 + p * 70)}" fill="none" stroke="#FFFFFF" stroke-width="4" opacity="${f1(1 - p)}"/>`; }
  s += g('translate(1180 905) scale(.7)', meat(1, 31, '#8E3F33', 10)) + `<path d="M1060 880 Q1180 860 1300 880" stroke="#8FB7C9" stroke-width="18" opacity=".8"/>`;
  return s + g('translate(700 900)', hyenaShape(1.3, true));
};
SCN.squirrel = (c, o) => {
  let s = bgSavanna({ seed: 175, sky: ['#B9D7E6', '#F2EAD6'], hills: '#9DB27A', ground: '#A9B46E' });
  s += `<ellipse cx="900" cy="960" rx="120" ry="30" fill="#7A5A3A" ${S} stroke-width="4"/>`;
  const dig = Math.sin(c.t * 12) * 6;
  s += g(`translate(760 ${f1(900 + dig)})`, `<path d="M40 0 Q120 -40 110 -150 Q90 -230 20 -200 Q80 -150 40 -60 Z" fill="#C9733A" ${S} stroke-width="5"/><ellipse cx="0" cy="-10" rx="70" ry="50" fill="#D9843E" ${S} stroke-width="5"/><circle cx="-60" cy="-50" r="34" fill="#D9843E" ${S} stroke-width="5"/><path d="M-70 -84 l-6 -20 l16 10" fill="#D9843E" ${S} stroke-width="4"/><circle cx="-70" cy="-54" r="5" fill="${C.ink}"/><path d="M-80 0 v30 M-40 20 v20" ${S} stroke-width="7"/>`);
  s += g('translate(900 950)', `<ellipse rx="22" ry="26" fill="#9C6B3A" ${S} stroke-width="4"/><path d="M-22 -10 Q0 -40 22 -10 Z" fill="#6E4A28" ${S} stroke-width="4"/>`);
  if (o.tree) { const p = eout(clamp(c.t / Math.max(0.8, c.d))); s += g(`translate(1300 960) scale(${f1(0.2 + 0.8 * p)})`, stick(0, 0, 0, -260, 10, C.woodD) + `<path d="${smooth([[-120, -260], [-80, -340], [0, -380], [80, -340], [120, -260], [0, -230]])}" fill="#7FA34E" ${S} stroke-width="5"/>`) + hand('FORGOTTEN', 1300, 300, 80, c.t, 0.4); }
  return s;
};
SCN.woodpecker = (c, o) => {
  let s = bgSavanna({ seed: 177, sky: ['#B9D7E6', '#F2EAD6'], hills: '#B9B48A', ground: '#C9BE84', trees: false });
  s += `<path d="M820 1080 L840 120 Q960 80 1080 120 L1100 1080 Z" fill="#8E7556" ${S} stroke-width="7"/>`;
  let k = 0;
  for (let r = 0; r < 12; r++) for (let q = 0; q < 4; q++) {
    const x = 880 + q * 52 + (r % 2) * 22, y = 200 + r * 70, filled = o.fill && c.t > k * 0.03;
    s += `<ellipse cx="${x}" cy="${y}" rx="14" ry="12" fill="${filled ? '#B98A4A' : '#3C2E24'}" stroke="${C.ink}" stroke-width="2.5"/>` + (filled ? `<path d="M${x - 12} ${y - 4} Q${x} ${y - 16} ${x + 12} ${y - 4}" fill="#6E4A28"/>` : '');
    k++;
  }
  const peck = Math.abs(Math.sin(c.t * 14)) * 10;
  s += g(`translate(${f1(1130 - peck)} 520)`, `<ellipse cx="30" cy="40" rx="34" ry="70" fill="${C.ink}"/><ellipse cx="34" cy="60" rx="18" ry="40" fill="#FFFFFF"/><circle cx="20" cy="-30" r="30" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M0 -50 Q20 -70 44 -50 L40 -36 Q20 -44 4 -36 Z" fill="${C.red}"/><circle cx="14" cy="-28" r="5" fill="${C.ink}"/><path d="M-8 -26 L-50 -22 L-8 -16 Z" fill="#3C3F42" ${S} stroke-width="3"/>`);
  if (o.fill) s += hand('GRANARY TREE', 1500, 260, 90, c.t, 0.3, { col: C.accent });
  return s;
};
SCN.fishRack = c => {
  let s = `<defs><linearGradient id="no" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD3DE"/><stop offset="1" stop-color="#EEF3F5"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#no)"/>`;
  s += `<path d="M0 520 L300 300 L520 470 L760 260 L1000 480 L1300 280 L1560 470 L1920 330 V600 H0 Z" fill="#7F8E96" ${S} stroke-width="5"/><path d="M300 300 L360 360 L260 360 Z M760 260 L820 330 L700 330 Z M1300 280 L1360 340 L1240 340 Z" fill="#FFFFFF"/>`;
  s += `<rect y="580" width="${W}" height="200" fill="#6E95AA"/><rect y="760" width="${W}" height="320" fill="#E9EEF0"/>`;
  for (const x0 of [300, 1000]) {
    s += stick(x0, 1000, x0 + 60, 560, 9, C.wood) + stick(x0 + 560, 1000, x0 + 500, 560, 9, C.wood) + stick(x0 + 30, 580, x0 + 530, 580, 9, C.wood);
    for (let i = 0; i < 7; i++) { const sw = Math.sin(c.t * 2.5 + i) * 6; s += g(`translate(${x0 + 80 + i * 66} 590) rotate(${f1(sw)})`, `<path d="M0 0 V24" ${S} stroke-width="4"/>` + g('translate(0 110) rotate(90)', fishShape(0.95, '#C9B79A'))); }
  }
  return s + windLines(c.t, 200, 5) + snowfall(c.t, 30);
};
SCN.chuno = (c, o) => {
  const st = o.step || 1, night = st === 2;
  let s = `<defs><linearGradient id="an" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${night ? C.night1 : '#9FCBE5'}"/><stop offset="1" stop-color="${night ? C.night2 : '#EEF0E6'}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#an)"/>`;
  s += `<path d="M0 640 L260 320 L420 480 L700 220 L960 520 L1240 260 L1500 480 L1700 300 L1920 520 V700 H0 Z" fill="${night ? '#4A5670' : '#8E8E86'}" ${S} stroke-width="5"/><path d="M700 220 L760 300 L640 300 Z M1240 260 L1300 330 L1180 330 Z" fill="#FFFFFF"/>`;
  s += `<rect y="660" width="${W}" height="420" fill="${night ? '#5E6A62' : '#B6A97A'}"/><path d="M0 660 H1920" ${S} stroke-width="4"/>`;
  if (night) s += `<circle cx="1600" cy="160" r="60" fill="#F6ECC9"/>`; else s += sun(1650, 170, 70, c.t);
  const r = rng(181);
  for (let i = 0; i < 24; i++) {
    const x = 300 + (i % 8) * 170 + r() * 40, y = 820 + Math.floor(i / 8) * 80 + r() * 20;
    const shr = st === 5 ? 0.7 : 1, col = st === 5 ? '#E6DED0' : night ? '#9DB4C8' : '#A8723E';
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(30 * shr)}" ry="${f1(22 * shr)}" fill="${col}" ${S} stroke-width="3.5"/>`;
    if (night) s += `<path d="M${f1(x - 10)} ${f1(y - 8)} l6 6 M${f1(x + 8)} ${f1(y - 4)} l6 -6" stroke="#FFFFFF" stroke-width="3"/>`;
    if (st === 3 && i % 3 === 0) { const p = (c.t + i * 0.1) % 1; s += `<circle cx="${f1(x)}" cy="${f1(y + 20 + p * 20)}" r="4" fill="#7FC0E8" opacity="${f1(1 - p)}"/>`; }
  }
  if (st === 1) s += person({ x: 1500, y: 980, s: 1.2, t: c.t, seed: 15, kind: 'modern', shirt: '#C9573E', hairLong: true, hairC: '#2B2118', face: 'happy', la: [-14, -6], ra: [70, 110] });
  if (st === 4) { const up = Math.abs(Math.sin(c.t * 7)); s += person({ x: 800, y: 900, s: 1.3, t: c.t, seed: 10, kind: 'modern', shirt: '#4F7FA8', shortHair: true, hairC: '#2B2118', face: 'laugh', ll: [-10, lerp(-4, -60, up)], rl: [10, lerp(4, 60, 1 - up)], la: [-40, -60], ra: [40, 60] }); for (let i = 0; i < 4; i++) s += `<circle cx="${760 + i * 30}" cy="${f1(880 - up * 40 - i * 6)}" r="6" fill="#7FC0E8"/>`; }
  if (st === 5) s += hand('LIGHT, DRY, HARD', 960, 260, 100, c.t, 0.2, { col: C.text });
  return s;
};
SCN.grainStash = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const p1 = st === 1 ? eout(clamp(c.t / Math.max(1, c.d * 0.8))) : 1, p2 = st === 2 ? eout(clamp(c.t / Math.max(0.8, c.d * 0.8))) : 0;
  const pile = (x, n, col) => { let o = ''; const R = rng(x); for (let i = 0; i < n; i++) { const a = R() * Math.PI, rr = Math.sqrt(R()) * 260; o += `<ellipse cx="${f1(x + Math.cos(a) * rr)}" cy="${f1(900 - Math.sin(a) * rr * 0.8)}" rx="9" ry="15" fill="${col}" stroke="${C.ink}" stroke-width="1.5" transform="rotate(${f1(R() * 180)} ${f1(x + Math.cos(a) * rr)} ${f1(900 - Math.sin(a) * rr * 0.8)})"/>`; } return o; };
  s += pile(640, Math.round(260 * p1), '#E2C46E') + `<text x="640" y="380" font-family="Hand" font-size="110" fill="${C.text}" text-anchor="middle">${Math.round(260000 * p1).toLocaleString('en-US')}</text>` + hand('WILD BARLEY', 640, 480, 70, c.t, st === 1 ? 0.2 : DONE);
  if (st === 2) s += pile(1300, Math.round(120 * p2), '#C9B27A') + `<text x="1300" y="380" font-family="Hand" font-size="110" fill="${C.accent}" text-anchor="middle">${Math.round(120000 * p2).toLocaleString('en-US')}</text>` + hand('WILD OATS', 1300, 480, 70, c.t, 0.2, { col: C.accent });
  return s + hand('GILGAL', 960, 170, 90, c.t, DONE);
};
SCN.communityFridge = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#D9D3CA"/><rect x="0" y="0" width="${W}" height="760" fill="#C9A88A"/>`;
  for (let i = 0; i < 6; i++) s += `<rect x="${60 + i * 320}" y="120" width="200" height="260" fill="#9FC4D2" ${S} stroke-width="6"/>`;
  s += `<rect y="760" width="${W}" height="320" fill="#B8B2A8"/><path d="M0 760 H1920" ${S} stroke-width="5"/>`;
  const fo = { open: o.give || o.take };
  s += fridge(960, 900, 340, 600, Object.assign(fo, { col: '#7FC4A0' }));
  s += `<path d="M830 380 h260" stroke="#FFFFFF" stroke-width="0"/>`;
  if (o.label) s += pop(960, 230, c.t, 0.15, `<rect x="-250" y="-60" width="500" height="110" rx="14" fill="#FFFDF7" ${S} stroke-width="5"/><text x="0" y="20" font-family="Hand" font-size="64" fill="${C.text}" text-anchor="middle">FREE FOOD · SHARE</text>`);
  if (o.give) s += person({ x: 560, y: 980, s: 1.2, kind: 'modern', shirt: '#C9573E', shortHair: true, hairC: '#2B2118', t: c.t, seed: 3, face: 'happy', la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 30)} ${f1(e[1])}) scale(.5)`, leftovers()) });
  if (o.take) s += person({ x: 1360, y: 980, s: 1.2, kind: 'modern', shirt: '#4F7FA8', hairLong: true, hairC: '#2B2118', flip: true, t: c.t, seed: 6, face: 'laugh', la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 30)} ${f1(e[1])}) scale(.7)`, milk()) });
  return s;
};
SCN.teachKid = c => {
  let s = bgSavanna({ seed: 183 }) + rock(960, 920, 300, 70, 3) + g('translate(900 860) scale(1.2)', meat(1, 13, C.meat, 0, false));
  const saw = Math.sin(c.t * 10) * 10;
  s += person(Object.assign({ x: 600, y: 960, s: 1.2, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [60, 80], ra: [70, 95 + saw], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(30)`, stoneKnife(0.9)) }, savSit));
  s += person(Object.assign({ x: 1260, y: 965, s: 0.75, t: c.t, seed: 9, flip: true, face: 'surprised', la: [-14, -6], ra: [70, 95 - saw], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(30)`, stoneKnife(0.6)) }, savSit));
  return s;
};
