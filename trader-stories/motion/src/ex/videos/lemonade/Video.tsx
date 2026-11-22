// LONG (format 4): "The Stock Market Explained With One Lemonade Stand"
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST, crowdLook, Look } from "../../kit/Character";
import { PopText, Bubble, Stamp, Arrow, Count, PopIn } from "../../kit/Ui";
import { Prop, LemonadeStand, Building } from "../../kit/Props";
import { Waffle, Flow, TitleCard, Burst, Chapter, Screen } from "../../kit/Diagrams";
import { CChart } from "../../kit/CChart";
import { CF, K, LW, OUT, SKIN, clamp, kf, rnd } from "../../kit/style";

const T = timing as unknown as Timing;
export const LEMONADE_FRAMES = T.total;
const PAPER = "#FDF1D6";
export const PENNY: Look = { hair: "curly", hairColor: "#C4552A", skin: SKIN[0], shirt: K.yellow, pants: "#3E6FB0", height: 0.82 };
const REX: Look = { ...CAST.trader, hair: "slick", hairColor: "#1A1A1A", jacket: "#3A3A44", tie: K.purple };

const usePush = (z0 = 1, z1 = 1.06, x = 960, y = 540): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x, y }], [s.frames, { z: z1, x, y }]];
};

/** Big price sign; value is keyframed per shot. */
const PriceTag: React.FC<{ x: number; y: number; keys: [number, number][]; at?: number; label?: string }> = ({ x, y, keys, at = 0, label = "PRICE PER SHARE" }) => {
  const f = useCurrentFrame();
  const v = kf(f, keys);
  const prev = kf(f - 3, keys);
  const col = v > prev + 0.01 ? K.gain : v < prev - 0.01 ? K.loss : OUT;
  return (
    <PopIn at={at} x={x} y={y}>
      <rect x={-250} y={-130} width={500} height={220} rx={26} fill={K.white} stroke={OUT} strokeWidth={LW + 1} />
      <text x={0} y={-80} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={32} fill={OUT} opacity={0.6}>{label}</text>
      <text x={0} y={40} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={110} fill={col}>${Math.round(v).toLocaleString("en-US")}</text>
    </PopIn>
  );
};

const Rain: React.FC<{ at: number; until?: number }> = ({ at, until }) => {
  const f = useCurrentFrame();
  if (f < at || (until !== undefined && f > until)) return null;
  return <g>{Array.from({ length: 70 }).map((_, i) => { const x = rnd(i) * 2000; const y = ((rnd(i + 9) * 1100 + (f - at) * 28) % 1150) - 60; return <path key={i} d={`M ${x} ${y} l -8 34`} stroke="#5AA0D8" strokeWidth={5} strokeLinecap="round" opacity={0.8} />; })}</g>;
};
const Bulb: React.FC = () => (
  <g><circle cx={0} cy={0} r={60} fill={K.lemon} stroke={OUT} strokeWidth={LW} /><rect x={-26} y={52} width={52} height={36} rx={8} fill="#AEB3BC" stroke={OUT} strokeWidth={LW} />
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <path key={i} d={`M ${Math.cos(i * 0.785) * 80} ${Math.sin(i * 0.785) * 80} L ${Math.cos(i * 0.785) * 110} ${Math.sin(i * 0.785) * 110}`} stroke={OUT} strokeWidth={8} strokeLinecap="round" />)}</g>
);

// ------------------------------------------------------------------ hook
const S01: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.07)}>
      <OnGround x={420}><Character look={CAST.sam} pose="phone" hold={{ item: "phone" }} mood={[[0, "happy"], [cue("single"), "surprised"], [cue("who"), "worried"]]} seed={2} /></OnGround>
      <Screen x={620} y={180} w={520} h={340} at={2} title="BUY 1 SHARE" lines={[{ text: "APPLE ✓", at: 10, size: 70, color: K.gain }]} />
      <OnGround x={1500} dy={-10}><Building w={360} h={460} color="#DDE6EE" label="APPLE" /></OnGround>
      <Stamp x={1500} y={430} at={cue("cent")} text="$0" size={150} />
      <PopText x={960} y={760} at={cue("who")} text="WHO GETS IT?" size={72} pill={K.yellow} />
      <PopText x={1300} y={920} at={cue("exist")} text="why does the stock market exist?" size={52} font="hand" />
    </Stage>
  );
};

