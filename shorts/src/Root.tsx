import React from 'react';
import {Composition} from 'remotion';
import {RigTest} from './RigTest';
import {GlTest} from './three/GlTest';
import {Test3D} from './three/Test3D';
import {TestPark} from './three/TestPark';
import {Ep01_3D} from './episodes/Ep01_3D';
import {Ep02_3D, EP02_DURATION} from './episodes/Ep02_3D';
import {Ep03_3D, EP03_DURATION} from './episodes/Ep03_3D';
import {Ep01Drawing, EP01_DURATION} from './episodes/Ep01Drawing';
import {FPS, W, H} from './lib/theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * FPS)} fps={FPS} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep01NoMusic" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * FPS)} fps={FPS} width={W} height={H} defaultProps={{withAudio: true, music: false}} />
    <Composition id="Ep01Preview" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * 10)} fps={10} width={W} height={H} defaultProps={{withAudio: false}} />
    <Composition id="Ep01-3D" component={Ep01_3D} durationInFrames={Math.round(EP01_DURATION * 60)} fps={60} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep01-3D-30" component={Ep01_3D} durationInFrames={Math.round(EP01_DURATION * 30)} fps={30} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep01-3D-NoMusic" component={Ep01_3D} durationInFrames={Math.round(EP01_DURATION * 30)} fps={30} width={W} height={H} defaultProps={{withAudio: true, music: false}} />
    <Composition id="Ep01-3D-Preview" component={Ep01_3D} durationInFrames={Math.round(EP01_DURATION * 6)} fps={6} width={W} height={H} defaultProps={{withAudio: false}} />
    <Composition id="Ep02-3D" component={Ep02_3D} durationInFrames={Math.round(EP02_DURATION * 60)} fps={60} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep02-3D-NoMusic" component={Ep02_3D} durationInFrames={Math.round(EP02_DURATION * 30)} fps={30} width={W} height={H} defaultProps={{withAudio: true, music: false}} />
    <Composition id="Ep02-3D-Preview" component={Ep02_3D} durationInFrames={Math.round(EP02_DURATION * 6)} fps={6} width={W} height={H} defaultProps={{withAudio: false}} />
    <Composition id="Ep03-3D" component={Ep03_3D} durationInFrames={Math.round(EP03_DURATION * 60)} fps={60} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep03-3D-NoMusic" component={Ep03_3D} durationInFrames={Math.round(EP03_DURATION * 30)} fps={30} width={W} height={H} defaultProps={{withAudio: true, music: false}} />
    <Composition id="Ep03-3D-Preview" component={Ep03_3D} durationInFrames={Math.round(EP03_DURATION * 6)} fps={6} width={W} height={H} defaultProps={{withAudio: false}} />
    <Composition id="TestPark" component={TestPark} durationInFrames={30} fps={30} width={1080} height={1920} />
    <Composition id="Test3D" component={Test3D} durationInFrames={30} fps={30} width={1080} height={1920} />
    <Composition id="GlTest" component={GlTest} durationInFrames={24} fps={30} width={1080} height={1920} />
    <Composition id="RigTest" component={RigTest} durationInFrames={120} fps={30} width={1080} height={630} />
  </>
);
