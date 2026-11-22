// LONG (format 1, documentary): "The Lottery That Lost Money to a Shopkeeper"
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, useCue, useShot } from "../../engine";
import { Photo, PhotoSeq, FilmLook, LowerThird, BigFigure, CornerTag, DateLine, DocStamp, DocChapter } from "../../kit/Doc";
import { C, font } from "../../../theme";
import { clamp, out, pop } from "../../kit/style";

const T = timing as unknown as Timing;
export const LOTTERY_FRAMES = T.total;
const F = (id: string) => `frames/lottery/${id}.jpg`;

const Shot: React.FC<{ children: React.ReactNode; tag?: string | false; dark?: number }> = ({ children, tag = "DRAMATISED", dark }) => (
  <AbsoluteFill style={{ background: C.ink }}>{children}<FilmLook dark={dark} />{tag && <CornerTag text={tag} />}</AbsoluteFill>
);
const Caption: React.FC<{ at: number; until?: number; text: string; y?: number; size?: number; color?: string; serif?: boolean }> = ({ at, until, text, y = 0.78, size = 56, color = C.paper, serif }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 12], [0, 1], { ...clamp, easing: out });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 10], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  return <AbsoluteFill style={{ alignItems: "center", pointerEvents: "none" }}>
    <div style={{ position: "absolute", top: `${y * 100}%`, opacity: t * o, transform: `translateY(${(1 - t) * 14}px)`, maxWidth: 1500, textAlign: "center",
      fontFamily: serif ? font("serif") : font("display"), fontStyle: serif ? "italic" : "normal", fontWeight: serif ? 400 : 700, fontSize: size, color, textShadow: "0 3px 20px rgba(0,0,0,0.85)", lineHeight: 1.15 }}>{text}</div>
  </AbsoluteFill>;
};

// ------------------------------------------------------------------ diagrams (dark house style)
const Jar: React.FC<{ x: number; label: string; fill: number; w?: number; h?: number; color?: string }> = ({ x, label, fill, w = 220, h = 300, color = C.gain }) => (
  <g transform={`translate(${x} 0)`}>
    <rect x={-w / 2} y={-h} width={w} height={h} rx={24} fill="rgba(255,255,255,0.04)" stroke={C.paperDim} strokeWidth={4} />
    <rect x={-w / 2 + 8} y={-8 - (h - 16) * Math.min(1, fill)} width={w - 16} height={(h - 16) * Math.min(1, fill)} rx={16} fill={color} opacity={0.85} />
    <text x={0} y={48} textAnchor="middle" fontFamily={font("mono")} fontSize={28} fill={C.paper}>{label}</text>
  </g>
);

const RollDown: React.FC<{ after?: boolean }> = ({ after }) => {
  const cue0 = useCue();
  const cue = (k: string, n = 1) => (after ? -200 : cue0(k, n));
  const f = useCurrentFrame();
  const s = useShot();
  const grow = interpolate(f, [cue("grows") - 4, cue("grows", 2) + 20], [0.25, 0.75], clamp);
  const pass = cue("passed");
  const roll = cue("rolled");
  const big = f < roll ? interpolate(f, [pass, pass + 30], [grow, 1], clamp) : interpolate(f, [roll, roll + 40], [1, 0.1], { ...clamp, easing: out });
  const small = f < roll ? 0.1 : interpolate(f, [roll + 10, roll + 50], [0.1, 0.95], { ...clamp, easing: out });
  const b9 = after ? 0 : 99999;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={1920} height={1080}>
        <text x={960} y={140} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={64} fill={C.paper}>{f < cue("twist") ? "A NORMAL LOTTERY" : "WINFALL'S TWIST"}</text>
        <g transform="translate(0 820)">
          <Jar x={500} label="JACKPOT (6 numbers)" fill={big} w={420} h={520} color={C.ochre} />
          {f >= roll - 4 && <>
            <Jar x={1150} label="5 numbers" fill={small} color={C.gain} />
            <Jar x={1420} label="4 numbers" fill={small * 0.95} color={C.gain} />
            <Jar x={1690} label="3 numbers" fill={small * 0.9} color={C.gain} />
          </>}
        </g>
        {f >= pass && f < roll + 60 && <text x={500} y={215} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={56} fill={C.ochre}>$5 MILLION+</text>}
        {f >= cue("nobody") && f < roll && <text x={500} y={275} textAnchor="middle" fontFamily={font("mono")} fontSize={34} fill={C.paper}>no winner</text>}
        {f >= roll && <path d={`M 720 ${420} C 900 ${300}, 1000 ${320}, ${1150} ${430}`} stroke={C.ochre} strokeWidth={10} fill="none" strokeDasharray="22 14" strokeDashoffset={-f * 3} />}
        {f >= roll && !after && <text x={960} y={300} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={80} fill={C.gain} opacity={interpolate(f, [roll, roll + 10], [0, 1], clamp)}>IT ROLLED DOWN</text>}
        {f >= b9 && <text x={1420} y={930} textAnchor="middle" fontFamily={font("mono")} fontSize={30} fill={C.paperDim}>smaller prizes, suddenly much bigger</text>}
      </svg>
    </AbsoluteFill>
  );
};

