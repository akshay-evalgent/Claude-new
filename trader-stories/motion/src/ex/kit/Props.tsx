// Props in the house cartoon style. Each is drawn around its grip point (0,0), in character units,
// so it can sit in a hand or stand alone at any scale.
import React from "react";
import { CF, K, LW, OUT } from "./style";

const st = (fill: string, w = LW) => ({ fill, stroke: OUT, strokeWidth: w, strokeLinejoin: "round" as const, strokeLinecap: "round" as const });

export type PropName =
  | "phone" | "cash" | "cashStack" | "coin" | "moneyBag" | "sign" | "briefcase" | "laptop" | "cup" | "ticket"
  | "paper" | "chart" | "magnifier" | "gamepad" | "lemon" | "trophy" | "calculator" | "pen" | "bell" | "megaphone"
  | "rocket" | "houseIcon" | "piggy" | "card" | "receipt" | "key";

export const Prop: React.FC<{ name: PropName; label?: string; color?: string }> = ({ name, label, color }) => {
  switch (name) {
    case "phone":
      return <g><rect x={-22} y={-78} width={44} height={82} rx={9} {...st(K.dark)} /><rect x={-16} y={-70} width={32} height={60} rx={4} fill={color ?? "#7FD3F5"} /><path d="M -14 -24 L -4 -36 L 4 -30 L 14 -50" stroke={K.gain} strokeWidth={4} fill="none" strokeLinecap="round" /></g>;
    case "cash":
      return <g transform="rotate(-8)"><rect x={-52} y={-60} width={104} height={54} rx={6} {...st("#9FD69A")} /><circle cx={0} cy={-33} r={15} fill="#7BBF76" stroke={OUT} strokeWidth={3} /><text x={0} y={-26} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={22} fill={OUT}>$</text></g>;
    case "cashStack":
      return <g>{[0, 1, 2, 3].map((i) => <rect key={i} x={-58} y={-24 - i * 14} width={116} height={20} rx={4} {...st(i % 2 ? "#9FD69A" : "#8CCB86", 4)} />)}<rect x={-16} y={-82} width={32} height={66} fill={K.yellow} opacity={0.9} stroke={OUT} strokeWidth={3} /></g>;
    case "coin":
      return <g><circle cx={0} cy={-34} r={32} {...st(K.gold)} /><circle cx={0} cy={-34} r={22} fill="none" stroke={OUT} strokeWidth={3} opacity={0.5} /><text x={0} y={-24} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={30} fill={OUT}>$</text></g>;
    case "moneyBag":
      return <g><path d="M -20 -110 L 20 -110 L 12 -92 C 60 -80, 70 -20, 50 -4 C 30 8, -30 8, -50 -4 C -70 -20, -60 -80, -12 -92 Z" {...st("#D8B477")} /><path d="M -22 -92 L 22 -92" stroke={OUT} strokeWidth={6} /><text x={0} y={-30} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={50} fill={OUT}>$</text></g>;
    case "sign":
      return <g><rect x={-6} y={-150} width={12} height={150} {...st(K.wood)} /><rect x={-95} y={-230} width={190} height={96} rx={10} {...st(K.paper)} /><text x={0} y={-170} textAnchor="middle" dominantBaseline="middle" fontFamily={CF.label} fontWeight={700} fontSize={label && label.length > 8 ? 30 : 40} fill={OUT}>{label}</text></g>;
    case "briefcase":
      return <g><path d="M -22 -76 L -22 -88 L 22 -88 L 22 -76" fill="none" stroke={OUT} strokeWidth={7} /><rect x={-62} y={-76} width={124} height={80} rx={10} {...st("#8A5A3B")} /><path d="M -62 -46 L 62 -46" stroke={OUT} strokeWidth={4} /><rect x={-10} y={-52} width={20} height={14} {...st(K.gold, 3)} /></g>;
    case "laptop":
      return <g><rect x={-70} y={-96} width={140} height={88} rx={8} {...st("#C7CCD4")} /><rect x={-60} y={-88} width={120} height={70} rx={4} fill={color ?? "#20323F"} /><path d="M -50 -30 L -24 -50 L -4 -40 L 20 -66 L 48 -74" stroke={K.gain} strokeWidth={5} fill="none" strokeLinecap="round" /><path d="M -88 -8 L 88 -8 L 76 6 L -76 6 Z" {...st("#AEB3BC")} /></g>;
    case "cup":
      return <g><path d="M -24 -80 L 24 -80 L 18 0 L -18 0 Z" {...st(K.white)} /><path d="M -21 -58 L 21 -58 L 17 -2 L -17 -2 Z" fill={K.lemon} /><path d="M 6 -80 L 18 -120" stroke={K.red} strokeWidth={7} strokeLinecap="round" /><circle cx={-14} cy={-82} r={12} {...st(K.lemon, 3)} /></g>;
    case "ticket":
      return <g transform="rotate(-6)"><path d="M -70 -80 L 70 -80 L 70 -58 A 10 10 0 0 0 70 -38 L 70 -10 L -70 -10 L -70 -38 A 10 10 0 0 0 -70 -58 Z" {...st("#FCE38A")} /><text x={0} y={-52} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={22} fill={OUT}>{label ?? "LOTTO"}</text><text x={0} y={-24} textAnchor="middle" fontFamily={CF.mono} fontWeight={600} fontSize={15} fill={OUT}>07 12 23 31 38 44</text></g>;
    case "paper":
      return <g transform="rotate(-4)"><path d="M -48 -130 L 30 -130 L 50 -110 L 50 0 L -48 0 Z" {...st(K.white)} />{[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M -34 ${-100 + i * 18} L ${i === 4 ? 6 : 36} ${-100 + i * 18}`} stroke="#9AA0A8" strokeWidth={5} strokeLinecap="round" />)}{label && <text x={0} y={-112} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={16} fill={OUT}>{label}</text>}</g>;
    case "chart":
      return <g><rect x={-80} y={-130} width={160} height={120} rx={10} {...st(K.white)} /><path d="M -62 -36 L -30 -60 L -6 -50 L 22 -92 L 60 -104" stroke={color ?? K.gain} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
    case "magnifier":
      return <g><path d="M 0 0 L 30 -40" stroke={OUT} strokeWidth={14} strokeLinecap="round" /><circle cx={48} cy={-66} r={34} {...st("rgba(200,235,255,0.6)", 7)} /></g>;
    case "gamepad":
      return <g><path d="M -60 -60 C -80 -60, -90 -10, -70 0 C -55 8, -45 -12, -30 -18 L 30 -18 C 45 -12, 55 8, 70 0 C 90 -10, 80 -60, 60 -60 Z" {...st("#55565E")} /><path d="M -46 -40 L -26 -40 M -36 -50 L -36 -30" stroke={K.white} strokeWidth={6} strokeLinecap="round" /><circle cx={34} cy={-44} r={6} fill={K.red} /><circle cx={48} cy={-32} r={6} fill={K.yellow} /></g>;
    case "lemon":
      return <g><ellipse cx={0} cy={-30} rx={36} ry={28} {...st(K.lemon)} /><path d="M 30 -38 L 40 -44" stroke={OUT} strokeWidth={5} strokeLinecap="round" /><path d="M -2 -58 C 8 -74, 26 -72, 30 -64 C 18 -60, 8 -58, -2 -58 Z" {...st(K.green, 3)} /></g>;
    case "trophy":
      return <g><path d="M -36 -110 L 36 -110 L 30 -60 C 26 -44, -26 -44, -30 -60 Z" {...st(K.gold)} /><rect x={-8} y={-46} width={16} height={26} {...st(K.gold)} /><rect x={-30} y={-22} width={60} height={20} rx={4} {...st(K.wood)} /></g>;
    case "calculator":
      return <g><rect x={-38} y={-100} width={76} height={100} rx={10} {...st("#4B5563")} /><rect x={-28} y={-90} width={56} height={22} rx={3} fill="#B8E6B0" />{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={-26 + c * 20} y={-60 + r * 18} width={14} height={12} rx={2} fill={K.white} />))}</g>;
    case "pen":
      return <g><path d="M 0 0 L 8 -10 L 60 -80 L 50 -88 L -2 -18 Z" {...st(K.blue, 4)} /><path d="M 0 0 L 8 -10 L -2 -18 Z" fill={OUT} /></g>;
    case "bell":
      return <g><path d="M -40 -20 C -40 -80, -20 -100, 0 -100 C 20 -100, 40 -80, 40 -20 L 50 -10 L -50 -10 Z" {...st(K.gold)} /><circle cx={0} cy={-2} r={10} {...st(K.gold)} /></g>;
    case "megaphone":
      return <g><path d="M 0 -30 L 70 -70 L 70 10 Z" {...st(K.red)} /><rect x={-20} y={-44} width={26} height={30} rx={4} {...st(K.white)} /></g>;
    case "rocket":
      return <g><path d="M 0 -150 C 30 -120, 34 -70, 26 -30 L -26 -30 C -34 -70, -30 -120, 0 -150 Z" {...st(K.white)} /><circle cx={0} cy={-95} r={13} {...st("#7FD3F5", 4)} /><path d="M -26 -60 L -48 -20 L -24 -30 Z M 26 -60 L 48 -20 L 24 -30 Z" {...st(K.red, 4)} /><path d="M -14 -30 L 0 0 L 14 -30 Z" fill={K.orange} /></g>;
    case "houseIcon":
      return <g><path d="M -60 -60 L 0 -110 L 60 -60 Z" {...st(K.red)} /><rect x={-48} y={-60} width={96} height={60} {...st(K.paper)} /><rect x={-12} y={-34} width={24} height={34} {...st(K.wood)} /></g>;
    case "piggy":
      return <g><ellipse cx={0} cy={-48} rx={62} ry={46} {...st(K.pink)} /><ellipse cx={58} cy={-50} rx={16} ry={14} {...st("#F5B9BF")} /><circle cx={30} cy={-66} r={5} fill={OUT} /><path d="M -10 -96 L 14 -96" stroke={OUT} strokeWidth={6} strokeLinecap="round" /><path d="M -40 -6 L -40 6 M 30 -6 L 30 6" stroke={OUT} strokeWidth={12} strokeLinecap="round" /></g>;
    case "card":
      return <g transform="rotate(-10)"><rect x={-56} y={-76} width={112} height={72} rx={9} {...st(color ?? K.navy)} /><rect x={-44} y={-62} width={22} height={16} rx={3} fill={K.gold} /><path d="M -44 -24 L 30 -24" stroke={K.white} strokeWidth={5} strokeLinecap="round" opacity={0.7} /></g>;
    case "receipt":
      return <g><path d="M -36 -130 L 36 -130 L 36 0 L 28 -8 L 20 0 L 12 -8 L 4 0 L -4 -8 L -12 0 L -20 -8 L -28 0 L -36 -8 Z" {...st(K.white)} />{[0, 1, 2, 3].map((i) => <path key={i} d={`M -24 ${-110 + i * 20} L 24 ${-110 + i * 20}`} stroke="#9AA0A8" strokeWidth={4} />)}</g>;
    case "key":
      return <g><circle cx={0} cy={-80} r={24} {...st(K.gold)} /><circle cx={0} cy={-80} r={9} fill={K.paper} stroke={OUT} strokeWidth={3} /><path d="M 0 -56 L 0 0 M 0 -20 L 16 -20 M 0 -6 L 12 -6" stroke={OUT} strokeWidth={9} strokeLinecap="round" /></g>;
  }
};

/** Set pieces: larger standing objects, origin at their base centre. */
export const LemonadeStand: React.FC<{ sign?: string; price?: string; level?: number }> = ({ sign = "LEMONADE", price = "$1", level = 0 }) => (
  <g>
    {/* awning */}
    <rect x={-170} y={-330} width={14} height={330} {...st(K.wood)} />
    <rect x={156} y={-330} width={14} height={330} {...st(K.wood)} />
    <path d="M -200 -330 L 200 -330 L 186 -270 L -186 -270 Z" {...st(K.white)} />
    {[-3, -2, -1, 0, 1, 2].map((i) => <path key={i} d={`M ${-200 + (i + 3) * 66.6} -330 L ${-200 + (i + 3) * 66.6 + 33} -330 L ${-186 + (i + 3) * 62 + 31} -270 L ${-186 + (i + 3) * 62} -270 Z`} fill={level > 1 ? K.gold : K.yellow} stroke={OUT} strokeWidth={3} />)}
    <path d="M -186 -270 Q -155 -245 -124 -270 Q -93 -245 -62 -270 Q -31 -245 0 -270 Q 31 -245 62 -270 Q 93 -245 124 -270 Q 155 -245 186 -270" {...st(K.white, 4)} />
    {/* counter */}
    <rect x={-190} y={-150} width={380} height={150} rx={6} {...st("#E9C28C")} />
    {[0, 1, 2, 3].map((i) => <path key={i} d={`M -190 ${-112 + i * 38} L 190 ${-112 + i * 38}`} stroke={OUT} strokeWidth={3} opacity={0.35} />)}
    <rect x={-200} y={-170} width={400} height={26} rx={6} {...st(K.wood)} />
    <rect x={-120} y={-118} width={240} height={64} rx={8} {...st(K.paper)} />
    <text x={0} y={-76} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={40} fill={OUT}>{sign}</text>
    <text x={150} y={-20} textAnchor="middle" fontFamily={CF.hand} fontSize={36} fill={OUT}>{price}</text>
    {/* jug */}
    <path d="M -130 -170 L -130 -250 C -130 -262, -76 -262, -76 -250 L -76 -170 Z" {...st("rgba(255,255,255,0.75)")} />
    <rect x={-128} y={-226} width={50} height={54} fill={K.lemon} opacity={0.9} />
    <circle cx={-103} cy={-238} r={11} {...st(K.lemon, 3)} />
    <g transform="translate(70 -170) scale(0.8)"><Prop name="cup" /></g>
    <g transform="translate(120 -170) scale(0.8)"><Prop name="cup" /></g>
  </g>
);

export const Desk: React.FC<{ w?: number; monitor?: boolean; chartColor?: string }> = ({ w = 360, monitor = true, chartColor = K.gain }) => (
  <g>
    <rect x={-w / 2} y={-170} width={w} height={22} rx={5} {...st(K.wood)} />
    <rect x={-w / 2 + 16} y={-150} width={18} height={150} {...st("#8A5E3C")} />
    <rect x={w / 2 - 34} y={-150} width={18} height={150} {...st("#8A5E3C")} />
    {monitor && <g transform="translate(40 -170)">
      <rect x={-14} y={-40} width={28} height={40} {...st("#AEB3BC")} />
      <rect x={-90} y={-150} width={180} height={115} rx={8} {...st("#2A2F38")} />
      <rect x={-80} y={-140} width={160} height={95} rx={4} fill="#1C3442" />
      <path d="M -68 -62 L -38 -84 L -14 -74 L 14 -110 L 40 -96 L 68 -126" stroke={chartColor} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>}
  </g>
);

export const Building: React.FC<{ w: number; h: number; color: string; windows?: string; label?: string; roof?: "flat" | "columns" }> = ({ w, h, color, windows = "#FFE9A8", label, roof = "flat" }) => {
  const cols = Math.max(2, Math.floor(w / 46)), rows = Math.max(2, Math.floor((h - 40) / 56));
  if (roof === "columns") {
    return (
      <g>
        <path d={`M ${-w / 2 - 30} ${-h + 10} L 0 ${-h - 90} L ${w / 2 + 30} ${-h + 10} Z`} {...st(color)} />
        <rect x={-w / 2 - 20} y={-h + 10} width={w + 40} height={30} {...st(color)} />
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={-w / 2 + 10 + i * ((w - 50) / 5)} y={-h + 40} width={30} height={h - 70} {...st(K.white, 4)} />)}
        <rect x={-w / 2 - 30} y={-30} width={w + 60} height={30} {...st(color)} />
        {label && <text x={0} y={-h - 2} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={Math.min(56, w / 7)} fill={OUT}>{label}</text>}
      </g>
    );
  }
  return (
    <g>
      <rect x={-w / 2} y={-h} width={w} height={h} {...st(color, 4)} />
      {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((_, c) => (
        <rect key={`${r}-${c}`} x={-w / 2 + 14 + c * ((w - 28) / cols)} y={-h + 22 + r * 56} width={(w - 28) / cols - 12} height={34} rx={3}
          fill={(r * 7 + c * 3) % 5 === 0 ? windows : "rgba(255,255,255,0.35)"} stroke={OUT} strokeWidth={2.5} />
      )))}
      {label && <g><rect x={-w / 2 + 10} y={-h - 50} width={w - 20} height={44} rx={6} {...st(K.paper, 4)} /><text x={0} y={-h - 18} textAnchor="middle" fontFamily={CF.label} fontWeight={700} fontSize={28} fill={OUT}>{label}</text></g>}
    </g>
  );
};

export const Tree: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>
    <rect x={-12} y={-90} width={24} height={90} {...st(K.wood, 4)} />
    <circle cx={0} cy={-140} r={62} {...st(K.grass2, 4)} />
    <circle cx={-40} cy={-110} r={40} {...st(K.grass2, 4)} />
    <circle cx={42} cy={-112} r={42} {...st(K.grass2, 4)} />
  </g>
);

export const House: React.FC<{ color: string; roof: string; s?: number }> = ({ color, roof, s = 1 }) => (
  <g transform={`scale(${s})`}>
    <rect x={-110} y={-170} width={220} height={170} {...st(color, 4)} />
    <path d="M -130 -170 L 0 -270 L 130 -170 Z" {...st(roof, 4)} />
    <rect x={-26} y={-90} width={52} height={90} {...st(K.wood, 4)} />
    <rect x={-90} y={-140} width={46} height={40} {...st("#CFEFFF", 4)} />
    <rect x={44} y={-140} width={46} height={40} {...st("#CFEFFF", 4)} />
  </g>
);