const S02: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="town" cam={[[0, { z: 1.25, x: 1000, y: 620 }], [cue("stand") + 10, { z: 1.0, x: 960, y: 540 }]]}>
      <PopIn at={cue("lemonade") - 4} x={1100} y={890}><LemonadeStand /></PopIn>
      <OnGround x={700}><Character look={PENNY} pose={[[0, "idle"], [cue("stand"), "wave"]]} mood="grin" enter={cue("lemonade")} seed={3} /></OnGround>
    </Stage>
  );
};

const S03: React.FC = () => (
  <Stage bg="studio" color={K.teal} cam={usePush(1, 1.06)}>
    <TitleCard x={960} y={520} title={"THE STOCK MARKET\nEXPLAINED WITH ONE\nLEMONADE STAND"} size={96} at={4} />
    <Burst x={960} y={520} at={10} item="lemon" n={16} spread={760} />
  </Stage>
);

const chapter = (n: number, title: string) => {
  const C: React.FC = () => <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}><Chapter n={n} title={title} /></Stage>;
  return C;
};

// ------------------------------------------------------------------ 1. the stand
const S05: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={1150}><LemonadeStand price="$1" /></OnGround>
      <OnGround x={700}><Character look={PENNY} pose={[[0, "wave"], [cue("cup"), "hold"]]} hold={{ item: "cup" }} mood="happy" seed={3} /></OnGround>
      <PopText x={500} y={300} at={cue("dollar")} text="sells for $1" size={56} pill={K.white} />
      <PopText x={500} y={400} at={cue("forty")} text="costs 40¢" size={56} pill={K.white} />
      <Count x={1500} y={260} a={cue("thousand")} b={cue("thousand") + 24} to={1000} suffix=" cups" size={90} color={OUT} stroke={K.white} />
      <PopText x={1500} y={380} at={cue("profit")} text="$600 PROFIT" size={70} pill={K.gain} color={K.white} />
    </Stage>
  );
};

const S06: React.FC = () => {
  const cue = useCue();
  const b9 = cue("another");
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={1300}><LemonadeStand /></OnGround>
      <OnGround x={700}><Character look={PENNY} pose={[[0, "think"], [cue("borrow"), "shrug"], [b9, "cheer"]]} mood={[[0, "neutral"], [cue("rains"), "worried"], [b9, "grin"]]} seed={3} /></OnGround>
      <Bubble x={760} y={420} at={cue("second")} until={cue("borrow") - 2} text="A second stand?" w={360} think />
      <PopText x={1300} y={240} at={cue("thousand")} until={cue("borrow") - 2} text="needs $1,000" size={60} pill={K.white} />
      <OnGround x={300}><Character look={CAST.banker} pose="hold" hold={{ item: "paper", label: "LOAN" }} mood="smug" enter={cue("borrow")} exit={b9 - 4} seed={4} /></OnGround>
      <PopText x={300} y={330} at={cue("interest")} until={b9 - 4} text="+ interest" size={52} font="hand" />
      <Rain at={cue("rains")} until={b9 - 2} />
      <PopIn at={b9} x={700} y={260}><Bulb /></PopIn>
    </Stage>
  );
};

// ------------------------------------------------------------------ 2. selling slices
const S08: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const one = cue("each");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={0} x={480} y={860} s={0.8}><LemonadeStand /></PopIn>
      <Waffle x={980} y={170} size={680} n={100} a={K.lemon} b={K.lemon} at={cue("slices")} dur={30} />
      {f >= one && <rect x={980 + 6} y={170 + 6} width={56} height={56} rx={12} fill={K.orange} stroke={OUT} strokeWidth={5} transform={`translate(${0} ${Math.sin(f / 5) * 3})`} />}
      <PopText x={1320} y={130} at={cue("shares")} text="100 SHARES" size={66} pill={K.white} />
      <PopText x={1320} y={950} at={one} text="1 share = 1% of everything" size={52} pill={K.orange} />
      <Arrow a={[720, 600]} b={[960, 520]} at={cue("slices")} />
    </Stage>
  );
};

