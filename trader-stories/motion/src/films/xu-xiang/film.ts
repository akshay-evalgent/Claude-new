// Xu Xiang: every graphics shot wired to a template.
// Shot ids and lengths come from ../xu-xiang/shots.csv (npm run data).
// Facts, figures and their sources are in ../xu-xiang/RESEARCH.md.
import shotsJson from "./shots.json";
import shc from "../../data/shc.json";
import type { ShotSpec } from "../../registry";
import type { ScoreEntry } from "../../components/Scoreboard";
import type { Point } from "../../components/Charts";
import { BRIDGE, CITIES } from "../../components/Maps";
import { rand } from "../../theme";

export type ShotInfo = { id: string; section: number; family: string; seconds: number; start: number; image: string; onScreen: string; tag: string };
export const SHOTS = shotsJson as ShotInfo[];
const startOf = (id: string) => SHOTS.find((s) => s.id === id)!.start;

// ---- data helpers ------------------------------------------------------------
const CLOSES = (shc as unknown as { closes: Point[] }).closes;
const index = (from: string, to: string): Point[] => CLOSES.filter(([d]) => d >= from && d <= to);
const rebased = (from: string, to: string): Point[] => {
  const pts = index(from, to);
  return pts.map(([d, v]) => [d, Math.round((v / pts[0][1]) * 1000) / 10]);
};
/** An ILLUSTRATIVE line between two reported endpoints: same dates as the index, smooth noise. */
const illustrative = (seed: number, from: string, to: string, endPct: number, wobble = 0.04): Point[] => {
  const dates = index(from, to).map(([d]) => d);
  const n = dates.length - 1;
  return dates.map((d, i) => {
    const k = i / n;
    const v = 100 * Math.pow(1 + endPct / 100, k) * (1 + (rand(seed * 1000 + i) - 0.5) * wobble * Math.sin(Math.PI * k));
    return [d, Math.round(v * 10) / 10];
  });
};

const NYT = "Source: New York Times Magazine";
const IDX = "Shanghai Composite, daily closes · Data: Sina Finance";

// shared crash chart, May to September 2015 (section 7 shots continue one line)
const crash = {
  series: [{ id: "idx", points: index("2015-05-04", "2015-09-30"), tone: "loss" }],
  from: "2015-05-04", to: "2015-09-30", yMin: 2700, yMax: 5400, yTicks: [3000, 4000, 5000],
  title: "SHANGHAI COMPOSITE, 2015", source: IDX,
};

// ---- shots --------------------------------------------------------------------
const steps5 = [
  { label: "Pick a cheap stock", sub: "nobody is watching" },
  { label: "One enormous buy order", sub: "out of nowhere" },
  { label: "Others pile in", sub: "limit up" },
  { label: "Next morning", sub: "limit up again" },
  { label: "Sell to latecomers", sub: "a few days later" },
];
const court4 = [
  { label: "Company puts out good news" },
  { label: "Xu buys heavily", sub: "price climbs" },
  { label: "Retail investors rush in" },
  { label: "Xu and executives sell" },
];
const courtTitle = { title: "THE COURT'S FINDING", sub: "With executives at 13 listed companies, 2010–2015" };
const loop5 = [
  { label: "Buy a real stake" }, { label: "Allies onto the board" }, { label: "Company pays out cash" },
  { label: "Cash buys more shares" }, { label: "Sell into the rise" },
];
const notice = {
  kind: "notice", header: "NINGBO HIGHWAY POLICE · SUNDAY 1 NOV 2015 · 10:33",
  title: "“Sudden traffic control”",
  body: "Expressway entrances and exits at the Hangzhou Bay Bridge closed.",
  source: "Reconstruction from the New York Times Magazine's account, not the original post",
};
const black = { t: "NumberCard", props: { lines: [] } } as const;
const zexiChars = { t: "NumberCard", props: { lines: [{ cjk: "泽　熙", cjkSize: 180, text: "ZE · XI", size: 84 }, { text: "MAO ZEDONG · EMPEROR KANGXI", size: 40, tone: "muted" }] } } as const;
const fundList = { kind: "list", header: "ZEXI FUND No. 1 · MARCH 2010 · ¥1,000,000,000", title: "Fewer than 200 investors", lines: 8 };

