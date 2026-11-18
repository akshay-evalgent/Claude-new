import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, font } from "../../theme";

// YouTube thumbnails, 1280x720. A face and four words at most; readable at phone size.
export type ThumbProps = { image: string; kicker: string; big: string; bigTone: "gain" | "paper" | "loss"; sub: string; focusX?: number; shift?: number };
export const Thumbnail: React.FC<ThumbProps> = ({ image, kicker, big, bigTone, sub, focusX = 70, shift = 0 }) => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Img src={staticFile(`frames/${image}.jpg`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${focusX}% 40%`, filter: "contrast(1.08) saturate(1.05)", transform: shift ? `translateX(${shift}%) scale(${1 + Math.abs(shift) / 60})` : undefined }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(14,15,17,0.96) 0%, rgba(14,15,17,0.85) 38%, rgba(14,15,17,0.0) 70%)" }} />
    <div style={{ position: "absolute", left: 56, top: 140, width: 640 }}>
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 64, color: C.paper, letterSpacing: 2, lineHeight: 1 }}>{kicker}</div>
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: big.length > 4 ? 170 : 210, lineHeight: 0.95, color: bigTone === "gain" ? C.gain : bigTone === "loss" ? C.loss : C.paper, letterSpacing: 1, marginTop: 6 }}>{big}</div>
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 64, color: C.paper, letterSpacing: 2, marginTop: 6 }}>{sub}</div>
    </div>
    <div style={{ position: "absolute", left: 56, bottom: 40, fontFamily: font("mono"), fontWeight: 600, fontSize: 22, letterSpacing: 4, color: C.ochre, border: `2px solid ${C.ochre}`, padding: "4px 12px", background: "rgba(14,15,17,0.7)" }}>DRAMATISED</div>
  </AbsoluteFill>
);
