// "Why Cats Show You Their Butt": a photoreal 9:16 short. three.js, rendered headless frame by frame.
// A rigged cat model (CC BY, via Sketchfab / Objaverse) in two coats and as kittens; a living room, sofa and textures from Poly Haven (CC0).
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
  when: 0.03, your: 0.14, cat: 0.35, sticks: 0.56, its: 0.88, butt: 1.25, in_: 1.36, your2: 1.48, face: 1.64, its2: 1.98, being: 2.37, polite: 2.52,
  a: 3.44, tail: 3.52, straight: 3.84, up: 4.2, means: 4.4, hello: 4.7, when2: 5.71, two: 5.82, friendly: 6.08, cats: 6.48, meet: 6.86, they: 7.23,
  touch: 7.38, noses: 7.66, then: 8.12, circle: 8.56, around: 8.94, and: 9.34, sniff: 9.6, each: 9.9, others: 10.24, rear: 10.64, glands: 11.42,
  back: 11.8, there: 12.1, give: 12.34, off: 12.52, a2: 12.74, scent: 12.94, that: 13.18, works: 13.44, like: 13.72, an: 13.98, id: 14.1, card: 14.42,
  unique: 14.88, to: 15.24, each2: 15.5, cat2: 15.72, lifting: 16.57, the: 16.96, tail2: 17.2, is: 17.54, holding: 17.74, out: 18.08, the2: 18.46,
  id2: 18.56, kittens: 19.57, do_: 19.84, it: 20.16, for_: 20.32, their: 20.46, mother: 20.64, too: 20.86, when3: 21.76, your3: 21.86, cat3: 22.02,
  turns: 22.36, around2: 22.6, and2: 23.0, shows: 23.24, you: 23.46, its3: 23.7, butt2: 23.97, its4: 24.12, greeting: 24.44, you2: 24.68, like2: 24.96,
  family: 25.16, youre: 26.05, just: 26.24, not: 26.44, expected: 26.68, to2: 27.14, sniff2: 27.4, back2: 27.79, so: 28.08, next: 28.41, time: 28.74,
  it2: 29.02, happens: 29.16, dont: 29.44, take: 30.0, it3: 30.14, personally: 30.33, because: 30.8, end: 31.1333,
};