export const GRAPHICS: Record<string, ShotSpec> = {
  // 1. Cold open
  "01.01": { t: "NumberCard", props: { lines: [{ text: "SUNDAY 1 NOV 2015", mode: "type", size: 64, at: 0.2 }, { text: "10:33", mode: "type", size: 170, at: 1.4 }] } },
  "01.02": { t: "DocCard", props: notice },
  "01.07": { t: "LineChart", props: {
    series: [{ id: "idx", points: rebased("2015-01-05", "2015-10-30"), tone: "loss", label: "MARKET" }],
    from: "2015-01-05", to: "2015-10-30", yMin: 70, yMax: 520, log: true, yTicks: [100, 200, 400],
    title: "2015", subtitle: "Shanghai Composite, rebased to 100 · Data: Sina Finance", drawFor: 5.5 } },
  "01.08": { t: "LineChart", props: {
    series: [
      { id: "idx", points: rebased("2015-01-05", "2015-10-30"), tone: "loss", label: "MARKET", drawFor: 0.01, delay: 0 },
      { id: "fund", points: illustrative(1, "2015-01-05", "2015-10-30", 357, 0.06), tone: "gain", width: 6, label: "+357%", drawFor: 3 },
    ],
    from: "2015-01-05", to: "2015-10-30", yMin: 70, yMax: 520, log: true, yTicks: [100, 200, 400], title: "2015",
    illustrative: "Fund line: shape illustrative. Reported: best Zexi fund +357% for the year (NYT)" } },
  "01.10": black,
  "01.11": { t: "TitleCard", props: { title: "THE MAN WHO ALWAYS KNEW FIRST" } },
  // 2. The legend
  "02.02": { t: "NumberCard", props: { lines: [{ cjk: "私募一哥", cjkSize: 120, text: "HEDGE FUND BROTHER No. 1", size: 92 }] } },
  "02.07": { t: "QuoteCard", props: { quote: "Xu Xiang is always trading. If he's not trading, he's thinking about trading.", attribution: "a longtime friend, to the New York Times Magazine" } },
  "02.08": { t: "CompareBars", props: {
    bars: [{ label: "ZEXI FUND No. 1", value: 3270, tone: "gain", prefix: "+", suffix: "%" }, { label: "SHANGHAI INDEX", value: 11.6, tone: "paper", prefix: "+", suffix: "%", decimals: 1 }],
    fit: 420, title: "MARCH 2010 – OCTOBER 2015", source: NYT } },
  // 3. Origin
  "03.01": { t: "NumberCard", props: { lines: [{ text: "1990", size: 260, at: 0.05 }] } },
  "03.03": { t: "MapCard", props: {
    view: { center: [120.6, 30.6], scale: 2200 }, zoomTo: { center: [121.3, 30.6], scale: 7000 }, zoomAt: 0.2, zoomFor: 3,
    pins: [{ name: "Shanghai", cjk: "上海", at: CITIES.Shanghai, t: 0.5 }, { name: "Ningbo", cjk: "宁波", at: CITIES.Ningbo, t: 1.6, tone: "ochre" }],
    routes: [{ path: [CITIES.Shanghai, CITIES.Ningbo], t: 1.0, dur: 0.8, dashed: true, tone: "muted", width: 2 }] } },
  "03.12": { t: "NumberCard", props: { lines: [{ text: "1993", size: 280, at: 1.2 }] } },
  // 4. The hall
  "04.04": { t: "LineChart", props: {
    series: [{ id: "idx", points: index("1991-06-03", "1994-09-30"), tone: "paper" }],
    from: "1991-06-03", to: "1994-09-30", yMin: 0, yMax: 1700, yTicks: [500, 1000, 1500], style: "chalk", drawFor: 8,
    title: "SHANGHAI INDEX, 1991–1994", source: IDX,
    annotations: [
      { kind: "bracket", from: "1991-12-31", to: "1992-12-31", label: "+167%", tone: "gain" },
      { kind: "bracket", from: "1993-04-28", to: "1994-07-29", label: "−76%", tone: "loss" },
    ] } },
  "04.08": { t: "NumberCard", props: { lines: [{ text: "BUY FAST.", at: 2.6 }, { text: "SELL FAST.", at: 3.4 }, { text: "ALWAYS GO BIG.", at: 4.3, tone: "ochre" }] } },
  // 5. The method
  "05.01": { t: "LimitDiagram", props: { days: ["up"], drawFor: 1.4 } },
  "05.02": { t: "LimitDiagram", props: { days: ["up"], startDrawn: 1, label: "+10% DAILY LIMIT" } },
  "05.03": { t: "LimitDiagram", props: { days: ["up"], startDrawn: 1, label: "+10% DAILY LIMIT" } },
  "05.04": { t: "OrderQueue", props: {} },
  "05.05": { t: "OrderQueue", props: { queue: true } },
  "05.07": { t: "StepFlow", props: { steps: steps5, upTo: 0, title: "THE DEATH SQUAD METHOD" } },
  "05.08": { t: "StepFlow", props: { steps: steps5, upTo: 1, title: "THE DEATH SQUAD METHOD" } },
  "05.09": { t: "StepFlow", props: { steps: steps5, upTo: 2, title: "THE DEATH SQUAD METHOD" } },
  "05.10": { t: "StepFlow", props: { steps: steps5, upTo: 3, title: "THE DEATH SQUAD METHOD" } },
  "05.11": { t: "StepFlow", props: { steps: steps5, upTo: 4, title: "THE DEATH SQUAD METHOD" } },
  "05.12": { t: "LimitDiagram", props: { days: ["up", "up", "up", "fall", "fall"], startDrawn: 3, label: "LIMIT UP",
    marks: [{ day: 0, text: "SQUAD BUYS", tone: "ochre" }, { day: 3, text: "SQUAD HAS SOLD", tone: "ochre" }] } },
  "05.13": { t: "DocCard", props: { kind: "headline", cjk: "涨停板敢死队", title: "THE LIMIT-UP DEATH SQUAD", lines: 5, source: "Nickname as reported in the Chinese press" } },
  "05.15": { t: "MapCard", props: {
    view: { center: [114.5, 31.5], scale: 1450 },
    pins: [
      ...["Beijing", "Shenzhen", "Guangzhou", "Wuhan", "Chengdu", "Nanjing", "Tianjin", "Xiamen", "Shenyang", "Changsha", "Zhengzhou", "Xian", "Jinan", "Hefei", "Dalian", "Fuzhou", "Qingdao", "Hangzhou"]
        .map((c, i) => ({ name: c, at: CITIES[c], t: 1.0 + i * 0.28, small: true, tone: "paper" })),
      { name: "Ningbo", cjk: "宁波", at: CITIES.Ningbo, t: 0.4, tone: "ochre" },
    ],
    routes: ["Beijing", "Shenzhen", "Guangzhou", "Wuhan", "Chengdu", "Nanjing", "Tianjin", "Xiamen", "Shenyang", "Changsha", "Zhengzhou", "Xian", "Jinan", "Hefei", "Dalian", "Fuzhou", "Qingdao", "Hangzhou"]
      .map((c, i) => ({ path: [CITIES[c], CITIES.Ningbo], t: 1.1 + i * 0.28, dur: 0.7, tone: "ochre", width: 1.5 })),
    note: "Schematic" } },
  "05.20": { t: "DocCard", props: { kind: "headline", header: "CHINA SECURITIES JOURNAL · 2003", lines: 9, source: "Article reported by the New York Times Magazine. Its text is not reproduced" } },
  "05.24": { t: "NumberCard", props: { lines: [{ count: { from: 1, to: 7, suffix: " DAYS" }, size: 170, at: 0 }] } },
  "05.27": { t: "NumberCard", props: { lines: [{ text: "2005", size: 220 }, { text: "HUNDREDS OF MILLIONS OF YUAN", size: 56, tone: "ochre" }] } },
  // 6. Zexi
  "06.03": { t: "DocCard", props: { kind: "register", header: "COMPANY REGISTRATION", rows: [
    { label: "Name", value: "Zexi Investment · 泽熙投资" }, { label: "Founded", value: "7 December 2009" }, { label: "Capital", value: "¥30,000,000" }] } },
  "06.04": zexiChars,
  "06.05": zexiChars,
  "06.06": { t: "DocCard", props: { ...fundList, redact: true } },
  "06.07": { t: "DocCard", props: { ...fundList, redactDone: true } },
  "06.12": { t: "StepFlow", props: { steps: loop5, upTo: 0, layout: "loop", centre: "ZEXI" } },
  "06.14": { t: "StepFlow", props: { steps: loop5, upTo: 4, animateFrom: 2, layout: "loop", centre: "ZEXI" } },
  "06.15": { t: "NodeWeb", props: { count: 45, centre: "ZEXI", counterLabel: "COMPANIES, 2010–2014", fillFor: 3 } },
  "06.16": { t: "NodeWeb", props: { count: 45, centre: "ZEXI", counterLabel: "COMPANIES, 2010–2014", fillFor: 0.2, highlight: { indices: [4, 13], label: "HIS PARENTS: EXECUTIVES AND SHAREHOLDERS", at: 0.8 } } },
  "06.17": { t: "CompareBars", props: { bars: [{ label: "ONE ZEXI FUND, 2011–2014", value: 536, tone: "gain", prefix: "+", suffix: "%" }], fit: 620, source: "Source: Caixin" } },
  "06.18": { t: "RankList", props: { mode: "scrollTo", total: 400, rank: 188, label: "XU XIANG", value: "$2.2 BILLION", title: "HURUN CHINA RICH LIST, 2015", showTotal: false, source: "Source: Hurun, via the New York Times Magazine" } },
  "06.19": { t: "DocCard", props: { ...fundList, redactDone: true, tag: "UNPROVEN" } },
  "06.21": { t: "PinDistance", props: { a: "ZEXI, BEIJING", b: "STOCK REGULATOR", distance: "< 0.5 MILES", caption: "NOVEMBER 2014" } },
  // 7. The crash
  "07.01": { t: "LimitDiagram", props: { days: ["down"], drawFor: 1.4, label: "−10% DAILY LIMIT" } },
  "07.02": { t: "LineChart", props: { ...crash, drawTo: "2015-06-19", drawFor: 4.5, annotations: [{ kind: "marker", date: "2015-06-12", label: "12 JUNE · PEAK" }] } },
  "07.03": { t: "LineChart", props: { ...crash, holdFrom: "2015-06-19", drawTo: "2015-07-08", drawFor: 2,
    annotations: [{ kind: "marker", date: "2015-06-12", label: "12 JUNE · PEAK" }, { kind: "bracket", from: "2015-06-12", to: "2015-07-08", label: "−32%" }] } },
  "07.08": { t: "LineChart", props: { ...crash, holdFrom: "2015-07-08", drawTo: "2015-07-24", drawFor: 1.3, annotations: [{ kind: "bracket", from: "2015-06-12", to: "2015-07-08", label: "−32%" }] } },
  "07.09": { t: "LineChart", props: { ...crash, holdFrom: "2015-07-24", drawTo: "2015-07-28", drawFor: 1.2, annotations: [{ kind: "marker", date: "2015-07-27", label: "27 JULY · −8.5%", tone: "loss" }] } },
  "07.10": { t: "LineChart", props: { ...crash, holdFrom: "2015-07-28", drawTo: "2015-08-26", drawFor: 2.5, annotations: [
    { kind: "marker", date: "2015-07-27", label: "27 JULY · −8.5%", tone: "loss" }, { kind: "marker", date: "2015-08-24", label: "24 AUGUST · −8.5%", tone: "loss" }] } },
  "07.06": { t: "NumberCard", props: { lines: [{ text: "SELLING BANNED", mode: "stamp", size: 100, at: 2.4 }, { text: "LISTINGS FROZEN", mode: "stamp", size: 100, at: 4.0 }, { text: "STATE FIRMS: BUY", mode: "stamp", size: 100, at: 5.4 }] } },
  "07.12": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 5e12, prefix: "−$" }, size: 128, tone: "loss" }], caption: "LOST IN ABOUT TEN WEEKS" } },
  "07.13": black,
  "07.14": { t: "LineChart", props: {
    series: [
      { id: "idx", points: rebased("2015-06-12", "2015-07-03"), tone: "loss", label: "MARKET", drawFor: 4 },
      ...[24, 31, 38, 45, 52].map((e, i) => ({ id: `f${i}`, points: illustrative(10 + i, "2015-06-12", "2015-07-03", e, 0.05), tone: "gain", width: 3, delay: 0.6 + i * 0.25, drawFor: 4 })),
    ],
    from: "2015-06-12", to: "2015-07-03", yMin: 60, yMax: 165, yTicks: [80, 100, 120, 140], title: "12 JUNE – 3 JULY 2015", subtitle: "Rebased to 100",
    illustrative: "Fund lines: shapes and end points illustrative. Reported: all five public Zexi funds up at least 20% (NYT)" } },
  "07.15": { t: "RankList", props: { mode: "climb", total: 1649, rank: 1, label: "ZEXI'S BEST FUND", value: "+357%", title: "CHINESE HEDGE FUNDS, 2015", tone: "gain", source: NYT } },
  "07.16": { t: "LineChart", props: { ...crash, holdFrom: "2015-09-30", annotations: [
    { kind: "marker", date: "2015-06-10", label: "OUT?", tone: "ochre" }, { kind: "marker", date: "2015-07-24", label: "OUT?", tone: "ochre" }, { kind: "marker", date: "2015-08-19", label: "OUT?", tone: "ochre" }],
    illustrative: "Timing illustrative. Reported only that his funds 'seemed to exit' before the falls (NYT)" } },
  "07.22": { t: "DocCard", props: { kind: "phones", tag: "ALLEGATION", source: "Anonymous post, September 2015. Zexi denied it" } },
  "07.23": { t: "NumberCard", props: { lines: [{ text: "ZEXI DENIED THE CLAIM.", size: 84 }, { text: "NO COURT RULED ON IT.", size: 84, tone: "muted" }] } },
  "07.25": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 9, prefix: "+", suffix: " DAYS" }, size: 170 }] } },
  // 8. The bridge
  "08.10": { t: "MapCard", props: {
    view: { center: [121.25, 30.45], scale: 9000 }, zoomTo: { center: [121.25, 30.35], scale: 15000 }, zoomAt: 0.2, zoomFor: 2.8,
    pins: [{ name: "Ningbo", at: CITIES.Ningbo, t: 0.2, side: "right" }, { name: "Shanghai", at: CITIES.Shanghai, t: 0.3 }],
    routes: [
      { path: [CITIES.Ningbo, BRIDGE[0]], t: 0.5, dur: 0.6, tone: "paper", width: 4 },
      { path: [BRIDGE[0], BRIDGE[1]], t: 1.1, dur: 0.8, tone: "ochre", width: 7, label: "HANGZHOU BAY BRIDGE · 35.4 KM" },
      { path: [BRIDGE[1], CITIES.Shanghai], t: 1.9, dur: 0.7, tone: "paper", width: 4, dashed: true },
    ], caption: "G15 EXPRESSWAY", note: "Schematic: route and bridge position approximate" } },
  "08.11": { t: "DocCard", props: notice },
  "08.14": black,
  "08.17": { t: "DocCard", props: { kind: "bubbles", bubbles: [{ text: "That coat looks like a doctor's." }, { text: "So was he arrested for practising medicine without a licence?" }], source: "Online jokes as reported by the South China Morning Post, paraphrased" } },
  // 9. The answer
  "09.02": { t: "NumberCard", props: { lines: [{ cjk: "失联", cjkSize: 170, text: "SHILIAN", size: 96 }, { text: "LOST CONTACT", size: 56, tone: "muted", mode: "type", at: 1.6 }] } },
  "09.06": { t: "NumberCard", props: { lines: [{ text: "HOW DID HE ALWAYS KNOW?", size: 110 }] } },
  "09.07": { t: "StepFlow", props: { steps: court4, upTo: -1, ...courtTitle } },
  "09.08": { t: "StepFlow", props: { steps: court4, upTo: 0, ...courtTitle } },
  "09.09": { t: "StepFlow", props: { steps: court4, upTo: 1, ...courtTitle } },
  "09.10": { t: "StepFlow", props: { steps: court4, upTo: 2, ...courtTitle } },
  "09.11": { t: "StepFlow", props: { steps: court4, upTo: 3, ...courtTitle } },
  "09.12": { t: "NumberCard", props: { lines: [{ text: "HE KNEW FIRST", size: 110 }, { text: "BECAUSE HE ARRANGED WHAT THERE WAS TO KNOW.", size: 50, tone: "ochre", at: 1.4 }] } },
  "09.13": { t: "StepFlow", props: { title: "SAME TRICK", rows: [
    { title: "1990s · THE CHALK HALL", upTo: 4, steps: [{ label: "Pick a stock" }, { label: "Huge buy order" }, { label: "Crowd piles in" }, { label: "Limit up again" }, { label: "Sell to latecomers" }] },
    { title: "2010s · ZEXI", upTo: 3, steps: court4.map((s) => ({ label: s.label })) },
  ] } },
  "09.14": { t: "NumberCard", props: { lines: [{ text: "SAME TRICK.", size: 120 }, { text: "BIGGER SIZE.", size: 120, tone: "ochre" }] } },
  "09.15": { t: "NumberCard", props: { lines: [{ text: "23 JANUARY 2017", mode: "type", size: 56, at: 0.2 }, { text: "5½ YEARS", size: 220, at: 1.8 }] } },
  "09.16": { t: "NumberCard", props: { lines: [
    { count: { to: 11e9, prefix: "¥" }, size: 140, tone: "loss", at: 0.4 }, { text: "≈ $1.6 BILLION", size: 72, at: 3.0 },
    { text: "REPORTED AS THE LARGEST FINE ON ONE PERSON FOR A FINANCIAL CRIME IN CHINA", size: 28, tone: "muted", at: 5.5 }] } },
  // 10. The reckoning
  "10.01": black,
  "10.05": { t: "QuoteCard", props: { attribution: "a fund manager, to the New York Times Magazine" } },
  "10.07": { t: "NumberCard", props: { lines: [{ text: "BOTH OF THOSE CAN BE TRUE.", size: 96 }] } },
  "10.10": { t: "NumberCard", props: { lines: [{ count: { to: 20e9, prefix: "¥" }, size: 130 }, { text: "FROZEN", size: 64, tone: "muted", at: 1.6 }], caption: "ABOUT, AS REPORTED" } },
  "10.11": { t: "DocCard", props: { kind: "register", header: "INDUSTRY BLACKLIST · JUNE 2017", rows: [{ label: "Person", value: "Xu Xiang" }, { label: "Firm", value: "Shanghai Zexi Investment" }],
    stamp: { text: "BARRED", at: 1.6 }, source: "Asset Management Association of China, via Caixin" } },
  // 12. Epilogue
  "12.02": { t: "NumberCard", props: { lines: [{ text: "FINE: REPORTED UNPAID", mode: "type", size: 76 }] } },
  "12.03": { t: "QuoteCard", props: { quote: "In China, the losing side doesn't get to sleep at night.", attribution: "a Beijing fund manager, to the New York Times Magazine" } },
  "12.06": { t: "NumberCard", props: { align: "left", stagger: 0.25, lines: [
    { text: "SOURCES", size: 48, tone: "ochre" },
    ...["New York Times Magazine, “The Fall of China's Hedge-Fund King”, 2016", "Caixin, 2015–2021", "Bloomberg · South China Morning Post · Associated Press", "Index data: Sina Finance", "Illustrations: generated with FLUX.1-schnell"].map((t) => ({ text: t, size: 36, tone: "paper" as const })),
  ] } },
};

