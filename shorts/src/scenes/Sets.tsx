import React from 'react';
import {C, GROUND} from '../lib/theme';
import {Drawing, DrawingKind} from '../components/Props';
import {rand} from '../lib/anim';

const ST = {stroke: C.ink, strokeWidth: 5, strokeLinejoin: 'round' as const};
const KINDS: DrawingKind[] = ['sun', 'dog', 'house', 'rocket', 'family', 'dino', 'portrait'];
const TINTS = ['#fffdf6', '#fff4d6', '#e8f6ff', '#ffeef2', '#eefbea'];

/** Pinned drawings scattered over a rectangle, filled in a stable order. */
export const ArtWall: React.FC<{x: number; y: number; w: number; h: number; n: number; seed?: number; size?: number; magnets?: boolean}> = ({x, y, w, h, n, seed = 3, size = 1, magnets = true}) => {
  const cols = Math.max(2, Math.round(w / (64 * size)));
  const rows = Math.max(2, Math.round(h / (56 * size)));
  const slots = cols * rows;
  const items = [];
  for (let i = 0; i < Math.min(n, slots * 2); i++) {
    const layer = Math.floor(i / slots);
    const j = (i * 7 + layer * 3) % slots;
    const cx = x + ((j % cols) + 0.5) * (w / cols) + (rand(seed + i) - 0.5) * 14 + layer * 10;
    const cy = y + (Math.floor(j / cols) + 0.5) * (h / rows) + (rand(seed + i * 3) - 0.5) * 12 + layer * 8;
    const rot = (rand(seed + i * 5) - 0.5) * 16;
    items.push(
      <g key={i} transform={`translate(${cx} ${cy + 30 * size}) rotate(${rot})`}>
        <Drawing kind={KINDS[(i + seed) % KINDS.length]} w={58 * size} h={46 * size} tint={TINTS[i % TINTS.length]} />
        {magnets && <circle cx={0} cy={-40 * size} r={5} fill={['#e2445c', '#3b82f6', '#f5a623', '#5cb85c'][i % 4]} stroke={C.ink} strokeWidth={2.5} />}
      </g>,
    );
  }
  return <g>{items}</g>;
};

export type KitchenProps = {
  palette?: 'old' | 'new';
  fridgeArt?: number;
  table?: boolean;
  window?: 'day' | 'evening';
  wallArt?: React.ReactNode;
  children?: React.ReactNode;
  fridgeExtra?: React.ReactNode;
  bills?: boolean;
};