const S09: React.FC = () => {
  const cue = useCue();
  const b13 = cue("b013");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <Waffle x={160} y={170} size={620} n={60} a={K.lemon} b={K.teal} at={cue("keeps")} atB={cue("forty") - 2} dur={24} />
      <PopText x={470} y={120} at={cue("keeps")} text="Penny keeps 60" size={54} pill={K.lemon} />
      <PopText x={470} y={900} at={cue("forty")} text="40 sold at $25" size={54} pill={K.teal} color={K.white} />
      <OnGround x={1200}><Character look={PENNY} pose={[[0, "idle"], [b13, "cheer"]]} mood="happy" seed={3} /></OnGround>
      {[0, 1, 2].map((i) => <OnGround key={i} x={1480 + i * 150} s={0.8}><Character look={i === 0 ? CAST.grandma : crowdLook(30 + i)} pose="hold" hold={{ item: "cash" }} mood="happy" seed={30 + i} facing={-1} enter={cue("neighbours") + i * 4} /></OnGround>)}
      <Flow a={[1500, 600]} b={[1230, 560]} at={cue("twenty-five") + 4} count={8} every={4} />
      <Count x={1300} y={240} a={b13} b={b13 + 20} to={1000} prefix="$" size={100} color={K.gain} stroke={OUT} />
      <PopText x={1600} y={160} at={cue("own")} text="neighbours now own 40%" size={44} font="hand" />
    </Stage>
  );
};

const S10: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={1000}><LemonadeStand /></OnGround>
      <OnGround x={1560} s={0.8}><LemonadeStand sign="LEMONADE 2" /></OnGround>
      <OnGround x={420}><Character look={CAST.grandma} pose={[[0, "hold"], [cue("dividend") - 6, "cheer"]]} hold={{ item: "sign", label: "10 shares" }} mood="happy" seed={6} /></OnGround>
      <OnGround x={760} s={0.95}><Character look={PENNY} pose="present" mood="happy" seed={3} /></OnGround>
      <PopText x={1250} y={240} at={cue("twelve")} text="$1,200 a year" size={66} pill={K.white} />
      <PopText x={420} y={180} at={cue("belongs")} text="10% = $120" size={60} pill={K.gain} color={K.white} />
      <Flow a={[900, 700]} b={[460, 640]} at={cue("pays")} count={6} item="coin" />
      <PopText x={680} y={940} at={cue("dividend")} text="= A DIVIDEND" size={70} font="caption" stroke={OUT} color={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 3. going public
const S12: React.FC = () => {
  const cue = useCue();
  const b19 = cue("b019");
  return (
    <Stage bg="wallst" cam={usePush(1, 1.06)}>
      <PopText x={300} y={170} at={2} text="1980" size={110} font="caption" color={K.white} stroke={OUT} />
      <OnGround x={960} dy={-6}><Building w={420} h={520} color="#DDE6EE" label="APPLE" /></OnGround>
      <PopText x={960} y={150} at={cue("public")} text="SHARES FOR SALE" size={52} pill={K.yellow} />
      <PopText x={1500} y={380} at={cue("i.")} text="IPO" size={110} font="caption" color={K.white} stroke={OUT} />
      <PopText x={1500} y={480} at={cue("initial")} text="initial public offering" size={42} pill={K.white} />
      <PopText x={500} y={420} at={cue("twenty-two")} text="$22 a share" size={66} pill={K.white} />
      <Count x={1460} y={680} a={cue("hundred")} b={cue("hundred") + 22} to={100} prefix="$" suffix="M+" size={110} color={K.gain} stroke={OUT} />
      <Flow a={[300, 700]} b={[900, 640]} at={cue("raised")} count={10} every={4} />
      {b19 > 0 && <Stamp x={960} y={360} at={cue("only")} text="THE ONLY TIME" size={90} color={K.blue} />}
    </Stage>
  );
};

// ------------------------------------------------------------------ 4. the market
const S14: React.FC = () => {
  const cue = useCue();
  const deal = cue("b023");
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={1450} s={0.8}><LemonadeStand /></OnGround>
      <OnGround x={500}><Character look={CAST.grandma} pose={[[0, "think"], [deal, "cheer"]]} hold={{ item: "paper", label: "10 SHARES" }} mood={[[0, "neutral"], [deal, "happy"]]} seed={6} /></OnGround>
      <Bubble x={560} y={420} at={cue("bicycle")} until={cue("can't") - 2} text="I'd like a new bike!" w={380} think />
      <OnGround x={1450}><Character look={PENNY} pose={[[0, "idle"], [cue("can't"), "stop"], [cue("nothing"), "shrug"]]} mood={[[0, "neutral"], [cue("nothing"), "surprised"]]} facing={-1} seed={3} /></OnGround>
      <OnGround x={960}><Character look={CAST.sam} pose={[[0, "idle"], [cue("offers"), "present"]]} hold={{ item: "cash" }} mood="happy" enter={cue("sam") - 6} seed={2} facing={-1} /></OnGround>
      <Bubble x={1000} y={420} at={cue("offers")} until={deal + 4} text="$30 a share?" w={300} side="right" />
      <Flow a={[930, 600]} b={[540, 600]} at={deal} count={6} item="cash" />
      <Flow a={[540, 620]} b={[930, 620]} at={cue("gets", 2)} count={1} item="paper" s={0.6} arc={160} dur={30} />
      <PopText x={500} y={260} at={deal + 6} text="+$300" size={70} font="caption" color={K.gain} stroke={OUT} />
      <PopText x={1450} y={300} at={cue("nothing")} text="$0" size={100} font="caption" color={K.loss} stroke={OUT} />
    </Stage>
  );
};

