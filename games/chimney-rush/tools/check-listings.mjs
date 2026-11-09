#!/usr/bin/env node
// Checks listing text against platform limits and that every referenced file exists.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const md = fs.readFileSync(path.join(ROOT, "listings", "LISTINGS.md"), "utf8");

function block(after) {
  const i = md.indexOf(after);
  if (i < 0) throw new Error(`section "${after}" not found`);
  const m = /```\n([\s\S]*?)\n```/.exec(md.slice(i));
  return m[1];
}

let ok = true;
function check(name, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
  if (!cond) ok = false;
}

const desc = block("**Description**");
const instr = block("**Instructions / controls**");
const tag = block("**Tagline / short description**");
check("description 200-500 chars (GameDistribution)", desc.length >= 200 && desc.length <= 500, `${desc.length}`);
check("instructions 200-500 chars (GameDistribution)", instr.length >= 200 && instr.length <= 500, `${instr.length}`);
check("tagline under 100 chars (itch.io short description)", tag.length <= 100, `${tag.length}`);
check("description length stated correctly", md.includes(`shared description (${desc.length} characters)`));
check("instructions length stated correctly", md.includes(`shared instructions (${instr.length} characters)`));
check("tagline length stated correctly", md.includes(`(${tag.length} characters)`));

const files = new Set([...md.matchAll(/`((?:release|listings)\/[^`]+?\.(?:zip|png|mp4))`/g)].map((m) => m[1]));
for (const m of md.matchAll(/`([a-z0-9-]+(?:-\d+x\d+)?(?:-notext)?\.png)`/g)) files.add(`listings/images/${m[1]}`);
for (const f of files) check(`file exists: ${f}`, fs.existsSync(path.join(ROOT, f)));
process.exit(ok ? 0 : 1);
