import type { Joint, Pose } from "./Mannequin";

/**
 * Pose library: each function maps time (seconds) to a Pose, so animation is a
 * pure function of the frame. `ph` offsets the cycle so crowds don't move in sync.
 */
const sin = Math.sin;
const TAU = Math.PI * 2;

export function idle(t: number, ph = 0): Pose {
  const br = sin(t * 1.6 + ph); // breathing
  const sway = sin(t * 0.7 + ph * 1.3);
  return {
    hips: [0, 0, sway * 0.015],
    spine: [0.02 + br * 0.012, sway * 0.03, -sway * 0.01],
    neck: [0, 0, 0],
    head: [0.04 + br * 0.01, sway * 0.08, 0],
    lShoulder: [0.05, 0, 0.09 + br * 0.01],
    rShoulder: [0.05, 0, -0.09 - br * 0.01],
    lElbow: [-0.18, 0, 0],
    rElbow: [-0.18, 0, 0],
    lHip: [0, 0, 0.03],
    rHip: [0, 0, -0.03],
    lKnee: [0.02, 0, 0],
    rKnee: [0.02, 0, 0],
  };
}

/** Walk cycle in place; move the root yourself (speed ≈ 1.1 m/s at rate 1). */
export function walk(t: number, rate = 1, ph = 0): Pose {
  const c = t * rate * 1.8 * TAU * 0.5 + ph; // ~0.9 strides/s per leg
  const s = sin(c);
  const lift = Math.abs(sin(c)) * 0.025;
  return {
    lift: lift - 0.015,
    hips: [0, s * 0.08, 0],
    spine: [0.06, -s * 0.12, 0],
    head: [0.02, s * 0.06, 0],
    lHip: [-s * 0.42, 0, 0.02],
    rHip: [s * 0.42, 0, -0.02],
    lKnee: [Math.max(0, sin(c + 1.2)) * 0.75 + 0.08, 0, 0],
    rKnee: [Math.max(0, sin(c + 1.2 + Math.PI)) * 0.75 + 0.08, 0, 0],
    lShoulder: [s * 0.38, 0, 0.08],
    rShoulder: [-s * 0.38, 0, -0.08],
    lElbow: [-0.35 - Math.max(0, -s) * 0.3, 0, 0],
    rElbow: [-0.35 - Math.max(0, s) * 0.3, 0, 0],
  };
}

/** Climbing steps: higher knees, forward lean. */
export function climb(t: number, rate = 1, ph = 0): Pose {
  const w = walk(t, rate, ph);
  const c = t * rate * 1.8 * TAU * 0.5 + ph;
  return {
    ...w,
    spine: [0.18, w.spine![1], 0],
    lHip: [-Math.max(0, sin(c)) * 0.9 + 0.1, 0, 0.02],
    rHip: [-Math.max(0, -sin(c)) * 0.9 + 0.1, 0, -0.02],
    lKnee: [Math.max(0, sin(c)) * 1.3 + 0.1, 0, 0],
    rKnee: [Math.max(0, -sin(c)) * 1.3 + 0.1, 0, 0],
  };
}

export function cheer(t: number, ph = 0): Pose {
  const b = idle(t, ph);
  const w = sin(t * 9 + ph);
  return {
    ...b,
    lift: Math.max(0, sin(t * 6 + ph)) * 0.03,
    spine: [-0.08, 0, 0],
    head: [-0.25, 0, 0],
    lShoulder: [-0.2, 0, 2.6 + w * 0.12],
    rShoulder: [-0.2, 0, -2.6 + w * 0.12],
    lElbow: [-0.35, 0, 0],
    rElbow: [-0.35, 0, 0],
    lWrist: [0, 0, w * 0.3],
    rWrist: [0, 0, -w * 0.3],
  };
}

export function laugh(t: number, ph = 0, intensity = 1): Pose {
  const b = idle(t, ph);
  const h = sin(t * 13 + ph) * intensity; // belly laugh shake
  return {
    ...b,
    lift: Math.abs(h) * 0.012,
    spine: [-0.18 * intensity + h * 0.05, 0, 0],
    neck: [-0.1 * intensity, 0, 0],
    head: [-0.35 * intensity + h * 0.08, 0, 0],
    lShoulder: [-0.55, 0, 0.25],
    rShoulder: [-0.55, 0, -0.25],
    lElbow: [-1.55, 0, 0],
    rElbow: [-1.55, 0, 0],
  };
}

/** Laughing so hard he wipes a tear with the right hand. */
export function laughCry(t: number, ph = 0): Pose {
  const l = laugh(t, ph, 1.15);
  const wipe = sin(t * 5) * 0.12;
  return {
    ...l,
    head: [-0.1 + wipe * 0.3, -0.15, 0.08],
    rShoulder: [-1.15, 0, -0.55],
    rElbow: [-2.35 + wipe, 0, 0],
    rWrist: [0, 0, 0.4],
  };
}

