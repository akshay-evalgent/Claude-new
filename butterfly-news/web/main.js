// Caption News engine for the butterfly film. window.render(t) draws the frame at time t (seconds)
// and resolves once every image it needs has decoded, so the renderer can screenshot it.
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, d) => clamp((t - a) / d);
const outC = p => 1 - Math.pow(1 - p, 3);
const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const backOut = (p, s = 1.6) => { const q = p - 1; return 1 + (s + 1) * q * q * q + s * q * q; };
const fmt = n => Math.round(n).toLocaleString('en-US');
const FPS = 30;

let TL, HL, MAN, CRED;
const shotOf = id => TL.shots.find(s => s.id === id);

/* fixed-width digit cells so a rolling counter never jitters */
function num(el, str) {
  if (el.dataset.v === str) return; el.dataset.v = str;
  el.innerHTML = [...str].map(ch => `<span class="${ch === ',' || ch === '.' ? 'c' : ch === '%' || ch === '+' || ch === '×' ? 'p' : ''}">${ch}</span>`).join('');
}

/* ---------- footage frames ---------- */
const pending = [];
function setFrame(img, seq, lt, holdAt = null) {
  const n = MAN[seq] || 1;
  let i = Math.floor(Math.max(0, lt) * FPS + 1e-6);
  if (holdAt != null) i = Math.min(i, Math.round(holdAt * FPS));
  i = clamp(i, 0, n - 1);
  const src = `frames/${seq}/${String(i + 1).padStart(4, '0')}.jpg`;
  if (img.getAttribute('src') !== src) { img.setAttribute('src', src); pending.push(img.decode().catch(() => {})); }
}

/* ---------- caption card ---------- */
let capIdx = -1;
function buildCaption(c) {
  const zh = $('#cap .zh'), en = $('#cap .en');
  zh.className = 'zh' + (c.verdict ? ' v' : '');
  zh.innerHTML = c.zh.split('|').map(chunk => '<span class="ch">' + chunk.replace(/\{([^}]*)\}/, '<span class="kw"><span class="bg"></span>$1</span>') + '</span>').join('');
  en.textContent = c.en;
  zh.style.top = (c.verdict ? 948 - 98 : 948 - 78) + 'px';
  en.style.top = (1014 - 26) + 'px';
}
function drawCaption(t) {
  const i = TL.captions.findIndex(c => t >= c.t0 && t < c.t1);
  const cap = $('#cap');
  if (i < 0) { cap.style.visibility = 'hidden'; capIdx = -1; return; }
  cap.style.visibility = 'visible';
  const c = TL.captions[i];
  if (i !== capIdx) { buildCaption(c); capIdx = i; }
  [...cap.querySelectorAll('.ch')].forEach((ch, k) => {
    const st = c.t0 + 0.12 * k;
    const p = prog(t, st, 0.13);
    ch.style.opacity = prog(t, st, 0.04);
    ch.style.transform = `scale(${lerp(1.3, 1, backOut(p, 1.6))})`;
    const kw = ch.querySelector('.kw');
    if (kw) { const q = outC(prog(t, st + 0.03, 0.12)); kw.firstChild.style.transform = `scaleX(${q})`; kw.style.color = q > 0.45 ? 'var(--ink)' : 'var(--ivory)'; kw.style.textShadow = q > 0.45 ? 'none' : ''; }
  });
  const e = $('#cap .en'), q = outC(prog(t, c.t0 + 0.1, 0.18));
  e.style.opacity = q; e.style.transform = `translateY(${10 * (1 - q)}px)`;
}

