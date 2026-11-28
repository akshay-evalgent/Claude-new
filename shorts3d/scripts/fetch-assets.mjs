#!/usr/bin/env node
/**
 * Free asset fetcher — no accounts, no API keys, everything CC0.
 *
 *   node scripts/fetch-assets.mjs                       # defaults below
 *   node scripts/fetch-assets.mjs --hdri studio_small_03 --hdri-res 2k
 *   node scripts/fetch-assets.mjs --only hdri --hdri piazza_bologni --hdri-out piazza
 *   node scripts/fetch-assets.mjs --model boombox --model-res 2k
 *   node scripts/fetch-assets.mjs --pbr Plaster001 --pbr-res 2K
 *   node scripts/fetch-assets.mjs --only hdri|model|pbr --force
 *
 * Sources
 *   HDRI   Poly Haven  https://polyhaven.com/hdris   -> public/hdri/studio.hdr  (or .exr with --exr)
 *   Model  Poly Haven  https://polyhaven.com/models  -> public/models/hero.glb  (glTF packed into one .glb)
 *   PBR    ambientCG   https://ambientcg.com         -> public/pbr/<id>/{color,normal,roughness,ao}.jpg
 */
import { mkdir, writeFile, rm, readdir, rename, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const UA = { "User-Agent": "shorts3d-asset-fetcher/0.1" };

const args = parseArgs(process.argv.slice(2));
const opts = {
  hdri: args.hdri ?? "studio_small_09",
  hdriRes: args["hdri-res"] ?? "2k",
  hdriOut: args["hdri-out"] ?? "studio",
  exr: Boolean(args.exr),
  model: args.model ?? "Camera_01",
  modelRes: args["model-res"] ?? "1k",
  modelOut: args["model-out"] ?? "hero.glb",
  pbr: args.pbr ?? "Plaster001",
  pbrRes: args["pbr-res"] ?? "1K",
  only: args.only,
  force: Boolean(args.force),
};

const want = (k) => !opts.only || opts.only === k;

if (want("hdri")) await fetchHdri();
if (want("model")) await fetchPolyHavenModel();
if (want("pbr")) await fetchAmbientCg();
console.log("\nDone. Assets are in public/. Run `npm run studio` to preview.");

// ---------------------------------------------------------------------------

async function fetchHdri() {
  const ext = opts.exr ? "exr" : "hdr";
  const out = join(PUBLIC, "hdri", `${opts.hdriOut}.${ext}`);
  if (skip(out)) return;
  const files = await json(`https://api.polyhaven.com/files/${opts.hdri}`);
  const entry = files?.hdri?.[opts.hdriRes]?.[ext];
  if (!entry) throw new Error(`No ${opts.hdriRes} .${ext} for HDRI "${opts.hdri}"`);
  console.log(`HDRI  ${opts.hdri} ${opts.hdriRes} .${ext} (${mb(entry.size)})`);
  await download(entry.url, out);
}

async function fetchPolyHavenModel() {
  const out = join(PUBLIC, "models", opts.modelOut);
  if (skip(out)) return;
  const files = await json(`https://api.polyhaven.com/files/${opts.model}`);
  const gltf = files?.gltf?.[opts.modelRes]?.gltf;
  if (!gltf) throw new Error(`No ${opts.modelRes} glTF for model "${opts.model}"`);
  console.log(`Model ${opts.model} ${opts.modelRes} (glTF -> GLB)`);

  const work = join(tmpdir(), `shorts3d-${opts.model}-${Date.now()}`);
  const gltfPath = join(work, `${opts.model}.gltf`);
  await download(gltf.url, gltfPath);
  for (const [rel, f] of Object.entries(gltf.include ?? {})) await download(f.url, join(work, rel));

  // Pack .gltf + .bin + textures into one self-contained .glb.
  const { NodeIO } = await import("@gltf-transform/core");
  const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
  const { dedup, prune } = await import("@gltf-transform/functions");
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(gltfPath);
  await doc.transform(dedup(), prune());
  await mkdir(dirname(out), { recursive: true });
  await io.write(out, doc);
  await rm(work, { recursive: true, force: true });
  console.log(`  -> ${rel(out)} (${mb((await stat(out)).size)})`);
}

async function fetchAmbientCg() {
  const dir = join(PUBLIC, "pbr", opts.pbr);
  if (skip(join(dir, "normal.jpg"))) return;
  const file = `${opts.pbr}_${opts.pbrRes}-JPG.zip`;
  console.log(`PBR   ambientCG ${file}`);
  const work = join(tmpdir(), `shorts3d-pbr-${Date.now()}`);
  const zip = join(work, file);
  await download(`https://ambientcg.com/get?file=${file}`, zip);
  execFileSync("unzip", ["-oq", zip, "-d", work]);
  await mkdir(dir, { recursive: true });
  // ambientCG naming: <id>_<res>-JPG_Color.jpg, _NormalGL.jpg, _Roughness.jpg, _AmbientOcclusion.jpg
  const map = { Color: "color", NormalGL: "normal", Roughness: "roughness", AmbientOcclusion: "ao" };
  for (const f of await readdir(work)) {
    const m = f.match(/_(Color|NormalGL|Roughness|AmbientOcclusion)\.jpg$/);
    if (m) await rename(join(work, f), join(dir, `${map[m[1]]}.jpg`));
  }
  await rm(work, { recursive: true, force: true });
  console.log(`  -> ${rel(dir)}/`);
}

// ---------------------------------------------------------------------------

function skip(path) {
  if (existsSync(path) && !opts.force) {
    console.log(`skip  ${rel(path)} exists (use --force to replace)`);
    return true;
  }
  return false;
}

async function json(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, out) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, Buffer.from(await r.arrayBuffer()));
}

function mb(b) {
  return `${(b / 1048576).toFixed(1)} MB`;
}

function rel(p) {
  return p.replace(ROOT + "/", "");
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) (o[k] = next), i++;
    else o[k] = true;
  }
  return o;
}

