import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence multi-lockfile warning: parent dir contains a stray package-lock.json
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Mount editor at /editor to match Wrangler path-based routing.
  // Wrangler routes compile.ladestack.in/editor/* → this Worker,
  // and Next's basePath makes "/" inside the app correspond to "/editor" externally.
  basePath: "/editor",
  images: {
    unoptimized: true,
  },
  // Do NOT set edge runtime globally — use Node.js compatibility layer via OpenNext.
  // Individual routes default to Node.js runtime which OpenNext translates for Workers.
};

export default nextConfig;
