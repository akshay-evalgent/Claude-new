// SVG character rig. Origin at the feet; the character is ~520 units tall at scale 1.
import React from "react";
import { useCurrentFrame } from "remotion";
import { K, LW, OUT, SKIN, kf, lerp, pop, rnd, clamp, smooth } from "./style";
import { interpolate } from "remotion";
import { Prop, PropName } from "./Props";

export type Hair = "short" | "side" | "spiky" | "curly" | "long" | "bald" | "bun" | "slick" | "buzz" | "afro";
export type Look = {
  skin?: string; hair?: Hair; hairColor?: string; shirt?: string; pants?: string; shoes?: string;
  jacket?: string; tie?: string; hoodie?: boolean; glasses?: boolean; headband?: string;
  hat?: "top" | "cap" | "beanie" | "visor"; hatColor?: string; beard?: "stubble" | "full" | "goatee";
  mustache?: boolean; blush?: boolean; height?: number; build?: number; collar?: string;
};
export type Mood = "neutral" | "happy" | "grin" | "sad" | "angry" | "surprised" | "worried" | "smug" | "shocked" | "sleepy";
/** Arm angles: [shoulder, elbow] in degrees. Shoulder 0 = straight down, 90 = out sideways, 180 = up. */
export type Pose = { L: [number, number]; R: [number, number]; lean?: number };
export const POSES = {
  idle: { L: [8, 6], R: [8, 6] },
  point: { L: [8, 6], R: [88, 4] },
  pointUp: { L: [8, 6], R: [150, 10] },
  pointL: { L: [88, 4], R: [8, 6] },
  wave: { L: [8, 6], R: [140, 35] },
  cheer: { L: [160, 12], R: [160, 12] },
  shrug: { L: [30, 85], R: [30, 85] },
  hips: { L: [42, -100], R: [42, -100] },
  think: { L: [8, 6], R: [18, -168] },
  hold: { L: [8, 6], R: [14, -118] },
  holdBoth: { L: [14, -110], R: [14, -110] },
  present: { L: [50, 38], R: [50, 38] },
  presentR: { L: [8, 6], R: [55, 40] },
  phone: { L: [8, 6], R: [24, -172] },
  facepalm: { L: [8, 6], R: [10, -175] },
  panic: { L: [150, -40], R: [150, -40] },
  count: { L: [8, 6], R: [40, -95] },
  stop: { L: [8, 6], R: [75, -80] },
  type: { L: [30, -75], R: [30, -75] },
  carry: { L: [45, -80], R: [45, -80] },
  signR: { L: [8, 6], R: [75, -20] },
  signUp: { L: [8, 6], R: [150, 15] },
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;
type PoseIn = PoseName | Pose;
const toPose = (p: PoseIn): Pose => (typeof p === "string" ? (POSES[p] as Pose) : p);

export type Keys<T> = T | [number, T][];
function pick<T>(f: number, k: Keys<T> | undefined, def: T): [T, T, number] {
  if (k === undefined) return [def, def, 0];
  if (!Array.isArray(k) || (k.length && !Array.isArray(k[0]))) return [k as T, k as T, 0];
  const keys = k as [number, T][];
  if (!keys.length || f <= keys[0][0]) return [keys[0]?.[1] ?? def, keys[0]?.[1] ?? def, 0];
  for (let i = 1; i < keys.length; i++) {
    if (f < keys[i][0]) {
      const t = Math.min(1, (f - keys[i][0] + 9) / 9); // 9-frame blend into the next key
      return t > 0 ? [keys[i - 1][1], keys[i][1], smooth(t)] : [keys[i - 1][1], keys[i - 1][1], 0];
    }
  }
  const last = keys[keys.length - 1][1];
  return [last, last, 0];
}

export type CharProps = {
  look: Look; x?: number; y?: number; scale?: number; facing?: 1 | -1;
  pose?: Keys<PoseIn>; mood?: Keys<Mood>; talk?: [number, number][];
  walk?: boolean | number; lookAt?: Keys<[number, number]>;
  hold?: { item: PropName; hand?: "L" | "R"; scale?: number; label?: string; rot?: number };
  holdL?: { item: PropName; scale?: number; label?: string; rot?: number };
  enter?: number; exit?: number; seed?: number; jump?: number[]; shake?: [number, number][];
  opacity?: number;
};

export const Character: React.FC<CharProps> = (p) => {
  const f = useCurrentFrame();
  const L = p.look;
  const seed = p.seed ?? 1;
  const skin = L.skin ?? SKIN[1];
  const hairC = L.hairColor ?? "#4A3020";
  const shirt = L.shirt ?? K.teal;
  const pants = L.pants ?? "#3B4660";
  const shoes = L.shoes ?? OUT;
  const sc = (p.scale ?? 1) * (L.height ?? 1);
  const bw = L.build ?? 1;

  // ---- entrance / exit
  const enterT = p.enter === undefined ? 1 : interpolate(f, [p.enter, p.enter + 14], [0, 1], { ...clamp, easing: pop });
  const exitT = p.exit === undefined ? 1 : interpolate(f, [p.exit, p.exit + 10], [1, 0], clamp);
  const s = sc * Math.max(0, enterT) * exitT;
  if (s <= 0.001) return null;

  // ---- walk and idle motion
  const walking = !!p.walk;
  const wsp = typeof p.walk === "number" ? p.walk : 1;
  const ph = (f / 30) * Math.PI * 2 * 1.6 * wsp;
  const legSwing = walking ? Math.sin(ph) * 24 : 0;
  const bob = walking ? Math.abs(Math.sin(ph)) * -8 : Math.sin(f / 22 + seed) * 2.2;
  let jumpY = 0;
  for (const j of p.jump ?? []) {
    const t = (f - j) / 16;
    if (t > 0 && t < 1) jumpY -= Math.sin(t * Math.PI) * 70;
  }
  let shakeX = 0;
  for (const [a, b] of p.shake ?? []) if (f >= a && f <= b) shakeX += Math.sin(f * 2.3) * 6;

  // ---- pose
  const [pa, pb, pt] = pick<PoseIn>(f, p.pose, "idle");
  const A = toPose(pa), B = toPose(pb);
  const mix = (u: [number, number], v: [number, number]): [number, number] => [lerp(u[0], v[0], pt), lerp(u[1], v[1], pt)];
  let armL = mix(A.L, B.L), armR = mix(A.R, B.R);
  const lean = lerp(A.lean ?? 0, B.lean ?? 0, pt);
  // gentle idle sway of arms, wave oscillation
  const isWave = (pt < 0.5 ? pa : pb) === "wave";
  if (isWave) armR = [armR[0], armR[1] + Math.sin(f / 3) * 22];
  if (walking && !p.pose) { armL = [10 + Math.sin(ph) * 18, 8]; armR = [10 - Math.sin(ph) * 18, 8]; }
  armL = [armL[0] + Math.sin(f / 25 + seed) * 1.5, armL[1]];
  armR = [armR[0] + Math.sin(f / 27 + seed * 2) * 1.5, armR[1]];

  // ---- face
  const [ma, mb, mt] = pick<Mood>(f, p.mood, "neutral");
  const mood = mt < 0.5 ? ma : mb;
  const [la, lb, lt] = pick<[number, number]>(f, p.lookAt, [0, 0]);
  const lookX = lerp(la[0], lb[0], lt), lookY = lerp(la[1], lb[1], lt);
  const blinkCycle = 95 + Math.floor(rnd(seed) * 60);
  const bf = (f + Math.floor(rnd(seed + 3) * 80)) % blinkCycle;
  const blink = bf < 5 ? [1, 0.45, 0.1, 0.45, 1][bf] : mood === "sleepy" ? 0.35 : 1;
  let open = 0;
  for (const [a, b] of p.talk ?? []) {
    if (f >= a && f <= b) {
      const local = f - a;
      open = 0.35 + 0.65 * Math.abs(Math.sin((local / 3.2) * Math.PI * 0.5 + a));
      if (b - a < 3) open *= 0.6;
    }
  }

  const head = { x: 0, y: -418, r: 84 };
  const sh = { y: -318, x: 60 * bw };

  const limb = (x1: number, y1: number, ang: [number, number], side: -1 | 1, len1: number, len2: number, w: number, col: string, handCol: string, holdEl?: React.ReactNode) => {
    const a1 = (ang[0] * Math.PI) / 180, a2 = ((ang[0] + ang[1]) * Math.PI) / 180;
    const ex = x1 + side * Math.sin(a1) * len1, ey = y1 + Math.cos(a1) * len1;
    const hx = ex + side * Math.sin(a2) * len2, hy = ey + Math.cos(a2) * len2;
    const d = `M ${x1} ${y1} L ${ex} ${ey} L ${hx} ${hy}`;
    return (
      <g>
        <path d={d} stroke={OUT} strokeWidth={w + LW * 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {holdEl && <g transform={`translate(${hx} ${hy})`}>{holdEl}</g>}
        <circle cx={hx} cy={hy} r={17} fill={handCol} stroke={OUT} strokeWidth={LW} />
      </g>
    );
  };

  const sleeve = L.jacket ?? (L.hoodie ? shirt : shirt);
  const holdR = p.hold && (p.hold.hand ?? "R") === "R" ? p.hold : undefined;
  const holdLp = p.holdL ?? (p.hold && p.hold.hand === "L" ? p.hold : undefined);
  const holdEl = (h?: { item: PropName; scale?: number; label?: string; rot?: number }) =>
    h ? <g transform={`rotate(${h.rot ?? 0}) scale(${h.scale ?? 1})`}><Prop name={h.item} label={h.label} /></g> : undefined;

  return (
    <g transform={`translate(${(p.x ?? 0) + shakeX} ${(p.y ?? 0)}) scale(${s * (p.facing ?? 1)} ${s})`} opacity={p.opacity ?? 1}>
      {/* shadow */}
      <ellipse cx={0} cy={2} rx={70 * bw} ry={13} fill="rgba(0,0,0,0.13)" transform={`scale(${1 + jumpY / 300} 1)`} />
      <g transform={`translate(0 ${bob + jumpY}) rotate(${lean} 0 -150)`}>
        {/* legs */}
        {[-1, 1].map((sd) => {
          const sw = sd * legSwing;
          const hx = sd * 24 * bw, hy = -150;
          const a = (sw * Math.PI) / 180;
          const fx = hx + Math.sin(a) * 136, fy = hy + Math.cos(a) * 136 - bob;
          return (
            <g key={sd}>
              <path d={`M ${hx} ${hy} L ${fx} ${fy}`} stroke={OUT} strokeWidth={36 + LW * 2} strokeLinecap="round" />
              <path d={`M ${hx} ${hy} L ${fx} ${fy}`} stroke={pants} strokeWidth={36} strokeLinecap="round" />
              <ellipse cx={fx + sd * 8} cy={fy + 6} rx={28} ry={14} fill={shoes} stroke={OUT} strokeWidth={LW} />
            </g>
          );
        })}
        {/* long hair behind */}
        {L.hair === "afro" && <circle cx={0} cy={-445} r={116} fill={hairC} stroke={OUT} strokeWidth={LW} />}
        {L.hair === "long" && <path d={`M -88 -430 C -100 -330, -70 -300, -40 -300 L 40 -300 C 70 -300, 100 -330, 88 -430 Z`} fill={hairC} stroke={OUT} strokeWidth={LW} />}
        {/* back arm */}
        {limb(-sh.x, sh.y, armL, -1, 90, 84, 30, sleeve, skin, holdEl(holdLp))}
        {/* torso */}
        <Torso shirt={shirt} jacket={L.jacket} tie={L.tie} hoodie={L.hoodie} bw={bw} collar={L.collar} />
        {/* head */}
        <g transform={`translate(0 ${Math.sin(f / 22 + seed) * 1.2})`}>
          <circle cx={-82} cy={-410} r={16} fill={skin} stroke={OUT} strokeWidth={LW} />
          <circle cx={82} cy={-410} r={16} fill={skin} stroke={OUT} strokeWidth={LW} />
          <circle cx={head.x} cy={head.y} r={head.r} fill={skin} stroke={OUT} strokeWidth={LW} />
          {L.beard === "full" && <path d="M -78 -420 C -80 -330, -30 -318, 0 -318 C 30 -318, 80 -330, 78 -420 C 60 -380, 30 -370, 0 -372 C -30 -370, -60 -380, -78 -420 Z" fill={hairC} stroke={OUT} strokeWidth={LW} />}
          {L.beard === "stubble" && <path d="M -70 -400 C -60 -350, -25 -338, 0 -338 C 25 -338, 60 -350, 70 -400 C 50 -370, 25 -362, 0 -362 C -25 -362, -50 -370, -70 -400 Z" fill={hairC} opacity={0.28} />}
          {L.beard === "goatee" && <path d="M -20 -362 C -18 -338, 18 -338, 20 -362 C 10 -356, -10 -356, -20 -362 Z" fill={hairC} stroke={OUT} strokeWidth={LW * 0.8} />}
          <HairShape hair={L.hair ?? "short"} c={hairC} />
          {L.blush !== false && <>
            <circle cx={-52} cy={-388} r={12} fill="#F28C8C" opacity={0.32} />
            <circle cx={52} cy={-388} r={12} fill="#F28C8C" opacity={0.32} />
          </>}
          <Face mood={mood} blink={blink} lookX={lookX} lookY={lookY} open={open} mustache={L.mustache} hairC={hairC} />
          {L.glasses && <g fill="none" stroke={OUT} strokeWidth={LW}>
            <circle cx={-30} cy={-424} r={24} fill="rgba(255,255,255,0.15)" />
            <circle cx={30} cy={-424} r={24} fill="rgba(255,255,255,0.15)" />
            <path d="M -6 -426 L 6 -426 M -54 -428 L -80 -434 M 54 -428 L 80 -434" />
          </g>}
          {L.headband && <path d="M -86 -448 C -40 -478, 40 -478, 86 -448 L 84 -428 C 40 -456, -40 -456, -84 -428 Z" fill={L.headband} stroke={OUT} strokeWidth={LW} />}
          <HatShape hat={L.hat} c={L.hatColor ?? K.navy} />
        </g>
        {/* front arm */}
        {limb(sh.x, sh.y, armR, 1, 90, 84, 30, sleeve, skin, holdEl(holdR))}
      </g>
    </g>
  );
};

const Torso: React.FC<{ shirt: string; jacket?: string; tie?: string; hoodie?: boolean; bw: number; collar?: string }> = ({ shirt, jacket, tie, hoodie, bw, collar }) => {
  const w1 = 66 * bw, w2 = 60 * bw;
  const body = `M ${-w1} -300 C ${-w1} -330, ${-w1 + 20} -336, -30 -338 L 30 -338 C ${w1 - 20} -336, ${w1} -330, ${w1} -300 L ${w2} -160 C ${w2} -140, ${w2 - 12} -132, ${w2 - 30} -132 L ${-w2 + 30} -132 C ${-w2 + 12} -132, ${-w2} -140, ${-w2} -160 Z`;
  return (
    <g>
      <path d={body} fill={jacket ?? shirt} stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      {jacket && <>
        <path d="M -30 -338 L 0 -262 L 30 -338 Z" fill={collar ?? K.white} stroke={OUT} strokeWidth={LW * 0.8} strokeLinejoin="round" />
        <path d="M -30 -338 L -8 -250 L -34 -272 Z M 30 -338 L 8 -250 L 34 -272 Z" fill={jacket} stroke={OUT} strokeWidth={LW * 0.8} strokeLinejoin="round" />
        <circle cx={0} cy={-205} r={5} fill={OUT} />
      </>}
      {!jacket && !hoodie && <path d="M -26 -338 L 0 -314 L 26 -338" fill="none" stroke={OUT} strokeWidth={LW * 0.8} strokeLinecap="round" />}
      {tie && <path d="M -9 -330 L 9 -330 L 6 -316 L 13 -258 L 0 -244 L -13 -258 L -6 -316 Z" fill={tie} stroke={OUT} strokeWidth={LW * 0.7} strokeLinejoin="round" />}
      {hoodie && <>
        <path d="M -44 -338 C -40 -300, 40 -300, 44 -338" fill="none" stroke={OUT} strokeWidth={LW * 0.8} />
        <path d="M -14 -312 L -16 -270 M 14 -312 L 16 -270" stroke={OUT} strokeWidth={LW * 0.7} strokeLinecap="round" />
        <path d={`M -36 -200 L 36 -200 L 30 -160 L -30 -160 Z`} fill="rgba(0,0,0,0.08)" stroke={OUT} strokeWidth={LW * 0.7} />
      </>}
    </g>
  );
};

const Face: React.FC<{ mood: Mood; blink: number; lookX: number; lookY: number; open: number; mustache?: boolean; hairC: string }> = ({ mood, blink, lookX, lookY, open, mustache, hairC }) => {
  const eyeY = -425;
  const big = mood === "shocked" || mood === "surprised";
  const pr = mood === "shocked" ? 5 : 8.5;
  const brow: Record<Mood, [number, number]> = {
    neutral: [0, 0], happy: [-6, 4], grin: [-8, 6], sad: [14, 2], angry: [-22, -4], surprised: [-4, 14],
    worried: [18, 6], smug: [-14, 0], shocked: [-2, 18], sleepy: [4, -2],
  };
  const [ba, lift] = brow[mood];
  const mouthY = -378;
  let mouth: React.ReactNode;
  if (open > 0.05) {
    const h = 6 + open * 24, w = 30 - open * 6;
    const smiley = mood === "happy" || mood === "grin" || mood === "smug";
    mouth = smiley
      ? <path d={`M ${-w} ${mouthY - 6} Q 0 ${mouthY - 6 + h * 1.6} ${w} ${mouthY - 6} Z`} fill="#6B2626" stroke={OUT} strokeWidth={LW} strokeLinejoin="round" />
      : <ellipse cx={0} cy={mouthY} rx={w * 0.7} ry={h / 2 + 2} fill="#6B2626" stroke={OUT} strokeWidth={LW} />;
  } else {
    const M: Record<Mood, React.ReactNode> = {
      neutral: <path d={`M -16 ${mouthY} Q 0 ${mouthY + 8} 16 ${mouthY}`} />,
      happy: <path d={`M -24 ${mouthY - 4} Q 0 ${mouthY + 18} 24 ${mouthY - 4}`} />,
      grin: <path d={`M -28 ${mouthY - 8} Q 0 ${mouthY + 30} 28 ${mouthY - 8} Z`} fill="#6B2626" />,
      sad: <path d={`M -20 ${mouthY + 6} Q 0 ${mouthY - 10} 20 ${mouthY + 6}`} />,
      angry: <path d={`M -20 ${mouthY + 4} Q 0 ${mouthY - 6} 20 ${mouthY + 4}`} />,
      surprised: <ellipse cx={0} cy={mouthY} rx={11} ry={14} fill="#6B2626" />,
      worried: <path d={`M -20 ${mouthY + 2} q 7 -7 13 0 t 13 0 t 13 0`} />,
      smug: <path d={`M -20 ${mouthY} Q 4 ${mouthY + 10} 24 ${mouthY - 10}`} />,
      shocked: <ellipse cx={0} cy={mouthY + 2} rx={14} ry={20} fill="#6B2626" />,
      sleepy: <path d={`M -12 ${mouthY + 2} L 12 ${mouthY + 2}`} />,
    };
    mouth = M[mood];
  }
  return (
    <g>
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <g transform={`translate(${sd * 30} ${eyeY}) scale(1 ${blink})`}>
            {big ? <>
              <ellipse cx={0} cy={0} rx={19} ry={23} fill={K.white} stroke={OUT} strokeWidth={LW * 0.8} />
              <circle cx={lookX * 6} cy={lookY * 6 + 2} r={pr} fill={OUT} />
            </> : <>
              <ellipse cx={lookX * 5} cy={lookY * 5} rx={11} ry={15} fill={OUT} />
              <circle cx={lookX * 5 + 4} cy={lookY * 5 - 5} r={4} fill={K.white} />
            </>}
          </g>
          <path d={`M ${sd * 30 - 17} ${eyeY - 32 - lift} L ${sd * 30 + 17} ${eyeY - 32 - lift}`} stroke={OUT} strokeWidth={LW * 1.5} strokeLinecap="round"
            transform={`rotate(${sd * -ba} ${sd * 30} ${eyeY - 32 - lift})`} />
        </g>
      ))}
      <path d="M -6 -398 Q 0 -392 6 -398" fill="none" stroke={OUT} strokeWidth={LW * 0.7} strokeLinecap="round" opacity={0.6} />
      {mustache && <path d="M -30 -386 C -18 -400, -4 -396, 0 -390 C 4 -396, 18 -400, 30 -386 C 18 -390, 6 -384, 0 -386 C -6 -384, -18 -390, -30 -386 Z" fill={hairC} stroke={OUT} strokeWidth={LW * 0.7} />}
      <g fill="none" stroke={OUT} strokeWidth={LW} strokeLinecap="round" strokeLinejoin="round">{mouth}</g>
    </g>
  );
};

