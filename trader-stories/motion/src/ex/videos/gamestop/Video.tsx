// LONG (format 2): "The GameStop Squeeze Explained Like You're 5"
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST, crowdLook, Look } from "../../kit/Character";
import { PopText, Bubble, Stamp, Arrow, Count, PopIn } from "../../kit/Ui";
import { Prop, Desk, Building } from "../../kit/Props";
import { Cycle, Flow, TitleCard, Burst, Chapter, Screen } from "../../kit/Diagrams";
import { CChart } from "../../kit/CChart";
import { CF, K, LW, OUT, SKIN, clamp, kf, pop } from "../../kit/style";

const T = timing as unknown as Timing;
export const GAMESTOP_FRAMES = T.total;
const PAPER = "#F3ECFF";
const FUND: Look = CAST.boss;
const FUND2: Look = { ...CAST.banker, jacket: "#3B3B44", tie: K.purple };
const KID: Look = { hair: "spiky", hairColor: "#6B3E1F", skin: SKIN[3], shirt: K.orange, pants: "#3E6FB0", height: 0.78 };

const usePush = (z0 = 1, z1 = 1.06, x = 960, y = 540): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x, y }], [s.frames, { z: z1, x, y }]];
};
const chapter = (n: number, title: string) => {
  const C: React.FC = () => <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}><Chapter n={n} title={title} color={K.red} /></Stage>;
  return C;
};
const Tag: React.FC<{ x: number; y: number; keys: [number, number][]; at?: number }> = ({ x, y, keys, at = 0 }) => {
  const f = useCurrentFrame();
  const v = kf(f, keys);
  return <PopIn at={at} x={x} y={y}><g transform="rotate(-6)"><path d="M -130 -60 L 90 -60 L 140 0 L 90 60 L -130 60 Z" fill={K.white} stroke={OUT} strokeWidth={LW} /><circle cx={90} cy={0} r={11} fill={PAPER} stroke={OUT} strokeWidth={4} />
    <text x={-20} y={24} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={68} fill={OUT}>${Math.round(v)}</text></g></PopIn>;
};
const Shop: React.FC<{ closed?: boolean }> = () => (
  <g>
    <Building w={520} h={360} color="#E7E2F2" />
    <rect x={-240} y={-430} width={480} height={80} rx={12} fill={K.red} stroke={OUT} strokeWidth={LW} />
    <text x={0} y={-376} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={52} fill={K.white}>GAMESTOP</text>
    <rect x={-80} y={-150} width={160} height={150} fill="#9FB6C9" stroke={OUT} strokeWidth={LW} />
  </g>
);

// ------------------------------------------------------------------ hook
const S01: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="wallst" cam={usePush(1, 1.08)}>
      <OnGround x={1300} s={0.9}><Shop /></OnGround>
      <OnGround x={420}><Character look={FUND} pose={[[0, "hips"], [cue("bet"), "point"]]} mood="smug" seed={4} /></OnGround>
      <OnGround x={700}><Character look={FUND2} pose="signR" hold={{ item: "sign", label: "SHORT" }} mood="smug" seed={5} /></OnGround>
      <PopText x={560} y={200} at={cue("powerful")} text="WALL STREET'S BIG PLAYERS" size={52} pill={K.white} />
      <Arrow a={[1700, 330]} b={[1700, 700]} at={cue("collapse") - 4} bend={0} color={K.loss} w={14} />
      <PopText x={1700} y={280} at={cue("collapse")} text="↓ $0" size={90} font="caption" color={K.loss} stroke={OUT} />
    </Stage>
  );
};

