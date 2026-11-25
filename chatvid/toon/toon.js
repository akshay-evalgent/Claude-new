/* Toon engine: wordless cartoon parables in a flat ink-on-yellow style. A 16:9 panel sits in the
   middle of a vertical frame with a caption above it. Each scene has props and actors with
   keyframes ({t, x, pose, face, ...}), speech bubbles, a bottom caption box and a camera.
   boot(episode) returns {duration, cues, music}; renderAt(T) draws time T. */
(() => {
  const PW = 1080, PH = 608, VW = 1600, VH = 900;          // panel size, world size
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const F = (n) => (Math.round(n * 10) / 10).toString();
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => Array.from(seg.segment(String(s)), (x) => x.segment).map((g) => (isEmoji(g) ? `<img src="../assets/emoji/${ekey(g)}.png">` : esc(g))).join('');

  let EP, S = [], duration = 0, FLIP = false, INK = '#2a2118', BG = '#ead98c', SKIN = '#f6e7ad', DARK = '#2a2118', PAPER = '#fbf6e2';

  // ---- keyframes: numbers ease between keys, everything else switches at the key
  function at(keys, t, base = {}) {
    if (!keys || !keys.length) return { ...base };
    let st = { ...base, ...keys[0] };
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i], n = keys[i + 1];
      if (t < k.t) break;
      st = { ...st, ...k };
      if (n && t < n.t) {
        const p = ease(clamp((t - k.t) / Math.max(0.001, n.t - k.t - (n.hold || 0)), 0, 1));
        for (const [key, v] of Object.entries(n)) if (typeof v === 'number' && typeof k[key] === 'number' && key !== 't') st[key] = lerp(k[key], v, p);
        st.moving = typeof n.x === 'number' && typeof k.x === 'number' && n.x !== k.x && p > 0 && p < 1;
      }
    }
    return st;
  }

  // ---- a limb drawn with an ink outline
  const limb = (pts, w = 17) => {
    const d = 'M' + pts.map((p) => `${F(p[0])} ${F(p[1])}`).join(' L');
    return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 9}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${SKIN}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  };

  // ---- faces
  function face(kind, f, hx, hy, t) {
    if (kind === 'ai') {
      // the label must read the same way whichever way the figure faces
      return `<text x="${hx}" y="${hy + 22}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="62" fill="${INK}"${FLIP ? ` transform="translate(${2 * hx} 0) scale(-1 1)"` : ''}>AI</text>`;
    }
    let o = '';
    const ey = hy - 4, ex = 20;
    const eyes = {
      neutral: () => `<circle cx="${hx - ex}" cy="${ey}" r="5.5" fill="${INK}"/><circle cx="${hx + ex}" cy="${ey}" r="5.5" fill="${INK}"/>`,
      happy: () => `<path d="M${hx - ex - 9} ${ey + 3} q9 -11 18 0 M${hx + ex - 9} ${ey + 3} q9 -11 18 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      sleep: () => `<path d="M${hx - ex - 9} ${ey} q9 7 18 0 M${hx + ex - 9} ${ey} q9 7 18 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      wide: () => `<circle cx="${hx - ex}" cy="${ey}" r="10" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${hx + ex}" cy="${ey}" r="10" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="${hx - ex}" cy="${ey}" r="4" fill="${INK}"/><circle cx="${hx + ex}" cy="${ey}" r="4" fill="${INK}"/>`,
    };
    const e = { angry: 'neutral', sad: 'neutral', panic: 'wide', proud: 'happy', tired: 'sleep' }[f] || f;
    o += (eyes[e] || eyes.neutral)();
    // brows
    if (f === 'angry') o += `<path d="M${hx - ex - 12} ${ey - 20} l20 8 M${hx + ex + 12} ${ey - 20} l-20 8" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    if (f === 'sad' || f === 'panic') o += `<path d="M${hx - ex - 12} ${ey - 14} l20 -7 M${hx + ex + 12} ${ey - 14} l-20 -7" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    // mouth
    const my = hy + 28;
    if (f === 'happy' || f === 'proud') o += `<path d="M${hx - 16} ${my - 4} q16 16 32 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    else if (f === 'sad' || f === 'tired') o += `<path d="M${hx - 13} ${my + 4} q13 -10 26 0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    else if (f === 'angry') o += `<rect x="${hx - 16}" y="${my - 6}" width="32" height="14" rx="4" fill="${INK}"/>`;
    else if (f === 'wide' || f === 'panic') o += `<ellipse cx="${hx}" cy="${my + 2}" rx="9" ry="12" fill="${INK}"/>`;
    else if (f === 'sleep') o += `<ellipse cx="${hx}" cy="${my}" rx="6" ry="4" fill="${INK}"/>`;
    else o += `<path d="M${hx - 11} ${my} h22" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    if (f === 'panic') o += [0, 1].map((i) => `<path d="M${hx + 62 + i * 14} ${hy - 30 + i * 22 + ((t * 60) % 14)} q-6 10 0 14 q6 -4 0 -14z" fill="#7fd3ff" stroke="${INK}" stroke-width="3"/>`).join('');
    return o;
  }

  // ---- hair, hats and glasses, drawn over the head
  function headwear(kind, hx, hy) {
    if (kind === 'student') return `<path d="M${hx - 56} ${hy - 10} q-6 -58 52 -62 q40 -6 58 28 q-26 -12 -40 2 q-14 -18 -32 4 q-18 -14 -38 28z" fill="${DARK}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
    if (kind === 'teacher') return `<path d="M${hx - 58} ${hy - 6} q0 -62 58 -60 q54 2 58 46 q-40 -26 -96 -10 q-14 6 -20 24z" fill="#8a8a8a" stroke="${INK}" stroke-width="5"/>` +
      `<circle cx="${hx - 20}" cy="${hy - 4}" r="15" fill="none" stroke="${INK}" stroke-width="5"/><circle cx="${hx + 20}" cy="${hy - 4}" r="15" fill="none" stroke="${INK}" stroke-width="5"/><path d="M${hx - 5} ${hy - 4} h10" stroke="${INK}" stroke-width="5"/>` +
      `<path d="M${hx - 22} ${hy + 18} q22 -10 44 0 q-22 8 -44 0z" fill="#8a8a8a" stroke="${INK}" stroke-width="4"/>`;
    return '';
  }

  // ---- a character, feet at (0, 0), facing right
  function figure(a, t) {
    const pose = a.pose || 'idle', kind = a.kind;
    const walk = a.moving ? Math.sin(t * 11) : 0;
    const sit = pose.startsWith('sit') || pose === 'sleep' || pose === 'write';
    let hip = [0, sit ? -175 : -150], sh = [0, sit ? -305 : -285], head = [0, sit ? -368 : -350];
    if (pose === 'sleep') { sh = [44, -285]; head = [96, -300]; }
    if (pose === 'lean') { sh = [28, -280]; head = [44, -344]; }
    let o = '';
    // legs
    if (sit) {
      o += limb([[hip[0] - 10, hip[1]], [hip[0] + 70, hip[1] + 4], [hip[0] + 70, -6]]) + limb([[hip[0] + 6, hip[1]], [hip[0] + 84, hip[1] + 8], [hip[0] + 88, -6]]);
    } else {
      const s = walk * 0.42;
      o += limb([[hip[0] - 14, hip[1]], [hip[0] - 14 + Math.sin(s) * 150, -6]]) + limb([[hip[0] + 14, hip[1]], [hip[0] + 14 - Math.sin(s) * 150, -6]]);
      o += [-1, 1].map((k) => { const fx = hip[0] + 14 * k - k * Math.sin(s) * 150 * (k < 0 ? -1 : 1); return ''; }).join('');
    }
    // feet
    const footX = sit ? [[hip[0] + 70, 0], [hip[0] + 88, 0]] : [[hip[0] - 14 + Math.sin(walk * 0.42) * 150, 0], [hip[0] + 14 - Math.sin(walk * 0.42) * 150, 0]];
    footX.forEach(([fx]) => { o += `<ellipse cx="${F(fx + 16)}" cy="-4" rx="30" ry="14" fill="${DARK}" stroke="${INK}" stroke-width="4"/>`; });
    // torso
    const tw = 54;
    o += `<path d="M${F(sh[0] - tw)} ${F(sh[1] + 14)} Q${F(sh[0])} ${F(sh[1] - 22)} ${F(sh[0] + tw)} ${F(sh[1] + 14)} L${F(hip[0] + 44)} ${F(hip[1] + 6)} Q${F(hip[0])} ${F(hip[1] + 22)} ${F(hip[0] - 44)} ${F(hip[1] + 6)} Z" fill="${kind === 'ai' ? SKIN : kind === 'teacher' ? '#d9c27a' : '#e2c862'}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
    if (kind === 'teacher') o += `<path d="M${F(sh[0])} ${F(sh[1] - 4)} l-10 22 l10 70 l10 -70z" fill="${DARK}"/>`;
    if (kind === 'student') o += `<path d="M${F(sh[0] - 34)} ${F(sh[1] + 4)} L${F(hip[0] - 26)} ${F(hip[1])}" stroke="${DARK}" stroke-width="10"/>`;
    // arms by pose: [elbow, hand] for the back and front arm
    const S0 = [sh[0] - 40, sh[1] + 16], S1 = [sh[0] + 40, sh[1] + 16];
    const ARMS = {
      idle: [[[S0[0] - 18, S0[1] + 66], [S0[0] - 14, S0[1] + 132]], [[S1[0] + 18, S1[1] + 66], [S1[0] + 14, S1[1] + 132]]],
      point: [[[S0[0] - 18, S0[1] + 66], [S0[0] - 14, S0[1] + 132]], [[S1[0] + 70, S1[1] + 6], [S1[0] + 150, S1[1] - 4]]],
      give: [[[S0[0] + 30, S0[1] + 70], [S0[0] + 110, S0[1] + 60]], [[S1[0] + 50, S1[1] + 60], [S1[0] + 120, S1[1] + 50]]],
      hold: [[[S0[0] + 30, S0[1] + 70], [S0[0] + 100, S0[1] + 40]], [[S1[0] + 44, S1[1] + 60], [S1[0] + 104, S1[1] + 30]]],
      thumb: [[[S0[0] - 18, S0[1] + 66], [S0[0] - 14, S0[1] + 132]], [[S1[0] + 70, S1[1] + 30], [S1[0] + 82, S1[1] - 50]]],
      wave: [[[S0[0] - 18, S0[1] + 66], [S0[0] - 14, S0[1] + 132]], [[S1[0] + 60, S1[1] - 10], [S1[0] + 70 + Math.sin(t * 12) * 26, S1[1] - 92]]],
      panic: [[[S0[0] - 60, S0[1] - 10], [S0[0] - 50, S0[1] - 96]], [[S1[0] + 60, S1[1] - 10], [S1[0] + 50, S1[1] - 96]]],
      write: [[[S0[0] + 40, S0[1] + 70], [S0[0] + 120, S0[1] + 86]], [[S1[0] + 40, S1[1] + 74], [S1[0] + 110 + Math.sin(t * 22) * 10, S1[1] + 92]]],
      sleep: [[[S0[0] + 50, S0[1] + 40], [S0[0] + 130, S0[1] + 44]], [[S1[0] + 50, S1[1] + 44], [S1[0] + 110, S1[1] + 40]]],
    };
    const arms = ARMS[pose] || ARMS[sit ? 'write' : 'idle'];
    const sw = a.moving ? Math.sin(t * 11) * 26 : 0;
    o = limb([S0, [arms[0][0][0] + sw, arms[0][0][1]], [arms[0][1][0] + sw, arms[0][1][1]]]) + o;   // back arm behind the body
    const front = limb([S1, [arms[1][0][0] - sw, arms[1][0][1]], [arms[1][1][0] - sw, arms[1][1][1]]]);
    const hand = [arms[1][1][0] - sw, arms[1][1][1]];
    let extra = '';
    if (pose === 'thumb') extra += `<path d="M${hand[0] - 6} ${hand[1] - 6} l2 -30" stroke="${INK}" stroke-width="20" stroke-linecap="round"/><path d="M${hand[0] - 6} ${hand[1] - 6} l2 -30" stroke="${SKIN}" stroke-width="11" stroke-linecap="round"/>`;
    if (a.holds) extra += held(a.holds, hand[0], hand[1], t);
    // head
    const r = kind === 'ai' ? 62 : 58;
    let h = `<circle cx="${head[0]}" cy="${head[1]}" r="${r}" fill="${SKIN}" stroke="${INK}" stroke-width="7"/>`;
    if (kind !== 'ai') h += `<ellipse cx="${head[0] - r + 4}" cy="${head[1] + 4}" rx="10" ry="16" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>`;
    h += headwear(kind, head[0], head[1]) + face(kind, a.face || 'neutral', head[0] + (kind === 'ai' ? 0 : 8), head[1], t);
    return o + h + front + extra;
  }

  // ---- things a character holds
  function held(what, x, y) {
    if (what === 'paper') return `<rect x="${x - 10}" y="${y - 64}" width="70" height="90" rx="4" fill="${PAPER}" stroke="${INK}" stroke-width="5" transform="rotate(-8 ${x} ${y})"/><path d="M${x + 2} ${y - 40} h40 M${x + 2} ${y - 26} h44 M${x + 2} ${y - 12} h30" stroke="${INK}" stroke-width="3" transform="rotate(-8 ${x} ${y})"/>`;
    if (what === 'stack') return `<g transform="translate(${x - 50} ${y - 90})">${Array.from({ length: 7 }, (_, i) => `<rect x="${(i % 2) * 6}" y="${i * 13}" width="100" height="14" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`).join('')}</g>`;
    if (what === 'crumple') return `<circle cx="${x + 20}" cy="${y - 10}" r="26" fill="${PAPER}" stroke="${INK}" stroke-width="5"/><path d="M${x + 4} ${y - 18} l18 10 l12 -12 M${x + 10} ${y + 4} l16 -8" stroke="${INK}" stroke-width="3" fill="none"/>`;
    if (what === 'phone') return `<rect x="${x - 6}" y="${y - 56}" width="38" height="66" rx="8" fill="${DARK}" stroke="${INK}" stroke-width="4"/>`;
    return '';
  }

  // ---- props
  const PROP = {
    wall: (p) => `<rect x="0" y="0" width="${VW}" height="${p.floor ?? 700}" fill="${p.color || BG}"/><rect x="0" y="${p.floor ?? 700}" width="${VW}" height="${VH}" fill="${p.ground || '#dcc770'}"/><path d="M0 ${p.floor ?? 700} H${VW}" stroke="${INK}" stroke-width="6"/>`,
    window: (p, t) => {
      const { x, y, w = 260, h = 220 } = p;
      let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.night ? '#3b4766' : '#cfe8f3'}" stroke="${INK}" stroke-width="8"/>`;
      if (p.night) o += `<circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="24" fill="#fff6c8" stroke="${INK}" stroke-width="4"/>` + [0.2, 0.4, 0.86].map((k, i) => `<circle cx="${x + w * k}" cy="${y + h * (0.2 + i * 0.25)}" r="4" fill="#fff6c8"/>`).join('');
      if (p.peek) {   // a face squashed against the glass
        const bob = Math.sin(t * 3) * 4, px = x + w / 2, py = y + h * 0.62 + bob;
        o += `<ellipse cx="${px}" cy="${py}" rx="${w * 0.3}" ry="${h * 0.42}" fill="${SKIN}" stroke="${INK}" stroke-width="6"/>`;
        o += `<text x="${px}" y="${py + 20}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="56" fill="${INK}">AI</text>`;
        o += `<ellipse cx="${px - w * 0.36}" cy="${py - 20}" rx="22" ry="28" fill="${SKIN}" stroke="${INK}" stroke-width="5"/><ellipse cx="${px + w * 0.36}" cy="${py - 20}" rx="22" ry="28" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>`;
      }
      if (!p.peek) o += `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="${INK}" stroke-width="7"/>`;
      return o;
    },
    desk: (p) => { const { x, y = 700, w = 300 } = p; return `<rect x="${x - w / 2}" y="${y - 210}" width="${w}" height="26" rx="4" fill="#c59a55" stroke="${INK}" stroke-width="6"/><path d="M${x - w / 2 + 20} ${y - 184} V${y} M${x + w / 2 - 20} ${y - 184} V${y}" stroke="${INK}" stroke-width="12"/>`; },
    chair: (p) => { const { x, y = 700 } = p; return `<path d="M${x - 40} ${y - 175} h90 M${x - 34} ${y - 175} V${y} M${x + 44} ${y - 175} V${y} M${x - 40} ${y - 175} V${y - 330}" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>`; },
    lamp: (p) => { const { x, y } = p; return `<path d="M${x} ${y} v-90 l40 -40" stroke="${INK}" stroke-width="8" fill="none"/><path d="M${x + 18} ${y - 150} l70 10 l-24 50z" fill="#f2c94c" stroke="${INK}" stroke-width="6"/><path d="M${x + 60} ${y - 100} l-60 100 h170z" fill="#fff6c8" opacity=".35"/>`; },
    clock: (p, t) => { const { x, y, r = 46 } = p, sp = p.spin || 0.4, a1 = t * sp * 360, a2 = t * sp * 30; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="6"/><path d="M${x} ${y} l0 ${-r * 0.75}" stroke="${INK}" stroke-width="5" transform="rotate(${F(a1)} ${x} ${y})"/><path d="M${x} ${y} l0 ${-r * 0.5}" stroke="${INK}" stroke-width="7" transform="rotate(${F(a2)} ${x} ${y})"/>`; },
    stack: (p) => { const n = Math.round(p.n ?? 6), { x, y } = p; let o = ''; for (let i = 0; i < n; i++) o += `<rect x="${x - 60 + (i % 2) * 7}" y="${y - 16 * (i + 1)}" width="120" height="16" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`; if (p.label && n > 0) o += `<text x="${x}" y="${y - 16 * n - 14}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="26" fill="${INK}">${esc(p.label)}</text>`; return o; },
    balls: (p) => { const n = Math.round(p.n ?? 0); let o = ''; for (let i = 0; i < n; i++) { const bx = p.x + (i % 4) * 46 - 70 + (i > 3 ? 22 : 0), by = (p.y ?? 690) - (i > 3 ? 40 : 0); o += `<circle cx="${bx}" cy="${by - 20}" r="24" fill="${PAPER}" stroke="${INK}" stroke-width="5"/><path d="M${bx - 12} ${by - 28} l14 8 l10 -10" stroke="${INK}" stroke-width="3" fill="none"/>`; } return o; },
    door: (p) => { const { x, y = 700, w = 170, h = 400 } = p, o = clamp(p.open ?? 0, 0, 1); return `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#3a2f24" stroke="${INK}" stroke-width="7"/><path d="M${x} ${y - h} L${x + w * (1 - o * 0.8)} ${y - h + o * 30} L${x + w * (1 - o * 0.8)} ${y - o * 30} L${x} ${y} Z" fill="#b5833f" stroke="${INK}" stroke-width="7"/><circle cx="${x + w * (1 - o * 0.8) - 24}" cy="${y - h / 2}" r="9" fill="${INK}"/>`; },
    sign: (p) => { const { x, y, w = 300 } = p, lines = p.lines || [], h = 30 + lines.length * 40; return `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="6" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>` + lines.map((l, i) => `<text x="${x}" y="${y + 50 + i * 40}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="${i === 0 ? 34 : 26}" fill="${l.startsWith('!') ? '#c0392b' : INK}">${esc(l.replace(/^!/, ''))}</text>`).join(''); },
    board: (p) => { const { x, y, w = 420, h = 230 } = p; return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2f4a3a" stroke="${INK}" stroke-width="9"/>` + (p.lines || []).map((l, i) => `<text x="${x + 26}" y="${y + 58 + i * 46}" font-family="Inter, sans-serif" font-weight="700" font-size="34" fill="#f3f0e0">${esc(l)}</text>`).join(''); },
    paper: (p) => { const { x, y, w = 260, h = 330 } = p, rot = p.rot ?? 0; return `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${PAPER}" stroke="${INK}" stroke-width="6"/>` + (p.lines || []).map((l, i) => `<text x="${x - w / 2 + 20}" y="${y - h / 2 + 48 + i * 40}" font-family="Inter, sans-serif" font-weight="${i === 0 ? 900 : 600}" font-size="${i === 0 ? 30 : 26}" fill="${INK}">${esc(l)}</text>`).join('') + '</g>'; },
    laptop: (p) => { const { x, y, w = 360 } = p, h = w * 0.62; return `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" rx="12" fill="${DARK}" stroke="${INK}" stroke-width="7"/><rect x="${x - w / 2 + 16}" y="${y - h + 16}" width="${w - 32}" height="${h - 32}" fill="#16212e"/>` +
      (p.lines || []).map((l, i) => { const fs = p.size || 26; return `<text x="${x - w / 2 + 26}" y="${F(y - h + 16 + fs * 1.5 + i * fs * 1.45)}" font-family="JetBrains Mono, monospace" font-weight="700" font-size="${fs}" fill="${l.startsWith('✓') ? '#6bff95' : '#cfe7ff'}">${esc(l)}</text>`; }).join('') +
      `<path d="M${x - w / 2 - 30} ${y + 18} h${w + 60} l-30 -18 h${-w}z" fill="#9aa0a6" stroke="${INK}" stroke-width="6"/>`; },
    stamp: (p, t) => { const k = clamp((t - (p.from ?? 0)) / 0.18, 0, 1); if (k <= 0) return ''; const s = 1.9 - 0.9 * k; return `<g transform="translate(${p.x} ${p.y}) rotate(${p.rot ?? -14}) scale(${F(s)})" opacity="${F(k)}"><rect x="${-(p.w || 220) / 2}" y="-52" width="${p.w || 220}" height="104" rx="10" fill="none" stroke="${p.color || '#d63031'}" stroke-width="11"/><text x="0" y="${p.size ? p.size * 0.35 : 26}" text-anchor="middle" font-family="Anton, Inter, sans-serif" font-size="${p.size || 76}" fill="${p.color || '#d63031'}" letter-spacing="2">${esc(p.text)}</text></g>`; },
    zzz: (p, t) => [0, 1, 2].map((i) => { const k = ((t * 0.8 + i / 3) % 1); return `<text x="${p.x + k * 60 + i * 6}" y="${p.y - k * 120}" font-family="Inter, sans-serif" font-weight="900" font-size="${28 + i * 8}" fill="${INK}" opacity="${F(1 - k)}">Z</text>`; }).join(''),
    fly: (p, t) => { if (t < p.t0 || t > p.t1) return ''; let o = ''; for (let i = 0; i < (p.n || 5); i++) { const k = ((t - p.t0) * (p.rate || 2.4) + i / (p.n || 5)) % 1, x = lerp(p.x1, p.x2, k), y = lerp(p.y1, p.y2, k) - Math.sin(k * Math.PI) * 120; o += `<rect x="${x - 30}" y="${y - 20}" width="60" height="40" fill="${PAPER}" stroke="${INK}" stroke-width="4" transform="rotate(${F(k * 300 + i * 40)} ${x} ${y})"/>`; } return o; },
    text: (p) => `<text x="${p.x}" y="${p.y}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="${p.size || 40}" fill="${p.color || INK}">${esc(p.text)}</text>`,
  };

  function bubble(b, ax, ay, t) {
    const k = clamp((t - b.t0) / 0.15, 0, 1), txt = b.text, w = Math.max(160, txt.length * (b.size || 34) * 0.62 + 60), h = (b.size || 34) + 40;
    const x = ax + (b.dx ?? 0), y = ay + (b.dy ?? -120);
    return `<g transform="translate(${F(x)} ${F(y)}) scale(${F(0.6 + 0.4 * k)})" opacity="${F(k)}"><ellipse cx="0" cy="0" rx="${F(w / 2)}" ry="${F(h / 2 + 6)}" fill="#fffdf0" stroke="${INK}" stroke-width="6"/>
      <path d="M${(b.tail ?? 1) * -10} ${h / 2} l${(b.tail ?? 1) * -14} 36 l${(b.tail ?? 1) * 34} -38z" fill="#fffdf0" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><rect x="${(b.tail ?? 1) * -14 - 16}" y="${h / 2 - 12}" width="40" height="14" fill="#fffdf0"/>
      <text x="0" y="${F((b.size || 34) * 0.36)}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="${b.size || 34}" fill="${INK}">${esc(txt)}</text></g>`;
  }

  window.boot = async (ep) => {
    EP = ep;
    if (ep.palette) ({ ink: INK = INK, bg: BG = BG, skin: SKIN = SKIN, paper: PAPER = PAPER } = ep.palette);
    const cues = [];
    let t = 0;
    for (const sc of ep.scenes) {
      S.push({ ...sc, t0: t, t1: t + sc.dur });
      (sc.sfx || []).forEach((c) => cues.push({ ...c, t: t + c.t }));
      t += sc.dur;
    }
    duration = t + (ep.tail ?? 0);
    $('top').innerHTML = rich(ep.top || '');
    await document.fonts.ready;
    const music = ep.music ? { segments: [{ track: ep.music.track, t0: 0, t1: duration, gain: ep.music.gain ?? -18, offset: ep.music.offset ?? 0, fadeIn: 0.05, fadeOut: 0.6, duck: false }] } : null;
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music, mainStart: 0, exchanges: S.map((s) => +s.t0.toFixed(2)) };
  };

  window.renderAt = async (T) => {
    const sc = S.find((s) => T < s.t1) || S[S.length - 1], t = T - sc.t0;
    const cam = at(sc.cam, t, EP.cam || { x: VW / 2, y: VH / 2, z: 1 });   // a default framing for every scene
    let o = '';
    const props = (sc.props || []).map((p) => ({ ...p, ...at(p.keys, t) }));
    for (const p of props.filter((p) => !p.front && !p.hide)) o += PROP[p.kind] ? PROP[p.kind](p, t) : '';
    const actors = (sc.actors || []).map((a) => ({ ...a, ...at(a.keys, t) }));
    const pos = {};
    for (const a of actors) {
      if (a.hide) continue;
      const sx = a.flip ? -1 : 1, sc2 = a.scale ?? 1;
      FLIP = !!a.flip;
      o += `<g transform="translate(${F(a.x)} ${F(a.y ?? 700)}) scale(${sx * sc2} ${sc2})">${figure(a, t)}</g>`;
      FLIP = false;
      pos[a.id] = [a.x + (a.flip ? -20 : 20), (a.y ?? 700) - 360 * sc2];
    }
    for (const p of props.filter((p) => p.front && !p.hide)) o += PROP[p.kind] ? PROP[p.kind](p, t) : '';
    for (const b of sc.bubbles || []) {
      if (t < b.t0 || t > (b.t1 ?? sc.dur)) continue;
      const [ax, ay] = b.at || pos[b.who] || [800, 300];
      o += bubble(b, ax, ay, t);
    }
    // the moral, in a box along the bottom of the panel (fixed on screen, not moved by the camera)
    const cap = sc.caption || EP.caption, capOn = !!cap && T >= (cap.at ?? Infinity);
    $('cap').style.display = capOn ? 'block' : 'none';
    if (capOn) { $('cap').innerHTML = (cap.lines || [cap.text]).map((l) => `<div>${rich(l)}</div>`).join(''); $('cap').style.opacity = F(clamp((T - cap.at) / 0.3, 0, 1)); }
    const z = cam.z, vx = cam.x - VW / 2 / z, vy = cam.y - VH / 2 / z;
    $('panel').innerHTML = `<svg viewBox="${F(vx)} ${F(vy)} ${F(VW / z)} ${F(VH / z)}" width="${PW}" height="${PH}" xmlns="http://www.w3.org/2000/svg"><rect x="-2000" y="-2000" width="6000" height="6000" fill="${BG}"/>${o}</svg>`;
    let fl = 0;
    for (const f of sc.flash || []) { const q = (t - f) / 0.18; if (q >= 0 && q < 1) fl = Math.max(fl, 0.7 * (1 - q)); }
    $('flash').style.opacity = F(fl);
    const imgs = Array.from(document.images).filter((im) => !im.complete).map((im) => im.decode().catch(() => {}));
    if (imgs.length) await Promise.all(imgs);
  };
})();
