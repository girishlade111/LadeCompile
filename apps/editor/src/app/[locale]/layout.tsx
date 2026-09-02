import type { Metadata } from "next";

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

const OG_LOCALE: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  "pt-br": "pt_BR",
  ru: "ru_RU",
  ja: "ja_JP",
  tr: "tr_TR",
  ko: "ko_KR",
};

export async function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (raw as Locale) ?? "en";
  const bcp47 = LOCALE_TO_BCP47[locale] ?? "en";
  const site = "https://compile.ladestack.in";

  // Build canonical + alternates for editor: /editor (en) or /{locale}/editor
  const pathFor = (loc: string) => (loc === "en" ? "/editor" : `/${loc}/editor`);
  const canonical = `${site}${pathFor(locale)}`;

  const languages: Record<string, string> = {};
  for (const loc of SUPPORTED_LOCALES) {
    const key = LOCALE_TO_BCP47[loc] ?? loc;
    languages[key] = `${site}${pathFor(loc)}`;
  }
  // x-default per Google spec points to English
  languages["x-default"] = `${site}/editor`;

  return {
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      locale: OG_LOCALE[locale] ?? "en_US",
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l]).filter(Boolean) as string[],
    },
  };
}

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = (params.locale as Locale) ?? "en";
  const bcp47 = LOCALE_TO_BCP47[locale] ?? "en";
  // html lang is set in root layout via header, but we ensure data attribute for client JS
  return <div lang={bcp47} data-locale={locale}>{children}</div>;
}
