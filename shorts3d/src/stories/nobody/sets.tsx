import { useGLTF, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from "three";
import { vinyl } from "../../characters/Mannequin";
import { GroundedEnv } from "../../scene/GroundedEnv";
import { asset } from "../../scene/HeroModel";

export type Light = "day" | "dusk" | "night";

/** Stage dimensions (metres). The crowd stands at +Z, facing the stage. */
export const STAGE = { w: 7, d: 3.6, h: 0.9, front: 1.8 } as const;

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------

export const SquareLighting: React.FC<{ light: Light }> = ({ light }) => {
  const cfg = {
    day: { env: 0.9, bg: 1.0, sun: 2.4, sunColor: "#ffe7c4", sunPos: [7, 10, 9] as const, fill: 0 },
    dusk: { env: 0.48, bg: 0.4, sun: 1.6, sunColor: "#ff9a52", sunPos: [-9, 2.6, 4] as const, fill: 0 },
    night: { env: 0.1, bg: 0.06, sun: 0.7, sunColor: "#8fb3ff", sunPos: [-5, 9, -4] as const, fill: 1 },
  }[light];
  return (
    <>
      <GroundedEnv file="/hdri/piazza.hdr" height={2.4} radius={45} backgroundIntensity={cfg.bg} environmentIntensity={cfg.env} rotationY={2.2} />
      <directionalLight
        position={cfg.sunPos}
        color={cfg.sunColor}
        intensity={cfg.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={4}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
      {light === "night" ? (
        <>
          {/* torches on the stage corners */}
          <Torch position={[-STAGE.w / 2 + 0.2, STAGE.h, STAGE.front - 0.2]} />
          <Torch position={[STAGE.w / 2 - 0.2, STAGE.h, STAGE.front - 0.2]} />
        </>
      ) : null}
    </>
  );
};

const Torch: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.7, 0]} material={vinyl("#3a2a1c", "skin")} castShadow>
      <cylinderGeometry args={[0.035, 0.05, 1.4, 10]} />
    </mesh>
    <mesh position={[0, 1.48, 0]}>
      <sphereGeometry args={[0.09, 12, 10]} />
      <meshBasicMaterial color={new Color("#ffb347").multiplyScalar(6)} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 1.55, 0]} color="#ff9b45" intensity={9} distance={9} decay={1.6} />
  </group>
);

// ---------------------------------------------------------------------------
// Town square: stage, banner, bunting, bleachers
// ---------------------------------------------------------------------------

function usePlanks(repeat: [number, number]) {
  const [color, normal, rough] = useTexture([
    asset("/pbr/Planks037A/color.jpg"),
    asset("/pbr/Planks037A/normal.jpg"),
    asset("/pbr/Planks037A/roughness.jpg"),
  ]) as Texture[];
  return useMemo(() => {
    const maps = [color.clone(), normal.clone(), rough.clone()];
    for (const m of maps) {
      m.wrapS = m.wrapT = RepeatWrapping;
      m.repeat.set(...repeat);
      m.anisotropy = 8;
      m.needsUpdate = true;
    }
    maps[0].colorSpace = SRGBColorSpace;
    return new MeshStandardMaterial({ map: maps[0], normalMap: maps[1], roughnessMap: maps[2], roughness: 1, envMapIntensity: 0.8 });
  }, [color, normal, rough, repeat[0], repeat[1]]);
}

export const TownSquare: React.FC<{ showStage?: boolean }> = ({ showStage = true }) => {
  const deck = usePlanks([3, 1.6]);
  const benches = usePlanks([6, 0.3]);
  const skirt = useMemo(() => vinyl("#6f1420"), []);
  const trim = useMemo(() => vinyl("#d8a440", "gold"), []);

  return (
    <group>
      {showStage ? (
        <group>
          {/* deck + red skirt */}
          <mesh position={[0, STAGE.h - 0.05, 0]} material={deck} receiveShadow castShadow>
            <boxGeometry args={[STAGE.w, 0.1, STAGE.d]} />
          </mesh>
          <mesh position={[0, (STAGE.h - 0.1) / 2, 0]} material={skirt} receiveShadow>
            <boxGeometry args={[STAGE.w - 0.06, STAGE.h - 0.1, STAGE.d - 0.06]} />
          </mesh>
          <mesh position={[0, STAGE.h - 0.12, STAGE.front - 0.02]} material={trim}>
            <boxGeometry args={[STAGE.w, 0.05, 0.04]} />
          </mesh>
          {/* front steps, centre */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[0, (i + 0.5) * (STAGE.h / 4), STAGE.front + 1.2 - (i + 0.5) * 0.3]} material={deck} castShadow receiveShadow>
              <boxGeometry args={[1.4, STAGE.h / 4 + 0.001, 0.3]} />
            </mesh>
          ))}
          <Banner />
          <Podium position={[-2.55, STAGE.h, -0.2]} />
          <Bunting />
        </group>
      ) : null}
      {/* bleachers: 6 tiers behind two standing rows */}
      {[1, 2, 3, 4, 5, 6].map((tier) => (
        <mesh key={tier} position={[0, (tier * 0.42) / 2, 7.3 + (tier - 1) * 0.85 + 0.42]} material={benches} receiveShadow castShadow>
          <boxGeometry args={[15, tier * 0.42, 0.85]} />
        </mesh>
      ))}
    </group>
  );
};

