#!/usr/bin/env node
/**
 * Free text/image -> textured .glb, using public Hugging Face Spaces (ZeroGPU).
 * No paid API. An HF token is optional but gives you a much bigger daily GPU
 * quota: create one at https://huggingface.co/settings/tokens (read access).
 *
 *   node scripts/generate-model.mjs --prompt "a vintage brass pocket watch"
 *   node scripts/generate-model.mjs --image ref.png --out public/models/watch.glb
 *   node scripts/generate-model.mjs --prompt "..." --backend hunyuan
 *   HF_TOKEN=hf_xxx node scripts/generate-model.mjs --prompt "..."
 *
 * Pipeline
 *   1. prompt -> reference image   FLUX.1-schnell   (skipped with --image)
 *      The prompt is wrapped so the object is isolated, centred, studio-lit:
 *      image-to-3D models reconstruct far better from a clean product shot.
 *   2. image  -> textured mesh     TRELLIS (default) or Hunyuan3D-2.1
 *   3. clean-up                    gltf-transform: dedup, weld, prune
 *
 * Spaces change their APIs from time to time. If a call fails, run with
 * --inspect to print the Space's current endpoints.
 */
import { Client, handle_file } from "@gradio/client";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

process.on("unhandledRejection", (e) => {
  const msg = String(e?.message ?? e);
  if (/ZeroGPU quota/i.test(msg)) {
    console.error(`\nHugging Face ZeroGPU quota used up: ${msg}`);
    console.error("Fix: set HF_TOKEN (free account = more daily GPU time), wait for the reset, or try --backend hunyuan / trellis.");
  } else {
    console.error(e);
  }
  process.exit(1);
});
const args = parseArgs(process.argv.slice(2));
const token = process.env.HF_TOKEN || undefined;

const SPACES = {
  flux: "black-forest-labs/FLUX.1-schnell",
  hunyuan: "tencent/Hunyuan3D-2.1",
  trellis: "trellis-community/TRELLIS",
};

if (args.inspect) {
  for (const id of Object.values(SPACES)) await inspect(id);
  process.exit(0);
}

const backend = args.backend ?? "trellis";
const out = resolve(ROOT, args.out ?? "public/models/hero.glb");
const seed = Number(args.seed ?? 1234);
if (!args.prompt && !args.image) {
  console.error('Usage: generate-model.mjs --prompt "a red fire extinguisher" | --image ref.png [--backend hunyuan|trellis] [--out path.glb]');
  process.exit(1);
}

// 1. Reference image -------------------------------------------------------
let imageBlob;
if (args.image) {
  imageBlob = new Blob([await readFile(resolve(args.image))]);
} else {
  const prompt =
    `${args.prompt}, single object, centered, full object in frame, three-quarter view, ` +
    `studio product photo, soft even lighting, plain white background, highly detailed, sharp focus`;
  console.log(`[1/3] FLUX.1-schnell: "${args.prompt}"`);
  const flux = await Client.connect(SPACES.flux, { token });
  const r = await flux.predict("/infer", {
    prompt,
    seed,
    randomize_seed: false,
    width: 1024,
    height: 1024,
    num_inference_steps: 4,
  });
  const img = r.data[0];
  imageBlob = await (await fetch(img.url, auth())).blob();
  const refPath = out.replace(/\.glb$/, ".ref.png");
  await mkdir(dirname(refPath), { recursive: true });
  await writeFile(refPath, Buffer.from(await imageBlob.arrayBuffer()));
  console.log(`      reference image -> ${rel(refPath)}`);
}

// 2. Image -> 3D -------------------------------------------------------------
let glbUrl;
if (backend === "hunyuan") {
  console.log("[2/3] Hunyuan3D-2.1: shape + PBR texture (2-5 min)...");
  const hy = await Client.connect(SPACES.hunyuan, { token });
  // Positional: the first input (an unused caption box) has no name in this Space.
  const r = await hy.predict("/generation_all", [
    null, // caption
    handle_file(imageBlob), // image
    null, null, null, null, // multi-view front/back/left/right
    30, // steps
    5, // guidance_scale
    seed,
    256, // octree_resolution
    true, // remove background
    8000, // num_chunks
    false, // randomize_seed
  ]);
  // Returns [white mesh, textured mesh, html preview, stats, seed]
  glbUrl = (r.data[1] ?? r.data[0]).url;
} else if (backend === "trellis") {
  console.log("[2/3] TRELLIS: structured latent -> GLB (1-3 min)...");
  const tr = await Client.connect(SPACES.trellis, { token });
  await tr.predict("/start_session", {});
  const pre = await tr.predict("/preprocess_image", { image: handle_file(imageBlob) });
  const r = await tr.predict("/generate_and_extract_glb", {
    image: pre.data[0],
    multiimages: [],
    seed,
    ss_guidance_strength: 7.5,
    ss_sampling_steps: 12,
    slat_guidance_strength: 3,
    slat_sampling_steps: 12,
    multiimage_algo: "stochastic",
    mesh_simplify: 0.95,
    texture_size: 1024,
  });
  // Returns [video preview, model viewer glb, download glb]
  glbUrl = (r.data[2] ?? r.data[1]).url;
} else {
  throw new Error(`Unknown backend "${backend}" (use trellis or hunyuan)`);
}

const raw = Buffer.from(await (await fetch(glbUrl, auth())).arrayBuffer());

// 3. Clean-up -----------------------------------------------------------------
console.log("[3/3] gltf-transform clean-up");
const { NodeIO } = await import("@gltf-transform/core");
const { ALL_EXTENSIONS } = await import("@gltf-transform/extensions");
const { dedup, prune, weld } = await import("@gltf-transform/functions");
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.readBinary(new Uint8Array(raw));
// Normals are left alone on purpose: AI meshes often have none, and HeroModel
// rebuilds them at load with crease-aware smoothing across UV seams.
await doc.transform(dedup(), weld(), prune());
await mkdir(dirname(out), { recursive: true });
await io.write(out, doc);
console.log(`\nSaved ${rel(out)} (${(raw.length / 1048576).toFixed(1)} MB raw).`);
console.log(`Use it: set LOOK.hero.url, or pass --props='{"modelUrl":"/${rel(out).replace(/^public\//, "")}"}'`);
process.exit(0);

// ---------------------------------------------------------------------------

function auth() {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
}

async function inspect(id) {
  const c = await Client.connect(id, { token });
  const api = await c.view_api();
  console.log(`\n=== ${id}`);
  for (const [name, ep] of Object.entries(api.named_endpoints)) {
    const params = ep.parameters.map((p) => `${p.parameter_name}${p.parameter_has_default ? "=" + JSON.stringify(p.parameter_default) : ""}`);
    console.log(`  ${name}(${params.join(", ")})`);
  }
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
