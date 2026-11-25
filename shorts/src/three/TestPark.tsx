import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Stage} from './Stage';
import {Playground3D, BENCH, Basketball3D, Guitar3D, chuteY} from './Playground3D';
import {Person3D, Actor, toWorld3, joints3} from './Person3D';
import {Phone3D} from './Props3D';
import {BODIES, standPose} from '../components/Person';
import {LOOKS} from '../lib/theme';
import {Bedroom3D, Chair3D} from './Sets3D';
import {U, X} from './core';

export const TestPark: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const G = 592;
  const cam = {pos: [0, 3.25, 13] as [number, number, number], target: [0, 2.62, 0] as [number, number, number], fov: 30};
  const m = BODIES.mom;
  const momSit: Actor = {key: 'mom', body: m, look: LOOKS.mom, pose: {...standPose(m, 180, G, 1), hipH: BENCH.seat * 100 + 4, fF: [64, 0], fB: [50, 0], hF: [40, 44], hB: [30, 52], tilt: 24, eyes: 'down', mouth: 'flat'}, z: 0, seed: 2};
  const k5 = BODIES.age5;
  const sx = 760;
  const kidSlide: Actor = {key: 'leo5', body: k5, look: LOOKS.leo, pose: {...standPose(k5, sx, G, -1), hipH: 14, fF: [52, 12], fB: [46, 12], lean: -12, hF: [24, -70], hB: [14, -66], mouth: 'grin', eyes: 'happy', lift: chuteY(X(sx)) * 100}, z: -0.35, seed: 5};
  const k8 = BODIES.age8;
  const flip: Actor = {key: 'leo8', body: k8, look: LOOKS.leo, pose: {...standPose(k8, 380, G, -1), hipH: 70, fF: [30, -40], fB: [20, -36], hF: [40, -30], hB: [30, -26], lift: 140, spin: 120, mouth: 'grin', eyes: 'happy'}, z: 0.4, seed: 3};
  const k12 = BODIES.age12;
  const shooter: Actor = {key: 'leo12', body: k12, look: LOOKS.leo, pose: {...standPose(k12, 860, G, 1), hF: [20, -110], hB: [10, -104], lift: 20}, z: 0.3, seed: 4};
  const hw = toWorld3(shooter, joints3(shooter, t).haF);
  const ph = toWorld3(momSit, joints3(momSit, t).haF);
  const k16 = BODIES.age16;
  const teen: Actor = {key: 'leo16', body: k16, look: LOOKS.leoTeen, pose: {...standPose(k16, 590, G, 1), hipH: 106, fF: [74, 0], fB: [58, 0], hF: [40, 70], hB: [90, 40], tilt: 14, eyes: 'down', mouth: 'smile', lean: 4}, seed: 5};
  const gp = toWorld3(teen, [0.42, 1.45, 0.1]);
  return (
    <AbsoluteFill style={{background: '#111'}}>
      <div style={{position: 'absolute', top: 168, left: 0, width: 1080, height: 630}}>
        <Stage cam={cam}>
          <Playground3D t={t} hoop>
            <Person3D a={momSit} t={t} />
            <Phone3D p={ph} rot={[-0.2, -0.5, 0]} />
            <Person3D a={kidSlide} t={t} />
            <Person3D a={flip} t={t} />
            <Person3D a={shooter} t={t} />
            <Basketball3D p={[hw[0], hw[1] + 0.28, hw[2]]} spin={t} />
          </Playground3D>
        </Stage>
      </div>
      <div style={{position: 'absolute', top: 890, left: 0, width: 1080, height: 630}}>
        <Stage cam={cam}>
          <Bedroom3D lamp={0.6} wallArt={10}>
            <Chair3D x={0.32} seat={1.02} facing={1} color="#2f3e5e" />
            <Person3D a={teen} t={t} />
            <Guitar3D p={gp} rot={[0, -0.2, 0.35]} />
          </Bedroom3D>
        </Stage>
      </div>
    </AbsoluteFill>
  );
};
