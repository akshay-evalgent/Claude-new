// Virtual clock: page timers, rAF, performance.now and Date only advance when __advance(ms) is called.
(() => {
  let vt = 0; const T0 = Date.now(); const RD = Date;
  const timers = new Map(); let tid = 1; let rafs = new Map(); let rid = 1;
  performance.now = () => vt;
  function VDate(...a) { if (!(this instanceof VDate)) return new RD(T0 + vt).toString(); return a.length ? new RD(...a) : new RD(T0 + vt); }
  VDate.prototype = RD.prototype; VDate.now = () => T0 + vt; VDate.parse = RD.parse; VDate.UTC = RD.UTC;
  window.Date = VDate;
  window.setTimeout = (fn, ms = 0, ...args) => { const id = tid++; timers.set(id, { fn, at: vt + Math.max(0, +ms || 0), args }); return id; };
  window.setInterval = (fn, ms = 0, ...args) => { const id = tid++; const e = Math.max(4, +ms || 0); timers.set(id, { fn, at: vt + e, every: e, args }); return id; };
  window.clearTimeout = window.clearInterval = id => timers.delete(id);
  window.requestAnimationFrame = fn => { const id = rid++; rafs.set(id, fn); return id; };
  window.cancelAnimationFrame = id => rafs.delete(id);
  window.__vt = () => vt;
  window.__advance = (ms) => {
    const target = vt + ms; let guard = 0;
    while (guard++ < 20000) {
      let best = null;
      for (const [id, t] of timers) if (t.at <= target && (!best || t.at < best[1].at)) best = [id, t];
      if (!best) break;
      const [id, t] = best; vt = Math.max(vt, t.at);
      if (t.every) t.at += t.every; else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn(...t.args) : eval(t.fn); } catch (e) { console.error('timer', e && e.message); }
    }
    vt = target;
    const cbs = rafs; rafs = new Map();
    for (const cb of cbs.values()) { try { cb(vt); } catch (e) { console.error('raf', e && e.message); } }
  };
})();