const Raffle: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const s = useShot();
  const b = s.beats;
  const ex2 = b[1]?.start ?? 9999, ex3 = b[2]?.start ?? 9999, ex4 = b[3]?.start ?? 9999;
  const prize = f < ex3 ? 50 : interpolate(f, [cue("jumps"), cue("jumps") + 18], [50, 150], clamp);
  const cells = Array.from({ length: 100 });
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={1920} height={1080}>
        <text x={960} y={120} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={60} fill={C.paper}>{f < ex2 ? "THE LOTTERY'S EDGE" : f < ex4 ? "A SIMPLE RAFFLE" : "A ROLL-DOWN WEEK"}</text>
        {f < ex2 && <g>
          <rect x={460} y={300} width={420} height={400} rx={20} fill="rgba(255,255,255,0.04)" stroke={C.paperDim} strokeWidth={4} />
          <rect x={470} y={310} width={400} height={380} rx={14} fill={C.slate} />
          <text x={670} y={760} textAnchor="middle" fontFamily={font("mono")} fontSize={32} fill={C.paper}>money in</text>
          <rect x={1040} y={300} width={420} height={400} rx={20} fill="rgba(255,255,255,0.04)" stroke={C.paperDim} strokeWidth={4} />
          <rect x={1050} y={310 + 380 * 0.45} width={400} height={380 * 0.55} rx={14} fill={C.gain} opacity={0.8} />
          <text x={1250} y={760} textAnchor="middle" fontFamily={font("mono")} fontSize={32} fill={C.paper}>prizes out</text>
          <text x={1250} y={270} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={46} fill={C.ochre} opacity={f > cue("gap") ? 1 : 0}>the gap = lottery's profit</text>
        </g>}
        {f >= ex2 && <g>
          {cells.map((_, i) => {
            const r = Math.floor(i / 10), c = i % 10;
            const on = f > ex2 + 10 + i * 0.6 && (f > cue("every") || i < 1);
            return <rect key={i} x={260 + c * 58} y={220 + r * 58} width={48} height={48} rx={8} fill={on ? C.ochre : C.slate} stroke={C.line} strokeWidth={2} />;
          })}
          <text x={550} y={850} textAnchor="middle" fontFamily={font("mono")} fontSize={32} fill={C.paper}>100 tickets × $1</text>
          <text x={1350} y={360} textAnchor="middle" fontFamily={font("mono")} fontSize={36} fill={C.paperDim}>PRIZE</text>
          <text x={1350} y={560} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={170} fill={prize > 100 ? C.gain : C.paper}>${Math.round(prize)}</text>
          <text x={1350} y={700} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={64} fill={prize > 100 ? C.gain : C.loss}>
            {f > cue("spend", f < ex3 ? 1 : 2) ? (prize > 100 ? "spend $100 → win $150" : "spend $100 → win $50") : ""}</text>
          {f >= ex4 && <text x={1350} y={820} textAnchor="middle" fontFamily={font("mono")} fontSize={32} fill={C.ochre}>buy enough tickets, and the averages take over</text>}
        </g>}
      </svg>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ shots
