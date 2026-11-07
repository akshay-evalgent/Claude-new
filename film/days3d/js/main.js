// Renders one shot (?shot=name&w=&h=) to a WebGL canvas with bloom, plus a 2D overlay canvas on top.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SHOTS } from './shots.js';
import { loadFonts } from './ui.js';
await loadFonts();

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1280), H = +(q.get('h') || 720);
const name = q.get('shot') || 'test';
const stage = document.getElementById('stage');
stage.style.width = W + 'px'; stage.style.height = H + 'px';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
stage.appendChild(renderer.domElement);
const overlay = document.createElement('canvas'); overlay.width = W; overlay.height = H; stage.appendChild(overlay);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 2000);
const shot = SHOTS[name];
const cfg = (await shot({ THREE, scene, camera, renderer, W, H })) || {};
if (cfg.aces) { renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = cfg.exposure ?? 1.0; }

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
if (cfg.bloom !== false) {
  const b = cfg.bloom || {};
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), b.strength ?? 0.7, b.radius ?? 0.5, b.threshold ?? 0.85));
}
composer.addPass(new OutputPass());
if (cfg.before) cfg.before();
if (cfg.views) {   // several cameras into panels of one frame: [{camera, x, y, w, h}] in pixels from the top-left
  renderer.setClearColor(scene.background || 0x000000); renderer.clear();
  renderer.setScissorTest(true);
  for (const v of cfg.views) {
    v.camera.aspect = v.w / v.h; v.camera.updateProjectionMatrix();
    renderer.setViewport(v.x, H - v.y - v.h, v.w, v.h); renderer.setScissor(v.x, H - v.y - v.h, v.w, v.h);
    renderer.render(scene, v.camera);
  }
  renderer.setScissorTest(false);
} else composer.render();
if (cfg.overlay) cfg.overlay(overlay.getContext('2d'), W, H, { camera, project: (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; } });
window.READY = true;
