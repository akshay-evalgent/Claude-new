import type { Caption } from "@remotion/captions";
import { useEnvironment, useTexture } from "@react-three/drei";
import { useMemo, useState } from "react";
import { Vector3 } from "three";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../../camera/CameraRig";
import { CameraPose, ease, handheld, lerp3, mix, springAt, Vec3, WHIP, add } from "../../camera/moves";
import { WordCaptions } from "../../captions/WordCaptions";
import { bleacherCrowd, Crowd, CrowdMood } from "../../characters/Crowd";
import { Look, Mannequin, Pose } from "../../characters/Mannequin";
import * as P from "../../characters/poses";
import { asset } from "../../scene/HeroModel";
import { PostFX } from "../../scene/PostFX";
import { StudioCanvas } from "../../scene/StudioCanvas";
import { EmptyChest, GoldSack, Lantern, Light, SquareLighting, Spear, STAGE, TownSquare, VaultLighting } from "./sets";
import timeline from "./timeline.json";

export const NOBODY_FPS = 30;
export const NOBODY_TAIL_S = 0.6;
export const nobodyDuration = Math.ceil((timeline.durationMs / 1000 + NOBODY_TAIL_S) * NOBODY_FPS);

// --- cast ------------------------------------------------------------------------
const HERO: Look = { skin: "#c99a78", shirt: "#1f2127", pants: "#2c3038", shoes: "#141416", hood: true };
const HERO_KID: Look = { ...HERO, child: true };
const FRIEND: Look = { skin: "#e3b896", shirt: "#2f6fd6", pants: "#3b3f48", hair: "#5a3418", child: true };
const SISTER: Look = { skin: "#c48d68", shirt: "#2e9a55", pants: "#5a4632", hair: "#1b1210", hairStyle: "bun", child: true };
const MAYOR: Look = { skin: "#eac3a6", shirt: "#b3141f", pants: "#1c1c22", hat: "top", chain: true, build: 1.28 };
const YELLER: Look = { skin: "#d9a882", shirt: "#e5b933", pants: "#3d4250", hair: "#6b3d1f" };
const GUARD: Look = { skin: "#b07a55", shirt: "#4a4f5a", pants: "#2a2d33", hat: "helmet" };

const YELLER_POS: Vec3 = [3.2, 5 * 0.42, 7.6 + 4 * 0.85];
const CROWD = bleacherCrowd({ rows: 6, perRow: 20, width: 14, z0: 5.05, rowDepth: 0.85, rowRise: 0.42, groundRows: 3, seed: 11 }).filter(
  (m) => Math.hypot(m.pos[0] - YELLER_POS[0], m.pos[2] - YELLER_POS[2]) > 0.6,
);

// --- shots --------------------------------------------------------------------------
type Set = "square" | "vault";
type Shot = {
  line: string;
  set: Set;
  light?: Light;
  crowd?: boolean;
  /** Crowd behaviour over local shot time (s). */
  mood?: (lt: number) => CrowdMood;
  crowdLook?: Vec3;
  cam: (lt: number, dur: number, fps: number) => CameraPose;
  actors: (lt: number, t: number) => React.ReactNode;
  /** Sound effect at the cut. */
  sfx?: "whoosh";
};

const ramp = (lt: number, from: number, len = 0.35) => Math.min(1, Math.max(0, (lt - from) / len));
const kidHead = STAGE.h + 1.2;

/** Straight push/pull between two framings, eased over the shot, plus operator drift. */
function move(a: Vec3, b: Vec3, ta: Vec3, tb: Vec3, fov = 32, drift = 0.01) {
  return (lt: number, dur: number, fps: number): CameraPose => {
    const k = ease(lt * fps, 0, dur * fps);
    const target = lerp3(ta, tb, k);
    return { position: add(lerp3(a, b, k), handheld(lt * fps, fps, drift)), target, focus: target, fov };
  };
}