const S01: React.FC = () => { const cue = useCue(); return <Shot tag={false}><Photo src={F("lottery_machine")} move="in" strength={1.4} /><Caption at={cue("they")} text="“The lottery is a tax on people who can't do maths.”" serif size={64} y={0.44} /></Shot>; };
const S02: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("evart_street") }, { at: cue("did"), src: F("jerry_math"), move: "in" }]} /><DateLine at={4} text="MICHIGAN · 2003" /></Shot>; };
const S03: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("ticket_printer")} move="in" /><BigFigure at={cue("twenty-seven")} value="" count={{ from: 0, to: 27, prefix: "$", suffix: " MILLION", dur: 26 }} label="IN PRIZES · OVER 9 YEARS" tone="gain" /><DocStamp at={cue("legally")} text="LEGALLY" tone="ochre" y={0.72} /></Shot>; };
const S04: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("couple_porch")} move="out" /><LowerThird at={cue("jerry")} title="JERRY & MARGE SELBEE" sub="Evart, Michigan" tag="DRAMATISED · NOT THE REAL COUPLE" /></Shot>; };
const S05: React.FC = () => {
  const f = useCurrentFrame();
  const t = interpolate(f, [4, 22], [0, 1], { ...clamp, easing: out });
  return <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
    <Photo src={F("pencil_notepad")} move="in" tint="rgba(14,15,17,0.72)" />
    <div style={{ textAlign: "center", opacity: t, transform: `scale(${0.96 + 0.04 * t})` }}>
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 120, color: C.paper, lineHeight: 1.05 }}>THE LOTTERY THAT</div>
      <div style={{ fontFamily: font("display"), fontWeight: 700, fontSize: 120, color: C.ochre, lineHeight: 1.05 }}>LOST MONEY</div>
      <div style={{ height: 4, width: 260 * t, background: C.ochre, margin: "28px auto 0" }} />
    </div><FilmLook /></AbsoluteFill>;
};
const S06: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("evart_street"), move: "right" }, { at: cue("seventeen") - 6, src: F("corner_store") }, { at: cue("milk"), src: F("jerry_counter") }]} />
  <DateLine at={4} until={cue("seventeen") - 8} text="EVART, MICHIGAN" /><Caption at={cue("seventeen")} until={cue("milk") - 4} text="17 YEARS BEHIND THE COUNTER" size={60} /></Shot>; };
const S07: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("jerry_math") }, { at: cue("brochure") - 4, src: F("brochure"), move: "in" }]} /><DateLine at={cue("two")} text="2003 · RETIRED" /><Caption at={cue("winfall")} text="WINFALL" size={110} y={0.66} color={C.ochre} /></Shot>; };
const S09b: React.FC = () => { const cue = useCue(); const s = useShot(); const b = s.beats[1]?.start ?? 0; const f = useCurrentFrame(); return f < b ? <RollDown after /> : <Shot><Photo src={F("jerry_math")} move="in" /><BigFigure at={cue("two") || b + 10} value="< 2 MINUTES" label="TO SEE THE FLAW (BY ONE ACCOUNT)" tone="ochre" y={0.4} /></Shot>; };
const S10: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("pencil_notepad")} move="in" />
  <BigFigure at={cue("worth")} value="TICKET > $1" label="ON A ROLL-DOWN WEEK, ON AVERAGE" tone="gain" y={0.42} /><Caption at={cue("side")} text="the maths was on your side" serif size={60} y={0.74} /></Shot>; };
const S12: React.FC = () => { const cue = useCue(); const s = useShot(); const b3 = s.beats[2]?.start ?? 0; const b4 = s.beats[3]?.start ?? 0;
  return <Shot><PhotoSeq items={[{ at: 0, src: F("ticket_printer") }, { at: cue("kitchen") - 6, src: F("kitchen_tickets") }, { at: b4, src: F("jerry_math") }]} />
    <BigFigure at={cue("two")} until={cue("kitchen") - 6} value="$2,200" label="FIRST TEST · TICKETS BOUGHT" tone="paper" />
    <BigFigure at={cue("fifty")} until={b3 - 4} value="$2,150" label="WON BACK · A SMALL LOSS" tone="loss" />
    <Caption at={b3 + 4} until={b4 - 4} text="not enough tickets to beat the luck" serif size={58} y={0.42} />
    <BigFigure at={cue("eight")} value="$8,000 → $15,700" label="THE NEXT BIG TEST" tone="gain" /></Shot>; };
const S13: React.FC = () => <Shot><Photo src={F("couple_kitchen")} move="in" strength={1.3} /></Shot>;
const S14: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("marge_ledger") }, { at: cue("company") - 4, src: F("living_room_meeting") }]} />
  <LowerThird at={cue("g.")} title="GS INVESTMENT STRATEGIES" sub="shares at $500 each · family and friends" /></Shot>; };
