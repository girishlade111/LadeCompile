import EditorShell from "@/components/editor/EditorShell";
import { normalizeLocale } from "@/i18n/locales";
import enMessages from "../../../../messages/en.json";
import zhMessages from "../../../../messages/zh.json";
import ptBrMessages from "../../../../messages/pt-br.json";
import ruMessages from "../../../../messages/ru.json";
import jaMessages from "../../../../messages/ja.json";
import trMessages from "../../../../messages/tr.json";
import koMessages from "../../../../messages/ko.json";

const MESSAGES_MAP: Record<string, Record<string, unknown>> = {
  en: enMessages as unknown as Record<string, unknown>,
  zh: zhMessages as unknown as Record<string, unknown>,
  "pt-br": ptBrMessages as unknown as Record<string, unknown>,
  ru: ruMessages as unknown as Record<string, unknown>,
  ja: jaMessages as unknown as Record<string, unknown>,
  tr: trMessages as unknown as Record<string, unknown>,
  ko: koMessages as unknown as Record<string, unknown>,
};

export default async function LocaleEditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw ?? "en");
  const messages = MESSAGES_MAP[locale] ?? MESSAGES_MAP.en;
  return <EditorShell initialLocale={locale} initialMessages={messages} />;
}
