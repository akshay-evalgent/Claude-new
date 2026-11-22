// LONG (format 3): "If You Don't Understand How Banks Create Money, You Don't Understand Money"
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import timing from "./timing.json";
import { Explainer, Timing, useCue, useShot } from "../../engine";
import { Stage, OnGround, CamKey } from "../../kit/Stage";
import { Character, CAST, crowdLook } from "../../kit/Character";
import { PopText, Bubble, Stamp, Arrow, Count, PopIn } from "../../kit/Ui";
import { Prop, Desk, Building } from "../../kit/Props";
import { TAccount, Waffle, Cycle, Screen, Dial, Flow, TitleCard, Burst, QuoteCard, Chapter } from "../../kit/Diagrams";
import { CF, K, LW, OUT, clamp } from "../../kit/style";

const T = timing as unknown as Timing;
export const BANKS_FRAMES = T.total;
const PAPER = "#F6E9D2";

/** Every shot drifts slightly so the frame is never static. */
const usePush = (z0 = 1, z1 = 1.06, x = 960, y = 540): CamKey[] => {
  const s = useShot();
  return [[0, { z: z0, x, y }], [s.frames, { z: z1, x, y }]];
};
const end = () => 99999;

// ------------------------------------------------------------------ hook
const S01: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="bank" bgProps={{ sign: "BANK" }} cam={usePush(1, 1.08)}>
      <OnGround x={0}><g /></OnGround>
      <WalkIn from={-200} to={560} at={0} dur={50} look={CAST.lena} hold="cash" mood={[[0, "neutral"], [cue("where"), "worried"]]} lookAt={[[0, [0.3, 0]], [cue("where"), [0.6, -0.4]]]} />
      <PopText x={560} y={330} at={cue("thousand")} text="$1,000" size={64} pill={K.white} />
      <Bubble x={640} y={410} at={cue("where")} until={cue("most") - 4} text="Where does it go?" w={380} think />
      <PopIn at={cue("keeps")} x={960} y={790}><Prop name="cashStack" /><text x={0} y={60} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={34} fill={OUT}>keeps a little</text></PopIn>
      <Flow a={[1000, 760]} b={[1500, 700]} at={cue("lends")} count={6} every={5} />
      <OnGround x={1560}><Character look={CAST.sam} pose={[[0, "idle"], [cue("lends") + 20, "cheer"]]} mood="happy" enter={cue("lends") - 10} seed={3} /></OnGround>
    </Stage>
  );
};

const WalkIn: React.FC<{ from: number; to: number; at: number; dur: number; look: typeof CAST.sam; hold?: Parameters<typeof Prop>[0]["name"]; mood?: React.ComponentProps<typeof Character>["mood"]; lookAt?: React.ComponentProps<typeof Character>["lookAt"]; s?: number; facing?: 1 | -1; pose?: React.ComponentProps<typeof Character>["pose"] }> =
  ({ from, to, at, dur, look, hold, mood, lookAt, s = 1, facing = 1, pose }) => {
    const f = useCurrentFrame();
    const x = interpolate(f, [at, at + dur], [from, to], clamp);
    const walking = f > at && f < at + dur;
    return <OnGround x={x} s={s}><Character look={look} walk={walking} pose={walking ? undefined : pose ?? (hold ? "hold" : "idle")} hold={hold ? { item: hold } : undefined} mood={mood} lookAt={lookAt} facing={facing} seed={7} /></OnGround>;
  };

const S02: React.FC = () => {
  const cue = useCue();
  const not = cue("not");
  return (
    <Stage bg="studio" color={PAPER} cam={[[0, { z: 1 }], [not, { z: 1.04 }], [not + 6, { z: 1.12 }]]} shake={[[not, not + 12]]}>
      <OnGround x={700}><Character look={CAST.lena} pose={[[0, "present"], [not, "shrug"]]} mood={[[0, "happy"], [not, "shocked"]]} seed={2} /></OnGround>
      <OnGround x={1220}><Character look={CAST.sam} pose={[[0, "think"], [not, "panic"]]} mood={[[0, "neutral"], [not, "surprised"]]} seed={5} facing={-1} /></OnGround>
      <PopText x={960} y={240} at={cue("taught")} until={not - 3} text="what we're taught" size={58} font="hand" />
      <Stamp x={960} y={300} at={not} text="NOT HOW IT WORKS" size={96} />
    </Stage>
  );
};

const S03: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="office" cam={usePush(1, 1.1, 960, 520)}>
      <OnGround x={1220}><Desk w={420} /></OnGround>
      <OnGround x={1080}><Character look={CAST.banker} pose={[[0, "idle"], [cue("types") - 4, "type"]]} mood={[[0, "neutral"], [cue("types"), "smug"]]} seed={4} /></OnGround>
      <OnGround x={420}><Character look={CAST.sam} pose="idle" mood={[[0, "neutral"], [cue("existence"), "surprised"]]} seed={6} /></OnGround>
      <PopIn at={cue("savings")} until={cue("types") - 4} x={700} y={420}><Prop name="piggy" /><path d="M -80 -110 L 80 10 M 80 -110 L -80 10" stroke={K.loss} strokeWidth={16} strokeLinecap="round" /></PopIn>
      <Screen x={560} y={130} w={760} h={380} at={cue("types") - 6} title="NEW LOAN" lines={[{ text: "+ $10,000", at: cue("brand"), color: K.gain, size: 110, cps: 0.8 }]} />
      <Burst x={940} y={330} at={cue("existence")} item="cash" />
    </Stage>
  );
};

