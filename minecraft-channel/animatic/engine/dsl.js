// Episode timeline DSL. Pure data: no three.js here.
// Authors write shots in order; actions inside a shot use shot-relative seconds.
// Everything is compiled into keyframe tracks evaluated as a pure function of time.

export const EASE = {
  lin: (u) => u,
  io: (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  out: (u) => 1 - (1 - u) * (1 - u),
  in: (u) => u * u,
  back: (u) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); },
  step: () => 0,
};

const lerp = (a, b, u) => a + (b - a) * u;
const lerpV = (a, b, u) => (Array.isArray(a) ? a.map((x, i) => lerp(x, b[i], u)) : lerp(a, b, u));

export function evalKF(kf, t) {
  if (!kf.length) return undefined;
  if (t <= kf[0].t) return kf[0].v;
  for (let i = 1; i < kf.length; i++) {
    const b = kf[i];
    if (t < b.t) {
      const a = kf[i - 1];
      if (b.e === 'step') return a.v;
      const span = b.t - a.t;
      const u = span <= 0 ? 1 : (t - a.t) / span;
      return lerpV(a.v, b.v, (EASE[b.e] ?? EASE.io)(u));
    }
  }
  return kf[kf.length - 1].v;
}

export function evalStep(steps, t, dflt) {
  let v = dflt;
  for (const s of steps) { if (s.t <= t) v = s.v; else break; }
  return v;
}

// which step is active and since when (for pose blending)
export function stepInfo(steps, t) {
  let cur = null, prev = null;
  for (const s of steps) { if (s.t <= t) { prev = cur; cur = s; } else break; }
  return { cur, prev };
}

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  const m = w.replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, m ? m.length : 1);
}

export const VOICE = {
  ava: { rate: 0.17 }, rex: { rate: 0.16 }, duchess: { rate: 0.2 }, pico: { rate: 0.13 },
  lou: { rate: 0.34 }, greg: { rate: 0.22 }, mom: { rate: 0.15 },
};

export class Episode {
  constructor(meta) {
    this.meta = Object.assign({ fps: 30, width: 1920, height: 1080, accent: '#ff5a7a', watermark: 'YOUR LOGO' }, meta);
    this.t = 0;
    this.shots = [];
    this.actors = {};
    this.acts = [];
    this.g = { tod: [{ t: 0, v: 0 }], label: [], hud: [], scores: [], fade: [{ t: 0, v: 0 }], card: [] };
    this.captions = [];
    this.lines = [];
    this.sfx = [];
    this.music = [];
    this.bursts = [];
    this.notes = [];
  }

  actor(name) {
    if (!this.actors[name]) this.actors[name] = { pos: [], yaw: [], look: [], pose: [], expr: [], vis: [], tag: [], state: {}, hops: [], talk: [], attach: [], spin: [] };
    return this.actors[name];
  }

  // ---------- shot structure ----------
  shot(id, dur, cam, desc, fn) {
    const s = { id, t0: this.t, dur, cam, desc, shake: [], punch: [] };
    this.shots.push(s);
    const api = this.shotApi(s);
    const li = this.lines.length;
    fn && fn(api);
    // grow the shot so recorded dialogue is never cut off by the next cut
    const need = Math.max(0, ...this.lines.slice(li).map((l) => l.t1 + (l.offscreen ? 0.2 : 0.3) - s.t0));
    if (need > s.dur + 0.01) { this.notes.push(`${id}: extended ${s.dur.toFixed(2)}s -> ${need.toFixed(2)}s for dialogue`); s.dur = need; }
    this.t += s.dur;
    return s;
  }

  shotApi(s) {
    const E = this;
    const T = (at) => s.t0 + (at ?? 0);
    return {
      t0: s.t0, dur: s.dur,
      place: (who, pos, yaw, at) => E.place(who, pos, yaw, T(at)),
      move: (who, to, at, dur, o) => E.move(who, to, T(at), dur, o),
      turn: (who, yaw, at, dur) => E.turn(who, yaw, T(at), dur),
      look: (who, v, at, dur) => E.look(who, v, T(at), dur),
      pose: (who, name, at, blend) => E.pose(who, name, T(at), blend),
      expr: (who, name, at, quiet) => E.expr(who, name, T(at), quiet),
      hop: (who, at, h, dur) => E.hop(who, T(at), h, dur),
      spin: (who, at, dur, turns) => E.spin(who, T(at), dur, turns),
      vis: (who, on, at) => E.vis(who, on, T(at)),
      tag: (who, on, at) => E.tag(who, on, T(at)),
      state: (who, k, v, at) => E.state(who, k, v, T(at)),
      attach: (who, parent, part, off, at, rot) => E.attach(who, parent, part, off, T(at), rot),
      say: (who, text, at, o) => E.say(who, text, T(at), o) - s.t0,
      sfx: (name, at, vol) => E.sfxAt(name, T(at), vol),
      burst: (kind, pos, at, o) => E.burst(kind, pos, T(at), o),
      shake: (at, dur, amp) => s.shake.push({ t: T(at), dur: dur ?? 0.35, amp: amp ?? 0.12 }),
      punch: (at, scale) => s.punch.push({ t: T(at), scale: scale ?? 1.25 }),
      tod: (v, at, dur) => E.todTo(v, T(at), dur),
      label: (text, at) => E.g.label.push({ t: T(at), v: text }),
      hud: (on, at) => E.g.hud.push({ t: T(at), v: on }),
      scores: (obj, at) => E.g.scores.push({ t: T(at), v: obj }),
      fade: (v, at, dur) => E.fadeTo(v, T(at), dur),
      card: (text, at) => E.g.card.push({ t: T(at), v: text }),
      music: (cue, at) => E.music.push({ t: T(at), cue }),
    };
  }

