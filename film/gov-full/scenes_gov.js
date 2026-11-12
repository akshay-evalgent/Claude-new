// Scenes for "How Did Ancient Humans Live Without Government?". Builds on all earlier film libraries.
'use strict';

Object.assign(PLACES, {
  netherlands: [5.9, 51.98], florida: [-81.9, 26.6], mexico: [-98.84, 19.69], amazonia: [-63, -8], png: [144.5, -6.1],
  bonobo: [22, -1.5], nwcoast: [-127, 50.5],
});
Object.assign(REGIONS, {
  netherlands: { center: [5.5, 52], scale: 5200, hl: ['Netherlands'] },
  florida: { center: [-82.5, 27.5], scale: 2800, hl: ['United States of America'] },
  mexico: { center: [-99, 21], scale: 1500, hl: ['Mexico'] },
  amazonia: { center: [-62, -8], scale: 900, hl: ['Brazil'] },
  png: { center: [145, -6.5], scale: 2200, hl: ['Papua New Guinea'] },
  bonobo: { center: [22, -2], scale: 1500, hl: ['Dem. Rep. Congo'] },
  nwcoast: { center: [-126, 52], scale: 1500, hl: ['Canada'] },
  arctic: { center: [-95, 66], scale: 650, hl: ['Canada', 'Greenland'] },
});

// ---------- helpers ----------
function club(s = 1) { return g(`scale(${s})`, `<path d="M0 0 L20 -160 Q30 -200 60 -190 Q80 -170 50 -140 L16 4 Z" fill="#8E5A3A" ${S} stroke-width="5"/>`); }
function bubble(x, y, w, h, tx, ty, txt, col = C.text, size = 52) { return speech(x, y, w, h, tx, ty, hand(txt, x, y + size * 0.35, size, 1, DONE, { col })); }
function crowd(xs, y, s, t, o = {}) { return xs.map((x, i) => person(Object.assign({ x, y: y + (i % 2) * 14, s, t, seed: 3 + i * 4, face: o.face || 'happy', long: i % 3 === 1, hairC: i % 3 === 1 ? C.hair2 : C.hair, la: [-14, -6], ra: [14, 6], flip: x > 960 }, o.extra ? o.extra(i) : {}))).join(''); }
function hood(x, y, s = 1) { return `<circle cx="${x}" cy="${y}" r="${74 * s}" fill="#C9A06A" ${S} stroke-width="5"/><circle cx="${x}" cy="${y}" r="${74 * s}" fill="none" stroke="#F3EBDD" stroke-width="${10 * s}" stroke-dasharray="6 6"/>`; }
function smallHouse(x, y, s = 1, col = '#D9C2A0') { return g(`translate(${x} ${y}) scale(${s})`, `<rect x="-30" y="-24" width="60" height="40" fill="${col}" ${S} stroke-width="3"/><path d="M-36 -24 L0 -50 L36 -24 Z" fill="#B8956A" ${S} stroke-width="3"/>`); }

// ---------- modern ----------
SCN.govCity = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#CFE6F2"/><rect y="800" width="${W}" height="280" fill="#B8B2A8"/>`;
  s += `<rect x="560" y="420" width="800" height="380" fill="#F1E6CF" ${S} stroke-width="7"/><path d="M520 420 L960 260 L1400 420 Z" fill="#E6DCC4" ${S} stroke-width="7"/><path d="M760 300 Q960 120 1160 300 Z" fill="#9FB8C9" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="${610 + i * 110}" y="460" width="40" height="320" fill="#FBF6EC" ${S} stroke-width="4"/>`;
  s += `<path d="M960 120 V40" ${S} stroke-width="6"/><path d="M960 40 h80 v46 h-80 Z" fill="${C.red}" ${S} stroke-width="4"/>`;
  s += `<rect x="460" y="780" width="1000" height="30" fill="#D9CFBA" ${S} stroke-width="5"/>`;
  if (o.leader) s += `<rect x="900" y="690" width="120" height="110" fill="#8E5A3A" ${S} stroke-width="5"/>` + person({ x: 960, y: 700, s: 0.9, kind: 'modern', t: c.t, seed: 21, face: 'happy', shirt: '#2B3A55', la: [-14, -6], ra: [-120, -150] }) + crowd([300, 420, 1500, 1620], 1000, 0.8, c.t, { extra: () => ({ kind: 'modern', shirt: '#7D8FA8' }) });
  if (o.police) { const fl = Math.sin(c.t * 10) > 0; s += g('translate(1600 940)', `<rect x="-200" y="-90" width="400" height="100" rx="20" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="-120" y="-150" width="220" height="70" rx="14" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="-200" y="-50" width="400" height="24" fill="#2B5DA8"/><circle cx="-120" cy="20" r="34" fill="#2B2118"/><circle cx="120" cy="20" r="34" fill="#2B2118"/><rect x="-40" y="-176" width="36" height="24" rx="6" fill="${fl ? '#E0505A' : '#7A3A3A'}"/><rect x="4" y="-176" width="36" height="24" rx="6" fill="${fl ? '#3A4A7A' : '#4F8AE0'}"/>`) + person({ x: 300, y: 1000, s: 1.0, kind: 'modern', t: c.t, seed: 6, face: 'neutral', shirt: '#2B3A55', la: [-14, -6], ra: [14, 6] }); }
  return s;
};
SCN.lawBook = (c, o) => {
  let s = paper() + g('translate(760 560) scale(1.4)', `<rect x="-200" y="-260" width="400" height="520" rx="16" fill="#7A2B2B" ${S} stroke-width="7"/><rect x="-170" y="-230" width="340" height="460" fill="none" stroke="#E6C27A" stroke-width="5"/>` + hand('LAWS', 0, -60, 90, 1, DONE, { col: '#E6C27A' }) + `<rect x="-200" y="250" width="400" height="40" fill="#F3EBDD" ${S} stroke-width="5"/>`);
  if (o.pages) {
    s += pop(1300, 300, c.t, 0.1, `<circle r="90" fill="#FFFFFF" stroke="${C.red}" stroke-width="18"/><text x="0" y="24" font-family="Cap" font-size="70" text-anchor="middle" fill="${C.text}">30</text>`);
    s += pop(1560, 520, c.t, 0.4, `<rect x="-80" y="-80" width="160" height="160" rx="16" fill="#2B5DA8" ${S} stroke-width="6"/><text x="0" y="34" font-family="Cap" font-size="110" text-anchor="middle" fill="#FFFFFF">P</text>`);
    s += pop(1300, 780, c.t, 0.7, `<rect x="-110" y="-70" width="220" height="140" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-80 -30 H80 M-80 0 H80 M-80 30 H40" stroke="#B8AA8A" stroke-width="8"/>` + hand('PERMIT', 0, -80, 40, 1, DONE));
  }
  return s;
};
SCN.ballot = c => {
  let s = paper() + g('translate(960 680)', `<rect x="-220" y="-160" width="440" height="320" rx="16" fill="#3E7FA6" ${S} stroke-width="7"/><rect x="-120" y="-170" width="240" height="20" rx="8" fill="#2B2118"/>` + hand('VOTE', 0, 40, 90, 1, DONE, { col: '#FFFFFF' }));
  const p = clamp(c.t / 1.2);
  s += g(`translate(960 ${f1(lerp(240, 520, p))})`, `<rect x="-90" y="-120" width="180" height="200" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-50 -60 l20 20 l40 -50" fill="none" stroke="${C.green}" stroke-width="10"/>`);
  return s;
};

