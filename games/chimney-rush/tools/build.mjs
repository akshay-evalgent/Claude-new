#!/usr/bin/env node
// Builds one upload-ready folder and zip per platform from src/.
//   node tools/build.mjs            build everything
//   node tools/build.mjs crazygames build one target
// Output: dist/<target>/index.html and release/chimney-rush-<target>.zip
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const REL = path.join(ROOT, "release");

const ids = JSON.parse(fs.readFileSync(path.join(ROOT, "platform-ids.json"), "utf8"));
const version = /version:\s*"([^"]+)"/.exec(fs.readFileSync(path.join(SRC, "js/config.js"), "utf8"))[1];

// Forwards SDK events to the adapter, buffering any that arrive before it loads.
const EVENT_BRIDGE = `<script>
window.__crSdkEvents = [];
window.__crSdkEvent = function (e) {
  var P = window.CR && window.CR.Platform;
  if (P && P._onEvent) P._onEvent(e); else window.__crSdkEvents.push(e);
};
</script>`;

const HEADS = {
  none: "",
  crazygames: `<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>`,
  poki: `<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>`,
  gamedistribution: (id) => `${EVENT_BRIDGE}
<script>
window["GD_OPTIONS"] = {
  "gameId": ${JSON.stringify(id)},
  "onEvent": function (event) { window.__crSdkEvent(event); }
};
(function (d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s);
  js.id = id;
  js.src = "https://html5.api.gamedistribution.com/main.min.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, "script", "gamedistribution-jssdk"));
</script>`,
  y8: (ids) => `<script>window.CR_Y8 = ${JSON.stringify({ appId: ids.y8AppId || "", gameId: ids.y8GameId || "" })};</script>
<script src="https://cdn.y8.com/minimal-sdk/2-0/y8.min.js" async></script>`,
  gamemonetize: (id) => `${EVENT_BRIDGE}
<script>
window.SDK_OPTIONS = {
  gameId: ${JSON.stringify(id)},
  onEvent: function (a) { window.__crSdkEvent(a); }
};
(function (a, b, c) {
  var d = a.getElementsByTagName(b)[0];
  a.getElementById(c) || (a = a.createElement(b), a.id = c, a.src = "https://api.gamemonetize.com/sdk.js", d.parentNode.insertBefore(a, d));
})(document, "script", "gamemonetize-sdk");
</script>`
};

const TARGETS = {
  web: { platform: "none", about: "your own website / playable demo (no ads)" },
  itch: { platform: "none", about: "itch.io HTML5 upload (no ads)" },
  "crazygames-basic": { platform: "crazygames", adsOff: true, about: "CrazyGames Basic Launch (SDK events, no ad buttons)" },
  crazygames: { platform: "crazygames", about: "CrazyGames Full Launch (SDK v3 with ads)" },
  poki: { platform: "poki", about: "Poki (SDK v2) - only after Poki accepts the game" },
  gamedistribution: { platform: "gamedistribution", about: "GameDistribution", needsId: "gamedistribution" },
  gamemonetize: { platform: "gamemonetize", about: "GameMonetize", needsId: "gamemonetize" },
  y8: { platform: "y8", about: "Y8 (minimal SDK 2.0)", needsId: "y8AppId", allIds: true }
};

function inlineScripts(html) {
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
  const blocks = files.map((f) => {
    const code = fs.readFileSync(path.join(SRC, f), "utf8");
    if (/<\/script/i.test(code)) throw new Error(`${f} contains "</script" and cannot be inlined`);
    return `<script>\n${code}\n</script>`;
  });
  return html.replace(/<!--SCRIPTS-->[\s\S]*?<!--\/SCRIPTS-->/, () => blocks.join("\n"));
}

function zipDir(dir, zipPath) {
  fs.rmSync(zipPath, { force: true });
  execFileSync("zip", ["-r", "-X", "-q", zipPath, "."], { cwd: dir });
}

