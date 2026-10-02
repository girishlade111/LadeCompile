// Static-export build config for GitHub Pages deployment.
// Derives from astro.config.mjs minus the Cloudflare adapter / server output.
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://girishlade111.github.io/LadeCompile/",
  base: "/LadeCompile/",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [],
  output: "static",
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:buffer"],
    },
  },
});
