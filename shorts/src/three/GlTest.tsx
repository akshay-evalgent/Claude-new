import React from 'react';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import * as THREE from 'three';

const Scene: React.FC<{t: number}> = ({t}) => (
  <>
    <hemisphereLight args={['#fff4e0', '#6b5a4a', 0.9]} />
    <directionalLight position={[4, 8, 6]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} />
    <mesh rotation-x={-Math.PI / 2} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#c4935f" />
    </mesh>
    <mesh position={[0, 3, -3]} receiveShadow>
      <boxGeometry args={[20, 6, 0.2]} />
      <meshStandardMaterial color="#a8c0a0" />
    </mesh>
    {Array.from({length: 30}).map((_, i) => (
      <mesh key={i} position={[-5 + (i % 10), 0.8 + Math.sin(t * 2 + i) * 0.2, -1 + Math.floor(i / 10)]} castShadow receiveShadow>
        <capsuleGeometry args={[0.25, 0.8, 8, 16]} />
        <meshStandardMaterial color={new THREE.Color().setHSL(i / 30, 0.6, 0.6)} roughness={0.7} />
      </mesh>
    ))}
  </>
);

export const GlTest: React.FC = () => {
  const f = useCurrentFrame();
  const panel = (top: number) => (
    <div style={{position: 'absolute', top, left: 0, width: 1080, height: 630}}>
      <ThreeCanvas width={1080} height={630} shadows camera={{position: [0, 2.6, 12], fov: 30}} gl={{antialias: true}} onCreated={({gl, camera}) => { gl.toneMapping = THREE.ACESFilmicToneMapping; camera.lookAt(0, 1.6, 0); }}>
        <Scene t={f / 30} />
      </ThreeCanvas>
    </div>
  );
  return <AbsoluteFill style={{background: '#111'}}>{panel(168)}{panel(890)}</AbsoluteFill>;
};
