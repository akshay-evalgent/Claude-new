// Scenes for the hook, "the enemy" and "sun and wind" chapters.
'use strict';

// ----- small shared pieces -----
function strata(x, y, w, h, layers) {
  let s = '', yy = y;
  layers.forEach(([hh, col]) => { s += `<rect x="${x}" y="${f1(yy)}" width="${w}" height="${f1(hh)}" fill="${col}"/>`; yy += hh; });
  return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${S} stroke-width="6"/>`;
}
function magnifier(x, y, r, inner) {
  return `<clipPath id="mag${x}${y}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><circle cx="${x}" cy="${y}" r="${r}" fill="#FFFDF5"/><g clip-path="url(#mag${x}${y})">${inner}</g>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="none" ${S} stroke-width="12"/><path d="M${f1(x + r * 0.7)} ${f1(y + r * 0.7)} L${f1(x + r * 1.25)} ${f1(y + r * 1.25)}" ${S} stroke-width="26"/>`;
}
function wrappedBone(s = 1, seed = 1) {
  const r = rng(seed);
  let fur = '';
  for (let i = 0; i < 14; i++) { const x = -70 + r() * 140, y = -26 + r() * 52; fur += `M${f1(x)} ${f1(y)} l${f1(4 + r() * 6)} ${f1(-8 - r() * 6)} `; }
  return g(`scale(${s})`, boneIcon(1) + `<path d="M-78 -30 Q0 -44 78 -30 L84 30 Q0 44 -84 30 Z" fill="#8A6440" ${S} stroke-width="5"/><path d="${fur}" stroke="#5E4128" stroke-width="3" stroke-linecap="round"/>`);
}
function stoneKnife(s = 1) { return g(`scale(${s})`, `<path d="M0 0 L70 -18 L96 0 L70 14 Z" fill="#9C978F" ${S} stroke-width="4"/><path d="M0 0 L-40 4" ${S} stroke-width="12" stroke="${C.woodD}"/>`); }
function bushEyes(x, y, s, t, i) {
  const blink = ((t + i * 0.7) % 2.6) < 0.12;
  return g(`translate(${x} ${y}) scale(${s})`, `<path d="${smooth(blobPts(140, 80, 9, 30 + i, 0.18))}" fill="#33402A" ${S} stroke-width="5"/>` +
    (blink ? '' : `<circle cx="-30" cy="-6" r="26" fill="url(#eyeglow)" opacity=".6"/><circle cx="30" cy="-6" r="26" fill="url(#eyeglow)" opacity=".6"/><ellipse cx="-30" cy="-6" rx="13" ry="9" fill="#FFE45C" ${S} stroke-width="3"/><ellipse cx="30" cy="-6" rx="13" ry="9" fill="#FFE45C" ${S} stroke-width="3"/><circle cx="-28" cy="-6" r="4" fill="${C.ink}"/><circle cx="32" cy="-6" r="4" fill="${C.ink}"/>`));
}
function smellWaves(x, y, t, n = 5, col = '#7E9A5A', spread = 1) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const p = (t * 0.45 + i / n) % 1, xx = x + (i - (n - 1) / 2) * 70 * spread * (1 + p), yy = y - p * 300;
    o += `<path d="M${f1(xx)} ${f1(yy)} q18 -22 0 -44 q-18 -22 0 -44" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" opacity="${f1(Math.sin(Math.PI * p) * 0.9)}"/>`;
  }
  return o;
}
const savSit = { hip: 60, ll: [112, 10], rl: [100, -4] };

