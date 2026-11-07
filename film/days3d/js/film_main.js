// Frame-by-frame renderer for one film shot: ?shot=name&w=&h=&fps=
// window.frame(i) renders frame i and returns a JPEG data URL of WebGL + overlay.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FILM } from './film.js';
import { loadFonts } from './ui.js';
await loadFonts();

const q = new URLSearchParams(location.search);
const W = +(q.get('w') || 1920), H = +(q.get('h') || 1080), FPS = +(q.get('fps') || 24);
const shot = FILM[q.get('shot')];
const stage = document.getElementById('stage'); stage.style.width = W + 'px'; stage.style.height = H + 'px';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.toneMapping = THREE.NoToneMapping;
stage.appendChild(renderer.domElement);
const overlay = document.createElement('canvas'); overlay.width = W; overlay.height = H; stage.appendChild(overlay);
const og = overlay.getContext('2d');
const final = document.createElement('canvas'); final.width = W; final.height = H; const fg = final.getContext('2d');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 3000);
const ctx = { THREE, scene, camera, renderer, W, H, vertical: H > W, fps: FPS };
const S = (await shot.build(ctx)) || {};
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bc = S.bloom || {};
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), bc.strength ?? 0.7, bc.radius ?? 0.5, bc.threshold ?? 0.85);
if (S.bloom !== false) composer.addPass(bloom);
composer.addPass(new OutputPass());
const project = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; };

window.DUR = shot.dur; window.FPS = FPS;
window.frame = async (i, fmt = 'jpeg') => {
  const t = i / FPS;
  if (S.update) await S.update(t, { bloom });
  camera.aspect = W / H; camera.updateProjectionMatrix();
  composer.render();
  og.clearRect(0, 0, W, H);
  if (S.overlay) S.overlay(og, W, H, t, { project, camera });
  fg.drawImage(renderer.domElement, 0, 0); fg.drawImage(overlay, 0, 0);
  if (S.post) S.post(fg, W, H, t);
  return final.toDataURL(fmt === 'png' ? 'image/png' : 'image/jpeg', 0.93);
};
window.READY = true;
