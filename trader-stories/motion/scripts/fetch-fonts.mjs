// Downloads the house fonts as subsets containing every character the project
// uses, so renders never depend on the network or on system fonts.
// Run after adding text with new characters: npm run fonts
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FAMILIES = [
  { family: "Oswald", key: "oswald", weights: [500, 700], italic: false },
  { family: "IBM Plex Mono", key: "plexmono", weights: [400, 600], italic: false },
  { family: "IBM Plex Sans", key: "plexsans", weights: [400, 600], italic: false },
  { family: "Source Serif 4", key: "serif", weights: [400, 600], italic: true },
  { family: "Noto Serif SC", key: "cjk", weights: [700], italic: false, cjk: true },
  { family: "Montserrat", key: "montserrat", weights: [700, 800, 900], italic: false },
  { family: "Fredoka", key: "fredoka", weights: [500, 600, 700], italic: false },
  { family: "Patrick Hand", key: "hand", weights: [400], italic: false },
];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
const text = walk(path.join(root, "src"))
  .filter((f) => /\.(tsx?|json)$/.test(f) && !f.endsWith("shc.json") && !f.endsWith("land.json"))
  .map((f) => fs.readFileSync(f, "utf8")).join("");
const used = new Set([...text]);
const isCjk = (c) => /[　-〿㐀-鿿＀-￯]/.test(c);
let base = "";
for (let i = 0x20; i < 0x7f; i++) base += String.fromCharCode(i);
for (let i = 0xa0; i < 0x180; i++) base += String.fromCharCode(i);
base += "–—‘’“”…·•×÷−→←↑↓≈≥≤½⅓¼¾‰€£¥№";
const latin = [...new Set([...base, ...[...used].filter((c) => !isCjk(c) && c.codePointAt(0) > 0x7f && c.codePointAt(0) < 0x3000)])].join("");
const cjk = [...used].filter(isCjk).join("") || "徐翔";

const faces = [];
for (const f of FAMILIES) {
  const axes = f.italic
    ? "ital,wght@" + [0, 1].flatMap((i) => f.weights.map((w) => `${i},${w}`)).join(";")
    : "wght@" + f.weights.join(";");
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family)}:${axes}&text=${encodeURIComponent(f.cjk ? cjk : latin)}&display=block`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const blocks = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => m[1]);
  if (!blocks.length) throw new Error("No fonts returned for " + f.family + "\n" + css.slice(0, 300));
  for (const b of blocks) {
    const style = /font-style:\s*(\w+)/.exec(b)[1];
    const weight = /font-weight:\s*(\d+)/.exec(b)[1];
    const src = /url\(([^)]+)\)/.exec(b)[1];
    const file = `${f.key}-${weight}${style === "italic" ? "i" : ""}.woff2`;
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    fs.writeFileSync(path.join(root, "public/fonts", file), buf);
    faces.push({ family: f.family, weight, style, file });
    console.log(file, Math.round(buf.length / 1024) + " KB");
  }
}
fs.writeFileSync(path.join(root, "src/fonts.json"), JSON.stringify(faces, null, 2));
console.log(`${faces.length} faces, ${cjk.length} CJK characters: ${cjk}`);
