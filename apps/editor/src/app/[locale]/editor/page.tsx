import EditorShell from "@/components/editor/EditorShell";
import { normalizeLocale } from "@/i18n/locales";

export default async function LocaleEditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw ?? "en");
  // Load messages server-side so initial HTML is already translated (no English flash)
  let messages: Record<string, unknown> | null = null;
  try {
    const mod = await import(`../../../../messages/${locale}.json`);
    messages = (mod.default ?? mod) as Record<string, unknown>;
  } catch {
    const enMod = await import("../../../../messages/en.json");
    messages = (enMod.default ?? enMod) as Record<string, unknown>;
  }
  return <EditorShell initialLocale={locale} initialMessages={messages} />;
}
