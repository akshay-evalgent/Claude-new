// Thumbnails in the Max cro format (measured from the channel's hits):
// - 2-3 word ALL-CAPS hook, heavy grotesque, yellow (#FFF51C -> #FBC70F), thick black outline, drop shadow,
//   cap height ~16% of the frame, across the top (or top-right when the hook is short)
// - one big hero (head ~25-30% of frame height) with one clear emotion, never covered by text
// - bright daylight scene, warm saturated palette, background slightly blurred, background action tells the story
'use strict';
const TW = 1920, THH = 1080;

function thumbText(lines, x, y, size, anchor = 'middle', maxW = 1800) {
  return lines.map((l, i) => `<text data-maxw="${maxW}" x="${x}" y="${y + i * size * 1.02}" font-family="Thumb" font-size="${size}" text-anchor="${anchor}" letter-spacing="2" fill="url(#tg)" stroke="#0D0A07" stroke-width="${f1(size * 0.13)}" stroke-linejoin="round" paint-order="stroke" filter="url(#tshadow)">${esc(l)}</text>`).join('');
}
function cloud(x, y, s) {
  return g(`translate(${x} ${y}) scale(${s})`, `<path d="${smooth([[-150, 20], [-130, -30], [-70, -50], [-30, -90], [40, -80], [80, -40], [140, -40], [170, 10], [120, 40], [-100, 40]])}" fill="#FFFFFF" stroke="#2B2118" stroke-opacity=".25" stroke-width="5"/>`);
}
function sunRays(x, y, n = 14, len = 1400) {
  let o = `<circle cx="${x}" cy="${y}" r="520" fill="url(#sunglow)"/>`;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360, d1 = dir(a - 3), d2 = dir(a + 3);
    o += `<path d="M${x} ${y} L${f1(x + d1[0] * len)} ${f1(y + d1[1] * len)} L${f1(x + d2[0] * len)} ${f1(y + d2[1] * len)} Z" fill="#FFFBE6" opacity=".16"/>`;
  }
  return o + `<circle cx="${x}" cy="${y}" r="70" fill="#FFF8D2"/>`;
}
function grassField(y0, seed, col = '#B98F3A') {
  const r = rng(seed); let p = '';
  for (let i = 0; i < 260; i++) {
    const x = r() * TW, y = y0 + 20 + Math.pow(r(), 0.7) * (THH - y0), h = 14 + (y - y0) * 0.09 * (0.6 + r());
    p += `M${f1(x)} ${f1(y)} q${f1(-4 + r() * 8)} ${f1(-h / 2)} ${f1(-6 + r() * 12)} ${f1(-h)} `;
  }
  return `<path d="${p}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round" opacity=".75"/>`;
}
function thumbWorld(o = {}) {
  o = Object.assign({ hz: 600, sky: ['#77C1E8', '#DDF1F3'], ground: ['#F0CF6C', '#D6A443'], hills: '#D9C68E', sunX: 1500, sunY: 260, seed: 3, trees: true }, o);
  const r = rng(o.seed);
  let s = `<defs><linearGradient id="tsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient>` +
    `<linearGradient id="tgnd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.ground[0]}"/><stop offset="1" stop-color="${o.ground[1]}"/></linearGradient></defs>`;
  s += `<rect width="${TW}" height="${o.hz + 40}" fill="url(#tsky)"/>` + sunRays(o.sunX, o.sunY);
  s += cloud(260, 170, 1.1) + cloud(980, 120, 0.8) + cloud(1750, 210, 0.9);
  const hp = [[-50, o.hz + 10]];
  for (let i = 0; i <= 8; i++) hp.push([i * 250 - 40, o.hz - 30 - r() * 80]);
  hp.push([2000, o.hz + 10]);
  s += `<path d="${smooth(hp, false)} L2000 ${o.hz + 40} L-50 ${o.hz + 40} Z" fill="${o.hills}"/>`;
  s += `<rect y="${o.hz}" width="${TW}" height="${THH - o.hz}" fill="url(#tgnd)"/>`;
  s += `<path d="M0 ${o.hz} Q480 ${o.hz - 8} 960 ${o.hz + 2} T1920 ${o.hz - 4}" fill="none" ${S} stroke-width="4" opacity=".6"/>`;
  if (o.trees) s += acacia(220, o.hz + 8, 0.7) + acacia(1700, o.hz + 6, 0.55) + acacia(1180, o.hz + 4, 0.35);
  s += grassField(o.hz, o.seed + 1);
  return s;
}
const legsOff = { ll: [-4, -2], rl: [4, 2] };

// Bigger, richer hero in the reference's style: thick-but-not-bloated outlines, furry tunic, sweat.
function thick(svg, k) { return svg.replace(/stroke-width="([\d.]+)"/g, (m, v) => `stroke-width="${f1(+v * k)}"`); }
function furTexture(seed, x0, x1, y0, y1, n = 70) {
  const r = rng(seed); let a = '', b = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), l = 6 + r() * 10, an = -0.6 + r() * 1.2;
    const seg = `M${f1(x)} ${f1(y)} q${f1(Math.sin(an) * l * 0.5 + 3)} ${f1(l * 0.5)} ${f1(Math.sin(an) * l)} ${f1(l)} `;
    if (i % 3) a += seg; else b += seg;
  }
  return `<path d="${a}" fill="none" stroke="#5E3A1A" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><path d="${b}" fill="none" stroke="#B88250" stroke-width="2" stroke-linecap="round" opacity=".9"/>`;
}
function vulture(x, y, s) { return g(`translate(${x} ${y}) scale(${s})`, `<path d="M-60 0 Q-30 -22 0 0 Q30 -22 60 0 Q30 -8 0 6 Q-30 -8 -60 0 Z" fill="#3C3330"/>`); }
function stink(x, y, n = 3, col = '#86A24E') {
  let o = '';
  for (let i = 0; i < n; i++) o += `<path d="M${x + (i - 1) * 60} ${y} q22 -26 0 -52 q-22 -26 0 -52" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" opacity=".85"/>`;
  return o;
}
function heroBig(o) {
  const s = o.s, k = 2.1 / s;
  const fur = () => furTexture(o.seed * 13 + 5, -48, 50, -278, -150, 90);
  return thick(person(Object.assign({ bob: 0, t: 1.3, holdL: fur }, o)), k);
}

