// Liu Qibing: every graphics shot wired to a template.
// Facts and sources: ../liu-qibing/RESEARCH.md. Prices: COMEX copper futures (Yahoo Finance), US$/tonne.
import shotsJson from "./shots.json";
import copper from "../../data/copper_comex_usd_t.json";
import type { ShotSpec } from "../../registry";
import type { ScoreEntry } from "../../components/Scoreboard";
import type { Point } from "../../components/Charts";
import type { ShotInfo } from "../xu-xiang/film";

export const SHOTS = shotsJson as ShotInfo[];
const startOf = (id: string) => SHOTS.find((s) => s.id === id)!.start;
const CU = copper as unknown as Point[];
const cu = (from: string, to: string): Point[] => CU.filter(([d]) => d >= from && d <= to);
const SRC = "COMEX copper futures, US$ per tonne · Data: Yahoo Finance";
const black = { t: "NumberCard", props: { lines: [] } } as const;

export const GRAPHICS: Record<string, ShotSpec> = {
  "01.01": { t: "NumberCard", props: { lines: [{ text: "LONDON", mode: "type", size: 64, at: 0.2 }, { text: "NOVEMBER 2005", mode: "type", size: 120, at: 0.9 }] } },
  "01.07": { t: "TitleCard", props: { title: "THE TRADER WHO DIDN'T EXIST" } },
  "02.03": { t: "NumberCard", props: { lines: [{ cjk: "中国的李森", cjkSize: 120, text: "CHINA'S LEESON", size: 100 }], caption: "AS THE CHINESE PRESS LATER CALLED HIM" } },
  "02.04": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 606e6, prefix: "−$" }, size: 140, tone: "loss" }], caption: "HIS LOSS ON PAPER, AS FOUND BY THE COURT" } },
  "03.03": { t: "StepFlow", props: { title: "THE STATE RESERVE BUREAU", animateAll: true, steps: [{ label: "Keep strategic stockpiles", sub: "copper, aluminium, zinc" }, { label: "Buy when prices are low" }, { label: "Release when prices spike" }, { label: "Keep the country supplied" }] } },
  "04.02": { t: "LineChart", props: { series: [{ id: "cu", points: cu("2003-01-02", "2004-12-31"), tone: "gain" }], from: "2003-01-02", to: "2004-12-31", yMin: 1300, yMax: 3400, yTicks: [1500, 2000, 2500, 3000], title: "COPPER, 2003–2004", subtitle: SRC, drawFor: 5 } },
  "04.04": { t: "NumberCard", props: { lines: [{ count: { to: 300e6, prefix: "+$" }, size: 140, tone: "gain" }], caption: "REPORTED PROFIT FOR THE STATE, 2002–2004 · POITRAS (2013)" } },
  "04.06": { t: "StepFlow", props: { title: "THE QUIET TRADE", sub: "As described in Poitras, Commodity Risk Management (2013)", animateAll: true, steps: [{ label: "Buy copper in Shanghai", sub: "closed to foreign investors" }, { label: "Sell copper in London" }, { label: "Pocket the gap" }] } },
  "05.02": { t: "NumberCard", props: { lines: [{ text: "THE BOOM HAD GONE TOO FAR.", size: 84 }, { text: "BET ON A FALL.", size: 110, tone: "ochre", at: 1.4 }] } },
  "05.04": { t: "NumberCard", props: { lines: [{ text: "OCTOBER 2004", mode: "type", size: 64 }, { text: "−10% IN A DAY", size: 150, tone: "loss", at: 1.0 }] } },
  "05.05": { t: "StepFlow", props: { title: "SELLING A CALL OPTION", animateAll: true, steps: [{ label: "Collect a small fee now" }, { label: "Promise to sell later at a fixed price" }, { label: "Price stays put", sub: "keep the fee" }, { label: "Price soars", sub: "sell at the old price anyway" }] } },
  "05.06": { t: "NumberCard", props: { lines: [{ text: "NO CEILING", size: 150, tone: "loss" }, { text: "ON HOW MUCH YOU CAN LOSE", size: 56, at: 0.8 }] } },
  "06.01": { t: "StepFlow", props: { title: "BETTING ON A FALL", animateAll: true, steps: [{ label: "Promise copper for a future date" }, { label: "At today's price" }, { label: "Price falls", sub: "buy cheap, deliver, profit" }, { label: "Price rises", sub: "buy dear, or pay to get out" }] } },
  "06.02": { t: "NumberCard", props: { lines: [{ text: "DELIVERY DUE", size: 56, tone: "muted" }, { text: "21 DECEMBER 2005", size: 130, at: 0.6 }] } },
  "06.03": { t: "CompareBars", props: { bars: [
    { label: "LIU'S PROMISE, SUMMER 2005 (REPORTED)", value: 130000, suffix: " t", tone: "loss" },
    { label: "BY SOME REPORTS, LATER", value: 220000, suffix: " t", tone: "loss" },
    { label: "ALL COPPER IN LME WAREHOUSES", value: 140000, suffix: " t" },
  ], fit: 240000, source: "China Daily via the New York Times, Nov 2005; Poitras (2013)" } },
  "06.05": { t: "NumberCard", props: { lines: [{ text: "MORE COPPER THAN", size: 96 }, { text: "THE WHOLE MARKET HAD", size: 96, tone: "loss", at: 0.7 }] } },
  "07.02": { t: "NumberCard", props: { lines: [{ text: "DOES THE BUREAU", size: 96 }, { text: "HAVE THE COPPER?", size: 120, tone: "ochre", at: 0.8 }] } },
  "07.04": { t: "LineChart", props: { series: [{ id: "cu", points: cu("2005-01-03", "2005-10-31"), tone: "loss" }], from: "2005-01-03", to: "2005-10-31", yMin: 2800, yMax: 4400, yTicks: [3000, 3500, 4000],
    title: "COPPER, 2005", subtitle: SRC, drawFor: 6,
    annotations: [{ kind: "level", value: 3500, label: "HIS REPORTED AVERAGE SALE ~$3,500" }, { kind: "marker", date: "2005-10-03", label: "OCTOBER · $4,000+", tone: "loss" }] } },
  "07.06": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 606e6, prefix: "−$" }, size: 140, tone: "loss" }], caption: "PAPER LOSS BY OCTOBER 2005 · COURT FINDING" } },
  "08.02": { t: "MapCard", props: { view: { center: [109, 31], scale: 1500 },
    pins: [{ name: "Beijing", at: [116.40, 39.90], t: 0.3 }, { name: "Yunnan", cjk: "云南", at: [102.71, 25.04], t: 1.2, tone: "ochre", side: "right" }], note: "Schematic" } },
  "09.02": { t: "StepFlow", props: { title: "THE BUREAU'S ANSWERS", sub: "November 2005, as reported", animateAll: true, steps: [{ label: "We don't know him" }, { label: "He is on leave" }, { label: "He acted alone" }] } },
  "09.03": { t: "NumberCard", props: { lines: [{ text: "1,300,000 TONNES", size: 110 }, { text: "WHAT THE BUREAU SAID IT HELD", size: 36, tone: "muted" }, { text: "~250,000", size: 110, tone: "ochre", at: 1.8 }, { text: "WHAT ANALYSTS ESTIMATED", size: 36, tone: "muted", at: 2.0 }] } },
  "09.05": { t: "NumberCard", props: { lines: [{ text: "−$90", size: 170, tone: "loss" }, { text: "IN FIVE MINUTES", size: 70, at: 0.8 }] } },
  "09.06": { t: "LineChart", props: { series: [{ id: "cu", points: cu("2005-06-01", "2005-11-30"), tone: "loss" }], from: "2005-06-01", to: "2005-11-30", yMin: 3000, yMax: 4900, yTicks: [3500, 4000, 4500], holdFrom: "2005-10-31",
    title: "COPPER, NOVEMBER 2005", subtitle: SRC, annotations: [{ kind: "marker", date: "2005-11-16", label: "AUCTIONS BEGIN" }, { kind: "marker", date: "2005-11-21", label: "NEW RECORDS", tone: "loss" }] } },
  "09.07": { t: "NumberCard", props: { lines: [{ text: "THE GREATEST BLUFF", size: 100 }, { text: "OF ALL TIME?", size: 120, tone: "ochre", at: 0.8 }], caption: "A THEORY FROM ONE LONDON ANALYST, NOV 2005" } },
  "09.09": { t: "DocCard", props: { kind: "register", header: "NOVEMBER 2005", rows: [{ label: "UK regulator", value: "Unauthorised trades might not be honoured" }, { label: "The exchange", value: "Then the clearing brokers are liable" }], source: "As summarised in Poitras, Commodity Risk Management (2013)" } },
  "09.11": { t: "QuoteCard", props: { quote: "Most of us don't know the full details or the size of any Chinese positions or if the positions exist at all.", attribution: "Jeremy Goldwyn, Sucden, to the New York Times, November 2005" } },
  "10.03": { t: "LineChart", props: { series: [{ id: "cu", points: cu("2005-06-01", "2006-06-30"), tone: "loss" }], from: "2005-06-01", to: "2006-06-30", yMin: 3000, yMax: 9500, yTicks: [4000, 6000, 8000],
    title: "COPPER KEPT CLIMBING", subtitle: SRC, drawFor: 5, annotations: [{ kind: "marker", date: "2005-12-21", label: "21 DEC · DELIVERY" }, { kind: "marker", date: "2006-05-23", label: "MAY 2006 · ~$8,900", tone: "loss" }] } },
  "10.04": { t: "NumberCard", props: { lines: [{ text: "$606M", size: 120, tone: "loss" }, { text: "→ $144M", size: 140, tone: "ochre", at: 1.2 }], caption: "AFTER DELIVERY, AUCTIONS AND ROLLING FORWARD · ECONOMIC OBSERVER" } },
  "10.05": { t: "NumberCard", props: { lines: [{ count: { to: 920e6, prefix: "¥" }, size: 140, tone: "loss" }], caption: "THE FINAL BILL, AFTER AN EARLIER PROFIT AT HOME" } },
  "11.03": { t: "DocCard", props: { kind: "register", header: "BEIJING No. 1 INTERMEDIATE PEOPLE'S COURT · 2008", rows: [{ label: "Liu Qibing", value: "7 years · abuse of power" }, { label: "His supervisor", value: "6 years · approved, then concealed" }], source: "As reported by the Economic Observer, 30 April 2008" } },
  "11.04": { t: "NumberCard", props: { lines: [{ text: "1997 · ZHUZHOU · ZINC", size: 70, tone: "muted" }, { text: "~¥1.5 BILLION LOST", size: 90, tone: "loss", at: 0.8 }, { text: "16 YEARS", size: 130, at: 1.8 }] } },
  "11.05": { t: "NumberCard", props: { lines: [{ text: "SCAPEGOAT?", mode: "stamp", size: 110, at: 0.6 }, { text: "ROGUE?", mode: "stamp", size: 110, at: 2.6 }] } },
  "12.01": { t: "LineChart", props: { series: [{ id: "cu", points: cu("2003-01-02", "2008-12-31"), tone: "paper" }], from: "2003-01-02", to: "2008-12-31", yMin: 1000, yMax: 9600, yTicks: [2000, 4000, 6000, 8000],
    title: "COPPER, 2003–2008", subtitle: SRC, drawFor: 7,
    annotations: [{ kind: "level", value: 3500, label: "HIS REPORTED AVERAGE SALE ~$3,500" }, { kind: "marker", date: "2005-10-03", label: "OCT 2005 · DETAINED" }, { kind: "marker", date: "2008-12-24", label: "DEC 2008 · ~$2,750", tone: "ochre" }] } },
  "12.02": { t: "NumberCard", props: { lines: [{ text: "RIGHT ABOUT COPPER.", size: 96 }, { text: "THREE YEARS EARLY.", size: 110, tone: "ochre", at: 1.2 }] } },
  "12.05": { t: "NumberCard", props: { align: "left", stagger: 0.25, lines: [
    { text: "SOURCES", size: 48, tone: "ochre" },
    ...["Economic Observer, 30 April 2008 (the verdict)", "China Court website and China Economic Net, April 2008", "New York Times News Service via Taipei Times, 21 November 2005", "Poitras, Commodity Risk Management (Routledge, 2013), via Wikipedia", "South China Morning Post, 2008", "Copper prices: COMEX futures via Yahoo Finance", "Images: FLUX.1-schnell · Voice: Kokoro · Music: original"].map((t) => ({ text: t, size: 32, tone: "paper" as const })),
  ] } },
};

