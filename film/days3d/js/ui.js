// 2D overlay helpers: manga speed lines, Japanese SFX, UI cards, tags, vignettes.
export async function loadFonts() {
  const faces = [new FontFace('Archivo', 'url(./fonts/Archivo-wdth-wght.ttf)', { weight: '100 900' }),
    new FontFace('Playfair', 'url(./fonts/PlayfairDisplay-wght.ttf)', { weight: '400 900' }),
    new FontFace('Fredoka', 'url(./fonts/Fredoka-Bold.ttf)', { weight: '700' })];
  for (const f of faces) { await f.load(); document.fonts.add(f); }
  await document.fonts.load('40px IPAGothic', '残り日数あとで');
}

export function speedLines(g, W, H, cx, cy, o = {}) {
  const n = o.n || 160, r0 = o.r0 || Math.min(W, H) * 0.32, R = Math.hypot(W, H);
  let s = o.seed || 3; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.save(); g.fillStyle = o.color || 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, w = (0.002 + rnd() * 0.012), r1 = r0 * (0.8 + rnd() * 0.6);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R);
    g.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R);
    g.closePath(); g.fill();
  }
  g.restore();
}

export function hLines(g, W, H, o = {}) {     // horizontal motion lines
  let s = o.seed || 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.save(); g.strokeStyle = o.color || 'rgba(255,255,255,0.6)';
  for (let i = 0; i < (o.n || 40); i++) { const y = rnd() * H, x = rnd() * W, l = 80 + rnd() * 400; g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke(); }
  g.restore();
}

// Japanese sound effect: heavy outlined letters, optionally slanted
export function sfx(g, text, x, y, size, o = {}) {
  if (/^[\x20-\x7E\u2026]+$/.test(text)) {   // Latin: draw the word whole
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.transform(1, 0, o.skew ?? -0.1, 1, 0, 0);
    g.font = `700 ${size}px Fredoka`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.letterSpacing = `${size * 0.03}px`;
    g.lineWidth = size * 0.3; g.strokeStyle = o.outer || '#ffffff'; if (o.outer !== 'rgba(0,0,0,0)') g.strokeText(text, 0, 0);
    g.lineWidth = size * 0.14; g.strokeStyle = o.stroke || '#120c0a'; g.strokeText(text, 0, 0);
    g.fillStyle = o.fill || '#ffffff'; g.fillText(text, 0, 0);
    g.restore(); return;
  }
  g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.transform(1, 0, o.skew || -0.12, 1, 0, 0);
  g.font = `${size}px IPAGothic`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  const chars = [...text]; let cx = 0;
  const step = size * (o.track ?? 0.92);
  chars.forEach((ch, i) => {
    const dy = (o.wave || 0) * Math.sin(i * 1.3) * size, sc = 1 + (o.grow || 0) * i;
    g.save(); g.translate(cx - (chars.length - 1) * step / 2 * (o.align === 'left' ? 0 : 1), dy); g.scale(sc, sc);
    g.lineWidth = size * 0.26; g.strokeStyle = o.outer || '#ffffff'; g.strokeText(ch, 0, 0);
    g.lineWidth = size * 0.12; g.strokeStyle = o.stroke || '#120c0a'; g.strokeText(ch, 0, 0);
    g.fillStyle = o.fill || '#ffffff'; g.fillText(ch, 0, 0);
    g.restore(); cx += step * sc;
  });
  g.restore();
}

export function text(g, s, x, y, o = {}) {
  g.save(); g.font = o.font || '700 40px Archivo'; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
  if (o.letter) g.letterSpacing = o.letter + 'px';
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 24; }
  if (o.stroke) { g.lineWidth = o.lw || 6; g.strokeStyle = o.stroke; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = o.color || '#fff'; g.fillText(s, x, y); g.restore();
}

export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

export function vignette(g, W, H, k = 0.55, color = '0,0,0') {
  const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  gr.addColorStop(0, `rgba(${color},0)`); gr.addColorStop(1, `rgba(${color},${k})`); g.fillStyle = gr; g.fillRect(0, 0, W, H);
}

export function letterbox(g, W, H, f = 0.06) { g.fillStyle = '#000'; g.fillRect(0, 0, W, H * f); g.fillRect(0, H * (1 - f), W, H * f); }

// a score tag hanging next to a character
export function tag(g, x, y, rows, o = {}) {
  const w = o.w || 260, rh = o.rh || 46, h = rows.length * rh + 26;
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + h); g.lineTo(o.px ?? x + 30, o.py ?? y + h + 60); g.stroke();
  rrect(g, x, y, w, h, 14); g.fillStyle = o.bg || 'rgba(14,12,30,0.82)'; g.fill(); g.lineWidth = 3; g.strokeStyle = o.edge || '#ffc566'; g.stroke();
  rows.forEach(([k, v, c], i) => {
    text(g, k, x + 18, y + 22 + rh * (i + 0.62), { font: '600 20px Archivo', color: 'rgba(255,255,255,0.7)', letter: 2 });
    text(g, v, x + w - 18, y + 22 + rh * (i + 0.62), { font: '800 34px Archivo', color: c || '#fff', align: 'right' });
  });
  g.restore();
}

// manga narration box
export function narr(g, x, y, lines, o = {}) {
  const size = o.size || 30, w = o.w || 420, h = lines.length * size * 1.4 + size * 0.9;
  g.save(); g.fillStyle = o.bg || '#fffdf6'; g.strokeStyle = '#120c0a'; g.lineWidth = 4; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
  lines.forEach((l, i) => text(g, l, x + size * 0.6, y + size * 1.25 + i * size * 1.4, { font: l.font || `${o.weight || 600} ${size}px ${o.family || 'Archivo'}`, color: '#120c0a' }));
  g.restore();
}

// thumbnail caption in the channel-format we follow: heavy rounded white caps with a dark outline and a soft shadow
export function thumbText(g, s, x, y, size, o = {}) {
  g.save(); g.font = `700 ${size}px Fredoka`; g.textAlign = o.align || 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
  if (o.letter) g.letterSpacing = o.letter + 'px';
  g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = size * 0.22; g.shadowOffsetY = size * 0.04;
  g.lineWidth = size * 0.16; g.strokeStyle = '#0b0a10'; g.strokeText(s, x, y);
  g.shadowColor = 'transparent'; g.fillStyle = o.fill || '#ffffff'; g.fillText(s, x, y);
  g.restore();
}