const S04: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={0} x={620} y={560} until={cue("booms") - 6}>
        <g transform="rotate(-4)">
          <rect x={-300} y={-380} width={600} height={760} rx={18} fill={K.white} stroke={OUT} strokeWidth={LW} />
          <rect x={-300} y={-380} width={600} height={110} rx={18} fill="#2E3F6B" stroke={OUT} strokeWidth={LW} />
          <text x={0} y={-312} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={34} fill={K.white}>Quarterly Bulletin 2014 Q1</text>
          <text x={-250} y={-200} fontFamily={CF.label} fontWeight={700} fontSize={50} fill={OUT}>Money creation</text>
          <text x={-250} y={-140} fontFamily={CF.label} fontWeight={700} fontSize={50} fill={OUT}>in the modern</text>
          <text x={-250} y={-80} fontFamily={CF.label} fontWeight={700} fontSize={50} fill={OUT}>economy</text>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <path key={i} d={`M -250 ${0 + i * 44} L ${i % 3 === 2 ? 120 : 250} ${0 + i * 44}`} stroke="#B8BEC6" strokeWidth={10} strokeLinecap="round" />)}
          <text x={0} y={350} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={30} fill={OUT} opacity={0.6}>Bank of England</text>
        </g>
      </PopIn>
      <PopText x={1320} y={380} at={cue("conspiracy")} until={cue("booms") - 6} text="conspiracy theory" size={64} font="hand" />
      {cue("conspiracy") > 0 && <PopIn at={cue("it's", 1) + 6} until={cue("booms") - 6} x={1320} y={360}><path d="M -260 -10 L 260 -10" stroke={K.loss} strokeWidth={14} strokeLinecap="round" /></PopIn>}
      <PopText x={1320} y={560} at={cue("england")} until={cue("booms") - 6} text="the central bank" size={64} pill={K.yellow} />
      <PopText x={1320} y={720} at={cue("twenty")} until={cue("booms") - 6} text="2014" size={80} font="caption" />
      <PopIn at={cue("booms")} x={420} y={560} from="up"><Icon label="BOOMS" color={K.gain} glyph="↑" /></PopIn>
      <PopIn at={cue("crashes")} x={960} y={560} from="up"><Icon label="CRASHES" color={K.loss} glyph="↓" /></PopIn>
      <PopIn at={cue("account")} x={1500} y={560} from="up"><Icon label="YOUR BALANCE" color={K.blue} glyph="?" /></PopIn>
    </Stage>
  );
};
const Icon: React.FC<{ label: string; color: string; glyph: string }> = ({ label, color, glyph }) => (
  <g>
    <circle cx={0} cy={-60} r={150} fill={color} stroke={OUT} strokeWidth={LW + 2} />
    <text x={0} y={0} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={190} fill={K.white} stroke={OUT} strokeWidth={8} paintOrder="stroke">{glyph}</text>
    <text x={0} y={180} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={56} fill={OUT}>{label}</text>
  </g>
);

const S05: React.FC = () => (
  <Stage bg="studio" color={K.navy} cam={usePush(1.0, 1.06)}>
    <TitleCard x={960} y={520} title={"IF YOU DON'T UNDERSTAND\nHOW BANKS CREATE MONEY…"} size={92} at={4} />
    <Burst x={960} y={520} at={10} item="cash" n={18} spread={700} />
  </Stage>
);

const chapter = (n: number, title: string) => {
  const C: React.FC = () => <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}><Chapter n={n} title={title} /></Stage>;
  return C;
};

// ------------------------------------------------------------------ 1. the story we're told
const S07: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="bank" bgProps={{ sign: "BANK" }} cam={usePush(1, 1.06)}>
      <PopText x={960} y={160} at={0} text="THE TEXTBOOK VERSION" size={60} pill={K.yellow} />
      <WalkIn from={-150} to={640} at={cue("lena") - 6} dur={45} look={CAST.lena} hold="cash" mood="happy" />
      <PopText x={640} y={330} at={cue("thousand")} text="$1,000" size={60} pill={K.white} />
      <Flow a={[700, 640]} b={[960, 760]} at={cue("puts") + 2} count={4} every={5} />
    </Stage>
  );
};

