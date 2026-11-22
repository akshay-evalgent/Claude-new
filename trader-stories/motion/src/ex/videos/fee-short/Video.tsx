// SHORT (format 3): "A 1% fee doesn't take 1% of your money". Loops: last line runs into the first.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, allWords, useCue, useShot, speakingIntervals } from "../../engine";
import { Stage, OnGround } from "../../kit/Stage";
import { Character, CAST } from "../../kit/Character";
import { Captions, Headline, PopText, Count, Stamp } from "../../kit/Ui";
import { CashTowers } from "../../kit/Cash3D";
import { CChart, growth } from "../../kit/CChart";
import { CF, K, OUT, clamp, out, pop } from "../../kit/style";

const T = timing as unknown as Timing;
export const FEE_SHORT_FRAMES = T.total;
const BG = "#FBE7C6";
const GY = 1160;

/** Shared opening/closing frame so the loop is seamless. */
const Hero: React.FC<{ mood: "happy" | "smug" | "shocked"; ending?: boolean }> = ({ mood, ending }) => {
  const s = useShot();
  const cue = useCue();
  const f = useCurrentFrame();
  const talk = speakingIntervals(s);
  const z = interpolate(f, [0, s.frames], ending ? [1.12, 1.0] : [1.0, 1.12], clamp);
  return (
    <Stage bg="studio" color={BG} groundY={GY} cam={[[0, { z: ending ? 1.12 : 1, y: 860 }], [s.frames, { z: ending ? 1 : 1.12, y: 860 }]]}>
      <OnGround x={540} s={1.25}>
        <Character look={CAST.sam} pose="signR" mood={mood} talk={talk} hold={{ item: "sign", label: "1%", scale: 1.0 }} seed={4} lookAt={[0.25, -0.1]} />
      </OnGround>
      {!ending && <PopText x={300} y={420} at={cue("tiny")} text="tiny!" size={74} font="hand" color={OUT} rot={8} />}
      {ending && <PopText x={300} y={420} at={cue("only")} text="only?" size={74} font="hand" color={K.loss} rot={8} />}
      {void z}
    </Stage>
  );
};

const S01: React.FC = () => <Hero mood="happy" />;
const S07: React.FC = () => <Hero mood="smug" ending />;

const S02: React.FC = () => {
  const s = useShot();
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY} shake={[[cue("third"), cue("third") + 10]]}
      cam={[[0, { z: 1.12, y: 860 }], [cue("third"), { z: 1.2, y: 840 }], [s.frames, { z: 1.25, y: 840 }]]}>
      <OnGround x={540} s={1.25}>
        <Character look={CAST.sam} pose={[[0, "signR"], [cue("not"), "panic"]]} mood={[[0, "happy"], [cue("not"), "shocked"]]}
          talk={speakingIntervals(s)} seed={4} jump={[cue("not")]} />
      </OnGround>
      <PopText x={250} y={640} at={cue("forty")} text="40 YEARS" size={56} pill={K.white} rot={-6} />
      <Count x={560} y={500} a={cue("third")} b={cue("third") + 16} from={0} to={31} prefix="−" suffix="%" size={190} color={K.loss} stroke={OUT} />
    </Stage>
  );
};

