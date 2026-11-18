// Ginzō Korekawa: every graphics shot wired to a template.
// Shot ids and lengths come from ../korekawa/shots.csv and timing.json (npm run data).
// Facts and their sources are in ../korekawa/RESEARCH.md.
import shotsJson from "./shots.json";
import type { ShotSpec } from "../../registry";
import type { ScoreEntry } from "../../components/Scoreboard";
import type { Point } from "../../components/Charts";
import type { LonLat } from "../../components/Maps";
import { rand } from "../../theme";
import type { ShotInfo } from "../xu-xiang/film";

export const SHOTS = shotsJson as ShotInfo[];
const startOf = (id: string) => SHOTS.find((s) => s.id === id)!.start;

const P: Record<string, LonLat> = {
  Ako: [134.40, 34.75], Kobe: [135.19, 34.69], Osaka: [135.50, 34.69], Dalian: [121.61, 38.91], Qingdao: [120.38, 36.07],
  Korea: [129.17, 37.45], Hishikari: [130.66, 32.02],
};

/** Sumitomo Metal Mining, 1981-82: an ILLUSTRATIVE path through the four reported prices only. */
const ANCHORS: [string, number][] = [["1981-08-03", 215], ["1981-08-14", 203], ["1981-09-18", 226], ["1982-01-06", 705], ["1982-04-20", 1230]];
const sumitomo: Point[] = (() => {
  const out: Point[] = [];
  const t = (d: string) => Date.parse(d + "T00:00:00Z");
  for (let ms = t(ANCHORS[0][0]); ms <= t(ANCHORS[ANCHORS.length - 1][0]); ms += 864e5) {
    const day = new Date(ms).getUTCDay();
    if (day === 0 || day === 6) continue;
    let k = 0;
    while (k < ANCHORS.length - 2 && ms > t(ANCHORS[k + 1][0])) k++;
    const [d0, v0] = ANCHORS[k], [d1, v1] = ANCHORS[k + 1];
    const f = (ms - t(d0)) / (t(d1) - t(d0));
    const v = Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * f) * (1 + (rand(ms / 864e5) - 0.5) * 0.05 * Math.sin(Math.PI * f));
    out.push([new Date(ms).toISOString().slice(0, 10), Math.round(v)]);
  }
  return out;
})();
const priceChart = {
  series: [{ id: "smm", points: sumitomo, tone: "gain" }],
  from: "1981-08-03", to: "1982-04-30", yMin: 0, yMax: 1400, yTicks: [200, 600, 1000],
  title: "SUMITOMO METAL MINING SHARES",
  illustrative: "Path illustrative. Reported prices: ¥203 (Aug 1981), ¥226 (18 Sep), limit up at ¥705 (New Year), ¥1,230 (Apr 1982)",
};
const markers = [
  { kind: "marker", date: "1981-09-18", label: "18 SEP · ¥226" },
  { kind: "marker", date: "1982-01-06", label: "NEW YEAR · LIMIT UP ¥705", tone: "gain" },
];
const black = { t: "NumberCard", props: { lines: [] } } as const;
const rank = { t: "RankList", props: { mode: "climb", total: 100, rank: 1, label: "GINZŌ KOREKAWA", value: "No. 1", title: "JAPAN'S TOP TAXPAYERS · 1983 LIST", showTotal: false, tone: "ochre", source: "Korekawa Scholarship Foundation; NEWS Post Seven" } } as const;