const S02: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const grow = cue("weeks");
  const v = f < grow ? 53000 : interpolate(f, [grow, cue("forty-eight") + 10], [53000, 47900000], { ...clamp, easing: (t) => t * t });
  return (
    <Stage bg="room" cam={usePush(1, 1.06)}>
      <OnGround x={1100}><Desk w={460} chartColor={K.gain} /></OnGround>
      <OnGround x={880}><Character look={CAST.headband} pose={[[0, "type"], [grow, "cheer"]]} mood={[[0, "smug"], [grow, "grin"]]} seed={8} /></OnGround>
      <PopText x={880} y={190} at={cue("headband")} text="a man in a red headband" size={48} font="hand" />
      <PopIn at={cue("fifty-three")} x={400} y={420}><rect x={-260} y={-90} width={520} height={160} rx={24} fill={K.white} stroke={OUT} strokeWidth={LW} />
        <text x={0} y={22} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={84} fill={v > 53000 ? K.gain : OUT}>${Math.round(v).toLocaleString("en-US")}</text></PopIn>
      <OnGround x={1650} s={0.85}><Character look={FUND} pose={[[0, "idle"], [cue("billions"), "panic"]]} mood={[[0, "smug"], [cue("billions"), "shocked"]]} enter={cue("funds") - 4} seed={4} facing={-1} /></OnGround>
      <PopText x={1650} y={300} at={cue("billions")} text="needs billions" size={50} pill={K.loss} color={K.white} />
    </Stage>
  );
};

const S03: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color="#FFE9A8" cam={usePush(1, 1.08)}>
      <OnGround x={560}><Character look={KID} pose={[[0, "idle"], [cue("five"), "cheer"]]} mood="grin" seed={7} jump={[cue("five")]} /></OnGround>
      <PopText x={1180} y={460} at={cue("explained")} text="EXPLAINED LIKE" size={84} font="caption" color={OUT} />
      <PopText x={1180} y={600} at={cue("five") - 4} text="YOU'RE 5" size={130} font="caption" color={K.red} stroke={OUT} />
    </Stage>
  );
};

const S04: React.FC = () => (
  <Stage bg="studio" color={K.red} cam={usePush(1, 1.06)}>
    <TitleCard x={960} y={520} kicker="EXPLAINED LIKE YOU'RE 5" title={"THE GAMESTOP\nSQUEEZE"} size={130} at={4} color={K.yellow} w={1300} />
    <Burst x={960} y={520} at={10} item="gamepad" n={14} spread={740} />
  </Stage>
);

// ------------------------------------------------------------------ 1. the dying shop
const S06: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="city" cam={usePush(1, 1.05)}>
      <OnGround x={960}><Shop /></OnGround>
      <PopIn at={cue("discs")} x={500} y={500}><Prop name="gamepad" /></PopIn>
      <PopIn at={cue("downloading")} x={1450} y={400}><g transform="scale(1.6)"><Prop name="laptop" /></g><path d="M 0 -170 L 0 -90 M -30 -120 L 0 -90 L 30 -120" stroke={K.blue} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" /></PopIn>
      <Stamp x={960} y={560} at={cue("pandemic") + 6} text="MALLS CLOSED" size={84} />
      <OnGround x={300}><Character look={FUND} pose="hold" hold={{ item: "magnifier" }} mood="smug" enter={cue("investors") - 4} seed={4} /></OnGround>
      <PopText x={300} y={330} at={cue("dying")} text="dying?" size={70} font="hand" color={K.loss} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 2. shorting like you're 5
const S08: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.06)}>
      <OnGround x={700}><Character look={FUND} pose="signR" hold={{ item: "sign", label: "IT'LL FAIL" }} mood="smug" seed={4} /></OnGround>
      <PopText x={1300} y={480} at={cue("short")} text="SHORT SELLING" size={90} font="caption" color={K.red} stroke={OUT} />
    </Stage>
  );
};