// ----- hook -----
SCN.eatAll = c => {
  let s = bgSavanna({ seed: 51 });
  s += fire(1250, 930, 0.8, c.t);
  for (let i = 0; i < 5; i++) s += g(`translate(${760 + i * 40} ${960 - (i % 2) * 14}) rotate(${i * 37})`, boneIcon(0.3));
  const chew = Math.sin(c.t * 9) * 8;
  s += person(Object.assign({ x: 560, y: 960, s: 1.3, t: c.t, seed: 2, face: 'happy', la: [-20, 30], ra: [140, -100 + chew], armsFront: true,
    front: (L, R) => g(`translate(${f1(R[0] + 20)} ${f1(R[1])}) rotate(-30)`, meat(0.6, 3)) }, savSit));
  return s;
};
SCN.hungry = c => {
  let s = bgSavanna({ seed: 53, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
  s += person(Object.assign({ x: 860, y: 965, s: 1.3, t: c.t, seed: 3, face: 'sad', la: [20, 60], ra: [-10, -40] }, savSit));
  s += g('translate(1110 950)', bowl(0.8));
  const p = (c.t * 1.2) % 1;
  s += `<path d="M${f1(980 + p * 30)} 760 q12 -10 24 0 t24 0 t24 0" fill="none" ${S} stroke-width="5" opacity="${f1(Math.sin(Math.PI * p))}"/>`;
  return s + `<rect width="${W}" height="${H}" fill="#8C8270" opacity=".10"/>`;
};
SCN.dig = (c, o) => {
  let s = `<rect width="${W}" height="380" fill="#CFE3EA"/><rect y="370" width="${W}" height="710" fill="#C9A06A"/>`;
  s += strata(560, 470, 900, 520, [[110, '#B88C5A'], [90, '#A57C4F'], [120, '#946B43'], [100, '#7F5B3A'], [100, '#6E4F33']]);
  s += `<path d="M560 470 V990 M1460 470 V990" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${560 + i * 150} 380 V470" stroke="#9C7A55" stroke-width="5" stroke-dasharray="10 8"/>`;
  s += `<path d="M560 380 H1460" stroke="#E2D2B4" stroke-width="4"/>`;
  const f = o.found || 'bones';
  if (f === 'bones') { s += g('translate(820 760) rotate(-8)', boneIcon(0.7)) + g('translate(1180 860) rotate(14)', boneIcon(0.55)) + g('translate(1050 640) rotate(-30)', boneIcon(0.4)); }
  if (f === 'ash') { s += `<rect x="560" y="730" width="900" height="34" fill="#3E3A36"/>`; for (let i = 0; i < 14; i++) s += `<circle cx="${620 + i * 60}" cy="${746 + (i % 3) * 4}" r="${6 + (i % 4)}" fill="#1C1A18"/>`; }
  if (f === 'fish') { for (let i = 0; i < 30; i++) s += g(`translate(${640 + (i * 97) % 760} ${620 + (i * 53) % 300}) rotate(${(i * 47) % 180})`, `<path d="M-24 0 H24 M-14 -8 V8 M-4 -8 V8 M6 -8 V8 M16 -8 V8" stroke="#F3EAD6" stroke-width="3"/>`); }
  if (f === 'question') s += pop(1010, 700, c.t, 0.3, questionMark(320, Math.sin(c.t * 3) * 8, '#FFFFFF'));
  s += person({ x: 400, y: 600, s: 1.15, kind: 'research', t: c.t, seed: 4, face: f === 'nothing' || f === 'question' ? 'think' : 'surprised', ...{ hip: 60, ll: [112, 10], rl: [100, -4] },
    la: [40, 80], ra: [70, 100 + Math.sin(c.t * 10) * 10], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(${f1(-60 + Math.sin(c.t * 10) * 10)})`, `<path d="M0 0 L40 0" stroke="${C.woodD}" stroke-width="8" stroke-linecap="round"/><path d="M40 -10 h24 v20 h-24 Z" fill="#C9A35A" ${S} stroke-width="3"/>`) });
  return s;
};
SCN.boneSkin = (c, o) => {
  let s = paper();
  const m = o.mode || 'wrapped';
  if (m === 'wrapped') s += pop(960, 540, c.t, 0.05, g('rotate(-12)', wrappedBone(2.2, 3)));
  if (m === 'stack') {
    s += `<path d="M300 900 Q960 840 1620 900" fill="none" ${S} stroke-width="6"/>`;
    [[760, 820, -8], [1120, 830, 6], [940, 720, -3], [800, 640, 12], [1100, 640, -10]].forEach(([x, y, a], i) => { s += pop(x, y, c.t, 0.05 + i * 0.12, g(`rotate(${a})`, wrappedBone(1.1, i + 1))); });
  }
  if (m === 'cutmarks') {
    const bone = g('translate(960 560) scale(3.2)', boneIcon(1));
    let cuts = '';
    for (let i = 0; i < 9; i++) { const x = 760 + i * 46 + (i % 2) * 10, a = -30 + (i * 23) % 50; cuts += `<path d="M${x} 530 l${f1(Math.sin(a / 57) * 24)} 36" stroke="#5C2B1E" stroke-width="7" stroke-linecap="round"/>`; }
    s += magnifier(960, 520, 360, `<rect x="560" y="140" width="800" height="800" fill="#FFF8EA"/>` + bone + cuts);
    s += xmark(1440, 230, 90, c.t, o.x ?? NEVER);
  }
  if (m === 'open') {
    const p = eout(c.t / 0.5);
    const marrow = `<rect x="-200" y="-26" width="400" height="52" rx="26" fill="#F2B98C" ${S} stroke-width="4"/><path d="M-170 -6 q30 -10 60 0 t60 0 t60 0 t60 0" fill="none" stroke="#E08A5A" stroke-width="5"/>`;
    s += g(`translate(960 ${f1(540 - p * 90)}) rotate(${f1(-p * 8)})`, `<path d="M-260 -40 H260 V0 H-260 Z" fill="${C.bone}" ${S} stroke-width="6"/><circle cx="-270" cy="-30" r="34" fill="${C.bone}" ${S} stroke-width="6"/><circle cx="270" cy="-30" r="34" fill="${C.bone}" ${S} stroke-width="6"/>`);
    s += g('translate(960 560)', marrow);
    s += g(`translate(960 ${f1(580 + p * 90)}) rotate(${f1(p * 6)})`, `<path d="M-260 0 H260 V40 H-260 Z" fill="${C.bone}" ${S} stroke-width="6"/><circle cx="-270" cy="30" r="34" fill="${C.bone}" ${S} stroke-width="6"/><circle cx="270" cy="30" r="34" fill="${C.bone}" ${S} stroke-width="6"/>`);
    if (o.check) s += check(1450, 300, 1.2, c.t, 0.3);
  }
  return s;
};
SCN.trench = (c, o) => {
  const st = o.step || 1;
  let s = `<rect width="${W}" height="420" fill="#CFE3EA"/><rect y="400" width="${W}" height="680" fill="#9C7B55"/><path d="M0 410 H1920" ${S} stroke-width="5"/>`;
  s += `<rect x="0" y="300" width="${W}" height="110" fill="#8FB7C9"/><path d="M0 300 q60 -14 120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0 t120 0" fill="none" stroke="#FFFFFF" stroke-width="4"/>`;
  s += `<path d="M420 410 L460 820 H1460 L1500 410" fill="#5E432C" ${S} stroke-width="6"/>`;
  if (st >= 2) s += `<path d="M436 420 L474 806 H1446 L1484 420" fill="none" stroke="#7D7466" stroke-width="22"/><path d="M436 420 L474 806 H960" fill="none" stroke="#4A3A2C" stroke-width="22" stroke-dasharray="60 40"/>`;
  if (st >= 3) for (let i = 0; i < 26; i++) s += g(`translate(${560 + (i * 113) % 820} ${f1(780 - Math.floor(i / 7) * 80 - (i % 2) * 20)}) rotate(${(i * 31) % 40 - 20})`, fishShape(0.7, i % 2 ? '#9DB4C0' : '#B7C7CF'));
  if (st === 1) s += person({ x: 330, y: 420, s: 1.0, t: c.t, seed: 6, face: 'neutral', la: [40, 70], ra: [60, 100 + Math.sin(c.t * 6) * 15], holdR: e => spear(e[0], e[1], 50, 260, 0.2) });
  if (st >= 4) s += `<path d="M400 420 Q960 300 1520 420 Z" fill="#8C6C49" ${S} stroke-width="6"/>`;
  if (st >= 5) for (let i = 0; i < 8; i++) { const p = (c.t * 0.5 + i / 8) % 1; s += `<circle cx="${560 + (i * 131) % 800}" cy="${f1(780 - p * 340)}" r="${f1(8 + p * 6)}" fill="none" stroke="#DDEFF5" stroke-width="4" opacity="${f1(1 - p)}"/>`; }
  if (st >= 5) for (let i = 0; i < 5; i++) s += g(`translate(${620 + i * 170} ${700 - (i % 2) * 60})`, bug(0.5, 'good', c.t, i));
  return s;
};
function granaryShape(x, y, s, cut = false, fill = 0) {
  let o = '';
  for (const px of [-110, -40, 40, 110]) o += `<path d="M${px} 0 V-60" ${S} stroke="${C.woodD}" stroke-width="16"/>`;
  o += `<rect x="-150" y="-80" width="300" height="24" rx="6" fill="${C.wood}" ${S} stroke-width="5"/>`;
  o += `<path d="M-140 -80 V-300 Q0 -330 140 -300 V-80 Z" fill="#C9A274" ${S} stroke-width="6"/>`;
  if (!cut) for (let i = 0; i < 6; i++) o += `<path d="M-120 ${-110 - i * 34} h${60 + (i % 3) * 30}" stroke="#A9825A" stroke-width="5" stroke-linecap="round"/>`;
  else {
    o += `<path d="M-120 -86 V-290 Q0 -312 120 -290 V-86 Z" fill="#5C4430"/>`;
    for (let i = 0; i < 5; i++) o += `<path d="M${-110 + i * 50} -86 Q${-90 + i * 50} ${-150 - (i % 2) * 20} ${-70 + i * 50} -86 Z" fill="#E2C46E" ${S} stroke-width="3.5"/>`;
    o += `<path d="M-100 -150 Q-60 -200 -20 -150 Z M20 -150 Q60 -210 100 -150 Z" fill="#D9B45E" ${S} stroke-width="3.5"/>`;
  }
  o += `<path d="M-170 -296 Q0 -380 170 -296 Q0 -320 -170 -296 Z" fill="#9C8A5E" ${S} stroke-width="5"/>`;
  o += `<path d="M-30 -86 V-170 Q0 -190 30 -170 V-86 Z" fill="${cut ? 'none' : '#3B2A1C'}" ${S} stroke-width="5"/>`;
  return g(`translate(${x} ${y}) scale(${s})`, o);
}
SCN.granary = (c, o) => {
  const m = o.mode || 'plain', night = m === 'steal';
  let s = night ? bgNight(c.t, { seed: 61 }) : bgSavanna({ seed: 63, sky: ['#B9D7E6', '#F2EAD6'], hills: '#CDB58A', ground: '#D8BE8C', trees: false });
  if (!night) s += `<path d="M0 640 Q300 520 620 610 Q900 500 1260 600 Q1600 520 1920 610 V660 H0 Z" fill="#C2A577" opacity=".8"/>`;
  const gx = m === 'trade' || m === 'own' || m === 'guard' ? 1180 : 960;
  if (m === 'build') {
    const h = clamp(c.t / Math.max(1, c.d)) * 0.8 + 0.2;
    s += g(`translate(${gx} 940)`, `<clipPath id="bld"><rect x="-200" y="${f1(-420 * h)}" width="400" height="${f1(420 * h + 10)}"/></clipPath><g clip-path="url(#bld)">${granaryShape(0, 0, 1.6)}</g>`);
    s += person({ x: 600, y: 960, s: 1.1, t: c.t, seed: 2, face: 'happy', la: [140, 170], ra: [140, 170], holdR: e => `<ellipse cx="${f1(e[0] - 30)}" cy="${f1(e[1] - 30)}" rx="60" ry="34" fill="#9C978F" ${S} stroke-width="4"/>` });
  } else s += granaryShape(gx, 940, 1.6, m === 'inside');
  if (m === 'floor') s += arrow(1420, 760, 1160, 880, c.t, 0.2, 0.4, C.accent, 60) + hand('RAISED FLOOR', 1500, 700, 80, c.t, 0.3, { col: C.accent });
  if (m === 'air') s += g('translate(0 880)', windLines(c.t, 0, 3, W));
  if (m === 'rats') {
    const p = clamp(c.t / 0.8);
    s += g(`translate(${f1(lerp(1500, 1250, p))} 950)`, `<ellipse cx="0" cy="-24" rx="46" ry="26" fill="#8E8A86" ${S} stroke-width="4"/><circle cx="-44" cy="-34" r="16" fill="#8E8A86" ${S} stroke-width="4"/><circle cx="-50" cy="-38" r="3" fill="${C.ink}"/><path d="M46 -20 q40 0 60 -30" fill="none" ${S} stroke-width="4"/>`);
    s += xmark(1250, 900, 70, c.t, 0.9);
    for (let i = 0; i < 8; i++) { const p2 = (c.t * 1.4 + i / 8) % 1; s += `<path d="M${640 + i * 30} ${f1(300 + p2 * 500)} l-6 24" stroke="#7FB4D3" stroke-width="4" stroke-linecap="round" opacity="${f1(1 - p2)}"/>`; }
    s += `<path d="M560 520 Q960 380 1360 520" fill="none" stroke="#7FB4D3" stroke-width="10" stroke-dasharray="20 14"/>`;
  }
  if (m === 'own') s += person({ x: 760, y: 960, s: 1.25, t: c.t, seed: 2, face: 'smug', la: [-38, 32], ra: [60, 100] });
  if (m === 'guard') s += person({ x: 760, y: 960, s: 1.25, t: c.t, seed: 10, beard: true, hairC: C.hair2, face: 'worried', la: [-38, 32], ra: [26, 150], holdR: e => spear(e[0], e[1], 180, 380, 0.45) });
  if (m === 'steal') { const p = clamp(c.t / Math.max(1, c.d)); s += person({ x: lerp(1300, 1600, p), y: 960, s: 1.1, t: c.t, seed: 12, flip: true, face: 'smug', la: [-14, -6], ra: [120, 150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, bowl(0.6)) }); }
  if (m === 'trade') {
    s += person({ x: 560, y: 960, s: 1.15, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 20)} ${f1(e[1])})`, bowl(0.6)) });
    s += person({ x: 860, y: 960, s: 1.15, t: c.t, seed: 8, flip: true, face: 'happy', la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 20)} ${f1(e[1])})`, meat(0.4, 9)) });
  }
  return s;
};
SCN.jerkyShop = c => {
  let s = `<rect width="${W}" height="${H}" fill="#F3E8D2"/>`;
  for (let r = 0; r < 3; r++) s += `<rect x="200" y="${280 + r * 230}" width="1520" height="22" fill="#B79A72" ${S} stroke-width="5"/>`;
  const items = [['JERKY', '#B5473A'], ['SMOKED FISH', '#E39A4C'], ['PICKLES', '#7DAA5A'], ['CHEESE', '#F2C443'], ['DRIED FRUIT', '#C0587E'], ['YOGURT', '#EAF1F3']];
  items.forEach(([lab, col], i) => {
    const x = 380 + (i % 3) * 560, y = 280 + Math.floor(i / 3) * 230;
    s += pop(x, y, c.t, 0.05 + i * 0.12, `<rect x="-150" y="-170" width="300" height="170" rx="16" fill="${col}" ${S} stroke-width="5"/><rect x="-120" y="-120" width="240" height="70" rx="8" fill="#FFFDF7" ${S} stroke-width="3"/><text x="0" y="-72" font-family="Hand" font-size="${lab.length > 8 ? 40 : 52}" fill="${C.text}" text-anchor="middle">${lab}</text>`);
  });
  s += person({ x: 960, y: 1130, s: 1.2, kind: 'modern', t: c.t, seed: 3, face: 'happy', shirt: '#7D8FA8', la: [-20, -10], ra: [40, 100] });
  return s;
};

// ----- the enemy -----
SCN.clockMeat = c => {
  let s = bgSavanna({ seed: 71 });
  s += g('translate(1000 930) scale(1.6)', antelope(true, c.t));
  const mm = (c.t * 300) % 360;
  s += g('translate(1000 330)', `<circle r="150" fill="#F4EEDC" ${S} stroke-width="9"/><path d="M0 0 L0 -60" ${S} stroke-width="10" transform="rotate(${f1(c.t * 25)})"/><path d="M0 0 L0 -110" ${S} stroke-width="7" transform="rotate(${f1(mm)})"/><circle r="10" fill="${C.ink}"/>`);
  for (let i = 0; i < 2; i++) { const p = (c.t * 2 + i / 2) % 1; s += `<path d="M${1180 + p * 20} ${240 - p * 10} l30 -10" ${S} stroke-width="6" opacity="${f1(1 - p)}"/>`; }
  return s;
};
SCN.bacteria = (c, o) => {
  const m = o.mode;
  let s = paper();
  if (m === 'army' || m === 'eat' || m === 'poison') {
    s += g('translate(960 600) scale(3.2)', meat(1, 7, m === 'eat' ? lerp(0, 1, clamp(c.t / c.d)) > 0.5 ? '#9A7A4E' : C.meat : C.meat, 0, false));
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, R0 = 900, R1 = 210 + (i % 3) * 30, p = m === 'army' ? eout(clamp((c.t - i * 0.06) / 1.4)) : 1;
      const x = 960 + Math.cos(a) * lerp(R0, R1, p), y = 600 + Math.sin(a) * lerp(R0, R1, p) * 0.7;
      s += g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(Math.sin(c.t * 5 + i) * 8)})`, bug(0.7, 'bad', c.t, i));
    }
    if (m === 'eat') for (let i = 0; i < 6; i++) s += `<path d="M${800 + i * 60} ${560 + (i % 2) * 60} q10 -10 20 0" fill="none" ${S} stroke-width="4" opacity="${f1(0.5 + 0.5 * Math.sin(c.t * 10 + i))}"/>`;
    if (m === 'poison') for (let i = 0; i < 5; i++) { const p = (c.t * 0.5 + i / 5) % 1; s += `<circle cx="${760 + i * 100}" cy="${f1(500 - p * 300)}" r="${f1(30 + p * 40)}" fill="#9BC46A" opacity="${f1(0.5 * (1 - p))}"/>`; }
    if (m === 'poison') s += pop(1500, 300, c.t, 0.4, `<circle r="70" fill="#9BC46A" ${S} stroke-width="5"/><path d="M-26 -10 a12 12 0 1 0 0.1 0 M26 -10 a12 12 0 1 0 0.1 0" fill="${C.ink}"/><path d="M-20 30 h40" ${S} stroke-width="6"/>`);
  }
  if (m === 'spots') {
    const k = o.spot || 0;
    if (k === 0) s += g('translate(960 760) scale(1.6)', antelope(true, c.t)) + magnifier(1050, 420, 230, `<rect x="800" y="180" width="500" height="480" fill="#C98B4E"/>` + [0, 1, 2, 3].map(i => g(`translate(${960 + (i % 2) * 150} ${360 + Math.floor(i / 2) * 140})`, bug(0.8, 'bad', c.t, i))).join(''));
    if (k === 1) { s = `<rect width="${W}" height="${H}" fill="#CFE6F0"/>`; for (let i = 0; i < 10; i++) s += g(`translate(${f1(200 + (i * 173) % 1500 + Math.sin(c.t + i) * 40)} ${f1(200 + (i * 97) % 650 + Math.cos(c.t * 0.8 + i) * 30)}) rotate(${f1(c.t * 20 + i * 30)})`, bug(0.7, 'bad', c.t, i)); }
    if (k === 2) s += person({ x: 600, y: 1240, s: 2.2, t: c.t, seed: 2, face: 'neutral', la: [-14, -6], ra: [60, 120], bob: 0 }) + magnifier(1200, 500, 260, `<rect x="900" y="200" width="600" height="600" fill="#FFFFFF"/><path d="M900 640 Q1100 520 1500 560" fill="none" ${S} stroke-width="40"/>` + [0, 1, 2].map(i => g(`translate(${1080 + i * 120} ${520 + (i % 2) * 40})`, bug(0.6, 'bad', c.t, i))).join(''));
  }
  if (m === 'multiply') {
    const gen = Math.min(5, Math.floor(c.t / Math.max(0.35, c.d / 6)));
    const n = 2 ** gen;
    for (let i = 0; i < n; i++) { const cols = Math.ceil(Math.sqrt(n * 1.8)); s += g(`translate(${f1(960 + ((i % cols) - (cols - 1) / 2) * 120)} ${f1(560 + (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * 100)})`, bug(0.65, 'bad', c.t, i)); }
    s += g('translate(1660 220)', clock(0, 0, 90, 0, Math.floor(c.t * 40) % 60)) + hand('20 MIN', 1660, 400, 70, c.t, 0.1);
  }
  if (m === 'count') {
    const n0 = o.n0 || 1, n = c.t >= (o.at ?? 0.5) ? n0 * 2 : n0;
    const cols = Math.min(4, n);
    for (let i = 0; i < n; i++) s += g(`translate(${f1(960 + ((i % cols) - (cols - 1) / 2) * 200)} ${f1(560 + (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * 170)})`, bug(1.0, 'bad', c.t, i));
    s += `<text x="1700" y="300" font-family="Hand" font-size="140" fill="${C.accent}" text-anchor="middle">${n}</text>`;
    if (c.t >= (o.at ?? 0.5)) cue('pop', o.at ?? 0.5);
  }
  if (m === 'millions') {
    const r = rng(9);
    for (let i = 0; i < 160; i++) s += g(`translate(${f1(r() * 1920)} ${f1(r() * 1080)}) rotate(${f1(r() * 360 + c.t * 20)})`, bug(0.45, 'bad', c.t, i));
    s += hand('MILLIONS', 960, 600, 220, c.t, 0.2, { col: C.red });
  }
  if (m === 'secret') { s += g('translate(760 600)', bug(2.4, 'bad', c.t)); s += pop(1250, 380, c.t, 0.2, thought(0, 0, 260, 170, -280, 140) + `<path d="M0 -80 C-60 0 -60 70 0 70 C60 70 60 0 0 -80 Z" fill="#7FC0E8" ${S} stroke-width="5"/>`); }
  if (m === 'thirsty') {
    const p = clamp(c.t / c.d);
    s += g('translate(760 640)', bug(2.4, 'bad', c.t)) + `<path d="M860 660 q20 30 0 50" fill="#F08A9A" ${S} stroke-width="4"/>`;
    s += g(`translate(${f1(lerp(1150, 1500, p))} 560)`, `<path d="M0 -90 C-70 0 -70 80 0 80 C70 80 70 0 0 -90 Z" fill="#7FC0E8" ${S} stroke-width="6"/>`);
  }
  if (m === 'dry') {
    s += `<rect x="0" y="700" width="${W}" height="380" fill="#E2CFA2"/><path d="M200 800 l60 40 l-30 50 M700 760 l-40 60 l50 30 M1300 820 l50 30 l-20 60 M1600 760 l-60 40" fill="none" ${S} stroke-width="5"/>`;
    for (let i = 0; i < 4; i++) s += g(`translate(${560 + i * 270} ${720 - (i % 2) * 30}) rotate(${i % 2 ? 160 : 175})`, bug(1.1, 'dry', 0, i));
  }
  return s;
};
SCN.flyEggs = (c, o) => {
  const ph = o.phase;
  let s = bgSavanna({ seed: 73 }) + g('translate(1000 800) scale(2.6)', meat(1, 9, C.meat, 0, true));
  const n = 6;
  for (let i = 0; i < n; i++) {
    const landed = [900 + i * 50, 700 + (i % 2) * 40];
    let x, y;
    if (ph === 'arrive') { const p = eout(clamp(c.t / c.d)); x = lerp(1900 + i * 60, 1300 + i * 40, p) + Math.sin(c.t * 9 + i) * 20; y = lerp(200 + i * 40, 420 + i * 30, p) + Math.cos(c.t * 11 + i) * 20; }
    else if (ph === 'land') { const p = eout(clamp(c.t / Math.max(0.6, c.d * 0.8))); x = lerp(1300 + i * 40, landed[0], p); y = lerp(420 + i * 30, landed[1], p); }
    else { x = landed[0]; y = landed[1]; }
    if (ph !== 'hatch' || i < 3) s += g(`translate(${f1(x)} ${f1(y)}) scale(2)`, fly(0, 0, c.t, i));
  }
  if (ph === 'eggs' || ph === 'hatch') for (let i = 0; i < 18; i++) { const ex = 860 + (i * 37) % 300, ey = 760 + (i * 23) % 80; const show = ph === 'hatch' || c.t > i * 0.06; if (show) s += ph === 'hatch' ? `<path d="M${ex} ${ey} q8 ${f1(-6 + Math.sin(c.t * 12 + i) * 6)} 16 0" fill="none" stroke="#FFF8EA" stroke-width="7" stroke-linecap="round"/>` : `<ellipse cx="${ex}" cy="${ey}" rx="6" ry="3" fill="#FFF8EA" stroke="${C.ink}" stroke-width="1.5"/>`; }
  return s;
};
SCN.smell = (c, o) => {
  const m = o.mode;
  let s = bgSavanna({ seed: 75, sky: ['#E9A86F', '#F6D9AE'], hills: '#C79A6C', ground: '#D3AE74' });
  s += meatPile(960, 900, 1.0, 21);
  s += smellWaves(960, 760, c.t, 6, '#7E9A5A', m === 'beacon' ? 2.2 : 1);
  if (m === 'beacon') for (let i = 0; i < 3; i++) { const p = (c.t * 0.6 + i / 3) % 1; s += `<ellipse cx="960" cy="820" rx="${f1(200 + p * 900)}" ry="${f1(80 + p * 360)}" fill="none" stroke="#7E9A5A" stroke-width="8" opacity="${f1(0.7 * (1 - p))}"/>`; }
  const spots = [[220, 760, 1.0], [1700, 780, 1.0], [420, 640, 0.6], [1500, 640, 0.6], [960, 620, 0.5]];
  const n = m === 'eyes' ? (o.n || 1) : m === 'beacon' ? 5 : 0;
  spots.slice(0, n).forEach(([x, y, sc], i) => { s += pop(x, y, c.t, m === 'eyes' && i === n - 1 ? 0.2 : DONE, bushEyes(0, 0, sc, c.t, i)); });
  return s;
};
SCN.emptyHunt = (c, o) => {
  let s = bgSavanna({ seed: 77, sky: ['#D9D3C4', '#EEE8DA'], hills: '#D2C6A8', ground: '#DCC69A' });
  if (o.home) s += hut(1500, 650, 1.0) + person({ x: 1250, y: 940, s: 0.9, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'sad', la: [-14, -6], ra: [14, 6] }) + person({ x: 1370, y: 950, s: 0.6, t: c.t, seed: 9, face: 'sad', la: [-14, -6], ra: [14, 6] });
  const walk = o.home ? 0 : Math.sin(c.t * 8) * 18, x = o.home ? 760 : lerp(500, 900, clamp(c.t / c.d));
  s += person({ x, y: 960, s: 1.25, t: c.t, seed: 2, face: 'sad', ll: [-walk, -walk * 0.6], rl: [walk, walk * 0.6], la: [-14, -6], ra: [26, 150], holdR: e => spear(e[0], e[1], 180, 380, 0.45) });
  if (!o.home) { const p = (c.t * 0.4) % 1; s += g(`translate(${f1(1700 - p * 1500)} 930) rotate(${f1(-p * 720)})`, `<circle r="40" fill="none" stroke="#A88A5A" stroke-width="5" stroke-dasharray="14 8"/><circle r="22" fill="none" stroke="#A88A5A" stroke-width="4"/>`); }
  return s;
};
SCN.calendarHunt = (c, o) => {
  let s = paper() + `<rect x="460" y="190" width="1000" height="760" rx="20" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="460" y="190" width="1000" height="110" rx="20" fill="${C.red}" ${S} stroke-width="6"/>`;
  s += `<text x="960" y="272" font-family="Hand" font-size="80" fill="#FFFFFF" text-anchor="middle">${o.n === 2 ? 'ONE MONTH' : 'ONE WEEK'}</text>`;
  const days = o.n === 2 ? 28 : 7, rows = o.n === 2 ? 4 : 1, hit = (o.at ?? 0.6);
  for (let i = 0; i < days; i++) {
    const cx = 540 + (i % 7) * 140, cy = rows === 1 ? 600 : 380 + Math.floor(i / 7) * 150;
    s += `<rect x="${cx - 50}" y="${cy - 50}" width="100" height="100" rx="10" fill="#F5EEE0" ${S} stroke-width="3"/>`;
    const tx = (i / days) * hit;
    if (i < days - 1) { if (c.t > tx) s += `<path d="M${cx - 28} ${cy - 28} L${cx + 28} ${cy + 28} M${cx + 28} ${cy - 28} L${cx - 28} ${cy + 28}" stroke="${C.red}" stroke-width="7" stroke-linecap="round" opacity=".7"/>`; }
    else s += pop(cx, cy, c.t, hit, meat(0.42, 5));
  }
  return s;
};
SCN.feastFamine = (c, o) => {
  let s = paper() + `<path d="M260 900 H1700 M260 900 V180" ${S} stroke-width="6"/>` + hand('FOOD', 220, 160, 64, 1, DONE, { anchor: 'start' }) + hand('TIME', 1700, 960, 64, 1, DONE);
  const pts = [[260, 820], [500, 300], [740, 840], [980, 280], [1220, 850], [1460, 320], [1700, 860]];
  const step = o.step || 1, segs = Math.min(6, step + 1);
  for (let i = 0; i < segs; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], isNew = i === segs - 1 && step <= 4, L = Math.hypot(x2 - x1, y2 - y1), p = isNew ? clamp(c.t / 0.5) : 1;
    s += `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${C.ink}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f1(L)}" stroke-dashoffset="${f1(L * (1 - p))}"/>`;
  }
  for (let i = 1; i <= Math.min(step, 5); i++) {
    const [x, y] = pts[i], up = i % 2 === 1;
    s += pop(x, y + (up ? -90 : 90), c.t, i === step ? 0.35 : DONE, `<circle r="52" fill="${up ? '#FFE9A8' : '#E2DCD0'}" ${S} stroke-width="5"/>` + g('scale(.7)', faceSvg(up ? 'happy' : 'sad', 1, 1)));
  }
  if (step >= 5) { const p = clamp(c.t / 0.8); s += `<path d="M260 560 H${f1(260 + 1440 * p)}" stroke="${C.green}" stroke-width="12" stroke-linecap="round" stroke-dasharray="30 18"/>` + hand('STORED FOOD', 1300, 520, 80, c.t, 0.5, { col: C.green }); }
  return s;
};