/* ---------- chrome: source tag, credit, gradients ---------- */
const SRC = {
  hook: ['Xerces Society · 2026.01.29', 0.22],
  half: ['Xerces Society · Western Monarch Count 1997–2025', 0.15],
  chart: ['Xerces Society · Western Monarch Count 1997–2025', 0.2],
  split: ['Xerces Society · Western Monarch Count 2020, 2021', 0.2],
  breath: ['Xerces Society · 247,246 ÷ 1,901 ≈ 130', 0.15],
  doc1: ['Xerces Society 新闻稿 · 2026.01.29 · 第 1 页', 0.15],
  doc2: ['Xerces Society 新闻稿 · 2026.01.29 · 第 2 页', 0.1],
};
function drawChrome(t, shot) {
  const s = SRC[shot.id], el = $('#src');
  if (s) { const p = outC(prog(t, shot.t0 + s[1], 0.2)); el.style.visibility = 'visible'; el.style.opacity = p; el.style.transform = `translateX(${-28 * (1 - p)}px)`; $('#src .v').textContent = s[0]; }
  else el.style.visibility = 'hidden';
  const c = CRED[shot.id], cr = $('#credit');
  if (c) { cr.style.visibility = 'visible'; const k = c.join('|'); if (cr.dataset.v !== k) { cr.dataset.v = k; cr.innerHTML = '<b>' + c[0] + '</b>' + c[1]; } } else cr.style.visibility = 'hidden';
  const data = shot.kind === 'ledger';
  $('#gBottom').style.visibility = $('#gRadial').style.visibility = data ? 'hidden' : 'visible';
  $('#gData').style.visibility = data ? 'visible' : 'hidden';
  $('#gDoc').style.visibility = shot.kind === 'paper' ? 'visible' : 'hidden';
}

/* ---------- chart (built once) ---------- */
const COUNTS = { 1997: 1235490, 1998: 564349, 1999: 267074, 2000: 390057, 2001: 209570, 2002: 99353, 2003: 254378, 2004: 205085, 2005: 218679, 2006: 221058, 2007: 86437, 2008: 131889, 2009: 58468, 2010: 143204, 2011: 222525, 2012: 144812, 2013: 211275, 2014: 234726, 2015: 292880, 2016: 298464, 2017: 192626, 2018: 27721, 2019: 29429, 2020: 1901 };
const X = y => 640 + (y - 1997) * 43.6, Y = v => 790 - v / 1300000 * 450;
let segs = [], dots = [];
function buildChart() {
  const svg = $('#chart'); const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, a) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); svg.appendChild(e); return e; };
  [[0, '0'], [500000, '50万'], [1000000, '100万']].forEach(([v, l]) => {
    mk('line', { x1: 600, x2: 1920, y1: Y(v), y2: Y(v), stroke: '#5E5C55', 'stroke-width': v ? 1.5 : 2.5, 'stroke-dasharray': v ? '6 8' : '' });
    const tx = mk('text', { x: 584, y: Y(v) + 8, 'text-anchor': 'end', fill: '#8D8B83', 'font-size': 24, 'font-weight': 500 }); tx.textContent = l; tx.style.fontFamily = 'Noto Sans SC';
  });
  [1997, 2005, 2010, 2015, 2020, 2025].forEach(y => { const tx = mk('text', { x: X(y), y: 832, 'text-anchor': 'middle', fill: '#8D8B83', 'font-size': 24, 'font-weight': 500 }); tx.textContent = y; });
  const ys = Object.keys(COUNTS).map(Number);
  for (let i = 0; i < ys.length - 1; i++) segs.push(mk('line', { x1: X(ys[i]), y1: Y(COUNTS[ys[i]]), x2: X(ys[i]), y2: Y(COUNTS[ys[i]]), stroke: '#F7F5EF', 'stroke-width': 5, 'stroke-linecap': 'round' }));
  ys.forEach(y => dots.push(mk('circle', { cx: X(y), cy: Y(COUNTS[y]), r: 5, fill: '#F7F5EF', opacity: 0 })));
  const l97 = mk('text', { id: 'l97', x: X(1997) + 22, y: Y(1235490) + 9, fill: '#F7F5EF', 'font-size': 30, 'font-weight': 800 }); l97.textContent = '1,235,490';
  mk('circle', { id: 'ring', cx: X(2020), cy: Y(1901), r: 14, fill: 'none', stroke: '#FF4A3D', 'stroke-width': 4, opacity: 0 });
  mk('circle', { id: 'kdot', cx: X(2020), cy: Y(1901), r: 13, fill: '#FF4A3D', opacity: 0 });
  const g = document.createElementNS(NS, 'g'); g.id = 'klab'; svg.appendChild(g);
  g.innerHTML = `<rect x="${X(2020) - 128}" y="${Y(1901) - 128}" width="256" height="62" fill="#FF4A3D"/><text x="${X(2020)}" y="${Y(1901) - 84}" text-anchor="middle" fill="#0E0E0C" font-size="34" font-weight="800">2020 · 1,901</text><line x1="${X(2020)}" x2="${X(2020)}" y1="${Y(1901) - 66}" y2="${Y(1901) - 18}" stroke="#FF4A3D" stroke-width="3"/>`;
}
function drawChart(t, sh) {
  const t0 = 6.25, d = 1.35 / segs.length;
  segs.forEach((s, i) => {
    const p = eio(prog(t, t0 + i * d, d * 1.15));
    const a = dots[i], b = dots[i + 1];
    s.setAttribute('x2', lerp(+a.getAttribute('cx'), +b.getAttribute('cx'), p));
    s.setAttribute('y2', lerp(+a.getAttribute('cy'), +b.getAttribute('cy'), p));
    s.style.opacity = p > 0 ? 1 : 0;
    b.setAttribute('opacity', p >= 1 ? 1 : 0);
  });
  dots[0].setAttribute('opacity', t >= t0 ? 1 : 0);
  $('#l97').style.opacity = prog(t, t0, 0.2);
  const k = 7.65;
  $('#kdot').setAttribute('opacity', t >= k ? 1 : 0);
  $('#kdot').setAttribute('r', 13 * lerp(0.2, 1, backOut(prog(t, k, 0.16), 2)));
  const rp = prog(t, k, 0.7); $('#ring').setAttribute('r', lerp(14, 70, outC(rp))); $('#ring').setAttribute('opacity', t >= k && rp < 1 ? 0.9 * (1 - rp) : 0);
  const lp = prog(t, k + 0.1, 0.18); $('#klab').style.opacity = lp; $('#klab').setAttribute('transform', `translate(0 ${12 * (1 - outC(lp))})`);
  $('#chart').style.transform = `scale(${lerp(1, 1.028, prog(t, sh.t0, sh.t1 - sh.t0))})`;
}

