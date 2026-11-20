// =====================================================================
// REAL ASSETS (all CC0, from Poly Haven): the Piazza San Marco and a studio as HDR environments,
// a scanned granite paving texture and a camera model. Loaded once before the first frame.
// =====================================================================
const AS = 'assets/';
const rgbeL = new RGBELoader(), gltfL = new GLTFLoader(), texL = new THREE.TextureLoader();
async function loadHDR(file) {
  const t = await rgbeL.loadAsync(AS + file); t.mapping = THREE.EquirectangularReflectionMapping;
  return { tex: t, env: pmrem.fromEquirectangular(t).texture };
}
async function loadModel(id) {
  const g = await gltfL.loadAsync(`${AS}${id}/${id}.gltf`);
  g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; if (o.material.map) o.material.map.anisotropy = 8; } });
  return g.scene;
}
async function loadTex(path, srgb = true) {
  const t = await texL.loadAsync(AS + path); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// a PBR set: albedo (or a grey detail map to tint), normal, roughness, ao
async function loadPBR(id, { detail = false } = {}) {
  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([loadTex(`${id}/${detail ? 'Detail' : 'Diffuse'}.jpg`), loadTex(`${id}/nor_gl.jpg`, false), loadTex(`${id}/Rough.jpg`, false), loadTex(`${id}/AO.jpg`, false)]);
  return { map, normalMap, roughnessMap, aoMap };
}
// a material from a PBR set, with its own repeat (textures are cloned so repeats don't clash)
function pbrMat(set, { rep = [1, 1], color = 0xffffff, normal = 1, rough = 1, phys = false, ...extra } = {}) {
  const c = (t) => { if (!t) return null; const k = t.clone(); k.repeat.set(rep[0], rep[1]); k.needsUpdate = true; return k; };
  const M_ = phys ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  return new M_({ map: c(set.map), normalMap: c(set.normalMap), roughnessMap: c(set.roughnessMap), color, roughness: rough, normalScale: new THREE.Vector2(normal, normal), ...extra });
}
const [PIAZZA, STUDIO] = await Promise.all(['piazza_san_marco_4k.hdr', 'studio_small_09_1k.hdr'].map(loadHDR));
const MOD = {};
await Promise.all(['Camera_01'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {};
await Promise.all([['granite', 'granite_tile', false]].map(async ([k, id, d]) => { TX[k] = await loadPBR(id, { detail: d }); }));
// the sun's direction in the piazza HDR: the brightest texel of the equirect image
const SUN_DIR = (() => {
  const im = PIAZZA.tex.image, d = im.data, w = im.width, h = im.height; let best = -1, bi = 0;
  const toF = d instanceof Uint16Array ? THREE.DataUtils.fromHalfFloat : (x) => x;
  for (let y = 0; y < h / 2; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; const L = toF(d[i]) * 0.3 + toF(d[i + 1]) * 0.59 + toF(d[i + 2]) * 0.11; if (L > best) { best = L; bi = y * w + x; } }
  // three.js equirect lookup: u = atan(z, x) / 2pi + 0.5, v = asin(y) / pi + 0.5 (row 0 is the top of the image)
  const phi = ((bi % w + 0.5) / w - 0.5) * 2 * Math.PI, lat = (0.5 - (Math.floor(bi / w) + 0.5) / h) * Math.PI;
  return { dir: new THREE.Vector3(Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat)), L: best, lat };
})();
const model = (id) => MOD[id].clone(true);
// a named part of a model (e.g. the clock's minute hand)
const part = (root, name) => { let f = null; root.traverse(o => { if (o.name === name) f = o; }); return f; };
