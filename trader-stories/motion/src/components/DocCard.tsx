import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, font, prog, rand, sec, SAFE } from "../theme";
import { Frame } from "./Frame";
import { Tag } from "./Cards";

// Documents are reset in house type on a plain sheet. They never imitate a
// real masthead, website or app. Body copy that is not quoted is shown as
// grey bars ("greeked"), so nothing reads as an invented document.

type Row = { label: string; value: string };
type Bubble = { text: string };
export type DocProps = {
  kind: "notice" | "headline" | "register" | "list" | "bubbles" | "phones";
  header?: string;            // small line at the top of the sheet, e.g. "NINGBO HIGHWAY POLICE · 10:33"
  cjk?: string;               // Chinese headline
  title?: string;             // English headline or translation
  body?: string;              // notice: a smaller paraphrase under the title
  rows?: Row[];               // register
  lines?: number;             // greeked lines (list, headline)
  redact?: boolean;           // list: black out the lines one by one
  redactDone?: boolean;       // list: start with every line already blacked out
  bubbles?: Bubble[];         // bubbles: short paraphrased reactions
  stamp?: { text: string; at?: number; tone?: "loss" | "ochre" };
  tag?: string;
  source?: string;            // bottom-left caption on the frame, e.g. "Source: Caixin"
};

const Greek: React.FC<{ w: number; h?: number; o?: number; dark?: boolean }> = ({ w, h = 14, o = 1, dark = true }) => (
  <div style={{ width: `${w}%`, height: h, borderRadius: 3, background: dark ? "rgba(27,27,26,0.18)" : "rgba(236,229,211,0.22)", opacity: o }} />
);

const Sheet: React.FC<{ width?: number; children: React.ReactNode }> = ({ width = 1180, children }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, 0, 26);
  return (
    <div style={{
      width, background: C.sheet, color: C.sheetInk, padding: "64px 80px", borderRadius: 4,
      boxShadow: "0 40px 90px rgba(0,0,0,0.55)", transform: `translateY(${(1 - p) * 140}px) rotate(${(1 - p) * 2 - 0.6}deg)`, opacity: p,
      backgroundImage: "radial-gradient(rgba(0,0,0,0.035) 1px, transparent 1px)", backgroundSize: "5px 5px",
    }}>
      {children}
    </div>
  );
};

