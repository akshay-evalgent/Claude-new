// LONG (format 5): "Your Life at Every Level of a Trader: $1,000 to $1 Billion"
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, buildShots, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST, crowdLook, Look } from "../../kit/Character";
import { PopText, Bubble, Stamp, Arrow, Count, PopIn } from "../../kit/Ui";
import { Prop, Desk, Building } from "../../kit/Props";
import { Waffle, Flow, TitleCard, Burst, Screen } from "../../kit/Diagrams";
import { CF, K, LW, OUT, SKIN, clamp, pop } from "../../kit/style";

const T = timing as unknown as Timing;
export const LEVELS_FRAMES = T.total;
const PAPER = "#EFF3F8";
const NAVY = "#1F2B47";

// "You", dressed for each level.
const YOU1: Look = { hair: "short", hairColor: "#2B1B14", skin: SKIN[2], shirt: K.blue, hoodie: true, pants: "#2E3550" };
const YOU3: Look = { ...YOU1, hoodie: false, shirt: "#F2F2F2", collar: K.white };
const YOU5: Look = { ...YOU1, hoodie: false, shirt: K.white, jacket: "#2E3550", tie: K.red };
const YOU7: Look = { ...YOU1, hoodie: false, jacket: "#22252C", tie: K.gold, hair: "slick" };
const YOU10: Look = { hair: "bald", hairColor: "#D8D8D8", skin: SKIN[1], jacket: "#4A3F35", tie: K.navy, glasses: true, pants: "#3A332C" };

const LEVELS = ["$1,000", "$10,000", "$25,000", "$100,000", "$1M", "$10M", "$100M", "$1B", "LEGEND", "FOREVER"];
const SHOT_LEVEL: Record<string, number> = { s04: 1, s05: 1, s06: 2, s07: 2, s08: 3, s09: 3, s10: 4, s11: 4, s12: 5, s13: 5, s14: 6, s15: 6, s16: 7, s17: 7, s18: 8, s19: 8, s20: 9, s21: 9, s22: 10, s23: 10 };

const usePush = (z0 = 0.9, z1 = 0.95, x = 1060, y = 560): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x, y }], [s.frames, { z: z1, x, y }]];
};

