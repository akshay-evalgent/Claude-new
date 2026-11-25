import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Stage} from './Stage';
import {Kitchen3D, Bedroom3D, Chair3D} from './Sets3D';
import {Person3D, Actor, handWorld} from './Person3D';
import {Paper3D, Phone3D} from './Props3D';
import {BODIES, standPose} from '../components/Person';
import {LOOKS} from '../lib/theme';

export const Test3D: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const G = 592;
  const mom: Actor = {key: 'mom', body: BODIES.mom, look: LOOKS.mom, pose: {...standPose(BODIES.mom, 430, G, 1), hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'}, seed: 2};
  const kid: Actor = {key: 'leo5', body: BODIES.age5, look: LOOKS.leo, pose: {...standPose(BODIES.age5, 650, G, -1), hF: [62, -6], hB: [52, 2], mouth: 'grin', eyes: 'happy', walk: 0}, seed: 5};
  const kneel: Actor = {key: 'mom', body: BODIES.mom, look: LOOKS.mom, pose: {...standPose(BODIES.mom, 500, G, 1), hipH: 100, lean: 12, fF: [46, 0], fB: [-90, 0], tilt: 10, hF: [88, -34], hB: [74, -26], mouth: 'grin', eyes: 'happy'}, seed: 2};
  const teen: Actor = {key: 'leo16', body: BODIES.age16, look: LOOKS.leoTeen, pose: {...standPose(BODIES.age16, 590, G, 1), hipH: 106, fF: [74, 0], fB: [58, 0], hF: [82, 20], hB: [72, 28], tilt: 24, eyes: 'down', mouth: 'smile', lean: 6}, seed: 5};
  const momDoor: Actor = {key: 'mom', body: BODIES.mom, look: LOOKS.mom, pose: {...standPose(BODIES.mom, 965, G, -1), mouth: 'open', brows: 'angry'}, z: -1.6, seed: 2};
  const cam = {pos: [0, 3.3, 12] as [number, number, number], target: [0, 2.45, 0] as [number, number, number], fov: 30};
  const ph = handWorld(mom, t);
  const kp = handWorld(kid, t);
  return (
    <AbsoluteFill style={{background: '#111'}}>
      <div style={{position: 'absolute', top: 168, left: 0, width: 1080, height: 630}}>
        <Stage cam={cam}>
          <Kitchen3D bills fridgeArt={0}>
            <Person3D a={mom} t={t} />
            <Phone3D p={ph} rot={[0, -0.3, 0]} />
            <Person3D a={kid} t={t} />
            <Paper3D p={kp} kind="family" w={0.8} rot={[0, 0.25, 0]} />
          </Kitchen3D>
        </Stage>
      </div>
      <div style={{position: 'absolute', top: 890, left: 0, width: 1080, height: 630}}>
        <Stage cam={cam}>
          <Bedroom3D night lamp={1} doorOpen={1} wallArt={14}>
            <Chair3D x={0.32} seat={1.02} facing={1} color="#2f3e5e" />
            <Person3D a={teen} t={t} />
            <Person3D a={momDoor} t={t} />
          </Bedroom3D>
        </Stage>
      </div>
    </AbsoluteFill>
  );
};
