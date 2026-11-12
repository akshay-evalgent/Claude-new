// Scenes for "How Did Ancient Humans Survive Without Doctors?". Builds on the fridge library.
// Nothing graphic: injuries, surgery and illness are shown as diagrams and healed outcomes.
'use strict';

Object.assign(PLACES, {
  spain: [-5.33, 43.38], iraq: [44.22, 36.83], georgia: [44.35, 41.33], italyN: [11.9, 46.1], italyC: [10.37, 43.98],
  pakistan: [67.6, 29.4], croatia: [15.87, 46.16], borneo: [117.9, 1.0], alps: [10.84, 46.78], vietnam: [105.9, 20.1],
  sumatra: [97.5, 3.8], mahale: [29.9, -6.1], france: [7.35, 47.86],
});
Object.assign(REGIONS, {
  spain: { center: [-4, 40.5], scale: 2300, hl: ['Spain'] },
  iraq: { center: [44, 33.5], scale: 2400, hl: ['Iraq'] },
  georgia: { center: [43.5, 42], scale: 3400, hl: ['Georgia'] },
  italyN: { center: [12, 43.5], scale: 2300, hl: ['Italy'] },
  italyC: { center: [12, 43.5], scale: 2300, hl: ['Italy'] },
  pakistan: { center: [69.5, 30], scale: 2000, hl: ['Pakistan'] },
  croatia: { center: [16, 45], scale: 4200, hl: ['Croatia'] },
  borneo: { center: [114, 0.5], scale: 2400, hl: ['Indonesia'] },
  alps: { center: [11, 46.6], scale: 6500, hl: ['Italy', 'Austria'] },
  vietnam: { center: [106, 17], scale: 2100, hl: ['Vietnam'] },
  sumatra: { center: [99, 1.5], scale: 2600, hl: ['Indonesia'] },
  mahale: { center: [33, -6.5], scale: 2400, hl: ['Tanzania'] },
  france: { center: [2.5, 46.5], scale: 2300, hl: ['France'] },
});

const CAVE = (t, o = {}) => {
  let s = `<rect width="${W}" height="${H}" fill="#2E241C"/><path d="M-40 1080 L-40 140 Q400 -40 960 40 Q1500 -30 1960 160 V1080 Z" fill="#4A3A2E"/>`;
  s += `<path d="M300 1080 Q340 420 760 300 Q1200 260 1560 420 Q1700 700 1680 1080 Z" fill="#3A2E24" ${S} stroke-width="6"/>`;
  s += `<path d="M1180 320 Q1380 300 1500 420 Q1440 620 1300 700 Q1240 520 1180 320 Z" fill="${o.night ? C.night1 : '#BFDDEA'}" ${S} stroke-width="6"/>`;
  if (o.night) s += `<circle cx="1360" cy="420" r="26" fill="#F6ECC9"/>`;
  return s;
};
function swollenFace(k = 1) {
  return `<path d="M44 -14 Q92 4 78 40 Q66 62 40 52" fill="#FFFFFF" ${S} stroke-width="5.5"/><ellipse cx="52" cy="20" rx="24" ry="20" fill="#F0A2A2" opacity="${0.6 + 0.3 * k}"/>`;
}
function throb(x, y, t) {
  const p = 0.5 + 0.5 * Math.sin(t * 9);
  return `<path d="M${x} ${y} l${f1(26 + p * 10)} -10 M${x + 4} ${y + 26} l${f1(30 + p * 10)} 4 M${x - 4} ${y + 50} l${f1(22 + p * 10)} 18" ${S} stroke="${C.red}" stroke-width="6" opacity="${f1(0.5 + 0.5 * p)}"/>`;
}

