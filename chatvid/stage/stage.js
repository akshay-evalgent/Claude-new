/* Panel-show engine: a studio with a judges' desk, a contestant spot and puppet characters.
   boot(episode) lays out the beats from tools/stage_prepare.py's timings and returns
   {duration, cues, music}; renderAt(T) draws time T. Everything is a pure function of
   time, so frames can be rendered in any order. */
(() => {
  const W = 1920, H = 1080, FPS = 30;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const EASE = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    outBack: (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => Array.from(seg.segment(String(s)), (x) => x.segment)
    .map((g) => (isEmoji(g) ? `<img src="../assets/emoji/${ekey(g)}.png" style="height:1.05em;vertical-align:-0.16em">` : esc(g))).join('');
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const SEAT = { desk1: { x: 1010, y: 520 }, desk2: { x: 1250, y: 520 }, desk3: { x: 1490, y: 520 }, desk4: { x: 1730, y: 520 }, stage: { x: 430, y: 500 } };
  const SIZE = { desk: [276, 313], stage: [420, 476] };
  // audience reactions. Each has a pool of takes ([sound, gain dB, seconds, start offset, delay]) used in
  // turn, so the same laugh never plays twice in a row, and "hold": how long the show waits for it.
  const LAUGH = {
    small: { hold: 0.7, pool: [[['laugh-small', -18, 2.0, 1.0]], [['laugh-light', -17, 2.2, 0.6]], [['laugh-mid', -19, 2.2, 0.4]], [['laugh-small', -18, 2.0, 3.0]]] },
    mid: { hold: 1.0, pool: [[['laugh-mid', -14, 3.2, 0]], [['laugh-small', -14, 3.0, 0.3]], [['laugh-light', -12, 3.2, 0.5]], [['laugh-small', -14, 3.0, 2.2]], [['laugh-mid', -14, 3.2, 0.5]]] },
    big: { hold: 1.4, pool: [[['laugh-big', -13, 4.4, 0]], [['laugh-clap', -13, 4.6, 0.6]], [['laugh-big', -13, 4.4, 0.3], ['laugh-small', -18, 3.5, 0.2]], [['laugh-mid', -12, 3.8, 0], ['laugh-light', -15, 4.2, 0.5]]] },
    clap: { hold: 1.8, pool: [[['laugh-clap', -12, 5.0, 0.6], ['applause-light', -18, 4.5, 0, 0.5]], [['laugh-big', -12, 4.6, 0], ['applause-light', -15, 4.8, 0, 0.7]]] },
    applause: { hold: 1.6, pool: [[['applause', -16, 5.5, 0]]] },
    cheer: { hold: 2.4, pool: [[['cheer', -15, 6.5, 0], ['applause-big', -19, 7, 0]]] },
    gasp: { hold: 0.75, pool: [[['gasp-m', -14, 1.2, 0], ['gasp-f', -15, 1.1, 0], ['laugh-small', -22, 2.0, 2.0, 0.5]]] },
    ooh: { hold: 0.9, pool: [[['boo', -20, 2.0, 1.2]]] },
    crickets: { hold: 1.7, pool: [[['cricket', -11, 1.2, 0], ['cricket', -13, 1.2, 0, 0.85]]] },
  };
  const laughN = {};

  let EP, CAST = {}, B = [], duration = 0, endStart = Infinity, lastKey = '', lastSign = null;

  // subtitle pages: at most ~50 characters (one line), words timed in proportion to their length
  function pages(line, t0, dur) {
    const words = line.split(/\s+/).filter(Boolean), out = []; let cur = [];
    for (const w of words) {
      if (cur.length && (cur.join(' ') + ' ' + w).length > 50) { out.push(cur); cur = [w]; } else cur.push(w);
    }
    if (cur.length) out.push(cur);
    const total = words.reduce((a, w) => a + w.length + 1, 0);
    let t = t0;
    return out.map((ws) => {
      const p = { t0: t, words: ws.map((w) => { const d = (dur * (w.length + 1)) / total; const r = { w, t0: t, t1: t + d }; t += d; return r; }) };
      p.t1 = t; return p;
    });
  }

  function shotOf(spec, b) {
    const s = spec || (b.who ? 'cu:' + b.who : 'wide');
    if (s === 'wide') return { key: s, x: 960, y: 540, z: 1 };
    if (s === 'stage') return { key: s, x: 500, y: 500, z: 1.7 };
    if (s === 'desk') return { key: s, x: 1370, y: 520, z: 1.745 };
    if (s === 'deskR') return { key: s, x: 1105, y: 540, z: 1.25 };   // desk on the right, room for a panel on the left
    if (s.startsWith('cu:')) {
      const c = CAST[s.slice(3)], p = SEAT[c.seat];
      return c.seat === 'stage' ? { key: s, x: p.x + 90, y: p.y - 6, z: 1.9 } : { key: s, x: p.x, y: p.y - 30, z: 2.7 };
    }
    if (s.startsWith('pair:')) {
      const [a, c] = s.slice(5).split(',').map((id) => SEAT[CAST[id].seat]);
      return { key: s, x: (a.x + c.x) / 2, y: 495, z: clamp(1500 / (Math.abs(a.x - c.x) + 420), 1.2, 2.4) };
    }
    return { key: 'wide', x: 960, y: 540, z: 1 };
  }

  window.boot = async (ep) => {
    EP = ep; CAST = ep.cast;
    const plan = ep.__plan.beats, slug = ep.__slug, cues = [], music = [];
    // ---- static scene
    const show = ep.show || {};
    $('wlTop').textContent = show.top || ''; $('wlMain').textContent = show.main || '';
    $('bugName').innerHTML = rich(show.name || ''); $('bugEp').textContent = show.episode || '';
    $('chars').innerHTML = Object.entries(CAST).map(([id, c]) => `<div class="pup ${c.seat === 'stage' ? 'big' : ''}" id="pup-${id}"></div>`).join('');
    $('plates').innerHTML = Object.entries(CAST).filter(([, c]) => c.seat !== 'stage')
      .map(([id, c]) => `<div class="plate" style="left:${SEAT[c.seat].x - 850 - 92}px;border-color:${c.color}">${esc(c.name)}</div>`).join('');
    $('paddles').innerHTML = Object.entries(CAST).filter(([, c]) => c.seat !== 'stage').map(([id]) => `<div class="paddle" id="pad-${id}"><b></b><i></i></div>`).join('');
    $('crowd').innerHTML = Array.from({ length: 19 }, (_, i) => {
      const r = 44 + rnd(i) * 18, x = 30 + i * 104 + rnd(i + 40) * 30;
      return `<div class="head" data-i="${i}" style="left:${x - r}px;width:${2 * r}px;height:${2 * r}px;top:${34 - rnd(i + 9) * 26}px"></div>`;
    }).join('');
    $('confetti').innerHTML = Array.from({ length: 90 }, (_, i) => `<i style="background:${['#19e3ff', '#ff2e4d', '#ffd23f', '#7cff6b', '#b36bff'][i % 5]}"></i>`).join('');

    // ---- timeline
    let t = 0, st = { onstage: null, scores: {} }, since = {}, shotKey = '', shotT0 = 0;
    ep.beats.forEach((b, i) => {
      const p = plan[i] || {};
      const lead = b.lead ?? (b.line ? 0.06 : 0);
      const vd = p.voiceDur || 0, bleep = b.bleep ? 0.5 : 0;
      const L = b.laugh ? LAUGH[b.laugh] : null;
      const hold = b.hold ?? (L ? L.hold : b.line ? 0.14 : 0);
      const d = Math.max(b.line ? lead + vd + bleep + hold : b.dur ?? 1.5, b.min || 0);
      // state changes carried from beat to beat
      st = { ...st, scores: { ...st.scores } }; since = { ...since };
      if (b.do === 'enter') { st.leaving = null; st.onstage = b.who; since.onstage = t; st.rating = null; st.scores = {}; }
      if (b.do === 'exit') { st.leaving = st.onstage; st.onstage = null; since.onstage = t; st.rating = null; st.scores = {}; }
      for (const [k, v] of Object.entries(b.set || {})) { st[k] = v; since[k] = t + (b.setAt ?? 0); }
      for (const [k, v] of Object.entries(b.score || {})) { st.scores[k] = v; since['score.' + k] = t + (b.scoreAt === 'end' ? lead + vd : b.scoreAt ?? lead + vd * 0.5); }
      const beat = { ...b, i, t0: t, t1: t + d, lead, vd, bleep, env: p.env || '', st, since, pages: [] };
      if (b.line) {
        cues.push({ t: t + lead, s: `@voice:${slug}/${p.voice}`, g: b.voiceGain ?? CAST[b.who].gain ?? 0, duck: true });
        beat.pages = pages(b.line, t + lead, vd + bleep);
        if (b.bleep) cues.push({ t: t + lead + vd - 0.02, s: 'bleep', g: -12, dur: bleep });
      }
      if (L) {
        const at = t + (b.laughAt ?? lead + vd + bleep - 0.1);
        const n = (laughN[b.laugh] = (laughN[b.laugh] || 0) + 1), take = L.pool[(n - 1) % L.pool.length];
        take.forEach(([s0, g, du, off, delay], k) => cues.push({ t: at + (delay || 0), s: s0, g: g + (b.laughGain || 0), dur: du, off: off || 0, rate: 0.97 + ((n * 5 + k * 3) % 7) / 100 }));
      }
      (b.cues || []).forEach((c) => cues.push({ ...c, t: t + (c.at === 'end' ? lead + vd : c.at ?? 0) }));
      if (b.do === 'enter') cues.push({ t: t + 0.05, s: 'applause', g: -17, dur: Math.min(d + 1.5, 6) });
      if (b.do === 'verdict') {
        cues.push({ t, s: 'drum-roll', g: -10 });
        cues.push(b.match ? { t: t + 3.05, s: 'correct', g: -8 } : { t: t + 3.05, s: 'buzzer', g: -9 });
        if (b.match) { cues.push({ t: t + 3.1, s: 'cheer', g: -12, dur: 7 }); cues.push({ t: t + 3.1, s: 'win-chimes', g: -10 }); }
        else cues.push({ t: t + 3.2, s: 'laugh-mid', g: -17, dur: 2.6 });
      }
      if (b.do === 'title') { cues.push({ t: t + 0.02, s: 'whoosh-hit', g: -11, dur: 1.6 }); cues.push({ t: t + 0.05, s: 'impact', g: -10, dur: 3 }); }
      if (b.music) music.push({ fadeIn: 0.2, fadeOut: 0.8, gain: -18, ...b.music, t0: t + (b.music.at || 0), t1: t + (b.music.at || 0) + (b.music.dur || d) });
      // camera: a shot keeps its slow push-in across consecutive beats
      beat.shotA = shotOf(b.shot, b); beat.shotB = b.reactShot ? shotOf(b.reactShot, b) : null;
      if (beat.shotA.key !== shotKey) { shotKey = beat.shotA.key; shotT0 = t; }
      beat.shotT0 = shotT0;
      if (beat.shotB) shotKey = '';
      B.push(beat);
      t += d;
    });
    if (ep.endCard) {
      endStart = t; t += ep.endCard.dur ?? 5;
      cues.push({ t: endStart, s: 'soft-swoosh', g: -10 });
      $('ecKicker').textContent = ep.endCard.kicker || 'NEXT EPISODE';
      $('ecText').innerHTML = rich(ep.endCard.text || ''); $('ecSub').innerHTML = rich(ep.endCard.sub || '');
      if (ep.endCard.music) music.push({ fadeIn: 0.3, fadeOut: 1.2, gain: -18, ...ep.endCard.music, t0: endStart, t1: t });
    }
    duration = t;
    await document.fonts.ready;
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music: music.length ? { segments: music } : null, mainStart: 0, exchanges: B.map((b) => +b.t0.toFixed(2)) };
  };

  const show = (id, on, mode) => { $(id).style.display = on ? mode || 'block' : 'none'; };

  window.renderAt = async (T) => {
    const b = B.find((x) => T >= x.t0 && T < x.t1) || B[B.length - 1];
    const u = T - b.t0, dur = b.t1 - b.t0, f = Math.floor(T * FPS), st = b.st, since = b.since;
    const speechEnd = b.lead + b.vd, talking = !!b.line && u >= b.lead && u < speechEnd;
    const censored = b.bleep && u >= speechEnd - 0.02 && u < speechEnd + b.bleep;
    const inHold = !!b.line && u >= speechEnd + b.bleep;
    const ended = T >= endStart;

    // ---- camera
    let cam = b.shotB && inHold ? b.shotB : b.shotA;
    const shotAge = b.shotB && inHold ? u - speechEnd - b.bleep : T - b.shotT0;
    let z = cam.z * (1 + 0.05 * clamp(shotAge / 9, 0, 1)), cx = cam.x, cy = cam.y, sx = 0, sy = 0;
    if (b.punch) {
      const pt = b.lead + b.vd * (typeof b.punch === 'number' ? b.punch : 1) - 0.06, q = (u - pt) / 0.16;
      if (q >= 0) z *= 1 + 0.1 * EASE.out(clamp(q, 0, 1));
      if (b.shake && q >= 0 && q < 2.4) { const a = 12 * Math.pow(1 - q / 2.4, 2); sx = a * Math.sin(f * 2.7); sy = a * Math.cos(f * 3.3); }
    }
    if (b.do === 'verdict' && u >= 3.05 && u < 3.5) { const a = 14 * (1 - (u - 3.05) / 0.45); sx = a * Math.sin(f * 2.7); sy = a * Math.cos(f * 3.3); }
    const hw = W / 2 / z, hh = H / 2 / z;
    cx = clamp(cx, hw, W - hw); cy = clamp(cy, hh, H - hh);
    $('world').style.transform = `translate(${(W / 2 - cx * z + sx).toFixed(2)}px, ${(H / 2 - cy * z + sy).toFixed(2)}px) scale(${z.toFixed(4)})`;

    // ---- characters
    const laughing = inHold && ['mid', 'big', 'clap', 'cheer'].includes(b.laugh);
    for (const [id, c] of Object.entries(CAST)) {
      const el = $('pup-' + id), onDesk = c.seat !== 'stage';
      const entering = id === st.onstage, leaving = id === st.leaving && T - since.onstage < 0.8;
      if (!onDesk && !entering && !leaving) { el.style.display = 'none'; continue; }
      el.style.display = 'block';
      const p = SEAT[c.seat], [w, h] = SIZE[onDesk ? 'desk' : 'stage'];
      let x = p.x, y = p.y, sc = 1;
      if (!onDesk) {
        const a = clamp((T - since.onstage) / (st.instant ? 0.001 : 0.9), 0, 1);
        if (entering) { const e = EASE.out(a); x = lerp(-300, p.x, e); y -= Math.abs(Math.sin(a * Math.PI * 3)) * 26 * (1 - a); }
        else { const e = clamp((T - since.onstage) / 0.8, 0, 1); x = lerp(p.x, -340, e * e); }
      }
      let expr = 'neutral';
      if (id === b.who) expr = b.expr || 'neutral';
      else if (b.react === 'laugh') expr = onDesk && inHold ? 'happy' : 'neutral';
      else if (b.react === 'shock') expr = inHold || !b.line ? 'wide' : 'neutral';
      else if (b.react && b.react[id]) expr = b.react[id];
      if (st.buffer === id) expr = 'side';
      const ph = id.charCodeAt(0) * 0.7 + id.length;
      y += Math.sin(T * 1.3 + ph) * 2;
      if (expr === 'happy' && (laughing || b.bounce)) y -= Math.abs(Math.sin(u * 13 + ph)) * 7;
      let talk = 0;
      if (id === b.who && talking) {
        const k = (u - b.lead) * FPS, i0 = Math.floor(k), e0 = +(b.env[i0] || 0), e1 = +(b.env[i0 + 1] || e0);
        talk = clamp(lerp(e0, e1, k - i0) / 9, 0, 1);
        sc = 1.03; y -= talk * 3;
      }
      const bt = (T + ph * 1.37) % 3.9, blink = bt < 0.12 ? Math.sin((bt / 0.12) * Math.PI) : 0;
      el.style.width = w + 'px'; el.style.height = h + 'px';
      el.style.left = (x - w / 2).toFixed(1) + 'px'; el.style.top = (y - h / 2).toFixed(1) + 'px';
      el.style.transform = `scale(${sc})`;
      el.style.filter = id === b.who && talking ? `brightness(1.08) drop-shadow(0 0 16px ${c.color}99)` : '';
      el.innerHTML = Puppets.svg(c.puppet, { talk, expr, blink, t: T, censored: id === b.who && censored });
    }
    $('mic').style.opacity = st.onstage ? 1 : 0.35;
    const on = st.onstage && CAST[st.onstage];
    if (lastSign !== (st.onstage || '')) {
      $('sign').innerHTML = on ? `<small>NOW PERFORMING</small><b>${esc(on.name)}</b><span>${rich(on.role || '')}</span>` : `<small>${esc((EP.show && EP.show.name) || '')}</small><b>STAGE</b><span>next contestant loading…</span>`;
      lastSign = st.onstage || '';
    }

    // ---- judges' score paddles
    for (const [id, c] of Object.entries(CAST)) {
      if (c.seat === 'stage') continue;
      const el = $('pad-' + id), v = st.scores[id], on = v != null && T >= since['score.' + id];
      el.style.display = on ? 'block' : 'none';
      if (!on) continue;
      const p = EASE.outBack(clamp((T - since['score.' + id]) / 0.32, 0, 1)), s = SEAT[c.seat];
      el.style.left = s.x + 74 + 'px'; el.style.top = s.y - 222 + (1 - p) * 190 + 'px';
      el.style.transform = `rotate(${(1 - p) * 30 + 7}deg)`;
      const txt = String(v), num = parseFloat(txt);
      el.firstChild.textContent = txt;
      el.className = 'paddle ' + (isNaN(num) ? 'bad wide' : num <= 3 ? 'bad' : num < 7 ? 'mid' : 'good') + (txt.length > 2 ? ' wide' : '');
    }

    // ---- the contestant's self-rating, stamped next to them
    const badgeOn = st.rating != null && st.onstage && T >= since.rating;
    show('badge', badgeOn, 'flex');
    if (badgeOn) {
      const p = clamp((T - since.rating) / 0.22, 0, 1);
      $('badgeN').textContent = st.rating + '/10';
      $('badge').style.transform = `rotate(-7deg) scale(${(2.2 - 1.2 * EASE.out(p)).toFixed(3)})`;
      $('badge').style.opacity = p;
    }

    // ---- "latency": a loading ring over a character who is thinking
    const bufOn = !!st.buffer && T >= since.buffer;
    show('spinner', bufOn);
    if (bufOn) {
      const s = SEAT[CAST[st.buffer].seat], age = T - since.buffer;
      $('spinner').style.left = s.x - 150 + 'px'; $('spinner').style.top = s.y - 175 + 'px';
      $('spinner').firstChild.style.transform = `rotate(${(age * 300) % 360}deg)`;
      $('spinText').textContent = `LATENCY ${Math.floor(age * 1000 + 240).toLocaleString('en-US')} ms`;
    }

    // ---- audience and wall logo
    const bob = inHold && b.laugh && !['gasp', 'crickets', 'ooh'].includes(b.laugh) ? 1 : b.do === 'verdict' && b.match && u > 3.1 ? 1.6 : 0;
    document.querySelectorAll('#crowd .head').forEach((h, i) => { h.style.transform = `translateY(${(bob ? -Math.abs(Math.sin(u * 11 + i * 1.7)) * 9 * bob : 0).toFixed(1)}px)`; });
    $('wlSpin').style.transform = `rotate(${(T * 200) % 360}deg)`;

    // ---- on-screen chips
    show('bug', !ended && b.do !== 'title' && !['wide', 'deskR'].includes(cam.key), 'flex');   // the wall logo does this job in wide shots
    const selfOn = st.rating != null && st.onstage && T >= since.rating + 0.3 && b.do !== 'verdict';
    show('hudSelf', selfOn); if (selfOn) $('hudSelf').innerHTML = `${esc(CAST[st.onstage].name)} rated self <b>${st.rating}/10</b>`;
    const blOn = st.bleeps != null && T >= since.bleeps;
    show('hudBleep', blOn);
    if (blOn) {
      const fresh = T - since.bleeps < 0.9, max = EP.show && EP.show.bleeps || 4;
      $('hudBleep').innerHTML = `BLEEP BUDGET <span>${'▮'.repeat(st.bleeps)}${'▯'.repeat(Math.max(0, max - st.bleeps))}</span>`;
      $('hudBleep').className = fresh && Math.floor((T - since.bleeps) * 8) % 2 === 0 ? 'hot' : '';
    }
    show('banner', !!st.banner && !ended); if (st.banner) $('banner').innerHTML = rich(st.banner);

    // ---- CAPTCHA grid
    const G = st.grid, gOn = !!G && T >= since.grid;
    show('grid', gOn);
    if (gOn) {
      const key = 'g' + since.grid + (G.status || '');
      if (lastKey !== key) {
        $('gridSmall').textContent = G.small || 'Select all squares with'; $('gridBig').textContent = G.big || '';
        $('gridTiles').innerHTML = G.tiles.map((e) => `<div>${rich(e)}</div>`).join('');
        $('gridFoot').textContent = G.foot || ''; $('gridStamp').textContent = G.status || '';
        lastKey = key;
      }
      const p = EASE.outBack(clamp((T - since.grid) / 0.35, 0, 1));
      $('grid').style.transform = `scale(${(0.7 + 0.3 * p).toFixed(3)})`; $('grid').style.opacity = clamp(p * 2, 0, 1);
      show('gridStamp', !!G.status, 'flex');
    }

    // ---- pop-ups (an e-mail, a usage limit)
    const P = st.popup, pOn = !!P && T >= since.popup && !ended;
    show('popup', pOn);
    if (pOn) {
      const key = 'p' + since.popup;
      if (lastKey !== key) {
        $('popup').className = 'pop-' + (P.kind || 'note');
        $('popup').innerHTML = `<div class="popIcon">${rich(P.icon || '✉️')}</div><div><small>${esc(P.from || '')}</small><b>${rich(P.title || '')}</b><span>${rich(P.text || '')}</span>${P.button ? `<em>${esc(P.button)}</em>` : ''}</div>`;
        lastKey = key;
      }
      const p = EASE.outBack(clamp((T - since.popup) / 0.3, 0, 1));
      $('popup').style.transform = `translateX(-50%) translateY(${((1 - p) * -60).toFixed(1)}px) scale(${(0.85 + 0.15 * p).toFixed(3)})`;
      $('popup').style.opacity = clamp(p * 2, 0, 1);
    }

    // ---- the verdict: self-rating against the judges' average
    const vOn = b.do === 'verdict';
    show('verdict', vOn, 'flex');
    if (vOn) {
      const pin = EASE.out(clamp(u / 0.35, 0, 1));
      $('verdict').style.transform = `translateY(${((1 - pin) * 300).toFixed(1)}px)`;
      $('vSelfN').textContent = b.self;
      const rolled = u < 3.05;
      $('vJudgeN').textContent = rolled ? (u < 0.9 ? '?' : (Math.floor(rnd(f) * 100) / 10).toFixed(1)) : b.avg;
      $('vJudge').className = 'vbox' + (rolled ? ' roll' : '');
      const sp = clamp((u - 3.05) / 0.2, 0, 1);
      $('vStamp').style.display = u >= 3.05 ? 'block' : 'none';
      $('vStamp').textContent = b.text || (b.match ? "IT'S A MATCH!" : 'NO MATCH');
      $('vStamp').className = b.match ? 'win' : 'lose';
      $('vStamp').style.transform = `translate(-50%, -50%) rotate(-8deg) scale(${(2.6 - 1.6 * EASE.out(sp)).toFixed(3)})`;
      $('vStamp').style.opacity = sp;
    }
    const cOn = !!st.confetti && T >= since.confetti && !ended;
    show('confetti', cOn);
    if (cOn) {
      const age = T - since.confetti;
      $('confetti').childNodes.forEach((n, i) => {
        const x = rnd(i) * W, sp = 260 + rnd(i + 50) * 380, y = -60 + ((age * sp + rnd(i + 90) * 900) % (H + 160));
        n.style.transform = `translate(${(x + Math.sin(age * 3 + i) * 30).toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(age * 300 * (rnd(i + 3) - 0.5) + i * 40).toFixed(0)}deg)`;
      });
    }

    // ---- name card and subtitles
    const tOn = !!b.tag && u > 0.1 && u < dur - 0.1 && !ended;
    show('third', tOn, 'flex');
    if (tOn) {
      const c = CAST[b.who], p = EASE.out(clamp((u - 0.1) / 0.3, 0, 1));
      $('thirdName').textContent = c.name; $('thirdRole').innerHTML = rich(typeof b.tag === 'string' ? b.tag : c.role || '');
      $('third').style.borderColor = c.color; $('third').style.transform = `translateX(${((1 - p) * -60).toFixed(1)}px)`; $('third').style.opacity = p;
    }
    const pg = b.pages.find((x) => T >= x.t0 - 0.04 && T < x.t1 + 0.22) || (b.line && u >= b.lead ? b.pages[b.pages.length - 1] : null);
    const sOn = !!pg && !ended && !b.noSubs && u < speechEnd + b.bleep + 0.5;
    show('subs', sOn, 'flex');
    if (sOn) {
      const c = CAST[b.who];
      $('subWho').textContent = c.name; $('subWho').style.background = c.color;
      $('subText').innerHTML = pg.words.map((w) => `<span class="${T >= w.t0 ? (T < w.t1 ? 'now' : 'said') : ''}">${rich(w.w)}</span>`).join(' ');
    }

    // ---- title and end cards, flashes
    const tiOn = b.do === 'title';
    show('title', tiOn, 'flex');
    if (tiOn) {
      const key = 't' + b.i;
      if (lastKey !== key) {
        const h = rich(b.main || '');
        $('title').innerHTML = `<div class="tiRays"></div><div class="tiIn"><div class="tiTop">${rich(b.top || '')}</div><div class="stack tiMain"><div class="ext">${h}</div><div class="fill">${h}</div></div><div class="tiSub">${rich(b.sub || '')}</div></div>`;
        lastKey = key;
      }
      const p = EASE.out(clamp(u / 0.6, 0, 1)), m = $('title').querySelector('.tiMain');
      m.style.transform = `scale(${(2.2 - 1.2 * p + 0.03 * (u / dur)).toFixed(3)})`; m.style.opacity = clamp(u / 0.15, 0, 1);
      $('title').querySelector('.tiSub').style.opacity = clamp((u - 0.8) / 0.4, 0, 1);
      $('title').querySelector('.tiTop').style.opacity = clamp((u - 0.3) / 0.4, 0, 1);
      $('title').style.setProperty('--spin', `${(u * 10) % 360}deg`);
      $('title').style.opacity = clamp((dur - u) / 0.2, 0, 1);
    }
    show('endcard', ended, 'flex');
    if (ended) { const p = EASE.out(clamp((T - endStart) / 0.4, 0, 1)); $('endcard').style.opacity = p; $('ecText').style.transform = `scale(${0.9 + 0.1 * p})`; }
    let fo = 0;
    const fl = [].concat(tiOn ? [0] : [], vOn ? [3.05] : [], b.flash || []);
    for (const x of fl) { const q = (u - x) / 0.2; if (q >= 0 && q < 1) fo = Math.max(fo, 0.6 * (1 - q)); }
    $('flash').style.opacity = fo.toFixed(3);
    const imgs = Array.from(document.images).filter((im) => !im.complete).map((im) => im.decode().catch(() => {}));
    if (imgs.length) await Promise.all(imgs);
  };
})();
