// Scenes for "What Did Ancient Humans Believe In?". Builds on the fridge, doctor, bed and school libraries.
'use strict';

Object.assign(PLACES, {
  amboseli: [37.26, -2.65], panga: [39.62, -3.73], qafzeh: [35.32, 32.68], hilazon: [35.24, 32.93], lachapelle: [1.73, 45.0],
  bruniquel: [1.66, 44.05], sungir: [40.4, 56.17], sulawesi: [119.6, -4.9], swabia: [10.08, 48.55], gobekli: [38.92, 37.22],
  britain: [-1.83, 51.18], mauritius: [57.55, -20.25], oberkassel: [7.17, 50.71], wales: [-4.25, 51.55],
});
Object.assign(REGIONS, {
  amboseli: { center: [37.5, -2], scale: 2600, hl: ['Kenya'] },
  panga: { center: [38.5, -1.5], scale: 2600, hl: ['Kenya'] },
  qafzeh: { center: [35.2, 32.2], scale: 9500, hl: ['Israel'] },
  hilazon: { center: [35.2, 32.2], scale: 9500, hl: ['Israel'] },
  lachapelle: { center: [2.0, 46.4], scale: 3000, hl: ['France'] },
  bruniquel: { center: [2.0, 46.0], scale: 3000, hl: ['France'] },
  sungir: { center: [40, 56], scale: 1800, hl: ['Russia'] },
  sulawesi: { center: [120.5, -2.5], scale: 2200, hl: ['Indonesia'] },
  swabia: { center: [10.5, 49.5], scale: 3200, hl: ['Germany'] },
  gobekli: { center: [37.5, 38.5], scale: 2200, hl: ['Turkey'] },
  britain: { center: [-3.5, 54], scale: 2200, hl: ['United Kingdom'] },
  mauritius: { center: [57.6, -20.3], scale: 22000, hl: ['Mauritius'] },
  oberkassel: { center: [9.5, 51], scale: 2600, hl: ['Germany'] },
  wales: { center: [-3.5, 53], scale: 3200, hl: ['United Kingdom'] },
});

