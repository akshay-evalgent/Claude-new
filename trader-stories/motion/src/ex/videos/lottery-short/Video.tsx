// SHORT (format 1): "When a lottery ticket is worth more than it costs". Loops: ends on "the maths said the same thing." → "There was a lottery..."
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, allWords, useCue } from "../../engine";
import { Photo, FilmLook, BigFigure, DocStamp, CornerTag } from "../../kit/Doc";
import { LotteryDrum } from "../../kit/Balls3D";
import { Captions, Headline } from "../../kit/Ui";
import { C, font } from "../../../theme";
import { clamp, out } from "../../kit/style";

const T = timing as unknown as Timing;
export const LOTTERY_SHORT_FRAMES = T.total;
const F = (id: string) => `frames/lottery/${id}.jpg`;

const Still: React.FC<{ src: string; children?: React.ReactNode; move?: "in" | "out" | "left" | "right" }> = ({ src, children, move = "in" }) => (
  <AbsoluteFill style={{ background: C.ink }}><Photo src={src} move={move} strength={1.3} /><FilmLook dark={0.5} /><CornerTag />{children}</AbsoluteFill>
);

const Drum: React.FC<{ ending?: boolean }> = ({ ending }) => (
  <AbsoluteFill style={{ background: C.ink }}><LotteryDrum n={36} speed={ending ? 1.1 : 1} camZ={12.5} highlight={[7, 12, 23]} /><FilmLook dark={0.6} /></AbsoluteFill>
);

const Jars: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const roll = cue("rolled");
  const big = f < roll ? interpolate(f, [cue("passed"), cue("passed") + 30], [0.5, 1], clamp) : interpolate(f, [roll, roll + 30], [1, 0.1], { ...clamp, easing: out });
  const small = f < roll ? 0.1 : interpolate(f, [roll + 8, roll + 40], [0.1, 0.95], { ...clamp, easing: out });
  const jar = (x: number, y: number, w: number, h: number, fill: number, col: string, label: string) => (
    <g key={label}><rect x={x - w / 2} y={y - h} width={w} height={h} rx={22} fill="rgba(255,255,255,0.05)" stroke={C.paperDim} strokeWidth={4} />
      <rect x={x - w / 2 + 8} y={y - 8 - (h - 16) * fill} width={w - 16} height={(h - 16) * fill} rx={14} fill={col} opacity={0.88} />
      <text x={x} y={y + 50} textAnchor="middle" fontFamily={font("mono")} fontSize={30} fill={C.paper}>{label}</text></g>
  );
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg width={1080} height={1920}><g transform="translate(0 70)">
        <text x={540} y={380} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={70} fill={C.paper}>MICHIGAN'S WINFALL</text>
        {jar(540, 800, 480, 300, big, C.ochre, "JACKPOT")}
        {f >= cue("passed") && f < roll + 40 && <text x={540} y={450} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={56} fill={C.ochre}>$5 MILLION+, NO WINNER</text>}
        {f >= roll - 4 && [0, 1, 2].map((i) => jar(220 + i * 320, 1180, 240, 230, small * (1 - i * 0.05), C.gain, ["5 numbers", "4 numbers", "3 numbers"][i]))}
        {f >= roll && <text x={540} y={905} textAnchor="middle" fontFamily={font("display")} fontWeight={700} fontSize={76} fill={C.gain}>IT ROLLS DOWN ↓</text>}
      </g></svg>
    </AbsoluteFill>
  );
};

const S01: React.FC = () => <Drum />;
const S02: React.FC = () => <Jars />;
const S03: React.FC = () => { const cue = useCue(); return <Still src={F("ticket_printer")}><BigFigure at={cue("matching")} value="SMALL PRIZES ↑↑" label="MATCH 3, 4 OR 5 NUMBERS" tone="gain" y={0.36} /></Still>; };
const S04: React.FC = () => { const cue = useCue(); return <Still src={F("jerry_math")}><BigFigure at={cue("worth")} value="TICKET > $1" label="ON ROLL-DOWN WEEKS, ON AVERAGE" tone="gain" y={0.36} /></Still>; };
const S05: React.FC = () => { const cue = useCue(); return <Still src={F("couple_kitchen")}><BigFigure at={cue("twenty-seven")} value="" count={{ from: 0, to: 27, prefix: "$", suffix: "M", dur: 24 }} label="IN PRIZES · 9 YEARS" tone="gain" y={0.36} /></Still>; };
const S06: React.FC = () => { const cue = useCue(); return <Still src={F("couple_porch")} move="out"><DocStamp at={cue("legally")} text="LEGALLY" tone="ochre" y={0.36} /></Still>; };
const S07: React.FC = () => <Drum ending />;

export const LotteryShort: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Explainer timing={T} shots={{ s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07 }} />
    <Headline text="A LOTTERY THAT PAID YOU" size={62} bg="#F2C66B" />
    <Captions words={allWords(T)} y={0.72} size={84} />
  </AbsoluteFill>
);