// ---------- the band ----------
SCN.bandCamp = (c, o) => {
  let s = kalahari(c.t, { sky: ['#E89A62', '#F6D7A8'], hills: '#C99A6A', ground: '#D8AE6E' }) + domeHut(260, 690, 0.9) + domeHut(1680, 680, 1.0) + `<ellipse cx="960" cy="920" rx="760" ry="170" fill="#F28C28" opacity=".18"/>` + fire(960, 920, 0.6, c.t);
  const seats = [[430, 960], [600, 1020], [780, 1050], [1140, 1050], [1320, 1020], [1490, 960], [560, 900], [1360, 900]];
  seats.forEach(([x, y], i) => {
    const talking = o.talk && (Math.floor(c.t * 0.8) % seats.length) === i;
    s += person({ x, y, s: y < 950 ? 0.75 : 0.95, t: c.t, seed: 3 + i * 4, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, face: o.fight && (i === 2 || i === 3) ? 'angry' : o.council ? 'neutral' : talking ? 'laugh' : 'happy', ...sit, la: [40, 80], ra: talking ? [-60 + Math.sin(c.t * 6) * 30, -120] : [40, 80], flip: x > 960 });
  });
  if (o.talk) s += pop(960, 360, c.t, 0.2, speech(0, 0, 360, 130, -80, 140, hand('LET\'S TALK', 0, 18, 56, 1, DONE)));
  if (o.fight) s += pop(960, 820, c.t, 0.2, `<path d="M-30 -60 L10 -10 L-10 -10 L30 50" fill="none" stroke="${C.red}" stroke-width="12" stroke-linecap="round"/>`);
  if (o.count) s += pop(960, 200, c.t, 0.2, `<rect x="-300" y="-60" width="600" height="100" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('A FEW DOZEN PEOPLE', 0, 20, 64, 1, DONE, { col: C.accent }));
  if (o.friends) s += [[430, 600], [600, 780], [1140, 1320], [1490, 1320]].map(([a, b], i) => `<path d="M${a} 880 Q${(a + b) / 2} ${780 - i * 10} ${b} 880" fill="none" stroke="${C.red}" stroke-width="5" stroke-dasharray="10 8" opacity=".8"/>`).join('') + hand('FRIENDS · IN-LAWS · FRIENDS OF FRIENDS', 960, 200, 60, c.t, 0.3);
  return s;
};
SCN.bully = (c, o) => {
  let s = kalahari(c.t) + domeHut(300, 690, 0.9) + domeHut(1650, 680, 1.0);
  const sw = Math.sin(c.t * 3) * 10;
  s += person({ x: 960, y: 1000, s: 1.9, t: c.t, seed: 21, beard: true, face: o.angry ? 'angry' : 'smug', la: [-14, -6], ra: [-120 + sw, -150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(${f1(20 + sw)})`, club(1.2)) });
  if (o.angry) s += `<rect width="${W}" height="${H}" fill="${C.red}" opacity=".08"/>`;
  const sm = o.cower ? { face: 'scared', la: [-40, -100], ra: [40, 100], armsFront: true } : { face: 'worried', la: [-14, -6], ra: [14, 6] };
  s += [[420, 0.9], [600, 0.75], [1340, 0.8], [1520, 0.95]].map(([x, k], i) => person(Object.assign({ x, y: 1000 + (o.cower ? 20 : 0), s: k, t: c.t, seed: 3 + i * 4, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, flip: x > 960 }, sm))).join('');
  return s;
};
SCN.walkAway = (c, o) => {
  let s = kalahari(c.t, { sky: ['#F2B27A', '#FBE3B5'], hills: '#C99A6A', ground: '#D8AE6E' });
  s += domeHut(260, 700, 0.9) + person({ x: 420, y: 1000, s: 1.3, t: c.t, seed: 21, beard: true, face: o.family ? 'sad' : 'angry', la: [-14, -6], ra: o.family ? [14, 6] : [-120, -150], holdR: o.family ? null : (e => g(`translate(${f1(e[0])} ${f1(e[1])})`, club(1))) });
  const walk = c.t * 70, k = Math.sin(c.t * 7) * 20;
  const walkers = o.family ? [[0, 1.1, 5, true], [130, 1.15, 2, false], [240, 0.65, 9, false], [330, 0.55, 12, true]] : [[0, 1.0, 5, true], [150, 1.05, 2, false], [290, 0.95, 8, true]];
  walkers.forEach(([dx, sc, sd, lg]) => { s += person({ x: 900 + dx + walk, y: 1000, s: sc, t: c.t, seed: sd, long: lg, hairC: lg ? C.hair2 : C.hair, face: 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-30, -40], ra: [30, 40], holdR: sc > 1 ? (e => `<ellipse cx="${f1(e[0] + 10)}" cy="${f1(e[1] - 20)}" rx="40" ry="30" fill="#A8743E" ${S} stroke-width="4"/>`) : null }); });
  s += arrow(1500, 760, 1800, 760, c.t, 0.2, 0.4, C.ink) + hand('NEW CAMP', 1700, 700, 56, c.t, 0.4);
  return s;
};

