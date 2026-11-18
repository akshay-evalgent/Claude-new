// Juan Pablo Dávila: every graphics shot wired to a template.
// Facts and sources: ../davila/RESEARCH.md. Prices: World Bank Pink Sheet, LME copper, monthly average, US$/tonne.
import shotsJson from "./shots.json";
import copper from "../../data/copper_wb_monthly_usd_t.json";
import type { ShotSpec } from "../../registry";
import type { ScoreEntry } from "../../components/Scoreboard";
import type { Point } from "../../components/Charts";
import type { ShotInfo } from "../xu-xiang/film";

export const SHOTS = shotsJson as ShotInfo[];
const startOf = (id: string) => SHOTS.find((s) => s.id === id)!.start;
const CU = copper as unknown as Point[];
const cu = (from: string, to: string): Point[] => CU.filter(([d]) => d >= from && d <= to);
const SRC = "LME copper, monthly average, US$ per tonne · Data: World Bank";
const CGR = "Contraloría General de la República, preliminary audit, 18 February 1994";
const WSJ = "Codelco's claims, as reported by the Wall Street Journal, 1996";

export const GRAPHICS: Record<string, ShotSpec> = {
  "01.01": { t: "NumberCard", props: { lines: [{ text: "SANTIAGO", mode: "type", size: 64, at: 0.2 }, { text: "FRIDAY 21 JANUARY 1994", mode: "type", size: 104, at: 0.9 }] } },
  "01.04": { t: "NumberCard", props: { lines: [{ text: "SEPTEMBER 1993 · HIS ACCOUNT", size: 40, tone: "muted", at: 0.2 }, { text: "SELL", mode: "stamp", size: 170, at: 0.9 }, { text: "→ BUY", mode: "stamp", size: 170, tone: "loss", at: 4.2 }] } },
  "01.05": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 30e6, prefix: "−$" }, size: 150, tone: "loss" }] } },
  "01.07": { t: "TitleCard", props: { title: "THE WRONG KEY" } },
  "02.02": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 10, suffix: "%" }, size: 190, tone: "ochre" }, { text: "OF THE WORLD'S COPPER", size: 70, at: 1.0 }, { text: "ABOUT A FIFTH OF CHILE'S EXPORT EARNINGS", size: 40, tone: "muted", at: 3.2 }] } },
  "03.01": { t: "StepFlow", props: { title: "HEDGING", sub: "What Codelco's futures desk was for", animateAll: true, steps: [{ label: "Mine the copper" }, { label: "Sell it ahead at today's price" }, { label: "Price crashes", sub: "already sold, no harm done" }] } },
  "03.03": { t: "DocCard", props: { kind: "register", header: "FUTURES COMMITTEE · 13 AUGUST 1992", rows: [{ label: "Open copper position", value: "Up to 20,000 tonnes" }, { label: "Money at risk", value: "Up to US$1,000,000 a day" }, { label: "Stop-loss orders", value: "Automatic, on every trade" }], source: CGR } },
  "04.02": { t: "StepFlow", props: { title: "THE ONLY RECORD", animateAll: true, steps: [{ label: "He trades by phone" }, { label: "Broker confirms by fax" }, { label: "He types it into his spreadsheet" }, { label: "Codelco's accounts" }] } },
  "05.01": { t: "LineChart", props: { series: [{ id: "cu", points: cu("1992-07-01", "1993-09-30"), tone: "paper" }], from: "1992-07-01", to: "1993-09-30", yMin: 1500, yMax: 2700, yTicks: [1800, 2100, 2400],
    title: "COPPER, 1992–1993", subtitle: SRC, drawFor: 3.5, annotations: [{ kind: "marker", date: "1993-09-15", label: "SEPTEMBER 1993 · ~$1,860", tone: "ochre" }] } },
  "05.04": { t: "NumberCard", props: { lines: [{ text: "HE DIDN'T MAKE THE CALL.", size: 110, tone: "ochre" }] } },
  "06.01": { t: "StepFlow", props: { title: "A SHORT POSITION", animateAll: true, steps: [{ label: "Sell copper now" }, { label: "Buy it back later" }, { label: "Price falls", sub: "profit" }, { label: "Price rises", sub: "loss" }] } },
  "06.05": { t: "LineChart", props: { series: [{ id: "cu", points: cu("1993-06-01", "1994-01-31"), tone: "loss" }], from: "1993-06-01", to: "1994-01-31", yMin: 1500, yMax: 2000, yTicks: [1600, 1700, 1800, 1900],
    title: "COPPER, 1993", subtitle: SRC, drawFor: 5, annotations: [{ kind: "marker", date: "1993-11-15", label: "NOVEMBER · ~$1,630", tone: "ochre" }, { kind: "marker", date: "1994-01-15", label: "JANUARY · ~$1,805", tone: "loss" }] } },
  "07.03": { t: "NumberCard", props: { lines: [{ text: "HE DIDN'T.", size: 90, at: 0.1 }, { text: "NOBODY CHECKED.", mode: "stamp", size: 120, tone: "loss", at: 1.0 }] } },
  "07.05": { t: "QuoteCard", props: { quote: "I had the impression something was not right.", attribution: "Wolfgang Becker, Merrill Lynch, to the Wall Street Journal" } },
  "08.05": { t: "StepFlow", props: { title: "THE FIRST WEEK", sub: "From Codelco's report to its board, 4 February 1994", animateAll: true, steps: [{ label: "Fri 21 Jan", sub: "the confession" }, { label: "Mon 24 Jan", sub: "criminal complaint" }, { label: "Tue 25 Jan", sub: "board told, Price Waterhouse in" }, { label: "Wed 26 Jan", sub: "press conference" }] } },
  "08.06": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 206e6, prefix: "−$" }, size: 150, tone: "loss" }], caption: "CODELCO'S LOSS AT 3 FEBRUARY 1994 PRICES · COPPER, GOLD AND SILVER" } },
  "08.07": { t: "NumberCard", props: { lines: [{ count: { from: 0, to: 44, suffix: "%" }, size: 190, tone: "loss" }, { text: "OF CODELCO'S PROFIT FOR 1993", size: 70, at: 1.0 }] } },
  "09.03": { t: "QuoteCard", props: { quote: "He would have to be a genius.", attribution: "Fernando Molina, Codelco director, February 1994" } },
  "09.05": { t: "NumberCard", props: { align: "left", lines: [{ text: "davilar", size: 170, tone: "ochre", at: 0.3 }, { text: "VERB · CHILE · INFORMAL", size: 40, tone: "muted", at: 1.2 }, { text: "To botch things up miserably.", size: 76, at: 2.4 }], caption: "AS TRANSLATED BY THE WALL STREET JOURNAL, 16 MARCH 1994" } },
  "10.02": { t: "NumberCard", props: { lines: [{ text: "DEPOSITS IN HIS ACCOUNTS, 1990–1993", size: 44, tone: "muted" }, { count: { from: 0, to: 3.2e6, prefix: "$", decimals: 0 }, size: 150, tone: "ochre", at: 0.8 }, { text: "MOSTLY CASH", size: 64, at: 2.6 }], caption: "CODELCO'S CLAIM · NOT A COURT FINDING" } },
  "10.03": { t: "CompareBars", props: { title: "CODELCO'S TRADING WITH SOGEMIN METALS", bars: [
    { label: "1990", value: 192000, suffix: " t" },
    { label: "1991–92, A YEAR", value: 250000, suffix: " t" },
    { label: "1993", value: 2300000, suffix: " t", tone: "loss" },
  ], fit: 2400000, source: WSJ } },
  "10.04": { t: "MapCard", props: { land: "americas", view: { center: [-76, -6], scale: 700 },
    pins: [{ name: "Santiago", at: [-70.67, -33.45], t: 0.3, side: "right" }, { name: "Cayman Islands", at: [-81.25, 19.3], t: 1.6, tone: "ochre", side: "right" }],
    routes: [{ path: [[-70.67, -33.45], [-76.2, -7], [-81.25, 19.3]], t: 2.2, dur: 2.5, dashed: true, tone: "ochre", label: "$1.5M · CODELCO'S CLAIM" }], note: "Schematic" } },
  "10.07": { t: "QuoteCard", props: { quote: "It was a story so hard for me to swallow that it made me suspect at once that something was going on.", attribution: "Judge José Benquis, to Cooperativa, October 2006 (translated)" } },
  "11.02": { t: "StepFlow", props: { title: "TWELVE YEARS IN COURT", animateAll: true, steps: [{ label: "1999", sub: "8 years" }, { label: "2003 · appeal", sub: "7 years 7 months" }, { label: "2006 · Supreme Court", sub: "3 years + 2 × 800 days" }] } },
  "11.05": { t: "NumberCard", props: { lines: [{ text: "$206M LOST", size: 120, tone: "loss" }, { text: "~$100M RECOVERED", size: 120, tone: "ochre", at: 1.4 }], caption: "THROUGH LAWSUITS AND SETTLEMENTS WITH BROKERS, 1994–2006" } },
  "12.01": { t: "LineChart", props: { series: [{ id: "cu", points: cu("1992-07-01", "1994-12-31"), tone: "paper" }], from: "1992-07-01", to: "1994-12-31", yMin: 1400, yMax: 3200, yTicks: [1600, 2000, 2400, 2800],
    title: "COPPER, 1992–1994", subtitle: SRC, drawFor: 6,
    annotations: [{ kind: "marker", date: "1993-09-15", label: "SEP 1993 · THE ERROR" }, { kind: "marker", date: "1994-01-15", label: "JAN 1994 · CONFESSION", tone: "loss" }, { kind: "marker", date: "1994-12-15", label: "DEC 1994 · ~$3,000", tone: "ochre" }] } },
  "12.04": { t: "NumberCard", props: { lines: [{ text: "BUY", mode: "stamp", size: 220, tone: "loss", at: 0.4 }] } },
  "12.05": { t: "NumberCard", props: { align: "left", stagger: 0.25, lines: [
    { text: "SOURCES", size: 48, tone: "ochre" },
    ...["Contraloría General de la República, preliminary audit to President Aylwin, 18 February 1994", "St. Petersburg Times, 13 February 1994 · Wall Street Journal, 16 March 1994 (via RISKS Digest)", "Wall Street Journal reports via El Tiempo, February and April 1996", "Cooperativa, El Mercurio Online and Minería Chilena, 2003–2007 (the verdicts)", "Copper prices: World Bank Pink Sheet", "Images: FLUX.1-schnell · Voice: Kokoro · Music: original"].map((t) => ({ text: t, size: 30, tone: "paper" as const })),
  ] } },
};