export const Kitchen: React.FC<KitchenProps> = ({palette = 'old', fridgeArt = 0, table = false, window = 'day', children, fridgeExtra, wallArt, bills}) => {
  const wallA = palette === 'old' ? '#a8c0a0' : '#c9b8a6';
  const wallB = palette === 'old' ? '#8fab8a' : '#b29f8c';
  const cab = palette === 'old' ? '#4f7f7b' : '#5a6c8a';
  const sky = window === 'day' ? ['#a8dcf5', '#e8f7fd'] : ['#f6a66b', '#ffd9a0'];
  return (
    <g>
      <defs>
        <linearGradient id={`kw-${palette}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wallA} />
          <stop offset="1" stopColor={wallB} />
        </linearGradient>
        <linearGradient id={`sky-${window}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
        <radialGradient id="lampglow" cx="0.5" cy="0.3" r="0.6">
          <stop offset="0" stopColor="#fff2c4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff2c4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={1080} height={630} fill={`url(#kw-${palette})`} />
      {/* backsplash + upper cabinets */}
      <rect x={700} y={212} width={380} height={186} fill={palette === 'old' ? '#d6e2cf' : '#e9e1d6'} />
      {Array.from({length: 7}).map((_, i) => (
        <path key={`v${i}`} d={`M${700 + i * 56} 212 V398`} stroke="#000" strokeOpacity={0.07} strokeWidth={3} />
      ))}
      {Array.from({length: 4}).map((_, i) => (
        <path key={`h${i}`} d={`M700 ${212 + i * 48} H1080`} stroke="#000" strokeOpacity={0.07} strokeWidth={3} />
      ))}
      <rect x={700} y={60} width={400} height={152} fill={cab} {...ST} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={716 + i * 126} y={76} width={110} height={120} rx={6} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={4} />
          <circle cx={810 + i * 126} cy={180} r={6} fill="#e9d8a6" stroke={C.ink} strokeWidth={3} />
        </g>
      ))}
      {/* window */}
      <g>
        <rect x={352} y={112} width={212} height={196} rx={8} fill="#fbf7ef" {...ST} />
        <rect x={366} y={126} width={184} height={168} fill={`url(#sky-${window})`} />
        <circle cx={500} cy={168} r={20} fill={window === 'day' ? '#fff6c9' : '#ffd166'} opacity={0.9} />
        <path d="M366 270 q30 -24 60 -6 q34 -22 70 0 q26 -14 54 2 V294 H366 Z" fill="#7fbf7f" opacity={0.75} />
        <path d="M458 126 V294 M366 210 H550" stroke="#fbf7ef" strokeWidth={10} />
        <rect x={340} y={300} width={236} height={16} rx={4} fill="#fbf7ef" {...ST} strokeWidth={4} />
        <path d="M352 104 q30 110 -4 200 L330 300 V100 Z" fill="#f2b230" {...ST} strokeWidth={4} opacity={0.95} />
        <path d="M564 104 q-30 110 4 200 L586 300 V100 Z" fill="#f2b230" {...ST} strokeWidth={4} opacity={0.95} />
        <rect x={322} y={92} width={272} height={12} rx={6} fill="#6b4b3a" {...ST} strokeWidth={4} />
      </g>
      {wallArt}
      {/* hanging lamp */}
      <path d="M620 0 V46" stroke={C.ink} strokeWidth={4} />
      <ellipse cx={620} cy={170} rx={200} ry={160} fill="url(#lampglow)" />
      <path d="M584 82 q36 -48 72 0 z" fill="#f6b93b" {...ST} strokeWidth={4} />
      {/* counter */}
      <rect x={760} y={412} width={340} height={GROUND - 412} fill={cab} {...ST} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={778 + i * 152} y={432} width={136} height={140} rx={6} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={4} />
          <rect x={826 + i * 152} y={446} width={40} height={8} rx={4} fill="#e9d8a6" stroke={C.ink} strokeWidth={3} />
        </g>
      ))}
      <rect x={748} y={396} width={352} height={20} rx={4} fill="#f2e6d0" {...ST} />
      {/* kettle + plant */}
      <g transform="translate(1010 396)">
        <rect x={-22} y={-58} width={44} height={58} rx={8} fill="#cfd7e2" {...ST} strokeWidth={4} />
        <path d="M-40 -46 q22 -36 44 -4" fill="none" stroke="#7fbf7f" strokeWidth={9} strokeLinecap="round" />
        <path d="M-8 -40 q-16 -34 -30 -40 M6 -50 q8 -30 22 -44 M0 -54 q-2 -26 2 -40" stroke="#4c9a5a" strokeWidth={8} strokeLinecap="round" fill="none" />
      </g>
      {/* fridge */}
      <g>
        <rect x={50} y={140} width={210} height={GROUND - 140} rx={18} fill="#eef1ea" {...ST} />
        <rect x={232} y={150} width={18} height={GROUND - 160} rx={8} fill="#000" opacity={0.06} />
        <path d="M50 292 H260" stroke={C.ink} strokeWidth={5} />
        <rect x={226} y={176} width={12} height={84} rx={6} fill="#c9cfd8" stroke={C.ink} strokeWidth={4} />
        <rect x={226} y={318} width={12} height={110} rx={6} fill="#c9cfd8" stroke={C.ink} strokeWidth={4} />
        {bills && (
          <g>
            <g transform="translate(110 236) rotate(-4)">
              <rect x={-30} y={-36} width={60} height={70} fill="#ffffff" stroke={C.ink} strokeWidth={3} />
              {[0, 1, 2, 3, 4].map((i) => (
                <path key={i} d={`M-22 ${-24 + i * 12} h${i % 2 ? 30 : 44}`} stroke="#9aa3b5" strokeWidth={4} />
              ))}
              <circle cx={0} cy={-36} r={5} fill="#3b82f6" stroke={C.ink} strokeWidth={2.5} />
            </g>
            <g transform="translate(180 360) rotate(5)">
              <rect x={-26} y={-30} width={52} height={60} fill="#fff4d6" stroke={C.ink} strokeWidth={3} />
              <text x={0} y={-6} fontSize={14} fontFamily="Fredoka" fontWeight={700} textAnchor="middle" fill="#e2445c">PIZZA</text>
              {[0, 1].map((i) => (
                <path key={i} d={`M-16 ${8 + i * 10} h32`} stroke="#9aa3b5" strokeWidth={4} />
              ))}
              <circle cx={0} cy={-30} r={5} fill="#e2445c" stroke={C.ink} strokeWidth={2.5} />
            </g>
          </g>
        )}
        {fridgeArt > 0 && <ArtWall x={62} y={156} w={160} h={420} n={fridgeArt} seed={11} />}
        {fridgeExtra}
      </g>
      {/* table */}
      {table && (
        <g>
          <rect x={470} y={452} width={240} height={18} rx={5} fill="#b07a4f" {...ST} />
          <rect x={486} y={470} width={14} height={GROUND - 470} fill="#9a6640" {...ST} strokeWidth={4} />
          <rect x={680} y={470} width={14} height={GROUND - 470} fill="#9a6640" {...ST} strokeWidth={4} />
        </g>
      )}
      {/* floor */}
      <rect x={0} y={GROUND - 10} width={1080} height={12} fill="#5f4636" />
      <rect x={0} y={GROUND} width={1080} height={630 - GROUND} fill="#c4935f" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${i * 170 + 40} ${GROUND} v40`} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />
      ))}
      {children}
    </g>
  );
};

export type BedroomProps = {
  night?: boolean;
  doorOpen?: number; // 0..1
  hallLight?: number; // light under the door
  wallArt?: number; // kid's drawings taped on the wall
  lamp?: number; // desk lamp on (0..1)
  studyPlan?: boolean;
  children?: React.ReactNode;
  front?: React.ReactNode; // drawn above children (desk front, etc.)
  doorShadow?: number; // -1..1 position of feet shadow passing under door (NaN = none)
};

export const Bedroom: React.FC<BedroomProps> = ({night = false, doorOpen = 0, hallLight = 0, wallArt = 0, lamp = 0, studyPlan, children, front, doorShadow}) => {
  const wallA = night ? '#3b4767' : '#6a7ca3';
  const wallB = night ? '#2c3550' : '#56688f';
  const doorX = 892;
  const doorW = 150;
  const doorTop = 214;
  return (
    <g>
      <defs>
        <linearGradient id={`bw-${night}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={wallA} />
          <stop offset="1" stopColor={wallB} />
        </linearGradient>
        <radialGradient id="lampcone" cx="0.5" cy="0.2" r="0.8">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#ffefc4" />
        </linearGradient>
      </defs>
      <rect width={1080} height={630} fill={`url(#bw-${night})`} />
      {/* window */}
      <g>
        <rect x={84} y={108} width={196} height={196} rx={8} fill="#e9e3d6" {...ST} />
        <rect x={98} y={122} width={168} height={168} fill={night ? '#16203a' : '#ff9e6b'} />
        {night ? (
          <g>
            <circle cx={214} cy={170} r={26} fill="#fff3c4" />
            <circle cx={226} cy={162} r={24} fill="#16203a" />
            {[[120, 150], [160, 260], [240, 240], [140, 210], [200, 130]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={3} fill="#fff" opacity={0.8} />
            ))}
          </g>
        ) : (
          <g>
            <circle cx={180} cy={250} r={34} fill="#ffd166" />
            <rect x={98} y={252} width={168} height={38} fill="#ff7f50" opacity={0.6} />
          </g>
        )}
        <path d="M182 122 V290 M98 206 H266" stroke="#e9e3d6" strokeWidth={10} />
      </g>
      {/* shelf */}
      <rect x={560} y={232} width={250} height={14} rx={4} fill="#8a5a3c" {...ST} strokeWidth={4} />
      {['#e2445c', '#3b82f6', '#f5a623', '#5cb85c', '#8e44ad'].map((c, i) => (
        <rect key={c} x={576 + i * 26} y={168 + (i % 2) * 8} width={22} height={64 - (i % 2) * 8} rx={3} fill={c} stroke={C.ink} strokeWidth={3.5} />
      ))}
      <circle cx={760} cy={204} r={26} fill="#9ad0a8" stroke={C.ink} strokeWidth={4} />
      {wallArt > 0 && <ArtWall x={320} y={96} w={220} h={250} n={wallArt} seed={4} size={1.05} magnets={false} />}
      {studyPlan && (
        <g transform="translate(420 200) rotate(-2)">
          <rect x={-70} y={-80} width={140} height={160} fill="#ffffff" {...ST} strokeWidth={4} />
          <text x={0} y={-50} fontSize={20} fontFamily="Fredoka" fontWeight={700} textAnchor="middle" fill="#2c3550">STUDY PLAN</text>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i}>
              <rect x={-54} y={-34 + i * 18} width={10} height={10} fill="none" stroke="#2c3550" strokeWidth={2.5} />
              <path d={`M-36 ${-29 + i * 18} h${70 - (i % 3) * 12}`} stroke="#9aa3b5" strokeWidth={4} />
            </g>
          ))}
        </g>
      )}
      {/* door + hallway */}
      <rect x={doorX - 14} y={doorTop - 14} width={doorW + 28} height={GROUND - doorTop + 14} fill="#e9e3d6" {...ST} />
      <rect x={doorX} y={doorTop} width={doorW} height={GROUND - doorTop} fill="url(#hall)" />
      <rect x={doorX} y={doorTop} width={doorW} height={GROUND - doorTop} fill="#000" opacity={0.08} />
      {/* the door leaf, hinged on the right */}
      <g>
        <rect
          x={doorX + doorW * doorOpen * 0.82}
          y={doorTop}
          width={doorW * (1 - doorOpen * 0.82)}
          height={GROUND - doorTop}
          fill="#b07a4f"
          {...ST}
        />
        {doorOpen < 0.6 && <circle cx={doorX + 20 + doorW * doorOpen * 0.82} cy={410} r={8} fill="#f2d16b" stroke={C.ink} strokeWidth={3} />}
      </g>
      {hallLight > 0 && doorOpen === 0 && (
        <g opacity={hallLight}>
          <rect x={doorX + 4} y={GROUND - 8} width={doorW - 8} height={8} fill="#ffe29a" />
          <path d={`M${doorX - 40} ${GROUND + 36} L${doorX + 4} ${GROUND} H${doorX + doorW - 4} L${doorX + doorW + 40} ${GROUND + 36} Z`} fill="#ffe29a" opacity={0.35} />
          {doorShadow !== undefined && !Number.isNaN(doorShadow) && (
            <g>
              <rect x={doorX + doorW / 2 + doorShadow * 60 - 26} y={GROUND - 8} width={18} height={8} fill="#2c2233" />
              <rect x={doorX + doorW / 2 + doorShadow * 60 + 8} y={GROUND - 8} width={18} height={8} fill="#2c2233" />
            </g>
          )}
        </g>
      )}
      {/* bed */}
      <g>
        <rect x={20} y={398} width={22} height={GROUND - 398} rx={6} fill="#8a5a3c" {...ST} strokeWidth={4} />
        <rect x={30} y={480} width={380} height={GROUND - 480} rx={8} fill="#8a5a3c" {...ST} />
        <rect x={36} y={448} width={370} height={44} rx={14} fill="#f4f1ea" {...ST} />
        <path d="M150 446 h260 v40 q-130 16 -260 0 z" fill={night ? '#5b77b0' : '#e8b04a'} {...ST} />
        <rect x={54} y={418} width={96} height={38} rx={16} fill="#ffffff" {...ST} />
      </g>
      {/* desk (back part) */}
      <g>
        <rect x={560} y={432} width={300} height={16} rx={4} fill="#a0704b" {...ST} />
        <rect x={572} y={448} width={14} height={GROUND - 448} fill="#8a5a3c" {...ST} strokeWidth={4} />
        <rect x={760} y={448} width={92} height={GROUND - 448} rx={4} fill="#8a5a3c" {...ST} strokeWidth={4} />
        <rect x={772} y={470} width={68} height={40} rx={4} fill="none" stroke={C.ink} strokeOpacity={0.5} strokeWidth={4} />
        <circle cx={806} cy={490} r={5} fill="#f2d16b" stroke={C.ink} strokeWidth={2.5} />
        {/* lamp */}
        <g>
          {lamp > 0 && <ellipse cx={760} cy={430} rx={170} ry={120} fill="url(#lampcone)" opacity={lamp} />}
          <rect x={804} y={422} width={44} height={10} rx={4} fill="#2b2b36" stroke={C.ink} strokeWidth={4} />
          <path d="M826 422 L812 360 L770 344" stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" />
          <path d="M786 330 l-40 26 l20 24 z" fill="#2f9c8f" {...ST} strokeWidth={4} />
        </g>
      </g>
      {/* floor */}
      <rect x={0} y={GROUND} width={1080} height={630 - GROUND} fill="#7a5a4a" />
      <rect x={0} y={GROUND} width={1080} height={6} fill="#000" opacity={0.15} />
      {children}
      {front}
      {night && <rect width={1080} height={630} fill="#0b1230" opacity={0.28 * (1 - lamp * 0.4)} pointerEvents="none" />}
    </g>
  );
};