// ---------- apes ----------
SCN.chimpBoss = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9CF95"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#7FA86A' : '#6E9A5A'}"/>`).join('') + `<rect y="860" width="${W}" height="220" fill="#8C7A54"/>`;
  if (o.mike) {
    const ch = o.charge ? (c.t * 300) % 500 : 0, bang = Math.abs(Math.sin(c.t * 9));
    s += g(`translate(${f1(560 + ch)} 900) scale(.8)`, ape('chimp', c.t, {}));
    if (o.cans) s += [-1, 1].map(k => g(`translate(${f1(560 + ch + k * 120 * (0.6 + bang * 0.4))} 720)`, `<rect x="-36" y="-50" width="72" height="100" rx="6" fill="#B8BCC2" ${S} stroke-width="5"/><path d="M-36 -20 H36 M-36 20 H36" stroke="#8E9298" stroke-width="5"/>`)).join('');
    if (o.charge) for (let i = 0; i < 3; i++) s += `<path d="M${f1(400 + ch - i * 40)} ${760 + i * 40} h-120" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" opacity=".5"/>` + `<path d="M${f1(680 + ch)} ${640 - i * 30} l40 -20" stroke="${C.accent}" stroke-width="8" stroke-linecap="round"/>`;
    s += [[1300, 0.6], [1500, 0.65], [1680, 0.55]].map(([x, k]) => g(`translate(${x} ${o.bow ? 930 : 900}) scale(${k}) ${o.bow ? 'rotate(-20)' : ''}`, ape('chimp', c.t, {}))).join('');
    return s + hand('MIKE', 560 + ch, 260, 90, c.t, 0.2, { col: '#FFFFFF' });
  }
  if (o.allies) {
    s += g('translate(620 900) scale(.7)', ape('chimp', c.t, {})) + g('translate(820 900) scale(.65)', ape('chimp', c.t, {})) + `<path d="M700 720 Q720 680 760 720" fill="none" stroke="#3E342E" stroke-width="40" stroke-linecap="round"/>`;
    s += g(`translate(1320 ${o.topple ? 940 : 900}) rotate(${o.topple ? f1(Math.min(30, c.t * 30)) : 0}) scale(.95)`, ape('chimp', c.t, {}));
    return s + hand(o.topple ? 'TWO BEAT ONE' : 'ALLIANCES', 960, 200, 90, c.t, 0.3, { col: '#FFFFFF' });
  }
  if (o.groom) { s += g('translate(820 900) scale(.7)', ape('chimp', c.t, {})) + g('translate(1080 920) scale(.8) rotate(-10)', ape('chimp', c.t, {})) + pop(820, 560, c.t, 0.2, g('scale(.5)', icon('crown', c.t))) + `<path d="M900 720 q${f1(Math.sin(c.t * 4) * 10)} -20 60 0" fill="none" stroke="#3E342E" stroke-width="30" stroke-linecap="round"/>`; return s + hand('GROOMING, NOT FIGHTING', 960, 200, 80, c.t, 0.3, { col: '#FFFFFF' }); }
  s += g('translate(960 900) scale(1.0)', ape('chimp', c.t, {})) + pop(960, 420, c.t, 0.2, g('scale(.9)', icon('crown', c.t)));
  const others = [[400, 0.55], [600, 0.6], [1320, 0.6], [1520, 0.55]];
  s += others.map(([x, k]) => g(`translate(${x} ${o.bow ? 940 : 900}) scale(${k}) ${o.bow ? `rotate(${x < 960 ? 20 : -20})` : ''}`, ape('chimp', c.t, {}))).join('');
  if (o.bow) s += [[480, 640], [1440, 640]].map(([x, y]) => `<text x="${x}" y="${y}" font-family="Hand" font-size="50" fill="#FFFFFF" text-anchor="middle">uh-uh</text>`).join('');
  if (o.rank) s += [['1', 960, 300], ['2', 600, 600], ['3', 1320, 600], ['4', 400, 640], ['5', 1520, 640]].map(([n, x, y], i) => pop(x, y, c.t, 0.3 + i * 0.1, `<circle r="40" fill="#FFFFFF" ${S} stroke-width="4"/>` + hand(n, 0, 18, 52, 1, DONE))).join('');
  return s;
};