// ----- sun and wind -----
SCN.sunSky = (c, o) => {
  let s = `<defs><linearGradient id="sks" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CCBEA"/><stop offset="1" stop-color="#F3F0DC"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sks)"/>`;
  s += `<circle cx="960" cy="380" r="300" fill="#FFF3B8" opacity=".55"/>` + sun(960, 380, 150, c.t * 3);
  s += `<path d="M0 900 Q480 860 960 890 T1920 880 V1080 H0 Z" fill="${C.sand}" ${S} stroke-width="5"/>` + acacia(300, 900, 0.8) + acacia(1650, 895, 0.6);
  if (o.cloud) { const p = eout(clamp(c.t / c.d)); s += g(`translate(${f1(lerp(-300, 960, p))} 400) scale(2.2)`, `<path d="${smooth([[-150, 20], [-130, -30], [-70, -50], [-30, -90], [40, -80], [80, -40], [140, -40], [170, 10], [120, 40], [-100, 40]])}" fill="#E8EEF2" ${S} stroke-width="4"/>`); }
  return s;
};
SCN.waterMeat = (c, o) => {
  let s = paper();
  s += g('translate(700 560) scale(3)', meat(1, 11, C.meat, 0, false));
  const lvl = o.drain ? lerp(0.75, 0.25, eout(clamp(c.t / c.d))) : 0.75;
  s += `<rect x="1300" y="${f1(820 - 560 * lvl)}" width="220" height="${f1(560 * lvl)}" fill="#7FC0E8"/><rect x="1300" y="260" width="220" height="560" rx="16" fill="none" ${S} stroke-width="7"/>`;
  s += `<text x="1410" y="${f1(800 - 560 * lvl + 90)}" font-family="Hand" font-size="70" fill="#FFFFFF" text-anchor="middle">${Math.round(lvl * 100)}%</text>` + hand('WATER', 1410, 900, 80, c.t, 0.1);
  if (o.drain) for (let i = 0; i < 7; i++) { const p = (c.t * 0.8 + i / 7) % 1; s += `<path d="M${f1(560 + i * 50)} ${f1(420 - p * 300)} C${f1(545 + i * 50)} ${f1(440 - p * 300)} ${f1(545 + i * 50)} ${f1(460 - p * 300)} ${f1(560 + i * 50)} ${f1(460 - p * 300)} C${f1(575 + i * 50)} ${f1(460 - p * 300)} ${f1(575 + i * 50)} ${f1(440 - p * 300)} ${f1(560 + i * 50)} ${f1(420 - p * 300)} Z" fill="#7FC0E8" ${S} stroke-width="3" opacity="${f1(1 - p)}"/>`; }
  if (o.fire) s += fire(700, 960, 0.9, c.t);
  return s;
};
SCN.cutStrips = (c, o) => {
  let s = bgSavanna({ seed: 81 });
  s += rock(1000, 900, 260, 70, 3);
  s += g('translate(1000 830) scale(1.4)', meat(1, 13, C.meat, 0, false));
  const n = Math.min(6, Math.floor(c.t * 3) + 1);
  for (let i = 0; i < n; i++) s += g(`translate(${1220 + i * 34} 850) rotate(${-80 + i * 3})`, strip(110, C.meat, 0, 24));
  const saw = Math.sin(c.t * 12) * 12;
  s += person(Object.assign({ x: 700, y: 960, s: 1.25, t: c.t, seed: 2, face: 'happy', la: [60, 80], ra: [70, 95 + saw], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(30)`, stoneKnife(1.0)) }, savSit));
  return s;
};
SCN.hangBranch = c => {
  let s = bgSavanna({ seed: 83 });
  s += g('translate(960 960) scale(2.4)', stick(0, 0, -6, -150, 12, C.woodD) + stick(-6, -130, -150, -200, 9, C.woodD) + stick(-6, -130, 140, -210, 9, C.woodD));
  for (let i = 0; i < 6; i++) { const t = i / 5, x = lerp(620, 1300, t), y = lerp(480, 470, t) - Math.sin(Math.PI * t) * 40; s += g(`translate(${f1(x)} ${f1(y)})`, strip(140 + (i % 3) * 20, C.meat, Math.sin(c.t * 2.4 + i) * 6)); }
  return s + windLines(c.t, 200, 3);
};
SCN.hangLine = c => {
  let s = bgSavanna({ seed: 85 });
  s += stick(400, 960, 410, 520, 10, C.wood) + stick(1520, 960, 1510, 520, 10, C.wood);
  s += `<path d="M410 540 Q960 600 1510 540" fill="none" stroke="#B9A06A" stroke-width="10"/><path d="M410 540 Q960 600 1510 540" fill="none" stroke="#8E7748" stroke-width="10" stroke-dasharray="6 10"/>`;
  for (let i = 0; i < 8; i++) { const t = (i + 0.5) / 8, x = lerp(410, 1510, t), y = 540 + Math.sin(Math.PI * t) * 60; s += g(`translate(${f1(x)} ${f1(y)})`, strip(150, C.meat, Math.sin(c.t * 2.2 + i) * 7)); }
  return s;
};
SCN.timelapse = (c, o) => {
  const day = o.day || 1, p = clamp(c.t / c.d);
  const a = Math.PI * (0.1 + 0.8 * p);
  let s = bgSavanna({ seed: 87, sky: [day % 2 ? '#9FD0E8' : '#F2B27A', '#F3EEDC'] });
  s += sun(f1(960 - Math.cos(a) * 800), f1(700 - Math.sin(a) * 520), 70, c.t);
  const dark = clamp((day - 1) / 3 + p * 0.3), len = lerp(170, 120, dark);
  const col = `rgb(${Math.round(lerp(185, 107, dark))},${Math.round(lerp(71, 45, dark))},${Math.round(lerp(58, 32, dark))})`;
  s += rack(1100, 930, 560, 400, c.t, { n: 7, col, wind: 0.8 });
  s += hand('DAY ' + day, 360, 230, 110, c.t, 0.05, { col: C.text });
  return s.replace(/strip\(\d+/g, m => m) ;
};
SCN.windStrips = c => {
  let s = bgSavanna({ seed: 89 });
  for (let i = 0; i < 5; i++) s += g(`translate(${560 + i * 200} 360)`, strip(260, C.meat, Math.sin(c.t * 4 + i) * 14 + 10, 40));
  s += stick(400, 360, 1520, 360, 10, C.wood);
  for (let i = 0; i < 10; i++) { const p = (c.t * 0.9 + i / 10) % 1; s += `<circle cx="${f1(580 + (i * 97) % 800 + p * 600)}" cy="${f1(560 + (i * 41) % 200 - p * 200)}" r="9" fill="#7FC0E8" ${S} stroke-width="2" opacity="${f1(1 - p)}"/>`; }
  return s + windLines(c.t, 200, 6);
};
SCN.stripHard = c => {
  let s = paper() + g('translate(960 260)', strip(520, '#6B2D20', 0, 90));
  const knock = Math.abs(Math.sin(c.t * 6));
  s += g(`translate(${f1(1250 - knock * 60)} 520)`, `<circle r="40" fill="#9C978F" ${S} stroke-width="5"/>`);
  if (knock > 0.9) s += hand('TOK!', 1420, 400, 110, c.t, DONE, { col: C.accent });
  return s + hand('HARD', 600, 560, 120, c.t, 0.2);
};
SCN.calendarFlip = (c, o) => {
  let s = paper();
  const n = Math.min(o.max || 99, 1 + Math.floor(Math.max(0, c.t) * (o.max ? 6 : 14)));
  s += g('translate(960 470) scale(2.4)', calendar(1, '', Math.min(99, n)));
  return s + hand(o.label || 'WEEKS', 960, 920, 130, c.t, 0.1, { col: C.accent });
};
