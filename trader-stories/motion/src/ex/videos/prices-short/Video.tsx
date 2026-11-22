// SHORT (format 4): "Why prices are never supposed to go back down". Loops into its first line.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, allWords, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST, crowdLook } from "../../kit/Character";
import { Captions, Headline, PopText, Stamp, PopIn } from "../../kit/Ui";
import { LemonadeStand, Building } from "../../kit/Props";
import { Cycle } from "../../kit/Diagrams";
import { CF, K, LW, OUT, clamp, kf } from "../../kit/style";
import { PENNY } from "../lemonade/Video";

const T = timing as unknown as Timing;
export const PRICES_SHORT_FRAMES = T.total;
const BG = "#FDEFD2";
const GY = 1150;

const usePush = (z0 = 1.12, z1 = 1.2): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x: 540, y: 820 }], [s.frames, { z: z1, x: 540, y: 820 }]];
};

const Tag: React.FC<{ x: number; y: number; keys: [number, number][]; s?: number }> = ({ x, y, keys, s = 1 }) => {
  const f = useCurrentFrame();
  const v = kf(f, keys);
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(-4)`}>
      <path d="M -200 -90 L 150 -90 L 220 0 L 150 90 L -200 90 Z" fill={K.white} stroke={OUT} strokeWidth={LW + 1} />
      <circle cx={150} cy={0} r={16} fill={BG} stroke={OUT} strokeWidth={LW} />
      <text x={-20} y={34} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={100} fill={OUT}>${v.toFixed(2)}</text>
    </g>
  );
};

const Hero: React.FC<{ ending?: boolean }> = ({ ending }) => {
  const cue = useCue();
  const s = useShot();
  return (
    <Stage bg="town" groundY={GY} cam={ending ? [[0, { z: 1.22, x: 540, y: 820 }], [s.frames, { z: 1.12, x: 540, y: 820 }]] : usePush(1.12, 1.22)}>
      <OnGround x={560} s={0.9}><LemonadeStand /></OnGround>
      <OnGround x={250} s={1.05}><Character look={PENNY} pose="hold" hold={{ item: "cup" }} mood={ending ? "smug" : "happy"} seed={3} /></OnGround>
      <Tag x={600} y={480} keys={ending ? [[0, 1.0]] : [[0, 1.0], [cue("more"), 1.0], [cue("more") + 10, 1.02], [cue("year"), 1.04]]} />
      {!ending && <Stamp x={560} y={620} at={cue("purpose")} text="ON PURPOSE" size={90} color={K.blue} />}
    </Stage>
  );
};

const S02: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <Tag x={540} y={480} s={1.25} keys={[[0, 1.0], [cue("next"), 1.0], [cue("two") + 4, 1.02], [cue("after"), 1.02], [cue("four") + 4, 1.04]]} />
      <PopText x={540} y={690} at={cue("two", 2)} text="= 2% INFLATION" size={74} font="caption" color={K.orange} stroke={OUT} />
      <PopIn at={cue("central")} x={540} y={GY}><Building w={420} h={340} color="#E8DDC8" roof="columns" label="THE FED" /></PopIn>
      <PopText x={540} y={1215} at={cue("twenty")} text="official target since 2012" size={46} pill={K.white} />
    </Stage>
  );
};

const S03: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <OnGround x={540} s={1.2}><Character look={CAST.sam} pose="shrug" mood="worried" seed={2} /></OnGround>
      <PopText x={540} y={480} at={cue("zero")} text="WHY NOT 0%?" size={110} font="caption" color={K.white} stroke={OUT} />
    </Stage>
  );
};

const S04: React.FC = () => {
  const cue = useCue();
  const b6 = cue("everyone");
  const f = useCurrentFrame();
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      {f < b6 ? (
        <>
          <OnGround x={540} s={1.2}><Character look={CAST.sam} pose="hips" mood="sleepy" seed={2} /></OnGround>
          <PopText x={540} y={490} at={cue("cheaper")} text="cheaper next week?" size={64} pill={K.white} />
          <PopText x={540} y={540} at={cue("wait")} text="…I'll wait." size={80} font="hand" />
        </>
      ) : (
        <Cycle cx={540} cy={760} r={380} rx={300} nodeW={420} spinFrom={cue("again")}
          nodes={[{ text: "Everyone waits", at: b6 }, { text: "Penny sells less", at: cue("sells") }, { text: "Fewer hours", at: cue("cuts") },
            { text: "People spend less", at: cue("spend") }, { text: "Prices fall again", at: cue("fall"), color: "#F6B9B0" }]} />
      )}
    </Stage>
  );
};

const S05: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="city" groundY={GY} tint="rgba(60,50,40,0.35)" cam={usePush()}>
      {Array.from({ length: 4 }).map((_, i) => <OnGround key={i} x={170 + i * 250} s={0.9}><Character look={{ ...crowdLook(110 + i), hat: i % 2 ? "cap" : undefined, hatColor: "#5A4A3A" }} pose="idle" mood="sad" seed={110 + i} /></OnGround>)}
      <PopText x={540} y={440} at={cue("great")} text="1929 – 1933" size={90} font="caption" color={K.white} stroke={OUT} />
      <PopText x={540} y={580} at={cue("quarter")} text="PRICES −25%" size={100} font="caption" color={K.loss} stroke={OUT} />
      <Stamp x={540} y={730} at={cue("disaster")} text="DISASTER" size={90} />
    </Stage>
  );
};

const S06: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const s = useShot();
  const v = interpolate(f, [0, s.frames], [1.0, 1.06], clamp);
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <Tag x={540} y={500} s={1.25} keys={[[0, v], [s.frames, v]]} />
      <PopText x={540} y={680} at={cue("above")} text="a little above zero" size={66} pill={K.yellow} />
      <PopText x={540} y={820} at={cue("waits")} text="so nobody waits" size={60} font="hand" />
    </Stage>
  );
};

const S07: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const t = interpolate(f, [cue("wages") - 4, cue("faster") + 20], [0, 1], clamp);
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={usePush()}>
      <PopText x={540} y={430} at={2} text="THE REAL GOAL" size={70} pill={K.yellow} />
      {[["WAGES", K.gain, 0.95], ["LEMONADE", K.orange, 0.55]].map(([l, c, h], i) => (
        <g key={i}>
          <rect x={250 + i * 330} y={1060 - 520 * (h as number) * t} width={250} height={520 * (h as number) * t} rx={20} fill={c as string} stroke={OUT} strokeWidth={LW} />
          <text x={375 + i * 330} y={1120} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={50} fill={OUT}>{l}</text>
        </g>
      ))}
    </Stage>
  );
};

const S01: React.FC = () => <Hero />;
const S08: React.FC = () => <Hero ending />;

export const PricesShort: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Explainer timing={T} shots={{ s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07, s08: S08 }} />
    <Headline text="PRICES RISE ON PURPOSE" size={64} />
    <Captions words={allWords(T)} y={0.74} size={84} />
  </AbsoluteFill>
);