const S09: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const back = cue("buy");
  const price: [number, number][] = [[0, 10], [cue("drop"), 10], [cue("two") + 6, 2]];
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={300}><Character look={KID} pose={[[0, "present"], [cue("give"), "cheer"]]} mood="happy" seed={7} /></OnGround>
      <OnGround x={760}><Character look={CAST.sam} pose={[[0, "hold"], [cue("sell"), "present"], [back, "hold"], [cue("keep"), "cheer"]]} hold={f < cue("sell") || (f > back && f < cue("give")) ? { item: "car", scale: 0.45 } : undefined} mood="grin" seed={2} /></OnGround>
      <OnGround x={1300}><Character look={crowdLook(3)} pose="hold" hold={{ item: "cash" }} mood="happy" enter={cue("sell") - 6} seed={3} facing={-1} /></OnGround>
      <Flow a={[340, 600]} b={[720, 600]} at={cue("borrow")} count={1} item="car" s={0.4} dur={24} />
      <Flow a={[1260, 600]} b={[800, 600]} at={cue("sell") + 4} count={3} item="cash" />
      <Tag x={1550} y={250} keys={price} at={cue("worth")} />
      <PopText x={1550} y={390} at={cue("week")} text="next week…" size={48} font="hand" />
      <Count x={760} y={260} a={cue("keep")} b={cue("keep") + 14} to={8} prefix="+$" size={110} color={K.gain} stroke={OUT} />
      <PopText x={960} y={980} at={cue("short", 1)} text="WIN WHEN THE PRICE FALLS" size={58} pill={K.yellow} />
    </Stage>
  );
};

const S10: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const cmp = cue("b013");
  const up: [number, number][] = [[0, 10], [cue("up"), 10], [cue("owe"), 40], [cue("whatever"), 120]];
  return (
    <Stage bg="town" cam={usePush(1, 1.05)} shake={[[cue("whatever"), cue("whatever") + 10]]}>
      {f < cmp && <>
        <OnGround x={760}><Character look={CAST.sam} pose={[[0, "idle"], [cue("catch"), "think"], [cue("up"), "panic"]]} mood={[[0, "smug"], [cue("up"), "shocked"]]} seed={2} /></OnGround>
        <OnGround x={300}><Character look={KID} pose="hips" mood="neutral" seed={7} /></OnGround>
        <Bubble x={360} y={380} at={cue("owe")} text="My car, please!" w={320} />
        <Tag x={1400} y={300} keys={up} at={2} />
      </>}
      {f >= cmp && <>
        <rect x={-100} y={-100} width={2200} height={1300} fill={PAPER} />
        <PopIn at={cmp} x={560} y={540}><rect x={-330} y={-260} width={660} height={460} rx={30} fill={K.white} stroke={OUT} strokeWidth={LW} />
          <text x={0} y={-160} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={70} fill={K.gain}>BUY</text>
          <text x={0} y={-30} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={44} fill={OUT}>max loss:</text>
          <text x={0} y={90} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={66} fill={OUT}>what you paid</text></PopIn>
        <PopIn at={cue("short", 2)} x={1360} y={540}><rect x={-330} y={-260} width={660} height={460} rx={30} fill={K.white} stroke={OUT} strokeWidth={LW} />
          <text x={0} y={-160} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={70} fill={K.loss}>SHORT</text>
          <text x={0} y={-30} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={44} fill={OUT}>max loss:</text>
          <text x={0} y={130} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={190} fill={K.loss}>∞</text></PopIn>
      </>}
    </Stage>
  );
};

// ------------------------------------------------------------------ 3. too many shorts
const S12: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const n = Math.round(interpolate(f, [cue("sold"), cue("twenty-three") + 10], [0, 123], clamp));
  const play = cue("playground");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <rect x={300} y={200} width={600} height={600} rx={20} fill="none" stroke={OUT} strokeWidth={8} strokeDasharray="22 14" />
      <text x={600} y={180} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={40} fill={OUT}>ALL THE SHARES AVAILABLE</text>
      {Array.from({ length: n }).map((_, i) => {
        const r = Math.floor(i / 10), c = i % 10;
        return <rect key={i} x={306 + c * 59} y={206 + r * 59 - (r >= 10 ? 0 : 0)} width={50} height={50} rx={10} fill={i >= 100 ? K.loss : "#F6A69C"} stroke={OUT} strokeWidth={3} />;
      })}
      <PopText x={1400} y={420} at={cue("twenty-three")} text="~123%" size={150} font="caption" color={K.loss} stroke={OUT} />
      <PopText x={1400} y={540} at={cue("regulator")} text="sold short — SEC" size={50} pill={K.white} />
      {f >= play && <PopIn at={play} x={1400} y={820}>{Array.from({ length: 7 }).map((_, i) => <g key={i} transform={`translate(${-300 + i * 100} ${-(i % 2) * 40}) scale(0.4)`}><Prop name="car" color={[K.red, K.blue, K.green, K.yellow][i % 4]} /></g>)}
        <text x={0} y={60} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={40} fill={OUT}>more cars sold than exist</text></PopIn>}
    </Stage>
  );
};