/** The ladder on the right edge of the frame. */
const LadderHUD: React.FC = () => {
  const f = useCurrentFrame();
  const shots = buildShots(T);
  const cur = shots.find((s) => f >= s.start && f < s.start + s.frames);
  const lvl = cur ? SHOT_LEVEL[cur.id] ?? 0 : 0;
  const first = shots.find((s) => s.id === "s04")!.start;
  const last = shots.find((s) => s.id === "s24")!.start;
  const vis = interpolate(f, [first, first + 12, last, last + 10], [0, 1, 1, 0], clamp);
  if (vis <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g opacity={vis} transform={`translate(${1920 - 150 + (1 - vis) * 200} 0)`}>
          <rect x={-14} y={70} width={150} height={940} rx={24} fill="rgba(255,255,255,0.82)" stroke={OUT} strokeWidth={4} />
          <path d="M 18 100 L 18 980 M 104 100 L 104 980" stroke={OUT} strokeWidth={6} strokeLinecap="round" />
          {LEVELS.map((l, i) => {
            const y = 960 - i * 92;
            const on = i + 1 === lvl, done = i + 1 < lvl;
            return (
              <g key={i}>
                <path d={`M 18 ${y} L 104 ${y}`} stroke={OUT} strokeWidth={5} />
                <circle cx={61} cy={y - 34} r={on ? 26 : 18} fill={on ? K.yellow : done ? K.gain : K.white} stroke={OUT} strokeWidth={4} />
                <text x={61} y={y - 26} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={on ? 24 : 18} fill={OUT}>{i + 1}</text>
                {on && <text x={-24} y={y - 26} textAnchor="end" fontFamily={CF.caption} fontWeight={900} fontSize={30} fill={OUT} stroke={K.white} strokeWidth={8} paintOrder="stroke">{l}</text>}
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const LevelCard = (n: number, amount: string, sub: string) => {
  const C: React.FC = () => {
    const f = useCurrentFrame();
    const t = interpolate(f, [0, 12], [0, 1], { ...clamp, easing: pop });
    return (
      <Stage bg="studio" color={NAVY} cam={usePush(1, 1.05, 860, 540)}>
        <g transform={`translate(860 520) scale(${t}) rotate(-2)`}>
          <text x={0} y={-90} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={64} fill={K.yellow}>LEVEL {n}</text>
          <text x={0} y={70} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={200} fill={K.white} stroke={OUT} strokeWidth={10} paintOrder="stroke">{amount}</text>
          <text x={0} y={170} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={52} fill="#BFD0EA">{sub}</text>
        </g>
      </Stage>
    );
  };
  return C;
};

// ------------------------------------------------------------------ hook
const S01: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const trades = Math.min(50, Math.floor(Math.max(0, f - 6) / 2.4));
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05, 960, 540)}>
      <rect x={960} y={-200} width={1200} height={1600} fill="#E6E0D2" />
      <path d="M 960 -100 L 960 1200" stroke={OUT} strokeWidth={6} />
      <OnGround x={480}><Character look={YOU1} pose="phone" hold={{ item: "phone" }} mood={[[0, "grin"], [cue("losing"), "shocked"]]} shake={[[cue("losing"), cue("losing") + 14]]} seed={1} /></OnGround>
      <OnGround x={1440}><Character look={YOU10} pose="hold" hold={{ item: "paper", label: "ANNUAL REPORT" }} mood="happy" seed={9} /></OnGround>
      <PopText x={480} y={180} at={2} text="LEVEL 1" size={60} pill={K.white} />
      <PopText x={1440} y={180} at={cue("ten")} text="LEVEL 10" size={60} pill={K.yellow} />
      <PopText x={480} y={300} at={4} text={`${trades} trades today`} size={48} font="label" />
      <PopText x={1440} y={300} at={cue("twice")} text="2 trades this year" size={48} font="label" />
      <Stamp x={480} y={480} at={cue("losing")} text="LOSING" size={90} />
    </Stage>
  );
};

const S02: React.FC = () => {
  const cue = useCue();
  const s = useShot();
  const rungs = ["$1,000", "$10K", "$25K", "$100K", "$1M", "$10M", "$100M", "$1B"];
  return (
    <Stage bg="sky" cam={[[0, { z: 1.0, x: 960, y: 700 }], [s.frames, { z: 1.0, x: 960, y: -900 }]]}>
      <path d="M 860 1000 L 860 -1900 M 1060 1000 L 1060 -1900" stroke={K.wood} strokeWidth={22} strokeLinecap="round" />
      {rungs.map((r, i) => (
        <g key={i}>
          <path d={`M 860 ${880 - i * 360} L 1060 ${880 - i * 360}`} stroke={K.wood} strokeWidth={18} strokeLinecap="round" />
          <PopText x={1260} y={900 - i * 360} at={cue("thousand") + i * 6} text={r} size={64} pill={K.white} anchor="start" />
        </g>
      ))}
      <OnGround x={760}><Character look={YOU1} pose="pointUp" mood="grin" seed={1} /></OnGround>
    </Stage>
  );
};

const S03: React.FC = () => (
  <Stage bg="studio" color={NAVY} cam={usePush(1, 1.06, 960, 540)}>
    <TitleCard x={960} y={520} title={"YOUR LIFE AT EVERY\nLEVEL OF A TRADER"} size={110} at={4} />
    <Burst x={960} y={520} at={10} item="cash" n={18} spread={760} />
  </Stage>
);

// ------------------------------------------------------------------ level 1
const S05: React.FC = () => {
  const cue = useCue();
  const s = useShot();
  const bRisk = s.beats.find((b) => b.text.startsWith("Your biggest"))?.start ?? 99999;
  const bGap = s.beats.find((b) => b.text.startsWith("The app is free"))?.start ?? 99999;
  const f = useCurrentFrame();
  return (
    <Stage bg="room" cam={usePush(0.9, 0.95)}>
      <OnGround x={520}><Character look={YOU1} pose={[[0, "phone"], [cue("genius"), "cheer"], [cue("most"), "facepalm"], [bRisk, "phone"]]} hold={{ item: "phone" }}
        mood={[[0, "happy"], [cue("genius"), "grin"], [cue("most"), "sad"], [bRisk, "worried"], [bGap, "neutral"]]} seed={1} /></OnGround>
      {f < bRisk && <>
        <PopText x={1100} y={260} at={cue("videos")} text="3 videos watched" size={46} font="hand" />
        <PopText x={1100} y={380} at={cue("nine")} text="9:30 BUY" size={54} pill={K.gain} color={K.white} />
        <PopText x={1100} y={480} at={cue("thirty-four")} text="9:34 SELL" size={54} pill={K.loss} color={K.white} />
        <PopText x={1100} y={600} at={cue("fifty")} text="+$50 GENIUS!" size={60} font="caption" color={K.gain} stroke={OUT} />
        <PopText x={1100} y={720} at={cue("down")} text="most weeks: down" size={56} font="caption" color={K.loss} stroke={OUT} />
      </>}
      {f >= bRisk && f < bGap && <>
        <PopText x={1100} y={300} at={bRisk} text="the real risk: YOU" size={60} pill={K.yellow} />
        <PopText x={1100} y={430} at={cue("boredom")} text="boredom" size={52} font="hand" />
        <PopText x={1100} y={520} at={cue("revenge")} text="revenge trades" size={52} font="hand" color={K.loss} />
        <PopText x={1100} y={610} at={cue("open")} text="'the app is open'" size={52} font="hand" />
      </>}
      {f >= bGap && <>
        <PopIn at={bGap} x={1100} y={420}>
          <rect x={-300} y={-150} width={600} height={300} rx={26} fill={K.white} stroke={OUT} strokeWidth={LW} />
          <text x={-150} y={-70} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={36} fill={OUT}>BUY</text>
          <text x={150} y={-70} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={36} fill={OUT}>SELL</text>
          <text x={-150} y={10} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={64} fill={K.loss}>$10.02</text>
          <text x={150} y={10} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={64} fill={K.gain}>$10.00</text>
          <text x={0} y={100} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={40} fill={OUT}>the gap = your cost</text>
        </PopIn>
        <PopText x={1100} y={720} at={cue("adds")} text="× 50 trades a day" size={60} font="caption" color={K.loss} stroke={OUT} />
      </>}
    </Stage>
  );
};

// ------------------------------------------------------------------ level 2
const S07: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const lev = cue("two-to-one") || cue("leverage");
  const surv = cue("survive");
  const journal = cue("writing");
  return (
    <Stage bg="room" cam={usePush(0.9, 0.95)}>
      <OnGround x={460}><Character look={YOU1} pose={[[0, "hold"], [cue("margin"), "present"], [cue("fatal"), "panic"], [surv, "count"], [journal, "hold"]]} hold={{ item: journal && f > journal ? "pen" : "cashStack" }}
        mood={[[0, "happy"], [cue("margin"), "grin"], [cue("fatal"), "shocked"], [surv, "neutral"]]} seed={1} /></OnGround>
      <OnGround x={850}><Character look={CAST.banker} pose="hold" hold={{ item: "moneyBag" }} mood="smug" enter={cue("broker") - 4} exit={lev + 10} seed={4} facing={-1} /></OnGround>
      <PopText x={850} y={300} at={cue("margin")} until={lev + 10} text="MARGIN = borrowed money" size={44} pill={K.white} />
      {f >= lev && f < surv && <PopIn at={lev} x={1150} y={560}>
        <rect x={-260} y={-300} width={200} height={300} rx={14} fill="#B8C6D9" stroke={OUT} strokeWidth={LW} />
        <rect x={60} y={-300} width={200} height={300} rx={14} fill="#B8C6D9" stroke={OUT} strokeWidth={LW} />
        <rect x={-260} y={-30} width={200} height={30} fill={K.loss} stroke={OUT} strokeWidth={4} />
        <rect x={60} y={-60} width={200} height={60} fill={K.loss} stroke={OUT} strokeWidth={4} />
        <text x={-160} y={60} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={40} fill={OUT}>NO LEVERAGE</text>
        <text x={160} y={60} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={40} fill={OUT}>2 : 1</text>
        <text x={-160} y={-330} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={60} fill={K.loss}>−10%</text>
        <text x={160} y={-330} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={60} fill={K.loss}>−20%</text>
      </PopIn>}
      {surv > 0 && <PopText x={1150} y={360} at={surv} text="RULE #1: SURVIVE" size={80} font="caption" color={K.yellow} stroke={OUT} />}
      {journal > 0 && <PopIn at={journal} x={1150} y={760}><Prop name="paper" label="TRADE JOURNAL" /></PopIn>}
      {journal > 0 && <PopText x={1150} y={940} at={cue("three")} text="same 3 mistakes" size={50} font="hand" />}
    </Stage>
  );
};

// ------------------------------------------------------------------ level 3
const S09: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const data = cue("here's");
  const day = cue("wake");
  return (
    <Stage bg="office" cam={usePush(0.9, 0.95)}>
      {f < data && <>
        <OnGround x={1000}><Desk w={520} /></OnGround>
        <OnGround x={760}><Character look={YOU3} pose={[[0, "cheer"], [cue("desk"), "type"]]} mood="grin" seed={1} /></OnGround>
        <PopText x={600} y={260} at={cue("quit")} text="I QUIT!" size={70} font="caption" color={K.loss} stroke={OUT} />
        <PopText x={1100} y={240} at={cue("monitors")} text="3 monitors" size={52} font="hand" />
      </>}
      {f >= data && f < day && <>
        <rect x={0} y={0} width={1920} height={1080} fill={PAPER} />
        <PopText x={540} y={160} at={data} text="BRAZIL · DAY TRADERS · 2013–15" size={42} pill={K.white} />
        <Waffle x={240} y={230} size={600} n={97} a={K.loss} b={K.gold} at={cue("kept") - 4} dur={30} />
        <PopText x={1240} y={420} at={cue("ninety-seven")} text="97% LOST MONEY" size={80} font="caption" color={K.loss} stroke={OUT} />
        <PopText x={1240} y={540} at={cue("hundred", 1)} text="(after 300+ days)" size={44} font="label" />
        <PopText x={1240} y={700} at={cue("minimum")} text="~1 in 100 beat minimum wage" size={50} pill={K.yellow} />
      </>}
      {f >= day && <>
        <OnGround x={1000}><Desk w={520} /></OnGround>
        <OnGround x={760}><Character look={YOU3} pose={[[0, "type"], [cue("lunch"), "facepalm"]]} mood={[[0, "neutral"], [cue("lunch"), "worried"]]} seed={1} /></OnGround>
        <PopText x={1300} y={220} at={cue("six")} text="6:00 news" size={50} pill={K.white} />
        <PopText x={1300} y={320} at={cue("open")} text="9:30 the open" size={50} pill={K.white} />
        <PopText x={1300} y={420} at={cue("lunch")} text="12:00 give it back?" size={50} pill={K.white} />
        <PopText x={1300} y={560} at={cue("salary")} text="no salary · no sick pay" size={50} font="hand" color={K.loss} />
      </>}
    </Stage>
  );
};

