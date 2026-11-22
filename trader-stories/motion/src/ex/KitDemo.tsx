import React from "react";
import { AbsoluteFill } from "remotion";
import { Stage, OnGround, Bg } from "./kit/Stage";
import { Character, CAST, crowdLook } from "./kit/Character";
import { LemonadeStand, Desk } from "./kit/Props";
import { PopText, Bubble, Stamp, Arrow } from "./kit/Ui";

export const KitDemo: React.FC<{ bg: Bg }> = ({ bg }) => (
  <AbsoluteFill>
    <Stage bg={bg}>
      {bg === "town" && <OnGround x={1300}><LemonadeStand /></OnGround>}
      {bg === "office" && <OnGround x={1350}><Desk /></OnGround>}
      <OnGround x={300}><Character look={CAST.sam} pose="wave" mood="happy" talk={[[0, 200]]} /></OnGround>
      <OnGround x={620}><Character look={CAST.banker} pose="hold" hold={{ item: "moneyBag" }} mood="smug" seed={2} /></OnGround>
      <OnGround x={940}><Character look={CAST.headband} pose="cheer" mood="grin" seed={3} hold={{ item: "phone" }} /></OnGround>
      <OnGround x={1600}><Character look={CAST.boss} pose="facepalm" mood="worried" seed={4} /></OnGround>
      <OnGround x={1180} s={0.9}><Character look={CAST.lena} pose="shrug" mood="surprised" seed={5} /></OnGround>
      <PopText x={960} y={160} text="EXPLAINED LIKE YOU'RE 5" size={72} pill="#FFFFFF" />
      <Bubble x={380} y={350} text="A share is a tiny slice of a company!" w={420} />
      <Stamp x={1650} y={260} text="−$6.8B" />
      <Arrow a={[1400, 420]} b={[1580, 300]} />
    </Stage>
  </AbsoluteFill>
);

export const KitDemoV: React.FC = () => (
  <AbsoluteFill>
    <Stage bg="trading">
      <OnGround x={300} s={1.25}><Character look={CAST.trader} pose="phone" mood="shocked" hold={{ item: "phone" }} /></OnGround>
      <OnGround x={780} s={1.25}><Character look={crowdLook(7)} pose="panic" mood="worried" seed={9} /></OnGround>
      <PopText x={540} y={420} text="−100%?" size={150} color="#E5483A" stroke="#211B17" font="caption" />
    </Stage>
  </AbsoluteFill>
);
