import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

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
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          zh: "zh",
          "pt-br": "pt-BR",
          ru: "ru",
          ja: "ja",
          tr: "tr",
          ko: "ko",
        },
      },
    }),
  ],
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
