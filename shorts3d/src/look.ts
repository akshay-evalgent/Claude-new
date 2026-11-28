/**
 * The "look": every value that defines the Zack D Films-style render lives here,
 * so a new video only needs a new composition, not new scene code.
 */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 60,
} as const;

export const LOOK = {
  renderer: {
    exposure: 1.1, // used by ACES Filmic, both with and without post-processing
    shadowMapSize: 2048,
  },

  studio: {
    hdri: "/hdri/studio.hdr", // .hdr (RGBELoader/HDRLoader) or .exr (EXRLoader), picked by extension
    environmentIntensity: 1.0,
    rimColor: "#9cc4ff", // cool rim from behind
    rimIntensity: 3.2,
    keyColor: "#fff4e8", // soft warm-neutral key that casts the real shadow
    keyIntensity: 1.4,
  },

  backdrop: {
    floorColor: "#1a1d24",
    wallColor: "#2d333f",
    pbr: "/pbr/Plaster001", // ambientCG maps for micro-surface detail; null to disable
    pbrRepeat: 1.4, // texture tiles per world unit
    pbrStrength: 0.05, // normal-map strength: just enough to break up highlights
    // The backdrop is lit by the HDRI + key, so its albedo is scaled down until the
    // tone-mapped result lands near floorColor/wallColor on screen.
    albedoGain: 0.32,
    envMapIntensity: 0.12,
  },

  hero: {
    url: "/models/hero.glb",
    size: 1.6, // the largest dimension of the model is scaled to this many world units
  },

  physical: {
    clearcoat: 0.35,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.4,
  },

  post: {
    multisampling: 4,
    ao: { aoRadius: 0.5, intensity: 1.5, distanceFalloff: 1.0 },
    bloom: { luminanceThreshold: 1.1, intensity: 0.3 },
    // postprocessing >= 6.36 measures DoF in world units (the older API used
    // normalised 0..1 depth). We auto-focus on the hero, and convert the classic
    // `focalLength: 0.05` (fraction of the camera's near..far span) into a world range.
    dof: { focalLength: 0.05, bokehScale: 2 },
  },

  camera: {
    fov: 32, // a longer lens than three's default 50 compresses the backdrop like a product shot
    near: 0.1,
    far: 20,
  },
} as const;