// ---------- levelling ----------
SCN.levelChart = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  const fig = (x, y, k, f = 'happy', boss = false) => g(`translate(${x} ${y}) scale(${k})`, `<circle cx="0" cy="-50" r="26" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M0 -24 V30 M0 30 l-16 40 M0 30 l16 40 M0 -10 l-24 20 M0 -10 l24 20" stroke="${C.ink}" stroke-width="7" stroke-linecap="round" fill="none"/>` + (boss ? g('translate(0 -96) scale(.4)', icon('crown', 0)) : ''));
  if (st === 1) {
    s += `<path d="M960 220 L1460 900 H460 Z" fill="#E9D3A6" ${S} stroke-width="6"/>` + fig(960, 330, 1.4, 'smug', true);
    for (let r = 0; r < 3; r++) for (let i = 0; i <= r + 1; i++) s += fig(960 - (r + 1) * 70 + i * 140, 500 + r * 140, 1.0);
    return s + hand('ONE BOSS ON TOP', 960, 160, 80, c.t, 0.2);
  }
  if (st === 2) return s + `<path d="M960 220 L1460 900 H460 Z" fill="#E9D3A6" ${S} stroke-width="6" transform="rotate(${f1(lerp(0, 180, eio(clamp(c.t / 1.2))))} 960 600)"/>` + hand('FLIP IT', 960, 160, 80, c.t, 0.2, { col: C.accent });
  s += `<path d="M460 300 H1460 L960 980 Z" fill="#E9D3A6" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 7; i++) s += fig(560 + i * 133, 360, 1.0, 'happy');
  s += fig(960, 880, 1.2, 'scared', true) + arrow(960, 470, 960, 760, c.t, 0.2, 0.5, C.red);
  return s + hand('THE GROUP RULES THE BOSS', 960, 180, 76, c.t, 0.3, { col: C.accent });
};
SCN.mockMeat = (c, o) => {
  let s = kalahari(c.t) + domeHut(260, 690, 0.9) + domeHut(1680, 680, 1.0);
  if (o.ox) s += g('translate(1200 900) scale(1.3)', `<path d="M-200 -40 Q-200 -170 -40 -180 Q140 -190 200 -110 Q220 -40 190 20 L-180 20 Q-210 0 -200 -40 Z" fill="#8E5A3A" ${S} stroke-width="6"/><path d="M190 -110 q50 -30 70 10 q-20 40 -70 30 M220 -140 q10 -30 40 -30 M200 -140 q-20 -30 -10 -50" fill="#8E5A3A" ${S} stroke-width="5"/><path d="M-160 20 v90 M-100 20 v90 M100 20 v90 M160 20 v90" ${S} stroke-width="16"/>`) + person({ x: 860, y: 1000, s: 1.2, kind: 'research', t: c.t, seed: 4, face: o.laugh ? 'laugh' : o.mock ? 'worried' : 'happy', la: [-14, -6], ra: [-80, -110] });
  else s += person({ x: 960, y: 1000, s: 1.4, t: c.t, seed: 3, face: o.mock ? 'worried' : o.laugh ? 'laugh' : 'happy', la: [-60, -100], ra: [60, 100], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 60)}) scale(.7)`, antelope(false, 0)) });
  const mockers = [[340, 'laugh'], [520, 'smug'], [1500, 'smug'], [1680, 'laugh']];
  mockers.forEach(([x, f], i) => { s += person({ x, y: 1000, s: 1.0, t: c.t, seed: 5 + i * 3, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, face: o.mock || o.laugh ? (o.laugh ? 'laugh' : f) : 'happy', la: [-14, -6], ra: o.mock ? [-80, -100] : [14, 6], flip: x > 960 }); });
  if (o.mock) { const lines = ['TOO THIN!', 'ALL BONES!', 'WORTHLESS!']; [[380, 520], [1640, 520], [960, 300]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.2 + i * 0.3, speech(0, 0, 300, 100, i === 2 ? 0 : (x < 960 ? 40 : -40), 120, hand(lines[i], 0, 18, 52, 1, DONE, { col: C.red }))); }); }
  if (o.laugh) s += pop(960, 260, c.t, 0.2, hand('HA HA HA', 0, 0, 100, 1, DONE, { col: C.accent }));
  return s;
};
SCN.quoteGov = (c, o) => {
  const lines = [['"When a young man kills much meat,'], ['he comes to think of himself as a chief or a big man,', 'and he thinks of the rest of us as his servants.', 'We can\'t accept this.'], ['So we always speak of his meat as worthless.'], ['This way we cool his heart and make him gentle."']];
  let s = paper();
  const part = o.part || 1;
  let y = 230;
  lines.forEach((ls, i) => { ls.forEach(ln => { if (i + 1 <= part) s += hand(ln, 960, y, 62, c.t, i + 1 === part ? 0.05 : DONE, { per: 0.02 }); y += 76; }); y += 30; });
  return s + hand('— TOMAZO, TO RICHARD LEE, 1960s', 1640, 900, 46, 1, DONE, { anchor: 'end', col: '#6E6A62' });
};
SCN.arrowLend = (c, o) => {
  let s = kalahari(c.t) + domeHut(300, 690, 0.9);
  const hunters = [[460, 3], [960, 8], [1460, 12]];
  hunters.forEach(([x, sd], i) => { s += today(() => person({ x, y: 1000, s: 1.15, t: c.t, seed: sd, face: 'happy', la: [-14, -6], ra: [-60, -90], flip: i === 2 })); });
  const arrowSvg = col => `<path d="M-60 0 H50" stroke="${C.woodD}" stroke-width="6"/><path d="M50 -10 L74 0 L50 10 Z" fill="#7E7A72" ${S} stroke-width="3"/><path d="M-60 0 l-14 -12 M-60 0 l-14 12" stroke="${col}" stroke-width="6"/>`;
  if (o.swap) [[460, 960, '#C0392B'], [960, 1460, '#3E7FA6'], [1460, 460, '#5E8A3C']].forEach(([a, b, col], i) => { const p = ((c.t * 0.5) + i / 3) % 1; s += g(`translate(${f1(lerp(a, b, p))} ${f1(620 - Math.sin(p * Math.PI) * 160)})`, arrowSvg(col)); });
  if (o.meat) s += g('translate(960 600)', meat(1.0, 7)) + pop(960, 470, c.t, 0.3, `<rect x="-200" y="-40" width="400" height="70" rx="12" fill="${C.paper}" ${S} stroke-width="4"/>` + hand('ARROW OWNER SHARES', 0, 12, 44, 1, DONE)) + g('translate(1460 620)', arrowSvg('#C0392B'));
  return s;
};
SCN.shareMeat = (c, o) => {
  let s = kalahari(c.t, { sky: ['#E89A62', '#F6D7A8'], hills: '#C99A6A', ground: '#D8AE6E' }) + `<path d="M760 900 V640 M1160 900 V640 M740 650 H1180" stroke="${C.woodD}" stroke-width="12" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) s += g(`translate(${800 + i * 85} 700) rotate(${-10 + i * 5})`, strip(150, '#7A2E22', Math.sin(c.t * 2 + i) * 3, 40));
  s += today(() => [[420, 'happy', 5], [600, 'laugh', 9], [1320, 'happy', 12], [1500, 'laugh', 2]].map(([x, f, sd], i) => person({ x, y: 1000, s: 1.0, t: c.t, seed: sd, long: i % 2 === 1, face: f, la: [-14, -6], ra: o.ask ? [-60, -80] : [14, 6], flip: x > 960 })).join(''));
  if (o.ask) s += pop(420, 560, c.t, 0.2, speech(0, 0, 280, 100, 30, 110, hand('MY SHARE?', 0, 18, 48, 1, DONE))) + pop(1500, 560, c.t, 0.5, speech(0, 0, 280, 100, -30, 110, hand('AND MINE!', 0, 18, 48, 1, DONE)));
  return s;
};
SCN.gossip = (c, o) => {
  let s = bandCamp0(c);
  if (o.chart) { const p = eout(clamp(c.t / 1.0)), a = p * (2 / 3) * Math.PI * 2; s += pop(1500, 360, c.t, 0.1, `<circle r="170" fill="#FFFFFF" ${S} stroke-width="6"/><path d="M0 0 L0 -170 A170 170 0 ${a > Math.PI ? 1 : 0} 1 ${f1(170 * Math.sin(a))} ${f1(-170 * Math.cos(a))} Z" fill="${C.accent}" ${S} stroke-width="5"/>`) + hand('~2/3 SOCIAL TALK', 1500, 600, 56, c.t, 0.5, { col: C.accent }); }
  const icons = [faceIcon('smug'), meat(0.4, 3), faceIcon('angry'), heart(0.6)];
  const pairs = o.spread ? [[430, 600], [600, 780], [780, 1140], [1140, 1320], [1320, 1490]] : [[430, 600], [1320, 1490]];
  pairs.forEach(([a, b], i) => { const p = ((c.t * 0.6) + i / pairs.length) % 1; s += g(`translate(${f1(lerp(a, b, p))} ${f1(640 - Math.sin(p * Math.PI) * 120)}) scale(.8)`, `<circle r="56" fill="#FFFFFF" ${S} stroke-width="4"/>` + icons[i % icons.length]); });
  return s;
};
function faceIcon(f) { return g('scale(.6)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5"/>` + faceSvg(f, 1, 3)); }
function bandCamp0(c) { return SCN.bandCamp(c, {}); }
SCN.songDuel = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#CFE2EE"/><rect y="760" width="${W}" height="320" fill="#F3F7FA"/>` + `<path d="M120 760 Q300 520 480 760 Z" fill="#FFFFFF" ${S} stroke-width="6"/><path d="M1440 760 Q1620 520 1800 760 Z" fill="#FFFFFF" ${S} stroke-width="6"/>`;
  const drum = (x, flip) => g(`translate(${x} 720) scale(${flip ? -1 : 1} 1)`, `<ellipse cx="80" cy="0" rx="20" ry="80" fill="#E8D6A6" ${S} stroke-width="5"/><path d="M80 80 v60" ${S} stroke-width="8"/>`);
  [[700, false, 'laugh'], [1220, true, 'smug']].forEach(([x, fl, f], i) => {
    const sing = o.sing && Math.floor(c.t) % 2 === i;
    s += hood(x, 1000 - 354 * 1.4, 1.4) + person({ x, y: 1000, s: 1.4, kind: 'modern', shirt: '#C9A06A', t: c.t, seed: 4 + i * 6, face: sing ? 'laugh' : f, la: [-14, -6], ra: [70, 120], flip: fl }) + drum(x, fl);
    if (sing) for (let k = 0; k < 3; k++) { const p = (c.t * 0.8 + k / 3) % 1; s += `<text x="${f1(x + (fl ? -1 : 1) * (80 + p * 220))}" y="${f1(520 - p * 200)}" font-family="Hand" font-size="70" fill="#3E7FA6" opacity="${f1(1 - p)}">♪</text>`; }
  });
  if (o.crowd) s += [300, 420, 1500, 1620].map((x, i) => hood(x, 1040 - 354 * 0.85, 0.85) + person({ x, y: 1040, s: 0.85, kind: 'modern', shirt: '#B8956A', t: c.t, seed: 2 + i * 3, face: 'laugh', la: [-14, -6], ra: [14, 6], flip: x > 960 })).join('') + hand('HA HA!', 960, 220, 90, c.t, 0.3, { col: C.accent });
  return s;
};
SCN.calmChart = (c, o) => {
  const st = o.step || 1;
  let s = paper() + hand('FIGHTS WITHIN THE GROUP', 960, 200, 80, c.t, DONE);
  s += g('translate(620 620) scale(.75)', ape('chimp', c.t, {})) + person({ x: 1300, y: 780, s: 1.0, t: c.t, seed: 4, face: 'happy', la: [-14, -6], ra: [14, 6] });
  if (st >= 2) {
    const p = eout(clamp(c.t / 1.0));
    s += `<rect x="520" y="${f1(840 - 0)}" width="200" height="${f1(0)}"/>`;
    for (let i = 0; i < Math.floor(24 * p); i++) s += `<path d="M${470 + (i % 6) * 50} ${900 + Math.floor(i / 6) * 40} l20 -20 l10 14 l20 -20" fill="none" stroke="${C.red}" stroke-width="6"/>`;
    s += `<path d="M1270 900 l20 -20 l10 14 l20 -20" fill="none" stroke="${C.red}" stroke-width="6" opacity="${f1(p)}"/>` + hand('FAR MORE', 620, 860, 60, c.t, 0.5, { col: C.red }) + hand('FAR FEWER', 1300, 860, 60, c.t, 0.6, { col: C.green });
  }
  return s;
};