export const GRAPHICS: Record<string, ShotSpec> = {
  "01.01": { t: "NumberCard", props: { lines: [{ text: "OSAKA", mode: "type", size: 64, at: 0.2 }, { text: "18 SEPTEMBER 1981", mode: "type", size: 110, at: 0.9 }] } },
  "01.08": black,
  "01.09": { t: "TitleCard", props: { title: "THE LAST SPECULATOR" } },
  "02.02": { t: "NumberCard", props: { lines: [{ cjk: "最後の相場師", cjkSize: 120, text: "THE LAST SPECULATOR", size: 92 }] } },
  "02.05": rank,
  "02.07": { t: "NumberCard", props: { lines: [{ text: "A FORTUNE AT 84.", size: 110 }, { text: "GONE BY 94.", size: 110, tone: "loss", at: 1.4 }] } },
  "02.08": { t: "NumberCard", props: { lines: [{ text: "1897", size: 260, at: 0.05 }] } },
  "03.05": { t: "MapCard", props: {
    view: { center: [128.5, 36.6], scale: 1500 },
    pins: [{ name: "Kobe", at: P.Kobe, t: 0.3 }, { name: "Dalian", cjk: "大连", at: P.Dalian, t: 1.5, tone: "ochre", side: "left" }, { name: "Qingdao", at: P.Qingdao, t: 2.4, side: "left" }],
    routes: [{ path: [P.Kobe, [131, 33.6], [125.5, 35.2], P.Dalian], t: 0.5, dur: 1.2, dashed: true, tone: "muted", width: 2 }], note: "Schematic" } },
  "03.09": { t: "CompareBars", props: { bars: [{ label: "WHAT THE COIN WAS WORTH AS MONEY", value: 1, suffix: "×" }, { label: "WHAT THE METAL IN IT WAS WORTH", value: 2, prefix: ">", suffix: "×", tone: "gain" }], fit: 2.6, source: "As told by his biographer" } },
  "04.10": { t: "CycleWave", props: { title: "THE CYCLE" } },
  "05.03": { t: "NumberCard", props: { lines: [{ count: { from: 70, to: 7000, prefix: "¥" }, size: 180, tone: "gain" }], caption: "×100 IN 1931" } },
  "05.06": { t: "NumberCard", props: { align: "left", lines: [{ text: "1 · CHOOSE YOUR OWN STOCKS", size: 72, at: 0.8 }, { text: "2 · FORECAST YEARS AHEAD", size: 72, at: 2.4 }, { text: "3 · NEVER CHASE A PRICE", size: 72, at: 3.8, tone: "ochre" }], caption: "AS LATER WRITERS SUMMED THEM UP" } },
  "05.07": { t: "NumberCard", props: { lines: [{ cjk: "亀の三原則", cjkSize: 130, text: "THE TURTLE'S THREE RULES", size: 84 }] } },
  "05.09": { t: "StepFlow", props: { title: "A FUTURES BATTLE", animateAll: true, steps: [{ label: "Two sides bet against each other" }, { label: "One pulls ahead" }, { label: "Settle", sub: "take the gains" }, { label: "Or fight on" }] } },
  "05.11": { t: "NumberCard", props: { lines: [{ text: "+¥3,000,000 AHEAD", size: 100, tone: "gain" }, { text: "→ A LOSS", size: 130, tone: "loss", at: 1.0 }], caption: "COTTON FUTURES, 1935 · PER HIS BIOGRAPHER" } },
  "06.01": { t: "MapCard", props: {
    view: { center: [132, 36.2], scale: 2300 },
    pins: [{ name: "Osaka", at: P.Osaka, t: 0.3 }, { name: "Korea", cjk: "三陟", at: P.Korea, t: 1.4, tone: "ochre", side: "left" }],
    routes: [{ path: [P.Osaka, [132.5, 35.8], P.Korea], t: 0.6, dur: 1.0, dashed: true, tone: "muted", width: 2 }], note: "Schematic" } },
  "07.03": { t: "NumberCard", props: { lines: [{ count: { to: 300e6, prefix: "¥" }, size: 150 }], caption: "FROM LAND ON THE EDGE OF OSAKA · 1965" } },
  "07.06": { t: "CompareBars", props: { bars: [{ label: "PUT INTO NIHON CEMENT, 1976", value: 300, prefix: "¥", suffix: "M" }, { label: "GAIN BY 1977", value: 3000, prefix: "¥", suffix: "M", tone: "gain" }], fit: 3300, source: "Korekawa Scholarship Foundation timeline" } },
  "08.02": { t: "MapCard", props: {
    view: { center: [133.6, 33.8], scale: 3000 }, zoomTo: { center: [131.6, 32.6], scale: 6000 }, zoomAt: 0.3, zoomFor: 2.5,
    pins: [{ name: "Osaka", at: P.Osaka, t: 0.2 }, { name: "Hishikari", cjk: "菱刈", at: P.Hishikari, t: 1.6, tone: "ochre", side: "left" }],
    routes: [{ path: [P.Osaka, [133, 33.4], P.Hishikari], t: 0.6, dur: 1.2, dashed: true, tone: "muted", width: 2 }], note: "Schematic" } },
  "08.04": { t: "NumberCard", props: { lines: [{ text: "A FEW GRAMS", size: 92, tone: "muted" }, { text: "PER TONNE · A TYPICAL GOLD MINE", size: 34, tone: "muted" }, { text: "~40 GRAMS", size: 140, tone: "ochre", at: 1.8 }, { text: "PER TONNE · HISHIKARI", size: 34, tone: "muted", at: 2.0 }] } },
  "08.05": { t: "NumberCard", props: { lines: [{ text: "SUMITOMO METAL MINING", size: 96, mode: "type" }], caption: "HELD THE MINING RIGHTS" } },
  "08.06": { t: "StepFlow", props: { animateAll: true, steps: [{ label: "Rich gold found" }, { label: "The mine is worth more" }, { label: "The company is worth more" }, { label: "The shares", sub: "barely moved" }] } },
  "08.07": { t: "NumberCard", props: { lines: [{ text: "SUMITOMO METAL MINING", size: 44, tone: "muted" }, { text: "¥226", size: 230, at: 0.5 }], caption: "18 SEPTEMBER 1981 · AS REPORTED" } },
  "08.14": { t: "NumberCard", props: { lines: [{ text: "BUYING ON MARGIN", size: 100 }, { text: "IF THE PRICE FALLS FAR ENOUGH, THE BROKER SELLS YOU OUT", size: 40, tone: "loss", at: 1.6 }] } },
  "08.15": { t: "NumberCard", props: { lines: [{ text: "ONE OF THE LARGEST", size: 100 }, { text: "SHAREHOLDERS", size: 100, tone: "ochre", at: 0.6 }], caption: "SPRING 1982" } },
  "08.16": { t: "LineChart", props: { ...priceChart, drawTo: "1982-01-06", drawFor: 5, annotations: markers } },
  "08.17": { t: "DocCard", props: { kind: "register", header: "MARCH 1982", rows: [{ label: "Company", value: "Sumitomo Metal Mining" }, { label: "Announced", value: "It will develop the neighbouring claim" }, { label: "That claim", value: "Acquired from Korekawa" }], tag: "BIOGRAPHY", source: "As reported by his biographer" } },
  "08.18": { t: "LineChart", props: { ...priceChart, holdFrom: "1982-01-06", drawTo: "1982-04-20", drawFor: 3, annotations: [...markers, { kind: "marker", date: "1982-04-20", label: "APRIL 1982 · ¥1,230", tone: "gain" }] } },
  "08.20": { t: "NumberCard", props: { lines: [{ count: { to: 20e9, prefix: "¥" }, size: 140, tone: "gain" }, { text: "≈ $80 MILLION AT THE TIME", size: 56, at: 2.2 }], caption: "REPORTED GAIN" } },
  "09.01": rank,
  "09.05": { t: "NumberCard", props: { lines: [{ text: "STUDIED EVERY DAY FOR ~30 YEARS", size: 70 }, { text: "STOPPED LOSING MONEY AT ~80", size: 70, tone: "ochre", at: 2.2 }], caption: "OKU HISAO, JAPAN INDIVIDUAL INVESTORS ASSOCIATION, VIA NEWS POST SEVEN (2013)" } },
  "10.01": black,
  "10.04": { t: "NumberCard", props: { lines: [{ text: "HEAVY LOSSES", size: 140, tone: "loss" }], caption: "A PHARMACEUTICAL STOCK · PER HIS BIOGRAPHER" } },
  "10.06": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 680e6, prefix: "−¥" }, size: 140, tone: "loss" }, { text: "INCOME TAX OWED", size: 56, tone: "muted", at: 2.0 }], caption: "AS REPORTED, JULY 1991" } },
  "10.07": { t: "DocCard", props: { kind: "register", header: "JULY 1991", rows: [{ label: "Owed", value: "¥680,000,000 income tax" }, { label: "Seized", value: "Royalties from his autobiography" }], source: "Nikkei, 22 July 1991, as cited by his biographers" } },
  "10.08": { t: "QuoteCard", props: { quote: "Not a single sen of my stock profits remains.", attribution: "Ginzō Korekawa, autobiography, 1991 (translated)" } },
  "12.05": { t: "NumberCard", props: { align: "left", stagger: 0.25, lines: [
    { text: "SOURCES", size: 48, tone: "ochre" },
    ...["Korekawa Scholarship Foundation, biography and timeline", "20th Century Japanese Biographical Dictionary · Nihon Jinmei Daijiten (via Kotobank)", "NEWS Post Seven / Weekly Post, July 2013", "Kinoshita Atsushi, Saigo no Sōbashi Korekawa Ginzō (2011) · Korekawa, Jiden: Haran o Ikiru (1991)", "Geological Survey of Japan on the Hishikari deposit", "Archive photos: Wikimedia Commons, public domain", "Other images: FLUX.1-schnell · Voice: Kokoro · Music: original"].map((t) => ({ text: t, size: 32, tone: "paper" as const })),
  ] } },
};