const S08: React.FC = () => {
  const cue = useCue();
  const nodes = [
    { x: 300, label: "BANK", amt: "keeps $100", at: cue("hundred") },
    { x: 760, label: "SAM", amt: "$900", at: cue("nine") },
    { x: 1200, label: "SHOP", amt: "$900", at: cue("shop") },
    { x: 1640, label: "BANK 2", amt: "lends $810", at: cue("rest") },
  ];
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.04)}>
      <OnGround x={300} dy={-40}><Building w={300} h={260} color="#E8DDC8" roof="columns" /></OnGround>
      <PopText x={300} y={420} at={cue("slice")} text="10% reserve" size={44} pill={K.yellow} />
      <PopIn at={cue("hundred")} x={300} y={920}><Prop name="vault" /></PopIn>
      <OnGround x={760}><Character look={CAST.sam} pose={[[0, "idle"], [cue("nine") + 10, "cheer"], [cue("spends"), "present"]]} mood="happy" enter={cue("lends") - 6} hold={undefined} seed={2} /></OnGround>
      <Flow a={[380, 620]} b={[740, 560]} at={cue("nine")} count={5} />
      <PopIn at={cue("shop")} x={1200} y={900}><g transform="scale(0.8)"><Building w={300} h={300} color="#FFD9C2" label="SHOP" /></g></PopIn>
      <Flow a={[820, 600]} b={[1180, 640]} at={cue("spends")} count={5} />
      <PopIn at={cue("its")} x={1640} y={900}><g transform="scale(0.7)"><Building w={300} h={260} color="#E8DDC8" roof="columns" /></g></PopIn>
      <Flow a={[1260, 640]} b={[1620, 640]} at={cue("its") + 6} count={4} />
      {nodes.map((n, i) => <PopText key={i} x={n.x} y={260} at={n.at} text={n.amt} size={46} pill={K.white} />)}
      <PopText x={1640} y={160} at={cue("goes")} text="…and on it goes" size={50} font="hand" />
    </Stage>
  );
};

const S09: React.FC = () => {
  const cue = useCue();
  const bars = [1000, 900, 810, 729, 656, 590, 531, 478, 430, 387];
  const f = useCurrentFrame();
  const notAt = cue("not");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopText x={960} y={150} at={2} text="THE MONEY MULTIPLIER" size={70} pill={K.yellow} />
      {bars.map((v, i) => {
        const t = interpolate(f, [8 + i * 6, 20 + i * 6], [0, 1], clamp);
        const h = (v / 1000) * 330 * t;
        return <g key={i}><rect x={220 + i * 70} y={620 - h} width={52} height={h} rx={8} fill={i === 0 ? K.gain : "#8CCB86"} stroke={OUT} strokeWidth={4} /></g>;
      })}
      <PopText x={560} y={690} at={40} text="$1,000 → $10,000 of 'loans'?" size={40} font="hand" />
      <OnGround x={1180} s={0.85}><Character look={CAST.lena} pose="hold" hold={{ item: "cash" }} mood="happy" seed={3} /></OnGround>
      <OnGround x={1460} s={0.85}><Character look={CAST.banker} pose="present" mood="smug" seed={4} /></OnGround>
      <OnGround x={1740} s={0.85}><Character look={CAST.sam} pose="cheer" mood="happy" seed={5} facing={-1} /></OnGround>
      <PopText x={1460} y={330} at={cue("middleman")} text="just a middleman?" size={48} pill={K.white} />
      <Flow a={[1220, 600]} b={[1700, 600]} at={cue("passing")} count={6} every={8} dur={34} />
      <Stamp x={960} y={540} at={notAt} text="NOT ACCURATE" size={120} />
      <PopText x={960} y={720} at={notAt + 8} text="— Bank of England, 2014" size={46} font="label" pill={K.white} />
    </Stage>
  );
};

const S10: React.FC = () => {
  const cue = useCue();
  const s = useShot();
  const b17 = s.beats.find((b) => b.id === "b017")!;
  const b18 = cue("b018");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopText x={960} y={190} at={0} until={b18 - 4} text="Money creation in the modern economy" size={54} font="label" pill={K.white} />
      <g opacity={1}>
        <QuoteCard x={960} y={560} w={1500} at={cue("like") - 4} a={b17.start + 4} b={b17.start + b17.frames - 30} size={60}
          text="Rather than banks receiving deposits when households save and then lending them out, bank lending creates deposits." source="Bank of England, 2014" hi={["lending", "creates"]} />
      </g>
      {b18 > 0 && <BeatOverlay at={b18}>
        <rect x={0} y={0} width={1920} height={1080} fill={PAPER} />
        <PopIn at={cue("loan", 1) - 2} x={620} y={560}><Box label="1 · LOAN" color={K.yellow} /></PopIn>
        <Arrow a={[860, 560]} b={[1060, 560]} at={cue("deposit")} bend={0} />
        <PopIn at={cue("deposit")} x={1300} y={560}><Box label="2 · DEPOSIT" color={K.gain} /></PopIn>
        <PopText x={960} y={300} at={cue("again")} text="read that again" size={60} font="hand" />
      </BeatOverlay>}
    </Stage>
  );
};
const BeatOverlay: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const f = useCurrentFrame();
  return f >= at ? <g>{children}</g> : null;
};
const Box: React.FC<{ label: string; color: string; w?: number }> = ({ label, color, w = 440 }) => (
  <g><rect x={-w / 2 + 10} y={-80 + 12} width={w} height={160} rx={30} fill={OUT} /><rect x={-w / 2} y={-80} width={w} height={160} rx={30} fill={color} stroke={OUT} strokeWidth={LW} />
    <text x={0} y={22} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={60} fill={OUT}>{label}</text></g>
);

