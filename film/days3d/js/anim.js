// Animation helpers: keyed tracks, easing, poses on twos.
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const inOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const out = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
export const inn = (x) => { x = clamp(x); return x * x * x; };
export const back = (x) => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const twos = (t) => Math.floor(t * 12 + 1e-6) / 12;          // anime timing: 12 drawings a second
export const pulse = (t, a, d = 0.25) => { const x = (t - a) / d; return x < 0 || x > 1 ? 0 : Math.sin(Math.PI * x); };

export function lerp(a, b, u) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b)) { const n = Math.max(a.length, b.length); const r = []; for (let i = 0; i < n; i++) r.push(lerp(a[i] ?? 0, b[i] ?? 0, u)); return r; }
  if (a && b && typeof a === 'object') { const r = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) r[k] = k in a && k in b ? lerp(a[k], b[k], u) : (k in b ? b[k] : a[k]); return r; }
  return u < 0.5 ? a : b;
}
// keys: [[t, value, ease?], ...] sorted by t; the ease on key i shapes the move from key i-1 to key i
export function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i]; return lerp(v0, v1, (e || smooth)((t - t0) / (t1 - t0))); }
  }
  return keys[keys.length - 1][1];
}
export const DEF_POSE = { lean: 0, twist: 0, side: 0, chestX: 0, chestY: 0, headX: 0, headY: 0, headZ: 0,
  armL: [0.08, 0.14, -0.12, 0, 0, 0, 0], armR: [0.08, -0.14, -0.12, 0, 0, 0, 0], legL: [0, 0, 0, 0, 0], legR: [0, 0, 0, 0, 0],
  hipX: 0, hipY: 5.62, hipZ: 0, hipRX: 0, turn: 0 };
export const full = (p) => { const r = { ...DEF_POSE, ...p }; for (const k of ['armL', 'armR', 'legL', 'legR']) r[k] = [...(p[k] || DEF_POSE[k]), ...DEF_POSE[k].slice((p[k] || DEF_POSE[k]).length)]; return r; };
export const poseTrack = (keys) => keys.map(([t, p, e]) => [t, full(p), e]);
// seeded noise for shakes and sway
export const wob = (t, f = 1, s = 1) => Math.sin(t * f * 6.283 + s) * 0.6 + Math.sin(t * f * 2.71 * 6.283 + s * 1.7) * 0.4;