// ------------------------------------------------------------------ 4. the man in the red headband
const S14: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const months = Math.min(16, Math.max(0, Math.floor((f - cue("month")) / 4)));
  return (
    <Stage bg="room" cam={usePush(1, 1.06)}>
      <OnGround x={1150}><Desk w={460} /></OnGround>
      <OnGround x={900}><Character look={CAST.headband} pose={[[0, "think"], [cue("believed"), "point"], [cue("posted"), "type"], [cue("trap"), "present"]]} mood={[[0, "neutral"], [cue("believed"), "smug"]]} seed={8} /></OnGround>
      <PopText x={900} y={180} at={cue("kitty")} text="Keith Gill · “Roaring Kitty”" size={50} pill={K.white} />
      <Screen x={120} y={180} w={560} h={360} at={cue("posted")} title="MY POSITION · 2019" lines={[{ text: "≈ $53,000", at: cue("fifty-three"), size: 80, color: OUT }]} />
      {f > cue("month") && <PopText x={400} y={680} at={cue("month")} text={`update #${months + 1}`} size={52} font="hand" />}
      <PopText x={1500} y={300} at={cue("videos")} text="▶ videos explaining why" size={44} pill={K.red} color={K.white} />
      <PopText x={1500} y={480} at={cue("trap")} text="THE SHORT SELLERS' TRAP" size={48} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 5. the squeeze
const S16: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopText x={960} y={95} at={cue("squeeze")} text="A SHORT SQUEEZE" size={66} pill={K.red} color={K.white} />
      <Cycle cx={960} cy={590} r={320} rx={560} spinFrom={cue("squeeze")}
        nodes={[{ text: "Price rises", at: cue("rising") }, { text: "Shorts buy back", at: cue("buy") }, { text: "Price rises more", at: cue("pushes") }, { text: "More shorts forced to buy", at: cue("forces") }]} nodeW={480} />
    </Stage>
  );
};

const S17: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="city" cam={usePush(1, 1.06)}>
      {Array.from({ length: 12 }).map((_, i) => <OnGround key={i} x={100 + (i % 6) * 320 + (i >= 6 ? 160 : 0)} dy={i >= 6 ? 60 : 0} s={i >= 6 ? 0.85 : 0.7}><Character look={crowdLook(200 + i)} pose={i % 3 ? "phone" : "cheer"} hold={i % 3 ? { item: "phone" } : undefined} mood="grin" enter={6 + i * 5} seed={200 + i} /></OnGround>)}
      <PopText x={960} y={190} at={cue("wallstreetbets")} text="r/WallStreetBets" size={72} pill={K.orange} color={K.white} />
    </Stage>
  );
};

const S18: React.FC = () => {
  const cue = useCue();
  const pts: [number, number][] = [[0, 17.25], [5, 19.94], [16, 347.51], [17, 483]];
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <CChart x={220} y={140} w={1480} h={800} xMax={17} yMax={500} title="GameStop share price, January 2021" at={2}
        xTicks={[0, 5, 17]} xLabel={(v) => ({ 0: "Jan 4", 5: "Jan 11", 16: "Jan 27", 17: "Jan 28" } as Record<number, string>)[v]} yTicks={[100, 200, 300, 400, 500]} yFmt={(v) => `$${v}`}
        series={[{ pts, color: K.gain, at: cue("eleventh"), dur: Math.max(30, cue("forty-seven") - cue("eleventh")) }]} />
      <PopText x={540} y={760} at={cue("twenty") } text="~$20" size={56} font="caption" color={OUT} />
      <PopText x={1250} y={330} at={cue("forty-seven")} text="$347 close" size={52} pill={K.white} />
      <PopText x={1380} y={210} at={cue("eighty-three")} text="$483 intraday high" size={52} pill={K.yellow} />
    </Stage>
  );
};