// ------------------------------------------------------------------ 2. what really happens
const S12: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="office" cam={usePush(1, 1.07)}>
      <OnGround x={1250}><Desk w={420} monitor={false} /></OnGround>
      <OnGround x={1420}><Character look={CAST.banker} pose={[[0, "idle"], [cue("checks"), "hold"], [cue("simple") - 6, "point"]]} hold={{ item: "magnifier" }} mood={[[0, "neutral"], [cue("simple"), "smug"]]} facing={-1} seed={4} /></OnGround>
      <WalkIn from={-150} to={700} at={0} dur={40} look={CAST.sam} mood="happy" pose="present" />
      <Bubble x={760} y={420} at={cue("car")} text="$10,000 for a car, please!" w={420} side="right" />
      <PopIn at={cue("car") + 4} x={420} y={900}><Prop name="car" /></PopIn>
    </Stage>
  );
};

const S13: React.FC = () => {
  const cue = useCue();
  const b23 = cue("b023");
  const f = useCurrentFrame();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      {f < b23 + 4 && <>
        <Screen x={460} y={140} w={1000} h={560} at={0} title="SAM'S ACCOUNT" lines={[{ text: "$0", at: 4, size: 90, color: K.grey }, { text: "+ $10,000", at: cue("adds"), size: 130, color: K.gain, cps: 0.9 }]} />
        <Burst x={960} y={420} at={cue("thousand") + 6} item="cash" n={16} />
      </>}
      {f >= b23 && <>
        <PopText x={960} y={170} at={b23} text="NOBODY'S SAVINGS WENT DOWN" size={62} pill={K.yellow} />
        <OnGround x={560}><Character look={CAST.lena} pose={[[0, "hold"], [cue("lena") + 20, "cheer"]]} hold={{ item: "cash" }} mood="happy" seed={3} /></OnGround>
        <PopText x={560} y={300} at={cue("lena")} text="still $1,000 ✓" size={52} pill={K.white} />
        <OnGround x={1380}><Character look={CAST.sam} pose={[[0, "idle"], [cue("now"), "cheer"]]} mood={[[0, "neutral"], [cue("now"), "grin"]]} seed={5} jump={[cue("minute")]} facing={-1} /></OnGround>
        <PopText x={1380} y={300} at={cue("now")} text="+$10,000 NEW" size={52} pill={K.gain} color={K.white} />
      </>}
    </Stage>
  );
};

const S14: React.FC = () => {
  const cue = useCue();
  const b27 = cue("b027");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <TAccount x={260} y={150} w={1400} h={560} title="THE BANK'S BOOKS" at={2}
        rows={[{ side: "A", text: "Loan to Sam", amount: "$10,000", at: cue("loan"), color: "#FFF3C4" },
          { side: "L", text: "Sam's deposit", amount: "$10,000", at: cue("deposit"), color: "#D6F2DA" }]} />
      <PopText x={610} y={800} at={cue("owns")} text="the bank OWNS" size={48} font="hand" />
      <PopText x={1310} y={800} at={cue("owes", 2)} text="the bank OWES" size={48} font="hand" />
      <PopText x={960} y={930} at={cue("nothing")} text="created from nothing ✨" size={58} pill={K.yellow} />
      {b27 > 0 && <OnGround x={1720} s={0.75}><Character look={CAST.sam} pose={[[0, "idle"], [cue("spend"), "phone"]]} hold={{ item: "phone" }} mood="happy" enter={cue("real")} seed={5} facing={-1} /></OnGround>}
      <PopText x={1720} y={390} at={cue("spend")} text="spend ✓" size={40} font="hand" />
      <PopText x={1720} y={440} at={cue("transfer")} text="transfer ✓" size={40} font="hand" />
      <PopText x={1720} y={490} at={cue("dealer")} text="buy the car ✓" size={40} font="hand" />
    </Stage>
  );
};

const S15: React.FC = () => {
  const s = useShot();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.06)}>
      <QuoteCard x={960} y={540} w={1560} at={0} a={70} b={s.frames - 30} size={60}
        text="Whenever a bank makes a loan, it simultaneously creates a matching deposit in the borrower's bank account, thereby creating new money."
        source="Bank of England, Quarterly Bulletin 2014 Q1" hi={["simultaneously", "creating", "new"]} />
    </Stage>
  );
};

