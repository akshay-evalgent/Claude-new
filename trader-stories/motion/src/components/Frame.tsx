import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Film grain: a noise texture that changes every frame. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.09 }) => {
  const frame = useCurrentFrame();
  const id = `g${frame % 6}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "overlay", opacity }}>
      <svg width="100%" height="100%">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 6} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{ pointerEvents: "none", background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)` }}
  />
);

export type Ground = "ink" | "board" | "transparent";

/** Every full-frame graphic sits in a Frame so they share ground, vignette and grain. */
export const Frame: React.FC<{ ground?: Ground; children: React.ReactNode }> = ({ ground = "ink", children }) => {
  if (ground === "transparent") return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill style={{ background: ground === "board" ? C.board : C.ink }}>
      {children}
      <Vignette strength={ground === "board" ? 0.65 : 0.5} />
      <Grain opacity={ground === "board" ? 0.14 : 0.09} />
    </AbsoluteFill>
  );
};