const SHOTS: Shot[] = [
  {
    // "In my town, you don't choose your name."  Establishing crane-down over the crowd.
    line: "rule",
    set: "square",
    crowd: true,
    mood: () => ({}),
    cam: move([5.5, 10.5, 21], [3.2, 7.4, 16.2], [0, 1.2, 0], [0, 1.7, 0.8], 34, 0.02),
    actors: (lt, t) => (
      <>
        <Mannequin look={HERO_KID} pose={{ ...P.idle(t), pos: [0.6, 0, 4.25], rotY: Math.PI }} />
        <Mannequin look={MAYOR} pose={{ ...P.idle(t, 2), pos: [-2.55, STAGE.h, -0.6] }} />
      </>
    ),
  },
  {
    // "The crowd chooses it for you."  Truck across the crowd's faces.
    line: "crowd",
    set: "square",
    crowd: true,
    mood: (lt) => ({ cheer: 0.25 * ramp(lt, 0.4, 0.6) }),
    cam: move([-3.4, 1.75, 3.3], [-1.3, 1.85, 3.4], [-2.2, 2.3, 9], [-0.1, 2.3, 9], 32),
    actors: (lt, t) => <Mannequin look={HERO_KID} pose={{ ...P.idle(t), pos: [0.6, 0, 4.25], rotY: Math.PI }} />,
  },
  {
    // "On your tenth birthday, you walk onto the stage,"  Low angle, hero climbs toward camera.
    line: "stage",
    set: "square",
    crowd: true,
    mood: () => ({}),
    cam: (lt, dur, fps) => {
      const k = ease(lt * fps, 0, dur * fps);
      const pos: Vec3 = [0.4, STAGE.h + 0.42, mix(-0.4, -1.3, k)];
      const target: Vec3 = [0, mix(1.5, 1.85, k), 2.4];
      return { position: add(pos, handheld(lt * fps, fps, 0.008)), target, focus: heroWalkPos(lt).map((v, i) => (i === 1 ? v + 0.9 : v)) as Vec3, fov: 30 };
    },
    actors: (lt, t) => {
      const p = heroWalkPos(lt);
      const climbing = lt > 0.55 && lt < 1.65;
      const base = climbing ? P.climb(t, 1.1) : lt < 2.3 ? P.walk(t, 1) : P.idle(t);
      return (
        <>
          <Mannequin look={HERO_KID} pose={{ ...base, pos: p, rotY: Math.PI }} />
          <Mannequin look={MAYOR} pose={{ ...P.idle(t, 2), pos: [-2.55, STAGE.h, -0.6] }} />
        </>
      );
    },
  },
  {
    // "and the whole town shouts one word."  Over the shoulder, crowd erupts.
    line: "shout",
    set: "square",
    crowd: true,
    mood: (lt) => ({ cheer: ramp(lt, 0.45, 0.3) }),
    cam: move([0.42, kidHead + 0.12, 0.25], [0.36, kidHead + 0.1, 0.62], [-0.4, 2.1, 9], [-0.3, 2.3, 9], 34),
    actors: (lt, t) => <Mannequin look={HERO_KID} pose={{ ...P.withHead(P.idle(t), 0.15), pos: [0, STAGE.h, 1.15] }} />,
  },
  {
    // "My best friend got Brave."  Low hero shot looking up, friend celebrates.
    line: "brave",
    set: "square",
    crowd: true,
    mood: () => ({ cheer: 0.9 }),
    cam: move([-0.7, 1.35, 4.4], [-1.05, 1.3, 3.6], [-1.3, 1.95, 0.9], [-1.3, 2.0, 0.9], 30),
    actors: (lt, t) => (
      <>
        <Mannequin look={FRIEND} pose={{ ...P.cheer(t), pos: [-1.3, STAGE.h, 0.9], rotY: 0.15 }} />
        <Mannequin look={HERO_KID} pose={{ ...P.idle(t), pos: [0.35, STAGE.h, 0.5], rotY: -0.4 }} />
        <Mannequin look={MAYOR} pose={{ ...P.idle(t, 2), pos: [-2.55, STAGE.h, -0.6] }} />
      </>
    ),
  },
  {
    // "My sister got Clever."
    line: "clever",
    set: "square",
    crowd: true,
    mood: () => ({ cheer: 0.6 }),
    cam: move([0.85, 1.5, 4.1], [1.15, 1.55, 3.3], [1.3, 1.95, 0.9], [1.3, 2.0, 0.9], 30),
    actors: (lt, t) => (
      <>
        <Mannequin look={SISTER} pose={{ ...P.tapHead(t), pos: [1.3, STAGE.h, 0.9], rotY: -0.2 }} />
        <Mannequin look={HERO_KID} pose={{ ...P.idle(t), pos: [0.0, STAGE.h, 0.4], rotY: 0.3 }} />
        <Mannequin look={FRIEND} pose={{ ...P.idle(t, 1), pos: [-1.4, STAGE.h, 0.5], rotY: 0.3 }} />
      </>
    ),
  },
  {
    // "Then it was my turn."  Slow push into the hero, the square goes quiet.
    line: "turn",
    set: "square",
    crowd: true,
    mood: () => ({}),
    cam: move([0, 1.65, 5.4], [0, 1.9, 3.3], [0, 1.85, 1.0], [0, kidHead - 0.05, 1.0], 30, 0.006),
    actors: (lt, t) => (
      <>
        <Mannequin look={HERO_KID} pose={{ ...P.idle(t), pos: [0, STAGE.h, 1.0] }} />
        <Mannequin look={FRIEND} pose={{ ...P.idle(t, 1), pos: [-1.6, STAGE.h, 0.1], rotY: 0.2 }} />
        <Mannequin look={SISTER} pose={{ ...P.idle(t, 2), pos: [1.6, STAGE.h, 0.1], rotY: -0.2 }} />
        <Mannequin look={MAYOR} pose={{ ...P.idle(t, 2), pos: [-2.55, STAGE.h, -0.6] }} />
      </>
    ),
  },
  {
    // "Someone in the back yelled,"  Whip-pan off the stage to one voice in the back row.
    line: "yell",
    set: "square",
    crowd: true,
    sfx: "whoosh",
    mood: () => ({}),
    cam: (lt, dur, fps) => {
      const whip = springAt(lt * fps, fps, 0, WHIP);
      const push = ease(lt * fps, 6, dur * fps);
      const yellerHead: Vec3 = [YELLER_POS[0], YELLER_POS[1] + 1.62, YELLER_POS[2]];
      const target = lerp3([-1.5, 2.0, 0], yellerHead, whip);
      const position = lerp3([-0.8, 3.3, 5.6], [1.6, 3.7, 8.3], push);
      return { position: add(position, handheld(lt * fps, fps, 0.012)), target, focus: yellerHead, fov: mix(34, 26, push) };
    },
    actors: (lt, t) => <Mannequin look={YELLER} pose={{ ...(lt > 0.35 ? P.yell(t) : P.idle(t)), pos: YELLER_POS, rotY: Math.PI }} />,
  },
  {
    // "Nobody!"  Whip-zoom into the hero.
    line: "nobody",
    set: "square",
    crowd: true,
    sfx: "whoosh",
    mood: () => ({}),
    cam: (lt, dur, fps) => {
      const w = springAt(lt * fps, fps, 0, WHIP);
      const target: Vec3 = [0, kidHead - 0.02, 1.0];
      return {
        position: add(lerp3([0.3, kidHead + 0.05, 4.2], [0.08, kidHead + 0.02, 2.55], w), handheld(lt * fps, fps, 0.004)),
        target,
        focus: target,
        fov: mix(32, 25, w),
        roll: 0.06 * w,
      };
    },
    actors: (lt, t) => <Mannequin look={HERO_KID} pose={{ ...P.withHead(P.idle(t), 0, -0.12 * ramp(lt, 0.1, 0.2)), pos: [0, STAGE.h, 1.0] }} />,
  },
  {
    // "And the crowd loved it."  Crowd in hysterics, camera trucks along the front row.
    line: "loved",
    set: "square",
    crowd: true,
    mood: () => ({ laugh: 1 }),
    cam: move([2.6, 2.35, 2.0], [0.2, 2.45, 2.3], [1.6, 2.1, 9], [-0.6, 2.1, 9], 34),
    actors: () => null,
  },
  {
    // "The mayor laughed so hard he cried."  Low angle push on the mayor.
    line: "mayor",
    set: "square",
    crowd: true,
    mood: () => ({ laugh: 0.8 }),
    cam: move([-1.45, 2.05, 2.6], [-1.9, 2.2, 1.55], [-2.55, 2.45, -0.6], [-2.55, 2.5, -0.6], 30),
    actors: (lt, t) => (
      <>
        <Mannequin look={MAYOR} pose={{ ...P.laughCry(t), pos: [-2.55, STAGE.h, -0.6], rotY: 0.25 }} />
        <Mannequin look={HERO_KID} pose={{ ...P.withHead(P.idle(t), 0, 0.3), pos: [0, STAGE.h, 1.0], rotY: -0.3 }} />
      </>
    ),
  },
  {
    // "For years, I was Nobody."  Dusk, empty square, slow pull-back from the grown-up hero.
    line: "years",
    set: "square",
    light: "dusk",
    crowd: false,
    cam: move([0, 1.4, 4.3], [0, 2.7, 8.2], [0, 1.25, 1.5], [0, 1.4, 1.5], 32, 0.006),
    actors: (lt, t) => <Mannequin look={HERO} pose={{ ...P.sitSad(t), pos: [0, 0.48, 1.6] }} />,
  },
  {
    // "Then one night, the mayor's gold disappeared."  The vault: lid open, chest empty.
    line: "gold",
    set: "vault",
    cam: move([1.5, 1.05, 2.5], [0.7, 0.85, 1.55], [0, 0.45, 0], [0, 0.42, 0], 32, 0.006),
    actors: () => <EmptyChest />,
  },
  {
    // "The guards asked who went near the vault."  Night, over the guards' shoulders.
    line: "guards",
    set: "square",
    light: "night",
    crowd: true,
    crowdLook: [0, 1.7, 3.8],
    mood: () => ({}),
    cam: move([0.6, 2.25, 2.2], [0.5, 2.3, 2.7], [-0.1, 1.8, 9], [-0.1, 1.9, 9], 34),
    actors: (lt, t) => (
      <>
        <Mannequin look={GUARD} pose={{ ...P.guardStand(t), pos: [-0.45, 0, 3.95] }} rightHand={<SpearInHand />} leftHand={<Lantern />} />
        <Mannequin look={GUARD} pose={{ ...P.guardStand(t, 1.5), pos: [0.4, 0, 3.7] }} rightHand={<SpearInHand />} leftHand={<Lantern />} />
      </>
    ),
  },
  {
    // "And the whole town gave the same answer."  The crowd shrugs as one.
    line: "answer",
    set: "square",
    light: "night",
    crowd: true,
    crowdLook: [0, 1.7, 3.8],
    mood: (lt) => ({ shrug: ramp(lt, 1.1, 0.5) }),
    cam: move([0.1, 2.45, 0.9], [0.05, 2.5, 2.3], [0, 2.2, 9], [0, 2.3, 9], 34),
    actors: (lt, t) => (
      <>
        <Mannequin look={GUARD} pose={{ ...P.guardStand(t), pos: [-0.45, 0, 3.95] }} rightHand={<SpearInHand />} leftHand={<Lantern />} />
        <Mannequin look={GUARD} pose={{ ...P.guardStand(t, 1.5), pos: [0.4, 0, 3.7] }} rightHand={<SpearInHand />} leftHand={<Lantern />} />
      </>
    ),
  },
  {
    // "Nobody."  Whip-zoom into the front row, mid-shrug.
    line: "nobody2",
    set: "square",
    light: "night",
    crowd: true,
    sfx: "whoosh",
    crowdLook: [0, 1.7, 3.8],
    mood: () => ({ shrug: 1 }),
    cam: (lt, dur, fps) => {
      const w = springAt(lt * fps, fps, 0, WHIP);
      const target: Vec3 = [0.2, 1.95, 5.6];
      return { position: add([0.5, 2.5, 1.6], handheld(lt * fps, fps, 0.006)), target, focus: target, fov: mix(38, 26, w), roll: -0.04 * w };
    },
    actors: () => null,
  },
  {
    // "Best name I ever got."  The reveal: the hero walks out of the vault with the gold.
    line: "best",
    set: "vault",
    cam: (lt, dur, fps) => {
      const p = heroExitPos(lt);
      const k = ease(lt * fps, 0, dur * fps);
      const head: Vec3 = [p[0], 1.62, p[2]];
      const position: Vec3 = [mix(0.45, 0.25, k), mix(1.45, 1.55, k), p[2] + mix(3.6, 2.5, k)];
      const aim: Vec3 = [head[0], mix(1.25, 1.5, k), head[2]];
      return { position: add(position, handheld(lt * fps, fps, 0.006)), target: aim, focus: head, fov: mix(34, 28, k) };
    },
    actors: (lt, t) => {
      const p = heroExitPos(lt);
      const walking = lt < 1.9;
      const base = walking ? P.carrySack(t, 0.85) : P.carrySack(0, 0);
      const look = ramp(lt, 1.9, 0.4);
      return (
        <>
          <group position={[0, 0, -2.4]}>
            <EmptyChest />
          </group>
          <Mannequin look={HERO} pose={{ ...P.withHead(base, 0.12 * look, -0.08 * look), pos: p }} rightHand={<SackInHand />} />
        </>
      );
    },
  },
];