const S16: React.FC = () => {
  const cue = useCue();
  const b30 = cue("b030");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <TAccount x={260} y={150} w={1400} h={560} title="THE BANK'S BOOKS" at={-30}
        rows={[{ side: "A", text: "Loan to Sam", amount: "$10,000", at: -30, color: "#FFF3C4", strike: cue("crossed") },
          { side: "L", text: "Sam's deposit", amount: "$10,000", at: -30, color: "#D6F2DA", strike: cue("crossed") + 6 }]} />
      <Flow a={[200, 800]} b={[700, 500]} at={cue("pays")} count={5} item="cash" />
      <OnGround x={200} s={0.8}><Character look={CAST.sam} pose={[[0, "present"]]} mood="neutral" seed={5} /></OnGround>
      <PopText x={1235} y={820} at={cue("disappears")} text="poof. money gone." size={58} font="hand" color={K.loss} />
      {b30 > 0 && <PopText x={960} y={960} at={b30 + 6} text="“repayment of bank loans destroys money”" size={44} pill={K.white} />}
    </Stage>
  );
};

// ------------------------------------------------------------------ 3. how much money is this?
const S18: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <Waffle x={260} y={170} size={680} n={3} a={K.yellow} b={K.blue} at={cue("notes")} atB={cue("ninety-seven") - 4} dur={36} />
      <PopIn at={cue("hold")} x={1400} y={420}><Prop name="cash" /><g transform="translate(130 10)"><Prop name="coin" /></g></PopIn>
      <PopText x={1400} y={300} at={cue("three")} text="CASH: 3%" size={80} font="caption" color={K.gold} stroke={OUT} />
      <PopText x={1400} y={560} at={cue("ninety-seven")} text="DEPOSITS: 97%" size={80} font="caption" color={K.blue} stroke={OUT} />
      <PopText x={1400} y={650} at={cue("screens")} text="numbers on screens" size={48} font="hand" />
      <PopText x={1400} y={800} at={cue("mostly")} text="mostly created by banks' lending" size={46} pill={K.white} />
      <PopText x={600} y={950} at={cue("circulation")} text="UK, 2014 · Bank of England" size={34} font="label" />
    </Stage>
  );
};

const S19: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="room" cam={usePush(1, 1.07)}>
      <OnGround x={640}><Character look={CAST.lena} pose="phone" hold={{ item: "phone" }} mood={[[0, "neutral"], [cue("promise"), "surprised"]]} seed={3} /></OnGround>
      <PopIn at={cue("pile")} until={cue("promise") - 4} x={1300} y={700}><Prop name="vault" /><text x={0} y={-260} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={44} fill={OUT}>"LENA'S $1,000"?</text>
        <path d="M -110 -230 L 110 10 M 110 -230 L -110 10" stroke={K.loss} strokeWidth={14} strokeLinecap="round" /></PopIn>
      <PopIn at={cue("promise")} x={1300} y={760} s={2.2}><Prop name="paper" label="I.O.U." /></PopIn>
      <PopText x={1300} y={300} at={cue("owes")} text="the bank owes you" size={60} pill={K.yellow} />
    </Stage>
  );
};

