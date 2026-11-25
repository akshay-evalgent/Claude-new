/* A 3D panel: ThreeCanvas + animated camera + projection helper for HTML overlays. */
import React from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {V3} from './core';

export type Cam = {pos: V3; target: V3; fov: number};
export const PANEL_W = 1080;
export const PANEL_H3 = 630;

const CamRig: React.FC<{cam: Cam}> = ({cam}) => {
  const {camera, gl} = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.fov = cam.fov;
  c.aspect = PANEL_W / PANEL_H3;
  c.near = 0.1;
  c.far = 80;
  c.lookAt(...cam.target);
  c.updateProjectionMatrix();
  gl.toneMapping = THREE.NeutralToneMapping;
  gl.toneMappingExposure = 1.0;
  return null;
};

/** Project a world point to panel pixels for the same camera. */
export const projector = (cam: Cam) => {
  const c = new THREE.PerspectiveCamera(cam.fov, PANEL_W / PANEL_H3, 0.1, 80);
  c.position.set(...cam.pos);
  c.lookAt(...cam.target);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  return (p: V3): [number, number] => {
    const v = new THREE.Vector3(...p).project(c);
    return [((v.x + 1) / 2) * PANEL_W, ((1 - v.y) / 2) * PANEL_H3];
  };
};

export const Stage: React.FC<{cam: Cam; bg?: string; children: React.ReactNode}> = ({cam, bg = '#0b0a0f', children}) => (
  <ThreeCanvas width={PANEL_W} height={PANEL_H3} shadows="soft" style={{background: bg}} gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: cam.fov, position: cam.pos}}>
    <CamRig cam={cam} />
    {children}
  </ThreeCanvas>
);
