#!/usr/bin/env node
/**
 * i18n-check — validates that every locale catalog has the same leaf keys as en.
 * Usage: node scripts/i18n-check.mjs [--strict]
 * - Missing keys in Tier A (legal) → exit 1
 * - Missing keys in Tier B/C → warning (fallback covers), exit 0 unless --strict
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LOCALES = ["zh", "pt-br", "ru", "ja", "tr", "ko"];
const strict = process.argv.includes("--strict");

function leafKeys(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(k === "_meta")) {
      // For faq items, keys are indexed — treat as opaque
      if (k === "items") {
        // items is array of {id, question, answer} — count length
        out.push(`${p} (array len=${Array.isArray(v) ? v.length : "?"})`);
        continue;
      }
      out.push(...leafKeys(v, p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function checkCatalog(group, enPath, locale) {
  const locPath = enPath.replace(/en\.json$/, `${locale}.json`);
  if (!existsSync(locPath)) {
    return { missing: ["(file missing)"], extra: [], locale };
  }
  const enKeys = new Set(leafKeys(JSON.parse(readFileSync(enPath, "utf-8"))));
  const locKeys = new Set(leafKeys(JSON.parse(readFileSync(locPath, "utf-8"))));
  // remove meta keys from comparison
  for (const k of [...enKeys]) if (k.startsWith("_meta")) enKeys.delete(k);
  for (const k of [...locKeys]) if (k.startsWith("_meta")) locKeys.delete(k);
  const missing = [...enKeys].filter(k => !locKeys.has(k));
  const extra = [...locKeys].filter(k => !enKeys.has(k));
  return { missing, extra, locale };
}

let hasTierAFail = false;
const groups = [
  { name: "apps/web ui", path: join(ROOT, "apps/web/src/i18n/ui/en.json") },
  { name: "apps/web faq", path: join(ROOT, "apps/web/src/i18n/faq/en.json") },
  { name: "apps/editor messages", path: join(ROOT, "apps/editor/messages/en.json") },
];

for (const g of groups) {
  if (!existsSync(g.path)) { console.warn(`skip ${g.name}: missing ${g.path}`); continue; }
  console.log(`\n== ${g.name} ==`);
  const enCheck = JSON.parse(readFileSync(g.path, "utf-8"));
  const enLeafCount = leafKeys(enCheck).filter(k => !k.startsWith("_meta")).length;
  console.log(` en leaf keys: ${enLeafCount}`);
  for (const loc of LOCALES) {
    const { missing, extra } = checkCatalog(g.name, g.path, loc);
    const tag = missing.length ? (missing.includes("(file missing)") ? "MISSING FILE" : `MISSING ${missing.length}`) : "OK";
    console.log(`  ${loc}: ${tag}${extra.length ? ` (+${extra.length} extra)` : ""}`);
    if (missing.length) {
      if (g.name.includes("legal") || strict) hasTierAFail = true;
      if (missing.length < 10) console.log(`    missing: ${missing.join(", ")}`);
    }
  }
}

// Blog slug parity
console.log("\n== blog slug parity ==");
const blogEnDir = join(ROOT, "apps/web/src/content/blog/en");
if (existsSync(blogEnDir)) {
  const enSlugs = readdirSync(blogEnDir).filter(f => f.endsWith(".md")).map(f => f.replace(/\.md$/, ""));
  console.log(` en slugs (${enSlugs.length}): ${enSlugs.join(", ")}`);
  for (const loc of LOCALES) {
    const dir = join(ROOT, `apps/web/src/content/blog/${loc}`);
    if (!existsSync(dir)) { console.log(`  ${loc}: MISSING DIRECTORY`); continue; }
    const slugs = readdirSync(dir).filter(f => f.endsWith(".md")).map(f => f.replace(/\.md$/, ""));
    const missing = enSlugs.filter(s => !slugs.includes(s));
    console.log(`  ${loc}: ${slugs.length} files${missing.length ? ` — missing: ${missing.join(", ")}` : " (all present or intentionally empty)"}`);
  }
}

if (hasTierAFail) {
  console.error("\n✗ i18n-check failed (strict/Tier A missing)");
  process.exit(1);
} else {
  console.log("\n✓ i18n-check pass (warnings allowed for Tier B/C — fallback covers)");
}