const S19: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="wallst" cam={usePush(1, 1.05)}>
      <OnGround x={960}><Building w={460} h={480} color="#D9D2E9" label="MELVIN CAPITAL" /></OnGround>
      <PopText x={960} y={270} at={cue("half")} text="−53% in January" size={64} font="caption" color={K.loss} stroke={OUT} />
      <OnGround x={300} s={0.85}><Building w={360} h={420} color="#C9D9E8" label="CITADEL" /></OnGround>
      <OnGround x={1620} s={0.85}><Building w={360} h={420} color="#E8D3B0" label="POINT72" /></OnGround>
      <Flow a={[360, 600]} b={[860, 640]} at={cue("citadel")} count={6} />
      <Flow a={[1560, 600]} b={[1060, 640]} at={cue("point72")} count={4} />
      <PopText x={960} y={150} at={cue("seven")} text="$2.75 BILLION" size={90} font="caption" color={K.gain} stroke={OUT} />
      <PopText x={960} y={1000} at={cue("group")} text="short sellers lost billions" size={50} pill={K.white} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 6. the buy button
const S21: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const off = cue("stopped");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={2} x={960} y={540}>
        <rect x={-260} y={-420} width={520} height={840} rx={60} fill={K.dark} stroke={OUT} strokeWidth={LW} />
        <rect x={-230} y={-380} width={460} height={760} rx={36} fill="#F4F8FB" />
        <text x={0} y={-250} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={64} fill={OUT}>GME</text>
        <rect x={-190} y={60} width={380} height={120} rx={60} fill={f >= off ? "#C9CDD3" : K.gain} stroke={OUT} strokeWidth={LW} />
        <text x={0} y={140} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={60} fill={K.white}>BUY</text>
        <rect x={-190} y={210} width={380} height={120} rx={60} fill={K.loss} stroke={OUT} strokeWidth={LW} />
        <text x={0} y={290} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={60} fill={K.white}>SELL</text>
        {f >= off && <path d="M -150 40 L 150 200 M 150 40 L -150 200" stroke={K.loss} strokeWidth={18} strokeLinecap="round" />}
      </PopIn>
      <PopText x={960} y={70} at={cue("twenty-eighth")} text="JANUARY 28, 2021" size={56} pill={K.white} />
      {[0, 1, 2].map((i) => <OnGround key={i} x={[300, 1480, 1700][i]} s={0.75}><Character look={crowdLook(300 + i)} pose={[[0, "idle"], [cue("furious"), "panic"], [cue("accused"), "point"]]} mood={[[0, "neutral"], [cue("furious"), "angry"]]} seed={300 + i} enter={cue("furious") - 6 + i * 4} facing={i > 0 ? -1 : 1} /></OnGround>)}
      <PopText x={1540} y={420} at={cue("sell")} text="sell: yes · buy: no" size={48} font="hand" />
      <PopText x={360} y={420} at={cue("dropped")} text="price drops ↓" size={56} font="caption" color={K.loss} stroke={OUT} />
    </Stage>
  );
};

const S22: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const hear = cue("congress");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      {f < hear ? <>
        <PopIn at={2} x={400} y={560}><g transform="scale(1.1)"><Building w={300} h={260} color="#E7E2F2" label="BROKER" /></g></PopIn>
        <PopIn at={cue("clearing")} x={1500} y={560}><g transform="scale(1.1)"><Building w={340} h={300} color="#D5E5C8" roof="columns" label="CLEARING HOUSE" /></g></PopIn>
        <rect x={580} y={380} width={720} height={60} rx={30} fill="#AEB3BC" stroke={OUT} strokeWidth={LW} />
        <Flow a={[600, 380]} b={[1300, 380]} at={cue("cash")} count={4} every={8} arc={40} />
        <Flow a={[600, 380]} b={[1300, 380]} at={cue("far")} count={14} every={3} arc={40} />
        <PopText x={960} y={240} at={cue("plumbing")} text="“the plumbing”" size={60} font="hand" />
        <PopText x={960} y={700} at={cue("far")} text="wild swings → post far more cash" size={50} pill={K.yellow} />
      </> : <>
        <OnGround x={700}><Building w={560} h={420} color="#EDE7DA" roof="columns" label="CONGRESS" /></OnGround>
        <PopIn at={cue("report")} x={1450} y={760} s={1.6}><Prop name="paper" label="REPORT" /></PopIn>
        <PopText x={960} y={160} at={cue("button")} text="…but the buy button was already gone" size={52} pill={K.white} />
      </>}
    </Stage>
  );
};