export const SCOREBOARD: ScoreEntry[] = [
  { t: startOf("02.05"), year: "1986", value: "$8,680", label: "STARTING SALARY, A YEAR" },
  { t: startOf("05.02"), year: "SEP 1993", value: "−$30,000,000", label: "THE ERROR, BY HIS ACCOUNT", tone: "loss" },
  { t: startOf("06.02"), year: "NOV 1993", value: "$1,630", label: "COPPER PER TONNE" },
  { t: startOf("07.01"), year: "JAN 1994", value: "$1,805", label: "COPPER PER TONNE", tone: "loss" },
  { t: startOf("08.01"), year: "21 JAN 1994", value: "~$100M", label: "HIS OWN ESTIMATE", tone: "loss" },
  { t: startOf("09.01"), year: "FEB 1994", value: "−$206,000,000", label: "CODELCO'S LOSS", tone: "loss" },
  { t: startOf("11.01"), year: "2006", value: "CONVICTED", label: "FRAUD AGAINST THE STATE" },
  { t: startOf("12.02"), year: "DEC 1994", value: "$3,000", label: "COPPER PER TONNE", tone: "ochre" },
  { t: startOf("12.05"), hidden: true },
];

const TAGS = new Set(["RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY", "REPORTED"]);
export const OVERLAYS: Record<string, ShotSpec> = Object.fromEntries(
  SHOTS.filter((s) => s.family === "SCENE" && (s.onScreen || s.tag)).map((s) => [
    s.id, { t: "SceneOverlay", props: { tag: s.tag || undefined, caption: s.onScreen && !TAGS.has(s.onScreen) ? s.onScreen : undefined } },
  ]),
);