const S20: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const goldsmith = { hair: "bald", hairColor: "#6B4A2A", skin: "#EFC19A", shirt: "#8A5A3B", beard: "full", pants: "#4A3F35", glasses: true } as typeof CAST.sam;
  const receipts = f >= cue("lent") ? Math.min(9, 3 + Math.floor((f - cue("lent")) / 6)) : f >= cue("receipts") ? 3 : 0;
  return (
    <Stage bg="court" cam={usePush(1, 1.06)}>
      <PopText x={960} y={140} at={2} text="LONDON · 1600s" size={60} pill={K.white} />
      <OnGround x={960}><Desk w={520} monitor={false} /></OnGround>
      <OnGround x={960} dy={-170}>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${-120 + i * 80} 0) scale(0.7)`}><Prop name="goldBar" /></g>)}</OnGround>
      <OnGround x={1300}><Character look={goldsmith} pose={[[0, "present"], [cue("lent"), "count"]]} mood={[[0, "happy"], [cue("noticed"), "smug"]]} facing={-1} seed={8} /></OnGround>
      <OnGround x={420}><Character look={crowdLook(3)} pose={[[0, "idle"], [cue("paying"), "present"]]} mood="happy" seed={9} /></OnGround>
      <OnGround x={640}><Character look={crowdLook(11)} pose={[[0, "idle"], [cue("paying") + 10, "hold"]]} mood="happy" seed={10} facing={-1} /></OnGround>
      <Flow a={[460, 600]} b={[620, 600]} at={cue("paying")} count={3} every={10} item="paper" s={0.5} arc={60} />
      {Array.from({ length: receipts }).map((_, i) => <g key={i} transform={`translate(${760 + (i % 5) * 90} ${560 - Math.floor(i / 5) * 120}) scale(0.55)`}><Prop name="paper" label={i < 3 ? "GOLD" : "GOLD?"} /></g>)}
      <PopText x={960} y={300} at={cue("lent")} text="receipts > gold" size={64} font="caption" color={K.loss} stroke={OUT} />
      <PopText x={960} y={980} at={cue("banking")} text="= BANKING" size={70} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 4. what stops them?
const S22: React.FC = () => {
  const cue = useCue();
  const b43 = cue("b043");
  return (
    <Stage bg="office" cam={usePush(1, 1.06)}>
      <OnGround x={1220}><Desk w={420} /></OnGround>
      <OnGround x={1080}><Character look={CAST.banker} pose="type" mood={[[0, "smug"], [cue("more"), "grin"]]} seed={4} /></OnGround>
      <Screen x={300} y={150} w={700} h={400} at={4} title="TYPE MORE?" lines={[{ text: "$999,999,999,999", at: cue("typing"), size: 64, color: K.gain, cps: 1.6 }]} />
      {b43 > 0 && [1, 2, 3].map((n, i) => <PopIn key={n} at={cue("three") + i * 5} x={500 + i * 220} y={760}><circle r={80} fill={K.yellow} stroke={OUT} strokeWidth={LW + 2} /><text y={30} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={90} fill={OUT}>{n}</text></PopIn>)}
      <PopText x={720} y={960} at={cue("limits")} text="THREE LIMITS" size={60} pill={K.white} />
    </Stage>
  );
};
const Num: React.FC<{ n: number; label: string }> = ({ n, label }) => (
  <g><circle cx={150} cy={150} r={80} fill={K.yellow} stroke={OUT} strokeWidth={LW + 2} /><text x={150} y={180} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={90} fill={OUT}>{n}</text>
    <text x={260} y={180} fontFamily={CF.caption} fontWeight={900} fontSize={76} fill={OUT}>{label}</text></g>
);

const S23: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={0}><Num n={1} label="PROFIT" /></PopIn>
      <OnGround x={560}><Character look={CAST.banker} pose={[[0, "present"], [cue("lose"), "facepalm"]]} mood={[[0, "neutral"], [cue("lose"), "worried"]]} seed={4} /></OnGround>
      <OnGround x={940}><Character look={crowdLook(5)} pose="shrug" mood="sad" seed={6} facing={-1} enter={cue("lend") - 4} /></OnGround>
      <Bubble x={980} y={420} at={cue("can't")} until={cue("competitive") - 4} text="Can't pay, sorry!" w={340} side="right" />
      <PopText x={560} y={330} at={cue("lose")} text="−$" size={110} font="caption" color={K.loss} stroke={OUT} />
      <PopIn at={cue("competitive")} x={1450} y={560}><Building w={240} h={260} color="#E8DDC8" roof="columns" label="" /><g transform="translate(-200 40) scale(0.6)"><Building w={240} h={260} color="#D5E5C8" roof="columns" /></g><g transform="translate(200 40) scale(0.6)"><Building w={240} h={260} color="#F0C6A8" roof="columns" /></g></PopIn>
      <PopText x={1450} y={250} at={cue("competitive")} text="competition" size={52} font="hand" />
      <PopIn at={cue("cushion")} x={1450} y={940}><rect x={-260} y={-70} width={520} height={110} rx={50} fill={K.pink} stroke={OUT} strokeWidth={LW} /><text y={8} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={52} fill={OUT}>CAPITAL CUSHION</text></PopIn>
    </Stage>
  );
};

const S24: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const poof = cue("paying");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={0}><Num n={2} label="THE REST OF US" /></PopIn>
      <OnGround x={500}><Character look={CAST.sam} pose={[[0, "idle"], [poof, "present"]]} mood="happy" seed={5} /></OnGround>
      <OnGround x={820}><Character look={CAST.lena} pose={[[0, "idle"], [poof + 6, "present"]]} mood="happy" seed={3} /></OnGround>
      <OnGround x={1450} dy={-20}><Building w={360} h={340} color="#E8DDC8" roof="columns" /></OnGround>
      <Flow a={[560, 600]} b={[1350, 640]} at={poof} count={8} every={5} dur={30} />
      {f > poof + 20 && <PopText x={1450} y={300} at={poof + 20} text="debt repaid = money destroyed" size={50} pill={K.white} />}
    </Stage>
  );
};

const S25: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const v = interpolate(f, [cue("cheaper") - 4, cue("cheaper") + 10, cue("expensive") - 2, cue("expensive") + 12, cue("brake"), cue("brake") + 12, cue("accelerator"), cue("accelerator") + 12],
    [0.5, 0.15, 0.15, 0.88, 0.88, 0.85, 0.85, 0.2], clamp);
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopIn at={0}><Num n={3} label="THE CENTRAL BANK" /></PopIn>
      <Dial x={960} y={640} r={300} value={v} at={cue("interest") - 6} label="INTEREST RATES" left="CHEAP" right="EXPENSIVE" />
      <PopText x={480} y={900} at={cue("accelerator")} text="accelerator" size={50} font="hand" color={K.gain} />
      <PopText x={1440} y={900} at={cue("brake")} text="brake" size={50} font="hand" color={K.loss} />
      <PopText x={960} y={300} at={cue("ultimate")} text="“the ultimate constraint”" size={60} pill={K.yellow} />
    </Stage>
  );
};

const S26: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.06)}>
      <PopIn at={cue("rule")} x={960} y={620}><Prop name="vault" /></PopIn>
      <PopText x={960} y={200} at={cue("reserve")} text="RESERVE REQUIREMENT?" size={66} pill={K.white} />
      <PopText x={480} y={500} at={cue("britain")} text="UK: none" size={70} font="caption" stroke={OUT} color={K.white} />
      <PopText x={1440} y={500} at={cue("america")} text="US:" size={70} font="caption" stroke={OUT} color={K.white} />
      <Stamp x={1440} y={680} at={cue("zero")} text="0%" size={170} rot={-8} />
      <PopText x={1440} y={840} at={cue("march")} text="since March 2020" size={44} font="label" />
      <PopText x={960} y={970} at={cue("worth")} text="the real limit: is the loan worth it?" size={52} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ 5. booms
const S28: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.06)}>
      <PopText x={960} y={95} at={0} text="THE BOOM LOOP" size={64} pill={K.gain} color={K.white} />
      <Cycle cx={960} cy={600} r={330} rx={600} spinFrom={cue("feeds")}
        nodes={[{ text: "Banks lend more", at: cue("lend") }, { text: "More deposits", at: cue("deposits") }, { text: "Money chases houses", at: cue("chases") },
          { text: "Prices rise", at: cue("rise") }, { text: "Bigger loans", at: cue("bigger") }]} nodeW={420} />
      <PopIn at={cue("houses")} x={960} y={640} s={1.1}><Prop name="houseIcon" /></PopIn>
    </Stage>
  );
};

const S29: React.FC = () => {
  const cue = useCue();
  const b56 = cue("b056");
  return (
    <Stage bg="studio" color="#F1DCD3" cam={usePush(1, 1.05)}>
      <PopText x={960} y={95} at={0} text="…AND IN REVERSE" size={64} pill={K.loss} color={K.white} />
      <Cycle cx={960} cy={590} r={300} rx={560} spinFrom={cue("disappears")}
        nodes={[{ text: "People get scared", at: cue("scared") }, { text: "Pay down debt", at: cue("pay") }, { text: "Banks stop lending", at: cue("stop") },
          { text: "Money disappears", at: cue("disappears"), color: "#F6B9B0" }]} nodeW={430} />
      {b56 > 0 && <PopText x={960} y={1010} at={cue("fall")} text="UK after 2008: lending fell, money grew slowly" size={40} pill={K.white} />}
    </Stage>
  );
};

// ------------------------------------------------------------------ 6. bank runs
const S31: React.FC = () => {
  const cue = useCue();
  const f = useCurrentFrame();
  const b60 = cue("b060");
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.05)}>
      <PopText x={960} y={110} at={0} text="INSIDE THE BANK" size={60} pill={K.white} />
      <PopIn at={cue("cash")} x={560} y={900}><rect x={-200} y={-120} width={400} height={120} rx={12} fill={K.yellow} stroke={OUT} strokeWidth={LW} /><text x={0} y={-45} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={48} fill={OUT}>CASH</text></PopIn>
      <PopIn at={cue("loans")} x={1200} y={900}><rect x={-360} y={-560} width={720} height={560} rx={12} fill="#B8C6D9" stroke={OUT} strokeWidth={LW} /><text x={0} y={-290} textAnchor="middle" fontFamily={CF.caption} fontWeight={900} fontSize={70} fill={OUT}>LOANS</text><text x={0} y={-210} textAnchor="middle" fontFamily={CF.label} fontWeight={600} fontSize={42} fill={OUT}>paid back over years</text></PopIn>
      {f >= b60 && [0, 1].map((i) => <OnGround key={i} x={150 + i * 170} s={0.7}><Character look={crowdLook(20 + i)} pose="hold" hold={{ item: "card" }} mood="happy" seed={20 + i} enter={b60 + i * 8} /></OnGround>)}
      <PopText x={240} y={420} at={cue("few")} text="a few people a day" size={44} font="hand" />
    </Stage>
  );
};

const S32: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="bank" bgProps={{ sign: "NORTHERN ROCK" }} cam={usePush(1.0, 1.08, 900, 560)}>
      <PopText x={300} y={150} at={4} text="SEPTEMBER 2007" size={56} pill={K.white} />
      {Array.from({ length: 9 }).map((_, i) => <OnGround key={i} x={120 + i * 150} s={0.82}><Character look={crowdLook(40 + i)} pose={i % 3 === 0 ? "phone" : "idle"} hold={i % 3 === 0 ? { item: "phone" } : undefined}
        mood={i % 2 ? "worried" : "sad"} seed={40 + i} enter={cue("queued") - 10 + i * 4} lookAt={[0.6, -0.2]} /></OnGround>)}
      <PopText x={960} y={300} at={cue("first")} text="first UK bank run in 150 years" size={56} pill={K.yellow} />
    </Stage>
  );
};

const S33: React.FC = () => {
  const cue = useCue();
  const b63 = cue("b063");
  return (
    <Stage bg="city" cam={usePush(1, 1.06)} shake={[[cue("shut"), cue("shut") + 12]]}>
      <PopText x={360} y={130} at={4} text="MARCH 2023" size={54} pill={K.white} />
      <OnGround x={1450} dy={-10}><Building w={460} h={420} color="#E8DDC8" roof="columns" label="SILICON VALLEY BANK" /></OnGround>
      {Array.from({ length: 5 }).map((_, i) => <OnGround key={i} x={180 + i * 190} s={0.8}><Character look={crowdLook(60 + i)} pose="phone" hold={{ item: "phone" }} mood="worried" seed={60 + i} /></OnGround>)}
      <Flow a={[1400, 600]} b={[300, 520]} at={cue("pulled")} count={14} every={4} dur={32} arc={200} />
      <Count x={760} y={330} a={cue("forty")} b={cue("forty") + 20} from={0} to={40} prefix="$" suffix=" BILLION+" size={96} color={K.loss} stroke={OUT} />
      <PopText x={760} y={420} at={cue("single")} text="in ONE day" size={52} font="hand" />
      {b63 > 0 && <PopText x={1450} y={300} at={cue("hundred")} text="+$100B expected next day" size={44} pill={K.white} />}
      <Stamp x={1450} y={560} at={cue("shut")} text="CLOSED" size={110} />
    </Stage>
  );
};

const S34: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="studio" color={PAPER} cam={usePush(1, 1.06)}>
      <PopIn at={cue("insure")} x={700} y={860} s={2.4}><Prop name="shield" label="$250,000" /></PopIn>
      <OnGround x={1300}><Character look={CAST.lena} pose={[[0, "idle"], [cue("two"), "cheer"]]} mood="happy" seed={3} /></OnGround>
      <PopText x={700} y={200} at={cue("covers")} text="FDIC deposit insurance" size={56} pill={K.white} />
      <PopText x={1300} y={300} at={cue("depositor")} text="per depositor, per bank, per account type" size={36} pill={K.yellow} />
    </Stage>
  );
};

// ------------------------------------------------------------------ ending
const S35: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="bank" bgProps={{ sign: "BANK" }} cam={usePush(1.08, 1.0)}>
      <OnGround x={560}><Character look={CAST.lena} pose="hold" hold={{ item: "cash" }} mood={[[0, "worried"], [cue("promise"), "happy"]]} seed={3} /></OnGround>
      <Bubble x={640} y={420} at={cue("where")} until={cue("b066")} text="Where does it go?" w={380} think />
      <PopIn at={cue("promise")} x={1000} y={640} s={1.6}><Prop name="paper" label="I.O.U." /></PopIn>
      <PopText x={1500} y={480} at={cue("your")} text="not your money…" size={56} font="hand" />
    </Stage>
  );
};

const S36: React.FC = () => {
  const cue = useCue();
  return (
    <Stage bg="office" cam={usePush(1, 1.1, 960, 520)}>
      <OnGround x={1220}><Desk w={420} /></OnGround>
      <OnGround x={1080}><Character look={CAST.banker} pose="type" mood="smug" seed={4} /></OnGround>
      <Screen x={420} y={140} w={900} h={420} at={2} title="NEW MONEY" lines={[{ text: "+ $10,000", at: cue("new"), size: 120, color: K.gain, cps: 1 }]} />
      <PopText x={960} y={680} at={cue("signs")} text="the moment a loan is signed" size={50} pill={K.white} />
      <Burst x={870} y={360} at={cue("money") + 6} item="cash" />
    </Stage>
  );
};

const S37: React.FC = () => {
  const cue = useCue();
  const b69 = cue("b069");
  return (
    <Stage bg="studio" color={K.navy} cam={usePush(1, 1.05)}>
      <TitleCard x={960} y={440} title={"NOT PRINTED."} size={120} at={cue("printed")} color={K.white} w={1100} />
      <TitleCard x={960} y={720} title={"TYPED."} size={150} at={cue("typed")} color={K.yellow} w={900} />
      {b69 > 0 && <PopText x={960} y={970} at={b69 + 4} text="if you don't understand that, you don't understand money" size={42} color={K.white} font="label" />}
    </Stage>
  );
};

const SHOTS = {
  s01: S01, s02: S02, s03: S03, s04: S04, s05: S05, s06: chapter(1, "THE STORY WE'RE TOLD"), s07: S07, s08: S08, s09: S09, s10: S10,
  s11: chapter(2, "WHAT REALLY HAPPENS"), s12: S12, s13: S13, s14: S14, s15: S15, s16: S16,
  s17: chapter(3, "HOW MUCH MONEY IS THIS?"), s18: S18, s19: S19, s20: S20,
  s21: chapter(4, "SO WHAT STOPS THEM?"), s22: S22, s23: S23, s24: S24, s25: S25, s26: S26,
  s27: chapter(5, "WHY BOOMS GET SO BIG"), s28: S28, s29: S29,
  s30: chapter(6, "WHEN EVERYONE WANTS IT BACK"), s31: S31, s32: S32, s33: S33, s34: S34, s35: S35, s36: S36, s37: S37,
};

export const Banks: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <Explainer timing={T} shots={SHOTS} />
  </AbsoluteFill>
);
void end; void Arrow;
