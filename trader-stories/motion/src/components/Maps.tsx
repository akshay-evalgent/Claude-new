import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, MultiPolygon } from "geojson";
import landJson from "../data/east-asia-land.json";
import { C, easeInOut, font, prog, rand, sec, SAFE, tone, Tone } from "../theme";
import { Frame } from "./Frame";

// Coastline only. The maps never draw national or provincial borders.
const land = landJson as unknown as Feature<MultiPolygon>;

export type LonLat = [number, number];
export type View = { center: LonLat; scale: number }; // scale: d3 mercator scale (2000 = whole east coast)
export type Pin = { name: string; cjk?: string; at: LonLat; t?: number; tone?: Tone; side?: "left" | "right"; small?: boolean };
export type Route = { path: LonLat[]; t?: number; dur?: number; tone?: Tone; width?: number; dashed?: boolean; label?: string };
export type MapProps = { view: View; zoomTo?: View; zoomAt?: number; zoomFor?: number; pins?: Pin[]; routes?: Route[]; caption?: string; note?: string };

export const CITIES: Record<string, LonLat> = {
  Beijing: [116.40, 39.90], Shanghai: [121.47, 31.23], Ningbo: [121.55, 29.87], Hangzhou: [120.16, 30.27],
  Qingdao: [120.38, 36.07], Shenzhen: [114.06, 22.54], Guangzhou: [113.26, 23.13], Wuhan: [114.30, 30.59],
  Nanjing: [118.80, 32.06], Chengdu: [104.07, 30.67], Tianjin: [117.20, 39.13], Xiamen: [118.09, 24.48],
  Fuzhou: [119.30, 26.08], Shenyang: [123.43, 41.80], Changsha: [112.94, 28.23], Zhengzhou: [113.63, 34.75],
  Xian: [108.94, 34.34], Jinan: [117.00, 36.65], Hefei: [117.23, 31.82], Dalian: [121.61, 38.91],
};
// Approximate ends of the Hangzhou Bay Bridge (sketch-map accuracy)
export const BRIDGE: LonLat[] = [[121.33, 30.20], [121.05, 30.47]];

const lerpView = (a: View, b: View, k: number): View => ({
  center: [a.center[0] + (b.center[0] - a.center[0]) * k, a.center[1] + (b.center[1] - a.center[1]) * k],
  scale: a.scale * Math.pow(b.scale / a.scale, k),
});

export const MapCard: React.FC<MapProps> = ({ view, zoomTo, zoomAt = 0.5, zoomFor = 2.5, pins = [], routes = [], caption, note }) => {
  const frame = useCurrentFrame();
  const k = zoomTo ? interpolate(frame, [sec(zoomAt), sec(zoomAt + zoomFor)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut }) : 0;
  const v = zoomTo ? lerpView(view, zoomTo, k) : view;
  const proj = useMemo(() => geoMercator().center(v.center).scale(v.scale).translate([960, 560]), [v.center[0], v.center[1], v.scale]);
  const d = useMemo(() => geoPath(proj)(land) ?? "", [proj]);

  return (
    <Frame>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <path d={d} fill={C.land} stroke="#4A525B" strokeWidth={1.4} opacity={prog(frame, 0, 20)} />
        {routes.map((r, i) => {
          const pts = r.path.map((ll) => proj(ll)!);
          const segs = pts.slice(1).map((q, j) => Math.hypot(q[0] - pts[j][0], q[1] - pts[j][1]));
          const total = segs.reduce((a, b) => a + b, 0);
          const pr = interpolate(frame, [sec(r.t ?? 0.5), sec((r.t ?? 0.5) + (r.dur ?? 1.2))], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut });
          if (pr <= 0) return null;
          let left = total * pr;
          const shown: [number, number][] = [pts[0] as [number, number]];
          for (let j = 0; j < segs.length && left > 0; j++) {
            const f = Math.min(1, left / segs[j]);
            shown.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * f, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * f]);
            left -= segs[j];
          }
          const col = tone(r.tone, C.paper);
          const mid = shown[Math.floor(shown.length / 2)];
          return (
            <g key={i}>
              <polyline points={shown.map((q) => q.join(",")).join(" ")} fill="none" stroke={col} strokeWidth={r.width ?? 3} strokeDasharray={r.dashed ? "10 10" : undefined} strokeLinecap="round" />
              {r.label && pr >= 1 ? <text x={mid[0] + 18} y={mid[1] - 14} fill={col} fontFamily={font("mono")} fontSize={24} fontWeight={600}>{r.label}</text> : null}
            </g>
          );
        })}
        {pins.map((p, i) => {
          const [x, y] = proj(p.at)!;
          const pr = prog(frame, sec(p.t ?? 0.4 + i * 0.25), 14);
          if (pr <= 0) return null;
          const col = tone(p.tone, C.paper);
          const pulse = (frame % 40) / 40;
          const left = p.side === "left";
          return (
            <g key={i} opacity={pr}>
              {!p.small ? <circle cx={x} cy={y} r={10 + pulse * 26} fill="none" stroke={col} strokeWidth={2} opacity={1 - pulse} /> : null}
              <circle cx={x} cy={y} r={(p.small ? 5 : 9) * pr} fill={col} />
              {!p.small ? (
                <>
                  <text x={x + (left ? -22 : 22)} y={y - 6} textAnchor={left ? "end" : "start"} fill={col} fontFamily={font("display")} fontWeight={700} fontSize={40} letterSpacing={2}>{p.name.toUpperCase()}</text>
                  {p.cjk ? <text x={x + (left ? -22 : 22)} y={y + 34} textAnchor={left ? "end" : "start"} fill={C.muted} fontFamily={font("cjk")} fontWeight={700} fontSize={28}>{p.cjk}</text> : null}
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
      {caption ? <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y - 10, fontFamily: font("display"), fontWeight: 700, fontSize: 48, color: C.paper, letterSpacing: 2, opacity: prog(frame, 4, 16) }}>{caption}</div> : null}
      {note ? <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 50, fontFamily: font("mono"), fontSize: 20, color: C.muted }}>{note}</div> : null}
    </Frame>
  );
};

