// "Why Cats Sit On Your Laptop": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// Real 3D scans of real cats and a rigged cat model (CC BY, via Sketchfab / Objaverse); rooms, furniture, textures and the
// desert sky from Poly Haven (CC0); a procedural modern laptop, thermal camera and overlays.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GroundProjectedSkybox } from 'three/addons/objects/GroundProjectedSkybox.js';

const W = 1080, H = 1920, ASPECT = W / H;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);
const ENV = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- cue times (seconds) from the voiceover word timings ----------
const C = {
  your: 0.02, cat: 0.22, isnt: 0.46, sitting: 0.78, on: 1.06, your2: 1.28, laptop: 1.44, to: 1.9, annoy: 2.18, you: 2.48, its: 2.98, sitting2: 3.2,
  on2: 3.4, a: 3.62, heater: 3.74, a2: 4.64, laptop2: 4.74, runs: 5.18, as: 5.56, warm: 5.92, as2: 6.34, your3: 6.6, skin: 6.76, and: 7.16, cats: 7.58,
  feel: 7.86, best: 8.1, at: 8.38, temperatures: 8.62, that: 9.1, would: 9.44, make: 9.6, you2: 9.84, sweat: 10.08, their: 10.97, ancestors: 11.12,
  lived: 11.62, in_: 12.08, the: 12.32, desert: 12.44, thats: 13.22, why: 13.48, it: 13.68, steals: 13.88, your4: 14.26, warm2: 14.56, seat: 14.88,
  and2: 15.18, follows: 15.42, the2: 15.8, sunbeam: 16.06, across: 16.48, the3: 16.84, floor: 17.1, theres: 17.94, a3: 18.18, second: 18.32,
  reason: 18.54, the4: 19.46, laptop3: 19.56, is: 19.96, where: 20.26, your5: 20.46, eyes: 20.66, are: 21.04, all: 21.3, day: 21.58, to2: 22.38,
  your6: 22.48, cat2: 22.68, its2: 23.11, the5: 23.28, thing: 23.46, stealing: 23.66, your7: 24.14, attention: 24.44, so: 24.86, it2: 25.22, sits: 25.4,
  right: 25.66, on3: 25.96, it3: 26.2, and3: 26.74, the6: 26.86, keys: 26.96, smell: 27.26, like: 27.66, your8: 27.96, hands: 28.14, so2: 28.52,
  next: 29.0, time: 29.32, your9: 29.66, cat3: 29.84, lies: 30.12, on4: 30.44, your10: 30.72, keyboard: 30.9, dont: 31.6, push: 31.78, it4: 31.94,
  off: 32.12, because: 32.38, end: 32.6333,
};

