// "Why A Cat's Tail Puffs Up": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// A rigged cat model (CC BY, via Sketchfab / Objaverse) with fur that stands on end; rooms and textures from Poly Haven (CC0); a procedural hair follicle.
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
  when: 0.03, a: 0.14, cats: 0.26, tail: 0.62, puffs: 0.84, up: 1.18, like: 1.4, a2: 1.6, bottle: 1.76, brush: 2.08, its: 2.76, the: 2.88, same: 3.06,
  thing: 3.34, that: 3.66, gives: 3.88, you: 4.08, goosebumps: 4.32, every: 5.42, hair: 5.66, grows: 5.96, from: 6.36, a3: 6.64, tiny: 6.82, pit: 7.29,
  with_: 7.48, its2: 7.68, own: 7.82, tiny2: 8.08, muscle: 8.5, when2: 9.34, the2: 9.42, cat: 9.56, gets: 9.76, scared: 10.06, adrenaline: 11.32,
  hits: 11.32, and: 11.72, thousands: 12.06, of: 12.38, those: 12.66, muscles: 12.9, squeeze: 13.24, at: 13.58, once: 13.82, the3: 14.68, hairs: 14.78,
  stand: 14.98, straight: 15.38, up2: 15.76, and2: 16.07, the4: 16.22, tail2: 16.34, can: 16.64, look: 16.86, twice: 17.12, as: 17.38, thick: 17.64,
  then: 18.39, the5: 18.6, cat2: 18.76, arches: 19.1, its3: 19.44, back: 19.74, and3: 19.96, turns: 20.18, sideways: 20.54, so: 21.12, whatever: 21.48,
  scared2: 21.82, it: 22.2, sees: 22.36, the6: 22.64, biggest: 22.9, cat3: 23.22, possible: 23.69, your: 24.73, goosebumps2: 24.9, are: 25.56,
  left: 25.76, over: 25.98, from2: 26.32, when3: 26.6, our: 26.8, ancestors: 26.96, had: 27.48, fur: 27.9, so2: 28.22, if_: 28.71, your2: 29.0,
  cats2: 29.16, tail3: 29.58, ever: 29.78, puffs2: 30.08, up3: 30.4, give: 30.71, it2: 30.9, some: 31.02, space: 31.22, because: 31.6, end: 32.0,
};

