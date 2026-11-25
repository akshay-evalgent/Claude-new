// Keyframe helpers. All timing is in seconds so the same timeline renders at any fps.

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'outBack' | 'step';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

export const ease = (e: Ease | undefined, x: number): number => {
  const p = clamp(x);
  switch (e ?? 'inOut') {
    case 'linear':
      return p;
    case 'in':
      return p * p * p;
    case 'out':
      return 1 - Math.pow(1 - p, 3);
    case 'outBack': {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    }
    case 'step':
      return p < 1 ? 0 : 1;
    case 'inOut':
    default:
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
};

/** Scalar keyframes: [time, value, easeIntoThisKey?] */
export type K = [number, number, Ease?];
export const kf = (t: number, keys: K[]): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1, e] = keys[i + 1];
    if (t < t1) return lerp(v0, v1, ease(e, (t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

/** 0..1 progress between two times */
export const prog = (t: number, a: number, b: number, e: Ease = 'inOut') => ease(e, (t - a) / (b - a));

/** Damped spring pop (0 → 1 with overshoot), starting at time `at`. */
export const pop = (t: number, at: number, dur = 0.45) => {
  if (t < at) return 0;
  const x = (t - at) / dur;
  if (x >= 1) return 1;
  return 1 - Math.exp(-6 * x) * Math.cos(x * Math.PI * 2.4);
};

/** Visible window helper with fade in/out (returns 0..1). */
export const win = (t: number, a: number, b: number, fade = 0.15) =>
  t < a || t > b ? 0 : Math.min(clamp((t - a) / fade), clamp((b - t) / fade));

// ---------- Pose tracks ----------

type Val = number | string | [number, number] | boolean;
export type Keyed<P> = {t: number; e?: Ease} & Partial<P>;

const lerpVal = (a: Val, b: Val, p: number): Val => {
  if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, p);
  if (Array.isArray(a) && Array.isArray(b)) return [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
  return p > 0 ? b : a; // discrete values switch as soon as the move starts
};

/** Each key only lists what changes; values carry forward. Eases are applied into each key. */
export function track<P extends Record<string, Val>>(t: number, base: P, keys: Keyed<P>[]): P {
  const resolved: P[] = [];
  let cur = base;
  for (const k of keys) {
    const {t: _t, e: _e, ...rest} = k;
    cur = {...cur, ...(rest as unknown as Partial<P>)};
    resolved.push(cur);
  }
  if (!keys.length) return base;
  if (t <= keys[0].t) return resolved[0];
  for (let i = 0; i < keys.length - 1; i++) {
    if (t < keys[i + 1].t) {
      const p = ease(keys[i + 1].e, (t - keys[i].t) / (keys[i + 1].t - keys[i].t));
      const a = resolved[i];
      const b = resolved[i + 1];
      const out = {} as Record<string, Val>;
      for (const key of Object.keys(b)) out[key] = lerpVal(a[key] as Val, b[key] as Val, p);
      return out as P;
    }
  }
  return resolved[resolved.length - 1];
}

/** Deterministic pseudo-random in [0,1) */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