const Node: React.FC<{ x: number; y: number; label: string; color: string; w?: number; at: number }> = ({ x, y, label, color, w = 420, at }) => (
  <PopIn at={at} x={x} y={y}><rect x={-w / 2 + 10} y={-56} width={w} height={120} rx={30} fill={OUT} /><rect x={-w / 2} y={-66} width={w} height={120} rx={30} fill={color} stroke={OUT} strokeWidth={LW} />
    <text x={0} y={10} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={48} fill={OUT}>{label}</text></PopIn>
);

const MarketMap: React.FC<{ a: number; b: number; c: number; d?: number }> = ({ a, b, c, d }) => (
  <g>
    <Node x={960} y={190} label="THE COMPANY" color={K.yellow} w={520} at={a} />
    <Arrow a={[960, 260]} b={[960, 450]} at={a + 10} bend={0} />
    <PopText x={1170} y={370} at={a + 14} text="sells shares ONCE (IPO)" size={40} font="hand" anchor="start" />
    <Node x={960} y={540} label="FIRST INVESTORS" color={K.white} w={560} at={a + 8} />
    <Node x={560} y={850} label="INVESTOR" color={K.teal} at={b} />
    <Node x={1360} y={850} label="INVESTOR" color={K.teal} at={b + 4} />
    <Arrow a={[780, 820]} b={[1140, 820]} at={b + 10} bend={-0.12} />
    <Arrow a={[1140, 890]} b={[780, 890]} at={b + 16} bend={-0.12} />
    <PopText x={960} y={1010} at={c} text="THE STOCK MARKET: owners trading with owners" size={44} pill={K.white} />
    {d !== undefined && <Stamp x={1560} y={540} at={d} text="NOT INVOLVED" size={56} color={K.blue} rot={8} />}
  </g>
);

const S15: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.04)}>
      <MarketMap a={0} b={cue("owners") - 10} c={cue("trade")} d={cue("involved")} />
      <PopText x={420} y={360} at={cue("whoever")} text="your money → whoever sold you the share" size={42} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 5. the price