/** Hand to the temple: "smart". */
export function tapHead(t: number, ph = 0): Pose {
  const b = idle(t, ph);
  const tap = Math.max(0, sin(t * 7)) * 0.08;
  return {
    ...b,
    head: [0.0, -0.2, 0.08],
    rShoulder: [-1.25, 0, -0.75],
    rElbow: [-2.35 - tap, 0, 0],
    rWrist: [0, 0, 0.3],
    lShoulder: [0.0, 0, 0.18],
    lElbow: [-0.5, 0, 0],
  };
}

/** Hands cupped around the mouth, yelling. */
export function yell(t: number, ph = 0): Pose {
  const b = idle(t, ph);
  const push = Math.max(0, sin(t * 4)) * 0.06;
  return {
    ...b,
    spine: [-0.12 - push, 0, 0],
    head: [-0.22 - push, 0, 0],
    lShoulder: [-1.25, 0, 0.42],
    rShoulder: [-1.25, 0, -0.42],
    lElbow: [-2.15, 0, 0],
    rElbow: [-2.15, 0, 0],
  };
}

export function shrug(t: number, ph = 0, amount = 1): Pose {
  const b = idle(t, ph);
  const s = amount;
  return {
    ...b,
    head: [0.05, 0, 0.18 * s],
    spine: [0, 0, 0],
    lShoulder: [-0.25 * s, 0, 0.45 * s],
    rShoulder: [-0.25 * s, 0, -0.45 * s],
    lElbow: [-1.35 * s, 0, 0],
    rElbow: [-1.35 * s, 0, 0],
    lWrist: [0, 0, 0.5 * s],
    rWrist: [0, 0, -0.5 * s],
  };
}

export function pointForward(t: number, ph = 0): Pose {
  const b = idle(t, ph);
  return { ...b, rShoulder: [-1.5, 0, -0.1], rElbow: [-0.05, 0, 0], head: [-0.05, 0, 0] };
}

/** Sitting on a ledge, elbows on knees, head down. Root sits at the ledge height. */
export function sitSad(t: number, ph = 0): Pose {
  const br = sin(t * 1.2 + ph);
  return {
    lift: -0.48,
    spine: [0.38 + br * 0.01, 0, 0],
    neck: [0.2, 0, 0],
    head: [0.35, 0, 0],
    lHip: [-1.5, 0, 0.12],
    rHip: [-1.5, 0, -0.12],
    lKnee: [1.45, 0, 0],
    rKnee: [1.45, 0, 0],
    lShoulder: [-0.75, 0, 0.12],
    rShoulder: [-0.75, 0, -0.12],
    lElbow: [-0.9, 0, 0],
    rElbow: [-0.9, 0, 0],
  };
}

/** Guard holding a spear upright in the right hand. */
export function guardStand(t: number, ph = 0): Pose {
  const b = idle(t, ph);
  return {
    ...b,
    spine: [0, 0, 0],
    head: [-0.05, b.head![1], 0],
    rShoulder: [-0.25, 0, -0.18],
    rElbow: [-1.35, 0, 0],
    rWrist: [0, 0, 0],
    lShoulder: [0.05, 0, 0.12],
    lElbow: [-0.3, 0, 0],
  };
}

/** Walking with a heavy sack hanging from the right hand. */
export function carrySack(t: number, rate = 1, ph = 0): Pose {
  const w = walk(t, rate, ph);
  return {
    ...w,
    spine: [0.08, w.spine![1] * 0.5, 0.06],
    rShoulder: [-0.12 + (w.rShoulder![0] ?? 0) * 0.2, 0, -0.22],
    rElbow: [-0.3, 0, 0],
    rWrist: [0, 0, 0],
  };
}

/** Linear blend between two poses (t = 0 -> a, 1 -> b). */
export function blend(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Pose>;
  for (const k of keys) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === "number" || typeof vb === "number") {
      (out as Record<string, number>)[k] = ((va as number) ?? 0) * (1 - t) + ((vb as number) ?? 0) * t;
    } else if (k === "pos") {
      const pa = (va as Joint) ?? (vb as Joint);
      const pb = (vb as Joint) ?? (va as Joint);
      out.pos = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t];
    } else {
      const ja = (va as Joint) ?? [0, 0, 0];
      const jb = (vb as Joint) ?? [0, 0, 0];
      (out as Record<string, Joint>)[k] = [ja[0] + (jb[0] - ja[0]) * t, ja[1] + (jb[1] - ja[1]) * t, ja[2] + (jb[2] - ja[2]) * t];
    }
  }
  return out;
}

/** Add head/neck turn on top of any pose (look at camera, glance...). */
export function withHead(p: Pose, yaw: number, pitch = 0): Pose {
  const h = p.head ?? [0, 0, 0];
  return { ...p, head: [h[0] + pitch, h[1] + yaw, h[2]] };
}