/** Big red banner with a gold sun crest behind the stage, painted on a canvas. */
const Banner: React.FC = () => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 640;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 0, 640);
    grd.addColorStop(0, "#8e1622");
    grd.addColorStop(1, "#5e0d16");
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 640);
    // vertical fabric folds
    for (let x = 0; x < 1024; x += 64) {
      const fg = g.createLinearGradient(x, 0, x + 64, 0);
      fg.addColorStop(0, "rgba(0,0,0,0.18)");
      fg.addColorStop(0.5, "rgba(255,255,255,0.05)");
      fg.addColorStop(1, "rgba(0,0,0,0.18)");
      g.fillStyle = fg;
      g.fillRect(x, 0, 64, 640);
    }
    g.strokeStyle = "#e0b04a";
    g.lineWidth = 14;
    g.strokeRect(28, 28, 968, 584);
    // sun crest
    g.save();
    g.translate(512, 320);
    g.fillStyle = "#e0b04a";
    for (let i = 0; i < 16; i++) {
      g.rotate(Math.PI / 8);
      g.beginPath();
      g.moveTo(-18, -110);
      g.lineTo(0, -200);
      g.lineTo(18, -110);
      g.fill();
    }
    g.beginPath();
    g.arc(0, 0, 100, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#8e1622";
    g.beginPath();
    g.arc(0, 0, 70, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  const post = vinyl("#3b2a1d", "skin");
  return (
    <group position={[0, STAGE.h, -STAGE.d / 2 + 0.15]}>
      <mesh position={[0, 2.0, 0]} receiveShadow castShadow>
        <planeGeometry args={[5, 3.1]} />
        <meshPhysicalMaterial map={tex} roughness={0.85} sheen={0.7} sheenColor="#ff8080" side={DoubleSide} />
      </mesh>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.8, 0]} material={post} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 3.6, 12]} />
        </mesh>
      ))}
      <mesh position={[0, 3.62, 0]} rotation={[0, 0, Math.PI / 2]} material={post} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 5.5, 12]} />
      </mesh>
    </group>
  );
};

const Podium: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.55, 0]} material={vinyl("#4a2a1a", "skin")} castShadow receiveShadow>
      <boxGeometry args={[0.75, 1.1, 0.5]} />
    </mesh>
    <mesh position={[0, 0.6, 0.255]} material={vinyl("#8e1622")}>
      <planeGeometry args={[0.55, 0.8]} />
    </mesh>
  </group>
);

