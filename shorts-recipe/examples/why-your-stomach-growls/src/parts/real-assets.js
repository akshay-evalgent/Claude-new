// =====================================================================
// REAL ASSETS (all CC0, from Poly Haven): HDR environments for lighting and backgrounds,
// scanned PBR textures, and glTF models. Loaded once before the first frame.
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
const [HALL, SURG, PIPEHDR, STUDIO] = await Promise.all(['school_hall_2k.hdr', 'surgery_2k.hdr', 'industrial_pipe_and_valve_01_2k.hdr', 'studio_small_09_1k.hdr'].map(loadHDR));
const MOD = {};
await Promise.all(['SchoolDesk_01', 'SchoolChair_01', 'wall_clock', 'modular_industrial_pipes_01', 'stationery_supplies', 'office_notepads'].map(async id => { MOD[id] = await loadModel(id); }));
const TX = {};
await Promise.all([['knit', 'knitted_fleece', true], ['plaster', 'plastered_wall', true], ['floor', 'laminate_floor_02', false]].map(async ([k, id, d]) => { TX[k] = await loadPBR(id, { detail: d }); }));
const model = (id) => MOD[id].clone(true);
// a named part of a model (e.g. the clock's minute hand)
const part = (root, name) => { let f = null; root.traverse(o => { if (o.name === name) f = o; }); return f; };
