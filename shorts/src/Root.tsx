import React from 'react';
import {Composition} from 'remotion';
import {RigTest} from './RigTest';
import {Ep01Drawing, EP01_DURATION} from './episodes/Ep01Drawing';
import {FPS, W, H} from './lib/theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ep01" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * FPS)} fps={FPS} width={W} height={H} defaultProps={{withAudio: true}} />
    <Composition id="Ep01NoMusic" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * FPS)} fps={FPS} width={W} height={H} defaultProps={{withAudio: true, music: false}} />
    <Composition id="Ep01Preview" component={Ep01Drawing} durationInFrames={Math.round(EP01_DURATION * 10)} fps={10} width={W} height={H} defaultProps={{withAudio: false}} />
    <Composition id="RigTest" component={RigTest} durationInFrames={120} fps={30} width={1080} height={630} />
  </>
);