/** Strings of triangle flags from the banner posts to poles at the crowd. */
const Bunting: React.FC = () => {
  const flags = useMemo(() => {
    const colors = ["#e0b04a", "#b8322a", "#ecebe6", "#2f5fa8"];
    const out: { p: [number, number, number]; r: [number, number, number]; c: string }[] = [];
    const lines: [[number, number, number], [number, number, number]][] = [
      [[-2.6, STAGE.h + 3.5, -1.65], [-6, 4.2, 7]],
      [[2.6, STAGE.h + 3.5, -1.65], [6, 4.2, 7]],
      [[-2.6, STAGE.h + 3.5, -1.65], [2.6, STAGE.h + 3.5, -1.65]],
    ];
    const tmp = new Object3D();
    lines.forEach(([a, b], li) => {
      const n = 22;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const sag = Math.sin(t * Math.PI) * (li === 2 ? 0.35 : 0.9);
        const p: [number, number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag, a[2] + (b[2] - a[2]) * t];
        tmp.position.set(...p);
        tmp.lookAt(b[0], p[1], b[2]);
        out.push({ p, r: [0, tmp.rotation.y + Math.PI / 2, 0], c: colors[i % colors.length] });
      }
    });
    return out;
  }, []);
  return (
    <group>
      {flags.map((f, i) => (
        <mesh key={i} position={f.p} rotation={f.r} material={vinyl(f.c)}>
          <coneGeometry args={[0.13, 0.32, 3, 1, false]} />
        </mesh>
      ))}
      {[-6, 6].map((x) => (
        <mesh key={x} position={[x, 2.1, 7]} material={vinyl("#3b2a1d", "skin")} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 4.2, 10]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------------------
// Vault (castle cellar at night)
// ---------------------------------------------------------------------------

export const VaultLighting: React.FC = () => (
  <>
    <GroundedEnv file="/hdri/vault.hdr" height={1.7} radius={9} backgroundIntensity={0.32} environmentIntensity={0.42} rotationY={-1.4} shadowOpacity={0.6} />
    <spotLight
      position={[0.5, 4.4, 2.0]}
      angle={0.62}
      penumbra={0.7}
      intensity={60}
      distance={12}
      decay={2}
      color="#ffd29a"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0002}
    />
    <directionalLight position={[-3, 4, -6]} color="#7ea2ff" intensity={0.8} />
  </>
);

/** The mayor's treasure chest, lid thrown open, a few coins left behind. */
export const EmptyChest: React.FC<{ lidOpen?: number }> = ({ lidOpen = 1.15 }) => {
  const { scene } = useGLTF(asset("/models/chest.glb"));
  const chest = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  const lid = chest.getObjectByName("treasure_chest_lid");
  if (lid) lid.rotation.x = -lidOpen;
  return (
    <group>
      <primitive object={chest} />
      <Coins />
    </group>
  );
};

export const Coins: React.FC<{ count?: number; spread?: number; seed?: number }> = ({ count = 9, spread = 1.1, seed = 3 }) => {
  const coins = useMemo(() => {
    let a = seed;
    const r = () => ((a = (a * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: count }, () => ({
      p: [(r() - 0.5) * spread * 2, 0.006, 0.45 + r() * spread] as [number, number, number],
      r: [(r() - 0.5) * 0.3, r() * 6, (r() - 0.5) * 0.3] as [number, number, number],
    }));
  }, [count, spread, seed]);
  return (
    <group>
      {coins.map((c, i) => (
        <mesh key={i} position={c.p} rotation={c.r} material={vinyl("#f0c050", "gold")} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.007, 20]} />
        </mesh>
      ))}
    </group>
  );
};

/** A bulging burlap sack, gold coins peeking out of the neck. */
export const GoldSack: React.FC = () => (
  <group>
    <mesh material={vinyl("#8a6a43")} scale={[0.26, 0.3, 0.22]} castShadow>
      <sphereGeometry args={[1, 20, 16]} />
    </mesh>
    <mesh position={[0, 0.3, 0]} material={vinyl("#7a5c38")} castShadow>
      <cylinderGeometry args={[0.05, 0.1, 0.12, 12]} />
    </mesh>
    {[
      [0.03, 0.37, 0.02],
      [-0.03, 0.36, -0.01],
      [0.0, 0.38, -0.03],
    ].map((p, i) => (
      <mesh key={i} position={p as [number, number, number]} rotation={[0.4 * i, i, 0.3]} material={vinyl("#f0c050", "gold")}>
        <cylinderGeometry args={[0.035, 0.035, 0.008, 18]} />
      </mesh>
    ))}
  </group>
);

/** Spear with a metal head, held vertically. */
export const Spear: React.FC = () => (
  <group>
    <mesh position={[0, 0, 0]} material={vinyl("#4a3424", "skin")} castShadow>
      <cylinderGeometry args={[0.018, 0.018, 2.2, 8]} />
    </mesh>
    <mesh position={[0, 1.22, 0]} material={vinyl("#b8c0c8", "metal")} castShadow>
      <coneGeometry args={[0.04, 0.24, 8]} />
    </mesh>
  </group>
);

/** Hand lantern with a warm light. */
export const Lantern: React.FC = () => (
  <group>
    <mesh position={[0, -0.12, 0]} material={vinyl("#2a2a2a", "metal")}>
      <cylinderGeometry args={[0.07, 0.07, 0.2, 10, 1, true]} />
    </mesh>
    <mesh position={[0, -0.12, 0]}>
      <sphereGeometry args={[0.05, 12, 10]} />
      <meshBasicMaterial color={new Color("#ffc070").multiplyScalar(5)} toneMapped={false} />
    </mesh>
    <pointLight position={[0, -0.12, 0]} color="#ffae5c" intensity={3.5} distance={6} decay={1.7} />
  </group>
);

useGLTF.preload(asset("/models/chest.glb"));