/* ---------- card slide (ledger, paper) ---------- */
function slideIn(layer, t, at) {
  const p = outC(prog(t, at, 0.18));
  layer.style.transform = `translateX(${1920 * (1 - p)}px)`;
  const st = layer.querySelector('.streaks');
  if (st) st.style.opacity = p > 0 && p < 1 ? 1 - p * 0.6 : 0;
}

/* ---------- paper ---------- */
function paperPose(el, page, box, C, rotDeg, S) {
  const pt = 220 / 72; const hx = (box[0] + box[2]) / 2 * pt, hy = (box[1] + box[3]) / 2 * pt;
  const r = rotDeg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  const tx = C[0] - S * (cs * hx - sn * hy), ty = C[1] - S * (sn * hx + cs * hy);
  el.style.transform = `translate(${tx}px,${ty}px) rotate(${rotDeg}deg) scale(${S})`;
}
function buildPaper(el, boxes) {
  const pt = 220 / 72;
  return boxes.map(b => { const d = document.createElement('div'); d.className = 'hl';
    Object.assign(d.style, { left: (b[0] * pt - 6) + 'px', top: (b[1] * pt - 2) + 'px', width: ((b[2] - b[0]) * pt + 12) + 'px', height: ((b[3] - b[1]) * pt + 6) + 'px', opacity: .88 });
    el.appendChild(d); return d; });
}
let hl1, hl2;