export const SCOREBOARD: ScoreEntry[] = [
  { t: startOf("04.01"), year: "2003", value: "$1,600", label: "COPPER PER TONNE" },
  { t: startOf("04.03"), year: "2004", value: "$3,000", label: "COPPER PER TONNE" },
  { t: startOf("07.01"), year: "SEP 2005", value: "$3,800", label: "COPPER PER TONNE", tone: "loss" },
  { t: startOf("07.05"), year: "OCT 2005", value: "$4,000", label: "COPPER PER TONNE", tone: "loss" },
  { t: startOf("07.07"), year: "OCT 2005", value: "−$606,000,000", label: "HIS PAPER LOSS", tone: "loss" },
  { t: startOf("08.03"), year: "NOV 2005", value: "RECORD HIGHS", label: "COPPER", tone: "loss" },
  { t: startOf("10.01"), year: "DEC 2005", value: "50,000 T", label: "DELIVERED IN KOREA" },
  { t: startOf("11.01"), year: "2008", value: "7 YEARS", label: "HIS SENTENCE" },
  { t: startOf("12.03"), year: "DEC 2008", value: "$2,750", label: "COPPER PER TONNE", tone: "ochre" },
  { t: startOf("12.05"), hidden: true },
];

const TAGS = new Set(["RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY", "REPORTED"]);
export const OVERLAYS: Record<string, ShotSpec> = Object.fromEntries(
  SHOTS.filter((s) => s.family === "SCENE" && (s.onScreen || s.tag)).map((s) => [
    s.id, { t: "SceneOverlay", props: { tag: s.tag || undefined, caption: s.onScreen && !TAGS.has(s.onScreen) ? s.onScreen : undefined } },
  ]),
);
