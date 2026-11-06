// Short: "One sentence made this game." — Sock Thief, built by Claude from one prompt.
// Footage: the real game, recorded by courses/shorts/sock-thief/record.cjs (frames passed with --footage).
document.write('<script src="scenes/sockthief.data.js"><\/script>');
(function () {
  const { C, F } = MG;
  C.accent = '#FFD25A';                       // the game's own sock-yellow
  const cx = 540;
  const FS = 1.15, FW = 720 * FS, FH = 960 * FS, FX = cx - FW / 2, FY = 352;

  // footage edit: [video start, video end, footage start]
  const SEG = [
    [0.00, 2.44, 8.10],     // hook: Dad stirs, opens an eye, the corgi freezes
    [8.29, 11.22, 0.40],    // level 1 banner, first run, first sock
    [11.22, 13.17, 3.33],   // home: points
    [13.17, 17.56, 5.80],   // the daring run: meter fills, Dad stirs, eye opens, freeze
    [17.56, 19.51, 19.50],  // level 2: "Dad is a light sleeper"
    [19.51, 21.95, 25.95],  // reckless: busted
  ];
  const OUTRO = [27.4, 40, 8.10];
  const footAt = (t) => {
    for (const [a, b, f] of SEG) if (t >= a && t < b) return f + (t - a);
    if (t >= OUTRO[0]) return OUTRO[2] + ((t - OUTRO[0]) % 2.44);
    return null;
  };
  const idx = (f) => Math.round(f * 30) + 1;
  const g2s = (x, y, s = FS, ox = FX, oy = FY) => [ox + x * s, oy + y * s];

  // ---------------------------------------------------------------- pieces
  function phone(c, t, s, ox, oy, alpha) {
    const f = footAt(t); if (f == null || alpha <= 0) return;
    const img = MG.frame(idx(f)); const w = 720 * s, h = 960 * s;
    c.save(); c.globalAlpha *= alpha;
    c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 60; c.shadowOffsetY = 24;
    MG.rrect(c, ox - 14, oy - 14, w + 28, h + 28, 46 * s); c.fillStyle = '#0E0F14'; c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = '#2E323C'; c.lineWidth = 2; c.stroke();
    c.save(); MG.rrect(c, ox, oy, w, h, 30 * s); c.clip();
    if (img) c.drawImage(img, ox, oy, w, h);
    c.restore(); c.restore();
  }
  function hiRect(c, t, t0, x, y, w, h, tOut) {   // a highlight drawn on, in game coordinates
    const p = MG.tw(t, t0, t0 + 0.4, 'outCubic'); if (p <= 0) return;
    const fade = tOut ? 1 - MG.tw(t, tOut, tOut + 0.25) : 1; if (fade <= 0) return;
    const [X, Y] = g2s(x, y); const W = w * FS, H = h * FS, pad = 10;
    const path = new Path2D(); const r = Math.min(18, H / 2 + pad);
    path.roundRect(X - pad, Y - pad, W + 2 * pad, H + 2 * pad, r);
    c.save(); c.globalAlpha *= fade; c.shadowColor = C.accent; c.shadowBlur = 18;
    MG.drawOn(c, path, 2 * (W + H) + 8 * pad, p, { color: C.accent, width: 6 }); c.restore();
  }
  function hiCircle(c, t, t0, x, y, r, tOut) {
    const p = MG.tw(t, t0, t0 + 0.35, 'outCubic'); if (p <= 0) return;
    const fade = tOut ? 1 - MG.tw(t, tOut, tOut + 0.25) : 1; if (fade <= 0) return;
    const [X, Y] = g2s(x, y);
    c.save(); c.globalAlpha *= fade; c.strokeStyle = C.accent; c.lineWidth = 6; c.lineCap = 'round'; c.shadowColor = C.accent; c.shadowBlur = 18;
    c.beginPath(); c.arc(X, Y, r * FS, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke(); c.restore();
    MG.pulse(c, X, Y, r * FS, r * FS * 2.2, MG.p(t, t0 + 0.2, t0 + 0.9), C.accent, 4);
  }
  const cap = (c, t, pieces, tIn, tOut, y = 1532) => MG.line(c, pieces, cx, y, 'center', t, tIn, tOut, 0.06);
  const sans = (s, o = {}) => ({ s, o: { size: 54, weight: 650, ...o } });
  const ital = (s, o = {}) => ({ s, o: { size: 64, weight: 400, family: F.serif, italic: true, color: C.accent, ...o } });

  function promptCard(c, t) {
    const inP = MG.spring(t - 2.45, 2.2, 0.62); if (inP <= 0 || t > 6.6) return;
    const sent = MG.tw(t, 5.3, 5.85, 'inOutExpo');
    const out = MG.tw(t, 6.2, 6.6, 'inOutExpo');
    const text = SOCK.prompt, n = Math.floor(MG.clamp((t - 2.75) / 2.3) * text.length);
    const typed = text.slice(0, n);
    // the input box, then the sent bubble
    const w = MG.lerp(920, 760, sent), x = MG.lerp(cx - 460, cx + 460 - 760, sent), y = MG.lerp(820, 600, sent) + (1 - inP) * 140 - out * 120;
    c.save(); c.globalAlpha *= MG.clamp(inP * 1.5) * (1 - out);
    const lines = wrap(c, typed + (sent < 0.5 && Math.floor(t * 2.4) % 2 ? '|' : ''), w - 80, { size: 46, weight: 500 });
    const h = Math.max(1, lines.length) * 64 + (sent < 0.5 ? 150 : 70);
    MG.rrect(c, x, y, w, h, 34); c.fillStyle = sent > 0.5 ? '#2A2D36' : '#16181F'; c.fill();
    c.strokeStyle = sent > 0.5 ? 'transparent' : '#3A3F49'; c.lineWidth = 2; c.stroke();
    if (!typed && sent < 0.5) MG.text(c, 'Message Claude…', x + 40, y + 74, { size: 46, weight: 500, color: C.mute });
    lines.forEach((l, i) => MG.text(c, l, x + 40, y + 74 + i * 64, { size: 46, weight: 500, color: C.ink }));
    if (sent < 0.5) {  // send button
      const bp = 1 + 0.18 * Math.sin(MG.p(t, 5.15, 5.4) * Math.PI);
      const bx = x + w - 70, by = y + h - 64;
      c.save(); c.translate(bx, by); c.scale(bp, bp);
      c.fillStyle = n >= text.length ? C.accent : C.dim; c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#111'; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(0, 14); c.lineTo(0, -14); c.moveTo(-12, -2); c.lineTo(0, -14); c.lineTo(12, -2); c.stroke(); c.restore();
    }
    c.restore();
    // Claude is writing…
    const r = MG.tw(t, 5.8, 6.1) * (1 - out);
    if (r > 0) {
      c.save(); c.globalAlpha *= r;
      MG.text(c, 'Claude', cx - 460, 600 + h + 110, { size: 40, weight: 700, color: C.ink });
      for (let i = 0; i < 3; i++) { const b = Math.sin((t - 5.8) * 10 - i * 0.9); c.fillStyle = C.mute; c.beginPath(); c.arc(cx - 300 + i * 30, 600 + h + 98 - Math.max(0, b) * 8, 8, 0, Math.PI * 2); c.fill(); }
      c.restore();
    }
  }
  function wrap(c, s, maxW, o) {
    const words = s.split(' '), out = []; let line = '';
    for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (MG.measure(c, tst, o) > maxW && line) { out.push(line); line = wd; } else line = tst; }
    if (line) out.push(line); return out;
  }

  function codeCard(c, t) {
    const inP = MG.spring(t - 6.3, 2.4, 0.65); if (inP <= 0 || t > 8.6) return;
    const out = MG.tw(t, 8.15, 8.5, 'inOutExpo');
    const x = cx - 470, y = 430 + (1 - inP) * 160 + out * 60, w = 940, h = 960;
    c.save(); c.globalAlpha *= MG.clamp(inP * 1.4) * (1 - out);
    MG.rrect(c, x, y, w, h, 30); c.fillStyle = '#0D0F14'; c.fill(); c.strokeStyle = '#2E323C'; c.lineWidth = 2; c.stroke();
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(x + 40 + i * 30, y + 38, 9, 0, Math.PI * 2); c.fill(); });
    MG.text(c, 'sock-thief.html', x + 140, y + 46, { size: 26, weight: 500, family: 'JetBrains Mono', color: C.mute });
    const total = SOCK.lines, scroll = MG.tw(t, 6.45, 8.1, 'inOutCubic') * (total - 34);
    MG.counter(c, Math.round(MG.tw(t, 6.45, 8.1, 'inOutCubic') * total), x + w - 160, y + 48, { size: 30, weight: 600, family: F.disp, cols: 3, align: 'right', commas: false, color: C.accent });
    MG.text(c, 'lines', x + w - 148, y + 48, { size: 26, weight: 500, color: C.mute });
    c.save(); c.beginPath(); c.rect(x + 10, y + 76, w - 20, h - 90); c.clip();
    const lh = 26, first = Math.floor(scroll);
    for (let k = 0; k < 36; k++) {
      const li = first + k; if (li >= total) break;
      const ly = y + 110 + (k - (scroll - first)) * lh;
      MG.text(c, String(li + 1).padStart(3, ' '), x + 24, ly, { size: 19, weight: 400, family: 'JetBrains Mono', color: '#3F4450' });
      const line = SOCK.code[li].slice(0, 70);
      const kw = /^\s*(const|function|let|if|for|return|ctx\.|state\.)/.test(line);
      MG.text(c, line, x + 90, ly, { size: 19, weight: 400, family: 'JetBrains Mono', color: kw ? '#FFD25A' : '#B8BDC8' });
    }
    c.restore();
    const g = c.createLinearGradient(0, y + 76, 0, y + h); g.addColorStop(0, 'rgba(13,15,20,0.9)'); g.addColorStop(0.12, 'rgba(13,15,20,0)'); g.addColorStop(0.85, 'rgba(13,15,20,0)'); g.addColorStop(1, 'rgba(13,15,20,0.95)');
    c.fillStyle = g; c.fillRect(x + 2, y + 76, w - 4, h - 78);
    c.restore();
  }

  function trick(c, t) {
    if (t < 21.9 || t > 27.7) return;
    const out = MG.tw(t, 27.3, 27.65, 'inOutExpo');
    c.save(); c.globalAlpha *= 1 - out;
    MG.line(c, [{ s: 'The trick:', o: { size: 96, weight: 400, family: F.serif, italic: true, color: C.mute } }], cx, 400, 'center', t, 22.1, null);
    MG.line(c, [{ s: 'Make a game where', o: { size: 48, weight: 500, color: C.mute } }], 120, 560, 'left', t, 22.35, null);
    const chips = [['my corgi', 'HERO', 22.6], ['steals socks', 'GOAL', 23.0], ['from sleeping dad', 'DANGER', 23.4], ['sneaks them back to bed', 'FINISH LINE', 23.8]];
    chips.forEach(([s, label, t0], i) => {
      const y = 720 + i * 160, o = { size: 60, weight: 700, track: -1 };
      const w = MG.measure(c, s, o), p = MG.tw(t, t0, t0 + 0.45, 'outExpo');
      if (p <= 0) return;
      c.save(); c.globalAlpha *= 0.22; c.fillStyle = C.accent;
      MG.rrect(c, 104, y - 58, (w + 32) * p, 80, 16); c.fill(); c.restore();
      MG.rise(c, s, 120, y, o, MG.tw(t, t0 + 0.05, t0 + 0.55));
      MG.rise(c, label, 122, y - 74, { size: 24, weight: 700, track: 5, color: C.accent }, MG.tw(t, t0 + 0.12, t0 + 0.6));
    });
    MG.line(c, [{ s: 'hero + goal + danger + finish line', o: { size: 46, weight: 600, color: C.ink } }], cx, 1400, 'center', t, 24.6, null);
    MG.line(c, [{ s: '= a game.', o: { size: 120, weight: 400, family: F.serif, italic: true, color: C.accent } }], cx, 1530, 'center', t, 25.0, null);
    c.restore();
  }

  function outro(c, t) {
    if (t < 27.4) return;
    MG.line(c, [{ s: 'Your turn.', o: { size: 150, weight: 400, family: F.serif, italic: true } }], cx, 420, 'center', t, 27.45, null);
    MG.line(c, [{ s: 'Your pet.', o: { size: 56, weight: 650 } }, { s: 'One sentence.', o: { size: 56, weight: 650, color: C.accent } }], cx, 530, 'center', t, 27.75, null, 0.08);
    const k = MG.spring(t - 27.9, 2.2, 0.6);
    if (k > 0) phone(c, t, 0.78, cx - 720 * 0.78 / 2, 640 + (1 - Math.min(1, k)) * 200, MG.clamp(k * 1.5));
    MG.line(c, [{ s: 'Prompt in the pinned comment', o: { size: 46, weight: 600, color: C.accent } }, { s: '↓', o: { size: 46, weight: 600, color: C.accent } }], cx, 1500 + 6 * Math.sin(t * 5) * MG.p(t, 29.3, 29.6), 'center', t, 28.5, null, 0.06);
  }

  // ---------------------------------------------------------------- the scene
  window.SCENE = {
    duration: 32.0,
    frames(t) {
      const ids = new Set();
      for (const dt of [-0.02, 0, 0.02]) { const f = footAt(t + dt); if (f != null) ids.add(idx(f)); }
      return [...ids];
    },
    get cues() {
      const cues = [
        { t: 0.0, s: 'swish', g: 0.4 }, { t: 2.3, s: 'whoosh', g: 0.6 },
        ...Array.from({ length: 23 }, (_, i) => ({ t: 2.75 + i * 0.1, s: 'tick', g: 0.35 })),
        { t: 5.22, s: 'pop', g: 0.8 }, { t: 5.3, s: 'swish', g: 0.6 },
        { t: 6.3, s: 'whoosh', g: 0.5 }, { t: 6.45, s: 'roll', g: 0.7 }, { t: 8.2, s: 'whoosh', g: 0.6 },
        { t: 8.65, s: 'draw', g: 0.5 }, { t: 11.3, s: 'draw', g: 0.5 }, { t: 13.3, s: 'draw', g: 0.5 }, { t: 16.42, s: 'draw', g: 0.5 },
        { t: 17.95, s: 'draw', g: 0.5 }, { t: 21.95, s: 'whoosh', g: 0.7 },
        { t: 22.6, s: 'pop', g: 0.6 }, { t: 23.0, s: 'pop', g: 0.6 }, { t: 23.4, s: 'pop', g: 0.6 }, { t: 23.8, s: 'pop', g: 0.6 },
        { t: 25.0, s: 'impact', g: 0.7 }, { t: 25.02, s: 'ding', g: 0.7 }, { t: 27.35, s: 'whoosh', g: 0.6 }, { t: 28.5, s: 'pop', g: 0.5 },
      ];
      const SND = { grab: ['pop', 0.7], stash: ['ding', 0.55], stir: ['hum', 0.8], peek: ['sting', 0.8], caught: ['impact', 0.9], level: ['swish', 0.5] };
      for (const [a, b, f0] of SEG) for (const e of SOCK.events) {
        const vt = a + (e.t - f0);
        if (e.t >= f0 && vt < b && SND[e.type]) cues.push({ t: vt, s: SND[e.type][0], g: SND[e.type][1] });
      }
      return cues.sort((p, q) => p.t - q.t);
    },
    draw(c, t) {
      MG.ground(c, t, { glow: 'rgba(255,210,90,0.08)' });
      // hook
      if (t < 2.9) {
        const ex = MG.tw(t, 2.2, 2.75, 'inOutExpo');
        const s = MG.lerp(FS, FS * 0.7, ex), w = 720 * s;
        phone(c, t, s, cx - w / 2, FY + ex * 260, 1 - ex);
        MG.line(c, [{ s: 'One sentence', o: { size: 88, weight: 800, track: -3 } }], cx, 196, 'center', t, -1, 2.2);
        MG.line(c, [{ s: 'made this game.', o: { size: 96, weight: 400, family: F.serif, italic: true, color: C.accent } }], cx, 296, 'center', t, -1, 2.25);
      }
      // the prompt and the code
      MG.line(c, [{ s: "Here's all I typed:", o: { size: 80, weight: 400, family: F.serif, italic: true, color: C.mute } }], cx, 520, 'center', t, 2.6, 5.3);
      promptCard(c, t);
      MG.line(c, [{ s: 'Seconds later:', o: { size: 80, weight: 400, family: F.serif, italic: true, color: C.mute } }], cx, 340, 'center', t, 6.35, 8.1);
      codeCard(c, t);
      // gameplay
      if (t >= 8.2 && t < 22.5) {
        const k = MG.spring(t - 8.2, 2.0, 0.66), out = MG.tw(t, 21.95, 22.4, 'inOutExpo');
        const punch = 1 + 0.012 * Math.max(0, 1 - (t - SEG.find(([a, b]) => t >= a && t < b + 0.001)?.[0] || 99) / 0.25);
        const s = FS * punch, w = 720 * s;
        phone(c, t, s, cx - w / 2 - out * 300, FY + (1 - Math.min(1, k)) * 500, MG.clamp(k * 1.6) * (1 - out));
        hiRect(c, t, 8.65, 0, 380, 720, 200, 10.9);
        cap(c, t, [sans('I never asked for'), ital('levels.')], 8.6, 11.05);
        hiRect(c, t, 11.3, 470, 70, 215, 34, 13.05);
        cap(c, t, [sans('…or'), ital('points.')], 11.3, 13.05);
        hiRect(c, t, 13.3, 36, 106, 648, 22, 16.3);
        cap(c, t, [sans('It invented a'), ital('wake-up meter.')], 13.3, 16.25);
        hiCircle(c, t, 16.42, 360, 228, 62, 17.45);
        cap(c, t, [sans('He opens an eye →'), ital('freeze.')], 16.4, 17.5);
        hiRect(c, t, 17.95, 150, 492, 420, 40, 19.4);
        cap(c, t, [sans('Its joke.'), ital('Not mine.')], 17.9, 19.45);
        cap(c, t, [sans("Move while he's"), ital('looking…')], 19.6, 20.95);
        cap(c, t, [sans('Three lives.'), ital('No mercy.')], 21.1, 21.9);
      }
      trick(c, t);
      outro(c, t);
    },
  };
})();