function heroWalkPos(lt: number): Vec3 {
  // ground -> steps -> stage front, walking toward -Z
  if (lt < 0.55) return [0, 0, mix(4.1, 3.05, lt / 0.55)];
  if (lt < 1.65) {
    const k = (lt - 0.55) / 1.1;
    return [0, STAGE.h * k, mix(3.05, STAGE.front, k)];
  }
  const k = Math.min(1, (lt - 1.65) / 0.65);
  return [0, STAGE.h, mix(STAGE.front, 1.15, k)];
}

function heroExitPos(lt: number): Vec3 {
  const k = Math.min(1, lt / 1.9);
  return [0, 0, mix(-1.5, 0.5, k)];
}

const SpearInHand: React.FC = () => (
  <group rotation={[Math.PI / 2 + 0.2, 0, 0]} position={[0, 0, 0.02]}>
    <Spear />
  </group>
);
const SackInHand: React.FC = () => (
  <group position={[0, -0.3, 0.02]} scale={0.7}>
    <GoldSack />
  </group>
);

// --- timing -----------------------------------------------------------------------
type Timed = Shot & { from: number; to: number };

function useShotTimes(fps: number, total: number): Timed[] {
  return useMemo(() => {
    const lineStart = new Map(timeline.lines.map((l) => [l.id, l.startMs]));
    const lead = 0.12; // cut slightly before the line starts, like an editor would
    const froms = SHOTS.map((s, i) => (i === 0 ? 0 : Math.round(((lineStart.get(s.line)! / 1000) - lead) * fps)));
    return SHOTS.map((s, i) => ({ ...s, from: froms[i], to: froms[i + 1] ?? total }));
  }, [fps, total]);
}