/* ---------- main draw ---------- */
const LAYER = {}; const PRE = { chart: 0.1, doc1: 0.1, split: 0.1 };
function drawFrame(t) {
  pending.length = 0;
  const active = TL.shots.find(s => t >= s.t0 && t < s.t1) || TL.shots[TL.shots.length - 1];
  for (const s of TL.shots) {
    const L = LAYER[s.id]; const on = t >= s.t0 - (PRE[s.id] || 0) && t < s.t1;
    L.style.visibility = on ? 'visible' : 'hidden';
    if (!on) continue;
    const lt = t - s.t0, img = L.querySelector('.ftg');
    switch (s.id) {
      case 'hook': {
        setFrame(img, 'hook', lt); img.style.transform = `scale(${lerp(1, 1.05, lt / 3)})`;
        $('#hookKick').style.opacity = prog(t, 0, 0.08);
        const p = prog(t, 0.1, 0.45); $('#hookBlock').style.visibility = t >= 0.1 ? 'visible' : 'hidden';
        num($('#hookBlock'), fmt(12260 * outC(p)));
        const u = prog(t, 0.58, 0.12); $('#hookUnit').style.opacity = u; $('#hookUnit').style.transform = `scale(${lerp(1.4, 1, backOut(u))})`;
        const sj = outC(prog(t, 0.72, 0.2)); $('#hookSubj').style.opacity = sj; $('#hookSubj').style.transform = `translateY(${14 * (1 - sj)}px)`;
        break; }
      case 'half': {
        setFrame(img, 'half', lt); setFrame($('#halfDark .ftg'), 'half', lt);
        const z = `scale(${lerp(1, 1.025, lt / 3)})`; img.style.transform = z; $('#halfDark .ftg').style.transform = z;
        const p = 0.99 * eio(prog(t, 3.2, 1.2)); const x = 1920 * p;
        $('#halfDark').style.clipPath = `inset(0 ${1920 - x}px 0 0)`;
        $('#halfLine').style.left = x + 'px'; $('#halfLine').style.opacity = t >= 3.2 ? 1 : 0;
        const big = $('#halfFig .big'); num(big, Math.round(p / 0.99 * 99) + '%'); big.style.color = t >= 4.4 ? 'var(--red)' : 'var(--ivory)';
        $('#halfFig').style.opacity = prog(t, 3.2, 0.06); $('#halfFig .sub').style.opacity = prog(t, 4.45, 0.2);
        break; }
      case 'chart': slideIn(L, t, s.t0 - 0.1); drawChart(t, s); break;
      case 'freeze': {
        const ft = s.t0 + s.freeze_at; setFrame(img, 'freeze', lt, s.freeze_at);
        const f = prog(t, ft, 0.3), on2 = t >= ft;
        img.style.transform = `scale(${on2 ? lerp(1, 1.12, outC(f)) : 1})`;
        img.style.filter = `contrast(1.07) saturate(${on2 ? lerp(.92, .41, outC(f)) : .92}) brightness(.98)`;
        const b = outC(prog(t, ft, 0.35)); const box = [lerp(40, 600, b), lerp(40, 220, b), lerp(1880, 1320, b), lerp(1040, 790, b)];
        const cs = $('#brk').children; $('#brk').style.opacity = on2 ? 1 : 0;
        Object.assign(cs[0].style, { left: box[0] + 'px', top: box[1] + 'px' }); Object.assign(cs[1].style, { left: (box[2] - 70) + 'px', top: box[1] + 'px' });
        Object.assign(cs[2].style, { left: box[0] + 'px', top: (box[3] - 70) + 'px' }); Object.assign(cs[3].style, { left: (box[2] - 70) + 'px', top: (box[3] - 70) + 'px' });
        break; }
      case 'split': {
        setFrame($('#spL .ftg'), 'split_l', lt); setFrame($('#spR .ftg'), 'split_r', lt);
        $('#spDiv').style.transform = `scaleY(${outC(prog(t, s.t0 - 0.1, 0.15))})`;
        const w = 960 * (1 - outC(prog(t, s.t0 - 0.05, 0.3)));
        $('#spL').style.clipPath = `inset(0 0 0 ${w}px)`; $('#spR').style.clipPath = `inset(0 ${w}px 0 0)`;
        const a = outC(prog(t, 11.65, 0.2)), b2 = outC(prog(t, 11.75, 0.2));
        $('#spLabL').style.opacity = a; $('#spLabL').style.transform = `translateY(${16 * (1 - a)}px)`;
        $('#spLabR').style.opacity = b2; $('#spLabR').style.transform = `translateY(${16 * (1 - b2)}px)`;
        num($('#spLabL .num'), '1,901');
        const cp = prog(t, 11.95, 1.0); const rn = $('#spLabR .num');
        num(rn, fmt(1901 + (247246 - 1901) * outC(cp))); rn.style.color = cp >= 1 ? 'var(--honey)' : 'var(--ivory)';
        const sp = prog(t, s.hit || 13.1, 0.16); const st = $('#stamp'); num(st, '×130');
        st.style.visibility = t >= 13.1 ? 'visible' : 'hidden';
        st.style.transform = `translate(-50%,-50%) rotate(-4deg) scale(${lerp(1.8, 1, backOut(sp, 1.4))})`;
        break; }
      case 'breath': setFrame(img, 'breath', lt); img.style.transform = `scale(${lerp(1, 1.03, lt / 2.5)})`; break;
      case 'doc1': {
        slideIn(L, t, s.t0 - 0.1);
        const H = HL.lowest; const S = 0.62 * lerp(1, 1.045, prog(t, s.t0, s.t1 - s.t0));
        paperPose($('#paper1'), 1, [H.boxes_pt[1][0], H.boxes_pt[0][1], H.boxes_pt[1][2], H.boxes_pt[1][3]], [640, 450], -1.4, S);
        hl1[0].style.transform = `scaleX(${outC(prog(t, 17.35, 0.25))})`; hl1[1].style.transform = `scaleX(${outC(prog(t, 17.6, 0.4))})`;
        const np = prog(t, 18.1, 0.2), blk = $('#pnum1 .blk'); num(blk, '9,119');
        $('#pnum1').style.opacity = prog(t, 18.05, 0.06); blk.style.transform = `scale(${lerp(0.6, 1, backOut(np, 1.8))})`; blk.style.transformOrigin = '0 50%';
        break; }
      case 'doc2': {
        const H = HL.sixty; const S = 0.62 * lerp(1.0, 1.035, prog(t, s.t0, s.t1 - s.t0));
        paperPose($('#paper2'), 2, H.boxes_pt[0], [620, 450], 1.2, S);
        hl2[0].style.transform = `scaleX(${outC(prog(t, 20.65, 0.4))})`;
        const np = prog(t, 21.15, 0.2), blk = $('#pnum2 .blk'); num(blk, '60+');
        $('#pnum2').style.opacity = prog(t, 21.1, 0.06); blk.style.transform = `scale(${lerp(0.6, 1, backOut(np, 1.8))})`; blk.style.transformOrigin = '0 50%';
        break; }
      case 'grove': setFrame(img, 'grove', lt); img.style.transform = `scale(${lerp(1, 1.25, outC(prog(t, s.t0, 0.3)))})`; break;
      case 'verd1': setFrame(img, 'verd1', lt); img.style.transform = `scale(${lerp(1, 1.03, lt / 3)})`; break;
      case 'verd2': setFrame(img, 'verd2', lt); img.style.transform = `scale(${lerp(1.05, 1, outC(lt / 3))})`; break;
    }
  }
  drawChrome(t, active);
  $('#tc').style.visibility = active.id === 'freeze' && t >= 9.85 ? 'visible' : 'hidden';
  let fl = 0;
  if (t >= 9.8 && t < 9.94) fl = 1 - (t - 9.8) / 0.14;
  if (t >= 11.5 && t < 11.5 + 2 / FPS) fl = 1;
  $('#flash').style.opacity = fl;
  drawCaption(t);
  return Promise.all(pending.slice());
}