// ---------- not all equal; seasons ----------
SCN.calusa = c => {
  let s = `<rect width="${W}" height="${H}" fill="#BFE3F2"/><rect y="640" width="${W}" height="440" fill="#5EA8C9"/>`;
  s += `<path d="M300 700 Q960 380 1620 700 Z" fill="#E6DCC4" ${S} stroke-width="6"/>` + g('translate(960 430)', `<rect x="-160" y="-120" width="320" height="140" fill="#B8956A" ${S} stroke-width="5"/><path d="M-190 -120 L0 -220 L190 -120 Z" fill="#9C7A55" ${S} stroke-width="5"/>`);
  s += person({ x: 960, y: 480, s: 0.8, t: c.t, seed: 21, beard: true, face: 'smug', la: [-14, -6], ra: [14, 6], front: () => g('translate(0 -400) scale(.5)', icon('crown', 0)) });
  for (let i = 0; i < 3; i++) { const x = 300 + i * 500 + Math.sin(c.t + i) * 30; s += g(`translate(${f1(x)} 900)`, `<path d="M-160 0 Q0 40 160 0 L140 30 Q0 60 -140 30 Z" fill="#8E5A3A" ${S} stroke-width="5"/>` + fishShape(0.6) + `<ellipse cx="80" cy="-10" rx="30" ry="18" fill="#E6C27A" ${S} stroke-width="3"/>`) + person({ x: x - 80, y: 900, s: 0.6, t: c.t, seed: 3 + i * 3, face: 'neutral', la: [-14, -6], ra: [60, 100] }); }
  return s + hand('TRIBUTE FOR THE KING', 960, 120, 80, c.t, 0.3);
};
SCN.potlatch = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#BFD3DE"/><rect y="780" width="${W}" height="300" fill="#7FA34E"/>` + [...Array(10)].map((_, i) => `<path d="M${i * 200} 780 l60 -280 l60 280 Z" fill="#3E5A3A"/>`).join('');
  s += `<rect x="560" y="420" width="800" height="380" fill="#9C7A55" ${S} stroke-width="7"/><path d="M520 430 L960 300 L1400 430 Z" fill="#8E6A4A" ${S} stroke-width="7"/><path d="M760 520 q200 -100 400 0 q-200 120 -400 0 Z" fill="none" stroke="#C0392B" stroke-width="12"/><rect x="900" y="640" width="120" height="160" fill="#2B2118"/>`;
  s += g('translate(400 800)', `<rect x="-40" y="-480" width="80" height="480" fill="#B8956A" ${S} stroke-width="5"/>` + [0, 1, 2].map(i => `<circle cx="0" cy="${-420 + i * 150}" r="50" fill="${['#C0392B', '#2B5DA8', '#5E8A3C'][i]}" ${S} stroke-width="5"/><circle cx="-16" cy="${-430 + i * 150}" r="8" fill="#FFFFFF"/><circle cx="16" cy="${-430 + i * 150}" r="8" fill="#FFFFFF"/>`).join(''));
  s += person({ x: 960, y: 1000, s: 1.2, t: c.t, seed: 21, face: 'laugh', beard: true, la: [-14, -6], ra: [-60, -90] });
  if (o.give) { for (let i = 0; i < 4; i++) { const p = ((c.t * 0.6) + i / 4) % 1, tx = i % 2 ? 1500 : 400; s += g(`translate(${f1(lerp(1040, tx, p))} ${f1(760 - Math.sin(p * Math.PI) * 200)})`, `<rect x="-50" y="-30" width="100" height="60" fill="${['#C0392B', '#2B5DA8', '#E6C27A', '#5E8A3C'][i]}" ${S} stroke-width="4"/>`); } s += crowd([300, 460, 1460, 1620], 1020, 0.8, c.t, { face: 'surprised' }); }
  return s + hand('GIVING IT ALL AWAY', 960, 160, 80, c.t, 0.3);
};
SCN.seasons = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 2) {
    const on = Math.floor(c.t * 0.8) % 2 === 0;
    s += g('translate(960 560)', `<rect x="-260" y="-120" width="520" height="240" rx="120" fill="${on ? '#5E8A3C' : '#C9C2B0'}" ${S} stroke-width="8"/><circle cx="${on ? 140 : -140}" cy="0" r="100" fill="#FFFFFF" ${S} stroke-width="6"/>`) + hand(on ? 'POWER: ON' : 'POWER: OFF', 960, 260, 96, c.t, DONE, { col: on ? C.green : '#6E6A62' });
    return s;
  }
  const left = st === 3 ? 'SUMMER: SMALL FAMILY GROUPS' : 'MOST OF THE YEAR: SMALL BANDS', right = st === 3 ? 'WINTER: BIG GATHERINGS' : 'SUMMER HUNT: BIG CAMP';
  s += `<circle cx="560" cy="580" r="300" fill="#F6E1B5" ${S} stroke-width="6"/><circle cx="1360" cy="580" r="300" fill="${st === 3 ? '#DCEAF2' : '#F2C08A'}" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 3; i++) s += g(`translate(${460 + i * 100} ${560 + (i % 2) * 60}) scale(.5)`, `<path d="M-60 60 L0 -60 L60 60 Z" fill="#B8956A" ${S} stroke-width="6"/>`);
  if (st === 3) s += g('translate(1360 600)', `<path d="M-200 80 Q0 -180 200 80 Z" fill="#FFFFFF" ${S} stroke-width="6"/><rect x="-30" y="20" width="60" height="60" fill="#2B2118"/>`);
  else for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += g(`translate(${f1(1360 + Math.cos(a) * 190)} ${f1(600 + Math.sin(a) * 150)}) scale(.35)`, `<path d="M-60 60 L0 -60 L60 60 Z" fill="#B8956A" ${S} stroke-width="8"/>`); }
  return s + hand(left, 560, 200, 46, c.t, 0.2) + hand(right, 1360, 200, 46, c.t, 0.4);
};
function bison(s = 1, t = 0) { const k = Math.sin(t * 6) * 8; return g(`scale(${s})`, `<path d="M-150 0 Q-150 -120 -20 -140 Q60 -160 120 -110 Q170 -60 150 0 Z" fill="#5C3A22" ${S} stroke-width="5"/><path d="M110 -100 Q190 -90 180 -20 Q150 10 120 -10" fill="#5C3A22" ${S} stroke-width="5"/><path d="M-120 0 l${f1(-k)} 70 M-70 0 l${f1(k)} 70 M80 0 l${f1(-k)} 70 M120 0 l${f1(k)} 70" ${S} stroke-width="12"/><path d="M150 -110 q10 -20 0 -30" fill="none" stroke="#E9DFC8" stroke-width="7"/>`); }
SCN.bisonHunt = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#BFE3F2"/><path d="M0 640 Q480 600 960 620 T1920 610 V1080 H0 Z" fill="#C9B26A"/>`;
  const run = o.herd ? c.t * 40 : 0;
  for (let i = 0; i < 9; i++) s += g(`translate(${f1(900 + (i % 3) * 220 + Math.floor(i / 3) * 90 - run)} ${700 + Math.floor(i / 3) * 70})`, bison(0.6 - Math.floor(i / 3) * 0.05 + 0.15, c.t + i));
  s += [[300, 0.9], [440, 0.85]].map(([x, k], i) => person({ x, y: 1000, s: k, t: c.t, seed: 4 + i * 5, face: 'think', la: [-14, -6], ra: [-80, -110], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} l120 -60" stroke="${C.woodD}" stroke-width="7"/>` })).join('');
  if (o.police) {
    s += person({ x: 700, y: 1010, s: 1.1, t: c.t, seed: 21, face: 'angry', la: [-14, -6], ra: [-120, -150], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} l0 -160" stroke="${C.woodD}" stroke-width="10"/>`, front: () => `<path d="M-40 -260 L40 -180" stroke="${C.red}" stroke-width="14"/>` });
    s += person({ x: 1700, y: 1000, s: 0.9, t: c.t, seed: 9, face: 'scared', la: [-150, -170], ra: [14, 6], flip: true }) + xmark(1700, 600, 70, c.t, 0.3);
    s += pop(700, 300, c.t, 0.2, `<rect x="-260" y="-60" width="520" height="100" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('CAMP POLICE', 0, 16, 64, 1, DONE, { col: C.red }));
  }
  return s;
};

// ---------- states ----------
SCN.granaryKing = (c, o) => {
  let s = kalahari(c.t, { sky: ['#9FCBE5', '#F6EBD2'], hills: '#D9C68E', ground: '#D8B87A', trees: false });
  s += g('translate(960 800)', `<rect x="-300" y="-260" width="600" height="300" fill="#C9A97A" ${S} stroke-width="7"/><path d="M-340 -260 L0 -400 L340 -260 Z" fill="#B8956A" ${S} stroke-width="7"/><rect x="-60" y="-140" width="120" height="180" fill="#5C4430" ${S} stroke-width="5"/>`);
  for (let i = 0; i < 6; i++) s += g(`translate(${560 + (i % 3) * 70} ${930 - Math.floor(i / 3) * 60})`, `<path d="M-34 30 Q-40 -20 -20 -34 L20 -34 Q40 -20 34 30 Z" fill="#E6D3A0" ${S} stroke-width="4"/>`);
  if (o.guard) s += person({ x: 1360, y: 1000, s: 1.2, t: c.t, seed: 21, face: 'angry', beard: true, la: [-14, -6], ra: [-120, -150], holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])})`, spear(0, 0, 0, 260, 0.5)) }) + person({ x: 1560, y: 1000, s: 1.0, kind: 'modern', shirt: '#E8DCC0', t: c.t, seed: 6, face: 'think', la: [60, 100], ra: [40, 90], armsFront: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 20)})`, `<rect x="-36" y="-28" width="72" height="56" rx="8" fill="#C9A06A" ${S} stroke-width="3"/>`) }) + hand('COUNTED · GUARDED · TAXED', 960, 180, 70, c.t, 0.3);
  return s;
};
SCN.uruk = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F2D9A6"/><rect y="760" width="${W}" height="320" fill="#D9B98A"/>`;
  s += `<path d="M120 860 V520 H1800 V860" fill="none" stroke="#B8956A" stroke-width="40"/>`;
  s += g('translate(960 560)', `<rect x="-260" y="-60" width="520" height="140" fill="#C9A97A" ${S} stroke-width="6"/><rect x="-180" y="-170" width="360" height="110" fill="#C9A97A" ${S} stroke-width="6"/><rect x="-100" y="-260" width="200" height="90" fill="#D9C2A0" ${S} stroke-width="6"/>`);
  const r = rng(5); for (let i = 0; i < 60; i++) s += smallHouse(160 + r() * 1600, 640 + r() * 180, 0.8 + r() * 0.4);
  if (o.crowd) for (let i = 0; i < 30; i++) s += person({ x: 160 + r() * 1600, y: 900 + r() * 140, s: 0.35, kind: 'modern', shirt: '#E8DCC0', t: c.t, seed: i, face: 'neutral', la: [-14, -6], ra: [14, 6] });
  return s + hand('URUK', 960, 160, 100, c.t, 0.2);
};
SCN.king = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E8D6B8"/>`;
  if (o.heaven) for (let i = 0; i < 9; i++) s += `<path d="M960 -100 L${f1(560 + i * 100)} 700" stroke="#FFF3C4" stroke-width="40" opacity=".5"/>`;
  s += `<rect x="760" y="560" width="400" height="440" rx="20" fill="#B8956A" ${S} stroke-width="7"/><rect x="800" y="380" width="320" height="220" rx="20" fill="#C0392B" ${S} stroke-width="7"/>`;
  s += person({ x: 960, y: 900, s: 1.3, kind: 'modern', shirt: '#7A2B5A', t: c.t, seed: 21, face: 'smug', beard: true, ...sit, la: [40, 80], ra: [-90, -120], holdR: e => `<path d="M${f1(e[0])} ${f1(e[1])} l0 -200" stroke="#E6B33C" stroke-width="12"/>`, front: () => g('translate(0 -440) scale(.55)', icon('crown', 0)) });
  return s + (o.heaven ? hand('"KINGSHIP DESCENDED FROM HEAVEN"', 960, 160, 64, c.t, 0.3) : '');
};
SCN.lawStele = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) return s + g('translate(960 560) scale(1.8)', `<rect x="-190" y="-150" width="380" height="300" rx="40" fill="#C9A06A" ${S} stroke-width="5"/>` + cuneiform(48, c.t, 0.1)) + hand('UR · ~4,100 YEARS AGO', 960, 150, 76, c.t, 0.3);
  s += `<path d="M760 1000 Q740 320 800 160 Q960 80 1120 160 Q1180 320 1160 1000 Z" fill="#2B2B30" ${S} stroke-width="7"/>`;
  s += person({ x: 900, y: 420, s: 0.6, kind: 'modern', shirt: '#4A4A50', t: 1, seed: 21, face: 'neutral', beard: true, la: [-14, -6], ra: [-60, -100] }).replace(/#FFFFFF/g, '#5A5A62') + person({ x: 1030, y: 420, s: 0.65, kind: 'modern', shirt: '#4A4A50', t: 1, seed: 6, face: 'neutral', beard: true, ...sit, la: [40, 80], ra: [40, 80], flip: true }).replace(/#FFFFFF/g, '#5A5A62');
  for (let i = 0; i < 14; i++) s += `<path d="M${800 + (i % 2) * 10} ${480 + i * 34} H${1120 - (i % 3) * 20}" stroke="#5A5A62" stroke-width="7" stroke-dasharray="${8 + (i % 4) * 3} 6"/>`;
  return s + hand('HAMMURABI', 1420, 220, 64, c.t, 0.3) + hand('~282 LAWS', 1420, 300, 56, c.t, 0.4, { col: C.accent }) + person({ x: 1500, y: 1000, s: 1.0, kind: 'modern', shirt: '#E8DCC0', t: c.t, seed: 4, face: 'think', la: [-14, -6], ra: [14, 6], flip: true });
};
SCN.amargi = (c, o) => {
  let s = paper();
  s += hand(o.say ? 'AMARGI' : '', 960, 370, 150, c.t, 0.1, { col: C.accent }) + g('translate(960 120) scale(.85)', `<rect x="-160" y="-60" width="320" height="120" rx="20" fill="#C9A06A" ${S} stroke-width="5"/>` + cuneiform(8, c.t, 0));
  if (o.mother) s += kid({ x: lerp(560, 860, eout(clamp(c.t / 1.2))), y: 1040, s: 1.1, t: c.t, seed: 9, face: 'laugh', la: [-40, -60], ra: [-40, -60] }) + person({ x: 1020, y: 1040, s: 1.05, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-60, -80], ra: [60, 80], flip: true }) + pop(940, 600, c.t, 1.0, heart(0.8)) + hand('"RETURN TO THE MOTHER"', 960, 480, 64, c.t, 0.4);
  else if (o.say) s += hand('FREEDOM', 960, 500, 90, c.t, 0.4);
  return s;
};
SCN.fleeCity = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F2D9A6"/><path d="M1000 760 Q1400 520 1920 600 V1080 H1000 Z" fill="#8FA45E"/><rect y="760" width="1100" height="320" fill="#D9B98A"/>`;
  s += `<rect x="60" y="400" width="760" height="420" fill="#C9A97A" ${S} stroke-width="7"/>` + [...Array(8)].map((_, i) => `<rect x="${60 + i * 96}" y="360" width="56" height="50" fill="#C9A97A" ${S} stroke-width="5"/>`).join('') + `<rect x="740" y="620" width="80" height="200" fill="#5C4430"/>`;
  if (o.flee) { const k = Math.sin(c.t * 7) * 20; for (let i = 0; i < 4; i++) s += person({ x: 920 + i * 160 + c.t * 50, y: 1000 - i * 30, s: 0.9 - i * 0.08, t: c.t, seed: 3 + i * 4, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, face: 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-30, -40], ra: [30, 40] }); s += hand('TO THE HILLS', 1500, 300, 76, c.t, 0.3); }
  else s += person({ x: 1100, y: 1000, s: 1.0, t: c.t, seed: 21, face: 'smug', beard: true, la: [-14, -6], ra: [60, 90], front: (L, R) => g(`translate(${f1(R[0])} ${f1(R[1])})`, `<rect x="-36" y="-28" width="72" height="56" rx="8" fill="#C9A06A" ${S} stroke-width="3"/>`) }) + hand('TAXES · FORCED LABOUR', 1400, 300, 70, c.t, 0.3);
  return s;
};
SCN.trypillia = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9FBF6E"/>`;
  const z = o.zoom ? 1.6 : 1;
  let rings = '';
  for (let r = 0; r < 4; r++) { const rx = 760 - r * 150, ry = 400 - r * 80, n = 46 - r * 8; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; rings += smallHouse(960 + Math.cos(a) * rx, 540 + Math.sin(a) * ry, 0.7); } }
  if (o.assembly) rings += g('translate(960 540)', `<rect x="-110" y="-60" width="220" height="120" fill="#E6C27A" ${S} stroke-width="5"/><path d="M-130 -60 L0 -130 L130 -60 Z" fill="#C9A06A" ${S} stroke-width="5"/>`) + `<circle cx="960" cy="520" r="${f1(170 + Math.sin(c.t * 3) * 10)}" fill="none" stroke="${C.accent}" stroke-width="8"/>`;
  s += g(`translate(960 540) scale(${z}) translate(-960 -540)`, rings);
  return s + hand(o.assembly ? 'A MEETING HOUSE?' : 'TRYPILLIA · ~6,000 YEARS', 960, 110, 76, c.t, 0.3);
};
SCN.teotihuacan = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#C9B07A"/>`;
  const z = o.zoom ? 1.5 : 1;
  let g2 = `<path d="M860 760 L960 260 L1060 760 Z" fill="none"/>` + g('translate(960 520)', `<rect x="-200" y="-160" width="400" height="320" fill="#B8956A" ${S} stroke-width="6"/><rect x="-140" y="-110" width="280" height="220" fill="#C9A97A" ${S} stroke-width="5"/><rect x="-80" y="-60" width="160" height="120" fill="#D9C2A0" ${S} stroke-width="5"/>`);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { const x = 200 + i * 300, y = 120 + j * 260; if (Math.abs(x - 960) < 300 && Math.abs(y - 520) < 260) continue; g2 += g(`translate(${x} ${y})`, `<rect x="-110" y="-90" width="220" height="180" fill="#E6D3B0" ${S} stroke-width="5"/><rect x="-40" y="-30" width="80" height="60" fill="#9FBF6E" ${S} stroke-width="3"/><path d="M-110 -20 H-40 M40 -20 H110 M-110 30 H-40 M40 30 H110" stroke="#B8956A" stroke-width="4"/>`); }
  s += g(`translate(960 540) scale(${z}) translate(-960 -540)`, g2);
  return s + hand(o.zoom ? 'APARTMENT COMPOUNDS' : 'TEOTIHUACAN', 960, 80, 76, c.t, 0.3);
};