// ---------------------------------------------------------------- Pin distance
// Abstract street grid with two pins and a measured line. No real street data.
export type PinDistanceProps = { a: string; b: string; distance: string; caption?: string };
export const PinDistance: React.FC<PinDistanceProps> = ({ a, b, distance, caption }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.12]);
  const streets = Array.from({ length: 22 }, (_, i) => ({ v: i % 2 === 0, pos: 60 + i * 88 + rand(i) * 40, w: rand(i + 9) > 0.8 ? 10 : 3 }));
  const A = { x: 760, y: 620 }, B = { x: 1180, y: 470 };
  const line = prog(frame, sec(1.3), 24);
  const pa = prog(frame, sec(0.3), 14), pb = prog(frame, sec(0.8), 14);
  return (
    <Frame>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <svg width={1920} height={1080}>
          {streets.map((s, i) => s.v
            ? <line key={i} x1={s.pos} x2={s.pos + 40} y1={0} y2={1080} stroke={C.slate} strokeWidth={s.w} />
            : <line key={i} x1={0} x2={1920} y1={s.pos * 0.56} y2={s.pos * 0.56 + 20} stroke={C.slate} strokeWidth={s.w} />)}
          <line x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * line} y2={A.y + (B.y - A.y) * line} stroke={C.ochre} strokeWidth={4} strokeDasharray="12 10" />
          {[{ p: A, t: a, o: pa }, { p: B, t: b, o: pb }].map(({ p, t, o }, i) => (
            <g key={i} opacity={o} transform={`translate(${p.x},${p.y - (1 - o) * 30})`}>
              <path d="M0,0 C-22,-30 -22,-58 0,-58 C22,-58 22,-30 0,0Z" fill={C.paper} />
              <circle cx={0} cy={-38} r={8} fill={C.ink} />
              <text x={0} y={-80} textAnchor="middle" fill={C.paper} fontFamily={font("mono")} fontWeight={600} fontSize={28}>{t}</text>
            </g>
          ))}
          {line >= 1 ? <text x={(A.x + B.x) / 2 + 30} y={(A.y + B.y) / 2 + 60} fill={C.ochre} fontFamily={font("display")} fontWeight={700} fontSize={72} opacity={prog(frame, sec(2.1), 12)}>{distance}</text> : null}
        </svg>
      </AbsoluteFill>
      {caption ? <div style={{ position: "absolute", left: SAFE.x, top: SAFE.y - 10, fontFamily: font("display"), fontWeight: 700, fontSize: 48, color: C.paper, letterSpacing: 2 }}>{caption}</div> : null}
      <div style={{ position: "absolute", left: SAFE.x, bottom: SAFE.y - 50, fontFamily: font("mono"), fontSize: 20, color: C.muted }}>Schematic, not to scale</div>
    </Frame>
  );
};