export const SCOREBOARD: ScoreEntry[] = [
  { t: startOf("02.01"), year: "1983 · AGE 85", value: "No. 1 TAXPAYER", label: "JAPAN'S TOP TAXPAYER LIST" },
  { t: startOf("03.02"), year: "1911 · AGE 14", value: "¥0", label: "HIS MONEY" },
  { t: startOf("03.06"), year: "1915 · AGE 18", value: "ARMY SUPPLIER", label: "QINGDAO" },
  { t: startOf("03.11"), year: "1916 · AGE 19", value: "A FORTUNE", label: "MADE IN CHINA" },
  { t: startOf("03.12"), year: "1916 · AGE 19", value: "¥0", label: "AFTER THE CRASH" },
  { t: startOf("04.01"), year: "1919 · AGE 22", value: "A FACTORY", label: "HIS BUSINESS, OSAKA" },
  { t: startOf("04.07"), year: "1927 · AGE 30", value: "¥0", label: "AFTER HIS BANK FAILED" },
  { t: startOf("05.01"), year: "1931 · AGE 34", value: "¥70", label: "HIS STAKE" },
  { t: startOf("05.04"), year: "1931 · AGE 34", value: "¥7,000", label: "BY THE YEAR'S END", tone: "gain" },
  { t: startOf("06.02"), year: "1938 · AGE 41", value: "KOREKAWA MINING", label: "HIS BUSINESS, KOREA" },
  { t: startOf("06.04"), year: "1945 · AGE 48", value: "¥0", label: "EVERYTHING CONFISCATED", tone: "loss" },
  { t: startOf("07.04"), year: "1976 · AGE 79", value: "¥300,000,000", label: "INTO NIHON CEMENT" },
  { t: startOf("07.07"), year: "1977 · AGE 80", value: "+¥3,000,000,000", label: "GAIN", tone: "gain" },
  { t: startOf("08.01"), year: "1981 · AGE 84", value: "THE MORNING PAPER", label: "18 SEPTEMBER" },
  { t: startOf("08.21"), year: "1982 · AGE 84", value: "+¥20,000,000,000", label: "REPORTED GAIN", tone: "gain" },
  { t: startOf("09.02"), year: "1983 · AGE 85", value: "No. 1 TAXPAYER", label: "IN ALL OF JAPAN" },
  { t: startOf("10.02"), year: "1985 · AGE 88", value: "STILL TRADING", label: "THE TURTLE" },
  { t: startOf("10.05"), year: "1991 · AGE 93", value: "−¥680,000,000", label: "INCOME TAX OWED", tone: "loss" },
  { t: startOf("12.01"), year: "1992 · AGE 95", value: "ONE SMALL FLAT", label: "HIS ESTATE" },
  { t: startOf("12.05"), hidden: true },
];

const TAGS = new Set(["RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY"]);
export const OVERLAYS: Record<string, ShotSpec> = Object.fromEntries(
  SHOTS.filter((s) => s.family === "SCENE" && (s.onScreen || s.tag)).map((s) => [
    s.id, { t: "SceneOverlay", props: { tag: s.tag || undefined, caption: s.onScreen && !TAGS.has(s.onScreen) ? s.onScreen : undefined } },
  ]),
);

// ---- real archive photos (public domain, via Wikimedia Commons) replacing generated scenes
// Sources and licences: ../korekawa/archive_credits.json
export const ARCHIVE: Record<string, { image: string; credit: string }> = {
  "03.06": { image: "archive_tsingtao_1914", credit: "Japanese troops enter Tsingtao, 1914 · Public domain" },
  "04.03": { image: "archive_tokyo_1923", credit: "Tokyo after the earthquake, 1923 · Agence Rol · Public domain" },
  "04.05": { image: "archive_bankrun_1927", credit: "Bank run, Tokyo Nakano Bank, 1927 · Asahi Shimbun · Public domain" },
};