// ----- modern -----
SCN.modernPill = c => {
  let s = kitchen(true);
  const p = clamp(c.t / Math.max(1, c.d));
  s += person({ x: 900, y: 960, s: 1.35, kind: 'modern', t: c.t, seed: 3, face: p > 0.6 ? 'happy' : 'sick', shirt: '#7D8FA8', la: [150, -110], ra: [40, 100], armsFront: true,
    front: (L, R) => g(`translate(${f1(L[0] - 10)} ${f1(L[1] + 10)}) rotate(20)`, `<rect x="-22" y="-60" width="44" height="80" rx="8" fill="#DCEFF3" ${S} stroke-width="4"/>`) + g('translate(0 -354)', p < 0.6 ? swollenFace(1) : '') });
  s += g('translate(1180 860)', `<rect x="-40" y="-90" width="80" height="110" rx="12" fill="#F2C443" ${S} stroke-width="5"/><rect x="-46" y="-110" width="92" height="28" rx="6" fill="#FFFFFF" ${S} stroke-width="4"/><ellipse cx="80" cy="10" rx="20" ry="10" fill="#FFFFFF" ${S} stroke-width="3"/>`);
  return s;
};
SCN.dentistModern = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E6F0F2"/><rect y="820" width="${W}" height="260" fill="#C9D6DA"/>`;
  s += `<path d="M560 820 L760 640 L1220 640 L1300 700 L1300 760 L760 760 L640 860 Z" fill="#7FB4C9" ${S} stroke-width="6"/><path d="M900 860 V760 M1100 860 V760" ${S} stroke-width="14"/>`;
  s += g('translate(1180 580)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + faceSvg(o.numb ? 'sleep' : 'worried', c.t, 2)) + `<path d="M800 650 Q980 600 1130 640" fill="none" stroke="#4F7FA8" stroke-width="60" stroke-linecap="round"/>`;
  s += `<path d="M1400 200 L1300 380" ${S} stroke-width="10"/><ellipse cx="1290" cy="400" rx="80" ry="40" fill="#FFF3B8" ${S} stroke-width="5"/>`;
  s += person({ x: 1500, y: 960, s: 1.3, kind: 'modern', t: c.t, seed: 6, face: 'happy', shirt: '#F4F6F7', la: [-14, -6], ra: [-120, -80], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} l-90 10" stroke="#8B949B" stroke-width="7" stroke-linecap="round"/><circle cx="${f1(e[0] - 96)}" cy="${f1(e[1] + 10)}" r="12" fill="#DCEFF3" ${S} stroke-width="3"/>` });
  if (o.numb) s += pop(900, 300, c.t, 0.2, `<rect x="-90" y="-26" width="180" height="52" rx="20" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M90 0 H140" ${S} stroke-width="8"/><rect x="-60" y="-14" width="80" height="28" fill="#8ED0E8"/>`);
  return s;
};
SCN.ambulance = c => {
  let s = kitchen(false, { wx: 150 }).replace(/#F2E3C6/, '#D9D3CA');
  s = `<rect width="${W}" height="${H}" fill="#CFE3EA"/><rect y="700" width="${W}" height="380" fill="#9AA0A4"/><path d="M0 860 H1920" stroke="#FFFFFF" stroke-width="10" stroke-dasharray="80 60"/>`;
  for (let i = 0; i < 5; i++) s += `<rect x="${40 + i * 400}" y="260" width="320" height="440" fill="#C9A88A" ${S} stroke-width="5"/>`;
  const x = lerp(1900, 700, eout(clamp(c.t / Math.max(1, c.d * 0.8))));
  s += g(`translate(${f1(x)} 820)`, `<rect x="-220" y="-220" width="440" height="200" rx="20" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="120" y="-180" width="100" height="80" rx="10" fill="#9FC4D2" ${S} stroke-width="4"/><rect x="-60" y="-170" width="120" height="30" fill="${C.red}"/><rect x="-15" y="-215" width="30" height="120" fill="${C.red}"/><circle cx="-130" cy="-10" r="40" fill="#3C3F42" ${S} stroke-width="5"/><circle cx="130" cy="-10" r="40" fill="#3C3F42" ${S} stroke-width="5"/><rect x="-40" y="-250" width="80" height="30" rx="8" fill="${Math.sin(c.t * 20) > 0 ? '#4F9AF0' : C.red}" ${S} stroke-width="4"/>`);
  for (let i = 0; i < 3; i++) s += `<path d="M${f1(x + 250 + i * 50)} ${720 + i * 30} h80" ${S} stroke-width="5" opacity=".5"/>`;
  return s;
};
SCN.timeBar2 = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const p = st === 1 ? eout(clamp(c.t / 0.8)) : 1;
  s += `<rect x="160" y="500" width="${f1(1600 * p)}" height="90" rx="12" fill="${st >= 2 ? '#E9D3A6' : '#F2C443'}" ${S} stroke-width="6"/>`;
  s += hand('300,000 YEARS OF US', 960, 420, 100, c.t, st === 1 ? 0.2 : DONE);
  if (st >= 2) s += hand(o.none || 'NO DOCTORS', 860, 700, 110, c.t, st === 2 ? 0.2 : DONE);
  if (st >= 3) s += `<rect x="1754" y="490" width="8" height="110" fill="${C.red}"/>` + arrow(1700, 760, 1756, 620, c.t, 0.2, 0.4, C.red) + hand(o.yes || 'GERMS, ANTIBIOTICS', 1560, 840, 64, c.t, 0.3, { col: C.red });
  return s;
};

// ----- ancient patients -----
SCN.toothache = (c, o) => {
  let s = CAVE(c.t, { night: true }) + `<ellipse cx="900" cy="960" rx="520" ry="120" fill="#F28C28" opacity=".25"/>` + fire(1250, 980, 0.9, c.t);
  s += person(Object.assign({ x: 760, y: 1000, s: 1.45, t: c.t, seed: 3, face: 'sick', la: [-10, 30], ra: [70, 205], armsFront: true, hip: 60, ll: [112, 10], rl: [100, -4],
    front: () => g('translate(0 -354)', swollenFace(1)) + g('translate(0 -354)', throb(90, 0, c.t)) }, {}));
  return s;
};
function molar(s = 1, o = {}) {
  let t = `<path d="M-90 -120 Q-100 -200 -40 -210 Q0 -190 40 -210 Q100 -200 90 -120 L80 20 Q60 40 40 30 L20 160 Q10 190 -10 160 L-20 40 L-40 160 Q-50 190 -60 160 L-80 20 Z" fill="#FFFDF5" ${S} stroke-width="7"/>`;
  return g(`scale(${s})`, t);
}
SCN.toothDiagram = (c, o) => {
  const m = o.mode || 'healthy';
  let s = paper() + `<rect x="0" y="560" width="${W}" height="520" fill="#F2B4B4" ${S} stroke-width="6"/>`;
  const front = m === 'filling';
  if (front) s += g('translate(960 560)', `<path d="M-90 -260 Q-90 -300 -40 -300 H40 Q90 -300 90 -260 L80 60 Q60 200 0 220 Q-60 200 -80 60 Z" fill="#FFFDF5" ${S} stroke-width="7"/>`);
  else s += g('translate(960 600) scale(1.7)', molar(1));
  if (m === 'abscess') { const p = 0.5 + 0.5 * Math.sin(c.t * 6); s += `<path d="M900 300 Q930 360 960 320 Q980 380 1010 330" fill="none" stroke="#5C3A2A" stroke-width="10"/><ellipse cx="930" cy="910" rx="${f1(60 + p * 14)}" ry="${f1(50 + p * 10)}" fill="#E05A4A" opacity=".75"/>` + throb(1060, 860, c.t) + hand('INFECTION', 1400, 960, 80, c.t, 0.2, { col: C.red }); }
  if (m === 'tartar') { s += `<path d="M820 520 Q960 470 1100 520 L1110 580 Q960 540 810 580 Z" fill="#D9B45E" ${S} stroke-width="5"/>`; s += magnifier(1460, 330, 200, `<rect x="1260" y="130" width="400" height="400" fill="#F7E7B8"/>` + `<path d="M1330 260 q30 -40 60 0 t60 0 t60 0" fill="none" stroke="${C.accent}" stroke-width="8"/><path d="M1330 300 q30 40 60 0 t60 0 t60 0" fill="none" stroke="#4F7FA8" stroke-width="8"/>` + `<circle cx="1380" cy="420" r="20" fill="#9AC56A" ${S} stroke-width="3"/><circle cx="1470" cy="440" r="16" fill="#F2F0E6" ${S} stroke-width="3"/>`) + hand('TARTAR', 600, 470, 90, c.t, 0.2, { col: '#8E6A1E' }); }
  if (m === 'toothpick') { const sl = Math.sin(c.t * 8) * 30; s += `<path d="M1040 260 Q1060 360 1050 470" fill="none" stroke="#B88E54" stroke-width="12"/>` + g(`translate(${f1(1300 + sl)} 340) rotate(-20)`, `<path d="M-260 0 H140" stroke="#B9A06A" stroke-width="12" stroke-linecap="round"/><path d="M140 0 l30 -8 M140 0 l30 8" stroke="#8E7748" stroke-width="5"/>`) + hand('GROOVES', 1450, 520, 80, c.t, 0.3); }
  if (m === 'flint') { const sc = Math.sin(c.t * 12) * 16; s += `<ellipse cx="960" cy="300" rx="60" ry="34" fill="#5C3A2A"/>` + g(`translate(${f1(1080 + sc)} 220) rotate(-35)`, `<path d="M0 0 L120 -30 L150 0 L120 24 Z" fill="#9C978F" ${S} stroke-width="4"/>`); for (let i = 0; i < 5; i++) s += `<path d="M${920 + i * 16} 290 l10 20" stroke="#8E6A5A" stroke-width="3"/>`; s += hand('SCRAPED CLEAN', 1400, 520, 80, c.t, 0.3); }
  if (m === 'filling') s += `<path d="M920 330 Q960 300 1000 330 L990 420 Q960 440 930 420 Z" fill="#1C1A18" ${S} stroke-width="4"/><path d="M930 360 q20 -10 40 4 M940 400 q16 8 30 -4" fill="none" stroke="#B9A06A" stroke-width="3"/>` + hand('BITUMEN FILLING', 1440, 400, 80, c.t, 0.3);
  if (m === 'drill') { const sp = Math.sin(c.t * 18) * 30; s += `<path d="M960 120 V300" ${S} stroke-width="14"/><path d="M960 300 l-8 20 l16 0 Z" fill="#9C978F" ${S} stroke-width="3"/><path d="M${f1(800 + sp)} 180 Q960 230 ${f1(1120 + sp)} 180" fill="none" stroke="${C.wood}" stroke-width="12" stroke-linecap="round"/><path d="M${f1(800 + sp)} 180 L${f1(1120 + sp)} 180" stroke="#E8E2D6" stroke-width="3"/><circle cx="960" cy="320" r="12" fill="#5C3A2A"/>` + hand('BOW DRILL', 1450, 260, 90, c.t, 0.3); }
  return s;
};
SCN.healedBone = (c, o) => {
  const m = o.mode || 'fracture';
  let s = `<rect width="${W}" height="${H}" fill="#1E2C3E"/><rect x="200" y="120" width="1520" height="840" rx="20" fill="#24364C" stroke="#7FA3C4" stroke-width="5"/>`;
  const bone = (x, y, a, len, w) => g(`translate(${x} ${y}) rotate(${a})`, `<rect x="${-len / 2}" y="${-w / 2}" width="${len}" height="${w}" rx="${w / 2}" fill="#EAF2F8" opacity=".9"/><circle cx="${-len / 2}" cy="${-w * 0.4}" r="${w * 0.7}" fill="#EAF2F8" opacity=".9"/><circle cx="${-len / 2}" cy="${w * 0.4}" r="${w * 0.7}" fill="#EAF2F8" opacity=".9"/><circle cx="${len / 2}" cy="${-w * 0.4}" r="${w * 0.7}" fill="#EAF2F8" opacity=".9"/><circle cx="${len / 2}" cy="${w * 0.4}" r="${w * 0.7}" fill="#EAF2F8" opacity=".9"/>`);
  if (m === 'fracture') { s += bone(960, 540, -8, 900, 70) + `<ellipse cx="960" cy="534" rx="70" ry="60" fill="#F7FBFE"/><path d="M930 490 L960 530 L940 580" fill="none" stroke="#7FA3C4" stroke-width="5"/>` + hand('HEALED', 960, 800, 110, c.t, 0.3, { col: '#9AD08E' }); }
  if (m === 'many') { [[700, 400, 20], [1250, 420, -30], [900, 720, 70], [1300, 760, 10]].forEach(([x, y, a], i) => { s += pop(x, y, c.t, 0.1 + i * 0.2, bone(0, 0, a, 380, 40) + `<ellipse cx="0" cy="0" rx="40" ry="36" fill="#F7FBFE"/>`); }); }
  if (m === 'leg') { s += bone(960, 380, 90, 420, 70) + `<path d="M920 600 Q960 640 1000 600" fill="#EAF2F8" opacity=".9"/>` + hand('HEALED', 1300, 560, 110, c.t, 0.3, { col: '#9AD08E' }); }
  if (m === 'skull') { s += `<ellipse cx="960" cy="560" rx="320" ry="280" fill="#EAF2F8" opacity=".9"/><circle cx="1060" cy="420" r="60" fill="#24364C"/><circle cx="1060" cy="420" r="66" fill="none" stroke="#F7FBFE" stroke-width="14"/>` + hand('SMOOTH, HEALED EDGES', 960, 200, 80, c.t, 0.3, { col: '#9AD08E' }); }
  return s;
};
SCN.leftBehind = c => {
  let s = bgSavanna({ seed: 201, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
  const p = clamp(c.t / c.d), w = Math.sin(c.t * 8) * 16;
  [[1300, 2], [1460, 5], [1600, 9], [1740, 10]].forEach(([x, sd], i) => { s += `<g opacity="${f1(1 - p * 0.4)}">${person({ x: x + p * 200, y: 940 - (i % 2) * 20, s: 0.8, t: c.t, seed: sd, long: i === 1, face: 'neutral', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-14, -6], ra: [14, 6] })}</g>`; });
  s += person(Object.assign({ x: 560, y: 965, s: 1.25, t: c.t, seed: 3, face: 'sad', la: [20, 60], ra: [-10, -40] }, { hip: 60, ll: [112, 10], rl: [100, -4] }));
  return s + `<rect width="${W}" height="${H}" fill="#8C8270" opacity=".10"/>`;
};
SCN.dangerHunt = c => {
  let s = bgSavanna({ seed: 203 });
  const p = clamp(c.t / c.d);
  s += g(`translate(${f1(1500 - p * 300)} 900) scale(1.6)`, `<g transform="rotate(${f1(Math.sin(c.t * 14) * 3)})">${bison(0, 0, 1, true)}</g>`);
  for (let i = 0; i < 4; i++) s += `<path d="M${f1(1750 - p * 300 + i * 20)} ${880 + i * 20} h120" ${S} stroke-width="6" opacity=".4"/>`;
  return s + person({ x: 600, y: 965, s: 1.25, t: c.t, seed: 2, face: 'scared', la: [-150, -170], ra: [26, 150], holdR: e => spear(e[0], e[1], 180, 380, 0.45) });
};
SCN.birthHelp = (c, o) => {
  let s = CAVE(c.t) + `<ellipse cx="960" cy="980" rx="560" ry="110" fill="#F28C28" opacity=".2"/>` + fire(1450, 990, 0.7, c.t);
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2] };
  s += person(Object.assign({ x: 820, y: 1000, s: 1.2, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [60, 100], ra: [60, 100],
    front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 10)})`, `<ellipse rx="56" ry="36" fill="#E8DCCB" ${S} stroke-width="4"/><circle cx="-36" cy="-14" r="26" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M-46 -16 q4 3 8 0 M-30 -16 q4 3 8 0" fill="none" ${S} stroke-width="3"/>`) }, sitP));
  s += person(Object.assign({ x: 1100, y: 1000, s: 1.15, t: c.t, seed: 14, long: true, hairC: '#B9B2A6', flip: true, face: 'happy', la: [-10, 30], ra: [120, 100] }, sitP));
  if (o.helper2) s += person(Object.assign({ x: 560, y: 1000, s: 1.0, t: c.t, seed: 12, long: true, face: 'happy', la: [-10, 30], ra: [100, 120] }, sitP));
  return s;
};
function ape(kind, t, o = {}) {
  const body = kind === 'orangutan' ? '#C7642E' : '#3E342E', face = kind === 'orangutan' ? '#6E4A3A' : '#C9A88A';
  let a = `<path d="${smooth([[-90, 40], [-110, -120], [-60, -200], [60, -200], [110, -120], [90, 40], [0, 70]])}" fill="${body}" ${S} stroke-width="5"/>`;
  a += `<path d="M-90 -140 Q-170 -40 -150 60 M90 -140 Q170 -40 150 60" fill="none" stroke="${C.ink}" stroke-width="40" stroke-linecap="round"/><path d="M-90 -140 Q-170 -40 -150 60 M90 -140 Q170 -40 150 60" fill="none" stroke="${body}" stroke-width="30" stroke-linecap="round"/>`;
  let hd = `<circle r="${kind === 'orangutan' ? 90 : 80}" fill="${body}" ${S} stroke-width="5"/>`;
  if (kind === 'orangutan') hd += `<ellipse cx="-110" cy="10" rx="50" ry="70" fill="#8E5A3A" ${S} stroke-width="4"/><ellipse cx="110" cy="10" rx="50" ry="70" fill="#8E5A3A" ${S} stroke-width="4"/>`;
  hd += `<ellipse cx="0" cy="20" rx="60" ry="56" fill="${face}" ${S} stroke-width="4"/><circle cx="-22" cy="0" r="7" fill="${C.ink}"/><circle cx="22" cy="0" r="7" fill="${C.ink}"/><path d="M-16 40 Q0 ${o.grimace ? 30 : 50} 16 40" fill="none" ${S} stroke-width="4"/>`;
  if (o.wound) hd += `<path d="M30 12 l26 10" stroke="${o.healed ? '#9AD08E' : C.red}" stroke-width="7" stroke-linecap="round"/>`;
  if (o.paste) hd += `<ellipse cx="44" cy="18" rx="24" ry="14" fill="#7FA34E" opacity=".9"/>`;
  return g('translate(0 -260)', hd) + a;
}
SCN.chimp = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${i * 240}" cy="${200 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#6E9A5A' : '#5F8A4E'}"/>`;
  s += `<rect y="820" width="${W}" height="260" fill="#7A6A4A"/>`;
  const chew = Math.sin(c.t * 10) * 8;
  s += g('translate(960 860) scale(1.5)', ape('chimp', c.t, { grimace: o.bitter }) + g(`translate(70 ${f1(-230 + chew)}) rotate(-30)`, `<rect x="-6" y="-80" width="12" height="160" fill="#8FB46A" ${S} stroke-width="3"/>`));
  if (o.bitter) s += hand('BITTER!', 1400, 300, 110, c.t, 0.3, { col: C.green });
  return s;
};
SCN.orangutan = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="${H}" fill="#7FA86A"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${i * 240}" cy="${180 + (i % 2) * 90}" r="${190 + (i % 3) * 40}" fill="${i % 2 ? '#4F7A44' : '#5E8A4E'}"/>`;
  s += stick(0, 900, 1920, 860, 30, C.woodD);
  s += g('translate(960 860) scale(1.4)', ape('orangutan', c.t, { wound: true, paste: st >= 2 && st < 4, healed: st >= 4 }));
  if (st === 1) s += g(`translate(1180 ${f1(560 + Math.sin(c.t * 10) * 8)})`, `<path d="M0 0 Q40 -40 80 0 Q40 30 0 0 Z" fill="#6E9A4A" ${S} stroke-width="3"/>`);
  if (st === 4) s += hand('HEALED', 1450, 300, 120, c.t, 0.3, { col: '#3E7A3A' });
  if (st === 1) s += hand('RAKUS', 520, 260, 110, c.t, 0.2, { col: C.accent });
  return s;
};
function yarrow(s = 1) { let o = `<path d="M0 0 V-220" stroke="#6E8A4E" stroke-width="7"/>`; for (let i = 0; i < 9; i++) o += `<circle cx="${-50 + (i % 5) * 25}" cy="${-230 - Math.floor(i / 5) * 18}" r="13" fill="#FFFFFF" ${S} stroke-width="3"/>`; for (let i = 0; i < 4; i++) o += `<path d="M0 ${-60 - i * 40} q${i % 2 ? 40 : -40} -10 ${i % 2 ? 60 : -60} -30" fill="none" stroke="#6E8A4E" stroke-width="5"/>`; return g(`scale(${s})`, o); }
function chamomile(s = 1) { let o = ''; for (const [x, y] of [[-40, -200], [30, -230], [0, -150]]) { o += `<path d="M0 0 Q${x / 2} ${y / 2} ${x} ${y}" fill="none" stroke="#6E8A4E" stroke-width="5"/>`; for (let k = 0; k < 10; k++) { const a = k * 36 * Math.PI / 180; o += `<ellipse cx="${f1(x + Math.cos(a) * 22)}" cy="${f1(y + Math.sin(a) * 22)}" rx="12" ry="6" fill="#FFFFFF" ${S} stroke-width="2" transform="rotate(${k * 36} ${f1(x + Math.cos(a) * 22)} ${f1(y + Math.sin(a) * 22)})"/>`; } o += `<circle cx="${x}" cy="${y}" r="12" fill="#F2C443" ${S} stroke-width="3"/>`; } return g(`scale(${s})`, o); }
function poplarBark(s = 1) { return g(`scale(${s})`, `<path d="M-40 0 V-260 H40 V0 Z" fill="#CFC8B8" ${S} stroke-width="5"/><path d="M-30 -60 h30 M-10 -120 h40 M-30 -190 h24" stroke="#5C5048" stroke-width="6" stroke-linecap="round"/><path d="M0 -260 q60 -40 80 -100 q-70 10 -80 100" fill="#8FB46A" ${S} stroke-width="4"/>`); }
function mould(s = 1, t = 0) { let o = `<path d="M-120 0 Q-130 -100 0 -110 Q130 -100 120 0 Z" fill="#D9B477" ${S} stroke-width="5"/>`; for (let i = 0; i < 14; i++) o += `<circle cx="${-80 + (i * 37) % 160}" cy="${-30 - (i * 23) % 60}" r="${10 + (i % 3) * 5}" fill="${i % 2 ? '#5EA39A' : '#7FC0B4'}" opacity=".9"/>`; return g(`scale(${s})`, o); }
SCN.herbs = (c, o) => {
  const items = { yarrow: ['YARROW', yarrow(1.4)], chamomile: ['CHAMOMILE', chamomile(1.5)], poplar: ['POPLAR', poplarBark(1.3)], mould: ['PENICILLIUM MOULD', mould(1.3, c.t)], fungus: ['BIRCH FUNGUS', `<path d="M-90 0 Q-100 -90 0 -100 Q100 -90 90 0 Z" fill="#C9A274" ${S} stroke-width="5"/><path d="M-70 -10 h140" stroke="#8E6A3C" stroke-width="5"/>`] };
  const show = o.show || ['yarrow', 'chamomile'];
  let s = paper();
  const n = show.length;
  show.forEach((k, i) => {
    const x = 960 + (i - (n - 1) / 2) * (n > 2 ? 440 : 560);
    s += pop(x, 760, c.t, o.at ? (Array.isArray(o.at) ? o.at[i] : o.at) : 0.1 + i * 0.3, items[k][1]);
    s += hand(items[k][0], x, 900, 70, c.t, (o.at ? (Array.isArray(o.at) ? o.at[i] : o.at) : 0.1 + i * 0.3) + 0.2);
  });
  if (o.title) s += hand(o.title, 960, 200, 100, c.t, 0.1, { col: C.accent });
  return s;
};
SCN.bitterFace = c => {
  let s = bgSavanna({ seed: 205, sky: ['#A9D2E8', '#F2EEDC'], hills: '#B9B48A', ground: '#C9BE84' });
  const chew = Math.sin(c.t * 9) * 8;
  s += person({ x: 900, y: 1160, s: 1.9, t: c.t, seed: 3, face: 'sick', la: [-14, -6], ra: [140, -100 + chew], armsFront: true, bob: 0,
    front: (L, R) => g(`translate(${f1(R[0] + 14)} ${f1(R[1])}) rotate(-40)`, `<path d="M0 0 V-90" stroke="#6E8A4E" stroke-width="6"/>` + chamomile(0.4)) });
  return s + hand('BITTER!', 1450, 300, 110, c.t, 0.3, { col: C.green });
};
SCN.otzi = (c, o) => {
  const m = o.mode || 'walk';
  let s = bgSnow(c.t, { seed: 207 });
  const w = m === 'walk' ? Math.sin(c.t * 8) * 16 : 0;
  const capF = (L, R) => '';
  s += person({ x: m === 'walk' ? lerp(500, 900, clamp(c.t / c.d)) : 760, y: 965, s: 1.35, t: c.t, seed: 21, face: 'neutral', cloak: true, beard: true, hairC: '#3C2A1E', ll: [-w, -w * 0.6], rl: [w, w * 0.6], la: [-14, -6], ra: [26, 150],
    holdR: e => spear(e[0], e[1], 180, 420, 0.45),
    front: () => g('translate(0 -354)', `<path d="M-62 -30 Q-60 -110 0 -112 Q60 -110 62 -30 Q0 -50 -62 -30 Z" fill="#6E5235" ${S} stroke-width="4.5"/>`) });
  if (m === 'fungus') s += magnifier(1360, 520, 220, `<rect x="1140" y="300" width="440" height="440" fill="#FFFDF5"/><path d="M1200 400 Q1360 360 1520 400" fill="none" stroke="#5C4430" stroke-width="5"/>` + g('translate(1300 520)', `<path d="M-60 0 Q-66 -60 0 -66 Q66 -60 60 0 Z" fill="#C9A274" ${S} stroke-width="4"/>`) + g('translate(1440 540)', `<path d="M-50 0 Q-56 -50 0 -56 Q56 -50 50 0 Z" fill="#C9A274" ${S} stroke-width="4"/>`));
  if (m === 'tattoos') { s += magnifier(1360, 560, 240, `<rect x="1120" y="320" width="480" height="480" fill="#F4E4D0"/><path d="M1300 320 V800 M1420 320 V800" stroke="#E2CDB4" stroke-width="60"/>` + [0, 1, 2, 3, 4].map(i => `<path d="M${1280 + (i % 2) * 120} ${400 + i * 70} h50 M${1280 + (i % 2) * 120} ${416 + i * 70} h50 M${1280 + (i % 2) * 120} ${432 + i * 70} h50" stroke="#2E3A4A" stroke-width="7" stroke-linecap="round"/>`).join('')) + hand('61 TATTOOS', 1360, 900, 80, c.t, 0.3); }
  return s;
};
SCN.borneoCave = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9D2C8"/>`;
  s += `<path d="M400 1080 L460 200 Q700 80 1000 120 Q1300 100 1500 260 L1560 1080 Z" fill="#C9C2B0" ${S} stroke-width="6"/><path d="M820 1080 Q840 640 960 600 Q1080 640 1100 1080 Z" fill="#3A2E24" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 16; i++) s += `<circle cx="${(i * 131) % 1920}" cy="${(i % 2 ? 980 : 1040) - (i % 3) * 60}" r="${80 + (i % 4) * 30}" fill="${i % 2 ? '#3E6E4A' : '#4F7F52'}" ${S} stroke-width="4"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${520 + i * 160} 220 q-20 80 0 160 q20 80 0 160" fill="none" stroke="#5F8A4E" stroke-width="6"/>`;
  if (o.label) s += hand('LIANG TEBO', 960, 140, 100, c.t, 0.1, { col: C.text });
  return s;
};
SCN.crutchKid = c => {
  let s = `<rect width="${W}" height="${H}" fill="#A9D2C8"/><rect y="760" width="${W}" height="320" fill="#8E9A5A"/>`;
  for (let i = 0; i < 10; i++) s += `<circle cx="${(i * 211) % 1920}" cy="${740 - (i % 3) * 40}" r="${90 + (i % 4) * 30}" fill="${i % 2 ? '#3E6E4A' : '#4F7F52'}"/>`;
  const w = Math.sin(c.t * 5) * 10, x = lerp(500, 900, clamp(c.t / c.d));
  s += person({ x, y: 960, s: 0.95, t: c.t, seed: 9, face: 'happy', ll: [-w, -w * 0.6], rl: [10, 4], la: [-20, -10], ra: [20, 10], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} L${f1(e[0] + 30)} ${f1(e[1] + 200)}" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>` });
  s += person({ x: x + 260, y: 960, s: 1.15, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-60, -90], ra: [14, 6] });
  return s + hand('LIVED FOR YEARS', 1400, 260, 100, c.t, 0.3, { col: C.accent });
};
SCN.careFeed = (c, o) => {
  const m = o.mode || 'toothless';
  let s = m === 'manbac' ? CAVE(c.t) + `<ellipse cx="960" cy="980" rx="560" ry="110" fill="#F28C28" opacity=".2"/>` : bgSavanna({ seed: 209 });
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2] };
  if (m === 'toothless') {
    s += person(Object.assign({ x: 760, y: 1000, s: 1.25, t: c.t, seed: 14, beard: true, hairC: '#B9B2A6', face: 'happy', la: [-10, 30], ra: [70, 100] }, sitP));
    const mash = Math.abs(Math.sin(c.t * 6)) * 12;
    s += person(Object.assign({ x: 1150, y: 1000, s: 1.1, t: c.t, seed: 5, long: true, hairC: C.hair2, flip: true, face: 'happy', la: [-10, 30], ra: [80, 100 - mash], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1] + 20)})`, bowl(0.6)) }, sitP));
    s += pop(960, 360, c.t, 0.3, `<rect x="-200" y="-50" width="400" height="100" rx="20" fill="#FFFDF7" ${S} stroke-width="5"/><text x="0" y="20" font-family="Hand" font-size="60" fill="${C.text}" text-anchor="middle">SOFT FOOD</text>`);
  }
  if (m === 'shanidar') {
    s += person(Object.assign({ x: 760, y: 1000, s: 1.3, t: c.t, seed: 21, beard: true, hairC: '#3C2A1E', face: 'happy', la: [-10, 10], ra: [10, 5],
      front: () => g('translate(0 -354)', `<path d="M-32 -6 l14 14 M-18 -6 l-14 14" ${S} stroke-width="5"/>`) }, sitP));
    s += person(Object.assign({ x: 1150, y: 1000, s: 1.15, t: c.t, seed: 5, flip: true, face: 'happy', la: [-10, 30], ra: [110, 120], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, meat(0.45, 9)) }, sitP));
    s += person(Object.assign({ x: 1400, y: 1000, s: 0.95, t: c.t, seed: 12, long: true, flip: true, face: 'happy', la: [-10, 30], ra: [40, 70] }, sitP));
  }
  if (m === 'manbac') {
    s += `<path d="M560 960 Q600 900 900 910 Q1000 930 900 980 Q700 990 560 960 Z" fill="${C.tunic}" ${S} stroke-width="5"/>`;
    s += g('translate(520 920) rotate(-10) scale(1.2)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + hairCave(17, C.hair, false) + faceSvg('happy', c.t, 2));
    s += person(Object.assign({ x: 1180, y: 1000, s: 1.15, t: c.t, seed: 5, long: true, hairC: C.hair2, flip: true, face: 'happy', la: [-10, 30], ra: [120, 100], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, bowl(0.5)) }, sitP));
    s += fire(1500, 990, 0.6, c.t);
  }
  if (m === 'benjamina') {
    s += person({ x: 800, y: 965, s: 1.15, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [60, 30] });
    s += person({ x: 1000, y: 970, s: 0.75, t: c.t, seed: 31, face: 'happy', la: [-40, -20], ra: [14, 6] });
    s += person({ x: 1200, y: 965, s: 1.2, t: c.t, seed: 10, beard: true, hairC: C.hair2, flip: true, face: 'happy', la: [-14, -6], ra: [60, 30] });
    s += sparkle(1000, 420, c.t, 0.3, 0.9);
  }
  return s;
};
SCN.hospitalCamp = (c, o) => {
  let s = `<rect width="960" height="${H}" fill="#E6F0F2"/><rect y="820" width="960" height="260" fill="#C9D6DA"/>`;
  s += `<rect x="160" y="640" width="600" height="80" rx="12" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M200 720 V880 M720 720 V880" ${S} stroke-width="10"/><rect x="760" y="300" width="20" height="560" fill="#8B949B"/><rect x="700" y="300" width="80" height="120" rx="10" fill="#DCEFF3" ${S} stroke-width="4"/>`;
  s += g('translate(260 610) rotate(-10) scale(1.1)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + faceSvg('tired', c.t, 2)) + `<path d="M310 640 H700" stroke="#9FC4D2" stroke-width="60" stroke-linecap="round"/>`;
  let r = bgNight(c.t, { seed: 211 }) + `<ellipse cx="1440" cy="940" rx="420" ry="120" fill="#F28C28" opacity=".25"/>` + fire(1440, 960, 0.8, c.t);
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2], la: [-10, 30], ra: [40, 70] };
  r += person(Object.assign({ x: 1240, y: 980, s: 0.9, t: c.t, seed: 2, face: 'happy' }, sitP)) + person(Object.assign({ x: 1640, y: 980, s: 0.9, t: c.t, seed: 5, long: true, flip: true, face: 'laugh' }, sitP));
  s += `<g clip-path="url(#rhalf)">${r}</g><clipPath id="rhalf"><rect x="960" y="0" width="960" height="${H}"/></clipPath><path d="M960 0 V1080" stroke="${C.ink}" stroke-width="8" stroke-dasharray="30 20"/>`;
  return s;
};
SCN.socialChart = (c, o) => {
  let s = paper() + `<path d="M400 790 H1520" ${S} stroke-width="6"/>`;
  const p = eout(clamp(c.t / 0.9));
  s += `<rect x="560" y="${f1(790 - 260 * p)}" width="260" height="${f1(260 * p)}" fill="#C9C2B0" ${S} stroke-width="5"/><rect x="1100" y="${f1(790 - 400 * p)}" width="260" height="${f1(400 * p)}" fill="${C.green}" ${S} stroke-width="5"/>`;
  s += hand('WEAK TIES', 690, 860, 64, c.t, 0.2) + hand('STRONG TIES', 1230, 860, 64, c.t, 0.3) + hand('ABOUT 50% BETTER ODDS OF SURVIVAL', 960, 240, 72, c.t, 0.5, { col: C.green });
  return s;
};