const HairShape: React.FC<{ hair: Hair; c: string }> = ({ hair, c }) => {
  const st = { fill: c, stroke: OUT, strokeWidth: LW, strokeLinejoin: "round" as const };
  switch (hair) {
    case "bald": return <path d="M -84 -420 C -86 -440, -80 -446, -74 -444 L -72 -400 Z M 84 -420 C 86 -440, 80 -446, 74 -444 L 72 -400 Z" {...st} />;
    case "buzz": return <path d="M -84 -425 C -84 -510, 84 -510, 84 -425 C 70 -470, -70 -470, -84 -425 Z" {...st} opacity={0.9} />;
    case "short": return <path d="M -88 -418 C -96 -520, 96 -530, 88 -418 C 80 -450, 60 -466, 30 -470 C 10 -452, -30 -456, -50 -466 C -70 -458, -84 -440, -88 -418 Z" {...st} />;
    case "side": return <path d="M -88 -412 C -100 -520, 90 -540, 90 -420 C 80 -460, 40 -478, -10 -470 C 20 -490, -40 -470, -60 -458 C -80 -446, -84 -430, -88 -412 Z" {...st} />;
    case "slick": return <g><path d="M -88 -420 C -94 -515, 94 -515, 88 -420 C 70 -472, -70 -472, -88 -420 Z" {...st} /><path d="M -40 -484 C -10 -494, 20 -494, 46 -482" stroke="rgba(255,255,255,0.45)" strokeWidth={6} fill="none" strokeLinecap="round" /></g>;
    case "spiky": return <path d="M -88 -420 L -96 -470 L -66 -462 L -64 -512 L -30 -478 L -10 -530 L 14 -480 L 44 -520 L 54 -470 L 92 -478 L 88 -420 C 70 -460, -70 -460, -88 -420 Z" {...st} />;
    case "curly": return <g>{[[-70, -455], [-45, -485], [-12, -498], [22, -496], [52, -482], [74, -455], [-84, -425], [86, -425]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={28} {...st} />)}<path d="M -80 -440 C -60 -470, 60 -470, 80 -440 L 80 -455 C 40 -500, -40 -500, -80 -455 Z" fill={c} /></g>;
    case "afro": return <path d="M -84 -425 C -80 -500, 80 -500, 84 -425 C 60 -470, -60 -470, -84 -425 Z" {...st} />;
    case "long": return <path d="M -90 -400 C -100 -525, 100 -525, 90 -400 C 84 -450, 50 -470, 0 -462 C -50 -470, -84 -450, -90 -400 Z" {...st} />;
    case "bun": return <g><circle cx={0} cy={-520} r={32} {...st} /><path d="M -88 -418 C -96 -520, 96 -520, 88 -418 C 70 -462, -70 -462, -88 -418 Z" {...st} /></g>;
  }
};