// ------------------------------------------------------------------ level 4
const S11: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const rules = cue("break");
  return (
    <Stage bg="city" cam={usePush(0.9, 0.95)}>
      <OnGround x={1350} dy={-6}><Building w={420} h={460} color="#D5E5C8" label="PROP FIRM" /></OnGround>
      <OnGround x={620}><Character look={YOU3} pose={[[0, "hold"], [cue("passed"), "cheer"], [rules, "panic"], [cue("genius"), "present"]]} hold={{ item: "paper", label: "TEST ✓" }}
        mood={[[0, "worried"], [cue("passed"), "grin"], [rules, "shocked"], [cue("genius"), "neutral"]]} seed={1} /></OnGround>
      <PopText x={620} y={240} at={cue("fee")} text="pay a fee → take the test" size={46} pill={K.white} />
      <Flow a={[1300, 640]} b={[700, 600]} at={cue("firm's")} count={6} />
      <PopText x={1350} y={260} at={cue("share")} text="you keep a share" size={50} pill={K.gain} color={K.white} />
      {f >= rules && <Stamp x={960} y={540} at={cue("gone")} text="ACCOUNT CLOSED" size={80} />}
      <PopText x={960} y={940} at={cue("blow")} text="job #1: don't blow up" size={56} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 5
const S13: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const rogue = cue("rogue");
  return (
    <Stage bg="trading" cam={usePush(0.9, 0.95)}>
      <OnGround x={560}><Character look={YOU5} pose={[[0, "present"], [cue("recorded"), "type"], [rogue, "idle"]]} mood={[[0, "smug"], [rogue, "worried"]]} seed={1} /></OnGround>
      <OnGround x={1000} s={0.95}><Character look={CAST.analyst} pose="hold" hold={{ item: "paper", label: "RISK" }} mood="neutral" enter={cue("risk") - 4} seed={12} facing={-1} /></OnGround>
      <PopText x={560} y={200} at={cue("badge")} text="suit · badge · loss limit" size={46} pill={K.white} />
      <PopText x={1000} y={240} at={cue("compliance")} text="compliance reads your messages" size={40} pill={K.white} />
      {f >= rogue && <PopIn at={rogue} x={1400} y={560}>
        <rect x={-300} y={-260} width={600} height={420} rx={14} fill={K.paper} stroke={OUT} strokeWidth={LW} transform="rotate(4)" />
        <text x={0} y={-170} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={38} fill={OUT} transform="rotate(4)">THE ROGUE TRADER</text>
        <text x={0} y={-60} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={76} fill={OUT} transform="rotate(4)">1995</text>
        <text x={0} y={30} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={44} fill={K.loss} transform="rotate(4)">Barings sinks</text>
        {[0, 1, 2].map((i) => <path key={i} d={`M -240 ${80 + i * 26} L 240 ${80 + i * 26}`} stroke="#B8BEC6" strokeWidth={8} strokeLinecap="round" transform="rotate(4)" />)}
      </PopIn>}
      <PopText x={1400} y={980} at={cue("hide")} text="hide a loss → bet bigger" size={48} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 6
const S15: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="office" cam={usePush(0.9, 0.95)}>
      <OnGround x={1000}><Desk w={520} chartColor={K.gain} /></OnGround>
      <OnGround x={760}><Character look={YOU5} pose={[[0, "present"], [cue("months"), "think"], [cue("year"), "cheer"]]} mood="happy" seed={1} /></OnGround>
      <PopText x={500} y={220} at={cue("pensions")} text="pensions · families" size={52} font="hand" />
      <PopText x={1350} y={220} at={cue("weeks")} text="weeks & months, not minutes" size={46} pill={K.white} />
      <PopText x={1350} y={360} at={cue("wrong", 2)} text="lose small when wrong" size={50} pill={K.yellow} />
      <Count x={1350} y={520} a={cue("million", 3)} b={cue("million", 3) + 20} to={1000000} prefix="+$" size={86} color={K.gain} stroke={OUT} />
      <PopText x={1350} y={620} at={cue("percent")} text="10% of $10M" size={44} font="label" />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 7
const S17: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const hire = cue("hire");
  return (
    <Stage bg="office" cam={usePush(0.9, 0.95)}>
      <OnGround x={560}><Character look={YOU7} pose={[[0, "present"], [cue("twenty"), "count"], [hire, "hips"], [cue("pull"), "facepalm"]]} mood={[[0, "smug"], [cue("pull"), "worried"]]} seed={1} /></OnGround>
      <PopText x={1200} y={260} at={cue("two")} text="2 & 20" size={150} font="caption" color={K.gold} stroke={OUT} />
      <PopText x={1200} y={400} at={cue("percent")} text="2% of the money, every year" size={44} pill={K.white} />
      <PopText x={1200} y={490} at={cue("profits")} text="20% of the profits" size={44} pill={K.white} />
      <Count x={1050} y={680} a={cue("million", 3)} b={cue("million", 3) + 20} to={2000000} prefix="$" suffix=" / yr" size={80} color={K.gain} stroke={OUT} />
      {f >= hire && [0, 1].map((i) => <OnGround key={i} x={1500 + i * 220} s={0.75}><Character look={crowdLook(120 + i)} pose="hold" hold={{ item: "laptop" }} mood="neutral" enter={hire + i * 6} seed={120 + i} /></OnGround>)}
      <Flow a={[700, 600]} b={[1800, 520]} at={cue("pull")} count={8} />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 8
const S19: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const fast = cue("fast");
  const rise = interpolate(f, [fast, fast + 40], [0, 1], clamp);
  return (
    <Stage bg="trading" cam={usePush(0.9, 0.95)}>
      <OnGround x={460}><Character look={YOU7} pose={[[0, "present"], [fast, "point"], [cue("team"), "hips"]]} mood={[[0, "smug"], [fast, "worried"], [cue("further"), "smug"]]} seed={1} /></OnGround>
      <PopIn at={fast - 6} x={1180} y={520}>
        <rect x={-320} y={-260} width={640} height={420} rx={20} fill="#0E1626" stroke={OUT} strokeWidth={LW} />
        <path d={`M -280 80 L ${-280 + 560 * rise} ${80 - 280 * rise}`} stroke={K.gain} strokeWidth={10} strokeLinecap="round" />
        <text x={0} y={-200} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={36} fill="#BFD0EA">your buying pushes the price</text>
      </PopIn>
      <PopText x={1180} y={830} at={cue("weeks")} text="weeks to build one position" size={50} pill={K.white} />
      <PopText x={1180} y={960} at={cue("fewer")} text="fewer · bigger · better" size={56} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 9
const S21: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const crash = cue("did");
  const drop = interpolate(f, [crash, crash + 24], [0, 1], clamp);
  return (
    <Stage bg="wallst" bgProps={{ sign: "LONDON" }} cam={usePush(0.9, 0.95)}>
      <PopText x={400} y={200} at={cue("september")} text="SEPTEMBER 1992" size={56} pill={K.white} />
      <g transform={`translate(1150 ${380 + drop * 420}) rotate(${drop * 160})`}>
        <circle r={150} fill={K.gold} stroke={OUT} strokeWidth={LW + 2} />
        <text y={60} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={190} fill={OUT}>£</text>
      </g>
      <OnGround x={480}><Character look={YOU7} pose={[[0, "think"], [crash, "cheer"], [cue("famous"), "idle"]]} mood={[[0, "smug"], [crash, "grin"], [cue("disappeared"), "worried"]]} seed={1} /></OnGround>
      <PopText x={1150} y={260} at={cue("pound")} text="bet: the pound will crash" size={46} pill={K.white} />
      <Count x={800} y={360} a={cue("billion")} b={cue("billion") + 20} to={1} prefix="~$" suffix=" BILLION" size={90} color={K.gain} stroke={OUT} />
      <PopText x={1350} y={960} at={cue("disappeared")} text="…and the funds that vanished" size={48} font="hand" color={K.loss} />
    </Stage>
  );
};

// ------------------------------------------------------------------ level 10
const S23: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="room" cam={usePush(0.9, 0.96)}>
      <OnGround x={640}><Character look={YOU10} pose="holdBoth" hold={{ item: "paper", label: "ANNUAL REPORT" }} mood="happy" seed={9} /></OnGround>
      <PopText x={1250} y={300} at={cue("forever")} text="favourite holding period:" size={50} pill={K.white} />
      <PopText x={1250} y={420} at={cue("forever")} text="FOREVER" size={120} font="caption" color={K.gold} stroke={OUT} />
      <PopText x={1250} y={600} at={cue("decades")} text="years. decades." size={56} font="hand" />
      <PopText x={1250} y={720} at={cue("reading")} text="mostly: reading" size={56} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ ending
const S24: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const data = LEVELS.map((_, i) => ({ trades: 50 / Math.pow(1.6, i), money: Math.pow(1.55, i) }));
  const t = interpolate(f, [cue("bottom"), cue("bottom") + 40], [0, 1], clamp);
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.04, 960, 540)}>
      <PopText x={500} y={150} at={cue("bottom")} text="TRADES" size={64} pill={K.loss} color={K.white} />
      <PopText x={1420} y={150} at={cue("top")} text="MONEY" size={64} pill={K.gain} color={K.white} />
      {data.map((d, i) => (
        <g key={i}>
          <text x={960} y={980 - i * 80} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={34} fill={OUT}>{i + 1}</text>
          <rect x={920 - (d.trades / 50) * 650 * t} y={950 - i * 80} width={(d.trades / 50) * 650 * t} height={50} rx={10} fill={K.loss} stroke={OUT} strokeWidth={3} />
          <rect x={1000} y={950 - i * 80} width={(d.money / Math.pow(1.55, 9)) * 650 * interpolate(f, [cue("top"), cue("top") + 40], [0, 1], clamp)} height={50} rx={10} fill={K.gain} stroke={OUT} strokeWidth={3} />
        </g>
      ))}
      <PopText x={960} y={80} at={cue("fees")} text="fees · spreads · mistakes" size={44} font="hand" />
    </Stage>
  );
};