  // ---------- actions (global time) ----------
  later(t, fn) { this.acts.push({ t, fn, i: this.acts.length }); }

  place(who, pos, yaw, t = 0) {
    this.later(t, () => { const a = this.actor(who); cutKF(a.pos, t); a.pos.push({ t, v: pos, e: 'step' }); if (yaw != null) { cutKF(a.yaw, t); a.yaw.push({ t, v: yaw, e: 'step' }); } });
  }
  move(who, to, t, dur = 1, o = {}) {
    this.later(t, () => {
      const a = this.actor(who);
      const from = cutKF(a.pos, t) ?? to;
      a.pos.push({ t: t + dur, v: to, e: o.ease ?? 'io' });
      if (o.face !== false && (Math.abs(to[0] - from[0]) + Math.abs(to[2] - from[2]) > 0.05)) {
        const yaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
        const y0 = cutKF(a.yaw, t) ?? yaw;
        a.yaw.push({ t: t + Math.min(0.15, dur / 3), v: unwrap(y0, yaw), e: 'out' });
      }
      if (o.arc) a.hops.push({ t, dur, h: o.arc });
    });
  }
  turn(who, yaw, t, dur = 0.2) {
    this.later(t, () => { const a = this.actor(who); const y0 = cutKF(a.yaw, t) ?? yaw; a.yaw.push({ t: t + dur, v: unwrap(y0, yaw), e: 'io' }); });
  }
  look(who, v, t, dur = 0.2) {
    this.later(t, () => { const a = this.actor(who); cutKF(a.look, t, [0, 0]); a.look.push({ t: t + dur, v, e: 'io' }); });
  }
  pose(who, name, t, blend = 0.18) { this.later(t, () => this.actor(who).pose.push({ t, v: name, blend })); }
  expr(who, name, t, quiet) {
    this.later(t, () => this.actor(who).expr.push({ t, v: name }));
    if (!quiet && t > 0) this.sfxAt('blip', t, 0.35);
  }
  hop(who, t, h = 0.45, dur = 0.32) { this.later(t, () => this.actor(who).hops.push({ t, dur, h })); }
  spin(who, t, dur = 0.5, turns = 1) { this.later(t, () => this.actor(who).spin.push({ t, dur, turns })); }
  vis(who, on, t) { this.later(t, () => this.actor(who).vis.push({ t, v: on })); }
  tag(who, on, t) { this.later(t, () => this.actor(who).tag.push({ t, v: on })); }
  state(who, k, v, t) { this.later(t, () => { const a = this.actor(who); (a.state[k] ??= []).push({ t, v }); }); }
  attach(who, parent, part, off, t, rot) { this.later(t, () => this.actor(who).attach.push({ t, v: parent ? { parent, part, off: off ?? [0, 0, 0], rot: rot ?? [0, 0, 0] } : null })); }
  todTo(v, t, dur = 1) { cutKF(this.g.tod, t); this.g.tod.push({ t: t + dur, v, e: 'io' }); }
  fadeTo(v, t, dur = 0.3) { cutKF(this.g.fade, t); this.g.fade.push({ t: t + dur, v, e: 'lin' }); }
  sfxAt(name, t, vol = 1) { this.sfx.push({ t, name, vol }); }
  burst(kind, pos, t, o = {}) { this.bursts.push(Object.assign({ kind, pos, t, n: 18, seed: this.bursts.length + 1 }, o)); }