const S17: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <OnGround x={1000}><LemonadeStand /></OnGround>
      <OnGround x={600}><Character look={PENNY} pose={[[0, "think"], [cue("helps"), "cheer"]]} mood={[[0, "neutral"], [cue("helps"), "happy"]]} seed={3} /></OnGround>
      <PopText x={960} y={190} at={cue("vote")} text="the town's vote on what it's worth" size={52} pill={K.white} />
      <PopText x={1480} y={330} at={cue("hundred")} text="100 shares × $30" size={56} pill={K.white} />
      <PopText x={1480} y={440} at={cue("three")} text="= $3,000" size={90} font="caption" color={K.gain} stroke={OUT} />
      <PopText x={1480} y={560} at={cue("capitalisation")} text="MARKET CAP" size={56} pill={K.yellow} />
      <PopText x={600} y={330} at={cue("new")} text="sell new shares for more" size={44} font="hand" />
    </Stage>
  );
};

const S18: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const tilt = Math.sin(f / 14) * 6;
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <g transform={`translate(960 520) rotate(${tilt})`}>
        <rect x={-600} y={-12} width={1200} height={24} rx={12} fill={K.wood} stroke={OUT} strokeWidth={LW} />
        <PopIn at={cue("buy")} x={-430} y={-12}><rect x={-150} y={-120} width={300} height={110} rx={20} fill={K.gain} stroke={OUT} strokeWidth={LW} /><text y={-48} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={52} fill={K.white}>BUYERS</text></PopIn>
        <PopIn at={cue("sell")} x={430} y={-12}><rect x={-150} y={-120} width={300} height={110} rx={20} fill={K.loss} stroke={OUT} strokeWidth={LW} /><text y={-48} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={52} fill={K.white}>SELLERS</text></PopIn>
      </g>
      <path d="M 960 532 L 900 760 L 1020 760 Z" fill={K.grey} stroke={OUT} strokeWidth={LW} />
      <PopText x={960} y={200} at={cue("two")} text="JUST TWO THINGS" size={64} pill={K.yellow} />
    </Stage>
  );
};