const S25: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={NAVY} cam={usePush(1, 1.06, 960, 540)}>
      <OnGround x={560}><Character look={YOU1} pose="phone" hold={{ item: "phone" }} mood={[[0, "neutral"], [cue("less"), "surprised"]]} seed={1} /></OnGround>
      <TitleCard x={1260} y={480} title={"DO LESS."} size={130} at={cue("less")} color={K.yellow} w={760} />
    </Stage>
  );
};

const SHOTS = {
  s01: S01, s02: S02, s03: S03,
  s04: LevelCard(1, "$1,000", "the app"), s05: S05, s06: LevelCard(2, "$10,000", "leverage"), s07: S07,
  s08: LevelCard(3, "$25,000", "full time"), s09: S09, s10: LevelCard(4, "$100,000", "someone else's money"), s11: S11,
  s12: LevelCard(5, "$1 MILLION", "the bank desk"), s13: S13, s14: LevelCard(6, "$10 MILLION", "other people's money"), s15: S15,
  s16: LevelCard(7, "$100 MILLION", "your own fund"), s17: S17, s18: LevelCard(8, "$1 BILLION", "you move the market"), s19: S19,
  s20: LevelCard(9, "THE LEGEND", "one idea, sized to win"), s21: S21, s22: LevelCard(10, "THE PATIENT", "barely trades"), s23: S23,
  s24: S24, s25: S25,
};

export const Levels: React.FC = () => {
  const { width } = useVideoConfig();
  void width;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Explainer timing={T} shots={SHOTS} />
      <LadderHUD />
    </AbsoluteFill>
  );
};
void Arrow; void Bubble; void Screen;
