import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence multi-lockfile warning: parent dir contains a stray package-lock.json
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // i18n locale routing is handled via app/[locale]/editor segment (Fix B).
  // Previously basePath "/editor" was used to mount "/" → "/editor" externally,
  // but with locale-prefixed routes /{locale}/editor the file-system route
  // app/[locale]/editor already maps to /{locale}/editor, and app/editor
  // maps to /editor (English). basePath is no longer needed — locale handling
  // is via middleware + [locale] segment. Kept commented for reference.
  // basePath: "/editor",
  assetPrefix: "/editor",
  images: {
    unoptimized: true,
  },
  // Do NOT set edge runtime globally — use Node.js compatibility layer via OpenNext.
  // Individual routes default to Node.js runtime which OpenNext translates for Workers.
  // middleware.ts is edge-compatible (no node:fs).
};

export default nextConfig;
