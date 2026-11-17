import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, easeInOut, font, prog, sec, SAFE, tone, Tone } from "../theme";

// The running readout of year and money that stays on screen through the film.
// Render it as one transparent video the length of the film and lay it over everything.
export type ScoreEntry = {
  t: number;            // seconds into the film when this state begins
  year?: string;        // "1993", "SUMMER 2015"
  value?: string;       // "¥30,000,000" (digits roll) or words (crossfade)
  label?: string;       // small line above the value, e.g. "STARTING MONEY"
  tone?: Tone;
  hidden?: boolean;     // hide the board from t until the next entry
};
export type ScoreboardProps = { entries: ScoreEntry[] };

const ROLL = 26; // frames per change

/** Rolls each digit from the old string to the new one, right-aligned, staggered from the right. */
const Odometer: React.FC<{ from: string; to: string; p: number; size: number; color: string }> = ({ from, to, p, size, color }) => {
  const len = Math.max(from.length, to.length);
  const a = from.padStart(len, " ");
  const b = to.padStart(len, " ");
  const lh = size * 1.15;
  return (
    <div style={{ display: "flex", fontFamily: font("mono"), fontWeight: 600, fontSize: size, color, fontVariantNumeric: "tabular-nums", height: lh, overflow: "hidden" }}>
      {[...b].map((ch, i) => {
        const fromCh = a[i];
        const k = len - 1 - i;                      // distance from the right
        const local = Math.max(0, Math.min(1, (p * (1 + len * 0.06) - k * 0.06)));
        const e = easeInOut(local);
        const isD = (c: string) => /[0-9]/.test(c);
        if (isD(ch) && isD(fromCh) && fromCh !== ch) {
          const d0 = +fromCh, d1 = +ch;
          const steps = (d1 - d0 + 10) % 10 || 10;
          const pos = d0 + steps * e;
          return (
            <div key={i} style={{ width: "0.6em", height: lh, position: "relative" }}>
              {[0, 1].map((j) => {
                const digit = (Math.floor(pos) + j) % 10;
                return <div key={j} style={{ position: "absolute", top: (j - (pos % 1)) * lh, height: lh, width: "100%", textAlign: "center" }}>{digit}</div>;
              })}
            </div>
          );
        }
        if (fromCh === ch) return <div key={i} style={{ width: "0.6em", textAlign: "center", whiteSpace: "pre" }}>{ch}</div>;
        return (
          <div key={i} style={{ width: "0.6em", height: lh, position: "relative", whiteSpace: "pre", textAlign: "center" }}>
            <div style={{ position: "absolute", width: "100%", opacity: 1 - e, top: -e * lh * 0.5 }}>{fromCh}</div>
            <div style={{ position: "absolute", width: "100%", opacity: e, top: (1 - e) * lh * 0.5 }}>{ch}</div>
          </div>
        );
      })}
    </div>
  );
};

export const Scoreboard: React.FC<ScoreboardProps> = ({ entries }) => {
  const frame = useCurrentFrame();
  const list = [...entries].sort((x, y) => x.t - y.t);
  let i = -1;
  for (let k = 0; k < list.length; k++) if (frame >= sec(list[k].t)) i = k;
  if (i < 0) return null;
  const cur = list[i];
  const prev = i > 0 ? list[i - 1] : undefined;
  const since = frame - sec(cur.t);
  const p = Math.min(1, since / ROLL);

  // board fades in after a hidden stretch and out at a hidden entry
  const wasHidden = !prev || prev.hidden;
  const vis = cur.hidden ? 1 - prog(frame, sec(cur.t), 12) : wasHidden ? prog(frame, sec(cur.t), 16) : 1;
  if (vis <= 0) return null;
  const shown = cur.hidden ? prev ?? cur : cur;
  const before = wasHidden || cur.hidden ? shown : prev!;
  const pp = wasHidden || cur.hidden ? 1 : p;
  const color = tone(shown.tone);
  const numeric = (s?: string) => !!s && /^[−\-¥$+]?[\d,.]+[%A-Z]*$/.test(s.replace(/\s/g, ""));
  const roll = numeric(before.value) && numeric(shown.value);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.x - 60, bottom: SAFE.y - 30, opacity: vis, display: "flex", gap: 20 }}>
        <div style={{ width: 4, background: C.ochre }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4, background: "rgba(14,15,17,0.55)", padding: "12px 20px 12px 6px" }}>
          <Odometer from={before.year ?? ""} to={shown.year ?? ""} p={pp} size={30} color={C.paper} />
          <div style={{ fontFamily: font("mono"), fontSize: 16, letterSpacing: 3, color: C.muted, height: 22, position: "relative" }}>
            <span style={{ position: "absolute", opacity: pp }}>{shown.label}</span>
            {pp < 1 ? <span style={{ position: "absolute", opacity: 1 - pp }}>{before.label}</span> : null}
          </div>
          {roll ? (
            <Odometer from={before.value!} to={shown.value!} p={pp} size={34} color={color} />
          ) : (
            <div style={{ position: "relative", height: 40, minWidth: 420, fontFamily: font("mono"), fontWeight: 600, fontSize: 34, color }}>
              <span style={{ position: "absolute", opacity: pp, whiteSpace: "nowrap" }}>{shown.value}</span>
              {pp < 1 ? <span style={{ position: "absolute", opacity: 1 - pp, whiteSpace: "nowrap", color: tone(before.tone) }}>{before.value}</span> : null}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
