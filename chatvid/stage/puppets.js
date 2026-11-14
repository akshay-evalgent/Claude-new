/* Puppet characters for the panel-show engine. Each is an SVG drawn fresh every frame:
   Puppets.svg(kind, {talk, expr, blink, t, censored}) -> markup (viewBox 0 0 300 340).
   talk 0..1 opens the mouth (driven by the voice's loudness), expr picks eyes and mouth. */
(() => {
  const F = (n) => (Math.round(n * 10) / 10).toString();

  // ---- screen-style face: glowing eyes and mouth (robots, phones, monitors)
  function ledFace(cx, cy, o, st) {
    const { expr = 'neutral', talk = 0, blink = 0 } = st;
    const dx = o.dx ?? 46, w = o.ew ?? 30, h0 = o.eh ?? 40, col = o.color || '#19e3ff', glow = o.glow ?? true;
    let out = glow ? `<g filter="url(#pg)">` : '<g>';
    const eye = (side) => {
      const x = cx + side * dx;
      let h = h0, rot = (o.tilt || 0) * side, sy = 0, ww = w;
      if (expr === 'happy' || (expr === 'wink' && side > 0)) {
        return `<path d="M${F(x - ww * 0.62)} ${F(cy + 6)} Q${F(x)} ${F(cy - h0 * 0.62)} ${F(x + ww * 0.62)} ${F(cy + 6)}" fill="none" stroke="${col}" stroke-width="${F(w * 0.34)}" stroke-linecap="round"/>`;
      }
      if (expr === 'dead') {
        const k = w * 0.5;
        return `<path d="M${F(x - k)} ${F(cy - k)} L${F(x + k)} ${F(cy + k)} M${F(x + k)} ${F(cy - k)} L${F(x - k)} ${F(cy + k)}" stroke="${col}" stroke-width="${F(w * 0.3)}" stroke-linecap="round"/>`;
      }
      if (expr === 'wide') { h *= 1.22; ww *= 1.18; }
      if (expr === 'squint' || expr === 'smug') h *= 0.38;
      if (expr === 'angry') { rot += 16 * side; h *= 0.7; }
      if (expr === 'sad') { rot -= 14 * side; h *= 0.8; sy = 4; }
      if (expr === 'side') { return `<rect x="${F(x - ww / 2 + 9)}" y="${F(cy - h / 2)}" width="${F(ww)}" height="${F(h)}" rx="${F(ww * 0.42)}" fill="${col}"/>`; }
      h = Math.max(4, h * (1 - 0.94 * blink));
      return `<rect x="${F(x - ww / 2)}" y="${F(cy - h / 2 + sy)}" width="${F(ww)}" height="${F(h)}" rx="${F(Math.min(ww, h) * 0.42)}" fill="${col}" transform="rotate(${F(rot)} ${F(x)} ${F(cy)})"/>`;
    };
    out += eye(-1) + eye(1);
    // mouth
    const my = cy + (o.my ?? 62), mw = o.mw ?? 64, mc = o.mcolor || col;
    if (st.censored) {
      out += `</g><rect x="${F(cx - mw * 0.95)}" y="${F(my - 19)}" width="${F(mw * 1.9)}" height="38" rx="5" fill="#000" stroke="#fff" stroke-width="2"/>` +
        `<text x="${F(cx)}" y="${F(my + 8)}" text-anchor="middle" font-family="Anton, Inter, sans-serif" font-size="24" fill="#fff" letter-spacing="3">BLEEP</text>`;
      return out;
    }
    if (talk > 0.06) {
      const h = 7 + talk * (o.mopen ?? 34), ww = mw * (0.5 + 0.22 * talk);
      out += `<rect x="${F(cx - ww / 2)}" y="${F(my - h / 2)}" width="${F(ww)}" height="${F(h)}" rx="${F(Math.min(ww, h) / 2)}" fill="${mc}"/>`;
    } else if (expr === 'happy' || expr === 'wink' || expr === 'smug') {
      out += `<path d="M${F(cx - mw * 0.5)} ${F(my - 5)} Q${F(cx)} ${F(my + 22)} ${F(cx + mw * 0.5)} ${F(my - 5)}" fill="none" stroke="${mc}" stroke-width="8" stroke-linecap="round"/>`;
    } else if (expr === 'sad' || expr === 'angry') {
      out += `<path d="M${F(cx - mw * 0.42)} ${F(my + 9)} Q${F(cx)} ${F(my - 12)} ${F(cx + mw * 0.42)} ${F(my + 9)}" fill="none" stroke="${mc}" stroke-width="8" stroke-linecap="round"/>`;
    } else if (expr === 'wide') {
      out += `<ellipse cx="${F(cx)}" cy="${F(my + 2)}" rx="13" ry="16" fill="${mc}"/>`;
    } else if (expr === 'dead') {
      out += `<path d="M${F(cx - mw * 0.45)} ${F(my)} q${F(mw * 0.11)} -12 ${F(mw * 0.225)} 0 t${F(mw * 0.225)} 0 t${F(mw * 0.225)} 0 t${F(mw * 0.225)} 0" fill="none" stroke="${mc}" stroke-width="7" stroke-linecap="round"/>`;
    } else {
      out += `<rect x="${F(cx - mw * 0.3)}" y="${F(my - 4)}" width="${F(mw * 0.6)}" height="8" rx="4" fill="${mc}"/>`;
    }
    return out + '</g>';
  }

  // ---- eyeball face (the paperclip): whites, pupils and eyebrows
  function ballFace(cx, cy, st) {
    const { expr = 'neutral', talk = 0, blink = 0 } = st;
    let out = '';
    [-1, 1].forEach((s) => {
      const x = cx + s * 30, r = expr === 'wide' ? 27 : 23;
      const lid = Math.max(blink, expr === 'squint' || expr === 'smug' ? 0.55 : expr === 'sad' ? 0.3 : 0);
      out += `<ellipse cx="${F(x)}" cy="${F(cy)}" rx="${r}" ry="${F(r * 1.15)}" fill="#fff" stroke="#1a1d22" stroke-width="4"/>`;
      if (expr === 'dead') out += `<path d="M${x - 10} ${cy - 10} l20 20 m0 -20 l-20 20" stroke="#1a1d22" stroke-width="6" stroke-linecap="round"/>`;
      else out += `<circle cx="${F(x + (expr === 'side' ? 8 : 3 * s))}" cy="${F(cy + (expr === 'sad' ? 6 : 2))}" r="${expr === 'wide' ? 8 : 10}" fill="#1a1d22"/>`;
      if (lid > 0.02) out += `<path d="M${F(x - r - 3)} ${F(cy - r * 1.2)} h${F(2 * r + 6)} v${F(lid * r * 2.3)} h${F(-2 * r - 6)} z" fill="#aeb8c2"/>`;
      const by = cy - 40 - (expr === 'wide' ? 9 : 0), tilt = expr === 'angry' ? 9 * s : expr === 'sad' ? -9 * s : expr === 'happy' ? -3 * s : 0;
      out += `<path d="M${F(x - 22)} ${F(by + tilt)} L${F(x + 22)} ${F(by - tilt)}" stroke="#1a1d22" stroke-width="9" stroke-linecap="round"/>`;
    });
    const my = cy + 52;
    if (st.censored) return out + `<rect x="${cx - 50}" y="${my - 16}" width="100" height="32" rx="4" fill="#000"/><text x="${cx}" y="${my + 8}" text-anchor="middle" font-family="Anton, Inter, sans-serif" font-size="21" fill="#fff" letter-spacing="2">BLEEP</text>`;
    if (talk > 0.06) out += `<ellipse cx="${cx}" cy="${F(my)}" rx="${F(12 + talk * 6)}" ry="${F(5 + talk * 15)}" fill="#1a1d22"/>`;
    else if (expr === 'happy' || expr === 'smug') out += `<path d="M${cx - 20} ${my - 4} Q${cx} ${my + 16} ${cx + 20} ${my - 4}" fill="none" stroke="#1a1d22" stroke-width="6" stroke-linecap="round"/>`;
    else if (expr === 'sad') out += `<path d="M${cx - 16} ${my + 6} Q${cx} ${my - 8} ${cx + 16} ${my + 6}" fill="none" stroke="#1a1d22" stroke-width="6" stroke-linecap="round"/>`;
    else if (expr === 'wide') out += `<ellipse cx="${cx}" cy="${my}" rx="8" ry="10" fill="#1a1d22"/>`;
    else out += `<path d="M${cx - 13} ${my} h26" stroke="#1a1d22" stroke-width="6" stroke-linecap="round"/>`;
    return out;
  }

  const DEFS = `<defs><filter id="pg" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="orb" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#ff7bd0"/><stop offset=".42" stop-color="#8a5cff"/><stop offset=".78" stop-color="#2aa8ff"/><stop offset="1" stop-color="#16e0c8"/></radialGradient>
    <linearGradient id="clip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="#aab4c0"/><stop offset="1" stop-color="#7d8894"/></linearGradient>
    <linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2030"/><stop offset="1" stop-color="#0b0e16"/></linearGradient></defs>`;

  const KIND = {
    // the host: a small boxy robot in a bow tie
    bb(st) {
      const pulse = 0.6 + 0.4 * Math.sin(st.t * 5);
      return `<line x1="150" y1="40" x2="150" y2="12" stroke="#8fa3b5" stroke-width="6"/><circle cx="150" cy="10" r="${F(9 + 2 * pulse)}" fill="#ff2e4d" filter="url(#pg)"/>
        <rect x="26" y="112" width="20" height="56" rx="8" fill="#2b3644"/><rect x="254" y="112" width="20" height="56" rx="8" fill="#2b3644"/>
        <rect x="44" y="40" width="212" height="196" rx="46" fill="#0b1118" stroke="#19e3ff" stroke-width="7"/>
        <rect x="62" y="60" width="176" height="156" rx="32" fill="#05080d"/>
        ${ledFace(150, 122, { color: '#19e3ff', dx: 44, ew: 30, eh: 42, my: 60 }, st)}
        <path d="M96 240 h108 l22 100 h-152 z" fill="#18202b" stroke="#19e3ff" stroke-width="4"/>
        <path d="M150 262 l-30 -17 v34 z M150 262 l30 -17 v34 z" fill="#ff2e4d"/><circle cx="150" cy="262" r="8" fill="#ff5d76"/>`;
    },
    // the edgy one: angular, black, spiked
    grok(st) {
      return `<path d="M92 44 l14 -34 l14 30 l16 -38 l14 38 l16 -38 l14 38 l14 -30 l14 34 z" fill="#f4f4f4"/>
        <path d="M82 40 h136 l42 44 v104 l-42 46 h-136 l-42 -46 v-104 z" fill="#0a0a0c" stroke="#f4f4f4" stroke-width="7" stroke-linejoin="round"/>
        <path d="M224 70 l-22 34" stroke="#f4f4f4" stroke-width="4" stroke-linecap="round" opacity=".7"/>
        ${ledFace(150, 124, { color: '#ffffff', dx: 46, ew: 38, eh: 26, my: 58, tilt: -9, mw: 70 }, st)}
        <path d="M70 244 l80 34 l80 -34 l26 96 h-212 z" fill="#15161a" stroke="#f4f4f4" stroke-width="4" stroke-linejoin="round"/>
        <path d="M112 262 q38 44 76 0" fill="none" stroke="#ffd23f" stroke-width="6" stroke-dasharray="3 9" stroke-linecap="round"/>`;
    },
    // the voice assistant: a glowing orb with a waveform
    siri(st) {
      const bob = Math.sin(st.t * 1.7) * 5, bars = Array.from({ length: 9 }, (_, i) => {
        const h = 6 + (st.talk || 0) * (22 + 20 * Math.abs(Math.sin(st.t * 9 + i * 1.3))) * (1 - Math.abs(i - 4) / 6);
        return `<rect x="${100 + i * 12}" y="${F(296 - h / 2)}" width="6" height="${F(h)}" rx="3" fill="#c9b8ff"/>`;
      }).join('');
      return `<g transform="translate(0 ${F(bob)})"><circle cx="150" cy="140" r="122" fill="none" stroke="#8a5cff" stroke-width="3" opacity=".45"/>
        <circle cx="150" cy="140" r="106" fill="url(#orb)" filter="url(#pg)"/>
        <ellipse cx="112" cy="92" rx="34" ry="20" fill="#fff" opacity=".22"/>
        ${ledFace(150, 126, { color: '#ffffff', dx: 40, ew: 26, eh: 38, my: 56, mw: 56, glow: false }, st)}</g>${bars}`;
    },
    // the people-pleaser: a mint speech bubble with a name badge
    chatgpt(st) {
      return `<path d="M76 40 h148 a44 44 0 0 1 44 44 v96 a44 44 0 0 1 -44 44 h-104 l-46 34 l10 -36 a44 44 0 0 1 -52 -42 v-96 a44 44 0 0 1 44 -44 z" fill="#effff8" stroke="#12b886" stroke-width="7" stroke-linejoin="round"/>
        <circle cx="92" cy="158" r="13" fill="#ffb3c7" opacity=".7"/><circle cx="208" cy="158" r="13" fill="#ffb3c7" opacity=".7"/>
        ${ledFace(150, 118, { color: '#0d7a5a', dx: 42, ew: 26, eh: 38, my: 56, mw: 58, glow: false }, st)}
        <path d="M100 262 h100 l24 78 h-148 z" fill="#f7fffb" stroke="#12b886" stroke-width="4"/>
        <path d="M150 266 l-13 16 l13 44 l13 -44 z" fill="#12b886"/>
        <rect x="170" y="286" width="42" height="26" rx="4" fill="#fff" stroke="#12b886" stroke-width="2"/><text x="191" y="297" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="8" fill="#12b886">HELLO</text><text x="191" y="307" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="7" fill="#333">so sorry</text>`;
    },
    // a phone whose keyboard thinks it knows better
    autocorrect(st) {
      const keys = [0, 1, 2].map((r) => Array.from({ length: 7 - r }, (_, i) => `<rect x="${F(88 + r * 9 + i * 18)}" y="${256 + r * 17}" width="14" height="12" rx="3" fill="#2b3447"/>`).join('')).join('');
      return `<rect x="66" y="8" width="168" height="324" rx="32" fill="#0e1320" stroke="#8aa0ff" stroke-width="6"/>
        <rect x="78" y="22" width="144" height="296" rx="22" fill="#060913"/><rect x="128" y="28" width="44" height="10" rx="5" fill="#161c2c"/>
        ${ledFace(150, 104, { color: '#8aa0ff', dx: 32, ew: 22, eh: 32, my: 46, mw: 46, mopen: 26 }, st)}
        <rect x="88" y="186" width="124" height="52" rx="10" fill="#141b2d"/>
        <text x="150" y="212" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="19" fill="#fff">ducking</text>
        <path d="M108 222 q5.5 -7 11 0 t11 0 t11 0 t11 0 t11 0 t11 0 t11 0 t7 0" fill="none" stroke="#ff3b3b" stroke-width="3"/>${keys}`;
    },
    // the bouncer of the internet
    captcha(st) {
      let grid = '';
      for (let i = 1; i < 3; i++) grid += `<path d="M${46 + i * 69.3} 74 v176 M46 ${74 + i * 58.6} h208" stroke="#cdd6e2" stroke-width="3"/>`;
      return `<rect x="38" y="20" width="224" height="290" rx="10" fill="#f6f8fb" stroke="#3b82f6" stroke-width="6"/>
        <rect x="38" y="20" width="224" height="50" rx="10" fill="#3b82f6"/><rect x="38" y="52" width="224" height="18" fill="#3b82f6"/>
        <text x="52" y="42" font-family="Inter, sans-serif" font-weight="600" font-size="12" fill="#dbe8ff">Select all squares with</text>
        <text x="52" y="61" font-family="Inter, sans-serif" font-weight="900" font-size="17" fill="#fff">HUMANS</text>${grid}
        ${ledFace(150, 138, { color: '#16202e', dx: 44, ew: 32, eh: 26, my: 62, mw: 62, glow: false, tilt: -5 }, st)}
        <path d="M88 122 h124" stroke="#16202e" stroke-width="7"/>
        <rect x="46" y="260" width="208" height="40" rx="5" fill="#fff" stroke="#cdd6e2" stroke-width="2"/><rect x="58" y="270" width="20" height="20" rx="3" fill="#fff" stroke="#8b96a5" stroke-width="2.5"/>
        <text x="88" y="286" font-family="Inter, sans-serif" font-weight="600" font-size="14" fill="#333">I'm not a robot</text>
        <path d="M150 310 l-13 14 l13 16 l13 -16 z" fill="#111"/>`;
    },
    // the interviewer: a monitor in a blazer
    interviewer(st) {
      const led = Math.sin(st.t * 6) > 0 ? 1 : 0.3;
      return `<path d="M62 62 q88 -76 176 0" fill="none" stroke="#2a2f3a" stroke-width="9" stroke-linecap="round"/><rect x="48" y="78" width="18" height="48" rx="8" fill="#2a2f3a"/>
        <path d="M54 128 q-2 46 44 62" fill="none" stroke="#2a2f3a" stroke-width="5"/><circle cx="100" cy="191" r="7" fill="#2a2f3a"/>
        <rect x="56" y="36" width="188" height="150" rx="16" fill="#0d1118" stroke="#c7ccd6" stroke-width="7"/>
        <circle cx="150" cy="48" r="5" fill="#ff3b3b" opacity="${led}"/>
        ${ledFace(150, 104, { color: '#7fe0ff', dx: 38, ew: 26, eh: 36, my: 48, mw: 54, mopen: 28 }, st)}
        <rect x="138" y="186" width="24" height="28" fill="#8d95a3"/>
        <path d="M70 214 h160 l34 126 h-228 z" fill="#1e2a4a"/><path d="M150 214 l-34 0 l34 58 l34 -58 z" fill="#fff"/>
        <path d="M116 214 l34 58 l-48 -22 z M184 214 l-34 58 l48 -22 z" fill="#16203a"/>
        <path d="M128 216 q22 70 44 0" fill="none" stroke="#e63946" stroke-width="3"/><rect x="134" y="284" width="32" height="38" rx="4" fill="#fff" stroke="#e63946" stroke-width="2"/>
        <text x="150" y="309" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="15" fill="#1e2a4a">HR</text>`;
    },
    // the retired office assistant
    clippy(st) {
      const sway = Math.sin(st.t * 2.2) * 2.5;
      return `<g transform="rotate(${F(sway)} 150 320)"><path d="M112 300 V96 a44 44 0 0 1 88 0 V268 a30 30 0 0 1 -60 0 V132" fill="none" stroke="#5d6772" stroke-width="27" stroke-linecap="round"/>
        <path d="M112 300 V96 a44 44 0 0 1 88 0 V268 a30 30 0 0 1 -60 0 V132" fill="none" stroke="url(#clip)" stroke-width="19" stroke-linecap="round"/>
        ${ballFace(156, 118, st)}</g>`;
    },
  };

  window.Puppets = {
    kinds: Object.keys(KIND),
    svg(kind, st) {
      return `<svg viewBox="0 0 300 340" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" overflow="visible">${DEFS}${(KIND[kind] || KIND.bb)(st)}</svg>`;
    },
  };
})();
