import { ContactShadows, useTexture } from "@react-three/drei";
import { useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  RepeatWrapping,
  Texture,
  Vector2,
} from "three";
import { LOOK } from "../look";
import { asset } from "./HeroModel";

type Props = {
  floorColor?: string;
  wallColor?: string;
  /** Distance behind the subject where the floor starts curving up. */
  depth?: number;
  /** Radius of the floor-to-wall sweep. Bigger = softer, more "infinite" horizon. */
  radius?: number;
  width?: number;
  height?: number;
  pbr?: string | null;
};

/**
 * Seamless studio sweep: a floor that curves into a back wall with no visible
 * horizon line, vertex-coloured with a dark floor -> lighter wall gradient and a
 * soft side falloff. An optional ambientCG normal map adds micro-surface so
 * light breaks up like real painted plaster.
 */
export const Cyclorama: React.FC<Props> = ({
  floorColor = LOOK.backdrop.floorColor,
  wallColor = LOOK.backdrop.wallColor,
  depth = 1.4,
  radius = 2.6,
  width = 24,
  height = 12,
  pbr = LOOK.backdrop.pbr,
}) => {
  const geometry = useMemo(
    () => buildSweep({ floorColor, wallColor, depth, radius, width, height }),
    [floorColor, wallColor, depth, radius, width, height],
  );

  return (
    <group>
      {pbr ? (
        <TexturedSweep geometry={geometry} pbr={pbr} />
      ) : (
        <mesh geometry={geometry} receiveShadow>
          <meshStandardMaterial
            vertexColors
            color={GAIN}
            roughness={1}
            metalness={0}
            envMapIntensity={LOOK.backdrop.envMapIntensity}
          />
        </mesh>
      )}
      <ContactShadows
        position={[0, 0.002, 0]}
        scale={6}
        resolution={1024}
        blur={2.4}
        far={1.8}
        opacity={0.85}
        color="#000000"
      />
    </group>
  );
};

const GAIN = new Color().setScalar(LOOK.backdrop.albedoGain);

const TexturedSweep: React.FC<{ geometry: BufferGeometry; pbr: string }> = ({ geometry, pbr }) => {
  // Normal map only: the plaster's roughness map gives blotchy grazing-angle
  // highlights on a backdrop that should read as matte paper.
  const normalMap = useTexture(asset(`${pbr}/normal.jpg`)) as Texture;
  normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
  normalMap.anisotropy = 8;
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        vertexColors
        color={GAIN}
        roughness={1}
        normalMap={normalMap}
        normalScale={new Vector2(LOOK.backdrop.pbrStrength, LOOK.backdrop.pbrStrength)}
        metalness={0}
        envMapIntensity={LOOK.backdrop.envMapIntensity}
      />
    </mesh>
  );
};

function buildSweep({
  floorColor,
  wallColor,
  depth,
  radius,
  width,
  height,
}: Required<Omit<Props, "pbr">>): BufferGeometry {
  // Profile in the (z, y) plane, walked from the front of the floor to the top of the wall.
  const front = 10;
  const profile: { z: number; y: number; nz: number; ny: number }[] = [];
  const floorSteps = 24;
  for (let i = 0; i <= floorSteps; i++) {
    profile.push({ z: front - (front + depth) * (i / floorSteps), y: 0, nz: 0, ny: 1 });
  }
  const arcSteps = 48;
  for (let i = 1; i <= arcSteps; i++) {
    const a = (i / arcSteps) * (Math.PI / 2);
    // Centre of the sweep circle is at (z = -depth, y = radius).
    profile.push({
      z: -depth - Math.sin(a) * radius,
      y: radius - Math.cos(a) * radius,
      nz: Math.sin(a),
      ny: Math.cos(a),
    });
  }
  const wallSteps = 16;
  for (let i = 1; i <= wallSteps; i++) {
    profile.push({ z: -depth - radius, y: radius + (height - radius) * (i / wallSteps), nz: 1, ny: 0 });
  }

  // Arc length along the profile drives both the gradient and the V texture coordinate.
  const s: number[] = [0];
  for (let i = 1; i < profile.length; i++) {
    s.push(s[i - 1] + Math.hypot(profile[i].z - profile[i - 1].z, profile[i].y - profile[i - 1].y));
  }
  const sCurveStart = front + depth;
  const sCurveEnd = sCurveStart + (Math.PI / 2) * radius;

  const cols = 32;
  const rows = profile.length;
  const pos = new Float32Array(rows * (cols + 1) * 3);
  const nor = new Float32Array(rows * (cols + 1) * 3);
  const uv = new Float32Array(rows * (cols + 1) * 2);
  const col = new Float32Array(rows * (cols + 1) * 3);
  const cFloor = new Color(floorColor); // three converts the sRGB hex to linear
  const cWall = new Color(wallColor);
  const tmp = new Color();
  const rep = LOOK.backdrop.pbrRepeat;

  for (let r = 0; r < rows; r++) {
    const p = profile[r];
    // Dark floor in front, lifting through the sweep to the lighter wall behind the subject.
    const t = smoothstep(sCurveStart - 3.5, sCurveEnd + 1.5, s[r]);
    for (let c = 0; c <= cols; c++) {
      const x = -width / 2 + (width * c) / cols;
      const i = r * (cols + 1) + c;
      pos.set([x, p.y, p.z], i * 3);
      nor.set([0, p.ny, p.nz], i * 3);
      uv.set([x * rep, s[r] * rep], i * 2);
      const side = 1 - 0.45 * smoothstep(1.5, width / 2.5, Math.abs(x)); // soft vignette to the sides
      tmp.copy(cFloor).lerp(cWall, t).multiplyScalar(side);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
  }

  const index: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + cols + 1;
      const e = d + 1;
      index.push(a, b, d, b, e, d);
    }
  }

  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("normal", new BufferAttribute(nor, 3));
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.setAttribute("color", new BufferAttribute(col, 3));
  g.setIndex(index);
  // Winding check: keep faces pointing toward +Y/+Z (towards the camera).
  g.computeBoundingSphere();
  return g;
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
