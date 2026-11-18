import React from "react";
import { Composition, Series } from "remotion";
import { FPS, H, W, sec } from "./theme";
import { loadHouseFonts } from "./fonts";
import { component, ShotSpec } from "./registry";
import { Scoreboard } from "./components/Scoreboard";
import { SceneMove } from "./components/SceneMove";
import { FILM_SECONDS, GRAPHICS, OVERLAYS, SCOREBOARD, SHOTS } from "./films/xu-xiang/film";
import { Film, FILM_FRAMES } from "./films/xu-xiang/Film";
import { Thumbnail } from "./films/xu-xiang/Thumbnail";

loadHouseFonts();

const Shot: React.FC<{ spec: ShotSpec }> = ({ spec }) => {
  const C = component(spec.t);
  return <C {...spec.props} />;
};
const frames = (id: string) => Math.max(sec(1), Math.round(SHOTS.find((s) => s.id === id)!.seconds * FPS));
const cid = (prefix: string, id: string) => `${prefix}-${id.replace(".", "-")}`;

// A preview reel: one or two shots per template, at their real length.
const GALLERY = ["01.11", "01.01", "02.02", "02.07", "02.08", "04.04", "05.02", "05.05", "05.11", "05.13", "06.03", "06.06", "06.14", "06.16", "06.18", "06.21", "07.03", "07.06", "07.10", "07.14", "07.15", "08.10", "08.17", "09.13", "09.16"];

export const Root: React.FC = () => (
  <>
    <Composition id="gallery" component={() => (
      <Series>
        {GALLERY.map((id) => (
          <Series.Sequence key={id} durationInFrames={frames(id)}><Shot spec={GRAPHICS[id]} /></Series.Sequence>
        ))}
      </Series>
    )} durationInFrames={GALLERY.reduce((a, id) => a + frames(id), 0)} fps={FPS} width={W} height={H} />

    <Composition id="demo-scene" component={() => (
      <Series>
        <Series.Sequence durationInFrames={sec(4)}><SceneMove src="test/still.jpg" move="push" /></Series.Sequence>
        <Series.Sequence durationInFrames={sec(4)}><SceneMove src="test/still.jpg" move="pan-left" caption="SOUTH LIBERATION ROAD, NINGBO" /></Series.Sequence>
      </Series>
    )} durationInFrames={sec(8)} fps={FPS} width={W} height={H} />

    <Composition id="xx-film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={W} height={H} />

    <Composition id="xx-thumb-a" component={Thumbnail} durationInFrames={1} fps={FPS} width={1280} height={720}
      defaultProps={{ image: "car_interior_coat", kicker: "HE MADE", big: "+357%", bigTone: "gain", sub: "IN A CRASH", focusX: 75, shift: 22 }} />
    <Composition id="xx-thumb-b" component={Thumbnail} durationInFrames={1} fps={FPS} width={1280} height={720}
      defaultProps={{ image: "zexi_office_night", kicker: "HE ALWAYS", big: "KNEW", bigTone: "paper", sub: "FIRST.", focusX: 50 }} />

    <Composition id="xx-scoreboard" component={Scoreboard} defaultProps={{ entries: SCOREBOARD }}
      durationInFrames={Math.round(FILM_SECONDS * FPS)} fps={FPS} width={W} height={H} />

    {Object.entries(GRAPHICS).map(([id, spec]) => (
      <Composition key={id} id={cid("xx", id)} component={Shot} defaultProps={{ spec }} durationInFrames={frames(id)} fps={FPS} width={W} height={H} />
    ))}
    {Object.entries(OVERLAYS).map(([id, spec]) => (
      <Composition key={`o${id}`} id={cid("xx-ov", id)} component={Shot} defaultProps={{ spec }} durationInFrames={frames(id)} fps={FPS} width={W} height={H} />
    ))}
  </>
);
