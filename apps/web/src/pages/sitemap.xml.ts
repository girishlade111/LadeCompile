import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { filterPublishedPosts, getPostSlug, getPostLocale } from "../utils/blog";

export const prerender = false;

const SITE = "https://compile.ladestack.in";

const SUPPORTED_LOCALES = ["en", "zh", "pt-br", "ru", "ja", "tr", "ko"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_TO_BCP47: Record<string, string> = {
  en: "en",
  zh: "zh",
  "pt-br": "pt-BR",
  ru: "ru",
  ja: "ja",
  tr: "tr",
  ko: "ko",
};

function localePath(locale: string, pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === "en") return clean;
  return `/${locale}${clean}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const GET: APIRoute = async () => {
  // Static routes that exist for every locale (7 × 3 = 21)
  const staticRoutes = ["/", "/faq/", "/blog/"];

  // Blog posts: only English content exists currently (zh/pt-br/etc folders empty)
  // So only emit blog post URLs for locales that actually have that content.
  // For now, only English blog posts are published.
  const allPosts = await getCollection("blog");
  const publishedPosts = allPosts.filter((p) => !p.data.draft);
  // Group by slug and check which locales have it
  // For now, since only en has content, we will only emit blog post URLs for en
  // Deduplicate: content/blog contains both src/content/blog/*.md and src/content/blog/en/*.md
  // (legacy duplicate) — collapse to unique slugs so sitemap has 4 entries, not 8.
  const blogSlugs = [...new Set(publishedPosts.filter((p) => getPostLocale(p) === "en").map((p) => `/blog/${getPostSlug(p)}/`))].sort();

  // Build all URLs: 7 locales × 3 static routes = 21, plus 4 English blog posts = 25 total
  // But per task: 21 (7×3 non-blog) + 4 English blog posts (not multiplied)
  const urls: { loc: string; alternates: { hreflang: string; href: string }[] }[] = [];

  for (const route of staticRoutes) {
    for (const locale of SUPPORTED_LOCALES) {
      const loc = `${SITE}${localePath(locale, route)}`;
      const alternates = SUPPORTED_LOCALES.map((loc2) => ({
        hreflang: LOCALE_TO_BCP47[loc2] ?? loc2,
        href: `${SITE}${localePath(loc2, route)}`,
      }));
      // Add x-default pointing to English
      alternates.push({ hreflang: "x-default", href: `${SITE}${localePath("en", route)}` });
      urls.push({ loc, alternates });
    }
  }

  // English-only blog posts
  for (const slugPath of blogSlugs) {
    const loc = `${SITE}${slugPath}`;
    const alternates = SUPPORTED_LOCALES.map((loc2) => {
      // For blog posts, only English has content, but we still emit hreflang for all locales
      // pointing to the English URL as fallback, or to locale-specific if it existed
      // For now, since only en has content, all alternates point to English URL for non-en locales
      // To be correct per hreflang spec, we should only point to URLs that actually exist.
      // So for blog posts, we will emit alternates only for locales that have that post.
      // Since only en has it, we emit only en + x-default for blog posts.
      // However to match the task's "4 English blog posts (not multiplied by 7)", we emit each blog post once with en + x-default.
      return null;
    });
    // For blog posts, emit only en + x-default (since only English content exists)
    const blogAlternates = [
      { hreflang: "en", href: loc },
      { hreflang: "x-default", href: loc },
    ];
    // Also add xhtml:link for completeness, but keep it simple: only en
    urls.push({ loc, alternates: blogAlternates });
  }

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
  for (const entry of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    for (const alt of entry.alternates) {
      xml += `    <xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}" />\n`;
    }
    xml += `  </url>\n`;
  }
  xml += `</urlset>\n`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
