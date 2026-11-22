// SHORT (format 2): "How you can lose more than 100%". Loops into its first line.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, allWords, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST } from "../../kit/Character";
import { Captions, Headline, PopText, Stamp, Count, PopIn } from "../../kit/Ui";
import { Flow } from "../../kit/Diagrams";
import { CChart } from "../../kit/CChart";
import { CF, K, LW, OUT, clamp, kf } from "../../kit/style";

const T = timing as unknown as Timing;
export const SHORT_LOSS_FRAMES = T.total;
const BG = "#F3ECFF";
const GY = 1150;
const usePush = (z0 = 1, z1 = 1.07): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x: 540, y: 820 }], [s.frames, { z: z1, x: 540, y: 820 }]];
};
const Tag: React.FC<{ x: number; y: number; keys: [number, number][]; s?: number }> = ({ x, y, keys, s = 1 }) => {
  const f = useCurrentFrame();
  const v = kf(f, keys);
  return <g transform={`translate(${x} ${y}) scale(${s}) rotate(-5)`}><path d="M -170 -80 L 120 -80 L 180 0 L 120 80 L -170 80 Z" fill={K.white} stroke={OUT} strokeWidth={LW + 1} />
    <circle cx={120} cy={0} r={14} fill={BG} stroke={OUT} strokeWidth={LW} /><text x={-25} y={32} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={92} fill={OUT}>${Math.round(v)}</text></g>;
};

const Hero: React.FC<{ ending?: boolean }> = ({ ending }) => {
  const cue = useCue();
  const s = useShot();
  return (
    <Stage bg="trading" groundY={GY} cam={ending ? [[0, { z: 1.08, x: 540, y: 820 }], [s.frames, { z: 1, x: 540, y: 820 }]] : usePush(1, 1.08)}>
      <OnGround x={540} s={1.2}><Character look={CAST.trader} pose={ending ? "hips" : [[0, "hips"], [cue("short"), "panic"]]} mood={ending ? "smug" : [[0, "smug"], [cue("short"), "shocked"]]} seed={3} /></OnGround>
      <PopText x={540} y={420} at={ending ? 0 : 6} text="MAX LOSS: 100%?" size={84} font="caption" color={K.white} stroke={OUT} />
      {!ending && <Stamp x={540} y={600} at={cue("short")} text="NOT IF YOU SHORT" size={80} />}
    </Stage>
  );
};

const S02: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <PopText x={540} y={330} at={2} text="BUY" size={110} font="caption" color={K.gain} stroke={OUT} />
      <Tag x={540} y={560} s={1.3} keys={[[0, 10], [cue("zero") - 10, 10], [cue("zero") + 6, 0]]} />
      <PopText x={540} y={800} at={cue("lose")} text="worst case: −$10 (−100%)" size={56} pill={K.white} />
      <OnGround x={540}><Character look={CAST.sam} pose={[[0, "hold"], [cue("zero"), "shrug"]]} hold={{ item: "paper", label: "1 SHARE" }} mood={[[0, "happy"], [cue("zero"), "sad"]]} seed={2} /></OnGround>
    </Stage>
  );
};

const S03: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const ceil = cue("ceiling");
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <PopText x={540} y={300} at={2} text="SHORT" size={110} font="caption" color={K.loss} stroke={OUT} />
      <OnGround x={300}><Character look={CAST.trader} pose={[[0, "present"], [cue("falls"), "cheer"], [ceil, "panic"]]} mood={[[0, "smug"], [cue("falls"), "grin"], [ceil, "worried"]]} seed={3} /></OnGround>
      <PopText x={760} y={480} at={cue("borrow")} text="1. borrow" size={52} pill={K.white} anchor="start" />
      <PopText x={760} y={580} at={cue("sell")} text="2. sell $10" size={52} pill={K.white} anchor="start" />
      <PopText x={760} y={680} at={cue("buy")} text="3. buy back later" size={52} pill={K.white} anchor="start" />
      <PopText x={760} y={800} at={cue("eight")} text="falls to $2: +$8" size={52} pill={K.gain} color={K.white} anchor="start" />
      {f >= ceil && <PopIn at={ceil} x={800} y={1000}><path d="M 0 80 L 0 -260 M -50 -200 L 0 -260 L 50 -200" stroke={K.loss} strokeWidth={22} fill="none" strokeLinecap="round" strokeLinejoin="round" /><text x={90} y={-120} fontFamily={CF.caption} fontWeight={900} fontSize={120} fill={K.loss}>∞</text></PopIn>}
    </Stage>
  );
};

const S04: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const keys: [number, number][] = [[0, 10], [cue("twenty") - 6, 10], [cue("twenty") + 6, 20], [cue("fifty") - 6, 20], [cue("fifty") + 6, 50]];
  const v = kf(f, keys);
  const loss = Math.round(((v - 10) / 10) * 100);
  return (
    <Stage bg="studio" color={BG} groundY={GY} shake={[[cue("fifty"), cue("fifty") + 10]]} cam={usePush()}>
      <Tag x={540} y={440} s={1.4} keys={keys} />
      <text x={540} y={760} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={170} fill={K.loss} stroke={OUT} strokeWidth={14} paintOrder="stroke">−{loss}%</text>
      <OnGround x={540} s={0.9}><Character look={CAST.trader} pose="panic" mood="shocked" seed={3} /></OnGround>
    </Stage>
  );
};

const S05: React.FC = () => {
  const cue = useCue();
  const pts: [number, number][] = [[0, 19.94], [16, 347.51], [17, 483]];
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <CChart x={60} y={260} w={960} h={760} xMax={17} yMax={500} title="GameStop, Jan 2021" at={2} xTicks={[0, 17]} xLabel={(v) => (v ? "Jan 28" : "Jan 11")}
        yTicks={[100, 300, 500]} yFmt={(v) => `$${v}`} series={[{ pts, color: K.loss, at: cue("twenty"), dur: 40 }]} />
      <Count x={540} y={1110} a={cue("loss")} b={cue("loss") + 20} to={2315} prefix="−" suffix="%" size={150} color={K.loss} stroke={OUT} />
    </Stage>
  );
};

export const ShortLoss: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Explainer timing={T} shots={{ s01: () => <Hero />, s02: S02, s03: S03, s04: S04, s05: S05, s06: () => <Hero ending /> }} />
    <Headline text="YOU CAN LOSE MORE THAN 100%" size={58} />
    <Captions words={allWords(T)} y={0.74} size={84} />
  </AbsoluteFill>
);
void Flow; void interpolate; void clamp;
