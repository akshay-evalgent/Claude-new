import React from "react";
import { Composition } from "remotion";
import { loadHouseFonts } from "../fonts";
import { KitDemo, KitDemoV } from "./KitDemo";
import { Test3D } from "./Test3D";
import { FeeShort, FEE_SHORT_FRAMES } from "./videos/fee-short/Video";

loadHouseFonts();
const BGS = ["town", "office", "wallst", "bank", "studio", "room", "city", "night", "court"] as const;

export const ExRoot: React.FC = () => (
  <>
    {BGS.map((bg) => <Composition key={bg} id={`kit-${bg}`} component={KitDemo} defaultProps={{ bg }} durationInFrames={120} fps={30} width={1920} height={1080} />)}
    <Composition id="kit-vertical" component={KitDemoV} durationInFrames={120} fps={30} width={1080} height={1920} />
    <Composition id="fee-short" component={FeeShort} durationInFrames={FEE_SHORT_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="t3d" component={Test3D} durationInFrames={30} fps={30} width={960} height={540} />
  </>
);
