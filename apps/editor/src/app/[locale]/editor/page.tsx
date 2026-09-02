import EditorShell from "@/components/editor/EditorShell";

export default async function LocaleEditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EditorShell initialLocale={locale ?? "en"} />;
}