const HatShape: React.FC<{ hat?: Look["hat"]; c: string }> = ({ hat, c }) => {
  const st = { fill: c, stroke: OUT, strokeWidth: LW, strokeLinejoin: "round" as const };
  switch (hat) {
    case "top": return <g><rect x={-62} y={-590} width={124} height={110} rx={8} {...st} /><rect x={-62} y={-505} width={124} height={18} fill={K.red} stroke={OUT} strokeWidth={LW} /><path d="M -100 -480 C -60 -496, 60 -496, 100 -480 C 60 -470, -60 -470, -100 -480 Z" {...st} /></g>;
    case "cap": return <g><path d="M -86 -440 C -90 -530, 90 -530, 86 -440 Z" {...st} /><path d="M 40 -446 C 90 -456, 140 -444, 150 -432 C 110 -428, 70 -430, 40 -432 Z" {...st} /></g>;
    case "beanie": return <g><path d="M -88 -430 C -92 -540, 92 -540, 88 -430 Z" {...st} /><rect x={-92} y={-450} width={184} height={30} rx={12} {...st} /><circle cx={0} cy={-532} r={18} {...st} /></g>;
    case "visor": return <g><path d="M -86 -455 L 86 -455 L 86 -440 L -86 -440 Z" {...st} /><path d="M 20 -452 C 80 -470, 150 -450, 155 -436 L 30 -438 Z" {...st} /></g>;
    default: return null;
  }
};

