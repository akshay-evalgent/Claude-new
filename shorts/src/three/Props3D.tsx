import React from 'react';
import * as THREE from 'three';
import {Ball, Box, Card, Cyl, DrawingKind, GEO, RBox, V3, basic, mat, tex} from './core';

/** A kid's drawing held at its bottom edge (origin = bottom centre). Faces +z. */
export const Paper3D: React.FC<{p: V3; kind: DrawingKind; w?: number; rot?: V3; fold?: number; tint?: string}> = ({p, kind, w = 0.84, rot = [0, 0, 0], fold = 1, tint}) => {
  const h = w * 0.76;
  return (
    <group position={p} rotation={rot}>
      <group scale={[1, fold, 1]}>
        <Card p={[0, h / 2 - 0.06, 0]} w={w} h={h} tex={tex.drawing(kind, tint)} />
      </group>
    </group>
  );
};

export const Phone3D: React.FC<{p: V3; rot?: V3; glow?: number}> = ({p, rot = [0, 0, 0], glow = 1}) => (
  <group position={p} rotation={rot}>
    <group position={[0, 0.26, 0]}>
      <mesh geometry={GEO.box} material={mat('#1c1c26', {rough: 0.25, metal: 0.4})} scale={[0.28, 0.52, 0.04]} castShadow />
      <mesh geometry={GEO.plane} material={basic('#ffffff', {map: tex.phoneScreen()})} position={[0, 0, 0.0215]} scale={[0.24, 0.46, 1]} />
      {glow > 0 && <mesh geometry={GEO.plane} material={basic('#9fd8ff', {map: tex.glow(), transparent: true, opacity: 0.35 * glow, additive: true})} position={[0, 0, 0.06]} scale={[1.3, 1.3, 1]} />}
    </group>
  </group>
);

export const Gift3D: React.FC<{p: V3; s?: number}> = ({p, s = 1}) => (
  <group position={p} scale={s}>
    <RBox p={[0, 0.3, 0]} s={[0.62, 0.5, 0.5]} m={mat('#e2445c', {rough: 0.5})} r={0.04} />
    <RBox p={[0, 0.58, 0]} s={[0.7, 0.12, 0.58]} m={mat('#ff6b81', {rough: 0.5})} r={0.03} />
    <Box p={[0, 0.34, 0]} s={[0.12, 0.64, 0.6]} m={mat('#ffd34d', {rough: 0.4})} />
    <Box p={[0, 0.34, 0]} s={[0.72, 0.64, 0.12]} m={mat('#ffd34d', {rough: 0.4})} />
    <Ball p={[-0.12, 0.7, 0]} r={[0.16, 0.08, 0.08]} rot={[0, 0, 0.5]} m={mat('#ffd34d', {rough: 0.4})} />
    <Ball p={[0.12, 0.7, 0]} r={[0.16, 0.08, 0.08]} rot={[0, 0, -0.5]} m={mat('#ffd34d', {rough: 0.4})} />
  </group>
);

const MARKERS = ['#e2445c', '#f5a623', '#ffd34d', '#5cb85c', '#3b82f6', '#8e44ad'];
export const Markers3D: React.FC<{p: V3; rot?: V3}> = ({p, rot}) => (
  <group position={p} rotation={rot}>
    <RBox p={[0, 0.12, 0]} s={[0.78, 0.24, 0.3]} m={mat('#ffffff', {rough: 0.6})} r={0.03} />
    {MARKERS.map((c, i) => (
      <group key={c} position={[-0.3 + i * 0.12, 0.38, 0]}>
        <Cyl p={[0, 0, 0]} r={0.045} h={0.42} m={mat(c, {rough: 0.4})} />
        <Cyl p={[0, 0.25, 0]} r={0.03} h={0.08} m={mat('#2b2b36')} />
      </group>
    ))}
  </group>
);

export const Sketchbook3D: React.FC<{p: V3; rot?: V3; open?: number; w?: number}> = ({p, rot = [0, 0, 0], open = 0, w = 1.0}) => (
  <group position={p} rotation={rot}>
    <RBox p={[0, 0.04, 0]} s={[w, 0.08, w * 0.72]} m={mat('#2f3e5e', {rough: 0.7})} r={0.02} />
    <Box p={[0, 0.085, 0]} s={[w * 0.96, 0.02, w * 0.68]} m={mat('#fffaf0', {rough: 0.9})} />
    {open > 0 && (
      <group position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex.drawing('dino'), rough: 0.9, transparent: true, opacity: open})} scale={[w * 0.9, w * 0.62, 1]} />
      </group>
    )}
  </group>
);

export const Book3D: React.FC<{p: V3; rot?: V3; label?: string; color?: string}> = ({p, rot = [0, 0, 0], label = 'MATH', color = '#3b82f6'}) => (
  <group position={p} rotation={rot}>
    <RBox p={[0, 0.07, 0]} s={[0.9, 0.14, 0.66]} m={mat(color, {rough: 0.6})} r={0.02} />
    <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex.label(label, color, '#ffffff'), rough: 0.6})} position={[0, 0.142, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.6, 0.22, 1]} />
  </group>
);

const MUG_HANDLE = new THREE.TorusGeometry(0.08, 0.025, 8, 16);
export const Mug3D: React.FC<{p: V3}> = ({p}) => (
  <group position={p}>
    <Cyl p={[0, 0.14, 0]} r={0.12} h={0.28} m={mat('#f4f1ea', {rough: 0.35})} />
    <mesh geometry={MUG_HANDLE} material={mat('#f4f1ea', {rough: 0.35})} position={[0.14, 0.15, 0]} />
  </group>
);

/** Crumple-free falling paper: flutters from `from` to the floor. */
export const FallingPaper3D: React.FC<{t: number; at: number; from: V3; kind: DrawingKind; w?: number; z?: number}> = ({t, at, from, kind, w = 0.84}) => {
  if (t < at) return null;
  const p = Math.min(1, (t - at) / 1.0);
  const x = from[0] + Math.sin(p * Math.PI * 2) * 0.3 + p * 0.4;
  const y = from[1] + (0.02 - from[1]) * (p * p);
  const z = from[2] + p * 0.3;
  const flat = p >= 1 ? -Math.PI / 2 : -p * p * (Math.PI / 2) + Math.sin(p * Math.PI * 3) * 0.4 * (1 - p);
  const spin = Math.sin(p * Math.PI * 2.5) * 0.5 * (1 - p);
  const h = w * 0.76;
  return (
    <group position={[x, p >= 1 ? 0.02 : y, z]} rotation={[flat, spin, 0]}>
      <Card p={[0, p >= 1 ? 0 : -h / 2 + h / 2, 0]} w={w} h={h} tex={tex.drawing(kind)} />
    </group>
  );
};
