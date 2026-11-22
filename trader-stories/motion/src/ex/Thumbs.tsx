// YouTube thumbnails (1280x720) for the explainer long videos: A/B pairs.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Stage, OnGround } from "./kit/Stage";
import { Character, CAST, Look } from "./kit/Character";
import { Prop, LemonadeStand, Desk, Building } from "./kit/Props";
import { CF, K, OUT, SKIN } from "./kit/style";
import { C, font } from "../theme";

const Big: React.FC<{ lines: { t: string; c?: string; s?: number }[]; x?: number; y?: number; w?: number; align?: "left" | "center" }> = ({ lines, x = 60, y = 90, w = 760, align = "left" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align }}>
    {lines.map((l, i) => (
      <div key={i} style={{ fontFamily: CF.caption, fontWeight: 900, fontSize: l.s ?? 96, lineHeight: 1.02, color: l.c ?? "#FFFFFF", WebkitTextStroke: `${(l.s ?? 96) * 0.1}px ${OUT}`, paintOrder: "stroke fill", textShadow: `0 ${(l.s ?? 96) * 0.07}px 0 ${OUT}` }}>{l.t}</div>
    ))}
  </div>
);
const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill style={{ overflow: "hidden" }}>{children}</AbsoluteFill>;
const PENNY: Look = { hair: "curly", hairColor: "#C4552A", skin: SKIN[0], shirt: K.yellow, pants: "#3E6FB0", height: 0.82 };
const YOU1: Look = { hair: "short", hairColor: "#2B1B14", skin: SKIN[2], shirt: K.blue, hoodie: true, pants: "#2E3550" };
const YOU10: Look = { hair: "bald", hairColor: "#D8D8D8", skin: SKIN[1], jacket: "#4A3F35", tie: K.navy, glasses: true, pants: "#3A332C" };