function buildTarget(name) {
  const t = TARGETS[name];
  const template = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
  let head = `<script>window.CR_PLATFORM = ${JSON.stringify(t.platform)};${t.adsOff ? " window.CR_ADS = false;" : ""}</script>`;
  let warning = "";
  const sdk = HEADS[t.platform];
  if (typeof sdk === "function") {
    const id = ids[t.needsId] || "";
    if (!id) warning = `no ${t.needsId} ID in platform-ids.json yet: this zip is for testing only`;
    head += "\n" + (t.allIds ? sdk(ids) : sdk(id || "PASTE_GAME_ID_HERE"));
  } else if (sdk) {
    head += "\n" + sdk;
  }
  // The inline default (window.CR_PLATFORM || "none") must not override the build's value.
  let html = inlineScripts(template).replace("<!--PLATFORM_HEAD-->", () => head);
  html = html.replace("<title>Chimney Rush</title>", `<title>Chimney Rush</title>\n<meta name="generator" content="chimney-rush ${version} (${name})">`);
  const outDir = path.join(DIST, name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  const zipPath = path.join(REL, `chimney-rush-${name}.zip`);
  zipDir(outDir, zipPath);
  const kb = (fs.statSync(zipPath).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(17)} ${kb.padStart(6)} KB  ${t.about}${warning ? "\n  " + " ".repeat(17) + "  ! " + warning : ""}`);
}

function copyInto(src, dest) {
  fs.cpSync(src, dest, { recursive: true, filter: (p) => !p.includes("node_modules") });
}

// Source-code package sold as a reskinnable template.
function buildTemplate() {
  const name = "chimney-rush-template";
  const outDir = path.join(DIST, "template", name);
  fs.rmSync(path.join(DIST, "template"), { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  copyInto(SRC, path.join(outDir, "src"));
  fs.mkdirSync(path.join(outDir, "tools"));
  for (const f of ["build.mjs", "serve.mjs", "test.mjs", "assets.mjs"]) {
    const p = path.join(ROOT, "tools", f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(outDir, "tools", f));
  }
  fs.writeFileSync(path.join(outDir, "platform-ids.json"), JSON.stringify({ _comment: "Paste the IDs the portals give you, then run: node tools/build.mjs", gamedistribution: "", gamemonetize: "", y8AppId: "", y8GameId: "" }, null, 2) + "\n");
  fs.copyFileSync(path.join(ROOT, "docs", "TEMPLATE-README.md"), path.join(outDir, "README.md"));
  fs.copyFileSync(path.join(ROOT, "docs", "TEMPLATE-LICENSE.txt"), path.join(outDir, "LICENSE.txt"));
  fs.mkdirSync(path.join(outDir, "release"));
  fs.writeFileSync(path.join(outDir, "release", ".keep"), "");
  const zipPath = path.join(REL, `${name}-v${version}.zip`);
  zipDir(path.join(DIST, "template"), zipPath);
  console.log(`  ${"template".padEnd(17)} ${(fs.statSync(zipPath).size / 1024).toFixed(1).padStart(6)} KB  source-code package for itch.io / Gumroad`);
}

// Single-file playable demo for a claude.ai Artifact page (no ads, no SDK).
function buildArtifact() {
  const shell = fs.readFileSync(path.join(SRC, "artifact-shell.html"), "utf8");
  // <title> stays first in the file; the platform flag goes right after the styles.
  const html = inlineScripts(shell).replace("</style>", () => `</style>\n<script>window.CR_PLATFORM = "none";</script>`);
  const out = path.join(DIST, "artifact");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "chimney-rush.html"), html);
  console.log(`  ${"artifact".padEnd(17)} ${(Buffer.byteLength(html) / 1024).toFixed(1).padStart(6)} KB  single-file demo page (dist/artifact/chimney-rush.html)`);
}

fs.mkdirSync(REL, { recursive: true });
const only = process.argv[2];
console.log(`Chimney Rush ${version}`);
if (only && only !== "template") {
  if (!TARGETS[only]) { console.error(`Unknown target "${only}". Targets: ${Object.keys(TARGETS).join(", ")}, template`); process.exit(1); }
  buildTarget(only);
} else {
  if (!only) for (const name of Object.keys(TARGETS)) buildTarget(name);
  if (!only && fs.existsSync(path.join(SRC, "artifact-shell.html"))) buildArtifact();
  if (fs.existsSync(path.join(ROOT, "docs", "TEMPLATE-README.md"))) buildTemplate();
  else console.log("  (template package skipped: docs/TEMPLATE-README.md missing)");
}