const S19: React.FC = () => {
  const cue = useCue();
  const keys: [number, number][] = [[0, 30], [cue("fifty") - 10, 30], [cue("fifty") + 6, 50], [cue("sellers") - 4, 50], [cue("twenty") + 6, 20]];
  return (
    <Stage bg="town" cam={usePush(1, 1.05)}>
      <PopIn at={cue("heatwave")} until={cue("rumour") - 4} x={300} y={220}><circle r={110} fill={K.orange} stroke={OUT} strokeWidth={LW} /><text y={20} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={44} fill={OUT}>HOT!</text></PopIn>
      <PopIn at={cue("juice")} x={360} y={890}><Building w={300} h={260} color="#E9D5F5" label="JUICE BAR" /></PopIn>
      <OnGround x={1100} s={0.85}><LemonadeStand /></OnGround>
      {Array.from({ length: 5 }).map((_, i) => <OnGround key={i} x={700 + i * 120} s={0.6}><Character look={crowdLook(70 + i)} walk={false} pose={[[0, "idle"], [cue("buyers"), "cheer"], [cue("sellers"), "panic"]]} mood={[[0, "neutral"], [cue("buyers"), "grin"], [cue("sellers"), "shocked"]]} seed={70 + i} enter={cue("buyers") - 6 + i * 3} /></OnGround>)}
      <PriceTag x={1560} y={230} keys={keys} at={2} />
      <PopText x={1560} y={420} at={cue("lemons")} text="same lemons." size={56} font="hand" />
      <PopText x={1560} y={500} at={cue("expect")} text="different expectations" size={46} pill={K.white} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 6. the bubble
const S21: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const top = cue("thousand");
  const popAt = cue("bubble");
  const keys: [number, number][] = [[0, 20], [cue("spreads"), 60], [cue("buying"), 180], [cue("someone"), 400], [top + 8, 1000]];
  const r = interpolate(f, [cue("spreads"), top + 10], [120, 380], clamp);
  return (
    <Stage bg="town" cam={usePush(1, 1.07)} shake={[[popAt, popAt + 10]]}>
      <OnGround x={1000} s={0.85}><LemonadeStand /></OnGround>
      {f < popAt && <circle cx={1000} cy={600} r={r} fill="rgba(160,215,255,0.28)" stroke="#6FB7E8" strokeWidth={8} />}
      {f < popAt && <circle cx={1000 - r * 0.45} cy={600 - r * 0.5} r={r * 0.12} fill="rgba(255,255,255,0.7)" />}
      {Array.from({ length: 8 }).map((_, i) => <OnGround key={i} x={140 + (i % 4) * 130 + (i >= 4 ? 1290 : 0)} s={0.6}><Character look={crowdLook(80 + i)} pose={[[0, "cheer"], [popAt, "panic"]]} mood={[[0, "grin"], [popAt, "shocked"]]} seed={80 + i} enter={cue("spreads") + i * 6} /></OnGround>)}
      <PriceTag x={1000} y={170} keys={keys} at={2} />
      <PopText x={500} y={360} at={top} text="business: $1,200/yr" size={46} pill={K.white} />
      <PopText x={1500} y={360} at={top + 8} text="priced at $100,000" size={46} pill={K.loss} color={K.white} />
      <PopText x={1000} y={980} at={cue("eighty")} text="80+ years of profits" size={56} pill={K.yellow} />
      <Burst x={1000} y={600} at={popAt} item="lemon" n={14} spread={600} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 7. the short seller
const S23: React.FC = () => {
  const cue = useCue();
  const b44 = cue("b044");
  return (
    <Stage bg="city" cam={usePush(1, 1.05)}>
      <OnGround x={480}><Character look={CAST.sam} pose={[[0, "idle"], [cue("borrows"), "present"]]} mood="neutral" seed={2} /></OnGround>
      <OnGround x={1000}><Character look={REX} pose={[[0, "think"], [cue("sells"), "hold"], [cue("crashes"), "count"], [b44, "shrug"]]} hold={{ item: "cash" }} mood={[[0, "smug"], [b44, "worried"]]} facing={-1} seed={11} /></OnGround>
      <PopText x={1000} y={300} at={cue("crazy")} until={cue("borrows") - 2} text="that price is crazy" size={50} font="hand" />
      <Flow a={[520, 600]} b={[960, 600]} at={cue("borrows")} count={3} item="paper" s={0.5} />
      <PopText x={740} y={330} at={cue("borrows") + 6} text="borrows 10 shares" size={44} pill={K.white} />
      <PopText x={1450} y={300} at={cue("each")} text="sells: 10 × $1,000" size={50} pill={K.gain} color={K.white} />
      <PopText x={1450} y={420} at={cue("cheap")} text="buy back cheap" size={46} pill={K.white} />
      <PopText x={1450} y={520} at={cue("return")} text="return 10 shares" size={46} pill={K.white} />
      <PopText x={1450} y={620} at={cue("difference")} text="keep the difference" size={46} pill={K.yellow} />
      <PopText x={960} y={160} at={cue("short", 1)} text="SHORT SELLING" size={70} pill={K.yellow} />
      <Stamp x={1450} y={820} at={cue("limit")} text="NO LIMIT" size={100} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 8. the crash
const S25: React.FC = () => {
  const cue = useCue();
  const keys: [number, number][] = [[0, 1000], [cue("thousand"), 1000], [cue("five"), 500], [cue("hundred", 2), 100], [cue("forty"), 40]];
  return (
    <Stage bg="town" tint="rgba(230,120,40,0.16)" cam={usePush(1, 1.06)} shake={[[cue("forty"), cue("forty") + 8]]}>
      <OnGround x={1000} s={0.85}><LemonadeStand /></OnGround>
      {Array.from({ length: 6 }).map((_, i) => <OnGround key={i} x={200 + i * 300} s={0.6}><Character look={crowdLook(90 + i)} pose={[[0, "idle"], [cue("everybody"), "panic"]]} mood={[[0, "worried"], [cue("everybody"), "shocked"]]} seed={90 + i} /></OnGround>)}
      <PriceTag x={1000} y={200} keys={keys} at={2} />
      <PopText x={320} y={200} at={cue("autumn")} text="AUTUMN" size={60} pill={K.orange} />
    </Stage>
  );
};

const S26: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="city" cam={usePush(1, 1.05)}>
      <OnGround x={700}><Character look={REX} pose={[[0, "hold"], [cue("keeps"), "cheer"]]} hold={{ item: "moneyBag" }} mood="grin" seed={11} /></OnGround>
      <OnGround x={1300}><Character look={CAST.sam} pose="idle" hold={{ item: "paper", label: "10 SHARES" }} mood="neutral" seed={2} facing={-1} /></OnGround>
      <PopText x={960} y={190} at={cue("forty")} text="buys back at $40" size={54} pill={K.white} />
      <Count x={700} y={330} a={cue("nine")} b={cue("nine") + 20} to={9600} prefix="+$" size={110} color={K.gain} stroke={OUT} />
      <PopText x={1400} y={330} at={cue("top")} text="bought at the top: ouch" size={46} font="hand" color={K.loss} />
    </Stage>
  );
};

const S27: React.FC = () => {
  const cue = useCue();
  const pts: [number, number][] = [[0, 30], [1, 50], [2, 20], [3, 60], [4, 180], [5, 400], [6, 1000], [7, 500], [8, 100], [9, 40]];
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <CChart x={760} y={160} w={1060} h={620} xMax={9} yMax={1050} title="Penny's share price" at={2} xTicks={[]} yTicks={[500, 1000]} yFmt={(v) => `$${v}`}
        series={[{ pts, color: K.loss, at: 6, dur: 40 }, { pts: pts.map(([x]) => [x, 12] as [number, number]), color: K.gain, label: "the business", at: cue("tastes"), dur: 30 }]} />
      <OnGround x={380}><Character look={PENNY} pose="hold" hold={{ item: "cup" }} mood="happy" seed={3} /></OnGround>
      <PopText x={1290} y={900} at={cue("price", 1)} text="only the price changed" size={52} pill={K.yellow} />
    </Stage>
  );
};

const S28: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.04)}>
      <MarketMap a={0} b={cue("after") - 6} c={cue("owners")} />
      <PopText x={420} y={360} at={cue("deal")} text="price = the latest deal" size={46} pill={K.yellow} />
    </Stage>
  );
};