// ------------------------------------------------------------------ 7. who won?
const S24: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const early = cue("early");
  const melvin = cue("melvin");
  return (
    <Stage bg="city" cam={usePush(1, 1.05)}>
      {f < early && <>
        <OnGround x={760}><Character look={CAST.headband} pose="cheer" mood="grin" seed={8} /></OnGround>
        <PopText x={1300} y={420} at={cue("forty-eight")} text="≈ $48 MILLION" size={96} font="caption" color={K.gain} stroke={OUT} />
        <PopText x={1300} y={540} at={cue("paper")} text="(on paper)" size={56} font="hand" />
      </>}
      {f >= early && f < melvin && <>
        <OnGround x={560}><Character look={crowdLook(400)} pose="cheer" hold={{ item: "moneyBag" }} mood="grin" seed={400} /></OnGround>
        <OnGround x={1360}><Character look={crowdLook(401)} pose="facepalm" mood="sad" seed={401} /></OnGround>
        <PopText x={560} y={240} at={early} text="bought early" size={56} pill={K.gain} color={K.white} />
        <PopText x={1360} y={240} at={cue("top")} text="bought at $300–400" size={56} pill={K.loss} color={K.white} />
      </>}
      {f >= melvin && <>
        <OnGround x={960}><Building w={460} h={480} color="#D9D2E9" label="MELVIN CAPITAL" /></OnGround>
        <Stamp x={960} y={520} at={cue("closed")} text="CLOSED · 2022" size={96} />
      </>}
    </Stage>
  );
};

const S25: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const exit = cue("exit");
  const door = interpolate(f, [exit, exit + 30], [260, 80], clamp);
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <OnGround x={360}><Character look={KID} pose={[[0, "shrug"], [cue("short"), "point"]]} mood="neutral" seed={7} /></OnGround>
      <PopText x={1100} y={240} at={cue("doesn't")} text="the little guy usually loses" size={50} font="hand" />
      <PopText x={1100} y={380} at={cue("more")} text="short: lose MORE than everything" size={54} pill={K.loss} color={K.white} />
      {exit > 0 && f >= exit - 6 && <>
        <rect x={1500 - door / 2} y={520} width={door} height={340} rx={10} fill={K.wood} stroke={OUT} strokeWidth={LW} />
        <text x={1500} y={500} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={46} fill={OUT}>EXIT</text>
        {Array.from({ length: 6 }).map((_, i) => <OnGround key={i} x={760 + i * 110} s={0.55}><Character look={crowdLook(500 + i)} pose="panic" mood="shocked" seed={500 + i} facing={1} /></OnGround>)}
      </>}
    </Stage>
  );
};

const S26: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={K.navy} cam={usePush(1, 1.06)}>
      <TitleCard x={960} y={420} title={"BET IT GOES TO ZERO…"} size={100} at={2} color={K.white} w={1400} />
      <TitleCard x={960} y={720} title={"…NEARLY WENT THERE INSTEAD"} size={84} at={cue("nearly")} color={K.yellow} w={1500} />
    </Stage>
  );
};

const SHOTS = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: chapter(1, "THE DYING SHOP"), s06: S06, s07: chapter(2, "SHORTING, LIKE YOU'RE 5"), s08: S08, s09: S09, s10: S10,
  s11: chapter(3, "TOO MANY SHORTS"), s12: S12, s13: chapter(4, "THE MAN IN THE RED HEADBAND"), s14: S14, s15: chapter(5, "THE SQUEEZE"), s16: S16, s17: S17, s18: S18, s19: S19,
  s20: chapter(6, "THE BUY BUTTON"), s21: S21, s22: S22, s23: chapter(7, "WHO WON?"), s24: S24, s25: S25, s26: S26,
};

export const GameStop: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <Explainer timing={T} shots={SHOTS} />
  </AbsoluteFill>
);
void pop;