  // Dialogue: builds word timings, syllables (for jaw + audio), and caption chunks.
  // *word* marks the key word (accent colour + emphasis). Returns end time.
  say(who, text, t, o = {}) {
    const rate = o.rate ?? VOICE[who]?.rate ?? 0.17;
    const raw = text.split(/\s+/).filter(Boolean);
    const cleanText = text.replace(/\*/g, '');
    const vo = !o.novoice && this.vo ? this.vo[who + '|' + cleanText] : null;
    // never let two lines talk over each other
    if (this.lastLineEnd != null && t < this.lastLineEnd + 0.12 && t > this.lastLineEnd - 4) {
      this.notes.push(`"${cleanText}" moved ${(this.lastLineEnd + 0.12 - t).toFixed(2)}s later to avoid overlap`);
      t = this.lastLineEnd + 0.12;
    }
    let cur = t;
    const words = [];
    const syl = [];
    if (vo) {
      // recorded voice: word timings + mouth envelope come from the audio
      raw.forEach((w, i) => words.push({ text: w.replace(/\*/g, ''), key: /^\*/.test(w), t0: t + vo.words[i][0], t1: t + vo.words[i][1] }));
      vo.env.forEach((e, i) => { if (e > 0.06) syl.push({ t0: t + i / 30, t1: t + (i + 1) / 30, amp: Math.min(1, e * 1.2), flat: true }); });
      cur = t + vo.dur;
    }
    for (const w of vo ? [] : raw) {
      const key = /^\*.*\*[^\w]*$/.test(w) || /^\*/.test(w);
      const clean = w.replace(/\*/g, '');
      const n = syllables(clean);
      const ws = cur;
      for (let k = 0; k < n; k++) {
        const d = rate * (key ? 1.25 : 1);
        syl.push({ t0: cur, t1: cur + d * 0.82, key, last: false });
        cur += d;
      }
      words.push({ text: clean, key, t0: ws, t1: cur });
      if (/[,;]$/.test(clean)) cur += 0.14;
      else if (/[.!?…]$/.test(clean)) cur += 0.22;
      else cur += 0.03;
    }
    if (syl.length) syl[syl.length - 1].last = true;
    const end = cur;
    this.lastLineEnd = Math.max(this.lastLineEnd ?? 0, end);
    const kind = /\?\s*$/.test(text) ? 'q' : /!\s*$/.test(text) ? 'x' : '.';
    const line = { who, text: text.replace(/\*/g, ''), t0: t, t1: end, kind, syl, loud: o.loud ?? /[A-Z]{3,}/.test(text.replace(/\*/g, '')), soft: !!o.soft, offscreen: !!o.offscreen, novoice: !!o.novoice, vo: vo ? vo.file : null };
    this.lines.push(line);
    if (!o.silent) this.later(t, () => this.actor(who).talk.push(...syl));
    // caption chunks: max 3 words, break after punctuation
    const chunks = [];
    let c = [];
    words.forEach((w, i) => {
      c.push(w);
      const brk = c.length >= (o.chunk ?? 3) || /[,.!?…]$/.test(w.text);
      if (brk || i === words.length - 1) { chunks.push(c); c = []; }
    });
    chunks.forEach((ch, i) => {
      const t0 = ch[0].t0;
      const t1 = i < chunks.length - 1 ? chunks[i + 1][0].t0 : end + (o.hold ?? 0.35);
      this.captions.push({ t0, t1, words: ch.map((w) => ({ text: w.text, key: w.key })), who });
    });
    return end;
  }

  compile() {
    this.acts.sort((a, b) => a.t - b.t || a.i - b.i);
    for (const a of this.acts) a.fn();
    for (const a of Object.values(this.actors)) {
      a.pose.sort((x, y) => x.t - y.t); a.expr.sort((x, y) => x.t - y.t); a.vis.sort((x, y) => x.t - y.t);
      a.tag.sort((x, y) => x.t - y.t); a.attach.sort((x, y) => x.t - y.t); a.talk.sort((x, y) => x.t0 - y.t0);
      for (const k in a.state) a.state[k].sort((x, y) => x.t - y.t);
    }
    for (const k of ['label', 'hud', 'scores', 'card']) this.g[k].sort((x, y) => x.t - y.t);
    this.captions.sort((a, b) => a.t0 - b.t0);
    for (let i = 0; i < this.captions.length - 1; i++) this.captions[i].t1 = Math.min(this.captions[i].t1, this.captions[i + 1].t0);
    // auto soft tick on cuts with no other sound nearby
    for (const s of this.shots.slice(1)) {
      const near = this.sfx.some((e) => Math.abs(e.t - s.t0) < 0.12) || this.lines.some((l) => Math.abs(l.t0 - s.t0) < 0.12);
      if (!near) this.sfx.push({ t: s.t0, name: 'tick', vol: 0.25 });
    }
    this.sfx.sort((a, b) => a.t - b.t);
    this.duration = this.t;
    this.frames = Math.round(this.duration * this.meta.fps);
    return this;
  }

  cues() {
    return { meta: this.meta, duration: this.duration, notes: this.notes, lines: this.lines, sfx: this.sfx, music: this.music, shots: this.shots.map((s) => ({ id: s.id, t0: s.t0, dur: s.dur, desc: s.desc })) };
  }
}

// Truncate a keyframe track at time t, returning the value there and leaving a keyframe at t.
function cutKF(kf, t, dflt) {
  if (!kf.length) { if (dflt !== undefined) { kf.push({ t, v: dflt, e: 'step' }); return dflt; } return undefined; }
  const v = evalKF(kf, t);
  let e = 'step';
  while (kf.length && kf[kf.length - 1].t > t) e = kf.pop().e === 'step' ? 'step' : 'lin';
  kf.push({ t, v: Array.isArray(v) ? v.slice() : v, e });
  return v;
}

function unwrap(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return from + d;
}