// --- composition ----------------------------------------------------------------------
export const NobodyShort: React.FC = () => {
  const { fps, durationInFrames } = useVideoConfig();
  const shots = useShotTimes(fps, durationInFrames);
  const captions = timeline.words as Caption[];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0d0e11" }}>
      <StudioCanvas near={0.05} far={260}>
        <Preload />
        <Story shots={shots} />
      </StudioCanvas>
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 90% 75% at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />
      <WordCaptions captions={captions} variant="story" combineWithinMs={420} y={0.71} />
      <Audio src={staticFile("stories/nobody/vo.wav")} />
      <Audio src={staticFile("stories/nobody/music.mp3")} volume={(f) => interpolate(f, [0, 20, durationInFrames - 25, durationInFrames], [0, 0.32, 0.32, 0], { extrapolateRight: "clamp" })} />
      <Audio src={staticFile("stories/nobody/crowd.mp3")} volume={(f) => crowdVolume(f, fps, shots)} />
      {shots
        .filter((s) => s.sfx)
        .map((s) => (
          <Sequence key={s.line} from={Math.max(0, s.from - 4)} durationInFrames={30}>
            <Audio src={staticFile("stories/nobody/whoosh.wav")} volume={0.55} />
          </Sequence>
        ))}
    </AbsoluteFill>
  );
};

