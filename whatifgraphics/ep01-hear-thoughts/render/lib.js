// whatifgraphics SVG scene library. Pure functions of (shot, t) -> SVG string.
(function (global) {
  const W = 1920, H = 1080;
  const C = { line: '#2b2140', you: '#fff6e8', hood: '#ff7a2f', hood2: '#e8601c', jeans: '#2f3b6b', shoe: '#1e1e2e', white: '#ffffff' };
  const NPC = {
    mum: { skin: '#ffd9b8', hair: 'bun', hairC: '#6b3f23', outfit: '#4fb286', eye: '#4a7c3f' },
    dad: { skin: '#f2c9a6', hair: 'short', hairC: '#3b2a20', outfit: '#5b6b9a', eye: '#3a3a3a' },
    leo: { skin: '#c98c5b', hair: 'short', hairC: '#1e1a1a', outfit: '#e04e4e', eye: '#2b2140' },
    mia: { skin: '#ffe0c8', hair: 'long', hairC: '#2d2a6e', outfit: '#b98cf0', eye: '#6a3fb3', bow: '#ff6fa8' },
    teacher: { skin: '#f6d3b3', hair: 'bald', hairC: '#999', outfit: '#4a4a6a', tie: '#c0392b', glasses: true, eye: '#3a3a3a' },
    teacher2: { skin: '#f3cfae', hair: 'bun', hairC: '#8a8a8a', outfit: '#7a5c9e', glasses: true, eye: '#3a6a3a' },
    teacher3: { skin: '#d9a77a', hair: 'short', hairC: '#444', outfit: '#3f6b4f', tie: '#f1c40f', eye: '#2b2140' },
    manager: { skin: '#f0c8a0', hair: 'ponytail', hairC: '#b5651d', outfit: '#6d4c41', apron: true, eye: '#3a3a3a' },
    prof: { skin: '#efd0b5', hair: 'spiky', hairC: '#d0d0d0', outfit: '#f4f6f8', coat: true, glasses: true, eye: '#3a3a3a' },
    stranger: { skin: '#e9c3a0', hair: 'short', hairC: '#bbb', outfit: '#394867', hat: true, eye: '#3a3a3a' },
    grandma: { skin: '#f7dcc3', hair: 'bun', hairC: '#e8e8e8', outfit: '#d98cb3', glasses: true, eye: '#3a3a3a' },
    bully: { skin: '#f3c9a5', hair: 'spiky', hairC: '#ff8c2a', outfit: '#777', eye: '#2b2140' },
    reporter: { skin: '#e6b48c', hair: 'long', hairC: '#3a1f1a', outfit: '#c0392b', eye: '#2b2140' },
    npc1: { skin: '#ffd9b8', hair: 'long', hairC: '#f2c14e', outfit: '#ff8fb1', bow: '#ff4d8d', eye: '#3a7bd5' },
    npc2: { skin: '#c98c5b', hair: 'spiky', hairC: '#2a1a12', outfit: '#3fa7d6', eye: '#2b2140' },
    npc3: { skin: '#f6d3b3', hair: 'ponytail', hairC: '#b5651d', outfit: '#8bd17c', eye: '#2b7a3a' },
    npc4: { skin: '#ffe0c8', hair: 'short', hairC: '#7a4a2a', outfit: '#f4b942', eye: '#3a3a3a' },
    npc5: { skin: '#e3b891', hair: 'bun', hairC: '#1e1a1a', outfit: '#9b7bd6', eye: '#2b2140' },
    npc6: { skin: '#f2c9a6', hair: 'long', hairC: '#c0392b', outfit: '#2ec4b6', eye: '#2b2140' },
  };

  // ───────── helpers ─────────
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  const backOut = u => { u = clamp(u, 0, 1); const c = 1.70158; u -= 1; return u * u * ((c + 1) * u + c) + 1; };
  const pop = (t, at, d = 0.32) => t < at ? 0 : backOut((t - at) / d);
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return (h >>> 0) / 4294967295; };
  function wrap(text, w) {
    const words = String(text).split(/\s+/); const lines = []; let cur = '';
    for (const wd of words) { if ((cur + ' ' + wd).trim().length > w && cur) { lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
    if (cur) lines.push(cur); return lines.length ? lines : [' '];
  }
  const rect = (x, y, w, h, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${extra}/>`;
  const circ = (x, y, r, f, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${extra}/>`;
  const ell = (x, y, rx, ry, f, extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${extra}/>`;
  const line = (x1, y1, x2, y2, c, w, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const txt = (x, y, s, size, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(s)}</text>`;
  const grad = (id, c1, c2, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;

  // ───────── faces ─────────
  function face(expr, kind, t, seed, talk, col) {
    // kind: 'you' | 'npc'. Returns SVG relative to head centre (0,0). col: {skin, eye}
    const blink = ((t + seed * 3) % 3.4) < 0.13;
    const E = {
      neutral: { brow: [0, 0], eyes: 'open', mouth: 'small' },
      happy: { brow: [-8, -8], eyes: 'open', mouth: 'smile' },
      joy: { brow: [-10, -10], eyes: 'closed', mouth: 'grin' },
      grin: { brow: [-8, -8], eyes: 'open', mouth: 'grin' },
      sad: { brow: [-10, 10], eyes: 'open', mouth: 'frown', sadBrow: true },
      shocked: { brow: [-16, -16], eyes: 'wide', mouth: 'open' },
      smug: { brow: [6, -10], eyes: 'half', mouth: 'half' },
      angry: { brow: [12, 12], eyes: 'open', mouth: 'flat', angryBrow: true },
      tired: { brow: [2, 2], eyes: 'half', mouth: 'flat' },
      nervous: { brow: [-8, 8], eyes: 'open', mouth: 'wavy', sadBrow: true, sweat: true },
      think: { brow: [-14, 4], eyes: 'up', mouth: 'o' },
    }[expr] || { brow: [0, 0], eyes: 'open', mouth: 'small' };
    let out = '';
    const ex = 34, ey = -18;
    const eyeDy = E.eyes === 'up' ? -8 : 0, eyeDx = E.eyes === 'up' ? 8 : 0;
    // eyes
    for (const sgn of [-1, 1]) {
      const x = sgn * ex + eyeDx, y = ey + eyeDy;
      if (blink || E.eyes === 'closed') {
        if (E.eyes === 'closed') out += `<path d="M${x - 18},${y + 4} Q${x},${y - 18} ${x + 18},${y + 4}" stroke="${C.line}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
        else out += line(x - 16, y, x + 16, y, C.line, 6);
        continue;
      }
      if (kind === 'you') {
        const r = E.eyes === 'wide' ? 1.35 : 1;
        out += ell(x, y, 10 * r, 14 * r, C.line);
        out += circ(x - 3 * r, y - 5 * r, 3.2 * r, '#fff');
        if (E.eyes === 'half') out += rect(x - 16, y - 20, 32, 20, col.skin);
      } else {
        const r = E.eyes === 'wide' ? 1.25 : 1;
        out += ell(x, y, 21 * r, 27 * r, '#fff', `stroke="${C.line}" stroke-width="4"`);
        out += circ(x + 2, y + 4, 12 * r, col.eye);
        out += circ(x + 2, y + 4, 6 * r, C.line);
        out += circ(x - 3, y - 3, 4.5, '#fff');
        if (E.eyes === 'half') { out += `<path d="M${x - 23},${y - 2} A23,29 0 0 1 ${x + 23},${y - 2} L${x + 23},${y - 32} L${x - 23},${y - 32} Z" fill="${col.skin}"/>`; out += line(x - 21, y - 2, x + 21, y - 2, C.line, 4); }
      }
      // brow
      const bl = E.brow[sgn < 0 ? 0 : 1];
      let b1 = -14, b2 = 14, ya = -44 + bl, yb = -44 + bl;
      if (E.sadBrow) { ya += sgn < 0 ? 10 : 0; yb += sgn < 0 ? 0 : 10; }
      if (E.angryBrow) { ya += sgn < 0 ? -4 : 8; yb += sgn < 0 ? 8 : -4; }
      out += line(x + b1, ya, x + b2, yb, C.line, 7);
    }
    // blush for npcs on happy
    if (kind === 'npc' && (expr === 'happy' || expr === 'joy' || expr === 'nervous')) out += ell(-60, 12, 16, 9, '#ff8aa8', 'opacity="0.6"') + ell(60, 12, 16, 9, '#ff8aa8', 'opacity="0.6"');
    // mouth
    let m = E.mouth;
    if (talk) { const k = Math.floor(t * 10) % 4; m = ['open', 'small', 'wide', 'smile'][k]; }
    const my = 36;
    const mouths = {
      small: line(-9, my + 4, 9, my + 4, C.line, 6),
      flat: line(-20, my + 4, 20, my + 4, C.line, 6),
      smile: `<path d="M-28,${my - 4} Q0,${my + 26} 28,${my - 4}" stroke="${C.line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      frown: `<path d="M-24,${my + 14} Q0,${my - 8} 24,${my + 14}" stroke="${C.line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      open: ell(0, my + 6, 15, 19, C.line) + ell(0, my + 16, 9, 7, '#ff6f7a'),
      wide: ell(0, my + 6, 22, 14, C.line) + ell(0, my + 12, 12, 6, '#ff6f7a'),
      half: `<path d="M-8,${my + 4} Q18,${my + 18} 32,${my - 6}" stroke="${C.line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      wavy: `<path d="M-24,${my + 4} Q-12,${my - 6} 0,${my + 4} Q12,${my + 14} 24,${my + 4}" stroke="${C.line}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      grin: `<path d="M-34,${my - 6} Q0,${my + 44} 34,${my - 6} Z" fill="${C.line}"/>` + rect(-26, my - 4, 52, 10, '#fff'),
      o: circ(0, my + 6, 9, C.line),
    };
    out += mouths[m] || mouths.small;
    if (E.sweat) out += `<path d="M78,-40 q10,16 0,26 q-10,-10 0,-26z" fill="#7cc8ff" transform="translate(0,${Math.sin(t * 4) * 3})"/>`;
    return out;
  }

  // ───────── characters ─────────
  const SCENE = { noStool: false };
  function hair(style, colr, acc) {
    const r = 92; let o = '';
    switch (style) {
      case 'long': o = `<ellipse cx="-78" cy="60" rx="46" ry="135" fill="${colr}"/><ellipse cx="78" cy="60" rx="46" ry="135" fill="${colr}"/><circle cx="0" cy="-8" r="97" fill="${colr}"/>`; break;
      case 'ponytail': o = `<ellipse cx="-95" cy="40" rx="34" ry="90" fill="${colr}" transform="rotate(12)"/>`; break;
      case 'bun': o = circ(0, -108, 40, colr); break;
      default: o = '';
    }
    return { back: o, front: (() => {
      switch (style) {
        case 'long': return `<path d="M-${r},-10 A${r},${r} 0 0 1 ${r},-10 L${r},10 Q70,-30 40,-40 Q10,-20 -20,-30 Q-50,-50 -${r},20 Z" fill="${colr}"/>` + (acc && acc.bow ? `<path d="M60,-70 l30,-22 l0,44 z M60,-70 l-30,-22 l0,44 z" fill="${acc.bow}"/>` + circ(60, -70, 8, acc.bow) : '');
        case 'short': return `<path d="M-${r},-14 A${r},${r} 0 0 1 ${r},-14 L${r + 2},-4 Q60,-30 30,-32 Q0,-28 -30,-36 Q-60,-38 -${r + 2},-4 Z" fill="${colr}"/>`;
        case 'spiky': return `<path d="M-${r},-20 L-70,-110 L-40,-70 L-15,-130 L10,-75 L45,-120 L60,-70 L${r},-30 L${r},-10 Q0,-40 -${r},-10 Z" fill="${colr}"/>`;
        case 'bun': return `<path d="M-${r},-14 A${r},${r} 0 0 1 ${r},-14 L${r},-4 Q0,-30 -${r},-4 Z" fill="${colr}"/>`;
        case 'ponytail': return `<path d="M-${r},-14 A${r},${r} 0 0 1 ${r},-14 L${r},-4 Q40,-36 0,-30 Q-40,-24 -${r},-4 Z" fill="${colr}"/>`;
        case 'bald': return `<path d="M-${r},-10 A${r},${r} 0 0 1 -60,-70 L-70,-20 Z M${r},-10 A${r},${r} 0 0 0 60,-70 L70,-20 Z" fill="${colr}"/>`;
        default: return '';
      }
    })() };
  }

  function drawChar(name, x, y, o, t, idx, dur) {
    o = o || {};
    const isYou = name === 'you';
    const P = isYou ? { skin: C.you, outfit: C.hood, eye: C.line } : (NPC[name] || NPC.npc1);
    const s = o.scale || 0.8, dir = o.flip ? -1 : 1;
    const seed = hash(name + idx);
    const pose = o.pose || 'stand';
    const grey = o.grey;
    let bob = Math.sin(t * 2.4 + seed * 6) * 3, dy = 0, dx = 0, headDy = 0;
    let legs, hands = [[-125, -170], [125, -170]];
    const swing = Math.sin(t * 9 + seed);
    let xpos = x;
    if (pose === 'walk') {
      if (o.walkTo != null) xpos = lerp(x, o.walkTo, ease(t / Math.max(dur, 0.1)));
      bob = -Math.abs(Math.sin(t * 9 + seed)) * 7;
      legs = `${line(-30, -175, -40 + swing * 34, -10, C.jeans, 36)}${line(30, -175, 40 - swing * 34, -10, C.jeans, 36)}` +
        ell(-40 + swing * 34, -6, 42, 18, C.shoe) + ell(40 - swing * 34, -6, 42, 18, C.shoe);
      hands = [[-110 - swing * 40, -180], [110 + swing * 40, -180]];
    } else if (pose === 'sit') {
      legs = `${line(-30, -170, 95, -160, C.jeans, 36)}${line(30, -170, 110, -160, C.jeans, 36)}${line(95, -160, 95, -10, C.jeans, 36)}${line(110, -160, 110, -10, C.jeans, 36)}` + ell(100, -6, 42, 18, C.shoe) + ell(118, -2, 42, 18, C.shoe);
      hands = [[-60, -200], [120, -190]];
    } else if (pose === 'lie') {
      legs = ''; // handled below
    } else {
      legs = `${line(-38, -175, -48, -10, C.jeans, 36)}${line(38, -175, 48, -10, C.jeans, 36)}` + ell(-52, -6, 42, 18, C.shoe) + ell(52, -6, 42, 18, C.shoe);
    }
    switch (pose) {
      case 'hold': hands = [[-15, -250], [55, -250]]; break;
      case 'facepalm': hands = [[-125, -170], [40, -430]]; break;
      case 'ears': hands = [[-110, -440], [110, -440]]; break;
      case 'point': hands = [[-125, -170], [225, -330]]; break;
      case 'cheer': hands = [[-150, -470], [150, -470]]; dy = -Math.abs(Math.sin(t * 8)) * 28; break;
      case 'arms_up': hands = [[-150, -470], [150, -470]]; break;
      case 'wave': hands = [[-125, -170], [170, -470 + Math.sin(t * 10) * 10]]; break;
      case 'cross': hands = [[55, -250], [-55, -250]]; break;
      case 'ear': hands = [[-125, -170], [100, -430]]; break;
      case 'dance': hands = [[-150, -380 + Math.sin(t * 8) * 50], [150, -380 - Math.sin(t * 8) * 50]]; dx = Math.sin(t * 8) * 18; dy = -Math.abs(Math.sin(t * 8)) * 12; break;
      case 'slump': dy = 20; headDy = 40; hands = [[-110, -110], [110, -110]]; break;
    }
    const hd = isYou ? 100 : 92;
    const hr = hair(P.hair, P.hairC, P);
    const body = `<path d="M-100,-330 Q-118,-150 -95,-150 L95,-150 Q118,-150 100,-330 Q0,-352 -100,-330 Z" fill="${P.coat ? '#f4f6f8' : P.outfit}"/>`;
    let bodyExtra = '';
    if (isYou) bodyExtra += circ(0, -330, 112, C.hood2) + `<path d="M-100,-330 Q0,-352 100,-330 Q0,-300 -100,-330Z" fill="${C.hood}"/>` + rect(-60, -230, 120, 70, C.hood2, 'rx="18"') + line(0, -300, 0, -240, '#ffd6b8', 6) ;
    if (P.tie) bodyExtra += `<path d="M-12,-330 L12,-330 L8,-250 L0,-230 L-8,-250 Z" fill="${P.tie}"/>`;
    if (P.coat) bodyExtra += line(0, -330, 0, -160, '#cfd8dc', 4) + circ(0, -300, 6, '#90a4ae') + circ(0, -260, 6, '#90a4ae') + circ(0, -220, 6, '#90a4ae');
    if (P.apron || o.apron) bodyExtra += `<path d="M-70,-280 L70,-280 L85,-150 L-85,-150 Z" fill="#f5f0e6"/>` + line(-70, -280, 0, -330, '#f5f0e6', 8) + line(70, -280, 0, -330, '#f5f0e6', 8);
    const sleeve = isYou ? C.hood : (P.coat ? '#f4f6f8' : P.outfit);
    const arms = hands.map(h => line(h[0] < 0 ? -88 : 88, -300, h[0], h[1], sleeve, 34) + circ(h[0], h[1], 22, P.skin)).join('');
    let headG = `<g transform="translate(0,${-440 + headDy + Math.sin(t * 2.4 + seed * 6) * 2})">` + hr.back + circ(0, 0, hd, P.skin) + hr.front +
      (P.glasses ? `<circle cx="-34" cy="-14" r="30" fill="none" stroke="${C.line}" stroke-width="5"/><circle cx="34" cy="-14" r="30" fill="none" stroke="${C.line}" stroke-width="5"/>${line(-4, -14, 4, -14, C.line, 5)}` : '') +
      (P.hat ? `<path d="M-100,-60 L100,-60 L100,-75 L-100,-75 Z M-70,-75 L-60,-130 L60,-130 L70,-75 Z" fill="#2b2140"/>` : '') +
      face(o.expr || 'neutral', isYou ? 'you' : 'npc', t, seed, o.talk && !o.mute, P) + '</g>';
    let inner;
    if (pose === 'lie') {
      // body rotated flat, head upright on pillow
      const bodyRot = `<g transform="rotate(-90)">${body}${bodyExtra}${line(-88, -300, -130, -200, sleeve, 34)}${circ(-130, -200, 22, P.skin)}${line(88, -300, 130, -200, sleeve, 34)}${circ(130, -200, 22, P.skin)}</g>`;
      const blanket = `<rect x="-330" y="-128" width="360" height="256" rx="30" fill="#7fd1c7"/><rect x="-330" y="-128" width="360" height="256" rx="30" fill="url(#stripes)" opacity="0.5"/>`;
      inner = bodyRot + blanket + `<g transform="translate(-440,-70)">` + headG.replace(/translate\(0,[^)]*\)/, 'translate(0,0)') + '</g>';
    } else {
      const stool = (pose === 'sit' && !SCENE.noStool && !o.noStool) ? `<rect x="-100" y="-160" width="215" height="24" rx="8" fill="#6b4f3a"/><rect x="-95" y="-136" width="18" height="130" fill="#5a4030"/><rect x="92" y="-136" width="18" height="130" fill="#5a4030"/><rect x="-105" y="-360" width="30" height="210" rx="8" fill="#6b4f3a"/>` : '';
      inner = stool + legs + body + bodyExtra + arms + headG;
    }
    const greyF = grey ? 'filter="url(#greyf)" opacity="0.75"' : '';
    return `<g transform="translate(${xpos + dx},${y + dy + bob}) scale(${s * dir},${s})" ${greyF}>${inner}</g>`;
  }

  // ───────── bubbles ─────────
  function bubble(spec, chars, t, idx, until) {
    const [from, text, o0] = spec; const o = o0 || {};
    const at = o.at || 0; if (t < at) return '';
    let k = pop(t, at);
    if (until != null && t >= until) { const kk = 1 - ease((t - until) / 0.18); if (kk <= 0) return ''; k = kk; }
    let ax, ay, dir = 1;
    if (Array.isArray(from)) { ax = from[0]; ay = from[1] + 90; }
    else {
      const ch = chars.find(c => c[0] === from); if (!ch) return '';
      const s = (ch[3] && ch[3].scale) || 0.8; dir = ch[3] && ch[3].flip ? -1 : 1;
      let cx = ch[1]; if (ch[3] && ch[3].pose === 'walk' && ch[3].walkTo != null) cx = lerp(ch[1], ch[3].walkTo, ease(t / 8));
      if (ch[3] && ch[3].pose === 'lie') { ax = cx - 440 * s; ay = ch[2] - 170 * s; } else { ax = cx + dir * 40 * s; ay = ch[2] - 545 * s; }
    }
    const lines = wrap(text, o.w || 20);
    const fs = 34, lh = 42, cw = 19;
    const maxLen = Math.max(...lines.map(l => l.length));
    const w = Math.max(90, maxLen * cw + 60), h = lines.length * lh + 44;
    let bx, by;
    if (Array.isArray(from)) { bx = from[0]; by = from[1]; }
    else { bx = ax + dir * (w / 2 + 50) + (o.dx || 0); by = ay - h / 2 - 60 + (o.dy || 0); }
    bx = clamp(bx, w / 2 + 30, W - w / 2 - 30); by = clamp(by, h / 2 + 30, H - h / 2 - 30);
    const fl = Math.sin(t * 2 + idx) * 4;
    const fill = o.dark ? '#3b3160' : o.muted ? '#e9e9ee' : '#fff';
    const stroke = o.dark ? '#1d1733' : o.muted ? '#bdbdc8' : C.line;
    const tc = o.dark ? '#fff' : o.muted ? '#8a8a99' : C.line;
    const op = o.muted ? 0.6 : 1;
    let tail = '';
    if (o.kind === 'speech') {
      const ex = bx + (ax < bx ? -w / 2 + 40 : w / 2 - 40), ey = by + h / 2;
      tail = `<path d="M${ex - 22},${ey - 2} L${ax},${ay - 10} L${ex + 22},${ey - 2} Z" fill="${fill}" stroke="${stroke}" stroke-width="5" stroke-linejoin="round"/>`;
    } else {
      const ex = bx + (ax < bx ? -w / 2 + 30 : w / 2 - 30), ey = by + h / 2;
      tail = [[0.28, 14], [0.58, 9], [0.85, 5]].map(([u, r]) => circ(lerp(ex, ax, u), lerp(ey, ay, u), r, fill, `stroke="${stroke}" stroke-width="4"`)).join('');
    }
    const body = `<rect x="${bx - w / 2}" y="${by - h / 2}" width="${w}" height="${h}" rx="${o.kind === 'speech' ? 22 : 40}" fill="${fill}" stroke="${stroke}" stroke-width="5"/>` +
      (o.kind === 'speech' ? `<path d="M${bx + (ax < bx ? -w / 2 + 40 : w / 2 - 40) - 20},${by + h / 2 - 1} h40" stroke="${fill}" stroke-width="6"/>` : '') +
      lines.map((l, i) => txt(bx, by - h / 2 + 38 + i * lh + 8, l, fs, `font-family="Nunito" font-weight="800" fill="${tc}" text-anchor="middle"`)).join('');
    return `<g opacity="${op}" transform="translate(${ax},${ay + fl}) scale(${k}) translate(${-ax},${-ay})">${tail}${body}</g>`;
  }

  // ───────── cards ─────────
  function card(spec, t) {
    const [text, o0] = spec; const o = o0 || {}; const at = o.at || 0; if (t < at) return '';
    const k = pop(t, at, 0.4); const size = o.size || 110; const y = o.y || 420;
    const lines = String(text).split('\n'); const lh = size * 1.08;
    const rot = Math.sin(t * 1.5) * 1.2 - 1.5;
    let out = '';
    if (o.dim) out += rect(0, 0, W, H, 'rgba(20,10,40,0.45)');
    out += `<g transform="translate(960,${y}) rotate(${rot}) scale(${k})">`;
    lines.forEach((l, i) => {
      const yy = (i - (lines.length - 1) / 2) * lh;
      out += txt(0, yy + 12, l, size, `font-family="Fredoka" font-weight="700" fill="${C.line}" text-anchor="middle" dominant-baseline="middle" stroke="${C.line}" stroke-width="${size * 0.16}" stroke-linejoin="round" paint-order="stroke"`);
      out += txt(0, yy, l, size, `font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle" stroke="${C.line}" stroke-width="${size * 0.12}" stroke-linejoin="round" paint-order="stroke"`);
    });
    out += '</g>';
    return out;
  }

  // ───────── backgrounds ─────────
  function sky(t, night, y0 = -400, y1 = 900) {
    let o = rect(-500, y0, 2920, y1 - y0, night ? 'url(#skyN)' : 'url(#skyD)');
    if (night) { for (let i = 0; i < 40; i++) { const sx = -400 + (i * 613) % 2800, sy = y0 + 60 + (i * 271) % 500; o += circ(sx, sy, 2 + (i % 3), '#fff', `opacity="${0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))}"`); } o += circ(1500, -60, 90, '#fff4c2'); }
    else { o += circ(1550, -40, 110, '#ffe66d'); for (let i = 0; i < 5; i++) { const cx = ((i * 700 + t * 25) % 3200) - 600, cy = -200 + (i * 97) % 300; o += ell(cx, cy, 150, 50, '#fff', 'opacity="0.9"') + ell(cx - 80, cy + 10, 100, 45, '#fff', 'opacity="0.9"') + ell(cx + 90, cy + 15, 110, 40, '#fff', 'opacity="0.9"'); } }
    return o;
  }
  function buildings(t, night, baseY = 880, seed = 1) {
    let o = '';
    for (let i = 0; i < 16; i++) {
      const x = -500 + i * 190, h = 300 + ((i * 137 + seed * 31) % 420), w = 170;
      const col = ['#6c7bb3', '#8a93c9', '#5a6aa0', '#7d86bf'][i % 4];
      o += rect(x, baseY - h, w, h, night ? '#2a2f5e' : col);
      for (let r = 0; r < Math.floor(h / 70); r++) for (let c = 0; c < 3; c++) o += rect(x + 22 + c * 50, baseY - h + 30 + r * 70, 26, 34, night ? ((i + r + c) % 3 ? '#ffe28a' : '#3a3f70') : '#dfe8ff');
    }
    return o;
  }
  function floor(y, c1, c2) { let o = rect(-500, y, 2920, 600, c1); for (let i = 0; i < 12; i++) o += rect(-500 + i * 260, y, 130, 600, c2); return o; }

  const BG = {
    void: (t, o = {}) => rect(-500, -400, 2920, 1900, 'url(#voidG)') + [...Array(8)].map((_, i) => ell(((i * 431 + t * 20) % 2900) - 500, 200 + (i * 173) % 700 + Math.sin(t + i) * 20, 60, 44, '#fff', 'opacity="0.08"')).join(''),
    bedroom: (t, o = {}) => {
      const n = o.night; let s = rect(-500, -400, 2920, 1160, n ? '#262a5e' : 'url(#wallBlue)') + floor(760, n ? '#4a3d5c' : '#d2a679', n ? '#43385a' : '#c6985f');
      s += rect(1380, 230, 440, 360, '#5a4030') + rect(1400, 250, 400, 320, n ? '#1b1f4b' : '#9ad7ff') + (n ? circ(1700, 330, 50, '#fff4c2') : circ(1700, 330, 55, '#ffe66d')) + rect(1596, 250, 10, 320, '#5a4030') + rect(1400, 406, 400, 10, '#5a4030');
      s += rect(230, 280, 260, 320, '#ffd166', 'rx="8"') + txt(360, 420, 'WHAT', 60, 'font-family="Fredoka" font-weight="700" fill="#2b2140" text-anchor="middle"') + txt(360, 500, 'IF?', 70, 'font-family="Fredoka" font-weight="700" fill="#ff7a2f" text-anchor="middle"');
      s += rect(430, 640, 700, 280, '#7a5230', 'rx="20"') + rect(450, 660, 660, 60, '#fff') + ell(540, 690, 90, 40, '#ffe9d6') + rect(450, 700, 660, 190, '#ff9f4a', 'rx="12"') + rect(450, 700, 660, 190, 'url(#stripes)', 'opacity="0.5" rx="12"');
      s += ell(1300, 950, 360, 70, n ? '#5f5080' : '#f2c14e', 'opacity="0.8"');
      s += rect(1420, 640, 360, 30, '#8b5a2b') + rect(1440, 670, 20, 220, '#8b5a2b') + rect(1740, 670, 20, 220, '#8b5a2b') + `<path d="M1600,640 L1560,560 L1680,560 Z" fill="#ff7a2f"/>` + line(1620, 560, 1620, 640, '#444', 8) + (n ? circ(1620, 600, 160, '#ffe9a8', 'opacity="0.25"') : '');
      return s;
    },
    bedroom_night: (t) => BG.bedroom(t, { night: true }),
    kitchen: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#fff3d6'); for (let i = 0; i < 30; i++) s += line(-500 + i * 100, -400, -500 + i * 100, 700, '#f3e3bd', 3); for (let i = 0; i < 12; i++) s += line(-500, -400 + i * 100, 2420, -400 + i * 100, '#f3e3bd', 3);
      s += floor(880, '#e8e2d4', '#dcd4c2');
      s += rect(-500, 700, 2920, 200, '#6ea8b9') + rect(-500, 690, 2920, 24, '#cfe3ea'); for (let i = 0; i < 14; i++) s += rect(-480 + i * 210, 730, 180, 150, '#5d93a3', 'rx="8"') + circ(-390 + i * 210, 800, 8, '#f1c40f');
      s += rect(1480, 380, 300, 520, '#dfe6ea', 'rx="12"') + line(1480, 560, 1780, 560, '#b8c2c8', 6) + rect(1740, 420, 14, 100, '#8a949a', 'rx="6"') + rect(1740, 600, 14, 140, '#8a949a', 'rx="6"');
      s += rect(300, 200, 440, 340, '#5a4030') + rect(320, 220, 400, 300, '#9ad7ff') + circ(620, 310, 50, '#ffe66d') + rect(515, 220, 10, 300, '#5a4030');
      s += rect(840, 640, 300, 70, '#c9ced3', 'rx="8"') + circ(900, 675, 24, '#333') + circ(1080, 675, 24, '#333') + rect(840, 420, 300, 14, '#b0b8bf');
      s += ell(1250, 700, 80, 24, '#f4b942') + circ(1220, 680, 24, '#e74c3c') + circ(1270, 676, 24, '#2ecc71') + circ(1245, 660, 22, '#f39c12');
      return s;
    },
    busstop: (t) => {
      let s = sky(t, false, -400, 760) + buildings(t, false, 760, 2) + rect(-500, 760, 2920, 140, '#c9c2b4') + rect(-500, 900, 2920, 500, '#4a4a55'); for (let i = 0; i < 12; i++) s += rect(-400 + i * 260, 990, 120, 14, '#fff');
      s += rect(1290, 380, 16, 500, '#555') + rect(1220, 330, 160, 110, '#2a6fdb', 'rx="14"') + txt(1300, 405, 'BUS', 60, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"');
      s += `<g transform="translate(${1500 + Math.sin(t) * 2},0)">` + rect(0, 420, 1000, 460, '#ffb703', 'rx="40"') + rect(40, 470, 220, 180, '#9ad7ff', 'rx="12"') + rect(300, 470, 220, 180, '#9ad7ff', 'rx="12"') + rect(560, 470, 220, 180, '#9ad7ff', 'rx="12"') + rect(0, 680, 1000, 30, '#e09a00') + circ(220, 880, 60, '#222') + circ(220, 880, 26, '#999') + circ(780, 880, 60, '#222') + circ(780, 880, 26, '#999') + rect(-20, 460, 30, 200, '#2b2140', 'rx="10"') + '</g>';
      return s;
    },
    bus: (t) => {
      SCENE.noStool = true;
      let s = rect(-500, -400, 2920, 1400, '#e7eaf0') + rect(-500, 180, 2920, 360, '#9ad7ff');
      s += `<g clip-path="url(#winClip)"><g transform="translate(${-((t * 140) % 760)},0)">` + buildings(t, false, 520, 3) + '</g></g>';
      for (let i = 0; i < 8; i++) s += rect(-500 + i * 400, 160, 24, 400, '#cfd4de');
      s += rect(-500, 160, 2920, 22, '#cfd4de') + rect(-500, 540, 2920, 24, '#cfd4de') + rect(-500, 900, 2920, 500, '#6b6b78') + rect(-500, 890, 2920, 14, '#55555f');
      for (let i = 0; i < 10; i++) s += line(-400 + i * 300, 0, -400 + i * 300, 560, '#f1c40f', 10);
      for (const x of [420, 700, 1240, 1520, 1800, 140]) s += rect(x - 120, 560, 240, 340, '#2a6fdb', 'rx="30"') + rect(x - 110, 720, 220, 170, '#1f57b0', 'rx="20"') + rect(x - 130, 700, 260, 40, '#3b82f6', 'rx="14"');
      return s;
    },
    busdoor: (t) => {
      let s = rect(-500, -400, 2920, 1400, '#e7eaf0') + rect(-500, 900, 2920, 500, '#6b6b78');
      const open = ease((t - 0.5) / 1.5) * 200;
      s += rect(560, 120, 800, 780, '#c9d0db') + rect(600, 160, 720, 740, '#ffe9a8') + buildings(t, false, 900, 4).replace('<rect', '<rect') ;
      s += `<g clip-path="url(#doorClip)">` + rect(600, 160, 720, 740, '#ffe9a8') + rect(600, 700, 720, 200, '#c9c2b4') + '</g>';
      s += rect(600 - open, 160, 360, 740, '#2a6fdb') + rect(640 - open, 200, 280, 400, '#9ad7ff', 'rx="12"') + rect(960 + open, 160, 360, 740, '#2a6fdb') + rect(1000 + open, 200, 280, 400, '#9ad7ff', 'rx="12"');
      s += rect(560, 120, 800, 40, '#8a93a3') + txt(960, 100, 'EXIT', 40, 'font-family="Fredoka" font-weight="700" fill="#2b2140" text-anchor="middle"');
      return s;
    },
    hallway: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#f6edd9'); for (let i = 0; i < 6; i++) s += rect(-300 + i * 520, 120, 300, 30, '#fff9e6', 'rx="10"') + rect(-300 + i * 520, 150, 300, 20, '#fff2b8', 'opacity="0.6"');
      for (let i = 0; i < 24; i++) { const x = -500 + i * 130; s += rect(x, 330, 122, 550, '#2fb07a', 'rx="6"') + rect(x + 16, 360, 90, 40, '#23945f', 'rx="4"') + rect(x + 16, 420, 90, 40, '#23945f', 'rx="4"') + rect(x + 96, 600, 12, 50, '#1b6b45', 'rx="4"'); }
      s += rect(-500, 300, 2920, 30, '#d9cbb0') + floor(880, '#e9e2d2', '#e1d8c5') + rect(-500, 880, 2920, 10, '#cdbfa3');
      s += `<path d="M-500,1000 L2420,1000" stroke="#fff" stroke-width="40" opacity="0.25"/>`;
      return s;
    },
    classroom: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#f3eacb') + floor(880, '#d8c9a8', '#d0bf9c');
      s += rect(180, 180, 940, 460, '#5a4030', 'rx="12"') + rect(200, 200, 900, 420, '#2f5d4a');
      s += txt(260, 300, 'x² + 2x − 8 = 0', 44, 'font-family="Nunito" font-weight="800" fill="#eaf4ee"') + txt(260, 380, '(x + 4)(x − 2)', 44, 'font-family="Nunito" font-weight="800" fill="#eaf4ee"') + txt(760, 560, 'WHAT IF?', 52, 'font-family="Fredoka" font-weight="700" fill="#ffd166"') + txt(260, 470, 'x = ?', 44, 'font-family="Nunito" font-weight="800" fill="#eaf4ee"');
      s += rect(1380, 200, 420, 360, '#5a4030') + rect(1400, 220, 380, 320, '#9ad7ff') + circ(1680, 300, 45, '#ffe66d') + rect(1585, 220, 10, 320, '#5a4030') + rect(1400, 376, 380, 10, '#5a4030');
      s += circ(1280, 120, 50, '#fff', `stroke="${C.line}" stroke-width="6"`) + line(1280, 120, 1280, 85, C.line, 5) + line(1280, 120, 1305, 130, C.line, 5);
      for (const x of [300, 1000, 1700]) s += rect(x - 160, 690, 320, 26, '#b07a45', 'rx="6"') + rect(x - 140, 716, 16, 164, '#8a5a30') + rect(x + 124, 716, 16, 164, '#8a5a30');
      return s;
    },
    cafeteria: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#ffe8c2'); for (let i = 0; i < 5; i++) s += rect(-200 + i * 560, 160, 360, 280, '#9ad7ff', 'rx="10"') + rect(-200 + i * 560, 160, 360, 12, '#5a4030') + rect(-20 + i * 560, 160, 10, 280, '#5a4030');
      s += rect(-500, 520, 2920, 160, '#c76b3f') + rect(-500, 510, 2920, 20, '#e8a06a'); for (let i = 0; i < 10; i++) s += rect(-400 + i * 300, 550, 200, 100, '#f4b942', 'rx="8"') + circ(-300 + i * 300, 600, 30, ['#e74c3c', '#2ecc71', '#f39c12'][i % 3]);
      let f = ''; for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) f += rect(-500 + c * 150, 880 + r * 110, 150, 110, (r + c) % 2 ? '#f5f5f5' : '#dcdcdc'); s += f;
      s += rect(-500, 700, 2920, 36, '#a86a3f', 'rx="10"') + rect(-500, 736, 2920, 18, '#8a5230');
      for (let i = 0; i < 8; i++) s += rect(-300 + i * 340, 660, 120, 24, '#d9534f', 'rx="6"') + circ(-240 + i * 340, 660, 22, '#f1c40f');
      return s;
    },
    cafe: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#f4e1c6') + floor(880, '#b07a45', '#a06c3b');
      s += rect(200, 140, 800, 360, '#2b2140', 'rx="16"') + txt(600, 240, 'MENU', 60, 'font-family="Fredoka" font-weight="700" fill="#ffd166" text-anchor="middle"') + txt(300, 330, 'Flat white  ....  3.20', 38, 'font-family="Nunito" font-weight="800" fill="#fff"') + txt(300, 400, 'Cold brew   ....  3.50', 38, 'font-family="Nunito" font-weight="800" fill="#fff"') + txt(300, 470, 'Sundays     ....  ???', 38, 'font-family="Nunito" font-weight="800" fill="#ff7a2f"');
      s += rect(-500, 620, 1700, 280, '#6d4c41') + rect(-500, 600, 1700, 40, '#8d6e63') + rect(700, 440, 360, 180, '#9aa5b1', 'rx="16"') + rect(730, 470, 120, 80, '#333', 'rx="8"') + circ(950, 500, 30, '#e74c3c');
      s += rect(1300, 200, 500, 400, '#5a4030') + rect(1320, 220, 460, 360, '#9ad7ff') + rect(1340, 380, 100, 200, '#6c7bb3') + rect(1460, 320, 120, 260, '#8a93c9') + rect(1600, 400, 160, 180, '#5a6aa0') + circ(1700, 300, 40, '#ffe66d');
      s += rect(1300, 200, 500, 400, 'none', `stroke="#5a4030" stroke-width="20"`);
      for (const x of [400, 900, 1500]) s += line(x, -100, x, 220, '#333', 6) + `<path d="M${x - 70},220 L${x + 70},220 L${x + 40},300 L${x - 40},300 Z" fill="#ff7a2f"/>` + circ(x, 330, 90, '#ffe9a8', 'opacity="0.35"');
      s += ell(1750, 860, 90, 30, '#2e7d32') + rect(1700, 700, 100, 180, '#8d6e63', 'rx="10"') + circ(1750, 660, 80, '#4caf50') + circ(1700, 700, 60, '#43a047') + circ(1800, 690, 60, '#66bb6a');
      return s;
    },
    mall: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#eaf0f6'); for (let i = 0; i < 4; i++) { const x = -300 + i * 700, col = ['#ff6b6b', '#4ecdc4', '#ffd166', '#a06cd5'][i]; s += rect(x, 150, 600, 730, '#fff', 'stroke="#c9d3de" stroke-width="10"') + rect(x, 150, 600, 110, col) + txt(x + 300, 230, ['SHOES', 'TECH', 'FOOD', 'GAMES'][i], 64, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"') + rect(x + 40, 300, 520, 560, '#dbe9f5', 'rx="10"'); for (let k = 0; k < 3; k++) s += rect(x + 80 + k * 160, 500, 110, 110, col, 'rx="16" opacity="0.6"'); }
      let f = ''; for (let r = 0; r < 6; r++) for (let c = 0; c < 20; c++) f += rect(-500 + c * 150, 880 + r * 110, 150, 110, (r + c) % 2 ? '#f7f9fb' : '#e3e9ef'); s += f;
      s += ell(1000, 870, 100, 30, '#2e7d32') + circ(1000, 760, 90, '#4caf50') + circ(940, 820, 60, '#43a047') + circ(1060, 810, 60, '#66bb6a');
      return s;
    },
    party: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#2a1f4a') + rect(-500, 880, 2920, 600, '#1c1536');
      for (let i = 0; i < 6; i++) { const cx = ((i * 520 + t * 90) % 2900) - 500, col = ['#ff4d8d', '#4ecdc4', '#ffd166', '#a06cd5', '#ff7a2f', '#3fa7d6'][i]; s += ell(cx, 950, 260, 60, col, 'opacity="0.35"'); }
      for (let i = 0; i < 22; i++) { const x = -500 + i * 140, y = 120 + Math.sin(i * 0.9) * 60, col = ['#ff4d8d', '#4ecdc4', '#ffd166', '#a06cd5', '#ff7a2f'][i % 5]; s += circ(x, y, 16, col, `opacity="${0.5 + 0.5 * Math.abs(Math.sin(t * 3 + i))}"`) + circ(x, y, 34, col, 'opacity="0.15"'); }
      s += `<path d="M-500,60 Q960,230 2420,60" stroke="#555" stroke-width="4" fill="none"/>`;
      s += circ(960, -30, 90, '#cfd8dc') + [...Array(12)].map((_, i) => `<line x1="960" y1="-30" x2="${960 + Math.cos(t + i) * 1400}" y2="${-30 + Math.sin(t + i) * 1400}" stroke="#fff" stroke-width="6" opacity="0.08"/>`).join('');
      for (const [x, col] of [[200, '#ff4d8d'], [300, '#ffd166'], [1650, '#4ecdc4'], [1760, '#a06cd5']]) s += ell(x, 560 + Math.sin(t * 2 + x) * 10, 55, 70, col) + line(x, 630, x + 10, 880, '#ddd', 3);
      s += rect(1300, 620, 220, 260, '#222', 'rx="14"') + circ(1410, 700, 50, '#444') + circ(1410, 700, 20 + Math.abs(Math.sin(t * 8)) * 6, '#111') + circ(1410, 820, 30, '#444');
      return s;
    },
    desk: (t) => {
      let s = BG.bedroom(t, { night: true });
      s += rect(1150, 640, 700, 40, '#8b5a2b') + rect(1180, 680, 24, 200, '#8b5a2b') + rect(1800, 680, 24, 200, '#8b5a2b');
      s += rect(1300, 360, 480, 300, '#222', 'rx="16"') + rect(1320, 380, 440, 250, '#3fa7d6') + rect(1520, 660, 40, 30, '#333') + rect(1460, 690, 160, 14, '#333', 'rx="6"');
      s += `<polyline points="1350,600 1420,560 1480,580 1560,500 1640,470 1740,400" stroke="#ffd166" stroke-width="10" fill="none" stroke-linecap="round"/>` + circ(1740, 400, 14, '#ff4d8d');
      s += circ(1150, 300, 90, 'none', 'stroke="#fff" stroke-width="18" opacity="0.9"') + line(1150, 390, 1150, 640, '#999', 8) + circ(1150, 300, 70, '#fff', 'opacity="0.2"');
      return s;
    },
    street: (t) => {
      let s = sky(t, false, -400, 400) + buildings(t, false, 420, 5);
      for (let i = 0; i < 5; i++) { const x = -300 + i * 600, col = ['#ff6b6b', '#4ecdc4', '#ffd166', '#a06cd5', '#3fa7d6'][i]; s += rect(x, 400, 560, 480, '#f1e2c6') + rect(x + 40, 520, 200, 360, '#9ad7ff') + rect(x + 300, 520, 220, 360, '#8b5a2b') + `<path d="M${x - 10},470 L${x + 570},470 L${x + 540},540 L${x + 20},540 Z" fill="${col}"/>` + rect(x, 420, 560, 50, '#fff') + txt(x + 280, 458, ['BOOKS', 'BAKERY', 'ARCADE', 'FLOWERS', 'CAFE'][i], 36, 'font-family="Fredoka" font-weight="700" fill="#2b2140" text-anchor="middle"'); }
      s += rect(-500, 880, 2920, 100, '#c9c2b4') + rect(-500, 980, 2920, 500, '#4a4a55'); for (let i = 0; i < 12; i++) s += rect(-400 + i * 260, 1040, 120, 14, '#fff');
      for (const x of [150, 1200]) s += rect(x, 440, 14, 440, '#444') + circ(x + 7, 430, 30, '#ffe9a8');
      return s;
    },
    market: (t) => {
      let s = BG.street(t);
      for (let i = 0; i < 4; i++) { const x = -200 + i * 620; s += rect(x, 700, 460, 180, '#8b5a2b') + rect(x - 20, 640, 500, 70, i % 2 ? '#e74c3c' : '#3fa7d6') + [...Array(5)].map((_, k) => rect(x - 20 + k * 100, 640, 50, 70, '#fff')).join('') + rect(x, 300, 14, 400, '#5a4030') + rect(x + 446, 300, 14, 400, '#5a4030') + rect(x - 20, 280, 500, 40, '#ffd166') + [...Array(6)].map((_, k) => circ(x + 40 + k * 76, 690, 26, ['#e74c3c', '#f39c12', '#2ecc71'][k % 3])).join(''); }
      s += `<path d="M-500,240 Q960,330 2420,240" stroke="#fff" stroke-width="4" fill="none"/>` + [...Array(20)].map((_, i) => `<path d="M${-500 + i * 150},${250 + Math.sin(i / 20 * Math.PI) * 80} l20,40 l20,-40 z" fill="${['#ff4d8d', '#ffd166', '#4ecdc4'][i % 3]}"/>`).join('');
      return s;
    },
    lab: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#eaf2fb'); for (let i = 0; i < 30; i++) s += line(-500 + i * 100, -400, -500 + i * 100, 880, '#dbe6f3', 3); s += floor(880, '#dfe8f0', '#d3dde7');
      s += rect(-400, 200, 700, 400, '#2b2140', 'rx="14"') + `<polyline points="${[...Array(30)].map((_, i) => `${-370 + i * 22},${400 + Math.sin(i * 0.8 + t * 6) * 60 * (i % 7 === 0 ? 2 : 1)}`).join(' ')}" stroke="#4ecdc4" stroke-width="6" fill="none"/>`;
      s += rect(1400, 300, 500, 580, '#cfd8dc') + rect(1420, 320, 460, 240, '#b0bec5') + rect(1420, 580, 460, 280, '#b0bec5');
      for (const [x, col] of [[1500, '#4ecdc4'], [1600, '#ff4d8d'], [1700, '#ffd166']]) s += rect(x, 180, 60, 110, '#dff4ff', 'rx="8" opacity="0.8"') + rect(x + 6, 230, 48, 54, col, 'rx="4"');
      return s;
    },
    news: (t) => {
      SCENE.noStool = true;
      let s = rect(-500, -400, 2920, 1300, '#1b2a4a'); for (let i = 0; i < 3; i++) s += rect(-200 + i * 780, 80, 700, 420, 'url(#screenG)', 'rx="12"') + txt(150 + i * 780, 260, 'BREAKING', 90, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"') + txt(150 + i * 780, 360, 'NEWS', 90, 'font-family="Fredoka" font-weight="700" fill="#ffd166" text-anchor="middle"');
      s += `<path d="M-500,700 Q960,640 2420,700 L2420,900 L-500,900 Z" fill="#243b6b"/>` + `<path d="M-500,700 Q960,640 2420,700" stroke="#3fa7d6" stroke-width="14" fill="none"/>` + rect(-500, 900, 2920, 500, '#101a30');
      for (const x of [300, 1620]) s += circ(x, -20, 90, '#ffe9a8', 'opacity="0.25"');
      return s;
    },
    door: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#e9dfd6') + floor(880, '#b07a45', '#a06c3b');
      s += rect(1000, 240, 440, 640, '#8b5a2b', 'rx="8"') + rect(1030, 280, 380, 260, '#7a4a20', 'rx="6"') + rect(1030, 580, 380, 260, '#7a4a20', 'rx="6"') + circ(1060, 560, 16, '#ffd166') + rect(1000, 220, 440, 30, '#6b4a2b');
      s += rect(1120, 150, 200, 60, '#fff', 'rx="8"') + txt(1220, 193, 'KNOCK?', 36, 'font-family="Fredoka" font-weight="700" fill="#2b2140" text-anchor="middle"');
      s += rect(300, 300, 240, 300, '#5a4030') + rect(320, 320, 200, 260, '#9ad7ff');
      return s;
    },
    hospital_ext: (t) => {
      let s = sky(t, true, -400, 880) + rect(300, 160, 1300, 720, '#dfe6ea') + rect(300, 160, 1300, 40, '#b0bec5');
      for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) s += rect(340 + c * 126, 230 + r * 100, 80, 60, (r * 7 + c * 3) % 4 ? '#ffe28a' : '#3a3f70');
      s += rect(820, 40, 260, 260, '#fff', 'rx="30"') + rect(900, 80, 100, 180, '#e53935') + rect(860, 120, 180, 100, '#e53935') + txt(950, 360, 'HOSPITAL', 60, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"');
      s += rect(-500, 880, 2920, 500, '#2a2a35'); for (let i = 0; i < 12; i++) s += rect(-400 + i * 260, 990, 120, 14, '#999');
      const amb = 1200 - ease(t / 2.5) * 500;
      s += `<g transform="translate(${amb},0)">` + rect(0, 620, 560, 260, '#fff', 'rx="20"') + rect(380, 660, 180, 220, '#f5f5f5', 'rx="12"') + rect(420, 680, 120, 90, '#9ad7ff', 'rx="8"') + rect(0, 760, 560, 36, '#e53935') + circ(130, 890, 46, '#222') + circ(450, 890, 46, '#222') + rect(60, 660, 240, 90, '#ffe9a8', 'rx="8"') + rect(150, 760, 60, 36, '#e53935') + rect(200, 580, 160, 46, (Math.floor(t * 6) % 2) ? '#e53935' : '#3f51b5', 'rx="10"') + circ(280, 600, 160, (Math.floor(t * 6) % 2) ? '#e53935' : '#3f51b5', 'opacity="0.18"') + '</g>';
      return s;
    },
    hospital_hall: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#dff3ea') + rect(-500, 600, 2920, 280, '#cfe9dc') + floor(880, '#f1f1f1', '#e6e6e6');
      for (let i = 0; i < 5; i++) { const x = -300 + i * 560; s += rect(x, 280, 260, 600, '#90a4ae', 'rx="8"') + rect(x + 40, 320, 180, 160, '#dff4ff', 'rx="8"') + circ(x + 230, 580, 10, '#555'); }
      s += rect(760, 120, 400, 90, '#2a6fdb', 'rx="14"') + txt(960, 182, 'WARD 4', 54, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"');
      s += rect(1500, 700, 360, 40, '#8d6e63', 'rx="8"') + rect(1520, 740, 20, 140, '#6d4c41') + rect(1820, 740, 20, 140, '#6d4c41');
      return s;
    },
    hospital_room: (t) => {
      let s = rect(-500, -400, 2920, 1300, '#eaf6f0') + floor(880, '#f1f1f1', '#e6e6e6');
      s += rect(1380, 160, 440, 360, '#90a4ae') + rect(1400, 180, 400, 320, '#1b1f4b') + circ(1700, 270, 40, '#fff4c2');
      s += rect(900, 800, 740, 110, '#dfe6ea', 'rx="14"') + rect(880, 760, 40, 160, '#90a4ae', 'rx="8"') + rect(1620, 740, 40, 180, '#90a4ae', 'rx="8"') + rect(920, 790, 700, 30, '#fff', 'rx="8"') + ell(1080, 760, 120, 46, '#fff') + rect(920, 910, 30, 60, '#555') + rect(1580, 910, 30, 60, '#555');
      s += rect(1740, 560, 10, 320, '#777') + rect(1700, 480, 90, 120, '#dff4ff', 'rx="10"') + rect(1710, 520, 70, 70, '#9ad7ff', 'rx="6"') + line(1745, 600, 1745, 700, '#aaa', 4);
      s += rect(260, 320, 380, 240, '#2b2140', 'rx="14"') + `<polyline points="${[...Array(25)].map((_, i) => { const ph = ((i / 25) * 6 + t * 1.5) % 1; const spike = ph > 0.5 && ph < 0.6 ? -70 : ph > 0.6 && ph < 0.7 ? 40 : 0; return `${290 + i * 13.5},${440 + spike}`; }).join(' ')}" stroke="#4ecdc4" stroke-width="6" fill="none"/>` + txt(290, 540, '72 bpm', 30, 'font-family="Nunito" font-weight="800" fill="#4ecdc4"');
      return s;
    },
    endcard: (t) => {
      let s = rect(-500, -400, 2920, 1900, 'url(#endG)') + [...Array(10)].map((_, i) => ell(((i * 431 + t * 20) % 2900) - 500, 150 + (i * 173) % 800 + Math.sin(t + i) * 20, 60, 44, '#fff', 'opacity="0.06"')).join('');
      s += circ(640, 200, 60, C.you) + ell(616, 192, 7, 10, C.line) + ell(664, 192, 7, 10, C.line) + `<path d="M620,222 Q640,240 660,222" stroke="${C.line}" stroke-width="5" fill="none" stroke-linecap="round"/>` + `<path d="M580,200 A60,60 0 0 1 700,200 Z" fill="${C.hood}" transform="translate(0,-18)"/>` + circ(640, 200, 60, 'none', `stroke="${C.line}" stroke-width="6"`);
      s += txt(1060, 222, 'whatifgraphics', 86, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"');
      s += rect(1250, 760, 660, 150, '#fff', 'rx="20"') + txt(1580, 822, 'NEXT EPISODE', 34, 'font-family="Nunito" font-weight="800" fill="#8a8a99" text-anchor="middle"') + txt(1580, 876, 'What If You Could Pause Time?', 36, 'font-family="Nunito" font-weight="800" fill="#2b2140" text-anchor="middle"');
      return s;
    },
  };

  // ───────── props ─────────
  const PROPS = {
    toast: (x, y) => rect(x - 50, y - 50, 100, 100, '#e0a860', 'rx="26"') + rect(x - 38, y - 38, 76, 76, '#f5d08a', 'rx="20"'),
    mug: (x, y) => rect(x - 36, y - 40, 72, 80, '#fff', 'rx="12"') + `<path d="M${x + 36},${y - 20} a20,20 0 0 1 0,40" stroke="#fff" stroke-width="12" fill="none"/>` + `<path d="M${x - 10},${y - 60} q10,-20 0,-40 M${x + 10},${y - 60} q10,-20 0,-40" stroke="#bbb" stroke-width="5" fill="none" opacity="${0.5 + Math.sin(0) * 0.5}"/>`,
    phone: (x, y, o, t) => `<g transform="translate(${x},${y}) rotate(${o.flip ? 15 : -15})">` + rect(-34, -60, 68, 120, '#222', 'rx="12"') + rect(-28, -52, 56, 100, '#9ad7ff', 'rx="8"') + circ(0, 0, 10, '#e53935', `opacity="${Math.floor(t * 2) % 2 ? 1 : 0.3}"`) + '</g>',
    swarm: (x, y, o, t) => [...Array(12)].map((_, i) => { const at = 0.2 + i * 0.18; if (t < at) return ''; const a = i / 12 * Math.PI * 2, r = (o.small ? 260 : 420) + (i % 3) * 40; const bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r * 0.6 + Math.sin(t * 2 + i) * 10; const k = pop(t, at); return `<g transform="translate(${bx},${by}) scale(${k})">` + rect(-62, -34, 124, 68, o.dark ? '#3b3160' : '#fff', `rx="30" stroke="${o.dark ? '#1d1733' : C.line}" stroke-width="5"`) + txt(0, 14, ['...', '!!', '?!', 'hmm', 'him?', '...'][i % 6], 34, `font-family="Nunito" font-weight="800" fill="${o.dark ? '#fff' : C.line}" text-anchor="middle"`) + '</g>'; }).join(''),
    radius: (x, y, o, t) => { const k = pop(t, o.at || 0, 0.6); return `<g transform="translate(${x},${y}) scale(${k})">` + ell(0, 160, 760, 300, '#ffd166', 'opacity="0.18"') + ell(0, 160, 760, 300, 'none', `stroke="${C.line}" stroke-width="8" stroke-dasharray="30 22"`) + '</g>' + line(x - 760, y + 160, x + 760, y + 160, C.line, 6, `stroke-dasharray="14 14" opacity="${k}"`); },
    label: (x, y, o, t) => { const k = pop(t, o.at || 0); return `<g transform="translate(${x},${y}) scale(${k})">` + rect(-90, -44, 180, 88, '#ffd166', `rx="24" stroke="${C.line}" stroke-width="6"`) + txt(0, 16, o.text, 48, `font-family="Fredoka" font-weight="700" fill="${C.line}" text-anchor="middle"`) + `<path d="M-24,44 L0,${86 + Math.sin(t * 6) * 8} L24,44 Z" fill="#ffd166" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>` + '</g>'; },
    graph: (x, y, o, t) => { const k = pop(t, o.at || 0); const pts = [[0, 260], [70, 240], [140, 250], [210, 190], [280, 200], [350, 120], [420, 90], [490, 40]]; const n = clamp((t - (o.at || 0) - 0.3) / 2, 0, 1) * (pts.length - 1); const vis = pts.slice(0, Math.floor(n) + 1); if (Math.floor(n) < pts.length - 1) { const a = pts[Math.floor(n)], b = pts[Math.floor(n) + 1], u = n - Math.floor(n); vis.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u)]); } return `<g transform="translate(${x - 280},${y - 180}) scale(${k})">` + rect(-40, -40, 600, 380, '#fff', `rx="24" stroke="${C.line}" stroke-width="6"`) + line(0, 300, 540, 300, '#999', 4) + line(0, 300, 0, 0, '#999', 4) + `<polyline points="${vis.map(p => p.join(',')).join(' ')}" stroke="#ff7a2f" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` + (vis.length ? circ(vis[vis.length - 1][0], vis[vis.length - 1][1], 16, '#ff4d8d') : '') + txt(270, -8, 'VIEWS', 30, 'font-family="Nunito" font-weight="800" fill="#8a8a99" text-anchor="middle"') + '</g>'; },
    counter: (x, y, o, t) => { const k = pop(t, o.at || 0, 0.5); return `<g transform="translate(${x},${y}) scale(${k})">` + txt(0, 0, o.text, 150, `font-family="Fredoka" font-weight="700" fill="#ffd166" text-anchor="middle" dominant-baseline="middle" stroke="${C.line}" stroke-width="18" paint-order="stroke" stroke-linejoin="round"`) + txt(0, 110, o.sub || '', 54, `font-family="Nunito" font-weight="800" fill="#fff" text-anchor="middle" stroke="${C.line}" stroke-width="10" paint-order="stroke"`) + '</g>'; },
    hearts: (x, y, o, t) => [...Array(9)].map((_, i) => { const tt = (t - (o.at || 0)) - i * 0.25; if (tt < 0) return ''; const hx = x + (i - 4) * 70 + Math.sin(tt * 3 + i) * 20, hy = y - tt * 120; const sc = 0.6 + (i % 3) * 0.2; return `<path transform="translate(${hx},${hy}) scale(${sc})" d="M0,20 C-30,-10 -30,-40 0,-30 C30,-40 30,-10 0,20 Z" fill="#ff4d8d" stroke="${C.line}" stroke-width="5" opacity="${clamp(1 - tt / 4, 0, 1)}"/>`; }).join(''),
    comments: (x, y, o, t) => { const L = ['psychic. 100%.', 'he read my MIND', 'this is real guys'], R = ["it's a magician 🙄", 'the "team" is good', 'fake but fun']; let s = ''; L.forEach((c, i) => { const k = pop(t, (o.at || 0) + i * 0.3); s += `<g transform="translate(${x - 460},${y - 130 + i * 110}) scale(${k})">` + rect(-200, -40, 400, 80, '#fff', `rx="20" stroke="${C.line}" stroke-width="5"`) + txt(0, 12, c, 30, `font-family="Nunito" font-weight="800" fill="${C.line}" text-anchor="middle"`) + '</g>'; }); R.forEach((c, i) => { const k = pop(t, (o.at || 0) + 0.15 + i * 0.3); s += `<g transform="translate(${x + 460},${y - 130 + i * 110}) scale(${k})">` + rect(-200, -40, 400, 80, '#3b3160', `rx="20" stroke="#1d1733" stroke-width="5"`) + txt(0, 12, c, 30, 'font-family="Nunito" font-weight="800" fill="#fff" text-anchor="middle"') + '</g>'; }); return s; },
    wall: (x, y) => rect(x - 40, y - 720, 80, 720, '#cfd8dc', `stroke="${C.line}" stroke-width="6"`) + rect(x - 40, y - 720, 80, 720, 'url(#stripes)', 'opacity="0.3"'),
    ticker: (x, y, o, t) => `<g clip-path="url(#tickClip)">` + rect(0, y - 50, 1920, 100, '#e53935') + txt(340 - ((t * 200) % 1700), y + 16, o.text, 44, 'font-family="Nunito" font-weight="800" fill="#fff"') + '</g>' + rect(0, y - 50, 320, 100, '#2b2140') + txt(160, y + 16, 'LIVE', 48, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"'),
    mic: (x, y, o, t) => `<g transform="translate(${x},${y}) rotate(-20)">` + rect(-40, -120, 80, 160, '#888', 'rx="40"') + rect(-40, -120, 80, 160, 'url(#stripes)', 'rx="40" opacity="0.4"') + rect(-12, 40, 24, 120, '#444') + [1, 2, 3].map(i => `<path d="M${60 + i * 30},${-80 - i * 20} a${40 + i * 30},${40 + i * 30} 0 0 1 0,${(80 + i * 40)}" stroke="#2b2140" stroke-width="8" fill="none" opacity="${0.4 + 0.6 * Math.abs(Math.sin(t * 4 - i))}"/>`).join('') + '</g>',
    panels: (x, y, o, t) => { const items = o.items || []; const n = items.length; const pw = 620, ph = 400; return items.map((bg, i) => { const k = pop(t, (o.at || 0) + i * 0.5); const px = x + (i - (n - 1) / 2) * (n > 2 ? 440 : 700), py = y + (i % 2 ? 40 : -40); const rot = (i % 2 ? 4 : -4); return `<g transform="translate(${px},${py}) rotate(${rot}) scale(${k})">` + rect(-pw / 2 - 20, -ph / 2 - 20, pw + 40, ph + 90, '#fff', `rx="12" stroke="${C.line}" stroke-width="6"`) + `<g clip-path="url(#panelClip)"><g transform="translate(${-pw / 2},${-ph / 2}) scale(${pw / 1920})">${BG[bg] ? BG[bg](t) : ''}</g></g>` + (o.labels ? txt(0, ph / 2 + 50, o.labels[i], 40, `font-family="Fredoka" font-weight="700" fill="${C.line}" text-anchor="middle"`) : '') + '</g>'; }).join(''); },
    subscribe: (x, y, o, t) => { const at = o.at || 0; const k = pop(t, at, 0.4); const clicked = t > at + 2.2; const pulse = clicked ? 1 : 1 + Math.sin(t * 6) * 0.03; const cx = clamp(lerp(x + 500, x + 60, ease((t - at - 0.8) / 1.2)), x + 60, x + 500), cy = clamp(lerp(y + 300, y + 30, ease((t - at - 0.8) / 1.2)), y + 30, y + 300); return `<g transform="translate(${x},${y}) scale(${k * pulse})">` + rect(-260, -70, 520, 140, clicked ? '#8a8a99' : '#e53935', `rx="30" stroke="${C.line}" stroke-width="8"`) + txt(0, 22, clicked ? 'SUBSCRIBED ✓' : 'SUBSCRIBE', 64, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"') + '</g>' + (t > at + 0.8 ? `<path transform="translate(${cx},${cy}) scale(${t > at + 2.0 && t < at + 2.3 ? 0.8 : 1})" d="M0,0 L0,70 L18,54 L34,90 L50,82 L34,48 L58,46 Z" fill="#fff" stroke="${C.line}" stroke-width="6" stroke-linejoin="round"/>` : '') + (clicked && t < at + 3.2 ? circ(x, y, (t - at - 2.2) * 400, 'none', `stroke="#ffd166" stroke-width="10" opacity="${1 - (t - at - 2.2)}"`) : ''); },
  };

  // ───────── frame assembly ─────────
  function defs() {
    return `<defs>${grad('skyD', '#6cc5ff', '#dff4ff')}${grad('skyN', '#101535', '#2c3570')}${grad('wallBlue', '#a9d6ff', '#e9f6ff')}${grad('screenG', '#1f3b8f', '#3fa7d6')}
      <radialGradient id="voidG" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="#8fd8ff"/><stop offset="1" stop-color="#2f5fd6"/></radialGradient>
      <radialGradient id="endG" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#4a2d7a"/><stop offset="1" stop-color="#1c1536"/></radialGradient>
      <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>
      <pattern id="stripes" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="30" height="60" fill="#2ec4b6"/></pattern>
      <clipPath id="winClip"><rect x="-500" y="180" width="2920" height="360"/></clipPath>
      <clipPath id="doorClip"><rect x="600" y="160" width="720" height="740"/></clipPath>
      <clipPath id="tickClip"><rect x="0" y="880" width="1920" height="200"/></clipPath>
      <clipPath id="panelClip"><rect x="-310" y="-200" width="620" height="400" rx="8"/></clipPath>
      <filter id="greyf"><feColorMatrix type="saturate" values="0.15"/></filter>
      <filter id="greyScene"><feColorMatrix type="saturate" values="0.35"/></filter>
    </defs>`;
  }

  function renderShot(shot, t, dur) {
    SCENE.noStool = false;
    const cam = shot.cam || [[960, 540, 1], [960, 540, 1.06]];
    const u = ease(t / Math.max(dur, 0.1));
    const cx = lerp(cam[0][0], cam[1][0], u), cy = lerp(cam[0][1], cam[1][1], u), sc = lerp(cam[0][2], cam[1][2], u);
    const bgFn = BG[shot.bg] || BG.void;
    let scene = bgFn(t);
    const chars = shot.chars || [];
    const sorted = chars.map((c, i) => [c, i]).sort((a, b) => (a[0][2] - b[0][2]));
    for (const [c, i] of sorted) scene += drawChar(c[0], c[1], c[2], c[3], t, i, dur);
    for (const p of (shot.props || [])) { const fn = PROPS[p[0]]; if (fn) scene += fn(p[1], p[2], p[3] || {}, t); }
    const bl = shot.bubbles || [];
    bl.forEach((b, i) => {
      const key = JSON.stringify(b[0]); const at = (b[2] && b[2].at) || 0; let until = null;
      bl.forEach((b2, j) => { if (j !== i && JSON.stringify(b2[0]) === key) { const a2 = (b2[2] && b2[2].at) || 0; if (a2 > at && (until == null || a2 < until)) until = a2; } });
      scene += bubble(b, chars, t, i, until);
    });
    const filt = shot.fx === 'grey' ? 'filter="url(#greyScene)"' : '';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}`;
    out += `<g ${filt}><g transform="translate(960,540) scale(${sc}) translate(${-cx},${-cy})">${scene}</g></g>`;
    if (shot.fx === 'dark') out += rect(0, 0, W, H, 'rgba(12,8,40,0.42)');
    if (shot.fx === 'grey') out += rect(0, 0, W, H, 'rgba(40,40,60,0.25)');
    if (shot.fx === 'warm') out += rect(0, 0, W, H, 'rgba(255,170,60,0.16)');
    out += rect(0, 0, W, H, 'url(#vig)');
    if (shot.card) out += card(shot.card, t);
    out += '</svg>';
    return out;
  }

  function renderThumb(th) {
    const t = 2;
    let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs()}`;
    let scene = (BG[th.bg] || BG.void)(t);
    for (const [i, c] of (th.chars || []).entries()) scene += drawChar(c[0], c[1], c[2], c[3], t, i, 1);
    (th.bubbles || []).forEach((b, i) => { scene += bubble(b, th.chars, t, i); });
    out += `<g>${scene}</g>`;
    out += rect(0, 0, W, H, 'url(#vig)');
    const lines = th.thumbText.split('\n');
    out += `<g transform="translate(80,150) rotate(-4)">` + lines.map((l, i) => txt(0, i * 165, l, 185, `font-family="Bangers" fill="#ffe600" stroke="${C.line}" stroke-width="22" paint-order="stroke" stroke-linejoin="round" dominant-baseline="middle"`)).join('') + '</g>';
    out += `<g transform="translate(250,620) rotate(-8)">` + rect(-110, -46, 220, 92, '#e53935', `rx="24" stroke="${C.line}" stroke-width="8"`) + txt(0, 20, 'YOU', 64, 'font-family="Fredoka" font-weight="700" fill="#fff" text-anchor="middle"') + '</g>' + `<path d="M360,650 Q430,660 480,620" stroke="#e53935" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M440,610 L480,620 L465,660" stroke="#e53935" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += '</svg>';
    return out;
  }

  global.WIG = { renderShot, renderThumb, BG, PROPS, NPC };
})(typeof window !== 'undefined' ? window : globalThis);