// ---- scoreboard: one overlay for the whole film ------------------------------
export const SCOREBOARD: ScoreEntry[] = [
  { t: startOf("02.01"), year: "2015", value: "¥28,000,000,000", label: "UNDER HIS CONTROL" },
  { t: startOf("03.01"), year: "1990", value: "¥0", label: "HIS MONEY" },
  { t: startOf("03.12"), year: "1993", value: "¥30,000", label: "BORROWED FROM HIS PARENTS" },
  { t: startOf("05.27"), year: "2005", value: "HUNDREDS OF MILLIONS", label: "HIS MONEY, YUAN" },
  { t: startOf("06.06"), year: "2010", value: "¥1,000,000,000", label: "HIS FIRST FUND" },
  { t: startOf("07.12"), year: "SUMMER 2015", value: "−$5,000,000,000,000", label: "THE MARKET", tone: "loss" },
  { t: startOf("09.15"), year: "2017", value: "¥11,000,000,000", label: "FINE, AS REPORTED", tone: "loss" },
  { t: startOf("12.01"), year: "2021", value: "REPORTED UNPAID", label: "THE FINE" },
  { t: startOf("12.06"), hidden: true },
];
export const FILM_SECONDS = SHOTS.reduce((a, s) => a + s.seconds, 0);

// ---- overlays for generated shots: tag (DRAMATISED, RUMOUR...) and caption, from shots.csv
const TAGS = new Set(["RUMOUR", "UNPROVEN", "ALLEGATION"]);
export const OVERLAYS: Record<string, ShotSpec> = Object.fromEntries(
  SHOTS.filter((s) => s.family === "SCENE" && (s.onScreen || s.tag)).map((s) => [
    s.id, { t: "SceneOverlay", props: { tag: s.tag || undefined, caption: s.onScreen && !TAGS.has(s.onScreen) ? s.onScreen : undefined } },
  ]),
);