/** Cast presets (our own characters; reuse across episodes for recognisability). */
export const CAST: Record<string, Look> = {
  sam: { hair: "short", hairColor: "#3D2A1E", skin: SKIN[1], shirt: K.teal, pants: "#33405E", hoodie: true },
  banker: { hair: "slick", hairColor: "#2A2A2E", skin: SKIN[0], jacket: K.navy, tie: K.red, glasses: true, pants: "#283250" },
  boss: { hair: "bald", hairColor: "#8A8A8A", skin: SKIN[0], jacket: "#3B3B44", tie: K.gold, mustache: true, pants: "#2C2C33", build: 1.15 },
  analyst: { hair: "side", hairColor: "#5A3B22", skin: SKIN[2], shirt: "#E8EEF7", tie: K.blue, pants: "#3A3F4D" },
  lena: { hair: "bun", hairColor: "#2B1B14", skin: SKIN[3], shirt: K.purple, pants: "#2E3550" },
  kid: { hair: "curly", hairColor: "#6B3E1F", skin: SKIN[2], shirt: K.yellow, pants: "#3E6FB0", height: 0.78 },
  grandpa: { hair: "bald", hairColor: "#D8D8D8", skin: SKIN[0], shirt: "#C9B48A", mustache: true, glasses: true, pants: "#5A5246", collar: K.white },
  grandma: { hair: "bun", hairColor: "#D9D9D9", skin: SKIN[1], shirt: K.pink, glasses: true, pants: "#6A5A7A" },
  trader: { hair: "spiky", hairColor: "#1F1F1F", skin: SKIN[1], shirt: "#F2F2F2", tie: K.green, pants: "#2E2E36" },
  headband: { hair: "short", hairColor: "#5B3A22", skin: SKIN[0], shirt: "#C93C3C", headband: K.red, hoodie: true, beard: "stubble", pants: "#3B4660" },
};

/** A quick crowd: deterministic varied looks. */
export function crowdLook(i: number): Look {
  const hairs: Hair[] = ["short", "side", "spiky", "curly", "long", "bun", "buzz", "afro"];
  const shirts = [K.teal, K.orange, K.purple, K.blue, K.green, K.pink, K.yellow, "#E86F5A", "#5AC0D8"];
  return {
    hair: hairs[Math.floor(rnd(i) * hairs.length)], hairColor: ["#2B1B14", "#5B3A22", "#C58B3E", "#1F1F1F", "#8C4A2F"][Math.floor(rnd(i + 1) * 5)],
    skin: SKIN[Math.floor(rnd(i + 2) * SKIN.length)], shirt: shirts[Math.floor(rnd(i + 3) * shirts.length)],
    hoodie: rnd(i + 4) > 0.6, glasses: rnd(i + 5) > 0.75, pants: ["#33405E", "#3B4660", "#4A3F35", "#2E2E36"][Math.floor(rnd(i + 6) * 4)],
    height: 0.92 + rnd(i + 7) * 0.14,
  } as Look;
}