// Night version of the thumbnail world, lit by a big moon and a campfire.
function thumbNight(o = {}) {
  o = Object.assign({ hz: 620, seed: 5, moonX: 1500, moonY: 230, sky: ['#3B3477', '#F4955A'], hills: '#6A4A6E', ground: '#8A6440', stars: 30 }, o);
  const r = rng(o.seed);
  let s = `<defs><linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.sky[0]}"/><stop offset="1" stop-color="${o.sky[1]}"/></linearGradient>` +
    `<radialGradient id="moonglow"><stop offset="0" stop-color="#FFF6D0" stop-opacity=".55"/><stop offset="1" stop-color="#FFF6D0" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="eyeg"><stop offset="0" stop-color="#FFE45C"/><stop offset="1" stop-color="#FFE45C" stop-opacity="0"/></radialGradient></defs>`;
  s += `<rect width="${TW}" height="${o.hz + 40}" fill="url(#nsky)"/>`;
  for (let i = 0; i < o.stars; i++) s += `<circle cx="${f1(r() * TW)}" cy="${f1(r() * (o.hz * 0.45))}" r="${f1(1.5 + r() * 3)}" fill="#FFF6D8" opacity="${f1(0.5 + r() * 0.5)}"/>`;
  s += `<circle cx="${o.moonX}" cy="${o.moonY}" r="260" fill="url(#moonglow)"/><circle cx="${o.moonX}" cy="${o.moonY}" r="95" fill="#FFF3C4" ${S} stroke-width="5"/><circle cx="${o.moonX - 30}" cy="${o.moonY - 20}" r="16" fill="#E9DDAA"/><circle cx="${o.moonX + 26}" cy="${o.moonY + 30}" r="11" fill="#E9DDAA"/>`;
  const hp = [[-50, o.hz + 10]];
  for (let i = 0; i <= 8; i++) hp.push([i * 250 - 40, o.hz - 30 - r() * 80]);
  hp.push([2000, o.hz + 10]);
  s += `<path d="${smooth(hp, false)} L2000 ${o.hz + 40} L-50 ${o.hz + 40} Z" fill="${o.hills}"/>`;
  s += `<rect y="${o.hz}" width="${TW}" height="${THH - o.hz}" fill="${o.ground}"/>`;
  return s;
}
function glowEyes(x, y, s = 1) {
  return g(`translate(${x} ${y}) scale(${s})`, `<path d="${smooth([[-150, 40], [-130, -40], [-60, -80], [40, -84], [130, -40], [150, 40]])}" fill="#1E2A1C" ${S} stroke-width="5"/>` +
    `<circle cx="-40" cy="-8" r="34" fill="url(#eyeg)" opacity=".7"/><circle cx="40" cy="-8" r="34" fill="url(#eyeg)" opacity=".7"/><ellipse cx="-40" cy="-8" rx="17" ry="12" fill="#FFE45C" ${S} stroke-width="3"/><ellipse cx="40" cy="-8" rx="17" ry="12" fill="#FFE45C" ${S} stroke-width="3"/><path d="M-40 -18 v20 M40 -18 v20" stroke="${C.ink}" stroke-width="5"/>`);
}
function sleeper(x, y, s = 1, col = C.tunic) {
  let b = `<path d="M120 -28 Q240 -50 370 -22 Q392 20 370 58 Q240 66 120 56 Q100 12 120 -28 Z" fill="${col}" ${S} stroke-width="6"/><path d="M360 14 Q440 4 500 12 L590 22 M360 44 Q450 44 510 44 L596 48" fill="none" stroke="${C.ink}" stroke-width="15" stroke-linecap="round"/>`;
  b += g('translate(70 -14) rotate(-14)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + hairCave(11, C.hair, false) + faceSvg('sleep', 1, 2));
  return g(`translate(${x} ${y}) scale(${s})`, b);
}
function rockPillow(s = 1) { return g(`scale(${s})`, `<path d="${smooth([[-110, 20], [-100, -50], [-30, -80], [60, -74], [112, -20], [100, 40], [10, 62], [-80, 52]])}" fill="#A8A296" ${S} stroke-width="5"/><path d="M-60 -40 q30 -14 60 -6 M30 20 q24 -6 40 6" fill="none" stroke="#D6D1C6" stroke-width="6" stroke-linecap="round"/>`); }
function leafBed(x, y, s = 1) {
  const r = rng(77); let o = `<path d="M-330 40 Q0 -40 330 40 Q0 90 -330 40 Z" fill="#D9C27A" ${S} stroke-width="5"/>`;
  for (let i = 0; i < 28; i++) { const lx = -280 + r() * 560, ly = 10 + r() * 30, a = -30 + r() * 60; o += g(`translate(${f1(lx)} ${f1(ly)}) rotate(${f1(a)}) scale(.7)`, `<path d="M-46 0 Q0 -26 46 0 Q0 26 -46 0 Z" fill="${['#5E8A3C', '#6F9A45', '#4E7A32'][i % 3]}" ${S} stroke-width="3.5"/><path d="M-40 0 H40" stroke="#3E6A2A" stroke-width="2.5"/>`); }
  return g(`translate(${x} ${y}) scale(${s})`, o);
}
function mozzie(x, y, s = 1) { return g(`translate(${x} ${y}) scale(${s})`, `<path d="M0 0 L40 6" ${S} stroke-width="3"/><ellipse cx="-4" cy="-12" rx="16" ry="6" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2.5" transform="rotate(-30)"/><ellipse cx="6" cy="-12" rx="16" ry="6" fill="#EAF2F5" stroke="${C.ink}" stroke-width="2.5" transform="rotate(30)"/><ellipse rx="15" ry="6" fill="#3C3330"/><path d="M-6 4 l-10 16 M2 5 l-4 18 M8 4 l6 16" ${S} stroke-width="2.5"/>`); }

const THUMBS = {
  wedRef() {
    let bg = thumbNight({ seed: 71, moonX: 1600, moonY: 200, sky: ['#7A6AAE', '#F6B27A'], hills: '#A07A6E', ground: '#C99A5A', stars: 10 });
    bg += `<ellipse cx="1350" cy="880" rx="560" ry="140" fill="#F28C28" opacity=".28"/>` + fire(1350, 880, 0.55, 0.6);
    bg += person({ x: 1200, y: 990, s: 0.95, t: 1, seed: 3, face: 'laugh', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [40, 80], ra: [40, 80] }) + person({ x: 1500, y: 990, s: 0.9, t: 1, seed: 5, long: true, hairC: C.hair2, face: 'laugh', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [40, 80], ra: [40, 80], flip: true });
    bg += g('translate(1350 560)', heart(1.2));
    bg += [[1000, 0.8, 14, true], [1720, 0.8, 21, false], [1840, 0.6, 9, true]].map(([x, k, sd, lg]) => person({ x, y: 980, s: k, t: 1, seed: sd, long: lg, keepHair: true, hairC: '#B9B2A6', face: 'happy', bob: 0, la: [-14, -6], ra: [14, 6], flip: x > 1350 })).join('');
    const flowers = [[-30, -150], [20, -170], [50, -130], [-10, -110], [30, -95]].map(([x, y], i) => `<path d="M0 0 L${x * 0.6} ${y * 0.7}" stroke="#4E7A32" stroke-width="6"/>` + g(`translate(${x} ${y})`, [0, 1, 2, 3, 4].map(k => `<circle cx="${f1(Math.cos(k * 1.26) * 14)}" cy="${f1(Math.sin(k * 1.26) * 14)}" r="11" fill="${['#F28CA0', '#F2C443', '#B58FD0', '#FFFFFF', '#E05A4E'][i]}" ${S} stroke-width="2"/>`).join('') + `<circle r="7" fill="#FFF3C4"/>`)).join('');
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'laugh', la: [-24, -12], ra: [60, 150], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 10)} ${f1(R[1] - 10)}) scale(.55)`, flowers) }, legsOff));
    return { bg, fg, text: thumbText(['NO WEDDING?'], 960, 215, 230, 'middle', 1780) };
  },
  wedAlt() {
    let bg = thumbWorld({ seed: 77, sunX: 520, sunY: 240, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(260, 650, 0.9) + hut(900, 640, 0.7);
    bg += [[300, 'happy', 14, true], [460, 'laugh', 3, false], [760, 'laugh', 5, true], [920, 'happy', 21, false]].map(([x, f, sd, lg]) => person({ x, y: 980, s: 0.85, t: 1, seed: sd, long: lg, hairC: lg ? C.hair2 : C.hair, face: f, bob: 0, la: [-14, -6], ra: [-60, -80], flip: x > 610 })).join('');
    bg += g('translate(610 760)', meat(0.6, 4)) + g('translate(610 560)', heart(0.8));
    const ring = `<ellipse cx="0" cy="20" rx="80" ry="80" fill="none" stroke="#E6B33C" stroke-width="22"/><ellipse cx="0" cy="20" rx="80" ry="80" fill="none" ${S} stroke-width="4"/><path d="M-30 -60 L0 -110 L30 -60 L0 -40 Z" fill="#DCEFF7" ${S} stroke-width="4"/>`;
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'think', flip: true, hairC: '#3C2A1E', la: [-14, -6], ra: [60, 130], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] - 30)} ${f1(R[1] - 70)}) scale(.75)`, ring.replace('stroke-width="22"', 'stroke-width="34"')) }, legsOff));
    return { bg, fg, text: thumbText(['MARRIED HOW?'], 960, 215, 230, 'middle', 1780) };
  },
  govRef() {
    let bg = thumbWorld({ seed: 61, sunX: 1500, sunY: 230, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(1780, 640, 0.9) + hut(1080, 625, 0.55);
    const crownS = `<path d="M-60 30 L-66 -30 L-34 0 L0 -46 L34 0 L66 -30 L60 30 Z" fill="#F2C443" ${S} stroke-width="5"/>`;
    bg += person({ x: 1420, y: 960, s: 1.35, t: 1, seed: 21, beard: true, face: 'worried', bob: 0, la: [-14, -6], ra: [-120, -150],
      holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(20)`, `<path d="M0 0 L20 -160 Q30 -200 60 -190 Q80 -170 50 -140 L16 4 Z" fill="#8E5A3A" ${S} stroke-width="5"/>`),
      front: () => g('translate(0 -440) scale(.7) rotate(-14)', crownS) });
    bg += [[1150, 0.75, 'laugh'], [1680, 0.8, 'laugh'], [1800, 0.6, 'laugh']].map(([x, k, f], i) => person({ x, y: 990, s: k, t: 1, seed: 3 + i * 4, long: i === 1, hairC: i === 1 ? C.hair2 : C.hair, face: f, bob: 0, la: [-14, -6], ra: [-80, -100], flip: x > 1420 })).join('');
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'laugh', la: [-24, -12], ra: [-80, -95] }, legsOff));
    return { bg, fg, text: thumbText(['NO GOVERNMENT?'], 960, 215, 230, 'middle', 1780) };
  },
  govAlt() {
    let bg = thumbWorld({ seed: 67, sunX: 520, sunY: 240, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += g('translate(560 760)', `<rect x="-130" y="-80" width="260" height="300" rx="16" fill="#B8956A" ${S} stroke-width="7"/><rect x="-110" y="-300" width="220" height="230" rx="16" fill="#C0392B" ${S} stroke-width="7"/><rect x="-150" y="60" width="300" height="50" rx="10" fill="#9C7A55" ${S} stroke-width="6"/>` + g('translate(0 -360) scale(.9)', `<path d="M-90 40 L-100 -50 L-50 0 L0 -70 L50 0 L100 -50 L90 40 Z" fill="#F2C443" ${S} stroke-width="6"/><circle cx="0" cy="14" r="12" fill="${C.red}"/>`));
    bg += `<path d="M300 520 L820 1000 M820 520 L300 1000" stroke="${C.red}" stroke-width="22" stroke-linecap="round" opacity=".85"/>`;
    bg += [[220, 1000, 0.7], [380, 1030, 0.75], [700, 1040, 0.75], [880, 1000, 0.7]].map(([x, y, k], i) => person({ x, y, s: k, t: 1, seed: 3 + i * 4, long: i % 2 === 1, hairC: i % 2 ? C.hair2 : C.hair, face: 'happy', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [40, 80], ra: [40, 80], flip: x > 560 })).join('');
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'think', flip: true, hairC: '#3C2A1E', la: [-14, -6], ra: [150, -150], armsFront: true }, legsOff));
    return { bg, fg, text: thumbText(['WHO RULED?'], 960, 215, 230, 'middle', 1780) };
  },
  spiritRef() {
    let bg = thumbNight({ seed: 53, moonX: 1560, moonY: 200, sky: ['#5A4A8A', '#F6A85A'], hills: '#8E6A6E', ground: '#C08A50', stars: 18 });
    const pil = (x, y, k) => g(`translate(${x} ${y}) scale(${k})`, `<rect x="-60" y="-300" width="120" height="420" fill="#E6D9BE" ${S} stroke-width="6"/><rect x="-170" y="-380" width="340" height="110" rx="6" fill="#EDE2C8" ${S} stroke-width="6"/><path d="M-30 -200 q30 -40 60 0 q-10 30 -30 40 q-20 -10 -30 -40 Z M-40 0 q20 -20 0 -40 q-20 -20 0 -40" fill="none" stroke="#8E7E62" stroke-width="9"/>`);
    bg += pil(1150, 720, 0.75) + pil(1450, 700, 0.95) + pil(1760, 730, 0.7);
    bg += `<ellipse cx="1450" cy="860" rx="520" ry="110" fill="#F28C28" opacity=".25"/>` + fire(1320, 860, 0.6, 0.5);
    for (let i = 0; i < 3; i++) bg += person({ x: 1200 + i * 150, y: 990, s: 0.7, t: 1, seed: 3 + i * 4, face: 'surprised', bob: 0, la: [-150, -170], ra: [150, 170] });
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'surprised', la: [-24, -12], ra: [-140, -165] }, legsOff));
    return { bg, fg, text: thumbText(['NO TEMPLE?'], 960, 215, 230, 'middle', 1780) };
  },
  spiritAlt() {
    let bg = `<rect width="1920" height="1080" fill="#D9B98A"/>`;
    const r = rng(23); for (let i = 0; i < 40; i++) bg += `<ellipse cx="${f1(r() * 1920)}" cy="${f1(r() * 1080)}" rx="${f1(60 + r() * 140)}" ry="${f1(30 + r() * 60)}" fill="#C9A06A" opacity=".5"/>`;
    bg += g('translate(620 640) scale(1.3)', `<path d="M-200 0 Q-180 -110 0 -120 Q160 -120 200 -40 Q220 20 180 40 L-170 40 Q-210 30 -200 0 Z" fill="none" stroke="#9C2E26" stroke-width="14"/><path d="M200 -40 l40 10 l-10 30 Z M-150 40 v60 M-90 40 v60 M110 40 v60 M160 40 v60" fill="none" stroke="#9C2E26" stroke-width="14" stroke-linecap="round"/>`);
    for (const [x, y, k] of [[240, 300, 1], [480, 900, 0.8], [950, 320, 0.9]]) bg += g(`translate(${x} ${y}) scale(${k}) rotate(-12)`, `<path d="M-50 90 Q-70 20 -64 -20 L-60 -70 M-28 -10 L-26 -110 M0 -10 L2 -120 M28 -6 L32 -104 M48 30 L84 -20" stroke="#B8432E" stroke-width="30" stroke-linecap="round" fill="none" opacity=".8"/><ellipse cx="-4" cy="40" rx="56" ry="64" fill="#B8432E" opacity=".8"/>`);
    bg += [[300, 720], [400, 700], [820, 820]].map(([x, y]) => g(`translate(${x} ${y})`, `<path d="M0 -60 V20 M0 20 l-20 50 M0 20 l20 50 M0 -40 l-30 30 M0 -40 l34 -20" stroke="#9C2E26" stroke-width="10" stroke-linecap="round" fill="none"/><circle cx="0" cy="-74" r="15" fill="#9C2E26"/>`)).join('');
    const lion = `<path d="M-70 -140 Q-80 -40 -60 60 L-50 240 H-10 L0 120 L10 240 H50 L60 60 Q80 -40 70 -140 Z" fill="#EDE2C8" ${S} stroke-width="6"/><path d="M-70 -150 Q-80 -260 0 -270 Q80 -260 70 -150 Q40 -120 0 -120 Q-40 -120 -70 -150 Z" fill="#EDE2C8" ${S} stroke-width="6"/><circle cx="-60" cy="-262" r="18" fill="#EDE2C8" ${S} stroke-width="5"/><circle cx="60" cy="-262" r="18" fill="#EDE2C8" ${S} stroke-width="5"/><ellipse cx="0" cy="-162" rx="40" ry="28" fill="#F3EAD4" ${S} stroke-width="4"/><path d="M-30 -204 h16 M14 -204 h16" fill="none" ${S} stroke-width="5"/><path d="M-10 -172 L10 -172 L0 -160 Z" fill="#8E7E62"/>`;
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'think', flip: true, hairC: '#3C2A1E', la: [-14, -6], ra: [60, 130], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] - 20)} ${f1(R[1] - 60)}) scale(.32)`, lion) }, legsOff));
    return { bg, fg, text: thumbText(['BELIEVED WHAT?'], 960, 215, 230, 'middle', 1780) };
  },
  schoolRef() {
    let bg = thumbWorld({ seed: 41, sunX: 1500, sunY: 240, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(1780, 640, 0.9) + hut(1240, 625, 0.55) + fire(1560, 730, 0.45, 0.6);
    const k = 22;
    bg += person({ x: 1300, y: 900, s: 0.7, t: 1, seed: 4, face: 'laugh', bob: 0, ll: [-k, -k * 0.6], rl: [k, k * 0.6], la: [-150, -170], ra: [150, 170] });
    bg += person({ x: 1450, y: 920, s: 0.55, t: 1, seed: 9, long: true, hairC: C.hair2, face: 'laugh', bob: 0, ll: [k, k * 0.6], rl: [-k, -k * 0.6], la: [-40, -60], ra: [40, 60] });
    bg += person({ x: 1620, y: 960, s: 1.0, t: 1, seed: 14, face: 'happy', beard: true, bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [60, 100], ra: [60, 110], armsFront: true, flip: true });
    bg += person({ x: 1470, y: 980, s: 0.6, t: 1, seed: 12, face: 'think', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [60, 100], ra: [60, 110], armsFront: true });
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'laugh', la: [-150, -170], ra: [70, 150], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 14)} ${f1(R[1] - 10)}) rotate(-10) scale(.8)`, `<path d="M0 -70 Q34 0 0 70" fill="none" stroke="${C.woodD}" stroke-width="7" stroke-linecap="round"/><path d="M0 -70 L0 70" stroke="#E8DCCB" stroke-width="3"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['NO SCHOOL?'], 960, 215, 230, 'middle', 1780) };
  },
  schoolAlt() {
    let bg = thumbWorld({ seed: 47, sunX: 600, sunY: 250, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(260, 640, 0.9) + fire(640, 760, 0.5, 0.4);
    bg += person({ x: 420, y: 960, s: 1.15, t: 1, seed: 14, keepHair: true, hairC: '#B9B2A6', beard: true, face: 'happy', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [60, 100], ra: [30, 90], armsFront: true,
      front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1])})`, `<ellipse rx="36" ry="28" fill="#7E7A72" ${S} stroke-width="4"/>`) + g(`translate(${f1(R[0])} ${f1(R[1])})`, `<ellipse rx="22" ry="17" fill="#9C978F" ${S} stroke-width="4"/>`) });
    bg += person({ x: 760, y: 980, s: 0.7, t: 1, seed: 9, face: 'surprised', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [40, 80], ra: [40, 80], flip: true });
    bg += person({ x: 900, y: 975, s: 0.6, t: 1, seed: 12, long: true, hairC: C.hair2, face: 'think', bob: 0, hip: 50, ll: [118, 8], rl: [106, -2], la: [40, 80], ra: [40, 80], flip: true });
    for (let i = 0; i < 5; i++) bg += `<path d="M${520 + i * 34} ${830 - (i % 2) * 40} l16 -6 l4 14 Z" fill="#B8B2A8" stroke="${C.ink}" stroke-width="2"/>`;
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'think', flip: true, hairC: '#3C2A1E', la: [60, 100], ra: [40, 110], armsFront: true,
      front: (L, R) => g(`translate(${f1(L[0])} ${f1(L[1] + 6)}) scale(.5)`, `<path d="M-50 30 L-60 -20 L-20 -50 L40 -40 L56 10 L20 46 Z" fill="#7E7A72" ${S} stroke-width="5"/>`) + g(`translate(${f1(R[0])} ${f1(R[1] - 4)}) scale(.5)`, `<ellipse rx="30" ry="24" fill="#A8A296" ${S} stroke-width="5"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['LEARNED HOW?'], 960, 215, 230, 'middle', 1780) };
  },
  bedRef() {
    let bg = thumbNight({ seed: 31, moonX: 1520, moonY: 230 });
    bg += `<ellipse cx="1400" cy="880" rx="620" ry="190" fill="#F28C28" opacity=".28"/>` + fire(1760, 870, 0.75, 0.9);
    bg += sleeper(1230, 820, 0.85) + sleeper(1300, 990, 0.8, '#7A5A3A');
    bg += glowEyes(1820, 690, 0.9) + glowEyes(1240, 640, 0.6);
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'tired', la: [-24, -12], ra: [60, 150], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 24)} ${f1(R[1] - 4)}) rotate(-12)`, rockPillow(0.42)) +
        g('translate(0 -354)', `<path d="M-29 18 q11 8 22 0 M7 18 q11 8 22 0" fill="none" stroke="#8A6FA8" stroke-width="4.5" stroke-linecap="round"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['NO BED?'], 960, 215, 230, 'middle', 1780) };
  },
  bedAlt() {
    let bg = thumbNight({ seed: 37, moonX: 420, moonY: 230 });
    bg += `<ellipse cx="620" cy="880" rx="640" ry="190" fill="#F28C28" opacity=".3"/>` + fire(980, 850, 0.7, 0.4);
    bg += leafBed(560, 860, 1.25) + sleeper(330, 850, 0.8);
    [[300, 560, 3.0], [560, 450, 2.6], [800, 600, 2.8]].forEach(([x, y, k]) => { bg += mozzie(x, y, k) + `<path d="M${x - 50} ${y - 60} l110 110 M${x + 60} ${y - 60} l-110 110" stroke="${C.red}" stroke-width="16" stroke-linecap="round"/>`; });
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'happy', flip: true, hairC: '#3C2A1E', la: [-14, -6], ra: [40, 120], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] - 10)} ${f1(R[1] - 30)}) rotate(20)`, `<path d="M0 60 L0 -150" stroke="${C.woodD}" stroke-width="8" stroke-linecap="round"/>` + [[-36, -40], [34, -60], [-32, -90], [30, -110], [0, -150]].map(([x, y], i) => g(`translate(${x} ${y}) rotate(${x < 0 ? -30 : 30})`, `<path d="M-40 0 Q0 -22 40 0 Q0 22 -40 0 Z" fill="${i % 2 ? '#5E8A3C' : '#6F9A45'}" ${S} stroke-width="3.5"/>`)).join('')) }, legsOff));
    return { bg, fg, text: thumbText(['SLEPT HOW?'], 960, 215, 230, 'middle', 1780) };
  },
  doctorRef() {
    let bg = thumbWorld({ seed: 23, sunX: 1450, sunY: 250, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(1760, 650, 1.0) + hut(1180, 630, 0.6) + fire(1330, 720, 0.55, 0.7);
    bg += person({ x: 1450, y: 960, s: 1.35, t: 1, seed: 14, face: 'happy', beard: true, hairC: '#B9B2A6', bob: 0, la: [-14, -6], ra: [120, 80],
      holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(-20)`, `<path d="M0 0 L0 -120" stroke="${C.woodD}" stroke-width="7" stroke-linecap="round"/>` + [[-30, -60], [28, -80], [-26, -110], [24, -128], [0, -150]].map(([x, y], i) => `<path d="${smooth([[x, y], [x * 1.6, y - 18], [x * 1.2, y - 40], [0, y - 6]])}" fill="${i % 2 ? '#7FAA4E' : '#97BE5F'}" ${S} stroke-width="3.5"/>`).join('')) });
    bg += person({ x: 1640, y: 960, s: 0.8, t: 1, seed: 9, face: 'worried', la: [-14, -6], ra: [14, 6], bob: 0 });
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'sick', la: [-24, -12], ra: [70, 205], armsFront: true,
      front: () => g('translate(0 -354)', `<path d="M44 -14 Q96 4 82 44 Q68 68 40 56" fill="#FFFFFF" ${S} stroke-width="5.5"/><ellipse cx="54" cy="22" rx="26" ry="22" fill="#F0A2A2" opacity=".85"/><path d="M-52 -64 q-9 16 0 26 q9 -10 0 -26 Z M-74 -36 q-7 12 0 20 q7 -8 0 -20 Z" fill="#8FD0F0" ${S} stroke-width="2.5"/><path d="M96 0 l28 -10 M100 28 l32 4 M92 54 l24 18" ${S} stroke="${C.red}" stroke-width="6"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['NO DOCTOR?'], 960, 215, 230, 'middle', 1780) };
  },
  doctorAlt() {
    let bg = thumbWorld({ seed: 29, sunX: 600, sunY: 260, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += hut(300, 650, 1.0) + fire(620, 720, 0.55, 0.4);
    bg += person({ x: 520, y: 960, s: 1.2, t: 1, seed: 5, long: true, hairC: C.hair2, face: 'happy', bob: 0, la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 20)} ${f1(e[1])})`, bowl(0.6)) });
    bg += person({ x: 780, y: 960, s: 1.1, t: 1, seed: 8, face: 'happy', bob: 0, la: [-14, -6], ra: [80, 95], holdR: e => g(`translate(${f1(e[0] + 20)} ${f1(e[1])})`, meat(0.45, 9)) });
    let fg = heroBig(Object.assign({ x: 1380, y: 1700, s: 3.0, seed: 21, face: 'happy', flip: true, hairC: '#3C2A1E', la: [-14, -6], ra: [40, 120], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] - 20)} ${f1(R[1] + 14)}) rotate(-30)`, `<rect x="-46" y="-16" width="92" height="32" rx="12" fill="#FFFFFF" ${S} stroke-width="4"/><path d="M-20 -16 V16 M10 -16 V16" stroke="#C9C2B0" stroke-width="3"/>`) +
        g('translate(0 -354)', `<path d="M-60 -20 Q0 -44 60 -20 L58 -2 Q0 -24 -58 -2 Z" fill="#FFFFFF" ${S} stroke-width="4"/><circle cx="26" cy="-18" r="6" fill="${C.red}" opacity=".8"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['HEALED HOW?'], 960, 215, 230, 'middle', 1780) };
  },
  fridgeRef() {
    let bg = thumbWorld({ seed: 11, sunX: 1380, sunY: 250, sky: ['#6FBDE6', '#E6F4F2'] });
    bg += vulture(1180, 330, 0.9) + vulture(1330, 280, 0.7) + vulture(1500, 360, 0.6);
    bg += hut(1760, 640, 0.9) + fire(1560, 720, 0.45, 0.3);
    bg += person({ x: 1640, y: 730, s: 0.5, t: 1, seed: 5, long: true, hairC: C.hair2, face: 'worried', la: [-150, 128], ra: [14, 6], armsFront: true, bob: 0 });
    bg += person({ x: 1710, y: 735, s: 0.33, t: 1, seed: 9, face: 'worried', la: [-14, -6], ra: [14, 6], bob: 0 });
    bg += meatPile(1330, 950, 1.35, 21, '#A34A3A') + stink(1330, 690, 3);
    bg += g('translate(1330 760) scale(1.9) translate(-1330 -760)', fliesAround(1330, 760, 2.3, 9, 120, 55));
    let fg = heroBig(Object.assign({ x: 560, y: 1780, s: 3.35, seed: 3, face: 'scared', la: [-24, -12], ra: [60, 150], armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 26)} ${f1(R[1] - 6)}) rotate(-28)`, meat(1.0, 4, '#B04A3A', 0)) +
        g('translate(0 -354)', `<path d="M-52 -64 q-9 16 0 26 q9 -10 0 -26 Z M-74 -36 q-7 12 0 20 q7 -8 0 -20 Z" fill="#8FD0F0" ${S} stroke-width="2.5"/>`) }, legsOff));
    fg += g('translate(980 640) scale(2.4) translate(-980 -640)', fliesAround(980, 640, 1.1, 6, 70, 45));
    return { bg, fg, text: thumbText(['NO FRIDGE?'], 960, 215, 230, 'middle', 1780) };
  },
  fridgeAlt() {
    let bg = thumbWorld({ seed: 17, sunX: 700, sunY: 260, sky: ['#6FBDE6', '#E6F4F2'], ground: ['#F0C860', '#D29A3C'] });
    bg += vulture(420, 330, 0.9) + vulture(600, 280, 0.7);
    bg += g('translate(560 860) scale(2.3)', meat(1, 21, '#A34A3A', -10)) + stink(560, 640, 3);
    bg += g('translate(560 760) scale(2.2) translate(-560 -760)', fliesAround(560, 760, 1.7, 9, 130, 60));
    let fg = heroBig(Object.assign({ x: 1380, y: 1640, s: 3.0, seed: 2, face: 'worried', flip: true, la: [-150, 128], ra: [16, 8], armsFront: true }, legsOff));
    return { bg, fg, text: thumbText(['STORED HOW?'], 960, 215, 230, 'middle', 1780) };
  },
  fridge() {
    let bg = thumbWorld({ seed: 11, sunX: 1560, sunY: 300 });
    bg += hut(1500, 640, 0.9) + fire(1290, 690, 0.45, 0.3);
    bg += person({ x: 1150, y: 700, s: 0.5, t: 1, seed: 5, long: true, hairC: C.hair2, face: 'worried', la: [-14, -6], ra: [14, 6] });
    bg += person({ x: 1235, y: 705, s: 0.33, t: 1, seed: 9, face: 'worried', la: [-14, -6], ra: [14, 6] });
    bg += meatPile(1360, 930, 1.25, 21, '#A84A3A');
    bg += heatWaves(1360, 720, 0.6, 3, 110);
    let fg = person(Object.assign({ x: 520, y: 1470, s: 2.55, t: 1.3, seed: 3, face: 'scared', la: [-20, -10], ra: [40, 120], bob: 0, armsFront: true,
      front: (L, R) => g(`translate(${f1(R[0] + 20)} ${f1(R[1] - 4)}) rotate(-20)`, meat(1.0, 4, C.meat, 0)) }, legsOff));
    fg += g('translate(900 760) scale(2.2) translate(-900 -760)', fliesAround(900, 760, 1.1, 7, 70, 45));
    fg += g('translate(1360 800) scale(1.8) translate(-1360 -800)', fliesAround(1360, 800, 2.3, 7, 110, 50));
    return { bg, fg, text: thumbText(['NO FRIDGE?'], 960, 215, 215) };
  },
  doctor() {
    let bg = thumbWorld({ seed: 23, sunX: 1650, sunY: 250 });
    bg += hut(1600, 650, 1.0) + hut(1180, 630, 0.6) + fire(1330, 720, 0.5, 0.7);
    bg += person({ x: 1430, y: 930, s: 1.25, t: 1, seed: 14, face: 'happy', beard: true, hairC: '#B9B2A6', la: [-14, -6], ra: [120, 80],
      holdR: e => g(`translate(${f1(e[0])} ${f1(e[1])}) rotate(-20)`, `<path d="M0 0 L0 -120" stroke="${C.woodD}" stroke-width="7" stroke-linecap="round"/>` + [[-30, -60], [28, -80], [-26, -110], [24, -128], [0, -150]].map(([x, y], i) => `<path d="${smooth([[x, y], [x * 1.6, y - 18], [x * 1.2, y - 40], [0, y - 6]])}" fill="${i % 2 ? '#7FAA4E' : '#97BE5F'}" ${S} stroke-width="3.5"/>`).join('')) });
    let fg = person(Object.assign({ x: 520, y: 1470, s: 2.55, t: 1.3, seed: 3, face: 'sick', la: [-20, -10], ra: [70, 205], armsFront: true, bob: 0,
      front: () => g('translate(0 -354)', `<path d="M44 -14 Q92 4 78 40 Q66 62 40 52" fill="#FFFFFF" ${S} stroke-width="5.5"/><ellipse cx="52" cy="20" rx="24" ry="20" fill="#F0A2A2" opacity=".8"/><path d="M-40 -70 q-8 14 0 22 q8 -8 0 -22 Z M-62 -48 q-6 10 0 16 q6 -6 0 -16 Z" fill="#8FD0F0" ${S} stroke-width="2.5"/><path d="M90 0 l26 -10 M94 26 l30 4 M86 50 l22 18" ${S} stroke="${C.red}" stroke-width="5"/>`) }, legsOff));
    return { bg, fg, text: thumbText(['NO DOCTOR?'], 960, 215, 215) };
  },
  school() {
    let bg = thumbWorld({ seed: 31, sunX: 1450, sunY: 240 });
    bg += hut(1720, 650, 0.9);
    bg += `<path d="M1580 900 L1580 760" stroke="${C.woodD}" stroke-width="9"/><circle cx="1580" cy="740" r="34" fill="#D9A14A" ${S} stroke-width="5"/>`;
    bg += person({ x: 1150, y: 920, s: 1.2, t: 1, seed: 10, beard: true, hairC: C.hair2, face: 'happy', la: [-40, -100], ra: [100, 92],
      holdR: e => spear(e[0], e[1], 95, 300, 0.4) });
    bg += person({ x: 1330, y: 930, s: 0.72, t: 1, seed: 9, face: 'laugh', la: [-150, -170], ra: [100, 90], holdR: e => spear(e[0], e[1], 95, 200, 0.4) });
    bg += person({ x: 1470, y: 935, s: 0.62, t: 1, seed: 12, face: 'surprised', la: [-20, -8], ra: [40, 100] });
    let fg = person(Object.assign({ x: 520, y: 1430, s: 2.45, t: 1.3, seed: 9, face: 'laugh', la: [-30, -150], ra: [30, 160], bob: 0,
      holdR: e => spear(e[0], e[1], 160, 300, 0.5) }, legsOff));
    return { bg, fg, text: thumbText(['NO SCHOOL?'], 960, 215, 215) };
  },
  bed() {
    let bg = thumbWorld({ seed: 41, sky: ['#F2A86A', '#FBE0B0'], ground: ['#E7BE68', '#C99542'], hills: '#D9A46E', sunX: 1500, sunY: 520 });
    bg += g('translate(170 700)', `<path d="${smooth([[-330, 400], [-360, 40], [-250, -230], [0, -320], [250, -250], [380, -40], [350, 400]])}" fill="#A99A86" ${S} stroke-width="6"/><ellipse cx="60" cy="120" rx="170" ry="130" fill="#4A3F35" ${S} stroke-width="5"/><path d="M-200 -120 l60 40 l-20 50 M170 -170 l-40 60 M-260 160 l50 -30" fill="none" ${S} stroke-width="4" opacity=".6"/>`);
    bg += fire(1460, 860, 0.65, 0.4);
    let fg = '';
    const r = rng(5);
    for (let i = 0; i < 46; i++) {
      const x = 300 + r() * 1100, y = 860 + r() * 110, a = -40 + r() * 80;
      fg += g(`translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})`, `<path d="M-46 0 Q0 -26 46 0 Q0 26 -46 0 Z" fill="${['#6F9A45', '#86AE52', '#5D8A3C'][i % 3]}" ${S} stroke-width="3.5"/><path d="M-40 0 H40" stroke="#4E7432" stroke-width="2.5"/>`);
    }
    fg += `<path d="M640 780 Q760 700 980 720 Q1120 740 1150 800 Q1100 860 900 860 Q720 860 640 820 Z" fill="${C.tunic}" ${S} stroke-width="6"/>`;
    fg += `<path d="M1130 800 L1380 760 M1130 830 L1390 820" ${S} stroke-width="14"/><path d="M1380 760 l30 -26 M1390 820 l34 -18" ${S} stroke-width="14"/>`;
    fg += `<path d="M760 760 Q860 700 960 760" fill="none" ${S} stroke-width="14"/>`;
    fg += g('translate(520 700) rotate(-12) scale(2.4)', `<circle r="58" fill="#FFFFFF" ${S} stroke-width="5.5"/>` + hairCave(24, C.hair, false) + faceSvg('sleep', 0, 1));
    fg += `<text x="760" y="430" font-family="Hand" font-size="130" fill="#FFFFFF" stroke="${C.ink}" stroke-width="6" paint-order="stroke">Z</text><text x="860" y="340" font-family="Hand" font-size="96" fill="#FFFFFF" stroke="${C.ink}" stroke-width="5" paint-order="stroke">z</text><text x="930" y="280" font-family="Hand" font-size="70" fill="#FFFFFF" stroke="${C.ink}" stroke-width="4" paint-order="stroke">z</text>`;
    for (let i = 0; i < 3; i++) {
      const x = 1250 + i * 120, y = 520 + i * 70;
      fg += g(`translate(${x} ${y}) scale(2.2)`, `<path d="M-30 0 h-30 M-30 10 h-22" stroke="${C.ink}" stroke-width="3" opacity=".5"/>` + fly(0, 0, i * 0.37, i));
    }
    return { bg, fg, text: thumbText(['NO BED?'], 1360, 215, 230, 'middle', 1000) };
  },
};

window.renderThumbNamed = name => {
  const t = THUMBS[name]();
  document.getElementById('scene').innerHTML = `<g filter="url(#wob0)"><g filter="url(#dof)">${t.bg}</g>${t.fg}</g>${t.text}`;
  for (const el of document.querySelectorAll('text[data-maxw]')) {
    const maxW = +el.dataset.maxw, w = el.getComputedTextLength();
    if (w > maxW) { const k = maxW / w; el.setAttribute('font-size', f1(+el.getAttribute('font-size') * k)); el.setAttribute('stroke-width', f1(+el.getAttribute('stroke-width') * k)); }
  }
  return Object.keys(THUMBS);
};
window.THUMB_NAMES = Object.keys(THUMBS);
