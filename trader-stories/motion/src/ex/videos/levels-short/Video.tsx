// SHORT (format 5): "Every level of trader in 45 seconds". Ends with a prompt to rewatch and count.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, allWords, useCue, useShot } from "../../engine";
import { Stage, OnGround } from "../../kit/Stage";
import { Character, CAST, Look } from "../../kit/Character";
import { Captions, PopText } from "../../kit/Ui";
import { Prop, PropName } from "../../kit/Props";
import { CF, K, LW, OUT, SKIN, clamp, pop } from "../../kit/style";

const T = timing as unknown as Timing;
export const LEVELS_SHORT_FRAMES = T.total;
const NAVY = "#1F2B47";
const YOU1: Look = { hair: "short", hairColor: "#2B1B14", skin: SKIN[2], shirt: K.blue, hoodie: true, pants: "#2E3550" };
const YOU3: Look = { ...YOU1, hoodie: false, shirt: "#F2F2F2" };
const YOU5: Look = { ...YOU1, hoodie: false, shirt: K.white, jacket: "#2E3550", tie: K.red };
const YOU7: Look = { ...YOU1, hoodie: false, jacket: "#22252C", tie: K.gold, hair: "slick" };
const YOU10: Look = { hair: "bald", hairColor: "#D8D8D8", skin: SKIN[1], jacket: "#4A3F35", tie: K.navy, glasses: true, pants: "#3A332C" };

type L = { n: number; amount: string; look: Look; item?: PropName; trades: string; color: string };
const LV: Record<string, L> = {
  s02: { n: 1, amount: "$1,000", look: YOU1, item: "phone", trades: "50 trades / day", color: "#E86F5A" },
  s03: { n: 2, amount: "$10,000", look: YOU1, item: "cashStack", trades: "leverage", color: "#F29A38" },
  s04: { n: 3, amount: "$25,000", look: YOU3, item: "laptop", trades: "97% lost money", color: "#F7CF3D" },
  s05: { n: 4, amount: "$100,000", look: YOU3, item: "paper", trades: "the firm's money", color: "#B7D96A" },
  s06: { n: 5, amount: "$1M", look: YOU5, item: "phone", trades: "daily loss limit", color: "#6CCB8B" },
  s07: { n: 6, amount: "$100M", look: YOU7, item: "briefcase", trades: "2% a year", color: "#5AC0D8" },
  s08: { n: 7, amount: "$1B", look: YOU7, item: "chart", trades: "you move the price", color: "#5A8FE0" },
  s09: { n: 8, amount: "LEGEND", look: YOU7, item: "moneyBag", trades: "one big bet", color: "#8C6CE0" },
  s10: { n: 9, amount: "FOREVER", look: YOU10, item: "paper", trades: "barely trades", color: "#C46CC4" },
};

const Level: React.FC<{ id: string }> = ({ id }) => {
  const l = LV[id];
  const f = useCurrentFrame();
  const t = interpolate(f, [0, 8], [0, 1], { ...clamp, easing: pop });
  return (
    <Stage bg="studio" color={l.color} groundY={1180} cam={[[0, { z: 1.05, x: 540, y: 900 }], [60, { z: 1, x: 540, y: 900 }]]}>
      <g transform={`translate(540 380) scale(${t})`}>
        <text x={0} y={-110} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={80} fill={OUT}>LEVEL {l.n}</text>
        <text x={0} y={60} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={l.amount.length > 6 ? 150 : 190} fill={K.white} stroke={OUT} strokeWidth={14} paintOrder="stroke">{l.amount}</text>
      </g>
      <OnGround x={540} s={1.05}><Character look={l.look} pose={l.item ? "hold" : "idle"} hold={l.item ? { item: l.item } : undefined} mood={l.n <= 3 ? "grin" : "smug"} seed={l.n} /></OnGround>
      <PopText x={540} y={565} at={6} text={l.trades} size={58} pill={K.white} />
    </Stage>
  );
};

const S01: React.FC = () => {
  const cue = useCue();
  const s = useShot();
  return (
    <Stage bg="studio" color={NAVY} groundY={1180} cam={[[0, { z: 1, x: 540, y: 900 }], [s.frames, { z: 1.08, x: 540, y: 900 }]]}>
      {Array.from({ length: 9 }).map((_, i) => <g key={i}><rect x={300} y={1100 - i * 100} width={480} height={18} rx={9} fill={K.wood} stroke={OUT} strokeWidth={4} /></g>)}
      <path d="M 320 1180 L 320 200 M 760 1180 L 760 200" stroke={K.wood} strokeWidth={22} strokeLinecap="round" />
      <PopText x={540} y={260} at={cue("every")} text="EVERY LEVEL" size={96} font="caption" color={K.yellow} stroke={OUT} />
      <PopText x={540} y={380} at={cue("thousand")} text="$1,000 → $1 BILLION" size={64} pill={K.white} />
    </Stage>
  );
};

const S11: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const t = interpolate(f, [cue("higher") - 4, cue("trades") + 10], [0, 1], clamp);
  return (
    <Stage bg="studio" color={NAVY} groundY={1180}>
      <PopText x={540} y={280} at={2} text="NOTICE SOMETHING?" size={80} font="caption" color={K.yellow} stroke={OUT} />
      {Array.from({ length: 9 }).map((_, i) => (
        <g key={i}>
          <text x={150} y={1120 - i * 82} textAnchor="end" fontFamily={CF.caption} fontWeight={900} fontSize={40} fill={K.white}>{i + 1}</text>
          <rect x={180} y={1080 - i * 82} width={760 * Math.pow(0.65, i) * t} height={56} rx={10} fill={K.loss} stroke={OUT} strokeWidth={4} />
        </g>
      ))}
      <PopText x={540} y={420} at={cue("watch")} text="WATCH AGAIN & COUNT ↻" size={58} pill={K.white} />
    </Stage>
  );
};

export const LevelsShort: React.FC = () => (
  <AbsoluteFill style={{ background: NAVY }}>
    <Explainer timing={T} shots={{ s01: S01, ...Object.fromEntries(Object.keys(LV).map((k) => [k, () => <Level id={k} />])), s11: S11 }} />
    <Captions words={allWords(T)} y={0.76} size={80} />
  </AbsoluteFill>
);
void Prop; void LW; void CAST;
