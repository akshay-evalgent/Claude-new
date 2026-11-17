import React from "react";
import { useCurrentFrame } from "remotion";
import { prog } from "../theme";

/** Text that rises into place: offset, fade and a little blur. */
export const Rise: React.FC<{ at?: number; dur?: number; dist?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at = 0, dur = 20, dist = 28, style, children,
}) => {
  const p = prog(useCurrentFrame(), at, dur);
  return (
    <div style={{ ...style, opacity: p, transform: `translateY(${(1 - p) * dist}px)`, filter: `blur(${(1 - p) * 6}px)` }}>
      {children}
    </div>
  );
};

/** Types text on at `cps` characters per second, with a block cursor while typing. */
export const TypeOn: React.FC<{ text: string; at?: number; cps?: number; style?: React.CSSProperties; cursor?: boolean }> = ({
  text, at = 0, cps = 22, style, cursor = true,
}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - at) / 30) * cps)));
  const typing = frame >= at && n < text.length;
  const doneAt = at + Math.ceil((text.length / cps) * 30);
  const blink = Math.floor(frame / 8) % 2 === 0 && frame < doneAt + 24;
  return (
    <div style={style}>
      {text.slice(0, n)}
      {cursor && frame >= at && (typing || blink) ? <span style={{ display: "inline-block", width: "0.08em", height: "0.85em", marginLeft: "0.08em", background: "currentColor", opacity: 0.85, verticalAlign: "-0.05em" }} /> : null}
    </div>
  );
};

/** Counts from `from` to `to` between `at` and `at+dur` frames. */
export const Counter: React.FC<{
  from?: number; to: number; at?: number; dur?: number; prefix?: string; suffix?: string; decimals?: number; style?: React.CSSProperties;
}> = ({ from = 0, to, at = 0, dur = 45, prefix = "", suffix = "", decimals = 0, style }) => {
  const p = prog(useCurrentFrame(), at, dur);
  const v = from + (to - from) * p;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{v < 0 ? "−" : ""}{prefix}{s}{suffix}</span>;
};