const S29: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.08)}>
      <OnGround x={560}><Character look={CAST.sam} pose="phone" hold={{ item: "phone" }} mood={[[0, "neutral"], [cue("slice"), "happy"]]} seed={2} /></OnGround>
      <OnGround x={1360}><Character look={crowdLook(5)} pose={[[0, "idle"], [cue("cash"), "cheer"]]} hold={{ item: "cash" }} mood="happy" seed={5} facing={-1} /></OnGround>
      <Flow a={[620, 600]} b={[1320, 600]} at={cue("buying")} count={5} />
      <PopText x={960} y={240} at={cue("slice")} text="a slice of the future" size={80} font="caption" color={K.yellow} stroke={OUT} />
    </Stage>
  );
};

const SHOTS = {
  s01: S01, s02: S02, s03: S03, s04: chapter(1, "THE STAND"), s05: S05, s06: S06, s07: chapter(2, "SELLING SLICES"), s08: S08, s09: S09, s10: S10,
  s11: chapter(3, "GOING PUBLIC"), s12: S12, s13: chapter(4, "THE MARKET"), s14: S14, s15: S15, s16: chapter(5, "WHAT MOVES THE PRICE"), s17: S17, s18: S18, s19: S19,
  s20: chapter(6, "THE BUBBLE"), s21: S21, s22: chapter(7, "THE SHORT SELLER"), s23: S23, s24: chapter(8, "THE CRASH"), s25: S25, s26: S26, s27: S27, s28: S28, s29: S29,
};

export const Lemonade: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <Explainer timing={T} shots={SHOTS} />
  </AbsoluteFill>
);
