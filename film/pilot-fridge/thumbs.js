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

const THUMBS = {
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