/* ---------- boot ---------- */
window.__ready = (async () => {
  [TL, HL, MAN, CRED] = await Promise.all(['../timeline.json', 'doc/hl.json', 'frames/manifest.json', 'frames/credits.json'].map(u => fetch(u).then(r => r.json())));
  TL.shots.forEach(s => LAYER[s.id] = document.getElementById('L-' + s.id));
  buildChart();
  hl1 = buildPaper($('#paper1'), HL.lowest.boxes_pt); hl2 = buildPaper($('#paper2'), HL.sixty.boxes_pt);
  const zh = TL.captions.map(c => c.zh).join('') + '野报帝王蝶来源视频新闻稿第页2025年冬加州越冬林只西部帝王蝶2020年冬2021年冬冬季数量万越冬地被毁0123456789';
  await Promise.all([
    document.fonts.load('900 88px "Noto Sans SC"', zh), document.fonts.load('500 24px "Noto Sans SC"', zh),
    document.fonts.load('800 100px "Inter Tight"', '0123456789,%+×'), document.fonts.load('500 33px "Inter Tight"', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,.:·–→÷≈'),
    ...[...document.querySelectorAll('.paper img')].map(i => i.decode()),
  ]);
  await document.fonts.ready;
  return true;
})();
window.render = async t => { await window.__ready; return drawFrame(t); };