const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ pointerEvents: "none" }}>{children}</AbsoluteFill>;
const Label: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; bg?: string; at?: number; until?: number }> = ({ x, y, text, size = 56, color = OUT, bg = K.white, at = 0, until }) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [at, at + 10], [0, 1], { ...clamp, easing: pop });
  const o = until === undefined ? 1 : interpolate(f, [until, until + 6], [1, 0], clamp);
  if (t <= 0 || o <= 0) return null;
  return <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${t})`, opacity: o, background: bg, border: `6px solid ${OUT}`, borderRadius: 20,
    padding: `${size * 0.12}px ${size * 0.35}px`, fontFamily: CF.caption, fontWeight: 900, fontSize: size, color, whiteSpace: "nowrap", boxShadow: `0 7px 0 ${OUT}` }}>{text}</div>;
};

const S03: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const g0 = cue("b04") + 8, g1 = cue("fifty") + 4;
  const year = interpolate(f, [g0, g1], [0, 40], { ...clamp, easing: (t) => t });
  const show = f >= cue("ten") - 4;
  const value = show ? 10000 * Math.pow(1.07, year) : 0;
  return (
    <AbsoluteFill>
      <CashTowers piles={[{ value, x: 0, cols: 2, rows: 2 }]} cam={{ pos: [0, 5.2, 15.5], look: [0, 3.3, 0], fov: 40 }} orbit={1} bg={BG} />
      <Overlay>
        <Label x={540} y={360} text={money(value)} size={96} at={cue("ten")} color={OUT} />
        <Label x={540} y={470} text="7% A YEAR" size={50} at={cue("seven")} bg={K.gain} color={K.white} />
        <Label x={540} y={1190} text={`YEAR ${Math.round(year)}`} size={56} at={g0} bg={K.yellow} />
      </Overlay>
    </AbsoluteFill>
  );
};

const S04: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const g0 = cue("off") + 4, g1 = cue("b06") + 60;
  const year = interpolate(f, [g0, g1], [0, 40], { ...clamp, easing: (t) => t });
  const a = 10000 * Math.pow(1.07, year), b = 10000 * Math.pow(1.06, year);
  const ghostAt = cue("forty-seven") - 6;
  const ghost = f >= ghostAt ? interpolate(f, [ghostAt, ghostAt + 20], [0, a - b], clamp) : 0;
  return (
    <AbsoluteFill>
      <CashTowers piles={[{ value: a, x: -2.1, cols: 2, rows: 2 }, { value: b, ghost, x: 2.1, cols: 2, rows: 2 }]}
        cam={{ pos: [0, 5.0, 24], look: [0, 3.6, 0], fov: 40 }} bg={BG} />
      <Overlay>
        <Label x={300} y={1150} text="NO FEE · 7%" size={40} bg={K.gain} color={K.white} />
        <Label x={780} y={1150} text="1% FEE · 6%" size={40} bg={K.loss} color={K.white} at={cue("one") - 2} />
        <Label x={300} y={360} text={money(a)} size={54} />
        <Label x={780} y={360} text={money(b)} size={54} at={cue("one") - 2} />
        <Label x={540} y={480} text={`YEAR ${Math.round(year)}`} size={44} bg={K.yellow} at={g0} until={cue("forty-seven") - 8} />
        <Label x={780} y={470} text="−$46,888" size={64} bg={K.loss} color={K.white} at={cue("forty-seven")} />
      </Overlay>
    </AbsoluteFill>
  );
};

const CHART = { x: 60, y: 300, w: 960, h: 760 };
const S05: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY}>
      <CChart {...CHART} xMax={40} yMax={160000} title="$10,000 over 40 years" at={0}
        xTicks={[0, 10, 20, 30, 40]} xLabel={(v) => `${v}y`} yTicks={[50000, 100000, 150000]} yFmt={(v) => `$${v / 1000}k`}
        series={[{ pts: growth(10000, 0.07, 40), color: K.gain, label: "7%", at: 2, dur: 40 }, { pts: growth(10000, 0.06, 40), color: K.loss, label: "6%", at: 10, dur: 40 }]}
        fill={[{ a: 0, b: 1, color: K.loss, at: cue("everything"), label: "lost growth" }]} />
    </Stage>
  );
};

const S06: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={BG} groundY={GY}>
      <CChart {...CHART} xMax={40} yMax={160000} title="$10,000 over 40 years" at={-30}
        xTicks={[0, 10, 20, 30, 40]} xLabel={(v) => `${v}y`} yTicks={[50000, 100000, 150000]} yFmt={(v) => `$${v / 1000}k`}
        series={[{ pts: growth(10000, 0.07, 40), color: K.gain, label: "7%", at: -100 }, { pts: growth(10000, 0.06, 40), color: K.orange, label: "6%", at: -100 },
          { pts: growth(10000, 0.05, 40), color: K.loss, label: "5%", at: cue("two"), dur: 30 }]}
        fill={[{ a: 0, b: 2, color: K.loss, at: cue("half") - 4 }]} />
      <Stamp x={430} y={720} at={cue("half")} text="−53%" size={110} />
    </Stage>
  );
};

export const FeeShort: React.FC = () => {
  const words = allWords(T);
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Explainer timing={T} shots={{ s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: S06, s07: S07 }} />
      <Headline text="A 1% FEE ISN'T 1%" size={66} />
      <Captions words={words} y={0.735} size={86} />
    </AbsoluteFill>
  );
};
