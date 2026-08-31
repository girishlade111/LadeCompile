import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
    sessionKV: false,
  }),
  output: "static",
  vite: {
    ssr: {
      external: ["node:buffer"],
    },
  },
});
