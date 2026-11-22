import React from "react";
import { Composition } from "remotion";
import { loadHouseFonts } from "../fonts";
import { KitDemo, KitDemoV } from "./KitDemo";
import { Test3D } from "./Test3D";
import { FeeShort, FEE_SHORT_FRAMES } from "./videos/fee-short/Video";
import { Banks, BANKS_FRAMES } from "./videos/banks/Video";
import { Lemonade, LEMONADE_FRAMES } from "./videos/lemonade/Video";
import { PricesShort, PRICES_SHORT_FRAMES } from "./videos/prices-short/Video";
import { Levels, LEVELS_FRAMES } from "./videos/levels/Video";
import { LevelsShort, LEVELS_SHORT_FRAMES } from "./videos/levels-short/Video";

loadHouseFonts();
const BGS = ["town", "office", "wallst", "bank", "studio", "room", "city", "night", "court"] as const;

export const ExRoot: React.FC = () => (
  <>
    {BGS.map((bg) => <Composition key={bg} id={`kit-${bg}`} component={KitDemo} defaultProps={{ bg }} durationInFrames={120} fps={30} width={1920} height={1080} />)}
    <Composition id="kit-vertical" component={KitDemoV} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="fee-short" component={FeeShort} durationInFrames={FEE_SHORT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="banks" component={Banks} durationInFrames={BANKS_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="lemonade" component={Lemonade} durationInFrames={LEMONADE_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="prices-short" component={PricesShort} durationInFrames={PRICES_SHORT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="levels" component={Levels} durationInFrames={LEVELS_FRAMES} fps={30} width={1920} height={1080} />
    <Composition id="levels-short" component={LevelsShort} durationInFrames={LEVELS_SHORT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="t3d" component={Test3D} durationInFrames={30} fps={30} width={960} height={540} />
  </>
);
