import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://compile.ladestack.in",
  integrations: [sitemap()],
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
    sessionKV: false,
  }),
  output: "static",
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:buffer"],
    },
  },
});
