import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://compile.ladestack.in",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [],
  adapter: cloudflare({
    imageService: "compile",
    platformProxy: {
      enabled: true,
    },
    sessionKV: false,
  }),
  output: "server",
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:buffer"],
    },
  },
});
