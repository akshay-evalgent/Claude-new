/* chatvid engine: a chat UI whose whole state is a pure function of time.
   boot(episode) builds the DOM, plans the timeline and returns {duration, cues};
   renderAt(T) puts the page in the exact state for time T (seconds).
   No CSS animations or transitions are used, so every frame is deterministic. */
(() => {
  const W = 1920, H = 1080;
  const $ = (id) => document.getElementById(id);

  const THEMES = {
    midnight: { greet: 'What can I help with?', ph: 'Ask anything', disc: (n) => `${n} can make mistakes. Check important info.` },
    nebula:   { greet: 'Hello, there', ph: (n) => `Ask ${n}`, disc: (n) => `${n} can make mistakes, so double-check it` },
    void:     { greet: (n) => n, ph: 'What do you want to know?', disc: '' },
  };

  // Default pacing in seconds. An episode may override any of these under "pacing".
  const DEF = {
    cps: 14,            // typing speed, characters per second
    sendPause: 0.28,    // pause between the last key and send
    think: 0.5,         // "thinking" dot before the reply streams
    tokenDt: 0.065,     // reply streaming, seconds per word
    hold: 0.55,         // hold on the full reply before the punch-in
    punchDur: 0.13,     // punch-in zoom length
    punchHold: 1.15,    // hold on the punch-in
    whip: 0.3,          // whip back to the input box
    introHold: 0.35,    // wide shot of the empty app
    introZoom: 0.7,     // zoom from wide into the input box
    finalHold: 2.6,     // slow push on the last punchline
    hookDur: 1.6,       // cold open: the climax shown first
    rewindDur: 0.75,    // rewind from the climax to the start
  };

  const ICONS = [
    '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    '<path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 2l-1 4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7"/>',
    '<path d="M17 13V4h3v9zM17 13l-4 7a2 2 0 0 1-3-2l1-4H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17"/>',
    '<path d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
    '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
    '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  ].map((p) => `<svg viewBox="0 0 24 24">${p}</svg>`).join('');

  // ---------- helpers ----------
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const graphemes = (s) => Array.from(seg.segment(s), (x) => x.segment);
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const emoImg = (g) => `<img class="emo" src="../assets/emoji/${ekey(g)}.png" alt="">`;
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => graphemes(s).map((g) => (isEmoji(g) ? emoImg(g) : esc(g))).join('');
  const val = (v, n) => (typeof v === 'function' ? v(n) : v);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  const EASE = {
    linear: (p) => p,
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    outBack: (p) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    inQuad: (p) => p * p,
  };

  function tokenize(text) {
    const toks = []; let cur = '';
    const push = () => { if (cur) toks.push({ s: cur }); cur = ''; };
    for (const g of graphemes(text)) {
      if (isEmoji(g)) { push(); toks.push({ s: g, emo: true }); }
      else if (g === ' ') { push(); toks.push({ s: ' ', sp: true }); }
      else cur += g;
    }
    push();
    return toks;
  }

  function rectOf(els) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const e of els) for (const r of e.getClientRects()) {
      if (!r.width && !r.height) continue;
      x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // camera that frames rect r: at most fx of the width, fy of the height, scale <= maxS;
  // ay places the rect's centre at that fraction of the frame height (0.5 = middle).
  function fit(r, fx, fy, maxS, minS = 1, ay = 0.5) {
    const s = clamp(Math.min((fx * W) / r.w, (fy * H) / r.h), minS, maxS);
    return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 - ((ay - 0.5) * H) / s, s };
  }

  // ---------- state ----------
  let EP, P, X, shots, shakes, cues, hudDrops, mainStart, mainEnd, climax, composeCam;

  function build(ep) {
    const theme = THEMES[ep.interface] ? ep.interface : 'midnight';
    document.body.className = 't-' + theme;
    const th = THEMES[theme], name = (ep.ai && ep.ai.name) || 'Assistant';
    $('hdrName').textContent = name;
    $('greet').textContent = val(th.greet, name);
    $('ph').textContent = val(th.ph, name);
    $('disc').textContent = val(th.disc, name);
    $('hud').classList.toggle('on', !!(ep.hud && ep.hud.patience));
    const thread = $('thread');
    X = ep.exchanges.map((ex) => {
      const u = document.createElement('div'); u.className = 'msg user';
      u.innerHTML = `<div class="bubble">${rich(ex.user)}</div>`;
      const a = document.createElement('div'); a.className = 'msg ai';
      const toks = tokenize(ex.ai);
      a.innerHTML = `<div class="avatar"></div><div class="body">${toks.map((t) => `<span class="t">${t.emo ? emoImg(t.s) : esc(t.s)}</span>`).join('')}</div>` +
        `<div class="actions">${ICONS}</div><div class="dots"><i></i></div>`;
      thread.append(u, a);
      return { ex, u, a, toks, spans: [...a.querySelectorAll('.t')], bubble: u.firstChild, body: a.querySelector('.body'),
        actions: a.querySelector('.actions'), dots: a.querySelector('.dots'), dot: a.querySelector('.dots i'), S: {} };
    });
  }

  function punchSpans(x) {
    const n = x.ex.punch === true || x.ex.punch == null ? 2 : x.ex.punch;
    const idx = []; let words = 0;
    for (let j = x.toks.length - 1; j >= 0; j--) {
      const t = x.toks[j];
      if (!t.sp && !t.emo) { if (words === n) break; words++; }
      idx.unshift(j);
    }
    while (idx.length && x.toks[idx[0]].sp) idx.shift();
    return idx.map((j) => x.spans[j]);
  }

  function measure() {
    $('cam').style.transform = 'none';
    const vpH = $('viewport').clientHeight;
    composeCam = fit(rectOf([$('composer')]), 0.9, 0.9, 2.6, 1, 0.64);
    X.forEach((x, i) => {
      X.forEach((y, j) => { y.u.classList.toggle('on', j <= i); y.a.classList.toggle('on', j <= i); });
      $('home').style.display = 'none';
      const bottom = x.a.offsetTop + x.a.offsetHeight + 10;
      x.S.scroll = Math.min(0, vpH - bottom);
      $('thread').style.transform = `translateY(${x.S.scroll}px)`;
          // reply shot: the full column width, centred on the user bubble + reply; tall
      // replies fall back to framing the reply alone
      const both = rectOf([x.bubble, x.body]);
      const maxS = (0.975 * W) / 768;   // the whole column, edge to edge (~2.44x)
      const r = both.h * maxS < 0.66 * H ? both : rectOf([x.body]);
      const s = clamp(Math.min(maxS, (0.66 * H) / r.h), 1.2, maxS);
      x.S.replyCam = { cx: 576 + 384, cy: r.y + r.h / 2, s };
      x.S.punchCam = fit(rectOf(punchSpans(x)), 0.62, 0.3, 6.5, 2.5);
    });
  }

  function plan() {
    const r = rng(1234);
    shots = [{ t: 0, dur: 0, cam: { cx: W / 2, cy: H / 2, s: 1 }, drift: 0.01 }];
    shakes = []; cues = []; hudDrops = [];
    let t = P.introHold;
    shots.push({ t, dur: P.introZoom, cam: composeCam, ease: 'inOutCubic', drift: 0.004 });
    cues.push({ t: t + 0.05, s: 'whoosh', g: -12 });
    t += P.introZoom + 0.08;
    let pat = 100;
    X.forEach((x, i) => {
      const ex = x.ex, S = x.S;
      S.typeStart = t;
      S.chars = graphemes(ex.user); S.charT = [];
      let ct = t;
      S.chars.forEach((g, j) => {
        let dt = (1 / P.cps) * (0.6 + 0.8 * r());
        if (g === ' ') dt *= 1.2;
        if (/[.,?!]/.test(g)) dt *= 1.35;
        if (j > 16) dt *= 0.72;           // speed ramp on long messages
        ct += dt; S.charT.push(ct);
        cues.push({ t: ct, s: 'key' + (1 + Math.floor(r() * 3)), g: (g === ' ' ? -19 : -16) + r() * 4, rate: 0.92 + r() * 0.16, dur: 0.16 });
      });
      S.send = ct + P.sendPause;
      cues.push({ t: S.send, s: 'send', g: -10 });
      shots.push({ t: S.send, dur: 0.2, cam: S.replyCam, ease: 'outExpo', drift: 0.012 });
      S.stream = S.send + (ex.think ?? P.think);
      S.tokT = []; let tt = S.stream;
      x.toks.forEach((tk) => { if (!tk.sp) tt += tk.emo ? P.tokenDt * 2 : P.tokenDt; S.tokT.push(tt); });
      S.streamEnd = tt;
      cues.push({ t: S.stream, s: 'reply', g: -13 });
      const hasPunch = ex.punch !== false;
      S.punch = S.streamEnd + (ex.hold ?? P.hold);
      const holdP = ex.final ? P.finalHold : (ex.punchHold ?? P.punchHold);
      if (hasPunch) {
        shots.push({ t: S.punch, dur: P.punchDur, cam: S.punchCam, ease: 'outBack', drift: ex.final ? 0.085 : 0.028 });
        cues.push({ t: S.punch, s: 'zoom', g: -7 });
        if (ex.shake) shakes.push({ t: S.punch + P.punchDur * 0.6, amp: ex.final ? 26 : 20, dur: 0.42 });
        S.next = S.punch + P.punchDur + holdP;
      } else {
        S.next = S.punch;
      }
      if (ex.sfx) cues.push({ t: hasPunch ? S.punch + 0.04 : S.streamEnd, s: ex.sfx, g: -3, duck: true });
      if (ex.patience != null && ex.patience !== pat) {
        hudDrops.push({ t: hasPunch ? S.punch : S.streamEnd, from: pat, to: ex.patience });
        pat = ex.patience;
      }
      if (ex.final) {
        cues.push({ t: S.punch + 0.1, s: '@riser', dur: holdP - 0.1, g: -13 });
        S.end = S.next; climax = S.punch + P.punchDur + 0.05;
      } else if (i < X.length - 1) {
        shots.push({ t: S.next, dur: P.whip, cam: composeCam, ease: 'inOutCubic', drift: 0.004 });
        cues.push({ t: S.next, s: 'whip', g: -11 });
        t = S.next + P.whip + 0.06;
      } else {
        S.end = S.next + 0.6;
      }
    });
    const last = X[X.length - 1].S;
    mainEnd = last.end;
    if (climax == null) climax = last.punch + P.punchDur + 0.05;
  }

  // ---------- camera ----------
  const drifted = (c, d, dt) => ({ cx: c.cx, cy: c.cy, s: c.s * (1 + d * Math.max(0, dt)) });
  function camAt(t) {
    let prev = shots[0], cur = shots[0].cam;
    for (let i = 1; i < shots.length; i++) {
      const sh = shots[i];
      if (sh.t > t) break;
      const from = drifted(prev.cam, prev.drift || 0, sh.t - (prev.t + prev.dur));
      if (t < sh.t + sh.dur) {
        const e = EASE[sh.ease || 'inOutCubic']((t - sh.t) / sh.dur);
        return { cx: lerp(from.cx, sh.cam.cx, e), cy: lerp(from.cy, sh.cam.cy, e), s: from.s * Math.pow(sh.cam.s / from.s, e) };
      }
      prev = sh; cur = sh.cam;
    }
    return drifted(cur, prev.drift || 0, t - (prev.t + prev.dur));
  }
  function shakeAt(t) {
    let x = 0, y = 0, rot = 0;
    for (const k of shakes) {
      const u = t - k.t;
      if (u < 0 || u > k.dur) continue;
      const d = Math.pow(1 - u / k.dur, 2) * k.amp;
      x += d * Math.sin(2 * Math.PI * 23 * u + 1.3);
      y += d * 0.8 * Math.sin(2 * Math.PI * 17 * u + 0.4);
      rot += d * 0.03 * Math.sin(2 * Math.PI * 11 * u);
    }
    return { x, y, rot };
  }

  // ---------- patience meter ----------
  const FACES = [[70, '😊'], [40, '😐'], [15, '😤'], [-1, '🤬']];
  function hudAt(t) {
    let v = 100, bump = 0, shake = 0;
    for (const d of hudDrops) {
      if (t < d.t) break;
      const p = clamp((t - d.t) / 0.45, 0, 1);
      v = lerp(d.from, d.to, EASE.inOutCubic(p));
      const u = t - d.t;
      if (u < 0.5) { bump = 0.14 * Math.pow(1 - u / 0.5, 2); shake = (d.from - d.to) >= 25 ? 10 * Math.pow(1 - u / 0.5, 2) * Math.sin(u * 90) : 0; }
    }
    const hud = $('hud');
    const fill = $('hudFill');
    fill.style.width = `${Math.max(v, 0.0001)}%`;
    const hue = 120 * (v / 100);
    const flash = v <= 0.5 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7)) : 1;
    fill.style.background = `linear-gradient(90deg, hsl(${hue},90%,${44 + 8 * flash}%), hsl(${hue + 10},95%,${58 * flash}%))`;
    hud.style.borderColor = v <= 0.5 ? `rgba(255,60,60,${0.5 + 0.5 * Math.abs(Math.sin(t * 7))})` : 'rgba(255,255,255,.12)';
    $('hudPct').textContent = `${Math.round(v)}%`;
    const face = FACES.find(([th]) => v > th)[1];
    $('hudFace').src = `../assets/emoji/${ekey(face)}.png`;
    hud.style.transform = `translateX(${shake}px) scale(${1 + bump})`;
  }

  // ---------- one frame of the main timeline ----------
  function renderMain(t) {
    let k = -1;
    X.forEach((x, i) => { if (t >= x.S.typeStart) k = i; });
    const typing = k >= 0 && t < X[k].S.send;
    $('home').style.display = k < 0 || (k === 0 && typing) ? 'block' : 'none';
    X.forEach((x, i) => {
      const S = x.S, sent = i < k || (i === k && !typing);
      x.u.classList.toggle('on', sent); x.a.classList.toggle('on', sent);
      if (!sent) return;
      const done = i < k;
      const thinking = !done && t < S.stream;
      x.dots.classList.toggle('on', thinking);
      if (thinking) {
        const ph = (t - S.send) * 2 * Math.PI * 1.6;
        x.dot.style.transform = `scale(${0.75 + 0.3 * (0.5 + 0.5 * Math.sin(ph))})`;
      }
      x.spans.forEach((sp, j) => sp.classList.toggle('v', done || t >= S.tokT[j]));
      x.actions.classList.toggle('v', done || t >= S.streamEnd + 0.12);
    });
    let typed = '';
    if (typing) { const S = X[k].S; typed = S.chars.filter((_, j) => S.charT[j] <= t).join(''); }
    $('typed').innerHTML = rich(typed);
    $('ph').style.display = typed ? 'none' : 'inline';
    $('sendBtn').classList.toggle('on', !!typed);
    const caretOn = (typing && t >= X[k].S.typeStart) || Math.floor(t * 2.2) % 2 === 0;
    $('caret').style.opacity = caretOn ? 1 : 0;
    let scroll = 0;
    if (k >= 0) scroll = typing ? (k > 0 ? X[k - 1].S.scroll : 0) : X[k].S.scroll;
    $('thread').style.transform = `translateY(${scroll}px)`;
    const c = camAt(t), sh = shakeAt(t);
    $('cam').style.transform = `translate(${W / 2 + sh.x}px, ${H / 2 + sh.y}px) rotate(${sh.rot}deg) scale(${c.s}) translate(${-c.cx}px, ${-c.cy}px)`;
    hudAt(t);
  }

  // ---------- public API ----------
  window.boot = async (ep) => {
    EP = ep; P = Object.assign({}, DEF, ep.pacing || {});
    build(ep);
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
    // the meter faces are swapped at render time, so warm them up
    await Promise.all(FACES.map(([, f]) => new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = `../assets/emoji/${ekey(f)}.png`; })));
    measure();
    plan();
    const hook = ep.hook !== false && ep.hook != null;
    mainStart = hook ? P.hookDur + P.rewindDur : 0;
    const all = cues.map((c) => ({ ...c, t: c.t + mainStart }));
    if (hook) {
      const fin = X.find((x) => x.ex.final) || X[X.length - 1];
      all.push({ t: 0, s: 'zoom', g: -8 });
      if (fin.ex.sfx) all.push({ t: 0.03, s: fin.ex.sfx, g: -4, duck: true });
      all.push({ t: P.hookDur - 0.05, s: 'rewind', g: -6, dur: P.rewindDur + 0.25 });
    }
    window.__hook = hook;
    const duration = mainStart + mainEnd;
    const music = ep.music ? { track: ep.music.track, gain: ep.music.gain ?? -20, start: mainStart, end: duration } : null;
    return { duration, cues: all.sort((a, b) => a.t - b.t), music, mainStart };
  };

  window.renderAt = (T) => {
    const hook = window.__hook;
    let t, rew = 0;
    if (hook && T < P.hookDur) t = climax + T * 0.9;
    else if (hook && T < mainStart) {
      const p = (T - P.hookDur) / P.rewindDur;
      t = (climax + P.hookDur * 0.9) * (1 - EASE.inQuad(p));
      rew = 1;
    } else t = T - mainStart;
    renderMain(Math.max(0, t));
    $('fx').classList.toggle('on', !!rew);
    $('cam').style.filter = rew ? 'saturate(.55) contrast(1.25) hue-rotate(-12deg) blur(.6px)' : 'none';
    const f = hook ? T - mainStart : -1;
    $('flash').style.opacity = f >= 0 && f < 0.2 ? (0.5 * (1 - f / 0.2)).toFixed(3) : 0;
  };
})();
