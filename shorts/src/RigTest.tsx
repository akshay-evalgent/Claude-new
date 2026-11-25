import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {Person, BODIES, standPose, Pose} from './components/Person';
import {LOOKS} from './lib/theme';

export const RigTest: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const y = 560;
  const m = BODIES.mom, k = BODIES.age5, k8 = BODIES.age8, k16 = BODIES.age16, man = BODIES.man, k12 = BODIES.age12;
  const kneel: Pose = {...standPose(m, 820, y, -1), hipH: 105, lean: 12, fF: [40, 0], fB: [-95, 0], hF: [40, 40], hB: [30, 60], tilt: 10, mouth: 'open', eyes: 'wide', brows: 'up'};
  const sit: Pose = {...standPose(man, 980, y, -1), hipH: 120, fF: [80, 0], fB: [60, 0], hF: [60, 50], hB: [55, 60], lean: -4};
  return (
    <AbsoluteFill style={{background: '#9fb59a'}}>
      <svg viewBox="0 0 1080 630" width={1080} height={630}>
        <rect x={0} y={y} width={1080} height={70} fill="#c99a6b" />
        <Person body={k} look={LOOKS.leo} pose={{...standPose(k, 90, y), hF: [40, -60], mouth: 'grin', eyes: 'happy'}} t={t} />
        <Person body={k8} look={LOOKS.leo} pose={{...standPose(k8, 210, y), walk: 1, x: 210 + t * 120}} t={t} />
        <Person body={k12} look={LOOKS.leo} pose={{...standPose(k12, 330, y), mouth: 'sad', brows: 'sad', eyes: 'down', tilt: 15}} t={t} />
        <Person body={k16} look={LOOKS.leoTeen} pose={{...standPose(k16, 450, y), mouth: 'flat'}} t={t} />
        <Person body={man} look={LOOKS.leoAdult} pose={{...standPose(man, 580, y), hF: [50, -20], mouth: 'smile', tilt: 20, eyes: 'down'}} t={t} />
        <Person body={m} look={LOOKS.mom} pose={{...standPose(m, 700, y, -1), mouth: 'talk', talk: 1, brows: 'angry'}} t={t} />
        <Person body={m} look={LOOKS.mom} pose={kneel} t={t} />
        <Person body={man} look={LOOKS.leoAdult} pose={sit} t={t} />
        <Person body={BODIES.age5} look={LOOKS.mia} pose={{...standPose(BODIES.age5, 1030, y, -1), mouth: 'grin'}} t={t} />
      </svg>
    </AbsoluteFill>
  );
};
