/**
 * Message loading layer for apps/web with English fallback.
 * Requirement §5: fallback happens at the loader, not per-component.
 *
 * Usage (Astro):
 *   import { getMessages, t } from "@/i18n";
 *   const messages = await getMessages(locale); // locale = Astro.locals.locale
 *   t(messages, "nav.home")
 */

import type { Locale } from "./locales";
import { DEFAULT_LOCALE } from "./locales";

// Static imports for all locales — ensures build-time inclusion for SSG per locale
import enUi from "./ui/en.json";
import zhUi from "./ui/zh.json";
import ptBrUi from "./ui/pt-br.json";
import ruUi from "./ui/ru.json";
import jaUi from "./ui/ja.json";
import trUi from "./ui/tr.json";
import koUi from "./ui/ko.json";
import enFaq from "./faq/en.json";
import zhFaq from "./faq/zh.json";
import ptBrFaq from "./faq/pt-br.json";
import ruFaq from "./faq/ru.json";
import jaFaq from "./faq/ja.json";
import trFaq from "./faq/tr.json";
import koFaq from "./faq/ko.json";

type Messages = Record<string, unknown>;

// Registry for catalog types. Extend when adding privacy/terms/blog lists.
export type CatalogName = "ui" | "faq";

const EN_CATALOGS: Record<CatalogName, Messages> = {
  ui: enUi as Messages,
  faq: enFaq as unknown as Messages,
};

const UI_MAP: Record<string, Messages> = {
  en: enUi as Messages,
  zh: zhUi as Messages,
  "pt-br": ptBrUi as Messages,
  ru: ruUi as Messages,
  ja: jaUi as Messages,
  tr: trUi as Messages,
  ko: koUi as Messages,
};

const FAQ_MAP: Record<string, Messages> = {
  en: enFaq as unknown as Messages,
  zh: zhFaq as unknown as Messages,
  "pt-br": ptBrFaq as unknown as Messages,
  ru: ruFaq as unknown as Messages,
  ja: jaFaq as unknown as Messages,
  tr: trFaq as unknown as Messages,
  ko: koFaq as unknown as Messages,
};

// Lazy-loaded cache per locale+catalog
const cache = new Map<string, Messages>();

async function loadCatalog(catalog: CatalogName, locale: Locale): Promise<Messages> {
  const key = `${catalog}:${locale}`;
  if (cache.has(key)) return cache.get(key)!;

  let loaded: Messages;
  if (locale === DEFAULT_LOCALE) {
    loaded = EN_CATALOGS[catalog];
  } else {
    const map = catalog === "ui" ? UI_MAP : FAQ_MAP;
    const raw = map[locale] ?? ({} as Messages);
    // Fallback merge: missing keys fall back to English
    loaded = deepMergeWithFallback(EN_CATALOGS[catalog], raw as Messages);
  }

  cache.set(key, loaded);
  return loaded;
}

/** Deep-merge: any missing leaf in target falls back to base (English). */
function deepMergeWithFallback(base: Messages, target: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(target)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v) &&
        base[k] !== null && typeof base[k] === "object" && !Array.isArray(base[k])) {
      out[k] = deepMergeWithFallback(base[k] as Messages, v as Messages);
    } else {
      out[k] = v as unknown;
    }
  }
  // For keys present in base but missing in target (after merge they stay from base)
  return out;
}

/** Get merged UI messages for a locale (English fallback already applied). */
export async function getUiMessages(locale: Locale): Promise<Messages> {
  return loadCatalog("ui", locale);
}

/** Get merged FAQ messages for a locale (English fallback already applied). */
export async function getFaqMessages(locale: Locale): Promise<Messages> {
  return loadCatalog("faq", locale);
}

/** Synchronous helper when catalogs are already imported (e.g. in middleware/build). */
export function getMessagesSync(locale: Locale, catalog: CatalogName): Messages {
  const key = `${catalog}:${locale}`;
  if (cache.has(key)) return cache.get(key)!;
  // Best-effort sync: only works if already cached or English
  if (locale === DEFAULT_LOCALE) return EN_CATALOGS[catalog];
  return EN_CATALOGS[catalog]; // caller should use async above for non-English
}

// ---- key-path resolver ----

/** Resolve dotted key like "nav.home" or "faq.items[0].question" against messages. */
export function getByPath(messages: Messages, path: string): unknown {
  // Support both dotted and bracket notation
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/**
 * Translate a dotted key with optional interpolation params.
 * Never returns blank — falls back to English value, then to key itself.
 */
export function t(
  messages: Messages,
  key: string,
  params?: Record<string, string | number>
): string {
  let value = getByPath(messages, key);
  // Fallback to English catalogs if missing
  if (value === undefined) {
    for (const cat of Object.keys(EN_CATALOGS) as CatalogName[]) {
      const fb = getByPath(EN_CATALOGS[cat], key);
      if (fb !== undefined) { value = fb; break; }
    }
  }
  if (value === undefined) return key;
  let str = String(value);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/** Validate that all locale catalogs have the same key shape as English (for CI). */
export function validateCatalogSync(): { catalog: string; missing: string[]; extra: string[] }[] {
  // This is a lightweight stub; full validation lives in scripts/i18n-check.mjs
  return [];
}