export const THUMBS: Record<string, React.FC> = {
  "banks-a": () => <Frame><Stage bg="office"><OnGround x={1180} dy={30} s={0.88}><Desk w={420} /></OnGround><OnGround x={1030} dy={30} s={0.92}><Character look={CAST.banker} pose="type" mood="smug" seed={4} /></OnGround></Stage>
    <Big lines={[{ t: "BANKS DON'T", s: 100 }, { t: "LEND YOUR", s: 100 }, { t: "MONEY", c: K.yellow, s: 150 }]} /></Frame>,
  "banks-b": () => <Frame><Stage bg="studio" color={K.navy}><OnGround x={1080} dy={30} s={0.95}><Character look={CAST.banker} pose="present" mood="smug" seed={4} /></OnGround></Stage>
    <Big lines={[{ t: "NOT PRINTED.", s: 110 }, { t: "TYPED.", c: K.yellow, s: 190 }]} y={150} /><div style={{ position: "absolute", left: 70, top: 580, fontFamily: CF.label, fontWeight: 700, fontSize: 44, color: "#BFD0EA" }}>how banks really make money</div></Frame>,
  "lemonade-a": () => <Frame><Stage bg="town"><OnGround x={1170} dy={30} s={0.6}><LemonadeStand /></OnGround><OnGround x={1010} dy={30} s={0.95}><Character look={PENNY} pose="cheer" mood="grin" seed={3} /></OnGround></Stage>
    <Big lines={[{ t: "YOU BUY", s: 92 }, { t: "APPLE STOCK.", s: 92 }, { t: "APPLE GETS", c: K.loss, s: 104 }, { t: "$0", c: K.loss, s: 150 }]} y={50} w={820} /></Frame>,
  "lemonade-b": () => <Frame><Stage bg="studio" color={K.teal}><OnGround x={1000} dy={30} s={0.82}><LemonadeStand /></OnGround></Stage>
    <Big lines={[{ t: "THE STOCK MARKET", s: 92 }, { t: "IN ONE", s: 92 }, { t: "LEMONADE STAND", c: K.yellow, s: 92 }]} y={60} w={1180} /></Frame>,
  "levels-a": () => <Frame><Stage bg="studio" color="#EFF3F8"><rect x={640} y={-100} width={800} height={1000} fill="#E6E0D2" /><OnGround x={330} dy={30} s={0.85}><Character look={YOU1} pose="phone" hold={{ item: "phone" }} mood="shocked" seed={1} /></OnGround>
    <OnGround x={950} dy={30} s={0.85}><Character look={YOU10} pose="hold" hold={{ item: "paper", label: "REPORT" }} mood="happy" seed={9} /></OnGround></Stage>
    <Big lines={[{ t: "LVL 1", c: K.loss, s: 90 }]} x={160} y={40} w={400} /><Big lines={[{ t: "LVL 10", c: K.gain, s: 90 }]} x={780} y={40} w={400} />
    <Big lines={[{ t: "50 TRADES", s: 54 }, { t: "A DAY", s: 54 }]} x={60} y={520} w={500} /><Big lines={[{ t: "2 TRADES", s: 54 }, { t: "A YEAR", s: 54 }]} x={760} y={520} w={500} /></Frame>,
  "levels-b": () => <Frame><Stage bg="studio" color="#1F2B47"><path d="M 900 760 L 900 -40 M 1040 760 L 1040 -40" stroke={K.wood} strokeWidth={22} />{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M 900 ${700 - i * 130} L 1040 ${700 - i * 130}`} stroke={K.wood} strokeWidth={16} />)}
    <OnGround x={1150} dy={30} s={0.82}><Character look={YOU1} pose="pointUp" mood="grin" seed={1} /></OnGround></Stage>
    <Big lines={[{ t: "EVERY LEVEL", s: 100 }, { t: "OF TRADER", s: 100 }, { t: "$1K → $1B", c: K.yellow, s: 120 }]} y={110} w={900} /></Frame>,
  "gamestop-a": () => <Frame><Stage bg="room"><OnGround x={1150} dy={30} s={0.95}><Character look={CAST.headband} pose="cheer" mood="grin" seed={8} /></OnGround></Stage>
    <Big lines={[{ t: "$53,000", s: 110 }, { t: "→ $48M", c: K.gain, s: 150 }]} y={130} /><div style={{ position: "absolute", left: 66, top: 470, fontFamily: CF.caption, fontWeight: 900, fontSize: 52, color: OUT, background: K.yellow, padding: "6px 18px", border: `5px solid ${OUT}`, borderRadius: 14 }}>EXPLAINED LIKE YOU'RE 5</div></Frame>,
  "gamestop-b": () => <Frame><Stage bg="wallst"><OnGround x={1080} dy={30} s={0.95}><Character look={CAST.boss} pose="panic" mood="shocked" seed={4} /></OnGround></Stage>
    <Big lines={[{ t: "WALL STREET", s: 96 }, { t: "BET IT WOULD DIE.", s: 80 }, { t: "IT BACKFIRED", c: K.loss, s: 110 }]} y={80} w={900} /></Frame>,
  "lottery-a": () => <Frame><Img src={staticFile("frames/lottery/jerry_counter.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(14,15,17,0.92) 0%, rgba(14,15,17,0.55) 50%, rgba(14,15,17,0) 75%)" }} />
    <div style={{ position: "absolute", left: 60, top: 120, fontFamily: font("display"), fontWeight: 700, lineHeight: 1 }}>
      <div style={{ fontSize: 64, color: C.paper }}>THEY BEAT THE LOTTERY</div><div style={{ fontSize: 190, color: C.gain }}>$27M</div><div style={{ fontSize: 70, color: C.ochre }}>LEGALLY.</div></div>
    <div style={{ position: "absolute", right: 30, bottom: 24, fontFamily: font("mono"), fontSize: 20, color: C.ochre, letterSpacing: 3 }}>DRAMATISED</div></Frame>,
  "lottery-b": () => <Frame><Img src={staticFile("frames/lottery/jerry_math.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(14,15,17,0.9) 0%, rgba(14,15,17,0.5) 50%, rgba(14,15,17,0) 78%)" }} />
    <div style={{ position: "absolute", left: 60, top: 140, fontFamily: font("display"), fontWeight: 700, lineHeight: 1.02 }}>
      <div style={{ fontSize: 70, color: C.paper }}>A LOTTERY TICKET</div><div style={{ fontSize: 70, color: C.paper }}>WORTH MORE</div><div style={{ fontSize: 70, color: C.paper }}>THAN IT COST</div><div style={{ fontSize: 90, color: C.ochre, marginTop: 14 }}>HE DID THE MATHS</div></div>
    <div style={{ position: "absolute", right: 30, bottom: 24, fontFamily: font("mono"), fontSize: 20, color: C.ochre, letterSpacing: 3 }}>DRAMATISED</div></Frame>,
};
void Prop; void Building;
