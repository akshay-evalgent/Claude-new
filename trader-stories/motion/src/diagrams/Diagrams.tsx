import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, easeInOut, font, prog, rand, sec, SAFE, tone, Tone } from "../theme";
import { Frame } from "../components/Frame";
import { Counter, Rise } from "../components/Text";

const Title: React.FC<{ text?: string; sub?: string }> = ({ text, sub }) => text ? (
  <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y - 10 }}>
    <Rise style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 50, color: C.paper, letterSpacing: 2 }}>{text}</Rise>
    {sub ? <Rise at={6} style={{ fontFamily: font("mono"), fontSize: 22, color: C.muted, marginTop: 6 }}>{sub}</Rise> : null}
  </div>
) : null;

// ---------------------------------------------------------------- Daily limit
export type Day = "up" | "fall" | "down" | "flat";
export type LimitProps = {
  days: Day[];
  label?: string;                 // text on the first limit line, e.g. "+10% DAILY LIMIT"
  title?: string;
  drawFor?: number;               // seconds to draw all days
  startDrawn?: number;            // days already drawn when the shot starts (continuity between shots)
  marks?: { day: number; text: string; tone?: Tone }[];
};

export const LimitDiagram: React.FC<LimitProps> = ({ days, label, title, drawFor, startDrawn = 0, marks = [] }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const box = { x: SAFE.x + 60, y: 270, w: 1920 - 2 * SAFE.x - 120, h: 600 };
  const N = days.length;
  const dayW = box.w / Math.max(N, 3);
  if (N < 3) box.x += (box.w - dayW * N) / 2;
  // price path, 40 samples a day
  type P = { x: number; v: number; day: number };
  const pts: P[] = [];
  const limits: { day: number; v: number; dir: 1 | -1 }[] = [];
  let p = 100;
  days.forEach((kind, d) => {
    const start = p;
    const target = kind === "up" ? start * 1.1 : kind === "down" || kind === "fall" ? start * 0.9 : start;
    if (kind === "up") limits.push({ day: d, v: target, dir: 1 });
    if (kind === "down") limits.push({ day: d, v: target, dir: -1 });
    const hitAt = kind === "fall" || kind === "flat" ? 1 : 0.28 + rand(d + 1) * 0.15;
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      let v: number;
      if (t >= hitAt) v = target;
      else {
        const k = t / hitAt;
        const noise = (rand(d * 100 + i) - 0.5) * Math.abs(target - start) * 0.35 * (1 - k);
        v = start + (target - start) * Math.pow(k, kind === "fall" ? 1 : 0.8) + noise;
      }
      pts.push({ x: box.x + (d + t) * dayW, v, day: d });
    }
    p = target;
  });
  const vals = pts.map((q) => q.v);
  const lo = Math.min(...vals) * 0.97, hi = Math.max(...vals) * 1.04;
  const fy = (v: number) => box.y + box.h - ((v - lo) / (hi - lo)) * box.h;
  const total = drawFor ? sec(drawFor) : Math.max(sec(1), durationInFrames - sec(1.5));
  const pr = interpolate(frame, [sec(0.3), sec(0.3) + total], [startDrawn / N, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const headX = box.x + pr * N * dayW;
  const shown = pts.filter((q) => q.x <= headX);
  const last = shown[shown.length - 1] ?? pts[0];
  const d = "M" + shown.map((q) => `${q.x.toFixed(1)},${fy(q.v).toFixed(1)}`).join("L");
  const lastDay = days[Math.min(N - 1, Math.floor(pr * N - 1e-6))];
  const col = lastDay === "fall" || lastDay === "down" ? C.loss : C.gain;
  return (
    <Frame>
      <Title text={title} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {days.map((_, i) => (
          <g key={i}>
            <line x1={box.x + i * dayW} x2={box.x + i * dayW} y1={box.y - 30} y2={box.y + box.h} stroke={C.line} strokeWidth={1} strokeDasharray="2 8" />
            <text x={box.x + (i + 0.5) * dayW} y={box.y + box.h + 50} textAnchor="middle" fill={C.muted} fontFamily={font("mono")} fontSize={22}>DAY {i + 1}</text>
          </g>
        ))}
        {limits.filter((l) => box.x + l.day * dayW <= headX).map((l, i) => (
          <g key={i}>
            <line x1={box.x + l.day * dayW} x2={box.x + (l.day + 1) * dayW} y1={fy(l.v)} y2={fy(l.v)} stroke={C.ochre} strokeWidth={4} strokeDasharray="16 10" />
            {i === 0 && label ? <text x={box.x + l.day * dayW + 10} y={fy(l.v) + (l.dir > 0 ? -22 : 46)} fill={C.ochre} fontFamily={font("mono")} fontWeight={600} fontSize={28}>{label}</text> : null}
          </g>
        ))}
        {days.map((kind, di) => {
          const seg = shown.filter((q) => q.day === di || (q.day === di - 1 && q === shown.filter((s) => s.day === di - 1).slice(-1)[0]));
          if (seg.length < 2) return null;
          const c = kind === "fall" || kind === "down" ? C.loss : kind === "up" ? C.gain : C.paper;
          return <path key={di} d={"M" + seg.map((q) => `${q.x.toFixed(1)},${fy(q.v).toFixed(1)}`).join("L")} fill="none" stroke={c} strokeWidth={5} strokeLinejoin="round" />;
        })}
        <circle cx={last.x} cy={fy(last.v)} r={9} fill={col} />
        {marks.filter((m) => box.x + (m.day + 0.15) * dayW <= headX).map((m, i) => {
          const q = pts[m.day * 41 + 6];
          return (
            <g key={i}>
              <line x1={q.x} x2={q.x} y1={fy(q.v) + 20} y2={fy(q.v) + 90} stroke={tone(m.tone, C.paper)} strokeWidth={2} />
              <text x={q.x} y={fy(q.v) + 124} textAnchor="middle" fill={tone(m.tone, C.paper)} fontFamily={font("mono")} fontWeight={600} fontSize={24}>{m.text}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
};

// ---------------------------------------------------------------- Order queue
// A stock pinned at its limit: a tall stack of buy orders, no sellers, and a queue that waits for tomorrow.
export type QueueProps = { queue?: boolean; title?: string; people?: number };
const Person: React.FC<{ x: number; y: number; o: number; s?: number }> = ({ x, y, o, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <circle cx={0} cy={-46} r={11} fill={C.paperDim} />
    <rect x={-13} y={-32} width={26} height={34} rx={9} fill={C.paperDim} />
  </g>
);
export const OrderQueue: React.FC<QueueProps> = ({ queue = false, title, people = 34 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const ceilY = 290, baseY = 860, colX = 1260, colW = 190;
  const blocks = 12;
  const blockH = (baseY - ceilY) / blocks;
  return (
    <Frame>
      <Title text={title} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line x1={900} x2={1800} y1={ceilY} y2={ceilY} stroke={C.ochre} strokeWidth={4} strokeDasharray="16 10" opacity={prog(frame, 0, 15)} />
        <text x={1800} y={ceilY - 22} textAnchor="end" fill={C.ochre} fontFamily={font("mono")} fontWeight={600} fontSize={26}>+10% LIMIT</text>
        {Array.from({ length: blocks }, (_, i) => {
          const o = queue ? 1 : prog(frame, sec(0.3) + i * 3, 8);
          const y = baseY - (i + 1) * blockH;
          return <rect key={i} x={colX} y={y + 3 + (1 - o) * -40} width={colW} height={blockH - 6} fill={C.gain} opacity={o * (0.55 + 0.45 * (i / blocks))} />;
        })}
        <text x={colX + colW / 2} y={baseY + 50} textAnchor="middle" fill={C.paper} fontFamily={font("mono")} fontWeight={600} fontSize={26}>BUY</text>
        <rect x={colX + colW + 60} y={baseY - 6} width={colW} height={6} fill={C.line} />
        <text x={colX + colW * 1.5 + 60} y={baseY + 50} textAnchor="middle" fill={C.paper} fontFamily={font("mono")} fontWeight={600} fontSize={26}>SELL</text>
        <text x={colX + colW * 1.5 + 60} y={baseY - 40} textAnchor="middle" fill={C.muted} fontFamily={font("mono")} fontSize={22} opacity={prog(frame, sec(1.0), 15)}>NO SELLERS</text>
        {queue ? Array.from({ length: people }, (_, i) => {
          const at = sec(0.4) + (i / people) * (durationInFrames - sec(1.4));
          const o = prog(frame, at, 10);
          const x = colX - 60 - i * 46 + (rand(i) - 0.5) * 10;
          return <Person key={i} x={x - (1 - o) * 40} y={baseY + (rand(i + 50) - 0.5) * 8} o={o} s={0.95 + rand(i + 9) * 0.15} />;
        }) : null}
        {queue ? <text x={colX - 80} y={baseY + 70} textAnchor="end" fill={C.muted} fontFamily={font("mono")} fontSize={24} opacity={prog(frame, sec(1.4), 15)}>WAITING FOR TOMORROW</text> : null}
      </svg>
    </Frame>
  );
};

// ---------------------------------------------------------------- Step flow
export type Step = { label: string; sub?: string };
export type StepRow = { title?: string; steps: Step[]; upTo: number };
export type StepFlowProps = {
  steps?: Step[]; upTo?: number;     // single row: show steps 0..upTo, animate upTo in
  rows?: StepRow[];                  // compare: rows stacked, everything shown
  layout?: "row" | "loop";
  centre?: string;                   // loop centre label
  title?: string; sub?: string;
  animateAll?: boolean;              // animate every visible step in (first appearance of the diagram)
  animateFrom?: number;              // steps from this index on animate in, one after another (default: only upTo)
};

const StepBox: React.FC<{ n: number; step: Step; x: number; y: number; w: number; o: number; active: boolean; dim: boolean; compact?: boolean; above?: boolean }> = ({ n, step, x, y, w, o, active, dim, compact, above }) => (
  <div style={{ position: "absolute", left: x - w / 2, ...(above ? { bottom: 1080 - y - (compact ? 58 : 76) } : { top: y }), width: w, opacity: o * (dim ? 0.5 : 1), transform: `translateY(${(1 - o) * 30}px)`, textAlign: "center", display: "flex", flexDirection: above ? "column-reverse" : "column" }}>
    <div style={{ width: compact ? 58 : 76, height: compact ? 58 : 76, margin: "0 auto", borderRadius: 99, border: `3px solid ${active ? C.ochre : C.line}`, display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: font("display"), fontWeight: 700, fontSize: compact ? 30 : 40, color: active ? C.ochre : C.paper, background: C.ink }}>{n}</div>
    <div style={{ fontFamily: font("sans"), fontWeight: 600, fontSize: compact ? 28 : 34, color: C.paper, margin: above ? "0 0 18px" : "20px 0 0", lineHeight: 1.2 }}>{step.label}</div>
    {step.sub ? <div style={{ fontFamily: font("mono"), fontSize: compact ? 20 : 25, color: C.muted, marginTop: 10, lineHeight: 1.3 }}>{step.sub}</div> : null}
  </div>
);

export const StepFlow: React.FC<StepFlowProps> = ({ steps = [], upTo = steps.length - 1, rows, layout = "row", centre, title, sub, animateAll, animateFrom }) => {
  const frame = useCurrentFrame();
  const from = animateAll ? 0 : animateFrom ?? upTo;
  const appearAt = (i: number, _last: number) => (i >= from ? sec(0.25) + (i - from) * sec(0.45) : -100);

  const renderRow = (list: Step[], last: number, y: number, compact: boolean, key: string, allShown: boolean) => {
    const n = list.length;
    const span = 1920 - 2 * SAFE.x - 100;
    const w = Math.min(330, span / n - 20);
    const xs = list.map((_, i) => SAFE.x + 50 + (span / n) * (i + 0.5));
    return (
      <React.Fragment key={key}>
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
          {xs.slice(1).map((x, i) => {
            if (i + 1 > last) return null;
            const o = allShown ? prog(frame, sec(0.3) + (i + 1) * sec(0.35) - 6, 12) : i + 1 >= from ? prog(frame, appearAt(i + 1, last) - 8, 14) : 1;
            const x0 = xs[i] + (compact ? 40 : 50), x1 = x - (compact ? 40 : 50);
            const cy = y + (compact ? 29 : 38);
            return (
              <g key={i} opacity={Math.max(o, 0)}>
                <line x1={x0} x2={x0 + (x1 - x0) * o} y1={cy} y2={cy} stroke={C.line} strokeWidth={3} />
                {o > 0.9 ? <path d={`M${x1 - 12},${cy - 9}L${x1},${cy}L${x1 - 12},${cy + 9}`} fill="none" stroke={C.line} strokeWidth={3} /> : null}
              </g>
            );
          })}
        </svg>
        {list.map((s, i) => i <= last ? (
          <StepBox key={i} n={i + 1} step={s} x={xs[i]} y={y} w={w} compact={compact}
            o={allShown ? prog(frame, sec(0.3) + i * sec(0.35), 14) : i >= from ? prog(frame, appearAt(i, last), 16) : 1}
            active={!allShown && i === last} dim={!allShown && i < last} />
        ) : null)}
      </React.Fragment>
    );
  };

  if (rows) {
    return (
      <Frame>
        <Title text={title} sub={sub} />
        {rows.map((r, ri) => (
          <React.Fragment key={ri}>
            <div style={{ position: "absolute", left: SAFE.x, top: 300 + ri * 330, fontFamily: font("mono"), fontWeight: 600, fontSize: 24, letterSpacing: 3, color: C.ochre, opacity: prog(frame, ri * 10, 14) }}>{r.title}</div>
            {renderRow(r.steps, r.upTo, 350 + ri * 330, true, `r${ri}`, true)}
          </React.Fragment>
        ))}
      </Frame>
    );
  }

  if (layout === "loop") {
    const n = steps.length, R = 330, cx = 960, cy = 590;
    const pos = steps.map((_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
    return (
      <Frame>
        <Title text={title} sub={sub} />
        <svg width={1920} height={1080} style={{ position: "absolute" }}>
          {pos.map((_, i) => {
            if (i + 1 > upTo && !(i === n - 1 && upTo === n - 1)) return null;
            const a0 = -Math.PI / 2 + (i / n) * Math.PI * 2 + 0.32, a1 = -Math.PI / 2 + ((i + 1) / n) * Math.PI * 2 - 0.32;
            const o = i + 1 >= from || (i === n - 1 && upTo === n - 1) ? prog(frame, appearAt(Math.min(i + 1, n - 1), upTo) - 8, 16) : 1;
            const am = a0 + (a1 - a0) * o;
            const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(am), cy + R * Math.sin(am)];
            return (
              <g key={i}>
                <path d={`M${p0[0]},${p0[1]} A${R},${R} 0 0 1 ${p1[0]},${p1[1]}`} fill="none" stroke={C.line} strokeWidth={3} />
                {o > 0.9 ? <circle cx={p1[0]} cy={p1[1]} r={7} fill={C.line} /> : null}
              </g>
            );
          })}
        </svg>
        {centre ? <div style={{ position: "absolute", left: cx - 200, width: 400, top: cy - 36, textAlign: "center", fontFamily: font("display"), fontWeight: 700, fontSize: 60, color: C.ochre, letterSpacing: 4, opacity: prog(frame, 0, 15) }}>{centre}</div> : null}
        {steps.map((s, i) => i <= upTo ? (
          <StepBox key={i} n={i + 1} step={s} x={pos[i][0]} y={pos[i][1] - 29} w={340} compact above={pos[i][1] > cy + 10}
            o={i >= from ? prog(frame, appearAt(i, upTo), 14) : 1} active={i === upTo} dim={i < upTo} />
        ) : null)}
      </Frame>
    );
  }

  return (
    <Frame>
      <Title text={title} sub={sub} />
      {renderRow(steps, upTo, 430, false, "row", !!animateAll)}
    </Frame>
  );
};

// ---------------------------------------------------------------- Node web
export type NodeWebProps = { count: number; centre: string; counterLabel?: string; highlight?: { indices: number[]; label: string; at?: number }; title?: string; fillFor?: number };
export const NodeWeb: React.FC<NodeWebProps> = ({ count, centre, counterLabel, highlight, title, fillFor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const cx = 960, cy = 580;
  const fill = fillFor ? sec(fillFor) : durationInFrames * 0.7;
  const nodes = Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996; const r = 150 + 50 * Math.sqrt(i + 1) * 1.05;
    return { x: cx + r * Math.cos(a) * 1.5, y: cy + r * Math.sin(a) * 0.95, at: sec(0.3) + (i / count) * fill };
  });
  const hl = new Set(highlight?.indices ?? []);
  const hp = highlight ? prog(frame, sec(highlight.at ?? 0.3), 18) : 0;
  const shown = nodes.filter((n) => frame >= n.at).length;
  return (
    <Frame>
      <Title text={title} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {nodes.map((n, i) => {
          const o = prog(frame, n.at, 10);
          const isH = hl.has(i);
          return <line key={`e${i}`} x1={cx} y1={cy} x2={cx + (n.x - cx) * o} y2={cy + (n.y - cy) * o} stroke={isH && hp > 0 ? C.ochre : C.line} strokeWidth={isH ? 2 + hp * 2 : 1.2} opacity={hl.size && !isH ? 1 - hp * 0.6 : 0.9} />;
        })}
        {nodes.map((n, i) => {
          const o = prog(frame, n.at, 10);
          const isH = hl.has(i);
          return <circle key={i} cx={n.x} cy={n.y} r={(isH ? 13 + hp * 6 : 11) * o} fill={isH && hp > 0 ? C.ochre : C.slate} stroke={C.paperDim} strokeWidth={1.5} opacity={hl.size && !isH ? 1 - hp * 0.5 : 1} />;
        })}
        <circle cx={cx} cy={cy} r={86} fill={C.ink} stroke={C.ochre} strokeWidth={4} />
        <text x={cx} y={cy + 18} textAnchor="middle" fill={C.ochre} fontFamily={font("display")} fontWeight={700} fontSize={48} letterSpacing={3}>{centre}</text>
      </svg>
      {counterLabel ? (
        <div style={{ position: "absolute", right: SAFE.x, top: SAFE.y - 10, textAlign: "right" }}>
          <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 96, color: C.paper, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{shown}</div>
          <div style={{ fontFamily: font("mono"), fontSize: 24, color: C.muted, letterSpacing: 3 }}>{counterLabel}</div>
        </div>
      ) : null}
      {highlight ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y, fontFamily: font("mono"), fontWeight: 600, fontSize: 30, color: C.ochre, opacity: hp }}>{highlight.label}</div> : null}
    </Frame>
  );
};

// ---------------------------------------------------------------- Cycle wave
// The business cycle as a drawn wave, peaks labelled BOOM and troughs BUST.
export type CycleWaveProps = { title?: string; cycles?: number; drawFor?: number };
export const CycleWave: React.FC<CycleWaveProps> = ({ title, cycles = 2.5, drawFor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const x0 = SAFE.x + 40, x1 = 1920 - SAFE.x - 40, mid = 600, amp = 190;
  const total = drawFor ? sec(drawFor) : Math.max(sec(1.5), durationInFrames - sec(1.2));
  const pr = interpolate(frame, [sec(0.3), sec(0.3) + total], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
  const N = 400;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const k = i / N;
    return [x0 + (x1 - x0) * k, mid - amp * Math.sin(k * cycles * Math.PI * 2)] as const;
  });
  const shown = pts.slice(0, Math.max(2, Math.floor(N * pr) + 1));
  const d = "M" + shown.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("L");
  const extremes: { k: number; boom: boolean }[] = [];
  for (let j = 0; j < cycles * 2; j++) extremes.push({ k: (j + 0.5) / (cycles * 2), boom: j % 2 === 0 });
  const head = shown[shown.length - 1];
  return (
    <Frame>
      <Title text={title} />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <line x1={x0} x2={x1} y1={mid} y2={mid} stroke={C.line} strokeWidth={1.5} strokeDasharray="4 10" />
        <path d={d} fill="none" stroke={C.paper} strokeWidth={5} strokeLinecap="round" />
        <circle cx={head[0]} cy={head[1]} r={9} fill={C.paper} />
        {extremes.filter((e) => e.k <= pr).map((e, i) => {
          const x = x0 + (x1 - x0) * e.k, y = mid - amp * (e.boom ? 1 : -1);
          return (
            <text key={i} x={x} y={y + (e.boom ? -36 : 64)} textAnchor="middle" fill={e.boom ? C.gain : C.loss}
              fontFamily={font("display")} fontWeight={700} fontSize={48} letterSpacing={4} opacity={Math.min(1, (pr - e.k) * 12)}>
              {e.boom ? "BOOM" : "BUST"}
            </text>
          );
        })}
      </svg>
    </Frame>
  );
};