// ---------- helpers ----------
const BONE = '#EFE6CF';
function skeleton(s = 1, o = {}) {
  // a small, gentle, stylised skeleton lying on its side (curled when o.curl)
  const curl = o.curl ?? 0.6;
  let b = `<circle cx="0" cy="0" r="44" fill="${BONE}" ${S} stroke-width="5"/><circle cx="-14" cy="-6" r="9" fill="#6E5A44"/><path d="M-30 18 q12 10 26 4" fill="none" ${S} stroke-width="3"/>`;
  const sp = `M40 20 Q140 ${f1(30 + curl * 40)} 230 ${f1(10 + curl * 60)}`;
  b += `<path d="${sp}" fill="none" stroke="${C.ink}" stroke-width="16" stroke-linecap="round"/><path d="${sp}" fill="none" stroke="${BONE}" stroke-width="9" stroke-linecap="round"/>`;
  for (let i = 0; i < 4; i++) b += `<path d="M${80 + i * 26} ${30 + i * 3} q10 26 0 46" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/><path d="M${80 + i * 26} ${30 + i * 3} q10 26 0 46" fill="none" stroke="${BONE}" stroke-width="3.5" stroke-linecap="round"/>`;
  const limb = d => `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${BONE}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  b += limb(`M90 40 L${f1(80 - curl * 30)} 110 L${f1(30 - curl * 20)} ${f1(100 - curl * 10)}`);
  b += limb(`M230 ${f1(10 + curl * 60)} L${f1(200 - curl * 120)} ${f1(120 + curl * 20)} L${f1(280 - curl * 160)} ${f1(150 + curl * 10)}`);
  return g(`scale(${s})`, b);
}
function wrapped(s = 1, col = '#C9A97A', beads = false) {
  let b = `<path d="M-20 -50 Q120 -80 330 -40 Q360 0 330 40 Q120 70 -20 50 Q-60 0 -20 -50 Z" fill="${col}" ${S} stroke-width="6"/><circle cx="-40" cy="0" r="54" fill="#FFFFFF" ${S} stroke-width="5"/><path d="M-60 -2 q8 6 16 0 M-32 -2 q8 6 16 0" fill="none" ${S} stroke-width="3.5"/>`;
  if (beads) { const r = rng(3); let d = ''; for (let i = 0; i < 160; i++) { const x = 10 + r() * 300, y = -40 + r() * 80; d += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.6" fill="#FFFDF2" stroke="#8E7E62" stroke-width="1"/>`; } b += d; }
  return g(`scale(${s})`, b);
}
function grave(x, y, w, h, t) { return `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${h}" fill="#5C4430" ${S} stroke-width="6"/><ellipse cx="${x}" cy="${y + 8}" rx="${w - 26}" ry="${h - 20}" fill="#4A3626"/>`; }
function ochreDust(x, y, t, n = 40, spread = 260) { const r = rng(11); let o = ''; for (let i = 0; i < n; i++) { const p = (t * 0.6 + r()) % 1, px = x + (r() - 0.5) * spread, py = y - 200 + p * 220; o += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(3 + r() * 4)}" fill="#C0392B" opacity="${f1(0.9 - p * 0.5)}"/>`; } return o; }
function elephant(s = 1, t = 0, o = {}) {
  const tr = o.trunkDown ? 1 : 0, sw = Math.sin(t * 1.5) * 6;
  return g(`scale(${s})`, `<path d="M-200 -60 Q-210 -220 -40 -230 Q120 -240 170 -120 Q190 -40 160 40 L-190 40 Q-210 0 -200 -60 Z" fill="#9C9A94" ${S} stroke-width="6"/>` +
    [[-170, 40], [-100, 40], [60, 40], [130, 40]].map(([x, y]) => `<rect x="${x}" y="${y - 10}" width="54" height="140" rx="16" fill="#8E8C86" ${S} stroke-width="6"/>`).join('') +
    `<ellipse cx="210" cy="-130" rx="90" ry="80" fill="#9C9A94" ${S} stroke-width="6"/><path d="M150 -190 Q90 -170 100 -60 Q140 -40 170 -80 Z" fill="#8E8C86" ${S} stroke-width="5"/><circle cx="240" cy="-150" r="7" fill="${C.ink}"/>` +
    `<path d="M280 -110 Q${f1(330 + sw)} ${f1(-20 + tr * 40)} ${f1(300 + tr * 40 + sw)} ${f1(80 + tr * 80)}" fill="none" stroke="${C.ink}" stroke-width="44" stroke-linecap="round"/><path d="M280 -110 Q${f1(330 + sw)} ${f1(-20 + tr * 40)} ${f1(300 + tr * 40 + sw)} ${f1(80 + tr * 80)}" fill="none" stroke="#9C9A94" stroke-width="32" stroke-linecap="round"/><path d="M260 -90 q30 30 60 20" fill="none" stroke="#FFFDF2" stroke-width="14" stroke-linecap="round"/>`);
}
function spirit(x, y, t, s = 1, i = 0) { const b = Math.sin(t * 1.4 + i) * 10; return g(`translate(${x} ${f1(y + b)}) scale(${s})`, `<circle r="70" fill="#FFF6C8" opacity=".25"/><circle r="40" fill="#FFF6C8" opacity=".35"/><circle r="16" fill="#FFFDF0"/>`); }
function tPillar(s = 1, o = {}) {
  let b = `<rect x="-60" y="-300" width="120" height="420" fill="#D6CBB2" ${S} stroke-width="6"/><rect x="-170" y="-380" width="340" height="110" rx="6" fill="#DCD2BA" ${S} stroke-width="6"/>`;
  if (o.arms) b += `<path d="M-40 -260 Q-56 -120 -10 -40 L40 -40" fill="none" stroke="#7E745E" stroke-width="14" stroke-linecap="round"/><path d="M40 -260 Q56 -120 10 -60" fill="none" stroke="#7E745E" stroke-width="14" stroke-linecap="round"/>` + [-20, -8, 4, 16].map(x => `<path d="M${x} -40 v18" stroke="#A89C82" stroke-width="6" stroke-linecap="round"/>`).join('');
  if (o.animals) {
    b += `<path d="M-30 -200 q30 -40 60 0 q-10 30 -30 40 q-20 -10 -30 -40 Z" fill="none" stroke="#6E6450" stroke-width="10"/><path d="M-20 -150 l-10 30 M20 -150 l10 30 M30 -205 l20 -20" stroke="#6E6450" stroke-width="10"/>`;
    b += `<path d="M-140 -330 q30 -26 70 -10 q20 10 50 0 M-30 -330 q20 -20 40 0" fill="none" stroke="#6E6450" stroke-width="10"/>`;
    b += `<path d="M-40 0 q20 -20 0 -40 q-20 -20 0 -40 q20 -20 0 -40" fill="none" stroke="#6E6450" stroke-width="10"/>`;
    b += `<path d="M60 -340 l30 -20 l30 20 l-10 30 h-40 Z M74 -320 l-14 24 M106 -320 l14 24" fill="none" stroke="#6E6450" stroke-width="9"/>`;
  }
  return g(`scale(${s})`, b);
}

// ---------- modern ----------
SCN.worship = (c, o) => {
  const night = !!o.sky;
  let s = night ? bgNight(c.t, { seed: 601, hz: 760 }) : `<defs><linearGradient id="wsk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6C27A"/><stop offset="1" stop-color="#FBE8C8"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#wsk)"/>`;
  if (!night) s += `<rect y="760" width="${W}" height="320" fill="#C9B79A"/>`;
  const col = night ? '#3A4466' : '#E8DCC4', st = `stroke="${C.ink}" stroke-width="6"`;
  s += `<path d="M160 760 V420 L250 220 L340 420 V760 Z" fill="${col}" ${st}/><rect x="220" y="520" width="60" height="100" rx="30" fill="${night ? '#F2C443' : '#8E6A4A'}" ${st}/>`;
  s += `<rect x="520" y="520" width="380" height="240" fill="${col}" ${st}/><path d="M540 520 Q710 300 880 520 Z" fill="${night ? '#46507A' : '#D9C9A6'}" ${st}/><rect x="930" y="380" width="60" height="380" fill="${col}" ${st}/><path d="M930 380 L960 320 L990 380 Z" fill="${col}" ${st}/>`;
  s += `<rect x="1100" y="600" width="300" height="160" fill="${col}" ${st}/><path d="M1060 600 Q1250 560 1440 600 L1250 520 Z" fill="#B85C3A" ${st}/><rect x="1150" y="470" width="200" height="60" fill="${col}" ${st}/><path d="M1110 470 Q1250 440 1390 470 L1250 400 Z" fill="#B85C3A" ${st}/>`;
  s += `<path d="M1500 760 V560 H1840 V760 Z" fill="${col}" ${st}/><path d="M1480 560 L1670 460 L1860 560 Z" fill="${night ? '#46507A' : '#D9C9A6'}" ${st}/>` + [0, 1, 2, 3].map(i => `<rect x="${1540 + i * 80}" y="580" width="30" height="180" fill="${night ? '#46507A' : '#F3EBDD'}" ${S} stroke-width="4"/>`).join('');
  if (o.candles) for (let i = 0; i < 9; i++) { const x = 360 + i * 150; s += `<rect x="${x - 18}" y="900" width="36" height="${90 + (i % 3) * 20}" fill="#FFF6E0" ${S} stroke-width="4"/>` + fire(x, 900, 0.16, c.t + i); }
  else s += [[700, 1, 'modern'], [860, 0.8, 'modern'], [1300, 1, 'modern']].map(([x, k], i) => person({ x, y: 1000, s: k, kind: 'modern', t: c.t, seed: 3 + i * 4, face: 'happy', shirt: ['#3E7FA6', '#C9573E', '#7A4E8A'][i], la: [-14, -6], ra: [14, 6] })).join('');
  return s;
};

// ---------- the graveside ----------
SCN.graveside = (c, o) => {
  let s = kalahari(c.t, { sky: ['#C9785A', '#F2C08A'], hills: '#8E6A5A', ground: '#B98E5A' });
  s += grave(960, 900, 380, 110, c.t);
  if (o.lay) s += g('translate(800 905) scale(.62)', wrapped(1, '#C9A97A'));
  if (o.ochre) s += ochreDust(960, 900, c.t) + (o.lay ? `<ellipse cx="900" cy="905" rx="200" ry="40" fill="#C0392B" opacity=".25"/>` : '');
  if (o.gift) s += pop(1180, 900, c.t, 0.3, `<path d="M-50 10 Q0 -40 50 10" fill="none" stroke="#E9DFC8" stroke-width="12" stroke-linecap="round"/>` + [-40, -20, 0, 20, 40].map(x => `<circle cx="${x}" cy="${f1(-20 + Math.abs(x) * 0.5)}" r="8" fill="#FFFDF2" ${S} stroke-width="2"/>`).join(''));
  [[380, 'neutral', 2, false], [560, 'sad', 5, true], [1360, 'sad', 9, false], [1560, 'neutral', 14, true]].forEach(([x, f, sd, lg], i) => {
    s += person({ x, y: 960 - (i % 2) * 20, s: 1.1 - (i % 2) * 0.1, t: c.t, seed: sd, long: lg, hairC: lg ? C.hair2 : C.hair, face: f, la: [-14, -6], ra: [14, 6], flip: x > 960, bob: 0.4 });
  });
  return s;
};
SCN.burialPit = (c, o) => {
  const m = o.mode || 'mtoto';
  let s = `<rect width="${W}" height="${H}" fill="#A47E55"/>`;
  const r = rng(7);
  for (let i = 0; i < 60; i++) s += `<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(4 + r() * 10)}" fill="#8E6A44" opacity=".6"/>`;
  s += `<ellipse cx="960" cy="560" rx="${m === 'mtoto' ? 420 : 620}" ry="${m === 'mtoto' ? 260 : 320}" fill="#6E5236" ${S} stroke-width="8"/>`;
  const sc = m === 'mtoto' ? 1.0 : 1.5, cx = m === 'mtoto' ? 760 : 620;
  if (o.pillow) s += `<ellipse cx="${cx - 10}" cy="${560 + 34 * sc}" rx="${80 * sc}" ry="${30 * sc}" fill="#C9B07A" ${S} stroke-width="5"/>`;
  s += g(`translate(${cx} 520)`, skeleton(sc, { curl: m === 'mtoto' ? 0.9 : 0.6 }));
  if (o.shroud) s += `<path d="M${cx + 30} ${470} Q${cx + 200} ${430} ${cx + 330} ${500} Q${cx + 340} ${620} ${cx + 200} ${640} Q${cx + 60} ${640} ${cx + 30} ${590} Z" fill="#E8DCC0" opacity=".75" ${S} stroke-width="4"/>`;
  if (o.antlers) s += pop(1000, 520, c.t, 0.2, `<path d="M-160 40 Q0 -20 160 40 M-100 18 l-30 -60 M-40 4 l-10 -60 M40 4 l10 -60 M100 18 l30 -60" fill="none" stroke="${C.ink}" stroke-width="18" stroke-linecap="round"/><path d="M-160 40 Q0 -20 160 40 M-100 18 l-30 -60 M-40 4 l-10 -60 M40 4 l10 -60 M100 18 l30 -60" fill="none" stroke="#C9A97A" stroke-width="10" stroke-linecap="round"/>`);
  const lab = { mtoto: 'PANGA YA SAIDI · 78,000 YEARS', qafzeh: 'QAFZEH · ~100,000 YEARS', neanderthal: 'NEANDERTHAL BURIAL' }[m];
  return s + hand(lab, 960, 150, 70, c.t, 0.2, { col: '#FFF3D6' });
};

// ---------- animals ----------
SCN.elephantBones = (c, o) => {
  let s = bgSavanna({ seed: 611 });
  s += g('translate(1340 960)', `<ellipse cx="0" cy="0" rx="110" ry="60" fill="${BONE}" ${S} stroke-width="6"/><circle cx="-40" cy="-10" r="16" fill="#6E5A44"/><circle cx="30" cy="-14" r="16" fill="#6E5A44"/><path d="M60 20 Q160 40 200 0" fill="none" stroke="#FFFDF2" stroke-width="22" stroke-linecap="round"/><path d="M60 20 Q160 40 200 0" fill="none" ${S} stroke-width="4"/>`);
  s += g('translate(760 820) scale(1.3)', elephant(1, c.t, { trunkDown: !!o.touch }));
  return s;
};
function apeLying(x, y, s, t, o = {}) { return g(`translate(${x} ${y}) rotate(-90) scale(${s})`, ape('chimp', t, {})); }
SCN.chimpMourn = (c, o) => {
  const m = o.mode || 'carry', night = m === 'night';
  let s = night ? bgNight(c.t, { seed: 613 }) : `<rect width="${W}" height="${H}" fill="#A9CF95"/>` + [...Array(9)].map((_, i) => `<circle cx="${i * 240}" cy="${180 + (i % 2) * 80}" r="${180 + (i % 3) * 40}" fill="${i % 2 ? '#7FA86A' : '#6E9A5A'}"/>`).join('') + `<rect y="860" width="${W}" height="220" fill="#8C7A54"/>`;
  if (m === 'carry') { const x = 700 + c.t * 50; s += g(`translate(${f1(x)} 900) scale(.8)`, ape('chimp', c.t, {})) + g(`translate(${f1(x + 40)} 690) rotate(-70) scale(.3)`, ape('chimp', 0, {})); return s + hand('A MOTHER AND HER BABY', 960, 200, 76, c.t, 0.3, { col: '#FFFFFF' }); }
  if (m === 'empty') { s += `<rect x="560" y="700" width="800" height="40" fill="#8E6A4A" ${S} stroke-width="6"/><path d="M620 740 v160 M1300 740 v160" ${S} stroke-width="14"/>` + g('translate(300 900) scale(.6)', ape('chimp', c.t, {})) + g('translate(1620 900) scale(.6)', ape('chimp', c.t, {})); return s + hand('NOBODY SLEPT HERE', 960, 200, 84, c.t, 0.3, { col: '#FFFFFF' }); }
  s += apeLying(900, 900, 0.75, 0);
  if (m === 'pansy') { s += g('translate(560 900) scale(.7)', ape('chimp', c.t, {})) + g('translate(1300 900) scale(.7)', ape('chimp', c.t, {})); s += `<path d="M640 760 q60 40 120 60 M1220 760 q-60 40 -120 60" fill="none" stroke="${C.ink}" stroke-width="8" stroke-dasharray="10 10"/>`; return s + hand('PANSY', 960, 200, 90, c.t, 0.3, { col: '#FFFFFF' }); }
  s += g('translate(1260 910) scale(.62)', ape('chimp', c.t, {}));
  return s + hand('ALL NIGHT', 960, 200, 90, c.t, 0.3, { col: '#FFFFFF' });
};
SCN.waterfall = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#7FA86A"/><path d="M700 0 H1220 V900 H700 Z" fill="#8E9AA6"/>`;
  for (let i = 0; i < 14; i++) { const y = ((c.t * 600) + i * 80) % 1000; s += `<path d="M${720 + i * 34} ${f1(y - 120)} v120" stroke="#E6F2F8" stroke-width="10" stroke-linecap="round" opacity=".8"/>`; }
  s += `<path d="M0 0 H700 V940 H0 Z" fill="#6E7A64"/><path d="M1220 0 H1920 V940 H1220 Z" fill="#6E7A64"/><ellipse cx="960" cy="960" rx="520" ry="90" fill="#9FD3E8" ${S} stroke-width="6"/>`;
  for (let i = 0; i < 6; i++) { const p = (c.t * 1.2 + i / 6) % 1; s += `<circle cx="${f1(760 + i * 80 + Math.sin(i) * 30)}" cy="${f1(920 - Math.sin(p * Math.PI) * 120)}" r="12" fill="#FFFFFF" opacity="${f1(1 - p)}"/>`; }
  const sway = o.display ? Math.sin(c.t * 4) * 10 : 0;
  s += g(`translate(420 940) rotate(${f1(sway)}) scale(.9)`, ape('chimp', c.t, {}));
  if (o.display) s += g(`translate(${f1(560 + sway * 4)} 600) rotate(${f1(-30 + sway * 3)})`, `<path d="M0 0 L120 -160" stroke="${C.woodD}" stroke-width="12" stroke-linecap="round"/><path d="M80 -110 l40 -20 M100 -140 l30 -30" stroke="#5E8A3C" stroke-width="10" stroke-linecap="round"/>`);
  return s;
};
SCN.stonePile = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#A9CF95"/><rect y="860" width="${W}" height="220" fill="#8C7A54"/>`;
  s += `<path d="M1180 900 Q1160 500 1220 200 L1380 200 Q1420 500 1400 900 Z" fill="#8E6A4A" ${S} stroke-width="7"/><ellipse cx="1290" cy="720" rx="50" ry="80" fill="#3E2E20"/><path d="M1100 220 Q1300 60 1500 220 Q1300 280 1100 220 Z" fill="#5E8A4E" ${S} stroke-width="6"/>`;
  if (o.pile) { const r = rng(17); for (let i = 0; i < 26; i++) s += `<ellipse cx="${f1(1180 + r() * 220)}" cy="${f1(900 - r() * 50 * (1 - Math.abs(r() - 0.5)))}" rx="${f1(18 + r() * 14)}" ry="${f1(12 + r() * 8)}" fill="#9C978F" ${S} stroke-width="3"/>`; }
  s += g('translate(700 900) scale(.9)', ape('chimp', c.t, {}));
  const p = (c.t * 0.8) % 1;
  s += `<ellipse cx="${f1(800 + p * 420)}" cy="${f1(640 - Math.sin(p * Math.PI) * 120 + p * 80)}" rx="22" ry="16" fill="#9C978F" ${S} stroke-width="4"/>`;
  return s;
};
SCN.flowerBurial = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#7A5E44"/>` + grave(960, 600, 640, 300, c.t) + g('translate(620 560)', skeleton(1.5, { curl: 0.5 }));
  if (o.pollen) { const r = rng(5); for (let i = 0; i < 60; i++) s += pop(560 + r() * 800, 420 + r() * 340, c.t, 0.1 + i * 0.01, `<circle r="6" fill="#F2C443"/>`); }
  if (o.flowers) { const r = rng(9); for (let i = 0; i < 24; i++) { const x = 520 + r() * 880, y = 400 + r() * 380; s += pop(x, y, c.t, 0.1 + i * 0.03, [0, 1, 2, 3, 4].map(k => `<circle cx="${f1(Math.cos(k * 1.26) * 14)}" cy="${f1(Math.sin(k * 1.26) * 14)}" r="10" fill="${['#F28CA0', '#F2C443', '#B58FD0'][i % 3]}"/>`).join('') + `<circle r="7" fill="#FFF3C4"/>`); } }
  if (o.bees) {
    s += `<path d="M1500 1080 Q1460 860 1300 800" fill="none" stroke="#4A3626" stroke-width="30" stroke-linecap="round"/><path d="M300 1080 Q360 900 520 860" fill="none" stroke="#4A3626" stroke-width="30" stroke-linecap="round"/>`;
    const r = rng(5); for (let i = 0; i < 30; i++) s += `<circle cx="${f1(560 + r() * 800)}" cy="${f1(420 + r() * 340)}" r="6" fill="#F2C443"/>`;
    for (let i = 0; i < 4; i++) { const a = c.t * 2 + i * 1.6, x = 960 + Math.cos(a) * (300 + i * 60), y = 420 + Math.sin(a * 1.3) * 120; s += g(`translate(${f1(x)} ${f1(y)}) scale(1.6)`, `<ellipse rx="20" ry="13" fill="#F2C443" ${S} stroke-width="3"/><path d="M-6 -12 v24 M6 -12 v24" stroke="${C.ink}" stroke-width="4"/><ellipse cx="-4" cy="-18" rx="12" ry="8" fill="#EAF2F5" ${S} stroke-width="2" opacity=".9"/><ellipse cx="8" cy="-18" rx="12" ry="8" fill="#EAF2F5" ${S} stroke-width="2" opacity=".9"/>`); }
    s += hand('GROUND-NESTING BEES', 960, 150, 76, c.t, 0.4, { col: '#FFF3D6' });
  }
  if (o.jird) {
    s += `<path d="M1500 1080 Q1460 860 1300 800 Q1100 760 1000 860" fill="none" stroke="#4A3626" stroke-width="40" stroke-linecap="round"/>`;
    const p = clamp(c.t / 1.4), x = lerp(1520, 1040, p), y = lerp(1000, 840, p);
    s += g(`translate(${f1(x)} ${f1(y)}) scale(${p > 0.5 ? -1 : -1} 1)`, `<ellipse rx="50" ry="30" fill="#C9A06A" ${S} stroke-width="4"/><circle cx="-50" cy="-10" r="22" fill="#C9A06A" ${S} stroke-width="4"/><circle cx="-58" cy="-14" r="4" fill="${C.ink}"/><path d="M50 0 q60 10 90 -20" fill="none" stroke="#C9A06A" stroke-width="7"/>`);
    const r = rng(5); for (let i = 0; i < 30; i++) s += `<circle cx="${f1(560 + r() * 800)}" cy="${f1(420 + r() * 340)}" r="6" fill="#F2C443"/>`;
    s += hand('A BURROWING ANIMAL', 960, 150, 76, c.t, 0.4, { col: '#FFF3D6' });
  }
  return s;
};
SCN.bruniquel = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#1C1612"/><ellipse cx="960" cy="760" rx="900" ry="300" fill="#2E241C"/>`;
  for (let i = 0; i < 12; i++) s += `<path d="M${i * 170 + 40} 0 l20 ${120 + (i % 3) * 60} l20 ${-(120 + (i % 3) * 60)} Z" fill="#4A3C30"/>`;
  const ring = (cx, cy, rx, ry, n, t0) => { let o2 = ''; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; const p = o.build || o.fire ? clamp((c.t - t0 - i * 0.02) / 0.3) : 1; if (p > 0) o2 += `<rect x="${f1(x - 18)}" y="${f1(y - 14)}" width="36" height="22" rx="6" fill="#D9CBB0" ${S} stroke-width="3" transform="rotate(${f1(a * 57)} ${f1(x)} ${f1(y)})" opacity="${f1(p)}"/>`; } return o2; };
  s += ring(820, 760, 380, 120, 46, 0) + ring(820, 760, 250, 76, 30, 0.6) + ring(1500, 780, 120, 50, 16, 0.3);
  if (o.fire) { s += `<ellipse cx="820" cy="760" rx="520" ry="200" fill="#F7B84A" opacity=".15"/>` + fire(700, 740, 0.35, c.t) + fire(980, 770, 0.3, c.t + 1) + fire(1500, 780, 0.25, c.t + 2); }
  return s + hand('330 M FROM DAYLIGHT', 960, 160, 76, c.t, 0.3, { col: '#F3EBDD' });
};