const S15: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("ticket_boxes") }, { at: cue("checked") - 4, src: F("sorting_hands"), move: "in" }]} /><Caption at={cue("hand")} text="every ticket, checked by hand" serif size={60} /></Shot>; };
const S17: React.FC = () => { const cue = useCue(); return <Shot><PhotoSeq items={[{ at: 0, src: F("tickets_trash") }, { at: cue("massachusetts") - 4, src: F("mass_store") }]} />
  <DocStamp at={cue("warning") - 4} text="MAY 2005 · GAME OVER" y={0.4} /><BigFigure at={cue("two")} value="$2 MILLION" label="CASH WINFALL'S ROLL-DOWN POINT" tone="ochre" y={0.4} /></Shot>; };
const S18: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("highway_dawn")} move="right" strength={1.3} /><Caption at={cue("michigan")} text="MICHIGAN  →  MASSACHUSETTS" size={70} y={0.7} /></Shot>; };
const S20: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("mit_students")} move="in" />
  <LowerThird at={cue("random")} until={cue("reportedly") - 6} title="RANDOM STRATEGIES" sub="MIT students · led by James Harvey" />
  <BigFigure at={cue("seventeen")} value="$17M IN 7 HOURS" label="ONE ROLL-DOWN · AS REPORTED" tone="ochre" /></Shot>; };
const S22: React.FC = () => { const cue = useCue(); const s = useShot(); const b3 = s.beats[2]?.start ?? 0;
  return <Shot><PhotoSeq items={[{ at: 0, src: F("journalist") }, { at: cue("inspector") - 6, src: F("state_house") }]} />
    <DateLine at={4} until={cue("inspector") - 8} text="2011" /><DocStamp at={cue("never")} text="NEVER CHARGED" tone="gain" y={0.42} />
    {b3 > 0 && <BigFigure at={cue("ended")} value="JAN 2012" label="CASH WINFALL ENDS" tone="loss" y={0.7} />}</Shot>; };
const S23: React.FC = () => { const cue = useCue(); const s = useShot(); const b2 = s.beats[1]?.start ?? 0;
  return <Shot><PhotoSeq items={[{ at: 0, src: F("ticket_printer") }, { at: b2, src: F("couple_kitchen") }]} />
    <BigFigure at={cue("twenty-seven")} until={b2 - 4} value="≈ $27 MILLION" label="IN WINNING TICKETS · 9 YEARS" tone="gain" />
    <BigFigure at={cue("seven")} value="≈ $7.75 MILLION" label="PROFIT · SHARED AMONG INVESTORS" tone="ochre" /></Shot>; };
const S24: React.FC = () => { const cue = useCue(); return <Shot><Photo src={F("couple_porch")} move="in" /><Caption at={cue("twenty")} text="2022 · JERRY & MARGE GO LARGE" size={60} y={0.76} /></Shot>; };
const S25: React.FC = () => { const cue = useCue(); const s = useShot(); const b2 = s.beats[1]?.start ?? 0;
  return <Shot><PhotoSeq items={[{ at: 0, src: F("jerry_window") }, { at: b2 + 20, src: F("pencil_notepad"), move: "in" }]} />
    <Caption at={cue("read")} until={b2 - 4} text="they read the rules more carefully than the people who wrote them" serif size={58} y={0.7} />
    <Caption at={cue("beating")} text="the lottery was beating itself" serif size={70} y={0.44} color={C.ochre} /></Shot>; };

const ch = (n: number, title: string) => { const X: React.FC = () => <DocChapter n={n} title={title} />; return X; };

const SHOTS = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: RollDown, s09: S09b, s10: S10, s10b: Raffle,
  s11: ch(1, "THE TEST"), s12: S12, s13: S13, s14: S14, s15: S15, s16: ch(2, "MASSACHUSETTS"), s17: S17, s18: S18,
  s19: ch(3, "THE RIVALS"), s20: S20, s21: ch(4, "FOUND OUT"), s22: S22, s23: S23, s24: S24, s25: S25,
};

export const Lottery: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Explainer timing={T} shots={SHOTS} />
  </AbsoluteFill>
);
void pop;