/** Crowd roar follows what the crowd is doing on screen. */
function crowdVolume(f: number, fps: number, shots: Timed[]) {
  const s = shots.find((x) => f >= x.from && f < x.to);
  if (!s || !s.crowd || !s.mood) return 0.05;
  const m = s.mood((f - s.from) / fps);
  return 0.06 + 0.5 * Math.max(m.cheer ?? 0, m.laugh ?? 0) + 0.15 * (m.shrug ?? 0);
}

/** Load every heavy asset up front so nothing suspends mid-render. */
const Preload: React.FC = () => {
  useEnvironment({ files: asset("/hdri/piazza.hdr") });
  useEnvironment({ files: asset("/hdri/vault.hdr") });
  useTexture([asset("/pbr/Planks037A/color.jpg"), asset("/pbr/Planks037A/normal.jpg"), asset("/pbr/Planks037A/roughness.jpg")]);
  return null;
};

const Story: React.FC<{ shots: Timed[] }> = ({ shots }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [focus] = useState(() => new Vector3());
  const i = Math.max(0, shots.findIndex((s) => frame >= s.from && frame < s.to));
  const shot = shots[i];
  const lt = (frame - shot.from) / fps;
  const t = frame / fps;
  const dur = (shot.to - shot.from) / fps;

  const camShot = useMemo(() => () => shot.cam(lt, dur, fps), [shot, lt, dur, fps]);
  const crowdMood = useMemo(() => (tt: number) => (shot.mood ? shot.mood(tt - shot.from / fps) : {}), [shot, fps]);

  return (
    <>
      <CameraRig shot={camShot} focus={focus} />
      {shot.set === "square" ? (
        <>
          <SquareLighting light={shot.light ?? "day"} />
          <TownSquare />
          {shot.crowd ? <Crowd members={CROWD} mood={crowdMood} lookAt={shot.crowdLook ?? [0, 1.6, 0]} /> : null}
          {shot.crowd && shot.line !== "yell" ? <Mannequin look={YELLER} pose={{ ...P.idle(t, 4), pos: YELLER_POS, rotY: Math.PI }} /> : null}
        </>
      ) : (
        <VaultLighting />
      )}
      {shot.actors(lt, t)}
      <PostFX focusTarget={focus} focusRange={1.4} />
    </>
  );
};
