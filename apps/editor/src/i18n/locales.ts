/**
 * Shared locale definitions for apps/editor.
 * MUST stay identical to apps/web/src/i18n/locales.ts
 */

export const SUPPORTED_LOCALES = [
  "en",
  "zh",
  "pt-br",
  "ru",
  "ja",
  "tr",
  "ko",
] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE
) as Exclude<Locale, "en">[];

export const LOCALE_TO_BCP47: Record<Locale, string> = {
  en: "en",
  zh: "zh",
  "pt-br": "pt-BR",
  ru: "ru",
  ja: "ja",
  tr: "tr",
  ko: "ko",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  "pt-br": "Português (Brasil)",
  ru: "Русский",
  ja: "日本語",
  tr: "Türkçe",
  ko: "한국어",
};

const LOCALE_SET = new Set<string>(SUPPORTED_LOCALES);

export function isLocale(value: string | undefined | null): value is Locale {
  if (!value) return false;
  return LOCALE_SET.has(value.toLowerCase());
}

export function normalizeLocale(value: string): Locale {
  const lower = value.toLowerCase();
  if (isLocale(lower)) return lower;
  return DEFAULT_LOCALE;
}

export function toBcp47(locale: Locale): string {
  return LOCALE_TO_BCP47[locale];
}

export function localePath(locale: Locale, pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return `/${locale}${clean}`;
}

export function parseLocale(rawPathname: string): {
  locale: Locale;
  pathnameWithoutLocale: string;
  hadPrefix: boolean;
} {
  const pathname = rawPathname.startsWith("/") ? rawPathname : `/${rawPathname}`;
  const firstSeg = pathname.slice(1).split("/")[0]?.toLowerCase();
  if (firstSeg && LOCALE_SET.has(firstSeg)) {
    const locale = firstSeg as Locale;
    const rest = pathname.slice(1 + firstSeg.length) || "/";
    const pathnameWithoutLocale = rest.startsWith("/") ? rest : `/${rest}`;
    return {
      locale,
      pathnameWithoutLocale: pathnameWithoutLocale === "" ? "/" : pathnameWithoutLocale,
      hadPrefix: true,
    };
  }
  return { locale: DEFAULT_LOCALE, pathnameWithoutLocale: pathname, hadPrefix: false };
}