// ---------- symbols ----------
SCN.ochre = (c, o) => {
  let s = paper();
  s += g('translate(760 600) scale(1.6)', `<path d="M-120 20 L-90 -70 L20 -100 L120 -40 L110 60 L-20 90 Z" fill="#B8432E" ${S} stroke-width="6"/><path d="M-60 -40 l60 -10 M0 20 l50 -10" stroke="#8E2E1E" stroke-width="6"/>`);
  if (o.grind) {
    s += g('translate(1300 760)', `<ellipse rx="220" ry="60" fill="#9C978F" ${S} stroke-width="6"/><ellipse cx="0" cy="-10" rx="140" ry="30" fill="#C0392B" opacity=".8"/>`) + g(`translate(${f1(1300 + Math.sin(c.t * 5) * 60)} 690)`, `<ellipse rx="70" ry="40" fill="#B8B2A8" ${S} stroke-width="5"/>`);
    s += pop(1580, 380, c.t, 0.4, g('rotate(-10) scale(1.3)', icon('hand', c.t).replace(/#E9C9A6/g, '#C0392B')));
  }
  return s;
};
SCN.blombos = (c, o) => {
  const st = o.step || 1;
  let s = paper();
  if (st === 1) {
    s += g('translate(960 560) scale(2.4)', `<path d="M-160 30 L-140 -40 L60 -60 L170 -20 L160 40 L-60 70 Z" fill="#B8432E" ${S} stroke-width="5"/>`);
    const p = clamp(c.t / 1.2); let d = ''; for (let i = 0; i < 9; i++) { if (i / 9 > p) break; d += `M${600 + i * 80} 470 l80 160 M${680 + i * 80} 470 l-80 160 `; } s += `<path d="${d}" stroke="#F2D8C8" stroke-width="7" stroke-linecap="round"/><path d="M590 550 H1330" stroke="#F2D8C8" stroke-width="6"/>`;
    return s + hand('ENGRAVED OCHRE · ~75,000 YEARS', 960, 180, 70, c.t, 0.3);
  }
  s += g('translate(960 560) scale(2.4)', `<path d="M-150 40 L-110 -60 L120 -70 L160 30 L40 80 Z" fill="#C9C2B0" ${S} stroke-width="5"/>`);
  const p = clamp(c.t / 1.0); let d = ''; for (let i = 0; i < 6; i++) { if (i / 6 > p) break; d += `M${700 + i * 70} 470 l60 140 M${760 + i * 70} 470 l-60 140 `; } s += `<path d="${d}" stroke="#C0392B" stroke-width="10" stroke-linecap="round"/>`;
  return s + hand('THE OLDEST DRAWING · ~73,000 YEARS', 960, 180, 70, c.t, 0.3);
};
SCN.sungir = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#7A5E44"/>` + grave(960, 600, 760, 300, c.t);
  s += `<ellipse cx="960" cy="600" rx="560" ry="160" fill="#C0392B" opacity=".25"/>`;
  s += g('translate(1020 600) scale(.95)', wrapped(1, '#A8743E', !!o.beads)) + g('translate(900 600) scale(-.95 .95)', wrapped(1, '#A8743E', !!o.beads));
  if (o.spears) s += `<path d="M300 440 L1620 400" stroke="#FFFDF2" stroke-width="16" stroke-linecap="round"/><path d="M300 440 L1620 400" fill="none" ${S} stroke-width="3"/><path d="M320 780 L1600 800" stroke="#FFFDF2" stroke-width="16" stroke-linecap="round"/><path d="M320 780 L1600 800" fill="none" ${S} stroke-width="3"/>`;
  return s + hand(o.beads ? 'THOUSANDS OF IVORY BEADS' : 'SUNGIR · ~34,000 YEARS', 960, 150, 76, c.t, 0.3, { col: '#FFF3D6' });
};

// ---------- art ----------
function caveWall(t) { let s = `<rect width="${W}" height="${H}" fill="#C9A97A"/>`; const r = rng(23); for (let i = 0; i < 40; i++) s += `<ellipse cx="${f1(r() * W)}" cy="${f1(r() * H)}" rx="${f1(60 + r() * 140)}" ry="${f1(30 + r() * 60)}" fill="#B8956A" opacity=".5"/>`; return s; }
function redPig(s = 1) { return g(`scale(${s})`, `<path d="M-200 0 Q-180 -110 0 -120 Q160 -120 200 -40 Q220 20 180 40 L-170 40 Q-210 30 -200 0 Z" fill="none" stroke="#9C2E26" stroke-width="12"/><path d="M200 -40 l40 10 l-10 30 Z M-150 40 v60 M-90 40 v60 M110 40 v60 M160 40 v60 M120 -110 l20 -30" fill="none" stroke="#9C2E26" stroke-width="12" stroke-linecap="round"/><path d="M-120 -60 l30 20 M-40 -80 l20 30 M40 -80 l10 30" stroke="#9C2E26" stroke-width="8"/>`); }
function tinyFig(x, y, s = 1, beak = false) { return g(`translate(${x} ${y}) scale(${s})`, `<path d="M0 -60 V20 M0 20 l-20 50 M0 20 l20 50 M0 -40 l-30 30 M0 -40 l34 -20" stroke="#9C2E26" stroke-width="9" stroke-linecap="round" fill="none"/>` + (beak ? `<circle cx="0" cy="-74" r="14" fill="#9C2E26"/><path d="M10 -78 l34 6 l-30 8 Z" fill="#9C2E26"/><path d="M0 18 q-30 10 -40 40" fill="none" stroke="#9C2E26" stroke-width="8"/>` : `<circle cx="0" cy="-74" r="14" fill="#9C2E26"/>`)); }
SCN.caveArt = (c, o) => {
  let s = caveWall(c.t);
  if (o.mode === 'hunt') { s += g('translate(820 520)', redPig(1.1)) + g('translate(1420 600)', redPig(0.7)); [[460, 640, 1, true], [560, 700, 0.9, false], [1120, 700, 0.9, true], [1240, 720, 0.8, true], [1650, 720, 0.8, false]].forEach(([x, y, k, b], i) => { s += pop(x, y, c.t, 0.2 + i * 0.12, tinyFig(0, 0, k, b)); }); }
  else { s += g('translate(1000 560)', redPig(1.4)); [[560, 620], [680, 600], [820, 840]].forEach(([x, y], i) => { s += pop(x, y, c.t, 0.3 + i * 0.2, tinyFig(0, 0, 1.0)); }); s += [[300, 300], [1600, 260]].map(([x, y]) => g(`translate(${x} ${y}) scale(.9) rotate(-15)`, icon('hand', c.t).replace(/#E9C9A6/g, '#B8432E').replace(new RegExp(C.ink, 'g'), '#9C2E26'))).join(''); }
  return s + hand(o.mode === 'hunt' ? '44,000+ YEARS' : '51,000+ YEARS', 960, 150, 80, c.t, 0.4, { col: C.text });
};
SCN.therian = (c, o) => {
  let s = caveWall(c.t);
  if (o.glow) s += `<circle cx="960" cy="560" r="${f1(330 + Math.sin(c.t * 2) * 20)}" fill="#FFF3C4" opacity=".35"/>`;
  s += pop(960, 620, c.t, 0.1, tinyFig(0, 0, 4.2, true));
  return s + hand('PART HUMAN, PART ANIMAL', 960, 150, 80, c.t, 0.4);
};
SCN.lionMan = (c, o) => {
  if (o.broken) { let s = paper(); const r = rng(13); for (let i = 0; i < 70; i++) { const x = 560 + r() * 800, y = 400 + r() * 420; s += pop(x, y, c.t, i * 0.01, `<path d="M-14 -10 L12 -14 L18 8 L-6 16 Z" fill="#EDE2C8" ${S} stroke-width="3" transform="rotate(${f1(r() * 360)})"/>`); } return s + hand('HUNDREDS OF PIECES', 960, 200, 84, c.t, 0.3); }
  let s = paper() + `<ellipse cx="960" cy="960" rx="240" ry="34" fill="${C.ink}" opacity=".1"/>`;
  s += g('translate(960 560) scale(1.5)', `<path d="M-70 -140 Q-80 -40 -60 60 L-50 240 H-10 L0 120 L10 240 H50 L60 60 Q80 -40 70 -140 Z" fill="#EDE2C8" ${S} stroke-width="6"/><path d="M-70 -120 L-100 60 M70 -120 L100 60" stroke="${C.ink}" stroke-width="30" stroke-linecap="round"/><path d="M-70 -120 L-100 60 M70 -120 L100 60" stroke="#EDE2C8" stroke-width="20" stroke-linecap="round"/>` +
    `<path d="M-70 -150 Q-80 -260 0 -270 Q80 -260 70 -150 Q40 -120 0 -120 Q-40 -120 -70 -150 Z" fill="#EDE2C8" ${S} stroke-width="6"/><circle cx="-60" cy="-262" r="18" fill="#EDE2C8" ${S} stroke-width="5"/><circle cx="60" cy="-262" r="18" fill="#EDE2C8" ${S} stroke-width="5"/><ellipse cx="0" cy="-162" rx="40" ry="28" fill="#F3EAD4" ${S} stroke-width="4"/><path d="M-30 -204 h16 M14 -204 h16" fill="none" ${S} stroke-width="5"/><path d="M-10 -172 L10 -172 L0 -160 Z" fill="#8E7E62"/><path d="M0 -160 v10 M0 -150 q-14 10 -24 2 M0 -150 q14 10 24 2" fill="none" ${S} stroke-width="3.5"/>` + [-1, 1].map(k => `<path d="M${k * 30} -158 l${k * 30} -6 M${k * 30} -152 l${k * 30} 4" stroke="#8E7E62" stroke-width="2.5"/>`).join('') +
    [-50, -30, 30, 50].map(x => `<path d="M${x - 8} ${-60} h16" stroke="#B8AA8A" stroke-width="5"/>`).join(''));
  if (o.carve) { s += g(`translate(${f1(1300 + Math.sin(c.t * 8) * 14)} 520) rotate(-30)`, `<path d="M0 0 L60 -24 L70 6 Z" fill="#7E7A72" ${S} stroke-width="4"/>`) + g('translate(1500 300)', `<circle r="90" fill="#FFFFFF" ${S} stroke-width="6"/>` + clock(0, 0, 80, Math.floor(c.t * 4) % 12, (c.t * 240) % 60)) + hand('HUNDREDS OF HOURS', 1500, 460, 60, c.t, 0.3, { col: C.accent }); }
  if (o.label) s += hand('THE LION MAN · ~40,000 YEARS', 960, 140, 76, c.t, 0.2);
  return s;
};
SCN.flute = (c, o) => {
  let s = o.play ? caveRoom(c.t) + lamp(500, 960, c.t, 1.1) : paper();
  if (!o.play) return s + g('translate(960 560) rotate(-12)', `<rect x="-500" y="-36" width="1000" height="72" rx="36" fill="#EDE2C8" ${S} stroke-width="6"/>` + [-280, -160, -40, 80, 200].map(x => `<circle cx="${x}" cy="0" r="14" fill="#6E5A44"/>`).join('') + `<path d="M380 -36 v72" ${S} stroke-width="4"/>`) + hand('BONE FLUTE · ~40,000 YEARS', 960, 180, 76, c.t, 0.3);
  s += person({ x: 900, y: 990, s: 1.5, t: c.t, seed: 4, face: 'happy', la: [60, 120], ra: [40, 110], armsFront: true, front: (L, R) => `<path d="M${f1(L[0] - 10)} ${f1(L[1])} L${f1(R[0] + 220)} ${f1(R[1] - 40)}" stroke="#EDE2C8" stroke-width="16" stroke-linecap="round"/>` });
  for (let i = 0; i < 4; i++) { const p = (c.t * 0.5 + i / 4) % 1; s += `<text x="${f1(1200 + p * 300)}" y="${f1(560 - p * 300 + Math.sin(p * 9) * 20)}" font-family="Hand" font-size="80" fill="#F2C443" opacity="${f1(1 - p)}">♪</text>`; }
  return s;
};
SCN.echoCave = (c, o) => {
  let s = caveRoom(c.t) + `<rect x="0" y="200" width="${W}" height="660" fill="#6E5A44" opacity=".5"/>`;
  const art = [[460, 420, 0.5], [1200, 380, 0.6], [1600, 520, 0.45]];
  art.forEach(([x, y, k], i) => { const glow = o.sing ? 0.3 + 0.3 * Math.max(0, Math.sin(c.t * 3 - i)) : 0; s += `<circle cx="${x}" cy="${y}" r="${f1(220 * k * 1.6)}" fill="#F7B84A" opacity="${f1(glow)}"/>` + g(`translate(${x} ${y})`, redPig(k).replace(/#9C2E26/g, i === 1 ? '#2B2118' : '#9C2E26')); });
  s += lamp(700, 980, c.t, 1.0);
  s += person({ x: 900, y: 990, s: 1.4, t: c.t, seed: 5, long: true, hairC: C.hair2, face: o.sing ? 'surprised' : 'think', la: [-14, -6], ra: o.strike ? [-120, -160] : [14, 6], holdR: o.strike ? (e => `<path d="M${f1(e[0])} ${f1(e[1])} l120 -120" stroke="${C.woodD}" stroke-width="10" stroke-linecap="round"/>`) : null });
  if (o.sing) for (let i = 0; i < 4; i++) { const p = (c.t * 0.7 + i / 4) % 1; s += `<circle cx="960" cy="560" r="${f1(80 + p * 900)}" fill="none" stroke="#F3EBDD" stroke-width="5" opacity="${f1(0.6 * (1 - p))}"/>`; }
  if (o.strike) { s += `<path d="M1100 200 l30 440 l30 -440 Z" fill="#B9A88A" ${S} stroke-width="5"/>`; for (let i = 0; i < 3; i++) s += `<path d="M${1180 + i * 30} ${520 - i * 20} q30 30 0 60" fill="none" stroke="#F3EBDD" stroke-width="6" opacity="${f1(0.4 + 0.6 * Math.abs(Math.sin(c.t * 6 + i)))}"/>`; }
  return s;
};

// ---------- shamans ----------
SCN.trance = (c, o) => {
  let s = bgNight(c.t, { seed: 621 }) + `<ellipse cx="960" cy="920" rx="780" ry="200" fill="#F28C28" opacity=".28"/>` + fire(960, 920, 0.8, c.t);
  s += today(() => {
    let p = '';
    const clap = o.clap ? Math.abs(Math.sin(c.t * 7)) : 0.5;
    [[620, 1000], [800, 1040], [1120, 1040], [1300, 1000]].forEach(([x, y], i) => { p += person({ x, y, s: 1.0, t: c.t, seed: 5 + i * 3, long: true, face: 'happy', ...sit, la: [lerp(30, 70, clap), lerp(80, 120, clap)], ra: [lerp(-30, -70, clap), lerp(-80, -120, clap)], armsFront: true, flip: x > 960 }); });
    if (o.dance || o.heal) for (let i = 0; i < 3; i++) { const a = c.t * 0.5 + i * 2.1, x = 960 + Math.cos(a) * 640, y = 900 + Math.sin(a) * 90, k = Math.sin(c.t * 8 + i) * 18; p += (o.glow ? `<circle cx="${f1(x)}" cy="${f1(y - 240)}" r="150" fill="#FFF3C4" opacity=".3"/>` : '') + person({ x, y, s: 1.05, t: c.t, seed: 2 + i * 4, face: o.glow ? 'sleep' : 'happy', ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-40 - k, -60], ra: [40 + k, 60], flip: Math.sin(a) < 0 }); }
    if (o.heal) p += person({ x: 1500, y: 990, s: 1.1, t: c.t, seed: 14, face: 'sleep', la: [-14, -6], ra: [-100, -120], flip: true }) + person({ x: 1640, y: 1000, s: 1.0, t: c.t, seed: 8, face: 'tired', ...sit, la: [40, 80], ra: [40, 80], flip: true });
    return p;
  });
  return s;
};
SCN.rockArt = c => {
  let s = caveWall(c.t);
  s += g('translate(1200 520) scale(1.3)', `<path d="M-180 0 Q-170 -90 0 -100 Q150 -100 200 -40 Q230 0 200 40 L-170 40 Q-200 30 -180 0 Z" fill="#8E3A24"/><path d="M200 -40 L260 -120 M210 -50 L250 -140 M-150 40 v80 M-90 40 v80 M120 40 v80 M170 40 v80" stroke="#8E3A24" stroke-width="12" stroke-linecap="round"/><path d="M-100 -60 Q0 -40 120 -60" stroke="#EDE2C8" stroke-width="10"/>`);
  for (let i = 0; i < 5; i++) s += g(`translate(${280 + i * 110} ${640 - (i % 2) * 20}) rotate(${i === 2 ? 30 : 0})`, `<path d="M0 -140 V40 M0 40 l-16 70 M0 40 l16 70 M0 -100 l-40 60 M0 -100 l40 -40" stroke="#8E3A24" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="0" cy="-156" r="14" fill="#8E3A24"/>` + (i === 2 ? `<path d="M-6 -120 q-30 20 -50 -10" fill="none" stroke="#C0392B" stroke-width="6"/>` : ''));
  return s + hand('SOUTHERN AFRICAN ROCK ART', 960, 150, 76, c.t, 0.3);
};
function tortoise(s = 1) { return g(`scale(${s})`, `<ellipse rx="60" ry="40" fill="#8E7A4A" ${S} stroke-width="4"/><path d="M-30 -20 l20 0 l10 18 l-10 18 l-20 0 l-10 -18 Z M10 -20 l20 0 l10 18 l-10 18 l-20 0 l-10 -18 Z" fill="none" stroke="#5C4C2C" stroke-width="3"/>`); }
SCN.shamanGrave = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 620, 300, c.t) + g('translate(760 600) scale(1.05)', wrapped(1, '#C9A97A'));
  s += `<path d="M680 540 Q600 500 640 470 Q700 470 700 520" fill="#B9B2A6" ${S} stroke-width="4"/>`;
  if (o.items) { const r = rng(3); for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; s += pop(960 + Math.cos(a) * 540, 600 + Math.sin(a) * 250, c.t, 0.05 + i * 0.04, tortoise(0.7)); } s += pop(1300, 600, c.t, 0.8, `<path d="M-120 0 Q0 -60 120 0 Q0 30 -120 0 Z" fill="#6E5A44" ${S} stroke-width="4"/>` + [0, 1, 2, 3, 4].map(k => `<path d="M${-90 + k * 40} -6 l20 30" stroke="#4A3C30" stroke-width="5"/>`).join('')) + hand('50 TORTOISE SHELLS', 960, 140, 76, c.t, 0.4, { col: '#FFF3D6' }); }
  return s;
};
SCN.feast = (c, o) => {
  let s = kalahari(c.t, { sky: ['#C9785A', '#F2C08A'], hills: '#8E6A5A', ground: '#B98E5A', trees: false }) + `<ellipse cx="960" cy="900" rx="700" ry="160" fill="#F28C28" opacity=".22"/>` + fire(960, 900, 0.9, c.t);
  s += `<path d="M760 760 L1160 760" stroke="${C.woodD}" stroke-width="12"/><path d="M780 900 L780 740 M1140 900 L1140 740" stroke="${C.woodD}" stroke-width="12"/>` + g('translate(960 760)', o.pigs ? `<ellipse rx="150" ry="70" fill="#C9785A" ${S} stroke-width="5"/><circle cx="-150" cy="-10" r="44" fill="#C9785A" ${S} stroke-width="5"/>` : meat(1.4, 5));
  [[380, 'laugh'], [560, 'happy'], [1360, 'laugh'], [1560, 'happy']].forEach(([x, f], i) => { s += person({ x, y: 990, s: 1.0, t: c.t, seed: 3 + i * 4, face: f, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, ...sit, la: [40, 80], ra: [60 + Math.sin(c.t * 4 + i) * 30, 120], flip: x > 960 }); });
  return s;
};

// ---------- animism ----------
SCN.animism = (c, o) => {
  const st = o.step || 1, night = st === 5;
  let s = night ? bgNight(c.t, { seed: 631 }) : kalahari(c.t, { sky: ['#9FCBE5', '#F6EBD2'] });
  if (!night) {
    s += `<path d="M0 820 Q480 760 960 800 T1920 780 V860 Q1400 880 960 860 T0 900 Z" fill="#6FB5E0" ${S} stroke-width="5"/>`;
    s += acacia(1500, 760, 1.0) + g('translate(700 760) scale(.9)', antelope(false, c.t));
  }
  if (st >= 2 && !night) [[700, 560], [1500, 440], [400, 820], [1200, 820], [1750, 300]].forEach(([x, y], i) => { s += spirit(x, y, c.t, 1.0, i); });
  if (st === 1) s += spirit(700, 600, c.t, 1.6);
  if (st === 3) s += person({ x: 380, y: 980, s: 1.3, t: c.t, seed: 4, face: 'think', la: [-40, -100], ra: [40, 100], armsFront: true }) + spirit(700, 600, c.t, 1.3);
  if (st === 4) s += person({ x: 1100, y: 990, s: 1.3, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', ...sit, la: [60, 110], ra: [60, 110], armsFront: true }) + spirit(1100, 840, c.t, 1.4);
  if (night) { s += person({ x: 900, y: 990, s: 1.4, t: c.t, seed: 4, face: 'surprised', la: [-14, -6], ra: [-150, -170] }) + kid({ x: 1080, y: 1000, s: 1.4, t: c.t, seed: 9, face: 'surprised', la: [-14, -6], ra: [-150, -170] }); for (let i = 0; i < 9; i++) s += `<circle cx="${300 + i * 170}" cy="${120 + (i * 53) % 260}" r="${f1(5 + Math.abs(Math.sin(c.t * 2 + i)) * 4)}" fill="#FFF6D8"/>`; }
  return s;
};
SCN.beliefChart = (c, o) => {
  const st = o.step || 1;
  const rows = [['ANIMISM', 100], ['AFTERLIFE', 79], ['SHAMANS', 79], ['A JUDGING SKY GOD', 15]];
  let s = paper() + hand('33 HUNTER-GATHERER SOCIETIES', 960, 170, 76, c.t, DONE);
  rows.forEach(([lab, v], i) => {
    if (i >= st) return;
    const y = 320 + i * 160, p = i === st - 1 ? eout(clamp(c.t / 0.8)) : 1;
    s += `<rect x="760" y="${y}" width="${f1(900 * v / 100 * p)}" height="90" rx="12" fill="${i === 3 ? '#C9C2B0' : C.accent}" ${S} stroke-width="5"/>` + hand(lab, 730, y + 64, 56, 1, DONE, { anchor: 'end' }) + `<text x="${f1(780 + 900 * v / 100 * p)}" y="${y + 64}" font-family="Hand" font-size="56" fill="${C.text}" opacity="${f1(p)}">${v}%</text>`;
  });
  return s;
};

// ---------- monuments ----------
SCN.gobekli = (c, o) => {
  let s = kalahari(c.t, { sky: ['#9FCBE5', '#F6EBD2'], hills: '#D9C68E', ground: '#D8B87A', trees: false });
  s += `<ellipse cx="960" cy="880" rx="820" ry="190" fill="#B89C6A" ${S} stroke-width="6"/>`;
  const wall = (y0, back) => { let w = ''; for (let i = 0; i < 26; i++) { const a = Math.PI * (back ? 1 + i / 25 : i / 25), x = 960 + Math.cos(a) * 800, y = 880 + Math.sin(a) * 180; w += `<rect x="${f1(x - 40)}" y="${f1(y - 70)}" width="80" height="70" rx="10" fill="#C9B48E" ${S} stroke-width="4"/>`; } return w; };
  s += wall(0, true);
  [[520, 820, 0.55], [760, 760, 0.55], [1160, 760, 0.55], [1400, 820, 0.55]].forEach(([x, y, k]) => { s += g(`translate(${x} ${y})`, tPillar(k)); });
  s += g('translate(840 900)', tPillar(1.0, { animals: true })) + g('translate(1100 900)', tPillar(1.0, { arms: true }));
  s += wall(0, false);
  if (o.haul) {
    const x = 120 + (c.t * 30) % 120;
    s += `<rect y="980" width="${W}" height="100" fill="#D8B87A"/>` + g(`translate(${f1(x + 260)} 1050) rotate(-90) scale(.45)`, tPillar(1));
    for (let i = 0; i < 4; i++) s += person({ x: x + 560 + i * 130, y: 1070, s: 0.7, t: c.t, seed: 2 + i * 3, face: 'tired', la: [-60, -80], ra: [-60, -80] });
    s += `<path d="M${f1(x + 420)} 1010 L${f1(x + 960)} 960" stroke="#8E6A4A" stroke-width="6"/>`;
  }
  return s;
};
SCN.gobekliPillar = (c, o) => {
  let s = kalahari(c.t, { sky: ['#9FCBE5', '#F6EBD2'], hills: '#D9C68E', ground: '#D8B87A', trees: false });
  return s + g('translate(960 1000) scale(1.35)', tPillar(1, { animals: o.animals, arms: o.arms })) + (o.animals ? hand('FOX · BOAR · SNAKE · VULTURE', 960, 110, 64, c.t, 0.3) : '');
};
SCN.newgrange = (c, o) => {
  let s = `<defs><linearGradient id="ngs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.dawn || o.beam ? '#E89A62' : '#9FCBE5'}"/><stop offset="1" stop-color="${o.dawn || o.beam ? '#FBE3B5' : '#E6F2F2'}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#ngs)"/>`;
  if (o.dawn || o.beam) s += `<circle cx="200" cy="700" r="90" fill="#F7883A"/>`;
  s += `<rect y="720" width="${W}" height="360" fill="#7FA34E"/><path d="M360 760 Q960 300 1560 760 Z" fill="#6E9A5A" ${S} stroke-width="7"/><path d="M420 760 Q960 640 1500 760 L1500 700 Q960 580 420 700 Z" fill="#F3F1EA" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 18; i++) s += `<circle cx="${440 + i * 60}" cy="${f1(730 - Math.sin(i / 17 * Math.PI) * 50)}" r="${12 + (i % 3) * 3}" fill="#B9B2A6" ${S} stroke-width="3"/>`;
  s += `<rect x="560" y="640" width="90" height="120" fill="#2B2118" ${S} stroke-width="5"/><rect x="560" y="600" width="90" height="30" fill="#2B2118" ${S} stroke-width="4"/>`;
  if (o.beam) {
    s += `<path d="M650 720 L1220 650 L1220 760 L650 760 Z" fill="#3E2E20" opacity=".8"/><circle cx="1260" cy="690" r="80" fill="#3E2E20" opacity=".85"/>`;
    const p = eout(clamp(c.t / 1.2));
    s += `<path d="M200 700 L${f1(lerp(650, 1290, p))} ${f1(lerp(612, 690, p))} L${f1(lerp(650, 1290, p))} ${f1(lerp(628, 712, p))} Z" fill="#FFE29A" opacity=".85"/>` + (p > 0.95 ? `<circle cx="1260" cy="690" r="70" fill="#FFE29A" opacity=".5"/>` : '');
    s += hand('MIDWINTER SUNRISE', 960, 200, 84, c.t, 0.3);
  }
  return s;
};
SCN.stonehenge = (c, o) => {
  const eve = !!o.winter;
  let s = `<defs><linearGradient id="shs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${eve ? '#5A4A7A' : '#F2A86A'}"/><stop offset="1" stop-color="${eve ? '#F28C5A' : '#FCE8C4'}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#shs)"/>`;
  if (o.summer || o.winter) s += `<circle cx="960" cy="${f1(eve ? lerp(560, 700, clamp(c.t / 2)) : lerp(740, 600, clamp(c.t / 2)))}" r="90" fill="${eve ? '#F7883A' : '#FFD27A'}"/>`;
  s += `<rect y="720" width="${W}" height="360" fill="#8FA45E"/>`;
  const tri = (x, k) => g(`translate(${x} 760) scale(${k})`, `<rect x="-110" y="-300" width="80" height="300" fill="#9C978F" ${S} stroke-width="6"/><rect x="30" y="-300" width="80" height="300" fill="#9C978F" ${S} stroke-width="6"/><rect x="-130" y="-350" width="260" height="56" fill="#A8A296" ${S} stroke-width="6"/>`);
  s += tri(420, 0.8) + tri(700, 1.0) + tri(1220, 1.0) + tri(1500, 0.8) + g('translate(960 760)', `<rect x="-160" y="-300" width="80" height="300" fill="#9C978F" ${S} stroke-width="6"/><rect x="80" y="-300" width="80" height="300" fill="#9C978F" ${S} stroke-width="6"/>`);
  if (o.haul) {
    const x = 1700 - (c.t * 40) % 300;
    s += g(`translate(${f1(x)} 990)`, `<rect x="-160" y="-60" width="320" height="70" rx="10" fill="#7E8C96" ${S} stroke-width="6"/><rect x="-200" y="10" width="400" height="20" fill="${C.woodD}"/>`);
    for (let i = 0; i < 3; i++) s += person({ x: x - 320 - i * 130, y: 1040, s: 0.75, t: c.t, seed: 2 + i * 3, face: 'tired', flip: true, la: [-60, -80], ra: [-60, -80] });
    s += hand('BLUESTONES FROM WALES', 960, 180, 76, c.t, 0.3);
  } else if (o.summer || o.winter) s += hand(eve ? 'MIDWINTER SUNSET' : 'MIDSUMMER SUNRISE', 960, 180, 84, c.t, 0.3, { col: '#FFFFFF' });
  return s;
};

// ---------- why ----------
SCN.circleDance = (c, o) => {
  let s = paper() + `<rect y="860" width="${W}" height="220" fill="#E0D6C4"/>`;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + c.t * 0.4, x = 960 + Math.cos(a) * 520, y = 900 + Math.sin(a) * 70, ph = o.sync ? c.t * 5 : c.t * (4 + i * 0.7) + i * 2, k = Math.sin(ph) * 30;
    s += person({ x, y: y + 60, s: 0.95 + Math.sin(a) * 0.08, kind: 'modern', t: c.t, seed: 3 + i * 3, face: 'laugh', shirt: ['#3E7FA6', '#C9573E', '#7A4E8A', '#5E8A3C', '#E6B33C', '#B85C3A'][i], ll: [-k * 0.5, -k * 0.3], rl: [k * 0.5, k * 0.3], la: [-140 + k, -160], ra: [140 + k, 160] });
  }
  return s + (o.sync ? hand('IN SYNC', 960, 200, 100, c.t, 0.3, { col: C.accent }) : '');
};
function dog(s = 1, t = 0, o = {}) { return g(`scale(${s})`, `<ellipse cx="0" cy="0" rx="90" ry="40" fill="#B98A5A" ${S} stroke-width="5"/><circle cx="-90" cy="-30" r="38" fill="#B98A5A" ${S} stroke-width="5"/><path d="M-110 -60 l-10 -30 l24 18 Z" fill="#8E6A4A" ${S} stroke-width="4"/><ellipse cx="-124" cy="-22" rx="16" ry="12" fill="#8E6A4A"/><circle cx="-130" cy="-26" r="5" fill="${C.ink}"/>` + (o.sleep ? `<path d="M-100 -36 q6 4 12 0" fill="none" ${S} stroke-width="3"/>` : `<circle cx="-96" cy="-38" r="5" fill="${C.ink}"/>`) + `<path d="M90 -10 q40 -20 50 -40" fill="none" stroke="#B98A5A" stroke-width="10" stroke-linecap="round"/><path d="M-50 36 v40 M-20 36 v40 M40 36 v40 M66 36 v40" ${S} stroke-width="8"/>`); }
SCN.dogGrave = (c, o) => {
  if (o.care) {
    let s = bgNight(c.t, { seed: 641 }) + `<ellipse cx="960" cy="960" rx="700" ry="160" fill="#F28C28" opacity=".24"/>` + fire(1400, 970, 0.6, c.t);
    s += person({ x: 760, y: 990, s: 1.4, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'sad', ...sit, la: [60, 110], ra: [60, 110], armsFront: true });
    s += g('translate(960 960)', `<path d="M-130 30 Q0 -20 130 30 Q0 70 -130 30 Z" fill="#A8743E" ${S} stroke-width="5"/>` + dog(0.8, c.t, { sleep: true }));
    return s + hand('NURSED FOR WEEKS', 960, 300, 84, c.t, 0.3, { col: '#F3EBDD' });
  }
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 700, 320, c.t);
  s += g('translate(560 520) scale(.8)', wrapped(1, '#C9A97A')) + g('translate(1360 680) scale(-.8 .8)', wrapped(1, '#A8743E')) + g('translate(1000 760)', dog(0.9, c.t, { sleep: true }));
  return s + hand('OBERKASSEL · ~14,000 YEARS', 960, 150, 76, c.t, 0.3, { col: '#FFF3D6' });
};

// Extra card icon: star.
(function () {
  const ic = window.icon;
  window.icon = function (name, t = 0) {
    if (name === 'star') return `<path d="M0 -100 L24 -32 L96 -32 L38 10 L60 80 L0 38 L-60 80 L-38 10 L-96 -32 L-24 -32 Z" fill="#F2C443" ${S} stroke-width="6" transform="rotate(${f1(Math.sin(t) * 6)})"/>`;
    return ic(name, t);
  };
})();

// ---------- added scenes ----------
SCN.birdMan = (c, o) => {
  let s = caveWall(c.t);
  s += g('translate(760 600) rotate(-35) scale(2.0)', `<path d="M0 -80 V60 M0 60 l-26 70 M0 60 l20 70 M0 -50 l-40 40 M0 -50 l40 30" stroke="#2B2118" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="0" cy="-96" r="14" fill="#2B2118"/><path d="M8 -100 l26 -6 l-24 14 Z" fill="#2B2118"/>`);
  s += g('translate(400 820)', `<path d="M0 0 V-120" stroke="#2B2118" stroke-width="8"/><path d="M-20 -140 q20 -30 40 0 q-20 10 -40 0 Z" fill="#2B2118"/>`);
  if (o.bison) s += pop(1300, 560, c.t, 0.2, `<path d="M-260 40 Q-280 -120 -100 -160 Q60 -200 200 -120 Q280 -60 260 40 Q120 80 -260 40 Z" fill="#2B2118" opacity=".85"/><path d="M200 -120 q60 -40 50 -100 M-200 40 v100 M-120 40 v100 M140 40 v100 M210 40 v100" stroke="#2B2118" stroke-width="16" stroke-linecap="round" fill="none"/>`);
  return s + hand('LASCAUX · ~21,000 YEARS', 960, 150, 76, c.t, 0.3);
};
SCN.sorcerer = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#3A2E24"/><path d="M0 0 H1920 V700 Q960 600 0 760 Z" fill="#8E7660"/>`;
  const r = rng(29); for (let i = 0; i < 16; i++) s += g(`translate(${f1(100 + r() * 1700)} ${f1(420 + r() * 260)}) scale(${f1(0.25 + r() * 0.2)})`, redPig(1).replace(/#9C2E26/g, '#4A3C30'));
  if (o.glow) s += `<circle cx="960" cy="220" r="${f1(200 + Math.sin(c.t * 2) * 12)}" fill="#FFF3C4" opacity=".3"/>`;
  s += g('translate(960 260) scale(1.3)', `<path d="M-40 -40 Q-60 40 -40 120 L40 120 Q60 40 40 -40 Z" fill="#2B2118" opacity=".85"/><circle cx="0" cy="-70" r="34" fill="#2B2118" opacity=".85"/><path d="M-20 -100 l-40 -60 l-20 10 M-40 -140 l-30 -10 M20 -100 l40 -60 l20 10 M40 -140 l30 -10" stroke="#2B2118" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="-12" cy="-74" r="6" fill="#F3EBDD"/><circle cx="12" cy="-74" r="6" fill="#F3EBDD"/><path d="M-30 120 l-14 70 M30 120 l14 70 M-40 0 l-50 30 M40 0 l50 30 M40 90 q60 10 70 50" stroke="#2B2118" stroke-width="10" stroke-linecap="round" fill="none"/>`);
  return s + hand('"THE SORCERER" · ~15,000 YEARS', 960, 920, 64, c.t, 0.3, { col: '#F3EBDD' });
};
SCN.redLady = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 640, 280, c.t);
  s += `<ellipse cx="960" cy="600" rx="520" ry="150" fill="#C0392B" opacity=".35"/>` + g('translate(640 560)', skeleton(1.4, { curl: 0.2 })).replace(new RegExp(BONE, 'g'), '#E8B4A0');
  s += [0, 1, 2, 3].map(i => `<rect x="${1180 + i * 50}" y="460" width="20" height="160" rx="10" fill="#EDE2C8" ${S} stroke-width="4"/>`).join('');
  if (o.man) s += pop(1500, 300, c.t, 0.2, `<rect x="-300" y="-70" width="600" height="110" rx="16" fill="${C.paper}" ${S} stroke-width="5"/>` + hand('A YOUNG MAN', 0, 16, 72, 1, DONE, { col: C.red })) + xmark(960, 160, 60, c.t, 0.1);
  return s + hand('"THE RED LADY"', 960, 160, 80, c.t, 0.2, { col: '#FFF3D6' });
};
SCN.houseFloor = (c, o) => {
  let s = `<rect width="${W}" height="${H}" fill="#E6D6B8"/><rect x="200" y="180" width="1520" height="600" fill="#F1E6CF" ${S} stroke-width="8"/>`;
  s += `<rect x="260" y="560" width="520" height="90" fill="#E0CFAE" ${S} stroke-width="6"/><path d="M1300 780 V600 Q1320 520 1400 520 H1600 V780" fill="#F1E6CF" ${S} stroke-width="6"/>` + g('translate(1040 400)', `<path d="M-120 60 Q-140 -120 0 -160 Q140 -120 120 60 Z" fill="none" stroke="#C0392B" stroke-width="10"/>`) + fire(1450, 760, 0.4, c.t);
  s += person({ x: 900, y: 780, s: 1.0, t: c.t, seed: 5, long: true, hairC: C.hair2, face: 'happy', la: [-14, -6], ra: [14, 6] }) + kid({ x: 1080, y: 780, s: 1.0, t: c.t, seed: 9, face: 'happy', la: [-14, -6], ra: [14, 6] });
  if (o.cut) { s += `<rect x="200" y="780" width="1520" height="300" fill="#8E6A44"/>` + g('translate(380 900) scale(.55)', wrapped(1, '#C9A97A')) + g('translate(1400 920) scale(-.5 .5)', wrapped(1, '#A8743E')); s += hand('UNDER THE FLOOR', 960, 120, 76, c.t, 0.3); }
  else s += `<rect x="200" y="780" width="1520" height="300" fill="#C9B79A"/>` + hand('ÇATALHÖYÜK · ~9,000 YEARS', 960, 120, 70, c.t, 0.3);
  return s;
};
SCN.plasterHead = (c, o) => {
  let s = paper() + `<ellipse cx="960" cy="900" rx="280" ry="40" fill="${C.ink}" opacity=".1"/>`;
  s += g('translate(960 540) scale(1.6)', `<path d="M-120 -40 Q-130 -200 0 -210 Q130 -200 120 -40 Q110 100 40 170 Q0 190 -40 170 Q-110 100 -120 -40 Z" fill="#E6D3B0" ${S} stroke-width="6"/><path d="M-40 60 q10 -20 0 -60 M40 60 q-10 -20 0 -60" fill="none" stroke="#C9B48E" stroke-width="5"/><path d="M-30 110 Q0 126 30 110" fill="none" stroke="#B89C70" stroke-width="7" stroke-linecap="round"/><path d="M-8 20 Q0 70 8 20" fill="none" stroke="#C9B48E" stroke-width="6"/>` +
    (o.shells ? [-50, 50].map(x => `<ellipse cx="${x}" cy="-20" rx="30" ry="18" fill="#F7F3E8" ${S} stroke-width="4"/><path d="M${x - 22} -20 H${x + 22}" stroke="#8E7E62" stroke-width="3"/>` + [-12, 0, 12].map(k => `<path d="M${x + k} -24 v8" stroke="#8E7E62" stroke-width="2"/>`).join('')).join('') : [-50, 50].map(x => `<ellipse cx="${x}" cy="-20" rx="30" ry="18" fill="#C9B48E"/>`).join('')));
  return s + hand('JERICHO · ~9,000 YEARS', 960, 150, 76, c.t, 0.3);
};
SCN.puppyHand = c => {
  let s = `<rect width="${W}" height="${H}" fill="#9C7A55"/>` + grave(960, 600, 600, 280, c.t);
  s += g('translate(620 600) scale(.95)', wrapped(1, '#C9A97A'));
  s += g('translate(1180 560)', dog(0.55, c.t, { sleep: true }));
  s += `<path d="M960 600 Q1060 560 1110 560" fill="none" stroke="${C.ink}" stroke-width="18" stroke-linecap="round"/><path d="M960 600 Q1060 560 1110 560" fill="none" stroke="#E9C9A6" stroke-width="10" stroke-linecap="round"/><ellipse cx="1120" cy="556" rx="26" ry="18" fill="#E9C9A6" ${S} stroke-width="5"/>`;
  return s + hand('AIN MALLAHA · ~12,000 YEARS', 960, 150, 76, c.t, 0.3, { col: '#FFF3D6' });
};
