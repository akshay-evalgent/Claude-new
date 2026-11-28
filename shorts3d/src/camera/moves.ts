import { Easing, interpolate, spring, SpringConfig } from "remotion";

/**
 * Camera language as pure functions of the frame number, so every render is
 * deterministic (Remotion renders frames out of order, in parallel tabs).
 */

export type Vec3 = [number, number, number];

export type CameraPose = {
  position: Vec3;
  target: Vec3;
  fov: number;
  /** Dutch angle in radians. */
  roll?: number;
  /** World point the depth of field should keep sharp. Defaults to `target`. */
  focus?: Vec3;
};

/** Critically damped: glides in and settles with no bounce. Feels like a dolly on rails. */
export const DOLLY: Partial<SpringConfig> = { damping: 200, stiffness: 40, mass: 1.4 };
/** Fast, slightly underdamped: snaps in, overshoots a hair, settles. The "whip". */
export const WHIP: Partial<SpringConfig> = { damping: 16, stiffness: 220, mass: 0.6 };

/** 0 -> 1 spring starting at `startFrame`. */
export function springAt(
  frame: number,
  fps: number,
  startFrame: number,
  config: Partial<SpringConfig> = DOLLY,
  durationInFrames?: number,
) {
  return spring({ frame: frame - startFrame, fps, config, durationInFrames });
}

/** Linear blend a -> b by t (t may overshoot past 1 for spring wobble). */
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth eased 0 -> 1 between two frames (for long, even moves like an orbit). */
export function ease(frame: number, from: number, to: number, easing = Easing.inOut(Easing.cubic)) {
  return interpolate(frame, [from, to], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Point on a horizontal circle around `target`. angle 0 = straight in front (+Z). */
export function orbit(target: Vec3, angle: number, radius: number, height: number): Vec3 {
  return [target[0] + Math.sin(angle) * radius, height, target[2] + Math.cos(angle) * radius];
}

/**
 * Tiny deterministic "operator" drift: a few incommensurate sines, so the
 * camera never feels locked off. amp is in world units.
 */
export function handheld(frame: number, fps: number, amp = 0.006): Vec3 {
  const t = frame / fps;
  return [
    amp * (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.9 + 1.7) * 0.4),
    amp * (Math.sin(t * 1.7 + 0.5) * 0.6 + Math.sin(t * 3.7 + 2.3) * 0.4),
    amp * 0.5 * Math.sin(t * 1.1 + 4.1),
  ];
}

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