// Extra card icon: crown.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'crown') return `<path d="M-110 60 L-120 -60 L-60 0 L0 -90 L60 0 L120 -60 L110 60 Z" fill="#F2C443" ${S} stroke-width="6"/><circle cx="0" cy="20" r="14" fill="${C.red}"/><circle cx="-60" cy="30" r="10" fill="#3E7FA6"/><circle cx="60" cy="30" r="10" fill="#3E7FA6"/>`;
    return ic(name, t);
  };
})();

// ---------- added scenes ----------
SCN.modestHunter = (c, o) => {
  let s = bgNight(c.t, { seed: 701 }) + `<ellipse cx="960" cy="920" rx="760" ry="180" fill="#F28C28" opacity=".24"/>` + fire(960, 920, 0.7, c.t);
  s += today(() => person({ x: 640, y: 1000, s: 1.3, t: c.t, seed: 3, face: o.smile ? 'smug' : 'neutral', ...sit, la: [40, 80], ra: [40, 80] }) + person({ x: 1300, y: 1000, s: 1.2, t: c.t, seed: 8, face: o.smile ? 'laugh' : 'happy', ...sit, la: [40, 80], ra: o.ask ? [-60, -100] : [40, 80], flip: true }));
  if (o.ask) s += pop(1300, 520, c.t, 0.2, speech(0, 0, 420, 110, -60, 120, hand('WHAT DID YOU SEE TODAY?', 0, 16, 40, 1, DONE)));
  if (o.reply || o.smile) s += pop(640, 520, c.t, o.smile ? DONE : 0.2, speech(0, 0, 460, 120, 60, 130, hand('JUST A LITTLE TINY ONE...', 0, 16, 40, 1, DONE)));
  if (o.smile) s += g('translate(1660 900) scale(1.2)', antelope(false, 0)) + hand('(A BIG ONE)', 1660, 700, 52, c.t, 0.4, { col: '#FFE9A8' });
  return s;
};
SCN.bonobos = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9CC28A"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#6E9A5A' : '#5F8A4E'}"/>`).join('') + `<rect y="860" width="${W}" height="220" fill="#7A6A4A"/>`;
  const run = o.chase ? (c.t * 160) % 600 : 0;
  s += g(`translate(${f1(1300 + run)} 900) scale(.8) ${o.chase ? 'rotate(8)' : ''}`, ape('chimp', c.t, {}));
  [[560, 0.7], [760, 0.65], [940, 0.7]].forEach(([x, k], i) => { s += g(`translate(${f1(x + run * 0.8)} 900) scale(${k})`, ape('chimp', c.t, {})) + `<path d="M${f1(x + run * 0.8 - 50)} ${640} q20 -20 40 -10" fill="none" stroke="#F28CA0" stroke-width="10" stroke-linecap="round"/>`; });
  if (o.chase) for (let i = 0; i < 3; i++) s += `<path d="M${f1(1180 + run - i * 30)} ${700 + i * 40} h-100" stroke="${C.ink}" stroke-width="6" stroke-linecap="round" opacity=".5"/>`;
  return s + hand(o.chase ? 'FEMALES TEAM UP' : 'BONOBOS', 960, 200, 90, c.t, 0.3, { col: '#FFFFFF' });
};
SCN.leaderSpeak = (c, o) => {
  let s = kalahari(c.t, { sky: ['#F2B27A', '#FBE3B5'], hills: '#7FA34E', ground: '#C9B26A', trees: true });
  const k = Math.sin(c.t * 5) * 20;
  s += person({ x: 960, y: 980, s: 1.5, t: c.t, seed: 21, face: o.speak ? 'laugh' : 'happy', la: [-14, -6], ra: o.give ? [-60, -90] : o.speak ? [-100 + k, -150] : [14, 6] });
  s += [[400, 0.95], [580, 0.85], [1340, 0.9], [1520, 0.95]].map(([x, sc], i) => person({ x, y: 1000, s: sc, t: c.t, seed: 3 + i * 4, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, face: o.speak ? 'surprised' : 'happy', ...sit, la: [40, 80], ra: o.give && i === 2 ? [-60, -90] : [40, 80], flip: x > 960 })).join('');
  if (o.give) { const p = (c.t * 0.6) % 1; s += g(`translate(${f1(lerp(1060, 1340, p))} ${f1(720 - Math.sin(p * Math.PI) * 140)})`, meat(0.5, 4)); }
  if (o.speak) for (let i = 0; i < 3; i++) s += `<path d="M${1060 + i * 30} ${600 - i * 10} q30 30 0 60" fill="none" stroke="${C.ink}" stroke-width="6" opacity="${f1(0.4 + 0.6 * Math.abs(Math.sin(c.t * 5 + i)))}"/>`;
  return s + hand(o.give ? 'GENEROUS' : o.speak ? 'PEACEMAKER · SPEAKER' : 'NO POWER TO COMMAND', 960, 180, 76, c.t, 0.3);
};
function cow(s = 1, t = 0) { const k = Math.sin(t * 5) * 6; return g(`scale(${s})`, `<path d="M-150 -10 Q-150 -110 -20 -116 Q100 -120 140 -70 Q160 -20 140 20 L-140 20 Z" fill="#FFFDF5" ${S} stroke-width="5"/><ellipse cx="-60" cy="-60" rx="40" ry="26" fill="#2B2118"/><path d="M140 -70 q50 -10 60 30 q-20 30 -60 20" fill="#FFFDF5" ${S} stroke-width="5"/><path d="M150 -80 q10 -40 40 -46 M146 -80 q-20 -40 0 -60" fill="none" ${S} stroke-width="6"/><path d="M-120 20 l${f1(-k)} 70 M-70 20 l${f1(k)} 70 M80 20 l${f1(-k)} 70 M120 20 l${f1(k)} 70" ${S} stroke-width="12"/>`); }
SCN.cattleCount = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#F2D9A6"/><rect y="760" width="${W}" height="320" fill="#D9B98A"/><path d="M0 760 Q960 700 1920 760" fill="none" stroke="#C9A97A" stroke-width="6"/>`;
  s += g('translate(1560 600)', `<path d="M-120 160 L0 -200 L120 160 Z" fill="#E6C27A" ${S} stroke-width="6"/>`);
  for (let i = 0; i < 5; i++) s += g(`translate(${f1(200 + i * 230 + (c.t * 40) % 230)} ${880 + (i % 2) * 40})`, cow(0.6, c.t + i));
  s += person({ x: 1500, y: 1000, s: 1.1, kind: 'modern', shirt: '#E8DCC0', t: c.t, seed: 6, face: 'think', ...sit, la: [60, 100], ra: [40, 90], armsFront: true, flip: true, front: (L, R) => g(`translate(${f1((L[0] + R[0]) / 2)} ${f1((L[1] + R[1]) / 2 - 20)})`, `<rect x="-50" y="-30" width="100" height="60" fill="#F3EBDD" ${S} stroke-width="3"/><path d="M-36 -12 h20 M-36 6 h40" stroke="${C.ink}" stroke-width="3"/>`) });
  return s + hand(o.label ? '"THE YEAR OF THE FIFTH COUNT"' : 'THE CATTLE COUNT', 960, 160, 76, c.t, 0.3);
};