export const DocCard: React.FC<DocProps> = (props) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = props.kind;
  let body: React.ReactNode = null;

  if (k === "notice" || k === "headline" || k === "register" || k === "list") {
    const n = props.lines ?? (k === "list" ? 9 : 6);
    body = (
      <Sheet width={k === "list" ? 980 : 1240}>
        {props.header ? <div style={{ fontFamily: font("mono"), fontSize: 22, letterSpacing: 3, color: "rgba(27,27,26,0.65)", borderBottom: "2px solid rgba(27,27,26,0.6)", paddingBottom: 18, marginBottom: 36 }}>{props.header}</div> : null}
        {props.cjk ? <div style={{ fontFamily: font("cjk"), fontWeight: 700, fontSize: 104, letterSpacing: 8, lineHeight: 1.1, opacity: prog(frame, 10, 14), transform: `scale(${1.12 - 0.12 * prog(frame, 10, 14)})`, transformOrigin: "left center" }}>{props.cjk}</div> : null}
        {props.title ? <div style={{ fontFamily: k === "notice" ? font("serif") : font("display"), fontWeight: k === "notice" ? 600 : 700, fontSize: k === "notice" ? 64 : 58, lineHeight: 1.15, marginTop: props.cjk ? 18 : 0, letterSpacing: k === "notice" ? 0 : 2, opacity: prog(frame, 18, 16) }}>{props.title}</div> : null}
        {props.body ? <div style={{ fontFamily: font("sans"), fontSize: 34, lineHeight: 1.35, marginTop: 28, color: "rgba(27,27,26,0.75)", opacity: prog(frame, 28, 16) }}>{props.body}</div> : null}
        {k === "register" ? (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", rowGap: 26, marginTop: props.title ? 40 : 0 }}>
            {(props.rows ?? []).map((r, i) => (
              <React.Fragment key={i}>
                <div style={{ fontFamily: font("mono"), fontSize: 24, letterSpacing: 2, color: "rgba(27,27,26,0.6)", opacity: prog(frame, 14 + i * 12, 12) }}>{r.label.toUpperCase()}</div>
                <div style={{ fontFamily: font("display"), fontWeight: 500, fontSize: 46, opacity: prog(frame, 18 + i * 12, 12) }}>{r.value}</div>
              </React.Fragment>
            ))}
          </div>
        ) : null}
        {k === "headline" || k === "list" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: k === "list" ? 26 : 18, marginTop: 44 }}>
            {Array.from({ length: n }, (_, i) => {
              const w = k === "list" ? 45 + rand(i + 3) * 40 : 70 + rand(i) * 30;
              const redactAt = sec(0.9) + i * 5;
              const r = props.redactDone ? 1 : props.redact ? prog(frame, redactAt, 8) : 0;
              return (
                <div key={i} style={{ position: "relative", display: "flex", gap: 22, alignItems: "center", opacity: prog(frame, 14 + i * 2, 10) }}>
                  {k === "list" ? <div style={{ fontFamily: font("mono"), fontSize: 22, width: 44, color: "rgba(27,27,26,0.55)" }}>{String(i + 1).padStart(2, "0")}</div> : null}
                  <Greek w={w} h={k === "list" ? 18 : 14} />
                  {props.redact || props.redactDone ? <div style={{ position: "absolute", left: 60, top: -8, height: 34, width: `${w * r * 0.9}%`, background: C.sheetInk }} /> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </Sheet>
    );
  }

  if (k === "bubbles") {
    const list = props.bubbles ?? [];
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 1100 }}>
        {list.map((b, i) => {
          const p = prog(frame, sec(0.3) + i * sec(0.55), 14);
          const right = i % 2 === 1;
          return (
            <div key={i} style={{ alignSelf: right ? "flex-end" : "flex-start", maxWidth: 820, opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.96 + 0.04 * p})`,
              background: right ? C.slate : C.sheet, color: right ? C.paper : C.sheetInk, padding: "22px 30px", borderRadius: 26,
              fontFamily: font("sans"), fontSize: 38, lineHeight: 1.3, boxShadow: "0 16px 40px rgba(0,0,0,0.4)" }}>
              {b.text}
            </div>
          );
        })}
      </div>
    );
  }

  if (k === "phones") {
    // One post spreading: 1, then 4, then 16 phones.
    const stages = [1, 4, 16];
    const st = frame < sec(1.0) ? 0 : frame < sec(2.0) ? 1 : 2;
    const n = stages[st];
    const cols = Math.ceil(Math.sqrt(n));
    const size = 820 / cols;
    body = (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size * 0.56}px)`, gap: 26 / cols + 8 }}>
        {Array.from({ length: n }, (_, i) => {
          const p = prog(frame, (st === 0 ? 0 : sec(st)) + i * 2, 10);
          return (
            <div key={`${st}-${i}`} style={{ height: size, borderRadius: 34 / cols + 6, border: `${4 / Math.sqrt(cols)}px solid ${C.line}`, background: C.ink2, padding: 18 / cols + 6, display: "flex", flexDirection: "column", gap: 12 / cols + 4, opacity: p, transform: `scale(${0.9 + 0.1 * p})` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ width: 30 / cols + 10, height: 30 / cols + 10, borderRadius: 99, background: C.slate }} />
                <Greek w={50} h={8 / cols + 6} dark={false} />
              </div>
              {[90, 80, 95, 60].map((w, j) => <Greek key={j} w={w} h={8 / cols + 5} dark={false} o={0.9} />)}
            </div>
          );
        })}
      </div>
    );
  }

  const st = props.stamp;
  const sp = st ? prog(frame, sec(st.at ?? 1.2), 8) : 0;
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0.0], { extrapolateLeft: "clamp" });
  return (
    <Frame>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out }}>
        {body}
        {st && sp > 0 ? (
          <div style={{ position: "absolute", right: 330, bottom: 300, transform: `rotate(-9deg) scale(${1.6 - 0.6 * sp})`, opacity: Math.min(1, sp * 2) * 0.92, background: "rgba(230,222,201,0.0)",
            border: `7px solid ${st.tone === "ochre" ? C.ochre : C.loss}`, color: st.tone === "ochre" ? C.ochre : C.loss,
            fontFamily: font("display"), fontWeight: 700, fontSize: 84, letterSpacing: 6, padding: "6px 30px" }}>
            {st.text}
          </div>
        ) : null}
      </AbsoluteFill>
      {props.tag ? <Tag text={props.tag} /> : null}
      {props.source ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 40, fontFamily: font("mono"), fontSize: 22, color: C.muted, letterSpacing: 1 }}>{props.source}</div> : null}
    </Frame>
  );
};
