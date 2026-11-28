import {
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
} from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type PhysicalUpgrade = {
  clearcoat: number;
  clearcoatRoughness: number;
  envMapIntensity: number;
};

/**
 * Walks a loaded glTF scene and turns every surface into a MeshPhysicalMaterial
 * with a thin clearcoat, so it reads as a tactile, slightly glossy object
 * instead of flat plastic. All PBR maps (base color, normal, ORM, emissive...) are kept.
 */
export function upgradeToPhysical(root: Object3D, opts: PhysicalUpgrade) {
  const cache = new Map<Material, MeshPhysicalMaterial>();

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // GLBs without normals (common from AI generators) get flat-shaded by GLTFLoader.
    // Plain computeVertexNormals() would leave hard edges along every UV seam, so
    // smooth by position instead, keeping real creases sharper than 60 degrees.
    const missingNormals = !mesh.geometry.attributes.normal;
    if (missingNormals) mesh.geometry = toCreasedNormals(mesh.geometry, Math.PI / 3);

    const convert = (m: Material) => {
      let out = cache.get(m);
      if (!out) {
        out = toPhysical(m, opts);
        cache.set(m, out);
      }
      return out;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(convert)
      : convert(mesh.material);
    if (missingNormals) for (const m of ([] as Material[]).concat(mesh.material)) (m as MeshPhysicalMaterial).flatShading = false;
  });
}

function toPhysical(src: Material, opts: PhysicalUpgrade): MeshPhysicalMaterial {
  let mat: MeshPhysicalMaterial;

  if ((src as MeshPhysicalMaterial).isMeshPhysicalMaterial) {
    // Already physical (glTF KHR_materials_* extensions): keep transmission, sheen, etc.
    mat = src as MeshPhysicalMaterial;
  } else if ((src as MeshStandardMaterial).isMeshStandardMaterial) {
    mat = new MeshPhysicalMaterial();
    // Copy every standard PBR property and map, then restore the PHYSICAL define
    // that MeshStandardMaterial.copy() overwrites.
    MeshStandardMaterial.prototype.copy.call(mat, src as MeshStandardMaterial);
    mat.defines = { STANDARD: "", PHYSICAL: "" };
    src.dispose();
  } else {
    // Unlit/basic/phong materials from odd exporters: keep their color and texture.
    const anySrc = src as unknown as { color?: MeshPhysicalMaterial["color"]; map?: MeshPhysicalMaterial["map"] };
    mat = new MeshPhysicalMaterial({ roughness: 0.55, metalness: 0 });
    if (anySrc.color) mat.color.copy(anySrc.color);
    if (anySrc.map) mat.map = anySrc.map;
    mat.name = src.name;
  }

  // Glass/transmissive parts shouldn't get a coat on top of their own specular.
  if (mat.transmission === 0) {
    mat.clearcoat = opts.clearcoat;
    mat.clearcoatRoughness = opts.clearcoatRoughness;
  }
  mat.envMapIntensity = opts.envMapIntensity;
  mat.needsUpdate = true;
  return mat;
}