SCN.birthDiagram = (c, o) => {
  const st = o.step || 1;
  let s = paper() + `<ellipse cx="960" cy="560" rx="300" ry="230" fill="none" stroke="#C99A7A" stroke-width="60"/><ellipse cx="960" cy="560" rx="300" ry="230" fill="none" ${S} stroke-width="5"/>`;
  const rot = st >= 2 ? eio(clamp(c.t / 1.2)) * 90 : 0;
  s += g(`translate(960 560) rotate(${f1(rot)})`, `<ellipse rx="190" ry="150" fill="#FFFFFF" ${S} stroke-width="6"/><circle cx="${st >= 3 ? -60 : 60}" cy="-10" r="10" fill="${C.ink}"/>`);
  if (st >= 2) s += `<path d="M1300 380 A220 220 0 0 1 1300 740" fill="none" stroke="${C.accent}" stroke-width="9" stroke-linecap="round"/><path d="M1280 720 L1300 750 L1330 726" fill="none" stroke="${C.accent}" stroke-width="9" stroke-linecap="round"/>`;
  s += hand(st === 1 ? 'BIG HEAD, NARROW PELVIS' : st === 2 ? 'THE BABY TURNS' : 'FACING AWAY', 960, 940, 80, c.t, 0.2, { col: C.text });
  return s;
};
SCN.dentistAncient = c => {
  let s = CAVE(c.t) + `<ellipse cx="960" cy="980" rx="560" ry="110" fill="#F28C28" opacity=".2"/>` + fire(1500, 990, 0.6, c.t);
  const sitP = { hip: 50, ll: [118, 8], rl: [106, -2] };
  s += person(Object.assign({ x: 760, y: 1000, s: 1.2, t: c.t, seed: 3, face: 'surprised', la: [-10, 30], ra: [40, 70] }, sitP));
  const sp = Math.sin(c.t * 16) * 20;
  s += person(Object.assign({ x: 1080, y: 1000, s: 1.15, t: c.t, seed: 10, beard: true, hairC: C.hair2, flip: true, face: 'think', la: [-10, 30], ra: [110, lerp(80, 110, 0.5 + sp / 40)],
    holdR: e => `<path d="M${f1(e[0] - 60)} ${f1(e[1])} Q${f1(e[0])} ${f1(e[1] + 30)} ${f1(e[0] + 60)} ${f1(e[1])}" fill="none" stroke="${C.wood}" stroke-width="8"/>` }, sitP));
  return s;
};
SCN.toothless = c => {
  let s = paper();
  s += g('translate(960 520) scale(3.2)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="3"/>` + hairCave(41, '#B9B2A6', false) + `<path d="M-48 2 Q-50 64 0 76 Q50 64 48 2 Q34 38 0 44 Q-34 38 -48 2 Z" fill="#B9B2A6" ${S} stroke-width="3"/><circle cx="-18" cy="5" r="5.5" fill="${C.ink}"/><circle cx="18" cy="5" r="5.5" fill="${C.ink}"/><path d="M-14 24 Q0 34 14 24 Q0 30 -14 24 Z" fill="#E07A7A" ${S} stroke-width="2.5"/>`);
  return s + hand('NO TEETH', 1500, 300, 110, c.t, 0.3, { col: C.accent });
};
SCN.bgCold = c => {
  let s = bgSnow(c.t, { seed: 213 }) + `<path d="M0 760 Q480 700 960 740 T1920 720 V1080 H0 Z" fill="#CFE6F2" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${200 + i * 300} 820 l60 30 l-40 40" fill="none" stroke="#9FC4D8" stroke-width="5"/>`;
  return s + snowfall(c.t, 60);
};

// ----- added for the full script -----
(() => {
  const obj = SC.objection;
  SC.objection = (c, o = {}) => {
    if (!o.l1) return obj(c, o);
    let s = paper();
    s += person({ x: 560, y: 985, s: 1.3, kind: 'modern', t: c.t, seed: 3, face: 'smug', shirt: '#7D8FA8', la: [-38, 32], ra: [110, 60 + Math.sin(c.t * 9) * 12] });
    s += pop(1240, 420, c.t, 0.0, `<path d="M-400 -170 H400 Q440 -170 440 -130 V130 Q440 170 400 170 H-160 L-300 260 L-250 170 H-400 Q-440 170 -440 130 V-130 Q-440 -170 -400 -170 Z" fill="#FFFFFF" ${S} stroke-width="6"/>`, 0.3);
    s += hand(o.l1, 1240, 380, 120, c.t, 0.05, { per: 0.03 }) + hand(o.l2 || '', 1240, 510, 96, c.t, 0.6, { per: 0.03, ls: 1 });
    return s;
  };
  const herbs = SCN.herbs;
  const vernonia = g('scale(1.3)', `<path d="M0 0 V-240" stroke="#6E8A4E" stroke-width="8"/>` + [0, 1, 2, 3].map(i => `<path d="M0 ${-60 - i * 45} q${i % 2 ? 60 : -60} -10 ${i % 2 ? 90 : -90} -40 q${i % 2 ? -50 : 50} 10 ${i % 2 ? -90 : 90} 40 Z" fill="#7FA34E" ${S} stroke-width="3"/>`).join('') + `<circle cx="0" cy="-250" r="16" fill="#B9A6D8" ${S} stroke-width="3"/>`);
  const willow = g('scale(1.2)', stick(0, 0, 0, -220, 18, C.woodD) + [-1, 1].map(k => `<path d="M0 -200 Q${k * 80} -260 ${k * 140} -200" fill="none" stroke="${C.woodD}" stroke-width="8"/>` + [0, 1, 2, 3].map(i => `<path d="M${k * (30 + i * 30)} ${-220 - i * 6} q${k * 6} 60 ${k * 2} 130" fill="none" stroke="#7FA34E" stroke-width="7" stroke-linecap="round"/>`).join('')).join(''));
  SCN.herbs = (c, o) => {
    if ((o.show || []).every(k => ['yarrow', 'chamomile', 'poplar', 'mould', 'fungus'].includes(k))) return herbs(c, o);
    const items = { vernonia: ['VERNONIA', vernonia], willow: ['WILLOW', willow], poplar: ['POPLAR', poplarBark(1.3)], yarrow: ['YARROW', yarrow(1.4)], chamomile: ['CHAMOMILE', chamomile(1.5)], mould: ['PENICILLIUM MOULD', mould(1.3)] };
    let s = paper(); const show = o.show, n = show.length;
    show.forEach((k, i) => { const x = 960 + (i - (n - 1) / 2) * 560, t0 = o.at ? o.at[i] : 0.1 + i * 0.3; s += pop(x, 760, c.t, t0, items[k][1]) + hand(items[k][0], x, 900, 70, c.t, t0 + 0.2); });
    if (o.title) s += hand(o.title, 960, 200, 100, c.t, 0.1, { col: C.accent });
    return s;
  };
  const otzi = SCN.otzi;
  SCN.otzi = (c, o) => {
    if (o.mode !== 'arrow') return otzi(c, o);
    let s = `<rect width="${W}" height="${H}" fill="#1E2C3E"/><rect x="200" y="120" width="1520" height="840" rx="20" fill="#24364C" stroke="#7FA3C4" stroke-width="5"/>`;
    s += `<ellipse cx="960" cy="300" rx="110" ry="130" fill="none" stroke="#EAF2F8" stroke-width="12" opacity=".8"/><path d="M960 430 V900" stroke="#EAF2F8" stroke-width="22" opacity=".8"/><path d="M600 900 Q600 520 960 480 Q1320 520 1320 900" fill="none" stroke="#EAF2F8" stroke-width="14" opacity=".8"/>`;
    for (let i = 0; i < 5; i++) s += `<path d="M960 ${600 + i * 60} Q${780 - i * 6} ${590 + i * 60} ${700 - i * 4} ${660 + i * 60} M960 ${600 + i * 60} Q${1140 + i * 6} ${590 + i * 60} ${1220 + i * 4} ${660 + i * 60}" fill="none" stroke="#EAF2F8" stroke-width="8" opacity=".6"/>`;
    s += `<path d="M640 520 L800 490" stroke="#EAF2F8" stroke-width="20" opacity=".8"/>`;
    s += pop(1180, 540, c.t, 0.3, g('rotate(200)', `<path d="M-30 -16 L44 0 L-30 16 Z" fill="#F7FBFE" stroke="${C.red}" stroke-width="6"/><circle r="70" fill="none" stroke="${C.red}" stroke-width="6" stroke-dasharray="14 10"/>`));
    return s + hand('ARROWHEAD', 1250, 300, 90, c.t, 0.4, { col: C.red });
  };
})();
SCN.pharmacy = c => {
  let s = `<rect width="${W}" height="${H}" fill="#EAF2F0"/><rect y="860" width="${W}" height="220" fill="#C9D6D2"/>`;
  for (let r = 0; r < 4; r++) s += `<rect x="160" y="${200 + r * 170}" width="1600" height="16" fill="#B9C6C2" ${S} stroke-width="4"/>`;
  const cols = ['#F2C443', '#C9573E', '#4F7FA8', '#7DAA5A', '#FFFFFF', '#E39A4C'];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 14; k++) { const h = 60 + ((r * 7 + k * 3) % 4) * 20, x = 200 + k * 112; s += `<rect x="${x}" y="${200 + r * 170 - h}" width="70" height="${h}" rx="8" fill="${cols[(r + k) % 6]}" ${S} stroke-width="3"/>`; }
  s += `<rect x="760" y="40" width="400" height="110" rx="14" fill="${C.green}" ${S} stroke-width="5"/><path d="M960 60 v70 M925 95 h70" stroke="#FFFFFF" stroke-width="22"/>`;
  return s;
};
SCN.clayLick = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${i * 240}" cy="${160 + (i % 2) * 60}" r="${170 + (i % 3) * 40}" fill="${i % 2 ? '#4F7A44' : '#5E8A4E'}"/>`;
  s += `<path d="M0 420 Q480 380 960 420 T1920 400 V1080 H0 Z" fill="#C98A5A" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M0 ${480 + i * 70} Q960 ${460 + i * 70} 1920 ${480 + i * 70}" fill="none" stroke="#B5764A" stroke-width="5"/>`;
  s += `<rect y="900" width="${W}" height="180" fill="#7FA9C0"/>`;
  const birds = [[400, 520, '#C9573E'], [600, 560, '#4F7FA8'], [820, 520, '#F2C443'], [1100, 580, '#C9573E'], [1350, 530, '#4F9A4A'], [1560, 570, '#4F7FA8']];
  birds.forEach(([x, y, col], i) => { const b = Math.sin(c.t * 6 + i) * 6; s += g(`translate(${x} ${f1(y + b)})`, `<ellipse cx="0" cy="0" rx="34" ry="50" fill="${col}" ${S} stroke-width="4"/><circle cx="-6" cy="-50" r="24" fill="${col}" ${S} stroke-width="4"/><path d="M-26 -50 Q-44 -40 -30 -30 Z" fill="#3C3F42" ${S} stroke-width="3"/><circle cx="-10" cy="-56" r="4" fill="${C.ink}"/><path d="M10 40 L20 110 L-10 110 Z" fill="${col}" ${S} stroke-width="3"/>`); });
  if (o.people) s += `<rect width="${W}" height="${H}" fill="${C.paper}" opacity=".6"/>` + g('translate(960 560) scale(1.6)', `<path d="M-90 60 L-70 -70 H70 L90 60 Z" fill="#FFFFFF" ${S} stroke-width="5"/><rect x="-80" y="-100" width="160" height="34" rx="8" fill="#B9C6C2" ${S} stroke-width="4"/><text x="0" y="20" font-family="Hand" font-size="44" text-anchor="middle" fill="${C.text}">KAOLIN</text>`);
  return s;
};
SCN.feverBody = (c, o) => {
  let s = CAVE(c.t, { night: true }) + `<ellipse cx="900" cy="960" rx="520" ry="120" fill="#F28C28" opacity=".22"/>` + fire(1350, 980, 0.8, c.t);
  s += `<path d="M560 940 Q600 880 900 890 Q1000 910 900 960 Q700 970 560 940 Z" fill="${C.tunic}" ${S} stroke-width="5"/>`;
  s += g('translate(520 900) rotate(-10) scale(1.3)', `<circle r="58" fill="${o.hot ? '#FFE2D6' : '#FFFFFF'}" ${S} stroke-width="5.5"/>` + hairCave(13, C.hair, false) + faceSvg('sick', c.t, 1));
  if (o.hot) { for (let i = 0; i < 3; i++) { const p = (c.t * 0.8 + i / 3) % 1; s += `<path d="M${470 + i * 50} ${f1(800 - p * 120)} q12 -16 0 -32 q-12 -16 0 -32" fill="none" stroke="${C.red}" stroke-width="6" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p))}"/>`; } s += g('translate(1500 360)', `<rect x="-24" y="-130" width="48" height="220" rx="24" fill="#FFFFFF" ${S} stroke-width="5"/><rect x="-12" y="${f1(-110 + 20 * Math.sin(c.t * 2))}" width="24" height="${f1(180 - 20 * Math.sin(c.t * 2))}" fill="${C.red}"/><circle cx="0" cy="100" r="40" fill="${C.red}" ${S} stroke-width="5"/>`); }
  return s;
};
SCN.lizard = (c, o) => {
  let s = bgSavanna({ seed: 221, sky: ['#9FCBE5', '#F6EBD2'], hills: '#D9C68E', ground: '#E2C27E', trees: false }) + rock(1100, 900, 360, 110, 7);
  if (o.sun) s += sun(1550, 220, 110, c.t) + `<path d="M1450 300 L1150 760" stroke="#FFE9A8" stroke-width="80" opacity=".35"/>`;
  const x = o.sun ? lerp(700, 1100, eout(clamp(c.t / Math.max(1, c.d * 0.8)))) : 700;
  s += g(`translate(${f1(x)} 800)`, `<path d="M-160 10 Q-260 0 -300 30" fill="none" stroke="${C.ink}" stroke-width="22" stroke-linecap="round"/><path d="M-160 10 Q-260 0 -300 30" fill="none" stroke="#9AAA4E" stroke-width="14" stroke-linecap="round"/><ellipse cx="0" cy="0" rx="170" ry="44" fill="#9AAA4E" ${S} stroke-width="5"/><ellipse cx="190" cy="-10" rx="60" ry="36" fill="#9AAA4E" ${S} stroke-width="5"/><circle cx="210" cy="-20" r="7" fill="${C.ink}"/><path d="M-100 30 l-30 40 M-40 36 l20 40 M60 34 l-20 40 M120 30 l30 40" ${S} stroke-width="9"/>` + [0, 1, 2, 3, 4].map(i => `<circle cx="${-120 + i * 55}" cy="${-14 + (i % 2) * 10}" r="9" fill="#7A8A3E"/>`).join(''));
  return s;
};
SCN.lifeSpan = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st <= 3) {
    s += hand(st === 1 ? '"THEY ONLY LIVED TO 30"' : 'AVERAGE = 30?', 960, 220, 100, c.t, st === 1 ? 0.1 : DONE, { col: C.text });
    for (let i = 0; i < 10; i++) {
      const x = 330 + i * 140, child = i < 4, old = i >= 6;
      s += pop(x, 700, c.t, st === 1 ? 0.2 + i * 0.05 : DONE, g(`scale(${child ? 0.32 : 0.45})`, person({ x: 0, y: 0, t: c.t, seed: i + 2, face: 'happy', hairC: old ? '#B9B2A6' : C.hair, la: [-14, -6], ra: [14, 6], bob: 0 })));
      if (st >= 2) s += `<text x="${x}" y="800" font-family="Hand" font-size="48" text-anchor="middle" fill="${C.text}">${child ? [0, 1, 3, 6][i] : [25, 40, 55, 62, 70, 76][i - 4]}</text>`;
      if (st >= 3 && child) s += `<rect x="${x - 60}" y="480" width="120" height="340" fill="#C9C2B0" opacity=".55"/>`;
    }
    if (st >= 3) s += hand('MANY CHILDREN DIED YOUNG', 960, 400, 70, c.t, 0.3, { col: C.red });
  } else {
    for (let i = 0; i < 6; i++) { const x = 460 + i * 200; s += pop(x, 720, c.t, st === 4 ? 0.1 + i * 0.08 : DONE, g('scale(.5)', person({ x: 0, y: 0, t: c.t, seed: i + 5, face: 'happy', hairC: st >= 5 ? '#B9B2A6' : C.hair, la: [-14, -6], ra: [14, 6], bob: 0 }))); }
    s += hand(st === 4 ? 'SURVIVED CHILDHOOD?' : '60s AND 70s', 960, 260, 120, c.t, 0.15, { col: st === 5 ? C.green : C.text });
  }
  return s;
};
SCN.papyrus = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E9D3A6"/>`;
  s += `<rect x="360" y="200" width="1200" height="680" fill="#F1E2B8" ${S} stroke-width="6"/><path d="M360 200 q-50 340 0 680 M1560 200 q50 340 0 680" fill="#D9C08A" ${S} stroke-width="6"/>`;
  const r = rng(91); let glyph = '';
  for (let row = 0; row < 6; row++) for (let k = 0; k < 14; k++) { const x = 440 + k * 76, y = 280 + row * 96, t = Math.floor(r() * 4); glyph += t === 0 ? `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#7A4A2A" stroke-width="5"/>` : t === 1 ? `<path d="M${x - 16} ${y + 14} L${x} ${y - 16} L${x + 16} ${y + 14}" fill="none" stroke="#7A4A2A" stroke-width="5"/>` : t === 2 ? `<path d="M${x - 18} ${y} q18 -24 36 0" fill="none" stroke="#7A4A2A" stroke-width="5"/>` : `<path d="M${x} ${y - 18} V${y + 18} M${x - 12} ${y - 6} h24" stroke="#7A4A2A" stroke-width="5"/>`; }
  s += `<g opacity=".85">${glyph}</g>`;
  if (o.honey) s += pop(1500, 760, c.t, 0.2, g('scale(.9)', `<path d="M-110 -110 H110 V100 Q110 140 70 140 H-70 Q-110 140 -110 100 Z" fill="#F2B533" ${S} stroke-width="5"/><rect x="-120" y="-140" width="240" height="40" rx="10" fill="#C9A35A" ${S} stroke-width="5"/>`)) + hand('HONEY FOR WOUNDS', 960, 980, 80, c.t, 0.4, { col: '#7A4A0A' });
  return s;
};
SCN.antStitch = (c, o) => {
  const st = o.step || 1;
  let s = paper() + `<path d="M200 740 Q960 600 1720 740 L1720 1080 L200 1080 Z" fill="#E8C6A6" ${S} stroke-width="6"/>`;
  s += `<path d="M760 760 Q960 720 1160 760" fill="none" stroke="#C9573E" stroke-width="${st >= 3 ? 4 : 10}" stroke-linecap="round"/>`;
  const ant = (x, y, sc, body = true) => g(`translate(${x} ${y}) scale(${sc})`, `<path d="M-50 -30 Q-20 0 -50 30 M50 -30 Q20 0 50 30" fill="none" ${S} stroke-width="10"/>` + `<circle cx="0" cy="0" r="30" fill="#5C2A1E" ${S} stroke-width="5"/>` + (body ? `<ellipse cx="0" cy="-70" rx="34" ry="44" fill="#6E3A28" ${S} stroke-width="5"/><ellipse cx="0" cy="-150" rx="46" ry="60" fill="#5C2A1E" ${S} stroke-width="5"/><path d="M-30 -80 l-60 -30 M30 -80 l60 -30 M-30 -60 l-60 10 M30 -60 l60 10" ${S} stroke-width="5"/>` : ''));
  if (st === 1) s += ant(960, f1(lerp(400, 690, eout(clamp(c.t / 1.0)))), 1.6);
  if (st === 2) s += ant(960, 730, 1.6) + `<path d="M900 680 l-20 -20 M1020 680 l20 -20" ${S} stroke-width="6"/>`;
  if (st === 3) { const p = clamp(c.t / 0.8); s += ant(960, 730, 1.6, false) + g(`translate(${f1(960 + p * 300)} ${f1(560 - p * 200)}) rotate(${f1(p * 90)})`, `<ellipse cx="0" cy="0" rx="34" ry="44" fill="#6E3A28" ${S} stroke-width="5"/>`); }
  if (st === 4) { [800, 880, 960, 1040, 1120].forEach((x, i) => { s += pop(x, 740, c.t, 0.05 + i * 0.1, g('scale(1.0)', `<path d="M-30 -18 Q-12 0 -30 18 M30 -18 Q12 0 30 18" fill="none" ${S} stroke-width="8"/><circle r="18" fill="#5C2A1E" ${S} stroke-width="4"/>`)); }); s += hand('ANT STITCHES', 960, 300, 110, c.t, 0.4, { col: C.accent }); }
  return s;
};
SCN.grandma = (c, o) => {
  const st = o.step || 1;
  let s = kalahari(c.t) + domeHut(1650, 680, 0.8);
  if (st === 1) {
    s += today(() => person({ x: 760, y: 965, s: 1.25, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: 'happy', la: [-14, -6], ra: [14, 6] }) + person({ x: 1000, y: 970, s: 0.65, t: c.t, seed: 9, face: 'laugh', la: [-150, -170], ra: [150, 170] }));
    s += hand('LONG LIVES AFTER CHILDREN', 960, 220, 90, c.t, 0.3, { col: C.text });
  }
  if (st >= 2) {
    const dig = Math.sin(c.t * 6) * 10;
    s += today(() => person({ x: 760, y: 965, s: 1.2, t: c.t, seed: 14, long: true, keepHair: true, hairC: '#B9B2A6', face: 'happy', hip: 60, ll: [112, 10], rl: [100, -4], la: [60, 100], ra: [80, 140 + dig], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} L${f1(e[0] + 120)} ${f1(e[1] + 220)}" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>` }));
    s += g('translate(980 1000) rotate(20)', `<ellipse rx="60" ry="26" fill="#B9764A" ${S} stroke-width="5"/>`);
  }
  if (st === 3) s += today(() => person({ x: 1250, y: 970, s: 0.7, t: c.t, seed: 9, face: 'laugh', la: [-14, -6], ra: [120, 150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(30)`, `<ellipse rx="40" ry="18" fill="#B9764A" ${S} stroke-width="4"/>`) }) + person({ x: 1400, y: 975, s: 0.6, t: c.t, seed: 12, face: 'happy', la: [-14, -6], ra: [14, 6] }));
  return s;
};

// Custom labels on the researcher scene, extra icons.
(() => {
  const res = SC.research;
  SC.research = (c, o) => {
    if (!o.text) return res(c, o);
    return res(c, Object.assign({}, o, { label: NEVER })) + hand(o.text, 1180, 200, 84, c.t, 0.1, { per: 0.03 });
  };
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'pill') return `<rect x="-90" y="-36" width="180" height="72" rx="36" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M0 -36 V36" ${S} stroke-width="4"/><path d="M0 -36 H54 A36 36 0 0 1 54 36 H0 Z" fill="#E39A4C" ${S} stroke-width="5"/>`;
    if (name === 'tar') return `<path d="M-80 -40 Q-90 80 0 90 Q90 80 80 -40 Z" fill="#B9764A" ${S} stroke-width="5"/><ellipse cx="0" cy="-40" rx="80" ry="22" fill="#1C1A18" ${S} stroke-width="5"/><path d="M-20 -30 q-10 40 6 70" fill="none" stroke="#1C1A18" stroke-width="12" stroke-linecap="round"/>`;
    return ic(name, t);
  };
})();
